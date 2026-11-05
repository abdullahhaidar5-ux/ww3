// Hamlet placement probe: per map x player count, hamlets + houses, and fairness (nearest-hamlet driving distance per base)
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const FACS = ['US','RU','IR','CN','TR','IL','EU','UA'];
const maps = process.argv[2] ? process.argv[2].split(',') : null;
const out = [];
const list = W.ev('Object.keys(MAPS).map(k=>[k,MAPS[k].max,MAPS[k].min||2])');
for (const [k, mx, mn] of list) {
  if (maps && !maps.includes(k)) continue;
  for (const n of [...new Set([Math.max(2, mn), 2, 4, mx].filter(v => v >= Math.max(2, mn) && v <= mx))]) {
    const r = W.ev(`(()=>{setWorld(worldScaleFor(${n},'${k}'));setBases(${n},'${k}',-1);const sv=srand;let M;try{M=mkMap(5,'${k}');}finally{srand=sv;}
      const cell=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL),DB=BASES.map(([x,y])=>gridDist(M.grid,x,y));
      const H=M.hamlets||[];const near=BASES.map((b,i)=>H.map(h=>DB[i][cell(h.x,h.y)]).filter(v=>v<1e8).sort((a,b)=>a-b).slice(0,2).map(v=>Math.round(v)));
      return {H:H.length,houses:H.reduce((a,h)=>a+h.n,0),near,cities:M.cities.length-H.length};})()`);
    out.push(`${k.padEnd(10)} n=${n} hamlets=${r.H} houses=${r.houses} cities=${r.cities} nearest2/base=${JSON.stringify(r.near)}`);
  }
}
console.log(out.join('\n'));
