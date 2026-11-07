// lane G test: alerts bar + diplomacy. Original header: : determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gdCheck === 'function', null, { timeout: 60000 });
  const r = await ev(() => {
    const out = {};
    grNew({ me: 'IR', seed: 777, len: 'std' });
    out.alerts = GALERTS.map(a => a.id).join(',');
    let hit = 0; for (let i = 0; i < 6; i++) { grEndTurn(true); } out.t = GC.turn;
    const me = 'IR', foes = Object.keys(GC.nat).filter(c => c !== me && !GC.nat[c].dead);
    const free = foes.find(c => !grAtWar(me, c) && !grAllied(me, c));
    out.free = free;
    const before = grOpinion(me, free); gdDo('improve', me, free); out.imp = grOpinion(me, free) - before;
    out.allyChk = gdCheck('ally', me, free).pct;
    gdDo('aid', me, free); gdDo('aid', me, free); gdDo('aid', me, free); gdDo('aid', me, free); gdDo('aid', me, free);
    out.ally = gdDo('ally', me, free); out.allied = grAllied(me, free);
    out.war = gdDo('unally', me, free); out.warDecl = gdDo('war', me, free); out.atWar = grAtWar(me, free);
    out.peaceChk = gdCheck('peace', me, free).can; out.peaceRes = gdDo('peace', me, free); out.atWar2 = grAtWar(me, free); out.truce = gdTruce(me, free);
    grDeclare(me, free); out.truceHolds = !grAtWar(me, free);
    // determinism with diplomacy active
    grNew({ me: 'IR', seed: 777, len: 'std' }); for (let i = 0; i < 12; i++) grEndTurn(true); const h1 = grHash();
    grNew({ me: 'IR', seed: 777, len: 'std' }); for (let i = 0; i < 12; i++) grEndTurn(true); out.det = h1 === grHash();
    out.wars = Object.keys(GC.war).length; out.dp = Object.keys(GC.dp || {}).length;
    // events / achievements / news / web
    grNew({ me: 'IR', seed: 99, len: 'std' }); for (let i = 0; i < 40; i++) { grEndTurn(true); if (GC.ev && GC.ev.pend.length) { const p = GC.ev.pend[0]; gevChoose(p[0], p[1], 0); } }
    out.evHist = GC.ev ? GC.ev.hist.length : -1; out.evAI = GC.ev ? GC.ev.hist.filter(h => h[1] !== 'IR').length : -1; out.ach = GC.ach ? Object.values(GC.ach).reduce((a, l) => a + l.length, 0) : -1;
    out.news = gnewsMake(GC.turn - 1).length; gnewsShow(); gwebOpen(); out.web = !!document.getElementById('gWeb'); document.getElementById('gWeb') && document.getElementById('gWeb').remove();
    for (const r of GEV_ROWS) for (const o of r.o) for (const f of o.fx) if (f[0] === 'chain' && !GEV_ROWS.find(x => x.id === f[1])) out.badChain = f[1];
    // UI
    GV.sel = GC.nat.IR.cap; guTop(); out.alertBtns = document.querySelectorAll('#gAlerts button').length;
    NP.dt = free; npOpen('IR', 'dip'); out.dipRows = document.querySelectorAll('#npWin div[style*="cursor:pointer"]').length; out.dipText = (document.getElementById('npWin') || {}).innerText?.length;
    return out; });
  console.log('gdtest', JSON.stringify(r));
  await page.screenshot({ path: path.join(SHOTS, 'diplomacy.png'), timeout: 120000 }).catch(() => {});
  if (!r.imp || r.imp < 8) fails.push('improve relations did not raise opinion');
  if (!r.allied) fails.push('alliance not formed: ' + r.ally);
  if (!r.atWar) fails.push('war not declared: ' + r.warDecl);
  if (r.atWar2 || !r.truce) fails.push('peace did not end war / no truce');
  if (!r.truceHolds) fails.push('truce did not block redeclare');
  if (!r.det) fails.push('determinism broken with diplomacy');
  if (r.evHist < 3 || r.evAI < 2) fails.push('events did not fire: ' + r.evHist + '/' + r.evAI); if (r.ach < 3) fails.push('no achievements'); if (!r.web) fails.push('web did not open'); if (r.badChain) fails.push('bad chain ' + r.badChain);
  if (!r.dipText) fails.push('diplomacy tab did not render');
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'GDTEST FAIL\n' + fails.join('\n') : 'GDTEST PASS'); process.exit(fails.length ? 1 : 0);
