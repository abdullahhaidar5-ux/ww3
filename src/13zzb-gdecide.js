// 13zzb-gdecide.js — ctabs2 (EU4 country tabs): DECISIONS & POLICIES + STABILITY & EXPANSION. NO new engines:
//   • decisions are DATA rows whose effects use the ONE event vocabulary (gevApply in 13p: cash, un, man, rel, mod, stab, ws, pp, fn, chain);
//     follow-ups are ordinary GEV_ROWS events; world reactions are functions in GCR_FN (13zv) — so AI nations, the UN, markets and opinion react
//     through the same systems as every event. State GC.dec = {d:{code:{id:turn}}} (saved with the campaign).
//   • policies are rows in the ONE modifier table (GMOD_ROWS, cond 'pol:<id>'), unlocked by pairs of completed idea groups (13l), 3/3/3 slots,
//     1 point/month upkeep from their pool (monthly GMOD hook). State N.pol=[ids].
//   • the Stability & expansion screen only READS existing state: stability (13m), war support = war exhaustion (13v), cores (13o),
//     unrest (13-grand), refugees (13zw), inflation (13x), estates (13o). Disasters fire EXISTING event rows (cr_coup, cr_rising, genstrike, refugees).
//     Rebels are grouped from the provinces' own unrest; "Handle them!" changes that same unrest. State GC.dis = {code+id: turn fired}.
// Deterministic: no random, AI follows fixed rules. Neutral wording: titles only, no real leaders or organisations.

// ---------------- POLICIES ----------------
const GPOL_CAT={pol:'Political',dip:'Diplomatic',mil:'Military'}, GPOL_SLOTS=3, GPOL_UP=1, GPOL_ENACT=10;
// [id, pool, name, [idea groups needed — 'nat' = the nation's own national tree], rows, plain text]
const GPOL=[
  ['po_inv','pol','Public Investment Program',['nat','eco'],[{stat:'income',mul:1.04}],'+4% income'],
  ['po_civ','pol','Civic Integration',['eco','dip'],[{stat:'unrest',add:-2}],'-2 unrest in every province'],
  ['po_cen','pol','Strong Central Government',['nat','mil'],[{stat:'ppPol',mul:1.08},{stat:'warSupport',add:.02}],'+8% Political points, +2% war support'],
  ['po_trc','dip','Trade Corridors',['eco','dip'],[{stat:'income',mul:1.03}],'+3% income'],
  ['po_sof','dip','Soft-Power Diplomacy',['nat','dip'],[{stat:'ppDip',mul:1.1}],'+10% Diplomatic points'],
  ['po_int','dip','Alliance Interoperability',['dip','mil'],[{stat:'ppMil',mul:1.1}],'+10% Military points'],
  ['po_cad','mil','Combined-Arms Doctrine',['nat','mil'],[{stat:'manpower',mul:1.08}],'+8% manpower'],
  ['po_ind','mil','Defense Industry',['eco','mil'],[{stat:'upkeep',mul:.95}],'-5% army upkeep'],
  ['po_rrf','mil','Rapid Reaction Forces',['dip','mil'],[{stat:'forceLimit',mul:1.06}],'+6% force limit']];
GMOD_COND.pol=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&N.pol&&N.pol.indexOf(arg)>=0);};
for(const p of GPOL)p[4].forEach((v,i)=>{const r={id:'pol_'+p[0]+'_'+i,src:p[2]+' (policy)',scope:'nation',stat:v.stat,cond:'pol:'+p[0]};if(v.add)r.add=v.add;if(v.mul)r.mul=v.mul;GMOD_ROWS.push(r);});
GMOD_STATS.forceLimit=GMOD_STATS.forceLimit||'Force limit';
function gpolN(c){const N=typeof gidN==='function'?gidN(c):GC.nat[c];if(N&&!N.pol)N.pol=[];return N;}
function gpolGrpKey(c,g){return g==='nat'?(typeof gidGroups==='function'?gidGroups(c)[0]:null):g;}
function gpolGrpName(c,g){const k=gpolGrpKey(c,g);return (typeof GID_GROUPS!=='undefined'&&GID_GROUPS[k])?GID_GROUPS[k].name:k;}
function gpolDone(c,g){const N=gpolN(c),k=gpolGrpKey(c,g),G=typeof GID_GROUPS!=='undefined'&&GID_GROUPS[k];return !!(N&&G&&G.ideas.every(i=>N.idea.indexOf(i[0])>=0));}
function gpolOpen(c,p){return p[3].every(g=>gpolDone(c,g));}
// the ONE policy switch (player button, AI and online friends): '' on success or the reason it cannot be done
function gpolSet(c,id,on){const N=gpolN(c),p=GPOL.find(x=>x[0]===id);if(!N||!p)return 'Not available.';const has=N.pol.indexOf(id)>=0;
  if(!on){if(!has)return '';N.pol=N.pol.filter(x=>x!==id);GMOD_C.cache.clear();if(c===GC.me)grLog('Policy dropped: '+p[2]+'.',c);return '';}
  if(has)return 'Already in force.';if(!gpolOpen(c,p))return 'Needs the idea groups '+p[3].map(g=>gpolGrpName(c,g)).join(' + ')+' completed.';
  if(N.pol.filter(x=>GPOL.find(q=>q[0]===x)[1]===p[1]).length>=GPOL_SLOTS)return 'All '+GPOL_SLOTS+' '+GPOL_CAT[p[1]]+' slots are full.';
  if(!N.pp||N.pp[p[1]]<GPOL_ENACT)return 'Needs '+GPOL_ENACT+' '+GPOL_CAT[p[1]]+' points to enact.';
  N.pp[p[1]]-=GPOL_ENACT;N.pol.push(id);GMOD_C.cache.clear();if(c===GC.me)grLog('Policy enacted: '+p[2]+' ('+p[5]+').',c);return '';}
function gpolMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;gpolN(c);if(N.polT===GC.turn)continue;N.polT=GC.turn;
    for(const id of N.pol.slice()){const p=GPOL.find(x=>x[0]===id);if(!p){N.pol=N.pol.filter(x=>x!==id);continue;}
      if(N.pp[p[1]]>=GPOL_UP)N.pp[p[1]]=Math.round((N.pp[p[1]]-GPOL_UP)*100)/100;else{N.pol=N.pol.filter(x=>x!==id);if(c===GC.me)grLog('Policy lapsed: '+p[2]+' — not enough '+GPOL_CAT[p[1]]+' points for its upkeep.',c);}}
    if(c!==GC.me&&N.ai)for(const p of GPOL)if(N.pol.indexOf(p[0])<0&&N.pp[p[1]]>=80&&gpolOpen(c,p)&&!gpolSet(c,p[0],true))break;}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gpolMonth);

// ---------------- DECISIONS ----------------
// world reactions for decisions (the ONE 'fn' hook of the event engine)
const gdecAlive=c=>!!(GC.nat[c]&&!GC.nat[c].dead);
GCR_FN.dec_enrich=code=>{const N=gnkN(code);if(N.st===1){N.st=2;N.p=0;}else if(N.st===2)N.p=Math.min(GNK.months[2]-1,N.p+3);
  for(const [o,d] of [['US',-15],['IL',-20],['GB',-8],['FR',-8],['DE',-8],['SA',-6],['AE',-6]])if(gdecAlive(o))gdRel(o,code,d);
  let un='';if(gdecAlive('US')&&typeof unPropose==='function'&&!unSanctioned(code)){const e=unPropose('US','sanction',code,true);un=e?'':' · the US takes sanctions to the UN';}
  grLog('WORLD: '+gdNatName(code)+' announces enrichment to 90% — Western capitals condemn the move.','');return 'Program accelerated · Western and Gulf opinion falls'+un;};
GCR_FN.dec_mob=code=>{const e=gmbSet(code,2);return e?e:'General mobilization ordered';};
GCR_FN.dec_infl=code=>{const N=ginN(code);N.infl=Math.max(0,Math.min(GIN_MAX,(N.infl||0)+2));return 'Inflation +2%';};
GCR_FN.dec_defl=code=>{const N=ginN(code);N.infl=Math.max(0,(N.infl||0)-2);return 'Inflation -2%';};
GCR_FN.dec_west=code=>{for(const o of ['US','GB','FR','DE','PL','IT'])if(gdecAlive(o))gdRel(o,code,-6);return 'Western opinion -6';};
// follow-up events = ordinary event rows (w:0 → only reached by 'chain')
GEV_ROWS.push(
 {id:'dc_v2030',t:'Megaproject review',x:'Costs on the giant desert projects have overrun and oil revenue is below plan. The planning ministry wants a decision.',w:0,c:'always',ai:0,o:[
  {t:'Scale the projects back',fx:[['cash',600],['mod','income',-.02,24,'Megaprojects scaled back']]},
  {t:'Press on with foreign borrowing ($800)',fx:[['cash',-800],['mod','income',.02,36,'Megaprojects pressed on'],['fn','dec_infl']]}]},
 {id:'dc_unity',t:'The unity government strains',x:'A year on, coalition partners argue over the war\'s aims and the budget.',w:0,c:'always',ai:1,o:[
  {t:'Keep the emergency coalition together',fx:[['mod','income',-.02,6,'Coalition bargains'],['ws',2]]},
  {t:'Dissolve it and return to normal politics',fx:[['un',3],['stab',-1]]}]},
 {id:'dc_imf',t:'Lenders review the program',x:'The fund\'s mission says subsidies must be cut further before the next tranche is released.',w:0,c:'always',ai:0,o:[
  {t:'Cut fuel and bread subsidies',fx:[['cash',800],['un',6]]},
  {t:'Refuse and lose the next tranche',fx:[['mod','income',-.02,12,'Loan tranche withheld'],['un',-2]]}]});
