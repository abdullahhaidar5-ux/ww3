// ===== Grand campaign stage 2 (grand2): EMPIRE ECONOMY on the grand map =====
// Owner of: province buildings, trade, oil market, fuel, food, power grid, manpower, upkeep, war bonds, central bank, crises,
// sanctions/smuggling/embargo, total war, rationing, salvage, bombing/loot/scorched earth, autonomy, city chains, economy signatures.
// Everything is deterministic (state + orders + seed): no Math.random / Date; nations and provinces are walked in sorted/index order.
// Battles have NO money in a campaign: they inherit ammo (unit records) and fuel (army `fu`) from here; buildings live in `st.bl`
// (shared with the mirror stage, 13f gmBuildings) so airfields / AA / forts / factories / ports appear pre-built for the defender.
// Spec: orch/reports/grand-strategy.md ("Stage 2"), signatures: orch/SIGNATURES.md.

const GR_MFORT=['IR','RS','AF','KD','DW','KP'];
// key -> [name, cost, turns, needs(p,c)->bool, short label, power draw, what it does]
const GR_BLD={
  base:['Base',400,2,null,'BA',2,'Manpower +40% here; armies in or next to it resupply fully; garrison +1'],
  airfield:['Airfield',600,3,null,'AF',3,'Jets can sortie from here (grand3); appears in the battle for the defender'],
  port:['Port',500,2,p=>p.coast,'PT',1,'Trade +; ships; appears in the battle'],
  factory:['Factory',700,3,null,'FA',5,'+90 money a turn (needs power); recruits here cost 15% less; appears in the battle'],
  refinery:['Refinery',700,3,p=>p.oil,'RF',4,'Oil here yields full fuel and sells 25% higher'],
  power:['Power plant',600,3,null,'PW',0,'Feeds the grid (+14); blackouts slow factories and production'],
  aa:['Air defence',450,2,null,'AA',1,'SAM sites in the battle for the defender; shields the province from bombing'],
  farm:['Farms',300,2,p=>p.farm||p.t==='f',"FM",0,'Food +6, money +30'],
  mine:['Mines',450,2,p=>p.mine,'MN',1,'Money +70'],
  mfort:['Mountain Fortress',800,4,(p,c)=>p.t==='m'&&GR_MFORT.includes(c),'MF',0,'Pre-built fortress for the defender in this province\'s battle']
};
const GR_BKEYS=Object.keys(GR_BLD);
const GR_CITY={ind:['Industrial','factory income +45/tier'],mil:['Military','manpower +25%/tier, one more fort in the battle'],port:['Port city','trade +12/tier'],holy:['Holy city','unrest -6/tier']};
const GR_NODES=['North America','South America','Europe & Russia','Middle East & Africa','South Asia','East Asia & Oceania'];
const GR_CRISES=[['Oil shock','Oil costs 45% more for everyone'],['Banking panic','War-bond interest doubles; bank reserves earn nothing'],['Harvest failure','Food output -25% everywhere'],['Trade slump','Trade income -30% everywhere']];
const GR_VEH={tank:1,arty:1,aa:1,heli:1,champ:1};
// economy signatures (orch/SIGNATURES.md, kind E): small modifiers, ~ +4-5% of empire strength each, none shared in kind
const GR_SIG={
  US:{bondK:.5},IL:{techK:60},UA:{foodK:.3},RU:{salvK:2},IR:{smugFree:1},SA:{oilSellK:.25},AE:{tradeK:.25},PK:{remitK:.08},IN:{mpK:.3},
  CN:{facK:.4,recK:.08},KP:{autarky:1},KR:{bankR:.03},EG:{tollK:70},JP:{upkK:-.12},GB:{merch:1},FR:{powK:.6},DE:{bcostK:-.2},AZ:{pipe:1,oilOutK:.15},
  AU:{mineK:.5},PH:{coastK:.04},BR:{fuelFarm:3},VE:{oilOutK:.35,oilSellK:-.2},MX:{bspd:1},CA:{royK:.05},DZ:{gasK:40},MA:{phosK:1},GR:{portK:.3},
  AR:{farmK:.25},CO:{coffeeK:45},ZA:{goldK:1},TH:{foodK:.25,noRat:1},SE:{facK:.2,noTw:1},KZ:{oilK:.1,mpK:.1},CL:{mineK:.35,tradeK:-.1}
};
function grSig(c){return GR_SIG[c]||{};}

// ---------- state ----------
function grEcoInit(){if(!GC||GC.w&&GC.w.v===2)return;const R=grRng(GC.seed*31+5);
  GC.w={v:2,oil:100,cr:[],cl:{}};GC.op=GC.op||{};
  let t=4+Math.floor(R()*4);while(t<GC.maxTurn+6){const len=3+Math.floor(R()*3);GC.w.cr.push([t,len,Math.floor(R()*4)]);t+=len+5+Math.floor(R()*5);}
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];Object.assign(N,{fuel:60,food:100,mp:30,debt:0,bank:0,tw:0,rat:0,sell:.5,smug:0,emb:[],mer:{},def:0,fo:0,fam:0,px:1,rep:{}});GC.op[c]=0;}
  for(const st of GC.prov){st.bq=null;st.aut=0;st.ad=0;st.at=0;st.ct=0;st.cty='';st.sc=0;st.bm=0;st.lo=0;}
  grEcoSetPrice();}
function grEcoHash(){if(!GC||!GC.w)return '';let s='|E'+GC.w.oil;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];s+='|'+c+Math.round(N.fuel)+','+Math.round(N.food)+','+Math.round(N.mp)+','+Math.round(N.debt)+','+Math.round(N.bank)+','+N.tw+N.rat;}
  for(const st of GC.prov)s+=(st.bl?st.bl.length:0)+(st.bq?st.bq[0][0]+st.bq[1]:'')+st.aut+st.ct+st.sc+st.bm;return s;}
function grHas(pi,k){const st=GC.prov[pi];if(!st.bl&&!(GCM.P[pi].land))return false;return gmBuildings(pi).some(r=>r[0]===k&&!(r[1]>=100));}
function grCount(c,k){let n=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&grHas(p.i,k))n++;return n;}
function grOwned(c){const L=[];for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)L.push(p);return L;}
const GR_NC=[[370,340],[460,880],[1160,260],[1200,700],[1600,560],[2050,600]];
function grNodeOf(p){if(p.nd!=null)return p.nd;let b=0,bd=1e12;GR_NC.forEach((q,i)=>{const d=(q[0]-p.x)**2+(q[1]-p.y)**2;if(d<bd){bd=d;b=i;}});return p.nd=b;}

