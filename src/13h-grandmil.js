// ===== grand3: MILITARY on the grand map - generals, front lines, map strikes, fleets & sea zones (orch/SYSTEMS.md: this file owns them) =====
// Fleets are armies with `fl:1` (their units are ships), so movement / orders / panels / battles reuse the army code. Everything here is a
// pure function of (state, orders, seed): same numbers for every nation, rng only from grRng, no Date / Math.random / Map order.
const GX_POOL={
 ar:[['Khalid','Nasser','Tariq','Samir','Faris','Hadi','Rashid','Jamal','Yusuf','Walid'],['al-Harbi','Mansour','Haddad','Zahran','Khoury','Qasimi','Darwish','Sabbagh','Hamdan','Ayyub']],
 fa:[['Behzad','Kamran','Farzad','Arash','Reza','Siavash','Mehran','Babak','Hamid','Dariush'],['Rahimi','Sadeghi','Tavakoli','Karimzadeh','Nouri','Ebrahimi','Pashaei','Zand','Jalali','Moradi']],
 tr:[['Emre','Kerem','Volkan','Cem','Tuncay','Orhan','Selim','Bora','Murat','Levent'],['Aksoy','Karadag','Yilmaz','Demirtas','Gunes','Polat','Ozkan','Tekin','Aydin','Balci']],
 he:[['Amir','Yoav','Noam','Eitan','Oren','Gideon','Ronen','Dov','Itai','Uri'],['Barkai','Segal','Peled','Levari','Dagan','Shalev','Eldar','Tamir','Navon','Ofer']],
 ru:[['Viktor','Anatoly','Gleb','Roman','Dmitri','Stanislav','Yaroslav','Oleg','Timur','Bogdan'],['Sokolov','Voronin','Kharitonov','Lazarev','Belyaev','Danilov','Melnik','Tkachuk','Orlov','Zaitsev']],
 zh:[['Wei','Jun','Hao','Lei','Bo','Tao','Ming','Feng','Kai','Long'],['Zhao','Liang','Gu','Xu','Shen','Han','Cheng','Lu','Fang','Qiu']],
 ko:[['Jin-ho','Sung-min','Dong-gun','Tae-yang','Hyun-woo','Joon-seo','Min-jae','Ki-tae','Seok-jin','Yong-sik'],['Baek','Choi','Han','Seo','Yoon','Kwon','Jang','Shin','Moon','Cha']],
 hi:[['Arjun','Vikram','Rohan','Imran','Zafar','Karan','Salim','Devendra','Tahir','Naveen'],['Chauhan','Bhatt','Rathore','Qureshi','Mirza','Nambiar','Gill','Sethi','Ranjan','Awan']],
 ja:[['Haruto','Daisuke','Kenji','Shun','Ryota','Takumi','Hideo','Tatsuya','Naoki','Goro'],['Sakurai','Mizuno','Kuroda','Hayashi','Ishikawa','Nomura','Fujita','Okabe','Tachibana','Morita']],
 sea:[['Anh','Somchai','Ramon','Budi','Nam','Kittipong','Jose','Hendra','Minh','Arif'],['Nguyen','Phan','Santos','Wijaya','Prasert','Dela Cruz','Hartono','Tran','Bautista','Suwan']],
 es:[['Rodrigo','Alvaro','Mateo','Emilio','Joaquin','Ignacio','Tomas','Lucas','Esteban','Ramiro'],['Valverde','Ortega','Salcedo','Barros','Cardenas','Fuentes','Iglesias','Montoya','Quiroga','Ledesma']],
 fr:[['Antoine','Lucien','Gaspard','Remy','Theo','Baptiste','Marcel','Etienne','Hugo','Olivier'],['Vasseur','Delmas','Lacroix','Morel','Bellamy','Rousseau','Garnier','Marchand','Perrin','Dufour']],
 de:[['Konrad','Matthias','Lukas','Jonas','Friedrich','Torsten','Moritz','Heiko','Dieter','Axel'],['Brandt','Vogel','Lindner','Kessler','Hartmann','Reuter','Fiedler','Stoll','Albrecht','Jansen']],
 en:[['James','Marcus','Daniel','Andrew','Nathan','Gordon','Owen','Peter','Samuel','Wesley'],['Hartwell','Calloway','Brennan','Whitlock','Sinclair','Pruitt','Ashby','Rowland','Keane','Mercer']],
 af:[['Kofi','Tendai','Sipho','Chidi','Musa','Amadou','Thabo','Emeka','Jabari','Kwame'],['Okoye','Dlamini','Mensah','Ndlovu','Adeyemi','Kamau','Bello','Moyo','Osei','Tshabalala']]};
const GX_GRP_N={IQ:'ar',SY:'ar',SA:'ar',AE:'ar',EG:'ar',JO:'ar',RS:'ar',DW:'ar',LY:'ar',SD:'ar',OM:'ar',DZ:'ar',MA:'ar',IR:'fa',AF:'fa',TR:'tr',AZ:'tr',IL:'he',RU:'ru',UA:'ru',KZ:'ru',PL:'ru',CN:'zh',TW:'zh',KP:'ko',KR:'ko',IN:'hi',PK:'hi',JP:'ja',VN:'sea',TH:'sea',PH:'sea',ID:'sea',ES:'es',MX:'es',AR:'es',CO:'es',CL:'es',VE:'es',BR:'es',FR:'fr',DE:'de',EU:'de',US:'en',GB:'en',AU:'en',CA:'en',ZA:'af',NG:'af',ET:'af'};
const GX_GRP_R={NA:'en',SAM:'es',EU:'de',ME:'ar',AF:'af',SA:'hi',EA:'zh',SEA:'sea',OC:'en'};
const GX_TR={arm:['Armour expert','strength when attacking'],def:['Defender','strength when defending'],log:['Logistician','half the hunger losses'],rai:['Raider','strength when outnumbered']};
const GX_TK=['arm','def','log','rai'];
const GX_RANK=['Colonel','Brigadier','Major General','Lieutenant General','General'];
const GX_XPL=[4,10,20,35];
const GR_NREC=[['ship',1,3],['boat',2,2],['sub',1,3],['fast',3,2],['minel',1,2],['sweep',1,2]];   // fleets: kind, batch, turns
const GR_NAVAL=GR_NREC.map(r=>r[0]).concat(['lander']);
const GX_ST={m:['Missile','a cruise or ballistic missile',120,.9],a:['Air raid','bombers from an airfield',200,1],d:['Drone strike','a swarm of strike drones',50,1.1]};
const GX_CATS={arm:'Armies and garrison',eco:'Factories and industry',bas:'Bases and air defence',flt:'Fleets'};
function gxHas(pi,k){return geEff(pi,k)>0;}
function gxCount(c,k){let n=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&geEff(p.i,k)>0)n++;return n;}
const GX_BTN='padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:13px';
function grMilGrp(c){return GX_GRP_N[c]||GX_GRP_R[grNat(c).reg]||'en';}
function grMilK(g){return 6+2*g.lv;}
function grMilRank(g){return GX_RANK[Math.min(4,g.lv-1)];}
function grMilMake(c){const M=GC.ml,R=grRng(GC.seed*977+M.gid*31),pool=GX_POOL[grMilGrp(c)];
  return {id:M.gid++,nm:pool[0][Math.floor(R()*pool[0].length)]+' '+pool[1][Math.floor(R()*pool[1].length)],tr:GX_TK[Math.floor(R()*4)],lv:1,xp:0,ic:Math.floor(R()*6)};}
