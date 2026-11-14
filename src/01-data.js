/* ================= DATA ================= */
// World size: maps are designed on a 3200 x 2200 field and scaled to the number of players in the match
// (a duel is fought on a tighter map than an eight-way war). WK is the current scale.
let MAPW=3200,MAPH=2200,WK=1;const CELL=40;let GW=Math.ceil(MAPW/CELL),GH=Math.ceil(MAPH/CELL);
// Dynamic weather: what rolls in depends on the theatre; each kind changes how far units see, how well they shoot,
// how fast ground forces move and whether aircraft can fly.
const WEATHER={clear:{name:'Clear',vis:1,acc:1,spd:1,air:1},
  rain:{name:'Rain',vis:.8,acc:.9,spd:.88,air:.9,tip:'Mud slows ground units, visibility and accuracy drop.'},
  fog:{name:'Fog',vis:.55,acc:.92,spd:.95,air:.85,tip:'Heavy fog: units see barely half as far. Ambush weather.'},
  sandstorm:{name:'Sandstorm',vis:.55,acc:.8,spd:.88,air:0,tip:'Sandstorm: vision and accuracy slashed, jets grounded, helicopters and drones struggle.'},
  snow:{name:'Snow',vis:.8,acc:.92,spd:.9,air:.8,tip:'Deep snow slows ground units; vision and aircraft are a little worse.'},
  blizzard:{name:'Blizzard',vis:.6,acc:.85,spd:.8,air:0,tip:'Blizzard: snow slows everything, jets grounded, vision cut.'}};
// Seasons (2026-11-06): the lobby 'Conditions' value w carries the weather/time-of-day in its ones digit (0-9, or -1 random) and the
// season in its tens digit: 0 = the map's own default, 1 = Summer, 2 = Autumn mud, 3 = Winter snow. Same value on host, clients and server.
function wxBase(w){w|=0;return w<0?-1:w%10;}
function wxSsn(w){w|=0;return Math.min(3,(w<0?((-1-w)/10)|0:(w/10)|0));}
function wxJoin(base,ssn){base|=0;ssn|=0;return base<0?-1-10*ssn:base+10*ssn;}
const SEASONS=['Map default','Summer','Autumn mud','Winter snow'];
function weatherKinds(theme){return theme==='snow'?['clear','blizzard','fog']:theme==='green'?['clear','rain','fog']:['clear','sandstorm','fog'];}
// A duel is fought on a field 1.3x the 3200x2200 design (about 300 infantry-lengths across, like a classic RTS 1v1
// map); each extra player adds room (8 players: 2.26x).
function worldScaleFor(n,mk){n=Math.max(2,Math.min(8,n|0||2));const D=mk&&typeof MAPS!=='undefined'&&MAPS[mk];if(D&&D.cscale)return D.cscale;const K=n<=4?1.27:1;return Math.round(K*(n===2&&!(D&&D.oldScale&&D.oldScale.includes(2))?2.25:n===3&&!(D&&D.oldScale&&D.oldScale.includes(3))?2.4:Math.round((D&&D.oldScale&&D.oldScale.includes(n)?1.56:1.95)*Math.pow(n/2,.4)*100)/100)*100)/100;}   // Conquest maps (Abdullah 2026-11-04 20:01): 2-4 players another +27% (base-to-base walk ~4-5 min), 5-8 unchanged; // 2 and 3 players another +15%/+12% (Abdullah 2026-11-03 "epic size"); +25% again (Abdullah 2026-10-30: "maps need to be bigger and more complex"; 2026-10-29 was 1.56; a map can keep 1.56 for player counts listed in oldScale, where the bigger ground gave a start position the edge)
// Player settings (graphics, volumes, game speed, HUD), saved per browser.
const SET={gfx:'auto',mus:70,fx:100,vo:100,spd:1,hp:'dmg',edge:1,txt:1,scr:100,zm:100,inv:0,dbl:350,tol:8,mmc:'cam',mpan:1};try{Object.assign(SET,JSON.parse(localStorage.getItem('ww3_settings')||'{}'));}catch(e){}
function saveSet(){try{localStorage.setItem('ww3_settings',JSON.stringify(SET));}catch(e){}}
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
let srand=Math.random;const srnd=(a,b)=>a+srand()*(b-a);

// dom: ground | naval | air ; alt: low | high (air only); aa: 0 none, 1 low air, 2 all air
const BASE={
  harv:{name:'Supply Truck',cls:'harv',hp:450,spd:62,rng:0,dmg:0,rof:1,cost:600,time:8,from:'hq',armor:'heavy',r:12,dom:'ground',noAttack:true},
  dozer:{name:'Construction Vehicle',cls:'dozer',hp:420,spd:64,rng:0,dmg:0,rof:1,cost:800,time:10,from:'hq',armor:'heavy',r:12,dom:'ground',noAttack:true},
  // Shia factions only: while their Ayatollah lives, none of their soldiers ever break. If he falls, his martyrdom
  // inspires them: no fear and +10% damage for 30 seconds. One at a time; unarmed, so keep him safe.
  cleric:{name:'Ayatollah',cls:'inf',hp:320,spd:40,rng:0,dmg:0,rof:1,cost:1500,time:24,from:'barracks',armor:'light',r:8,dom:'ground',noAttack:true,vis:300,lead:1,limit:1},
  // national specials (each nation gets one; see SPEC below)
  atgm:{name:'MILAN Anti-Tank Carrier',cls:'aa',hp:260,spd:96,rng:440,dmg:88,rof:3.4,wpn:'at',aa:0,cost:700,time:10,from:'factory',armor:'heavy',r:11,dom:'ground',limit:4},
  saka:{name:"Sa'ka Thunderbolt Commandos",cls:'inf',hp:160,spd:60,rng:190,dmg:20,rof:.75,wpn:'gun',splash:16,aa:1,cost:450,time:8,from:'barracks',armor:'light',r:7,dom:'ground',limit:4},
  mortar:{name:'Mortar Team',cls:'inf',hp:110,spd:42,rng:390,minr:80,dmg:42,rof:3,wpn:'shell',splash:45,cost:500,time:9,from:'barracks',armor:'light',r:7,dom:'ground',limit:3},
  recon:{name:'Drone Recon Team',cls:'inf',hp:90,spd:50,rng:0,dmg:0,rof:1,cost:450,time:8,from:'barracks',armor:'light',r:7,dom:'ground',noAttack:true,vis:520,camo:1,markAura:320,limit:2},
  officer:{name:'Field Commander',cls:'inf',hp:220,spd:50,rng:170,dmg:14,rof:.7,wpn:'gun',aa:1,cost:600,time:10,from:'barracks',armor:'light',r:7,dom:'ground',aura:{t:'morale',r:170},limit:2},
  medic:{name:'Combat Medics',cls:'inf',hp:140,spd:48,rng:0,dmg:0,rof:1,cost:450,time:8,from:'barracks',armor:'light',r:7,dom:'ground',noAttack:true,aura:{t:'heal',r:150,v:9},limit:3},
  commissar:{name:'Political Commissar',cls:'inf',hp:180,spd:48,rng:160,dmg:12,rof:.7,wpn:'gun',aa:1,cost:500,time:9,from:'barracks',armor:'light',r:7,dom:'ground',aura:{t:'rof',r:180},limit:2},
  sapper:{name:'Combat Engineers',cls:'inf',hp:130,spd:46,rng:150,dmg:10,rof:.8,wpn:'gun',aa:1,cost:500,time:9,from:'barracks',armor:'light',r:7,dom:'ground',mines:1,limit:3},
  guer:{name:'Guerrilla Ambush Squad',cls:'inf',hp:130,spd:50,rng:170,dmg:15,rof:.8,wpn:'gun',aa:1,cost:350,time:6,from:'barracks',armor:'light',r:7,dom:'ground',camo:1,ambush:1},
  atk:{name:'Elite AT Hunters',cls:'at',hp:140,spd:44,rng:260,dmg:60,rof:2,wpn:'at',aa:2,cost:550,time:9,from:'barracks',armor:'light',r:7,dom:'ground',camo:1,limit:4},
  idome:{name:'Iron Dome Battery',cls:'aa',hp:420,spd:50,rng:0,dmg:0,rof:1,cost:1100,time:12,from:'factory',armor:'heavy',r:13,dom:'ground',noAttack:true,intercept:280,limit:2},
  ew:{name:'EW Jamming Truck',cls:'aa',hp:420,spd:55,rng:0,dmg:0,rof:1,cost:900,time:11,from:'factory',armor:'heavy',r:13,dom:'ground',noAttack:true,jam:280,limit:2},
  cbr:{name:'Counter-Battery Radar',cls:'aa',hp:380,spd:55,rng:0,dmg:0,rof:1,cost:800,time:10,from:'factory',armor:'heavy',r:13,dom:'ground',noAttack:true,cbr:1,vis:400,limit:1},
  jeep:{name:'Desert Recon Patrol',cls:'aa',hp:280,spd:112,rng:200,dmg:14,rof:.3,wpn:'gun',aa:1,cost:500,time:7,from:'factory',armor:'heavy',r:11,dom:'ground',vis:480},
  raidlead:{name:'Raid Leader Technical',cls:'aa',hp:360,spd:96,rng:200,dmg:20,rof:.3,wpn:'gun',aa:1,cost:650,time:8,from:'factory',armor:'heavy',r:12,dom:'ground',aura:{t:'raid',r:200},limit:2},
  inf:{cls:'inf',hp:120,spd:48,rng:150,dmg:11,rof:.8,wpn:'gun',aa:1,cost:150,time:4,from:'barracks',armor:'light',r:7,dom:'ground'},
  at:{cls:'at',hp:110,spd:44,rng:190,dmg:45,rof:2,wpn:'at',aa:2,cost:300,time:6,from:'barracks',armor:'light',r:7,dom:'ground'},
  hacker:{name:'Cyber Team',cls:'hacker',hp:90,spd:46,rng:210,dmg:0,rof:1,cost:400,time:8,from:'barracks',armor:'light',r:7,dom:'ground',noAttack:true,hack:true},
  hero:{cls:'hero',hp:420,spd:62,rng:230,dmg:70,rof:1.1,wpn:'snipe',cost:1500,time:20,from:'barracks',armor:'light',r:8,dom:'ground',stealth:true,limit:1},
  champ:{name:'Hero Squad',cls:'hero',hp:560,spd:58,rng:215,dmg:40,rof:.85,wpn:'gun',aa:1,cost:1800,time:24,from:'barracks',armor:'light',r:8,dom:'ground',limit:1,champ:1},
  aa:{cls:'aa',hp:360,spd:62,rng:310,dmg:22,rof:.32,wpn:'flak',aa:2,ground:false,cost:700,time:9,from:'factory',armor:'heavy',r:13,dom:'ground'},
  tank:{cls:'tank',hp:600,spd:58,rng:200,dmg:55,rof:1.6,wpn:'cannon',cost:800,time:10,from:'factory',armor:'heavy',r:14,dom:'ground'},
  arty:{cls:'arty',hp:280,spd:40,rng:420,dmg:72,rof:4,wpn:'shell',splash:55,minr:90,cost:1000,time:12,from:'factory',armor:'heavy',r:13,dom:'ground'},
  drone:{cls:'drone',hp:80,spd:125,rng:24,dmg:240,rof:1,wpn:'boom',splash:65,cost:350,time:5,from:'airfield',armor:'air',r:8,dom:'air',alt:'low'},
  heli:{cls:'heli',dip:1,sonar:240,hp:430,spd:95,rng:235,dmg:46,rof:1.25,wpn:'at',cost:1300,time:14,from:'airfield',armor:'air',r:14,dom:'air',alt:'low'},
  jet:{cls:'jet',hp:320,spd:240,rng:250,dmg:230,rof:.55,wpn:'bomb',splash:40,ammo:2,cost:1600,time:16,from:'airfield',armor:'air',r:14,dom:'air',alt:'high'},
  // Transports: carry troops (and, by sea, vehicles). Board by clicking the transport with units selected;
  // select the transport and press Unload. Destroyed transports take their passengers with them.
  lander:{name:'Landing Craft',cls:'boat',hp:620,spd:74,rng:0,dmg:0,rof:1,cost:600,time:8,from:'shipyard',armor:'heavy',r:16,dom:'naval',noAttack:1,cap:8,carryVeh:1},
  airlift:{name:'Transport Helicopter',cls:'heli',hp:480,spd:118,rng:0,dmg:0,rof:1,cost:800,time:9,from:'airfield',armor:'air',r:15,dom:'air',alt:'low',noAttack:1,cap:6,door:{rng:170,dmg:9,rof:.6,wpn:'gun',aa:1}},
  boat:{cls:'boat',sonar:170,hp:460,spd:92,rng:220,dmg:14,rof:.35,wpn:'gun',aa:2,cost:700,time:9,from:'shipyard',armor:'heavy',r:14,dom:'naval'},
  // Submarine: stealthy (hidden until it fires or an enemy ship / boat / coastal battery's sonar is close); torpedoes hit ships only.
  sub:{name:'Submarine',cls:'sub',hp:560,spd:54,rng:340,dmg:200,rof:5,wpn:'torp',splash:30,minr:50,cost:1500,time:16,from:'shipyard',armor:'heavy',r:18,dom:'naval',stealth:true,sub:1,sonar:230,navalOnly:1},
  // Navy 2: fast attack craft (cheap swarm boat: guns/rockets, +dmg per nearby sister boat; ships' CIWS and helicopters shred them),
  // minelayer (F+click = lay mines along its path), minesweeper (finds and clears mines). Same stats for every nation.
  fast:{name:'Fast Attack Craft',cls:'boat',hp:220,spd:132,rng:200,dmg:9,rof:.28,wpn:'gun',aa:1,cost:450,time:6,from:'shipyard',armor:'heavy',r:11,dom:'naval',swarm:1},
  minel:{name:'Minelayer',cls:'boat',hp:520,spd:68,rng:0,dmg:0,rof:1,cost:800,time:10,from:'shipyard',armor:'heavy',r:16,dom:'naval',noAttack:1,minelay:1},
  sweep:{name:'Minesweeper',cls:'boat',hp:420,spd:62,rng:0,dmg:0,rof:1,cost:650,time:9,from:'shipyard',armor:'heavy',r:15,dom:'naval',noAttack:1,sweep:1,mdet:260},
  ship:{cls:'ship',sonar:300,hp:1400,spd:48,rng:540,dmg:90,rof:3.5,wpn:'shell',splash:62,minr:110,cost:2200,time:22,from:'shipyard',armor:'heavy',r:26,dom:'naval',door:{rng:240,dmg:12,rof:.2,wpn:'gun',aa:2}},
};
const STRUCT={
  hq:{name:'Command HQ',hp:3000,size:90,cost:2000,time:30},
  barracks:{name:'Barracks',hp:900,size:60,cost:500,time:8},
  factory:{name:'War Factory',hp:1400,size:76,cost:1200,time:12,req:'barracks'},
  airfield:{name:'Airfield',hp:1500,size:96,cost:1500,time:15,req:'factory'},
  shipyard:{name:'Shipyard',hp:1400,size:70,cost:1200,time:12,req:'barracks',shore:true},
  turret:{name:'Defense Gun',hp:750,size:34,cost:600,time:6,req:'barracks',rng:290,dmg:30,rof:1.1,wpn:'tower'},
  sam:{name:'Anti-Air Missile Site',hp:650,size:34,cost:700,time:7,req:'barracks',rng:400,dmg:80,rof:1.5,wpn:'missile',aa:2,ground:false},
  coast:{name:'Coastal Missile Battery',hp:800,size:34,cost:1000,time:12,req:'barracks',shore:true,rng:520,dmg:150,rof:3.4,wpn:'missile',aa:0,navalOnly:1,sonar:260,desc:'Anti-ship missiles for the shore: hits warships, boats and landing craft (and spots submarines nearby), nothing else. Build it on the coast.'},
  tunnel:{name:'Tunnel Network',hp:900,size:40,cost:600,time:9,req:'barracks',rng:220,dmg:14,rof:.45,wpn:'gun',aa:1},
  radio:{name:'Radio & TV Station',hp:1100,size:44,cost:1500,time:14,req:'barracks',limit:2,desc:'Not built in Battle (a Conquest building, removed 2026-11-14). Broadcasts to the towns around it: your towns grow more loyal, enemy towns in range grow restless. Unlocks Leaflet Drops on enemy towns. Fragile - bomb the enemy one.'},
  uplink:{name:'Strike Center',hp:1800,size:70,cost:2500,time:20,req:'factory'},
  // Supply Depot: a forward drop-off point. Supply trucks unload at the nearest depot or HQ instead of driving home.
  depot:{name:'Supply Depot',hp:1000,size:54,cost:600,time:8,desc:'Supply trucks unload here instead of driving back to the HQ. Build one beside a far supply field. Also refills ammo of troops near it.'},
  // Income building: every nation has one (same price and output, national flavour). A slow, steady trickle for
  // once the supply fields are mined out - $3.5/s for the first, each extra one earns less (max 4).
  // a city building held by infantry (not buildable: created when troops move in)
  garrison:{name:'Garrisoned Building',hp:800,size:36,cost:0,time:1},
  econ:{name:'Revenue Center',hp:1100,size:58,cost:2000,time:25,req:'factory',inc:3.5,limit:4,desc:'Earns a slow, steady income: $210 a minute for the first, less for each extra one (max 4). Pays for itself in about 10 minutes.'},
  fort:{name:'Mountain Fortress',hp:5000,size:50,cost:2600,time:30,req:'factory',limit:1,rng:240,dmg:20,rof:.4,wpn:'gun',aa:1,desc:'One per player. A rock-cut bunker that works like a tunnel (units go in and come out of any tunnel) but holds 12 more units. Nothing can damage it except a Bunker Buster.'},
};
/* ---- SPIES & DECOYS (Abdullah 2026-11-05 18:55; orch/reports/politics-intel.md) ---- */
// Spy: disguised (hidden to the enemy like a stealth unit) until it acts or enemy infantry spots it. Same price for every nation.
BASE.spy={name:'Infiltrator',cls:'inf',hp:70,spd:52,rng:0,dmg:0,rof:1,cost:1200,time:40,from:'barracks',armor:'light',r:7,dom:'ground',noAttack:true,stealth:true,spy:true,limit:2,desc:'A plain-clothes operative, not a soldier: cap, dark jacket, a satchel on a strap and a phone at the ear - no uniform and no rifle. Hidden from the enemy until it acts or enemy infantry spots it; while it is hidden you see a small eye above it. Unarmed: select it, pick a job, then right-click a target.'};
// Decoys: inflatable / plywood fakes. They keep the real unit's look, name, size and speed (see stats()) but die in one hit and never fire.
for(const [k,real,nm,cost] of [['dtank','tank','Decoy Tank',150],['dsam','aa','Decoy SAM Truck',120],['darty','arty','Decoy Artillery',150]])
  BASE[k]=Object.assign({},BASE[real],{name:nm,hp:1,dmg:0,rng:0,rof:1,aa:0,ground:true,splash:0,minr:0,wpn:undefined,cost,time:5,from:'factory',noAttack:true,fake:real,limit:4});
const POL={START:62,SANC_BELOW:38,SANC_MAX:.25,AID_ABOVE:72,AID_MAX:160,AID_EVERY:60,CLEAN_AFTER:45,CLEAN_RATE:.05,COLL:.07,CIVIC:1.5,REF:2,EXT:.025,
  SPY_SPOT:70,SPY_ACT:46,SPY_STEAL:.15,SPY_STEAL_MAX:2000,SPY_CD:80,SPY_SAB_T:75,SPY_BRIBE:40,SPY_BRIBE_COST:350,SPY_EXPOSE:12,DEC_SPOT:55,
  RAD_R:1100,RAD_LOY:-.45,RAD_UN:.55,LEAF_COST:300,LEAF_CD:100,LEAF_T:60,LEAF_UN:.9,LEAF_R:3200,
  REF_R:1100,REF_MAX:10,REF_SLOW:.55,REF_LIFE:75,MIL_AUTO_CD:90,MIL_AUTO_UN:72,INS_UN:78,INS_CAP:2};
// Classic RTS proportions (Command & Conquer / StarCraft): chunky readable infantry, tanks ~2.7x a soldier,
// structures a little larger than the original game pieces.
const BSC=1.15;for(const k in STRUCT)if(k!=='garrison')STRUCT[k].size=Math.round(STRUCT[k].size*BSC);
// Each nation's long-range strike building, with its own name and look (the strike itself is the nation's own salvo).
const UPLINK={US:['Tomahawk Launch Center','vls'],TR:['Tayfun Missile Base','tel'],IL:['Strike Air Base','air'],EU:['SCALP Strike Command','vls'],UA:['Neptune Coastal Battery','vls'],
  RU:['Iskander Brigade','tel'],IR:['Underground Missile City','city'],SA:['Strategic Missile Force','vls'],AE:['Precision Strike Command','vls'],PK:['Shaheen Missile Complex','tel'],
  IN:['BrahMos Launch Complex','tel'],CN:['Rocket Force Base','tel'],KP:['Hwasong Launch Site','tel'],KR:['Hyunmoo Missile Command','vls'],EG:['Air Strike Command','air'],
  CU:['Revolutionary Missile Battery','rock'],RS:['Mountain Rocket Silo','city'],DW:['Long-Range Rocket Yard','rock']};
const ECON={US:'Arms Export Office',TR:'Grand Bazaar',IL:'Tech Startup Hub',EU:'Trade Commission',UA:'Grain Export Terminal',RU:'Gas Pipeline Station',IR:'Saffron Bazaar',
  SA:'Oil Ministry Office',AE:'Free Trade Zone',PK:'Textile Mill',IN:'IT Services Park',CN:'Export Factory',KP:'Overseas Labor Bureau',KR:'Electronics Plant',EG:'Suez Canal Toll House',
  CU:'Cigar Factory',RS:'Khums Treasury',DW:'Coffee Roastery'};
const ECON_RATE=[1,.75,.55,.4];
const BUILD_ORDER=['barracks','depot','econ','factory','airfield','shipyard','coast','turret','sam','tunnel','fort','uplink','hq'];
const CATS=['hq','barracks','factory','airfield','shipyard'];
const VS={
  gun:{light:1,heavy:.3,bld:.2,air:.5}, at:{light:.45,heavy:1.6,bld:1.1,air:1}, cannon:{light:.7,heavy:1.2,bld:1,air:0},
  shell:{light:1,heavy:.9,bld:1.3,air:0}, torp:{light:.3,heavy:1.4,bld:.8,air:0}, boom:{light:1,heavy:1,bld:1.5,air:.3}, tower:{light:1,heavy:1,bld:.3,air:0},
  flak:{light:.6,heavy:.2,bld:.1,air:1.6}, missile:{light:.5,heavy:1,bld:.6,air:1.5}, snipe:{light:3,heavy:.08,bld:.05,air:0},
  bb:{light:1,heavy:1,bld:1.6,air:0}, bomb:{light:1,heavy:1.3,bld:1.4,air:0}, super:{light:1,heavy:1,bld:1,air:.5}, demo:{light:0,heavy:0,bld:1,air:0},
};
const MIL_UNITS=(n)=>({inf:{name:n.inf},at:{name:'Anti-Tank Team'},aa:{name:'ZU-23 Technical',hp:240,cost:450,spd:80},tank:{name:n.tank||'Armed Technical',hp:n.tankHp||300,spd:n.tankSpd||88,dmg:18,rof:.35,wpn:'gun',aa:1,cost:500,time:6},
  arty:{name:n.arty||'Rocket Truck',rocket:n.arty?false:true,hp:220,cost:800},boat:{name:n.boat,hp:320,spd:120,cost:450}});
// Courage: how much punishment a nation's soldiers take before they break and fall back. Based on how each
// military is commonly perceived: the Shia forces' martyrdom ethos (Imam Hussein at Karbala) makes them the hardest
// to break; nations fighting for their homeland or shaped by constant combat come next; professional volunteer
// armies hold well; conscript-heavy or combat-untested forces break sooner. Units that break run back to base,
// then rally. Veteran ranks, heroes and morale auras steady them.
// tiers (user): 1 Shia forces; 2 Cuba, North Korea, Russia, Ukraine; 3 Egypt, Turkey, Pakistan; 4 China, Israel, South Korea
// (US and EU sit here too); 5 India, UAE, Saudi Arabia.
const COURAGE={};   // derived below from MORALE_STYLE (integrate1) - one table per nation, never edit by hand
// National morale styles (Abdullah 2026-11-05 20:01-20:41): every nation has ONE style; styles differ, total power is equal. Numbers live here only.
//  cour = base courage; loss = how hard comrades falling hits (x fear, zealous get fervour instead); art = suppression from shells x; off = officer rally x;
//  home = courage x on home turf (own territory); lone = courage divided by this when no armour/artillery/air is near; sup = own artillery+air damage x; taken = damage taken x
const MSTYLES={   // rout = campaign battles: the side breaks below this share of the enemy's strength for 10 s (0 = never; Abdullah 2026-11-06 20:12 "base routing on morale system, zealous never routes"); routHome = when defending its own province
 zeal:{n:'Zealous',rout:0,cour:1.6,loss:.2,ferv:.07,taken:1.07,zeal:1,desc:'Slow to break; fervor rises as comrades fall and banners rally the faithful. They hold their ground, so they take heavier losses.'},
 prof:{n:'Professional',rout:.15,cour:1.25,loss:1.3,art:.7,off:1.9,desc:'Steady under artillery and quick to rally near officers; heavy losses sap them more than other armies.'},
 home:{n:'Home defenders',rout:.2,routHome:.08,cour:1,loss:1,home:1.4,desc:'Much braver inside their own supply area (near their buildings, depots and supply lines); ordinary soldiers beyond it.'},
 fire:{n:'Firepower-reliant',rout:.25,cour:.85,loss:1.15,lone:1.5,sup:1.1,taken:.95,desc:'Lowest morale: they break sooner, especially with no armor, artillery or air support nearby. Balanced by stronger fire support and sturdier modern gear.'}};
