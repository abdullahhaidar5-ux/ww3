/* ---------- Politics & intel (Abdullah 2026-11-05 18:55; orch/reports/politics-intel.md) ----------
   World opinion + sanctions/aid, spies & sabotage, decoy units, refugees on roads, radio/TV station + leaflet drops, local militias.
   Owners (orch/SYSTEMS.md): opinion = this file (the grand map will read T.op later); "knocked out for a while" = the building's `dis` (and
   o.sab on power plants); deception = decoys here + EW spoofs in 03-sim; locals = townRecruit/milMake + insurgents (t.rebU) in 03-sim.
   Host-authoritative and deterministic: no Math.random, fixed update order, constants in POL (01-data). New state rides in the checkpoint
   (team fields op/opT/..., unit fields sj/spCd/exp, town fields autoT/insT/refT, and G.refs / G.leaf / G.refId in CK_G). */
function opOf(T){return T&&T.op!=null?T.op:POL.START;}
// income multiplier from sanctions (1 = none); applied to town tax and to oil/harvest income
function polMul(T){const o=opOf(T);return o<POL.SANC_BELOW?1-POL.SANC_MAX*(POL.SANC_BELOW-o)/POL.SANC_BELOW:1;}
function opHit(team,pts,why){if(!G||!G.conq||team==null||team<0||!(pts>0))return;const T=G.teams[team];if(!T||T.reb||T.out)return;
  T.op=Math.max(0,opOf(T)-pts);T.opT=G.t;T.opLow=Math.min(T.opLow==null?100:T.opLow,T.op);
  if(why&&G.t>=(T.opMsg||0)){T.opMsg=G.t+25;if(!T.ai)log(team,why,'w');}}
function opLabel(v){return v<POL.SANC_BELOW?'Pariah':v<50?'Distrusted':v<POL.AID_ABOVE?'Neutral':v<88?'Respected':'Admired';}
// a destroyed civic building (market / garage / clinic cell of a town) counts against whoever brought it down
function polCiv(c,team){if(c&&c.key&&c.ti>=0&&team!=null&&team>=0)opHit(team,POL.CIVIC,'Civic buildings are being destroyed - world opinion falls.');}

/* ---- refugees ---- */
const REF_SP=24;
function refPos(r){const s=REF_SP*Math.max(0,Math.min(r.dur,G.t-r.t0));return[r.x0+r.dx*s,r.y0+r.dy*s];}
function refSlow(u){const R=G.refs;for(let i=0;i<R.length;i++){const r=R[i],s=REF_SP*Math.max(0,Math.min(r.dur,G.t-r.t0)),x=r.x0+r.dx*s,y=r.y0+r.dy*s;if(Math.abs(u.x-x)<46&&Math.abs(u.y-y)<46)return POL.REF_SLOW;}return 1;}
// an explosion that lands on a refugee column kills it: accidental, but it counts against the firer
function polBlast(x,y,r,d,team){if(!G.refs||!G.refs.length||team==null||team<0)return;
  for(let i=G.refs.length-1;i>=0;i--){const q=G.refs[i],p=refPos(q);if(Math.hypot(p[0]-x,p[1]-y)>r*.8+16)continue;G.refs.splice(i,1);
    opHit(team,POL.REF,'Refugees were caught in the fire - world opinion falls.');FXE('txt',[p[0]|0,p[1]|0,'REFUGEES HIT',team,q.ow]);
    if(q.ow>=0&&q.ow!==team)log(q.ow,'Our refugees were hit by enemy fire.','w');}}
