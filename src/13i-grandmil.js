// ===== 13i-grandmil: grand stage 3 - MILITARY on the grand map (prefix gmil*) =====
// Generals (named, fictional, traits, levels, killed/captured), front lines (hold / push / counter, AI-assist), map strikes
// (missile / air raid / drone against buildings, armies or fleets, air defence intercepts), fleets & sea zones (a fleet is an
// army with a.fl=1 made of ships, so movement, battles, saves and the 3D map reuse the army code), blockades (cut port income
// and sea trade of 13g-grandeco), escorts for crossings, mines and subs. AI empires use all of it. Everything here is
// deterministic: random draws come from grRng seeded with the campaign seed, the turn and a stable index.
// State: GC.mil = {g:{id:general}, gid, fr:[fronts], fid, zm:{zone:{o,n}}, fq:[fleet queue], n:{nation:{ms,so}}, bk:{province:1}, foe}
const GMIL_TR=[['Armour expert','Tanks, helicopters and the hero squad +10% tougher.'],['Defender','Whole army +9% tougher when it defends (+6% in auto-resolve).'],['Logistician','Ammo and fuel full at battle start; half the hunger losses.'],['Raider','Infantry and light units +10% tougher; fewer men lost in a won field battle.']];
const GMIL_LVN=[60,150,280,450];   // experience for levels 1-4
const GMIL_NM={   // fictional name pools per culture [first names, family names] - generic, no real commanders
 ar:[['Karim','Nabil','Samir','Hadi','Walid','Tariq','Salim','Rami','Fouad','Jamal'],['Haddadi','Mansour','Zayed','Rahal','Sabbagh','Khoury','Darwish','Najjar','Hakim','Farouk']],
 fa:[['Behnam','Kaveh','Dariush','Arman','Reza','Shahin','Farhad','Nima','Babak','Omid'],['Karimzadeh','Rostami','Nouri','Sadeghi','Farahani','Zandi','Mirzaei','Tavakoli','Bahrami','Heidari']],
 tr:[['Murat','Selim','Kemal','Orhan','Cem','Emre','Burak','Volkan','Tolga','Altan'],['Yildirim','Demirel','Aksoy','Kaplan','Arslan','Erdem','Tekin','Sezer','Polat','Koc']],
 ru:[['Dmitri','Andrei','Viktor','Anatoly','Gleb','Roman','Yevgeny','Stepan','Kirill','Lev'],['Vorontsov','Kalinin','Sokolov','Baranov','Lebedev','Orlov','Zhukovsky','Belov','Gromov','Rybakov']],
 zh:[['Wei','Jun','Hao','Bo','Lin','Feng','Tao','Yong','Ming','Kai'],['Zhao','Liang','Xu','Gu','Shen','Han','Tang','Peng','Luo','Jiang']],
 ko:[['Min-jun','Seung','Dae-ho','Joon','Hyun','Tae-yang','Sung','Ji-hoon','Woo','Kang'],['Baek','Ryu','Seo','Yoon','Han','Cho','Jang','Moon','Shin','Kwon']],
 ja:[['Haruto','Kenji','Daisuke','Takeshi','Ryo','Shin','Akira','Naoki','Hideo','Jun'],['Aizawa','Hoshino','Kuroda','Miyake','Sakurai','Tsuda','Narita','Okabe','Fujisawa','Nomura']],
 sea:[['Minh','Somchai','Arief','Tuan','Niran','Bayu','Hung','Anurak','Dewa','Lam'],['Tran','Wongsakul','Pratama','Nguyen','Chaiyo','Santoso','Pham','Rattana','Wijaya','Le']],
 sa:[['Arjun','Vikram','Rohan','Imran','Aamir','Kabir','Sanjay','Faisal','Naveen','Zubair'],['Rathore','Chauhan','Malik','Bhatti','Nair','Verma','Qureshi','Gill','Iyer','Khattak']],
 en:[['James','Robert','Marcus','Daniel','Edward','Thomas','Philip','Gordon','Neil','Walter'],['Hollis','Kendrick','Whitaker','Barlow','Ashby','Crane','Mercer','Pryor','Langley','Thorne']],
 la:[['Alejandro','Rafael','Mateo','Joaquin','Luciano','Enzo','Tiago','Emilio','Bruno','Hugo'],['Salcedo','Ibarra','Montoya','Ferreira','Duarte','Romero','Vidal','Navarro','Cardoso','Bellini']],
 de:[['Lukas','Jonas','Matthias','Anders','Stefan','Henrik','Konrad','Lars','Florian','Emil'],['Brandt','Lindqvist','Falk','Hartmann','Weiss','Sandberg','Keller','Nordin','Vogel','Reiter']],
 af:[['Kofi','Emeka','Sipho','Tesfaye','Chidi','Themba','Abebe','Musa','Jabari','Idris'],['Okafor','Mbeki','Tadesse','Nkosi','Abara','Dlamini','Bekele','Okoye','Mwangi','Adeyemi']],
 he:[['Eitan','Yossi','Amir','Noam','Gil','Oren','Ronen','Tomer','Ilan','Uri'],['Barak','Shalev','Peretz','Dayan','Navon','Harel','Sasson','Golan','Tamir','Avni']]};