const gdecWar=c=>gdEnemies(c).length>0;
const gdecUn=c=>typeof gcrUn==='function'?gcrUn(c):0;
const gdecCash=c=>GC.nat[c].cash;
const gdecStab=c=>GC.nat[c].stab|0;
// row: {id, n, who:[codes] (absent = any nation), x: why/what it is, req:[[test(c), text]], cost:{cash,pol,dip,mil}, fx: event effects, once / cd: months, ai(c)}
const GDEC=[
 {id:'ir_enr90',who:['IR'],n:'Enrich uranium to 90%',x:'Our centrifuges hold uranium enriched to 60%. Raising it to weapons-grade 90% shortens the road to a warhead by months — but the West will answer with sanctions and threats.',
  req:[[c=>{const s=gnkN(c).st;return s===1||s===2;},'Our nuclear program is under way (enrichment or test-ready)']],cost:{pol:50,cash:600},
  fx:[['fn','dec_enrich'],['ws',4]],once:1,ai:c=>(grAtWar(c,'US')||grAtWar(c,'IL'))&&GC.nat[c].pp.pol>=90},
 {id:'sa_v2030',who:['SA'],n:'Vision 2030 megaprojects',x:'Pour oil money into new cities, tourism and industry to wean the economy off crude. Expensive, and the bill comes due if oil prices sag.',
  req:[[c=>gdecStab(c)>=0,'Stability 0 or higher']],cost:{cash:1500,pol:30},
  fx:[['mod','income',.06,60,'Vision 2030'],['un',-3],['chain','dc_v2030',24]],once:1,ai:c=>gdecCash(c)>=2600},
 {id:'tr_hub',who:['TR'],n:'Become a regional energy hub',x:'Route Caspian and Russian gas through our pipelines and terminals to Europe. Transit fees flow in; Kyiv and Brussels frown.',
  req:[[c=>!grAtWar(c,'RU')&&!grAtWar(c,'AZ'),'At peace with Russia and Azerbaijan']],cost:{cash:900,dip:40},
  fx:[['mod','income',.04,48,'Energy hub'],['rel','AZ',10],['rel','RU',8],['rel','UA',-4]],once:1,ai:c=>GC.nat[c].pp.dip>=90&&gdecCash(c)>=1500},
 {id:'il_unity',who:['IL'],n:'Emergency unity government',x:'Bring the opposition into a wartime cabinet. The country closes ranks — for a while.',
  req:[[gdecWar,'We are at war'],[c=>gdecStab(c)<3,'Stability below +3']],cost:{pol:40},
  fx:[['stab',1],['mod','warSupport',.08,12,'Unity government'],['chain','dc_unity',12]],cd:36,ai:c=>gdecStab(c)<0&&GC.nat[c].pp.pol>=70},
 {id:'eg_suez',who:['EG'],n:'Suez Canal expansion',x:'Deepen and widen the southern canal sector so bigger ships pass faster. Revenue depends on Red Sea shipping, which attacks cut sharply in 2024.',
  req:[[c=>!gdecWar(c),'We are at peace']],cost:{cash:1200,pol:30},
  fx:[['mod','income',.04,60,'Suez expansion'],['rel','CN',6],['rel','SA',4]],once:1,ai:c=>gdecCash(c)>=2200},
 {id:'iq_oil',who:['IQ'],n:'Pass the federal oil and gas law',x:'Settle, at last, how Baghdad and the Kurdistan Region share oil revenue — a law stuck in parliament since 2007.',
  req:[[c=>gdecStab(c)>=0,'Stability 0 or higher'],[c=>gdecAlive('KD'),'The Kurdistan Region still exists as a partner']],cost:{pol:60},
  fx:[['un',-5],['mod','income',.03,48,'Federal oil law'],['rel','KD',15],['rel','US',5],['rel','RV',-6]],once:1,ai:c=>GC.nat[c].pp.pol>=110},
 {id:'ru_fleet',who:['RU'],n:'Expand the shadow tanker fleet',x:'Buy old tankers under flags of convenience to keep oil exports flowing past the price cap. Europe will push back.',
  req:[],cost:{cash:700,dip:20},fx:[['mod','income',.04,24,'Shadow fleet'],['fn','dec_west']],cd:24,ai:c=>gdecCash(c)>=1500},
 {id:'ua_age',who:['UA'],n:'Lower the mobilization age',x:'Call up younger men to refill the brigades. The front gets fresh troops; families and the cities do not take it well.',
  req:[[gdecWar,'We are at war']],cost:{pol:40},fx:[['man',120],['ws',-4],['un',5]],once:1,ai:c=>(GC.nat[c].e?GC.nat[c].e.man:0)<40},
 {id:'cn_stim',who:['CN'],n:'Infrastructure stimulus',x:'Borrow for railways, grids and housing to lift growth. It works — and adds to debt and prices.',
  req:[],cost:{cash:1200},fx:[['mod','income',.05,36,'Stimulus'],['fn','dec_infl']],cd:36,ai:c=>gdecCash(c)>=3200},
 {id:'jp_def',who:['JP'],n:'Raise defense spending to 2% of GDP',x:'Double the defense budget over a few years: more ships, missiles and stockpiles, paid for by tax rises.',
  req:[],cost:{cash:1000,pol:30},fx:[['mod','forceLimit',.08,120,'Defense build-up'],['mod','income',-.03,120,'Defense taxes'],['rel','CN',-6],['rel','US',6]],once:1,ai:c=>gdecCash(c)>=1800},
 {id:'de_fund',who:['DE'],n:'Defense special fund',x:'Set a large off-budget fund for the armed forces. Allies cheer; the borrowing feeds inflation.',
  req:[],cost:{pol:30},fx:[['mod','forceLimit',.08,60,'Defense fund'],['fn','dec_infl'],['rel','PL',5],['rel','UA',5]],once:1,ai:c=>GC.nat[c].pp.pol>=80},
 {id:'kp_test',who:['KP'],n:'Missile test over the sea',x:'Fire a ballistic missile over the sea to show strength. Crowds cheer at home; neighbors protest.',
  req:[],cost:{mil:20,cash:200},fx:[['ws',5],['rel','KR',-10],['rel','JP',-10],['rel','US',-8],['rel','CN',-2]],cd:12,ai:c=>GC.nat[c].pp.mil>=80},
 // generic decisions — every nation
 {id:'g_emerg',n:'Declare a state of emergency',x:'Curfews, checkpoints and special powers. Unrest drops fast; business suffers and neighbors criticize.',
  req:[[c=>gdecUn(c)>=30||gdecStab(c)<=-1,'Average unrest 30 or more, or stability -1 or lower']],cost:{pol:25},
  fx:[['un',-10],['mod','income',-.03,6,'State of emergency'],['rel','$nb',-4]],cd:24,ai:c=>gdecUn(c)>=45},
 {id:'g_aust',n:'Austerity budget',x:'Cut spending and subsidies to balance the books. Inflation cools, but people take to the streets.',
  req:[[c=>gdecCash(c)<600||((typeof ginN==='function'?ginN(c).infl:0)>=5),'Treasury below $600 or inflation 5% or more']],cost:{pol:20},
  fx:[['mod','upkeep',-.08,12,'Austerity'],['mod','income',.04,12,'Austerity'],['un',8],['stab',-1],['fn','dec_defl']],cd:36,ai:c=>gdecCash(c)<0},
 {id:'g_mob',n:'General mobilization',x:'Call up all reserves now (same order as the Mobilization tab). Neighbors notice and the economy feels it.',
  req:[[gdecWar,'We are at war'],[c=>gmbLv(c)<2,'Not already on general mobilization']],cost:{mil:GMB_COST[2]},noPay:1,fx:[['fn','dec_mob']],ai:()=>false},
 {id:'g_imf',n:'Request an IMF loan',x:'Emergency credit from the international lender, on condition of reforms: subsidy cuts and tight budgets for years.',
  req:[[c=>gdecCash(c)<1000,'Treasury below $1,000'],[c=>!(typeof unSanctioned==='function'&&unSanctioned(c)),'Not under UN sanctions']],cost:{dip:20},
  fx:[['cash',2500],['mod','income',-.04,36,'Loan repayments'],['un',5],['chain','dc_imf',12]],cd:48,ai:c=>gdecCash(c)<-500}];
