// Runs the World War 3 servers (server/, Cloudflare Worker + Durable Objects) locally with `wrangler dev`, for the
// server tests (servertest.mjs, mpsync.mjs --server). Needs `npm ci` inside server/ once (wrangler is a devDependency
// there; nothing is installed at the repo root).
//
//   import { startServer } from './serverdev.mjs';
//   const srv = await startServer();   // { url: 'http://127.0.0.1:PORT', stop() }
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SERVER_DIR = path.join(ROOT, 'server');

const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

export async function startServer({ quiet = true, vars = {} } = {}) {
  const bin = path.join(SERVER_DIR, 'node_modules', '.bin', 'wrangler');
  if (!fs.existsSync(bin)) throw new Error('wrangler is not installed: run `npm ci` in server/ first');
  const port = await freePort(), inspector = await freePort();
  const state = fs.mkdtempSync(path.join(os.tmpdir(), 'ww3-wrangler-'));
  const args = ['dev', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', String(inspector),
    '--persist-to', state, '--show-interactive-dev-session=false', '--log-level', quiet ? 'warn' : 'log'];
  for (const [k, v] of Object.entries(vars)) args.push('--var', `${k}:${v}`);
  const child = spawn(bin, args, { cwd: SERVER_DIR, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1', NO_COLOR: '1' } });
  let log = '';
  const keep = b => { log += b; if (log.length > 20000) log = log.slice(-20000); if (!quiet) process.stdout.write(b); };
  child.stdout.on('data', keep); child.stderr.on('data', keep);
  let exited = null; child.on('exit', c => { exited = c; });
  const url = `http://127.0.0.1:${port}`;
  const stop = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch {} try { fs.rmSync(state, { recursive: true, force: true }); } catch {} };
  process.on('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) if (!process.listenerCount(sig)) process.on(sig, () => process.exit(128));
  const t0 = Date.now();
  for (;;) {
    if (exited !== null) throw new Error('wrangler dev exited (' + exited + '):\n' + log.slice(-3000));
    try { const r = await fetch(url + '/health'); if (r.ok) break; } catch {}
    if (Date.now() - t0 > 90000) { stop(); throw new Error('wrangler dev did not answer /health within 90 s:\n' + log.slice(-3000)); }
    await new Promise(r => setTimeout(r, 300));
  }
  return { url, port, stop, log: () => log };
}
