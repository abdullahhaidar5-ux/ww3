// THE NATION WINDOW (lane B2; six groups since camphud): ONE window for running a nation, EU4-style. A grand stage adds its screen with a single
// register call: npTab(id, icon, title, render(code, body, ctx)); a screen shows only if its `show(code)` (optional) is true.
// camphud (Abdullah 2026-11-11 19:28, photo of ~36 tabs: "Ugly"; layout "Go"): the screens sit in SIX groups, one job per screen -
// Overview · Government · Economy · Military · Diplomacy · World. A group's screens are a short list on the left. Nothing was deleted
// or duplicated: every screen id is in exactly one group (NP_GROUPS; a new id that is not listed lands in World until it is given a home).
// The window remembers the last screen (also per group, and across visits); Esc goes one step back (a nation opened from the ledger -> your
// own), then closes. Own nation = full view; another nation's flag = read-only. Guards: orch/decisions.mjs (camphud).
const NP={tabs:[],cur:'ov',code:null,last:{},back:[]};
const NP_HDR=[];
const NP_GROUPS=[
  {id:'over',t:'Overview',d:'Who you are: score, provinces, leader, goals',tabs:['ov','ldr','mis','prov','mods','ach']},
  {id:'gov',t:'Government',d:'Politics, estates, laws and decisions',tabs:['gov','dec','estates','idea','stab','home','prop','elect','cor','au','res']},
  {id:'eco',t:'Economy',d:'Budget, trade, industry and resources',tabs:['eco','fin','trade','mkt','dev','pipe']},
  {id:'mil',t:'Military',d:'Armies, supply, mobilization, arms and intelligence',tabs:['mil','sup','mob','arms','cov','nuke']},
  {id:'dip',t:'Diplomacy',d:'Relations, alliances, coalitions, subjects and the UN',tabs:['dip','coal','subj','un']},
  {id:'world',t:'World',d:'Ledger, great powers and graphs',tabs:['led','gp','gr']}];
const NP_NAME={ov:'Summary',eco:'Budget',dip:'Relations',mil:'Armies',gov:'People in power'};   /* a screen named like its group gets a plainer name in the list */
function npGrpOf(id){const g=NP_GROUPS.find(g=>g.tabs.includes(id));return g?g.id:'world';}
function npOrd(id){const g=NP_GROUPS.find(g=>g.tabs.includes(id));return g?g.tabs.indexOf(id):99;}
function npVis(code){return NP.tabs.filter(t=>!t.show||t.show(code));}
function npIn(gid,code){return npVis(code).filter(t=>npGrpOf(t.id)===gid).sort((a,b)=>npOrd(a.id)-npOrd(b.id));}
function npTitle(t){return NP_NAME[t.id]||t.title;}
function npTab(id,icon,title,render,show){const i=NP.tabs.findIndex(t=>t.id===id);const t={id,icon,title,render,show};if(i>=0)NP.tabs[i]=t;else NP.tabs.push(t);}
function npClose(){const e=document.getElementById('npWin');if(e){e.remove();return true;}return false;}
function npOpen(code,tab){if(!GC)return;code=code||GC.me;if(!code||!GC.nat[code])return;if(document.getElementById('npWin')&&NP.code===code&&!tab){npClose();return;}if(NP.code!==code||!document.getElementById('npWin'))NP.back=[];NP.code=code;if(tab)NP.cur=tab;npDraw();}
/* open a group at the screen you last used in it */
function npGroup(gid){const ts=npIn(gid,NP.code);if(!ts.length)return;NP.cur=ts.some(t=>t.id===NP.last[gid])?NP.last[gid]:ts[0].id;npDraw();}
/* look at another nation from inside the window (ledger, great powers): Back / Esc returns to where you were */
function npGo(code){if(!GC||!GC.nat[code]||code===NP.code)return;NP.back.push([NP.code,NP.cur]);NP.code=code;NP.cur='ov';npDraw();}
function npBack(){const b=NP.back.pop();if(!b||!document.getElementById('npWin'))return false;NP.code=b[0];NP.cur=b[1];npDraw();return true;}
function npRemember(){try{localStorage.setItem('ww3_np',JSON.stringify({cur:NP.cur,last:NP.last}));}catch(e){}}
try{const m=JSON.parse(localStorage.getItem('ww3_np')||'null');if(m&&typeof m.cur==='string'){NP.cur=m.cur;if(m.last&&typeof m.last==='object')NP.last=m.last;}}catch(e){}
function npStat(code){const N=GC.nat[code],E=N.e||{},ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===code);let army=0,men=0;for(const a of GC.armies)if(a.o===code){army+=grArmyVal(a);men+=a.u.length;}
  return {N,E,ps,army:Math.round(army),men,prov:ps.length};}
