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
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); });
await page.waitForTimeout(3000);
const tag = process.argv[2] || 'after';
const pv = n => ev(n => { const p = GCM.P.find(q => q.land && (q.n === n)); return p ? [p.x, p.y] : null; }, n);
const info = await ev(() => { const c = g3ForestCover(); let a = 0, b = 0, z = 0; const kk = [0, 0, 0, 0]; c.kd.forEach((v, i) => { if (c.den[i] > .05) kk[v]++; }); for (const v of c.den) { if (v > .05) a++; if (v > .4) b++; } const F = G3.F; let l = 0, h = 0; for (let k = 0; k < F.W * F.H; k++) { if (F.Ls[k] >= .72) l++; if (F.Ls[k] >= .72 && F.Hh[k] >= .6) h++; } return { pool: G3.treePool, ms: G3.tForest, trees: G3.trees, real: !!G3.real, bw: !!F.bw, a, b, l, h, riv: typeof GT_RIV, kk }; });
console.log('forest', JSON.stringify(info));
if (process.env.NOSHOT) { console.log('dbg2', JSON.stringify(await ev(() => ['Baghdad','Riyadh','Cairo','Basra'].map(n => { const p = GCM.P.find(q => q.n === n); if (!p) return n; const F = G3.F, x = Math.round(p.x / 2), y = Math.round(p.y / 2), k = y * F.W + x; return [n, p.x, p.y, F.bw[k * 4 + 2], F.bw[k * 4 + 3], F.Ls[k].toFixed(2)]; })))); console.log('dbg', JSON.stringify(await ev(() => { const F = G3.F, R = G3.real, W = F.W, H = F.H, a = []; for (let y = 1; y < H; y += 7) for (let x = 1; x < W; x += 7) { const k = y * W + x; if (F.Ls[k] < .72) continue; const ci = (Math.min(R.CH - 1, Math.floor((y + .5) * R.CH / H)) * R.CW + Math.min(R.CW - 1, Math.floor((x + .5) * R.CW / W))) * 4; a.push((R.col[ci + 1] - R.col[ci]) / 255); } a.sort((p, q) => p - q); return { n: a.length, lit: !!F.lit, p: [.1, .3, .5, .7, .9].map(f => a[(a.length * f) | 0].toFixed(3)) }; }))); process.exit(0); }
for (const [n, place, d, pitch, yaw] of [['levant', 'Beirut', 120, .7, 0], ['turkey', 'Ankara', 200, .68, .3], ['iraq', 'Baghdad', 140, .72, 0], ['europe', 'Berlin', 160, .7, 0], ['black', 'Istanbul', 90, .6, 0]]) {
  let c = await pv(place); if (!c) { const p = await ev(n => { const q = GCM.P.find(q => q.land && q.n && q.n.includes(n)); return q ? [q.x, q.y, q.n] : null; }, place); c = p; }
  if (!c) { console.log('no place', place); continue; }
  await ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1] + a[2] * .25, d: a[2], yaw: a[4], pitch: a[3] }); Object.assign(G3.cc, G3.camera); G3.moved = true; g3CamApply(G3.cc); g3ForestTick(true); }, [c[0], c[1], d, pitch, yaw]);
  await page.waitForTimeout(1200); await page.screenshot({ path: path.join(SHOTS, tag + '-' + n + '.jpg'), quality: 80 }); console.log('shot', n, JSON.stringify(await ev(() => G3.treeN)));
}
console.log('errors', errs.slice(0, 5).join('\n'));
await browser.close(); server.close(); process.exit(0);