function gdecS(){if(!GC.dec)GC.dec={d:{}};return GC.dec;}
function gdecDone(c,id){const S=gdecS();return S.d[c]&&S.d[c][id]!==undefined?S.d[c][id]:null;}
function gdecFor(c){return GDEC.filter(r=>!r.who||r.who.indexOf(c)>=0);}
function gdecCostTxt(r){const k=r.cost||{},o=[];if(k.cash)o.push('$'+k.cash.toLocaleString());for(const p of ['pol','dip','mil'])if(k[p])o.push(k[p]+' '+GPOL_CAT[p]);return o.join(' · ')||'free';}
// unmet requirements (texts). [] = can be enacted now
function gdecMissing(c,r){const N=gpolN(c),out=[];if(r.who&&r.who.indexOf(c)<0)out.push('Only for '+r.who.map(gdNatName).join(', '));
  const t=gdecDone(c,r.id);if(t!==null&&r.once)out.push('Already enacted');else if(t!==null&&r.cd&&GC.turn-t<r.cd)out.push('Can be taken again in '+(r.cd-(GC.turn-t))+' months');
  for(const [f,txt] of r.req||[]){let ok=false;try{ok=!!f(c);}catch(e){}if(!ok)out.push(txt);}
  const k=r.cost||{};if(k.cash&&N.cash<k.cash)out.push('Needs $'+k.cash.toLocaleString());for(const p of ['pol','dip','mil'])if(k[p]&&(!N.pp||N.pp[p]<k[p]))out.push('Needs '+k[p]+' '+GPOL_CAT[p]+' points');
  return out;}
// the ONE enact function (player, AI, online friends): '' or the reason
function gdecEnact(c,id){const r=GDEC.find(x=>x.id===id),N=gpolN(c);if(!r||!N||N.dead)return 'Not available.';const m=gdecMissing(c,r);if(m.length)return m[0]+'.';
  const k=r.cost||{};if(!r.noPay){if(k.cash)N.cash-=k.cash;for(const p of ['pol','dip','mil'])if(k[p])N.pp[p]-=k[p];}
  const S=gdecS();(S.d[c]=S.d[c]||{})[id]=GC.turn;const l=gevApply(c,r.fx);GMOD_C.cache.clear();grLog(gdNatName(c)+' enacts: '+r.n+'.',c);
  if(c===GC.me&&typeof gevToast==='function')gevToast([r.n].concat(l));return '';}
function gdecMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||c===GC.me||!N.ai||!grNat(c).major)continue;gpolN(c);
    for(const r of gdecFor(c)){let w=false;try{w=r.ai&&r.ai(c);}catch(e){}if(w&&!gdecMissing(c,r).length){gdecEnact(c,r.id);break;}}}}
