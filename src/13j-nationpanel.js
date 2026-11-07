// ---------- THE NATION PANEL (Lane B / B2): one tabbed window for running a nation (EU4-style, our own look) ----------
// Every later grand system adds its screen with ONE call: npTab(id, icon, title, render(code, ro) -> html string[, bind(el, code)]).
// Opens from the top bar "Nation" button or by clicking a nation row in the Ledger/Diplomacy tabs (read-only for other nations). Esc closes.
const NP_TABS=[];let NP={code:null,tab:'gov'};
function npTab(id,icon,title,render,bind){const i=NP_TABS.findIndex(t=>t.id===id);const t={id,icon,title,render,bind};if(i>=0)NP_TABS[i]=t;else NP_TABS.push(t);}
function npRow(l,v,c,tip){return '<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0"'+(tip?' title="'+tip+'"':'')+'><span style="opacity:.8">'+l+'</span><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>';}
function npH(t){return '<div style="margin:10px 0 3px;padding-top:5px;border-top:1px solid #2c4358;font-weight:bold;color:#ffe6a8">'+t+'</div>';}
function npArmies(c){return GC.armies.filter(a=>a.o===c);}
function npStrength(c){let v=0;for(const a of npArmies(c))v+=grArmyVal(a);return Math.round(v);}
function npProvs(c){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);}
function npStyle(c){const f=grNat(c).fac;return msOf(f);}
function npLeader(c){const n=GCM.nats.get(c);return (['IR','RS','DW'].includes(c)?'Supreme Leader':['KP'].includes(c)?'Dear Leader':['US','FR','KR','TR','RU','CN','EG','IQ','SY','PL','UA','AZ','BR','MX','AR','CO','CL','ID','PH','NG','ZA','DZ','KZ','VN'].includes(c)?'President':['SA','AE','JO','OM','MA','KW','QA'].includes(c)?'Monarch / Emir':['GB','JP','CA','AU','ES','SE'].includes(c)?'Prime Minister':'Head of government')+' of '+(n?n.name:c);}
function npHeader(c){const N=GC.nat[c],E=N.e||{},n=GCM.nats.get(c),g=grNat(c);const st=npStyle(c),cls=grRealClass(c);
  const box=(ic,l,v,t)=>'<div title="'+t+'" style="background:#0d1721;border:1px solid #2c4358;border-radius:6px;padding:4px 8px;min-width:96px"><div style="font-size:12px;opacity:.7">'+ic+' '+l+'</div><b style="font-size:17px">'+v+'</b></div>';
  return '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><div style="width:54px;height:54px;border-radius:8px;border:2px solid #fff;background:'+g.color+';flex:none"></div><div style="flex:1"><div style="font-size:22px;font-weight:bold;color:#ffe6a8">'+n.name+'</div><div style="opacity:.85;font-size:14px">'+npLeader(c)+' · '+cls+' · '+st.n+(c===GC.me?' · <i>you</i>':' · <i>read-only</i>')+'</div></div></div>'
   +'<div style="display:flex;flex-wrap:wrap;gap:6px">'+box('$','Cash','$'+Math.round(N.cash).toLocaleString(),'Treasury; income per turn '+Math.round(N.inc||0))+box('±','Income',(N.inc>=0?'+':'')+Math.round(N.inc||0),'Net income last turn')
   +box('⚔','Army',npStrength(c).toLocaleString(),'Total value of all field armies')+box('♟','Manpower',E.man!==undefined?Math.round(E.man):'–','Recruits available')+box('⛽','Fuel',E.fuel!==undefined?Math.round(E.fuel):'–','Fuel stock')+box('🌾','Food',E.food!==undefined?Math.round(E.food):'–','Food stock')
   +box('★','Provinces',npProvs(c).length,'Provinces held')+'</div>';}
function npClose(){const e=document.getElementById('gNation');if(e)e.remove();}
function npOpen(code,tab){if(!GC)return;const host=document.getElementById('grandScreen');if(!host)return;code=code||GC.me;if(!GC.nat[code])return;
  if(!tab&&document.getElementById('gNation')&&NP.code===code){npClose();return;}
  NP.code=code;if(tab)NP.tab=tab;if(!NP_TABS.some(t=>t.id===NP.tab))NP.tab=NP_TABS[0].id;npDraw();}
