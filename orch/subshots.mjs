// Submarine + coastal battery close-ups -> orch/shots/subs/ (node orch/subshots.mjs)
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
const MAPS = argS('maps', 'strait,arctic,fulda,gulf,zagros,emirates,dmz').split(',').filter(Boolean);
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
const dir = path.join(OUT, 'subs'); fs.mkdirSync(dir, { recursive: true });
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
async function snap(page, name) { await page.screenshot({ path: path.join(dir, name + '.png'), timeout: 300000 }); console.log(`[${secs()}] ${TAG}/${name}.png`); }
const cam_ = (page, x, y, d) => page.evaluate(([x, y, d]) => { cam.dist = cam.td = d; cam.x = cam.tx = x; cam.y = cam.ty = y; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist; }, [x, y, d]);
const VIEWS = argS('views', 'pc,phone').split(',');
const TAGS = argS('tags', 'US-RU,IR-KR').split(','), SHOTS = argS('shots', 'sub,subwide,battery').split(','), CAMD = +argS('camd', 0);
try {
  for (const view of VIEWS) {
    const o = view === 'pc' ? { viewport: { width: 1280, height: 720 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    const { ctx, page } = await open(o);
    for (const [p, a, tag] of [['US', 'RU', 'US-RU'], ['IR', 'KR', 'IR-KR']].filter(q => TAGS.includes(q[2]))) {
      await battle(page, 'gulf', p, a, 2);
      await page.evaluate(() => { G.paused = true; const keep = G.ents.filter(e => e.isB); G.ents = keep; let w = null;
        for (let y = MAPH * .5; y < MAPH && !w; y += 60) for (let x = 500; x < MAPW - 1400 && !w; x += 60) if (passXY('naval', x, y) && passXY('naval', x + 700, y) && passXY('naval', x, y + 300)) w = [x, y];
        const out = [];
        for (let i = 0; i < 2; i++) { const s = addUnit(i, 'sub', w[0] + i * 90, w[1]); s.va = s.ang = 0; s.stlT = 1; out.push(s); const t = addUnit(i, 'sub', w[0] + i * 90, w[1] + 110); t.va = t.ang = 0; t.detT = 1e9; }
        const sh = addUnit(0, 'ship', w[0] + 220, w[1] + 55); sh.va = 0;
        const [bx, by] = BASES[0]; addBld(0, 'coast', bx + 260, by + 40, 1); addBld(1, 'coast', bx + 330, by + 120, 1);
        for (const u of G.ents) { u.ox = u.x; u.oy = u.y; if (u.vs) u.vs[0] = true; } window.__at = w; G.paused = false; for (let i = 0; i < 90; i++) simUpdate(1 / 60); for (const u of G.ents) { u.ox = u.x; u.oy = u.y; } G.alpha = 1; for (let i = 0; i < 4; i++) renderFrame(0.5); });
      const w = await page.evaluate(() => window.__at);
      for (const [nm, dx, dy, d] of [['sub', 45, 55, view === 'pc' ? 200 : 260], ['subwide', 110, 55, view === 'pc' ? 420 : 520]]) {
        if (!SHOTS.includes(nm)) continue;
        await cam_(page, w[0] + dx, w[1] + dy, d); await frames(page, 8); await snap(page, `${view}-${tag}-${nm}`);
      }
      const bs = await page.evaluate(() => { const [bx, by] = BASES[0]; return [bx, by]; });
      if (!SHOTS.includes('battery')) continue;
      await cam_(page, bs[0] + +argS('cx', 290), bs[1] + +argS('cy', 80), CAMD || (view === 'pc' ? 190 : 250)); await frames(page, 8); await snap(page, `${view}-${tag}-battery`);
    }
    await ctx.close();
  }
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 20).join('\n'));
await browser.close(); server.close();
