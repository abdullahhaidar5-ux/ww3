// Campaign battles on the map (src/13a-gwar.js): node orch/gwartest.mjs            -> GWAR PASS / GWAR FAIL
//                                                  node orch/gwartest.mjs --balance  -> also rewrites orch/reports/eu4-battles.md
// Guards for Abdullah's decision of 2026-11-11 23:57 ("Abandon battles in grand campaign. Turn it into eu 4 rules"):
//   - the same state and seed give the same battle twice (also across a save/load in the middle of a battle)
//   - a Zealous army never retreats by morale: it holds its ground until it is destroyed
//   - a fort province cannot change hands without a finished siege
//   - fleets fight in sea zones; troops caught at sea without an escort are sunk; reinforcements join a running battle
//   - balance: equal armies win about half the time; terrain and generals matter, numbers and supply matter more
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BAL = process.argv.includes('--balance'), N = Number((process.argv.find(a => a.startsWith('--n=')) || '--n=200').slice(4));
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await guardContext(ctx);
const page = await ctx.newPage(); const fails = [], errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, arg) => page.evaluate(fn, arg);
let out = 1;
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof gwOpen === 'function', null, { timeout: 120000 });
  // ---- helpers inside the page: set up one clean battle and play it to the end
  await ev(() => { window.GWT = {
    prov(t, extra) { return GCM.P.find(p => p.land && p.t === t && !gwFort(p.i) && !p.cap && !GC.armies.some(a => a.at === p.i) && (!extra || extra(p))); },
    clear(pi) { GC.armies = GC.armies.filter(a => a.at !== pi); GC.bt = (GC.bt || []).filter(B => B.p !== pi); GC.sg = (GC.sg || []).filter(S => S.p !== pi); },
    gen(a, lv, tr) { const id = GC.mil.gid++; GC.mil.g[id] = { id, o: a.o, nm: 'Test ' + id, tr: tr | 0, xp: [0, 60, 150, 280, 450][lv], lv, st: 0, aid: a.id, by: '' }; a.gid = id; return GC.mil.g[id]; },
    val(L) { return L.reduce((s, a) => s + (GC.armies.includes(a) ? grArmyVal(a) : 0), 0); },
    // one battle: c = {an,dn,pi,va,vd,seed,river,amph,genA,genD,ammoA,ammoD,cutA,morA,morD}
    fight(c) { GWT.clear(c.pi); GC.seed = c.seed; GC.bid = 500; GC.war[grWk(c.an, c.dn)] = 1; GC.prov[c.pi].gar = [];
      const A = grAddArmy(c.an, c.pi, grGenUnits(grNat(c.an).fac, c.va, true)), D = grAddArmy(c.dn, c.pi, grGenUnits(grNat(c.dn).fac, c.vd, true));
      if (c.genA != null) GWT.gen(A, c.genA, 0); if (c.genD != null) GWT.gen(D, c.genD, 1);
      if (c.ammoA != null) for (const r of A.u) r[3] = c.ammoA; if (c.ammoD != null) for (const r of D.u) r[3] = c.ammoD; if (c.cutA) A.sup = 2;
      if (c.morA != null) A.mor = c.morA; if (c.morD != null) D.mor = c.morD;
      const va = grArmyVal(A), vd = grArmyVal(D), na = A.u.length, nd = D.u.length, atA = A.at, atD = D.at;
      const B = gwOpen({ p: c.pi, an: c.an, dn: c.dn, att: [A.id], def: [D.id], garr: false, river: !!c.river, mtn: GCM.P[c.pi].t === 'm', sea: false, done: 0 }); if (c.amph) B.amph = 1;
      let g = 0; while (GC.bt.includes(B) && g++ < 2000) gwTick();
      const R = GC.br[GC.br.length - 1], aliveA = GC.armies.includes(A), aliveD = GC.armies.includes(D);
      const res = { win: R.win, how: R.how, d: R.d, la: R.la, ld: R.ld, na, nd, vla: R.va0 - (R.win === 'def' && R.how === 'wipe' ? 0 : R.va), vld: R.vd0 - (R.win === 'att' && R.how === 'wipe' ? 0 : R.vd), va: R.va0, vd: R.vd0,
        movedA: aliveA && A.at !== atA, movedD: aliveD && D.at !== atD, aliveA, aliveD, hung: g >= 2000 };
      GWT.clear(c.pi); delete GC.war[grWk(c.an, c.dn)]; return res; },
    // n battles with seeds 1..n -> summary row
    run(c, n) { let w = 0, d = 0, la = 0, ld = 0, vla = 0, vld = 0, wipe = 0, mvA = 0, mvD = 0, hung = 0; for (let i = 1; i <= n; i++) { const r = GWT.fight(Object.assign({}, c, { seed: 1000 + i * 7 })); if (r.win === 'att') w++; d += r.d; la += r.la / r.na; ld += r.ld / r.nd; vla += r.vla / r.va; vld += r.vld / r.vd; if (r.how === 'wipe') wipe++; if (r.movedA) mvA++; if (r.movedD) mvD++; if (r.hung) hung++; }
      return { win: Math.round(w / n * 100), days: Math.round(d / n), la: Math.round(la / n * 100), ld: Math.round(ld / n * 100), vla: Math.round(vla / n * 100), vld: Math.round(vld / n * 100), wipe: Math.round(wipe / n * 100), mvA, mvD, hung }; } }; });

  // ---- 1. determinism: one battle twice from the same state and seed; then 8 AI months twice; then a save/load in the middle of the fighting
  const det = await ev(() => { grNew({ me: null, seed: 4242, len: 'quick' }); const pi = GWT.prov('f').i; const c = { an: 'RU', dn: 'CN', pi, va: 30000, vd: 30000, seed: 77 };
    const js0 = JSON.stringify(GC), again = () => { GC = JSON.parse(js0); };   // the same state: air sorties and drones spent in the first battle are back
    const a = JSON.stringify(GWT.fight(c)); again(); const b = JSON.stringify(GWT.fight(c)); again(); const c2 = JSON.stringify(GWT.fight(Object.assign({}, c, { seed: 78 })));
    grNew({ me: null, seed: 4242, len: 'quick' }); const h1 = grRunAI(8), nb1 = (GC.br || []).length; grNew({ me: null, seed: 4242, len: 'quick' }); const h2 = grRunAI(8);
    // save/load: stop in the middle of a month with battles running, copy the campaign through JSON, finish both -> same hash
    grNew({ me: null, seed: 911, len: 'quick', sc: 'gulf' }); let g = 0; while (!(GC.bt && GC.bt.length) && g++ < 12) grEndTurn(true); const running = GC.bt.length; gwTo(7);
    const js = JSON.stringify(GC); grRunAI(3); const hA = grHash(); GC = JSON.parse(js); try { geEnsure(); } catch (e) {} grRunAI(3); const hB = grHash();
    return { same: a === b, diff: a !== c2, r: JSON.parse(a), h1, h2, nb1, running, hA, hB }; });
  console.log('determinism', JSON.stringify(det));
  if (!det.same) fails.push('same state + seed gave two different battles'); if (!det.diff) fails.push('a different seed gave the identical battle');
  if (det.h1 !== det.h2) fails.push('8 AI months twice: different hashes ' + det.h1 + ' / ' + det.h2); if (!det.nb1) fails.push('8 AI months: no battle or siege was ever finished');
  if (!det.running) fails.push('save/load: no battle was running to save'); if (det.hA !== det.hB) fails.push('save/load in the middle of a battle changed the outcome ' + det.hA + ' / ' + det.hB);

  // ---- 1b. saves: a fresh campaign hashes the same after save + load; a save made by an older build in the middle of a month close (its battle prompt
  //      was waiting, no battle lists yet) loads, starts that fight on the map and finishes the month
  const sv = await ev(() => { const o = {}; grNew({ me: 'IR', seed: 5, len: 'quick' }); const h2 = grHash(); grSave(); grLoad(); o.same = grHash() === h2;
    grNew({ me: 'IR', seed: 9, len: 'quick' }); GC.war[grWk('IR', 'IQ')] = 1; const p = GCM.P.find(q => q.land && GC.prov[q.i].o === 'IQ' && !gwFort(q.i) && GC.prov[q.i].gar.length), a = grAddArmy('IR', p.i, grGenUnits('IR', 20000, true)), t = GC.turn;
    delete GC.bt; delete GC.sg; delete GC.br; delete GC.bid; delete GC.bd; GC.ph = 'resolve'; GC.q = [{ p: p.i, an: 'IR', dn: 'IQ', att: [a.id], def: [], garr: true, river: false, mtn: false, sea: false, done: 0, v0: 1 }]; GC.qi = 0; GC.oldBattleTimeLimit = 60;
    localStorage.setItem(GR_KEY, JSON.stringify(GC)); GC = null; o.loaded = !!grLoad(); o.ph = GC && GC.ph; o.next = !!GC && GC.turn === t + 1; o.fight = !!GC && !!(gwBattleAt(p.i) || (GC.br || []).some(r => r.p === p.i)); grClear(); return o; });
  console.log('saves', JSON.stringify(sv));
  if (!sv.same) fails.push('save + load of a fresh campaign changed its hash'); if (!sv.loaded || sv.ph !== 'plan' || !sv.next || !sv.fight) fails.push('an old save caught in a month close did not load and carry on: ' + JSON.stringify(sv));

  // ---- 2. Zealous never retreat by morale: Iran, Lebanese Shia, Yemen, Iraqi Shia Brigades, North Korea, OB, BI hold until destroyed (attacking and defending)
  const zeal = await ev(() => { grNew({ me: null, seed: 5, len: 'quick' }); const pi = GWT.prov('f').i, o = {};
    for (const z of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) { if (!GC.nat[z]) { o[z] = 'absent'; continue; } let bad = 0, n = 0;
      for (let i = 1; i <= 12; i++) { const d = GWT.fight({ an: 'US', dn: z, pi, va: 60000, vd: 14000, seed: i, morD: 20 }), a = GWT.fight({ an: z, dn: 'US', pi, va: 14000, vd: 60000, seed: i, morA: 20 }); n += 2;
        if (d.win !== 'att' || d.aliveD || d.movedD || d.ld !== d.nd) bad++; if (a.win !== 'def' || a.aliveA || a.movedA || a.la !== a.na) bad++; }
      o[z] = bad + '/' + n; }
    // a Professional army in the same spot does fall back
    let fell = 0; for (let i = 1; i <= 12; i++) { const r = GWT.fight({ an: 'US', dn: 'RU', pi: GCM.P.find(p => p.land && GC.prov[p.i].o === 'RU' && !gwFort(p.i) && GCM.P[p.i].adj.some(j => GCM.P[j].land && GC.prov[j].o === 'RU')).i, va: 60000, vd: 20000, seed: i }); if (r.win === 'att' && r.movedD) fell++; }
    o.profFellBack = fell; o.guard = ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI'].filter(z => GC.nat[z]).every(z => gwZeal(z) && msOf(grNat(z).fac).rout === 0); return o; });
  console.log('zealous', JSON.stringify(zeal));
  for (const z of ['IR', 'RS', 'DW', 'RV', 'KP', 'OB', 'BI']) if (zeal[z] !== 'absent' && !/^0\//.test(zeal[z])) fails.push('Zealous ' + z + ' left the field by morale (' + zeal[z] + ')');
  if (!zeal.guard) fails.push('Zealous nations are not all rout===0'); if (!zeal.profFellBack) fails.push('a Professional army never fell back (retreat is broken)');

  // ---- 3. a fort province cannot change hands without a finished siege
  const fort = await ev(() => { grNew({ me: null, seed: 31, len: 'quick' }); const o = {};
    const p = GCM.P.find(q => q.land && GC.prov[q.i].o === 'SA' && !q.cap && !gwFort(q.i)); const pi = p.i, st = GC.prov[pi]; GWT.clear(pi);
    st.bl = (st.bl || gmBuildings(pi).map(r => r.slice())).concat([['fort', 0]]); o.level = gwFort(pi); GC.war[grWk('IR', 'SA')] = 1;
    for (const k of Object.keys(GC.nat)) GC.nat[k].ai = false;   // nobody else moves: only this siege runs
    // (a) the garrison is gone and an enemy army walks in: the province must NOT flip at the month end
    st.gar = []; const A = grAddArmy('IR', pi, grGenUnits('IR', 40000, true)); grEndTurn(true); o.ownerAfterWalkIn = st.o; o.siege = !!gwSiegeAt(pi);
    // the empty fort falls at the first siege roll (10 days)
    gwTo(12); o.ownerAfterRoll = st.o;
    // (b) a held fort: months of siege, the owner changes only when the siege ends
    const q = GCM.P.find(x => x.land && GC.prov[x.i].o === 'SA' && !x.cap && !gwFort(x.i) && x.i !== pi), qi = q.i, sq = GC.prov[qi]; GWT.clear(qi); sq.bl = (sq.bl || gmBuildings(qi).map(r => r.slice())).concat([['fort', 0]]);
    sq.gar = grGenUnits('SA', 6000, false); const A2 = grAddArmy('IR', qi, grGenUnits('IR', 60000, true)); gwScanAt(qi); o.siege2 = !!gwSiegeAt(qi); o.noBattle = !gwBattleAt(qi);
    let months = 0, flippedEarly = false; while (gwSiegeAt(qi) && months < 40) { grEndTurn(true); months++; if (gwSiegeAt(qi) && sq.o !== 'SA') flippedEarly = true; }
    o.months = months; o.flippedEarly = flippedEarly; o.owner2 = sq.o; o.card = (GC.br || []).some(r => r.sg && r.p === qi);
    // (c) too few troops: no progress
    const z = GCM.P.find(x => x.land && GC.prov[x.i].o === 'SA' && !x.cap && !gwFort(x.i) && x.i !== pi && x.i !== qi), zi = z.i, sz = GC.prov[zi]; GWT.clear(zi); sz.bl = (sz.bl || gmBuildings(zi).map(r => r.slice())).concat([['fort', 0]]);
    sz.gar = grGenUnits('SA', 6000, false); grAddArmy('IR', zi, [['inf', 100, 0, 100], ['inf', 100, 0, 100]]); gwScanAt(zi); for (let i = 0; i < 4; i++) grEndTurn(true); o.fewOwner = sz.o; o.fewChance = gwSiegeAt(zi) ? gwSiegeChance(gwSiegeAt(zi)) : -1;
    // (d) assault: a big army storms a small garrison
    const S = gwSiegeAt(zi); grAddArmy('IR', zi, grGenUnits('IR', 80000, true)); GC.me = 'IR'; const before = GC.armies.filter(a => a.at === zi).reduce((s, a) => s + a.u.length, 0); o.assault = gwAssault(GC.armies.find(a => a.at === zi && a.o === 'IR').id);
    o.assaultOwner = sz.o; o.assaultLost = before - GC.armies.filter(a => a.at === zi).reduce((s, a) => s + a.u.length, 0); GC.me = null; return o; });
  console.log('fort', JSON.stringify(fort));
  if (fort.level < 1) fails.push('fort: a fort building gives no fort level'); if (fort.ownerAfterWalkIn !== 'SA' || !fort.siege) fails.push('fort: an enemy walking into an empty fort took it without a siege (' + fort.ownerAfterWalkIn + ')');
  if (fort.ownerAfterRoll !== 'IR') fails.push('fort: the empty fort did not fall at the first siege roll'); if (!fort.siege2 || !fort.noBattle) fails.push('fort: a held fort did not start a siege (or started a field battle)');
  if (fort.flippedEarly || fort.owner2 !== 'IR' || fort.months < 1 || !fort.card) fails.push('fort: siege result wrong ' + JSON.stringify(fort)); if (fort.fewOwner !== 'SA' || fort.fewChance !== 0) fails.push('fort: two units besieged a fort successfully');
  if (fort.assault !== '' || fort.assaultOwner !== 'IR' || !(fort.assaultLost > 0)) fails.push('fort: assault ' + JSON.stringify([fort.assault, fort.assaultOwner, fort.assaultLost]));

  // ---- 4. sea: fleets fight in a sea zone; troops without an escort are sunk; a second army joins a running land battle; withdraw order
  const sea = await ev(() => { grNew({ me: null, seed: 8, len: 'quick' }); const o = {}; GC.war[grWk('US', 'CN')] = 1; const z = GCM.P.find(p => p.sea && !GC.armies.some(a => a.at === p.i)).i;
    const mkF = (c, n) => { const f = grAddArmy(c, z, Array.from({ length: n }, (_, i) => [['ship', 'boat', 'sub', 'fast'][i % 4], 100, 0, 100]).filter(r => grHasKind(grNat(c).fac, r[0]))); f.fl = 1; return f; };
    const fa = mkF('US', 12), fd = mkF('CN', 6); const B = gwOpen({ p: z, an: 'US', dn: 'CN', att: [fa.id], def: [fd.id], garr: false, river: false, mtn: false, sea: true, done: 0 }); let g = 0; while (GC.bt.includes(B) && g++ < 500) gwTick();
    const R = GC.br[GC.br.length - 1]; o.fleet = { win: R.win, how: R.how, d: R.d, usLeft: GC.armies.includes(fa) ? fa.u.length : 0, cnAt: GC.armies.includes(fd) ? fd.at !== z : 'gone' };
    GWT.clear(z); const f2 = mkF('US', 6), tr = grAddArmy('CN', z, grGenUnits('CN', 20000, true)); const B2 = gwOpen({ p: z, an: 'US', dn: 'CN', att: [f2.id], def: [tr.id], garr: false, river: false, mtn: false, sea: true, done: 0 }); gwTick();
    const R2 = GC.br[GC.br.length - 1]; o.sunk = { how: R2.how, win: R2.win, gone: !GC.armies.includes(tr), d: R2.d }; GWT.clear(z);
    // reinforcements + withdraw on land
    const pi = GWT.prov('f').i; GC.prov[pi].gar = []; const a1 = grAddArmy('US', pi, grGenUnits('US', 30000, true)), d1 = grAddArmy('CN', pi, grGenUnits('CN', 30000, true)); GC.seed = 3;
    const B3 = gwOpen({ p: pi, an: 'US', dn: 'CN', att: [a1.id], def: [d1.id], garr: false, river: false, mtn: false, sea: false, done: 0 }); gwTick(); gwTick();
    GC.me = 'US'; o.early = gwWithdraw(a1.id); o.moveErr = (grOrderMove(a1.id, GCM.P[pi].adj[0]) || {}).err || '';
    const a2 = grAddArmy('US', pi, grGenUnits('US', 30000, true)); const n0 = B3.na0; gwOpen({ p: pi, an: 'US', dn: 'CN', att: [a2.id], def: [d1.id], garr: false, river: false, mtn: false, sea: false, done: 0 }); o.joined = B3.att.includes(a2.id) && B3.na0 > n0 && GC.bt.filter(x => x.p === pi).length === 1;
    for (let i = 0; i < 5 && GC.bt.includes(B3); i++) gwTick(); if (GC.bt.includes(B3)) { const own = GCM.P[pi].adj.find(j => GCM.P[j].land); GC.prov[own].o = 'US'; a2.from = own; o.late = gwWithdraw(a2.id); o.left = !B3.att.includes(a2.id) && a2.at === own; } else { o.late = ''; o.left = true; }
    const od = gwOdds({ p: pi, an: 'US', dn: 'CN', att: [a1.id], def: [d1.id], garr: false }); o.odds = od.pct >= 0 && od.pct <= 100 && od.days > 0; GC.me = null; return o; });
  console.log('sea + joins', JSON.stringify(sea));
  if (sea.fleet.win !== 'att' || !(sea.fleet.d >= 1) || !(sea.fleet.usLeft > 0)) fails.push('sea: 12 ships did not beat 6 ' + JSON.stringify(sea.fleet));
  if (sea.sunk.how !== 'sunk' || sea.sunk.win !== 'att' || !sea.sunk.gone) fails.push('sea: unescorted troops were not sunk ' + JSON.stringify(sea.sunk));
  if (!/locked in combat/.test(sea.early)) fails.push('withdraw: allowed on day 2 (' + sea.early + ')'); if (!/fighting/.test(sea.moveErr)) fails.push('an army in battle accepted a march order');
  if (!sea.joined) fails.push('reinforcements did not join the running battle'); if (sea.late !== '' || !sea.left) fails.push('withdraw after 6 days failed: ' + sea.late); if (!sea.odds) fails.push('odds preview gave nonsense');

  // ---- 5. balance table (N seeds per row)
  const bal = await ev((N) => { grNew({ me: null, seed: 12, len: 'quick' });
    // the table isolates one thing per row: supply lines, air sorties and drone stocks are switched off here and tested as their own rows
    const real = { gsupLine: window.gsupLine, geSortieStock: window.geSortieStock, gmilDrAvail: window.gmilDrAvail }; window.gsupLine = () => ({ eff: 1, km: 0, src: -1, cut: 0, seas: '', why: [] }); window.geSortieStock = () => 0; window.gmilDrAvail = () => 0; const f = GWT.prov('f').i, m = GWT.prov('m').i, u = GWT.prov('u') ? GWT.prov('u').i : -1, j = GWT.prov('j') ? GWT.prov('j').i : -1, V = 30000, rows = [];
    // the rule rows use two nations that field the very same army (same faction, Professional), so only the thing in the row differs
    const byFac = {}; for (const c of Object.keys(GC.nat)) { const k = grNat(c).fac; (byFac[k] = byFac[k] || []).push(c); } const [P1, P2] = Object.values(byFac).find(L => L.length >= 2 && MORALE_STYLE[grNat(L[0]).fac] === 'prof');
    const row = (name, c) => { const r = GWT.run(Object.assign({ an: P1, dn: P2, pi: f, va: V, vd: V }, c), N); rows.push([name, r]); return r; };
    row('Equal armies, open farmland', {}); row('Equal armies, sides swapped', { an: 'CN', dn: 'RU' });
    if (u >= 0) row('Equal, defender in a city', { pi: u }); if (j >= 0) row('Equal, defender in jungle', { pi: j }); row('Equal, defender in mountains', { pi: m }); row('Equal, attacker crosses a river', { river: 1 }); row('Equal, attacker lands from the sea', { amph: 1 });
    row('Equal, attacker has a level-4 general', { genA: 4 }); row('Equal, defender has a level-4 general', { genD: 4 });
    row('Attacker 1.25x the numbers', { va: V * 1.25 }); row('Attacker 1.5x the numbers', { va: V * 1.5 }); row('Attacker 2x the numbers', { va: V * 2 }); row('Attacker 1.5x into mountains', { va: V * 1.5, pi: m }); row('Attacker 2x into mountains', { va: V * 2, pi: m });
    row('Attacker 1.5x vs a level-4 general', { va: V * 1.5, genD: 4 });
    row('Equal, attacker short of ammunition (50%)', { ammoA: 50 }); row('Equal, attacker nearly out (25%)', { ammoA: 25 }); row('Equal, attacker cut off from supply', { cutA: 1 }); row('Attacker 1.5x but cut off', { va: V * 1.5, cutA: 1 });
    window.geSortieStock = (c) => c === P1 ? 4 : 0; row('Equal, attacker has 4 air sorties', {}); window.geSortieStock = () => 0; window.gmilDrAvail = (c) => c === P1 ? 20 : 0; row('Equal, attacker has a one-way drone salvo', {}); window.gmilDrAvail = () => 0;
    row('Zealous Iran attacks the United States, equal', { an: 'IR', dn: 'US' }); row('United States attacks Zealous Iran, equal', { an: 'US', dn: 'IR' }); row('Zealous Iran attacks Russia, equal', { an: 'IR', dn: 'RU' }); row('Russia attacks Zealous Iran, equal', { an: 'RU', dn: 'IR' });
    row('Zealous Lebanese Shia attack the United States, equal', { an: 'RS', dn: 'US' }); row('United States attacks the Zealous Lebanese Shia, equal', { an: 'US', dn: 'RS' }); row('Zealous Iran vs Zealous North Korea', { an: 'IR', dn: 'KP' });
    row('Firepower-reliant Saudi Arabia attacks the United States', { an: 'SA', dn: 'US' }); row('United States attacks Firepower-reliant Saudi Arabia', { an: 'US', dn: 'SA' }); row('Home defender India attacks the United States (abroad)', { an: 'IN', dn: 'US' }); row('United States attacks Home defender India (abroad)', { an: 'US', dn: 'IN' });
    row('China attacks Russia', { an: 'CN', dn: 'RU' }); row('Russia attacks China', { an: 'RU', dn: 'CN' });
    Object.assign(window, real); return rows; }, N);
  const B = Object.fromEntries(bal); for (const [n, r] of bal) console.log(String(r.win).padStart(4) + '% att wins  ' + String(r.days).padStart(3) + ' days  units lost att/def ' + r.la + '%/' + r.ld + '%  value lost ' + r.vla + '%/' + r.vld + '%  ' + n + (r.hung ? '  HUNG ' + r.hung : ''));
  const eq = B['Equal armies, open farmland'], eq2 = B['Equal armies, sides swapped'], mt = B['Equal, defender in mountains'], g4 = B['Equal, attacker has a level-4 general'], x15 = B['Attacker 1.5x the numbers'], x2 = B['Attacker 2x the numbers'], cut = B['Equal, attacker cut off from supply'];
  const zi = B['Zealous Iran attacks the United States, equal'], zr = B['United States attacks Zealous Iran, equal'], zi2 = B['Zealous Iran attacks Russia, equal'], zr2 = B['Russia attacks Zealous Iran, equal'], zi3 = B['Zealous Lebanese Shia attack the United States, equal'], zr3 = B['United States attacks the Zealous Lebanese Shia, equal'];
  const xm = B['Attacker 1.5x into mountains'], xg = B['Attacker 1.5x vs a level-4 general'], xc = B['Attacker 1.5x but cut off'];
  if (bal.some(([, r]) => r.hung)) fails.push('balance: a battle never ended');
  if (eq.win < 40 || eq.win > 60 || eq2.win < 40 || eq2.win > 60) fails.push('balance: equal armies are not about 50/50 (' + eq.win + '%, swapped ' + eq2.win + '%)');
  if (!(mt.win < eq.win - 8)) fails.push('balance: mountains do not help the defender (' + mt.win + '% vs ' + eq.win + '%)'); if (!(g4.win > eq.win + 5)) fails.push('balance: a good general does not help (' + g4.win + '%)');
  if (x15.win < 85 || x2.win < 95 || xm.win <= 50 || xg.win <= 50) fails.push('balance: numbers do not matter more than terrain and generals (1.5x ' + x15.win + '%, 2x ' + x2.win + '%, 1.5x into mountains ' + xm.win + '%, 1.5x vs a top general ' + xg.win + '%)');
  if (cut.win > 15 || xc.win > xm.win + 10 || xc.win > xg.win + 10) fails.push('balance: supply does not matter enough (cut off ' + cut.win + '%, 1.5x but cut off ' + xc.win + '%)');
  const av = (...a) => Math.round(a.reduce((s, x) => s + x, 0) / a.length * 10) / 10;
  const zw = av(zi.win, 100 - zr.win, zi2.win, 100 - zr2.win, zi3.win, 100 - zr3.win), zv = av(zi.vla, zr.vld, zi2.vla, zr2.vld, zi3.vla, zr3.vld), ov = av(zi.vld, zr.vla, zi2.vld, zr2.vla, zi3.vld, zr3.vla), zu = av(zi.la, zr.ld, zi2.la, zr2.ld, zi3.la, zr3.ld), ou = av(zi.ld, zr.la, zi2.ld, zr2.la, zi3.ld, zr3.la);
  console.log('zealous trade: wins ' + zw + '%, value lost zealous ' + zv + '% vs other ' + ov + '%, units lost zealous ' + zu + '% vs other ' + ou + '%');
  if (zw < 38 || zw > 62) fails.push('balance: Zealous side wins ' + zw + '% of equal fights'); if (!(zu > ou)) fails.push('balance: Zealous side does not lose more men (' + zu + '% vs ' + ou + '%)'); if (zv > ov * 1.35 || ov > zv * 1.35) fails.push('balance: Zealous value trade is lopsided (' + zv + '% vs ' + ov + '%)');
  if (zi.mvA || zr.mvD || zi2.mvA || zr2.mvD || zi3.mvA || zr3.mvD) fails.push('balance: a Zealous army moved off the field');
  // every style and every big nation stays within reach of the others at equal price (average of attacking and defending)
  const pr = (a, b) => av(B[a].win, 100 - B[b].win); const sty = { fire: pr('Firepower-reliant Saudi Arabia attacks the United States', 'United States attacks Firepower-reliant Saudi Arabia'), home: pr('Home defender India attacks the United States (abroad)', 'United States attacks Home defender India (abroad)'), cnru: pr('China attacks Russia', 'Russia attacks China') };
  console.log('styles at equal price: ' + JSON.stringify(sty)); for (const k of Object.keys(sty)) if (sty[k] < 25 || sty[k] > 75) fails.push('balance: ' + k + ' wins ' + sty[k] + '% at equal price');
  if (BAL) { const L = ['# Campaign battles on the map — balance proof', '', 'Made by `node orch/gwartest.mjs --balance` (' + N + ' seeded battles per row, two armies of equal price unless the row says otherwise, generated by `grGenUnits`).',
      'Rules: `src/13a-gwar.js`. "Value lost" = share of the army\'s worth (price x health x rank x ammunition) that was destroyed or wounded.', '',
      '| Battle | Attacker wins | Days | Units lost att / def | Value lost att / def |', '|---|---|---|---|---|'];
    for (const [n, r] of bal) L.push('| ' + n + ' | ' + r.win + '% | ' + r.days + ' | ' + r.la + '% / ' + r.ld + '% | ' + r.vla + '% / ' + r.vld + '% |');
    L.push('', '**Reading it**', '', '- Equal armies on open ground: ' + eq.win + '% / ' + eq2.win + '% (target about 50/50).', '- Terrain and generals matter: attacking into mountains ' + mt.win + '%, with a level-4 general ' + g4.win + '%.',
      '- Numbers and supply matter more: 1.5x the numbers ' + x15.win + '% (still ' + xm.win + '% into mountains and ' + xg.win + '% against a top general), 2x ' + x2.win + '%; cut off from supply ' + cut.win + '%, and 1.5x the numbers but cut off only ' + xc.win + '%.',
      '- Styles at equal price, average of attacking and defending against the United States: Firepower-reliant ' + sty.fire + '%, Home defenders abroad ' + sty.home + '%; China against Russia ' + sty.cnru + '%.',
      '- Zealous sides (never retreat): win ' + zw + '% of equal fights, lose ' + zv + '% of their value against ' + ov + '% for the other side, and ' + zu + '% of their units against ' + ou + '%.', '');
    fs.mkdirSync(path.join(ROOT, 'orch', 'reports'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'orch', 'reports', 'eu4-battles.md'), L.join('\n')); console.log('wrote orch/reports/eu4-battles.md'); }
  for (const e of errs) fails.push(e);
  out = fails.length ? 1 : 0; for (const f of fails) console.log('FAIL ' + f); console.log(fails.length ? 'GWAR FAIL' : 'GWAR PASS');
} catch (e) { console.log('GWAR FAIL (crash) ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); out = 1; }
await browser.close(); server.close(); process.exit(out);
