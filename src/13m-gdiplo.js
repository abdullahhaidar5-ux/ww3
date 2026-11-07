// 13m-gdiplo.js — Lane G B6: EU4-style diplomacy. ONE opinion = grOpinion (13i) + these factor lines; actions are DETERMINISTIC
// (accept when score >= threshold, no dice) and always show WHY. State lives in GC (saved with the campaign): GC.rel pair opinions,
// GC.alz alliances, GC.tr truces {pairKey:untilTurn}, GC.gu guarantees [[by,for]], GC.wsT war start turns {pairKey:turn}.
const GD={sel:'',flt:'all',sort:'op',q:''};
function gdTruce(a,b){return !!(GC&&GC.tr&&GC.tr[grWk(a,b)]>GC.turn);}
function gdRel(a,b,d){GC.rel=GC.rel||{};const k=grWk(a,b);GC.rel[k]=Math.max(-100,Math.min(100,(GC.rel[k]||0)+d));}
function gdEnemies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}
function gdAllies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAllied(c,o));}
function gdNear(a,b){return GCM.P.some(p=>p.land&&GC.prov[p.i].o===a&&p.adj.some(j=>GCM.P[j].land&&GC.prov[j].o===b));}
// factor lines [text, value] explaining the opinion between a and b
function gdWhy(a,b){const L=[],base=(GC.rel&&GC.rel[grWk(a,b)])||0;if(base)L.push([base>0?'Friendly history':'Bad blood',base]);
  if(grAllied(a,b))L.push(['Allied',40]);if(gdTruce(a,b))L.push(['Truce in force',5]);
  const se=gdEnemies(a).filter(e=>grAtWar(b,e));if(se.length)L.push(['Shared enemies ('+se.map(e=>GCM.nats.get(e).name).join(', ')+')',20*se.length]);
  const ea=gdEnemies(a).filter(e=>grAllied(b,e)),eb=gdEnemies(b).filter(e=>grAllied(a,e));if(ea.length||eb.length)L.push(['Allied with the other\'s enemy',-25*(ea.length+eb.length)]);
  if(GC.gu&&GC.gu.some(g=>g[0]===a&&g[1]===b))L.push(['You guarantee them',10]);
  if(GC.gu&&GC.gu.some(g=>g[0]===b&&g[1]===a))L.push(['They guarantee you',10]);
  return L;}
function gdOp(a,b){if(grAtWar(a,b))return -100;const w=gdWhy(a,b);let v=0;for(const x of w)v+=x[1];return Math.max(-100,Math.min(100,v));}
function gdWarscore(a,b){let s=0;const k=grWk(a,b);const t=GC.turn-((GC.wsT&&GC.wsT[k])||1);
  for(const ar of GC.armies){if(ar.fl)continue;if(ar.o===a&&GC.prov[ar.at]&&GC.prov[ar.at].o===b)s+=12;if(ar.o===b&&GC.prov[ar.at]&&GC.prov[ar.at].o===a)s-=12;}
  s+=Math.min(30,t*2);return s;}
