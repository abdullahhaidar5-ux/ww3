/* ---- SIGNATURE UNITS (lane L1, Abdullah 2026-11-14; orch/reports/factiondesign.md) ----
   Small behaviours added to EXISTING unit slots, not new systems. Each has a giveback; hooks live at the end of 03g-modern.js.
   RS  Kornet Ambush Team: first shot after leaving a tunnel hits DOUBLE for 5 s (the shared tunnel ambush is +50% for 3 s).
   IL, DE  Merkava Mk4M / Leopard 2A8 with active protection (APS): shrugs off one anti-tank hit per 8 s; costs 8% more.
   RU, CN  Mass armour: a tank with 2+ friendly tanks within 120 m takes 10% less damage.
   UA  FPV Drone Team (fpvt): cheap barracks team, launches short-range one-way FPV drones - vehicles only, 8 drones then resupply.
   TR  Bayraktar TB2 (tb2): MALE drone from the Airfield, long reach, light guided munitions, 2 max, General rank, can be shot down.
   (IR Shahed Launcher Truck removed 2026-11-15: Iran has the Zolfaghar Missile Launcher, 01f-irbm.js.)
   KP  KN-25 240 mm Rocket Battery: 12-rocket ripple from the War Factory, long reload, max 3, General rank gate (like the EW truck). */
const SIGU={krb:1,tb2:1};   /* rank-gated signature vehicles (specLock / tip in 08-ui) */
const SIG={apsCd:8,massR:120,massN:2,massK:.9,tunAmbT:5,tunAmbK:2/1.5,krbRank:SPEC_RANK};
BASE.krb=Object.assign({},BASE.arty,{name:'KN-25 240 mm Rocket Battery',rocket:true,ripple:12,rng:400,minr:110,dmg:9,splash:40,rof:9,hp:240,cost:800,time:14,limit:3,desc:'Massed 240 mm rockets: a long ripple of 12 that blankets an area, then a slow reload. Fragile, so hide it behind your lines.'});
{const f=(k,fn)=>{const F=FACTIONS[k];if(F){F.units=F.units||{};fn(F.units);}};
  f('RS',U=>{U.at=Object.assign({},U.at||{},{name:'Kornet Ambush Team',tunAmb:1});});
  for(const k of ['IL','DE'])f(k,U=>{const b=Object.assign({},BASE.tank,U.tank||{});U.tank=Object.assign({},U.tank||{},{aps:SIG.apsCd,name:k==='IL'?'Merkava Mk4M (APS)':'Leopard 2A8 (APS)',cost:Math.round(b.cost*1.08/25)*25});});
  for(const k of ['RU','CN'])f(k,U=>{U.tank=Object.assign({},U.tank||{},{mass:1});});
  f('KP',U=>{U.krb={};});
  if(FACTIONS.KP)FACTIONS.KP.extra=[...(FACTIONS.KP.extra||[]),'krb'];}
SPECIAL_TIP.krb=u=>'Massed 240 mm rockets: a ripple of '+(u.ripple||12)+' that blankets an area, then a slow reload. Fragile; keep it behind your lines. Needs General rank.';
BASE.fpvt={name:'FPV Drone Team',cls:'at',hp:90,spd:46,rng:290,dmg:85,rof:4.2,wpn:'at',aa:0,vehOnly:1,amCap:8,cost:300,time:7,from:'barracks',armor:'light',r:7,dom:'ground',limit:4,desc:'A drone crew: short-range one-way FPV drones that only go for vehicles. 8 drones, then resupply. Fragile and slow to reload.'};
BASE.tb2={name:'Bayraktar TB2',cls:'heli',hp:150,spd:70,rng:300,dmg:36,rof:1.8,wpn:'at',aa:0,cost:950,time:16,from:'airfield',armor:'air',r:12,dom:'air',alt:'low',vis:420,limit:2,desc:'A medium-altitude drone that loiters for a long time and drops light guided munitions on vehicles from afar. Weak armor, so low-flying air defense shoots it down. Needs General rank.'};
{const f=(k,fn)=>{const F=FACTIONS[k];if(F){F.units=F.units||{};fn(F.units);}};
  f('UA',U=>{U.fpvt={};});f('TR',U=>{U.tb2={};});
  for(const [k,x] of [['UA','fpvt'],['TR','tb2']])if(FACTIONS[k])FACTIONS[k].extra=[...(FACTIONS[k].extra||[]),x];}