GMOD_HOOKS.push(gdecMonth);

// ---------------- STABILITY & EXPANSION ----------------
const GSE_REDUCE=40, GSE_WE_K=2.75, GSE_WE0=65;   // war exhaustion 0..20 is a view of the ONE war-support meter: 65% support = 0, 10% = 20
function gseWE(c){const ws=typeof wsOf==='function'?wsOf(c):60;return Math.max(0,Math.min(20,Math.round((GSE_WE0-ws)/GSE_WE_K*10)/10));}
function gseWETrend(c){const N=GC.nat[c];const d=(N&&N.wsWhy||[]).reduce((s,x)=>s+(+x[1]||0),0);return -d/GSE_WE_K;}   // + = exhaustion rising
function gseReduce(c){const N=gpolN(c);if(!N||!N.pp)return 'Not available.';if(gseWE(c)<1)return 'War exhaustion is already low.';if(N.pp.dip<GSE_REDUCE)return 'Needs '+GSE_REDUCE+' Diplomatic points.';
  N.pp.dip-=GSE_REDUCE;wsN(c);N.ws=Math.min(100,N.ws+GSE_WE_K);GMOD_C.cache.clear();if(c===GC.me)grLog('War exhaustion reduced to '+gseWE(c)+'.',c);return '';}
// overextension (EU4): every point of development held without a core = 1%
function gseOE(c){let d=0;for(const p of gsNonCore(c))d+=p.dev||1;return Math.round(d);}
GMOD_COND.oe=(k,arg)=>{const v=gseOE(k);return arg==='hi'?v>=50&&v<100:arg==='max'?v>=100:false;};
GMOD_ROWS.push({id:'oe_hi',src:'Overextension (50%+)',scope:'nation',stat:'unrest',add:2,cond:'oe:hi'},{id:'oe_max_u',src:'Overextension (100%+)',scope:'nation',stat:'unrest',add:4,cond:'oe:max'},
  {id:'oe_max_i',src:'Overextension (100%+)',scope:'nation',stat:'income',mul:.95,cond:'oe:max'});
function gseProvs(c){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);}
// disasters: progress 0..100 from existing state; at 100 they fire the existing event row (once per 24 months)
const GSE_DIS=[
 {id:'coup',n:'Military coup',ev:'cr_coup',why:'Angry army estate, low stability, unrest',p:c=>{const N=gsN(c),a=N.est&&N.est.army?N.est.army.loy:50;return Math.max(0,50-a)*1.2+12*Math.max(0,-(N.stab|0))+Math.max(0,gdecUn(c)-25);}},
 {id:'civil',n:'Civil war',ev:'cr_rising',why:'Provinces near revolt, low stability, collapsing war support',p:c=>{const ps=gseProvs(c);const hot=ps.filter(p=>GC.prov[p.i].un>60).length;return (ps.length?120*hot/ps.length:0)+15*Math.max(0,-gdecStab(c))+Math.max(0,25-(typeof wsOf==='function'?wsOf(c):60));}},
 {id:'econ',n:'Economic collapse',ev:'genstrike',why:'Empty treasury, inflation, low stability',p:c=>{const N=GC.nat[c];return (N.cash<0?Math.min(50,-N.cash/40):0)+(typeof ginN==='function'?ginN(c).infl*2:0)+12*Math.max(0,-gdecStab(c));}},
 {id:'refug',n:'Refugee crisis',ev:'refugees',why:'Refugees from the fighting on our soil',p:c=>{const S=GC.el;return S&&S.ref?(S.ref[c]||0):0;}}];
function gseDis(c,d){let v=0;try{v=d.p(c);}catch(e){}return Math.max(0,Math.min(100,Math.round(v)));}
function gseDisMonth(){if(!GC)return;if(!GC.dis)GC.dis={};for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||!grNat(c).major)continue;
    for(const d of GSE_DIS){const k=c+'_'+d.id;if(gseDis(c,d)>=100&&(GC.dis[k]===undefined||GC.turn-GC.dis[k]>=24)){GC.dis[k]=GC.turn;grLog('Disaster: '+d.n+' in '+gdNatName(c)+'.',c);gevFire(c,d.ev);}}}}
GMOD_HOOKS.push(gseDisMonth);
// rebels and possible rebels, grouped from the provinces' own unrest (revolts start above 72, 13-grand)
const GSE_REVOLT=72;
function gseRebels(c){const ps=gseProvs(c),out=[],used=new Set();const add=(id,n,dem,list)=>{if(!list.length)return;let mx=0,dev=0;for(const p of list){used.add(p.i);mx=Math.max(mx,GC.prov[p.i].un);dev+=p.dev||1;}
    out.push({id,n,dem,ps:list.map(p=>p.i),size:Math.round(dev*1.5),prog:Math.min(100,Math.round(mx/GSE_REVOLT*100))});};
  const by={};for(const p of ps){const st=GC.prov[p.i];if(st.o0&&st.o0!==c&&!gsIsCore(st)&&st.un>=20)(by[st.o0]=by[st.o0]||[]).push(p);}
  for(const o of Object.keys(by).sort())add('sep_'+o,gdNatName(o)+' loyalists','Return to '+gdNatName(o),by[o]);
  add('tax','Tax protesters','Lower taxes',ps.filter(p=>!used.has(p.i)&&GC.prov[p.i].tax===2&&GC.prov[p.i].un>=30));
  if(gdecWar(c)&&(typeof wsOf==='function'?wsOf(c):60)<40)add('peace','Anti-war movement','Make peace',ps.filter(p=>!used.has(p.i)&&GC.prov[p.i].un>=25));
  add('reg','Regional discontents','More local autonomy',ps.filter(p=>!used.has(p.i)&&GC.prov[p.i].un>=40));
  return out;}