const MORALE_STYLE={};
for(const[st,l]of Object.entries({zeal:'IR RS DW KP RV OB BI',prof:'US RU GB FR DE JP KR AU CA IT GR PL TR CN PK ES SE CL EU',home:'JO OM ZA TH ET LY SD KZ TW KD VN BR NG ID SY IQ VE AF AZ PH MX CO AR DZ MA IN UA CU EG',fire:'AE SA IL'}))for(const k of l.split(' '))MORALE_STYLE[k]=st;
function msOf(fac){return MSTYLES[MORALE_STYLE[fac]||'home'];}
function courageOf(u){const T=G.teams[u.team],ms=msOf(T.fac);let c=ms.cour*(1+.12*(u.rank||0))*upgK(T,u.kind,'courage');if(ms.home&&u.hm)c*=ms.home;if(ms.lone&&u.nsup)c/=ms.lone;return c;}
function F_(code,name,color,lang,music,doctrine,mods,special,units,sup,fup,o={}){return Object.assign({code,name,color,lang,music,doctrine,mods,special,units,sup,fup},o);}
const FACTIONS={
  US:F_('US','United States','#4a80e8','en-US','west','Air power & precision: weapons deal 8% more damage; F-35s and Apaches hit 25% harder and are tougher.',{dmg:1.08},'hero',
    {inf:{name:'Marine Squad'},at:{name:'Javelin Team'},hero:{name:'Delta Operator',demo:true},aa:{name:'M-SHORAD Stryker'},tank:{name:'M1 Abrams'},arty:{name:'M109 Paladin'},heli:{name:'AH-64 Apache'},jet:{name:'F-35A Lightning'},boat:{name:'Mark VI Patrol Boat'},ship:{name:'Arleigh Burke Destroyer'}},
    {name:'Tomahawk Salvo',charge:150,n:6,dmg:405,r:85,spread:150},'training'),
  TR:F_('TR','Turkey','#d23a52','tr-TR','mideast','Drone superpower: Bayraktar/Kargu drones cost 10% less, build faster, are tougher and hit harder.',{cost:1},'hero',
    {inf:{name:'Mehmetçik Squad'},at:{name:'OMTAS Team'},hero:{name:'Maroon Beret Commando',demo:true},drone:{name:'Kargu Loitering Drone'},aa:{name:'Korkut SPAAG'},tank:{name:'Altay Tank'},arty:{name:'T-155 Fırtına'},heli:{name:'T129 ATAK'},jet:{name:'KAAN Fighter'},boat:{name:'Kılıç Patrol Boat'},ship:{name:'Istif Frigate'}},
    {name:'Tayfun Missile Strike',charge:160,n:2,dmg:600,r:125,spread:90},'datalink',{extra:['drone']}),
  IL:F_('IL','Israel','#7fd3f0','he-IL','mideast','Iron Dome & missile defense: units are 10% tougher, hit 5% harder and cost 4% less, enemy strikes and missiles do 50% damage to you, SAM sites reach 30% farther and hit harder, Merkava tanks are extra tough, Spike missiles hit hard.',{supResist:.5,cost:.96,hp:1.1,dmg:1.05},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Spike Team',dmg:60},hero:{name:'Sayeret Commando',demo:true},aa:{name:'Machbet SPAAG'},tank:{name:'Merkava Mk4',hp:820},arty:{name:'M109 Doher'},heli:{name:'AH-64 Saraf'},jet:{name:'F-35I Adir'},boat:{name:'Shaldag Patrol Boat'},ship:{name:'Sa’ar 6 Corvette'}},
    {name:'Air Strike',charge:140,n:5,dmg:755,r:70,spread:130},'trophy'),
  EU:F_('EU','European Union','#f0c032','fr-FR','west','Engineering & precision artillery: units self-repair, structures have 30% more hit points, all units cost 3% less, CAESAR guns hit 15% harder.',{regen:3,bldHp:1.3,cost:.97},'hero',
    {inf:{name:'Rifle Section'},at:{name:'MILAN Team'},hero:{name:'KSK Sniper',rng:340,dmg:160,rof:2.2},aa:{name:'Gepard SPAAG'},tank:{name:'Leopard 2A8'},arty:{name:'CAESAR Howitzer',rng:450},heli:{name:'Tiger Attack Helo'},jet:{name:'Eurofighter Typhoon'},boat:{name:'Combattante Patrol Boat'},ship:{name:'FREMM Frigate'}},
    {name:'Storm Shadow Salvo',charge:150,n:4,dmg:685,r:80,spread:110},'network'),
  UA:F_('UA','Ukraine','#ffd447','uk-UA','slavic','Drone war & resilience: FPV drones are cheap and build fast, Sea Baby drone boats hit 40% harder, units repair themselves out of combat, forces cost 4% less.',{regen:3,cost:.96},'hacker',
    {inf:{name:'Infantry Squad'},at:{name:'Stugna-P Team'},hacker:{name:'IT Army Cyber Team'},drone:{name:'FPV Strike Drone',cost:250},aa:{name:'Gepard SPAAG'},tank:{name:'T-84 Oplot'},arty:{name:'Bohdana Howitzer'},heli:{name:'Mi-24 Hind'},jet:{name:'F-16 Fighting Falcon'},boat:{name:'Sea Baby Drone Boat'},ship:{name:'Hetman Sahaidachny Frigate'}},
    {name:'Neptune Missile Salvo',charge:150,n:3,dmg:650,r:95,spread:110},'salvage',{extra:['drone']}),
  RU:F_('RU','Russia','#c9d1da','ru-RU','slavic','Heavy armor & massed artillery: vehicles have 45% more hit points, artillery is tougher and hits 15% harder. TOS-1A burns everything nearby.',{vehHp:1.45},'hacker',
    {inf:{name:'Motor Rifle Squad'},at:{name:'Kornet Team'},hacker:{name:'GRU Cyber Unit'},aa:{name:'Pantsir-S1'},tank:{name:'T-90M'},arty:{name:'TOS-1A',rng:280,minr:50,splash:95,dmg:66,rof:3.5,rocket:true},heli:{name:'Ka-52 Alligator'},jet:{name:'Su-34 Fullback'},boat:{name:'Raptor Patrol Boat'},ship:{name:'Admiral Gorshkov Frigate'}},
    {name:'Iskander Strike',charge:160,n:2,dmg:555,r:130,spread:90},'reactive'),
  IR:F_('IR','Iran','#3fae5c','fa-IR','mideast','Missiles & cheap drones: Shahed drones cost 25% less and build almost twice as fast, Fateh missile launchers fire 12% farther and hit 15% harder, the Kheibar barrage charges faster.',{infCost:1},'hacker',
    {inf:{name:'Basij Militia',hp:110},at:{name:'Anti-Tank Cell'},hacker:{name:'IRGC Cyber Team'},drone:{name:'Shahed-136'},aa:{name:'Mesbah AA Gun'},tank:{name:'Karrar Tank',hp:580},arty:{name:'Fateh-110 Launcher',rng:470,splash:65,rocket:true},heli:{name:'AH-1J Cobra'},jet:{name:'F-14 Tomcat'},boat:{name:'Seraj Fast Attack Craft',spd:110},ship:{name:'Moudge Frigate'}},
    {name:'Kheibar Missile Strike',charge:130,n:12,dmg:335,r:75,spread:200},'thermo',{extra:['drone']}),
  SA:F_('SA','Saudi Arabia','#1f9a54','ar-SA','mideast','Petro wealth & air force: oil pays 40% more, supply trucks carry 10% more, F-15SA jets cost 25% less and are tougher, air defense reaches 20% farther, all units cost 17% less.',{oil:1.4,harv:1.1,cost:.83},'hero',
    {inf:{name:'Royal Land Forces Squad'},at:{name:'Anti-Tank Missile Team'},hero:{name:'Special Forces Sniper',rng:330,dmg:150,rof:2.2},aa:{name:'Shahine Anti-Air Vehicle'},tank:{name:'M1A2S Abrams'},arty:{name:'CAESAR Howitzer'},heli:{name:'AH-64 Apache'},jet:{name:'F-15SA Eagle'},boat:{name:'Fast Patrol Boat'},ship:{name:'Al Riyadh Frigate'}},
    {name:'Royal Air Strike',charge:150,n:5,dmg:625,r:75,spread:130},'awacs'),
  AE:F_('AE','United Arab Emirates','#b49a5e','ar-AE','mideast','High-tech wealth: weapons deal 25% more damage, units cost 5% less, oil pays 25% more, supply trucks carry 10% more, Pantsir air defense and Apaches hit 15% harder.',{dmg:1.25,cost:.95,oil:1.25,harv:1.1},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Javelin Team'},hero:{name:'Presidential Guard Commando',demo:true},aa:{name:'Pantsir-S1E'},tank:{name:'Leclerc Tank'},arty:{name:'G6 Rhino Howitzer'},heli:{name:'AH-64 Apache'},jet:{name:'Rafale'},boat:{name:'Ghannatha Patrol Boat'},ship:{name:'Baynunah Corvette'}},
    {name:'Precision Air Strike',charge:145,n:4,dmg:755,r:75,spread:110},'contracts'),
  PK:F_('PK','Pakistan','#2f8f3a','ur-PK','southasia','Hardened forces & tank hunters: infantry cost 28% less, vehicles have 30% more hit points, anti-tank teams hit 20% harder.',{infCost:.72,vehHp:1.3},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Baktar-Shikan Team'},hero:{name:'SSG Commando',demo:true},aa:{name:'Type 87 AA Gun'},tank:{name:'Al-Khalid Tank'},arty:{name:'SH-15 Howitzer'},heli:{name:'AH-1Z Viper'},jet:{name:'JF-17 Thunder'},boat:{name:'Jalalat Missile Boat'},ship:{name:'Tughril Frigate'}},
    {name:'Shaheen Missile Strike',charge:165,n:1,dmg:710,r:165,spread:0},'tankhunt'),
  IN:F_('IN','India','#ff9933','hi-IN','southasia','Massive army & BrahMos navy: everything costs 11% less, units are 5% tougher, warships have 25% more hit points.',{cost:.89,hp:1.05},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Nag Missile Team'},hero:{name:'MARCOS Commando',demo:true},aa:{name:'Tunguska SPAAG'},tank:{name:'Arjun Tank'},arty:{name:'Pinaka Rockets',rocket:true,splash:70,dmg:60,rof:3.2},heli:{name:'HAL Prachand'},jet:{name:'Tejas Fighter'},boat:{name:'Veer Missile Boat'},ship:{name:'Kolkata Destroyer'}},
    {name:'BrahMos Salvo',charge:155,n:3,dmg:670,r:95,spread:100},'coldstart'),
  CN:F_('CN','China','#e3493a','zh-CN','eastasia','Mass mobilization & blue-water navy: infantry cost 42% less and train 40% faster, everything else costs 5% less, warships are 30% tougher and hit 15% harder, rocket artillery hits 10% harder.',{infCost:.58,infTime:.6,cost:.95},'hacker',
    {inf:{name:'PLA Rifle Squad'},at:{name:'HJ-12 Team'},hacker:{name:'PLA Cyber Team'},aa:{name:'PGZ-09 SPAAG'},tank:{name:'Type 99A',hp:660},arty:{name:'PHL-03 Rockets',splash:72,dmg:58,rof:3.2,rocket:true},heli:{name:'Z-10 Attack Helo'},jet:{name:'J-20 Fighter'},boat:{name:'Type 022 Missile Boat'},ship:{name:'Type 055 Destroyer'}},
    {name:'DF-21 Strike',charge:170,n:1,dmg:780,r:160,spread:0},'nationalism'),
  KP:F_('KP','North Korea','#c8418f','ko-KR','eastasia','Numbers & artillery: everything costs 20% less but units have 10% fewer hit points; Koksan guns cost 20% less and fire 10% farther.',{cost:.8,hp:.9},'hacker',
    {inf:{name:'KPA Conscripts'},at:{name:'Bulsae Team'},hacker:{name:'Bureau 121 Hackers'},aa:{name:'M1992 SPAAG'},tank:{name:'Chonma-216'},arty:{name:'Koksan Gun',rng:520,rof:5,dmg:88},heli:{name:'Mi-24 Hind'},jet:{name:'MiG-29 Fulcrum'},boat:{name:'Nampo Patrol Boat'},ship:{name:'Najin Frigate'}},
    {name:'Hwasong Strike',charge:220,n:1,dmg:535,r:220,spread:0},'conscript'),
  KR:F_('KR','South Korea','#7a68e0','ko-KR','eastasia','High technology: sensors see 15% farther, weapons deal 5% more damage, units self-repair, K9 guns reload 20% faster, Defense Guns reach 15% farther.',{dmg:1.05,regen:3,sight:1.15},'hero',
    {inf:{name:'ROK Infantry Squad'},at:{name:'Hyungung Team'},hero:{name:'707th Commando',demo:true},aa:{name:'K30 Biho SPAAG'},tank:{name:'K2 Black Panther'},arty:{name:'K9 Thunder'},heli:{name:'AH-64 Apache'},jet:{name:'KF-21 Boramae'},boat:{name:'Gumdoksuri Patrol Boat'},ship:{name:'Sejong the Great Destroyer'}},
    {name:'Hyunmoo Strike',charge:160,n:2,dmg:600,r:125,spread:80},'k2fcs'),
  EG:F_('EG','Egypt','#c9a227','ar-EG','mideast','Large army & armored corps: infantry cost 30% less and train faster, Abrams tanks cost 22% less.',{infCost:.7,infTime:.8},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Kornet Team'},hero:{name:'Unit 777 Commando',demo:true},aa:{name:'ZSU-23-4 Shilka'},tank:{name:'M1A1 Abrams'},arty:{name:'K9 Thunder'},heli:{name:'Ka-52 Alligator'},jet:{name:'Rafale'},boat:{name:'Ramadan Missile Boat'},ship:{name:'Tahya Misr Frigate'}},
    {name:'Air Strike',charge:150,n:5,dmg:720,r:70,spread:130},'crews'),
  CU:F_('CU','Cuba','#2b59c3','es-CU','latin','Revolutionary fervor: everything costs 20% less but units have 10% fewer hit points; Grad rockets cost 20% less.',{cost:.8,hp:.9},'hacker',
    {inf:{name:'Revolutionary Infantry'},at:{name:'Anti-Tank Team'},hacker:{name:'Cyber Brigade'},aa:{name:'ZSU-23-4 Shilka'},tank:{name:'T-62 Tank'},arty:{name:'BM-21 Grad',rocket:true,splash:70,dmg:55,rof:3},heli:{name:'Mi-24 Hind'},jet:{name:'MiG-29 Fulcrum'},boat:{name:'Osa Missile Boat'},ship:{name:'Koni Frigate'}},
    {name:'Missile Bombardment',charge:160,n:6,dmg:490,r:80,spread:160},'guerrilla'),
  RS:F_('RS','Lebanese Shia','#b3262c','ar-LB','mideast','The Lebanese mountain Shia resistance: stone villages of Bint Jbeil and the Bekaa, Ashura banners and Ya Hussein walls, rocket barrages, cheap strong drones, ATGM ambush teams, tunnels and mountain forts. Longer-ranged rockets that fire faster, far stronger Defense Guns and tunnels, infantry that dig in (30% less damage holding position). No air force or navy.',{cost:1,dugIn:.7},'hacker',
    Object.assign(MIL_UNITS({inf:'Mountain Guard',boat:'Fast Attack Skiff'}),{inf:{name:'Mountain Guard',hp:150},at:{name:'Mountain Anti-Tank Team',hp:140,rng:205},hacker:{name:'Signal Jammers'},
      drone:{name:'Shahed-136',cost:225,hp:100,spd:135,dmg:260,splash:72},arty:{name:'Medium Rocket Launcher',rocket:true,hp:260,rng:470,minr:90,dmg:68,splash:66,rof:3.2,cost:750,time:10}}),
    {name:'Mountain Rocket Storm',charge:150,n:14,dmg:300,r:65,spread:230},'bunkers',{extra:['drone'],noAir:true,noShip:true,militia:true}),
  DW:F_('DW','Zaidi Shia Movement','#c8a46e','ar-YE','mideast','Yemeni highland raiders: tower-house towns of Sana\'a and the Sarawat, coffee terraces and Red Sea coast. Tough, fast armed technicals and long-range rocket trucks that outrange enemy artillery. Units move 13% faster and cost 8% less. No air force.',{spd:1.13,cost:.92},'hero',
    Object.assign(MIL_UNITS({inf:'Wolf Raiders',boat:'Raider Speedboat'}),{hero:{name:'Ghost Raider',demo:true},
      tank:{name:'Raider Technical',hp:370,spd:96,dmg:26,rof:.28,wpn:'gun',aa:1,cost:500,time:5},aa:{name:'ZU-23 Technical',hp:320,cost:400,spd:90},
      arty:{name:'Long-Range Rocket Truck',rocket:true,hp:280,rng:620,minr:120,dmg:74,splash:72,rof:4.2,cost:900,time:11}}),
    {name:'Long-Range Rocket Salvo',charge:140,n:14,dmg:305,r:62,spread:230},'camo',{noAir:true,noShip:true,militia:true}),
};
// Each nation's special unit is its own: what it is and what it does (see SPECIAL_TIP).
const SPEC={US:['hero',{name:'Delta Operator',mark:1}],TR:['mortar',{name:'Kale Mortar Team',droneSpot:1}],IL:['idome',{}],EU:['atgm',{}],UA:['recon',{name:'Aerorozvidka Drone Team'}],RU:['ew',{name:'Krasukha EW Truck'}],
  IR:['officer',{name:'IRGC Field Commander'}],SA:['jeep',{name:'Royal Recon Patrol',airSpot:1}],AE:['sapper',{name:'Combat Engineers'}],PK:['atk',{name:'SSG Tank Hunters',finisher:1}],IN:['medic',{name:'Army Medical Corps Team',revive:1}],
  CN:['commissar',{name:'PLA Political Commissar'}],KP:['hacker',{}],KR:['cbr',{name:'K-Counter-Battery Radar'}],EG:['saka',{}],CU:['guer',{name:'Guerrilla Ambush Squad'}],
  RS:['mortar',{name:'Mountain Rocket Team',rocket:true,rng:360,dmg:13.5,rof:4.2,splash:46,ripple:4,camo:1}],DW:['raidlead',{}]};
for(const k in SPEC){const F=FACTIONS[k];if(!F)continue;const [kind,o]=SPEC[k];F.special=kind;F.units=F.units||{};F.units[kind]=Object.assign({},F.units[kind]||{},o);}
// HERO SQUADS (Abdullah 2026-11-04): one elite squad per nation ('champ' kind, Barracks), max one alive, 150 s wait after it falls,
// unlocked by General rank (HERO_RANK), same cost and same ability cooldown for every nation. Each has ONE button ability (HAB).
const HERO_RANK=3,HERO_REBUY=150,HERO_CD=90;
const HAB={strike:{n:'Precision strike',d:'Calls three precision shells on the nearest enemy group in 500 m.'},demo:{n:'Plant charges',d:'Blows up the nearest enemy building within 150 m after 3 seconds (a third of its health).'},rally:{n:'Rally the line',d:'Friendly infantry within 300 m heal a quarter, shake off fear and hit 25% harder for 10 seconds.'},recon:{n:'See through the fog',d:'Reveals everything within 520 m for 12 seconds and marks it: your forces do 25% more damage to it.'},ambush:{n:'Ambush',d:'The squad and infantry within 220 m hit double for 8 seconds and take a third less damage.'},cut:{n:'Cut the supply line',d:'Blows up the nearest enemy supply road within 260 m: the enemy line is cut behind it for about two and a half minutes.'}};
const HEROES={US:['Delta Force Operators','strike'],EU:['Special Forces Détachement','strike'],UA:['SSO Special Operators','strike'],KR:['707th Special Mission Team','strike'],
  RU:['Spetsnaz Assault Group','demo'],PK:['SSG Commandos','demo'],CN:['PLA Special Forces','demo'],EG:['Unit 777 Commandos','demo'],
  IR:['IRGC Special Forces','rally'],TR:['Maroon Beret Commandos','rally'],KP:['Storm Corps Veterans','rally'],
  IL:['Sayeret Recon Team','recon'],SA:['Royal Special Forces','recon'],AE:['Presidential Guard SF','recon'],
  RS:['Radwan Commander Squad','ambush'],CU:['Black Wasps','ambush'],IN:['Para SF Commandos','ambush'],
  DW:['Veteran Militia Commander','cut']};
for(const k in HEROES){const F=FACTIONS[k];if(!F)continue;F.units=F.units||{};F.units.champ=Object.assign({},F.units.champ||{},{name:HEROES[k][0],hab:HEROES[k][1]});}
// Electronic warfare beyond RU: nations with a real EW arm can also build the jamming/spoof truck from the War Factory (same stats, max 2, General rank gate in the UI).
for(const [k,nm] of [['US','AN/ULQ EW Vehicle'],['CN','PLA EW Jamming Truck'],['IR','IRGC EW Truck'],['IL','IDF EW Truck']]){const F=FACTIONS[k];if(!F||F.special==='ew')continue;F.extra=[...(F.extra||[]),'ew'];F.units=F.units||{};F.units.ew=Object.assign({},F.units.ew||{},{name:nm});}
const SPECIAL_TIP={atgm:()=>'Long-range wire-guided anti-tank missiles: outranges tanks, but thin-skinned. Keep it behind your armor.',saka:()=>'Elite fast-moving commandos with grenades that hurt clustered infantry and garrisons.',hero:u=>u.mark?'Stealthed commando. Plants charges on buildings, and every target it hits is laser-marked: all your forces do 25% more damage to it for 6 seconds.':u.demo?'Stealthed commando. Right-click an enemy building to plant explosives.':'Stealthed sniper. Picks off infantry from very long range.',
  mortar:u=>u.ripple?'Hidden rocket launchers: fire a ripple of 4 rockets that blankets an area, then reload. Hide when standing still. Cannot fire at close range.':u.droneSpot?'Indirect fire from long range, devastating against infantry in the open. Drone-guided: 40% more range against targets a friendly drone can see. Cannot fire at close range.':'Indirect fire from long range: devastating against infantry in the open. Cannot fire at close range.',recon:u=>'Unarmed, hides when still. Sees 520 meters and marks every enemy near it: your forces do 25% more damage to marked targets.',
  officer:u=>'Nearby infantry do 20% more damage and can\'t be suppressed.',medic:u=>'Heals nearby infantry, and kneels beside wounded soldiers (red-cross icon, 32 s before they bleed out) to get them back on their feet in 4 seconds with their veterancy. '+(u.revive?'Also heals vehicles, and about a third of infantry killed by blasts near the medics return 8 seconds later.':'Also heals nearby vehicles.'),commissar:u=>'Nearby infantry fire 25% faster and can\'t be suppressed.',
  sapper:u=>'Lays hidden anti-tank mines when standing still (up to 8). Enemy vehicles that drive over them are badly damaged.',guer:u=>'Hides when standing still; the first volley from hiding does double damage.',
  atk:u=>u.finisher?'Long-range anti-tank team that hides when standing still. Tank hunters: 40% more damage to vehicles already below half health.':'Long-range anti-tank team that hides when standing still.',idome:u=>'Shoots down incoming shells, rockets and missiles: friendly units and buildings nearby take 55% less damage from them.',
  ew:u=>'Jams drones and guided weapons: nearby enemy drones burn out and aircraft and missiles do half damage to your units nearby. Enemies near it lose their minimap there. Radar spoof (button): fake attackers on enemy radar for 20 s.',cbr:u=>'Any enemy artillery or rocket launcher that fires anywhere on the map is revealed to you for 10 seconds.',
  jeep:u=>u.airSpot?'Fast recon patrol with long sight that guides the air force: enemies it can see take 30% more damage from your aircraft.':'Fast recon patrol with long sight.',raidlead:u=>'Nearby vehicles move 20% faster and do 20% more damage.',hacker:u=>'Disables enemy buildings; earns cash when idle.'};
