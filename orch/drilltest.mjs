// Drill order test: drill rises while drilling (and costs money), stops when moving, fades when idle, AI drills in peacetime, bonus reaches the battle team, survives save/load.   node orch/drilltest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('minutes', 2)), ONLY = arg('only', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof grDrill === 'function', null, { timeout: 60000 });
  const r = await ev(() => {
    grNew({ me: 'IR', seed: 55, len: 'quick' }); GC.ph = 'plan';
    const A = GC.armies.find(a => a.o === 'IR' && !a.fl && a.u.length); A.path = []; A.dr = 0;
    const out = { id: !!A }; const c0 = GC.nat.IR.cash;
    out.err = grDrill(A.id, 1); out.on = A.dg; gmodMonth(); out.r1 = A.dr; out.paid = c0 - GC.nat.IR.cash;
    gmodMonth(); out.r2 = A.dr;
    const j = JSON.parse(JSON.stringify(GC)); const B = j.armies.find(a => a.id === A.id); out.saved = [B.dr, B.dg];
    const to = GCM.P[A.at].adj.find(p => GCM.P[p].land && GC.prov[p].o === 'IR'); out.to = to;
    if (to !== undefined) { const m = grOrderMove(A.id, to); out.mv = !!(m && m.ok); } else { A.path = [A.at]; gdrMove(A); }
    out.dgAfterMove = A.dg; A.path = []; const d = A.dr; gmodMonth(); out.decay = d - A.dr;
    out.errMove = (A.path = [1], grDrill(A.id, 1)); A.path = [];
    out.card = /Drill/.test(gdrBtn(A)) && /Drill \d+%/.test(gdrTag(A));
    out.ai = GC.armies.some(a => a.o !== 'IR' && a.dg === 1);
    const oldG = G; G = { teams: [{ upg: {} }, { upg: {} }] }; gdrApplyBattle([65, 0]); out.team = [Object.keys(G.teams[0].upg).join(), Object.keys(G.teams[1].upg).join()]; G = oldG;
    out.fx = UPG.dr3.fx.map(f => f[0] + f[2]).join();
    return out; });
  console.log('drill', JSON.stringify(r));
  if (r.err !== '' || r.on !== 1 || !(r.r1 > 0) || !(r.r2 > r.r1) || !(r.paid > 0)) fails.push('drill rise/cost: ' + JSON.stringify(r));
  if (r.saved[0] !== r.r2 || r.saved[1] !== 1) fails.push('drill save: ' + JSON.stringify(r.saved));
  if (r.dgAfterMove !== 0 || !(r.decay > 0) || r.errMove === '') fails.push('drill move/decay: ' + JSON.stringify(r));
  if (!r.card) fails.push('drill card'); if (!r.ai) fails.push('AI never drills');
  if (r.team[0] !== 'dr3' || r.team[1] !== '') fails.push('drill battle bonus: ' + JSON.stringify(r.team));
} catch (e) { fails.push('crash ' + e.message); }
if (errs.length) fails.push('errors: ' + errs.slice(0, 3).join(' || '));
console.log(fails.length ? 'DRILL FAIL\n' + fails.join('\n') : 'DRILL PASS');
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);
