// 13z-gpeace.js — lane G item 22: EU4-STYLE PEACE-DEAL SCREEN. "Offer peace" opens a deal: your WAR SCORE (gdWarscore: armies on enemy land, war length) buys demands —
// provinces (cost by development, x2 for the capital, x1.8 if none of your armies stand there), tribute (35% of their cash), vassalage. The loser's side: if the score is
// negative you can pay tribute for peace. Reaction chain: taking land raises ALARM (13y coalitions form), the loser's opinion of you sinks per province, a vassal fights
// beside its overlord (13i), conquered provinces start restless (unrest +20) and the truce is 12 months (6 for white peace). Cost: every point of score spent is gone.
// Counter-play: hold ground (armies on their land lower your score), keep allies in the fight, grow strong enough that the score never goes your way. Deterministic, no new state.
const GP_TRIB=0.35, GP_PAY=0.25;
function gpScore(a,b){return Math.max(-100,Math.min(100,Math.round(gdWarscore(a,b))));}
function gpProvCost(pi,a){const p=GCM.P[pi],st=GC.prov[pi];let c=5+p.dev*1.2;if(GC.nat[st.o]&&GC.nat[st.o].cap===pi)c*=2;
  if(!GC.armies.some(x=>x.o===a&&x.at===pi&&!x.fl&&x.u.length))c*=1.8;return Math.round(c);}
function gpVasCost(a,b){return 45+(grNat(b).major?25:0);}
function gpCanVassal(a,b){return !grOverlord(a)&&!grOverlord(b)&&!grVasPair(a,b)&&!(GC.vas||[]).some(v=>v[0]===b);}
function gpProvs(a,b){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===b).sort((x,y)=>y.dev-x.dev||x.i-y.i);}
// deal = {prov:[idx], trib:bool, vas:bool, pay:bool}; returns {cost, score, ok, why}
function gpEval(a,b,d){const s=gpScore(a,b);let cost=0;for(const i of d.prov||[])cost+=gpProvCost(i,a);if(d.trib)cost+=15;if(d.vas)cost+=gpVasCost(a,b);
  const rest=gpProvs(a,b).length-(d.prov||[]).length;let ok=true,why='';
  if(d.pay){return {cost:0,score:s,ok:true,why:'Pay '+Math.round(GC.nat[a].cash*GP_PAY)+' to end the war'};}
  if(cost>Math.max(0,s)){ok=false;why='Not enough war score ('+cost+' of '+Math.max(0,s)+')';}
  else if(!cost&&s<-10){ok=false;why='They refuse a white peace while winning — pay tribute or keep fighting';}
  if(ok&&(d.prov||[]).length&&rest<1&&!d.vas){ok=false;why='Leave them at least one province (or make them a vassal)';}
  return {cost,score:s,ok,why};}
function gpApply(a,b,d){const na=GCM.nats.get(a).name,nb=GCM.nats.get(b).name,A=GC.nat[a],B=GC.nat[b];const e=gpEval(a,b,d);if(!e.ok)return e.why;
  let txt=[];
  if(d.pay){const m=Math.round(A.cash*GP_PAY);A.cash-=m;B.cash+=m;txt.push('paid $'+m);}
  for(const i of d.prov||[]){const st=GC.prov[i],p=GCM.P[i];st.o=a;st.un=Math.min(100,st.un+20);st.cv=3;st.rq=[];st.gar=[];try{geCaptured(i,a);}catch(x){}
    if(B.cap===i){const r=gpProvs(a,b).filter(q=>q.i!==i)[0];B.cap=r?r.i:-1;}}
  if((d.prov||[]).length)txt.push('took '+d.prov.map(i=>GCM.P[i].n).join(', '));
  if(d.trib){const m=Math.round(Math.max(0,B.cash)*GP_TRIB);A.cash+=m;B.cash-=m;txt.push('tribute $'+m);}
  if(d.vas){GC.vas=GC.vas||[];GC.vas.push([a,b]);txt.push(nb+' became a vassal');}
  delete GC.war[grWk(a,b)];GC.tr=GC.tr||{};GC.tr[grWk(a,b)]=GC.turn+((d.prov||[]).length||d.vas||d.trib?12:6);
  gdRel(a,b,d.pay?5:-20-5*(d.prov||[]).length-(d.vas?15:0));
  grLog('Peace between '+na+' and '+nb+(txt.length?': '+na+' '+txt.join('; '):' (white peace)')+'.',a);
  try{grSave();}catch(x){}try{grandMapRefresh();}catch(x){}try{if(typeof npDraw==='function')npDraw();}catch(x){}return '';}
