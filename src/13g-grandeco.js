/* ===== GRAND 2 - EMPIRE ECONOMY on the grand map (Abdullah 2026-11-05/06) =====
   One system (orch/SYSTEMS.md): everything about empire money lives here. Province buildings are the entries of GC.prov[i].bl
   (the same list the battle mirror reads: gmBuildings/gmApply place fort/aa/airfield/factory/port/mfort in that province's battle).
   Nation economy state is GC.nat[c].e, world state GC.eco; both JSON-safe, deterministic (no Math.random / Date), saved with GC.
   Per turn: geBegin() -> province loop in grFinishTurn (geProvInc) -> geNation(c) for every living nation -> geWorld().
   Same numbers for every nation; the only per-nation difference is the signature table below (orch/SIGNATURES.md). */

// ---------- signatures (single source: orch/signatures-gen.mjs writes orch/SIGNATURES.md from this block) ----------
// kind: E economy (grand2 builds the fx), M military (grand3 builds), L leader/political (grand6 builds), F Mountain Fortress (grand2 building)
// fx = two economy modifiers (GE_FX keys). Nations whose assets are M/L/F only get the INTERIM stipend ['tax','upkeep'] (same value) until the stage lands.
/*SIG-BEGIN*/
const GE_SIG={
 US:[['M','Carrier Strike Groups','Carriers in fleets carry big air wings: the most sorties in range of any battle at sea or on the coast.'],['M','Bunker Buster','A grand-map strike that crushes fortified provinces.']],
 TR:[['E','Straits Toll','Collects tolls on the Turkish Straits and every busy sea lane: trade routes and port income are richer.',['trade','port']]],
 IL:[['M','Missile-Defence Umbrella','Interceptor batteries shield own provinces from map strikes.'],['M','Bunker Buster','A grand-map strike that crushes fortified provinces.']],
 UA:[['M','Drone Workshops','Cheap drone swarms strike from the army stack; losses refill fast.']],
 RU:[['M','Strategic Bomber Fleet','Long-range bombers hit provinces far behind the front.'],['M','Bunker Buster','A grand-map strike that crushes fortified provinces.']],
 IR:[['L','Ayatollah','Clerical leader: morale and loyalty, tours provinces, their people clamour for war.'],['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 SA:[['E','Oil Fund','Pumps oil harder and banks the proceeds in a richer central bank.',['oil','bank']]],
 AE:[['E','Sovereign Wealth Fund','A deep treasury: war bonds are cheap and the central bank pays well.',['bond','bank']]],
 PK:[['M','Tactical Missile Corps','Short-range ballistic missiles on the army stack.']],
 IN:[['E','Population Dividend','The largest recruit pool and the best harvests.',['manp','food']]],
 CN:[['E','Mass Mobilisation','Factories and barracks turn out units cheaply and quickly.',['build','recr']],['M','Bunker Buster','A grand-map strike that crushes fortified provinces.']],
 KP:[['L','Dear Leader','National leader figure: loyalty and fervour, huge war support.'],['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 KR:[['E','Chaebol Arsenal','High-tech industry: richer taxes and a stronger power grid.',['tax','power']]],
 EG:[['E','Suez Dues','Canal dues and regional commerce.',['trade','tax']]],
 CU:[['E','Black-Market Networks','Smuggling pays double and wrecks are stripped for parts.',['smug','salv']]],
 RS:[['L','Ayatollah','Clerical leader: morale and loyalty, tours provinces, their people clamour for war.'],['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 DW:[['L','Ayatollah','Clerical leader: morale and loyalty, tours provinces, their people clamour for war.'],['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 RV:[['M','Call to the Shrines','When an enemy enters a province with a holy city, a free volunteer levy rises there.']],
 IQ:[['E','Oil-for-Reconstruction','Oil money rebuilds quickly.',['oil','build']]],
 SY:[['E','Salvage Brigades','Rubble becomes cash and the army lives lean.',['salv','upkeep']]],
 JP:[['E','Precision Industry','Efficient plants: a stable grid and a cheaper army.',['power','upkeep']]],
 GB:[['M','Special Air Service Raids','Small elite raids behind enemy lines.']],
 FR:[['M','Foreign Legion Rapid Deployment','An elite army that marches a province faster.']],
 DE:[['E','Engineering Excellence','Builds cheaply and rides out crises.',['build','crisis']]],
 PL:[['M','Eastern Shield','A belt of extra forts on the border provinces.']],
 AZ:[['E','Caspian Pipeline','Pipeline oil and a quiet back-door trade.',['oil','smug']]],
 JO:[['M','Desert Patrol','Fast desert raiders guard the border.']],
 KD:[['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 TW:[['E','Silicon Shield','Chip foundries: taxes and crisis resilience.',['tax','crisis']]],
 VN:[['M','Tunnel Networks','Hidden armies in the hills.']],
 AU:[['E','Pacific Logistics','Long supply lines run lean: little fuel burnt, busy ports.',['fuel','port']]],
 PH:[['E','Overseas Remittances','Money from abroad and a large recruit pool.',['bank','manp']]],
 BR:[['E','Agribusiness','Great harvests and export trade.',['food','trade']]],
 VE:[['E','Heavy Crude','Oil wells and mines.',['oil','mine']]],
 MX:[['E','Maquiladoras','Cheap recruitment and cross-border trade.',['recr','trade']]],
 CA:[['E','Northern Resources','Mines and farmland.',['mine','food']]],
 DZ:[['E','Gas Exports','Oil and gas revenue.',['oil','tax']]],
 MA:[['E','Phosphate Exports','Mines and a busy harbour.',['mine','port']]],
 NG:[['E','Delta Oil','Oil money with a calm home front.',['oil','calm']]],
 OM:[['E','Hormuz Pilots','Pilots the strait: busy ports and a calm coast.',['port','calm']]],
 IT:[['M','Alpini','Mountain troops that hold passes.']],
 GR:[['E','Merchant Marine','Sea trade and cheap credit.',['trade','bond']]],
 ID:[['E','Spice Islands','Island trade and long-range air patrols that burn little fuel.',['trade','air']]],
 AF:[['F','Mountain Fortress','Pre-built mountain bunker in mountain provinces.']],
 AR:[['E','Beef and Grain','Farms and a sound bank.',['food','bank']]],
 CO:[['E','Coffee and Emeralds','Mines and taxes.',['mine','tax']]],
 ES:[['M','Spanish Legion','Shock troops with the best assaults.']],
 ZA:[['E','Gold and Platinum','Deep mines and a rich bank.',['mine','bank']]],
 TH:[['E','Rice Bowl','Harvests and a calm home front.',['food','calm']]],
 ET:[['E','Highland Levies','A big recruit pool at low upkeep.',['manp','upkeep']]],
 LY:[['E','Oil Terminals','Oil and shipping.',['oil','port']]],
 OB:[['M','Urban Labyrinth','Rubble-city home battles; some fallen fighters slip away and return after the battle.']],
 BI:[['M','Desert Raids','Fast moves across desert provinces and recovering captured gear after won battles.']],
 SD:[['E','Gold Routes','Gold mines and smuggled trade.',['smug','mine']]],
 SE:[['E','Neutral Arms Exports','Arms sales and a cheap army.',['tax','upkeep']]],
 KZ:[['E','Steppe Uranium','Mines and thrifty fuel.',['mine','fuel']]],
 CL:[['E','Copper Reserve','Mines and a vault the enemy cannot loot.',['mine','vault']]]
};
/*SIG-END*/
const GE_INTERIM=['tax','upkeep'];
const GE_MFORT=['IR','RS','AF','KD','DW','KP'];   // Abdullah 2026-11-05 21:03
// effect keys (each worth about the same, ~3-5% of an empire's net): see SIGNATURES.md
const GE_FX={trade:'Trade routes x1.35',oil:'Oil output x1.3, +6% sale price',fuel:'Fuel burn x0.75',upkeep:'Army upkeep x0.88',manp:'Manpower x1.25',bond:'War-bond interest halved',salv:'Salvage x2',tax:'Tax income x1.05',food:'Harvests x1.2',power:'Power grid x1.25',build:'Buildings cost x0.8',bank:'Bank interest doubled',smug:'Smuggling x2',port:'Port income x1.5',mine:'Mine income x1.3',calm:'Unrest -3',vault:'Looted bank share 50% -> 20%',recr:'Recruits cost x0.9',crisis:'Crises hit half as hard',air:'Sortie fuel x0.7'};
function geFxList(c){const a=GE_SIG[c];if(!a)return GE_INTERIM;for(const s of a)if(s[0]==='E'&&s[3])return s[3];return GE_INTERIM;}
function geFx(c,k){return geFxList(c).includes(k);}
function geSigName(c){const a=GE_SIG[c];return a?a.map(s=>s[1]).join(' + '):'-';}

// ---------- province buildings ----------
// key: [name, cost, turns, letter, colour, help]
const GE_B={
 base:['Military base',650,2,'B','#c9a35a','Recruits here arrive 1 month sooner, +2 garrison room, resupplies armies in and next to it.'],
 airfield:['Airfield',850,3,'A','#8fc4e8','Air wings live here: sorties reach battles in range, and the airfield stands in this province\'s battle.'],
 port:['Port',550,2,'P','#6fb0d8','+50 income, sea trade, a shipyard in this province\'s battle (coast only).'],
 factory:['War Factory',750,3,'F','#d9a05a','+110 income, recruits cost 8% less (3 max). Needs power.'],
 refinery:['Refinery',700,3,'R','#a58bd0','Makes 16 fuel a month from oil. Needs power and an oil province or oil stock.'],
 power:['Power plant',700,3,'E','#f2d95a','+14 on the power grid. Blackouts slow factories and recruiting.'],
 aa:['Air defence',380,2,'D','#9ad07f','A SAM site in this province\'s battle; halves bombing damage here.'],
 farm:['Irrigation',450,2,'G','#b8d96a','+6 food (farm provinces only).'],
 mine:['Deep mine',550,3,'M','#b9bec6','+100 income (mining provinces only).'],
 fort:['Fort',500,2,'T','#d0a090','A defence gun in this province\'s battle.'],
 mfort:['Mountain Fortress',1000,4,'X','#e0c070','A bunker pre-built in the battle (mountain provinces of IR, RS, AF, KD, DW, KP).']};
const GE_BKEYS=['base','airfield','port','factory','refinery','power','aa','farm','mine','fort','mfort'];
function geBl(pi){return gmBuildings(pi);}
function geEff(pi,k){let e=0;for(const r of geBl(pi))if(r[0]===k)e+=Math.max(0,1-(r[1]|0)/100);return e;}
function geCount(pi,k){let n=0;for(const r of geBl(pi))if(r[0]===k)n++;return n;}
function geSlots(pi){const p=GCM.P[pi],st=GC.prov[pi];return Math.min(9,3+Math.floor(p.dev/2)+(st.tr|0));}
function geUsed(pi){return geBl(pi).filter(r=>r[0]!=='fort'&&r[0]!=='aa').length+GC.prov[pi].bq.length;}
function geCost(c,k){return Math.round(GE_B[k][1]*(geFx(c,'build')?.8:1));}
function geCanBuild(c,pi,k){const p=GCM.P[pi],st=GC.prov[pi],N=GC.nat[c];if(!p||!p.land||st.o!==c)return 'Not your province.';if(!GE_B[k])return 'Unknown building.';
  if(st.cv>0&&st.cv>=3)return 'Province in turmoil after its capture.';
  if(k==='mfort'&&!(GE_MFORT.includes(c)&&p.t==='m'))return GE_MFORT.includes(c)?'Needs a mountain province.':'Your nation has no Mountain Fortress.';
  if(k==='farm'&&!p.farm)return 'No farmland here.';if(k==='mine'&&!p.mine)return 'No mining here.';
  if(k==='port'&&(!p.coast||geCount(pi,'port')))return p.coast?'Already has a port.':'Not on the coast.';
  if(k==='refinery'&&!GCM.P.some(q=>q.land&&q.oil&&GC.prov[q.i].o===c)&&(N.e.oil|0)<30)return 'Needs an oil province.';
  const cap=k==='fort'||k==='aa'?3:(k==='factory'||k==='refinery'||k==='power'?3:1);if(geCount(pi,k)+GC.prov[pi].bq.filter(q=>q[1]===k).length>=cap)return 'No more of these here.';
  if(k!=='fort'&&k!=='aa'&&geUsed(pi)>=geSlots(pi))return 'No free building slot ('+geSlots(pi)+').';
  if(N.cash<geCost(c,k))return 'Not enough money.';return '';}
function geBuild(c,pi,k){const e=geCanBuild(c,pi,k);if(e)return e;const N=GC.nat[c];N.cash-=geCost(c,k);GC.prov[pi].bq.push([GC.turn+GE_B[k][2]+(N.e.pw<.6?1:0),k]);return '';}
function geBldDone(){for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(!st.bq.length)continue;const keep=[];for(const q of st.bq){if(q[0]<=GC.turn){geBl(p.i).push([q[1],0]);if(st.o===GC.me)grLog(GE_B[q[1]][0]+' finished in '+p.n+'.',GC.me);}else keep.push(q);}st.bq=keep;}}
// ---------- autonomy and city tiers ----------
const GE_AU=['Direct rule','Local rule','Autonomous'],GE_AUT=[1,.82,.58],GE_AUM=[1,.7,.4],GE_AUU=[0,-9,-20];
function geAutonomy(c,pi,lv){const st=GC.prov[pi];if(!st||st.o!==c)return 'Not your province.';lv=lv|0;if(lv<0||lv>2)return 'Bad level.';st.aut=lv;if(lv>st.au)st.auC=0;else st.auC=3;return '';}
const GE_CITY=['Industrial','Military','Port','Holy city'];
function geCityCost(st){return 900+900*(st.tr|0);}
function geCity(c,pi,focus){const p=GCM.P[pi],st=GC.prov[pi];if(!p||!p.land||st.o!==c)return 'Not your province.';if((st.tr|0)>=2)return 'Already a metropolis.';if(st.ctp)return 'Already growing.';
  if(focus===undefined||focus<0||focus>3)focus=st.cf>=0?st.cf:0;if((st.tr|0)>0&&st.cf!==focus)return 'The city already has a focus ('+GE_CITY[st.cf]+').';if(focus===2&&!p.coast)return 'Needs a coast.';
  const cost=geCityCost(st);if(GC.nat[c].cash<cost)return 'Not enough money.';GC.nat[c].cash-=cost;st.cf=focus;st.ctp=GC.turn+4;return '';}
function geCityDone(){for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.ctp&&st.ctp<=GC.turn){st.ctp=0;st.tr=(st.tr|0)+1;try{const tn=gmTowns(p.i);if(tn[0])tn[0].k=3;if(st.tr>1&&tn[1])tn[1].k=Math.max(tn[1].k,2);}catch(e){}
    const bl=geBl(p.i);if(st.cf===1)bl.push(['fort',0]);if(st.cf===2&&p.coast&&!geCount(p.i,'port'))bl.push(['port',0]);
    if(st.o===GC.me)grLog(p.n+' grew into a '+(st.tr>1?'metropolis':'city')+' ('+GE_CITY[st.cf]+').',GC.me);}}}
// ---------- state ----------
function geNewNat(c,N){return {fuel:120,food:140,man:0,bank:0,bonds:[],def:0,defT:0,tw:0,twT:-9,ration:0,sell:0,oil:0,mer:[],emb:[],ord:[],sanc:0,pw:1,dry:0,starve:0,br:{},op:0,hist:[]};}
function geEnsure(){if(!GC)return;if(!GC.eco){const R=mulberry((GC.seed|0)*2654435761>>>0);
    const cr=[];const types=['crash','shortage','famine','credit','boom'];let t=4+Math.floor(R()*3);const n=GC.maxTurn+10;while(t<n){const ty=types[Math.floor(R()*types.length)];cr.push([t,3+Math.floor(R()*2),ty]);t+=8+Math.floor(R()*5);}
    GC.eco={ph1:R()*6.283,ph2:R()*6.283,cr,cl:{},hold:{},oilIdx:100};}
  for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(!N.e){N.e=geNewNat(c,N);}}try{gmilEnsure();}catch(e){console.error('gmilEnsure',e);}
  for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.bq===undefined)st.bq=[];if(st.au===undefined){st.au=0;st.aut=0;st.auC=0;}if(st.tr===undefined){st.tr=0;st.cf=-1;st.ctp=0;}if(st.lt===undefined)st.lt=0;if(st.sc===undefined)st.sc=0;
    const bl=geBl(p.i);if(!st.mfd&&GE_MFORT.includes(st.o0||st.o)&&p.t==='m'&&!bl.some(r=>r[0]==='mfort'))bl.push(['mfort',0]);st.mfd=1;}
  for(const c of Object.keys(GC.nat)){const N=GC.nat[c],e=N.e;if(e.man<=0&&!e.mi){e.mi=1;e.man=Math.round(geManCap(c)*.6);}}}
function geManCap(c){let t=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)t+=p.tw;return 60+t*14;}
// ---------- world: oil price, crises, chokepoints ----------
function geOilIdx(turn){const E=GC.eco;let v=100+20*Math.sin(.62*turn+E.ph1)+9*Math.sin(1.9*turn+E.ph2);
  for(const k of Object.keys(E.cl))if(E.cl[k]&&['Strait of Hormuz','Suez','Bab-el-Mandeb','Malacca Strait'].includes(GCM.P[+k].n))v+=8;
  if(typeof gpOilDelta==='function')v+=gpOilDelta();   // RG24: cut pipelines lift the price, working Hormuz/Suez bypass lines soften a closed strait
  v+=6*geBlockN();   // RG1: enemy warships sitting in Hormuz / Suez / Bab-el-Mandeb / Malacca / Bosporus push the oil price up
  const cr=geCrisis(turn);if(cr&&cr[2]==='shortage')v+=28;if(cr&&cr[2]==='boom')v+=6;return Math.round(Math.max(55,Math.min(190,v)));}
function geCrisis(turn){for(const c of GC.eco.cr)if(turn>=c[0]&&turn<c[0]+c[1])return c;return null;}
const GE_CRN={crash:'Market crash',shortage:'Oil shortage',famine:'Bad harvests',credit:'Credit crunch',boom:'Trade boom'};
function geIncMul(c){const cr=geCrisis(GC.turn);if(!cr)return 1;const h=geFx(c,'crisis')?.5:1;if(cr[2]==='crash')return 1-.15*h;if(cr[2]==='boom')return 1.1;return 1;}
function geHolder(si){   // who holds a strait: the nation with the most port-province development around it
  const P=GCM.P,sc={};for(const j of P[si].adj){const q=P[j];if(!q.land)continue;const o=GC.prov[j].o;if(GC.nat[o]&&GC.nat[o].dead)continue;if(!(q.port||geCount(j,'port')))continue;sc[o]=(sc[o]||0)+q.dev;}
  let best='',bv=0;for(const o of Object.keys(sc).sort())if(sc[o]>bv||(sc[o]===bv&&bv>0&&o<best)){bv=sc[o];best=o;}return bv>=2?best:'';}
function geStraits(){return GCM.P.filter(p=>p.sea&&p.ck);}
// RG1: warships in a chokepoint zone blockade it for every nation at war with the fleet's owner (counter-play: park your own fleet there to break it)
function geFleetsAt(si){const r=[];for(const a of GC.armies)if(a.fl&&a.at===si&&a.u.length)r.push(a.o);return r;}
function geSeaBlock(si,c){const f=geFleetsAt(si);if(!f.length||f.includes(c))return '';for(const o of f)if(grAtWar(c,o))return o;return '';}
function geBlockaded(si){const f=geFleetsAt(si);if(!f.length)return '';for(const j of GCM.P[si].adj){const q=GCM.P[j];if(!q.land)continue;const o=GC.prov[j].o;if(GC.nat[o]&&!GC.nat[o].dead&&!f.includes(o)){for(const x of f)if(grAtWar(o,x))return x;}}return '';}
function geBlockN(){let n=0;for(const s of geStraits())if(geBlockaded(s.i))n++;return n;}
function geClosed(){let n=0;for(const k of Object.keys(GC.eco.cl))if(GC.eco.cl[k])n++;return n;}
function geSetStrait(c,si,on){const p=GCM.P[si];if(!p||!p.ck)return 'Not a chokepoint.';if(geHolder(si)!==c)return 'You do not hold this strait.';GC.eco.cl[si]=on?c:0;return '';}
// ---------- nation stats ----------
const GE_ST={};   // per-turn cache, not saved
function geOwned(c){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);}
function geBegin(){const P=GCM.P;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;const own=geOwned(c);let sup=8,dem=0,towns=0;
    for(const p of own){const eff=k=>geEff(p.i,k);sup+=eff('power')*14*(geFx(c,'power')?1.25:1);sup+=p.tw*1.2;dem+=eff('factory')*5+eff('refinery')*6+eff('base')*2+eff('airfield')*3+eff('mine')*2;towns+=p.tw;}
    N.e.pw=dem<=0?1:Math.max(.25,Math.min(1,sup/dem));GE_ST[c]={own,towns,pw:N.e.pw,sup,dem};}}
