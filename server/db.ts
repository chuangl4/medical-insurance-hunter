import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decrypt, encrypt, hashToken } from './crypto';

export interface User {
  id: number;
  email: string;
  name: string;
}

const SESSION_DAYS = 30;

export class Store {
  private db: DatabaseSync;

  constructor(
    file: string,
    private profileKey: Buffer,
  ) {
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        google_sub TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sealed TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  upsertUser(googleSub: string, email: string, name: string): User {
    this.db
      .prepare(
        `INSERT INTO users (google_sub, email, name) VALUES (?, ?, ?)
         ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name`,
      )
      .run(googleSub, email, name);
    return this.db.prepare('SELECT id, email, name FROM users WHERE google_sub = ?').get(googleSub) as unknown as User;
  }

  createSession(userId: number, token: string, now = Date.now()): number {
    const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), userId, expiresAt);
    return expiresAt;
  }

  userForSession(token: string, now = Date.now()): User | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(hashToken(token), now);
    return (row as unknown as User | undefined) ?? null;
  }

  deleteSession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  /** Returns the saved profile JSON, or null if the user hasn't saved one. */
  getProfile(userId: number): unknown | null {
    const row = this.db.prepare('SELECT sealed FROM profiles WHERE user_id = ?').get(userId) as { sealed: string } | undefined;
    return row ? JSON.parse(decrypt(row.sealed, this.profileKey)) : null;
  }

  saveProfile(userId: number, profile: unknown): void {
    this.db
      .prepare(
        `INSERT INTO profiles (user_id, sealed) VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET sealed = excluded.sealed, updated_at = datetime('now')`,
      )
      .run(userId, encrypt(JSON.stringify(profile), this.profileKey));
  }

  /** Raw stored row, for tests that check nothing is saved in plain text. */
  rawProfile(userId: number): string | null {
    const row = this.db.prepare('SELECT sealed FROM profiles WHERE user_id = ?').get(userId) as { sealed: string } | undefined;
    return row?.sealed ?? null;
  }

  close(): void {
    this.db.close();
  }
}
