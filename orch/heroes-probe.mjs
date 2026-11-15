// Hero squads probe (headless): every nation can train its hero at rank 3, rank/rebuy/limit rules hold, each ability fires,
// the AI trains and uses its hero. usage: node orch/heroes-probe.mjs  -> HEROES PASS / HEROES FAIL
import { makeSim } from './headless.mjs';
let bad = 0; const ck = (ok, m) => { if (!ok) { bad++; console.log('FAIL', m); } };
const facs = ['US','EU','UA','KR','RU','PK','CN','EG','IR','TR','KP','IL','SA','AE','RS','CU','IN','DW'];
for (let i = 0; i < facs.length; i += 2) {
  const { W } = makeSim(); const pair = [facs[i], facs[i + 1]];
  W.start({ seed: 3 + i, facs: pair, map: 'strait' });
  W.ev(`for(const T of G.teams){T.ai=null;T.credits=50000;}G.setupEnd=0;for(const T of G.teams.filter(q=>!q.reb)){const hq=G.ents.find(e=>e.isB&&e.team===T.id&&e.kind==='hq');addBld(T.id,'barracks',hq.x+60,hq.y+20,true);}`);
  for (let k = 0; k < 2; k++) {
    const T = W.ev(`(()=>{const T=G.teams[${k}];T.rank=1;return enqueue(${k},'champ')})()`);
    ck(T === false, pair[k] + ' hero must be locked below rank');
    W.ev(`G.teams[${k}].rank=HERO_RANK;enqueue(${k},'champ')`);
    ck(W.ev(`enqueue(${k},'champ')`) === false, pair[k] + ' second hero must be refused');
  }
  W.step(60);
  for (let k = 0; k < 2; k++) {
    ck(W.ev(`G.ents.filter(e=>e.team===${k}&&e.kind==='champ').length`) === 1, pair[k] + ' hero squad trained');
    const nm = W.ev(`G.ents.find(e=>e.team===${k}&&e.kind==='champ').s.name+'|'+G.ents.find(e=>e.team===${k}&&e.kind==='champ').s.hab+'|'+G.ents.find(e=>e.team===${k}&&e.kind==='champ').s.cost`);
    // put an enemy tank, unit group, a town and building next to the hero, then fire the ability
    const r = W.ev(`(()=>{const h=G.ents.find(e=>e.team===${k}&&e.kind==='champ');const o=${1 - k};h.habT=0;
      const hq=G.ents.find(e=>e.isB&&e.team===o&&e.kind==='hq');
      for(let j=0;j<4;j++){const u=addUnit(o,'tank',h.x+60+j*10,h.y+40);for(const t of G.teams)u.vs[t.id]=true;}
      for(let j=0;j<4;j++)addUnit(${k},'inf',h.x-20,h.y+j*8);
      const b=addBld(o,'barracks',h.x+90,h.y,true);for(const t of G.teams)b.vs[t.id]=true;
      const ok=heroAbility(h);return JSON.stringify([ok,h.s.hab,h.habT>G.t])})()`);
    console.log(pair[k], nm, r);
    ck(/\[true,/.test(r), pair[k] + ' ability should fire: ' + r);
  }
  // kill hero -> rebuy wait
  W.ev(`(()=>{const h=G.ents.find(e=>e.team===0&&e.kind==='champ');kill(h,1,null)})()`);
  W.step(1);ck(W.ev(`enqueue(0,'champ')`) === false, pair[0] + ' rebuy wait after the hero falls');
  W.ev(`G.teams[0].hrb=0`); ck(W.ev(`enqueue(0,'champ')`) === true, pair[0] + ' can retrain after the wait');
}
// AI trains and uses its hero
{ const { W } = makeSim(); W.start({ seed: 9, facs: ['IR', 'US'], map: 'strait' }); W.ev(`G.teams[0].gxp=RANKS[3];promoteGeneral(G.teams[0]);G.teams[0].credits=9000;G.teams[1].gxp=RANKS[3];promoteGeneral(G.teams[1]);`);
  let used = 0; W.ev(`G.cntH=0;const _l=log;log=function(t,m,k){if(k==='r:hab')G.cntH++;return _l.apply(this,arguments);}`);
  for (let m = 0; m < 14; m++) W.step(60);
  const n = W.ev(`G.ents.filter(e=>e.kind==='champ').length+'|'+G.cntH+'|'+G.teams.map(T=>T.rank).join(',')`); console.log('AI battle 14 min (heroes alive | ability uses | ranks):', n);
  ck(+n.split('|')[1] >= 1 || +n.split('|')[0] >= 1, 'AI should train a hero in a 14-minute battle');
}
console.log(bad ? 'HEROES FAIL' : 'HEROES PASS'); process.exit(bad ? 1 : 0);