// Tunnel warfare: these factions can dig hidden Tunnel Networks. Units sent into any tunnel heal and can come out of any other.
// ---- NEW NATIONS (nations-new1, Abdullah 2026-11-05 19:44): Iraq (IQ) and Syria (SY), national armed forces only. Built from Egypt's
// complete table set (equal power per tier) with their own names, markings and flavour; the per-table copies happen in NAT_CLONE_TABLES below.
const NEWNAT={
 IQ:{base:'EG',name:'Iraq',color:'#3f7d4c',lang:'ar-IQ',doctrine:'Iraqi Army, two rivers & federal police: infantry cost 20% less and train faster, M1 Abrams tanks cost 15% less, and units fight 10% harder defending their own cities and the rivers.',mods:{infCost:.8,infTime:.85},
  units:{inf:'Iraqi Army Squad',at:'Kornet Team',hero:'Golden Division Commando',aa:'Pantsir-S1',tank:'M1A1M Abrams',arty:'M109 Howitzer',heli:'Mi-28NE Havoc',jet:'F-16IQ Falcon',boat:'Shatt al-Arab River Boat',ship:'Ibn Khaldoun Patrol Ship'},
  sup:{name:'Marsh Smoke',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Iraqi Army Drone Team'}],hero:['Golden Division Assault Team','demo'],
  doct:{name:'Defense of the Two Rivers',homeland:1,shock:1},
  pow:{name:'Reconstruction Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Oil Revenue Share'},recon:{name:'Tigris Watch',rm:.95},para:{name:'Air Assault Battalion'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Baghdad Depot Repair',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Golden Division Course','Federal Police Kit','Abrams Crew Training','Two Rivers Artillery','F-16 Integration','Havoc Maintenance','Basra Oil Revenue','Defense of the Cradle','River Patrol Refit']},
 SY:{base:'EG',name:'Syria',color:'#a8352f',lang:'ar-SY',doctrine:'Syrian Arab Army, hardened defense: units are 8% tougher in vehicles, tanks and rocket artillery cost 12% less, and troops ambush hard from cover on their own ground (Levantine mountains, coast and plains).',mods:{vehHp:1.08,cost:.96},
  units:{inf:'Syrian Army Squad',at:'Konkurs Team',hero:'Republican Guard Commando',aa:'ZSU-23-4 Shilka',tank:'T-72 Tank',arty:'2S1 Gvozdika',heli:'Mi-24 Hind',jet:'MiG-29 Fulcrum',boat:'Latakia Fast Attack Craft',ship:'Petya Corvette'},
  sup:{name:'Missile Battery Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['saka',{name:'Republican Guard Assault Squad'}],hero:['Special Forces Regiment','demo'],
  doct:{name:'Hardened Defense',homeland:1,ambush:1},
  pow:{name:'Air Defense Umbrella',type:'shield',cd:200,r:280,desc:'Your forces in the area take 60% less damage for 20s'},
  gp:{bounty:{name:'Spoils of Victory'},recon:{name:'Mountain Observation Posts',rm:.95},para:{name:'Heliborne Assault'},barrage:{name:'Fire Support Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Conscript Kit','Tank Crew Training','Gvozdika Fire Control','MiG Overhaul','Hind Maintenance','Levant Trade Revenue','Hardened Defense Doctrine','Coastal Patrol Refit']}};
// ---- nations-anglo (Abdullah 2026-11-05 19:49): UK (GB), Australia (AU), Canada (CA): same NEWNAT mechanism/Egypt base as IQ/SY (equal power per tier).
Object.assign(NEWNAT,{
 GB:{base:'EG',name:'United Kingdom',color:'#c8102e',lang:'en-GB',doctrine:'British Armed Forces, combined arms: infantry train 15% faster and cost 10% less, Challenger tanks cost 10% less, and units fight 10% harder on home ground.',mods:{infCost:.9,infTime:.85},
  units:{inf:'Rifle Section',at:'Javelin Team',hero:'SAS Troopers',aa:'Sky Sabre Launcher',tank:'Challenger 3',arty:'AS-90 Braveheart',heli:'AH-64E Apache',jet:'Eurofighter Typhoon',boat:'Archer-class Patrol Boat',ship:'Type 45 Destroyer'},
  sup:{name:'Typhoon Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Royal Marines Recon Troop'}],hero:['Special Air Service','demo'],
  doct:{name:'Combined Arms',homeland:1},
  pow:{name:'Royal Engineers Resupply',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Defense Exports'},recon:{name:'Intelligence Sweep',rm:.95},para:{name:'Parachute Regiment Drop'},barrage:{name:'Gunner Barrage',nm:1.1,cdm:1.05},repair:{name:'REME Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','MTP Combat Kit','Challenger Crew Training','Braveheart Fire Control','Typhoon Upgrade','Apache Maintenance','City of London Revenue','Special Relationship','Fleet Refit'],
  uplink:'Storm Shadow Launch Center',econ:'City of London Trading Floor',sub:'Astute-class Submarine',md:'Sky Sabre Battery',coast:'Harpoon Coastal Battery',trn:['Landing Craft Utility','Chinook HC6']},
 AU:{base:'EG',name:'Australia',color:'#00843d',lang:'en-AU',doctrine:'Australian Defence Force, bush and coast: infantry cost 10% less, sea and air assets cost 3% less, and units fight 10% harder on their home ground.',mods:{infCost:.9,cost:.97},
  units:{inf:'Digger Section',at:'Javelin Team',hero:'SASR Operators',aa:'NASAMS Launcher',tank:'M1A2 Abrams SEPv3',arty:'M777 Howitzer',heli:'AH-64E Apache',jet:'F-35A Lightning II',boat:'Armidale Patrol Boat',ship:'Hobart-class Destroyer'},
  sup:{name:'Lightning Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Commando Recon Patrol'}],hero:['4th Commando Regiment','demo'],
  doct:{name:'Defense of Australia',homeland:1},
  pow:{name:'Outback Logistics Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Mining Boom'},recon:{name:'Coastwatch Sweep',rm:.95},para:{name:'Airborne Commandos'},barrage:{name:'Gunner Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','AMCU Combat Kit','Abrams Crew Training','M777 Fire Control','F-35 Integration','Tiger Maintenance','Mining Revenue','Defense of the Continent','Collins Refit'],
  uplink:'Strike Missile Command',econ:'Iron Ore Export Terminal',sub:'Collins-class Submarine',md:'NASAMS Battery',coast:'NSM Coastal Battery',trn:['Landing Craft Heavy','CH-47F Chinook']},
 CA:{base:'EG',name:'Canada',color:'#d52b1e',lang:'en-CA',doctrine:'Canadian Armed Forces, northern defense: infantry cost 6% less, cold and forest ground is no hindrance, and units fight 10% harder defending home soil.',mods:{infCost:.94},
  units:{inf:'Infantry Section',at:'Carl Gustaf Team',hero:'JTF2 Operators',aa:'Skyguard Launcher',tank:'Leopard 2A6M',arty:'M777 Howitzer',heli:'CH-146 Griffon',jet:'CF-18 Hornet',boat:'Kingston Patrol Boat',ship:'Halifax-class Frigate'},
  sup:{name:'Hornet Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Canadian Rangers Patrol'}],hero:['Joint Task Force 2','demo'],
  doct:{name:'Defense of the North',homeland:1},
  pow:{name:'Arctic Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Resource Exports'},recon:{name:'Northern Watch',rm:.95},para:{name:'Airborne Regiment Drop'},barrage:{name:'Gunner Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','CADPAT Combat Kit','Leopard Crew Training','M777 Fire Control','CF-18 Upgrade','Griffon Maintenance','Resource Revenue','Defense of the North','Victoria Refit'],
  uplink:'Strike Missile Command',econ:'Oil Sands Export Terminal',sub:'Victoria-class Submarine',md:'NASAMS Battery',coast:'Harpoon Coastal Battery',trn:['Landing Craft Utility','CH-147F Chinook']},
 // nations-frde (Abdullah 2026-11-05 19:49): France and Germany, national armed forces only; both built from the EU row (equal power per tier).
 FR:{base:'EU',name:'France',color:'#2a4fb0',lang:'fr-FR',uplink:'Force Océanique Command (SCALP)',econ:'Marché de Rungis Hub',
  doctrine:'Artillerie & génie: units self-repair, structures have 30% more hit points, all units cost 3% less, CAESAR guns hit 15% harder.',mods:{regen:3,bldHp:1.3,cost:.97},
  units:{inf:'Section d\'Infanterie FELIN',at:'Équipe MMP',hero:'Tireur d\'élite FR-F2',aa:'Crotale NG',tank:'Leclerc XLR',arty:'CAESAR Howitzer',heli:'Tigre HAD',jet:'Rafale F4',boat:'Combattante Patrol Boat',ship:'FREMM Frégate'},
  sup:{name:'SCALP Salvo',charge:150,n:4,dmg:685,r:80,spread:110},
  special:['atgm',{name:'Équipe MMP Longue Portée'}],hero:['Commandos Marine / 13e RDP','strike'],
  doct:{name:'Armée de Terre',homeland:1},
  pow:{name:'Convoi de Ravitaillement',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Fonds de la Défense',m:.9},recon:{name:'Avion AWACS E-3F',rm:1.1,cdm:1.1},para:{name:'Brigade Parachutiste'},barrage:{name:'Feux de Barrage CAESAR'},repair:{name:'Service de Soutien',fx:'rearm',pm:1.1,rm:1.1,cdm:1.1}},
  upg:['Formation Commando','Équipement FELIN','Équipages Leclerc','Artillerie CAESAR','Intégration Rafale','Maintenance Tigre','Recettes Exportation','Doctrine Interarmes','Refonte Patrouille Navale'],
  sub:'Barracuda-class Submarine',md:'SAMP/T Battery',coast:'Exocet MM40 Battery',trn:['LCM Landing Craft','NH90 Caïman']},
 DE:{base:'EU',name:'Germany',color:'#3a3a3a',lang:'de-DE',uplink:'Raketenkommando Nord (Taurus)',econ:'Handelskammer Frankfurt',
  doctrine:'Panzertruppe & Heer: units self-repair, structures have 30% more hit points, all units cost 3% less, PzH 2000 guns hit 15% harder.',mods:{regen:3,bldHp:1.3,cost:.97},
  units:{inf:'Panzergrenadier-Gruppe',at:'MILAN Team',hero:'KSK Scharfschütze',aa:'Skyranger 30',tank:'Leopard 2A7',arty:'PzH 2000 Howitzer',heli:'Tiger UHT',jet:'Eurofighter Typhoon',boat:'Schnellboot Gepard',ship:'F125 Fregatte'},
  sup:{name:'Taurus Salvo',charge:150,n:4,dmg:685,r:80,spread:110},
  special:['atgm',{name:'Jägerzug Panzerabwehr'}],hero:['Kommando Spezialkräfte','strike'],
  doct:{name:'Panzertruppe',homeland:1},
  pow:{name:'Nachschubkonvoi',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Verteidigungsfonds',m:.9},recon:{name:'AWACS Aufklärung',rm:1.1,cdm:1.1},para:{name:'Fallschirmjäger'},barrage:{name:'Artilleriefeuer PzH'},repair:{name:'Logistiktruppe',fx:'rearm',pm:1.1,rm:1.1,cdm:1.1}},
  upg:['Spezialkräfte Ausbildung','Infanterie der Zukunft','Panzerbesatzungen','PzH Feuerleitung','Eurofighter Integration','Tiger Wartung','Exportüberschuss','Führen mit Aufträgen','Marine Modernisierung'],
  sub:'Type 212CD Submarine',md:'IRIS-T SLM Battery',coast:'Naval Strike Missile Battery',trn:['LCM Landing Craft','NH90 Transport']}});
// ---- nations-a2 (Abdullah 2026-11-06): Brazil, Venezuela, Mexico, Argentina, Colombia, Chile, Sweden. National armed forces only; Egypt base (equal power per tier), small cost/hp flavours of equal value.
const NA2=(code,name,color,lang,doc,mods,u,sup,sp,hero,doct,pow,gp,upg,x)=>({base:'EG',name,color,lang,doctrine:doc,mods,units:u,sup:Object.assign({charge:150,n:5,dmg:720,r:70,spread:130},{name:sup}),special:sp,hero,doct:{name:doct,homeland:1},pow:Object.assign({type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},{name:pow}),gp:{bounty:{name:gp[0]},recon:{name:gp[1],rm:.95},para:{name:gp[2]},barrage:{name:gp[3],nm:1.1,cdm:1.05},repair:{name:gp[4],pm:1.2,rm:.9,cdm:1.05}},upg,uplink:x[0],econ:x[1],sub:x[2],md:x[3],coast:x[4],trn:x[5]});
Object.assign(NEWNAT,{
 BR:NA2('BR','Brazil','#009c3b','pt-BR','Brazilian Armed Forces, jungle and coast: infantry cost 8% less, and units fight 10% harder on home ground.',{infCost:.92},
  {inf:'Pelotão de Fuzileiros',at:'Equipe Spike',hero:'Comandos Anfíbios',aa:'Gepard Brasileiro',tank:'Leopard 1A5BR',arty:'ASTROS II Launcher',heli:'AH-2 Sabre',jet:'Gripen E',boat:'Ronda Patrol Boat',ship:'Tamandaré-class Frigate'},
  'ASTROS Saturation Salvo',['recon',{name:'Patrulha de Selva'}],['Comandos Anfíbios (GRUMEC)','demo'],'Defesa da Amazônia','Comboio Amazônico',['Exportação Agrícola','Vigilância SIVAM','Brigada Paraquedista','Salva de Artilharia','Oficina de Campanha'],
  ['Curso de Comandos','Uniforme Pixelado','Treino Guarani','Controle de Fogo ASTROS','Integração Gripen','Manutenção Sabre','Receita de Commodities','Doutrina Amazônica','Modernização Naval'],
  ['Centro de Mísseis Avibras','Bolsa de Mercadorias de São Paulo','Riachuelo-class Submarine','Matador Battery','AV-MTC Coastal Battery',['Landing Craft Utility','H-36 Caracal']]),
 VE:NA2('VE','Venezuela','#cf142b','es-VE','Bolivarian Armed Forces, regular army: vehicles are 8% tougher, everything costs 2% less, and units fight 10% harder on home ground.',{vehHp:1.08,cost:.98},
  {inf:'Escuadra de Infantería',at:'Equipo Konkurs',hero:'Fuerzas Especiales',aa:'S-300VM Launcher',tank:'T-72B1V',arty:'Smerch Rocket Launcher',heli:'Mi-35M',jet:'Su-30MK2',boat:'Peykan Patrol Boat',ship:'Mariscal Sucre Frigate'},
  'Smerch Salvo',['recon',{name:'Patrulla de Reconocimiento'}],['Comando de Fuerzas Especiales','demo'],'Defensa de la Patria','Convoy de Abastecimiento',['Exportación Petrolera','Vigilancia Costera','Batallón Aerotransportado','Fuego de Artillería','Talleres de Campaña'],
  ['Curso de Comandos','Equipo de Combate','Entrenamiento Blindado','Control de Fuego Smerch','Integración Flanker','Mantenimiento Mi-35','Renta Petrolera','Doctrina de Defensa','Reparación Naval'],
  ['Comando de Misiles','Terminal Petrolera de Maracaibo','Type 209 Submarine','S-300VM Battery','C-802 Coastal Battery',['Landing Craft Utility','Mi-17 Transport']]),
 MX:NA2('MX','Mexico','#006847','es-MX','Mexican Armed Forces, army and marines: infantry cost 8% less and train 10% faster, and units fight 10% harder defending their own soil.',{infCost:.92,infTime:.9},
  {inf:'Escuadra de Infantería',at:'Equipo Spike',hero:'Fuerzas Especiales',aa:'Mistral Launcher',tank:'ERC-90 Lynx',arty:'M101 Howitzer',heli:'UH-60M Black Hawk',jet:'F-5E Tiger II',boat:'Oaxaca Patrol Boat',ship:'Reformador Frigate'},
  'Artillery Fire Mission',['recon',{name:'Patrulla de Infantería de Marina'}],['Fuerzas Especiales (GAFE)','demo'],'Defensa de la Soberanía','Plan DN-III Convoy',['Exportación Manufacturera','Vigilancia Aérea','Brigada Paracaidista','Fuego de Artillería','Talleres de Campaña'],
  ['Curso de Comandos','Equipo de Combate','Entrenamiento Blindado','Control de Fuego','Integración Aérea','Mantenimiento Black Hawk','Remesas y Comercio','Doctrina de Soberanía','Reparación Naval'],
  ['Mando de Misiles','Bolsa de Monterrey','Marine Patrol Submarine','NASAMS Battery','Costa Missile Battery',['Landing Craft Utility','Mi-17 Transport']]),
 AR:NA2('AR','Argentina','#74acdf','es-AR','Argentine Armed Forces, mountain and plains: infantry cost 6% less, and units fight 10% harder on home ground.',{infCost:.94},
  {inf:'Sección de Infantería',at:'Equipo Javelin',hero:'Tropas de Montaña',aa:'Skyguard Launcher',tank:'TAM 2C',arty:'CITER 155 Howitzer',heli:'AW109 Helicopter',jet:'F-16AM Fighting Falcon',boat:'Zurubí Patrol Boat',ship:'MEKO 360 Destroyer'},
  'Misiles de Crucero',['recon',{name:'Patrulla de Cazadores de Montaña'}],['Comandos de Montaña','demo'],'Defensa del Sur','Convoy Patagónico',['Exportación Agropecuaria','Vigilancia del Atlántico Sur','Brigada Paracaidista','Fuego de Artillería','Talleres de Campaña'],
  ['Curso de Comandos','Equipo de Montaña','Entrenamiento TAM','Control de Fuego CITER','Integración Aérea','Mantenimiento de Helicópteros','Renta Agroexportadora','Doctrina Andina','Reparación Naval'],
  ['Comando de Misiles','Bolsa de Cereales de Rosario','TR-1700 Submarine','Roland Battery','Exocet Coastal Battery',['Landing Craft Utility','Bell 212 Transport']]),
 CO:NA2('CO','Colombia','#fcd116','es-CO','Colombian Armed Forces, jungle and mountain: infantry cost 4% less, and units fight 10% harder on home ground.',{infCost:.96},
  {inf:'Escuadra de Infantería',at:'Equipo Spike',hero:'Fuerzas Especiales Antiterroristas',aa:'Mistral Launcher',tank:'LAV-300 Fire Support',arty:'Soltam M-71 Howitzer',heli:'AH-60L Arpía IV',jet:'Kfir C.10',boat:'Río Patrol Boat',ship:'Almirante Padilla Frigate'},
  'Fuego de Apoyo Aéreo',['recon',{name:'Patrulla de Selva'}],['Fuerzas Especiales (CCOES)','demo'],'Defensa de la Nación','Convoy Andino',['Exportación de Café y Petróleo','Vigilancia Fronteriza','Brigada Aerotransportada','Fuego de Artillería','Talleres de Campaña'],
  ['Curso de Comandos','Equipo de Selva','Entrenamiento Blindado','Control de Fuego','Integración Kfir','Mantenimiento Arpía','Renta Cafetera','Doctrina de Selva','Reparación Fluvial'],
  ['Comando de Misiles','Bolsa de Valores de Bogotá','Type 209/1200 Submarine','Mistral Battery','Harpoon Coastal Battery',['River Landing Craft','UH-60 Transport']]),
 CL:NA2('CL','Chile','#d52b1e','es-CL','Chilean Armed Forces, Andes and coast: everything costs 2% less, vehicles are 4% tougher, and units fight 10% harder on home ground.',{cost:.98,vehHp:1.04},
  {inf:'Sección de Infantería',at:'Equipo Spike',hero:'Comandos de Montaña',aa:'Mistral Launcher',tank:'Leopard 2A4CHL',arty:'M109A3 Howitzer',heli:'Cougar Helicopter',jet:'F-16C Fighting Falcon',boat:'Piloto Pardo Patrol Boat',ship:'Type 23 Frigate'},
  'Fuego de Artillería Pesada',['recon',{name:'Patrulla de Andinos'}],['Comandos del Ejército','demo'],'Defensa de la Cordillera','Convoy Andino',['Exportación de Cobre','Vigilancia del Pacífico','Brigada Paracaidista','Fuego de Artillería','Talleres de Campaña'],
  ['Curso de Comandos','Equipo de Montaña','Entrenamiento Leopard','Control de Fuego','Integración F-16','Mantenimiento Cougar','Renta del Cobre','Doctrina Andina','Reparación Naval'],
  ['Comando de Misiles','Bolsa de Santiago','Scorpène Submarine','Mistral Battery','Exocet Coastal Battery',['Landing Craft Utility','Cougar Transport']]),
 SE:NA2('SE','Sweden','#006aa7','sv-SE','Swedish Armed Forces, total defense: structures have 10% more hit points, everything costs 2% less, and units fight 10% harder on home ground.',{bldHp:1.1,cost:.98},
  {inf:'Skyttegrupp',at:'Carl-Gustaf Team',hero:'Särskilda Skyddsgruppen',aa:'Luftvärnskanonvagn 90',tank:'Stridsvagn 122',arty:'Archer Howitzer',heli:'HKP 14 NH90',jet:'JAS 39E Gripen',boat:'Combat Boat 90',ship:'Visby-class Corvette'},
  'Robot 15 Salvo',['recon',{name:'Jägarpluton'}],['Särskilda Operationsgruppen','demo'],'Totalförsvaret','Försörjningskonvoj',['Exportintäkter','Signalspaning','Fallskärmsjägare','Artillerield','Verkstadstropp'],
  ['Jägarutbildning','Stridsutrustning','Strv 122 Besättning','Archer Eldledning','Gripen Integration','HKP Underhåll','Exportintäkt','Totalförsvarsdoktrin','Marinmodernisering'],
  ['Robotkommando','Stockholmsbörsen','Gotland-class Submarine','IRIS-T SLS Battery','RBS-15 Coastal Battery',['Landing Craft 90','HKP 4 Transport']])});
// ---- nations-a1 (Abdullah 2026-11-05 19:49/19:56/20:37): Poland, Azerbaijan, Jordan, Kurdistan Region, Italy, Greece, Spain - national armed forces only,
// same NEWNAT mechanism / Egypt base (equal power per tier). Voices/anthems stand in on the closest existing sets until the voices batch.
Object.assign(NEWNAT,{
 PL:{base:'EG',name:'Poland',color:'#dc143c',lang:'pl-PL',doctrine:'Polish Armed Forces, eastern shield: everything costs 3% less, infantry train 10% faster, and troops dig in and fight hard on their own ground.',mods:{infTime:.9,cost:.97},
  units:{inf:'Zmechanizowany Squad',at:'Spike Team',hero:'GROM Operators',aa:'Pilica+ Launcher',tank:'K2PL Black Panther',arty:'Krab Howitzer',heli:'AH-64E Apache',jet:'F-35A Husarz',boat:'Kormoran Patrol Boat',ship:'Miecznik Frigate'},
  sup:{name:'Homar-K Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Rosomak Recon Patrol'}],hero:['GROM Special Forces','demo'],
  doct:{name:'Eastern Shield',homeland:1},
  pow:{name:'Rail Logistics Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Defense Bonds'},recon:{name:'Eastern Watch',rm:.95},para:{name:'6th Airborne Brigade Drop'},barrage:{name:'Krab Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Pixel Camo Kit','Black Panther Crews','Krab Fire Control','F-35 Integration','Apache Maintenance','Baltic Trade Revenue','Eastern Shield Doctrine','Baltic Fleet Refit'],
  uplink:'Homar-K Rocket Command',econ:'Gdansk Port Authority',sub:'Orka-class Submarine',md:'Wisla Battery',coast:'NSM Coastal Battery',trn:['Landing Craft','Black Hawk Transport']},
 AZ:{base:'EG',name:'Azerbaijan',color:'#00b5e2',lang:'az-AZ',doctrine:'Azerbaijani Armed Forces, drones and rockets: infantry cost 6% less, all weapons hit 2% harder, and troops fight hard defending home ground.',mods:{infCost:.94,dmg:1.02},
  units:{inf:'Motorized Rifle Squad',at:'Spike-LR Team',hero:'Special Forces Commandos',aa:'Barak-8 Launcher',tank:'T-90S Tank',arty:'Polonez Rocket Launcher',heli:'Mi-35M Hind',jet:'Su-25 Frogfoot',boat:'Caspian Patrol Boat',ship:'Caspian Corvette'},
  sup:{name:'Polonez Rocket Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Drone Reconnaissance Team'}],hero:['Special Forces Regiment','demo'],
  doct:{name:'Drone and Rocket Doctrine',homeland:1},
  pow:{name:'Caspian Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Energy Revenue'},recon:{name:'Drone Overwatch',rm:.95},para:{name:'Air Assault Battalion'},barrage:{name:'Rocket Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','Digital Camo Kit','T-90 Crew Training','Rocket Fire Control','Su-25 Overhaul','Hind Maintenance','Caspian Energy Revenue','Defense of the Homeland','Caspian Flotilla Refit'],
  uplink:'Rocket Forces Command',econ:'Baku Oil Terminal',sub:'Caspian Midget Submarine',md:'Barak-8 Battery',coast:'Caspian Coastal Battery',trn:['Caspian Landing Craft','Mi-17 Transport']},
 JO:{base:'EG',name:'Jordan',color:'#007a3d',lang:'ar-JO',doctrine:'Jordan Armed Forces, desert guard: infantry cost 10% less and train 10% faster, and troops fight hard defending their own desert and borders.',mods:{infCost:.9,infTime:.9},
  units:{inf:'Arab Army Squad',at:'Anti-Tank Missile Team',hero:'Special Forces Commandos',aa:'Hawk Launcher',tank:'Al-Hussein Tank',arty:'M109 Howitzer',heli:'AH-1F Cobra',jet:'F-16AM Falcon',boat:'Aqaba Patrol Boat',ship:'Aqaba Patrol Ship'},
  sup:{name:'Border Guard Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Desert Patrol Troop'}],hero:['Royal Special Forces','demo'],
  doct:{name:'Desert Guard',homeland:1},
  pow:{name:'Desert Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Phosphate Exports'},recon:{name:'Border Watch',rm:.95},para:{name:'Royal Rapid Deployment'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Desert Camo Kit','Tank Crew Training','Howitzer Fire Control','F-16 Integration','Cobra Maintenance','Dead Sea Revenue','Defense of the Kingdom','Aqaba Patrol Refit'],
  uplink:'Rocket Command (Aqaba)',econ:'Aqaba Port Authority',sub:'Coastal Midget Submarine',md:'Hawk Battery',coast:'Coastal Battery',trn:['Landing Craft','UH-60 Black Hawk']},
 KD:{base:'EG',name:'Kurdistan Region',color:'#e0a000',lang:'ku-KU',doctrine:'Regional Peshmerga forces, mountain fighters: infantry cost 15% less and train 10% faster, and troops ambush hard from cover in their own mountains and towns.',mods:{infCost:.85,infTime:.9,vehHp:.92},
  units:{inf:'Peshmerga Squad',at:'Milan Team',hero:'Special Peshmerga Commandos',aa:'Technical AA Gun',tank:'T-72 Tank',arty:'Mortar Battery',heli:'Mi-17 Gunship',jet:'Light Strike Aircraft',boat:'River Patrol Boat',ship:'Lake Patrol Ship'},
  sup:{name:'Mountain Mortar Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Mountain Scout Troop'}],hero:['Zerevani Special Forces','demo'],
  doct:{name:'Mountain Defense',homeland:1,ambush:1},
  pow:{name:'Mountain Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Regional Revenue'},recon:{name:'Mountain Observation Posts',rm:.95},para:{name:'Heliborne Raid'},barrage:{name:'Mortar Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Mountain Warfare Course','Regional Kit','Tank Crew Training','Mortar Fire Control','Strike Aircraft Refit','Gunship Maintenance','Regional Trade Revenue','Defense of the Region','River Patrol Refit'],
  uplink:'Rocket Command (Erbil)',econ:'Erbil Trade Board',sub:'Lake Midget Submarine',md:'Mountain AA Battery',coast:'River Gun Battery',trn:['River Landing Craft','Mi-17 Transport']},
 IT:{base:'EG',name:'Italy',color:'#009246',lang:'it-IT',doctrine:'Italian Armed Forces, Alpini and combined arms: infantry cost 8% less, everything costs 2% less, and troops fight hard defending home soil.',mods:{infCost:.92,cost:.98},
  units:{inf:'Fanteria Squad',at:'Spike Team',hero:'Alpini Rangers',aa:'SAMP/T Launcher',tank:'Ariete C2 Tank',arty:'PzH 2000 Howitzer',heli:'A129 Mangusta',jet:'Eurofighter Typhoon',boat:'Cassiopea Patrol Boat',ship:'FREMM Frigate'},
  sup:{name:'Eurofighter Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Cavalleria Recon Troop'}],hero:['Folgore Paratroopers','demo'],
  doct:{name:'Alpini Combined Arms',homeland:1},
  pow:{name:'Logistic Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Defense Exports'},recon:{name:'Aerial Reconnaissance',rm:.95},para:{name:'Folgore Parachute Drop'},barrage:{name:'Artillery Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Ranger Course','Combat Kit','Ariete Crew Training','Howitzer Fire Control','Typhoon Upgrade','Mangusta Maintenance','Mediterranean Trade Revenue','Alpine Doctrine','Fleet Refit'],
  uplink:'Strike Command (Taranto)',econ:'Genoa Port Authority',sub:'Todaro-class Submarine',md:'SAMP/T Battery',coast:'Teseo Coastal Battery',trn:['Landing Craft','NH90 Transport']},
 GR:{base:'EG',name:'Greece',color:'#0d5eaf',lang:'el-GR',doctrine:'Hellenic Armed Forces, island and border defense: vehicles are 4% tougher, everything costs 3% less, and troops fight hard on home ground.',mods:{cost:.97,vehHp:1.04},
  units:{inf:'Evzone Squad',at:'Milan Team',hero:'Raider Commandos',aa:'Osa-AKM Launcher',tank:'Leopard 2A6HEL',arty:'M109A5 Howitzer',heli:'AH-64A Apache',jet:'F-16 Block 52',boat:'Island Patrol Boat',ship:'Hydra Frigate'},
  sup:{name:'Aegean Fire Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Island Recon Patrol'}],hero:['Special Raiders','demo'],
  doct:{name:'Aegean Defense',homeland:1},
  pow:{name:'Island Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Shipping Revenue'},recon:{name:'Aegean Watch',rm:.95},para:{name:'Airborne Brigade Drop'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Raider Course','Combat Kit','Leopard Crew Training','Howitzer Fire Control','F-16 Upgrade','Apache Maintenance','Shipping Revenue','Defense of the Islands','Fleet Refit'],
  uplink:'Missile Command (Crete)',econ:'Piraeus Port Authority',sub:'Type 214 Submarine',md:'Patriot Battery',coast:'Exocet Coastal Battery',trn:['Landing Craft','CH-47 Chinook']},
 ES:{base:'EG',name:'Spain',color:'#c60b1e',lang:'es-ES',doctrine:'Spanish Armed Forces, Legion and expeditionary: infantry train 12% faster and cost 6% less, everything costs 2% less, and troops fight hard defending home soil.',mods:{infCost:.94,infTime:.88,cost:.98},
  units:{inf:'Legion Squad',at:'Spike Team',hero:'Legion Commandos',aa:'NASAMS Launcher',tank:'Leopard 2E Tank',arty:'SIAC Howitzer',heli:'Tigre HAD',jet:'Eurofighter Typhoon',boat:'Chilreu Patrol Boat',ship:'F-100 Frigate'},
  sup:{name:'Eurofighter Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Caballeria Recon Troop'}],hero:['Special Operations Command','demo'],
  doct:{name:'Legion Expeditionary Doctrine',homeland:1},
  pow:{name:'Logistic Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Defense Exports'},recon:{name:'Aerial Reconnaissance',rm:.95},para:{name:'Parachute Brigade Drop'},barrage:{name:'Artillery Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Legion Course','Combat Kit','Leopard Crew Training','Howitzer Fire Control','Typhoon Upgrade','Tigre Maintenance','Iberian Trade Revenue','Expeditionary Doctrine','Fleet Refit'],
  uplink:'Strike Command (Rota)',econ:'Valencia Port Authority',sub:'S-80 Plus Submarine',md:'NASAMS Battery',coast:'Harpoon Coastal Battery',trn:['Landing Craft','NH90 Transport']}});
