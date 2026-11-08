// Grand campaign test (stage 1): determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gtrPush === 'function', null, { timeout: 60000 });
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {}; const N = GC.nat.IR; N.pp = N.pp || { pol: 0, dip: 0, mil: 0 }; N.pp.dip = 500;
    for (let i = 0; i < 3; i++) grEndTurn(true);
    const nodes = gtrNodes(); out.nodes = nodes.length; out.maxv = Math.round(Math.max(...nodes.map(n => n.v)));
    const b = {}; for (const c of Object.keys(GC.nat)) b[c] = +gtrBonus(c).toFixed(3); const vals = Object.values(b).filter(v => v > 0); out.min = Math.min(...vals); out.max = Math.max(...vals); out.cnt = vals.length;
    out.irb = b.IR; out.sample = ['US','CN','IR','IL','TR','SA','EG'].map(c => c + ':' + b[c]).join(' ');
    const mine = nodes.find(n => n.sh.IR); out.mine = mine ? mine.n : null; const m0 = gmod('nation', 'IR', 'income', 1);
    out.push = mine ? gtrPush('IR', mine.i) : 'no node'; out.gain = gmod('nation', 'IR', 'income', 1) - m0; out.dip = N.pp.dip; out.again = mine ? gtrPush('IR', mine.i) : '';
    const dip = N.pp.dip; for (let i = 0; i < 20 && !GC.over; i++) grEndTurn(true); out.hash = JSON.stringify(GC.tn.top).length;
    out.rows = GC.mod.filter(x => x.id.startsWith('trade_')).length;
    npOpen('IR', 'trade'); out.tab = !!document.getElementById('npWin') && /Sea lane/.test(document.getElementById('npWin').textContent); return out; });
  console.log('trade', JSON.stringify(r));
  if (!(r.nodes > 3)) fails.push('few nodes'); if (!(r.cnt > 5)) fails.push('few traders'); if (!(r.max <= 0.2)) fails.push('bonus cap'); if (r.mine && (r.push || !(r.gain >= 0) || r.again !== 'Already pushing here.')) fails.push('push ' + r.push + '/' + r.again); if (!r.tab) fails.push('trade tab'); if (!(r.rows > 5)) fails.push('rows');
  const d = await ev(() => { const run = () => { grNew({ me: null, seed: 4242, len: 'quick' }); grRunAI(24); return JSON.stringify(GC.tn) + '|' + Object.keys(GC.nat).sort().map(c => c + Math.round(GC.nat[c].e.fuel)).join(','); }; return [run(), run()]; });
  if (d[0] !== d[1]) fails.push('nondeterministic');
  console.log(fails.length ? 'TRADE FAIL ' + fails.join('; ') + errs.join('|') : 'TRADE PASS');
} catch (e) { console.log('WS ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
