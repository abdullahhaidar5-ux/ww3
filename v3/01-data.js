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
  blizzard:{name:'Blizzard',vis:.6,acc:.85,spd:.8,air:0,tip:'Blizzard: snow slows everything, jets grounded, vision cut.'}};
function weatherKinds(theme){return theme==='snow'?['clear','blizzard','fog']:theme==='green'?['clear','rain','fog']:['clear','sandstorm','fog'];}
// A duel is fought on a field 1.3x the 3200x2200 design (about 300 infantry-lengths across, like a classic RTS 1v1
// map); each extra player adds room (8 players: 2.26x).
function worldScaleFor(n){n=Math.max(2,Math.min(8,n|0||2));return Math.round(1.3*Math.pow(n/2,.4)*100)/100;}
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
  cleric:{name:'Ayatollah',cls:'inf',hp:320,spd:40,rng:0,dmg:0,rof:1,cost:1500,time:24,from:'barracks',armor:'light',r:8,dom:'ground',noAttack:true,vis:300,aura:{t:'morale',r:260},limit:1},
  // national specials (each nation gets one; see SPEC below)
  atgm:{name:'MILAN ATGM Carrier',cls:'aa',hp:260,spd:96,rng:440,dmg:88,rof:3.4,wpn:'at',aa:0,cost:700,time:10,from:'factory',armor:'heavy',r:11,dom:'ground',limit:4},
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
  aa:{cls:'aa',hp:360,spd:62,rng:310,dmg:22,rof:.32,wpn:'flak',aa:2,ground:false,cost:700,time:9,from:'factory',armor:'heavy',r:13,dom:'ground'},
  tank:{cls:'tank',hp:600,spd:58,rng:200,dmg:55,rof:1.6,wpn:'cannon',cost:800,time:10,from:'factory',armor:'heavy',r:14,dom:'ground'},
  arty:{cls:'arty',hp:280,spd:40,rng:420,dmg:72,rof:4,wpn:'shell',splash:55,minr:90,cost:1000,time:12,from:'factory',armor:'heavy',r:13,dom:'ground'},
  drone:{cls:'drone',hp:80,spd:125,rng:24,dmg:240,rof:1,wpn:'boom',splash:65,cost:350,time:5,from:'factory',armor:'air',r:8,dom:'air',alt:'low'},
  heli:{cls:'heli',hp:430,spd:95,rng:235,dmg:46,rof:1.25,wpn:'at',cost:1300,time:14,from:'airfield',armor:'air',r:14,dom:'air',alt:'low'},
  jet:{cls:'jet',hp:320,spd:240,rng:250,dmg:230,rof:.55,wpn:'bomb',splash:40,ammo:2,cost:1600,time:16,from:'airfield',armor:'air',r:14,dom:'air',alt:'high'},
  // Transports: carry troops (and, by sea, vehicles). Board by clicking the transport with units selected;
  // select the transport and press Unload. Destroyed transports take their passengers with them.
  lander:{name:'Landing Craft',cls:'boat',hp:620,spd:74,rng:0,dmg:0,rof:1,cost:600,time:8,from:'shipyard',armor:'heavy',r:16,dom:'naval',noAttack:1,cap:8,carryVeh:1},
  airlift:{name:'Transport Helicopter',cls:'heli',hp:480,spd:118,rng:0,dmg:0,rof:1,cost:800,time:9,from:'airfield',armor:'air',r:15,dom:'air',alt:'low',noAttack:1,cap:6},
  boat:{cls:'boat',hp:460,spd:92,rng:220,dmg:14,rof:.35,wpn:'gun',aa:2,cost:700,time:9,from:'shipyard',armor:'heavy',r:14,dom:'naval'},
  ship:{cls:'ship',hp:1400,spd:48,rng:540,dmg:90,rof:3.5,wpn:'shell',splash:62,minr:110,cost:2200,time:22,from:'shipyard',armor:'heavy',r:26,dom:'naval'},
};
const STRUCT={
  hq:{name:'Command HQ',hp:3000,size:90,cost:2000,time:30},
  barracks:{name:'Barracks',hp:900,size:60,cost:500,time:8},
  factory:{name:'War Factory',hp:1400,size:76,cost:1200,time:12,req:'barracks'},
  airfield:{name:'Airfield',hp:1500,size:96,cost:1500,time:15,req:'factory'},
  shipyard:{name:'Shipyard',hp:1400,size:70,cost:1200,time:12,req:'barracks',shore:true},
  turret:{name:'Defense Gun',hp:750,size:34,cost:600,time:6,req:'barracks',rng:290,dmg:30,rof:1.1,wpn:'tower'},
  sam:{name:'SAM Site',hp:650,size:34,cost:700,time:7,req:'barracks',rng:400,dmg:80,rof:1.5,wpn:'missile',aa:2,ground:false},
  tunnel:{name:'Tunnel Network',hp:900,size:40,cost:600,time:9,req:'barracks',rng:220,dmg:14,rof:.45,wpn:'gun',aa:1},
  uplink:{name:'Strike Center',hp:1800,size:70,cost:2500,time:20,req:'factory'},
  // Supply Depot: a forward drop-off point. Supply trucks unload at the nearest depot or HQ instead of driving home.
  depot:{name:'Supply Depot',hp:1000,size:54,cost:600,time:8,desc:'Supply trucks unload here instead of driving back to the HQ. Build one beside a far supply field.'},
  // Income building: every nation has one (same price and output, national flavour). A slow, steady trickle for
  // once the supply fields are mined out - $3.5/s for the first, each extra one earns less (max 4).
  // a city building held by infantry (not buildable: created when troops move in)
  garrison:{name:'Garrisoned Building',hp:800,size:36,cost:0,time:1},
  econ:{name:'Revenue Center',hp:1100,size:58,cost:2000,time:25,req:'factory',inc:3.5,limit:4,desc:'Earns a slow, steady income: $210 a minute for the first, less for each extra one (max 4). Pays for itself in about 10 minutes.'},
};
// Classic RTS proportions (Command & Conquer / StarCraft): chunky readable infantry, tanks ~2.7x a soldier,
// structures a little larger than the original game pieces.
const BSC=1.15;for(const k in STRUCT)if(k!=='garrison')STRUCT[k].size=Math.round(STRUCT[k].size*BSC);
// Each nation's long-range strike building, with its own name and look (the strike itself is the nation's own salvo).
const UPLINK={US:['Tomahawk Launch Center','vls'],TR:['Tayfun Missile Base','tel'],IL:['Strike Air Base','air'],EU:['SCALP Strike Command','vls'],UA:['Neptune Coastal Battery','vls'],
  RU:['Iskander Brigade','tel'],IR:['Underground Missile City','city'],SA:['Strategic Missile Force','vls'],AE:['Precision Strike Command','vls'],PK:['Shaheen Missile Complex','tel'],
  IN:['BrahMos Launch Complex','tel'],CN:['Rocket Force Base','tel'],KP:['Hwasong Launch Site','tel'],KR:['Hyunmoo Missile Command','vls'],EG:['Air Strike Command','air'],
  CU:['Revolutionary Missile Battery','rock'],RS:['Mountain Rocket Silo','city'],DW:['Long-Range Rocket Yard','rock']};