// chance(action,a,b) -> {ok:bool, why:[[text,v]], cost, note}  (a = actor, b = target)
function gdChance(act,a,b){const W=[],cash=GC.nat[a].cash,op=gdOp(b,a),war=grAtWar(a,b),al=grAllied(a,b),big=(c)=>grRealClass(c);let ok=true,cost=0,note='';
  const no=m=>{ok=false;note=m;};
  if(act==='improve'){cost=200;if(war)no('At war');W.push(['Costs $200, adds +10 opinion',0]);}
  else if(act==='aid'){cost=600;if(war)no('At war');W.push(['Costs $600, adds +20 opinion',0]);}
  else if(act==='alliance'){if(war)no('At war');else if(al)no('Already allied');
    const se=gdEnemies(a).filter(e=>grAtWar(b,e)).length;let s=op*0.5-15;W.push(['Their opinion of you',Math.round(op*0.5)]);W.push(['Baseline caution',-15]);
    if(se){W.push(['Shared enemies',15*se]);s+=15*se;}
    if(!grNat(b).major){W.push(['Minor nations rarely join blocs',-10]);s-=10;}
    if(gdAllies(b).some(x=>grAtWar(a,x))){W.push(['Their ally is your enemy',-40]);s-=40;}
    if(s<10&&ok)no('They decline (need 10, have '+Math.round(s)+')');W.push(['Total',Math.round(s)]);}
  else if(act==='war'){if(war)no('Already at war');else if(al)no('Break the alliance first');else if(gdTruce(a,b))no('Truce until month '+GC.tr[grWk(a,b)]);
    else if(GC.ph!=='plan')no('Wait for the planning phase');W.push(['War goal: border dispute / strategic rivalry',0]);W.push(['Stability: all your opinions fall',-10]);}
  else if(act==='peace'){if(!war)no('Not at war');const s=gdWarscore(a,b);W.push(['War score (armies on enemy land, war length)',s]);
    const acc=GC.nat[b].ai?25:0;W.push(['They accept at',acc]);if(ok&&s<acc)no('They refuse (score '+s+' of '+acc+')');}
  else if(act==='guarantee'){cost=300;if(war)no('At war');else if(GC.gu&&GC.gu.some(g=>g[0]===a&&g[1]===b))no('Already guaranteed');W.push(['Costs $300, +15 opinion, shows resolve',0]);}
  else if(act==='break'){if(!al)no('Not allied');else if(typeof grInResBloc==='function'&&grInResBloc(a,b))no('The Resistance bloc is permanent while the Ayatollah leads it');W.push(['Opinion -25',0]);}
  if(typeof grOverlord==='function'&&ok){const ov=grOverlord(a);if(ov&&(act==='war'||act==='alliance'||act==='guarantee'||act==='peace'||act==='break'))no('Your overlord, '+GCM.nats.get(ov).name+', decides this');const sv=grOverlord(b);if(act==='break'&&sv===a)no(GCM.nats.get(b).name+' is your vassal');if(act==='war'&&sv)no(GCM.nats.get(b).name+' is a vassal of '+GCM.nats.get(sv).name+' — declare war on its overlord');}
  if(cost&&cash<cost&&ok)no('Not enough cash ($'+cost+')');
  if(GC.me!==a)no('Only your own nation acts');
  return {ok,why:W,cost,note};}
function gdAct(act,a,b){const c=gdChance(act,a,b);if(!c.ok)return c.note;const N=GC.nat[a],na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name;N.cash-=c.cost;
  if(act==='improve'){gdRel(a,b,10);}
  else if(act==='aid'){gdRel(a,b,20);grLog(na+' sent aid to '+nb+'.',a);}
  else if(act==='guarantee'){GC.gu=GC.gu||[];GC.gu.push([a,b]);gdRel(a,b,15);grLog(na+' guarantees the independence of '+nb+'.',a);}
  else if(act==='alliance'){GC.alz=GC.alz||[];const g=GC.alz.find(x=>x[1].includes(a));if(g&&!g[1].includes(b))g[1].push(b);else if(!g)GC.alz.push([na+'–'+nb+' Pact',[a,b]]);gdRel(a,b,15);grLog(na+' and '+nb+' formed an alliance.',a);}
  else if(act==='break'){for(const g of GC.alz||[])if(g[1].includes(a)&&g[1].includes(b))g[1]=g[1].filter(x=>x!==b);GC.alz=(GC.alz||[]).filter(x=>x[1].length>1);gdRel(a,b,-25);grLog(na+' left its alliance with '+nb+'.',a);}
  else if(act==='war'){grDeclare(a,b);GC.wsT=GC.wsT||{};GC.wsT[grWk(a,b)]=GC.turn;for(const o of Object.keys(GC.nat))if(o!==a&&o!==b)gdRel(a,o,-3);gdRel(a,b,-30);}
  else if(act==='peace'){delete GC.war[grWk(a,b)];GC.tr=GC.tr||{};GC.tr[grWk(a,b)]=GC.turn+6;grLog('Peace between '+na+' and '+nb+' — truce for 6 months.',a);}
  try{grSave();}catch(e){}try{grandMapRefresh();}catch(e){}return '';}
