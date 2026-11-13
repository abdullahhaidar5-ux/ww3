// 13z-gpeace.js — lane G item 22: EU4-STYLE PEACE-DEAL SCREEN. "Offer peace" opens a deal: your WAR SCORE (gdWarscore: armies on enemy land, war length) buys demands —
// provinces (cost by development, x2 for the capital, x1.8 if none of your armies stand there), tribute (35% of their cash), vassalage. The loser's side: if the score is
// negative you can pay tribute for peace. Reaction chain: taking land raises ALARM (13y coalitions form), the loser's opinion of you sinks per province, a vassal fights
// beside its overlord (13i), conquered provinces start restless (unrest +20) and the truce is 12 months (6 for white peace). Cost: every point of score spent is gone.
// Counter-play: hold ground (armies on their land lower your score), keep allies in the fight, grow strong enough that the score never goes your way. Deterministic, no new state.
const GP_TRIB=0.35, GP_PAY=0.25, GP_REP=0.15, GP_REP_COST=10, GP_DMZ_COST=12, GP_DMZ_MONTHS=24;
// RG16/RG44 (laneG): reparations = 15% of the loser's cash, one-time; demilitarised zone = one border province of the loser, no army may enter it for 24 months (grPath + move phase).
function gdDmz(j){return !!(GC&&GC.dmz&&GC.dmz[j]>GC.turn);}
function gpDmzProv(a,b,d){const P=GCM.P,taken=d.prov||[];let best=-1,bd=-1;for(const p of gpProvs(a,b)){if(taken.includes(p.i)||gdDmz(p.i))continue;if(!(P[p.i].adj||[]).some(j=>GC.prov[j]&&GC.prov[j].o===a))continue;if(p.dev>bd){bd=p.dev;best=p.i;}}return best;}
function gpScore(a,b){return Math.max(-100,Math.min(100,Math.round(gdWarscore(a,b))));}
// WHY THEY SAY YES OR NO (item 2): how many points of demands b will sign for a = the war score + how tired b's people are of the war (war support, 13v -
// the one exhaustion measure) - how tired a's own people are (b can wait a shaky enemy out) + a long war + b's other wars - Zealous stubbornness.
// Rows [label, points, what would raise it]; the peace table prints them, the AI uses the same sum for its own deals.
function gpWillRows(b,a){const R=[],s=gpScore(a,b),k=grWk(a,b),len=GC.turn-((GC.wsT&&GC.wsT[k])||GC.turn);R.push(['War score',s,'win battles, occupy their land, blockade their ports, hold your war aim']);
  const wb=typeof wsOf==='function'?wsOf(b):50,wa=typeof wsOf==='function'?wsOf(a):50;
  const tb=Math.round((50-wb)*.5);R.push(['Their war support is '+Math.round(wb)+'%',tb,'their losses, lost land, shortages and a long war wear it down']);
  const ta=-Math.round(Math.max(0,50-wa)*.3);if(ta)R.push(['Your own war support is only '+Math.round(wa)+'% — they can wait',ta,'rally your people (Government) or win a battle']);
  const tl=Math.min(15,Math.max(0,len-12));if(tl)R.push(['The war has lasted '+len+' months',tl,'time']);
  const ow=Math.min(10,5*gdEnemies(b).filter(x=>x!==a).length);if(ow)R.push(['They fight other wars too',ow,'']);
  let zl=false;try{zl=msOf(grNat(b).fac).rout===0;}catch(e){}if(zl)R.push(['Zealous: they do not give in easily',-10,'']);
  return R;}
function gpWill(b,a){let v=0;for(const r of gpWillRows(b,a))v+=r[1];return Math.round(v);}
function gpProvCost(pi,a){const p=GCM.P[pi],st=GC.prov[pi];let c=5+p.dev*1.2;if(GC.nat[st.o]&&GC.nat[st.o].cap===pi)c*=2;
  if(!(st.o===a&&st.ow))c*=1.8;   /* land you do not occupy costs almost double */if(typeof gclHas==='function'&&gclHas(a,pi))c*=0.5;return Math.round(c);}
