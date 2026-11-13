// Regression: firing a nation's superweapon strike in Conquest must not freeze the game - on a REAL graphics card.
// The test machines draw with a software renderer, which shrugs at exactly the things that stall a real GPU (compiling a
// shader, uploading a texture, building a mesh). So this gate does not only time JavaScript: it counts what the page
// asks the graphics card to do in every frame of the strike (WebGL calls are wrapped before the page loads).
// (Draw commands are swallowed after the battle has loaded - software GL needs seconds per drawn frame.)
// For each faction (default IR,RU,US): start Conquest, build an uplink, put a mixed enemy force on the target, let the
// scene settle, fire the strike in real time (launch, flight, all impacts, aftermath) and FAIL when the strike
//   (a) compiles any shader / links any program after the battle has loaded,
//   (b) creates more than TEXMAX textures or GEOMAX meshes (uploads count too), or reads pixels back
//       (sounds decoded during the strike are printed only: browsers decode them on another thread),
//   (c) has a frame more than LIMIT ms longer than the longest frame of the quiet stretch before the strike (measured
//       frame-to-frame with the CPU slowed 4x; the quiet stretch carries the test machine's own hiccups),
//   (d) logs a console error, or the launch fails. The slowest simulation/effects call is printed for diagnosis.
//   node orch/superfreeze.mjs [IR,RU,US]   LIMIT=150 TEXMAX=2 GEOMAX=6 CPU=4 SHOT=1 JSON=file (per-faction numbers)
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
const E = process.env, LIMIT = +(E.LIMIT || 150), TEXMAX = +(E.TEXMAX || 2), GEOMAX = +(E.GEOMAX || 6), CPU = +(E.CPU || 4), FACS = (process.argv[2] || 'IR,RU,US').split(',');
await acquireBrowserLock('superfreeze'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// runs before the page: counts every call that makes a real graphics card stop and work
const COUNT = () => { const c = window.__glc = { sh: 0, prog: 0, tex: 0, texUp: 0, texKB: 0, buf: 0, bufKB: 0, vao: 0, fbo: 0, read: 0, img: 0, url: 0, aud: 0, cnv: 0 };
  const wrap = (P, n, f) => { if (!P || !P[n]) return; const o = P[n]; P[n] = function () { try { f.apply(this, arguments); } catch (e) {} return o.apply(this, arguments); }; };
  for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) { if (!P) continue;
    wrap(P, 'compileShader', () => c.sh++); wrap(P, 'linkProgram', () => c.prog++); wrap(P, 'createTexture', () => c.tex++); wrap(P, 'createBuffer', () => c.buf++);
    wrap(P, 'createVertexArray', () => c.vao++); wrap(P, 'createFramebuffer', () => c.fbo++); wrap(P, 'readPixels', () => c.read++); wrap(P, 'getBufferSubData', () => c.read++);
    const up = function (t, l, i, w, h) { c.texUp++; const s = arguments[arguments.length - 1], W = typeof w === 'number' && typeof h === 'number' && arguments.length >= 8 ? w * h : s && (s.width || s.videoWidth) ? (s.width || s.videoWidth) * (s.height || s.videoHeight) : 0; c.texKB += W * 4 / 1024; };
    wrap(P, 'texImage2D', up); wrap(P, 'texImage3D', up); wrap(P, 'texStorage2D', function (t, l, f, w, h) { c.texUp++; c.texKB += w * h * 4 / 1024; }); wrap(P, 'compressedTexImage2D', () => c.texUp++);
    wrap(P, 'bufferData', function (t, d) { c.bufKB += (typeof d === 'number' ? d : d && d.byteLength || 0) / 1024; }); }
  wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, 'getImageData', () => c.img++);
  wrap(HTMLCanvasElement.prototype, 'toDataURL', () => c.url++); wrap(HTMLCanvasElement.prototype, 'toBlob', () => c.url++);
  for (const A of [window.AudioContext, window.webkitAudioContext, window.OfflineAudioContext]) if (A) wrap(A.prototype, 'decodeAudioData', () => c.aud++);
  // software GL needs seconds per drawn frame, so once the battle has loaded the draw commands themselves are swallowed (three.js still does
  // all its work: programs, textures, buffers, uniforms); what is timed per frame is everything except the pixels
  for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) if (P) for (const fn of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced', 'drawRangeElements']) { const o = P[fn]; if (o) P[fn] = function () { if (!window.__noDraw) return o.apply(this, arguments); }; }
  window.__noDraw = 1;   // (also while the battle loads: the loading warm-up draws in small pieces, which software GL needs seconds for; programs, shapes and buffers are still made)
  wrap(Document.prototype, 'createElement', function (n) { if (String(n).toLowerCase() === 'canvas') { c.cnv++; if (window.__on) (window.__cnvS = window.__cnvS || []).push(new Error().stack.split('\n').slice(2, 7).map(l => l.trim().replace(/\(?http[^)]*\//, '(')).join(' < ')); } }); };
let bad = 0; const RES = {};
for (const fac of FACS) {
  const page = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage(); await page.addInitScript(COUNT);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (/warm-up/.test(m.text())) console.log('  page: ' + m.text().slice(0, 160)); if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(([f, m]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = f; setup.mode = 'conquest'; if (m) setup.map = m; startSingle(); }, [fac, E.MAP || null]);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 }); const T0 = Date.now(), say = m => console.log('  [' + fac + ' +' + Math.round((Date.now() - T0) / 1000) + 's] ' + m); say('battle loaded');
  const info = await page.evaluate(town => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq') || G.ents.find(e => e.team === ME && e.isB);
    let up = G.ents.find(e => e.team === ME && e.kind === 'uplink'); if (!up) up = addBld(ME, 'uplink', hq.x + 120, hq.y + 60, 1); up.built = 1; up.hp = up.max;
    QUAL.lock = 1; /* the frame-rate governor follows the test machine's speed (a detail step rebuilds the picture buffers): held still, the gate measures the strike */ const T = G.teams[ME]; T.credits = 50000; T.charge = T.sup.charge; G.t = Math.max(G.t, CQ_STRIKE_MIN + 5);
    let en = G.ents.find(e => e.isB && e.team !== ME && !e.dead) || hq; if (town && G.towns && G.towns.length) { en = G.towns.slice().sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y))[0]; }
    // a mixed enemy force stands on the target, so the strike also kills many soldiers and vehicles in the same frames (wrecks, bodies, debris)
    const ET = G.teams.find(t => t.id !== ME && !t.reb && !ally(t.id, ME)); let crowd = 0;
    if (ET) for (let i = 0; i < 36; i++) { const k = ['inf', 'at', 'atk', 'jeep', 'aa', 'inf'][i % 6], a = i * 2.4, r = 30 + (i % 9) * 22; try { if (addUnit(ET.id, k, en.x + Math.cos(a) * r, en.y + Math.sin(a) * r)) crowd++; } catch (e) {} }
    // diagnosis: which object (and shader) is being drawn when the card makes a new vertex array
    { const rb = R3.renderBufferDirect.bind(R3); R3.renderBufferDirect = function (cam, sc, geo, mat, obj) { window.__cur = (sc && sc.overrideMaterial ? 'OVERRIDE ' : '') + (mat && mat.type) + ' ' + (geo && geo.type) + ' ' + (geo && geo.attributes && geo.attributes.position ? geo.attributes.position.count : 0) + 'v ' + (obj && (obj.name || (obj.parent && obj.parent.name) || '')) + (obj && obj.isInstancedMesh ? ' inst' : '') + (obj && obj.isSkinnedMesh ? ' skin' : '') + (mat && mat.userData && mat.userData.burnt ? ' burnt' : ''); return rb.apply(this, arguments); };
      const cv = WebGL2RenderingContext.prototype.createVertexArray; WebGL2RenderingContext.prototype.createVertexArray = function () { if (window.__on) (window.__vaoS = window.__vaoS || []).push((window.__t0 ? (G.t - __t0).toFixed(1) : '-') + 's ' + window.__cur); return cv.apply(this, arguments); }; }
    window.__noDraw = 1; window.__fr = []; window.__on = 0; let last = performance.now(), pc = Object.assign({}, __glc);
    (function loop() { const n = performance.now(), c = __glc; if (window.__on) { const i = R3.info, d = {}; for (const k in c) if (c[k] !== pc[k]) d[k] = Math.round((c[k] - pc[k]) * 10) / 10;
        // which shapes are new in the scene since the launch (looked at every 6th frame): named in the report when the mesh count fails
        if (window.__g0 && (__fr.length % 6) === 0) SCN.traverse(o => { const g = o.geometry; if (!g || __g0.has(g.uuid)) return; __g0.add(g.uuid); const m = Array.isArray(o.material) ? o.material[0] : o.material; let q = o, nm = ''; for (let k = 0; k < 4 && q; k++, q = q.parent) if (q.name) nm = q.name + '/' + nm;
          (window.__gnew = window.__gnew || []).push((G.t - __t0).toFixed(1) + 's ' + (g.type || 'geo') + ' ' + (g.attributes.position ? g.attributes.position.count : 0) + 'v ' + (m ? m.type : '') + (nm ? ' in ' + nm : '') + (o.isInstancedMesh ? ' instanced' : '') + (o.isPoints ? ' points' : '')); });
        __fr.push({ ms: n - last, st: G.t - (window.__t0 || G.t), p: i.programs ? i.programs.length : -1, g: i.memory.geometries, t: i.memory.textures, d }); } pc = Object.assign({}, c); last = n; requestAnimationFrame(loop); })();
    cam.x = en.x; cam.y = en.y; window.__tgt = [en.x, en.y]; return { sup: T.sup.name, working: working(ME, 'uplink'), n: T.sup.n, crowd }; }, !!E.TOWN);
  await page.evaluate(() => { window.__prof = {}; for (const n of ['bmTick', 'updStrikes', 'explode', 'megaBoom', 'boomFX', 'mslSpawn', 'mslLaunch', 'mslTrail', 'mushTick', 'sfxMega', 'sfxBoom', 'sfxLaunch', 'launch', 'simUpdate', 'renderFrame', 'updateUI', 'netTick', 'kcRec', 'rpRecTick', 'scroll', 'qualTick', 'fireTick', 'polBlast', 'collateral', 'lgBlast', 'dugBlast', 'ecBoom', 'damBlast', 'fireHit', 'applyDmg', 'physImpulse', 'opHit', 'hulkAdd', 'bfSmkAdd', 'wreck', 'wreckTick', 'chunks', 'rubble']) { const f = window[n] || (0, eval)('typeof ' + n + "==='function'?" + n + ':null'); if (!f) continue; const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t, q = window.__prof[n] = window.__prof[n] || { n: 0, tot: 0, max: 0 }; q.n++; q.tot += d; q.max = Math.max(q.max, d); } }; try { (0, eval)(n + '=arguments[0]'); } catch (e) {} try { window[n] = w; } catch (e) {} } });
  const cdp = await page.context().newCDPSession(page); if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  // settle: the scene finishes its own start-of-battle work, then a quiet stretch is the "normal frame" to compare with
  await page.waitForTimeout(+(E.SETTLE || 12000)); await page.evaluate(() => { __fr.length = 0; window.__on = 1; }); await page.waitForTimeout(+(E.QUIET || 5000));
  const pre = await page.evaluate(() => { const g = __fr.map(f => f.ms).sort((a, b) => a - b), r = { med: g[g.length >> 1] || 0, max: g[g.length - 1] || 0, n: g.length }; __fr.length = 0; window.__p0 = new Set(R3.info.programs.map(p => p.cacheKey)); window.__c0 = Object.assign({}, __glc); window.__i0 = [R3.info.programs.length, R3.info.memory.geometries, R3.info.memory.textures]; window.__g0 = new Set(); SCN.traverse(o => { if (o.geometry) __g0.add(o.geometry.uuid); }); return r; });
  say('normal frame ' + Math.round(pre.med) + ' ms; firing');
  const ok = await page.evaluate(() => { window.__t0 = G.t; return launch(ME, __tgt[0], __tgt[1]); });
  // real time, no fast-forward: launch (0 s), flight, impacts (3 s .. 3+0.28*n s) and 5 s of aftermath (smoke columns, wrecks, fires)
  const span = 3 + 0.28 * info.n + 5; await page.waitForFunction(s => G.t - window.__t0 > s, span, { timeout: 900000, polling: 500 }).catch(() => errs.push('strike did not finish in time'));
  // the player's own proof tool must work: Settings -> Performance log opens, names the graphics card and has a Copy button
  const pl = await page.evaluate(() => { try { perfOpen(); const ok = !!document.getElementById('pfCopy') && /Graphics card: \S/.test(document.getElementById('pfTxt').textContent) && !!document.getElementById('sPerf'); perfClose(true); return ok; } catch (e) { return String(e); } }); if (pl !== true) errs.push('Performance log window: ' + pl);
  if (E.SHOT) { await page.evaluate(() => { window.__noDraw = 0; }); await page.waitForTimeout(8000); }
  if (E.SHOT) await page.screenshot({ path: path.join(OUT, `superfreeze-${fac}.png`), timeout: 300000 });
  const r = await page.evaluate(() => { window.__on = 0; const F = __fr, c = __glc, c0 = __c0, d = {}; for (const k in c) d[k] = Math.round(c[k] - c0[k]); const i = R3.info;
    return { d, frames: F.length, max: Math.max(...F.map(f => f.ms)), worst: F.slice().sort((a, b) => b.ms - a.ms).slice(0, 5).map(f => Math.round(f.ms) + 'ms@' + f.st.toFixed(1) + 's ' + JSON.stringify(f.d)),
      busy: F.filter(f => f.d.sh || f.d.prog || f.d.tex || f.d.texUp || f.d.buf || f.d.read || f.d.img || f.d.url || f.d.aud || f.d.cnv).map(f => f.st.toFixed(2) + 's ' + Math.round(f.ms) + 'ms ' + JSON.stringify(f.d) + ' three geo/tex ' + f.g + '/' + f.t),
      info: [i.programs.length - __i0[0], i.memory.geometries - __i0[1], i.memory.textures - __i0[2]], newProgs: i.programs.filter(p => !__p0.has(p.cacheKey)).map(p => { const A = p.cacheKey.split(','); let best = null, bd = 1e9; for (const k of __p0) { const B = k.split(','); if (B.length !== A.length) continue; let d = 0; for (let q = 0; q < A.length; q++) if (A[q] !== B[q]) d++; if (d < bd) { bd = d; best = B; } } return A[0].replace(/\s+/g, ' ').slice(0, 24) + ' x' + p.usedTimes + (best ? ' differs from a loaded one in ' + A.map((v, q) => v !== best[q] ? q + ':' + String(best[q]).slice(0, 12) + '>' + String(v).slice(0, 12) : '').filter(Boolean).slice(0, 8).join(' ') : ' (no similar program loaded)'); }),
      gnew: window.__gnew || [], cnvS: window.__cnvS || [], vaoS: window.__vaoS || [],
      prof: Object.fromEntries(Object.entries(window.__prof || {}).map(([k, v]) => [k, [v.n, Math.round(v.tot), Math.round(v.max)]])) }; });
  const stall = Object.entries(r.prof).filter(([k]) => k !== 'renderFrame').map(([k, v]) => [k, v[2]]).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const geo = Math.max(r.d.vao, Math.ceil(r.d.buf / 3)), tex = Math.max(r.d.tex, r.d.texUp), over = r.max - pre.max, why = [];
  if (!ok) why.push('launch failed'); if (r.d.sh || r.d.prog || r.newProgs.length) why.push(`compiled ${r.d.sh} shaders / ${Math.max(r.d.prog, r.newProgs.length)} programs`);
  if (tex > TEXMAX) why.push(`${tex} new textures (max ${TEXMAX})`); if (geo > GEOMAX) why.push(`${geo} new meshes (max ${GEOMAX})`);
  if (r.d.read || r.d.img || r.d.url) why.push(`${r.d.read + r.d.img + r.d.url} pixel read-backs`);
  if (over > LIMIT) why.push(`longest frame ${Math.round(r.max)} ms is ${Math.round(over)} ms over the longest quiet frame ${Math.round(pre.max)} ms (max ${LIMIT})`);
  if (errs.length) why.push(errs.length + ' errors: ' + errs.slice(0, 3).join(' | '));
  RES[fac] = { strike: info.sup, missiles: info.n, programs: Math.max(r.d.prog, r.newProgs.length), shaders: r.d.sh, textures: tex, textureKB: Math.round(r.d.texKB), meshes: geo, bufferKB: Math.round(r.d.bufKB), readbacks: r.d.read + r.d.img + r.d.url, canvases: r.d.cnv, longestFrame: Math.round(r.max), normalFrame: Math.round(pre.med), quietMax: Math.round(pre.max), worstCall: stall[0] + ' ' + stall[1] + 'ms', cpu: CPU };
  console.log(fac, JSON.stringify(info), 'launched=' + ok, 'frames=' + r.frames, 'normal=' + Math.round(pre.med) + 'ms (quiet max ' + Math.round(pre.max) + ')', 'longest=' + Math.round(r.max) + 'ms', 'three(progs/geo/tex)=+' + r.info.join('/+'), 'gl=' + JSON.stringify(r.d));
  console.log('  worst frames:', r.worst.join(' ; ')); if (r.busy.length) console.log('  frames that made the GPU work (' + r.busy.length + '):\n    ' + r.busy.slice(0, 40).join('\n    '));
  if (geo > GEOMAX && r.gnew.length) console.log('  shapes that entered the scene during the strike (look here for the ones built or re-sent):\n    ' + r.gnew.slice(0, 30).join('\n    '));
  if (r.vaoS.length) console.log('  vertex arrays made during the strike (time, what was being drawn):\n    ' + r.vaoS.join('\n    '));
  if (r.cnvS.length) console.log('  canvases created during the strike:\n    ' + r.cnvS.join('\n    '));
  if (r.newProgs.length) console.log('  new programs:\n    ' + r.newProgs.join('\n    '));
  if (E.PROF) console.log('  prof', JSON.stringify(r.prof));
  console.log(fac, 'worst JS call (not drawing):', stall[0], stall[1] + 'ms;', why.length ? 'FAIL: ' + why.join('; ') : 'ok');
  if (why.length) bad++;
  await page.close();
}
if (E.JSON) fs.writeFileSync(E.JSON, JSON.stringify(RES, null, 1));
console.log(bad ? 'SUPERFREEZE FAIL' : 'SUPERFREEZE PASS'); await browser.close(); server.close(); process.exit(bad ? 1 : 0);
