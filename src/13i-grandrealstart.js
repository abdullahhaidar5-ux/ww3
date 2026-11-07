// GR_REAL - the ONE data table for the grand campaign's realistic start (Abdullah 2026-11-06 17:53, lane B1). Figures are rounded
// from 2025-26 public data (SIPRI 2025 military spending, IMF/World Bank GDP, EIA oil output, IISS troop counts), then squeezed
// (roughly square-rooted) so a small power is weak but still playable. Sources + the per-nation table: orch/reports/realstart.md.
// Deterministic: no random numbers here. grand4/4b's diplomacy reads `al`, `op`, `tn`; grand3 fleets read `fl`.
//   n[code] = [econ, mil, oil] : econ x2200 starting cash, mil x GR_VBASE starting army value, oil = fuel stock (120 = normal)
/* VASSALS (EU4-style subjects; Abdullah 2026-11-06 23:10 "Make Syria a vassal of Turkey"): GC.vas=[[overlord,subject],...]. A subject fights in
   its overlord's wars and the overlord defends it (grAllied counts the pair, so laneG's glgDeclare joins them), it can't declare war, make
   alliances, guarantee or make peace on its own, and it can't leave. Economy (tribute, liberty desire, independence wars, annexation) = Lane G. */
const GR_VASSALS=[['TR','SY']];
function grVasPair(a,b){return !!(GC&&GC.vas&&GC.vas.some(v=>(v[0]===a&&v[1]===b)||(v[0]===b&&v[1]===a)));}
function grOverlord(c){const v=GC&&GC.vas&&GC.vas.find(x=>x[1]===c);return v?v[0]:null;}
function grVasInit(){if(!GC||!GC.nat||GC.vas)return;GC.vas=GR_VASSALS.filter(v=>GC.nat[v[0]]&&GC.nat[v[1]]).map(v=>v.slice());}
const RES_BLOC=['IR','RS','DW','RV'];   // the Resistance bloc, led by the one shared Ayatollah; new Shia factions add their code here
const GR_REAL={
 n:{US:[6,3,230],CN:[4.5,2.4,110],RU:[1.6,1.9,260],IN:[2.5,1.5,90],DE:[2.5,.9,80],JP:[2.3,.9,70],GB:[2.2,1,130],FR:[2.1,1,90],IT:[1.6,.7,80],
  BR:[1.5,.5,160],CA:[1.5,.5,200],KR:[1.5,1,70],AU:[1.3,.6,140],ES:[1.2,.5,80],MX:[1.2,.45,130],ID:[1,.5,140],SA:[1.2,.9,300],TR:[1,1.1,90],
  TW:[1,.6,70],PL:[1,.8,80],IL:[.9,1,90],AE:[.9,.5,260],SE:[.8,.4,90],NO:[.9,.35,260],FI:[.5,.45,80],NL:[.9,.3,80],EG:[.5,.8,110],IR:[.6,1,230],
  PK:[.5,.9,80],UA:[.4,1.4,70],VN:[.5,.55,110],TH:[.6,.4,90],NG:[.5,.3,170],ZA:[.5,.35,80],AR:[.5,.3,100],CO:[.4,.3,130],CL:[.4,.3,80],
  GR:[.5,.5,80],RO:[.4,.4,90],KZ:[.5,.4,200],IQ:[.4,.45,230],RV:[.15,.35,110],QA:[.6,.25,260],KW:[.5,.25,260],OM:[.4,.3,200],DZ:[.4,.55,200],MA:[.3,.4,80],
  VE:[.2,.35,180],KP:[.15,.9,70],CU:[.1,.2,60],SY:[.1,.2,70],RS:[.15,.3,90],DW:[.1,.35,80],KD:[.25,.25,120],JO:[.2,.3,80],AZ:[.3,.4,200],BY:[.2,.4,100],
  AF:[.1,.25,60],LY:[.15,.2,200],SD:[.08,.15,70],ET:[.15,.3,60],PH:[.4,.3,80]},
 // real alliances at the start (Nov 2026): members start friendly, never attack each other on their own
 al:[['NATO',['US','CA','GB','FR','DE','ES','IT','PL','SE','NO','FI','GR','RO','TR']],
  ['US partners',['US','JP','KR','AU','PH','IL','TW','JO','AE','QA','KW','MA','EG']],
  ['Russia bloc',['RU','BY','KZ','KP']],['Resistance bloc',RES_BLOC],['China-Pakistan',['CN','PK']],
  ['Turkey-Azerbaijan',['TR','AZ']],['Saudi-Pakistan',['SA','PK']],['Gulf',['SA','AE','QA','KW','OM']],['Russia-Iran',['RU','IR']]],
 // starting opinions beyond alliances (-100..100): rivalries and warm ties
 op:[['US','CN',-45],['US','RU',-55],['US','IR',-90],['US','KP',-95],['RU','UA',-100],['RU','GB',-60],['RU','PL',-70],['RU','DE',-45],['IL','IR',-100],['IL','RS',-100],
  ['IL','DW',-95],['IL','TR',-55],['IN','PK',-85],['IN','CN',-45],['CN','TW',-90],['CN','JP',-55],['CN','PH',-50],['KP','KR',-95],['KP','JP',-70],['GR','TR',-50],
  ['SA','IR',-60],['EG','IL',-20],['AZ','IR',-35],['DE','US',20],['FR','DE',30],['IN','US',25],['IN','RU',35],['CN','RU',55],['CN','KP',40],['TR','RU',-10],
  ['IQ','IR',45],['IQ','RV',-15],['RV','IR',60],['SY','IL',-35],['SY','TR',20],['KD','TR',-35],['DW','SA',-40],['UA','PL',55],['MA','DZ',-60],['ET','EG',-40],['ET','SD',-20]],
 // opening wars as they stand in Nov 2026 (checked): Russia-Ukraine (5th year, no ceasefire); Israel vs the Lebanese Mountain Shias
 wars:[['RU','UA'],['IL','RS']],
 // real tensions: each side keeps a covering army at the front; wars can break out here
 tn:[['KP','KR'],['CN','TW'],['IN','PK'],['GR','TR'],['IL','IR'],['IL','DW'],['AZ','IR'],['IN','CN'],['SA','DW']],
 // overseas bases [owner, host, share of the owner's start strength]: US Qatar/Kuwait/UAE/Jordan/Korea/Japan/Germany/Poland/Italy,
 // Russia in Syria (bases being renegotiated with Damascus), Turkey in Iraq's north & Syria, UK Gulf, France UAE
 bases:[['US','QA',.06],['US','KW',.04],['US','AE',.03],['US','JO',.02],['US','KR',.08],['US','JP',.08],['US','DE',.07],['US','PL',.04],['US','IT',.04],
  ['RU','SY',.04],['TR','SY',.05],['TR','IQ',.03],['GB','OM',.03],['FR','AE',.03],['CN','PK',.02],['IL','SY',.03]],
 // fleets waiting for grand3: [owner, sea zone, carrier groups]
 fl:[['US','Western Pacific',2],['US','Mediterranean',1],['US','Arabian Sea',1],['RU','Black Sea',1],['CN','South China Sea',2],['GB','North Atlantic',1],['FR','Mediterranean',1],['IN','Indian Ocean',1]]};