function polRefugees(dt,U){if(!G.refs)G.refs=[];G.refs=G.refs.filter(r=>G.t<r.t0+r.dur);
  if(G.t<G.setupEnd)return;
  for(const t of G.towns){if(t.ow<0||t.reb>G.t||(t.pop!=null&&t.pop<.35)||G.refs.length>=POL.REF_MAX||G.t<(t.refT||0))continue;
    const hot=G.t-(t.cwT||-999)<20||(t.fr>=3&&t.gar>=1);if(!hot)continue;
    let near=null,bd=1e9;for(const e of U){if(ally(e.team,t.ow)||e.team===G.reb)continue;const d=Math.hypot(e.x-t.x,e.y-t.y);if(d<bd){bd=d;near=e;}}
    let dx=0,dy=0;if(near&&bd>1){dx=(t.x-near.x)/bd;dy=(t.y-near.y)/bd;}else{dx=Math.cos(t.i*2.1);dy=Math.sin(t.i*2.1);}
    const a=Math.atan2(dy,dx)+Math.sin((G.refId|0)*2.4)*.45,len=POL.REF_R*(.75+.25*Math.abs(Math.cos((G.refId|0)*1.7)));
    const q=nearestPassXY('ground',t.x+Math.cos(a)*len,t.y+Math.sin(a)*len);if(!q)continue;
    const sx=t.x+Math.cos(a)*t.r*.5,sy=t.y+Math.sin(a)*t.r*.5,L=Math.hypot(q[0]-sx,q[1]-sy);if(L<150)continue;
    G.refs.push({id:(G.refId=(G.refId|0)+1),x0:sx,y0:sy,dx:(q[0]-sx)/L,dy:(q[1]-sy)/L,t0:G.t,dur:L/REF_SP,n:5+((G.refId*7)%5),ti:t.i,ow:t.ow});
    t.refT=G.t+28;const T=G.teams[t.ow];if(T&&!T.ai&&G.t>=(T.refMsg||0)){T.refMsg=G.t+60;log(t.ow,`Civilians are fleeing ${t.name}. They slow everyone on the road - take care not to hit them.`,'w');}}}

/* ---- local militias (extends townRecruit / revolt rebels) ---- */
function milMake(t,team,cost){const T=G.teams[team];t.mil=(t.mil||[]).filter(u=>!u.dead);const k=t.mil.length,q=nearestPassXY('ground',t.x+(k%2?30:-30),t.y+14+k*7)||[t.x,t.y];return localSpawn(t,'own','inf',q[0],q[1],{team,cost});}
function polMilitias(dt){if(G.t<G.setupEnd)return;
  for(const t of G.towns){if(t.ow<0||t.reb>G.t)continue;const T=G.teams[t.ow];if(!T||T.reb||T.out)continue;
    // loyal towns under attack raise free defenders for themselves
    if(t.loy&&G.t>=(t.autoT||0)&&(t.fr>=2||G.t-(t.cwT||-999)<20)){t.mil=(t.mil||[]).filter(u=>!u.dead);const need=Math.min(3,HM.MIL_CAP-t.mil.length);
      if(need>0){for(let i=0;i<need;i++)milMake(t,t.ow,recruitCost(t,t.ow));t.autoT=G.t+POL.MIL_AUTO_CD;if(!T.ai)log(t.ow,`The locals of ${t.name} take up arms to defend their town (free).`,'g');}}
    // angry towns arm rebels before they revolt
    if(t.un>=POL.INS_UN&&G.reb!=null&&G.teams[G.reb]&&G.t>=(t.insT||0)){t.rebU=(t.rebU||[]).filter(u=>!u.dead);
      if(t.rebU.length<POL.INS_CAP){const a=(t.rebU.length+1)*2.399+t.i,q=nearestPassXY('ground',t.x+Math.cos(a)*(t.r*.7),t.y+Math.sin(a)*(t.r*.7))||[t.x,t.y];const u=localSpawn(t,'reb','inf',q[0],q[1],{ins:1});
        if(u){t.insT=G.t+60;log(t.ow,`Angry locals in ${t.name} are taking up arms - lower the tax or send troops!`,'bad');FXE('tping',[t.ow,t.x|0,t.y|0,2]);}}
      else t.insT=G.t+20;}}}

/* ---- propaganda: radio & TV station + leaflet drops (the neutral radio masts stay in updTowers) ---- */
function polProp(t){if(t.ow<0)return 0;let v=0;
  for(const b of G.radios||[]){if(Math.abs(b.x-t.x)>POL.RAD_R||Math.abs(b.y-t.y)>POL.RAD_R||Math.hypot(b.x-t.x,b.y-t.y)>POL.RAD_R)continue;v+=ally(t.ow,b.team)?POL.RAD_LOY:POL.RAD_UN;}
  for(const l of G.leaf||[])if(l.ti===t.i&&l.until>G.t)v+=POL.LEAF_UN;
  return v;}
function polRadios(){G.radios=G.ents.filter(e=>e.isB&&e.kind==='radio'&&!e.dead&&e.built>=1&&!(e.dis>G.t));
  for(const b of G.radios)if(!b.air){b.air=1;const T=G.teams[b.team];if(T&&!T.ai)log(b.team,`${STATION[T.fac]||'Our station'} is on the air - towns around it grow more loyal, enemy towns restless.`,'g');}
  if(G.leaf&&G.leaf.length)G.leaf=G.leaf.filter(l=>l.until>G.t);}
