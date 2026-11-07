/* ---------- 08h-autobuild: the small "Auto-build" panel (Abdullah 2026-11-05 19:01 "smart auto-build") ----------
   Standing production orders: "keep 6 tanks and 20 infantry". Press U (or click the header) to open it, pick a unit, set how many
   to keep, and your factories keep the army topped up as money allows, highest line first (the arrows set priority). One switch
   pauses/resumes everything. It only ever sends the 'auto' command through doAct, so multiplayer and saves work like any other
   order; the sim (03g-battlefeel.js bfAutoTick) queues units through enqueue() exactly like a click, at most 3 per factory. */
const AB={open:false,sig:'',el:null,pick:'',n:6};
function abEl(){if(AB.el)return AB.el;const st=document.createElement('style');st.textContent=`
#autoP{position:fixed;left:8px;bottom:272px;z-index:12;width:236px;background:rgba(10,14,12,.9);border:1px solid #6b7a63;border-radius:8px;color:#e8efe4;font:12px system-ui,sans-serif;padding:5px 8px;user-select:none}
#autoP h4{margin:0;font:700 13px Saira Condensed,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
#autoP button,#autoP select,#autoP input{background:#2c3a26;border:1px solid #6b7a63;color:#f0f5e6;border-radius:5px;font:600 11px system-ui,sans-serif;padding:2px 6px;min-height:22px;cursor:pointer;margin:1px 2px 1px 0}
#autoP input{width:44px;cursor:text}#autoP button.on{background:#74d08f;color:#0a120c}#autoP button.off{background:#8a3a2a}
#autoP .row{display:flex;align-items:center;gap:2px;margin:2px 0}#autoP .row .nm{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#autoP .row .have{opacity:.75;min-width:34px;text-align:right}#autoP small{opacity:.7;display:block;margin-top:2px}`;document.head.append(st);
  const d=document.createElement('div');d.id='autoP';d.hidden=true;document.body.append(d);AB.el=d;
  d.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a]');if(!b)return;e.preventDefault();e.stopPropagation();abAct(b.dataset.a,b.dataset.k,b.dataset.v);},true);
  d.addEventListener('change',e=>{if(e.target.id==='abPick')AB.pick=e.target.value;if(e.target.id==='abN')AB.n=Math.max(1,Math.min(80,e.target.value|0||1));});
  d.addEventListener('keydown',e=>e.stopPropagation());return d;}
function abMine(){return G&&G.teams[ME]&&G.teams[ME].auto;}
function abAct(a,k,v){if(!G||G.over)return;const A=abMine();
  if(a==='open'){AB.open=!AB.open;AB.sig='';return abUI();}
  if(a==='pause')doAct({t:'auto',k:'_on',ti:A&&A.on===false?1:0});
  else if(a==='add'){const k=AB.pick;if(!k)return;doAct({t:'auto',k,ti:AB.n});}
  else if(a==='inc'||a==='dec'){const it=A&&A.list.find(i=>i.k===k);if(it)doAct({t:'auto',k,ti:Math.max(0,it.n+(a==='inc'?1:-1)*(+v||1))});}
  else if(a==='del')doAct({t:'auto',k,ti:0});else if(a==='up')doAct({t:'auto',k,ci:1});else if(a==='dn')doAct({t:'auto',k,ci:2});else if(a==='clr')doAct({t:'auto',k:'_clr'});
  AB.sig='';setTimeout(abUI,60);}
function abUI(){const d=abEl();if(!G||G.over||!G.teams[ME]||MODE==='spectate'||(typeof NET!=='undefined'&&NET.spec)){d.hidden=true;return;}const T=G.teams[ME],A=T.auto,R=roster(T.fac);
  if(!AB.open){d.hidden=true;AB.sig='';return;}if(typeof CT!=='undefined'&&CT.open){CT.open=false;if(typeof ctUI==='function')ctUI(true);}d.style.bottom=(236+(typeof CTP!=='undefined'&&CTP&&!CTP.hidden?CTP.offsetHeight+4:0))+'px';
  const sig=[AB.open,A?JSON.stringify(A):'',AB.pick,AB.n,Math.floor(G.t/3)].join('|');if(sig===AB.sig)return;AB.sig=sig;d.hidden=false;
  const on=!A||A.on!==false,tot=A?A.list.length:0;let h=`<h4 data-a="open"><span>Auto-build <small style="display:inline;opacity:.6">[U]</small></span><span>${tot?(on?'● on':'❚❚ paused'):''} ▾</span></h4>`;
  if(AB.open){const opts=[];for(const c of CATS)for(const k of (R[c]||[])){const s=stats(T.fac,k);if(!s||k==='cleric'||k==='champ')continue;opts.push([k,s.name,s.cost]);}if(!AB.pick&&opts.length)AB.pick=opts[0][0];
    h+=`<div style="margin-top:4px">`;
    if(A)for(const it of A.list){const s=stats(T.fac,it.k),have=unitCount(ME,it.k);h+=`<div class="row"><span class="nm" title="${s.name}">${s.name}</span><span class="have">${have}/${it.n}</span><button data-a="dec" data-k="${it.k}">−</button><button data-a="inc" data-k="${it.k}">+</button><button data-a="up" data-k="${it.k}">▲</button><button data-a="dn" data-k="${it.k}">▼</button><button data-a="del" data-k="${it.k}">×</button></div>`;}
    if(!A||!A.list.length)h+=`<small>Nothing standing yet. Pick a unit and how many to keep.</small>`;
    h+=`<div class="row"><select id="abPick">${opts.map(o=>`<option value="${o[0]}"${o[0]===AB.pick?' selected':''}>${o[1]} $${o[2]}</option>`).join('')}</select><input id="abN" type="number" min="1" max="80" value="${AB.n}"><button data-a="add">Keep</button></div>`;
    h+=`<div class="row"><button data-a="pause" class="${on?'on':'off'}">${on?'Running':'Paused'}</button><button data-a="clr">Clear all</button></div><small>Top line is built first. Money is saved for it.</small></div>`;}
  d.innerHTML=h;}
window.addEventListener('keydown',e=>{if(!G||G.over||e.ctrlKey||e.metaKey||e.altKey||(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)))return;if(e.key==='u'||e.key==='U'){e.preventDefault();AB.open=!AB.open;AB.sig='';abUI();}},true);
setInterval(()=>{try{if(typeof G!=='undefined'&&G&&G.teams)abUI();else if(AB.el)AB.el.hidden=true;}catch(e){}},500);