function grMilGeneral(a){if(a.fl||a.g||a.u.length<6||!GC.ml)return;const N=GC.nat[a.o];a.g=(N.gp&&N.gp.length)?N.gp.shift():grMilMake(a.o);}
function grMilMerge(a,b){if(!b.g)return;if(!a.g)a.g=b.g;else{const keep=(b.g.lv>a.g.lv||(b.g.lv===a.g.lv&&b.g.xp>a.g.xp))?b.g:a.g,other=keep===a.g?b.g:a.g;a.g=keep;GC.nat[a.o].gp.push(other);}b.g=null;}
// a general whose army is destroyed: killed, captured by the enemy there, or slips away and waits for a new command
function grMilLost(a){const g=a.g;if(!g||!GC.ml)return;a.g=null;const N=GC.nat[a.o],R=grRng(GC.seed*53+a.id*7+GC.turn),r=R();let by='';
  for(const x of GC.armies)if(x.at===a.at&&x.o!==a.o&&grAtWar(x.o,a.o)){by=x.o;break;}if(!by&&GCM.P[a.at].land&&grAtWar(GC.prov[a.at].o,a.o))by=GC.prov[a.at].o;
  const mine=a.o===GC.me||by===GC.me?GC.me:a.o,nm=grMilRank(g)+' '+g.nm,cn=GCM.nats.get(a.o).name;
  if(r<.4){N.gk++;grLog(nm+' ('+cn+') was killed in action.',mine);}
  else if(r<.8&&by){GC.nat[by].cp++;GC.nat[by].cash+=200;grLog(nm+' ('+cn+') was captured by '+GCM.nats.get(by).name+'.',mine);}
  else{N.gp.push(g);grLog(nm+' ('+cn+') escaped and awaits a new command.',a.o===GC.me?a.o:'');}}
function grMilXp(b,win){for(const side of ['att','def']){const ids=side==='att'?b.att:b.def,won=win===side,en=grSideVal(grSideUnits(b,side==='att'?'def':'att')),own=grSideVal(grSideUnits(b,side));
    for(const id of ids){const a=GC.armies.find(x=>x.id===id);if(!a||!a.g||a.fl)continue;const g=a.g;g.xp+=(won?3:1)+(en>=own*1.3?1:0);
      let lv=1;for(const t of GX_XPL)if(g.xp>=t)lv++;if(lv>g.lv){g.lv=lv;grLog(grMilRank(g)+' '+g.nm+' ('+GCM.nats.get(a.o).name+') is promoted to level '+lv+'.',a.o===GC.me?a.o:'');}}}}
// strength multiplier a side's generals give in auto-resolve (equal value for every trait)
function grMilSideK(S,role,enemyVal){let best=1;const own=grSideVal(S);for(const s of S){const g=s.arr&&s.arr.g;if(!g)continue;const k=grMilK(g)/100;
    if((g.tr==='arm'&&role==='att')||(g.tr==='def'&&role==='def')||(g.tr==='rai'&&own<enemyVal))best=Math.max(best,1+k);}return best;}
function grMilNavK(S,E){let sub=0,n=0,boat=0;for(const s of S)for(const r of s.u){n++;if(r[0]==='sub')sub++;}for(const s of E)for(const r of s.u)if(r[0]==='boat')boat++;
  return 1+Math.min(.2,sub/Math.max(1,n)*.4)*(boat?.5:1);}   // submarines strike first unless the other side has patrol boats with sonar
// ---------- fleets ----------
function grFPath(o,from,to){if(from===to)return {path:[],turns:0,decl:''};const P=GCM.P,dist=new Map([[from,0]]),prev=new Map(),open=[[0,from]],done=new Set();
  const pass=j=>P[j].sea||(GC.prov[j].o===o&&P[j].port);
  while(open.length){open.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);const [d,u]=open.shift();if(done.has(u))continue;done.add(u);if(u===to)break;
    for(const j of P[u].adj){if(done.has(j))continue;const c=grEdge(u,j);if(!c||!pass(j))continue;const nd=d+c;if(!dist.has(j)||nd<dist.get(j)){dist.set(j,nd);prev.set(j,u);open.push([nd,j]);}}}
  if(!dist.has(to))return null;const path=[];for(let c=to;c!==from;c=prev.get(c))path.unshift(c);return {path,turns:dist.get(to),decl:''};}
function grMilPorts(c){const L=[];for(const p of GCM.P)if(p.land&&p.port&&GC.prov[p.i].o===c)L.push(p);return L;}
function grMilFleetUnits(fac,value){const us=[];const W=[['ship',.38],['boat',.26],['sub',.2],['fast',.1],['sweep',.06]].filter(w=>grHasKind(fac,w[0]));const tw=W.reduce((a,w)=>a+w[1],0);
  for(const [k,w] of W){const n=Math.max(1,Math.round(value*w/tw/grCost(fac,k)));for(let i=0;i<n;i++)us.push([k,100,0,100]);}return us;}
function grMilFleets(){const M=GC.ml;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;const ports=grMilPorts(c).sort((a,b)=>b.dev-a.dev||a.i-b.i);if(!ports.length)continue;
    const nt=grNat(c),V=GR_VBASE*.2*(nt.major?1:.5)*(GC.len==='quick'?.7:1);const f=grAddArmy(c,ports[0].i,grMilFleetUnits(nt.fac,V),'Home Fleet');f.fl=1;N.an--;}}