const ECON={US:'Arms Export Office',TR:'Grand Bazaar',IL:'Tech Startup Hub',EU:'Trade Commission',UA:'Grain Export Terminal',RU:'Gas Pipeline Station',IR:'Saffron Bazaar',
  SA:'Oil Ministry Office',AE:'Free Trade Zone',PK:'Textile Mill',IN:'IT Services Park',CN:'Export Factory',KP:'Overseas Labour Bureau',KR:'Electronics Plant',EG:'Suez Canal Toll House',
  CU:'Cigar Factory',RS:'Khums Treasury',DW:'Coffee Roastery'};
const ECON_RATE=[1,.75,.55,.4];
const BUILD_ORDER=['barracks','depot','econ','factory','airfield','shipyard','turret','sam','tunnel','uplink','hq'];
const CATS=['hq','barracks','factory','airfield','shipyard'];
const VS={
  gun:{light:1,heavy:.3,bld:.2,air:.5}, at:{light:.45,heavy:1.6,bld:1.1,air:1}, cannon:{light:.7,heavy:1.2,bld:1,air:0},
  shell:{light:1,heavy:.9,bld:1.3,air:0}, boom:{light:1,heavy:1,bld:1.5,air:.3}, tower:{light:1,heavy:1,bld:.3,air:0},
  flak:{light:.6,heavy:.2,bld:.1,air:1.6}, missile:{light:.5,heavy:1,bld:.6,air:1.5}, snipe:{light:3,heavy:.08,bld:.05,air:0},
  bomb:{light:1,heavy:1.3,bld:1.4,air:0}, super:{light:1,heavy:1,bld:1,air:.5}, demo:{light:0,heavy:0,bld:1,air:0},
};
const MIL_UNITS=(n)=>({inf:{name:n.inf},at:{name:'RPG Team'},aa:{name:'ZU-23 Technical',hp:240,cost:450,spd:80},tank:{name:n.tank||'Armed Technical',hp:n.tankHp||300,spd:n.tankSpd||88,dmg:18,rof:.35,wpn:'gun',aa:1,cost:500,time:6},
  arty:{name:n.arty||'Rocket Truck',rocket:n.arty?false:true,hp:220,cost:800},boat:{name:n.boat,hp:320,spd:120,cost:450}});