function leafCost(){return Math.round(POL.LEAF_COST*(G.bs||1));}
function leafOk(t,team){const T=G.teams[team];return !!(G.conq&&t&&T&&!T.out&&!T.reb&&t.ow>=0&&!ally(t.ow,team)&&!(t.reb>G.t)&&G.t>=G.setupEnd&&G.t>=(T.leafT||0)&&(G.radios||G.ents.filter(e=>e.isB&&e.kind==='radio'&&!e.dead&&e.built>=1&&!(e.dis>G.t))).some(b=>ally(b.team,team)&&Math.hypot(b.x-t.x,b.y-t.y)<POL.LEAF_R));}
function polLeaf(team,a){const T=G.teams[team],t=G.towns&&G.towns[a.ti|0];if(T&&!T.ai&&G.t<(T.leafT||0)){log(team,`The leaflet crews are still reloading (${Math.ceil(T.leafT-G.t)} s).`,'w');return;}if(!leafOk(t,team))return;const c=leafCost();if(T.credits<c){if(!T.ai)log(team,'Not enough money for a leaflet drop.','w');return;}
  T.credits-=c;T.leafT=G.t+POL.LEAF_CD;(G.leaf=G.leaf||[]).push({ti:t.i,team,until:G.t+POL.LEAF_T});
  log(team,`Leaflets are falling on ${t.name}: unrest will keep rising there for ${POL.LEAF_T} s.`,'g');log(t.ow,`Enemy leaflets and broadcasts are stirring up ${t.name}.`,'w');
  FXE('txt',[t.x|0,t.y|0,'LEAFLETS',team,t.ow]);FXE('tping',[t.ow,t.x|0,t.y|0,1]);}

/* ---- spies & sabotage ---- */
const SPY_KINDS={steal:['hq'],upg:['hq','barracks','factory','airfield','uplink'],sab:['uplink','radio']};
// where a spy has to go for a job; null when the target is gone / no longer an enemy
function polJobTarget(j,team){
  if(j.k==='bribe'){const t=G.towns&&G.towns[j.ti|0];return t&&t.ow>=0&&!ally(t.ow,team)&&!(t.reb>G.t)?{x:t.x,y:t.y,r:t.r*.6,t,vt:t.ow}:null;}
  if(j.fi>=0&&j.k==='sab'){const o=G.oil[j.fi|0];return o&&o.pw&&!o.dead&&o.owner>=0&&!ally(o.owner,team)?{x:o.x,y:o.y,r:30,o,vt:o.owner}:null;}
  const b=G.byId.get(j.tid);if(!b||b.dead||!b.isB||ally(b.team,team)||b.team<0||G.teams[b.team].reb||!(SPY_KINDS[j.k]||[]).includes(b.kind)||b.built<1)return null;
  return{x:b.x,y:b.y,r:(b.size||40)/2,b,vt:b.team};}
function polSpyCmd(team,a){const T=G.teams[team];if(!T||T.out||T.reb||!G.conq||G.t<G.setupEnd)return;
  const k=a.k==='sabo'?'sab':a.k;if(!['steal','upg','sab','bribe'].includes(k))return;
  const j={k,tid:a.tid|0,fi:a.k==='sabo'?(a.fi|0):-1,ti:a.ti|0};
  if(!polJobTarget(j,team))return;let n=0;
  for(const id of a.ids||[]){const u=G.byId.get(id);if(!u||u.dead||u.team!==team||u.kind!=='spy')continue;
    if(G.t<(u.spCd||0)){if(!T.ai)log(team,'Our agent is still lying low after the last job.','w');continue;}u.sj=Object.assign({},j);u.sjMv=0;n++;}
  if(n&&!T.ai)log(team,'Agent on the way. It stays disguised until it acts - keep it away from enemy infantry and loyal towns.','');}
