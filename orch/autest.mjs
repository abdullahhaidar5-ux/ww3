// Corruption test (B5b s2); template from devtest: determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gauCut === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {}; const N = GC.nat.IR; N.pp = N.pp || { pol: 0, dip: 0, mil: 0 }; N.pp.pol = 500;
    const mine = GCM.P.filter(p => p.land && GC.prov[p.i].o === 'IR').map(p => p.i); const pi = mine[0];
    for (const i of mine) GC.prov[i].au = 0; GC.prov[pi].au = 100; for (const i of mine.slice(1, 6)) GC.prov[i].au = 100; GC.auC = null; GMOD_C.cache.clear();
    const m1 = gmod('nation', 'IR', 'manpower', 1); for (const i of mine) GC.prov[i].au = 0; GC.auC = null; GMOD_C.cache.clear(); const m0 = gmod('nation', 'IR', 'manpower', 1);
    out.eff = m1 < m0; GC.prov[pi].au = 50; out.e = gauCut('IR', pi); out.after = GC.prov[pi].au; out.paid = N.pp.pol < 500;
    const other = GCM.P.find(p => p.land && GC.prov[p.i].o !== 'IR'); GC.prov[other.i].auO = 'ZZ';
    for (let i = 0; i < 6 && !GC.over; i++) grEndTurn(true); out.reset = GC.prov[other.i].au >= 0 && GC.prov[other.i].auO === GC.prov[other.i].o;
    GC.prov[pi].au = 30; for (let i = 0; i < 3 && !GC.over; i++) grEndTurn(true); out.decay = GC.prov[pi].au < 30;
    npOpen('IR', 'au'); out.tab = !!document.getElementById('npWin') && /autonomy/i.test(document.getElementById('npWin').textContent); return out; });
  console.log('au', JSON.stringify(r));
  if (r.e || !r.eff || r.after !== 40 || !r.paid) fails.push('au cut/effects'); if (!r.tab) fails.push('au tab'); if (!r.reset || !r.decay) fails.push('au conquest/decay');
  console.log(fails.length ? 'AU FAIL ' + fails.join('; ') + errs.join('|') : 'AU PASS');
} catch (e) { console.log('WS ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