// ---------- oil market, crises, straits ----------
function grPriceAt(t){const ph=(GC.seed%13)*.7;let v=100+26*Math.sin(.62*t+ph)+12*Math.sin(1.7*t+ph*1.9);return v;}
function grCrisisAt(t){for(const c of GC.w.cr)if(t>=c[0]&&t<c[0]+c[1])return c[2];return -1;}
function grClosedN(){return Object.keys(GC.w.cl).length;}
function grEcoSetPrice(){let v=grPriceAt(GC.turn);if(grCrisisAt(GC.turn)===0)v*=1.45;v*=1+Math.min(.4,.08*grClosedN());GC.w.oil=Math.round(v);}
function grStraitOwner(si){const cnt={};for(const j of GCM.P[si].adj){const q=GCM.P[j];if(!q.land)continue;const o=GC.prov[j].o;cnt[o]=(cnt[o]||0)+1;}let best=null,bn=0,tie=false;for(const o of Object.keys(cnt).sort()){if(cnt[o]>bn){best=o;bn=cnt[o];tie=false;}else if(cnt[o]===bn)tie=true;}return tie?null:best;}
function grStraits(){const L=[];for(const p of GCM.P)if(p.sea&&p.ck)L.push(p.i);return L;}
function grStraitClose(c,si,on){const p=GCM.P[si];if(!p||!p.ck)return 'Not a chokepoint.';if(on){if(grStraitOwner(si)!==c)return 'You do not hold this strait.';GC.w.cl[si]=c;grLog(GCM.nats.get(c).name+' closed '+p.n+' to shipping!',c);}else{if(GC.w.cl[si]!==c)return '';delete GC.w.cl[si];grLog(GCM.nats.get(c).name+' reopened '+p.n+'.',c);}grEcoSetPrice();return '';}

// ---------- buildings, city chains, autonomy ----------
function grBCost(c,k){return Math.round(GR_BLD[k][1]*(1+(grSig(c).bcostK||0)));}
function grBTurns(c,k){return Math.max(1,GR_BLD[k][2]-(grSig(c).bspd||0));}
function grBuild(c,pi,k){const st=GC.prov[pi],p=GCM.P[pi],B=GR_BLD[k],N=GC.nat[c];if(!B||!st||!p.land)return 'No such building.';if(st.o!==c)return 'Not your province.';if(st.bq)return 'Already building here.';
  if(grHas(pi,k))return 'Already built.';if(B[3]&&!B[3](p,c))return k==='mfort'?'Only mountain provinces of Iran, the Mountain Shias, Afghanistan, Kurdistan, the Coffee Shias and North Korea.':'This province cannot have it.';
  const cost=grBCost(c,k);if(N.cash<cost)return 'Not enough money.';N.cash-=cost;st.bq=[k,grBTurns(c,k)];return '';}
function grCityUp(c,pi,ty){const st=GC.prov[pi],p=GCM.P[pi],N=GC.nat[c];if(!st||st.o!==c)return 'Not your province.';if(st.bq)return 'Already building here.';if(!GR_CITY[ty])return 'No such city type.';
  if(st.ct>0&&st.cty!==ty)return 'This city is already '+GR_CITY[st.cty][0]+'.';if(st.ct>=3)return 'Fully grown.';if(st.ct>=Math.max(1,p.tw-1)+(p.cap?1:0))return 'Too few towns to grow further.';
  const cost=Math.round(300*(st.ct+1)*(1+(grSig(c).bcostK||0)));if(N.cash<cost)return 'Not enough money.';N.cash-=cost;st.bq=['city:'+ty,2];return '';}
function grAutonomy(c,pi,lvl){const st=GC.prov[pi];if(!st||st.o!==c)return 'Not your province.';lvl=Math.max(0,Math.min(3,lvl|0));if(lvl===st.aut&&!st.ad)return '';if(lvl>st.aut){st.aut=lvl;st.ad=0;return '';}st.at=lvl;st.ad=3;return '';}
function grEcoBuilt(c,pi,key){const st=GC.prov[pi],bl=gmBuildings(pi);
  if(key.startsWith('city:')){const ty=key.slice(5);st.ct++;st.cty=ty;const add=ty==='mil'?'fort':ty==='ind'?'factory':ty==='port'&&GCM.P[pi].coast?'port':null;if(add&&!bl.some(r=>r[0]===add))bl.push([add,0]);grLog(GCM.P[pi].n+' grew into a '+GR_CITY[ty][0].toLowerCase()+' city (tier '+st.ct+').',c===GC.me?c:'');return;}
  bl.push([key,0]);grLog(GR_BLD[key][0]+' finished in '+GCM.P[pi].n+'.',c===GC.me?c:'');}

// ---------- per-province income and unrest hooks (called from grFinishTurn) ----------
function grEcoBase(p,st){const c=st.o,S=grSig(c),N=GC.nat[c]||{px:1},has=k=>grHas(p.i,k);
  if(st.sc>0)return 0;
  let b=p.tw*60+(p.oil?80:0)+(p.farm?40*(1+(S.farmK||0)):0)+(p.mine?60*(1+(S.mineK||0)):0)+(p.port?40:0);
  if(S.royK&&(p.oil||p.mine))b*=1+S.royK;
  const pk=N.px==null?1:N.px;
  if(has('factory'))b+=90*(1+(S.facK||0))*pk*(N.tw?1.2:1);if(has('mine'))b+=70*(1+(S.mineK||0));if(has('farm'))b+=30;if(has('port'))b+=40;if(has('refinery'))b+=40;
  if(st.ct>0){b*=1+.12*st.ct;if(st.cty==='ind')b+=45*st.ct*(N.px||1);}
  if(S.coastK&&p.coast)b*=1+S.coastK;if(S.gasK&&p.oil)b+=S.gasK;if(S.portK&&(p.port||has('port')))b+=40*S.portK;
  b*=1-.2*st.aut;if(st.bm>0)b*=.5;
  return b;}
function grEcoUn(p,st,c){const N=GC.nat[c]||{};let u=-6*st.aut+(st.ad>0?6:0);if(N.tw&&!grSig(c).noTw)u+=4;if(N.rat&&!grSig(c).autarky)u+=3;if(N.fam>0)u+=8;if((N.px||1)<.5)u+=3;if(N.def>0)u+=6;
  if(st.sc>0)u+=20;if(st.lo>0)u+=20;if(st.ct>0&&st.cty==='holy')u-=6*st.ct;if(N.smug&&p.port&&!grSig(c).smugFree)u+=3;return u;}

// ---------- per-nation pre-pass: power grid ----------
function grEcoPre(){for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;const S=grSig(c);let sup=0,dem=0,tw=0;
    for(const p of GCM.P){if(!p.land||GC.prov[p.i].o!==c)continue;const st=GC.prov[p.i];tw+=p.tw;
      if(grHas(p.i,'power'))sup+=14*(1+(S.powK||0));
      for(const k of GR_BKEYS)if(grHas(p.i,k))dem+=GR_BLD[k][5];if(st.ct>0&&st.cty==='ind')dem+=2*st.ct;}
    sup+=tw*1.5;dem+=tw*1;N.px=dem<=0?1:Math.min(1,sup/dem);}}