SPECIAL_TIP.tb2=u=>'Loiters a long time and hits vehicles from afar with light guided munitions. Shot down by low-flying air defense. Needs General rank.';
/* IR has no Shahed launcher truck (Abdullah 2026-11-15 00:19); it has the Zolfaghar Missile Launcher in 01f-irbm.js */
SPECIAL_TIP.fpvt=u=>'Short-range FPV drones that only attack vehicles. '+(u.amCap||8)+' drones, then resupply.';

/* ---- UNIQUE GENERALS / RED ALERT SUPERWEAPONS & 22-NATION DOCTRINE PERKS (never modifies morale or faction hierarchy) ---- */
const SUP_STYLE={
  US:'beam',JP:'beam',KR:'beam',AE:'beam',
  RU:'nuke',CN:'nuke',KP:'nuke',PK:'nuke',IN:'nuke',
  IR:'scud',RS:'scud',DW:'scud',RV:'scud',OB:'scud',
  GB:'storm',DE:'storm',FR:'storm',
  IL:'carpet',TR:'carpet',UA:'carpet',SA:'carpet',EG:'carpet'
};
const SUP_SPEC={
  US:{name:'Orbital Particle Cannon',charge:165,n:6,dmg:380,r:82,spread:115,style:'beam'},
  JP:{name:'Helios Orbital Beam',charge:165,n:6,dmg:365,r:80,spread:110,style:'beam'},
  KR:{name:'Aegis Ion Lance',charge:160,n:6,dmg:370,r:80,spread:110,style:'beam'},
  AE:{name:'Solar Thermal Lance',charge:160,n:6,dmg:365,r:80,spread:110,style:'beam'},
  RU:{name:'Sarmat Nuclear ICBM',charge:190,n:1,dmg:1080,r:205,spread:0,style:'nuke'},
  CN:{name:'DF-41 Nuclear Missile',charge:190,n:1,dmg:1120,r:210,spread:0,style:'nuke'},
  KP:{name:'Hwasong Nuclear Strike',charge:205,n:1,dmg:1050,r:225,spread:0,style:'nuke'},
  PK:{name:'Shaheen Nuclear Warhead',charge:185,n:1,dmg:1020,r:195,spread:0,style:'nuke'},
  IN:{name:'Agni Thermonuclear Strike',charge:185,n:1,dmg:1040,r:200,spread:0,style:'nuke'},
  IR:{name:'Kheibar / SCUD Storm',charge:150,n:12,dmg:340,r:78,spread:205,style:'scud'},
  RS:{name:'Radwan Rocket Storm',charge:155,n:14,dmg:310,r:70,spread:225,style:'scud'},
  DW:{name:'Toofan Ballistic Storm',charge:150,n:13,dmg:315,r:68,spread:220,style:'scud'},
  RV:{name:'Quds Rocket Storm',charge:155,n:11,dmg:345,r:75,spread:195,style:'scud'},
  OB:{name:'Saturation Rocket Storm',charge:155,n:12,dmg:325,r:72,spread:200,style:'scud'},
  GB:{name:'Tempest Weather Storm',charge:170,n:9,dmg:340,r:82,spread:168,style:'storm'},
  DE:{name:'Donner Lightning Storm',charge:170,n:9,dmg:350,r:82,spread:168,style:'storm'},
  FR:{name:'Foudre Ion Storm',charge:165,n:9,dmg:340,r:80,spread:165,style:'storm'},
  IL:{name:'Bunker-Buster Air Armada',charge:155,n:8,dmg:445,r:82,spread:180,style:'carpet'},
  TR:{name:'Tayfun & Drone Armada',charge:155,n:8,dmg:420,r:80,spread:175,style:'carpet'},
  UA:{name:'Neptune Strike Armada',charge:155,n:8,dmg:415,r:84,spread:175,style:'carpet'},
  SA:{name:'Desert Storm Air Armada',charge:155,n:8,dmg:425,r:82,spread:180,style:'carpet'},
  EG:{name:'Sinai Heavy Air Armada',charge:155,n:8,dmg:430,r:80,spread:180,style:'carpet'}
};
{
  const patchU=(fk,uk,fn)=>{const F=FACTIONS[fk];if(!F)return;F.units=F.units||{};const base=Object.assign({},BASE[uk]||{},F.units[uk]||{});F.units[uk]=Object.assign({},F.units[uk]||{},fn(base));};
  for(const k in SUP_SPEC){if(FACTIONS[k])FACTIONS[k].sup=Object.assign({},FACTIONS[k].sup||{},SUP_SPEC[k]);}
  // Distinct Generals / Red Alert signature unit perks across all 22 playable nations (balanced with clear trade-offs)
  patchU('US','tank',b=>({name:'M1A2 Abrams (Laser PD)',aps:9,cost:Math.round((b.cost||800)*1.06/25)*25}));
  patchU('GB','tank',b=>({name:'Challenger 2 (Chobham)',chobham:1,hp:Math.round((b.hp||460)*1.14),spd:Math.round((b.spd||56)*0.93)}));
  patchU('FR','tank',b=>({name:'Leclerc (Autoloader)',rof:+(Math.max(0.8,(b.rof||2.2)*0.84)).toFixed(2),spd:Math.round((b.spd||56)*1.12),hp:Math.round((b.hp||460)*0.94)}));
  patchU('JP','tank',b=>({name:'Type 10 (Agile MBT)',spd:Math.round((b.spd||56)*1.18),rng:Math.round((b.rng||175)*1.10),hp:Math.round((b.hp||460)*0.92)}));
  patchU('KR','arty',b=>({name:'K9 Thunder (Counter-Battery)',rng:Math.round((b.rng||360)*1.12),rof:+(Math.max(1.2,(b.rof||5.2)*0.88)).toFixed(2),cost:Math.round((b.cost||650)*1.06/25)*25}));
  patchU('IN','arty',b=>({name:'BrahMos Supersonic Battery',dmg:Math.round((b.dmg||85)*1.14),splash:Math.round((b.splash||50)*1.16),cost:Math.round((b.cost||650)*1.08/25)*25}));
  patchU('PK','tank',b=>({name:'Al-Khalid (Flanker)',spd:Math.round((b.spd||56)*1.12),rof:+(Math.max(0.8,(b.rof||2.2)*0.92)).toFixed(2)}));
  patchU('RU','arty',b=>({name:'TOS-1A Solntsepek',splash:Math.round((b.splash||50)*1.28),dmg:Math.round((b.dmg||85)*1.14),rng:Math.round((b.rng||360)*0.90)}));
  patchU('CN','tank',b=>({name:'Type 99A (Heavy Overlord)',hp:Math.round((b.hp||460)*1.09),spd:Math.round((b.spd||56)*0.94)}));
  patchU('EG','tank',b=>({name:'M1A1 Nile Armor',cost:Math.round((b.cost||800)*0.90/25)*25,time:Math.max(5,Math.round((b.time||12)*0.88))}));
  patchU('SA','jet',b=>({name:'F-15SA Heavy Strike',hp:Math.round((b.hp||240)*1.14),dmg:Math.round((b.dmg||90)*1.12)}));
  patchU('AE','drone',b=>({name:'Precision Strike Drone',spd:Math.round((b.spd||115)*1.16),dmg:Math.round((b.dmg||120)*1.12)}));
  patchU('DW','jeep',b=>({name:'Toofan Desert Raider',spd:Math.round((b.spd||92)*1.16),cost:Math.round((b.cost||300)*0.90/25)*25}));
  patchU('RV','mortar',b=>({name:'Hashd Heavy Mortar',hp:Math.round((b.hp||90)*1.22),splash:Math.round((b.splash||34)*1.16)}));
  patchU('OB','at',b=>({name:'Al-Yassin Ambush Team',dmg:Math.round((b.dmg||52)*1.15),hp:Math.round((b.hp||95)*1.14)}));
}