// Courage: how much punishment a nation's soldiers take before they break and fall back. Based on how each
// military is commonly perceived: the Shia forces' martyrdom ethos (Imam Hussein at Karbala) makes them the hardest
// to break; nations fighting for their homeland or shaped by constant combat come next; professional volunteer
// armies hold well; conscript-heavy or combat-untested forces break sooner. Units that break run back to base,
// then rally. Veteran ranks, heroes and morale auras steady them.
// tiers (user): 1 Shia forces; 2 Cuba, North Korea, Russia, Ukraine; 3 Egypt, Turkey, Pakistan; 4 China, Israel, South Korea
// (US and EU sit here too); 5 India, UAE, Saudi Arabia.
const COURAGE={RS:1.6,IR:1.6,DW:1.6,KP:1.6,CU:1.42,RU:1.42,UA:1.42,EG:1.16,TR:1.16,PK:1.16,CN:1.03,IL:1.03,KR:1.03,US:1.03,EU:1.03,IN:.9,AE:.9,SA:.9};
function courageOf(u){const T=G.teams[u.team];return (COURAGE[T.fac]||1)*(1+.12*(u.rank||0))*(T.upg&&T.upg.nationalism?1.1:1);}
function F_(code,name,color,lang,music,doctrine,mods,special,units,sup,fup,o={}){return Object.assign({code,name,color,lang,music,doctrine,mods,special,units,sup,fup},o);}
const FACTIONS={
  US:F_('US','United States','#4a80e8','en-US','west','Air power & precision: weapons deal 8% more damage; F-35s and Apaches hit 25% harder and are tougher.',{dmg:1.08},'hero',
    {inf:{name:'Marine Squad'},at:{name:'Javelin Team'},hero:{name:'Delta Operator',demo:true},aa:{name:'M-SHORAD Stryker'},tank:{name:'M1 Abrams'},arty:{name:'M109 Paladin'},heli:{name:'AH-64 Apache'},jet:{name:'F-35A Lightning'},boat:{name:'Mark VI Patrol Boat'},ship:{name:'Arleigh Burke Destroyer'}},
    {name:'Tomahawk Salvo',charge:150,n:6,dmg:405,r:85,spread:150},'training'),
  TR:F_('TR','Turkey','#d23a52','tr-TR','mideast','Drone superpower: Bayraktar/Kargu drones cost 25% less, build faster, are tougher and hit harder. Forces cost 5% less.',{cost:.95},'hero',
    {inf:{name:'Mehmetçik Squad'},at:{name:'OMTAS Team'},hero:{name:'Maroon Beret Commando',demo:true},drone:{name:'Kargu Loitering Drone'},aa:{name:'Korkut SPAAG'},tank:{name:'Altay MBT'},arty:{name:'T-155 Fırtına'},heli:{name:'T129 ATAK'},jet:{name:'KAAN Fighter'},boat:{name:'Kılıç Patrol Boat'},ship:{name:'Istif Frigate'}},
    {name:'Tayfun Missile Strike',charge:160,n:2,dmg:600,r:125,spread:90},'reactive',{extra:['drone']}),
  IL:F_('IL','Israel','#7fd3f0','he-IL','mideast','Iron Dome & missile defence: enemy strikes and missiles do 50% damage to you, SAM sites reach 30% farther and hit harder, Merkava tanks are extra tough, Spike missiles hit hard.',{supResist:.5},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Spike Team',dmg:55},hero:{name:'Sayeret Commando',demo:true},aa:{name:'Machbet SPAAG'},tank:{name:'Merkava Mk4',hp:740},arty:{name:'M109 Doher'},heli:{name:'AH-64 Saraf'},jet:{name:'F-35I Adir'},boat:{name:'Shaldag Patrol Boat'},ship:{name:'Sa’ar 6 Corvette'}},
    {name:'Air Strike',charge:140,n:5,dmg:755,r:70,spread:130},'trophy'),
  EU:F_('EU','European Union','#f0c032','fr-FR','west','Engineering & precision artillery: units self-repair, structures have 30% more hit points, CAESAR guns hit 15% harder.',{regen:3,bldHp:1.3},'hero',
    {inf:{name:'Rifle Section'},at:{name:'MILAN Team'},hero:{name:'KSK Sniper',rng:340,dmg:160,rof:2.2},aa:{name:'Gepard SPAAG'},tank:{name:'Leopard 2A8'},arty:{name:'CAESAR Howitzer',rng:450},heli:{name:'Tiger Attack Helo'},jet:{name:'Eurofighter Typhoon'},boat:{name:'Combattante Patrol Boat'},ship:{name:'FREMM Frigate'}},
    {name:'Storm Shadow Salvo',charge:150,n:4,dmg:685,r:80,spread:110},'network'),
  UA:F_('UA','Ukraine','#ffd447','uk-UA','slavic','Drone war & resilience: FPV drones are cheap and build fast, Sea Baby drone boats hit 40% harder, units repair themselves out of combat.',{regen:3},'hacker',
    {inf:{name:'Infantry Squad'},at:{name:'Stugna-P Team'},hacker:{name:'IT Army Cyber Team'},drone:{name:'FPV Strike Drone',cost:250},aa:{name:'Gepard SPAAG'},tank:{name:'T-84 Oplot'},arty:{name:'Bohdana Howitzer'},heli:{name:'Mi-24 Hind'},jet:{name:'F-16 Fighting Falcon'},boat:{name:'Sea Baby Drone Boat'},ship:{name:'Hetman Sahaidachny Frigate'}},
    {name:'Neptune Missile Salvo',charge:150,n:3,dmg:650,r:95,spread:110},'thermo',{extra:['drone']}),
  RU:F_('RU','Russia','#c9d1da','ru-RU','slavic','Heavy armour & massed artillery: vehicles have 25% more hit points, artillery is tougher and hits 15% harder. TOS-1A burns everything nearby.',{vehHp:1.25},'hacker',
    {inf:{name:'Motor Rifle Squad'},at:{name:'Kornet Team'},hacker:{name:'GRU Cyber Unit'},aa:{name:'Pantsir-S1'},tank:{name:'T-90M'},arty:{name:'TOS-1A',rng:280,minr:50,splash:95,dmg:66,rof:3.5,rocket:true},heli:{name:'Ka-52 Alligator'},jet:{name:'Su-34 Fullback'},boat:{name:'Raptor Patrol Boat'},ship:{name:'Admiral Gorshkov Frigate'}},
    {name:'Iskander Strike',charge:160,n:2,dmg:555,r:130,spread:90},'reactive'),
  IR:F_('IR','Iran','#3fae5c','fa-IR','mideast','Missiles & cheap drones: Shahed drones cost half as much and build almost twice as fast, Fateh missile launchers fire 20% farther and hit 15% harder, the Kheibar barrage charges faster. Basij militia costs 25% less.',{infCost:.75},'hacker',
    {inf:{name:'Basij Militia',hp:100},at:{name:'RPG Cell'},hacker:{name:'IRGC Cyber Team'},drone:{name:'Shahed-136'},aa:{name:'Mesbah AA Gun'},tank:{name:'Karrar MBT',hp:540},arty:{name:'Fateh-110 Launcher',rng:470,splash:65,rocket:true},heli:{name:'AH-1J Cobra'},jet:{name:'F-14 Tomcat'},boat:{name:'Seraj Fast Attack Craft',spd:110},ship:{name:'Moudge Frigate'}},
    {name:'Kheibar Missile Strike',charge:130,n:12,dmg:335,r:75,spread:200},'thermo',{extra:['drone']}),
  SA:F_('SA','Saudi Arabia','#1f9a54','ar-SA','mideast','Petro wealth & air force: oil pays 60% more, supply trucks carry more, F-15SA jets cost 15% less and are tougher, air defence reaches 20% farther.',{oil:1.6,harv:1.15},'hero',
    {inf:{name:'Royal Land Forces Squad'},at:{name:'TOW Team'},hero:{name:'Special Forces Sniper',rng:330,dmg:150,rof:2.2},aa:{name:'Shahine SAM Vehicle'},tank:{name:'M1A2S Abrams'},arty:{name:'CAESAR Howitzer'},heli:{name:'AH-64 Apache'},jet:{name:'F-15SA Eagle'},boat:{name:'Fast Patrol Boat'},ship:{name:'Al Riyadh Frigate'}},
    {name:'Royal Air Strike',charge:150,n:5,dmg:625,r:75,spread:130},'network'),
  AE:F_('AE','United Arab Emirates','#b49a5e','ar-AE','mideast','High-tech wealth: weapons deal 10% more damage, oil pays 25% more, Pantsir air defence and Apaches hit 15% harder.',{dmg:1.1,oil:1.25},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Javelin Team'},hero:{name:'Presidential Guard Commando',demo:true},aa:{name:'Pantsir-S1E'},tank:{name:'Leclerc MBT'},arty:{name:'G6 Rhino Howitzer'},heli:{name:'AH-64 Apache'},jet:{name:'Rafale'},boat:{name:'Ghannatha Patrol Boat'},ship:{name:'Baynunah Corvette'}},
    {name:'Precision Air Strike',charge:145,n:4,dmg:755,r:75,spread:110},'trophy'),
  PK:F_('PK','Pakistan','#2f8f3a','ur-PK','southasia','Hardened forces & tank hunters: infantry cost 20% less, vehicles have 10% more hit points, anti-tank teams hit 20% harder.',{infCost:.8,vehHp:1.1},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Baktar-Shikan Team'},hero:{name:'SSG Commando',demo:true},aa:{name:'Type 87 AA Gun'},tank:{name:'Al-Khalid MBT'},arty:{name:'SH-15 Howitzer'},heli:{name:'AH-1Z Viper'},jet:{name:'JF-17 Thunder'},boat:{name:'Jalalat Missile Boat'},ship:{name:'Tughril Frigate'}},
    {name:'Shaheen Missile Strike',charge:165,n:1,dmg:710,r:165,spread:0},'reactive'),
  IN:F_('IN','India','#ff9933','hi-IN','southasia','Massive army & BrahMos navy: everything costs 10% less, units are 5% tougher, warships have 25% more hit points.',{cost:.9,hp:1.05},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Nag Missile Team'},hero:{name:'MARCOS Commando',demo:true},aa:{name:'Tunguska SPAAG'},tank:{name:'Arjun MBT'},arty:{name:'Pinaka Rockets',rocket:true,splash:70,dmg:60,rof:3.2},heli:{name:'HAL Prachand'},jet:{name:'Tejas Fighter'},boat:{name:'Veer Missile Boat'},ship:{name:'Kolkata Destroyer'}},
    {name:'BrahMos Salvo',charge:155,n:3,dmg:670,r:95,spread:100},'conscript'),
  CN:F_('CN','China','#e3493a','zh-CN','eastasia','Mass mobilization & blue-water navy: infantry cost 35% less and train 30% faster, warships are 30% tougher and hit 15% harder, rocket artillery hits 10% harder.',{infCost:.65,infTime:.7},'hacker',
    {inf:{name:'PLA Rifle Squad'},at:{name:'HJ-12 Team'},hacker:{name:'PLA Cyber Team'},aa:{name:'PGZ-09 SPAAG'},tank:{name:'Type 99A'},arty:{name:'PHL-03 Rockets',splash:72,dmg:58,rof:3.2,rocket:true},heli:{name:'Z-10 Attack Helo'},jet:{name:'J-20 Fighter'},boat:{name:'Type 022 Missile Boat'},ship:{name:'Type 055 Destroyer'}},
    {name:'DF-21 Strike',charge:170,n:1,dmg:780,r:160,spread:0},'nationalism'),
  KP:F_('KP','North Korea','#c8418f','ko-KR','eastasia','Numbers & artillery: everything costs 25% less but units have 15% fewer hit points; Koksan guns cost 20% less and fire 10% farther.',{cost:.75,hp:.85},'hacker',
    {inf:{name:'KPA Conscripts'},at:{name:'Bulsae Team'},hacker:{name:'Bureau 121 Hackers'},aa:{name:'M1992 SPAAG'},tank:{name:'Chonma-216'},arty:{name:'Koksan Gun',rng:520,rof:5,dmg:88},heli:{name:'Mi-24 Hind'},jet:{name:'MiG-29 Fulcrum'},boat:{name:'Nampo Patrol Boat'},ship:{name:'Najin Frigate'}},
    {name:'Hwasong Strike',charge:220,n:1,dmg:535,r:220,spread:0},'conscript'),
  KR:F_('KR','South Korea','#7a68e0','ko-KR','eastasia','High technology: sensors see 25% farther, weapons deal 10% more damage, units self-repair, K9 guns reload 20% faster, defence guns reach 15% farther.',{dmg:1.1,regen:2,sight:1.25},'hero',
    {inf:{name:'ROK Infantry Squad'},at:{name:'Hyungung Team'},hero:{name:'707th Commando',demo:true},aa:{name:'K30 Biho SPAAG'},tank:{name:'K2 Black Panther'},arty:{name:'K9 Thunder'},heli:{name:'AH-64 Apache'},jet:{name:'KF-21 Boramae'},boat:{name:'Gumdoksuri Patrol Boat'},ship:{name:'Sejong the Great Destroyer'}},
    {name:'Hyunmoo Strike',charge:160,n:2,dmg:600,r:125,spread:80},'training'),
  EG:F_('EG','Egypt','#c9a227','ar-EG','mideast','Large army & armoured corps: infantry cost 25% less and train faster, Abrams tanks cost 15% less.',{infCost:.75,infTime:.8},'hero',
    {inf:{name:'Infantry Squad'},at:{name:'Kornet Team'},hero:{name:'Unit 777 Commando',demo:true},aa:{name:'ZSU-23-4 Shilka'},tank:{name:'M1A1 Abrams'},arty:{name:'K9 Thunder'},heli:{name:'Ka-52 Alligator'},jet:{name:'Rafale'},boat:{name:'Ramadan Missile Boat'},ship:{name:'Tahya Misr Frigate'}},
    {name:'Air Strike',charge:150,n:5,dmg:720,r:70,spread:130},'nationalism'),
  CU:F_('CU','Cuba','#2b59c3','es-CU','latin','Revolutionary fervour: everything costs 20% less but units have 10% fewer hit points; Grad rockets cost 20% less.',{cost:.8,hp:.9},'hacker',
    {inf:{name:'Revolutionary Infantry'},at:{name:'RPG Team'},hacker:{name:'Cyber Brigade'},aa:{name:'ZSU-23-4 Shilka'},tank:{name:'T-62 Tank'},arty:{name:'BM-21 Grad',rocket:true,splash:70,dmg:55,rof:3},heli:{name:'Mi-24 Hind'},jet:{name:'MiG-29 Fulcrum'},boat:{name:'Osa Missile Boat'},ship:{name:'Koni Frigate'}},
    {name:'Missile Bombardment',charge:160,n:6,dmg:490,r:80,spread:160},'conscript'),
  RS:F_('RS','Mountain Shias','#b3262c','ar-LB','mideast','Drones, rockets and fortresses: the cheapest, toughest loitering drones, longer-ranged rocket launchers that fire faster, defence guns and tunnels that are far stronger, and infantry that dig in (35% less damage holding position). No air force or navy.',{cost:.85,dugIn:.65},'hacker',
    Object.assign(MIL_UNITS({inf:'Mountain Guard',boat:'Fast Attack Skiff'}),{inf:{name:'Mountain Guard',hp:150},at:{name:'Mountain RPG Team',hp:140,rng:205},hacker:{name:'Signal Jammers'},
      drone:{name:'Shahed-136',cost:225,hp:100,spd:135,dmg:260,splash:72},arty:{name:'Medium Rocket Launcher',rocket:true,hp:260,rng:470,minr:90,dmg:68,splash:66,rof:3.2,cost:750,time:10}}),
    {name:'Mountain Rocket Storm',charge:150,n:14,dmg:300,r:65,spread:230},'thermo',{extra:['drone'],noAir:true,noShip:true,militia:true}),
  DW:F_('DW','Coffee Shias','#c8a46e','ar-YE','mideast','Technical raiders: tough, fast armed technicals and long-range rocket trucks that outrange enemy artillery. Units move 20% faster. No air force.',{spd:1.2,cost:.85},'hero',
    Object.assign(MIL_UNITS({inf:'Wolf Raiders',boat:'Raider Speedboat'}),{hero:{name:'Ghost Raider',demo:true},
      tank:{name:'Raider Technical',hp:400,spd:96,dmg:26,rof:.28,wpn:'gun',aa:1,cost:450,time:5},aa:{name:'ZU-23 Technical',hp:320,cost:400,spd:90},
      arty:{name:'Long-Range Rocket Truck',rocket:true,hp:280,rng:620,minr:120,dmg:82,splash:72,rof:4.2,cost:900,time:11}}),
    {name:'Long-Range Rocket Salvo',charge:140,n:14,dmg:305,r:62,spread:230},'camo',{noAir:true,noShip:true,militia:true}),
};
// Each nation's special unit is its own: what it is and what it does (see SPECIAL_TIP).
const SPEC={US:['hero',{name:'Delta Operator',mark:1}],TR:['mortar',{name:'Kale Mortar Team',droneSpot:1}],IL:['idome',{}],EU:['atgm',{}],UA:['recon',{name:'Aerorozvidka Drone Team'}],RU:['ew',{name:'Krasukha EW Truck'}],
  IR:['officer',{name:'IRGC Field Commander'}],SA:['jeep',{name:'Royal Recon Patrol',airSpot:1}],AE:['sapper',{name:'Combat Engineers'}],PK:['atk',{name:'SSG Tank Hunters',finisher:1}],IN:['medic',{name:'Army Medical Corps Team',revive:1}],
  CN:['commissar',{name:'PLA Political Commissar'}],KP:['hacker',{}],KR:['cbr',{name:'K-Counter-Battery Radar'}],EG:['saka',{}],CU:['guer',{name:'Guerrilla Ambush Squad'}],
  RS:['mortar',{name:'Mountain Rocket Team',rocket:true,rng:360,dmg:13.5,rof:4.2,splash:46,ripple:4,camo:1}],DW:['raidlead',{}]};
