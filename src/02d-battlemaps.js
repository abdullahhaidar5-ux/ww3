/* BATTLE MAP KIT (Abdullah 2026-11-11 19:40 "own small Generals-style maps with supply sources and oil derricks",
   20:14 "many more maps of all sizes and themes"). Maps for the Battle game only; Conquest and campaign maps are untouched.

   One compact data format, an extension of the map editor's custom-map format (cmCanon / cmBuild in 02-map.js): a Battle
   map is expanded by its symmetry and then goes through the SAME loader, so there is one map system. Everything is plain
   data on the 3200 x 2200 design sheet (the world is scaled by the map's size); no random numbers are used for the layout,
   so host, clients, saves and checkpoints rebuild the same battlefield from the map key ('bm_<id>') + seed.

   BMAPS.<id> = {
     nm:'Name', ds:'one line for the map list', z:0|1|2 (Small / Medium / Large), th:'desert'|'green'|'snow',
     tg:'theme words for the list', cs:'mideast' (town style, one of CM_STYLES),
     sym:'r' (turn half the map 180 degrees) | 'x' (mirror left-right) | 'y' (mirror top-bottom) | 'q' (all four quarters),
     -- author ONE part of the map; the kit mirrors every list below, so starts and resources are symmetric by construction --
     sl:[[x,y]..]            start spots (after mirroring: 1st and 2nd are opposite each other, and so on)
     fl:[[x,y,amt?]..]       supply sources (amt in hundreds of $, default 90 = $9,000)
     oil:[[x,y]..]           oil derricks (neutral, capture with infantry: steady income)
     ct:[[x,y,r,style?]..]   towns (neutral buildings infantry can garrison)     hm:[[x,y]..] hamlets
     rg:[[w,x,y,x,y..]..]    cliffs / ridges (impassable)    pk:[[x,y,r]..] rock outcrops
     rv:[[w,x,y,x,y..]..]    rivers / sea lanes (ships sail them)   lk:[[x,y,r]..] lakes / sea   br:[[x,y,deg]..] bridges
     rd:[[x,y,x,y..]..]      roads     wd:[[x,y,r]..] woods
     c:{ ...same lists... }  things ON the mirror line or in the middle: placed once, not mirrored
   }
   hold:1  keeps a map out of every list (checker still runs it) until node orch/battlemapfair.mjs --battles passes for it.
   Check a map: node orch/battlemapfair.mjs --maps <id>   (a map that fails must not be listed here). */
const BM={},BM_KEYS=[],BM_HELD=[];  // BM_HELD = maps held back from the list until their AI-vs-AI win rates pass (hold:1 in the data)
const BM_LISTS=['sl','fl','oil','ct','hm','rg','pk','rv','lk','br','rd','wd'];
function bmExpand(S){
  const W=3200,H=2200,fx=S.sym==='x'||S.sym==='q',fy=S.sym==='y'||S.sym==='q',rot=S.sym==='r';
  // the copies of one point, in the order: itself, its opposite, then the other two quarters
  const T=rot?[[0,0],[1,1]]:S.sym==='q'?[[0,0],[1,1],[1,0],[0,1]]:fx?[[0,0],[1,0]]:fy?[[0,0],[0,1]]:[[0,0]];
  const P=(x,y,[mx,my])=>[mx?W-x:x,my?H-y:y];
  const out={};
  for(const k of BM_LISTS){const L=[],seen=new Set(),add=e=>{const id=JSON.stringify(e);if(!seen.has(id)){seen.add(id);L.push(e);}};
    for(const e of S[k]||[])for(const t of T){
      if(k==='rg'||k==='rv'){const r=[e[0]];for(let i=1;i+1<e.length;i+=2)r.push(...P(e[i],e[i+1],t));add(r);}
      else if(k==='rd'){const r=[];for(let i=0;i+1<e.length;i+=2)r.push(...P(e[i],e[i+1],t));add(r);}
      else if(k==='br'){const [x,y]=P(e[0],e[1],t);let d=e[2]|0;if(t[0])d=180-d;if(t[1])d=-d;d=((d%180)+180)%180;add([x,y,d]);}
      else{const [x,y]=P(e[0],e[1],t);add([x,y,...e.slice(2)]);}}
    for(const e of (S.c&&S.c[k])||[])add(e.slice());
    out[k]=L;}
  return out;}
