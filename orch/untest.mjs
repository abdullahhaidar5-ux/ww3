// lane G leader test (AY/DL): node orch/ldtest.mjs
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
  await page.waitForFunction(() => typeof unPropose === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const o = {};
    grNew({ me: 'IR', seed: 5, len: 'std' });
    const M = unMembers(); o.seats = M.perm.length + M.el.length;
    // permanent member targeted -> veto by itself
    o.vetoSelf = unTally('sanction', 'US', 'IR').veto === 'US';
    // a friendless target passes sanctions; give IR lots of dip points
    gidN("IR"); GC.nat.IR.pp.dip = 500; for (const m of M.perm.concat(M.el)) { GC.rel = GC.rel || {}; }
    const t = Object.keys(GC.nat).find(c => c !== 'IR' && grNat(c).major && !M.perm.includes(c) && !grAllied('IR', c));
    for (const m of M.perm.concat(M.el)) if (m !== t) { GC.rel[grWk(m, t)] = -60; }
    for (const m of M.perm.concat(M.el)) if (m !== t && !grAllied(m, t)) { /* ok */ }
    const e = unPropose('IR', 'sanction', t); o.e = e; o.sanc = unSanctioned(t);
    o.inc = gmod('nation', t, 'income', 1) < 1; o.ws = gmod('nation', t, 'warSupport', 0) < 0;
    o.cost = GC.nat.IR.pp.dip === 470;
    // expiry
    GC.turn += UN_SLEN + 1; unMonth(); o.exp = !unSanctioned(t);
    // alert + tab registered
    o.tab = NP.tabs.some(x => x.id === 'un'); o.al = AL.list.some(x => x.id === 'un');
    return o; });
  console.log('untest', JSON.stringify(r));
  if (r.seats !== 15 || !r.vetoSelf || !r.sanc || !r.inc || !r.ws || !r.cost || !r.exp || !r.tab || !r.al) fails.push('un ' + JSON.stringify(r));
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'UNTEST FAIL\n' + fails.join('\n') : 'UNTEST PASS'); process.exit(fails.length ? 1 : 0);
