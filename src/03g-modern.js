/* ---------- modern war, simulation side (data in 01c-modern.js) ----------
   Cyber Attack and EMP Strike are normal general powers (host-authoritative, order 'pow'). They only set timers that
   already exist and are already saved/synced: building e.dis (offline until), unit e.stun, power plant o.sab.
   GPS jamming extends the EW truck (G.aur.jam): guided shots at anything near an enemy jammer can drift off target. */
function mwFw(team){const T=G.teams[team];return T&&T.upg&&T.upg.fw?MW.FW_K:1;}
function mwPower(team,key,x,y,P,L,M){const T=G.teams[team],en=e=>!e.dead&&e.team>=0&&!ally(e.team,team);
  if(key==='hack'){let best=null,bd=P.r;
    for(const e of G.ents){if(!e.isB||!en(e)||e.built<1||!MW.HACKABLE.includes(e.kind))continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;best=e;}}
    let plant=null;for(const o of G.oil||[]){if(!o.pw||o.dead||o.owner<0||ally(o.owner,team))continue;const d=Math.hypot(o.x-x,o.y-y);if(d<bd){bd=d;plant=o;best=null;}}
    if(!best&&!plant){log(team,'Nothing to hack there: aim near an enemy radio tower, Strike Center, SAM site, defence gun or power plant.','w');return false;}
    const vt=best?best.team:plant.owner,dur=Math.round(MW.HACK_T*M*mwFw(vt)),tx=best?best.x:plant.x,ty=best?best.y:plant.y,nm=best?(bstats(G.teams[vt].fac,best.kind).name||best.kind):'power plant';
    koSet(best||plant,dur,'hack');G.teams[vt].mwHit=1;
    FXE('cyb',[tx|0,ty|0,dur,vt,best?best.id:-1]);
    if(best&&(best.kind==='radio'||best.kind==='uplink'))FXE('mmst',[vt,dur]);
    log(team,`Cyber attack: enemy ${nm} is offline for ${dur} seconds.`,'g');
    log(vt,`CYBER ATTACK! Our ${nm} was hacked and is offline for ${dur} seconds.${G.teams[vt].upg&&G.teams[vt].upg.fw?'':' Research Hardened Firewall to halve it.'}`,'bad');
    pubNews('pow',team,vt,'Cyber Attack');return true;}
  if(key==='emp'){const R=P.r;FXE('emp',[x|0,y|0,R|0]);
    for(const O of G.teams)if(O.id!==team&&!ally(O.id,team)&&G.ents.some(e=>e.team===O.id&&!e.dead&&Math.hypot(e.x-x,e.y-y)<R+250))log(O.id,'Warning: electromagnetic pulse incoming!','w');
    G.timers.push({t:1.4,fn:()=>{let n=0;for(const e of G.ents){if(!en(e)||Math.hypot(e.x-x,e.y-y)>R)continue;const k=mwFw(e.team);G.teams[e.team].mwHit=1;
      if(e.isB){if(MW.EMPB.includes(e.kind)&&e.built>=1){koSet(e,MW.EMP_T.bld*M*k,'emp');n++;}}
      else if(e.s.dom==='air'){koSet(e,MW.EMP_T.air*M*k,'emp');n++;}
      else if(isVeh(e.s)||e.s.dom==='naval'){koSet(e,MW.EMP_T.veh*M*k,'emp');n++;}}
      log(team,`EMP Strike: ${n} enemy vehicles, aircraft and electronics knocked out.`,'g');pubNews('pow',team,-1,'EMP Strike');}});return true;}
  return false;}
// GPS jamming: a guided shot (missile, ATGM, guided bomb) at anything inside an enemy EW truck's bubble may drift off target
function mwJam(p,t){if(!G.aur||!G.aur.jam.length||!(p.wpn==='missile'||p.wpn==='at'||p.wpn==='bomb')||!auraProtect(t,'jam'))return;
  if(srand()>=MW.JAM_MISS)return;const a=srand()*6.283,d=MW.JAM_D[0]+srand()*(MW.JAM_D[1]-MW.JAM_D[0]);p.tx+=Math.cos(a)*d;p.ty+=Math.sin(a)*d;p.jm=1;
  if(G.t-(t.jmT||-9)>3){t.jmT=G.t;FXE('txt',[p.x|0,p.y|0,'JAMMED',p.team,t.team]);}}
// AI: buys these only after its core powers, then uses them sensibly (hack a SAM/turret/radio near its army, EMP a vehicle cluster)
function aiModern(id,T,mine,en){if(G.t<240)return;
  if(T.rank-T.spent>0&&T.pw.nat&&T.pw.barrage&&T.pw.recon&&T.ai.d>=1){if(!T.pw.hack)buyPower(id,'hack');else if(!T.pw.emp)buyPower(id,'emp');}
  if(!T.upg.fw&&!T.rq.hq&&done(id,'hq')&&T.credits>=UPG.fw.cost+600&&T.mwHit)startResearch(id,'fw');
  const army=mine.filter(e=>!e.isB&&e.s.dom==='ground'&&!e.s.noAttack);if(army.length<4)return;
  if(T.pw.hack&&T.pw.hack.cd<=0&&T.ai.t%5===1){let tg=null,bd=700;for(const e of G.ents){if(!e.isB||e.dead||ally(e.team,id)||e.team<0||e.built<1||!MW.HACKABLE.includes(e.kind)||!seenBy(id,e))continue;const d=Math.min(...army.slice(0,6).map(u=>Math.hypot(u.x-e.x,u.y-e.y)));if(d<bd){bd=d;tg=e;}}if(tg)usePower(id,'hack',tg.x,tg.y);}
  if(T.pw.emp&&T.pw.emp.cd<=0&&T.ai.t%5===3){const V=G.ents.filter(e=>!e.dead&&!e.isB&&e.team>=0&&!ally(e.team,id)&&isVeh(e.s)&&seenBy(id,e));let best=null,bn=4;for(const v of V.slice(0,24)){let n=0;for(const w of V)if(Math.hypot(w.x-v.x,w.y-v.y)<190)n++;if(n>bn){bn=n;best=v;}}if(best)usePower(id,'emp',best.x,best.y);}}