function bmRegister(id,S){
  const E=bmExpand(S),key='bm_'+id,st=Math.max(0,CM_STYLES.indexOf(S.cs||'mideast'));
  const c=cmCanon({nm:S.nm,z:S.z|0,th:S.th,sl:E.sl,rv:E.rv,rg:E.rg,rd:E.rd,lk:E.lk,pk:E.pk,wd:E.wd,
    ct:E.ct.map(q=>[q[0],q[1],q[2],typeof q[3]==='string'?Math.max(0,CM_STYLES.indexOf(q[3])):st]),oil:E.oil,hm:E.hm,fl:E.fl,br:E.br});
  if(!c)return null;
  const D=cmBuild(c,key);delete D.custom;delete D.cmKey;
  // Battle extras the editor format does not carry: supply amounts, the list texts, and "no automatic base field"
  D.bm=1;D.manual=true;D.hstyle=S.cs||'mideast';D.min=2;D.max=c.sl.length;D.tag=S.tg||c.th;D.desc=S.ds||'';D.fieldAt=E.fl.map(q=>q.slice(0,3));D.oilAt=E.oil.map(q=>q.slice(0,3));
  MAPS[key]=D;BM[key]={id,S,E,c};const L=S.hold?BM_HELD:BM_KEYS;if(!L.includes(key))L.push(key);return key;}
// what the map list shows for a Battle map (name, players, size, theme, one line)
function bmInfo(key){const B=BM[key],D=MAPS[key];if(!B||!D)return null;
  return{k:key,name:D.name,players:D.max,size:CM_SIZES[B.c.z],theme:D.tag,desc:D.desc,supply:B.E.fl.length,oil:B.E.oil.length};}
// the map list of a game: Battle has its own maps, Conquest keeps its list
function mapKeysFor(battle){return battle&&BM_KEYS.length?BM_KEYS:MAP_KEYS;}
function isBattleMap(k){return !!BM[k];}

const BMAPS={
  // ---- 2 players ----
  tarbasin:{hold:1,nm:'Tar Basin',z:0,th:'desert',tg:'desert oil field',cs:'mideast',sym:'r',
    ds:'A dry basin with an oil field in the middle. Three lanes between two rock outcrops; whoever holds the derricks out-earns the other.',
    sl:[[430,1100]],
    fl:[[650,830,120],[610,1400,90],[1120,400,90]],
    oil:[[300,700],[1600,800]],
    pk:[[1230,770,105],[1330,1530,85]],
    hm:[[1010,1130]],
    wd:[[820,1860,90]],
    rd:[[430,1100,1000,1010,1600,1100]],
    c:{oil:[[1600,1100]]}},
  splitridge:{nm:'Split Ridge',z:0,th:'snow',tg:'mountain pass',cs:'russia',sym:'r',
    ds:'A mountain wall cuts the map in two. Only the north pass and the south pass lead through, each with a derrick in its mouth.',
    sl:[[440,1100]],
    fl:[[660,840,120],[640,1380,90],[1150,300,90]],
    oil:[[320,1560],[1590,690]],
    rg:[[75,1500,-60,1530,220,1560,470]],
    pk:[[1010,1180,80],[1180,1840,95]],
    wd:[[900,560,110],[1240,1480,80]],
    hm:[[1120,820]],
    rd:[[440,1100,1100,760,1590,690]],
    c:{rg:[[75,1565,900,1600,1100,1635,1300]]}},
  ferryquarter:{nm:'Ferry Quarter',z:0,th:'green',tg:'river city',cs:'europe',sym:'r',
    ds:'A river splits an old city. Three bridges, street fighting on both banks, and derricks by the outer bridges.',
    sl:[[430,1100]],
    fl:[[650,820,120],[620,1400,90],[1040,380,90]],
    oil:[[300,660],[1330,1840]],
    ct:[[1240,1100,165]],
    br:[[1552,330,0]],
    wd:[[800,1800,100],[1020,720,70]],
    rd:[[430,1100,1060,1100],[1040,380,1552,330]],
    c:{rv:[[70,1540,-60,1552,330,1575,700,1600,1100,1625,1500,1648,1870,1660,2260]],br:[[1600,1100,0]]}},
  // ---- 4 players ----
  breakwater:{nm:'Breakwater',z:1,th:'desert',tg:'coast · naval lane',cs:'gulfcity',sym:'q',
    ds:'A sea lane runs through the middle from coast to coast. Two bridges cross it; ships in the lane can shell both of them.',
    sl:[[560,560]],
    fl:[[770,400,120],[400,770,90],[1250,330,90]],
    oil:[[260,330],[1020,880],[1600,620]],
    lk:[[0,1100,400]],
    br:[[900,1100,90]],
    ct:[[1600,880,105]],
    pk:[[1210,640,70]],
    wd:[[1900,330,80]],
    rd:[[560,560,900,760,900,1100],[560,560,1600,470]],
    c:{rv:[[120,-60,1100,800,1100,1600,1100,2400,1100,3260,1100]]}},
  fourmills:{nm:'Four Mills',z:1,th:'green',tg:'valley · towns',cs:'europe',sym:'q',
    ds:'Four mill towns in a green valley. Hill spurs split north from south; the two gaps between them hold the derricks.',
    sl:[[500,430]],
    fl:[[760,250,120],[300,700,90],[1600,280,100]],
    oil:[[250,250],[1120,1100]],
    rg:[[70,-60,1100,330,1100,660,1100]],
    ct:[[1130,640,120],[1600,760,90]],
    wd:[[820,860,90],[1380,330,70]],
    rd:[[500,430,1130,640,1120,1100],[1130,640,1600,760]],
    c:{pk:[[1600,1100,150]]}},
  // ---- 6 players ----
  sixroads:{nm:'Six Roads',z:2,th:'green',tg:'mixed · lake, hills, towns',cs:'europe',sym:'q',
    ds:'Six bases in a ring around a lake. Every neighbor shares a derrick with you, and every road ends at the lakeside towns.',
    sl:[[350,1100],[1040,300]],
    fl:[[510,960,105],[900,460,120],[1250,300,90],[1100,1100,90],[1330,760,90]],
    oil:[[911,886],[1600,515]],
    ct:[[1600,810,95]],
    pk:[[280,330,120],[1600,130,60]],
    rg:[[55,560,560,700,470]],
    wd:[[1240,960,80],[2000,560,70],[620,1500,80]],
    rd:[[350,1100,1100,1100,1420,1000],[1040,300,1330,760,1600,810]],
    c:{lk:[[1600,1100,160]]}},
};
for(const id in BMAPS)bmRegister(id,BMAPS[id]);

