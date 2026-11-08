// 13x-ginfl.js — lane B5b slice 1: INFLATION + ARMY UPKEEP SLIDER (EU4 economy), all as GMOD rows on the existing 'upkeep'/'income' stats
// (13g-grandeco reads them). N.infl = inflation % (0..30) from unpaid/defaulted war bonds and an empty treasury; falls slowly; Political points cut it.
// N.upk = army upkeep setting 0 lean / 1 normal / 2 full: lean = cheaper but slower rallying, full = dearer but faster rallying. Deterministic (state only).
const GIN_MAX=30,GIN_COST=40,GIN_STEP=1; // inflation bands are whole 5% steps
GMOD_COND.infl=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&Math.min(6,Math.floor((N.infl||0)/5))===+arg);};
GMOD_COND.upk=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&(N.upk===undefined?1:N.upk|0)===+arg);};
for(let b=1;b<=6;b++){const s='Inflation ('+(b*5)+'%+)';
  GMOD_ROWS.push({id:'infl_up'+b,src:s,scope:'nation',stat:'upkeep',mul:1+.05*b,cond:'infl:'+b},
    {id:'infl_inc'+b,src:s,scope:'nation',stat:'income',add:-.01*b,cond:'infl:'+b});}
GMOD_ROWS.push({id:'upk_lo_c',src:'Lean army upkeep',scope:'nation',stat:'upkeep',mul:.8,cond:'upk:0'},
  {id:'upk_lo_r',src:'Lean army upkeep',scope:'nation',stat:'rallySpeed',mul:.85,cond:'upk:0'},
  {id:'upk_hi_c',src:'Full army upkeep',scope:'nation',stat:'upkeep',mul:1.2,cond:'upk:2'},
  {id:'upk_hi_r',src:'Full army upkeep',scope:'nation',stat:'rallySpeed',mul:1.15,cond:'upk:2'});
GMOD_STATS.upkeep=GMOD_STATS.upkeep||'Army upkeep';GMOD_STATS.income=GMOD_STATS.income||'Income';
function ginN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.infl===undefined){N.infl=0;N.upk=1;}return N;}
function ginCut(c){const N=ginN(c);if(!N||!N.pp)return 'Not available.';if(N.infl<=0)return 'There is no inflation.';
  if(N.pp.pol<GIN_COST)return 'Needs '+GIN_COST+' Political points.';N.pp.pol-=GIN_COST;N.infl=Math.max(0,N.infl-5);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Austerity measures cut inflation to '+Math.round(N.infl)+'%.',c);return '';}
function ginSet(c,v){const N=ginN(c);if(!N)return;N.upk=Math.max(0,Math.min(2,v|0));GMOD_C.cache.clear();}
function ginPressure(c){const N=GC.nat[c],E=N.e||{},out=[];const nb=(E.bonds||[]).length;
  if(nb)out.push([nb+' war bond'+(nb>1?'s':'')+' outstanding',.4*nb]);
  if(E.defT>GC.turn)out.push(['Recent default',1.5]);
  if(N.cash<=0&&(N.inc||0)<0)out.push(['Printing money to cover the deficit',1.5]);
  if(!out.length)out.push(['Prices settle',-.3]);return out;}
function ginMonth(){if(!GC)return;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;ginN(c);if(N.inT===GC.turn)continue;N.inT=GC.turn;
    N.infl=Math.max(0,Math.min(GIN_MAX,N.infl+ginPressure(c).reduce((s,x)=>s+x[1],0)));
    if(c!==GC.me){if(N.infl>=10&&N.pp&&N.pp.pol>=GIN_COST+40)ginCut(c);}}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(ginMonth);
npTab('fin','🏦','Finance',(code,body,c)=>{const N=ginN(code),own=c.own&&code===GC.me,inf=Math.round(N.infl*10)/10,u=N.upk|0;
  const col=inf<5?'#8fd18f':inf<15?'#e8d27a':'#ff9a8a';
  let h='<div style="font-size:26px;margin-bottom:6px"><b style="color:'+col+'">Inflation '+inf+'%</b></div>'+
   '<div style="opacity:.85;margin-bottom:8px">Every 5% raises army upkeep by 5% and trims income by 1%. War bonds left unpaid, defaults and an empty treasury push it up; calm months and austerity bring it down.</div>'+
   '<div style="margin:8px 0"><b>This month:</b> '+ginPressure(code).map(x=>x[0]+' ('+(x[1]>0?'+':'')+x[1]+')').join(', ')+'</div>'+
   '<div style="margin:12px 0 4px"><b>Army upkeep:</b> <span style="opacity:.85">'+['Lean — 20% cheaper, slower rallying','Normal','Full — 20% dearer, faster rallying'][u]+'</span></div>';
  const L=gmodLines('nation',code,'upkeep');if(L.length)h+='<div style="margin:8px 0;opacity:.85"><b>Upkeep modifiers:</b><br>'+L.join('<br>')+'</div>';
  body.innerHTML=h;
  if(own){const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;margin:6px 0 12px';
    ['Lean','Normal','Full'].forEach((t,i)=>{const b=document.createElement('button');b.textContent=t;b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer'+(i===u?';outline:2px solid #e8d27a':'');b.onclick=()=>{ginSet(code,i);npDraw();};row.appendChild(b);});body.appendChild(row);
    const b=document.createElement('button');b.textContent='Austerity: -5% inflation (-'+GIN_COST+' Political points)';b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';
    b.disabled=N.infl<=0||!N.pp||N.pp.pol<GIN_COST;b.onclick=()=>{const e=ginCut(code);if(e)grLog(e,code);npDraw();};body.appendChild(b);
    const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Political points: '+Math.floor(N.pp?N.pp.pol:0);body.appendChild(p);}});
alAdd('infl','🏦','Inflation',c=>{const N=ginN(c);return N&&N.infl>=10?{n:Math.round(N.infl)+'%',tip:'inflation is high — open the Finance tab',go:()=>npOpen(c,'fin')}:null;});
