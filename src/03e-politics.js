/* ---------- Spies & decoys (Abdullah 2026-11-05 18:55; orch/reports/politics-intel.md) ----------
   The Infiltrator (BASE.spy) steals money or research from an enemy Command Center, or sabotages a Strike Center or power plant;
   decoy vehicles (dtank/dsam/darty) look real until enemy troops get close. World opinion, refugees, the radio station, leaflets and
   local militias were Conquest systems and went with it (Abdullah 2026-11-13 20:18). "Knocked out for a while" = the building's `dis`
   (o.sab on power plants); deception = decoys here + EW spoofs in 03-sim.
   Host-authoritative and deterministic: no Math.random, fixed update order, constants in POL (01-data). Unit fields sj/spCd/exp ride in the checkpoint. */
/* ---- spies & sabotage ---- */
const SPY_KINDS={steal:['hq'],upg:['hq','barracks','factory','airfield','uplink'],sab:['uplink']};
// where a spy has to go for a job; null when the target is gone / no longer an enemy
function polJobTarget(j,team){
  if(j.fi>=0&&j.k==='sab'){const o=G.oil[j.fi|0];return o&&o.pw&&!o.dead&&o.owner>=0&&!ally(o.owner,team)?{x:o.x,y:o.y,r:30,o,vt:o.owner}:null;}
  const b=G.byId.get(j.tid);if(!b||b.dead||!b.isB||ally(b.team,team)||b.team<0||G.teams[b.team].reb||!(SPY_KINDS[j.k]||[]).includes(b.kind)||b.built<1)return null;
  return{x:b.x,y:b.y,r:(b.size||40)/2,b,vt:b.team};}
function polSpyCmd(team,a){const T=G.teams[team];if(!T||T.out||T.reb)return;
  const k=a.k==='sabo'?'sab':a.k;if(!['steal','upg','sab'].includes(k))return;
  const j={k,tid:a.tid|0,fi:a.k==='sabo'?(a.fi|0):-1};
  if(!polJobTarget(j,team))return;let n=0;
  for(const id of a.ids||[]){const u=G.byId.get(id);if(!u||u.dead||u.team!==team||u.kind!=='spy')continue;
    if(G.t<(u.spCd||0)){if(!T.ai)log(team,'Our agent is still lying low after the last job.','w');continue;}u.sj=Object.assign({},j);u.sjMv=0;n++;}
  if(n&&!T.ai)log(team,'Agent on the way. It stays disguised until it acts - keep it away from enemy infantry.','');}
function polSpyAct(u,j,tg){const team=u.team,T=G.teams[team],V=G.teams[tg.vt];if(!V)return;const bx=u.x|0,by=u.y|0;let done=false,msgV='';
  if(j.k==='steal'){const amt=Math.min(Math.round(POL.SPY_STEAL_MAX*(G.bs||1)),Math.floor(V.credits*POL.SPY_STEAL));
    if(amt<80){log(team,'The enemy vault is nearly empty - nothing worth stealing yet.','w');u.spCd=G.t+10;return;}
    V.credits-=amt;T.credits+=amt;done=true;log(team,`Our agent emptied part of the enemy treasury: +$${amt}.`,'g');msgV=`An enemy agent robbed our treasury: -$${amt}!`;}
  else if(j.k==='upg'){const c=Object.keys(V.upg||{}).filter(k=>V.upg[k]&&!T.upg[k]&&UPG[k]).sort((p,q)=>UPG[q].cost-UPG[p].cost||(p<q?-1:1));
    if(!c.length){log(team,'No technology here that we do not already have.','w');u.spCd=G.t+10;return;}
    const k=c[0];T.upg[k]=true;upgReset(T);done=true;const nm=(typeof upgName==='function'&&upgName(V.fac,k))||UPG[k].name||'research';log(team,`Our agent stole the plans for ${nm}!`,'g');msgV=`An enemy agent copied our ${nm} research!`;}
  else if(j.k==='sab'){if(tg.o){koSet(tg.o,POL.SPY_SAB_T,'sabotage');done=true;log(team,`Sabotage! The enemy power plant is down for ${POL.SPY_SAB_T} s.`,'g');msgV='Sabotage! One of our power plants is knocked out for a while.';}
    else{koSet(tg.b,POL.SPY_SAB_T,'sabotage');done=true;log(team,`Sabotage! The enemy Strike Center is knocked out for ${POL.SPY_SAB_T} s.`,'g');msgV=`Sabotage! Our ${bstats(V.fac,tg.b.kind).name} is knocked out for a while.`;}}
  if(done){u.spCd=G.t+POL.SPY_CD;u.detT=G.t+POL.SPY_EXPOSE;if(msgV&&!V.reb)log(tg.vt,msgV,'bad');FXE('tping',[tg.vt,bx,by,2]);FXE('txt',[bx,by,'AGENT',team,tg.vt]);}}
