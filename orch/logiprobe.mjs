// Logistics probe: road graph, cut-off, trade route, cratering, road building in the headless sim.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const map = process.argv[2] || 'fulda';
W.start({ seed: 3, facs: ['US', 'RU'], map });
W.ev('G.teams.forEach(T=>{T.ai=null;})');
console.log('graph', W.ev('JSON.stringify({nodes:G.lg.N.length,edges:G.lg.E.length,towns:G.towns.length})'));
W.step(5);
// hand team 0 the towns nearest its base (own network), team 1 one in the middle
console.log(W.ev(`(()=>{const B=BASES[0];const ts=[...G.towns].sort((a,b)=>Math.hypot(a.x-B[0],a.y-B[1])-Math.hypot(b.x-B[0],b.y-B[1]));
  for(const t of ts.slice(0,3))for(const c of t.cells)if(c.key)c.ow=0;G.civDirty=true;return ts.slice(0,3).map(t=>t.name).join(',')})()`));
W.step(3);
const st = () => W.ev(`JSON.stringify(G.towns.filter(t=>t.ow===0).map(t=>[t.name,t.cut|0,t.trade|0,+t.tax.toFixed(2)]))`);
console.log('owned', st());
// crater every road edge touching the first owned town
console.log(W.ev(`(()=>{const t=G.towns.find(t=>t.ow===0&&t.cut===0&&t.trade===1);if(!t)return 'no trade town';const ni=G.lg.tn[t.i];let n=0;
  G.lg.E.forEach((e,i)=>{if(e.a===ni||e.b===ni){for(let k=0;k<4;k++){const m=e.pts[e.pts.length>>1];lgBlast(m[0],m[1],60,200,'shell');}n++;}});return t.name+' edges hit '+n+' craters '+Object.keys(G.lgd.cr).length})()`));
W.step(2);
console.log('after crater', st());
console.log('log', W.ev(`JSON.stringify((G.fxlog||[]).slice(-3))`));
W.step(40);
console.log('after 40s', st(), 'craters', W.ev('Object.keys(G.lgd.cr).length'));
W.step(130);
console.log('after 170s', st(), 'craters', W.ev('Object.keys(G.lgd.cr).length'));
// road building: a neutral-connected town
console.log(W.ev(`(()=>{const B=BASES[0];const ts=[...G.towns].filter(t=>t.ow<0).sort((a,b)=>Math.hypot(a.x-B[0],a.y-B[1])-Math.hypot(b.x-B[0],b.y-B[1]));const t=ts[ts.length>>1];for(const c of t.cells)if(c.key)c.ow=0;G.civDirty=true;G.teams[0].credits=5000;G.__rt=t.i;return t.name})()`));
W.step(3);
console.log('road target', st());
W.ev(`(()=>{const B=BASES[0];addUnit(0,'dozer',B[0]+120,B[1]+60);G.towns[G.__rt].rate=0;G.towns[G.__rt].un=0;})()`);W.ev(`act(0,{t:'road',ti:G.__rt,ids:[]})`);
for (let i = 0; i < 14; i++) { W.ev(`G.towns.forEach(t=>{if(t.ow===0){t.un=0;}});G.ents.forEach(e=>{if(e.team===G.reb&&!e.isB)e.hp=0;})`);W.step(15); console.log(W.ev(`JSON.stringify({t:G.t|0,jobs:G.lgd.job.map(j=>[j.len|0,j.prog|0]),rb:G.lgd.rb.length,cr:G.teams[0].credits|0})`)); }
console.log('final', st());
console.log(W.ev(`(()=>{const j=G.lgd.job[0];const d=G.ents.find(e=>e.kind==='dozer'&&e.team===0);const fp=j?lgPoint(j,j.prog):null;return JSON.stringify({d:d&&[d.x|0,d.y|0,d.order,d.dead,d.path&&d.path.length],fp,pass:fp&&passXY('ground',fp[0],fp[1])})})()`));
console.log(W.ev(`JSON.stringify({dz:G.ents.filter(e=>e.kind==='dozer').map(e=>[e.team,e.dead,e.x|0,e.y|0,e.hp|0]),reb:G.towns.map(t=>t.reb|0).filter(Boolean),rebU:G.ents.filter(e=>e.team===G.reb&&!e.dead).length})`));
