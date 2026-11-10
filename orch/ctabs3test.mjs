// ctabs3: Estates + Subjects tabs (EU4-style): node orch/ctabs3test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'ctabs3');
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
  await page.waitForFunction(() => typeof gsbMonth === 'function' && typeof gsMonth === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const out = {};
    grNew({ me: 'IR', seed: 31, len: 'std' });
    // estates: per-regime groups with realistic starting values
    const N = gsN('IR'); out.irList = gsList('IR').map(e => e[0]).join(',');
    out.irGuard = !!N.est.guard && N.est.guard.land === 25 && N.est.guard.loy === 75;
    out.usNoClergy = !gsHas('US', 'clergy') && !gsHas('US', 'guard'); out.cnParty = gsHas('CN', 'party'); out.iqTribe = gsHas('IQ', 'tribe');
    out.crown = gsCrown('IR') === 100 - 6 - 18 - 8 - 3 - 25;
    // privileges apply GMOD rows (benefit + drawback) and hand the group control
    const inc0 = gmod('nation', 'IR', 'income', 1), l0 = N.est.biz.loy, land0 = N.est.biz.land, inf0 = gsInfl('IR', 'biz');
    gsPriv('IR', 'pv_b1', true); GMOD_C.cache.clear();
    out.privRow = gmodRows('nation', 'IR', 'income').some(x => x.id === 'pv_b1b') && gmodRows('nation', 'IR', 'unrest').some(x => x.id === 'pv_b1c');
    out.privInc = gmod('nation', 'IR', 'income', 1) > inc0; out.privLoy = N.est.biz.loy === l0 + 10 && N.est.biz.land === land0 + 5 && gsInfl('IR', 'biz') > inf0;
    out.notOwn = gsPriv('US', 'pv_g1', true) !== '';   // no Guard in the US
    gsPriv('IR', 'pv_b1', false); out.revoke = N.est.biz.land === land0 && !N.priv.includes('pv_b1');
    // loyalty drifts monthly; seizing assets lowers equilibrium
    N.esT = null; const gl = N.est.guard.loy; gsLand('IR', 'guard', true); out.seize = N.est.guard.land === 20 && N.est.guard.loy === gl - 15 && gsLand('IR', 'guard', true) !== '';
    for (let i = 0; i < 6; i++) { GC.turn++; gmodMonth(GC.turn); }
    out.drift = N.est.guard.loy < 75 && N.est.guard.loy > 30;
    // agendas exist and resolve
    out.agenda = gsList('IR').some(e => N.est[e[0]].ag || N.est[e[0]].agT != null);
    const w = gsList('IR').find(e => N.est[e[0]].ag); if (w) { out.refuse = gsAgRefuse('IR', w[0]) === '' && !N.est[w[0]].ag; } else out.refuse = true;
    // crisis through the one event engine: disloyal + influential => pending event for the human
    N.est.work.loy = 5; N.est.work.land = 40; N.esc = null; GC.ev && (GC.ev.pend = []); gsMonth();
    out.crisis = GC.ev.pend.some(p => p[0] === 'IR' && p[1] === 'es_work'); const lw = N.est.work.loy;
    gevChoose('IR', 'es_work', 0); out.crisisFx = N.est.work.loy > lw;
    // subjects: Syria is Turkey's vassal; interactions
    out.sy = gsbIsSub('TR', 'SY');
    const T = GC.nat.TR, S = GC.nat.SY; T.cash = 5000; S.cash = 3000; S.inc = 200; if (S.e) S.e.man = 100; if (T.e) T.e.man = 10;
    const lib0 = gsbLib('TR', 'SY'); gsbSupport('TR', 'SY', 1); out.support = gsbLib('TR', 'SY') === Math.max(0, lib0 - 12) || lib0 <= 12;
    gdRel('SY', 'TR', 60);
    const d = gsbDemand('TR', 'SY'); out.demand = d === '' && gsbRec('SY').men > 0 && gsbDemand('TR', 'SY') !== '';
    const c0 = T.cash, cs0 = S.cash; gsbMonth(); out.monthly = T.cash !== c0 && S.cash !== cs0;
    // aid partners (IR funds three allied movements at the start)
    out.cli = gsbClis('IR').length >= 3; const op0 = gsbOp('RS', 'IR'); gsbAid('IR', 'RS', -3); out.cut = !gsbClis('IR').some(x => x[1] === 'RS') && gsbOp('RS', 'IR') < op0;
    // integration (annex) — slow and costly
    gsbRec('SY').dem = -99; gdRel('SY', 'TR', 100); T.pp = T.pp || { pol: 0, dip: 0, mil: 0 }; T.pp.pol = 200; T.cash = 9000;
    for (const k of Object.keys(GC.war)) if (k.split('|').includes('TR')) delete GC.war[k];
    const ie = gsbIntegrate('TR', 'SY'); out.intStart = ie === '' || /liberty|opinion/.test(ie); out.intWhy = ie;
    if (ie === '') { gsbRec('SY').int.t = GC.turn; T.pp.pol = 200; T.cash = 9000; gsbMonth(); out.annexed = !!GC.nat.SY.dead && !gsbIsSub('TR', 'SY'); } else out.annexed = true;
    // save / load round trip keeps estates + subjects
    const js = JSON.stringify(GC); const G2 = JSON.parse(js); out.save = G2.nat.IR.est.guard.land === N.est.guard.land && JSON.stringify(G2.cli) === JSON.stringify(GC.cli);
    // determinism: two identical AI runs give identical estates/subjects
    const run = () => { grNew({ me: null, seed: 77, len: 'std' }); for (let i = 0; i < 18; i++) { GC.turn++; gmodMonth(GC.turn); }
      return JSON.stringify([Object.keys(GC.nat).sort().map(c => [c, GC.nat[c].est, GC.nat[c].priv]), GC.sub, GC.cli, GC.vas]); };
    const a = run(), b = run(); out.det = a === b; out.detLen = a.length;
    return out; });
  console.log('ctabs3test', JSON.stringify(r));
  for (const k of ['irGuard', 'usNoClergy', 'cnParty', 'iqTribe', 'crown', 'privRow', 'privInc', 'privLoy', 'notOwn', 'revoke', 'seize', 'drift', 'agenda', 'refuse', 'crisis', 'crisisFx', 'sy', 'support', 'demand', 'monthly', 'cli', 'cut', 'intStart', 'annexed', 'save', 'det'])
    if (!r[k]) fails.push('check ' + k);
  // UI: both tabs render without errors; phone-size pictures (<=1200 px)
  await page.setViewportSize({ width: 1200, height: 900 });
  const shots = path.join(ROOT, 'orch', 'shots', 'ctabs3'); fs.mkdirSync(shots, { recursive: true });
  for (const [me, tab, f] of [['IR', 'estates', 'estates-phone.jpg'], ['TR', 'subj', 'subjects-phone.jpg']]) {
    const ok = await ev(([me, tab]) => { grNew({ me, seed: 31, len: 'std' }); try { grandOpen(); } catch (e) {}
      if (me === 'IR') { for (let i = 0; i < 3; i++) { GC.turn++; gmodMonth(GC.turn); } gsPriv('IR', 'pv_c1', true); }
      if (me === 'TR') { gsbAid('TR', 'AZ', 1); gsbSupport('TR', 'SY', 1); }
      npOpen(me, tab); const w = document.getElementById('npWin'); return !!w && !/Tab error/.test(w.textContent) && w.textContent.length > 200; }, [me, tab]);
    if (!ok) fails.push('tab ' + tab + ' did not render');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(shots, f), type: 'jpeg', quality: 80, timeout: 120000 }).catch(e => console.log('(shot skipped ' + f + ')'));
  }
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
if (fails.length) { console.log('CTABS3 FAIL', fails.join('\n')); process.exit(1); }
console.log('CTABS3 PASS');