function geProvInc(p,st,c){   // extra province income from buildings, resources and the economy panel; the old basic formula is replaced
  const pw=(GE_ST[c]||{pw:1}).pw,eff=k=>geEff(p.i,k);let b=p.tw*60+(p.oil?60:0)+(p.farm?40:0)+(p.mine?60:0);
  b+=eff('port')*50*(geFx(c,'port')?1.5:1)*(gmilBk(p.i)?.25:1)+eff('factory')*110*pw+eff('mine')*100*pw*(geFx(c,'mine')?1.3:1);
  if(p.mine&&geFx(c,'mine'))b+=18;if(GC.nat[c]&&GC.nat[c].cap===p.i)b*=1.25;
  b*=1+.12*(st.tr|0)*(st.cf===0?1.6:1);if(st.cv>0)b*=.5;if(st.sc>GC.turn)b*=.5;if(st.lt>GC.turn)b*=.8;
  return b*(geFx(c,'tax')?1.05:1)*GE_AUT[st.au|0]*geIncMul(c)*(GC.nat[c].e.sanc?.88:1);}
// ---------- recruiting: manpower, factory discount, speed ----------
function geRecruitTerms(c,pi,k,n){const fac=grNat(c).fac,N=GC.nat[c];let cost=grCost(fac,k)*n;const fa=Math.min(3,geCount(pi,'factory')),disc=1-Math.min(.24,fa*.08)-(geFx(c,'recr')?.1:0)*1;
  const st=GC.prov[pi];let turns=GR_RECRUIT.find(r=>r[0]===k)[2];if(geCount(pi,'base'))turns--;if(N.e.tw)turns--;if(N.e.pw<.6)turns++;if(st.cf===1&&(st.tr|0)>=2)turns--;
  return {cost:Math.round(cost*disc),turns:Math.max(1,turns),man:Math.round(n*(k==='inf'?7:4))};}
