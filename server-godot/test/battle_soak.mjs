// Battle soak: the REAL Godot Battle sim, played online by several builds at once, through one relay.
// Every client (web export in headless Chromium, and/or a desktop build) runs the scripted --demo player plus the
// AI seats and prints the whole-state hash once a game-second; this script compares them turn by turn.
// Equal hashes on every turn = the builds stay in sync (float results identical on Web and desktop).
//
//   node test/battle_soak.mjs --web 1 --native 1 --minutes 10                       # local relay, real time
//   node test/battle_soak.mjs --web 1 --native 1 --ai US,IL --map bm_fourmills      # 4 seats: 2 clients + 2 AI
//   node test/battle_soak.mjs --relay https://ww3-godot-relay-staging.<sub>.workers.dev --web 1 --native 1 --minutes 10
//   options: --turnms 20 --fast (local relay only: faster than real time)   --web-dir ../godot-build/web
//            --native-bin ../godot-build/linux/WorldWar3.x86_64  (default: $GODOT --path ../godot)
//            --report file.json   --digest (print which part of the state differs on a mismatch)
// Prints BATTLESOAK PASS / FAIL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = process.argv.slice(2);
const arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 && i + 1 < A.length ? A[i + 1] : d; };
const has = (k) => A.includes('--' + k);
const nWeb = +arg('web', 1), nNative = +arg('native', 1), minutes = +arg('minutes', 3);
const webDir = path.resolve(HERE, arg('web-dir', '../../godot-build/web'));
const nativeBin = arg('native-bin', '');
const NATIONS = ['IR', 'RS', 'US', 'IL'];
const log = (...a) => console.log(...a);

async function playwright() {
  try { return (await import('playwright')).default; } catch (e) {}
  const req = createRequire(import.meta.url);
  for (const p of [...(process.env.NODE_PATH || '').split(':'), '/opt/node-tools/node_modules']) {
    try { if (p) return req(path.join(p, 'playwright')); } catch (e) {}
  }
  throw new Error('playwright not found (npm i --no-save playwright && npx playwright install chromium)');
}

