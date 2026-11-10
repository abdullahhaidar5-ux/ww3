// Hard AI combined-arms guard (queue item "Smarter computer opponent", 2026-11-10): headless sim, no browser.
//   node orch/aihard.mjs  ->  AIHARD PASS   (a failure also prints "HEADLESS FAIL aihard" so the headless gate goes red)
// Checks: the new tactics are Hard-only settings (no extra money: income multiplier unchanged), Hard picks the thinner
// side for a flank, protects a gun that enemy troops walk up to (escorts turn on them, the gun steps back), Zealous
// nations' guns never pull back (standing rule), and ready jets fly at the defences of the wave's target.
import { makeSim } from './headless.mjs';
let fails = 0; const ck = (n, ok, info = '') => { if (!ok) fails++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok || !info ? '' : '  — ' + info}`); };
const { W } = makeSim();
const J = c => JSON.parse(W.ev(`JSON.stringify((()=>{${c}})())`));

console.log('settings');
let r = J(`return {e:DIFF[0],n:DIFF[1],h:DIFF[2]}`);
ck('Easy and Normal do not get the new tactics', !r.e.probe && !r.e.ap && !r.e.ca && !r.n.probe && !r.n.ap && !r.n.ca);
ck('Hard has weak-side probing, artillery protection and air-ground teamwork', r.h.probe === 1 && r.h.ap === 1 && r.h.ca === 1 && r.h.air === 1 && !r.n.air && !r.e.air);
ck('Hard gets no extra money (income x1, same as Normal)', r.h.inc === 1 && r.n.inc === 1);

// one side Hard AI (team 0), the other side left without AI so nothing else moves
const setup = (facs) => { W.start({ seed: 7, facs, map: 'plateau', diff: 2 }); W.ev(`G.setupEnd=0;G.teams[0].ai=mkAI(2);G.teams[1].ai=null;`); W.step(1); };
const SEE = `const see=e=>{e.vs=e.vs||[];e.vs[0]=1;};`;

console.log('weak side');
setup(['US', 'RU']);
r = J(`const a=G.ents.find(b=>b.team===0&&b.kind==='hq'),t=G.ents.find(b=>b.team===1&&b.kind==='hq'),T=G.teams[0];
  const ang=Math.atan2(t.y-a.y,t.x-a.x),D=Math.hypot(t.x-a.x,t.y-a.y);const sw=sd=>[a.x+Math.cos(ang)*D*.62+Math.cos(ang+sd*1.57)*Math.min(650,D*.35),a.y+Math.sin(ang)*D*.62+Math.sin(ang+sd*1.57)*Math.min(650,D*.35)];
  for(const e of G.ents)if(e.team===1&&e.isB&&e.s.dmg>0)e.dead=true;
  const none=aiProbeSide(T,a,t);const p=sw(1);const g1=addBld(1,'turret',p[0],p[1],1),g2=addBld(1,'turret',p[0]+40,p[1]+40,1);
  const right=aiProbeSide(T,a,t);g1.dead=g2.dead=true;const q=sw(-1);addBld(1,'turret',q[0],q[1],1);addBld(1,'turret',q[0]+40,q[1]+40,1);
  const left=aiProbeSide(T,a,t);T.ai.d=1;const normal=aiProbeSide(T,a,t);T.ai.d=2;return {none,right,left,normal}`);
ck('no defences on either side: no preference', r.none === 0, JSON.stringify(r));
ck('guns on side +1: flank goes round side -1', r.right === -1, JSON.stringify(r));
ck('guns on side -1: flank goes round side +1', r.left === 1, JSON.stringify(r));
ck('Normal AI never probes', r.normal === 0, JSON.stringify(r));

const artyCase = (facs) => {
  setup(facs);
  W.ev(`(()=>{${SEE}const a=G.ents.find(b=>b.team===0&&b.kind==='hq'),t=G.ents.find(b=>b.team===1&&b.kind==='hq');const k=.45,x=a.x+(t.x-a.x)*k,y=a.y+(t.y-a.y)*k;
    const g=addUnit(0,'arty',x,y),t1=addUnit(0,'tank',x-60,y-40),t2=addUnit(0,'tank',x-60,y+40);const dx=(t.x-a.x),dy=(t.y-a.y),L=Math.hypot(dx,dy);
    const foe=addUnit(1,'inf',x+dx/L*150,y+dy/L*150);foe.max=foe.hp=9999;see(foe);G._tst={g:g.id,foe:foe.id,t1:t1.id,t2:t2.id,x,y,d0:Math.hypot(foe.x-g.x,foe.y-g.y)};})()`);
  let esc = false, back = false;
  for (let i = 0; i < 16 && !(esc && (back || facs[0] !== 'US')); i++) {
    W.ev(`(()=>{const f=G.byId.get(G._tst.foe);f.vs=f.vs||[];f.vs[0]=1;})()`); W.step(0.5);
    const s = J(`const S=G._tst,g=G.byId.get(S.g),f=G.byId.get(S.foe),a=G.byId.get(S.t1),b=G.byId.get(S.t2);return {esc:a.target===f||b.target===f||(a.order&&a.order.target===f)||(b.order&&b.order.target===f),mv:Math.hypot(g.x-S.x,g.y-S.y),ord:g.order?g.order.type:null,auto:!!(g.order&&g.order.auto)}`);
    if (s.esc) esc = true; if (s.auto && s.ord === 'move') back = true;
  }
  const st = J(`const S=G._tst,g=G.byId.get(S.g),f=G.byId.get(S.foe);return {st:G.teams[0].ai.st||{},d:Math.hypot(f.x-g.x,f.y-g.y),d0:S.d0,rout:msOf(G.teams[0].fac).rout}`);
  return { esc, back, ...st };
};
console.log('artillery protection (US, not Zealous)');
r = artyCase(['US', 'RU']);
ck('escorts turn on the troops threatening the gun', r.esc && r.st.artyGuard >= 1, JSON.stringify(r));
ck('the gun steps back from them', r.back && r.st.artyBack >= 1, JSON.stringify(r));
console.log('artillery protection (IR, Zealous: never pulls back)');
r = artyCase(['IR', 'RU']);
ck('IR is a Zealous nation in this test', r.rout === 0, JSON.stringify(r));
ck('escorts still turn on the threat', r.esc && r.st.artyGuard >= 1, JSON.stringify(r));
ck('the gun is never ordered back', !r.back && !r.st.artyBack, JSON.stringify(r));

console.log('air works with the ground attack');
setup(['US', 'RU']);
r = J(`${SEE}const T=G.teams[0],t=G.ents.find(b=>b.team===1&&b.kind==='hq');for(const e of G.ents)if(e.team===1&&e.isB&&e.s.dmg>0)e.dead=true;
  const pb=()=>G.ents.filter(e=>e.team===1&&e.isB&&!e.dead);const jet={s:stats('US','jet'),x:0,y:0,team:0};
  const none=aiAirTarget(T,jet,pb());T.ai.lt={id:t.id,t:G.t};const wave=aiAirTarget(T,jet,pb());
  const g=addBld(1,'turret',t.x+200,t.y+120,1);const def=aiAirTarget(T,jet,pb());g.dead=true;T.ai.lt=null;
  const gun=addUnit(1,'arty',t.x-300,t.y);const unseen=aiAirTarget(T,jet,pb());see(gun);const seen=aiAirTarget(T,jet,pb());
  T.ai.d=1;const normal=aiAirTarget(T,jet,pb());T.ai.d=2;
  return {none:none===null,wave:wave===t,def:def===g,unseen:unseen===null,seen:seen===gun,normal:normal===null}`);
ck('no wave out, nothing seen: no special target (old random pick)', r.none, JSON.stringify(r));
ck('wave out: jets support it at its target', r.wave, JSON.stringify(r));
ck('wave out and a defence gun near the target: jets hit the gun first', r.def, JSON.stringify(r));
ck('enemy artillery it cannot see is not targeted (no extra vision)', r.unseen, JSON.stringify(r));
ck('enemy artillery it can see is hunted from the air', r.seen, JSON.stringify(r));
ck('Normal AI keeps the old behaviour', r.normal, JSON.stringify(r));

console.log(fails ? `HEADLESS FAIL aihard\nAIHARD FAIL (${fails})` : 'AIHARD PASS');
process.exit(fails ? 1 : 0);