// ---------- trade ----------
function grTradeAll(){const V=[],W={},pool=[];for(let n=0;n<6;n++){W[n]={};pool[n]=0;}
  const crisis=grCrisisAt(GC.turn),cl=GC.w.cl,closers=Object.keys(cl).map(k=>cl[k]);
  for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i],c=st.o;if(!GC.nat[c]||GC.nat[c].dead)continue;
    if(GC.armies.some(a=>a.at===p.i&&a.o!==c&&grAtWar(a.o,c)&&a.u.length))continue;   // blockaded / occupied: no trade
    if(st.sc>0)continue;const link=Math.min(3,p.adj.filter(j=>GCM.P[j].land&&GC.prov[j].o===c).length);
    let v=(p.tw*8+(p.port?14:0)+(grHas(p.i,'port')?10:0)+(st.ct>0&&st.cty==='port'?12*st.ct:0))*(1+.15*link)*(1-.2*st.aut);
    const n=grNodeOf(p);pool[n]+=v;const N=GC.nat[c];const mer=(N.mer[n]||0);W[n][c]=(W[n][c]||0)+v*(1+.5*mer);}
  const out={};
  for(let n=0;n<6;n++){let tot=0;for(const c of Object.keys(W[n]))tot+=W[n][c];if(tot<=0)continue;
    for(const c of Object.keys(W[n]).sort()){out[c]=(out[c]||0)+pool[n]*.8*W[n][c]/tot;}}
  for(const c of Object.keys(out)){const N=GC.nat[c],S=grSig(c);let f=1+(S.tradeK||0);
    // sanctions: each embargo against you; smuggling wins part of it back
    const ne=Object.keys(GC.nat).filter(o=>GC.nat[o].emb.includes(c)).length;let lost=0;if(ne>0&&!S.autarky){lost=Math.min(.65,.25*ne);f*=1-lost;if(N.smug){const rec=S.smugFree?.8:.5;f*=1+lost*rec/(1-lost);}}
    f*=1-.05*N.emb.length;
    for(const x of closers)if(x!==c)f*=1-(grAtWar(x,c)?.12:.04);
    if(crisis===3)f*=.7;
    out[c]=out[c]*Math.max(.35,f);if(N.smug&&!S.smugFree&&ne>0)out[c]*=.94;
    if(S.remitK)out[c]=out[c];}
  return out;}

