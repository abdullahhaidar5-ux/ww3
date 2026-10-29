// Graphics Phase 5 (massive columns) frame-time profiler. Boots the real game in headless Chromium, plays an 8-player
// AI battle forward to the late game, adds two huge opposing columns that meet in the middle of the map, points the
// camera at the fight and then drives frames by hand (the game's own loop is stopped), timing each part of a frame:
//   sim     one 60 Hz simulation step (simUpdate)
//   sync    syncScene: units/buildings -> 3D objects (positions, animation, health bars' 3D parts)
//   fx      fxUpdate: particles, tracers, explosions
//   fog     updateFog (runs every 0.12 s in the game; amortised here the same way)
//   render  renderPost: Three.js scene + shadow + post passes (JS side + command submission)
//   gpu     gl.finish() after the frame: what the (SwiftShader) GPU still had to do — relative only
//   hud     drawHUD + drawMini (minimap at ~30 Hz, as in the game)
// plus draw calls, triangles, shadow casters, meshes in the scene. SwiftShader numbers are only good for comparing two
// builds on the same machine.
//
//   node orch/columns.mjs                     # desktop 1280x720
//   node orch/columns.mjs --phone             # 390x844 phone emulation (touch, dpr 3) with 4x CPU throttle
//   node orch/columns.mjs --extra 40 --minutes 6 --frames 30 --shot orch/shots/columns/x.png --json out.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argN = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PHONE = process.argv.includes('--phone');
const MIN = argN('minutes', 6), EXTRA = argN('extra', 40), FRAMES = argN('frames', 30), PLAYERS = argN('players', 8);
const MAP = argS('map', 'fulda'), SHOT = argS('shot', ''), JSONOUT = argS('json', ''), SEED = argN('seed', 3);

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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(PHONE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 720 } });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
await page.addInitScript(() => { try { localStorage.setItem('ww3_tut', '1'); } catch (e) {} });
await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
const st = await page.evaluate(([n, map, seed]) => {
  setup.n = n - 1; setup.map = map; setup.seed = seed;
  // same nations every run (they are rolled with Math.random): a fixed generator just for the roll
  const MR = Math.random; let z = seed * 2654435761 >>> 0; Math.random = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
  try { startSingle(); } finally { Math.random = MR; } if (G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1);
  return { n: G.teams.length, map: G.mapKey, facs: G.teams.map(t => t.fac).join(',') };
}, [PLAYERS, MAP, SEED]);
await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 });
console.log(`${PHONE ? 'PHONE 390x844 dpr3 4x CPU' : 'DESKTOP 1280x720'}: ${st.n} players on ${st.map} (${st.facs})`);
// stop the game's own loop; we drive frames by hand from here on
await page.evaluate(() => { window.__stopLoop = true; });
await page.waitForTimeout(300);
// fast-forward to the late game (no rendering), then add the two columns
for (let t = 0; t < MIN * 60; t += 30) await page.evaluate(() => { for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
const army = await page.evaluate((extra) => {
  const kinds = ['inf', 'inf', 'inf', 'at', 'tank', 'tank', 'aa', 'arty'];
  const cx = MAPW / 2, cy = MAPH / 2; let added = 0;
  for (const T of G.teams) { if (T.dead) continue; const side = T.id % 2 ? 1 : -1, lane = (Math.floor(T.id / 2) - 1.5) * 90;
    for (let i = 0; i < extra; i++) { const k = kinds[i % kinds.length];
      const p = nearestPassXY('ground', cx + side * (260 + (i % 8) * 26), cy + lane + Math.floor(i / 8) * 24 - 50) || [cx, cy];
      try { const u = addUnit(T.id, k, p[0], p[1]); if (u) { setMove(u, cx - side * 500, cy + lane, 'amove'); added++; } } catch (e) {} } }
  return added;
}, EXTRA);
// let them close in a little and start fighting
await page.evaluate(() => { for (let i = 0; i < 420; i++) simUpdate(1 / 60); });
const census = await page.evaluate(() => { let u = 0, b = 0, inf = 0; for (const e of G.ents) { if (e.dead) continue; if (e.isB) b++; else { u++; if (isInf(e.s)) inf++; } } return { u, b, inf, t: G.t }; });
console.log(`t=${(census.t / 60).toFixed(1)} min: ${census.u} units (${census.inf} infantry squads), ${census.b} structures; +${army} column units`);
// camera on the fight
await page.evaluate(() => {
  let sx = 0, sy = 0, n = 0; const cx = MAPW / 2, cy = MAPH / 2;
  for (const e of G.ents) if (!e.isB && !e.dead && Math.hypot(e.x - cx, e.y - cy) < 600) { sx += e.x; sy += e.y; n++; }
  if (n) centerOn(sx / n, sy / n, true); else centerOn(cx, cy, true);
});
const CDP = await ctx.newCDPSession(page);
if (PHONE) await CDP.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const PROF = process.argv.includes('--cpuprofile');
if (PROF) { await CDP.send('Profiler.enable'); await CDP.send('Profiler.setSamplingInterval', { interval: 200 }); await CDP.send('Profiler.start'); }
const res = await page.evaluate(async (FR) => {
  const now = () => performance.now(), gl = R3.getContext();
  const parts = { sync: 'syncScene', fx: 'fxUpdate', fog: 'updateFog', render: 'renderPost', hud: 'drawHUD', mini: 'drawMini', wreck: 'wreckTick', city: 'buildCity', dra: 'droneAudio' };
  const acc = {}; for (const k in parts) { acc[k] = 0; const name = parts[k], f = window[name];
    window[name] = function () { const t = now(); try { return f.apply(this, arguments); } finally { acc[k] += now() - t; } }; }
  R3.info.autoReset = false;
  const frame = (log) => {
    const t0 = now(); for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); G.alpha = 1; const t1 = now();
    R3.info.reset(); renderFrame(1 / 60); const t2 = now(); gl.finish(); const t3 = now();
    if (log) { log.sim += t1 - t0; log.frame += t2 - t1; log.gpu += t3 - t2; log.calls += R3.info.render.calls; log.tris += R3.info.render.triangles; log.n++; log.all.push(t3 - t0); }
  };
  { let last = -1, same = 0; for (let i = 0; i < 60 && same < 4; i++) { frame(null); const n = R3.info.programs.length; same = n === last ? same + 1 : 0; last = n; } } // warm-up until no new shaders compile (steady state)
  for (const k in acc) acc[k] = 0;
  const prog0 = new Set(R3.info.programs);
  const L = { sim: 0, frame: 0, gpu: 0, calls: 0, tris: 0, n: 0, all: [] };
  for (let i = 0; i < FR; i++) { frame(L); if (i % 5 === 4) await new Promise(r => setTimeout(r, 0)); }
  const newProg = R3.info.programs.filter(p => !prog0.has(p)).map(p => p.name + ':' + String(p.cacheKey).slice(0, 60));
  let meshes = 0, casters = 0, skinned = 0, inst = 0, visObj = 0;
  SCN.traverseVisible(o => { if (o.isMesh || o.isPoints || o.isLine) { meshes++; if (o.castShadow) casters++; if (o.isSkinnedMesh) skinned++; if (o.isInstancedMesh) inst++; } });
  for (const o of OBJ.values()) if (o.visible) visObj++;
  const per = x => +(x / L.n).toFixed(2), s = L.all.slice().sort((a, b) => a - b);
  const out = { frames: L.n, sim: per(L.sim), frameJS: per(L.frame), gpu: per(L.gpu), total: per(L.sim + L.frame + L.gpu), p90: +s[Math.floor(s.length * .9)].toFixed(1),
    calls: Math.round(L.calls / L.n), newProg, tris: Math.round(L.tris / L.n), meshes, casters, skinned, inst, objs: OBJ.size, visObj, qual: QUAL.lv };
  for (const k in acc) out[k] = per(acc[k]);
  { // where the triangles are: per kind of unit/building, visible objects only (shadow casters are drawn twice)
    const tri = m => { const g = m.geometry; if (!g) return 0; const n = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0); return n / 3 * (m.isInstancedMesh ? m.count : 1); };
    const by = {}; const byId = new Map(G.ents.map(e => [e.id, e]));
    for (const [id, o] of OBJ) { if (!o.visible) continue; const e = byId.get(id); const k = e ? (e.isB ? 'B:' : '') + e.kind : '?';
      const b = by[k] || (by[k] = { n: 0, tri: 0, mesh: 0, cast: 0, skin: 0 }); b.n++;
      o.traverseVisible(m => { if (!m.isMesh) return; b.mesh++; b.tri += tri(m); if (m.castShadow) b.cast++; if (m.isSkinnedMesh) b.skin++; }); }
    let rest = 0, restM = 0; const inObj = new Set(); for (const o of OBJ.values()) o.traverse(m => inObj.add(m));
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(CAM.projectionMatrix, CAM.matrixWorldInverse));
    const wb = {}; SCN.updateMatrixWorld(true);
    SCN.traverseVisible(m => { if ((m.isMesh || m.isPoints) && !inObj.has(m)) { rest += tri(m); restM++;
      let top = m; while (top.parent && top.parent !== SCN) top = top.parent; const key = (top.name || top.type) + (m.isInstancedMesh ? '/inst' : '') + (m.castShadow ? '/cast' : '');
      const v = wb[key] || (wb[key] = { n: 0, tri: 0, inView: 0 }); v.n++; v.tri += tri(m);
      try { if (m.frustumCulled === false || fr.intersectsObject(m)) v.inView += tri(m); } catch (e) {} } });
    out.worldBy = Object.fromEntries(Object.entries(wb).sort((a, b) => b[1].tri - a[1].tri).slice(0, 14).map(([k, v]) => [k, { n: v.n, tri: Math.round(v.tri), inView: Math.round(v.inView) }]));
    out.byKind = Object.fromEntries(Object.entries(by).sort((a, b) => b[1].tri - a[1].tri).map(([k, v]) => [k, { ...v, tri: Math.round(v.tri) }]));
    out.world = { meshes: restM, tri: Math.round(rest) };
  }
  out.other = +(out.frameJS - out.sync - out.fx - out.fog - out.render - out.hud - out.mini - out.wreck - out.city - out.dra).toFixed(2);
  return out;
}, FRAMES);
if (PROF) { // self time per function over the measured frames (and warm-up), top 30
  const { profile } = await CDP.send('Profiler.stop'); const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n]));
  const cnt = new Map(); for (const id of profile.samples) cnt.set(id, (cnt.get(id) || 0) + 1);
  let tot = 0; for (const [id, c] of cnt) { const n = byId.get(id), f = n.callFrame, k = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + f.lineNumber; self.set(k, (self.get(k) || 0) + c); tot += c; }
  console.log('CPU profile, self time share (' + tot + ' samples):');
  for (const [k, c] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log('  ' + (100 * c / tot).toFixed(1).padStart(5) + '%  ' + k);
}
console.log('frame ms (mean):  total ' + res.total + '  p90 ' + res.p90 + '  | sim ' + res.sim + '  sync ' + res.sync + '  fx ' + res.fx + '  fog ' + res.fog +
  '  render ' + res.render + '  gpu(finish) ' + res.gpu + '  hud ' + res.hud + '  mini ' + res.mini + '  wreck ' + res.wreck + '  city ' + res.city + '  other ' + res.other);
