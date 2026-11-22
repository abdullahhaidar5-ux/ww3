// P1 (supply lines + garrisons): adds to godot/data/map_<key>.json what src/03c-logistics.js lgInit and the garrison code read
// from the map: the road graph (lg.N nodes, lg.E road polylines), bridges (with the path-grid cells of each deck) and the
// garrisonable map buildings (G.civ). Merges into the existing file, other keys untouched.
//   node tools-godot/p1_maps.mjs bm_splitridge:2 bm_ferryquarter:2 bm_fourmills:4
import fs from 'node:fs';
import path from 'node:path';
import { makeSim } from '../orch/headless.mjs';
const OUT = path.resolve('godot/data');
const FACS = ['IR', 'US', 'RS', 'IL', 'IR', 'US', 'RS', 'IL'];
for (const a of process.argv.slice(2)) {
  const [mk, n] = a.split(':');
  const { W } = makeSim();
  W.start({ seed: 1, facs: FACS.slice(0, +n || 2), map: mk, battle: 1 });
  const x = JSON.parse(W.ev(`JSON.stringify((()=>{const L=G.lg,B=G.map.bridges||[];return {key:G.mapKey,
    lg:{N:L.N.slice(0,L.nS).map(n=>({x:n.x,y:n.y,b:n.b})),E:L.E.slice(0,L.n0).map(e=>({a:e.a,b:e.b,pts:e.pts}))},
    bridges:B.map(b=>({x:b.x,y:b.y,h:b.h,n:b.n,t:b.t,a:b.a,b:b.b,cells:lgBrCells(b).slice()})),
    civ:G.civ.map(c=>({i:c.i,k:c.k,x:c.x,y:c.y,hp:c.hp,max:c.max,cap:c.cap,h:Math.round(c.h*10)/10,ruin:c.ruin?1:0})),
    civAt:[...G.civAt.entries()].map(([k,c])=>[k,c.i])};})())`));
  const f = path.join(OUT, 'map_' + x.key + '.json');
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  m.lg = x.lg; m.bridges = x.bridges; m.civ = x.civ; m.civAt = x.civAt;
  fs.writeFileSync(f, JSON.stringify(m));
  console.log(`map_${x.key}.json: ${x.lg.N.length} road nodes, ${x.lg.E.length} roads, ${x.bridges.length} bridges, ${x.civ.length} garrisonable buildings`);
}
