// Smoothness gate: does a big late-game battle stay smooth on a PC, on a phone and in online multiplayer?
// Full explanation of every number and how to re-baseline: orch/SMOOTH.md
//
//   node orch/smooth.mjs                    # all three profiles, compare with orch/smooth-baseline.json, SMOOTH PASS / FAIL
//   node orch/smooth.mjs --profile phone    # one of: pc, phone, mp
//   node orch/smooth.mjs --update-baseline  # write today's numbers as the new baseline (intended heavier/lighter change)
//   node orch/smooth.mjs --frames 120       # fewer measured frames (quicker, noisier)
//
// pc     8 players, 1600x900, High graphics, ~400 units in one big fight, night + weather if the game has them.
// phone  same battle, iPhone-12-like screen (390x844, dpr 3, touch), Low graphics, CPU throttled 4x (Emulation.setCPUThrottlingRate).
// mp     host + 2 clients (+3 computer players) through the same local stand-in for the network that mpsync.mjs uses, with
//        80 +/- 30 ms latency and 1% loss (a lost packet costs a 250 ms re-send, like a reliable WebRTC channel).
// Headless Chromium draws with SwiftShader (software GL), so GPU time is NOT real: every budget is relative to a stored
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
const OUT = path.join(ROOT, 'orch', 'out'); fs.mkdirSync(OUT, { recursive: true });
const BASEF = path.join(ROOT, 'orch', 'smooth-baseline.json');
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
const TSTART = Date.now(); const LOG = m => console.log(`[${((Date.now() - TSTART) / 1000).toFixed(0)}s] ${m}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const gcHeap = async (page) => { try { await page.evaluate(() => { if (window.gc) { gc(); gc(); } }); } catch {} };

// ============ battle profiles (pc / phone) ============
async function battleProfile(name) {
  const PHONE = name === 'phone'; LOG(name + ': launching browser');
  const browser = await chromium.launch({ executablePath: findChromium(), args: ARGS });
  try {
    const ctx = await browser.newContext(PHONE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 640, height: 360 } });
    LOG('ctx'); await guardContext(ctx); LOG('guarded');
    const page = await ctx.newPage(); LOG('page');
    await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
    page.on('console', m => { if (m.text().startsWith('SM:')) LOG(name + ' ' + m.text()); });
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200))); page.on('crash', () => errs.push('PAGE CRASHED'));
    // the same random numbers every run (units, AI, effects), so two runs of one build see the same battle
    await page.addInitScript(() => { let z = 12345; Math.random = () => { z = (z + 0x6D2B79F5) | 0; let t = Math.imul(z ^ (z >>> 15), 1 | z); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    await page.addInitScript(() => { try { localStorage.setItem('ww3_tut', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
    LOG(name + ': loading page'); await page.goto(URL0, { waitUntil: 'load', timeout: 120000 }); LOG(name + ': page loaded');
    await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
    await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
    LOG(name + ': menu ready'); const cdp = await ctx.newCDPSession(page);
    // CPU speed check (the same fixed loop every run): lets a slower/faster machine scale the CPU budgets
    const bench = await page.evaluate(() => { let best = 1e9; for (let k = 0; k < 5; k++) { const t = performance.now(); let a = 0; for (let i = 0; i < 6e6; i++) a += Math.sqrt(i) * 1.0001; best = Math.min(best, performance.now() - t); } return best; });
    // start the battle (fixed nations/seed). Loading time = startSingle until the loading screen is gone.
    const T0 = Date.now();
    const st = await page.evaluate(([gfx, seed, nightOn]) => {
      if (gfx !== 'auto') try { SET.gfx = gfx; applyGfx(); } catch (e) {}
      setup.n = 7; setup.map = 'fulda'; setup.seed = seed;
      if (nightOn) try { const i = WX.findIndex(w => /night/i.test(w.n)); if (i >= 0) { setup.w = i; } } catch (e) {}
      const MR = Math.random; let z = seed * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
      try { startSingle(); } finally { Math.random = MR; } if (G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1);
      return { n: G.teams.length, gfx: SET.gfx, wx: (typeof WX !== 'undefined' && WX[WXI] && WX[WXI].n) || '' };
    }, [PHONE ? 'low' : 'auto', 3, has('--night')]);
    { const iv = setInterval(() => page.evaluate(() => (window.LOADING ? 'LOADING ' : 'done ') + (typeof LOAD !== 'undefined' && LOAD ? JSON.stringify(LOAD).slice(0, 120) : '')).then(x => LOG(name + ': ' + x)).catch(() => {}), 20000); await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }); clearInterval(iv); }
    const loadS = (Date.now() - T0) / 1000; LOG(name + ': battle loaded in ' + loadS.toFixed(0) + 's');
    await page.evaluate(() => { window.__stopLoop = true; }); await page.waitForTimeout(300);
    for (let t = 0; t < MIN * 60; t += 30) await page.evaluate(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
    await page.evaluate((extra) => { // two huge columns that meet in the middle (as orch/columns.mjs)
      const kinds = ['inf', 'inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty'], cx = MAPW / 2, cy = MAPH / 2;
      for (const T of G.teams) { if (T.dead || T.reb) continue; const side = T.id % 2 ? 1 : -1, lane = (Math.floor(T.id / 2) - 1.5) * 90;
        for (let i = 0; i < extra; i++) { const k = kinds[i % kinds.length];
          const p = nearestPassXY('ground', cx + side * (260 + (i % 8) * 26), cy + lane + Math.floor(i / 8) * 24 - 50) || [cx, cy];
          try { const u = addUnit(T.id, k, p[0], p[1]); if (u) setMove(u, cx - side * 500, cy + lane, 'amove'); } catch (e) {} } }
      for (let i = 0; i < 420; i++) simUpdate(1 / 60);
      const C = 240, cnt = new Map(); let best = null, bn = 0; // camera on the densest patch
      for (const e of G.ents) if (!e.isB && !e.dead) { const k = Math.floor(e.x / C) + ',' + Math.floor(e.y / C); const n = (cnt.get(k) || 0) + 1; cnt.set(k, n); if (n > bn) { bn = n; best = k; } }
      if (best) { const [i, j] = best.split(',').map(Number); centerOn((i + .5) * C, (j + .5) * C, true); } else centerOn(cx, cy, true);
      window.vis = () => true; try { FOGM.visible = false; } catch (e) {}
      const uf = window.updateFog; window.updateFog = function () { uf.apply(this, arguments); try { FOGM.visible = false; } catch (e) {} };
    }, EXTRA);
    LOG(name + ': army in place'); const census = await page.evaluate(() => { let u = 0; for (const e of G.ents) if (!e.dead && !e.isB) u++; return { units: u, min: +(G.t / 3600).toFixed(1) }; });
    if (has('--scene')) { // scene census: what makes the draw calls (run: node orch/smooth.mjs --profile pc --scene)
      LOG(name + ' scene: ' + JSON.stringify(await page.evaluate(() => {
        const gl = R3.getContext(); for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) if (gl[fn]) gl[fn] = function () {};
        const vis = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
        const by = {}; let total = 0, vcount = 0; const t0 = performance.now();
        SCN.traverse(o => { total++; if (!vis(o)) return; vcount++; if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
          const m = Array.isArray(o.material) ? o.material[0] : o.material; const k = (o.isInstancedMesh ? 'I:' : o.isPoints ? 'P:' : o.isSprite ? 'S:' : o.isLine ? 'L:' : 'M:') + (o.name || (m && m.name) || (m && m.type) || '?') + (o.castShadow ? ' cs' : '') + (o.userData && o.userData.noDepth ? ' nd' : '') + (m && m.transparent ? ' tr' : '');
          by[k] = (by[k] || 0) + 1; });
        const trav = performance.now() - t0;
        const run = (sh) => { R3.info.reset(); R3.info.autoReset = false; R3.shadowMap.needsUpdate = sh; R3.render(SCN, CAM); return R3.info.render.calls; };
        const tm = f => { const t = performance.now(); for (let i = 0; i < 5; i++) f(); return +((performance.now() - t) / 5).toFixed(1); };
        let auto = 0, nAll = 0; SCN.traverse(o => { nAll++; if (o.matrixAutoUpdate) auto++; });
        const mUpd = tm(() => SCN.updateMatrixWorld(true)); const rNo = tm(() => run(false)); const rSh = tm(() => run(true));
        SCN.matrixWorldAutoUpdate = false; const rNoMat = tm(() => run(false)); SCN.matrixWorldAutoUpdate = true;
        const log = []; const rr = R3.render.bind(R3), rc = R3.clear.bind(R3); const W = f => function () { const t = performance.now(); const r = f.apply(null, arguments); log.push([f === rr ? 'render' : 'clear', (R3.getRenderTarget() && R3.getRenderTarget().width) || 0, +(performance.now() - t).toFixed(1)]); return r; };
        R3.render = W(rr); R3.clear = W(rc); renderPost(); log.length = 0; const tp = performance.now(); renderPost(); const rpT = +(performance.now() - tp).toFixed(1); R3.render = rr; R3.clear = rc;
        const a = run(false), b = run(true); R3.info.autoReset = true;
        const top = Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 6);
        return { rpT, log, total, auto, mUpd, rNo, rSh, rNoMat, vcount, travMs: +trav.toFixed(1), callsNoShadow: a, callsWithShadow: b, top };
      }), null, 0));
    }
    if (PHONE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await gcHeap(page);
    if (has('--probe')) for (let i = 0; i < 6; i++) LOG('probe frame ' + await page.evaluate(() => { const t = performance.now(); simUpdate(1 / 60); G.alpha = 1; const a = performance.now(); renderFrame(1 / 60); const b = performance.now(); R3.getContext().finish(); return [a - t, b - a, performance.now() - b, R3.info.render.calls].map(x => Math.round(x)).join('/'); }));
    if (has('--phases')) await page.evaluate(() => { window.__phases = true; });
    LOG(name + ': measuring ' + FRAMES + ' frames');
    await page.evaluate(() => {
      const now = () => performance.now(), gl = R3.getContext();
      R3.info.autoReset = false;
      // software GL needs ~8 s to rasterise one frame of this battle and says nothing about a real GPU, so the draw commands are
      // swallowed (three.js still counts calls/triangles): what is timed is everything the game's own code does per frame
      for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) if (gl[fn]) gl[fn] = function () {};
      window.__L = { sim: [], cpu: [], all: [], cl: [], tl: [], calls: 0, tris: 0 };
      // --phases: time each part of the frame (scene sync, fx, fog, post/draw submit, HUD, minimap) and keep every frame, to find what makes the spikes
      window.__P = {}; window.__cur = {};
      if (window.__phases) for (const n of ['syncScene', 'fxUpdate', 'updateFog', 'renderPost', 'drawHUD', 'drawMini', 'placeCam', 'wreckTick', 'gpuClean', 'updateUI']) { const f = window[n]; if (typeof f !== 'function') continue; window.__P[n] = [];
        window[n] = function () { const t = now(); try { return f.apply(this, arguments); } finally { window.__cur[n] = (window.__cur[n] || 0) + now() - t; } }; }
      window.__frame = (rec) => {
        const L = window.__L, t0 = now(); for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); G.alpha = 1; const t1 = now();
        R3.info.reset(); renderFrame(1 / 60); const t3 = now(), t2 = t3; /* CPU-side frame: sim + scene + command submission. Software GL cannot give real GPU time (13 s/frame here), so it is not measured */
        if (rec && window.__phases) { for (const n in window.__P) window.__P[n].push(window.__cur[n] || 0); } window.__cur = {};
        if (rec) { L.sim.push(t1 - t0); L.cpu.push(t2 - t0); L.all.push(t3 - t0); L.calls += R3.info.render.calls; L.tris += R3.info.render.triangles; L.cl.push(R3.info.render.calls); L.tl.push(R3.info.render.triangles); }
        return R3.info.programs.length;
      };
    });
    { let last = -1, same = 0; for (let i = 0; i < 12 && same < 3; i++) { const n = await page.evaluate(() => { return window.__frame(false); }); same = n === last ? same + 1 : 0; last = n; } LOG(name + ': warm-up done, ' + last + ' shaders'); }
    const prog0 = await page.evaluate(() => R3.info.programs.length);
    const heap0 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0), w0 = Date.now();
    for (let i = 0; i < 6; i++) await page.evaluate(() => window.__frame(false)); /* first frames after the warm-up still do one-off work */
    for (let i = 0; i < FRAMES; i++) { await page.evaluate(() => window.__frame(true)); if (i % 10 === 9) LOG(name + ': frame ' + (i + 1)); }
    const res = await page.evaluate(() => ({ L: window.__L, P: window.__P, newProg: 0, qual: QUAL.lv }));
    if (has('--phases')) { const fs = await import('fs'); fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true }); fs.writeFileSync(new URL('./out/smooth-frames-' + name + '.json', import.meta.url), JSON.stringify({ all: res.L.all, P: res.P })); }
    res.newProg = (await page.evaluate(() => R3.info.programs.length)) - prog0; res.heap0 = heap0; res.wall = Date.now() - w0;
    res.calls = pct(res.L.cl, .5); res.tris = pct(res.L.tl, .5); /* median: the shadow pass does not run every frame */
    await gcHeap(page);
    const heap1 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
    // one-off event hitches: the first big explosion, and switching to every other weather / night, each timed over its first 3 frames (software GL: ratio to the median frame is what counts)
    const ev = await page.evaluate(() => { const out = {}; const ft = () => { const t = performance.now(); window.__frame(false); return performance.now() - t; };
      const base = []; for (let i = 0; i < 5; i++) base.push(ft()); base.sort((a, b) => a - b); out.base = base[2];
      try { const w = screenToWorld(innerWidth / 2, innerHeight / 2) || { x: MAPW / 2, y: MAPH / 2 }; boomFX(w.x, w.y, 80, true); out.boom = Math.max(ft(), ft(), ft()); boomFX(w.x + 30, w.y, 120, true); out.boom2 = Math.max(ft(), ft(), ft()); } catch (e) { out.boomErr = String(e).slice(0, 80); }
      try { let worst = 0; const cur = WXI; for (let i = 0; i < WX.length; i++) { if (i === cur) continue; WXI = i; applyWeather(i); worst = Math.max(worst, ft(), ft(), ft()); } WXI = cur; applyWeather(cur); out.weather = worst; } catch (e) { out.wxErr = String(e).slice(0, 80); }
      return out; }).catch(e => ({ err: String(e).slice(0, 80) }));
    const L = res.L, worst = L.all.slice().sort((a, b) => b - a), nW = Math.max(1, Math.floor(L.all.length * .01));
    const avgWorst = worst.slice(0, nW).reduce((a, b) => a + b, 0) / nW;
    const heapMB = (heap1 - res.heap0) / 1048576, mins = res.wall / 60000;
    return { name, bench: r2(bench), loadS: r2(loadS), units: census.units, gameMin: census.min, wx: st.wx, gfx: st.gfx, quality: res.qual,
      frameMed: r2(pct(L.all, .5)), frameP95: r2(pct(L.all, .95)), frameP99: r2(pct(L.all, .99)), worst1Fps: r2(1000 / avgWorst),
      longFrames: L.all.filter(x => x > 50).length, cpuMed: r2(pct(L.cpu, .5)), cpuP95: r2(pct(L.cpu, .95)), cpuMax: r2(Math.max(...L.cpu)),
      simP95: r2(pct(L.sim, .95)), drawCalls: Math.round(res.calls), kTris: Math.round(res.tris / 1000), newShaders: res.newProg,
      hitchBoomX: ev.boom ? r2(ev.boom / ev.base) : 0, hitchBoom2X: ev.boom2 ? r2(ev.boom2 / ev.base) : 0, hitchWeatherX: ev.weather ? r2(ev.weather / ev.base) : 0, hitchWorstMs: r2(Math.max(ev.boom || 0, ev.boom2 || 0, ev.weather || 0)), hitchErr: ev.boomErr || ev.wxErr || ev.err || '',
      heapMB: r2(heapMB), heapMBperMin: r2(heapMB / Math.max(mins, 1e-3)), frames: FRAMES, errs: errs.slice(0, 3) };
  } finally { await browser.close(); }
}

// ============ multiplayer profile ============
// the same in-page PeerJS stand-in as orch/mpsync.mjs (BroadcastChannel between pages), plus a network model on delivery
function fakePeerShim(net) {
  if (window.__fakePeer) return; window.__fakePeer = true;
  const BC = new BroadcastChannel('ww3-smooth'), local = new Map(), conns = new Map(), pending = new Map();
  const nonce = () => Math.random().toString(36).slice(2, 12);
  const post = m => { BC.postMessage(m); setTimeout(() => onMsg(m), 0); };
  const err = (type, msg) => Object.assign(new Error(msg || type), { type });
  class Em { constructor() { this._h = {}; } on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } off(t, f) { this._h[t] = (this._h[t] || []).filter(x => x !== f); return this; }
    _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) { console.error(e); } } }
  class Conn extends Em {
    constructor(cid, owner, remote) { super(); this.cid = cid; this.owner = owner; this.peer = remote; this.open = false; this.reliable = true;
      this.serialization = 'json'; this.dataChannel = { bufferedAmount: 0 }; this.peerConnection = null; this.lastAt = 0; conns.set(cid + '@' + owner.id, this); }
    send(m) { if (!this.open) return; post({ k: 'd', cid: this.cid, to: this.peer, s: JSON.stringify(m) }); }
    close() { this._closed(true); }
    _closed(tell) { if (!conns.has(this.cid + '@' + this.owner.id)) return; conns.delete(this.cid + '@' + this.owner.id); const was = this.open; this.open = false;
      if (tell) post({ k: 'x', cid: this.cid, to: this.peer }); if (was || tell) this._emit('close'); }
  }
  class FakePeer extends Em {
    constructor(id, opts) { super(); if (typeof id === 'object') id = null; this.id = id || 'fp-' + nonce(); this.open = false; this.destroyed = false; this.disconnected = false; this.options = opts || {};
      const n = nonce(); pending.set(n, () => { pending.delete(n); if (this.destroyed) return; this.destroyed = true; this._emit('error', err('unavailable-id', 'ID "' + this.id + '" is taken')); });
      if (local.has(this.id)) { setTimeout(() => pending.get(n) && pending.get(n)(), 0); return; }
      post({ k: 'who', id: this.id, n });
      setTimeout(() => { if (!pending.has(n)) return; pending.delete(n); if (this.destroyed) return;
        if (local.has(this.id)) { this.destroyed = true; this._emit('error', err('unavailable-id')); return; }
        local.set(this.id, this); this.open = true; this._emit('open', this.id); }, 150); }
    connect(rid) { const c = new Conn(nonce(), this, rid), key = 'c' + c.cid;
      pending.set(key, () => { pending.delete(key); c.open = true; c._emit('open'); });
      setTimeout(() => { if (!pending.has(key)) return; pending.delete(key); c._closed(false); this._emit('error', err('peer-unavailable', 'Could not connect to peer ' + rid)); }, 1500);
      post({ k: 'conn', cid: c.cid, to: rid, from: this.id }); return c; }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.open = false; if (local.get(this.id) === this) local.delete(this.id);
      for (const c of [...conns.values()]) if (c.owner === this) c.close(); this._emit('close'); }
    disconnect() {} reconnect() {}
  }
  // network model: one-way delay base +/- jitter, in order per connection (a reliable channel), a "lost" packet is re-sent after rto
  const S = window.__nstats = { rx: 0, lost: 0, on: false };
  function onData(m) {
    const c = conns.get(m.cid + '@' + m.to); if (!c || !c.open) return;
    if (!S.on) { c._emit('data', JSON.parse(m.s)); return; }
    let d = net.base + (Math.random() * 2 - 1) * net.jitter; if (Math.random() < net.loss) { d += net.rto; S.lost++; }
    const at = Math.max(performance.now() + d, c.lastAt + 0.5); c.lastAt = at; S.rx++;
    setTimeout(() => { if (c.open) c._emit('data', JSON.parse(m.s)); }, Math.max(0, at - performance.now()));
  }
  function onMsg(m) {
    if (!m || typeof m !== 'object') return;
    if (m.k === 'who') { const p = local.get(m.id); if (p && !p.destroyed) post({ k: 'have', n: m.n }); }
    else if (m.k === 'have') { const f = pending.get(m.n); if (f) f(); }
    else if (m.k === 'conn') { const p = local.get(m.to); if (!p || p.destroyed) return; const c = new Conn(m.cid, p, m.from); c.open = true;
      p._emit('connection', c); post({ k: 'ack', cid: m.cid, to: m.from }); setTimeout(() => c._emit('open'), 0); }
    else if (m.k === 'ack') { const f = pending.get('c' + m.cid); if (f) f(); }
    else if (m.k === 'd') onData(m);
    else if (m.k === 'x') { const c = conns.get(m.cid + '@' + m.to); if (c) c._closed(false); }
  }
  BC.onmessage = ev => onMsg(ev.data);
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => FakePeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}

async function mpProfile() {
  const NETM = { base: 80, jitter: 30, loss: 0.01, rto: 250 };
  const browser = await chromium.launch({ executablePath: findChromium(), args: ARGS });
  const fails = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
    await guardContext(ctx, DEAD_SERVER);
    await ctx.addInitScript(fakePeerShim, NETM);
    await ctx.route('**/*', r => r.request().url().startsWith(ORIGIN) || r.request().url().startsWith('data:') || r.request().url().startsWith('blob:') ? r.continue() : r.abort());
    const open = async (tag) => {
      const page = await ctx.newPage();
      page.on('crash', () => fails.push(tag + ' page crashed'));
      page.on('pageerror', e => fails.push(`${tag} page error: ` + (e.stack || e.message).split('\n').slice(0, 2).join(' | ')));
      await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined' && typeof hostGame === 'function', null, { timeout: 120000 });
      return page;
    };
    const waitFor = (page, fn, arg, ms, what) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out waiting for ' + what); });
    LOG('mp: opening 3 pages'); const host = await open('host'), c1 = await open('client1'), c2 = await open('client2'); const clients = [c1, c2];
    await Promise.all([host, c1, c2].map(p => p.evaluate(async () => { const t0 = performance.now(); while (!MODELS.loading && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 250));
      await Promise.race([Promise.resolve(MODELS.loading), new Promise(r => setTimeout(r, 240000))]); })));
    LOG('mp: pages open'); await waitFor(host, () => !!NET.room, null, 30000, 'host network room');
    const code = await host.evaluate(async () => { try { initAudio(); } catch (e) {} setup.p = 'US';
      await Promise.race([typeof hostBrowser === 'function' ? hostBrowser() : hostGame(), new Promise(r => setTimeout(r, 20000))]); return NET.game ? NET.code : null; });
    if (!code) throw new Error('host could not open a game'); LOG('mp: lobby ' + code);
    for (const [i, c] of clients.entries()) {
      await c.evaluate(([code, f]) => { try { initAudio(); } catch (e) {} setup.p = f; joinByCode(code); }, [code, i ? 'TR' : 'RU']);
      await waitFor(host, (n) => NET.lobby && NET.lobby.length === n, i + 1, 60000, `client ${i + 1} in the lobby`);
      await waitFor(c, () => /Joined/.test(document.getElementById('mpstatus').textContent), null, 30000, `client ${i + 1} "Joined"`);
    }
    LOG('mp: clients joined'); await Promise.all([host, c1, c2].map(p => p.evaluate(() => { window.__stopLoop = true; })));
    await host.evaluate(() => { NET.tm = [0, 1, 0]; NET.ais = []; const pool = ['CN', 'IR', 'EU', 'KP', 'IN']; for (let i = 0; i < 5; i++) NET.ais.push({ f: pool[i], d: 0, tm: 1 + (i % 2) }); launchMP(); });
    for (const [p, w] of [[c1, 'client1'], [c2, 'client2']]) await waitFor(p, () => MODE === 'client' && G && G.teams && G.teams.length > 1, null, 300000, w + ' entering the battle');
    for (const [p, w] of [[host, 'host'], [c1, 'client1'], [c2, 'client2']]) await waitFor(p, () => typeof G !== 'undefined' && G && G.terrain && !window.LOADING, null, 600000, w + ' loading screen');
    LOG('mp: battle loaded on all pages'); await host.evaluate(() => { if (!G.teams[0].ai) G.teams[0].ai = mkAI(1); });
    // instrument: snapshot arrival times and order timestamps
    await Promise.all(clients.map(p => p.evaluate(() => { const o = window.applySnap; window.__snapAt = []; window.__ticks = [];
      window.applySnap = function (d) { window.__snapAt.push(Date.now()); return o.apply(this, arguments); };
      window.__snapN = 0; window.__snapMax = 0; const pp = new Map(); // client snaps: a unit jumping >12 world units in one ~16 ms tick (rubber-banding / late-snapshot pop)
      const ct = window.clientTick; window.clientTick = function (dt) { const t = performance.now(); try { return ct.apply(this, arguments); } finally { window.__ticks.push(performance.now() - t);
        for (const e of G.ents) { if (e.isB) continue; const q = pp.get(e.id); if (q) { const d = Math.hypot(e.x - q[0], e.y - q[1]); if (d > 12 && dt < .09) { window.__snapN++; if (d > window.__snapMax) window.__snapMax = d; } q[0] = e.x; q[1] = e.y; } else pp.set(e.id, [e.x, e.y]); } } };
      const da = window.doAct; window.doAct = function (a) { if (a && typeof a === 'object') a.__t = Date.now(); return da.apply(this, arguments); }; })));
    await host.evaluate(() => { window.__lat = []; const hc = window.hostCmd; window.hostCmd = function (peer, data) { if (data && data.__t) window.__lat.push(Date.now() - data.__t); return hc.apply(this, arguments); }; });
    await Promise.all([host, c1, c2].map(p => p.evaluate(() => { window.__nstats.on = true; })));
    // real-time drivers (no drawing: the three pages share one machine; each page times its own work)
    await host.evaluate(() => { window.__hd = { stop: false, steps: [], gaps: [] }; let last = performance.now(), acc = 0;
      const iv = setInterval(() => { if (window.__hd.stop) { clearInterval(iv); return; } const n = performance.now(), dt = Math.min(.1, (n - last) / 1000); last = n; acc += dt;
        const t = performance.now(); let k = 0; while (acc >= 1 / 60 && k < 4) { simUpdate(1 / 60); acc -= 1 / 60; k++; } netTick(dt); window.__hd.steps.push(performance.now() - t); }, 16); });
    await Promise.all(clients.map(p => p.evaluate(() => { window.__cd = { stop: false }; let last = performance.now();
      const iv = setInterval(() => { if (window.__cd.stop) { clearInterval(iv); return; } const n = performance.now(), dt = Math.min(.1, (n - last) / 1000); last = n; clientTick(dt); }, 16); })));
    // the clients play like people: every 2 s order their infantry to attack-move (so the order latency has samples)
    const orders = setInterval(() => { for (const [i, c] of clients.entries()) c.evaluate((i) => { try { if (!G || G.over) return; const mine = G.ents.filter(e => !e.dead && !e.isB && e.team === ME).slice(0, 6);
      if (mine.length) doAct({ t: 'go', ids: mine.map(e => e.id), x: MAPW / 2 + (Math.random() - .5) * 300, y: MAPH / 2 + (Math.random() - .5) * 300, am: 1 }); } catch (e) {} }, i).catch(() => {}); }, 2000);
    LOG('mp: playing ' + MPSECS + 's'); await sleep(MPSECS * 1000); LOG('mp: checking sync');
    clearInterval(orders);
    // stop drivers; client frame time: draw the client's screen for a short stretch (render + client tick), host stays quiet
    const hostOut = await host.evaluate(() => { window.__hd.stop = true; const s = window.__hd.steps; return { steps: s, lat: window.__lat, hostT: G.t }; });
    const cOut = [];
    for (const [i, c] of clients.entries()) {
      const o = await c.evaluate(async () => { window.__cd.stop = true; const gl = R3.getContext(); const fr = []; for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) if (gl[fn]) gl[fn] = function () {}; /* software GL: see the battle profiles */
        for (let k = 0; k < 40; k++) { const t = performance.now(); clientTick(1 / 30); renderFrame(1 / 30); gl.finish(); fr.push(performance.now() - t); if (k % 5 === 4) await new Promise(r => setTimeout(r, 0)); }
        return { snapAt: window.__snapAt, ticks: window.__ticks, frames: fr, t: G.t, lost: window.__nstats.lost, rx: window.__nstats.rx, snapN: window.__snapN, snapMax: window.__snapMax }; });
      cOut.push(o);
    }
    // desync check (same idea as mpsync's settle check): host paused, full keyframe, then everything the client's side sees must match
    let desync = [];
    for (const [i, c] of clients.entries()) {
      const CK = i + 1;
      await host.evaluate((k) => { if (NET.kf) NET.kf[k] = 0; NET.snapT = 0; NET.teamT = 0; }, CK);
      await Promise.all(clients.map(p => p.evaluate(() => { window.__nstats.on = false; })));
      await host.evaluate(() => netTick(0.1));
      for (let r = 0; r < 4; r++) { await sleep(150); await c.evaluate(async () => { clientTick(0.1); }); await host.evaluate(() => netTick(0.1)); }
      await sleep(300); await c.evaluate(() => { clientTick(0.1); });
      const H = await host.evaluate((k) => { const out = []; for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]); if (!vis) continue; out.push([e.id, e.kind, e.team, e.x, e.y, Math.round(e.hp)]); } return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits) }; }, CK);
      const C = await c.evaluate(() => ({ credits: Math.floor(G.teams[ME].credits), list: G.ents.filter(e => !e.dead && !e.gone).map(e => [e.id, e.kind, e.team, !e.isB && e.tx != null ? e.tx : e.x, !e.isB && e.ty != null ? e.ty : e.y, Math.round(e.hp)]) }));
      const cm = new Map(C.list.map(a => [a[0], a])); let miss = 0, off = 0, wrong = 0;
      for (const h of H.list) { const x = cm.get(h[0]); if (!x) { miss++; continue; } if (Math.hypot(x[3] - h[3], x[4] - h[4]) > 2) off++; if (x[2] !== h[2] || x[1] !== h[1] || Math.abs(x[5] - h[5]) > 1) wrong++; }
      const tol = Math.max(1, H.list.length * .02);
      if (miss > tol || off > tol || wrong > tol || Math.abs(H.credits - C.credits) > 1) desync.push(`client${CK}: ${miss} missing, ${off} off-position, ${wrong} mismatched of ${H.list.length}; credits host ${H.credits} client ${C.credits}`);
      await Promise.all(clients.map(p => p.evaluate(() => { window.__nstats.on = true; })));
    }
    // numbers
    const iv = []; for (const o of cOut) for (let k = 1; k < o.snapAt.length; k++) iv.push(o.snapAt[k] - o.snapAt[k - 1]);
    const ivMed = pct(iv, .5), ivMean = iv.reduce((a, b) => a + b, 0) / Math.max(1, iv.length), ivSd = Math.sqrt(iv.reduce((a, b) => a + (b - ivMean) ** 2, 0) / Math.max(1, iv.length));
    const fr = cOut.flatMap(o => o.frames), tk = cOut.flatMap(o => o.ticks);
    const bench = await host.evaluate(() => { let best = 1e9; for (let k = 0; k < 5; k++) { const t = performance.now(); let a = 0; for (let i = 0; i < 6e6; i++) a += Math.sqrt(i) * 1.0001; best = Math.min(best, performance.now() - t); } return best; });
    return { name: 'mp', bench: r2(bench), snapIntervalMed: r2(ivMed), snapIntervalP95: r2(pct(iv, .95)), snapJitterSd: r2(ivSd), snapGapMax: r2(Math.max(0, ...iv)), snaps: iv.length,
      cmdLatP50: r2(pct(hostOut.lat, .5)), cmdLatP95: r2(pct(hostOut.lat, .95)), cmds: hostOut.lat.length,
      hostTickP95: r2(pct(hostOut.steps, .95)), clientTickP95: r2(pct(tk, .95)), clientFrameMed: r2(pct(fr, .5)), clientFrameP95: r2(pct(fr, .95)),
      clientSnaps: cOut.reduce((a, o) => a + (o.snapN || 0), 0), clientSnapMax: r2(Math.max(0, ...cOut.map(o => o.snapMax || 0))), lostPackets: cOut.reduce((a, o) => a + o.lost, 0), msgs: cOut.reduce((a, o) => a + o.rx, 0), desync: desync.length, desyncInfo: desync.slice(0, 2), errs: fails.slice(0, 3) };
  } finally { await browser.close(); }
}

// ============ budgets ============
// [key, label, ratio vs baseline, absolute slack, cpuScaled?, higher-is-better?]
const BUDGETS = {
  pc: [['frameMed', 'median frame ms', 1.6, 10, 1], ['frameP95', 'p95 frame ms', 1.8, 30, 1], ['frameP99', 'p99 frame ms', 2, 60, 1], ['worst1Fps', 'worst-1% FPS', .5, 0, 1, 1],
    ['simP95', 'sim step p95 ms', 1.5, 1, 1], ['drawCalls', 'draw calls', 1.5, 60], ['kTris', 'thousand triangles', 1.5, 300], ['loadS', 'load time s', 1.6, 8, 1]],
  phone: [['frameMed', 'median frame ms', 1.6, 15, 1], ['frameP95', 'p95 frame ms', 1.8, 40, 1], ['frameP99', 'p99 frame ms', 2, 80, 1], ['worst1Fps', 'worst-1% FPS', .5, 0, 1, 1],
    ['simP95', 'sim step p95 ms', 1.5, 3, 1], ['drawCalls', 'draw calls', 1.5, 60], ['kTris', 'thousand triangles', 1.5, 300], ['loadS', 'load time s', 1.6, 8, 1]],
  mp: [['snapIntervalP95', 'snapshot interval p95 ms', 1.4, 40], ['snapJitterSd', 'snapshot jitter (std dev) ms', 1.6, 15], ['cmdLatP95', 'order latency p95 ms', 1.4, 60],
    ['clientTickP95', 'client tick p95 ms', 1.6, 6, 1], ['hostTickP95', 'host step p95 ms', 1.6, 8, 1], ['clientFrameP95', 'client frame p95 ms', 1.6, 40, 1]],
};
const ABS = { // absolute sanity limits (independent of the baseline)
  pc: r => [[r.hitchWorstMs > 1500, `one-off hitch: first explosion or a weather/night switch cost one frame %s ms (limit 1500)`.replace('%s', r.hitchWorstMs)], [Math.max(r.hitchBoomX||0, r.hitchBoom2X||0, r.hitchWeatherX||0) > 15, `one-off hitch: an explosion or weather/night switch made a frame ${Math.max(r.hitchBoomX||0, r.hitchBoom2X||0, r.hitchWeatherX||0)}x slower than normal (limit 15x)`], [r.cpuMax > 1500, `freeze: one frame spent ${r.cpuMax} ms in the game's own code (limit 1500)`], [r.heapMBperMin > 60, `JS heap grows ${r.heapMBperMin} MB/min (limit 60) - memory leak?`], [r.errs.length > 0, 'page errors: ' + r.errs.join(' | ')]],
  phone: r => [[r.hitchWorstMs > 4000, `one-off hitch: first explosion or a weather/night switch cost one frame %s ms (limit 4000)`.replace('%s', r.hitchWorstMs)], [Math.max(r.hitchBoomX||0, r.hitchBoom2X||0, r.hitchWeatherX||0) > 15, `one-off hitch: an explosion or weather/night switch made a frame ${Math.max(r.hitchBoomX||0, r.hitchBoom2X||0, r.hitchWeatherX||0)}x slower than normal (limit 15x)`], [r.cpuMax > 4000, `freeze: one frame spent ${r.cpuMax} ms in the game's own code at 4x slower CPU (limit 4000)`], [r.heapMBperMin > 60, `JS heap grows ${r.heapMBperMin} MB/min (limit 60) - memory leak?`], [r.errs.length > 0, 'page errors: ' + r.errs.join(' | ')]],
  mp: r => [[r.desync > 0, 'DESYNC: ' + r.desyncInfo.join(' ; ')], [r.snaps < 30, `only ${r.snaps} snapshots arrived on the clients (host or network stalled)`], [r.cmds < 3, `only ${r.cmds} client orders reached the host`],
    [r.snapGapMax > 2500, `a client got no snapshot for ${r.snapGapMax} ms (limit 2500)`], [r.errs.length > 0, 'errors: ' + r.errs.join(' | ')]],
};
function judge(name, r, base) {
  const bad = [];
  for (const [bad1, msg] of ABS[name](r)) if (bad1) bad.push(msg);
  if (base) {
    // a faster CPU-speed check never tightens the limits on the CI baseline: on GitHub's runners the check does not predict the frame tail (software GL, shared hosts), a lucky fast runner made the gate fail on unchanged code (2026-11-10)
    const scale = Math.max(base.__ci ? 1 : .5, Math.min(2.5, (r.bench || 1) / (base.bench || r.bench || 1)));
    for (const [key, label, ratio, slack, cpu, higher] of BUDGETS[name]) {
      const b = base[key], v = r[key]; if (typeof b !== 'number' || typeof v !== 'number') continue; const s = cpu ? scale : 1;
      if (higher) { const lim = b / s * ratio; if (v < lim) bad.push(`${label} fell to ${v} (baseline ${b}, allowed down to ${r2(lim)})`); }
      else { const lim = b * s * ratio + slack; if (v > lim) bad.push(`${label} rose to ${v} (baseline ${b}, allowed up to ${r2(lim)}; +${Math.round((v / Math.max(b, 1e-6) - 1) * 100)}%)`); }
    }
  }
  return bad;
}