function npDraw(){const host=document.getElementById('grandScreen');if(!host)return;let el=document.getElementById('gNation');
  if(!el){el=guEl('div','position:absolute;top:56px;left:50%;transform:translateX(-50%);bottom:14px;width:min(920px,94vw);z-index:8300;background:#101c28;border:1px solid #c9a35a;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;color:#e8e4d8;font-size:15px;line-height:1.45;box-shadow:0 8px 40px #000a');el.id='gNation';host.appendChild(el);}
  const c=NP.code,ro=c!==GC.me;let h=npHeader(c)+'<div style="display:flex;gap:4px;margin:10px 0 8px;flex-wrap:wrap">';
  for(const t of NP_TABS)h+='<button type="button" data-t="'+t.id+'" title="'+t.title+'" style="padding:6px 12px;border-radius:6px;border:1px solid '+(t.id===NP.tab?'#c9a35a':'#3d5a73')+';background:'+(t.id===NP.tab?'#3a3020':'#18293a')+';color:#e8e4d8;cursor:pointer;font-size:15px">'+t.icon+' '+t.title+'</button>';
  h+='</div><div id="gNationBody" style="flex:1;overflow:auto;padding-right:4px"></div><button type="button" id="gNationX" style="position:absolute;top:6px;right:10px;background:none;border:none;color:#e8e4d8;font-size:22px;cursor:pointer">×</button>';
  el.innerHTML=h;const tab=NP_TABS.find(t=>t.id===NP.tab),body=el.querySelector('#gNationBody');
  try{body.innerHTML=tab.render(c,ro);if(tab.bind)tab.bind(body,c,ro);}catch(e){body.textContent='This tab failed to draw: '+e.message;console.error('npTab',tab.id,e);}
  el.querySelectorAll('button[data-t]').forEach(b=>{b.onclick=()=>{NP.tab=b.dataset.t;npDraw();};});el.querySelector('#gNationX').onclick=npClose;}
if(!window._npKeys){window._npKeys=1;addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('gNation')){npClose();ev.stopPropagation();}},true);}
function npLink(c,tab){return '<a href="#" data-np="'+c+'" data-tab="'+(tab||'')+'" style="color:#9fd0ff">'+GCM.nats.get(c).name+'</a>';}
function npBindLinks(el){el.querySelectorAll('a[data-np]').forEach(a=>{a.onclick=ev=>{ev.preventDefault();npOpen(a.dataset.np,a.dataset.tab||NP.tab);};});}

// ----- tabs -----
npTab('gov','🏛','Government',(c)=>{const st=npStyle(c),n=GCM.nats.get(c),N=GC.nat[c];
  return npRow('Head of state',npLeader(c))+npRow('Power tier',grRealClass(c))+npRow('Morale style',st.n)+'<div style="opacity:.8;font-size:13px;margin:2px 0 6px">'+st.desc+'</div>'
   +npRow('Capital',GCM.P[N.cap].n)+npRow('Provinces',npProvs(c).length)+npRow('Score',grScore(c))+(N.dead?npRow('Status','Defeated','#ff9d8e'):'')
   +npH('Coming next')+'<div style="opacity:.7;font-size:13px">Stability, estates, ideas and reforms will appear here as their systems ship.</div>';});
npTab('dip','🤝','Diplomacy',(c)=>{const at=[],al=[],rows=[];
  for(const o of grMajors()){if(o===c||GC.nat[o].dead)continue;if(grAtWar(c,o))at.push(o);if(grAllied(c,o))al.push(o);rows.push([o,grOpinion(c,o)]);}
  rows.sort((a,b)=>b[1]-a[1]);const col=v=>v>=40?'#9fd36b':v<=-40?'#ff9d8e':'#e8e4d8';
  let h=npH('At war with')+(at.length?at.map(o=>npLink(o)).join(' · '):'<span style="opacity:.6">nobody</span>')+npH('Alliances')+(GC.alz||[]).filter(a=>a[1].includes(c)).map(a=>'<div><b>'+a[0]+'</b>: '+a[1].filter(x=>x!==c).map(o=>npLink(o)).join(', ')+'</div>').join('')||'<span style="opacity:.6">none</span>';
  h+=npH('Opinion of '+GCM.nats.get(c).name)+rows.map(r=>npRow(npLink(r[0]),(r[1]>0?'+':'')+r[1],col(r[1]))).join('');
  return h+'<div style="opacity:.6;font-size:13px;margin-top:8px">Read-only for now - treaties, favours and peace deals arrive with the full Diplomacy screen.</div>';},npBindLinks);