// ---------- the nation pass (replaces the old one-line cash update) ----------
function grEcoNations(inc,R){grEcoSetPrice();const price=GC.w.oil,crisis=grCrisisAt(GC.turn),trade=grTradeAll();const codes=Object.keys(GC.nat).sort();
  const R2=grRng(GC.seed*29+GC.turn*5);
  if(GC.w.cr.some(x=>x[0]===GC.turn))grLog('ECONOMIC CRISIS: '+GR_CRISES[crisis][0]+' - '+GR_CRISES[crisis][1]+'.',GC.me||'');
  for(const si of Object.keys(GC.w.cl)){const o=GC.w.cl[si];if(grStraitOwner(+si)!==o||GC.nat[o].dead){delete GC.w.cl[si];grLog('The strait of '+GCM.P[+si].n+' reopened.',o);}}
  // province side: buildings finish, autonomy changes, decay of bombing / loot / scorched earth, city chains
  for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(!GC.nat[st.o]||GC.nat[st.o].dead){st.bq=null;continue;}
    if(st.bq){st.bq[1]--;if(st.bq[1]<=0){grEcoBuilt(st.o,p.i,st.bq[0]);st.bq=null;}}
    if(st.ad>0){st.ad--;if(st.ad===0)st.aut=st.at;}if(st.bm>0)st.bm--;if(st.lo>0)st.lo--;if(st.sc>0)st.sc--;}
  for(const c of codes){const N=GC.nat[c];if(N.dead)continue;const S=grSig(c),mine=grOwned(c),rep=N.rep={};
    const inc0=Math.round(inc[c]||0);rep.tax=inc0;let cash=0;
    // trade
    let tr=Math.round(trade[c]||0);rep.trade=tr;cash+=tr;
    if(S.tollK){let k=0;for(const si of grStraits())if(grStraitOwner(si)===c)k++;rep.toll=k*S.tollK;cash+=rep.toll;}
    if(S.remitK){rep.remit=Math.round(inc0*S.remitK);cash+=rep.remit;}
    if(S.techK){let k=0;for(const p of mine)if(grHas(p.i,'airfield')||grHas(p.i,'aa'))k++;rep.tech=k*S.techK;cash+=rep.tech;}
    if(S.coffeeK){let k=0;for(const p of mine)if((p.mine||p.farm)&&p.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===c&&(GCM.P[j].mine||GCM.P[j].farm)))k++;rep.coffee=Math.floor(k/2)*S.coffeeK;cash+=rep.coffee;}
    // oil: output, refining, export
    let out=0,fuelP=0,oilInc=0;const tw=N.tw?1.2:1;
    for(const p of mine){if(!p.oil)continue;const st=GC.prov[p.i];if(st.sc>0||GC.armies.some(a=>a.at===p.i&&a.o!==c&&grAtWar(a.o,c)))continue;const o=12*(1+(S.oilOutK||0)+(S.oilK||0)),ref=grHas(p.i,'refinery');out+=o;
      fuelP+=o*(1-N.sell)*(ref?1:.6);oilInc+=o*N.sell*(price/100)*8*(ref?1.25:1)*(1+(S.oilSellK||0));}
    rep.oil=Math.round(oilInc);cash+=rep.oil;
    if(S.fuelFarm){let k=0;for(const p of mine)if(p.farm)k++;fuelP+=k*S.fuelFarm;}
    // fuel use: armies on the map (vehicles drink, men sip) and what the tanks of the nation can still buy
    let cons=0,units=0,av=0;for(const a of GC.armies){if(a.o!==c)continue;for(const r of a.u){units++;cons+=GR_VEH[r[0]]?.5:.12;}av+=grArmyVal(a);}
    cons*=tw;let fuel=N.fuel+fuelP-cons;
    if(fuel<40){const need=40-fuel,cost=Math.round(need*price*.05);const buy=Math.min(need,N.cash>0?Math.floor((N.cash+cash)/(price*.05)):0);fuel+=buy;cash-=Math.round(buy*price*.05);rep.fuelBuy=Math.round(buy*price*.05);}
    if(fuel<=0){fuel=0;if(!N.fo&&c===GC.me)grLog('OUT OF FUEL! Your armies crawl and no jets can fly until you find fuel.',c);N.fo=1;}else N.fo=0;
    N.fuel=Math.min(300,fuel);rep.fuelP=Math.round(fuelP);rep.fuelC=Math.round(cons);
    // food
    let fp=0,fc=0;for(const p of mine){const st=GC.prov[p.i];if(st.sc>0)continue;fp+=4+(p.farm?6:0)+(p.t==='f'?3:0)+(grHas(p.i,'farm')?6:0);fc+=p.tw*2;}
    fp*=1+(S.foodK||0);if(crisis===2&&!S.phosK)fp*=.75;fc+=units*.12;fc*=(N.rat?.75:1)*(N.tw?1.1:1);if(S.phosK)fp*=1.1;
    N.food+=fp-fc;rep.foodP=Math.round(fp);rep.foodC=Math.round(fc);
    if(N.food<20){const want=Math.min(30,20-N.food+Math.max(0,fc-fp)),pay=Math.min(Math.round(want*2.5),Math.max(0,Math.floor(N.cash+cash-Math.round(inc0*0)))),got=pay/2.5;N.food+=got;cash-=Math.round(pay);rep.foodBuy=Math.round(pay);}
    if(N.food>250){if(S.foodK>=.3){const sold=Math.round((N.food-250)*.5);cash+=sold;rep.grain=sold;}N.food=250;}
    if(N.food<0){N.food=0;N.fam=2;if(c===GC.me)grLog('FAMINE! Food ran out - unrest rises. Ration or secure farmland.',c);for(const p of mine){const st=GC.prov[p.i];if(st.gar.length>2&&R2()<.15)st.gar.pop();}}else if(N.fam>0)N.fam--;
    // manpower
    let mg=0;for(const p of mine){const st=GC.prov[p.i];if(st.sc>0)continue;let m=p.tw*.8*(1-.2*st.aut);if(grHas(p.i,'base'))m*=1.4;if(st.ct>0&&st.cty==='mil')m*=1+.25*st.ct;mg+=m;}
    mg*=(N.tw?1.5:1)*(1+(S.mpK||0));const mcap=60+mine.length*10;N.mp=Math.min(mcap,N.mp+mg);rep.mp=Math.round(mg);
    // upkeep grows with army size (+ garrisons); the rest of the empire's costs
    let gv=0;for(const p of mine)gv+=grProvDef(p.i);let up=(av*.008*(1+av/60000)+gv*.003)*(1+(S.upkK||0))*(N.tw?1.15:1);
    let closeCost=0;for(const si of Object.keys(GC.w.cl))if(GC.w.cl[si]===c)closeCost+=40;
    rep.up=Math.round(up);rep.close=closeCost;
    // war bonds, default, central bank
    const rate=.03*(S.bondK==null?1:S.bondK)*(crisis===1?2:1);let intr=Math.round(N.debt*rate);rep.int=intr;
    let net=inc0+cash-Math.round(up)-closeCost-intr;
    N.cash+=net;
    if(N.def>0)N.def--;
    if(N.cash<0){if(N.debt>0&&intr>0){N.def=3;N.debt=Math.round(N.debt*.75);GC.op[c]-=3;grLog(GCM.nats.get(c).name+' defaulted on its war bonds!',c===GC.me?c:'');}
      N.cash=0;for(const a of GC.armies)if(a.o===c&&a.u.length>3&&R()<.5){a.u.pop();}}
    if(N.def>0){const pen=Math.round(Math.max(0,net)*.15);N.cash-=pen;net-=pen;if(N.cash<0)N.cash=0;}
    const br=crisis===1?0:(S.bankR||.01);if(N.bank>0)N.bank=Math.round(N.bank*(1+br));
    if(N.smug&&N.smug>0)GC.op[c]-=(S.smugFree?0:1);
    if(N.tw)GC.op[c]-=0;
    N.inc=net;rep.net=net;
    // armies: ammo and fuel come from the stock and the province infrastructure; cut-off armies starve
    for(const a of GC.armies){if(a.o!==c)continue;if(a.fu==null)a.fu=100;const sup=a.sup===0||a.sup==null;const P=GCM.P[a.at];
      const depot=!P.sea&&(GC.prov[a.at].o===c&&grHas(a.at,'base')||P.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===c&&grHas(j,'base')));
      let am=depot?100:(sup?(N.fo?10:30):0);for(const r of a.u)if(am>0&&r[3]<100)r[3]=Math.min(100,r[3]+am);
      let vh=0;for(const r of a.u)if(GR_VEH[r[0]])vh++;const burn=a.path.length?10+10*vh/Math.max(1,a.u.length):1+2*vh/Math.max(1,a.u.length);
      a.fu=Math.max(0,a.fu-burn);if(depot||(sup&&!N.fo))a.fu=Math.min(100,a.fu+(depot?100:35));}}
  // sanctions bookkeeping for the log is left to grand4 (diplomacy); opinion lives in GC.op
}
function grEcoSlow(a){const N=GC.nat[a.o];return !!(N&&N.fo||(a.fu!=null&&a.fu<15))&&GC.turn%2===0;}   // out of fuel: half speed (every other turn the army does not advance)

