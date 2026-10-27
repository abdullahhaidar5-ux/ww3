// Headless check of the shared soundtrack (src/09-audio.js "Shared soundtrack", files in mus/st/).
// Boots the game in Chromium, plays the menu, starts a US skirmish and checks:
//   a) the anthem then a calm track play in battle, and the old generator's samples (mus/smp.mp3, me/as/we) are not fetched
//   b) fighting (AU.heat high) switches to a combat track with a crossfade
//   c) the dwell rule: combat holds for its minimum time even when the fighting stops, then goes back to calm
//   d) victory plays the victory track, then the anthem, then the menu pool
//   e) the nation's anthem (mus/an_US.mp3) is fetched at battle start
//   f) tracks stream one at a time: only the menu + calm files were fetched when calm started, and nothing was fetched
//      that the player didn't ask for
//   g) if the soundtrack can't load, the generated score takes over (no silence)
// Time-based waits (dwell) are shortened by moving the pool's start time back, so the logic is tested, not the clock.
//   node orch/musiccheck.mjs            # prints MUSICCHECK PASS / FAIL
//   node orch/musiccheck.mjs --no-lock  # skip the machine-wide browser lock
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}
if (!process.argv.includes('--no-lock')) await acquireBrowserLock();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  // byte ranges, like GitHub Pages / Cloudflare (audio elements seek with them)
  const type = MIME[path.extname(f)] || 'application/octet-stream', size = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const bctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
await guardContext(bctx);
const page = await bctx.newPage();
let blockST = false;
await page.route('**/*', r => {
  const u = r.request().url();
  if (!u.startsWith(BASE)) return r.abort();
  if (blockST && u.includes('/mus/st/')) return r.abort();
  return r.continue();
});
const reqs = [];
page.on('request', q => { const u = new URL(q.url()); if (u.pathname.startsWith('/mus/')) reqs.push(u.pathname.slice(1)); });
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));

const res = [], fails = [];
const ok = (name, cond, info) => { res.push(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!cond) fails.push(name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const d = ST.decks[ST.cur], ds = ST.decks.map(x => ({ id: x.id, on: x.on, started: x.started, paused: x.el.paused, t: +x.el.currentTime.toFixed(2), g: +x.g.gain.value.toFixed(3) }));
  return { mode: ST.mode, pool: ST.pool, id: ST.id, fail: ST.fail, an: !!ST.an, anWait: !!ST.anWait, heat: AU.heat, timer: !!AU.timer,
    playing: !!(d && d.on && d.started && !d.el.paused && d.el.currentTime > 0), decks: ds, req: ST.req.slice(), err: AU.err || '', ctx: AU.ctx && AU.ctx.state };
});
async function until(fn, ms, step = 250) { const t = Date.now(); let s; while (Date.now() - t < ms) { s = await state(); if (fn(s)) return s; await sleep(step); } return null; }
// RMS of the music bus over ~1.5 s (0 = silence)
const level = () => page.evaluate(async () => {
  const c = AU.ctx, a = c.createAnalyser(); a.fftSize = 2048; AU.musBus.connect(a); const buf = new Float32Array(a.fftSize); let s = 0, n = 0;
  for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); a.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; } }
  AU.musBus.disconnect(a); return Math.sqrt(s / n);
});