function grBuildFleet(c,pi,k){const st=GC.prov[pi],p=GCM.P[pi],N=GC.nat[c];if(!st||st.o!==c||!p.land||!p.port)return 'Needs one of your port provinces.';const fac=grNat(c).fac,rc=GR_NREC.find(r=>r[0]===k);if(!rc||!grHasKind(fac,k))return 'Not available.';
  const cost=Math.round(grCost(fac,k)*rc[1]*(1-Math.min(.24,Math.min(3,geCount(pi,'factory'))*.08))),man=rc[1]*4,turns=Math.max(1,rc[2]-(geCount(pi,'base')?1:0));
  if(N.cash<cost)return 'Not enough money.';if(N.e.man<man)return 'Not enough manpower ('+Math.round(N.e.man)+' of '+man+').';N.cash-=cost;N.e.man-=man;st.rq.push([GC.turn+turns,k,rc[1]]);return '';}
function grMilArrive(c,pi,k,n){let a=GC.armies.find(x=>x.o===c&&x.at===pi&&x.fl&&!x.path.length&&x.nm==='Reserve Fleet');const us=[];for(let i=0;i<n;i++)us.push([k,100,0,100]);
  if(a)a.u.push(...us);else{a=grAddArmy(c,pi,us,'Reserve Fleet');a.fl=1;GC.nat[c].an--;}}
function grMilSeaBlocked(a,nx){if(a.fl||!GCM.P[nx].sea)return false;let en=false,fr=false;for(const f of GC.armies)if(f.fl&&f.at===nx&&f.u.length){if(f.o===a.o)fr=true;else if(grAtWar(f.o,a.o))en=true;}return en&&!fr;}
function grMilNavRetreat(a,from){const P=GCM.P;let best=-1,bs=-1e9;for(const j of P[from].adj){const q=P[j];let ok=false;if(q.land)ok=GC.prov[j].o===a.o&&q.port;else ok=!GC.armies.some(f=>f.fl&&f.at===j&&f.o!==a.o&&grAtWar(f.o,a.o)&&f.u.length);if(!ok)continue;
    const s=-grDist(j,GC.nat[a.o].cap>=0?GC.nat[a.o].cap:j)*.01+(q.land?3:0)+(j===a.from?2:0);if(s>bs){bs=s;best=j;}}return best;}
function grMilNaval(){const P=GCM.P;
  for(const p of P){if(!p.sea)continue;const here=GC.armies.filter(a=>a.at===p.i&&a.fl&&a.u.length);if(here.length<2)continue;
    const arrN=[...new Set(here.filter(a=>a.arr===GC.turn).map(a=>a.o))].sort();
    for(const A of arrN){const att=here.filter(a=>a.o===A&&a.arr===GC.turn),def=here.filter(a=>a.o!==A&&grAtWar(A,a.o)&&!GC.q.some(b=>b.p===p.i&&b.att.includes(a.id)));if(!def.length)continue;
      GC.q.push({p:p.i,an:A,dn:def[0].o,att:att.map(a=>a.id),def:def.map(a=>a.id),garr:false,river:false,mtn:false,nav:1,done:0});}}
  // troop ships caught at sea by an enemy fleet with no escort of their own: half are lost
  for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(a.fl||!P[a.at].sea||!a.u.length)continue;
    if(!GC.armies.some(f=>f.fl&&f.at===a.at&&f.o!==a.o&&f.u.length&&grAtWar(f.o,a.o))||GC.armies.some(f=>f.fl&&f.at===a.at&&f.o===a.o&&f.u.length))continue;
    const n=Math.ceil(a.u.length/2);a.u.splice(a.u.length-n,n);grLog(a.nm+' ('+GCM.nats.get(a.o).name+') lost '+n+' units when its transports were sunk at '+P[a.at].n+'.',a.o===GC.me?a.o:'');if(!a.u.length)grDrop(a);}}
function grMilNavSettle(b,win,how){b.done=1;const P=GCM.P,pn=P[b.p].n,losers=GC.armies.filter(a=>(win==='att'?b.def:b.att).includes(a.id)),winners=GC.armies.filter(a=>(win==='att'?b.att:b.def).includes(a.id));
  let sunk=0;for(const a of losers){a.path=[];if(!a.u.length){grDrop(a);continue;}const to=grMilNavRetreat(a,b.p);if(to<0){sunk++;grLog(a.nm+' ('+GCM.nats.get(a.o).name+') was sunk at '+pn+'.',a.o);grDrop(a);}else{a.at=to;grLog(a.nm+' ('+GCM.nats.get(a.o).name+') withdrew from '+pn+'.',a.o);}}
  for(const a of winners){a.path=[];a.from=-1;for(const r of a.u)r[2]+=40;}
  for(const a of GC.armies.slice())if(!a.u.length)grDrop(a);
  grLog(pn+': '+GCM.nats.get(win==='att'?b.an:b.dn).name+' won the naval battle'+(how==='live'?' (fought live)':'')+'.',b.an===GC.me||b.dn===GC.me?GC.me:b.an);}
// blockade: an enemy fleet in a sea zone next to your port with none of yours there or in the port cuts that province's trade and port income this turn
function grMilBlockade(){const P=GCM.P;for(const p of P){if(!p.land||!p.port)continue;const st=GC.prov[p.i];st.bk=0;const c=st.o;if(!GC.nat[c]||GC.nat[c].dead)continue;
    let en='';for(const j of p.adj){if(!P[j].sea)continue;for(const f of GC.armies)if(f.fl&&f.at===j&&f.u.length&&grAtWar(f.o,c)){en=f.o;break;}if(en)break;}
    if(!en)continue;let own=false;
    for(const j of p.adj)if(P[j].sea&&GC.armies.some(f=>f.fl&&f.at===j&&f.o===c&&f.u.length))own=true;
    if(!own){st.bk=GC.turn;if(c===GC.me||en===GC.me)grLog(p.n+' is blockaded by '+GCM.nats.get(en).name+' (no trade or port income).',GC.me);}}}
function grMilMines(){const M=GC.ml;
  for(const f of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(!f.fl||!f.lm||f.path.length||!GCM.P[f.at].sea||!f.u.some(r=>r[0]==='minel')){f.lm=0;continue;}f.lm=0;
    const m=M.mn[f.at];if(!m||m.o===f.o||m.n<=0)M.mn[f.at]={o:f.o,n:Math.min(4,((m&&m.o===f.o)?m.n:0)+1)};}
  for(const k of Object.keys(M.mn).map(Number).sort((a,b)=>a-b)){const m=M.mn[k];if(m.n<=0){delete M.mn[k];continue;}
    for(const f of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(!f.fl||f.at!==k||f.o===m.o||!grAtWar(f.o,m.o)||!f.u.length)continue;
      if(f.u.some(r=>r[0]==='sweep')){m.n--;grLog(f.nm+' ('+GCM.nats.get(f.o).name+') swept a mine in '+GCM.P[k].n+'.',f.o===GC.me?f.o:'');continue;}
      for(let i=0;i<Math.min(3,f.u.length);i++){const r=f.u[(i+GC.turn)%f.u.length];r[1]=Math.max(4,r[1]-6*m.n);}grLog(f.nm+' ('+GCM.nats.get(f.o).name+') struck mines in '+GCM.P[k].n+'.',f.o===GC.me||m.o===GC.me?GC.me:'');}}}