for(const k in SPEC){const F=FACTIONS[k];if(!F)continue;const [kind,o]=SPEC[k];F.special=kind;F.units=F.units||{};F.units[kind]=Object.assign({},F.units[kind]||{},o);}
const SPECIAL_TIP={atgm:()=>'Long-range wire-guided anti-tank missiles: outranges tanks, but thin-skinned. Keep it behind your armour.',saka:()=>'Elite fast-moving commandos with grenades that hurt clustered infantry and garrisons.',hero:u=>u.mark?'Stealthed commando. Plants charges on buildings, and every target it hits is laser-marked: all your forces do 25% more damage to it for 6 seconds.':u.demo?'Stealthed commando. Right-click an enemy building to plant explosives.':'Stealthed sniper. Picks off infantry from very long range.',
  mortar:u=>u.ripple?'Hidden rocket launchers: fire a ripple of 4 rockets that blankets an area, then reload. Hide when standing still. Cannot fire at close range.':u.droneSpot?'Indirect fire from long range, devastating against infantry in the open. Drone-guided: 40% more range against targets a friendly drone can see. Cannot fire at close range.':'Indirect fire from long range: devastating against infantry in the open. Cannot fire at close range.',recon:u=>'Unarmed, hides when still. Sees 520 metres and marks every enemy near it: your forces do 25% more damage to marked targets.',
  officer:u=>'Nearby infantry do 20% more damage and can\'t be suppressed.',medic:u=>u.revive?'Heals nearby infantry and vehicles, and saves the wounded: about a third of infantry killed near the medics return to the fight 8 seconds later.':'Heals nearby infantry and vehicles.',commissar:u=>'Nearby infantry fire 25% faster and can\'t be suppressed.',
  sapper:u=>'Lays hidden anti-tank mines when standing still (up to 8). Enemy vehicles that drive over them are badly damaged.',guer:u=>'Hides when standing still; the first volley from hiding does double damage.',
  atk:u=>u.finisher?'Long-range anti-tank team that hides when standing still. Tank hunters: 40% more damage to vehicles already below half health.':'Long-range anti-tank team that hides when standing still.',idome:u=>'Shoots down incoming shells, rockets and missiles: friendly units and buildings nearby take 55% less damage from them.',
  ew:u=>'Jams drones and guided weapons: nearby enemy drones burn out and aircraft and missiles do half damage to your units nearby.',cbr:u=>'Any enemy artillery or rocket launcher that fires anywhere on the map is revealed to you for 10 seconds.',
  jeep:u=>u.airSpot?'Fast recon patrol with long sight that guides the air force: enemies it can see take 30% more damage from your aircraft.':'Fast recon patrol with long sight.',raidlead:u=>'Nearby vehicles move 20% faster and do 20% more damage.',hacker:u=>'Disables enemy buildings; earns cash when idle.'};
