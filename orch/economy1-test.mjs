// Economy part 1 probe: food, growth, invest, rebuild, mines/factories placement fairness, caravans, ports (headless sim).
import { makeSim } from './headless.mjs';
const maps = process.argv[2] ? [process.argv[2]] : ['fulda','strait','gulf'];
for (const map of maps) {
  const { W } = makeSim();
  W.start({ seed: 5, facs: ['US', 'RU'], map });
  W.step(3);
  console.log(map, W.ev(`JSON.stringify({towns:G.towns.length,ham:G.towns.filter(t=>t.ham).length,pts:G.ec.pts.map(p=>[p.k,p.x|0,p.y|0,p.ti])})`));
  // fairness: distance of each base to its quarry / factory
  console.log(' base->pt dist', W.ev(`JSON.stringify([0,1].map(i=>G.ec.pts.filter(p=>p.k<2||p.k===2).map(p=>[p.k,Math.round(Math.hypot(p.x-BASES[i][0],p.y-BASES[i][1]))])))`));
}
const { W } = makeSim();
W.start({ seed: 5, facs: ['US', 'RU'], map: 'fulda' });
W.step(5);
W.ev(`(()=>{for(const T of G.teams)T.ai=null;const ts=G.towns.filter(t=>!t.ham&&t.K>=3).slice(0,2);for(const t of ts)for(const c of t.cells)if(c.key)c.ow=0;G.teams[0].credits=5000;})()`);
const q = `(()=>{const t=G.towns.filter(t=>!t.ham&&t.K>=3)[0];return JSON.stringify({t:G.t|0,ow:t.ow,fd:+t.fd.toFixed(1),lv:t.lv,gp:+t.gp.toFixed(1),un:+t.un.toFixed(1),em:+t.em.toFixed(2),tax:+t.tax.toFixed(2),dm:+t.dm.toFixed(2),inv:t.inv,fl:ecAlive(t)})})()`;
for (let i = 0; i < 4; i++) { W.step(30); console.log('calm', W.ev(q)); }
W.ev(`G.towns.filter(t=>!t.ham&&t.K>=3)[0].tax; ecCmd(0,{ti:G.towns.filter(t=>!t.ham&&t.K>=3)[0].i,k:0});ecCmd(0,{ti:G.towns.filter(t=>!t.ham&&t.K>=3)[0].i,k:1});`);
// shell the fields
W.ev(`(()=>{const t=G.towns.filter(t=>!t.ham&&t.K>=3)[0];for(const p of ecPlots(t))explode(p[0],p[1],40,60,1,'boom','shell');})()`);
for (let i = 0; i < 4; i++) { W.step(30); console.log('shelled', W.ev(q)); }
// damage + rebuild
W.ev(`(()=>{const t=G.towns.filter(t=>!t.ham&&t.K>=3)[0];for(const c of t.cells.slice(0,5)){c.max=c.max||100;c.hp=20;}})()`);
for (let i = 0; i < 4; i++) { W.step(40); console.log('damaged', W.ev(q)); }
for (let i = 0; i < 6; i++) { W.step(60); }
console.log('late', W.ev(q), W.ev(`JSON.stringify({cav:G.ec.cav.length,rt:G.ec.rt.length,eco:G.teams.map(T=>+(T.eco||0).toFixed(2)),sea:G.teams.map(T=>+(T.seaR||0).toFixed(2)),mines:G.ec.pts.map(p=>p.ow)})`));
console.log(W.ev(`JSON.stringify(ecPack()).length`), 'bytes in pack');