// ---------- player / AI orders on the economy ----------
function grBorrow(c,amt){const N=GC.nat[c];amt=amt||1000;if(N.def>0)return 'You are in default.';const cap=Math.min(8000,1500+Math.round((N.rep&&N.rep.tax||600)*6));if(N.debt+amt>cap)return 'Bond limit reached ($'+cap+').';N.debt+=amt;N.cash+=amt;return '';}
function grRepay(c,amt){const N=GC.nat[c];amt=Math.min(amt||1000,N.debt);if(amt<=0)return 'No debt.';if(N.cash<amt)return 'Not enough money.';N.cash-=amt;N.debt-=amt;return '';}
function grBank(c,amt){const N=GC.nat[c];if(amt>0){amt=Math.min(amt,Math.floor(N.cash));if(amt<=0)return 'No cash.';N.cash-=amt;N.bank+=amt;}else{amt=Math.min(-amt,N.bank);N.bank-=amt;N.cash+=amt;}return '';}
function grMerchant(c,node,d){const N=GC.nat[c];const tot=Object.keys(N.mer).reduce((s,k)=>s+N.mer[k],0),max=grMerchants(c);if(d>0){if(tot>=max)return 'All merchants are sent.';N.mer[node]=(N.mer[node]||0)+1;}else{if(!N.mer[node])return '';N.mer[node]--;if(!N.mer[node])delete N.mer[node];}return '';}
function grMerchants(c){return 2+Math.floor(grOwned(c).length/10)+(grSig(c).merch||0);}
function grEmbargo(c,o,on){const N=GC.nat[c];if(o===c||!GC.nat[o])return '';const i=N.emb.indexOf(o);if(on&&i<0){if(N.emb.length>=3)return 'At most three embargoes.';N.emb.push(o);N.emb.sort();grLog(GCM.nats.get(c).name+' embargoed '+GCM.nats.get(o).name+'.',c);}else if(!on&&i>=0)N.emb.splice(i,1);return '';}
function grTotalWar(c,on){const N=GC.nat[c];if(on&&grSig(c).noTw)return 'Your industry stays on a peace footing.';N.tw=on?1:0;return '';}
function grRation(c,on){GC.nat[c].rat=on?1:0;}
function grSellOil(c,s){GC.nat[c].sell=s;}
function grSmuggle(c,on){GC.nat[c].smug=on?1:0;}
function grNear(c,pi,d,k){const P=GCM.P;let fr=[pi];const seen=new Set([pi]);for(let i=0;i<=d;i++){for(const u of fr)if(P[u].land&&GC.prov[u].o===c&&grHas(u,k))return true;const nx=[];for(const u of fr)for(const j of P[u].adj)if(!seen.has(j)){seen.add(j);nx.push(j);}fr=nx;}return false;}
function grBomb(c,pi){const st=GC.prov[pi],N=GC.nat[c];if(!st||!GCM.P[pi].land||!grAtWar(c,st.o))return 'Only enemy provinces.';if(st.bm>0)return 'Already bombed.';if(!grNear(c,pi,3,'airfield'))return 'You need an airfield within three provinces.';if(N.fo)return 'No fuel for the bombers.';
  if(N.cash<250)return 'Not enough money ($250).';N.cash-=250;st.bm=3;if(grHas(pi,'aa')){st.bm=1;}const bl=gmBuildings(pi);const t=bl.filter(r=>r[0]!=='fort');if(t.length&&!grHas(pi,'aa')){const r=t[(GC.turn+pi)%t.length];r[1]=Math.min(100,(r[1]||0)+50);}
  GC.op[c]-=1;grLog(GCM.nats.get(c).name+' bombed '+GCM.P[pi].n+'.',c===GC.me||st.o===GC.me?GC.me:c);return '';}
function grLoot(c,pi){const st=GC.prov[pi],p=GCM.P[pi];if(!st||!p.land)return 'No such province.';if(st.lo>0)return 'Already looted.';
  const here=GC.armies.some(a=>a.at===pi&&a.o===c&&a.u.length),ok=(st.o!==c&&grAtWar(c,st.o)&&here)||(st.o===c&&st.o0!==c&&st.cv>0);if(!ok)return 'Loot needs your army in an enemy province, or a province you just conquered.';
  const gain=Math.round((p.tw*60+(p.oil?80:0)+(p.mine?60:0))*2.5);GC.nat[c].cash+=gain;st.lo=4;st.un=Math.min(100,st.un+30);st.cv=Math.max(st.cv,2);GC.op[c]-=2;grLog(GCM.nats.get(c).name+' looted '+p.n+' for $'+gain+'.',c===GC.me?c:'');return '';}
function grScorch(c,pi){const st=GC.prov[pi],p=GCM.P[pi];if(!st||st.o!==c)return 'Not your province.';if(st.sc>0)return 'Already burned.';st.sc=6;st.un=Math.min(100,st.un+20);st.bq=null;
  const bl=gmBuildings(pi);for(let i=bl.length-1;i>=0;i--)if(!['fort','mfort','aa'].includes(bl[i][0])&&bl[i][0]!=='port')bl.splice(i,1);GC.op[c]-=1;grLog(GCM.nats.get(c).name+' burned '+p.n+' - scorched earth.',c===GC.me?c:'');return '';}

// ---------- capture, loot of the central bank, salvage ----------
function grEcoLoot(prev,taker){const A=GC.nat[prev],B=GC.nat[taker];if(!A||!B)return;const bank=grSig(prev).goldK?0:Math.round(A.bank*.6),cash=Math.round(A.cash*.15);A.bank-=bank;A.cash-=cash;B.cash+=bank+cash;
  if(bank+cash>0)grLog(GCM.nats.get(taker).name+' seized $'+(bank+cash)+' from the central bank of '+GCM.nats.get(prev).name+'.',prev===GC.me||taker===GC.me?GC.me:'');}
function grEcoCaptured(pi,taker){const st=GC.prov[pi];st.bq=null;st.sc=0;st.bm=0;st.ad=0;st.aut=Math.max(st.aut,1);}
function grEcoSalvage(b){const v1=grSideVal(grSideUnits(b,'att'))+grSideVal(grSideUnits(b,'def')),lost=Math.max(0,(b.v0||v1)-v1);if(lost<=0)return 0;
  return lost;}
function grEcoSalvagePay(b,win,lost){if(lost<=0)return;const w=win==='att'?b.an:b.dn,N=GC.nat[w];if(!N)return;const gain=Math.round(lost*.12*(grSig(w).salvK||1));N.cash+=gain;
  if(gain>0)grLog(GCM.nats.get(w).name+' salvaged $'+gain+' from the wrecks at '+GCM.P[b.p].n+'.',w===GC.me?w:'');}

