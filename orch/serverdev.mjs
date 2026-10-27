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

// ---- keeping test pages off the live servers ----
// Test pages must never reach Abdullah's live game servers (or any other outside host). The game is built with
// WW3_SERVER_URL pointing at production, and Playwright's ctx.route does not see WebSockets, so every harness that
// loads the page calls guardContext(ctx, serverUrl): the page is pointed at `serverUrl` (a local `wrangler dev` from
// startServer(), or DEAD_SERVER = "servers configured but down"), and any WebSocket to a host other than this machine
// fails at once, as if that server were unreachable.
export const DEAD_SERVER = 'http://127.0.0.1:9';
const isLocalUrl = u => { try { const h = new URL(String(u)).hostname; return h === '127.0.0.1' || h === 'localhost' || h === '[::1]'; } catch { return false; } };
// runs inside the page (addInitScript): must be self-contained
export function localOnlyShim(server) {
  if (window.__ww3LocalOnly) return; window.__ww3LocalOnly = true;
  if (server) window.WW3_SERVER = server;
  const W = window.WebSocket; if (!W) return;
  const local = u => { try { const h = new URL(String(u), location.href).hostname; return h === '127.0.0.1' || h === 'localhost' || h === '[::1]'; } catch (e) { return false; } };
  const blocked = window.__ww3BlockedWs = [];
  function LocalOnlyWebSocket(u, p) { if (!local(u)) { blocked.push(String(u)); u = 'ws://127.0.0.1:9/blocked'; } return p === undefined ? new W(u) : new W(u, p); }
  LocalOnlyWebSocket.prototype = W.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) LocalOnlyWebSocket[k] = W[k];
  window.WebSocket = LocalOnlyWebSocket;
}
export async function guardContext(ctx, server = DEAD_SERVER) {
  await ctx.addInitScript(localOnlyShim, server);
  // second line of defence: Playwright's own WebSocket routing (1.48+) closes anything non-local that slipped through
  if (typeof ctx.routeWebSocket === 'function') await ctx.routeWebSocket(u => !isLocalUrl(u), ws => ws.close({ code: 1008, reason: 'blocked by test harness' }));
}
