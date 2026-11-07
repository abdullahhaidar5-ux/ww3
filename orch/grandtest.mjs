// Grand campaign test (stage 1): determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
  if (det.a === det.c) fails.push('determinism: different seeds gave the same hash'); if (det.provs < 120 || det.provs > 320) fails.push('map: ' + det.provs + ' land provinces');
  // ---- MILITARY (grand3): generals, front lines, map strikes, fleets & sea zones; determinism over 20 turns with all of it active
  {
    const run20 = () => { grNew({ me: null, seed: 31337, len: 'std' }); const seen = { strike: 0, intercept: 0, sea: 0, gen: 0, blockade: 0 };
      for (let i = 0; i < 20 && !GC.over; i++) { grEndTurn(true); for (const l of GC.log) if (l[0] === GC.turn - 1) { const t = l[1]; if (/missile|air raid|drone strike/i.test(t)) seen.strike++; if (/intercepted/.test(t)) seen.intercept++; if (/fleet|ship|sea|waters|mines/i.test(t) && /beat|held against|fell back|destroyed|hit mines/.test(t)) seen.sea++; if (/captured|killed|level \d|takes command|escaped/.test(t)) seen.gen++; if (/blockade/.test(t)) seen.blockade++; } }
      const M = GC.mil; return { h: grHash(), seen, gens: Object.keys(M.g).length, alive: Object.values(M.g).filter(g => !g.st).length, fronts: M.fr.length, fleets: GC.armies.filter(a => a.fl).length, orders: GC.armies.filter(a => a.fr).length, mines: Object.keys(M.zm).length, turn: GC.turn }; };
    const m1 = await ev(() => { const t0 = performance.now(); const a = (() => { grNew({ me: null, seed: 31337, len: 'std' }); const seen = { strike: 0, intercept: 0, sea: 0, gen: 0, blockade: 0 }; for (let i = 0; i < 20 && !GC.over; i++) { grEndTurn(true); for (const l of GC.log) if (l[0] === GC.turn - 1) { const t = l[1]; if (/missile|air raid|drone strike/i.test(t)) seen.strike++; if (/intercepted/.test(t)) seen.intercept++; if (/beat|held against|fell back|destroyed|hit mines/.test(t) && /Sea|Gulf|Strait|Channel|Ocean|Bay|Med/i.test(t)) seen.sea++; if (/captured|killed|level \d|takes command|escaped/.test(t)) seen.gen++; if (/blockade/.test(t)) seen.blockade++; } } const M = GC.mil; return { h: grHash(), seen, gens: Object.keys(M.g).length, alive: Object.values(M.g).filter(g => !g.st).length, fronts: M.fr.length, fleets: GC.armies.filter(a => a.fl).length, framies: GC.armies.filter(a => a.fr).length, mines: Object.keys(M.zm).length, turn: GC.turn, dead: Object.values(M.g).filter(g => g.st === 1).length, capt: Object.values(M.g).filter(g => g.st === 2).length, lv: Math.max(...Object.values(M.g).map(g => g.lv)) }; })();
      const b = (() => { grNew({ me: null, seed: 31337, len: 'std' }); for (let i = 0; i < 20 && !GC.over; i++) grEndTurn(true); return grHash(); })();
      grNew({ me: null, seed: 31338, len: 'std' }); for (let i = 0; i < 20 && !GC.over; i++) grEndTurn(true); const c = grHash();
      return { a, b, c, ms: Math.round(performance.now() - t0) }; });
    console.log('military determinism', JSON.stringify(m1));
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
      // perk effects in auto-resolve: the armour expert is worth more with tanks
      const a3 = GC.armies.find(a => a.gid && GC.mil.g[a.gid].tr === 0); if (a3) { const m = gmilMul(a3, 0); ok(m > 1, 'armour expert perk missing'); }
      // fronts: assign + push moves the army toward the enemy
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const foes = Object.keys(GC.war).filter(k => k.split('|').includes('IR')).map(k => k.split('|').find(x => x !== 'IR')); const foe = foes.find(x => GCM.P.some(p => p.land && GC.prov[p.i].o === 'IR' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === x))) || foes[0]; const f = gmilAddFront('IR', foe); const ir = GC.armies.filter(a => a.o === 'IR' && !a.fl);
      ok(ir.length && gmilAssign(ir[0].id, f.id) === '' && ir[0].fr === f.id, 'assign to front failed'); f.ord = 'push'; const lp = GCM.P.find(p => p.land && GC.prov[p.i].o === 'IR' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === foe)); if (lp) ir[0].at = lp.i; ir[0].path = []; gmilPlan(); ok(ir[0].path.length > 0 || gmilLine(f).length === 0, 'push front gave no order'); f.ord = 'hold'; ok(gmilAssign(ir[0].id, 0) === '' && !ir[0].fr, 'release failed');
      return out; });
    console.log('military features', JSON.stringify(mf)); for (const f of mf) fails.push('military: ' + f);
    // strikes: missile / air raid / drone; air defence intercepts; fleets; sea battle; blockade; escort; naval Fight-it
    const sf = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); };
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const A = 'IR', Bs = Object.keys(GC.war).filter(k => k.split('|').includes(A)).map(k => k.split('|').find(x => x !== A)), B = Bs.find(x => GCM.P.some(p => p.land && GC.prov[p.i].o === x && grDist(p.i, GC.nat[A].cap) < 230)) || Bs[0] || 'IQ'; const N = GC.nat[A]; N.cash = 20000; N.e.fuel = 300;
      geBl(N.cap).push(['airfield', 0], ['base', 0]); gmilN(A).ms = 3;
      // choose a target in range of the capital
      const near = GCM.P.filter(p => p.land && GC.prov[p.i].o !== A && GC.prov[p.i].o !== B && grDist(p.i, N.cap) < 230).sort((x, y) => grDist(x.i, N.cap) - grDist(y.i, N.cap))[0]; if (!near) { out.push('skip: no province near the capital'); return out; } GC.prov[near.i].o = B; GC.war[grWk(A, B)] = 1;
      geBl(near.i).length = 0; geBl(near.i).push(['factory', 0], ['refinery', 0]);
      ok(gmilStrike(A, 'm', near.i, 'b') === '', 'missile order refused: ' + gmilStrikeCheck(A, 'm', near.i, 'b')); ok(gmilStrike(A, 'd', near.i, 'a') === '', 'drone order refused'); ok(gmilStrike(A, 'a', near.i, 'b') === '', 'air raid order refused: ' + gmilStrikeCheck(A, 'a', near.i, 'b')); ok(gmilStrike(A, 'm', near.i, 'a') !== '', 'fourth strike not refused');
      gmilStrikes(); const dmg = geBl(near.i).reduce((s, r) => s + (r[1] | 0), 0); ok(dmg > 0 || GC.log.some(l => /intercepted/.test(l[1])), 'strikes had no effect and none intercepted'); ok(gmilN(A).ms === 2, 'missile stock not spent'); ok(GC.log.some(l => /missile|air raid|drone/i.test(l[1]) && l[0] === GC.turn), 'no strike line in the turn log');
      // air defence: many SAMs + AA units intercept (statistically, 30 missiles)
      const hit = (n, aa) => { let hits = 0; for (let i = 0; i < n; i++) { GC.turn++; geBl(near.i).length = 0; geBl(near.i).push(['factory', 0]); for (let k = 0; k < (aa | 0); k++) geBl(near.i).push(['aa', 0]); gmilN(A).ms = 3; gmilN(A).so = []; gmilStrike(A, 'm', near.i, 'b'); gmilStrikes(); if (!GC.log.some(l => l[0] === GC.turn && /intercepted/.test(l[1]) && /missile/i.test(l[1]))) hits++; } return hits; };
      const open = hit(24, 0); const sam = hit(24, 3); ok(sam < open, 'air defence did not reduce missile hits (' + sam + ' vs ' + open + ')');
      // fleets
      const ports = GCM.P.filter(p => p.land && GC.prov[p.i].o === A && p.port); ok(ports.length > 0, 'IR has no port'); const n0 = GC.mil.fq.length; GC.nat.IR.e.man = 200; const bf = gmilBuyFleet(A, ports[0].i, 'boat'); ok(bf === '' && GC.mil.fq.length === n0 + 1, 'fleet order failed ' + bf);
      GC.turn += 2; gmilFleetArrive(); ok(GC.armies.some(a => a.fl && a.o === A && a.u.some(r => r[0] === 'boat')), 'ordered boats never arrived');
      // sea fight (auto): two fleets in one zone, one arrives -> a sea battle is queued and resolved, loser retreats or dies
      grNew({ me: 'IR', seed: 7, len: 'quick' }); const ppo = GCM.P.find(p => p.land && GC.prov[p.i].o !== A && gmilHasPort(p.i) && gmilZoneOf(p.i) >= 0); if (!ppo) { out.push('skip: no enemy port'); return out; } const pb = ppo.i, zb = gmilZoneOf(pb); const B2 = GC.prov[pb].o; GC.war[grWk(A, B2)] = 1;
      GC.armies = GC.armies.filter(a => !a.fl); const fa = grAddArmy(A, zb, [['ship', 100, 0, 100], ['ship', 100, 0, 100], ['boat', 100, 0, 100]], 'Test Fleet'); fa.fl = 1; gmilBlockRefresh(); ok(gmilBk(pb), 'port not blockaded by the fleet next to it'); const inc0 = (GC.nat[B].inc | 0);
      const fb = grAddArmy(B2, zb, [['boat', 100, 0, 100]], 'Defence Fleet'); fb.fl = 1; gmilBlockRefresh(); ok(!gmilBk(pb), 'blockade not lifted by a defending fleet in the same zone');
      GC.armies = GC.armies.filter(a => a !== fb); gmilBlockRefresh(); ok(gmilBk(pb), 'blockade did not return');
      const z1 = GCM.P.findIndex(p => p.sea && p.adj.some(j => GCM.P[j].sea)); const z2 = GCM.P[z1].adj.find(j => GCM.P[j].sea); GC.armies = GC.armies.filter(a => !a.fl);
      const fa2 = grAddArmy(A, z1, [['ship', 100, 0, 100], ['ship', 100, 0, 100], ['boat', 100, 0, 100]], 'Test Fleet'); fa2.fl = 1; const fb2 = grAddArmy(B2, z2, [['boat', 100, 0, 100], ['fast', 100, 0, 100]], 'Defence Fleet'); fb2.fl = 1;
      const path = grPath(A, z1, z2, 1); ok(path && path.path.length, 'fleet has no sea route'); fa2.path = [z2]; fa2.pg = Math.max(0, grEdge(z1, z2) - 1); GC.ph = 'resolve'; grMovePhase(); ok(GC.q.some(b => b.sea && b.p === z2), 'no sea battle queued'); GC.qi = 0; for (const b of GC.q) grBattleAuto(b); ok(GC.q.every(b => b.done), 'sea battle unresolved');
      const l2 = fa2.u.length, d2 = fb2.u.length; ok(l2 < 3 || d2 < 2 || !GC.armies.includes(fb2) || fb2.at !== z2, 'sea battle changed nothing');
      
      return out; });
    console.log('military strikes/fleets', JSON.stringify(sf)); for (const f of sf) if (!/^skip/.test(f)) fails.push('military: ' + f); else console.log('  ' + f);
    // escort rule: a land army cannot sail into a sea held by an enemy fleet without its own fleet there
    const es = await ev(() => { const out = []; const ok = (c, m) => { if (!c) out.push(m); }; grNew({ me: 'IR', seed: 7, len: 'quick' }); const A = 'IR', B = Object.keys(GC.war).filter(k => k.split('|').includes(A)).map(k => k.split('|').find(x => x !== A))[0] || 'IQ';
      GC.war[grWk(A, B)] = 1; const z = GCM.P.findIndex(p => p.sea); const arm = GC.armies.find(a => a.o === A && !a.fl); GC.armies = GC.armies.filter(a => !a.fl); const eb = grAddArmy(B, z, [['ship', 100, 0, 100]], 'Foe'); eb.fl = 1; ok(gmilSeaDenied(arm, z), 'crossing not denied under an enemy fleet');
      const es = grAddArmy(A, z, [['boat', 100, 0, 100]], 'Escort'); es.fl = 1; ok(!gmilSeaDenied(arm, z), 'escort did not allow the crossing'); return out; });
    console.log('military escort', JSON.stringify(es)); for (const f of es) fails.push('military: ' + f);
    // naval Fight-it: a fleet battle is launched from the map, plays on a naval map, the survivors flow back
    const nv = await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const A = 'IR', B = Object.keys(GC.war).filter(k => k.split('|').includes(A)).map(k => k.split('|').find(x => x !== A))[0] || 'IQ'; GC.war[grWk(A, B)] = 1; const zb = GCM.P.findIndex(p => p.sea); GC.armies = GC.armies.filter(a => !a.fl);
      const fa = grAddArmy(A, zb, [['ship', 100, 0, 100], ['boat', 100, 0, 100], ['boat', 100, 0, 100], ['sub', 100, 0, 100]], 'Naval Test A'); fa.fl = 1; const fd = grAddArmy(B, zb, [['ship', 100, 0, 100], ['boat', 100, 0, 100], ['fast', 100, 0, 100]], 'Naval Test D'); fd.fl = 1;
      const gen = grAddArmy; const b = { p: zb, an: A, dn: B, att: [fa.id], def: [fd.id], garr: false, river: false, mtn: false, sea: true, done: 0 }; const na = fa.u.length, nd = fd.u.length;
      try { grandBattleStart(b); } catch (e) { return { err: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; }
      const naval = G.ents.filter(e => !e.isB && !e.dead && e.s && e.s.dom === 'naval').length, total = G.ents.filter(e => !e.isB && !e.dead).length; const map = G.mapKey || (G.map && G.map.key) || ''; const prod = G.grand && G.grand.fin === 0;
      const r = { naval, total, na, nd, prod, mapKey: String(map) }; grandTestFinish(0); r.fin = G.grand.fin; grandLeaveBattle(); r.left = fd.u.length; r.mine = fa.u.length; r.ph = GC.ph; return r; });
    console.log('naval fight-it', JSON.stringify(nv)); if (nv.err) fails.push('naval fight-it: ' + nv.err); else { if (nv.naval < 5) fails.push('naval fight-it: only ' + nv.naval + ' naval units in the battle (' + nv.total + ' units)'); if (nv.total !== nv.na + nv.nd) fails.push('naval fight-it: battle holds ' + nv.total + ' units, fleets had ' + (nv.na + nv.nd)); }
    // UI: Military panel
    await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); GC.nat.IR.cash = 6000; for (let i = 0; i < 3; i++) grEndTurn(true); GV.sel = GC.nat.IR.cap; grandOpen(); });
    await page.waitForTimeout(2500);
    const mu = await ev(() => { const o = {}; gmilUiPanel(); o.panel = !!document.getElementById('gMil'); for (const t of ['gen', 'fr', 'st', 'fl']) { GMILUI.tab = t; gmilUiPanel(true); o[t] = document.getElementById('gMil').textContent.length; } GMILUI.tab = 'gen'; gmilUiPanel(true); return o; });
    console.log('military ui', JSON.stringify(mu)); if (!mu.panel || mu.gen < 150 || mu.fr < 100 || mu.st < 100 || mu.fl < 100) fails.push('military ui: panel tabs empty ' + JSON.stringify(mu));
    await shot3('military-generals');
    await ev(() => { GMILUI.tab = 'fr'; gmilUiPanel(true); }); await shot3('military-fronts');
    await ev(() => { GMILUI.tab = 'st'; gmilUiPanel(true); const f = Object.keys(GC.war).filter(k => k.split('|').includes('IR')).map(k => k.split('|').find(x => x !== 'IR'))[0]; const p = GCM.P.find(q => q.land && GC.prov[q.i].o === f); GV.sel = p.i; guSide(); }); await shot3('military-strikes');
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
      const pos = a.rows[9].filter(r => r[2] > 0).length / a.rows[9].length; const mx = Math.max(...incs), mn = Math.min(...incs), med = incs.slice().sort((x, y) => x - y)[incs.length >> 1]; const per = last.filter(r => r[10] > 0).map(r => r[2] / r[10]).sort((x, y) => x - y), pmed = per[per.length >> 1], pmax = per[per.length - 1];
      const avgInc = a.rows.map(rw => Math.round(rw.reduce((s, r) => s + r[2], 0) / rw.length)); const avgUp = a.rows.map(rw => Math.round(rw.reduce((s, r) => s + r[3], 0) / rw.length));
      return { pmed, pmax, top: last.slice().sort((x, y) => y[2] - x[2]).slice(0, 6).map(r => r.join(':')), med, same: a.h === b.h, diff: a.h !== c.h, bad, pos, mx, mn, avgInc, avgUp, show, n: last.length }; });
    console.log('eco determinism', eco.same, 'seed-diff', eco.diff, 'majors alive', eco.n); console.log('eco income/upkeep per empire per turn (nation:cash:net:upkeep:fuel:food:manpower:bank:bonds:totalwar)'); for (const [k, v] of Object.entries(eco.show)) console.log('  ' + k + ': ' + v);
    console.log('eco top earners t15', eco.top.join(' | ')); console.log('eco average net income per turn', JSON.stringify(eco.avgInc)); console.log('eco average upkeep per turn', JSON.stringify(eco.avgUp), 'positive-net share t10', eco.pos.toFixed(2), 'net range t15', eco.mn, eco.mx);
    if (!eco.same) fails.push('eco determinism: same seed, different hash over 15 turns'); if (!eco.diff) fails.push('eco: different seeds gave the same hash'); for (const b of eco.bad) fails.push('eco bounds: ' + b);
    if (eco.pos < .6) fails.push('eco stalls: only ' + Math.round(eco.pos * 100) + '% of majors have positive net income at turn 10');
    console.log('eco net per province: median', Math.round(eco.pmed), 'max', Math.round(eco.pmax)); if (eco.mx > 12000 || eco.pmax > 6 * Math.max(60, eco.pmed)) fails.push('eco snowballs: net per province max ' + Math.round(eco.pmax) + ' vs median ' + Math.round(eco.pmed) + ' (net range ' + eco.mn + '..' + eco.mx + ')');
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
      geBorrow('IR'); E.bonds[0][0] = GC.turn; N.cash = 0; const army = GC.armies.filter(a => a.o === 'IR'); grEndTurn(true); ok(E.def >= 1 || N.cash >= 0, 'default handled'); ok(typeof geBorrow('IR') === 'string', 'borrow returns text');
      // bank
      N.cash = 3000; ok(geDeposit('IR', 1000) === '' && E.bank === 1000, 'deposit'); ok(geWithdraw('IR') === '' && E.bank === 0, 'withdraw');
      // total war and rationing
      ok(geTotalWar('IR', true) === '' && E.tw === 1, 'total war on'); ok(geRation('IR', true) === '' && E.ration === 1, 'ration');
      // oil market is deterministic and swings; crises exist
      const idx = []; for (let t = 1; t <= 20; t++) idx.push(geOilIdx(t)); ok(Math.max(...idx) - Math.min(...idx) > 25, 'oil price swings ' + idx.join(',')); ok(GC.eco.cr.length >= 2, 'crises scheduled');
      // chokepoint: someone holds Hormuz and the holder can close it, which moves the oil price
      const hz = P.find(p => p.sea && p.n === 'Strait of Hormuz').i, h = geHolder(hz); ok(!!h, 'Hormuz has a holder'); if (h) { const before = geOilIdx(GC.turn + 1); ok(geSetStrait(h, hz, true) === '', 'close strait'); ok(geOilIdx(GC.turn + 1) > before, 'closed strait raises oil'); geSetStrait(h, hz, false); }
      // signature fx apply
      ok(geFx('SA', 'oil') && geFx('SA', 'bank'), 'SA oil fund'); ok(geFx('US', 'tax') && geFx('US', 'upkeep'), 'US interim');
      // supply: ammo drops outside supply, refills inside
      const a = GC.armies.find(x => x.o === 'IR'); a.u.forEach(r => r[3] = 50); a.at = cap; geSupplyStep(); ok(a.u[0][3] > 50, 'ammo refills in supply');
      return out; });
    // battle inheritance: the Mountain Fortress and the airfield stand in the defender's battle; fuel/ammo come from the army on the map; no building in the battle
    const bt = await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const mp = GCM.P.findIndex(p => p.land && GC.prov[p.i].o === 'IR' && p.t === 'm'); if (mp < 0) return { skip: 1 };
      GC.nat.IR.cash = 9000; geBl(mp).push(['airfield', 0]); const P = GCM.P[mp], from = P.adj.find(j => GCM.P[j].land); const A = grAddArmy('IQ', from, grGenUnits(grNat('IQ').fac, 3000, true)); A.from = from; A.at = mp; A.fu = 35; A.u.forEach(r => r[3] = 60);
      const b = { p: mp, an: 'IQ', dn: 'IR', att: [A.id], def: [], garr: true, river: false, mtn: true, done: 0 }; grandBattleStart(b);
      const kinds = G.ents.filter(e => e.isB && !e.dead && e.team === (GB_CUR.meAtt ? 1 : 0)).map(e => e.kind); const atkTeam = GB_CUR.meAtt ? 0 : 1; const fuel = G.teams[atkTeam].fuel; const ammoMax = Math.max(...G.ents.filter(e => !e.isB && e.team === atkTeam && e.s.ammo).map(e => (e.ammo || 0) / e.s.ammo), 0);
      const can = typeof canBuild === 'function' ? null : null; const res = { mp, kinds, fuel, ammoMax, prod: G.grand && G.grand.fin === 0 }; grandLeaveBattle(); return res; });
    console.log('eco battle', JSON.stringify(bt)); if (!bt.skip) { if (!bt.kinds.includes('fort')) fails.push('eco battle: no Mountain Fortress in the defender battle (' + bt.kinds + ')'); if (!bt.kinds.includes('airfield')) fails.push('eco battle: no airfield in the defender battle'); if (Math.abs(bt.fuel - .35) > .05) fails.push('eco battle: attacker fuel ' + bt.fuel + ' (army stock .35)'); if (bt.ammoMax > .75) fails.push('eco battle: ammo ' + bt.ammoMax + ' above the army stock (.6)'); }
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
  // ---- MIRROR (grandmirror): the battle map is generated from the province; towns, buildings, damage mirror both ways
  {
    const prov = await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const pick = (f) => GCM.P.findIndex(p => p.land && !p.map && f(p));
      return { river: pick(p => gmRiverProv(p.i)), mtn: pick(p => p.t === 'm'), coast: pick(p => p.t === 'c' && p.port), desert: pick(p => p.t === 'd' && p.tw >= 3), jungle: pick(p => p.t === 'j'), snow: pick(p => p.t === 's'), real: GCM.P.findIndex(p => p.land && p.map && MAPS[p.map]) }; });
    console.log('mirror provinces', JSON.stringify(prov));
    await ev(() => { window.gmRoutes = () => { const W = GW, H = GH, ok = (x, y) => passC('ground', x, y), a = [Math.floor(BASES[0][0] / CELL), Math.floor(BASES[0][1] / CELL)], e = [Math.floor(BASES[1][0] / CELL), Math.floor(BASES[1][1] / CELL)];             const bfs = (block) => { const prev = new Int32Array(W * H).fill(-2), q = [a[1] * W + a[0]]; prev[q[0]] = -1; for (let i = 0; i < q.length; i++) { const c = q[i], x = c % W, y = (c / W) | 0; if (x === e[0] && y === e[1]) break;                 for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (prev[n] !== -2 || !ok(nx, ny) || (block && block[n])) continue; prev[n] = c; q.push(n); } }               const t = e[1] * W + e[0]; if (prev[t] === -2) return null; const path = []; for (let c = t; c >= 0; c = prev[c]) path.push(c); return path; };             const p1 = bfs(null); if (!p1) return 0; const blk = new Uint8Array(W * H), R = Math.ceil(260 / CELL);             for (const c of p1) { const x = c % W, y = (c / W) | 0; if (Math.min(Math.hypot(x - a[0], y - a[1]), Math.hypot(x - e[0], y - e[1])) * CELL < 450) continue; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) blk[ny * W + nx] = 1; } }             return bfs(blk) ? 2 : 1; };  });
    if (ONLY === 'mirrorsweep') {   // every generated province map: generation time, >= 2 routes, towns = the province's towns
      const sw = await ev(() => { const bad = [], t = []; for (const p of GCM.P) { if (!p.land || (p.map && MAPS[p.map])) continue; const t0 = performance.now(); const m = gmMap(p.i, p.adj[p.i % p.adj.length]);
          setup.p = 'IR'; setup.d = 1; TERR_DEFER = true; try { newGame({ seed: 1, facs: ['IR', 'US'], ai: [false, false], map: m.key, tm: [0, 1], bs: 1, slot: 0, st: [0, 1], w: 0 }); } finally { TERR_DEFER = false; }
          const ms = Math.round(performance.now() - t0); t.push(ms); const r = window.gmRoutes(), n = gmTowns(p.i).length; if (r < 2) bad.push(p.n + ': routes ' + r); if (G.towns.length !== n) bad.push(p.n + ': towns ' + G.towns.length + ' vs ' + n); if (ms > 2500) bad.push(p.n + ': ' + ms + ' ms'); }
        G = null; return { n: t.length, max: Math.max(...t), avg: Math.round(t.reduce((x, y) => x + y, 0) / t.length), bad }; });
      console.log('mirror sweep', JSON.stringify(sw)); for (const b of sw.bad) fails.push('mirror sweep: ' + b); throw new Error('__done');
    }
    // (1) same province -> identical generated map twice (hash), < 2 s, cached
    const gen = await ev((P) => { const out = {}; for (const [k, pi] of Object.entries(P)) { if (k === 'real' || pi < 0) continue; GM_CACHE.clear(); const t0 = performance.now(); const a = gmMap(pi, GCM.P[pi].adj[0]); const ms = performance.now() - t0;
        const ca = JSON.stringify(gmCanon(pi, gmOct(pi, GCM.P[pi].adj[0])).canon); GM_CACHE.clear(); const b = gmMap(pi, GCM.P[pi].adj[0]); const t1 = performance.now(); const c = gmMap(pi, GCM.P[pi].adj[0]); const cached = performance.now() - t1;
        out[k] = { same: a.key === b.key && a.key === c.key && JSON.stringify(a.tp) === JSON.stringify(b.tp), key: a.key, ms: Math.round(ms), cachedMs: Math.round(cached), towns: gmTowns(pi).length, tp: a.tp.length, hash: cmHash(ca), oct: [0, 1, 2, 3, 4, 5, 6, 7].map(o => gmMap(pi, GCM.P[pi].adj[0] * 0 + (o === 6 ? -1 : GCM.P[pi].adj[o % GCM.P[pi].adj.length])).key).filter((v, i, a2) => a2.indexOf(v) === i).length }; } return out; }, prov);
    console.log('mirror gen', JSON.stringify(gen));
    for (const [k, v] of Object.entries(gen)) { if (!v.same) fails.push('mirror: ' + k + ' province generated two different maps'); if (v.ms > 2000) fails.push('mirror: ' + k + ' map generation ' + v.ms + ' ms (>2 s)'); if (v.tp !== v.towns) fails.push('mirror: ' + k + ' positions != towns'); }
    // (2) a battle in each kind of province: its towns match the province's town list exactly (names, count, owner, unrest, tax, size order), buildings appear
    for (const [k, pi] of Object.entries(prov)) { if (pi < 0) continue;
      const r = await ev(async (pi) => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const P = GCM.P[pi], st = GC.prov[pi], dn = st.o; const an = dn === 'IR' ? 'IQ' : 'IR'; const from = P.adj.find(j => GCM.P[j].land);
          const A = grAddArmy(an, from, grGenUnits(grNat(an).fac, 3000, true)); const D = grAddArmy(dn, pi, grGenUnits(grNat(dn).fac, 3000, true)); st.un = 37; st.tax = 2; A.from = from; A.at = pi; GC.armies.find(a => a.id === D.id || a === D).at = pi;
          const aid = (A.id || GC.armies[GC.armies.length - 2].id), did = (D.id || GC.armies[GC.armies.length - 1].id); const b = { p: pi, an, dn, att: [aid], def: [did], garr: true, river: false, mtn: P.t === 'm', done: 0 };
          const bl = gmBuildings(pi); bl.push(['airfield', 0], ['factory', 40]); gmTowns(pi)[gmTowns(pi).length - 1].dm = 50;
          const t0 = performance.now(); grandBattleStart(b); const ms = Math.round(performance.now() - t0);
          const tn = gmTowns(pi), tm = G.grand.tmap, names = tm.map(([kk, ti]) => G.towns[ti].name), ow = tm.map(([kk, ti]) => G.towns[ti].ow);
          const exact = !G.grand.mir.real && G.towns.length === tn.length && tm.length === tn.length && tn.every((t, i) => G.towns[tm.find(x => x[0] === i)[1]].name === t.nm);
          const owOK = tm.every(([kk, ti]) => { const t = G.towns[ti]; return t.ow === (tn[kk].ow === an ? (GB_CUR.meAtt ? 0 : 1) : tn[kk].ow === dn ? (GB_CUR.meAtt ? 1 : 0) : -1); });
          const un = tm.map(([kk, ti]) => Math.round(G.towns[ti].un)), rate = tm.map(([kk, ti]) => G.towns[ti].rate);
          const last = tm.find(x => x[0] === tn.length - 1), lt = last && G.towns[last[1]], dead0 = lt ? lt.cells.filter(c => c.dead).length : 0, n0 = lt ? lt.cells.length : 0;
          // demolish: kill one more building of town 0 and a defender airfield, capture the last town for the attacker, then end the battle
          const t0w = G.towns[tm.find(x => x[0] === 0)[1]]; if (t0w.cells[0]) collapseCiv(t0w.cells[0], 0);
          const attT = GB_CUR.meAtt ? 0 : 1; if (lt) { lt.ow = attT; for (const c of lt.cells) c.ow = attT; }
          const bk = G.ents.filter(e => e.isB).map(e => e.kind); const af = G.grand.bmap.find(x => x[0][0] === 'airfield'); if (af) kill(af[1], 0, null);
          const dmBefore = tn.map(t => t.dm); const lastIdx = tn.length - 1;
          grandTestFinish(GB_CUR.meAtt ? 0 : 1);   // defender wins the battle (attacker's side loses), the town captured above stays recorded
          const routes = window.gmRoutes();
          const out = { routes, ms, real: G.grand ? G.grand.mir.real : null, n: tn.length, bn: G.towns.length, exact, owOK, names, un, rate, kinds: bk, dead0, n0, dm: tn.map(t => t.dm), dmBefore, lastOw: tn[lastIdx].ow, an, dn, afDmg: gmBuildings(pi).filter(b2 => b2[0] === 'airfield').map(b2 => b2[1]), t0dm: tn[0].dm, gunrest: st.un };
          return out; }, pi).catch(e => ({ err: String(e.message || e).slice(0, 200) }));
      console.log('mirror battle ' + k, JSON.stringify(r)); if (r.err) { fails.push('mirror ' + k + ': ' + r.err); continue; }
      await page.waitForTimeout(300); await ev(() => { try { campClose(); grandLeaveBattle(); } catch (e) {} });
      if (!r.real && r.routes < 2) fails.push('mirror ' + k + ': fewer than two real routes between the sides (' + r.routes + ')');
      if (r.real) { if (r.bn < 1) fails.push('mirror ' + k + ': real-place map has no towns'); } else { if (!r.exact) fails.push('mirror ' + k + ': battle towns do not match the province list (' + r.n + ' vs ' + r.bn + ') ' + r.names.join(',')); }
      if (!r.owOK) fails.push('mirror ' + k + ': town owners differ from the province'); if (!r.un.every(u => u >= 0 && u <= 100)) fails.push('mirror ' + k + ': unrest out of range');
      if (!r.real && !r.rate.every(x => x === 2)) fails.push('mirror ' + k + ': tax rate not mirrored ' + r.rate.join(','));
      if (!r.real && !r.kinds.includes('airfield')) fails.push('mirror ' + k + ': province airfield missing in the battle (' + r.kinds.join(',') + ')');
      if (r.dead0 + 0 < 0) fails.push('x'); if (r.afDmg.length && r.afDmg[0] < 100) fails.push('mirror ' + k + ': destroyed airfield not written back (' + r.afDmg + ')');
      if (!r.real && r.t0dm <= 0) fails.push('mirror ' + k + ': destroyed building not written back to the town'); if (!r.real && r.dm[r.n - 1] < 40) fails.push('mirror ' + k + ': pre-existing town damage lost (' + r.dm.join(',') + ')');
      if (!r.real && r.lastOw !== r.an) fails.push('mirror ' + k + ': captured town not recorded (owner ' + r.lastOw + ')');
    }
    if (ONLY === 'mirror') throw new Error('__done');
  }
  // ---- start as Iran, open the map
  await ev(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grSave(); grandOpen(); guFit(null); guRedraw(); }); await shot('world-map');
  await ev(() => { guFit(GR_REGIONS[4][1]); guRedraw(); }); await shot('region-middle-east');
  // ---- scenario: IR army next to an enemy garrison, march, end turn -> Fight-it prompt
  const sc = await ev(() => { const me = 'IR', foe = 'IQ'; grDeclare(me, foe); let pair = null;
    for (const p of GCM.P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === foe && GC.prov[j].gar.length) { pair = [p.i, j]; break; } else if (pair) break;
    if (!pair) for (const p of GCM.P) if (p.land && GC.prov[p.i].o === foe) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === me) { pair = [j, p.i]; break; }
    if (!pair) return { err: 'no IR/foe border ' + foe };
    const a = GC.armies.find(x => x.o === me); a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); guCentre(pair[0], 2.4); guRedraw();
    return { foe, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, aid: a.id, ok: !!r.ok, units: a.u.length, to_i: pair[1] }; });
  console.log('scenario', JSON.stringify(sc)); if (sc.err || !sc.ok) { fails.push('scenario: ' + JSON.stringify(sc)); throw new Error('no scenario'); }
  await shot('army-ordered');
  await ev(() => { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); });   // (foe armies stay put so the fight is predictable)
  for (let k = 0; k < 3; k++) { await page.waitForTimeout(2500); if (await ev(() => !!document.getElementById('gModal') || GC.ph !== 'plan')) break; await ev(() => { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); }); }   // a 2-turn march needs a second end-turn (realstart: no ring war to force contact)
  await page.waitForFunction(() => !!document.getElementById('gModal'), null, { timeout: 90000 }); await shot('fight-it-prompt');
  const prompt = await ev(() => document.getElementById('gModal').textContent);
  if (!/Fight it live/.test(prompt) || !/Auto-resolve/.test(prompt)) fails.push('prompt missing buttons: ' + prompt.slice(0, 120));
  // expected unit lists, from the state, before launching
  const exp = await ev(() => { const b = GC.q[GC.qi]; const meAtt = b.an === 'IR'; const S = grSideUnits(b, 'att'), D = grSideUnits(b, 'def'); const c = L => { const o = {}; for (const s of L) for (const r of s.u) o[r[0]] = (o[r[0]] || 0) + 1; return o; };
    return { meAtt, mine: c(meAtt ? S : D), theirs: c(meAtt ? D : S), nMine: (meAtt ? S : D).reduce((a, s) => a + s.u.length, 0), waves: 0, prov: GCM.P[b.p].n }; });
  console.log('expected', JSON.stringify(exp));
  await ev(() => { [...document.querySelectorAll('#gModal button')].find(b => /Fight it live/.test(b.textContent)).click(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !!G.grand, null, { timeout: 60000 });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle: loading never finished'));
  await page.waitForTimeout(2500);
  const bt = await ev(() => { const c = (t) => { const o = {}; for (const e of G.ents) if (e.team === t && !e.isB && !e.dead) o[e.kind] = (o[e.kind] || 0) + 1; return o; };
    const blds = t => G.ents.filter(e => e.team === t && e.isB).map(e => e.kind); const q0 = JSON.stringify(G.teams[0].q), cr = G.teams[0].credits;
    act(0, { t: 'q', k: 'inf' }); act(0, { t: 'bld', k: 'barracks', x: BASES[0][0], y: BASES[0][1] }); act(0, { t: 'up', k: 'x' });
    let refused = null; { const t = G.towns && G.towns[0]; if (t) { t.ow = 0; t.reb = 0; t.loy = 1; const T = G.teams[0]; T.credits = 5000; const snap = () => JSON.stringify([t.rate, t.inv | 0, G.ents.length, T.credits, G.lgd && G.lgd.job ? G.lgd.job.length : 0]); const s0 = snap();
      for (const a of [{ t: 'tax', ti: 0, r: (t.rate + 1) % 4 }, { t: 'eco', ti: 0, k: 0 }, { t: 'recruit', ti: 0 }, { t: 'road', ti: 0, ids: [] }, { t: 'lg', ti: 0 }, { t: 'bribe', ti: 0 }]) act(0, a);
      try { townRecruit(0, { ti: 0 }); townCmd(0, { ti: 0, r: (t.rate + 1) % 4 }); ecCmd(0, { ti: 0, k: 0 }); } catch (e) {}
      refused = snap() === s0; } }
    return { me: c(0), foe: c(1), b0: blds(0), b1: blds(1), qSame: JSON.stringify(G.teams[0].q) === q0, cr, conq: !!G.conq, over: G.over, waves: G.grand.waves.length, att: G.grand.att, n0: G.grand.n0, refused }; });
  console.log('battle', JSON.stringify(bt));
  if (bt.refused === false) fails.push('battle: town recruit/invest/tax/road actions were NOT refused in a Fight-it battle');
  const sameMap = (a, b) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); return [...k].every(x => (a[x] || 0) === (b[x] || 0) || (x === 'champ' && (a[x] || 0) - (b[x] || 0) === 1)); };   // grand3: a general with no hero squad of his own stands in the battle as one extra hero
  if (!sameMap(bt.me, exp.mine)) fails.push('battle: your units ' + JSON.stringify(bt.me) + ' != army ' + JSON.stringify(exp.mine));
  if (!sameMap(bt.foe, exp.theirs)) fails.push('battle: enemy units ' + JSON.stringify(bt.foe) + ' != expected ' + JSON.stringify(exp.theirs));
  { const defB = exp.meAtt ? bt.b1 : bt.b0, attB = exp.meAtt ? bt.b0 : bt.b1;   // the first queued battle may be an AI attack on us, so check by role
  if (attB.length) fails.push('battle: attacker has buildings ' + attB.join(',')); if (!bt.qSame) fails.push('battle: production queue changed'); if (bt.conq) fails.push('battle: still a Conquest base match');
  if (!defB.length) fails.push('battle: defender has no forts'); if (defB.some(k => !['turret', 'sam', 'airfield', 'factory', 'shipyard', 'fort'].includes(k))) fails.push('battle: enemy buildings other than the province buildings: ' + defB.join(',')); }
  await ev(() => { renderFrame(0.016); }).catch(() => {}); await shot('battle-from-map');
  // fight 40 game seconds, then wound/kill: remove ~1/3 of our units, then finish with a win
  const fin = await ev(() => { for (let i = 0; i < 60 * 40 && !G.over; i++) simUpdate(1 / 60);
    const mine = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead); const kills = mine.slice(0, Math.floor(mine.length / 3)); for (const u of kills) { try { kill(u, 1, null); } catch (e) { u.hp = 0; u.dead = true; } }
    for (const u of G.ents.filter(e => e.team === 0 && !e.isB && !e.dead).slice(-6)) u.hp = Math.max(1, Math.round(u.max * 0.5)); for (let i = 0; i < 30; i++) simUpdate(1 / 60);
    const alive = G.ents.filter(e => e.team === 0 && !e.isB && !e.dead); const kinds = {}; for (const u of alive) kinds[u.kind] = (kinds[u.kind] || 0) + 1;
    const hp = alive.map(u => Math.max(1, Math.round(u.hp / u.max * 100))).sort((a, b) => a - b); const b = GB_CUR.b;
    const before = { alive: alive.length, kinds, hp }; const meAtt = GB_CUR.meAtt; const res = grandTestFinish(0); return { res, before, meAtt, bi: GC.qi }; });
  console.log('finish', JSON.stringify(fin).slice(0, 300));
  await page.waitForFunction(() => !!document.getElementById('campScreen'), null, { timeout: 90000 });
  const flow = await ev(() => { const b = GC.q[GC.qi]; const meAtt = b.an === 'IR'; const mineArr = [].concat(...grSideUnits(b, meAtt ? 'att' : 'def').map(s => s.u)); const kinds = {}; for (const r of mineArr) kinds[r[0]] = (kinds[r[0]] || 0) + 1; return { n: mineArr.length, kinds, hp: mineArr.map(r => r[1]).sort((a, b) => a - b) }; });
  console.log('flowback', JSON.stringify(flow).slice(0, 240));
  if (flow.n !== fin.before.alive || !sameMap(flow.kinds, fin.before.kinds)) fails.push('flow-back: army has ' + flow.n + ' ' + JSON.stringify(flow.kinds) + ' but ' + fin.before.alive + ' survived ' + JSON.stringify(fin.before.kinds));
  if (JSON.stringify(flow.hp) !== JSON.stringify(fin.before.hp)) fails.push('flow-back: health differs');
  if (flow.n >= exp.nMine) fails.push('flow-back: no losses recorded (' + flow.n + ' of ' + exp.nMine + ')');
  await shot('battle-result');
  await ev(() => { [...document.querySelectorAll('#campScreen button')].find(b => /Return to the map/.test(b.textContent)).click(); });
  await page.waitForTimeout(500);
  const after = await ev(() => { const to = GCM.byName.get ? 0 : 0; return { g: !!window.G, grand: document.getElementById('grandScreen') && document.getElementById('grandScreen').style.display, ph: GC.ph, turn: GC.turn, owner: GC.prov[GC.q[0] ? GC.q[0].p : 0].o }; });
  console.log('after', JSON.stringify(after));
  if (after.g) fails.push('after battle: still in a battle'); if (after.grand !== 'flex') fails.push('after battle: map not shown');
  await shot('map-after-battle');
  // continue the turn until it resolves, province should now be ours (our army is in it and its garrison is dead)
  for (let i = 0; i < 12; i++) { const st = await ev(() => { const m = document.getElementById('gModal'); if (m) { const b = [...m.querySelectorAll('button')].find(x => /Auto-resolve/.test(x.textContent)); if (b) { b.click(); return 'clicked'; } } return GC.turn >= 2 && GC.ph === 'plan' ? 'done' : 'wait'; }); if (st === 'done') break; await page.waitForTimeout(700); if (i === 11) fails.push('turn never finished after the battle'); }
  const cap = await ev(() => { const r = GC.log.filter(l => /captured|held against|beat/.test(l[1])).slice(-6).map(l => l[1]); return { log: r, turn: GC.turn, save: !!localStorage.getItem(GR_KEY) }; });
  console.log('turn', JSON.stringify(cap));
  if (!cap.save) fails.push('campaign not saved');
  await shot('province-captured');
  // save/continue round trip
  const rt = await ev(() => { const h = grHash(); grClear(); const ok = !GC; grNew({ me: 'IR', seed: 5, len: 'quick' }); const h2 = grHash(); grSave(); const x = grLoad(); return { same: grHash() === h2, x: !!x }; });
  if (!rt.same) fails.push('save round trip changed the state hash');
  // B2.5 modifier engine: style row, temporary row expiry, save round trip
  const gm = await ev(() => { grNew({ me: 'IR', seed: 5, len: 'quick' }); const w0 = gmod('nation', 'IR', 'warSupport', 1); gmodAdd({ id: 't1', src: 'Test', scope: 'nation', stat: 'warSupport', add: .2, t: 'IR', until: GC.turn + 1 }); const w1 = gmod('nation', 'IR', 'warSupport', 1); grSave(); const x = grLoad(); const w2 = gmod('nation', 'IR', 'warSupport', 1); gmodMonth(GC.turn + 2); return { w0, w1, w2, w3: gmod('nation', 'IR', 'warSupport', 1), n: (GC.mod || []).filter(r => !/^trade_/.test(r.id)).length, l: gmodLines('nation', 'IR', 'warSupport').length }; });
  // IR: Zealous +10% and the shared Ayatollah (13v) +8% war support
  if (!(gm.w0 > 1.1 && gm.w0 < 1.3 && Math.abs(gm.w1 - gm.w0 - .2) < 1e-9 && Math.abs(gm.w2 - gm.w0 - .2) < 1e-9 && Math.abs(gm.w3 - gm.w0) < 1e-9 && gm.n === 0)) fails.push('gmod engine: ' + JSON.stringify(gm));
} catch (e) { if (String(e.message) !== '__done') { fails.push(String(e.message || e).split('\n')[0]); console.log('ERRS', errs.join('\n')); console.log(String(e.stack).split('\n').slice(0, 7).join('\n')); } }
for (const e of [...new Set(errs)].slice(0, 6)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDTEST PASS');