const GMIL_CUL={IR:'fa',SA:'ar',AE:'ar',EG:'ar',IQ:'ar',SY:'ar',JO:'ar',DZ:'ar',MA:'ar',OM:'ar',LY:'ar',SD:'ar',DW:'ar',RS:'ar',KD:'ar',TR:'tr',AZ:'tr',RU:'ru',UA:'ru',PL:'ru',KZ:'ru',CN:'zh',TW:'zh',KP:'ko',KR:'ko',JP:'ja',VN:'sea',TH:'sea',PH:'sea',ID:'sea',IN:'sa',PK:'sa',AF:'sa',US:'en',GB:'en',AU:'en',CA:'en',ES:'la',IT:'la',FR:'la',BR:'la',MX:'la',AR:'la',CO:'la',CL:'la',VE:'la',CU:'la',DE:'de',SE:'de',GR:'de',NG:'af',ET:'af',ZA:'af',IL:'he'};
const GMIL_REGCUL={ME:'ar',AF:'af',SA:'sa',EA:'zh',SEA:'sea',EU:'de',NA:'en',SAM:'la'};
const GMIL_FLEET=[['ship',.34],['boat',.26],['fast',.14],['sub',.26]];   // starting fleet mix (by value)
const GMIL_NAVAL=['ship','boat','fast','sub','minel','sweep'];
const GMIL_BUY=[['ship',1],['boat',2],['fast',2],['sub',1],['minel',1],['sweep',1]];   // kind, batch (fleet recruitment: 2 turns)
const GMIL_ST={m:{n:'Missile',cost:0,fuel:0,rng:340,dmg:55,ic:1},a:{n:'Air raid',cost:180,fuel:6,rng:300,dmg:15,ic:.85},d:{n:'Drone strike',cost:90,fuel:1,rng:230,dmg:22,ic:1.25}};
const GMIL_MISSILE_COST=450,GMIL_MS_MAX=6;
function gmilNew(){return {g:{},gid:1,fr:[],fid:1,zm:{},fq:[],n:{},bk:{},foe:'',nx:{}};}
function gmilN(c){const M=GC.mil;return M.n[c]||(M.n[c]={ms:2,so:[]});}
function gmilCul(c){return GMIL_CUL[c]||GMIL_REGCUL[(grNat(c)||{}).reg]||'en';}
function gmilName(c,R){if(typeof pplGenName==='function')return pplGenName(c,R);const L=GMIL_NM[gmilCul(c)]||GMIL_NM.en;return L[0][Math.floor(R()*L[0].length)]+' '+L[1][Math.floor(R()*L[1].length)];}
function gmilRng(a,b){return grRng(((GC.seed*131+GC.turn*17+(a|0)*7+(b|0))|0));}
function gmilGen(a){return a&&a.gid&&GC.mil?GC.mil.g[a.gid]||null:null;}
function gmilLv(g){let l=0;while(l<4&&g.xp>=GMIL_LVN[l])l++;return l;}
function gmilTitle(g){if(typeof pplRank==='function')return pplRank(g.o,g.lv);return ['Colonel','Brigadier','Major General','Lieutenant General','General'][g.lv|0];}
function gmilMaxGens(c){const n=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).length;return Math.min(6,2+Math.floor(n/5));}
function gmilIsNaval(k){return GMIL_NAVAL.includes(k);}

// ---------- setup ----------
function gmilEnsure(){if(!GC)return;if(!GC.mil){GC.mil=gmilNew();gmilStartFleets();gmilGenStep(true);}
  for(const c of Object.keys(GC.nat))gmilN(c);}
function gmilStartFleets(){const P=GCM.P;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c],nt=grNat(c),fac=nt.fac;const ports=P.filter(p=>p.land&&GC.prov[p.i].o===c&&p.port);if(!ports.length)continue;
    const V=GR_VBASE*(nt.major?1:.5)*(GC.len==='quick'?.7:1)*.10,us=[];
    for(const [k,w] of GMIL_FLEET){if(!grHasKind(fac,k))continue;const n=Math.max(k==='ship'?1:0,Math.round(V*w/grCost(fac,k)));for(let i=0;i<n;i++)us.push([k,100,0,100]);}
    if(!us.length)continue;const home=ports.find(p=>p.i===N.cap)||ports.sort((a,b)=>b.dev-a.dev||a.i-b.i)[0],z=gmilZoneOf(home.i);if(z<0)continue;
    const a=grAddArmy(c,z,us,'1st Fleet');a.fl=1;}}
function gmilZoneOf(pi){const s=GCM.P[pi].adj.filter(j=>GCM.P[j].sea).sort((a,b)=>GCM.P[a].cost-GCM.P[b].cost||a-b);return s.length?s[0]:-1;}