// Tunnel warfare: these factions can dig hidden Tunnel Networks. Units sent into any tunnel heal and can come out of any other.
for(const k of ['IR','RS','DW','KP']){FACTIONS[k].tunnels=true;FACTIONS[k].doctrine+=' Tunnel warfare: hidden tunnels move units across the map instantly.';}
const FKEYS=Object.keys(FACTIONS);
// Rock-paper-scissors: what each kind of unit beats and what beats it (shown in the unit tooltips).
const COUNTER={inf:'Beats AT teams and other infantry · Loses to tanks and artillery · Takes 35% less damage in woods or beside buildings; gets suppressed under heavy fire',at:'Beats tanks, vehicles and helicopters · Loses to riflemen',hacker:'Disables buildings · Loses to any armed unit',
  hero:'Picks off infantry from long range · Loses to vehicles',harv:'Gathers supply · Unarmed',dozer:'Builds and repairs · Unarmed',tank:'Beats infantry, AA vehicles and artillery · Loses to AT teams and helicopters · Thickest armour in front: side hits do 20% more damage, rear hits 60% more',
  aa:'Beats helicopters, jets and drones · Loses to tanks and infantry',arty:'Beats infantry and buildings from long range · Loses to tanks and fast units up close',
  drone:'Explodes on groups of vehicles and infantry · Loses to AA and rifle fire',heli:'Beats tanks and vehicles · Loses to AA and AT teams',jet:'Bombs buildings and vehicles · Loses to SAM sites and AA',
  boat:'Beats boats and helicopters near water · Loses to warships',ship:'Shells coasts and boats from long range · Loses to boats up close and aircraft'};
const SHIA={IR:1,RS:1,DW:1};
function roster(fac){const F=FACTIONS[fac];const spf=(BASE[F.special]||{}).from||'barracks';return{hq:['harv','dozer'],barracks:['inf','at',...(spf==='barracks'?[F.special]:[]),...(SHIA[fac]?['cleric']:[])],factory:['aa','tank','arty',...(F.extra||[]),...(spf==='factory'?[F.special]:[])],airfield:F.noAir?[]:['heli','jet','airlift'],shipyard:F.noShip?['boat']:['boat','ship','lander']};}
function allUnits(fac){const r=roster(fac);return CATS.flatMap(c=>r[c]);}
function bldAllowed(fac,k){if(k==='tunnel')return !!FACTIONS[fac].tunnels;return !(k==='airfield'&&FACTIONS[fac].noAir);}