// ---------- AI empires use all of it ----------
function grEcoAI(c,R){const N=GC.nat[c];if(N.dead||!N.ai)return;const mine=grOwned(c);if(!mine.length)return;const P=GCM.P,S=grSig(c);
  const wars=Object.keys(GC.war).filter(k=>k.split('|').includes(c)).map(k=>k.split('|').find(x=>x!==c));const sorted=GC.turn;
  // policies
  const wasTw=N.tw;grTotalWar(c,wars.length>0&&N.cash<900&&!S.noTw&&mine.filter(p=>GC.prov[p.i].un>55).length<mine.length/3);
  grRation(c,N.food<25&&N.food+0<60&&(N.rep.foodC||0)>(N.rep.foodP||0));
  const price=GC.w.oil;N.sell=(N.fuel<45||(N.rep.fuelC||0)>(N.rep.fuelP||0)*1.4)?0:price>115?1:.5;
  const ne=Object.keys(GC.nat).filter(o=>GC.nat[o].emb.includes(c)).length;N.smug=ne>0?1:0;
  // embargo the biggest enemy (costs a little trade; hurts them)
  for(const w of wars.slice().sort()){if(N.emb.length<2&&!GC.nat[w].dead)grEmbargo(c,w,true);}
  for(const o of N.emb.slice())if(!wars.includes(o))grEmbargo(c,o,false);
  // straits: close a held one while at war, open it at peace
  for(const si of grStraits()){if(grStraitOwner(si)===c&&wars.length&&!GC.w.cl[si]&&N.cash>600)grStraitClose(c,si,true);else if(GC.w.cl[si]===c&&!wars.length)grStraitClose(c,si,false);}
  // merchants to the node where the nation trades most
  const val={};for(const p of mine){const n=grNodeOf(p);val[n]=(val[n]||0)+p.tw;}const best=Object.keys(val).sort((a,b)=>val[b]-val[a]||a-b)[0];
  if(best!=null){N.mer={};const m=grMerchants(c);if(m>0)N.mer[best]=m;}
  // bonds: borrow when broke at war, repay when rich
  if(N.cash<250&&wars.length&&N.debt<2500)grBorrow(c,1000);else if(N.debt>0&&N.cash>2600)grRepay(c,Math.min(N.debt,1000));
  if(N.cash>3400)grBank(c,800);else if(N.cash<200&&N.bank>0)grBank(c,-Math.min(N.bank,600));
  // autonomy: calm restless conquests, tighten again when calm
  for(const p of mine){const st=GC.prov[p.i];if(p.i===N.cap)continue;if((st.cv>0||st.un>60)&&st.aut<2)grAutonomy(c,p.i,2);else if(st.un<22&&st.aut>0&&!st.ad)grAutonomy(c,p.i,st.aut-1);}
  // scorched earth: a poor province about to fall to a much bigger army
  for(const p of mine){if(p.i===N.cap)continue;const st=GC.prov[p.i];if(st.sc>0)continue;let en=0;for(const j of p.adj)for(const a of GC.armies)if(a.at===j&&a.o!==c&&grAtWar(a.o,c))en+=grArmyVal(a);
    const mineV=grProvDef(p.i)+GC.armies.filter(a=>a.at===p.i&&a.o===c).reduce((s,a)=>s+grArmyVal(a),0);if(en>mineV*3&&en>6000&&grOwned(c).length>3&&(st.bl&&st.bl.length>1||p.oil)){grScorch(c,p.i);break;}}
  // loot a province we just took when short of money
  if(N.cash<600)for(const p of P){if(!p.land)continue;const st=GC.prov[p.i];if(st.o===c&&st.o0!==c&&st.cv>0&&!st.lo){if(!grLoot(c,p.i))break;}}
  // bombing: hit the richest enemy province in range every other turn
  if(wars.length&&N.cash>1300&&GC.turn%2===0&&!N.fo){let bt=-1,bv=0;for(const p of P){if(!p.land)continue;const st=GC.prov[p.i];if(!wars.includes(st.o)||st.bm>0)continue;if(!grNear(c,p.i,3,'airfield'))continue;const v=p.dev+(grHas(p.i,'factory')?4:0);if(v>bv){bv=v;bt=p.i;}}if(bt>=0)grBomb(c,bt);}
  // build: power first if the grid is short, then food/fuel safety, then industry, airfield, AA, fortress
  if(N.cash>1100){const front=mine.map(p=>[p,p.adj.filter(j=>P[j].land&&wars.includes(GC.prov[j].o)).length]).sort((a,b)=>b[1]-a[1]||a[0].i-b[0].i);
    const want=[];
    if(N.px<.85)want.push(['power',mine.slice().sort((a,b)=>b.dev-a.dev||a.i-b.i)]);
    if(N.food<60||(N.rep.foodC||0)>(N.rep.foodP||0)*1.05)want.push(['farm',mine.filter(p=>p.farm||p.t==='f')]);
    const grid=N.px>=.85;
    if(grid)want.push(['factory',mine.slice().sort((a,b)=>b.dev-a.dev||a.i-b.i)]);
    want.push(['refinery',mine.filter(p=>p.oil)]);want.push(['mine',mine.filter(p=>p.mine)]);
    want.push(['airfield',front.map(f=>f[0])]);want.push(['aa',mine.filter(p=>p.cap)]);want.push(['base',front.map(f=>f[0])]);want.push(['mfort',mine.filter(p=>p.t==='m')]);want.push(['port',mine.filter(p=>p.coast)]);
    let done=0;for(const [k,L] of want){if(done)break;if(N.cash-grBCost(c,k)<700)continue;for(const p of L){if(!grBuild(c,p.i,k)){done=1;break;}}}
    // city chain: grow the capital into an industrial city, then the richest towns
    if(!done&&N.cash>1800){for(const p of mine.slice().sort((a,b)=>b.dev-a.dev||a.i-b.i)){const st=GC.prov[p.i];if(st.bq)continue;if(!grCityUp(c,p.i,st.ct>0?st.cty:(p.cap?'ind':p.coast?'port':'mil'))){break;}}}}
}

// ---------- recruit rules (called from grRecruit) ----------
function grEcoRecruit(c,pi,k,n,cost,turns){const N=GC.nat[c],S=grSig(c);const mp=(k==='inf'||k==='at')?n:Math.ceil(n/2);if(N.mp<mp)return {err:'Not enough manpower ('+Math.floor(N.mp)+' / '+mp+').'};
  let cst=cost;if(grHas(pi,'factory'))cst*=.85;cst*=1-(S.recK||0);cst=Math.round(cst);if(N.cash<cst)return {err:'Not enough money.'};
  let t=turns;if(N.tw)t=Math.max(1,t-1);if((N.px==null?1:N.px)<.6)t++;return {cost:cst,mp,turns:t};}
function grEcoMpBase(c,k,n){return (k==='inf'||k==='at')?n:Math.ceil(n/2);}

// the fuel an army starts a live battle with (0..1): its own tank level, a bare garrison draws on the nation's stock
function grEcoSideFuel(L){let t=0,n=0;for(const s of L){t+=(s.arr&&s.arr.fu!=null?s.arr.fu:100)*s.u.length;n+=s.u.length;}return n?Math.max(0,Math.min(1,t/n/100)):1;}   // a bare garrison is fuelled from its own province

// ================= UI: the economy panel, province buildings, straits (uses guEl/guSide/guTop from 13c-grandui.js) =================
const GU_BTN='padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:13px';
function guEcoAct(fn){const e=fn();if(e){GV.hint=e;if(typeof guHint==='function')guHint();}grSave();guTop();guSide();guEcoRender();}
function guEcoBtn(t,fn,title,on,dis){const b=guEl('button',GU_BTN+(on?';border-color:#ffe27a;background:#41572a':'')+(dis?';opacity:.5':''),t);b.type='button';if(title)b.title=title;b.onclick=()=>guEcoAct(fn);return b;}
function guEcoTop(t,me){if(!me||!me.rep)return;const f=guEl('span','opacity:.9;font-size:14px','Fuel <b style="color:'+(me.fo?'#ff9d8e':'#e8e4d8')+'">'+Math.round(me.fuel)+'</b> · Food <b style="color:'+(me.food<20?'#ff9d8e':'#e8e4d8')+'">'+Math.round(me.food)+'</b> · Men <b>'+Math.round(me.mp)+'</b> · Oil <b>'+GC.w.oil+'</b>'+(me.debt?' · Debt <b>$'+me.debt+'</b>':''));t.appendChild(f);
  const b=guEl('button','padding:5px 12px;border-radius:6px;border:1px solid #c9a24a;background:#3b3216;color:#ffe9a8;cursor:pointer;font-size:14px;font-weight:bold','Economy');b.type='button';b.title='Empire economy';b.onclick=guEcoToggle;t.appendChild(b);if(document.getElementById('gEco'))guEcoRender();}