function gpOpen(a,b){const old=document.getElementById('gpDeal');if(old)old.remove();
  const d={prov:[],trib:false,vas:false,pay:false},nb=GCM.nats.get(b).name;
  const m=guEl('div','position:fixed;inset:0;z-index:8600;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center');m.id='gpDeal';
  const c=guEl('div','background:#142231;border:1px solid #4a6580;border-radius:10px;padding:16px 20px;width:min(620px,94vw);max-height:88vh;overflow:auto;color:#e8e4d8;font-size:15px');m.appendChild(c);
  function draw(){const e=gpEval(a,b,d),s=e.score;c.innerHTML='';
    c.appendChild(guEl('h3','margin:0 0 4px;font-weight:600;font-size:20px','Peace with '+nb));
    const bar=guEl('div','height:10px;border-radius:5px;background:#0d1822;margin:6px 0 4px;position:relative;overflow:hidden');
    bar.appendChild(guEl('div','position:absolute;left:0;top:0;bottom:0;width:'+Math.max(0,Math.min(100,s))+'%;background:#6fae4a'));
    if(s>0)bar.appendChild(guEl('div','position:absolute;left:0;top:0;bottom:0;width:'+Math.min(100,e.cost)+'%;background:'+(e.ok?'#c9a35a':'#b5605a')+';opacity:.85'));c.appendChild(bar);
    c.appendChild(guEl('div','opacity:.85;margin-bottom:8px','War score '+s+(s>0?' — spending '+e.cost:' — you are losing the war')+'. '+(s>0?'Armies on their land and a long war raise it.':'')));
    const row=(chk,label,cost,on,tip)=>{const r=guEl('label','display:flex;gap:8px;align-items:center;padding:4px 6px;border-bottom:1px solid #22384b;cursor:pointer;'+(on?'background:#1b3045':''));const i=document.createElement('input');i.type='checkbox';i.checked=on;i.onchange=()=>{chk(i.checked);draw();};r.appendChild(i);
      r.appendChild(guEl('span','flex:1',label));r.appendChild(guEl('span','opacity:.8;font-size:13px',tip||''));r.appendChild(guEl('b','min-width:34px;text-align:right;color:#ffe6a8',cost?String(cost):'—'));c.appendChild(r);};
    if(s>0){c.appendChild(guEl('div','margin-top:6px;opacity:.7;font-size:13px','DEMANDS'));
      const ps=gpProvs(a,b);const lst=guEl('div','max-height:200px;overflow:auto;border:1px solid #22384b;border-radius:6px');c.appendChild(lst);const keep=c;
      for(const p of ps.slice(0,40)){const cost=gpProvCost(p.i,a),on=d.prov.includes(p.i);const r=guEl('label','display:flex;gap:8px;align-items:center;padding:3px 6px;cursor:pointer;'+(on?'background:#1b3045':''));const i=document.createElement('input');i.type='checkbox';i.checked=on;i.onchange=()=>{if(i.checked)d.prov.push(p.i);else d.prov=d.prov.filter(x=>x!==p.i);draw();};r.appendChild(i);
        r.appendChild(guEl('span','flex:1',p.n+(GC.nat[b].cap===p.i?' ★ capital':'')));r.appendChild(guEl('span','opacity:.7;font-size:13px','dev '+p.dev));r.appendChild(guEl('b','min-width:34px;text-align:right;color:#ffe6a8',String(cost)));lst.appendChild(r);}
      row(v=>d.trib=v,'War tribute — '+Math.round(Math.max(0,GC.nat[b].cash)*GP_TRIB)+' cash',15,d.trib);
      if(gpCanVassal(a,b))row(v=>d.vas=v,'Make '+nb+' your vassal (fights beside you, pays no tribute)',gpVasCost(a,b),d.vas);}
    else row(v=>d.pay=v,'Pay '+Math.round(GC.nat[a].cash*GP_PAY)+' cash to end the war',0,d.pay);
    c.appendChild(guEl('div','margin:8px 0;color:'+(e.ok?'#9fe39f':'#ffb3a8'),e.ok?(d.prov.length||d.trib||d.vas||d.pay?'They will accept.':'White peace — nothing changes hands. Truce 6 months.'):e.why));
    const br=guEl('div','display:flex;gap:8px');const sg=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid #7aa84f;background:#4f6b32;color:#fff;cursor:pointer;font-size:16px','Sign peace');sg.type='button';sg.disabled=!e.ok;if(!e.ok)sg.style.opacity='.45';
    sg.onclick=()=>{const r=gpApply(a,b,d);if(r){draw();}else m.remove();};const cn=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid #6b7a8a;background:transparent;color:#fff;cursor:pointer;font-size:16px','Keep fighting');cn.type='button';cn.onclick=()=>m.remove();br.appendChild(sg);br.appendChild(cn);c.appendChild(br);}
  m.addEventListener('keydown',ev=>{if(ev.key==='Escape')m.remove();});m.onclick=ev=>{if(ev.target===m)m.remove();};document.body.appendChild(m);draw();return m;}
// "Offer peace" in the Diplomacy tab opens the screen instead of a flat yes/no
(function(){const _act=gdAct;gdAct=function(act,a,b){if(act==='peace'&&a===GC.me){const c=gdChance(act,a,b);if(!c.ok)return c.note;gpOpen(a,b);return '';}return _act(act,a,b);};
if(typeof alAdd==='function')alAdd('peace','🕊','Peace terms',c=>{let best=null;for(const o of Object.keys(GC.nat)){if(o===c||GC.nat[o].dead||!grAtWar(c,o))continue;const s=gpScore(c,o);if(s>=30&&(!best||s>best.s))best={o,s};}
  return best?{n:best.s,tip:'you are winning against '+GCM.nats.get(best.o).name+' — open the peace screen',go:()=>gpOpen(c,best.o)}:null;});})();
