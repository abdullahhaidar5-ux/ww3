// baseline (scaled by a small CPU speed check so a slower CI machine does not trip it), plus a few absolute sanity limits.
// Never touches the production servers (guardContext). A failing profile is re-run once; it fails only if it fails twice.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext, DEAD_SERVER } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, "orch", "out"); fs.mkdirSync(OUT, { recursive: true });
const argN = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes(k);
const FRAMES = argN('frames', 150), MIN = argN('minutes', 2), EXTRA = argN('extra', 40), MPSECS = argN('mpsecs', 40);
const WANT = (argS('profile', 'all')).split(',');
const UPDATE = has('--update-baseline');

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`, URL0 = ORIGIN + '/index.html';
const { chromium } = await loadPlaywright();
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'];
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r2 = x => Math.round(x * 100) / 100;
// wobble.mjs: do vehicles/infantry move cleanly? Sends tanks, trucks, infantry and a helicopter across a map and records every sim step:
// stuck (not arrived after 40 game-seconds), arrival wobble (still creeping/oscillating after stopping), heading flips (>60 deg turn in one step), position pops.
const browser = await chromium.launch({ executablePath: findChromium(), args: ARGS });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
await page.addInitScript(() => { try { localStorage.setItem('ww3_tut', '1'); } catch (e) {} });
await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
const MAP = argS('map', 'fulda');
const res = await page.evaluate((map) => {
  setup.n = 2; setup.map = map; setup.seed = 5; startSingle(); window.__stopLoop = true;
  for (let i = 0; i < 600; i++) simUpdate(1 / 60);
  const T = 0, [bx, by] = BASES[T]; const U = [];
  const kinds = ['tank', 'tank', 'tank', 'inf', 'inf', 'inf', 'at', 'arty', 'aa', 'tank'];
  const side = bx < MAPW / 2 ? 1 : -1;
  kinds.forEach((k, i) => { const p = nearestPassXY('ground', bx + side * (120 + (i % 5) * 26), by + Math.floor(i / 5) * 30 - 20) || [bx, by]; const u = addUnit(T, k, p[0], p[1]); if (u) U.push(u); });
  const tx = bx + side * 700, ty = by + 120;
  const rec = U.map(u => ({ id: u.id, kind: u.kind, x: [], y: [], a: [], arr: -1 }));
  U.forEach((u, i) => setMove(u, tx + (i % 5) * 22, ty + Math.floor(i / 5) * 24, 'move'));
  for (let s = 0; s < 60 * 70; s++) { simUpdate(1 / 60); U.forEach((u, i) => { const r = rec[i]; r.x.push(u.x); r.y.push(u.y); r.a.push(u.va); if (r.arr < 0 && !u.order && !u.dead) r.arr = s; }); }
  // second leg: turn around to a point behind them (tests U-turns and corners)
  const rec2 = U.map(u => ({ id: u.id, kind: u.kind, x: [], y: [], a: [], arr: -1 }));
  U.forEach((u, i) => { if (!u.dead) setMove(u, bx + side * 150 + (i % 5) * 22, by - 150 + Math.floor(i / 5) * 24, 'move'); });
  for (let s = 0; s < 60 * 60; s++) { simUpdate(1 / 60); U.forEach((u, i) => { const r = rec2[i]; r.x.push(u.x); r.y.push(u.y); r.a.push(u.va); if (r.arr < 0 && !u.order && !u.dead) r.arr = s; }); }
  return { rec, rec2 };
}, MAP);
await browser.close(); server.close();
const dAng = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const out = [];
for (const [leg, recs] of [['leg1', res.rec], ['leg2', res.rec2]]) for (const r of recs) {
  const n = r.x.length; let flips = 0, pops = 0, maxStep = 0, turnMax = 0;
  for (let i = 1; i < n; i++) { const st = Math.hypot(r.x[i] - r.x[i - 1], r.y[i] - r.y[i - 1]); maxStep = Math.max(maxStep, st); if (st > 6) pops++; const da = Math.abs(dAng(r.a[i - 1], r.a[i])); turnMax = Math.max(turnMax, da); if (da > 1.0) flips++; }
  // arrival wobble = back-and-forth creeping in the 10 s after the move order ends: path walked minus straight-line distance, and direction reversals
  let wob = 0, rev = 0, tail = 0;
  if (r.arr >= 0 && r.arr + 60 < n) { const e = Math.min(n - 1, r.arr + 600); let path = 0, pdx = 0, pdy = 0;
    for (let i = r.arr + 1; i <= e; i++) { const dx = r.x[i] - r.x[i - 1], dy = r.y[i] - r.y[i - 1]; path += Math.hypot(dx, dy); if (Math.hypot(dx, dy) > 0.05) { if (pdx * dx + pdy * dy < 0) rev++; pdx = dx; pdy = dy; } }
    wob = path - Math.hypot(r.x[e] - r.x[r.arr], r.y[e] - r.y[r.arr]); tail = e - r.arr; }
  out.push({ leg, kind: r.kind, arrivedAtS: r.arr < 0 ? 'NEVER' : +(r.arr / 60).toFixed(1), wobbleUnits: +wob.toFixed(2), reversals: rev, headingFlips: flips, maxTurnRad: +turnMax.toFixed(2), pops, maxStep: +maxStep.toFixed(2) });
}
console.table(out);
const bad = out.filter(o => o.arrivedAtS === 'NEVER' || o.reversals > 8 || o.pops > 0);
console.log('WOBBLE ' + (bad.length ? 'ISSUES ' + bad.length : 'CLEAN'));
fs.writeFileSync(path.join(OUT, 'wobble.json'), JSON.stringify(out, null, 1));
process.exit(0);
