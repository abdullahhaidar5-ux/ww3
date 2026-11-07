// 13zp-gautonomy.js — lane B5b slice 4: PROVINCE AUTONOMY (EU4 economy). st.au = 0..100 per province, saved with GC.prov. All effects are GMOD rows (nation scope, banded).
// Who reacts: a freshly conquered or non-core province starts at 40% autonomy (locals run their own affairs); it drifts down 1 point a month (2 if core, 0 while stability <= -1).
// Second order: the nation's dev-weighted average autonomy cuts income and recruits but also calms unrest (self-rule). Counter-play: pay Political points to cut one province by 10
// (cost grows with its development); the AI does it when it has spare points. Cost: reduced income/manpower until you pay. Deterministic (state only), monthly via GMOD_HOOKS.
const GAU_COST=25,GAU_NEW=40;
GMOD_COND.au=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&Math.min(5,Math.floor(gauAvg(k)/8))===+arg);};
for(let b=1;b<=5;b++){const s='Provincial autonomy ('+(b*8)+'%+ average)';
  GMOD_ROWS.push({id:'au_inc'+b,src:s,scope:'nation',stat:'income',add:-.012*b,cond:'au:'+b},
    {id:'au_man'+b,src:s,scope:'nation',stat:'manpower',mul:1-.04*b,cond:'au:'+b},
    {id:'au_un'+b,src:s,scope:'nation',stat:'unrest',add:-.5*b,cond:'au:'+b});}
GMOD_STATS.unrest=GMOD_STATS.unrest||'Unrest';
function gauSt(pi){const st=GC.prov[pi];if(st.au===undefined){st.au=0;st.auO=st.o;}return st;}
function gauAvg(c){const k='au'+c;if(GC.auC&&GC.auC.t===GC.turn&&GC.auC[k]!==undefined)return GC.auC[k];
  let s=0,w=0;for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.o!==c)continue;const d=p.dev||1;s+=d*(st.au||0);w+=d;}
  const v=w?s/w:0;if(!GC.auC||GC.auC.t!==GC.turn)GC.auC={t:GC.turn};GC.auC[k]=v;return v;}
function gauCost(pi){return Math.round(GAU_COST*(1+(GCM.P[pi].dev||1)/15));}
function gauCut(c,pi){const N=GC.nat[c],st=GC.prov[pi];if(!N||!st||st.o!==c)return 'Not your province.';gauSt(pi);if(st.au<=0)return 'No autonomy to remove.';
  const cost=gauCost(pi);if(!N.pp||N.pp.pol<cost)return 'Needs '+cost+' Political points.';N.pp.pol-=cost;st.au=Math.max(0,st.au-10);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Cut autonomy in '+GCM.P[pi].n+' to '+st.au+'%.',c);return '';}
function gauMonth(){if(!GC)return;for(const p of GCM.P){if(!p.land)continue;const st=gauSt(p.i);
    if(st.auO!==st.o){st.auO=st.o;st.au=(typeof gsIsCore==='function'?gsIsCore(st):st.o===st.o0)?0:GAU_NEW;}   // new owner: locals keep their own rule
    else if(st.au>0){const N=GC.nat[st.o],core=typeof gsIsCore==='function'?gsIsCore(st):true;if(!N||(N.stab|0)>-1)st.au=Math.max(0,st.au-(core?2:1));}}
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||c===GC.me||!N.pp||N.pp.pol<GAU_COST+60)continue;
    let best=-1,bv=9;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&(GC.prov[p.i].au||0)>bv){bv=GC.prov[p.i].au;best=p.i;}
    if(best>=0&&N.pp.pol>=gauCost(best)+60)gauCut(c,best);}
  GC.auC=null;GMOD_C.cache.clear();}
GMOD_HOOKS.push(gauMonth);
npTab('au','🏳','Autonomy',(code,body,c)=>{const N=GC.nat[code],own=c.own&&code===GC.me,v=Math.round(gauAvg(code)*10)/10;
  let h='<div style="font-size:26px;margin-bottom:6px"><b>Average autonomy '+v+'%</b></div>'+
   '<div style="opacity:.85;margin-bottom:8px">Every 8% of average autonomy trims income by 1.2% and recruits by 4%, but calms unrest. Conquered and non-core provinces start at '+GAU_NEW+'% and slowly settle down; core provinces settle twice as fast. Pay Political points to cut a province by 10%.</div>';
  const L=['income','manpower','unrest'].flatMap(s=>gmodLines('nation',code,s)).filter(s=>/autonomy/.test(s));if(L.length)h+='<div style="margin:8px 0;opacity:.85">'+L.join('<br>')+'</div>';
  body.innerHTML=h;
  const ps=c.S.ps.map(p=>({p,au:gauSt(p.i).au})).filter(x=>x.au>0).sort((a,b)=>b.au-a.au||a.p.i-b.p.i).slice(0,14);
  if(!ps.length){body.appendChild(document.createTextNode('No province has any autonomy.'));return;}
  const tbl=document.createElement('table');tbl.style.cssText='width:100%;border-collapse:collapse;font-size:15px';tbl.innerHTML='<tr><th style="text-align:left;padding:4px 8px">Province</th><th>Autonomy</th><th></th></tr>';
  for(const x of ps){const tr=document.createElement('tr');tr.innerHTML='<td style="padding:4px 8px"><b>'+x.p.n+'</b></td><td style="text-align:center">'+x.au+'%</td>';const td=document.createElement('td');td.style.textAlign='center';
    if(own){const b=document.createElement('button');b.textContent='-10% ('+gauCost(x.p.i)+')';b.style.cssText='font-size:13px;cursor:pointer;padding:1px 6px';b.disabled=!N.pp||N.pp.pol<gauCost(x.p.i);
      b.onclick=()=>{const e=gauCut(code,x.p.i);if(e)grLog(e,code);npDraw();};td.appendChild(b);}tr.appendChild(td);tbl.appendChild(tr);}
  body.appendChild(tbl);});
