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
const GPX_AUT0=10,GPX_AUT_UP=4,GPX_AUT_SLIP=60,GPX_SLIP_P=.15,GPX_BUY_P=.3;
// Autonomy (x[3], 0-100): a funded militia has goals of its own. It grows 4 a month; from 60 it may slip out of control (15% a month):
//   the sponsor loses it, its home province unrest +6 in three provinces, and with 30% a rival of the sponsor (lowest opinion of it, not the target) buys it.
const GPX_COST=400,GPX_MONTHS=12,GPX_EXPOSE=.06,GPX_SEC=100,GPX_VOL_P=.25,GPX_VOL_MAN=25,GPX_VOL_COST=150,GPX_VOL_MAX=6;
function gdRelGet(a,b){try{return (typeof gdOp==='function'?gdOp(a,b):0)||0;}catch(e){return 0;}}
function gpxS(){if(!GC.px)GC.px=[];if(!GC.vol)GC.vol={};return GC;}
function gpxOk(a,b){if(a===b||!GC||!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead)return false;return !grAtWar(a,b)&&!grAllied(a,b);}
function gpxHas(a,b){gpxS();return GC.px.some(x=>x[0]===a&&x[1]===b);}
function gpxStart(a,b){gpxS();if(!gpxOk(a,b)||gpxHas(a,b))return false;GC.px.push([a,b,GC.turn+GPX_MONTHS,GPX_AUT0]);
  const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;grLog(na+' funds a militia inside '+nb+'. Officially, nothing is happening.',a);return true;}
function gpxTurn(){if(!GC||!GC.nat)return;gpxS();const R=grRng((GC.seed|0)*521+GC.turn*13);
  // RG9: funded militias
  GC.px=GC.px.filter(x=>gpxOk(x[0],x[1])&&GC.turn<x[2]);
  for(const x of GC.px.slice()){const a=x[0],b=x[1];const r=R();
    GC.nat[a].cash-=GPX_COST;GC.nat[b].cash-=GPX_SEC;
    const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b);
    for(let k=0;k<2&&ps.length;k++){const pr=GC.prov[ps[Math.floor(R()*ps.length)].i];pr.un=Math.max(0,Math.min(100,(pr.un||0)+1));}
    x[3]=Math.min(100,(x[3]==null?GPX_AUT0:x[3])+GPX_AUT_UP);
    if(x[3]>=GPX_AUT_SLIP&&R()<GPX_SLIP_P){const nm=GCM.nats.get(a).name,nt=GCM.nats.get(b).name;
      for(let k=0;k<3&&ps.length;k++){const pr=GC.prov[ps[Math.floor(R()*ps.length)].i];pr.un=Math.max(0,Math.min(100,(pr.un||0)+6));}
      GC.px=GC.px.filter(y=>y!==x);
      const riv=Object.keys(GC.nat).filter(o=>o!==a&&o!==b&&!GC.nat[o].dead&&gpxOk(o,b)).sort((m,n)=>gdRelGet(m,a)-gdRelGet(n,a))[0];
      if(riv&&R()<GPX_BUY_P){GC.px.push([riv,b,GC.turn+GPX_MONTHS,40]);grLog('The militia '+nm+' funded inside '+nt+' has gone its own way and found a new paymaster: '+GCM.nats.get(riv).name+'.',a);}
      else grLog('The militia '+nm+' funded inside '+nt+' has slipped out of control. '+nm+' no longer commands it; unrest rises.',a);
      continue;}
    if(r<GPX_EXPOSE){gdRel(b,a,-30);for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(o,a,-5);
      grLog('A militia funded by '+GCM.nats.get(a).name+' inside '+GCM.nats.get(b).name+' has been traced back. Opinion of '+GCM.nats.get(a).name+' falls across the world.',a);
      GC.px=GC.px.filter(y=>y!==x);}
  }
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
