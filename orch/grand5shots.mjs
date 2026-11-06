// Grand map 3D screenshots + frame timing (stage 5). node orch/grand5shots.mjs [--only name]
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
const t0 = Date.now();
await ev(() => { campClose(); grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); try { grandOpen(); } catch (e) { window.__e = e.stack; } }); console.log('openErr', await ev(() => window.__e), JSON.stringify(errs));
console.log('open ms', Date.now() - t0, 'g3', await ev(() => GV.g3), 'trees', await ev(() => G3.trees));
const view = (x, z, d, yaw = 0, pitch = .86) => ev(a => { Object.assign(G3.camera, { x: a[0], z: a[1], d: a[2], yaw: a[3], pitch: a[4] }); Object.assign(G3.cc, G3.camera); G3.moved = true; }, [x, z, d, yaw, pitch]);
await shot('00-first'); console.log('errs', JSON.stringify(errs));
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
if (!only) {
  await ev(() => guFit(GR_REGIONS[4][1])); await shot('01-middle-east-wide');
  const iq = await ev(() => { const c = GC.nat.IR.cap, p = GCM.P[c]; return [p.x, p.y]; });
  await view(iq[0], iq[1] + 20, 230); await shot('02-army-town-forest');
  await ev(() => { const a = GC.armies.find(x => x.o === GC.me); GV.selA = a.id; GV.sel = a.at; let res = null; for (const j of GCM.P[a.at].adj) { if (!GCM.P[j].land) continue; res = grOrderMove(a.id, j); if (res.decl) { grDeclare(a.o, res.decl); res = grOrderMove(a.id, j); } if (!res.err && a.path.length) break; } window.__mv = JSON.stringify([res, a.path]); g3Refresh(); }); console.log('move', await ev(() => window.__mv)); await view(iq[0], iq[1] + 10, 320); await shot('03-selected-cards-arrow');
  const pv = n => ev(n => { const p = GCM.P.find(q => q.n === n); return [p.x, p.y]; }, n);
  const sib = await pv('Siberia'); await ev(() => { GV.selA = 0; GV.sel = -1; g3Refresh(); }); await view(sib[0], sib[1] + 30, 420); await shot('04-snow-siberia');
  const des = await pv('Riyadh'); await view(des[0], des[1] + 30, 420); await shot('05-desert-arabia');
  const hor = await pv('Hormozgan'); await view(hor[0] - 40, hor[1] + 20, 360, 0.3, .6); await shot('06-coast-sea');
  await ev(() => { guFit(null); }); await shot('07-world');
  await ev(() => { g3SetMode('unrest'); guFit(GR_REGIONS[4][1]); }); await shot('08-mode-unrest');
  const st = await ev(() => { const i = G3.R.info; return { calls: i.render.calls, tris: i.render.triangles, trees: G3.trees }; }); console.log('render', JSON.stringify(st));
}
console.log('errs', JSON.stringify(errs)); await browser.close(); server.close();
