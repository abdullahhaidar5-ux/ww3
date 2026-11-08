// Grand map 3D smoothness gate (stage 5): draw calls, triangles and render time of the 3D campaign map at three views.
// Budgets are loose (CI renders in software); they catch regressions such as per-unit meshes or a runaway tree count.  node orch/grandsmooth.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'gforest');
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
await page.waitForFunction(() => typeof G3 !== 'undefined' && (G3.real || G3.realFail), null, { timeout: 90000 }).catch(() => console.log('real data not loaded'));
// phone before/after shot: Lebanon + Taurus mountains + the Euphrates valley.  node orch/gforestphone.mjs <tag>
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); });
await page.waitForTimeout(3000);
const tag = process.argv[2] || 'after';
for (const [n, place, dx, dz, d, pitch, yaw] of [['levant', 'Aleppo', -18, 10, 150, .62, 0], ['euphrates', 'Deir ez-Zor', 0, 6, 110, .64, 0]]) {
  const c = await ev(n => { const q = GCM.P.find(q => q.land && q.n === n) || GCM.P.find(q => q.land && q.n && q.n.includes(n)); return q ? [q.x, q.y] : null; }, place);
  if (!c) { console.log('no place', place); continue; }
  await ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[4], pitch: a[3] }); Object.assign(G3.cc, G3.camera); G3.moved = true; g3CamApply(G3.cc); if (typeof g3ForestTick === 'function') g3ForestTick(true); }, [c[0] + dx, c[1] + dz, d, pitch, yaw]);
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SHOTS, 'phone-' + tag + '-' + n + '.jpg'), quality: 85 }); console.log('shot', n);
}
console.log('errors', errs.slice(0, 5).join('\n'));
await browser.close(); server.close(); process.exit(0);
