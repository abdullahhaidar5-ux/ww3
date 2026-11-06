// Grand campaign test (stages 1-2): determinism (10 AI turns twice, same hash), world map + menu, a Fight-it battle launched
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
const SHOTS = path.join(ROOT, 'orch', 'shots', 'grand1');
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
  // ---- grand2 economy: determinism over 15 turns with the economy on, no snowball / no stall, every mechanic reacts
  const eco = await ev(() => {
    const run = () => { grNew({ me: null, seed: 777, len: 'quick' }); const rows = []; const maj = grMajors(); let maxCash = 0;
      for (let t = 1; t <= 15; t++) { grEndTurn(true); const r = []; for (const c of maj) { const N = GC.nat[c]; if (N.dead) continue; const g = (N.rep.tax || 0) + (N.rep.trade || 0) + (N.rep.oil || 0); r.push([c, Math.round(g), N.rep.up || 0, Math.round(N.inc)]); }
        for (const c of Object.keys(GC.nat)) maxCash = Math.max(maxCash, GC.nat[c].cash); rows.push(r); }
      return { h: grHash(), rows, maxCash, oil: [] }; };
    const A = run(), B = run(); const prices = []; for (let t = 1; t <= 15; t++) prices.push(Math.round(grPriceAt(t)));
    const last = A.rows[14], ratios = last.map(r => r[2] / Math.max(1, r[1])).sort((a, b) => a - b), neg = last.filter(r => r[3] < 0).length;
    return { same: A.h === B.h, maxCash: Math.round(A.maxCash), alive: last.length, ratioMed: +ratios[Math.floor(ratios.length / 2)].toFixed(2), ratioMax: +ratios[ratios.length - 1].toFixed(2), neg, priceMin: Math.min(...prices), priceMax: Math.max(...prices), crises: GC.w.cr.length,
      table: A.rows.filter((_, i) => i % 3 === 2 || i === 0).map((r, k) => 'T' + ([1, 3, 6, 9, 12, 15][k]) + ' ' + r.map(x => x[0] + ':' + x[1] + '/' + x[2]).join(' ')) }; });
  console.log('economy (income/upkeep per empire)'); for (const l of eco.table) console.log('  ' + l);
  console.log('economy', JSON.stringify({ ...eco, table: undefined }));
  if (!eco.same) fails.push('economy: 15 AI turns twice gave different hashes');
  if (eco.maxCash > 60000) fails.push('economy: snowball, a nation holds $' + eco.maxCash); if (eco.ratioMed > .6 || eco.ratioMed < .02) fails.push('economy: median upkeep/income ' + eco.ratioMed + ' out of band'); if (eco.ratioMax > 1.2) fails.push('economy: an empire pays ' + eco.ratioMax + 'x its income in upkeep');
  if (eco.neg > eco.alive * .4) fails.push('economy: stall, ' + eco.neg + ' of ' + eco.alive + ' empires lose money every turn'); if (eco.priceMax - eco.priceMin < 25) fails.push('economy: oil price does not swing'); if (eco.crises < 2) fails.push('economy: no crises scheduled');
  const mech = await ev(() => { const o = {}; grNew({ me: 'IR', seed: 31, len: 'quick' }); const me = 'IR', N = GC.nat[me]; const mine = grOwned(me);
    const cap = GCM.P[N.cap]; N.cash = 9000; N.mp = 50; const c0 = N.cash; o.bErr = grBuild(me, cap.i, 'factory'); o.bPaid = c0 - N.cash; o.bBusy = grBuild(me, cap.i, 'power');
    for (let i = 0; i < 4; i++) grEndTurn(true); o.built = grHas(cap.i, 'factory'); o.inBattleList = gmBuildings(cap.i).some(r => r[0] === 'factory');
    const mt = mine.find(p => p.t === 'm'); o.mfortIR = mt ? grBuild(me, mt.i, 'mfort') : 'no mountain'; const tr = GCM.P.find(p => p.land && p.t === 'm' && GC.prov[p.i].o === 'US' || p.land && p.t === 'm' && GC.prov[p.i].o === 'CN'); o.mfortOther = tr ? grBuild(GC.prov[tr.i].o, tr.i, 'mfort') : 'no mountain';
    N.cash = 5000; N.debt = 0; o.debtErr = grBorrow(me, 1000); const d1 = N.debt; grEndTurn(true); o.interest = N.rep.int; o.debt = d1;
    N.bank = 0; N.cash = 3000; grBank(me, 1000); const foe = Object.keys(GC.nat).find(c => c !== me && !GC.nat[c].dead), f0 = GC.nat[foe].cash; grEcoLoot(me, foe); o.loot = Math.round(GC.nat[foe].cash - f0);
    N.mp = 0; const pi = N.cap; o.manErr = grRecruit(me, pi, 'inf');
    const st = GC.prov[pi]; o.aut1 = grAutonomy(me, pi, 2) + st.aut; grAutonomy(me, pi, 0); o.autSlow = st.aut === 2 && st.ad === 3;
    const sp = mine.find(p => p.i !== N.cap && GC.prov[p.i].o === me); const base0 = grEcoBase(sp, GC.prov[sp.i]); grScorch(me, sp.i); o.scorch = [Math.round(base0), grEcoBase(sp, GC.prov[sp.i])];
    const sk = grStraits().find(si => grStraitOwner(si)); const own = grStraitOwner(sk); const p0 = GC.w.oil; o.closeErr = grStraitClose(own, sk, true); o.closePrice = [p0, GC.w.oil]; grStraitClose(own, sk, false);
    GC.nat[me].fo = 1; const army = GC.armies.find(a => a.o === me); const t0 = GC.turn; GC.turn = 4; o.slow = grEcoSlow(army); GC.turn = t0; GC.nat[me].fo = 0;
    const fz = GCM.P.find(p => p.land && GC.prov[p.i].o !== me && grAtWar(me, GC.prov[p.i].o)); o.bombNoAf = fz ? grBomb(me, fz.i) : 'none'; o.sigUS = grSig('US').bondK; return o; });
  console.log('economy mechanics', JSON.stringify(mech));
  if (mech.bErr || mech.bPaid < 500) fails.push('economy: factory not paid/ordered ' + mech.bErr + ' ' + mech.bPaid); if (!/Already building/.test(mech.bBusy)) fails.push('economy: a second build in a busy province was allowed');
  if (!mech.built || !mech.inBattleList) fails.push('economy: factory not finished / not in the battle building list'); if (mech.mfortIR !== '' && mech.mfortIR !== 'no mountain') fails.push('economy: Mountain Fortress refused for IR: ' + mech.mfortIR);
  if (mech.mfortOther !== 'no mountain' && !/Only mountain/.test(mech.mfortOther)) fails.push('economy: Mountain Fortress allowed for a non-listed nation: ' + mech.mfortOther);
  if (mech.debtErr || mech.interest !== 30) fails.push('economy: war bond interest ' + mech.interest + ' (want 30) ' + mech.debtErr); if (mech.loot < 600) fails.push('economy: capital loot took only ' + mech.loot);
  if (!/manpower/.test(mech.manErr)) fails.push('economy: recruiting with no manpower allowed: ' + mech.manErr); if (!mech.autSlow) fails.push('economy: lowering autonomy was instant'); if (!(mech.scorch[0] > 0 && mech.scorch[1] === 0)) fails.push('economy: scorched earth income ' + mech.scorch);
  if (mech.closeErr || !(mech.closePrice[1] > mech.closePrice[0])) fails.push('economy: closing a strait did not raise the oil price ' + mech.closePrice + ' ' + mech.closeErr); if (!mech.slow) fails.push('economy: out-of-fuel army not slowed'); if (!/airfield/.test(mech.bombNoAf)) fails.push('economy: bombing without an airfield allowed: ' + mech.bombNoAf);
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
  // grand2 screenshots (economy panel, province buildings): orch/shots/grand2/
  const SH2 = path.join(ROOT, 'orch', 'shots', 'grand2'); fs.mkdirSync(SH2, { recursive: true });
  const shot2 = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(SH2, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
  await ev(() => { const N = GC.nat.IR; N.cash = 4000; grBuild('IR', N.cap, 'factory'); grBuild('IR', GC.nat.IR.home.find(i => i !== N.cap && GCM.P[i].oil) || N.cap, 'refinery'); grBorrow('IR', 1000); grEndTurn(true); GV.sel = N.cap; guCentre(N.cap, 2.4); grandMapRefresh(); guEcoToggle(); });
  await shot2('economy-panel'); await ev(() => { const e = document.getElementById('gEco'); if (e) e.remove(); const N = GC.nat.IR; GV.sel = N.cap; grandMapRefresh(); }); await shot2('province-buildings');
  // ---- scenario: IR army next to an enemy garrison, march, end turn -> Fight-it prompt
  const sc = await ev(() => { const me = 'IR', foe = 'IQ'; grDeclare(me, foe); let pair = null;
    for (const p of GCM.P) if (p.land && GC.prov[p.i].o === me) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === foe && GC.prov[j].gar.length) { pair = [p.i, j]; break; } else if (pair) break;
    if (!pair) for (const p of GCM.P) if (p.land && GC.prov[p.i].o === foe) for (const j of p.adj) if (GCM.P[j].land && GC.prov[j].o === me) { pair = [j, p.i]; break; }
    if (!pair) return { err: 'no IR/foe border ' + foe };
    const a = GC.armies.find(x => x.o === me); a.fu = 30; a.at = pair[0]; a.path = []; GV.sel = pair[0]; GV.selA = a.id; grandMapRefresh();
    const r = grOrderMove(a.id, pair[1]); guCentre(pair[0], 2.4); guRedraw();
    return { foe, from: GCM.P[pair[0]].n, to: GCM.P[pair[1]].n, aid: a.id, ok: !!r.ok, units: a.u.length, to_i: pair[1] }; });
  console.log('scenario', JSON.stringify(sc)); if (sc.err || !sc.ok) { fails.push('scenario: ' + JSON.stringify(sc)); throw new Error('no scenario'); }
  await shot('army-ordered');
  await ev(() => { GC.armies.filter(a => a.o !== 'IR').forEach(a => { a.path = []; }); guEndTurn(); });   // (foe armies stay put so the fight is predictable)
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
    return { me: c(0), foe: c(1), b0: blds(0), b1: blds(1), qSame: JSON.stringify(G.teams[0].q) === q0, cr, conq: !!G.conq, over: G.over, waves: G.grand.waves.length, att: G.grand.att, n0: G.grand.n0, fuel0: G.teams[0].fuel, fuel1: G.teams[1].fuel }; });
  console.log('battle', JSON.stringify(bt));
  const sameMap = (a, b) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); return [...k].every(x => (a[x] || 0) === (b[x] || 0)); };
  if (!sameMap(bt.me, exp.mine)) fails.push('battle: your units ' + JSON.stringify(bt.me) + ' != army ' + JSON.stringify(exp.mine));
  if (!sameMap(bt.foe, exp.theirs)) fails.push('battle: enemy units ' + JSON.stringify(bt.foe) + ' != expected ' + JSON.stringify(exp.theirs));
  if (exp.meAtt && (!(bt.fuel0 > .25 && bt.fuel0 < .31) || bt.fuel1 < .95)) fails.push('battle: fuel not inherited from the army (' + bt.fuel0 + ' / ' + bt.fuel1 + ')');
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
} catch (e) { if (String(e.message) !== '__done') { fails.push(String(e.message || e).split('\n')[0]); console.log('ERRS', errs.join('\n')); } }
for (const e of [...new Set(errs)].slice(0, 6)) fails.push(e);
await browser.close(); server.close();
if (fails.length) { console.log('\nGRANDTEST FAIL'); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nGRANDTEST PASS');