const base = fs.existsSync(BASEF) ? JSON.parse(fs.readFileSync(BASEF, 'utf8')) : {};
// per-runner-class baselines: on GitHub's runners (GITHUB_ACTIONS) compare with base.ci, anywhere else with the top-level numbers (orch/SMOOTH.md)
const CI = !!process.env.GITHUB_ACTIONS, bk = (CI && base.ci) ? base.ci : base;
const results = {}, problems = [];
const t0 = Date.now();
for (const name of ['pc', 'phone', 'mp']) {
  if (!WANT.includes('all') && !WANT.includes(name)) continue;
  let r = null, bad = [];
  for (let attempt = 1; attempt <= (UPDATE ? 1 : 2); attempt++) {
    try { r = name === 'mp' ? await mpProfile() : await battleProfile(name); bad = judge(name, r, bk[name] && (bk === base.ci ? { ...bk[name], __ci: 1 } : bk[name])); }
    catch (e) { r = r || { name, errs: [] }; bad = ['could not run: ' + String(e.message || e).split('\n')[0]]; }
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${name} attempt ${attempt}: ${bad.length ? 'REGRESSED' : 'ok'}`);
    if (!bad.length) break;
    if (attempt === 1 && !UPDATE) console.log('  (re-running once to rule out noise) ' + bad.join(' | '));
  }
  results[name] = r; if (bad.length && !UPDATE) problems.push(...bad.map(b => `${name}: ${b}`));
}
fs.writeFileSync(path.join(OUT, 'smooth.json'), JSON.stringify(results, null, 1));
const f = x => x === undefined ? '-' : x;
console.log('\n                       ' + ['pc', 'phone', 'mp'].filter(n => results[n]).map(n => n.padEnd(10)).join(''));
const rows = [['units on screen', 'units'], ['load time s', 'loadS'], ['median frame ms', 'frameMed'], ['p95 frame ms', 'frameP95'], ['p99 frame ms', 'frameP99'], ['worst 1% FPS', 'worst1Fps'], ['frames >50 ms', 'longFrames'], ['first boom x median', 'hitchBoomX'], ['2nd boom x median', 'hitchBoom2X'], ['weather/night x median', 'hitchWeatherX'], ['sim step p95 ms', 'simP95'], ['draw calls', 'drawCalls'], ['k triangles', 'kTris'],
  ['heap MB/min', 'heapMBperMin'], ['snap interval p95', 'snapIntervalP95'], ['snap jitter sd', 'snapJitterSd'], ['order latency p95', 'cmdLatP95'], ['client frame p95', 'clientFrameP95'], ['client snaps', 'clientSnaps'], ['biggest snap (units)', 'clientSnapMax'], ['desyncs', 'desync']];
for (const [label, key] of rows) { if (!['pc', 'phone', 'mp'].some(n => results[n] && results[n][key] !== undefined)) continue;
  console.log(label.padEnd(23) + ['pc', 'phone', 'mp'].filter(n => results[n]).map(n => String(f(results[n][key])).padEnd(10)).join('')); }
if (UPDATE) {
  const nb = { ...base, meta: { updated: new Date().toISOString().slice(0, 10), note: 'SwiftShader (software GL) numbers: only for comparing builds. See orch/SMOOTH.md' } };
  if (CI) nb.ci = { ...(base.ci || {}) }; const tgt = CI ? nb.ci : nb;
  for (const n of Object.keys(results)) { const { errs, desyncInfo, ...keep } = results[n]; tgt[n] = keep; }
  fs.writeFileSync(BASEF, JSON.stringify(nb, null, 1) + '\n'); console.log('baseline written: ' + path.relative(ROOT, BASEF));
}
console.log(`runtime ${((Date.now() - t0) / 60000).toFixed(1)} min`);
if (!bk.pc && !UPDATE) console.log('(no baseline yet: only the absolute limits were checked)');
if (problems.length) { console.log('\nSMOOTH FAIL: ' + problems.length + ' problem(s)'); for (const p of problems) console.log('  - ' + p); }
else console.log('\nSMOOTH PASS');
server.close();
process.exit(problems.length ? 1 : 0);