// ---- nations-b3 (Abdullah 2026-11-05 19:45): JP Japan, national self-defence forces only (neutral wording); Egypt base, equal power per tier; Professional morale (set).
Object.assign(NEWNAT,{
 JP:{base:'EG',name:'Japan',color:'#bc002d',lang:'ja-JP',doctrine:'Japan Self-Defense Forces, layered defense: air and missile defense cost 10% less, vehicles are 5% tougher, and units fight 10% harder defending home islands.',mods:{vehHp:1.05},
  units:{inf:'JGSDF Rifle Squad',at:'Type 01 LMAT Team',hero:'Amphibious Rapid Deployment Brigade',aa:'Type 03 Chu-SAM',tank:'Type 10 Tank',arty:'Type 99 Self-Propelled Howitzer',heli:'AH-64D Apache',jet:'F-35A Lightning II',boat:'Hayabusa Missile Boat',ship:'Maya-class Destroyer'},
  sup:{name:'Type 12 Missile Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Reconnaissance Platoon'}],hero:['Special Forces Group','demo'],
  doct:{name:'Layered Defense',homeland:1},
  pow:{name:'Disaster Relief Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Industrial Exports'},recon:{name:'Island Early Warning',rm:.95},para:{name:'Airborne Brigade Drop'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Maintenance Depot Repair',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Rapid Deployment Course','Modern Rifle Kit','Type 10 Crew Training','Howitzer Fire Control','F-35 Integration','Apache Maintenance','Industrial Revenue','Layered Defense Doctrine','Coastal Patrol Refit'],
  uplink:'Joint Missile Command',econ:'Keihin Industrial Zone',sub:'Soryu-class Submarine',md:'Patriot PAC-3 Battery',coast:'Type 12 Coastal Battery',trn:['Landing Craft Air Cushion','CH-47J Chinook']}});
// ---- nations-b1 (Abdullah 2026-11-05 19:49/19:56/20:37): TW, PH, VN, ID, TH, KZ, AF, OM. Same NEWNAT mechanism, Egypt base (equal power per tier); morale style Home defenders (table above).
Object.assign(NEWNAT,{
 TW:{base:'EG',name:'Taiwan',color:'#1c3f94',lang:'zh-TW',doctrine:'Republic of China Armed Forces, porcupine defense: coastal batteries and missile defense cost 10% less, infantry cost 6% less, and units fight 10% harder defending home soil.',mods:{infCost:.94},
  units:{inf:'ROC Army Infantry Squad',at:'Javelin Team',hero:'Amphibious Reconnaissance Commandos',aa:'Sky Bow Launcher',tank:'M1A2T Abrams',arty:'M109A6 Paladin',heli:'AH-64E Guardian',jet:'F-16V Viper',boat:'Kuang Hua Missile Boat',ship:'Kang Ding Frigate'},
  sup:{name:'Hsiung Feng Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Reconnaissance Platoon'}],hero:['Special Warfare Command','demo'],
  doct:{name:'Porcupine Defense',homeland:1},
  pow:{name:'Reserve Mobilization Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Semiconductor Exports'},recon:{name:'Strait Watch',rm:.95},para:{name:'Airborne Special Forces Drop'},barrage:{name:'Thunderbolt Rocket Barrage',nm:1.1,cdm:1.05},repair:{name:'Armored Depot Repair',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Warfare Course','Reserve Kit','Abrams Crew Training','Paladin Fire Control','F-16V Upgrade','Guardian Maintenance','Technology Exports','Porcupine Doctrine','Strait Patrol Refit'],
  uplink:'Hsiung Feng Missile Command',econ:'Hsinchu Science Park',sub:'Hai Kun-class Submarine',md:'Patriot PAC-3 Battery',coast:'Hsiung Feng II Coastal Battery',trn:['Landing Craft Utility','CH-47SD Chinook']},
 PH:{base:'EG',name:'Philippines',color:'#0038a8',lang:'fil-PH',doctrine:'Armed Forces of the Philippines, archipelago defense: marines and infantry cost 8% less, sea assets cost 5% less, and units fight 10% harder on their home islands.',mods:{infCost:.92},
  units:{inf:'Philippine Army Squad',at:'Spike Team',hero:'Scout Rangers',aa:'Spyder Launcher',tank:'Sabrah Light Tank',arty:'Soltam Howitzer',heli:'AW159 Wildcat',jet:'FA-50PH Fighting Eagle',boat:'Acero-class Patrol Gunboat',ship:'Jose Rizal Frigate'},
  sup:{name:'BrahMos Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Philippine Marine Recon Team'}],hero:['Force Recon Battalion','demo'],
  doct:{name:'Archipelagic Defense',homeland:1},
  pow:{name:'Island Relief Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Overseas Remittances'},recon:{name:'Island Coastwatch',rm:.95},para:{name:'Marine Air Assault'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Scout Ranger Course','Jungle Combat Kit','Light Armor Training','Howitzer Fire Control','FA-50 Upgrade','Wildcat Maintenance','Remittance Revenue','Archipelago Doctrine','Naval Patrol Refit'],
  uplink:'BrahMos Missile Command',econ:'Subic Bay Freeport',sub:'Midget Coastal Submarine',md:'Spyder Battery',coast:'BrahMos Coastal Battery',trn:['Landing Craft Utility','Black Hawk Transport']},
 VN:{base:'EG',name:'Vietnam',color:'#da251d',lang:'vi-VN',doctrine:'People\'s Army of Vietnam, people\'s defense: infantry cost 12% less and train faster, anti-air guns cost 8% less, and troops ambush hard from cover on their own ground.',mods:{infCost:.88,infTime:.9},
  units:{inf:'People\'s Army Squad',at:'Kornet Team',hero:'Sapper Commandos',aa:'Gepard AA Gun',tank:'T-90S Tank',arty:'2S3 Akatsiya',heli:'Mi-24 Hind',jet:'Su-30MK2',boat:'Molniya Missile Boat',ship:'Gepard-class Frigate'},
  sup:{name:'Bastion Coastal Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Reconnaissance Company'}],hero:['Special Forces Battalion','demo'],
  doct:{name:'People\'s War',homeland:1,ambush:1},
  pow:{name:'Trail Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Export Manufacturing'},recon:{name:'Border Observation Posts',rm:.95},para:{name:'Airborne Brigade Drop'},barrage:{name:'Artillery Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Sapper Course','Tropical Combat Kit','Tank Crew Training','Akatsiya Fire Control','Su-30 Overhaul','Hind Maintenance','Trade Revenue','People\'s War Doctrine','Coastal Patrol Refit'],
  uplink:'Coastal Missile Command',econ:'Hai Phong Port Authority',sub:'Kilo-class Submarine',md:'S-300PMU Battery',coast:'Bastion-P Coastal Battery',trn:['Landing Craft Utility','Mi-8 Transport']},
 ID:{base:'EG',name:'Indonesia',color:'#c8102e',lang:'id-ID',doctrine:'Indonesian National Armed Forces, archipelago defense: marines and infantry cost 8% less, sea assets cost 4% less, and units fight 10% harder on their home islands.',mods:{infCost:.92,cost:.98},
  units:{inf:'TNI Infantry Squad',at:'Javelin Team',hero:'Kopassus Troopers',aa:'NASAMS Launcher',tank:'Leopard 2RI',arty:'CAESAR Howitzer',heli:'AH-64E Apache',jet:'Su-30MK2',boat:'Clurit Patrol Boat',ship:'Martadinata Frigate'},
  sup:{name:'Rocket Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Marine Corps Recon Team'}],hero:['Kopassus Group','demo'],
  doct:{name:'Total People\'s Defense',homeland:1},
  pow:{name:'Archipelago Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Commodity Exports'},recon:{name:'Island Surveillance',rm:.95},para:{name:'Paratrooper Battalion'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Kopassus Course','Loreng Combat Kit','Leopard Crew Training','CAESAR Fire Control','Su-30 Overhaul','Apache Maintenance','Commodity Revenue','Total Defense Doctrine','Naval Patrol Refit'],
  uplink:'Rocket Command (Nusantara)',econ:'Tanjung Priok Terminal',sub:'Type 209 Submarine',md:'NASAMS Battery',coast:'C-705 Coastal Battery',trn:['Landing Craft Utility','Super Puma Transport']},
 TH:{base:'EG',name:'Thailand',color:'#2d2a4a',lang:'th-TH',doctrine:'Royal Thai Armed Forces, jungle and coast: infantry cost 8% less, units ignore forest slowdown, and troops fight 10% harder defending home soil.',mods:{infCost:.92},
  units:{inf:'Royal Thai Army Squad',at:'Spike Team',hero:'Special Warfare Rangers',aa:'Starstreak Launcher',tank:'VT-4 Tank',arty:'M109 Howitzer',heli:'AH-1F Cobra',jet:'JAS 39 Gripen',boat:'Hua Hin Patrol Boat',ship:'Naresuan Frigate'},
  sup:{name:'Gripen Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Long Range Reconnaissance Patrol'}],hero:['Naval Special Warfare','demo'],
  doct:{name:'Jungle Defense',homeland:1},
  pow:{name:'Royal Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Tourism & Exports'},recon:{name:'Border Patrol Sweep',rm:.95},para:{name:'Airborne Regiment Drop'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Ranger Course','Jungle Combat Kit','Tank Crew Training','Howitzer Fire Control','Gripen Upgrade','Cobra Maintenance','Trade Revenue','Jungle Doctrine','Gulf Patrol Refit'],
  uplink:'Strike Missile Command',econ:'Laem Chabang Port',sub:'Coastal Submarine',md:'VL MICA Battery',coast:'Harpoon Coastal Battery',trn:['Landing Craft Utility','Black Hawk Transport']},
 KZ:{base:'EG',name:'Kazakhstan',color:'#00afca',lang:'kk-KZ',doctrine:'Armed Forces of Kazakhstan, steppe mechanized: vehicles are 6% tougher, tanks cost 8% less, and troops fight 10% harder on their home steppe.',mods:{vehHp:1.06,cost:.98},
  units:{inf:'Motor Rifle Squad',at:'Kornet Team',hero:'Airmobile Assault Commandos',aa:'Pantsir-S1',tank:'T-90S Tank',arty:'2S19 Msta-S',heli:'Mi-35M Hind',jet:'Su-30SM',boat:'Caspian Patrol Boat',ship:'Kazakhstan-class Patrol Ship'},
  sup:{name:'Smerch Rocket Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Reconnaissance Battalion'}],hero:['Airmobile Forces Sunkar Group','demo'],
  doct:{name:'Steppe Mechanized',homeland:1},
  pow:{name:'Steppe Logistics Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Energy Exports'},recon:{name:'Steppe Observation Posts',rm:.95},para:{name:'Air Assault Brigade'},barrage:{name:'Msta Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Airmobile Course','Steppe Combat Kit','Tank Crew Training','Msta Fire Control','Su-30 Overhaul','Hind Maintenance','Energy Revenue','Steppe Doctrine','Caspian Patrol Refit'],
  uplink:'Rocket Command (Baikonur)',econ:'Kashagan Oil Terminal',sub:'Coastal Submarine',md:'S-300 Battery',coast:'Caspian Coastal Battery',trn:['Landing Craft Utility','Mi-17 Transport']},
 // Stylised national army only (Abdullah): no real factions, governments or leaders; neutral emblem, plain colours.
 AF:{base:'EG',name:'Afghanistan',color:'#5a6b45',lang:'fa-AF',doctrine:'Afghan National Army (stylized), mountain fighters: infantry cost 10% less, mortars and rockets cost 8% less, and troops ambush hard from cover on their own mountains.',mods:{infCost:.9},
  units:{inf:'National Army Squad',at:'Recoilless Rifle Team',hero:'Mountain Commandos',aa:'ZU-23 Truck',tank:'T-62 Tank',arty:'D-30 Howitzer',heli:'Mi-17 Gunship',jet:'Su-25 Frogfoot',boat:'River Patrol Boat',ship:'River Gunboat'},
  sup:{name:'Mortar Barrage',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Mountain Scout Patrol'}],hero:['Mountain Commando Company','demo'],
  doct:{name:'Mountain Defense',homeland:1,ambush:1},
  pow:{name:'Mountain Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Mineral Exports'},recon:{name:'Ridge Observation Posts',rm:.95},para:{name:'Heliborne Assault'},barrage:{name:'Mortar Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','Mountain Combat Kit','Armor Crew Training','Howitzer Fire Control','Frogfoot Overhaul','Mi-17 Maintenance','Mineral Revenue','Mountain Doctrine','River Patrol Refit'],
  uplink:'Rocket Command (Hindu Kush)',econ:'Kabul Bazaar Authority',sub:'Coastal Submarine',md:'S-125 Battery',coast:'River Coastal Battery',trn:['River Landing Craft','Mi-17 Transport']},
 OM:{base:'EG',name:'Oman',color:'#a30d2d',lang:'ar-OM',doctrine:'Sultan\'s Armed Forces, desert and coast: coastal batteries cost 10% less, vehicles are 5% tougher, and units fight 10% harder defending their own coast and desert.',mods:{vehHp:1.05},
  units:{inf:'Royal Army of Oman Squad',at:'Javelin Team',hero:'Special Forces Troopers',aa:'Mistral Launcher',tank:'Challenger 2 Tank',arty:'G6 Howitzer',heli:'NH90 Gunship',jet:'Eurofighter Typhoon',boat:'Al-Seeb Patrol Boat',ship:'Khareef-class Corvette'},
  sup:{name:'Typhoon Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Desert Reconnaissance Troop'}],hero:['Sultan\'s Special Force','demo'],
  doct:{name:'Coast & Desert Defense',homeland:1},
  pow:{name:'Desert Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Port & Energy Revenue'},recon:{name:'Coastwatch Sweep',rm:.95},para:{name:'Airborne Troop Drop'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Force Course','Desert Combat Kit','Challenger Crew Training','G6 Fire Control','Typhoon Integration','NH90 Maintenance','Port Revenue','Coast & Desert Doctrine','Khareef Refit'],
  uplink:'Strike Missile Command',econ:'Salalah Port',sub:'Coastal Submarine',md:'Mistral Battery',coast:'Exocet Coastal Battery',trn:['Landing Craft Utility','NH90 Transport']}});