function geManRegen(c){let m=0;for(const p of GE_ST[c].own){const st=GC.prov[p.i];m+=p.tw*2.4*GE_AUM[st.au|0]*(1+.06*geCount(p.i,'base'))*(st.cf===1?1+.12*(st.tr|0):1)*(st.cv>0?.5:1);}return m*(geFx(c,'manp')?1.25:1)*(GC.nat[c].e.tw?1.3:1);}
// ---------- the per-turn nation step ----------
function geFuelNeed(c){let f=0;for(const a of GC.armies){if(a.o!==c)continue;let k=0;for(const r of a.u){k+=(r[0]==='tank'||r[0]==='arty'||r[0]==='heli'||r[0]==='aa')?.5:r[0]==='drone'?.25:.1;}f+=k*(a.path.length?1.5:1);}
  for(const p of GE_ST[c].own)f+=geEff(p.i,'airfield')*3*(geFx(c,'air')?.7:1);return f*(geFx(c,'fuel')?.75:1)*(GC.nat[c].e.tw?1.2:1);}
function geArmyVal(c){let v=0;for(const a of GC.armies)if(a.o===c)v+=grArmyVal(a);return v;}
function geTrade(c){   // trade routes between neighbouring provinces and over sea lanes; embargoes, wars, blockaded straits and sanctions cut them
  const P=GCM.P,N=GC.nat[c],E=N.e,tm=Math.max(.35,1-.12*geClosed())*geIncMul(c);let t=0;const own=GE_ST[c].own;
  const ok=(o)=>o===c||(!grAtWar(c,o)&&!E.emb.includes(o)&&!(GC.nat[o].e.emb||[]).includes(c));
  for(const p of own){for(const j of p.adj){const q=P[j];if(q.land){const o=GC.prov[j].o;if(!ok(o)||GC.nat[o].dead)continue;const m=Math.min(p.tw,q.tw);t+=o===c?(i2(p.i,j)?m*4:0):m*4.5;}
      else if(q.sea&&(p.port||geCount(p.i,'port'))&&!gmilBk(p.i)){if(q.ck&&((GC.eco.cl[j]&&GC.eco.cl[j]!==c)||geSeaBlock(j,c)))continue;
        for(const k of q.adj){const r=P[k];if(!r.land||k===p.i)continue;if(!(r.port||geCount(k,'port'))||gmilBk(k))continue;const o=GC.prov[k].o;if(!ok(o)||GC.nat[o].dead)continue;t+=Math.min(p.tw,r.tw)*(o===c?1.5:3);}}}}
  // merchants: each skims a share of a province's trade routes toward you
  for(const m of E.mer){const q=P[m];if(!q||!q.land)continue;t+=(q.tw*5)*(GC.prov[m].o===c?.25:.9);}
  return t*tm*(geFx(c,'trade')?1.35:1)*(E.sanc?.5:1)*.62;}