// ---------- map strikes ----------
function grMilSite(c,pi,d,keys){const P=GCM.P;let fr=[pi];const seen=new Set([pi]);for(let i=0;i<=d;i++){for(const u of fr)if(P[u].land&&GC.prov[u].o===c&&(keys.includes('cap')&&GC.nat[c].cap===u||keys.some(k=>k!=='cap'&&gxHas(u,k))))return u;
    const nx=[];for(const u of fr)for(const j of P[u].adj)if(!seen.has(j)){seen.add(j);nx.push(j);}fr=nx;}return -1;}
function grMilSorties(c){return gxCount(c,'airfield')*2-GC.nat[c].ms.u;}
function grMilAA(pi,t){let q=0;if(GCM.P[pi].sea){let n=0;for(const f of GC.armies)if(f.fl&&f.at===pi)for(const r of f.u)if(r[0]==='ship')n++;return Math.min(.5,n*.07)*GX_ST[t][3];}
  const st=GC.prov[pi];if(gxHas(pi,'aa'))q+=.4;let aa=0;for(const r of st.gar)if(r[0]==='aa')aa++;for(const a of GC.armies)if(a.at===pi&&!a.fl&&a.o===st.o)for(const r of a.u)if(r[0]==='aa')aa++;q+=Math.min(.3,aa*.05);if(GCM.P[pi].cap)q+=.1;return Math.min(.85,q)*GX_ST[t][3];}
function grStrikeOk(c,t,pi,cat){const N=GC.nat[c],P=GCM.P[pi];if(!N||!P||!GX_ST[t])return 'No such strike.';
  if(cat==='flt'){if(!P.sea||!GC.armies.some(f=>f.fl&&f.at===pi&&f.u.length&&grAtWar(f.o,c)))return 'No enemy fleet there.';}
  else{if(!P.land||!grAtWar(c,GC.prov[pi].o))return 'Only provinces of nations you are at war with.';}
  const lim=t==='m'?4:3,site=t==='m'?grMilSite(c,pi,lim,['base','airfield','cap']):t==='a'?grMilSite(c,pi,lim,['airfield']):grMilSite(c,pi,lim,['base','airfield']);
  if(site<0)return t==='m'?'Out of range (needs your capital or a Base within four provinces).':t==='a'?'Needs an Airfield within three provinces.':'Needs a Base or Airfield within three provinces.';
  if(t==='m'&&N.ms.m<1)return 'No missiles left.';if(t==='d'&&N.ms.d<1)return 'No drones left.';if(t==='a'){if(grMilSorties(c)<1)return 'No bomber sorties left this turn.';if(geDry(c)||N.e.fuel<8)return 'No fuel for the bombers.';}
  if(N.cash<GX_ST[t][2])return 'Not enough money ($'+GX_ST[t][2]+').';if(N.so.length>=4)return 'At most four strikes a turn.';return '';}
function grStrike(c,t,pi,cat){const e=grStrikeOk(c,t,pi,cat);if(e)return e;const N=GC.nat[c];N.cash-=GX_ST[t][2];if(t==='m')N.ms.m--;else if(t==='d')N.ms.d--;else{N.ms.u++;N.e.fuel-=6;}N.so.push([t,pi,cat]);return '';}
function grStrikeCancel(c,i){const N=GC.nat[c],s=N.so[i];if(!s)return;N.so.splice(i,1);N.cash+=GX_ST[s[0]][2];if(s[0]==='m')N.ms.m++;else if(s[0]==='d')N.ms.d++;else{N.ms.u--;N.e.fuel+=6;}}
function grMilStrikes(){let k=0;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(!N.so||!N.so.length)continue;
    for(const [t,pi,cat] of N.so){k++;const R=grRng(GC.seed*19+GC.turn*7+k*131+pi),P=GCM.P[pi],nm=GX_ST[t][0],mine=c===GC.me,sh=(o)=>(mine||o===GC.me)?GC.me:c;
      const tgt=P.sea?GCM.nats.get(c).name+' vs the fleet at '+P.n:P.n,own=P.land?GC.prov[pi].o:'';
      if(P.land&&!grAtWar(c,own)){grLog(GCM.nats.get(c).name+' '+nm.toLowerCase()+' on '+P.n+' was called off (no war).',mine?c:'');continue;}
      if(R()<grMilAA(pi,t)){grLog(GCM.nats.get(c).name+' '+nm.toLowerCase()+' on '+P.n+' was intercepted by air defence.',sh(own));continue;}
      if(P.land)geOpinion(c,-.5);
      const dmg={m:cat==='flt'?42:30,a:cat==='flt'?32:38,d:cat==='flt'?14:18}[t];
      if(cat==='arm'||cat==='flt'){let killed=0,hurt=0;const lists=[];for(const a of GC.armies)if(a.at===pi&&!!a.fl===(cat==='flt')&&a.o!==c&&grAtWar(a.o,c))lists.push(a.u);if(cat==='arm')lists.push(GC.prov[pi].gar);
        for(const L of lists){for(let i=L.length-1;i>=0;i--){const r=L[i],d=dmg*(.6+.8*R());r[1]=Math.round(r[1]-d);hurt++;if(r[1]<8){L.splice(i,1);killed++;}}}
        for(const a of GC.armies.slice())if(!a.u.length&&a.at===pi&&a.o!==c)grDrop(a);
        grLog(GCM.nats.get(c).name+' '+nm.toLowerCase()+' hit '+(cat==='flt'?'the fleet at ':'')+P.n+': '+hurt+' units hit, '+killed+' destroyed.',sh(own));}
      else{const keys=cat==='eco'?['factory','power','refinery','port','farm','mine']:['base','airfield','aa','mfort'];const bl=gmBuildings(pi);let done='';
        for(const key of keys){const r=bl.find(x=>x[0]===key&&!(x[1]>=100));if(r){r[1]=Math.min(100,(r[1]||0)+{m:60,a:45,d:25}[t]);done=(GE_B[key]?GE_B[key][0]:key)+(r[1]>=100?' destroyed':' damaged');break;}}
        if(cat==='eco')GC.prov[pi].bm=Math.max(GC.prov[pi].bm||0,2);
        grLog(GCM.nats.get(c).name+' '+nm.toLowerCase()+' hit '+P.n+(done?': '+done+'.':': nothing worth hitting.'),sh(own));}
      if(P.land)GC.prov[pi].hit=GC.turn;}
    N.so=[];}}