// ---------- UI: replaces the Diplomacy tab of the nation panel ----------
(function(){
const chip=(c,onc)=>{const n=grNat(c),d=document.createElement('span');d.title=GCM.nats.get(c).name;d.style.cssText='display:inline-flex;align-items:center;gap:5px;margin:2px 4px 2px 0;padding:2px 7px 2px 3px;border:1px solid #3d5a73;border-radius:4px;background:#16273a;font-size:13px;cursor:pointer';
  d.innerHTML='<span style="width:18px;height:12px;border:1px solid #fff;background:'+n.color+'"></span>'+GCM.nats.get(c).name;d.onclick=onc;return d;};
const sel=c=>{GD.sel=c;npDraw();};
const col=v=>v>=25?'#9fe39f':v<=-25?'#ff9d8e':'#e8e4d8';
const ACTS=[['improve','Improve relations'],['aid','Send aid'],['alliance','Propose alliance'],['guarantee','Guarantee'],['peace','Offer peace'],['break','Leave alliance'],['war','Declare war']];
npTab('dip','🤝','Diplomacy',(code,body)=>{const me=GC.me;if(!GD.sel||GD.sel===code||!GC.nat[GD.sel])GD.sel=Object.keys(GC.nat).find(c=>c!==code&&!GC.nat[c].dead&&grNat(c).major)||'';
  const row=(t,L)=>{const d=document.createElement('div');d.style.cssText='margin-bottom:4px';d.innerHTML='<span style="display:inline-block;width:92px;opacity:.7;font-size:13px">'+t+'</span>';if(!L.length)d.innerHTML+='<span style="opacity:.4">—</span>';for(const c of L)d.appendChild(chip(c,()=>sel(c)));return d;};
  const top=document.createElement('div');top.style.cssText='margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #2c4258';
  const gu=(GC.gu||[]).filter(g=>g[0]===code).map(g=>g[1]),gb=(GC.gu||[]).filter(g=>g[1]===code).map(g=>g[0]);
  const tr=Object.keys(GC.tr||{}).filter(k=>GC.tr[k]>GC.turn&&k.split('|').includes(code)).map(k=>k.split('|').find(x=>x!==code));
  top.appendChild(row('Enemies',gdEnemies(code)));top.appendChild(row('Allies',gdAllies(code)));top.appendChild(row('Guarantees',gu));top.appendChild(row('Guaranteed by',gb));top.appendChild(row('Truces',tr));body.appendChild(top);
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap';body.appendChild(wrap);
  const L=document.createElement('div');L.style.cssText='flex:1.1;min-width:300px';wrap.appendChild(L);const R=document.createElement('div');R.style.cssText='flex:1;min-width:300px';wrap.appendChild(R);
  const bar=document.createElement('div');bar.style.cssText='display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;align-items:center';
  const mk=(lab,cur,set,opts)=>{for(const [k,n] of opts){const b=document.createElement('button');b.type='button';b.textContent=n;b.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid '+(cur===k?'#c9a35a':'#34506a')+';background:'+(cur===k?'#2a3a4c':'#15222f')+';color:#dfe8f0;cursor:pointer;font-size:13px';b.onclick=()=>{set(k);npDraw();};bar.appendChild(b);}};
  mk('f',GD.flt,k=>GD.flt=k,[['all','All'],['near','Neighbours'],['war','At war'],['ally','Allies'],['great','Great powers']]);
  {const wb=document.createElement('button');wb.type='button';wb.textContent='Web ◎';wb.title='Who is allied or at war with whom';wb.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid #5b8bb0;background:#15222f;color:#9ec8ff;cursor:pointer;font-size:13px';wb.onclick=()=>{if(typeof gwebOpen==='function')gwebOpen();};bar.appendChild(wb);}
  const q=document.createElement('input');q.placeholder='Search…';q.value=GD.q;q.style.cssText='padding:3px 8px;border-radius:12px;border:1px solid #34506a;background:#0f1a26;color:#e8e4d8;font-size:13px;width:110px';q.oninput=()=>{GD.q=q.value;lst();};bar.appendChild(q);
  const so=document.createElement('button');so.type='button';so.textContent='Sort: '+(GD.sort==='op'?'opinion':GD.sort==='pw'?'power':'name');so.style.cssText='padding:3px 9px;border-radius:12px;border:1px solid #34506a;background:#15222f;color:#dfe8f0;cursor:pointer;font-size:13px';so.onclick=()=>{GD.sort=GD.sort==='op'?'pw':GD.sort==='pw'?'nm':'op';npDraw();};bar.appendChild(so);L.appendChild(bar);
  const box=document.createElement('div');box.style.cssText='max-height:340px;overflow:auto;border:1px solid #2c4258;border-radius:6px';L.appendChild(box);
  function lst(){box.innerHTML='';let cs=Object.keys(GC.nat).filter(c=>c!==code&&!GC.nat[c].dead&&(grNat(c).major||GD.flt!=='all'||GD.q));
    if(GD.flt==='near')cs=cs.filter(c=>{try{return gdNear(code,c);}catch(e){return false;}});if(GD.flt==='war')cs=cs.filter(c=>grAtWar(code,c));if(GD.flt==='ally')cs=cs.filter(c=>grAllied(code,c));if(GD.flt==='great')cs=cs.filter(c=>/power/.test(grRealClass(c))&&!/Small|Regional/.test(grRealClass(c)));
    const q2=GD.q.trim().toLowerCase();if(q2)cs=cs.filter(c=>GCM.nats.get(c).name.toLowerCase().includes(q2));
    const pw=c=>npStat(c).army;cs.sort((x,y)=>GD.sort==='op'?gdOp(code,y)-gdOp(code,x):GD.sort==='pw'?pw(y)-pw(x):GCM.nats.get(x).name.localeCompare(GCM.nats.get(y).name));
    for(const c of cs.slice(0,60)){const o1=gdOp(code,c),o2=gdOp(c,code),r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;border-bottom:1px solid #1d3042;'+(GD.sel===c?'background:#2a3a4c':'');
      r.innerHTML='<span style="width:20px;height:13px;border:1px solid #fff;background:'+grNat(c).color+'"></span><span style="flex:1"><b>'+GCM.nats.get(c).name+'</b> <span style="opacity:.55;font-size:12px">'+grRealClass(c)+'</span></span>'+(grAtWar(code,c)?'<span style="color:#ff9d8e;font-size:12px">war</span>':grAllied(code,c)?'<span style="color:#9fe39f;font-size:12px">ally</span>':'')+'<b title="Their opinion of you" style="color:'+col(o1)+';min-width:34px;text-align:right">'+(o1>0?'+':'')+o1+'</b>';
      r.onclick=()=>sel(c);box.appendChild(r);}
    if(!cs.length)box.innerHTML='<div style="padding:10px;opacity:.6">No nation matches.</div>';}
  lst();
  const t=GD.sel;if(!t){R.textContent='Select a nation.';return;}
  R.innerHTML='<div style="font-size:19px;font-weight:bold;margin-bottom:2px">'+GCM.nats.get(t).name+'</div><div style="opacity:.75;font-size:13px;margin-bottom:6px">'+grRealClass(t)+' · opinion of '+GCM.nats.get(code).name+' <b style="color:'+col(gdOp(t,code))+'">'+gdOp(t,code)+'</b></div>';
  const ws=gdWhy(t,code),wl=document.createElement('div');wl.style.cssText='font-size:13px;margin-bottom:8px;line-height:1.5';for(const [x,v] of ws)wl.innerHTML+='<div><b style="color:'+(v>0?'#9fe39f':v<0?'#ff9d8e':'#aaa')+';display:inline-block;width:34px">'+(v>0?'+':'')+v+'</b>'+x+'</div>';if(!ws.length)wl.innerHTML='<div style="opacity:.5">No history yet.</div>';R.appendChild(wl);
  if(code!==me||GC.me===t){const n=document.createElement('div');n.style.cssText='opacity:.6;font-size:13px';n.textContent=code!==me?'Open your own panel to act.':'';R.appendChild(n);return;}
  const ab=document.createElement('div');ab.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  for(const [k,n] of ACTS){const ch=gdChance(k,me,t);if(!ch.ok&&/^(Not allied|Not at war|Already)/.test(ch.note))continue;const b=document.createElement('button');b.type='button';b.textContent=n;
    b.title=ch.why.map(w=>(w[1]>0?'+':'')+(w[1]||'')+' '+w[0]).join('\n')+(ch.ok?'':'\n✖ '+ch.note);
    b.style.cssText='padding:5px 11px;border-radius:6px;border:1px solid '+(ch.ok?(k==='war'?'#b5605a':'#7aa84f'):'#3d4a58')+';background:#16273a;color:'+(ch.ok?'#fff':'#7d8794')+';cursor:pointer;font-size:14px';
    b.onclick=()=>{const e=gdAct(k,me,t);const m=document.createElement('div');m.style.cssText='margin-top:8px;font-size:13px;color:#ffb3a8';if(e){m.textContent=e;R.appendChild(m);}else npDraw();};ab.appendChild(b);}
  R.appendChild(ab);const hint=document.createElement('div');hint.style.cssText='margin-top:8px;font-size:12px;opacity:.55';hint.textContent='Hover a button to see the chance and why. Answers are fixed by the numbers — no dice.';R.appendChild(hint);});
})();