// ---------- generals ----------
function gmilGenStep(init){const M=GC.mil;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;
    const mine=GC.armies.filter(a=>a.o===c&&!a.fl&&a.u.length).sort((x,y)=>grArmyVal(y)-grArmyVal(x)||x.id-y.id);
    const gens=Object.values(M.g).filter(g=>g.o===c&&!g.st).sort((x,y)=>x.id-y.id);
    for(const g of gens)if(g.aid&&!GC.armies.some(a=>a.id===g.aid&&a.gid===g.id)){g.aid=0;}   // army gone without the hook (safety)
    for(const a of mine){if(a.gid&&M.g[a.gid]&&!M.g[a.gid].st)continue;a.gid=0;if(grArmyVal(a)<4000)continue;
      let g=gens.find(x=>!x.aid);
      if(!g&&gens.length<gmilMaxGens(c)&&(init?gens.length<2:(M.nx[c]|0)<=GC.turn)){const R=gmilRng(M.gid,c.charCodeAt(0)*3+c.charCodeAt(1));g={id:M.gid++,o:c,nm:gmilName(c,R),tr:Math.floor(R()*4),xp:init?0:15,lv:0,st:0,aid:0,by:''};g.lv=gmilLv(g);M.g[g.id]=g;gens.push(g);M.nx[c]=GC.turn+2;
        if(!init&&c===GC.me)grLog(gmilTitle(g)+' '+g.nm+' ('+GMIL_TR[g.tr][0]+') takes command of '+a.nm+'.',c);}
      if(g){g.aid=a.id;a.gid=g.id;}}}}
function gmilMerge(a,b){if(!b.gid)return;const M=GC.mil,gb=M.g[b.gid];b.gid=0;if(!gb)return;if(!a.gid){a.gid=gb.id;gb.aid=a.id;return;}
  const ga=M.g[a.gid];if(ga&&gb.xp>ga.xp){ga.aid=0;a.gid=gb.id;gb.aid=a.id;}else gb.aid=0;}   // the other one goes back to the pool
function gmilLost(a){const M=GC.mil;if(!M||!a.gid)return;const g=M.g[a.gid];a.gid=0;if(!g||g.st)return;g.aid=0;const R=gmilRng(g.id,a.id),r=R(),foe=M.foe;
  const me=g.o===GC.me||foe===GC.me,nm=gmilTitle(g)+' '+g.nm;
  if(r<.4){g.st=1;grLog(nm+' fell with '+a.nm+'.',me?GC.me:g.o);}
  else if(r<.7&&foe&&foe!==g.o){g.st=2;g.by=foe;const ran=300+100*(g.lv|0);if(GC.nat[foe]){GC.nat[foe].cash+=ran;}grLog(nm+' ('+GCM.nats.get(g.o).name+') was captured by '+GCM.nats.get(foe).name+'. Ransom value $'+ran+'.',me?GC.me:g.o);}
  else{g.xp=Math.floor(g.xp*.8);grLog(nm+' escaped the rout.',me?GC.me:'');}}
function gmilMul(a,def){const g=gmilGen(a);if(!g)return 1;let m=1+.025*g.lv;
  if(a.fl)return m;let tk=0,inf=0,n=Math.max(1,a.u.length);for(const r of a.u){if(r[0]==='tank'||r[0]==='heli'||r[0]==='champ')tk++;else if(r[0]==='inf'||r[0]==='at')inf++;}
  if(g.tr===0)m+=.10*tk/n;else if(g.tr===1)m+=def?.06:0;else if(g.tr===2)m+=.04;else m+=.10*inf/n;return m;}
function gmilBattle(b,win){const M=GC.mil;if(!M)return;for(const side of ['att','def']){const won=side===win;for(const id of (side==='att'?b.att:b.def)){const a=GC.armies.find(x=>x.id===id),g=gmilGen(a);if(!g)continue;
      g.xp+=(won?36:12)+(g.tr===3&&won?6:0)+(g.tr===1&&side==='def'?6:0);const L=gmilLv(g);if(L>g.lv){g.lv=L;if(g.o===GC.me)grLog(gmilTitle(g)+' '+g.nm+' reached level '+L+'.',g.o);}
      if(g.tr===3&&won&&a.u.length>2){for(const r of a.u)r[1]=Math.min(100,r[1]+3);}}}}
// the hero squad that stands for the general in a Fight-it battle: the perk table the battle applies to that side's units
function gmilPerk(L){let best=null;for(const s of L){const g=gmilGen(s.arr);if(g&&(!best||g.lv>best.lv))best={tr:g.tr,lv:g.lv,nm:gmilTitle(g)+' '+g.nm,gid:g.id};}return best;}
function gmilApplyPerks(gr,gp){if(!gp)return;for(let t=0;t<2;t++){const p=gp[t];if(!p)continue;const defend=gr.att!==t;
    for(const [rec,u,team] of gr.ents){if(team!==t||u.dead)continue;let m=1+.03*p.lv;const k=rec[0];
      if(p.tr===0&&(k==='tank'||k==='heli'||k==='champ'))m+=.10;else if(p.tr===1&&defend)m+=.09;else if(p.tr===3&&(k==='inf'||k==='at'||k==='aa'))m+=.10;
      if(p.tr===2){if(u.s&&u.s.ammo)u.ammo=u.s.ammo;}
      if(m!==1){u.max=Math.round(u.max*m);u.hp=Math.min(u.max,Math.round(u.hp*m));}}}}
function gmilHeroFell(gid){const M=GC.mil,g=M&&M.g[gid];if(!g||g.st)return;g.xp=Math.floor(g.xp*.85);const R=gmilRng(g.id,77);if(R()<.35){g.st=1;g.aid=0;const a=GC.armies.find(x=>x.gid===g.id);if(a)a.gid=0;grLog(gmilTitle(g)+' '+g.nm+' was killed leading the battle.',g.o);}}

