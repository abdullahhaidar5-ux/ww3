// 13zq-gpipe.js — lane B RG24: PIPELINES & GRIDS. Real oil/gas pipelines and one power link cross provinces; whoever holds (or wrecks) a route province decides if they flow.
// Who reacts: the exporter (income), the customers/transit states (shortages, blackouts, lost fees -> unrest), the world oil price (a cut line adds to it; working Hormuz-bypass lines
// soften a closed strait), AIs at war sabotage the enemy's line and repair their own, customers of a cut line dislike whoever cut it. Second order: unrest + income loss -> stability/war support.
// Counter-play: station an army in a route province (saboteurs are caught), repair for cash, rebuild trade partners; the bypass lines (East-West, Habshan-Fujairah, Goreh-Jask, SUMED) exist for exactly that.
// Costs: sabotage = 6 Military points (and -4 customer opinion), repair = $120. State: GC.pipe={cut:{id:untilTurn}, mT}. Monthly via GMOD_HOOKS; deterministic, no randomness beyond turn+code hashes.
// Data (approximate real capacities, million barrels/day; the power link is the Iran->Iraq electricity/gas supply). byp = bypasses the Strait of Hormuz / Suez.
const GPIP=[
  {id:'kc',n:'Kirkuk–Ceyhan Pipeline',k:'oil',o:'IQ',cust:[],via:['KD','TR'],r:['Mosul','Kurdistan','Cilicia'],mb:1.0},
  {id:'ew',n:'East–West Pipeline (Abqaiq–Yanbu)',k:'oil',o:'SA',cust:[],via:[],r:['Eastern Province','Riyadh','Hejaz'],mb:5.0,byp:'Strait of Hormuz'},
  {id:'hf',n:'Habshan–Fujairah Pipeline',k:'oil',o:'AE',cust:[],via:[],r:['Abu Dhabi','Dubai'],mb:1.5,byp:'Strait of Hormuz'},
  {id:'gj',n:'Goreh–Jask Pipeline',k:'oil',o:'IR',cust:[],via:[],r:['Khuzestan','Hormozgan'],mb:.3,byp:'Strait of Hormuz'},
  {id:'btc',n:'Baku–Tbilisi–Ceyhan Pipeline',k:'oil',o:'AZ',cust:[],via:['TR'],r:['Baku','East Anatolia','Cilicia'],mb:1.2},
  {id:'sm',n:'SUMED Pipeline (Suez–Mediterranean)',k:'oil',o:'EG',cust:[],via:[],r:['Sinai','Alexandria'],mb:2.0,byp:'Suez'},
  {id:'ag',n:'Arab Gas Pipeline',k:'gas',o:'EG',cust:['JO','SY'],via:[],r:['Sinai','Jordan','Damascus'],mb:.4},
  {id:'ig',n:'Iran–Iraq Power & Gas Link',k:'grid',o:'IR',cust:['IQ','RV'],via:[],r:['Khuzestan','Basra','Baghdad'],mb:.5}];
const GPIP_SAB=6,GPIP_REP=120,GPIP_OUT=4,GPIP_KIND={oil:'Oil',gas:'Gas',grid:'Power'};
function gpS(){if(!GC.pipe)GC.pipe={cut:{},mT:-1};return GC.pipe;}
function gpOwn(p){return GC.nat&&GC.nat[p.o]&&!GC.nat[p.o].dead;}
function gpProv(p){return p.r.map(n=>GCM.byName.get(n)).filter(i=>i!==undefined);}
// why a line is not flowing ('' = flowing): a sabotage outage, or a route province held by someone at war with the owner
function gpWhy(p){const S=gpS();if(!gpOwn(p))return 'Owner is gone.';const u=S.cut[p.id];if(u!==undefined&&u>=GC.turn)return 'Sabotaged — repairs finish in month '+u+'.';
  for(const i of gpProv(p)){const h=GC.prov[i].o;if(h&&h!==p.o&&grAtWar(h,p.o))return 'Route cut: '+GCM.P[i].n+' is held by '+gdNatName(h)+'.';}return '';}