function i2(a,b){return a<b;}   // count a same-owner pair once
function geHashStr(){if(!GC||!GC.eco)return '';let s='|E'+GC.eco.oilIdx+','+geClosed()+','+geBlockN();for(const c of Object.keys(GC.nat).sort()){const e=GC.nat[c].e;if(!e)continue;s+='|'+c+':'+Math.round(e.fuel)+','+Math.round(e.food)+','+Math.round(e.man)+','+Math.round(e.bank)+','+e.bonds.length+','+e.tw+','+e.def;}
  for(const p of GC.prov)s+=','+(p.bl?p.bl.length:0)+(p.bq?p.bq.length:0)+(p.au|0)+(p.tr|0);return s;}
function geNation(c,R,inc){const N=GC.nat[c],E=N.e,S=GE_ST[c],br={};const own=S.own;const idx=GC.eco.oilIdx;
  br.tax=Math.round(inc||0);let net=inc||0;
  // trade, tolls, merchants' pay
  const tr=geTrade(c);br.trade=Math.round(tr);net+=tr;let toll=0;for(const s of geStraits()){if(geHolder(s.i)===c&&!GC.eco.cl[s.i])toll+=34;}br.toll=toll;net+=toll;
  const mc=E.mer.length*70;br.merch=-mc;net-=mc;
  // sanctions: when three or more nations embargo you, trade halves and smugglers recover part of it
  let eb=0;for(const o of Object.keys(GC.nat)){const O=GC.nat[o];if(!O.dead&&o!==c&&O.e&&O.e.emb.includes(c))eb++;}E.sanc=eb>=3?1:0;
  if(E.sanc){const sm=tr*.45*(geFx(c,'smug')?2:1)*.5;br.smug=Math.round(sm);net+=sm;}else if(geFx(c,'smug')){br.smug=Math.round(tr*.06);net+=br.smug;}
  // oil: wells -> refineries -> fuel; surplus is sold at the world price (or held for a better one)
  let oilP=0;for(const p of own)if(p.oil){const st=GC.prov[p.i];oilP+=12*(st.cv>0?.5:1)*(geFx(c,'oil')?1.3:1)*(1+.5*geEff(p.i,'refinery')*0);}
  const crSh=(geCrisis(GC.turn)||[])[2]==='shortage'?(geFx(c,'crisis')?.88:.75):1;oilP*=crSh;
  let ref=6;for(const p of own)ref+=geEff(p.i,'refinery')*16*S.pw;
  const avail=oilP+E.oil;const made=Math.min(avail,ref);E.oil=avail-made;let fuelIn=made;
  const sellP=9*idx/100*(geFx(c,'oil')?1.06:1);let oilInc=0;
  {const q=E.sell?(idx>=125?E.oil:Math.max(0,E.oil-260)):Math.max(0,E.oil-(idx<90?40:0));if(q>0){oilInc=q*sellP;E.oil-=q;}}
  if(E.oil>400){oilInc+=(E.oil-400)*sellP;E.oil=400;}
  br.oil=Math.round(oilInc);net+=oilInc;
  // fuel: armies and air wings burn it; a shortfall is imported at the world price (if you can pay), else the stock runs dry
  const need=geFuelNeed(c);E.fuel+=fuelIn-need;br.fuelN=Math.round(need*10)/10;
  if(E.fuel<30){const want=Math.min(60,30-E.fuel+20);const cost=want*sellP*1.25*.35;if(N.cash+net>=cost){E.fuel+=want;net-=cost;br.fImp=-Math.round(cost);}}
  E.dry=E.fuel<=0?1:0;E.fuel=Math.max(0,Math.min(400,E.fuel));
  // food: farms and towns feed towns and soldiers; rationing saves 20%
  const fcr=(geCrisis(GC.turn)||[])[2]==='famine'?(geFx(c,'crisis')?.875:.75):1;let fp=0,fc=0;
  for(const p of own){const st=GC.prov[p.i];fp+=(p.tw*2.8+(p.farm?7:0)+6*geEff(p.i,'farm'))*(st.cv>0?.6:1);fc+=p.tw*2.3+st.gar.length*.12;}
  for(const a of GC.armies)if(a.o===c)fc+=a.u.length*.12;fp*=(geFx(c,'food')?1.2:1)*fcr;if(E.ration)fc*=.8;E.food+=fp-fc;br.food=Math.round((fp-fc)*10)/10;
  if(E.food<25){const want=Math.min(50,40-E.food);const cost=want*5;if(N.cash+net>=cost){E.food+=want;net-=cost;br.fImp2=-Math.round(cost);}}
  E.starve=0;if(E.food<0){E.food=0;E.starve=1;}E.food=Math.min(320,E.food);
  // manpower
  E.man=Math.min(geManCap(c),E.man+geManRegen(c)*gmod('nation',c,'manpower',1));
  // upkeep (grows with army size), total war surcharge
  const av=geArmyVal(c);let up=av*.018*(1+av/70000)*(geFx(c,'upkeep')?.88:1)*(E.tw?1.15:1)*gmod('nation',c,'upkeep',1);br.upkeep=-Math.round(up);net-=up;
  // war bonds: due bonds are repaid; a default costs credit and stability
  const keep=[];for(const b of E.bonds){if(b[0]>GC.turn){keep.push(b);continue;}if(N.cash+net>=b[1]){net-=b[1];br.bondPay=(br.bondPay||0)-b[1];}else{E.def++;E.defT=GC.turn+8;keep.push([GC.turn+4,Math.round(b[1]*1.2)]);grLog(GCM.nats.get(c).name+' defaulted on a war bond!',c===GC.me?c:'');}}E.bonds=keep;
  if(E.defT>GC.turn)for(const p of own){const st=GC.prov[p.i];st.un=Math.min(100,st.un+2);}
  // central bank interest (not in a credit crunch)
  const cc=(geCrisis(GC.turn)||[])[2]==='credit';if(E.bank>0&&!cc){const bi=E.bank*(geFx(c,'bank')?.02:.01);br.bank=Math.round(bi);net+=bi;}
  // total war: unrest rises while it lasts
  if(E.tw)for(const p of own){const st=GC.prov[p.i];st.un=Math.min(100,st.un+3.5);}
  if(E.ration)for(const p of own){const st=GC.prov[p.i];st.un=Math.min(100,st.un+3);}
  if(E.starve)for(const p of own){const st=GC.prov[p.i];st.un=Math.min(100,st.un+8);}
  if(net>0)net*=gmod('nation',c,'income',1);N.cash+=net;N.inc=Math.round(net);E.br=br;
  if(N.cash<0){N.cash=0;for(const a of GC.armies)if(a.o===c&&a.u.length>3&&R()<.5){a.u.pop();}}
  E.hist.push([GC.turn,Math.round(net),Math.round(-br.upkeep)]);if(E.hist.length>30)E.hist.shift();}
