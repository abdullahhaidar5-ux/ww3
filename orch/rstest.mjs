// lane G leader test (AY/DL): node orch/rstest.mjs
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
const SHOTS = path.join(ROOT, 'orch', 'shots', 'laneG');
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
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof rsBuy === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const out = {};
    grNew({ me: 'IR', seed: 5, len: 'std' }); gidN('IR'); const N = GC.nat.IR; N.pp = { pol: 100, dip: 100, mil: 100, t: GC.turn }; rsN('IR');
    const i0 = gmod('nation', 'IR', 'income', 100), f0 = gmod('nation', 'IR', 'fireSupport', 1);
    out.e1 = rsBuy('IR', 'gov') === '' && rsBuy('IR', 'mil') === ''; out.inc = gmod('nation', 'IR', 'income', 100) > i0; out.fire = gmod('nation', 'IR', 'fireSupport', 1) > f0;
    out.pay = N.pp.pol === 60 && N.pp.mil === 60; N.pp.pol = 5; out.poor = rsBuy('IR', 'gov') !== '';
    out.cab = [0, 1, 2, 3].every(i => { const s = cabSkill('IR', i); return s >= 1 && s <= 3; }); out.cabrow = GMOD_ROWS.filter(r => /^cab/.test(r.id)).length === 12;
    const o = Object.keys(GC.nat).find(c => GC.nat[c].ai && !GC.nat[c].dead); gidN(o); GC.nat[o].pp = { pol: 300, dip: 0, mil: 0, t: GC.turn }; rsMonth(); out.ai = rsN(o).rs.gov === 1;
    out.tab = NP.tabs.some(t => t.id === 'res');
    return out; });
  console.log('rstest', JSON.stringify(r));
  if (Object.values(r).some(v => !v)) fails.push('research ' + JSON.stringify(r));
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'RSTEST FAIL\n' + fails.join('\n') : 'RSTEST PASS'); process.exit(fails.length ? 1 : 0);
