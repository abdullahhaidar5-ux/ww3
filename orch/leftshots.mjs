//   node orch/three/compare.mjs --tag after                              # this branch's index.html
//   node orch/three/compare.mjs --sheet                                  # side-by-side contact sheets (Python + Pillow)
//
// Options: --maps strait,arctic   --close 0 (skip close-ups)   --perf 0 (skip frame timing)   --frames 20   --no-lock
// Writes orch/out/three/<tag>/*.png and perf.json. Uses the machine-wide browser lock like smoke.mjs.
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
const TAG = 'x';
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT,'orch','shots','leftovers-1104');
const MAPS = argS('maps', 'rubalkhali,fulda,arctic,emirates,islands,zagros').split(',').filter(Boolean);
// close-ups: [map, player nation, enemy nation]
const CLOSE = argS('close', '1') === '0' ? [] : [['fulda', 'US', 'RU'], ['golan', 'IR', 'IL'], ['dmz', 'RS', 'CN']];
const PERF = argS('perf', '1') !== '0';
const FRAMES = Number(argS('frames', 20));
const AIR = argS('air', '1') !== '0'; // Apache + F-16 close-up (US vs IL: US flies the Apache, IL the F-16)
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
await acquireBrowserLock('leftshots');
const dir = OUT; fs.mkdirSync(dir, { recursive: true });
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
async function battle(page, map, p, a, simSec) {
  const r = await page.evaluate(async ([map, p, a, seed]) => {
    if (G) G.over = true;
    Object.assign(setup, { map, n: 1, p, a, others: [], tm: [], slot: -1, seed });
    startSingle(); const w0 = performance.now();
    while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    G.teams.forEach(T => { if (!T.ai) T.ai = mkAI(1); }); G.paused = false;
    return { map: G.mapKey, facs: G.teams.map(T => T.fac), rev: THREE.REVISION, W: MAPW, H: MAPH };
  }, [map, p, a, SEED]);
  for (let done = 0; done < simSec * 60; done += 1800)
    await page.evaluate(k => { for (let i = 0; i < k && G && !G.over; i++) simUpdate(1 / 60); for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1; }, Math.min(1800, simSec * 60 - done));
  return r;
}
const MAP = argS('map','fulda');
for (const [name, opts] of [['pc', { viewport: { width: 1280, height: 720 } }], ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const { ctx, page } = await open(opts);
  const r = await battle(page, MAP, 'US', 'RU', 20);
  const info = await page.evaluate(() => ({ br: (G.map.bridges || []).map(b => [b.x | 0, b.y | 0]), cr: (G.craters || []).length, low: gfxLow(), water: !!G.map.hasWater }));
  console.log(name, JSON.stringify(info));
  const shot = async (tag, f) => { await page.evaluate(f); await page.evaluate(() => { for (let i = 0; i < 4; i++) renderFrame(1.5); }); await page.screenshot({ path: path.join(dir, `${tag}-${name}.png`) }); };
  if (process.env.NOBR!=='1' && info.br.length) await shot('bridge', () => { const b = G.map.bridges[0]; cam.dist = cam.td = 260; cam.x = cam.tx = b.x; cam.y = cam.ty = b.y + 90; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; });
  await shot('road', () => { const sp = G.warSpots[(G.warSpots.length>>1)] || G.warSpots[0]; cam.dist = cam.td = 150; cam.x = cam.tx = sp[0]; cam.y = cam.ty = sp[1] - 15; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; });
  if (process.env.NOBR!=='1') await shot('shore', () => { const M = G.map; let best = null; for (let i = 0; i < 6000; i++) { const x = 200 + Math.random() * (MAPW - 400), y = 200 + Math.random() * (MAPH - 400); const d = Math.abs(M.depth(x, y)) - M.hw(x); if (d > 0 && d < 40 && (!best || Math.random() < .02)) best = [x, y]; } cam.dist = cam.td = 300; cam.x = cam.tx = best[0]; cam.y = cam.ty = best[1] + 90; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; });
  await ctx.close();
}
console.log('errs', errs.slice(0, 5).join(' || '));
await browser.close(); server.close(); process.exit(0);
