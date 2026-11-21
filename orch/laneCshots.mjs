// Lane C base-building shots: one family's base (HQ, barracks, War Factory, supply depot) on desert bm_breakwater, Clear day, normal battle camera + a closer view.
// node orch/laneCshots.mjs --html before.html --tag before --facs IR,RV   -> orch/shots/laneC/<tag>-<nation>-{battle,close}.jpg
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

const OUT = path.resolve(argS('out', path.join(ROOT, 'orch', 'shots', 'laneC')));
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
await acquireBrowserLock('laneC-shots');
fs.mkdirSync(OUT, { recursive: true });
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
async function frames(page, n) {
  return page.evaluate(n => { const gl = R3.getContext(), px = new Uint8Array(4), ts = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); renderFrame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    return ts; }, n);
}
async function snap(page, name) { await page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 85, timeout: 300000 }); console.log('saved', name, secs()); }
const FACS = argS('facs', 'IR').split(',');
const MAP = argS('map', 'bm_breakwater');
const BENCH = process.argv.includes('--bench');
try {
  const { ctx, page } = await open({ viewport: { width: 1600, height: 900 } });
  for (const f of FACS) {
    const info = await page.evaluate(async ([map, p, seed]) => {
      if (G) G.over = true;
      const wi = Math.max(0, WX.findIndex(w => /clear day/i.test(w.n)));
      Object.assign(setup, { map, n: 1, p, a: p === 'US' ? 'RU' : 'US', others: [], tm: [], slot: -1, seed, w: wi });
      const MR = Math.random; let z = seed * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296); // same battle every run (as orch/smooth.mjs)
      startSingle(); const w0 = performance.now();
      while (window.LOADING && performance.now() - w0 < 900000) await new Promise(r => setTimeout(r, 100));
      G.teams.forEach((T, i) => { T.ai = i ? mkAI(0) : null; }); G.paused = false;
      for (let i = 0; i < 600; i++) simUpdate(1 / 60);
      // a full base of this family: HQ is already there; add barracks, War Factory and supply depot beside it (built)
      const hq = G.ents.find(e => e.isB && e.team === 0 && e.kind === 'hq');
      let dx = MAPW / 2 - hq.x, dy = MAPH / 2 - hq.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const px = -dy, py = dx;
      addBld(0, 'barracks', hq.x + px * 120, hq.y + py * 120, true);
      addBld(0, 'factory', hq.x - px * 130, hq.y - py * 130, true);
      addBld(0, 'depot', hq.x + dx * 125 + px * 30, hq.y + dy * 125 + py * 30, true);
      // every other side gets the same full base too (for the --bench numbers: more of this family's kits in the scene)
      for (const h2 of G.ents.filter(e => e.isB && e.team > 0 && e.kind === 'hq')) { let ex = MAPW / 2 - h2.x, ey = MAPH / 2 - h2.y; const l2 = Math.hypot(ex, ey) || 1; ex /= l2; ey /= l2;
        addBld(h2.team, 'barracks', h2.x - ey * 120, h2.y + ex * 120, true); addBld(h2.team, 'factory', h2.x + ey * 130, h2.y - ex * 130, true); addBld(h2.team, 'depot', h2.x + ex * 125, h2.y + ey * 125, true); }
      for (let i = 0; i < 120; i++) simUpdate(1 / 60);
      for (const e of G.ents) { e.ox = e.x; e.oy = e.y; } G.alpha = 1;
      const w1 = performance.now(); while (!(MODELS && MODELS.ready) && performance.now() - w1 < 300000) await new Promise(r => setTimeout(r, 250));
      G.paused = true; Math.random = MR;
      return { map: G.mapKey, facs: G.teams.map(T => T.fac), wx: WX[WXI] && WX[WXI].n, hx: hq.x, hy: hq.y, cx: dx, cy: dy, dist: cam.dist };
    }, [MAP, f, SEED]);
    console.log(f, JSON.stringify(info), secs());
    await frames(page, 3); await page.waitForTimeout(3000); // models / textures that load on demand
    // normal battle camera (the game's own distance after start), looking at the base from its HQ toward the depot
    await page.evaluate(i => { cam.x = cam.tx = i.hx + i.cx * 50; cam.y = cam.ty = i.hy + i.cy * 50; cam._xl = cam.x; cam._yl = cam.y; cam.dist = cam.td = i.dist; cam._dl = cam.dist; }, info);
    await frames(page, 4); await page.waitForTimeout(1500); await frames(page, 2); await snap(page, `${TAG}-${f}-battle.jpg`);
    await page.evaluate(i => { cam.x = cam.tx = i.hx + i.cx * 20; cam.y = cam.ty = i.hy + i.cy * 20; cam._xl = cam.x; cam._yl = cam.y; cam.dist = cam.td = 190; cam._dl = 190; }, info);
    await frames(page, 4); await snap(page, `${TAG}-${f}-close.jpg`);
    if (BENCH) { // same scene, CPU time of the game's own frame work (draw commands swallowed like orch/smooth.mjs) + draw calls with and without the shadow pass
      const b = await page.evaluate(i => { const gl = R3.getContext(); const keep = {}; for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) if (gl[fn]) { keep[fn] = gl[fn]; gl[fn] = function () {}; }
        const out = {}; for (const [nm, d] of [['battle', i.dist], ['wide', 900]]) { cam.x = cam.tx = i.hx + i.cx * 50; cam.y = cam.ty = i.hy + i.cy * 50; cam._xl = cam.x; cam._yl = cam.y; cam.dist = cam.td = d; cam._dl = d;
          for (let k = 0; k < 5; k++) renderFrame(1 / 60); const ts = [], cl = []; for (let k = 0; k < 40; k++) { const a = performance.now(); renderFrame(1 / 60); ts.push(performance.now() - a); cl.push(R3.info.render.calls); }
          ts.sort((x, y) => x - y); R3.info.autoReset = false; R3.info.reset(); R3.shadowMap.needsUpdate = false; R3.render(SCN, CAM); const noSh = R3.info.render.calls; R3.info.reset(); R3.shadowMap.needsUpdate = true; R3.render(SCN, CAM); const withSh = R3.info.render.calls, tri = R3.info.render.triangles; R3.info.autoReset = true;
          out[nm] = { msMed: +ts[20].toFixed(2), calls: noSh, callsWithShadow: withSh, kTris: Math.round(tri / 1000) }; }
        for (const fn in keep) gl[fn] = keep[fn]; let prog = 0; try { prog = R3.info.programs.length; } catch (e) {} out.programs = prog; return out; }, info);
      console.log('BENCH ' + JSON.stringify({ tag: TAG, fac: f, ...b })); fs.appendFileSync(path.join(OUT, 'bench.jsonl'), JSON.stringify({ tag: TAG, fac: f, ...b }) + '\n');
    }
  }
  await ctx.close();
} catch (e) { console.error(e); process.exitCode = 1; }
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await browser.close(); server.close(); process.exit(process.exitCode || 0);