function gpVasCost(a,b){return 45+(grNat(b).major?25:0);}
function gpCanVassal(a,b){return !grOverlord(a)&&!grOverlord(b)&&!grVasPair(a,b)&&!(GC.vas||[]).some(v=>v[0]===b);}
function gpProvs(a,b){const occ=p=>GC.prov[p.i].o===a&&GC.prov[p.i].ow===b?1:0;return GCM.P.filter(p=>p.land&&ocOwner(p.i)===b&&(GC.prov[p.i].o===b||GC.prov[p.i].o===a)).sort((x,y)=>occ(y)-occ(x)||y.dev-x.dev||x.i-y.i);}   /* b's land by law: what a occupies first, then the rest */
// deal = {prov:[idx], trib:bool, vas:bool, pay:bool}; returns {cost, score, ok, why}
function gpEval(a,b,d){const sc=gpScore(a,b),s=gpWill(b,a);let cost=0;for(const i of d.prov||[])cost+=gpProvCost(i,a);if(d.trib)cost+=15;if(d.vas)cost+=gpVasCost(a,b);if(d.rep)cost+=GP_REP_COST;if(d.dmz)cost+=GP_DMZ_COST;
  const rest=gpProvs(a,b).length-(d.prov||[]).length;let ok=true,why='';
  if(d.pay){return {cost:0,score:s,ws:sc,ok:true,why:'Pay '+Math.round(GC.nat[a].cash*GP_PAY)+' to end the war'};}
  if(d.dmz&&gpDmzProv(a,b,d)<0){ok=false;why='No border province left for a zone';}
  if(cost>Math.max(0,s)){ok=false;why='They refuse: you ask for '+cost+', they would sign for '+Math.max(0,s)+' at most ('+(cost-Math.max(0,s))+' short)';}
  else if(!cost&&s<-10){ok=false;why='They refuse a white peace while winning — pay tribute or keep fighting';}
  if(ok&&(d.prov||[]).length&&rest<1&&!d.vas){ok=false;why='Leave them at least one province (or make them a vassal)';}
  return {cost,score:s,ws:sc,ok,why};}
function gpApply(a,b,d){const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name,A=GC.nat[a],B=GC.nat[b];const e=gpEval(a,b,d);if(!e.ok)return e.why;
  let txt=[];const zone=d.dmz?gpDmzProv(a,b,d):-1;
  if(d.pay){const m=Math.round(A.cash*GP_PAY);A.cash-=m;B.cash+=m;txt.push('paid $'+m);}
  for(const i of d.prov||[]){const st=GC.prov[i],p=GCM.P[i];if(st.o===a&&st.ow===b){ocAnnex(i);st.un=Math.min(100,st.un+10);}else{st.o=a;delete st.ow;delete st.cp;st.un=Math.min(100,st.un+20);st.cv=3;st.rq=[];st.gar=[];try{geCaptured(i,a);}catch(x){}}
    if(typeof gclHas==='function'&&gclHas(a,i)){gclTaken(a,i);A.ae=Math.max(0,(A.ae||0)-1.5);}
    if(B.cap===i){const r=gpProvs(a,b).filter(q=>q.i!==i)[0];B.cap=r?r.i:-1;}}
  if((d.prov||[]).length)txt.push('took '+d.prov.map(i=>GCM.P[i].n).join(', '));
  if(d.trib){const m=Math.round(Math.max(0,B.cash)*GP_TRIB);A.cash+=m;B.cash-=m;txt.push('tribute $'+m);}
  if(d.vas){GC.vas=GC.vas||[];GC.vas.push([a,b]);txt.push(nb+' became a vassal');}
  if(d.rep){const m=Math.round(Math.max(0,B.cash)*GP_REP);A.cash+=m;B.cash-=m;txt.push('reparations $'+m);}
  if(zone>=0){GC.dmz=GC.dmz||{};GC.dmz[zone]=GC.turn+GP_DMZ_MONTHS;txt.push('demilitarized zone at '+GCM.P[zone].n);}
  delete GC.war[grWk(a,b)];GC.tr=GC.tr||{};GC.tr[grWk(a,b)]=GC.turn+((d.prov||[]).length||d.vas||d.trib?12:6);
  const back=ocSweep();if(back)txt.push(back+' occupied province'+(back>1?'s':'')+' handed back');   /* everything the deal did not sign over goes home, on both sides */
  gdRel(a,b,d.pay?5:-20-5*(d.prov||[]).length-(d.vas?15:0));
  grLog('Peace between '+na+' and '+nb+(txt.length?': '+na+' '+txt.join('; '):' (white peace)')+'.',a);
  try{grSave();}catch(x){}try{grandMapRefresh();}catch(x){}try{if(typeof npDraw==='function')npDraw();}catch(x){}return '';}