// ---------- supply state of armies (the battle reads it) ----------
function geArmySupply(a){const P=GCM.P,here=P[a.at];let lvl=0;   // 3 hub, 2 own land, 1 next to own land, 0 none
  if(here.sea)return a.sup>0?0:1;const st=GC.prov[a.at];if(st.o===a.o){lvl=2;if(geCount(a.at,'base')>0)lvl=3;}else{for(const j of here.adj){if(P[j].land&&GC.prov[j].o===a.o){lvl=Math.max(lvl,geCount(j,'base')?2:1);}}}
  if(st.o!==a.o&&lvl===0&&GC.nat[a.o]&&GC.prov[a.at].o!==a.o&&!grAtWar(a.o,st.o)&&st.o!==a.o)lvl=1;   // friendly ground
  return lvl;}
function geSupplyStep(){for(const a of GC.armies){const c=a.o,E=GC.nat[c]&&GC.nat[c].e;if(!E)continue;const lv=geArmySupply(a);if(a.fu===undefined)a.fu=100;
    let da=lv===3?35:lv===2?22:lv===1?8:-9,df=lv===0?-8:(E.dry?-6:(lv===3?30:lv===2?20:8));
    if(E.dry&&lv>0)da=Math.min(da,6);
    for(const r of a.u)r[3]=Math.max(0,Math.min(100,r[3]+da));a.fu=Math.max(0,Math.min(100,a.fu+df));}}