function gpGuarded(p){const ps=new Set(gpProv(p));return GC.armies.some(a=>a.o===p.o&&ps.has(a.at));}
function gpCutN(c,role){let n=0;for(const p of GPIP){if(!gpWhy(p))continue;if(role==='own'?p.o===c:role==='cust'?(p.cust.includes(c)):(p.via.includes(c)))n++;}return n;}
function gpHormuzShut(n){const si=GCM.byName.get(n);if(si===undefined)return false;return !!(GC.eco&&GC.eco.cl&&GC.eco.cl[si])||(typeof geBlockaded==='function'&&!!geBlockaded(si));}
// oil price effect: -2 per mb/d of working bypass lines while their strait is shut (the lines soak up the shock), +2.5 per mb/d of any cut oil line
function gpOilDelta(){if(!GC||!GC.nat||typeof GCM==='undefined'||!GCM)return 0;let cut=0,byp=0;for(const p of GPIP){if(p.k!=='oil')continue;const w=gpWhy(p);if(w)cut+=2.5*p.mb;else if(p.byp&&gpHormuzShut(p.byp))byp+=2*p.mb;}return Math.round(Math.min(18,cut)-Math.min(6,byp));}   /* bypass lines soften a shut strait (+8) but never reverse it (realmap helper, grandtest "closed strait raises oil") */
GMOD_COND.pipe=(k,arg)=>{if(!GC||!GC.nat||!GC.nat[k])return false;if(arg==='own')return gpCutN(k,'own')>0;if(arg==='cust')return gpCutN(k,'cust')>0;if(arg==='via')return gpCutN(k,'via')>0;
  if(arg==='run'){let n=0;for(const p of GPIP)if(p.o===k){n++;if(gpWhy(p))return false;}return n>0;}return false;};
GMOD_ROWS.push(
  {id:'pip_own',src:'Export pipeline cut',scope:'nation',stat:'income',mul:.95,cond:'pipe:own'},{id:'pip_own_u',src:'Export pipeline cut',scope:'nation',stat:'unrest',add:1,cond:'pipe:own'},
  {id:'pip_cust',src:'Fuel/power cut off (pipeline or grid)',scope:'nation',stat:'income',mul:.97,cond:'pipe:cust'},{id:'pip_cust_u',src:'Blackouts and shortages',scope:'nation',stat:'unrest',add:2,cond:'pipe:cust'},
  {id:'pip_via',src:'Lost transit fees',scope:'nation',stat:'income',mul:.99,cond:'pipe:via'},
  {id:'pip_run',src:'Pipeline revenue',scope:'nation',stat:'income',mul:1.03,cond:'pipe:run'});
GMOD_STATS.unrest=GMOD_STATS.unrest||'Unrest';
function gpSabotage(by,id){const p=GPIP.find(x=>x.id===id),S=gpS();if(!p||!gpOwn(p)||by===p.o||!GC.nat[by]||GC.nat[by].dead)return 'Not available.';
  if(!grAtWar(by,p.o))return 'Only in a war against '+gdNatName(p.o)+'.';if(gpWhy(p))return 'Already not flowing.';const N=GC.nat[by];
  if(by===GC.me){if(!N.pp)N.pp={pol:0,dip:0,mil:0};if(N.pp.mil<GPIP_SAB)return 'Needs '+GPIP_SAB+' Military points.';N.pp.mil-=GPIP_SAB;}
  if(gpGuarded(p)){gdRel(p.o,by,-1);grLog('Saboteurs are caught near the '+p.n+' — '+gdNatName(p.o)+'\'s guards held the line.',by===GC.me||p.o===GC.me?GC.me:by);return '';}
  S.cut[p.id]=GC.turn+GPIP_OUT;gpAnger(p,by);
  grLog('The '+p.n+' is blown up — '+gdNatName(by)+' is blamed; '+gdNatName(p.o)+' loses its flow'+(p.cust.length?' and customers go dark':'')+'.',by===GC.me||p.o===GC.me||p.cust.includes(GC.me)?GC.me:by);return '';}
function gpRepair(c,id){const p=GPIP.find(x=>x.id===id),S=gpS();if(!p||p.o!==c)return 'Not yours.';const u=S.cut[p.id];if(u===undefined||u<GC.turn)return 'Nothing to repair.';const N=GC.nat[c];
  if(N.cash<GPIP_REP)return 'Needs $'+GPIP_REP+'.';N.cash-=GPIP_REP;delete S.cut[p.id];grLog(gdNatName(c)+' repairs the '+p.n+' for $'+GPIP_REP+'.',c);return '';}
