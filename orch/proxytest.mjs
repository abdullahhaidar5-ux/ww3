// lane G proxy wars + volunteers (RG9/RG18): node orch/proxytest.mjs
// (header from gptest) from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
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
  await page.waitForFunction(() => typeof gpxTurn === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const out = {};
    grNew({ me: 'IR', seed: 9, len: 'std' });
    const a = 'IR';
    const b = GCM.P.filter(p => p.land).map(p => GC.prov[p.i].o).find(o => o !== a && GC.nat[o] && !GC.nat[o].dead && !grAllied(a, o));
    out.b = b; out.peaceOk = !!b && !grAtWar(a, b);
    const e0 = gdChance('proxy', a, b); out.chanceOk = e0.ok && e0.cost === 400;
    GC.nat[a].cash = 5000; GC.nat[b].cash = 5000; const c0 = GC.nat[a].cash;
    gdAct('proxy', a, b); out.started = gpxHas(a, b);
    out.paid = c0 - GC.nat[a].cash === 400;
    out.dupe = !gdChance('proxy', a, b).ok;
    GC.war[grWk(a, b)] = 1; out.warBlocks = !gdChance('proxy', a, b).ok; delete GC.war[grWk(a, b)];
    // monthly: funded militia costs and unrest; then it ends at its end turn
    const ps = GCM.P.filter(p => p.land && GC.prov[p.i].o === b); const u0 = ps.reduce((s, p) => s + (GC.prov[p.i].un || 0), 0);
    const cb0 = GC.nat[b].cash; GC.px = GC.px.map(x => [x[0], x[1], GC.turn + 50]); GC.vol = {};
    gpxTurn(); const u1 = ps.reduce((s, p) => s + (GC.prov[p.i].un || 0), 0);
    out.monthly = GC.nat[b].cash === cb0 - 100 && (u1 > u0 || !gpxHas(a, b));
    GC.px = GC.px.map(x => [x[0], x[1], GC.turn]); gpxTurn(); out.ends = !gpxHas(a, b);
    // RG18 volunteers: a same-faction nation joins a war host without being at war with its enemy
    const h = GCM.P.filter(p => p.land).map(p => GC.prov[p.i].o).find(o => o !== a && GC.nat[o] && !GC.nat[o].dead && o !== b);
    const v = Object.keys(GC.nat).find(o => o !== h && o !== b && !GC.nat[o].dead && grNat(o).fac === grNat(h).fac);
    out.vol = !!v;
    if (v && h) { GCM.nats.get(v).fac = grNat(h).fac; GC.war[grWk(h, b)] = 1; GC.nat[v].cash = 5000; GC.vol = {};
      let n = 0; for (let t = 0; t < 40; t++) { GC.turn++; gpxTurn(); n = Object.keys(GC.vol).length ? 1 : n; }
      out.volSent = n === 1 && Object.keys(GC.vol).every(k => (GC.vol[k] || 0) <= GPX_VOL_MAX);
      out.volCapped = Object.values(GC.vol).every(x => x <= GPX_VOL_MAX); }
    return out; });
  console.log('proxytest', JSON.stringify(r));
  if (!r.peaceOk || !r.chanceOk || !r.started || !r.paid || !r.dupe || !r.warBlocks || !r.monthly || !r.ends || (r.vol && (!r.volSent || !r.volCapped))) fails.push('proxy ' + JSON.stringify(r));
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
if (fails.length) { console.log('PROXY FAIL', fails.join('\n')); process.exit(1); }
console.log('PROXY PASS');