function geArmyFuel(a){return a.fu===undefined?1:a.fu/100;}
function geDry(c){const N=GC.nat[c];return !!(N&&N.e&&N.e.dry);}
function geSortieStock(c,pi,range){   // used by grand3: sorties available to nation c in a battle at province pi
  const P=GCM.P;let n=0;if(!GC.nat[c]||!GC.nat[c].e||GC.nat[c].e.dry)return 0;for(const p of P){if(!p.land||GC.prov[p.i].o!==c)continue;const af=geEff(p.i,'airfield');if(af>0&&grDist(p.i,pi)<=(range||280))n+=Math.round(af*4);}
  return Math.min(n,Math.floor(GC.nat[c].e.fuel/6));}
// ---------- world step, province actions, salvage ----------
function geWorld(){GC.eco.oilIdx=geOilIdx(GC.turn+1);
  // closed straits reopen when the closer no longer holds them
  for(const k of Object.keys(GC.eco.cl)){const h=GC.eco.cl[k];if(h&&geHolder(+k)!==h)GC.eco.cl[k]=0;}}
function geOpinion(c,d){const E=GC.nat[c]&&GC.nat[c].e;if(E)E.op=(E.op|0)+d;}   // world opinion hook for later stages
function geBV(b){let v=0;try{v=grSideVal(grSideUnits(b,'att'))+grSideVal(grSideUnits(b,'def'));}catch(e){}return v;}
function geSalvage(b,win){const after=geBV(b),lost=Math.max(0,(b.v0||0)-after);const w=win==='att'?b.an:b.dn,N=GC.nat[w];if(!N||N.dead||!N.e)return;
  const g=Math.round(lost*.1*(geFx(w,'salv')?2:1));if(g<=0)return;N.cash+=g;N.e.salv=(N.e.salv|0)+g;grLog(GCM.nats.get(w).name+' salvaged $'+g+' from the wrecks at '+GCM.P[b.p].n+'.',w===GC.me?w:'');}
function geCapitalFell(prevO,taker){const pn=GC.nat[prevO],tn=GC.nat[taker];if(!pn||!pn.e||!tn)return;const E=pn.e;const share=geFx(prevO,'vault')?.2:.5;const loot=Math.round(E.bank*share);
  if(loot>0){E.bank-=loot;tn.cash+=loot;grLog(GCM.nats.get(taker).name+' looted $'+loot+' from the central bank of '+GCM.nats.get(prevO).name+'.',taker===GC.me||prevO===GC.me?GC.me:taker);}}
function geCaptured(pi,taker){const st=GC.prov[pi];for(const r of geBl(pi))r[1]=Math.min(95,(r[1]|0)+25);st.bq=[];st.ctp=0;if(st.sc>GC.turn){st.cv=6;}st.sc=0;st.lt=0;}
// orders: bomb (needs an airfield within 3 hops), loot (own army in an enemy province), scorch (own province in danger)
function geAct(c,type,pi){const N=GC.nat[c],E=N.e,p=GCM.P[pi],st=GC.prov[pi];if(!p||!p.land)return 'Pick a land province.';if(E.ord.some(o=>o[0]===type&&o[1]===pi))return 'Already ordered.';
  if(type==='bomb'){if(st.o===c||!grAtWar(c,st.o))return 'Only enemy provinces.';if(!GCM.P.some(q=>q.land&&GC.prov[q.i].o===c&&geEff(q.i,'airfield')>0&&grDist(q.i,pi)<=300))return 'Needs an airfield within range.';if(E.dry||E.fuel<12)return 'Not enough fuel.';if(N.cash<250)return 'Costs $250.';N.cash-=250;E.fuel-=8;}
  else if(type==='loot'){if(st.o===c||!grAtWar(c,st.o))return 'Only enemy provinces.';if(!GC.armies.some(a=>a.o===c&&a.at===pi&&a.u.length))return 'Needs your army in the province.';}
  else if(type==='scorch'){if(st.o!==c)return 'Only your own provinces.';if(p.cap)return 'Not the capital.';if(N.cash<150)return 'Costs $150.';N.cash-=150;}
  else return 'Unknown action.';E.ord.push([type,pi]);return '';}