function guEcoToggle(){const e=document.getElementById('gEco');if(e){e.remove();return;}const p=guEl('div','position:fixed;left:10px;top:56px;width:390px;max-height:calc(100vh - 80px);overflow:auto;z-index:8200;background:#101c28ee;border:1px solid #c9a24a;border-radius:9px;padding:10px 12px;color:#e8e4d8;font-size:14px;line-height:1.45');p.id='gEco';document.body.appendChild(p);guEcoRender();}
function guEcoRender(){const p=document.getElementById('gEco');if(!p||!GC||!GC.me)return;const c=GC.me,N=GC.nat[c],r=N.rep||{},S=grSig(c);p.innerHTML='';
  const row=(a,b,col)=>'<div style="display:flex;justify-content:space-between"><span style="opacity:.8">'+a+'</span><b style="color:'+(col||'#e8e4d8')+'">'+b+'</b></div>';
  const sg=n=>(n>=0?'+':'')+Math.round(n);const h=guEl('div','');
  h.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:17px;color:#ffe9a8">Empire economy</b><span style="cursor:pointer;opacity:.7" id="gEcoX">close ✕</span></div>'
   +row('Treasury','$'+Math.round(N.cash).toLocaleString())+row('Tax',sg(r.tax||0))+row('Trade',sg(r.trade||0))+row('Oil exports',sg(r.oil||0))
   +((r.toll||r.remit||r.tech||r.coffee||r.grain)?row('Signature income',sg((r.toll||0)+(r.remit||0)+(r.tech||0)+(r.coffee||0)+(r.grain||0))):'')
   +row('Army upkeep (grows with size)',sg(-(r.up||0)),'#ff9d8e')+(r.int?row('Bond interest',sg(-r.int),'#ff9d8e'):'')+(r.fuelBuy?row('Fuel bought',sg(-r.fuelBuy),'#ff9d8e'):'')+(r.foodBuy?row('Food imported',sg(-r.foodBuy),'#ff9d8e'):'')+(r.close?row('Strait patrols',sg(-r.close),'#ff9d8e'):'')
   +'<hr style="border:0;border-top:1px solid #2c4358;margin:6px 0">'+row('Net per turn',sg(r.net||0),(r.net||0)>=0?'#9fd36b':'#ff9d8e')
   +'<hr style="border:0;border-top:1px solid #2c4358;margin:6px 0">'
   +row('Fuel',Math.round(N.fuel)+' ('+sg((r.fuelP||0)-(r.fuelC||0))+'/turn)'+(N.fo?' OUT':''),N.fo?'#ff9d8e':null)+row('Food',Math.round(N.food)+' ('+sg((r.foodP||0)-(r.foodC||0))+'/turn)'+(N.fam?' FAMINE':''),N.fam?'#ff9d8e':null)
   +row('Manpower',Math.round(N.mp)+' (+'+(r.mp||0)+'/turn)')+row('Power grid',Math.round((N.px||1)*100)+'%'+(N.px<.8?' blackouts slow factories':''),N.px<.8?'#ff9d8e':null)
   +row('Oil price (index)',GC.w.oil+'  next: '+[1,2,3,4].map(i=>Math.round(grPriceAt(GC.turn+i))).join(', '));
  const cr=grCrisisAt(GC.turn);if(cr>=0)h.innerHTML+='<div style="color:#ff9d8e;margin-top:3px">CRISIS: '+GR_CRISES[cr][0]+' - '+GR_CRISES[cr][1]+'</div>';
  const nx=GC.w.cr.find(x=>x[0]>GC.turn);if(nx)h.innerHTML+='<div style="opacity:.6;font-size:12px">Next crisis expected around turn '+nx[0]+'.</div>';
  if(Object.keys(S).length)h.innerHTML+='<div style="margin-top:4px;color:#ffe9a8;font-size:13px">Your national signature is active (orch/SIGNATURES.md).</div>';
  p.appendChild(h);p.querySelector('#gEcoX').onclick=guEcoToggle;
  const sec=(t)=>{p.appendChild(guEl('div','margin-top:8px;font-weight:bold;color:#ffe9a8',t));const d=guEl('div','display:flex;flex-wrap:wrap;gap:4px;margin-top:3px');p.appendChild(d);return d;};
  let d=sec('Policies');d.appendChild(guEcoBtn('Total war '+(N.tw?'ON':'off'),()=>grTotalWar(c,!N.tw),'Faster production and more men, rising unrest, higher upkeep',N.tw));d.appendChild(guEcoBtn('Rationing '+(N.rat?'ON':'off'),()=>{grRation(c,!N.rat);return '';},'Eat 25% less, +3 unrest',N.rat));
  d.appendChild(guEcoBtn('Smuggling '+(N.smug?'ON':'off'),()=>{grSmuggle(c,!N.smug);return '';},'Win back part of the trade lost to sanctions (costs trade and world opinion)',N.smug));
  d=sec('Oil: '+(N.sell===0?'all refined to fuel':N.sell===1?'all exported':'half and half'));[[0,'Fuel'],[.5,'Split'],[1,'Export']].forEach(([v,t])=>d.appendChild(guEcoBtn(t,()=>{grSellOil(c,v);return '';},'',N.sell===v)));
  d=sec('War bonds - debt $'+N.debt+(N.def>0?' (IN DEFAULT)':'')+' · interest 3%/turn');d.appendChild(guEcoBtn('Borrow $1000',()=>grBorrow(c,1000)));d.appendChild(guEcoBtn('Repay $1000',()=>grRepay(c,1000)));
  d=sec('Central bank - $'+N.bank+' (safe, but lootable if your capital falls)');d.appendChild(guEcoBtn('Deposit $500',()=>grBank(c,500)));d.appendChild(guEcoBtn('Withdraw $500',()=>grBank(c,-500)));
  const used=Object.keys(N.mer).reduce((s,k)=>s+N.mer[k],0);d=sec('Merchants ('+used+'/'+grMerchants(c)+') - steer trade flows');GR_NODES.forEach((nm,n)=>{const w=guEl('span','display:inline-flex;align-items:center;gap:2px;border:1px solid #2c4358;border-radius:5px;padding:1px 3px;font-size:12px');w.appendChild(guEcoBtn('-',()=>grMerchant(c,n,-1)));w.appendChild(guEl('span','padding:0 3px',nm+' '+(N.mer[n]||0)));w.appendChild(guEcoBtn('+',()=>grMerchant(c,n,1)));d.appendChild(w);});
  const foes=Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&(grAtWar(c,o)||N.emb.includes(o))).sort();d=sec('Embargo (hurts their trade, costs you 5%)');if(!foes.length)d.appendChild(guEl('span','opacity:.6','No enemies.'));foes.forEach(o=>d.appendChild(guEcoBtn(GCM.nats.get(o).name+(N.emb.includes(o)?' ✓':''),()=>grEmbargo(c,o,!N.emb.includes(o)),'',N.emb.includes(o))));
  const st=grStraits().filter(si=>grStraitOwner(si)===c||GC.w.cl[si]);d=sec('Straits');if(!st.length)d.appendChild(guEl('span','opacity:.6','You hold none. Own most of a strait\'s shores to close it.'));st.forEach(si=>{const cl=GC.w.cl[si];d.appendChild(guEcoBtn(GCM.P[si].n+(cl?(cl===c?' - CLOSED (reopen)':' - closed by '+cl):' - close'),()=>grStraitClose(c,si,!cl),'Closing costs $40 a turn, cuts rivals\' trade and raises the oil price',cl===c,cl&&cl!==c));});
  const op=GC.op[c]||0;p.appendChild(guEl('div','margin-top:8px;opacity:.65;font-size:12px','World opinion of you: '+op+' (smuggling, bombing, looting and scorched earth lower it; used by diplomacy later).'));}
