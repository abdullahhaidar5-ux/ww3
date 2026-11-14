/* ===== Hero squads + commander radio (Abdullah 2026-11-04) =====
   Sim side. One 'champ' squad per nation (data: HEROES / HAB in 01-data.js). Orders arrive as the host-authoritative command {t:'hab',tid}.
   Radio callouts are plain log events with kind 'r:<key>' (see pushLog in 08-ui.js); the host throttles them per team here. */

function heroOk(team,s){const T=G.teams[team];
  if(T.rank<HERO_RANK){if(!T.ai)log(team,`${s.name} unlock at general rank ${HERO_RANK}.`,'w');return false;}
  if((T.hrb||0)>G.t){if(!T.ai)log(team,`A new ${s.name} can be trained in ${rebuyFmt(T.hrb-G.t)}.`,'w');return false;}
  return true;}
function heroFell(e){const T=G.teams[e.team];if(!T)return;T.hrb=G.t+HERO_REBUY;log(e.team,`${e.s.name} lost. A new squad can be trained in ${rebuyFmt(HERO_REBUY)}.`,'bad');}
function heroSpawned(u){u.habT=G.t+20;if(G.t>5)log(u.team,`${u.s.name} ready.`,'r:hero',u.x,u.y);}

/* nearest enemy (seen by us) matching f within R of (x,y) */
function heroFoe(u,R,f){let b=null,bd=R;for(const e of G.ents){if(e.dead||e.civ||!e.s||ally(e.team,u.team)||e.team===G.reb||!seenBy(u.team,e)||(f&&!f(e)))continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;b=e;}}return b;}
const HABF={
  strike(u){let t=u.target&&!u.target.dead&&!ally(u.target.team,u.team)&&u.target.s&&Math.hypot(u.target.x-u.x,u.target.y-u.y)<500?u.target:null;
    if(!t)t=heroFoe(u,500,e=>e.s.dom!=='air');if(!t)return false;const x=t.x,y=t.y,team=u.team;
    for(let i=0;i<3;i++)addStrike(x+rnd(-34,34),y+rnd(-34,34),2.4+i*.7,56,240,team,'');return true;},
  demo(u){const b=heroFoe(u,150,e=>e.isB&&e.kind!=='garrison'&&e.kind!=='fort');if(!b)return false;const team=u.team;
    FXE('txt',[b.x|0,b.y|0,'CHARGES SET',team,-2]);G.timers.push({t:3,fn:()=>{if(b.dead)return;applyDmg(b,Math.min(b.max*.34,1500),'demo',team,u);FXE('boom',[b.x|0,b.y|0,b.size*.5,1]);}});return true;},
  rally(u){let n=0;for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===u.team&&e.s&&isInf(e.s)&&Math.hypot(e.x-u.x,e.y-u.y)<300){e.hp=Math.min(e.max,e.hp+e.max*.25);e.rlyT=G.t+10;e.rout=0;e.fear=0;e.supp=0;n++;}
    FXE('heal',[u.x|0,u.y|0,300],u.team);return n>0;},
  recon(u){const T=G.teams[u.team];T.reveals.push({x:u.x,y:u.y,r:520,t:12});for(const e of G.ents)if(!e.dead&&!e.isB&&!ally(e.team,u.team)&&e.team!==G.reb&&Math.hypot(e.x-u.x,e.y-u.y)<520)e.mark=G.t+12;
    FXE('ping',[u.x|0,u.y|0,520],u.team);return true;},
  ambush(u){for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===u.team&&e.s&&(e===u||isInf(e.s))&&Math.hypot(e.x-u.x,e.y-u.y)<220)e.hambT=G.t+8;return true;},
  cut(u){const L=G.lg,D=G.lgd;if(!L||!D||!L.cov)return false;let best=null,bd=260;   // crater the nearest enemy supply road within 260 m (the line is cut behind it, ~150 s)
    for(let i=0;i<L.E.length;i++){if(D.cr[i]&&D.cr[i].t>G.t)continue;if(!L.cov.some((C,k)=>C&&C[i]&&!G.teams[k].reb&&!ally(k,u.team)))continue;const q=lgProj(L.E[i],u.x,u.y);if(q&&q.d<bd){bd=q.d;best={i,x:q.x,y:q.y};}}
    if(!best)return false;D.cr[best.i]={x:Math.round(best.x),y:Math.round(best.y),t:G.t+LG_CRATER_T};D.v++;FXE('boom',[best.x|0,best.y|0,18,1]);
    log(u.team,'Charges blown: the enemy supply road is cut.','g',best.x,best.y);for(let k=0;k<G.teams.length;k++){const C=L.cov[k];if(C&&C[best.i]&&!ally(k,u.team)&&!G.teams[k].reb)log(k,'Enemy fighters blew up one of our supply roads - the line is cut behind it.','bad',best.x,best.y);}return true;}
};
function heroAbility(u){
  if(!u||u.dead||u.isB||u.kind!=='champ'||!u.s.hab||!HABF[u.s.hab])return false;const T=G.teams[u.team],ab=u.s.hab;
  if((u.habT||0)>G.t){if(!T.ai)log(u.team,`${HAB[ab].n}: ready in ${Math.ceil(u.habT-G.t)} s.`,'w');return false;}
  if(!HABF[ab](u)){if(!T.ai)log(u.team,`${HAB[ab].n}: no target in range.`,'w');return false;}
  u.habT=G.t+HERO_CD;FXE('txt',[u.x|0,u.y|0,HAB[ab].n.toUpperCase(),u.team,-2]);log(u.team,`${HAB[ab].n}!`,'r:hab');return true;}