// what an AI winner asks of an AI loser: the land it occupies (claims first, then the richest) as far as the war score pays for it, never the last province
function gpAIDeal(wi,lo){const d={prov:[],trib:false,vas:false,pay:false,rep:false,dmz:false};const s=gpWill(lo,wi);let left=Math.max(0,s);
  const mine=ocHeldBy(wi,lo).sort((x,y)=>(gclHas(wi,y.i)?1:0)-(gclHas(wi,x.i)?1:0)||y.dev-x.dev||x.i-y.i),all=gpProvs(wi,lo).length;
  for(const p of mine){const c=gpProvCost(p.i,wi);if(c>left||d.prov.length>=all-1||d.prov.length>=3)continue;d.prov.push(p.i);left-=c;}
  if(!d.prov.length&&left>=GP_REP_COST&&s>=25)d.rep=true;
  if(!gpEval(wi,lo,d).ok){d.prov=[];d.rep=false;if(!gpEval(wi,lo,d).ok)return glgPeace(wi,lo);}
  if(GC.wsT)delete GC.wsT[grWk(wi,lo)];return gpApply(wi,lo,d);}
// the plainest ways for a to raise what b will sign: the best province still to occupy, a blockade, the aim
function gpHow(a,b){const tips=[],P=GCM.P;let dB=0;for(const p of P)if(p.land&&ocOwner(p.i)===b)dB+=p.dev||1;
  const nx=P.filter(p=>p.land&&GC.prov[p.i].o===b&&!GC.prov[p.i].ow&&p.adj.some(j=>P[j].land&&GC.prov[j].o===a)).sort((x,y)=>y.dev-x.dev||x.i-y.i)[0];if(nx&&dB)tips.push('occupy '+nx.n+' (+'+Math.max(1,Math.round(GWS.occ*(nx.dev||1)/dB))+')');
  const w=gdWarRec(a,b);if(w.by===a&&!gdAimHeld(a,b))tips.push('reach your war aim (+'+GWS.aimUp+' a month)');if(w.by===b&&gdAimHeld(a,b))tips.push('deny their war aim');
  tips.push('win a battle (+'+GWS.bat+')');if(P.some(p=>p.land&&GC.prov[p.i].o===b&&gmilHasPort(p.i)&&!gmilBk(p.i)))tips.push('blockade a port (+'+GWS.port+')');tips.push('or wait for their war support to fall');return tips.join(', ')+'.';}