// ---------- fleets ----------
function gmilFleets(c){return GC.armies.filter(a=>a.fl&&a.o===c&&a.u.length);}
function gmilHasPort(pi){const p=GCM.P[pi];return p.land&&(p.port||geCount(pi,'port')>0);}
function gmilBuyFleet(c,pi,k){const N=GC.nat[c],st=GC.prov[pi],p=GCM.P[pi];if(!st||st.o!==c)return 'Not your province.';if(!gmilHasPort(pi))return 'Needs a port.';
  const fac=grNat(c).fac,rc=GMIL_BUY.find(r=>r[0]===k);if(!rc||!grHasKind(fac,k))return 'Not available to your nation.';if(gmilZoneOf(pi)<0)return 'No sea access.';
  const cost=grCost(fac,k)*rc[1],man=2*rc[1];if(N.cash<cost)return 'Not enough money.';if(N.e&&N.e.man<man)return 'Not enough manpower.';
  N.cash-=cost;if(N.e)N.e.man-=man;GC.mil.fq.push({o:c,pi,t:GC.turn+2,k,n:rc[1]});return '';}
function gmilFleetArrive(){const M=GC.mil,keep=[];for(const q of M.fq){if(q.t>GC.turn){keep.push(q);continue;}if(GC.nat[q.o].dead||GC.prov[q.pi].o!==q.o)continue;const z=gmilZoneOf(q.pi);if(z<0)continue;
    let f=GC.armies.find(a=>a.fl&&a.o===q.o&&a.at===z&&!a.path.length);const us=[];for(let i=0;i<q.n;i++)us.push([q.k,100,0,100]);
    if(f)f.u.push(...us);else{f=grAddArmy(q.o,z,us,(GC.nat[q.o].an)+(GC.nat[q.o].an===1?'st':GC.nat[q.o].an===2?'nd':GC.nat[q.o].an===3?'rd':'th')+' Fleet');f.fl=1;}
    if(q.o===GC.me)grLog(q.n+'× '+grKindName(grNat(q.o).fac,q.k)+' joined the fleet at '+GCM.P[z].n+'.',q.o);}M.fq=keep;}
function gmilFleetRetreat(a,from){const P=GCM.P;let best=-1,bs=-1e9;for(const j of P[from].adj){if(!P[j].sea)continue;if(GC.armies.some(x=>x.at===j&&x.fl&&grAtWar(x.o,a.o)))continue;
    const home=GC.nat[a.o].cap>=0?grDist(j,GC.nat[a.o].cap):0;const s=-home*.01+(j===a.from?4:0)+(P[j].adj.some(k=>P[k].land&&GC.prov[k].o===a.o&&gmilHasPort(k))?6:0);if(s>bs){bs=s;best=j;}}return best;}
function gmilSeaDenied(a,nx){if(a.fl||!GCM.P[nx].sea)return false;let foe=false,fr=false;for(const x of GC.armies){if(x.at!==nx||!x.fl||!x.u.length)continue;if(x.o===a.o)fr=true;else if(grAtWar(x.o,a.o))foe=true;}return foe&&!fr;}
function gmilSeaHostile(p,here){return here.some(a=>a.fl)&&here.some(a=>here.some(b=>b.o!==a.o&&grAtWar(a.o,b.o)));}
// sea battles: defender value bonus = hidden subs (cut by patrol boats), home waters
function gmilSeaDef(b){let m=1.0;const D=grSideUnits(b,'def'),A=grSideUnits(b,'att');let sub=0,all=0;for(const s of D)for(const r of s.u){all++;if(r[0]==='sub')sub++;}
  let asw=0;for(const s of A)for(const r of s.u)if(r[0]==='boat'||r[0]==='fast')asw++;if(all)m+=.25*sub/all*(asw>=2?.35:1);
  const p=GCM.P[b.p];if(p.adj.some(k=>GCM.P[k].land&&GC.prov[k].o===b.dn&&gmilHasPort(k)))m+=.06;return m;}
function gmilBlockRefresh(){const M=GC.mil;if(!M)return;M.bk={};for(const p of GCM.P){if(!p.land||!gmilHasPort(p.i))continue;const o=GC.prov[p.i].o;
    for(const j of p.adj){if(!GCM.P[j].sea)continue;let foe=false,fr=false;for(const a of GC.armies){if(a.at!==j||!a.fl||!a.u.length)continue;if(a.o===o)fr=true;else if(grAtWar(a.o,o))foe=true;}
      if(foe&&!fr){M.bk[p.i]=1;break;}}}}
