import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

/** Who can reach the served app: this Mac, your own Tailscale devices, or anyone with the link (who must still sign in). */
export type Access = 'local' | 'tailnet' | 'public';

export const SERVE_PORT = 3101;
/** 443 is left for alpha-investor's demo. Funnel allows only 443, 8443 and 10000. */
export const TUNNEL_PORT = 8443;

const KEEP_BACKUPS = 7;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BACKUP_NAME = /^app-\d{8}T\d{6}Z\.db$/;

export function parseAccess(args: string[]): Access {
  const modes: Record<string, Access> = { '--tailnet': 'tailnet', '--public': 'public' };
  const unknown = args.filter((a) => !Object.hasOwn(modes, a));
  if (unknown.length || args.length > 1) throw new Error('Use no option (this Mac only), --tailnet, or --public.');
  return args.length ? modes[args[0]] : 'local';
}

/** Production settings for the server, from the development ones: no tester sign-in, and no tester on the allowlist. */
export function serveEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const tester = env.DEV_LOGIN_EMAIL?.trim().toLowerCase();
  const allowed = (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e && e.toLowerCase() !== tester);
  return {
    ...env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(SERVE_PORT),
    ALLOWED_EMAILS: allowed.join(','),
    // Set to empty rather than removed: the server reads .env too, and doesn't replace what is already set.
    DEV_LOGIN_EMAIL: '',
  };
}

/** Runs until stopped. In the foreground, Tailscale closes the tunnel when the command ends. */
export function tunnelArgs(access: Exclude<Access, 'local'>): string[] {
  return [access === 'public' ? 'funnel' : 'serve', '--yes', `--https=${TUNNEL_PORT}`, `http://127.0.0.1:${SERVE_PORT}`];
}

/** Closes our port only; `reset` would also close other apps' tunnels. */
export function tunnelOffArgs(access: Exclude<Access, 'local'>): string[] {
  return [access === 'public' ? 'funnel' : 'serve', `--https=${TUNNEL_PORT}`, 'off'];
}

export const backupRoot = (env: NodeJS.ProcessEnv): string =>
  path.resolve(env.BACKUP_DIR?.trim() || path.join(os.homedir(), 'medical-insurance-hunter-backups'));

/** Backs up the database unless a recent copy exists. Returns the new file, or null. Throws rather than keep a bad copy. */
export async function ensureBackup(dbFile: string, root: string, now = Date.now()): Promise<string | null> {
  if (!existsSync(dbFile)) return null; // first run, nothing to lose
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const complete = () => readdirSync(root).filter((f) => BACKUP_NAME.test(f)).sort();
  const latest = complete().at(-1);
  if (latest && now - statSync(path.join(root, latest)).mtimeMs < MAX_AGE_MS) return null;

  const stamp = new Date(now).toISOString().replace(/[-:]|\.\d+/g, '');
  const target = path.join(root, `app-${stamp}.db`);
  const partial = `${target}.tmp`;
  try {
    // SQLite's own backup: a plain copy of app.db would miss saves still in the write-ahead log.
    const source = new DatabaseSync(dbFile, { readOnly: true });
    try {
      await backup(source, partial);
    } finally {
      source.close();
    }
    const copy = new DatabaseSync(partial);
    try {
      // One plain file, with no log beside it, so it can be copied anywhere.
      copy.exec('PRAGMA journal_mode = DELETE');
      const check = copy.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (check.integrity_check !== 'ok') throw new Error(`The backup failed its check: ${check.integrity_check}`);
    } finally {
      copy.close();
    }
    renameSync(partial, target);
  } finally {
    for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(partial + suffix, { force: true });
  }
  for (const old of complete().slice(0, -KEEP_BACKUPS)) rmSync(path.join(root, old));
  return target;
}
