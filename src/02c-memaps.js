/* ================= MIDDLE EAST CONQUEST MAPS (D-ME, "memaps"; Abdullah 2026-11-06 23:11 "many maps of Israel", 23:12 "many Middle Eastern maps")
   One data-driven template (ME) on the same 4-fold-symmetric 'quad' footing as 02b-realmaps.js: each map = ONE data row for the north-west
   quarter (mirrored x and y, so every corner start has identical ground, towns and supply: fairness by construction, checked by orch/mapfair.mjs).
   Row fields: n name, th theme, rg rough, ssn default season, home nations, tag, desc, c towns [x,y,r,style] (NW quarter; centre town last in cc),
   riv rivers [ax,ay,bx,by,wiggle,halfwidth], br bridges [riverIdx,t], rd ridges [ax,ay,bx,by,halfwidth], pk peaks [x,y,r,rx,rot],
   lk lakes [x,y,r,rx], sea [x,y,r,rx] (a big lake over the map edge). Real places inspire the layout; towns carry real nearby names in desc only.
   No holy sites are objectives (they live on the grand map). */
{
const QS=[[420,300],[2780,1900],[2780,300],[420,1900],[420,1100],[2780,1100]];
const Q4=L=>mirrorList(mirrorList(L,'x'),'y');
const pl=(a,b,amp,ph)=>{const n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40)),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,p=[];for(let i=0;i<=n;i++){const t=i/n,w=amp*(Math.sin(t*9+ph)+.4*Math.sin(t*23+ph*2));p.push([a[0]+dx*t-dy/L*w,a[1]+dy*t+dx/L*w]);}return p;};
const ME=S=>[S.k,{name:S.n,min:2,max:S.max||6,sym:'quad',theme:S.th||'desert',rough:S.rg||1.2,ssn:S.ssn||1,home:S.home,tag:S.tag,desc:S.desc,fieldMinB:S.fmb,
  slots:QS,cities:Q4(S.c).concat([S.cc||[1600,1100,130,'mideast']]),
  water(M,R){const ph=R()*6.28;
    for(const [ax,ay,bx,by,am,hw] of S.riv||[])M.rivers.push({pts:pl([ax,ay],[bx,by],am,ph),hw:()=>hw});
    if(S.br){M.bridgeAt=S.br.slice();M.bridgeFrac=true;}
    for(const [ax,ay,bx,by,hw] of S.rd||[])M.ridges.push({pts:pl([ax,ay],[bx,by],14,ph),hw:()=>hw});
    for(const [x,y,r,rx,rot] of S.pk||[])M.peaks.push({x,y,r,rx:rx||1.4,rot:rot||0});
    for(const [x,y,r,rx] of S.lk||[])M.lakes.push({x,y,r,rx:rx||1,wob:q=>.08*Math.sin(q*3+ph)});
    if(S.sea)M.lakes.push({x:S.sea[0],y:S.sea[1],r:S.sea[2],rx:S.sea[3]||1,wob:q=>.05*Math.sin(q*4+ph)});
    mirrorMap(M,'x');mirrorMap(M,'y');}}];