function grMilAIStrike(c,R,wars){const N=GC.nat[c];if(!wars.length||N.so.length>=2)return;const P=GCM.P;let best=null,bs=0;
  for(const p of P){if(!p.land)continue;const w=GC.prov[p.i].o;if(!wars.includes(w)||GC.nat[w].dead)continue;
    let av=0;for(const a of GC.armies)if(a.at===p.i&&a.o===w&&!a.fl)av+=grArmyVal(a);const eco=(gxHas(p.i,'factory')?3:0)+(gxHas(p.i,'refinery')?2:0)+(gxHas(p.i,'power')?1:0);
    const sc=av/1500+eco*2+(p.cap?1:0)-grMilAA(p.i,'m')*6;if(sc>bs){bs=sc;best=[p.i,av>=3000?'arm':eco?'eco':'bas'];}}
  if(!best)return;for(let n=0;n<2&&N.so.length<2;n++){const t=N.ms.d>3?'d':(grMilSorties(c)>0&&N.e.fuel>30&&!geDry(c))?'a':N.ms.m>1?'m':'';if(!t)break;if(grStrike(c,t,best[0],best[1]))break;}}
function grMilProduce(){for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;const f=gxCount(c,'factory');N.ms.m=Math.min(20,N.ms.m+((GC.turn%2)?1:0)+Math.floor(f/2));N.ms.d=Math.min(30,N.ms.d+1+f);N.ms.u=0;}}
// ---------- fronts ----------
function grFrontSet(c,en,mode){const F=GC.fr[c]=GC.fr[c]||[];let f=F.find(x=>x.en===en);if(!f){f={id:GC.ml.fid++,en,mode};F.push(f);}f.mode=mode;return '';}
function grFrontDrop(c,en){const F=GC.fr[c]||[],f=F.find(x=>x.en===en);if(!f)return;GC.fr[c]=F.filter(x=>x!==f);for(const a of GC.armies)if(a.fr===f.id)a.fr=0;}
function grFrontAssign(c,en,aid){const f=(GC.fr[c]||[]).find(x=>x.en===en),a=GC.armies.find(x=>x.id===aid);if(!f||!a||a.o!==c||a.fl)return 'No such front or army.';a.fr=f.id;return '';}
function grMilBorder(c,en){const L=[];for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&p.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===en))L.push(p.i);return L;}
function grMilEnemyAt(en,pi){let v=0;for(const a of GC.armies)if(a.at===pi&&a.o===en&&!a.fl)v+=grArmyVal(a);return v;}
function grMilFronts(){const P=GCM.P;
  for(const c of Object.keys(GC.fr).sort()){let F=GC.fr[c];for(const f of F.slice())if(!grAtWar(c,f.en)||!GC.nat[f.en]||GC.nat[f.en].dead)grFrontDrop(c,f.en);F=GC.fr[c];
    for(const f of F){const bord=grMilBorder(c,f.en);if(!bord.length)continue;const tv={};
      const mine=GC.armies.filter(a=>a.fr===f.id&&a.o===c&&!a.fl&&!a.path.length).sort((x,y)=>x.id-y.id);
      for(const a of mine){const val=grArmyVal(a);if(val<800)continue;let tgt=-1;const onB=bord.includes(a.at);
        if(f.mode==='push'&&onB){let ts=-1e9;for(const j of P[a.at].adj){if(!P[j].land||GC.prov[j].o!==f.en)continue;const def=grProvDef(j)*1.25+grMilEnemyAt(f.en,j),have=val+(tv[j]||0);if(have<def*1.1)continue;const sc=(P[j].wg?40:0)+P[j].dev*4+(have/Math.max(300,def)-1)*30;if(sc>ts){ts=sc;tgt=j;}}}
        else if(f.mode==='counter'&&onB){let ts=-1e9;for(const j of P[a.at].adj){if(!P[j].land)continue;const ev=grMilEnemyAt(f.en,j);if(ev<=0||val<ev*1.1)continue;const sc=ev/100+(GC.prov[j].o===c?30:0);if(sc>ts){ts=sc;tgt=j;}}}
        if(tgt<0&&!onB){let bt=-1e9;for(const j of bord){let thr=0;for(const k of P[j].adj)if(P[k].land)thr+=grMilEnemyAt(f.en,k);const sc=thr/50-grProvDef(j)/2000-grDist(a.at,j)*.02+(GC.armies.some(x=>x!==a&&x.at===j&&x.fr===f.id)?-2:0);if(sc>bt){bt=sc;tgt=j;}}}
        if(tgt>=0&&tgt!==a.at){const r=grPath(c,a.at,tgt);if(r&&!r.decl&&r.path.length&&r.turns<=3){a.path=r.path;a.pg=0;tv[tgt]=(tv[tgt]||0)+val;}}}}}}
