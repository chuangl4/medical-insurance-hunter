/**
 * Serves the production build from this Mac.
 *
 *   npm run serve                 this Mac only, at http://localhost:3101
 *   npm run serve -- --tailnet    also your own Tailscale devices
 *   npm run serve -- --public     also the internet, through Tailscale Funnel (sign-in is still limited to ALLOWED_EMAILS)
 *
 * Backs up the database if the last copy is over a day old, builds, starts the server, then opens the tunnel.
 * Ctrl-C stops all of it.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadConfig } from '../server/config';
import { backupRoot, ensureBackup, parseAccess, SERVE_PORT, serveEnv, TUNNEL_PORT, tunnelArgs, tunnelOffArgs, type Access } from '../server/launcher';

const REPO = path.resolve(import.meta.dirname, '..');
process.chdir(REPO);

const children: ChildProcess[] = [];
let tunnel: Exclude<Access, 'local'> | null = null;
let stopping = false;

const running = (child: ChildProcess) => child.exitCode === null && child.signalCode === null;

function start(command: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.on('error', (error) => void stop(1, `${command} could not start: ${error.message}`));
  child.on('exit', () => void stop(1, `${path.basename(command)} ${args[0] ?? ''} stopped, so everything is closing.`));
  children.push(child);
  return child;
}

async function stop(code: number, why: string) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${why}`);
  // The tunnel started last, so it closes first.
  for (const child of [...children].reverse()) if (running(child)) child.kill('SIGTERM');
  for (let i = 0; i < 50 && children.some(running); i++) await sleep(100);
  for (const child of children) if (running(child)) child.kill('SIGKILL');
  if (tunnel) spawnSync('tailscale', tunnelOffArgs(tunnel), { stdio: 'ignore' }); // in case it outlived its command
  process.exit(code);
}

const portTaken = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (taken: boolean) => (socket.destroy(), resolve(taken));
    socket.once('connect', () => done(true)).once('error', () => done(false));
  });

function tailscaleJson(...args: string[]) {
  const done = spawnSync('tailscale', [...args, '--json'], { encoding: 'utf8' });
  if (done.error || done.status !== 0) throw new Error(`tailscale ${args.join(' ')} failed: ${done.error?.message ?? done.stderr.trim()}`);
  return JSON.parse(done.stdout || '{}');
}

/** Returns this Mac's Tailscale name, after checking that our tunnel port is free. */
function checkTailscale(): string {
  const self = tailscaleJson('status').Self;
  if (!self?.Online) throw new Error('Tailscale is not connected. Run `tailscale up`.');
  if (JSON.stringify(tailscaleJson('serve', 'status')).includes(`:${TUNNEL_PORT}"`)) {
    throw new Error(`Tailscale port ${TUNNEL_PORT} is already in use. See \`tailscale serve status\`.`);
  }
  return self.DNSName.replace(/\.$/, '');
}

async function main() {
  const access = parseAccess(process.argv.slice(2));
  try {
    process.loadEnvFile();
  } catch {
    // No .env file; use the environment as is.
  }
  const env = serveEnv(process.env);
  const config = loadConfig(env);
  if (await portTaken(SERVE_PORT)) throw new Error(`Port ${SERVE_PORT} is in use. Is the app already being served?`);
  const host = access === 'local' ? null : checkTailscale();

  const root = backupRoot(env);
  const made = await ensureBackup(path.join(config.dataDir, 'app.db'), root);
  console.log(made ? `Backup: ${made}` : `Backup: nothing new needed in ${root}`);

  if (spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } }).status !== 0) throw new Error('The build failed.');
  if (stopping) return;

  start(process.execPath, ['--import', 'tsx', 'server/index.ts'], env);
  for (let i = 0; !(await portTaken(SERVE_PORT)); i++) {
    if (stopping) return;
    if (i > 120) throw new Error('The server did not start within a minute.');
    await sleep(500);
  }
  start('caffeinate', ['-ims'], process.env);
  if (access !== 'local') {
    tunnel = access;
    start('tailscale', tunnelArgs(access), process.env);
  }

  console.log(`\nOpen on this Mac at http://localhost:${SERVE_PORT}`);
  if (host) console.log(`${access === 'public' ? 'Public address' : 'Your Tailscale devices'}: https://${host}:${TUNNEL_PORT}`);
  console.log('Press Ctrl-C to stop.\n');
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, () => void stop(0, 'Closing.'));
main().catch((error) => stop(1, `Not served: ${error instanceof Error ? error.message : error}`));
