// Missile rules probe (headless): too-early refusal, cost, per-building 40% cap, missile-defence interception.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
W.start({ seed: 7, facs: ['US', 'RU'], map: 'strait' });
W.ev(`for(const T of G.teams)T.ai=null;`);
W.step(95);
console.log(W.ev(`(()=>{const h0=G.ents.find(e=>e.team===0&&e.kind==='hq'),hq=G.ents.find(e=>e.team===1&&e.kind==='hq');addBld(0,'uplink',h0.x+120,h0.y,true);G.teams[0].charge=G.teams[0].sup.charge;
  G.teams[0].credits=5000;const early=launch(0,hq.x,hq.y);return JSON.stringify({early,t:G.t|0,samRU:bstats('RU','sam').name,samUS:bstats('US','sam').name})})()`));
const run = (sams) => {
  W.ev(`G.t=Math.max(G.t,500);for(const e of G.ents)if(e.team===1&&e.kind==='sam')e.dead=true;`);
  W.ev(`(()=>{const hq=G.ents.find(e=>e.team===1&&e.kind==='hq');for(let i=0;i<${sams};i++)addBld(1,'sam',hq.x+60+i*40,hq.y+60,true);hq.hp=hq.max;G.teams[0].charge=G.teams[0].sup.charge;G.teams[0].credits=5000;})()`);
  const r = W.ev(`(()=>{const hq=G.ents.find(e=>e.team===1&&e.kind==='hq');const c0=G.teams[0].credits;const ok=launch(0,hq.x,hq.y);return JSON.stringify({ok,paid:c0-G.teams[0].credits,strikes:G.strikes.length})})()`);
  W.step(8);
  const h = W.ev(`(()=>{const hq=G.ents.find(e=>e.team===1&&e.kind==='hq');return +(hq.hp/hq.max).toFixed(2)})()`);
  console.log(`sams=${sams}`, r, 'HQ hp fraction after salvo:', h, '(cap: >= 0.60)');
};
run(0); run(3);
