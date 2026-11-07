// Grand map sharpness before/after shots (grandsharp): same 4 views. node orch/grandsharpshots.mjs --tag before|after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'grandlook');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} return undefined; }
await acquireBrowserLock(); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 640 } }); await guardContext(ctx);
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('shot skipped ' + n)); console.log('shot', n); };
const ev = (f, a) => page.evaluate(f, a);

const FILE = process.argv.includes('--file') ? process.argv[process.argv.indexOf('--file') + 1] : 'index.html';
await page.goto(base + '/' + FILE, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after';
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); });
await page.getByText('Got it').first().click({timeout:3000}).catch(()=>{});
const view = (x, z, d, yaw = 0, pitch = .86) => ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[3], pitch: a[4] }); Object.assign(G3.cc, G3.camera); G3.moved = true; }, [x, z, d, yaw, pitch]);
await ev(() => { const sc = document.getElementById('grandScreen'); for (const c of sc.children) { if (!c.querySelector('canvas') && c.tagName !== 'CANVAS' && !c.contains(document.getElementById('g3ui')) && c.id !== 'g3ui') c.style.display = 'none'; } document.querySelectorAll('#g3ui > *').forEach(c => { if (!c.classList.contains('lab') && c.id !== 'g3lab' && c.className !== 'lab') {} }); });
await page.waitForTimeout(800);
const ir = await ev(() => { const a = GC.armies.find(x => x.o === 'IR'); const e = G3.arm.get(a.id); return [e.x, e.z - 20]; });
await view(ir[0], ir[1] + 20, 150); await shot(TAG + '-close');
await view(ir[0], ir[1] + 20, 420); await shot(TAG + '-mid');
const sea = await ev(() => { const a = GC.armies.find(x => GCM.P[x.at].sea); if (!a) return null; const p = GCM.P[a.at]; return [p.x, p.y]; });
if (sea) { await view(sea[0], sea[1] + 20, 160); await shot(TAG + '-navy'); }
console.log('errs', JSON.stringify(errs)); await browser.close(); server.close();
