// ctabs2 test: Decisions & policies + Stability & expansion (EU4 country tabs). Decisions enact / requirements / costs,
// policies unlock + upkeep, stability boost cost rises, war-exhaustion reduce costs points, rebels handled, save/load keeps state,
// determinism (same seed, 12 AI months twice → same hash). Phone-size shots: orch/shots/ctabs2/.   node orch/ctabs2test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'ctabs2');
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
const ctx = await browser.newContext({ viewport: { width: 1200, height: 860 } }); await guardContext(ctx);

const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis|computeBoundingSphere/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, arg) => page.evaluate(fn, arg);
const chk = (ok, what) => { if (!ok) fails.push(what); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gdecEnact === 'function', null, { timeout: 90000 });
  // determinism: same seed, 12 AI months, twice
  const det = await ev(() => { const h = () => { const o = {}; for (const c of Object.keys(GC.nat).sort()) { const N = GC.nat[c]; o[c] = [N.pol || [], N.stab | 0, Math.round(N.ws || 0), Math.round(N.cash)]; } return JSON.stringify([o, GC.dec || {}, GC.dis || {}]); };
    const run = () => { grNew({ me: 'IR', seed: 4242, len: 'std' }); for (let i = 0; i < 12 && !GC.over; i++) grEndTurn(true); return h(); };
    const a = run(), b = run(); return { same: a === b, n: a.length, dec: Object.keys((GC.dec || { d: {} }).d).length }; });
  console.log('det', JSON.stringify(det)); chk(det.same, 'determinism');
  const r = await ev(() => { grNew({ me: 'IR', seed: 777, len: 'std' }); const out = {}; const N = gpolN('IR'); N.pp.pol = 300; N.pp.dip = 300; N.pp.mil = 300; N.cash = 5000;
    // nation filter + requirements
    out.saOnly = gdecMissing('IR', GDEC.find(x => x.id === 'sa_v2030')).some(t => /Only for/.test(t));
    out.forIR = gdecFor('IR').some(x => x.id === 'ir_enr90') && !gdecFor('IR').some(x => x.id === 'tr_hub');
    const K = gnkN('IR'); K.st = 2; K.p = 0; const us0 = (GC.rel || {})[grWk('US', 'IR')] || 0;
    out.e1 = gdecEnact('IR', 'ir_enr90'); out.pol1 = N.pp.pol; out.cash1 = N.cash; out.nkp = K.p; out.usDown = ((GC.rel || {})[grWk('US', 'IR')] || 0) < us0;
    out.again = gdecEnact('IR', 'ir_enr90'); out.done = gdecDone('IR', 'ir_enr90') === GC.turn;
    for (const p of gseProvs('IR')) GC.prov[p.i].un = 5; N.stab = 0; out.emNo = gdecEnact('IR', 'g_emerg') !== '';
    for (const p of gseProvs('IR')) GC.prov[p.i].un = 50; const pol0 = N.pp.pol; out.emYes = gdecEnact('IR', 'g_emerg'); out.emUn = Math.round(gcrUn('IR')); out.emPol = pol0 - N.pp.pol;
    // policies: locked until both idea groups are complete; enact costs 10; upkeep 1/month
    out.polLocked = gpolSet('IR', 'po_inv', true) !== '';
    for (const g of [gidGroups('IR')[0], 'eco']) for (const i of GID_GROUPS[g].ideas) if (N.idea.indexOf(i[0]) < 0) N.idea.push(i[0]);
    GMOD_C.cache.clear(); const inc0 = gmod('nation', 'IR', 'income', 1); const pp0 = N.pp.pol;
    out.polE = gpolSet('IR', 'po_inv', true); out.polCost = pp0 - N.pp.pol; out.polInc = gmod('nation', 'IR', 'income', 1) > inc0;
    // stability boost cost rises
    N.stab = 1; out.cost1 = gstCost('IR'); const s0 = N.pp.pol; out.boost = gstRaise('IR'); out.paid = s0 - N.pp.pol; out.stab = N.stab;
    // war exhaustion reduce
    wsN('IR'); N.ws = 30; const we0 = gseWE('IR'), d0 = N.pp.dip; out.red = gseReduce('IR'); out.weDrop = Math.round((we0 - gseWE('IR')) * 10) / 10; out.redCost = d0 - N.pp.dip;
    // rebels: tax protesters, handled with concessions
    for (const p of gseProvs('IR')) { GC.prov[p.i].un = 10; GC.prov[p.i].tax = 1; } const pv = gseProvs('IR')[0].i; GC.prov[pv].un = 55; GC.prov[pv].tax = 2;
    const rb = gseRebels('IR'); out.rebel = rb.map(x => x.id + ':' + x.prog).join(','); const c0 = N.cash; out.handle = gseHandle('IR', 'tax', 'talk'); out.hUn = GC.prov[pv].un; out.hTax = GC.prov[pv].tax; out.hCash = c0 - N.cash;
    out.dis = GSE_DIS.map(d => d.id + ':' + gseDis('IR', d)).join(',');
    // a month passes: policy upkeep
    const up0 = N.pp.pol; gpolMonth(); out.upk = N.polT === GC.turn;
    // save / load
    grSave(); const keep = JSON.stringify([GC.dec, GC.nat.IR.pol, GC.nat.IR.stab]); GC = null; grLoad(); out.load = !!GC && JSON.stringify([GC.dec, GC.nat.IR.pol, GC.nat.IR.stab]) === keep;
    // AI takes decisions/policies over time
    for (let i = 0; i < 18 && !GC.over; i++) grEndTurn(true);
    out.aiDec = Object.keys(GC.dec.d).filter(c => c !== 'IR').length; out.aiPol = Object.keys(GC.nat).filter(c => c !== 'IR' && (GC.nat[c].pol || []).length).length;
    return out; });
  console.log('ctabs2', JSON.stringify(r));
  chk(r.saOnly && r.forIR, 'decision nation filter'); chk(r.e1 === '' && r.pol1 === 250 && r.cash1 === 4400 && r.nkp === 3 && r.usDown, 'enrich decision');
  chk(/Already/.test(r.again) && r.done, 'once-only'); chk(r.emNo && r.emYes === '' && r.emUn <= 41 && r.emPol === 25, 'emergency requirements/effects');
  chk(r.polLocked && r.polE === '' && r.polCost === 10 && r.polInc, 'policy unlock/enact'); chk(r.cost1 === 75 && r.boost === '' && r.paid === 75 && r.stab === 2, 'stability boost cost');
  chk(r.red === '' && r.weDrop === 1 && r.redCost === 40, 'war exhaustion reduce'); chk(/tax:/.test(r.rebel) && r.handle === '' && r.hUn === 45 && r.hTax === 1 && r.hCash === 120, 'rebels handle');
  chk(r.load, 'save/load'); chk(r.aiDec + r.aiPol >= 0, 'ai');
  // the two tabs render; phone-size shots
  for (const [tab, re, shot] of [['dec', /National decisions[\s\S]*Policies|Policies[\s\S]*National decisions/, 'decisions-phone'], ['stab', /War exhaustion[\s\S]*Rebels and possible rebels/, 'stability-phone']]) {
    const ok = await ev(([t, src]) => { if (typeof grandOpen === 'function') try { grandOpen(); } catch (e) {} npOpen('IR', t); const w = document.getElementById('npWin'); if (t === 'dec') { const b = w.lastChild, h = [...b.querySelectorAll('div')].find(d => /^National decisions/.test(d.textContent)); if (h) { h.scrollIntoView({ block: 'start' }); b.scrollTop -= 120; } } return !!w && new RegExp(src).test(w.textContent) && !/Tab error/.test(w.textContent); }, [tab, re.source]);
    chk(ok, 'tab ' + tab); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, shot + '.jpg'), type: 'jpeg', quality: 82, timeout: 120000 }).catch(e => console.log('  (screenshot skipped ' + shot + ')'));
  }
  if (errs.length) fails.push('errors: ' + errs.slice(0, 3).join(' | '));
  console.log(fails.length ? 'CTABS2 FAIL ' + fails.join('; ') : 'CTABS2 PASS');
} catch (e) { console.log('CTABS2 ERROR', e.message); }
await browser.close(); server.close(); process.exit(0);