try {
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof ST === 'object', null, { timeout: 60000 });
  await page.evaluate(() => { setup.p = 'US'; setup.a = 'RU'; setup.n = 1; initAudio(); menuMusic(); });
  // menu
  let s = await until(s => s.mode === 'menu' && s.playing, 20000);
  ok('menu: a menu track plays', !!s && /^menu-/.test(s.id), s ? s.id : JSON.stringify(await state()));
  await sleep(5000);
  const L = {};
  if (s) ok('menu: music bus is not silent', (L.menu = await level()) > 0.002);

  // battle start
  await page.evaluate(() => { startSingle(); if (G && G.teams[0]) G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  console.log('battle loaded:', await page.evaluate(() => G.teams.map(t => t.fac).join(' vs ')));
  s = await until(s => s.an || s.anWait, 15000);
  ok('e) anthem requested at battle start (US)', reqs.includes('mus/an_US.mp3'), reqs.filter(r => r.includes('an_')).join(','));
  s = await until(s => s.an, 15000);
  ok('e) anthem plays', !!s);
  // the battle itself may heat up; keep it cool until calm has started so the calm check is deterministic
  await page.evaluate(() => { window.__cool = setInterval(() => { AU.heat = 0; }, 100); });
  s = await until(s => s.mode === 'battle' && s.pool === 'calm' && s.playing && !s.an, 60000);
  ok('a) a calm track plays after the anthem', !!s && /^calm-/.test(s.id), s ? s.id : JSON.stringify(await state()));
  if (s) { await sleep(3000); ok('a) calm is audible on the music bus', (L.calm = await level()) > 0.002); }
  const bad = reqs.filter(r => /mus\/(smp|me|as|we)\.mp3/.test(r));
  ok('a) old generator samples not fetched (smp/me/as/we)', bad.length === 0, bad.join(','));
  ok('a) old generator not running', s && !s.timer);
  const stNow = [...new Set(reqs.filter(r => r.startsWith('mus/st/')))];
  ok('f) only the menu + calm files fetched so far (streaming)', stNow.length <= 2, stNow.join(', '));

  // fighting: heat high -> combat (calm dwell is 30 s; move the pool's start back instead of waiting)
  await page.evaluate(() => { clearInterval(window.__cool); window.__hot = setInterval(() => { AU.heat = 1; }, 100); ST.since -= 31000; });
  s = await until(s => s.pool === 'combat', 3000);
  ok('b) heat high switches to the combat pool', !!s && /^combat-/.test(s.id), s && s.id);
  s = await until(s => s.pool === 'combat' && s.playing && s.decks.every(d => d.id === s.id || !d.on), 10000);
  await sleep(3600);
  s = await state();
  const old = s.decks.find(d => d.id !== s.id);
  L.combat = await level();
  ok('b) crossfade done: combat deck up, calm deck faded and paused', s.playing && (!old || (!old.on && old.paused && old.g < 0.01)), JSON.stringify(s.decks));

  // dwell: fighting stops; combat must hold for 60 s
  await page.evaluate(() => { clearInterval(window.__hot); window.__cool = setInterval(() => { AU.heat = 0; }, 100); });
  await sleep(6000);
  s = await state();
  ok('c) combat holds while its 60 s dwell runs (heat 0)', s.pool === 'combat', s.pool);
  await page.evaluate(() => { ST.since -= 60000; });
  s = await until(s => s.pool === 'calm', 3000);
  ok('c) after the dwell, back to calm', !!s);
  await page.evaluate(() => { clearInterval(window.__cool); window.__hot = setInterval(() => { AU.heat = 1; }, 100); });
  await sleep(4000);
  s = await state();
  ok('c) no ping-pong: calm holds for its dwell even with heat high', s.pool === 'calm', s.pool);
  await page.evaluate(() => { clearInterval(window.__hot); });
  const st2 = ST_REQ_CHECK(reqs, s.req);
  ok('f) no soundtrack file fetched that the player did not play', st2.length === 0, st2.join(', '));

  // victory
  await page.evaluate(() => { showEnd(ME); });
  s = await until(s => s.pool === 'victory' && s.playing, 15000);
  ok('d) victory plays the victory track', !!s && s.id === 'victory-01' && reqs.includes('mus/st/victory-01.mp3'), s && s.id);
  await page.evaluate(() => { const d = ST.decks[ST.cur]; d.el.currentTime = Math.max(0, d.el.duration - 4); });
  s = await until(s => s.an, 10000);
  ok('d) the anthem follows the victory track', !!s);
  await page.evaluate(() => { if (ST.an) ST.an.end = AU.ctx.currentTime + 3.5; });
  s = await until(s => s.mode === 'menu' && /^menu-/.test(s.id || '') && s.playing, 15000);
  ok('d) then the menu pool', !!s, s && s.id);

  // fallback: soundtrack unreachable -> the generated score plays
  blockST = true;
  await page.evaluate(() => { G = null; stopMusic(); menuMusic(); });
  s = await until(s => s.fail && s.timer, 30000);
  ok('g) soundtrack unreachable: generated score takes over', !!s, JSON.stringify(await state()));
  if (s) { await sleep(6000); L.generated = await level(); }
  console.log('music bus RMS (info):', Object.entries(L).map(([k, v]) => k + ' ' + v.toFixed(4)).join(', '));
  ok('no page errors', errs.length === 0, errs.join(' ; '));
  console.log('fetched:', [...new Set(reqs)].join(', '));
} catch (e) {
  fails.push('exception: ' + (e.stack || e));
}
function ST_REQ_CHECK(all, asked) { const a = new Set(asked); return [...new Set(all.filter(r => r.startsWith('mus/st/')))].filter(r => !a.has(r)); }
for (const r of res) console.log(r);
await browser.close(); server.close();
if (fails.length) { console.log('MUSICCHECK FAIL: ' + fails.join('; ')); process.exit(1); }
console.log('MUSICCHECK PASS');
process.exit(0);
