// Test range hitch check (rangefreeze, Abdullah 2026-11-17 "the game is running slow now in test range" - it stutters/freezes).
// The Test range lets a player spawn waves of every unit kind of a nation at once, fire every general's power and the Strike
// in seconds. Each of those must not freeze the game the first time it happens. For each nation (default IR,RS,US,RU,OB):
// open the Test range (startSandbox), let it settle, take a quiet stretch as the "normal frame", then
//   1. spawn a wave of 6 of every unit kind the nation can build (one kind every WAVE ms, camera on the wave),
//   2. fire every general's power the nation has on the enemy, and its Strike (built Strike Center),
// and FAIL when, after loading, (a) more than PROGMAX shader programs are linked (1: a dying helicopter's shadow can still need
// one rare variant), (b) more than TEXMAX new textures appear in one frame, (c) a frame is more than LIMIT ms longer than the
// longest quiet frame (CPU slowed CPU x), (d) an error is logged. A nation that fails is run once more and fails only if it
// fails twice (the test machine itself stalls now and then). Before the fix (7db4c80..ab83d2d): worst frames 1.2-2.6 s,
// 3-10 programs and 24 textures in one frame; after: ~150-350 ms on a 2-core sandbox, 0-1 programs, 0 textures.
// Every frame over 50 ms is printed (slowest first) with what ran in it (sim / render / ui ms, GL work, the wave or power).
// Same counting as orch/superfreeze.mjs (draw commands are swallowed: software GL needs seconds per frame).
//   node orch/rangefreeze.mjs [IR,RS,US,RU,OB]   LIMIT=300 PROGMAX=1 TEXMAX=2 CPU=2 WAVE=1500 TRIES=2 JSON=file V=1 (stacks)
//   diagnosis: PROF=1 (sampling profile + callers)  PROBE=kind [PROBEW=1] (profile building/showing one kind)  EVAL='js' (after load)
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
const E = process.env, PROGMAX = +(E.PROGMAX ?? 1), LIMIT = +(E.LIMIT || 300), TEXMAX = +(E.TEXMAX || 2), CPU = +(E.CPU || 2), WAVE = +(E.WAVE || 1500), FACS = (process.argv[2] || 'IR,RS,US,RU,OB').split(',');
await acquireBrowserLock('rangefreeze');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip', '.webp': 'image/webp', '.ogg': 'audio/ogg' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const COUNT = () => { const c = window.__glc = { sh: 0, prog: 0, tex: 0, texUp: 0, texKB: 0, buf: 0, bufKB: 0, vao: 0, read: 0, img: 0, aud: 0, cnv: 0, c2d: 0 };
  const wrap = (P, n, f) => { if (!P || !P[n]) return; const o = P[n]; P[n] = function () { try { f.apply(this, arguments); } catch (e) {} return o.apply(this, arguments); }; };
  for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) { if (!P) continue;
    wrap(P, 'compileShader', () => c.sh++); wrap(P, 'linkProgram', () => { c.prog++;  if (window.__on) (window.__progS = window.__progS || []).push(window.__ph + ' DRAWING ' + window.__cur + ' ' + (() => { try { const obj = window.__co, mat = window.__cm; let t = obj; while (t && t.parent && t.parent !== SCN) t = t.parent; let id = null; for (const [k, v] of OBJ) if (v === t) { id = k; break; } const e = id != null && G.byId.get(id); return 'top=' + (t && t.name) + ' ent=' + (e ? e.kind + '/' + G.teams[e.team].fac + (e.isB ? ' bld' : '') : id) + ' mat=' + (mat && mat.name) + ' side=' + (mat && mat.side) + ' alphaTest=' + (mat && mat.alphaTest) + ' det=' + (obj && obj.matrixWorld.determinant().toFixed(2)) + ' SRC=' + (() => { const sm = obj && (Array.isArray(obj.material) ? obj.material[0] : obj.material); return sm ? [sm.type, 'side' + sm.side, 'aT' + sm.alphaTest, 'map' + !!sm.map, 'aMap' + !!sm.alphaMap, 'tr' + sm.transparent, 'a2c' + sm.alphaToCoverage, 'disp' + !!sm.displacementMap, obj.isSkinnedMesh ? 'skin' : '', obj.isInstancedMesh ? 'inst' : '', obj.customDepthMaterial ? 'customDepth' : '', 'shSide' + sm.shadowSide, 'vc' + !!sm.vertexColors, 'morph' + !!(obj.morphTargetInfluences), 'clip' + (sm.clippingPlanes ? sm.clippingPlanes.length : 0), 'name:' + sm.name].join(' ') : 'none'; })() + ' KEY=' + (() => { try { const pp = R3.properties.get(mat); return ''; } catch (e) { return ''; } })(); } catch (e) { return String(e); } })() + ' ' + new Error().stack.split('\n').slice(3, 9).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*\//, '(')).join(' < ')); });
    wrap(P, 'createTexture', () => { c.tex++; if (window.__on) (window.__texS = window.__texS || []).push(window.__ph + ' DRAWING ' + window.__cur + ' ' + new Error().stack.split('\n').slice(3, 8).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*\//, '(')).join(' < ')); });
    wrap(P, 'createBuffer', () => c.buf++); wrap(P, 'createVertexArray', () => c.vao++); wrap(P, 'readPixels', () => c.read++);
    const up = function (t, l, i, w, h) { c.texUp++; if (window.__on) { const sa = arguments[arguments.length - 1], wd = typeof w === 'number' && typeof h === 'number' && arguments.length >= 8 ? w * h : sa && (sa.width || sa.videoWidth) ? (sa.width || sa.videoWidth) * (sa.height || sa.videoHeight) : 0, key = window.__ph.split(' ')[0] + ' ' + (sa && sa.constructor && sa.constructor.name) + ' ' + (sa && sa.width) + 'x' + (sa && sa.height) + ' ' + new Error().stack.split('\n').slice(3, 7).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*\//, '(')).join(' < '); const q = (window.__upS = window.__upS || {})[key] = (window.__upS[key] || { n: 0, kb: 0 }); q.n++; q.kb += wd * 4 / 1024; } const s = arguments[arguments.length - 1], W = typeof w === 'number' && typeof h === 'number' && arguments.length >= 8 ? w * h : s && (s.width || s.videoWidth) ? (s.width || s.videoWidth) * (s.height || s.videoHeight) : 0; c.texKB += W * 4 / 1024; };
    wrap(P, 'texImage2D', up); wrap(P, 'texImage3D', up); wrap(P, 'texSubImage2D', up); wrap(P, 'texStorage2D', function (t, l, f, w, h) { c.texUp++; c.texKB += w * h * 4 / 1024; });
    wrap(P, 'bufferData', function (t, d) { c.bufKB += (typeof d === 'number' ? d : d && d.byteLength || 0) / 1024; });
    for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { const o = P[fn]; if (o) P[fn] = function () { if (!window.__noDraw) return o.apply(this, arguments); }; } }
  wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, 'getImageData', () => c.img++);
  for (const fn of ['fillText', 'drawImage', 'fill', 'stroke']) wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, fn, () => c.c2d++);
  for (const A of [window.AudioContext, window.webkitAudioContext, window.OfflineAudioContext]) if (A) wrap(A.prototype, 'decodeAudioData', () => { c.aud++; if (window.__on) (window.__audS = window.__audS || []).push(window.__ph + ' ' + new Error().stack.split('\n').slice(2, 6).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*\//, '(')).join(' < ')); });
  window.__noDraw = 1;
  wrap(Document.prototype, 'createElement', function (n) { if (String(n).toLowerCase() === 'canvas') { c.cnv++; if (window.__on) (window.__cnvS = window.__cnvS || []).push(window.__ph + ' ' + new Error().stack.split('\n').slice(2, 7).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*\//, '(')).join(' < ')); } }); };
let bad = 0; const RES = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const fac of FACS) for (let att = 0; att < +(E.TRIES || 2); att++) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } }); const page = await ctx.newPage(); await page.addInitScript(COUNT);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSandbox === 'function', null, { timeout: 60000 });
  const T00 = Date.now(), say = m => console.log('  [' + fac + ' +' + Math.round((Date.now() - T00) / 1000) + 's] ' + m);
  await page.evaluate(([f, m]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} try { initAudio(); } catch (e) {} const a = f === 'US' ? 'IR' : 'US'; const mp = m || (typeof BM_KEYS !== 'undefined' ? BM_KEYS.find(k => MAPS[k] && MAPS[k].min <= 2 && MAPS[k].max >= 2) : setup.map); startSandbox({ p: f, a, map: mp }); }, [fac, E.MAP || null]);
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.sandbox, null, { timeout: 600000, polling: 500 }); say('range loaded (' + await page.evaluate(() => G.mapKey + '; warm-up ' + JSON.stringify(Object.assign({}, LOAD.warm || {}, { stage: undefined, slow: undefined }))) + ')');
  // per-frame breakdown: what the game's own code spent in this frame
  await page.evaluate(() => { window.__ft = {}; for (const n of ['simUpdate', 'renderFrame', 'syncScene', 'updateUI', 'netTick', 'fxTick', 'sfxBoom', 'sfx', 'playVoice', 'vcSay', 'annSay', 'addUnit', 'usePower', 'launch', 'mkUnitObj', 'buildUnit', 'unitMesh', 'cameoGet', 'cameo', 'pqRender', 'qpUpdate', 'renderSquads', 'fogTick', 'minimap', 'drawMinimap', 'hudTick', 'fpsHud', 'kcRec', 'rpRecTick', 'scroll', 'qualTick']) { const f = window[n] || (0, eval)('typeof ' + n + "==='function'?" + n + ':null'); if (!f || f.__w) continue; const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t; window.__ft[n] = (window.__ft[n] || 0) + d; const q = (window.__prof = window.__prof || {})[n] = (window.__prof[n] || { n: 0, tot: 0, max: 0 }); q.n++; q.tot += d; if (d > q.max) { q.max = d; q.ph = window.__ph; } } }; w.__w = 1; try { (0, eval)(n + '=arguments[0]'); } catch (e) {} try { window[n] = w; } catch (e) {} } });
  await page.evaluate(() => { const f = makeObj; window.__mk = []; window.makeObj = (function (e) { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t; if (d > 15 && window.__on) __mk.push(Math.round(d) + 'ms ' + (e.isB ? 'building ' : '') + e.kind); } }); });
  await page.evaluate(() => { const rb = R3.renderBufferDirect.bind(R3); R3.renderBufferDirect = function (cam, sc, geo, mat, obj) { let q = obj, nm = ''; for (let k = 0; k < 4 && q; k++, q = q.parent) if (q.name) nm = q.name + '/' + nm; window.__cur = (sc && sc.overrideMaterial ? 'OVERRIDE ' : '') + (mat && mat.type) + ' ' + (geo && geo.attributes && geo.attributes.position ? geo.attributes.position.count : 0) + 'v ' + nm + (obj && obj.isInstancedMesh ? ' inst' : '') + (obj && obj.isSkinnedMesh ? ' skin' : '') + (obj && obj.isPoints ? ' points' : ''); window.__co = obj; window.__cm = mat; return rb.apply(this, arguments); }; });
  await page.evaluate(() => { QUAL.lock = 1; window.__noDraw = 1; window.__fr = []; window.__on = 0; window.__ph = 'quiet'; let last = performance.now(), pc = Object.assign({}, __glc);
    (function loop() { const n = performance.now(), c = __glc; if (window.__on) { const d = {}; for (const k in c) if (c[k] !== pc[k]) d[k] = Math.round((c[k] - pc[k]) * 10) / 10; const ft = {}; for (const k in __ft) if (__ft[k] > 2) ft[k] = Math.round(__ft[k]);
        __fr.push({ ms: n - last, ph: window.__ph, d, ft, ents: G.ents.length, at: Math.round(n) }); if (window.__ph !== window.__phL) { window.__phL = window.__ph; (window.__phT = window.__phT || []).push([window.__ph, n]); try { performance.mark('PH ' + window.__ph); } catch (e) {} } } window.__ft = {}; pc = Object.assign({}, c); last = n; requestAnimationFrame(loop); })(); });
  const cdp = await ctx.newCDPSession(page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await sleep(+(E.SETTLE || 10000)); await page.evaluate(() => { __fr.length = 0; window.__on = 1; }); await sleep(+(E.QUIET || 4000));
  const pre = await page.evaluate(() => { const g = __fr.map(f => f.ms).sort((a, b) => a - b), r = { med: g[g.length >> 1] || 0, max: g[g.length - 1] || 0, n: g.length }; __fr.length = 0; window.__c0 = Object.assign({}, __glc); window.__p0 = R3.info.programs.length; window.__pk = new Set(R3.info.programs.map(p => p.cacheKey)); return r; });
  say('normal frame ' + Math.round(pre.med) + ' ms (quiet max ' + Math.round(pre.max) + ')');
  if (E.EVAL) { console.log('EVAL', JSON.stringify(await page.evaluate(E.EVAL)).slice(0, 4000)); await ctx.close(); break; }
  if (E.PROBE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
    await page.evaluate(() => { window.__pk = new Set(R3.info.programs.map(p => p.cacheKey)); });
    const t = E.PROBEW ? await page.evaluate(async k => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); cam.x = hq.x + 200; cam.y = hq.y + 200; for (let i = 0; i < 6; i++) addUnit(ME, k, hq.x + 200 + i * 20, hq.y + 200); const out = []; let l = performance.now(); for (let f = 0; f < 6; f++) { await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); out.push(Math.round(n - l)); l = n; } return out; }, E.PROBE)
      : await page.evaluate(k => { const out = []; for (let i = 0; i < 4; i++) { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const u = addUnit(ME, k, hq.x + 200 + i * 20, hq.y + 200); const t0 = performance.now(); const o = makeObj(u); out.push(Math.round(performance.now() - t0)); } return out; }, E.PROBE);
    const { profile } = await cdp.send('Profiler.stop'); const dt = {}; for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] || 0) + (profile.timeDeltas[i] || 0);
    const par = new Map(); for (const n of profile.nodes) for (const c of n.children || []) par.set(c, n); const tot = new Map();
    for (const n of profile.nodes) { const d = (dt[n.id] || 0) / 1000; if (!d) continue; const seen = new Set(); for (let q = n; q; q = par.get(q.id)) { const k = (q.callFrame.functionName || '(anon)') + ':' + q.callFrame.lineNumber; if (seen.has(k)) continue; seen.add(k); tot.set(k, (tot.get(k) || 0) + d); } }
    console.log('new programs: ' + JSON.stringify(await page.evaluate(() => { const L = []; SCN.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { const pp = R3.properties.get(m); const pr = pp && pp.currentProgram; if (pr && !__pk.has(pr.cacheKey)) L.push((o.name || (o.parent && o.parent.name) || o.type) + ' ' + m.type + ' ' + m.name + ' ' + (m.userData && Object.keys(m.userData).join('/')) + ' ' + pr.cacheKey.replace(/\s+/g, ' ').slice(0, 300)); } }); return [...new Set(L)]; })));
    console.log('PROBE ' + E.PROBE + ' makeObj ms: ' + t.join(' ') + '\n  inclusive:\n    ' + [...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => Math.round(v) + 'ms ' + k).join('\n    ')); await ctx.close(); break; }
  if (E.PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  // TRACE=1: a Chrome trace (every process/thread) over the waves, powers and Strike; every task over TRACEMS (150) ms is listed with
  // its process/thread, so a long frame whose time is outside the game's own code (sim/render/UI) can be pinned on what ran instead.
  let bcdp = null, trEv = [], trDone = null; if (E.TRACE) { bcdp = await browser.newBrowserCDPSession(); bcdp.on('Tracing.dataCollected', d => { for (const ev of d.value) trEv.push(ev); }); trDone = new Promise(r => bcdp.once('Tracing.tracingComplete', r));
    await bcdp.send('Tracing.start', { traceConfig: { includedCategories: ['toplevel', 'gpu', 'v8.gc', 'devtools.timeline', 'disabled-by-default-gpu.service', 'blink.user_timing', '__metadata'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
    await page.evaluate(() => { window.__tr0 = performance.timeOrigin; }); }
  const kinds = await page.evaluate(() => allUnits(G.teams[ME].fac).filter((k, i, a) => a.indexOf(k) === i && BASE[k]));
  say('waves: ' + kinds.join(' '));
  for (const k of kinds) {
    await page.evaluate(k => { window.__ph = 'wave ' + k; const T = G.teams[ME], s = stats(T.fac, k), hq = G.ents.find(e => e.team === ME && e.kind === 'hq') || { x: BASES[0][0], y: BASES[0][1] };
      const en = G.ents.find(e => e.team === 1 && e.kind === 'hq') || { x: BASES[1][0], y: BASES[1][1] }, a = Math.atan2(en.y - hq.y, en.x - hq.x), cx = hq.x + Math.cos(a) * 380, cy = hq.y + Math.sin(a) * 380;
      cam.x = cx; cam.y = cy; const ids = [];
      for (let i = 0; i < 6; i++) { const p = nearestPassXY(s.dom, cx + (i % 3) * 26 - 26, cy + (i / 3 | 0) * 26); if (!p) continue; try { const u = addUnit(ME, k, p[0], p[1]); if (u) { ids.push(u.id); try { FXE && 0; } catch (e) {} } } catch (e) { console.warn('spawn ' + k + ' ' + e.message); } }
      try { if (ids.length) doAct({ t: 'go', ids, x: en.x, y: en.y, mode: 'amove' }); } catch (e) {} }, k);
    await sleep(WAVE);
  }
  const pows = await page.evaluate(() => { const T = G.teams[ME]; T.rank = 99; T.spent = 0; for (const k of Object.keys(POWERS)) try { if (!POWERS[k].passive) buyPower(ME, k); } catch (e) {} return Object.keys(T.pw || {}); }); say('powers: ' + pows.join(' '));
  for (const k of pows) { await page.evaluate(k => { window.__ph = 'power ' + k; const T = G.teams[ME]; if (T.pw[k]) T.pw[k].cd = 0; const en = G.ents.find(e => e.team === 1 && !e.isB && !e.dead) || G.ents.find(e => e.team === 1 && !e.dead); cam.x = en.x; cam.y = en.y; try { usePower(ME, k, en.x, en.y); } catch (e) { console.warn('power ' + k + ' ' + e.message); } }, k); await sleep(2500); }
  const strike = await page.evaluate(() => { window.__ph = 'strike'; const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); let up = G.ents.find(e => e.team === ME && e.kind === 'uplink' && !e.dead); if (!up) up = addBld(ME, 'uplink', hq.x + 120, hq.y + 60, 1); if (!up) return 'no uplink'; up.built = 1; up.hp = up.max;
    for (let i = 0; i < 3; i++) { const g = addBld(ME, 'gen', hq.x - 140 - i * 50, hq.y + 120, 1); if (g) { g.built = 1; g.hp = g.max; } }
    const T = G.teams[ME]; T.charge = T.sup.charge; const en = G.ents.find(e => e.team === 1 && e.isB && !e.dead) || G.ents.find(e => e.team === 1 && !e.dead); cam.x = en.x; cam.y = en.y; window.__t0 = G.t; return T.sup.name + ' ' + (launch(ME, en.x, en.y) ? 'launched' : 'not launched'); });
  say('strike: ' + strike); await sleep(+(E.AFTER || 9000));
  let trace = null; if (bcdp) { await bcdp.send('Tracing.end'); await trDone; const TM = +(E.TRACEMS || 150), pn = {}, tn = {};
    for (const ev of trEv) if (ev.ph === 'M') { if (ev.name === 'process_name') pn[ev.pid] = ev.args.name; if (ev.name === 'thread_name') tn[ev.pid + ':' + ev.tid] = ev.args.name; }
    const long = trEv.filter(ev => ev.ph === 'X' && (ev.dur > TM * 1000 || /v8\.gc/.test(ev.cat || '') && ev.dur > 25000)).sort((a, b) => b.dur - a.dur).slice(0, +(E.TRACEN || 40));
    trace = long.map(ev => Math.round(ev.dur / 1000) + 'ms ' + (pn[ev.pid] || ev.pid) + '/' + (tn[ev.pid + ':' + ev.tid] || ev.tid) + ' ' + ev.cat + ':' + ev.name + ' @' + Math.round(ev.ts / 1000) + ' ' + JSON.stringify(ev.args || {}).slice(0, 160));
    trace.push('-- phase marks (trace ms) --', trEv.filter(ev => /^PH /.test(ev.name || '') && ev.ph !== 'e').map(ev => ev.name.slice(3) + '@' + Math.round(ev.ts / 1000)).filter((v, i, a) => a.indexOf(v) === i).join(' ')); trEv = []; }
  let prof = null; if (E.PROF) { const { profile } = await cdp.send('Profiler.stop'); const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = {}; for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] || 0) + (profile.timeDeltas[i] || 0);
    for (const n of profile.nodes) { const k = (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber + (n.callFrame.url ? '@' + n.callFrame.url.split('/').pop().slice(0, 20) : ''); self.set(k, (self.get(k) || 0) + (dt[n.id] || 0) / 1000); }
    prof = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => Math.round(v) + 'ms ' + k);
    const par = new Map(); for (const n of profile.nodes) for (const c of n.children || []) par.set(c, n); const nm = n => n ? (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber : '-';
    const who = new Map(); for (const n of profile.nodes) { if (!['drawImage', 'texSubImage2D', 'texImage2D', 'bufferSubData', '(garbage collector)', 'getImageData', 'putImageData', 'fillText'].includes(n.callFrame.functionName)) continue; let q = par.get(n.id), ch = []; for (let i = 0; i < 4 && q; i++, q = par.get(q.id)) ch.push(nm(q)); const k = n.callFrame.functionName + ' < ' + ch.join(' < '); who.set(k, (who.get(k) || 0) + (dt[n.id] || 0) / 1000); }
    prof.push('-- callers --', ...[...who.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => Math.round(v) + 'ms ' + k)); }
  const r = await page.evaluate(() => { window.__on = 0; const F = __fr, c = __glc, c0 = __c0, d = {}; for (const k in c) d[k] = Math.round(c[k] - c0[k]);
    return { d, frames: F.length, max: Math.max(...F.map(f => f.ms)), progs: R3.info.programs.length - __p0, slow: F.filter(f => f.ms > 50).sort((a, b) => b.ms - a.ms).map(f => Math.round(f.ms) + 'ms @' + f.at + ' [' + f.ph + '] ents=' + f.ents + ' ' + JSON.stringify(f.ft) + ' ' + JSON.stringify(f.d)),
      byPh: Object.entries(F.reduce((o, f) => { const q = o[f.ph] = o[f.ph] || { n: 0, max: 0, over: 0 }; q.n++; q.max = Math.max(q.max, f.ms); if (f.ms > 50) q.over++; return o; }, {})).map(([k, v]) => k + ': worst ' + Math.round(v.max) + 'ms, ' + v.over + '/' + v.n + ' frames >50ms'),
      mk: window.__mk || [], pdiff: R3.info.programs.filter(p => !__pk.has(p.cacheKey)).map(p => { const A = p.cacheKey.split(','); let best = null, bd = 1e9; for (const k of __pk) { const B = k.split(','); if (B.length !== A.length || B[0] !== A[0]) continue; let d = 0; for (let q = 0; q < A.length; q++) if (A[q] !== B[q]) d++; if (d < bd) { bd = d; best = B; } } return A[0].replace(/\s+/g, ' ').slice(0, 30) + (best ? ' differs from a loaded one in ' + A.map((v, q) => v !== best[q] ? q + ':' + String(best[q]).slice(0, 20) + '->' + String(v).slice(0, 20) : null).filter(Boolean).join(' ') : ' (no loaded program of this kind)'); }), np: (() => { const L = []; SCN.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { const pp = R3.properties.get(m); const pr = pp && pp.currentProgram; if (pr && !__pk.has(pr.cacheKey)) L.push((o.name || (o.parent && o.parent.name) || o.type) + (o.isInstancedMesh ? ' inst' : '') + (o.isSkinnedMesh ? ' skin' : '') + ' ' + m.type + ' ' + (m.name || '') + ' ' + pr.cacheKey.replace(/\s+/g, ' ').slice(0, 200)); } }); return [...new Set(L)].slice(0, 12); })(), texMax: Math.max(0, ...F.map(f => Math.max(f.d.tex || 0, 0))), progS: window.__progS || [], texS: (window.__texS || []).slice(0, 30), cnvS: (window.__cnvS || []).slice(0, 20), audS: (window.__audS || []).slice(0, 20),
      prof: Object.entries(window.__prof || {}).sort((a, b) => b[1].max - a[1].max).slice(0, 12).map(([k, v]) => k + ' max ' + Math.round(v.max) + 'ms (' + v.ph + ') tot ' + Math.round(v.tot) + 'ms n' + v.n) }; });
  const over = r.max - pre.max, why = [];
  if (r.d.prog > PROGMAX) why.push(`linked ${r.d.prog} shader programs after loading (max ${PROGMAX})`);
  if (r.texMax > TEXMAX) why.push(`${r.texMax} new textures in one frame (max ${TEXMAX})`);
  if (over > LIMIT) why.push(`longest frame ${Math.round(r.max)} ms is ${Math.round(over)} ms over the longest quiet frame ${Math.round(pre.max)} ms (max ${LIMIT})`);
  if (errs.length) why.push(errs.length + ' errors: ' + errs.slice(0, 3).join(' | '));
  RES[fac] = { longest: Math.round(r.max), quietMax: Math.round(pre.max), normal: Math.round(pre.med), over50: r.slow.length, frames: r.frames, programs: r.d.prog, shaders: r.d.sh, textures: r.d.tex, texKB: Math.round(r.d.texKB), bufKB: Math.round(r.d.bufKB), canvases: r.d.cnv, audioDecodes: r.d.aud, cpu: CPU };
  console.log(fac, JSON.stringify(RES[fac]));
  console.log('  by phase:\n    ' + r.byPh.join('\n    '));
  console.log('  slowest calls:\n    ' + r.prof.join('\n    '));
  if (r.slow.length) console.log('  frames >50 ms (' + r.slow.length + ', slowest first):\n    ' + r.slow.slice(0, +(E.SHOW || 25)).join('\n    '));
  if (r.mk.length) console.log('  slow 3D objects built (makeObj > 15 ms):\n    ' + r.mk.join('\n    '));
  if (r.pdiff.length) console.log('  new programs vs the nearest loaded one:\n    ' + r.pdiff.join('\n    '));
  if (r.np.length) console.log('  objects drawn with a program made after loading:\n    ' + r.np.join('\n    '));
  if (r.progS.length) console.log('  programs linked:\n    ' + r.progS.slice(0, 20).join('\n    '));
  if (E.UPS) console.log('  texture uploads by caller (count, KB):\n    ' + (await page.evaluate(() => Object.entries(window.__upS || {}).sort((a, b) => b[1].kb - a[1].kb).slice(0, 25).map(([k, v]) => v.n + 'x ' + Math.round(v.kb) + 'KB ' + k))).join('\n    '));
  if (r.texS.length && E.V) console.log('  textures made:\n    ' + r.texS.join('\n    '));
  if (r.cnvS.length && E.V) console.log('  canvases made:\n    ' + r.cnvS.join('\n    '));
  if (r.audS.length) console.log('  audio decoded:\n    ' + r.audS.join('\n    '));
  if (trace) console.log('  trace: tasks over ' + (E.TRACEMS || 150) + ' ms (any process/thread, longest first):\n    ' + trace.join('\n    '));
  if (prof) console.log('  profile (self time during waves/powers/strike):\n    ' + prof.join('\n    '));
  console.log(fac, why.length ? 'FAIL: ' + why.join('; ') : 'ok');
  await ctx.close(); if (!why.length) break;
  if (att === 0 && +(E.TRIES || 2) > 1) { console.log(fac + ': failed once - running it again (the test machine itself can stall; a real problem fails twice)'); continue; }
  bad++;
}
if (E.JSON) fs.writeFileSync(E.JSON, JSON.stringify(RES, null, 1));
console.log(bad ? 'RANGEFREEZE FAIL' : 'RANGEFREEZE PASS'); await browser.close(); server.close(); process.exit(bad ? 1 : 0);
