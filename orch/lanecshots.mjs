// look1 before/after shots (same views as grandsharp): same 4 views. node orch/grandsharpshots.mjs --tag before|after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'laneC', process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after');
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
await page.waitForFunction(() => typeof G3 !== 'undefined' && (G3.real || G3.realFail), null, { timeout: 90000 }).catch(() => console.log('real data not loaded'));
const t0 = Date.now();
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); try { grandOpen(); } catch (e) { window.__e = e.stack; } }); console.log('openErr', await ev(() => window.__e), JSON.stringify(errs));
console.log('open ms', Date.now() - t0, 'g3', await ev(() => GV.g3), 'trees', await ev(() => G3.trees), 'realFieldsMs', await ev(() => G3.tReal));
const view = (x, z, d, yaw = 0, pitch = .86) => ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[3], pitch: a[4] }); Object.assign(G3.cc, G3.camera); G3.moved = true; }, [x, z, d, yaw, pitch]);
await shot('00-first'); console.log('errs', JSON.stringify(errs));
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const pv = n => ev(n => { const p = GCM.P.find(q => q.n === n); return [p.x, p.y]; }, n);

const lv = await pv('South Lebanon');
await shot0('x');
async function shot0(){}
await view(lv[0], lv[1] + 10, 160, 0.2, .62); await shot('smoke-peace'); 
const info = await ev(() => { const p = GCM.P.find(q => q.n === 'South Lebanon'); const o = GC.prov[p.i].o; const en = ['IL','US','RU'].find(c => c !== o) ; GC.war[grWk(o, en)] = 1; GC.armies.push({ id: 9999, o: en, at: p.i, u: {}, path: [], pg: 0 }); G3.smokeT = 0; return [o, en]; });
console.log('war', JSON.stringify(info));
await page.waitForTimeout(2500); console.log('chim', await ev(() => !!G3.chim)); await shot('smoke-war');
const an = await pv('Anbar'); await view(an[0], an[1] + 10, 110, 0.3, .55); await page.waitForTimeout(1500); console.log('dbg', JSON.stringify(await ev(() => ({ v: G3.chim.visible, t: G3.chimU.uT.value, cam: G3.cc, par: !!G3.chim.parent, pv: G3.chim.parent && G3.chim.parent.visible, n: G3.chim.geometry.attributes.position.count, diag: (() => { const pr = G3.R.properties.get(G3.chim.material).currentProgram; return pr ? JSON.stringify(pr.diagnostics || 'nodiag').slice(0, 600) : 'noprog'; })(), pos: Array.from(G3.chim.geometry.attributes.position.array.slice(0, 6)), ph: Array.from(G3.chim.geometry.attributes.aPh.array.slice(0, 4)) })))); await shot('smoke-war-close');

await browser.close(); server.close();
