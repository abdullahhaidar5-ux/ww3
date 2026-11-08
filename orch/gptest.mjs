// lane G leader test (AY/DL): node orch/cotest.mjs
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
  await page.waitForFunction(() => typeof gpOpen === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const out = {};
    grNew({ me: 'IR', seed: 5, len: 'std' });
    const a = 'IR', b = GCM.P.filter(p => p.land).map(p => GC.prov[p.i].o).find(o => o !== a && GC.nat[o] && !GC.nat[o].dead && grNat(o).major && !grAllied(a, o));
    GC.war[grWk(a, b)] = 1; GC.wsT = {}; GC.wsT[grWk(a, b)] = GC.turn - 20;     // long war = +30 score
    const ps = gpProvs(a, b); out.score = gpScore(a, b); const pi = ps[ps.length - 1].i;
    out.cost = gpProvCost(pi, a); out.bad = !gpEval(a, b, { prov: ps.map(p => p.i) }).ok;       // taking everything is refused
    const d = { prov: [pi], trib: false };
    const e = gpEval(a, b, d); out.ok = e.ok || (e.cost > e.score);
    GC.nat[b].cash = 1000; const c0 = GC.nat[a].cash; const dd = { prov: e.ok ? [pi] : [], trib: true };
    const r = gpApply(a, b, dd); out.applied = r === ''; out.owner = !e.ok || GC.prov[pi].o === a; out.peace = !grAtWar(a, b) && gdTruce(a, b); out.tribute = GC.nat[a].cash >= c0 + 300 - 1; 
    out.alert = AL.list.some(x => x.id === 'peace'); out.ui = (gpOpen(a, GC.nat[b] ? b : b), !!document.getElementById('gpDeal'));
    return out; });
  console.log('peacetest', JSON.stringify(r));
  if (r.score < 20 || !r.bad || !r.applied || !r.peace || !r.tribute || !r.alert || !r.owner) fails.push('peace ' + JSON.stringify(r));
  // RG16 reparations + RG44 demilitarised zone (laneG): paid once, zone blocks every path (AI too) for 24 months
  const z = await ev(() => { const out = {};
    grNew({ me: 'IR', seed: 5, len: 'std' });
    const a = 'IR', bp = GCM.P.find(p => p.land && GC.prov[p.i] && GC.prov[p.i].o !== a && (p.adj || []).some(j => GC.prov[j] && GC.prov[j].o === a) && GC.nat[GC.prov[p.i].o] && grNat(GC.prov[p.i].o).major && !grAllied(a, GC.prov[p.i].o));
    const b = bp ? GC.prov[bp.i].o : 'IR';
    GC.war[grWk(a, b)] = 1; GC.wsT = {}; GC.wsT[grWk(a, b)] = GC.turn - 20;
    const zone = gpDmzProv(a, b, { prov: [] }); out.zone = zone;
    GC.nat[b].cash = 1000; const c0 = GC.nat[a].cash;
    const r1 = gpApply(a, b, { prov: [], trib: false, rep: true, dmz: zone >= 0 }); out.applied = r1 === '';
    out.rep = GC.nat[a].cash - c0 === Math.round(1000 * GP_REP); out.dmz = gdDmz(zone); out.until = GC.dmz && GC.dmz[zone] === GC.turn + GP_DMZ_MONTHS;
    GC.war[grWk(a, b)] = 1; const src = zone >= 0 ? GCM.P[zone].adj.find(j => GC.prov[j].o === a) : undefined;
    out.blocked = src === undefined || grPath(a, src, zone) === null;
    return out; });
  console.log('dmztest', JSON.stringify(z));
  if (z.zone < 0 || !z.applied || !z.rep || !z.dmz || !z.until || !z.blocked) fails.push('dmz ' + JSON.stringify(z));
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'GPTEST FAIL\n' + fails.join('\n') : 'GPTEST PASS'); process.exit(fails.length ? 1 : 0);
