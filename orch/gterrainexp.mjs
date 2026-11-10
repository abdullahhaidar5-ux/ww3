// Grand map sharpness before/after shots (grandsharp): same 4 views. node orch/grandsharpshots.mjs --tag before|after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'gterrain-exp', process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after');
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
const t0 = Date.now();
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); try { grandOpen(); } catch (e) { window.__e = e.stack; } }); console.log('openErr', await ev(() => window.__e), JSON.stringify(errs));
console.log('open ms', Date.now() - t0, 'g3', await ev(() => GV.g3), 'trees', await ev(() => G3.trees));
const view = (x, z, d, yaw = 0, pitch = .86) => ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[3], pitch: a[4] }); Object.assign(G3.cc, G3.camera); G3.moved = true; try { g3CamApply(G3.cc); g3TerrLOD(99); } catch (e) {} }, [x, z, d, yaw, pitch]);
await shot('00-first'); console.log('errs', JSON.stringify(errs));
const ir = await ev(() => { const c = GC.nat.IR.cap, p = GCM.P[c]; return [p.x, p.y]; });
await view(ir[0] + 25, ir[1] + 5, 60, 0.4, .6);
await shot('e0-current');
await ev(() => { G3.cc.d = 600; G3.camera.d = 600; G3.moved = true; g3CamApply(G3.cc); g3TerrLOD(99); }); await shot('e1-mid');
await view(ir[0]+80, ir[1]+60, 300, 0.4, .6); await shot('e2-crack');
console.log('errs', JSON.stringify(errs)); await browser.close(); server.close();