// ---- nations-b2 (Abdullah 2026-11-05 19:56/20:37): DZ, MA, NG, ZA, ET, LY, SD from the Egypt base (equal power per tier). LY/SD = stylised national armies only.
Object.assign(NEWNAT,{ DZ:{base:'EG',name:'Algeria',color:'#1b7a3d',lang:'ar-DZ',doctrine:'People\'s National Army, desert depth: tanks and air-defence cost 6% less, vehicles are 5% tougher, and units fight 10% harder on their home desert and Atlas ground.',mods:{vehHp:1.05,cost:.97},
  units:{inf:'ANP Infantry Section',at:'Kornet Team',hero:'Special Forces Commando',aa:'Pantsir-S1',tank:'T-90SA',arty:'2S19 Msta-S',heli:'Mi-28NE Havoc',jet:'Su-30MKA',boat:'Coastal Patrol Boat',ship:'MEKO A-200AN Frigate'},
  sup:{name:'Msta Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'ANP Desert Recon Troop'}],hero:['Special Forces Regiment','demo'],
  doct:{name:'Desert Depth',homeland:1},
  pow:{name:'Sahara Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Hydrocarbon Revenue'},recon:{name:'Sahara Observation Posts',rm:.95},para:{name:'Airborne Paratroopers'},barrage:{name:'Msta Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','ANP Combat Kit','T-90 Crew Training','Msta Fire Control','Su-30 Integration','Havoc Maintenance','Hydrocarbon Revenue','Defense of the Maghreb','Coastal Refit'],
  uplink:'Missile Command (Tamanrasset)',econ:'Hassi Messaoud Export Terminal',sub:'Kilo-class Submarine',md:'S-300PMU2 Battery',coast:'Bastion Coastal Battery',trn:['Landing Ship','Mi-171 Transport']},
 MA:{base:'EG',name:'Morocco',color:'#b3262e',lang:'ar-MA',doctrine:'Royal Armed Forces, desert berm: structures have 20% more hit points, tanks cost 5% less, and units fight 10% harder on their home ground.',mods:{bldHp:1.2,cost:.97},
  units:{inf:'FAR Infantry Section',at:'Anti-Tank Missile Team',hero:'Royal Guard Commando',aa:'Skyguard Launcher',tank:'M1A2 Abrams SEPv3',arty:'CAESAR Howitzer',heli:'AH-64E Apache',jet:'F-16C Block 52',boat:'Coastal Patrol Boat',ship:'FREMM Mohammed VI'},
  sup:{name:'Falcon Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'FAR Atlas Recon Patrol'}],hero:['Royal Guard Special Forces','demo'],
  doct:{name:'Desert Berm',homeland:1},
  pow:{name:'Phosphate Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Phosphate Exports'},recon:{name:'Atlas Watch',rm:.95},para:{name:'Parachute Brigade'},barrage:{name:'CAESAR Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','FAR Combat Kit','Abrams Crew Training','CAESAR Fire Control','F-16 Integration','Apache Maintenance','Phosphate Revenue','Defense of the Berm','Fleet Refit'],
  uplink:'Missile Command (Ben Guerir)',econ:'Casablanca Port Hub',md:'Skyguard Battery',coast:'Exocet Coastal Battery',trn:['Landing Craft','CH-47 Chinook']},
 NG:{base:'EG',name:'Nigeria',color:'#008751',lang:'en-NG',doctrine:'Nigerian Armed Forces, strong infantry: infantry cost 12% less and train faster, and units fight 10% harder on home ground.',mods:{infCost:.88,infTime:.9},
  units:{inf:'Nigerian Army Section',at:'Carl Gustaf Team',hero:'Special Forces Operators',aa:'ZU-23 Technical',tank:'Vickers Mk 3 / T-72',arty:'Palmaria Howitzer',heli:'Mi-35 Hind',jet:'JF-17 Thunder',boat:'Seaward Patrol Boat',ship:'Centenary-class Patrol Vessel'},
  sup:{name:'Alpha Jet Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Rangers Recon Patrol'}],hero:['Special Forces Battalion','demo'],
  doct:{name:'Defense of the Federation',homeland:1},
  pow:{name:'Lagos Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Oil Revenue'},recon:{name:'Savanna Watch',rm:.95},para:{name:'Airborne Battalion'},barrage:{name:'Howitzer Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Army Combat Kit','Armor Crew Training','Howitzer Fire Control','JF-17 Integration','Hind Maintenance','Oil Revenue','Defense of the Federation','Patrol Fleet Refit'],
  uplink:'Rocket Command (Abuja)',econ:'Lagos Port Terminal',md:'Shorad Battery',coast:'Coastal Defense Battery',trn:['Landing Craft','Mi-171 Transport']},
 ZA:{base:'EG',name:'South Africa',color:'#007749',lang:'en-ZA',doctrine:'South African National Defence Force, bush war: vehicles are 8% tougher, artillery hits 10% harder, and units fight 10% harder on home veld and bush.',mods:{vehHp:1.08},
  units:{inf:'SANDF Rifle Section',at:'Ingwe Missile Team',hero:'Recce Commandos',aa:'Umkhonto Launcher',tank:'Olifant Mk2',arty:'G6 Rhino Howitzer',heli:'Rooivalk',jet:'JAS-39 Gripen',boat:'Namacurra Patrol Boat',ship:'Valour-class Frigate'},
  sup:{name:'Gripen Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Reconnaissance Commandos'}],hero:['1 Reconnaissance Regiment','demo'],
  doct:{name:'Bush War Doctrine',homeland:1},
  pow:{name:'Logistic Support Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Defense Industry Exports'},recon:{name:'Bush Observation Posts',rm:.95},para:{name:'Parachute Battalion'},barrage:{name:'G6 Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Recce Course','SANDF Combat Kit','Olifant Crew Training','G6 Fire Control','Gripen Integration','Rooivalk Maintenance','Mineral Revenue','Defense of the Cape','Fleet Refit'],
  uplink:'Missile Command (Overberg)',econ:'Johannesburg Trading Floor',sub:'Heroine-class Submarine',md:'Umkhonto Battery',coast:'Coastal Defense Battery',trn:['Landing Craft','Oryx Transport']},
 ET:{base:'EG',name:'Ethiopia',color:'#078930',lang:'am-ET',doctrine:'Ethiopian National Defence Force, highland defense: infantry cost 10% less, tanks are 5% tougher, and units fight 10% harder in their home highlands.',mods:{infCost:.9,vehHp:1.05},
  units:{inf:'ENDF Infantry Section',at:'Konkurs Team',hero:'Special Forces Commando',aa:'ZSU-23-4 Shilka',tank:'T-72 Tank',arty:'D-30 Howitzer',heli:'Mi-35 Hind',jet:'Su-27 Flanker',boat:'Lake Patrol Boat',ship:'River Patrol Vessel'},
  sup:{name:'Su-27 Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Highland Scout Troop'}],hero:['Special Forces Command','demo'],
  doct:{name:'Highland Defense',homeland:1},
  pow:{name:'Highland Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Coffee Exports'},recon:{name:'Highland Watch',rm:.95},para:{name:'Airborne Battalion'},barrage:{name:'D-30 Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Commando Course','ENDF Combat Kit','Tank Crew Training','D-30 Fire Control','Su-27 Overhaul','Hind Maintenance','Agricultural Revenue','Defense of the Highlands','Lake Patrol Refit'],
  uplink:'Rocket Command (Bishoftu)',econ:'Addis Ababa Trade Hub',md:'Pechora Battery',coast:'Coastal Defense Battery',trn:['Landing Craft','Mi-8 Transport']},
 LY:{base:'EG',name:'Libya',color:'#4a4f55',lang:'ar-LY',doctrine:'National army (stylized), coastal desert: units cost 3% less, vehicles are 5% tougher, and troops fight 10% harder on their home desert coast.',mods:{vehHp:1.05,cost:.97},
  units:{inf:'National Army Section',at:'Konkurs Team',hero:'Army Special Forces',aa:'ZSU-23-4 Shilka',tank:'T-72 Tank',arty:'2S1 Gvozdika',heli:'Mi-35 Hind',jet:'MiG-23 Flogger',boat:'Coastal Patrol Boat',ship:'Coastal Corvette'},
  sup:{name:'Air Force Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Desert Recon Troop'}],hero:['Special Forces Battalion','demo'],
  doct:{name:'Coastal Desert Defense',homeland:1},
  pow:{name:'Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Oil Exports'},recon:{name:'Desert Observation Posts',rm:.95},para:{name:'Airborne Company'},barrage:{name:'Gvozdika Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Army Combat Kit','Tank Crew Training','Gvozdika Fire Control','Jet Overhaul','Hind Maintenance','Oil Revenue','Defense of the Coast','Coastal Refit'],
  uplink:'Rocket Command (Sirte Desert)',econ:'Tripoli Port Terminal',md:'Pechora Battery',coast:'Coastal Defense Battery',trn:['Landing Craft','Mi-8 Transport']},
 SD:{base:'EG',name:'Sudan',color:'#4b5246',lang:'ar-SD',doctrine:'National army (stylized), Nile and savanna: units cost 3% less, vehicles are 5% tougher, and troops fight 10% harder on home savanna and the Nile.',mods:{vehHp:1.05,cost:.97},
  units:{inf:'National Army Section',at:'Konkurs Team',hero:'Army Special Forces',aa:'ZSU-23-4 Shilka',tank:'T-72 Tank',arty:'D-30 Howitzer',heli:'Mi-24 Hind',jet:'MiG-29 Fulcrum',boat:'Nile River Boat',ship:'River Patrol Vessel'},
  sup:{name:'Air Force Strike',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Savanna Recon Troop'}],hero:['Special Forces Battalion','demo'],
  doct:{name:'Nile and Savanna Defense',homeland:1},
  pow:{name:'Supply Convoy',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Gum Arabic Exports'},recon:{name:'Savanna Observation Posts',rm:.95},para:{name:'Airborne Company'},barrage:{name:'D-30 Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Special Forces Course','Army Combat Kit','Tank Crew Training','D-30 Fire Control','Jet Overhaul','Hind Maintenance','Nile Revenue','Defense of the Nile','River Patrol Refit'],
  uplink:'Rocket Command (Nile Valley)',econ:'Port Sudan Terminal',md:'Pechora Battery',coast:'Coastal Defense Battery',trn:['Landing Craft','Mi-8 Transport']}});
