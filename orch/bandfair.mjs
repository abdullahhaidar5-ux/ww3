// Town-band fairness (static, no battles): for every map x player count it supports, builds the map and reports per base the
// REAR / MIDDLE / CENTRE town bands by driving distance, with tax potential (the Conquest numbers: hamlet 3.6/s, town 8.5/s,
// centre prize town 12.8/s at Normal), whether the roads join everything, and flags unfair layouts.
//   node orch/bandfair.mjs [--maps a,b] [--seed 5] [--ns 2,3,4] [--json out.json] [--quiet]
import fs from 'node:fs';
import { makeSim } from './headless.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const only = arg('maps', '') ? arg('maps').split(',') : null, seed = +arg('seed', 5), nsF = arg('ns', '') ? arg('ns').split(',').map(Number) : null;
const { W } = makeSim();
const list = W.ev('Object.keys(MAPS).map(k=>[k,MAPS[k].max,MAPS[k].min||2])');
const rows = [], bad = [];
for (const [k, mx, mn] of list) {
  if (only && !only.includes(k)) continue;
  for (let n = Math.max(2, mn); n <= mx; n++) {
    if (nsF && !nsF.includes(n)) continue;
    const r = W.ev(`(()=>{setWorld(worldScaleFor(${n},'${k}'));setBases(${n},'${k}',-1);const sv=srand;let M;try{M=mkMap(${seed},'${k}');}finally{srand=sv;}
      const cell=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL),DB=BASES.map(([x,y])=>gridDist(M.grid,x,y));
      const eD=BASES.map((b,i)=>Math.min(...BASES.map((q,j)=>j===i?1e9:DB[i][cell(q[0],q[1])])));
      const T=M.cities.map(c=>({x:c.x|0,y:c.y|0,ham:!!c.ham,prize:!!c.prize,d:DB.map(Q=>{let m=1e9;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const v=Q[cell(c.x+dx*CELL,c.y+dy*CELL)];if(v<m)m=v;}return Math.round(m);})}));
      // road network connectivity of the bases (roads join if their end points are within 80 of each other)
      const nd=[];const near=(p)=>{for(let i=0;i<nd.length;i++)if(Math.hypot(nd[i][0]-p[0],nd[i][1]-p[1])<90)return i;nd.push(p);return nd.length-1;};
      const par=[];const fd=i=>par[i]===i?i:(par[i]=fd(par[i]));const add=i=>{while(par.length<=i)par.push(par.length);};
      for(const r of M.roadNet){const a=near(r[0]),b=near(r[r.length-1]);add(Math.max(a,b));par[fd(a)]=fd(b);}
      const bn=BASES.map(p=>{let bi=-1,bd=95;nd.forEach((q,i)=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;bi=i;}});return bi;});
      const roadOK=bn.every(i=>i>=0)&&bn.every(i=>fd(i)===fd(bn[0]));
      // two routes: the number of road edges touching the prize town
      return {E:BASES.length,W:MAPW,H:MAPH,eD:eD.map(Math.round),T,roads:M.roadNet.length,roadOK};})()`);
    const E = Math.min(...r.eD), nb = r.eD.length;
    const rear = Array(nb).fill(0).map(() => ({ n: 0, tax: 0 })), mid = Array(nb).fill(0).map(() => ({ n: 0, tax: 0 }));
    let contested = 0, prize = null;
    const val = t => t.prize ? 12.8 : t.ham ? 3.6 : 8.5;
    for (const t of r.T) {
      const o = t.d.map((v, i) => [v, i]).filter(q => q[0] < 1e8).sort((a, b) => a[0] - b[0]);
      if (!o.length) continue;
      if (t.prize) { prize = t; continue; }
      const [d0, i0] = o[0], d1 = o[1] ? o[1][0] : 1e9;
      if (d0 / d1 < .8) { const f = d0 / r.eD[i0], w = f <= .25 ? 1 : f >= .45 ? 0 : (.45 - f) / .2; rear[i0].n += w; rear[i0].tax += val(t) * w; mid[i0].n += 1 - w; mid[i0].tax += val(t) * (1 - w); }
      else { contested++; for (const [d, i] of o) if (d <= d0 * 1.2) { mid[i].n += 1 / 2; mid[i].tax += val(t) / 2; } }
    }
    const pd = prize ? prize.d.filter(v => v < 1e8) : [];
    const fl = [];
    const rmin = Math.min(...rear.map(b => b.n)), rtmin = Math.min(...rear.map(b => b.tax)), rtmax = Math.max(...rear.map(b => b.tax));
    if (rmin < 2) fl.push('rear<2');
    if (rtmax > 0 && rtmin > 0 && rtmax / rtmin > 1.4 && rtmax - rtmin > 5) fl.push('rear-tax-spread');
    const mmin = Math.min(...mid.map(b => b.tax)), mmax = Math.max(...mid.map(b => b.tax));
    if (mmax > 0 && mmin > 0 && mmax / mmin > 1.6 && mmax - mmin > 6) fl.push('mid-tax-spread');
    if (mmin <= 0) fl.push('mid=0');
    if (!prize) fl.push('no-prize'); else if (nb <= 3 && pd.length === nb && Math.max(...pd) / Math.min(...pd) > 1.3) fl.push('prize-dist-spread ' + (Math.max(...pd) / Math.min(...pd)).toFixed(2));
    if (!r.roadOK) fl.push('roads-not-joined');
    if (contested + mid.reduce((a, b) => a + b.n, 0) < 2) fl.push('mid<2');
    const row = { map: k, n, W: r.W, H: r.H, E: Math.round(E), rear: rear.map(b => `${b.n.toFixed(1)}/${b.tax.toFixed(1)}`), mid: mid.map(b => `${b.n.toFixed(1)}/${b.tax.toFixed(1)}`), contested, prize: pd.join('/'), roads: r.roads, flags: fl };
    rows.push(row); if (fl.length) bad.push(row);
    if (!process.argv.includes('--quiet')) console.log(`${k.padEnd(11)} n=${n} E=${row.E} rear[${row.rear.join(' ')}] mid[${row.mid.join(' ')}] cont=${contested} prize[${row.prize}] rd=${r.roads}${fl.length ? '  !! ' + fl.join(', ') : ''}`);
  }
}
console.log(`\n${rows.length} layouts, ${bad.length} flagged`);
const jf = arg('json', ''); if (jf) fs.writeFileSync(jf, JSON.stringify(rows));
