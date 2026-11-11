// PROXY WARS + FOREIGN VOLUNTEERS (lane G, RG9 + RG18, first cut). Neutral wording; no real groups, places or people.
// RG9 'proxy' (diplomacy act "Arm a proxy militia"): a nation at peace with b (not at war, not allied) funds a militia inside b
//   for 12 months ($400 up front, then $400 a month through gpxTurn). Each month b pays $100 in security costs and gains unrest +1
//   in up to two of its provinces. Exposure roll (6% a month): the militia is traced back, b's opinion of the sender falls -30, every
//   other nation's opinion of the sender -5, and the militia ends. Counter-play: exposure risk, the opinion hit, and the cash drain.
// RG18 volunteers: each month a war host h gets volunteers from nations of its own faction family that are not at war with h,
//   not at war or allied with h's enemy e (25% a month per volunteer nation, at most 6 months per volunteer and war). Host +25 manpower;
//   the volunteer nation pays $150 and its opinion of e falls -5. Cost for the volunteers, so nothing is free power.
// RG15 'cyber' (diplomacy act "Cyber strike on banks", first cut, one system with the proxy act): $250 to run; their banks lose $400
//   that month and their opinion of you -20; 1 strike in 4 is attributed (everyone's opinion of you -10). One strike per 6 months per pair.
//   Not allied. Counter-play: attribution risk and the cooldown. Merge with RG3 spies is still open (a covert system later).
// Deterministic from seed + turn (multiplayer safe). State lives in GC.px, GC.vol and GC.cyT, saved with GC.
const GPX_CYBER_COST=250,GPX_CYBER_HIT=400,GPX_CYBER_CD=6;
function gpxCyber(a,b){GC.cyT=GC.cyT||{};GC.cyT[grWk(a,b)]=GC.turn;GC.nat[b].cash-=GPX_CYBER_HIT;gdRel(b,a,-20);
  const R=grRng((GC.seed|0)*677+GC.turn*17+a.charCodeAt(0)*3+b.charCodeAt(0));const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;
  if(R()<.25){gdRel(b,a,-10);for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(o,a,-10);
    grLog('Banks in '+nb+' went dark. Investigators trace the attack to '+na+'; the world is angry.',a);}
  else grLog('Banks in '+nb+' report a network outage. Nobody claims it.',b);}
const GPX_COST=400,GPX_MONTHS=12,GPX_EXPOSE=.06,GPX_SEC=100,GPX_VOL_P=.25,GPX_VOL_MAN=25,GPX_VOL_COST=150,GPX_VOL_MAX=6;
function gpxS(){if(!GC.px)GC.px=[];if(!GC.vol)GC.vol={};return GC;}
function gpxOk(a,b){if(a===b||!GC||!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead)return false;return !grAtWar(a,b)&&!grAllied(a,b);}
function gpxHas(a,b){gpxS();return GC.px.some(x=>x[0]===a&&x[1]===b);}
// PROXY WARFARE deepening (campaign runner, queue item 1). Entry = [sponsor,target,endTurn,tier,autonomy,evidence] (old 3-field saves read as tier 1, autonomy 10, evidence 0).
// tier 1 "Funds only": $400/mo, 2 provinces +1 unrest, evidence +2/mo, autonomy +3/mo. tier 2 "Arms and advisers": $700/mo, +2 unrest and $150 extra security cost
//   for the target, evidence +4/mo, but advisers keep control (autonomy +1/mo). Exposure each month = 2% x tier + evidence/1500. Exposed: target -30 (tier 2: everyone -10), everyone -5,
//   sponsor loses $300 x tier in trade and insurance. Autonomy >= 50: 6% a month a rival of the sponsor (at war or opinion <= -40, with cash) buys the militia. Autonomy >= 70: 12% a month it slips its
//   sponsor's control and fights its own war (+4 unrest in 3 provinces, target blames the sponsor -10). Counter-play: crack down (target pays $400: 60% ends it, tier 2 advisers captured), AI targets crack down too (15% a month once evidence >= 12); the target only learns the sponsor's name once evidence >= 15 (GPX_KNOWN);
//   keeping evidence low, advisers vs control. Real 2026 context: orch/REAL-2026.md "Proxy warfare".
const GPX_COST2=700,GPX_SEC2=150,GPX_CRACK=400,GPX_KNOWN=15;
function gpxT(x){return x[3]||1;}function gpxA(x){return x[4]==null?10:x[4];}function gpxE(x){return x[5]||0;}
function gpxRisk(x){return Math.min(.6,GPX_EXPOSE/3*gpxT(x)+gpxE(x)/1500);}
function gpxCost(x){return gpxT(x)===2?GPX_COST2:GPX_COST;}
function gpxRel(a,b){return (GC.rel&&GC.rel[grWk(a,b)])||0;}
function gpxStart(a,b){gpxS();if(!gpxOk(a,b)||gpxHas(a,b))return false;GC.px.push([a,b,GC.turn+GPX_MONTHS,1,10,0]);
  const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;grLog(na+' funds a militia inside '+nb+'. Officially, nothing is happening.',a);return true;}