function polSpies(){for(const u of G.ents){if(u.dead||u.kind!=='spy')continue;
    // disguise: enemy infantry close by blow the cover
    let seenBy=-1;for(const e of G.ents){if(e.dead||e.isB||e.team===u.team||ally(e.team,u.team)||e.team===G.reb||!e.s||e.s.noAttack||e.s.dom!=='ground'||e.inTun)continue;
      const R=isInf(e.s)?POL.SPY_SPOT:POL.SPY_SPOT*.5;if(Math.abs(e.x-u.x)>R||Math.abs(e.y-u.y)>R)continue;if(Math.hypot(e.x-u.x,e.y-u.y)<=R){seenBy=e.team;break;}}
    if(seenBy>=0){u.detT=Math.max(u.detT||0,G.t+3);if(G.t>=(u.spSeen||0)){u.spSeen=G.t+20;log(seenBy,'Enemy spy spotted - shoot it!','w');log(u.team,'Our agent has been spotted!','bad');FXE('tping',[seenBy,u.x|0,u.y|0,1]);}}
    if(u.sj){if(u.sjOx!=null&&u.order&&(u.order.x!==u.sjOx||u.order.y!==u.sjOy)){u.sj=null;u.sjOx=null;continue;}const tg=polJobTarget(u.sj,u.team);if(!tg){u.sj=null;continue;}
      if(Math.hypot(tg.x-u.x,tg.y-u.y)<=tg.r+POL.SPY_ACT){const j=u.sj;u.sj=null;polSpyAct(u,j,tg);}
      else if(G.t>=(u.sjMv||0)){u.sjMv=G.t+1.5;setMove(u,tg.x,tg.y,'move');u.sjOx=u.order?u.order.x:null;u.sjOy=u.order?u.order.y:null;}}}}

/* ---- decoys ---- */
function polDecoys(){for(const d of G.ents){if(d.dead||d.isB||!d.s||!d.s.fake)continue;
    for(const e of G.ents){if(e.dead||e.isB||e===d||ally(e.team,d.team)||e.team===G.reb||!e.s||e.s.fake||e.s.dom==='naval'||e.inTun)continue;
      if(Math.abs(e.x-d.x)>POL.DEC_SPOT||Math.abs(e.y-d.y)>POL.DEC_SPOT||Math.hypot(e.x-d.x,e.y-d.y)>POL.DEC_SPOT)continue;
      d.exp=d.exp||[];if(!d.exp.includes(e.team)){d.exp.push(e.team);log(e.team,`Decoy spotted: that ${d.s.name} is a fake (no gun, dies in one hit).`,'g');FXE('tping',[e.team,d.x|0,d.y|0,0]);}}}}
function polKill(e,team){if(!e.s||!e.s.fake||e.isB)return;FXE('txt',[e.x|0,e.y|0,'DECOY',e.team,team==null?-1:team]);
  if(team!=null&&team>=0&&!ally(team,e.team)&&G.teams[team]&&!(e.exp&&e.exp.includes(team)))log(team,`That ${e.s.name} was a decoy!`,'g');}

/* ---- the tick (from simUpdate on the host; does its work twice a second) ---- */
function polTick(dt){G.polA=(G.polA||0)+dt;if(G.polA<.5)return;G.polA=0;
  polSpies();polDecoys();
  for(const T of G.teams)if(T.ai&&!T.reb&&!T.out&&G.t>=(T.aiPolT||0)){T.aiPolT=G.t+6;polAI(T);}}
/* ---- AI: one spy, a few decoys ---- */
function polAI(T){const id=T.id;if(G.t<60)return;
  const hq=G.ents.find(e=>e.isB&&e.kind==='hq'&&e.team===id&&!e.dead);if(!hq)return;
  const mine=G.ents.filter(e=>e.team===id&&!e.dead),enemies=G.teams.filter(O=>O.id!==id&&!O.reb&&!O.out&&!ally(O.id,id));
  // one spy at a time
  const spies=mine.filter(e=>!e.isB&&e.kind==='spy'),inQ=(T.q.barracks||[]).some(q=>q.kind==='spy');
  if(!spies.length&&!inQ&&G.t>240&&T.credits>1300&&enemies.length&&done(id,'barracks'))enqueue(id,'spy');
  for(const u of spies){if(u.sj||G.t<(u.spCd||0))continue;
    let best=null,bd=1e18;for(const O of enemies){const h=G.ents.find(e=>e.isB&&e.kind==='hq'&&e.team===O.id&&!e.dead);if(!h)continue;const d=Math.hypot(h.x-u.x,h.y-u.y);if(d<bd){bd=d;best={O,h};}}
    if(!best)continue;const O=best.O;let job=null;
    if(O.credits>1500)job={k:'steal',tid:best.h.id};
    else{const o=G.oil.findIndex(q=>q.pw&&!q.dead&&q.owner>=0&&ally(q.owner,O.id)&&!(q.sab>G.t));if(o>=0)job={k:'sab',fi:o};
      else if(Object.keys(O.upg||{}).some(k=>O.upg[k]&&!T.upg[k]&&UPG[k]))job={k:'upg',tid:best.h.id};}
    if(job)polSpyCmd(id,Object.assign({ids:[u.id]},job));}
  // a few decoys travel with the army
  const dec=mine.filter(e=>!e.isB&&e.s&&e.s.fake).length,decQ=(T.q.factory||[]).filter(q=>BASE[q.kind]&&BASE[q.kind].fake).length;
  if(G.t>360&&dec+decQ<3&&T.credits>500&&done(id,'factory'))enqueue(id,['dtank','darty','dsam'][(dec+decQ)%3]);}