function npCss(){if(document.getElementById('npCss'))return;const s=document.createElement('style');s.id='npCss';s.textContent=`
#npWin{position:fixed;left:50%;top:54px;transform:translateX(-50%);width:min(1040px,96vw);height:min(680px,calc(100vh - 80px));display:flex;flex-direction:column;z-index:8400;background:#101c2a;border:1px solid #5a7a96;border-radius:10px;color:#e8e4d8;font-size:16px;box-shadow:0 8px 40px rgba(0,0,0,.6)}
#npWin .nph{display:flex;gap:14px;align-items:center;padding:12px 18px 10px;flex:none}
#npWin .npf{width:54px;height:36px;border-radius:4px;border:1px solid #e8e4d8;overflow:hidden;flex:none}#npWin .npf canvas{width:100%;height:100%;display:block}
#npWin .npn{font-size:21px;font-weight:700}#npWin .nps{opacity:.75;font-size:14px;margin-top:2px}
#npWin .npb{margin-left:8px;padding:5px 12px;border-radius:6px;border:1px solid #3d5a73;background:transparent;color:#dfe8f0;font-size:14px;cursor:pointer}#npWin .npb:hover{border-color:#c9a35a;color:#ffe6a8}
#npGroups{display:flex;gap:4px;padding:0 14px;border-bottom:1px solid #2c4258;flex:none}
#npGroups button{padding:9px 16px 8px;border:0;border-bottom:3px solid transparent;border-radius:0!important;background:transparent;color:#b9c7d5;font-size:16px;font-weight:600;letter-spacing:.03em;cursor:pointer;transition:color .15s,border-color .15s}
#npGroups button:hover{color:#fff}#npGroups button.on{color:#ffe6a8;border-bottom-color:#c9a35a}#npGroups button:disabled{opacity:.35;cursor:default}
#npWin .npm{display:flex;flex:1;min-height:0}
#npList{width:214px;flex:none;display:flex;flex-direction:column;gap:1px;padding:10px 8px;border-right:1px solid #2c4258;overflow:auto;background:#0d1824;border-radius:0 0 0 10px}
#npList .npd{font-size:12.5px;line-height:1.35;opacity:.6;padding:0 8px 8px}
#npList button{display:flex;align-items:center;gap:9px;text-align:left;padding:8px 10px;border:0;border-left:3px solid transparent;border-radius:0 5px 5px 0!important;background:transparent;color:#c8d4e0;font-size:15px;cursor:pointer;transition:background .15s,color .15s}
#npList button i{font-style:normal;width:20px;text-align:center;flex:none;opacity:.9}
#npList button:hover{background:#17283a;color:#fff}#npList button.on{background:#1d3248;color:#ffe6a8;border-left-color:#c9a35a;font-weight:600}
#npBody{flex:1;min-width:0;padding:14px 20px 18px;overflow:auto;line-height:1.55;animation:npIn .14s ease-out}
#npBody .nph2{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#d8b865;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #2c4258}#npBody .nph2:first-child{margin-top:0}
#npBody .npg2{display:grid;grid-template-columns:1fr 1fr;gap:4px 34px;max-width:680px}
#npBody .npl2{color:#ffe6a8;cursor:pointer;border-bottom:1px dotted #c9a35a}#npBody .npl2:hover{color:#fff}
@keyframes npIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`;document.head.appendChild(s);}
function npDraw(){npClose();if(!GC||!NP.code)return;npCss();const code=NP.code,own=code===GC.me,S=npStat(code),nat=grNat(code),nm=GCM.nats.get(code).name;
  const vis=npVis(code);if(!vis.some(t=>t.id===NP.cur)&&vis.length)NP.cur=(vis.find(t=>t.id==='ov')||vis[0]).id;
  const gid=npGrpOf(NP.cur);NP.last[gid]=NP.cur;npRemember();
  const w=guEl('div','');w.id='npWin';
  const st=MSTYLES[MORALE_STYLE[nat.fac]||MORALE_STYLE[code]];
  const hd=guEl('div','');hd.className='nph';const fl=guEl('div','');fl.className='npf';fl.style.background=nat.color;try{fl.appendChild(esFlagEl(nat.fac,54,36));}catch(e){}hd.appendChild(fl);
  hd.appendChild(guEl('div','','<div class="npn">'+nm+'</div><div class="nps">'+grRealClass(code)+(st?' · '+st.n+' morale':'')+(own?' · you':' · read-only')+'</div>'));
  if(NP.back.length){const bk=NP.back[NP.back.length-1][0],b=guEl('button','','‹ Back to '+GCM.nats.get(bk).name);b.type='button';b.className='npb';b.title='Back (Esc)';b.onclick=()=>npBack();hd.appendChild(b);}
  w.appendChild(hd);
  const gb=guEl('div','');gb.id='npGroups';for(const g of NP_GROUPS){const has=npIn(g.id,code).length>0,b=guEl('button','',g.t);b.type='button';b.dataset.g=g.id;b.title=g.d;if(g.id===gid)b.className='on';if(!has)b.disabled=true;b.onclick=()=>npGroup(g.id);gb.appendChild(b);}
  w.appendChild(gb);
  const m=guEl('div','');m.className='npm';const ls=guEl('div','');ls.id='npList';const G=NP_GROUPS.find(g=>g.id===gid);ls.appendChild(Object.assign(guEl('div','',G.d),{className:'npd'}));
  for(const t of npIn(gid,code)){const b=guEl('button','','<i>'+t.icon+'</i><span>'+npTitle(t)+'</span>');b.type='button';b.dataset.t=t.id;if(t.id===NP.cur)b.className='on';b.onclick=()=>{NP.cur=t.id;npDraw();};ls.appendChild(b);}
  m.appendChild(ls);const body=guEl('div','');body.id='npBody';m.appendChild(body);w.appendChild(m);
  const cur=vis.find(t=>t.id===NP.cur);try{if(cur)cur.render(code,body,{own,S});}catch(e){body.textContent='Tab error: '+e.message;console.error('npTab',e);}
  (document.getElementById('grandScreen')||document.body).appendChild(w);}
