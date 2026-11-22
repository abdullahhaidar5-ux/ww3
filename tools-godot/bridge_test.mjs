// Proof for the JS-sim bridge bundle (godot/web/ww3sim.js), in Node:
//   node tools-godot/bridge_test.mjs                 quick: same state hash as orch/headless.mjs, API shapes, orders
//   node tools-godot/bridge_test.mjs --nations       every playable nation starts and runs 60 s
//   node tools-godot/bridge_test.mjs --long          4-player AI battle, 10 game-minutes, ms per tick
//   node tools-godot/bridge_test.mjs --bench         500 units a side attack-moving: ms per tick incl. the bulk read
import fs from 'node:fs';
import vm from 'node:vm';
import { makeSim } from '../orch/headless.mjs';
const has = k => process.argv.includes('--' + k);
vm.runInThisContext(fs.readFileSync(new URL('../godot/web/ww3sim.js', import.meta.url), 'utf8'), { filename: 'ww3sim.js' });
const B = globalThis.WW3; let fail = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) fail++; };
const PM = ['sin', 'cos', 'atan2', 'exp', 'pow'];
const T = JSON.parse(B.tables());
if (has('nations')) {
  for (let i = 0; i < T.nations.length; i += 2) {
    const a = T.nations[i].key, b = T.nations[(i + 1) % T.nations.length].key;
    try { B.newGame({ map: 'bm_splitridge', seed: 3, players: [{ nation: a, team: 0 }, { nation: b, team: 1 }] }); const r = JSON.parse(B.step(3600)); ok(r.n > 8 && r.t > 59, `${a} vs ${b}: 60 s, ${r.n} entities, teams ${r.teams.map(t => t.units + 'u/' + t.blds + 'b').join(' ')}`); }
    catch (e) { ok(false, `${a} vs ${b}: ${e.message}`); }
  }
} else if (has('long')) {
  const facs = ['IR', 'US', 'RU', 'TR'];
  B.newGame({ map: 'bm_fourmills', seed: 1, players: facs.map((f, i) => ({ nation: f, team: i })) });
  let worst = 0, sum = 0, k = 0, r;
  for (let s = 0; s < 600 * 30; s++) { r = JSON.parse(B.step(2)); B.entBuf(); worst = Math.max(worst, r.ms); sum += r.ms; k++; if (r.over) break; if (s % 1800 === 1799) console.log(`  min ${Math.round(r.t / 60)}: ${r.n} entities  ${r.teams.map(t => t.nation + ' ' + t.units + 'u ' + t.blds + 'b $' + t.credits).join(' | ')}`); }
  ok(r.t >= 599 || r.over, `4-player AI battle ran ${Math.round(r.t)} s (over=${r.over}); mean ${(sum / k / 2).toFixed(2)} ms per tick, worst 30 Hz frame ${worst.toFixed(1)} ms`);
} else if (has('bench')) {
  B.newGame({ map: 'bm_splitridge', seed: 1, players: [{ nation: 'IR', ai: false, team: 0 }, { nation: 'US', ai: false, team: 1 }] });
  B.ev(`(()=>{for(let t=0;t<2;t++){const b=BASES[t],k=['inf','tank','inf','apc','inf'].filter(q=>{const s=stats(G.teams[t].fac,q);return s&&s.dom==='ground';});for(let i=0;i<500;i++){const u=addUnit(t,k[i%k.length],b[0]+(i%25)*22-270,b[1]+((i/25)|0)*22-220);}}})()`);
  const ids = t => JSON.parse(JSON.stringify(B.ev(`G.ents.filter(e=>!e.isB&&e.team===${t}&&e.kind!=='harv'&&e.kind!=='dozer').map(e=>e.id)`)));
  const bs = B.ev('BASES.slice(0,2).map(b=>[b[0],b[1]])');
  B.order(0, { t: 'go', mode: 'amove', ids: ids(0), x: bs[1][0], y: bs[1][1] }); B.order(1, { t: 'go', mode: 'amove', ids: ids(1), x: bs[0][0], y: bs[0][1] });
  let sum = 0, worst = 0, k = 0, n0 = 0, rd = 0;
  for (let s = 0; s < 60 * 60; s++) { const r = JSON.parse(B.step(1)); const t0 = performance.now(); B.entBuf(); B.projBuf(); rd += performance.now() - t0; if (!s) n0 = r.n; sum += r.ms; worst = Math.max(worst, r.ms); k++; }
  console.log(`  bench: ${n0} entities at start (500 units a side), 60 game-seconds: mean ${(sum / k).toFixed(2)} ms per tick (sim + state fill + JSON), worst ${worst.toFixed(1)} ms, buffer views ${(rd / k).toFixed(3)} ms`);
} else {
  ok(T.kinds.length > 40 && T.nations.length === 22, `tables: ${T.kinds.length} kinds, ${T.nations.length} nations, ${T.maps.length} maps, ${T.weapons.length} weapons`);
  // 1) same hash as the reference headless sim, every 30 s for 3 minutes
  const { W } = makeSim(); W.start({ seed: 7, facs: ['IR', 'US'], map: 'bm_splitridge', battle: 1, diff: 1, portMath: PM });
  B.newGame({ map: 'bm_splitridge', seed: 7, diff: 1, players: [{ nation: 'IR', team: 0 }, { nation: 'US', team: 1 }] });
  let same = W.hash() === B.hash(), evN = 0, types = new Set();
  for (let i = 0; i < 6 && same; i++) { W.step(30); for (let s = 0; s < 900; s++) { const r = JSON.parse(B.step(2)); evN += r.ev.length; for (const e of r.ev) types.add(e[0]); } same = W.hash() === B.hash(); }
  ok(same, `state hash equals orch/headless.mjs after 180 s (${B.hash()})`);
  ok(evN > 20, `${evN} events, types: ${[...types].join(' ')}`);
  const r = JSON.parse(B.step(2)), ent = new Float32Array(B.entBuf().slice().buffer);
  ok(ent.length === r.n * B.ES && r.n > 10, `entity buffer: ${r.n} entities x ${B.ES} floats`);
  ok(r.teams.length === 2 && r.teams[0].credits >= 0 && r.teams[0].cap > 0, `teams: ${JSON.stringify(r.teams[0]).slice(0, 230)}`);
  const mm = JSON.parse(B.mapMeta()); ok(B.mapBuf('grid').length === mm.GW * mm.GH && B.mapBuf('hgrid').length === mm.hgrid.w * mm.hgrid.h * 4, `map: ${mm.name} ${mm.MAPW}x${mm.MAPH}, ${mm.civ.length} map buildings, ${mm.trees.length} trees, ${mm.oil.length} derricks/capturables`);
  const L = JSON.parse(B.lines()); ok(L.roads.length > 0 && L.bead[0] && L.bead[0].length > 0, `supply lines: ${L.roads.length} roads, team 0 has ${L.bead[0].length} road circles`);
  const fg = B.fog(0); let vis = 0; for (const v of fg) if (v === 2) vis++; ok(vis > 50, `fog: ${vis} of ${fg.length} cells visible to team 0`);
  const ru = JSON.parse(B.rules('IR')); ok(Object.keys(ru.units).length > 5 && ru.blds.barracks, `rules IR: ${Object.keys(ru.units).length} units, ${Object.keys(ru.blds).length} buildings, ${Object.keys(ru.upg).length} upgrades, ${ru.powers.length} powers`);
  // 2) a human seat: nothing moves by itself; a move order moves the unit; train + build work
  B.newGame({ map: 'bm_splitridge', seed: 2, players: [{ nation: 'RS', ai: false, team: 0 }, { nation: 'IL', ai: true, team: 1 }] });
  let s0 = JSON.parse(B.step(2)); const E = () => new Float32Array(B.entBuf().slice().buffer);
  let a = E(); const find = (a, pred) => { for (let i = 0; i < a.length; i += B.ES) if (pred(a, i)) return i; return -1; };
  const iInf = find(a, (a, i) => a[i + 2] === 0 && T.kinds[a[i + 1]] === 'inf'), id = a[iInf], x0 = a[iInf + 3], y0 = a[iInf + 4];
  B.order(0, { t: 'go', ids: [id], x: x0 + 300, y: y0 }); for (let s = 0; s < 240; s++) B.step(2); a = E();
  const j = find(a, (a, i) => a[i] === id); ok(j >= 0 && Math.abs(a[j + 3] - (x0 + 300)) < 60, `move order: soldier ${id} went from x=${Math.round(x0)} to x=${Math.round(a[j + 3])}`);
  const hq = find(a, (a, i) => a[i + 2] === 0 && T.kinds[a[i + 1]] === 'hq'), dz = find(a, (a, i) => a[i + 2] === 0 && T.kinds[a[i + 1]] === 'dozer');
  B.order(0, { t: 'bld', k: 'barracks', x: a[hq + 3] + 260, y: a[hq + 4] + 40, dz: a[dz] }); let built = false, ready = false;
  for (let s = 0; s < 30 * 60 && !built; s++) { const r = JSON.parse(B.step(2)); for (const e of r.ev) if (e[0] === 'built' && e[1] === 0) built = true; }
  ok(built, 'build order: barracks placed by the dozer and finished ("built" event)');
  a = E(); const bk = find(a, (a, i) => a[i + 2] === 0 && T.kinds[a[i + 1]] === 'barracks');
  if (bk >= 0) { B.order(0, { t: 'q', k: 'inf', tid: a[bk] }); for (let s = 0; s < 30 * 40 && !ready; s++) { const r = JSON.parse(B.step(2)); for (const e of r.ev) if (e[0] === 'ready' && e[1] === 0) ready = true; } }
  ok(ready, 'train order: infantry queued at the barracks came out ("ready" event)');
}
console.log(fail ? `BRIDGE FAIL (${fail})` : 'BRIDGE PASS'); process.exit(fail ? 1 : 0);