function gmilBk(pi){const M=GC.mil;return !!(M&&M.bk&&M.bk[pi]);}
function gmilMines(a){const M=GC.mil;const p=GCM.P[a.at];if(!p.sea||!a.fl)return 'Fleets only, at sea.';if(!a.u.some(r=>r[0]==='minel'))return 'Needs a minelayer.';a.mine=a.mine?0:1;return '';}
function gmilSeaStep(){const M=GC.mil,R=grRng(GC.seed*43+GC.turn*5);
  for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){const p=GCM.P[a.at];if(!p.sea||!a.u.length)continue;
    if(a.fl&&a.mine&&!a.path.length&&a.u.some(r=>r[0]==='minel')){const z=M.zm[a.at];if(!z||z.o===a.o){M.zm[a.at]={o:a.o,n:Math.min(8,(z?z.n:0)+2)};}else z.n=Math.max(0,z.n-2);}
    const z=M.zm[a.at];if(z&&z.n>0&&z.o!==a.o&&grAtWar(z.o,a.o)){const sw=a.u.filter(r=>r[0]==='sweep').length;if(sw){z.n=Math.max(0,z.n-2*sw);if(a.o===GC.me)grLog('Minesweepers cleared mines at '+p.n+'.',a.o);continue;}
      let hits=Math.floor(z.n/3)+(R()<(z.n%3)/3?1:0);hits=Math.min(hits,2,a.u.length);
      for(let i=0;i<hits;i++){let w=0;for(let j=1;j<a.u.length;j++)if(a.u[j][1]<a.u[w][1])w=j;a.u[w][1]-=35;if(a.u[w][1]<=8)a.u.splice(w,1);z.n--;}
      if(hits)grLog(a.nm+' ('+GCM.nats.get(a.o).name+') hit mines at '+p.n+'.',a.o===GC.me||z.o===GC.me?GC.me:a.o);}}
  for(const k of Object.keys(M.zm))if(M.zm[k].n<=0)delete M.zm[k];
  for(const a of GC.armies.slice())if(!a.u.length)grDrop(a);}

// ---------- map strikes ----------
function gmilSites(c,pi,rng,type){const P=GCM.P;let best=-1,bd=1e9;
  for(const p of P){if(!p.land||GC.prov[p.i].o!==c)continue;const ok=type==='d'?(geCount(p.i,'base')+geCount(p.i,'airfield')>0||GC.armies.some(a=>a.o===c&&a.at===p.i&&!a.fl&&a.u.length>2)):type==='a'?geEff(p.i,'airfield')>0:(geCount(p.i,'base')+geCount(p.i,'airfield')>0||p.cap);
    if(!ok)continue;const d=grDist(p.i,pi);if(d<=rng&&d<bd){bd=d;best=p.i;}}return best;}
function gmilStrikeCheck(c,type,pi,k){const N=GC.nat[c],E=N.e,S=GMIL_ST[type],M=gmilN(c),p=GCM.P[pi];if(!S||!p)return 'Unknown strike.';if(M.so.length>=3)return 'Three strikes a turn at most.';
  if(M.so.some(o=>o.t===type&&o.pi===pi&&o.k===k))return 'Already ordered.';
  if(p.land){const o=GC.prov[pi].o;if(o===c||!grAtWar(c,o))return 'Only at nations you are at war with.';if(k==='f')return 'Fleets are at sea.';}
  else{if(k!=='f')return 'Only fleets at sea.';if(!GC.armies.some(a=>a.at===pi&&a.fl&&grAtWar(a.o,c)))return 'No enemy fleet there.';}
  if(type==='m'&&M.ms<1)return 'No missiles in stock (buy one, $'+GMIL_MISSILE_COST+').';
  if(gmilSites(c,pi,S.rng,type)<0)return type==='a'?'No airfield in range.':type==='d'?'No base or army in range.':'No launch site in range.';
  if(type!=='m'){if(N.cash<S.cost)return 'Costs $'+S.cost+'.';if(E&&(E.dry||E.fuel<S.fuel+1))return 'Not enough fuel.';if(type==='a'&&geSortieStock(c,pi,S.rng)<2)return 'Not enough sorties (fuel or airfields).';}
  return '';}
function gmilStrike(c,type,pi,k){const e=gmilStrikeCheck(c,type,pi,k);if(e)return e;const N=GC.nat[c],S=GMIL_ST[type],M=gmilN(c);
  if(type==='m')M.ms--;else{N.cash-=S.cost;if(N.e)N.e.fuel-=S.fuel;}M.so.push({t:type,pi,k});return '';}
function gmilBuyMissile(c){const N=GC.nat[c],M=gmilN(c);if(M.ms>=GMIL_MS_MAX)return 'Stock full.';if(N.cash<GMIL_MISSILE_COST)return 'Costs $'+GMIL_MISSILE_COST+'.';N.cash-=GMIL_MISSILE_COST;M.ms++;return '';}
function gmilAAUnits(pi){let n=0;const st=GC.prov[pi];if(st)for(const r of st.gar)if(r[0]==='aa')n++;for(const a of GC.armies)if(a.at===pi&&!a.fl)for(const r of a.u)if(r[0]==='aa')n++;return n;}
function gmilHit(L,hits,dmg){let got=0;for(let i=0;i<hits&&L.length;i++){let w=0;for(let j=1;j<L.length;j++)if(L[j][1]>L[w][1])w=j;   // the healthiest unit is the most exposed one first: spreads damage
    L[w][1]-=dmg;got++;if(L[w][1]<=8)L.splice(w,1);}return got;}