const UPG={
  armor:{name:'Body Armor',at:'barracks',cost:800,time:20,desc:'Infantry +25% hit points'},
  composite:{name:'Composite Armor',at:'factory',cost:1500,time:30,desc:'Vehicles and ships +25% hit points'},
  munitions:{name:'Advanced Munitions',at:'factory',cost:1500,time:30,desc:'Tanks, artillery, AA and ships +20% damage'},
  ecm:{name:'Countermeasures',at:'airfield',cost:1200,time:25,desc:'Aircraft take 30% less damage'},
  laser:{name:'Laser-Guided Weapons',at:'airfield',cost:1200,time:25,desc:'Aircraft +25% damage'},
  logistics:{name:'Supply Logistics',at:'hq',cost:1000,time:25,desc:'Supply trucks carry 30% more'},
  radar:{name:'Radar Network',at:'hq',cost:800,time:20,desc:'Detect stealth units at twice the distance'},
  hullplate:{name:'Reinforced Hulls',at:'shipyard',cost:1200,time:25,desc:'Ships repair slowly and take 15% less damage'},
  training:{name:'Advanced Training',at:'barracks',cost:1500,time:30,desc:'All units earn ranks twice as fast',sp:1},
  nationalism:{name:'Nationalism',at:'barracks',cost:1200,time:25,desc:'Infantry fire 25% faster',sp:1},
  thermo:{name:'Thermobaric Warheads',at:'factory',cost:1400,time:25,desc:'Artillery and drones +30% damage and blast',sp:1},
  reactive:{name:'Reactive Armor',at:'factory',cost:1400,time:25,desc:'Vehicles take 25% less damage from missiles',sp:1},
  network:{name:'Networked Battlespace',at:'hq',cost:1500,time:30,desc:'All units +15% weapon range',sp:1},
  conscript:{name:'Mass Conscription',at:'barracks',cost:1000,time:20,desc:'Infantry train 50% faster',sp:1},
  trophy:{name:'Trophy Protection',at:'factory',cost:1400,time:25,desc:'Vehicles take 30% less damage from missiles',sp:1},
  camo:{name:'Camouflage Netting',at:'barracks',cost:1200,time:25,desc:'Infantry turn invisible after standing still for 3 seconds',sp:1},
  salvage:{name:'Scrap Salvage',at:'factory',cost:1000,time:20,desc:'Destroyed enemy vehicles pay out 25% of their cost',sp:1},
};
function upgList(fac){const F=FACTIONS[fac];return Object.keys(UPG).filter(k=>(!UPG[k].sp||F.fup===k)&&!(UPG[k].at==='airfield'&&F.noAir));}

