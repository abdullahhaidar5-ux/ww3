// Convoy probe: auto supply trucks drive the road net to held towns, stock them, can be ambushed.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const map = process.argv[2] || 'fulda';
W.start({ seed: 3, facs: ['US', 'RU'], map });
W.ev('G.teams.forEach(T=>{T.ai=null;})');
W.step(5);
console.log(W.ev(`(()=>{const B=BASES[0];const ts=[...G.towns].sort((a,b)=>Math.hypot(a.x-B[0],a.y-B[1])-Math.hypot(b.x-B[0],b.y-B[1]));
  for(const t of ts.slice(0,2))for(const c of t.cells)if(c.key)c.ow=0;G.civDirty=true;return ts.slice(0,2).map(t=>t.name).join(',')})()`));
const st=()=>W.ev(`JSON.stringify({cv:G.ents.filter(e=>e.cv&&!e.dead).map(e=>[e.x|0,e.y|0,e.cv.ti,e.cv.i,e.cv.pts.length,e.cv.ret]),tw:G.towns.filter(t=>t.ow===0).map(t=>[t.name,t.cut|0,Math.round((t.dl||0)-G.t)]),cr:G.teams[0].credits|0})`);
for(let i=0;i<14;i++){W.step(15);console.log(W.ev('G.t|0'),st());}
// ambush
W.ev(`G.towns.forEach(t=>{if(t.ow===0)t.dl=0;})`);
for(let i=0;i<8;i++){W.step(8);if(W.ev('G.ents.some(e=>e.cv&&!e.dead&&e.cv.i>2)')){W.ev(`G.ents.filter(e=>e.cv&&!e.dead).forEach(e=>{e.hp=0;kill(e,1,null);})`);break;}}
W.step(3);console.log('after ambush',st(),W.ev("1"));