function gmilStrikes(){const M=GC.mil;if(!M)return;const R=grRng(GC.seed*53+GC.turn*9);
  for(const c of Object.keys(GC.nat).sort()){const Q=gmilN(c);const ord=Q.so;Q.so=[];if(GC.nat[c].dead)continue;
    for(const o of ord){const p=GCM.P[o.pi],S=GMIL_ST[o.t];if(!p)continue;const cn=GCM.nats.get(c).name,vis=c===GC.me;
      const tgtO=p.land?GC.prov[o.pi].o:'';if(p.land&&(tgtO===c||!grAtWar(c,tgtO)))continue;
      const raw=o.t==='a'?Math.min(4,Math.floor(geSortieStock(c,o.pi,S.rng)/1)||2):1;
      let aaB=p.land?geCount(o.pi,'aa'):0,aaU=p.land?gmilAAUnits(o.pi):0;if(!p.land)for(const a of GC.armies)if(a.at===o.pi&&a.fl&&grAtWar(a.o,c))for(const r of a.u)if(r[0]==='ship'||r[0]==='boat')aaU+=.5;
      const ic=Math.min(.8,(.26*aaB+.03*aaU)*S.ic);let surv=0;for(let i=0;i<raw;i++)if(R()>=ic)surv++;
      const tn=p.land?GCM.nats.get(tgtO).name:'the enemy fleet',inv=(vis||tgtO===GC.me)?GC.me:c;
      if(!surv){grLog(cn+' '+S.n.toLowerCase()+' on '+p.n+' was intercepted'+(aaB?' by air defence':'')+'.',inv);continue;}
      let msg='';
      if(o.k==='b'&&p.land){const bl=geBl(o.pi),tg=bl.filter(r=>['factory','refinery','power','port','airfield','mine','base','aa','fort'].includes(r[0]));
        if(!tg.length){const n=gmilHit(GC.prov[o.pi].gar,surv,S.dmg*1.5);msg='hit the garrison ('+n+' units struck)';}
        else{let names=[];for(let i=0;i<surv;i++){const r=tg[Math.floor(R()*tg.length)];r[1]=Math.min(100,(r[1]|0)+S.dmg);if(!names.includes(r[0]))names.push(r[0]);}
          msg='damaged '+names.map(k=>GE_B[k]?GE_B[k][0].toLowerCase():k).join(', ');GC.prov[o.pi].lt=GC.turn+2;}}
      else if(o.k==='a'&&p.land){let tot=0;const arm=GC.armies.filter(a=>a.at===o.pi&&!a.fl&&grAtWar(c,a.o)&&a.u.length).sort((x,y)=>x.id-y.id);
        for(const a of arm)tot+=gmilHit(a.u,Math.ceil(surv/arm.length),S.dmg*(o.t==='m'?1.4:1));tot+=gmilHit(GC.prov[o.pi].gar,surv-Math.min(surv,tot)>0?1:0,S.dmg);msg='struck '+(arm.length?arm.length+' army(ies)':'the garrison');}
      else if(!p.land){const fl=GC.armies.filter(a=>a.at===o.pi&&grAtWar(c,a.o)&&a.u.length).sort((x,y)=>(y.fl|0)-(x.fl|0)||x.id-y.id);let n=0;for(const a of fl)n+=gmilHit(a.u,Math.ceil(surv/fl.length),S.dmg*(o.t==='m'?1.6:1));msg='hit '+fl.length+' fleet(s) at sea';}
      else continue;
      grLog(cn+' '+S.n.toLowerCase()+' on '+p.n+' ('+tn+'): '+msg+(surv<raw?' ('+(raw-surv)+' shot down)':'')+'.',inv);}}
  for(const a of GC.armies.slice())if(!a.u.length)grDrop(a);}

// ---------- front lines ----------
function gmilFronts(c){return GC.mil.fr.filter(f=>f.o===c);}
function gmilFrontOf(a){return a.fr?GC.mil.fr.find(f=>f.id===a.fr)||null:null;}
function gmilAddFront(c,foe){let f=GC.mil.fr.find(x=>x.o===c&&x.foe===foe);if(f)return f;f={id:GC.mil.fid++,o:c,foe,ord:'hold'};GC.mil.fr.push(f);return f;}
function gmilLine(f){const P=GCM.P;return P.filter(p=>p.land&&GC.prov[p.i].o===f.o&&p.adj.some(j=>P[j].land&&GC.prov[j].o===f.foe));}
function gmilEnemyAt(foe,j){return GC.prov[j].o===foe?grProvDef(j)+GC.armies.filter(x=>x.at===j&&x.o===foe&&!x.fl).reduce((s,x)=>s+grArmyVal(x),0):0;}
function gmilAssign(aid,fid){const a=GC.armies.find(x=>x.id===aid);if(!a||a.fl)return 'Armies only.';if(!fid){a.fr=0;return '';}const f=GC.mil.fr.find(x=>x.id===fid);if(!f||f.o!==a.o)return 'No such front.';a.fr=fid;return '';}
function gmilPlanFront(f,plan){const P=GCM.P,c=f.o,line=gmilLine(f);if(!line.length)return;const arms=GC.armies.filter(a=>a.fr===f.id&&a.o===c&&!a.fl&&!a.path.length&&a.u.length).sort((x,y)=>x.id-y.id);
  const threat=pi=>{let t=0;for(const j of P[pi].adj)if(P[j].land&&GC.prov[j].o===f.foe)t+=gmilEnemyAt(f.foe,j)*.5;return t;};
  const defNow=pi=>grProvDef(pi)*.5+GC.armies.filter(x=>x.at===pi&&x.o===c&&!x.fl).reduce((s,x)=>s+grArmyVal(x),0)+(plan[pi]||0);
  for(const a of arms){const val=grArmyVal(a)*gmilMul(a,0);let tgt=-1,ts=-1e9;
    if(f.ord!=='hold'){   // push / counter-attack: weakest worthwhile enemy province within 3 hops of land
      const seen=new Set([a.at]);let fr=[a.at];for(let d=0;d<3&&fr.length;d++){const nx=[];for(const u of fr)for(const j of P[u].adj){if(seen.has(j)||!P[j].land)continue;seen.add(j);nx.push(j);if(GC.prov[j].o!==f.foe)continue;
          const def=gmilEnemyAt(f.foe,j)*1.25;let sc=(P[j].wg?40:0)+P[j].dev*4+(val/Math.max(300,def)-1)*30-d*8;
          if(f.ord==='counter'){sc+=GC.prov[j].o0===c?60:-15;}
          const need=f.ord==='counter'?1.0:1.12;if(def<val*need&&sc>ts){ts=sc;tgt=j;}}fr=nx;}}
    if(tgt>=0){const r=grPath(c,a.at,tgt);if(r&&!r.decl&&r.path.length){a.path=r.path;a.pg=0;plan[tgt]=(plan[tgt]||0)+val;continue;}}
    // hold: stand on the line province that needs men most
    const inLine=line.some(p=>p.i===a.at);let best=-1,bs=-1e9;for(const p of line){const s=threat(p.i)-defNow(p.i)*(p.i===a.at?.7:1)-(p.i===a.at?0:grDist(a.at,p.i)*.4);if(s>bs){bs=s;best=p.i;}}
    if(best>=0&&best!==a.at&&(!inLine||bs>threat(a.at)-defNow(a.at)*.7+400)){const r=grPath(c,a.at,best);if(r&&!r.decl&&r.path.length&&r.turns<=4){a.path=r.path;a.pg=0;}}
    plan[a.path.length?a.path[a.path.length-1]:a.at]=(plan[a.path.length?a.path[a.path.length-1]:a.at]||0)+val;}}
