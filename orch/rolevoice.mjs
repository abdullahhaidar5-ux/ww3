// Role voices test (2026-11-03): in an RS battle the clip sheet vo/RS_r.mp3 loads on the first order and each unit type plays its own role clip.
//    --no-lock  # skip the machine-wide browser lock
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
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
const sreqs = [];
page.on('request', q => { const u = new URL(q.url()); if (u.pathname.startsWith('/sfx/')) sreqs.push(u.pathname.slice(1)); });
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
let blockLog = false;
page.on('console', q => {
  if (q.type() !== 'error') return;
  const t = q.text();
  if (blockLog && /mus\/st\/|ERR_FAILED/.test(t)) return;  // the requests test g) blocks on purpose
  if (/audio|music|sound|mus\/|anthem|AudioContext|media/i.test(t)) errs.push('console audio error: ' + t.slice(0, 300));
});

const res = [], fails = [];
const ok = (name, cond, info) => { res.push(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!cond) fails.push(name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const d = ST.decks[ST.cur], ds = ST.decks.map(x => ({ id: x.id, on: x.on, started: x.started, paused: x.el.paused, t: +x.el.currentTime.toFixed(2), g: +x.g.gain.value.toFixed(3) }));
  return { mode: ST.mode, pool: ST.pool, id: ST.id, fail: ST.fail, an: !!ST.an, anWait: !!ST.anWait, heat: AU.heat, 
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
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { setup.p = 'RS'; setup.a = 'US'; setup.n = 1; });
  await page.mouse.click(640, 30); await sleep(1500);
  await page.evaluate(() => { startSingle(); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  await sleep(3000);
  const r = await page.evaluate(async () => {
    const out = { roles: {}, played: 0 }; const sleep = ms => new Promise(r => setTimeout(r, ms));
    const orig = voRPlay; let hits = []; window.voRPlay = function (f, k) { const v = orig(f, k); if (v) hits.push(k); return v; };
    AU.voiceOn = true; AU.lastVoice = 0; voRLoad('RS'); await sleep(4000);
    out.loaded = typeof VORB.RS === 'object';
    const mine = G.ents.filter(u => u.team === ME && !u.isB && !u.dead);
    const kinds = [...new Set(mine.map(u => u.kind))]; out.kinds = kinds;
    for (const k of kinds) { const u = mine.find(x => x.kind === k); G.sel = [u]; AU.voEnd = 0; AU.lastVoice = 0; const ok = [0, 1, 2].map(kk => { AU.voEnd = 0; return voRPlay('RS', kk); }); out.roles[k] = (VO_ROLE[k] || 'inf') + ':' + ok.join(','); }
    return out;
  });
  console.log(JSON.stringify(r));
  ok('role sheet loads', r.loaded);
  ok('every unit type plays select/move/attack role clips', Object.values(r.roles).every(v => v.endsWith('true,true,true')), JSON.stringify(r.roles));
  ok('no page errors', errs.length === 0, errs.join(' ; '));
} catch (e) { fails.push('crash ' + e.message); console.log(e.stack); }
console.log(res.join('\n'));
await browser.close(); server.close();
console.log(fails.length ? 'ROLEVOICE FAIL: ' + fails.join('; ') : 'ROLEVOICE PASS');
process.exit(fails.length ? 1 : 0);