function grMilAI(c,R,wars){const N=GC.nat[c],P=GCM.P;
  for(const en of wars){if(!GC.nat[en]||GC.nat[en].dead)continue;const bord=grMilBorder(c,en);if(!bord.length){grFrontDrop(c,en);continue;}
    let mv=0,ev=0;for(const j of bord){mv+=GC.armies.filter(a=>a.at===j&&a.o===c&&!a.fl).reduce((s,a)=>s+grArmyVal(a),0)+grProvDef(j);for(const k of P[j].adj)if(P[k].land&&GC.prov[k].o===en){ev+=grProvDef(k)+grMilEnemyAt(en,k);}}
    const ratio=mv/Math.max(1,ev),mode=ratio>=1.1?'push':ratio<=.6?'hold':'counter';grFrontSet(c,en,mode);}
  const F=GC.fr[c]||[];if(F.length){for(const a of GC.armies.filter(x=>x.o===c&&!x.fl&&!x.fr&&!x.path.length&&x.u.length>=4).sort((x,y)=>x.id-y.id)){
      const sole=N.cap===a.at&&GC.armies.filter(x=>x.o===c&&x.at===a.at&&!x.fl).length===1;if(sole||grArmyVal(a)<2500)continue;let bf=null,bd=1e9;
      for(const f of F){const d=Math.min(...grMilBorder(c,f.en).map(j=>grDist(a.at,j)));if(d<bd){bd=d;bf=f;}}if(bf)a.fr=bf.id;}}
  // strikes, new ships, fleets
  grMilAIStrike(c,R,wars);
  const ports=grMilPorts(c);if(ports.length&&wars.length&&N.cash>3000&&R()<.35){const fac=grNat(c).fac,k=GR_NREC[Math.floor(R()*4)%4];if(grHasKind(fac,k[0]))grBuildFleet(c,ports[Math.floor(R()*ports.length)].i,k[0]);}
  const fl=GC.armies.filter(a=>a.o===c&&a.fl&&!a.path.length).sort((x,y)=>x.id-y.id);const zoneVal=z=>GC.armies.filter(a=>a.fl&&a.at===z&&grAtWar(a.o,c)).reduce((s,a)=>s+grArmyVal(a),0);
  for(const f of fl){if(f.u.some(r=>r[0]==='minel'))f.lm=1;const val=grArmyVal(f);if(val<1500)continue;
    // escort: an army of ours is headed through a sea zone where we have no fleet
    let tgt=-1;for(const a of GC.armies){if(a.o!==c||a.fl||!a.path.length)continue;const z=a.path.find(j=>P[j].sea&&!GC.armies.some(g=>g.fl&&g.o===c&&g.at===j));if(z!=null&&z>=0&&!GC.armies.some(g=>g.fl&&g.o===c&&g!==f&&g.path.includes&&g.path.includes(z))){tgt=z;break;}}
    if(tgt<0&&wars.length&&GC.turn>=2){let bs=-1e9;for(const p of P){if(!p.land||!p.port||!wars.includes(GC.prov[p.i].o))continue;for(const z of p.adj){if(!P[z].sea)continue;const ev=zoneVal(z);if(ev>val*.9)continue;const sc=p.dev*3-grDist(f.at,z)*.01-(ev>0?-5:0);if(sc>bs){bs=sc;tgt=z;}}}}
    if(tgt>=0&&tgt!==f.at){const r=grFPath(c,f.at,tgt);if(r&&r.path.length&&r.turns<=5)f.path=r.path;}
    else if(tgt<0&&f.u.reduce((s,r)=>s+r[1],0)/f.u.length<55&&!(P[f.at].land&&GC.prov[f.at].o===c)){const pr=ports.sort((x,y)=>grDist(f.at,x.i)-grDist(f.at,y.i)||x.i-y.i)[0];if(pr){const r=grFPath(c,f.at,pr.i);if(r&&r.path.length)f.path=r.path;}}}}
// ---------- per-turn bookkeeping (called from grFinishTurn before the economy) and the pre-movement hook ----------
function grMilPre(){if(!GC.ml)return;for(const c of Object.keys(GC.nat))if(GC.nat[c].so===undefined)grMilInit();try{grMilStrikes();grMilFronts();}catch(e){console.error('grMilPre',e);}}
function grMilTurn(){if(!GC.ml)return;grMilMines();grMilBlockade();grMilProduce();
  for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id)){if(a.fl){if(GCM.P[a.at].land&&GC.prov[a.at].o===a.o)for(const r of a.u)r[1]=Math.min(100,r[1]+25);}else if(a.u.length>=8)grMilGeneral(a);}}
function grMilInit(){if(!GC)return;if(!GC.ml){GC.ml={v:1,gid:1,fid:1,mn:{}};GC.fr={};for(const st of GC.prov){st.bk=0;}
    for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];N.gp=[];N.ms={m:4,d:6,u:0};N.so=[];N.cp=0;N.gk=0;}
    for(const a of GC.armies.slice().sort((x,y)=>x.id-y.id))grMilGeneral(a);grMilFleets();}
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.so===undefined){N.gp=[];N.ms={m:4,d:6,u:0};N.so=[];N.cp=0;N.gk=0;}}}
function grMilHash(){if(!GC||!GC.ml)return '';let s='|M'+GC.ml.gid+','+GC.ml.fid;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.ms)s+='|'+c+N.ms.m+','+N.ms.d+','+N.gk+','+N.cp+','+N.gp.length+','+N.so.length;}
  for(const a of GC.armies)if(a.g)s+='|g'+a.g.id+a.g.lv+','+a.g.xp;for(const c of Object.keys(GC.fr).sort())for(const f of GC.fr[c])s+='|f'+c+f.en+f.mode;for(const k of Object.keys(GC.ml.mn).sort())s+='|m'+k+GC.ml.mn[k].o+GC.ml.mn[k].n;
  let b=0;for(const p of GC.prov)if(p.bk)b++;return s+'|B'+b;}
// ---------- the battle bridge: the general as a hero unit with his perks; naval Fight-it ----------
// returns the extra temporary hero record and applies the perk as bonus experience (undone after the battle: GB_CUR.bumps)
function grMilBattleRecs(L,role,enemyVal){const extra=[],bumps=[];const own=grSideVal(L);
  for(const s of L){const a=s.arr,g=a&&a.g;if(!g||a.fl)continue;const fac=s.fac;
    if(grHasKind(fac,'champ')&&!a.u.some(r=>r[0]==='champ')){const h=['champ',100,0,100];h.tmp=1;h.gen=g.id;extra.push(h);s.u.push(h);}
    const lv=g.lv,xb=r=>{const c=Math.max(300,grCost(fac,r[0]));return Math.round(c*(lv>=3?2.5:1));};
    for(const r of s.u){if(r[0]==='champ')continue;const ok=g.tr==='arm'?(r[0]==='tank'||r[0]==='heli'):g.tr==='def'?role==='def'&&(r[0]==='inf'||r[0]==='at'):g.tr==='rai'?own<enemyVal:g.tr==='log';
      if(!ok)continue;if(g.tr==='log'){r[3]=100;continue;}const d=xb(r);r[2]+=d;bumps.push([r,d]);}}
  return {extra,bumps};}
function grMilBattleEnd(c){   // called inside grandWriteBack while dead units are still flagged
  for(const s of grSideUnits(c.b,'att').concat(grSideUnits(c.b,'def'))){const a=s.arr;if(!a||!a.g)continue;const h=s.u.find(r=>r[0]==='champ');if(h&&h.dead)grMilLost(a);}
  for(const s of grSideUnits(c.b,'att').concat(grSideUnits(c.b,'def'))){for(let i=s.u.length-1;i>=0;i--)if(s.u[i].tmp)s.u.splice(i,1);}
  for(const [r,d] of (c.bumps||[]))r[2]=Math.max(0,r[2]-d);c.bumps=[];}