function gpOpen(a,b){const old=document.getElementById('gpDeal');if(old)old.remove();
  const d={prov:[],trib:false,vas:false,pay:false,rep:false,dmz:false},nb=GCM.nats.get(b).name;
  const m=guEl('div','position:fixed;inset:0;z-index:8600;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center');m.id='gpDeal';
  const c=guEl('div','background:#142231;border:1px solid #4a6580;border-radius:10px;padding:16px 20px;width:min(620px,94vw);max-height:88vh;overflow:auto;color:#e8e4d8;font-size:15px');m.appendChild(c);
  function draw(){const e=gpEval(a,b,d),s=e.score;c.innerHTML='';
    c.appendChild(guEl('h3','margin:0 0 4px;font-weight:600;font-size:20px','Peace with '+nb));
    const bar=guEl('div','height:10px;border-radius:5px;background:#0d1822;margin:6px 0 4px;position:relative;overflow:hidden');
    bar.appendChild(guEl('div','position:absolute;left:0;top:0;bottom:0;width:'+Math.max(0,Math.min(100,s))+'%;background:#6fae4a'));
    if(s>0)bar.appendChild(guEl('div','position:absolute;left:0;top:0;bottom:0;width:'+Math.min(100,e.cost)+'%;background:'+(e.ok?'#c9a35a':'#b5605a')+';opacity:.85'));c.appendChild(bar);
    c.appendChild(guEl('div','opacity:.85;margin-bottom:4px',(s>0?nb+' would sign for up to <b>'+s+'</b> — you ask for <b>'+e.cost+'</b>. ':'They see no reason to give anything. ')+(s>0?'Land you occupy is cheap to keep; everything you do not ask for goes back to them.':'')));
    {const t=guEl('div','font-size:13px;margin-bottom:8px;border-left:2px solid #34506a;padding-left:8px');t.id='gpWhy';for(const r of gpWillRows(b,a))t.appendChild(guEl('div','','<b style="display:inline-block;width:36px;color:'+(r[1]>0?'#9fe39f':r[1]<0?'#ff9d8e':'#aaa')+'">'+(r[1]>0?'+':'')+r[1]+'</b>'+r[0]+(r[0]==='War score'?' <span style="opacity:.6">('+gdWarRows(a,b).map(x=>x[0].toLowerCase()+' '+(x[1]>0?'+':'')+x[1]).join(' · ')+')</span>':'')));
      if(!e.ok&&e.cost>Math.max(0,s))t.appendChild(guEl('div','color:#ffd9a0;margin-top:3px','To make them say yes: ask for '+(e.cost-Math.max(0,s))+' less, or raise the score — '+gpHow(a,b)));c.appendChild(t);}
    const row=(chk,label,cost,on,tip)=>{const r=guEl('label','display:flex;gap:8px;align-items:center;padding:4px 6px;border-bottom:1px solid #22384b;cursor:pointer;'+(on?'background:#1b3045':''));const i=document.createElement('input');i.type='checkbox';i.checked=on;i.onchange=()=>{chk(i.checked);draw();};r.appendChild(i);
      r.appendChild(guEl('span','flex:1',label));r.appendChild(guEl('span','opacity:.8;font-size:13px',tip||''));r.appendChild(guEl('b','min-width:34px;text-align:right;color:#ffe6a8',cost?String(cost):'—'));c.appendChild(r);};
    if(s>0){c.appendChild(guEl('div','margin-top:6px;opacity:.7;font-size:13px','DEMANDS'));
      const ps=gpProvs(a,b);const lst=guEl('div','max-height:200px;overflow:auto;border:1px solid #22384b;border-radius:6px');c.appendChild(lst);const keep=c;
      for(const p of ps.slice(0,40)){const cost=gpProvCost(p.i,a),on=d.prov.includes(p.i);const r=guEl('label','display:flex;gap:8px;align-items:center;padding:3px 6px;cursor:pointer;'+(on?'background:#1b3045':''));const i=document.createElement('input');i.type='checkbox';i.checked=on;i.onchange=()=>{if(i.checked)d.prov.push(p.i);else d.prov=d.prov.filter(x=>x!==p.i);draw();};r.appendChild(i);
        r.appendChild(guEl('span','flex:1',p.n+(GC.nat[b].cap===p.i?' ★ capital':'')+(GC.prov[p.i].o===a?' · occupied by you':' · not occupied')));r.appendChild(guEl('span','opacity:.7;font-size:13px','dev '+p.dev));r.appendChild(guEl('b','min-width:34px;text-align:right;color:#ffe6a8',String(cost)));lst.appendChild(r);}
      row(v=>d.trib=v,'War tribute — '+Math.round(Math.max(0,GC.nat[b].cash)*GP_TRIB)+' cash',15,d.trib);
      row(v=>d.rep=v,'Reparations — '+Math.round(Math.max(0,GC.nat[b].cash)*GP_REP)+' cash, paid once',GP_REP_COST,d.rep);
      const z=gpDmzProv(a,b,d);if(z>=0)row(v=>d.dmz=v,'Demilitarized zone at '+GCM.P[z].n+' for 2 years — no army may enter',GP_DMZ_COST,d.dmz);
      if(gpCanVassal(a,b))row(v=>d.vas=v,'Make '+nb+' your vassal (fights beside you, pays no tribute)',gpVasCost(a,b),d.vas);}
    else row(v=>d.pay=v,'Pay '+Math.round(GC.nat[a].cash*GP_PAY)+' cash to end the war',0,d.pay);
    c.appendChild(guEl('div','margin:8px 0;color:'+(e.ok?'#9fe39f':'#ffb3a8'),e.ok?(d.prov.length||d.trib||d.vas||d.pay||d.rep||d.dmz?'They will accept.':'White peace — all occupied land goes back to its owner. Truce 6 months.'):e.why));
    const br=guEl('div','display:flex;gap:8px');const sg=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid #7aa84f;background:#4f6b32;color:#fff;cursor:pointer;font-size:16px','Sign peace');sg.type='button';sg.disabled=!e.ok;if(!e.ok)sg.style.opacity='.45';
    sg.onclick=()=>{const r=gpApply(a,b,d);if(r){draw();}else m.remove();};const cn=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid #6b7a8a;background:transparent;color:#fff;cursor:pointer;font-size:16px','Keep fighting');cn.type='button';cn.onclick=()=>m.remove();br.appendChild(sg);br.appendChild(cn);c.appendChild(br);}
  m.onclick=ev=>{if(ev.target===m)m.remove();};document.body.appendChild(m);draw();return m;}
// "Offer peace" in the Diplomacy tab opens the screen instead of a flat yes/no
(function(){const _act=gdAct;gdAct=function(act,a,b){if(act==='peace'&&a===GC.me){const c=gdChance(act,a,b);if(!c.ok)return c.note;gpOpen(a,b);return '';}return _act(act,a,b);};
if(typeof alAdd==='function')alAdd('peace','🕊','Peace terms',c=>{let best=null;for(const o of Object.keys(GC.nat)){if(o===c||GC.nat[o].dead||!grAtWar(c,o))continue;const s=gpScore(c,o);if(s>=30&&(!best||s>best.s))best={o,s};}
  return best?{n:best.s,tip:'you are winning against '+GCM.nats.get(best.o).name+' — open the peace screen',go:()=>gpOpen(c,best.o)}:null;});})();
// WAR OVERVIEW (item 2): one screen of the Nation window — every war of the nation with its stated aim, the score split by source and (for your own
// wars) what the enemy would sign today and why. View only; "Peace table" opens gpOpen. Lives in the Diplomacy group.
function gpWarCard(code,e,own){const k=grWk(code,e),len=GC.turn-((GC.wsT&&GC.wsT[k])||GC.turn),rows=gdWarRows(code,e),s=gpScore(code,e),w=gdWarRec(code,e);
  const d=guEl('div','border:1px solid #2c4258;border-radius:8px;padding:10px 14px;margin-bottom:10px;background:#13212f');d.className='gpWar';
  d.appendChild(guEl('div','display:flex;gap:10px;align-items:baseline;flex-wrap:wrap','<b style="font-size:18px">War with '+gdN(e)+'</b><span style="opacity:.65;font-size:13px">since '+grMonStr((GC.wsT&&GC.wsT[k])||GC.turn)+' · '+len+' month'+(len===1?'':'s')+(w.by?' · declared by '+gdN(w.by):'')+'</span>'));
  const held=w.by&&gdAimHeld(code,e);d.appendChild(guEl('div','margin:4px 0 6px;font-size:14px','<span style="opacity:.65">War aim</span> '+gdAimText(code,e)+(w.by?' <span style="color:'+(held?'#9fe39f':'#ffd9a0')+'">— '+(held?'held':'not held')+'</span> <span style="opacity:.55;font-size:12px">('+GWG[w.g.t][1]+')</span>':'')));
  const bar=guEl('div','height:8px;border-radius:4px;background:#0d1822;position:relative;margin:2px 0 6px');bar.appendChild(guEl('div','position:absolute;top:0;bottom:0;left:50%;width:1px;background:#6b7a8a'));
  bar.appendChild(guEl('div','position:absolute;top:0;bottom:0;border-radius:4px;'+(s>=0?'left:50%;width:'+s/2+'%;background:#6fae4a':'right:50%;width:'+(-s/2)+'%;background:#b5605a')));d.appendChild(bar);
  const t=guEl('div','font-size:13px;line-height:1.5');t.appendChild(guEl('div','font-size:15px','<b style="display:inline-block;width:40px;color:'+(s>0?'#9fe39f':s<0?'#ff9d8e':'#ddd')+'">'+(s>0?'+':'')+s+'</b><b>War score</b> <span style="opacity:.6">— counted, never rolled; the same number for both sides</span>'));
  for(const r of rows)t.appendChild(guEl('div','','<span title="'+r[2].replace(/"/g,'&quot;')+'"><b style="display:inline-block;width:40px;color:'+(r[1]>0?'#9fe39f':r[1]<0?'#ff9d8e':'#8a96a3')+'">'+(r[1]>0?'+':'')+r[1]+'</b>'+r[0]+'</span>'));d.appendChild(t);
  if(own){const wl=gpWill(e,code),x=guEl('div','font-size:13px;margin-top:8px;padding-top:6px;border-top:1px solid #22384b');x.appendChild(guEl('div','',wl>0?gdN(e)+' would sign a peace worth up to <b>'+wl+'</b> today:':gdN(e)+' would give nothing today ('+wl+'):'));
    for(const r of gpWillRows(e,code))x.appendChild(guEl('div','opacity:.85','<b style="display:inline-block;width:40px;color:'+(r[1]>0?'#9fe39f':r[1]<0?'#ff9d8e':'#8a96a3')+'">'+(r[1]>0?'+':'')+r[1]+'</b>'+r[0]));
    x.appendChild(guEl('div','opacity:.7;margin-top:3px','To move them: '+gpHow(code,e)));d.appendChild(x);
    const bt=guEl('button','margin-top:8px;padding:4px 12px;border-radius:6px;border:1px solid #7aa84f;background:transparent;color:#cfe8b8;cursor:pointer;font-size:13px','Peace table →');bt.type='button';bt.onclick=()=>{const c=gdChance('peace',code,e);if(c.ok)gpOpen(code,e);else{bt.textContent=c.note;bt.disabled=true;}};d.appendChild(bt);}
  return d;}
if(typeof npTab==='function')npTab('wars','🎯','Wars',(code,body,c)=>{const es=gdEnemies(code).sort((x,y)=>gpScore(code,y)-gpScore(code,x)||(x<y?-1:1));const own=c&&c.own&&code===GC.me;
  if(!es.length){body.appendChild(guEl('div','opacity:.7',gdN(code)+' is at peace. A war needs a stated aim; its score is counted from battles won, land occupied, ports blockaded and the aim held — and peace is signed by that score.'));return;}
  body.appendChild(guEl('div','opacity:.7;font-size:13px;margin-bottom:8px','Occupied land changes owner only at the peace table. The enemy signs when the war score and his people\'s war support say so.'));
  for(const e of es)body.appendChild(gpWarCard(code,e,own));});
