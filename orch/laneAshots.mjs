// Lane A (soldiers) before/after pictures: the same Test range moment, same cameras, for the desert map bm_breakwater and the
// snowy Test range map (arctic), clear day. A row of infantry squads, one per nation (IR RS DW RV US + extra), standing still
// and facing the camera. Shots: close-up (~20 m), close-up from the side and from behind, and the normal battle camera.
//   node orch/laneAshots.mjs --tag after                       -> orch/shots/laneA/after-<map>-<shot>.jpg
//   node orch/laneAshots.mjs --tag before --html /tmp/main.html -> the same with another build of index.html
// Prints draw calls / triangles per shot (same camera), and counts see-through soldier materials (transparent or opacity<1).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = arg('--tag', 'after'), HTML = path.resolve(arg('--html', path.join(ROOT, 'index.html'))), OUT = path.resolve(arg('--out', path.join(ROOT, 'orch', 'shots', 'laneA')));
const NATS = (arg('--nats', 'IR,RS,DW,RV,US,RU')).split(','), MAPS_ = (arg('--maps', 'bm_breakwater,arctic')).split(',');
fs.mkdirSync(OUT, { recursive: true });
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright', 'playwright']) { try { return r(p); } catch {} } throw new Error('playwright not found'); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webp': 'image/webp' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = p === '/index.html' ? HTML : path.join(ROOT, p); if ((f !== HTML && !f.startsWith(ROOT)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const pw = await loadPW(); const chromium = pw.chromium || pw.default.chromium;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = {}; let fail = 0;
try {
  for (const map of MAPS_) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); const page = await ctx.newPage(); const errs = [];
    await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => typeof startSandbox === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
    await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 300000 }).catch(() => {});
    await page.evaluate(m => { setup.w = 0; setup.seed = 4242; try { localStorage.clear(); } catch (e) {} startSandbox({ p: 'IR', a: 'US', map: m }); }, map);
    await page.waitForFunction(() => typeof G !== 'undefined' && G && !window.LOADING, null, { timeout: 900000, polling: 500 });
    await page.evaluate(async N => { try { await modelsFor(N, () => {}, 600000); } catch (e) {} }, NATS);
    const info = await page.evaluate(([N, DIR]) => {
      window.__stopLoop = true; G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.fixWx = 'clear'; window.vis = () => true; try { FOGM.visible = false; } catch (e) {}
      const uf = window.updateFog; if (uf) window.updateFog = function () { uf.apply(this, arguments); try { FOGM.visible = false; } catch (e) {} };
      const hq = G.ents.find(b => b.team === ME && b.kind === 'hq') || { x: MAPW / 2, y: MAPH / 2 };
      const dx = Math.sign(MAPW / 2 - hq.x) || 1, x0 = hq.x + dx * 380, y0 = hq.y; const T = G.teams[0], f0 = T.fac; const out = [];
      for (let i = 0; i < N.length; i++) { T.fac = N[i]; const p = nearestPassXY('ground', x0 + i * 34 - (N.length - 1) * 17, y0) || [x0, y0];
        const u = addUnit(0, 'inf', p[0], p[1]); if (u) { u.hp = u.max; u.dir = u.ang = DIR; u.hold = 1; out.push([N[i], u.id]); } try { renderFrame(.016); } catch (e) {} }
      T.fac = f0; G.treaty = 1e9;
      return { x: x0, y: y0, out };
    }, [NATS, +arg('--dir', String(Math.PI / 2))]);
    console.log(map, 'ready', JSON.stringify(info));
    // see-through check: every soldier material drawn must be opaque
    const st = await page.evaluate(() => { let n = 0, bad = 0, names = []; SCN.traverse(o => { if (!o.isMesh || !(o.name === 'soldier' || o.name === 'soldierLo' || o.name === 'solBatch')) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { n++; if (m.transparent || m.opacity < 1 || m.alphaTest > 0 || m.side === 1) { bad++; names.push(o.name + ':' + (m.transparent ? 'T' : '') + (m.opacity < 1 ? 'o' + m.opacity : '') + (m.side === 1 ? 'back' : '')); } } }); return { n, bad, names: names.slice(0, 8) }; });
    console.log(map, 'soldier materials', JSON.stringify(st)); if (st.bad) fail = 1;
    const shots = [['close', 160, 0], ['close-side', 160, -Math.PI / 2], ['close-back', 160, Math.PI], ['battle', 560, 0]];
    const only = arg('--shots', ''); for (const [nm, d, yaw] of shots.filter(q => !only || only.split(',').includes(q[0]))) {
      const n = await page.evaluate(([x, y, d, yaw]) => { cam.yaw = cam.tyaw = yaw; camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 6; i++) renderFrame(.016); R3.info.autoReset = false; R3.info.reset(); renderFrame(.016); const r = [R3.info.render.calls, R3.info.render.triangles]; R3.info.autoReset = true; return r; }, [info.x, info.y, d, yaw]);
      await page.waitForTimeout(300); await page.evaluate(() => { renderFrame(.016); });
      const file = path.join(OUT, `${TAG}-${map}-${nm}.jpg`); await page.screenshot({ path: file, type: 'jpeg', quality: 88, timeout: 300000 });
      res[`${map}-${nm}`] = { calls: n[0], tris: n[1] }; console.log('shot', path.basename(file), 'calls=' + n[0], 'tris=' + n[1]);
    }
    if (errs.length) { console.log('PAGE ERRORS ' + map + ': ' + errs.join('\n').slice(0, 1500)); }
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1));
console.log(fail ? 'LANEA SHOTS FAIL (see-through soldier material)' : 'LANEA SHOTS DONE'); process.exit(fail);