function grMilNavStart(b){const P=GCM.P[b.p],me=GC.me,meAtt=b.an===me||(b.dn!==me&&b.att.some(id=>(GC.armies.find(a=>a.id===id)||{}).o===me));
  const S=grSideUnits(b,'att'),D=grSideUnits(b,'def'),flat=L=>{const o=[];for(const s of L)o.push(...s.u);return o;};
  const side0=meAtt?flat(S):flat(D),side1=meAtt?flat(D):flat(S),nat0=meAtt?b.an:b.dn,nat1=meAtt?b.dn:b.an,f0=grNat(nat0).fac,f1=grNat(nat1).fac,attTeam=meAtt?0:1;
  const cfg={fuel:[null,null],bi:{p:b.p},att:attTeam,pn:P.n,sides:[side0,side1],waves:[],fort:0,sam:false,mir:null};
  GB_CUR={b,cfg,meAtt,nat0,nat1,rf:[],bumps:[]};try{initAudio();}catch(e){}
  MODE='single';ME=0;setup.p=f0;setup.d=1;TERR_DEFER=true;
  try{newGame({seed:(GC.seed*31+GC.turn*977+b.p*13)|0,facs:[f0,f1],ai:[false,false],map:'gulf',tm:[0,1],bs:1,slot:0,st:attTeam===0?[0,1]:[1,0],w:0,grand:cfg});}finally{TERR_DEFER=false;}
  afterStart();}
// ---------- UI: the Military panel (generals / fronts / strikes / fleets) ----------
GV.milTab=GV.milTab||'gen';
function guMilAct(fn){const e=fn();if(e){GV.hint=e;if(typeof guHint==='function')guHint();}grSave();guTop();guSide();guMilRender();if(typeof grandMapRefresh==='function')grandMapRefresh();}
function guMilBtn(t,fn,title,on,dis){const b=guEl('button',GX_BTN+(on?';border-color:#ffe27a;background:#41572a':'')+(dis?';opacity:.45;cursor:not-allowed':''),t);b.type='button';if(title)b.title=title;b.onclick=()=>{if(!dis)guMilAct(fn);};return b;}
function guMilTop(t,me){if(!me||!me.ms)return;
  const b=guEl('button','padding:5px 12px;border-radius:6px;border:1px solid #7aa84f;background:#26391a;color:#d8f0b8;cursor:pointer;font-size:14px;font-weight:bold','Military');b.type='button';b.id='gMilBtn';b.title='Generals, fronts, strikes, fleets';b.onclick=guMilToggle;t.appendChild(b);if(document.getElementById('gMil'))guMilRender();}
function guMilToggle(){const e=document.getElementById('gMil');if(e){e.remove();return;}const g=document.getElementById('gEco');if(g)g.remove();
  const p=guEl('div','position:fixed;left:10px;top:56px;width:410px;max-height:calc(100vh - 80px);overflow:auto;z-index:8200;background:#101c28ee;border:1px solid #7aa84f;border-radius:9px;padding:10px 12px;color:#e8e4d8;font-size:14px;line-height:1.45');p.id='gMil';document.body.appendChild(p);guMilRender();}
