// PROXY WARS + FOREIGN VOLUNTEERS (lane G, RG9 + RG18, first cut). Neutral wording; no real groups, places or people.
// RG9 'proxy' (diplomacy act "Arm a proxy militia"): a nation at peace with b (not at war, not allied) funds a militia inside b
//   for 12 months ($400 up front, then $400 a month through gpxTurn). Each month b pays $100 in security costs and gains unrest +1
//   in up to two of its provinces. Exposure roll (6% a month): the militia is traced back, b's opinion of the sender falls -30, every
//   other nation's opinion of the sender -5, and the militia ends. Counter-play: exposure risk, the opinion hit, and the cash drain.
// RG18 volunteers: each month a war host h gets volunteers from nations of its own faction family that are not at war with h,
//   not at war or allied with h's enemy e (25% a month per volunteer nation, at most 6 months per volunteer and war). Host +25 manpower;
//   the volunteer nation pays $150 and its opinion of e falls -5. Cost for the volunteers, so nothing is free power.
// Deterministic from seed + turn (multiplayer safe). State lives in GC.px and GC.vol, saved with GC.
const GPX_COST=400,GPX_MONTHS=12,GPX_EXPOSE=.06,GPX_SEC=100,GPX_VOL_P=.25,GPX_VOL_MAN=25,GPX_VOL_COST=150,GPX_VOL_MAX=6;
function gpxS(){if(!GC.px)GC.px=[];if(!GC.vol)GC.vol={};return GC;}
function gpxOk(a,b){if(a===b||!GC||!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead)return false;return !grAtWar(a,b)&&!grAllied(a,b);}
function gpxHas(a,b){gpxS();return GC.px.some(x=>x[0]===a&&x[1]===b);}
function gpxStart(a,b){gpxS();if(!gpxOk(a,b)||gpxHas(a,b))return false;GC.px.push([a,b,GC.turn+GPX_MONTHS]);
  const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;grLog(na+' funds a militia inside '+nb+'. Officially, nothing is happening.',a);return true;}
function gpxTurn(){if(!GC||!GC.nat)return;gpxS();const R=grRng((GC.seed|0)*521+GC.turn*13);
  // RG9: funded militias
  GC.px=GC.px.filter(x=>gpxOk(x[0],x[1])&&GC.turn<x[2]);
  for(const x of GC.px.slice()){const a=x[0],b=x[1];const r=R();
    GC.nat[a].cash-=GPX_COST;GC.nat[b].cash-=GPX_SEC;
    const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b);
    for(let k=0;k<2&&ps.length;k++){const pr=GC.prov[ps[Math.floor(R()*ps.length)].i];pr.un=Math.max(0,Math.min(100,(pr.un||0)+1));}
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