function grRealOn(){return typeof GR_REAL==='object';}
function grRealMil(c,dflt){const r=GR_REAL.n[c];return r?r[1]:dflt;}
function grRealCash(c,dflt){const r=GR_REAL.n[c];return r?Math.round(2200*r[0]):dflt;}
function grRealClass(c){const r=GR_REAL.n[c];if(!r)return 'Small power';const s=r[0]*.4+r[1]*.6;return s>=2?'Superpower':s>=.9?'Great power':s>=.45?'Regional power':'Small power';}
// alliances: `GC.rel` = {pairKey: opinion}; `GC.alz` = [[name,[codes]]]. Built once at campaign start, saved with the campaign.
function grAllied(a,b){if(!GC)return false;if(grVasPair(a,b))return true;if(!GC.alz)return false;return GC.alz.some(x=>x[1].includes(a)&&x[1].includes(b));}
function grOpinion(a,b){if(a===b)return 100;if(!GC)return 0;if(GC.war[grWk(a,b)])return -100;let v=(GC.rel&&GC.rel[grWk(a,b)])||0;if(grAllied(a,b))v=Math.max(v,75);return Math.max(-100,Math.min(100,v));}
function grNearOwn(o,toCap){let best=-1,bd=1e9;for(const p of GCM.P){if(!p.land||GC.prov[p.i].o!==o)continue;const d=grDist(p.i,toCap);if(d<bd){bd=d;best=p.i;}}return best;}
// called from grNew after every nation exists. Wars, fronts, bases, alliances, opinions.
function grRealApply(quick){
  const has=c=>!!GC.nat[c]&&!GC.nat[c].dead;const V=c=>GR_VBASE*(grRealMil(c,grNat(c).major?1:.5))*(quick?.7:1);
  GC.alz=GR_REAL.al.map(x=>[x[0],x[1].filter(has)]).filter(x=>x[1].length>1);grResBloc();grVasInit();GC.rel={};
  for(const [a,b,v] of GR_REAL.op)if(has(a)&&has(b))GC.rel[grWk(a,b)]=v;
  for(const [a,b] of GR_REAL.wars)if(has(a)&&has(b))GC.war[grWk(a,b)]=1;
  const front=(a,b,sh,nm)=>{const at=grNearOwn(a,GC.nat[b].cap);if(at<0)return;const f=grNat(a).fac;grAddArmy(a,at,grGenUnits(f,V(a)*sh,false),nm);};
  for(const [a,b] of GR_REAL.wars)if(has(a)&&has(b)){front(a,b,.3,'Front Army');front(b,a,.3,'Front Army');}
  for(const [a,b] of GR_REAL.tn)if(has(a)&&has(b)){front(a,b,.15,'Border Guard');front(b,a,.15,'Border Guard');}
  for(const [o,h,sh] of GR_REAL.bases)if(has(o)&&has(h)){const at=GC.nat[h].cap;if(at>=0){const ba=grAddArmy(o,at,grGenUnits(grNat(o).fac,V(o)*sh,false),'Overseas Base');ba.bs=h;}}
  for(const c of Object.keys(GC.nat)){const r=GR_REAL.n[c];if(r&&GC.nat[c].e)GC.nat[c].e.fuel=r[2];}}

/* The Resistance bloc (Abdullah 2026-11-06 21:23 + 22:16 "Make sure the resistance bloc is a thing"): IR, RS and DW (and any later Shia
   faction added to RES_BLOC, e.g. the River Shias) are ONE permanent alliance while the single shared Ayatollah leads them. Members can't
   leave it or fight each other; old saves ("Axis of Resistance") are renamed and topped up on load. One table, one helper. */
function grResBloc(){if(!GC||!GC.nat)return;GC.alz=GC.alz||[];const m=RES_BLOC.filter(c=>GC.nat[c]);if(m.length<2)return;
  let g=GC.alz.find(x=>x[0]==='Resistance bloc'||x[0]==='Axis of Resistance');if(!g){g=['Resistance bloc',[]];GC.alz.push(g);}g[0]='Resistance bloc';
  for(const c of m)if(!g[1].includes(c))g[1].push(c);}
function grInResBloc(a,b){return RES_BLOC.includes(a)&&RES_BLOC.includes(b)&&!!GC&&(GC.alz||[]).some(x=>x[0]==='Resistance bloc'&&x[1].includes(a)&&x[1].includes(b));}