function gpxTier(a,b,t){gpxS();const x=GC.px.find(y=>y[0]===a&&y[1]===b);if(!x||(t!==1&&t!==2))return false;x[3]=t;return true;}
function gpxCrack(b,a){gpxS();const x=GC.px.find(y=>y[0]===a&&y[1]===b);if(!x||GC.nat[b].cash<GPX_CRACK)return false;GC.nat[b].cash-=GPX_CRACK;
  const R=grRng((GC.seed|0)*911+GC.turn*7+b.charCodeAt(0)+a.charCodeAt(0)*5),nb=GCM.nats.get(b).name,na=GCM.nats.get(a).name;
  x[5]=gpxE(x)+10;
  if(R()<.6){GC.px=GC.px.filter(y=>y!==x);
    if(gpxT(x)===2){gdRel(b,a,-10);for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(o,a,-5);grLog(nb+' breaks up the militia and shows captured foreign advisers from '+na+'.',b);}
    else grLog(nb+' breaks up a militia inside its borders.',b);return true;}
  grLog(nb+' cracks down but the militia melts away and returns.',b);return false;}
// AI nations fund militias by base rates: rare (0.35% a month), only against a hostile non-ally (opinion <= -40) and with cash; the Resistance bloc (IR/RS/DW/RV/OB/BI) four times as often against its enemies.
function gpxAI(R){const keys=Object.keys(GC.nat).sort();
  for(const a of keys){if(a===GC.me||GC.nat[a].dead||GC.nat[a].cash<GPX_COST*6)continue;
    const res=['IR','RS','DW','RV','OB','BI'].includes(a),p=GPX_AI_P*(res?4:1);
    if(GC.px.filter(x=>x[0]===a).length>=(res?2:1))continue;
    const r=R();if(r>=p)continue;
    const c=keys.filter(b=>b!==a&&!GC.nat[b].dead&&gpxRel(a,b)<=-40&&gpxOk(a,b)&&!gpxHas(a,b));
    if(!c.length)continue;const b=c[Math.floor(R()*c.length)];gpxStart(a,b);if(res&&GC.nat[a].cash>GPX_COST2*8)gpxTier(a,b,2);}}
