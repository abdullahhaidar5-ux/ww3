// Epic-maps screenshots -> orch/shots/epic/: wide PC shots (distant mountain ranges, haze, smoke columns) of chosen maps.
//   node orch/epicshots.mjs [--maps strait,zagros] [--tag x]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = argS('tag', 'after');
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots');
const MAPS = argS('maps', 'strait,zagros,arctic,emirates').split(',').filter(Boolean);
const SEED = 4242;

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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const page0 = fs.readFileSync(HTML);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); } // no service worker: every run loads exactly this page
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
await acquireBrowserLock('gfx-shots');
const dir = path.join(OUT, 'epic'); fs.mkdirSync(dir, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); } catch (e) {} try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
  return { ctx, page };
}
// start a 2-player battle (both sides AI), wait for the loading screen, then fast-forward `simSec` game-seconds
async function battle(page, map, p, a, simSec, w = 0, n = 1) {
  const r = await page.evaluate(async ([map, p, a, seed, w, n]) => {
    if (G) G.over = true;
    Object.assign(setup, { map, n, p, a, others: [], tm: [], slot: -1, seed, w });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false;
    return { map: G.mapKey, facs: G.teams.map(T => T.fac), rev: THREE.REVISION, W: MAPW, H: MAPH };
  }, [map, p, a, SEED, w, n]);
  for (let done = 0; done < simSec * 60; done += 1800)
    await page.evaluate(k => { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, Math.min(1800, simSec * 60 - done));
  return r;
}
async function frames(page, n) {
  return page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4), ts = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    return ts; }, n);
}
async function snap(page, name) { await page.screenshot({ clip: { x: 0, y: 0, width: 1400, height: 440 }, path: path.join(dir, name + '.png'), timeout: 300000 }); console.log(`[${secs()}] ${TAG}/${name}.png`); }
const cam_ = (page, x, y, d, t) => page.evaluate(([x, y, d, t]) => { cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; cam.tilt = t; }, [x, y, d, t]);
try {
  const { ctx, page } = await open({ viewport: { width: 1400, height: 640 } });
  for (const k of MAPS) {
    const r = await battle(page, k, 'US', 'RU', 40, 0, 1);
    const at = await page.evaluate(() => { for (const e of G.ents) e.vs && (e.vs[0] = true); G.paused = true; for (let i = 0; i < 5; i++) smkAdd(MAPW / 2 + (i - 2) * 330, MAPH * .36 + (i % 2) * 220, 6); return [MAPW, MAPH, zmax()]; });
    console.log(k, JSON.stringify(at));
    await page.evaluate(() => { G.paused = false; for (let i = 0; i < 120 && G && !G.over; i++) simUpdate(1 / 60); G.alpha = 1; });
    await cam_(page, at[0] / 2, at[1] * .30, 300, -0.32); await frames(page, 8); await snap(page, `${k}-horizon`);
  }
  await ctx.close();
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 20).join('\n'));
await browser.close(); server.close();