npTab('eco','💰','Economy',(c,ro)=>{const N=GC.nat[c],E=N.e||{},br=E.br||{};
  return npRow('Cash','$'+Math.round(N.cash).toLocaleString())+npRow('Net income',geSgn(N.inc||0)+'/turn',(N.inc||0)>=0?'#9fd36b':'#ff9d8e')
   +npH('Income and expenses last turn')+npRow('Tax',geSgn(br.tax||0))+npRow('Trade',geSgn(br.trade||0))+npRow('Tolls',geSgn(br.toll||0))+npRow('Oil sales',geSgn(br.oil||0))+npRow('Upkeep',geSgn(br.upkeep||0))
   +npH('Stocks')+npRow('Fuel',Math.round(E.fuel||0),E.dry?'#ff9d8e':null)+npRow('Food',Math.round(E.food||0),E.starve?'#ff9d8e':null)+npRow('Manpower',Math.round(E.man||0))+npRow('Oil stock',Math.round(E.oil||0))
   +(ro?'':'<div style="margin-top:10px"><button type="button" id="npEco" style="padding:8px 14px;border-radius:6px;border:1px solid #c9a35a;background:#3a3020;color:#ffe6a8;cursor:pointer;font-size:15px">Open bonds, bank, embargoes, merchants…</button></div>');},
  (el,c,ro)=>{const b=el.querySelector('#npEco');if(b)b.onclick=()=>{npClose();geUiPanel();};});
npTab('mil','⚔','Military',(c)=>{const L=npArmies(c);let h=npRow('Field armies',L.length)+npRow('Total army value',npStrength(c).toLocaleString())+npH('Armies');
  h+=L.slice().sort((a,b)=>grArmyVal(b)-grArmyVal(a)).map(a=>'<div style="display:flex;justify-content:space-between;padding:2px 0"><span>'+a.nm+' · '+GCM.P[a.at].n+'</span><span style="opacity:.85">'+a.u.length+' units · '+Math.round(grArmyVal(a)).toLocaleString()+'</span></div>').join('');return h||'No armies.';});
npTab('prov','🗺','Provinces',(c)=>{const L=npProvs(c).slice().sort((a,b)=>b.dev-a.dev);return '<div style="opacity:.7;font-size:13px;margin-bottom:4px">Click a province to fly the map there.</div>'+L.map(p=>{const s=GC.prov[p.i];return '<a href="#" data-p="'+p.i+'" style="display:flex;justify-content:space-between;color:#e8e4d8;text-decoration:none;padding:2px 0;border-bottom:1px solid #1d3042"><span>'+p.n+(p.cap?' ★':'')+'</span><span style="opacity:.8">garrison '+s.gar.length+' · unrest '+Math.round(s.un)+'</span></a>';}).join('');},
  (el)=>{el.querySelectorAll('a[data-p]').forEach(a=>{a.onclick=ev=>{ev.preventDefault();npClose();try{GV.sel=+a.dataset.p;guCentre(+a.dataset.p);guSide();guRedraw();}catch(e){}};});});
npTab('led','📊','Ledger',()=>{const L=Object.keys(GC.nat).filter(c=>!GC.nat[c].dead&&(grNat(c).major)).map(c=>({c,cash:GC.nat[c].cash,army:npStrength(c),pv:npProvs(c).length,cls:grRealClass(c)})).sort((a,b)=>b.army-a.army);
  return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.2fr;gap:2px 10px;font-size:14px"><b>Nation</b><b>Cash</b><b>Army</b><b>Prov.</b><b>Tier</b>'+L.map(r=>'<span>'+npLink(r.c)+'</span><span>$'+Math.round(r.cash).toLocaleString()+'</span><span>'+r.army.toLocaleString()+'</span><span>'+r.pv+'</span><span>'+r.cls+'</span>').join('')+'</div>';},npBindLinks);