// "Handle them!": police & troops (Military points, unrest -15, a little war support) or concessions (cash, unrest -10, tax eased for tax protesters)
function gseHandle(c,id,how){const N=gpolN(c),f=gseRebels(c).find(x=>x.id===id);if(!N||!f)return 'They have gone quiet.';const n=f.ps.length;
  if(how==='force'){const k=10+2*n;if(!N.pp||N.pp.mil<k)return 'Needs '+k+' Military points.';N.pp.mil-=k;for(const i of f.ps)GC.prov[i].un=Math.max(0,GC.prov[i].un-15);wsN(c);N.ws=Math.max(0,N.ws-1);}
  else{const k=120*n;if(N.cash<k)return 'Needs $'+k+'.';N.cash-=k;for(const i of f.ps){const st=GC.prov[i];st.un=Math.max(0,st.un-10);if(id==='tax'&&st.tax===2)st.tax=1;}}
  if(c===GC.me)grLog((how==='force'?'Police and troops sent against the ':'Concessions made to the ')+f.n.toLowerCase()+'.',c);return '';}
// online friends run these on the host too (13zn whitelist: nation = first argument)
if(typeof GNT_W!=='undefined')Object.assign(GNT_W,{gpolSet:0,gdecEnact:0,gseReduce:0,gseHandle:0});

// ---------------- UI (studio style; one job per tab) ----------------
const GDU={gold:'#c9a35a',blue:'#7fb4ff',ink:'#e8e4d8',dim:'#8ea2b5',line:'#2c4258',card:'#132233'};
function gduBtn(t,on,fn,tip){const b=guEl('button','padding:4px 12px;border-radius:5px;border:1px solid '+(on?GDU.gold:'#3a4d60')+';background:'+(on?'#3a3020':'transparent')+';color:'+(on?'#ffe6a8':'#6f8396')+';cursor:'+(on?'pointer':'default')+';font-size:14px;white-space:nowrap',t);
  b.type='button';if(tip)b.title=tip;if(on)b.onclick=fn;else b.disabled=true;return b;}
function gduHead(t,sub){return '<div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:'+GDU.gold+';margin:14px 0 6px;border-bottom:1px solid '+GDU.line+';padding-bottom:3px">'+t+(sub?' <span style="letter-spacing:0;text-transform:none;color:'+GDU.dim+'">'+sub+'</span>':'')+'</div>';}
function gduBar(v,max,col,mid){const w=Math.max(0,Math.min(100,v/max*100));return '<div style="position:relative;height:10px;background:#0b1520;border:1px solid #2f465c;border-radius:5px;overflow:hidden;min-width:120px">'+
  (mid!==undefined?'<div style="position:absolute;left:'+mid+'%;top:0;bottom:0;width:1px;background:#5a7a96"></div>':'')+'<div style="height:100%;width:'+w+'%;background:'+col+'"></div></div>';}