function geActs(c,R){const N=GC.nat[c],E=N.e;for(const [type,pi] of E.ord){const p=GCM.P[pi],st=GC.prov[pi];if(!p||!p.land)continue;
    if(type==='bomb'){if(st.o===c)continue;const bl=geBl(pi),aa=geEff(pi,'aa')>0?.5:1,tg=bl.filter(r=>r[0]==='factory'||r[0]==='refinery'||r[0]==='power'||r[0]==='mine'||r[0]==='port'||r[0]==='airfield');
      const hit=Math.round(40*aa);if(tg.length){const r=tg[Math.floor(R()*tg.length)];r[1]=Math.min(100,(r[1]|0)+hit);}st.lt=GC.turn+2;st.un=Math.min(100,st.un+4);
      grLog(GCM.nats.get(c).name+' bombed '+p.n+'.',c===GC.me||st.o===GC.me?GC.me:c);geOpinion(c,-1);}
    else if(type==='loot'){if(st.o===c||!GC.armies.some(a=>a.o===c&&a.at===pi&&a.u.length))continue;const g=Math.round((p.tw*60+(p.oil?60:0)+(p.mine?60:0)+(p.farm?40:0))*3);N.cash+=g;st.un=Math.min(100,st.un+30);st.lt=GC.turn+5;
      grLog(GCM.nats.get(c).name+' looted '+p.n+' for $'+g+'.',c===GC.me||st.o===GC.me?GC.me:c);geOpinion(c,-3);}
    else if(type==='scorch'){if(st.o!==c)continue;for(const r of geBl(pi))r[1]=Math.min(100,(r[1]|0)+60);st.sc=GC.turn+5;st.un=Math.min(100,st.un+25);grLog(GCM.nats.get(c).name+' burned the fields and works of '+p.n+'.',c===GC.me?c:'');geOpinion(c,-2);}}
  E.ord=[];}
// ---------- empire orders (the economy panel calls these; the AI calls the same ones) ----------
const GE_BOND=1500;
function geBondCap(c){const N=GC.nat[c];let d=0;for(const b of N.e.bonds)d+=b[1];return {d,cap:2500+Math.max(0,N.inc|0)*5};}
function geBorrow(c){const N=GC.nat[c],E=N.e;if(E.defT>GC.turn)return 'Your credit is frozen after a default.';const k=geBondCap(c);if(k.d+GE_BOND>k.cap)return 'Debt limit reached.';
  const cr=(geCrisis(GC.turn)||[])[2]==='credit';const rate=(cr?.34:.17)*(geFx(c,'bond')?.5:1);if(GC.turn+10>GC.maxTurn+8)return 'The war will be over before it is due.';
  N.cash+=GE_BOND;E.bonds.push([GC.turn+10,Math.round(GE_BOND*(1+rate))]);return '';}
function geRepay(c){const N=GC.nat[c],E=N.e;if(!E.bonds.length)return 'No bonds.';E.bonds.sort((a,b)=>a[0]-b[0]);const b=E.bonds[0];if(N.cash<b[1])return 'Needs $'+b[1]+'.';N.cash-=b[1];E.bonds.shift();return '';}
function geDeposit(c,amt){const N=GC.nat[c];amt=Math.min(amt|0,Math.floor(N.cash));if(amt<=0)return 'No money.';N.cash-=amt;N.e.bank+=amt;return '';}
function geWithdraw(c){const N=GC.nat[c];N.cash+=N.e.bank;N.e.bank=0;return '';}
function geTotalWar(c,on){const E=GC.nat[c].e;if(!!on===!!E.tw)return '';if(on&&GC.turn<E.twT+4)return 'Total war can be switched on again in '+(E.twT+4-GC.turn)+' months.';
  if(on&&!Object.keys(GC.war).some(k=>k.split('|').includes(c)))return 'Only at war.';E.tw=on?1:0;E.twT=GC.turn;return '';}
function geRation(c,on){GC.nat[c].e.ration=on?1:0;return '';}
function geSellMode(c,m){GC.nat[c].e.sell=m?1:0;return '';}
function geEmbargo(c,o,on){const E=GC.nat[c].e;if(o===c||!GC.nat[o])return 'Bad target.';const i=E.emb.indexOf(o);if(on&&i<0){E.emb.push(o);E.emb.sort();}else if(!on&&i>=0)E.emb.splice(i,1);return '';}
function geMerchants(c){return Math.min(3,1+Math.floor(GE_ST[c]?GE_ST[c].own.filter(p=>p.port||geCount(p.i,'port')).length/3:0));}
function geMerchant(c,pi,on){const E=GC.nat[c].e,p=GCM.P[pi];if(!p||!p.land)return 'Pick a land province.';const i=E.mer.indexOf(pi);if(!on){if(i>=0)E.mer.splice(i,1);return '';}if(i>=0)return '';
  if(E.mer.length>=geMerchants(c))return 'No free merchant (you have '+geMerchants(c)+'; more ports, more merchants).';const o=GC.prov[pi].o;if(o!==c&&(grAtWar(c,o)||GC.nat[o].e.emb.includes(c)||E.emb.includes(o)))return 'Trade is closed with them.';E.mer.push(pi);return '';}