const add=L=>{for(const S of L){const [k,D]=ME(S);if(D.fieldMinB==null)delete D.fieldMinB;MAPS[k]=D;}MAP_KEYS.length=0;for(const k of Object.keys(MAPS))MAP_KEYS.push(k);};
add([
/* ---------- ISRAEL (6) ---------- */
{k:'negev',n:'Negev: Desert Crater',th:'desert',rg:1.25,home:['IL','EG'],tag:'open desert · crater rims · dry-wadi passes',
 desc:'The Negev: open stony desert with the great erosion craters as natural fortresses. Dry wadis between the crater rims are the only fast roads; the desert crossroads town in the middle supplies whoever holds it.',
 c:[[1000,470,95,'mideast'],[600,900,70,'mideast'],[1250,880,70,'mideast']],cc:[1600,1100,140,'mideast'],
 rd:[[820,640,1160,560,70],[1300,1000,1450,820,66],[560,640,640,780,60]],pk:[[1000,1000,100,1.9,.3],[1450,420,70,1.4,-.4],[760,420,50,1.3,.2]]},
{k:'galileehills',n:'Galilee: Hills and Lake',th:'green',rg:1.4,ssn:1,home:['IL','RS'],tag:'green hills · lake · river · hilltop towns',
 desc:'Green Upper Galilee: terraced hills with hilltop towns, a long ridge with narrow passes and the freshwater lake with the Jordan flowing south out of it. Hold the ridge passes or the lakeside crossroads.',
 c:[[760,470,95,'lebanon'],[1150,330,75,'lebanon'],[900,900,75,'mideast']],cc:[1600,1100,125,'mideast'],
 rd:[[980,-60,1040,430,86],[1080,640,1280,860,80]],pk:[[1050,560,70,1.5,.4],[1300,300,60,1.3,-.3]],lk:[[1600,170,170,1.1]],
 riv:[[1600,260,1600,1100,26,34]],br:[[0,.45]]},
{k:'jordanvalley',n:'Jordan Valley: Rift Crossing',th:'desert',rg:1.3,home:['IL','JO'],tag:'rift valley · river · salt sea · fords',
 desc:'The deep Jordan Rift: a winding river on each side of a hot flat valley floor, escarpments to climb on both flanks and the salt sea at the far ends. A few fords and bridges decide who crosses.',
 c:[[820,470,90,'mideast'],[1020,950,80,'mideast'],[580,880,65,'mideast']],cc:[1600,1100,130,'mideast'],
 riv:[[1180,-200,1260,1100,60,48]],br:[[0,.35],[0,.62],[0,.88]],rd:[[620,560,780,800,76]],pk:[[480,760,60,1.4,.3]],sea:[1600,-420,640,1.5]},
{k:'carmelcoast',n:'Carmel Coast: Haifa Bay',th:'green',rg:1.15,home:['IL','RS'],fmb:300,tag:'sea coast · bay port · ridge · river · navies',
 desc:'The Mediterranean shore around a great bay and port city: the Carmel ridge rises behind it, a small river crosses the plain and the sea lanes carry the fleets. Take the port for supply; hold the ridge for the view.',
 c:[[700,230,95,'gulfcity'],[780,700,115,'gulfcity'],[1180,520,75,'mideast']],cc:[1600,1100,135,'mideast'],
 sea:[-340,1100,640,.72],rd:[[980,60,1180,380,84],[1030,720,1290,920,76]],riv:[[560,880,1600,700,50,40]],br:[[0,.5],[0,.85]],pk:[[1150,320,80,1.5,.6]]},
{k:'coastalplain',n:'Coastal Plain: Tel Aviv Sprawl',th:'temperate',rg:1.05,ssn:1,home:['IL','JO'],fmb:300,tag:'dense city sprawl · beaches · river · low hills',
 desc:'A dense coastal city belt: towers, suburbs and highways between the sea and the first hills. Short sight lines, many roads, a small river with bridges, and cities worth more than any hill.',
 c:[[700,520,130,'gulfcity'],[1000,820,110,'mideast'],[1200,300,100,'mideast'],[560,1000,85,'mideast']],cc:[1600,1100,150,'gulfcity'],
 sea:[-340,1100,640,.72],riv:[[700,260,1600,560,40,34]],br:[[0,.4],[0,.8]],rd:[[1320,780,1400,1060,70]],pk:[[1450,660,55,1.3,.2]]},
{k:'eilatgulf',n:'Eilat: Sinai Border and Gulf',th:'desert',rg:1.5,home:['IL','EG'],tag:'red mountains · gulf · border passes',
 desc:'The southern tip: red granite mountains plunging into a narrow blue gulf, a border town on the coast and the wadi roads to the north. Mountain ranges with three passes decide it.',
 c:[[900,350,95,'gulfcity'],[1250,620,65,'mideast'],[600,900,65,'mideast']],cc:[1600,1100,110,'mideast'],
 sea:[1600,-400,640,2.4],rd:[[700,640,1180,760,92],[1280,880,1430,560,86],[470,700,530,940,70]],pk:[[1000,1000,90,1.6,.4],[1450,300,70,1.4,-.2]]},
/* ---------- IRAQ (5 new; with mesopotamia + marsh = 6) ---------- */
{k:'mosulcity',n:'Mosul: Old City on the Tigris',th:'desert',rg:1.15,home:['IQ','KD'],tag:'dense old city · river · bridges · dust',
 desc:'A big northern Iraqi city split by the Tigris: a dense old quarter, five bridges, rubble-prone streets and open farmland and low hills around it. Whoever holds the bridges holds the city.',
 c:[[760,520,120,'mideast'],[1150,300,85,'mideast'],[560,950,75,'mideast']],cc:[1600,1100,160,'mideast'],
 riv:[[1000,-200,1100,1100,70,52]],br:[[0,.3],[0,.5],[0,.7],[0,.9]],rd:[[620,720,760,900,66]],pk:[[1350,760,60,1.4,.3]]},
{k:'tigristowns',n:'Tigris: River Towns',th:'desert',rg:1.1,home:['IQ','IR'],tag:'wide river · palm groves · river towns',
 desc:'The middle Tigris: a broad slow river with palm-grove towns on both banks, canals and a handful of bridges. Armies shuttle by the bridge towns while artillery covers the river.',
 c:[[760,420,95,'mideast'],[1100,860,90,'mideast'],[540,880,70,'mideast']],cc:[1600,1100,140,'mideast'],
 riv:[[1250,-200,1250,1100,70,70]],br:[[0,.3],[0,.62],[0,.9]],lk:[[800,640,55,1.3]],pk:[[1450,520,50,1.3,.4]]},
{k:'anbardesert',n:'Anbar: Euphrates and Desert',th:'desert',rg:1.15,home:['IQ','SY','JO'],tag:'open desert · river valley · highway',
 desc:'The western desert of Iraq: a green Euphrates strip with towns and dams, empty gravel plain, a long highway and wadis. Fast open fighting, with the river-valley towns as the prize.',
 c:[[760,520,95,'mideast'],[1150,300,85,'mideast'],[560,900,70,'mideast']],cc:[1600,1100,130,'mideast'],
 riv:[[200,760,1500,560,70,50]],br:[[0,.4],[0,.8]],rd:[[1100,860,1300,1020,64]],pk:[[1000,1000,60,1.6,.2]]},
{k:'basraport',n:'Basra: Shatt al-Arab Port',th:'desert',rg:1.05,home:['IQ','IR'],fmb:300,tag:'estuary · port · refineries · islands',
 desc:'The southern port: a wide tidal estuary with island flats, refineries and docks, canals and a causeway or two. Fleets and river craft fight for the waterway, tanks for the causeways.',
 c:[[700,480,110,'gulfcity'],[1050,860,90,'gulfcity'],[1200,300,80,'mideast']],cc:[1600,1100,150,'gulfcity'],
 sea:[1600,-380,640,2.2],riv:[[900,260,900,1100,60,56]],br:[[0,.55],[0,.85]],lk:[[1250,640,70,1.5]]},
{k:'marshes',n:'Southern Marshes',th:'green',rg:1.0,home:['IQ','RV','IR'],tag:'reed marsh · lagoons · causeways · villages',
 desc:'The great southern marshes: reed islands and shallow lagoons, canoe villages and narrow causeways. Few roads, many ambush lanes; the island market town in the middle supplies the winner.',
 c:[[700,480,85,'mideast'],[1050,820,80,'mideast'],[1250,360,70,'mideast']],cc:[1600,1100,120,'mideast'],
 lk:[[1000,560,150,1.3],[700,960,120,1.4],[1280,820,90,1.2],[1400,420,80,1.2]],riv:[[200,180,1500,1000,60,34]],br:[[0,.35],[0,.7]]},
/* ---------- SYRIA (5 new; with aleppo = 6) ---------- */
{k:'euphratesvalley',n:'Euphrates Valley and Dam',th:'desert',rg:1.2,home:['SY','IQ','TR'],tag:'river valley · dam lake · steppe',
 desc:'The Syrian Euphrates: a green valley under a huge dam lake, steppe towns on the plateau above it and few crossings. The dam crossing is the objective every army wants.',
 c:[[760,520,95,'mideast'],[1150,820,85,'mideast'],[580,950,70,'mideast']],cc:[1600,1100,130,'mideast'],
 riv:[[1150,-200,1250,1100,60,60]],br:[[0,.55]],lk:[[1280,330,170,1.5]],rd:[[600,660,780,820,66]]},
{k:'homsgap',n:'Homs Gap',th:'green',rg:1.25,home:['SY','RS','IL'],tag:'mountain gap · orchards · highway',
 desc:'The wide gap between the coastal mountains and the Lebanese mountains: orchards and a river valley, the highway from the coast to the interior and a lake and an old fortress hill. A classic invasion route.',
 c:[[760,470,100,'lebanon'],[1150,300,80,'mideast'],[560,900,75,'lebanon']],cc:[1600,1100,140,'mideast'],
 rd:[[900,-60,980,620,90],[820,800,1000,1000,80]],lk:[[1280,760,90,1.4]],riv:[[300,620,1500,700,50,34]],br:[[0,.4],[0,.8]],pk:[[1200,420,60,1.4,-.3]]},
{k:'latakiamtns',n:'Latakia: Coastal Mountains',th:'green',rg:1.55,home:['SY','TR'],fmb:300,tag:'forested mountains · coast · port',
 desc:'Forested coastal mountains tumbling into the sea, a port city on the shore and winding valley roads. Hard to see and hard to move: ambush country.',
 c:[[700,520,100,'gulfcity'],[1100,300,70,'lebanon'],[1000,900,70,'lebanon']],cc:[1600,1100,120,'lebanon'],
 sea:[-340,1100,640,.72],rd:[[900,0,1100,500,86],[760,760,1140,940,80],[1250,860,1450,650,76]],pk:[[1000,640,80,1.4,.4],[1300,300,70,1.3,-.3]]},
{k:'ghouta',n:'Damascus: Orchard Ring',th:'green',rg:1.0,home:['SY','IL','JO'],tag:'orchard belt · dense suburbs · desert edge',
 desc:'An oasis capital ringed by orchards and canals: dense suburbs, irrigated groves hiding infantry and a bare desert plateau behind. Tight streets inside, open sight lines outside.',
 c:[[700,520,125,'mideast'],[1050,820,100,'mideast'],[1200,330,90,'mideast'],[560,1000,80,'mideast']],cc:[1600,1100,160,'mideast'],
 riv:[[600,300,1500,640,40,30]],br:[[0,.3],[0,.6],[0,.9]],rd:[[1300,860,1420,1060,70]],pk:[[1450,700,60,1.4,.3]]},
{k:'palmyra',n:'Palmyra Desert',th:'desert',rg:1.15,home:['SY','IQ'],tag:'open desert · oasis · desert highway',
 desc:'The Syrian desert: an oasis town with its ancient colonnaded ruins as scenery, bare ridges, gas fields and one long highway. Pure mobile warfare.',
 c:[[760,500,90,'mideast'],[1150,820,80,'mideast'],[560,900,65,'mideast']],cc:[1600,1100,130,'mideast'],
 rd:[[900,600,1250,520,70],[1300,900,1450,1000,66]],pk:[[1000,1000,70,1.7,.3],[1400,400,60,1.4,-.4]],lk:[[640,680,50,1.2]]},
]);
}
