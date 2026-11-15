/* ---- SIGNATURE UNITS (lane L1, Abdullah 2026-11-14; orch/reports/factiondesign.md) ----
   Small behaviours added to EXISTING unit slots, not new systems. Each has a giveback; hooks live at the end of 03g-modern.js.
   RS  Kornet Ambush Team: first shot after leaving a tunnel hits DOUBLE for 5 s (the shared tunnel ambush is +50% for 3 s).
   IL, DE  Merkava Mk4M / Leopard 2A8 with active protection (APS): shrugs off one anti-tank hit per 8 s; costs 8% more.
   RU, CN  Mass armour: a tank with 2+ friendly tanks within 120 m takes 10% less damage.
   UA  FPV Drone Team (fpvt): cheap barracks team, launches short-range one-way FPV drones - vehicles only, 8 drones then resupply.
   TR  Bayraktar TB2 (tb2): MALE drone from the Airfield, long reach, light guided munitions, 2 max, General rank, can be shot down.
   IR  Shahed Launcher Truck (shl): War Factory vehicle, loitering one-way drones at very long range, slow reload, 6 drones then resupply, 2 max, General rank.
   KP  KN-25 240 mm Rocket Battery: 12-rocket ripple from the War Factory, long reload, max 3, General rank gate (like the EW truck). */
const SIGU={krb:1,tb2:1,shl:1};   /* rank-gated signature vehicles (specLock / tip in 08-ui) */
const SIG={apsCd:8,massR:120,massN:2,massK:.9,tunAmbT:5,tunAmbK:2/1.5,krbRank:SPEC_RANK};
BASE.krb=Object.assign({},BASE.arty,{name:'KN-25 240 mm Rocket Battery',rocket:true,ripple:12,rng:400,minr:110,dmg:9,splash:40,rof:9,hp:240,cost:900,time:14,limit:3,desc:'Massed 240 mm rockets: a long ripple of 12 that blankets an area, then a slow reload. Fragile, so hide it behind your lines.'});
{const f=(k,fn)=>{const F=FACTIONS[k];if(F){F.units=F.units||{};fn(F.units);}};
  f('RS',U=>{U.at=Object.assign({},U.at||{},{name:'Kornet Ambush Team',tunAmb:1});});
  for(const k of ['IL','DE'])f(k,U=>{const b=Object.assign({},BASE.tank,U.tank||{});U.tank=Object.assign({},U.tank||{},{aps:SIG.apsCd,name:k==='IL'?'Merkava Mk4M (APS)':'Leopard 2A8 (APS)',cost:Math.round(b.cost*1.08/25)*25});});
  for(const k of ['RU','CN'])f(k,U=>{U.tank=Object.assign({},U.tank||{},{mass:1});});
  f('KP',U=>{U.krb={};});
  if(FACTIONS.KP)FACTIONS.KP.extra=[...(FACTIONS.KP.extra||[]),'krb'];}
SPECIAL_TIP.krb=u=>'Massed 240 mm rockets: a ripple of '+(u.ripple||12)+' that blankets an area, then a slow reload. Fragile; keep it behind your lines. Needs General rank.';
BASE.fpvt={name:'FPV Drone Team',cls:'at',hp:90,spd:46,rng:290,dmg:85,rof:4.2,wpn:'at',aa:0,vehOnly:1,amCap:8,cost:350,time:7,from:'barracks',armor:'light',r:7,dom:'ground',limit:4,desc:'A drone crew: short-range one-way FPV drones that only go for vehicles. 8 drones, then resupply. Fragile and slow to reload.'};
BASE.tb2={name:'Bayraktar TB2',cls:'heli',hp:150,spd:70,rng:300,dmg:36,rof:1.8,wpn:'at',aa:0,cost:950,time:16,from:'airfield',armor:'air',r:12,dom:'air',alt:'low',vis:420,limit:2,desc:'A medium-altitude drone that loiters for a long time and drops light guided munitions on vehicles from afar. Weak armor, so low-flying air defense shoots it down. Needs General rank.'};
BASE.shl=Object.assign({},BASE.arty,{name:'Shahed Launcher Truck',rocket:true,rng:640,minr:160,dmg:160,splash:50,rof:14,amCap:6,hp:230,cost:750,time:13,limit:2,desc:'Launches loitering one-way drones at very long range: a heavy hit on the target area, then a slow reload. 6 drones, then resupply. Fragile; keep it behind your lines. Needs General rank.'});
{const f=(k,fn)=>{const F=FACTIONS[k];if(F){F.units=F.units||{};fn(F.units);}};
  f('UA',U=>{U.fpvt={};});f('TR',U=>{U.tb2={};});f('IR',U=>{U.shl={};});
  for(const [k,x] of [['UA','fpvt'],['TR','tb2'],['IR','shl']])if(FACTIONS[k])FACTIONS[k].extra=[...(FACTIONS[k].extra||[]),x];}
SPECIAL_TIP.tb2=u=>'Loiters a long time and hits vehicles from afar with light guided munitions. Shot down by low-flying air defense. Needs General rank.';
SPECIAL_TIP.shl=u=>'Launches loitering one-way drones at very long range, then reloads slowly ('+(u.amCap||6)+' drones before resupply). Fragile. Needs General rank.';
SPECIAL_TIP.fpvt=u=>'Short-range FPV drones that only attack vehicles. '+(u.amCap||8)+' drones, then resupply.';
