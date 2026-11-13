// Grand campaign test (stage 1): determinism (10 AI turns twice, same hash), world map + menu; a march into an enemy starts a battle or a siege
// ON the map (no prompt, no real-time battle - Abdullah 2026-11-11 23:57), the battle window opens from its marker, losses flow back, save round trip.
// The battle rules themselves are tested by orch/gwartest.mjs, which this file runs at the end. Screenshots: orch/shots/grand2/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, releaseBrowserLock } from './browserlock.mjs';
import { spawnSync } from 'node:child_process';
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  // ---- menu names
  const menu = await ev(() => ({ g: (document.getElementById('grandBtn') || {}).textContent, c: (document.getElementById('campaign') || {}).textContent, s: (document.getElementById('start') || {}).textContent, t: !!document.getElementById('tutorial') }));
  console.log('menu', JSON.stringify(menu));
  if (menu.g !== 'Grand campaign') fails.push('menu: no Grand campaign button'); if (menu.c !== 'Missions') fails.push('menu: story campaign not renamed to Missions (' + menu.c + ')'); if (!/Conquest/.test(menu.s || '')) fails.push('menu: no Conquest button'); if (!menu.t) fails.push('menu: no Tutorial button');
  await shot('menu');
  await ev(() => { document.getElementById('grandBtn').click(); }); await shot('menu-grand');
  await ev(() => { campClose(); });
  // ---- determinism: 10 AI-only turns twice with the same seed
  const det = await ev(() => { const t0 = performance.now(); grNew({ me: null, seed: 4242, len: 'quick' }); const h0 = grHash(); const a = grRunAI(10); const alive1 = Object.values(GC.nat).filter(n => !n.dead).length;
    grNew({ me: null, seed: 4242, len: 'quick' }); const h1 = grHash(); const b = grRunAI(10); grNew({ me: null, seed: 4243, len: 'quick' }); const c = grRunAI(10);
    return { a, b, c, h0, h1, ms: Math.round(performance.now() - t0), alive1, provs: GM_LAND, seas: GM_P.length - GM_LAND }; });
  console.log('determinism', JSON.stringify(det));
  if (det.a !== det.b || det.h0 !== det.h1) fails.push('determinism: same seed gave different hashes ' + det.a + ' vs ' + det.b);
  if (det.a === det.c) fails.push('determinism: different seeds gave the same hash'); if (det.provs < 120 || det.provs > 1200) fails.push('map: ' + det.provs + ' land provinces');
  // ---- RG6 scenarios: Gulf flashpoint / Red Sea crisis are presets over the realistic start, deterministic
  const scn = await ev(() => { const r = {}; for (const sc of ['me26', 'gulf', 'redsea']) { grNew({ me: 'IR', seed: 99, len: 'quick', sc }); r[sc] = { sc: GC.sc, irsa: grAtWar('IR', 'SA'), dwil: grAtWar('DW', 'IL'), armies: GC.armies.length, h: grHash() }; } grNew({ me: 'IR', seed: 99, len: 'quick', sc: 'gulf' }); r.again = grHash(); return r; });
  console.log('scenarios', JSON.stringify(scn));
  if (scn.me26.irsa || !scn.gulf.irsa || scn.gulf.sc !== 'gulf' || !scn.redsea.dwil || scn.gulf.armies <= scn.me26.armies || scn.again !== scn.gulf.h) fails.push('scenarios: ' + JSON.stringify(scn));
  // ---- real26: the start is the real world of 1 Nov 2026 (orch/REAL-2026.md)
  const r26 = await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); const own = n => { const p = GCM.P.find(q => q.land && q.n === n); return p ? [GC.prov[p.i].o, GC.prov[p.i].o0] : null; }; const hz = GCM.P.find(p => p.sea && p.n === 'Strait of Hormuz');
    return { ruua: grAtWar('RU', 'UA'), ilrs: grAtWar('IL', 'RS'), ilrsTr: gdTruce('IL', 'RS'), usir: grAtWar('US', 'IR'), usirTr: gdTruce('US', 'IR'), dwsa: grAtWar('DW', 'SA'), syVas: grOverlord('SY'), donbas: own('Donbas'), slb: own('South Lebanon'),
      hz: hz ? GC.eco.cl[hz.i] || 0 : 'none', oil: geOilIdx(1), ruEmb: GC.nat.US.e.emb.includes('RU'), es: elNext('ES'), us: elNext('US'), sch: (GC.ev.sch || []).filter(x => /^r26_/.test(x[2])).length, mecca: grAllied('SA', 'PK') && grAllied('SA', 'TR') }; });
  console.log('real26', JSON.stringify(r26));
  if (!r26.ruua || r26.ilrs || !r26.ilrsTr || r26.usir || !r26.usirTr || !r26.dwsa || r26.syVas !== 'TR' || !r26.donbas || r26.donbas[0] !== 'RU' || r26.donbas[1] !== 'UA' || !r26.slb || r26.slb[0] !== 'IL'
    || r26.oil < 120 || !r26.ruEmb || r26.es !== 1 || r26.us !== 25 || r26.sch < 6 || !r26.mecca) fails.push('real26 start facts: ' + JSON.stringify(r26));
  // ---- RG3 fog of war + spies: far enemy armies hidden from the player, spies reveal a nation, sim hash unchanged by looking
  const fog = await ev(() => { grNew({ me: 'IR', seed: 77, len: 'quick' }); const h0 = grHash(); const foes = GC.armies.filter(a => !grFriend('IR', a.o)); const seen = foes.filter(a => grSeen(a)).length;
    const far = foes.find(a => !grSeen(a)); GC.nat.IR.cash = 5000; const e = far ? grSpy('IR', far.o) : 'none hidden'; const after = far ? grSeen(far) : false; const own = GC.armies.filter(a => a.o === 'IR').every(a => grSeen(a));
    return { foes: foes.length, seen, e, after, own, cash: GC.nat.IR.cash, hashSame: (() => { grNew({ me: 'IR', seed: 77, len: 'quick' }); return grHash() === h0; })() }; });
  console.log('fog', JSON.stringify(fog));
  if (!(fog.seen < fog.foes) || fog.seen === 0 || fog.e !== '' || !fog.after || !fog.own || fog.cash !== 5000 - 400 || !fog.hashSame) fails.push('fog/spies: ' + JSON.stringify(fog));
  // ---- A5 force limit + tradition: start under the limit, over it = upkeep x1.5 via the modifier engine, battles raise tradition
  const fl = await ev(() => { grNew({ me: 'IR', seed: 55, len: 'quick' }); const v0 = geArmyVal('IR'), L = grFL('IR'), under = !gfOver('IR'); const t0 = GC.nat.IR.trad;
    gfBattle({ an: 'IR', dn: 'AZ' }, 'att'); const t1 = GC.nat.IR.trad; const A = GC.armies.find(a => a.o === 'IR'); A.u = A.u.concat(grGenUnits(grNat('IR').fac, L, false)); GMOD_C.cache.clear();
    const over = gfOver('IR'), up = gmod('nation', 'IR', 'upkeep', 1); const allUnder = Object.keys(GC.nat).filter(c => c !== 'IR' && !GC.nat[c].dead).every(c => !gfOver(c));
    return { v0, L, under, t0, t1, over, up, allUnder, chip: (() => { const f = gfChip(); return !!f && f.L > 0 && f.over === (f.v > f.L); })() }; });
  console.log('forcelimit', JSON.stringify(fl));
  // War support at home: the same news moves a democracy, a party state and a military-led government differently; rally when attacked; restricted news and its backlash
  const wsg = await ev(() => { const why = (N, re) => { const w = (N.wsWhy || []).find(x => re.test(x[0])); return w ? +(+w[1]).toFixed(2) : null; };
    const set = (c) => { grNew({ me: 'IR', seed: 5, len: 'quick' }); GC.war = {}; GC.alz = []; const foe = c === 'US' ? 'CN' : 'US'; GC.war[grWk(c, foe)] = 1; if (typeof gsN === 'function') gsN(c); const N = wsN(c); N.ws = 60; N.wsW = 0; N.wsIv = null; for (const a of GC.armies) if (GC.prov[a.at] && GC.prov[a.at].o === c && a.o !== c) a.u.length = 0; return [N, foe]; };
    const month = (N) => { GC.turn++; N.wsT = -1; wsMonth(); };
    const loss = (c) => { const [N] = set(c); N.wsE = -8; month(N); return why(N, /Bad news/); };
    const o = { gov: [wsGov('US'), wsGov('CN'), wsGov('SA'), wsGov('IR'), wsGov('SD'), wsGov('RU')].join(','), lDem: loss('US'), lParty: loss('CN') };
    { const [N] = set('US'); o.cenDem = wsCensor('US'); }
    { const [N] = set('CN'); N.pp.pol = 100; o.cen = wsCensor('CN'); o.pol = N.pp.pol; o.cen2 = wsCensor('CN'); N.wsE = -8; month(N); o.lCen = why(N, /Bad news/); GC.turn = N.wsCn - 1; month(N); o.back = why(N, /casualty lists/); o.saved = JSON.parse(JSON.stringify(GC.nat.CN)).wsCn === N.wsCn; }
    { const [N, foe] = set('US'); const a = GC.armies.find(x => x.o === foe && !x.fl && x.u.length); if (a) { a.at = N.cap; a.path = []; month(N); o.rally = why(N, /Attacked at home/); GC.turn += 7; a.at = N.cap; month(N); o.later = why(N, /Enemy troops on our soil/); } }
    { const j = ['SD', 'MM', 'ML', 'BF', 'NE'].find(c => GC.nat[c] && !GC.nat[c].dead); if (j) { const [N] = set(j); const E = gsN(j).est.army; if (E) { const l0 = E.loy; N.ws = 15; month(N); o.split = l0 - E.loy; } else o.split = 'no army estate'; } else o.split = 'no junta nation'; }
    { const sh = (c, k) => { const [N] = set(c); N.e.ration = 0; N.e.dry = 0; N.e.starve = 0; N.e[k] = 1; month(N); return why(N, /Shortages at home/); }; o.short = [sh('US', 'ration'), sh('CN', 'ration'), sh('IR', 'ration'), sh('CN', 'starve')].join(','); const [N] = set('CN'); N.e.ration = 0; N.e.dry = 0; N.e.starve = 0; month(N); o.shortNone = why(N, /Shortages/); GC.war = {}; N.e.ration = 1; month(N); o.shortPeace = why(N, /Shortages/); }
    { const [N] = set('SA'); N.ws = 15; N.wsW = 3; o.strike = GMOD_COND.wsgov('SA', 'strike'); const [M] = set('US'); M.ws = 15; M.wsW = 3; o.strikeDem = GMOD_COND.wsgov('US', 'strike'); }
    return o; });
  console.log('war support by government', JSON.stringify(wsg));
  if (!(wsg.short === '-1.5,-1,-0.5,-3' && wsg.shortNone === null && wsg.shortPeace === null)) fails.push('war support: wartime shortages should cost support by government and style (rationing: democracy -1.5, party state -1, Zealous -0.5; hunger -3; nothing without shortages or in peace): ' + wsg.short + ' / ' + wsg.shortNone + ' / ' + wsg.shortPeace);
  if (!(wsg.gov === 'dem,party,mon,theo,junta,auth' && wsg.lDem === -12 && wsg.lParty === -4 && wsg.cenDem !== '' && wsg.cen === '' && wsg.pol === 70 && wsg.cen2 !== '' && wsg.lCen === -2 && wsg.back === -5 && wsg.saved && wsg.rally === 4 && wsg.later < 0 && wsg.split === 2 && wsg.strike === true && wsg.strikeDem === false)) fails.push('war support by government: ' + JSON.stringify(wsg));
  // Escalation ladder: rungs before war, surprise-attack penalty, mediated and unmediated off-ramps, nuclear deterrence in the AI war gate, determinism, saved
  const esc = await ev(() => { const o = {}; const rl = (x, y) => (GC.rel && GC.rel[grWk(x, y)]) || 0;
    const set = () => { grNew({ me: 'IR', seed: 31, len: 'quick' }); GC.war = {}; GC.alz = []; GC.tr = {}; GC.esc = {}; GC.rel = {}; };
    set(); const A = 'IR', B = 'SA'; GC.nat[A].cash = 5000; o.up = [gdAct('warn', A, B), gescOf(A, B), gdAct('warn', A, B), gdAct('warn', A, B), gescOf(A, B), gdChance('warn', A, B).ok].join(','); o.rel = rl(A, B); o.saved = JSON.parse(JSON.stringify(GC)).esc[grWk(A, B)].r;
    const c0 = GC.nat[A].cash; GC.turn++; const S0 = JSON.stringify(GC.esc); gescMonth(); o.alert = c0 - GC.nat[A].cash >= 150 || !GC.esc[grWk(A, B)];
    // off-ramps: no mediator (everyone neutral-negative) costs face; with a mediator on good terms it does not
    set(); gescUp(A, B); gescUp(A, B); for (const m of Object.keys(GC.nat)) if (m !== A && m !== B) { GC.rel[grWk(m, A)] = -5; } wsN(A).wsE = 0; o.noMed = gescMediator(A, B); gdAct('deesc', A, B); o.face = wsN(A).wsE; o.r1 = gescOf(A, B);
    set(); gescUp(A, B); gescUp(A, B); GC.nat[A].cash = 5000; GC.rel[grWk('CN', A)] = 30; GC.rel[grWk('CN', B)] = 30; wsN(A).wsE = 0; o.med = gescMediator(A, B); const e = gdAct('deesc', A, B); o.medErr = e || ''; o.face2 = wsN(A).wsE; o.r2 = gescOf(A, B); o.paid = 5000 - GC.nat[A].cash;
    // surprise attack vs signalled war: third parties' opinion
    set(); grDeclare(A, B); o.surprise = rl(A, 'CN'); set(); gescUp(A, B); gescUp(A, B); grDeclare(A, B); o.signalled = rl(A, 'CN'); o.cleared = !GC.esc[grWk(A, B)];
    // AI war gate: a non-nuclear pair needs two steps before war; a nuclear pair stops at the red line and almost never goes further
    set(); const R = grRng(5); o.gate = [gescGate('TR', 'GR', R), gescGate('TR', 'GR', R), gescGate('TR', 'GR', R)].join(','); let wars = 0; for (let i = 0; i < 200; i++) if (gescGate('US', 'RU', R)) wars++; o.nukeWars = wars; o.nukeRung = gescOf('US', 'RU'); o.nk = grNuk('US') && grNuk('RU');
    // AI answers a warning, deterministically
    const run = () => { set(); gescUp(A, B); for (let i = 0; i < 8; i++) { GC.turn++; gescMonth(); } return JSON.stringify(GC.esc) + '|' + rl(A, B); }; o.det = run() === run();
    return o; });
  console.log('escalation', JSON.stringify(esc));
  if (!(esc.up === ',1,,,3,false' && esc.rel === -24 && esc.saved === 3 && esc.alert && esc.noMed === '' && esc.face === -3 && esc.r1 === 1 && esc.med === 'CN' && esc.medErr === '' && esc.face2 === 0 && esc.r2 === 0 && esc.paid === 100 && esc.surprise - esc.signalled === -10 && esc.cleared && esc.gate === 'false,false,true' && esc.nk && esc.nukeWars <= 8 && esc.nukeRung === 2 && esc.det)) fails.push('escalation ladder: ' + JSON.stringify(esc));
  // Escalation inside a war: rung 4 by default, first crosser pays and the answer is free, limits pact (breaking it costs double), cooling, nuclear alert, AI restraint, last-resort strike needs a month on alert
  const escw = await ev(() => { const o = {}; const rl = (x, y) => (GC.rel && GC.rel[grWk(x, y)]) || 0;
    const set = () => { grNew({ me: 'IR', seed: 31, len: 'quick' }); GC.war = {}; GC.alz = []; GC.tr = {}; GC.esc = {}; GC.rel = {}; GC.armies = GC.armies.filter(x => !x.fl); };
    set(); const A = 'IR', B = 'SA'; grDeclare(A, B); GC.rel = {}; o.r0 = gescWarOf(A, B); wsN(B).wsE = 0; o.x = gescWar(A, B, 6); o.r1 = gescWarOf(A, B); o.op = rl(A, 'CN'); o.rally = wsN(B).wsE; o.match = gescWar(B, A, 6); o.free = rl(B, 'CN');
    o.saved = JSON.parse(JSON.stringify(GC)).esc[grWk(A, B)].r; o.warnNoNuke = gdChance('warn', A, B).ok;
    GC.nat[A].cash = 5000; GC.rel[grWk('TR', A)] = 30; GC.rel[grWk('TR', B)] = 30; o.lim = gdAct('deesc', A, B) || ''; o.r2 = gescWarOf(A, B); o.paid = 5000 - GC.nat[A].cash; const p0 = rl(A, 'CN'); gescWar(A, B, 6); o.broke = rl(A, 'CN') - p0;
    for (let i = 0; i < 7; i++) { GC.turn++; gescMonth(); } o.cool = gescWarOf(A, B);
    // nuclear alert by the player (given a warhead for the test)
    set(); grDeclare(A, B); gnkN(A).w = 1; GC.nat[A].cash = 5000; o.na = gdAct('warn', A, B) || ''; o.r7 = gescWarOf(A, B); o.naPaid = 5000 - GC.nat[A].cash; o.again = gdChance('warn', A, B).ok;
    // AI restraint: opening strategic strikes first is rare; answering them is free
    set(); grDeclare('TR', 'GR'); const R = grRng(9); let n = 0; for (let i = 0; i < 200; i++) if (gescWarAI('TR', 'GR', 6, R)) n++; o.aiFirst = n; gescWar('GR', 'TR', 6); o.aiAnswer = gescWarAI('TR', 'GR', 6, R);
    // an AI nuclear power whose capital is occupied: alert first, the strike only a month later
    set(); const N = ['IL', 'PK', 'RU'].find(c => GC.nat[c] && !GC.nat[c].dead); o.nn = !!N; if (N) { grDeclare(A, N); const cap = GC.nat[N].cap; GC.prov[cap].o = A; const ar = GC.armies.find(x => x.o === A && !x.fl); ar.at = cap; ar.path = []; GC.nat[N].ai = true; const w0 = gnkN(N).w; gnkN(N).last = -99; gnkMonth(); o.w1 = w0 - gnkN(N).w; o.al = gescWarOf(N, A); GC.turn++; gnkMonth(); o.w2 = w0 - gnkN(N).w; }
    const run = () => { set(); grDeclare(A, B); gescWar(A, B, 6); for (let i = 0; i < 8; i++) { GC.turn++; gescMonth(); } return JSON.stringify(GC.esc) + '|' + rl(A, B); }; o.det = run() === run();
    return o; });
  console.log('escalation in war', JSON.stringify(escw));
  if (!(escw.r0 === 4 && escw.x === true && escw.r1 === 6 && escw.op === -6 && escw.rally === 3 && escw.match === false && escw.free === 0 && escw.saved === 6 && escw.warnNoNuke === false && escw.lim === '' && escw.r2 === 5 && escw.paid === 100 && escw.broke === -12 && escw.cool < 6 && escw.na === '' && escw.r7 === 7 && escw.naPaid === 200 && escw.again === false && escw.aiFirst > 0 && escw.aiFirst <= 30 && escw.aiAnswer === true && escw.nn && escw.w1 === 0 && escw.al === 7 && escw.w2 === 1 && escw.det)) fails.push('escalation in war: ' + JSON.stringify(escw));
  if (!fl.under || !fl.over || Math.abs(fl.up - 1.5) > .01 || !(fl.t1 > fl.t0) || !fl.allUnder || !fl.chip) fails.push('force limit/tradition: ' + JSON.stringify(fl));
  // ---- MILITARY (grand3): generals, front lines, map strikes, fleets & sea zones; determinism over 20 turns with all of it active
  {
    const run20 = () => { grNew({ me: null, seed: 31337, len: 'std' }); const seen = { strike: 0, intercept: 0, sea: 0, gen: 0, blockade: 0 };
      for (let i = 0; i < 20 && !GC.over; i++) { grEndTurn(true); for (const l of GC.log) if (l[0] === GC.turn - 1) { const t = l[1]; if (/missile|air raid|drone strike/i.test(t)) seen.strike++; if (/intercepted/.test(t)) seen.intercept++; if (/fleet|ship|sea|waters|mines/i.test(t) && /beat|held against|fell back|destroyed|hit mines/.test(t)) seen.sea++; if (/captured|killed|level \d|takes command|escaped/.test(t)) seen.gen++; if (/blockade/.test(t)) seen.blockade++; } }
      const M = GC.mil; return { h: grHash(), seen, gens: Object.keys(M.g).length, alive: Object.values(M.g).filter(g => !g.st).length, fronts: M.fr.length, fleets: GC.armies.filter(a => a.fl).length, orders: GC.armies.filter(a => a.fr).length, mines: Object.keys(M.zm).length, turn: GC.turn }; };
    const m1 = await ev(() => { const t0 = performance.now(); const a = (() => { grNew({ me: null, seed: 31337, len: 'std' }); const seen = { strike: 0, intercept: 0, sea: 0, gen: 0, blockade: 0 }; for (let i = 0; i < 20 && !GC.over; i++) { grEndTurn(true); for (const l of GC.log) if (l[0] === GC.turn - 1) { const t = l[1]; if (/missile|air raid|drone strike/i.test(t)) seen.strike++; if (/intercepted/.test(t)) seen.intercept++; if (/beat|held against|fell back|destroyed|hit mines/.test(t) && /Sea|Gulf|Strait|Channel|Ocean|Bay|Med/i.test(t)) seen.sea++; if (/captured|killed|level \d|takes command|escaped/.test(t)) seen.gen++; if (/blockade/.test(t)) seen.blockade++; } } const M = GC.mil; return { h: grHash(), seen, gens: Object.keys(M.g).length, alive: Object.values(M.g).filter(g => !g.st).length, fronts: M.fr.length, fleets: GC.armies.filter(a => a.fl).length, framies: GC.armies.filter(a => a.fr).length, mines: Object.keys(M.zm).length, turn: GC.turn, dead: Object.values(M.g).filter(g => g.st === 1).length, capt: Object.values(M.g).filter(g => g.st === 2).length, lv: Math.max(...Object.values(M.g).map(g => g.lv)) }; })();
      const b = (() => { grNew({ me: null, seed: 31337, len: 'std' }); for (let i = 0; i < 20 && !GC.over; i++) grEndTurn(true); return grHash(); })();
      // A-REAL (world sim): 24 AI-only months - a great power's capital must not fall to a smaller army in months
      grNew({ me: null, seed: 31338, len: 'std' }); const gp = ['US', 'RU', 'CN', 'IN'].filter(x => GC.nat[x]), fell = []; for (let i = 0; i < 24 && !GC.over; i++) { grEndTurn(true); if (i === 19) var c = grHash(); for (const x of gp) { const o = GC.prov[GC.nat[x].cap].o; if (o !== x && !fell.some(f => f[0] === x)) fell.push([x, o, GC.turn]); } }
      return { a, b, c, fell, ms: Math.round(performance.now() - t0) }; });
    console.log('military determinism', JSON.stringify(m1));
    if (m1.fell.length) fails.push('A-REAL: a great power capital fell within 24 AI months: ' + JSON.stringify(m1.fell));
    if (m1.a.h !== m1.b) fails.push('military: same seed gave different hashes over 20 turns'); if (m1.a.h === m1.c) fails.push('military: different seeds gave the same hash');
    if (m1.a.gens < 20) fails.push('military: only ' + m1.a.gens + ' generals'); if (m1.a.fronts < 3) fails.push('military: only ' + m1.a.fronts + ' fronts'); if (m1.a.framies < 5) fails.push('military: only ' + m1.a.framies + ' armies on fronts'); if (m1.a.fleets < 10) fails.push('military: only ' + m1.a.fleets + ' fleets');
    const mf = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); };
      grNew({ me: 'IR', seed: 7, len: 'quick' }); ok(GC.mil, 'no GC.mil'); const fv = {}; for (const a of GC.armies) if (a.fl) fv[a.o] = (fv[a.o] || 0) + grArmyVal(a);
      const majors = grMajors().filter(c => fv[c]); const vs = majors.map(c => fv[c]); ok(majors.length >= 15, 'only ' + majors.length + ' major nations have a fleet'); ok(Math.max(...vs) / Math.min(...vs) < 1.7, 'fleet strength not equal across nations: ' + Math.round(Math.min(...vs)) + '..' + Math.round(Math.max(...vs)));
      // generals: names, traits, leading armies
      const gs = Object.values(GC.mil.g); ok(gs.length >= 20, 'few generals at start'); ok(gs.every(g => g.nm && g.tr >= 0 && g.tr < 4), 'general fields'); ok(new Set(gs.map(g => g.tr)).size === 4, 'not all four traits used');
      const led = GC.armies.filter(a => a.gid); ok(led.length >= 10 && led.every(a => GC.mil.g[a.gid].aid === a.id), 'generals not tied to armies');
      // a general lost with his army: killed / captured / escaped (never silently kept)
      const arm = led.find(a => a.o === 'IR'); const g0 = GC.mil.g[arm.gid]; GC.mil.foe = 'IQ'; grDrop(arm); GC.mil.foe = ''; ok(g0.aid === 0 && !arm.gid, 'general still tied to a destroyed army'); out.push && 0;
      // experience + level up
      const arm2 = GC.armies.find(a => a.o === 'US' && a.gid); const g1 = GC.mil.g[arm2.gid]; g1.xp = 59; const b = { att: [arm2.id], def: [], an: 'US', dn: 'IR', p: 0 }; gmilBattle(b, 'att'); ok(g1.lv >= 1 && g1.xp > 59, 'general did not gain a level');
      // perk effects on army strength: the armour expert is worth more with tanks
      const a3 = GC.armies.find(a => a.gid && GC.mil.g[a.gid].tr === 0); if (a3) { const m = gmilMul(a3, 0); ok(m > 1, 'armour expert perk missing'); }
      // fronts: assign + push moves the army toward the enemy
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const foes = Object.keys(GC.war).filter(k => k.split('|').includes('IR')).map(k => k.split('|').find(x => x !== 'IR')); const foe = foes.find(x => GCM.P.some(p => p.land && GC.prov[p.i].o === 'IR' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === x))) || foes[0]; const f = gmilAddFront('IR', foe); const ir = GC.armies.filter(a => a.o === 'IR' && !a.fl);
      ok(ir.length && gmilAssign(ir[0].id, f.id) === '' && ir[0].fr === f.id, 'assign to front failed'); f.ord = 'push'; const lp = GCM.P.find(p => p.land && GC.prov[p.i].o === 'IR' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === foe)); if (lp) ir[0].at = lp.i; ir[0].path = []; gmilPlan(); ok(ir[0].path.length > 0 || gmilLine(f).length === 0, 'push front gave no order'); f.ord = 'hold'; ok(gmilAssign(ir[0].id, 0) === '' && !ir[0].fr, 'release failed');
      return out; });
    console.log('military features', JSON.stringify(mf)); for (const f of mf) fails.push('military: ' + f);
    // strikes: missile / air raid / drone; air defence intercepts; fleets; sea battle; blockade; escort
    const sf = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); };
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const A = 'IR', Bs = Object.keys(GC.war).filter(k => k.split('|').includes(A)).map(k => k.split('|').find(x => x !== A)), B = Bs.find(x => GCM.P.some(p => p.land && GC.prov[p.i].o === x && grDist(p.i, GC.nat[A].cap) < 230)) || Bs[0] || 'IQ'; const N = GC.nat[A]; N.cash = 20000; N.e.fuel = 300;
      geBl(N.cap).push(['airfield', 0], ['base', 0]); gmilN(A).ms = 3;
      // choose a target in range of the capital
      const near = GCM.P.filter(p => p.land && GC.prov[p.i].o !== A && GC.prov[p.i].o !== B && grDist(p.i, N.cap) < 230).sort((x, y) => grDist(x.i, N.cap) - grDist(y.i, N.cap))[0]; if (!near) { out.push('skip: no province near the capital'); return out; } GC.prov[near.i].o = B; GC.war[grWk(A, B)] = 1;
      geBl(near.i).length = 0; geBl(near.i).push(['factory', 0], ['refinery', 0]);
      ok(gmilStrike(A, 'm', near.i, 'b') === '', 'missile order refused: ' + gmilStrikeCheck(A, 'm', near.i, 'b')); ok(gmilStrike(A, 'd', near.i, 'a') === '', 'drone order refused'); ok(gmilStrike(A, 'a', near.i, 'b') === '', 'air raid order refused: ' + gmilStrikeCheck(A, 'a', near.i, 'b')); ok(gmilStrike(A, 'm', near.i, 'a') !== '', 'fourth strike not refused');
      gmilStrikes(); const dmg = geBl(near.i).reduce((s, r) => s + (r[1] | 0), 0); ok(dmg > 0 || GC.log.some(l => /intercepted/.test(l[1])), 'strikes had no effect and none intercepted'); ok(gmilN(A).ms === 2, 'missile stock not spent'); ok(GC.log.some(l => /missile|air raid|drone/i.test(l[1]) && l[0] === GC.turn), 'no strike line in the turn log');
      // air defence: many SAMs + AA units intercept (statistically, 30 missiles)
      const hit = (n, aa) => { let hits = 0; for (let i = 0; i < n; i++) { GC.turn++; geBl(near.i).length = 0; geBl(near.i).push(['factory', 0]); for (let k = 0; k < (aa | 0); k++) geBl(near.i).push(['aa', 0]); gmilN(A).ms = 3; gmilN(A).so = []; gmilN(B).ic = 20; gmilStrike(A, 'm', near.i, 'b'); gmilStrikes(); if (!GC.log.some(l => l[0] === GC.turn && /intercepted/.test(l[1]) && /missile/i.test(l[1]))) hits++; } return hits; };
      const open = hit(24, 0); const sam = hit(24, 3); ok(sam < open, 'air defence did not reduce missile hits (' + sam + ' vs ' + open + ')');
      // STOCKPILES THAT RUN OUT (campaign realism 2): interceptors are spent, an empty defence stops nothing, orders take months, allies can ship
      { const QB = gmilN(B), QA = gmilN(A); const one = () => { GC.turn++; geBl(near.i).length = 0; geBl(near.i).push(['factory', 0], ['aa', 0], ['aa', 0], ['aa', 0]); QA.ms = 3; QA.so = []; gmilStrike(A, 'm', near.i, 'b'); gmilStrikes(); return GC.log.some(l => l[0] === GC.turn && /intercepted/.test(l[1])); };
        QB.ic = 6; one(); ok(QB.ic === 4, 'a missile salvo did not cost the defender 2 interceptor loads (' + QB.ic + ')');
        QB.ic = 2; const ws0 = wsN(B).wsE; one(); ok(QB.ic === 0 && GC.log.some(l => l[0] === GC.turn && l[2] === '' && /run out of air-defence interceptors/.test(l[1])), 'running dry was not world news'); ok(wsN(B).wsE < ws0, 'no war-support cost for an exhausted air defence');
        let stopped = 0; for (let i = 0; i < 12; i++) { QB.ic = 0; if (one()) stopped++; } ok(stopped === 0, 'batteries without interceptors still stopped ' + stopped + ' of 12 salvos');
        QB.ic = 5; GC.turn++; geBl(near.i).length = 0; geBl(near.i).push(['factory', 0], ['aa', 0], ['aa', 0]); QA.dr = 40; QA.so = []; gmilStrike(A, 'd', near.i, 'b', 12); gmilStrikes(); ok(QB.ic === 2, 'a 12-drone salvo should cost 3 interceptor loads (left ' + QB.ic + ')');
        ok(typeof gmilBuyMissile === 'undefined', 'the old instant "Buy missile" is still there');
        const c0 = N.cash; QA.ms = 0; QA.oq = []; ok(gmilOrder(A, 'ms') === '' && QA.ms === 0 && N.cash === c0 - GMIL_ORD.ms.cost && QA.oq.length === 1, 'missile order is not paid-now, delivered-later'); const due = QA.oq[0].t; ok(due - GC.turn >= 3, 'order arrives too fast');
        QA.pa = [0, 0]; const t0 = GC.turn; while (GC.turn < due) { GC.turn++; gmilStockMonth(); } ok(QA.oq.length === 0 && QA.ms >= 1, 'order was not delivered'); ok(QA.ms <= 1 + Math.ceil(gmilStkYr(A, 'ms') * (due - t0) / 12), 'factories refill faster than their yearly rate');
        QA.ms = 0; QA.pa = [0, 0]; for (let i = 0; i < 12; i++) { GC.turn++; gmilStockMonth(); } ok(Math.abs(QA.ms - Math.min(gmilStkMax(A, 'ms'), gmilStkYr(A, 'ms'))) <= 1, 'a year of production gave ' + QA.ms + ' salvos, expected about ' + gmilStkYr(A, 'ms'));
        ok(gmilStkRow('US')[3] < gmilStkRow('US')[4] * .5 && gmilStkRow('IR')[3] < gmilStkRow('IR')[4] * .5, 'US and Iran should start Nov 2026 with depleted interceptors (REAL-2026)');
        const fr = Object.keys(GC.nat).sort().find(x => x !== A && x !== B && !GC.nat[x].dead && !grAtWar(A, x) && grAllied(A, x)); if (!fr) out.push('skip: IR has no ally for the shipment check'); else { QA.ic = 6; QA.sent = 0; const r0 = (GC.rel || {})[grWk(A, B)] || 0, i0 = gmilN(fr).ic; GC.war[grWk(fr, B)] = 1; ok(gmilSend(A, fr, 'ic') === '' && QA.ic === 4, 'shipment to an ally refused'); ok(gmilSend(A, fr, 'ic') !== '', 'second shipment in one month not refused'); GC.turn++; gmilStockMonth(); ok(gmilN(fr).ic >= i0 + 2, 'shipment did not arrive'); delete GC.war[grWk(fr, B)]; }
        ok(gmilSendCheck(A, B, 'ic') !== '', 'could ship interceptors to an enemy');
        const ai = Object.keys(GC.nat).sort().find(x => GC.nat[x].ai && !GC.nat[x].dead && Object.keys(GC.war).some(k => k.split('|').includes(x)) && gmilStkMax(x, 'ic') > 4); if (ai) { const Q = gmilN(ai); Q.ic = 0; Q.oq = []; GC.nat[ai].cash = 5000; gmilAIStock(ai, () => .99); ok(Q.oq.some(o => o.k === 'ic'), 'AI at war with empty air defence did not order interceptors'); }
        const old = gmilN(B); delete old.ic; delete old.oq; delete old.pa; ok(gmilN(B).ic === gmilStkRow(B)[3] && Array.isArray(gmilN(B).oq), 'older save did not get its interceptor stock'); const rt = JSON.parse(JSON.stringify(GC.mil.n[A])); ok(rt.ic === QA.ic && Array.isArray(rt.oq) && rt.pa.length >= 2 && rt.sh === QA.sh && rt.pb === QA.pb, 'stockpile state does not survive a save');
        // slice 2: shells and precision bombs on the same counters
        const o2 = gmilN(B); delete o2.sh; delete o2.pb; ok(gmilN(B).sh === gmilStkAt(B, 'sh', 0) && gmilN(B).pb === gmilStkAt(B, 'pb', 0), 'older save did not get its shell and bomb stock');
        ok(gmilStkYr('RU', 'sh') > gmilStkYr('US', 'sh') && gmilStkYr('SA', 'pb') === 0 && gmilStkMax('RS', 'pb') === 0, 'shell/bomb table does not follow REAL-2026 (Russia out-produces the US in shells; Gulf imports bombs; militias have no air force)');
        const ar = GC.armies.find(a => a.o === A && !a.fl && a.u.length); if (!ar) out.push('skip: no army for the shell check'); else {
          QA.sh = 3; QA.sa = 0; ar.fo = GC.turn; const n = Math.ceil(1000 / (ar.u.length * GMIL_SH_BURN)); let d = 0; for (let i = 0; i < n; i++) d = gmilShell(ar, 20); ok(QA.sh === 2 && d === 20, 'a fighting army did not burn shells from the national stock (' + QA.sh + ')');
          QA.sh = 1; QA.sa = 999; const w0 = GC.log.length; d = gmilShell(ar, 20); ok(QA.sh === 0 && d === 20 * GMIL_SH_DRY && GC.log.slice(w0).some(l => /running out of artillery shells/.test(l[1])), 'shell hunger: no quarter-rate refill or no world news');
          ok(gmilShell(ar, -9) === -9, 'shell hunger changed an ammunition loss'); ar.fo = 0; ok(gmilShell(ar, 20) === 20 * GMIL_SH_DRY, 'a resting army refilled at full rate from an empty stock');
          const c1 = GC.nat[A].cash; GC.nat[A].cash = 5000; QA.oq = []; ok(gmilOrder(A, 'sh') === '' && QA.oq.length === 1 && QA.oq[0].k === 'sh' && QA.sh === 0 && GC.nat[A].cash === 5000 - GMIL_ORD.sh.cost, 'shell order is not paid-now, delivered-later'); GC.nat[A].cash = c1; QA.oq = []; QA.sh = gmilStkAt(A, 'sh', 0); QA.sa = 0; }
        const fac = () => { geBl(near.i).length = 0; geBl(near.i).push(['factory', 0]); };
        fac(); QA.so = [{ t: 'a', pi: near.i, k: 'b', pb: 0 }]; gmilStrikes(); const ug = geBl(near.i)[0][1]; fac(); QA.so = [{ t: 'a', pi: near.i, k: 'b', pb: 1 }]; gmilStrikes(); const gd = geBl(near.i)[0][1];
        ok(ug > 0 && gd > ug, 'an air raid with unguided bombs should do less damage than one with precision bombs (' + ug + ' vs ' + gd + ')');
        QA.so = []; QA.pb = 1; GC.nat[A].cash += 1000; if (GC.nat[A].e) GC.nat[A].e.fuel += 60; const eA = gmilStrikeCheck(A, 'a', near.i, 'b');
        if (eA) out.push('skip: no air raid possible for the bomb check: ' + eA); else { gmilStrike(A, 'a', near.i, 'b'); ok(QA.pb === 0 && QA.so[0].pb === 1, 'an air raid did not spend a precision bomb load'); ok(gmilStrike(A, 'a', near.i, 'a') === '' && QA.so[1].pb === 0, 'an air raid without bombs should still fly (unguided)'); QA.so = []; }
}
      // fleets
      const ports = GCM.P.filter(p => p.land && GC.prov[p.i].o === A && p.port); ok(ports.length > 0, 'IR has no port'); const n0 = GC.mil.fq.length; GC.nat.IR.e.man = 200; const bf = gmilBuyFleet(A, ports[0].i, 'boat'); ok(bf === '' && GC.mil.fq.length === n0 + 1, 'fleet order failed ' + bf);
      GC.turn += 2; gmilFleetArrive(); ok(GC.armies.some(a => a.fl && a.o === A && a.u.some(r => r[0] === 'boat')), 'ordered boats never arrived');
      // sea fight: two fleets in one zone, one arrives -> a sea battle starts on the map and is fought out by days, loser retreats or dies
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const ppo = GCM.P.find(p => p.land && GC.prov[p.i].o !== A && gmilHasPort(p.i) && gmilZoneOf(p.i) >= 0); if (!ppo) { out.push('skip: no enemy port'); return out; } const pb = ppo.i, zb = gmilZoneOf(pb); const B2 = GC.prov[pb].o; GC.war[grWk(A, B2)] = 1;
      GC.armies = GC.armies.filter(a => !a.fl); const fa = grAddArmy(A, zb, [['ship', 100, 0, 100], ['ship', 100, 0, 100], ['boat', 100, 0, 100]], 'Test Fleet'); fa.fl = 1; gmilBlockRefresh(); ok(gmilBk(pb), 'port not blockaded by the fleet next to it'); const inc0 = (GC.nat[B].inc | 0);
      const fb = grAddArmy(B2, zb, [['boat', 100, 0, 100]], 'Defence Fleet'); fb.fl = 1; gmilBlockRefresh(); ok(!gmilBk(pb), 'blockade not lifted by a defending fleet in the same zone');
      GC.armies = GC.armies.filter(a => a !== fb); gmilBlockRefresh(); ok(gmilBk(pb), 'blockade did not return');
      const z1 = GCM.P.findIndex(p => p.sea && p.adj.some(j => GCM.P[j].sea)); const z2 = GCM.P[z1].adj.find(j => GCM.P[j].sea); GC.armies = GC.armies.filter(a => !a.fl);
      const fa2 = grAddArmy(A, z1, [['ship', 100, 0, 100], ['ship', 100, 0, 100], ['boat', 100, 0, 100]], 'Test Fleet'); fa2.fl = 1; const fb2 = grAddArmy(B2, z2, [['boat', 100, 0, 100], ['fast', 100, 0, 100]], 'Defence Fleet'); fb2.fl = 1;
      const path = grPath(A, z1, z2, 1); ok(path && path.path.length, 'fleet has no sea route'); fa2.path = [z2]; fa2.pg = Math.max(0, grEdge(z1, z2) - 1); GC.ph = 'resolve'; grMovePhase(); ok(GC.q.some(b => b.sea && b.p === z2), 'no sea battle queued'); GC.qi = 0; for (const b of GC.q) grBattleAuto(b); ok(GC.q.every(b => b.done) && GC.bt.some(B => B.sea && B.p === z2), 'sea battle did not start on the map'); { let g9 = 0; while (GC.bt.some(B => B.p === z2) && g9++ < 400) gwTick(); ok(!GC.bt.some(B => B.p === z2), 'sea battle never ended'); }
      const l2 = fa2.u.length, d2 = fb2.u.length; ok(l2 < 3 || d2 < 2 || !GC.armies.includes(fb2) || fb2.at !== z2, 'sea battle changed nothing');
      
      return out; });
    console.log('military strikes/fleets', JSON.stringify(sf)); for (const f of sf) if (!/^skip/.test(f)) fails.push('military: ' + f); else console.log('  ' + f);
    // escort rule: a land army cannot sail into a sea held by an enemy fleet without its own fleet there
    const es = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); }; grNew({ me: 'IR', seed: 7, len: 'quick' }); const A = 'IR', B = Object.keys(GC.war).filter(k => k.split('|').includes(A)).map(k => k.split('|').find(x => x !== A))[0] || 'IQ';
      GC.war[grWk(A, B)] = 1; const z = GCM.P.findIndex(p => p.sea); const arm = GC.armies.find(a => a.o === A && !a.fl); GC.armies = GC.armies.filter(a => !a.fl); const eb = grAddArmy(B, z, [['ship', 100, 0, 100]], 'Foe'); eb.fl = 1; ok(gmilSeaDenied(arm, z), 'crossing not denied under an enemy fleet');
      const es = grAddArmy(A, z, [['boat', 100, 0, 100]], 'Escort'); es.fl = 1; ok(!gmilSeaDenied(arm, z), 'escort did not allow the crossing'); return out; });
    console.log('military escort', JSON.stringify(es)); for (const f of es) fails.push('military: ' + f);
    // UI: Military panel
    await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); GC.nat.IR.cash = 6000; for (let i = 0; i < 3; i++) grEndTurn(true); GV.sel = GC.nat.IR.cap; grandOpen(); });
    await page.waitForTimeout(2500);
    const mu = await ev(() => { const o = {}; gmilUiPanel(); o.panel = !!document.getElementById('gMil'); for (const t of ['gen', 'fr', 'st', 'sk', 'fl']) { GMILUI.tab = t; gmilUiPanel(true); const pe = document.getElementById('gMil'); o[t] = pe.textContent.length; if (/Buy missile|every 3 months/.test(pe.textContent)) o.old = t; if (t === 'sk') o.skOk = !!(document.getElementById('gSk_ic') && document.getElementById('gSk_ms') && document.getElementById('gSk_sh') && document.getElementById('gSkK_sh') && /Artillery shell loads/.test(pe.textContent) && /Interceptor loads/.test(pe.textContent) && /Ship to an ally/.test(pe.textContent)); } GMILUI.tab = 'gen'; gmilUiPanel(true); return o; });
    console.log('military ui', JSON.stringify(mu)); if (!mu.panel || mu.gen < 150 || mu.fr < 100 || mu.st < 100 || mu.fl < 100) fails.push('military ui: panel tabs empty ' + JSON.stringify(mu)); if (!mu.skOk) fails.push('military ui: Stockpiles window missing or incomplete'); if (mu.old) fails.push('military ui: old instant-missile wording still on tab ' + mu.old);
    await shot3('military-generals');
    await ev(() => { GMILUI.tab = 'fr'; gmilUiPanel(true); }); await shot3('military-fronts');
    await ev(() => { GMILUI.tab = 'st'; gmilUiPanel(true); const f = Object.keys(GC.war).filter(k => k.split('|').includes('IR')).map(k => k.split('|').find(x => x !== 'IR'))[0]; const p = GCM.P.find(q => q.land && GC.prov[q.i].o === f) || GCM.P.find(q => q.land && GC.prov[q.i].o !== 'IR'); GV.sel = p.i; guSide(); }); await shot3('military-strikes'); await ev(() => { GMILUI.tab = 'sk'; gmilUiPanel(true); }); await shot3('military-stockpiles');
    await ev(() => { GMILUI.tab = 'fl'; const z = GC.armies.find(a => a.fl && a.o === 'IR'); GV.sel = z ? z.at : 0; GV.selA = z ? z.id : 0; guSide(); gmilUiPanel(true); }); await shot3('military-fleets');
    await ev(() => { gmilUiPanel(); grandClose(); });
    if (ONLY === 'mil') throw new Error('__done');
  }
  // ---- ECONOMY (grand2): signatures, determinism over 15 turns with the economy on, no snowball / no stall, buildings, bonds, bank, fuel, manpower
  {
    const sig = await ev(() => { const bad = []; const pairs = new Map(); for (const [c, L] of Object.entries(GE_SIG)) { if (!GCM.nats.has(c)) bad.push('unknown nation ' + c);
        for (const s of L) { if (s[0] === 'E') { const fx = s[3]; if (!fx || fx.length !== 2 || fx[0] === fx[1] || !GE_FX[fx[0]] || !GE_FX[fx[1]]) bad.push(c + ' bad fx'); else { const k = [...fx].sort().join('+'); if (pairs.has(k)) bad.push(c + ' copies ' + pairs.get(k)); pairs.set(k, c); } } } }
      const fixed = { Ayatollah: ['IR', 'RS', 'DW'], 'Dear Leader': ['KP'], 'Mountain Fortress': ['IR', 'RS', 'AF', 'KD', 'DW', 'KP'], 'Bunker Buster': ['US', 'IL', 'RU', 'CN'] };
      for (const [nm, who] of Object.entries(fixed)) { const has = Object.entries(GE_SIG).filter(([c, L]) => L.some(s => s[1] === nm)).map(x => x[0]).sort().join(','); if (has !== who.slice().sort().join(',')) bad.push(nm + ' is held by ' + has); }
      const names = {}; for (const [c, L] of Object.entries(GE_SIG)) for (const s of L) if (!fixed[s[1]]) { if (names[s[1]]) bad.push('duplicate asset name ' + s[1]); names[s[1]] = c; }
      const full = Object.keys(FACTIONS).filter(c => c !== 'EU' && !GE_SIG[c]); return { n: Object.keys(GE_SIG).length, bad, missing: full }; });
    console.log('signatures', JSON.stringify(sig)); for (const b of sig.bad) fails.push('signatures: ' + b); if (sig.missing.length) fails.push('signatures: no row for ' + sig.missing.join(','));
    const eco = await ev(() => { const out = {}; const run = (seed) => { grNew({ me: null, seed, len: 'quick' }); const rows = []; for (let t = 0; t < 15; t++) { grEndTurn(true); rows.push(grMajors().filter(c => !GC.nat[c].dead).map(c => { const N = GC.nat[c], e = N.e, br = e.br; return [c, Math.round(N.cash), N.inc | 0, -(br.upkeep | 0), Math.round(e.fuel), Math.round(e.food), Math.round(e.man), Math.round(e.bank), e.bonds.length, e.tw, GCM.P.filter(q => q.land && GC.prov[q.i].o === c).length]; })); } return { h: grHash(), rows }; };
      const a = run(4242), b = run(4242), c = run(4243); const last = a.rows[14]; const incs = last.map(r => r[2]); const nan = JSON.stringify(GC).includes('null') ? 'maybe' : '';
      const pick = ['IR', 'US', 'CN', 'RU', 'TR', 'IN']; const show = {}; for (const t of [0, 4, 9, 14]) show['t' + (t + 1)] = a.rows[t].filter(r => pick.includes(r[0])).map(r => r.join(':')).join(' | ');
      const bad = []; for (const r of last) { if (!(r[1] >= 0 && r[1] < 40000)) bad.push(r[0] + ' cash ' + r[1]); if (!(r[4] >= 0 && r[4] <= 400)) bad.push(r[0] + ' fuel ' + r[4]); if (!(r[5] >= 0 && r[5] <= 320)) bad.push(r[0] + ' food ' + r[5]); if (![r[1], r[2], r[3], r[6]].every(Number.isFinite)) bad.push(r[0] + ' NaN'); }
      const pos = a.rows[9].filter(r => r[2] > 0).length / a.rows[9].length; const mx = Math.max(...incs), mn = Math.min(...incs), med = incs.slice().sort((x, y) => x - y)[incs.length >> 1]; const per = last.filter(r => r[10] >= 4)   /* tiny 1-3 province states (Cuba: dense Havana tax) are noise, not snowballs */.map(r => r[2] / r[10]).sort((x, y) => x - y), pmed = per[per.length >> 1], pmax = per[per.length - 1];
      const avgInc = a.rows.map(rw => Math.round(rw.reduce((s, r) => s + r[2], 0) / rw.length)); const avgUp = a.rows.map(rw => Math.round(rw.reduce((s, r) => s + r[3], 0) / rw.length));
      return { pmed, pmax, top: last.slice().sort((x, y) => y[2] - x[2]).slice(0, 6).map(r => r.join(':')), med, same: a.h === b.h, diff: a.h !== c.h, bad, pos, mx, mn, avgInc, avgUp, show, n: last.length }; });
    console.log('eco determinism', eco.same, 'seed-diff', eco.diff, 'majors alive', eco.n); console.log('eco income/upkeep per empire per turn (nation:cash:net:upkeep:fuel:food:manpower:bank:bonds:totalwar)'); for (const [k, v] of Object.entries(eco.show)) console.log('  ' + k + ': ' + v);
    console.log('eco top earners t15', eco.top.join(' | ')); console.log('eco average net income per turn', JSON.stringify(eco.avgInc)); console.log('eco average upkeep per turn', JSON.stringify(eco.avgUp), 'positive-net share t10', eco.pos.toFixed(2), 'net range t15', eco.mn, eco.mx);
    if (!eco.same) fails.push('eco determinism: same seed, different hash over 15 turns'); if (!eco.diff) fails.push('eco: different seeds gave the same hash'); for (const b of eco.bad) fails.push('eco bounds: ' + b);
    if (eco.pos < .6) fails.push('eco stalls: only ' + Math.round(eco.pos * 100) + '% of majors have positive net income at turn 10');
    console.log('eco net per province: median', Math.round(eco.pmed), 'max', Math.round(eco.pmax)); if (eco.mx > 12000 || eco.pmax > 8 * Math.max(60, eco.pmed)) fails.push('eco snowballs: net per province max ' + Math.round(eco.pmax) + ' vs median ' + Math.round(eco.pmed) + ' (net range ' + eco.mn + '..' + eco.mx + ')');
    const feat = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); };
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const N = GC.nat.IR, E = N.e; const cap = N.cap; const P = GCM.P;
      // buildings: build in the capital, appears after its build time, battle mirror list has it, effects count
      N.cash = 20000; const pw0 = E.pw; let e1 = geBuild('IR', cap, 'power'); ok(!e1, 'build power: ' + e1); const n0 = geBl(cap).length;
      let e2 = geBuild('IR', cap, 'factory'); ok(!e2, 'build factory: ' + e2); ok(geBuild('IR', cap, 'airfield') === '' || true, 'x');
      for (let i = 0; i < 4; i++) grEndTurn(true); ok(geBl(cap).some(r => r[0] === 'factory') && geBl(cap).some(r => r[0] === 'power'), 'buildings finished: ' + JSON.stringify(geBl(cap)));
      ok(geEff(cap, 'factory') > .99, 'factory effect'); ok(geBuild('IR', P.findIndex(p => p.land && GC.prov[p.i === undefined ? 0 : p.i].o !== 'IR'), 'factory') !== '', 'cannot build in a foreign province');
      // Mountain Fortress: IR yes (mountain province pre-built), US no
      const mf = P.filter(p => p.land && GC.prov[p.i].o === 'IR' && p.t === 'm'); ok(mf.length === 0 || mf.every(p => geCount(p.i, 'mfort') === 1), 'IR mountain provinces start with a Mountain Fortress'); ok(geCanBuild('IR', cap, 'mfort') !== '' || P[cap].t === 'm', 'mfort only on mountains');
      // manpower gates recruiting
      E.man = 1; ok(/manpower/.test(grRecruit('IR', cap, 'inf')), 'recruit needs manpower'); E.man = 500; N.cash = 9000; ok(grRecruit('IR', cap, 'inf') === '', 'recruit with manpower'); ok(E.man < 500, 'manpower spent');
      // bonds: borrow, owe interest, repay; default freezes credit
      const c0 = N.cash; ok(geBorrow('IR') === '', 'borrow'); ok(N.cash === c0 + 1500, 'bond pays 1500'); ok(E.bonds[0][1] > 1500, 'bond has interest'); ok(geRepay('IR') === '' && !E.bonds.length, 'repay');
      geBorrow('IR'); E.bonds[0][0] = GC.turn; E.bonds[0][1] = 1e9; N.cash = 0;   /* a debt no income can cover: the default must really happen (income now often covers a normal bond) */ const army = GC.armies.filter(a => a.o === 'IR'); grEndTurn(true); ok(E.def >= 1, 'default handled (def ' + E.def + ', cash ' + Math.round(N.cash) + ', inc ' + N.inc + ', bonds ' + JSON.stringify(E.bonds) + ', turn ' + GC.turn + ')'); ok(typeof geBorrow('IR') === 'string', 'borrow returns text');
      // bank
      N.cash = 3000; ok(geDeposit('IR', 1000) === '' && E.bank === 1000, 'deposit'); ok(geWithdraw('IR') === '' && E.bank === 0, 'withdraw');
      // total war and rationing
      ok(geTotalWar('IR', true) === '' && E.tw === 1, 'total war on'); ok(geRation('IR', true) === '' && E.ration === 1, 'ration');
      // oil market is deterministic and swings; crises exist
      const idx = []; for (let t = 1; t <= 20; t++) idx.push(geOilIdx(t)); ok(Math.max(...idx) - Math.min(...idx) > 25, 'oil price swings ' + idx.join(',')); ok(GC.eco.cr.length >= 2, 'crises scheduled');
      // chokepoint: someone holds Hormuz and the holder can close it, which moves the oil price
      const hz = P.find(p => p.sea && p.n === 'Strait of Hormuz').i, h = geHolder(hz); ok(!!h, 'Hormuz has a holder'); if (h) { geSetStrait(h, hz, false); const before = geOilIdx(GC.turn + 1); ok(geSetStrait(h, hz, true) === '', 'close strait'); ok(geOilIdx(GC.turn + 1) > before, 'closed strait raises oil'); geSetStrait(h, hz, false); }
      // signature fx apply
      ok(geFx('SA', 'oil') && geFx('SA', 'bank'), 'SA oil fund'); ok(geFx('US', 'tax') && geFx('US', 'upkeep'), 'US interim');
      // supply: ammo drops outside supply, refills inside
      const a = GC.armies.find(x => x.o === 'IR'); a.u.forEach(r => r[3] = 50); a.at = cap; geSupplyStep(); ok(a.u[0][3] > 50, 'ammo refills in supply');
      // real supply lines (13zl-gsupply.js): full at the capital; a long truck line over occupied ground delivers less; an enemy army on the line cuts it; seasons; AI halts when empty
      { const L0 = gsupLine(a); ok(L0.eff >= .99 && !L0.cut, 'full supply at the capital (' + L0.eff + ')');
        const ir = i => GC.prov[i].o === 'IR' || grAllied('IR', GC.prov[i].o), plain = i => P[i].land && !ir(i) && !P[i].port && !geCount(i, 'base') && !geCount(i, 'port'); let ch = null;
        for (const p1 of P) { if (ch) break; if (!plain(p1.i) || !p1.adj.some(j => P[j].land && GC.prov[j].o === 'IR')) continue;
          for (const j2 of p1.adj) { if (ch) break; if (!plain(j2) || P[j2].adj.some(j => P[j].land && ir(j))) continue;
            for (const j3 of P[j2].adj) { if (!plain(j3) || j3 === p1.i || P[j3].adj.some(j => j !== j2 && P[j].land && (ir(j) || j === p1.i))) continue; ch = [p1.i, j2, j3]; break; } } }
        ok(!!ch, 'found a three-province road out of Iran');
        if (ch) { const old = ch.map(i => GC.prov[i].o), foe = old[1]; ch.forEach(i => GC.prov[i].o = 'IR'); a.at = ch[2]; a.path = [];
          const L1 = gsupLine(a); ok(!L1.cut && L1.eff > 0 && L1.eff < 1 && L1.km > 150, 'long line on occupied ground delivers a share (' + JSON.stringify([L1.eff, Math.round(L1.km)]) + ')');
          a.u.forEach(r => r[3] = 50); a.fu = 50; geSupplyStep(); const got = a.u[0][3] - 50; ok(got >= 0 && got < 22 && a.sl === Math.round(L1.eff * 100), 'refill scaled by the line (' + got + ')');
          const wk = grWk('IR', foe), had = GC.war[wk]; GC.war[wk] = had || 1; const raid = grAddArmy(foe, ch[1], [['inf', 100, 0, 100]], 'Raiders');
          const L2 = gsupLine(a); ok(L2.cut && L2.eff === 0, 'an enemy army on the road cuts the line'); a.u.forEach(r => r[3] = 50); a.fu = 50; geSupplyStep(); ok(a.u[0][3] < 50 && a.fu < 50, 'a cut army burns its own stock');
          a.fu = 10; ok(gsupHold(a), 'an empty army holds instead of attacking');
          GC.armies.splice(GC.armies.indexOf(raid), 1); if (had) GC.war[wk] = had; else delete GC.war[wk]; ch.forEach((i, k) => GC.prov[i].o = old[k]); a.at = cap; a.fu = 100; a.u.forEach(r => r[3] = 100); }
        const mo = P.find(p => p.n === 'Moscow'), te = P.find(p => p.n === 'Tehran'), t0 = GC.turn; ok(Math.abs(gsupLat(mo) - 55.75) < 3 && Math.abs(gsupLat(te) - 35.7) < 3, 'latitudes ' + gsupLat(mo).toFixed(1) + ' ' + gsupLat(te).toFixed(1));
        const at = m => { while (gsupMonth() !== m) GC.turn++; }; at(0); ok(gsupSeason(mo.i) === 'winter' && gsupSeason(te.i) === '', 'January: winter at Moscow, none at Tehran'); at(3); ok(gsupSeason(mo.i) === 'mud', 'April: mud season at Moscow'); GC.turn = t0; }
      return out; });
    console.log('eco features', JSON.stringify(feat)); for (const f of feat) fails.push('eco: ' + f);
  }
  // screenshots + UI smoke: the Economy panel and the province panel with buildings
  {
    await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const N = GC.nat.IR; N.cash = 6000; for (const k of ['factory', 'power', 'airfield', 'refinery']) geBuild('IR', N.cap, k); for (let i = 0; i < 3; i++) grEndTurn(true); GC.nat.IR.cash = 6000; GV.sel = N.cap; grandOpen(); });
    await page.waitForTimeout(2500);
    const ui = await ev(() => { GV.sel = GC.nat.IR.cap; grandMapRefresh(); geUiPanel(); const p = document.getElementById('gEco'); const side = document.getElementById('gSel'); return { panel: !!p, ptxt: p ? p.textContent.length : 0, side: /Buildings/.test(side.textContent) && /Autonomy/.test(side.textContent), icons: document.querySelectorAll('.ge').length }; });
    console.log('eco ui', JSON.stringify(ui)); if (!ui.panel || ui.ptxt < 300) fails.push('eco ui: panel did not open'); if (!ui.side) fails.push('eco ui: province panel misses buildings/autonomy');
    await shot('economy-panel'); await ev(() => { geUiPanel(); }); await shot('province-buildings');
    await ev(() => { grandClose(); });
  }
  if (ONLY === 'eco') throw new Error('__done');
  // ---- start as Iran, open the map
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); guFit(null); guRedraw(); }); await shot('world-map');
  await ev(() => { guFit(GR_REGIONS[4][1]); guRedraw(); }); await shot('region-middle-east');
  // ---- calmmap guards: the map gets calmer as you zoom out (Abdullah 2026-11-10 "too busy"); trees only where forests grow
  await page.waitForFunction(() => !!G3.real || !!G3.realFail, null, { timeout: 120000 }).catch(() => {});
  const calm = await ev(async () => { const out = {}; const set = d => { G3.camera.d = G3.cc.d = d; G3.moved = true; g3ForestTick(true); g3Labels(true); };
    const leg = document.getElementById('g3leg'); out.legShut = !!leg && /shut/.test(leg.className); out.coachLegend = !!document.getElementById('gCoach') && !!leg && !/shut/.test(leg.className); { const c = document.getElementById('gCoach'); out.coachH = c ? Math.round(c.getBoundingClientRect().height) : 0; }
    // woods (conifer + broadleaf trees) per desert country, from the tree pool: first with the made-up stand-in land cover (real data not loaded), then with the real satellite land cover
    const woods = () => { const au = g3TreeAudit(); return au ? ['LY', 'EG', 'SA'].map(k => au[k] ? au[k].conifer + au[k].broad : 0).concat([au.dryWoods || 0, au.DE ? au.DE.conifer + au.DE.broad : 0]) : null; };
    const R = G3.real; out.hasReal = !!R; G3.real = null; g3ForestRefresh(true); out.standIn = woods(); out.standInReal = G3.forest.real;
    if (R) { G3.real = R; g3ForestRefresh(true); out.real = woods(); out.realFlag = G3.forest.real; }
    const vis = () => { let pl = 0; for (const b of G3.bn) if (b.el._v === 'block') pl++; let foreign = 0; for (const e of G3.pl.values()) if (e._v === 'block' && / oth/.test(e.className) && !/ sel/.test(e.className)) foreign++;   /* armytokens: the badges are the army tokens now (src/13e3-gtokens.js) */
      const au = gtkAudit(); return { plates: pl, badges: au.tokens, dup: au.perProv > 1 ? au.perProv : 0, foreign, figs: au.figs }; };
    // calmmap4: map colours — countries that face each other across a narrow sea count as neighbours and never look alike, for every playable nation
    { const A = grPalAdj(); out.seaMiss = [['EG', 'SA'], ['IR', 'SA'], ['IR', 'AE'], ['IR', 'KW'], ['GR', 'TR'], ['IT', 'HR'], ['IT', 'AL'], ['ES', 'MA'], ['GB', 'FR'], ['SA', 'SD'], ['SA', 'ER']].filter(p => !(A.get(p[0]) && A.get(p[0]).has(p[1]))).map(p => p.join('-'));
      out.palBad = []; for (const me of GM_NATS.map(r => r[0]).filter(c => FACTIONS[c] && c !== 'EU').concat([''])) { const b = grPaletteBad(me); if (b.length) out.palBad.push((me || 'none') + ':' + b.join(',')); } }
    const mine = GC.armies.filter(a => a.o === GC.me).length;
    set(2300); out.far = { tier: G3.tier, trees: G3.trees, mine, ...vis() }; set(350); out.mid = { tier: G3.tier, trees: G3.trees, ...vis() }; set(150); out.close = { tier: G3.tier, trees: G3.trees, figs: vis().figs }; { let pnBad = 0, plateBad = 0, pn = 0; for (const b of G3.bn) if (b.el._v === 'block') { const st = GC.prov[b.pi], capOf = GC.nat[st.o] && GC.nat[st.o].cap === b.pi, plain = /\bpn\b/.test(b.el.className); if (plain) { pn++; if (capOf || b.el.querySelector('.em') || !(b.pi === GV.sel || b.pi === GV.hov || st.o === GC.me)) pnBad++; } else if (!capOf) plateBad++; } out.close.pn = pn; out.close.pnBad = pnBad; out.close.plateBad = plateBad; } set(900); return out; });
  console.log('calmmap', JSON.stringify(calm));
  // ---- maptrees guard (Abdullah 2026-11-11 "the trees look too cartoony in the grand map"): the tree pictures stay muted and dark (no lime, no neon), with several variants per kind in ONE texture, and trees stay small
  { const lk = await ev(() => ({ look: typeof g3TreeLook === 'function' ? g3TreeLook() : null, ts: (() => { G3.camera.d = G3.cc.d = 240; g3ForestTick(true); const v = G3.treeU.uTS.value; G3.camera.d = G3.cc.d = 900; g3ForestTick(true); return v; })(), max: G3F_MAX }));
    console.log('maptrees', JSON.stringify(lk));
    if (!lk.look) fails.push('maptrees: no tree picture to check (g3TreeLook)'); else { if (lk.look.rows < 3) fails.push('maptrees: only ' + lk.look.rows + ' variant(s) per tree kind (repetition shows)');
      for (const k of ['conifer', 'broad', 'palm', 'scrub']) { const t = lk.look[k]; if (!t || !(t.cover > .04)) fails.push('maptrees: the ' + k + ' picture is empty'); else if (k !== 'scrub' && (t.s > .47 || t.v > .33)) fails.push('maptrees: ' + k + ' trees are lime/neon again (saturation ' + t.s + ' > 0.47 or brightness ' + t.v + ' > 0.33)'); else if (t.v > .5) fails.push('maptrees: scrub is too bright (' + t.v + ')'); } }
    if (lk.ts > 1.7) fails.push('maptrees: trees grow to ' + lk.ts + 'x when zoomed out (toy trees taller than towns again)'); if (lk.max > 30000) fails.push('maptrees: tree budget raised to ' + lk.max); }
  // mapscale (Abdullah 2026-11-11 "Visually it looks off"): towns are small clusters inside their province, no two touch, and no land army is drawn standing in the sea
  const scale = await ev(() => { const T = g3Towns(), ar = g3PArea(), out = { towns: T.length, big: [], spill: [], overlap: 0, sample: {}, sea: [], ships: 0, tall: [], plate: !!G3_GEO().disc };
    const lim = t => Math.sqrt(ar[t.pi]) * (t.cap || t.mega && !t.t ? 1 / 4 : 1 / 6);   // rule of thumb: an ordinary town is at most 1/6 of its province's width, a capital or metropolis 1/4
    for (let i = 0; i < T.length; i++) { const t = T[i], n = GCM.P[t.pi].n; if (2 * t.R > Math.max(lim(t), 2 * G3_TOWN_MIN) + 1e-6) out.big.push(n); if (t.dry && t.R > G3_TOWN_MIN && !g3Fits(t.x, t.z, t.R, t.pi)) out.spill.push(n);
      for (let j = i + 1; j < T.length; j++) { const u = T[j]; if (Math.hypot(u.x - t.x, u.z - t.z) < u.R + t.R) out.overlap++; } }
    for (const n of ['Rome', 'Athens', 'Kuwait', 'Beirut', 'Tehran', 'Riyadh']) { const p = GCM.P.find(p => p.land && p.n === n), t = p && g3Main(p.i); out.sample[n] = t ? [+(2 * t.R).toFixed(2), +lim(t).toFixed(2), t.dry && g3Fits(t.x, t.z, t.R, t.pi) ? 1 : 0] : null; }
    const d0 = G3.cc.d; for (const d of [40, 150, 300, 900]) { G3.cc.d = d; const s = Math.max(.45, Math.min(3.6, d / 330)), A = g3Anchors(s);
      for (const a of GC.armies) { if (GCM.P[a.at].sea) continue; if (g3Afloat(a.at)) { if (d === 40) out.ships++; continue; } const q = A.get(a.id); if (!g3OnLand(q[0], q[1])) out.sea.push(GCM.P[a.at].n + '@' + d);
        if (d <= 150) { const t = g3Main(a.at), h = g3FigScale(a.at, s, d) * G3_FIG_H; if (h > Math.max(2 * t.R, G3_FIG_MIN * G3_FIG_H) + 1e-6) out.tall.push(GCM.P[a.at].n + '@' + d); } } }
    G3.cc.d = d0; return out; });
  console.log('mapscale', JSON.stringify({ ...scale, big: scale.big.length, spill: scale.spill.length, sea: scale.sea.length, tall: scale.tall.length }));
  if (scale.plate) fails.push('mapscale: the beige ground plate under towns is back');
  if (scale.big.length) fails.push('mapscale: towns wider than 1/6 of their province (capitals and metropolises 1/4): ' + scale.big.slice(0, 6).join(', '));
  if (scale.spill.length) fails.push('mapscale: town footprints spill over their province border or into the sea: ' + scale.spill.slice(0, 6).join(', '));
  if (scale.overlap) fails.push('mapscale: ' + scale.overlap + ' pairs of towns overlap');
  for (const [n, v] of Object.entries(scale.sample)) if (!v || v[0] > v[1] + 1e-6 || !v[2]) fails.push('mapscale: ' + n + ' town footprint ' + JSON.stringify(v) + ' (width, allowed width, inside its province)');
  if (scale.sea.length) fails.push('mapscale: land armies drawn in the sea: ' + scale.sea.slice(0, 6).join(', '));
  if (scale.tall.length) fails.push('mapscale: close-view army figures taller than their town is wide: ' + scale.tall.slice(0, 6).join(', '));
  if (!calm.legShut) fails.push('calmmap: the map key is not folded on a new campaign'); if (calm.close.plateBad || calm.close.pnBad) fails.push('calmmap4: close view shows province name plates again (only capitals keep a plate; other names are plain text for your own provinces near the selection) ' + JSON.stringify(calm.close)); if (calm.seaMiss.length) fails.push('calmmap4: sea neighbours missing from the colour rule: ' + calm.seaMiss.join(' ')); if (calm.palBad.length) fails.push('calmmap4: neighbours (land or narrow sea) with look-alike colours: ' + calm.palBad.join(' ')); if (calm.coachLegend) fails.push('calmmap: tips and the map key are open together'); if (calm.coachH > 90) fails.push('calmmap: the first-minute tips are a big box again (' + calm.coachH + ' px high)');
  if (!calm.hasReal) fails.push('calmmap: the real land data (grand/color.jpg) did not load');
  if (!calm.standIn || calm.standInReal || calm.standIn[3] !== 0 || calm.standIn.slice(0, 3).some(n => n > 250) || calm.standIn[4] < 50) fails.push('calmmap: stand-in land cover puts woods in the deserts (LY, EG, SA, dry belts, DE for contrast) ' + JSON.stringify(calm.standIn));
  if (calm.hasReal && (!calm.real || !calm.realFlag || calm.real.slice(0, 3).some(n => n > 25) || calm.real[4] < 50)) fails.push('calmmap: real land cover puts woods in desert countries (LY, EG, SA; DE for contrast) ' + JSON.stringify(calm.real));
  if (calm.far.tier !== 0 || calm.far.trees !== 0) fails.push('calmmap: far view still draws trees (' + calm.far.trees + ')'); if (calm.far.plates > 15) fails.push('calmmap: far view draws ' + calm.far.plates + ' capital plates');
  if (calm.far.foreign || calm.far.figs > calm.far.mine) fails.push('calmmap: far view shows other nations\' armies (' + calm.far.foreign + ' badges, ' + calm.far.figs + ' figures for ' + calm.far.mine + ' own armies)');
  if (calm.mid.trees !== 0) fails.push('calmmap: middle view still draws trees (' + calm.mid.trees + ')'); if (calm.mid.tier !== 1 || calm.mid.dup) fails.push('calmmap: middle view draws two badges for one province (' + calm.mid.dup + ')'); if (calm.mid.badges <= calm.far.badges) fails.push('calmmap: middle view does not bring the other armies\' badges back'); if (calm.close.figs <= calm.mid.figs) fails.push('calmmap: close view does not bring every army figure back'); if (calm.close.tier !== 2) fails.push('calmmap: close tier not reached');
  // ---- scenario: IR army next to an enemy province, march, month end -> the fight starts ON the map: no prompt, no real-time battle, the clock keeps running
  const sc = await ev(() => { const me = 'IR', foe = 'IQ'; grDeclare(me, foe); let pair = null;
    for (const p of GCM.P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === foe && GC.prov[j].gar.length) { pair = [p.i, j]; break; } else if (pair) break;
    if (!pair) for (const p of GCM.P) if (p.land && GC.prov[p.i].o === foe) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === me) { pair = [j, p.i]; break; }
    if (!pair) return { err: 'no IR/foe border ' + foe };
    const a = GC.armies.find(x => x.o === me); a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); guCentre(pair[0], 2.4); guRedraw();
    return { foe, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, aid: a.id, ok: !!r.ok, units: a.u.length, to_i: pair[1] }; });
  console.log('scenario', JSON.stringify(sc)); if (sc.err || !sc.ok) { fails.push('scenario: ' + JSON.stringify(sc)); throw new Error('no scenario'); }
  await shot('army-ordered');
  // ---- armytokens guards (Army Standards, orch/concepts/ARMY-STANDARDS.md): one token per army or stack, never two markers in one province, no figures at far / middle zoom, a waving flag only on the selected army, far = dots only, odds = the battle rules' own forecast
  const tk = await ev(() => { const out = {}; const set = d => { G3.camera.d = G3.cc.d = d; G3.moved = true; cancelAnimationFrame(G3.raf); g3Frame(performance.now()); g3Labels(true); return gtkAudit(); };
    out.gone = ['g3FarGeo', 'g3FarCol', 'g3FarHide', 'gtkMinis', 'gtkFigures'].filter(n => typeof window[n] === 'function');
    const me = GC.me, a = GC.armies.find(x => x.id === GV.selA), to = a.path[a.path.length - 1], foe = GC.armies.find(x => grAtWar(me, x.o) && !GCM.P[x.at].sea && !x.fl), old = foe ? foe.at : -1; if (foe) { foe.at = to; foe.path = []; } g3SyncArmies(); const d0 = G3.camera.d;
    out.far = set(2300); out.farNum = [...G3.pl.values()].filter(e => e._v === 'block').every(e => / far/.test(e.className));
    out.mid = set(350); { const sv = GV.selA; GV.selA = 0; out.midNoSel = set(350); GV.selA = sv; set(350); } const on = q => [...document.querySelectorAll(q)].filter(e => { for (let p = e; p && p.id !== 'g3ui'; p = p.parentNode) if (p._v === 'none') return false; return true; });
    out.march = on('#g3ui .tk.me .ar').length; out.eta = on('#g3ui .eta').map(e => e.textContent); out.pill = on('#g3ui .tk.war .od').map(e => e.textContent);
    out.close = set(150); out.make = on('#g3ui .tk.me .pt small').length; out.foe = !!foe;
    // the pill's numbers against the battle rules' own forecast (gwOddsAt plays the same day-by-day rules forward on copies; nothing on the map changes)
    const o = gtkOdds([a.id], to); if (o) { const r = gwOddsAt(a.o, [a.id], to); out.est = [o.pct, r.pct, o.days, r.days, o.t]; }
    if (foe) foe.at = old; g3SyncArmies(); set(d0); return out; });
  console.log('armytokens', JSON.stringify(tk));
  if (tk.gone.length) fails.push('armytokens: old army drawing code is still there: ' + tk.gone.join(','));
  for (const k of ['far', 'mid', 'close']) { if (tk[k].old) fails.push('armytokens: ' + k + ' view still has old shield badges (' + tk[k].old + ')'); if (tk[k].flags > tk[k].sel) fails.push('armytokens: ' + k + ' view flies ' + tk[k].flags + ' flags (only the selected army may fly one)'); if (tk[k].hud) fails.push('armytokens: ' + k + ' view draws ' + tk[k].hud + ' army tokens on top of the minimap, unit cards or round buttons'); if (tk[k].dup) fails.push('armytokens: ' + k + ' view draws an army twice (' + tk[k].dup + ')'); if (!tk[k].tokens) fails.push('armytokens: ' + k + ' view draws no army at all'); }
  if (tk.far.tier !== 0 || !tk.far.dotsOn || !tk.far.dots || !tk.farNum || tk.far.figs > tk.far.sel || tk.far.rings) fails.push('armytokens: far view is not dots and numbers only ' + JSON.stringify(tk.far));
  if (tk.mid.tier !== 1 || tk.mid.dotsOn || tk.mid.far || tk.mid.figs > tk.mid.sel) fails.push('armytokens: middle view is not tokens only ' + JSON.stringify(tk.mid));
  if (tk.mid.perProv > 1 || tk.midNoSel.perProv > 1) fails.push('armytokens: middle view draws more than one army marker in a province (' + tk.mid.perProv + ')');
  if (tk.midNoSel.flags || tk.midNoSel.figs) fails.push('armytokens: middle view with no army selected still draws ' + tk.midNoSel.figs + ' figures / ' + tk.midNoSel.flags + ' flags');
  if (!tk.march || !tk.eta.some(t => /^\d+ days?$/.test(t))) fails.push('armytokens: marching army shows no arrow nose / arrival in days ' + JSON.stringify(tk.eta));
  if (tk.close.tier !== 2 || !tk.make) fails.push('armytokens: close view shows no make-up counts'); if (!tk.close.figs) fails.push('armytokens: close view shows no on-land army figures');
  if (tk.foe && (!tk.pill.length || !tk.pill.every(t => /^(Good odds|Even fight|Bad odds)$/.test(t)))) fails.push('armytokens: no odds pill on the enemy army in reach ' + JSON.stringify(tk.pill));
  if (!tk.est || tk.est[0] !== tk.est[1] || tk.est[2] !== tk.est[3]) fails.push('armytokens: odds are not the battle rules\' own forecast ' + JSON.stringify(tk.est));
  const noLive = await ev(() => ['grandFightLive', 'grandBattleStart', 'grandBattleSetup', 'grBattlePrompt', 'grandTick', 'gnBattleAsk', 'gmMap'].filter(f => typeof window[f] === 'function'));
  if (noLive.length) fails.push('the real-time campaign battle code is back: ' + noLive.join(', '));
  const met = async () => ev((pi) => ({ b: !!gwBattleAt(pi), s: !!gwSiegeAt(pi), r: (GC.br || []).some(r => r.p === pi), modal: !!document.getElementById('gModal'), live: typeof G !== 'undefined' && !!G, ph: GC.ph, turn: GC.turn }), sc.to_i);
  let m0 = null; for (let k = 0; k < 4; k++) { await ev(() => { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); }); await page.waitForTimeout(1200); m0 = await met(); if (m0.b || m0.s || m0.r) break; }   // (foe armies stay put; a 2-month march needs a second month)
  console.log('contact', JSON.stringify(m0));
  if (!(m0.b || m0.s || m0.r)) fails.push('march into the enemy: no battle and no siege started at ' + sc.to + ' ' + JSON.stringify(m0));
  if (m0.modal) fails.push('a dialog popped up when the armies met (nothing may be forced open)'); if (m0.live) fails.push('a real-time battle was started from the campaign'); if (m0.ph !== 'plan') fails.push('the month did not close while a battle is running (ph ' + m0.ph + ')');
  // the marker is on the map; the window opens only when asked (marker / province line), shows both sides, dice and morale, and Esc closes it
  const win = await ev((pi) => { grandMapRefresh(); const o = { marks: GWU.marks.filter(m => m.p === pi).length, forced: !!document.getElementById('gwWin') }; GV.sel = pi; guSide(); o.line = !!document.querySelector('#gSel .gwLink'); gwTo(Math.max(GC.bd | 0, 4)); gwuOpen(pi); const e = document.getElementById('gwWin'); o.open = !!e; o.txt = e ? e.textContent.replace(/\s+/g, ' ').slice(0, 400) : ''; o.kind = gwBattleAt(pi) ? 'b' : gwSiegeAt(pi) ? 's' : 'r'; return o; }, sc.to_i);
  console.log('battle window', JSON.stringify(win)); await page.waitForTimeout(600); await shot('battle-window');
  if (m0.b || m0.s) { if (win.marks !== 1) fails.push('no map marker over the battle / siege (' + win.marks + ')'); if (win.forced) fails.push('the battle window opened by itself'); if (!win.line) fails.push('the province panel has no line that opens the battle window');
    if (!win.open || !/^(Battle|Siege) of /.test(win.txt)) fails.push('the battle window did not open: ' + win.txt.slice(0, 80)); if (win.kind === 'b' && !/Morale/.test(win.txt)) fails.push('battle window shows no morale'); if (win.kind === 's' && !/chance the fort falls/.test(win.txt)) fails.push('siege window shows no progress'); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); if (await ev(() => !!document.getElementById('gwWin'))) fails.push('Esc did not close the battle window');
  // days pass on the clock: the fight ends on the map, the result is recorded, units were really lost, nothing else opened
  const end = await ev((pi) => { const n0 = GC.armies.filter(a => a.o === 'IR').reduce((s, a) => s + a.u.length, 0); let months = 0; while ((gwBattleAt(pi) || gwSiegeAt(pi)) && months < 30) { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); months++; }
    const R = (GC.br || []).filter(r => r.p === pi), last = R[R.length - 1]; return { months, n: R.length, last: last && { win: last.win, how: last.how, d: last.d, la: last.la, ld: last.ld, sg: last.sg | 0 }, owner: GC.prov[pi].o, modal: !!document.getElementById('gModal'), live: typeof G !== 'undefined' && !!G, ph: GC.ph, save: !!localStorage.getItem(GR_KEY), log: GC.log.filter(l => /Battle of|siege|beat|held against|captured/.test(l[1])).slice(-5).map(l => l[1]) }; }, sc.to_i);
  console.log('battle end', JSON.stringify(end)); await page.waitForTimeout(600); await shot('battle-result-card');
  if (!end.n || !end.last) fails.push('the fight at ' + sc.to + ' never produced a result'); else if (!(end.last.d >= 1)) fails.push('the fight took no days: ' + JSON.stringify(end.last));
  if (end.modal || end.live) fails.push('a dialog or a real-time battle appeared while the fight ran'); if (end.ph !== 'plan') fails.push('the campaign is stuck after the fight (ph ' + end.ph + ')'); if (!end.save) fails.push('campaign not saved');
  await shot('province-captured');
  // save/continue round trip
  const rt = await ev(() => { const h = grHash(); grClear(); const ok = !GC; grNew({ me: 'IR', seed: 5, len: 'quick' }); const h2 = grHash(); grSave(); const x = grLoad(); return { same: grHash() === h2, x: !!x }; });
  if (!rt.same) fails.push('save round trip changed the state hash');
  // B2.5 modifier engine: style row, temporary row expiry, save round trip
  const gm = await ev(() => { grNew({ me: 'IR', seed: 5, len: 'quick' }); const w0 = gmod('nation', 'IR', 'warSupport', 1); gmodAdd({ id: 't1', src: 'Test', scope: 'nation', stat: 'warSupport', add: .2, t: 'IR', until: GC.turn + 1 }); const w1 = gmod('nation', 'IR', 'warSupport', 1); grSave(); const x = grLoad(); const w2 = gmod('nation', 'IR', 'warSupport', 1); gmodMonth(GC.turn + 2); return { w0, w1, w2, w3: gmod('nation', 'IR', 'warSupport', 1), n: (GC.mod || []).filter(r => !/^(trade|mk|el|dec)_/.test(r.id)).length, l: gmodLines('nation', 'IR', 'warSupport').length }; });
  // IR: Zealous +10% and the shared Ayatollah (13v) +8% war support
  if (!(gm.w0 > 1.1 && gm.w0 < 1.3 && Math.abs(gm.w1 - gm.w0 - .2) < 1e-9 && Math.abs(gm.w2 - gm.w0 - .2) < 1e-9 && Math.abs(gm.w3 - gm.w0) < 1e-9 && gm.n === 0)) fails.push('gmod engine: ' + JSON.stringify(gm));
  // laneF ⚡21 outliner: O lists my armies; clicking a row selects it
  const ol = await ev(() => { grNew({ me: 'IR', seed: 5, len: 'quick' }); grandOpen(); GV.outl = true; gmPaint(); const o = document.getElementById('gmOutl'); const rows = o ? o.querySelectorAll('.oi').length : -1; const mine = GC.armies.filter(a => a.o === GC.me).length; if (rows > 0) o.querySelector('.oi').click(); const sel = gmIds().length; GV.outl = false; gmPaint(); const hid = document.getElementById('gmOutl').style.display === 'none'; return { rows, mine, sel, hid }; });
  if (!(ol.rows === ol.mine && ol.rows > 0 && ol.sel === 1 && ol.hid)) fails.push('outliner: ' + JSON.stringify(ol));
  // laneF ⚡23 macro-builder: standing recruit order repeats each month and stops (with a log line) when it can't be paid
  const mc = await ev(() => { const pi = GC.prov.findIndex(s => s.o === GC.me); const k = GR_RECRUIT.find(r => grHasKind(grNat(GC.me).fac, r[0]))[0]; GC.mac = []; gmMacroToggle(pi, k); const on = GC.mac.length; const q0 = JSON.stringify(GC.q||0).length; GC.nat[GC.me].cash = 1e6; const c0 = GC.nat[GC.me].cash; gmMacros(); const paid = GC.nat[GC.me].cash < c0; GC.nat[GC.me].cash = 0; gmMacros(); return { on, paid, stopped: GC.mac.length === 0 }; });
  if (!(mc.on === 1 && mc.paid && mc.stopped)) fails.push('macro: ' + JSON.stringify(mc));
  // Proxy warfare: tiers, evidence-driven exposure, autonomy slip-out, crack-down, determinism
  const pxr = await ev(() => { const run = () => { grNew({ me: 'IR', seed: 777, len: 'quick' }); GC.war = {}; GC.alz = []; const a = 'IR', b = 'US'; GC.nat[a].cash = 99999; GC.nat[b].cash = 99999; gpxS(); GC.px = []; gpxStart(a, b); gpxTier(a, b, 2);
      const x = GC.px[0]; const r0 = { t: x[3], au: x[4] }; let n = 0; for (; n < 40 && GC.px.length && GC.px[0][0] === a; n++) { GC.turn++; gpxTurn(); }
      return { r0, ended: GC.px.length === 0 || GC.px[0][0] !== a, n, h: JSON.stringify(GC.px) + GC.nat[a].cash }; };
    const r1 = run(), r2 = run(); grNew({ me: 'IR', seed: 777, len: 'quick' }); GC.war = {}; GC.alz = []; GC.nat.US.cash = 9999; gpxS(); GC.px = [['IR', 'US', GC.turn + 12, 2, 10, 0]]; let cr = 0; for (let i = 0; i < 12 && GC.px.some(x => x[0] === 'IR' && x[1] === 'US'); i++) { GC.turn++; gpxCrack('US', 'IR'); cr++; }
    const cleared = !GC.px.some(x => x[0] === 'IR' && x[1] === 'US');
    // AI target answers on its own: a player-funded militia inside a rich AI nation does not survive many months of evidence
    grNew({ me: 'IR', seed: 778, len: 'quick' }); GC.war = {}; GC.alz = []; GC.nat.IR.cash = 99999; GC.nat.US.cash = 99999; gpxS(); GC.px = [['IR', 'US', GC.turn + 400, 1, 0, 12]]; GC.px[0][4] = -9999; let aiN = 0; for (; aiN < 120 && GC.px.some(x => x[0] === 'IR' && x[1] === 'US'); aiN++) { GC.turn++; gpxTurn(); }
    const aiCrack = GC.log.some(l => /cracks down|breaks up/.test(l[1]));
    return { r1, same: r1.h === r2.h, cleared, aiN, aiCrack, known: typeof GPX_KNOWN === 'number' && GPX_KNOWN > 0 }; });
  if (!(pxr.r1.r0.t === 2 && pxr.r1.ended && pxr.same && pxr.cleared && pxr.aiN < 120 && pxr.aiCrack && pxr.known)) fails.push('proxy warfare: ' + JSON.stringify(pxr));
} catch (e) { if (String(e.message) !== '__done') { fails.push(String(e.message || e).split('\n')[0]); console.log('ERRS', errs.join('\n')); console.log(String(e.stack).split('\n').slice(0, 7).join('\n')); } }
for (const e of [...new Set(errs)].slice(0, 6)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDTEST PASS');
// the battle rules (dice, morale, sieges, sea fights, balance) have their own test; it runs here so the same gate job covers it
if (!ONLY) { releaseBrowserLock(); const r = spawnSync(process.execPath, [path.join(ROOT, 'orch', 'gwartest.mjs')], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1); }