function gmilAIFronts(c){const N=GC.nat[c],P=GCM.P;const foes=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c)).filter(x=>GC.nat[x]&&!GC.nat[x].dead).sort();
  for(const f of gmilFronts(c).slice())if(!foes.includes(f.foe)){GC.mil.fr.splice(GC.mil.fr.indexOf(f),1);for(const a of GC.armies)if(a.fr===f.id)a.fr=0;}
  const contact=foes.filter(x=>P.some(p=>p.land&&GC.prov[p.i].o===c&&p.adj.some(j=>P[j].land&&GC.prov[j].o===x))).slice(0,3);
  for(const x of contact)gmilAddFront(c,x);const fs=gmilFronts(c);if(!fs.length)return;
  for(const f of fs){const line=gmilLine(f);const mine=GC.armies.filter(a=>a.fr===f.id&&!a.fl).reduce((s,a)=>s+grArmyVal(a),0);let foeV=0;for(const p of line)for(const j of p.adj)if(P[j].land&&GC.prov[j].o===f.foe)foeV+=gmilEnemyAt(f.foe,j)*.5;
    const lost=P.some(p=>p.land&&GC.prov[p.i].o===f.foe&&GC.prov[p.i].o0===c);f.ord=mine>foeV*1.3?'push':lost?'counter':'hold';}
  const idle=GC.armies.filter(a=>a.o===c&&!a.fl&&!a.fr&&!a.path.length&&a.u.length&&grArmyVal(a)>=2500).sort((x,y)=>x.id-y.id);
  for(const a of idle){if(GC.nat[c].cap===a.at&&GC.armies.filter(x=>x.o===c&&x.at===a.at&&!x.fl).length===1&&idle.length>1)continue;
    let bf=null,bs=-1e9;for(const f of fs){const line=gmilLine(f);if(!line.length)continue;let s=0;for(const p of line)for(const j of p.adj)if(P[j].land&&GC.prov[j].o===f.foe)s+=P[j].dev;
      s-=GC.armies.filter(x=>x.fr===f.id).length*2;const near=Math.min(...line.map(p=>grDist(a.at,p.i)));s-=near*.05;if(s>bs){bs=s;bf=f;}}
    if(bf)a.fr=bf.id;}}

// ---------- AI fleets and strikes ----------
function gmilAIFleets(c,R){const N=GC.nat[c],P=GCM.P,fac=grNat(c).fac;const foes=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c));
  const mine=gmilFleets(c).sort((x,y)=>x.id-y.id);
  for(const a of mine){if(a.path.length)continue;const val=grArmyVal(a);if(a.u.length>1&&mine.some(b=>b!==a&&b.at===a.at&&!b.path.length&&b.id<a.id)){grMerge(a.id);continue;}
    if(!foes.length)continue;let tgt=-1,ts=-1e9;
    const seen=new Set([a.at]);let fr=[a.at];for(let d=0;d<5&&fr.length;d++){const nx=[];for(const u of fr)for(const j of P[u].adj){if(seen.has(j)||!P[j].sea)continue;seen.add(j);nx.push(j);
        const en=GC.armies.filter(x=>x.at===j&&x.fl&&foes.includes(x.o)&&x.u.length).reduce((s,x)=>s+grArmyVal(x),0);let sc=-d*6;
        if(en>0){if(en*1.15<val)sc+=40+en/400;else continue;}
        for(const k of P[j].adj)if(P[k].land&&foes.includes(GC.prov[k].o)&&gmilHasPort(k))sc+=14+P[k].dev*3;   // blockade a foe's port
        if(sc>ts){ts=sc;tgt=j;}}fr=nx;}
    if(tgt>=0&&tgt!==a.at){const r=grPath(c,a.at,tgt,1);if(r&&r.path.length)a.path=r.path;}
    if(a.u.some(r=>r[0]==='minel')&&!a.path.length&&P[a.at].sea&&R()<.5)a.mine=1;}
  // buy ships when the navy is small next to the army
  const ports=P.filter(p=>p.land&&GC.prov[p.i].o===c&&gmilHasPort(p.i)&&gmilZoneOf(p.i)>=0);
  if(ports.length&&foes.length&&N.cash>2600){const nav=mine.reduce((s,a)=>s+grArmyVal(a),0),arm=GC.armies.filter(a=>a.o===c&&!a.fl).reduce((s,a)=>s+grArmyVal(a),0);
    if(nav<arm*.14&&!GC.mil.fq.some(q=>q.o===c)){const ks=['ship','boat','sub','fast','minel'].filter(k=>grHasKind(fac,k));const k=ks[Math.floor(R()*ks.length)];if(k)gmilBuyFleet(c,ports[Math.floor(R()*ports.length)].i,k);}}}
