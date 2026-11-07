// THE NATION PANEL (lane B2): ONE tabbed window for running a nation, EU4-style. Later grand stages add their screen with a single
// register call: npTab(id, icon, title, render(code, body, ctx)). Tabs are listed in `order`; a tab shows only if its `show(code)` (optional) is true.
// Header on every tab: flag, name, power tier, morale style, stat grid. Own nation = full view; another nation's flag = read-only.
const NP={tabs:[],cur:'eco',code:null};
const NP_HDR=[];
function npTab(id,icon,title,render,show){const i=NP.tabs.findIndex(t=>t.id===id);const t={id,icon,title,render,show};if(i>=0)NP.tabs[i]=t;else NP.tabs.push(t);}
function npClose(){const e=document.getElementById('npWin');if(e){e.remove();return true;}return false;}
function npOpen(code,tab){if(!GC)return;code=code||GC.me;if(!code||!GC.nat[code])return;if(document.getElementById('npWin')&&NP.code===code&&!tab){npClose();return;}NP.code=code;if(tab)NP.cur=tab;npDraw();}
function npStat(code){const N=GC.nat[code],E=N.e||{},ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===code);let army=0,men=0;for(const a of GC.armies)if(a.o===code){army+=grArmyVal(a);men+=a.u.length;}
  return {N,E,ps,army:Math.round(army),men,prov:ps.length};}
function npDraw(){npClose();if(!GC||!NP.code)return;const code=NP.code,own=code===GC.me,S=npStat(code),nat=grNat(code),nm=GCM.nats.get(code).name;
  const w=guEl('div','position:fixed;left:50%;top:54px;transform:translateX(-50%);width:min(980px,96vw);max-height:calc(100vh - 80px);display:flex;flex-direction:column;z-index:8400;background:#101c2a;border:1px solid #5a7a96;border-radius:10px;color:#e8e4d8;font-size:16px;box-shadow:0 8px 40px rgba(0,0,0,.6)');w.id='npWin';
  const st=MSTYLES[MORALE_STYLE[nat.fac]||MORALE_STYLE[code]];
  const hd=guEl('div','display:flex;gap:16px;align-items:center;padding:12px 16px;border-bottom:1px solid #2c4258;background:#16273a;border-radius:10px 10px 0 0;flex-wrap:wrap');
  hd.appendChild(guEl('div','width:56px;height:38px;border-radius:5px;border:2px solid #fff;background:'+nat.color));
  hd.appendChild(guEl('div','min-width:190px','<div style="font-size:22px;font-weight:bold">'+nm+'</div><div style="opacity:.8;font-size:14px">'+grRealClass(code)+(st?' · '+st.n+' morale':'')+(own?' · you':' · read-only')+'</div>'));
  const g=guEl('div','display:flex;gap:6px 18px;flex-wrap:wrap;font-size:15px;flex:1');
  const stat=(i,l,v,tip)=>{const d=guEl('div','white-space:nowrap','<span title="'+tip+'">'+i+' '+l+' <b>'+v+'</b></span>');g.appendChild(d);};
  stat('💰','Cash',Math.round(S.N.cash).toLocaleString()+' ('+geSgn(S.N.inc||0)+'/month)','Money in the bank and net income per month');
  stat('🛢','Fuel',Math.round(S.E.fuel||0),'Fuel stock: vehicles and aircraft stall without it');
  stat('🌾','Food',Math.round(S.E.food||0),'Food stock: hunger costs you troops and loyalty');
  stat('👥','Manpower',Math.round(S.E.man||0),'Recruits available to raise new units');
  stat('⚔','Army',S.army.toLocaleString()+' ('+S.men+' units)','Total value of your armies on the map');
  stat('🗺','Provinces',S.prov,'Provinces you hold');stat('★','Score',grScore(code),'Campaign score');
  for(const f of NP_HDR)try{f(code,stat);}catch(_){}
  hd.appendChild(g);const x=guEl('button','padding:6px 12px;border-radius:6px;border:1px solid #6b7a8a;background:transparent;color:#dfe8f0;cursor:pointer;font-size:15px','Close ✕');x.type='button';x.onclick=npClose;hd.appendChild(x);w.appendChild(hd);
  const tabs=NP.tabs.filter(t=>!t.show||t.show(code));if(!tabs.some(t=>t.id===NP.cur)&&tabs.length)NP.cur=tabs[0].id;
  const tb=guEl('div','display:flex;gap:4px;padding:8px 12px 0;border-bottom:1px solid #2c4258;flex-wrap:wrap');
  for(const t of tabs){const on=t.id===NP.cur;const b=guEl('button','padding:8px 14px;border-radius:7px 7px 0 0;border:1px solid '+(on?'#c9a35a':'#34506a')+';border-bottom:none;background:'+(on?'#2a3a4c':'#15222f')+';color:'+(on?'#ffe6a8':'#c8d4e0')+';cursor:pointer;font-size:15px','<span style="font-size:18px">'+t.icon+'</span> '+t.title);b.type='button';b.title=t.title;b.onclick=()=>{NP.cur=t.id;npDraw();};tb.appendChild(b);}
  w.appendChild(tb);const body=guEl('div','padding:14px 18px;overflow:auto;line-height:1.55;min-height:260px');w.appendChild(body);
  const cur=tabs.find(t=>t.id===NP.cur);try{if(cur)cur.render(code,body,{own,S});}catch(e){body.textContent='Tab error: '+e.message;console.error('npTab',e);}
  (document.getElementById('grandScreen')||document.body).appendChild(w);}
