// Hearts & Minds probe: home turf, loyalty, recruits, informants, collateral, bribe, propaganda tower.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
const map = process.argv[2] || 'zagros';
W.start({ seed: 3, facs: ['IR', 'US'], map });
W.ev('(()=>{for(const T of G.teams)T.ai=null;})()');
console.log('towers', W.ev('JSON.stringify(G.tow.map(w=>[w.x|0,w.y|0]))'), 'home', W.ev('JSON.stringify(mapHome())'), 'turf', W.ev('JSON.stringify([turfOf(0),turfOf(1)])'));
W.step(95);
// give team 0 the first non-hamlet town, held long enough
console.log(W.ev(`(()=>{const t=G.towns.find(t=>!t.ham&&t.K>=2)||G.towns[0];for(const c of t.cells)if(c.key)c.ow=0;G.hmT=t.i;return t.name})()`));
W.step(3);
W.ev(`(()=>{const t=G.towns[G.hmT];t.hold=G.t-200;t.un=5;t.fresh=0;t.rate=0;})()`);
W.step(2);
console.log('loy', W.ev(`(()=>{const t=G.towns[G.hmT];return JSON.stringify({ow:t.ow,loy:t.loy,un:t.un,pop:t.pop})})()`));
// recruit 5 (cap 4)
console.log('recruit', W.ev(`(()=>{const T=G.teams[0];T.credits=5000;const t=G.towns[G.hmT];const c0=T.credits;for(let i=0;i<6;i++){townRecruit(0,{ti:t.i});G.t+=7;t.milR=0;}return JSON.stringify({n:t.mil.length,spent:c0-T.credits,name:t.mil[0]&&t.mil[0].s.name,hp:t.mil[0]&&t.mil[0].hp})})()`));
// informant: put an enemy infantry within radius
W.ev(`(()=>{const t=G.towns[G.hmT];const u=addUnit(1,'inf',t.x+300,t.y+100);G.teams[0].ai=null;})()`);
W.ev(`G.out.length=0`);W.step(10);
console.log('hum', W.ev(`JSON.stringify(G.out.filter(v=>v[0]==='hum'))`));
// collateral
console.log('collateral', W.ev(`(()=>{const t=G.towns[G.hmT];const p0=t.pop;for(let i=0;i<30;i++)explode(t.x,t.y,50,70,1,'shell','shell');return JSON.stringify({pop0:p0,pop:+t.pop.toFixed(3),an:t.an.map(v=>+v.toFixed(1))})})()`));
// bribe: make an enemy town restless
console.log('bribe', W.ev(`(()=>{const t=G.towns.find(q=>q.i!==G.hmT&&!q.ham)||G.towns[1];for(const c of t.cells)if(c.key)c.ow=1;G.bt=t.i;return t.name})()`));
W.step(3);
console.log(W.ev(`(()=>{const t=G.towns[G.bt];t.un=60;const T=G.teams[0];T.credits=5000;T.brT=0;const p=bribePrice(t,0);t.un=95;const p2=bribePrice(t,0);t.un=60;const ok=bribeOk(t,0);townBribe(0,{ti:t.i});return JSON.stringify({p60:p,p95:p2,ok,ow:t.ow,cd:Math.ceil(T.brT-G.t)})})()`));
// tower capture
console.log('tower', W.ev(`(()=>{const w=G.tow[0];if(!w)return 'none';const u=addUnit(0,'inf',w.x,w.y);return 'unit'})()`));
W.step(14);
console.log(W.ev(`JSON.stringify(G.tow.map(w=>w.ow))`));
