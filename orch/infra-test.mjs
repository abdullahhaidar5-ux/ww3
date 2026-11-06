// Infrastructure + militia checks (headless): plants per map (symmetry), blackout, repair, fuel, militia join/hostile. node orch/infra-test.mjs [--maps a,b,c]
import { makeSim } from './headless.mjs';
const argS=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0&&process.argv[i+1]!=null?process.argv[i+1]:d;};
const maps=argS('maps','strait,rivers,zagros,gulf,fulda,hormuz').split(',');
let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
for(const map of maps){
  const { W } = makeSim();
  W.start({ seed: 7, map, facs: ['US','IR'], diff: 1 });W.step(2);
  const pl=W.ev(`G.oil.filter(o=>o.pw).map(o=>[o.home,Math.round(o.x),Math.round(o.y),o.owner])`);
  const ml=W.ev(`G.towns.filter(t=>t.ml).map(t=>[t.name,t.ham?1:0])`);
  const mu=W.ev(`G.ents.filter(e=>e.mil).length`);
  console.log(map,'plants',JSON.stringify(pl),'militia towns',ml.length,'of',W.ev('G.towns.length'),'units',mu);
  if(!pl.some(p=>p[0]===0)||!pl.some(p=>p[0]===1))fail(map+': a base has no own power plant');
  const d0=W.ev(`(()=>{const b=BASES;return b.slice(0,2).map((q,i)=>{const o=G.oil.find(o=>o.pw&&o.home===i);return o?Math.round(Math.hypot(o.x-q[0],o.y-q[1])):-1;});})()`);
  console.log('  militia towns',JSON.stringify(W.ev(`G.towns.filter(t=>t.ml).map(t=>[Math.round(t.x),Math.round(t.y)])`)));
  console.log('  home plant distance to own base',d0);
  if(Math.abs(d0[0]-d0[1])>.25*Math.max(...d0))fail(map+': home plants unequal distance '+d0);
}
// blackout / repair / fuel / militia on one map
{const { W } = makeSim();W.start({ seed: 3, map: 'strait', facs: ['US','IR'], diff: 1 });
 W.step(100);
 W.ev(`addBld(0,'sam',BASES[0][0]+120,BASES[0][1]+80,true);addBld(0,'turret',BASES[0][0]+140,BASES[0][1]-80,true)`);
 W.step(3);
 console.log('power before',W.ev('powerOut(0)'),'dis sam',W.ev(`G.ents.some(e=>e.team===0&&e.kind==='sam'&&e.dis>G.t)`));
 W.ev(`{const o=G.oil.find(o=>o.pw&&o.home===0);destroyOil(o,1);}`);
 W.step(3);
 const dk=W.ev(`[powerOut(0),G.teams[0].dark,G.ents.filter(e=>e.team===0&&(e.kind==='sam'||e.kind==='turret')&&e.dis>G.t).length]`);
 console.log('after destroy: out/dark/disabled',JSON.stringify(dk));if(!dk[0]||dk[2]<2)fail('blackout did not disable sam/turret');
 W.ev(`{const o=G.oil.find(o=>o.pw&&o.home===0);const d=G.ents.find(e=>e.team===0&&e.kind==='dozer');d.x=o.x+10;d.y=o.y;d.order=null;}`);
 for(let i=0;i<12;i++){W.ev(`{const o=G.oil.find(o=>o.pw&&o.home===0);const d=G.ents.find(e=>e.team===0&&e.kind==='dozer');d.x=o.x+10;d.y=o.y;d.order=null;}`);W.step(1);}
 const rp=W.ev(`[powerOut(0),G.oil.find(o=>o.pw&&o.home===0).dead]`);console.log('after dozer repair',JSON.stringify(rp));if(rp[0]||rp[1])fail('dozer repair failed');
 // fuel
 W.ev(`for(const o of G.oil)if(!o.pw){o.owner=-1;}G.teams[0].fuel=0;`);W.step(2);
 console.log('fuel dry',W.ev('G.teams[0].dry'));if(!W.ev('G.teams[0].dry'))fail('no dry flag');
 // militia: spawn check + provoke + join
 const t=W.ev(`(()=>{const t=G.towns.find(t=>t.ml);return t?t.i:-1;})()`);
 if(t<0)console.log('  (no militia town on strait)');else{
  W.ev(`G.towns[${t}].ml.aff[1]=61`);W.step(2);
  console.log('militia state',W.ev(`G.towns[${t}].ml.st`),'joined team',W.ev(`G.towns[${t}].ml.join`),'units team1',W.ev(`G.ents.filter(e=>e.mlJ&&!e.dead).length`));
  if(W.ev(`G.towns[${t}].ml.st`)!==1)fail('militia did not join');}
 const { W:W2 } = makeSim();W2.start({ seed: 3, map: 'strait', facs: ['US','IR'], diff: 1 });W2.step(5);
 const t2=W2.ev(`(()=>{const t=G.towns.find(t=>t.ml);return t?t.i:-1;})()`);
 if(t2>=0){W2.ev(`{const u=G.ents.find(e=>e.mlT===${t2});applyDmg(u,5,'gun',0,null,0);}`);W2.step(2);
  console.log('provoked state',W2.ev(`G.towns[${t2}].ml.st`),'hostile to',W2.ev(`G.towns[${t2}].ml.hos`));if(W2.ev(`G.towns[${t2}].ml.st`)!==2)fail('militia not hostile after attack');
  W2.step(240);console.log('after 4 min militia state',W2.ev(`G.towns[${t2}].ml.st`));}
}
console.log(bad?'INFRA FAIL':'INFRA PASS');process.exit(bad?1:0);