function polSpyAct(u,j,tg){const team=u.team,T=G.teams[team],V=G.teams[tg.vt];if(!V)return;const bx=u.x|0,by=u.y|0;let done=false,msgV='';
  if(j.k==='steal'){const amt=Math.min(Math.round(POL.SPY_STEAL_MAX*(G.bs||1)),Math.floor(V.credits*POL.SPY_STEAL));
    if(amt<80){log(team,'The enemy vault is nearly empty - nothing worth stealing yet.','w');u.spCd=G.t+10;return;}
    V.credits-=amt;T.credits+=amt;done=true;log(team,`Our agent emptied part of the enemy treasury: +$${amt}.`,'g');msgV=`An enemy agent robbed our treasury: -$${amt}!`;}
  else if(j.k==='upg'){const c=Object.keys(V.upg||{}).filter(k=>V.upg[k]&&!T.upg[k]&&UPG[k]).sort((p,q)=>UPG[q].cost-UPG[p].cost||(p<q?-1:1));
    if(!c.length){log(team,'No technology here that we do not already have.','w');u.spCd=G.t+10;return;}
    const k=c[0];T.upg[k]=true;upgReset(T);done=true;const nm=(typeof upgName==='function'&&upgName(V.fac,k))||UPG[k].name||'research';log(team,`Our agent stole the plans for ${nm}!`,'g');msgV=`An enemy agent copied our ${nm} research!`;}
  else if(j.k==='sab'){if(tg.o){koSet(tg.o,POL.SPY_SAB_T,'sabotage');done=true;log(team,`Sabotage! The enemy power plant is down for ${POL.SPY_SAB_T} s.`,'g');msgV='Sabotage! One of our power plants is knocked out for a while.';}
    else{koSet(tg.b,POL.SPY_SAB_T,'sabotage');done=true;log(team,`Sabotage! The enemy ${tg.b.kind==='radio'?'broadcast station':'Strike Center'} is knocked out for ${POL.SPY_SAB_T} s.`,'g');msgV=`Sabotage! Our ${bstats(V.fac,tg.b.kind).name} is knocked out for a while.`;}}
  else if(j.k==='bribe'){const c=Math.round(POL.SPY_BRIBE_COST*(G.bs||1));if(T.credits<c){log(team,`Not enough money to pay agitators ($${c}).`,'w');u.spCd=G.t+10;return;}
    T.credits-=c;const t=tg.t;t.un=Math.min(100,t.un+POL.SPY_BRIBE);t.shock=Math.max(t.shock||0,G.t+30);done=true;log(team,`Agitators are at work in ${t.name}: unrest +${POL.SPY_BRIBE}.`,'g');msgV=`Paid agitators are stirring up ${t.name}!`;}
  if(done){u.spCd=G.t+POL.SPY_CD;u.detT=G.t+POL.SPY_EXPOSE;if(msgV&&!V.reb)log(tg.vt,msgV,'bad');FXE('tping',[tg.vt,bx,by,2]);FXE('txt',[bx,by,'AGENT',team,tg.vt]);}}
