// Grand map 3D smoothness gate (stage 5): draw calls, triangles and render time of the 3D campaign map at three views.
// Budgets are loose (CI renders in software); they catch regressions such as per-unit meshes or a runaway tree count.  node orch/grandsmooth.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'grand5');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} return undefined; }
await acquireBrowserLock(); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('shot skipped ' + n)); console.log('shot', n); };
const ev = (f, a) => page.evaluate(f, a);
await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
const fails = [];
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); });
if (!await ev(() => GV.g3)) fails.push('3D grand map did not start (fell back to the flat map)');
const out = [];
for (const [n, x, z, d] of [['wide', 1200, 600, 2300], ['region', 1500, 520, 1000], ['close', 1480, 560, 260]]) {
  await ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: 0, pitch: .86 }); Object.assign(G3.cc, G3.camera); G3.moved = true; }, [x, z, d]);
  await page.waitForTimeout(800);
  const r = await ev(() => { const gl = G3.R.getContext(), px = new Uint8Array(4), ts = []; for (let i = 0; i < 12; i++) { const t = performance.now(); G3.R.render(G3.sc, G3.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t); } ts.sort((a, b) => a - b); const i = G3.R.info; return { ms: Math.round(ts[6]), calls: i.render.calls, tris: i.render.triangles }; });
  out.push([n, r]); console.log('grandsmooth', n, JSON.stringify(r));
  if (r.calls > 400) fails.push(n + ': ' + r.calls + ' draw calls (budget 400)'); if (r.tris > 2000000) fails.push(n + ': ' + r.tris + ' triangles (budget 2M)'); if (r.ms > 5000) fails.push(n + ': render ' + r.ms + ' ms in software GL (budget 5000)');
}
const info = await ev(() => ({ trees: G3.trees, towns: G3.towns.length, armies: GC.armies.length }));
console.log('scene', JSON.stringify(info)); if (info.trees > 40000) fails.push('tree count ' + info.trees + ' (budget 40000)');
if (errs.length) fails.push(...errs);
await browser.close(); server.close();
console.log(fails.length ? 'GRANDSMOOTH FAIL\n' + fails.join('\n') : 'GRANDSMOOTH PASS'); process.exit(fails.length ? 1 : 0);