const gduErr=(code,e)=>{if(e&&typeof gevToast==='function')gevToast([e]);npDraw();};
npTab('dec','📜','Decisions & policies',(code,body,c)=>{const N=gpolN(code),own=c.own&&code===GC.me;body.innerHTML='';
  // policies
  const act=GPOL.filter(p=>N.pol.indexOf(p[0])>=0);const sum={};for(const p of act)for(const v of p[4]){const k=GMOD_STATS[v.stat]||v.stat;sum[k]=(sum[k]||0)+(v.add!==undefined?(v.stat==='unrest'?v.add:v.add*100):(v.mul-1)*100);}
  body.insertAdjacentHTML('beforeend',gduHead('Policies',act.length+' in force · upkeep '+GPOL_UP+' point a month each')+
    '<div style="margin-bottom:6px">Our policies give us: '+(act.length?Object.keys(sum).map(k=>'<b style="color:#9fe39f">'+(sum[k]>0?'+':'')+Math.round(sum[k]*10)/10+(k==='Unrest'?'':'%')+'</b> '+k.toLowerCase()).join(', '):'<span style="color:'+GDU.dim+'">nothing yet</span>')+'</div>');
  const grid=guEl('div','display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px');
  for(const cat of ['pol','dip','mil']){const col=guEl('div','background:'+GDU.card+';border:1px solid '+GDU.line+';border-radius:7px;padding:8px 10px');const mine=act.filter(p=>p[1]===cat).length;
    col.innerHTML='<div style="display:flex;justify-content:space-between"><b>'+GPOL_CAT[cat]+'</b><span style="color:'+GDU.dim+'">'+mine+'/'+GPOL_SLOTS+'</span></div>';
    for(const p of GPOL.filter(x=>x[1]===cat)){const on=N.pol.indexOf(p[0])>=0,open=gpolOpen(code,p);
      const row=guEl('div','margin-top:6px;padding:6px 8px;border-radius:5px;border:1px solid '+(on?GDU.gold:'#24384c')+';opacity:'+(on||open?1:.55),
        '<div style="font-weight:bold;color:'+(on?'#ffe6a8':open?GDU.blue:GDU.ink)+'">'+(on?'● ':open?'○ ':'🔒 ')+p[2]+'</div><div style="font-size:13px;color:'+GDU.dim+'">'+p[5]+' · needs '+p[3].map(g=>gpolGrpName(code,g)+(gpolDone(code,g)?' ✓':'')).join(' + ')+'</div>');
      if(own&&(on||open)){const b=gduBtn(on?'Revoke':'Enact ('+GPOL_ENACT+')',true,()=>gduErr(code,gpolSet(code,p[0],!on)));b.style.marginTop='4px';row.appendChild(b);}
      col.appendChild(row);}
    grid.appendChild(col);}
  body.appendChild(grid);
  // national decisions
  const rows=gdecFor(code).map(r=>({r,m:gdecMissing(code,r)})).sort((a,b)=>(a.m.length?1:0)-(b.m.length?1:0)||(a.r.who?0:1)-(b.r.who?0:1));
  body.insertAdjacentHTML('beforeend',gduHead('National decisions',rows.filter(x=>!x.m.length).length+' can be taken now'));
  for(const {r,m} of rows){const ok=!m.length,done=gdecDone(code,r.id);
    const d=guEl('div','display:flex;gap:12px;align-items:flex-start;padding:7px 4px;border-bottom:1px solid #1f3246');
    d.appendChild(guEl('div','width:22px;text-align:center;font-weight:bold;font-size:17px;color:'+(ok?GDU.blue:'#6f8396'),ok?'✓':'?'));
    const t=guEl('div','flex:1;min-width:0','<div style="font-weight:bold;color:'+(ok?GDU.blue:'#9aa7b4')+'">'+r.n+(r.who?' <span style="font-weight:normal;font-size:13px;color:'+GDU.dim+'">· '+r.who.map(gdNatName).join(', ')+'</span>':'')+'</div>'+
      '<div style="font-size:14px;color:'+(ok?GDU.ink:GDU.dim)+'">'+r.x+'</div><div style="font-size:13px;color:'+GDU.dim+'">Cost: '+gdecCostTxt(r)+(done!==null?' · last taken month '+done:'')+'</div>');
    if(!ok)t.title='Requirements:\n• '+m.join('\n• ');d.appendChild(t);
    if(own)d.appendChild(gduBtn('Enact',ok,()=>gduErr(code,gdecEnact(code,r.id)),ok?'':'Requirements:\n• '+m.join('\n• ')));
    body.appendChild(d);}});