function polSpies(){for(const u of G.ents){if(u.dead||u.kind!=='spy')continue;
    // disguise: enemy infantry close by, or a loyal enemy town (informants), blow the cover
    let seenBy=-1;for(const e of G.ents){if(e.dead||e.isB||e.team===u.team||ally(e.team,u.team)||e.team===G.reb||!e.s||e.s.noAttack||e.s.dom!=='ground'||e.inTun)continue;
      const R=isInf(e.s)?POL.SPY_SPOT:POL.SPY_SPOT*.5;if(Math.abs(e.x-u.x)>R||Math.abs(e.y-u.y)>R)continue;if(Math.hypot(e.x-u.x,e.y-u.y)<=R){seenBy=e.team;break;}}
    if(seenBy<0)for(const t of G.towns){if(t.loy&&t.ow>=0&&!ally(t.ow,u.team)&&Math.hypot(t.x-u.x,t.y-u.y)<t.r+30){seenBy=t.ow;break;}}
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

/* ---- the tick (called from updTowns every step; does its work twice a second) ---- */
function polTick(st,U){G.polA=(G.polA||0)+st;if(G.polA<.5)return;const dt=G.polA;G.polA=0;if(!G.conq)return;
  // world opinion: Extortionate tax drains it, a clean war (no violations for a while) slowly rebuilds it; low = sanctions, high = foreign aid
  const ext=new Array(G.teams.length).fill(0);for(const t of G.towns)if(t.ow>=0&&t.rate===3&&!(t.reb>G.t))ext[t.ow]++;
  for(const T of G.teams){if(T.reb||T.out)continue;let o=opOf(T);
    if(ext[T.id])o-=POL.EXT*Math.min(3,ext[T.id])*dt;
    if(G.t-(T.opT||0)>POL.CLEAN_AFTER&&G.t>=G.setupEnd)o+=POL.CLEAN_RATE*dt;
    T.op=Math.max(0,Math.min(100,o));T.opLow=Math.min(T.opLow==null?100:T.opLow,T.op);
    const s=T.op<POL.SANC_BELOW||(T.opS===1&&T.op<POL.SANC_BELOW+6)?1:T.op>=POL.AID_ABOVE?2:0;
    if(s!==(T.opS|0)){T.opS=s;if(!T.ai){if(s===1)log(T.id,`World opinion of us has collapsed (${Math.round(T.op)}/100): sanctions cut our income by ${Math.round((1-polMul(T))*100)}%. Stop shelling towns and lower the tax.`,'bad');else if(s===2)log(T.id,'The world approves of how we fight - foreign aid will arrive.','g');else log(T.id,'Sanctions lifted: world opinion has recovered.','g');}}
    if(T.op>=POL.AID_ABOVE&&G.t>=(T.aidT||0)){if(T.aidT){const v=Math.round((T.op-POL.AID_ABOVE)/(100-POL.AID_ABOVE)*POL.AID_MAX*(G.bs||1));if(v>0){T.credits+=v;T.aidSum=(T.aidSum|0)+v;if(!T.ai)log(T.id,`Foreign aid drop: +$${v}.`,'g');}}T.aidT=G.t+POL.AID_EVERY;}}
  polRadios();polSpies();polDecoys();polRefugees(dt,U);polMilitias(dt);
  for(const T of G.teams)if(T.ai&&!T.reb&&!T.out&&G.t>=(T.aiPolT||0)){T.aiPolT=G.t+6;polAI(T);}}

/* ---- AI: lowers taxes when the world turns on it, builds a station, runs leaflets, one spy, a few decoys ---- */
function polAI(T){const id=T.id;if(G.t<G.setupEnd+60)return;
  if(opOf(T)<POL.SANC_BELOW+10)for(const t of G.towns)if(t.ow===id&&t.rate===3&&!(t.reb>G.t))townCmd(id,{ti:t.i,r:2});
  const hq=G.ents.find(e=>e.isB&&e.kind==='hq'&&e.team===id&&!e.dead);if(!hq)return;
  const mine=G.ents.filter(e=>e.team===id&&!e.dead),enemies=G.teams.filter(O=>O.id!==id&&!O.reb&&!O.out&&!ally(O.id,id));
  // radio & TV station
  const hasR=mine.some(e=>e.isB&&e.kind==='radio');
  if(!hasR&&G.t>240&&bldAllowed(T.fac,'radio')&&reqMet(id,'radio')&&T.credits>bstats(T.fac,'radio').cost+100&&!mine.some(e=>e.isB&&e.built<1)){const p=aiFindSpot(id,'radio',hq);if(p)placeBld(id,'radio',p[0],p[1]);}
  if(hasR&&T.credits>leafCost()+100&&G.t>=(T.leafT||0)){let bt=null,bu=0;for(const t of G.towns)if(leafOk(t,id)&&t.un>=25&&t.un>bu&&!(G.leaf||[]).some(l=>l.ti===t.i)){bu=t.un;bt=t;}if(bt)polLeaf(id,{ti:bt.i});}
  // one spy at a time
  const spies=mine.filter(e=>!e.isB&&e.kind==='spy'),inQ=(T.q.barracks||[]).some(q=>q.kind==='spy');
  if(!spies.length&&!inQ&&G.t>240&&T.credits>1300&&enemies.length&&done(id,'barracks'))enqueue(id,'spy');
  for(const u of spies){if(u.sj||G.t<(u.spCd||0))continue;
    let best=null,bd=1e18;for(const O of enemies){const h=G.ents.find(e=>e.isB&&e.kind==='hq'&&e.team===O.id&&!e.dead);if(!h)continue;const d=Math.hypot(h.x-u.x,h.y-u.y);if(d<bd){bd=d;best={O,h};}}
    if(!best)continue;const O=best.O;let job=null;
    if(O.credits>1500)job={k:'steal',tid:best.h.id};
    else{const o=G.oil.findIndex(q=>q.pw&&!q.dead&&q.owner>=0&&ally(q.owner,O.id)&&!(q.sab>G.t));if(o>=0)job={k:'sab',fi:o};
      else{const t=G.towns.find(q=>q.ow===O.id&&q.un>=30&&!(q.reb>G.t));if(t&&T.credits>600)job={k:'bribe',ti:t.i};else if(Object.keys(O.upg||{}).some(k=>O.upg[k]&&!T.upg[k]&&UPG[k]))job={k:'upg',tid:best.h.id};}}
    if(job)polSpyCmd(id,Object.assign({ids:[u.id]},job));}
  // a few decoys travel with the army
  const dec=mine.filter(e=>!e.isB&&e.s&&e.s.fake).length,decQ=(T.q.factory||[]).filter(q=>BASE[q.kind]&&BASE[q.kind].fake).length;
  if(G.t>360&&dec+decQ<3&&T.credits>500&&done(id,'factory'))enqueue(id,['dtank','darty','dsam'][(dec+decQ)%3]);}
