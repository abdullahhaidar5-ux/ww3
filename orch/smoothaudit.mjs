// Smoothness audit (Abdullah 2026-11-17 "audit the game for smoothness. Ensure the game runs smoothly").
// Not a gate: a measuring tool that says WHERE the time goes, with a CPU sampling profile, so the biggest causes can be fixed one
// by one. Report: orch/reports/smoothaudit.md. Headless Chromium draws with software GL, so draw commands are swallowed (three.js
// still counts calls/triangles) and only the game's own CPU work per frame is timed - compare relative numbers, never absolute.
//   node orch/smoothaudit.mjs [big,duel,menu]   FRAMES=90 SIMT=300 MIN=2 EXTRA=40 TOP=25 JSON=orch/out/smoothaudit.json
// big  = 8 players on Fulda (same battle as gate/smooth-pc: 2 game-minutes, then two huge columns meet, ~300+ units)
// duel = a 2-player Battle map, same recipe with fewer columns
// menu = the main menu standing still (its own animation loop) for 8 s
// Per scene: frame ms (avg / p50 / 1%-low), sim ms per tick and per unit, draw calls, triangles, programs, textures, geometries,
// heap growth, DOM mutations / forced layouts / 2D canvas calls per frame, and the top functions by self time (sim and frame).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
const E = process.env, FRAMES = +(E.FRAMES || 90), SIMT = +(E.SIMT || 300), MIN = +(E.MIN || 2), EXTRA = +(E.EXTRA || 40), TOP = +(E.TOP || 25);
const SCENES = (process.argv[2] || 'big,duel,range,menu').split(',');   // also m:<mission id> (pass, supply, fortress, town, finale, marsh)
try { const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs')); await acquireBrowserLock('smoothaudit'); } catch {}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webp': 'image/webp', '.ogg': 'audio/ogg' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const T0 = Date.now(), LOG = m => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${m}`);
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r1 = x => Math.round(x * 10) / 10;
// counters installed before the page runs: forced layouts, DOM mutations, 2D canvas calls, audio decodes
const COUNT = () => { const c = window.__ac = { lay: 0, mut: 0, c2d: 0, aud: 0, inner: 0, layS: {} };
  const wrap = (P, n, f) => { if (!P || !P[n]) return; const o = P[n]; P[n] = function () { try { f.apply(this, arguments); } catch (e) {} return o.apply(this, arguments); }; };
  const lay = function () { c.lay++; if (window.__stk) { const s = new Error().stack.split('\n')[3] || ''; const k = s.trim().replace(/\(?http[^)]*:(\d+):\d+\)?/, 'L$1'); c.layS[k] = (c.layS[k] || 0) + 1; } };
  wrap(Element.prototype, 'getBoundingClientRect', lay); wrap(window, 'getComputedStyle', lay);
  for (const p of ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft', 'clientWidth', 'clientHeight', 'scrollHeight']) { const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, p) || Object.getOwnPropertyDescriptor(Element.prototype, p); if (d && d.get) { const g = d.get; Object.defineProperty(d === Object.getOwnPropertyDescriptor(HTMLElement.prototype, p) ? HTMLElement.prototype : Element.prototype, p, { configurable: true, get() { lay(); return g.call(this); } }); } }
  const ih = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'); if (ih) Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, get: ih.get, set(v) { c.inner++; return ih.set.call(this, v); } });
  for (const fn of ['fillText', 'drawImage', 'fill', 'stroke', 'fillRect', 'arc', 'putImageData', 'getImageData']) wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, fn, () => c.c2d++);
  for (const A of [window.AudioContext, window.OfflineAudioContext]) if (A) wrap(A.prototype, 'decodeAudioData', () => c.aud++);
  for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) if (P) for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { const o = P[fn]; if (o) P[fn] = function () { if (!window.__noDraw) return o.apply(this, arguments); }; }
  try { new MutationObserver(l => { c.mut += l.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); } catch (e) {}
};
// sampling profile -> top functions by self time (ms), plus total time of selected functions (inclusive)
function summarize(prof, ms) {
  const nodes = new Map(); for (const n of prof.nodes) nodes.set(n.id, n);
  const dt = prof.timeDeltas, samples = prof.samples, self = new Map(); const tot = s => s;
  for (let i = 0; i < samples.length; i++) { const d = (dt[i + 1] !== undefined ? dt[i + 1] : 0) / 1000; self.set(samples[i], (self.get(samples[i]) || 0) + d); }
  const parent = new Map(); for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const key = n => (n.callFrame.functionName || '(anon)') + (n.callFrame.url ? ':' + (n.callFrame.lineNumber + 1) : '');
  const selfBy = {}, incBy = {}; let all = 0;
  for (const [id, t] of self) { const n = nodes.get(id); all += t; const k = key(n); selfBy[k] = (selfBy[k] || 0) + t;
    const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const kk = key(nodes.get(q)); if (seen.has(kk)) continue; seen.add(kk); incBy[kk] = (incBy[kk] || 0) + t; } }
  const top = (o) => Object.entries(o).filter(([k]) => !/^\((root|program|idle)\)$/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, v]) => [k, r1(v), r1(v / Math.max(1e-9, all) * 100)]);
  return { totalMs: r1(all), self: top(selfBy), inclusive: top(incBy) };
}
async function battle(page, cdp, scene) {
  const two = scene === 'duel', range = scene === 'range', mis = scene.startsWith('m:') ? scene.slice(2) : null;
  if (range) await page.evaluate(() => { try { initAudio(); } catch (e) {} const mp = typeof BM_KEYS !== 'undefined' ? BM_KEYS.find(k => MAPS[k] && MAPS[k].min <= 2 && MAPS[k].max >= 2) : setup.map; startSandbox({ p: 'IR', a: 'US', map: mp }); });
  else if (mis) await page.evaluate((id) => { startCampaign(id, 1); }, mis);
  else await page.evaluate(([two]) => { setup.n = two ? 1 : 7; if (!two) setup.map = 'fulda'; else { const k = (typeof BM_KEYS !== 'undefined' ? BM_KEYS : Object.keys(MAPS)).find(k => MAPS[k] && MAPS[k].max === 2) || setup.map; setup.map = k; } setup.seed = 3;
    const MR = Math.random; let z = 3 * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
    try { startSingle(); } finally { Math.random = MR; } if (G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1); }, [two]);
  const tl = Date.now(); await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 250 }); const loadS = (Date.now() - tl) / 1000;
  const map = await page.evaluate(() => G.mapKey + ' ' + MAPW + 'x' + MAPH); LOG(scene + ': loaded ' + map + ' in ' + loadS.toFixed(0) + ' s');
  await page.evaluate(() => { window.__stopLoop = true; }); await page.waitForTimeout(300);
  if (!range) for (let t = 0; t < (mis ? 40 : MIN * 60); t += 30) await page.evaluate(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
  if (range) await page.evaluate(() => { // Test range mass spawn: 150 per side in two blocks that meet (+ a few jets/helicopters/drones), then one general's power
    const cx = MAPW / 2, cy = MAPH / 2, kinds = ['inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty', 'inf'];
    for (const T of [G.teams[0], G.teams[1]]) { const side = T.id ? 1 : -1;
      for (let i = 0; i < 150; i++) { const k = kinds[i % kinds.length]; const p = nearestPassXY('ground', cx + side * (300 + (i % 10) * 24), cy - 150 + Math.floor(i / 10) * 22) || [cx, cy];
        try { const u = addUnit(T.id, k, p[0], p[1]); if (u) setMove(u, cx - side * 400, cy, 'amove'); } catch (e) {} }
      for (const k of ['jet', 'heli', 'drone']) for (let i = 0; i < 3; i++) try { const u = addUnit(T.id, k, cx + side * 600, cy + i * 40); if (u) setMove(u, cx - side * 400, cy, 'amove'); } catch (e) {} }
    for (let i = 0; i < 240; i++) simUpdate(1 / 60); centerOn(cx, cy, true); });
  if (mis) await page.evaluate(() => { for (const e of G.ents) if (!e.isB && !e.dead && e.team === ME) { centerOn(e.x, e.y, true); break; } });
  if (!range && !mis) await page.evaluate(([extra]) => { const kinds = ['inf', 'inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty'], cx = MAPW / 2, cy = MAPH / 2;
    for (const T of G.teams) { if (T.dead || T.reb) continue; const side = T.id % 2 ? 1 : -1, lane = (Math.floor(T.id / 2) - 1.5) * 90;
      for (let i = 0; i < extra; i++) { const k = kinds[i % kinds.length]; const p = nearestPassXY('ground', cx + side * (260 + (i % 8) * 26), cy + lane + Math.floor(i / 8) * 24 - 50) || [cx, cy];
        try { const u = addUnit(T.id, k, p[0], p[1]); if (u) setMove(u, cx - side * 500, cy + lane, 'amove'); } catch (e) {} } }
    for (let i = 0; i < 420; i++) simUpdate(1 / 60);
    const C = 240, cnt = new Map(); let best = null, bn = 0;
    for (const e of G.ents) if (!e.isB && !e.dead) { const k = Math.floor(e.x / C) + ',' + Math.floor(e.y / C); const n = (cnt.get(k) || 0) + 1; cnt.set(k, n); if (n > bn) { bn = n; best = k; } }
    if (best) { const [i, j] = best.split(',').map(Number); centerOn((i + .5) * C, (j + .5) * C, true); } else centerOn(cx, cy, true); }, [two ? EXTRA * 2 : EXTRA]);
  const census = await page.evaluate(() => { let u = 0, b = 0, inf = 0; for (const e of G.ents) if (!e.dead) { if (e.isB) b++; else { u++; if (e.inf || /inf|at|rpg|sniper|eng/.test(e.kind)) inf++; } } return { units: u, buildings: b, ents: G.ents.length, min: r(G.t / 60) }; function r(x) { return Math.round(x * 10) / 10; } });
  LOG(scene + ': ' + JSON.stringify(census));
  if (E.EVAL) { LOG(scene + ' EVAL: ' + JSON.stringify(await page.evaluate(E.EVAL))); if (E.EVALONLY) return { scene, census }; }
  // 1. simulation alone
  await page.evaluate(() => { if (window.gc) { gc(); } });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const sim = await page.evaluate((n) => { const a = []; for (let i = 0; i < n && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } const t = performance.now(); simUpdate(1 / 60); a.push(performance.now() - t); } let u = 0; for (const e of G.ents) if (!e.dead && !e.isB) u++; return { a, u }; }, SIMT);
  const simProf = summarize((await cdp.send('Profiler.stop')).profile);
  const simAvg = sim.a.reduce((s, x) => s + x, 0) / sim.a.length;
  // 2. whole frame (sim + render prep + UI every 12th frame like the 0.2 s timer at 60 fps + FPS HUD), draws swallowed
  await page.evaluate(() => { window.__noDraw = 1; R3.info.autoReset = false; window.__fr = [];
    window.__frame = (rec) => { const t0 = performance.now(); for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); G.alpha = 1; const t1 = performance.now();
      R3.info.reset(); try { scroll(1 / 60); } catch (e) {} renderFrame(1 / 60); const t2 = performance.now(); G.uiT = (G.uiT || 0) - 1 / 60; let ui = 0; if (G.uiT <= 0) { G.uiT = .2; updateUI(); ui = 1; } try { fpsHud(); } catch (e) {} const t3 = performance.now();
      if (rec) __fr.push({ sim: t1 - t0, ren: t2 - t1, ui: t3 - t2, all: t3 - t0, calls: R3.info.render.calls, tris: R3.info.render.triangles, u: ui }); }; });
  for (let i = 0; i < 10; i++) await page.evaluate(() => __frame(false));
  await page.evaluate(() => { if (window.gc) gc(); });
  const g0 = await page.evaluate(() => ({ heap: performance.memory.usedJSHeapSize, ac: Object.assign({}, __ac, { layS: undefined }), prog: R3.info.programs.length, tex: R3.info.memory.textures, geo: R3.info.memory.geometries }));
  await page.evaluate(() => { __ac.layS = {}; window.__stk = 1; });
  await cdp.send('Profiler.start'); const w0 = Date.now();
  for (let i = 0; i < FRAMES; i += 5) await page.evaluate(() => { for (let k = 0; k < 5; k++) __frame(true); });
  const frameProf = summarize((await cdp.send('Profiler.stop')).profile); const wall = Date.now() - w0;
  const g1 = await page.evaluate(() => ({ heap: performance.memory.usedJSHeapSize, ac: Object.assign({}, __ac, { layS: undefined }), layS: __ac.layS, prog: R3.info.programs.length, tex: R3.info.memory.textures, geo: R3.info.memory.geometries, fr: __fr, scene: (() => { let n = 0, m = 0; SCN.traverse(o => { n++; if (o.isMesh) m++; }); return { objs: n, meshes: m }; })(), qual: QUAL.lv, gfx: SET.gfx }));
  await page.evaluate(() => { window.__stk = 0; if (window.gc) gc(); }); const heapGc = await page.evaluate(() => performance.memory.usedJSHeapSize);
  const fr = g1.fr, all = fr.map(f => f.all), sorted = all.slice().sort((a, b) => b - a), low1 = sorted.slice(0, Math.max(1, Math.round(all.length / 100)));
  const per = k => r1(fr.reduce((s, f) => s + f[k], 0) / fr.length), n = fr.length;
  const worst = fr.map((f, i) => [i, f]).sort((a, b) => b[1].all - a[1].all).slice(0, 5).map(([i, f]) => ({ i, all: r1(f.all), sim: r1(f.sim), ren: r1(f.ren), ui: r1(f.ui), uiTick: f.u }));
  const layTop = Object.entries(g1.layS).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { scene, map, loadS: r1(loadS), census, sim: { avg: r1(simAvg), p95: r1(pct(sim.a, .95)), max: r1(Math.max(...sim.a)), perUnitUs: r1(simAvg / Math.max(1, sim.u) * 1000), units: sim.u, prof: simProf },
    frame: { n, avg: per('all'), p50: r1(pct(all, .5)), low1: r1(low1.reduce((s, x) => s + x, 0) / low1.length), simAvg: per('sim'), renAvg: per('ren'), uiAvg: r1(fr.filter(f => f.u).reduce((s, f) => s + f.ui, 0) / Math.max(1, fr.filter(f => f.u).length)), worst, calls: r1(pct(fr.map(f => f.calls), .5)), ktris: r1(pct(fr.map(f => f.tris), .5) / 1000), prof: frameProf },
    gl: { programs: g1.prog, newPrograms: g1.prog - g0.prog, textures: g1.tex, newTextures: g1.tex - g0.tex, geometries: g1.geo, newGeometries: g1.geo - g0.geo, scene: g1.scene, qual: g1.qual, gfx: g1.gfx },
    heap: { mb: r1(g1.heap / 1048576), growthMBperMin: r1((heapGc - g0.heap) / 1048576 / (wall / 60000)), allocMBperFrame: r1((g1.heap - g0.heap) / 1048576 / n) },
    dom: { mutPerFrame: r1((g1.ac.mut - g0.ac.mut) / n), layoutsPerFrame: r1((g1.ac.lay - g0.ac.lay) / n), innerHTMLPerFrame: r1((g1.ac.inner - g0.ac.inner) / n), c2dPerFrame: r1((g1.ac.c2d - g0.ac.c2d) / n), audioDecodes: g1.ac.aud - g0.ac.aud, layTop } };
}
async function menu(page, cdp) {
  await page.evaluate(() => { window.__noDraw = 1; });
  const g0 = await page.evaluate(() => Object.assign({}, __ac, { layS: undefined }));
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const r = await page.evaluate(() => new Promise(res => { const a = []; let last = performance.now(); const t0 = last; const f = () => { const n = performance.now(); a.push(n - last); last = n; if (n - t0 < 8000) requestAnimationFrame(f); else res(a); }; requestAnimationFrame(f); }));
  const prof = summarize((await cdp.send('Profiler.stop')).profile);
  const g1 = await page.evaluate(() => Object.assign({}, __ac, { layS: undefined })); const n = r.length;
  return { scene: 'menu', frames: n, avgGap: r1(r.reduce((s, x) => s + x, 0) / n), p95: r1(pct(r, .95)), busyMsPerFrame: r1(prof.totalMs / n), dom: { mutPerFrame: r1((g1.mut - g0.mut) / n), layoutsPerFrame: r1((g1.lay - g0.lay) / n), c2dPerFrame: r1((g1.c2d - g0.c2d) / n) }, prof };
}
const OUT = {};
for (const sc of SCENES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); await page.addInitScript(COUNT);
  await page.addInitScript(() => { let z = 12345; Math.random = () => { z = (z + 0x6D2B79F5) | 0; let t = Math.imul(z ^ (z >>> 15), 1 | z); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; try { localStorage.setItem('ww3_tut', '1'); localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
  const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 300000 }).catch(() => {});
  const cdp = await ctx.newCDPSession(page); LOG(sc + ': menu ready');
  try { OUT[sc] = sc === 'menu' ? await menu(page, cdp) : await battle(page, cdp, sc); OUT[sc].errors = errs.slice(0, 5); }
  catch (e) { OUT[sc] = { error: String(e).slice(0, 300), errors: errs.slice(0, 5) }; LOG(sc + ' FAILED ' + e); }
  const o = OUT[sc]; if (o.frame) LOG(`${sc}: frame avg ${o.frame.avg} ms (sim ${o.frame.simAvg} / render ${o.frame.renAvg} / ui tick ${o.frame.uiAvg}) 1%-low ${o.frame.low1}; sim ${o.sim.avg} ms/tick ${o.sim.perUnitUs} us/unit; calls ${o.frame.calls} ktris ${o.frame.ktris}; dom ${JSON.stringify(o.dom)}`);
  if (o.frame) { LOG('  sim self: ' + o.sim.prof.self.slice(0, 12).map(x => x[0] + ' ' + x[1]).join(' | ')); LOG('  frame self: ' + o.frame.prof.self.slice(0, 15).map(x => x[0] + ' ' + x[1]).join(' | ')); }
  if (o.prof) LOG(`menu: ${o.frames} frames, ${o.busyMsPerFrame} ms busy/frame; top ` + o.prof.self.slice(0, 10).map(x => x[0] + ' ' + x[1]).join(' | '));
  await ctx.close();
}
fs.mkdirSync(path.join(ROOT, 'orch/out'), { recursive: true }); fs.writeFileSync(E.JSON || path.join(ROOT, 'orch/out/smoothaudit.json'), JSON.stringify(OUT, null, 1));
LOG('SMOOTHAUDIT DONE'); await browser.close(); server.close(); process.exit(0);
