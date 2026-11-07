// realmap before/after shots: world, Middle East, South America (Brazil).  node orch/realmapshots.mjs --tag before|after
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(ROOT, 'orch', 'shots', 'realmap', process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after');
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
const box = cs => ev(cs => { const ps = GCM.P.filter(p => p.land && cs.includes(p.o) && p.x > 600 === GCM.P.filter(q => q.land && q.o === p.o).some(q => q.cap && q.x > 600)); const xs = ps.map(p => p.x), ys = ps.map(p => p.y); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = .12 * Math.max(x1 - x0, y1 - y0); return [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m]; }, cs);
const fit = r => ev(r => { guFit(r); G3.moved = true; }, r);
await fit(null); await shot('world');
await fit(await box(['IR', 'IQ', 'SY', 'SA', 'TR', 'EG', 'IL', 'RS', 'JO', 'KD', 'RV', 'DW', 'OM', 'AE', 'KW', 'QA'])); await shot('middle-east');
await fit(await box(['RS', 'IL', 'OB', 'JO', 'SY'])); await shot('levant');
await fit(await box(['BR', 'AR', 'CL', 'PE', 'CO', 'VE'])); await shot('south-america');
console.log('provinces', await ev(() => GM_LAND), 'fps', await ev(async () => { const t = performance.now(); let n = 0; await new Promise(r => { const f = () => { if (++n < 30) requestAnimationFrame(f); else r(); }; f(); }); return Math.round(30000 / (performance.now() - t)); }));
console.log('errs', JSON.stringify(errs)); await browser.close(); server.close();
