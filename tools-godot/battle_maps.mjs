// Battle maps for the Godot Battle mode (orch/godot-battle): same export as extract.mjs, but the Battle starts with
// as many players as the map's most (bases for 4-player maps). Writes godot/data/map_<key>.json.
//   node tools-godot/battle_maps.mjs bm_fourmills:4 bm_ferryquarter:2
import fs from 'node:fs';
import path from 'node:path';
import { makeSim } from '../orch/headless.mjs';
const OUT = path.resolve('godot/data');
const FACS = ['IR', 'US', 'RS', 'IL', 'IR', 'US', 'RS', 'IL'];
for (const a of process.argv.slice(2)) {
  const [mk, n] = a.split(':');
  const { W } = makeSim();
  W.start({ seed: 1, facs: FACS.slice(0, +n || 2), map: mk, battle: 1 });
  const m = JSON.parse(W.ev(`JSON.stringify((()=>{const rm=G.roadMask,h=G.hgrid;return {key:G.mapKey,name:(MAPS[G.mapKey]||{}).name,MAPW,MAPH,GW,GH,CELL,
    bases:BASES.map(b=>[b[0],b[1]]),grid:Array.from(G.grid),cover:Array.from(G.cover),wood:Array.from(G.wood||[]),
    road:rm?{C:rm.C||16,w:rm.w,d:Array.from(rm.d||rm.a||[])}:null,hgrid:h?{R:h.R,w:h.w,h:h.h,a:Array.from(h.a,v=>Math.round(v*100)/100)}:null,
    fields:G.fields.map(f=>({x:f.x,y:f.y,r:f.r,amt:f.amt})),
    oil:G.oil.map(o=>({x:o.x,y:o.y,tb:o.tb||null,pw:o.pw||0,sea:o.sea||0,max:o.max}))};})())`));
  fs.writeFileSync(path.join(OUT, 'map_' + m.key + '.json'), JSON.stringify(m));
  console.log(`map_${m.key}.json: ${m.name} ${m.MAPW}x${m.MAPH}, ${m.bases.length} bases, ${m.fields.length} fields, ${m.oil.length} derricks/tech, grid codes ${[...new Set(m.grid)]}`);
}
