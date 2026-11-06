/* ---------- modern war (Abdullah 2026-11-05 18:58): cyber attacks, EMP strike, GPS jamming, war news ----------
   Same numbers for every nation; only the names are flavoured. Sim code: 03g-modern.js; effects/PiP/news: 08h-modern.js.
   Hotkeys: [ = Hack, ] = EMP (every letter key already has a job). One firewall upgrade covers hack AND EMP. */
const MW={HACK_T:25,EMP_T:{veh:7,air:5,bld:8},FW_K:.5,JAM_MISS:.5,JAM_D:[28,70],
  HACKABLE:['radio','uplink','sam','turret','coast'],EMPB:['radio','uplink','sam','turret','coast']};
POWERS.hack={name:'Cyber Attack',desc:'Hack ONE enemy radio tower, Strike Center, SAM site, defence gun or power plant near the target: it goes dark for about 25 seconds (a hacked radio tower or Strike Center also turns the enemy minimap to static). Their Hardened Firewall research halves it. Hotkey [',cd:150,r:240};
POWERS.emp={name:'EMP Strike',desc:'A pulse knocks out enemy vehicles (7 s), aircraft (5 s, they hover and glide, no damage) and electronics: radio, Strike Centers, SAM sites and defence guns (8 s) in the area. Infantry are unaffected. Hardened Firewall halves it. Hotkey ]',cd:240,r:230};
UPG.fw={name:'Hardened Firewall',at:'hq',cost:1300,time:28,desc:'Hardens your networks and electronics: enemy Cyber Attacks and EMP Strikes last half as long on your forces and buildings.'};
{const _ul=upgList;upgList=function(f){const r=_ul(f);return r.includes('fw')?r:r.concat('fw');};}
const MW_NAME={hack:{US:'Cyber Command Strike',TR:'Siber Harekat',IL:'Network Intrusion',EU:'Cyber Task Force',UA:'IT Army Raid',RU:'Grid Intrusion',IR:'Cyber Army Hack',SA:'Digital Defence Op',AE:'Signals Intrusion',PK:'Cyber Cell Strike',IN:'Cyber Agency Hack',CN:'Network Attack',KP:'Hacker Bureau Raid',KR:'Cyber Command Hack',EG:'Digital Raid',CU:'Cyber Guerrilla',RS:'Mountain Cyber Cell',DW:'Desert Cyber Cell'},
  emp:{US:'Pulse Strike',TR:'Elektromanyetik Darbe',IL:'Pulse Strike',RU:'Radio-Electronic Strike',IR:'Electromagnetic Strike',CN:'EMP Pulse Strike',KP:'Pulse Bomb',IN:'Pulse Strike',PK:'Pulse Strike',KR:'Pulse Strike'}};
{const _pi=powInfo;powInfo=function(k,fac){const P=_pi(k,fac);const n=(MW_NAME[k]||{})[fac];return n&&P?Object.assign({},P,{name:n}):P;};}
// GPS jamming: every nation can build the EW Jamming Truck (it already jams drones and guided weapons); the nation-flavoured names stay
{const NM={TR:'Elektronik Harp Aracı',UA:'EW Jamming Vehicle',SA:'EW Jamming Truck',AE:'EW Jamming Truck',PK:'EW Jamming Truck',IN:'EW Jamming Truck',KP:'Jamming Truck',KR:'EW Jamming Truck',EG:'EW Jamming Truck',CU:'Jamming Truck',RS:'Mountain EW Truck',DW:'Desert EW Truck',EU:'EW Jamming Truck'};
  for(const k of Object.keys(FACTIONS)){const F=FACTIONS[k];if(!F||F.special==='ew'||(F.extra||[]).includes('ew'))continue;F.extra=[...(F.extra||[]),'ew'];F.units=F.units||{};F.units.ew=Object.assign({},F.units.ew||{},{name:NM[k]||'EW Jamming Truck'});}}
