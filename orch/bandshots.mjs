// Overview pictures of a map's Conquest layout (terrain, roads, bases, town bands) -> orch/shots/conquest-maps/<map>-<n>p.png
//   node orch/bandshots.mjs khyber:2 fulda:3 delta:4 hormuz:3
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const specs = process.argv.slice(2).filter(a => !a.startsWith('--'));
fs.mkdirSync('orch/out', { recursive: true });
for (const sp of specs) {
  const [k, n] = sp.split(':');
  const r = W.ev(`(()=>{setWorld(worldScaleFor(${n},'${k}'));setBases(${n},'${k}',-1);const sv=srand;let M;try{M=mkMap(5,'${k}');}finally{srand=sv;}
    const cell=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL),DB=BASES.map(([x,y])=>gridDist(M.grid,x,y));
    const eD=BASES.map((b,i)=>Math.min(...BASES.map((q,j)=>j===i?1e9:DB[i][cell(q[0],q[1])])));
    const T=M.cities.map(c=>{const d=DB.map(Q=>{let m=1e9;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const v=Q[cell(c.x+dx*CELL,c.y+dy*CELL)];if(v<m)m=v;}return m;});
      const o=d.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);let band='mid';if(c.prize)band='centre';else if(o[1]&&o[0][0]/o[1][0]<.8)band=o[0][0]/eD[o[0][1]]<=.34?'rear':'mid';else band='contested';
      return {x:c.x|0,y:c.y|0,ham:!!c.ham,band,own:o[0][1]};});
    return {k:'${k}',n:${n},W:MAPW,H:MAPH,GW,GH,grid:Array.from(M.grid).join(''),bases:BASES.map(b=>[b[0]|0,b[1]|0]),T,roads:M.roadNet.map(r=>r.map(p=>[p[0]|0,p[1]|0])),name:(MAPS['${k}']||{}).name};})()`);
  const jf = `orch/out/band-${k}-${n}.json`; fs.writeFileSync(jf, JSON.stringify(r));
  execFileSync('python3', ['-I', 'orch/bandshots.py', jf, `orch/shots/conquest-maps/${k}-${n}p.png`], { stdio: 'inherit' });
}
