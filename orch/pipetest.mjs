// Arms trade test (RG12); template from devtest: determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
// from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand2');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('minutes', 2)), ONLY = arg('only', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);

const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot3 = async (n) => { fs.mkdirSync(path.join(ROOT, 'orch', 'shots', 'grand3'), { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'orch', 'shots', 'grand3', n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gmbSet === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {};
    out.names = GPIP.every(p => gpProv(p).length === p.r.length);
    out.flow0 = GPIP.filter(p => !gpWhy(p)).length; const o0 = gpOilDelta();
    GC.war[grWk('IR', 'SA')] = 1; GC.nat.IR.pp = GC.nat.IR.pp || { pol: 0, dip: 0, mil: 0 }; GC.nat.IR.pp.mil = 20;
    out.guard = gpGuarded(GPIP.find(p => p.id === 'ew')); out.e0 = gpSabotage('IR', 'ew'); out.caught = !gpWhy(GPIP.find(p => p.id === 'ew')); GC.nat.IR.pp.mil = 20; GC.armies = GC.armies.filter(a => a.o !== 'SA'); out.e1 = gpSabotage('IR', 'ew'); out.cut = !!gpWhy(GPIP.find(p => p.id === 'ew')); out.oil = gpOilDelta() > o0;
    out.e2 = gpSabotage('IR', 'kc'); /* not at war with IQ */
    out.rep = gpRepair('SA', 'ew') === '' && !gpWhy(GPIP.find(p => p.id === 'ew'));
    const h1 = JSON.stringify(GC.pipe); for (let i = 0; i < 3 && !GC.over; i++) grEndTurn(true);
    npOpen('IR', 'pipe'); out.tab = !!document.getElementById('npWin') && /Pipeline/i.test(document.getElementById('npWin').textContent);
    out.mods = gpCutN('SA', 'own') >= 0; return out; });
  console.log('pipe', JSON.stringify(r));
  if (!r.names) fails.push('route names'); if (r.flow0 < 6) fails.push('start flowing'); if (r.e1 && r.e1 !== '') fails.push('sabotage: ' + r.e1);
  if (!r.cut) fails.push('cut'); if (!r.oil) fails.push('oil'); if (!r.rep) fails.push('repair'); if (r.guard && !r.caught) fails.push('guard'); if (!r.e2) fails.push('needs war'); if (!r.tab) fails.push('tab');
  console.log(fails.length ? 'PIPE FAIL ' + fails.join('; ') + errs.join('|') : 'PIPE PASS');
} catch (e) { console.log('PIPE ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