/* AI: trains its hero squad as soon as the rank allows and it can afford it, and uses the ability when the fight is on */
function aiHero(id,T,mine,en){
  const hs=mine.find(e=>!e.isB&&e.kind==='champ'&&!e.dead);
  if(!hs){if(T.rank>=HERO_RANK&&(T.hrb||0)<=G.t&&done(id,'barracks')&&T.credits>=stats(T.fac,'champ').cost+600&&T.ai.t%7===0&&unitCount(id,'champ')<1)enqueue(id,'champ');return;}
  if(T.ai.t%3||(hs.habT||0)>G.t)return;const ab=hs.s.hab;
  const foes=G.ents.filter(e=>!e.dead&&!e.isB&&e.team!==id&&!ally(e.team,id)&&e.team!==G.reb&&e.s&&!e.s.noAttack&&seenBy(id,e)&&Math.hypot(e.x-hs.x,e.y-hs.y)<420).length;
  if(ab==='cut'){if(G.lg&&G.lg.cov&&G.lg.cov.some((C,k)=>C&&!ally(k,id)&&Object.keys(C).length))heroAbility(hs);return;}
  if(ab==='demo'){heroAbility(hs);return;}
  if(foes>=(ab==='recon'?1:3))heroAbility(hs);}

/* ---- commander radio: throttled callouts for the human teams (host side; AI teams never get them) ---- */
const RAD_GAP={air:45,armL:35,armR:35,msl:0,base:25,lost:12,town_lost:8,town_taken:8,hero:0,hab:0};
function radioScan(){
  if(G.t-(G.radT||-9)<1.5)return;G.radT=G.t;
  for(const T of G.teams){if(!T||T.reb||T.ai||T.out||T.dummy)continue;
    const hq=G.ents.find(e=>e.isB&&e.team===T.id&&e.kind==='hq'&&!e.dead);if(!hq)continue;const R=G.rad||(G.rad={}),last=R[T.id]||(R[T.id]={});
    if(G.t-(last.any||-99)<6)continue;
    // axis from our HQ toward the enemy: "left"/"right" flank is seen from our side looking at them
    let foe=null,fd=1e9;for(const e of G.ents)if(e.isB&&e.kind==='hq'&&!e.dead&&!ally(e.team,T.id)&&e.team!==G.reb){const d=Math.hypot(e.x-hq.x,e.y-hq.y);if(d<fd){fd=d;foe=e;}}
    const ax=foe?(foe.x-hq.x)/fd:1,ay=foe?(foe.y-hq.y)/fd:0;let air=0,armL=0,armR=0,pA=null,pL=null,pR=null;
    for(const e of G.ents){if(e.dead||e.isB||!e.s||ally(e.team,T.id)||e.team===G.reb||!seenBy(T.id,e))continue;
      const dx=e.x-hq.x,dy=e.y-hq.y,dd=Math.hypot(dx,dy);
      if(e.s.dom==='air'&&!e.landed&&e.kind!=='drone'&&dd<900){air++;pA=pA||e;}
      else if(e.s.cls==='tank'&&dd<760){const cr=ax*dy-ay*dx;if(cr<0){armL++;pL=pL||e;}else{armR++;pR=pR||e;}}}
    const key=air>=2?'air':(armL>=2||armR>=2)?(armL>=armR?'armL':'armR'):null;
    if(key&&G.t-(last[key]||-99)>=RAD_GAP[key]){last[key]=last.any=G.t;log(T.id,key==='air'?'Enemy aircraft inbound!':key==='armL'?'Enemy armor on the left flank!':'Enemy armor on the right flank!','r:'+key,(key==='air'?pA:key==='armL'?pL:pR).x,(key==='air'?pA:key==='armL'?pL:pR).y);}}}
