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
]);
}