function gmilAIStrikes(c,R){const N=GC.nat[c],P=GCM.P,Q=gmilN(c);const foes=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c)).filter(x=>GC.nat[x]&&!GC.nat[x].dead);if(!foes.length)return;
  if(Q.ms<2&&N.cash>2200)gmilBuyMissile(c);
  let tries=0;while(Q.so.length<2&&tries++<8){const types=['m','a','d'];const t=types[Math.floor(R()*3)];
    // target: the foe province with the best buildings in range, else a foe fleet
    let best=-1,bs=0;for(const p of P){if(!p.land||!foes.includes(GC.prov[p.i].o))continue;const bl=geBl(p.i).filter(r=>['factory','refinery','power','port','airfield','mine'].includes(r[0])&&(r[1]|0)<70).length;const s=bl*10+p.dev-geCount(p.i,'aa')*8;if(s>bs&&gmilSites(c,p.i,GMIL_ST[t].rng,t)>=0){bs=s;best=p.i;}}
    if(best>=0&&bs>=10){gmilStrike(c,t,best,'b');continue;}
    let ba=-1,bv=0;for(const p of P){if(!p.land||!foes.includes(GC.prov[p.i].o))continue;const v=GC.armies.filter(a=>a.at===p.i&&!a.fl&&foes.includes(a.o)).reduce((s,a)=>s+grArmyVal(a),0);if(v>bv&&gmilSites(c,p.i,GMIL_ST[t].rng,t)>=0){bv=v;ba=p.i;}}
    if(ba>=0&&bv>3000){gmilStrike(c,t,ba,'a');continue;}
    let bz=-1,zv=0;for(const a of GC.armies)if(a.fl&&foes.includes(a.o)&&a.u.length&&!a.path.length){const v=grArmyVal(a);if(v>zv&&gmilSites(c,a.at,GMIL_ST[t].rng,t)>=0){zv=v;bz=a.at;}}
    if(bz>=0&&zv>2500)gmilStrike(c,t,bz,'f');}}

// ---------- turn hooks ----------
function gmilPlan(){   // after grAIPlan, before movement: AI fronts / fleets / strikes, then front-assist moves for everyone
  gmilEnsure();const M=GC.mil;const R=grRng(GC.seed*61+GC.turn*11);
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;
    if(N.ai){try{gmilAIFronts(c);gmilAIFleets(c,R);gmilAIStrikes(c,R);}catch(e){console.error('gmilAI',c,e);}}
    else{for(const f of gmilFronts(c).slice())if(!GC.nat[f.foe]||GC.nat[f.foe].dead||!grAtWar(c,f.foe)){M.fr.splice(M.fr.indexOf(f),1);for(const a of GC.armies)if(a.fr===f.id)a.fr=0;}}}
  const plan={};for(const f of M.fr.slice().sort((x,y)=>x.id-y.id)){if(GC.nat[f.o].dead)continue;gmilPlanFront(f,plan);}}
function gmilTurnEnd(){const M=GC.mil;if(!M)return;gmilSeaStep();gmilFleetArrive();gmilGenStep(false);
  for(const c of Object.keys(GC.nat).sort()){const Q=gmilN(c);if(GC.nat[c].dead)continue;if(GC.turn%3===0&&Q.ms<GMIL_MS_MAX)Q.ms++;}
  for(const a of GC.armies)if(a.fl&&a.mine&&!a.u.some(r=>r[0]==='minel'))a.mine=0;
  gmilBlockRefresh();
  for(const p of GCM.P){if(!M.bk[p.i])continue;const o=GC.prov[p.i].o;if(o===GC.me)grLog(p.n+' is under naval blockade: port income and sea trade are cut.',o);}}
function gmilHashStr(){const M=GC.mil;if(!M)return '';let s='|M';for(const id of Object.keys(M.g).sort((a,b)=>a-b)){const g=M.g[id];s+=id+':'+g.tr+g.xp+','+g.st+','+g.aid+';';}
  for(const f of M.fr)s+='F'+f.id+f.o+f.foe+f.ord;for(const k of Object.keys(M.zm).sort())s+='Z'+k+M.zm[k].o+M.zm[k].n;for(const c of Object.keys(M.n).sort())s+=c+M.n[c].ms;return s;}