const POWERS={
  bounty:{name:'Cash Bounty',desc:'Earn 15% of the cost of every enemy you destroy',passive:true},
  recon:{name:'Recon Sweep',desc:'Reveal an area for 25 seconds',cd:90,r:450},
  para:{name:'Paradrop',desc:'Drop 5 infantry anywhere on land',cd:150},
  barrage:{name:'Artillery Barrage',desc:'10 shells over a wide area',cd:170,r:180},
  repair:{name:'Emergency Repair',desc:'Restore 60% health to your forces in an area',cd:120,r:230},
};
// Every nation's own signature general power (unlocked like the others). Effects differ; cooldowns balance them.
POWERS.nat={name:'National Power',desc:'',cd:200,r:150,nat:true};
const NATPOW={US:{name:'Shock and Awe',type:'strafe',cd:200,r:140,desc:'A-10 gun run: a line of cannon fire and bombs across the target'},
  TR:{name:'Bayraktar Swarm',type:'drones',n:4,cd:190,r:120,desc:'Four Kargu drones launch from your base and hunt around the target'},
  IL:{name:'Mossad Intelligence',type:'intel',cd:180,r:650,desc:'Reveal every enemy building for 25s and laser-mark enemies near the target (+25% damage taken)'},
  EU:{name:'Coalition Supply Drop',type:'supply',cd:220,r:220,desc:'+$1200 and repair 40% to your forces in the area'},
  UA:{name:'Partisan Uprising',type:'partisans',n:6,cd:200,r:90,desc:'Six partisans rise up at the target and ambush the enemy'},
  RU:{name:'Thermobaric Strike',type:'thermo',cd:230,r:150,desc:'A single huge thermobaric warhead after 3 seconds'},
  IR:{name:'Shahed Swarm',type:'drones',n:5,cd:200,r:120,desc:'Five Shahed loitering munitions launch from your base toward the target'},
  SA:{name:'Petrodollar Contract',type:'cash',cd:240,desc:'+$2000 immediately',self:true},
  AE:{name:'Mercenary Contract',type:'mercs',cd:230,desc:'Two tanks and two air-defence vehicles arrive at your HQ',self:true},
  PK:{name:'Nasr Tactical Strike',type:'emp',cd:220,r:200,desc:'Blast at the target that also disables enemy vehicles and buildings nearby for 10s'},
  IN:{name:'Akash Shield',type:'shield',cd:200,r:280,desc:'Your forces in the area take 60% less damage for 20s'},
  CN:{name:'Cyber Blackout',type:'cyber',cd:200,r:380,desc:'Disable every enemy building in the area for 18s and reveal it'},
  KP:{name:'Human Wave',type:'wave',n:10,cd:210,desc:'Ten riflemen pour out of your HQ and charge the target'},
  KR:{name:'K9 Thunder Barrage',type:'precise',cd:180,r:80,desc:'Eight accurate howitzer shells on a tight area'},
  EG:{name:'Smoke and Crossing',type:'smoke',cd:180,r:260,desc:'Smoke screen for 20s: your units inside are hidden and move 25% faster'},
  CU:{name:'Revolutionary Fervour',type:'fervor',cd:200,desc:'All your units are fearless and deal 15% more damage for 25s',self:true},
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
 UA:{bounty:{name:'Trophy Brigade',m:.82},recon:{name:'Drone Spotters',tm:1.3},para:{name:'Territorial Defence',fx:'dig',nm:1.4,cdm:1.3,mix:PARA_INF},barrage:{name:'Precision Rocket Strike',nm:.6,dm:1.5},repair:{name:'Field Workshops',pm:1.1}},
 RU:{bounty:{name:'Trophy Pay'},recon:{name:'Recon Flight',rm:.9},para:{name:'Air Assault Drop'},barrage:{name:'Massed Fires',fx:'fire',nm:1.6,dm:.8,rm:1.4,cdm:1.15},repair:{name:'Field Repair'}},
 IR:{bounty:{name:'Spoils of War'},recon:{name:'Neighbourhood Informants',rm:1.2,tm:1.2,cdm:1.1},para:{name:'Takavar Drop',nm:1.2,cdm:1.2},barrage:{name:'Missile Salvo',nm:.8,dm:1.2},repair:{name:'Self-Reliance Repairs',fx:'rally',pm:.87}},
 SA:{bounty:{name:'Royal Bounty',fx:'salvage',m:1.35},recon:{name:'AWACS Sweep',rm:1.25},para:{name:'Royal Guard Drop',nm:.7},barrage:{name:'Air Strike Package',nm:.8,dm:1.1},repair:{name:'Contractor Repair',pm:.95}},
 AE:{bounty:{name:'Contract Bonus',m:1.1},recon:{name:'ISR Sweep',rm:1.1,tm:1.1},para:{name:'Presidential Guard Drop',nm:.8,cdm:.9},barrage:{name:'Guided Munitions',fx:'emp',nm:.5,dm:1.9,rm:.6},repair:{name:'Contractor Repair',pm:.93}},
 PK:{bounty:{name:'Battle Honours',m:.9},recon:{name:'Recon Sweep'},para:{name:'SSG Tank Hunters',mix:PARA_AT},barrage:{name:'Artillery Fire Plan',fx:'smoke'},repair:{name:'Armour Workshops',pm:1.1}},
 IN:{bounty:{name:'Battle Honours',m:.8},recon:{name:'Satellite Pass'},para:{name:'Para Commandos',fx:'vet',nm:1.2,cdm:1.1},barrage:{name:'Pinaka Salvo',nm:1.3,dm:.8,rm:1.2},repair:{name:'Rapid Repair',pm:1.1}},
 CN:{bounty:{name:'Unit Merit',m:.8},recon:{name:'Beidou Sweep',fx:'detect',rm:1.3,cdm:1.1},para:{name:'Mass Airdrop',nm:1.5,cdm:1.25,mix:PARA_INF},barrage:{name:'Rocket Barrage',nm:1.4,dm:.7},repair:{name:'Field Repair',pm:.9}},
 KP:{bounty:{name:'Captured Spoils',m:1.1},recon:{name:'Spy Network',rm:.8,tm:1.3},para:{name:'Special Purpose Forces',fx:'stealth',nm:1.3,cdm:1.2,mix:PARA_INF},barrage:{name:'Long-Range Artillery',nm:1.5,rm:1.3,cdm:1.3},repair:{name:'Juche Repairs',pm:.8}},
 KR:{bounty:{name:'Merit Bonus',m:.85},recon:{name:'Early Warning Sweep',rm:1.15,tm:1.1},para:{name:'Airborne Brigade',nm:.85},barrage:{name:'Counter-Battery Fire'},repair:{name:'Rapid Restoration',fx:'shield',pm:1.15,rm:1.1,cdm:1.1}},
 EG:{bounty:{name:'Battle Honours'},recon:{name:'Recon Sweep',rm:.9},para:{name:'Airborne Rangers'},barrage:{name:'Crossing Bombardment',fx:'smoke',nm:1.1,cdm:1.05},repair:{name:'Armour Workshops',pm:1.25,rm:.9,cdm:1.05}},
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
function powInfo(k,fac){const P=POWERS[k];if(!P)return null;if(!P.nat){const g=(GPOW[fac]||{})[k];if(!g)return P;return Object.assign({},P,g,{name:g.name||P.name,desc:gpowDesc(k,P,g),cd:P.cd?Math.round(P.cd*(g.cdm||1)*(g.fx?1.1:1)):P.cd,r:P.r?Math.round(P.r*(g.rm||1)):P.r});}const N=natPow(fac);return Object.assign({},P,N);}
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
const BAL={"US":{"arty":0.895,"_":0.967,"jet":1.001},"TR":{"arty":0.906,"drone":0.913,"_":0.936},"IL":{"arty":0.861,"_":0.925},"EU":{"arty":0.923,"_":0.911},"UA":{"arty":0.861,"drone":0.83,"_":0.941},"RU":{"arty":1.456,"_":1.025,"inf":0.908,"at":0.951},"IR":{"arty":0.963,"_":0.97,"inf":1.04,"at":1.058},"SA":{"arty":0.861,"jet":1.039,"_":0.954},"AE":{"arty":0.903,"_":0.959},"PK":{"arty":0.903,"_":0.97,"at":1.08,"inf":1.026},"IN":{"_":1.019},"CN":{"inf":1.202,"at":1.142,"_":1.047,"jet":0.999},"KP":{"arty":1.306,"_":1.131},"KR":{"_":0.947},"EG":{"arty":0.861,"_":0.96,"inf":1.139,"at":1.062},"CU":{"_":1.101},"RS":{"inf":1.006,"at":1.044,"tank":0.72,"aa":1.115,"arty":1.161,"drone":1.22,"boat":1.15,"_":1.185},"DW":{"tank":1.116,"aa":1.383,"boat":1.15,"_":1.104,"at":0.952}};
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
const DOCT={US:{name:'Aggressive Manoeuvre',shock:1},RU:{name:'Heavy Barrages',barrage:1},IL:{name:'Covert Operations',covert:1},
  IR:{name:'Asymmetric Warfare',ambush:1,hitrun:1},TR:{name:'Drone Warfare',hitrun:1},EU:{name:'Combined Arms',homeland:1},UA:{name:'Homeland Defence',homeland:1,hitrun:1},
  SA:{name:'Air Superiority',shock:1},AE:{name:'High-Tech Precision',covert:1},PK:{name:'Tank Hunters',ambush:1},IN:{name:'Cold Start Offensive',shock:1},
  CN:{name:'Mass & Information War',barrage:1},KP:{name:'Artillery Siege',barrage:1},KR:{name:'Active Defence',homeland:1},EG:{name:'Armoured Corps',shock:1},
  CU:{name:'Guerrilla War',ambush:1,hitrun:1},RS:{name:'Fortress & Ambush',ambush:1,homeland:1},DW:{name:'Desert Raiders',hitrun:1,ambush:1}};
const DOCT_TXT={shock:'+15% damage while advancing or attacking; vehicles 10% faster',barrage:'artillery reaches 15% farther, bigger blasts, faster reloads, 15% cheaper; shellfire suppresses harder',
  covert:'infantry and AT teams are camouflaged; first shot from hiding hits 50% harder',ambush:'infantry, AT teams and drones holding still or in cover deal 20% more damage',
  hitrun:'infantry and light vehicles sprint 25% faster for 3s after firing',homeland:'+15% damage near their own buildings'};
const XL={US:{jet:{dmg:1.25,hp:1.15},heli:{dmg:1.25,hp:1.1}},TR:{drone:{cost:.75,time:.7,hp:1.3,dmg:1.15}},IL:{},EU:{arty:{dmg:1.15}},
  UA:{drone:{cost:.9,time:.6},boat:{dmg:1.4,spd:1.15}},RU:{arty:{hp:1.3,dmg:1.15}},IR:{drone:{cost:.5,time:.55,spd:1.1},arty:{rng:1.2,dmg:1.15}},
  SA:{jet:{cost:.85,hp:1.2},aa:{rng:1.2}},AE:{aa:{dmg:1.15},heli:{dmg:1.15}},PK:{at:{dmg:1.2}},IN:{ship:{hp:1.25},boat:{hp:1.15}},
  CN:{ship:{hp:1.3,dmg:1.15},boat:{hp:1.15},arty:{dmg:1.1}},KP:{arty:{cost:.8,rng:1.1}},KR:{arty:{rof:.8}},EG:{tank:{cost:.85}},CU:{arty:{cost:.8}},
  RS:{drone:{cost:.75,time:.6,dmg:1.15,hp:1.2},arty:{rng:1.12,dmg:1.12,rof:.9},at:{hp:1.15}}};
const TRN={US:['LCAC Hovercraft','CH-47 Chinook'],TR:['Landing Craft Tank','T-70 Black Hawk'],IL:['Landing Craft','CH-53 Yasur'],EU:['LCM Landing Craft','NH90 Transport'],UA:['Landing Craft','Mi-8 Hip'],RU:['Zubr Hovercraft','Mi-8 Hip'],
  IR:['Tondar Hovercraft','Bell 214 Transport'],SA:['Landing Craft Utility','UH-60 Black Hawk'],AE:['Landing Craft','CH-47 Chinook'],PK:['Landing Craft Utility','Mi-17 Hip'],IN:['Landing Craft Utility','Mi-17 Hip'],CN:['Type 726 Hovercraft','Z-8 Transport'],
  KP:['Kongbang Hovercraft','Mi-8 Hip'],KR:['Solgae Hovercraft','KUH-1 Surion'],EG:['Landing Craft','CH-47 Chinook'],CU:['Landing Craft','Mi-8 Hip']};
for(const k in TRN){const F=FACTIONS[k];if(!F)continue;F.units=F.units||{};F.units.lander=Object.assign({},F.units.lander||{},{name:TRN[k][0]});F.units.airlift=Object.assign({},F.units.airlift||{},{name:TRN[k][1]});}
const XLB={RS:{turret:{hp:1.4,dmg:1.25,rng:1.12},tunnel:{hp:1.35,dmg:1.3},sam:{hp:1.3}},IL:{sam:{rng:1.3,dmg:1.3}},KR:{turret:{rng:1.15}},SA:{sam:{rng:1.2}}};
const sc={};
function stats(fac,kind){const k=fac+'|'+kind;if(sc[k])return sc[k];const F=FACTIONS[fac],m=F.mods||{};
  const s=Object.assign({},BASE[kind],(F.units||{})[kind]||{});s.kind=kind;{const X=(XL[fac]||{})[kind];if(X)for(const q in X)if(s[q]!=null)s[q]*=X[q];if(X)s.xl=1;}const inf=s.armor==='light',veh=s.armor==='heavy'||s.cls==='heli'||s.cls==='jet';
  let c=s.cost*(m.cost||1);if(inf)c*=(m.infCost||1);const B=BAL[fac];if(B)c*=(B._||1)*(B[kind]||1);s.cost=Math.round(c/25)*25;if(inf)s.time*=(m.infTime||1);
  s.hp=Math.round(s.hp*(m.hp||1)*(veh?(m.vehHp||1):1));if(m.spd&&s.dom!=='air')s.spd*=m.spd;{const D=DOCT[fac]||{};if(D.barrage&&s.cls==='arty'){s.rng*=1.15;if(s.splash)s.splash*=1.3;s.rof*=.85;s.cost=Math.round(s.cost*.85/25)*25;}if(D.covert&&(s.cls==='inf'||s.cls==='at')&&s.dom==='ground'&&kind!=='hacker')s.camo=1;if(D.shock&&s.armor==='heavy'&&s.dom==='ground')s.spd*=1.1;}s.dmg*=(m.dmg||1);s.aggro=kind==='drone'?290:s.rng+90;if(s.aa===undefined)s.aa=0;return sc[k]=s;}
function bstats(fac,kind){const k=fac+'#'+kind;if(sc[k])return sc[k];const m=FACTIONS[fac].mods||{};const s=Object.assign({},STRUCT[kind]);s.kind=kind;{const X=(XLB[fac]||{})[kind];if(X){for(const q in X)if(s[q]!=null)s[q]*=X[q];s.xl=1;}}
  if(kind==='econ'&&ECON[fac])s.name=ECON[fac];if(kind==='uplink'&&UPLINK[fac])s.name=UPLINK[fac][0];s.hp=Math.round(s.hp*(m.bldHp||1));s.cost=kind==='econ'?s.cost:Math.round(s.cost*(m.cost||1)/25)*25;if(s.dmg)s.dmg*=(m.dmg||1);s.aa=s.aa||0;s.armor='bld';return sc[k]=s;}
const BH={garrison:18,econ:30,depot:19,tunnel:12,hq:39,barracks:26,factory:34,airfield:19,shipyard:20,turret:12,sam:12,uplink:30};
function lerpA(a,b,t){const d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return a+d*Math.min(1,t);}
const KINDS=[...Object.keys(BASE),...Object.keys(STRUCT)];
function shade(hex,f){const n=parseInt(hex.slice(1),16);const r=(n>>16)*f,g=(n>>8&255)*f,b=(n&255)*f;return `rgb(${Math.min(255,r)|0},${Math.min(255,g)|0},${Math.min(255,b)|0})`}
// doctrine and courage lead every nation's description
for(const k in FACTIONS){const F=FACTIONS[k],D=DOCT[k];if(!D||F._dt)continue;F._dt=1;const tr=Object.keys(DOCT_TXT).filter(q=>D[q]).map(q=>DOCT_TXT[q]);const c=COURAGE[k]||1,cl=k==='KP'?'unbreakable (never breaks)':['IR','RS','DW'].includes(k)?'unbreakable (never breaks while the Ayatollah lives)':c>=1.5?'unbreakable':c>=1.3?'very high':c>=1.15?'high':c>=1?'steady':'brittle';
  F.doctrineName=D.name;F.docShort=`${D.name} · courage: ${cl.split(' (')[0]}`;F.doctrine=`Doctrine: ${D.name} (${tr.join('; ')}). Courage: ${cl}. `+F.doctrine;}