// keep the Decisions tab next to Stability in the tab row
{const i=NP.tabs.findIndex(t=>t.id==='dec'),j=NP.tabs.findIndex(t=>t.id==='stab');if(i>=0&&j>=0&&i>j){const t=NP.tabs.splice(i,1)[0];NP.tabs.splice(j,0,t);}}
function gseTab(code,body,c){const N=gpolN(code),own=c.own&&code===GC.me;gstN(code);gsN(code);body.innerHTML='';
  const box=(h)=>{const d=guEl('div','background:'+GDU.card+';border:1px solid '+GDU.line+';border-radius:7px;padding:9px 12px',h);return d;};
  const top=guEl('div','display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px');
  // war exhaustion
  const we=gseWE(code),tr=gseWETrend(code);const b1=box('<div style="display:flex;justify-content:space-between"><b>War exhaustion</b><span><b style="font-size:19px;color:'+(we>=10?'#ff9a8a':we>=4?'#e8d28a':'#8fd18f')+'">'+we+'</b> / 20 '+
    (Math.abs(tr)<.05?'<span style="color:'+GDU.dim+'">▬</span>':tr>0?'<span style="color:#ff9a8a">▲ '+(Math.round(tr*10)/10)+'</span>':'<span style="color:#8fd18f">▼ '+(Math.round(-tr*10)/10)+'</span>')+'</span></div>'+gduBar(we,20,we>=10?'#c0503c':'#c9a35a')+
    '<div style="font-size:13px;color:'+GDU.dim+';margin-top:4px">The home front\'s mood (war support '+Math.round(wsOf(code))+'%). Battles lost, long wars and enemy troops on our soil raise it.</div>');
  if(own)b1.appendChild(gduBtn('Reduce (−1 for '+GSE_REDUCE+' Diplomatic)',we>=1&&N.pp.dip>=GSE_REDUCE,()=>gduErr(code,gseReduce(code))));top.appendChild(b1);
  // stability
  const sv=N.stab|0,sc=sv>0?'#8fd18f':sv<0?'#ff9a8a':GDU.ink;const b2=box('<div style="display:flex;justify-content:space-between"><b>Stability</b><b style="font-size:19px;color:'+sc+'">'+(sv>0?'+':'')+sv+'</b></div>'+
    '<div style="display:flex;gap:3px;margin:3px 0">'+[-3,-2,-1,0,1,2,3].map(v=>'<div style="flex:1;height:10px;border-radius:2px;background:'+(v===sv?sc:(v<0?'#3a2222':v>0?'#1f3a24':'#2a3a4c'))+';opacity:'+(v===sv?1:.7)+'"></div>').join('')+'</div>'+
    '<div style="font-size:13px;color:'+GDU.dim+'">Each point: ±4% income, ±3% war support. This month: '+gstPressure(code).map(x=>x[0]+' ('+(x[1]>0?'+':'')+x[1]+')').join(', ')+'</div>');
  if(own)b2.appendChild(gduBtn('Boost (+1 for '+gstCost(code)+' Political)',sv<GST_MAX&&N.pp.pol>=gstCost(code),()=>gduErr(code,gstRaise(code))));top.appendChild(b2);
  // overextension + expansion
  const oe=gseOE(code),ps=gseProvs(code),nc=gsNonCore(code),cor=nc.filter(p=>GC.prov[p.i].coring).length;
  const b3=box('<div style="display:flex;justify-content:space-between"><b>Overextension</b><b style="font-size:19px;color:'+(oe>=100?'#ff9a8a':oe>=50?'#e8d28a':'#8fd18f')+'">'+oe+'%</b></div>'+gduBar(oe,100,oe>=100?'#c0503c':oe>=50?'#c9a35a':'#4f8f5a')+
    '<div style="font-size:13px;color:'+GDU.dim+';margin-top:4px">1% for every point of development we hold without a core. 50%+: +2 unrest; 100%+: +4 unrest and −5% income.</div>');
  b3.appendChild(gduBtn('Manage (cores) ▸',true,()=>npOpen(code,'estates')));top.appendChild(b3);
  top.appendChild(box('<b>Expansion</b><div style="display:grid;grid-template-columns:1fr auto;gap:2px 12px;margin-top:4px;font-size:15px">'+
    '<span>States (core provinces)</span><b>'+(ps.length-nc.length)+'</b><span>Territories (not yet cored)</span><b>'+nc.length+'</b><span>Being cored now</span><b>'+cor+'</b>'+
    '<span>National unrest (average)</span><b style="color:'+(gdecUn(code)>=40?'#ff9a8a':gdecUn(code)>=25?'#e8d28a':'#8fd18f')+'">'+Math.round(gdecUn(code)*10)/10+'</b></div>'));
  body.appendChild(top);
  // disasters
  body.insertAdjacentHTML('beforeend',gduHead('Possible disasters','strike when the bar is full'));
  const dg=guEl('div','display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px');
  for(const d of GSE_DIS){const v=gseDis(code,d);dg.appendChild(guEl('div','','<div style="display:flex;justify-content:space-between;font-size:15px"><span>'+d.n+'</span><b style="color:'+(v>=75?'#ff9a8a':v>=40?'#e8d28a':GDU.dim)+'">'+v+'%</b></div>'+gduBar(v,100,v>=75?'#c0503c':v>=40?'#c9a35a':'#3f6f8f')+'<div style="font-size:12px;color:'+GDU.dim+'">'+d.why+'</div>'));}
  body.appendChild(dg);
  // rebels
  const rb=gseRebels(code);body.insertAdjacentHTML('beforeend',gduHead('Rebels and possible rebels',rb.length?'revolt when progress reaches 100%':'none — the provinces are calm'));
  if(rb.length){const t=guEl('table','width:100%;border-collapse:collapse;font-size:15px');t.innerHTML='<tr>'+['Faction','Demand','Size','Provinces','Progress',''].map(h=>'<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #34506a;color:'+GDU.dim+';font-weight:normal">'+h+'</th>').join('')+'</tr>';
    for(const f of rb){const tr=document.createElement('tr');tr.innerHTML='<td style="padding:5px 6px"><b>'+f.n+'</b></td><td style="padding:5px 6px">'+f.dem+'</td><td style="padding:5px 6px">'+f.size+'k</td><td style="padding:5px 6px">'+f.ps.length+'</td><td style="padding:5px 6px;min-width:110px">'+gduBar(f.prog,100,f.prog>=80?'#c0503c':'#c9a35a')+'<span style="font-size:12px">'+f.prog+'%</span></td>';
      const td=document.createElement('td');td.style.cssText='padding:5px 6px;white-space:nowrap';
      if(own){const n=f.ps.length;td.appendChild(gduBtn('Handle them!',true,()=>{guModal('<h2 style="margin:0 0 8px;font-size:20px">'+f.n+'</h2><div>They demand: <b>'+f.dem+'</b> · '+n+' province(s), revolt progress '+f.prog+'%.</div>',
        [['Send police & troops ('+(10+2*n)+' Military · unrest −15 · war support −1)',()=>gduErr(code,gseHandle(code,f.id,'force'))],['Make concessions ($'+(120*n)+' · unrest −10'+(f.id==='tax'?' · lower taxes':'')+')',()=>gduErr(code,gseHandle(code,f.id,'talk'))],['Not now',()=>{}]]);}));}
      tr.appendChild(td);tr.onclick=e=>{if(e.target.tagName!=='BUTTON')npFly(f.ps[0]);};tr.style.cursor='pointer';t.appendChild(tr);}
    body.appendChild(t);}}