console.log(`scene: ${res.calls} draw calls, ${(res.tris / 1000).toFixed(0)}k triangles, ${res.meshes} visible meshes (${res.casters} shadow casters, ${res.skinned} skinned, ${res.inst} instanced), ${res.visObj}/${res.objs} objects in view, quality level ${res.qual}`);
if (process.argv.includes('--census')) { console.log('world (terrain, trees, city, fx): ' + JSON.stringify(res.world)); for (const [k, v] of Object.entries(res.worldBy)) console.log('  W ' + k.padEnd(24) + JSON.stringify(v)); for (const [k, v] of Object.entries(res.byKind)) console.log('  ' + k.padEnd(12) + JSON.stringify(v)); }
if (SHOT) { fs.mkdirSync(path.dirname(path.resolve(ROOT, SHOT)), { recursive: true });
  await page.evaluate(() => { renderFrame(1 / 60); });
  await page.screenshot({ path: path.resolve(ROOT, SHOT), timeout: 180000 }); console.log('screenshot ' + SHOT); }
if (res.newProg.length) console.log('shaders compiled during the measured frames: ' + res.newProg.length + ' e.g. ' + res.newProg.slice(0, 6).join(' | '));
if (errs.length) console.log('page errors: ' + errs.slice(0, 3).join(' | '));
if (JSONOUT) fs.writeFileSync(path.resolve(ROOT, JSONOUT), JSON.stringify({ phone: PHONE, census, army, ...res }, null, 1));
await browser.close(); server.close();
