/* ---------- Spy UI (orch/reports/politics-intel.md): the Infiltrator's command card + right-click jobs. The rules live in 03e-politics.js. */
const SPY_LBL={steal:['Steal funds','Right-click an enemy HQ: take up to 15% of their money (max $2000).'],
  upg:['Steal research','Right-click an enemy HQ, barracks, factory, airfield or Strike Center: copy their priciest upgrade that you lack.'],
  sab:['Sabotage','Right-click an enemy power plant or Strike Center: knocked out for about 75 s.']};
let SPYM=null;
function spyCard(s){const d=document.createElement('div');d.className='tunlist';d.style.marginTop='6px';const sp=s.filter(u=>!u.isB&&u.kind==='spy'&&u.team===ME);const cd=Math.max(0,Math.ceil(Math.max(...sp.map(u=>(u.spCd||0)))-G.t));
  d.innerHTML='<b>Infiltrator</b> <span style="opacity:.8;font-size:12px">disguised until it acts or enemy infantry spots it'+(MODE!=='client'&&cd>0?' &middot; lying low '+cd+' s':'')+'</span>';
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-top:4px';
  for(const k of Object.keys(SPY_LBL)){const b=document.createElement('button');b.className='btn';b.style.cssText='flex:1 1 45%;min-height:34px;'+(SPYM===k?'outline:2px solid #e3b341':'');b.textContent=SPY_LBL[k][0];b.title=SPY_LBL[k][1];
    b.onpointerdown=ev=>{ev.preventDefault();SPYM=SPYM===k?null:k;updateUI();};row.append(b);}
  const t=document.createElement('div');t.style.cssText='font-size:12px;margin-top:4px;opacity:.9';t.textContent=SPYM?SPY_LBL[SPYM][1]:'Right-click a target: HQ = steal funds, other buildings = steal research, power plant / Strike Center = sabotage. Pick a job above to force it.';
  d.append(row,t);return d;}
// right-click while spies are selected: send them on a job. Returns true when the order was a spy job and nothing else was selected.
function spyIssue(w,t,units){const sp=units.filter(u=>u.kind==='spy');if(!sp.length)return false;let a=null;const ids=sp.map(u=>u.id);
  if(t&&t.isB&&!ally(t.team,ME)&&t.kind!=='garrison'){const ok={steal:['hq'],upg:['hq','barracks','factory','airfield','uplink'],sab:['uplink']};let k=SPYM&&ok[SPYM].includes(t.kind)?SPYM:(t.kind==='hq'?'steal':t.kind==='uplink'?'sab':ok.upg.includes(t.kind)?'upg':null);if(k)a={t:'spy',ids,k,tid:t.id,x:t.x,y:t.y};}
  else if(!t){const oi=G.oil.findIndex(o=>o.pw&&!o.dead&&o.owner>=0&&!ally(o.owner,ME)&&Math.hypot(o.x-w.x,o.y-w.y)<42);
    if(oi>=0)a={t:'spy',ids,k:'sabo',fi:oi,x:G.oil[oi].x,y:G.oil[oi].y};}
  if(!a)return false;doAct(a);if(typeof speak==='function')speak(1);if(typeof markT==='function')markT(a.x,a.y,28);return units.every(u=>u.kind==='spy');}