function guMilStars(g){return '★'.repeat(g.lv)+'☆'.repeat(5-g.lv);}
function guMilRender(){const p=document.getElementById('gMil');if(!p||!GC||!GC.me)return;const c=GC.me,N=GC.nat[c];if(!N.ms)return;p.innerHTML='';
  const tabs=guEl('div','display:flex;gap:4px;margin-bottom:8px');for(const [k,n] of [['gen','Generals'],['fr','Fronts'],['st','Strikes'],['fl','Fleets']])tabs.appendChild(guMilBtn(n,()=>{GV.milTab=k;return '';},'',GV.milTab===k));p.appendChild(tabs);
  const plan=GC.ph==='plan',sec=(t)=>guEl('div','font-weight:bold;margin:8px 0 3px;color:#cfe3a8',t);
  if(GV.milTab==='gen'){p.appendChild(sec('Your generals'));const L=GC.armies.filter(a=>a.o===c&&a.g);
    if(!L.length)p.appendChild(guEl('div','opacity:.7','No army has a general yet (armies of 8+ units get one).'));
    for(const a of L){const g=a.g,row=guEl('div','border:1px solid #2c4358;border-radius:6px;padding:5px 7px;margin:4px 0;background:#14222f;display:flex;gap:8px;align-items:center');
      const ic=guEl('div','width:34px;height:34px;border-radius:50%;background:'+grNat(c).color+';border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;text-shadow:0 0 3px #000;flex:none',g.nm.split(' ').map(w=>w[0]).join('').slice(0,2));row.appendChild(ic);
      const tx=guEl('div','flex:1','<b>'+grMilRank(g)+' '+g.nm+'</b> <span style="color:#ffe27a">'+guMilStars(g)+'</span><br><span style="font-size:13px;opacity:.85">'+GX_TR[g.tr][0]+': +'+(grMilK(g))+'% '+GX_TR[g.tr][1]+' · leads '+a.nm+' ('+a.u.length+' units, '+GCM.P[a.at].n+')</span>');row.appendChild(tx);
      row.appendChild(guMilBtn('Go',()=>{GV.sel=a.at;GV.selA=a.id;if(typeof guCentre==='function')guCentre(a.at,2.2);return '';}));p.appendChild(row);}
    p.appendChild(guEl('div','font-size:13px;opacity:.75;margin-top:6px','Waiting for a command: <b>'+N.gp.length+'</b> · lost in action: <b>'+N.gk+'</b> · enemy generals captured: <b>'+N.cp+'</b>. Generals gain experience in battles and rise to level 5; if their army is destroyed they may be killed, captured or escape. In a live battle the general fights as a hero unit and his perk applies.'));}
  else if(GV.milTab==='fr'){p.appendChild(sec('Front lines'));p.appendChild(guEl('div','font-size:13px;opacity:.8;margin-bottom:4px','Armies on a front move themselves each turn: <b>Hold</b> guards the most threatened border province, <b>Push</b> attacks when strong enough, <b>Counter</b> hits enemy armies that reach your border. Any order you give an army takes it off the front.'));
    const wars=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c)).sort(),F=GC.fr[c]||[];
    if(!wars.length)p.appendChild(guEl('div','opacity:.7','You are at peace.'));
    for(const en of wars){const f=F.find(x=>x.en===en),bord=grMilBorder(c,en),row=guEl('div','border:1px solid #2c4358;border-radius:6px;padding:5px 7px;margin:4px 0;background:#14222f');
      row.appendChild(guEl('div','','<b>'+GCM.nats.get(en).name+'</b> <span style="opacity:.7;font-size:13px">'+(bord.length?bord.length+' border provinces':'no common border')+(f?' · '+GC.armies.filter(a=>a.fr===f.id).length+' armies':'')+'</span>'));
      if(bord.length){const bt=guEl('div','display:flex;gap:4px;flex-wrap:wrap;margin-top:3px');
        for(const [m,n] of [['hold','Hold'],['push','Push'],['counter','Counter-attack']])bt.appendChild(guMilBtn(n,()=>grFrontSet(c,en,m),'',f&&f.mode===m,!plan));
        const a=GV.selA&&GC.armies.find(x=>x.id===GV.selA&&x.o===c&&!x.fl);
        if(f){bt.appendChild(guMilBtn('Assign selected army',()=>a?grFrontAssign(c,en,a.id):'Select one of your armies on the map first.','',false,!plan));bt.appendChild(guMilBtn('Remove',()=>{grFrontDrop(c,en);return '';},'',false,!plan));}
        row.appendChild(bt);}p.appendChild(row);}}
  else if(GV.milTab==='st'){const ms=N.ms;p.appendChild(sec('Strike stocks'));
    p.appendChild(guEl('div','','Missiles <b>'+ms.m+'</b> · Drones <b>'+ms.d+'</b> · Bomber sorties this turn <b>'+Math.max(0,grMilSorties(c))+'</b>'));
    p.appendChild(guEl('div','font-size:13px;opacity:.8;margin:3px 0','Missiles need your capital or a Base within four provinces; drones a Base or Airfield within three; air raids an Airfield within three (2 sorties each, uses fuel). Air defence in the target province can intercept: Air defence building 40%, AA units 5% each, capital +10%. More Factories mean faster missile and drone production.'));
    p.appendChild(sec('Launch at the selected target'));const pi=GV.sel,P=pi>=0?GCM.P[pi]:null;
    if(!P)p.appendChild(guEl('div','opacity:.7','Click an enemy province (or a sea zone holding an enemy fleet) on the map.'));
    else{p.appendChild(guEl('div','','<b>'+P.n+'</b>'));const cats=P.sea?['flt']:['arm','eco','bas'];GV.milCat=cats.includes(GV.milCat)?GV.milCat:cats[0];
      const cr=guEl('div','display:flex;gap:4px;flex-wrap:wrap;margin:3px 0');for(const k of cats)cr.appendChild(guMilBtn(GX_CATS[k],()=>{GV.milCat=k;return '';},'',GV.milCat===k));p.appendChild(cr);
      const tr=guEl('div','display:flex;gap:4px;flex-wrap:wrap');for(const t of ['m','a','d']){const err=!plan?'Wait for the planning phase.':grStrikeOk(c,t,pi,GV.milCat);tr.appendChild(guMilBtn(GX_ST[t][0]+' ($'+GX_ST[t][2]+')',()=>grStrike(c,t,pi,GV.milCat),err||GX_ST[t][1],false,!!err));}p.appendChild(tr);
      const e1=['m','a','d'].map(t=>grStrikeOk(c,t,pi,GV.milCat));if(e1.every(x=>x))p.appendChild(guEl('div','font-size:13px;color:#ff9d8e;margin-top:3px',e1[0]));}
    p.appendChild(sec('Queued this turn'));if(!N.so.length)p.appendChild(guEl('div','opacity:.7','None. Strikes land before the armies move.'));
    N.so.forEach((s,i)=>{const r=guEl('div','display:flex;gap:6px;align-items:center;margin:2px 0');r.appendChild(guEl('span','flex:1',GX_ST[s[0]][0]+' → <b>'+GCM.P[s[1]].n+'</b> ('+GX_CATS[s[2]]+')'));if(plan)r.appendChild(guMilBtn('Cancel',()=>{grStrikeCancel(c,i);return '';}));p.appendChild(r);});}
  else{p.appendChild(sec('Your fleets'));const L=GC.armies.filter(a=>a.o===c&&a.fl);if(!L.length)p.appendChild(guEl('div','opacity:.7','No fleets. Build ships in one of your port provinces below.'));
    for(const a of L){const f=grNat(c).fac,cnt={};for(const r of a.u)cnt[r[0]]=(cnt[r[0]]||0)+1;const row=guEl('div','border:1px solid #2c4358;border-radius:6px;padding:5px 7px;margin:4px 0;background:#14222f;display:flex;gap:8px;align-items:center');
      row.appendChild(guEl('div','flex:1','<b>'+a.nm+'</b> <span style="opacity:.75">@ '+GCM.P[a.at].n+'</span><br><span style="font-size:13px;opacity:.85">'+Object.keys(cnt).map(k=>cnt[k]+' '+grKindName(f,k)).join(', ')+' · health '+Math.round(a.u.reduce((s,r)=>s+r[1],0)/a.u.length)+'%'+(a.path.length?' · → '+GCM.P[a.path[a.path.length-1]].n:'')+'</span>'));
      if(a.u.some(r=>r[0]==='minel')&&GCM.P[a.at].sea)row.appendChild(guMilBtn(a.lm?'Mines: ON':'Lay mines',()=>{a.lm=a.lm?0:1;return '';},'Lay a mine in this sea zone at the end of the turn',!!a.lm,!plan));
      row.appendChild(guMilBtn('Go',()=>{GV.sel=a.at;GV.selA=a.id;if(typeof guCentre==='function')guCentre(a.at,2.2);return '';}));p.appendChild(row);}
    p.appendChild(guEl('div','font-size:13px;opacity:.8;margin-top:4px','Select a fleet and right-click a sea zone or one of your ports to sail. A fleet in a sea zone stops enemy fleets blockading your ports next to it and escorts your troop ships; an enemy fleet in a zone sinks half of any army crossing there without an escort. Ships in your own port repair 25% a turn.'));
    const bl=GCM.P.filter(q=>q.land&&GC.prov[q.i].o===c&&GC.prov[q.i].bk===GC.turn);if(bl.length)p.appendChild(guEl('div','color:#ff9d8e;margin-top:4px','Blockaded now: '+bl.map(q=>q.n).join(', ')));
    const pi=GV.sel;if(pi>=0&&GCM.P[pi].land&&GC.prov[pi].o===c&&GCM.P[pi].port){p.appendChild(sec('Build ships in '+GCM.P[pi].n));const bt=guEl('div','display:flex;gap:4px;flex-wrap:wrap'),f=grNat(c).fac;
      for(const [k,n,t] of GR_NREC){if(!grHasKind(f,k))continue;const cost=grCost(f,k)*n;bt.appendChild(guMilBtn(n+'× '+grKindName(f,k)+' $'+cost,()=>grBuildFleet(c,pi,k),'Arrives in '+t+' turns',false,!plan||N.cash<cost));}p.appendChild(bt);}
    else p.appendChild(guEl('div','opacity:.7;margin-top:6px','Select one of your port provinces on the map to build ships.'));}}