// ---- nation-rv (Abdullah 2026-11-06 21:24 "Somehow incorporate the Iraqi PMF as a faction" -> "River Shias", own nation in south Iraq): a fictional faction inspired by Iraqi Shia
// volunteer brigades raised to defend the shrines and the south. Never the real organisation's name, flag/emblem or leaders. Egypt base (equal power per tier), Zealous morale (never routs).
Object.assign(NEWNAT,{
 RV:{base:'EG',name:'Iraqi Shia Brigades',color:'#1f7a3a',lang:'ar-IQ',doctrine:'Volunteer brigades of the south, defenders of the shrines: infantry cost 18% less and train faster, units ambush hard from cover and fight 15% harder near their own buildings, and they never rout. Mixed militia and state-issued gear.',mods:{infCost:.82,infTime:.85},
  units:{inf:'Volunteer Brigade Squad',at:'Kornet Team',hero:'Shrine Guard Commandos',aa:'ZU-23 Technical',tank:'T-72 Tank',arty:'Grad Rocket Launcher',heli:'Mi-35 Hind',jet:'Su-25 Frogfoot',boat:'Marsh Boat',ship:'Shatt Patrol Boat'},
  sup:{name:'Grad Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Marsh Scout Team'}],hero:['Shrine Guard Assault Team','demo'],
  doct:{name:'Defense of the Shrines',homeland:1,ambush:1},
  pow:{name:'Call of the Volunteers',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  gp:{bounty:{name:'Southern Oil Share'},recon:{name:'Marsh Watchers',rm:.95},para:{name:'Heliborne Volunteers'},barrage:{name:'Grad Barrage',nm:1.1,cdm:1.05},repair:{name:'Brigade Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Shrine Guard Course','Volunteer Kit','T-72 Crew Training','Grad Fire Control','Frogfoot Overhaul','Hind Maintenance','Southern Oil Revenue','Defense of the Shrines','Marsh Boat Refit'],
  uplink:'Rocket Command (Marsh Depot)',econ:'Basra Oil Share Office',md:'Pantsir-style Battery',coast:'Shatt Coastal Battery',trn:['Marsh Landing Craft','Mi-8 Transport']}});
// ---- nation-obbd (Abdullah 2026-11-06 21:26/21:29): OB "Palestine Islamic Brigade" (renamed 2026-11-07 19:40, was Olive Brigades) (fictional Gaza urban-resistance faction) and BI "Black Desert Insurgency" (fictional desert insurgent movement; code BI because BD = Bangladesh).
// Inspired-by only: never a real group's name, flag, emblem, slogan or leader. Military-vs-military: no terror, hostage, suicide-attack or civilian-target mechanics. Both ZEALOUS (never rout). Egypt base = equal power per tier.
Object.assign(NEWNAT,{
 OB:{base:'EG',name:'Palestine Islamic Brigade',color:'#3c6b3a',lang:'ar-PS',doctrine:'Palestine Islamic Brigade, the dense-city defenders of Gaza: light, cheap infantry (cost 15% less) fight from hidden firing posts and rubble ambush positions, hitting 20% harder from cover and 15% harder near their own buildings. Zealous: they never rout, but they pay in heavy losses and thin armor.',mods:{infCost:.85,infTime:.9,vehHp:.92},
  units:{inf:'Brigade Fighter Squad',at:'RPG Ambush Team',hero:'Rubble Marksman Team',aa:'Improvised AA Truck',tank:'Armored Bulldozer Carrier',arty:'Improvised Rocket Battery',heli:'Strike Drone Flight',jet:'Long-Range Rocket Salvo',boat:'Coastal Fishing Skiff',ship:'Coastal Patrol Launch'},
  sup:{name:'Rocket Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['recon',{name:'Rooftop Observers'}],hero:['Rubble Marksman Team','demo'],
  doct:{name:'Urban Labyrinth',ambush:1,homeland:1},
  pow:{name:'Rubble Cover',type:'shield',cd:200,r:280,desc:'Your forces in the area take 60% less damage for 20s'},
  gp:{bounty:{name:'Salvaged Supplies'},recon:{name:'Rooftop Watchers',rm:.95},para:{name:'Alley Reinforcements'},barrage:{name:'Mortar Barrage',nm:1.1,cdm:1.05},repair:{name:'Field Aid Posts',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Marksman Course','Light Fighter Kit','Rubble Fighting Drills','Mortar Fire Control','Rocket Workshops','Drone Workshop','Remittance Fund','Defense of the City','Skiff Patrol Refit'],
  uplink:'Rocket Workshop (Coastal Strip)',econ:'Aid & Remittance Board',md:'Rocket Battery',coast:'Coastal Lookout Post',trn:['Fishing Boat','Pickup Convoy']},
 BI:{base:'EG',name:'Desert Islamic Faction',color:'#3b3b3f',lang:'ar-SY',doctrine:'Desert Islamic Faction, a raiding movement of the Syria-Iraq desert: captured technicals and light infantry (cost 12% less), raiders sprint 25% faster after firing and hit 20% harder from cover. Zealous: they never rout, but they pay in heavy losses and thin armor. Nobody makes treaties with them.',mods:{infCost:.88,vehHp:.95},
  units:{inf:'Desert Raider Squad',at:'ATGM Raiding Team',hero:'Desert Sniper Team',aa:'ZU-23 Technical',tank:'Captured T-55 Group',arty:'Truck-Mounted Mortar',heli:'Small Strike Drone',jet:'Captured Rocket Salvo',boat:'River Skiff',ship:'River Patrol Launch'},
  sup:{name:'Mortar Salvo',charge:150,n:5,dmg:720,r:70,spread:130},
  special:['saka',{name:'Technical Raiders'}],hero:['Desert Sniper Team','demo'],
  doct:{name:'Desert Raids',hitrun:1,ambush:1},
  pow:{name:'Dust Screen',type:'smoke',cd:180,r:260,desc:'Smoke screen to move and withdraw under'},
  gp:{bounty:{name:'Captured Equipment'},recon:{name:'Desert Scouts',rm:.95},para:{name:'Technical Convoy'},barrage:{name:'Mortar Barrage',nm:1.1,cdm:1.05},repair:{name:'Roadside Workshops',pm:1.2,rm:.9,cdm:1.05}},
  upg:['Raider Course','Desert Fighter Kit','Captured Armor Crews','Mortar Fire Control','ATGM Stocks','Drone Workshop','Smuggling Routes','Desert Mobility','River Skiff Refit'],
  uplink:'Rocket Depot (Desert)',econ:'Desert Trade Board',md:'Mortar Park',coast:'River Lookout Post',trn:['River Boat','Technical Convoy']}});
for(const k in NEWNAT){const N=NEWNAT[k],B=FACTIONS[N.base];const u={};for(const q in B.units)u[q]=Object.assign({},B.units[q]);for(const q in N.units)u[q]=Object.assign({},u[q]||{},{name:N.units[q]});
  FACTIONS[k]=Object.assign({},B,{code:k,name:N.name,color:N.color,lang:N.lang,doctrine:N.doctrine,mods:N.mods,units:u,sup:N.sup});
  const sp=N.special;FACTIONS[k].special=sp[0];FACTIONS[k].units[sp[0]]=Object.assign({},FACTIONS[k].units[sp[0]]||{},sp[1]);
  FACTIONS[k].units.champ=Object.assign({},u.champ||{},{name:N.hero[0],hab:N.hero[1]});HEROES[k]=N.hero;}
for(const k of ['IR','RS','DW','KP']){FACTIONS[k].tunnels=true;FACTIONS[k].doctrine+=' Tunnel warfare: hidden tunnels move units across the map instantly.';}
const FKEYS=Object.keys(FACTIONS).filter(k=>k!=='EU');   // nations-a1: the EU retires as a nation (Abdullah 2026-11-05 19:54) - FACTIONS.EU stays only as the hidden base row FR/DE are built from and for old saves/replays; it is in no lobby, menu or AI list
// Rock-paper-scissors: what each kind of unit beats and what beats it (shown in the unit tooltips).
/* One language, idea 3 (orch/concepts/ONE-LANGUAGE.md): what every unit BEATS and is WEAK TO is COMPUTED from the real
   balance numbers (VS + stats/bstats) by this one helper - never write such lists by hand (guard: orch/decisions.mjs).
   matchE(a,b) = share of an equal-cost force of b that a destroys per second (0 = cannot hit it at all);
   matchR(a,b) = exchange ratio dollar for dollar, including who outranges whom; >= MATCH_WIN "beats", <= 1/MATCH_WIN "weak to".
   UNOTE keeps only the tactical notes that are not a counter list. View/UI only: the simulation never reads these. */
const UNOTE={inf:'Takes 35% less damage in woods or beside buildings; gets suppressed under heavy fire',hacker:'Disables buildings',hero:'Picks off infantry from long range',
  champ:'Elite squad: tough, accurate, one special ability (see the button when selected) · Only one at a time',harv:'Gathers supply · Also resupplies ammo around it',dozer:'Builds and repairs',
  tank:'Thickest armor in front: side hits do 20% more damage, rear hits 60% more',drone:'Explodes on groups of vehicles and infantry',ship:'Shells coasts and boats from long range'};
const MATCH_K=['inf','at','tank','aa','arty','heli','jet','drone'],MATCH_SEA=['boat','ship','sub'],MATCH_B=['turret','sam'],MATCH_WIN=1.5,matchC={};
function matchS(fac,k){return STRUCT[k]?Object.assign({},bstats(fac,k),{armor:'bld',dom:'ground',spd:0}):stats(fac,k);}
function matchE(a,b){if(!a||!b||a.noAttack||!(a.dmg>0)||!a.wpn)return 0;if(a.navalOnly&&b.dom!=='naval')return 0;if(b.sub&&!(a.dom==='naval'||a.cls==='heli'||a.sonar))return 0;
  if(b.dom==='air'){if((a.aa||0)<(b.alt==='high'?2:1))return 0;}else if(a.ground===false)return 0;   /* same rules as canTarget() in 03-sim */
  const v=(VS[a.wpn]||{})[b.armor]||0;if(!v)return 0;const grp=b.armor==='light'&&a.splash?1+Math.min(1.5,a.splash/40):1,hp=b.hp||1,ac=a.cost||1,bc=b.cost||1;   /* blasts catch several soldiers */
  if(a.wpn==='boom'&&a.dom==='air')return Math.min(1,a.dmg*v*grp/hp)*bc/ac/8;   /* a one-way drone spends itself on one hit */
  return a.dmg*v*grp/(a.rof||1)*(a.ammo?.35:1)/hp*bc/ac;}   /* a.ammo: flies home to rearm between passes */
function matchR(a,b){const x=matchE(a,b),y=matchE(b,a);if(!x&&!y)return 1;
  const free=(p,q,e)=>q.armor==='bld'?(p.rng>q.rng*1.1?1:0):Math.min(.9,e*Math.max(0,p.rng-q.rng)/(q.spd||40));   /* share of q lost before it gets into its own range (a building never gets there) */
  const fx=free(a,b,x),fy=free(b,a,y);return Math.max(1/9,Math.min(9,(x*(1-fy)+.0004)/(y*(1-fx)+.0004)));}
function matchUp(fac,kind,foe){foe=foe&&FACTIONS[foe]?foe:fac;const key=fac+'|'+kind+'|'+foe;if(matchC[key])return matchC[key];
  const a=matchS(fac,kind),sea=a.dom==='naval'||a.navalOnly,have=allUnits(foe),beats=[],weak=[];
  for(const k of [...MATCH_K,...MATCH_B,...(sea?MATCH_SEA:[])]){if(!STRUCT[k]&&!have.includes(k))continue;if(STRUCT[k]&&!bldAllowed(foe,k))continue;const b=matchS(foe,k),r=matchR(a,b);
    if(r>=MATCH_WIN)beats.push({k,b:!!STRUCT[k],r,e:matchE(a,b),n:b.name});else if(r<=1/MATCH_WIN)weak.push({k,b:!!STRUCT[k],r,e:matchE(b,a),n:b.name});}
  beats.sort((p,q)=>q.e-p.e);weak.sort((p,q)=>q.e-p.e);return matchC[key]={beats,weak,armed:!!(a.dmg>0&&!a.noAttack)};}
function matchText(fac,kind,foe,n){const m=matchUp(fac,kind,foe),L=l=>l.slice(0,n||3).map(x=>x.n).join(', ');return [m.beats.length?'Beats '+L(m.beats):m.armed?'':'Unarmed',m.weak.length?'Weak to '+L(m.weak):''].filter(Boolean).join(' · ');}
/* which of my units beat this enemy (stats object of a unit; a building passes isB) */
function matchBeaters(fac,es,isB){const b=isB?Object.assign({},es,{armor:'bld',dom:'ground',spd:0}):es,out=[];for(const k of allUnits(fac)){const a=stats(fac,k);if(a.fake)continue;const r=matchR(a,b);if(r>=MATCH_WIN)out.push({k,r,e:matchE(a,b),n:a.name});}return out.sort((p,q)=>q.e-p.e);}
const SHIA={IR:1,RS:1,DW:1};
/* Signature assets (orch/SIGNATURES.md): same nations only. */
const BB_NAT={US:1,IL:1,RU:1,CN:1},FORT_NAT={IR:1,RS:1,AF:1,KD:1,DW:1,KP:1};
function sigBan(fac,k){return(k==='bb'&&!BB_NAT[fac])||(k==='fort'&&!FORT_NAT[fac]);}
function roster(fac){const F=FACTIONS[fac];const spf=(BASE[F.special]||{}).from||'barracks';return{hq:['harv','dozer'],barracks:['inf','at',...(spf==='barracks'?[F.special]:[]),...(F.special==='medic'?[]:['medic']),'champ',...((SHIA[fac]||fac==='KP')?['cleric']:[]),'spy'],factory:['aa','tank','arty',...(F.extra||[]).filter(k=>stats(fac,k).from!=='airfield'),'dtank','dsam','darty',...(spf==='factory'?[F.special]:[])],airfield:F.noAir?[]:['heli','jet','airlift',...(F.extra||[]).filter(k=>stats(fac,k).from==='airfield')],shipyard:F.noShip?['boat','fast','lander']:['boat','fast','sub','ship','minel','sweep','lander']};}
function allUnits(fac){const r=roster(fac);return CATS.flatMap(c=>r[c]);}
function bldAllowed(fac,k){if(sigBan(fac,k))return false;if(k==='fort')return !!FORT_NAT[fac];if(k==='tunnel')return !!FACTIONS[fac].tunnels;return !(k==='airfield'&&FACTIONS[fac].noAir);}

// Faction upgrades (generated by upgspec.py): every nation has its own nine, themed to its doctrine and scored so each
// nation's set is worth the same overall (price follows strength). fx: [stat, unit group, value]
const UPG={"us1":{"name":"Marine Raider Training","at":"barracks","cost":1250,"time":27,"fac":"US","fx":[["dmg","inf",1.15],["spd","inf",1.1]],"desc":"Infantry +15% damage; Infantry move 10% faster"},"us2":{"name":"IOTV Plate Carriers","at":"barracks","cost":1250,"time":27,"fac":"US","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"us3":{"name":"M829A4 Sabot Rounds","at":"factory","cost":1250,"time":27,"fac":"US","fx":[["dmg","tank",1.25],["rng","tank",1.05]],"desc":"Tanks +25% damage; Tanks +5% weapon range"},"us4":{"name":"Chobham Armor Package","at":"factory","cost":900,"time":22,"fac":"US","fx":[["hp","tank",1.2]],"desc":"Tanks +20% hit points"},"us5":{"name":"JDAM Guidance","at":"airfield","cost":1000,"time":24,"fac":"US","fx":[["dmg","air",1.25]],"desc":"Aircraft +25% damage"},"us6":{"name":"Stealth Coatings","at":"airfield","cost":1250,"time":27,"fac":"US","fx":[["taken","air",0.75]],"desc":"Aircraft take 25% less damage"},"us7":{"name":"Combined Arms Training","at":"hq","cost":1400,"time":29,"fac":"US","fx":[["xp","all",2],["courage","inf",1.1]],"desc":"All units earn ranks 2x as fast; Infantry are 10% harder to break","sp":1},"us8":{"name":"Joint Logistics Command","at":"hq","cost":1400,"time":29,"fac":"US","fx":[["harv","all",1.2]],"desc":"Supply trucks carry 20% more"},"us9":{"name":"Aegis Combat System","at":"shipyard","cost":700,"time":19,"fac":"US","fx":[["dmg","naval",1.15],["taken","naval",0.9]],"desc":"Ships & boats +15% damage; Ships & boats take 10% less damage"},"tr1":{"name":"Maroon Beret Doctrine","at":"barracks","cost":1400,"time":29,"fac":"TR","fx":[["dmg","inf",1.2],["courage","inf",1.1]],"desc":"Infantry +20% damage; Infantry are 10% harder to break"},"tr2":{"name":"Mehmetcik Kevlar","at":"barracks","cost":1250,"time":27,"fac":"TR","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"tr3":{"name":"Aselsan Fire Control","at":"factory","cost":1200,"time":26,"fac":"TR","fx":[["dmg","tank",1.15],["dmg","arty",1.15],["dmg","aa",1.15]],"desc":"Tanks +15% damage; Artillery +15% damage; Air-defence & light vehicles +15% damage"},"tr4":{"name":"Altay Armor Package","at":"factory","cost":1300,"time":28,"fac":"TR","fx":[["hp","veh",1.15]],"desc":"Vehicles +15% hit points"},"tr5":{"name":"Bayraktar Datalink","at":"airfield","cost":1050,"time":24,"fac":"TR","fx":[["dmg","drone",1.3],["dmg","heli",1.25],["spd","drone",1.1]],"desc":"Drones +30% damage; Helicopters +25% damage; Drones move 10% faster","sp":1},"tr6":{"name":"KORAL Electronic Warfare","at":"airfield","cost":1250,"time":27,"fac":"TR","fx":[["taken","air",0.75]],"desc":"Aircraft take 25% less damage"},"tr7":{"name":"KALKAN Radar Net","at":"hq","cost":1200,"time":26,"fac":"TR","fx":[["detect","all",2],["rng","aa",1.15]],"desc":"Detect stealth units at 2x the distance; Air-defence & light vehicles +15% weapon range"},"tr8":{"name":"Defense Industry Agency","at":"hq","cost":1150,"time":26,"fac":"TR","fx":[["build","veh",0.8],["build","air",0.8]],"desc":"Vehicles build 25% faster; Aircraft build 25% faster"},"tr9":{"name":"MILGEM Hulls","at":"shipyard","cost":700,"time":19,"fac":"TR","fx":[["hp","naval",1.2],["regen","naval",3]],"desc":"Ships & boats +20% hit points; Ships & boats repair 3 hit points a second out of combat"},"il1":{"name":"Sayeret Training","at":"barracks","cost":1300,"time":28,"fac":"IL","fx":[["dmg","inf",1.1],["rof","inf",0.9]],"desc":"Infantry +10% damage; Infantry fire 11% faster"},"il2":{"name":"Ceramic Plate Vests","at":"barracks","cost":1000,"time":24,"fac":"IL","fx":[["hp","inf",1.15]],"desc":"Infantry +15% hit points"},"il3":{"name":"Trophy Protection","at":"factory","cost":1600,"time":32,"fac":"IL","fx":[["mis","veh",0.7]],"desc":"Vehicles take 30% less damage from missiles and rockets","sp":1},"il4":{"name":"Merkava Mk4 Modules","at":"factory","cost":1300,"time":28,"fac":"IL","fx":[["hp","tank",1.25],["regen","veh",2]],"desc":"Tanks +25% hit points; Vehicles repair 2 hit points a second out of combat"},"il5":{"name":"Elbit Countermeasures","at":"airfield","cost":1000,"time":24,"fac":"IL","fx":[["taken","air",0.8]],"desc":"Aircraft take 20% less damage"},"il6":{"name":"SPICE Guidance Kits","at":"airfield","cost":900,"time":22,"fac":"IL","fx":[["dmg","air",1.15],["rng","air",1.05]],"desc":"Aircraft +15% damage; Aircraft +5% weapon range"},"il7":{"name":"Iron Dome Radars","at":"hq","cost":1200,"time":27,"fac":"IL","fx":[["detect","all",2],["taken","bld",0.85]],"desc":"Detect stealth units at 2x the distance; Buildings take 15% less damage"},"il8":{"name":"Northern Supply Lines","at":"hq","cost":1400,"time":29,"fac":"IL","fx":[["harv","all",1.2]],"desc":"Supply trucks carry 20% more"},"il9":{"name":"Shayetet 13 Hulls","at":"shipyard","cost":650,"time":18,"fac":"IL","fx":[["taken","naval",0.85],["spd","naval",1.1]],"desc":"Ships & boats take 15% less damage; Ships & boats move 10% faster"},"eu1":{"name":"Coalition Body Armor","at":"barracks","cost":1250,"time":27,"fac":"EU","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"eu2":{"name":"Joint Rifle Drills","at":"barracks","cost":1050,"time":24,"fac":"EU","fx":[["rng","inf",1.1],["courage","inf",1.1]],"desc":"Infantry +10% weapon range; Infantry are 10% harder to break"},"eu3":{"name":"Rheinmetall Munitions","at":"factory","cost":1050,"time":24,"fac":"EU","fx":[["dmg","tank",1.15],["dmg","arty",1.2]],"desc":"Tanks +15% damage; Artillery +20% damage"},"eu4":{"name":"NATO Composite Armor","at":"factory","cost":1650,"time":33,"fac":"EU","fx":[["hp","veh",1.2]],"desc":"Vehicles +20% hit points"},"eu5":{"name":"Meteor Missiles","at":"airfield","cost":750,"time":20,"fac":"EU","fx":[["dmg","jet",1.25],["rng","jet",1.1]],"desc":"Jets +25% damage; Jets +10% weapon range"},"eu6":{"name":"Tiger Sensor Pods","at":"airfield","cost":750,"time":20,"fac":"EU","fx":[["dmg","heli",1.2],["taken","heli",0.85]],"desc":"Helicopters +20% damage; Helicopters take 15% less damage"},"eu7":{"name":"Networked Battlespace","at":"hq","cost":1800,"time":35,"fac":"EU","fx":[["rng","all",1.08]],"desc":"All units +8% weapon range","sp":1},"eu8":{"name":"Common Logistics Pool","at":"hq","cost":1600,"time":32,"fac":"EU","fx":[["harv","all",1.2],["regen","veh",1.5]],"desc":"Supply trucks carry 20% more; Vehicles repair 1.5 hit points a second out of combat"},"eu9":{"name":"FREMM Upgrades","at":"shipyard","cost":600,"time":17,"fac":"EU","fx":[["dmg","ship",1.2],["rng","ship",1.05]],"desc":"Warships +20% damage; Warships +5% weapon range"},"ua1":{"name":"Territorial Defense","at":"barracks","cost":1500,"time":31,"fac":"UA","fx":[["hp","inf",1.2],["courage","inf",1.2]],"desc":"Infantry +20% hit points; Infantry are 20% harder to break"},"ua2":{"name":"Javelin & NLAW Drills","at":"barracks","cost":900,"time":22,"fac":"UA","fx":[["dmg","atinf",1.3],["rng","atinf",1.1]],"desc":"Anti-tank infantry +30% damage; Anti-tank infantry +10% weapon range"},"ua3":{"name":"Captured Armor","at":"factory","cost":1800,"time":35,"fac":"UA","fx":[["salvage","all",0.25],["hp","veh",1.05]],"desc":"Destroyed enemy vehicles pay out 25% of their cost; Vehicles +5% hit points","sp":1},"ua4":{"name":"FPV Workshops","at":"factory","cost":800,"time":21,"fac":"UA","fx":[["build","drone",0.6],["dmg","drone",1.15]],"desc":"Drones build 67% faster; Drones +15% damage"},"ua5":{"name":"Western Air Packages","at":"airfield","cost":1250,"time":27,"fac":"UA","fx":[["dmg","air",1.15],["taken","air",0.85]],"desc":"Aircraft +15% damage; Aircraft take 15% less damage"},"ua6":{"name":"Storm Shadow Integration","at":"airfield","cost":700,"time":19,"fac":"UA","fx":[["rng","jet",1.15],["dmg","jet",1.15]],"desc":"Jets +15% weapon range; Jets +15% damage"},"ua7":{"name":"Starlink Terminals","at":"hq","cost":800,"time":21,"fac":"UA","fx":[["detect","all",1.5],["rof","arty",0.9]],"desc":"Detect stealth units at 1.5x the distance; Artillery fire 11% faster"},"ua8":{"name":"Grain Corridor","at":"hq","cost":1650,"time":33,"fac":"UA","fx":[["harv","all",1.25]],"desc":"Supply trucks carry 25% more"},"ua9":{"name":"Sea Baby Workshops","at":"shipyard","cost":600,"time":17,"fac":"UA","fx":[["dmg","boat",1.3],["spd","boat",1.1],["hp","boat",1.1]],"desc":"Patrol boats +30% damage; Patrol boats move 10% faster; Patrol boats +10% hit points"},"ru1":{"name":"Ratnik Combat Gear","at":"barracks","cost":1250,"time":27,"fac":"RU","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"ru2":{"name":"Motor Rifle Drills","at":"barracks","cost":1150,"time":26,"fac":"RU","fx":[["dmg","inf",1.15],["courage","inf",1.1]],"desc":"Infantry +15% damage; Infantry are 10% harder to break"},"ru3":{"name":"Kontakt-5 Reactive Armor","at":"factory","cost":1300,"time":28,"fac":"RU","fx":[["mis","veh",0.75]],"desc":"Vehicles take 25% less damage from missiles and rockets","sp":1},"ru4":{"name":"Massed Artillery Doctrine","at":"factory","cost":750,"time":20,"fac":"RU","fx":[["rof","arty",0.8],["splash","arty",1.15]],"desc":"Artillery fire 25% faster; Artillery +15% blast radius"},"ru5":{"name":"Krasukha Jamming","at":"airfield","cost":1000,"time":24,"fac":"RU","fx":[["taken","air",0.8]],"desc":"Aircraft take 20% less damage"},"ru6":{"name":"Kh-38 Missiles","at":"airfield","cost":900,"time":22,"fac":"RU","fx":[["dmg","air",1.2]],"desc":"Aircraft +20% damage"},"ru7":{"name":"Railway Troops","at":"hq","cost":1800,"time":35,"fac":"RU","fx":[["harv","all",1.2],["build","veh",0.85]],"desc":"Supply trucks carry 20% more; Vehicles build 18% faster"},"ru8":{"name":"Kasta Radar","at":"hq","cost":1200,"time":26,"fac":"RU","fx":[["detect","all",2],["rng","aa",1.15]],"desc":"Detect stealth units at 2x the distance; Air-defence & light vehicles +15% weapon range"},"ru9":{"name":"Kalibr Refit","at":"shipyard","cost":650,"time":18,"fac":"RU","fx":[["dmg","naval",1.15],["rng","ship",1.1]],"desc":"Ships & boats +15% damage; Warships +10% weapon range"},"ir1":{"name":"Mass Mobilization Drive","at":"barracks","cost":1400,"time":29,"fac":"IR","fx":[["build","inf",0.6]],"desc":"Infantry train 67% faster"},"ir2":{"name":"Martyrdom Spirit","at":"barracks","cost":1200,"time":27,"fac":"IR","fx":[["courage","inf",1.3],["dmg","inf",1.1]],"desc":"Infantry are 30% harder to break; Infantry +10% damage"},"ir3":{"name":"Thermobaric Warheads","at":"factory","cost":1200,"time":27,"fac":"IR","fx":[["dmg","arty",1.3],["dmg","drone",1.3],["splash","arty",1.2]],"desc":"Artillery +30% damage; Drones +30% damage; Artillery +20% blast radius","sp":1},"ir4":{"name":"Karrar Armor Kit","at":"factory","cost":1300,"time":28,"fac":"IR","fx":[["hp","veh",1.15]],"desc":"Vehicles +15% hit points"},"ir5":{"name":"Tomcat Overhaul","at":"airfield","cost":900,"time":22,"fac":"IR","fx":[["hp","air",1.2]],"desc":"Aircraft +20% hit points"},"ir6":{"name":"Phoenix Missile Stocks","at":"airfield","cost":900,"time":22,"fac":"IR","fx":[["dmg","air",1.15],["rng","jet",1.1]],"desc":"Aircraft +15% damage; Jets +10% weapon range"},"ir7":{"name":"Missile City Logistics","at":"hq","cost":1300,"time":28,"fac":"IR","fx":[["rof","arty",0.9],["harv","all",1.15]],"desc":"Artillery fire 11% faster; Supply trucks carry 15% more"},"ir8":{"name":"Passive Defense","at":"hq","cost":1300,"time":28,"fac":"IR","fx":[["taken","bld",0.8],["detect","all",2]],"desc":"Buildings take 20% less damage; Detect stealth units at 2x the distance"},"ir9":{"name":"Swarm Boat Tactics","at":"shipyard","cost":650,"time":18,"fac":"IR","fx":[["dmg","naval",1.2],["spd","boat",1.15]],"desc":"Ships & boats +20% damage; Patrol boats move 15% faster"},"sa1":{"name":"Royal Guard Equipment","at":"barracks","cost":1250,"time":27,"fac":"SA","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"sa2":{"name":"Special Forces Course","at":"barracks","cost":1300,"time":28,"fac":"SA","fx":[["dmg","inf",1.15],["rng","inf",1.05]],"desc":"Infantry +15% damage; Infantry +5% weapon range"},"sa3":{"name":"Abrams Upgrade Contract","at":"factory","cost":1200,"time":27,"fac":"SA","fx":[["hp","tank",1.2],["dmg","tank",1.1]],"desc":"Tanks +20% hit points; Tanks +10% damage"},"sa4":{"name":"Patriot Integration","at":"factory","cost":800,"time":20,"fac":"SA","fx":[["dmg","aa",1.2],["rng","aa",1.1]],"desc":"Air-defence & light vehicles +20% damage; Air-defence & light vehicles +10% weapon range"},"sa5":{"name":"AWACS Coverage","at":"airfield","cost":1000,"time":24,"fac":"SA","fx":[["rof","air",0.8]],"desc":"Aircraft fire 25% faster","sp":1},"sa6":{"name":"F-15 Sniper Pods","at":"airfield","cost":900,"time":22,"fac":"SA","fx":[["dmg","air",1.2]],"desc":"Aircraft +20% damage"},"sa7":{"name":"Aramco Logistics","at":"hq","cost":1900,"time":35,"fac":"SA","fx":[["harv","all",1.3]],"desc":"Supply trucks carry 30% more"},"sa8":{"name":"Vision 2030 Contracts","at":"hq","cost":950,"time":23,"fac":"SA","fx":[["build","all",0.9]],"desc":"All units build 11% faster"},"sa9":{"name":"Royal Navy Refit","at":"shipyard","cost":600,"time":18,"fac":"SA","fx":[["hp","naval",1.2]],"desc":"Ships & boats +20% hit points"},"ae1":{"name":"Presidential Guard Kit","at":"barracks","cost":1500,"time":30,"fac":"AE","fx":[["hp","inf",1.15],["dmg","inf",1.1]],"desc":"Infantry +15% hit points; Infantry +10% damage"},"ae2":{"name":"Desert Warfare School","at":"barracks","cost":750,"time":20,"fac":"AE","fx":[["spd","inf",1.1],["courage","inf",1.15]],"desc":"Infantry move 10% faster; Infantry are 15% harder to break"},"ae3":{"name":"Leclerc Upgrade","at":"factory","cost":1050,"time":24,"fac":"AE","fx":[["dmg","tank",1.2],["spd","tank",1.1]],"desc":"Tanks +20% damage; Tanks move 10% faster"},"ae4":{"name":"Pantsir Integration","at":"factory","cost":700,"time":19,"fac":"AE","fx":[["dmg","aa",1.25]],"desc":"Air-defence & light vehicles +25% damage"},"ae5":{"name":"Rafale SPECTRA","at":"airfield","cost":1250,"time":27,"fac":"AE","fx":[["taken","air",0.75]],"desc":"Aircraft take 25% less damage"},"ae6":{"name":"Al Tariq Guided Bombs","at":"airfield","cost":900,"time":22,"fac":"AE","fx":[["dmg","air",1.2]],"desc":"Aircraft +20% damage"},"ae7":{"name":"Defense Contracts","at":"hq","cost":1400,"time":30,"fac":"AE","fx":[["build","veh",0.75],["build","air",0.75]],"desc":"Vehicles build 33% faster; Aircraft build 33% faster","sp":1},"ae8":{"name":"Free Zone Trade","at":"hq","cost":1650,"time":33,"fac":"AE","fx":[["harv","all",1.25]],"desc":"Supply trucks carry 25% more"},"ae9":{"name":"Baynunah Refit","at":"shipyard","cost":700,"time":19,"fac":"AE","fx":[["taken","naval",0.85],["dmg","naval",1.1]],"desc":"Ships & boats take 15% less damage; Ships & boats +10% damage"},"pk1":{"name":"Baktar-Shikan Teams","at":"barracks","cost":1350,"time":28,"fac":"PK","fx":[["dmg","atinf",1.35],["rng","atinf",1.15],["hp","atinf",1.2]],"desc":"Anti-tank infantry +35% damage; Anti-tank infantry +15% weapon range; Anti-tank infantry +20% hit points","sp":1},"pk2":{"name":"Frontier Hardening","at":"barracks","cost":1600,"time":32,"fac":"PK","fx":[["hp","inf",1.25],["courage","inf",1.1]],"desc":"Infantry +25% hit points; Infantry are 10% harder to break"},"pk3":{"name":"Al-Khalid Armor","at":"factory","cost":1150,"time":26,"fac":"PK","fx":[["hp","tank",1.2],["mis","tank",0.85]],"desc":"Tanks +20% hit points; Tanks take 15% less damage from missiles and rockets"},"pk4":{"name":"Nasr Fire Control","at":"factory","cost":800,"time":20,"fac":"PK","fx":[["dmg","arty",1.2],["rng","arty",1.1]],"desc":"Artillery +20% damage; Artillery +10% weapon range"},"pk5":{"name":"JF-17 Avionics","at":"airfield","cost":950,"time":23,"fac":"PK","fx":[["dmg","air",1.15],["rof","jet",0.85]],"desc":"Aircraft +15% damage; Jets fire 18% faster"},"pk6":{"name":"Cobra Rotor Armor","at":"airfield","cost":800,"time":21,"fac":"PK","fx":[["taken","heli",0.75],["hp","heli",1.1]],"desc":"Helicopters take 25% less damage; Helicopters +10% hit points"},"pk7":{"name":"NLC Supply Convoys","at":"hq","cost":1600,"time":32,"fac":"PK","fx":[["harv","all",1.2],["regen","veh",1.5]],"desc":"Supply trucks carry 20% more; Vehicles repair 1.5 hit points a second out of combat"},"pk8":{"name":"Strategic Plans Division","at":"hq","cost":1200,"time":27,"fac":"PK","fx":[["detect","all",2],["taken","bld",0.85]],"desc":"Detect stealth units at 2x the distance; Buildings take 15% less damage"},"pk9":{"name":"Babur Missiles","at":"shipyard","cost":600,"time":18,"fac":"PK","fx":[["dmg","naval",1.2]],"desc":"Ships & boats +20% damage"},"in1":{"name":"Para SF Training","at":"barracks","cost":1350,"time":29,"fac":"IN","fx":[["dmg","inf",1.15],["courage","inf",1.1],["spd","inf",1.1]],"desc":"Infantry +15% damage; Infantry are 10% harder to break; Infantry move 10% faster"},"in2":{"name":"Bharat Kavach Armor","at":"barracks","cost":1250,"time":27,"fac":"IN","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"in3":{"name":"Cold Start Doctrine","at":"factory","cost":1450,"time":30,"fac":"IN","fx":[["spd","veh",1.15],["dmg","veh",1.1]],"desc":"Vehicles move 15% faster; Vehicles +10% damage","sp":1},"in4":{"name":"Arjun Armor Package","at":"factory","cost":1100,"time":25,"fac":"IN","fx":[["hp","tank",1.2],["hp","arty",1.15]],"desc":"Tanks +20% hit points; Artillery +15% hit points"},"in5":{"name":"Astra Missiles","at":"airfield","cost":900,"time":22,"fac":"IN","fx":[["dmg","air",1.15],["rng","jet",1.1]],"desc":"Aircraft +15% damage; Jets +10% weapon range"},"in6":{"name":"Rudra Armor","at":"airfield","cost":700,"time":19,"fac":"IN","fx":[["hp","heli",1.25],["dmg","heli",1.1]],"desc":"Helicopters +25% hit points; Helicopters +10% damage"},"in7":{"name":"Indian Railways","at":"hq","cost":1700,"time":33,"fac":"IN","fx":[["harv","all",1.2],["build","inf",0.85]],"desc":"Supply trucks carry 20% more; Infantry train 18% faster"},"in8":{"name":"NETRA Radar","at":"hq","cost":1100,"time":25,"fac":"IN","fx":[["detect","all",2],["rng","aa",1.1]],"desc":"Detect stealth units at 2x the distance; Air-defence & light vehicles +10% weapon range"},"in9":{"name":"BrahMos Integration","at":"shipyard","cost":600,"time":18,"fac":"IN","fx":[["dmg","ship",1.25],["rng","ship",1.1]],"desc":"Warships +25% damage; Warships +10% weapon range"},"cn1":{"name":"Patriotic Education","at":"barracks","cost":1600,"time":32,"fac":"CN","fx":[["rof","inf",0.8],["courage","inf",1.1]],"desc":"Infantry fire 25% faster; Infantry are 10% harder to break","sp":1},"cn2":{"name":"Type 21 Body Armor","at":"barracks","cost":1250,"time":27,"fac":"CN","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"cn3":{"name":"PHL Rocket Upgrades","at":"factory","cost":750,"time":20,"fac":"CN","fx":[["dmg","arty",1.25],["splash","arty",1.15]],"desc":"Artillery +25% damage; Artillery +15% blast radius"},"cn4":{"name":"Type 99A Armor","at":"factory","cost":1050,"time":24,"fac":"CN","fx":[["hp","tank",1.2],["hp","aa",1.1]],"desc":"Tanks +20% hit points; Air-defence & light vehicles +10% hit points"},"cn5":{"name":"J-20 Stealth Coating","at":"airfield","cost":850,"time":21,"fac":"CN","fx":[["taken","jet",0.75],["dmg","jet",1.15]],"desc":"Jets take 25% less damage; Jets +15% damage"},"cn6":{"name":"Z-10 Upgrades","at":"airfield","cost":700,"time":19,"fac":"CN","fx":[["dmg","heli",1.2],["hp","heli",1.15]],"desc":"Helicopters +20% damage; Helicopters +15% hit points"},"cn7":{"name":"Belt and Road Logistics","at":"hq","cost":1800,"time":35,"fac":"CN","fx":[["harv","all",1.2],["build","veh",0.85]],"desc":"Supply trucks carry 20% more; Vehicles build 18% faster"},"cn8":{"name":"Great Firewall","at":"hq","cost":1100,"time":25,"fac":"CN","fx":[["detect","all",2],["taken","bld",0.9]],"desc":"Detect stealth units at 2x the distance; Buildings take 10% less damage"},"cn9":{"name":"Type 055 Refit","at":"shipyard","cost":750,"time":20,"fac":"CN","fx":[["dmg","naval",1.15],["hp","naval",1.15]],"desc":"Ships & boats +15% damage; Ships & boats +15% hit points"},"kp1":{"name":"Mass Conscription","at":"barracks","cost":1900,"time":35,"fac":"KP","fx":[["build","inf",0.5]],"desc":"Infantry train 100% faster","sp":1},"kp2":{"name":"Juche Spirit","at":"barracks","cost":1150,"time":26,"fac":"KP","fx":[["courage","inf",1.25],["hp","inf",1.1]],"desc":"Infantry are 25% harder to break; Infantry +10% hit points"},"kp3":{"name":"Koksan Gun Crews","at":"factory","cost":700,"time":19,"fac":"KP","fx":[["rng","arty",1.1],["dmg","arty",1.15]],"desc":"Artillery +10% weapon range; Artillery +15% damage"},"kp4":{"name":"Chonma Armor","at":"factory","cost":1300,"time":28,"fac":"KP","fx":[["hp","veh",1.15]],"desc":"Vehicles +15% hit points"},"kp5":{"name":"MiG Overhaul Program","at":"airfield","cost":900,"time":22,"fac":"KP","fx":[["hp","air",1.2]],"desc":"Aircraft +20% hit points"},"kp6":{"name":"Hidden Air Bases","at":"airfield","cost":1000,"time":23,"fac":"KP","fx":[["build","air",0.6]],"desc":"Aircraft build 67% faster"},"kp7":{"name":"Tunnel Logistics","at":"hq","cost":1250,"time":27,"fac":"KP","fx":[["harv","all",1.15],["regen","inf",1]],"desc":"Supply trucks carry 15% more; Infantry repair 1 hit points a second out of combat"},"kp8":{"name":"Hwasong Readiness","at":"hq","cost":1000,"time":24,"fac":"KP","fx":[["taken","bld",0.8],["detect","all",1.5]],"desc":"Buildings take 20% less damage; Detect stealth units at 1.5x the distance"},"kp9":{"name":"Midget Submarine Tactics","at":"shipyard","cost":650,"time":18,"fac":"KP","fx":[["dmg","naval",1.2],["spd","boat",1.15]],"desc":"Ships & boats +20% damage; Patrol boats move 15% faster"},"kr1":{"name":"Warrior Platform","at":"barracks","cost":1500,"time":31,"fac":"KR","fx":[["hp","inf",1.2],["rng","inf",1.05]],"desc":"Infantry +20% hit points; Infantry +5% weapon range"},"kr2":{"name":"ROK Special Warfare","at":"barracks","cost":1250,"time":27,"fac":"KR","fx":[["dmg","inf",1.15],["spd","inf",1.1]],"desc":"Infantry +15% damage; Infantry move 10% faster"},"kr3":{"name":"K2 Fire Control","at":"factory","cost":1350,"time":29,"fac":"KR","fx":[["rng","tank",1.2],["rng","arty",1.2]],"desc":"Tanks +20% weapon range; Artillery +20% weapon range","sp":1},"kr4":{"name":"K2 Black Panther Armor","at":"factory","cost":1450,"time":30,"fac":"KR","fx":[["hp","tank",1.2],["mis","veh",0.85]],"desc":"Tanks +20% hit points; Vehicles take 15% less damage from missiles and rockets"},"kr5":{"name":"KF-21 Avionics","at":"airfield","cost":950,"time":23,"fac":"KR","fx":[["dmg","air",1.15],["taken","jet",0.85]],"desc":"Aircraft +15% damage; Jets take 15% less damage"},"kr6":{"name":"Surion Upgrades","at":"airfield","cost":650,"time":19,"fac":"KR","fx":[["hp","heli",1.2],["dmg","heli",1.1]],"desc":"Helicopters +20% hit points; Helicopters +10% damage"},"kr7":{"name":"Chaebol Contracts","at":"hq","cost":1150,"time":26,"fac":"KR","fx":[["build","veh",0.8],["build","air",0.8]],"desc":"Vehicles build 25% faster; Aircraft build 25% faster"},"kr8":{"name":"Green Pine Radar","at":"hq","cost":1100,"time":25,"fac":"KR","fx":[["detect","all",2],["rng","aa",1.1]],"desc":"Detect stealth units at 2x the distance; Air-defence & light vehicles +10% weapon range"},"kr9":{"name":"KDX Refit","at":"shipyard","cost":700,"time":19,"fac":"KR","fx":[["dmg","naval",1.2],["rng","ship",1.1]],"desc":"Ships & boats +20% damage; Warships +10% weapon range"},"eg1":{"name":"Sa'ka Commando Course","at":"barracks","cost":1350,"time":29,"fac":"EG","fx":[["dmg","inf",1.15],["spd","inf",1.1],["courage","inf",1.1]],"desc":"Infantry +15% damage; Infantry move 10% faster; Infantry are 10% harder to break"},"eg2":{"name":"Central Security Kit","at":"barracks","cost":1500,"time":30,"fac":"EG","fx":[["hp","inf",1.25]],"desc":"Infantry +25% hit points"},"eg3":{"name":"Veteran Tank Crews","at":"factory","cost":1200,"time":27,"fac":"EG","fx":[["hp","tank",1.2],["dmg","tank",1.1]],"desc":"Tanks +20% hit points; Tanks +10% damage","sp":1},"eg4":{"name":"Ramses Artillery","at":"factory","cost":850,"time":21,"fac":"EG","fx":[["dmg","arty",1.25],["splash","arty",1.15],["rof","arty",0.95]],"desc":"Artillery +25% damage; Artillery +15% blast radius; Artillery fire 5% faster"},"eg5":{"name":"Rafale Integration","at":"airfield","cost":900,"time":22,"fac":"EG","fx":[["dmg","air",1.15],["rng","jet",1.1]],"desc":"Aircraft +15% damage; Jets +10% weapon range"},"eg6":{"name":"Apache Maintenance","at":"airfield","cost":750,"time":20,"fac":"EG","fx":[["hp","heli",1.25],["taken","heli",0.9]],"desc":"Helicopters +25% hit points; Helicopters take 10% less damage"},"eg7":{"name":"Suez Canal Revenue","at":"hq","cost":1650,"time":33,"fac":"EG","fx":[["harv","all",1.25]],"desc":"Supply trucks carry 25% more"},"eg8":{"name":"October War Doctrine","at":"hq","cost":1200,"time":26,"fac":"EG","fx":[["courage","all",1.15],["taken","bld",0.9]],"desc":"All units are 15% harder to break; Buildings take 10% less damage"},"eg9":{"name":"Mistral Refit","at":"shipyard","cost":750,"time":20,"fac":"EG","fx":[["hp","naval",1.2],["dmg","naval",1.1]],"desc":"Ships & boats +20% hit points; Ships & boats +10% damage"},"cu1":{"name":"Guerrilla Training","at":"barracks","cost":1200,"time":27,"fac":"CU","fx":[["spd","inf",1.2],["dmg","inf",1.1]],"desc":"Infantry move 20% faster; Infantry +10% damage","sp":1},"cu2":{"name":"Territorial Troops Militia","at":"barracks","cost":1450,"time":30,"fac":"CU","fx":[["hp","inf",1.2],["courage","inf",1.15]],"desc":"Infantry +20% hit points; Infantry are 15% harder to break"},"cu3":{"name":"Grad Crews","at":"factory","cost":800,"time":21,"fac":"CU","fx":[["rof","arty",0.8],["splash","arty",1.1],["rng","arty",1.05]],"desc":"Artillery fire 25% faster; Artillery +10% blast radius; Artillery +5% weapon range"},"cu4":{"name":"Soviet-Era Overhaul","at":"factory","cost":1500,"time":31,"fac":"CU","fx":[["hp","veh",1.15],["regen","veh",1.5]],"desc":"Vehicles +15% hit points; Vehicles repair 1.5 hit points a second out of combat"},"cu5":{"name":"MiG-29 Refit","at":"airfield","cost":800,"time":21,"fac":"CU","fx":[["dmg","air",1.15],["spd","jet",1.1]],"desc":"Aircraft +15% damage; Jets move 10% faster"},"cu6":{"name":"Hind Armor Kits","at":"airfield","cost":700,"time":19,"fac":"CU","fx":[["hp","heli",1.2],["dmg","heli",1.15]],"desc":"Helicopters +20% hit points; Helicopters +15% damage"},"cu7":{"name":"Zafra Harvest","at":"hq","cost":1650,"time":33,"fac":"CU","fx":[["harv","all",1.25]],"desc":"Supply trucks carry 25% more"},"cu8":{"name":"Committees for Defense","at":"hq","cost":1200,"time":27,"fac":"CU","fx":[["detect","all",2],["xp","all",1.3]],"desc":"Detect stealth units at 2x the distance; All units earn ranks 1.3x as fast"},"cu9":{"name":"Coastal Patrol Refit","at":"shipyard","cost":650,"time":19,"fac":"CU","fx":[["dmg","naval",1.2],["hp","boat",1.1]],"desc":"Ships & boats +20% damage; Patrol boats +10% hit points"},"rs1":{"name":"Radwan Training","at":"barracks","cost":1300,"time":28,"fac":"RS","fx":[["dmg","inf",1.15],["courage","inf",1.1]],"desc":"Infantry +15% damage; Infantry are 10% harder to break"},"rs2":{"name":"Hill Fighters","at":"barracks","cost":1400,"time":29,"fac":"RS","fx":[["hp","inf",1.2]],"desc":"Infantry +20% hit points"},"rs3":{"name":"Kornet Ambush Teams","at":"barracks","cost":950,"time":22,"fac":"RS","fx":[["dmg","atinf",1.25],["rng","atinf",1.1]],"desc":"Anti-tank infantry +25% damage; Anti-tank infantry +10% weapon range"},"rs4":{"name":"Rocket Barrage Doctrine","at":"factory","cost":700,"time":19,"fac":"RS","fx":[["rof","arty",0.85],["rng","arty",1.05]],"desc":"Artillery fire 18% faster; Artillery +5% weapon range"},"rs5":{"name":"Drone Workshops","at":"factory","cost":1150,"time":25,"fac":"RS","fx":[["dmg","drone",1.2],["hp","drone",1.25]],"desc":"Drones +20% damage; Drones +25% hit points"},"rs6":{"name":"Fortified Positions","at":"hq","cost":1150,"time":26,"fac":"RS","fx":[["taken","bld",0.75],["rng","bld",1.15]],"desc":"Buildings take 25% less damage; Defenses +15% weapon range","sp":1},"rs7":{"name":"Supply Tunnels","at":"hq","cost":1650,"time":33,"fac":"RS","fx":[["harv","all",1.25]],"desc":"Supply trucks carry 25% more"},"rs8":{"name":"Underground Command","at":"hq","cost":1200,"time":27,"fac":"RS","fx":[["detect","all",2],["xp","all",1.3]],"desc":"Detect stealth units at 2x the distance; All units earn ranks 1.3x as fast"},"rs9":{"name":"Coastal Boat Raids","at":"shipyard","cost":600,"time":16,"fac":"RS","fx":[["dmg","boat",1.2],["spd","boat",1.1]],"desc":"Patrol boats +20% damage; Patrol boats move 10% faster"},"dw1":{"name":"Camouflage Netting","at":"barracks","cost":1900,"time":35,"fac":"DW","fx":[["camo","inf",1]],"desc":"Infantry turn invisible after standing still for 3 seconds","sp":1},"dw2":{"name":"Mountain Raiders","at":"barracks","cost":900,"time":22,"fac":"DW","fx":[["spd","inf",1.1],["dmg","inf",1.05]],"desc":"Infantry move 10% faster; Infantry +5% damage"},"dw3":{"name":"Hardened Militia","at":"barracks","cost":1250,"time":27,"fac":"DW","fx":[["hp","inf",1.15]],"desc":"Infantry +15% hit points"},"dw4":{"name":"Technical Armor","at":"factory","cost":1200,"time":26,"fac":"DW","fx":[["hp","veh",1.1]],"desc":"Vehicles +10% hit points"},"dw5":{"name":"Long-Range Rocket Crews","at":"factory","cost":750,"time":20,"fac":"DW","fx":[["rng","arty",1.1],["dmg","arty",1.1]],"desc":"Artillery +10% weapon range; Artillery +10% damage"},"dw6":{"name":"Raid Doctrine","at":"factory","cost":1100,"time":25,"fac":"DW","fx":[["spd","veh",1.1],["dmg","aa",1.1]],"desc":"Vehicles move 10% faster; Air-defence & light vehicles +10% damage"},"dw7":{"name":"Qat Trade Routes","at":"hq","cost":1400,"time":29,"fac":"DW","fx":[["harv","all",1.2]],"desc":"Supply trucks carry 20% more"},"dw8":{"name":"Mountain Lookouts","at":"hq","cost":1150,"time":25,"fac":"DW","fx":[["detect","all",2],["courage","inf",1.1]],"desc":"Detect stealth units at 2x the distance; Infantry are 10% harder to break"},"dw9":{"name":"Red Sea Raiders","at":"shipyard","cost":600,"time":18,"fac":"DW","fx":[["dmg","boat",1.2],["hp","boat",1.15]],"desc":"Patrol boats +20% damage; Patrol boats +15% hit points"}};
const UPGL={"US":["us1","us2","us3","us4","us5","us6","us7","us8","us9"],"TR":["tr1","tr2","tr3","tr4","tr5","tr6","tr7","tr8","tr9"],"IL":["il1","il2","il3","il4","il5","il6","il7","il8","il9"],"EU":["eu1","eu2","eu3","eu4","eu5","eu6","eu7","eu8","eu9"],"UA":["ua1","ua2","ua3","ua4","ua5","ua6","ua7","ua8","ua9"],"RU":["ru1","ru2","ru3","ru4","ru5","ru6","ru7","ru8","ru9"],"IR":["ir1","ir2","ir3","ir4","ir5","ir6","ir7","ir8","ir9"],"SA":["sa1","sa2","sa3","sa4","sa5","sa6","sa7","sa8","sa9"],"AE":["ae1","ae2","ae3","ae4","ae5","ae6","ae7","ae8","ae9"],"PK":["pk1","pk2","pk3","pk4","pk5","pk6","pk7","pk8","pk9"],"IN":["in1","in2","in3","in4","in5","in6","in7","in8","in9"],"CN":["cn1","cn2","cn3","cn4","cn5","cn6","cn7","cn8","cn9"],"KP":["kp1","kp2","kp3","kp4","kp5","kp6","kp7","kp8","kp9"],"KR":["kr1","kr2","kr3","kr4","kr5","kr6","kr7","kr8","kr9"],"EG":["eg1","eg2","eg3","eg4","eg5","eg6","eg7","eg8","eg9"],"CU":["cu1","cu2","cu3","cu4","cu5","cu6","cu7","cu8","cu9"],"RS":["rs1","rs2","rs3","rs4","rs5","rs6","rs7","rs8","rs9"],"DW":["dw1","dw2","dw3","dw4","dw5","dw6","dw7","dw8","dw9"]};
// Conquest fairness: every nation pays the same cost/time for the same tier at the same building (effects differ, price does not)
(function(){const TIER={barracks:[1300,1200,1100],factory:[1300,1100,1000],airfield:[1000,850],hq:[1400,1400,1200],shipyard:[650]};
for(const f in UPGL){const cnt={};for(const k of UPGL[f]){const U=UPG[k];if(!U)continue;const t=TIER[U.at];if(!t)continue;const n=cnt[U.at]=(cnt[U.at]||0);cnt[U.at]++;U.cost=t[Math.min(n,t.length-1)];U.time=Math.round(U.cost/46);}}})();
// an upgrade's name and the nation's own list (each nation has its own nine; signature upgrade marked sp)
function upgName(fac,k){return (UPG[k]&&UPG[k].name)||k;}
// Smuggling Routes: the same hq upgrade for every nation (counter to the Sanctions power; no stat effects, read by incMul/econTick)
UPG.smug={name:'Smuggling Routes',at:'hq',cost:1500,time:30,desc:'Back-channel trade: while you are under Sanctions your income loss drops from 20% to 8%, and a small trickle of cash keeps coming in.'};
// Ground-Penetrating Radar: HQ upgrade for nations WITHOUT tunnels - your HQ and Strike Centers reveal enemy tunnel entrances within 650 range
UPG.gpr={name:'Ground-Penetrating Radar',at:'hq',cost:1200,time:25,desc:'Counter to tunnel warfare: enemy Tunnel Network entrances within 650 range of your HQ or Strike Center are revealed (and can be shot). Only for nations without tunnels.'};
const GPR_R=650;
function upgList(fac){return (UPGL[fac]||[]).concat('smug',FACTIONS[fac]&&FACTIONS[fac].tunnels?[]:['gpr']);}
// Effect groups an upgrade can target (unit stats s; buildings only match 'bld')
function upgMatch(c,s,b){if(b)return c==='bld';switch(c){case 'all':return true;case 'inf':return s.armor==='light'&&s.dom==='ground';case 'rifle':return s.kind==='inf';case 'atinf':return s.cls==='at';
  case 'veh':return s.armor==='heavy'&&s.dom==='ground';case 'tank':case 'arty':case 'aa':case 'drone':case 'heli':case 'jet':case 'ship':case 'boat':return s.cls===c;case 'air':return s.dom==='air';case 'naval':return s.dom==='naval';}return false;}


// ---------- General Doctrines (Abdullah 2026-11-03): picked in the first 2 minutes; each has 4 perks bought with general-rank points ----------
// perk.fx uses the upgrade format [stat, unit group, value] (folded into upgAgg); perk.cost = [group, multiplier] cheaper units/buildings; the rest are special-cased in 03-sim by key
const GDOC={
 arm:{name:'Armor',short:'ARM',blurb:'Tanks and vehicles: faster production, tougher hulls, tank-hunter ambushes',perks:[
  {k:'a1',t:1,name:'Assembly Line',desc:'Vehicles build 25% faster',fx:[['build','veh',.75]]},
  {k:'a2',t:2,req:'a1',name:'Reactive Plating',desc:'Vehicles take 15% less damage',fx:[['taken','veh',.85]]},
  {k:'a3',t:2,req:'a1',name:'Tank-Hunter Ambush',desc:'Tanks holding still or sitting in cover deal 25% more damage'},
  {k:'a4',t:3,req:'a3',name:'Gun Stabilizers',desc:'Tanks shoot 12% faster and 10% farther, vehicles +8% damage',fx:[['rof','tank',.88],['rng','tank',1.1],['dmg','veh',1.08]]},
  {k:'a5',t:3,req:'a2',name:'Iron Fist',desc:'Vehicles have 10% more health and move 5% faster',fx:[['hp','veh',1.1],['spd','veh',1.05]]}]},
 gue:{name:'Guerrilla',short:'GUE',blurb:'Infantry swarms: cheap, hidden, booby-trapped',perks:[
  {k:'g1',t:1,name:'Cheap Recruits',desc:'Infantry cost 15% less',cost:['inf',.85]},
  {k:'g2',t:2,req:'g1',name:'Hidden Ambush',desc:'Infantry holding still or in cover deal 25% more damage'},
  {k:'g3',t:2,req:'g1',name:'Booby Traps',desc:'Idle infantry quietly lay hidden mines (up to 8)'},
  {k:'g4',t:3,req:'g2',name:'Hit and Run',desc:'Infantry move 10% faster and take 5% less damage',fx:[['spd','inf',1.1],['taken','inf',.95]]},
  {k:'g5',t:3,req:'g3',name:'Dug In',desc:'Infantry have 10% more health',fx:[['hp','inf',1.1]]}]},
 air:{name:'Air',short:'AIR',blurb:'Airfields, recon flights and air superiority',perks:[
  {k:'i1',t:1,name:'Cheap Airfields',desc:'Airfields cost 30% less',cost:['airfield',.7]},
  {k:'i2',t:2,req:'i1',name:'Recon Flights',desc:'Every 75 seconds a recon flight reveals an enemy area for 10 seconds'},
  {k:'i3',t:2,req:'i1',name:'Air Superiority',desc:'Aircraft deal 15% more damage and have 10% more health',fx:[['dmg','air',1.15],['hp','air',1.1]]},
  {k:'i4',t:3,req:'i3',name:'Quick Turnaround',desc:'Aircraft cost 15% less and build 15% faster',cost:['air',.85],fx:[['build','air',.85]]},
  {k:'i5',t:3,req:'i2',name:'Long-Range Sensors',desc:'Aircraft weapons reach 10% farther',fx:[['rng','air',1.1]]}]},
 art:{name:'Artillery',short:'ART',blurb:'Guns that see everything: counter-battery radar and creeping barrage',perks:[
  {k:'r1',t:1,name:'Counter-Battery Radar',desc:'Your artillery spots enemy guns the moment they fire'},
  {k:'r2',t:2,req:'r1',name:'Creeping Barrage',desc:'Artillery shells burst 25% wider',fx:[['splash','arty',1.25]]},
  {k:'r3',t:2,req:'r1',name:'Rapid Reload',desc:'Artillery reloads 12% faster and reaches 8% farther',fx:[['rof','arty',.88],['rng','arty',1.08]]},
  {k:'r4',t:3,req:'r3',name:'Gun Foundry',desc:'Artillery costs 15% less',cost:['arty',.85]},
  {k:'r5',t:3,req:'r2',name:'Heavy Shells',desc:'Artillery shells hit 10% harder',fx:[['dmg','arty',1.1]]}]}};
const GDOC_KEYS=Object.keys(GDOC);
const GDOC_AI={US:'arm',RU:'art',IL:'air',IR:'gue',TR:'air',EU:'arm',UA:'art',SA:'air',AE:'air',PK:'arm',IN:'arm',CN:'art',KP:'art',KR:'art',EG:'arm',CU:'gue',RS:'gue',DW:'gue'};
const GDOC_PERKS={};for(const d in GDOC)for(const p of GDOC[d].perks){p.doc=d;GDOC_PERKS[p.k]=p;}
/* Doctrine TREES (command-teams, Abdullah 2026-11-05): tier 1 root, two tier-2 branches, a tier-3 capstone on each branch (a perk needs the one it hangs from).
   The same numbers for every nation; a nation only changes the NAME of some perks (GDOC_FLV). Only ~4 rank points exist, so a general walks one branch. */
const GDOC_FLV={US:{a1:'Detroit Assembly Line',a4:'Abrams Fire Control',i3:'Top Gun Doctrine',r4:'Redstone Foundry'},RU:{a1:'Uralvagonzavod Line',a5:'Kontakt Armor',r1:'Zoopark Radar',r5:'God of War Shells'},
  CN:{a1:'Type-Line Production',r5:'Rocket Force Shells',g1:'People\'s War Recruits',g5:'Tunnel Warfare'},IR:{g3:'Hidden Mine Belts',g4:'Fast Attack Tactics',g5:'Hardened Positions',i2:'Drone Reconnaissance'},
  RS:{g3:'Mountain Booby Traps',g4:'Ambush and Fade',g5:'Dug-In Fighters'},DW:{g3:'Wadi Booby Traps',g4:'Raid and Vanish',g5:'Terrain Masters'},
  IL:{i2:'Aerial Reconnaissance',i3:'Air Dominance',i4:'Rapid Rearm',a3:'Merkava Ambush'},TR:{i2:'Drone Reconnaissance',a1:'Domestic Production Line'},KP:{r2:'Massed Barrage',r5:'Heavy Shell Stocks',g1:'Mass Mobilization'},
  UA:{g2:'Partisan Ambush',r1:'Counter-Battery Network',r3:'Rapid Fire Drills'},KR:{r3:'K9 Fire Drills',r4:'Domestic Foundry'},IN:{a1:'Arjun Production Line'},PK:{a2:'Al-Khalid Plating'}};
function gdName(fac,p){const f=GDOC_FLV[fac];return (f&&f[p.k])||p.name;}
function gdReq(T,p){return !p.req||gdHas(T,p.req);}
const GDOC_LATE=120;   // doctrine can be picked / changed until this many seconds into the battle
function gdHas(T,k){return !!(T&&T.gperk&&T.gperk[k]);}
function gdCostK(T,s,b,kind){if(!T||!T.gdoc)return 1;let m=1;const D=GDOC[T.gdoc];if(!D)return 1;for(const p of D.perks){if(!p.cost||!gdHas(T,p.k))continue;const g=p.cost[0];if(b?g===kind:(g==='air'?s.dom==='air':upgMatch(g,s,false)))m*=p.cost[1];}return m;}
const MILNAME={IR:'Popular Mobilization volunteers',RS:'Popular Mobilization volunteers',DW:'Popular Mobilization volunteers',US:'Contractors',RU:'PMC'};
const FL_MAX=4;   // flare / chaff charges per aircraft; refilled while landed (at an airfield)
const POWERS={
  bounty:{name:'Cash Bounty',desc:'Earn 15% of the cost of every enemy you destroy',passive:true},
  recon:{name:'Recon Sweep',desc:'Reveal an area for 25 seconds',cd:90,r:450},
  para:{name:'Paradrop',desc:'Drop 5 infantry anywhere on land',cd:150},
  barrage:{name:'Artillery Barrage',desc:'10 shells over a wide area',cd:170,r:180},
  repair:{name:'Emergency Repair',desc:'Restore 60% health to your forces in an area',cd:120,r:230},
  flare:{name:'Illumination Flares',desc:'Light up an area for about 30 seconds so everybody can see in it, friend and foe. Made for night battles',cd:60,r:300},
  mil:{name:'Fund Militia',desc:'Pay a local militia: 5 riflemen, an RPG team and an armed technical appear at the neutral spot nearest the front, under your command',cd:480,self:true},
  bb:{name:'Bunker Buster',desc:'Two guided heavy bombs on one spot. Costs $2200 each time and is not available in the first 5 minutes. Heavy damage to buildings in a small radius, and the ONLY thing that can destroy a Mountain Fortress (both bombs must hit)',cd:420,r:70,cash:2200},
  reinf:{name:'Call-In Reinforcements',desc:'Pay $1200: a platoon (2 tanks, an AA vehicle, 4 riflemen and an AT team) is called in from your nearest map edge and drives to your base. Arrives after 12 seconds, can be ambushed on the way. Not during the setup phase',cd:300,self:true,cash:1200},
  sanc:{name:'Sanctions',desc:'Sanction the richest enemy: their income drops 20% for 60 seconds (their Smuggling Routes upgrade cuts that to 8%)',cd:420,self:true},
};
// Every nation's own signature general power (unlocked like the others). Effects differ; cooldowns balance them.
POWERS.nat={name:'National Power',desc:'',cd:200,r:150,nat:true};
// Opening lull: no general power can be fired in the first 3 minutes of a battle. A power unlocked before then starts
// charging until 3:00 (the button shows "Ready in …"). Stops game-deciding first-second strikes on a base that has
// nothing but a truck and two riflemen (Partisan Uprising, Human Wave, Shahed/Bayraktar swarms, thermobaric strike).
const POW_OPEN=180;
const NATPOW={US:{name:'Shock and Awe',type:'strafe',cd:200,r:140,desc:'A-10 gun run: a line of cannon fire and bombs across the target'},
  TR:{name:'Bayraktar Swarm',type:'drones',n:4,cd:190,r:120,desc:'Four Kargu drones launch from your base and hunt around the target'},
  IL:{name:'Mossad Intelligence',type:'intel',cd:180,r:650,desc:'Reveal every enemy building for 25s and laser-mark enemies near the target (+25% damage taken)'},
  EU:{name:'Coalition Supply Drop',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  UA:{name:'Partisan Uprising',type:'partisans',n:6,cd:200,r:90,desc:'Six partisans rise up at the target and ambush the enemy'},
  RU:{name:'Thermobaric Strike',type:'thermo',cd:230,r:150,desc:'A single huge thermobaric warhead after 3 seconds'},
  IR:{name:'Shahed Swarm',type:'drones',n:5,cd:200,r:120,ow:1,desc:'Five Shahed loitering munitions launch from your base toward the target'},
  SA:{name:'Petrodollar Contract',type:'cash',cd:300,desc:'+$2000 immediately',self:true},
  AE:{name:'Mercenary Contract',type:'mercs',cd:230,desc:'Two tanks and two air-defence vehicles arrive at your HQ',self:true},
  PK:{name:'Nasr Tactical Strike',type:'emp',cd:220,r:200,desc:'Blast at the target that also disables enemy vehicles and buildings nearby for 10s'},
  IN:{name:'Akash Shield',type:'shield',cd:200,r:280,desc:'Your forces in the area take 60% less damage for 20s'},
  CN:{name:'Cyber Blackout',type:'cyber',cd:200,r:380,desc:'Disable every enemy building in the area for 18s and reveal it'},
  KP:{name:'Human Wave',type:'wave',n:10,cd:210,desc:'Ten riflemen pour out of your HQ and charge the target'},
  KR:{name:'K9 Thunder Barrage',type:'precise',cd:180,r:80,desc:'Eight accurate howitzer shells on a tight area'},
  EG:{name:'Smoke and Crossing',type:'smoke',cd:180,r:260,desc:'Smoke screen for 20s: your units inside are hidden and move 25% faster'},
  CU:{name:'Revolutionary Fervor',type:'fervor',cd:200,desc:'All your units are fearless and deal 15% more damage for 25s',self:true},
  RS:{name:'Labbayk Ya Hussein',type:'labbayk',cd:200,desc:'Infantry heal 50%, become fearless and deal 20% more damage for 25s',self:true},
  DW:{name:'Desert Raid',type:'raid',cd:190,r:450,desc:'Vehicles move 35% faster for 25s and the target area is revealed',self:false}};
function natPow(fac){return NATPOW[fac]||NATPOW.US;}
// Each nation's take on the five shared general powers. Every nation trades strengths for weaknesses so the totals
// stay even (checked in tests): m = bounty %, rm = radius, tm = duration, nm = count/shells, dm = shell damage,
// pm = repair amount, cdm = cooldown, mix = who jumps out of the plane.
const PARA_AT=['at','at','inf','at','inf','at','inf','at','at','inf','at'],PARA_INF=['inf','inf','inf','inf','at','inf','inf','inf','at','inf','inf'];
const GPOW={
 US:{bounty:{name:'Combat Bonus',m:1.2},recon:{name:'Satellite Pass',rm:1.2,tm:.8},para:{name:'Airborne Assault',fx:'vet'},barrage:{name:'Precision Fires',nm:.6,dm:1.6,rm:.7},repair:{name:'Forward Repair',pm:.8}},
 TR:{bounty:{name:'War Booty',m:.9},recon:{name:'Drone Overwatch',fx:'mark',rm:.9,tm:1.6},para:{name:'Commando Drop'},barrage:{name:'Firtina Fire Mission'},repair:{name:'Field Repair'}},
 IL:{bounty:{name:'Intelligence Bounty'},recon:{name:'Signals Intercept',fx:'detect',rm:1.35,cdm:1.3},para:{name:'Commando Raid',nm:.8,cdm:.75},barrage:{name:'Precision Strike',nm:.5,dm:1.8,rm:.6},repair:{name:'Field Repair'}},
 EU:{bounty:{name:'Coalition Funds',m:.9},recon:{name:'AWACS Sweep',rm:1.1,cdm:1.1},para:{name:'Rapid Reaction Force'},barrage:{name:'Coalition Fire Mission'},repair:{name:'Logistics Corps',fx:'rearm',pm:1.1,rm:1.1,cdm:1.1}},
 UA:{bounty:{name:'Trophy Brigade',m:.82},recon:{name:'Drone Spotters',tm:1.3},para:{name:'Territorial Defense',fx:'dig',nm:1.4,cdm:1.3,mix:PARA_INF},barrage:{name:'Precision Rocket Strike',nm:.6,dm:1.5},repair:{name:'Field Workshops',pm:1.1}},
 RU:{bounty:{name:'Trophy Pay'},recon:{name:'Recon Flight',rm:.9},para:{name:'Air Assault Drop'},barrage:{name:'Massed Fires',fx:'fire',nm:1.6,dm:.8,rm:1.4,cdm:1.15},repair:{name:'Field Repair'}},
 IR:{bounty:{name:'Spoils of War'},recon:{name:'Neighborhood Informants',rm:1.2,tm:1.2,cdm:1.1},para:{name:'Takavar Drop',nm:1.2,cdm:1.2},barrage:{name:'Missile Salvo',nm:.8,dm:1.2},repair:{name:'Self-Reliance Repairs',fx:'rally',pm:.87}},
 SA:{bounty:{name:'Royal Bounty',fx:'salvage',m:1.35},recon:{name:'AWACS Sweep',rm:1.25},para:{name:'Royal Guard Drop',nm:.7},barrage:{name:'Air Strike Package',nm:.8,dm:1.1},repair:{name:'Contractor Repair',pm:.95}},
 AE:{bounty:{name:'Contract Bonus',m:1.1},recon:{name:'ISR Sweep',rm:1.1,tm:1.1},para:{name:'Presidential Guard Drop',nm:.8,cdm:.9},barrage:{name:'Guided Munitions',fx:'emp',nm:.5,dm:1.9,rm:.6},repair:{name:'Contractor Repair',pm:.93}},
 PK:{bounty:{name:'Battle Honors',m:.9},recon:{name:'Recon Sweep'},para:{name:'SSG Tank Hunters',mix:PARA_AT},barrage:{name:'Artillery Fire Plan',fx:'smoke'},repair:{name:'Armor Workshops',pm:1.1}},
 IN:{bounty:{name:'Battle Honors',m:.8},recon:{name:'Satellite Pass'},para:{name:'Para Commandos',fx:'vet',nm:1.2,cdm:1.1},barrage:{name:'Pinaka Salvo',nm:1.3,dm:.8,rm:1.2},repair:{name:'Rapid Repair',pm:1.1}},
 CN:{bounty:{name:'Unit Merit',m:.8},recon:{name:'Beidou Sweep',fx:'detect',rm:1.3,cdm:1.1},para:{name:'Mass Airdrop',nm:1.5,cdm:1.25,mix:PARA_INF},barrage:{name:'Rocket Barrage',nm:1.4,dm:.7},repair:{name:'Field Repair',pm:.9}},
 KP:{bounty:{name:'Captured Spoils',m:1.1},recon:{name:'Spy Network',rm:.8,tm:1.3},para:{name:'Special Purpose Forces',fx:'stealth',nm:1.3,cdm:1.2,mix:PARA_INF},barrage:{name:'Long-Range Artillery',nm:1.5,rm:1.3,cdm:1.3},repair:{name:'Juche Repairs',pm:.8}},
 KR:{bounty:{name:'Merit Bonus',m:.85},recon:{name:'Early Warning Sweep',rm:1.15,tm:1.1},para:{name:'Airborne Brigade',nm:.85},barrage:{name:'Counter-Battery Fire'},repair:{name:'Rapid Restoration',fx:'shield',pm:1.15,rm:1.1,cdm:1.1}},
 EG:{bounty:{name:'Battle Honors'},recon:{name:'Recon Sweep',rm:.9},para:{name:'Airborne Rangers'},barrage:{name:'Crossing Bombardment',fx:'smoke',nm:1.1,cdm:1.05},repair:{name:'Armor Workshops',pm:1.25,rm:.9,cdm:1.05}},
 CU:{bounty:{name:'Expropriation'},recon:{name:'Peasant Informants',rm:1.1,tm:1.3,cdm:1.05},para:{name:'Militia Infiltration',fx:'stealth',nm:1.5,cdm:1.35,mix:PARA_INF},barrage:{name:'Mortar Barrage',nm:1.2,dm:.7,rm:.8},repair:{name:'Make-Do Repairs',pm:.9}},
 RS:{bounty:{name:'Spoils of War',m:.88},recon:{name:'Mountain Watchers',rm:1.1,tm:1.2,cdm:1.1},para:{name:'Hidden Fighters',nm:1.1},barrage:{name:'Rocket Barrage',nm:1.4,dm:.75,rm:1.3},repair:{name:'Tunnel Workshops',fx:'rally',pm:.9}},
 DW:{bounty:{name:'Raid Plunder'},recon:{name:'Tribal Scouts',fx:'mark',rm:1.2,tm:.8},para:{name:'Desert Raid Party',cdm:.85},barrage:{name:'Mortar Salvo',nm:.8},repair:{name:'Oasis Repairs'}},
};
// rough value of a nation's tweak to one power (1 = standard); used by the fairness test
function gpowVal(k,g){if(!g)return 1;const c=(g.cdm||1)*(g.fx?1.1:1),fxv=g.fx?1.1:1;return fxv*(k==='bounty'?(g.m||1)/(g.fx?1.1:1):k==='recon'?(g.rm||1)*Math.sqrt(g.tm||1)/c:k==='para'?(g.nm||1)/c:k==='barrage'?(g.nm||1)*(g.dm||1)/c:(g.pm||1)*(g.rm||1)/c);}
function gpowDesc(k,P,g){const f=(v,a,b)=>v&&Math.abs(v-1)>.01?(v>1?a:b)+' '+(v>1?'+':'−')+Math.round(Math.abs(v-1)*100)+'%':null;
  const L=[f(g.m,'bounty','bounty'),f(g.rm,'radius','radius'),f(g.tm,'duration','duration'),f(g.nm,k==='barrage'?'shells':'troops',k==='barrage'?'shells':'troops'),f(g.dm,'shell damage','shell damage'),f(g.pm,'repair','repair'),f(g.cdm,'cooldown','cooldown'),g.mix===PARA_AT?'mostly anti-tank teams':g.mix===PARA_INF?'mostly riflemen':null].filter(Boolean);
  return P.desc+(L.length?' ('+L.join(', ')+')':'')+(g.fx?'. Special: '+GFX_TXT[g.fx]+(k!=='bounty'?' (cooldown +10%)':' (bounty −10%)'):'');}
const GFX_TXT={vet:'troops arrive as veterans',dig:'troops arrive dug in (35% less damage until they move)',stealth:'troops land hidden and stay unseen until they move or fire',mark:'enemies in the area are marked - your forces do 25% more damage to them',detect:'also exposes hidden and stealthed enemy units in the area',fire:'leaves the ground burning for 8 seconds',emp:'disables enemy vehicles in the area for 4 seconds',smoke:'lays a smoke screen that hides your units inside it',rearm:'units in the area also fire 25% faster for 12 seconds',rally:'units in the area rally instantly and are fearless for 15 seconds',shield:'units in the area take 25% less damage for 12 seconds',salvage:'also refunds 15% of the cost of each unit you lose'};
function powInfo(k,fac){const P0=POWERS[k];if(!P0)return null;const P=P0;if(k==='mil'){const n=MILNAME[fac]||'Local militia';return Object.assign({},P,{name:'Fund '+n,desc:P.desc.replace('a local militia','the '+n)});}if(!P.nat){const g=(GPOW[fac]||{})[k];if(!g)return P;return Object.assign({},P,g,{name:g.name||P.name,desc:gpowDesc(k,P,g),cd:P.cd?Math.round(P.cd*(g.cdm||1)*(g.fx?1.1:1)):P.cd,r:P.r?Math.round(P.r*(g.rm||1)):P.r});}return Object.assign({},P,natPow(fac));}
// General ranks get steadily harder to earn; each promotion gives a point. Powers unlock for 1 point and can be
// raised to level 2 (2 more points) and level 3 (3 more): bigger effect, shorter cooldown.
const RANKS=[0,2500,7000,14000,24000,38000,56000,80000];
const PLV=[1,1.4,1.8],PCD=[1,.85,.7];
// The national special unit is locked until general rank 2, and gets tougher and deadlier at ranks 4 and 6.
const SPEC_RANK=2;function specMult(T){return T.rank>=6?1.4:T.rank>=4?1.2:1;}
const VET=['','Veteran','Elite','Heroic'];

// Balance pass: per-faction and per-unit cost factors computed so every faction's combat value per credit
// (Lanchester: dps x hp / cost^2, against each unit's intended target) lands near the same level, after allowing
// for its economic and passive bonuses. Militias get a little extra to make up for having no air force or navy.
// Round 2 (from AI tourneys, both slots): SA +5%, UA/RS +3% dearer; IL -5%, KR -4%, TR -3% cheaper (overall '_').
// Round 3 (three Node round robins, 612 games, orch/aitourney.mjs): strongest dearer (DW +12%, SA +11%, KP +3%, EG/US +2%),
// weakest cheaper (RU -8%, PK -3%, AE -5%, TR -4%, KR -5%, IL -2.5%); covert nations (IL, AE) no longer park a third of their army in ambushes.
// Round 4 (504 Node games after the cycle-14 AI tactics, orch/aitourney.mjs): DW -7%, IR -6%, IN -2%, EG -3%, TR -4%, CU -4%, RU -1% cheaper;
// CN +2%, PK +3% dearer.
const BAL={"US":{"arty":0.895,"_":0.988,"jet":1.001},"TR":{"arty":0.906,"drone":0.913,"_":0.838},"IL":{"arty":0.861,"_":0.858},"EU":{"arty":0.923,"_":0.898},"UA":{"arty":0.861,"drone":0.83,"_":0.945},"RU":{"arty":1.456,"_":0.93,"inf":0.908,"at":0.951},"IR":{"arty":0.963,"_":0.945,"inf":1.04,"at":1.058},"SA":{"arty":0.861,"jet":1.039,"_":1.112},"AE":{"arty":0.903,"_":0.907},"PK":{"arty":0.903,"_":0.973,"at":1.08,"inf":1.026},"IN":{"_":1.0},"CN":{"inf":1.202,"at":1.142,"_":1.05,"jet":0.999},"KP":{"arty":1.306,"_":1.164},"KR":{"_":0.862},"EG":{"arty":0.861,"_":0.95,"inf":1.139,"at":1.062},"CU":{"_":1.043},"RS":{"inf":1.006,"at":1.044,"tank":0.72,"aa":1.115,"arty":1.161,"drone":1.22,"boat":1.15,"_":1.213},"DW":{"tank":1.116,"aa":1.383,"boat":1.15,"_":1.15,"at":0.952}};
// Military signatures: what each nation's forces excel at (multipliers on that nation's units/structures).
// The balance factors (BAL, from bal2.js) then even out each nation's overall value, so strengths cost something elsewhere.
// Military doctrine: how each nation fights, layered on top of its stat bonuses.
//  shock    - aggressive manoeuvre: +15% damage while advancing or attacking, vehicles 10% faster
//  barrage  - artillery-centric: guns/rockets reach 15% farther, 30% bigger blast, fire 15% faster, cost 15% less,
//             and shellfire suppresses 50% harder
//  covert   - infantry and anti-tank teams are camouflaged, and the first shot from hiding hits 50% harder
//  ambush   - asymmetric warfare: infantry, AT teams and drones holding still or in cover deal 20% more damage
//  hitrun   - after firing, infantry and light vehicles sprint 25% faster for 3 seconds
//  homeland - +15% damage fighting within 700 of their own buildings
const DOCT={US:{name:'Aggressive Maneuver',shock:1},RU:{name:'Heavy Barrages',barrage:1},IL:{name:'Covert Operations',covert:1},
  IR:{name:'Asymmetric Warfare',ambush:1,hitrun:1},TR:{name:'Drone Warfare',hitrun:1},EU:{name:'Combined Arms',homeland:1},UA:{name:'Homeland Defense',homeland:1,hitrun:1},
  SA:{name:'Air Superiority',shock:1},AE:{name:'High-Tech Precision',covert:1},PK:{name:'Tank Hunters',ambush:1},IN:{name:'Cold Start Offensive',shock:1},
  CN:{name:'Mass & Information War',barrage:1},KP:{name:'Artillery Siege',barrage:1},KR:{name:'Active Defense',homeland:1},EG:{name:'Armored Corps',shock:1},
  CU:{name:'Guerrilla War',ambush:1,hitrun:1},RS:{name:'Fortress & Ambush',ambush:1,homeland:1},DW:{name:'Desert Raiders',hitrun:1,ambush:1}};
const DOCT_TXT={shock:'+15% damage while advancing or attacking; vehicles 10% faster',barrage:'artillery reaches 15% farther, bigger blasts, faster reloads, 15% cheaper; shellfire suppresses harder',
  covert:'infantry and AT teams are camouflaged; first shot from hiding hits 50% harder',ambush:'infantry, AT teams and drones holding still or in cover deal 20% more damage',
  hitrun:'infantry and light vehicles sprint 25% faster for 3s after firing',homeland:'+15% damage near their own buildings'};
const XL={US:{jet:{dmg:1.25,hp:1.15},heli:{dmg:1.25,hp:1.1}},TR:{drone:{cost:.9,time:.7,hp:1.15,dmg:1.05}},IL:{},EU:{arty:{dmg:1.15},tank:{hp:1.12,cost:.92}},
  UA:{drone:{cost:.65,time:.6},boat:{dmg:1.4,spd:1.15}},RU:{arty:{hp:1.3,dmg:1.15}},IR:{boat:{spd:1.18,cost:.88,dmg:1.15},sub:{cost:.7,hp:.7,spd:1.1},drone:{cost:.75,time:.55,spd:1.1},arty:{rng:1.12,dmg:1.15}},
  SA:{jet:{cost:.75,hp:1.2,dmg:1.1},aa:{rng:1.2}},AE:{aa:{dmg:1.15},heli:{dmg:1.15}},PK:{at:{dmg:1.2}},IN:{ship:{hp:1.25},boat:{hp:1.15}},
  CN:{ship:{hp:1.3,dmg:1.15},boat:{hp:1.15},arty:{dmg:1.1}},KP:{arty:{cost:.8,rng:1.1}},KR:{arty:{rof:.8}},EG:{tank:{cost:.78}},CU:{arty:{cost:.8}},
  RS:{drone:{cost:.75,time:.6,dmg:1.15,hp:1.2},arty:{rng:1.12,dmg:1.12,rof:.9},at:{hp:1.15}}};
const TRN={US:['LCAC Hovercraft','CH-47 Chinook'],TR:['Landing Craft Tank','T-70 Black Hawk'],IL:['Landing Craft','CH-53 Yasur'],EU:['LCM Landing Craft','NH90 Transport'],UA:['Landing Craft','Mi-8 Hip'],RU:['Zubr Hovercraft','Mi-8 Hip'],
  IR:['Tondar Hovercraft','Bell 214 Transport'],SA:['Landing Craft Utility','UH-60 Black Hawk'],AE:['Landing Craft','CH-47 Chinook'],PK:['Landing Craft Utility','Mi-17 Hip'],IN:['Landing Craft Utility','Mi-17 Hip'],CN:['Type 726 Hovercraft','Z-8 Transport'],
  KP:['Kongbang Hovercraft','Mi-8 Hip'],KR:['Solgae Hovercraft','KUH-1 Surion'],EG:['Landing Craft','CH-47 Chinook'],CU:['Landing Craft','Mi-8 Hip'],RS:['Fishing Dhow Ferry','Mi-8 Hip'],DW:['Fishing Dhow Ferry','Mi-8 Hip']};
for(const k in TRN){const F=FACTIONS[k];if(!F)continue;F.units=F.units||{};F.units.lander=Object.assign({},F.units.lander||{},{name:TRN[k][0]});F.units.airlift=Object.assign({},F.units.airlift||{},{name:TRN[k][1]});}
const XLB={RS:{turret:{hp:1.4,dmg:1.25,rng:1.12},tunnel:{hp:1.35,dmg:1.3},sam:{hp:1.3}},IL:{sam:{rng:1.3,dmg:1.3}},KR:{turret:{rng:1.15}},SA:{sam:{rng:1.2}}};
const sc={};
// National names for the submarine and the coastal anti-ship battery (stats are shared; Iran's are cheaper and quicker, see MODS).
const SUBN={US:'Virginia-class Submarine',TR:'Preveze-class Submarine',IL:'Dolphin-class Submarine',EU:'Barracuda-class Submarine',UA:'Kilo-class Submarine',RU:'Yasen-class Submarine',IR:'Ghadir Midget Submarine',SA:'Type 209 Submarine',AE:'Scorpene Submarine',PK:'Agosta 90B Submarine',IN:'Kalvari-class Submarine',CN:'Type 039 Yuan Submarine',KP:'Romeo-class Submarine',KR:'Son Won-il Submarine',EG:'Type 209/1400 Submarine',CU:'Foxtrot Submarine'};
const MDN={US:'Patriot Battery',IL:'Iron Dome Battery',RU:'S-400 Triumf',CN:'HQ-9 Battery',IN:'Akash Battery',TR:'Hisar Battery',KR:'KM-SAM Battery',IR:'Bavar-373 Battery',EU:'SAMP/T Battery',UA:'NASAMS Battery',SA:'THAAD Battery',AE:'THAAD Battery',PK:'HQ-16 Battery',KP:'KN-06 Battery',EG:'S-300 Battery',CU:'S-125 Pechora Battery',RS:'Sayyad-4B Battery',DW:'Khordad-15 Battery'};   // Conquest: SAM sites are every nation's missile defence (they intercept part of a strike salvo)
const COASTN={US:'Naval Strike Missile Battery',TR:'Atmaca Coastal Battery',IL:'Gabriel Coastal Battery',EU:'Exocet MM40 Battery',UA:'Neptune Coastal Battery',RU:'Bastion-P Coastal Battery',IR:'Noor / Qader Coastal Missiles',SA:'Harpoon Coastal Battery',AE:'Exocet Coastal Battery',PK:'Zarb Coastal Battery',IN:'BrahMos Coastal Battery',CN:'YJ-62 Coastal Battery',KP:'Kumsong Coastal Battery',KR:'Haeseong Coastal Battery',EG:'Otomat Coastal Battery',CU:'P-15 Termit Battery',RS:'Mountain Anti-Ship Rockets',DW:'Coffee Coast Rocket Battery'};
const FASTN={IR:'Swarm Boat',RS:'Coastal Swarm Boat',DW:'Red Sea Skiff',US:'Patrol Boat',RU:'Raptor Patrol Boat',CN:'Type 022 Missile Boat',KP:'Sohae Rocket Boat',TR:'Fast Attack Craft',IL:'Shaldag Patrol Boat',UA:'Gunboat'};
// nations-new1: copy Egypt's per-nation table rows to the new nations (names/flavour overridden from NEWNAT); other modules alias via NEWNAT[k].base.
for(const k in NEWNAT){const N=NEWNAT[k],b=N.base;
  for(const T of [UPLINK,ECON,COURAGE,GDOC_AI,BAL,XL,TRN,SUBN,MDN,COASTN]){if(T[b]!==undefined&&T[k]===undefined)T[k]=JSON.parse(JSON.stringify(T[b]));}
  if(N.morale)MORALE_STYLE[k]=N.morale;NATPOW[k]=N.pow;GPOW[k]=Object.assign({},GPOW[b],N.gp);DOCT[k]=N.doct;
  if(UPLINK[b])UPLINK[k]=[N.uplink||(k==='IQ'?'Rocket Command (Al-Faw)':'Missile Command (Qalamoun)'),UPLINK[b][1]];
  ECON[k]=N.econ||(k==='IQ'?'Basra Oil Terminal':'Phosphate & Cotton Board');
  if(N.sub)SUBN[k]=N.sub;if(N.md)MDN[k]=N.md;if(N.coast)COASTN[k]=N.coast;if(N.trn)TRN[k]=N.trn;
  UPGL[k]=[];N.upg.forEach((nm,i)=>{const o=Object.assign({},UPG[b+(i+1)]),id=k.toLowerCase()+(i+1);o.name=nm;o.fac=k;UPG[id]=o;UPGL[k].push(id);});}
for(const f in FASTN){const F=FACTIONS[f];if(F){F.units=F.units||{};F.units.fast=Object.assign({name:FASTN[f]},F.units.fast||{});}}
for(const f in SUBN){const F=FACTIONS[f];if(F&&!F.noShip){F.units=F.units||{};F.units.sub=Object.assign({name:SUBN[f]},F.units.sub||{});}}
function stats(fac,kind){const k=fac+'|'+kind;if(sc[k])return sc[k];const F=FACTIONS[fac],m=F.mods||{};
  const s=Object.assign({},BASE[kind],(F.units||{})[kind]||{});s.kind=kind;if(kind==='drone'&&F.noAir)s.from='factory';   /* drones fly from the Airfield (Abdullah 2026-11-08); nations without one keep them at the War Factory */if(s.fake){const rs=stats(fac,s.fake);s.name=rs.name;s.r=rs.r;s.spd=rs.spd;s.cls=rs.cls;s.armor=rs.armor;s.hpShow=rs.hp;}if(kind==='cleric'&&fac==='KP')s.name='Dear Leader';{const X=(XL[fac]||{})[kind];if(X)for(const q in X)if(s[q]!=null)s[q]*=X[q];if(X)s.xl=1;}const inf=s.armor==='light',veh=s.armor==='heavy'||s.cls==='heli'||s.cls==='jet';
  let c=s.cost*(m.cost||1);if(inf)c*=(m.infCost||1);const B=BAL[fac];if(B)c*=(B._||1)*(B[kind]||1);s.cost=Math.round(c/25)*25;if(kind==='champ')s.cost=BASE.champ.cost;if(inf)s.time*=(m.infTime||1);
  s.hp=Math.max(1,Math.round(s.hp*(m.hp||1)*(veh?(m.vehHp||1):1)));if(m.spd&&s.dom!=='air')s.spd*=m.spd;{const D=DOCT[fac]||{};if(D.barrage&&s.cls==='arty'){s.rng*=1.15;if(s.splash)s.splash*=1.3;s.rof*=.85;s.cost=Math.round(s.cost*.85/25)*25;}if(D.covert&&(s.cls==='inf'||s.cls==='at')&&s.dom==='ground'&&kind!=='hacker')s.camo=1;if(D.shock&&s.armor==='heavy'&&s.dom==='ground')s.spd*=1.1;}s.dmg*=(m.dmg||1);s.aggro=kind==='drone'?290:s.rng+90;if(s.aa===undefined)s.aa=0;return sc[k]=s;}
function bstats(fac,kind){const k=fac+'#'+kind;if(sc[k])return sc[k];const m=FACTIONS[fac].mods||{};const s=Object.assign({},STRUCT[kind]);s.kind=kind;if(kind==='coast'&&COASTN[fac])s.name=COASTN[fac];if(kind==='sam'&&MDN[fac])s.name=MDN[fac];{const X=(XLB[fac]||{})[kind];if(X){for(const q in X)if(s[q]!=null)s[q]*=X[q];s.xl=1;}}
  if(kind==='econ'&&ECON[fac])s.name=ECON[fac];if(kind==='uplink'&&UPLINK[fac])s.name=UPLINK[fac][0];s.hp=Math.round(s.hp*(m.bldHp||1));s.cost=kind==='econ'?s.cost:Math.round(s.cost*(m.cost||1)/25)*25;if(s.dmg)s.dmg*=(m.dmg||1);s.aa=s.aa||0;s.armor='bld';return sc[k]=s;}
const BH={garrison:18,econ:30,depot:19,tunnel:12,fort:16,radio:30,hq:39,barracks:26,factory:34,airfield:19,shipyard:20,coast:12,turret:12,sam:12,uplink:30};
function lerpA(a,b,t){const d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return a+d*Math.min(1,t);}
const KINDS=[...Object.keys(BASE),...Object.keys(STRUCT)];
function shade(hex,f){const n=parseInt(hex.slice(1),16);const r=(n>>16)*f,g=(n>>8&255)*f,b=(n&255)*f;return `rgb(${Math.min(255,r)|0},${Math.min(255,g)|0},${Math.min(255,b)|0})`}
// doctrine and courage lead every nation's description
for(const k in FACTIONS){const F=FACTIONS[k],D=DOCT[k];if(!D||F._dt)continue;F._dt=1;const tr=Object.keys(DOCT_TXT).filter(q=>D[q]).map(q=>DOCT_TXT[q]);const MS=msOf(k),cl=MS.n+' - '+MS.desc;
  F.doctrineName=D.name;F.docShort=`${D.name} · morale: ${MS.n}`;F.moraleStyle=MS.n;F.doctrine=`Doctrine: ${D.name} (${tr.join('; ')}). Morale style: ${cl} `+F.doctrine;}

