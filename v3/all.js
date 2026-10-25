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

/* ================= MAP: sea channel, bridges, grid, pathfinding ================= */
const COSB=0.894,BT=[0.894,0.447],BN=[-0.447,0.894];
/* Maps: each defines water features (rivers, lakes), bridges, base slots (in fill order) and a symmetry used to place supply fairly.
   Water is baked into an edge field: M.edge(x,y) > 0 is water (value = distance in from the shore), < 0 is land. */
const MAPS={
  strait:{name:'Desert Strait',min:2,max:8,sym:'point',desc:'A sea strait splits the desert. Three bridges.',
    slots:[[380,MAPH-360],[MAPW-380,360],[1150,MAPH-360],[MAPW-1150,360],[380,1150],[MAPW-380,MAPH-1150],[1780,MAPH-310],[MAPW-1780,310]],
    water(M,R){const p=[R()*6.28,R()*6.28,R()*6.28];const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,300+.5*x+45*Math.sin(x*.0035+p[0])+22*Math.sin(x*.009+p[1])]);
      M.rivers.push({pts,hw:(t,x)=>178+24*Math.sin(x*.006+p[2])});M.bridgeAt=[[0,700],[0,1600],[0,2500]];}},
  rivers:{name:'Twin Rivers',min:2,max:6,sym:'point',desc:'Two rivers cut the land into three bands. Four bridges.',
    slots:[[420,260],[MAPW-420,MAPH-260],[420,MAPH-260],[MAPW-420,260],[360,1100],[MAPW-360,1100]],
    water(M,R){const p=[R()*6.28,R()*6.28];for(const [yc,ph] of [[690,p[0]],[MAPH-690,p[1]]]){const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,yc+28*Math.sin(x*.0042+ph)+12*Math.sin(x*.011+ph*2)]);M.rivers.push({pts,hw:(t,x)=>96+14*Math.sin(x*.007+ph)});}
      M.bridgeAt=[[0,900],[0,2300],[1,900],[1,2300]];}},
  delta:{name:'River Delta',min:2,max:6,sym:'mirrorX',desc:'A river forks into two arms on its way to the sea. Five bridges.',
    slots:[[420,420],[MAPW-420,420],[420,1380],[MAPW-420,1380],[1150,1960],[MAPW-1150,1960]],
    water(M,R){const ph=R()*6.28,J=[1600,820];const wig=(a,b,amp)=>{const pts=[];const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,L=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,w=amp*Math.sin(t*9+ph)*Math.sin(t*Math.PI);pts.push([x+nx*w,y+ny*w]);}return pts;};
      M.rivers.push({pts:wig([1600,-200],J,22),hw:()=>120});const L=wig(J,[260,MAPH+200],40),Rr=L.map(([x,y])=>[MAPW-x,y]);M.rivers.push({pts:L,hw:()=>100});M.rivers.push({pts:Rr,hw:()=>100});
      M.bridgeAt=[[0,.45],[1,.33],[1,.72],[2,.33],[2,.72]];M.bridgeFrac=true;}},
  oasis:{name:'Oasis Basin',min:2,max:8,sym:'point',desc:'Open desert ringed around a central lake. No bridges, many approaches.',
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1250,1100+Math.sin(a)*800]);return s;})(),
    water(M,R){const w=[R()*6.28,R()*6.28];M.lakes.push({x:1600,y:1100,r:300,rx:1.35,wob:a=>.1*Math.sin(a*3+w[0])+.06*Math.sin(a*5+w[1])});
      for(const a of [-1.1,2.04,.47,-2.67]){const x=1600+Math.cos(a)*1250,y=1100+Math.sin(a)*800;M.lakes.push({x,y,r:85,rx:1.2,wob:q=>.15*Math.sin(q*3+x)});}}},
  gulf:{name:'Gulf Coast',min:2,max:4,sym:'mirrorX',desc:'Bases on a desert shore above the open sea. Naval power matters.',
    slots:[[450,330],[MAPW-450,330],[520,1250],[MAPW-520,1250]],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-300;x<=MAPW+300;x+=40)pts.push([x,MAPH+60-90*Math.cos((x-1600)/1600*Math.PI*.5)*0+40*Math.sin(x*.004+ph)]);M.rivers.push({pts,hw:(t,x)=>470+120*Math.exp(-Math.pow((x-1600)/380,2))});}},
  plateau:{name:'Sinai Plateau',min:2,max:8,sym:'point',desc:'Dry highlands with rock mesas and no water. A pure land war.',rough:1.6,
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1280,1100+Math.sin(a)*820]);return s;})(),
    water(){}},
  hormuz:{home:['IR','AE'],name:'Strait of Hormuz',min:2,max:8,sym:'none',desc:'Iran faces the Arabian shore across the world\'s busiest oil chokepoint. Navies rule the strait; armies must go the long way round.',
    slots:[[1650,270],[1750,1800],[450,330],[2750,1950],[2800,330],[480,1950],[1050,270],[1100,1830]],
    water(M,R){const ph=R()*6.28;const P=[[780,1280],[1150,1010],[1500,820],[1800,760],[2100,840],[2450,1080],[2800,1350],[3500,1720]];const pts=[];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let k=0;k<n;k++){const t=k/n;pts.push([a[0]+(b[0]-a[0])*t+12*Math.sin((a[1]+t*(b[1]-a[1]))*.02+ph),a[1]+(b[1]-a[1])*t+14*Math.sin((a[0]+t*(b[0]-a[0]))*.013+ph)]);}}pts.push(P[P.length-1]);
      M.rivers.push({pts,hw:(t,x)=>150+190*Math.min(1,Math.abs(x-1720)/900)});
      for(const [x,y,r,rx,rot] of [[1180,880,62,2.7,-.48],[1640,905,34,1.3,0],[1900,905,28,1.4,.4],[930,1170,30,1.2,0],[1030,1070,24,1.2,0],[2330,1150,30,1.6,.6]])M.islands.push({x,y,r,rx,rot,wob:q=>.12*Math.sin(q*3+x)});}},
  arctic:{name:'Arctic Front',min:2,max:8,sym:'point',theme:'snow',desc:'A frozen river and snowbound forests. Three bridges, rocky hills and falling snow.',
    slots:[[450,1100],[2750,1100],[1050,330],[2150,1870],[1050,1870],[2150,330],[420,330],[2780,1870]],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1600+70*Math.sin(y*.0035+ph)+25*Math.sin(y*.011+ph*2),y]);M.rivers.push({pts,hw:()=>118});M.bridgeAt=[[0,.2],[0,.5],[0,.8]];M.bridgeFrac=true;
      M.peaks.push({x:820,y:760,r:120,rx:1.6,rot:.5},{x:MAPW-820,y:MAPH-760,r:120,rx:1.6,rot:.5},{x:780,y:1500,r:90,rx:1.3,rot:-.4},{x:MAPW-780,y:MAPH-1500,r:90,rx:1.3,rot:-.4});}},
  islands:{name:'Island Chain',min:2,max:4,sym:'point',fieldMinB:340,desc:'Four island fortresses around a central isle in open sea. Long bridges are the only land routes, so fleets decide the war.',
    slots:[[560,470],[2640,1730],[560,1730],[2640,470]],
    water(M,R){M.lakes.push({x:1600,y:1100,r:6000,rx:1,wob:()=>0});const w=R()*6.28;
      for(const [x,y] of [[560,470],[2640,1730],[560,1730],[2640,470]])M.islands.push({x,y,r:330,rx:1.45,rot:0,wob:q=>.1*Math.sin(q*3+w+x)+.05*Math.sin(q*7+y)});
      M.islands.push({x:1600,y:1100,r:250,rx:1.7,rot:0,wob:q=>.08*Math.sin(q*4+w)});
      for(const [x,y] of [[1050,770],[2150,1430],[1050,1430],[2150,770]]){const dx=1600-x,dy=1100-y,L=Math.hypot(dx,dy);M.bridgeAng.push([x,y,dx/L,dy/L]);}}},
  zagros:{name:'Zagros Mountains',min:2,max:8,sym:'point',rough:1.3,desc:'Two snow-capped ranges split the land into three valleys. Armies fight for the mountain passes.',
    slots:[[450,1100],[2750,1100],[450,380],[2750,1820],[450,1820],[2750,380],[1600,350],[1600,1850]],
    water(M,R){const ph=R()*6.28;const ridge=(y0,y1)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([1100+60*Math.sin(y*.004+ph)+20*Math.sin(y*.013),y]);return pts;};
      for(const [a,b] of [[-200,470],[740,1440],[1720,MAPH+200]]){const L=ridge(a,b);M.ridges.push({pts:L,hw:()=>105});M.ridges.push({pts:L.map(([x,y])=>[MAPW-x,MAPH-y]),hw:()=>105});}
      M.lakes.push({x:1600,y:1100,r:120,rx:1.5,wob:q=>.1*Math.sin(q*3+ph)});}},
  // ---- real-world theatres ----
  lebanon:{home:['RS','IL'],name:'South Lebanon',min:2,max:6,sym:'none',theme:'green',rough:1.35,desc:'Green limestone hills between the Mediterranean coast and the Litani River. Villages to fight through, ridges to hold, two river crossings.',
    slots:[[760,1960],[2860,1180],[1300,260],[2880,1960],[2900,260],[1800,1260]],
    cities:[[470,1430,170,'lebanon'],[1550,1880,125,'lebanon'],[2350,330,140,'lebanon'],[2200,1500,90,'lebanon']],
    water(M,R){const ph=R()*6.28;const cst=[];for(let y=-200;y<=MAPH+200;y+=40)cst.push([-40+40*Math.sin(y*.004+ph),y]);M.rivers.push({pts:cst,hw:()=>300});
      const lit=[];for(let x=MAPW+200;x>=120;x-=40){const t=(MAPW+200-x)/(MAPW+80);lit.push([x,560+60*Math.sin(x*.004+ph)+(x<1100?(1100-x)*.42:0)]);}M.rivers.push({pts:lit,hw:()=>58});
      M.bridgeAt=[[1,.3],[1,.62]];M.bridgeFrac=true;M.peaks.push({x:1400,y:1300,r:95,rx:1.5,rot:.4},{x:2400,y:1050,r:85,rx:1.4,rot:-.3},{x:2100,y:1900,r:70,rx:1.6,rot:.2},{x:900,y:1000,r:70,rx:1.4,rot:.9});}},
  persia:{home:['IR'],name:'Persian Plateau',min:2,max:8,sym:'none',rough:1.25,desc:'Iran\'s high desert below the Alborz range: a salt lake in the middle, cities on the old caravan road and three mountain passes to the north.',
    slots:[[380,1180],[2840,1180],[420,1960],[2800,1960],[380,640],[2840,640],[1250,1980],[2050,1980]],
    cities:[[1500,700,190,'mideast'],[900,1560,120,'mideast'],[2420,1640,140,'mideast']],
    water(M,R){const ph=R()*6.28;const ridge=(x0,x1)=>{const pts=[];for(let x=x0;x<=x1;x+=40)pts.push([x,330+40*Math.sin(x*.003+ph)]);return pts;};for(const [a,b] of [[-200,640],[900,1900],[2160,MAPW+200]])M.ridges.push({pts:ridge(a,b),hw:()=>110});
      M.lakes.push({x:1700,y:1320,r:210,rx:1.7,wob:q=>.12*Math.sin(q*3+ph)+.05*Math.sin(q*7)});}},
  mesopotamia:{home:['IR','RS'],name:'Mesopotamia',min:2,max:6,sym:'none',desc:'Iraq between the Tigris and the Euphrates: Baghdad between the rivers, Basra by the Shatt al-Arab and bridges everywhere.',
    slots:[[450,1620],[2880,360],[1300,2000],[2700,920],[600,160],[2150,240]],
    cities:[[1400,900,200,'mideast'],[2900,1880,130,'mideast'],[650,820,110,'mideast']],
    water(M,R){const ph=R()*6.28;const line=(a,b,amp,f)=>{const pts=[];const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let i=0;i<=n;i++){const t=i/n;pts.push([a[0]+(b[0]-a[0])*t+amp*Math.sin(t*f+ph),a[1]+(b[1]-a[1])*t+amp*Math.cos(t*f*.8+ph)]);}return pts;};
      M.rivers.push({pts:line([-200,420],[2400,1500],60,11),hw:()=>66});M.rivers.push({pts:line([1200,-200],[2400,1500],50,9),hw:()=>60});M.rivers.push({pts:line([2400,1500],[3500,2300],30,5),hw:()=>95});
      M.bridgeAt=[[0,.18],[0,.45],[0,.75],[1,.3],[1,.65],[2,.45]];M.bridgeFrac=true;M.lakes.push({x:2640,y:1290,r:70,rx:1.6,wob:q=>.2*Math.sin(q*3)});}},
  yemen:{home:['DW','SA'],name:'Yemen Highlands',min:2,max:6,sym:'none',rough:1.5,desc:'From the Red Sea coast up into the Sarawat mountains: tower-house cities of the highlands, narrow passes and a port on the plain.',
    slots:[[660,400],[2850,1900],[660,1900],[2850,350],[1950,1460],[1850,150]],
    cities:[[1850,800,180,'yemen'],[520,1120,140,'mideast'],[1650,1880,120,'yemen'],[2780,1060,100,'yemen']],
    water(M,R){const ph=R()*6.28;const cst=[];for(let y=-200;y<=MAPH+200;y+=40)cst.push([-60+50*Math.sin(y*.005+ph),y]);M.rivers.push({pts:cst,hw:()=>330});
      const ridge=(y0,y1,x0)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([x0+70*Math.sin(y*.004+ph),y]);return pts;};for(const [a,b] of [[-200,560],[820,1450],[1720,MAPH+200]])M.ridges.push({pts:ridge(a,b,1250),hw:()=>100});
      M.ridges.push({pts:ridge(1250,MAPH+200,2350),hw:()=>85});M.peaks.push({x:2350,y:500,r:90,rx:1.3,rot:.5});}},
  volga:{home:['RU'],name:'Volga Winter',min:2,max:8,sym:'none',theme:'snow',desc:'The frozen Volga in winter: a great river city on the east bank, villages in the snow and three bridges to fight over.',
    slots:[[400,1100],[2800,1100],[600,300],[2600,1900],[600,1900],[2600,300],[300,720],[2900,1500]],
    cities:[[2000,1080,200,'russia'],[760,560,90,'russia'],[2560,1700,90,'russia'],[880,1600,80,'russia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1560+190*Math.sin(y*.0026+ph)+40*Math.sin(y*.009+ph*2),y]);M.rivers.push({pts,hw:()=>140});M.bridgeAt=[[0,.22],[0,.5],[0,.8]];M.bridgeFrac=true;}},
  heartland:{home:['US'],name:'American Heartland',min:2,max:8,sym:'none',theme:'green',desc:'Farm country where two great rivers meet: a river city at the confluence, small towns and long bridges.',
    slots:[[350,1100],[2860,1150],[400,300],[2850,1900],[400,1900],[2850,300],[1000,1100],[2300,1500]],
    cities:[[1820,820,200,'america'],[650,560,95,'america'],[2650,1650,105,'america'],[760,1650,85,'america']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1480+150*Math.sin(y*.003+ph)+40*Math.sin(y*.011),y]);M.rivers.push({pts,hw:()=>110});
      const oh=[];for(let x=MAPW+200;x>=1520;x-=40){const t=(MAPW+200-x)/(MAPW-1320);oh.push([x,600+t*700+40*Math.sin(x*.006+ph)]);}M.rivers.push({pts:oh,hw:()=>70});
      M.bridgeAt=[[0,.2],[0,.46],[0,.82],[1,.45]];M.bridgeFrac=true;}},
  bosphorus:{name:'Bosphorus',min:2,max:8,sym:'none',theme:'green',home:['TR'],desc:'Istanbul on both shores of the Bosphorus, between the Black Sea and the Sea of Marmara. Two great bridges join Europe and Asia.',
    slots:[[380,1150],[2820,1100],[420,1950],[2800,1950],[600,320],[2600,320],[1150,1980],[2100,1980]],
    cities:[[1300,1000,210,'turkey'],[1950,1180,210,'turkey'],[900,1700,110,'turkey']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:1600,y:-380,r:600,rx:2.4,wob:q=>.05*Math.sin(q*5+ph)});M.lakes.push({x:1700,y:2560,r:560,rx:2.6,wob:q=>.05*Math.sin(q*4+ph)});
      const pts=[];for(let y=-100;y<=MAPH+100;y+=40)pts.push([1620+120*Math.sin(y*.004+ph)+(y-1100)*.08,y]);M.rivers.push({pts,hw:()=>70});M.bridgeAt=[[0,.36],[0,.62]];M.bridgeFrac=true;}},
  golan:{name:'Golan Heights',min:2,max:6,sym:'none',rough:1.6,home:['IL'],desc:'Basalt plateau above the Sea of Galilee, with Mount Hermon to the north and the Jordan valley below. High ground decides everything.',
    slots:[[950,1950],[2850,1950],[2850,700],[700,300],[1750,1950],[2800,180]],
    cities:[[820,1250,110,'lebanon'],[2150,1250,100,'mideast'],[1500,1820,80,'lebanon']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:560,y:880,r:200,rx:.8,wob:q=>.1*Math.sin(q*3+ph)});const jr=[];for(let y=1060;y<=MAPH+200;y+=40)jr.push([560+40*Math.sin(y*.01+ph),y]);M.rivers.push({pts:jr,hw:()=>34});M.bridgeAt=[[0,.5]];M.bridgeFrac=true;
      M.peaks.push({x:1700,y:250,r:200,rx:1.8,rot:.2},{x:1600,y:1000,r:80,rx:1.3,rot:.5},{x:2500,y:1500,r:75,rx:1.5,rot:-.3},{x:1250,y:1500,r:70,rx:1.4,rot:.8});}},
  fulda:{name:'Fulda Gap',min:2,max:8,sym:'point',theme:'green',home:['EU'],desc:'Rolling German farmland, forests and half-timbered towns on the old Cold War invasion route. A winding river with four bridges.',
    slots:[[400,1100],[2800,1100],[500,300],[2700,1900],[500,1900],[2700,300],[1200,1980],[2000,220]],
    cities:[[1150,700,120,'europe'],[2050,1500,120,'europe'],[1600,1100,95,'europe'],[700,1500,70,'europe'],[2500,700,70,'europe']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,1100+260*Math.sin(x*.0024+ph)+50*Math.sin(x*.009)]);M.rivers.push({pts,hw:()=>52});M.bridgeAt=[[0,.2],[0,.42],[0,.6],[0,.82]];M.bridgeFrac=true;
      M.peaks.push({x:1600,y:500,r:80,rx:1.6,rot:.2},{x:1600,y:1700,r:80,rx:1.6,rot:.2});}},
  dnipro:{name:'Dnipro Front',min:2,max:8,sym:'none',theme:'green',home:['UA'],desc:'The wide Dnipro splits Ukraine: a great city on both banks, river islands and long bridges under fire.',
    slots:[[380,1100],[2820,1100],[500,300],[2700,1900],[500,1900],[2700,300],[300,700],[2900,1500]],
    cities:[[1300,950,190,'russia'],[1980,1050,170,'russia'],[700,1600,80,'europe'],[2600,600,80,'europe']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1640+150*Math.sin(y*.0028+ph),y]);M.rivers.push({pts,hw:()=>150});M.bridgeAt=[[0,.25],[0,.48],[0,.78]];M.bridgeFrac=true;
      M.islands.push({x:1650,y:620,r:60,rx:2,rot:1.4,wob:q=>.1*Math.sin(q*3)},{x:1640,y:1600,r:50,rx:1.8,rot:1.5,wob:q=>.1*Math.sin(q*4)});}},
  rubalkhali:{name:'Empty Quarter',min:2,max:8,sym:'point',rough:.85,home:['SA'],desc:'Endless dunes of the Rub al Khali around Riyadh. Wide open ground for armour; a few oases and oil everywhere.',
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1300,1100+Math.sin(a)*840]);return s;})(),
    cities:[[1600,1100,190,'mideast']],
    water(M,R){for(const [x,y] of [[900,700],[2300,1500],[2300,700],[900,1500]])M.lakes.push({x,y,r:55,rx:1.4,wob:q=>.15*Math.sin(q*3+x)});}},
  emirates:{name:'Gulf Emirates',min:2,max:4,sym:'mirrorX',home:['AE'],desc:'A glittering skyline on the Gulf shore with palm-shaped islands offshore. Fight between the towers and the sea.',
    slots:[[450,1900],[2750,1900],[450,1200],[2750,1200]],
    cities:[[1600,1050,260,'gulfcity'],[800,1550,90,'mideast'],[2400,1550,90,'mideast']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-300;x<=MAPW+300;x+=40)pts.push([x,-70+30*Math.sin(x*.004+ph)]);M.rivers.push({pts,hw:()=>520});
      for(const [x,y] of [[900,640],[2300,640]]){M.islands.push({x,y,r:120,rx:1,rot:0,wob:q=>.35*Math.max(0,Math.sin(q*8))});}M.bridgeAng.push([900,560,0,1],[2300,560,0,1]);}},
  indus:{name:'Indus Valley',min:2,max:6,sym:'none',theme:'green',rough:1.2,home:['PK'],desc:'Pakistan\'s Indus plain under the Karakoram: a great river, a walled city and snow peaks guarding the north.',
    slots:[[400,1950],[2850,900],[600,1100],[2200,620],[1500,2000],[2200,1950]],
    cities:[[1700,1250,190,'southasia'],[800,1650,90,'southasia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let t=0;t<=1.0001;t+=.01){const x=-200+t*3600,y=300+t*1500+90*Math.sin(t*9+ph);pts.push([x,y]);}M.rivers.push({pts,hw:()=>95});M.bridgeAt=[[0,.25],[0,.5],[0,.75]];M.bridgeFrac=true;
      M.peaks.push({x:2200,y:220,r:200,rx:2.2,rot:.15},{x:900,y:150,r:150,rx:1.8,rot:-.1});}},
  kashmir:{name:'Kashmir Line',min:2,max:6,sym:'point',theme:'green',rough:1.5,home:['IN'],desc:'High valleys of Kashmir: a lake city in the middle, Himalayan ridges on both sides and contested passes.',
    slots:[[400,1100],[2800,1100],[500,300],[2700,1900],[500,1900],[2700,300]],
    cities:[[1600,1450,150,'southasia']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:1600,y:1000,r:150,rx:1.4,wob:q=>.12*Math.sin(q*3+ph)});
      const ridge=(y0,y1,x0)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([x0+60*Math.sin(y*.004+ph),y]);return pts;};for(const [a,b] of [[-200,620],[980,1350]]){M.ridges.push({pts:ridge(a,b,1000),hw:()=>100});M.ridges.push({pts:ridge(a,b,1000).map(([x,y])=>[MAPW-x,MAPH-y]),hw:()=>100});}}},
  taiwan:{name:'Taiwan Strait',min:2,max:6,sym:'none',theme:'green',home:['CN'],desc:'Mainland China faces the island across the strait. Two long military causeways can be stormed, but navies, landing craft and air power decide who lands where.',
    slots:[[450,1900],[2850,1600],[450,400],[2850,600],[700,1150],[2500,1100]],
    cities:[[900,800,150,'asia'],[2650,1850,140,'asia'],[2700,350,110,'korea']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let t=0;t<=1.0001;t+=.01){pts.push([1500+t*400+80*Math.sin(t*7+ph),-200+t*2600]);}M.rivers.push({pts,hw:(t,x)=>330});M.islands.push({x:1780,y:1000,r:60,rx:1.5,rot:.4,wob:q=>.1*Math.sin(q*3)});M.bridgeAng.push([1575,480,.988,-.152],[1835,1700,.988,-.152]);}},
  dmz:{name:'Korean DMZ',min:2,max:8,sym:'mirrorY',rough:1.3,home:['KP','KR'],desc:'The most fortified border on Earth: the Imjin river, the demilitarised strip, mountain ridges to the east and capitals within artillery range.',
    slots:[[500,250],[500,1950],[1600,200],[1600,2000],[2700,250],[2700,1950],[1050,300],[1050,1900]],
    cities:[[1150,1850,150,'korea'],[1150,350,120,'asia'],[2250,1880,90,'korea'],[2250,330,80,'asia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-200;x<=2200;x+=40)pts.push([x,1100+50*Math.sin(x*.005+ph)]);M.rivers.push({pts,hw:()=>58});M.bridgeAt=[[0,.25],[0,.6]];M.bridgeFrac=true;
      const ridge=(y0,y1)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([2550+50*Math.sin(y*.006),y]);return pts;};M.ridges.push({pts:ridge(560,940),hw:()=>95},{pts:ridge(1260,1640),hw:()=>95});}},
  nile:{name:'Nile & Suez',min:2,max:8,sym:'none',home:['EG'],desc:'Cairo on the Nile and the Suez Canal to the east: green river banks in a sea of sand, with bridges and canal crossings to seize.',
    slots:[[350,1100],[2850,1100],[350,300],[2850,1900],[350,1900],[2850,300],[2200,1950],[2200,250]],
    cities:[[1050,1000,200,'mideast'],[2420,1100,90,'mideast'],[1100,1850,80,'mideast']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([820+60*Math.sin(y*.004+ph),y]);M.rivers.push({pts,hw:()=>75});
      const can=[];for(let y=-200;y<=MAPH+200;y+=40)can.push([2550+8*Math.sin(y*.002),y]);M.rivers.push({pts:can,hw:()=>38});M.bridgeAt=[[0,.25],[0,.5],[0,.78],[1,.3],[1,.7]];M.bridgeFrac=true;}},
  caribbean:{name:'Caribbean Island',min:2,max:4,sym:'point',theme:'green',home:['CU'],desc:'A long tropical island in warm seas: Havana on the north shore, palm-fringed cays and landings on the beaches.',
    slots:[[700,900],[2500,1300],[1250,1450],[1950,750]],
    cities:[[1300,780,160,'latin'],[2150,1380,110,'latin']],
    water(M,R){M.lakes.push({x:1600,y:1100,r:6000,rx:1,wob:()=>0});const w=R()*6.28;M.islands.push({x:1600,y:1100,r:520,rx:2.6,rot:-.12,wob:q=>.12*Math.sin(q*3+w)+.07*Math.sin(q*7+w*2)});
      for(const [x,y] of [[500,300],[2700,1900],[2800,350],[400,1850]])M.islands.push({x,y,r:90,rx:1.6,rot:.4,wob:q=>.15*Math.sin(q*3+x)});}},
};
const MAP_KEYS=Object.keys(MAPS);
let BASE_SLOTS=MAPS.strait.slots;
let BASES=BASE_SLOTS.slice(0,2);
// Start positions: by default players take the map's first n slots. If the player picked a slot, they get it and the
// others are spread out by farthest-point choice so nobody starts next door to anyone.
function slotOrder(D,n,pick){const S=D.slots.slice(0,D.max||D.slots.length);n=Math.max(2,Math.min(S.length,n));if(!(pick>=0&&pick<S.length))return S.slice(0,n).map((_,i)=>i);
  const out=[pick];while(out.length<n){let best=-1,bd=-1;for(let i=0;i<S.length;i++){if(out.includes(i))continue;const d=Math.min(...out.map(j=>Math.hypot(S[i][0]-S[j][0],S[i][1]-S[j][1])));if(d>bd+1e-6){bd=d;best=i;}}out.push(best);}return out;}
function setBases(n,mk,pick){const D=MAPS[mk]||MAPS.strait;BASE_SLOTS=D.slots.map(([x,y])=>[x*WK,y*WK]);BASES=slotOrder(D,n,pick).map(i=>BASE_SLOTS[i]);}
let EF_R=8;let EF_W=Math.ceil(MAPW/EF_R)+1,EF_H=Math.ceil(MAPH/EF_R)+1;
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1;let t=((px-ax)*dx+(py-ay)*dy)/L;t=Math.max(0,Math.min(1,t));const qx=ax+dx*t,qy=ay+dy*t;return[Math.hypot(px-qx,py-qy),t];}
function mkMap(seed,mk){
  mk=MAPS[mk]?mk:'strait';const D=MAPS[mk];
  srand=mulberry(seed);const R=srand;
  const M={seed,key:mk,name:D.name,rough:D.rough||1,theme:D.theme||'desert',rivers:[],lakes:[],islands:[],ridges:[],peaks:[],bridgeAng:[],bridges:[]};
  {const sw=MAPW,sh=MAPH;MAPW=3200;MAPH=2200;try{D.water(M,R);}finally{MAPW=sw;MAPH=sh;}}
  // the map is designed at 3200 x 2200: scale every feature to the current world size
  if(WK!==1){const k=WK,P=p=>p.map(([x,y])=>[x*k,y*k]);
    for(const rv of M.rivers){rv.pts=P(rv.pts);const h0=rv.hw;rv.hw=(t,x)=>h0(t,x/k)*k;}
    for(const L of M.lakes){L.x*=k;L.y*=k;L.r*=k;}for(const I of M.islands){I.x*=k;I.y*=k;I.r*=k;}
    for(const rg of M.ridges){rg.pts=P(rg.pts);const h0=rg.hw;rg.hw=()=>h0()*k;}for(const pk of M.peaks){pk.x*=k;pk.y*=k;pk.r*=k;}
    if(M.bridgeAt&&!M.bridgeFrac)M.bridgeAt=M.bridgeAt.map(([ri,at])=>[ri,at*k]);M.bridgeAng=M.bridgeAng.map(([x,y,nx,ny])=>[x*k,y*k,nx,ny]);}
  // edge field
  const EF=new Float32Array(EF_W*EF_H).fill(-1000);
  for(const rv of M.rivers){const P=rv.pts;let acc=[0];for(let i=1;i<P.length;i++)acc.push(acc[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));rv.len=acc[acc.length-1];rv.acc=acc;
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;for(const [x,y] of P){mnx=Math.min(mnx,x);mxx=Math.max(mxx,x);mny=Math.min(mny,y);mxy=Math.max(mxy,y);}let hmax=0;for(let q=0;q<=20;q++)hmax=Math.max(hmax,rv.hw(q/20,mnx+(mxx-mnx)*q/20));const pad=hmax+650;
    for(let j=0;j<EF_H;j++){const y=j*EF_R;if(y<mny-pad||y>mxy+pad)continue;for(let i=0;i<EF_W;i++){const x=i*EF_R;if(x<mnx-pad||x>mxx+pad)continue;let bd=pad,bi=-1,bt=0;
      for(let k=0;k<P.length-1;k++){const a=P[k],b=P[k+1];const lb=Math.max(Math.min(Math.abs(a[0]-x),Math.abs(b[0]-x)),Math.min(Math.abs(a[1]-y),Math.abs(b[1]-y)))-60;if(lb>bd)continue;const [d,t]=segDist(x,y,a[0],a[1],b[0],b[1]);if(d<bd){bd=d;bi=k;bt=t;}}
      if(bi<0)continue;const qx=P[bi][0]+(P[bi+1][0]-P[bi][0])*bt;const e=rv.hw((acc[bi]+(acc[bi+1]-acc[bi])*bt)/rv.len,qx)-bd;const k2=j*EF_W+i;if(e>EF[k2])EF[k2]=e;}}}
  for(const L of M.lakes){for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,dx=(x-L.x)/L.rx,dy=y-L.y,d=Math.hypot(dx,dy);if(d>L.r*1.6+600)continue;const a=Math.atan2(dy,dx);const e=(L.r*(1+L.wob(a))-d)*Math.min(1,L.rx*.9);const k2=j*EF_W+i;if(e>EF[k2])EF[k2]=e;}}}
  for(const I of M.islands){const c=Math.cos(-I.rot),sn=Math.sin(-I.rot);for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,qx=x-I.x,qy=y-I.y,lx=(qx*c-qy*sn)/I.rx,ly=qx*sn+qy*c,d=Math.hypot(lx,ly);if(d>I.r*1.6+400)continue;const e=(I.r*(1+I.wob(Math.atan2(ly,lx)))-d)*Math.min(1,I.rx*.9);const k2=j*EF_W+i;if(-e<EF[k2])EF[k2]=-e;}}}
  M.EF=EF;
  // mountains: positive inside a ridge or peak (distance in from its foot)
  const MF=new Float32Array(EF_W*EF_H).fill(-1000);
  for(const rv of M.ridges){const P=rv.pts;for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R;let bd=500;for(let k=0;k<P.length-1;k++){const a=P[k],b=P[k+1];const lb=Math.max(Math.min(Math.abs(a[0]-x),Math.abs(b[0]-x)),Math.min(Math.abs(a[1]-y),Math.abs(b[1]-y)))-60;if(lb>bd)continue;const [d]=segDist(x,y,a[0],a[1],b[0],b[1]);if(d<bd)bd=d;}
      if(bd>=500)continue;const e=rv.hw()*(1+.18*Math.sin(x*.013+y*.009)+.1*Math.sin(x*.031-y*.027))-bd;const k2=j*EF_W+i;if(e>MF[k2])MF[k2]=e;}}}
  for(const K of M.peaks){const c=Math.cos(-K.rot),sn=Math.sin(-K.rot);for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,qx=x-K.x,qy=y-K.y,lx=(qx*c-qy*sn)/K.rx,ly=qx*sn+qy*c,d=Math.hypot(lx,ly);if(d>K.r+500)continue;const e=(K.r*(1+.15*Math.sin(Math.atan2(ly,lx)*4+K.x))-d)*Math.min(1,K.rx);const k2=j*EF_W+i;if(e>MF[k2])MF[k2]=e;}}}
  M.MF=MF;M.hasMtn=M.ridges.length+M.peaks.length>0;
  M.mf=(x,y)=>{const fx=Math.max(0,Math.min(EF_W-1.001,x/EF_R)),fy=Math.max(0,Math.min(EF_H-1.001,y/EF_R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*EF_W+i;return(MF[k]*(1-tx)+MF[k+1]*tx)*(1-ty)+(MF[k+EF_W]*(1-tx)+MF[k+EF_W+1]*tx)*ty;};
  M.edge=(x,y)=>{const fx=Math.max(0,Math.min(EF_W-1.001,x/EF_R)),fy=Math.max(0,Math.min(EF_H-1.001,y/EF_R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*EF_W+i;return(EF[k]*(1-tx)+EF[k+1]*tx)*(1-ty)+(EF[k+EF_W]*(1-tx)+EF[k+EF_W+1]*tx)*ty;};
  M.isWater=(x,y)=>M.edge(x,y)>0;
  M.hasWater=M.rivers.length+M.lakes.length>0;M.mtn=(x,y)=>M.hasMtn?M.mf(x,y):-1000;
  // compatibility helpers used by older code paths
  M.depth=(x,y)=>{const e=M.edge(x,y);return e>0?0:-e+200;};M.hw=()=>200;
  M.deeper=(x,y,r)=>{let best=[x,y],be=M.edge(x,y);for(let a=0;a<6.28;a+=.39)for(const rr of [r*.5,r]){const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;const e=M.edge(px,py);if(e>be){be=e;best=[px,py];}}return best;};
  // bridges: perpendicular across a river at a point along it
  for(const [ri,at] of (M.bridgeAt||[])){const rv=M.rivers[ri];if(!rv)continue;const P=rv.pts;let k=0;
    if(M.bridgeFrac){const target=at*rv.len;while(k<P.length-2&&rv.acc[k+1]<target)k++;}else{let bd=1e9;for(let q=0;q<P.length-1;q++){const d=Math.abs((P[q][0]+P[q+1][0])/2-at);if(d<bd){bd=d;k=q;}}}
    const a=P[k],b=P[k+1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,t=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-t[1],t[0]],cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
    let h=40;while(h<900&&(M.edge(cx+n[0]*h,cy+n[1]*h)>-8||M.edge(cx-n[0]*h,cy-n[1]*h)>-8))h+=8;h+=26;
    M.bridges.push({x:cx,y:cy,h,n,t,a:[cx-n[0]*h,cy-n[1]*h],b:[cx+n[0]*h,cy+n[1]*h]});}
  for(const [cx,cy,nx,ny] of M.bridgeAng){const n=[nx,ny],t=[-ny,nx];let h=40;while(h<900&&(M.edge(cx+n[0]*h,cy+n[1]*h)>-8||M.edge(cx-n[0]*h,cy-n[1]*h)>-8))h+=8;h+=26;M.bridges.push({x:cx,y:cy,h,n,t,a:[cx-n[0]*h,cy-n[1]*h],b:[cx+n[0]*h,cy+n[1]*h]});}
  const grid=new Uint8Array(GW*GH);
  for(let cy=0;cy<GH;cy++)for(let cx=0;cx<GW;cx++){const x=cx*CELL+CELL/2,y=cy*CELL+CELL/2;if(!M.isWater(x,y)){if(M.mtn(x,y)>0)grid[cy*GW+cx]=3;continue;}let v=1;
    for(const b of M.bridges){const dx=x-b.x,dy=y-b.y,along=Math.abs(dx*b.t[0]+dy*b.t[1]),acr=Math.abs(dx*b.n[0]+dy*b.n[1]);if(along<36&&acr<b.h+10)v=2;}grid[cy*GW+cx]=v;}
  M.grid=grid;
  // Cities: blocks of buildings on a street grid. Building lots are impassable (units use the streets) and give
  // infantry cover; bases, supply and oil keep clear of them.
  M.cities=[];M.cityBlds=[];
  if(D.cities){const CR=mulberry((seed|0)*13+7);for(const [cxd,cyd,rd,style] of D.cities){const cx=cxd*WK,cy=cyd*WK,r=rd*Math.pow(WK,.78)*1.3;M.cities.push({x:cx,y:cy,r,style});
    const i0=Math.floor((cx-r)/CELL),i1=Math.ceil((cx+r)/CELL),j0=Math.floor((cy-r)/CELL),j1=Math.ceil((cy+r)/CELL),sx=Math.floor(cx/CELL),sy=Math.floor(cy/CELL);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(i<1||j<1||i>=GW-1||j>=GH-1)continue;const x=i*CELL+CELL/2,y=j*CELL+CELL/2,d=Math.hypot(x-cx,y-cy);if(d>r)continue;
      if(((i-sx)%4+4)%4===0||((j-sy)%4+4)%4===0)continue;if(grid[j*GW+i]!==0)continue;if(BASES.some(([bx,by])=>Math.hypot(bx-x,by-y)<400))continue;
      if(M.edge(x,y)>-50||M.mtn(x,y)>-40)continue;const core=1-d/r;if(CR()>.42+.6*core)continue;grid[j*GW+i]=3;
      const tall=style==='russia'?18+core*46*CR():style==='america'?(core>.55?28+core*70*CR():8+CR()*5):style==='yemen'?16+CR()*22:style==='gulfcity'?(core>.35?45+core*110*CR():12+CR()*8):style==='korea'?24+core*50*CR():style==='asia'?14+core*38*CR():style==='europe'?9+CR()*9:style==='latin'?7+CR()*8:style==='southasia'?8+CR()*12:8+CR()*10+core*16*CR();
      if(CR()<.55&&tall<30){for(const [ox,oy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){if(CR()<.15)continue;M.cityBlds.push({x:x+ox*CELL*.24,y:y+oy*CELL*.24,w:CELL*(.36+CR()*.1),d:CELL*(.36+CR()*.1),h:tall*(.6+CR()*.7),style,core,v:CR()});}}
      else M.cityBlds.push({x,y,w:CELL*(.74+CR()*.18),d:CELL*(.74+CR()*.18),h:tall,style,core,v:CR()});}}}
  M.cityNear=(x,y,pad)=>M.cities.some(c=>Math.hypot(x-c.x,y-c.y)<c.r+(pad||0));
  {const reach=new Uint8Array(GW*GH),st=[];const s0=[Math.floor(BASES[0][0]/CELL),Math.floor(BASES[0][1]/CELL)];st.push(s0[1]*GW+s0[0]);reach[st[0]]=1;
   while(st.length){const c=st.pop(),cx=c%GW,cy=(c/GW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const k=ny*GW+nx;if(reach[k])continue;const v=grid[k];if(v===0||v===2){reach[k]=1;st.push(k);}}}M.reach=reach;}
  // supply fields and oil: one field by each base, then neutral ones placed in symmetric pairs
  const mir=D.sym==='none'?null:D.sym==='mirrorX'?([x,y])=>[MAPW-x,y]:D.sym==='mirrorY'?([x,y])=>[x,MAPH-y]:([x,y])=>[MAPW-x,MAPH-y];
  const dry=(x,y,m)=>x>90&&y>90&&x<MAPW-90&&y<MAPH-90&&!M.cityNear(x,y,60)&&M.edge(x,y)<-(m||90)&&M.mtn(x,y)<-(m||90)*.8&&M.reach[Math.floor(y/CELL)*GW+Math.floor(x/CELL)]===1;
  M.fields=[];M.oil=[];
  for(const [bx,by] of BASES){const a0=Math.atan2(MAPH/2-by,MAPW/2-bx);let put=false;for(let r of [390,430,350,470,300,250])for(let q=0;q<14&&!put;q++){const a=a0+(q%2?1:-1)*Math.ceil(q/2)*.35,fx=bx+Math.cos(a)*r,fy=by+Math.sin(a)*r;
      if(!dry(fx,fy,110))continue;if(BASES.some(([qx,qy])=>(qx!==bx||qy!==by)&&Math.hypot(qx-fx,qy-fy)<380))continue;if(M.fields.some(f=>Math.hypot(f.x-fx,f.y-fy)<220))continue;M.fields.push({x:fx,y:fy,r:46,amt:9000});put=true;}}
  const free=(x,y,minB,minF,minO)=>dry(x,y,110)&&BASES.every(([bx,by])=>Math.hypot(bx-x,by-y)>minB)&&M.fields.every(f=>Math.hypot(f.x-x,f.y-y)>minF)&&M.oil.every(o=>Math.hypot(o.x-x,o.y-y)>minO);
  const pairs=(want,push,minB,minF,minO)=>{let got=0;if(!mir)want*=2;for(let k=0;k<900&&got<want;k++){const p=[srnd(160,MAPW-160),srnd(160,MAPH-160)];if(!mir){if(free(p[0],p[1],minB,minF,minO)){push(p);got++;}continue;}const q=mir(p);if(Math.hypot(p[0]-q[0],p[1]-q[1])<260)continue;if(!free(p[0],p[1],minB,minF,minO))continue;const undo=push(p);if(!free(q[0],q[1],minB,minF,minO)){undo();continue;}push(q);got++;}return mir?got:got/2;};
  // neutral supply scales with the number of players: a duel has a few contested fields, an 8-way war many more
  {const want=2+Math.ceil(BASES.length*.75)+Math.max(0,Math.round((WK-1)*1.6));let got=0;for(const rl of [1,.8,.62,.5]){if(got>=want)break;got+=pairs(want-got,([x,y])=>{M.fields.push({x,y,r:46,amt:9000});return()=>M.fields.pop();},(D.fieldMinB||520)*Math.min(1,WK)*rl,(D.fieldMinB?240:300)*Math.min(1,WK)*rl,0);}}
  {const want=2+Math.ceil(BASES.length/2)+Math.max(0,Math.round((WK-1)*1.1));let got=0;for(const rl of [1,.8,.62,.5]){if(got>=want)break;got+=pairs(want-got,([x,y])=>{M.oil.push({x,y,owner:-1,cp:[0,0],inc:0});return()=>M.oil.pop();},(D.fieldMinB||470)*Math.min(1,WK)*rl,170*Math.min(1,WK)*rl,(D.fieldMinB?220:300)*Math.min(1,WK)*rl);}}
  return M;
}
// P_B: while planning a route (pathfinding / line of sight in navTo), ground cells under buildings count as blocked,
// so units route around bases instead of walking into walls. Plain movement checks ignore buildings (separation handles them).
let P_B=false;
function bocc(){if(!G.bocc||G.bdirty){G.bdirty=false;const o=G.bocc||(G.bocc=new Uint8Array(GW*GH));o.fill(0);for(const b of G.ents){if(!b.isB||b.dead)continue;const h=b.size/2-CELL*.25;
  const x0=Math.ceil((b.x-h)/CELL-.5),x1=Math.floor((b.x+h)/CELL-.5),y0=Math.ceil((b.y-h)/CELL-.5),y1=Math.floor((b.y+h)/CELL-.5);for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)if(cx>=0&&cy>=0&&cx<GW&&cy<GH)o[cy*GW+cx]=1;}}return G.bocc;}
function passC(dom,cx,cy){if(cx<0||cy<0||cx>=GW||cy>=GH)return false;const i=cy*GW+cx,v=G.grid[i];if(dom==='naval')return v===1||v===2;if(v!==0&&v!==2)return false;return !(P_B&&G.bocc&&G.bocc[i]);}
function passXY(dom,x,y){return dom==='air'||passC(dom,Math.floor(x/CELL),Math.floor(y/CELL));}
function los(dom,x0,y0,x1,y1){if(dom==='air')return true;const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/16);for(let i=1;i<=n;i++){const t=i/n;if(!passXY(dom,x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
function nearestPass(dom,cx,cy){if(passC(dom,cx,cy))return[cx,cy];for(let r=1;r<16;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;if(passC(dom,cx+dx,cy+dy))return[cx+dx,cy+dy];}return null;}
function nearestPassXY(dom,x,y){const c=nearestPass(dom,Math.floor(x/CELL),Math.floor(y/CELL));if(!c)return null;if(passXY(dom,x,y))return[x,y];return[c[0]*CELL+CELL/2,c[1]*CELL+CELL/2];}
let PN=GW*GH,P_g=new Float32Array(PN),P_came=new Int32Array(PN),P_mark=new Uint32Array(PN),P_closed=new Uint32Array(PN);let P_stamp=1;
function setWorld(k){k=k||1;WK=k;MAPW=Math.round(3200*k/CELL)*CELL;MAPH=Math.round(2200*k/CELL)*CELL;GW=Math.ceil(MAPW/CELL);GH=Math.ceil(MAPH/CELL);EF_R=Math.max(8,Math.round(8*k/1.25));EF_W=Math.ceil(MAPW/EF_R)+1;EF_H=Math.ceil(MAPH/EF_R)+1;
  if(GW*GH!==PN){PN=GW*GH;P_g=new Float32Array(PN);P_came=new Int32Array(PN);P_mark=new Uint32Array(PN);P_closed=new Uint32Array(PN);P_stamp=1;}if(typeof HW!=='undefined')HW=Math.ceil(MAPW/HC)+2;}
// Clearance cost: ground cells touching impassable ground cost a little more, so routes run down the middle of
// streets and passes instead of scraping along walls, shorelines and cliffs. Rebuilt when the grid changes.
let P_W=null,P_Wv=-1,P_Wg=null;function wallCost(){if(P_W&&P_Wg===G.grid&&P_Wv===(G.gridV|0)&&P_W.length===GW*GH)return P_W;P_W=new Float32Array(GW*GH);P_Wv=G.gridV|0;P_Wg=G.grid;const g=G.grid;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const i=y*GW+x;if(g[i]!==0&&g[i]!==2)continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=GW||Y>=GH){n++;continue;}const v=g[Y*GW+X];if(v!==0&&v!==2)n++;}P_W[i]=Math.min(.9,n*.18);}return P_W;}
// Connected regions of land and water (flood-filled once per map, redone if a building collapse opens a street).
// A unit sent somewhere it can't reach (an island, across the sea) is re-targeted to the nearest cell it CAN reach
// instead of letting the search scan the whole map first.
const P_REG={};function regions(dom){const key=dom;let R=P_REG[key];if(R&&R.g===G.grid&&R.v===(G.gridV|0)&&R.a.length===GW*GH)return R.a;
  const a=new Int32Array(GW*GH),pass=i=>{const v=G.grid[i];return dom==='naval'?(v===1||v===2):(v===0||v===2);};let id=0;const st=[];
  for(let i=0;i<a.length;i++){if(a[i]||!pass(i))continue;id++;a[i]=id;st.push(i);while(st.length){const c=st.pop(),cx=c%GW,cy=(c/GW)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const n=ny*GW+nx;if(a[n]||!pass(n))continue;if(dx&&dy&&(!pass(cy*GW+nx)||!pass(ny*GW+cx)))continue;a[n]=id;st.push(n);}}}
  P_REG[key]={a,g:G.grid,v:G.gridV|0};return a;}
function nearestInRegion(R,reg,gx,gy){for(let r=1;r<90;r++){let best=-1,bd=1e9;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=gx+dx,y=gy+dy;if(x<0||y<0||x>=GW||y>=GH)continue;if(R[y*GW+x]!==reg)continue;const d=dx*dx+dy*dy;if(d<bd){bd=d;best=y*GW+x;}}if(best>=0)return[best%GW,(best/GW)|0];}return null;}
function findPath(dom,sx,sy,tx,ty){
  const s0=nearestPass(dom,Math.floor(sx/CELL),Math.floor(sy/CELL));let g0=nearestPass(dom,Math.floor(tx/CELL),Math.floor(ty/CELL));if(!s0||!g0)return null;
  let unreach=false;if(dom==='ground'||dom==='naval'){const R=regions(dom),rs=R[s0[1]*GW+s0[0]];if(rs&&R[g0[1]*GW+g0[0]]!==rs){const q=nearestInRegion(R,rs,g0[0],g0[1]);if(!q)return null;g0=q;unreach=true;}}
  const st=++P_stamp,start=s0[1]*GW+s0[0],goal=g0[1]*GW+g0[0];const gx=g0[0],gy=g0[1];
  // binary heap on typed arrays (no per-node allocations)
  if(!findPath.hf||findPath.hf.length<PN*4){findPath.hf=new Float32Array(PN*4);findPath.hi=new Int32Array(PN*4);}const HF=findPath.hf,HI=findPath.hi;let HN=0;
  const push=(f,i)=>{let k=HN++;while(k>0){const p=(k-1)>>1;if(HF[p]<=f)break;HF[k]=HF[p];HI[k]=HI[p];k=p;}HF[k]=f;HI[k]=i;};
  const pop=()=>{const top=HI[0];HN--;if(HN>0){const f=HF[HN],v=HI[HN];let k=0;for(;;){const l=2*k+1,r=l+1;let m=-1,mf=f;if(l<HN&&HF[l]<mf){m=l;mf=HF[l];}if(r<HN&&HF[r]<mf){m=r;}if(m<0)break;HF[k]=HF[m];HI[k]=HI[m];k=m;}HF[k]=f;HI[k]=v;}return top;};
  const hfn=(cx,cy)=>{const dx=Math.abs(cx-gx),dy=Math.abs(cy-gy);return dx+dy-.586*Math.min(dx,dy);};
  const WC=dom==='ground'?wallCost():null;let bestN=start,bestH=hfn(s0[0],s0[1]);
  P_mark[start]=st;P_g[start]=0;P_came[start]=-1;push(hfn(s0[0],s0[1]),start);let it=0,found=false;
  while(HN>0&&it++<Math.max(9000,PN*.45)&&HN<PN*4-8){const cur=pop();if(P_closed[cur]===st)continue;P_closed[cur]=st;if(cur===goal){found=true;break;}
    const cx=cur%GW,cy=(cur/GW)|0;{const hh=hfn(cx,cy);if(hh<bestH){bestH=hh;bestN=cur;}}
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(!passC(dom,nx,ny))continue;if(dx&&dy&&(!passC(dom,cx+dx,cy)||!passC(dom,cx,cy+dy)))continue;
      const ni=ny*GW+nx;if(P_closed[ni]===st)continue;const ng=P_g[cur]+(dx&&dy?1.414:1)*(WC?1+WC[ni]:1);if(P_mark[ni]!==st||ng<P_g[ni]){P_mark[ni]=st;P_g[ni]=ng;P_came[ni]=cur;push(ng+hfn(nx,ny),ni);}}}
  let end=goal;if(!found){if(bestN===start||bestH>hfn(s0[0],s0[1])-2)return null;end=bestN;}
  const cells=[];for(let c=end;c!==-1;c=P_came[c])cells.push(c);cells.reverse();
  const pts=cells.map(c=>[(c%GW)*CELL+CELL/2,((c/GW)|0)*CELL+CELL/2]);if(found&&!unreach&&passXY(dom,tx,ty))pts[pts.length-1]=[tx,ty];
  const out=[];let ax=sx,ay=sy,i=0;while(i<pts.length){let j=pts.length-1;while(j>i&&!los(dom,ax,ay,pts[j][0],pts[j][1]))j--;out.push(pts[j]);ax=pts[j][0];ay=pts[j][1];i=j+1;}
  return out;
}

function paintTerrain(M){const TEXMAX=Math.min(3072,(typeof R3!=='undefined'&&R3&&R3.capabilities)?R3.capabilities.maxTextureSize:4096);
  srand=mulberry(M.seed*7+3);
  const TS=Math.min(1,TEXMAX/MAPW,TEXMAX/MAPH),TA=Math.max(1,MAPW*MAPH*TS*TS/(3200*2200));const c=document.createElement('canvas');c.width=Math.round(MAPW*TS);c.height=Math.round(MAPH*TS);const t=c.getContext('2d',{willReadFrequently:true});t.setTransform(TS,0,0,TS,0,0);
  t.fillStyle='#a8825a';t.fillRect(0,0,MAPW,MAPH);
  const blotch=(cells,cols,al)=>{const w=Math.ceil(MAPW/cells)+1,h=Math.ceil(MAPH/cells)+1,s=document.createElement('canvas');s.width=w;s.height=h;const sx=s.getContext('2d'),id=sx.createImageData(w,h);
    for(let i=0;i<w*h;i++){const q=cols[Math.floor(srand()*cols.length)];id.data.set([q[0],q[1],q[2],255*al*srand()],i*4);}sx.putImageData(id,0,0);t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';t.drawImage(s,0,0,MAPW+cells,MAPH+cells);};
  blotch(260,[[178,138,96],[164,120,82],[190,152,108],[150,108,74],[172,134,92]],1);blotch(90,[[184,146,102],[154,114,80],[198,164,118],[140,104,72]],.7);blotch(30,[[172,146,104],[154,130,92],[128,112,78]],.45);blotch(9,[[140,120,84],[200,178,134]],.2);
  {const P=(n,col,rmin,rmax,al)=>{for(let k=0;k<n;k++){const x=srand()*MAPW,y=srand()*MAPH,r=srnd(rmin,rmax);for(let q=0;q<5;q++){const qx=x+srnd(-r,r)*.6,qy=y+srnd(-r,r)*.6,qr=r*srnd(.4,.8);const g=t.createRadialGradient(qx,qy,0,qx,qy,qr);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(.6,`rgba(${col},${al*.5})`);g.addColorStop(1,`rgba(${col},0)`);t.fillStyle=g;t.beginPath();t.ellipse(qx,qy,qr,qr*srnd(.5,1),srnd(0,3),0,7);t.fill();}}};
   P(140*TA|0,'126,104,72',20,70,.4);P(220*TA|0,'112,108,70',10,40,.3);P(160*TA|0,'206,186,140',8,26,.35);
   for(let k=0;k<26000*TA;k++){const x=srand()*MAPW,y=srand()*MAPH,v=srand();t.fillStyle=v<.4?'rgba(96,80,56,.35)':v<.8?'rgba(214,196,152,.35)':'rgba(120,104,76,.4)';t.fillRect(x,y,srnd(1,2.6),srnd(1,2.6));}}
  for(let k=0;k<70*TA;k++){const cx=srand()*MAPW,cy=srand()*MAPH,R=srnd(70,170);const pts=[];for(let i=0;i<55;i++){const a=srand()*6.283,r=Math.sqrt(srand())*R;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8]);}
    for(const [ax,ay] of pts){const nb=pts.map(q=>[q,(q[0]-ax)**2+(q[1]-ay)**2]).sort((u,v)=>u[1]-v[1]).slice(1,4);for(const [[bx,by]] of nb){const fade=1-Math.hypot(ax-cx,ay-cy)/R;if(fade<=0)continue;t.strokeStyle=`rgba(86,66,44,${.4*fade})`;t.lineWidth=1.3;t.beginPath();t.moveTo(ax,ay);t.lineTo((ax+bx)/2+srnd(-3,3),(ay+by)/2+srnd(-3,3));t.lineTo(bx,by);t.stroke();t.strokeStyle=`rgba(226,208,166,${.22*fade})`;t.lineWidth=1;t.beginPath();t.moveTo(ax+1,ay+1);t.lineTo(bx+1,by+1);t.stroke();}}}
  // water and shore, painted from the edge field at half resolution then scaled up smoothly
  if(M.hasWater){const SP=2/TS,W2=Math.ceil(MAPW/SP),H2=Math.ceil(MAPH/SP),wc=document.createElement('canvas');wc.width=W2;wc.height=H2;const wx=wc.getContext('2d'),wi=wx.createImageData(W2,H2),wd=wi.data;
    const ss=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};const L=[[-60,[214,192,140],.45],[-30,[201,174,124],1],[-16,[156,133,96],1],[-7,[122,102,73],1]];
    for(let j=0;j<H2;j++)for(let i=0;i<W2;i++){const x=i*SP+SP/2,y=j*SP+SP/2,e=M.edge(x,y);if(e<-62)continue;let r=0,g=0,b=0,al=0;
      const over=(c,a)=>{if(a<=0)return;const na=a+al*(1-a);r=(c[0]*a+r*al*(1-a))/na;g=(c[1]*a+g*al*(1-a))/na;b=(c[2]*a+b*al*(1-a))/na;al=na;};
      for(const [o,c,a] of L)over(c,a*ss(o-6,o+6,e)*(.85+.15*Math.sin(x*.05+y*.037)));
      const u=(x+y)/(MAPW+MAPH);over([44-4*Math.sin(u*6),92-6*Math.sin(u*6),102-3*Math.sin(u*6)],ss(-1.5,1.5,e));
      over([28,66,80],.55*ss(25,55,e));over([18,50,66],.55*ss(75,115,e));over([12,40,56],.5*ss(125,160,e));
      const k=(j*W2+i)*4;wd[k]=r;wd[k+1]=g;wd[k+2]=b;wd[k+3]=al*255;}
    wx.putImageData(wi,0,0);t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';t.drawImage(wc,0,0,W2*SP,H2*SP);}
  // mountains: rock faces, scree at the foot, snow on the peaks
  if(M.hasMtn){const SP=2/TS,W2=Math.ceil(MAPW/SP),H2=Math.ceil(MAPH/SP),mc=document.createElement('canvas');mc.width=W2;mc.height=H2;const mx2=mc.getContext('2d'),mi=mx2.createImageData(W2,H2),md=mi.data;const snow=M.theme==='snow';
    for(let j=0;j<H2;j++)for(let i=0;i<W2;i++){const x=i*SP+SP/2,y=j*SP+SP/2,m=M.mf(x,y);if(m<-70)continue;const n=Math.sin(x*.05+y*.031)*.5+Math.sin(x*.13-y*.11)*.3+Math.sin(x*.37+y*.29)*.2;const str=Math.sin((x*.6+y*.25)*.09+n*3);
      let r,g,b,a;if(m<0){const k=(m+70)/70;r=120+20*n;g=106+16*n;b=86+12*n;a=k*k*.7;}else{const v=.75+.18*n+.1*str;r=110*v;g=100*v;b=88*v;a=.95;if(snow){r=r*.6+60;g=g*.6+66;b=b*.6+78;}}
      const cap=snow?20:75;if(m>cap){const k=Math.min(1,(m-cap)/30)*(.75+.25*Math.max(0,str));r=r*(1-k)+236*k;g=g*(1-k)+240*k;b=b*(1-k)+246*k;}
      const q=(j*W2+i)*4;md[q]=r;md[q+1]=g;md[q+2]=b;md[q+3]=a*255;}
    mx2.putImageData(mi,0,0);t.imageSmoothingEnabled=true;t.drawImage(mc,0,0,W2*SP,H2*SP);}
  // base pads
  // roads
  const RP=[];const road=(pts,w)=>{for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],n=Math.ceil(Math.hypot(bx-ax,by-ay)/40);for(let j=0;j<=n;j++)RP.push([ax+(bx-ax)*j/n,ay+(by-ay)*j/n]);}
    const path=()=>{t.beginPath();t.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;t.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}const l=pts[pts.length-1];t.lineTo(l[0],l[1]);};
    t.lineCap='round';t.lineJoin='round';path();t.strokeStyle='rgba(176,150,108,.22)';t.lineWidth=w+26;t.stroke();path();t.strokeStyle='rgba(70,60,40,.22)';t.lineWidth=w+8;t.stroke();path();t.strokeStyle='rgba(138,116,84,.62)';t.lineWidth=w;t.stroke();
    {const P=[];let cx=pts[0][0],cy=pts[0][1];P.push([cx,cy]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;for(let k=1;k<=24;k++){const u=k/24,a=(1-u)*(1-u),b=2*u*(1-u),c=u*u;P.push([a*cx+b*pts[i][0]+c*mx,a*cy+b*pts[i][1]+c*my]);}cx=mx;cy=my;}const l=pts[pts.length-1];for(let k=1;k<=12;k++)P.push([cx+(l[0]-cx)*k/12,cy+(l[1]-cy)*k/12]);
     const off=(o,jit)=>{t.beginPath();for(let i=0;i<P.length;i++){const p=P[Math.max(0,i-1)],q=P[Math.min(P.length-1,i+1)];let dx=q[0]-p[0],dy=q[1]-p[1];const L=Math.hypot(dx,dy)||1;const nx=-dy/L,ny=dx/L,j=Math.sin(i*.21+o)*jit;const x=P[i][0]+nx*(o+j),y=P[i][1]+ny*(o+j);i?t.lineTo(x,y):t.moveTo(x,y);}};
     for(const sg of [-1,1]){off(sg*w*.24,1.6);t.strokeStyle='rgba(84,68,46,.26)';t.lineWidth=w*.17;t.stroke();off(sg*w*.24,1.2);t.strokeStyle='rgba(62,50,34,.3)';t.lineWidth=w*.07;t.stroke();off(sg*w*.24+w*.1*sg,1);t.strokeStyle='rgba(196,172,128,.16)';t.lineWidth=w*.05;t.stroke();}
     off(0,2);t.strokeStyle='rgba(168,146,104,.28)';t.lineWidth=w*.2;t.stroke();
     for(let i=0;i<P.length;i+=2){if(srand()>.35)continue;const [x,y]=P[i];t.fillStyle='rgba(66,54,38,.22)';t.beginPath();t.ellipse(x+srnd(-w*.35,w*.35),y+srnd(-w*.35,w*.35),srnd(2,6),srnd(1.5,4),srnd(0,3),0,7);t.fill();}}};
  {const crosses=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/30);for(let i=1;i<n-1;i++){const x=a[0]+(b[0]-a[0])*i/n,y=a[1]+(b[1]-a[1])*i/n;if(M.edge(x,y)>-25||M.mtn(x,y)>-30)return true;}return false;};
   const mid=(a,b)=>{for(let k=0;k<6;k++){const m=[(a[0]+b[0])/2+srnd(-60,60),(a[1]+b[1])/2+srnd(-60,60)];if(M.edge(m[0],m[1])<-60)return m;}return[(a[0]+b[0])/2,(a[1]+b[1])/2];};
   const linked=new Set(),ends=[];for(const b of M.bridges)for(const e of [b.a,b.b])ends.push(e);
   for(const e of ends){const c=BASES.map((B,i)=>[i,Math.hypot(B[0]-e[0],B[1]-e[1])]).filter(([i])=>!crosses(BASES[i],e)).sort((p,q)=>p[1]-q[1]);if(c.length){const i=c[0][0];road([BASES[i],mid(BASES[i],e),e],38);linked.add(i);}}
   BASES.forEach((B,i)=>{if(linked.has(i))return;const c=ends.filter(e=>!crosses(B,e)).sort((p,q)=>Math.hypot(p[0]-B[0],p[1]-B[1])-Math.hypot(q[0]-B[0],q[1]-B[1]));if(c.length){road([B,mid(B,c[0]),c[0]],34);return;}
     let hx=MAPW/2,hy=MAPH/2;const a=Math.atan2(hy-B[1],hx-B[0]);const L=Math.hypot(hx-B[0],hy-B[1]);for(let r=300;r<L;r+=20){const x=B[0]+Math.cos(a)*r,y=B[1]+Math.sin(a)*r;if(M.edge(x,y)>-170||M.mtn(x,y)>-120){hx=B[0]+Math.cos(a)*(r-40);hy=B[1]+Math.sin(a)*(r-40);break;}}
     if(!crosses(B,[hx,hy]))road([B,mid(B,[hx,hy]),[hx,hy]],34);});}
  for(const [bx,by] of BASES){const R=276;
    // worn dirt apron blending pad into terrain
    const ap=t.createRadialGradient(bx,by,R*.9,bx,by,R*1.45);ap.addColorStop(0,'rgba(122,108,80,.75)');ap.addColorStop(1,'rgba(122,108,80,0)');t.fillStyle=ap;t.fillRect(bx-R*1.5,by-R*1.5,R*3,R*3);
    {t.fillStyle=M.theme==='green'?'#9b9a92':'#a3967f';t.beginPath();const cr=70,N=96;for(let q=0;q<=N;q++){const a=q/N*6.2832,ca=Math.cos(a),sa=Math.sin(a);const sq=Math.pow(Math.pow(Math.abs(ca),5)+Math.pow(Math.abs(sa),5),-1/5);const rr=(R-cr*.25)*sq*(1+.025*Math.sin(a*7+bx)+.015*Math.sin(a*13+by));const x=bx+ca*rr,y=by+sa*rr;q?t.lineTo(x,y):t.moveTo(x,y);}t.closePath();t.fill();{const fc=t.fillStyle;t.save();try{t.filter='blur('+Math.max(4,Math.round(14*TS))+'px)';}catch(e){}t.strokeStyle=fc;t.globalAlpha=.55;t.lineWidth=34;t.stroke();t.globalAlpha=.3;t.lineWidth=64;t.stroke();t.restore();}
     t.save();t.clip();
    // slab tone variation
    for(let k=0;k<70;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(20,70),v=srnd(-8,8);const g=t.createRadialGradient(x,y,0,x,y,r);const gC=M.theme==='green'?`${150+v|0},${149+v|0},${144+v|0}`:`${156+v|0},${143+v|0},${120+v|0}`;g.addColorStop(0,`rgba(${gC},.22)`);g.addColorStop(1,`rgba(${gC},0)`);t.fillStyle=g;t.fillRect(x-r,y-r,2*r,2*r);}
    // fine aggregate speckle
    {const X0=Math.round((bx-R)*TS),Y0=Math.round((by-R)*TS),RW=Math.max(1,Math.round(2*R*TS));const sp=t.getImageData(X0,Y0,RW,RW),d=sp.data;for(let k=0;k<d.length;k+=4){const n=(srand()-.5)*14;d[k]+=n;d[k+1]+=n;d[k+2]+=n*.9;}t.putImageData(sp,X0,Y0);}
    // grime, oil stains and weathering
    for(let k=0;k<60;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(6,34);const g=t.createRadialGradient(x,y,0,x,y,r);const dk=srand()<.4;g.addColorStop(0,dk?'rgba(34,30,26,.35)':(M.theme==='green'?'rgba(90,89,85,.22)':'rgba(96,88,72,.22)'));g.addColorStop(1,'rgba(40,36,30,0)');t.fillStyle=g;t.beginPath();t.ellipse(x,y,r,r*srnd(.5,1),srnd(0,3),0,7);t.fill();}
    // expansion joints (thin, sealed)
    // cracks
    t.strokeStyle='rgba(50,46,40,.45)';t.lineWidth=.8;for(let k=0;k<40;k++){let x=bx+srnd(-R,R),y=by+srnd(-R,R),a=srnd(0,6.3);t.beginPath();t.moveTo(x,y);for(let q=0;q<6;q++){a+=srnd(-.7,.7);x+=Math.cos(a)*srnd(3,9);y+=Math.sin(a)*srnd(3,9);t.lineTo(x,y);}t.stroke();}
    // windblown sand drifting over the slab, heavier at the edges
    {const wa=.6,GRn=M.theme==='green',DC1=GRn?'146,144,138':'178,142,100',DC2=GRn?'146,144,138':'176,142,102',DA=GRn?.35:1;for(let k=0;k<220;k++){const side=srand()*4|0,u=srnd(-R,R),inn=Math.pow(srand(),2.2)*R*.9;let x,y;if(side===0){x=bx+u;y=by-R+inn;}else if(side===1){x=bx+u;y=by+R-inn;}else if(side===2){x=bx-R+inn;y=by+u;}else{x=bx+R-inn;y=by+u;}const r=srnd(10,48)*(1.2-inn/R*.6),al=.85*(1-inn/R*.6)*srnd(.45,1);const g=t.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${DC1},${al*DA})`);g.addColorStop(.6,`rgba(${DC2},${al*.45*DA})`);g.addColorStop(1,`rgba(${DC2},0)`);t.fillStyle=g;t.beginPath();t.ellipse(x,y,r*1.8,r*.55,wa+srnd(-.2,.2),0,7);t.fill();}
     for(let k=0;k<70;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(10,30);t.fillStyle=GRn?`rgba(146,144,138,${srnd(.05,.1)})`:`rgba(170,138,98,${srnd(.08,.18)})`;t.beginPath();t.ellipse(x,y,r*2.4,r*.35,wa+srnd(-.15,.15),0,7);t.fill();}}
    // tyre tracks
    for(let k=0;k<7;k++){const x0=bx+srnd(-R*.8,R*.8),y0=by+srnd(-R*.8,R*.8),a=srnd(0,6.3),L=srnd(80,200),c=srnd(-.004,.004);t.strokeStyle='rgba(40,36,30,.13)';t.lineWidth=4;for(const off of [-7,7]){t.beginPath();for(let q=0;q<=20;q++){const u=q/20*L,aa=a+c*u;const x=x0+Math.cos(a)*u-Math.sin(aa)*off,y=y0+Math.sin(a)*u+Math.cos(aa)*off;q?t.lineTo(x,y):t.moveTo(x,y);}t.stroke();}}
    // painted markings, faded

    t.restore();}}
  for(const f of M.fields){const g=t.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*1.8);g.addColorStop(0,'rgba(120,96,60,.6)');g.addColorStop(1,'rgba(120,96,60,0)');t.fillStyle=g;t.beginPath();t.arc(f.x,f.y,f.r*1.8,0,7);t.fill();}
  {const C=16,w=Math.ceil(MAPW/C),h=Math.ceil(MAPH/C),d=new Uint8Array(w*h);for(const [a,b] of RP){const r=2;const ci=a/C|0,cj=b/C|0;for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const x=ci+i,y=cj+j;if(x>=0&&y>=0&&x<w&&y<h&&Math.hypot(i,j)<=r)d[y*w+x]=1;}}const f=new Float32Array(w*h),R2=7;for(const [a,b] of RP){const ci=a/C|0,cj=b/C|0;for(let i=-R2;i<=R2;i++)for(let j=-R2;j<=R2;j++){const x=ci+i,y=cj+j;if(x<0||y<0||x>=w||y>=h)continue;const v=1-Math.max(0,(Math.hypot(i,j)-2)/(R2-2));if(v>f[y*w+x])f[y*w+x]=v;}}G.roadMask={C,w,h,d,f};}
  const roadD=(x,y)=>{let m=1e12;for(const [a,b] of RP){const d=(a-x)**2+(b-y)**2;if(d<m)m=d;}return Math.sqrt(m);};
  const clear=(x,y,pad=0)=>!M.cityNear(x,y,30+pad)&&Math.abs(M.depth(x,y))>M.hw(x)+60+pad&&M.mtn(x,y)<-30-pad&&BASES.every(([bx,by])=>Math.hypot(x-bx,y-by)>340)&&M.fields.every(f=>Math.hypot(f.x-x,f.y-y)>f.r+60)&&M.oil.every(o=>Math.hypot(o.x-x,o.y-y)>70);
  const AR=Math.min(3,Math.max(1,MAPW*MAPH/(3200*2200)));for(let i=0;i<26*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y))continue;const r=srnd(14,34);const g=t.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,'rgba(40,34,22,.35)');g.addColorStop(.8,'rgba(40,34,22,.1)');g.addColorStop(.9,'rgba(170,150,110,.25)');g.addColorStop(1,'rgba(170,150,110,0)');t.fillStyle=g;t.beginPath();t.arc(x,y,r,0,7);t.fill();}
  for(let i=0;i<480*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y))continue;const n=2+srand()*4|0,sz=srnd(4,9);
    for(let j=0;j<n;j++){const ox=x+srnd(-sz*1.4,sz*1.4),oy=y+srnd(-sz,sz),r=sz*srnd(.6,1.1);const g=t.createRadialGradient(ox,oy,0,ox,oy,r*1.3);g.addColorStop(0,'rgba(104,92,60,.32)');g.addColorStop(.7,'rgba(118,104,70,.16)');g.addColorStop(1,'rgba(118,104,70,0)');t.fillStyle=g;t.beginPath();t.arc(ox,oy,r*1.3,0,7);t.fill();}}
  // forests
  const trees=[];
  for(let i=0;i<70*AR;i++){const cx=srnd(80,MAPW-80),cy=srnd(80,MAPH-80);if(!clear(cx,cy,40)||roadD(cx,cy)<150)continue;const n=10+srand()*26|0;for(let j=0;j<n;j++){const x=cx+srnd(-150,150),y=cy+srnd(-100,100);if(clear(x,y)&&roadD(x,y)>70)trees.push([x,y]);}}
  G.treePos=trees.map(([x,y])=>[x,y,srnd(.75,1.35),srnd(0,6.28)]);
  for(let i=0;i<90*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y)||roadD(x,y)<40)continue;const m=1+srand()*3|0;
    for(let j=0;j<m;j++){const cx=x+srnd(-18,18),cy=y+srnd(-12,12),r=srnd(7,20),pts=[],k=7+srand()*4|0;for(let q=0;q<k;q++){const a=q/k*6.28,rr=r*srnd(.7,1.1);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.75]);}
      const poly=(dx,dy)=>{t.beginPath();pts.forEach((p,q)=>q?t.lineTo(p[0]+dx,p[1]+dy):t.moveTo(p[0]+dx,p[1]+dy));t.closePath();};poly(r*.35,r*.3);t.fillStyle='rgba(25,22,14,.4)';t.fill();poly(0,0);const g=t.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#a59c86');g.addColorStop(.55,'#7a725f');g.addColorStop(1,'#4d473a');t.fillStyle=g;t.fill();t.strokeStyle='rgba(40,36,28,.5)';t.lineWidth=1;t.stroke();}}
  for(const c of M.cities){const g=t.createRadialGradient(c.x,c.y,0,c.x,c.y,c.r*1.15);g.addColorStop(0,'rgba(120,112,98,.55)');g.addColorStop(.85,'rgba(126,116,98,.35)');g.addColorStop(1,'rgba(126,116,98,0)');t.fillStyle=g;t.beginPath();t.arc(c.x,c.y,c.r*1.15,0,7);t.fill();}
  for(const b of M.cityBlds){t.fillStyle=b.style==='russia'?'#77736c':b.style==='america'?'#8a8278':'#b8a888';t.fillRect(b.x-b.w/2,b.y-b.d/2,b.w,b.d);}
  const CW=c.width,CH=c.height,id=t.getImageData(0,0,CW,CH),d=id.data;const SN=M.theme==='snow',GR=M.theme==='green';const WS=new Float32Array(CW);for(let x=0;x<CW;x++)WS[x]=Math.sin(x/TS*.0021);for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*16;if(GR&&!(d[i+2]>d[i]+10)){const gy=Math.max(Math.abs(d[i]-d[i+1]),Math.abs(d[i+1]-d[i+2])*.72),gk=Math.max(0,Math.min(1,(gy-5)/13));if(gk>0){const px=(i>>2)%CW,py=((i>>2)/CW)|0;const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11,w=WS[px]*Math.cos(py/TS*.0017)*.5+.5;d[i]=d[i]*(1-gk)+(l*.42+30+18*w+n)*gk;d[i+1]=d[i+1]*(1-gk)+(l*.52+56+10*w+n)*gk;d[i+2]=d[i+2]*(1-gk)+(l*.3+22+n*.6)*gk;continue;}}if(SN&&!(d[i+2]>d[i]+10)){const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=l*.42+128+n*.6;d[i+1]=l*.44+134+n*.6;d[i+2]=l*.45+146+n*.6;continue;}d[i]+=n;d[i+1]+=n;d[i+2]+=n*.8;}t.putImageData(id,0,0);
  const e=t.createRadialGradient(MAPW/2,MAPH/2,MAPH*.55,MAPW/2,MAPH/2,MAPW*.72);e.addColorStop(0,'rgba(0,0,0,0)');e.addColorStop(1,'rgba(0,0,0,.35)');t.fillStyle=e;t.fillRect(0,0,MAPW,MAPH);
  G.terrain=c;G.tctx=t;buildHGrid();const th=document.createElement('canvas');th.width=mm.width;th.height=mm.height;th.getContext('2d').drawImage(c,0,0,th.width,th.height);G.thumb=th;
  srand=Math.random;
}

/* ================= SIMULATION (authoritative; runs in single-player and on the host) ================= */
let G=null,MODE='single',ME=0;
// One battle scale for every game (the old Standard/Large/Massive choice is gone); AI strength comes from difficulty.
const BATTLE=1.75;
// AI difficulty: Easy is slow to build and attack with small waves and no tricks; Hard earns more, thinks faster,
// attacks early with flanking columns, focuses fire on weakened targets and pulls damaged units back.
const DIFF=[{wave:4,inc:.7,first:420,think:1.6,flank:0,retreat:0,focus:0,maxWave:10,q:1},
  {wave:6,inc:1,first:270,think:1,flank:1,retreat:1,focus:0,maxWave:22,q:2},
  {wave:7,inc:1.35,first:170,think:.6,flank:1,retreat:1,focus:1,maxWave:32,q:3}];
function mkAI(d){d=Math.max(0,Math.min(2,d|0));const D=DIFF[d];return{bi:0,wave:D.wave,inc:D.inc,t:0,d};}
const setup={p:'IR',a:'US',d:1,n:1,bs:BATTLE};
function mkTeam(id,fac,ai){const F=FACTIONS[fac];return{id,fac,F,sup:F.sup,credits:3000,charge:0,tun:[],q:{hq:[],barracks:[],factory:[],airfield:[],shipyard:[]},rq:{},upg:{},rally:null,
  color:F.color,dark:shade(F.color,.45),built:0,lost:0,kills:0,gxp:0,rank:1,spent:0,pw:{},reveals:[],ai:ai?mkAI(setup.d):null};}
// Alliances: players on the same team never fight, share vision and win together.
// Allies can send each other money (in steps of $50, never more than you have).
function giveMoney(from,to,amt){const A=G.teams[from],B=G.teams[to];if(!A||!B||from===to||!ally(from,to)||B.out||A.out)return false;amt=Math.floor(Math.min(+amt||0,A.credits)/50)*50;if(amt<50)return false;
  A.credits-=amt;B.credits+=amt;A.gave=(A.gave||0)+amt;log(from,`Sent $${amt} to ${B.F.name}.`,'g');log(to,`${A.F.name} sent you $${amt}.`,'g');FXE('give',[from,to,amt]);return true;}
function ally(a,b){if(a===b)return true;if(a==null||b==null||a<0||b<0||!G||!G.teams[a]||!G.teams[b])return false;return G.teams[a].tm===G.teams[b].tm;}
function newGame(o){const N=o.facs.length;const mk=MAPS[o.map]&&N<=MAPS[o.map].max?o.map:'strait';setWorld(worldScaleFor(N));setBases(N,mk,mk===o.map?o.slot:-1);
  const M=mkMap(o.seed,mk);
  G={t:0,ents:[],byId:new Map(),proj:[],strikes:[],timers:[],planes:[],nid:1,sel:[],place:null,aim:null,amove:false,msgs:[],aiT:2,visT:0,endT:3,over:false,uiT:0,out:[],
     map:M,mapKey:mk,grid:M.grid,fields:M.fields.map(f=>({...f})),oil:M.oil.map(f=>({...f,cp:new Array(N).fill(0)})),seed:o.seed,N};initCiv();G.oil.forEach((o,i)=>{o.i=i;o.hp=o.max=OIL_HP;o.dead=false;o.burn=0;o.rep=0;o.tg=oilTarget(o);});
  G.bs=BATTLE;G.teams=o.facs.map((f,i)=>mkTeam(i,f,o.ai[i]));G.teams.forEach(T=>{T.credits=Math.round(3000*(1+(G.bs-1)*.8)/100)*100;if(T.ai){T.ai.wave=Math.round(T.ai.wave*G.bs);}});G.teams.forEach((T,i)=>{T.tm=Array.isArray(o.tm)&&o.tm[i]!=null?o.tm[i]|0:100+i;});
  {const ALT=['#e8e8e8','#d98c3a','#36c2c9','#d94fa0','#a3d13a','#8b6cf6','#f2d14a','#e2483d','#4a80e8','#3fae5c','#c97b4a'];const cd=(p,q)=>{const a=new THREE.Color(p),b=new THREE.Color(q);return Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b);};
   for(let i=1;i<N;i++){const T=G.teams[i];if(G.teams.slice(0,i).some(P=>cd(P.color,T.color)<.45)){const c=ALT.find(c=>G.teams.slice(0,i).every(P=>cd(P.color,c)>=.45))||ALT[i%ALT.length];T.color=c;T.dark=shade(c,.45);}}}
  paintTerrain(M);
  G.cover=new Uint8Array(GW*GH);for(const [x,y] of (G.treePos||[])){const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);if(cx>=0&&cy>=0&&cx<GW&&cy<GH)G.cover[cy*GW+cx]=Math.min(255,G.cover[cy*GW+cx]+1);}
  for(const b of (M.cityBlds||[])){const cx=Math.floor(b.x/CELL),cy=Math.floor(b.y/CELL);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<GW&&Y<GH&&G.grid[Y*GW+X]!==3)G.cover[Y*GW+X]=Math.min(255,G.cover[Y*GW+X]+2);}}
  if(o.sandbox)G.sandbox=true;
  if(MODE!=='client'){
    for(let t=0;t<N;t++){const [bx,by]=BASES[t];const a=baseFacing(t),cx=Math.cos(a),cy=Math.sin(a);addBld(t,'hq',bx,by,true);addUnit(t,'harv',bx+cx*150-cy*60,by+cy*150+cx*60);addUnit(t,'dozer',bx+cx*120-cy*110,by+cy*120+cx*110);addUnit(t,'inf',bx+cx*130+cy*90,by+cy*130-cx*90);addUnit(t,'inf',bx+cx*150+cy*70,by+cy*150-cx*70);}
    if(G.sandbox)sandboxSetup();
  }
}
function baseFacing(t){const b=BASES[t]||BASES[0];return Math.atan2(MAPH/2-b[1],MAPW/2-b[0]);}
function addUnit(team,kind,x,y){const T=G.teams[team],s0=stats(T.fac,kind),sm=kind===T.F.special?specMult(T):1,s=sm>1?Object.assign({},s0,{hp:Math.round(s0.hp*sm),dmg:s0.dmg*sm,name:s0.name+(sm>=1.4?' (Elite)':' (Veteran)')}):s0;const a=baseFacing(team);
  const u={id:G.nid++,isB:false,team,kind,s,x,y,ang:a,va:a,tang:a,hp:s.hp,max:s.hp,r:s.r,cd:0,order:null,target:null,lastHit:-99,lastFire:-99,state:'go',cargo:0,xp:0,rank:0,ammo:s.ammo||0,vs:new Array(G.teams.length).fill(false)};
  u.max=Math.round(s.hp*hpMult(team,kind));u.hp=u.max;G.ents.push(u);G.byId.set(u.id,u);return u;}
function addBld(team,kind,x,y,built){const T=G.teams[team],s=bstats(T.fac,kind);G.bdirty=true;
  const b={id:G.nid++,isB:true,team,kind,s,x,y,size:s.size,r:s.size/2,max:s.hp,hp:built?s.hp:s.hp*.1,built:built?1:0,cd:0,target:null,ang:baseFacing(team),lastHit:-99,dis:0,vs:new Array(G.teams.length).fill(false)};
  G.ents.push(b);G.byId.set(b.id,b);return b;}
const done=(t,k)=>G.ents.some(e=>e.isB&&e.team===t&&e.kind===k&&e.built>=1&&!e.dead);
const working=(t,k)=>G.ents.some(e=>e.isB&&e.team===t&&e.kind===k&&e.built>=1&&!e.dead&&!(e.dis>G.t));
const reqMet=(t,k)=>!STRUCT[k].req||(G&&G.sandbox&&t===0)||done(t,STRUCT[k].req);
function isInf(s){return s.armor==='light'&&s.dom==='ground';}
function isVeh(s){return s.armor==='heavy'&&s.dom==='ground';}
function hpMult(team,kind){const T=G.teams[team],s=BASE[kind];let m=1;if(T.upg.armor&&s.armor==='light'&&s.dom==='ground')m*=1.25;if(T.upg.composite&&s.armor==='heavy')m*=1.25;return m;}
// National special effects: auras (officer morale, commissar rate of fire, medic healing, raid leader), Iron Dome
// interception, EW jamming, counter-battery radar, laser marking, hidden mines and ambushes.
function auraNear(u,t){const L=G.aur&&G.aur[t];if(!L)return false;for(const a of L)if(a.team===u.team&&a.id!==u.id&&Math.abs(a.x-u.x)<a.r&&Math.hypot(a.x-u.x,a.y-u.y)<a.r)return true;return false;}
function auraProtect(e,t){const L=G.aur&&G.aur[t];if(!L)return false;for(const a of L)if(ally(a.team,e.team)&&Math.hypot(a.x-e.x,a.y-e.y)<a.r)return true;return false;}
function dmgOut(src){if(src.isB)return wxNow().acc;const T=G.teams[src.team],c=src.s.cls;let m=[1,1.2,1.35,1.5][src.rank||0]*wxNow().acc;if(isInf(src.s)&&auraNear(src,'morale'))m*=1.2;if(isVeh(src.s)&&auraNear(src,'raid'))m*=1.2;
  if((T.mart||0)>G.t)m*=1.1;if((T.fervor||0)>G.t&&(!T.fervInf||isInf(src.s)))m*=T.fervK||1.15;{const D=DOCT[T.fac];if(D){if(D.shock&&src.order&&(src.order.type==='amove'||src.order.type==='attack'||G.t-(src.mv||-9)<4))m*=1.15;
    if(D.ambush&&(isInf(src.s)||c==='drone')&&(G.t-(src.mv||-9)>3||coverAt(src.x,src.y)))m*=1.2;
    if(D.homeland){if(G.t-(src.hlT||-9)>2){src.hlT=G.t;src.hl=false;for(const b of nearby(src.x,src.y,700,MOR_H))if(b.isB&&b.team===src.team&&!b.dead){src.hl=true;break;}}if(src.hl)m*=1.15;}}}
  if(T.upg.munitions&&['tank','arty','aa','boat','ship'].includes(c))m*=1.2;if(T.upg.laser&&src.s.dom==='air')m*=1.25;if(T.upg.thermo&&(c==='arty'||c==='drone'))m*=1.3;return m;}
function dmgIn(e,wpn){if(e.isB)return 1;const T=G.teams[e.team],s=e.s;let m=e.retreat?.7:1;if(e.digT){if(e.mv!=null&&G.t-e.mv<1)e.digT=0;else m*=.65;}if(G.shields&&G.shields.length)for(const S of G.shields)if(S.t>G.t&&S.team===e.team&&Math.hypot(e.x-S.x,e.y-S.y)<S.r){m*=S.k||.4;break;}if(T.F.mods.dugIn&&isInf(s)&&G.t-(e.mv||-9)>3)m*=T.F.mods.dugIn;if(e.rout>G.t)m*=1.25;if(T.upg.ecm&&s.dom==='air')m*=.7;if(T.upg.hullplate&&s.dom==='naval')m*=.85;
  if((wpn==='at'||wpn==='missile')&&isVeh(s)){if(T.upg.reactive)m*=.75;if(T.upg.trophy)m*=.7;}return m;}
function rofMult(u){return((u.rofT||0)>G.t?.8:1)*((G.teams[u.team].upg.nationalism&&isInf(u.s))?.8:1)*((u.supp||0)>.5?1.6:1)*(isInf(u.s)&&auraNear(u,'rof')?.8:1);}
function rngOf(e){return e.s.rng*(G.teams[e.team].upg.network?1.15:1)*(e.s.droneSpot&&e.target&&droneSees(e.team,e.target)?1.4:1);}
const DS_N=[];function droneSees(team,t){if(t._dsT===G.t+team*.001)return t._dsV;let v=false;for(const o of nearby(t.x,t.y,360,DS_N)){if(!o.dead&&o.team===team&&(o.kind==='drone'||o.kind==='recon')&&Math.hypot(o.x-t.x,o.y-t.y)<360){v=true;break;}}t._dsT=G.t+team*.001;t._dsV=v;return v;}
function saSpotted(team,t){for(const o of nearby(t.x,t.y,500,DS_N)){if(!o.dead&&o.team===team&&o.s&&o.s.airSpot&&Math.hypot(o.x-t.x,o.y-t.y)<(o.s.vis||480))return true;}return false;}
function canTarget(s,e){if(!e||e.dead)return false;const air=!e.isB&&e.s.dom==='air'&&!e.landed;if(air)return s.aa>=(e.s.alt==='high'?2:1);return s.ground!==false;}
function seenBy(team,e){return e.team===team||(e.vs&&e.vs[team]);}
function visR(m){const k=(G.teams[m.team].F.mods.sight||1)*(m.isB?Math.max(.75,wxNow().vis):wxNow().vis);if(!m.isB&&m.s.vis)return m.s.vis*k;return (m.isB?340:m.s.dom==='air'?340:m.s.dom==='naval'?380:280)*k;}
function detR(team,m){return(m.isB?170:150)*(G.teams[team].upg.radar?2:1);}
function hiddenNow(e){if((e.detT||0)>G.t)return false;if(e.stlT&&!e.isB){if(G.t-(e.mv||-99)<1&&e.mv!=null||e.lastFire>0)e.stlT=0;else return true;}if(!e.isB&&G.smokes&&G.smokes.length&&G.t-(e.lastFire||-9)>1.5)for(const S of G.smokes)if(S.t>G.t&&ally(S.team,e.team)&&Math.hypot(e.x-S.x,e.y-S.y)<S.r)return true;if(e.isB)return e.kind==='tunnel'&&e.built>=1&&G.t-(e.lastFire||-9)>3;if(e.s.camo&&G.t-e.lastFire>3&&G.t-(e.mv||-9)>3)return true;if(G.t-e.lastFire<=2.5||e.planting)return false;if(e.s.stealth)return true;return !!(G.teams[e.team].upg.camo&&isInf(e.s)&&G.t-(e.mv||-9)>3);}

/* ---------- production, research, building ---------- */
function unitCount(team,kind){let n=0;for(const e of G.ents)if(!e.isB&&e.team===team&&e.kind===kind)n++;const q=G.teams[team].q[BASE[kind].from];for(const i of q)if(i.kind===kind)n++;return n;}
function enqueue(team,kind){const T=G.teams[team],s=stats(T.fac,kind);if(!allUnits(T.fac).includes(kind))return false;if(kind===T.F.special&&T.rank<SPEC_RANK){if(!T.ai)log(team,`${s.name} unlocks at general rank ${SPEC_RANK}.`,'w');return false;}if(T.credits<s.cost||!done(team,s.from))return false;
  if(s.limit&&unitCount(team,kind)>=s.limit){log(team,`Only one ${s.name} at a time.`,'w');return false;}const q=T.q[s.from];if(q.length>=9)return false;T.credits-=s.cost;q.push({kind,t:0});return true;}
function dequeue(team,kind){const T=G.teams[team],s=stats(T.fac,kind),q=T.q[s.from];for(let i=q.length-1;i>=0;i--)if(q[i].kind===kind){q.splice(i,1);T.credits+=s.cost;return;}}
function prodTime(T,s){let t=s.time/(1+((G&&G.bs)||1)*.6-.6);if(G&&G.sandbox&&T.id===0)t/=6;if(T.upg.conscript&&isInf(s))t*=.5;return t;}
function production(dt){for(const T of G.teams){for(const cat of CATS){const q=T.q[cat];if(!q.length)continue;
    const bl=G.ents.filter(e=>e.isB&&e.team===T.id&&e.kind===cat&&e.built>=1&&!e.dead&&!(e.dis>G.t));if(!bl.length)continue;
    const it=q[0],s=stats(T.fac,it.kind);it.t+=dt*(1+.5*(bl.length-1));if(it.t>=prodTime(T,s)){q.shift();spawnFrom(T,bl[Math.floor(Math.random()*bl.length)],it.kind);}}
  for(const cat in T.rq){const r=T.rq[cat];if(!r)continue;if(!working(T.id,cat))continue;r.t+=dt;if(r.t>=UPG[r.key].time){T.rq[cat]=null;applyUpgrade(T,r.key);}}}}
function spawnFrom(T,b,kind){const s=stats(T.fac,kind);let a=Math.atan2(MAPH/2-b.y,MAPW/2-b.x),x=b.x+Math.cos(a)*(b.size/2+16),y=b.y+Math.sin(a)*(b.size/2+16);
  if(s.dom==='naval'){const w=nearestPassXY('naval',b.x,b.y);if(!w)return;x=w[0];y=w[1];}
  else if(s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}
  const u=addUnit(T.id,kind,x,y);T.built++;(T.made=T.made||{})[kind]=(T.made[kind]||0)+1;
  if(kind==='jet'){u.state='park';u.landed=true;const p=padPos(b,u);u.x=p.x;u.y=p.y;u.ang=u.va=-1.57;}
  else if(s.dom==='naval'){const dp=G.map.deeper(x,y,120);const R=T.rally&&passXY('naval',T.rally.x,T.rally.y)?T.rally:{x:dp[0],y:dp[1]};setMove(u,R.x+rnd(-30,30),R.y+rnd(-30,30),'move');}
  else if(kind!=='harv'){const R=T.rally||{x:b.x+Math.cos(a)*(b.size/2+70),y:b.y+Math.sin(a)*(b.size/2+70)};setMove(u,R.x+rnd(-35,35),R.y+rnd(-35,35),'move');}
  log(T.id,`${s.name} ready.`);}
function padPos(b,u){const o=[[-26,-22],[26,-22],[-26,22],[26,22]][u.id%4];return{x:b.x+o[0],y:b.y+o[1]};}
function startResearch(team,key){const T=G.teams[team],U=UPG[key];if(!U||T.upg[key]||(U.fac&&U.fac!==T.fac))return false;if(T.rq[U.at]||!done(team,U.at)||T.credits<U.cost)return false;
  if(Object.values(T.rq).some(r=>r&&r.key===key))return false;T.credits-=U.cost;T.rq[U.at]={key,t:0};return true;}
function applyUpgrade(T,key){T.upg[key]=true;log(T.id,`${UPG[key].name} complete.`,'g');
  for(const e of G.ents)if(!e.isB&&e.team===T.id){const nm=Math.round(e.s.hp*hpMult(T.id,e.kind));if(nm!==e.max){e.hp*=nm/e.max;e.max=nm;}}}
// Build rules. Every structure is built by a Construction Vehicle: returns 0 (not allowed) or 2 (allowed; a
// Construction Vehicle drives there and builds it). Near an enemy base a Construction Vehicle has to be on
// the spot before the foundation can even be laid.
const ZONE_R=460,ENEMY_R=380,FRONT_R=620,ONSITE_R=360;
function validSpot(team,kind,x,y){validSpot.why='';const s=bstats(G.teams[team].fac,kind),size=s.size,h=size/2;const no=w=>{validSpot.why=w;return 0;};
  if(x<h+10||y<h+10||x>MAPW-h-10||y>MAPH-h-10)return no('Too close to the edge of the map.');
  for(const [dx,dy] of [[0,0],[-h,-h],[h,-h],[-h,h],[h,h],[0,-h],[0,h],[-h,0],[h,0]]){const cx=Math.floor((x+dx)/CELL),cy=Math.floor((y+dy)/CELL);if(G.grid[cy*GW+cx]!==0)return no(STRUCT[kind].shore?'Shipyards go on dry land right next to the water.':'Cannot build on water or bridges.');}
  {let lo=1e9,hi=-1e9;for(const [dx,dy] of [[0,0],[-h,-h],[h,-h],[-h,h],[h,h],[0,-h],[0,h],[-h,0],[h,0]]){const g=groundH(x+dx,y+dy);lo=Math.min(lo,g);hi=Math.max(hi,g);}if(hi-lo>7)return no('The ground is too rough there.');}
  let own=0,shoreOwn=false,enemy=1e9;
  for(const e of G.ents){if(e.dead||!e.isB)continue;const g=(e.size+size)/2+14;if(Math.abs(e.x-x)<g&&Math.abs(e.y-y)<g)return no('Too close to another building.');const d=Math.hypot(e.x-x,e.y-y);if(e.team===team){if(e.built>=1){if(d<ZONE_R)own=1;if(d<1300)shoreOwn=true;}}else if(!ally(e.team,team)&&d<enemy)enemy=d;}
  for(const f of G.fields)if(Math.hypot(f.x-x,f.y-y)<f.r+h+(kind==='depot'?6:16))return no('Too close to a supply field.');
  for(const o of G.oil)if(Math.hypot(o.x-x,o.y-y)<h+40)return no('Too close to an oil derrick.');
  if(STRUCT[kind].shore){let wet=false;for(let a=0;a<6.28;a+=.4){const px=x+Math.cos(a)*(h+60),py=y+Math.sin(a)*(h+60);if(passXY('naval',px,py)&&!passXY('ground',px,py)){wet=true;break;}}
    if(!wet)return no('Shipyards go on dry land right next to the water.');}
  const dz=G.ents.filter(u=>u.kind==='dozer'&&u.team===team&&!u.dead);
  if(!dz.length)return no('You need a Construction Vehicle to build. Train one at your Command HQ.');
  if(enemy<FRONT_R&&!dz.some(u=>Math.hypot(u.x-x,u.y-y)<ONSITE_R))return no('Too close to an enemy base. Drive a Construction Vehicle there first.');
  return 2;}
function placeBld(team,kind,x,y,dzId){const T=G.teams[team],s=bstats(T.fac,kind);if(!bldAllowed(T.fac,kind))return false;if(!BUILD_ORDER.includes(kind)||!reqMet(team,kind)||T.credits<s.cost)return false;if(s.limit&&G.ents.filter(e=>!e.dead&&e.isB&&e.team===team&&e.kind===kind).length>=s.limit){log(team,`You can have at most ${s.limit} ${s.name}s.`,'w');return false;}
  let m=validSpot(team,kind,x,y);if(!m){log(team,validSpot.why||'Cannot build there.','w');return false;}if(m===2&&G.sandbox&&team===0)m=1;
  const b=addBld(team,kind,x,y,false);T.credits-=s.cost;
  if(m===2){b.nd=true;const dz=G.ents.filter(u=>u.kind==='dozer'&&u.team===team&&!u.dead);let pick=dz.find(u=>u.id===dzId);
    if(!pick){const idle=dz.filter(u=>!u.order||u.order.type!=='build');pick=(idle.length?idle:dz).reduce((p,q)=>Math.hypot(q.x-x,q.y-y)<Math.hypot(p.x-x,p.y-y)?q:p);}
    pick.order={type:'build',target:b};pick.path=null;log(team,`${pick.s.name} on the way to build the ${s.name}.`);}
  return true;}
function updDozer(u,dt){u.building=false;const o=u.order;
  if(o&&o.type==='build'){const b=o.target;if(b.dead||b.built>=1){u.order=null;return;}const d=Math.hypot(b.x-u.x,b.y-u.y);
    if(d>b.size/2+30){navTo(u,b.x,b.y,dt);return;}u.building=true;u.ang=Math.atan2(b.y-u.y,b.x-u.x);u.lastFire=G.t;return;}
  if(o&&o.type==='move'){if(Math.hypot(o.x-u.x,o.y-u.y)<14||stalled(u,o))u.order=null;else{navTo(u,o.x,o.y,dt,true);return;}}
  // idle: finish a nearby foundation, otherwise patch up damaged buildings close by
  const near=G.ents.find(b=>b.isB&&b.team===u.team&&!b.dead&&b.built<1&&b.nd&&Math.hypot(b.x-u.x,b.y-u.y)<320);if(near){u.order={type:'build',target:near};return;}
  const hurt=G.ents.find(b=>b.isB&&b.team===u.team&&!b.dead&&b.built>=1&&b.hp<b.max&&G.t-b.lastHit>4&&Math.hypot(b.x-u.x,b.y-u.y)<b.size/2+70);if(hurt){hurt.hp=Math.min(hurt.max,hurt.hp+hurt.max*.012*dt);u.building=true;}}

/* ---------- movement ---------- */
// Vehicle-style motion: each unit has a heading that turns at a limited rate, accelerates and brakes,
// slows down to turn, and eases into its final stop. Infantry turn and accelerate quickly; tanks pivot; ships are slow to answer the helm.
const MOVE={inf:[9,140],at:[9,140],hacker:[9,140],hero:[10,160],harv:[2.2,40],dozer:[2.2,40],tank:[1.7,34],aa:[2.1,42],arty:[1.8,32],boat:[1.6,40],ship:[.55,10],heli:[2.3,55],drone:[3,80]};
// Vehicle handling: tracked vehicles pivot on the spot, wheeled ones need speed to turn (a turning circle) and slow
// into tight corners; everything ground-based labours uphill and runs a little faster downhill.
const WHEELED=new Set(['harv','dozer','jeep','ew','cbr','raidlead','idome','aa']);
function isWheeled(u){const s=u.s;return WHEELED.has(u.kind)||(u.kind==='arty'&&s.rocket)||/Technical/.test(s.name||'');}
// Fixed-wing flight (Shahed-type drones): they never stop or hover - they hold cruise speed, turn in smooth arcs
// limited by bank angle, and tighten the turn only in the final dive onto a target.
function isFW(u){return u.kind==='drone'&&(u.fw??(u.fw=['IR','RS'].includes(G.teams[u.team].fac)));}
function flyFW(u,x,y,dt,terminal){const want=Math.atan2(y-u.y,x-u.x);if(u.hd==null)u.hd=u.ang||0;const cr=u.s.spd*(.75+.25*wxNow().air);if(u.v==null||u.v<cr*.5)u.v=cr*.7;
  u.v+=(cr-u.v)*Math.min(1,dt*1.2);const dg=Math.hypot(x-u.x,y-u.y),w=terminal?(dg<120?6:4):1.25;if(terminal&&dg<120)u.hd+=angDiff(u.hd,want)*Math.min(1,dt*10);u.hd+=Math.max(-w*dt,Math.min(w*dt,angDiff(u.hd,want)));u.ang=u.hd;
  u.x+=Math.cos(u.hd)*u.v*dt;u.y+=Math.sin(u.hd)*u.v*dt;u.x=Math.max(-60,Math.min(MAPW+60,u.x));u.y=Math.max(-60,Math.min(MAPH+60,u.y));u.mv=G.t;u.vt=G.t;}
// idle fixed-wing drones circle (loiter) around where they were left instead of hanging in the air
function loiter(u,dt){if(!u.lc||Math.hypot(u.lc.x-u.x,u.lc.y-u.y)>700)u.lc={x:u.x,y:u.y};const R=150,dc=Math.hypot(u.x-u.lc.x,u.y-u.lc.y),a=Math.atan2(u.y-u.lc.y,u.x-u.lc.x)+(dc>R*1.3?0:.55);const rr=dc>R*1.3?R*.6:R;flyFW(u,u.lc.x+Math.cos(a)*rr,u.lc.y+Math.sin(a)*rr,dt,false);}
function stepTo(u,x,y,dt,fin){if(u.s.dom==='air'&&isFW(u)){const t=u.target;let gx=x,gy=y;
    if(t&&!t.dead&&t.x===x&&t.y===y){const dd=Math.hypot(t.x-u.x,t.y-u.y);if(dd>420){const a=Math.atan2(t.y-u.y,t.x-u.x)+Math.PI/2,off=((u.id%5)-2)*Math.min(90,(dd-260)*.35);gx=t.x+Math.cos(a)*off;gy=t.y+Math.sin(a)*off;}}
    flyFW(u,gx,gy,dt,!!(t&&!t.dead&&Math.hypot(t.x-u.x,t.y-u.y)<260));return;}
  const want=Math.atan2(y-u.y,x-u.x),M=MOVE[u.s.cls]||[4,80],d=u.s.dom,dist2=Math.hypot(x-u.x,y-u.y);
  if(u.hd==null||(M[0]>=8&&G.t-(u.vt??-9)>.3))u.hd=u.ang;if(u.v==null)u.v=0;const err0=angDiff(u.hd,want);const whl=d==='ground'&&M[0]<8&&isWheeled(u);
  let tr=M[0]*dt;if(whl){tr*=Math.min(1.25,.25+u.v/Math.max(20,u.s.spd*.45));if(u.v<6&&Math.abs(err0)>.6)u.v=Math.max(u.v,7);}
  const err=err0;u.hd+=Math.max(-tr,Math.min(tr,err));
  const ae=Math.abs(angDiff(u.hd,want)),foot=M[0]>=8;let f=foot?(ae<1.2?1:.35):Math.max(.12,Math.cos(Math.min(ae,1.45)));
  if(whl)f=Math.max(.35,Math.cos(Math.min(ae,1.2)));let sl=1;if(d==='ground'){const ca=Math.cos(u.hd),sa=Math.sin(u.hd),g0=groundH(u.x,u.y),g1=groundH(u.x+ca*14,u.y+sa*14),gr=(g1-g0)/14;sl=Math.max(.45,Math.min(1.15,1-gr*(M[0]>=8?.9:1.6)));}
  const wx=wxNow();let top=u.s.spd*f*sl*(d==='ground'?wx.spd:d==='air'?(.75+.25*wx.air):1)*((u.supp||0)>.5?.6:1)*(isVeh(u.s)&&auraNear(u,'raid')?1.2:1)*((G.teams[u.team].raidT||0)>G.t&&u.s.armor==='heavy'?1.35:1)*(G.smokes&&G.smokes.some(S=>S.t>G.t&&S.team===u.team&&Math.hypot(u.x-S.x,u.y-S.y)<S.r)?1.25:1)*(d==='ground'&&u.s.armor!=='heavy'&&G.t-(u.lastFire||-9)<3&&(DOCT[G.teams[u.team].fac]||{}).hitrun?1.25:1);if(u.order&&u.order.cap)top=Math.min(top,u.order.cap*f);if(fin){const brake=M[1]*1.4;top=Math.min(top,Math.sqrt(2*brake*Math.max(0,dist2-2))+4);}
  if(u.retreat)top*=1.15;
  if(d==='ground'&&!foot&&G.hash&&u.v>4){const la=u.r*2+12,px=u.x+Math.cos(u.hd)*la,py=u.y+Math.sin(u.hd)*la;for(const o of nearby(px,py,34,AV_N)){if(o===u||o.dead||o.isB||!o.s||o.s.dom!=='ground')continue;const dx=o.x-px,dy=o.y-py;if(dx*dx+dy*dy>(o.r+u.r*.8)*(o.r+u.r*.8))continue;
    if((o.v||0)>4&&Math.abs(angDiff(u.hd,o.ang||0))<.6)top=Math.min(top,Math.max(8,(o.v||0)*.95));else if(massOf(o)>=massOf(u)*.5){const ah=angDiff(u.hd,Math.atan2(o.y-u.y,o.x-u.x));u.hd-=Math.sign(ah||1)*Math.min(1.8*dt,.12);top*=.75;}break;}}
  const acc=(u.v<top?M[1]:M[1]*2.2)*dt;u.v+=Math.max(-acc,Math.min(acc,top-u.v));u.vt=G.t;
  const st=Math.min(u.v*dt,dist2+.5);const nx=u.x+Math.cos(u.hd)*st,ny=u.y+Math.sin(u.hd)*st;u.ang=u.hd;
  if(passXY(d,nx,ny)){u.x=nx;u.y=ny;}else if(passXY(d,nx,u.y)){u.x=nx;u.v*=.6;}else if(passXY(d,u.x,ny)){u.y=ny;u.v*=.6;}else{u.v*=.3;u.hd+=.6*dt*Math.sign(err||1);}
  if(st>.01)u.mv=G.t;}
// A move that stops making progress ends instead of pushing forever: close to the spot (crowded by other units or a
// building) it counts as arrived; further away the unit re-plans its route, then gives up after a while.
function stalled(u,o){const d=Math.hypot(o.x-u.x,o.y-u.y);if(u.so!==o){u.so=o;u.sbD=d;u.sbT=G.t;u.srp=0;return false;}
  if(d<u.sbD-4){u.sbD=d;u.sbT=G.t;return false;}const w=G.t-u.sbT;if(d<70&&w>2.5)return true;if(w>7&&!u.srp){u.srp=1;u.path=null;}if(w>16){u.srp=0;return true;}return false;}
function smoothP(d,x0,y0,P){if(!P||P.length<3)return P;const out=[];let cx=x0,cy=y0,i=0;while(i<P.length){let j=Math.min(P.length-1,i+14);while(j>i&&!los(d,cx,cy,P[j][0],P[j][1]))j--;out.push(P[j]);cx=P[j][0];cy=P[j][1];i=j+1;}return out;}
// group moves: one shared route for the whole group instead of one search per unit; each unit joins it and peels
// off to its own formation slot at the end
function sharePath(us,x,y){const G0=us.filter(u=>u.s.dom==='ground'&&u.order&&!u.dead);if(G0.length<4)return;let cx=0,cy=0;for(const u of G0){cx+=u.x;cy+=u.y;}cx/=G0.length;cy/=G0.length;
  if(los('ground',cx,cy,x,y))return;let P;bocc();P_B=true;try{P=findPath('ground',cx,cy,x,y);}finally{P_B=false;}if(!P||P.length<2)return;P=smoothP('ground',cx,cy,P);
  for(const u of G0){if(Math.hypot(u.x-cx,u.y-cy)>260||!los('ground',u.x,u.y,P[0][0],P[0][1]))continue;const o=u.order;u.path=P.slice(0,-1).map(p=>[p[0],p[1]]).concat([[o.x,o.y]]);u.pgx=o.x;u.pgy=o.y;u.prt=G.t+3+Math.random();}}
function navTo(u,x,y,dt,fin){const d=u.s.dom;if(d==='air'){stepTo(u,x,y,dt,fin);return;}
  if(!u.path||Math.hypot(u.pgx-x,u.pgy-y)>60||G.t>u.prt){if(d==='ground'){bocc();P_B=true;}try{u.path=los(d,u.x,u.y,x,y)?[[x,y]]:(smoothP(d,u.x,u.y,findPath(d,u.x,u.y,x,y))||[[x,y]]);}finally{P_B=false;}u.pgx=x;u.pgy=y;u.prt=G.t+2.5+Math.random();}
  const sk=(MOVE[u.s.cls]||[4])[0]>=8?12:26;while(u.path.length>1&&Math.hypot(u.path[0][0]-u.x,u.path[0][1]-u.y)<sk)u.path.shift();
  // unstick: no progress toward the next waypoint for 2.5s (jammed on a corner or in a crowd) -> sidestep, then re-plan
  {const wp=u.path[0],dd=Math.hypot(wp[0]-u.x,wp[1]-u.y);if(u.npW!==wp){u.npW=wp;u.npD=dd;u.npT=G.t;}else if(dd<u.npD-3){u.npD=dd;u.npT=G.t;}
   else if(G.t-u.npT>2.5&&dd>20){u.npT=G.t;const base=Math.atan2(wp[1]-u.y,wp[0]-u.x),sg=(u.id+(G.t|0))%2?1:-1;let ok=null;
     for(const [da,r] of [[1.57*sg,45],[-1.57*sg,45],[2.3*sg,60],[-2.3*sg,60],[1.57*sg,80]]){const x2=u.x+Math.cos(base+da)*r,y2=u.y+Math.sin(base+da)*r;if(passXY(d,x2,y2)&&los(d,u.x,u.y,x2,y2)){ok=[x2,y2];break;}}
     if(ok){u.path.unshift(ok);u.npW=ok;u.npD=1e9;}u.prt=Math.min(u.prt,G.t+1.2);}}
  stepTo(u,u.path[0][0],u.path[0][1],dt,u.path.length===1&&fin);}
// Formations: a group moving together lines up facing its destination - armour in front, infantry behind it, support
// (AA, artillery, builders) at the back. Squads (a.fm) also travel at the pace of their slowest member so they arrive together.
const FROW={tank:0,hero:1,inf:1,at:1,hacker:2,aa:2,drone:2,arty:3,harv:4,dozer:4,boat:0,ship:0,heli:0,jet:0};
function formMove(us,x,y,type,squad,colW){const n=us.length;if(!n)return;if(n===1){setMove(us[0],x,y,type);return;}
  const cx=us.reduce((s,u)=>s+u.x,0)/n,cy=us.reduce((s,u)=>s+u.y,0)/n,dir=Math.atan2(y-cy,x-cx),fx=Math.cos(dir),fy=Math.sin(dir),px=-fy,py=fx;
  const sorted=us.slice().sort((p,q)=>(FROW[p.s.cls]??2)-(FROW[q.s.cls]??2)||p.id-q.id);const cols=colW||Math.max(2,Math.ceil(Math.sqrt(n*1.6)));const sp=Math.max(26,...us.map(u=>u.r*2+8));
  let cap=Infinity;if(squad)for(const u of us)if(u.s.dom!=='air')cap=Math.min(cap,u.s.spd);
  sorted.forEach((u,i)=>{const row=Math.floor(i/cols),inRow=Math.min(cols,n-row*cols),col=i%cols-(inRow-1)/2;const tx=x+px*col*sp-fx*row*sp,ty=y+py*col*sp-fy*row*sp;setMove(u,tx,ty,type);if(squad&&u.s.dom!=='air'&&isFinite(cap))u.order.cap=cap*.97;u.sq=squad?1:0;});}
function setMove(u,x,y,type){if(u.s.dom!=='air'){const p=nearestPassXY(u.s.dom,x,y);if(p){x=p[0];y=p[1];}}u.order={type,x,y};u.target=null;u.guard=null;u.path=null;if(u.kind==='jet'&&u.state!=='fly'){u.state='fly';u.landed=false;}}

/* ---------- combat ---------- */
// Spatial hash (rebuilt every tick) so target searches and vision only look at nearby cells, not every entity on the map.
const HC=160;let HW=Math.ceil(MAPW/HC)+2;
function buildHash(){let H=G.hash;if(!H)H=G.hash=new Map();else for(const a of H.values())a.length=0;for(const e of G.ents){if(e.dead)continue;const k=Math.floor(e.x/HC)+1+(Math.floor(e.y/HC)+1)*HW;const a=H.get(k);if(a)a.push(e);else H.set(k,[e]);}}
function nearby(x,y,R,out){out.length=0;const H=G.hash;if(!H){for(const e of G.ents)out.push(e);return out;}const x0=Math.floor((x-R)/HC)+1,x1=Math.floor((x+R)/HC)+1,y0=Math.floor((y-R)/HC)+1,y1=Math.floor((y+R)/HC)+1;
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const a=H.get(cx+cy*HW);if(a)for(let i=0;i<a.length;i++)out.push(a[i]);}return out;}
const NB=[],NB2=[];
function nearestEnemy(src,range,s,minEff){s=s||src.s;let best=null,bd=1e9;for(const e of nearby(src.x,src.y,range+60,NB)){if(e.dead||e.aband||ally(e.team,src.team)||!canTarget(s,e)||!seenBy(src.team,e))continue;if(minEff&&effOn(s,e)<minEff)continue;
  const d=Math.hypot(e.x-src.x,e.y-src.y)-e.r;if(d>range)continue;
  // smart targeting: prefer what this weapon is good against, finish off damaged targets, answer units that can shoot back,
  // and leave buildings and supply trucks for last
  let sc=d;if(s.wpn){const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor),eff=(VS[s.wpn]||{})[ar]||0;sc-=eff*90;}
  sc-=(1-Math.max(0,e.hp)/e.max)*70;if(!e.isB&&e.s.dmg&&canTarget(e.s,src))sc-=35;if(e.isB)sc+=e.kind==='turret'||e.kind==='sam'?60:180;if(e.kind==='harv'||e.kind==='dozer')sc+=30;
  if(sc<bd){bd=sc;best=e;}}return best;}
function fire(src,t,dmg,wpn,splash){if(!src.isB){const ss=src.s;if(ss.finisher&&!t.isB&&t.s&&isVeh(t.s)&&t.hp<t.max*.5)dmg*=1.4;if(ss.dom==='air'&&!t.isB&&saSpotted(src.team,t))dmg*=1.3;
  if(ss.ripple&&!src._rip){for(let k=1;k<ss.ripple;k++)G.timers.push({t:.16*k,fn:()=>{if(!src.dead&&!t.dead){src._rip=1;try{fire(src,t,dmg,wpn,splash);}finally{src._rip=0;}}}});}}
  if(!src.isB&&src.s.ambush&&hiddenNow(src)){dmg*=2;FXE('txt',[t.x|0,t.y|0,'AMBUSH',src.team,t.team]);}else if(!src.isB&&src.s.camo&&(DOCT[G.teams[src.team].fac]||{}).covert&&hiddenNow(src)){dmg*=1.5;FXE('txt',[t.x|0,t.y|0,'AMBUSH',src.team,t.team]);}src.lastFire=G.t;if(!src.isB&&(wpn==='shell'&&src.s.dom==='ground'||src.s.cls==='arty'))src.cbrT=G.t+10;
  const ang=src.isB?src.ang:((['tank','arty','aa','ship','boat'].includes(src.s.cls))?src.tang:Math.atan2(t.y-src.y,t.x-src.x));
  const len=src.isB?20:({inf:8,at:10,hero:10,tank:24,arty:27,aa:16,boat:16,ship:30,heli:14,jet:10}[src.s.cls]||10);
  const ox=src.x+Math.cos(ang)*len,oy=src.y+Math.sin(ang)*len,h=srcH(src);
  FXE('muz',[ox|0,oy|0,h|0,+ang.toFixed(2),wpn==='gun'||wpn==='snipe'?5:wpn==='at'||wpn==='missile'?8:wpn==='flak'?7:13]);
  if(wpn==='gun'||wpn==='tower'||wpn==='snipe'||wpn==='flak'){applyDmg(t,dmg,wpn,src.team,src);FXE('tr',[ox|0,oy|0,h|0,(t.x+rnd(-4,4))|0,(t.y+rnd(-4,4))|0,tgtH(t)|0,wpn==='flak'?1:0]);return;}
  if(src.kind==='heli')FXE('salvo',[ox|0,oy|0,h|0,t.x|0,t.y|0,+ang.toFixed(2)]);
  const d=Math.hypot(t.x-ox,t.y-oy),spd=wpn==='shell'?280:wpn==='at'||wpn==='missile'?430:wpn==='bomb'?380:640;
  const p={x:ox,y:oy,tx:t.x,ty:t.y,tgt:t,p:0,len:Math.max(d,1),spd,dmg,wpn,splash:splash||0,team:src.team,src};G.proj.push(p);
  FXE('pj',[ox|0,oy|0,h|0,t.x|0,t.y|0,tgtH(t)|0,spd,wpn,src.s.rocket?1:0]);}
function srcH(e){if(e.isB)return BH[e.kind]*.8+6;if(e.s.dom==='air')return e.landed?4:(e.s.alt==='high'?110:55);return e.s.dom==='naval'?10:8;}
function tgtH(e){if(e.oil)return 16;return e.isB?BH[e.kind]*.5:e.s.dom==='air'?(e.landed?4:(e.s.alt==='high'?110:55)):6;}
// Tactics: armour is thickest at the front (side hits x1.2, rear hits x1.6), infantry in woods or beside buildings take
// less damage, firing downhill helps and uphill hurts, moving targets are harder to hit, and infantry under heavy fire
// get suppressed (they shoot slower and move slower until it wears off).
function coverAt(x,y){const g=G.cover;if(!g)return 0;const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<GW&&Y<GH)n+=g[Y*GW+X];}
  if(n>=2)return 1;for(const b of G.ents)if(b.isB&&!b.dead&&Math.abs(b.x-x)<b.size/2+34&&Math.abs(b.y-y)<b.size/2+34)return 1;return 0;}
function tactic(e,wpn,src,splash){let m=1,tag=null;if(e.isB||!src||src.isB&&!src.s)return{m,tag};const air=e.s.dom==='air'&&!e.landed,sair=!src.isB&&src.s.dom==='air';
  if(!air&&(isVeh(e.s)||e.s.dom==='naval')&&!splash&&wpn!=='bomb'){const a=Math.atan2(e.y-src.y,e.x-src.x),rel=Math.abs(angDiff(e.hd??e.ang,a));
    if(rel<.95){m*=1.6;tag='REAR HIT';}else if(rel<2.1){m*=1.2;tag='SIDE HIT';}else m*=.8;}
  if(isInf(e.s)&&!air){if(coverAt(e.x,e.y)){m*=wpn==='shell'||wpn==='boom'||splash?.8:.65;tag=tag||'IN COVER';}if(e.supp>.5)m*=.9;}
  if(!air&&!sair){const dh=groundH(src.x,src.y)-groundH(e.x,e.y);if(dh>10){m*=1.15;tag=tag||'HIGH GROUND';}else if(dh<-10)m*=.9;}
  if(!air&&G.t-(e.mv||-9)<.35&&['cannon','at','tower','snipe','gun'].includes(wpn))m*=.85;
  return{m,tag};}
function specialMult(e,wpn,src){let m=1;if(e.mark>G.t)m*=1.25;if((wpn==='shell'||wpn==='missile'||wpn==='bomb'||wpn==='super'||src&&src.s&&src.s.rocket)&&auraProtect(e,'dome')){m*=.45;if(G.t-(e.domeT||-9)>1.2){e.domeT=G.t;FXE('boom',[(e.x+rnd(-20,20))|0,(e.y+rnd(-20,20))|0,6,0]);}}
  if(src&&!src.isB&&(src.s.dom==='air'||src.kind==='drone'||wpn==='missile')&&auraProtect(e,'jam'))m*=.5;return m;}
function applyDmg(e,d,wpn,team,src,splash){if(e.dead)return;if(e.civ&&e.kind==='civb'){const m=VS[wpn]&&VS[wpn].bld;if(m)damageCiv(e.civ,d*m,team);return;}if(e.oil){const m=VS[wpn]&&VS[wpn].bld;if(m)damageOil(e.oil,d*m,team);return;}if(e.isB&&team!=null&&!ally(team,e.team)){const V=G.teams[e.team];if(G.t-(V.atkWarn??-99)>25){V.atkWarn=G.t;log(e.team,'Our base is under attack!','w');}}const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor);const m=VS[wpn][ar];if(!m)return;const tc=tactic(e,wpn,src,splash);const dd=d*m*dmgIn(e,wpn)*tc.m*specialMult(e,wpn,src);if(src&&!src.isB&&src.s.mark&&!e.isB)e.mark=G.t+6;e.hp-=dd;e.lastHit=G.t;
  if(!e.isB&&canRout(e)){e.fear=(e.fear||0)+dd/e.max*(isInf(e.s)?1.25:.7)*(coverAt(e.x,e.y)&&isInf(e.s)?.7:1)*(auraNear(e,'morale')?.5:1)+(splash?.05:.02);}
  if(!e.isB&&isInf(e.s)&&!auraNear(e,'morale')&&!auraNear(e,'rof')){const bk=team!=null&&G.teams[team]&&(DOCT[G.teams[team].fac]||{}).barrage&&(wpn==='shell'||wpn==='rocket'||splash)?1.5:1;e.supp=Math.min(1,(e.supp||0)+(dd/e.max*1.4+(wpn==='gun'||wpn==='tower'?.06:.12))*bk);if(bk>1&&canRout(e))e.fear=(e.fear||0)+.04;}
  if(tc.tag&&tc.m>1.05&&G.t-(e.tagT||-9)>1.6&&(tc.tag==='REAR HIT'||tc.tag==='SIDE HIT'||tc.tag==='HIGH GROUND')){e.tagT=G.t;FXE('txt',[e.x|0,e.y|0,tc.tag,team,e.team]);}
  if(e.hp<=0)kill(e,team,src);}
function kill(e,team,src){if(e.dead)return;if(e.kind==='garrison'&&e.civ){collapseCiv(e.civ,team);return;}e.dead=true;if(!e.isB&&e.s&&isInf(e.s)&&!e.s.noAttack&&(e.s.cost||0)<=600&&!e.crew&&Math.random()<.35){let md=null;for(const o of nearby(e.x,e.y,170,DS_N))if(!o.dead&&o.team===e.team&&o.s&&o.s.revive&&Math.hypot(o.x-e.x,o.y-e.y)<170){md=o;break;}if(md){const kd=e.kind,tm=e.team;G.timers.push({t:8,fn:()=>{if(md.dead||G.teams[tm].out)return;const p=nearestPassXY('ground',md.x+rnd(-14,14),md.y+rnd(-14,14));if(!p)return;const n=addUnit(tm,kd,p[0],p[1]);if(n){n.hp=n.max*.3;FXE('txt',[n.x|0,n.y|0,'BACK IN ACTION',tm,-2]);}}});}}if(e.kind==='cleric'){const T=G.teams[e.team];T.mart=G.t+30;T.clr=false;for(const O of G.teams)log(O.id,O.id===e.team||ally(O.id,e.team)?'Our Ayatollah has been martyred! His sacrifice steels our soldiers: no fear and +10% damage for 30 seconds.':`The enemy Ayatollah has fallen - expect his followers to fight harder for a while.`,O.id===e.team?'bad':'w');}if(!e.isB&&e.s.dom==='ground'){for(const o of nearby(e.x,e.y,240,MOR_K)){if(o.dead||o.isB||o===e||!canRout(o))continue;if(o.team===e.team)o.fear=(o.fear||0)+(isInf(e.s)?.16:.26);else if(team!=null&&ally(o.team,team))o.fear=Math.max(0,(o.fear||0)-.08);}}if(e.cargo&&e.cargo.length){log(e.team,`The ${e.s.name} was destroyed with ${e.cargo.length} aboard.`,'bad');for(const c of e.cargo){c.dead=true;G.teams[c.team].lost++;}e.cargo=[];}if(e.isB)G.bdirty=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),e.isB?1:0,e.team]);G.teams[e.team].lost++;
  if(!e.isB&&e.s){const V=G.teams[e.team];if(V&&V.pw&&V.pw.bounty&&((GPOW[V.fac]||{}).bounty||{}).fx==='salvage')V.credits+=Math.round((e.s.cost||0)*.15);}
  if(e.isB)log(e.team,`${e.s.name} destroyed.`,'w');
  if(team!=null&&!ally(team,e.team)){const T=G.teams[team],val=e.isB?(e.kind==='hq'?2000:Math.max(400,e.s.cost)):e.s.cost;T.kills++;T.gxp+=val;promoteGeneral(T);
    if(T.pw.bounty){const gb=(GPOW[T.fac]||{}).bounty||{};const b=Math.round(val*[.15,.22,.3][(T.pw.bounty.lv||1)-1]*(gb.m||1)/(gb.fx?1.1:1));T.credits+=b;}if(T.upg.salvage&&!e.isB&&e.s.armor==='heavy')T.credits+=Math.round(val*.25);
    if(e.isB&&e.vs[team])log(team,`Enemy ${e.s.name} destroyed.`,'g');
    if(src&&!src.isB&&!src.dead){src.xp+=val*(T.upg.training?2:1);const base=Math.max(300,src.s.cost),need=[1,2.5,5];let r=0;while(r<3&&src.xp>=base*need[r])r++;if(r>src.rank){src.rank=r;src.hp=src.max;log(src.team,`${src.s.name} promoted to ${VET[r]}.`,'g');}}}}
function promoteGeneral(T){let r=1;while(r<RANKS.length&&T.gxp>=RANKS[r])r++;if(r>T.rank){T.rank=r;log(T.id,`General promoted to rank ${r}. Spend your new point in Powers.`,'g');}}
function explode(x,y,r,d,team,wpn,kind,src){for(const e of G.ents){if(e.dead||ally(e.team,team))continue;const air=!e.isB&&e.s.dom==='air'&&!e.landed;if(air&&!VS[wpn].air)continue;
  const dd=Math.hypot(e.x-x,e.y-y)-e.r;if(dd>r)continue;let m=1-.5*Math.max(0,dd)/r;if(kind==='sup')m*=(FACTIONS[G.teams[e.team].fac].mods.supResist||1);applyDmg(e,d*m,wpn,team,src,1);
  if(!e.isB&&!e.dead&&!air){const L=Math.hypot(e.x-x,e.y-y)||1;physImpulse(e,(e.x-x)/L,(e.y-y)/L,Math.min(d,900)*.55*(1-Math.max(0,dd)/r)*(kind==='sup'?1.6:1));}}
  if(G.civAt){const mm=VS[wpn]&&VS[wpn].bld;if(mm){const R=r+CELL,c0=Math.floor((x-R)/CELL),c1=Math.floor((x+R)/CELL),r0=Math.floor((y-R)/CELL),r1=Math.floor((y+R)/CELL);for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++){const c=G.civAt.get(cy*GW+cx);if(!c||c.dead||c.g)continue;const dd=Math.hypot(c.x-x,c.y-y)-16;if(dd>r)continue;damageCiv(c,d*(1-.5*Math.max(0,dd)/r)*mm,team);}}}
  for(const o of G.oil){if(o.dead)continue;const dd=Math.hypot(o.x-x,o.y-y)-18;if(dd>r)continue;const mm=VS[wpn]&&VS[wpn].bld;if(mm)damageOil(o,d*(1-.5*Math.max(0,dd)/r)*mm,team);}FXE('boom',[x|0,y|0,+(kind==='sup'?r*.62:Math.max(9,r*.42)).toFixed(1),kind==='sup'?1:0]);}

// Morale. Fear builds from damage taken, comrades dying nearby and being badly outnumbered, and drains away out of
// combat. When it passes the unit's courage it breaks: it drops its orders and runs for the nearest friendly
// building for a few seconds (ignoring commands), then rallies at reduced fear.
const MOR_K=[],MOR_N=[],MOR_H=[];const SEP_G={ground:[],naval:[],air:[]};
// morale as the player sees it: 0..1 plus a state word; null for units that never break
function moraleOf(e){if(!e||e.isB||e.dead)return null;if(MODE==='client'){if(e.aband||e.mor==null||e.mor<0)return null;if(e.mor>100)return{v:1,st:'fearless'};const v=e.mor/100;return{v,st:e.routV?'routing':e.lastV?'last':v>.66?'steady':v>.35?'shaken':'breaking'};}
  if(!e.s||!canRout(e)||e.aband)return null;const T=G.teams[e.team];if(fearlessT(T,e))return{v:1,st:'fearless'};if(e.last>G.t)return{v:1,st:'last'};if(e.rout>G.t)return{v:0,st:'routing'};const v=Math.max(0,Math.min(1,1-(e.fear||0)/courageOf(e)));return{v,st:v>.66?'steady':v>.35?'shaken':'breaking'};}
const MOR_COL={last:'#c98bff',fearless:'#5fd38a',steady:'#6fb2ff',shaken:'#e3b341',breaking:'#ef7a3a',routing:'#ea5a40'};
const MOR_TXT={last:'Last stand',fearless:'Fearless',steady:'Steady',shaken:'Shaken',breaking:'Breaking',routing:'Routing'};
function canRout(u){return u.s&&u.s.dom==='ground'&&!u.s.noAttack&&u.kind!=='hero'&&u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker'&&!u.inTun&&!G.teams[u.team].dummy;}
const NOBREAK={KP:1};
function fearlessT(T,u){return !!(NOBREAK[T.fac]||T.clr||(T.mart||0)>G.t||((T.fervor||0)>G.t&&(!T.fervInf||isInf(u.s))));}
// Rally zones: troops near their HQ, an Ayatollah, a friendly-held building or an officer steady themselves much faster
const RZ_N=[];
function rallyZone(u){for(const o of nearby(u.x,u.y,380,RZ_N)){if(o.dead||!ally(o.team,u.team))continue;const d=Math.hypot(o.x-u.x,o.y-u.y);if(o.kind==='cleric'&&d<380)return 'Ayatollah';if(o.kind==='hq'&&o.isB&&d<(o.size||80)/2+260)return 'HQ';if(o.kind==='garrison'&&o.civ&&o.civ.occ&&o.civ.occ.length&&d<210)return 'stronghold';}return auraNear(u,'morale')?'officer':null;}
function moraleTick(u,dt){const T0=G.teams[u.team];if(fearlessT(T0,u)){u.fear=0;u.last=0;if(u.rout){u.rout=0;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);}return false;}const C=courageOf(u);let f=u.fear||0;
  u.mT=(u.mT||0)-dt;if(u.mT<=0){u.mT=1+(u.id%5)*.05;let fr=0,en=0,q=0,qn=0;for(const o of nearby(u.x,u.y,300,MOR_N)){if(o.dead||o.isB||o.s.dom==='air')continue;if(ally(o.team,u.team))fr+=o.s.cost||300;else{en+=o.s.cost||300;if(!o.s.noAttack){qn++;q|=1<<((o.x>u.x?1:0)+(o.y>u.y?2:0));}}}u.odds=en/Math.max(1,fr);
    u.sur=qn>=4&&((q&1)+(q>>1&1)+(q>>2&1)+(q>>3&1))>=3;u.rz=rallyZone(u);}
  if(u.rout>G.t){u.target=null;u.order=null;u.guard=null;const R=u.rtTo;if(R){if(Math.hypot(R.x-u.x,R.y-u.y)>30)navTo(u,R.x,R.y,dt,true);}f=Math.max(0,f-dt*(u.rz?.3:.04));u.fear=f;
    if(u.rz&&f<C*.6){u.rout=0;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);return false;}return true;}
  if(u.rout){u.rout=0;u.fear=f=C*.45;FXE('txt',[u.x|0,u.y|0,'RALLIED',u.team,-2]);}
  if(u.last>G.t){u.fear=Math.min(f,C*.85);u.supp=Math.max(u.supp||0,.75);return false;}
  const calm=G.t-u.lastHit>4;f+=((u.odds||0)>2.2&&!calm?.03*Math.min(3,u.odds-1.2):0)*dt;f-=dt*(.025+(calm?.07:0)+(u.rz?(u.rz==='officer'?.1:.14):0)+(isInf(u.s)&&coverAt(u.x,u.y)?.02:0));u.fear=f=Math.max(0,f);
  if(f>C){const T=G.teams[u.team];
    // Last stand: surrounded with nowhere to run - they stop caring about fear but are pinned down
    if(u.sur){u.last=G.t+10;u.fear=C*.85;u.supp=Math.max(u.supp||0,.75);FXE('txt',[u.x|0,u.y|0,'LAST STAND',u.team,-2]);return false;}
    // Crews bail out of badly damaged vehicles; enemy infantry can then capture the hull
    if(isVeh(u.s)&&u.hp<u.max*.3&&!u.s.noCrew){bailOut(u);return true;}
    let best=null,bd=1e12;for(const b of G.ents){if(b.dead||!b.isB||b.team!==u.team||b.built<1)continue;const d=(b.x-u.x)**2+(b.y-u.y)**2;if(d<bd&&d>140*140){bd=d;best=b;}}
    if(!best){u.last=G.t+10;u.fear=C*.85;u.supp=Math.max(u.supp||0,.75);FXE('txt',[u.x|0,u.y|0,'LAST STAND',u.team,-2]);return false;}const a=Math.atan2(u.y-best.y,u.x-best.x);u.rtTo={x:best.x+Math.cos(a)*(best.size/2+60),y:best.y+Math.sin(a)*(best.size/2+60)};
    u.rout=G.t+Math.max(4,9-3*(C-.9));u.target=null;u.order=null;u.guard=null;FXE('txt',[u.x|0,u.y|0,'ROUTED',u.team,-2]);
    if(u.team===ME&&G.t-(T.routWarn??-99)>15){T.routWarn=G.t;log(u.team,`Our ${u.s.name} broke under fire and is falling back.`,'w');}return true;}
  return false;}
function bailOut(u){const T=G.teams[u.team];u.aband=1;u.cp=0;u.cpT=0;u.target=null;u.order=null;u.guard=null;u.rout=0;u.fear=0;u.last=0;
  FXE('txt',[u.x|0,u.y|0,'CREW BAILED OUT',u.team,-2]);
  try{const a=Math.random()*6.28,c=addUnit(u.team,'inf',u.x+Math.cos(a)*(u.r+10),u.y+Math.sin(a)*(u.r+10));if(c){c.hp=c.max*.5;c.crew=1;c.fear=courageOf(c)*1.05;}}catch(err){}
  if(u.team===ME)log(u.team,`The crew of our ${u.s.name} bailed out - send infantry to re-crew it before the enemy takes it.`,'w');}
const AB_N=[];
function updAband(u,dt){u.target=null;u.order=null;u.guard=null;u.cpT=(u.cpT||0)-dt;if(u.cpT>0)return;u.cpT=.5;let own=0,foe=-1;
  for(const o of nearby(u.x,u.y,u.r+50,AB_N)){if(o.dead||o.isB||!isInf(o.s)||o.s.noAttack||o.kind==='hacker'||o.inTun||o.aband)continue;if(Math.hypot(o.x-u.x,o.y-u.y)>u.r+42)continue;if(ally(o.team,u.team))own++;else if(foe===-1)foe=o.team;else if(foe>=0&&!ally(foe,o.team))foe=-2;}
  if(own&&foe===-1){u.cp=(u.cp||0)+.5;if(u.cp>=3){u.aband=0;u.cp=0;FXE('txt',[u.x|0,u.y|0,'RE-CREWED',u.team,-2]);}return;}
  if(foe>=0&&!own){u.cp=(u.cp||0)+.5;if(u.cp>=5){const prev=u.team,N=G.teams[foe],fr=u.hp/u.max;u.team=foe;try{const ns=stats(N.fac,u.kind);if(ns&&ns.hp){u.s=ns;u.max=ns.hp;u.hp=Math.max(1,ns.hp*fr);}}catch(err){}
      u.aband=0;u.cp=0;u.fear=0;u.rout=0;u.last=0;u.rank=0;u.sq=0;FXE('txt',[u.x|0,u.y|0,'CAPTURED',foe,-2]);log(foe,`Our infantry captured an abandoned enemy ${u.s.name}!`,'g');log(prev,`The enemy captured one of our abandoned vehicles.`,'w');}return;}
  u.cp=Math.max(0,(u.cp||0)-.25);}
// ---------- physics ----------
// Every ground unit has a mass. Explosions push units away with an impulse (lighter units fly further; infantry caught
// close to a big blast are thrown off their feet), the resulting momentum bleeds off with ground friction, collisions
// share the push by mass (a tank shoves soldiers aside, soldiers can't shove a tank), and heavy vehicles moving at speed
// crush enemy infantry they drive into. Everything runs in the deterministic host simulation, so multiplayer agrees.
function massOf(u){if(u.ms)return u.ms;const s=u.s;let m=1;if(s.dom==='ground'&&!(isInf(s)&&!['tank','aa','arty'].includes(s.cls)&&u.kind!=='harv'&&u.kind!=='dozer'))m=s.armor==='heavy'?12+s.hp/60:5+s.hp/120;if(s.dom==='naval')m=40;return u.ms=m;}
function physImpulse(e,nx,ny,J){if(e.isB||e.dead||!e.s||e.s.dom!=='ground')return;const m=massOf(e),kv=Math.min(240,J/m);if(kv<4)return;e.kx=(e.kx||0)+nx*kv;e.ky=(e.ky||0)+ny*kv;
  if(m<2&&kv>70){e.stun=Math.max(e.stun||0,G.t+.8+Math.min(.8,kv/300));FXE('toss',[e.id,Math.min(110,kv*.55)|0]);}}
function physTick(u,dt){if(!u.kx&&!u.ky)return;const d=u.s.dom==='ground'?(massOf(u)<2?5.5:7.5):6,k=Math.exp(-d*dt);const nx=u.x+u.kx*dt,ny=u.y+u.ky*dt;
  if(passXY(u.s.dom,nx,ny)){u.x=nx;u.y=ny;}else{u.kx*=-.3;u.ky*=-.3;}u.kx*=k;u.ky*=k;if(Math.abs(u.kx)+Math.abs(u.ky)<2){u.kx=u.ky=0;}}
function updUnit(u,dt){if(u.kx||u.ky)physTick(u,dt);if(u.aband)return updAband(u,dt);const s=u.s,T=G.teams[u.team],m=T.F.mods;if(u.stun>G.t){u.cd=Math.max(u.cd,.5);return;}u.cd-=dt;if(T.dummy&&!T.fight){const o=u.order;u.target=null;if(o&&(o.type==='move'||o.type==='amove')&&u.kind!=='jet'){if(Math.hypot(o.x-u.x,o.y-u.y)<14)u.order=null;else navTo(u,o.x,o.y,dt,true);}return;}if(u.supp)u.supp=Math.max(0,u.supp-dt*.22);
  if(G.t-u.lastHit>5&&u.hp<u.max){let rg=(m.regen||0)+(u.rank>=3?5:0)+(T.upg.hullplate&&s.dom==='naval'?3:0);if(rg)u.hp=Math.min(u.max,u.hp+rg*dt);}
  if(u.kind==='harv')return updHarv(u,dt);if(u.kind==='dozer')return updDozer(u,dt);if(u.kind==='jet')return updJet(u,dt);if(u.kind==='hacker')return updHacker(u,dt);
  if(canRout(u)&&moraleTick(u,dt))return;
  let o=u.order;if(o&&o.type==='demo')return updDemo(u,dt);
  if(s.noAttack||s.mines){specialTick(u,dt,o);if(s.noAttack){if(o&&(o.type==='move'||o.type==='amove')){if(Math.hypot(o.x-u.x,o.y-u.y)<14||stalled(u,o))u.order=null;else navTo(u,o.x,o.y,dt,true);}else if(o&&o.type==='enter'){}else return;if(!o||o.type!=='enter')return;}}
  if(o&&o.type==='board'){const tr=o.target;if(!tr||tr.dead){u.order=null;return;}if(Math.hypot(tr.x-u.x,tr.y-u.y)<tr.r+(tr.s.dom==='naval'?95:40)){boardTransport(u,tr);return;}navTo(u,tr.x,tr.y,dt);return;}
  if(o&&o.type==='garrison'){const c=G.civ&&G.civ[o.ci];if(!c||c.dead||(c.g&&!ally(c.g.team,u.team))){u.order=null;return;}const gd=Math.hypot(c.x-u.x,c.y-u.y);if(gd<CELL*1.85||(gd<CELL*2.3&&G.t-(u.mv||-9)>.6)){enterGarrison(u,c);return;}if(stalled(u,o)&&gd>CELL*2.3){u.order=null;return;}navTo(u,c.x,c.y,dt);return;}
  if(o&&o.type==='enter'){const b=o.target;if(b.dead||b.built<1){u.order=null;return;}if(Math.hypot(b.x-u.x,b.y-u.y)<b.size/2+24){enterTunnel(u);return;}navTo(u,b.x,b.y,dt);return;}
  if(o&&o.type==='attack'){if(o.target.dead||!canTarget(s,o.target)||!seenBy(u.team,o.target)){u.order=o=null;u.target=null;}else u.target=o.target;}
  if(u.target&&(u.target.dead||!seenBy(u.team,u.target)||!canTarget(s,u.target)))u.target=null;
  if(!u.target&&(!o||o.type==='amove'||o.type==='move')&&((u.scT=(u.scT||0)-dt)<=0||u.lastHit>G.t-dt*1.5)){u.scT=.2+(u.id%7)*.02;autoEngage(u,o,T);}
  if(u.defend&&!o){const D=u.defend;if(!u.target&&((u.dfT=(u.dfT||0)-dt)<=0)){u.dfT=.4+(u.id%5)*.03;const e=nearestEnemy({x:D.x,y:D.y,team:u.team,s:u.s},D.r);if(e){u.target=e;u.guard={x:D.x,y:D.y};}}
    if(u.target&&Math.hypot(u.target.x-D.x,u.target.y-D.y)>D.r+160){u.target=null;}if(!u.target&&Math.hypot(u.x-D.x,u.y-D.y)>70&&(u.s.dom!=='air'||!isFW(u))){navTo(u,D.x,D.y,dt,true);return;}}
  if(unitBrain(u,dt,o))return;
  if(u.target){const t=u.target;
    if(!o&&u.guard&&Math.hypot(u.x-u.guard.x,u.y-u.guard.y)>420){u.target=null;setMove(u,u.guard.x,u.guard.y,'move');return;}
    const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r,R=rngOf(u);
    if(d>R){if(o&&o.type==='move'){u.target=null;navTo(u,o.x,o.y,dt,true);return;}navTo(u,t.x,t.y,dt);return;}
    if(!['tank','arty','aa','ship','boat'].includes(s.cls))u.ang=Math.atan2(t.y-u.y,t.x-u.x);
    if(s.minr&&d<s.minr){if(s.dom!=='naval')stepTo(u,u.x*2-t.x,u.y*2-t.y,dt);return;}
    if(s.wpn==='boom'){explode(u.x,u.y,s.splash*(T.upg.thermo?1.2:1),s.dmg*dmgOut(u),u.team,'boom',null,u);u.dead=true;G.byId.delete(u.id);FXE('die',[u.id,u.x|0,u.y|0,KINDS.indexOf(u.kind),0,u.team]);return;}
    if(u.cd<=0&&Math.abs(angDiff(u.tang,Math.atan2(t.y-u.y,t.x-u.x)))<.35){fire(u,t,s.dmg*dmgOut(u),s.wpn,(s.splash||0)*(T.upg.thermo&&s.cls==='arty'?1.2:1));u.cd=s.rof*rofMult(u);}return;}
  if(o&&(o.type==='move'||o.type==='amove')){const od=Math.hypot(o.x-u.x,o.y-u.y);if(od<(isFW(u)?60:(MOVE[s.cls]||[4])[0]>=8?8:14)||(!isFW(u)&&od<40&&G.t-(u.mv||-9)>1.2)||(!isFW(u)&&stalled(u,o))){if(isFW(u))u.lc={x:o.x,y:o.y};if(u.wq&&u.wq.length){const n=u.wq.shift();setMove(u,n.x,n.y,n.m);}else{u.order=null;u.guard=null;u.retreat=0;}}else navTo(u,o.x,o.y,dt,true);}
  else if(!o&&!u.target&&isFW(u))loiter(u,dt);}
// Automatic engagement - units fight on their own when it makes tactical sense:
// - idle units engage enemies they can see and can actually hurt, and come to the aid of nearby friends under fire
// - they hold position (fire only at what is in range) instead of charging when heavily outnumbered
// - they ignore targets their weapons barely scratch (rifles vs tanks) unless nothing better is near
// - units on a plain move order keep moving, but turn and fight if ambushed while they clearly have the upper hand
//   (the move becomes an attack-move to the same spot, so they carry on afterwards)
const AE_N=[],AV_N=[];function hqCached(team){const C=G.hqC||(G.hqC={});const c=C[team];if(c&&G.t-c.t<1&&!(c.h&&c.h.dead))return c.h;const h=G.ents.find(e=>e.team===team&&e.kind==='hq'&&!e.dead)||null;C[team]={t:G.t,h};return h;}
function effOn(s,e){if(!s.wpn)return 0;const ar=e.isB?'bld':(e.landed?'heavy':e.s.armor);return (VS[s.wpn]||{})[ar]||0;}
function friendsUnderFire(u){for(const o of nearby(u.x,u.y,320,AE_N)){if(o.dead||o.isB||o===u||o.team!==u.team)continue;if(o.lastHit>G.t-2.5&&Math.hypot(o.x-u.x,o.y-u.y)<320)return true;}return false;}
function autoEngage(u,o,T){const s=u.s;if(s.noAttack||u.rout>G.t||u.retreat)return;if(u.stlT&&!(u.lastHit>G.t-1.5)&&!(o&&o.type==='amove'))return;const base=s.aggro*(T.upg.network?1.15:1),hit=u.lastHit>G.t-1.5,odds=u.odds||0;
  if(o&&o.type==='move'){if(o.hold||isVeh(s)&&u.hp<u.max*.3)return;
    // ambushed and clearly stronger: return fire at whoever is shooting
    if(hit&&odds<=.9){const e=nearestEnemy(u,rngOf(u));if(e&&effOn(s,e)>=.4)u.target=e;return;}
    // enemies in the unit's path: stop and shoot when it can hurt them and isn't outmatched - but not when it is
    // falling back toward its own base (a retreat), and never chase: once out of range the unit carries on moving
    if(odds>1.5)return;const hq=hqCached(u.team);if(hq&&Math.hypot(o.x-hq.x,o.y-hq.y)<Math.hypot(u.x-hq.x,u.y-hq.y)-200)return;
    const e=nearestEnemy(u,rngOf(u)+10,null,.5);if(!e||e.isB)return;if(massOf(u)>=10&&massOf(e)<2&&Math.hypot(e.x-u.x,e.y-u.y)<160)return;/* tanks just run infantry over */const ah=Math.atan2(o.y-u.y,o.x-u.x),ae=Math.atan2(e.y-u.y,e.x-u.x);
    if(Math.abs(angDiff(ah,ae))<1.05||hit)u.target=e;return;}
  const help=!o&&friendsUnderFire(u),R=base+(o?60:0)+(help?160:0);let e=nearestEnemy(u,R);if(!e)return;
  if(effOn(s,e)<.35&&!(e.isB&&s.wpn!=='gun')){const alt=nearestEnemy(u,R,null,.35);if(alt)e=alt;else if(!hit)return;}
  const d=Math.hypot(e.x-u.x,e.y-u.y)-(e.r||0);if(!o&&odds>2.6&&d>rngOf(u)+10)return; // outnumbered: hold and fire, don't charge
  u.target=e;if(!o&&!u.guard)u.guard={x:u.x,y:u.y};}
// Unit intelligence (applies whenever the player hasn't given a direct move order):
// - re-picks the best target every second (switches to a much better one in range)
// - dodges incoming artillery and missile strikes
// - badly damaged units pull back out of the fight toward home
// - infantry under fire look for cover in nearby woods
// - units that outrange their target keep their distance (kiting)
// - vehicles turn their thick front armour toward whoever is shooting at them
// hard AI: pick the enemy in range closest to dying (and that this unit can actually hurt)
const WNB=[];function weakestEnemy(u,R){let best=null,bv=1e9;for(const e of nearby(u.x,u.y,R+40,WNB)){if(e.dead||ally(e.team,u.team)||!seenBy(u.team,e)||!canTarget(u.s,e))continue;const d=Math.hypot(e.x-u.x,e.y-u.y)-(e.r||0);if(d>R)continue;const v=e.hp/(e.max||1)+(e.isB?.5:0)+d/(R*4);if(v<bv){bv=v;best=e;}}return best||nearestEnemy(u,R);}
function unitBrain(u,dt,o){const s=u.s;if(o&&o.type==='move'&&!o.auto)return false;u.bt=(u.bt||0)-dt;
  if(u.bt<=0){u.bt=.9+Math.random()*.3;
    if(s.dom!=='air'){for(const st of G.strikes){if(st.t<.4||st.team===u.team||ally(st.team,u.team))continue;const dd=Math.hypot(u.x-st.x,u.y-st.y);if(dd<st.r+26){const a=Math.atan2(u.y-st.y,u.x-st.x)||Math.random()*6.28,k=st.r+60-dd;setMove(u,u.x+Math.cos(a)*k,u.y+Math.sin(a)*k,'move');u.order.auto=1;return true;}}}
    if(u.hp<u.max*.25&&!u.rt&&s.dom!=='air'&&G.t-u.lastHit<3&&u.target&&!(G.teams[u.team].ai&&!DIFF[G.teams[u.team].ai.d??1].retreat)){if(G.teams[u.team].ai&&u.kind!=='harv'&&u.kind!=='dozer'){const tn=G.ents.filter(b=>b.isB&&b.team===u.team&&b.kind==='tunnel'&&!b.dead&&b.built>=1&&dist(b,u)<750).sort((p,q)=>dist(p,u)-dist(q,u))[0];if(tn&&G.teams[u.team].tun.length<TUN_CAP){u.rt=G.t;u.order={type:'enter',target:tn,auto:1};u.target=null;u.path=null;return true;}}const home=G.ents.filter(b=>b.isB&&b.team===u.team&&!b.dead).sort((p,q)=>dist(p,u)-dist(q,u))[0];if(home&&dist(home,u)>260){u.rt=G.t;const a=Math.atan2(home.y-u.y,home.x-u.x);setMove(u,u.x+Math.cos(a)*260,u.y+Math.sin(a)*260,'move');u.order.auto=1;log(u.team,`${s.name} is badly damaged and pulling back.`);return true;}}
    if(u.rt&&G.t-u.rt>12)u.rt=0;
    if(isInf(s)&&!o&&G.t-u.lastHit<1.5&&!coverAt(u.x,u.y)&&G.cover&&G.t-(u.cvT||-9)>6){u.cvT=G.t;let best=null,bd=1e9;const cx=Math.floor(u.x/CELL),cy=Math.floor(u.y/CELL);for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const X=cx+i,Y=cy+j;if(X<0||Y<0||X>=GW||Y>=GH||!G.cover[Y*GW+X])continue;const x=X*CELL+CELL/2,y=Y*CELL+CELL/2;if(!coverAt(x,y))continue;const d=Math.hypot(x-u.x,y-u.y);if(d<bd&&d<130){bd=d;best=[x,y];}}if(best){setMove(u,best[0],best[1],'move');u.order.auto=1;u.guard={x:best[0],y:best[1]};return true;}}
    if(u.target&&(!o||o.type==='amove')){const AI=G.teams[u.team].ai;const b=AI&&DIFF[AI.d??1].focus?weakestEnemy(u,rngOf(u)+20):nearestEnemy(u,rngOf(u)+20);if(b&&b!==u.target)u.target=b;}}
  const t=u.target;if(!t||t.dead)return false;const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r,R=rngOf(u);
  if(!t.isB&&t.s&&t.s.rng&&s.dom==='ground'&&!s.minr&&R>t.s.rng*1.3&&d<Math.min(R*.6,t.s.rng+30)&&canTarget(t.s,u)){const a=Math.atan2(u.y-t.y,u.x-t.x);stepTo(u,u.x+Math.cos(a)*60,u.y+Math.sin(a)*60,dt);if(u.cd<=0&&Math.abs(angDiff(u.tang,Math.atan2(t.y-u.y,t.x-u.x)))<.35){fire(u,t,s.dmg*dmgOut(u),s.wpn,s.splash||0);u.cd=s.rof*rofMult(u);}return true;}
  if((isVeh(s)||s.dom==='naval')&&d<=R&&G.t-(u.mv||-9)>.4){const want=Math.atan2(t.y-u.y,t.x-u.x),M=MOVE[s.cls]||[2,40];const e=angDiff(u.hd??u.ang,want);if(Math.abs(e)>.35){u.hd=(u.hd??u.ang)+Math.max(-M[0]*.5*dt,Math.min(M[0]*.5*dt,e));u.ang=u.hd;}}
  return false;}
function angDiff(a,b){return((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;}
function updHarv(u,dt){const T=G.teams[u.team];
  if(u.order){if(Math.hypot(u.order.x-u.x,u.order.y-u.y)<10)u.order=null;else{navTo(u,u.order.x,u.order.y,dt);return;}}
  if(u.state==='ret'){let best=u.drop&&!u.drop.dead&&G.t<(u.dropT||0)?u.drop:null,bd=best?dist(best,u):1e9;if(!best){for(const e of G.ents)if(e.isB&&e.team===u.team&&(e.kind==='hq'||e.kind==='depot')&&e.built>=1&&!e.dead){const d=dist(e,u);if(d<bd){bd=d;best=e;}}u.drop=best;u.dropT=G.t+1.5;}
    if(!best)return;if(bd<best.size/2+26){T.credits+=Math.round(u.cargo*(T.ai?T.ai.inc:1)*(G.bs||1));u.cargo=0;u.state='go';}else navTo(u,best.x,best.y,dt);return;}
  if(!u.field||u.field.amt<=0){if(G.t<(u.fldT||0))return;u.fldT=G.t+1.5;const drops=G.ents.filter(e=>e.isB&&e.team===u.team&&(e.kind==='hq'||e.kind==='depot')&&e.built>=1&&!e.dead);let best=null,bd=1e9;for(const f of G.fields)if(f.amt>0){let dd=1e9;for(const b of drops)dd=Math.min(dd,dist(b,f));const d=dist(f,u)*.6+(drops.length?dd:0)+(los('ground',u.x,u.y,f.x,f.y)?0:900);if(d<bd){bd=d;best=f;}}u.field=best;if(!best)return;}
  const f=u.field;if(u.state==='go'){if(dist(f,u)<f.r+6){u.state='gather';u.gt=0;}else navTo(u,f.x,f.y,dt);}
  else if(u.state==='gather'){u.gt+=dt;if(u.gt>=3){const take=Math.min(Math.round(160*(T.upg.logistics?1.3:1)*(T.F.mods.harv||1)),f.amt);f.amt-=take;u.cargo=take;u.state='ret';}}}
function updHacker(u,dt){const T=G.teams[u.team],o=u.order;u.hacking=false;
  if(o&&o.type==='hack'){const t=o.target;if(t.dead||!seenBy(u.team,t)){u.order=null;return;}const d=Math.hypot(t.x-u.x,t.y-u.y)-t.r;
    if(d>u.s.rng){navTo(u,t.x,t.y,dt);u.hk=0;return;}u.ang=Math.atan2(t.y-u.y,t.x-u.x);u.hk=(u.hk||0)+dt;u.hacking=true;u.lastFire=G.t;
    if(u.hk>=4){t.dis=G.t+20;u.order=null;u.hk=0;log(u.team,`${t.s.name} disabled for 20 seconds.`,'g');log(t.team,`Warning: your ${t.s.name} has been hacked!`,'w');FXE('hack',[t.x|0,t.y|0]);}return;}
  if(o&&o.type==='move'){if(Math.hypot(o.x-u.x,o.y-u.y)<10||stalled(u,o))u.order=null;else{navTo(u,o.x,o.y,dt);u.still=0;return;}}
  u.still=(u.still||0)+dt;if(u.still>2){u.hacking=true;u.inc=(u.inc||0)+dt;if(u.inc>=1.5){u.inc=0;T.credits+=6;}}}
function updDemo(u,dt){const o=u.order,t=o.target;if(t.dead){u.order=null;u.planting=false;return;}const d=Math.hypot(t.x-u.x,t.y-u.y)-t.size/2;
  if(d>18){navTo(u,t.x,t.y,dt);u.pt=0;u.planting=false;return;}u.planting=true;u.pt=(u.pt||0)+dt;if(u.pt>=2){t.charge={t:6,team:u.team,src:u};u.order=null;u.planting=false;log(u.team,'Charges planted. Detonation in 6 seconds.','g');log(t.team,`Warning: explosives planted on your ${t.s.name}!`,'w');}}
function updJet(u,dt){const s=u.s;if(wxNow().air===0&&u.state==='park'){if(u.order&&!u.wxw){u.wxw=1;log(u.team,'Jets are grounded until the storm passes.','w');}return;}u.wxw=0;const pads=G.ents.filter(b=>b.isB&&b.team===u.team&&b.kind==='airfield'&&b.built>=1&&!b.dead);
  const home=pads.length?pads.reduce((a,b)=>dist(a,u)<dist(b,u)?a:b):null;
  if(u.state!=='park'&&u.landed===false&&u.toT==null)u.toT=G.t;
  if(u.state==='park'){u.toT=null;if(!home){u.state='fly';u.landed=false;}else{const p=padPos(home,u);u.x=p.x;u.y=p.y;if(u.ammo<s.ammo){u.rt=(u.rt||0)+dt;if(u.rt>=4){u.ammo=s.ammo;u.rt=0;}}if(!u.order)return;u.state='fly';u.landed=false;}}
  let o=u.order,goal=null;
  if(o&&o.type==='attack'){if(o.target.dead||!seenBy(u.team,o.target)||!canTarget(s,o.target)){u.order=o=null;u.target=null;}else{u.target=o.target;goal=o.target;}}
  else if(o&&(o.type==='move'||o.type==='amove')){if(o.type==='amove'&&!u.target&&u.ammo>0){const e=nearestEnemy(u,s.aggro);if(e)u.target=e;}
    if(u.target&&(u.target.dead||!seenBy(u.team,u.target)))u.target=null;goal=u.target||o;if(!u.target&&Math.hypot(o.x-u.x,o.y-u.y)<70){o.hold=(o.hold||0)+dt;if(o.hold>8){u.order=null;}}}
  if(u.ammo<=0||!o){u.target=null;if(home){const p=padPos(home,u);goal=p;if(Math.hypot(p.x-u.x,p.y-u.y)<30){u.state='park';u.landed=true;u.order=null;u.ang=u.va=-1.57;return;}}else goal={x:u.x+Math.cos(u.ang+.6)*80,y:u.y+Math.sin(u.ang+.6)*80};}
  const want=Math.atan2(goal.y-u.y,goal.x-u.x),df=angDiff(u.ang,want);u.ang+=Math.max(-2.6*dt,Math.min(2.6*dt,df));u.va=u.ang;u.tang=u.ang;
  const near=!o&&home&&Math.hypot(goal.x-u.x,goal.y-u.y)<160;u.ld=(!o||u.ammo<=0)&&home?Math.max(0,Math.min(1,Math.hypot(goal.x-u.x,goal.y-u.y)/420)):1;const thr=u.toT!=null?Math.min(1,.3+(G.t-u.toT)/2.2):1;const sp=s.spd*(near?.5:1)*thr;u.v=sp;u.x+=Math.cos(u.ang)*sp*dt;u.y+=Math.sin(u.ang)*sp*dt;u.x=Math.max(-100,Math.min(MAPW+100,u.x));u.y=Math.max(-100,Math.min(MAPH+100,u.y));
  if(u.target&&u.ammo>0&&u.cd<=0){const d=Math.hypot(u.target.x-u.x,u.target.y-u.y)-u.target.r;if(d<s.rng&&Math.abs(angDiff(u.ang,Math.atan2(u.target.y-u.y,u.target.x-u.x)))<.5){fire(u,u.target,s.dmg*dmgOut(u),'bomb',s.splash);u.ammo--;u.cd=s.rof;if(u.ammo<=0)u.order=null;}}}
function updBld(b,dt){if(b.kind==='garrison')return updGarrison(b,dt);if(G.teams[b.team].dummy&&!G.teams[b.team].fight&&b.built>=1)return;if(b.built<1){if(b.nd){b.stall=!G.ents.some(u=>u.kind==='dozer'&&u.team===b.team&&!u.dead&&Math.hypot(u.x-b.x,u.y-b.y)<b.size/2+48);if(b.stall)return;}const bk=G.sandbox&&b.team===0?6:1;b.built=Math.min(1,b.built+bk*dt/b.s.time);b.hp=Math.min(b.max,b.hp+bk*b.max*.9*dt/b.s.time);if(b.built>=1)log(b.team,`${b.s.name} complete.`,'g');return;}
  if(b.charge){b.charge.t-=dt;if(b.charge.t<=0){const c=b.charge;b.charge=null;applyDmg(b,3000,'demo',c.team,c.src);FXE('boom',[b.x|0,b.y|0,b.size*.5,1]);}}
  if(b.dis>G.t)return;
  if(b.kind!=='turret'&&b.kind!=='sam'&&b.kind!=='tunnel')return;b.cd-=dt;const t=b.target;
  if(t&&(t.dead||Math.hypot(t.x-b.x,t.y-b.y)-t.r>b.s.rng||!seenBy(b.team,t)||!canTarget(b.s,t)))b.target=null;
  if(!b.target)b.target=nearestEnemy(b,b.s.rng);
  if(b.target){b.ang=Math.atan2(b.target.y-b.y,b.target.x-b.x);if(b.cd<=0){fire(b,b.target,b.s.dmg,b.s.wpn,0);b.cd=b.s.rof;}}}
function updProj(dt){for(const p of G.proj){if(p.wpn!=='shell'&&p.wpn!=='bomb'&&!p.tgt.dead){p.tx=p.tgt.x;p.ty=p.tgt.y;}
  const a=Math.atan2(p.ty-p.y,p.tx-p.x),st=p.spd*dt,rem=Math.hypot(p.tx-p.x,p.ty-p.y);p.p+=st;
  if(rem<=st){p.done=true;const src=p.src&&!p.src.dead?p.src:null;if(p.splash)explode(p.tx,p.ty,p.splash,p.dmg,p.team,p.wpn,null,src);else if(!p.tgt.dead){applyDmg(p.tgt,p.dmg,p.wpn,p.team,src);FXE('boom',[p.tx|0,p.ty|0,p.wpn==='at'||p.wpn==='missile'?9:7,0]);}}
  else{p.x+=Math.cos(a)*st;p.y+=Math.sin(a)*st;}}G.proj=G.proj.filter(p=>!p.done);}
function launch(team,x,y){const T=G.teams[team],S=T.sup;if(T.charge<S.charge||!working(team,'uplink'))return false;
  // missile nations: every missile visibly launches from the strike building and arcs through the sky onto its target
  // (same timing, damage and warning as before - only the visuals changed)
  const up=G.ents.find(e=>e.team===team&&e.kind==='uplink'&&!e.dead&&e.built>=1),sty=(UPLINK[T.fac]||[])[1],arc=up&&sty&&sty!=='air';
  for(let i=0;i<S.n;i++){const a=rnd(0,6.28),r=S.n>1?rnd(0,S.spread):0,tx=x+Math.cos(a)*r,ty=y+Math.sin(a)*r,t=3+i*.28;G.strikes.push({x:tx,y:ty,t,r:S.r,dmg:S.dmg,team,kind:'sup'});FXE('strike',[tx|0,ty|0,+t.toFixed(2),S.r|0,1,arc?1:0]);
    if(arc)FXE('bmis',[(up.x+rnd(-14,14))|0,(up.y+rnd(-14,14))|0,tx|0,ty|0,+t.toFixed(2),i]);}
  T.charge=0;log(team,`${S.name} launched.`,'g');for(const O of G.teams)if(O.id!==team)log(O.id,`Warning: enemy ${S.name} inbound. Move your units!`,'w');return true;}
function addStrike(x,y,t,r,dmg,team,kind){G.strikes.push({x,y,t,r,dmg,team,kind});FXE('strike',[x|0,y|0,+t.toFixed(2),r|0,kind==='sup'?1:0]);}
function updStrikes(dt){for(const s of G.strikes){s.t-=dt;if(s.t<=0){s.done=true;explode(s.x,s.y,s.r,s.dmg,s.team,s.kind==='sup'?'super':'shell',s.kind);}}G.strikes=G.strikes.filter(s=>!s.done);}

/* ---------- general's powers ---------- */
function hqOf(team){return G.ents.find(e=>e.team===team&&e.kind==='hq'&&!e.dead)||G.ents.find(e=>e.team===team&&e.isB&&!e.dead);}
function natPower(team,P,x,y){const T=G.teams[team],hq=hqOf(team),en=e=>!e.dead&&!ally(e.team,team)&&e.team>=0;
  switch(P.type){
    case 'strafe':{const a=Math.atan2(y-(hq?hq.y:y),x-(hq?hq.x:x)),c=Math.cos(a),s=Math.sin(a);for(let i=0;i<9;i++){const d=-160+i*40;addStrike(x+c*d,y+s*d,1.2+i*.12,i%3===1?70:45,(i%3===1?380:200)*P.M,team,'bar');}FXE('plane',[(x-c*1200)|0,(y-s*1200)|0,x|0,y|0,team]);return true;}
    case 'drones':{if(!hq)return false;for(let i=0;i<P.n+2*(P.lv-1);i++){const u=addUnit(team,'drone',hq.x+rnd(-40,40),hq.y+rnd(-40,40));setMove(u,x+rnd(-60,60),y+rnd(-60,60),'amove');}return true;}
    case 'intel':{for(const O of G.teams)if(!ally(O.id,team))for(const b of G.ents)if(b.isB&&b.team===O.id&&!b.dead)T.reveals.push({x:b.x,y:b.y,r:90,t:20+5*P.lv});for(const e of G.ents)if(en(e)&&!e.isB&&Math.hypot(e.x-x,e.y-y)<P.r)e.mark=G.t+25;FXE('ping',[x|0,y|0,P.r]);return true;}
    case 'supply':{T.credits+=Math.round(1200*P.M);for(const e of G.ents)if(e.team===team&&Math.hypot(e.x-x,e.y-y)<P.r)e.hp=Math.min(e.max,e.hp+e.max*.4);FXE('heal',[x|0,y|0,P.r]);return true;}
    case 'partisans':{const p=nearestPassXY('ground',x,y);if(!p)return false;for(let i=0;i<P.n+3*(P.lv-1);i++){const q=nearestPassXY('ground',p[0]+rnd(-50,50),p[1]+rnd(-50,50))||p;const u=addUnit(team,i%3===2?'at':'inf',q[0],q[1]);u.guard={x:q[0],y:q[1]};}return true;}
    case 'thermo':{addStrike(x,y,3,P.r,900*P.M,team,'sup');return true;}
    case 'cash':{T.credits+=Math.round(2000*P.M);return true;}
    case 'mercs':{if(!hq)return false;for(const k of ['tank','tank','aa','aa','tank','arty','tank','aa'].slice(0,4+2*(P.lv-1))){const q=nearestPassXY('ground',hq.x+rnd(-140,140),hq.y+rnd(-140,140))||[hq.x,hq.y];addUnit(team,k,q[0],q[1]);}return true;}
    case 'emp':{addStrike(x,y,2.2,90,420,team,'sup');G.timers.push({t:2.3,fn:()=>{for(const e of G.ents){if(!en(e)||Math.hypot(e.x-x,e.y-y)>P.r)continue;if(e.isB)e.dis=Math.max(e.dis||0,G.t+10*P.M);else if(isVeh(e.s)||e.s.dom!=='ground')e.stun=G.t+10*P.M;}FXE('heal',[x|0,y|0,P.r]);}});return true;}
    case 'shield':{(G.shields=G.shields||[]).push({team,x,y,r:P.r,t:G.t+20*P.M});FXE('heal',[x|0,y|0,P.r]);return true;}
    case 'cyber':{for(const e of G.ents)if(en(e)&&e.isB&&Math.hypot(e.x-x,e.y-y)<P.r)e.dis=Math.max(e.dis||0,G.t+18*P.M);T.reveals.push({x,y,r:P.r,t:18*P.M});FXE('ping',[x|0,y|0,P.r]);return true;}
    case 'wave':{if(!hq)return false;for(let i=0;i<Math.round(P.n*P.M);i++){const q=nearestPassXY('ground',hq.x+rnd(-120,120),hq.y+rnd(-120,120))||[hq.x,hq.y];const u=addUnit(team,'inf',q[0],q[1]);setMove(u,x+rnd(-80,80),y+rnd(-80,80),'amove');}return true;}
    case 'precise':{for(let i=0;i<Math.round(8*P.M);i++){const a=rnd(0,6.28),r=rnd(0,P.r);addStrike(x+Math.cos(a)*r,y+Math.sin(a)*r,1.4+i*.25,55,260,team,'bar');}return true;}
    case 'smoke':{(G.smokes=G.smokes||[]).push({team,x,y,r:P.r,t:G.t+20*P.M});FXE('smoke',[x|0,y|0,P.r]);return true;}
    case 'fervor':{T.fervor=G.t+25*P.M;T.fervK=1.1+.05*P.lv;return true;}
    case 'labbayk':{T.fervor=G.t+25*P.M;T.fervK=1.15+.05*P.lv;T.fervInf=1;for(const e of G.ents)if(e.team===team&&!e.isB&&isInf(e.s))e.hp=Math.min(e.max,e.hp+e.max*.5);return true;}
    case 'raid':{T.raidT=G.t+25*P.M;T.reveals.push({x,y,r:P.r,t:25*P.M});FXE('ping',[x|0,y|0,P.r]);return true;}}
  return false;}
function powCost(T,key){const w=T.pw[key];return !w?1:(w.lv||1)>=3?99:(w.lv||1)+1;}
function buyPower(team,key){const T=G.teams[team];if(!POWERS[key])return false;const c=powCost(T,key);if(T.rank-T.spent<c)return false;T.spent+=c;if(!T.pw[key]){T.pw[key]={cd:0,lv:1};log(team,`${powInfo(key,T.fac).name} unlocked.`,'g');}else{T.pw[key].lv=(T.pw[key].lv||1)+1;log(team,`${powInfo(key,T.fac).name} upgraded to level ${T.pw[key].lv}.`,'g');}return true;}
// unique per-nation effects layered on the shared general powers (GPOW .fx)
function gpowFx(team,P,x,y,dur){const fx=P.fx,inR=e=>Math.hypot(e.x-x,e.y-y)<P.r;
  if(fx==='mark'){for(const e of G.ents)if(!e.dead&&!e.isB&&!ally(e.team,team)&&inR(e))e.mark=G.t+dur;}
  else if(fx==='detect'){for(const e of G.ents)if(!e.dead&&!ally(e.team,team)&&inR(e))e.detT=G.t+dur;}
  else if(fx==='fire'){let n=0;const tick=()=>{for(const e of G.ents)if(!e.dead&&!ally(e.team,team)&&!(e.s&&e.s.dom==='air')&&inR(e))applyDmg(e,(e.isB?14:22)*P.M,'boom',team,null,1);for(let q=0;q<3;q++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*P.r*.85;FXE('boom',[(x+Math.cos(a)*r)|0,(y+Math.sin(a)*r)|0,5,0]);}if(n%3===0)FXE('smoke',[x|0,y|0,(P.r*.7)|0]);if(++n<8)G.timers.push({t:1,fn:tick});};G.timers.push({t:4,fn:tick});}
  else if(fx==='emp'){G.timers.push({t:3.5,fn:()=>{for(const e of G.ents)if(!e.dead&&!e.isB&&e.s&&isVeh(e.s)&&!ally(e.team,team)&&inR(e))e.stun=Math.max(e.stun||0,G.t+4*P.M);}});}
  else if(fx==='smoke'){(G.smokes=G.smokes||[]).push({team,x,y,r:P.r,t:G.t+14*P.M});G.timers.push({t:3,fn:()=>FXE('smoke',[x|0,y|0,P.r|0])});}
  else if(fx==='rearm'){for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===team&&inR(e))e.rofT=G.t+12*P.M;}
  else if(fx==='rally'){for(const e of G.ents)if(!e.dead&&!e.isB&&e.team===team&&inR(e)){e.fear=0;e.rout=0;e.last=G.t+15*P.M;e.supp=0;}}
  else if(fx==='shield'){(G.shields=G.shields||[]).push({team,x,y,r:P.r,t:G.t+12*P.M,k:.75});}}
function usePower(team,key,x,y){const T=G.teams[team],P0=powInfo(key,T.fac),w=T.pw[key];if(!P0||P0.passive||!w||w.cd>0)return false;const L=Math.max(1,Math.min(3,w.lv||1)),M=PLV[L-1],P=Object.assign({},P0,{lv:L,M,cd:Math.round(P0.cd*PCD[L-1]),r:P0.r?Math.round(P0.r*(1+.2*(L-1))):P0.r});
  if(key==='nat'){if(!natPower(team,P,x,y))return false;w.cd=P.cd;log(team,`${P.name}!`,'g');for(const O of G.teams)if(O.id!==team&&!ally(O.id,team))log(O.id,`Enemy ${T.F.name} used ${P.name}.`,'w');return true;}
  const dur=(25+10*(L-1))*(P.tm||1);if(P.fx)gpowFx(team,P,x,y,dur);
  if(key==='recon'){T.reveals.push({x,y,r:P.r,t:dur});FXE('ping',[x|0,y|0,P.r]);}
  else if(key==='barrage'){const nS=Math.max(3,Math.round(10*M*(P.nm||1)));for(let i=0;i<nS;i++){const a=rnd(0,6.28),r=rnd(0,P.r);addStrike(x+Math.cos(a)*r,y+Math.sin(a)*r,1.5+i*.3*Math.min(1,10/nS*1.2),60,Math.round(230*(P.dm||1)),team,'bar');}for(const O of G.teams)if(O.id!==team&&G.ents.some(e=>e.team===O.id&&!e.dead&&Math.hypot(e.x-x,e.y-y)<P.r+300))log(O.id,'Warning: incoming artillery barrage!','w');}
  else if(key==='repair'){for(const e of G.ents)if(e.team===team&&Math.hypot(e.x-x,e.y-y)<P.r)e.hp=Math.min(e.max,e.hp+e.max*(.4+.2*L)*(P.pm||1));FXE('heal',[x|0,y|0,P.r]);}
  else if(key==='para'){const p=nearestPassXY('ground',x,y);if(!p)return false;const bb=BASES[team]||BASES[0],sx=bb[0]<MAPW/2?-100:MAPW+100,sy=bb[1]<MAPH/2?-100:MAPH+100;FXE('plane',[sx,sy,p[0]|0,p[1]|0,team]);
    G.timers.push({t:2.6,fn:()=>{const R=roster(T.fac).barracks;(()=>{const mx=P.mix||['inf','inf','inf','at','at','inf','at','inf','inf','at','inf'],nP=Math.max(2,Math.round((2+3*L)*(P.nm||1)));return Array.from({length:nP},(_,i)=>mx[i%mx.length]);})().forEach((k,i)=>{const q=nearestPassXY('ground',p[0]+rnd(-40,40),p[1]+rnd(-40,40))||p;const n=addUnit(team,k,q[0],q[1]);if(n&&P.fx==='vet'){n.rank=Math.max(n.rank||0,1);n.xp=Math.max(300,n.s.cost);}if(n&&P.fx==='dig')n.digT=1;if(n&&P.fx==='stealth')n.stlT=1;});log(team,'Paratroopers have landed.','g');}});}
  w.cd=P.cd;log(team,`${P.name} used.`);return true;}

/* ---------- player actions (local input, AI and network commands all go through here) ---------- */
function act(team,a){if(!G||G.over)return;const own=ids=>(ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.isB&&u.team===team);if(a.ids&&a.t!=='def'&&['go','atk','stop','gar','tun','board','atkCiv','fld','line','ret'].includes(a.t))for(const u of own(a.ids)){u.defend=null;if(!a.q)u.wq=null;if(a.t!=='ret')u.retreat=0;if(a.t!=='line')u.faceA=null;}
  switch(a.t){
    case 'go':{const us=own(a.ids).filter(u=>!((u.kind==='harv'||u.kind==='dozer')&&a.mode==='amove'));const md=a.mode==='amove'?'amove':'move';
      if(a.q){const busy=us.filter(u=>u.order&&(u.order.type==='move'||u.order.type==='amove'));for(const u of busy){(u.wq=u.wq||[]).push({x:a.x,y:a.y,m:md});if(u.wq.length>8)u.wq.shift();}const idle=us.filter(u=>!busy.includes(u));if(idle.length)formMove(idle,a.x,a.y,md,!!a.fm);break;}
      for(const u of us)u.wq=null;formMove(us,a.x,a.y,md,!!a.fm);sharePath(us,a.x,a.y);break;}
    case 'atk':{const t=G.byId.get(a.tid);if(!t||ally(t.team,team))break;for(const u of own(a.ids)){
      if(u.kind==='hacker'){if(t.isB){u.order={type:'hack',target:t};u.hk=0;}continue;}
      if(u.s.demo&&t.isB){u.order={type:'demo',target:t};u.pt=0;continue;}
      if(u.kind==='harv'||u.kind==='dozer'||!canTarget(u.s,t))continue;u.order={type:'attack',target:t};u.guard=null;u.path=null;if(u.kind==='jet'){u.state='fly';u.landed=false;}}break;}
    case 'atkOil':{const o=G.oil[a.fi];if(!o||o.dead||ally(o.owner,team))break;for(const u of own(a.ids)){if(u.kind==='harv'||u.kind==='dozer'||u.kind==='hacker'||!canTarget(u.s,o.tg))continue;u.order={type:'attack',target:o.tg};u.guard=null;u.path=null;if(u.kind==='jet'){u.state='fly';u.landed=false;}}break;}
    case 'fld':{const f=G.fields[a.fi];if(f)for(const u of own(a.ids))if(u.kind==='harv'){u.field=f;u.state='go';u.order=null;}break;}
    case 'q':enqueue(team,a.k);break;
    case 'dq':dequeue(team,a.k);break;
    case 'bld':placeBld(team,a.k,a.x,a.y,a.dz);break;
    case 'bldGo':{const b=G.byId.get(a.tid);if(!b||!b.isB||b.team!==team||b.built>=1)break;for(const u of own(a.ids))if(u.kind==='dozer'){u.order={type:'build',target:b};u.path=null;}break;}
    case 'up':startResearch(team,a.k);break;
    case 'sup':launch(team,a.x,a.y);break;
    case 'buy':buyPower(team,a.k);break;
    case 'pow':usePower(team,a.k,a.x,a.y);break;
    case 'rally':G.teams[team].rally={x:a.x,y:a.y};break;
    case 'give':{giveMoney(team,a.to|0,a.amt);break;}
    case 'tun':{const b=G.byId.get(a.tid);if(!b||!b.isB||b.team!==team||b.kind!=='tunnel'||b.built<1)break;for(const u of own(a.ids))if(u.s.dom==='ground'&&u.kind!=='harv'&&u.kind!=='hacker'){u.order={type:'enter',target:b};u.target=null;u.path=null;}break;}
    case 'gar':{const c=G.civ&&G.civ[a.ci|0];if(!c||c.dead||(c.g&&!ally(c.g.team,team)))break;for(const u of own(a.ids))if(canGarrison(u)){u.order={type:'garrison',ci:c.i,x:c.x,y:c.y};u.target=null;u.guard=null;u.path=null;}break;}
    case 'atkCiv':{const c=G.civ&&G.civ[a.ci|0];if(!c||c.dead||c.g)break;const t=civTarget(c);for(const u of own(a.ids)){if(u.kind==='harv'||u.kind==='dozer'||u.kind==='hacker'||!canTarget(u.s,t))continue;u.order={type:'attack',target:t};u.guard=null;u.path=null;}break;}
    case 'ungar':{const b=G.byId.get(a.tid);if(b&&b.kind==='garrison'&&b.team===team&&b.civ)leaveGarrison(b.civ);break;}
    case 'unl':{const b=G.byId.get(a.tid);if(b&&b.isB&&b.team===team&&b.kind==='tunnel'&&b.built>=1)unloadTunnel(b);else if(b&&!b.isB&&b.team===team&&b.s.cap)unloadTransport(b);break;}
    case 'board':{const tr=G.byId.get(a.tid);if(!tr||tr.isB||tr.team!==team||!tr.s.cap)break;for(const u of own(a.ids))if(canBoard(tr,u)){u.order={type:'board',target:tr};u.target=null;u.path=null;}break;}
    case 'stop':for(const u of own(a.ids)){u.order=null;u.target=null;u.path=null;}break;
    // right-drag line formation: units spread evenly along the dragged line (extra units form ranks behind it),
    // assigned in order along the line so their paths do not cross
    case 'line':{const us=own(a.ids).filter(u=>!u.isB&&u.s&&u.s.spd>0&&u.kind!=='harv');const n=us.length;if(!n)break;const x2=a.x2,y2=a.y2,dx=x2-a.x,dy=y2-a.y,L=Math.max(1,Math.hypot(dx,dy)),ux=dx/L,uy=dy/L;
      const sp=Math.max(18,...us.map(u=>u.r*2.6)),per=Math.max(1,Math.floor(L/sp)+1);let cx=0,cy=0;for(const u of us){cx+=u.x;cy+=u.y;}cx/=n;cy/=n;
      let nx=-uy,ny=ux;if(((a.x+x2)/2-cx)*nx+((a.y+y2)/2-cy)*ny<0){nx=-nx;ny=-ny;}
      us.sort((p,q)=>((p.x-a.x)*ux+(p.y-a.y)*uy)-((q.x-a.x)*ux+(q.y-a.y)*uy)||p.id-q.id);
      for(let i=0;i<n;i++){const r=Math.floor(i/per),k=i%per,cnt=Math.min(per,n-r*per),len=Math.min(L,sp*(cnt-1)),off=(L-len)/2,t=cnt>1?k/(cnt-1):.5;
        let x=a.x+ux*(off+t*len)-nx*r*sp,y=a.y+uy*(off+t*len)-ny*r*sp;const u=us[i];if(u.s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}
        setMove(u,x,y,a.mode==='amove'?'amove':'move');u.faceA=Math.atan2(ny,nx);}break;}
    // retreat (Company of Heroes style): selected units run back to the nearest HQ, barracks or factory, a little
    // faster and harder to hit, and do not stop to fight on the way
    case 'ret':for(const u of own(a.ids)){if(u.isB||!u.s||!(u.s.spd>0))continue;let best=null,bd=1e18;for(const e of G.ents){if(e.dead||!e.isB||e.team!==u.team||!(e.kind==='hq'||e.kind==='barracks'||e.kind==='factory'))continue;const d=(e.x-u.x)**2+(e.y-u.y)**2;if(d<bd){bd=d;best=e;}}
      if(!best)continue;let x=best.x+((u.id*37)%120-60),y=best.y+((u.id*53)%120-60);if(u.s.dom==='ground'){const p=nearestPassXY('ground',x,y);if(p){x=p[0];y=p[1];}}u.target=null;u.wq=null;setMove(u,x,y,'move');u.retreat=1;}break;
    // defend an area: go there, then hold it - engage anything that comes within range of the spot and return afterwards
    case 'def':{const us=own(a.ids).filter(u=>!u.s.noAttack&&u.kind!=='harv'&&u.kind!=='dozer');formMove(us,a.x,a.y,'amove',false);for(const u of us){u.defend={x:u.order?u.order.x:a.x,y:u.order?u.order.y:a.y,r:Math.max(260,(u.s.aggro||240)+80)};}break;}
  }}

/* ---------- vision ---------- */
const VISMAX=720;
// Fog of war, once every 0.2 s. Each team's allies are a bitmask, so every nearby spotter is checked once for all the
// teams it reveals to (instead of once per team): the cost no longer grows with the number of players.
function updateVis(){buildHash();const N=G.teams.length;for(const e of G.ents)if(!e.dead)e._vr=visR(e);
  const AM=new Array(N);for(let a=0;a<N;a++){let m=0;for(let b=0;b<N;b++)if(ally(a,b))m|=1<<b;AM[a]=m;}const ALL=(1<<N)-1;
  for(const e of G.ents){if(e.dead)continue;if(!e.vs||e.vs.length!==N)e.vs=new Array(N).fill(false);
    let seen=AM[e.team]|(1<<e.team);
    if(seen!==ALL){const hid=hiddenNow(e);const near=nearby(e.x,e.y,VISMAX+e.r,NB2);
      for(const m of near){const need=AM[m.team]&~seen;if(!need)continue;const dx=m.x-e.x,dy=m.y-e.y,d2=dx*dx+dy*dy;
        if(!hid){const R=m._vr+e.r;if(d2<R*R)seen|=need;}else{for(let o=0;o<N;o++)if(need&(1<<o)){const R=detR(o,m)+e.r;if(d2<R*R)seen|=1<<o;}}
        if(seen===ALL)break;}
      if(seen!==ALL)for(let o=0;o<N;o++){if(seen&(1<<o))continue;for(const r of G.teams[o].reveals){const dx=r.x-e.x,dy=r.y-e.y;if(dx*dx+dy*dy<r.r*r.r){seen|=1<<o;break;}}
        if(!(seen&(1<<o))&&e.cbrT>G.t&&(G.cbrTeams&(1<<o)))seen|=1<<o;}}
    for(let o=0;o<N;o++){const v=!!(seen&(1<<o));e.vs[o]=v;if(v&&e.isB&&o!==e.team)e.sn=(e.sn|0)|(1<<o);}}
  if(G.sandbox)for(const e of G.ents)if(e.vs)e.vs[0]=true;
  for(const e of G.ents){e.vis=e.vs[ME]||(e.isB&&!!((e.sn|0)&(1<<ME)));e.hid=hiddenNow(e);}}

/* ---------- AI ---------- */
const AIORDER=['barracks','factory','turret','tunnel','airfield','sam','uplink','shipyard','tunnel','turret','factory','barracks','sam','turret','turret'];
function aiFindSpot(id,kind,anchor){const s=bstats(G.teams[id].fac,kind);
  if(STRUCT[kind].shore){for(let k=0;k<160;k++){const x=anchor.x+rnd(-1200,1200),y=anchor.y+rnd(-1200,1200);if(validSpot(id,kind,x,y))return[x,y];}return null;}
  for(let k=0;k<110;k++){const a=rnd(0,6.28),r=rnd(130,k<50?430:720),x=anchor.x+Math.cos(a)*r,y=anchor.y+Math.sin(a)*r;if(validSpot(id,kind,x,y))return[x,y];}return null;}
function aiExpand(T,mine,hq){const id=T.id,dz=mine.filter(e=>e.kind==='dozer'),hqs=mine.filter(e=>e.kind==='hq');
  if(hq&&dz.length<(G.t>150?2:1)&&T.credits>(dz.length?1400:800)&&!T.q.hq.some(i=>i.kind==='dozer')&&T.ai.t%4===0)enqueue(id,'dozer');
  T.ai.saveHq=false;if(mine.some(e=>e.isB&&e.nd&&e.built<1))return;const want=1+(G.t>230?1:0)+(G.t>700?1:0);
  if(!dz.length||hqs.length>=want)return;T.ai.saveHq=true;if(T.credits<bstats(T.fac,'hq').cost+150||T.ai.t%3)return;
  const dzr=dz.find(u=>!u.order)||dz[0];const blds=G.ents.filter(e=>e.isB&&!e.dead);
  const opts=G.fields.filter(f=>f.amt>2500&&blds.every(b=>Math.hypot(b.x-f.x,b.y-f.y)>650)).sort((p,q)=>dist(p,dzr)-dist(q,dzr));
  for(const f of opts.slice(0,4)){for(let k=0;k<30;k++){const a=rnd(0,6.28),r=rnd(150,260),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;if(validSpot(id,'hq',x,y)===2){placeBld(id,'hq',x,y,dzr.id);T.ai.exp=(T.ai.exp||0)+1;return;}}}}
function aiCluster(team){const P=G.ents.filter(e=>e.team===team&&!e.dead);let best=null,bs=-1;for(const a of P){let s=0;for(const b of P)if(Math.hypot(a.x-b.x,a.y-b.y)<170)s+=b.isB?3:1;if(s>bs){bs=s;best=a;}}return best;}
function aiFoe(T,anchor){const alive=G.teams.filter(O=>!ally(O.id,T.id)&&G.ents.some(e=>e.team===O.id&&e.isB&&!e.dead));if(!alive.length)return T.id===0?1:0;if(T.ai.foe!=null&&alive.some(O=>O.id===T.ai.foe)&&T.ai.t%20)return T.ai.foe;let best=alive[0].id,bd=1e9;for(const O of alive){const b=G.ents.find(e=>e.team===O.id&&e.isB&&!e.dead);const d=b?Math.hypot(b.x-anchor.x,b.y-anchor.y):1e9;if(d<bd){bd=d;best=O.id;}}return T.ai.foe=best;}
// AI sends the nearest infantry to re-crew its own abandoned vehicles or capture the enemy's
function aiSalvage(T,mine){if(T.ai.t%3)return;for(const v of G.ents){if(v.dead||!v.aband)continue;let best=null,bd=650*650;for(const u of mine){if(u.isB||u.dead||!isInf(u.s)||u.s.noAttack||u.kind==='hacker'||u.rout>G.t||u.inTun)continue;const d=(u.x-v.x)**2+(u.y-v.y)**2;if(d<bd){bd=d;best=u;}}if(best&&!(best.order&&best.order.salv===v.id)){setMove(best,v.x,v.y,'move');best.order.salv=v.id;}}}
function aiThink(T){const id=T.id,mine=G.ents.filter(e=>e.team===id&&!e.dead);const hq=mine.find(e=>e.kind==='hq');const anchor=hq||mine.find(e=>e.isB);if(!anchor)return;T.ai.t++;aiSalvage(T,mine);const en=aiFoe(T,anchor);
  const harvs=mine.filter(e=>e.kind==='harv').length;if(hq&&harvs<3+(G.t>300?1:0)&&!T.q.hq.length)enqueue(id,'harv');
  aiExpand(T,mine,hq);
  {const fnd=mine.filter(e=>e.isB&&e.nd&&e.built<1);const dzs=mine.filter(e=>e.kind==='dozer');for(const b of fnd){if(dzs.some(u=>u.order&&u.order.type==='build'&&u.order.target===b))continue;const fr=dzs.filter(u=>!u.order||u.order.type!=='build').sort((p,q)=>dist(p,b)-dist(q,b))[0];if(fr){fr.order={type:'build',target:b};fr.path=null;}}}
  while(AIORDER[T.ai.bi]&&!bldAllowed(T.fac,AIORDER[T.ai.bi]))T.ai.bi++;
  if(T.ai.bi>1&&!mine.some(e=>e.kind==='barracks'))T.ai.re='barracks';else if(T.ai.bi>2&&!mine.some(e=>e.kind==='factory'))T.ai.re='factory';else T.ai.re=null;
  if(T.ai.re&&!mine.some(e=>e.isB&&e.built<1)){const s=bstats(T.fac,T.ai.re);if(T.credits>=s.cost){const p=aiFindSpot(id,T.ai.re,anchor);if(p)placeBld(id,T.ai.re,p[0],p[1]);}}
  {const dps=mine.filter(e=>e.kind==='depot'||e.kind==='hq');if(T.ai.t%11===5&&dps.length&&mine.filter(e=>e.kind==='depot').length<3&&T.credits>bstats(T.fac,'depot').cost+400&&!mine.some(e=>e.isB&&e.built<1)&&mine.some(e=>e.kind==='harv')){
     const far=G.fields.filter(f=>f.amt>2500&&dps.every(b=>dist(b,f)>520)&&dist(f,anchor)<1500).sort((p,q)=>dist(p,anchor)-dist(q,anchor))[0];if(far){const p=aiFindSpot(id,'depot',{x:far.x,y:far.y});if(p&&Math.hypot(p[0]-far.x,p[1]-far.y)<260)placeBld(id,'depot',p[0],p[1]);}}}
  {const ec=mine.filter(e=>e.kind==='econ').length,left=G.fields.reduce((a,f)=>a+Math.max(0,f.amt),0)/Math.max(1,G.fields.length*9000);
   if(T.ai.t%13===7&&ec<4&&reqMet(id,'econ')&&!mine.some(e=>e.isB&&e.built<1)&&(G.t>480+ec*240||left<.35)&&T.credits>bstats(T.fac,'econ').cost+(left<.35?200:900)){const p=aiFindSpot(id,'econ',anchor);if(p)placeBld(id,'econ',p[0],p[1]);}}
  if(T.ai.t%15===8&&T.credits>2500){const poor=G.teams.filter(O=>O.id!==id&&!O.out&&ally(O.id,id)&&O.credits<500).sort((a,b)=>(a.ai?1:0)-(b.ai?1:0))[0];if(poor)giveMoney(id,poor.id,Math.min(1500,Math.round(T.credits*.3)));}
  const nk=T.ai.re?null:AIORDER[T.ai.bi];if(nk&&!reqMet(id,nk)){if(++T.ai.rq>45){T.ai.bi++;T.ai.rq=0;}}else T.ai.rq=0;if(nk&&reqMet(id,nk)&&!mine.some(e=>e.isB&&e.built<1)){const s=bstats(T.fac,nk);if(T.credits>=s.cost){const p=aiFindSpot(id,nk,anchor);if(p){placeBld(id,nk,p[0],p[1]);T.ai.bi++;T.ai.nf=0;}else if(STRUCT[nk].shore||++T.ai.nf>8){T.ai.bi++;T.ai.nf=0;}}}
  const reserve=Math.max((nk&&reqMet(id,nk))?bstats(T.fac,nk).cost*(T.ai.bi<6?1:.6):0,T.ai.saveHq?bstats(T.fac,'hq').cost*.8:0);
  const R=roster(T.fac),enemyAir=G.ents.filter(e=>e.team===en&&!e.isB&&e.s.dom==='air').length;
  for(const cat of ['barracks','factory','airfield','shipyard']){if(!done(id,cat)||T.q[cat].length>=Math.ceil(DIFF[T.ai.d??1].q*(G.bs||1)))continue;let opts=R[cat].filter(k=>k!=='hacker'||unitCount(id,'hacker')<3).filter(k=>k!=='lander'&&k!=='airlift').filter(k=>!stats(T.fac,k).limit||unitCount(id,k)<1);
    if(cat==='factory'){opts=enemyAir>=2?['aa','aa',...opts]:opts.filter(k=>k!=='aa'||Math.random()<.2);}
    if(cat==='airfield'&&Math.random()<.5)continue;if(cat==='shipyard'&&Math.random()<.6)continue;
    if(cat==='factory')opts=opts.filter(k=>k!=='drone'||Math.random()<.35);if(!opts.length)continue;
    const k=opts[Math.floor(Math.random()*opts.length)];if(k&&T.credits-reserve>=stats(T.fac,k).cost)enqueue(id,k);}
  if(T.credits>1700&&T.ai.t%5===0){const ups=upgList(T.fac).filter(k=>!T.upg[k]&&done(id,UPG[k].at)&&!T.rq[UPG[k].at]);if(ups.length)startResearch(id,ups[Math.floor(Math.random()*ups.length)]);}
  if(T.rank-T.spent>0){{let did=false;for(const k of ['nat','bounty','barrage','repair','para','recon'])if(!T.pw[k]){did=buyPower(id,k);break;}if(!did)for(const k of ['nat','barrage','repair'])if(T.pw[k]&&buyPower(id,k))break;}}
  if(T.pw.nat&&T.pw.nat.cd<=0&&T.ai.t%5===2){const N=natPow(T.fac);const c=aiCluster(en);const army=mine.filter(e=>!e.isB);
    if(N.self){if(N.type==='cash'||N.type==='mercs'||army.some(u=>u.target))usePower(id,'nat',0,0);}
    else if(N.type==='shield'||N.type==='smoke'||N.type==='supply'){const g=army.filter(u=>u.target);if(g.length>=4)usePower(id,'nat',g[0].x,g[0].y);}
    else if(N.type==='partisans'){if(c)usePower(id,'nat',c.x+rnd(-150,150),c.y+rnd(-150,150));}
    else if(c&&(N.type!=='cyber'&&N.type!=='intel'||true))usePower(id,'nat',c.x,c.y);}
  if(T.pw.barrage&&T.pw.barrage.cd<=0&&T.ai.t%7===0){const c=aiCluster(en);if(c&&G.ents.some(e=>e.team===id&&Math.hypot(e.x-c.x,e.y-c.y)<900))usePower(id,'barrage',c.x,c.y);}
  if(T.pw.repair&&T.pw.repair.cd<=0){const hurt=mine.filter(e=>!e.isB&&e.hp<e.max*.45);if(hurt.length>=4)usePower(id,'repair',hurt[0].x,hurt[0].y);}
  const army=mine.filter(e=>!e.isB&&!['harv','hacker','jet','dozer'].includes(e.kind));const pb=G.ents.filter(e=>e.team===en&&e.isB&&!e.dead);
  let threat=null;for(const e of G.ents){if(ally(e.team,id)||e.dead||e.isB)continue;if(mine.some(b=>b.isB&&Math.hypot(b.x-e.x,b.y-e.y)<560)){threat=e;break;}}
  if(threat)for(const u of army)if(!u.order&&Math.hypot(u.x-anchor.x,u.y-anchor.y)<1100&&canTarget(u.s,threat))setMove(u,threat.x,threat.y,'amove');
  const idle=army.filter(u=>!u.order&&!u.target);
  for(const u of idle)if(Math.hypot(u.x-anchor.x,u.y-anchor.y)>900&&pb.length){const t=pb.reduce((a,b)=>dist(a,u)<dist(b,u)?a:b);setMove(u,t.x,t.y,'amove');}
  const home=idle.filter(u=>Math.hypot(u.x-anchor.x,u.y-anchor.y)<=900&&u.s.dom!=='naval');
  if(home.length>=T.ai.wave&&pb.length&&G.t>DIFF[T.ai.d??1].first){const t=pb.find(e=>e.kind==='hq')||pb[0];const ang=Math.atan2(t.y-anchor.y,t.x-anchor.x),D=Math.hypot(t.x-anchor.x,t.y-anchor.y);
      const fl=DIFF[T.ai.d??1].flank&&home.length>=6&&D>900?home.filter((u,i)=>i%3===2&&isVeh(u.s)||i%4===3):[];const side=Math.random()<.5?1:-1;
      const fx=anchor.x+Math.cos(ang)*D*.62+Math.cos(ang+side*1.57)*Math.min(650,D*.35),fy=anchor.y+Math.sin(ang)*D*.62+Math.sin(ang+side*1.57)*Math.min(650,D*.35);
      for(const u of fl){setMove(u,fx+rnd(-50,50),fy+rnd(-50,50),'amove');u.flank=G.t;}const main=home.filter(u=>!fl.includes(u));const gnd=main.filter(u=>u.s.dom==='ground'),oth=main.filter(u=>u.s.dom!=='ground');if(gnd.length)formMove(gnd,t.x,t.y,'amove',1,4);for(const u of oth)setMove(u,t.x+rnd(-60,60),t.y+rnd(-60,60),'amove');
      if(fl.length)T.ai.flanks=(T.ai.flanks||0)+1;T.ai.wave=Math.min(T.ai.wave+Math.round(2*(G.bs||1)),Math.round(DIFF[T.ai.d??1].maxWave*(G.bs||1)));log(en,'Enemy attack force spotted moving out.','w');}
  for(const u of mine)if(u.s.dom==='naval'&&!u.order&&!u.target&&pb.length){const t=pb.reduce((a,b)=>dist(a,u)<dist(b,u)?a:b);const w=nearestPassXY('naval',t.x,t.y);if(w)setMove(u,w[0],w[1],'amove');}
  if(T.ai.t%6===0)for(const u of mine)if(u.kind==='jet'&&u.state==='park'&&u.ammo>=u.s.ammo&&pb.length){const t=pb[Math.floor(Math.random()*pb.length)];u.order={type:'attack',target:t};u.state='fly';u.landed=false;}
  if(T.ai.t%4===0){const free=G.oil.filter(o=>!ally(o.owner,id)).sort((a,b)=>dist(a,anchor)-dist(b,anchor))[0];if(free){const inf=mine.find(u=>!u.isB&&u.kind==='inf'&&!u.order&&!u.target);if(inf&&Math.hypot(free.x-anchor.x,free.y-anchor.y)<1700)setMove(inf,free.x,free.y,'move');}}
  if(T.ai.t%9===0){const tgt=G.oil.filter(o=>!o.dead&&o.owner>=0&&!ally(o.owner,id)).sort((p,q)=>dist(p,anchor)-dist(q,anchor))[0];if(tgt&&dist(tgt,anchor)<1500){const sq=army.filter(u=>!u.order&&!u.target&&u.s.dom==='ground'&&canTarget(u.s,tgt.tg)).slice(0,4);for(const u of sq){u.order={type:'attack',target:tgt.tg};u.path=null;}}}
  if(T.tun.length&&T.ai.t%3===0){const tns=mine.filter(e=>e.kind==='tunnel'&&e.built>=1);let pick=null;
    for(const b of tns)if(G.ents.some(e=>!e.dead&&!ally(e.team,id)&&!e.isB&&e.s.dom==='ground'&&Math.hypot(e.x-b.x,e.y-b.y)<300)){pick=b;break;}
    if(!pick&&T.tun.every(u=>u.hp>=u.max*.9))pick=tns.sort((p,q)=>(pb.length?Math.min(...pb.map(e=>dist(e,p)))-Math.min(...pb.map(e=>dist(e,q))):0))[0];
    if(pick&&T.tun.length)unloadTunnel(pick);}
  if(T.charge>=T.sup.charge&&working(id,'uplink')){const c=aiCluster(en);if(c)launch(id,c.x,c.y);}}

// Realistic defeat. A nation doesn't have to lose every last truck - it capitulates when its war-fighting capacity
// is gone. Checked every second against the most it ever had:
//  - collapse: 90% of its base (by value) destroyed AND its army is down to a handful (4 or fewer combat units, or
//    under 12% of its largest army) -> 30 s warning, then it capitulates unless it recovers in time;
//  - cut off: no buildings and no bulldozer left to rebuild -> its remaining army has 45 s before it surrenders;
//  - wiped out: nothing left at all -> immediately.
// The warning goes to everyone so the attacker knows to keep up the pressure and the defender knows to rebuild.
function forceOf(T){let bv=0,bn=0,uv=0,un=0,dz=0;for(const e of G.ents){if(e.dead||e.team!==T.id)continue;
    if(e.isB){if(e.kind==='garrison'||e.built<1)continue;bv+=e.kind==='hq'?2000:Math.max(300,e.s.cost||0);bn++;}
    else if(e.kind==='dozer')dz++;else if(!e.s.noAttack&&e.kind!=='harv'&&e.kind!=='hacker'&&!e.aband){uv+=e.s.cost||300;un++;}}
  for(const u of T.tun||[])if(!u.dead){uv+=u.s.cost||300;un++;}
  if(G.civ)for(const c of G.civ)if(!c.dead&&c.occ)for(const u of c.occ)if(!u.dead&&u.team===T.id){uv+=u.s.cost||300;un++;}
  return{bv,bn,uv,un,dz};}
function capitulate(T,why){T.out=true;T.whyOut=why;for(const O of G.teams)log(O.id,O.id===T.id?`We have capitulated: ${why}`:`${T.F.name} has capitulated - ${why}`,O.id===T.id?'bad':'w');
  for(const e of G.ents)if(!e.dead&&e.team===T.id&&e.kind!=='garrison'){if(e.isB)kill(e,null);else{e.dead=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),0,e.team]);}}
  if(T.tun)for(const u of T.tun)u.dead=true;if(G.civ)for(const c of G.civ)if(c.occ&&c.occ.some(u=>u.team===T.id)){for(const u of c.occ)if(u.team===T.id)u.dead=true;c.occ=c.occ.filter(u=>!u.dead);}FXE('elim',[T.id]);G.lastWhy=why;}
function checkEnd(){if(G.sandbox)return;
  for(const T of G.teams){if(T.out)continue;const F=forceOf(T);T.pkB=Math.max(T.pkB||0,F.bv);T.pkU=Math.max(T.pkU||0,F.uv);
    if(!F.bn&&!F.dz&&!F.un){capitulate(T,'every unit and building has been destroyed.');continue;}
    const baseGone=(T.pkB||0)>=2000&&F.bv<=T.pkB*.1,armyGone=F.un<=4||F.uv<=(T.pkU||0)*.12;
    let cond=null,limit=0;if(!F.bn&&!F.dz){cond=`no base left and no way to rebuild - its last ${F.un} unit${F.un===1?'':'s'} ran out of supplies.`;limit=45;}
    else if(baseGone&&armyGone){cond=`${Math.round(100-F.bv/T.pkB*100)}% of its base destroyed and only ${F.un} combat unit${F.un===1?'':'s'} left.`;limit=30;}
    if(cond){if(T.colT==null){T.colT=G.t;for(const O of G.teams)log(O.id,O.id===T.id?(F.bn||F.dz?`Our nation is collapsing! 90% of our base is destroyed and our army is nearly gone - rebuild and reinforce within ${limit} seconds or we capitulate.`:`We have lost every building and bulldozer! Our army will surrender in ${limit} seconds.`):`${T.F.name} is collapsing and will capitulate in ${limit} seconds unless it recovers.`,O.id===T.id?'bad':'w');}
      else{const left=limit-(G.t-T.colT);if(T.id===ME&&left>0&&left<=10&&Math.abs(left-Math.round(left/5)*5)<.6&&T.colW!==Math.round(left)){T.colW=Math.round(left);log(T.id,`Capitulation in ${Math.round(left)} seconds!`,'bad');}if(left<=0)capitulate(T,cond);}}
    else if(T.colT!=null){T.colT=null;T.colW=null;for(const O of G.teams)log(O.id,O.id===T.id?'We have recovered - the collapse is averted.':`${T.F.name} has recovered from the brink.`,O.id===T.id?'g':'w');}}
  const alive=G.teams.filter(T=>!T.out).map(T=>T.id);
  if(alive.length<=1||alive.every(t=>ally(t,alive[0])))endGame(alive.length?alive[0]:-1,G.lastWhy?`The last enemy capitulated: ${G.lastWhy}`:'');}

function specialTick(u,dt,o){const s=u.s;u.spT=(u.spT||0)-dt;if(u.spT>0)return;u.spT=1.2;
  if(s.markAura){for(const e of G.ents)if(!e.dead&&!e.isB&&!ally(e.team,u.team)&&seenBy(u.team,e)&&Math.hypot(e.x-u.x,e.y-u.y)<s.markAura)e.mark=G.t+3;}
  if(s.mines&&!o&&!u.target&&G.t-(u.mineT||-9)>5&&G.t-u.lastHit>3){const mine=G.mines.filter(m=>m.team===u.team);if(mine.length<8&&!G.mines.some(m=>Math.hypot(m.x-u.x,m.y-u.y)<30)){u.mineT=G.t;G.mines.push({x:u.x|0,y:u.y|0,team:u.team,arm:G.t+2});}}}
function updMines(){for(const m of G.mines){if(m.arm>G.t)continue;for(const e of G.ents){if(e.dead||e.isB||ally(e.team,m.team)||e.s.dom!=='ground'||!isVeh(e.s))continue;if(Math.abs(e.x-m.x)<22&&Math.hypot(e.x-m.x,e.y-m.y)<22){m.done=true;explode(m.x,m.y,40,260,m.team,'at');FXE('txt',[m.x,m.y,'MINE',m.team,e.team]);break;}}}if(G.mines.some(m=>m.done))G.mines=G.mines.filter(m=>!m.done);}
const TUN_CAP=12;
// what is waiting in a team's tunnel network, by unit type (shown on every tunnel entrance)
function tunKinds(T){const o={};for(const u of T.tun||[])o[u.kind]=(o[u.kind]||0)+1;return o;}
// ---- transports ----
function canBoard(tr,u){return u.team===tr.team&&!u.dead&&u.s.dom==='ground'&&u.kind!=='harv'&&u.kind!=='dozer'&&(isInf(u.s)||(tr.s.carryVeh&&isVeh(u.s)));}
function cargoLoad(tr){return (tr.cargo||[]).reduce((a,u)=>a+(isInf(u.s)?1:3),0);}
function boardTransport(u,tr){const need=isInf(u.s)?1:3;if(cargoLoad(tr)+need>tr.s.cap){u.order=null;log(u.team,`The ${tr.s.name} is full.`,'w');return;}
  u.order=null;u.target=null;u.inTun=true;u.trn=tr.id;G.byId.delete(u.id);(tr.cargo=tr.cargo||[]).push(u);}
function unloadTransport(tr){const C=tr.cargo||[];if(!C.length)return;const dom='ground';let placed=0;
  for(let i=0;i<C.length;i++){const u=C[i];let p=null;for(const rr of [tr.r+16,tr.r+40,tr.r+70,tr.r+110,tr.r+160]){for(let k=0;k<10&&!p;k++){const a=(i*1.7+k*.63);const x=tr.x+Math.cos(a)*rr,y=tr.y+Math.sin(a)*rr;if(passXY(dom,x,y))p=[x,y];}if(p)break;}
    if(!p)continue;u.x=p[0];u.y=p[1];u.inTun=false;u.trn=0;u.mv=G.t;u.order=null;G.ents.push(u);G.byId.set(u.id,u);C[i]=null;placed++;}
  tr.cargo=C.filter(Boolean);if(placed)log(tr.team,`${placed} unit${placed>1?'s':''} unloaded.`,'g');if(tr.cargo.length)log(tr.team,'Move closer to land to unload the rest.','w');}
function enterTunnel(u){const T=G.teams[u.team];if(T.tun.length>=TUN_CAP){u.order=null;log(u.team,'The tunnel network is full (12 units).','w');return;}u.order=null;u.target=null;u.inTun=true;G.byId.delete(u.id);T.tun.push(u);}
function unloadTunnel(b){const T=G.teams[b.team];const n=T.tun.length;if(!n)return;T.tun.forEach((u,i)=>{const a=i/n*6.283+Math.random()*.3,r=b.size/2+22+(i%3)*16;const p=nearestPassXY('ground',b.x+Math.cos(a)*r,b.y+Math.sin(a)*r)||[b.x,b.y];u.x=p[0];u.y=p[1];u.inTun=false;u.mv=G.t;G.ents.push(u);G.byId.set(u.id,u);});
  T.tun=[];log(b.team,`${n} unit${n>1?'s':''} came out of the tunnel.`,'g');}
function wxNow(){return WEATHER[(G&&G.wx&&G.wx.k)||'clear']||WEATHER.clear;}
function weatherTick(dt){if(!G.wx)G.wx={k:'clear',t:0,next:150+Math.random()*90};const W=G.wx;W.t+=dt;if(W.t<W.next)return;W.t=0;const ks=weatherKinds(G.map.theme);
  if(W.k==='clear'){W.k=ks[1+Math.floor(Math.random()*(ks.length-1))];W.next=55+Math.random()*45;}else{W.k='clear';W.next=170+Math.random()*120;}
  for(const T of G.teams){const w=WEATHER[W.k];log(T.id,W.k==='clear'?'The weather is clearing.':`Weather: ${w.name}. ${w.tip}`,'w');}}
function simUpdate(dt){G.t+=dt;if(!G.sandbox)weatherTick(dt);if(G.sandbox)sandboxTick(dt);production(dt);buildHash();if(!G.mines)G.mines=[];
  if(!G.aur)G.aur={morale:[],rof:[],heal:[],raid:[],dome:[],jam:[]};for(const k in G.aur)G.aur[k].length=0;G.cbrTeams=0;for(const e of G.ents){if(e.dead||e.isB)continue;const s=e.s;if(s.aura)G.aur[s.aura.t].push({team:e.team,x:e.x,y:e.y,r:s.aura.r,v:s.aura.v,id:e.id});if(s.intercept)G.aur.dome.push({team:e.team,x:e.x,y:e.y,r:s.intercept});if(s.jam)G.aur.jam.push({team:e.team,x:e.x,y:e.y,r:s.jam});if(s.cbr)G.cbrTeams|=1<<e.team;}
  if(G.aur.heal.length)for(const e of G.ents){if(e.dead||e.isB||e.hp>=e.max||e.s.dom==='air')continue;for(const a of G.aur.heal)if(a.team===e.team&&Math.hypot(a.x-e.x,a.y-e.y)<a.r){e.hp=Math.min(e.max,e.hp+a.v*dt);break;}}
  if(G.aur.jam.length)for(const e of G.ents){if(e.dead||e.kind!=='drone')continue;for(const a of G.aur.jam)if(!ally(a.team,e.team)&&Math.hypot(a.x-e.x,a.y-e.y)<a.r){applyDmg(e,30*dt,'flak',a.team,null);break;}}
  G.mT=(G.mT||0)-dt;if(G.mT<=0){G.mT=.2;updMines();}
  for(const T of G.teams){if(!T.tun.length)continue;for(const u of T.tun)u.hp=Math.min(u.max,u.hp+12*dt);if(!G.ents.some(e=>e.isB&&e.team===T.id&&e.kind==='tunnel'&&!e.dead&&e.built>=1)){log(T.id,`Our last tunnel was destroyed. ${T.tun.length} units inside were lost.`,'w');T.tun=[];}}
  for(const T of G.teams){if(working(T.id,'uplink'))T.charge=Math.min(T.sup.charge,T.charge+dt);for(const k in T.pw)if(T.pw[k].cd>0)T.pw[k].cd=Math.max(0,T.pw[k].cd-dt);
    for(const r of T.reveals)r.t-=dt;T.reveals=T.reveals.filter(r=>r.t>0);}
  for(const tm of G.timers){tm.t-=dt;if(tm.t<=0){tm.done=true;tm.fn();}}{let j=0;for(const t of G.timers)if(!t.done)G.timers[j++]=t;G.timers.length=j;}
  const n=G.ents.length;for(let i=0;i<n;i++){const e=G.ents[i];if(e.dead)continue;if(e.isB)updBld(e,dt);else{if(e.kind!=='jet'){e.va=lerpA(e.va,e.ang,dt*7);const tt=e.target&&!e.target.dead?Math.atan2(e.target.y-e.y,e.target.x-e.x):(e.order&&e.order.target&&!e.order.target.dead?Math.atan2(e.order.target.y-e.y,e.order.target.x-e.x):e.va);e.tang=lerpA(e.tang,tt,dt*8);}updUnit(e,dt);if(e.v&&e.vt!==G.t){const M=MOVE[e.s.cls]||[4,80];e.v=Math.max(0,e.v-M[1]*2.5*dt);if(e.v>1&&e.s.dom!=='air'&&e.kind!=='jet'){const nx=e.x+Math.cos(e.hd)*e.v*dt,ny=e.y+Math.sin(e.hd)*e.v*dt;if(passXY(e.s.dom,nx,ny)){e.x=nx;e.y=ny;e.mv=G.t;}}}}}
  updProj(dt);updStrikes(dt);separate();updOil(dt);
  {const E=G.ents;let j=0;for(let i=0;i<E.length;i++){const e=E[i];if(!e.dead&&!e.inTun)E[j++]=e;}E.length=j;}
  for(const T of G.teams)T.clr=false;for(const e of G.ents)if(e.kind==='cleric')G.teams[e.team].clr=true;
  for(const T of G.teams)if(T.ai&&!T.out){if(!G.aiTT)G.aiTT=G.teams.map((_,i)=>i*.13);G.aiTT[T.id]-=dt;if(G.aiTT[T.id]<=0){G.aiTT[T.id]=DIFF[T.ai.d??1].think;aiThink(T);}}
  G.visT-=dt;if(G.visT<=0){G.visT=.2;updateVis();}
  G.endT-=dt;if(G.endT<=0){G.endT=1;checkEnd();}}
function separate(){const groups=SEP_G;groups.ground.length=groups.naval.length=groups.air.length=0;for(const e of G.ents)if(!e.isB&&!e.dead&&!e.landed&&e.kind!=='jet')groups[e.s.dom].push(e);const BC=160,BW=Math.ceil(MAPW/BC)+2,BG=G.bg||(G.bg=new Map());for(const L of BG.values())L.length=0;for(const b of G.ents){if(!b.isB||b.dead)continue;const r=b.size/2+20,x0=Math.floor((b.x-r)/BC)+1,x1=Math.floor((b.x+r)/BC)+1,y0=Math.floor((b.y-r)/BC)+1,y1=Math.floor((b.y+r)/BC)+1;for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const k=xx+yy*BW,L=BG.get(k);if(L)L.push(b);else BG.set(k,[b]);}}
  for(const dom in groups){const U=groups[dom],k=dom==='air'?.3:.5;for(let i=0;i<U.length;i++){const a=U[i];a.px=a.x;a.py=a.y;}
    const SG=G.sg||(G.sg=new Map()),SC=64,SW=Math.ceil(MAPW/SC)+2;for(const L of SG.values())L.length=0;for(let i=0;i<U.length;i++){const a=U[i];a.si=i;const k=Math.floor(a.x/SC)+1+(Math.floor(a.y/SC)+1)*SW;const L=SG.get(k);if(L)L.push(a);else SG.set(k,[a]);}
    for(let i=0;i<U.length;i++){const a=U[i];const cx=Math.floor(a.x/SC)+1,cy=Math.floor(a.y/SC)+1;for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){const L=SG.get(xx+yy*SW);if(!L)continue;for(const b of L){if(b.si<=i)continue;const dx=b.x-a.x,dy=b.y-a.y,m=a.r+b.r;if(Math.abs(dx)>m||Math.abs(dy)>m)continue;const d=Math.hypot(dx,dy)||.01;if(d<m){const p=(m-d)*k*2,nx=dx/d,ny=dy/d,ma=massOf(a),mb=massOf(b),wa=mb/(ma+mb),wb=ma/(ma+mb);a.x-=nx*p*wa;a.y-=ny*p*wa;b.x+=nx*p*wb;b.y+=ny*p*wb;
          if(dom==='ground'&&(ma>=10||mb>=10)&&!ally(a.team,b.team)){const V=ma>=10?a:b,I=V===a?b:a;if(massOf(I)<2&&(V.v||0)>22&&!I.dead&&!I.inTun)applyDmg(I,I.max*3,'boom',V.team,V,0);}}}}
      if(dom==='ground')for(const b of (BG.get(Math.floor(a.x/BC)+1+(Math.floor(a.y/BC)+1)*BW)||[])){const h=b.size/2+a.r,dx=a.x-b.x,dy=a.y-b.y;if(Math.abs(dx)<h&&Math.abs(dy)<h){const px=h-Math.abs(dx),py=h-Math.abs(dy);if(px<py)a.x+=Math.sign(dx||1)*px;else a.y+=Math.sign(dy||1)*py;}}}
    if(dom!=='air')for(const a of U){if(!passXY(dom,a.x,a.y)){a.x=a.px;a.y=a.py;}}}
  for(const e of G.ents){if(e.kind==='jet')continue;e.x=Math.max(10,Math.min(MAPW-10,e.x));e.y=Math.max(10,Math.min(MAPH-10,e.y));}}

/* ---------- oil derricks (capture with infantry, Generals-style) ---------- */

/* ---------- oil derricks: capturable, and destructible ---------- */
const OIL_HP=1500;
/* ---------- City buildings: infantry can garrison them; any of them can be shot or shelled down ----------
   Each street-grid lot is one building. Up to 4-10 infantry (more in taller blocks) move in: they are safe inside
   and fire out at 20% longer range, while the building soaks up the damage. Rifles barely scratch it; shells,
   rockets, bombs and tank guns bring it down - and anyone inside is thrown out hurt. Rubble is passable. */
function initCiv(){const M=G.map;G.civ=[];G.civAt=new Map();(M.cityBlds||[]).forEach((b,i)=>{const k=Math.floor(b.y/CELL)*GW+Math.floor(b.x/CELL);let c=G.civAt.get(k);
    if(!c){c={i:G.civ.length,k,x:(k%GW)*CELL+CELL/2,y:Math.floor(k/GW)*CELL+CELL/2,b:[],h:0,dead:false,occ:[],g:null};G.civAt.set(k,c);G.civ.push(c);}c.b.push(i);c.h=Math.max(c.h,b.h);});
  for(const c of G.civ){c.max=c.hp=Math.round(600+c.h*16);c.cap=Math.min(10,4+Math.floor(c.h/18));}
  // ruined farmhouses in the countryside: low walls that 5 infantry can hold
  const R=mulberry((G.seed||1)*29+5),want=3+Math.round(2*WK);G.ruins=[];
  const ok=(x,y)=>{if(x<160||y<160||x>MAPW-160||y>MAPH-160)return false;if(Math.abs(M.depth(x,y))<M.hw(x)+120||M.mtn(x,y)>-60)return false;if(BASES.some(([bx,by])=>Math.hypot(x-bx,y-by)<560))return false;if(G.fields.some(f=>Math.hypot(f.x-x,f.y-y)<f.r+130))return false;if(G.oil.some(o=>Math.hypot(o.x-x,o.y-y)<150))return false;if(M.cityNear(x,y,90))return false;if(G.ruins.some(q=>Math.hypot(q.x-x,q.y-y)<500))return false;const k=Math.floor(y/CELL)*GW+Math.floor(x/CELL);return G.grid[k]===0;};
  for(let t=0;t<600&&G.ruins.length<want;t++){const x=R()*MAPW,y=R()*MAPH;if(!ok(x,y))continue;const c={i:G.civ.length,k:Math.floor(y/CELL)*GW+Math.floor(x/CELL),x,y,b:[],h:10,ruin:true,rot:R()*6.28,dead:false,occ:[],g:null,max:900,hp:900,cap:5};G.civ.push(c);G.ruins.push(c);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const kk=c.k+dy*GW+dx;if(!G.civAt.has(kk))G.civAt.set(kk,c);}}}
function civAtXY(x,y){if(!G.civAt)return null;const c=G.civAt.get(Math.floor(y/CELL)*GW+Math.floor(x/CELL));return c&&!c.dead?c:null;}
function canGarrison(u){return !u.isB&&!u.dead&&isInf(u.s)&&!u.s.noAttack&&u.kind!=='hacker'&&u.kind!=='harv'&&u.kind!=='dozer';}
function civTarget(c){const ALL=new Array(16).fill(true);return c.tg||(c.tg={civ:c,isB:true,kind:'civb',x:c.x,y:c.y,r:16,size:32,team:-1,vs:ALL,s:{name:'City building',armor:'bld'},get dead(){return c.dead||!!c.g;},get hp(){return c.hp;},get max(){return c.max;}});}
function damageCiv(c,d,team){if(c.dead||d<=0||c.g)return;c.hp-=d;c.hit=G.t;if(c.hp<=0)collapseCiv(c,team);}
function collapseCiv(c,team){if(c.dead)return;c.dead=true;c.hp=0;if(G.grid[c.k]===3){G.grid[c.k]=0;G.gridV=(G.gridV|0)+1;}if(G.cover)G.cover[c.k]=Math.min(255,(G.cover[c.k]||0)+2);G.civDirty=true;
  const g=c.g;c.g=null;const occ=c.occ;c.occ=[];occ.forEach((u,i)=>{const a=i/Math.max(1,occ.length)*6.283;const p=nearestPassXY('ground',c.x+Math.cos(a)*30,c.y+Math.sin(a)*30)||[c.x,c.y];u.x=p[0];u.y=p[1];u.inTun=false;u.inGar=null;u.mv=G.t;u.order=null;u.target=null;u.hp*=.6;u.fear=(u.fear||0)+.5;G.ents.push(u);G.byId.set(u.id,u);});
  if(g&&!g.dead){g.dead=true;G.byId.delete(g.id);}FXE('civd',[c.i]);if(occ.length)log(occ[0].team,`A building we held collapsed - ${occ.length} soldier${occ.length>1?'s':''} thrown clear.`,'w');}
function enterGarrison(u,c){if(c.dead){u.order=null;return;}if(c.g&&!ally(c.g.team,u.team)){u.order=null;return;}if(c.occ.length>=c.cap){u.order=null;log(u.team,`That building is full (${c.cap} troops).`,'w');return;}
  if(!c.g){const T=G.teams[u.team],s=bstats(T.fac,'garrison');const g={id:G.nid++,isB:true,team:u.team,kind:'garrison',s,civ:c,x:c.x,y:c.y,size:s.size,r:s.size/2,max:c.max,hp:c.hp,built:1,cd:0,target:null,ang:0,lastHit:-99,dis:0,vs:new Array(G.teams.length).fill(false)};G.ents.push(g);G.byId.set(g.id,g);c.g=g;}
  u.order=null;u.target=null;u.guard=null;u.inTun=true;u.inGar=c;u.x=c.x;u.y=c.y;G.byId.delete(u.id);c.occ.push(u);}
function leaveGarrison(c){const g=c.g;if(!g)return;const occ=c.occ;c.occ=[];occ.forEach((u,i)=>{const a=i/Math.max(1,occ.length)*6.283;const p=nearestPassXY('ground',c.x+Math.cos(a)*30,c.y+Math.sin(a)*30)||[c.x,c.y];u.x=p[0];u.y=p[1];u.inTun=false;u.inGar=null;u.mv=G.t;u.order=null;G.ents.push(u);G.byId.set(u.id,u);});
  c.hp=Math.max(1,g.hp);g.dead=true;G.byId.delete(g.id);c.g=null;}
// the soldiers inside shoot from the windows
function updGarrison(g,dt){const c=g.civ;if(!c||c.dead){g.dead=true;return;}c.hp=g.hp;if(!c.occ.length){leaveGarrison(c);return;}
  for(const u of c.occ){u.x=c.x;u.y=c.y;u.cd-=dt;u.hp=Math.min(u.max,u.hp+2*dt);u.fear=Math.max(0,(u.fear||0)-dt*.1);if(u.cd>0)continue;const R=u.s.rng*1.2;
    let t=u.target&&!u.target.dead&&Math.hypot(u.target.x-c.x,u.target.y-c.y)<R+u.target.r&&seenBy(u.team,u.target)?u.target:null;if(!t){t=nearestEnemy(u,R);u.target=t;}
    if(t){fire(u,t,u.s.dmg*dmgOut(u),u.s.wpn,u.s.splash||0);u.cd=u.s.rof*rofMult(u);g.lastFire=G.t;}}}
function oilTarget(o){const ALL=new Array(16).fill(true);return{oil:o,isB:true,kind:'derrick',x:o.x,y:o.y,r:18,size:36,team:-1,vs:ALL,s:{name:'Oil derrick',armor:'bld'},get dead(){return o.dead;},get hp(){return o.hp;},get max(){return o.max;}};}
function damageOil(o,d,team){if(o.dead||d<=0)return;if(team!=null&&ally(team,o.owner))return;o.hp-=d;o.hit=G.t;if(o.hp<=0)destroyOil(o,team);}
function destroyOil(o,team){const prev=o.owner;o.dead=true;o.hp=0;o.owner=-1;o.cp=o.cp.map(()=>0);o.burn=45;o.rep=0;
  FXE('boom',[o.x|0,o.y|0,30,1]);FXE('boom',[(o.x+14)|0,(o.y-6)|0,18,0]);
  if(team!=null&&team>=0)log(team,'Oil derrick destroyed.','g');if(prev>=0&&prev!==team)log(prev,'One of our oil derricks was destroyed!','w');}
const OILNB=[];let OIL_HERE=[];
function updOil(dt){const N=G.teams.length;const here=OIL_HERE.length===N?OIL_HERE:(OIL_HERE=new Array(N).fill(0));for(const o of G.oil){if(o.cp.length!==N)o.cp=new Array(N).fill(0);here.fill(0);for(const e of (G.hash?nearby(o.x,o.y,70,OILNB):G.ents)){if(e.dead||e.isB||e.s.dom!=='ground'||e.kind==='harv')continue;if(Math.abs(e.x-o.x)<60&&Math.abs(e.y-o.y)<60&&Math.hypot(e.x-o.x,e.y-o.y)<60)here[e.team]++;}
  const present=[];for(let t=0;t<N;t++)if(here[t])present.push(t);
  if(o.dead){o.burn=Math.max(0,o.burn-dt);if(present.length&&present.every(q=>ally(q,present[0]))){const t=present[0];o.cp[t]+=dt;if(o.cp[t]>=12){o.dead=false;o.hp=o.max*.4;o.owner=t;o.cp=o.cp.map(()=>0);log(t,'Oil derrick repaired and captured.','g');}}else for(let t=0;t<N;t++)if(!here[t])o.cp[t]=Math.max(0,o.cp[t]-dt*.5);continue;}
  for(let t=0;t<N;t++){if(here[t]&&present.every(q=>ally(q,t))&&!ally(o.owner,t)){o.cp[t]+=dt;if(o.cp[t]>=6){const prev=o.owner;o.owner=t;o.cp=o.cp.map(()=>0);log(t,'Oil derrick captured.','g');if(prev>=0&&prev!==t)log(prev,'An oil derrick was captured by the enemy!','w');}}else if(!here[t])o.cp[t]=Math.max(0,o.cp[t]-dt*.5);}
  if(o.hp<o.max&&G.t-(o.hit??-99)>8)o.hp=Math.min(o.max,o.hp+o.max*.01*dt);
  if(o.owner>=0){o.inc+=dt;if(o.inc>=2){o.inc=0;const T=G.teams[o.owner];T.credits+=Math.round(14*(T.F.mods.oil||1)*(G.bs||1));}}}
  econTick(dt);}
// income buildings pay every 2 seconds; a team's extra ones earn less each
function econTick(dt){G.ecT=(G.ecT||0)+dt;if(G.ecT<2)return;G.ecT-=2;const per={};for(const b of G.ents){if(b.dead||!b.isB||b.kind!=='econ'||b.built<1)continue;const k=per[b.team]=(per[b.team]||0)+1;const T=G.teams[b.team];if(T.dummy)continue;
  const v=b.s.inc*2*(ECON_RATE[k-1]||0)*((b.dis||0)>G.t?0:1);b.acc=(b.acc||0)+v;const w=Math.floor(b.acc);if(w>0){b.acc-=w;T.credits+=w;}}}

/* ---------- Test Range: unlimited money, everything unlocked and fast to build, and a passive target enemy ---------- */
function sbSpot(team,kind,anchor,r0,r1){for(let k=0;k<160;k++){const a=rnd(0,6.28),r=rnd(r0,r1),x=anchor.x+Math.cos(a)*r,y=anchor.y+Math.sin(a)*r;if(validSpot(team,kind,x,y))return[x,y];}return null;}
function sandboxSetup(){const P=G.teams[0],D=G.teams[1];P.credits=999999;P.gxp=RANKS[RANKS.length-1];promoteGeneral(P);D.dummy=true;D.fight=false;D.ai=null;
  const hq=G.ents.find(e=>e.team===0&&e.kind==='hq');for(const k of ['barracks','factory','airfield','shipyard']){if(!bldAllowed(P.fac,k))continue;const p=STRUCT[k].shore?sbSpot(0,k,hq,150,900):sbSpot(0,k,hq,170,420);if(p)addBld(0,k,p[0],p[1],true);}
  for(let i=0;i<2;i++)addUnit(0,'dozer',hq.x+rnd(-80,80),hq.y+rnd(-80,80));
  const dh=G.ents.find(e=>e.team===1&&e.kind==='hq');for(const k of ['barracks','factory','turret','sam']){const p=sbSpot(1,k,dh,170,380);if(p)addBld(1,k,p[0],p[1],true);}
  sandboxTargets();P.reveals.push({x:MAPW/2,y:MAPH/2,r:9999,t:1e12});log(0,'TEST RANGE: unlimited money, everything unlocked, builds 6x faster. The enemy does not fight back unless you switch it on.','g');}
function sandboxTargets(){const dh=G.ents.find(e=>e.team===1&&e.isB&&!e.dead)||{x:BASES[1][0],y:BASES[1][1]};const a=Math.atan2(MAPH/2-dh.y,MAPW/2-dh.x);
  const cx=dh.x+Math.cos(a)*330,cy=dh.y+Math.sin(a)*330;const put=(k,n)=>{for(let i=0;i<n;i++){const p=nearestPassXY(stats(G.teams[1].fac,k).dom,cx+rnd(-150,150),cy+rnd(-150,150));if(p){const u=addUnit(1,k,p[0],p[1]);u.ang=u.va=u.hd=a+Math.PI;}}};
  put('inf',6);put('at',2);put('tank',3);put('aa',1);put('arty',1);put('heli',1);if(G.map.hasWater){const w=nearestPassXY('naval',cx,cy);if(w){const u=addUnit(1,'boat',w[0],w[1]);}}
  if(!G.ents.some(e=>e.team===1&&e.kind==='hq'&&!e.dead)){const p=sbSpot(1,'hq',{x:BASES[1][0],y:BASES[1][1]},0,200);if(p)addBld(1,'hq',p[0],p[1],true);}}
function sandboxTick(dt){const P=G.teams[0];if(P.credits<900000)P.credits=999999;for(const k in P.pw)if(P.pw[k].cd>0)P.pw[k].cd=0;if(working(0,'uplink'))P.charge=P.sup.charge;
  const left=G.ents.filter(e=>e.team===1&&!e.dead&&!e.isB).length;if(left===0){G.sbT=(G.sbT||0)+dt;if(G.sbT>4){G.sbT=0;sandboxTargets();log(0,'New targets have arrived.','g');}}else G.sbT=0;}

let BORDER_TEX=null;
/* ================= 3D ENGINE: renderer, terrain, water, models ================= */
const cv=$('cv'),hud=$('hud'),hx=hud.getContext('2d'),mm=$('mm'),mx=mm.getContext('2d');
let HEMI=null,SUNOFF=[-900,780,-620],R3=null,SCN=null,CAM=null,SUN=null,VW=800,VH=600,dpr=1;
const WL=-4;let LAMPM=null; // water level
const cam={x:600,y:1500,z:1,dist:560,yaw:0};
const TMP=new THREE.Vector3(),TMPM=new THREE.Matrix4(),TMPQ=new THREE.Quaternion(),RAY=new THREE.Raycaster(),GPLANE=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const lin=hex=>new THREE.Color(hex).convertSRGBToLinear();
function initGfx(){
  R3=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
// One object that cannot be drawn must never stop the whole frame (that froze the picture while the battle went on):
// skip it, hide it and keep drawing everything else.
{const rbd=R3.renderBufferDirect.bind(R3);let nErr=0;R3.renderBufferDirect=function(cam,scene,geo,mat,obj,grp){try{return rbd(cam,scene,geo,mat,obj,grp);}catch(e){if(obj)obj.visible=false;if(nErr++<5){let q=obj,path=[];while(q&&path.length<6){path.push((q.name||'')+':'+q.type);q=q.parent;}console.warn('skipped an object that failed to draw: '+(e&&e.message)+' | '+(mat&&mat.type)+' '+(mat&&mat.name||'')+' map='+!!(mat&&mat.map)+' env='+!!(mat&&mat.envMap)+' ud='+Object.keys((mat&&mat.userData)||{}).join('/')+' | '+path.join(' < '));}}};}
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();window.GLLOST=1;try{pushLog('Graphics were reset by the browser; restoring…','w');}catch(_){}},false);
  cv.addEventListener('webglcontextrestored',()=>{window.GLLOST=0;try{for(const o of OBJ.values())SCN.remove(o);OBJ.clear();for(const k in GEO)delete GEO[k];if(G&&G.terrain)buildWorld();}catch(err){console.warn(err);}},false);
  R3.outputEncoding=THREE.sRGBEncoding;R3.toneMapping=THREE.NoToneMapping;R3.shadowMap.enabled=true;R3.shadowMap.type=THREE.PCFSoftShadowMap;R3.autoClear=true;
  SCN=new THREE.Scene();SCN.background=lin('#c7b493');SCN.fog=new THREE.Fog(lin('#8f8a70'),1800,6200);
  window.SKY=new THREE.Mesh(new THREE.SphereGeometry(7600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{t:{value:0}},
    vertexShader:`varying vec3 vd;void main(){vd=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;varying vec3 vd;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){float y=max(vd.y,0.);vec3 hor=vec3(.86,.78,.64),zen=vec3(.30,.50,.80);vec3 c=mix(hor,zen,pow(y,.55));
        vec2 uv=vd.xz/(vd.y+.18)*1.6+vec2(t*.004,0.);float cl=n(uv)*.5+n(uv*2.1)*.3+n(uv*4.7)*.2;cl=smoothstep(.5,.78,cl)*smoothstep(.0,.25,y);c=mix(c,vec3(.97,.96,.93),cl*.85);c=mix(c,hor*.92,smoothstep(.12,0.,y));
        gl_FragColor=vec4(pow(c,vec3(2.2))*1.6,1.);}`}));SKY.renderOrder=-10;SKY.frustumCulled=false;SCN.add(SKY);
  CAM=new THREE.PerspectiveCamera(38,1,40,9000);
  HEMI=new THREE.HemisphereLight(lin('#b4cbef'),lin('#4d3f2c'),1.0);SCN.add(HEMI);
  SUN=new THREE.DirectionalLight(lin('#ffe2bd'),2.7);SUN.castShadow=true;const sm=2048;SUN.shadow.mapSize.set(sm,sm);SUN.shadow.radius=2;const sc=SUN.shadow.camera;sc.left=-900;sc.right=900;sc.top=900;sc.bottom=-900;sc.near=10;sc.far=3000;SUN.shadow.bias=-.0012;SUN.shadow.normalBias=1.4;
  SCN.add(SUN);SCN.add(SUN.target);
  initFX();initPost();
}
// Ground height is sampled once onto a 10-unit grid after the map is painted, then read back bilinearly: the full
// formula (shoreline, base pads, mesas, roads, mountains) is far too slow to evaluate thousands of times a frame.
function groundH(x,y){const H=G&&G.hgrid;if(!H)return groundH0(x,y);const fx=Math.max(0,Math.min(H.w-1.001,x/H.R)),fy=Math.max(0,Math.min(H.h-1.001,y/H.R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*H.w+i,a=H.a;
  return (a[k]*(1-tx)+a[k+1]*tx)*(1-ty)+(a[k+H.w]*(1-tx)+a[k+H.w+1]*tx)*ty;}
function buildHGrid(){const R=10,w=Math.ceil(MAPW/R)+2,h=Math.ceil(MAPH/R)+2,a=new Float32Array(w*h);G.hgrid=null;for(let j=0;j<h;j++)for(let i=0;i<w;i++)a[j*w+i]=groundH0(i*R,j*R);G.hgrid={a,w,h,R};}
function groundH0(x,y){if(!G||!G.map)return 0;const M=G.map,ed=-M.edge(x,y);
  let h=0;if(ed<50){const k=Math.max(0,Math.min(1,(ed+30)/80));h=-18+18*k*k*(3-2*k);}
  const far=Math.max(0,Math.min(1,(ed-90)/260));let bf=1;for(const [bx,by] of BASES){bf=Math.min(bf,Math.max(0,Math.min(1,(Math.hypot(x-bx,y-by)-330)/250)));}
  h+=far*bf*(5+7*Math.sin(x*.0042+1.3)*Math.cos(y*.0051+.4)+4*Math.sin(x*.011+y*.007));
  {const rm=G.roadMask;let onR=0;if(rm){const i=(y/rm.C|0)*rm.w+(x/rm.C|0);onR=rm.f?rm.f[i]||0:(rm.d[i]?1:0);}const n1=Math.sin(x*.0031+y*.0017+.7)*Math.cos(y*.0043-x*.0012+2.1),rr=1-Math.pow(Math.abs(Math.sin(x*.009+y*.004+n1*2.4)),1.8);let mask=Math.max(0,Math.min(1,(n1+.25)*2.4));for(const q of (G.map.oil||[]))mask*=Math.max(0,Math.min(1,(Math.hypot(x-q.x,y-q.y)-70)/90));for(const q of (G.map.fields||[]))mask*=Math.max(0,Math.min(1,(Math.hypot(x-q.x,y-q.y)-q.r-50)/90));const sm=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};const n2=.5+.5*Math.sin(x*.021+y*.013)*Math.cos(x*.011-y*.019);const e=rr*(.75+.25*n2);
  const mesa=(sm(.2,.9,e)*13+sm(.55,1.05,e)*5)*(M.rough||1);const cap=sm(.4,.75,e)*.6*(Math.sin(x*.07+y*.05)*1.5+Math.sin(x*.13-y*.09));const gate=sm(.5,.8,far*bf*mask);h+=gate*(1-onR)*(mesa+cap+sm(.3,.5,e)*5);}if(ed>=50)h=Math.max(h,-1);if(M.hasMtn){const m=M.mf(x,y);if(m>-90){const k=Math.max(0,Math.min(1,(m+90)/130)),sk=k*k*(3-2*k);const nn=.82+.12*Math.sin(x*.021+y*.017)+.08*Math.sin(x*.057-y*.049);const cr=1-Math.abs(Math.sin(x*.034+Math.sin(y*.021)*2.2)),cr2=1-Math.abs(Math.sin(y*.047+Math.sin(x*.029)*1.8));h+=sk*(48+.5*Math.min(Math.max(m,0),220))*nn+sk*(cr*cr*16+cr2*cr2*9)+Math.max(0,m)*.06*Math.abs(Math.sin(x*.09+y*.07));}}return h;}
function unitH(e){if(e.isB)return groundH(e.x,e.y);const s=e.s;if(s.dom==='naval')return WL+.5+Math.sin(G.t*1.6+e.id)*.6;
  const g=G.grid?G.grid[Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL)]:0;const base=g===2?4:Math.max(groundH(e.x,e.y),g===1?WL:-99);
  if(s.dom==='air'){if(e.landed)return base+1;let h=base+(s.alt==='high'?110:55)+Math.sin(G.t*2+e.id)*2;
    // jets: climb out after take-off, dive on the target, pull up hard after the drop, glide down to land
    if(e.kind==='jet'){const cr=base+125;h=cr;if(e.toT!=null){const k=Math.min(1,(G.t-e.toT)/3.2);h=base+1+(cr-base-1)*k*k*(3-2*k);}
      const t=e.target;if(t&&!t.dead&&e.ammo>0){const d=Math.hypot(t.x-e.x,t.y-e.y);if(d<480)h-=(1-d/480)*70;}const lf=G.t-(e.lastFire||-9);if(lf<3)h+=55*Math.sin(Math.min(1,lf/3)*Math.PI*.5)*(1-lf/3*.3);
      if(e.ld!=null&&e.ld<1)h=base+1+(h-base-1)*e.ld;}
    // kamikaze drones fly lower and dive onto their target for the final run
    if(e.kind==='drone'){h=base+42+Math.sin(G.t*3+e.id)*1.5;const t=e.target;if(t&&!t.dead){const d=Math.hypot(t.x-e.x,t.y-e.y);if(d<170){const k=Math.max(0,d-10)/160;h=Math.min(h,groundH(t.x,t.y)+6+(h-base-6)*k*k);}}}return h;}return base;}

/* ---------- terrain, water, bridges, trees ---------- */
let TERR=null,WATER=null,WORLD=null,FOGC=null,FOGT=null,FOGM=null;
function edgeTex(){const M=G.map,d=new Uint8Array(EF_W*EF_H*4);for(let i=0;i<EF_W*EF_H;i++){const v=Math.max(0,Math.min(255,Math.round(M.EF[i]+128)));d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=255;}
  const tx=new THREE.DataTexture(d,EF_W,EF_H,THREE.RGBAFormat);tx.magFilter=tx.minFilter=THREE.LinearFilter;tx.generateMipmaps=false;tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping;tx.needsUpdate=true;return tx;}
let CITYM=null,CITYMAT=null;
function civAtXYAny(x,y){return G.civAt?G.civAt.get(Math.floor(y/CELL)*GW+Math.floor(x/CELL)):null;}
// city buildings: one merged mesh, styled by region; rebuilt when buildings are destroyed (rubble left behind)
const RCC={};function roofCol(c){return RCC[c]||(RCC[c]='#'+new THREE.Color(c).lerp(new THREE.Color('#8e8a82'),.42).getHexString());}
function buildCity(){if(!G.map.cityBlds||!G.map.cityBlds.length)return;
{const B=Bld(),W=Bld(),BT=[];const PAL={mideast:['#d8c9a8','#e6dcc6','#cbb48c','#efe8d8','#bfa883'],lebanon:['#efe7d6','#e4d6bc','#f4efe4','#d9cbb0'],yemen:['#8c6a4a','#a07a56','#7b5c40','#9c7b5c'],russia:['#a7a59c','#b8b1a3','#8f949a','#c2b7a0','#9aa3a8'],america:['#e9e4da','#c9d2da','#b88f6c','#d7d0c0','#8fa1b2'],turkey:['#efe9de','#e3d6c0','#f4eee4','#d8c9b0'],europe:['#efe6d2','#e2d2b4','#d8c8a8','#f2ead8'],gulfcity:['#9fb7c6','#c3d0d8','#7f98aa','#d9dde0','#b9a98c'],korea:['#d8d8d4','#c6cacc','#e4e2dc','#b8bec4'],asia:['#b7b2a8','#c9c3b6','#a6a49c','#d4cec0'],southasia:['#e2c49a','#d69a6a','#c8b08c','#e8d8b8','#b98a6a'],latin:['#f0d9a8','#9fd0c8','#f2b9a0','#e8e2d0','#b8d4e8']};
    for(const b of G.map.cityBlds){const cv=civAtXYAny(b.x,b.y);if(cv&&cv.dead){const g=groundH(b.x,b.y);const R=mulberry((b.x*7+b.y*3)|0);const rc=['#8d8371','#a39a86','#6f685b','#7a7466'];for(let q=0;q<5;q++){const w=b.w*(.3+R()*.4),h=2+R()*Math.min(9,b.h*.25);B.box(w,h,w*(.6+R()*.5),b.x+(R()-.5)*b.w*.6,g+h/2-.5,b.y+(R()-.5)*b.d*.6,rc[q%4],R()*.5,R()*3,R()*.4);}continue;}const g=groundH(b.x,b.y)-1,P=PAL[b.style]||PAL.mideast,col=P[Math.floor(b.v*P.length)%P.length],h=b.h,w=b.w,dd=b.d;
      W.box(w,h,dd,b.x,g+h/2,b.y,col);BT.push([g+1,g+h,b.style==='gulfcity'||b.style==='korea'||b.style==='asia'?1:b.style==='america'&&h<16?2:b.style==='yemen'?3:0,b.v]);
      // rooftop clutter: water tanks, AC units, stair heads, dishes and parapets on flat roofs
      {const flat=!(b.style==='america'&&h<16)&&!((b.style==='europe'||b.style==='turkey'))&&!(b.style==='lebanon'&&b.v>.7);if(flat){const R=mulberry(((b.x*13)^(b.y*7))|0),top=g+h;
        B.box(w+.4,1.2,.8,b.x,top+.6,b.y-dd/2+.4,col);B.box(w+.4,1.2,.8,b.x,top+.6,b.y+dd/2-.4,col);B.box(.8,1.2,dd,b.x-w/2+.4,top+.6,b.y,col);B.box(.8,1.2,dd,b.x+w/2-.4,top+.6,b.y,col);
        const n=1+(R()*3|0);for(let q=0;q<n;q++){const rx=b.x+(R()-.5)*w*.6,rz=b.y+(R()-.5)*dd*.6,k=R();if(k<.4){B.cyl(1.6,1.6,2.6,10,rx,top+1.5,rz,R()<.5?'#e9e6df':'#2d2f33');B.box(.3,1.4,.3,rx+1,top+.5,rz+1,'#555');}else if(k<.75)B.box(2.6,1.6,2,rx,top+.8,rz,'#c9c9c4');else if(k<.9){B.box(4,3.2,4,rx,top+1.6,rz,col);}else{B.cyl(.12,.12,2,5,rx,top+1,rz,'#666');B.sph(1.1,rx,top+2.2,rz,'#e4e4e0',1,.35,1);}}
        if(b.style==='mideast'||b.style==='lebanon'||b.style==='yemen'||b.style==='southasia'){if(R()<.5){const sd=R()<.5?1:-1;for(let fy=g+11;fy<top-4;fy+=10)B.box(w*.55,.6,2.2,b.x,fy,b.y+sd*(dd/2+1.1),'#d9d3c6'),B.box(w*.55,1.6,.25,b.x,fy+1,b.y+sd*(dd/2+2.1),'#6a6a66');}}}}
      if(b.style==='yemen'){for(let y=g+7;y<g+h-2;y+=7)B.box(w+.3,1,dd+.3,b.x,y,b.y,'#efe9dc');B.box(w*.9,1.6,dd*.9,b.x,g+h+.8,b.y,roofCol('#efe9dc'));}
      else if(b.style==='america'&&h<16){B.cone(Math.max(w,dd)*.74,7,4,b.x,g+h+3.5,b.y,b.v>.5?'#5b4a3e':'#3e4a55',0,Math.PI/4,0);}
      else if(b.style==='america'){for(let y=g+5;y<g+h-3;y+=6)B.box(w+.3,1.4,dd+.3,b.x,y,b.y,'#3a4a5c');}
      else if(b.style==='russia'){for(let y=g+5;y<g+h-3;y+=5)B.box(w+.3,.8,dd+.3,b.x,y,b.y,'#6c6f74');if(b.v>.965){B.sph(6,b.x,g+h+5,b.y,'#d4a83a',1,1.3,1);B.cone(1.5,6,6,b.x,g+h+13,b.y,'#d4a83a');}}
      else if(b.style==='lebanon'&&b.v>.7){B.cone(Math.max(w,dd)*.72,6,4,b.x,g+h+3,b.y,'#a6503a',0,Math.PI/4,0);}
      else if(b.style==='europe'||b.style==='turkey'){B.cone(Math.max(w,dd)*.74,8,4,b.x,g+h+4,b.y,b.style==='europe'?'#9a4632':'#b05a3c',0,Math.PI/4,0);if(b.style==='europe'&&b.v>.97){B.box(6,26,6,b.x,g+h+13,b.y,'#d8cdb4');B.cone(4.5,16,4,b.x,g+h+34,b.y,'#4d5a52',0,Math.PI/4,0);}
        if(b.style==='turkey'&&b.v>.95&&b.core>.3){B.sph(Math.min(w,dd)*.5,b.x,g+h+1,b.y,'#9aa3a6',1,.8,1);for(const s of [-1,1])B.cyl(1.6,2,h+34,8,b.x+s*w*.45,g+(h+34)/2,b.y,'#efe9de'),B.cone(2,8,8,b.x+s*w*.45,g+h+38,b.y,'#7d8a8c');}}
      else if(b.style==='gulfcity'||b.style==='korea'||b.style==='asia'){const gl=b.style==='gulfcity'?'#5d7f99':'#5f6a74';for(let y=g+4;y<g+h-3;y+=b.style==='gulfcity'?4:5)B.box(w+.3,b.style==='gulfcity'?2:1,dd+.3,b.x,y,b.y,gl);if(b.style==='gulfcity'&&h>110)B.cyl(.6,1.4,24,6,b.x,g+h+12,b.y,'#c9ced2');if(b.style==='asia'&&b.v>.9&&h<26)B.cone(Math.max(w,dd)*.8,5,4,b.x,g+h+2.5,b.y,'#7a3b2c',0,Math.PI/4,0);}
      else if(b.style==='latin'||b.style==='southasia'){B.box(w*.98,1.4,dd*.98,b.x,g+h+.7,b.y,roofCol('#efe9dc'));if(b.style==='southasia'&&b.v>.96)B.sph(Math.min(w,dd)*.4,b.x,g+h+1,b.y,'#e8e2d6',1,1.2,1);}
      else{B.box(w*.96,1.6,dd*.96,b.x,g+h+.8,b.y,roofCol(col));if(b.v>.93&&b.core>.4){B.sph(Math.min(w,dd)*.42,b.x,g+h+1,b.y,b.v>.97?'#3f8f8a':'#d9d2c0',1,.9,1);}else if(b.v<.025){B.cyl(2.2,2.6,h+26,8,b.x+w*.3,g+(h+26)/2,b.y+dd*.3,'#e8e0cc');B.cone(2.8,6,8,b.x+w*.3,g+h+29,b.y+dd*.3,'#3f8f8a');}}}
    if(CITYM){WORLD.remove(CITYM);CITYM.traverse(o=>{if(o.geometry)o.geometry.dispose();});}const grp=new THREE.Group();
    if(BT.length){const wg=W.geo(),per=wg.attributes.position.count/BT.length,a=new Float32Array(wg.attributes.position.count*4);for(let k=0;k<BT.length;k++)for(let q=0;q<per;q++)a.set(BT[k],(k*per+q)*4);wg.setAttribute('bt',new THREE.BufferAttribute(a,4));
      const wm=new THREE.Mesh(wg,cityWallMat());wm.castShadow=true;wm.receiveShadow=true;grp.add(wm);}
    if(B._p.length){const dm=new THREE.Mesh(B.geo(),CITYMAT||(CITYMAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9})));dm.castShadow=true;dm.receiveShadow=true;grp.add(dm);}
    WORLD.add(grp);CITYM=grp;}}
// City walls: windows, frames, shutters, sills, ground-floor shopfronts and doors, a cornice and grime, all drawn in the
// shader from each building's base and top so they line up storey by storey.
let CWMAT=null;function cityWallMat(){if(CWMAT)return CWMAT;const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 bt;varying vec4 vBT;varying vec3 vCW;varying vec3 vCN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBT=bt;vCW=(modelMatrix*vec4(position,1.)).xyz;vCN=normalize(mat3(modelMatrix)*normal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vBT;varying vec3 vCW;varying vec3 vCN;float ch(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}').replace('#include <color_fragment>',`#include <color_fragment>
      float vt=1.-abs(vCN.y);float y=vCW.y-vBT.x,H=vBT.y-vBT.x;
      if(vt>.5&&y>.2&&y<H-.4){vec2 tn=normalize(vec2(-vCN.z,vCN.x));float u=dot(vCW.xz,tn);bool tower=vBT.z>.5&&vBT.z<1.5,house=vBT.z>1.5&&vBT.z<2.5,arch=vBT.z>2.5;
        float FH=tower?8.:10.,WS=tower?6.:9.;float fy=floor(y/FH),fx=floor(u/WS);vec2 f=vec2(fract(u/WS),fract(y/FH));float h=ch(vec2(fx,fy)+vBT.w*91.);
        float wx=tower?.12:.26,wy0=tower?.18:.3,wy1=tower?.92:.82;if(arch){wx=.34;wy0=.35;wy1=.78;}
        float win=step(wx,f.x)*step(f.x,1.-wx)*step(wy0,f.y)*step(f.y,wy1);float fr=step(wx-.06,f.x)*step(f.x,1.-wx+.06)*step(wy0-.07,f.y)*step(f.y,wy1+.05)*(1.-win);
        float gnd=1.-step(FH,y);if(gnd>.5&&!tower){float door=step(.36,fract(u/(WS*3.)))*step(fract(u/(WS*3.)),.5)*step(y,7.5);win=max(win*step(2.,y),0.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.12,.09),door*.95);}
        vec3 glass=mix(vec3(.07,.09,.11),vec3(.32,.38,.44),h*h)*(tower?1.15:1.);{vec3 Vg=normalize(cameraPosition-vCW);vec3 Rg=reflect(-Vg,normalize(vCN));float fg=.08+.92*pow(1.-clamp(dot(Vg,normalize(vCN)),0.,1.),4.);vec3 sk=mix(vec3(.55,.6,.66),vec3(.3,.45,.7),smoothstep(0.,.6,Rg.y));glass=mix(glass,sk*(tower?1.05:.9),fg*.75)+vec3(1.,.9,.7)*pow(max(dot(Rg,vec3(-.66,.57,-.46)),0.),90.)*.6;}if(h>.93)glass=vec3(.85,.7,.42);
        vec3 base=diffuseColor.rgb;diffuseColor.rgb=mix(diffuseColor.rgb,base*1.18+.04,fr*.8);diffuseColor.rgb=mix(diffuseColor.rgb,glass,win*.95);
        if(!tower&&h<.18)diffuseColor.rgb=mix(diffuseColor.rgb,base*.62+vec3(.05,.07,.04),win);
        float sill=step(wx-.04,f.x)*step(f.x,1.-wx+.04)*step(wy0-.1,f.y)*step(f.y,wy0-.03);diffuseColor.rgb=mix(diffuseColor.rgb,base*1.3+.05,sill*.9);
        float streak=(1.-win)*step(wx,f.x)*step(f.x,1.-wx)*step(f.y,wy0)*.12;diffuseColor.rgb*=1.-streak;
        diffuseColor.rgb*=.8+.2*smoothstep(0.,6.,y);diffuseColor.rgb=mix(diffuseColor.rgb,base*.72,step(H-1.6,y)*.85);}
      else if(vt<.5){vec2 q=vCW.xz/9.,i0=floor(q),fq=fract(q);fq=fq*fq*(3.-2.*fq);float n=mix(mix(ch(i0),ch(i0+vec2(1,0)),fq.x),mix(ch(i0+vec2(0,1)),ch(i0+vec2(1,1)),fq.x),fq.y);
        vec2 q2=vCW.xz/2.3,j0=floor(q2),fj=fract(q2);fj=fj*fj*(3.-2.*fj);float n2=mix(mix(ch(j0),ch(j0+vec2(1,0)),fj.x),mix(ch(j0+vec2(0,1)),ch(j0+vec2(1,1)),fj.x),fj.y);
        vec3 roof=mix(diffuseColor.rgb,vec3(.6,.58,.55),.42);diffuseColor.rgb=roof*(.8+.14*n+.06*n2)*(1.-.18*smoothstep(.62,.8,n));}
      if(vt>.5){diffuseColor.rgb*=.93;}`);};
  m.customProgramCacheKey=()=>'citywall3';return CWMAT=m;}

// Beyond the playable area the land carries on: the edge heights and colours are continued outward and roll up into
// soft hills (or stay as open sea where the map edge is water), fading into the haze, so the map has no hard border.
function bN2(x,y){const s=Math.sin(x*.0021+Math.sin(y*.0013)*2)*Math.cos(y*.0018+Math.sin(x*.0011)*1.7);return s*.6+.4*Math.sin(x*.0057+y*.0043)*Math.cos(x*.0031-y*.0049);}
function borderH(x,z){const cx=Math.max(1,Math.min(MAPW-1,x)),cz=Math.max(1,Math.min(MAPH-1,z)),dx=Math.max(0,-x,x-MAPW),dz=Math.max(0,-z,z-MAPH),d=Math.hypot(dx,dz);if(d<=0)return groundH(x,z);
  if(G.map.edge(cx,cz)>-20)return Math.min(WL-6,groundH(cx,cz))-Math.min(30,d*.05);const s=Math.min(1,d/900),s2=s*s*(3-2*s),hill=60+150*(.5+.5*bN2(x,z))*Math.min(1,d/1600);return groundH(cx,cz)*(1-s2)+hill*s2+bN2(x*3,z*3)*6*s;}
// woods continue past the map edge (rendering only: not in G.treePos, so no cover or pathing effect)
function borderTrees(){if(!G.treePos||G.treePos.length<40||!MODELS.ready)return;const R=mulberry((G.seed||1)*13+5),ext=[],dens=Math.min(1,G.treePos.length/900);
  for(let i=0;i<5200&&ext.length<520*dens+60;i++){const side=R()*4|0,t=R(),o=60+Math.pow(R(),1.6)*900;let x,y;if(side===0){x=t*MAPW;y=-o;}else if(side===1){x=t*MAPW;y=MAPH+o;}else if(side===2){x=-o;y=t*MAPH;}else{x=MAPW+o;y=t*MAPH;}
    if(bN2(x*2.3,y*2.3)<.05)continue;const cx=Math.max(1,Math.min(MAPW-1,x)),cy=Math.max(1,Math.min(MAPH-1,y));if(G.map.edge(cx,cy)>-60)continue;ext.push([x,y,.8+R()*.55,R()*6.28]);}
  if(!ext.length)return;const keep=G.treePos,gh=groundH;try{G.treePos=ext;groundH=(x,y)=>(x<0||y<0||x>MAPW||y>MAPH)?borderH(x,y):gh(x,y);modelTrees();}finally{G.treePos=keep;groundH=gh;}}
function borderLand(dtex){const M=G.map,BX=Math.max(MAPW,MAPH)*.7,W2=MAPW+2*BX,H2=MAPH+2*BX,sx=200,sy=Math.round(sx*H2/W2);
  const g=new THREE.PlaneGeometry(W2,H2,sx,sy);g.rotateX(-Math.PI/2);g.translate(MAPW/2,0,MAPH/2);const p=g.attributes.position,col=new Float32Array(p.count*3),FD=new Float32Array(p.count),CELL=W2/sx;
  const th=G.thumb,tw=th.width,thh=th.height,td=th.getContext('2d').getImageData(0,0,tw,thh).data;
  const theme=M.theme,base=new THREE.Color(theme==='snow'?'#c4ccd4':theme==='green'?'#66733f':'#a88d60'),rock=new THREE.Color(theme==='snow'?'#e8edf2':theme==='green'?'#6d6656':'#9a8466');
  const n2=(x,y)=>{const s=Math.sin(x*.0021+Math.sin(y*.0013)*2)*Math.cos(y*.0018+Math.sin(x*.0011)*1.7);return s*.6+.4*Math.sin(x*.0057+y*.0043)*Math.cos(x*.0031-y*.0049);};
  const c=new THREE.Color(),tc=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),cx=Math.max(1,Math.min(MAPW-1,x)),cz=Math.max(1,Math.min(MAPH-1,z)),dx=Math.max(0,-x,x-MAPW),dz=Math.max(0,-z,z-MAPH),d=Math.hypot(dx,dz);
    const k=((Math.min(thh-1,cz/MAPH*thh|0))*tw+Math.min(tw-1,cx/MAPW*tw|0))*4;tc.setRGB(td[k]/255,td[k+1]/255,td[k+2]/255).convertSRGBToLinear();
    let y=borderH(x,z);const wet=M.edge(cx,cz)>-20;
    if(d<=0){const ins=Math.min(x,MAPW-x,z,MAPH-z);y=groundH(x,z)-(ins<CELL*1.6?0:4+Math.min(80,(ins-CELL*1.6)*.6));}
    p.setY(i,y);const fade=Math.min(1,d/700),sl=Math.max(0,Math.min(1,(y-90)/120));c.copy(tc).lerp(base,fade*.75).lerp(rock,sl*.5*fade);c.multiplyScalar(.94+.12*n2(x*4.1,z*3.7));col.set([c.r,c.g,c.b],i*3);FD[i]=Math.min(1,d/1100);}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('fd',new THREE.BufferAttribute(FD,1));g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:4});if(dtex)m.onBeforeCompile=sh=>{sh.uniforms.dmap={value:dtex};sh.uniforms.ttex={value:BORDER_TEX};sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;attribute float fd;varying float vFD;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=position.xz;vFD=fd;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;varying float vFD;uniform sampler2D dmap;uniform sampler2D ttex;').replace('#include <color_fragment>','#include <color_fragment>\n{vec2 mu=vWP/vec2('+MAPW.toFixed(1)+','+MAPH.toFixed(1)+');mu=1.-abs(mod(mu,2.)-1.);vec3 tl=pow(texture2D(ttex,vec2(mu.x,1.-mu.y)).rgb,vec3(2.2));float k=smoothstep(0.,1.,vFD);diffuseColor.rgb=mix(tl,diffuseColor.rgb,k*.85);float lu=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lu),k*.35)*(1.-.28*k);}\n{vec2 tU=vWP/3200.;float dn=texture2D(dmap,tU*90.).r*.6+texture2D(dmap,tU*17.).r*.4;diffuseColor.rgb*=mix(.78,1.18,dn);float m1=texture2D(dmap,tU*.9+.21).r;diffuseColor.rgb*=.9+.2*m1;float fine=texture2D(dmap,tU*1400.).r;diffuseColor.rgb*=1.+(fine-.5)*.2;}');};const mesh2=new THREE.Mesh(g,m);mesh2.receiveShadow=true;mesh2.renderOrder=-1;WORLD.add(mesh2);}
function buildWorld(){
  if(WORLD){SCN.remove(WORLD);WORLD.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  WORLD=new THREE.Group();SCN.add(WORLD);
  const tex=new THREE.CanvasTexture(G.terrain);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=R3.capabilities.getMaxAnisotropy();
  const TSG=Math.min(1.8,Math.max(1.3,WK*.85)),g=new THREE.PlaneGeometry(MAPW,MAPH,Math.round(320*TSG),Math.round(220*TSG));g.rotateX(-Math.PI/2);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i)+MAPW/2,z=p.getZ(i)+MAPH/2;p.setY(i,groundH(x,z));}g.computeVertexNormals();
  {const nn=g.attributes.normal,cols=new Float32Array(p.count*3),AOA=new Float32Array(p.count);for(let i=0;i<p.count;i++){const sl=1-nn.getY(i),k=Math.max(0,Math.min(1,(sl-.12)*3.2)),st=.78+.22*Math.sin(p.getY(i)*1.3);const x=p.getX(i)+MAPW/2,z=p.getZ(i)+MAPH/2,hy=p.getY(i),cv=hy-(groundH(x+24,z)+groundH(x-24,z)+groundH(x,z+24)+groundH(x,z-24))*.25,ao=Math.max(.8,Math.min(1.08,1+cv*.025));AOA[i]=ao;cols[i*3]=1-k*.1*(2-st);cols[i*3+1]=1-k*.13*(2-st);cols[i*3+2]=1-k*.16*(2-st);}g.setAttribute('ao',new THREE.BufferAttribute(AOA,1));g.setAttribute('color',new THREE.BufferAttribute(cols,3));}g.translate(MAPW/2,0,MAPH/2);
  const dc=document.createElement('canvas');dc.width=dc.height=256;const dx=dc.getContext('2d'),di=dx.createImageData(256,256);{const v=new Float32Array(256*256);for(let o=0;o<5;o++){const s=1<<(o+2),g2=[];for(let i=0;i<(s+1)*(s+1);i++)g2.push(Math.random());for(let y=0;y<256;y++)for(let x=0;x<256;x++){const fx=x/256*s,fy=y/256*s,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,a=g2[iy*(s+1)+ix],b=g2[iy*(s+1)+((ix+1)%s)],c2=g2[((iy+1)%s)*(s+1)+ix],d2=g2[((iy+1)%s)*(s+1)+((ix+1)%s)];v[y*256+x]+=((a*(1-tx)+b*tx)*(1-ty)+(c2*(1-tx)+d2*tx)*ty)/(1<<o);}}for(let i=0;i<v.length;i++){const q=Math.max(0,Math.min(255,(v[i]/1.94)*255));di.data.set([q,q,q,255],i*4);}}dx.putImageData(di,0,0);
  const dtex=new THREE.CanvasTexture(dc);dtex.wrapS=dtex.wrapT=THREE.RepeatWrapping;dtex.anisotropy=8;
  const tm=new THREE.MeshStandardMaterial({map:tex,roughness:.93,metalness:0,vertexColors:true});tm.onBeforeCompile=sh=>{sh.uniforms.dmap={value:dtex};sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vH;attribute float ao;varying float vAO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvH=position.y;vAO=ao;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vH;varying float vAO;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=vAO;\n vec2 tU=vUv*vec2('+(MAPW/3200).toFixed(4)+','+(MAPH/3200).toFixed(4)+');\n {float m1=texture2D(dmap,tU*.9+.21).r,m2=texture2D(dmap,tU*2.3+.63).r;diffuseColor.rgb*=.9+.2*m1;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.,.9),smoothstep(.45,.7,m2)*.6);}\n float dn=texture2D(dmap,tU*90.).r*.6+texture2D(dmap,tU*17.).r*.4; diffuseColor.rgb*=mix(.72,1.22,dn); {float mac=texture2D(dmap,tU*5.).r*.6+texture2D(dmap,tU*11.+.37).r*.4;float l0=dot(diffuseColor.rgb,vec3(.3,.59,.11));vec3 pale=vec3(l0)*vec3(1.16,1.05,.86);diffuseColor.rgb=mix(diffuseColor.rgb,pale*1.12,smoothstep(.56,.74,mac)*.5);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,.79,.78),smoothstep(.44,.26,mac)*.55);float l1=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(vec3(l1),diffuseColor.rgb,.88);} {vec2 wq=vUv*vec2('+MAPW+'.,'+MAPH+'.);vec2 ci=floor(wq*.55);float hh=fract(sin(dot(ci,vec2(12.9898,78.233)))*43758.5453);vec2 cf=fract(wq*.55)-.5;float peb=step(.93,hh)*smoothstep(.32,.12,length(cf));float fine=texture2D(dmap,tU*1400.).r;float rip=sin(wq.x*.35+wq.y*.12+fine*4.)*.5+.5;diffuseColor.rgb*=1.+(fine-.5)*.22+(rip-.5)*.05;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(hh>.965?1.35:.55),peb*.7);} {float rk=clamp((1.-vColor.r)*5.,0.,1.)*.5;float nz=texture2D(dmap,tU*60.).r;float band=sin(vH*.75+nz*5.)*.5+.5;float band2=sin(vH*2.3+nz*9.)*.5+.5;vec3 rockc=vec3(.82,.66,.48)*(.88+.2*band)*(.94+.1*band2);float cr=smoothstep(.55,.6,texture2D(dmap,vec2(tU.x*300.,vH*.08)).r);rockc*=1.-cr*.15;diffuseColor.rgb=mix(diffuseColor.rgb,rockc*(diffuseColor.rgb/max(vec3(.05),vColor.rgb))*.9,rk*.6);}').replace('void main() {','uniform sampler2D dmap;\nvoid main() {').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n {vec2 tU=vUv*vec2('+(MAPW/3200).toFixed(4)+','+(MAPH/3200).toFixed(4)+');vec2 bu=tU*90.;float h0=texture2D(dmap,bu).r*.7+texture2D(dmap,tU*370.).r*.3;float hx=texture2D(dmap,bu+vec2(.004,0.)).r*.7+texture2D(dmap,tU*370.+vec2(.004,0.)).r*.3;float hy=texture2D(dmap,bu+vec2(0.,.004)).r*.7+texture2D(dmap,tU*370.+vec2(0.,.004)).r*.3;normal=normalize(normal+(viewMatrix*vec4((h0-hx)*2.6,0.,(h0-hy)*2.6,0.)).xyz);}');};
  TERR=new THREE.Mesh(g,tm);TERR.receiveShadow=true;WORLD.add(TERR);
  BORDER_TEX=tex;borderLand(dtex);
  // city buildings: one merged mesh, styled by region
  CITYM=null;G.civDirty=false;buildCity();

  // skirt so the map edge doesn't float

  // water
  const BX=Math.max(MAPW,MAPH)*.7,wg=new THREE.PlaneGeometry(MAPW+2*BX,MAPH+2*BX,1,1).rotateX(-Math.PI/2);wg.translate(MAPW/2,WL,MAPH/2);
  WATER=new THREE.Mesh(wg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{t:{value:0},sun:{value:new THREE.Vector3(-.55,.55,-.4).normalize()},cpos:{value:new THREE.Vector3()},etex:{value:edgeTex()},esz:{value:new THREE.Vector2(EF_W,EF_H)},ice:{value:G.map.theme==='snow'?1:0}},
    vertexShader:`varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float t;uniform vec3 sun;uniform vec3 cpos;uniform sampler2D etex;uniform vec2 esz;uniform float ice;varying vec3 wp;
      float edgeAt(vec2 p){vec2 uv=(p/${EF_R.toFixed(1)}+.5)/esz;return texture2D(etex,uv).r*255.-128.;}
      vec2 W(vec2 p,vec2 d,float f,float s){float ph=dot(p,d)*f+t*s;return d*cos(ph)*f;}
      void main(){vec2 p=wp.xz;vec2 g=W(p,normalize(vec2(1.,.4)),.045,1.3)*.7+W(p,normalize(vec2(-.3,1.)),.07,1.9)*.45+W(p,normalize(vec2(.7,-.6)),.13,2.6)*.3+W(p,normalize(vec2(-.9,-.2)),.21,3.4)*.18+W(p,normalize(vec2(.2,.98)),.37,4.1)*.1+W(p,normalize(vec2(-.6,.8)),.53,5.3)*.07+W(p,normalize(vec2(.95,-.3)),.71,6.2)*.05+W(p,normalize(vec2(-.4,-.92)),.97,7.4)*.035;
        vec3 n=normalize(vec3(-g.x*2.2,1.,-g.y*2.2));vec3 v=normalize(cpos-wp);float fr=pow(1.-max(dot(n,v),0.),3.);
        vec3 deep=vec3(.07,.24,.28),shal=vec3(.16,.42,.42),sky=vec3(.6,.72,.8);vec3 c=mix(deep,shal,.45+.3*n.x)+sky*fr*.55;
        vec3 h=normalize(sun+v);float sp=pow(max(dot(n,h),0.),900.)*.32+pow(max(dot(n,h),0.),90.)*.05;c+=vec3(1.,.93,.8)*sp;float lv=sin(p.x*.011+p.y*.007+t*.1)*sin(p.y*.013-p.x*.004)*.5+.5;c*=.9+.16*lv;
        float edge=edgeAt(wp.xz);if(edge<-60.)discard;float fn=sin(wp.x*.11+t*.9)*sin(wp.z*.13-t*.7)*.5+.5;float sw=sin(edge*.3-t*1.4+fn*2.)*.5+.5;float br=fract(sin(dot(floor(wp.xz*.12),vec2(12.9,78.2)))*437.5);float foam=smoothstep(14.,0.,edge)*(.55+.45*fn)+smoothstep(34.,12.,edge)*smoothstep(.7,.95,sw)*(.55+.45*br)+smoothstep(22.,12.,edge)*smoothstep(8.,12.,edge)*.18*fn;float dp=smoothstep(0.,120.,edge);
        c=mix(vec3(.3,.5,.44),c,smoothstep(0.,150.,edge));c=mix(vec3(.5,.56,.44),c,smoothstep(0.,22.,edge)*.7+.3);c=mix(c,vec3(.9,.92,.9),clamp(foam,0.,1.)*.8);if(ice>0.){vec2 q=p+vec2(sin(p.y*.006)*90.,sin(p.x*.005)*90.);float fl=sin(q.x*.0105+sin(q.y*.0071)*2.3)*sin(q.y*.0123+sin(q.x*.0083)*2.1)*.6+sin(q.x*.027-q.y*.021+sin(q.y*.019)*1.7)*.3+sin(q.x*.061+q.y*.053)*.1;float cr=(smoothstep(.99,1.,abs(sin(q.x*.05+fl*7.)))+smoothstep(.99,1.,abs(sin(q.y*.043-fl*6.))))*.25;float shore=smoothstep(60.,6.,edge+fl*25.);float k=clamp(shore+smoothstep(.22,.32,fl),0.,1.);c=mix(c,vec3(.78,.86,.9)-cr*.12,k*.85);foam=max(foam,k*1.5);}
        gl_FragColor=vec4(pow(c,vec3(2.2)),mix(.45,.88,dp)+fr*.1+foam*.3);}`}));
  WATER.renderOrder=1;WATER.visible=!!G.map.hasWater;WORLD.add(WATER);
  // bridges
  const bm=new THREE.MeshStandardMaterial({color:lin('#8b8880'),roughness:.9}),rm=new THREE.MeshStandardMaterial({color:lin('#5e625f'),roughness:.55,metalness:.4}),pm=new THREE.MeshStandardMaterial({color:lin('#7d7a72'),roughness:.95});
  const dk=(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#4b4a47';x.fillRect(0,0,512,128);const id=x.getImageData(0,0,512,128);for(let i=0;i<id.data.length;i+=4){const n=(Math.random()-.5)*18;id.data[i]+=n;id.data[i+1]+=n;id.data[i+2]+=n;}x.putImageData(id,0,0);
    for(let k=0;k<30;k++){const gx=Math.random()*512,gy=Math.random()*128;const g=x.createRadialGradient(gx,gy,0,gx,gy,10+Math.random()*24);g.addColorStop(0,'rgba(30,28,26,.25)');g.addColorStop(1,'rgba(30,28,26,0)');x.fillStyle=g;x.fillRect(0,0,512,128);}
    x.fillStyle='#8f8b82';x.fillRect(0,0,512,10);x.fillRect(0,118,512,10);x.fillStyle='rgba(210,202,180,.45)';x.fillRect(0,14,512,2);x.fillRect(0,112,512,2);x.fillStyle='rgba(200,170,80,.45)';for(let i=0;i<512;i+=32)x.fillRect(i,62,18,3);
    x.fillStyle='rgba(30,30,28,.6)';for(let i=0;i<512;i+=128)x.fillRect(i,10,2,108);x.strokeStyle='rgba(20,20,18,.18)';x.lineWidth=7;for(const y of [36,92]){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
    {x.globalAlpha=1;for(let k=0;k<70;k++){const gx=Math.random()*512,edge=Math.random()<.6,gy=edge?(Math.random()<.5?10+Math.random()*18:100+Math.random()*18):Math.random()*128,r=6+Math.random()*26;const g=x.createRadialGradient(gx,gy,0,gx,gy,r);const al=edge?.55:.3;g.addColorStop(0,`rgba(176,148,108,${al})`);g.addColorStop(1,'rgba(176,148,108,0)');x.fillStyle=g;x.beginPath();x.ellipse(gx,gy,r*1.8,r*.6,0,0,7);x.fill();}
     x.strokeStyle='rgba(24,22,20,.5)';x.lineWidth=1;for(let k=0;k<26;k++){let px=Math.random()*512,py=14+Math.random()*100,a=Math.random()*6.3;x.beginPath();x.moveTo(px,py);for(let q=0;q<7;q++){a+=(Math.random()-.5)*1.4;px+=Math.cos(a)*5;py+=Math.sin(a)*3;x.lineTo(px,py);}x.stroke();}
     for(let k=0;k<5;k++){const gx=Math.random()*512,gy=24+Math.random()*80;x.fillStyle='rgba(36,34,30,.55)';x.beginPath();x.ellipse(gx,gy,6+Math.random()*7,3+Math.random()*4,Math.random()*3,0,7);x.fill();}}
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;})();
  const dm=new THREE.MeshStandardMaterial({map:dk,roughness:.92});
  for(const b of G.map.bridges){const grp=new THREE.Group();grp.position.set(b.x,0,b.y);grp.rotation.y=-Math.atan2(b.n[1],b.n[0]);const L=b.h*2+30;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(L,3,66),[bm,bm,dm,bm,bm,bm]);deck.position.y=3;deck.castShadow=deck.receiveShadow=true;grp.add(deck);dk.repeat.set(Math.max(1,Math.round(L/256)),1);
    const gird=new THREE.Mesh(new THREE.BoxGeometry(L,6,56),pm);gird.position.y=-2;gird.castShadow=true;grp.add(gird);
    for(const z of [-31,31])for(let s2=-L/2+12;s2<L/2;s2+=48){const lp=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,16,6),rm);lp.position.set(s2,13,z);lp.castShadow=true;grp.add(lp);const arm=new THREE.Mesh(new THREE.BoxGeometry(1,1,6),rm);arm.position.set(s2,21,z*0.9);grp.add(arm);const hd=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,3.6),LAMPM||(LAMPM=new THREE.MeshStandardMaterial({color:0x3a3d40,emissive:0xffd9a0,emissiveIntensity:.55,roughness:.6})));hd.position.set(s2,20.4,z*0.8);grp.add(hd);}
    for(const z of [-33,33]){const r=new THREE.Mesh(new THREE.BoxGeometry(L,1.2,1.2),rm);r.position.set(0,8.2,z);r.castShadow=true;grp.add(r);const cb=new THREE.Mesh(new THREE.BoxGeometry(L,2.4,2.4),pm);cb.position.set(0,5.6,z);grp.add(cb);for(let s2=-L/2+4;s2<L/2;s2+=12){const po=new THREE.Mesh(new THREE.BoxGeometry(.8,3,.8),rm);po.position.set(s2,6.8,z);grp.add(po);}}
    for(let s=-L/2+50;s<L/2-30;s+=70){const pl=new THREE.Mesh(new THREE.BoxGeometry(12,26,58),pm);pl.position.set(s,-10,0);pl.castShadow=true;grp.add(pl);}
    WORLD.add(grp);}
  // trees (instanced)
  try{scenery();}catch(e){console.warn('scenery',e);}
  if(modelTrees()){try{borderTrees();}catch(e){}}else{const N=G.treePos.length;mats();
  const mkTree=v=>{const B=Bld();B.cyl(1.1,1.9,12,6,0,6,0,'#4a3826');const R=mulberry(v*31+7);const nb=4+(R()*3|0);for(let i=0;i<nb;i++){const a=R()*6.28,d=i?2+R()*4:0,r=5.5+R()*4,h=13+R()*7+(i?0:4);const g=new THREE.IcosahedronGeometry(r,1);g.scale(1,.9,1);B.box(.1,.1,.1,0,0,0,'#000');const c=new THREE.Color().setHSL(.21+R()*.06,.38+R()*.15,.2+R()*.08);parts_add(B,g,Math.cos(a)*d,h,Math.sin(a)*d,c);}return B.geo();};
  const TG=[0,1,2].map(mkTree);const per=[[],[],[]];G.treePos.forEach((t,i)=>per[i%3].push(t));
  const trunks={castShadow:false},crowns={castShadow:false};
  per.forEach((list,k)=>{const im=new THREE.InstancedMesh(TG[k],new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:false}),list.length);const col=new THREE.Color();
    list.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s,s*(.85+((i*7)%5)*.07),s));im.setMatrixAt(i,TMPM);col.setHSL(0,0,.85+((i*13)%10)*.03);im.setColorAt(i,col);});
    im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});
  }
  { // grass tufts
    const gg=(()=>{const P=[],Nn=[],C=[],Rb=mulberry(5);for(let k=0;k<15;k++){const a=Rb()*6.28,d=Rb()*2.6,x=Math.cos(a)*d,z=Math.sin(a)*d,h=3+Rb()*5,w=.32+Rb()*.25,la=Rb()*6.28,lean=.6+Rb()*1.6,ox=Math.cos(la+1.57)*w,oz=Math.sin(la+1.57)*w,tx=x+Math.cos(la)*lean,tz=z+Math.sin(la)*lean;
      P.push(x-ox,0,z-oz,x+ox,0,z+oz,tx,h,tz, x+ox,0,z+oz,x-ox,0,z-oz,tx,h,tz);for(let q=0;q<6;q++)Nn.push(0,1,0);C.push(.6,.6,.6,.6,.6,.6,1.15,1.15,1.15, .6,.6,.6,.6,.6,.6,1.15,1.15,1.15);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g;})();
    const gmat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true});window.WINDU={value:0};
    gmat.onBeforeCompile=sh=>{sh.uniforms.wt=WINDU;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wt;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(transformed.y,0.)/6.;float w=sin(wt*1.7+ip.x*.021+ip.z*.017)*.6+sin(wt*3.1+ip.x*.05)*.25;transformed.x+=w*k*k*1.6;transformed.z+=w*k*k*.7;}');};
    const AREA=Math.max(1,MAPW*MAPH/(3200*2200)),NG=Math.round(9000*Math.min(2,AREA)),gm=new THREE.InstancedMesh(gg,gmat,NG);let n=0;const gc=new THREE.Color();const R=mulberry(G.seed+99);
    for(let k=0;k<NG*3&&n<NG;k++){const x=R()*MAPW,y=R()*MAPH,M=G.map;if(Math.abs(M.depth(x,y))<M.hw(x)+40)continue;if(BASES.some(([bx,by])=>Math.abs(x-bx)<290&&Math.abs(y-by)<290))continue;if(G.fields.some(f=>Math.hypot(f.x-x,f.y-y)<70))continue;if(G.map.hasMtn&&G.map.mf(x,y)>-40)continue;if(G.roadMask){const q=G.roadMask;if(q.d[(y/q.C|0)*q.w+(x/q.C|0)]&&R()<.9)continue;}
      if(Math.hypot(groundH(x+6,y)-groundH(x-6,y),groundH(x,y+6)-groundH(x,y-6))/12>.4)continue;const cl=Math.sin(x*.013)*Math.cos(y*.011)+Math.sin(x*.031+y*.017)*.5;if(cl<.1&&R()<.7)continue;const s=.7+R()*1.0;TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),R()*6),new THREE.Vector3(s,s*(.6+R()*.7),s));gm.setMatrixAt(n,TMPM);const dry=R()<.7;if(G.map.theme==='snow'){if(R()<.55)continue;gc.setHSL(.09+R()*.03,.18+R()*.1,.36+R()*.14).convertSRGBToLinear();}else gc.setHSL(dry?.1+R()*.04:.17+R()*.06,dry?.3+R()*.12:.26+R()*.14,dry?.42+R()*.12:.26+R()*.09).convertSRGBToLinear();gm.setColorAt(n,gc);n++;}
    {const rg=new THREE.IcosahedronGeometry(1,2);const rp=rg.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),j=1+.18*Math.sin(x*3.1+z*2.3)+.1*Math.sin(y*4.7+x*1.9);rp.setXYZ(i,x*j,y*.55*j,z*j);}rg.computeVertexNormals();const rmat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});if(typeof weather==='function')weather(rmat,1.3,0);const NR=Math.round(2200*Math.min(2.5,AREA)),rim=new THREE.InstancedMesh(rg,rmat,NR);let rn=0;const rc=new THREE.Color();
      for(let k=0;k<NR*3&&rn<NR;k++){const x=R()*MAPW,y=R()*MAPH,M=G.map;if(Math.abs(M.depth(x,y))<M.hw(x)+20)continue;if(BASES.some(([bx,by])=>Math.abs(x-bx)<280&&Math.abs(y-by)<280))continue;if(G.roadMask){const q=G.roadMask;if(q.d[(y/q.C|0)*q.w+(x/q.C|0)])continue;}
        const s2=R()<.9?.6+R()*1.4:2+R()*3;TMPM.compose(TMP.set(x,groundH(x,y)+s2*.04,y),TMPQ.setFromEuler(new THREE.Euler(R()*.5,R()*6.3,R()*.5)),new THREE.Vector3(s2*(1+R()*.6),s2,s2));rim.setMatrixAt(rn,TMPM);rc.setHSL(.07+R()*.05,.08+R()*.14,R()<.3?.36+R()*.1:.5+R()*.16).convertSRGBToLinear();rim.setColorAt(rn,rc);rn++;}
      rim.count=rn;rim.castShadow=true;rim.receiveShadow=true;rim.userData.noDepth=true;WORLD.add(rim);}
    gm.count=n;gm.receiveShadow=true;gm.userData.noDepth=true;WORLD.add(gm);}
  // oil derricks
  mats();G.oilObj=G.oil.map(o=>{const grp=new THREE.Group();const B=Bld(),fr='#4f555b',dk='#2c2e2c';
    B.box(46,2.4,24,0,1.2,0,'#8a877d');B.box(10,1,10,20,2.6,0,'#6f6c63');
    for(const z of [-5,5]){B.box(2.2,32,2.2,-4,16,z*1.25,fr,z>0?-.16:.16,0,0);B.box(2.2,30,2.2,4,15,z*1.25,fr,z>0?-.16:.16,0,0);}
    B.box(10,1.4,1.4,0,8,-5.5,fr);B.box(10,1.4,1.4,0,8,5.5,fr);B.box(4,2,6,0,31,0,dk);
    B.box(8,7,7,-17,5.5,0,'#55595c');B.cyl(1.6,1.6,10,10,-17,8,0,dk,Math.PI/2);B.box(7,5,6,-27,4.4,0,'#6c7074');B.cyl(1,1,8,8,-23,5,3,dk,0,0,Math.PI/2);
    B.cyl(1.4,1.4,6,8,20,5,0,'#6d6f6c');B.box(5,2,2,20,6,0,'#9b3a2c');B.cyl(.6,.6,14,6,26,3.4,0,'#55595c',0,0,Math.PI/2);
    B.cyl(6,6,13,16,8,8.9,17,'#9a968a');B.cyl(6.3,6.3,1,16,8,15.6,17,'#6d6a62');B.cyl(.5,.5,22,6,-6,3,17,'#55595c',0,0,Math.PI/2);
    const base=mesh(B.geo());grp.add(base);
    const crank=new THREE.Group();crank.position.set(-17,8,0);const C=Bld();for(const z of [-5.4,5.4]){C.box(14,3,1.2,0,0,z,'#8c2e22');C.cyl(4,4,1.6,14,6,0,z,'#7a2a20',Math.PI/2);}const cm=mesh(C.geo());crank.add(cm);grp.add(crank);
    const A=Bld();A.box(40,3,3,2,0,0,'#c9a227');A.box(4,12,3.6,22.5,-3.5,0,'#c9a227',0,0,-.12);A.cyl(6,6,3.6,14,21,-1,0,'#c9a227',Math.PI/2);A.box(5,4,4,-18,-2.5,0,'#3e4246');A.box(1,22,1,-18,-14,-4.4,dk);A.box(1,22,1,-18,-14,4.4,dk);
    A.cyl(.35,.35,26,5,25.5,-14,0,'#9aa0a3');const arm=mesh(A.geo());arm.position.set(0,32,0);grp.add(arm);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshBasicMaterial({color:0x888888,side:THREE.DoubleSide}));flag.position.set(-26,22,-9);grp.add(flag);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,24,6),MAT.std);pole.position.set(-31,12,-9);grp.add(pole);
    grp.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    grp.position.set(o.x,groundH(o.x,o.y),o.y);grp.rotation.y=(o.x*.01)%6;WORLD.add(grp);return{grp,arm,flag,crank};});
  // supply depots
  G.fieldObj=G.fields.map((f,fi)=>{const grp=new THREE.Group();grp.position.set(f.x,groundH(f.x,f.y),f.y);WORLD.add(grp);const items=[];const R=mulberry(fi*13+5);
    const pad=Bld();pad.box(f.r*2.1,1,f.r*1.7,0,.5,0,'#7e7462');const pm=mesh(pad.geo());pm.receiveShadow=true;grp.add(pm);
    if(MODELS.ready){for(let gx=-2;gx<=2;gx++)for(let gz=-1;gz<=1;gz++){if(R()<.15)continue;const x=gx*17+R()*3,z=gz*20+R()*3,st=new THREE.Group();st.position.set(x,1,z);st.rotation.y=(R()-.5)*.4;grp.add(st);
        propObj('pallet',0,0,0,st);const hgt=1+(R()*3|0);for(let k=0;k<hgt;k++){const m=propObj(R()<.2?'barrel':'crate',(R()-.5)*1.5,0,R()*.3,st);if(m)m.position.y=1.6+k*8;}items.push(st);}
      propObj('container',-f.r-6,0,Math.PI/2,grp);propObj('containerG',f.r+8,6,Math.PI/2+.05,grp);propObj('sandbag',0,f.r*.9+6,0,grp);}
    return{grp,items,n:items.length};});
  // fog of war overlay
  {const fk=Math.min(1.4,Math.max(1,WK*.65));FOGC=document.createElement('canvas');FOGC.width=Math.round(480*fk);FOGC.height=Math.round(330*fk);FOGC.b=document.createElement('canvas');FOGC.b.width=FOGC.width;FOGC.b.height=FOGC.height;}FOGT=new THREE.CanvasTexture(FOGC);FOGT.magFilter=THREE.LinearFilter;
  FOGM=new THREE.Mesh(new THREE.PlaneGeometry(MAPW,MAPH).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x060a0f,transparent:true,alphaMap:FOGT,depthWrite:false}));FOGM.position.set(MAPW/2,46,MAPH/2);FOGM.renderOrder=2;WORLD.add(FOGM);
  buildDecals();for(const [x,y,r] of (G.craters||[]))scorch(x,y,r);applyWeather(typeof setup!=='undefined'?(setup.w|0):0);
}

/* ---------- procedural model builder (merged, vertex-coloured) ---------- */
const MAT={std:null,glow:null,glass:null,char:null};
function mats(){if(MAT.std)return;MAT.std=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.18});if(typeof weather==='function')weather(MAT.std,.8);MAT.char=new THREE.MeshStandardMaterial({color:lin('#26231f'),roughness:1});
  MAT.glow=new THREE.MeshBasicMaterial({color:lin('#ffcf7a')});MAT.ghostOk=new THREE.MeshBasicMaterial({color:0x74d08f,transparent:true,opacity:.42,depthWrite:false});MAT.ghostBad=new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.42,depthWrite:false});MAT.ghostDz=new THREE.MeshBasicMaterial({color:0xe3b341,transparent:true,opacity:.42,depthWrite:false});}
function Bld(){const parts=[];const E=new THREE.Euler();const add=(g,x,y,z,c,rx=0,ry=0,rz=0)=>{TMPM.compose(TMP.set(x,y,z),TMPQ.setFromEuler(E.set(rx,ry,rz)),new THREE.Vector3(1,1,1));parts.push({g,m:TMPM.clone(),c:typeof c==='string'?lin(c):c});return api;};
  const api={box:(w,h,d,x,y,z,c,rx,ry,rz)=>add(new THREE.BoxGeometry(w,h,d),x,y,z,c,rx,ry,rz),cyl:(rt,rb,h,seg,x,y,z,c,rx,ry,rz)=>add(new THREE.CylinderGeometry(rt,rb,h,seg),x,y,z,c,rx,ry,rz),
    cone:(r,h,seg,x,y,z,c,rx,ry,rz)=>add(new THREE.ConeGeometry(r,h,seg),x,y,z,c,rx,ry,rz),sph:(r,x,y,z,c,sx=1,sy=1,sz=1)=>{const g=new THREE.SphereGeometry(r,10,8);g.scale(sx,sy,sz);return add(g,x,y,z,c);},
    tor:(r,t,x,y,z,c,rx=Math.PI/2,ry=0)=>add(new THREE.TorusGeometry(r,t,6,16),x,y,z,c,rx,ry),half:(r,len,x,y,z,c,ry=0)=>add(new THREE.CylinderGeometry(r,r,len,14,1,false,0,Math.PI),x,y,z,c,0,ry,Math.PI/2),
    geo:()=>merge(parts),_p:parts};return api;}
function parts_add(B,g,x,y,z,c){B._p.push({g,m:new THREE.Matrix4().makeTranslation(x,y,z),c});}
function merge(parts){let n=0;const L=[];for(const p of parts){const g=(p.g.index?p.g.toNonIndexed():p.g);g.applyMatrix4(p.m);L.push([g,p.c]);n+=g.attributes.position.count;}
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;for(const [g,c] of L){const cnt=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);for(let i=0;i<cnt;i++){C[(o+i)*3]=c.r;C[(o+i)*3+1]=c.g;C[(o+i)*3+2]=c.b;}o+=cnt;}
  let y0=1e9,y1=-1e9;for(let i=1;i<P.length;i+=3){y0=Math.min(y0,P[i]);y1=Math.max(y1,P[i]);}const hh=Math.max(1,y1-y0);for(let i=0;i<n;i++){const k=Math.min(1,(P[i*3+1]-y0)/(hh*.55));const ao=.5+.5*k*k*(3-2*k);const up=Math.max(0,N[i*3+1]);const f=ao*(.92+.08*up);C[i*3]*=f;C[i*3+1]*=f;C[i*3+2]*=f;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.computeBoundingSphere();return g;}
const GEO={};
function camo(team){const c=new THREE.Color(team.color);return '#'+c.lerp(new THREE.Color('#5f5f4a'),.66).getHexString();}
const GEO_ALIAS={lander:'boat',airlift:'heli',mortar:'inf',recon:'inf',officer:'hero',medic:'inf',commissar:'hero',sapper:'inf',guer:'inf',atk:'at',idome:'aa',ew:'aa',cbr:'aa',jeep:'aa',raidlead:'aa'};
function geoFor(kind,fac,team,part){if(GEO_ALIAS[kind])kind=GEO_ALIAS[kind];const key=kind+fac+team.color+part;if(GEO[key])return GEO[key];const tc=team.color,hc=camo(team),dk='#2b2d26',mt='#55574e',cn='#9a988c',cl='#7d7c70';const B=Bld();let s=FACTIONS[fac].units[kind]||{};
  switch(kind+':'+part){
    case 'inf:body':case 'at:body':case 'hacker:body':case 'hero:body':{const n={inf:3,at:2,hacker:2,hero:1}[kind];const pos=[[3,0],[-4,-5],[-4,5]].slice(0,n);if(n===2){pos[0]=[2,-3.5];pos[1]=[-3,3.5];}if(n===1)pos[0]=[0,0];
      for(const [px,pz] of pos){const uni=kind==='hero'?'#2c3027':'#5d6146';const kneel=kind==='hacker';B.box(2.6,kneel?3:5,3.2,px,kneel?1.5:2.5,pz,uni);B.box(3,4.2,3.6,px,kneel?4.6:6.6,pz,tc);B.sph(1.6,px,kneel?7.6:9.8,pz,'#c7a27c');B.sph(1.85,px,kneel?8.2:10.4,pz,kind==='hero'?'#1e211b':'#4a4e36',1,.65,1);
        if(kind==='at'&&px>0)B.cyl(.9,.9,11,6,px+1,9.4,pz-1.6,'#3d4230',0,0,Math.PI/2);else if(kind==='hacker')B.box(5,.5,4,px+4,1,pz,'#202226');else B.box(7,.9,.9,px+3.5,6.6,pz+1.2,dk);}
      if(kind==='hacker'){B.box(4.6,3,.3,6,2.8,-3.5,'#202226',-.35);B.box(4.6,3,.3,4,2.8,3.5,'#202226',-.35);}break;}
    case 'tank:hull':B.box(30,5,7,0,3.5,-8,dk);B.box(30,5,7,0,3.5,8,dk);for(let i=-12;i<=12;i+=6){B.cyl(2.6,2.6,4,8,i,2.6,-10.6,'#3a3c34',Math.PI/2);B.cyl(2.6,2.6,4,8,i,2.6,10.6,'#3a3c34',Math.PI/2);}
      B.box(29,5,16,0,7.5,0,hc);B.box(8,3,15,13,6.5,0,hc,0,0,-.5);B.box(26,.6,2,0,10.2,-7,tc);B.box(26,.6,2,0,10.2,7,tc);B.box(4,2,4,-12,10.5,-4,mt);break;
    case 'tank:turret':B.box(15,6,13,-1,3,0,hc);B.box(6,5,12,7,2.6,0,hc,0,0,.25);B.cyl(1.3,1.5,20,8,15,3.3,0,mt,0,0,Math.PI/2);B.cyl(2,2,3,8,25,3.3,0,dk,0,0,Math.PI/2);B.cyl(2.2,2.2,1.5,10,-4,6.8,3,mt);B.box(10,.6,13.2,-2,6.1,0,tc);break;
    case 'arty:hull':if(s.rocket){for(const x of [-10,-1,9])for(const z of [-8,8])B.cyl(3,3,3,10,x,3,z,'#26271f',Math.PI/2);B.box(26,4,15,0,6,0,dk);B.box(9,9,15,10,10,0,hc);B.box(.5,4,12,14.6,12,0,'#7fa7b5');B.box(18,.6,2,-4,8.2,-7,tc);}
      else{B.box(32,5,6,0,3.5,-7.5,dk);B.box(32,5,6,0,3.5,7.5,dk);B.box(30,5,15,0,7.5,0,hc);B.box(28,.6,2,0,10.2,-6.6,tc);}break;
    case 'arty:turret':if(s.rocket){B.box(17,7,13,-4,4.5,0,'#3d4033',0,0,.32);for(let i=0;i<3;i++)for(let j=0;j<4;j++)B.cyl(1.1,1.1,1,6,4.2,6.6+i*2.2,-4.5+j*3,'#141510',0,0,Math.PI/2+.32);}
      else{B.box(16,9,14,-6,4.5,0,hc);B.box(8,.6,14.2,-6,9.1,0,tc);B.cyl(1.3,1.6,28,8,14,7,0,mt,0,0,Math.PI/2-.2);B.cyl(2,2,3,8,27,9.8,0,dk,0,0,Math.PI/2-.2);}break;
    case 'aa:hull':B.box(28,5,6,0,3.5,-7.5,dk);B.box(28,5,6,0,3.5,7.5,dk);B.box(27,5,15,0,7.5,0,hc);B.box(24,.6,2,0,10.2,-6.6,tc);break;
    case 'aa:turret':B.box(12,7,11,0,3.5,0,hc);B.cyl(.8,.8,16,6,8,7,-4,mt,0,0,Math.PI/2-.6);B.cyl(.8,.8,16,6,8,7,4,mt,0,0,Math.PI/2-.6);B.cyl(4,4,.6,12,-4,10,0,cn,.3);B.box(1,4,1,-4,8,0,dk);break;
    case 'harv:hull':for(const x of [-10,-2,9])for(const z of [-8,8])B.cyl(3,3,3,10,x,3,z,'#202119',Math.PI/2);B.box(24,4,15,-2,6,0,dk);B.box(17,7,15,-5,11,0,'#6c6a5c');B.box(8,9,15,11,10.5,0,hc);B.box(.5,4,12,15.2,12,0,'#7fa7b5');B.box(8,.6,15.2,11,15.2,0,tc);break;
    case 'harv:cargo':for(const [x,z] of [[-9,-4],[-2,-4],[-9,3],[-2,3]])B.box(6,5,6,x,17,z,'#c99a2e');break;
    case 'drone:body':B.cone(11,24,3,0,0,0,'#c4bea9',0,0,-Math.PI/2);B.box(3,2.5,3,-10,0,0,'#7a7566');B.cone(2.5,6,3,-8,0,-8,tc,0,0,-Math.PI/2);B.cone(2.5,6,3,-8,0,8,tc,0,0,-Math.PI/2);break;
    case 'heli:body':B.sph(7,4,0,0,hc,1.5,.8,.8);B.cyl(1.6,3,22,8,-14,1,0,hc,0,0,Math.PI/2);B.box(5,7,1.2,-24,4,0,hc);B.box(6,1,9,-22,4,0,hc);B.sph(3.8,10,1.5,0,'#6f8fa0',1.2,.75,.8);
      B.box(14,.8,1,2,-6,-5,dk);B.box(14,.8,1,2,-6,5,dk);B.box(1,5,1,6,-4,-5,dk);B.box(1,5,1,-2,-4,-5,dk);B.box(1,5,1,6,-4,5,dk);B.box(1,5,1,-2,-4,5,dk);
      B.box(4,1,20,0,-1,0,mt);B.cyl(1.4,1.4,7,6,1,-2.5,-9,dk,0,0,Math.PI/2);B.cyl(1.4,1.4,7,6,1,-2.5,9,dk,0,0,Math.PI/2);B.box(18,.7,2.2,-6,5.3,0,tc);B.cyl(1.2,1.2,5,6,1,6,0,dk);break;
    case 'heli:rotor':B.box(48,.5,2.4,0,0,0,'#1d1e1a');B.box(2.4,.5,48,0,0,0,'#1d1e1a');B.cyl(2,2,1.5,8,0,0,0,mt);break;
    case 'jet:body':B.cyl(2.2,3.4,30,10,0,0,0,'#8e9399',0,0,Math.PI/2);B.cone(2.2,9,10,19.5,0,0,'#8e9399',0,0,-Math.PI/2);B.sph(2.4,8,2.2,0,'#3b4f5c',1.8,.7,.8);
      B.cone(16,22,3,-3,0,0,'#7f858c',0,0,-Math.PI/2);B.box(6,6,.8,-13,4,-4,'#7f858c',.3);B.box(6,6,.8,-13,4,4,'#7f858c',-.3);B.box(9,.4,3,-12,.5,-6,tc);B.box(9,.4,3,-12,.5,6,tc);B.box(16,.5,1.2,0,3.2,0,tc);break;
    case 'jet:glow':B.cyl(2.6,2.6,1,10,-15.5,0,0,'#ffb35a',0,0,Math.PI/2);break;
    case 'boat:hull':B.box(26,5,11,-2,2,0,hc);B.cone(5.5,10,4,15,2,0,hc,0,Math.PI/4,-Math.PI/2);B.box(10,6,8,-3,7,0,cn);B.box(4,1,7,1,10.2,0,'#3b4f5c');B.box(26,.8,11.4,-2,4.5,0,tc);B.cyl(.5,.5,10,5,-5,14,0,dk);break;
    case 'boat:turret':B.cyl(2.4,2.8,3,8,0,1.5,0,mt);B.cyl(.6,.6,9,6,4.5,2.6,0,dk,0,0,Math.PI/2);break;
    case 'ship:hull':B.box(70,8,17,-4,1,0,'#7d8186');B.cone(8.5,16,4,39,1,0,'#7d8186',0,Math.PI/4,-Math.PI/2);B.box(70,1,17.4,-4,5,0,tc);
      B.box(20,10,12,-8,10,0,'#9aa0a5');B.box(10,9,10,-8,19,0,'#9aa0a5');B.box(9,2,10.4,-8,15,0,'#2e3c45');B.cyl(.8,1,18,6,-8,30,0,dk);B.box(8,.6,.6,-8,36,0,dk);B.box(6,3,10,-26,7,0,'#8b9095');B.cyl(2.6,2.6,7,10,-34,8,0,'#5d6166');
      B.box(8,2,8,22,6,0,'#5f6469');break;
    case 'ship:turret':B.box(9,4.5,8,0,2.2,0,'#8b9095');B.box(4,4.5,8,4,2,0,'#8b9095',0,0,.4);B.cyl(1,1.2,14,8,10,2.8,0,mt,0,0,Math.PI/2);break;
    // structures
    case 'hq:main':{B.box(84,6,84,0,3,0,cl);B.box(76,26,76,0,19,0,cn);B.box(76,2,76,0,33,0,'#83827a');B.box(78,3,78,0,30,0,tc);
      for(let i=-30;i<=30;i+=10){B.box(6,6,.6,i,20,38.3,'#2c3d48');B.box(6,6,.6,i,20,-38.3,'#2c3d48');B.box(.6,6,6,38.3,20,i,'#2c3d48');B.box(.6,6,6,-38.3,20,i,'#2c3d48');}
      B.box(34,14,34,14,40,14,cl);B.box(34,1.2,34,14,47.6,14,tc);B.cyl(15,15,1,24,-16,34.6,-16,'#55574f');B.cyl(11,11,1.1,24,-16,34.7,-16,'#d8d4c4');B.cyl(10,10,1.2,24,-16,34.8,-16,'#55574f');
      B.box(2,.4,10,-19,35.6,-16,'#e2ddca');B.box(2,.4,10,-13,35.6,-16,'#e2ddca');B.box(6,.4,2,-16,35.6,-16,'#e2ddca');B.cyl(.6,.6,30,6,28,62,28,dk);B.box(16,8,6,0,4,42,'#4c4e47');B.box(18,2,8,0,9,43,tc);break;}
    case 'hq:dish':B.cyl(.8,.8,6,6,0,3,0,dk);B.cyl(9,3,2,16,0,7,0,'#c9c6ba',.5);break;
    case 'barracks:main':B.box(64,3,64,0,1.5,0,cl);B.half(22,58,0,3,0,'#7e7b60');for(let x=-27;x<=27;x+=9)B.tor(22.2,.5,x,3,0,'#5e5c48',0,Math.PI/2);B.box(4,10,1,0,8,-22.5,'#2e2f28');B.box(58,1.2,4,0,25,0,tc);
      B.box(1,26,1,26,16,26,dk);B.box(10,6,.4,31,26,26,tc);for(let i=-20;i<=20;i+=5)B.box(4.5,3,3,i,4.5,29,'#968660');break;
    case 'factory:main':B.box(80,4,80,0,2,0,cl);B.box(72,24,62,0,16,-4,'#868478');for(let z=-30;z<=22;z+=13)B.box(72,9,2,0,30,z,'#6f9fb0',.9);for(let z=-26;z<=26;z+=13)B.box(72,8,7,0,30,z-3,'#77756a',-.6);
      B.box(34,20,1,0,13,27.6,'#2a2a26');for(let i=0;i<5;i++)B.box(34,1,1.2,0,5+i*4,28.2,i%2?'#d9a826':'#1c1a14');B.box(72,2,2,0,27.5,27,tc);B.cyl(4,5,40,10,28,24,-26,'#4a4a45');B.cyl(4.4,4.4,2,10,28,44,-26,tc);break;
    case 'airfield:main':B.box(96,2,96,0,1,0,'#8a8a82');B.box(90,.4,22,0,2.2,30,'#5a5b55');for(let x=-38;x<=38;x+=12)B.box(6,.3,1.4,x,2.5,30,'#e6e2d2');
      for(const [x,z] of [[-26,-22],[26,-22],[-26,22],[26,22]])B.box(26,.3,20,x,2.3,z-10,'#6e6f68');B.half(16,30,-30,2,-34,'#7a7c74',Math.PI/2);B.cyl(4,5,26,8,38,15,-38,cn);B.box(12,6,12,38,31,-38,'#3d5562');B.box(13,1.2,13,38,34.6,-38,tc);B.box(96,.5,3,0,2.6,-47,tc);break;
    case 'shipyard:main':B.box(70,5,70,0,2.5,0,cl);B.box(30,16,34,-14,13,-14,'#7d7b70');B.box(31,1.5,35,-14,21.5,-14,tc);for(let i=0;i<6;i++)B.cyl(1.6,1.6,10,6,-30+i*12,1,33,'#3c3a33');B.box(70,1.5,4,0,5.5,33,'#d9a826');break;
    case 'shipyard:crane':B.box(4,44,4,0,22,0,'#d9a826');B.box(46,3,3,12,44,0,'#d9a826');B.box(8,6,6,-8,42,0,'#4a4a45');B.cyl(.3,.3,20,4,32,34,0,dk);break;
    case 'garrison:main':{B.box(.8,0.1,.8,0,0,0,'#222');break;}
    case 'econ:main':{B.box(58,3,58,0,1.5,0,cl);B.box(40,22,30,-4,14,-6,'#c9c2b0');B.box(42,2,32,-4,26,-6,'#7d786c');for(let i=-3;i<=3;i++)B.box(3.4,14,1,-4+i*5.4,12,9.6,'#3d4a52');
      B.box(40,3,1.2,-4,21,9.8,tc);B.cyl(7,8,6,10,-4,29,-6,'#b7ad92');B.sph(6.5,-4,33,-6,'#c9a54a');B.box(1,14,1,14,33,-14,'#5a5c52');B.box(9,5,.6,14,38,-14,tc);
      for(const [x,z] of [[20,14],[24,14],[20,19]])B.box(3.5,3.5,3.5,x,4.8,z,'#5d7a3e');B.box(6,1.2,10,-22,3.6,16,'#3a3b34');break;}
    case 'depot:main':{B.box(56,3,56,0,1.5,0,cl);B.box(30,16,24,-8,9,-8,cn);B.box(32,2,26,-8,18,-8,'#6f6e66');B.box(30,2.5,1,-8,13,4.6,tc);
      B.box(14,9,1.2,-8,7,4.3,'#26261f');for(const [x,z] of [[14,-14],[20,-14],[14,-8],[20,-8],[17,-11]])B.box(5,5,5,x,5.5,z,'#c99a2e');B.box(5,5,5,17,10.5,-11,'#b2862a');
      B.box(2,22,2,16,11,12,'#5a5c52');B.box(2,22,2,-20,11,12,'#5a5c52');B.box(38,2,2,-2,22,12,'#5a5c52');B.box(4,6,4,4,17,12,'#3a3b34');
      for(let x=-22;x<=22;x+=11)B.box(6,.4,1.2,x,3.2,20,'#e8e3cf');break;}
    case 'tunnel:main':B.cyl(17,22,7,12,0,3.5,0,'#8a7656');B.cyl(10,15,4,10,0,9,0,'#7a6849');B.box(13,10,9,0,5,15,'#1c1814');B.box(15,2,10,0,10.5,15,'#5d5a50');for(let i=0;i<9;i++){const a=i/9*6.28;B.box(6,3,3.5,Math.cos(a)*21,1.5,Math.sin(a)*21,'#a08d68',0,-a,0);}break;
    case 'tunnel:gun':B.cyl(2.4,2.8,3,8,0,8,0,'#3b3d36');B.box(12,1.6,1.6,6,9.5,0,'#2c2e29');break;
    case 'turret:main':B.tor(15,4.2,0,3.5,0,'#968660');B.cyl(10,12,7,12,0,3.5,0,'#6d6c62');break;
    case 'turret:gun':B.cyl(8,9,6,12,0,3,0,tc);B.box(8,5,10,2,4,0,hc);B.cyl(1.1,1.1,20,6,13,4,-2.5,dk,0,0,Math.PI/2);B.cyl(1.1,1.1,20,6,13,4,2.5,dk,0,0,Math.PI/2);break;
    case 'sam:main':B.cyl(14,16,4,12,0,2,0,'#6d6c62');B.box(26,1,26,0,4.5,0,'#55574e');break;
    case 'sam:gun':B.cyl(3,3,6,8,0,3,0,dk);B.box(12,9,12,0,9,0,hc,0,0,.6);for(const [y,z] of [[-2.5,-2.8],[-2.5,2.8],[2.5,-2.8],[2.5,2.8]])B.cyl(1.6,1.6,1,8,5.4,9+y,z,'#e2ddca',0,0,Math.PI/2+.6);B.box(12.2,1,1,0,13.5,0,tc,0,0,.6);break;
    case 'uplink:main':{const st=(UPLINK[fac]||[])[1]||'silo';
      if(st==='vls'){B.box(74,4,74,0,2,0,cl);B.box(60,16,60,0,12,0,'#7a7d76');B.box(36,2,36,0,20.5,0,'#1d1e1b');for(let i=-1;i<=1;i+=2)for(let j=0;j<4;j++){B.box(8,1.4,8,i*24,20.6,-21+j*14,'#5e615a');B.box(6,.6,6,i*24,21.5,-21+j*14,'#3a3c37');}
        B.box(62,1.6,2,0,20.6,30,tc);B.box(62,1.6,2,0,20.6,-30,tc);B.cyl(1,1.4,30,6,26,35,26,dk);B.box(10,6,1,26,50,26,'#c9ccc4',0,.6,0);B.box(12,8,10,-24,8,30,'#6c6f68');break;}
      if(st==='tel'){B.box(76,3,76,0,1.5,0,cl);B.box(38,8,38,0,7,0,'#73756c');B.box(36,2,36,0,11.5,0,'#1d1e1b');
        for(const sx of [-1,1]){const x=sx*28;B.box(10,6,30,x,6,0,'#4f5a3c');B.box(9,5,8,x,9,-13,'#55603f');for(const z of [-10,-2,6,12])B.cyl(2,2,1.6,8,x+(sx*5.5),2.5,z,'#1d1d1b',0,0,Math.PI/2);
          B.cyl(2.6,2.6,26,10,x,19,4,'#d6d2c4',.9,0,0);B.cone(2.6,6,10,x,19+Math.cos(.9)*15,4-Math.sin(.9)*15,'#c4392c',.9,0,0);B.box(1.2,14,1.2,x,13,10,'#3c3e38',.6,0,0);}
        B.box(14,10,12,0,6,30,'#6c6f68');B.box(15,1,13,0,11.5,30,tc);break;}
      if(st==='city'){B.box(80,3,80,0,1.5,0,'#8d7d63');{const g=new THREE.CylinderGeometry(30,34,70,16,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.rotateY(Math.PI/2);B._p.push({g,m:new THREE.Matrix4().makeTranslation(0,0,0),c:lin(fac==='RS'?'#7a6b58':'#9b8463')});}
        B.box(36,2,36,0,30.5,0,'#1d1e1b');B.box(18,20,4,0,10,36,'#2a2724');B.box(22,3,5,0,21,36,'#5c554a');B.box(24,2.4,5,0,24,36,tc);for(const sx of [-1,1])B.box(3,22,5,sx*11,11,36,'#4d4840');B.box(6,1,40,0,.6,54,'#5a5348');break;}
      if(st==='air'){B.box(80,3,80,0,1.5,0,cl);{const g=new THREE.CylinderGeometry(22,22,56,16,1,false,0,Math.PI);g.rotateZ(Math.PI/2);B._p.push({g,m:new THREE.Matrix4().makeTranslation(0,3,0),c:lin('#7c7f78')});}
        B.box(36,2,36,0,25.5,0,'#1d1e1b');B.box(40,18,2,0,12,-28,'#3e403b');B.box(10,26,10,30,16,28,'#8a8c84');B.box(14,6,14,30,32,28,'#4a5a66');B.box(80,.4,6,0,3.3,40,'#e8e3cf');B.box(2,.5,28,-30,3.3,26,'#e8e3cf');break;}
      if(st==='rock'){B.box(72,3,72,0,1.5,0,'#8d7d63');for(let i=0;i<10;i++){const a=i/10*6.283;B.box(10,5,6,Math.cos(a)*32,4,Math.sin(a)*32,'#9b8a66',0,-a,0);}B.box(36,2,36,0,4,0,'#1d1e1b');
        for(const sx of [-1,1])for(let r=0;r<2;r++){const x=sx*22,z=-16+r*30;B.box(10,3,14,x,5,z,'#4f4a3c');for(let q=0;q<4;q++)B.cyl(.9,.9,16,6,x-3+q*2,11,z,'#3a3832',.7,0,0);}B.box(14,9,12,0,6,30,'#6c6355');break;}
      B.box(74,6,74,0,3,0,cl);B.box(66,20,66,0,16,0,'#76786f');B.box(36,2,36,0,26.5,0,'#1d1e1b');B.box(68,2,4,0,25.2,32,tc);B.box(68,2,4,0,25.2,-32,tc);B.box(4,2,68,32,25.2,0,tc);B.box(4,2,68,-32,25.2,0,tc);B.cyl(.8,.8,34,6,28,40,28,dk);B.cyl(.8,.8,34,6,-28,40,28,dk);break;}
    case 'uplink:door':B.box(18,2,36,0,0,0,'#8e9088');B.box(2,2.2,36,8,0,0,'#d9a826');break;
    case 'uplink:missile':B.cyl(4,4,24,10,0,12,0,'#d8d4c6');B.cone(4,9,10,0,28,0,'#c4392c');break;
    case 'plane:body':B.cyl(5,6,60,10,0,0,0,'#7c8086',0,0,Math.PI/2);B.cone(5,10,10,35,0,0,'#7c8086',0,0,-Math.PI/2);B.box(18,1.2,80,-2,2,0,'#6f7378');B.box(10,10,1.2,-27,6,0,'#6f7378');B.box(10,1,26,-27,2,0,'#6f7378');B.box(20,.6,1.4,-2,2.8,-30,tc);B.box(20,.6,1.4,-2,2.8,30,tc);break;
    default:B.box(10,10,10,0,5,0,'#ff00ff');
  }
  return GEO[key]=B.geo();}
function mesh(g){const m=new THREE.Mesh(g,MAT.std);m.castShadow=true;m.receiveShadow=true;return m;}
function makeObj(e){mats();if(e.kind==='cleric')return clericModel(e);if(!e.isB){const mo=modelFor(e);if(mo)return mo;}const T=G.teams[e.team],f=T.fac,k=e.kind,o=new THREE.Group();o.userData.parts={};const P=o.userData.parts;
  const add=(part,parent=o)=>{const m=mesh(geoFor(k,f,T,part));parent.add(m);P[part]=m;return m;};
  if(e.isB){const eS=k==='garrison'?e:Object.assign(Object.create(e),{size:e.size/BSC});const mb=(k==='airfield'||k==='uplink')?false:bldModel(eS,o,T);if(mb){}else if(k==='hq'){add('main');const d=add('dish');d.position.set(14,48,14);}else if(k==='turret'||k==='sam'||k==='tunnel'){add('main');const g=add('gun');g.position.y=k==='tunnel'?4:6;}
    else if(k==='shipyard'){add('main');const c=add('crane');c.position.set(22,5,22);}else if(k==='uplink'){add('main');const m=add('missile');m.position.y=4;const a=mesh(geoFor(k,f,T,'door')),b=mesh(geoFor(k,f,T,'door'));const HY={vls:21.6,tel:12.6,city:31.6,air:26.6,rock:5}[(UPLINK[f]||[])[1]]||27.5;a.position.set(-9,HY,0);b.position.set(9,HY,0);b.rotation.y=Math.PI;o.add(a);o.add(b);P.da=a;P.db=b;P.hy=HY-27.5;}
    else add('main');
    if(!mb&&(k==='airfield'||k==='uplink'))bldModel(eS,o,T);
    if(k==='garrison'){const c=civAtXYAny(e.x,e.y),h=c?c.h:14;const fg=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,16,6),new THREE.MeshStandardMaterial({color:0x8a8a84}));pole.position.y=8;fg.add(pole);const fl=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshStandardMaterial({color:new THREE.Color(T.color),side:THREE.DoubleSide,emissive:new THREE.Color(T.color),emissiveIntensity:.25}));fl.position.set(5,13,0);fg.add(fl);fg.position.y=h;o.add(fg);P.flag=fl;}
    decorateBld(eS,o);
    const sw=eS.size+6,sh=BH[k]/BSC+6,nseg=Math.max(2,Math.round(sw/14)),sc=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(sw,sh,sw,nseg,Math.max(2,Math.round(sh/9)),nseg)),new THREE.LineBasicMaterial({color:0x8f8b80,transparent:true,opacity:.85}));sc.position.y=sh/2;o.add(sc);P.scaf=sc;}
  else{const c=e.s.cls;o.scale.setScalar(c==='ship'?1.15:['inf','at','hacker','hero'].includes(c)?1.7:1.3);
    if(['inf','at','hacker','hero'].includes(c))add('body');
    else if(c==='tank'||c==='arty'||c==='aa'){add('hull');const t=add('turret');t.position.set(c==='arty'&&!e.s.rocket?-4:0,10,0);}
    else if(c==='harv'){add('hull');add('cargo');}
    else if(c==='dozer'){const h=new THREE.Mesh(geoFor('harv',f,T,'hull'),MAT.std);h.castShadow=true;o.add(h);P.hull=h;const B=Bld();B.box(2.4,6.5,20,15,3.2,0,'#d9a21f');B.box(20,2,2,-2,20,0,'#d9a21f');const cm=new THREE.Mesh(B.geo(),MAT.std);o.add(cm);}
    else if(c==='drone')add('body');
    else if(c==='heli'){add('body');const r=add('rotor');r.position.set(1,8.6,0);r.castShadow=false;}
    else if(c==='jet'){add('body');const g=new THREE.Mesh(geoFor(k,f,T,'glow'),MAT.glow);o.add(g);P.glow=g;}
    else if(c==='boat'){add('hull');const t=add('turret');t.position.set(9,5,0);}
    else if(c==='ship'){add('hull');const t=add('turret');t.position.set(24,7,0);}}
  SCN.add(o);return o;}
function makeGhost(kind){mats();const T=G.teams[ME],o=new THREE.Group();const g=geoFor(kind,T.fac,T,'main');o.add(new THREE.Mesh(g,MAT.ghostOk));if(kind==='turret'||kind==='sam'){const m=new THREE.Mesh(geoFor(kind,T.fac,T,'gun'),MAT.ghostOk);m.position.y=6;o.add(m);}
  const ring=new THREE.Mesh(new THREE.RingGeometry(1,1.02,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x74d08f,transparent:true,opacity:.6}));o.add(ring);o.userData.ring=ring;SCN.add(o);return o;}

const WX=[{sun:'#ffeccc',si:2.7,off:[-900,860,-620],sky:'#a9c4ec',gnd:'#9c8058',hi:1.2,fog:'#c4ae86',expo:.9,cl:.6,sr:2},
  {sun:'#ffc283',si:3.0,off:[-1150,470,-520],sky:'#9fb2d4',gnd:'#7a5a3c',hi:1.12,fog:'#c09a72',expo:1.04,cl:.7,sr:2},
  {sun:'#e4e9ef',si:1.15,off:[-450,1150,-300],sky:'#b7bfc8',gnd:'#625d51',hi:1.6,fog:'#a2a7a9',expo:.98,cl:0,sr:6}];
function applyWeather(i){const w=WX[i]||WX[0];if(!SUN)return;SUN.color.copy(lin(w.sun));SUN.intensity=w.si;SUNOFF=w.off;HEMI.color.copy(lin(w.sky));HEMI.groundColor.copy(lin(w.gnd));HEMI.intensity=w.hi;
  SCN.fog.color.copy(lin(w.fog));SUN.shadow.radius=w.sr;if(POST.mFinal)POST.mFinal.uniforms.expo.value=w.expo;POST.cloud=w.cl;
  if(WATER&&WATER.material.uniforms.sun)WATER.material.uniforms.sun.value.set(-w.off[0],w.off[1],-w.off[2]).normalize().multiply(new THREE.Vector3(-1,1,-1));}
const _applyW=applyWeather;applyWeather=function(i){_applyW(i);if(typeof G!=='undefined'&&G&&G.map&&G.map.theme==='snow'&&SUN){SUN.color.lerp(lin('#f4f7ff'),.6);HEMI.color.copy(lin('#c2d0e2'));HEMI.groundColor.copy(lin('#a3abb5'));SCN.fog.color.copy(lin(i==1?'#d9c9bd':'#cfd8e2'));HEMI.intensity*=1.08;}};

/* ================= 3D EFFECTS: particles, tracers, projectiles, decals, wrecks ================= */
const PMAX=3500;let PN_=null,PA_=null,TRC=null,SCORCH=null,TRACKS=null,CRATER=null,crI=0,LIGHTS=[],WLIGHTS=[];
const BMIS=[],DEBRIS=[];
// chunks of a destroyed structure thrown out by the blast, tumbling and bouncing until they settle
let CHUNKG=null;function chunks(x,y,size,col,n){if(!inView(x,y,.3))return;if(!CHUNKG)CHUNKG=new THREE.BoxGeometry(1,1,1);const g0=groundH(x,y);for(let i=0;i<n&&DEBRIS.length<90;i++){const s=rnd(.08,.2)*size,mm=new THREE.MeshStandardMaterial({color:new THREE.Color(col).multiplyScalar(rnd(.7,1.05)),roughness:.95});const m=new THREE.Mesh(CHUNKG,mm);m.scale.set(s,s*rnd(.4,.9),s*rnd(.6,1.2));m.castShadow=true;const a=Math.random()*6.28,r=Math.random()*size*.3;m.position.set(x+Math.cos(a)*r,g0+rnd(4,size*.5),y+Math.sin(a)*r);SCN.add(m);const sp=rnd(30,90);DEBRIS.push({m,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vh:rnd(50,130),wx:rnd(-6,6),wy:rnd(-6,6),wz:rnd(-6,6),t:0,rest:0,chunk:1});}}
function debrisTick(dt){if(!DEBRIS.length)return;let w=0;for(const d of DEBRIS){d.t+=dt;const m=d.m;if(!d.rest){d.vh-=220*dt;m.position.x+=d.vx*dt;m.position.z+=d.vz*dt;m.position.y+=d.vh*dt;m.rotation.x+=d.wx*dt;m.rotation.y+=d.wy*dt;m.rotation.z+=d.wz*dt;
    const g=groundH(m.position.x,m.position.z)+1.5;if(m.position.y<g){m.position.y=g;if(Math.abs(d.vh)<25){d.rest=1;}else{d.vh=-d.vh*.32;d.vx*=.55;d.vz*=.55;d.wx*=.5;d.wy*=.5;d.wz*=.5;for(let q=0;q<6;q++)part({x:m.position.x,y:m.position.z,h:g,vx:rnd(-25,25),vy:rnd(-25,25),c:C_DUST,s:rnd(5,9),g:10,d:rnd(.6,1),a:.45});}}
    if(Math.random()<dt*14)part({x:m.position.x,y:m.position.z,h:m.position.y,rise:20,c:C_DARK,s:rnd(4,7),d:rnd(1.2,2),a:.4});}
  if(d.t>(d.chunk?25:40)){SCN.remove(m);if(d.chunk)m.material.dispose();continue;}DEBRIS[w++]=d;}DEBRIS.length=w;}const _bmA=new THREE.Vector3(),_bmB=new THREE.Vector3(),_bmUp=new THREE.Vector3(0,1,0);
function bmPos(m,u,out){const k=Math.max(0,Math.min(1,u)),e=k<.5?k*k*2:1-Math.pow(-2*k+2,2)/2;out.set(m.sx+(m.tx-m.sx)*e,m.sh+(m.th-m.sh)*k+m.peak*4*k*(1-k),m.sy+(m.ty-m.sy)*e);return out;}
function bmTick(dt){if(!BMIS.length)return;let w=0;for(const m of BMIS){m.t+=dt;if(m.t<0){BMIS[w++]=m;continue;}const u=m.t/m.T;
  if(u>=1){SCN.remove(m.g);continue;}m.g.visible=true;bmPos(m,u,_bmA);bmPos(m,u+.01,_bmB);_bmB.sub(_bmA);if(_bmB.lengthSq()>1e-6){_bmB.normalize();m.g.quaternion.setFromUnitVectors(_bmUp,_bmB);}
  m.g.position.copy(_bmA);m.fl.scale.set(1,2.2+Math.random()*.8,1);
  const tx=_bmA.x-_bmB.x*14,ty=_bmA.z-_bmB.z*14,th=_bmA.y-_bmB.y*14;
  part({x:tx,y:ty,h:th,add:true,c:C_FIRE2,s:rnd(5,8),d:.18});part({x:tx,y:ty,h:th,add:true,c:C_FIRE,s:rnd(7,10),d:.3});
  if(Math.random()<.8)part({x:tx+rnd(-2,2),y:ty+rnd(-2,2),h:th,vx:rnd(-4,4),vy:rnd(-4,4),vh:rnd(-2,3),c:u<.2?C_SMOKE:[.78,.76,.72],s:rnd(7,11)+u*6,g:0,d:rnd(3,5),a:.5,rise:1.5});
  BMIS[w++]=m;}BMIS.length=w;}
const FLOATS=[],PARTS=[],TRACERS=[],VPROJ=[],MARKERS=[],PLANES=[],WRECKS=[],PINGS=[],BODIES=[];let shake=0,flash=0,decI=0,trkI=0,lightI=0;
function mkPoints(blend){const g=new THREE.BufferGeometry(),pos=new Float32Array(PMAX*3),col=new Float32Array(PMAX*3),sz=new Float32Array(PMAX),al=new Float32Array(PMAX);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('pcol',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size',new THREE.BufferAttribute(sz,1).setUsage(THREE.DynamicDrawUsage));g.setAttribute('alpha',new THREE.BufferAttribute(al,1).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.ShaderMaterial({uniforms:{scale:{value:600},smk:{value:smokeTex()},hot:{value:blend===THREE.AdditiveBlending?1.:0.},dep:{value:null},sres:{value:new THREE.Vector2(1,1)},nf:{value:new THREE.Vector2(40,9000)},soft:{value:0}},transparent:true,depthWrite:false,blending:blend,
    vertexShader:`uniform float scale;attribute float size;attribute float alpha;attribute vec3 pcol;varying float va;varying vec3 vc;varying float vr;void main(){va=alpha;vc=pcol;vr=fract(position.x*.137+position.z*.291);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(220.,size*scale/-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D smk,dep;uniform float hot,soft;uniform vec2 sres,nf;float lz(float d){return nf.x*nf.y/(nf.y-(nf.y-nf.x)*d);}varying float va;varying vec3 vc;varying float vr;void main(){vec2 d=gl_PointCoord-.5;float an=vr*6.283;vec2 q=vec2(cos(an)*d.x-sin(an)*d.y,sin(an)*d.x+cos(an)*d.y)+.5;vec2 cell=vec2(step(.5,fract(vr*7.)),step(.5,fract(vr*13.)))*.5;float s=texture2D(smk,cell+clamp(q,0.,1.)*.5).r;float r=length(d)*2.;float a=va*smoothstep(.08,.62,s)*smoothstep(1.,.2,r+(s-.5)*.5);if(soft>.5){float sz=lz(texture2D(dep,gl_FragCoord.xy/sres).x),fz=lz(gl_FragCoord.z);a*=clamp((sz-fz)/16.,0.,1.);}vec3 c=vc*(hot>.5?(1.05+s*.9):(.62+s*.55)*1.5);gl_FragColor=vec4(pow(max(c,0.),vec3(2.2)),a);}`});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=5;SCN.add(p);return{g,pos,col,sz,al,p,m};}
function smokeTex(){if(smokeTex.t)return smokeTex.t;const n=256,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,n,n);
  const id=x.createImageData(n,n);let rn;const mkRn=()=>{rn=[];for(let o=0;o<5;o++){const S=4<<o,a=[];for(let i=0;i<(S+1)*(S+1);i++)a.push(Math.random());rn.push([S,a]);}};
  const vn=(u,v,S,a)=>{const fx=u*S,fy=v*S,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),A=a[iy*(S+1)+ix],B=a[iy*(S+1)+ix+1],C=a[(iy+1)*(S+1)+ix],D=a[(iy+1)*(S+1)+ix+1];return (A*(1-sx)+B*sx)*(1-sy)+(C*(1-sx)+D*sx)*sy;};
  for(let q=0;q<4;q++){mkRn();const ox=(q%2)*128,oy=(q>>1)*128;for(let py=0;py<128;py++)for(let px=0;px<128;px++){const u=px/128,v=py/128;let f=0,amp=.5;for(const [S,a] of rn){f+=vn(u,v,S,a)*amp;amp*=.5;}
      const dx=u-.5,dy=v-.5,r=Math.sqrt(dx*dx+dy*dy)*2;const m=Math.max(0,1-r*r*(1.1-f*.6))*Math.max(0,Math.min(1,(0.92-r)/0.25));const val=Math.max(0,Math.min(1,(f*1.35-.18)))*m;const k=((oy+py)*n+ox+px)*4;id.data[k]=id.data[k+1]=id.data[k+2]=val*255;id.data[k+3]=255;}}
  x.putImageData(id,0,0);
  const t=new THREE.CanvasTexture(c);smokeTex.t=t;return t;}
function initFX(){PN_=mkPoints(THREE.NormalBlending);PA_=mkPoints(THREE.AdditiveBlending);PA_.p.renderOrder=6;
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));tg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));
  TRC=new THREE.LineSegments(tg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));TRC.frustumCulled=false;SCN.add(TRC);
  for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffa860,0,320,2);l.position.set(-999,-999,-999);SCN.add(l);LIGHTS.push(l);}for(let i=0;i<3;i++){const l=new THREE.PointLight(0xff8a3a,0,170,2);l.position.set(-999,-999,-999);SCN.add(l);WLIGHTS.push(l);}}
function radTex(stops,n=64){const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d'),g=x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);stops.forEach(([o,s])=>g.addColorStop(o,s));x.fillStyle=g;x.fillRect(0,0,n,n);return new THREE.CanvasTexture(c);}
function buildDecals(){for(const d of [SCORCH,TRACKS,CRATER])if(d){SCN.remove(d);}
  const mk=(n,tex,op)=>{const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:op,polygonOffset:true,polygonOffsetFactor:-2}),n);
    for(let i=0;i<n;i++){TMPM.makeScale(0,0,0);m.setMatrixAt(i,TMPM);}m.renderOrder=1;m.frustumCulled=false;SCN.add(m);return m;};
  SCORCH=mk(180,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'rgba(10,8,6,.92)');g.addColorStop(.35,'rgba(18,14,10,.8)');g.addColorStop(.7,'rgba(30,24,16,.35)');g.addColorStop(1,'rgba(30,24,16,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<34;i++){const a=Math.random()*6.283,l=30+Math.random()*30,w=1+Math.random()*3;x.strokeStyle=`rgba(16,12,8,${.25+Math.random()*.35})`;x.lineWidth=w;x.beginPath();x.moveTo(64+Math.cos(a)*10,64+Math.sin(a)*10);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<40;i++){const a=Math.random()*6.283,r=Math.random()*55;x.fillStyle=`rgba(12,10,8,${Math.random()*.6})`;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,1+Math.random()*3,1+Math.random()*3);}
    const t=new THREE.CanvasTexture(c);return t;})(),1);TRACKS=mk(1600,(()=>{const c=document.createElement('canvas');c.width=16;c.height=32;const x=c.getContext('2d');for(let i=0;i<32;i+=4){x.fillStyle='rgba(52,40,26,.75)';x.fillRect(1,i,14,2.2);}const g=x.getImageData(0,0,16,32);for(let i=0;i<16*32;i++){const px=i%16;const e=Math.min(px,15-px)/3;g.data[i*4+3]*=Math.min(1,e);}x.putImageData(g,0,0);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.LinearFilter;return t;})(),.5);
  CRATER=mk(90,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');
    let g=x.createRadialGradient(64,64,0,64,64,62);g.addColorStop(0,'rgba(34,26,18,.95)');g.addColorStop(.32,'rgba(52,40,27,.9)');g.addColorStop(.5,'rgba(92,74,52,.55)');g.addColorStop(.62,'rgba(150,126,92,.6)');g.addColorStop(.72,'rgba(120,98,70,.42)');g.addColorStop(1,'rgba(110,90,64,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<60;i++){const a=Math.random()*6.283,r0=36+Math.random()*8,l=r0+6+Math.random()*20;x.strokeStyle=`rgba(${Math.random()<.5?'70,55,38':'140,118,86'},${.25+Math.random()*.35})`;x.lineWidth=1+Math.random()*2.5;x.beginPath();x.moveTo(64+Math.cos(a)*r0,64+Math.sin(a)*r0);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<70;i++){const a=Math.random()*6.283,r=30+Math.random()*30;x.fillStyle=`rgba(${Math.random()<.5?'60,46,32':'160,136,100'},${.3+Math.random()*.5})`;const z=1+Math.random()*3.5;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,z,z);}
    g=x.createRadialGradient(54,54,0,64,64,40);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    const t=new THREE.CanvasTexture(c);return t;})(),.95);CRATER.renderOrder=2;}
function decal(m,i,x,y,s,r){TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r||0),new THREE.Vector3(s,1,s));m.setMatrixAt(i,TMPM);m.instanceMatrix.needsUpdate=true;}
function scorch(x,y,s){if(!SCORCH)return;decal(SCORCH,decI++%180,x,y,s*2.4,Math.random()*6);}
function crater(x,y,s){if(!CRATER)return;decal(CRATER,crI++%90,x,y,s,Math.random()*6);}
function track(x,y,a){if(!TRACKS)return;const i=trkI++%1600;TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),-(a||0)+Math.PI/2),new THREE.Vector3(4.2,1,9.5));TRACKS.setMatrixAt(i,TMPM);TRACKS.instanceMatrix.needsUpdate=true;}
function pBudget(){const lv=(typeof QUAL!=='undefined'&&QUAL.lv)||0;return [1700,1400,1100,850,650,500][lv]||500;}
function part(o){const B=pBudget(),n=PARTS.length;if(n>B){if(!o.add||n>B*1.35)return;}else if(n>B*.6&&!o.add&&Math.random()<(n-B*.6)/(B*.4))return;PARTS.push(Object.assign({vx:0,vy:0,vh:0,t:0,d:1,s:6,g:0,a:1,h:0,c:[.4,.39,.36],add:false,f:.25,rise:0},o));}
const C_SMOKE=[.42,.4,.37],C_DARK=[.13,.12,.11],C_DUST=[.66,.58,.44],C_FIRE=[1,.42,.1],C_FIRE2=[1,.68,.3],C_SPARK=[1,.75,.35];
function inView(x,y,m){if(!CAM)return true;TMP.set(x,0,y).project(CAM);return Math.abs(TMP.x)<1+m&&Math.abs(TMP.y)<1+m;}
function boomFX(x,y,s,big,h=0){sfxBoom(x,y,s,big);const g=groundH(x,y)+h,n=Math.min(18,4+(s/5|0)),gr=h<4;
  if(s<=10&&!big){for(let i=0;i<9;i++){const a=rnd(0,6.28),v=rnd(80,200);part({x,y,h:g+rnd(4,9),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(60,180),add:true,c:i%3?C_SPARK:[3,2.4,1.4],s:rnd(1,1.8),f:.5,grav:1,bounce:1,d:rnd(.25,.6)});}part({x,y,h:g+6,s:s*2.2,d:.06,add:true,c:[3.2,2.4,1.4]});}
  part({x,y,h:g+s*.35,s:s*1.25,d:big?.18:.1,add:true,c:[1.9,.95,.35],a:.8});part({x,y,h:g+s*.5,s:s*.7,d:big?.35:.2,add:true,c:[2.4,1.3,.4],g:s*.8,a:.9});
  const nf=Math.min(16,5+(s/4|0));for(let i=0;i<nf;i++){const a=rnd(0,6.28),r=rnd(0,s*.45),v=rnd(4,s*.9),hot=rnd(.8,1.15);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(1,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(8,s*1.6),f:.15,rise:rnd(6,18),c:[3.4*hot,1.5*hot,.4*hot],c2:i%3?[.5,.47,.42]:[.36,.34,.31],ck:rnd(.12,.25),s:rnd(s*.4,s*.7),g:s*.8,d:rnd(2,3.4),a:.62});}
  for(let i=0;i<(n>>1);i++){const a=rnd(0,6.28),v=rnd(10,s*2);part({x,y,h:g+rnd(0,s*.6),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(10,s*1.8),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(s*.3,s*.6),g:s*.5,d:rnd(.25,.5),a:.7});}
  for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(5,s*.9);part({x:x+rnd(-s*.3,s*.3),y:y+rnd(-s*.3,s*.3),h:g+rnd(2,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,rise:rnd(16,34),c:i%4?C_SMOKE:C_DARK,c2:[.5,.47,.42],ck:.4,s:rnd(s*.4,s*.7),g:s*.6,d:rnd(2.2,3.8),a:.5});}
  if(gr&&s>8){const C_DIRT=[.42,.33,.22];for(let i=0;i<Math.min(16,5+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(10,s*1.6);part({x:x+rnd(-3,3),y:y+rnd(-3,3),h:g+2,vx:Math.cos(a)*v*.4,vy:Math.sin(a)*v*.4,vh:rnd(s*3,s*6),f:.5,grav:1,c:i%2?C_DIRT:[.3,.24,.17],s:rnd(s*.35,s*.6),g:s*1.1,d:rnd(.9,1.5),a:.75});}
    for(let i=0;i<Math.min(24,8+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(40,140)*(.5+s/40);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(90,260),c:[.22,.17,.12],s:rnd(1.6,3.2),f:.85,grav:1,bounce:1,d:rnd(1,1.8)});}}
  if(gr)for(let i=0;i<Math.min(14,6+(s/4|0));i++){const a=i/7*3.1416+rnd(-.2,.2),v=rnd(s*2,s*3.5);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:.08,c:C_DUST,s:rnd(s*.35,s*.55),g:s*.5,d:rnd(1,1.6),a:.45});}
  for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(90,260)*(.5+s/60);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(40,200),add:true,c:C_SPARK,s:1.4,f:.6,grav:1,d:rnd(.3,.7)});}
  if(s>10)for(let i=0;i<Math.min(12,s/3|0);i++){const a=rnd(0,6.28),v=rnd(30,130);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(80,220),c:C_DARK,s:rnd(1.4,2.8),f:.85,grav:1,bounce:1,d:rnd(1.2,2.2)});}
  scorch(x,y,s);if(gr&&s>=16&&groundH(x,y)>(typeof WL==="number"?WL+1:-1e9))crater(x,y,s*1.5);
  if(s>12){const L=LIGHTS[lightI++%LIGHTS.length];L.position.set(x,g+20,y);L.intensity=big?7:3.2;L.distance=big?600:300;L.userData.d=big?.8:.35;L.userData.t=0;}
  if(inView(x,y,.3)){if(s>14)shake=Math.min(18,shake+s/(big?5:13));if(big)flash=Math.min(.2,flash+.1);}}
const FXH={
  muz(x,y,h,a,s){sfxShot(x,y,s);if(s>=13){const gh=groundH(x,y),ca=Math.cos(a),sa=Math.sin(a);for(let i=0;i<10;i++){const b=a+rnd(-1.3,1.3),v=rnd(30,90);part({x:x+ca*4,y:y+sa*4,h:h+rnd(-1,2),vx:Math.cos(b)*v+ca*40,vy:Math.sin(b)*v+sa*40,vh:rnd(4,18),f:.25,rise:rnd(6,14),c:i%3?C_SMOKE:[.62,.6,.56],c2:[.55,.53,.5],ck:.3,s:rnd(8,13),g:16,d:rnd(1.8,2.8),a:.62});}for(let i=0;i<12;i++){const b=rnd(0,6.28),v=rnd(40,80);part({x,y,h:gh+2,vx:Math.cos(b)*v,vy:Math.sin(b)*v,f:.1,c:C_DUST,s:rnd(5,8),g:10,d:rnd(.8,1.3),a:.35});}part({x:x+ca*8,y:y+sa*8,h,s:s*3.2,d:.09,add:true,c:[3.2,1.8,.6]});}part({x,y,h,s:s*2.4,d:.07,add:true,c:[3,2,.9]});part({x:x+Math.cos(a)*s*.9,y:y+Math.sin(a)*s*.9,h,s:s*1.4,d:.05,add:true,c:[2.6,1.4,.5]});if(s>9&&inView(x,y,.1)){const L=LIGHTS[lightI++%LIGHTS.length];L.position.set(x,h+6,y);L.intensity=2.2;L.distance=160;L.userData.d=.08;L.userData.t=0;}if(s>9)for(let i=0;i<3;i++)part({x,y,h,vx:Math.cos(a)*rnd(20,50),vy:Math.sin(a)*rnd(20,50),c:C_SMOKE,s:rnd(4,7),g:12,d:rnd(.5,.9),a:.5});},
  tr(x1,y1,h1,x2,y2,h2,flak){TRACERS.push({a:[x1,h1,y1],b:[x2,h2,y2],t:0,d:.09,c:flak?[3,1.5,.5]:[3,1.9,.7]});if(flak){part({x:x2,y:y2,h:h2,s:7,d:.12,add:true,c:C_FIRE});part({x:x2,y:y2,h:h2,s:5,g:7,d:.8,c:[.3,.29,.27],c2:[.5,.48,.45],ck:.3,a:.5});}
    else if(h2<10&&Math.random()<.4)part({x:x2,y:y2,h:groundH(x2,y2)+1,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(10,30),c:C_DUST,s:3,g:6,d:.4,a:.6});},
  salvo(x,y,h,tx,ty,ang){const sx=Math.cos(ang),sy=Math.sin(ang),px=-sy,py=sx;
    for(let i=0;i<3;i++){const side=i%2?1:-1,ox=x+px*side*5,oy=y+py*side*5,ix=tx+rnd(-18,18)+sx*rnd(-10,20),iy=ty+rnd(-18,18)+sy*rnd(-10,20);const len=Math.max(1,Math.hypot(ix-ox,iy-oy));VPROJ.push({x:ox,y:oy,h,sx:ox,sy:oy,sh:h,tx:ix,ty:iy,th:groundH(ix,iy)+1,spd:520,wpn:'missile',rocket:1,len,p:-i*55,vis:1});}
    for(let i=0;i<6;i++){const k=i/5,gx=tx-sx*40+sx*80*k+rnd(-8,8),gy=ty-sy*40+sy*80*k+rnd(-8,8);setTimeout(()=>{TRACERS.push({a:[x,h-3,y],b:[gx,groundH(gx,gy)+1,gy],t:0,d:.09,c:[3,1.9,.7]});part({x:gx,y:gy,h:groundH(gx,gy)+2,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(20,50),c:C_DUST,s:rnd(3,5),g:8,d:rnd(.5,.9),a:.55});part({x:gx,y:gy,h:groundH(gx,gy)+2,add:true,c:C_SPARK,s:2.2,d:.08});},80+i*55);}},
  pj(x,y,h,tx,ty,th,spd,wpn,rocket){const len=Math.max(1,Math.hypot(tx-x,ty-y));VPROJ.push({x,y,h,sx:x,sy:y,sh:h,tx,ty,th,spd,wpn,rocket,len,p:0});},
  boom(x,y,s,big){boomFX(x,y,s,big);},
  toss(id,vh){const o=OBJ.get(id);if(o)o.userData.toss={h:0,vh,sp:(Math.random()<.5?-1:1)*rnd(4,9),r:0};},
  // ballistic missile: launch plume at the silo, a high arc with a burning exhaust and a long smoke trail, then a steep
  // dive onto the target (the sim's own strike makes the explosion on arrival)
  bmis(sx,sy,tx,ty,T,i){mats();const g=new THREE.Group(),B=Bld();B.cyl(1.7,1.7,20,10,0,0,0,'#e6e2d6');B.cone(1.7,6,10,0,13,0,'#3a3c38');B.cyl(1.75,1.75,2.2,10,0,6,0,'#2f3a2c');
    for(let k=0;k<4;k++){const a=k*Math.PI/2;B.box(.35,4,3,Math.cos(a)*2.2,-8,Math.sin(a)*2.2,'#3a3c38',0,-a,0);}g.add(mesh(B.geo()));
    const fl=new THREE.Mesh(new THREE.SphereGeometry(2.6,10,8),MAT.glow);fl.scale.set(1,2.4,1);fl.position.y=-12.5;g.add(fl);g.visible=false;SCN.add(g);
    const sh=groundH(sx,sy)+6,th=groundH(tx,ty),d=Math.hypot(tx-sx,ty-sy),peak=Math.max(420,Math.min(1100,d*.42));
    BMIS.push({g,fl,sx,sy,sh,tx,ty,th,T:Math.max(1.2,T-.05),t:-(i||0)*.04,peak,d});
    if(!(i%3))sfxBoom(sx,sy,10,false);
    for(let q=0;q<26;q++)part({x:sx+rnd(-10,10),y:sy+rnd(-10,10),h:sh-4+rnd(0,6),vx:rnd(-60,60),vy:rnd(-60,60),vh:rnd(5,30),c:C_SMOKE,s:rnd(10,18),g:-2,d:rnd(2.5,4.5),a:.6,rise:4});
    for(let q=0;q<10;q++)part({x:sx,y:sy,h:sh+rnd(0,10),vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(20,60),add:true,c:C_FIRE2,s:rnd(5,9),d:rnd(.2,.4)});},
  die(id,x,y,ki,isB,team){const kind=KINDS[ki],o=OBJ.get(id);const rot=o?o.rotation.y:0;
    if(isB){boomFX(x,y,40,true,10);chunks(x,y,STRUCT[kind].size,'#8a8478',10);for(let i=0;i<5;i++)setTimeout(()=>boomFX(x+rnd(-35,35),y+rnd(-35,35),18,false,rnd(0,20)),i*180);rubble(x,y,STRUCT[kind].size,o);}
    else{const s=BASE[kind];if(s.armor==='light'&&s.dom==='ground'){for(let i=0;i<6;i++)part({x,y,h:groundH(x,y)+3,vx:rnd(-30,30),vy:rnd(-30,30),c:C_DUST,s:rnd(4,7),g:10,d:rnd(.5,.9),a:.6});}
      else if(kind==='drone')boomFX(x,y,16,false,unitH({s,x,y,id:0}));else{const air=s.dom==='air';boomFX(x,y,air?18:s.r*1.5,false,air&&o?o.position.y-groundH(x,y):0);if(o&&!air){const P=o.userData.parts||{};if(P.turret&&s.armor==='heavy'&&Math.random()<.45&&inView(x,y,.2)){const tu=P.turret;o.updateMatrixWorld(true);const wp=new THREE.Vector3(),wq=new THREE.Quaternion();tu.getWorldPosition(wp);tu.getWorldQuaternion(wq);tu.parent.remove(tu);tu.position.copy(wp);tu.quaternion.copy(wq);if(typeof burntMat==='function')tu.traverse(m=>{if(m.isMesh&&m.material&&!Array.isArray(m.material))m.material=burntMat(m.material);});SCN.add(tu);const a=Math.random()*6.28;DEBRIS.push({m:tu,vx:Math.cos(a)*rnd(15,45),vz:Math.sin(a)*rnd(15,45),vh:rnd(70,120),wx:rnd(-4,4),wy:rnd(-5,5),wz:rnd(-4,4),t:0,rest:0});for(let q=0;q<14;q++)part({x,y,h:wp.y,vx:rnd(-40,40),vy:rnd(-40,40),vh:rnd(30,90),add:true,c:C_FIRE2,s:rnd(4,7),d:rnd(.3,.6)});}if(WRECKQ.length<6)WRECKQ.push([o,x,y]);}}}
    if(o&&!isB&&BASE[kind].armor==='light'&&BASE[kind].dom==='ground'&&o.userData.model&&o.userData.parts.body){OBJ.delete(id);const P=o.userData.parts;if(P.tring)P.tring.visible=false;o.userData.walker=false;
      const figs=P.body.children.map((f,i)=>({f,dl:i*.12+Math.random()*.15,dir:Math.random()<.5?-1:1,rx:rnd(-.35,.35),base:f.position.clone()}));BODIES.push({o,t:0,figs,x,y});if(BODIES.length>40){const b=BODIES.shift();SCN.remove(b.o);}return;}
    if(o){SCN.remove(o);OBJ.delete(id);}},
  strike(x,y,t,r,sup,arc){if(sup)sfxAlarm();const ring=new THREE.Mesh(new THREE.RingGeometry(r*.94,r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.8,depthWrite:false}));ring.position.set(x,groundH(x,y)+1.5,y);SCN.add(ring);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.12,depthWrite:false}));disc.position.copy(ring.position);SCN.add(disc);
    let mis=null;if(sup&&!arc){mats();if(MODELS.ready&&MODELS.proto.missile){mis=new THREE.Group();const mm=instModel('missile',null,'y',30);mm.rotation.x=Math.PI;mm.position.y=30;mis.add(mm);}else mis=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,22,8),new THREE.MeshStandardMaterial({color:lin('#e8e4d6')}));mis.visible=false;SCN.add(mis);}MARKERS.push({x,y,t,r,sup,ring,disc,mis});},
  hack(x,y){for(let i=0;i<24;i++)part({x:x+rnd(-30,30),y:y+rnd(-30,30),h:groundH(x,y)+rnd(5,40),vh:rnd(10,30),add:true,c:[.3,1,.5],s:rnd(2,4),d:rnd(.6,1.2)});},
  ping(x,y,r){PINGS.push({x,y,r,t:0,d:1.6,c:0x7fb8e6});},
  smoke(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0xb9bdbb});for(let i=0;i<140;i++){const a=rnd(0,6.28),d=Math.sqrt(Math.random())*r;part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,14),vh:rnd(1,4),rise:rnd(2,6),c:C_SMOKE,c2:[.75,.75,.73],ck:.4,s:rnd(30,55),g:2,d:rnd(12,20),a:.5});}},
  heal(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0x74d08f});for(let i=0;i<40;i++){const a=rnd(0,6.28),d=rnd(0,r);part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,20),vh:rnd(15,40),add:true,c:[.4,1,.55],s:rnd(2,4),d:rnd(.8,1.4)});}},
  plane(sx,sy,tx,ty,team){mats();const T=G.teams[team],o=mesh(geoFor('plane',T.fac,T,'body'));o.scale.setScalar(1.2);SCN.add(o);const a=Math.atan2(ty-sy,tx-sx),L=Math.hypot(tx-sx,ty-sy);PLANES.push({o,sx,sy,a,v:L/2.6,t:0,tx,ty,dropped:false});},
  log(team,msg,kind){if(team===ME)pushLog(msg,kind);},
  end(winner){showEnd(winner);},
  elim(team){if(team===ME&&G&&!G.over)showElim();},
  oilDry(i){const o=G.oil&&G.oil[i];if(!o)return;if(MODE==='client'){o.res=0;}if(o.owner===ME||MODE==='client')try{pushLog('An oil derrick has run dry.','w');}catch(_){}},
  give(f,t,a){if(t===ME&&typeof sfxUI==='function')sfxUI(880);},
  civd(i){const c=G.civ&&G.civ[i];if(!c)return;if(c.ruin&&c.obj){c.obj.visible=false;if(typeof scorch==='function')scorch(c.x,c.y,30);}if(MODE==='client'){c.dead=true;if(G.grid[c.k]===3)G.grid[c.k]=0;}G.civDirty=true;const g=groundH(c.x,c.y);try{FXH.boom(c.x|0,c.y|0,26,1);chunks(c.x,c.y,48,'#cfc6b2',12);}catch(_){}},
  txt(x,y,str,team,vic){if(!SET.txt||team!==ME&&vic!==ME&&vic!==-2)return;FLOATS.push({x,y,s:str,t0:performance.now(),c:vic===-2?(ally(team,ME)?(str==='RALLIED'?'#74d08f':'#ea5a40'):'#f2c94c'):team===ME?'#f2c94c':'#ea5a40'});if(FLOATS.length>14)FLOATS.shift();},
};
function FXE(type,args){if(MODE==='host'&&G&&G.out)G.out.push([type,...args]);if(FXH[type]&&!G.headless)FXH[type](...args);}
// Burnt-out wrecks keep their shape and panel detail: patchy soot, rust-brown scorched paint and grey ash with the
// original surface showing faintly through, glowing embers that die down over ~20 seconds, and a slight list.
const WRECK_HEAT={value:1};let WRECKM=null;const WRECKQ=[],BURNT=new Map();
function wreckTick(){const q=WRECKQ.shift();if(q)try{wreck(q[0],q[1],q[2]);}catch(e){}}
function burntMat(src){const m=new THREE.MeshStandardMaterial({color:0xffffff,map:src&&src.map||null,roughness:1,metalness:.05,vertexColors:!!(src&&src.vertexColors)});
  if(src&&src.color)m.userData.base=src.color.clone();m.color.copy(m.userData.base||new THREE.Color(.3,.3,.3));const heat={value:1};m.userData.heat=heat;
  m.onBeforeCompile=sh=>{sh.uniforms.uHeat=heat;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBW;').replace('#include <project_vertex>','#include <project_vertex>\nvBW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uHeat;varying vec3 vBW;\n'+WX_COMMON.replace('varying vec3 vWP;','')).replace('#include <color_fragment>',`#include <color_fragment>
      {vec3 b=diffuseColor.rgb;float l=dot(b,vec3(.3,.59,.11));float n=wn(vBW*.32)*.6+wn(vBW*1.25)*.4,n2=wn(vBW*2.6+3.1);
       vec3 soot=vec3(.03,.028,.026),rust=vec3(.30,.16,.075)*(.65+.7*l),ash=vec3(.36,.34,.31);
       vec3 c=mix(soot,rust,smoothstep(.42,.68,n));c=mix(c,ash*(.5+l*.6),smoothstep(.72,.9,n2)*.55);c=mix(c,b*.3,.22);diffuseColor.rgb=c;}`)
     .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      {float e=smoothstep(.70,.82,wn(vBW*.55+7.)*.7+wn(vBW*2.1)*.3);totalEmissiveRadiance+=vec3(1.6,.48,.1)*e*uHeat*uHeat;}`);};
  m.customProgramCacheKey=()=>'burnt1';return m;}
function wreck(o,x,y){mats();let w;const mats2=[];const rec={heat:1};const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};if(o.userData.model){w=o.clone(true);w.traverse(c=>{if(c.isMesh){c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);}if(c.isSkinnedMesh)c.visible=false;});w.rotation.z=rnd(-.08,.08);w.rotation.x=rnd(-.05,.05);}else{w=new THREE.Group();o.traverse(c=>{if(c.isMesh&&c.material===MAT.std){const m=new THREE.Mesh(c.geometry,bm(c.material));m.position.copy(c.position);m.rotation.copy(c.rotation);m.castShadow=true;w.add(m);}});
  w.position.copy(o.position);w.rotation.y=o.rotation.y;}const P=o.userData.parts;if(P.turret){const t=w.children[1];if(t)t.rotation.set(rnd(-.2,.2),rnd(-1,1),rnd(-.2,.2));}w.traverse(c=>{if(c.isMesh){c.onBeforeRender=(r,s,cam,g,m)=>{if(m&&m.userData.heat&&m.userData.heat.value!==rec.heat){m.userData.heat.value=rec.heat;m.uniformsNeedUpdate=true;}};}});SCN.add(w);WRECKS.push({o:w,x,y,t:0,rec});}
function rubble(x,y,size,o){mats();const w=new THREE.Group();const B=Bld(),h=size*.5;const gr=['#7d7a72','#8e8b82','#6c6962','#5a5751','#9a968c'];
  B.box(size*.95,1.6,size*.95,0,.8,0,'#5e5b54');
  for(let i=0;i<46;i++){const s2=rnd(2.5,10),r=Math.sqrt(Math.random())*h*1.05,a=rnd(0,6.28);B.box(s2,s2*rnd(.3,.7),s2*rnd(.5,1.3),Math.cos(a)*r,s2*.25+rnd(0,3)*(1-r/h),Math.sin(a)*r,Math.random()<.2?'#2b2925':gr[i%5],rnd(-.5,.5),rnd(0,6),rnd(-.5,.5));}
  for(let k=0;k<3;k++){const a=rnd(0,6.28),r=rnd(h*.3,h*.8),ht=rnd(6,18),wd=rnd(10,22);B.box(wd,ht,2.5,Math.cos(a)*r,ht/2,Math.sin(a)*r,'#86837a',rnd(-.12,.12),a+1.57,rnd(-.1,.1));}
  for(let k=0;k<8;k++){const a=rnd(0,6.28),r=rnd(0,h*.8);B.cyl(.25,.25,rnd(6,14),4,Math.cos(a)*r,rnd(3,6),Math.sin(a)*r,'#3a2a20',rnd(-1,1),0,rnd(-1,1));}
  const m=mesh(B.geo());w.add(m);scorch(x,y,size*.7);
  w.position.set(x,groundH(x,y),y);SCN.add(w);WRECKS.push({o:w,x,y,t:0,big:true});}
function fxUpdate(dt){
  for(const p of PARTS){p.t+=dt;const fr=Math.pow(p.f,dt);p.vx*=fr;p.vy*=fr;p.vh*=fr;if(p.grav)p.vh-=420*dt;p.x+=(p.vx+(p.add?0:6))*dt;p.y+=p.vy*dt;p.h+=(p.vh+p.rise)*dt;p.s=Math.max(.4,p.s+p.g*dt);
    if(p.bounce&&p.h<groundH(p.x,p.y)){p.h=groundH(p.x,p.y);p.vh*=-.3;p.vx*=.4;p.vy*=.4;}}
  for(let i=PARTS.length-1;i>=0;i--)if(PARTS[i].t>=PARTS[i].d){PARTS[i]=PARTS[PARTS.length-1];PARTS.pop();}
  let nN=0,nA=0;for(const p of PARTS){const P=p.add?PA_:PN_;let i=p.add?nA++:nN++;if(i>=PMAX)continue;const k=p.t/p.d;
    P.pos[i*3]=p.x;P.pos[i*3+1]=p.h;P.pos[i*3+2]=p.y;if(p.c2){const m=Math.min(1,k/(p.ck||.3));P.col[i*3]=p.c[0]+(p.c2[0]-p.c[0])*m;P.col[i*3+1]=p.c[1]+(p.c2[1]-p.c[1])*m;P.col[i*3+2]=p.c[2]+(p.c2[2]-p.c[2])*m;}else{P.col[i*3]=p.c[0];P.col[i*3+1]=p.c[1];P.col[i*3+2]=p.c[2];}P.sz[i]=p.s*2;P.al[i]=p.add?p.a*(1-k)*(1-k):p.a*(1-k)*Math.min(1,k*5+.3);}
  for(const [P,n] of [[PN_,nN],[PA_,nA]]){P.g.setDrawRange(0,Math.min(n,PMAX));for(const k of ['position','pcol','size','alpha'])P.g.attributes[k].needsUpdate=true;P.m.uniforms.scale.value=VH*dpr/(2*Math.tan(CAM.fov*Math.PI/360));}
  for(const t of TRACERS){t.t+=dt;const k=Math.min(1,t.t/t.d*1.25);for(let q=0;q<3;q++){const u=Math.max(0,k-q*.05);part({x:t.a[0]+(t.b[0]-t.a[0])*u,h:t.a[1]+(t.b[1]-t.a[1])*u,y:t.a[2]+(t.b[2]-t.a[2])*u,s:3.4-q*.7,d:.05,add:true,c:[t.c[0]*.9,t.c[1]*.8,t.c[2]*.7],a:.9-q*.2});}}for(let i=TRACERS.length-1;i>=0;i--)if(TRACERS[i].t>=TRACERS[i].d)TRACERS.splice(i,1);
  const tp=TRC.geometry.attributes.position.array,tc=TRC.geometry.attributes.color.array;let n=0;for(const t of TRACERS){if(n>=800)break;const L=Math.hypot(t.b[0]-t.a[0],t.b[1]-t.a[1],t.b[2]-t.a[2])||1,u=Math.min(1,t.t/t.d*1.25),u0=Math.max(0,u-Math.min(.14,20/L));for(let j=0;j<3;j++){tp[n*6+j]=t.a[j]+(t.b[j]-t.a[j])*u0;tp[n*6+3+j]=t.a[j]+(t.b[j]-t.a[j])*u;}for(let j=0;j<3;j++){tc[n*6+j]=t.c[j]*.1;tc[n*6+3+j]=t.c[j]*(j?.72:.95);}n++;}
  TRC.geometry.setDrawRange(0,n*2);TRC.geometry.attributes.position.needsUpdate=true;TRC.geometry.attributes.color.needsUpdate=true;
  bmTick(dt);debrisTick(dt);
  for(const p of VPROJ){const ox=p.x,oy=p.y,oh=p.h;p.p+=p.spd*dt;const k=Math.min(1,p.p/p.len);p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k;const arc=p.wpn==='shell'?Math.sin(k*Math.PI)*p.len*.22:0;p.h=p.sh+(p.th-p.sh)*k+arc;
    if(p.p<0){p.x=p.sx;p.y=p.sy;p.h=p.sh;continue;}
    if(k>=1){p.done=true;if(p.vis)boomFX(p.tx,p.ty,9,false);continue;}
    if(p.wpn==='at'||p.wpn==='missile'||p.rocket){if(Math.random()<.5)part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE,a:.7});for(let q=0;q<2;q++)part({x:p.x+rnd(-1,1),y:p.y+rnd(-1,1),h:p.h,vx:rnd(-4,4),vy:rnd(-4,4),c:[.88,.87,.84],s:rnd(3,5),g:9,d:rnd(1.6,2.6),a:.55});}
    else if(p.wpn==='shell'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,add:true,c:C_FIRE});if(Math.random()<.6)part({x:p.x,y:p.y,h:p.h,vx:rnd(-2,2),vy:rnd(-2,2),c:[.7,.68,.65],s:rnd(1.6,2.4),g:3.5,d:rnd(.8,1.3),a:.32});}
    else if(p.wpn==='bomb'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,c:C_DARK,a:1});}
    else{part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE2});if(ox!=null)TRACERS.push({a:[ox,oh,oy],b:[p.x,p.h,p.y],t:0,d:.07,c:[1.6,1.2,.7]});}}
  for(let i=VPROJ.length-1;i>=0;i--)if(VPROJ[i].done)VPROJ.splice(i,1);
  for(const m of MARKERS){m.t-=dt;const pu=.5+.5*Math.sin(performance.now()/90);m.ring.material.opacity=.5+.4*pu;m.disc.material.opacity=.08+.1*pu;
    if(m.mis){if(m.t<1.2){m.mis.visible=true;const h=groundH(m.x,m.y)+(m.t/1.2)*800;m.mis.position.set(m.x,h+11,m.y);part({x:m.x,y:m.y,h:h+24,s:7,g:16,vx:rnd(-6,6),vy:rnd(-6,6),c:C_SMOKE,d:rnd(.8,1.4),a:.7});if(Math.random()<.5)part({x:m.x,y:m.y,h:h+24,s:7,d:.06,add:true,c:C_FIRE,a:.6});}}
    if(m.t<=-.05){m.done=true;SCN.remove(m.ring);SCN.remove(m.disc);if(m.mis)SCN.remove(m.mis);}}
  for(let i=MARKERS.length-1;i>=0;i--)if(MARKERS[i].done)MARKERS.splice(i,1);
  for(const p of PLANES){p.t+=dt;const d=p.v*p.t;const x=p.sx+Math.cos(p.a)*d,y=p.sy+Math.sin(p.a)*d;p.o.position.set(x,groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+150,y);p.o.rotation.y=-p.a;
    if(!p.dropped&&p.t>=2.6){p.dropped=true;for(let i=0;i<5;i++)part({x:p.tx+rnd(-40,40),y:p.ty+rnd(-40,40),h:groundH(p.tx,p.ty)+140,vh:-60,f:1,c:[.95,.95,.9],s:5,d:2.2,a:.9});}
    if(p.t>6){p.done=true;SCN.remove(p.o);}}
  for(let i=PLANES.length-1;i>=0;i--)if(PLANES[i].done)PLANES.splice(i,1);
  for(const w of WRECKS){w.t+=dt;if(w.rec)w.rec.heat=Math.max(0,1-w.t/20);const vis=inView(w.x,w.y,.25),burn=w.t<(w.big?30:24),fade=Math.max(0,1-w.t/(w.big?40:32));
    if(vis&&w.t<(w.big?40:32)&&Math.random()<dt*(w.big?7:4.5))part({x:w.x+rnd(-5,5),y:w.y+rnd(-5,5),h:groundH(w.x,w.y)+8,vx:rnd(5,9),rise:rnd(40,56),c:Math.random()<.6?C_DARK:[.2,.19,.18],c2:[.44,.42,.39],ck:rnd(.25,.4),s:rnd(4,7),g:7,d:rnd(3,4.2),a:.4*fade+.08});
    if(vis&&burn&&Math.random()<dt*(w.big?14:10)){const fx=w.x+rnd(-9,9),fy=w.y+rnd(-9,9);part({x:fx,y:fy,h:groundH(fx,fy)+rnd(3,9),vx:rnd(-3,3),vy:rnd(-3,3),rise:rnd(14,26),add:true,c:Math.random()<.5?[2.6,1.1,.3]:[2.9,1.7,.6],s:rnd(4,8),g:-3,d:rnd(.35,.7),a:.85});}
    if(vis&&burn&&Math.random()<dt*2)part({x:w.x+rnd(-6,6),y:w.y+rnd(-6,6),h:groundH(w.x,w.y)+6,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:1.2,f:.6,grav:1,d:rnd(.4,.8)});
    if(burn&&!w.light&&LIGHTS.length){w.light=1;}
    if(w.t>50)w.o.position.y-=dt*4;if(w.t>56){w.done=true;SCN.remove(w.o);}}
  for(let i=WRECKS.length-1;i>=0;i--)if(WRECKS[i].done)WRECKS.splice(i,1);
  {let k=0;const now=performance.now()/1000;for(const w of WRECKS){if(k>=WLIGHTS.length)break;if(w.t>=(w.big?30:24)||!inView(w.x,w.y,.1))continue;const L=WLIGHTS[k++],fl=.75+.25*Math.sin(now*17+w.x)*Math.sin(now*11.3+w.y),fade=Math.min(1,w.t*2)*Math.min(1,((w.big?30:24)-w.t)/6);L.position.set(w.x,groundH(w.x,w.y)+16,w.y);L.intensity=(w.big?3.2:2.2)*fl*fade;}for(;k<WLIGHTS.length;k++)WLIGHTS[k].intensity=0;}
  for(const b of BODIES){b.t+=dt;for(const g of b.figs){const k=Math.max(0,Math.min(1,(b.t-g.dl)/.45));const e=k*k*(3-2*k);g.f.rotation.z=g.dir*1.5*e;g.f.rotation.x=g.rx*e;g.f.position.y=g.base.y-e*.6;if(k>0&&k<1&&!g.dust&&e>.9){g.dust=1;part({x:b.x,y:b.y,h:groundH(b.x,b.y)+1,vx:rnd(-12,12),vy:rnd(-12,12),c:C_DUST,s:rnd(4,6),g:6,d:.7,a:.4});}}
    if(b.t>14)b.o.position.y-=dt*2.5;if(b.t>17){b.done=true;SCN.remove(b.o);}}
  for(let i=BODIES.length-1;i>=0;i--)if(BODIES[i].done)BODIES.splice(i,1);
  for(const L of LIGHTS){if(L.intensity>0){L.userData.t+=dt;L.intensity=Math.max(0,L.intensity*(1-dt/L.userData.d*2.2));if(L.intensity<.05)L.intensity=0;}}
  for(const p of PINGS)p.t+=dt;for(let i=PINGS.length-1;i>=0;i--)if(PINGS[i].t>=PINGS[i].d)PINGS.splice(i,1);
  if(G&&G.map&&G.map.theme==='snow'&&CAM&&typeof cam!=='undefined'){const n=Math.min(30,dt*Math.min(150,cam.dist*.16))|0;const R=Math.max(500,cam.dist*1.1);for(let i=0;i<n+(Math.random()<dt*20?1:0);i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(60,260),vx:rnd(8,22),vy:rnd(-4,6),vh:-rnd(26,40),f:1,c:[1.05,1.08,1.12],s:rnd(1.4,2.4),d:rnd(4,6.5),a:.85});}}
  try{weatherFX(dt);}catch(e){}
  shake*=Math.exp(-7*dt);flash=Math.max(0,flash-dt*1.6);}
// Weather on screen: rain streaks, blowing sand, heavy snow and thick fog close in the view; the haze colour and
// distance ease in and out as the weather changes.
let RAIN=null,WXV={k:'clear',m:0};
function weatherFX(dt){if(!G||!G.map||!CAM)return;const k=(G.wx&&G.wx.k)||'clear';if(WXV.base==null&&SCN.fog){WXV.base={c:SCN.fog.color.clone(),n:SCN.fog.near,f:SCN.fog.far};}const B=WXV.base;if(!B)return;
  if(WXV.k!==k){WXV.m=Math.max(0,WXV.m-dt*.5);if(WXV.m<=0)WXV.k=k;}else WXV.m=Math.min(1,WXV.m+dt*.35);const m=WXV.k==='clear'?0:WXV.m,K=WXV.k;
  const T={rain:{c:'#7d868c',n:500,f:3200},fog:{c:'#b9bdbb',n:150,f:1500},sandstorm:{c:'#b88a52',n:40,f:950},blizzard:{c:'#dfe6ee',n:150,f:1700}}[K];
  if(T){const tc=lin(T.c);SCN.fog.color.copy(B.c).lerp(tc,m*.85);SCN.fog.near=B.n+(T.n-B.n)*m;SCN.fog.far=B.f+(T.f-B.f)*m;}else{SCN.fog.color.lerp(B.c,Math.min(1,dt*2));SCN.fog.near+=(B.n-SCN.fog.near)*Math.min(1,dt*2);SCN.fog.far+=(B.f-SCN.fog.far)*Math.min(1,dt*2);}
  const R=Math.max(420,cam.dist*1.1);
  if(K==='sandstorm'&&m>.05){const n=(dt*90*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(2,60),vx:rnd(90,160),vy:rnd(-15,15),vh:rnd(-4,8),f:.9,c:[.78,.6,.38],s:rnd(18,36),g:22,d:rnd(1.6,2.8),a:.3*m});}}
  if(K==='blizzard'&&m>.05){const n=(dt*120*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(40,220),vx:rnd(50,90),vy:rnd(-10,14),vh:-rnd(30,50),f:1,c:[1.05,1.08,1.12],s:rnd(1.6,2.8),d:rnd(3,5),a:.9});}}
  if(K==='rain'){if(!RAIN){const N=1400,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6),3).setUsage(THREE.DynamicDrawUsage));RAIN=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xaab4be,transparent:true,opacity:.35,depthWrite:false}));RAIN.frustumCulled=false;RAIN.userData.d=[];for(let i=0;i<N;i++)RAIN.userData.d.push([rnd(-1,1),rnd(-1,1),rnd(0,1)]);SCN.add(RAIN);}
    RAIN.visible=m>.02;RAIN.material.opacity=.35*m;const p=RAIN.geometry.attributes.position.array,D=RAIN.userData.d,H=320;
    for(let i=0;i<D.length;i++){const d=D[i];d[2]-=dt*1.6;if(d[2]<0){d[2]+=1;d[0]=rnd(-1,1);d[1]=rnd(-1,1);}const x=cam.x+d[0]*R,y=cam.y+d[1]*R*.7,gh=groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y))),h=gh+d[2]*H;p.set([x,h,y,x+3,h+14,y],i*6);}
    RAIN.geometry.attributes.position.needsUpdate=true;}else if(RAIN)RAIN.visible=false;
  const el=document.getElementById('wxchip');if(el){const W=WEATHER[k];const on=k!=='clear';el.hidden=!on;if(on){const txt=`${W.name.toUpperCase()} · vision ${Math.round((W.vis-1)*100)}% · accuracy ${Math.round((W.acc-1)*100)}%${W.air===0?' · jets grounded':''}`;if(el.textContent!==txt)el.textContent=txt;}}}
/* ---------- Shader warm-up ----------
   The first time a new kind of object is drawn (a missile, a burnt-out wreck, an aircraft...) the graphics driver has to
   compile its shader, which can stall the game for a moment - several at once during a big strike felt like a freeze.
   While the battle loads, every model and its burnt-wreck version is drawn once out of sight so all shaders are ready. */
function warmShaders(){if(!R3||!SCN||!CAM||!G||G.headless)return;mats();const t0=performance.now();const grp=new THREE.Group();
  const [bx,by]=BASES[ME]||[MAPW/2,MAPH/2];grp.position.set(bx,groundH(bx,by),by);
  const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};
  const add=o=>{if(!o)return;o.traverse(c=>{c.frustumCulled=false;if(c.isMesh)c.castShadow=true;});grp.add(o);};
  const teams=[G.teams[ME],null];
  for(const k of Object.keys(MODELS.proto||{}))for(const T of teams){let o=null;try{o=instModel(k,T,'y',12);}catch(e){}if(!o)continue;add(o);
    if(T){try{const w=o.clone(true);w.traverse(c=>{if(c.isMesh)c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);if(c.isSkinnedMesh)c.visible=false;});add(w);}catch(e){}}}
  try{add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),bm(MAT.std)));add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),MAT.std));}catch(e){}
  for(const op of [.8,.12])add(new THREE.Mesh(new THREE.CircleGeometry(4,8),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:op,depthWrite:false})));
  SCN.add(grp);try{R3.compile(SCN,CAM);if(typeof renderPost==='function'){CAM.updateMatrixWorld();renderPost();}R3.setRenderTarget(null);R3.render(SCN,CAM);}catch(e){console.warn('shader warm-up',e);}SCN.remove(grp);
  console.log('shader warm-up',Math.round(performance.now()-t0)+' ms, '+grp.children.length+' objects');}

/* ================= VIEW: scene sync, camera, HUD, fog, minimap ================= */
const OBJ=new Map();let RINGS=[],GHOST=null,GHOSTK=null,RALLY=null,fogT=0,PPU=1;
const QUAL={lv:0,ema:1/60,bad:0,good:0,caps:[2,1.5,1.25,1,.85,.7],hz:60,dts:[],cost:1/120,fps:60};
// Frame-rate governor: aims for the chosen target (default 120 FPS) or the screen's own refresh rate if lower (a 60 Hz
// screen can never show more than 60). Missed frames step the render resolution and effects down; when frames are
// finishing with plenty of time to spare it steps back up.
function fpsTarget(){let t=120;try{t=+(localStorage.getItem('ww3_fpsT')||120)||120;}catch(e){}return Math.min(t,QUAL.hz*.97);}
function qualTick(dt){if(!(dt>0))return;QUAL.dts.push(dt);if(QUAL.dts.length>180)QUAL.dts.shift();if(QUAL.dts.length>=60&&QUAL.dts.length%30===0){const s=QUAL.dts.slice().sort((a,b)=>a-b);QUAL.hz=Math.max(30,Math.min(360,1/s[Math.floor(s.length*.1)]));}
  QUAL.ema+=(dt-QUAL.ema)*.05;QUAL.fps=1/QUAL.ema;if(QUAL.lock)return;const T=fpsTarget();
  if(QUAL.ema>1/(T*.88)){QUAL.bad+=dt;QUAL.good=0;}else if(QUAL.cost<.45/T){QUAL.good+=dt;QUAL.bad=0;}else{QUAL.bad=Math.max(0,QUAL.bad-dt);QUAL.good=0;}
  if(QUAL.bad>2.5&&QUAL.lv<5){QUAL.lv++;QUAL.bad=0;QUAL.ema=1/T;applyQual();}else if(QUAL.good>10&&QUAL.lv>0){QUAL.lv--;QUAL.good=0;applyQual();}}
function applyQual(){POST.aoOn=QUAL.lv<2;resize();}
function resize(){const r=cv.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,QUAL.caps[QUAL.lv]);VW=Math.max(1,r.width);VH=Math.max(1,r.height);
  if(R3){R3.setPixelRatio(dpr);R3.setSize(VW,VH,false);if(POST.rt)sizePost();CAM.aspect=VW/VH;CAM.updateProjectionMatrix();}hud.width=Math.round(VW*dpr);hud.height=Math.round(VH*dpr);}
function placeCam(){const d=cam.dist,kz=Math.max(0,Math.min(1,(d-230)/(600-230))),p=Math.max(.34+kz*.44,Math.asin(Math.min(1,112/d)));cam.x=Math.max(0,Math.min(MAPW,cam.x));cam.y=Math.max(60+cam.dist*.5,Math.min(MAPH+120,cam.y));cam.x=Math.max(cam.dist*.55,Math.min(MAPW-cam.dist*.55,cam.x));
  const sx=shake>.3?rnd(-shake,shake):0,sy=shake>.3?rnd(-shake,shake):0;
  CAM.position.set(cam.x+sx,Math.sin(p)*d,cam.y+Math.cos(p)*d+sy);CAM.lookAt(cam.x+sx,0,cam.y+sy);CAM.updateMatrixWorld();if(window.SKY)SKY.position.copy(CAM.position);
  SUN.position.set(cam.x+SUNOFF[0],SUNOFF[1],cam.y+SUNOFF[2]);SUN.target.position.set(cam.x,0,cam.y);const hs=Math.max(380,d*1.05),sc=SUN.shadow.camera;if(sc.right!==hs){sc.left=-hs;sc.right=hs;sc.top=hs;sc.bottom=-hs;sc.updateProjectionMatrix();}
  TMP.set(cam.x,0,cam.y).project(CAM);const a=TMP.x;TMP.set(cam.x+100,0,cam.y).project(CAM);PPU=Math.abs(TMP.x-a)*VW/2/100;}
// Smooth camera: jumps (minimap, Home, squad hotkeys), scrolling and zoom set a target and the camera eases toward it
// every frame (frame-rate independent). Anything that moves the camera directly is respected.
function centerOn(x,y,instant){camTarget();cam.tx=x;cam.ty=y-cam.td*.08;if(instant||!G||G.t<.6){cam.x=cam.tx;cam.y=cam.ty;cam._xl=cam.x;cam._yl=cam.y;}}
function camTarget(){if(cam.tx==null||cam.x!==cam._xl||cam.y!==cam._yl){cam.tx=cam.x;cam.ty=cam.y;}if(cam.td==null||cam.dist!==cam._dl)cam.td=cam.dist;}
function camTick(dt){camTarget();const k=1-Math.exp(-dt*9),kz=1-Math.exp(-dt*11);cam.x+=(cam.tx-cam.x)*k;cam.y+=(cam.ty-cam.y)*k;cam.dist+=(cam.td-cam.dist)*kz;
  if(Math.abs(cam.tx-cam.x)<.05)cam.x=cam.tx;if(Math.abs(cam.ty-cam.y)<.05)cam.y=cam.ty;if(Math.abs(cam.td-cam.dist)<.05)cam.dist=cam.td;cam._xl=cam.x;cam._yl=cam.y;cam._dl=cam.dist;}
// which city building is under the cursor (rooftops included)
function civUnder(sx,sy,w){if(!G.civ||!G.civ.length)return null;if(CITYM){const v=new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1);RAY.setFromCamera(v,CAM);const h=RAY.intersectObject(CITYM,true)[0];if(h){const c=civAtXY(h.point.x-h.face.normal.x*2,h.point.z-h.face.normal.z*2);if(c)return c;}}return w?civAtXY(w.x,w.y):null;}
function screenToWorld(sx,sy){const v=new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1);RAY.setFromCamera(v,CAM);const out=new THREE.Vector3();if(!RAY.ray.intersectPlane(GPLANE,out))return null;return{x:out.x,y:out.z};}
function toScreen(x,h,y){TMP.set(x,h,y).project(CAM);return{x:(TMP.x+1)/2*VW,y:(1-TMP.y)/2*VH,z:TMP.z};}
function vis(e){return e.team===ME||e.vis;}
function entHeightMid(e){return e.isB?BH[e.kind]*.6:(e.s.dom==='air'?unitH(e)-groundH(e.x,e.y):6);}
function syncScene(dt){const live=new Set();
  for(const e of G.ents){if(e.dead)continue;live.add(e.id);let o=OBJ.get(e.id);if(o&&o.userData.tm!==undefined&&o.userData.tm!==e.team){SCN.remove(o);o=null;}if(!o){o=makeObj(e);o.userData.tm=e.team;OBJ.set(e.id,o);}
    const v=vis(e);o.visible=v;if(!v)continue;const P=o.userData.parts,gh=unitH(e);o.position.set(e.x,gh,e.y);{const ts=o.userData.toss;if(ts){ts.vh-=260*dt;ts.h+=ts.vh*dt;ts.r+=ts.sp*dt;if(ts.h<=0){o.userData.toss=null;if(P.body)P.body.rotation.z=0;}else{o.position.y+=ts.h;if(P.body)P.body.rotation.z=ts.r;}}}
    if(!e.isB&&P.pennant&&inView(e.x,e.y,.05)){const g=P.pennant.geometry.attributes.position,b=P.pennant.userData.base,t=G.t*(7+(e.v||0)*.08)+e.id;for(let i=0;i<g.count;i++){const x=b[i*3];g.array[i*3+2]=Math.sin(x*.9-t)*x*.12;}g.needsUpdate=true;}
    if(e.isB&&P.flag&&inView(e.x,e.y,.1)){const g=P.flag.geometry.attributes.position,b=P.flag.userData.base,t=G.t*4+e.id;for(let i=0;i<g.count;i++){const x=b[i*3];g.array[i*3+2]=Math.sin(x*.55-t)*x*.09;}g.needsUpdate=true;P.flag.rotation.y=.5+Math.sin(G.t*.3+e.id)*.25;}
    if(e.isB&&e.built>=1){const f=e.hp/e.max,lv=f<.3?2:f<.6?1:0,ud=o.userData;if((ud.dmg||0)<lv){mats();for(let q=ud.dmg||0;q<lv;q++){const h=e.size/2;for(let j=0;j<3;j++){const a=Math.random()*6.28,r=h*(1+Math.random()*.35),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r;scorch(x,y,rnd(12,18));const B=Bld();for(let c=0;c<6;c++){const sz=rnd(3,7);B.box(sz,sz*.6,sz*rnd(.6,1.4),rnd(-6,6),sz*.3,rnd(-6,6),Math.random()<.5?'#4a4640':'#1f1d1a',rnd(-.4,.4),rnd(0,6),rnd(-.4,.4));}const m=mesh(B.geo());m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.castShadow=true;o.add(m);(ud.debris=ud.debris||[]).push(m);}}ud.dmg=lv;}
      else if((ud.dmg||0)>lv&&f>.95){for(const m of ud.debris||[])o.remove(m);ud.debris=[];ud.dmg=0;}}
    if(e.isB){const k=e.built<1,bs=e.kind==='garrison'?1:BSC;o.scale.set(bs,(k?Math.max(.12,e.built):1)*bs,bs);P.scaf.visible=k;P.scaf.scale.y=bs/o.scale.y;
      if(P.gun)P.gun.rotation.y=-e.ang;if(P.dish)P.dish.rotation.y+=dt*(o.userData.parts.dish.isGroup?.5:1.6);if(P.crane)P.crane.rotation.y=Math.sin(G.t*.2+e.id)*1.1;
      if(P.da){const T=G.teams[e.team],f=e.chg!=null?e.chg:(T.charge/T.sup.charge);P.da.position.x=-9-f*16;P.db.position.x=9+f*16;P.missile.position.y=-20+f*24+(P.hy||0);}
      if(!k){const f=e.hp/e.max;
        if(e.built>=1&&f<.4&&inView(e.x,e.y,.2)){if(!e.fires){const R=mulberry(e.id*17+3);e.fires=[];for(let q=0;q<3;q++){const edge=q===2;e.fires.push([(R()-.5)*e.size*(edge?.9:.5),(R()-.5)*e.size*(edge?.9:.5),edge?BH[e.kind]*(.3+R()*.3):BH[e.kind]*(.85+R()*.25)]);}}
          const nf=f<.2?3:f<.3?2:1;for(let q=0;q<nf;q++){const [fx,fy,fh]=e.fires[q];if(Math.random()<dt*16){part({x:e.x+fx+rnd(-3,3),y:e.y+fy+rnd(-3,3),h:gh+fh,vh:rnd(12,26),rise:rnd(16,26),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(7,13),g:-3,d:rnd(.4,.8),a:.9});}
            if(Math.random()<dt*5)part({x:e.x+fx,y:e.y+fy,h:gh+fh+6,vx:3,rise:rnd(36,50),c:C_DARK,c2:[.36,.35,.33],ck:.35,s:rnd(7,11),g:12,d:rnd(2.8,3.8),a:.5});
            if(Math.random()<dt*2.5)part({x:e.x+fx,y:e.y+fy,h:gh+fh,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:1.3,f:.6,grav:1,d:rnd(.4,.8)});}
          if(e.fires&&Math.random()<dt*1.2){const L=LIGHTS&&LIGHTS.find(l=>l.intensity<.05);if(L){L.position.set(e.x+e.fires[0][0],gh+e.fires[0][2]+6,e.y+e.fires[0][1]);L.color.setRGB(1,.55,.2);L.intensity=1.6;L.distance=120;L.userData.d=.9;L.userData.t=0;}}}
        if(f<.6&&Math.random()<dt*(f<.3?9:4))part({x:e.x+rnd(-e.size*.3,e.size*.3),y:e.y+rnd(-e.size*.3,e.size*.3),h:gh+BH[e.kind]*rnd(.5,1),rise:rnd(30,44),c:f<.3?C_DARK:C_SMOKE,c2:[.46,.44,.41],ck:.35,s:rnd(7,11),g:12,d:rnd(2,3),a:.5});
        if(f<.3&&Math.random()<dt*7)part({x:e.x+rnd(-e.size*.3,e.size*.3),y:e.y+rnd(-e.size*.3,e.size*.3),h:gh+BH[e.kind]*rnd(.4,1),rise:20,add:true,c:C_FIRE,s:rnd(6,12),g:-5,d:rnd(.3,.6)});
        if(e.kind==='factory'&&(e.busy||(G.teams[e.team].q.factory||[]).length)&&Math.random()<dt*5)part({x:e.x+28,y:e.y-26,h:gh+46,vx:rnd(2,8),rise:24,c:C_SMOKE,s:rnd(5,9),g:14,d:rnd(1.8,2.6),a:.45});
        if(e.dis>G.t||e.disv){if(Math.random()<dt*10)part({x:e.x+rnd(-e.size*.4,e.size*.4),y:e.y+rnd(-e.size*.4,e.size*.4),h:gh+rnd(4,BH[e.kind]),vh:rnd(10,30),add:true,c:[.3,1,.5],s:rnd(2,3.5),d:rnd(.4,.9)});}
        if(e.charge||e.chv){if(Math.random()<dt*14)part({x:e.x+e.size*.45,y:e.y+e.size*.45,h:gh+4,add:true,c:[1,.2,.1],s:4,d:.12});}}}
    else{const s=e.s,c=s.cls;if(s.dom==='ground'&&s.armor==='heavy'){const ft=G.t-(e.lastFire||-9);if(ft<.2&&ft>=0){const k=(1-ft/.2)*2.4,ang=e.tang??e.va;o.position.x-=Math.cos(ang)*k;o.position.z-=Math.sin(ang)*k;o.rotation.x=0;}}if(s.dom==='naval'){o.rotation.z=Math.sin(G.t*1.1+e.id)*.025;o.rotation.x=Math.sin(G.t*.8+e.id*2)*.02;o.position.y+=Math.sin(G.t*1.4+e.id)*.6;}const mv0=G.t-(e.mv||-9)<.15||(e.mvC>0);let yawT=e.va;if(o.userData.model&&!P.turret&&!mv0&&e.tang!=null&&G.t-(e.lastFire||-9)<4&&s.dom!=='air')yawT=e.tang;
      if(o.userData.yaw==null)o.userData.yaw=yawT;o.userData.yaw=lerpA(o.userData.yaw,yawT,Math.min(1,dt*3.5));o.rotation.y=-o.userData.yaw;
      if(P.turret)P.turret.rotation.y=-(e.tang-e.va);
      // ground vehicles: follow the terrain slope, squat under acceleration, dip when braking and lean into turns
      if(s.dom==='ground'&&s.armor==='heavy'&&o.userData.model&&inView(e.x,e.y,.1)){const ud=o.userData,ca=Math.cos(e.va),sa=Math.sin(e.va),L=Math.max(10,e.r*1.1);
        const fr=groundH(e.x+ca*L,e.y+sa*L),bk=groundH(e.x-ca*L,e.y-sa*L),lf=groundH(e.x-sa*L*.7,e.y+ca*L*.7),rt=groundH(e.x+sa*L*.7,e.y-ca*L*.7);
        const tp=Math.atan2(fr-bk,2*L),tr=Math.atan2(lf-rt,1.4*L);const v=e.v||0,acc=(v-(ud.pv??v))/Math.max(dt,1e-3);ud.pv=v;
        const yr=angDiff(ud.pyaw2??ud.yaw,ud.yaw)/Math.max(dt,1e-3);ud.pyaw2=ud.yaw;
        ud.sp=(ud.sp||0)+((Math.max(-.05,Math.min(.05,acc*.0011)))-(ud.sp||0))*Math.min(1,dt*6);ud.sr=(ud.sr||0)+((Math.max(-.05,Math.min(.05,yr*v*.0009)))-(ud.sr||0))*Math.min(1,dt*5);
        o.rotation.order="YZX";o.rotation.z=tp+ud.sp;o.rotation.x=-tr+ud.sr;
        if(v>2)o.position.y+=Math.sin(G.t*23+e.id)*.12*Math.min(1,v/40);}
      if(e.kind==='heli'){const ud=o.userData;o.rotation.order='YXZ';const mv=(G.t-(e.mv||-9)<.25)||(e.mvC>0);const prev=ud.pyaw??ud.yaw;let tr=ud.yaw-prev;tr=Math.atan2(Math.sin(tr),Math.cos(tr))/Math.max(dt,1e-3);ud.pyaw=ud.yaw;
        const hv=e.v||0,ha=(hv-(ud.phv??hv))/Math.max(dt,1e-3);ud.phv=hv;ud.pt=(ud.pt||0)+((e.landed?0:Math.max(-.22,Math.min(.3,.04+hv/Math.max(60,e.s.spd)*.24-ha*.003)))-(ud.pt||0))*Math.min(1,dt*1.8);ud.rl=(ud.rl||0)+((e.landed?0:Math.max(-.32,Math.min(.32,tr*.35)))-(ud.rl||0))*Math.min(1,dt*2.5);
        o.rotation.z=-ud.pt;o.rotation.x=ud.rl;if(!e.landed){o.position.y+=Math.sin(G.t*1.3+e.id)*1.2;const gh2=groundH(e.x,e.y);if(Math.random()<dt*14&&inView(e.x,e.y,.2)){const a=rnd(0,6.283),r=rnd(6,20);part({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r,h:gh2+2,vx:Math.cos(a)*rnd(30,55),vy:Math.sin(a)*rnd(30,55),f:.5,c:C_DUST,s:rnd(8,13),g:12,d:rnd(.9,1.4),a:.16});}}}
      if(P.props){for(const p of P.props)p.m.rotation[p.ax]+=dt*(p.ax==='x'?55:70);if(e.kind==='drone'){const ud=o.userData,prev=ud.pyd??ud.yaw;let tr=angDiff(prev,ud.yaw)/Math.max(dt,1e-3);ud.pyd=ud.yaw;const t=e.target,d=t&&!t.dead?Math.hypot(t.x-e.x,t.y-e.y):1e9;
          const dsp=Math.hypot(e.x-(ud.dpx??e.x),e.y-(ud.dpy??e.y))/Math.max(dt,1e-3);ud.dpx=e.x;ud.dpy=e.y;ud.dsv=(ud.dsv||0)+(Math.min(1,dsp/Math.max(40,e.s.spd))-(ud.dsv||0))*Math.min(1,dt*3);
          ud.dp=(ud.dp||0)+(((d<170?.55*(1-d/170):0)+(ud.dtype==='delta'?.04:.04+.26*ud.dsv))-(ud.dp||0))*Math.min(1,dt*4);if(ud.dtype==='delta'&&inView(e.x,e.y,.1)&&Math.random()<dt*10){const bx=e.x-Math.cos(ud.yaw)*12,by=e.y-Math.sin(ud.yaw)*12;part({x:bx,y:by,h:o.position.y,c:[.6,.6,.58],s:rnd(2.5,3.5),g:0,d:rnd(.8,1.3),a:.22,rise:.5});}o.rotation.order='YZX';o.rotation.z=-ud.dp;o.rotation.x=Math.max(-.75,Math.min(.75,tr*(ud.dtype==='delta'?.55:.15)));
          if(P.dshadow){P.dshadow.position.y=groundH(e.x,e.y)-o.position.y+.8;}}}
      if(P.rotor)P.rotor.rotation.y+=dt*(e.landed?3:28);if(P.blades){P.blades.rotation.y+=dt*(e.landed?2.5:13);if(P.rotor)P.rotor.visible=!e.landed;}if(P.tailR)P.tailR.rotation.z+=dt*(e.landed?6:42);if(P.tailR0)P.tailR0.rotation.x+=dt*(e.landed?6:42);
      if(P.glow)P.glow.visible=!e.landed;
      if(P.cargo)P.cargo.visible=!!e.cargo;
      if((e.kind==='ew'||e.kind==='cbr')&&P.crane)P.crane.rotation.y+=dt*(e.kind==='ew'?2.2:.9);
      if(e.kind==='dozer'){const cr=P.crane;if(cr){cr.rotation.y=e.building?.5+Math.sin(G.t*1.3+e.id)*.9:lerpA(cr.rotation.y,.5,dt*2);}if(e.building&&inView(e.x,e.y,.1)&&Math.random()<dt*9){const ca=Math.cos(e.va),sa=Math.sin(e.va),hx=e.x+ca*30+rnd(-10,10),hy=e.y+sa*30+rnd(-10,10),gh=groundH(hx,hy)+rnd(4,14);part({x:hx,y:hy,h:gh,s:2.2,d:.08,add:true,c:[3,2.6,1.6]});for(let q=0;q<3;q++)part({x:hx,y:hy,h:gh,vx:rnd(-50,50),vy:rnd(-50,50),vh:rnd(30,90),add:true,c:C_SPARK,s:1.1,f:.6,grav:1,d:rnd(.25,.5)});if(Math.random()<.3)part({x:hx,y:hy,h:gh,vx:rnd(-6,6),vy:rnd(-6,6),rise:12,c:C_DUST,s:rnd(4,7),g:8,d:1.2,a:.3});}}
      const moving=G.t-(e.mv||-9)<.15||(e.mvC>0);
      {const f=e.hp/e.max;if(f<.5&&!['inf','at','hacker','hero'].includes(c)&&Math.random()<dt*(f<.25?7:2.5)){const hh=gh+(s.dom==='air'?0:8);part({x:e.x+rnd(-3,3),y:e.y+rnd(-3,3),h:hh+4,rise:rnd(34,48),c:f<.25?C_DARK:C_SMOKE,c2:[.46,.44,.41],ck:rnd(.25,.4),s:rnd(3,5),g:6,d:rnd(1.6,2.4),a:.38});if(f<.25&&Math.random()<.5)part({x:e.x+rnd(-3,3),y:e.y+rnd(-3,3),h:hh,rise:14,add:true,c:C_FIRE,s:rnd(3,5),g:-3,d:rnd(.2,.4)});}}
      if(o.userData.mixers)playAnim(o,c==='hero'?(moving?'run':(G.t-(e.lastFire||-9)<1?'shoot':'aim')):'stand',dt);
      if(P.body&&(o.userData.walker||['inf','at','hero','hacker'].includes(c))){if(o.userData.walker){const near=inView(e.x,e.y,.05);o.userData.wa=Math.max(0,Math.min(1,(o.userData.wa||0)+(moving?dt*5:-dt*5)));const wa=o.userData.wa;let k=0;for(const m of P.body.children){const ph=G.t*9.5*(e.s.spd/50)+e.id+k*1.9;m.position.y=wa*Math.abs(Math.cos(ph))*.45;m.rotation.x=0;m.rotation.z=-.06*wa;if(near&&m.userData.legs&&(wa>0||m.userData.wl))walkPose(m,ph,wa);m.userData.wl=wa>0;k++;}}else if(o.userData.cleric){P.body.position.y=moving?Math.abs(Math.sin(G.t*5+e.id))*.22:0;P.body.rotation.x=moving?Math.sin(G.t*5+e.id)*.03:0;}else P.body.position.y=moving&&!o.userData.mixers?Math.abs(Math.sin(G.t*12+e.id))*1.2:0;}
      if(c==='hero'&&P.body&&!o.userData.model){const hid=e.hid;P.body.material=hid?(MAT.stealth||(MAT.stealth=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.35}))):MAT.std;}
      if(c==='jet'&&!e.landed){const ud=o.userData;o.rotation.order='YZX';const tr=angDiff(ud.pjy??e.va,e.va)/Math.max(dt,1e-3);ud.pjy=e.va;ud.bk=(ud.bk||0)+((Math.max(-1.05,Math.min(1.05,-tr*.55)))-(ud.bk||0))*Math.min(1,dt*3);
        const vy=(gh-(ud.pgh??gh))/Math.max(dt,1e-3);ud.pgh=gh;ud.pc=(ud.pc||0)+((Math.max(-.6,Math.min(.6,Math.atan2(vy,Math.max(60,e.s.spd)))))-(ud.pc||0))*Math.min(1,dt*3);o.rotation.x=ud.bk;o.rotation.z=ud.pc;
        if(P.glow){const ab=(e.toT!=null&&G.t-e.toT<4)||vy>25;P.glow.scale.setScalar(ab?1.6:1);}
        if(inView(e.x,e.y,.15)){const yw=e.va||0,cx=Math.cos(yw),sx=Math.sin(yw),hard=Math.abs(ud.bk)>.45||Math.abs(ud.pc)>.3;for(const sd of [-1,1]){if(hard||Math.random()<.35){const wx=e.x-cx*6-sx*sd*15,wy=e.y-sx*6+cx*sd*15;part({x:wx,y:wy,h:gh+sd*Math.sin(ud.bk)*8,c:[.93,.94,.96],s:hard?2.6:1.6,g:0,d:hard?.9:.45,a:hard?.42:.22,f:0});}}
          if(Math.random()<.7)part({x:e.x-cx*24,y:e.y-sx*24,h:gh+1,c:[.55,.54,.52],s:rnd(2.5,4),g:0,d:rnd(.35,.6),a:.18,f:0});}
        if(Math.abs(ud.bk)>.7&&Math.random()<dt*30){for(const sg of [-1,1])part({x:e.x+Math.sin(e.va)*sg*16,y:e.y-Math.cos(e.va)*sg*16,h:gh+sg*Math.sin(ud.bk)*10,c:[.95,.95,.98],s:1.6,g:2,d:.5,a:.4,f:1});}if(Math.random()<dt*20)part({x:e.x-Math.cos(e.va)*18,y:e.y-Math.sin(e.va)*18,h:gh,c:[.85,.85,.85],s:2.2,g:3,d:.7,a:.35});}
      if(c==='heli'&&!e.landed&&gh-groundH(e.x,e.y)<70&&Math.random()<dt*4)part({x:e.x+rnd(-20,20),y:e.y+rnd(-20,20),h:groundH(e.x,e.y)+1,vx:rnd(-40,40),vy:rnd(-40,40),c:C_DUST,s:rnd(4,7),g:10,d:.8,a:.25});
      if(moving){const dx=e.x-(e.lx??e.x),dy=e.y-(e.ly??e.y),dd=Math.hypot(dx,dy);e.odo=(e.odo||0)+dd;
        if(s.dom==='ground'&&s.armor==='heavy'&&Math.floor(e.odo/8)!==Math.floor((e.odo-dd)/8)){const ca=Math.cos(e.va),sa=Math.sin(e.va),w=e.r*.68;track(e.x-sa*w,e.y+ca*w,e.va);track(e.x+sa*w,e.y-ca*w,e.va);for(let q=0;q<2;q++)part({x:e.x-ca*e.r*1.1+rnd(-4,4),y:e.y-sa*e.r*1.1+rnd(-4,4),h:gh+3,vx:rnd(-8,8)-ca*14,vy:rnd(-8,8)-sa*14,f:.4,rise:rnd(4,9),c:Math.random()<.5?[.72,.6,.45]:[.6,.5,.38],s:rnd(9,14),g:15,d:rnd(2.2,3.4),a:.42});if(Math.random()<.4)for(let q=0;q<3;q++)part({x:e.x-ca*e.r,y:e.y-sa*e.r,h:gh+2,vx:-ca*rnd(20,50)+rnd(-15,15),vy:-sa*rnd(20,50)+rnd(-15,15),vh:rnd(40,90),c:[.25,.2,.14],s:rnd(1.2,2.2),f:.8,grav:1,d:rnd(.5,.9)});}
        if(s.dom==='ground'&&s.armor==='heavy'&&Math.random()<dt*6){const ca=Math.cos(e.va),sa=Math.sin(e.va);part({x:e.x-ca*e.r*1.1,y:e.y-sa*e.r*1.1,h:gh+7,vx:-ca*10,vy:-sa*10,rise:14,c:[.3,.29,.27],c2:[.5,.48,.45],ck:.3,s:rnd(2,3.2),g:6,d:rnd(.6,.9),a:.28});}
        if(s.dom==='naval'&&dd>0&&Math.random()<dt*25){const ca=Math.cos(e.va),sa=Math.sin(e.va),sp=Math.min(1,dd/Math.max(dt,1e-3)/60),big=e.r>18?1.6:1;for(const sd of [-1,1])part({x:e.x-ca*e.r+sa*sd*e.r*.4,y:e.y-sa*e.r-ca*sd*e.r*.4,h:WL+1,vx:sa*sd*14,vy:-ca*sd*14,c:[.85,.92,.95],s:rnd(3,5)*big,g:8,d:1.2,a:.7});
          part({x:e.x-ca*e.r*1.05+rnd(-2,2),y:e.y-sa*e.r*1.05+rnd(-2,2),h:WL+.6,vx:-ca*8,vy:-sa*8,f:.6,c:[.8,.88,.9],s:rnd(5,8)*big,g:9*big,d:rnd(2.6,3.6),a:.32*(.4+sp*.6)});
          if(sp>.4)for(const sd of [-1,1])part({x:e.x+ca*e.r*.75+sa*sd*e.r*.25,y:e.y+sa*e.r*.75-ca*sd*e.r*.25,h:WL+2,vx:sa*sd*rnd(20,40)+ca*10,vy:-ca*sd*rnd(20,40)+sa*10,vh:rnd(10,30),grav:1,f:.7,c:[.92,.96,1],s:rnd(2,3.5)*big,g:6,d:rnd(.4,.7),a:.6});}}
      e.lx=e.x;e.ly=e.y;}}
  for(const [id,o] of OBJ)if(!live.has(id)){SCN.remove(o);OBJ.delete(id);}
  if(G.fieldObj)G.fields.forEach((f,i)=>{const v=G.fieldObj[i];if(!v)return;const k=Math.ceil(v.n*Math.max(0,f.amt)/(f.amt0||9000));v.items.forEach((it,j)=>it.visible=j<k);});
  if(G.sceneryPos)for(const [sx,sy,k,wx,wy] of G.sceneryPos){if(k!==2||wx==null||Math.random()>dt*5||!inView(sx,sy,.2))continue;part({x:wx+rnd(-3,3),y:wy+rnd(-3,3),h:groundH(wx,wy)+10,vx:2,rise:rnd(40,52),c:C_SMOKE,c2:[.5,.48,.45],ck:.35,s:rnd(4,6),g:7,d:rnd(3,4),a:.2});}
  if(G.oilObj)G.oil.forEach((o,i)=>{const v=G.oilObj[i];const ph=G.t*1.6+i;
    if(o.dead!==v.wasDead){v.wasDead=o.dead;v.grp.rotation.x=o.dead?.32:0;v.grp.rotation.z=o.dead?-.22:0;v.grp.position.y=groundH(o.x,o.y)-(o.dead?5:0);v.grp.traverse(c=>{if(c.isMesh&&c.material&&c.material.color){if(!c.userData.oc)c.userData.oc=c.material.color.clone();if(c.material===MAT.std)return;c.material=c.material.clone();c.material.color.copy(o.dead?c.userData.oc.clone().multiplyScalar(.22):c.userData.oc);}});if(o.dead&&typeof scorch==='function')scorch(o.x,o.y,34);}
    if(o.dead){const gh=groundH(o.x,o.y);if(inView(o.x,o.y,.2)){const k=o.burn>0?1:.25;if(Math.random()<dt*14*k)part({x:o.x+rnd(-10,10),y:o.y+rnd(-10,10),h:gh+rnd(4,14),vh:rnd(10,30),rise:rnd(14,24),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(5,11),g:-2,d:rnd(.4,.8),a:.9});
      if(Math.random()<dt*9*k)part({x:o.x+rnd(-8,8),y:o.y+rnd(-8,8),h:gh+16,vx:4,rise:rnd(30,44),c:C_DARK,c2:[.3,.29,.27],ck:.35,s:rnd(8,13),g:14,d:rnd(3.5,5),a:.55});}return;}
    {const dry=o.res0&&o.res<=0;if(dry!==!!v.wasDry){v.wasDry=dry;v.grp.traverse(c=>{if(c.isMesh&&c.material&&c.material.color&&c!==v.flag){if(!c.userData.oc)c.userData.oc=c.material.color.clone();if(c.material===MAT.std)return;if(!c.userData.ownM){c.material=c.material.clone();c.userData.ownM=1;}c.material.color.copy(dry?c.userData.oc.clone().multiplyScalar(.55):c.userData.oc);}});}if(dry){v.arm.rotation.z=.18;return;}}
    v.arm.rotation.z=Math.sin(ph)*.24;if(v.crank)v.crank.rotation.z=ph+Math.PI/2;v.flag.material.color.set(o.owner>=0?G.teams[o.owner].color:'#8a8a80');if(o.owner>=0&&Math.random()<dt*1.5)part({x:o.x+10,y:o.y+6,h:groundH(o.x,o.y)+12,rise:12,c:C_DARK,s:4,g:6,d:1.5,a:.35});});
  // selection rings
  while(RINGS.length<G.sel.length){const m=new THREE.Mesh(new THREE.RingGeometry(.86,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x8af0a6,transparent:true,opacity:.85,depthWrite:false}));m.renderOrder=3;SCN.add(m);RINGS.push(m);}
  RINGS.forEach((m,i)=>{const e=G.sel[i];if(!e||e.dead){m.visible=false;return;}m.visible=true;const r=e.isB?e.size*.75:e.r+6;m.scale.set(r,1,r);m.position.set(e.x,groundH(e.x,e.y)+1.2,e.y);});
  // rally flag
  const T=G.teams[ME];if(T&&T.rally){if(!RALLY){RALLY=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,24,5),new THREE.MeshBasicMaterial({color:0x2a2b26}));pole.position.y=12;RALLY.add(pole);const fl=new THREE.Mesh(new THREE.PlaneGeometry(12,7),new THREE.MeshBasicMaterial({color:0x74d08f,side:THREE.DoubleSide}));fl.position.set(6,20,0);RALLY.add(fl);SCN.add(RALLY);}
    RALLY.visible=true;RALLY.position.set(T.rally.x,groundH(T.rally.x,T.rally.y),T.rally.y);RALLY.children[1].rotation.y=Math.sin(G.t*3)*.3;}else if(RALLY)RALLY.visible=false;
  // placement ghost
  if(G.place){if(GHOSTK!==G.place){if(GHOST)SCN.remove(GHOST);GHOST=makeGhost(G.place);GHOST.scale.setScalar(BSC);GHOSTK=G.place;}const w=screenToWorld(mouse.x,mouse.y);if(w){const ok=validSpot(ME,G.place,w.x,w.y);G.placeWhy=ok?(ok===2?'dz':''):validSpot.why;GHOST.visible=true;GHOST.position.set(w.x,groundH(w.x,w.y),w.y);
    GHOST.traverse(c=>{if(c.isMesh&&c!==GHOST.userData.ring)c.material=ok?MAT.ghostOk:MAT.ghostBad;});const rg=STRUCT[G.place].rng||0;GHOST.userData.ring.visible=!!rg;GHOST.userData.ring.scale.set(rg/BSC,1,rg/BSC);GHOST.userData.ring.position.y=2;}}
  else if(GHOST){SCN.remove(GHOST);GHOST=null;GHOSTK=null;}
  // pings
  for(const p of PINGS){if(!p.m){p.m=new THREE.Mesh(new THREE.RingGeometry(.9,1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:p.c,transparent:true,depthWrite:false}));p.m.position.set(p.x,groundH(p.x,p.y)+3,p.y);SCN.add(p.m);}
    const k=p.t/p.d;p.m.scale.setScalar(p.r*(.2+k*.8));p.m.material.opacity=1-k;if(k>=.98){SCN.remove(p.m);}}
}
function updateFog(){const c=FOGC.b.getContext('2d'),W=FOGC.width,H=FOGC.height,sx=W/MAPW,sy=H/MAPH;c.globalCompositeOperation='source-over';c.fillStyle='rgb(212,212,212)';c.fillRect(0,0,W,H);
  const hole=(x,y,R)=>{const g=c.createRadialGradient(x*sx,y*sy,R*sx*.5,x*sx,y*sy,R*sx);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.arc(x*sx,y*sy,R*sx,0,7);c.fill();};
  {const sk=(G.teams[ME].F.mods.sight||1)*1.08;for(const e of G.ents)if(e.team===ME&&!e.dead)hole(e.x,e.y,(!e.isB&&e.s.vis?e.s.vis:e.isB?340:e.s.dom==='air'?340:e.s.dom==='naval'?380:280)*sk);}
  for(const r of (G.teams[ME].reveals||[]))hole(r.x,r.y,r.r);c.globalCompositeOperation='source-over';const f=FOGC.getContext('2d');f.filter='blur(4px)';f.drawImage(FOGC.b,0,0);f.filter='none';FOGT.needsUpdate=true;}
const SHORTN={inf:'INF',at:'AT',aa:'AA',tank:'TANK',arty:'ARTY',apc:'APC',hero:'HERO',hacker:'HACK',dozer:'DOZER',demo:'DEMO',sniper:'SNIPER',mlrs:'MLRS',ifv:'IFV'};
function drawHUD(){const c=hx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,VW,VH);
  for(const e of G.ents){if(e.dead||!vis(e))continue;const sel=G.sel.includes(e);if(SET.hp!=='all'&&!sel&&e.hp>=e.max&&!(e.rank>0)&&!(e.isB&&e.built<1)&&!e.hacking&&!e.planting&&!(e.building&&e.team===ME)&&!((e.supp||0)>.5&&e.team===ME)&&!(e.rout>G.t||e.routV)&&!(e.team===ME&&!e.isB&&(()=>{const m=moraleOf(e);return m&&m.v<.995;})())&&!(e.team===ME&&G.sqOf&&G.sqOf[e.id])&&!(e.mark>G.t||e.markV))continue;
    const top=e.isB?BH[e.kind]+8:entHeightMid(e)+(e.s.dom==='air'?14:16);const p=toScreen(e.x,unitH(e)+top,e.y);if(p.z>1||p.x<-40||p.y<-40||p.x>VW+40||p.y>VH+40)continue;
    const w=Math.max(18,Math.min(90,(e.isB?e.size:e.r*2.6)*PPU));
    if(sel||e.hp<e.max||SET.hp==='all'){const f=Math.max(0,e.hp/e.max);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-w/2-1,p.y-1,w+2,5);c.fillStyle=f>.5?'#74d08f':f>.25?'#e3b341':'#ea5a40';c.fillRect(p.x-w/2,p.y,w*f,3);c.fillStyle='rgba(0,0,0,.45)';for(let i=1;i<5;i++)c.fillRect(p.x-w/2+w*i/5,p.y,1,3);}
    if(e.aband&&!e.isB){c.font='bold 10px system-ui,sans-serif';c.textAlign='center';c.fillStyle='rgba(0,0,0,.7)';c.fillText('ABANDONED',p.x+1,p.y-4);c.fillStyle=ally(e.team,ME)?'#e3b341':'#ffd166';c.fillText('ABANDONED',p.x,p.y-5);c.textAlign='left';}
    {const mo=!e.isB?moraleOf(e):null;if(mo&&(sel||mo.v<.995||mo.st==='fearless'&&e.team===ME&&sel||mo.st==='routing')&&(ally(e.team,ME)||sel||mo.v<.66)){const y=p.y+(sel||e.hp<e.max||SET.hp==='all'?5:0);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-w/2-1,y-1,w+2,4);c.fillStyle=MOR_COL[mo.st];c.fillRect(p.x-w/2,y,Math.max(2,w*mo.v),2);if(mo.st==='fearless'){c.fillStyle='#5fd38a';c.beginPath();c.arc(p.x+w/2+5,y+1,2.2,0,7);c.fill();}}}
    if(!e.isB&&e.team===ME&&G.sqOf&&G.sqOf[e.id]){const q=G.sqOf[e.id];c.fillStyle='rgba(0,0,0,.7)';c.fillRect(p.x-w/2-13,p.y-3,10,10);c.fillStyle='#e3b341';c.font='700 10px IBM Plex Mono, monospace';c.textAlign='center';c.fillText(q,p.x-w/2-8,p.y+5);}
    if(e.rank>0){c.fillStyle='#f2c94c';c.strokeStyle='rgba(0,0,0,.7)';c.lineWidth=1;for(let i=0;i<e.rank;i++){const x=p.x+w/2+4,y=p.y+4-i*4;c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y-3);c.lineTo(x+8,y);c.lineTo(x+8,y+2);c.lineTo(x+4,y-1);c.lineTo(x,y+2);c.closePath();c.fill();c.stroke();}}
    if(e.isB&&e.built<1){c.fillStyle='#000';c.fillRect(p.x-w/2,p.y+7,w,4);c.fillStyle='#e3b341';c.fillRect(p.x-w/2,p.y+7,w*e.built,4);if(e.stall&&e.team===ME){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('WAITING FOR CONSTRUCTION VEHICLE',p.x,p.y+24);}}
    if(!e.isB&&e.team!==ME&&(e.mark>G.t||e.markV)){c.strokeStyle='#ea5a40';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y-14,6,0,7);c.moveTo(p.x-9,p.y-14);c.lineTo(p.x+9,p.y-14);c.moveTo(p.x,p.y-23);c.lineTo(p.x,p.y-5);c.stroke();}
    {const rt=MODE==='client'?e.routV:e.rout>G.t,sh=!rt&&(MODE==='client'?e.shakV:(!e.isB&&e.s&&canRout(e)&&(e.fear||0)>courageOf(e)*.65));
     if(!e.isB&&rt){c.font='700 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle=ally(e.team,ME)?'#ea5a40':'#f2c94c';c.fillText('ROUTING',p.x,p.y-6);}
     else if(!e.isB&&e.team===ME&&sh){c.font='600 10px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('SHAKEN',p.x,p.y-6);}
     else if(!e.isB&&e.team===ME&&(e.supp||0)>.5){c.font='600 10px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#ea5a40';c.fillText('SUPPRESSED',p.x,p.y-6);}}
    if(e.kind==='dozer'&&e.building&&e.team===ME){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('BUILDING',p.x,p.y-6);}
    if(e.hacking||e.planting){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle=e.planting?'#ea5a40':'#74d08f';c.fillText(e.planting?'PLANTING':(e.order&&e.order.type==='hack'||e.hk)?'HACKING':'+$ ONLINE',p.x,p.y-6);}}
  {const T=G.teams[ME];if(T){const n=MODE==='client'?(T.tunN|0):(T.tun||[]).length,K=MODE==='client'?(T.tunK||{}):tunKinds(T);
   for(const e of G.ents){if(e.dead||e.team!==ME||e.kind!=='tunnel'||e.built<1)continue;const p=toScreen(e.x,groundH(e.x,e.y)+BH.tunnel+14,e.y);if(p.z>1||p.x<-80||p.y<-40||p.x>VW+80||p.y>VH+40)continue;
     const parts=Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+' '+(SHORTN[k]||k.toUpperCase()));const t1='TUNNEL '+n+'/'+TUN_CAP,t2=n?parts.join(' · '):'empty';
     c.font='700 12px Saira Condensed, sans-serif';const w1=c.measureText(t1).width;c.font='500 10px IBM Plex Mono, monospace';const w2=c.measureText(t2).width;const W=Math.max(w1,w2)+14,H=n?31:29;
     c.fillStyle='rgba(8,12,10,.82)';c.fillRect(p.x-W/2,p.y-H,W,H);c.strokeStyle=n>=TUN_CAP?'#ea5a40':n?'#74d08f':'#55655c';c.lineWidth=1.5;c.strokeRect(p.x-W/2+.5,p.y-H+.5,W-1,H-1);
     c.fillStyle=n>=TUN_CAP?'#ea5a40':'#e8efe9';c.textAlign='center';c.font='700 12px Saira Condensed, sans-serif';c.fillText(t1,p.x,p.y-H+13);c.font='500 10px IBM Plex Mono, monospace';c.fillStyle=n?'#b9d8c2':'#7f8f86';c.fillText(t2,p.x,p.y-H+25);
     c.fillStyle='rgba(0,0,0,.5)';c.fillRect(p.x-W/2+3,p.y-3,W-6,2);c.fillStyle=n>=TUN_CAP?'#ea5a40':'#74d08f';c.fillRect(p.x-W/2+3,p.y-3,(W-6)*n/TUN_CAP,2);}}}
  // garrison prompt: with infantry selected, outline the city building under the cursor and say how many fit
  {const inf=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&typeof canGarrison==='function'&&canGarrison(u));if(inf&&!G.place&&!G.aim){const now=performance.now();if(now-(drawHUD.ht||0)>90){drawHUD.ht=now;const w=screenToWorld(mouse.x,mouse.y);drawHUD.hc=civUnder(mouse.x,mouse.y,w);}
    const cv=drawHUD.hc;if(cv&&!cv.dead){const own=cv.g&&!cv.g.dead,mine=own&&ally(cv.g.team,ME),enemy=own&&!mine;const n=MODE==='client'?(own?(cv.g.occN|0):0):cv.occ.length,cap=cv.cap;const bh=cv.h,g0=groundH(cv.x,cv.y),hw=CELL/2;
      const pts=[[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]].map(([dx,dy])=>toScreen(cv.x+dx,g0+bh+1,cv.y+dy));const pb=[[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]].map(([dx,dy])=>toScreen(cv.x+dx,g0,cv.y+dy));
      c.strokeStyle=enemy?'#ea5a40':n>=cap?'#e3b341':'#74d08f';c.lineWidth=2;c.setLineDash([]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();for(let i=0;i<4;i++){c.beginPath();c.moveTo(pts[i].x,pts[i].y);c.lineTo(pb[i].x,pb[i].y);c.stroke();}
      const top=pts.reduce((a,p)=>p.y<a.y?p:a,pts[0]);const t=enemy?'ENEMY-HELD BUILDING':n>=cap?'BUILDING FULL '+n+'/'+cap:'CLICK TO GARRISON  '+n+'/'+cap;c.font='700 12px Saira Condensed, sans-serif';const tw=c.measureText(t).width+12;c.fillStyle='rgba(8,12,10,.85)';c.fillRect(top.x-tw/2,top.y-24,tw,17);c.fillStyle=c.strokeStyle;c.textAlign='center';c.fillText(t,top.x,top.y-11);}}}
  // own garrisons: troop count over the building
  for(const e of G.ents){if(e.dead||e.kind!=='garrison'||!ally(e.team,ME))continue;const cv=civAtXYAny(e.x,e.y);const bh=cv?cv.h:20;const p=toScreen(e.x,groundH(e.x,e.y)+bh+22,e.y);if(p.z>1||p.x<-40||p.y<-40||p.x>VW+40||p.y>VH+40)continue;const n=MODE==='client'?(e.occN|0):(cv?cv.occ.length:0),cap=MODE==='client'?(e.capN|0):(cv?cv.cap:0);
    const t='GARRISON '+n+'/'+cap;c.font='700 11px Saira Condensed, sans-serif';const tw=c.measureText(t).width+10;c.fillStyle='rgba(8,12,10,.8)';c.fillRect(p.x-tw/2,p.y-13,tw,15);c.fillStyle=e.team===ME?'#74d08f':'#7fb6e8';c.textAlign='center';c.fillText(t,p.x,p.y-2);}
  for(const m of (G.mines||[])){if(m.team!==ME)continue;const p=toScreen(m.x,groundH(m.x,m.y)+1,m.y);if(p.z>1||p.x<-10||p.y<-10||p.x>VW+10||p.y>VH+10)continue;c.strokeStyle='#e3b341';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,4,0,7);c.stroke();c.fillStyle='rgba(20,20,16,.85)';c.beginPath();c.arc(p.x,p.y,2.5,0,7);c.fill();}
  {const now=performance.now();c.textAlign='center';c.font='700 13px Saira Condensed, sans-serif';for(let i=FLOATS.length-1;i>=0;i--){const f=FLOATS[i],k=(now-f.t0)/1100;if(k>=1){FLOATS.splice(i,1);continue;}const p=toScreen(f.x,groundH(f.x,f.y)+26+k*26,f.y);if(p.z>1)continue;c.globalAlpha=1-k*k;c.fillStyle='rgba(0,0,0,.6)';c.fillText(f.s,p.x+1,p.y+1);c.fillStyle=f.c;c.fillText(f.s,p.x,p.y);}c.globalAlpha=1;}
  for(const o of G.oil){const p=toScreen(o.x,groundH(o.x,o.y)+48,o.y);if(p.z>1)continue;let cp=0,t=-1;o.cp.forEach((q,k)=>{if(q>cp){cp=q;t=k;}});
    if(o.res0&&!o.dead&&inView(o.x,o.y,.05)){const r=Math.max(0,o.res/o.res0);c.textAlign='center';if(r<=0){c.font='700 12px Saira Condensed, sans-serif';c.fillStyle='rgba(0,0,0,.6)';c.fillRect(p.x-22,p.y+14,44,15);c.fillStyle='#b9b2a2';c.fillText('DRY',p.x,p.y+26);}else{c.fillStyle='rgba(0,0,0,.72)';c.fillRect(p.x-26,p.y+14,52,15);c.fillStyle=r<.2?'#ea5a40':r<.5?'#e3b341':'#c9a24a';c.fillRect(p.x-25,p.y+25,50*r,3);c.font='600 10px IBM Plex Mono, monospace';c.fillStyle='#e8e2cf';c.fillText('OIL '+Math.ceil(r*100)+'%',p.x,p.y+23);}}
    if(!o.dead&&o.hp<o.max){const f=Math.max(0,o.hp/o.max);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-25,p.y+8,50,5);c.fillStyle=f>.5?'#74d08f':f>.25?'#e3b341':'#ea5a40';c.fillRect(p.x-24,p.y+9,48*f,3);}
    if(cp<=0||t<0)continue;const need=o.dead?12:6;c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-25,p.y-1,50,6);c.fillStyle=G.teams[t].color;c.fillRect(p.x-24,p.y,48*Math.min(1,cp/need),4);c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#fff';c.fillText(o.dead?'REPAIRING':'CAPTURING',p.x,p.y-4);}
  for(const m of MARKERS){const p=toScreen(m.x,groundH(m.x,m.y),m.y);if(p.z>1)continue;c.font='700 13px IBM Plex Mono, monospace';c.textAlign='center';c.fillStyle='#ea5a40';if(m.t>0)c.fillText(m.t.toFixed(1),p.x,p.y+4);}
  {const posts=new Map();for(const u of G.sel)if(u.defend&&u.team===ME&&!u.dead){const k=(u.defend.x|0)+','+(u.defend.y|0);if(!posts.has(k))posts.set(k,u.defend);}for(const D of posts.values()){c.strokeStyle='rgba(111,178,255,.75)';c.lineWidth=1.5;c.setLineDash([6,5]);c.beginPath();for(let i=0;i<=40;i++){const a=i/40*6.2832,p=toScreen(D.x+Math.cos(a)*D.r,groundH(D.x+Math.cos(a)*D.r,D.y+Math.sin(a)*D.r)+2,D.y+Math.sin(a)*D.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);const p=toScreen(D.x,groundH(D.x,D.y)+3,D.y);c.fillStyle='#6fb2ff';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('🛡 DEFEND',p.x,p.y);c.textAlign='left';}}
  {const seen=new Set();for(const u of G.sel){if(u.team!==ME||u.dead||u.isB||!u.wq||!u.wq.length||!u.order)continue;let a=toScreen(u.order.x,groundH(u.order.x,u.order.y)+2,u.order.y);c.strokeStyle='rgba(227,179,65,.7)';c.lineWidth=1.2;c.setLineDash([4,4]);c.beginPath();c.moveTo(a.x,a.y);for(const q of u.wq){const b=toScreen(q.x,groundH(q.x,q.y)+2,q.y);c.lineTo(b.x,b.y);}c.stroke();c.setLineDash([]);for(const q of u.wq){const k=(q.x|0)+','+(q.y|0);if(seen.has(k))continue;seen.add(k);const b=toScreen(q.x,groundH(q.x,q.y)+2,q.y);c.fillStyle='#e3b341';c.beginPath();c.arc(b.x,b.y,3.5,0,7);c.fill();}}}
  if(typeof RDRAG!=='undefined'&&RDRAG&&RDRAG.moved){const w1=screenToWorld(mouse.x,mouse.y);if(w1){const n=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).length,a=toScreen(RDRAG.w0.x,groundH(RDRAG.w0.x,RDRAG.w0.y)+2,RDRAG.w0.y),b=toScreen(w1.x,groundH(w1.x,w1.y)+2,w1.y);
    c.strokeStyle=RDRAG.am?'rgba(234,90,64,.9)':'rgba(116,208,143,.9)';c.lineWidth=2;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.fillStyle=c.strokeStyle;
    for(let i=0;i<Math.min(n,40);i++){const t=n>1?i/(n-1):.5,x=RDRAG.w0.x+(w1.x-RDRAG.w0.x)*t,y=RDRAG.w0.y+(w1.y-RDRAG.w0.y)*t,p=toScreen(x,groundH(x,y)+2,y);c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill();}}}
  if(drag&&drag.box){c.strokeStyle='#8af0a6';c.lineWidth=1;c.fillStyle='rgba(116,208,143,.1)';const x=Math.min(drag.x0,mouse.x),y=Math.min(drag.y0,mouse.y);c.fillRect(x,y,Math.abs(mouse.x-drag.x0),Math.abs(mouse.y-drag.y0));c.strokeRect(x+.5,y+.5,Math.abs(mouse.x-drag.x0),Math.abs(mouse.y-drag.y0));}
  if(G.aim){const w=screenToWorld(mouse.x,mouse.y);if(w){const r=G.aim==='sup'?G.teams[ME].sup.r+G.teams[ME].sup.spread:(powInfo(G.aim,G.teams[ME].fac).r||60);c.strokeStyle='#ea5a40';c.lineWidth=1.5;c.setLineDash([6,4]);c.beginPath();
    for(let i=0;i<=40;i++){const a=i/40*6.28,p=toScreen(w.x+Math.cos(a)*r,groundH(w.x,w.y),w.y+Math.sin(a)*r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);}}
  if(flash>0){c.fillStyle=`rgba(255,236,210,${flash*.45})`;c.fillRect(0,0,VW,VH);}}
// Tactical minimap: desaturated terrain with contour-style mountains, grid squares (A-H / 1-6), fog of war,
// unit symbols by type (dot infantry, square armour, triangle aircraft, hull ships), contact flashes where your units
// are taking fire, strike warning rings, squad tags, a radar sweep and a bracketed camera box.
const MMG={cols:8,rows:6};
function mmBase(){const W=mm.width,H=mm.height,sx=W/MAPW,sy=H/MAPH;const c=document.createElement('canvas');c.width=W;c.height=H;const q=c.getContext('2d');
  q.drawImage(G.thumb,0,0,W,H);q.globalCompositeOperation='saturation';q.fillStyle='hsla(0,0%,50%,.62)';q.fillRect(0,0,W,H);q.globalCompositeOperation='multiply';q.fillStyle='#7f9a8e';q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over';
  const id=q.getImageData(0,0,W,H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const wx=(i+.5)/sx,wy=(j+.5)/sy,k=(j*W+i)*4;const e=G.map.edge?G.map.edge(wx,wy):-99;
    if(e>0){const d=Math.min(1,e/120);id.data[k]=18+10*(1-d);id.data[k+1]=52+16*(1-d);id.data[k+2]=66+18*(1-d);continue;}
    if(e>-10){id.data[k]=150;id.data[k+1]=170;id.data[k+2]=150;continue;}
    const mt=G.map.mtn?G.map.mtn(wx,wy):0;if(mt>0){const band=Math.floor(mt/22)%2,hat=((i+j)%4===0);const v=band?.78:.62;id.data[k]*=v;id.data[k+1]*=v;id.data[k+2]*=v;if(hat){id.data[k]=id.data[k+1]=id.data[k+2]=40;}}}
  q.putImageData(id,0,0);
  q.fillStyle='rgba(205,190,150,.85)';for(const b of G.map.bridges){q.save();q.translate(b.x*sx,b.y*sy);q.rotate(Math.atan2(b.n[1]*sy,b.n[0]*sx));q.fillRect(-b.h*sx,-2,b.h*2*sx,4);q.restore();}
  q.strokeStyle='rgba(180,230,200,.16)';q.lineWidth=1;q.beginPath();for(let i=1;i<MMG.cols;i++){const x=Math.round(i*W/MMG.cols)+.5;q.moveTo(x,0);q.lineTo(x,H);}for(let j=1;j<MMG.rows;j++){const y=Math.round(j*H/MMG.rows)+.5;q.moveTo(0,y);q.lineTo(W,y);}q.stroke();
  q.font='600 9px IBM Plex Mono, monospace';q.fillStyle='rgba(190,235,205,.55)';q.textBaseline='top';for(let i=0;i<MMG.cols;i++)q.fillText('ABCDEFGH'[i],i*W/MMG.cols+3,2);for(let j=1;j<MMG.rows;j++)q.fillText(String(j+1),2,j*H/MMG.rows+2);
  return c;}
function mmGrid(x,y){return 'ABCDEFGH'[Math.max(0,Math.min(7,Math.floor(x/MAPW*MMG.cols)))]+(Math.max(0,Math.min(5,Math.floor(y/MAPH*MMG.rows)))+1);}
const MMC=[];let mmFogT=0;
function drawMini(){const W=mm.width,H=mm.height,sx=W/MAPW,sy=H/MAPH,now=performance.now()/1000,c=mx;
  if(!G.mmBase)G.mmBase=mmBase();c.drawImage(G.mmBase,0,0);
  // fog of war: hidden ground darker
  if(FOGC){if(!G.mmFog||now-mmFogT>.15){mmFogT=now;const f=G.mmFog||(G.mmFog=document.createElement('canvas'));f.width=W;f.height=H;const q=f.getContext('2d');q.drawImage(FOGC,0,0,W,H);q.globalCompositeOperation='difference';q.fillStyle='#fff';q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over';}
    c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.6;c.drawImage(G.mmFog,0,0);c.restore();}
  // resources
  c.fillStyle='rgba(227,179,65,.8)';for(const f of G.fields)if(f.amt>0)c.fillRect(f.x*sx-1.5,f.y*sy-1.5,3,3);
  for(const o of G.oil){const x=o.x*sx,y=o.y*sy;c.fillStyle='#0b0f0d';c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.closePath();c.fill();c.fillStyle=o.dead?'#5a2a20':(o.res0&&o.res<=0)?'#555852':o.owner>=0?G.teams[o.owner].color:'#9a9a90';c.beginPath();c.moveTo(x,y-3.2);c.lineTo(x+3.2,y);c.lineTo(x,y+3.2);c.lineTo(x-3.2,y);c.closePath();c.fill();}
  // strike warnings
  for(const st of (G.strikes||[])){const x=st.x*sx,y=st.y*sy,r=Math.max(4,st.r*sx);c.strokeStyle=ally(st.team,ME)?'rgba(116,208,143,.9)':'rgba(234,90,64,.95)';c.lineWidth=1.5;c.setLineDash([3,2]);c.beginPath();c.arc(x,y,r,0,7);c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(x-r-3,y);c.lineTo(x+r+3,y);c.moveTo(x,y-r-3);c.lineTo(x,y+r+3);c.stroke();}
  // units and buildings
  const sel=new Set(G.sel);
  for(const e of G.ents){if(e.dead||!vis(e))continue;const x=e.x*sx,y=e.y*sy,col=G.teams[e.team].color,own=e.team===ME;
    if(e.isB){const s=e.kind==='hq'?9:e.kind==='turret'||e.kind==='sam'||e.kind==='tunnel'?5:7;c.fillStyle='#050807';c.fillRect(x-s/2-1.5,y-s/2-1.5,s+3,s+3);c.fillStyle=col;c.fillRect(x-s/2,y-s/2,s,s);if(e.kind==='hq'){c.fillStyle='#050807';c.fillRect(x-1.5,y-1.5,3,3);}if(e.built<1){c.fillStyle='rgba(0,0,0,.45)';c.fillRect(x-s/2,y-s/2,s,s*(1-e.built));}continue;}
    const d=e.s.dom;c.fillStyle=col;c.strokeStyle=own?'rgba(255,255,255,.75)':'#050807';c.lineWidth=1;
    if(d==='air'){const a=e.ang||0;c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(4.5,0);c.lineTo(-3,3);c.lineTo(-1.5,0);c.lineTo(-3,-3);c.closePath();c.fill();c.stroke();c.restore();}
    else if(d==='naval'){const a=e.ang||0;c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(5,0);c.lineTo(1,2.6);c.lineTo(-4,2.2);c.lineTo(-4,-2.2);c.lineTo(1,-2.6);c.closePath();c.fill();c.stroke();c.restore();}
    else if(isInf(e.s)){c.beginPath();c.arc(x,y,1.9,0,7);c.fill();if(!own){c.stroke();}}
    else{c.fillRect(x-2.2,y-2.2,4.4,4.4);c.strokeRect(x-2.7,y-2.7,5.4,5.4);}
    if(sel.has(e)){c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(x,y,4.5,0,7);c.stroke();}
    if(own&&G.t-(e.lastHit||-99)<1.2&&Math.random()<.04)MMC.push({x:e.x,y:e.y,t:now});}
  // contact flashes where we're under fire
  for(let i=MMC.length-1;i>=0;i--){const m=MMC[i],a=now-m.t;if(a>1.4){MMC.splice(i,1);continue;}c.strokeStyle=`rgba(255,80,60,${1-a/1.4})`;c.lineWidth=1.5;c.beginPath();c.arc(m.x*sx,m.y*sy,3+a*9,0,7);c.stroke();}
  if(MMC.length>40)MMC.splice(0,MMC.length-40);
  if((performance.now()/250|0)%2){c.fillStyle='#ea5a40';for(const m of MARKERS){c.beginPath();c.arc(m.x*sx,m.y*sy,5,0,7);c.fill();}}
  // squad tags
  if(G.sq)for(let i=1;i<=5;i++){const L=(G.sq[i]||[]).map(id=>G.byId.get(id)).filter(u=>u&&!u.dead);if(!L.length)continue;const x=L.reduce((a,u)=>a+u.x,0)/L.length*sx,y=L.reduce((a,u)=>a+u.y,0)/L.length*sy;c.fillStyle='rgba(5,8,7,.8)';c.fillRect(x+5,y-12,10,10);c.fillStyle='#e3b341';c.font='700 9px IBM Plex Mono, monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(i,x+10,y-6.5);c.textAlign='left';c.textBaseline='alphabetic';}
  // radar sweep
  try{const a=(now*.9)%(Math.PI*2),g=c.createConicGradient(a,W/2,H/2);g.addColorStop(0,'rgba(120,255,170,.16)');g.addColorStop(.08,'rgba(120,255,170,0)');g.addColorStop(1,'rgba(120,255,170,0)');c.fillStyle=g;c.fillRect(0,0,W,H);}catch(_){}
  // camera box with corner brackets
  const pts=[[0,0],[VW,0],[VW,VH],[0,VH]].map(([x,y])=>screenToWorld(x,y));if(pts.every(Boolean)){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x*sx,p.y*sy):c.moveTo(p.x*sx,p.y*sy));c.closePath();c.stroke();
    c.strokeStyle='#e3b341';c.lineWidth=2;for(let i=0;i<4;i++){const p=pts[i],n=pts[(i+1)%4],m=pts[(i+3)%4];const P=[p.x*sx,p.y*sy];const v=(q)=>{const dx=q.x*sx-P[0],dy=q.y*sy-P[1],L=Math.hypot(dx,dy)||1;return[dx/L*6,dy/L*6];};const a1=v(n),a2=v(m);c.beginPath();c.moveTo(P[0]+a1[0],P[1]+a1[1]);c.lineTo(P[0],P[1]);c.lineTo(P[0]+a2[0],P[1]+a2[1]);c.stroke();}}
  // frame + readout
  c.strokeStyle='rgba(190,235,205,.5)';c.lineWidth=2;const k=10;for(const [x,y,dx,dy] of [[1,1,1,1],[W-1,1,-1,1],[1,H-1,1,-1],[W-1,H-1,-1,-1]]){c.beginPath();c.moveTo(x+dx*k,y);c.lineTo(x,y);c.lineTo(x,y+dy*k);c.stroke();}
  const cw=screenToWorld(VW/2,VH/2);const vis2=G.ents.filter(e=>!e.dead&&e.team!==ME&&!ally(e.team,ME)&&!e.isB&&vis(e)).length;c.font='600 9px IBM Plex Mono, monospace';const txt=(cw?'GRID '+mmGrid(cw.x,cw.y)+'  ':'')+'CONTACTS '+vis2;const tw=c.measureText(txt).width;c.fillStyle='rgba(5,8,7,.75)';c.fillRect(W-tw-10,H-15,tw+8,13);c.fillStyle='#bfe9cd';c.textBaseline='alphabetic';c.fillText(txt,W-tw-6,H-5);}
function renderFrame(dt){if(!G||!G.terrain||!R3||window.GLLOST)return;if(WRECKQ.length)wreckTick();if(G.civDirty&&performance.now()-(G.civRb||0)>400){G.civDirty=false;G.civRb=performance.now();try{buildCity();}catch(e){console.warn(e);}}try{droneAudio(dt);}catch(_){}if(window.SKY)SKY.material.uniforms.t.value=G.t;if(window.WINDU)WINDU.value=performance.now()/1000;syncScene(dt);fxUpdate(dt);placeCam();WATER.material.uniforms.t.value=G.t;WATER.material.uniforms.cpos.value.copy(CAM.position);
  fogT-=dt;if(fogT<=0){fogT=.12;updateFog();}renderPost();drawHUD();drawMini();}

/* ================= MULTIPLAYER: lobby + host-authoritative sync over the artifact room ================= */
const NET={room:null,user:null,game:null,code:null,opp:null,hostPeer:null,myPeer:null,snapT:0,bT:0,evT:0,teamT:0,helloI:null,names:{}};
const FLG={built:1,cargo:2,dis:4,chg:8,hack:16,plant:32,land:64,hid:128,mem:256,mov:2048,busy:4096,nd:8192,stall:16384,supp:32768,mark:65536,rout:131072,shak:262144,last:524288,aband:1048576};
// Multiplayer messages need at least Contributor access to this game: anyone the owner invited from the Share menu
// as Contributor or Editor can play; plain view-only visitors can watch the lobby but cannot join or host.
function cancelHost(){leaveNet();renderGames();}
function noPerm(){$('mpstatus').innerHTML='';const d=document.createElement('div');d.className='empty';d.textContent='Hosting needs edit access to this game. You can still join a game someone else hosts: pick it from the list and press Join. To host, ask the game\'s owner to give you Editor access from the Share menu.';$('mpstatus').append(d);}
async function netInit(){
  const st=$('mpstatus');
  try{if(typeof claude!=='undefined'&&claude.use)NET.room=await claude.use('room');}catch(e){}
  if(!NET.room){$('games').innerHTML='<div class="empty">Multiplayer works when this game is opened from its claude.ai link. Skirmish works everywhere.</div>';$('host').disabled=true;return;}
  try{NET.user=await claude.use('user');}catch(e){}
  NET.room.onPeers(()=>renderGames(),()=>{$('games').innerHTML='<div class="empty">Multiplayer is unavailable for this viewer.</div>';$('host').disabled=true;});
  renderGames();
  if($('jbtn')){$('jbtn').onclick=()=>{initAudio();joinByCode($('jcode').value);};$('jcode').onkeydown=e=>{if(e.key==='Enter'){initAudio();joinByCode($('jcode').value);}};}
  try{const h=(location.hash||'')+' '+(document.referrer||'');const c=codeFrom(h.includes('join=')?h:'');if(c){$('jcode').value=c.toUpperCase();setTimeout(()=>joinByCode(c,true),1500);}}catch(e){}
}
async function renderGames(){if(!NET.room)return;const el=$('games');const ps=NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.g&&p.presence.g.s==='open'&&FKEYS.includes(p.presence.g.f));
  if(!ps.length){el.innerHTML=`<div class="empty">${NET.code?'Your game is open. Waiting for players to join…':window.WW3_P2P?'To join a friend, type their game code below. To play together, one of you hosts and shares the code.':'No open games right now. Host one and share this game with a friend.'}</div>`;return;}
  let names={};try{if(NET.user){const ids=ps.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  el.innerHTML='';for(const p of ps){const g=p.presence.g,row=document.createElement('div');row.className='game';const nm=(p.by&&names[p.by]&&names[p.by].name)||(p.isMe?'You (other tab)':'A player');
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=FACTIONS[g.f].name;const s=document.createElement('span');s.textContent=` · hosted by ${nm} · ${(MAPS[g.m]||MAPS.strait).name} · ${g.n||1}/${g.mx||8} players`;info.append(b,s);
    const btn=document.createElement('button');btn.textContent='Join';btn.disabled=!!NET.code||g.s==='full';btn.onclick=()=>{initAudio();joinGame(p);};row.append(info,btn);el.append(row);}}
const GAME_URL=window.WW3_P2P?(()=>{try{const r=document.referrer||'';if(/itch\.io/.test(r))return r.split('#')[0];}catch(e){}return location.href.split('#')[0];})():'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi';
function inviteText(){if(window.WW3_P2P&&location.protocol==='file:')return `Join my World War 3 battle! Open the World War 3 game file (ww3.html, from Discord) in Chrome or Edge, go to Multiplayer and enter game code ${NET.code.toUpperCase()} in "Join by code".`;return window.WW3_P2P?`Join my World War 3 battle! Open ${GAME_URL} , go to Multiplayer and enter game code ${NET.code.toUpperCase()} in "Join by code".`:`Join my World War 3 battle: ${GAME_URL}#join=${NET.code} (game code ${NET.code.toUpperCase()}). Open the link signed in to claude.ai, go to Multiplayer and press Join, or type the code into "Join by code".`;}
function copyText(t,btn){const done=()=>{if(btn){const o=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>btn.textContent=o,1600);}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fallback());return;}}catch(e){}fallback();
  function fallback(){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(ok)done();else if(btn)btn.textContent='Select the text and copy it';}}
// join a hosted game from its code (typed, pasted invite text, or the #join= part of an invite link)
function codeFrom(s){const m=String(s||'').toLowerCase().match(/join=([a-z0-9]{4,8})/)||String(s||'').toLowerCase().match(/\b([a-z0-9]{6})\b/);return m?m[1]:null;}
function joinByCode(raw,quiet){if(!NET.room||NET.game)return;const code=codeFrom(raw);if(!code){if(!quiet)$('mpstatus').textContent='That is not a game code. Paste the invite or type the 6-character code.';return;}
  if(window.WW3_P2P){joinGame({peer:'ww3-'+code,presence:{g:{c:code,s:'open'}}});return;}
  let tries=0;const look=()=>{const p=NET.room.peers().find(q=>!q.sameTab&&q.presence&&q.presence.g&&q.presence.g.c===code);if(p){if(p.presence.g.s==='full'){$('mpstatus').textContent='That game is full or has already started.';return;}joinGame(p);return;}
    if(++tries<14){$('mpstatus').textContent='Looking for game '+code.toUpperCase()+'…';setTimeout(look,700);return;}
    $('mpstatus').textContent='Game '+code.toUpperCase()+' was not found. Check that the host still has the lobby open and has invited you from the game\'s Share menu, and that you are signed in to claude.ai.';};look();}
// Host-side handlers for a game room (also used when a standby player takes over as host)
function wireHost(g){
  NET.cseq=NET.cseq||{};const hostHello=(peer,by,f,tok)=>{if(MODE==='host'){hostRejoin(peer,tok);return;}if(MODE!=='single')return;const cf=FKEYS.includes(f)?f:'US';const m={peer,by};const p=NET.lobby.find(q=>q.peer===m.peer);if(p){p.f=cf;if(tok)p.tok=tok;}else{if(NET.lobby.length>=(MAPS[setup.map]||MAPS.strait).max-1){NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer,full:1}).catch(()=>{});return;}NET.lobby.push({peer:m.peer,by:m.by,f:cf,tok:tok||null});}
    NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer}).catch(()=>{});renderLobby();};
  g.on('hello',m=>{if(m.sameTab)return;hostHello(m.peer,m.by,m.data&&m.data.f);});
  const hostCmd=(peer,data)=>{if(MODE!=='host')return;const ix=NET.peers?NET.peers.indexOf(peer):-1;if(ix<1)return;if(G&&G.teams[ix]&&G.teams[ix].out)return;const a=cleanCmd(data);if(a)act(ix,a);};
  g.on('cmd',m=>hostCmd(m.peer,m.data));
  g.onPeers(ch=>{for(const q of ch.joined.concat(ch.updated)){if(q.sameTab||!q.presence)continue;const pr=q.presence;(NET.seen=NET.seen||{})[q.peer]=performance.now();
      if(pr.hi&&pr.hi.ed!=null)(NET.edOf=NET.edOf||{})[q.peer]=pr.hi.ed?1:0;
      // a player the heartbeat marked as gone (e.g. their PC stalled while loading) is linked back as soon as they are heard from again
      if(MODE==='host'&&NET.peers&&pr.hi&&typeof pr.hi.tok==='string'&&NET.peers.indexOf(q.peer)<0)hostRejoin(q.peer,pr.hi.tok.slice(0,16));
      if(pr.hi&&(MODE==='single'||MODE==='host')&&(NET.lastHi||{})[q.peer]!==pr.hi.n){(NET.lastHi=NET.lastHi||{})[q.peer]=pr.hi.n;hostHello(q.peer,q.by,pr.hi.f,typeof pr.hi.tok==='string'?pr.hi.tok.slice(0,16):null);}
      if(typeof pr.pg==='number'&&(NET.lastPg||{})[q.peer]!==pr.pg){(NET.lastPg=NET.lastPg||{})[q.peer]=pr.pg;NET.game.emit('pong',{to:q.peer,t:pr.pg}).catch(()=>{});if(typeof pr.pi==='number')(NET.pings=NET.pings||{})[q.peer]=pr.pi;}
      if(Array.isArray(pr.cq)&&MODE==='host'){let last=NET.cseq[q.peer]||0;for(const c of pr.cq){if(!c||typeof c.s!=='number'||c.s<=last)continue;last=c.s;hostCmd(q.peer,c.a);}NET.cseq[q.peer]=last;const ix=NET.peers?NET.peers.indexOf(q.peer):-1;if(ix>0)(NET.cseqSlot=NET.cseqSlot||[])[ix]=Math.max((NET.cseqSlot||[])[ix]|0,last);}
      if(typeof pr.kr==='number'&&MODE==='host'&&NET.peers&&(NET.lastKr||{})[q.peer]!==pr.kr){(NET.lastKr=NET.lastKr||{})[q.peer]=pr.kr;const ix=NET.peers.indexOf(q.peer);if(ix>0&&NET.kf)NET.kf[ix]=0;}}});
  g.onPeers(ch=>{for(const q of ch.left){if(MODE==='single'){NET.lobby=NET.lobby.filter(p=>p.peer!==q.peer);renderLobby();}else if(MODE==='host'&&NET.peers){const ix=NET.peers.indexOf(q.peer);if(ix>0)playerLeft(ix);}}});
}
async function hostGame(){if(!NET.room||NET.code)return;const code=Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a');NET.code=code;NET.baseCode=code;NET.gen=0;NET.lobby=[];$('host').hidden=true;$('cancelHost').hidden=false;
  $('mpstatus').textContent='Opening your game…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'Could not reach the online matchmaking service. Check your internet connection and try again.':'Could not open a game room. Try again in a moment.';cancelHost();return;}
  wireHost(NET.game);
  try{await NET.game.emit('lobby',{n:1,probe:1});}catch(e){if(e&&e.code==='not_permitted'){noPerm();cancelHost();return;}}
  await NET.room.presence({g:{c:code,f:setup.p,s:'open',n:1}}).catch(()=>{});renderLobby();renderGames();}
const TEAM_COL=['#7fb8e6','#ea5a40','#74d08f','#e3b341','#c58af0','#f08ab4','#6fe0d0','#c9c9c9'];
// Host lobby: game code and player count at the top, the Start button right under it, one row per seat (taken or
// open) with each player's nation and team, quick team presets, and the invite steps at the bottom.
async function renderLobby(){if(!NET.code||NET.code==='join'||MODE!=='single')return;const mx=(MAPS[setup.map]||MAPS.strait).max,mapN=(MAPS[setup.map]||MAPS.strait).name;
  if(NET.lobby.length+1>mx){const drop=NET.lobby.splice(mx-1);for(const p of drop)NET.game.emit('lobby',{n:0,to:p.peer,full:1}).catch(()=>{});}
  let names={};try{if(NET.user){const ids=NET.lobby.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  const nn=NET.lobby.length+1;NET.tm=(NET.tm||[]).slice(0,nn);while(NET.tm.length<nn)NET.tm.push(NET.tm.length%Math.max(2,nn));const teamsOk=new Set(NET.tm).size>1;
  const E=(t,c,txt)=>{const d=document.createElement(t);if(c)d.className=c;if(txt!=null)d.textContent=txt;return d;};
  const el=$('mpstatus');el.innerHTML='';const L=E('div','lob');
  // header
  const hd=E('div','lobhd');const l=E('div');l.append(E('div','lobk','Your game · code'),E('div','lobcode',NET.code.toUpperCase()));
  const r=E('div','lobr');r.append(E('div','lobmap',mapN),E('div','lobn',`${nn} / ${mx} players`));const pips=E('div','pips');for(let i=0;i<mx;i++){const d=E('i');if(i<nn)d.className='on';pips.append(d);}r.append(pips);hd.append(l,r);L.append(hd);
  // start
  const sb=E('button','big startbtn',nn>=2?`▶ Start ${nn}-player battle`:'▶ Start battle');sb.disabled=nn<2||!teamsOk;sb.onclick=()=>launchMP();L.append(sb);
  L.append(E('div','lobwhy',nn<2?'Waiting for at least one more player to join.':!teamsOk?'Everyone is on one team: put someone on another team to start.':'Everyone ready? Press Start. Players can still join until you do.'));
  // seats
  const sh=E('div','lobsec');sh.append(E('span','','Players'));const pre=E('span','presets');
  const pb=(lab,fn)=>{const b=E('button','chip',lab);b.onclick=()=>{NET.tm=NET.tm.map((_,i)=>fn(i));renderLobby();};pre.append(b);};
  if(nn>=2){pb('Free for all',i=>i);pb('2 teams',i=>i%2);if(nn>=4)pb('You + allies vs rest',i=>i<Math.ceil(nn/2)?0:1);}sh.append(pre);L.append(sh);
  const seats=E('div','seats');
  const seat=(i,nm,f,host)=>{const row=E('div','seat');row.style.setProperty('--tc',TEAM_COL[NET.tm[i]%8]);row.append(E('span','sn',String(i+1)));const who=E('div','who');who.append(E('b','',nm));if(host)who.append(E('span','tag','host'));row.append(who);
    const fc=E('span','sfac');fc.append(E('span','fcode',f),E('span','fname',FACTIONS[f].name));row.append(fc);
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm);for(let t=0;t<Math.max(2,nn);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=NET.tm[i];s.onchange=()=>{NET.tm[i]=+s.value;renderLobby();};row.append(s);seats.append(row);};
  seat(0,'You',setup.p,true);NET.lobby.forEach((p,k)=>seat(k+1,(p.by&&names[p.by]&&names[p.by].name)||'Player '+(k+2),p.f,false));
  for(let i=nn;i<mx;i++){const row=E('div','seat open');row.append(E('span','sn',String(i+1)),E('div','who','Open seat · waiting for a player'));seats.append(row);}
  L.append(seats);
  // invite
  L.append(E('div','lobsec','Invite players'));const st=E('ol','steps');
  if(window.WW3_P2P){st.append(E('li','','Copy the invite below and send it to your friends (text, Discord, email…).'));st.append(E('li','','They open the game, go to Multiplayer and type your code into “Join by code”. No account needed.'));}
  else{  st.append(E('li','','Open this game’s Share menu (top of the page) and add each friend by email. They need a claude.ai account and must be signed in.'));
  st.append(E('li','','Send them the invite below. They open the link, go to Multiplayer and press Join, or type the code into “Join by code”.'));}
  st.append(E('li','','When everyone shows up in the seats above, press Start.'));L.append(st);
  const iv=E('div','invite');const inp=document.createElement('input');inp.readOnly=true;inp.value=inviteText();inp.setAttribute('aria-label','Invite to share');inp.onfocus=()=>inp.select();const cb=E('button','big','Copy invite');cb.onclick=()=>copyText(inviteText(),cb);iv.append(inp,cb);L.append(iv);
  el.append(L);
  NET.room.presence({g:{c:NET.code,f:setup.p,s:nn>=mx?'full':'open',n:nn,m:setup.map||'strait',mx}}).catch(()=>{});}
function launchMP(){if(MODE!=='single'||!NET.lobby.length)return;const seed=(Math.random()*1e9)|0;const facs=[setup.p,...NET.lobby.map(p=>p.f)];NET.peers=[null,...NET.lobby.map(p=>p.peer)];NET.toks=[null,...NET.lobby.map(p=>p.tok||null)];NET.opp=NET.peers[1];
  const map=setup.map||'strait';const tm=(NET.tm||[]).slice(0,facs.length);while(tm.length<facs.length)tm.push(tm.length);NET.lobby.forEach((p,i)=>NET.game.emit('start',{pv:NET_PV,seed,facs,slot:i+1,to:p.peer,map,tm}).catch(()=>{}));NET.room.presence({g:{c:NET.code,f:setup.p,s:'full',n:facs.length}}).catch(()=>{});NET.startInfo={seed,facs,map,tm};startMP('host',seed,facs,0,map,tm);}
// A dropped player gets 30 s to reconnect (same team, same units) before the AI takes over their side.
function hostRejoin(peer,tok){if(!tok||!NET.toks||!G)return;const ix=NET.toks.indexOf(tok);if(ix<1)return;const old=NET.peers[ix];if(old===peer)return;NET.peers[ix]=peer;NET.cseq[peer]=Math.max(NET.cseq[peer]||0,NET.cseq[old]||0,(NET.cseqSlot||[])[ix]|0);
  const T=G.teams[ix];T.discT=0;if(T.aiTook){T.ai=null;T.aiTook=0;}if(NET.kf)NET.kf[ix]=0;if(NET.kf)NET.kf.all=0;const S=NET.startInfo;if(S)NET.game.emit('start',{pv:NET_PV,seed:S.seed,facs:S.facs,slot:ix,to:peer,map:S.map,tm:S.tm}).catch(()=>{});
  for(const O of G.teams)log(O.id,`${T.F.name}'s commander reconnected.`,'g');}
function discTick(){if(!NET.peers||!G)return;const now=performance.now();for(let k=0;k<NET.peers.length;k++){const p=NET.peers[k];if(k===ME||!p)continue;const ls=(NET.seen||{})[p];if(ls&&now-ls>8000&&!G.teams[k].discT&&!G.teams[k].ai){NET.peers[k]=null;playerLeft(k);}}for(let k=1;k<NET.peers.length;k++){const T=G.teams[k];if(T&&T.discT&&G.t-T.discT>30&&!T.out){T.discT=0;T.ai=mkAI(1);T.aiTook=1;for(const O of G.teams)log(O.id,`${T.F.name}'s commander did not come back. The AI has taken over (they can still rejoin).`,'w');}}}
function playerLeft(ix){if(!G||G.over)return;const T=G.teams[ix];if(!T||T.out||T.ai)return;T.discT=G.t;for(const O of G.teams)log(O.id,`${T.F.name}'s commander lost connection. Waiting up to 30 s for them to reconnect…`,'w');return;
  if(NET.peers.slice(1).every((p,k)=>!p||G.teams[k+1].ai))pushLog('All other players have left. The AI controls their forces.','w');}
// Joining: each player has a reconnect token for this game (kept for the browser tab), so if the link drops - or the
// page is reloaded - they rejoin as the same commander. Client handlers are wired by wireClient() so a reconnect can
// rebuild them on the new connection.
function joinTok(code){const k='ww3_tok_'+code;let t=null;try{t=sessionStorage.getItem(k);}catch(e){}if(!t){t=Math.random().toString(36).slice(2,12);try{sessionStorage.setItem(k,t);}catch(e){}}return t;}
function wireClient(g){
  g.on('hello',m=>{if(m.sameTab)NET.myPeer=m.peer;});
  g.on('lobby',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer&&MODE==='single'){if(m.data.full){clearInterval(NET.helloI);$('mpstatus').textContent='That game is full.';leaveNet();return;}$('mpstatus').textContent=`Joined. ${m.data.n} players in the lobby. Waiting for the host to start the battle…`;}});
  g.on('start',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer||MODE!=='single')return;clearInterval(NET.helloI);const d=m.data;if((d.pv|0)!==NET_PV){$('mpstatus').textContent='You and the host have different versions of the game. Both of you: close the game and open it again to update, then rejoin.';leaveNet();return;}if(!Array.isArray(d.facs)||d.facs.length<2||d.facs.length>8||!d.facs.every(f=>FKEYS.includes(f)))return;const sl=d.slot|0;if(sl<1||sl>=d.facs.length)return;const map=MAPS[d.map]?d.map:'strait';const tm=Array.isArray(d.tm)&&d.tm.length===d.facs.length?d.tm.map(v=>Math.max(0,Math.min(7,v|0))):null;startMP('client',d.seed|0,d.facs,sl,map,tm);});
  const ok=m=>m.peer===NET.hostPeer&&MODE==='client'&&(!m.data.to||m.data.to===NET.myPeer);
  g.on('snap',m=>{if(ok(m)){NET.lastRx=performance.now();applySnap(m.data);}});
  g.on('evt',m=>{if(ok(m)){NET.lastRx=performance.now();applyEvents(m.data);}});
  g.on('team',m=>{if(ok(m)){NET.lastRx=performance.now();applyTeam(m.data);}});
  g.on('ck',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer)ckReceive(m.data);});
  g.on('pong',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer)return;const rtt=Date.now()-(+m.data.t||0);if(rtt>=0&&rtt<20000)NET.ping=NET.ping?NET.ping*.7+rtt*.3:rtt;});
  g.onPeers(ch=>{if(!NET.myPeer){const me=ch.peers.find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}if(NET.findHost){const h=ch.peers.find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}if(ch.left.some(q=>q.peer===NET.hostPeer)){if(MODE==='client')clientReconnect();else if(MODE==='single'&&NET.code==='join'){clearInterval(NET.helloI);$('mpstatus').textContent='The host closed the game.';leaveNet();}}});}
async function clientReconnect(){if(NET.recon||!NET.jcode)return;NET.recon=true;pushLog('Connection to the host lost. Reconnecting…','w');const code=NET.jcode;
  for(let tries=0;tries<12&&MODE==='client'&&!(G&&G.over);tries++){await new Promise(r=>setTimeout(r,tries?1500:1000));
    if(tries>=1&&NET.isStandby&&NET.lastCk){if(await promoteToHost()){NET.recon=false;return;}}
    const gen=(NET.gen||0)+(tries%2===1?1:0),room=migRoom(gen);
    try{if(NET.game)NET.game.leave().catch(()=>{});}catch(e){}NET.game=null;
    let g=null;try{g=await NET.room.join('tc-'+room,NET.via?{via:NET.via}:undefined);}catch(e){continue;}NET.game=g;NET.myPeer=null;
    if(window.WW3_P2P)NET.hostPeer='ww3-'+room;else if(gen>0){NET.hostPeer=null;NET.findHost=true;}wireClient(g);
    if(NET.findHost){const h=g.peers().find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}
    NET.lastSnapT=0;NET.prevT=0;NET.rxW=0;NET.ia=0;const t0=performance.now();for(let k=0;k<8&&NET.lastRx<t0;k++){if(!NET.myPeer){const me=g.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}g.presence({hi:{f:setup.p,n:Date.now()%1e6,tok:NET.tok,ed:NET.canEmit===false?0:1},cq:NET.cq||[]}).catch(()=>{});await new Promise(r=>setTimeout(r,900));}
    if(NET.lastRx>=t0){for(const e of G.ents)e.seenAt=Math.min(e.seenAt,NET.lastSnapT||0);NET.recon=false;NET.gen=Math.max(NET.gen||0,gen);pushLog(gen>(NET.gen0||0)?'Connected to the new host.':'Reconnected to the host.','g');return;}}
  NET.recon=false;if(MODE==='client')oppLeft();}
async function joinGame(p){if(NET.game)return;const code=p.presence.g.c;$('mpstatus').textContent='Joining…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'No open game with code '+code.toUpperCase()+' was found. Check the code and make sure the host still has the lobby open.':'Could not join that game.';NET.game=null;return;}
  NET.hostPeer=p.peer;NET.code='join';NET.jcode=code;NET.baseCode=code;NET.gen=0;NET.via=NET.game.via||null;NET.tok=joinTok(code);NET.lastRx=0;wireClient(NET.game);NET.cq=[];NET.cs=Math.floor(Date.now()/10);
  clearInterval(NET.pingI);NET.pingI=setInterval(()=>{if(!NET.game&&!NET.recon){clearInterval(NET.pingI);return;}if(MODE==='client'&&!NET.recon&&NET.lastRx&&performance.now()-NET.lastRx>5000){clientReconnect();return;}if(NET.game)NET.game.presence({pg:Date.now(),pi:NET.ping?Math.round(NET.ping):null}).catch(()=>{});},1000);
  let n=0;const hello=()=>{if(MODE!=='single'){clearInterval(NET.helloI);return;}if(n++>12&&!/Joined/.test($('mpstatus').textContent)){clearInterval(NET.helloI);$('mpstatus').textContent='The host did not answer. The game may have already started.';leaveNet();return;}if(n>14&&n%3)return;if(!NET.myPeer){const me=NET.game.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}NET.game.presence({hi:{f:setup.p,n:n,tok:NET.tok,ed:NET.canEmit===false?0:1}}).catch(()=>{});if(NET.canEmit!==false)NET.game.emit('hello',{f:setup.p}).catch(e=>{if(e&&e.code==='not_permitted')NET.canEmit=false;});};
  hello();NET.helloI=setInterval(hello,1500);$('mpstatus').textContent='Connecting to the host…';}
function leaveNet(){clearInterval(NET.helloI);clearInterval(NET.pingI);NET.ping=0;NET.pings={};if(NET.game)NET.game.leave().catch(()=>{});NET.game=null;NET.code=null;NET.opp=null;NET.hostPeer=null;NET.lobby=[];NET.peers=null;if(NET.room)NET.room.presence({g:null}).catch(()=>{});$('host').hidden=false;$('cancelHost').hidden=true;}
function oppLeft(){if(!G||G.over)return;pushLog('The host left the game.','w');showEnd(-1,'The host left the game, so the battle has ended.');}
const CMD_T=['go','atk','atkOil','fld','q','dq','bld','bldGo','tun','unl','board','up','sup','buy','pow','rally','stop','gar','atkCiv','ungar','give','def','line','ret'];
function cleanCmd(a){if(!a||typeof a!=='object'||!CMD_T.includes(a.t))return null;const o={t:a.t};const num=v=>typeof v==='number'&&isFinite(v)?v:0;
  if(Array.isArray(a.ids))o.ids=a.ids.slice(0,300).map(v=>num(v)|0);o.x=Math.max(0,Math.min(MAPW,num(a.x)));o.y=Math.max(0,Math.min(MAPH,num(a.y)));o.tid=num(a.tid)|0;o.fi=num(a.fi)|0;o.dz=num(a.dz)|0;o.ci=Math.max(0,num(a.ci)|0);o.to=Math.max(0,num(a.to)|0);o.amt=Math.max(0,Math.min(1e6,num(a.amt)));
  if(typeof a.k==='string'&&a.k.length<20)o.k=a.k;o.mode=a.mode==='amove'?'amove':'move';o.fm=a.fm?1:0;o.q=a.q?1:0;o.x2=Math.max(0,Math.min(MAPW,num(a.x2)));o.y2=Math.max(0,Math.min(MAPH,num(a.y2)));return o;}
const NET_PV=2;
// a keep-alive list named units this client doesn't have (a missed update): ask the host for a full copy (at most every 2 s)
function askKeyframe(){const w=performance.now();if(NET.krW&&w-NET.krW<2000)return;NET.krW=w;if(NET.game)NET.game.presence({kr:Math.round(w)}).catch(()=>{});}
function doAct(a){if(MODE==='client'){if(!NET.game)return;
    // orders travel in this player's presence (any invited player may set it): a rolling, numbered queue the host
    // reads and de-duplicates, trimmed to the presence size limit
    NET.cq=NET.cq||[];NET.cs=(NET.cs||0)+1;NET.cq.push({s:NET.cs,a});while(NET.cq.length>14||(NET.cq.length>1&&JSON.stringify(NET.cq).length>3300))NET.cq.shift();
    NET.game.presence({cq:NET.cq}).catch(()=>{});}else act(ME,a);}

/* ---------- host: send ---------- */
function encEnt(e,mem){let f=0,x=0;if(e.isB){if(e.built<1){f|=FLG.built;x=Math.round(e.built*100);}if(e.dis>G.t)f|=FLG.dis;if(e.charge)f|=FLG.chg;if(e.kind==='uplink'){x=Math.round(G.teams[e.team].charge/G.teams[e.team].sup.charge*100);}if(e.kind==='garrison'&&e.civ){x=e.civ.occ.length*16+e.civ.cap;}if(e.kind==='factory'&&G.teams[e.team].q.factory.length)f|=FLG.busy;if(mem)f|=FLG.mem;if(e.nd&&e.built<1)f|=FLG.nd;if(e.stall&&e.built<1)f|=FLG.stall;}
  else{if(e.cargo)f|=FLG.cargo;if(e.hacking)f|=FLG.hack;if(e.planting)f|=FLG.plant;if(e.landed)f|=FLG.land;if(e.hid)f|=FLG.hid;if(G.t-(e.mv||-9)<.25)f|=FLG.mov;if(e.building)f|=FLG.busy;if((e.supp||0)>.5)f|=FLG.supp;if(e.rout>G.t)f|=FLG.rout;else if(e.s&&canRout(e)&&(e.fear||0)>courageOf(e)*.65)f|=FLG.shak;if(e.mark>G.t)f|=FLG.mark;if(e.last>G.t)f|=FLG.last;if(e.aband)f|=FLG.aband;f|=(e.rank||0)<<9;{const m=moraleOf(e);x=m?(m.st==='fearless'?101:Math.round(m.v*20)*5):-1;}}
  return[e.id,KINDS.indexOf(e.kind),e.team,Math.round(e.x),Math.round(e.y),Math.round((e.va||0)*100),Math.round((e.tang||0)*100),Math.round(e.hp),Math.round(e.max),f,x];}
function sendSnap(key,to,items,bit){NET.sc=NET.sc||{};NET.kf=NET.kf||{};NET.kt=NET.kt||{};const full=!(NET.kf[key]>G.t);if(full)NET.kf[key]=G.t+(bit?4+((key|0)%8)*.25:2);let c=NET.sc[key];if(!c||full)c=NET.sc[key]=new Map();
  // the keep-alive list (ids of unchanged entities) only needs to beat the client's expiry, so it goes out every 0.5 s, not every tick
  const sendKeep=full||!(NET.kt[key]>G.t);if(sendKeep)NET.kt[key]=G.t+(bit?.4:0);
  const ch=[],keep=[],seen=new Set();for(const a of items){seen.add(a[0]);const s=a.join(',');if(c.get(a[0])===s){if(sendKeep){if(bit)keep.push(a[0]);else keep.push(a[0],a[11]|a[12]);}}else{c.set(a[0],s);ch.push(a);}}
  for(const id of c.keys())if(!seen.has(id))c.delete(id);
  const base={t:+G.t.toFixed(2),iv:+NET.snapT.toFixed(2)};if(to)base.to=to;if(full)base.f=1;
  if(ch.length||!keep.length&&sendKeep)sendChunks('snap',base,ch);const per=bit?1400:700;for(let i=0;i<keep.length;i+=per)NET.game.emit('snap',Object.assign({},base,{e:[],k:keep.slice(i,i+per)},bit?{kb:1}:{})).catch(()=>{});}
// P2P: one copy per player, so the two visibility masks are folded into that player's 'remembered' flag and dropped
function forPlayer(items,k){const b=1<<k,out=[];for(const a of items){if(!((a[11]|a[12])&b))continue;const c=a.slice(0,11);c[9]=(a[11]&b)?(c[9]&~FLG.mem):(c[9]|FLG.mem);out.push(c);}return out;}
function sendChunks(topic,base,items){let cur=[],len=0;const flush=()=>{if(cur.length){NET.game.emit(topic,{...base,e:cur}).catch(()=>{});cur=[];len=0;}};
  for(const it of items){const s=JSON.stringify(it).length+1;if(len+s>3500)flush();cur.push(it);len+=s;}flush();}
function teamMsg(T){const q={};for(const c of CATS)q[c]=T.q[c].map(i=>[i.kind,+(i.t/prodTime(T,stats(T.fac,i.kind))).toFixed(2)]);const rq={};for(const c in T.rq)if(T.rq[c])rq[c]=[T.rq[c].key,+(T.rq[c].t/UPG[T.rq[c].key].time).toFixed(2)];
  const pw={};for(const k in T.pw)pw[k]=[Math.ceil(T.pw[k].cd),T.pw[k].lv||1];
  return{c:Math.floor(T.credits),q,rq,u:Object.keys(T.upg),ch:+T.charge.toFixed(1),gx:T.gxp,rk:T.rank,sp:T.spent,pw,rv:T.reveals.map(r=>[r.x|0,r.y|0,r.r,+r.t.toFixed(1)]),rl:T.rally?[T.rally.x|0,T.rally.y|0]:null,fa:G.fields.map(f=>f.amt|0),oil:G.oil.map(o=>[o.owner,o.cp.map(v=>+v.toFixed(1)),o.dead?1:0,Math.round(o.hp)]),out:G.teams.map(O=>O.out?1:0),tn:T.tun.length,tk:tunKinds(T),ac:G.teams.filter(O=>O.id!==T.id&&ally(O.id,T.id)).map(O=>[O.id,Math.floor(O.credits)]),wx:G.wx?G.wx.k:'clear',mg:NET.gen||0,mn:(G.mines||[]).filter(m=>m.team===T.id).map(m=>[m.x,m.y]),gt:+G.t.toFixed(2),ak:NET.cseq&&NET.peers[T.id]?Math.min(NET.cseq[NET.peers[T.id]]|0,NET.ckAk?NET.ckAk[T.id]|0:0):0,to:NET.peers[T.id]};}
function netTick(dt){if(MODE!=='host'||!NET.game||!G||!NET.peers)return;discTick();NET.snapT-=dt;NET.evT-=dt;NET.teamT-=dt;NET.bT-=dt;const live=[];for(let k=0;k<NET.peers.length;k++)if(k!==ME&&NET.peers[k]&&!G.teams[k].ai)live.push(k);if(!live.length)return;try{ckTick(dt,live);}catch(e){}
  // The room allows each sender about 40 messages a second, so with many players the host BROADCASTS one snapshot and
  // one event stream to everyone (each entity tagged with which players can see it, each client keeps only its own)
  // instead of one copy per player; team panels go out round-robin.
  // Delta snapshots: an entity whose state has not changed since the last copy that player got is listed only by id
  // (keeps it alive on their screen); full copies go out only for what changed, plus a full keyframe every 2 s that
  // also repairs anything a dropped message missed. Typical armies are mostly idle, so this cuts traffic several-fold.
  if(NET.snapT<=0){const items=[];
    for(const e of G.ents){if(e.dead)continue;let vm=0,mm=0;for(const k of live){const v=e.team===k||(e.vs&&e.vs[k]);if(e.isB){if(v)vm|=1<<k;else if((e.sn|0)&(1<<k))mm|=1<<k;}else if(v)vm|=1<<k;}
      if(!vm&&!mm)continue;const a=encEnt(e,false);a.push(vm,mm);items.push(a);}
    NET.snapT=window.WW3_P2P?.1:Math.max(.2,Math.min(.6,Math.ceil(items.length/150)*.1));
    if(window.WW3_P2P){for(const k of live){const to=NET.peers[k];if(NET.game.buffered&&NET.game.buffered(to)>48000)continue;sendSnap(k,to,forPlayer(items,k),1<<k);}}else sendSnap('all',null,items);}
  if(NET.evT<=0&&G.out.length){NET.evT=.15;let evs=G.out;G.out=[];
    let len=JSON.stringify(evs).length;if(len>3400){const imp=evs.filter(v=>v[0]!=='muz'&&v[0]!=='tr');const lo=evs.filter(v=>v[0]==='muz'||v[0]==='tr');evs=imp;len=JSON.stringify(evs).length;for(const v of lo){const s=JSON.stringify(v).length+1;if(len+s>3400)break;evs.push(v);len+=s;}}
    if(JSON.stringify(evs).length>3400)sendChunks('evt',{},evs);else if(evs.length)NET.game.emit('evt',{e:evs}).catch(()=>{});}
  else if(NET.evT<=0)NET.evT=.15;
  if(NET.teamT<=0){NET.teamT=.25;const per=window.WW3_P2P?live.length:Math.min(live.length,3);NET.trr=NET.trr||0;for(let n=0;n<per;n++){const k=live[(NET.trr++)%live.length];NET.game.emit('team',teamMsg(G.teams[k])).catch(()=>{});}}}

/* ---------- client: receive ---------- */
function applySnap(d){if(!G||!Array.isArray(d.e))return;const now=G.t;if(typeof d.t==='number'){if(d.t+1e-6<(NET.lastSnapT||0)&&!d.f)return;NET.lastSnapT=Math.max(NET.lastSnapT||0,d.t);}if(d.iv>0)NET.iv=Math.min(3,+d.iv);
  const st=typeof d.t==='number'?d.t:(NET.lastSnapT||0);
  // arrival-interval estimate (for smooth interpolation): only between consecutive host ticks
  {const w=performance.now()/1000;if(!(d.e.length===0&&d.k)&&st>(NET.prevT||0)){if(NET.rxW&&st-(NET.prevT||0)<=1.5*Math.max(.1,NET.iv||.1)){const gap=Math.min(1.5,w-NET.rxW);if(gap>.02)NET.ia=NET.ia?NET.ia*.85+gap*.15:gap;}NET.rxW=w;NET.prevT=st;}}
  if(Array.isArray(d.k)&&d.kb){let miss=0;for(const id of d.k){const e=G.byId.get(id);if(e){e.seenAt=st;e.seenL=now;}else miss++;}if(miss)askKeyframe();}
  else if(Array.isArray(d.k)){const b=1<<ME;for(let i=0;i+1<d.k.length;i+=2){if(!((d.k[i+1]|0)&b))continue;const e=G.byId.get(d.k[i]);if(e){e.seenAt=st;e.seenL=now;}}}
  for(const a of d.e){if(!Array.isArray(a)||a.length<11)continue;if(a.length>=13){const b=1<<ME;if(!(a[11]&b)&&!(a[12]&b))continue;a[9]=(a[11]&b)?(a[9]&~FLG.mem):(a[9]|FLG.mem);}const [id,ki,team,x,y,va,ta,hp,mx_,f,ex]=a;const kind=KINDS[ki];if(!kind||!(team>=0&&team<G.teams.length))continue;
    let e=G.byId.get(id);const isB=!!STRUCT[kind];
    if(!e){const T=G.teams[team];const s=isB?bstats(T.fac,kind):stats(T.fac,kind);e={id,isB,team,kind,s,x,y,va:va/100,tang:ta/100,hp,max:mx_,r:isB?s.size/2:s.r,size:isB?s.size:0,vs:new Array(G.teams.length).fill(true),fx:x,fy:y,tx:x,ty:y,it:1};G.ents.push(e);G.byId.set(id,e);}
    else{e.fx=e.x;e.fy=e.y;e.tx=x;e.ty=y;e.it=0;if(e.team!==team&&!isB){e.team=team;const T=G.teams[team];try{e.s=stats(T.fac,kind);}catch(err){}}}
    e.tva=va/100;e.tta=ta/100;e.hp=hp;e.max=mx_;e.seenAt=st;e.seenL=now;e.ut=st;e.vis=true;
    if(isB){e.built=f&FLG.built?ex/100:1;e.disv=!!(f&FLG.dis);e.dis=0;e.chv=!!(f&FLG.chg);e.mem=!!(f&FLG.mem);e.busy=!!(f&FLG.busy);e.nd=!!(f&FLG.nd);e.stall=!!(f&FLG.stall);if(kind==='uplink')e.chg=ex/100;if(kind==='garrison'){e.occN=ex>>4;e.capN=ex&15;e.built=1;}e.ang=e.tta;e.x=x;e.y=y;}
    else{e.cargo=f&FLG.cargo?1:0;e.hacking=!!(f&FLG.hack);e.planting=!!(f&FLG.plant);e.landed=!!(f&FLG.land);e.hid=!!(f&FLG.hid);e.mvC=f&FLG.mov?1:0;e.building=!!(f&FLG.busy);e.supp=f&FLG.supp?1:0;e.routV=!!(f&FLG.rout);e.shakV=!!(f&FLG.shak);e.markV=!!(f&FLG.mark);e.lastV=!!(f&FLG.last);e.aband=f&FLG.aband?1:0;e.rank=(f>>9)&3;e.mor=ex;}}}
function clientTick(dt){G.t+=dt;const now=G.t;
  const P=Math.max(.1,Math.min(.6,Math.max(NET.iv||.1,(NET.ia||NET.iv||.2)*1.15)));
  for(const e of G.ents){if(e.isB)continue;const it=(e.it||0)+dt/P;e.it=it;if(it<=1){e.x=e.fx+(e.tx-e.fx)*it;e.y=e.fy+(e.ty-e.fy)*it;}else if(e.mvC&&e.ut===NET.lastSnapT){const o=Math.min(it-1,.25/P);e.x=e.tx+(e.tx-e.fx)*o;e.y=e.ty+(e.ty-e.fy)*o;}else{e.x=e.tx;e.y=e.ty;}e.va=lerpA(e.va,e.tva,dt*10);e.tang=lerpA(e.tang,e.tta,dt*10);if(e.mvC)e.mv=now;}
  const ttl=Math.max(.9,(NET.iv||.2)*2.6),ref=NET.lastSnapT||0;for(const e of G.ents){const sl=now-(e.seenL==null?now:e.seenL);if(e.isB){if(!e.mem&&(ref-e.seenAt>Math.max(3.2,ttl*2)||sl>12))e.gone=true;}else if(ref-e.seenAt>ttl||sl>8)e.gone=true;}
  if(G.ents.some(e=>e.gone)){for(const e of G.ents)if(e.gone){G.byId.delete(e.id);}G.ents=G.ents.filter(e=>!e.gone);G.sel=G.sel.filter(e=>!e.gone);}}
function applyEvents(d){if(!d||!Array.isArray(d.e))return;for(const v of d.e){if(!Array.isArray(v))continue;const [type,...args]=v;if(!FXH[type]||type==='end'&&false)continue;
  if(type==='die'){const e=G.byId.get(args[0]);if(e){e.dead=true;G.byId.delete(e.id);G.ents=G.ents.filter(x=>x!==e);G.sel=G.sel.filter(x=>x!==e);}}
  if(type==='log'&&args[0]!==ME)continue;try{FXH[type](...args);}catch(e){}}}
function applyTeam(d){if(!G||!d)return;if(typeof d.ak==='number'&&NET.cq&&NET.cq.length&&NET.cq[0].s<=d.ak){NET.cq=NET.cq.filter(c=>c.s>d.ak);if(NET.game)NET.game.presence({cq:NET.cq}).catch(()=>{});}if(typeof d.mg==='number')NET.gen=Math.max(NET.gen||0,d.mg|0);const T=G.teams[ME];T.credits=d.c|0;for(const c of CATS)T.q[c]=(d.q&&d.q[c]||[]).map(([k,p])=>({kind:k,t:p*prodTime(T,stats(T.fac,k)),p}));
  T.rq={};for(const c in (d.rq||{})){const [k,p]=d.rq[c];if(UPG[k])T.rq[c]={key:k,t:p*UPG[k].time};}T.upg={};for(const k of d.u||[])if(UPG[k])T.upg[k]=true;T.charge=+d.ch||0;T.tunN=d.tn|0;if(Array.isArray(d.ac))for(const [i,c] of d.ac)if(G.teams[i])G.teams[i].credits=+c||0;T.tunK=d.tk&&typeof d.tk==='object'?d.tk:{};if(WEATHER[d.wx]){G.wx=G.wx||{t:0,next:1e9};G.wx.k=d.wx;}if(Array.isArray(d.mn))G.mines=d.mn.map(([x,y])=>({x,y,team:ME,arm:0}));T.gxp=d.gx|0;T.rank=d.rk|0||1;T.spent=d.sp|0;
  T.pw={};for(const k in (d.pw||{}))if(POWERS[k]){const v=d.pw[k];T.pw[k]=Array.isArray(v)?{cd:+v[0]||0,lv:+v[1]||1}:{cd:+v||0,lv:1};}T.reveals=(d.rv||[]).map(([x,y,r,t])=>({x,y,r,t}));T.rally=d.rl?{x:d.rl[0],y:d.rl[1]}:null;
  if(Array.isArray(d.oil))d.oil.forEach((v,i)=>{const o=G.oil[i];if(o&&Array.isArray(v)){o.owner=v[0];if(Array.isArray(v[1]))o.cp=v[1].map(x=>+x||0);o.dead=!!v[2];o.hp=+v[3]||0;}});if(Array.isArray(d.out))d.out.forEach((x,i)=>{if(G.teams[i]&&x&&!G.teams[i].out){G.teams[i].out=true;if(i===ME)showElim();}});
  if(Array.isArray(d.fa))d.fa.forEach((a,i)=>{if(G.fields[i])G.fields[i].amt=a;});}

/* ---------- Battle checkpoints (for host migration) ----------
   The host periodically packs the whole battle into a compact checkpoint and sends it to a standby player. If the host
   drops out, the standby restores the latest checkpoint and carries on as the new host; everyone else reconnects to it.
   Entities, resource fields, oil derricks and civilian buildings referenced inside other objects are stored by id or
   index, unit stat blocks are shared through a table, and anything visual or derived is rebuilt after loading. */
const CK_G=['t','nid','aiT','visT','endT','over','bs','cbrTeams','mT','ecT','wx','mines','smokes','shields','craters','ruins','aiTT','sqOf'];
const CK_TEAM_SKIP=new Set(['F','ai','id','fac','color','dark']);
function ckEncode(){const ids=new Map();for(const e of G.ents)ids.set(e,e.id);const fi=new Map(G.fields.map((f,i)=>[f,i])),oi=new Map(G.oil.map((o,i)=>[o,i])),ci=new Map((G.civ||[]).map((c,i)=>[c,i]));
  const S=[],SI=new Map();const sref=s=>{let i=SI.get(s);if(i==null){i=S.length;SI.set(s,i);S.push(s);}return i;};
  const seen=new WeakSet();
  const enc=(v,depth)=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isObject3D||v.isMaterial||v.isBufferGeometry)return undefined;
    if(ids.has(v)&&depth>0)return {$e:ids.get(v)};if(fi.has(v))return {$f:fi.get(v)};if(oi.has(v))return {$o:oi.get(v)};if(ci.has(v)&&depth>0)return {$c:ci.get(v)};
    if(v instanceof Map||v instanceof Set||v instanceof WeakSet||ArrayBuffer.isView(v))return undefined;if(depth>7||seen.has(v))return undefined;seen.add(v);
    let out;if(Array.isArray(v)){out=v.map(x=>{const y=enc(x,depth+1);return y===undefined?null:y;});}else{out={};for(const k in v){const y=enc(v[k],depth+1);if(y!==undefined)out[k]=y;}}seen.delete(v);return out;};
  const ents=G.ents.filter(e=>!e.dead).map(e=>{const o={};for(const k in e){if(k==='s'){o.$s=sref(e.s);continue;}if(k==='vs'||k==='_vr'||k[0]==='_')continue;const y=enc(e[k],1);if(y!==undefined)o[k]=y;}return o;});
  const teams=G.teams.map(T=>{const o={};for(const k in T){if(CK_TEAM_SKIP.has(k))continue;const y=enc(T[k],1);if(y!==undefined)o[k]=y;}o.$ai=!!T.ai;o.aiTook=!!T.aiTook;return o;});
  const g={};for(const k of CK_G)if(G[k]!==undefined){const y=enc(G[k],1);if(y!==undefined)g[k]=y;}
  const fields=G.fields.map(f=>({amt:f.amt,owner:f.owner}));
  const oil=G.oil.map(o=>{const r={};for(const k in o){if(k==='tg')continue;const y=enc(o[k],1);if(y!==undefined&&(typeof y!=='object'||Array.isArray(y)||y===null||y.$e!=null))r[k]=y;}return r;});
  const civ=(G.civ||[]).map(c=>{const r={};for(const k in c){if(k==='obj'||k==='mesh')continue;const y=enc(c[k],2);if(y!==undefined)r[k]=y;}return r;});
  return {v:1,ents,S:S.map(s=>enc(s,1)),teams,g,fields,oil,civ,toks:NET.toks||null,start:NET.startInfo||null,me:ME,cs:NET.peers?NET.peers.map((p,i)=>Math.max(p&&NET.cseq?NET.cseq[p]|0:0,(NET.cseqSlot||[])[i]|0)):null};}
function ckDecode(ck){const byId=new Map();const S=ck.S;const ents=ck.ents.map(o=>Object.assign({},o));for(const e of ents)byId.set(e.id,e);
  const dec=v=>{if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(dec);if(v.$e!=null)return byId.get(v.$e)||null;if(v.$f!=null)return G.fields[v.$f]||null;if(v.$o!=null)return G.oil[v.$o]||null;if(v.$c!=null)return (G.civ||[])[v.$c]||null;
    const o={};for(const k in v)o[k]=dec(v[k]);return o;};
  const sTab=S.map(s=>dec(s));
  for(const e of ents){for(const k in e){if(k==='$s')continue;e[k]=dec(e[k]);}e.s=sTab[e.$s];delete e.$s;e.vs=new Array(G.teams.length).fill(false);}
  return {ents,byId};}
// Turn this page (currently a client in the battle) into the host, from a checkpoint.
function ckRestore(ck){const N=G.teams.length;const {ents,byId}=ckDecode(ck);
  G.ents=ents;G.byId=byId;G.proj=[];G.strikes=[];G.timers=[];G.planes=[];G.out=[];
  for(const k in ck.g){const d=ck.g[k];G[k]=(d&&typeof d==='object')?JSON.parse(JSON.stringify(d)):d;}
  const reb=v=>{if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(reb);if(v.$e!=null)return byId.get(v.$e)||null;if(v.$f!=null)return G.fields[v.$f]||null;if(v.$o!=null)return G.oil[v.$o]||null;if(v.$c!=null)return (G.civ||[])[v.$c]||null;const o={};for(const k in v)o[k]=reb(v[k]);return o;};
  for(const k of ['mines','smokes','shields'])if(Array.isArray(G[k]))G[k]=reb(G[k]);
  ck.fields.forEach((f,i)=>{if(G.fields[i])Object.assign(G.fields[i],f);});
  ck.oil.forEach((o,i)=>{if(G.oil[i])Object.assign(G.oil[i],reb(o));});
  (ck.civ||[]).forEach((c,i)=>{const C=G.civ&&G.civ[i];if(C)for(const k in c)C[k]=reb(c[k]);});
  ck.teams.forEach((t,i)=>{const T=G.teams[i];if(!T)return;for(const k in t){if(k==='$ai'||k==='aiTook')continue;T[k]=reb(t[k]);}T.ai=(t.$ai||t.aiTook)?mkAI(1):null;T.aiTook=!!t.aiTook;});
  G.bdirty=true;G.hash=null;try{buildHash();}catch(e){}try{updateVis();}catch(e){}G.sel=G.sel.filter(e=>byId.has(e.id)).map(e=>byId.get(e.id));}
/* ---------- Host migration ----------
   Every 8 s the host packs a checkpoint (gzip, ~25 KB for a busy 8-player battle) and sends it to one standby player
   (the first connected player who is allowed to host). If the host disappears, everyone first tries to reconnect to
   the same room; after two failed tries the standby restores the checkpoint and opens the follow-up room
   "<code>-m1"; the other players move there automatically and rejoin as their own commanders. The old host's army is
   handed to the AI. */
async function ckPack(ck){const js=JSON.stringify(ck);if(typeof CompressionStream==='undefined')return 'J'+js;
  const buf=new Uint8Array(await new Response(new Blob([js]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let b='';for(let i=0;i<buf.length;i+=32768)b+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));return 'Z'+btoa(b);}
async function ckUnpack(s){if(s[0]==='J')return JSON.parse(s.slice(1));const bin=atob(s.slice(1)),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
function migRoom(gen){return gen>0?NET.baseCode+'-m'+gen:NET.baseCode;}
function ckTick(dt,live){NET.ckT=(NET.ckT==null?4:NET.ckT)-dt;if(NET.ckT>0||NET.ckBusy||!live.length||!NET.game)return;NET.ckT=8;
  const sb=live.find(k=>(NET.edOf||{})[NET.peers[k]]!==0);if(sb==null)return;const to=NET.peers[sb];NET.ckBusy=true;
  let ck;try{ck=ckEncode();ck.gen=NET.gen||0;}catch(e){console.warn('checkpoint',e);NET.ckBusy=false;return;}
  ckPack(ck).then(s=>{if(!NET.game)return;const id=(NET.ckId=(NET.ckId||0)+1),n=Math.ceil(s.length/3000);for(let i=0;i<n;i++)NET.game.emit('ck',{to,id,i,n,d:s.slice(i*3000,(i+1)*3000)}).catch(()=>{});NET.ckAk=ck.cs;}).catch(()=>{}).finally(()=>{NET.ckBusy=false;});}
function ckReceive(d){if(!d||typeof d.d!=='string'||!(d.n>0)||d.n>400)return;const P=NET.ckParts||(NET.ckParts={});let e=P[d.id];if(!e){e=P[d.id]={n:d.n,got:0,a:new Array(d.n)};for(const k in P)if(+k<d.id-2)delete P[k];}
  if(e.a[d.i]==null){e.a[d.i]=d.d;e.got++;}if(e.got===e.n){NET.lastCk=e.a.join('');NET.isStandby=true;delete P[d.id];}}
async function promoteToHost(){let ck;try{ck=await ckUnpack(NET.lastCk);}catch(e){console.warn('checkpoint unpack',e);return false;}
  const gen=(ck.gen||0)+1,code2=migRoom(gen),me=ME;
  try{ckRestore(ck);}catch(e){console.warn('checkpoint restore',e);return false;}
  MODE='host';ME=me;NET.gen=gen;NET.toks=ck.toks||[];NET.startInfo=ck.start;NET.peers=new Array(G.teams.length).fill(null);NET.cseq={};NET.cseqSlot=Array.isArray(ck.cs)?ck.cs.slice():[];NET.ckAk=null;NET.sc={};NET.kt={};NET.kf={};NET.isStandby=false;NET.lastCk=null;NET.edOf={};
  const oldHost=ck.me|0;for(let k=0;k<G.teams.length;k++){const T=G.teams[k];if(k===ME){T.ai=null;T.discT=0;continue;}if(k===oldHost){if(!T.ai){T.ai=mkAI(1);T.aiTook=1;}continue;}if(!T.ai&&!T.out)T.discT=G.t;}
  try{if(NET.game)NET.game.leave().catch(()=>{});}catch(e){}NET.game=null;NET.code=code2;
  try{NET.game=await NET.room.join('tc-'+code2);}catch(e){pushLog('Could not open the new game room.','w');return false;}
  wireHost(NET.game);NET.game.presence({h:1}).catch(()=>{});
  for(const O of G.teams)log(O.id,`The host left. ${G.teams[ME].F.name} is now hosting the battle; the other commanders are reconnecting.`,'w');return true;}

/* ================= UI: sidebar, input, menu, main loop ================= */
const mouse={x:0,y:0,in:false};const keys={};let drag=null,TAB='build';
function log(team,msg,kind){FXE('log',[team,msg,kind||'']);}
function pushLog(m,k){if(!G)return;try{if(/ ready\.$/.test(m))speak(3);else if(/under attack/i.test(m))speak(4);}catch(e){}G.msgs.unshift({m,k});G.msgs.length=Math.min(G.msgs.length,5);const el=$('log');el.innerHTML='';for(const x of G.msgs){const d=document.createElement('div');d.className=x.k||'';d.textContent=x.m;el.append(d);}}
function endGame(winner,reason){if(!G||G.over)return;if(MODE==='host'&&G.out){G.out.push(['end',winner]);NET.evT=0;}showEnd(winner,reason);}
function rivals(){return G.teams.filter(T=>!ally(T.id,ME)).map(T=>T.F.name);}
function vsText(){const r=rivals();return r.length<=2?r.join(' and '):`${r.length} rivals`;}
function showEnd(winner,reason){if(!G)return;G.over=true;const T=G.teams,me=T[ME],m=Math.floor(G.t/60),s=Math.floor(G.t%60);
  const won=winner>=0&&ally(winner,ME);const wn=winner>=0?T.filter(Q=>ally(Q.id,winner)).map(Q=>Q.F.name):[];$('endt').textContent=won?'Victory':'Defeat';$('ends').textContent=(reason?reason+' ':'')+(winner>=0&&!won?`${wn.join(' and ')} won. `:won&&wn.length>1?`Your alliance (${wn.join(', ')}) won. `:'')+`${me.F.name} vs ${vsText()} · ${m}:${String(s).padStart(2,'0')}`+(MODE==='client'?'':` · You trained ${me.built} units, destroyed ${me.kills} enemy units and structures, and reached general rank ${me.rank}.`);
  $('again').hidden=MODE!=='single';if($('watch'))$('watch').hidden=true;$('end').hidden=false;}
function showElim(){if(!G)return;const left=G.teams.filter(T=>!T.out&&T.id!==ME).length;$('endt').textContent='Defeat';const why=G.teams[ME].whyOut;$('ends').textContent=`${G.teams[ME].F.name} has capitulated${why?': '+why:'.'} ${left} rival${left===1?'':'s'} still fighting. You can keep watching the battle.`;
  $('again').hidden=MODE!=='single';if($('watch'))$('watch').hidden=false;$('end').hidden=false;}

/* ---------- panels ---------- */
function btnHTML(id,name,cost,desc){return `<button class="btn" id="${id}"><span class="n"></span><span class="c"></span>${desc!=null?'<span class="d"></span>':''}<span class="q"></span><span class="p"></span></button>`;}
function buildPanels(){const T=G.teams[ME],el=$('panel');el.innerHTML='';const mk=(tab,id,name,cost,desc,on,onR,wide)=>{const b=document.createElement('button');b.className='btn'+(wide?' wide':'');b.id=id;b.dataset.tab=tab;
    b.innerHTML=`<span class="n"></span><span class="c"></span>${desc?'<span class="d"></span>':''}<span class="q"></span><span class="p"></span>`;b.querySelector('.n').textContent=name;b.querySelector('.c').textContent=cost;if(desc)b.querySelector('.d').textContent=desc;
    b.onclick=on;if(onR)b.oncontextmenu=e=>{e.preventDefault();onR();};el.append(b);return b;};
  const sub=(tab,txt)=>{const d=document.createElement('div');d.className='sub';d.dataset.tab=tab;d.textContent=txt;el.append(d);};
  for(const k of BUILD_ORDER){const s=bstats(T.fac,k);mk('build','b_'+k,s.name,'$'+s.cost,null,()=>{if(T.credits<s.cost||!reqMet(ME,k))return;G.aim=null;G.place=G.place===k?null:k;});}
  const R=roster(T.fac);for(const c of CATS){sub('units',STRUCT[c].name);for(const k of R[c]){const s=stats(T.fac,k);mk('units','u_'+k,s.name,'$'+s.cost,null,()=>{if(!(MODE==='client'?true:enqueue(ME,k)))pushLog('Not enough credits or missing building.','w');else if(MODE==='client')doAct({t:'q',k});},()=>doAct({t:'dq',k}));}}
  const ups=upgList(T.fac);for(const c of CATS){const list=ups.filter(k=>UPG[k].at===c);if(!list.length)continue;sub('upg',STRUCT[c].name);for(const k of list){const U=UPG[k];mk('upg','g_'+k,U.name+(U.fac?' ★':''),'$'+U.cost,U.desc,()=>doAct({t:'up',k}),null,true);}}
  for(const k in POWERS){const P=powInfo(k,T.fac);mk('pow','p_'+k,P.name,'',P.desc,()=>{if(!T.pw[k]){doAct({t:'buy',k});return;}if(P.passive||T.pw[k].cd>0)return;if(P.self){doAct({t:'pow',k,x:0,y:0});return;}G.place=null;G.aim=k;},null,true);}
  sub('pow','Upgrade powers (more points each level)');for(const k in POWERS){const P=powInfo(k,T.fac);mk('pow','pu_'+k,'▲ '+P.name,'',P.passive?'Bigger bounty per level':'Level 2: about 40% stronger, 15% faster cooldown. Level 3: about 80% stronger, 30% faster.',()=>doAct({t:'buy',k}),null,true);}
  showTab(TAB);updateUI();}
function showTab(t){TAB=t;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));document.querySelectorAll('#panel>[data-tab]').forEach(b=>b.hidden=b.dataset.tab!==t);}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function specLock(T,k){return k===T.F.special&&T.rank<SPEC_RANK;}
function setBtn(id,o){const b=$(id);if(!b)return;b.disabled=!!o.dis;if(o.cost!=null)b.querySelector('.c').textContent=o.cost;b.querySelector('.q').textContent=o.q||'';b.querySelector('.p').style.width=(o.p||0)*100+'%';b.classList.toggle('on',!!o.on);b.classList.toggle('done',!!o.done);b.title=o.title||'';}
function renderAllies(){const el=$('allyBox');if(!el||!G)return;const T=G.teams[ME];const A=G.teams.filter(O=>O.id!==ME&&ally(O.id,ME)&&!O.out);el.hidden=!A.length||!!G.sandbox;if(el.hidden)return;
  const key=A.map(O=>O.id).join(',');if(el.dataset.k!==key){el.dataset.k=key;el.innerHTML='<div class="lbl"><span>Allies</span><span id="allyt" style="font:12px var(--mono);color:var(--dim)">send money</span></div>';
    for(const O of A){const r=document.createElement('div');r.className='ar';r.innerHTML=`<b style="color:${O.color}">${O.F.name}</b>`;const sm=document.createElement('small');sm.dataset.c=O.id;r.append(sm);
      for(const v of [250,1000,'½']){const b=document.createElement('button');b.textContent=v==='½'?'Half':'+$'+v;b.dataset.v=v;b.title=v==='½'?'Send half of your money':`Send $${v}`;b.onpointerdown=ev=>{ev.preventDefault();const amt=v==='½'?Math.floor(G.teams[ME].credits/2):v;doAct({t:'give',to:O.id,amt});};r.append(b);}el.append(r);}}
  for(const sm of el.querySelectorAll('small[data-c]')){const O=G.teams[+sm.dataset.c];sm.textContent='$'+Math.floor(O.credits);}
  for(const b of el.querySelectorAll('button'))b.disabled=b.dataset.v==='½'?T.credits<100:T.credits<+b.dataset.v;}
function updateUI(){if(!G)return;renderSquads();renderAllies();const T=G.teams[ME];sbPanel();$('facname').textContent=T.F.name;$('facname').style.color=T.color;$('credits').textContent=G.sandbox&&ME===0?'∞ Unlimited':'$'+Math.floor(T.credits).toLocaleString();
  for(const k of BUILD_ORDER){const s=bstats(T.fac,k),ok=reqMet(ME,k);if(!bldAllowed(T.fac,k)){setBtn('b_'+k,{dis:true,cost:'Not available',title:'This faction has no air force'});continue;}const lim=s.limit&&G.ents.filter(e=>!e.dead&&e.isB&&e.team===ME&&e.kind===k).length>=s.limit;setBtn('b_'+k,{dis:!ok||T.credits<s.cost||lim,cost:lim?'Max '+s.limit:'$'+s.cost,on:G.place===k,title:ok?(STRUCT[k].desc||(STRUCT[k].shore?'Place on the shoreline':'')):`Requires ${STRUCT[STRUCT[k].req].name}`});}
  for(const k of allUnits(T.fac)){const s=stats(T.fac,k),q=T.q[s.from]||[],n=q.filter(x=>x.kind===k).length,has=done(ME,s.from);const first=q[0]&&q[0].kind===k?(q[0].p!=null?q[0].p:q[0].t/prodTime(T,s)):0;
    const lk=specLock(T,k);setBtn('u_'+k,{dis:lk||!has||(T.credits<s.cost&&!n),cost:lk?`General rank ${SPEC_RANK}`:k===T.F.special?'$'+s.cost+(T.rank>=6?' · Elite':T.rank>=4?' · Veteran':''):'$'+s.cost,q:n?'×'+n:'',p:first,title:(lk?`Unlocks at general rank ${SPEC_RANK}; gets Veteran (+20%) at rank 4 and Elite (+40%) at rank 6. `:'')+(has?'':`Requires ${STRUCT[s.from].name}. `)+(k===T.F.special&&SPECIAL_TIP[k]?SPECIAL_TIP[k](s)+' ':'')+(COUNTER[k]||COUNTER[s.cls]||'')});}
  for(const k of upgList(T.fac)){const U=UPG[k],r=T.rq[U.at],mine=r&&r.key===k;setBtn('g_'+k,{dis:T.upg[k]||!done(ME,U.at)||(!!r&&!mine)||T.credits<U.cost&&!mine,done:T.upg[k],cost:T.upg[k]?'Researched':mine?'Researching…':'$'+U.cost,p:mine?r.t/U.time:0,title:done(ME,U.at)?'':`Requires ${STRUCT[U.at].name}`});}
  const pts=T.rank-T.spent;for(const k in POWERS){const P=powInfo(k,T.fac),w=T.pw[k];const lv=w?(w.lv||1):0;setBtn('p_'+k,{dis:w?(P.passive||w.cd>0):pts<1,done:!!w,on:G.aim===k,cost:w?('Lv '+lv+' · '+(P.passive?'Active':w.cd>0?`Ready in ${Math.ceil(w.cd)}s`:(P.self?'Ready · click to use':'Ready · click, then pick a spot'))):`Unlock · 1 point`});
    {const b=$('pu_'+k);if(b){const c=lv>=1&&lv<3?lv+1:0;b.style.display=c?'':'none';if(c)setBtn('pu_'+k,{dis:pts<c,cost:`To level ${lv+1} · ${c} points`});}}}
  const dot=$('pdot');const tb=document.querySelector('.tabs button[data-tab="pow"]');if(tb){let d=tb.querySelector('.dot');if(pts>0&&!d){d=document.createElement('span');d.className='dot';tb.append(d);}else if(pts<=0&&d)d.remove();}
  const up=done(ME,'uplink'),f=T.charge/T.sup.charge,rem=Math.max(0,Math.ceil(T.sup.charge-T.charge));$('supname').textContent=T.sup.name;$('supbar').style.width=(up?f*100:0)+'%';
  $('supt').textContent=!up?'needs Strike Center':f>=1?'READY':`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;$('supbtn').disabled=!(up&&f>=1);
  const nx=RANKS[T.rank]||null,pr=RANKS[T.rank-1];$('rankname').textContent=`General rank ${T.rank}`+(pts>0?` · ${pts} point${pts>1?'s':''} to spend`:'');$('rankbar').style.width=(nx?Math.min(1,(T.gxp-pr)/(nx-pr))*100:100)+'%';$('rankt').textContent=nx?`${T.gxp}/${nx} XP`:'Max rank';
  const md=$('mode');if(G.place){md.hidden=false;md.textContent=`Place ${STRUCT[G.place].name}`+(STRUCT[G.place].shore?' on the shore':'')+' · a Construction Vehicle will drive here and build it'+' · Esc cancels';}else if(G.aim){md.hidden=false;md.textContent=`Choose a target for ${G.aim==='sup'?T.sup.name:powInfo(G.aim,G.teams[ME].fac).name}`;}else if(G.amove){md.hidden=false;md.textContent='Attack-move: click a destination';}else if(G.defm){md.hidden=false;md.textContent='Defend area: click the spot to hold';}else md.hidden=true;
  const s=G.sel.filter(e=>!e.dead);const el=$('info');el.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span'),tip=document.createElement('span');tip.className='tip';
  if(s.length===1){const e=s[0];b.textContent=e.s.name+(e.rank?` · ${VET[e.rank]}`:'');sp.textContent=` ${Math.ceil(e.hp)} / ${e.max} HP`+(e.isB&&e.built<1?` · building ${Math.floor(e.built*100)}%`:'')+((e.dis>G.t||e.disv)?' · HACKED':'')+(e.kind==='jet'?` · ${e.landed?'parked':'airborne'}`:'');
    tip.textContent=e.kind==='hacker'?'Right-click an enemy building to disable it. Idle hackers earn cash.':e.s.demo?'Stealthed. Right-click an enemy building to plant explosives.':e.kind==='hero'?'Stealthed until it fires. Snipes infantry from long range.':e.kind==='jet'?'Right-click a target to strike. Jets return to the airfield to rearm.':e.kind==='harv'?'Right-click a supply field to send it there.':e.kind==='dozer'?'Builds everything: pick a building under Build, then click the map. Right-click an unfinished building to help. Repairs buildings it stands next to.':e.isB&&e.kind==='tunnel'&&e.team===ME?`Units inside: ${MODE==='client'?(T.tunN|0):T.tun.length} of 12. Select units and right-click a tunnel to send them in; they heal inside and can come out of any tunnel.`:e.isB&&e.nd&&e.built<1?(e.stall?'Waiting for a Construction Vehicle to arrive and build it.':'A Construction Vehicle is building this.'):e.isB&&e.team===ME&&CATS.includes(e.kind)?'Right-click the ground to set the rally point.':'';}
  else if(s.length){const c={};for(const e of s)c[e.s.name]=(c[e.s.name]||0)+1;b.textContent=`${s.length} selected`;sp.textContent=' '+Object.entries(c).map(([n,v])=>`${v}× ${n}`).join(' · ');}
  else{sp.textContent='Click to select units or a building. Double-click selects all of a type on screen.';}
  if(s.length===1&&!s[0].isB&&s[0].aband)tip.textContent=ally(s[0].team,ME)?'Abandoned - the crew bailed out. Select infantry and right-click it to re-crew it before the enemy captures it.':'Abandoned enemy vehicle - select infantry and right-click it to capture it.';
  if(s.length===1&&!s[0].isB&&!s[0].aband&&SPECIAL_TIP[s[0].kind]&&s[0].kind===G.teams[s[0].team].F.special)tip.textContent=SPECIAL_TIP[s[0].kind](s[0].s);
  if(s.length===1&&!s[0].isB&&(COUNTER[s[0].s.cls]||COUNTER[s[0].kind])&&!tip.textContent)tip.textContent=COUNTER[s[0].kind]||COUNTER[s[0].s.cls];
  {const ms=s.filter(e=>!e.isB).map(moraleOf).filter(Boolean);if(ms.length){const avg=ms.reduce((a,m)=>a+m.v,0)/ms.length,fl=ms.every(m=>m.st==='fearless'),ls=ms.filter(m=>m.st==='last').length,rt=ms.filter(m=>m.st==='routing').length;const T0=G.teams[s[0].team],why=NOBREAK[T0.fac]?'never break':T0.clr?'Ayatollah':(T0.mart||0)>G.t?'martyrdom':'fervor';const st=fl?'fearless':ls>ms.length/2?'last':rt>ms.length/2?'routing':avg>.66?'steady':avg>.35?'shaken':'breaking';
    const mb=document.createElement('div');mb.className='morale';mb.innerHTML=`<span class="ml">Morale</span><span class="mbar"><i style="width:${Math.round(avg*100)}%;background:${MOR_COL[st]}"></i></span><span class="mt" style="color:${MOR_COL[st]}">${fl?'Fearless ('+why+')':MOR_TXT[st]+(st==='last'?'':' '+Math.round(avg*100)+'%')}${rt&&!fl?' · '+rt+' routing':''}${ls&&st!=='last'?' · '+ls+' last stand':''}</span>`;
    mb.title='Morale falls when units take fire, see comrades die or are outnumbered, and recovers out of combat. At zero they break and run back to base, ignoring orders, and take 25% extra damage while running. They rally fast near their HQ, an Ayatollah, a friendly-held building or an officer. Surrounded troops make a last stand instead (fearless but pinned). Crews bail out of badly damaged vehicles, which infantry can re-crew or capture. '+(fl?(NOBREAK[T0.fac]?'North Korean troops never break.':'While the Ayatollah lives, these troops never break.'):'Veterans, heroes, officers and cover help.');sp.after(mb);}}
  el.append(b,sp);if(tip.textContent)el.append(tip);
  if(s.some(u=>!u.isB&&u.team===ME&&!u.s.noAttack)){const r=document.createElement('div');r.className='cmdrow';const bd=document.createElement('button');bd.textContent=(s.some(u=>u.defend)?'✓ Defending · ':'')+'Defend area (G)';bd.onclick=()=>{G.defm=!G.defm;G.amove=false;updateUI();};const ba=document.createElement('button');ba.textContent='⚔ Attack (F)';ba.title='Advance to the spot you click and fight everything on the way';ba.onclick=()=>{G.amove=!G.amove;G.defm=false;updateUI();};if(G.amove){ba.classList.add('on');ba.textContent='⚔ Attack: click map…';}bd.textContent=G.defm?'🛡 Defend: click map…':'🛡 '+bd.textContent;if(G.defm)bd.classList.add('on');bd.title='Hold the spot you click: engage anything that comes near it, then return';const bs=document.createElement('button');bs.textContent='Stop (X)';bs.onclick=()=>{doAct({t:'stop',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});};const br=document.createElement('button');br.textContent=s.some(u=>u.retreat)?'↩ Retreating…':'↩ Retreat (R)';br.title='Run back to the nearest HQ, barracks or factory: a bit faster and harder to hit, no stopping to fight';br.onclick=()=>{doAct({t:'ret',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});speak(2);};r.append(ba,bd,bs,br);el.append(r);}
  if(s.length===1&&!s[0].isB&&s[0].s.cap&&s[0].team===ME){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';const n=MODE==='client'?'':` (${cargoLoad(s[0])}/${s[0].s.cap})`;ub.textContent='Unload troops here'+n;const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='garrison'&&s[0].team===ME){const c=civAtXYAny(s[0].x,s[0].y),n=MODE==='client'?(s[0].occN|0):(c?c.occ.length:0),cap=MODE==='client'?(s[0].capN|0):(c?c.cap:0);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>Troops inside: '+n+' / '+cap+'</b><br>Safe inside, firing out at 20% longer range. Shells, rockets and tank guns can bring the building down.';el.append(d);const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring troops out';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'ungar',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1){const n=MODE==='client'?(T.tunN|0):T.tun.length,K=MODE==='client'?(T.tunK||{}):tunKinds(T);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>In the tunnel network: '+n+' / '+TUN_CAP+'</b>'+(n?'<br>'+Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+' × '+((()=>{try{return stats(T.fac,k).name}catch(_){return k}})())).join('<br>'):'<br>Empty. Right-click a tunnel with units selected to send them in.');el.append(d);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1&&(MODE==='client'?T.tunN:T.tun.length)){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring units out here';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  const net=$('net');if(MODE!=='single'){net.hidden=false;net.innerHTML=`<b>●</b> Online · ${MODE==='host'?'hosting':'connected'} · vs ${vsText()}`;}else net.hidden=true;}
$('supbtn').onclick=()=>{G.place=null;G.aim='sup';};


/* ---------- squads: group units so they move together ---------- */
// Up to 5 squads. "Group selected" (or Ctrl/Shift + 1-5) puts the selection in a squad; click a squad button or press 1-5 to
// select it, click twice to jump the camera to it. A squad moves in formation at the pace of its slowest unit.
const SQN=5;function sqList(i){if(!G||!G.sq)return[];const ids=G.sq[i]||[];return ids.map(id=>G.byId.get(id)).filter(u=>u&&!u.dead&&u.team===ME);}
function sqOfSel(){const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(own.length<2)return -1;for(let i=1;i<=SQN;i++){const L=sqList(i);if(L.length&&L.length===own.length&&own.every(u=>L.includes(u)))return i;}return -1;}
function sqAssign(i){const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(!own.length)return false;G.sq=G.sq||{};for(let k=1;k<=SQN;k++)if(k!==i&&G.sq[k])G.sq[k]=G.sq[k].filter(id=>!own.some(u=>u.id===id));G.sq[i]=own.map(u=>u.id);pushLog(`Squad ${i} formed: ${own.length} unit${own.length>1?'s':''}. It will move in formation.`,'g');sfxUI(520);renderSquads();return true;}
let sqLast={i:0,t:0};function sqSelect(i){const L=sqList(i);if(!L.length)return;const now=performance.now();if(sqLast.i===i&&now-sqLast.t<450){const x=L.reduce((s,u)=>s+u.x,0)/L.length,y=L.reduce((s,u)=>s+u.y,0)/L.length;centerOn(x,y);}sqLast={i,t:now};G.sel=L.slice();speak(0);updateUI();renderSquads();}
function renderSquads(){const el=$('sqs');if(!el||!G)return;if(!el.children.length)for(let i=1;i<=SQN;i++){const b=document.createElement('button');b.dataset.i=i;b.onclick=e=>{const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(e.shiftKey||e.ctrlKey||(!sqList(i).length&&own.length))sqAssign(i);else sqSelect(i);};el.append(b);}
  const cur=sqOfSel();G.sqOf={};for(let i=1;i<=SQN;i++){const L=sqList(i);if(G.sq)G.sq[i]=L.map(u=>u.id);for(const u of L)G.sqOf[u.id]=i;const b=el.children[i-1];b.innerHTML='';b.append(String(i));const sm=document.createElement('small');sm.textContent=L.length?`${L.length} unit${L.length>1?'s':''}`:'empty';b.append(sm);{const ms=L.map(moraleOf).filter(Boolean);if(ms.length){const avg=ms.reduce((a,m)=>a+m.v,0)/ms.length,fl=ms.every(m=>m.st==='fearless'),rt=ms.some(m=>m.st==='routing');const st=fl?'fearless':rt?'routing':avg>.66?'steady':avg>.35?'shaken':'breaking';const q=document.createElement('span');q.className='sqm';q.innerHTML=`<i style="width:${Math.round(avg*100)}%;background:${MOR_COL[st]}"></i>`;q.title='Squad morale: '+MOR_TXT[st];b.append(q);if(rt)b.classList.add('rout');else b.classList.remove('rout');}}b.classList.toggle('on',cur===i);b.classList.toggle('empty',!L.length);b.title=L.length?`Squad ${i}: click to select, click again to find it. Shift+click to replace it with the selection.`:'Empty: select units, then click here to make them squad '+i+'.';}
  const mk=$('sqMake');if(mk)mk.disabled=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).length<1;}
if($('sqMake'))$('sqMake').onclick=()=>{if(!G)return;let i=0;for(let k=1;k<=SQN;k++)if(!sqList(k).length){i=k;break;}if(!i)i=1;sqAssign(i);};
/* ---------- input ---------- */
function mpos(e){const r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;}
function pickAt(sx,sy,own){let best=null,bd=1e9;for(const e of G.ents){if(e.dead||!vis(e))continue;if(own&&e.team!==ME)continue;if(e.team!==ME&&e.hid)continue;const p=toScreen(e.x,unitH(e)+entHeightMid(e)*.6,e.y);const rad=Math.max(10,(e.isB?e.size*.55:e.r+3)*PPU);const d=Math.hypot(p.x-sx,p.y-sy);if(d<rad&&d<bd){bd=d;best=e;}}return best;}
function fieldAt(w){const i=G.fields.findIndex(f=>Math.hypot(f.x-w.x,f.y-w.y)<f.r+10);return i;}
cv.addEventListener('mouseenter',e=>{mpos(e);mouse.in=true;});cv.addEventListener('mouseleave',()=>{mouse.in=false;});
cv.addEventListener('mousemove',e=>{mpos(e);});
cv.addEventListener('wheel',e=>{e.preventDefault();const dy=(e.deltaMode===1?e.deltaY*33:e.deltaY)*(SET.inv?-1:1)*(SET.zm||100)/100;camTarget();const od=cam.td,nd=Math.max(200,Math.min(1800,cam.td*Math.exp(dy*.0012)));cam.td=nd;{const w=screenToWorld(mouse.x,mouse.y);if(w){const f=1-nd/od;cam.tx+=(w.x-cam.tx)*f*.9;cam.ty+=(w.y-(cam.ty+cam.dist*.08))*f*.9;}}},{passive:false});
function issueCmd(w,t,rally){
    const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);
    if(rally&&!units.length&&G.sel.some(b=>b.isB&&b.team===ME)){doAct({t:'rally',x:w.x,y:w.y});pushLog('Rally point set.');return true;}
    if(!units.length)return false;const ids=units.map(u=>u.id);
    if(!t){const oi=G.oil.findIndex(o=>!o.dead&&!ally(o.owner,ME)&&o.owner>=0&&Math.hypot(o.x-w.x,o.y-w.y)<38);if(oi>=0){doAct({t:'atkOil',ids,fi:oi});speak(2);FXH.ping(G.oil[oi].x,G.oil[oi].y,30);return true;}}
    if(t&&t.team===ME&&!t.isB&&t.s.cap&&units.some(u=>u!==t&&canBoard(t,u))){doAct({t:'board',ids:units.filter(u=>u!==t&&canBoard(t,u)).map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.kind==='tunnel'&&t.built>=1&&units.some(u=>u.s.dom==='ground'&&u.kind!=='harv')){doAct({t:'tun',ids:units.filter(u=>u.s.dom==='ground'&&u.kind!=='harv').map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.built<1&&units.some(u=>u.kind==='dozer')){doAct({t:'bldGo',ids:units.filter(u=>u.kind==='dozer').map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)&&t.aband&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){const inf=units.filter(u=>isInf(u.s)&&!u.s.noAttack);doAct({t:'go',ids:inf.map(u=>u.id),x:t.x,y:t.y,mode:'move'});const rest=units.filter(u=>!inf.includes(u));if(rest.length)doAct({t:'go',ids:rest.map(u=>u.id),x:t.x,y:t.y,mode:'amove'});speak(1);FXH.ping(t.x,t.y,30);pushLog('Infantry moving to capture the abandoned vehicle.');return true;}
    if(t&&ally(t.team,ME)&&t.aband&&!t.isB&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){doAct({t:'go',ids:units.filter(u=>isInf(u.s)&&!u.s.noAttack).map(u=>u.id),x:t.x,y:t.y,mode:'move'});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)){doAct({t:'atk',ids,tid:t.id});speak(2);FXH.ping(t.x,t.y,24);return true;}
    {const c=(!t||(t.kind==='garrison'&&ally(t.team,ME)))?(t&&t.kind==='garrison'?civAtXYAny(t.x,t.y):civUnder(mouse.x,mouse.y,w)):null;
     if(c&&!c.dead){const inf=units.filter(u=>canGarrison(u));const rest=units.filter(u=>!canGarrison(u)&&u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker');
       if(inf.length){doAct({t:'gar',ids:inf.map(u=>u.id),ci:c.i});speak(1);FXH.ping(c.x,c.y,30);if(!rest.length)return true;}
       if(rest.length&&!(t&&t.kind==='garrison')){doAct({t:'atkCiv',ids:rest.map(u=>u.id),ci:c.i});speak(2);FXH.ping(c.x,c.y,24);return true;}
       if(inf.length)return true;}}
    const fi=fieldAt(w);if(fi>=0&&units.some(u=>u.kind==='harv')){doAct({t:'fld',ids,fi});const rest=units.filter(u=>u.kind!=='harv').map(u=>u.id);if(rest.length)doAct({t:'go',ids:rest,x:w.x,y:w.y,mode:'move'});return true;}
    doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0,q:G.qShift?1:0});speak(1);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:G.qShift?0xe3b341:0x74d08f});return true;
}
// Controls (mouse): LEFT selects - click a unit or building, drag a box, double-click for all of a type, click empty
// ground to deselect; with a building or power chosen the left click places or aims it. RIGHT gives orders - move to
// the spot, attack the enemy under the cursor, board/enter/garrison/capture, or set a rally point for a selected
// building; right-click also cancels a pending placement. Touch and pen have no right button, so a tap there still
// selects or orders as before. Esc cancels.
let lastR={t:0,id:0},rDown=0;
function selectClick(t,shift){if(t&&t.team===ME){if(shift&&!t.isB){const i=G.sel.indexOf(t);i>=0?G.sel.splice(i,1):G.sel.push(t);}else G.sel=[t];}else if(t&&!shift)G.sel=[t];else if(!shift)G.sel=[];}
const CUR=(svg,x,y,fb)=>`url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fb}`;
const CURS={attack:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><g fill="none" stroke="#000" stroke-width="4"><circle cx="14" cy="14" r="8"/><path d="M14 1v7M14 20v7M1 14h7M20 14h7"/></g><g fill="none" stroke="#ff4a3a" stroke-width="2"><circle cx="14" cy="14" r="8"/><path d="M14 1v7M14 20v7M1 14h7M20 14h7"/></g></svg>',14,14,'crosshair'),
  move:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M13 2l7 9h-4v6h-6v-6H6z" fill="#7be08f" stroke="#0b1a10" stroke-width="1.5"/><ellipse cx="13" cy="22" rx="8" ry="2.6" fill="none" stroke="#7be08f" stroke-width="1.6"/></svg>',13,22,'pointer'),
  enter:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M5 13l9-8 9 8v11H5z" fill="#6fb2ff" stroke="#08121e" stroke-width="1.6"/><path d="M11 24v-7h6v7" fill="#08121e"/></svg>',14,14,'pointer'),
  capture:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M6 24V3" stroke="#111" stroke-width="3"/><path d="M6 24V3" stroke="#ffd166" stroke-width="1.6"/><path d="M7 4h13l-3 4 3 4H7z" fill="#ffd166" stroke="#111"/></svg>',6,24,'pointer'),
  sel:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M3 3h6M3 3v6M23 3h-6M23 3v6M3 23h6M3 23v-6M23 23h-6M23 23v-6" stroke="#000" stroke-width="3.4"/><path d="M3 3h6M3 3v6M23 3h-6M23 3v6M3 23h6M3 23v-6M23 23h-6M23 23v-6" stroke="#cfead6" stroke-width="1.6"/></svg>',13,13,'pointer')};
setInterval(()=>{try{if(!G||G.over||!mouse.in){cv.style.cursor='';return;}if(G.amove||G.defm||G.aim){cv.style.cursor=G.amove?CURS.attack:'crosshair';return;}if(G.place){cv.style.cursor='copy';return;}
  const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead),t=pickAt(mouse.x,mouse.y,false);
  if(!units.length){cv.style.cursor=t&&t.team===ME?CURS.sel:'';return;}
  if(t&&!ally(t.team,ME))cv.style.cursor=t.aband&&units.some(u=>isInf(u.s))?CURS.capture:CURS.attack;
  else if(t&&t.team===ME&&((t.kind==='tunnel'&&t.isB)||(t.s&&t.s.cap&&!t.isB)||t.kind==='garrison'))cv.style.cursor=CURS.enter;
  else if(t&&t.team===ME)cv.style.cursor=CURS.sel;
  else{const c=units.some(u=>canGarrison(u))?civUnder(mouse.x,mouse.y,null):null;cv.style.cursor=c&&!c.dead?CURS.enter:CURS.move;}}catch(_){}},120);
function defendAt(w){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);G.defm=false;if(!ids.length)return;doAct({t:'def',ids,x:w.x,y:w.y});speak(1);PINGS.push({x:w.x,y:w.y,r:300,t:0,d:1.1,c:0x6fb2ff});pushLog('Units moving to defend the area.');}
function rightPress(e){const w=screenToWorld(mouse.x,mouse.y);if(!w)return false;rDown=performance.now();if(G.defm){defendAt(w);return false;}
  if(G.place||G.aim){G.place=null;G.aim=null;return false;}
  if(G.amove){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return false;}
  return true;}
function orderClick(sh){if(!G||G.over)return;G.qShift=!!sh;const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place||G.aim){G.place=null;G.aim=null;updateUI();return;}if(G.defm){defendAt(w);return;}
  const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);
  if(G.amove&&units.length){const ids=units.filter(u=>u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return;}
  G.amove=false;const bsel=!units.length&&G.sel.some(b=>b.isB&&b.team===ME);if(!units.length&&!bsel)return;
  const t=pickAt(mouse.x,mouse.y,false);if(issueCmd(w,t,bsel))updateUI();}
function rightRelease(d){if(!G)return;
  if(d.box){const x0=Math.min(d.x0,mouse.x),x1=Math.max(d.x0,mouse.x),y0=Math.min(d.y0,mouse.y),y1=Math.max(d.y0,mouse.y);
    const got=G.ents.filter(u=>u.team===ME&&!u.isB&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u)+4,u.y);return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;})());G.sel=d.shift?[...new Set([...G.sel,...got])]:got;}
  else{const t=pickAt(mouse.x,mouse.y,false),now=performance.now();
    if(t&&t.team===ME&&!t.isB&&SET.dbl>0&&lastR.id===t.id&&now-lastR.t<SET.dbl){G.sel=G.ents.filter(u=>u.team===ME&&u.kind===t.kind&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u),u.y);return p.x>0&&p.y>0&&p.x<VW&&p.y<VH;})());lastR={t:0,id:0};updateUI();return;}
    lastR={t:now,id:t?t.id:0};
    const mine=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead),bsel=!mine&&G.sel.some(b=>b.isB&&b.team===ME);
    const dzHelp=t&&t.team===ME&&t.isB&&((t.built<1&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME&&!u.dead))||(t.kind==='tunnel'&&t.built>=1&&G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&u.s.dom==='ground')))||(t&&t.team===ME&&!t.isB&&t.s&&t.s.cap&&G.sel.some(u=>u!==t&&!u.isB&&canBoard(t,u)))||(t&&t.kind==='garrison'&&t.team===ME&&G.sel.some(u=>u.team===ME&&canGarrison(u)));
    if(d.pt!=='mouse'&&(mine||bsel)&&!d.shift&&(!(t&&t.team===ME)||dzHelp)){const w=screenToWorld(mouse.x,mouse.y);if(w&&issueCmd(w,t,bsel)){updateUI();return;}}
    selectClick(t,d.shift);}
  if(G.sel.some(u=>!u.isB&&u.team===ME))speak(0);else if(G.sel.length)sfxUI(660);updateUI();}
let mpan=null,RDRAG=null;cv.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});cv.addEventListener('pointerdown',e=>{if(!G||G.over)return;mpos(e);if(e.button===1&&SET.mpan){e.preventDefault();mpan={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(e.button===2){e.preventDefault();const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);const w0=screenToWorld(mouse.x,mouse.y);if(own.length>=2&&w0&&!G.place&&!G.aim&&!G.defm){RDRAG={x0:mouse.x,y0:mouse.y,w0,id:e.pointerId,shift:e.shiftKey,am:G.amove,moved:false};try{cv.setPointerCapture(e.pointerId);}catch(_){}}else orderClick(e.shiftKey);return;}if(e.button!==0){e.preventDefault();return;}
  const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place){const m=validSpot(ME,G.place,w.x,w.y);if(m){const dz=G.sel.find(u=>u.kind==='dozer'&&u.team===ME&&!u.dead);doAct({t:'bld',k:G.place,x:w.x,y:w.y,dz:dz?dz.id:0});speak(1);if(!e.shiftKey)G.place=null;}else pushLog(validSpot.why||'Cannot build there.','w');return;}
  if(G.aim){if(G.aim==='sup')doAct({t:'sup',x:w.x,y:w.y});else doAct({t:'pow',k:G.aim,x:w.x,y:w.y});G.aim=null;return;}
  if(!rightPress(e))return;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  drag={x0:mouse.x,y0:mouse.y,box:false,shift:e.shiftKey,id:e.pointerId,pt:e.pointerType||'mouse'};});
cv.addEventListener('pointermove',e=>{mpos(e);if(RDRAG&&e.pointerId===RDRAG.id){if(Math.hypot(mouse.x-RDRAG.x0,mouse.y-RDRAG.y0)>22)RDRAG.moved=true;return;}if(mpan&&e.pointerId===mpan.id){const k=cam.dist/700*(SET.scr||100)/100;cam.x-=(e.clientX-mpan.x)*k;cam.y-=(e.clientY-mpan.y)*k*1.4;mpan.x=e.clientX;mpan.y=e.clientY;return;}if(drag&&Math.hypot(mouse.x-drag.x0,mouse.y-drag.y0)>(SET.tol||8))drag.box=true;});
window.addEventListener('pointerup',e=>{if(mpan&&e.pointerId===mpan.id){mpan=null;return;}if(RDRAG&&e.pointerId===RDRAG.id){const r=RDRAG;RDRAG=null;const w1=screenToWorld(mouse.x,mouse.y);const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(r.moved&&w1&&ids.length){doAct({t:'line',ids,x:r.w0.x,y:r.w0.y,x2:w1.x,y2:w1.y,mode:r.am?'amove':'move'});G.amove=false;speak(1);PINGS.push({x:(r.w0.x+w1.x)/2,y:(r.w0.y+w1.y)/2,r:16,t:0,d:.4,c:0x74d08f});updateUI();}else orderClick(r.shift);return;}if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;rightRelease(d);});
window.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id)drag=null;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;if(!G||$('menu').hidden===false)return;
  if(/^Digit[1-5]$/.test(e.code)){const i=+e.code.slice(5);if(e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();sqAssign(i);}else sqSelect(i);}
  if(k==='p'&&!G.over){e.preventDefault();togglePause();return;}
  if(k==='Escape'){if(G.defm){G.defm=false;return;}if(G.paused){togglePause(false);return;}if(!G.place&&!G.aim&&!G.amove&&!G.sel.length&&!G.over){togglePause(true);return;}if(!G.place&&!G.aim&&!G.amove)G.sel=[];G.place=null;G.aim=null;G.amove=false;}
  if(k==='q')G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!['harv','hacker','dozer'].includes(u.kind)&&!u.dead);
  if(k==='f'&&G.sel.some(u=>!u.isB)){G.amove=true;G.defm=false;}if(k==='g'&&G.sel.some(u=>!u.isB&&u.team===ME)){G.defm=true;G.amove=false;}
  if(k==='x'){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length)doAct({t:'stop',ids});}
  if(k==='r'&&!e.ctrlKey&&!e.metaKey){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length){doAct({t:'ret',ids});speak(2);}}
  if(k==='h'){const hq=G.ents.find(b=>b.team===ME&&b.kind==='hq');if(hq)centerOn(hq.x,hq.y);}
  if(k==='='||k==='+'){camTarget();cam.td=Math.max(200,cam.td/1.15);}if(k==='-'||k==='_'){camTarget();cam.td=Math.min(1800,cam.td*1.15);}
  if(k.startsWith('Arrow')||k===' ')e.preventDefault();updateUI();});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
function mmJump(e){const r=mm.getBoundingClientRect();centerOn((e.clientX-r.left)/r.width*MAPW,(e.clientY-r.top)/r.height*MAPH);}
// Minimap: left-click / tap / drag moves the view there; right-click sends the selected units there.
// Pointer events so it works the same with a mouse, trackpad, touch screen or pen.
let mmDown=null;mm.style.touchAction='none';mm.style.cursor='crosshair';
function mmWorld(e){const r=mm.getBoundingClientRect();return{x:Math.max(0,Math.min(MAPW,(e.clientX-r.left)/r.width*MAPW)),y:Math.max(0,Math.min(MAPH,(e.clientY-r.top)/r.height*MAPH))};}
mm.addEventListener('pointerdown',e=>{if(!G)return;e.preventDefault();const w=mmWorld(e);
  if(e.button===2){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(ids.length){doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0});speak(1);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0x74d08f});}return;}
  if(e.button!==0)return;mmDown=e.pointerId;try{mm.setPointerCapture(e.pointerId);}catch(_){}centerOn(w.x,w.y);});
mm.addEventListener('pointermove',e=>{if(mmDown!==e.pointerId)return;const w=mmWorld(e);centerOn(w.x,w.y);});
mm.addEventListener('pointerup',e=>{if(mmDown===e.pointerId)mmDown=null;});mm.addEventListener('pointercancel',()=>{mmDown=null;});
mm.addEventListener('contextmenu',e=>e.preventDefault());
function scroll(dt){camTarget();const sp=cam.td*1.1*dt*(SET.scr||100)/100;if(keys.ArrowLeft||keys.a)cam.tx-=sp;if(keys.ArrowRight||keys.d)cam.tx+=sp;if(keys.ArrowUp||keys.w)cam.ty-=sp;if(keys.ArrowDown||keys.s)cam.ty+=sp;
  if(mouse.in&&!drag&&SET.edge){if(mouse.x<14)cam.tx-=sp;if(mouse.x>VW-14)cam.tx+=sp;if(mouse.y<14)cam.ty-=sp;if(mouse.y>VH-14)cam.ty+=sp;}cam.tx=Math.max(0,Math.min(MAPW,cam.tx));cam.ty=Math.max(0,Math.min(MAPH,cam.ty));camTick(dt);}

/* ---------- game start / reset ---------- */
function resetScene(){if(typeof WRECKQ!=="undefined")WRECKQ.length=0;for(const [,o] of OBJ)SCN.remove(o);OBJ.clear();for(const b of BODIES)SCN.remove(b.o);BODIES.length=0;for(const a of [WRECKS,MARKERS,PLANES])for(const x of a){for(const k of ['o','ring','disc','mis'])if(x[k])SCN.remove(x[k]);}WRECKS.length=MARKERS.length=PLANES.length=0;
  for(const p of PINGS)if(p.m)SCN.remove(p.m);PINGS.length=0;PARTS.length=0;TRACERS.length=0;VPROJ.length=0;for(const r of RINGS)SCN.remove(r);RINGS=[];if(GHOST){SCN.remove(GHOST);GHOST=null;GHOSTK=null;}if(RALLY){SCN.remove(RALLY);RALLY=null;}for(const l of LIGHTS)l.intensity=0;}
function afterStart(){setTimeout(()=>{if(!MODELS.ready&&typeof pushLog==='function')pushLog('Detailed 3D models could not load on this device ('+(MODELS.err||'unknown')+'). Showing simple shapes.','bad');},500);setTimeout(()=>{if(!MODELS.ready&&typeof pushLog==='function')pushLog('Detailed 3D models could not load on this device ('+(MODELS.err||'unknown')+'). Showing simple shapes.','bad');},500);initAudio();startMusic(G.teams[ME].fac);try{voLoad(G.teams[ME].fac);}catch(_){}if(!R3){try{initGfx();}catch(err){R3=null;$('mpstatus').textContent='';$('menu').hidden=false;$('games').innerHTML='<div class="empty">This browser could not start 3D graphics (WebGL). Try another browser or turn on hardware acceleration.</div>';G=null;return;}}else resetScene();buildWorld();resize();const [bx,by]=BASES[ME];{const fa=Math.atan2(MAPH/2-by,MAPW/2-bx);centerOn(bx+Math.cos(fa)*200,by+Math.sin(fa)*160);}cam.dist=430;try{warmShaders();}catch(e){console.warn('warm-up',e);}buildPanels();$('menu').hidden=true;$('end').hidden=true;
  pushLog(`${G.teams[ME].F.name} forces deployed. Select your Construction Vehicle, then build a Barracks, then send infantry or vehicles to capture oil derricks.`,'g');}
function startSingle(){if(!MODELS.ready&&MODELS.loading&&!startSingle.w){startSingle.w=1;$('start').textContent='Loading 3D models…';MODELS.loading.then(()=>{startSingle.w=0;$('start').textContent='Deploy vs AI';startSingle();});return;}MODE='single';ME=0;const facs=rollAis();if(new Set(setup.tm).size<2)setup.tm=facs.map((_,i)=>i);newGame({seed:setup.seed||((Math.random()*1e9)|0),facs,ai:facs.map((_,i)=>i>0),map:setup.map,tm:setup.tm.slice(),bs:setup.bs,slot:setup.slot==null?-1:setup.slot});afterStart();}
// Test Range: you against a passive target enemy on a 2-player map, with unlimited money and everything unlocked
function startSandbox(){if(!MODELS.ready&&MODELS.loading){MODELS.loading.then(startSandbox);return;}MODE='single';ME=0;const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US';
  newGame({seed:setup.seed||((Math.random()*1e9)|0),facs:[setup.p,setup.a&&setup.a!==setup.p?setup.a:en],ai:[false,false],map:setup.map,tm:[0,1],bs:1,slot:setup.slot==null?-1:setup.slot,sandbox:true});afterStart();}
function startMP(mode,seed,facs,slot,map,tm){if(!MODELS.ready&&MODELS.loading){MODELS.loading.then(()=>startMP(mode,seed,facs,slot,map,tm));return;}NET.lastSnapT=0;NET.sc={};NET.kf={};NET.kt={};NET.cseq={};NET.cseqSlot=[];NET.ckAk=null;NET.ia=0;NET.rxW=0;NET.prevT=0;MODE=mode;ME=slot|0;newGame({seed,facs,ai:facs.map(()=>false),map,tm});afterStart();$('mpstatus').textContent='';}

/* ---------- menu ---------- */
function facCards(){const el=$('pickP');el.innerHTML='';for(const k of FKEYS){const F=FACTIONS[k],b=document.createElement('button');b.className='fac'+(setup.p===k?' on':'');
    const sp=`Special: ${stats(k,F.special).name}`;b.innerHTML=`<span class="ins" style="background:${F.color}">${({RS:"MS",DW:"CS"})[k]||k}</span><span><div class="nm"></div><div class="dc"></div><div class="full"></div><div class="sp"></div><div class="sw"></div></span>`;
    b.querySelector('.nm').textContent=F.name;if(k==='RS'||k==='DW'){const ins=b.querySelector('.ins');ins.textContent='';const ec=emblemCanvas(k,38);ec.style.width='38px';ec.style.height='38px';ins.append(ec);}b.querySelector('.dc').textContent=F.docShort||F.doctrine;b.querySelector('.full').textContent=F.doctrine;b.title=F.doctrine;b.querySelector('.sp').textContent=sp+' · '+UPG[F.fup].name;b.querySelector('.sw').textContent='Strike: '+F.sup.name;b.onclick=()=>{setup.p=k;{const hm=MAP_KEYS.find(m=>(MAPS[m].home||[]).includes(k));if(hm&&$('mapSel')&&setup.map!==hm){$('mapSel').value=hm;$('mapSel').onchange();}}facCards();renderTeams();if(NET.code&&NET.code!=='join'&&NET.room)NET.room.presence({g:{c:NET.code,f:k,s:'open'}}).catch(()=>{});};el.append(b);}}
const PREV={};
// Draw start-slot markers on the preview: your chosen slot in gold with YOU, the slots the AIs will take in red, unused ones dim.
function prevMarks(){const cv=$('mapCv'),k=setup.map,P=PREV[k];if(!cv||!P)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.putImageData(P.img,0,0);
  const n=Math.min((setup.n||1)+1,P.sl.length),pick=setup.slot==null?-1:setup.slot,used=slotOrder(MAPS[k],n,pick);c.textAlign='center';c.textBaseline='middle';
  P.sl.forEach(([x,y],i)=>{const X=x/MAPW*W,Y=y/MAPH*H,u=used.indexOf(i),me=pick>=0?i===pick:false;const r=me?11:9;
    c.globalAlpha=u<0?.55:1;c.fillStyle='rgba(8,10,9,.78)';c.beginPath();c.arc(X,Y,r,0,7);c.fill();c.lineWidth=2;c.strokeStyle=me?'#e3b341':u>0?'#ea5a40':u===0?'#e3b341':'rgba(220,220,220,.5)';c.stroke();
    c.font='bold 12px sans-serif';c.fillStyle=me?'#e3b341':'#eee';c.fillText(i+1,X,Y+.5);
    if(me){c.font='bold 10px sans-serif';const tw=c.measureText('YOU').width+8;c.fillStyle='#e3b341';c.fillRect(X-tw/2,Y-r-15,tw,12);c.fillStyle='#111';c.fillText('YOU',X,Y-r-8.5);}c.globalAlpha=1;});
  const note=$('slotNote');if(note)note.textContent=pick>=0?`You start at position ${pick+1}. Click another number to move, or click empty ground for a random start.`:'Click a numbered position on the map to choose where you start (random if none).';}
function mapPreview(k,cv){const c=cv.getContext('2d'),W=cv.width,H=cv.height;const old=srand;const M=(()=>{const keepB=BASES,keepS=BASE_SLOTS;setBases(MAPS[k].max,k);const m=mkMap(4242,k);const sl=BASES.slice();BASES=keepB;BASE_SLOTS=keepS;return{m,sl};})();srand=old;
  const id=c.createImageData(W,H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const wx=(i+.5)/W*MAPW,wy=(j+.5)/H*MAPH,e=M.m.edge(wx,wy),mt=M.m.mtn(wx,wy),q=(j*W+i)*4,sn=M.m.theme==='snow';const v=e>0?(sn?[150,180,196]:[44,92,102]):mt>0?(mt>(sn?20:75)?[236,240,246]:sn?[150,156,166]:[112,102,90]):e>-30?(sn?[220,226,234]:[201,174,124]):(sn?[206,214,224]:[168,130,90]);id.data.set([...v,255],q);}c.putImageData(id,0,0);
  c.fillStyle='#8a7b63';for(const b of M.m.bridges){c.save();c.translate(b.x/MAPW*W,b.y/MAPH*H);c.rotate(Math.atan2(b.n[1]*H/MAPH,b.n[0]*W/MAPW));c.fillRect(-b.h/MAPW*W,-1,b.h*2/MAPW*W,2);c.restore();}
  PREV[k]={img:c.getImageData(0,0,W,H),sl:M.sl};prevMarks();
  let wa=0,mo=0;for(let q=0;q<id.data.length;q+=4){const r=id.data[q],g=id.data[q+1],b=id.data[q+2];if(b>r+20&&g<200||r===150&&g===180)wa++;else if(r===112&&g===102||r===236&&g===240||r===150&&g===156)mo++;}const n=W*H;
  return{water:wa/n,mtn:mo/n,bridges:M.m.bridges.length};}
function syncAiN(){const mx=(MAPS[setup.map]||MAPS.strait).max-1;if($('aiN'))$('aiN').querySelectorAll('button').forEach(b=>{b.disabled=+b.dataset.n>mx;});if(setup.n>mx){setup.n=[1,2,3,5,7].filter(v=>v<=mx).pop();$('aiN').querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.n===setup.n));$('start').textContent=setup.n>1?`Deploy vs ${setup.n} AI`:'Deploy vs AI';}}
function mapCards(){const el=$('pickMap');if(!el)return;if(!setup.map)setup.map=(typeof SET!=='undefined'&&SET.map&&MAPS[SET.map])?SET.map:'strait';el.className='';el.innerHTML='';const box=document.createElement('div');box.className='mapsel';
  const cv=document.createElement('canvas');cv.id='mapCv';cv.width=384;cv.height=264;cv.setAttribute('aria-label','Map preview: click a numbered position to choose your start');cv.onclick=e=>{const P=PREV[setup.map];if(!P)return;const r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*MAPW,my=(e.clientY-r.top)/r.height*MAPH;let best=-1,bd=1e9;P.sl.forEach(([x,y],i)=>{const d=Math.hypot(x-mx,y-my);if(d<bd){bd=d;best=i;}});setup.slot=bd<MAPW*.09?best:-1;try{sfxUI(700);}catch(_){}prevMarks();};const right=document.createElement('div');const sel=document.createElement('select');sel.id='mapSel';sel.setAttribute('aria-label','Battlefield');
  for(const k of MAP_KEYS){const o=document.createElement('option');o.value=k;const hm=(MAPS[k].home||[]).map(f=>FACTIONS[f]&&FACTIONS[f].name).filter(Boolean);o.textContent=`${MAPS[k].name}${hm.length?' · home of '+hm.join(' & '):''} (${MAPS[k].min}–${MAPS[k].max} players)`;sel.append(o);}sel.value=setup.map;
  const pl=document.createElement('div');pl.className='pl';const dc=document.createElement('div');dc.className='dc';const sn=document.createElement('div');sn.className='dc';sn.id='slotNote';right.append(sel,pl,dc,sn);box.append(cv,right);el.append(box);
  const show=()=>{const D=MAPS[setup.map];const base=`${D.min}–${D.max} players`+(D.theme==='snow'?' · snow & ice':'');pl.textContent=base;dc.textContent=D.desc;
    setTimeout(()=>{try{const r=mapPreview(setup.map,cv);if(r){const t=[base];if(r.water>.28)t.push('naval-heavy');else if(r.water>.06)t.push('rivers & coast');else t.push('open land');if(r.mtn>.05)t.push('mountain passes');if(r.bridges)t.push(r.bridges+(r.bridges>1?' bridges':' bridge'));pl.textContent=t.join(' · ');}}catch(e){}},20);};
  const rb=document.createElement('button');rb.type='button';rb.className='rndmap';rb.textContent='Random battlefield';rb.onclick=()=>{const need=(setup.n||1)+1;const ks=MAP_KEYS.filter(k=>k!==setup.map&&MAPS[k].max>=Math.min(need,8));const k=ks[Math.floor(Math.random()*ks.length)]||setup.map;sel.value=k;sel.onchange();};right.insertBefore(rb,pl);
  sel.onchange=()=>{setup.map=sel.value;setup.slot=-1;try{SET.map=setup.map;saveSet();}catch(e){}show();syncAiN();renderTeams();if(typeof renderLobby==='function')renderLobby();};show();syncAiN();}
// Skirmish roster: you, the main opponent and the other AIs (rolled once so you can see who they are), each with a team.
function rollAis(){const n=Math.max(1,Math.min((MAPS[setup.map]||MAPS.strait).max-1,setup.n||1));const facs=[setup.p,setup.a];const pool=FKEYS.filter(k=>!facs.includes(k)&&!(setup.others||[]).includes(k));
  setup.others=(setup.others||[]).filter(k=>!facs.includes(k)).slice(0,n-1);while(setup.others.length<n-1){const k=pool.splice(Math.floor(Math.random()*pool.length),1)[0]||FKEYS[setup.others.length%FKEYS.length];setup.others.push(k);}
  const tm=(setup.tm||[]).slice(0,n+1);while(tm.length<n+1)tm.push(tm.length);setup.tm=tm;return[...facs,...setup.others];}
function renderTeams(){const el=$('teamList');if(!el)return;const facs=rollAis();el.innerHTML='';const N=facs.length;
  facs.forEach((f,i)=>{const row=document.createElement('div');row.className='trow';const nm=document.createElement('span');nm.textContent=(i===0?'You · ':`AI ${i} · `)+FACTIONS[f].name;
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm.textContent);for(let t=0;t<Math.max(2,N);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=setup.tm[i];
    s.onchange=()=>{setup.tm[i]=+s.value;checkTeams();};row.append(nm,s);el.append(row);});checkTeams();}
function checkTeams(){const ok=new Set(setup.tm).size>1;const b=$('start');if(!b)return;b.disabled=!ok;b.title=ok?'':'Put at least one player on a different team.';}
mapCards();
facCards();const sel=$('aiFac');for(const k of FKEYS){const o=document.createElement('option');o.value=k;o.textContent=FACTIONS[k].name;sel.append(o);}sel.value=setup.a;setTimeout(renderTeams,0);sel.onchange=()=>{setup.a=sel.value;renderTeams();};if($('aiN'))$('aiN').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.n=+b.dataset.n;setTimeout(prevMarks,0);$('aiN').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('start').textContent=setup.n>1?`Deploy vs ${setup.n} AI`:'Deploy vs AI';renderTeams();});if($('watch'))$('watch').onclick=()=>{$('end').hidden=true;};
if($('wx'))$('wx').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.w=+b.dataset.w;$('wx').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));});
$('diff').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.d=+b.dataset.d;$('diff').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));});
$('start').onclick=()=>{initAudio();startSingle();};if($('sandbox'))$('sandbox').onclick=()=>{initAudio();startSandbox();};$('host').onclick=()=>{initAudio();hostGame();};
{const tk=$('sTrk');if(tk)for(const b of tk.querySelectorAll('button'))b.onclick=()=>{initAudio();setMyMode(b.dataset.v);myUI();if(G&&!G.over)myStart();};
  const f=$('myF');if(f)f.onchange=async()=>{initAudio();const n=await myAdd(f.files);f.value='';if(n){setMyMode('mine');if(G&&!G.over)myStart();}myUI();};
  if($('myNx'))$('myNx').onclick=()=>{initAudio();if(myMode()==='mine'&&MYM.list.length&&G&&!G.over)myNext();};if($('myCl'))$('myCl').onclick=async()=>{await myClear();setMyMode('score');if(G&&!G.over)myStart();myUI();};
  myList().then(l=>{MYM.list=l;myUI();});}
if(window.WW3_P2P&&$('relayBox')){$('relayBox').hidden=false;let r={};try{r=JSON.parse(localStorage.getItem('ww3_relay')||'{}')||{};}catch(e){}$('relayU').value=r.urls||'';$('relayN').value=r.username||'';$('relayP').value=r.credential||'';
  const sv=()=>{try{const u=$('relayU').value.trim();if(u)localStorage.setItem('ww3_relay',JSON.stringify({urls:u,username:$('relayN').value.trim(),credential:$('relayP').value}));else localStorage.removeItem('ww3_relay');$('relayS').textContent='Saved. Takes effect for the next game you host or join (reload the page).';}catch(e){}};for(const id of ['relayU','relayN','relayP'])$(id).onchange=sv;}
{const seg=(id,key,def)=>{const el=$(id);if(!el)return;let v=def;try{v=localStorage.getItem(key)||def;}catch(e){}const paint=()=>{for(const b of el.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===v);};paint();for(const b of el.querySelectorAll('button'))b.onclick=()=>{v=b.dataset.v;try{localStorage.setItem(key,v);}catch(e){}paint();QUAL.bad=QUAL.good=0;};};seg('sFpsT','ww3_fpsT','120');seg('sHideIp','ww3_hideip','0');seg('sFpsS','ww3_fpsShow','0');}
$('aMus').onclick=()=>{initAudio();AU.musicOn=!AU.musicOn;saveAudio();applyAudio();};$('aSfx').onclick=()=>{initAudio();AU.sfxOn=!AU.sfxOn;saveAudio();applyAudio();};$('aVoc').onclick=()=>{initAudio();AU.voiceOn=!AU.voiceOn;saveAudio();applyAudio();};$('cancelHost').onclick=cancelHost;
// settings panel (main menu and in game)
function applyGfx(){if(typeof QUAL==='undefined')return;if(SET.gfx==='auto'){QUAL.lock=0;}else{QUAL.lock=1;QUAL.lv={high:0,med:1,low:3}[SET.gfx]??0;}try{applyQual();}catch(e){}}
// One game speed for everyone, a little brisker than real time so battles keep moving.
const GSPD=1.2;
function syncSettings(){const segs=[['sGfx','gfx',String],['sHp','hp',String],['sEdge','edge',Number],['sTxt','txt',Number],['sInv','inv',Number],['sDbl','dbl',Number],['sTol','tol',Number],['sMmc','mmc',String],['sMpan','mpan',Number]];
  for(const [id,k,cv] of segs){const el=$(id);if(!el)continue;el.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',cv(b.dataset.v)===SET[k]);b.onclick=()=>{SET[k]=cv(b.dataset.v);saveSet();syncSettings();if(k==='gfx')applyGfx();};});}
  for(const [id,k] of [['sMus','mus'],['sFx','fx'],['sVo','vo'],['sScr','scr'],['sZm','zm']]){const el=$(id);if(!el)continue;el.value=SET[k];const out=$(id+'V');if(out)out.textContent=SET[k]+'%';el.oninput=()=>{SET[k]=+el.value;if(out)out.textContent=SET[k]+'%';saveSet();if(k!=='scr'&&k!=='zm')applyAudio();};}}
function openSettings(){try{myUI();}catch(e){}syncSettings();$('settings').hidden=false;}
if($('openSettings'))$('openSettings').onclick=openSettings;if($('aSet'))$('aSet').onclick=openSettings;if($('sDone'))$('sDone').onclick=()=>{$('settings').hidden=true;};
syncSettings();setTimeout(applyGfx,0);
// Pause and quit. Single player and skirmish vs AI pause the whole battle; in multiplayer the battle keeps running for
// everyone else, so the menu opens without stopping time and says so.
function togglePause(on){if(!G||G.over)return;const mp=MODE!=='single';if(on==null)on=!(G.paused||!$('pauseOv').hidden);
  if(on){if(!mp){G.paused=true;try{if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend();}catch(e){}try{if(window.speechSynthesis)speechSynthesis.pause();}catch(e){}}
    $('pauseSub').textContent=mp?'Multiplayer battles cannot be paused - the battle continues while this menu is open.':'The battle is on hold. Nothing moves until you resume. (P or Esc to resume)';$('resumeBtn').textContent=mp?'Back to battle':'Resume';$('pauseOv').hidden=false;}
  else{G.paused=false;$('pauseOv').hidden=true;try{if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();}catch(e){}try{if(window.speechSynthesis)speechSynthesis.resume();}catch(e){}last=performance.now();}
  $('aPause').textContent=G.paused?'▶ Resume':'❚❚ Pause';}
function askRestart(){if(!G)return;if(MODE!=='single'){pushLog('Multiplayer battles cannot be restarted - quit and host a new one.','w');return;}askQuit();G.restartAsk=true;$('quitOv').querySelector('h1').textContent='Restart this battle?';$('quitSub').textContent='The battle starts over with the same nations, map and settings.';$('quitYes').textContent='Restart';}
function askQuit(){if(!G)return;G.restartAsk=false;$('quitOv').querySelector('h1').textContent='Quit this battle?';$('quitYes').textContent='Quit to main menu';if(MODE==='single'&&!G.over&&!G.paused){G.paused=true;G.qPause=true;try{if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend();}catch(e){}}$('pauseOv').hidden=true;$('quitSub').textContent=MODE==='single'?"The battle will end and you'll return to the main menu.":'You will leave the multiplayer battle; your army will be left without a commander.';$('quitOv').hidden=false;}
function quitGame(){$('quitOv').hidden=true;$('pauseOv').hidden=true;$('end').hidden=true;try{if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();}catch(e){}try{if(window.speechSynthesis){speechSynthesis.cancel();}}catch(e){}
  if(G){G.over=true;G.paused=false;}$('aPause').textContent='❚❚ Pause';$('menu').hidden=false;if(MODE!=='single')leaveNet();MODE='single';ME=0;G=null;renderGames();}
$('aPause').onclick=()=>togglePause();$('aQuit').onclick=askQuit;$('resumeBtn').onclick=()=>togglePause(false);$('pQuit').onclick=askQuit;$('quitYes').onclick=()=>{const rs=G&&G.restartAsk;quitGame();if(rs){initAudio();startSingle();}};$('aRestart').onclick=askRestart;$('pRestart').onclick=askRestart;
$('quitNo').onclick=()=>{$('quitOv').hidden=true;if(G&&G.qPause){G.qPause=false;togglePause(false);}};
$('again').onclick=()=>{initAudio();startSingle();};$('change').onclick=()=>{$('end').hidden=true;$('menu').hidden=false;if(MODE!=='single')leaveNet();MODE='single';ME=0;G=null;renderGames();};

let last=performance.now();
// FPS and ping readout (Settings > Show FPS & ping)
let _fpsT=0;function fpsHud(){const now=performance.now();if(now-_fpsT<500)return;_fpsT=now;const el=$('fpsHud');if(!el)return;let on=false;try{on=localStorage.getItem('ww3_fpsShow')==='1';}catch(e){}el.hidden=!on||!G;if(el.hidden)return;
  el.textContent=Math.round(QUAL.fps)+' FPS'+(QUAL.lv?' · detail −'+QUAL.lv:'')+(MODE==='client'&&NET.ping?' · ping '+Math.round(NET.ping)+' ms':MODE==='host'&&NET.pings&&Object.keys(NET.pings).length?' · ping '+Object.values(NET.pings).map(v=>Math.round(v)).join('/')+' ms':'');}
function loop(now){if(window.__stopLoop)return;const _w0=performance.now();const rawDt=(now-last)/1000;const dt=Math.min(.05,rawDt);last=now;if(G&&!document.hidden&&rawDt<.5)qualTick(rawDt);
  try{if(G&&!G.over&&!G.paused){if(MODE==='client')clientTick(dt);else{const sd=dt*GSPD;if(sd>.06){simUpdate(sd/2);simUpdate(sd/2);}else simUpdate(sd);}G.uiT-=dt;if(G.uiT<=0){G.uiT=.2;updateUI();}}
    if(G)netTick(dt);
    if(G){scroll(dt);renderFrame(dt);}}catch(err){console.error(err);}
  QUAL.cost+=((performance.now()-_w0)/1000-QUAL.cost)*.05;fpsHud();
  requestAnimationFrame(loop);}
new ResizeObserver(()=>resize()).observe(cv);
requestAnimationFrame(loop);netInit();

function sbPanel(){const el=$('sbx');if(!el)return;el.hidden=!(G&&G.sandbox);if(el.hidden)return;const D=G.teams[1];const b=$('sbFight');if(b){b.textContent=D.fight?'Enemy fights back: ON':'Enemy fights back: OFF';b.classList.toggle('on',!!D.fight);}
  const n=G.ents.filter(e=>e.team===1&&!e.dead&&!e.isB).length;const c=$('sbCount');if(c)c.textContent=`${n} enemy target${n===1?'':'s'} left`;}
if($('sbTargets'))$('sbTargets').onclick=()=>{if(G&&G.sandbox){sandboxTargets();pushLog('New targets have arrived.','g');updateUI();}};
if($('sbFight'))$('sbFight').onclick=()=>{if(G&&G.sandbox){const D=G.teams[1];D.fight=!D.fight;updateUI();}};
if($('sbClear'))$('sbClear').onclick=()=>{if(G&&G.sandbox){for(const e of G.ents)if(e.team===1&&!e.isB&&!e.dead){e.dead=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),0,1]);}updateUI();}};

/* ================= AUDIO ENGINE: layered weapons, reverb, stereo, cinematic regional score ================= */
const AU={ctx:null,master:null,sfx:null,mus:null,rev:null,revIn:null,noise:null,musicOn:true,sfxOn:true,voiceOn:true,rate:{},style:null,next:0,step:0,timer:null,lastVoice:0,voices:[],heat:0,bar:0};
try{const v=JSON.parse(localStorage.getItem('ww3_audio')||'{}');if(v.m===false)AU.musicOn=false;if(v.s===false)AU.sfxOn=false;if(v.v===false)AU.voiceOn=false;}catch(e){}
function saveAudio(){try{localStorage.setItem('ww3_audio',JSON.stringify({m:AU.musicOn,s:AU.sfxOn,v:AU.voiceOn}));}catch(e){}}
function impulse(c,sec,decay){const n=c.sampleRate*sec,b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,decay)*(t<.003?t/.003:1);}}return b;}
function initAudio(){try{if(!AU.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=AU.ctx=new C();
    AU.master=c.createGain();AU.master.gain.value=.75;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;AU.master.connect(comp);comp.connect(c.destination);
    AU.rev=c.createConvolver();AU.rev.buffer=impulse(c,2.6,3.2);AU.revIn=c.createGain();AU.revIn.gain.value=.55;AU.revIn.connect(AU.rev);AU.rev.connect(AU.master);
    AU.sfx=c.createGain();AU.sfx.connect(AU.master);AU.sfxRev=c.createGain();AU.sfxRev.gain.value=.35;AU.sfx.connect(AU.sfxRev);AU.sfxRev.connect(AU.revIn);
    AU.mus=c.createGain();AU.mus.gain.value=.19;{const lo=c.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=110;lo.gain.value=3;const mid=c.createBiquadFilter();mid.type='peaking';mid.frequency.value=420;mid.Q.value=.8;mid.gain.value=-2.5;const hi=c.createBiquadFilter();hi.type='highshelf';hi.frequency.value=7000;hi.gain.value=2.5;const gl=c.createDynamicsCompressor();gl.threshold.value=-18;gl.ratio.value=2.5;gl.attack.value=.02;gl.release.value=.3;AU.mus.connect(lo);lo.connect(mid);mid.connect(hi);hi.connect(gl);gl.connect(AU.master);}AU.musRev=c.createGain();AU.musRev.gain.value=.6;AU.mus.connect(AU.musRev);AU.musRev.connect(AU.revIn);
    const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=b;
    const pb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),pd=pb.getChannelData(0);let l=0;for(let i=0;i<pd.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;pd[i]=l*3.5;}AU.brown=pb;}
  if(AU.ctx.state==='suspended')AU.ctx.resume();applyAudio();}catch(e){}
  try{if(window.speechSynthesis){AU.voices=speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>{AU.voices=speechSynthesis.getVoices();};
    if(!AU.spUnlock){AU.spUnlock=1;const u=new SpeechSynthesisUtterance(' ');u.volume=0;try{speechSynthesis.speak(u);}catch(e){}}}}catch(e){}}
function musBase(){return .19*(SET.mus/70);}
function applyAudio(){if(AU.ctx){AU.sfx.gain.value=AU.sfxOn?SET.fx/100:0;AU.mus.gain.value=AU.musicOn?musBase():0;}const set=(id,on,l)=>{const b=$(id);if(b){b.textContent=l+(on?' on':' off');b.classList.toggle('on',on);}};set('aMus',AU.musicOn,'Music');set('aSfx',AU.sfxOn,'Sound');set('aVoc',AU.voiceOn,'Voices');}
function spatial(x,y){if(!G||!CAM)return null;const d=Math.hypot(x-cam.x,y-cam.y),r=cam.dist*1.25;if(d>r*1.8)return null;const v=Math.max(0,1-d/(r*1.8))*Math.pow(900/cam.dist,.5);TMP.set(x,0,y).project(CAM);return{v,pan:Math.max(-1,Math.min(1,TMP.x*.8)),far:Math.min(1,d/(r*1.8))};}
function bus(sp){const c=AU.ctx,g=c.createGain();g.gain.value=sp.v;let n=g;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=sp.pan;g.connect(p);n=p;}const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=18000-sp.far*14000;n.connect(lp);lp.connect(AU.sfx);return g;}
function limit(k,n,win=.12){const t=AU.ctx.currentTime;const a=AU.rate[k]=(AU.rate[k]||[]).filter(v=>t-v<win);if(a.length>=n)return false;a.push(t);return true;}
function nz(dst,t,dur,type,f1,f2,gain,q=.8,src){const c=AU.ctx,s=c.createBufferSource();s.buffer=src||AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f1,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.004);g.gain.exponentialRampToValueAtTime(.0005,t+dur);s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
function osc(dst,t,type,f1,f2,dur,gain,att=.003){const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+att);g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);}
function sfxShot(x,y,s){if(!AU.ctx||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02)return;const t=AU.ctx.currentTime+Math.random()*.01;
  if(s<=5){if(!limit('gun',6))return;const b=bus(sp);const n=1+(Math.random()*3|0);for(let i=0;i<n;i++){const ti=t+i*.075;nz(b,ti,.05,'highpass',1600,0,.5,.7);nz(b,ti,.09,'bandpass',900+Math.random()*400,300,.35,1.2);osc(b,ti,'sine',190,70,.05,.25);}}
  else if(s<=8){if(!limit('msl',3))return;const b=bus(sp);nz(b,t,.08,'highpass',2500,0,.4);nz(b,t,.9,'bandpass',350,3200,.32,1.6);osc(b,t,'sawtooth',90,40,.5,.06);}
  else{if(!limit('can',3))return;const b=bus(sp);nz(b,t,.025,'highpass',3000,0,.8);osc(b,t,'sine',95,30,.55,.9);nz(b,t,.5,'lowpass',2200,180,.7,1);nz(b,t+.02,1.2,'lowpass',600,90,.25,.5,AU.brown);}}
function sfxBoom(x,y,s,big){if(!AU.ctx||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02||!limit('boom',big?3:4,.15))return;const t=AU.ctx.currentTime,k=Math.min(1,.3+s/40)*(big?1.3:1),d=Math.min(3,.6+s/22);const b=bus(sp);
  nz(b,t,.04,'highpass',2000,0,.9*k);osc(b,t,'sine',big?62:85,24,d*.9,1.1*k,.006);nz(b,t,d,'lowpass',big?1600:2400,120,.9*k,.7);nz(b,t+.03,d*1.4,'lowpass',500,60,.5*k,.5,AU.brown);
  for(let i=0;i<(big?14:6);i++){const ti=t+.08+Math.random()*d*.6;nz(b,ti,.03+Math.random()*.04,'bandpass',1500+Math.random()*3000,0,.12*k*Math.random(),3);}
  AU.heat=Math.min(1,AU.heat+(big?.25:.06));}
// Live drone engines for the nearest few drones on screen: the Shahed-style delta drones putter like a two-stroke
// moped engine, quadcopters whine; pitch climbs as they dive onto a target, volume and stereo follow the camera.
const DRS=new Map();let drT=0;
function droneAudio(dt){if(!AU.ctx||!G)return;drT-=dt;if(drT>0)return;drT=.1;const c=AU.ctx,now=c.currentTime;const on=AU.sfxOn&&!G.over;
  const cand=on?G.ents.filter(e=>e.kind==='drone'&&!e.dead&&(e.team===ME||e.vis)).map(e=>[e,Math.hypot(e.x-cam.x,e.y-cam.y)]).filter(([e,d])=>d<cam.dist*1.4).sort((a,b)=>a[1]-b[1]).slice(0,4):[];
  const keep=new Set(cand.map(([e])=>e.id));
  for(const [id,n] of DRS)if(!keep.has(id)){n.g.gain.setTargetAtTime(0,now,.08);for(const o of n.os)try{o.stop(now+.4);}catch(_){}DRS.delete(id);}
  for(const [e,d] of cand){let n=DRS.get(e.id);const delta=(FACTIONS[G.teams[e.team].fac]&&droneTypeA(G.teams[e.team].fac)==='delta');
    if(!n){const g=c.createGain();g.gain.value=0;const f=c.createBiquadFilter();const os=[];let pan=null;if(c.createStereoPanner){pan=c.createStereoPanner();g.connect(pan);pan.connect(AU.sfx);}else g.connect(AU.sfx);
      if(delta){f.type='lowpass';f.frequency.value=1500;f.Q.value=1.2;const am=c.createGain();am.gain.value=.5;const lfo=c.createOscillator();lfo.frequency.value=17+Math.random()*3;const lg=c.createGain();lg.gain.value=.45;lfo.connect(lg);lg.connect(am.gain);
        for(const [r,a] of [[1,1],[2,.55],[3.02,.25]]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=88*r;const og=c.createGain();og.gain.value=a;o.connect(og);og.connect(am);os.push(o);}am.connect(f);os.push(lfo);}
      else{f.type='bandpass';f.frequency.value=1100;f.Q.value=.9;for(let k=0;k<4;k++){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=255*(1+k*.017);const og=c.createGain();og.gain.value=.3;o.connect(og);og.connect(f);os.push(o);}}
      f.connect(g);for(const o of os)o.start(now);n={g,f,os,pan,delta,base:delta?88:255};DRS.set(e.id,n);}
    const R=cam.dist*1.4,v=Math.max(0,1-d/R)*Math.pow(700/cam.dist,.4)*(n.delta?.09:.06);n.g.gain.setTargetAtTime(v,now,.1);
    const t=e.target,td=t&&!t.dead?Math.hypot(t.x-e.x,t.y-e.y):1e9,dive=td<170?1+(1-td/170)*(n.delta?.18:.35):1;
    for(let k=0;k<n.os.length;k++){const o=n.os[k];if(o.type==='sawtooth'){const r=n.delta?[1,2,3.02][k]||1:(1+k*.017);o.frequency.setTargetAtTime(n.base*r*dive,now,.15);}}
    if(n.pan){TMP.set(e.x,0,e.y).project(CAM);n.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,TMP.x*.8)),now,.1);}}}
function droneTypeA(fac){return fac==='IR'||fac==='RS'?'delta':fac==='TR'?'kargu':'fpv';}
function sfxUI(f){if(!AU.ctx||!AU.sfxOn)return;const t=AU.ctx.currentTime;osc(AU.sfx,t,'sine',f||880,0,.07,.08);osc(AU.sfx,t+.05,'sine',(f||880)*1.5,0,.08,.05);}
function sfxAlarm(){if(!AU.ctx||!AU.sfxOn)return;const c=AU.ctx,t=c.currentTime;for(let i=0;i<5;i++){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(480,t+i*.6);o.frequency.linearRampToValueAtTime(900,t+i*.6+.5);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=2200;g.gain.setValueAtTime(.0001,t+i*.6);g.gain.linearRampToValueAtTime(.08,t+i*.6+.05);g.gain.linearRampToValueAtTime(0,t+i*.6+.55);o.connect(f);f.connect(g);g.connect(AU.sfx);o.start(t+i*.6);o.stop(t+i*.6+.6);}}
/* ---------- voices ---------- */
const PHR={
  en:[['Ready.','Awaiting orders.','Standing by.'],['Moving out.','On my way.','Roger that.'],['Engaging!','Target acquired.','Weapons free!'],['Unit ready.','Reporting for duty.'],['Our base is under attack!']],
  tr:[['Hazırım.','Emir bekliyorum.'],['Hareket ediyoruz.','Anlaşıldı.'],['Saldırıyoruz!','Hedef görüldü.'],['Birlik hazır.'],['Üssümüz saldırı altında!']],
  he:[['מוכן.','ממתין לפקודות.'],['זזים.','בדרך.'],['תוקפים!','מטרה זוהתה.'],['היחידה מוכנה.'],['הבסיס שלנו תחת מתקפה!']],
  fr:[['Prêt.','J’attends vos ordres.'],['En route.','Bien reçu.'],['À l’attaque !','Cible acquise.'],['Unité prête.'],['Notre base est attaquée !']],
  uk:[['Готовий.','Чекаю наказів.'],['Виконую.','Рухаємось.'],['Атакуємо!','Ціль бачу.'],['Підрозділ готовий.'],['Нашу базу атакують!']],
  ru:[['Готов.','Жду приказа.'],['Выдвигаемся.','Есть.'],['Атакуем!','Цель вижу.'],['Подразделение готово.'],['Нашу базу атакуют!']],
  fa:[['آماده‌ام.','منتظر دستورم.'],['حرکت می‌کنیم.','در راهم.'],['حمله!','هدف شناسایی شد.'],['یگان آماده است.'],['پایگاه ما زیر حمله است!']],
  ar:[['جاهز.','بانتظار الأوامر.'],['نتحرك.','في الطريق.'],['هجوم!','تم تحديد الهدف.'],['الوحدة جاهزة.'],['قاعدتنا تتعرض للهجوم!']],
  ur:[['تیار ہوں۔','حکم کا انتظار ہے۔'],['روانہ ہو رہے ہیں۔','راستے میں ہوں۔'],['حملہ!','ہدف نظر میں ہے۔'],['یونٹ تیار ہے۔'],['ہمارے اڈے پر حملہ ہو رہا ہے!']],
  hi:[['तैयार हूँ।','आदेश का इंतज़ार है।'],['आगे बढ़ रहे हैं।','रास्ते में हूँ।'],['हमला!','लक्ष्य मिल गया।'],['यूनिट तैयार है।'],['हमारे अड्डे पर हमला हो रहा है!']],
  zh:[['准备就绪。','等待命令。'],['出发。','正在前进。'],['开火！','发现目标。'],['部队就绪。'],['我们的基地正在遭受攻击！']],
  ko:[['준비 완료.','명령을 기다립니다.'],['이동합니다.','알겠습니다.'],['공격!','목표 확인.'],['부대 준비 완료.'],['기지가 공격받고 있습니다!']],
  es:[['Listo.','Esperando órdenes.'],['En marcha.','Entendido.'],['¡Al ataque!','Objetivo localizado.'],['Unidad lista.'],['¡Nuestra base está bajo ataque!']],
};
// Each nation's soldiers talk the way their army does: dialect and slang per nation where several share a language
// (select, move, attack, unit ready, base alarm). Used whenever a voice for that language is available.
const PHR_FAC={
  RS:[['جاهزين يا حاج.','شو الأوامر؟','نحنا حاضرين.'],['ماشيين.','عالطريق.','يلّا يا شباب.'],['يلّا عليهن!','شايفينه، ضربناه!','نار!'],['الشباب جاهزين.'],['ضربوا عالمركز! تعوا بسرعة!']],
  DW:[['حاضرين يا قائد.','جاهزين ذلحين.','قد احنا جاهزين.'],['حيّا بنا!','سِرنا.','ماشيين على بركة الله.'],['اضرب!','عليهم يا رجال!','قدّام!'],['الرجال جاهزين.'],['المعسكر تحت الضرب! الحقوا!']],
  SA:[['جاهزين طال عمرك.','أبشر.'],['تم، ماشين.','على هالخشم.'],['هجوم!','الهدف قدامنا!'],['الوحدة جاهزة يا طويل العمر.'],['القاعدة تنضرب!']],
  AE:[['جاهزين.','حاضرين.'],['تم، متحركين.','زين، ماشين.'],['هجوم!','الهدف واضح!'],['الوحدة جاهزة.'],['القاعدة عليها هجوم!']],
  EG:[['جاهزين يا فندم.','تمام يا فندم.'],['ماشيين.','حاضر يا فندم.'],['اضرب!','يلّا يا رجّالة!'],['الكتيبة جاهزة يا فندم.'],['القاعدة بتضرب يا فندم!']],
  IR:[['آماده‌ایم فرمانده.','در خدمتیم.'],['حرکت می‌کنیم.','چشم فرمانده.'],['آتش!','بزنیدشون!'],['یگان آماده‌ست.'],['قرارگاه زیر آتش است!']],
  KP:[['준비됐습니다, 동무!','명령만 내리십시오!'],['전진한다!','알았습니다!'],['쏴라!','놈들을 쳐부숴라!'],['부대 준비 완료!'],['기지가 공격당하고 있다!']],
  KR:[['준비 완료!','명령 대기 중!'],['이동!','알겠습니다!'],['사격 개시!','적 발견!'],['부대 준비 완료!'],['기지가 공격받고 있습니다!']],
  CU:[['¡Listos, compañero!','¡A la orden!'],['¡Vamos, asere!','¡Dale!'],['¡Fuego!','¡Pa’lante!'],['¡La unidad está lista!'],['¡Nos atacan la base, compañeros!']],
  US:[['Ready to roll.','Locked and loaded.','Standing by, sir.'],['Moving out!','Oscar Mike.','Roger that.'],['Engaging!','Weapons free!','Light ’em up!'],['Unit ready.','Reporting for duty.'],['Our base is under attack!']],
  RU:[['Готов.','Жду приказа, командир.'],['Выдвигаемся!','Так точно!'],['Огонь!','Цель вижу, работаем!'],['Подразделение готово.'],['База под огнём!']],
  UA:[['Готовий!','Чекаю наказу, командире.'],['Виконую!','Рухаємось!'],['Вогонь!','Бачу ціль, працюємо!'],['Підрозділ готовий.'],['Базу атакують!']],
  IL:[['מוכן.','ממתין לפקודה.'],['זזים!','בדרך.'],['אש!','מטרה זוהתה, תוקפים!'],['הכוח מוכן.'],['הבסיס תחת מתקפה!']],
  TR:[['Hazırız komutanım!','Emredin!'],['İleri!','Anlaşıldı!'],['Ateş!','Hedef görüldü, saldırıyoruz!'],['Birlik hazır!'],['Üs saldırı altında!']],
  EU:[['Prêt.','À vos ordres.'],['En avant !','Bien reçu.'],['Feu !','Cible acquise !'],['Unité prête.'],['La base est attaquée !']],
  PK:[['تیار ہیں سر!','حکم کریں!'],['آگے بڑھو!','جی سر!'],['فائر!','دشمن پر حملہ!'],['یونٹ تیار ہے!'],['بیس پر حملہ ہو رہا ہے!']],
  IN:[['तैयार हैं साहब!','हुक्म कीजिए!'],['आगे बढ़ो!','जी साहब!'],['फायर!','दुश्मन पर टूट पड़ो!'],['यूनिट तैयार है!'],['बेस पर हमला हो रहा है!']],
  CN:[['准备完毕！','请指示！'],['前进！','明白！'],['开火！','发现敌人，攻击！'],['部队就位！'],['基地遭到攻击！']]};
// When a browser has no voice for a language, a related voice reads the same words:
// Ukrainian text through a Russian voice; Urdu (spoken Hindustani) through a Hindi voice in Devanagari;
// Arabic, Persian, Hebrew and Turkish as phonetic spellings read by a Spanish/Italian voice, so the speech stays in the native language.
const PHR_ALT={
  uk:{v:['ru'],lines:null},
  ur:{v:['hi'],lines:[['तैयार हूँ।','हुक्म का इंतज़ार है।'],['रवाना हो रहे हैं।','रास्ते में हूँ।'],['हमला!','निशाना नज़र में है।'],['यूनिट तैयार है।'],['हमारे अड्डे पर हमला हो रहा है!']]},
  ar:{v:['fa','ur','es','it'],keep:['fa','ur'],lines:[['Yájiz.','Bintizár al-awámir.'],['Natajárrak.','Fi tarik.'],['¡Juyúm!','Tamma tajdíd al-jadaf.'],['Al-wajda yájiza.'],['¡Kaidatuna tataárrad lil-juyúm!']]},
  fa:{v:['es','it'],lines:[['Amadé-am.','Montazeré dastur-am.'],['Harakat mikoním.','Dar ráham.'],['¡Hamlé!','Hadaf shenasaí shod.'],['Yegán amadé ast.'],['¡Paygahé ma ziré hamlé ast!']]},
  he:{v:['es','it'],lines:[['Mujan.','Mamtín le-pkudót.'],['Zazím.','Ba-dérej.'],['¡Tokfím!','Matará zuhatá.'],['Ha-yejidá mujaná.'],['¡Ha-basís shelanu tájat mitkafá!']]},
  tr:{v:['es','it'],lines:[['Hazírum.','Emir bekliyorum.'],['Haréket ediyoruz.','Anlashíldi.'],['¡Saldíriyoruz!','Hedef guerduldú.'],['Birlik hazír.'],['¡Usumuz saldirí altindá!']]},
};
// Battle cries and salutes in each nation's own voice: [select, move, attack, unit ready, base alarm]. Mixed in
// with the ordinary acknowledgements. Native script for native voices; FCRY_ALT is a phonetic spelling for when the
// device lacks that voice (read by a Spanish/Italian voice); FCRY_EN is used when only English is available.
const FCRY={
  US:[['Hooah!','Semper Fi!'],['Let’s roll!','Oscar Mike.'],['Hooah! Weapons free!','Light ’em up!'],['Ready to roll, sir. Hooah!'],null],
  TR:[['Emret komutanım!','Vatan sana canım feda!'],['Bismillah, ilerliyoruz!'],['Allah Allah!','Şehitler ölmez, vatan bölünmez!'],['Ne mutlu Türküm diyene!'],null],
  IL:[['אחריי!'],['קדימה!'],['עם ישראל חי!','קדימה, הסתעעות!'],['עם ישראל חי!'],null],
  EU:[['Pour l’Europe !'],['En avant !'],['En avant, pour la liberté !','Vive l’Europe !'],['Prêts à défendre l’Europe !'],null],
  UA:[['Слава Україні!'],['Героям слава!'],['Слава Україні!','Ворог не пройде!'],['Слава Україні! Готові!'],null],
  RU:[['Служу России!'],['Вперёд!'],['Ура!','За Родину!'],['Служу России!'],null],
  IR:[['یا علی!','یا علی مدد!'],['به امید خدا!'],['لبیک یا حسین!','الله اکبر!','یا زهرا!'],['لبیک یا حسین!'],null],
  RS:[['يا علي!','لبيك يا حسين!'],['يا علي مدد!'],['لبيك يا حسين!','هيهات منا الذلة!','يا زهراء!'],['لبيك يا حسين!'],null],
  DW:[['يا علي!'],['بسم الله!'],['لبيك يا حسين!','يا آل البيت!','الله أكبر!'],['يا علي!'],null],
  SA:[['فداك يا وطن!'],['بسم الله!'],['الله أكبر!','للمجد والعلياء!'],['فداك يا وطن!'],null],
  AE:[['عيشي بلادي!'],['بسم الله!'],['الله أكبر!','فداك يا إمارات!'],['عيشي بلادي!'],null],
  EG:[['تحيا مصر!'],['يالله يا رجالة!'],['الله أكبر!','تحيا مصر!'],['تحيا مصر!'],null],
  PK:[['پاکستان زندہ باد!'],['بسم اللہ!'],['نعرہ تکبیر، اللہ اکبر!','حیدری!'],['پاکستان زندہ باد!'],null],
  IN:[['जय हिंद!'],['आगे बढ़ो!'],['भारत माता की जय!','आयो गोरखाली!'],['जय हिंद!'],null],
  CN:[['为人民服务！'],['听党指挥！'],['冲啊！','保卫祖国！'],['为人民服务！'],null],
  KP:[['위대한 수령님을 위하여!'],['결사옹위!'],['김정은 동지 만세!','조국을 위하여!'],['위대한 수령님을 위하여!'],null],
  KR:[['충성!'],['필승!'],['대한민국 만세!','필승!'],['충성! 준비 완료!'],null],
  CU:[['¡Patria o muerte!'],['¡Adelante!'],['¡Venceremos!','¡Hasta la victoria siempre!'],['¡Patria o muerte!'],null]};
const FCRY_ALT={
  TR:[['¡Emret komutaním!'],['¡Bismiláh!'],['¡Aláh, Aláh!','¡Vatan sana yaním fedá!'],['¡Ne mutlú Turkúm diyené!'],null],
  IL:[['¡Ajarái!'],['¡Kadimá!'],['¡Am Israél jai!','¡Kadimá, histaarút!'],['¡Am Israél jai!'],null],
  IR:[['¡Ya Alí!','¡Ya Alí madad!'],['¡Be omidé Jodá!'],['¡Labbéik ya Huséin!','¡Aláju akbar!','¡Ya Zahrá!'],['¡Labbéik ya Huséin!'],null],
  RS:[['¡Ya Alí!','¡Labbéik ya Huséin!'],['¡Ya Alí madad!'],['¡Labbéik ya Huséin!','¡Hayhát minná al-dhílla!','¡Ya Zahrá!'],['¡Labbéik ya Huséin!'],null],
  DW:[['¡Ya Alí!'],['¡Bismiláh!'],['¡Labbéik ya Huséin!','¡Ya al al-béit!','¡Aláju akbar!'],['¡Ya Alí!'],null],
  SA:[['¡Fidák ya watán!'],['¡Bismiláh!'],['¡Aláju akbar!','¡Lil-mayd wal-alyá!'],['¡Fidák ya watán!'],null],
  AE:[['¡Áishi biládi!'],['¡Bismiláh!'],['¡Aláju akbar!','¡Fidák ya Imarát!'],['¡Áishi biládi!'],null],
  PK:[['पाकिस्तान ज़िंदाबाद!'],null,['अल्लाहु अकबर!','हैदरी!'],null,null],
  EG:[['¡Tahia Masr!'],['¡Yalá ya riggála!'],['¡Aláju akbar!','¡Tahia Masr!'],['¡Tahia Masr!'],null]};
const FCRY_EN={TR:[['My life for the homeland!'],null,['Allah Allah!'],null,null],IL:[['Follow me!'],['Kadima!'],['Am Yisrael Chai!'],null,null],EU:[['For Europe!'],null,['Forward, for freedom!'],null,null],UA:[['Slava Ukraini!'],null,['Slava Ukraini! The enemy shall not pass!'],null,null],
  RU:[['I serve Russia!'],null,['Urraaah! For the Motherland!'],null,null],IR:[['Ya Ali!'],null,['Labbaik ya Hussein!','Allahu Akbar!'],['Labbaik ya Hussein!'],null],RS:[['Ya Ali!'],null,['Labbaik ya Hussein!','Hayhat minna al-dhilla!'],['Labbaik ya Hussein!'],null],
  DW:[['Ya Ali!'],null,['Labbaik ya Hussein!','Allahu Akbar!'],null,null],SA:[['For the homeland!'],null,['Allahu Akbar!'],null,null],AE:[['Long live my country!'],null,['Allahu Akbar!'],null,null],EG:[['Long live Egypt!'],null,['Allahu Akbar! Long live Egypt!'],null,null],
  PK:[['Pakistan Zindabad!'],null,['Nara-e-Takbeer, Allahu Akbar!','Haideri!'],null,null],IN:[['Jai Hind!'],null,['Bharat Mata ki Jai!','Ayo Gorkhali!'],null,null],CN:[['Serve the people!'],null,['Charge! Defend the motherland!'],null,null],
  KP:[['For the Great Leader!'],null,['Long live Comrade Kim Jong Un!','For the fatherland!'],['For the Great Leader!'],null],KR:[['Loyalty!'],null,['Pilseung! Certain victory!','Long live the Republic of Korea!'],null,null],CU:[['Patria o muerte!'],null,['Venceremos!'],null,null]};
const LANG_PREF={es:['es-US','es-MX','es-419','es-ES','es'],'ar-lb':['ar-lb','ar-sy','ar-sa','ar'],'ar-ye':['ar-ye','ar-sa','ar-eg','ar']};
// Prefer the most natural-sounding voice the device offers for the language: neural/"Natural" voices (Edge, Windows),
// Siri/Premium/Enhanced voices (Apple), then Google voices; avoid compact and eSpeak voices that sound robotic.
function voiceScore(v){const n=v.name||'';let s=0;if(/natural|neural/i.test(n))s+=60;if(/online/i.test(n))s+=40;if(/premium|enhanced|siri/i.test(n))s+=35;if(/google/i.test(n))s+=20;if(v.localService===false)s+=5;if(/espeak|compact|robot|novelty|bad news|zarvox|whisper|bells|cellos|organ|trinoids|albert|bahh|boing|bubbles|jester|superstar|wobble/i.test(n))s-=80;return s;}
// All unit voices are male. Browsers don't report a voice's gender, so known male voice names (Apple, Microsoft, Google,
// Android) are preferred, known female ones avoided, and anything left unknown is pitched down to sound like a man.
const MALE_V=/\bmale\b|david|\bmark\b|\bguy\b|ryan|christopher|\beric\b|andrew|brian|roger|steffan|davis|tony|jason|daniel|\balex\b|fred|aaron|arthur|gordon|rishi|oliver|thomas|george|james|liam|william|\btom\b|evan|nathan|reed|rocko|grandpa|eddy|maged|majed|hamed|shakir|naayf|omar|fahed|taim|rami|bassel|moaz|hamdan|jamal|saleh|hedi|farid|avri|asaf|ahmet|cem|henri|paul|claude|remy|jerome|ostap|dmitr|pavel|yuri|maxim|asad|salman|madhur|hemant|prabhat|yunxi|yunyang|kangkang|yunjian|yunze|injoon|hyunsu|bongjin|gookmin|jorge|juan|diego|alvaro|pablo|raul|gonzalo|manuel|tomas|enrique|carlos|alonso|gerardo|jose|liberto|emilio|andres|lorenzo|luca|cosimo|diego|benigno|giorgio|stefan|conrad|killian|hans|markus|antoine|mathieu|nicolas|xavier|ahmad|reza|dilan/i;
const FEMALE_V=/female|samantha|zira|susan|hazel|aria|jenny|michelle|karen|moira|tessa|fiona|victoria|allison|\bava\b|serena|kate|laila|mariam|zariyah|salma|hoda|amira|dilara|carmit|hila|amelie|denise|julie|audrey|aurelie|marie|celine|milena|irina|katya|svetlana|dariya|polina|lekha|kalpana|swara|heera|neerja|uzma|\bgul\b|xiaoxiao|tingting|huihui|yaoyao|meijia|sin-ji|yuna|sora|sunhi|heami|paulina|monica|elvira|laura|helena|sabina|dalia|\bsara\b|lucia|paloma|esperanza|alice|elsa|isabella|anna|katja|nora|zuzana|ioana|lana|yelda|emel|seda|dina|rana|zeina|leila|nour|shirin|layla|dorsa|joanna|nicky|catherine|emma|libby|sonia|natasha|clara|sofie|kalina/i;
const DEEP_V=/guy|davis|christopher|roger|\beric\b|tony|jason|fred|daniel|arthur|hamed|shakir|rami|bassel|farid|ahmet|henri|dmitr|ostap|madhur|yunyang|injoon|jorge|alvaro|gordon|thomas/i;
function voiceMale(v){const n=v.name||'';return MALE_V.test(n)&&!/female/i.test(n)?1:FEMALE_V.test(n)?-1:0;}
function pickVoice(vs,L){const low=L.toLowerCase(),base=low.split('-')[0];const norm=v=>(v.lang||'').replace('_','-').toLowerCase();
  const pref=(L==='es-CU'?LANG_PREF.es:LANG_PREF[low]||[low,base]).map(p=>p.toLowerCase());
  // a male voice in any accepted dialect beats a female one in the preferred dialect
  const all=[];for(let i=0;i<pref.length;i++){const p=pref[i];for(const x of vs)if((norm(x)===p||norm(x).startsWith(p+'-'))&&!all.includes(x))all.push(x);}
  const men=all.filter(x=>voiceMale(x)===1);if(!men.length)return null;return men.map((x,i)=>[x,(DEEP_V.test(x.name||'')?45:0)+voiceScore(x)-i*.01]).sort((a,b)=>b[1]-a[1])[0][0];}
// Recorded voice lines: one clip sheet per nation (vo/XX.mp3, generated offline with open neural voices and processed
// to sound deep and military), with the clip offsets below. Loaded on demand; device speech is the fallback.
const VO_MAP={"RS":{"l":[[[0.0,1.794],[1.914,1.04],[3.074,1.461]],[[4.655,0.614],[5.39,0.688],[6.198,1.216]],[[7.534,1.229],[8.883,1.344],[10.347,0.49]],[[10.957,1.764]],[[12.841,1.824]]],"c":[[[14.785,0.766],[15.671,1.272]],[[17.063,1.159]],[[18.342,1.316],[19.778,1.497],[21.395,0.869]],[[22.384,1.325]],[]]},"DW":{"l":[[[0.0,1.645],[1.764,1.572],[3.456,1.632]],[[5.209,0.723],[6.052,0.498],[6.67,2.31]],[[9.1,0.358],[9.577,1.424],[11.121,0.38]],[[11.621,1.552]],[[13.293,2.845]]],"c":[[[16.258,0.774]],[[17.152,0.987]],[[18.259,1.216],[19.595,1.191],[20.906,1.038]],[[22.064,0.708]],[]]},"SA":{"l":[[[0.0,1.771],[1.891,0.419]],[[2.43,1.087],[3.637,1.106]],[[4.863,0.582],[5.566,1.215]],[[6.901,2.573]],[[9.594,1.206]]],"c":[[[10.92,1.229]],[[12.269,0.932]],[[13.322,1.062],[14.504,1.183]],[[15.807,1.309]],[]]},"AE":{"l":[[[0.0,0.849],[0.969,0.834]],[[1.923,1.399],[3.442,1.111]],[[4.673,0.595],[5.388,1.254]],[[6.762,1.229]],[[8.111,2.072]]],"c":[[[10.302,1.141]],[[11.563,0.904]],[[12.588,1.111],[13.819,1.264]],[[15.203,1.089]],[]]},"EG":{"l":[[[0.0,1.593],[1.712,1.158]],[[2.99,0.581],[3.691,1.27]],[[5.081,0.339],[5.541,1.161]],[[6.822,2.059]],[[9.001,1.741]]],"c":[[[10.862,0.793]],[[11.775,1.378]],[[13.273,1.143],[14.536,0.794]],[[15.45,0.769]],[]]},"IR":{"l":[[[0.0,1.296],[1.416,1.053]],[[2.588,0.963],[3.672,1.242]],[[5.034,0.905],[6.058,0.8]],[[6.979,1.043]],[[8.142,1.573]]],"c":[[[9.835,0.804],[10.758,1.242]],[[12.12,1.462]],[[13.702,1.343],[15.165,1.032],[16.317,1.227]],[[17.664,1.151]],[]]},"KP":{"l":[[[0.0,2.427],[2.547,1.447]],[[4.114,0.862],[5.096,0.425]],[[5.641,0.454],[6.214,1.274]],[[7.608,1.189]],[[8.917,1.82]]],"c":[[[10.857,1.669]],[[12.646,0.667]],[[13.433,1.444],[14.997,0.979]],[[16.096,1.689]],[]]},"KR":{"l":[[[0.0,0.871],[0.991,1.145]],[[2.255,0.507],[2.883,0.756]],[[3.759,0.708],[4.587,0.718]],[[5.425,1.285]],[[6.83,1.793]]],"c":[[[8.743,0.606]],[[9.469,0.57]],[[10.159,1.02],[11.299,0.552]],[[11.971,1.338]],[]]},"CU":{"l":[[[0.0,1.293],[1.413,0.795]],[[2.327,1.018],[3.466,0.586]],[[4.172,0.588],[4.88,0.718]],[[5.717,1.493]],[[7.33,2.062]]],"c":[[[9.512,1.199]],[[10.831,0.848]],[[11.8,0.914],[12.834,1.545]],[[14.498,1.202]],[]]},"US":{"l":[[[0.0,1.161],[1.281,1.286],[2.687,1.208]],[[4.015,0.82],[4.955,0.983],[6.058,0.782]],[[6.961,0.855],[7.936,1.058],[9.113,0.878]],[[10.111,0.914],[11.145,1.459]],[[12.724,1.705]]],"c":[[[14.549,0.569],[15.238,0.596]],[[15.954,0.727],[16.801,0.978]],[[17.898,1.096],[19.115,0.882]],[[20.116,1.803]],[]]},"RU":{"l":[[[0.0,0.484],[0.604,1.179]],[[1.903,0.914],[2.937,0.723]],[[3.78,0.429],[4.329,1.143]],[[5.592,1.253]],[[6.965,0.949]]],"c":[[[8.034,0.907]],[[9.061,0.464]],[[9.645,0.421],[10.186,0.643]],[[10.949,0.82]],[]]},"UA":{"l":[[[0.0,0.685],[0.805,2.368]],[[3.292,0.948],[4.361,1.006]],[[5.486,0.615],[6.222,1.652]],[[7.994,1.359]],[[9.473,1.341]]],"c":[[[10.934,1.886]],[[12.94,1.289]],[[14.349,1.621],[16.09,1.461]],[[17.671,2.574]],[]]},"IL":{"l":[[[0.0,0.756],[0.876,1.262]],[[2.258,0.718],[3.096,0.688]],[[3.904,0.548],[4.572,1.474]],[[6.166,1.259]],[[7.545,2.037]]],"c":[[[9.702,0.542]],[[10.364,0.667]],[[11.15,1.328],[12.598,1.089]],[[13.807,1.292]],[]]},"TR":{"l":[[[0.0,1.088],[1.208,0.565]],[[1.893,0.413],[2.426,0.636]],[[3.183,0.458],[3.76,1.716]],[[5.596,0.759]],[[6.475,1.171]]],"c":[[[7.766,1.05],[8.936,1.394]],[[10.45,1.434]],[[12.004,0.805],[12.929,1.967]],[[15.016,1.4]],[]]},"EU":{"l":[[[0.0,0.35],[0.47,0.621]],[[1.211,0.42],[1.751,0.655]],[[2.526,0.44],[3.086,1.032]],[[4.237,0.779]],[[5.136,1.018]]],"c":[[[6.275,0.625]],[[7.02,0.503]],[[7.644,1.17],[8.934,0.629]],[[9.683,1.188]],[]]},"PK":{"l":[[[0.0,1.005],[1.125,0.675]],[[1.921,0.764],[2.805,0.535]],[[3.46,0.421],[4.001,1.046]],[[5.166,0.976]],[[6.263,1.512]]],"c":[[[7.895,1.779]],[[9.794,0.762]],[[10.676,2.211],[13.007,0.557]],[[13.684,1.711]],[]]},"IN":{"l":[[[0.0,1.267],[1.387,1.2]],[[2.707,1.026],[3.853,1.079]],[[5.051,0.714],[5.885,1.679]],[[7.684,1.365]],[[9.169,1.849]]],"c":[[[11.137,1.037]],[[12.294,1.023]],[[13.438,1.64],[15.198,1.221]],[[16.539,1.037]],[]]},"CN":{"l":[[[0.0,1.13],[1.25,1.027]],[[2.397,0.764],[3.281,0.613]],[[4.015,0.615],[4.75,1.51]],[[6.38,1.088]],[[7.588,1.327]]],"c":[[[9.036,1.039]],[[10.194,1.133]],[[11.448,0.557],[12.125,1.074]],[[13.319,1.038]],[]]}};const VOB={};
function voLoad(fac){if(!AU.ctx||VOB[fac]||!VO_MAP[fac])return;VOB[fac]='loading';fetch(window.VO_INLINE&&VO_INLINE[fac]?'data:audio/mpeg;base64,'+VO_INLINE[fac]:'vo/'+fac+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(b=>new Promise((res,rej)=>AU.ctx.decodeAudioData(b,res,rej))).then(buf=>{VOB[fac]=buf;}).catch(()=>{VOB[fac]='fail';});}
function voPlay(fac,kind){const buf=VOB[fac],M=VO_MAP[fac];if(!buf||typeof buf==='string'||!M)return false;let set=(M.l[kind]&&M.l[kind].length)?M.l[kind]:M.l[0];const cr=M.c&&M.c[kind];if(cr&&cr.length&&Math.random()<(kind===2?.5:.38))set=cr;if(!set||!set.length)return false;
  const [o,d]=set[Math.floor(Math.random()*set.length)],c=AU.ctx,src=c.createBufferSource(),g=c.createGain();src.buffer=buf;g.gain.value=Math.max(0,Math.min(1.5,SET.vo/100*1.25));src.connect(g);g.connect(c.destination);
  if(AU.musicOn&&AU.mus){AU.mus.gain.setTargetAtTime(musBase()*.45,c.currentTime,.05);AU.mus.gain.setTargetAtTime(musBase(),c.currentTime+d+.1,.25);}src.start(c.currentTime+.02,o,d);return true;}
function speak(kind){if(!AU.voiceOn||!G)return;const now=performance.now();if(now-AU.lastVoice<1300)return;AU.lastVoice=now;{const fac=G.teams[ME].fac;voLoad(fac);if(voPlay(fac,kind)){if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}return;}}if(!window.speechSynthesis)return;
  const L=G.teams[ME].F.lang,base=L.split('-')[0];const vs=AU.voices.length?AU.voices:speechSynthesis.getVoices();let voice=pickVoice(vs,L),lines=(voice&&PHR_FAC[G.teams[ME].fac])||PHR[base]||PHR.en,lang=L;
  if(!voice&&PHR_ALT[base]){const A=PHR_ALT[base];for(const b of A.v){const v=pickVoice(vs,b==='es'?'es-CU':b);if(v){voice=v;lang=v.lang;if(A.lines&&!(A.keep&&A.keep.includes(b)))lines=A.lines;break;}}}
  if(!voice&&vs.length){voice=pickVoice(vs,'en-US');lines=PHR.en;lang='en-US';}
  if(!voice)return;// no known male voice on this device: stay silent rather than use a default (often female) voice
  let set=lines[kind]||lines[0];{const fac=G.teams[ME].fac,C=lines===PHR.en?(fac==='US'?FCRY.US:FCRY_EN[fac]):(PHR_ALT[base]&&lines===PHR_ALT[base].lines)?FCRY_ALT[fac]:FCRY[fac];if(C&&C[kind]&&Math.random()<(kind===2?.5:.38))set=C[kind];}
  const u=new SpeechSynthesisUtterance(set[Math.floor(Math.random()*set.length)]);u.lang=lang;if(voice)u.voice=voice;u.rate=kind===2||kind===4?.96:.88;u.pitch=(voice&&voiceMale(voice)>0?.42:voice&&voiceMale(voice)<0?.24:.32)+Math.random()*.04;u.volume=Math.min(1,u.volume*1.1);u.volume=Math.max(0,Math.min(1,SET.vo/100));
  // duck the music while a unit talks; cancel only if something is still speaking (cancel+speak back to back drops speech in Chrome)
  u.onstart=()=>{if(AU.ctx&&AU.musicOn)AU.mus.gain.setTargetAtTime(musBase()*.45,AU.ctx.currentTime,.05);};u.onend=u.onerror=()=>{if(AU.ctx&&AU.musicOn)AU.mus.gain.setTargetAtTime(musBase(),AU.ctx.currentTime,.25);};
  try{const busy=speechSynthesis.speaking||speechSynthesis.pending;if(busy)speechSynthesis.cancel();if(speechSynthesis.paused)speechSynthesis.resume();if(busy)setTimeout(()=>{try{speechSynthesis.speak(u);}catch(e){}},60);else speechSynthesis.speak(u);}catch(e){}
  if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}}

/* ---------- national scores ---------- */
// Every nation has its own theme: a mode (with real quarter tones for Persian and Arabic maqams), tempo, chord
// progression, signature melody, lead and second instruments, drones and percussion. The score cycles
// intro -> theme -> battle -> anthem, and turns to the battle section when fighting heats up.
// perc letters: K kick, S snare, s ghost snare, H hat, D doum, T tek, B big drum (davul/taiko), F frame drum,
// R clave/clap, C conga, c bongo/janggu, G gong, P timpani, N tabla na, g tabla ge
const STYLES={
  US:{scale:[0,2,3,5,7,8,10],root:49,bpm:108,prog:[0,5,2,6,0,5,3,4],lead:'trumpet',lead2:'brass',pad:'strings',bass:'ost',perc:['K...s..KK...S...','K.sSK.sSKKsSK.SS'],motif:[[0,3],[4,1],[7,4],[7,2],[8,2],[7,4],[5,2],[4,2],[5,4],[4,8]]},
  TR:{scale:[0,1,4,5,7,8,10],root:55,bpm:100,prog:[0,0,6,0,5,5,1,0],lead:'zurna',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['B..T.T..B.T.T...','B.TTB.T.B.TTB.TT'],motif:[[4,4],[5,2],[4,2],[3,2],[2,2],[1,4],[0,8],[1,2],[2,2],[1,4],[0,4]]},
  IL:{scale:[0,1,4,5,7,8,10],root:58.27,bpm:104,prog:[0,0,3,0,6,5,1,0],lead:'clarinet',lead2:'strings',pad:'strings',bass:'ost',perc:['K...S...K..KS...','K.HKS.HKK.HKS.HS'],motif:[[0,2],[1,2],[2,4],[3,2],[4,2],[5,4],[4,2],[3,2],[2,4],[1,2],[0,6]]},
  EU:{scale:[0,2,3,5,7,8,10],root:52,bpm:100,prog:[0,5,2,6,3,0,4,4],lead:'flute',lead2:'brass',pad:'strings',bass:'walk',perc:['P.......S.......','P..PS..PP..PS.SS'],motif:[[2,4],[2,4],[3,4],[4,4],[4,4],[3,4],[2,4],[1,4],[0,4],[0,4],[1,4],[2,4],[2,6],[1,2],[1,8]]},
  UA:{scale:[0,2,3,6,7,9,10],root:55,bpm:98,prog:[0,5,2,6,0,3,4,0],lead:'bandura',lead2:'choir',pad:'choir',bass:'ost',perc:['K.......S.......','K...K.s.S...K.SS'],motif:[[0,2],[2,2],[3,2],[4,2],[3,4],[2,2],[1,2],[0,4],[4,4],[5,2],[4,2],[3,8]]},
  RU:{scale:[0,2,3,5,7,8,11],root:46.25,bpm:92,prog:[0,5,3,4,0,5,2,4],lead:'choir',lead2:'brass',pad:'strings',bass:'ost',perc:['B.......S.......','B...B...S.B.B.S.'],motif:[[0,4],[0,2],[2,2],[3,4],[2,4],[0,4],[-1,4],[0,8]]},
  // Latmiya scores: a solo chanter calls, the chorus answers, over steady chest-beating (L) and a low hum.
  IR:{scale:[0,1.5,3,5,7,8,10],root:55,bpm:70,prog:[0,0,3,0,0,4,3,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L.......L.......','L...L...L...L...'],motif:[[4,4],[3,2],[2,2],[1,4],[2,2],[1,2],[0,8],[2,2],[3,2],[2,2],[1,2],[0,8]]},
  SA:{scale:[0,1.5,3,5,7,8,10],root:49,bpm:90,prog:[0,0,6,0,3,2,1,0],lead:'oud',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['B...F...B.F.F...','B.F.B.FFB.F.BFF.'],motif:[[0,4],[1,2],[2,2],[3,4],[2,2],[1,2],[0,2],[1,2],[0,8]]},
  AE:{scale:[0,2,3.5,5,7,9,10.5],root:51.91,bpm:100,prog:[0,5,2,6,0,3,4,0],lead:'qanun',lead2:'brass',pad:'strings',bass:'ost',perc:['K..T..T.K..T.T..','K.TTK.TTK.TTKTTT'],motif:[[0,2],[2,2],[3,2],[4,4],[5,2],[4,2],[3,2],[2,2],[1,2],[0,6]]},
  PK:{scale:[0,2,3,5,7,9,10],root:55,bpm:104,prog:[0,0,3,4,0,0,3,0],lead:'harmonium',lead2:'choir',pad:'none',drone:1,bass:'drone',perc:['g.N.g.N.g.NNg.N.','g.NgR.NgR.gNgRNR'],motif:[[4,2],[4,2],[5,2],[4,2],[3,4],[2,2],[3,2],[4,8],[2,2],[1,2],[0,8]]},
  IN:{scale:[0,1,4,5,7,8,11],root:51.91,bpm:96,prog:[0,0,3,0,4,3,1,0],lead:'sitar',lead2:'flute',pad:'none',drone:1,bass:'drone',perc:['g..N.Ng.g.N.N.N.','g.NNgNNgg.NNgNNN'],motif:[[0,2],[1,2],[2,4],[3,2],[4,4],[5,2],[4,2],[2,2],[1,2],[0,8]]},
  CN:{scale:[0,2,3,7,8],root:49,bpm:96,prog:[0,3,1,4,0,3,2,4],lead:'guzheng',lead2:'bowed',pad:'strings',bass:'ost',perc:['G.......B.......','B...B...S.B.B.S.'],motif:[[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[2,2],[0,2],[1,8]]},
  KP:{scale:[0,3,5,7,10],root:55,bpm:116,prog:[0,3,1,4,0,3,2,4],lead:'brass',lead2:'choir',pad:'strings',bass:'ost',perc:['K...S...K...S...','KsSsKsSsKsSsKSSS'],motif:[[0,2],[0,2],[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[0,8]]},
  KR:{scale:[0,3,5,7,10],root:58.27,bpm:108,prog:[0,3,1,4,0,3,2,4],lead:'gayageum',lead2:'synth',pad:'strings',bass:'ost',perc:['K...c.c.K.c.S...','K.cKS.cKK.cKS.cS'],motif:[[0,2],[1,2],[2,2],[4,4],[3,2],[2,2],[1,4],[0,2],[1,6]]},
  EG:{scale:[0,1,4,5,7,8,11],root:49,bpm:104,prog:[0,0,3,0,4,3,1,0],lead:'qanun',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['D..T.TD.D.TTD.T.','D.TTD.TTD.TTDTTT'],motif:[[4,2],[5,2],[6,2],[7,4],[6,2],[5,2],[4,4],[3,2],[2,2],[1,2],[0,8]]},
  CU:{scale:[0,2,3,5,7,9,10],root:55,bpm:116,prog:[0,5,2,6,0,3,4,4],lead:'trumpet',lead2:'tres',pad:'none',bass:'tumbao',perc:['R..R..R...R.R...','RcCRc.RcCcRcRcCC'],motif:[[4,2],[4,1],[5,1],[4,2],[2,2],[0,4],[1,2],[2,2],[4,2],[2,6]]},
  RS:{scale:[0,1.5,3,4,7,8,10],root:51.91,bpm:66,prog:[0,0,2,0,0,1,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L.......L.......','L.....L.L.....L.'],motif:[[3,4],[3,2],[2,2],[3,4],[2,2],[1,2],[0,8],[1,4],[2,2],[1,2],[0,8]]},
  DW:{scale:[0,1.5,3,5,7,8,10],root:55,bpm:100,prog:[0,0,3,0,4,3,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L...L...L...L...','L.L.L.L.L.L.L.LL'],motif:[[0,2],[1,2],[2,2],[3,2],[2,4],[1,2],[0,2],[1,2],[2,2],[1,2],[0,6]]},
};
// More latmiyas: each Shia faction rotates through three. All keep the chanter calling and the chorus answering over
// chest-beats; they differ in maqam/dastgah, tempo, rhythm and accompaniment.
Object.assign(STYLES,{
  IR_b:{name:'Sanj-o-Dammam (Bushehr)',scale:[0,1.5,4,5,7,8,10],root:55,bpm:88,prog:[0,0,3,0,0,4,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['Q...L...Q.Z.L...','Q.ZLQ.ZLQ.ZLQZZL'],motif:[[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[2,2],[1,2],[0,8],[4,2],[3,2],[2,2],[1,2],[0,8]]},
  IR_c:{name:'Shoor (Rising Chest-Beat)',scale:[0,1.5,3,5,7,8.5,10],root:58.27,bpm:112,prog:[0,0,3,3,0,4,3,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L..L..L.L..L..L.','LMLLMLLMLMLLMLLL'],motif:[[0,2],[2,2],[3,2],[4,2],[3,2],[2,2],[1,4],[2,2],[3,2],[2,2],[1,2],[0,8]]},
  RS_b:{name:'Mountain Vigil',scale:[0,1,3,5,7,8,10],root:49,bpm:58,prog:[0,0,6,0,0,5,6,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L...............','L.......L...M...'],motif:[[4,6],[3,2],[2,4],[1,4],[2,2],[1,2],[0,8],[1,2],[2,2],[1,4],[0,8]]},
  RS_c:{name:'Marching Noha',scale:[0,1,4,5,7,8,10],root:51.91,bpm:92,prog:[0,0,6,0,5,5,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L...M...L...M...','L.M.L.MFL.M.L.MM'],motif:[[0,2],[1,2],[2,4],[2,2],[3,2],[2,4],[1,2],[0,2],[1,4],[0,8]]},
  DW_b:{name:'Highland Clapping Chant',scale:[0,2,3.5,5,7,9,10.5],root:55,bpm:108,prog:[0,0,4,0,3,4,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L.W.L.W.L.W.LW..','LWLWL.WWLWLWLWWW'],motif:[[0,2],[2,2],[2,2],[3,2],[4,4],[3,2],[2,2],[3,2],[2,2],[1,4],[0,8]]},
  DW_c:{name:'Desert Lament',scale:[0,2,3,5,7,8,11],root:49,bpm:80,prog:[0,0,3,4,0,5,4,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L.....L.L.......','L...M.L.L...M.LM'],motif:[[4,4],[5,2],[4,2],[3,4],[2,2],[1,2],[2,4],[1,2],[0,2],[-1,2],[0,8]]},
});
STYLES.IR.name='Shur Noha';STYLES.RS.name='Saba Lament';STYLES.DW.name='Bayati March';
// Every other nation gets a second battle variation built from its own theme: faster, with the progression shifted
// and the melody answered in reverse, so long matches don't loop one tune.
for(const k of ['US','TR','IL','EU','UA','RU','SA','AE','PK','IN','CN','KP','KR','EG','CU']){const S=STYLES[k];if(!S)continue;const m=S.motif.slice().reverse();
  const mo=m.map(([d,l],i)=>[i===m.length-1?0:d,l]);STYLES[k+'_b']=Object.assign({},S,{bpm:Math.round(S.bpm*1.08),prog:S.prog.slice(4).concat(S.prog.slice(0,4)),motif:mo,name:'Battle Theme II'});if(!S.name)S.name='Battle Theme I';}
const PLAYLIST={IR:['IR','IR_b','IR_c'],RS:['RS','RS_b','RS_c'],DW:['DW','DW_b','DW_c']};
Object.assign(STYLES,{west:STYLES.US,slavic:STYLES.RU,mideast:STYLES.SA,southasia:STYLES.IN,eastasia:STYLES.CN,latin:STYLES.CU});
function panTo(n,p){const c=AU.ctx;if(p&&c.createStereoPanner){const sp=c.createStereoPanner();sp.pan.value=p;n.connect(sp);sp.connect(AU.mus);}else n.connect(AU.mus);}
function mnote(f,t,dur,type,gain,cut,att=.02,rel=null,det=0,pan=0){const c=AU.ctx,o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type=type;o.frequency.value=f;o.detune.value=det;fl.type='lowpass';fl.frequency.value=cut;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+att);g.gain.setValueAtTime(gain,t+Math.max(att,dur-(rel||dur*.4)));g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(fl);fl.connect(g);panTo(g,pan);o.start(t);o.stop(t+dur+.05);return o;}
function vib(o,t,dur,rate,depth,delay){const c=AU.ctx,l=c.createOscillator(),lg=c.createGain();l.frequency.value=rate;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(depth,t+Math.min(dur,delay+.25));l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05);}
function strings(f,t,dur,gain){let k=0;for(const d of [-14,-8,-3,3,8,14]){const o=mnote(f,t,dur,'sawtooth',gain*.17,1900,.7,dur*.45,d,[-.7,.5,-.3,.3,-.5,.7][k++]);vib(o,t,dur,4.8+k*.13,f*.004,.4);}mnote(f/2,t,dur,'sawtooth',gain*.14,650,.9,dur*.45,6,0);}
// plucked strings: Karplus-Strong buffers, cached per pitch and timbre
const KSC=new Map();
function ksBuf(f,dur,bright,damp){const c=AU.ctx,sr=c.sampleRate,key=Math.round(f*4)+'|'+bright+'|'+damp+'|'+dur;let b=KSC.get(key);if(b)return b;if(KSC.size>400)KSC.clear();
  const N=Math.max(2,Math.round(sr/f)),len=Math.floor(sr*dur);b=c.createBuffer(1,len,sr);const d=b.getChannelData(0),buf=new Float32Array(N);let lp=0;for(let i=0;i<N;i++){lp+=((Math.random()*2-1)-lp)*bright;buf[i]=lp;}
  let ix=0,pk=1e-6;for(let i=0;i<len;i++){const a=buf[ix],nx=buf[(ix+1)%N];d[i]=a;buf[ix]=(a+nx)*.5*damp;ix=(ix+1)%N;if(Math.abs(a)>pk)pk=Math.abs(a);}for(let i=0;i<len;i++)d[i]/=pk;KSC.set(key,b);return b;}
function pluck(f,t,dur,gain,bright,damp,cut,bend,rate,pan){const c=AU.ctx,s=c.createBufferSource();s.buffer=ksBuf(f,Math.min(3,Math.max(.6,dur+.4)),bright,damp);if(bend){s.playbackRate.setValueAtTime(bend,t);s.playbackRate.exponentialRampToValueAtTime(rate||1,t+.09);}else if(rate)s.playbackRate.value=rate;
  const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;const g=c.createGain();g.gain.setValueAtTime(gain,t);g.gain.setValueAtTime(gain,t+Math.max(.05,dur));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.35);s.connect(fl);fl.connect(g);panTo(g,pan||0);s.start(t);s.stop(t+dur+.4);return s;}
function choir(f,t,dur,gain){while(f>230)f/=2;const c=AU.ctx,g=c.createGain(),out=c.createGain();out.gain.value=1;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.3);g.gain.setValueAtTime(gain,t+Math.max(.3,dur*.6));g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  for(const [fq,q,a] of [[730,6,1],[1090,7,.55],[2440,9,.3]]){const b=c.createBiquadFilter();b.type='bandpass';b.frequency.value=fq*(f<200?.85:1);b.Q.value=q;const bg=c.createGain();bg.gain.value=a*3;g.connect(b);b.connect(bg);panTo(bg,fq<1000?-.35:fq<2000?.35:0);}
  for(const d of [-9,-3,3,9]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;vib(o,t,dur,5+Math.random(),f*.006,.2);o.connect(g);o.start(t);o.stop(t+dur+.05);}}
function brass(f,t,dur,gain,bright){const c=AU.ctx,g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.Q.value=1.5;fl.frequency.setValueAtTime(380,t);fl.frequency.exponentialRampToValueAtTime(bright||2400,t+.09);fl.frequency.exponentialRampToValueAtTime((bright||2400)*.6,t+Math.max(.2,dur));
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.05);g.gain.setValueAtTime(gain*.85,t+Math.max(.06,dur*.7));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.08);fl.connect(g);panTo(g,(Math.random()-.5)*.5);
  for(const d of [-7,0,7]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;if(dur>.35)vib(o,t,dur,5.2,f*.005,.25);o.connect(fl);o.start(t);o.stop(t+dur+.1);}}
function reed(f,t,dur,gain,kind){const c=AU.ctx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),bp=c.createBiquadFilter(),hp=c.createBiquadFilter();
  o.type='square';o2.type='sawtooth';o.frequency.value=f;o2.frequency.value=f;o2.detune.value=kind==='harmonium'?9:4;
  if(kind==='zurna'){bp.type='peaking';bp.frequency.value=1500;bp.Q.value=1.4;bp.gain.value=12;hp.type='highpass';hp.frequency.value=500;}else if(kind==='clarinet'){bp.type='lowpass';bp.frequency.value=1900;bp.Q.value=.7;hp.type='highpass';hp.frequency.value=120;o2.type='triangle';}else{bp.type='lowpass';bp.frequency.value=2300;bp.Q.value=.6;hp.type='highpass';hp.frequency.value=90;}
  if(kind!=='harmonium'&&dur>.25)vib(o,t,dur,kind==='zurna'?6.2:5,f*.009,.18);if(kind==='zurna'){o.frequency.setValueAtTime(f*.97,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);}
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+(kind==='harmonium'?.08:.04));g.gain.setValueAtTime(gain,t+Math.max(.05,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.06);
  const mg=c.createGain();mg.gain.value=kind==='clarinet'?.6:.5;o.connect(mg);o2.connect(mg);mg.connect(bp);bp.connect(hp);hp.connect(g);g.connect(AU.mus);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);
  if(kind==='harmonium'){const o3=c.createOscillator();o3.type='square';o3.frequency.value=f*2;o3.detune.value=-6;const g3=c.createGain();g3.gain.value=.25;o3.connect(g3);g3.connect(bp);o3.start(t);o3.stop(t+dur+.1);}}
function bowed(f,t,dur,gain,from){const c=AU.ctx,g=c.createGain(),pk=c.createBiquadFilter(),lp=c.createBiquadFilter();pk.type='peaking';pk.frequency.value=f*3;pk.Q.value=2;pk.gain.value=8;lp.type='lowpass';lp.frequency.value=3200;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.09);g.gain.setValueAtTime(gain,t+Math.max(.1,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.1);pk.connect(lp);lp.connect(g);g.connect(AU.mus);
  for(const d of [-5,5]){const o=c.createOscillator();o.type='sawtooth';o.detune.value=d;if(from&&Math.abs(from/f-1)<.4){o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(f,t+.08);}else o.frequency.value=f;vib(o,t,dur,5.6,f*.011,.15);o.connect(pk);o.start(t);o.stop(t+dur+.15);}
  nz(AU.mus,t,Math.min(.25,dur),'bandpass',f*4,0,gain*.06,3);}
function flute(f,t,dur,gain,ney){const c=AU.ctx,o=mnote(f,t,dur,'sine',gain,4000,ney?.12:.06,dur*.4);const o2=mnote(f*2,t,dur,'triangle',gain*(ney?.08:.12),5000,.08,dur*.4);vib(o,t,dur,ney?5.2:5.8,f*(ney?.014:.008),.2);
  nz(AU.mus,t,dur*.9,'bandpass',f*(ney?1.5:2.5),0,gain*(ney?.22:.1),ney?3:5);}
function synthLead(f,t,dur,gain){for(const d of [-12,-5,0,5,12])mnote(f,t,dur,'sawtooth',gain*.16,2600,.01,dur*.3,d);mnote(f/2,t,dur,'square',gain*.1,1200,.01,dur*.3);}
// Sung words for the latmiyas: a formant singing voice with consonants. The chanter cycles the lines
// "Ya A-li", "Al-lah", "Ya Hu-sein", "Lab-baik Ya Hu-sein" and the chorus answers "A-li", "Lab-baik", "Ya Hu-sein".
// Each phone: three formants [Hz] with levels, voicing (0 = breath only) and an optional noise band for h / s / k.
const PH={a:{F:[760,1230,2650],A:[1,.62,.34],v:1},i:{F:[290,2250,3010],A:[1,.4,.5],v:1},u:{F:[340,830,2450],A:[1,.34,.14],v:1},e:{F:[470,1900,2600],A:[1,.48,.36],v:1},
  y:{F:[300,2150,2900],A:[.7,.4,.34],v:1},l:{F:[370,1050,2650],A:[.4,.16,.12],v:.85},n:{F:[260,1450,2600],A:[.34,.07,.05],v:.8},b:{F:[300,900,2300],A:[.04,.02,.02],v:.25},
  h:{F:[700,1220,2600],A:[.08,.05,.04],v:0,nf:1500,nq:.7,ng:.5},s:{F:[400,1700,2600],A:[0,0,0],v:0,nf:6200,nq:1.2,ng:.75},k:{F:[400,1700,2600],A:[0,0,0],v:0,nf:2400,nq:1.6,ng:.7}};
// syllable -> [phone, start] with start as seconds from the onset (negative = seconds before the end of the note)
const SYL={ya:[['y',0],['a',.07]],a:[['a',0]],li:[['l',0],['i',.07]],al:[['a',0],['l',-.09]],lah:[['l',0],['a',.06],['h',-.13]],hu:[['h',0],['u',.08]],
  sein:[['s',0],['e',.1],['i',.62],['n',-.16]],'~a':[['a',0]],'~i':[['i',0]],'~u':[['u',0]],lab:[['l',0],['a',.06],['b',-.06]],baik:[['b',0],['a',.05],['i',.55],['k',-.05]],ya2:[['y',0],['a',.07]]};
const LYR={lead:['ya','a','li','ya','a','li','al','lah','ya','hu','sein','lab','baik','ya','hu','sein','ya','a','li','al','lah'],chorus:['a','li','a','li','lab','baik','ya','hu','sein','al','lah']};
// Whole lines sung per phrase, so words never split across phrases; spare notes become held vowels (melisma)
const LINES={lead:[[['ya','a','li'],['ya','a','li'],['al','lah']],[['lab','baik'],['ya','hu','sein']],[['ya','hu','sein'],['ya','a','li']],[['al','lah'],['al','lah'],['ya','a','li']]],
  chorus:[[['a','li'],['a','li']],[['lab','baik'],['ya','hu','sein']],[['ya','hu','sein']],[['al','lah'],['a','li']]]};
const HOLD={ya:'~a',a:'~a',li:'~i',al:'~a',lah:'~a',hu:'~u',sein:'~i',lab:'~a',baik:'~i'};
function lyricFor(n,role,motif){const L=LINES[role][((role==='lead'?AU.ln:AU.cln)||0)%LINES[role].length];if(role==='lead')AU.ln=(AU.ln||0)+1;else AU.cln=(AU.cln||0)+1;
  const out=[];let w=0;const words=[];while(words.flat().length<n*2)words.push(...L);
  // fit whole words; when the next word doesn't fit in the notes left, hold the last vowel over the longest notes
  for(let k=0;k<words.length&&out.length<n;k++){const wd=words[k];if(out.length+wd.length<=n)out.push(...wd);else break;}
  while(out.length<n){let best=-1,bl=-1;for(let k=0;k<out.length;k++){if(motif[k]&&motif[k][1]>bl&&['ya','a','li','hu'].includes(out[k])){bl=motif[k][1];best=k;}}
    if(best<0){out.push(HOLD[out[out.length-1]]||'~a');continue;}out.splice(best+1,0,HOLD[out[best]]||'~a');}
  return out.slice(0,n);}
function hallSend(){const c=AU.ctx;if(!AU.vrev||AU.vrevC!==c){AU.vrevC=c;AU.vrev=c.createConvolver();AU.vrev.buffer=impulse(c,4.8,2.4);AU.vrevIn=c.createGain();AU.vrevIn.gain.value=.5;AU.vrevIn.connect(AU.vrev);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;AU.vrev.connect(lp);lp.connect(AU.mus);}return AU.vrevIn;}
function glottal(c){if(AU.glotC!==c){AU.glotC=c;const N=56,re=new Float32Array(N),im=new Float32Array(N);for(let n=1;n<N;n++)im[n]=Math.pow(n,-1.45)*(n%2?1:.82);AU.glot=c.createPeriodicWave(re,im);}return AU.glot;}
function voice(f,t,dur,gain,from,syl,nv){const c=AU.ctx,src=c.createGain(),amp=c.createGain(),L=dur+.12;const hold=syl&&syl[0]==='~';
  const seq=(SYL[syl]||SYL.a).map(([p,st])=>[p,st>=0?Math.min(st*(dur<.35?.6:1),L*.7):Math.max(L+st,L*.4)]);
  for(const d of nv>1?[-12,-5,4,11].slice(0,nv):[0]){const o=c.createOscillator();o.setPeriodicWave(glottal(c));o.detune.value=d+(nv>1?Math.random()*5-2.5:0);
    // a sobbing scoop up into the note, then a falling sigh as it releases
    const st=from&&Math.abs(from/f-1)<.35?from:f*.93;o.frequency.setValueAtTime(st,t);o.frequency.exponentialRampToValueAtTime(f,t+Math.min(hold?.12:.18,dur*.3));
    // tahrir: a quick vocal turn ornamenting long solo notes
    if(nv===1&&dur>.85){const a=t+dur*.38,q=.055;o.frequency.setValueAtTime(f,a);o.frequency.linearRampToValueAtTime(f*1.06,a+q);o.frequency.linearRampToValueAtTime(f,a+2*q);o.frequency.linearRampToValueAtTime(f*.972,a+3*q);o.frequency.linearRampToValueAtTime(f,a+4*q);}
    if(dur>.5){o.frequency.setValueAtTime(f,t+dur*.8);o.frequency.exponentialRampToValueAtTime(f*.95,t+dur+.12);}
    vib(o,t,dur,nv>1?4.8+Math.random()*.8:4.7+Math.random()*.4,f*(nv>1?.008:.016),.3);vib(o,t,dur,.6+Math.random()*.5,f*.004,0);o.connect(src);o.start(t);o.stop(t+L+.2);}
  // breath mixed into the voice, plus a separate noise band for h / s / k
  const br=c.createBufferSource();br.buffer=AU.noise;br.loop=true;const bg=c.createGain();bg.gain.value=nv>1?.04:.07;br.connect(bg);bg.connect(src);
  const nzs=c.createBufferSource();nzs.buffer=AU.noise;nzs.loop=true;const nb=c.createBiquadFilter();nb.type='bandpass';const ng=c.createGain();nzs.connect(nb);nb.connect(ng);ng.connect(amp);
  const vg=c.createGain();src.connect(vg);
  const bank=[0,1,2].map(k=>{const b=c.createBiquadFilter();b.type='bandpass';b.Q.value=[5,8,11][k];const g=c.createGain();vg.connect(b);b.connect(g);g.connect(amp);return[b,g];});
  // singer's formant (the ring of a trained voice) and a little body underneath, both following the voicing
  {const sf=c.createBiquadFilter();sf.type='bandpass';sf.frequency.value=nv>1?3000:3050;sf.Q.value=7;const sg=c.createGain();sg.gain.value=nv>1?.5:1.1;vg.connect(sf);sf.connect(sg);sg.connect(amp);
   const bo=c.createBiquadFilter();bo.type='lowpass';bo.frequency.value=f*2.2;const bog=c.createGain();bog.gain.value=.35;vg.connect(bo);bo.connect(bog);bog.connect(amp);}
  const tr=.035;seq.forEach(([p,st],j)=>{const P=PH[p],tt=t+st,tt2=tt+(j===0?0:tr),sh=f<180?.9:1;
    const Q=j?PH[seq[j-1][0]]:P;const set=(prm,val,prev)=>{if(j===0)prm.setValueAtTime(val,tt);else{prm.setValueAtTime(prev,tt);prm.linearRampToValueAtTime(val,tt2);}};
    bank.forEach(([b,g],k)=>{set(b.frequency,P.F[k]*sh,Q.F[k]*sh);set(g.gain,P.A[k]*3.4,Q.A[k]*3.4);});set(vg.gain,P.v,Q.v);
    if(P.nf){nb.frequency.setValueAtTime(P.nf,tt);nb.Q.setValueAtTime(P.nq,tt);ng.gain.setValueAtTime(0,tt);ng.gain.linearRampToValueAtTime(P.ng*(nv>1?.5:1),tt+.015);ng.gain.linearRampToValueAtTime(0,Math.min(t+L,tt+(p==='k'?.05:.11)));}else if(j===0)ng.gain.setValueAtTime(0,tt);});
  amp.gain.setValueAtTime(.0001,t);amp.gain.linearRampToValueAtTime(gain,t+(hold?.03:nv>1?.12:.06));amp.gain.setValueAtTime(gain,t+Math.max(.1,dur*.8));amp.gain.exponentialRampToValueAtTime(.0005,t+L+.1);
  br.start(t);br.stop(t+L+.2);nzs.start(t);nzs.stop(t+L+.2);
  if(nv>1)panTo(amp,(Math.random()-.5)*.6);else amp.connect(AU.mus);amp.connect(hallSend());}
function chant(f,t,dur,gain,from){const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';
  if(from&&Math.abs(from/f-1)<.35){o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(f,t+.1);}else{o.frequency.setValueAtTime(f*1.06,t);o.frequency.exponentialRampToValueAtTime(f,t+.12);}vib(o,t,dur,5.4,f*.013,.2);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.07);g.gain.setValueAtTime(gain,t+Math.max(.08,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.12);o.connect(g);
  for(const [a1,a2,q,amp] of [[720,460,6,1],[1160,820,7,.6],[2650,2800,9,.35]]){const b=c.createBiquadFilter();b.type='bandpass';b.Q.value=q;b.frequency.setValueAtTime(a1,t);b.frequency.linearRampToValueAtTime(a2,t+Math.max(.1,dur*.8));const bg=c.createGain();bg.gain.value=amp*3.2;g.connect(b);b.connect(bg);bg.connect(AU.mus);}
  o.start(t);o.stop(t+dur+.2);nz(AU.mus,t,.06,'bandpass',3000,0,gain*.15,2);}
function inst(kind,f,t,dur,gain,syl){
  switch(kind){
    case 'chanter':{if(AU.style&&AU.style.cr){const sy=syl||LYR.lead[AU.syl%LYR.lead.length];AU.syl++;voice(f*2,t,dur,gain*1.55,AU.lastF,sy,1);}else chant(f*2,t,dur,gain*1.7,AU.lastF);break;}
    case 'chorus':{const d=Math.max(dur,.4),sy=syl||LYR.chorus[AU.csyl%LYR.chorus.length];AU.csyl++;const j=()=>Math.random()*.035;voice(f*2,t+j(),d,gain*.6,0,sy,3);voice(f*2,t+j(),d,gain*.55,0,sy,3);voice(f,t+j(),d,gain*.65,0,sy,3);break;}
    case 'trumpet':brass(f*2,t,dur,gain*.8,3200);break;
    case 'brass':brass(f,t,dur,gain*.9,2100);brass(f/2,t,dur,gain*.45,1200);break;
    case 'horn':brass(f,t,dur,gain*.9,1500);break;
    case 'choir':choir(f,t,Math.max(dur,.4),gain*.9);break;
    case 'strings':for(const d of [-8,0,8]){const o=mnote(f*2,t,dur,'sawtooth',gain*.24,2600,.08,dur*.4,d);vib(o,t,dur,5.5,f*.02,.2);}break;
    case 'flute':flute(f*2,t,dur,gain);break;
    case 'ney':flute(f*2,t,dur,gain*1.05,1);break;
    case 'zurna':reed(f*2,t,dur,gain*.55,'zurna');break;
    case 'clarinet':reed(f*2,t,dur,gain*.7,'clarinet');break;
    case 'harmonium':reed(f*2,t,dur,gain*.55,'harmonium');break;
    case 'bowed':bowed(f*2,t,dur,gain*.6,AU.lastF);break;
    case 'synth':synthLead(f*2,t,dur,gain);break;
    case 'oud':pluck(f,t,dur,gain*1.4,.32,.995,2200);if(dur>.45)pluck(f,t+dur*.5,dur*.5,gain*.8,.32,.995,2200);break;
    case 'santur':{const n=dur>.3?Math.max(2,Math.round(dur/.075)):1;for(let k=0;k<n;k++)pluck(f*2,t+k*.075,.25,gain*(k%2?.55:.8)*(1-k/(n+2)),.85,.997,7000);break;}
    case 'qanun':pluck(f*2,t,dur,gain*1.1,.75,.996,5200);pluck(f,t,dur,gain*.4,.6,.996,3000);break;
    case 'guzheng':pluck(f*2,t,dur,gain*1.2,.6,.998,4800,1.06,1);break;
    case 'gayageum':pluck(f,t,dur,gain*1.4,.45,.998,3600,.95,1);break;
    case 'bandura':pluck(f*2,t,dur,gain*1.1,.55,.998,4200);pluck(f,t+.01,dur,gain*.5,.5,.998,2500);break;
    case 'tres':pluck(f*2,t,dur,gain,.65,.995,4000);pluck(f*2,t+.012,dur,gain*.8,.65,.995,4000,0,1.004);break;
    case 'sitar':pluck(f*2,t,dur,gain*1.1,.75,.9985,5200,1.045,1);pluck(f*4,t+.02,dur*.6,gain*.15,.9,.999,8000);break;
    default:brass(f,t,dur,gain,1800);}
  AU.lastF=f*2;}
function drum(t,k,g=1){
  switch(k){
    // latmiya percussion: Q dammam (deep barrel drum of the Bushehri sanj-o-dammam), Z sanj (pair of hand cymbals),
    // W group hand-claps, M a lighter single chest-beat for off-beats
    case 'Q':osc(AU.mus,t,'sine',64,40,.7,1.15*g,.003);nz(AU.mus,t,.35,'lowpass',220,70,.55*g,.6,AU.brown);nz(AU.mus,t,.025,'bandpass',700,0,.25*g,1.2);break;
    case 'Z':nz(AU.mus,t,.55,'bandpass',5200,3800,.24*g,1.4);nz(AU.mus,t,.3,'highpass',7500,5000,.16*g,.6);osc(AU.mus,t,'square',1830,1790,.18,.04*g,.001);osc(AU.mus,t,'square',2470,2440,.14,.03*g,.001);break;
    case 'W':for(let k=0;k<6;k++){const tt=t+Math.random()*.025;nz(AU.mus,tt,.05,'bandpass',1400+Math.random()*900,0,.22*g,1.8);}break;
    case 'M':{const tt=t+Math.random()*.02;osc(AU.mus,tt,'sine',96,52,.18,.42*g,.003);nz(AU.mus,tt,.08,'lowpass',420,140,.3*g,.7);break;}
    case 'K':osc(AU.mus,t,'sine',110,38,.45,1.0*g,.002);nz(AU.mus,t,.06,'lowpass',900,0,.35*g);break;
    case 'L':for(let k=0;k<4;k++){const tt=t+Math.random()*.03;osc(AU.mus,tt,'sine',88,46,.24,.7*g,.003);nz(AU.mus,tt,.11,'lowpass',380,120,.5*g,.7);nz(AU.mus,tt,.035,'bandpass',950,0,.22*g,1.5);}break;
    case 'S':nz(AU.mus,t,.22,'bandpass',1700,900,.55*g,.9);osc(AU.mus,t,'triangle',220,140,.08,.25*g);break;
    case 's':nz(AU.mus,t,.1,'bandpass',2200,1200,.18*g,.9);break;
    case 'H':nz(AU.mus,t,.04,'highpass',7000,0,.18*g);break;
    case 'D':osc(AU.mus,t,'sine',95,70,.35,.9*g,.002);nz(AU.mus,t,.05,'lowpass',500,0,.2*g);break;
    case 'T':nz(AU.mus,t,.07,'bandpass',3200,0,.4*g,2.5);osc(AU.mus,t,'sine',520,480,.05,.12*g);break;
    case 'B':osc(AU.mus,t,'sine',72,34,.9,1.2*g,.003);nz(AU.mus,t,.5,'lowpass',260,60,.5*g,.6,AU.brown);nz(AU.mus,t,.03,'bandpass',900,0,.3*g,1);break;
    case 'F':osc(AU.mus,t,'sine',120,85,.4,.7*g,.003);nz(AU.mus,t,.12,'bandpass',800,0,.3*g,1.5);break;
    case 'R':nz(AU.mus,t,.035,'bandpass',2500,0,.5*g,6);osc(AU.mus,t,'sine',1800,1700,.03,.15*g);break;
    case 'C':osc(AU.mus,t,'sine',210,190,.25,.55*g,.002);nz(AU.mus,t,.03,'bandpass',1200,0,.15*g,2);break;
    case 'c':osc(AU.mus,t,'sine',360,330,.14,.45*g,.002);nz(AU.mus,t,.025,'bandpass',2600,0,.18*g,2);break;
    case 'G':for(const [r,a] of [[1,.4],[1.48,.25],[2.1,.18],[2.76,.12]])osc(AU.mus,t,'sine',90*r,88*r,3.5,a*g,.01);nz(AU.mus,t,1.5,'bandpass',600,300,.2*g,1);break;
    case 'P':{const f=(AU.style?AU.style.root:55)*1.5;osc(AU.mus,t,'sine',f*1.04,f,1.2,.9*g,.004);osc(AU.mus,t,'sine',f*2.01,f*2,.6,.25*g,.004);nz(AU.mus,t,.2,'lowpass',400,100,.3*g,.7);break;}
    case 'N':osc(AU.mus,t,'sine',620,600,.18,.4*g,.002);osc(AU.mus,t,'sine',1250,1240,.08,.15*g,.002);nz(AU.mus,t,.02,'bandpass',3000,0,.12*g,3);break;
    case 'g':{const c=AU.ctx,o=c.createOscillator(),gg=c.createGain();o.type='sine';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(115,t+.25);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.8*g,t+.004);gg.gain.exponentialRampToValueAtTime(.0005,t+.5);o.connect(gg);gg.connect(AU.mus);o.start(t);o.stop(t+.55);break;}}}
// Epic war layer shared by every score: war drums and taiko rolls, low string ostinato, brass stabs,
// cymbal swells into each section and a battle choir. Latmiyas keep their chanter, chorus and chest-beats on top.
function crash(t,g){nz(AU.mus,t,2.2,'highpass',5000,2500,.22*g,.5);nz(AU.mus,t,1.4,'bandpass',3200,1800,.12*g,.8);}
function swell(t,dur,g){const c=AU.ctx,s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(800,t);f.frequency.exponentialRampToValueAtTime(7000,t+dur);
  const gg=c.createGain();gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.16*g,t+dur);gg.gain.linearRampToValueAtTime(0,t+dur+.03);s.connect(f);f.connect(gg);gg.connect(AU.mus);s.start(t);s.stop(t+dur+.05);}
// ===== Big modern war-film scoring (every nation, latmiyas included) =====
// Built in layers that stack section by section: a sub drone and low piano pulse, then driving spiccato string
// ostinatos in 3+3+2, then taiko ensembles and huge low-brass "braams", and in the finale the faction's own theme
// played slow and enormous by eight horns over choir. Slow chord changes and pedal tones keep it heavy.
function shaper(){const c=AU.ctx;if(AU.shC!==c){AU.shC=c;const n=1024,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cv[i]=Math.tanh(2.2*x)/Math.tanh(2.2);}AU.sh=cv;}return AU.sh;}
function braam(f,t,dur,gain){const c=AU.ctx,g=c.createGain(),lp=c.createBiquadFilter(),ws=c.createWaveShaper();ws.curve=shaper();lp.type='lowpass';lp.Q.value=2.5;
  lp.frequency.setValueAtTime(140,t);lp.frequency.exponentialRampToValueAtTime(1700,t+.35);lp.frequency.exponentialRampToValueAtTime(420,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.09);g.gain.setValueAtTime(gain,t+dur*.45);g.gain.exponentialRampToValueAtTime(.0005,t+dur+.4);
  for(const [r,d,a] of [[.5,-9,1],[.5,8,1],[1,-5,.8],[1,6,.8],[1.5,0,.45],[2,-3,.3],[2,4,.3]]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f*r;o.detune.value=d;const og=c.createGain();og.gain.value=a*.22;o.connect(og);og.connect(ws);o.start(t);o.stop(t+dur+.5);}
  ws.connect(lp);lp.connect(g);panTo(g,0);}
function hornsec(f,t,dur,gain){const c=AU.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=1;lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(1500,t+Math.min(1,dur*.5));lp.frequency.linearRampToValueAtTime(900,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(.35,dur*.3));g.gain.setValueAtTime(gain*.92,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0005,t+dur+.35);
  let k=0;for(const d of [-12,-7,-3,0,3,7,12,16]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;vib(o,t,dur,4.6+k*.11,f*.003,.5);const og=c.createGain();og.gain.value=.11;o.connect(og);og.connect(lp);o.start(t);o.stop(t+dur+.4);k++;}
  const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f/2;const g2=c.createGain();g2.gain.value=.35;o2.connect(g2);g2.connect(lp);o2.start(t);o2.stop(t+dur+.4);lp.connect(g);panTo(g,0);}
function spicc(f,t,gain,pan){const c=AU.ctx,g=c.createGain(),bp=c.createBiquadFilter();bp.type='lowpass';bp.frequency.value=2600;bp.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0005,t+.16);
  for(const d of [-8,0,7]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;o.connect(bp);o.start(t);o.stop(t+.2);}bp.connect(g);panTo(g,pan||0);}
function taiko(t,g,low){osc(AU.mus,t,'sine',low?58:82,low?32:44,low?1.4:.8,1.25*g,.002);osc(AU.mus,t+.004,'sine',low?92:120,60,.3,.6*g,.002);nz(AU.mus,t,low?.9:.5,'lowpass',low?240:380,60,.75*g,.6,AU.brown);nz(AU.mus,t,.03,'bandpass',1400,0,.25*g,1.2);}
function pianoLow(f,t,gain){osc(AU.mus,t,'triangle',f,f,2.2,gain,.004);osc(AU.mus,t,'sine',f*2,f*2,1.4,gain*.35,.004);osc(AU.mus,t,'sine',f*3.01,f*3.01,.6,gain*.08,.004);}
function riser(t,dur,g){swell(t,dur,g);const c=AU.ctx,o=c.createOscillator(),gg=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(640,t+dur);
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(4000,t+dur);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.07*g,t+dur);gg.gain.linearRampToValueAtTime(0,t+dur+.02);o.connect(lp);lp.connect(gg);gg.connect(AU.mus);o.start(t);o.stop(t+dur+.05);}
const OST=[1,0,0,.7,0,0,.85,0,1,0,0,.7,0,0,.85,.5];
// Each nation keeps its own voice inside the big score: a folk instrument doubles the string ostinato and a national
// percussion section drives the battle sections (military snare, davul, darbuka, tabla, war drums, congas...).
const REGO={US:['','snare'],EU:['','snare'],IL:['qanun','darbuka'],TR:['santur','davul'],UA:['bandura','snare'],RU:['','snare'],IR:['santur','dammam'],SA:['oud','darbuka'],AE:['qanun','darbuka'],
  PK:['sitar','tabla'],IN:['sitar','tabla'],CN:['guzheng','wardrum'],KP:['','snare'],KR:['gayageum','buk'],EG:['qanun','darbuka'],CU:['tres','conga'],RS:['santur','dammam'],DW:['oud','darbuka']};
const RPERC={snare:{s:[1,3,5,7,9,11,13,15],S:[4,12]},davul:{B:[0,8],T:[3,6,10,13]},darbuka:{D:[0,8],T:[4,6,12,14],R:[15]},dammam:{Q:[0,6,8],Z:[4,12]},
  tabla:{g:[0,6,8],N:[3,4,10,12,14]},wardrum:{B:[0,6,8],K:[12]},buk:{F:[0,3,6,10],B:[8]},conga:{C:[0,7,8],c:[3,6,11,14,15]}};// 3+3+2 accents across a bar of sixteenths
function bigScore(t,i,bar,sec,ch,hz,S,sp,intense){const lat=!!S.cr,lv=(lat?.7:1)*.8,root=hz(ch),pb=Math.floor(bar/8)*8,bi=bar-pb;
  // sub drone on the tonic, always present
  if(i===0&&bar%4===0){mnote(S.root/2,t,sp*64,'sine',.38*lv,160,1.2,sp*16);mnote(S.root,t,sp*64,'sawtooth',.06*lv,260,2,sp*16);}
  // section downbeats: braam + taiko + gong; riser into every new section
  if(i===0&&bi===0){braam(root,t,sp*20,(sec===0?.16:.26)*lv);taiko(t,1.1*lv,1);crash(t,.7*lv);if(sec>=2)drum(t,'G',.6*lv);}
  if(bi===7&&i===0)riser(t,sp*16,.9*lv);
  // section 0: lonely low piano pulse
  if(sec===0&&i%4===0&&!lat)pianoLow(root,t,(i===0?.22:.12));
  // ostinato strings from section 1, doubling an octave up in the battle sections
  if(sec>=1&&!(lat&&sec===1&&i%2)){const a=OST[i];if(a){const step=[0,0,4,0,0,4,7,4][i%8],f=root*Math.pow(2,0)*(step===7?2:1)*(step===4?Math.pow(2,(S.scale[(4)%S.scale.length]-S.scale[0])/12):1);
      spicc(root*2*(i%8===6?1.5:1),t,.11*a*lv,-.4);if(sec>=2)spicc(root*4*(i%8===6?1.5:1),t,.07*a*lv,.4);if(sec>=2)mnote(root/2,t,sp*1.2,'sawtooth',.11*a*lv,380,.004,sp*.8);}}
  // national folk instrument doubling the ostinato, and the national percussion section
  {const R=REGO[AU.fac]||['',''];if(R[0]&&sec>=1&&i%2===0&&OST[i]){inst(R[0],root*(i%8===6?1.5:1),t,sp*1.6,(sec>=2?.15:.12)*lv);}
   const P=RPERC[R[1]];if(P&&sec>=1){for(const k in P)if(P[k].includes(i))drum(t,k,(sec>=2?.75:.5)*(k==='s'?.45:1)*lv);}}
  // taiko ensemble groove in the battle sections, with rolls into each phrase
  if(sec>=2){if(i===0||i===10)taiko(t,(i===0?1:.75)*lv,1);if(i===6||i===14)taiko(t,.55*lv,0);if(intense&&(i===3||i===12))taiko(t,.4*lv,0);if(bi===7&&i>=8&&i%2===0)taiko(t,(.4+.08*(i-8))*lv,0);}
  else if(sec===1&&(i===0||i===8))taiko(t,.55*lv,1);
  // low brass power chords every two bars from section 2
  if(sec>=2&&i===0&&bar%2===0){braam(root,t,sp*30,.13*lv);hornsec(root*2,t,sp*30,.06*lv);hornsec(hz(ch+4)*2,t,sp*30,.045*lv);}
  // finale: the faction's theme, slow and huge on eight horns over a battle choir
  if(sec===3&&!lat&&i===0&&bar%8===0){let st=t;const aug=2;for(const [d,l] of S.motif.slice(0,8)){hornsec(hz(d)*2,st,sp*l*aug*.95,.075);st+=sp*l*aug;}}
  if(sec===3&&i===0&&bar%4===0){choir(root*2,t,sp*60,.07*lv);choir(hz(ch+2)*2,t,sp*60,.05*lv);choir(hz(ch+4)*2,t,sp*60,.05*lv);}
  if(sec===0&&bar%2===0&&i===0)strings(root,t,sp*32,.16*lv);}
function epic(t,i,bar,sec,ch,hz,S,sp,intense){const lat=!!S.cr,g=lat?.75:1;
  if(lat){// mourning strings under the whole piece, swelling with each section; low horns and a huge choir in the finale
    if(i===0&&bar%2===0){const dur=sp*32,k=[.55,.8,1,1.15][sec];strings(hz(ch)*2,t,dur,.2*k);strings(hz(ch+2)*2,t,dur,.15*k);strings(hz(ch)*1,t,dur,.18*k);if(sec>=2)strings(hz(ch+4)*4,t,dur,.1*k);}
    if(sec>=2&&i===0&&bar%4===0){inst('horn',hz(ch)*.5,t,sp*30,.13);inst('horn',hz(ch+4)*.5,t,sp*30,.08);}
    if(sec===3&&i===0&&bar%4===0){choir(hz(ch)*2,t,sp*60,.075);choir(hz(ch+2)*2,t,sp*60,.055);choir(hz(ch+4)*2,t,sp*60,.05);choir(hz(ch),t,sp*60,.06);}
    if(sec>=1&&i===0&&bar%4===0)drum(t,'G',.55);}
  if(i===0&&bar%8===0)crash(t,lat?.6:1);
  if(i===8&&bar%8===7)swell(t,sp*8,lat?.6:1);
  if(sec>=1&&(i===0||i===8))drum(t,'B',(intense?.85:.6)*g);
  if(intense&&(i===6||i===14)&&!lat)drum(t,'B',.5);
  if(bar%8===7&&i>=12)drum(t,'B',.35+.1*(i-12));
  if(intense&&!lat&&i%1===0&&(sec===2||sec===3)){const acc=i%4===0?1:.55;mnote(hz(ch)*(i%8<4?1:1),t,sp*.9,'sawtooth',.075*acc,900,.004,sp*.6,-6);mnote(hz(ch)*2,t,sp*.9,'sawtooth',.045*acc,1200,.004,sp*.6,6);}
  if(lat&&intense&&i%2===0){mnote(hz(ch),t,sp*1.8,'sawtooth',.07,700,.004,sp*1.2);}
  if((sec===2||sec===3)&&i===0&&bar%2===0){for(const d of [0,2,4])brass(hz(ch+d)*2,t,sp*3,lat?.05:.08,1800);brass(hz(ch),t,sp*4,lat?.06:.09,900);}
  if(sec===3&&i===0&&bar%4===0&&!lat){choir(hz(ch)*2,t,sp*60,.06);choir(hz(ch+2)*2,t,sp*60,.045);choir(hz(ch+4)*2,t,sp*60,.045);}
  if(sec===0&&bar%2===0&&i===0)mnote(hz(ch)*.5,t,sp*32,'sawtooth',.1,240,.6,sp*12);
  if(!lat&&sec>=1&&i%2===0){const seq=[0,2,4,7,4,2,7,9];const d=ch+seq[(i/2)%8];pluck(hz(d)*4,t,sp*2.2,.13*(i%4===0?1:.75),.75,.997,6500,0,0,(i%4===0?-.45:.45));}
  if(!lat&&sec===3&&i===0&&bar%2===0){brass(hz(ch+4)*2,t,sp*30,.055,1400);brass(hz(ch+2)*4,t,sp*30,.035,1800);}}
function startMusic(style){if(!AU.ctx)return;AU.pl=PLAYLIST[style]||(STYLES[style+'_b']?[style,style+'_b']:[style]);AU.fac=style;AU.pi=0;AU.syl=0;AU.csyl=0;AU.style=STYLES[AU.pl[0]]||STYLES.US;AU.step=4*16;AU.next=AU.ctx.currentTime+.3;AU.mi=4;AU.bar=0;AU.mq=[];AU.lastF=0;clearInterval(AU.timer);AU.timer=setInterval(musicTick,50);}
function stopMusic(){clearInterval(AU.timer);AU.timer=null;}
function queueMotif(at,S,instr,oct,gain,sp){let st=at;const ly=S.cr&&(instr==='chanter'||instr==='chorus')?lyricFor(S.motif.length,instr==='chanter'?'lead':'chorus',S.motif):null;S.motif.forEach(([d,l],k)=>{AU.mq.push({st,d,l,instr,oct,gain,syl:ly?ly[k]:null});st+=l;});return st;}
function musicTick(){if(!AU.ctx||!AU.style)return;const S=AU.style,sp=60/S.bpm/4,n=S.scale.length;AU.heat=Math.max(0,AU.heat-.0012);
  const hz=deg=>S.root*Math.pow(2,(S.scale[((deg%n)+n)%n]+12*Math.floor(deg/n))/12);
  while(AU.next<AU.ctx.currentTime+.4){
    // after each full piece (4 sections of 8 bars) move on to the faction's next track
    if(AU.step%512===0&&AU.step>64&&AU.pl&&AU.pl.length>1&&AU.swAt!==AU.step){AU.swAt=AU.step;AU.pi=(AU.pi+1)%AU.pl.length;AU.style=STYLES[AU.pl[AU.pi]]||AU.style;AU.mq=[];
      try{if(typeof pushLog==='function'&&AU.musicOn&&AU.style.name)pushLog('♪ '+AU.style.name);}catch(e){}return musicTick();}
    const t=AU.next,i=AU.step%16,bar=Math.floor(AU.step/16),sec=Math.floor(bar/8)%4,intense=sec===2||sec===3||AU.heat>.35;
    const ch=S.prog[Math.floor(bar/2)%S.prog.length];
    // pads and drones
    if(i===0&&bar%2===0){const dur=sp*32;if(S.pad==='strings'){strings(hz(ch)*2,t,dur,.38);strings(hz(ch+4)*2,t,dur,.26);strings(hz(ch+2)*4,t,dur,.2);if(!S.cr)strings(hz(ch)*4,t,dur,.12);}else if(S.pad==='choir'){choir(hz(ch)*2,t,dur,.1);choir(hz(ch+2)*2,t,dur,.07);choir(hz(ch+4)*2,t,dur,.07);}
      if(S.bass!=='drone')mnote(hz(ch),t,dur,'sine',.32,300,.4);}
    if(S.drone==='hum'){if(i===0&&bar%4===0){choir(S.root*2,t,sp*64,.09);choir(S.root*3,t,sp*64,.045);}}
    else if(S.drone){if(S.lead==='sitar'||S.lead==='harmonium'){if(i%4===0){const k=(i/4)|0;pluck(S.root*(k===0?1.5:1)*2,t,sp*4,.32,.4,.999,2400);}}else if(i===0&&bar%4===0){mnote(S.root,t,sp*64,'sawtooth',.13,380,1.5,sp*20,-4);mnote(S.root*1.5,t,sp*64,'sawtooth',.07,420,1.5,sp*20,4);mnote(S.root*2,t,sp*64,'sine',.16,600,1.5,sp*20);}}
    // percussion
    const pat=S.perc[intense?1:0];const k=pat[i];if(k!=='.')drum(t,k,intense?1:.7);if(intense&&i%2===1&&(S.bass==='ost'||S.bass==='walk'))drum(t,'H',.5);if(intense&&i===0&&bar%8===0)drum(t,S.perc[0][0]==='G'?'G':'B',.8);
    // bass lines
    if(S.bass==='ost'&&AU.big===false&&(intense||sec===1)&&i%2===0){const d=(i%8===6)?ch+4:ch;mnote(hz(d),t,sp*1.6,'sawtooth',.15,520,.005,sp*1.2);}
    else if(S.bass==='walk'&&sec>0&&i%4===0){mnote(hz(ch+[0,2,4,5][i/4])*.5*2,t,sp*3.6,'triangle',.3,700,.01,sp*2);}
    else if(S.bass==='tumbao'&&(i===6||i===12||i===15&&intense)){mnote(hz(i===12?ch+4:ch),t,sp*3,'triangle',.4,800,.005,sp*2);mnote(hz(i===12?ch+4:ch)*2,t,sp*2,'sine',.12,1500,.005,sp*1.5);}
    // signature melody: theme section on the lead, anthem section on the second instrument with the lead doubling
    if(i===0&&(sec===1&&bar%4===0||sec===3&&bar%4===0||sec===0&&bar===6)){const mlen=S.motif.reduce((a,m)=>a+m[1],0);if(!AU.mq.some(q=>q.st>=AU.step)){if(S.cr){const e=queueMotif(AU.step,S,S.lead,1,sec===0?.17:.22);if(sec!==0)queueMotif(e,S,S.lead2,1,.2);}else if(sec===3){queueMotif(AU.step,S,S.lead2,1,.2);queueMotif(AU.step,S,S.lead,2,.12);}else queueMotif(AU.step,S,S.lead,1,sec===0?.15:.21);}}
    let motifNow=false;for(const q of AU.mq){if(q.st===AU.step){motifNow=true;if(q.d!=null){inst(q.instr,hz(q.d)*(q.oct===2?2:1),t,sp*q.l*(q.syl&&q.syl[0]==='~'?1.02:.95),q.gain,q.syl);if(q.instr==='chorus'&&q.syl&&q.syl[0]!=='~'&&S.perc[0][i]==='.')drum(t,'L',.6);}}else if(q.st<AU.step&&q.st+q.l>AU.step)motifNow=true;}
    AU.mq=AU.mq.filter(q=>q.st+q.l>AU.step);
    if(S.cr&&!motifNow&&(i===4||i===10)&&Math.random()<(sec===0?.75:.4)){const top=4+(Math.random()*2|0);inst('ney',hz(top),t,sp*3.5,.13);inst('ney',hz(top-1),t+sp*3.5,sp*5,.12);}
    // improvised lead in the battle section, built around the theme's notes
    if(!motifNow&&sec===2){const on=(i===0||i===6||i===8||i===12)?.7:(i%2===0?.22:0);if(Math.random()<on){AU.mi=Math.max(-1,Math.min(11,AU.mi+[-2,-1,-1,0,1,1,2,3][Math.random()*8|0]));if(Math.random()<.35){const m=S.motif[Math.random()*S.motif.length|0];AU.mi=m[0];}
      const len=(i===0||i===8)?sp*(Math.random()<.5?6:4):sp*2;inst(S.lead,hz(AU.mi),t,len,intense?.2:.16);}}
    if(intense&&i===0&&bar%4===0&&S.bass==='ost'){for(const d of [0,2,4])mnote(hz(ch+d)*2,t,sp*3,'sawtooth',.13,2200,.01,sp*2.5);}
    if(AU.big!==false)bigScore(t,i,bar,sec,ch,hz,S,sp,intense);else epic(t,i,bar,sec,ch,hz,S,sp,intense);
    AU.next+=sp;AU.step++;}}

// ===== Sampled orchestra =====
// Real recorded instruments (FluidR3 GM soundfont, MIT licence) replace the oscillator voices once the sample sheet
// mus/smp.mp3 has loaded: string ensemble, cellos and basses, violin, choir, horns, trombones, trumpets, tuba,
// timpani, taiko, piano, flute, pan flute (ney), shehnai (zurna), clarinet, accordion (harmonium), sitar, koto
// (qanun / guzheng / gayageum), harp (bandura), nylon guitar (oud / tres) and pizzicato. Sustained notes loop a
// cross-faded section, so a chord can hold for as long as the score asks. Synth voices stay as the fallback.
const SMP_META={"acc":[{"m":48,"o":0.0,"n":2.75,"l":[1.0,2.75],"r":0.229},{"m":54,"o":2.95,"n":2.75,"l":[1.0,2.75],"r":0.221},{"m":60,"o":5.9,"n":2.75,"l":[1.0,2.75],"r":0.204},{"m":66,"o":8.8501,"n":2.75,"l":[1.0,2.75],"r":0.233},{"m":72,"o":11.8001,"n":2.75,"l":[1.0,2.75],"r":0.159}],"pno":[{"m":24,"o":14.7501,"n":3.1,"l":null,"r":0.322},{"m":30,"o":18.0501,"n":3.1,"l":null,"r":0.321},{"m":36,"o":21.3501,"n":3.1,"l":null,"r":0.246},{"m":42,"o":24.6501,"n":3.1,"l":null,"r":0.3},{"m":48,"o":27.9501,"n":3.1,"l":null,"r":0.199}],"gtr":[{"m":36,"o":31.2501,"n":2.2,"l":null,"r":0.308},{"m":42,"o":33.6501,"n":2.2,"l":null,"r":0.302},{"m":48,"o":36.0501,"n":2.2,"l":null,"r":0.267},{"m":54,"o":38.4501,"n":2.2,"l":null,"r":0.294},{"m":60,"o":40.8501,"n":2.2,"l":null,"r":0.198},{"m":66,"o":43.2501,"n":2.2,"l":null,"r":0.152}],"cel":[{"m":36,"o":45.6501,"n":2.75,"l":[1.0,2.75],"r":0.157},{"m":42,"o":48.6001,"n":2.75,"l":[1.0,2.75],"r":0.199},{"m":48,"o":51.5502,"n":2.75,"l":[1.0,2.75],"r":0.219},{"m":54,"o":54.5002,"n":2.75,"l":[1.0,2.75],"r":0.328},{"m":60,"o":57.4502,"n":2.75,"l":[1.0,2.75],"r":0.274}],"cho":[{"m":48,"o":60.4002,"n":2.75,"l":[1.0,2.75],"r":0.188},{"m":54,"o":63.3502,"n":2.75,"l":[1.0,2.75],"r":0.173},{"m":60,"o":66.3003,"n":2.75,"l":[1.0,2.75],"r":0.184},{"m":66,"o":69.2503,"n":2.75,"l":[1.0,2.75],"r":0.246},{"m":72,"o":72.2003,"n":2.75,"l":[1.0,2.75],"r":0.215}],"cla":[{"m":54,"o":75.1503,"n":2.75,"l":[1.0,2.75],"r":0.289},{"m":60,"o":78.1004,"n":2.75,"l":[1.0,2.75],"r":0.362},{"m":66,"o":81.0504,"n":2.75,"l":[1.0,2.75],"r":0.32},{"m":72,"o":84.0004,"n":2.75,"l":[1.0,2.75],"r":0.449},{"m":78,"o":86.9504,"n":2.75,"l":[1.0,2.75],"r":0.451}],"cbs":[{"m":36,"o":89.9005,"n":2.75,"l":[1.0,2.75],"r":0.363},{"m":42,"o":92.8505,"n":2.75,"l":[1.0,2.75],"r":0.328},{"m":48,"o":95.8005,"n":2.75,"l":[1.0,2.75],"r":0.297}],"flt":[{"m":60,"o":98.7505,"n":2.75,"l":[1.0,2.75],"r":0.326},{"m":66,"o":101.7005,"n":2.75,"l":[1.0,2.75],"r":0.362},{"m":72,"o":104.6506,"n":2.75,"l":[1.0,2.75],"r":0.354},{"m":78,"o":107.6006,"n":2.75,"l":[1.0,2.75],"r":0.418},{"m":84,"o":110.5506,"n":2.75,"l":[1.0,2.75],"r":0.477}],"hrn":[{"m":36,"o":113.5006,"n":2.75,"l":[1.0,2.75],"r":0.232},{"m":42,"o":116.4507,"n":2.75,"l":[1.0,2.75],"r":0.262},{"m":48,"o":119.4007,"n":2.75,"l":[1.0,2.75],"r":0.217},{"m":54,"o":122.3507,"n":2.75,"l":[1.0,2.75],"r":0.247},{"m":60,"o":125.3007,"n":2.75,"l":[1.0,2.75],"r":0.284},{"m":66,"o":128.2507,"n":2.75,"l":[1.0,2.75],"r":0.326}],"kot":[{"m":48,"o":131.2008,"n":3.1,"l":null,"r":0.146},{"m":54,"o":134.5008,"n":3.1,"l":null,"r":0.123},{"m":60,"o":137.8008,"n":3.1,"l":null,"r":0.105},{"m":66,"o":141.1008,"n":3.1,"l":null,"r":0.096},{"m":72,"o":144.4008,"n":3.1,"l":null,"r":0.115},{"m":78,"o":147.7008,"n":3.1,"l":null,"r":0.094}],"hrp":[{"m":36,"o":151.0008,"n":3.1,"l":null,"r":0.243},{"m":42,"o":154.3008,"n":3.1,"l":null,"r":0.206},{"m":48,"o":157.6008,"n":3.1,"l":null,"r":0.249},{"m":54,"o":160.9008,"n":3.1,"l":null,"r":0.268},{"m":60,"o":164.2008,"n":3.1,"l":null,"r":0.32},{"m":66,"o":167.5008,"n":3.1,"l":null,"r":0.189},{"m":72,"o":170.8008,"n":3.1,"l":null,"r":0.156}],"pfl":[{"m":60,"o":174.1008,"n":2.75,"l":[1.0,2.75],"r":0.388},{"m":66,"o":177.0508,"n":2.75,"l":[1.0,2.75],"r":0.391},{"m":72,"o":180.0008,"n":2.75,"l":[1.0,2.75],"r":0.383},{"m":78,"o":182.9508,"n":2.75,"l":[1.0,2.75],"r":0.401},{"m":84,"o":185.9009,"n":2.75,"l":[1.0,2.75],"r":0.421}],"piz":[{"m":36,"o":188.8509,"n":2.2,"l":null,"r":0.226},{"m":42,"o":191.2509,"n":2.2,"l":null,"r":0.244},{"m":48,"o":193.6509,"n":2.2,"l":null,"r":0.236},{"m":54,"o":196.0509,"n":2.2,"l":null,"r":0.18},{"m":60,"o":198.4509,"n":2.2,"l":null,"r":0.213},{"m":66,"o":200.8509,"n":2.2,"l":null,"r":0.151},{"m":72,"o":203.2509,"n":2.2,"l":null,"r":0.149}],"shn":[{"m":60,"o":205.6509,"n":2.75,"l":[1.0,2.75],"r":0.262},{"m":66,"o":208.6009,"n":2.75,"l":[1.0,2.75],"r":0.275},{"m":72,"o":211.5509,"n":2.75,"l":[1.0,2.75],"r":0.233},{"m":78,"o":214.501,"n":2.75,"l":[1.0,2.75],"r":0.335}],"sit":[{"m":48,"o":217.451,"n":3.1,"l":null,"r":0.223},{"m":54,"o":220.751,"n":3.1,"l":null,"r":0.202},{"m":60,"o":224.051,"n":3.1,"l":null,"r":0.176},{"m":66,"o":227.351,"n":3.1,"l":null,"r":0.16},{"m":72,"o":230.651,"n":3.1,"l":null,"r":0.131}],"str":[{"m":48,"o":233.951,"n":2.75,"l":[1.0,2.75],"r":0.237},{"m":54,"o":236.901,"n":2.75,"l":[1.0,2.75],"r":0.188},{"m":60,"o":239.851,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":66,"o":242.801,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":72,"o":245.7511,"n":2.75,"l":[1.0,2.75],"r":0.177},{"m":78,"o":248.7011,"n":2.75,"l":[1.0,2.75],"r":0.226}],"tai":[{"m":36,"o":251.6511,"n":3.1,"l":null,"r":0.256},{"m":48,"o":254.9511,"n":3.1,"l":null,"r":0.223}],"tim":[{"m":36,"o":258.2511,"n":3.1,"l":null,"r":0.159},{"m":42,"o":261.5511,"n":3.1,"l":null,"r":0.201},{"m":48,"o":264.8511,"n":3.1,"l":null,"r":0.124}],"tbn":[{"m":36,"o":268.1511,"n":2.75,"l":[1.0,2.75],"r":0.161},{"m":42,"o":271.1011,"n":2.75,"l":[1.0,2.75],"r":0.157},{"m":48,"o":274.0512,"n":2.75,"l":[1.0,2.75],"r":0.253},{"m":54,"o":277.0012,"n":2.75,"l":[1.0,2.75],"r":0.347},{"m":60,"o":279.9512,"n":2.75,"l":[1.0,2.75],"r":0.451}],"tpt":[{"m":54,"o":282.9012,"n":2.75,"l":[1.0,2.75],"r":0.162},{"m":60,"o":285.8512,"n":2.75,"l":[1.0,2.75],"r":0.164},{"m":66,"o":288.8013,"n":2.75,"l":[1.0,2.75],"r":0.167},{"m":72,"o":291.7513,"n":2.75,"l":[1.0,2.75],"r":0.213},{"m":78,"o":294.7013,"n":2.75,"l":[1.0,2.75],"r":0.248}],"tba":[{"m":24,"o":297.6513,"n":2.75,"l":[1.0,2.75],"r":0.186},{"m":30,"o":300.6014,"n":2.75,"l":[1.0,2.75],"r":0.243},{"m":36,"o":303.5514,"n":2.75,"l":[1.0,2.75],"r":0.264},{"m":42,"o":306.5014,"n":2.75,"l":[1.0,2.75],"r":0.353}],"vln":[{"m":55,"o":309.4514,"n":2.75,"l":[1.0,2.75],"r":0.258},{"m":61,"o":312.4015,"n":2.75,"l":[1.0,2.75],"r":0.279},{"m":67,"o":315.3515,"n":2.75,"l":[1.0,2.75],"r":0.28},{"m":73,"o":318.3015,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":79,"o":321.2515,"n":2.75,"l":[1.0,2.75],"r":0.245},{"m":85,"o":324.2015,"n":2.75,"l":[1.0,2.75],"r":0.234}]};const SMP={st:null,ok:null};
const CAL={str:1,cbs:1,cel:1,vln:1,cho:1,hrn:1,tbn:1,tpt:1,tba:1,tim:1,tai:1,pno:1,flt:1,pfl:1,shn:1,cla:1,acc:1,sit:1,kot:1,hrp:1,gtr:1,piz:1};/*SMPCAL*/
const FCAL={"strings": 0.603, "choir": 1.85, "horn": 2.762, "trumpet": 3.183, "trombone": 2.486, "hornsec": 1.6, "braam": 1.453, "spicc": 1.716, "taiko": 1.595, "pianoLow": 1.167, "zurna": 2.486, "clarinet": 1.973, "harmonium": 1.896, "bowed": 3.249, "flute": 2.272, "ney": 2.049, "i_oud": 1.171, "i_tres": 1.297, "i_qanun": 1.254, "i_guzheng": 1.078, "i_gayageum": 1.591, "i_sitar": 1.141, "i_bandura": 1.455, "i_strings": 0.938};
function smpLoad(){if(!AU.ctx||SMP.st||!SMP_META.str)return;SMP.st='loading';
  fetch('mus/smp.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(b=>new Promise((res,rej)=>AU.ctx.decodeAudioData(b,res,rej))).then(buf=>{
    const sr=buf.sampleRate,d=buf.getChannelData(0),ok={};
    for(const k in SMP_META){ok[k]=[];for(const s of SMP_META[k]){let o=Math.floor(s.o*sr);const a=Math.max(0,o-Math.floor(.1*sr)),z=Math.min(d.length,o+Math.floor(.25*sr));
      let on=-1;for(let i=a;i<z;i++)if(Math.abs(d[i])>.004){on=i;break;}if(on>=0)o=Math.max(0,on-Math.floor(.004*sr));// mp3 decoder delay
      const n=Math.min(d.length-o,Math.floor(s.n*sr));if(n<200)continue;const b2=AU.ctx.createBuffer(1,n,sr);b2.getChannelData(0).set(d.subarray(o,o+n));ok[k].push({m:s.m,buf:b2,l:s.l,r:s.r});}}
    SMP.ok=ok;SMP.st='ok';}).catch(()=>{SMP.st='fail';});}
function m2f(m){return 440*Math.pow(2,(m-69)/12);}
function sPlay(k,f,t,dur,gain,pan,att,rel,from){const L=SMP.ok&&SMP.ok[k];if(!L||!L.length||!(f>0))return null;const m=69+12*Math.log2(f/440);let b=L[0];for(const s of L)if(Math.abs(s.m-m)<Math.abs(b.m-m))b=s;
  const c=AU.ctx,src=c.createBufferSource();src.buffer=b.buf;const rt=Math.pow(2,(m-b.m)/12);
  if(from&&Math.abs(from/f-1)<.4){src.playbackRate.setValueAtTime(rt*from/f,t);src.playbackRate.exponentialRampToValueAtTime(rt,t+.09);}else src.playbackRate.value=rt;
  if(b.l){src.loop=true;src.loopStart=b.l[0];src.loopEnd=b.l[1];}
  att=att||.008;rel=rel||.25;const g=c.createGain(),v=Math.max(0,gain*(CAL[k]||1)*(.2/Math.max(.05,b.r))),end=t+Math.max(att+.01,dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.setValueAtTime(v,end);g.gain.setTargetAtTime(.0001,end,rel/3.5);
  src.connect(g);panTo(g,pan||0);src.start(t);src.stop(end+rel*1.4+.05);return src;}
// keep the synth versions, then route each voice to its recorded instrument when the samples are ready
const SYN={strings,choir,brass,reed,bowed,flute,hornsec,spicc,taiko,pianoLow,braam,inst,drum};
strings=function(f,t,dur,gain){if(!SMP.ok)return SYN.strings(f,t,dur,gain);gain*=FCAL.strings||1;const at=Math.min(.6,dur*.3),rl=Math.min(1.2,dur*.35);
  sPlay('str',f,t,dur,gain*.5,-.35,at,rl);sPlay('str',f*1.002,t+.012,dur,gain*.42,.35,at,rl);sPlay(f<110?'cbs':'cel',f/(f<220?1:2),t,dur,gain*.36,0,at,rl);SYN.strings(f,t,dur,gain*.18);};
choir=function(f,t,dur,gain){if(!SMP.ok)return SYN.choir(f,t,dur,gain);gain*=FCAL.choir||1;while(f>260)f/=2;while(f<120)f*=2;sPlay('cho',f,t,Math.max(dur,.4),gain*.85,-.25,.35,.6);sPlay('cho',f*1.003,t+.02,Math.max(dur,.4),gain*.7,.25,.4,.6);};
brass=function(f,t,dur,gain,bright){if(!SMP.ok)return SYN.brass(f,t,dur,gain,bright);gain*=FCAL[(bright>=3000?'trumpet':f<140?'trombone':'horn')]||1;const k=bright>=3000?'tpt':f<140?'tbn':'hrn';sPlay(k,f,t,dur,gain*.95,(Math.random()-.5)*.4,.03,.22);if(k!=='tpt'&&f<300)sPlay('tbn',f,t,dur,gain*.35,0,.04,.2);};
hornsec=function(f,t,dur,gain){if(!SMP.ok)return SYN.hornsec(f,t,dur,gain);gain*=FCAL.hornsec||1;while(f>420)f/=2;const at=Math.min(.35,dur*.3);sPlay('hrn',f,t,dur,gain*.55,-.4,at,.5);sPlay('hrn',f*1.003,t+.015,dur,gain*.5,.4,at,.5);sPlay('tbn',f/2,t,dur,gain*.42,0,at,.5);sPlay('tba',f/4,t,dur,gain*.3,0,at,.5);};
braam=function(f,t,dur,gain){SYN.braam(f,t,dur,SMP.ok?gain*.5:gain);if(SMP.ok){gain*=FCAL.braam||1;sPlay('tbn',f,t,dur,gain*.6,-.2,.06,.5);sPlay('tba',f/2,t,dur,gain*.55,.2,.06,.5);sPlay('hrn',f*2,t,dur,gain*.3,0,.08,.5);}};
spicc=function(f,t,gain,pan){if(!SMP.ok)return SYN.spicc(f,t,gain,pan);gain*=FCAL.spicc||1;while(f>700)f/=2;sPlay(f<200?'cel':'vln',f,t,.12,gain*.8,pan,.004,.07);sPlay('piz',f,t,.15,gain*.35,-(pan||0),.002,.1);SYN.spicc(f,t,gain*.3,pan);};
taiko=function(t,g,low){if(!SMP.ok)return SYN.taiko(t,g,low);g*=FCAL.taiko||1;sPlay('tai',low?m2f(36):m2f(48),t,1.2,g*.9,(Math.random()-.5)*.3,.002,.4);if(low)sPlay('tim',m2f(36),t,1.4,g*.5,0,.002,.6);SYN.taiko(t,g*.35,low);};
pianoLow=function(f,t,gain){if(!SMP.ok)return SYN.pianoLow(f,t,gain);gain*=FCAL.pianoLow||1;sPlay('pno',f,t,2.2,gain*1.1,0,.003,.8);};
reed=function(f,t,dur,gain,kind){if(!SMP.ok)return SYN.reed(f,t,dur,gain,kind);gain*=FCAL[kind]||1;const k=kind==='zurna'?'shn':kind==='clarinet'?'cla':'acc';sPlay(k,f,t,dur,gain*1.2,0,kind==='harmonium'?.06:.03,.15);};
bowed=function(f,t,dur,gain,from){if(!SMP.ok)return SYN.bowed(f,t,dur,gain,from);gain*=FCAL.bowed||1;sPlay('vln',f,t,dur,gain*1.25,.1,.06,.18,from);};
flute=function(f,t,dur,gain,ney){if(!SMP.ok)return SYN.flute(f,t,dur,gain,ney);gain*=FCAL[(ney?'ney':'flute')]||1;sPlay(ney?'pfl':'flt',f,t,dur,gain*1.2,0,ney?.08:.04,.2);if(ney)nz(AU.mus,t,dur*.8,'bandpass',f*1.5,0,gain*.08,3);};
const PLK={oud:['gtr',1,1.3],tres:['gtr',2,1.1],qanun:['kot',2,1.1],guzheng:['kot',2,1.2],gayageum:['kot',1,1.3],sitar:['sit',2,1.2],bandura:['hrp',2,1.2],strings:['str',2,.9]};
inst=function(kind,f,t,dur,gain,syl){const p=SMP.ok&&PLK[kind];if(!p)return SYN.inst(kind,f,t,dur,gain,syl);gain*=FCAL['i_'+kind]||1;
  if(kind==='strings'){sPlay('vln',f*2,t,dur,gain*.8,-.2,.06,.25);sPlay('str',f*2,t,dur,gain*.5,.2,.08,.3);}
  else{const fr=f*p[1];sPlay(p[0],fr,t,Math.max(dur,.5),gain*p[2],(Math.random()-.5)*.3,.002,.35);if(kind==='oud'&&dur>.45)sPlay('gtr',fr,t+dur*.5,dur*.5,gain*.8,0,.002,.3);if(kind==='qanun')sPlay('hrp',f,t,dur,gain*.35,0,.002,.3);}
  AU.lastF=f*2;};
drum=function(t,k,g=1){SYN.drum(t,k,g);if(!SMP.ok)return;if(k==='B'||k==='G')sPlay('tai',m2f(k==='G'?36:43),t,1.2,g*.55,0,.002,.4);else if(k==='P')sPlay('tim',(AU.style?AU.style.root:55)*1.5,t,1.2,g*.6,0,.002,.5);};

// ===== Your own music =====
// Players can import their own tracks (mp3, m4a, ogg, wav, flac...). They are kept in this browser (IndexedDB)
// and play through the music bus, so the music volume, the music toggle and the voice ducking all apply.
const MYM={list:[],el:null,src:null,i:-1,url:null,on:false};
function myMode(){try{return localStorage.getItem('ww3_sndtrk')||'score';}catch(e){return 'score';}}
function setMyMode(v){try{localStorage.setItem('ww3_sndtrk',v);}catch(e){}}
function myDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open('ww3_music',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function myList(){try{const db=await myDB();return await new Promise(res=>{const q=db.transaction('t').objectStore('t').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([]);});}catch(e){return MYM.mem||[];}}
async function myAdd(files){const add=[...files].filter(f=>/^audio\//.test(f.type)||/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name)).slice(0,60);if(!add.length)return 0;
  try{const db=await myDB();await new Promise((res,rej)=>{const tx=db.transaction('t','readwrite'),st=tx.objectStore('t');for(const f of add)st.add({name:f.name.replace(/\.[^.]+$/,''),blob:f});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
  catch(e){MYM.mem=(MYM.mem||[]).concat(add.map((f,i)=>({id:Date.now()+i,name:f.name.replace(/\.[^.]+$/,''),blob:f})));}// storage blocked: keep them for this session
  MYM.list=await myList();return add.length;}
async function myClear(){try{const db=await myDB();await new Promise(res=>{const tx=db.transaction('t','readwrite');tx.objectStore('t').clear();tx.oncomplete=res;tx.onerror=res;});}catch(e){}MYM.mem=[];MYM.list=[];myStop();}
function myStop(){MYM.on=false;if(MYM.el){try{MYM.el.pause();}catch(e){}}if(MYM.url){URL.revokeObjectURL(MYM.url);MYM.url=null;}}
function myNext(){if(!AU.ctx||!MYM.list.length)return false;let i=MYM.list.length>1?Math.floor(Math.random()*MYM.list.length):0;if(MYM.list.length>1&&i===MYM.i)i=(i+1)%MYM.list.length;MYM.i=i;const tr=MYM.list[i];
  if(!MYM.el){MYM.el=new Audio();MYM.el.preload='auto';MYM.el.onended=()=>{if(MYM.on)myNext();};MYM.el.onerror=()=>{if(MYM.on&&MYM.list.length>1)setTimeout(myNext,300);};
    try{MYM.src=AU.ctx.createMediaElementSource(MYM.el);const g=AU.ctx.createGain();g.gain.value=4.2;MYM.src.connect(g);g.connect(AU.mus);}catch(e){MYM.src=null;}}
  if(MYM.url)URL.revokeObjectURL(MYM.url);MYM.url=URL.createObjectURL(tr.blob);MYM.el.src=MYM.url;MYM.on=true;if(!MYM.src)MYM.el.volume=Math.min(1,SET.mus/100);
  MYM.el.play().catch(()=>{});try{if(typeof pushLog==='function'&&AU.musicOn)pushLog('♪ '+tr.name);}catch(e){}myUI();return true;}
async function myStart(){MYM.list=await myList();if(myMode()==='mine'&&MYM.list.length&&AU.ctx){MYM.keep=1;stopMusic();MYM.keep=0;myNext();return true;}myStop();if(G&&!G.over&&!AU.timer&&G.teams&&G.teams[ME])_startMusic(G.teams[ME].fac);return false;}
function myUI(){const n=$('myN');if(n)n.textContent=MYM.list.length?(MYM.list.length+' track'+(MYM.list.length>1?'s':'')+' imported'+(MYM.on&&MYM.list[MYM.i]?' · now playing: '+MYM.list[MYM.i].name:'')):'No tracks imported yet';
  const s=$('sTrk');if(s)for(const b of s.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===myMode());}
const _startMusic=startMusic,_stopMusic=stopMusic;
stopMusic=function(){_stopMusic();if(!MYM.keep)myStop();};
startMusic=function(style){if(!AU.ctx)return;smpLoad();myStop();_startMusic(style);if(myMode()==='mine')myStart();};

/* ================= CINEMATIC POST-PROCESSING: HDR, bloom, grading, vignette ================= */
const POST={on:true,rt:null,bA:null,bB:null,bC:null,bD:null,quad:null,scn:null,cam:null,mBright:null,mBlur:null,mFinal:null,w:0,h:0};
const FSV=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
function initPost(){try{
  POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);POST.scn=new THREE.Scene();POST.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null);POST.quad.frustumCulled=false;POST.scn.add(POST.quad);
  POST.mBright=new THREE.ShaderMaterial({uniforms:{tex:{value:null}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex;varying vec2 vUv;void main(){vec3 c=texture2D(tex,vUv).rgb;if(!(c.r==c.r&&c.g==c.g&&c.b==c.b)||max(c.r,max(c.g,c.b))>1e4)c=vec3(0.);c=min(c,vec3(60.));float l=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(.95,2.6,l),1.);}`});
  POST.mBlur=new THREE.ShaderMaterial({uniforms:{tex:{value:null},dir:{value:new THREE.Vector2()}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex;uniform vec2 dir;varying vec2 vUv;void main(){vec4 c=texture2D(tex,vUv)*.227;c+=texture2D(tex,vUv+dir*1.385)*.316;c+=texture2D(tex,vUv-dir*1.385)*.316;c+=texture2D(tex,vUv+dir*3.231)*.07;c+=texture2D(tex,vUv-dir*3.231)*.07;gl_FragColor=c;}`});
  POST.mFinal=new THREE.ShaderMaterial({uniforms:{tex:{value:null},b1:{value:null},b2:{value:null},t:{value:0},flash:{value:0},res:{value:new THREE.Vector2(1,1)},expo:{value:.92}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex,b1,b2,ao;uniform float t,flash,expo,aoK,fogK;uniform vec2 res;varying vec2 vUv;
      vec3 aces(vec3 x){x*=.6;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      vec3 okc(vec3 c){return (c.r==c.r&&c.g==c.g&&c.b==c.b&&max(c.r,max(c.g,c.b))<1e4)?c:vec3(.5);}
      void main(){vec2 px=1./res;vec3 c=okc(texture2D(tex,vUv).rgb);
        vec3 n=texture2D(tex,vUv+vec2(px.x,0.)).rgb+texture2D(tex,vUv-vec2(px.x,0.)).rgb+texture2D(tex,vUv+vec2(0.,px.y)).rgb+texture2D(tex,vUv-vec2(0.,px.y)).rgb;
        c=c+(c-n*.25)*.35;vec4 oc4=texture2D(ao,vUv);vec3 oc=oc4.rgb;c*=mix(1.,oc.r,aoK)*mix(1.,oc.g,step(.01,aoK));float fgv=smoothstep(.05,.8,oc.b)*fogK;float lf=dot(c,vec3(.2126,.7152,.0722));c=mix(c,mix(vec3(lf),c,.55)*vec3(.58,.57,.58),fgv*.9);c=mix(c,vec3(.62,.5,.36)*(.8+.4*lf),smoothstep(.32,.95,oc4.a)*.42*step(.01,aoK));
        vec3 bl=okc(texture2D(b1,vUv).rgb)*.75+okc(texture2D(b2,vUv).rgb)*.9;bl=min(bl,vec3(8.));c+=bl*.5;
        c*=expo*(1.+flash*1.5);c=aces(c);
        float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,.78);c=mix(c*vec3(.95,.98,1.04),c,smoothstep(.05,.45,l));c=mix(c,c*vec3(1.02,1.,.95),.6);
        c=pow(c,vec3(1./2.2));
        c=(c-.5)*1.1+.5;c+=vec3(.012,.004,-.012)*(1.-l)+vec3(.03,.012,-.02)*l;
        vec2 q=vUv-.5;c*=1.-dot(q,q)*.75;
        c+=(h(vUv*res+t*61.)-.5)*.022;
        gl_FragColor=vec4(clamp(c,0.,1.),1.);}`});
  POST.mAO=new THREE.ShaderMaterial({uniforms:{dep:{value:null},near:{value:10},far:{value:9000},tanF:{value:new THREE.Vector2(1,1)},res:{value:new THREE.Vector2(1,1)},rad:{value:22},pm:{value:1},cw:{value:new THREE.Matrix4()},tt:{value:0},fogT:{value:null},mapS:{value:new THREE.Vector2(1,1)},cloudK:{value:1}},vertexShader:FSV,depthTest:false,depthWrite:false,extensions:{derivatives:true},
    fragmentShader:`uniform sampler2D dep;uniform float near,far,rad,pm,tt,cloudK;uniform mat4 cw;uniform vec2 tanF,res,mapS;uniform sampler2D fogT;varying vec2 vUv;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
      float vz(vec2 uv){float d=texture2D(dep,uv).x;return (near*far)/((far-near)*d-far);}
      vec3 vp(vec2 uv){float z=vz(uv);return vec3((uv*2.-1.)*tanF*(-z),z);}
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float d0=texture2D(dep,vUv).x;if(d0>=.99999){gl_FragColor=vec4(1.,1.,1.,1.);return;}
        vec3 P=vp(vUv);vec3 N=normalize(cross(dFdx(P),dFdy(P)));
        float rpx=rad*pm/(-P.z);float a0=h(vUv*res)*6.2832;float ao=0.;
        for(int i=0;i<14;i++){float fi=float(i);float ang=a0+fi*2.39996;float r=sqrt((fi+.5)/14.)*rpx;vec2 uv=vUv+vec2(cos(ang),sin(ang))*r/res;
          vec3 v=vp(uv)-P;float dd=dot(v,v);ao+=max(0.,dot(N,v)-.04*(-P.z)*.02)/(dd+rad*rad*.08)*smoothstep(rad*rad*4.,0.,dd);}
        ao=pow(clamp(1.-ao*rad*.32/14.*6.,0.,1.),1.4);
        vec3 W3=(cw*vec4(P,1.)).xyz;vec2 fu=vec2(W3.x/mapS.x,1.-W3.z/mapS.y);float fg=(fu.x<0.||fu.x>1.||fu.y<0.||fu.y>1.)?1.:texture2D(fogT,fu).r;vec2 w=W3.xz*.00032+vec2(tt*.004,tt*.0016);float n=vn(w)*.75+vn(w*2.1+3.1)*.25;float cl=1.-.15*cloudK*smoothstep(.3,.95,n);
        gl_FragColor=vec4(ao,cl,fg,clamp(-P.z/2600.,0.,1.));}`});
  POST.ovr=new THREE.MeshBasicMaterial({colorWrite:false});
  POST.mFinal.uniforms.ao={value:null};POST.mFinal.uniforms.aoK={value:.85};POST.mFinal.uniforms.fogK={value:0};
  return true;}catch(e){POST.on=false;return false;}}
function sizePost(){const w=Math.max(2,Math.round(VW*dpr)),h=Math.max(2,Math.round(VH*dpr));if(w===POST.w&&h===POST.h&&POST.rt)return;POST.w=w;POST.h=h;
  for(const k of ['rt','bA','bB','bC','bD','dRT','aA','aB'])if(POST[k])POST[k].dispose();
  const opt={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true};
  const wgl2=R3.capabilities.isWebGL2;POST.rt=wgl2&&THREE.WebGLMultisampleRenderTarget?new THREE.WebGLMultisampleRenderTarget(w,h,Object.assign({samples:4},opt)):new THREE.WebGLRenderTarget(w,h,opt);
  const s={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
  POST.dRT=new THREE.WebGLRenderTarget(w>>1,h>>1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});POST.dRT.depthTexture=new THREE.DepthTexture(w>>1,h>>1);POST.dRT.depthTexture.type=THREE.UnsignedIntType;
  const s2={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};POST.aA=new THREE.WebGLRenderTarget(w>>1,h>>1,s2);POST.aB=new THREE.WebGLRenderTarget(w>>1,h>>1,s2);
  POST.bA=new THREE.WebGLRenderTarget(w>>2,h>>2,s);POST.bB=new THREE.WebGLRenderTarget(w>>2,h>>2,s);POST.bC=new THREE.WebGLRenderTarget(w>>3,h>>3,s);POST.bD=new THREE.WebGLRenderTarget(w>>3,h>>3,s);}
function softP(on){for(const P of [PN_,PA_]){if(!P)continue;const u=P.m.uniforms;u.soft.value=on?1:0;P.m.depthTest=!on;if(on){u.dep.value=POST.dRT.depthTexture;u.sres.value.set(POST.w,POST.h);u.nf.value.set(CAM.near,CAM.far);}}}
function pass(mat,target){POST.quad.material=mat;R3.setRenderTarget(target);R3.render(POST.scn,POST.cam);}
function renderPost(){if(!POST.on||!POST.mFinal){softP(false);R3.setRenderTarget(null);R3.render(SCN,CAM);return;}
  sizePost();
  const fogWas=FOGM?FOGM.visible:false;let postFog=false;
  if(POST.mAO&&POST.aoOn!==false){if(FOGM&&FOGT){postFog=fogWas;FOGM.visible=false;}const hid=[];SCN.traverse(o=>{if(!o.visible)return;const m=o.material;if(o.userData.noDepth||o.isPoints||o.isLine||o.isSprite||(m&&(Array.isArray(m)?m[0].transparent:m.transparent))){o.visible=false;hid.push(o);}});
    const bg=SCN.background;SCN.overrideMaterial=POST.ovr;R3.setRenderTarget(POST.dRT);R3.clear();R3.render(SCN,CAM);SCN.overrideMaterial=null;for(const o of hid)o.visible=true;
    const A=POST.mAO.uniforms;A.dep.value=POST.dRT.depthTexture;A.near.value=CAM.near;A.far.value=CAM.far;const ty=Math.tan(CAM.fov*Math.PI/360);A.tanF.value.set(ty*CAM.aspect,ty);A.res.value.set(POST.dRT.width,POST.dRT.height);A.pm.value=POST.dRT.height/(2*ty);A.cw.value.copy(CAM.matrixWorld);A.tt.value=performance.now()/1000;A.fogT.value=FOGT;A.cloudK.value=POST.cloud??1;A.mapS.value.set(MAPW,MAPH);POST.mFinal.uniforms.fogK.value=postFog?1:0;
    pass(POST.mAO,POST.aA);const ab=(src,dst,x,y)=>{POST.mBlur.uniforms.tex.value=src.texture;POST.mBlur.uniforms.dir.value.set(x/src.width,y/src.height);pass(POST.mBlur,dst);};ab(POST.aA,POST.aB,1,0);ab(POST.aB,POST.aA,0,1);
    POST.mFinal.uniforms.ao.value=POST.aA.texture;POST.mFinal.uniforms.aoK.value=.85;softP(true);}else if(POST.mFinal.uniforms.ao){softP(false);POST.mFinal.uniforms.aoK.value=0;POST.mFinal.uniforms.fogK.value=0;POST.mFinal.uniforms.ao.value=POST.bA.texture;}
  R3.setRenderTarget(POST.rt);R3.clear();R3.render(SCN,CAM);if(FOGM)FOGM.visible=fogWas;
  POST.mBright.uniforms.tex.value=POST.rt.texture;pass(POST.mBright,POST.bA);
  const bl=(src,dst,w,h,x,y)=>{POST.mBlur.uniforms.tex.value=src.texture;POST.mBlur.uniforms.dir.value.set(x/w,y/h);pass(POST.mBlur,dst);};
  bl(POST.bA,POST.bB,POST.bA.width,POST.bA.height,1,0);bl(POST.bB,POST.bA,POST.bA.width,POST.bA.height,0,1);
  POST.mBlur.uniforms.tex.value=POST.bA.texture;POST.mBlur.uniforms.dir.value.set(0,0);pass(POST.mBlur,POST.bC);
  bl(POST.bC,POST.bD,POST.bC.width,POST.bC.height,1.5,0);bl(POST.bD,POST.bC,POST.bC.width,POST.bC.height,0,1.5);
  const F=POST.mFinal.uniforms;F.tex.value=POST.rt.texture;F.b1.value=POST.bA.texture;F.b2.value=POST.bC.texture;F.t.value=performance.now()/1000%100;F.flash.value=flash;F.res.value.set(POST.w,POST.h);
  pass(POST.mFinal,null);}

let WALKSIGN=1;
/* ================= ART ASSETS: real 3D models (Quaternius, Kenney, Zsky, KolosStudios, Alex Safayan, angelo raffaele Catalano, jeremy, Jarlan Perez via Poly Pizza) ================= */
const MODELS={ready:false,proto:{},tinted:{},loading:null,flipX:{}};
const MCFG={
  tank:{m:'tank',fit:'z',size:38},harv:{m:'truck',fit:'z',size:34},dozer:{m:'truck',fit:'z',size:34,extra:'crane'},
  mortar:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],extra:'mortar'},recon:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#4a5242',tk:.5},officer:{m:'soldier',fit:'y',size:15.7,tint:'#3d4a36',tk:.5},medic:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#e8e4da',tk:.35},
  commissar:{m:'soldier',fit:'y',size:15.7,tint:'#5b4a3a',tk:.5},sapper:{m:'soldier',fit:'y',size:14.0,squad:[[3,-4],[-3,4]],tint:'#6a5a3c',tk:.4},guer:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#4c5a3a',tk:.55},atk:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]],tint:'#3c4434',tk:.5},
  idome:{m:'truck',fit:'z',size:36,extra:'samtruck'},ew:{m:'truck',fit:'z',size:35,extra:'dish'},cbr:{m:'truck',fit:'z',size:35,extra:'dish'},jeep:{m:'truck',fit:'z',size:26},atgm:{m:'truck',fit:'z',size:27,extra:'samtruck',tint:'#55603f',tk:.4},saka:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]],tint:'#a08a5c',tk:.5},raidlead:{m:'truck',fit:'z',size:28,extra:'mg'},
  inf:{m:'soldier',fit:'y',size:14.0,squad:[[5,0],[-4,-7],[-4,7]]},at:{m:'soldier',fit:'y',size:14.0,squad:[[3,-5],[-3,5]]},hacker:{m:'soldier',fit:'y',size:13.1,squad:[[3,-4],[-3,4]]},
  hero:{m:'soldier',fit:'y',size:15.7,tint:'#2c302b',tk:.6},heli:{m:'heli',fit:'z',size:54},airlift:{m:'heli',fit:'z',size:72,tint:'#59604f',tk:.5},lander:{m:'boat',fit:'z',size:52,tint:'#6f7478',tk:.5},drone:{m:'drone',fit:'z',size:18,tint:'#7d8287',tk:.8},jet:{m:'jet',fit:'z',size:46},boat:{m:'boat',fit:'z',size:42,tint:'#7a8590',tk:.9},ship:{m:'ship',fit:'z',size:118,tint:'#7d8792',tk:.88},
};
// Realistic models (Objaverse / Sketchfab, CC-BY - authors credited in the menu): each nation fields the hardware it
// actually flies and drives where a licensed model exists.
const RMOD={t90:{m:'m_t90',fit:'z',size:40},hilux:{m:'m_hilux',fit:'z',size:30,extra:'dshk'},d7r:{m:'m_d7r',fit:'z',size:34},jd550:{m:'m_jd550',fit:'z',size:33},apache:{m:'m_apache',fit:'z',size:58},mi24:{m:'m_mi24',fit:'z',size:62},
  f15:{m:'m_f15',fit:'z',size:50},f18:{m:'m_f18',fit:'z',size:48},su35:{m:'m_su35',fit:'z',size:54},rafale:{m:'m_rafale',fit:'z',size:46},typhoon:{m:'m_typhoon',fit:'z',size:46},j10:{m:'m_j10',fit:'z',size:46},mig29:{m:'m_mig29',fit:'z',size:48},f16:{m:'m_f16',fit:'z',size:46},g6:{m:'m_g6',fit:'z',size:40},ozelot:{m:'m_ozelot',fit:'z',size:34},zu:{m:'m_hilux',fit:'z',size:30,extra:'zu23'}};
const RMAP={tank:{RU:'t90',KP:'t90',IR:'t90',UA:'t90',CN:'t90',IN:'t90',EG:'t90',PK:'t90',CU:'t90',RS:'hilux',DW:'hilux'},dozer:{},
  heli:{US:'apache',IL:'apache',EU:'apache',SA:'apache',AE:'apache',EG:'apache',KR:'apache',TR:'apache',IN:'apache',PK:'apache',RU:'mi24',KP:'mi24',IR:'mi24',CN:'mi24',UA:'mi24',CU:'mi24',RS:'mi24',DW:'mi24'},
  jet:{US:'f18',IL:'f16',TR:'f16',EU:'rafale',UA:'typhoon',RU:'su35',IR:'mig29',SA:'f15',AE:'f16',PK:'j10',IN:'rafale',CN:'j10',KP:'mig29',KR:'f15',EG:'rafale',CU:'mig29'}};
for(const f of ['US','TR','IL','EU','UA','RU','IR','SA','AE','PK','IN','CN','KP','KR','EG','CU','RS','DW'])RMAP.dozer[f]='jd550';
const MIL_TANK={RS:{m:'technical',fit:'z',size:29},DW:{m:'technical',fit:'z',size:29},IM:{m:'toontank',fit:'z',size:32}};
for(const f of ['US','IL','EU','SA','AE','EG','KR','TR','CN','PK','IN'])MIL_TANK[f]={m:'tankE',fit:'long',size:37};
const PROPS={container:{fit:'x',size:28},containerG:{fit:'x',size:30},crate:{fit:'y',size:8},barrel:{fit:'y',size:8},sandbag:{fit:'x',size:16},watertower:{fit:'y',size:56},tent:{fit:'x',size:50},pallet:{fit:'x',size:10},fence:{fit:'x',size:24},missile:{fit:'y',size:26},sam:{fit:'y',size:24}};
function b64u8(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function loadModels(){if(MODELS.loading)return MODELS.loading;MODELS.loading=(async()=>{try{
    if(typeof MODEL_PACK==='undefined'||!THREE.GLTFLoader)return false;
    const gz=b64u8(MODEL_PACK);let txt;
    if(typeof DecompressionStream!=='undefined'){txt=await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
    else{await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});txt=pako.ungzip(gz,{to:'string'});}const pack=JSON.parse(txt);const ld=new THREE.GLTFLoader();
    await Promise.all(Object.keys(pack).map(k=>new Promise(res=>{try{ld.parse(b64u8(pack[k]).buffer,'',g=>{MODELS.proto[k]={scene:g.scene,anims:g.animations};res();},()=>res());}catch(e){res();}})));
    for(const k in MODELS.proto)MODELS.proto[k].scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.map)m.map.encoding=THREE.sRGBEncoding;m.roughness=Math.max(.5,m.roughness??.8);m.metalness=Math.min(.35,m.metalness??0);}}});
    MODELS.ready=Object.keys(MODELS.proto).length>0;if(!MODELS.ready)MODELS.err='no models parsed';return MODELS.ready;}catch(e){console.warn('models',e);MODELS.err=String(e&&e.message||e);return false;}})();return MODELS.loading;}
const WX_COMMON=`varying vec3 vWP;float wh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float wn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(wh(i),wh(i+vec3(1,0,0)),f.x),mix(wh(i+vec3(0,1,0)),wh(i+vec3(1,1,0)),f.x),f.y),mix(mix(wh(i+vec3(0,0,1)),wh(i+vec3(1,0,1)),f.x),mix(wh(i+vec3(0,1,1)),wh(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
function weather(m,amt,camo){if(!m||m.userData.wx)return;m.userData.wx=1;amt=amt||1;camo=camo||0;if(camo)m.extensions=Object.assign(m.extensions||{},{derivatives:true});
  m.onBeforeCompile=sh=>{sh.uniforms.wAmt={value:amt};sh.uniforms.wCamo={value:camo};sh.uniforms.wRefl={value:m.userData.refl||0};sh.uniforms.wCA={value:m.userData.camoA||new THREE.Color(.30,.25,.17)};sh.uniforms.wCB={value:m.userData.camoB||new THREE.Color(.13,.15,.10)};sh.uniforms.wPat={value:m.userData.camoP||0};sh.uniforms.wSc={value:m.userData.camoS||1};sh.uniforms.wCC={value:m.userData.camoC||new THREE.Color(.5,.45,.35)};sh.uniforms.wTrim={value:m.userData.trimC||new THREE.Color(.5,.5,.5)};sh.uniforms.wWall={value:m.userData.wall||0};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vOP;varying float vOY;varying vec3 vWN;').replace('#include <project_vertex>','#include <project_vertex>\nvec4 wq=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwq=instanceMatrix*wq;\n#endif\nvWP=(modelMatrix*wq).xyz;vOP=position;vOY=(modelMatrix*vec4(0.,0.,0.,1.)).y;vWN=normalize(mat3(modelMatrix)*objectNormal+vec3(0.,1e-4,0.));');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float wAmt;uniform float wCamo;uniform float wRefl;uniform vec3 wCA;uniform vec3 wCB;uniform float wPat;uniform float wSc;uniform vec3 wCC;uniform vec3 wTrim;uniform float wWall;varying vec3 vOP;varying float vOY;varying vec3 vWN;\n'+WX_COMMON).replace('#include <color_fragment>',`#include <color_fragment>
      float gn=wn(vWP*.11)*.55+wn(vWP*.43)*.3+wn(vWP*1.7)*.15;float st=smoothstep(.55,.85,wn(vWP*vec3(.6,.08,.6)));
      vec3 dust=vec3(.42,.38,.30);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(.78+.36*gn),wAmt);
      diffuseColor.rgb=mix(diffuseColor.rgb,dust*(.8+.3*gn),wAmt*(.10+.16*(1.-gn)));diffuseColor.rgb*=1.-wAmt*.18*st;if(wCamo>0.){vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.3,.59,.11));
        if(lum>.035){vec3 p=vOP*wCamo*wSc;float k=.62+lum*1.25;vec3 paint=base;
          if(wPat<2.5||wPat>3.5){
            // organic, hand-painted shapes: domain-warped noise with crisp anti-aliased edges
            vec3 q=p;if(wPat>1.5&&wPat<2.5)q*=vec3(.42,2.4,2.4);if(wPat>3.5&&wPat<4.5)q*=2.3;
            q+=(vec3(wn(q*.55+3.1),wn(q*.55+7.7),wn(q*.55+1.9))-.5)*1.5;
            float n1=wn(q*.9)*.62+wn(q*2.1)*.38,n2=wn(q*1.05+11.3)*.62+wn(q*2.4+4.1)*.38,n3=wn(q*1.4+23.7)*.6+wn(q*3.1+8.2)*.4;
            if(wPat>.5&&wPat<1.5){vec3 r=q*1.9;n1=wn(r*.9)*.55+wn(r*2.4)*.45;n2=wn(r*1.05+11.3)*.55+wn(r*2.7+4.1)*.45;n3=wn(r*1.4+23.7)*.55+wn(r*3.3+8.2)*.45;}
            if(wPat>4.5&&wPat<5.5){float a=dot(p.xz,vec2(.8,.6))+p.y*.3+wn(p*.6)*1.4;n1=.5+.5*sin(a*2.6);n2=.5+.5*sin(dot(p.xz,vec2(-.5,.86))*2.9+wn(p*.5)*2.);n3=0.;}
            if(wPat>5.5){n1=wn(q*.8)*.7+wn(q*1.9)*.3;n2=wn(p*5.5)*.8+wn(p*11.)*.2;n3=wn(p*5.5+9.)*.8+wn(p*11.+3.)*.2;}
            float caA=max(fwidth(n1),.002),caB=max(fwidth(n2),.002),caC=max(fwidth(n3),.002);
            float ctA=wPat>5.5?.6:.56,ctB=wPat>5.5?.74:.6,ctC=wPat>5.5?.76:.64;
            float cmA=smoothstep(ctA-caA,ctA+caA,n1),cmB=smoothstep(ctB-caB,ctB+caB,n2),cmC=smoothstep(ctC-caC,ctC+caC,n3);
            paint=mix(paint,wCA*k,cmA*.92);paint=mix(paint,wCB*k,cmB*.92);paint=mix(paint,wCC*k,cmC*.85);}
          // weathering: dust and mud up the lower hull, fine paint chips, faint rain streaks
          float hh=vWP.y-vOY;float dust=(1.-smoothstep(.5,5.5,hh))*.5+wn(p*3.7)*.08;paint=mix(paint,vec3(.40,.34,.26)*(.8+lum*.5),clamp(dust,0.,.6));
          float ch=wn(p*16.+5.)*.7+wn(p*33.)*.3;paint=mix(paint,vec3(.16,.16,.15),smoothstep(.74,.76,ch)*.55);
          float st=wn(vec3(p.x*9.,p.y*.7,p.z*9.));paint*=1.-.08*smoothstep(.55,.85,st);
          paint*=mix(.72,1.06,smoothstep(-.7,.85,vWN.y))*mix(.86,1.,smoothstep(0.,3.,hh));
          diffuseColor.rgb=paint;}}
      if(wWall>.5){float hh=vWP.y-vOY,vert=1.-abs(vWN.y);if(vert>.6){vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.3,.59,.11));
        if(wWall<1.5){float b=step(9.,hh)*step(hh,13.);float tl=step(.5,fract((vWP.x+vWP.z)*.35))*.25;diffuseColor.rgb=mix(base,wTrim*(.85+tl),b*.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.92,.88,.78),step(13.,hh)*step(hh,13.8)*.8);}
        else if(wWall<2.5){float g=max(1.-smoothstep(0.,.25,abs(fract(hh/6.)-.5)*6.),1.-smoothstep(0.,.25,abs(fract((vWP.x+vWP.z)/8.)-.5)*8.));diffuseColor.rgb*=1.-.22*g;diffuseColor.rgb=mix(diffuseColor.rgb,wTrim*.9,step(2.,hh)*step(hh,3.4)*.8);}
        else if(wWall<3.5){diffuseColor.rgb=mix(base,wTrim*(.8+lum*.4),step(4.,hh)*step(hh,6.)*.85);}
        else if(wWall<4.5){float cr=1.-smoothstep(0.,.2,abs(fract(hh/2.4)-.5)*2.4);float of=1.-smoothstep(0.,.2,abs(fract((vWP.x+vWP.z)/5.+step(.5,fract(hh/4.8))*.5)-.5)*5.);diffuseColor.rgb*=1.-.16*max(cr,of*step(.5,1.-cr));diffuseColor.rgb=mix(diffuseColor.rgb,wTrim,step(1.,hh)*step(hh,2.2)*.75);}
        else{float b=step(7.,hh)*step(hh,11.);diffuseColor.rgb=mix(base,wTrim,b*.9);float tx=step(.55,fract((vWP.x+vWP.z)*.5))*step(8.,hh)*step(hh,10.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95),tx*b*.8);}}}float dh=1.-smoothstep(1.,9.,vWP.y-vOY);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.45,.33)*(.85+.3*gn),dh*wAmt*.55);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(.5-gn)*.25*wAmt,.3,1.);').replace('#include <dithering_fragment>','#include <dithering_fragment>\n{vec3 vv=normalize(vViewPosition);float rim=pow(1.-clamp(dot(normalize(normal),vv),0.,1.),3.);gl_FragColor.rgb+=vec3(.55,.62,.75)*rim*.22*wAmt*(1.-.6*wRefl);if(wRefl>0.){vec3 Vw=normalize(cameraPosition-vWP),Nw=normalize(vWN+vec3(0.,1e-4,0.));float ndv=clamp(dot(Nw,Vw),0.,1.);vec3 Rw=reflect(-Vw,Nw);vec3 env=Rw.y>0.?mix(vec3(.6,.64,.68),vec3(.33,.48,.74),smoothstep(0.,.6,Rw.y)):vec3(.23,.2,.16);float fr=.04+.96*pow(1.-ndv,5.);float sp=pow(max(dot(Rw,vec3(-.66,.57,-.46)),0.),70.);float lu=dot(gl_FragColor.rgb,vec3(.33));gl_FragColor.rgb=mix(gl_FragColor.rgb,env*(.5+.5*lu),clamp(fr*.5*wRefl,0.,.6))+vec3(1.,.93,.8)*sp*.5*wRefl;}if(wCamo>0.){float up=clamp(vWN.y/max(length(vWN),1e-4),0.,1.);gl_FragColor.rgb+=vec3(.42,.5,.62)*rim*.18+vec3(.06,.07,.08)*up*up;}}');};
  m.customProgramCacheKey=()=>'wx'+amt+'_'+camo+'_'+(m.userData.camoP||0)+'_'+(m.userData.wall||0);}
function normScale(obj,fit,size){obj.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(obj),sz=bb.getSize(new THREE.Vector3());const dim=fit==='y'?sz.y:fit==='x'?sz.x:(fit==='xz'||fit==='long')?Math.max(sz.x,sz.z):sz.z;const s=size/Math.max(.001,dim);const c=bb.getCenter(new THREE.Vector3());return{s,cx:c.x,cz:c.z,my:bb.min.y,xl:sz.x>sz.z};}
const CAMOK={};function camoFreq(key){if(CAMOK[key]!==undefined)return;if(!['tank','tankE','tankW','truck','technical','toontank'].includes(key)){CAMOK[key]=0;return;}const P=MODELS.proto[key];P.scene.updateMatrixWorld(true);let mx=0;P.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,sz=b.getSize(new THREE.Vector3());mx=Math.max(mx,sz.x,sz.y,sz.z);}});CAMOK[key]=mx>0?4/mx:0;}
/* ---------- per-country looks: vehicle paint, camo blotches, uniform colour and national flag ---------- */
const FLOOK={
  US:{veh:'#b8a47e',ca:'#7a6040',cb:'#4b4630',uni:'#a79a78',pat:1}, TR:{veh:'#5f6345',ca:'#4a3a26',cb:'#2a2c20',uni:'#5d6248',pat:1},
  IL:{veh:'#8c8a7a',ca:'#6f6c60',cb:'#56544a',uni:'#6f6b4e',pat:3}, EU:{veh:'#55603f',ca:'#4b3d2a',cb:'#1e201b',uni:'#5c6447',pat:4},
  UA:{veh:'#5a6340',ca:'#3e3a2a',cb:'#2c3024',uni:'#6a6b4c',pat:1}, RU:{veh:'#5d6a3e',ca:'#2b2b25',cb:'#a89a6e',uni:'#65684a',pat:0},
  IR:{veh:'#b5a072',ca:'#8a7651',cb:'#5c5240',uni:'#9a8a64',pat:0}, SA:{veh:'#c2ac80',ca:'#a18a62',cb:'#7d6a4b',uni:'#b19c74',pat:3},
  AE:{veh:'#c6b088',ca:'#a58e66',cb:'#83704f',uni:'#b6a27c',pat:0}, PK:{veh:'#6b6a48',ca:'#8b7a55',cb:'#3d3a2a',uni:'#77714f',pat:0},
  IN:{veh:'#6a6d48',ca:'#4b3e2a',cb:'#9e9468',uni:'#6f6f4f',pat:4}, CN:{veh:'#5c6a46',ca:'#3f4a33',cb:'#7d8662',uni:'#5e6a4c',pat:1},
  KP:{veh:'#4e5636',ca:'#3a3826',cb:'#2a2a20',uni:'#575c3e',pat:3}, KR:{veh:'#535d3c',ca:'#45392a',cb:'#2a2b23',uni:'#5d6347',pat:1},
  EG:{veh:'#c1a97b',ca:'#9d855b',cb:'#7a6644',uni:'#ae976d',pat:3}, CU:{veh:'#59603f',ca:'#3e3a28',cb:'#7d7a55',uni:'#5f6345',pat:3},
  RS:{veh:'#8c7356',ca:'#5c4a37',cb:'#3a3027',uni:'#6b5d48',pat:2}, DW:{veh:'#c4a774',ca:'#9a7f56',cb:'#6e5b3e',uni:'#a68f69',pat:2},
  IM:{veh:'#6a6a58',ca:'#4d4b3f',cb:'#8a8672',uni:'#6c6b57'}};
// Each nation's own camouflage (pattern 0 blotch, 1 digital, 2 tiger stripe, 3 plain paint, 4 flecktarn dots,
// 5 splinter, 6 chocolate-chip) at its own scale with a third colour, and its own building trim and wall finish
// (wall 1 glazed-tile band, 2 concrete panels, 3 painted stripe, 4 stone courses, 5 slogan band).
const CAMOX={US:{p:1,s:1.15,c:'#d6c9a4',t:'#3e5a8a',w:3},TR:{p:1,s:.85,c:'#6f6a4a',t:'#c8102e',w:4},IL:{p:3,s:1,c:'#8f8c7c',t:'#1f5fbf',w:4},EU:{p:4,s:1,c:'#2b3a22',t:'#2c4fa0',w:3},
  UA:{p:1,s:1.35,c:'#7a7a52',t:'#e1b80d',w:3},RU:{p:0,s:.7,c:'#8a8f6a',t:'#b22222',w:2},IR:{p:0,s:1.2,c:'#c4b48c',t:'#1f8a8a',w:1},SA:{p:6,s:1,c:'#e3d6b4',t:'#0f6b3a',w:4},
  AE:{p:3,s:1,c:'#cbb991',t:'#00843d',w:4},PK:{p:0,s:.95,c:'#5a6a3c',t:'#0b6b2b',w:4},IN:{p:5,s:1,c:'#7d7653',t:'#e07b14',w:4},CN:{p:1,s:1.6,c:'#46553a',t:'#c8102e',w:2},
  KP:{p:3,s:1,c:'#4c5434',t:'#c8102e',w:5},KR:{p:1,s:1.1,c:'#3c4530',t:'#1f3f9a',w:2},EG:{p:6,s:1.1,c:'#ddd0aa',t:'#b8862b',w:4},CU:{p:0,s:1.5,c:'#4a5a34',t:'#1e4fa0',w:3},
  RS:{p:2,s:1,c:'#2a2620',t:'#c9a227',w:1},DW:{p:2,s:.8,c:'#7c5a36',t:'#4a2f1c',w:1},IM:{p:3,s:1,c:'#6a6a58',t:'#888',w:0}};
const FLAGTEX={};
// Militia emblems, drawn on a 120x72 canvas: Mountain Shias carry the Zulfiqar (the forked double-bladed sword),
// Coffee Shias a lion standing over a jambiya dagger.
function drawEmblem(x,fac,bg){const W=120,H=72;
  if(fac==='RS'){if(bg){x.fillStyle='#111';x.fillRect(0,0,W,H);x.fillStyle='#b3262c';x.fillRect(0,H*.7,W,H*.3);}
    x.save();x.translate(60,32);x.rotate(-.12);const sil='#e9e7e1',gold='#d6b24a',dk='#2a2a2a';
    // blade with the forked tip
    x.fillStyle=sil;x.beginPath();x.moveTo(-26,-4);x.lineTo(14,-5.5);x.quadraticCurveTo(34,-8,47,-14);x.lineTo(40,-6.5);x.quadraticCurveTo(30,-3,20,-1);x.lineTo(20,1);x.quadraticCurveTo(30,3,40,6.5);x.lineTo(47,14);x.quadraticCurveTo(34,8,14,5.5);x.lineTo(-26,4);x.closePath();x.fill();
    x.strokeStyle='#9a9890';x.lineWidth=1;x.beginPath();x.moveTo(-24,0);x.lineTo(18,0);x.stroke();
    // crossguard, grip, pommel
    x.fillStyle=gold;x.beginPath();x.moveTo(-26,-13);x.quadraticCurveTo(-31,0,-26,13);x.lineTo(-30,13);x.quadraticCurveTo(-35,0,-30,-13);x.closePath();x.fill();
    x.fillStyle=dk;x.fillRect(-46,-3.2,17,6.4);x.fillStyle=gold;for(let i=0;i<4;i++)x.fillRect(-44+i*4,-3.2,1.2,6.4);x.beginPath();x.arc(-48,0,4.2,0,7);x.fill();x.restore();}
  else if(fac==='DW'){if(bg){x.fillStyle='#4a2f1c';x.fillRect(0,0,W,H);x.fillStyle='#c8a46e';x.fillRect(0,H-12,W,12);}
    const gold='#e2b64a',dk='#2b1c10';
    // lion, facing right
    x.fillStyle=gold;x.beginPath();x.ellipse(54,30,22,9,0,0,7);x.fill();
    for(const [lx,ly] of [[38,36],[46,36],[62,36],[70,36]]){x.fillRect(lx-2.5,ly,5,12);x.fillRect(lx-3,ly+10,7,3);}
    x.save();x.translate(80,22);x.fillStyle='#b8862e';x.beginPath();for(let i=0;i<=18;i++){const a=i/18*6.283,r=i%2?8:12.5;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();x.fillStyle=gold;x.beginPath();x.arc(2,1,7,0,7);x.fill();x.fillRect(5,1,7,5);x.fillStyle=dk;x.beginPath();x.arc(4,-1.5,1.3,0,7);x.fill();x.restore();
    x.strokeStyle=gold;x.lineWidth=2.6;x.lineCap='round';x.beginPath();x.moveTo(33,27);x.quadraticCurveTo(20,20,24,10);x.stroke();x.fillStyle='#b8862e';x.beginPath();x.arc(24,9,3,0,7);x.fill();
    // jambiya: wide hilt and a sharply curved blade
    x.save();x.translate(60,58);x.fillStyle='#d9d4c8';x.beginPath();x.moveTo(-6,-2.5);x.lineTo(16,-3);x.quadraticCurveTo(30,-3,33,-11);x.quadraticCurveTo(30,2,14,3);x.lineTo(-6,2.5);x.closePath();x.fill();
    x.fillStyle=gold;x.fillRect(-9,-5,3,10);x.fillStyle=dk;x.fillRect(-24,-3,15,6);x.fillStyle=gold;x.beginPath();x.moveTo(-24,-3);x.lineTo(-30,-7);x.lineTo(-30,7);x.lineTo(-24,3);x.closePath();x.fill();x.restore();}}
function emblemCanvas(fac,size){const c=document.createElement('canvas');c.width=size*2;c.height=size*2;const x=c.getContext('2d');x.fillStyle=fac==='RS'?'#111':'#4a2f1c';x.fillRect(0,0,c.width,c.height);const k=size*2/120;x.scale(k,k);x.translate(0,24);drawEmblem(x,fac,true);return c;}
function flagTex(fac){if(FLAGTEX[fac])return FLAGTEX[fac];const W=120,H=72,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const rect=(col,a,b,w,h)=>{x.fillStyle=col;x.fillRect(a,b,w,h);};const hs=(cols)=>cols.forEach((col,i)=>rect(col,0,i*H/cols.length,W,H/cols.length+1));const vs=(cols)=>cols.forEach((col,i)=>rect(col,i*W/cols.length,0,W/cols.length+1,H));
  const star=(cx,cy,r,col,n=5)=>{x.fillStyle=col;x.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r*.42:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}x.closePath();x.fill();};
  const circ=(cx,cy,r,col)=>{x.fillStyle=col;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();};
  const crescent=(cx,cy,r,col,bg,off)=>{circ(cx,cy,r,col);circ(cx+r*off,cy,r*.82,bg);};
  switch(fac){
    case 'US':for(let i=0;i<13;i++)rect(i%2?'#ffffff':'#b22234',0,i*H/13,W,H/13+1);rect('#3c3b6e',0,0,W*.42,H*7/13);x.fillStyle='#fff';for(let r=0;r<5;r++)for(let q=0;q<6;q++)circ(5+q*8.2,4.5+r*7.4,1.3,'#fff');break;
    case 'TR':rect('#e30a17',0,0,W,H);crescent(44,36,19,'#fff','#e30a17',.25);star(70,36,9,'#fff');break;
    case 'IL':rect('#fff',0,0,W,H);rect('#0038b8',0,8,W,10);rect('#0038b8',0,H-18,W,10);x.strokeStyle='#0038b8';x.lineWidth=3;for(const f of [1,-1]){x.beginPath();x.moveTo(60,36-14*f);x.lineTo(60+12,36+7*f);x.lineTo(60-12,36+7*f);x.closePath();x.stroke();}break;
    case 'EU':rect('#003399',0,0,W,H);for(let i=0;i<12;i++){const a=i/12*6.283;star(60+Math.cos(a)*22,36+Math.sin(a)*22,4.2,'#ffcc00');}break;
    case 'UA':hs(['#0057b7','#ffd700']);break;
    case 'RU':hs(['#ffffff','#0039a6','#d52b1e']);break;
    case 'IR':hs(['#239f40','#ffffff','#da0000']);circ(60,36,7,'#da0000');circ(60,36,4,'#ffffff');rect('#da0000',59,30,2,12);break;
    case 'SA':rect('#006c35',0,0,W,H);x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();for(let i=0;i<=40;i++){const px=26+i*1.7,py=28+Math.sin(i*.9)*4;i?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();rect('#fff',30,46,62,3);rect('#fff',88,43,3,9);break;
    case 'AE':hs(['#00732f','#ffffff','#000000']);rect('#ff0000',0,0,30,H);break;
    case 'PK':rect('#ffffff',0,0,30,H);rect('#01411c',30,0,W-30,H);crescent(76,38,18,'#fff','#01411c',.3);star(86,28,7,'#fff');break;
    case 'IN':hs(['#ff9933','#ffffff','#138808']);x.strokeStyle='#000080';x.lineWidth=2;x.beginPath();x.arc(60,36,9,0,7);x.stroke();for(let i=0;i<12;i++){const a=i/12*6.283;x.beginPath();x.moveTo(60,36);x.lineTo(60+Math.cos(a)*9,36+Math.sin(a)*9);x.stroke();}break;
    case 'CN':rect('#de2910',0,0,W,H);star(22,20,12,'#ffde00');for(const [a,b] of [[42,8],[50,16],[50,28],[42,36]])star(a,b,4,'#ffde00');break;
    case 'KP':rect('#024fa2',0,0,W,H);rect('#fff',0,13,W,4);rect('#fff',0,H-17,W,4);rect('#ed1c27',0,17,W,H-34);circ(40,36,14,'#fff');star(40,36,13,'#ed1c27');break;
    case 'KR':rect('#fff',0,0,W,H);x.fillStyle='#cd2e3a';x.beginPath();x.arc(60,36,15,Math.PI,0);x.fill();x.fillStyle='#0047a0';x.beginPath();x.arc(60,36,15,0,Math.PI);x.fill();circ(52.5,36,7.5,'#cd2e3a');circ(67.5,36,7.5,'#0047a0');
      x.save();for(const [cx,cy,ang] of [[24,14,.59],[96,58,.59],[96,14,-.59],[24,58,-.59]]){x.save();x.translate(cx,cy);x.rotate(ang);for(let b=0;b<3;b++)rect('#000',-9,-7+b*5,18,3);x.restore();}x.restore();break;
    case 'EG':hs(['#ce1126','#ffffff','#000000']);x.fillStyle='#c09300';x.beginPath();x.moveTo(60,27);x.lineTo(68,36);x.lineTo(64,46);x.lineTo(56,46);x.lineTo(52,36);x.closePath();x.fill();break;
    case 'CU':for(let i=0;i<5;i++)rect(i%2?'#ffffff':'#002a8f',0,i*H/5,W,H/5+1);x.fillStyle='#cf142b';x.beginPath();x.moveTo(0,0);x.lineTo(54,36);x.lineTo(0,H);x.closePath();x.fill();star(17,36,10,'#fff');break;
    case 'RS':drawEmblem(x,'RS',true);break;
    case 'DW':drawEmblem(x,'DW',true);break;
    case 'IM':rect('#4d5a3a',0,0,W,H);x.fillStyle='#e8e6dc';x.beginPath();x.moveTo(30,54);x.lineTo(55,20);x.lineTo(66,36);x.lineTo(76,26);x.lineTo(92,54);x.closePath();x.fill();break;
    default:rect('#888',0,0,W,H);}
  x.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<W;i+=6)x.fillRect(i,0,3,H);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return FLAGTEX[fac]=t;}
// A soft sky/ground environment for reflections on painted metal (vehicles, aircraft, ships) and glass/steel on
// buildings, so they pick up a sheen and catch the light instead of looking flat.
let ENVT=null;function envTex(){if(window.NOENV)return null;if(ENVT||typeof R3==='undefined'||!R3||!THREE.PMREMGenerator)return ENVT;try{const sc=new THREE.Scene();const g=new THREE.SphereGeometry(50,32,16);
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 d;void main(){float y=d.y;vec3 sky=mix(vec3(.75,.72,.66),vec3(.38,.55,.85),smoothstep(0.,.7,y));vec3 gr=mix(vec3(.42,.36,.28),vec3(.22,.19,.15),smoothstep(0.,-.6,y));vec3 c=y>0.?sky:gr;c+=vec3(1.,.9,.75)*pow(max(dot(d,normalize(vec3(-.55,.55,-.4))),0.),48.)*6.;gl_FragColor=vec4(c,1.);}'});
  sc.add(new THREE.Mesh(g,m));const pm=new THREE.PMREMGenerator(R3);ENVT=pm.fromScene(sc,.02).texture;pm.dispose();}catch(e){console.warn('env',e);}return ENVT;}
function tintedProto(key,team,kk){camoFreq(key);const LK=team&&team.fac?FLOOK[team.fac]:null;const id=key+'|'+(team?team.color:'none')+(kk||'')+(LK?team.fac:'');if(MODELS.tinted[id])return MODELS.tinted[id];const P=MODELS.proto[key];if(!P)return null;
  const tc=team?new THREE.Color(team.color).convertSRGBToLinear():null;const map=new Map();const root=P.scene;
  const k=kk||(key==='soldier'?.0:key==='inf'||key==='hero'?.1:.16);
  const clone=(THREE.SkeletonUtils&&root.getObjectByProperty('type','SkinnedMesh'))?THREE.SkeletonUtils.clone(root):root.clone(true);
  clone.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];const nm=ms.map(m=>{if(!map.has(m)){const c=m.clone();if(key==='heli'&&/Gray_Aircraft/.test(m.name||'')){c.visible=false;}const isB=/^b_/.test(key);if(isB&&c.color){const hs={};c.color.getHSL(hs);c.color.setHSL(hs.h,hs.s*.55,hs.l*.95);}weather(c,['tree1','tree2','tree3','tree4'].includes(key)?.5:(key==='boat'||key==='ship')?.15:isB?1.35:1,CAMOK[key]?CAMOK[key]:0);const VK=['tank','tankE','tankW','truck','technical','toontank','m_t90','m_hilux','m_ozelot'];if(isB)c.userData.refl=.35;{const LV={m_su35:.7,m_j10:.75,m_f18:.45,m_typhoon:.15,m_f15:.2,m_f16:.15,m_rafale:.15,m_mig29:.2};const lv=LV[key];if(lv&&c.color){const l=c.color.r*.3+c.color.g*.59+c.color.b*.11;c.color.lerp(new THREE.Color(.18,.2,.22).multiplyScalar(.7+l*1.6),lv);}}if(VK.includes(key)||/^m_|^(jet|heli|drone|boat|ship)$/.test(key))c.userData.refl=/^m_(f|su|ra|ty|j1|mig)|^jet$/.test(key)?1:.75;if(LK&&c.color){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.012){if(key==='soldier')c.color.lerp(new THREE.Color(LK.uni).convertSRGBToLinear(),.6);else if(VK.includes(key)){const tgt=new THREE.Color(LK.veh).convertSRGBToLinear().multiplyScalar(Math.min(1.6,.55+lum*2.2));c.color.lerp(tgt,.85);}}if(VK.includes(key)){const X=CAMOX[team.fac]||{};c.userData.camoA=new THREE.Color(LK.ca).convertSRGBToLinear();c.userData.camoB=new THREE.Color(LK.cb).convertSRGBToLinear();c.userData.camoP=X.p!=null?X.p:(LK.pat||0);c.userData.camoS=X.s||1;c.userData.camoC=new THREE.Color(X.c||LK.ca).convertSRGBToLinear();}}if(tc&&c.color&&!['tree1','tree2','tree3','tree4'].includes(key))c.color.lerp(tc,LK&&(key==='soldier'||VK.includes(key))?Math.min(k,.06):k);if(isB&&c.color){c.color.multiply(new THREE.Color(1.08,1.0,.84));const rg=team&&team.fac&&FACTIONS[team.fac]?FACTIONS[team.fac].music:null,BW={west:'#9aa3a8',mideast:'#d2b48a',slavic:'#8f9686',southasia:'#c9a27a',eastasia:'#a8a196',latin:'#d9c9a8'}[rg];if(BW){const lum=c.color.r*.3+c.color.g*.59+c.color.b*.11;if(lum>.05&&lum<.85)c.color.lerp(new THREE.Color(BW).convertSRGBToLinear().multiplyScalar(.6+lum*.9),.32);}}{if(c.isMeshStandardMaterial&&['tank','tankE','tankW','truck','technical','toontank','heli','jet','ship','boat','drone','sam'].includes(key)){c.metalness=Math.min(Math.max(c.metalness||0,.12),.3);c.roughness=Math.min(Math.max(c.roughness??.7,.5),.7);c.userData.sheen=1;}}
      if(isB&&team&&team.fac&&CAMOX[team.fac]){const X=CAMOX[team.fac];c.userData.trimC=new THREE.Color(X.t).convertSRGBToLinear();c.userData.wall=X.w||0;}map.set(m,c);}return map.get(m);});o.material=Array.isArray(o.material)?nm:nm[0];});
  MODELS.tinted[id]={scene:clone,anims:P.anims};return MODELS.tinted[id];}
function instModel(key,team,fit,size,ys,kk){const T=tintedProto(key,team,kk);if(!T)return null;const src=T.scene;const skinned=!!src.getObjectByProperty('type','SkinnedMesh');
  const inner=skinned&&THREE.SkeletonUtils?THREE.SkeletonUtils.clone(src):src.clone(true);const n=normScale(src,fit,size);const wrap=new THREE.Group();const sy=n.s*(ys||1);inner.scale.set(n.s,sy,n.s);inner.position.set(-n.cx*n.s,-n.my*sy,-n.cz*n.s);if(fit==='long'&&n.xl){const r=new THREE.Group();r.rotation.y=(MODELS.flipX&&MODELS.flipX[key])?-Math.PI/2:Math.PI/2;r.add(inner);wrap.add(r);}else wrap.add(inner);wrap.userData.anims=T.anims;wrap.userData.inner=inner;return wrap;}
const TANKBOX={};function tankBox(key,yaw){if(TANKBOX[key]!==undefined)return TANKBOX[key];yaw.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(yaw.matrixWorld).invert(),v=new THREE.Vector3(),M=new THREE.Matrix4();let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],sm=[0,0,0],n=0;
  yaw.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;M.multiplyMatrices(inv,o.matrixWorld);const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=1){v.fromBufferAttribute(p,i).applyMatrix4(M);const a=[v.x,v.y,v.z];for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],a[k]);mx[k]=Math.max(mx[k],a[k]);sm[k]+=a[k];}n++;}});
  if(!n)return TANKBOX[key]=null;const ax=(mx[0]-mn[0])>=(mx[2]-mn[2])?'x':'z',i=ax==='x'?0:2,j=2-i,c=sm[i]/n;const rear=(c-mn[i])<(mx[i]-c)?mx[i]:mn[i];
  // hull length: measure from rear to just past centroid on the far side
  const L=(mx[i]-mn[i])*.82,W=mx[j]-mn[j],H=mx[1]-mn[1];const fwd=rear<c?1:-1,span=mx[i]-mn[i];let dk=mn[1];yaw.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;M.multiplyMatrices(inv,o.matrixWorld);const p=o.geometry.attributes.position;for(let q=0;q<p.count;q++){v.fromBufferAttribute(p,q).applyMatrix4(M);const a=[v.x,v.y,v.z];if(Math.abs(a[i]-rear)<span*.16)dk=Math.max(dk,a[1]);}});
  return TANKBOX[key]={L,W,H:H*.62,rear,ax,fwd,y0:mn[1],deck:dk-mn[1]};}
// Procedural walk cycle for the soldier rig: thighs swing about the hip axis (left-right line through both hips),
// knees bend on the forward swing, arms counter-swing a little. Axes are worked out per bone in its parent's space.
// Kit on every soldier so squads read like real infantry: a national helmet (rounded western, flared Soviet-style,
// or a militia cap / shemagh), a field pack with bedroll, ammo pouches and a canteen. Pieces ride on the skeleton's
// head and chest bones so they move with the walk; sizes are given in world units and converted to bone space.
const GEARM={};function gearMat(c){return GEARM[c]||(GEARM[c]=(()=>{const m=new THREE.MeshStandardMaterial({color:lin(c),roughness:.8,metalness:.05});if(typeof weather==='function')weather(m,.8,0);return m;})());}
function soldierGear(m,fac,kind){const inner=m.userData.inner;if(!inner)return;inner.updateMatrixWorld(true);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});if(!B.head||!B.chest)return;
  const LK=(typeof FLOOK!=='undefined'&&FLOOK[fac])||{uni:'#6b6a4c'},uni=new THREE.Color(LK.uni),hc='#'+uni.clone().multiplyScalar(.72).getHexString(),pk='#'+uni.clone().lerp(new THREE.Color('#5a5040'),.5).multiplyScalar(.85).getHexString();
  const style=({RU:'sov',CN:'sov',KP:'sov',CU:'sov',RS:'cap',DW:'shemagh'})[fac]||'west';
  const attach=(bone,obj,wx,wy,wz)=>{const bp=new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld),ws=new THREE.Vector3();bone.getWorldScale(ws);const bq=new THREE.Quaternion();bone.getWorldQuaternion(bq);
    const p=new THREE.Vector3(bp.x+wx,bp.y+wy,bp.z+wz);bone.worldToLocal(p);obj.position.copy(p);obj.quaternion.copy(bq.invert());obj.scale.set(1/ws.x,1/ws.y,1/ws.z);obj.traverse(q=>{if(q.isMesh){q.castShadow=true;}});bone.add(obj);};
  const hp=new THREE.Vector3().setFromMatrixPosition(B.head.matrixWorld),cp=new THREE.Vector3().setFromMatrixPosition(B.chest.matrixWorld),k=Math.max(.5,(hp.y-(new THREE.Vector3().setFromMatrixPosition((B.hips||B.chest).matrixWorld)).y)/5.2);
  // helmet / headgear
  {const g=new THREE.Group();if(style==='west'){const d=new THREE.Mesh(new THREE.SphereGeometry(1.02*k,14,8,0,Math.PI*2,0,Math.PI*.55),gearMat(hc));d.scale.set(1,.92,1.08);g.add(d);const r=new THREE.Mesh(new THREE.CylinderGeometry(1.06*k,1.1*k,.16*k,16),gearMat(hc));r.position.y=.06*k;g.add(r);}
   else if(style==='sov'){const d=new THREE.Mesh(new THREE.SphereGeometry(.98*k,14,8,0,Math.PI*2,0,Math.PI*.5),gearMat(hc));g.add(d);const sk=new THREE.Mesh(new THREE.CylinderGeometry(.98*k,1.16*k,.42*k,16,1,true),gearMat(hc));sk.position.y=-.16*k;g.add(sk);}
   else if(style==='cap'){const d=new THREE.Mesh(new THREE.SphereGeometry(.92*k,12,8,0,Math.PI*2,0,Math.PI*.5),gearMat('#1d1d1b'));d.scale.y=.85;g.add(d);}
   else{const d=new THREE.Mesh(new THREE.SphereGeometry(.98*k,12,8,0,Math.PI*2,0,Math.PI*.58),gearMat('#d9d0b8'));g.add(d);const t=new THREE.Mesh(new THREE.BoxGeometry(.5*k,1.4*k,1.2*k),gearMat('#c9bfa6'));t.position.set(-.7*k,-.7*k,0);g.add(t);const band=new THREE.Mesh(new THREE.TorusGeometry(.95*k,.1*k,6,16),gearMat('#8a2a24'));band.rotation.x=Math.PI/2;band.position.y=.18*k;g.add(band);}
   attach(B.head,g,0,.62*k,0);}
  // field pack + bedroll on the back, pouches on the front, canteen at the hip
  if(kind!=='hero'){const g=new THREE.Group();const pack=new THREE.Mesh(new THREE.BoxGeometry(1.7*k,1.9*k,.9*k),gearMat(pk));g.add(pack);const roll=new THREE.Mesh(new THREE.CylinderGeometry(.34*k,.34*k,1.9*k,8),gearMat('#5d5a4a'));roll.rotation.z=Math.PI/2;roll.position.set(0,1.15*k,0);g.add(roll);
    attach(B.chest,g,0,-.3*k,-1.05*k);
    const f=new THREE.Group();for(const sx of [-.5,0,.5]){const p=new THREE.Mesh(new THREE.BoxGeometry(.42*k,.5*k,.3*k),gearMat(pk));p.position.set(sx*k,0,0);f.add(p);}attach(B.chest,f,0,-1.2*k,.62*k);
    if(B.hips){const cn=new THREE.Mesh(new THREE.CylinderGeometry(.24*k,.24*k,.6*k,8),gearMat('#4a4d3c'));attach(B.hips,cn,.75*k,-.2*k,-.35*k);}}}
function setupWalk(m){const inner=m.userData.inner;if(!inner)return null;inner.updateMatrixWorld(true);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});
  if(!B.uplegL||!B.uplegR||!B.legL||!B.legR)return null;let pl=new THREE.Vector3().setFromMatrixPosition(B.uplegL.matrixWorld),pr=new THREE.Vector3().setFromMatrixPosition(B.uplegR.matrixWorld);
  // the rifle-ready stance has the hips turned ~20 degrees; square them to the direction of travel so the legs
  // swing straight forward and back instead of diagonally across the body
  {const a=Math.atan2(pr.z-pl.z,pr.x-pl.x),tg=Math.abs(a)>Math.PI/2?Math.sign(a)*Math.PI:0,th=a-tg;if(Math.abs(th)>.02){inner.rotation.y+=th;inner.updateMatrixWorld(true);pl=new THREE.Vector3().setFromMatrixPosition(B.uplegL.matrixWorld);pr=new THREE.Vector3().setFromMatrixPosition(B.uplegR.matrixWorld);}}
  const lat=pr.clone().sub(pl).normalize();const q=new THREE.Quaternion();
  const mk=(b,s)=>{if(!b)return null;b.parent.getWorldQuaternion(q);const ax=lat.clone().applyQuaternion(q.clone().invert()).normalize();return{b,q0:b.quaternion.clone(),ax,s};};
  return[mk(B.uplegL,1),mk(B.uplegR,-1),mk(B.legL,1),mk(B.legR,-1),mk(B.spine,0)].filter(Boolean);}
const WQ=new THREE.Quaternion();
function walkPose(m,ph,amt){const L=m.userData.legs;if(!L)return;const sw=Math.sin(ph);for(const j of L){let a=0;const n=j.b.name;
    if(n==='uplegL')a=sw*.55*amt;else if(n==='uplegR')a=-sw*.55*amt;else if(n==='legL')a=-Math.max(0,Math.cos(ph))*.9*amt;else if(n==='legR')a=-Math.max(0,-Math.cos(ph))*.9*amt;else if(n==='spine')a=.08*amt;
    WQ.setFromAxisAngle(j.ax,a*(m.userData.wsign||1));j.b.quaternion.copy(WQ).multiply(j.q0);}}
// Drones are built by hand so each nation's looks right: a Shahed-style delta wing with a pusher propeller
// (Iran, Mountain Shias), a Kargu-style quadcopter (Turkey) and a small X-frame FPV racer (Ukraine and others).
function droneType(fac){return fac==='IR'||fac==='RS'?'delta':fac==='TR'?'kargu':'fpv';}
// Drones are built once per nation and then cloned (shared geometry and materials), so a swarm of dozens appears
// without a hitch.
const DPROTO={};
function droneModel(e){const T=G.teams[e.team],ty=droneType(T.fac),key=ty+'|'+T.fac+'|'+T.color;
  if(!DPROTO[key]){const p=buildDrone(e);SCN.remove(p);const meta={props:p.userData.parts.props.map(q=>q.ax)};p.userData={};p.children[0].userData={};let i=0;p.traverse(c=>{if(c.userData&&c.userData.dprop!=null)return;});DPROTO[key]={p,meta};}
  const D=DPROTO[key],o=D.p.clone(),yaw=o.children[0],props=[];o.traverse(c=>{if(c.name==='dprop')props.push({m:c,ax:c.userData.ax||'y'});});
  o.userData={parts:{body:yaw,props},model:true,dtype:ty};SCN.add(o);return o;}
function buildDrone(e){const T=G.teams[e.team],ty=droneType(T.fac),o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw,props:[]};o.userData.model=true;o.userData.dtype=ty;
  const B=Bld(),dk='#2a2c28',tc=T.color;
  if(ty==='delta'){
    // Shahed-136 pattern: ~3.5 m long and ~2.5 m span (longer than wide), cylindrical body with a rounded warhead nose,
    // cropped-delta wing running most of the body length, vertical fins at the wingtips reaching above and below the
    // wing, small two-stroke engine in the tail driving a two-blade pusher propeller.
    const sk=T.fac==='RS'?'#6a665a':'#c4c2b8',sk2=T.fac==='RS'?'#5a564b':'#aeaca2';
    B.cyl(1.25,1.25,15,12,-1.5,0,0,sk,0,0,-Math.PI/2);B.sph(1.25,6,0,0,sk,1.9,1,1);B.cyl(.55,1.25,2.6,10,-10.3,0,0,sk2,0,0,-Math.PI/2);
    B.box(4.5,.9,1.6,-1,1.15,0,sk2);
    const wing=new THREE.Shape();wing.moveTo(5.5,0);wing.lineTo(-4.6,8.6);wing.lineTo(-8.8,8.6);wing.lineTo(-8.4,0);wing.lineTo(-8.8,-8.6);wing.lineTo(-4.6,-8.6);wing.closePath();
    const wg=new THREE.ExtrudeGeometry(wing,{depth:.45,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:1});wg.rotateX(Math.PI/2);B._p.push({g:wg,m:new THREE.Matrix4().makeTranslation(0,.25,0),c:lin(sk)});
    for(const sd of [-1,1]){const fin=new THREE.Shape();fin.moveTo(-4.4,-2);fin.lineTo(-3.2,2.8);fin.lineTo(-6.2,3.1);fin.lineTo(-9.2,2.8);fin.lineTo(-9.2,-2.2);fin.lineTo(-6.6,-2.4);fin.closePath();
      const fg=new THREE.ExtrudeGeometry(fin,{depth:.3,bevelEnabled:false});B._p.push({g:fg,m:new THREE.Matrix4().makeTranslation(0,0,8.6*sd-.15),c:lin(sk2)});}
    B.box(1.4,.35,1.1,1.5,1.62,0,tc);B.box(.6,.6,.6,-11.7,0,0,dk);
    const pr=new THREE.Group();const P=Bld();P.box(.35,6.2,.8,0,0,0,dk);P.sph(.45,0,0,0,dk);pr.add(mesh(P.geo()));pr.position.set(-12.1,0,0);pr.name='dprop';pr.userData.ax='x';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'x'});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(3.1,20),new THREE.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.set(-12.2,0,0);yaw.add(disc);}
  else{const big=ty==='kargu',arm=big?7.5:5.5,bc=big?'#7c8076':'#3b3f37';B.cyl(big?2.4:1.6,big?2.4:1.6,big?3:1.6,10,0,0,0,bc);if(big)B.sph(1.6,2,-.6,0,'#1b1c1a');else B.box(1.4,1.2,1.2,2,.5,0,'#111');B.box(1.6,.6,1.2,0,big?1.8:1.1,0,tc);
    for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){const x=Math.cos(a)*arm,z=Math.sin(a)*arm;B.box(arm*1.05,.5,.7,x/2,0,z/2,bc,0,-a,0);B.cyl(.7,.7,1.2,8,x,.4,z,dk);
      const pr=new THREE.Group();const P=Bld();P.box(big?6:4.4,.15,.6,0,0,0,'#151515');pr.add(mesh(P.geo()));pr.position.set(x,1.1,z);pr.name='dprop';pr.userData.ax='y';yaw.add(pr);o.userData.parts.props.push({m:pr,ax:'y'});
      const disc=new THREE.Mesh(new THREE.CircleGeometry(big?3:2.2,16),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.set(x,1.15,z);yaw.add(disc);}
    if(big)for(const s of [-1,1])B.box(.4,2.4,.4,0,-1.6,1.4*s,dk);}
  yaw.add(mesh(B.geo()));const sc=ty==='delta'?.95:ty==='kargu'?.95:.85;yaw.scale.setScalar(sc);
  SCN.add(o);return o;}
// The Ayatollah: a senior cleric - layered black turban (amamah), full white beard, round spectacles, a pale grey
// qaba robe to the ground under a dark brown aba cloak with thin gold edging, hands folded holding prayer beads.
function clericModel(e){const T=G.teams[e.team],o=new THREE.Group(),yaw=new THREE.Group();o.add(yaw);o.userData.parts={body:yaw};o.userData.model=true;o.userData.cleric=true;
  const B=Bld(),skin='#c69a78',robe='#a8a397',aba='#3b2d23',trim='#b8963e',tur='#101010',beard='#ecebe6',P=(g,x,y,z,c,rx=0,ry=0,rz=0)=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));B._p.push({g,m,c:lin(c)});};
  // qaba: smooth lathe from hem to shoulders, with soft folds
  {const pts=[];for(let k=0;k<=12;k++){const y=k/12*11.6;const r=3.05-1.05*Math.pow(k/12,.9)+(k===12?-.4:0);pts.push(new THREE.Vector2(r,y));}const g=new THREE.LatheGeometry(pts,24);const pa=g.attributes.position;for(let q=0;q<pa.count;q++){const x=pa.getX(q),z=pa.getZ(q),y=pa.getY(q),a=Math.atan2(z,x),f=1+.05*Math.sin(a*9)*(1-y/11.6);pa.setX(q,x*f);pa.setZ(q,z*f);}g.computeVertexNormals();P(g,0,0,0,robe);}
  // aba: open-fronted cloak hanging from the shoulders, slightly wider, gold edge down the opening
  {const pts=[];for(let k=0;k<=12;k++){const y=.4+k/12*11.4;const r=3.5-1.2*Math.pow(k/12,1.1);pts.push(new THREE.Vector2(r,y));}const g=new THREE.LatheGeometry(pts,26,Math.PI*.5+.5,Math.PI*2-1);const pa=g.attributes.position;for(let q=0;q<pa.count;q++){const x=pa.getX(q),z=pa.getZ(q),y=pa.getY(q),a=Math.atan2(z,x),f=1+.06*Math.sin(a*7+1)*(1-y/12);pa.setX(q,x*f);pa.setZ(q,z*f);}g.computeVertexNormals();const m2=g.clone();P(g,0,0,0,aba);
   for(const sd of [-1,1]){const a0=Math.PI*.5+.5+(sd>0?Math.PI*2-1:0);for(let k=0;k<12;k++){const y=.9+k*.95,r=3.42-1.18*Math.pow((y-.4)/11.4,1.1);B.box(.22,1,.22,Math.cos(a0)*r,y,-Math.sin(a0)*r,trim);}}}
  B.cyl(2.25,2.5,.9,20,0,11.5,0,aba);B.sph(2.3,0,11.6,0,aba,1,.45,1);
  // sleeves and folded hands with prayer beads
  for(const sd of [-1,1]){B.cyl(.85,1.15,4.6,10,.9,8.9,1.95*sd,aba,0,0,.55);B.cyl(.95,.95,1.6,10,2.1,7.1,1.3*sd,robe,0,0,1.25);}
  B.sph(.62,2.75,6.75,.45,skin,1.2,.8,1);B.sph(.62,2.75,6.75,-.45,skin,1.2,.8,1);for(let q=0;q<9;q++){const a=q/9*6.28;B.sph(.14,3.1+Math.cos(a)*.15,6.1+Math.sin(a)*.6,Math.sin(a*2)*.25,'#5a3a1c');}
  // neck, head, face
  B.cyl(.7,.8,1,12,0,12.4,0,skin);
  {const g=new THREE.SphereGeometry(1.35,18,14);g.scale(1,1.2,.98);P(g,0,13.9,0,skin);}
  {const g=new THREE.ConeGeometry(.28,.75,8);g.rotateZ(-Math.PI/2);P(g,1.55,13.75,0,'#b98c6a');}
  for(const sd of [-1,1]){B.sph(.16,1.25,14.25,.45*sd,'#1a1410');B.box(.2,.18,.65,1.28,14.62,.47*sd,'#e7e5df');}
  // round spectacles
  for(const sd of [-1,1]){const g=new THREE.TorusGeometry(.36,.05,6,16);g.rotateY(Math.PI/2);P(g,1.42,14.25,.45*sd,'#3a3226');}B.box(.06,.06,.3,1.44,14.3,0,'#3a3226');
  // full white beard from ear to ear, longer at the chin, and moustache
  {const g=new THREE.SphereGeometry(1.35,16,12,0,Math.PI*2,Math.PI*.42,Math.PI*.58);g.scale(1.05,1.55,1.08);P(g,.12,13.55,0,beard);}
  {const g=new THREE.ConeGeometry(.9,2.2,10);g.rotateZ(Math.PI);P(g,.65,11.95,0,beard);}B.box(.35,.32,1.1,1.38,13.32,0,'#e2e0d9');
  for(const sd of [-1,1])B.sph(.42,.25,14.05,1.2*sd,beard,.7,1.3,.6);
  // amamah: wrapped layers of black cloth and a rounded crown
  for(let k=0;k<4;k++){const g=new THREE.TorusGeometry(1.32-k*.06,.38,8,24);g.rotateX(Math.PI/2);P(g,-.05,14.95+k*.42,0,k%2?'#161616':tur,0,0,(k%2?.06:-.05));}
  B.sph(1.35,-.05,16.1,0,tur,1,.62,1);B.sph(.5,.25,16.5,.3,'#1b1b1b',1.2,.6,1.4);
  // shoes peeking out of the hem
  for(const sd of [-1,1])B.box(1.3,.45,.7,1.7,.22,.75*sd,'#1c1a18');
  const body=mesh(B.geo());body.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});body.castShadow=true;body.receiveShadow=true;yaw.add(body);yaw.scale.setScalar(1.08);
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.4,5,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.32,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;o.add(ring);o.userData.parts.tring=ring;
  // a faint green halo of light marks him on the battlefield
  const glow=new THREE.Mesh(new THREE.RingGeometry(5.2,6.2,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x5fd38a,transparent:true,opacity:.18,depthWrite:false}));glow.position.y=1.3;glow.renderOrder=2;o.add(glow);
  SCN.add(o);return o;}
function modelFor(e){if(!MODELS.ready||e.isB)return null;if(e.kind==='drone')return droneModel(e);const T=G.teams[e.team];let c=MCFG[e.kind];if(e.kind==='tank'&&MIL_TANK[T.fac])c=MIL_TANK[T.fac];{const rk=e.kind==='aa'?(/Technical/.test(e.s.name||'')?'zu':'ozelot'):RMAP[e.kind]&&RMAP[e.kind][T.fac];if(rk&&MODELS.proto[RMOD[rk].m])c=Object.assign({},c,RMOD[rk],{extra:RMOD[rk].extra||(e.kind==='dozer'?null:c&&c.extra)});}
  if(e.kind==='aa'&&MODELS.proto.truck&&MODELS.proto.sam)c={m:'truck',fit:'z',size:34,extra:'samtruck'};
  if(e.kind==='arty'){if(e.s&&e.s.rocket||!MIL_TANK[T.fac]&&!MODELS.proto.tank)c={m:'truck',fit:'z',size:34,extra:'mlrs'};else{const tc=MIL_TANK[T.fac]&&MIL_TANK[T.fac].m!=='technical'&&MIL_TANK[T.fac].m!=='toontank'?MIL_TANK[T.fac]:MCFG.tank;c=Object.assign({},tc,{size:tc.size*1.08,extra:'gun'});if(MIL_TANK[T.fac]&&(MIL_TANK[T.fac].m==='technical'||MIL_TANK[T.fac].m==='toontank'))c={m:'truck',fit:'z',size:34,extra:'mlrs'};}}
  if(c&&!MODELS.proto[c.m]){const alt={soldier:'inf',tankE:'tank',tankW:'tank',drone:null,technical:'tank',toontank:'tank'}[c.m];if(alt&&MODELS.proto[alt])c=Object.assign({},c,{m:alt});}
  if(!c||!MODELS.proto[c.m])return null;
  const o=new THREE.Group();o.userData.parts={};const sq=c.squad||[[0,0]];const yaw=new THREE.Group();yaw.rotation.y=Math.PI/2+(c.flip?Math.PI:0);o.add(yaw);
  for(const [px,pz] of sq){const m=instModel(c.m,c.tint?{color:c.tint}:T,c.fit,c.size,1,c.m==='soldier'&&!c.tint?[.03,.07,.11][(e.id+px*3)%3|0]:c.tk);if(!m)return null;m.position.set(-pz,0,px);m.rotation.y=(Math.random()-.5)*(c.m==='soldier'?.08:.3);yaw.add(m);if(c.m==='soldier'){m.userData.legs=setupWalk(m);m.userData.wsign=WALKSIGN;try{soldierGear(m,T.fac||(G.teams[e.team]&&G.teams[e.team].fac),e.kind);}catch(err){}}
    if(m.userData.anims&&m.userData.anims.length){const mix=new THREE.AnimationMixer(m.userData.inner);(o.userData.mixers=o.userData.mixers||[]).push({mix,anims:m.userData.anims,cur:null});}}
  o.userData.parts.body=yaw;o.userData.model=true;if(c.m==='soldier'){o.userData.mixers=null;o.userData.walker=true;}
  {const ring=new THREE.Mesh(new THREE.RingGeometry(c.size*(c.squad?.5:.36),c.size*(c.squad?.56:.41),28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.color),transparent:true,opacity:.24,depthWrite:false}));ring.position.y=1.2;ring.renderOrder=2;if(!['heli','jet'].includes(e.kind))o.add(ring);o.userData.parts.tring=ring;}
  // soft contact shadow so ground vehicles sit in the terrain instead of floating on it
  if(T&&e.s&&e.s.dom==='ground'&&!isInf(e.s)){if(!window.BLOBTEX){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,4,32,32,31);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.6,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);window.BLOBTEX=new THREE.CanvasTexture(c);}
    const bs=(c.size||30)*.62,bl=new THREE.Mesh(new THREE.PlaneGeometry(bs*1.5,bs).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:BLOBTEX,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));bl.position.y=.35;bl.renderOrder=1;yaw.add(bl);}
  const ownRotor=e.kind==='heli'?yaw.getObjectByName('main_rotor'):null;if(ownRotor){o.userData.parts.blades=ownRotor;const tr0=yaw.getObjectByName('tail_rotor');if(tr0)o.userData.parts.tailR0=tr0;}
  if(e.kind==='heli'&&!ownRotor){
    // main rotor on a mast just above the cabin roof and a tail rotor on the tail boom, both placed from the model's
    // real bounding box so every nation's helicopter gets correctly sized, visibly spinning rotors
    o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(yaw),ok=isFinite(bb.max.y)&&bb.max.y>2,top=ok?bb.max.y:13,L=ok?Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z):50,alongX=!ok||(bb.max.x-bb.min.x)>=(bb.max.z-bb.min.z);
    const R=Math.max(16,L*.46),bm=new THREE.MeshStandardMaterial({color:0x1d1f1c,roughness:.6,metalness:.3});
    const disc=new THREE.Mesh(new THREE.CircleGeometry(R,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.13,depthWrite:false}));disc.position.y=top+1.6;o.add(disc);o.userData.parts.rotor=disc;
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,2.2,8),bm);mast.position.y=top+.6;o.add(mast);
    const bl=new THREE.Group();bl.position.y=top+1.7;for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(R,.3,1.5),bm);b.position.x=R/2;b.rotation.x=.06;const pv=new THREE.Group();pv.rotation.y=k*Math.PI/2;pv.add(b);bl.add(pv);}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,1.2,8),bm);bl.add(hub);bl.traverse(c=>{if(c.isMesh)c.castShadow=true;});o.add(bl);o.userData.parts.blades=bl;
    const tr=new THREE.Group(),tl=R*.2;for(let k=0;k<2;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(.9,tl,.25),bm);b.position.y=tl/2;const pv=new THREE.Group();pv.rotation.z=k*Math.PI;pv.add(b);tr.add(pv);}
    const tdisc=new THREE.Mesh(new THREE.CircleGeometry(tl,16),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));tr.add(tdisc);
    if(alongX){tr.position.set(ok?bb.min.x+tl*.9:-24,ok?bb.min.y+(bb.max.y-bb.min.y)*.62:8,(ok?bb.max.z:2)*.15+1.2);}else{tr.rotation.y=Math.PI/2;tr.position.set((ok?bb.max.x:2)*.15+1.2,ok?bb.min.y+(bb.max.y-bb.min.y)*.62:8,ok?bb.min.z+tl*.9:-24);}
    o.add(tr);o.userData.parts.tailR=tr;}
  if(e.kind==='jet'){mats();o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(yaw),ok=isFinite(bb.min.x);const tx=ok?bb.min.x+.6:-22,ty=ok?bb.min.y+(bb.max.y-bb.min.y)*.42:1;
    // afterburner: a tapered additive flame cone at the real tail nozzle of each model
    const fl=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,10,1,true).rotateZ(Math.PI/2).translate(-4.5,0,0),MAT.glow);fl.position.set(tx,ty,0);fl.renderOrder=3;o.add(fl);o.userData.parts.glow=fl;}
  if(c.extra==='zu23'){const B=Bld(),D='#2a2c28',S='#4f5446';B.box(7,1.6,6,-5,9.6,0,S);B.cyl(1.4,1.6,1.6,10,-5,11,0,D);B.box(4,3.2,4.6,-5,13,0,S);B.box(.4,3,5.4,-3,13.6,0,S);for(const z of [-1.1,1.1]){B.cyl(.32,.32,13,8,1.2,16.2,z,D,0,0,Math.PI/2-.42);B.cyl(.5,.5,1.6,8,-3.2,13.6,z,D,0,0,Math.PI/2-.42);}const g=mesh(B.geo());g.castShadow=true;o.add(g);o.userData.parts.turret=g;}
  if(c.extra==='dshk'){const B=Bld();B.cyl(.5,.6,6,8,-6,9,0,'#2b2d2a');B.box(3,1.6,2.2,-6,12.6,0,'#33352f');B.cyl(.35,.35,9,8,-1.5,13,0,'#1e1f1d',0,0,Math.PI/2);B.box(.4,2.2,2.6,-6.8,13.4,0,'#4a4d45');const g=mesh(B.geo());g.castShadow=true;o.add(g);}
  if(c.extra==='samtruck'){const sp=instModel('sam',{color:'#62664f'},'y',13,1,.6);if(sp){sp.position.set(-7,9,0);sp.rotation.y=Math.PI/2;o.add(sp);o.userData.parts.turret=sp;}}
  if(c.extra==='mlrs'){const B=Bld();B.box(15,1.5,11,0,0,0,'#4c5048');for(let i=0;i<2;i++)for(let j=0;j<3;j++)B.cyl(1.4,1.4,16,8,0,2.4+i*3,-3.2+j*3.2,'#5b6152',0,0,Math.PI/2);B.box(16,6.2,10.4,0,4,0,'#596050');const g=new THREE.Group();const m=mesh(B.geo());m.rotation.z=.32;g.add(m);g.position.set(-6,10,0);o.add(g);o.userData.parts.turret=g;}
  if(c.extra==='crane'){const B=Bld(),Y='#d9a21f',D='#3a3a34';B.box(9,4,10,-7,9,0,Y);B.cyl(2.2,2.6,3,10,-7,12,0,D);B.box(2,2,2,-7,14,0,D);const g=new THREE.Group();const arm=mesh((()=>{const A=Bld();A.box(26,2.2,2.2,13,0,0,Y);A.box(2,6,1,25,-3,0,D);A.box(1.2,1.2,1.2,25,-6.5,0,'#222');return A.geo();})());arm.rotation.z=.42;g.add(arm);g.position.set(-7,14,0);g.rotation.y=.5;o.add(g);o.userData.parts.crane=g;
    B.box(2.4,6.5,20,17,3.2,0,Y);B.box(1,1,18,18.6,0.6,0,D);B.box(5,1.2,1.2,14.5,4.2,-6,D);B.box(5,1.2,1.2,14.5,4.2,6,D);B.box(1.6,1.6,1.6,1,17.5,-4,'#f0a020');o.add(mesh(B.geo()));}
  if(c.extra==='dish'){const B=Bld();B.box(12,5,10,-6,9,0,'#4f5448');B.cyl(.8,.8,9,6,-6,15,0,'#2c2e29');const g=new THREE.Group();const d=mesh((()=>{const A=Bld();A.cyl(9,1,2,14,0,0,0,'#b8bcb4',Math.PI/2.4,0,0);A.cyl(.6,.6,6,6,0,1,3,'#2c2e29',Math.PI/2.4,0,0);return A.geo();})());g.add(d);g.position.set(-6,20,0);o.add(mesh(B.geo()));o.add(g);o.userData.parts.crane=g;}
  if(c.extra==='mg'){const B=Bld();B.box(3,3,3,-4,11,0,'#2c2e29');B.box(12,1.2,1.2,2,12,0,'#1e1f1b');B.box(1,6,8,-8,13,0,'#3a3a34');o.add(mesh(B.geo()));}
  if(c.extra==='mortar'){const B=Bld();B.cyl(.9,1.1,8,8,4,3,6,'#2c2e29',0,0,.6);B.box(4,.6,4,6,0,6,'#3a3a34');o.add(mesh(B.geo()));}
  if(c.extra==='gun'){const B=Bld();B.cyl(1.1,1.4,30,10,15,0,0,'#3b3e36',0,0,Math.PI/2);B.cyl(1.7,1.7,3,10,29,0,0,'#2c2e29',0,0,Math.PI/2);B.box(7,4,6,1,0,0,'#4a4d44');const m=mesh(B.geo());m.position.set(4,11.5,0);m.rotation.z=.12;o.add(m);}
  if(e.kind==='tank'&&c.m!=='technical'&&!/^m_/.test(c.m)){const TB=tankBox(c.m,yaw);if(TB){const B=Bld(),{L,W,H,rear,ax,fwd,y0}=TB;
    // positions in "hull frame": u along hull (+u = toward gun), v across, h up
    const P=(u,v)=>ax==='x'?[u,v]:[v,u];const add=(f,u,h,v)=>{const [x,z]=P(u,v);f(x,h+y0,z);};
    const bx=(w,hh,d,u,h,v,col)=>add((x,y,z)=>{const [ww,dd]=ax==='x'?[w,d]:[d,w];B.box(ww,hh,dd,x,y,z,col);},u,h,v);
    const cy=(r1,r2,len,seg,u,h,v,col)=>add((x,y,z)=>B.cyl(r1,r2,len,seg,x,y,z,col),u,h,v);
    const ru=rear+fwd*L*.07;
    cy(.08,.13,H*.9,4,ru+fwd*L*.06,H*.95+H*.45,W*.3,'#2a2b27');cy(.08,.13,H*.75,4,ru+fwd*L*.1,H*.9+H*.37,-W*.28,'#2a2b27');
    
    for(const v of [-1,1])bx(L*.2,H*.12,W*.08,rear+fwd*L*.35,H*.5,v*W*.47,'#4d4a3c');
    // national pennant on the rear antenna
    {const [x,z]=P(ru+fwd*L*.06,W*.3);const fl=new THREE.Mesh(new THREE.PlaneGeometry(H*.75,H*.45,6,1),new THREE.MeshStandardMaterial({map:flagTex(G.teams[e.team].fac),side:THREE.DoubleSide,roughness:.9}));
     fl.geometry.translate(-H*.375,0,0);fl.position.set(x,y0+H*.95+H*.82,z);fl.rotation.y=ax==='x'?(fwd>0?0:Math.PI):(fwd>0?-Math.PI/2:Math.PI/2);yaw.add(fl);o.userData.parts.pennant=fl;fl.userData.base=Float32Array.from(fl.geometry.attributes.position.array);}
    
    const m=mesh(B.geo());yaw.add(m);}}
  if(e.kind==='harv'){const B=Bld();for(const [x,z] of [[-9,-4],[-2,-4],[-9,3],[-2,3]])B.box(6,5,6,x,20,z,'#c99a2e');const cg=mesh(B.geo());o.add(cg);o.userData.parts.cargo=cg;}
  SCN.add(o);return o;}
function playAnim(o,name,dt){const L=o.userData.mixers;if(!L)return;for(const M of L){if(M.cur!==name){const clip=M.anims.find(a=>a.name.toLowerCase().includes(name))||M.anims[0];if(clip){M.mix.stopAllAction();M.mix.clipAction(clip).play();}M.cur=name;}M.mix.update(dt);}}
function propObj(key,x,z,rot,parent){const c=PROPS[key];if(!c||!MODELS.proto[key])return;const m=instModel(key,null,c.fit,c.size);if(!m)return;m.position.set(x,0,z);m.rotation.y=rot||0;m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});parent.add(m);return m;}
function decorateBld(e,o){if(!MODELS.ready)return;const h=e.size/2;const P=new THREE.Group();o.add(P);
  if(e.kind==='hq'){propObj('watertower',-h-14,-h+6,0,P);propObj('container',h+20,-h+18,Math.PI/2,P);propObj('containerG',h+20,-h+52,Math.PI/2,P);propObj('barrel',-h-8,h+6,0,P);propObj('barrel',-h-14,h+10,0,P);propObj('fence',-14,h+16,0,P);}
  else if(e.kind==='barracks'){propObj('tent',0,h+30,0,P);propObj('sandbag',-h-6,h-8,Math.PI/2,P);propObj('sandbag',h+6,h-8,Math.PI/2,P);propObj('crate',h+8,-h+6,.3,P);propObj('crate',h+12,-h+14,0,P);}
  else if(e.kind==='factory'){propObj('container',-h-18,0,Math.PI/2,P);propObj('barrel',h+8,h-4,0,P);propObj('barrel',h+8,h-12,0,P);propObj('barrel',h+14,h-8,0,P);propObj('pallet',-h+6,h+10,0,P);propObj('crate',-h+6,h+10,0,P);}
  else if(e.kind==='airfield'){propObj('crate',h+6,h-6,0,P);propObj('barrel',h+6,h-16,0,P);propObj('containerG',-h-18,10,Math.PI/2,P);}
  else if(e.kind==='shipyard'){propObj('container',-10,-h-14,0,P);propObj('containerG',22,-h-14,0,P);propObj('crate',h+6,0,0,P);}
  else if(e.kind==='turret'){propObj('sandbag',-h-2,0,Math.PI/2,P);propObj('sandbag',h+2,0,Math.PI/2,P);}
  else if(e.kind==='depot'){propObj('containerG',-h-12,8,Math.PI/2,P);propObj('pallet',h+5,h-8,0,P);propObj('crate',h+7,-h+10,.4,P);propObj('barrel',-h+6,h+6,0,P);}
  else if(e.kind==='uplink'){propObj('barrel',h+8,h,0,P);propObj('fence',0,h+14,0,P);}}
const BMOD={hq:{slab:1,list:[{m:'b_hq',fit:'xz',size:70,ys:.62,x:6,z:4},{m:'b_radar',fit:'y',size:30,x:-30,z:-30,part:'dish',col:'#8a908c',k:.82}]},
  barracks:{slab:1,list:[{m:'b_barr',fit:'xz',size:46,ys:.52,x:-4,z:-4}]},
  factory:{slab:1,list:[{m:'b_fact',fit:'xz',size:72,x:0,z:-2}]},
  airfield:{list:[{m:'b_pad',fit:'xz',size:34,x:24,z:-28,y:2.6}]},
  shipyard:{slab:1,list:[{m:'b_dock',fit:'xz',size:66,x:0,z:0},{m:'b_crane',fit:'y',size:48,x:22,z:20,part:'crane'}]},
  turret:{slab:1,list:[{m:'b_turret',fit:'xz',size:30,part:'gun',col:'#5a5d4c',k:.85}]},
  sam:{slab:1,list:[{m:'sam',fit:'y',size:24,part:'gun',col:'#62664f',k:.6}]},
  uplink:{list:[{m:'b_radar',fit:'y',size:30,x:-26,z:26,part:'dish',col:'#8a908c',k:.82}]}};
function bldModel(e,o,T){const cfg=MODELS.ready&&BMOD[e.kind];if(!cfg||!cfg.list.every(q=>MODELS.proto[q.m]))return false;const P=o.userData.parts;
  if(!['turret','sam'].includes(e.kind)){const fg=new THREE.Group(),h2=e.size/2;fg.position.set(-h2+4,0,h2-4);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,30,6),new THREE.MeshStandardMaterial({color:0x8a8d90,metalness:.6,roughness:.4}));pole.position.y=15;pole.castShadow=true;fg.add(pole);
    const fgeo=new THREE.PlaneGeometry(15,9,8,1);fgeo.translate(7.5,0,0);const fl=new THREE.Mesh(fgeo,new THREE.MeshStandardMaterial({map:flagTex(T.fac),side:THREE.DoubleSide,roughness:.85,emissive:new THREE.Color(T.color),emissiveIntensity:.04}));{const tb=new THREE.Mesh(new THREE.BoxGeometry(.9,7,.9),new THREE.MeshStandardMaterial({color:new THREE.Color(T.color),roughness:.6}));tb.position.set(0,26.5,0);fg.add(tb);}fl.position.y=26.5;fl.castShadow=true;fg.add(fl);o.add(fg);P.flag=fl;fl.userData.base=fgeo.attributes.position.array.slice();}
  if(cfg.slab){const s=e.size,B=Bld(),tc='#'+new THREE.Color(T.color).lerp(new THREE.Color('#5a5c54'),.3).getHexString();B.box(s,2.4,s,0,1.2,0,'#a0937c');B.box(s-2,.7,3,0,2.5,s/2-3,tc);B.box(s-2,.7,3,0,2.5,-s/2+3,tc);B.box(3,.7,s-2,s/2-3,2.5,0,tc);B.box(3,.7,s-2,-s/2+3,2.5,0,tc);
    if(s>50){B.cyl(.5,.5,30,6,s/2-4,15,s/2-4,'#2b2d26');B.box(.3,7,11,s/2-4,26.5,s/2-9.5,tc);}const m=mesh(B.geo());o.add(m);P.main=m;}
  const RT={US:'#bdb49c',EU:'#b5b2a6',KR:'#b2b0a0',IR:'#c9b48a',SA:'#d2bd92',AE:'#d6c49c',EG:'#cdb68a',PK:'#c2b08a',IN:'#c7a98a',RS:'#c4ae84',DW:'#cbb58b',IM:'#a69a80',TR:'#c9b79a',IL:'#cfc3a6',RU:'#8b9479',CN:'#9a9c84',KP:'#848a72',CU:'#a8a07e',UA:'#949a84'}[T.fac];
  for(const q of cfg.list){const rc=q.col?{color:q.col}:(RT?{color:RT}:null);const m=instModel(q.m,rc,q.fit,q.size,q.ys,q.col?q.k:(RT?.42:undefined));if(!m)continue;m.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    if(q.part){const g=new THREE.Group();g.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);g.add(m);o.add(g);P[q.part]=g;}else{m.position.set(q.x||0,q.y??(cfg.slab?2.4:0),q.z||0);o.add(m);}}
  return true;}
// Smooth shading for merged, non-indexed foliage: average the face normals of every vertex that shares a position.
function smoothNorm(g){const P=g.attributes.position,N=g.attributes.normal;if(!N)return;const m=new Map(),key=i=>Math.round(P.getX(i)*20)+','+Math.round(P.getY(i)*20)+','+Math.round(P.getZ(i)*20);
  for(let i=0;i<P.count;i++){const k=key(i);let a=m.get(k);if(!a){a=[0,0,0];m.set(k,a);}a[0]+=N.getX(i);a[1]+=N.getY(i);a[2]+=N.getZ(i);}
  for(let i=0;i<P.count;i++){const a=m.get(key(i)),L=Math.hypot(a[0],a[1],a[2])||1;N.setXYZ(i,a[0]/L,a[1]/L,a[2]/L);}N.needsUpdate=true;}
function modelTrees(){if(!MODELS.ready||!G.treePos)return false;const keys=['tree1','tree2','tree3','tree4'].filter(k=>MODELS.proto[k]);if(!keys.length)return false;
  const slopeAt=(x,y)=>Math.hypot(groundH(x+6,y)-groundH(x-6,y),groundH(x,y+6)-groundH(x,y-6))/12;
  const per=keys.map(()=>[]),con=[[],[]];G.treePos.forEach((t,i)=>{if(slopeAt(t[0],t[1])>.35)return;if((G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75))return;const h=Math.sin(t[0]*.004)*Math.cos(t[1]*.005);if(G.map.theme==='snow'||(h>.2&&((i*7)%10)<3))con[i%2].push(t);else per[i%keys.length].push(t);});
  mats();[0,1].forEach(v=>{if(!con[v].length)return;const R=mulberry(v*17+3),B=Bld();B.cyl(.9,1.5,14,6,0,7,0,'#3d2e20');const tiers=5+v;for(let k=0;k<tiers;k++){const y=10+k*(30/tiers),r=(13-k*(10/tiers))*(.9+R()*.2);const c=new THREE.Color().setHSL(.24+R()*.04,.36+R()*.12,.12+R()*.05+k*.012);if(G.map.theme==='snow')c.lerp(new THREE.Color(.86,.9,.95),k%2?.62:.38);B.cone(r,15-k*1.2,7,0,y+6,0,c,0,R()*3,0);}
    const g=B.geo().index?B.geo().toNonIndexed():B.geo();{const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(y<14)continue;const j=Math.sin(x*.9+z*1.3+y*.4)*1.1;P.setXYZ(i,x+j*.6,y,z+j*.6);}}g.computeVertexNormals();smoothNorm(g);
    const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0});weather(tm,.4);const im=new THREE.InstancedMesh(g,tm,con[v].length);
    con[v].forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*.95,s*(.85+((i*7)%5)*.08),s*.95));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});
  {const all=[].concat(...per).filter((t,i)=>(i*37)%10<6&&!(G.sceneryPos||[]).some(([sx,sy])=>Math.hypot(t[0]-sx,t[1]-sy)<75));const VAR=3,lists=[[],[],[]],palms=[];all.forEach((t,i)=>{const nearW=Math.abs(G.map.depth(t[0],t[1]))<G.map.hw(t[0])+420;if((nearW&&i%3!==0)||i%7===0)palms.push(t);else lists[i%VAR].push(t);});
   if(palms.length){const R=mulberry(77),B=Bld(),bark='#7a6448';let px=0,py=0,pz=0;for(let k=0;k<8;k++){const ny=py+4.2,nx=px+k*.28;B.cyl(1.05-k*.06,1.2-k*.06,4.4,6,(px+nx)/2,(py+ny)/2,0,k%2?bark:'#6b563c',0,0,-.07*k);px=nx;py=ny;}
     for(let f=0;f<12;f++){const a=f/12*6.283+R()*.3,len=14+R()*5;for(let q=0;q<5;q++){const t=(q+.5)/5,d=t*len,droop=-Math.pow(t,1.7)*10+2.5;const g=new THREE.ConeGeometry(4.2*(1-t*.55),len/5+2,4);g.rotateZ(Math.PI/2);g.scale(1,.3,1);g.rotateY(-a);const c=new THREE.Color().setHSL(.22+R()*.04,.42,.2+t*.05);parts_add(B,g,px+Math.cos(a)*d,py+droop,Math.sin(a)*d,c);}}
     B.sph(1.6,px,py-.5,0,'#5d4a30');
     const g=B.geo().toNonIndexed();g.computeVertexNormals();smoothNorm(g);const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});weather(tm,.3);const im=new THREE.InstancedMesh(g,tm,palms.length);
     palms.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)-.5,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*.95,s*(.9+((i*7)%5)*.06),s*.95));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);}
   for(let v=0;v<VAR;v++){if(!lists[v].length)continue;const R=mulberry(v*53+11),B=Bld();const bark='#5b4632';
    B.cyl(.9,1.6,16,6,0,8,0,bark);const nb=3+(R()*2|0),tops=[];for(let b=0;b<nb;b++){const a=b/nb*6.28+R()*.6,lean=.55+R()*.25,L=10+R()*6;const bx=Math.cos(a)*Math.sin(lean)*L/2,bz=Math.sin(a)*Math.sin(lean)*L/2,by=16+Math.cos(lean)*L/2;B.cyl(.45,.75,L,5,bx,by,bz,bark,Math.sin(a)*lean,0,-Math.cos(a)*lean);tops.push([bx*2,16+Math.cos(lean)*L,bz*2]);}
    for(const [tx,ty,tz] of tops)for(let q=0;q<7;q++){const g=new THREE.IcosahedronGeometry(3+R()*2.6,1);const gp=g.attributes.position;for(let vi=0;vi<gp.count;vi++){const ph=q*1.7+tx;const j=1+.22*Math.sin(gp.getX(vi)*1.9+ph)*Math.cos(gp.getZ(vi)*2.3-ph)+.12*Math.sin(gp.getY(vi)*3.1+ph);gp.setXYZ(vi,gp.getX(vi)*j,gp.getY(vi)*j,gp.getZ(vi)*j);}g.scale(1.45,.5,1.45);const c=new THREE.Color().setHSL(.17+R()*.07,.3+R()*.14,.13+R()*.07);const qa=R()*6.28,qd=q?2+R()*6:0;parts_add(B,g,tx+Math.cos(qa)*qd,ty+.5+R()*2.6-qd*.12,tz+Math.sin(qa)*qd,c);}
    const g=B.geo().toNonIndexed();g.computeVertexNormals();smoothNorm(g);{const cn=g.attributes.normal,cc=g.attributes.color;if(cc)for(let vi=0;vi<cc.count;vi++){const r=cc.getX(vi),gg=cc.getY(vi),bb=cc.getZ(vi);if(gg>r*1.05&&gg>bb){const ny=cn.getY(vi);const k=ny<-.2?.55:ny>.6?1.12:.85;cc.setXYZ(vi,r*k,gg*k,bb*k*(ny>.6?.9:1));const nx=cn.getX(vi),nz=cn.getZ(vi),L=Math.hypot(nx,ny+.9,nz)||1;cn.setXYZ(vi,nx/L,(ny+.9)/L,nz/L);}}}const tm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:false});weather(tm,.35);{const ob=tm.onBeforeCompile;tm.onBeforeCompile=sh=>{ob(sh);if(window.WINDU){sh.uniforms.wt=WINDU;sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n');sh.fragmentShader=sh.fragmentShader.replace('float dh=1.-smoothstep','if(diffuseColor.g>diffuseColor.r*1.02&&vWP.y>14.){float lf=wn(vWP*.95)*.55+wn(vWP*2.6)*.45;diffuseColor.rgb*=.62+.62*smoothstep(.28,.72,lf);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.05,.78),smoothstep(.55,.8,wn(vWP*.31+3.1))*.6);}float dh=1.-smoothstep');sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wt;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(transformed.y-12.,0.)/20.;transformed.x+=sin(wt*.9+ip.x*.013)*k*k*1.2;transformed.z+=cos(wt*.7+ip.z*.011)*k*k*.6;}');}};tm.customProgramCacheKey=()=>'wxtree';}const im=new THREE.InstancedMesh(g,tm,lists[v].length);
    lists[v].forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)-.5,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s*1.05,s*(.85+((i*7)%5)*.07),s*1.05));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);}
   return true;}
  keys.forEach((k,ki)=>{const root=MODELS.proto[k].scene;const n=normScale(root,'y',40);root.updateMatrixWorld(true);const base=new THREE.Matrix4().compose(new THREE.Vector3(-n.cx*n.s,-n.my*n.s,-n.cz*n.s),new THREE.Quaternion(),new THREE.Vector3(n.s,n.s,n.s));
    root.traverse(mm=>{if(!mm.isMesh)return;const tm=mm.material.clone();weather(tm,.5);if(tm.color){tm.color.offsetHSL(.02,-.2,.03);}tm.roughness=1;tm.metalness=0;const im=new THREE.InstancedMesh(mm.geometry,tm,per[ki].length);const local=new THREE.Matrix4().multiplyMatrices(base,mm.matrixWorld);
      per[ki].forEach(([x,y,s,r],i)=>{const M=new THREE.Matrix4().compose(new THREE.Vector3(x,groundH(x,y),y),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s,s*(.85+((i*7)%5)*.07),s));M.multiply(local);im.setMatrixAt(i,M);});
      im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});});return true;}
function scenery(){G.sceneryPos=[];if(!MODELS.ready||!G.map)return;mats();const R=mulberry((G.seed||1)*7+41),M=G.map,rm=G.roadMask;let placed=0;
  const ok=(x,y)=>{if(x<120||y<120||x>MAPW-120||y>MAPH-120)return false;if(Math.abs(M.depth(x,y))<M.hw(x)+120)return false;if(BASES.some(([bx,by])=>Math.hypot(x-bx,y-by)<520))return false;if(M.fields.some(f=>Math.hypot(f.x-x,f.y-y)<f.r+120))return false;if(M.oil.some(o=>Math.hypot(o.x-x,o.y-y)<140))return false;if(rm&&rm.f&&rm.f[(y/rm.C|0)*rm.w+(x/rm.C|0)]>.05)return false;
    const sl=Math.hypot(groundH(x+10,y)-groundH(x-10,y),groundH(x,y+10)-groundH(x,y-10))/20;return sl<.15;};
  {const HB=Bld();const st='#3a3a36';for(const [rx,rz] of [[0,0],[Math.PI/2,0],[0,Math.PI/2]]){HB.box(2.6,26,2.6,0,0,0,st,rx+.5,0,rz);}const hg=HB.geo();const hm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.55});weather(hm,.9);const HP=[];
   for(let k=0;k<60&&HP.length<34;k++){const cx=R()*MAPW,cy=R()*MAPH;if(!ok(cx,cy))continue;for(let j=0;j<3+(R()*3|0);j++){const x=cx+(R()-.5)*90,y=cy+(R()-.5)*40;if(ok(x,y))HP.push([x,y,R()*6.28]);}}
   const im=new THREE.InstancedMesh(hg,hm,HP.length);HP.forEach(([x,y,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y)+6,y),TMPQ.setFromEuler(new THREE.Euler(0,r,0)),new THREE.Vector3(1.1,1.1,1.1));im.setMatrixAt(i,TMPM);});im.castShadow=true;im.receiveShadow=true;WORLD.add(im);G.hedgePos=HP;
   G.craters=[];for(let k=0;k<45;k++){const x=R()*MAPW,y=R()*MAPH;if(ok(x,y))G.craters.push([x,y,8+R()*10]);}}
  for(const c of (G.ruins||[])){const g=new THREE.Group();g.position.set(c.x,groundH(c.x,c.y),c.y);g.rotation.y=c.rot;WORLD.add(g);c.obj=g;g.visible=!c.dead;(G.sceneryPos=G.sceneryPos||[]).push([c.x,c.y,0]);
    const B=Bld(),w='#9b8a6e',w2='#8a7a60';B.box(46,10,3,0,5,-15,w);B.box(3,13,30,-23,6.5,0,w);B.box(3,8,14,23,4,-8,w2);B.box(20,6,3,12,3,15,w2,0,0,.15);B.box(12,3,3,-14,1.5,15,w2);
    for(const [x,z] of [[-12,-15],[8,-15]])B.box(5,4,3.4,x,5,-15,'#2a2620');B.box(14,3,10,6,1.5,-2,'#7f735d',.3,.4,0);B.box(8,2,6,-10,1,6,'#6e6352',0,.8,.2);B.box(48,.6,32,0,.3,0,'#7a6e58');
    const m=mesh(B.geo());m.castShadow=m.receiveShadow=true;g.add(m);propObj('barrel',-16,-8,0,g);propObj('crate',16,6,.4,g);}
  for(let tries=0;tries<400&&placed<9;tries++){const x=R()*MAPW,y=R()*MAPH;if(!ok(x,y))continue;placed++;if(placed%3===0)continue;const g=new THREE.Group();g.position.set(x,groundH(x,y),y);g.rotation.y=R()*6.28;g.userData.scenery=1;WORLD.add(g);const kind=placed%3;(G.sceneryPos=G.sceneryPos||[]).push([x,y,kind]);
    if(kind===0){const B=Bld();const w='#9b8a6e';B.box(60,9,4,0,4.5,-20,w);B.box(4,14,40,-30,7,0,w);B.box(22,6,4,18,3,20,w,0,0,.2);B.box(14,3,10,10,1.5,-6,'#7f735d',.3,.4,0);B.box(8,2,6,-12,1,8,'#6e6352',0,.8,.2);const m=mesh(B.geo());m.castShadow=m.receiveShadow=true;g.add(m);propObj('barrel',-20,-10,0,g);propObj('crate',22,-8,.4,g);}
    else if(kind===1){for(let i=-2;i<=2;i++)propObj('sandbag',i*14,0,(i%2)*.15,g);propObj('sandbag',-34,10,1.2,g);propObj('sandbag',34,10,-1.2,g);propObj('crate',0,14,.3,g);propObj('barrel',10,16,0,g);}
    else{propObj(R()<.5?'container':'containerG',0,0,.1,g);propObj('barrel',22,10,0,g);propObj('barrel',26,4,0,g);propObj('pallet',-20,8,.5,g);const B=Bld();B.box(18,7,10,0,3.5,0,'#2b2723',0,0,.1);B.box(10,5,9,-2,8,0,'#221f1c');const m=mesh(B.geo());m.position.set(-8,0,-26);m.rotation.y=.7;m.castShadow=true;g.add(m);{const v=new THREE.Vector3(-8,0,-26).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y);const sp=G.sceneryPos[G.sceneryPos.length-1];sp[3]=x+v.x;sp[4]=y+v.z;}scorch(x-8,y-26,14);}}}
loadModels();