// ---------- AI empires: sensible use of everything ----------
function geAI(c,R){const N=GC.nat[c],E=N.e,S=GE_ST[c];if(!S||!S.own.length)return;const P=GCM.P,war=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c));
  // bonds: borrow when broke at war, with time to repay
  if(war.length&&N.cash<700&&GC.turn<GC.maxTurn-10&&E.bonds.length<2)geBorrow(c);
  // central bank: peacetime savings
  if(!war.length&&N.cash>4200)geDeposit(c,Math.floor(N.cash*.4));if(war.length&&N.cash<1000&&E.bank>0)geWithdraw(c);
  // total war: only when at war and stable; stop when the country boils
  let un=0;for(const p of S.own)un+=GC.prov[p.i].un;un/=S.own.length;
  if(war.length&&!E.tw&&un<30&&N.cash<1500&&GC.turn>3)geTotalWar(c,true);else if(E.tw&&(un>46||!war.length))geTotalWar(c,false);
  geRation(c,E.food<20&&E.starve===0&&E.food<10||(E.starve?true:false));
  geSellMode(c,GC.eco.oilIdx<92&&E.oil<200?1:0);
  for(const o of war){if(GC.nat[o]&&!GC.nat[o].dead&&!E.emb.includes(o))geEmbargo(c,o,true);}
  for(const o of E.emb.slice())if(!war.includes(o))geEmbargo(c,o,false);
  // merchants on the richest open neighbour province
  if(E.mer.length<geMerchants(c)&&GC.turn%3===0){let best=-1,bv=0;for(const p of P){if(!p.land)continue;const o=GC.prov[p.i].o;if(o===c||GC.nat[o].dead||grAtWar(c,o))continue;if(!S.own.some(q=>q.adj.includes(p.i)))continue;if(p.tw>bv||(p.tw===bv&&p.i<best)){bv=p.tw;best=p.i;}}if(best>=0)geMerchant(c,best,true);}
  // autonomy: restless conquests calm down, loyal rear provinces go back to direct rule
  for(const p of S.own){const st=GC.prov[p.i];if(st.un>62&&(st.aut|0)<2&&st.o!==st.o0)geAutonomy(c,p.i,(st.aut|0)+1);else if(st.un<22&&(st.aut|0)>0&&st.o===st.o0&&GC.turn%4===0)geAutonomy(c,p.i,(st.aut|0)-1);}
  // straits: close one you hold when it hurts an enemy more than you
  for(const s of geStraits()){const h=geHolder(s.i);if(h!==c)continue;const foes=s.adj.filter(j=>P[j].land&&war.includes(GC.prov[j].o)).length;if(!GC.eco.cl[s.i]&&foes>=2&&!S.own.some(p=>s.adj.includes(p.i)&&p.oil))geSetStrait(c,s.i,true);else if(GC.eco.cl[s.i]&&foes<1)geSetStrait(c,s.i,false);}
  // actions
  if(war.length){let done=0;for(const p of P){if(!p.land||done)continue;const st=GC.prov[p.i];if(!war.includes(st.o))continue;
      if(GC.armies.some(a=>a.o===c&&a.at===p.i&&a.u.length)&&st.cv>0&&R()<.35&&!E.ord.length){if(!geAct(c,'loot',p.i)){done=1;}}}
    if(!done&&N.cash>1200&&E.fuel>60&&!E.ord.length&&GC.turn%2===0){let best=-1,bs=0;for(const p of P){if(!p.land||!war.includes(GC.prov[p.i].o))continue;let sc=geEff(p.i,'factory')*2+geEff(p.i,'refinery')*2.5+geEff(p.i,'airfield')*2+geEff(p.i,'power');if(sc>bs){bs=sc;best=p.i;}}if(best>=0&&bs>=2)geAct(c,'bomb',best);}
    for(const p of S.own){if(p.cap)continue;const st=GC.prov[p.i];const foe=GC.armies.filter(a=>a.at===p.i&&war.includes(a.o)).reduce((s,a)=>s+grArmyVal(a),0);if(foe>0&&foe>grProvDef(p.i)*2.5&&geUsed(p.i)>=3&&R()<.5&&N.cash>300){geAct(c,'scorch',p.i);break;}}}
  // build: the most useful thing the empire lacks
  const cap=P[N.cap]||S.own[0];const front=S.own.slice().sort((a,b)=>b.adj.filter(j=>P[j].land&&war.includes(GC.prov[j].o)).length-a.adj.filter(j=>P[j].land&&war.includes(GC.prov[j].o)).length||a.i-b.i)[0];
  if(N.cash>1100&&GC.turn%1===0){const want=[];
    if(E.pw<.95)want.push(['power',cap.i]);
    for(const p of S.own){if(p.oil&&!geCount(p.i,'refinery')&&E.fuel<150)want.push(['refinery',p.i]);if(p.farm&&!geCount(p.i,'farm')&&E.food<80)want.push(['farm',p.i]);if(p.mine&&!geCount(p.i,'mine'))want.push(['mine',p.i]);if(p.coast&&!(p.port||geCount(p.i,'port')))want.push(['port',p.i]);
      if(p.t==='m'&&GE_MFORT.includes(c)&&!geCount(p.i,'mfort')&&p.adj.some(j=>P[j].land&&war.includes(GC.prov[j].o)))want.push(['mfort',p.i]);}
    if(!S.own.some(p=>geCount(p.i,'airfield')))want.push(['airfield',front.i]);
    want.push(['factory',cap.i],['base',front.i],['aa',cap.i],['factory',cap.i]);
    if(GC.turn>6&&(P[N.cap].tw>0))want.push(['port',cap.i]);
    for(const [k,pi] of want){if(!geCanBuild(c,pi,k)){geBuild(c,pi,k);break;}}}
  // city growth: the capital becomes an industrial or military city once rich
  const cs=GC.prov[N.cap];if(cs&&N.cash>3400&&(cs.tr|0)<2&&!cs.ctp)geCity(c,N.cap,cs.cf>=0?cs.cf:(war.length?1:0));}
// ---------- hooks used by 13-grand.js ----------
function geTurnStart(){geEnsure();geBegin();}
function geAfterProvinces(inc,R){   // called in grFinishTurn after the province loop, instead of the old cash/upkeep line
  const codes=Object.keys(GC.nat).sort();for(const c of codes){const N=GC.nat[c];if(N.dead)continue;geActs(c,R);}
  for(const c of codes){const N=GC.nat[c];if(N.dead)continue;geNation(c,R,inc[c]||0);}
  geBldDone();geCityDone();geSupplyStep();geWorld();}
function geAIAll(){geEnsure();geBegin();const R=mulberry((GC.seed*29+GC.turn*7)|0);for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||!N.ai)continue;try{geAI(c,R);}catch(e){console.error('geAI',c,e);}}}
// ---------- battles: what the empire stock gives the armies ----------
// fuel fraction (0..1) a side starts the battle with: its armies' tanks as they stand on the map (a garrison drinks from the province: full unless the nation is dry)
function geSideFuel(L,pi){let w=0,f=0;for(const s of L){const n=Math.max(1,s.u.length);w+=n;if(s.arr)f+=n*geArmyFuel(s.arr);else f+=n*(geDry(GC.prov[pi].o)?.3:1);}return w?f/w:1;}
