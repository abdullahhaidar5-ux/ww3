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
const TAG = argS('shots', ''), QUICK = process.argv.includes('--quick'); // --quick: desktop, first scene, closest zoom only
const HTML = path.resolve(argS('html', path.join(ROOT, 'index.html')));
const OUT = path.join(ROOT, 'orch', 'shots', process.env.WALK_SHOTS || 'infantry-walk');

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
await acquireBrowserLock('walktest');
const dir = TAG ? path.join(OUT, TAG) : null; if (dir) fs.mkdirSync(dir, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(ctxOpts) {
  const ctx = await browser.newContext(ctxOpts); await guardContext(ctx);
  // test only: the game gives up on a model download after 30 s; on a machine busy with other agents' browsers that drops
  // the soldier models (stand-ins with no skeleton fail every check). Let downloads finish however long they take.
  await ctx.addInitScript(() => { const AC = window.AbortController; if (AC) window.AbortController = class extends AC { abort() {} }; });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { const t = m.text(); if (/^live blds|^bld /.test(t)) console.log(t); if ((m.type() === 'error' || m.type() === 'warning') && !/net::|Failed to load|AudioContext|autoplay|speech|WebSocket|peer/i.test(t)) errs.push(m.type() + ': ' + t.slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(() => { window.__stopLoop = true; try { initAudio(); } catch (e) {} try { AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} });
  return { ctx, page };
}
// Realism screenshots (orch/realism): node orch/realismshots.mjs <scene> [map] [P] [A]   -> orch/shots/realism/<scene>-*.png
const SCENE = process.argv[2] || 'posture', MAP = process.argv[3] || 'fulda', PN = process.argv[4] || 'US', AN = process.argv[5] || 'RU';
const OUTD = path.join(ROOT, 'orch', 'shots', 'realism'); fs.mkdirSync(OUTD, { recursive: true });
const { ctx, page } = await open(process.env.PHONE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
await page.evaluate(async ([map, p, a]) => {
  if (G) G.over = true; Object.assign(setup, { map, n: 1, p, a, others: [], tm: [], slot: -1, seed: 4242 });
  const ready = () => !!(MODELS.proto[solKey(p)] && MODELS.proto[solKey(a)]);
  for (let tr = 0; tr < 3; tr++) { if (tr) G.over = true; startSingle(); const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
    while (!ready() && performance.now() - w0 < 600000) await new Promise(r => setTimeout(r, 250)); if (ready()) break; }
  G.paused = true;
}, [MAP, PN, AN]);
async function aim(cx, cy) { await page.evaluate(([cx, cy]) => { const W = innerWidth, H = innerHeight - 180; for (let i = 0; i < 100; i++) { const f = toScreen(cx, 6, cy); cam.ty += (f.y - H / 2) * .12; cam.tx += (f.x - W / 2) * .12; cam.x = cam.tx; cam.y = cam.ty; placeCam(); } }, [cx, cy]); }
async function shot(name) { await page.evaluate(() => { for (let k = 0; k < 4; k++) renderFrame(1 / 60); }); await page.screenshot({ path: path.join(OUTD, `${process.env.PHONE ? 'phone-' : ''}${SCENE}-${name}.png`), timeout: 180000 }); console.log('shot', name); }
const SC = {
  async posture() {
    await page.evaluate(() => {
      G.ents = G.ents.filter(e => e.isB); const [bx, by] = BASES[0]; const x0 = Math.max(700, Math.min(MAPW - 700, bx + 260)), y0 = Math.max(700, Math.min(MAPH - 700, by + 80));
      window.__y0 = y0; window.__T = []; for (let i = 0; i < 12; i++) { const u = addUnit(i < 6 ? 0 : 1, 'inf', x0 + (i % 6) * 55 - 140, y0 + (i < 6 ? 0 : 90)); u.va = u.ang = i < 6 ? 0 : Math.PI; __T.push(u); }
      cam.dist = cam.td = 200; cam.x = cam.tx = x0; cam.y = cam.ty = y0 - 60; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      const st = dt => { G.t += dt; G.alpha = 1; placeCam(); syncScene(dt); };
      window.__st = st; for (let k = 0; k < 30; k++) st(1 / 60);
      for (let i = 0; i < 12; i++) { const u = __T[i]; if (i % 6 < 2) u.supp = 1; else if (i % 6 < 4) u.lastFire = G.t; }
      for (let k = 0; k < 120; k++) { for (const u of __T) if (u.lastFire !== undefined && !(u.supp > .5)) u.lastFire = G.t; st(1 / 60); }
    });
    await aim(...await page.evaluate(() => [__T[2].x + 40, __T[2].y + 40]));
    await shot('squad');
    await page.evaluate(() => { cam.dist = cam.td = 140; cam.y = cam.ty = window.__y0; placeCam(); for (let k = 0; k < 5; k++) __st(1 / 60); });
    await aim(...await page.evaluate(() => [__T[1].x, __T[1].y]));
    await shot('close');
  },
  async garrison() {
    const info = await page.evaluate(() => {
      G.ents = G.ents.filter(e => e.isB); let best = null;
      for (const c of G.civ) { if (c.dead || c.ruin || !c.b.length) continue; const B = G.map.cityBlds[c.b[0]]; if (!B || c.x < 600 || c.y < 600 || c.x > MAPW - 600 || c.y > MAPH - 600) continue; const sc = c.b.length * 3 + c.h; if (!best || sc > best.sc) best = { c, sc }; }
      const c = best.c; window.__c = c; const us = []; for (let i = 0; i < 4; i++) { const u = addUnit(0, 'inf', c.x + 30, c.y + 30); enterGarrison(u, c); }
      cam.dist = cam.td = 190; cam.x = cam.tx = c.x; cam.y = cam.ty = c.y + 40; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      window.__st = dt => { G.t += dt; G.alpha = 1; placeCam(); syncScene(dt); fxUpdate(dt); realTick(dt); };
      for (let k = 0; k < 40; k++) __st(1 / 60);
      return { x: c.x, y: c.y, h: c.h, n: c.b.length };
    });
    console.log('garrison cell', JSON.stringify(info));
    await page.evaluate(() => { const c = __c; for (let k = 0; k < 30; k++) { if (k % 5 === 0) FXH.muz(c.x | 0, c.y | 0, 8, 0.2 + (k % 3) * .15, 13); __st(1 / 60); } });
    await shot('intact');
    await page.evaluate(() => { const c = __c; c.g.hp = c.g.max * .4; for (let k = 0; k < 90; k++) { if (k % 7 === 0) FXH.muz(c.x | 0, c.y | 0, 8, 0.1 + (k % 4) * .5, 13); __st(1 / 60); } });
    await aim(...await page.evaluate(() => [__c.x, __c.y]));
    await shot('damaged');
    await page.evaluate(() => { const c = __c; c.g.hp = c.g.max * .15; cam.dist = cam.td = 120; for (let k = 0; k < 60; k++) { if (k % 5 === 0) FXH.muz(c.x | 0, c.y | 0, 8, 0.6 + (k % 4) * 1.4, 13); __st(1 / 60); } });
    await aim(...await page.evaluate(() => [__c.x, __c.y]));
    await shot('burning');
  },
  async town() {
    await page.evaluate(() => {
      G.ents = G.ents.filter(e => e.isB); let best = null;
      for (const c of G.civ) { if (c.dead || c.ruin) continue; let n = 0; for (const d of G.civ) if (!d.dead && !d.ruin && Math.hypot(d.x - c.x, d.y - c.y) < 220) n++; if (!best || n > best.n) best = { c, n }; }
      const c = best.c; window.__c = c; cam.dist = cam.td = 330; cam.x = cam.tx = c.x; cam.y = cam.ty = c.y + 60; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      window.__st = dt => { G.t += dt; G.alpha = 1; placeCam(); syncScene(dt); fxUpdate(dt); realTick(dt); };
      for (let k = 0; k < 600; k++) __st(1 / 30);
    });
    console.log('civ', JSON.stringify(await page.evaluate(() => [RE.civ.length, RE.cars.length])));
    await shot('calm');
    await page.evaluate(() => { for (let k = 0; k < 60; k++) { reMuz(__c.x + 40 + (k % 7) * 6, __c.y - 20, 0); __st(1 / 30); } });
    console.log('civ', JSON.stringify(await page.evaluate(() => [RE.civ.length, RE.cars.length, RE.dark.toFixed(2), RE.civ.filter(p => p.fl).length])));
    await shot('fleeing');
  },
  async battle() {
    const info = await page.evaluate(() => {
      G.paused = false; G.ents.filter(e => !e.isB).length; window.__st = dt => { G.alpha = 1; placeCam(); syncScene(dt); fxUpdate(dt); realTick(dt); };
      const t0 = performance.now(); let n = 0;
      while (G.t < 330 && performance.now() - t0 < 380000) { simUpdate(1 / 15); if (++n % 6 === 0) { fxUpdate(1 / 15); } if (G.over) break; }
      // camera on the thickest fight
      let best = null; for (const e of G.ents) { if (e.dead || e.isB) continue; let c = 0; for (const o of G.ents) if (!o.dead && !o.isB && o.team !== e.team && Math.abs(o.x - e.x) < 200 && Math.abs(o.y - e.y) < 200) c++; if (!best || c > best.c) best = { e, c }; }
      const e = best ? best.e : G.ents[0]; cam.dist = cam.td = 420; cam.x = cam.tx = e.x; cam.y = cam.ty = e.y + 30; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      return { t: G.t | 0, units: G.ents.filter(e => !e.isB).length, wrecks: WRECKS.length, bodies: BODIES.length, fx: [e.x | 0, e.y | 0] };
    });
    console.log('battle', JSON.stringify(info));
    await page.evaluate(() => { G.paused = true; for (let k = 0; k < 20; k++) __st(1 / 60); });
    await shot('scarred');
    await page.evaluate(() => { cam.dist = cam.td = 170; for (let k = 0; k < 20; k++) __st(1 / 60); });
    await shot('close');
  },
  async scars() {
    await page.evaluate(() => {
      G.ents = G.ents.filter(e => e.isB); const [bx, by] = BASES[0]; const x0 = Math.max(800, Math.min(MAPW - 800, bx + 300)), y0 = Math.max(800, Math.min(MAPH - 800, by + 100));
      window.__st = dt => { G.t += dt; G.alpha = 1; placeCam(); syncScene(dt); fxUpdate(dt); realTick(dt); };
      cam.dist = cam.td = 330; cam.x = cam.tx = x0; cam.y = cam.ty = y0; cam._xl = cam.x; cam._yl = cam.y; cam._dl = cam.dist;
      const tk = [], inf = []; for (let i = 0; i < 7; i++) { const u = addUnit(1, 'tank', x0 - 120 + i * 40, y0 + (i % 2) * 50 - 25); u.va = u.ang = 0.5; tk.push(u); }
      for (let i = 0; i < 24; i++) { const u = addUnit(0, 'inf', x0 - 140 + (i % 8) * 28, y0 - 70 + (i / 8 | 0) * 40); inf.push(u); }
      for (let k = 0; k < 60; k++) __st(1 / 60);
      for (let k = 0; k < 140; k++) { boomFX(x0 + (Math.random() - .5) * 420, y0 + (Math.random() - .5) * 220, 14 + Math.random() * 22, false, 5); if (k % 3 === 0) track(x0 - 200 + k * 3, y0 + 100, 0); }
      for (const u of tk) kill(u, 0, null); for (let i = 0; i < inf.length; i += 2) kill(inf[i], 1, null);
      for (let k = 0; k < 400; k++) __st(1 / 60);
      return null;
    });
    await shot('wide'); await page.evaluate(() => { cam.dist = cam.td = 170; for (let k = 0; k < 10; k++) __st(1 / 60); }); await shot('close');
  },
};
await SC[SCENE](); await browser.close(); server.close(); console.log(errs.slice(0, 5).join('\n') || 'no errors');