function serveWeb(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.pck': 'application/octet-stream' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const f = path.join(dir, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
    if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const clients = [];   // {name, kind, hashes: Map(turn -> hash), digests: Map, lines: [], done, errors: []}
function onLine(c, line) {
  let m = /^HASH (\d+) (-?\d+)/.exec(line);
  if (m) { c.hashes.set(+m[1], m[2]); c.last = Date.now(); return; }
  m = /^DIGEST (\d+) (.*)/.exec(line);
  if (m) { c.digests.set(+m[1], m[2]); return; }
  if (/SCRIPT ERROR|ONLINE failed|ONLINE desync|ONLINE resynced|ONLINE snapshot/.test(line)) c.errors.push(line.trim());
  if (/^ONLINE started/.test(line)) { c.started = line.trim(); log(`  ${c.name}: ${c.started}`); }
  if (c.lines.length < 400) c.lines.push(line);
}

async function main() {
  let relay = arg('relay', ''), local = null;
  if (!relay) {
    const { startLocal } = await import('../local-server.mjs');
    local = await startLocal(+arg('port', 8791));
    relay = 'ws://127.0.0.1:' + arg('port', 8791);
  }
  const httpBase = relay.replace(/^ws/, 'http');
  const code = (await (await fetch(httpBase + '/new')).json()).code;
  const total = nWeb + nNative;
  const common = [`--online=${relay}`, `--code=${code}`, '--demo', `--minutes=${minutes + 1}`, '--hashlog', `--start-at=${total}`];
  if (has('digest')) common.push('--digest');
  if (arg('ai', '')) common.push('--ai=' + arg('ai', ''));
  if (arg('map', '')) common.push('--map=' + arg('map', ''));
  if (local && arg('turnms', '')) common.push('--turnms=' + arg('turnms', ''));
  if (has('fast')) common.push('--fast');
  log(`battle soak: ${nWeb} web + ${nNative} desktop client(s)${arg('ai', '') ? ' + AI ' + arg('ai', '') : ''}, ${minutes} game-minutes, relay ${relay}, game ${code}`);

  const mk = (name, kind) => { const c = { name, kind, hashes: new Map(), digests: new Map(), lines: [], errors: [], last: Date.now() }; clients.push(c); return c; };
  const procs = []; let browser = null, web = null;
  let idx = 0;
  // desktop clients first (they start in a second; the first one in leads the lobby)
  for (let i = 0; i < nNative; i++, idx++) {
    const c = mk('desktop' + (i + 1), 'desktop');
    const args = [...common, `--name=${c.name}`, `--fac=${NATIONS[idx % 4]}`];
    const cmd = nativeBin ? path.resolve(nativeBin) : (process.env.GODOT || 'godot');
    const full = nativeBin ? ['--headless', '--', ...args] : ['--headless', '--path', path.resolve(HERE, '../../godot'), '--', ...args];
    const p = spawn(cmd, full, { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const feed = (d) => { buf += d; let j; while ((j = buf.indexOf('\n')) >= 0) { onLine(c, buf.slice(0, j)); buf = buf.slice(j + 1); } };
    p.stdout.on('data', feed); p.stderr.on('data', feed);
    p.on('exit', () => { c.exited = true; });
    procs.push(p);
  }
  if (nWeb > 0) {
    const pw = await playwright();
    web = await serveWeb(webDir);
    const base = `http://127.0.0.1:${web.address().port}/`;
    browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
    for (let i = 0; i < nWeb; i++, idx++) {
      const c = mk('web' + (i + 1), 'web');
      const args = ['--', ...common, `--name=${c.name}`, `--fac=${NATIONS[idx % 4]}`];
      const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
      const page = await ctx.newPage();
      // the exported page starts the engine with "args":[] - hand it this client's command line
      await page.route('**/index.html', async (route) => {
        const html = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8').replace('"args":[]', '"args":' + JSON.stringify(args));
        await route.fulfill({ contentType: 'text/html', body: html });
      });
      page.on('console', (m) => { for (const l of m.text().split('\n')) onLine(c, l); });
      page.on('pageerror', (e) => c.errors.push('pageerror ' + e.message));
      await page.goto(base + 'index.html');
    }
  }

  const hashEvery = 10, target = minutes * 600 - hashEvery;
  const t0 = Date.now(), wallCap = (minutes * (has('fast') ? 1.5 : 1.6) + 4) * 60e3;
  let lastNote = 0;
  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    const mins = clients.map(c => Math.max(-1, ...c.hashes.keys()));
    if (mins.every(k => k >= target)) break;
    if (Date.now() - t0 > wallCap) { log('wall-clock cap reached'); break; }
    if (clients.every(c => c.exited || Date.now() - c.last > 90e3) && Date.now() - t0 > 120e3) { log('every client stopped'); break; }
    if (Date.now() - lastNote > 60e3) { lastNote = Date.now(); log(`  ${Math.round((Date.now() - t0) / 1000)} s: turns ${mins.join(' / ')} of ${target}`); }
  }
  for (const p of procs) try { p.kill('SIGKILL'); } catch (e) {}
  if (browser) await browser.close();
  if (web) web.close();
  if (local) { try { local.close(); } catch (e) {} }

  // compare
  const turns = [...new Set(clients.flatMap(c => [...c.hashes.keys()]))].sort((a, b) => a - b);
  let compared = 0, bad = 0, firstBad = -1;
  for (const k of turns) {
    const hs = clients.filter(c => c.hashes.has(k)).map(c => c.hashes.get(k));
    if (hs.length < clients.length) continue;
    compared++;
    if (new Set(hs).size > 1) { bad++; if (firstBad < 0) firstBad = k; }
  }
  const upto = Math.min(...clients.map(c => Math.max(-1, ...c.hashes.keys())));
  const errors = clients.flatMap(c => c.errors.map(e => `${c.name}: ${e}`));
  const ok = bad === 0 && compared >= target / hashEvery * 0.9 && errors.length === 0;
  const res = { ok, relay, code, clients: clients.map(c => ({ name: c.name, kind: c.kind, hashes: c.hashes.size, started: c.started || null })), ai: arg('ai', ''), map: arg('map', 'bm_splitridge'),
    gameMinutes: +(upto / 600).toFixed(2), turnsCompared: compared, mismatches: bad, firstMismatchTurn: firstBad, errors: errors.slice(0, 20), wallSeconds: Math.round((Date.now() - t0) / 1000) };
  if (firstBad >= 0) {
    log(`first different hash at turn ${firstBad} (game time ${(firstBad / 10).toFixed(0)} s):`);
    for (const c of clients) log(`  ${c.name} ${c.hashes.get(firstBad)}`);
    const ds = clients.filter(c => c.digests.has(firstBad)).map(c => c.digests.get(firstBad).split('|'));
    if (ds.length > 1) { const diff = ds[0].filter((l, i) => ds.some(d => d[i] !== l)).map(l => l.split(' ')[0]); res.differingParts = diff; log('  state parts that differ: ' + diff.join(', ')); }
  }
  for (const e of errors.slice(0, 10)) log('  ' + e);
  if (!clients.every(c => c.started)) for (const c of clients) if (!c.started) log(`  ${c.name} never started; first lines:\n    ` + c.lines.slice(0, 12).join('\n    '));
  log(JSON.stringify(res));
  if (arg('report', '')) fs.writeFileSync(arg('report', ''), JSON.stringify(res, null, 1));
  log(ok ? `BATTLESOAK PASS (${compared} game-seconds compared, ${clients.length} clients, all hashes equal)` : 'BATTLESOAK FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