const GPX_AI_P=.0035;
function gpxTurn(){if(!GC||!GC.nat)return;gpxS();const R=grRng((GC.seed|0)*521+GC.turn*13);
  // RG9: funded militias
  GC.px=GC.px.filter(x=>gpxOk(x[0],x[1])&&GC.turn<x[2]);
  for(const x of GC.px.slice()){const a=x[0],b=x[1],t=gpxT(x);const r=R(),r2=R(),r3=R();
    GC.nat[a].cash-=gpxCost(x);GC.nat[b].cash-=GPX_SEC+(t===2?GPX_SEC2:0);
    x[3]=t;x[4]=Math.min(100,gpxA(x)+(t===2?1:3));x[5]=gpxE(x)+(t===2?4:2);
    const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b);
    for(let k=0;k<2&&ps.length;k++){const pr=GC.prov[ps[Math.floor(R()*ps.length)].i];pr.un=Math.max(0,Math.min(100,(pr.un||0)+t));}
    const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;
    if(r<gpxRisk(x)){gdRel(b,a,-30);for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(o,a,t===2?-10:-5);
      GC.nat[a].cash-=300*t;
      grLog('A militia funded by '+na+' inside '+nb+' has been traced back'+(t===2?' (foreign advisers were found)':'')+'. Opinion of '+na+' falls across the world.',a);
      GC.px=GC.px.filter(y=>y!==x);continue;}
    if(gpxA(x)>=70&&r2<.12){const ps2=ps.slice();for(let k=0;k<3&&ps2.length;k++){const i=Math.floor(R()*ps2.length);const pr=GC.prov[ps2[i].i];pr.un=Math.max(0,Math.min(100,(pr.un||0)+4));ps2.splice(i,1);}
      gdRel(b,a,-10);grLog('The militia inside '+nb+' has stopped taking orders from '+na+' and fights its own war.',a);GC.px=GC.px.filter(y=>y!==x);continue;}
    if(gpxA(x)>=50&&r3<.06){const riv=Object.keys(GC.nat).sort().filter(o=>o!==a&&o!==b&&!GC.nat[o].dead&&(grAtWar(o,a)||gpxRel(o,a)<=-40)&&GC.nat[o].cash>=GPX_COST*4&&gpxOk(o,b)&&!gpxHas(o,b));
      if(riv.length){const o=riv[Math.floor(R()*riv.length)];x[0]=o;x[4]=30;grLog('The militia inside '+nb+' has taken money from '+GCM.nats.get(o).name+' instead of '+na+'.',a);}}
  }
  // AI targets answer too: once there is enough evidence (about 3-6 months in) a government with cash cracks down, 15% a month.
  for(const x of GC.px.slice()){const b=x[1];if(b===GC.me||GC.px.indexOf(x)<0)continue;const r=R();if(gpxE(x)>=12&&GC.nat[b].cash>=GPX_CRACK*3&&r<.15)gpxCrack(b,x[0]);}
  gpxAI(R);
  // RG18: volunteers join wars that matter to their faction family
  const wars=Object.keys(GC.war).filter(k=>GC.war[k]).sort();
  for(const k of wars){const [h1,h2]=k.split('|');
    for(const [h,e] of [[h1,h2],[h2,h1]]){
      if(!GC.nat[h]||!GC.nat[e]||GC.nat[h].dead||GC.nat[e].dead)continue;
      const fac=grNat(h).fac;
      for(const v of Object.keys(GC.nat).sort()){
        if(v===h||v===e||GC.nat[v].dead||grNat(v).fac!==fac)continue;
        if(grAtWar(v,h)||grAtWar(v,e)||grAllied(v,e))continue;
        const vk=v+'>'+h+'>'+e;gpxS();const r=R();
        if(r>=GPX_VOL_P||(GC.vol[vk]||0)>=GPX_VOL_MAX||GC.nat[v].cash<GPX_VOL_COST)continue;
        GC.vol[vk]=(GC.vol[vk]||0)+1;GC.nat[v].cash-=GPX_VOL_COST;
        const N=GC.nat[h];if(N.e)N.e.man=Math.max(0,(N.e.man||0)+GPX_VOL_MAN);
        gdRel(v,e,-5);
        grLog('Volunteers from '+GCM.nats.get(v).name+' are fighting for '+GCM.nats.get(h).name+' against '+GCM.nats.get(e).name+'.',h);
      }
    }
  }
}
