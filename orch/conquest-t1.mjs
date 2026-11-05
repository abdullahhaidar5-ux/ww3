// Stage-1 probe: towns, tax, unrest, revolt, rebels in the headless sim.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
W.start({ seed: 3, facs: ['US', 'RU'], map: 'fulda' });
const info = W.ev('({towns:G.towns.length,ham:G.towns.filter(t=>t.ham).length,reb:G.reb,teams:G.teams.length})');
console.log('start', JSON.stringify(info));
W.step(20);
// force team 0 to own the first non-hamlet town
console.log(W.ev(`(()=>{const t=G.towns.find(t=>!t.ham&&t.K>=3);for(const c of t.cells)if(c.key){c.ow=0;}G.teams[0].ai=null;t.rate=3;t.un=70;return t.name+' K='+t.K+' base='+townBase(t)})()`));
W.step(2);
W.ev(`(()=>{const t=G.towns.find(t=>!t.ham&&t.K>=3);G.teams[0].ai=null;t.rate=3;t.un=80;})()`);
for (let i = 0; i < 12; i++) { W.step(i<4?5:12); console.log(W.ev(`(()=>{const t=G.towns.find(t=>!t.ham&&t.K>=3);return JSON.stringify({t:G.t|0,ow:t.ow,rate:t.rate,un:+t.un.toFixed(1),tax:+t.tax.toFixed(2),reb:t.reb|0,rebU:t.rebU.length,credits:G.teams[0].credits|0,rebAlive:G.ents.filter(e=>e.team===G.reb&&!e.dead).length})})()`)); }
console.log(W.ev(`JSON.stringify({over:G.over,income:G.teams.map(T=>+(T.terr||0).toFixed(2))})`));