function guEcoSide(s,pi,st,p,mine){if(!GC.me||!GC.nat[GC.me].rep)return;const me=GC.me,N=GC.nat[me],box=guEl('div','margin:8px 0;border-top:1px solid #2c4358;padding-top:6px');
  const bl=gmBuildings(pi);const chips=bl.filter(r=>GR_BLD[r[0]]).map(r=>'<span title="'+GR_BLD[r[0]][0]+(r[1]>0?' (damaged '+r[1]+'%)':'')+'" style="display:inline-block;margin:1px 2px 1px 0;padding:0 5px;border-radius:4px;background:'+(r[1]>=100?'#5a2a2a':'#27425a')+';border:1px solid #4a6580;font-size:12px;font-weight:bold">'+GR_BLD[r[0]][4]+'</span>').join('');
  if(chips||st.ct||st.bq||st.bm||st.sc||st.aut)box.innerHTML='<div style="font-size:13px;opacity:.85">Buildings '+(chips||'<i>none</i>')+(st.ct?' · '+GR_CITY[st.cty][0]+' city tier '+st.ct:'')+(st.aut?' · autonomy '+st.aut:'')+(st.bq?'<br>Building: '+(st.bq[0].startsWith('city:')?'city upgrade':GR_BLD[st.bq[0]][0])+' ('+st.bq[1]+' turn'+(st.bq[1]>1?'s':'')+')':'')+(st.bm?'<br><span style="color:#ff9d8e">Bombed (income halved, '+st.bm+' turns)</span>':'')+(st.sc?'<br><span style="color:#ff9d8e">Scorched earth ('+st.sc+' turns)</span>':'')+'</div>';
  if(mine){const t=guEl('div','opacity:.75;font-size:13px;margin-top:4px','Build here (takes turns; appears pre-built in this province\'s battle)');box.appendChild(t);const g=guEl('div','display:flex;flex-wrap:wrap;gap:3px;margin-top:2px');
    for(const k of GR_BKEYS){const B=GR_BLD[k];if(B[3]&&!B[3](p,me))continue;if(grHas(pi,k))continue;const cost=grBCost(me,k);g.appendChild(guEcoBtn(B[0]+' $'+cost,()=>grBuild(me,pi,k),B[6]+' · '+grBTurns(me,k)+' turns',false,N.cash<cost||!!st.bq));}box.appendChild(g);
    const cc=guEl('div','margin-top:5px');cc.appendChild(guEl('div','opacity:.75;font-size:13px','City growth '+(st.ct?'(tier '+st.ct+' '+GR_CITY[st.cty][0]+')':'')));const g2=guEl('div','display:flex;flex-wrap:wrap;gap:3px;margin-top:2px');
    for(const ty of Object.keys(GR_CITY)){if(st.ct>0&&st.cty!==ty)continue;const cost=Math.round(300*(st.ct+1)*(1+(grSig(me).bcostK||0)));g2.appendChild(guEcoBtn((st.ct?'Grow ':'')+GR_CITY[ty][0]+' $'+cost,()=>grCityUp(me,pi,ty),GR_CITY[ty][1],false,N.cash<cost||!!st.bq||st.ct>=3));}cc.appendChild(g2);box.appendChild(cc);
    const au=guEl('div','margin-top:5px');au.appendChild(guEl('div','opacity:.75;font-size:13px','Autonomy (less tax and men, much calmer; lowering takes 3 turns)'));const g3=guEl('div','display:flex;gap:3px;margin-top:2px');[0,1,2,3].forEach(l=>g3.appendChild(guEcoBtn(String(l),()=>grAutonomy(me,pi,l),'',st.aut===l&&!st.ad)));au.appendChild(g3);box.appendChild(au);
    const a2=guEl('div','margin-top:5px;display:flex;gap:3px;flex-wrap:wrap');a2.appendChild(guEcoBtn('Scorched earth',()=>grScorch(me,pi),'Burn the buildings and fields: no income for 6 turns, +20 unrest, lowers world opinion',false,st.sc>0));
    if(st.o0!==me&&st.cv>0)a2.appendChild(guEcoBtn('Loot',()=>grLoot(me,pi),'Quick money from a province you just took; +30 unrest',false,st.lo>0));box.appendChild(a2);}
  else if(grAtWar(me,st.o)){const a2=guEl('div','margin-top:5px;display:flex;gap:3px;flex-wrap:wrap');a2.appendChild(guEcoBtn('Bomb $250',()=>grBomb(me,pi),'Strategic bombing: income halved 3 turns, damages a building (needs an airfield within 3 provinces)',false,st.bm>0));
    if(GC.armies.some(a=>a.at===pi&&a.o===me))a2.appendChild(guEcoBtn('Loot',()=>grLoot(me,pi),'Plunder with your army here; +30 unrest, lowers world opinion',false,st.lo>0));box.appendChild(a2);}
  s.appendChild(box);}
function guEcoStrait(s,pi){const p=GCM.P[pi];if(!p.ck)return;const o=grStraitOwner(pi),cl=GC.w.cl[pi];const d=guEl('div','margin-top:8px;font-size:14px','Held by: <b>'+(o?GCM.nats.get(o).name:'nobody (shores split)')+'</b>'+(cl?' · <span style="color:#ff9d8e">CLOSED by '+GCM.nats.get(cl).name+'</span>':''));s.appendChild(d);
  if(GC.me&&(o===GC.me||cl===GC.me))d.appendChild(guEcoBtn(cl===GC.me?'Reopen':'Close the strait',()=>grStraitClose(GC.me,pi,cl!==GC.me),'$40 a turn'));}
