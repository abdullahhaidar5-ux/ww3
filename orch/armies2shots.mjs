// Grand map sharpness before/after shots (grandsharp): same 4 views. node orch/grandsharpshots.mjs --tag before|after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'armies2', process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} return undefined; }
await acquireBrowserLock(); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(1500); const bb=await page.evaluate(()=>{const r=GV.cv.getBoundingClientRect();return {x:r.x+r.width/2-280,y:r.y+r.height/2-290,width:560,height:560};}); await page.screenshot({ path: path.join(SHOTS, n + '.png'), clip:bb, timeout: 120000 }).catch(() => console.log('shot skipped ' + n)); console.log('shot', n); };
const ev = (f, a) => page.evaluate(f, a);
await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
const t0 = Date.now();
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); try { grandOpen(); } catch (e) { window.__e = e.stack; } }); console.log('openErr', await ev(() => window.__e), JSON.stringify(errs));
console.log('open ms', Date.now() - t0, 'g3', await ev(() => GV.g3), 'trees', await ev(() => G3.trees));
const view = (x, z, d, yaw = 0, pitch = .86) => ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[3], pitch: a[4] }); Object.assign(G3.cc, G3.camera); G3.moved = true; }, [x, z, d, yaw, pitch]);
await shot('00-first'); console.log('errs', JSON.stringify(errs));
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const pv = n => ev(n => { const p = GCM.P.find(q => q.n === n); return [p.x, p.y]; }, n);
console.log('lines', JSON.stringify(await ev(() => { const L = G3.lines; return L && [L.land.length, L.sea.length, L.riv.length, L.land_m.geometry.attributes.aW.array.slice(0,8), L.land_m.geometry.attributes.aCol.array.slice(0,8), L.land_m.geometry.attributes.aP0.array.slice(0,6), G3.LU.uRes.value.x, G3.LU.uPx.value]; })));
const ir = await ev(() => { const c = GC.nat.IR.cap, p = GCM.P[c]; return [p.x, p.y]; });
await ev(()=>{for(const a of GC.armies)if(a.o==='IR'&&a.u.length<12){}}); await ev(()=>{G3.animOK=false;});
const ap = await ev(()=>{const a=GC.armies.find(a=>a.o===GC.me&&!GCM.P[a.at].sea&&a.u.length>=12);const e=a&&G3.arm.get(a.id);return e?[e.g.position.x,e.g.position.z]:null;}); const V = process.argv.includes('--view') ? process.argv[process.argv.indexOf('--view') + 1].split(',').map(Number) : [ap[0]-5, ap[1]-5, 40, 0.25, .7];
await ev(()=>{try{document.querySelectorAll('button').forEach(b=>{if(/got it/i.test(b.textContent))b.click();});for(const el of document.querySelectorAll('#gMapWrap ~ *, .gtip'))el.style.display='none';}catch(e){}});console.log('AP',JSON.stringify(ap),JSON.stringify(V),JSON.stringify(ir));await view(...V); await page.waitForTimeout(4000); await shot('armies-'+TAG);
const sea = await ev(()=>{const a=GC.armies.find(a=>{const e=G3.arm.get(a.id);return GCM.P[a.at].sea&&e&&g3HeightAt(e.x,e.z)<=0&&g3HeightAt(e.x+25,e.z+25)<=0&&g3HeightAt(e.x-25,e.z-25)<=0;})||GC.armies.find(a=>GCM.P[a.at].sea);const e=a&&G3.arm.get(a.id);if(e)window.__sea=e;return e?[e.g.position.x,e.g.position.z,e.g.visible,e.sea,!!e.mini,e.g.children.length]:null;}); console.log('sea',JSON.stringify(sea)); if(sea){await view(sea[0],sea[1]+4,48,0.3,.75);await page.waitForTimeout(3000);await shot('navy-'+TAG);}
console.log('errs', JSON.stringify(errs)); await browser.close(); server.close();
