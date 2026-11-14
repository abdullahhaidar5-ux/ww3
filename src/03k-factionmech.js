/* L2 Faction mechanics (orch/reports/factiondesign.md, Abdullah 2026-11-14 "Do all the dev work now"; answers = RECOMMENDED).
   1) Shia group: RV/OB Hidden Firing Post (see FACTIONS.post, isPost in 03-sim), cheap fortifications x0.6 in Battle for IR RS DW RV OB (SHIA5 in 01-data).
   2) US / IL "fewer but stronger" (stats only, Q6a): cost +8%, hp +8%, unit build time +10% on top of their own mods; off in Realistic (REAL_TIER already does it).
   3) Gulf (SA AE) integrated air defence: SAM sites / AA vehicles with another one of the team within 300 m get +10% range (rngOf reads e.iadsT).
   (Europe perks and RU/CN platoon bonus belong to lane L1 / data already in place.) The iads flag is re-derived every second, so it is not saved in checkpoints. */
const FMECH={US:{cost:1.08,hp:1.08,time:1.1},IL:{cost:1.08,hp:1.08,time:1.1}};
const IADS_NAT={SA:1,AE:1},IADS_KIND={sam:1,aa:1,dsam:1},IADS_R=300;
let _fmAcc=0;
function fmTick(dt){_fmAcc+=dt;if(_fmAcc<1)return;_fmAcc=0;
  const L=[];for(const e of G.ents){if(e.dead||!IADS_KIND[e.kind]||(e.isB&&e.built<1))continue;const T=G.teams[e.team];if(T&&IADS_NAT[T.fac])L.push(e);}
  for(const e of L){let ok=false;for(const o of L){if(o!==e&&o.team===e.team&&Math.abs(o.x-e.x)<IADS_R&&Math.abs(o.y-e.y)<IADS_R&&Math.hypot(o.x-e.x,o.y-e.y)<IADS_R){ok=true;break;}}if(ok)e.iadsT=G.t+1.5;}}