/* Esc + the close X: src/13zzz-gpanels.js */
// ---- helpers
function npTable(body,head,rows,onRow){const t=guEl('table','width:100%;border-collapse:collapse;font-size:15px');t.innerHTML='<tr>'+head.map(h=>'<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #34506a;opacity:.8">'+h+'</th>').join('')+'</tr>';
  for(const r of rows){const tr=guEl('tr','cursor:'+(onRow?'pointer':'default'));tr.innerHTML=r.cells.map(c=>'<td style="padding:5px 8px;border-bottom:1px solid #1f3246">'+c+'</td>').join('');if(onRow)tr.onclick=()=>onRow(r);tr.onmouseenter=()=>{tr.style.background='#1d3248';};tr.onmouseleave=()=>{tr.style.background='';};t.appendChild(tr);}body.appendChild(t);}
function npFly(pi){npClose();try{guCentre(pi,2.4);guRedraw();}catch(e){}}
// ---- Overview › Summary: who you are. Score, provinces and stars moved here from the top bar (camphud).
npTab('ov','★','Summary',(code,body,c)=>{const N=c.S.N,E=c.S.E,row=(l,v,col)=>'<div style="display:flex;justify-content:space-between;gap:10px"><span style="opacity:.8">'+l+'</span><b'+(col?' style="color:'+col+'"':'')+'>'+v+'</b></div>';
  let ld='';try{const k=typeof ldrId==='function'?ldrId(code):null;ld=k?ldrName(k):(typeof pplRoster==='function'?pplName(pplRoster(code).leader):'');}catch(e){}ld=String(ld||'').replace(/^(.+?) \1 /,'$1 ');
  const fl=typeof grFL==='function'?grFL(code):0,stab=N.stab===undefined?null:(N.stab|0);
  let h='<div class="nph2">Standing</div><div class="npg2">'+row('Score',grScore(code))+row('Provinces',c.S.prov)+row('Army tradition','★ '+Math.round(N.trad||0)+' / 100')+(stab===null?'':row('Stability',(stab>0?'+':'')+stab,stab<0?'#ff9d8e':''))
    +'</div><div style="max-width:680px;margin-top:4px">'+(ld?row('Leader',ld):'')+row('Campaign',grDateStr(GC.turn,GC.day|0)+' · month '+Math.min(GC.turn,GC.maxTurn)+' of '+GC.maxTurn+(GC.len==='quick'?' (Quick)':''))+'</div>';
  h+='<div class="nph2">Strength and stocks</div><div class="npg2" id="npOvS">'+row('Cash','$'+Math.round(N.cash).toLocaleString()+' ('+geSgn(N.inc||0)+'/month)',N.cash<0?'#ff9d8e':'')+row('Army',c.S.army.toLocaleString()+(fl?' of '+Math.round(fl).toLocaleString()+' limit':'')+' · '+c.S.men+' units',fl&&c.S.army>fl?'#ff9d8e':'')
    +row('Fuel',Math.round(E.fuel||0),E.dry?'#ff9d8e':'')+row('Food',Math.round(E.food||0),E.starve?'#ff9d8e':'')+row('Manpower',Math.round(E.man||0))+'</div>';
  const wg=(N.wg||[]).filter(pi=>GCM.P[pi]);h+='<div class="nph2">Goals</div>'+(wg.length?'<div>War goals: '+wg.map(pi=>'<span class="npl2" data-pi="'+pi+'" title="Show on the map">'+GCM.P[pi].n+'</span>'+(GC.prov[pi].o===code?' ✓':'')).join(' · ')+'</div>':'<div style="opacity:.7">No war goals set.</div>');
  body.innerHTML=h;const g=body.querySelector('#npOvS');for(const f of NP_HDR)try{f(code,(i,l,v,tip)=>{const d=guEl('div','display:flex;justify-content:space-between;gap:10px','<span style="opacity:.8" title="'+tip+'">'+i+' '+l+'</span><b>'+v+'</b>');g.appendChild(d);});}catch(_){}
  for(const e of body.querySelectorAll('[data-pi]'))e.onclick=()=>npFly(+e.dataset.pi);
  const more=guEl('div','margin-top:10px;display:flex;gap:18px;flex-wrap:wrap');const lk=(t,id)=>{if(!npVis(code).some(x=>x.id===id))return;const a=guEl('span','',t+' ▸');a.className='npl2';a.onclick=()=>{NP.cur=id;npDraw();};more.appendChild(a);};
  lk('Missions','mis');lk('Leader','ldr');lk('Provinces','prov');lk('Stability','stab');body.appendChild(more);});
// ---- screens for systems that exist today (their group and order: NP_GROUPS)
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
  rows.sort((a,b)=>b.k-a.k);body.innerHTML='<div style="margin-bottom:8px">Every living major nation, strongest army first. Click to open its panel.</div>';npTable(body,['Nation','Tier','Provinces','Cash','Army','Score'],rows,r=>npGo(r.c));});
