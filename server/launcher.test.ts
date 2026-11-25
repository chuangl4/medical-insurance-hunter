import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config';
import { ensureBackup, parseAccess, serveEnv, tunnelArgs, tunnelOffArgs } from './launcher';

describe('serve options', () => {
  it('stays on this Mac unless asked', () => {
    expect(parseAccess([])).toBe('local');
    expect(parseAccess(['--tailnet'])).toBe('tailnet');
    expect(parseAccess(['--public'])).toBe('public');
    expect(() => parseAccess(['--pubic'])).toThrow();
    expect(() => parseAccess(['--tailnet', '--public'])).toThrow();
  });
  it('opens a public tunnel only for --public, and closes only its own port', () => {
    expect(tunnelArgs('tailnet')[0]).toBe('serve');
    expect(tunnelArgs('public')[0]).toBe('funnel');
    expect(tunnelOffArgs('public')).toEqual(['funnel', '--https=8443', 'off']);
  });
});

describe('serve settings', () => {
  const dev = {
    PROFILE_KEY: Buffer.alloc(32).toString('base64'),
    GOOGLE_CLIENT_ID: 'x',
    ALLOWED_EMAILS: 'a@example.com, Tester@localhost',
    DEV_LOGIN_EMAIL: 'tester@localhost',
    HOST: '0.0.0.0',
  };
  it('turns development settings into ones production accepts', () => {
    const config = loadConfig(serveEnv(dev));
    expect(config).toMatchObject({ production: true, host: '127.0.0.1', port: 3101, devLoginEmail: null, allowedEmails: ['a@example.com'] });
  });
  it('refuses to start with nobody but the tester allowed', () => {
    expect(() => loadConfig(serveEnv({ ...dev, ALLOWED_EMAILS: 'tester@localhost' }))).toThrow(/ALLOWED_EMAILS/);
  });
});

describe('backups', () => {
  let dir: string;
  let db: DatabaseSync;
  const file = () => path.join(dir, 'app.db');
  const root = () => path.join(dir, 'backups');
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'mih-backup-'));
    db = new DatabaseSync(file());
    db.exec('PRAGMA journal_mode = WAL; CREATE TABLE t (v TEXT);');
  });
  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true });
  });

  it('includes saves still in the write-ahead log', async () => {
    db.exec("INSERT INTO t VALUES ('recent')"); // the open connection keeps this in app.db-wal
    const made = await ensureBackup(file(), root());
    const copy = new DatabaseSync(made!, { readOnly: true });
    expect(copy.prepare('SELECT v FROM t').get()).toEqual({ v: 'recent' });
    copy.close();
    expect(readdirSync(root())).toEqual([path.basename(made!)]);
  });
  it('skips when a recent copy exists, and keeps the last seven', async () => {
    const start = Date.now() - 20 * DAY;
    for (let i = 0; i < 9; i++) {
      const made = await ensureBackup(file(), root(), start + i * 2 * DAY);
      expect(made).not.toBeNull();
      utimesSync(made!, (start + i * 2 * DAY) / 1000, (start + i * 2 * DAY) / 1000);
    }
    expect(readdirSync(root())).toHaveLength(7);
    expect(await ensureBackup(file(), root(), start + 8 * 2 * DAY + 1000)).toBeNull();
  });
  it('throws on a damaged database and leaves no partial copy', async () => {
    const bad = path.join(dir, 'bad.db');
    writeFileSync(bad, 'not a database, only text that is long enough to be read as one');
    await expect(ensureBackup(bad, root())).rejects.toThrow();
    expect(readdirSync(root())).toEqual([]);
  });
});
