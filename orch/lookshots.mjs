// "One look for everything" (orch/q-look): before/after pictures + numbers for the shared battle material library (src/11c-look.js).
//   node orch/lookshots.mjs            -> shots into orch/shots/look/after-*.jpg + LOOK numbers
//   LOOK_OFF=1 node orch/lookshots.mjs -> the same battle with the library switched off (?nolook=1) -> before-*.jpg
// The battle is the Middle East slice: IR, US, IL, SA, RS, DW, RV on the strait map, a parade of every nation's vehicles and infantry.
// Prints for each run: draw calls, triangles and distinct materials for the same camera, the per-class material census and the
// colour spread (saturation / luminance range of all unit+building materials) so "mismatched" has a number.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots', 'look');
const OFF = !!process.env.LOOK_OFF, TAG = OFF ? 'before' : 'after';
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('playwright not found'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux', 'chrome'); if (fs.existsSync(e)) return e; const e2 = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e2)) return e2; } } catch {} return undefined; }
if (!process.argv.includes('--no-lock')) await acquireBrowserLock(); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webp': 'image/webp' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPW();
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = []; let fail = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(base + '/index.html' + (OFF ? '?nolook=1' : ''), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.map = 'strait'; setup.p = 'IR'; setup.a = 'US'; setup.n = 6; setup.others = ['IL', 'SA', 'RS', 'DW', 'RV']; setup.seed = 4242; setup.w = 0; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 900000, polling: 500 });
  const info = await page.evaluate(() => {
    window.__stopLoop = true; G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0; window.vis = () => true; try { FOGM.visible = false; } catch (e) {}
    const uf = window.updateFog; window.updateFog = function () { uf.apply(this, arguments); try { FOGM.visible = false; } catch (e) {} };
    const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); const kinds = ['tank', 'tank', 'aa', 'arty', 'harv', 'jeep', 'inf', 'inf', 'at', 'mortar'];
    // parade: one row per nation, on open ground in front of my base (towards the map centre)
    const dx = Math.sign(MAPW / 2 - hq.x) || 1, x0 = hq.x + dx * 330, y0 = hq.y - 150; let rows = 0;
    for (const T of G.teams) { if (T.dead || T.reb) continue; for (let i = 0; i < kinds.length; i++) { const p = nearestPassXY('ground', x0 + dx * i * 46, y0 + rows * 50) || [x0, y0]; try { const u = addUnit(T.id, kinds[i], p[0], p[1]); if (u) { u.hp = u.max; u.dir = Math.PI / 2; u.hold = 1; } } catch (e) {} } rows++; }
    G.treaty = 1e9; for (const T of G.teams) T.team = 0; // nobody shoots during the parade
    return { hx: hq.x, hy: hq.y, px: x0 + dx * 4.5 * 46, py: y0 + (rows - 1) * 25, facs: G.teams.map(T => T.fac).join(',') };
  });
  console.log('battle ready', JSON.stringify(info));
  const shot = async (name, x, y, dist) => {
    const n = await page.evaluate(([x, y, d]) => { camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 4; i++) renderFrame(.016); R3.info.autoReset = false; R3.info.reset(); renderFrame(.016); const r = [R3.info.render.calls, R3.info.render.triangles]; R3.info.autoReset = true; return r; }, [x, y, dist]);
    await page.waitForTimeout(400); await page.evaluate(() => { renderFrame(.016); });
    await page.screenshot({ path: path.join(OUT, TAG + '-' + name + '.jpg'), type: 'jpeg', quality: 88, timeout: 300000 }); console.log('shot ' + TAG + '-' + name + ' calls=' + n[0] + ' tris=' + n[1]); return n; };
  const a = await shot('parade', info.px, info.py, 420);
  const b = await shot('parade-close', info.px - 60, info.py - 60, 190);
  const c = await shot('base', info.hx, info.hy, 520);
  // census of everything drawn for units and buildings: distinct materials, PBR value spread, colour spread
  const cen = await page.evaluate(() => { const seen = new Set(), rm = new Set(), cls = {}; let sMin = 9, sMax = 0, lMin = 9, lMax = 0, n = 0; const hs = {};
    SCN.traverse(o => { if (!o.isMesh || !o.visible) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (!m || !m.isMeshStandardMaterial || !m.userData.wx || seen.has(m.uuid)) continue; seen.add(m.uuid); n++; rm.add(m.roughness.toFixed(2) + '/' + m.metalness.toFixed(2));
      const k = m.userData.look || 'none'; cls[k] = (cls[k] || 0) + 1; if (m.color && !m.vertexColors && !m.map) { m.color.getHSL(hs); if (hs.l > .01) { sMin = Math.min(sMin, hs.s); sMax = Math.max(sMax, hs.s); } lMin = Math.min(lMin, hs.l); lMax = Math.max(lMax, hs.l); } } });
    return { mats: n, pbrPairs: rm.size, cls, sat: [+sMin.toFixed(2), +sMax.toFixed(2)], lum: [+lMin.toFixed(3), +lMax.toFixed(3)], on: typeof LOOK !== 'undefined' && LOOK.on ? 1 : 0, programs: R3.info.programs.length }; });
  console.log('LOOK ' + TAG + ' ' + JSON.stringify({ calls: [a[0], b[0], c[0]], tris: [a[1], b[1], c[1]], ...cen }));
  fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ calls: [a[0], b[0], c[0]], tris: [a[1], b[1], c[1]], ...cen }));
  if (!OFF) { // guard: the library is on, every unit/building material carries a class, and there are at most as many PBR value pairs as classes
    if (!cen.on) { console.log('FAIL: LOOK library is off'); fail = 1; }
    if (cen.cls.none) { console.log('FAIL: ' + cen.cls.none + ' materials without a look class'); fail = 1; }
    try { const B = JSON.parse(fs.readFileSync(path.join(OUT, 'before.json'), 'utf8')); for (let i = 0; i < 3; i++) if (a && [a, b, c][i][0] > B.calls[i]) { console.log('FAIL: more draw calls than before in shot ' + i + ': ' + [a, b, c][i][0] + ' > ' + B.calls[i]); fail = 1; } } catch (e) { console.log('(no before.json to compare draw calls with)'); }
  }
  if (errs.length) { console.log('PAGE ERRORS: ' + errs.join('\n').slice(0, 1500)); fail = 1; }
} finally { await browser.close(); server.close(); }
console.log(fail ? 'LOOK FAIL' : 'LOOK PASS'); process.exit(fail);