if(!window._npKeys){window._npKeys=1;addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('npWin')){ev.stopPropagation();ev.preventDefault();npClose();}},true);}
// ---- helpers
function npTable(body,head,rows,onRow){const t=guEl('table','width:100%;border-collapse:collapse;font-size:15px');t.innerHTML='<tr>'+head.map(h=>'<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #34506a;opacity:.8">'+h+'</th>').join('')+'</tr>';
  for(const r of rows){const tr=guEl('tr','cursor:'+(onRow?'pointer':'default'));tr.innerHTML=r.cells.map(c=>'<td style="padding:5px 8px;border-bottom:1px solid #1f3246">'+c+'</td>').join('');if(onRow)tr.onclick=()=>onRow(r);tr.onmouseenter=()=>{tr.style.background='#1d3248';};tr.onmouseleave=()=>{tr.style.background='';};t.appendChild(tr);}body.appendChild(t);}
function npFly(pi){npClose();try{guCentre(pi,2.4);guRedraw();}catch(e){}}
// ---- tabs for systems that exist today (order = tab order)
npTab('eco','💰','Economy',(code,body,c)=>{const N=c.S.N,E=c.S.E;let h='<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;max-width:640px">'+geRow('Cash','$'+Math.round(N.cash).toLocaleString())+geRow('Income per month',geSgn(N.inc||0))+geRow('Fuel',Math.round(E.fuel||0),E.dry?'#ff9d8e':'')+geRow('Food',Math.round(E.food||0),E.starve?'#ff9d8e':'')+geRow('Manpower',Math.round(E.man||0))+geRow('Oil price index',GC.eco?GC.eco.oilIdx:'-')+'</div>';
  body.innerHTML=h;if(c.own){const b=guEl('button','margin-top:14px;padding:8px 16px;border-radius:6px;border:1px solid #c9a35a;background:#3a3020;color:#ffe6a8;cursor:pointer;font-size:15px','Open the full budget (bonds, buildings, trade, home front) ▸');b.type='button';b.onclick=()=>{npClose();geUiPanel();};body.appendChild(b);}});
npTab('dip','🤝','Diplomacy',(code,body)=>{const al=[],en=[],rows=[];for(const c of Object.keys(GC.nat)){if(c===code||GC.nat[c].dead)continue;const o=grOpinion(code,c),w=grAtWar(code,c),a=grAllied(code,c);if(w)en.push(c);else if(a)al.push(c);rows.push({c,o,cells:['<b>'+GCM.nats.get(c).name+'</b>',w?'<span style="color:#ff9d8e">At war</span>':a?'<span style="color:#9fe39f">Allied</span>':'Peace','<b style="color:'+(o>=25?'#9fe39f':o<=-25?'#ff9d8e':'#e8e4d8')+'">'+(o>0?'+':'')+o+'</b>']});}
  rows.sort((a,b)=>Math.abs(b.o)-Math.abs(a.o)||(a.c<b.c?-1:1));const nm=c=>GCM.nats.get(c).name;
  body.innerHTML='<div style="margin-bottom:10px"><b>Enemies:</b> '+(en.map(nm).join(', ')||'none')+'<br><b>Allies:</b> '+(al.map(nm).join(', ')||'none')+'<br><b>Blocs:</b> '+((GC.alz||[]).filter(x=>x[1].includes(code)).map(x=>x[0]).join(', ')||'none')+'</div><div style="opacity:.7;font-size:13px;margin-bottom:6px">Read-only for now - treaties and actions arrive with the Diplomacy stage. Opinion -100 to +100.</div>';
  npTable(body,['Nation','Status','Opinion'],rows.slice(0,40));});
npTab('mil','⚔','Military',(code,body,c)=>{const as=GC.armies.filter(a=>a.o===code);const rows=as.map(a=>({pi:a.at,cells:['<b>'+a.nm+'</b>',GCM.P[a.at].n,a.u.length+' units',Math.round(grArmyVal(a)).toLocaleString(),a.sup?'<span style="color:#ff9d8e">out of supply</span>':'ok']}));
  body.innerHTML='<div style="margin-bottom:8px">'+as.length+' armies · '+c.S.men+' units · total value '+c.S.army.toLocaleString()+'. Click an army to fly the map there.</div>';npTable(body,['Army','Location','Units','Value','Supply'],rows,r=>npFly(r.pi));},code=>true);
npTab('prov','🏙','Provinces',(code,body,c)=>{const rows=c.S.ps.map(p=>{const s=GC.prov[p.i];return {pi:p.i,k:p.dev,cells:['<b>'+p.n+'</b>'+(p.cap?' ★':''),p.t,s.tax,s.un,s.gar.length]};}).sort((a,b)=>b.k-a.k);
  body.innerHTML='<div style="margin-bottom:8px">'+rows.length+' provinces, richest first. Click to fly there.</div>';npTable(body,['Province','Terrain','Tax','Unrest','Garrison'],rows,r=>npFly(r.pi));});
npTab('led','📊','Ledger',(code,body)=>{const rows=[];for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead||!grNat(c).major)continue;const S=npStat(c);rows.push({c,k:S.army,cells:['<b>'+GCM.nats.get(c).name+(c===code?' ◀':'')+'</b>',grRealClass(c),S.prov,Math.round(N.cash).toLocaleString(),S.army.toLocaleString(),grScore(c)]});}
  rows.sort((a,b)=>b.k-a.k);body.innerHTML='<div style="margin-bottom:8px">Every living major nation, strongest army first. Click to open its panel.</div>';npTable(body,['Nation','Tier','Provinces','Cash','Army','Score'],rows,r=>{NP.code=r.c;npDraw();});});
