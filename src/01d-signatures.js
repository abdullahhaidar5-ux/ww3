/* ---- SIGNATURE UNITS (lane L1, Abdullah 2026-11-14; orch/reports/factiondesign.md) ----
   Small behaviours added to EXISTING unit slots, not new systems. Each has a giveback; hooks live at the end of 03g-modern.js.
   RS  Kornet Ambush Team: first shot after leaving a tunnel hits DOUBLE for 5 s (the shared tunnel ambush is +50% for 3 s).
   IL, DE  Merkava Mk4M / Leopard 2A8 with active protection (APS): shrugs off one anti-tank hit per 8 s; costs 8% more.
   RU, CN  Mass armour: a tank with 2+ friendly tanks within 120 m takes 10% less damage.
   KP  KN-25 240 mm Rocket Battery: 12-rocket ripple from the War Factory, long reload, max 3, General rank gate (like the EW truck). */
const SIG={apsCd:8,massR:120,massN:2,massK:.9,tunAmbT:5,tunAmbK:2/1.5,krbRank:SPEC_RANK};
BASE.krb=Object.assign({},BASE.arty,{name:'KN-25 240 mm Rocket Battery',rocket:true,ripple:12,rng:400,minr:110,dmg:9,splash:40,rof:9,hp:240,cost:900,time:14,limit:3,desc:'Massed 240 mm rockets: a long ripple of 12 that blankets an area, then a slow reload. Fragile, so hide it behind your lines.'});
{const f=(k,fn)=>{const F=FACTIONS[k];if(F){F.units=F.units||{};fn(F.units);}};
  f('RS',U=>{U.at=Object.assign({},U.at||{},{name:'Kornet Ambush Team',tunAmb:1});});
  for(const k of ['IL','DE'])f(k,U=>{const b=Object.assign({},BASE.tank,U.tank||{});U.tank=Object.assign({},U.tank||{},{aps:SIG.apsCd,name:k==='IL'?'Merkava Mk4M (APS)':'Leopard 2A8 (APS)',cost:Math.round(b.cost*1.08/25)*25});});
  for(const k of ['RU','CN'])f(k,U=>{U.tank=Object.assign({},U.tank||{},{mass:1});});
  f('KP',U=>{U.krb={};});
  if(FACTIONS.KP)FACTIONS.KP.extra=[...(FACTIONS.KP.extra||[]),'krb'];}
SPECIAL_TIP.krb=u=>'Massed 240 mm rockets: a ripple of '+(u.ripple||12)+' that blankets an area, then a slow reload. Fragile; keep it behind your lines. Needs General rank.';