/* ===== THE BATTLE MAP LIST (maptrim, Abdullah 2026-11-13 21:17 "cut the Battle list down to great, tested maps") =====
   ONE allow-list: [map key, fewest players, most players]. Battle setup, the online lobby, the map picker, Random battlefield,
   quick start, Test range and the AI's random picks all read it (BM_KEYS is this list). A map is here only after
   `node orch/battlemapfair.mjs` showed every start winning 40-60% of its AI-vs-AI Battle games at the player counts
   listed; the numbers are in orch/reports/maptrim.md (orch/decisions.mjs checks that every entry has a row there).
   Every other map is out of the Battle lists. Their data stays (old saves, the editor and missions still load them). */
const BATTLE_MAPS=[
  ['bm_splitridge',2,2],['bm_ferryquarter',2,2],['bm_breakwater',2,4],['bm_fourmills',2,4],['bm_sixroads',2,6],
];
const BATTLE_FALLBACK='bm_splitridge';
for(const [k,lo,hi] of BATTLE_MAPS){const D=MAPS[k];if(!D)continue;if(!D.bm&&D.maxFull==null){D.minFull=D.min;D.maxFull=D.max;}D.min=lo;D.max=hi;if(!BM_KEYS.includes(k))BM_KEYS.push(k);}
BM_KEYS.length=0;for(const [k] of BATTLE_MAPS)if(MAPS[k])BM_KEYS.push(k);
// a map that is not in the list (old save of a new game, link, lobby, setting) becomes a listed map with enough slots:
// the same terrain theme first, then the closest size; deterministic, so host and clients agree
function battleMapFix(k,n){n=Math.max(2,n|0);const ok=q=>{const D=MAPS[q];return !!D&&D.min<=n&&D.max>=n;};
  if(BM_KEYS.includes(k)&&ok(k))return k;
  const th=(MAPS[k]&&(MAPS[k].theme||MAPS[k].tag))||'',c=BM_KEYS.filter(ok);
  if(!c.length)return BM_KEYS.includes(BATTLE_FALLBACK)?BATTLE_FALLBACK:BM_KEYS[0];
  return (c.find(q=>(MAPS[q].theme||MAPS[q].tag)===th&&th)||c.find(q=>MAPS[q].max===n)||c[0]);}