function gpAnger(p,by){for(const c of p.cust)if(GC.nat[c]&&!GC.nat[c].dead&&c!==by)gdRel(c,by,-4);for(const v of p.via)if(GC.nat[v]&&!GC.nat[v].dead&&v!==by)gdRel(v,by,-2);}
function gpMonth(){if(!GC||!GC.nat||!GCM)return;const S=gpS();if(S.mT===GC.turn)return;S.mT=GC.turn;
  for(const id of Object.keys(S.cut))if(S.cut[id]<GC.turn)delete S.cut[id];
  for(const p of GPIP){if(!gpOwn(p))continue;const w=gpWhy(p);
    if(w&&/^Route cut/.test(w)&&(GC.turn+p.id.charCodeAt(0))%6===0&&(p.o===GC.me||p.cust.includes(GC.me)||p.via.includes(GC.me)))grLog('The '+p.n+' is shut: '+w,GC.me);}
  // AI: owners repair; nations at war sabotage the enemy line that hurts most, at most once per 4 months each
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||c===GC.me)continue;
    for(const p of GPIP)if(p.o===c&&S.cut[p.id]!==undefined&&N.cash>GPIP_REP*3)gpRepair(c,p.id);
    if((GC.turn+c.charCodeAt(0)+c.charCodeAt(1))%4!==0)continue;
    const t=GPIP.filter(p=>gpOwn(p)&&p.o!==c&&grAtWar(c,p.o)&&!gpWhy(p)).sort((a,b)=>b.mb-a.mb||(a.id<b.id?-1:1))[0];
    if(t&&(N.pp?N.pp.mil:99)>=GPIP_SAB){if(N.pp)N.pp.mil-=GPIP_SAB;gpSabotageAI(c,t);}}}
function gpSabotageAI(by,p){const S=gpS();if(gpGuarded(p)){gdRel(p.o,by,-1);return;}S.cut[p.id]=GC.turn+GPIP_OUT;gpAnger(p,by);
  grLog('The '+p.n+' is blown up — '+gdNatName(by)+' is blamed.',p.o===GC.me||p.cust.includes(GC.me)?GC.me:by);}
GMOD_HOOKS.push(gpMonth);
npTab('pipe','🛢','Pipelines & grids',(code,body,c)=>{const own=c.own&&code===GC.me;
  let h='<div style="opacity:.85;margin-bottom:8px">Oil and gas pipelines and the Iran–Iraq power link only flow while every province on the route is safe. A cut line costs its owner income, darkens its customers (unrest) and lifts the world oil price; lines that bypass Hormuz or Suez soften a closed strait. In a war you can blow up an enemy line ('+GPIP_SAB+' Military points, '+GPIP_OUT+' months) unless an army guards the route. World oil effect now: <b>'+(gpOilDelta()>=0?'+':'')+gpOilDelta()+'</b>.</div>';
  body.innerHTML=h;
  for(const p of GPIP){const w=gpWhy(p),mine=p.o===code||p.cust.includes(code)||p.via.includes(code);
    const row=document.createElement('div');row.style.cssText='margin:6px 0;padding:6px 8px;border:1px solid #2c4358;border-radius:4px;'+(mine?'':'opacity:.7');
    row.innerHTML='<b>'+p.n+'</b> · '+GPIP_KIND[p.k]+' · '+p.mb+' mb/d · owner '+gdNatName(p.o)+(p.cust.length?' · customers '+p.cust.map(gdNatName).join(', '):'')+(p.via.length?' · transit '+p.via.map(gdNatName).join(', '):'')+(p.byp?' · bypasses '+p.byp:'')+'<br><span style="color:'+(w?'#ff9d8e':'#8fd694')+'">'+(w?w:'Flowing'+(gpGuarded(p)?' · guarded by an army':''))+'</span>';
    if(own){const bar=document.createElement('div');bar.style.cssText='margin-top:4px';
      if(p.o===code&&GC.pipe&&GC.pipe.cut[p.id]!==undefined&&GC.pipe.cut[p.id]>=GC.turn)bar.appendChild(gpBtn('Repair $'+GPIP_REP,()=>{const e=gpRepair(code,p.id);if(e)alert(e);npOpen(code,'pipe');}));
      else if(!w&&p.o!==code&&grAtWar(code,p.o))bar.appendChild(gpBtn('Sabotage ('+GPIP_SAB+' Mil)',()=>{const e=gpSabotage(code,p.id);if(e)alert(e);npOpen(code,'pipe');}));
      if(bar.firstChild)row.appendChild(bar);}
    body.appendChild(row);}
});
function gpBtn(t,f){const b=document.createElement('button');b.textContent=t;b.style.cssText='font-size:14px;padding:3px 9px;cursor:pointer';b.onclick=f;return b;}
alAdd('pipecut','🛢','Pipeline cut',c=>{const n=GC&&GC.nat&&GC.nat[c]?gpCutN(c,'own')+gpCutN(c,'cust'):0;return n?{n,tip:'A pipeline or power link that serves us is cut — open the pipelines tab',go:()=>npOpen(c,'pipe')}:null;});
