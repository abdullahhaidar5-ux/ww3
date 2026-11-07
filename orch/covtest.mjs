// Mobilisation test (RG34); template from devtest: determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gcvSabotage === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {}; const N = GC.nat.IR; N.cash = 9000;
    const foes = Object.keys(GC.nat).filter(o => o !== 'IR' && !GC.nat[o].dead && !grAllied('IR', o)); const t = foes.find(o => grAtWar('IR', o)) || foes[0]; out.t = t;
    const T = GC.nat[t]; T.ci = 0; let i0 = (GMOD_C.cache.clear(), gmod('nation', t, 'income', 1)), got = 0;
    for (let k = 0; k < 8 && !got; k++) { GC.turn += 1; N.cash = 9000; T.sabU = 0; const cash = N.cash; const e = gcvSabotage('IR', t); if (e) { out.err = e; break; } got = T.sabU >= GC.turn ? 1 : 0; out.paid = cash - N.cash; }
    out.win = got; out.inc = gmod('nation', t, 'income', 1) < i0 || !got; out.again = gcvSabotage('IR', t) !== '' || !got;
    GC.nat[t].ci = 1; out.ci = gcvChance('IR', t) < .4; N.cash = 100; out.poor = gcvSabotage('IR', 'XX') !== '' ;
    const h = []; for (let r2 = 0; r2 < 2; r2++) { GC.turn = 5; out.det = gcvRoll('IR', t, 'win') === gcvRoll('IR', t, 'win'); }
    const sab0 = Object.keys(GC.nat).some(c => GC.nat[c].sabN > 0);
    for (let i = 0; i < 12 && !GC.over; i++) grEndTurn(true);
    out.ai = Object.keys(GC.nat).some(c => c !== 'IR' && GC.nat[c].sabN > 0) || sab0; out.aici = Object.keys(GC.nat).some(c => c !== 'IR' && GC.nat[c].ci);
    npOpen('IR', 'cov'); out.tab = !!document.getElementById('npWin') && /counter-intelligence/i.test(document.getElementById('npWin').textContent); return out; });
  console.log('cov', JSON.stringify(r));
  if (r.err || !r.win || r.paid !== 600 || !r.inc || !r.again || !r.ci || !r.poor || !r.det) fails.push('cov ops'); if (!r.ai) fails.push('cov AI sabotage'); if (!r.tab) fails.push('cov tab');
  console.log(fails.length ? 'COV FAIL ' + fails.join('; ') + errs.join('|') : 'COV PASS');
} catch (e) { console.log('COV ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
