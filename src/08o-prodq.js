/* ================= PRODUCTION QUEUES, Generals style (Abdullah 2026-11-13 20:15) =================
   Every production building has its own queue (sim: 03-sim.js enqueue/dequeue/production, b.q). This file is the screen side:
   - select a production building -> the UNITS tab shows only what it can make, and a queue strip above the command bar shows
     its queue (icons, progress bar on the first, "x3" badges). Left-click a unit = add one, Shift = add five, right-click a
     unit button or a queued icon = cancel one with a full refund. Several buildings of a type selected -> the least busy one.
   - nothing selected: the UNITS tab still works as a shortcut (adds to the least busy building of the right type, and says which).
   - a small badge + progress ring floats over every producing building of yours on the map; the minimap tooltip lists them. */
const PQ={sig:'',el:null,map:null,mapEls:[],last:0,mmT:0,tabFor:''};
function pqSel(){if(!G)return[];return G.sel.filter(e=>e.isB&&e.team===ME&&!e.dead&&e.built>=1&&CATS.includes(e.kind));}
// the building a click on unit k should feed: least busy selected building of that type, else the least busy one of that type anywhere
function pqTarget(k){const s=BASE[k]&&stats(G.teams[ME].fac,k);if(!s)return null;let best=null,bs=1e9;for(const e of pqSel())if(e.kind===s.from){const n=(e.q?e.q.length:0)+(e.dis>G.t?50:0);if(n<bs){bs=n;best=e;}}return best||qPick(ME,s.from);}
function pqAdd(k,n){if(!G||G.over)return;const T=G.teams[ME],s=stats(T.fac,k),sel=pqSel().some(e=>e.kind===s.from);let ok=0,b=null;
  for(let i=0;i<n;i++){b=pqTarget(k);if(!b){pushLog(`Requires ${STRUCT[s.from].name}.`,'w');return;}
    if(MODE==='client'?true:enqueue(ME,k,b.id)){if(MODE==='client')doAct({t:'q',k,tid:b.id});ok++;}else break;}
  if(!ok)pushLog('Not enough credits or missing building.','w');
  else if(!sel){const L=prodBlds(ME,s.from);if(L.length>1)pushLog(`${s.name}${ok>1?' ×'+ok:''} added to ${bldName(b)}.`);}
  try{sfxUI(420);}catch(_){}pqRender(true);}
function pqCancelKind(k){if(!G)return;const s=BASE[k];if(!s)return;let b=null;for(const e of pqSel())if(e.kind===s.from&&e.q&&e.q.some(i=>i.kind===k)){b=e;break;}doAct(b?{t:'dq',k,tid:b.id,ti:b.q.map(i=>i.kind).lastIndexOf(k)}:{t:'dq',k});pqRender(true);}
function pqCancelAt(b,i){doAct({t:'dq',k:b.q[i].kind,tid:b.id,ti:i});try{sfxUI(380);}catch(_){}pqRender(true);}
// Backspace/Delete (cancelInfo in 08-ui): the selected production building with a queue -> its last item
function pqCancelLast(sh){const b=pqSel().find(e=>e.q&&e.q.length);if(!b)return false;for(let n=sh?5:1,i=b.q.length-1;n>0&&i>=0;n--,i--)doAct({t:'dq',k:b.q[i].kind,tid:b.id,ti:i});return true;}
function pqProg(b){const it=b.q&&b.q[0];if(!it)return 0;const T=G.teams[b.team];return it.p!=null&&MODE==='client'?it.p:Math.min(1,it.t/prodTime(T,stats(T.fac,it.kind)));}
// runs of the same unit in a queue: [{kind,n,first,last}] so "x3" shows once and a right-click cancels the newest of the run
function pqRuns(b){const r=[];(b.q||[]).forEach((it,i)=>{const l=r[r.length-1];if(l&&l.kind===it.kind)l.n++,l.last=i;else r.push({kind:it.kind,n:1,first:i,last:i});});return r;}
function pqEnsure(){if(PQ.el)return;const d=document.createElement('div');d.id='pq';d.hidden=true;d.style.cssText='position:fixed;z-index:6;display:flex;flex-direction:column;gap:3px;pointer-events:auto;font:600 11px system-ui,sans-serif;color:#e8efe6';
  const st=document.createElement('style');st.textContent='#pq .pqr{display:flex;align-items:center;gap:4px;background:rgba(14,20,16,.88);border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:3px 6px}#pq .pqn{min-width:92px;font:700 11px system-ui,sans-serif;color:#cfe0c8}#pq .pqs{position:relative;width:46px;height:36px;border-radius:3px;background:linear-gradient(180deg,#36473d,#141b17);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);cursor:pointer;overflow:hidden}#pq .pqs.e{opacity:.28;cursor:default}#pq .pqs img{width:100%;height:100%;object-fit:contain;display:block}#pq .pqb{position:absolute;right:2px;bottom:2px;background:#e3b341;color:#1a1204;font:800 11px/1 system-ui,sans-serif;padding:1px 3px;border-radius:2px}#pq .pqp{position:absolute;left:0;bottom:0;height:4px;background:#6fe08a}#pq .pqh{color:#9db39a;font-weight:500;margin-left:4px}#pqm div{position:fixed;z-index:5;pointer-events:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 12px system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;transform:translate(-50%,-50%)}#pqm div i{position:absolute;inset:4px;border-radius:50%;background:rgba(10,16,12,.82);z-index:-1}#pqm div b{font:inherit}body.grandBattle #pq,body.grandBattle #pqm{display:none!important}#panel .pqx{display:none!important}';document.head.append(st);document.body.append(d);PQ.el=d;
  const m=document.createElement('div');m.id='pqm';document.body.append(m);PQ.map=m;}
function pqPlace(){const p=$('panel');if(!p||!PQ.el)return;const r0=p.getBoundingClientRect(),tb=document.querySelector('.tabs'),rt=tb?tb.getBoundingClientRect():null,r={left:r0.left,width:r0.width,height:r0.height,top:rt&&rt.height&&rt.top<r0.top?rt.top:r0.top};if(!r.width||!r.height){PQ.el.style.left='8px';PQ.el.style.bottom='150px';return;}PQ.el.style.left=Math.max(4,r.left)+'px';PQ.el.style.bottom=Math.max(4,innerHeight-r.top+4)+'px';}
function pqRender(force){if(!G||G.over||G.grand){if(PQ.el)PQ.el.hidden=true;return;}pqEnsure();const T=G.teams[ME],sel=pqSel().slice(0,4);
  let sig=sel.map(b=>b.id+':'+pqRuns(b).map(r=>r.kind+r.n).join('.')).join('|');
  const kinds=new Set(sel.map(b=>b.kind));
  // filter the UNITS tab to what the selected building(s) can make
  const fk=[...kinds].sort().join(',');if(PQ.fk!==fk||force==='f'){PQ.fk=fk;for(const b of document.querySelectorAll('#panel .btn[data-tab="units"]')){const k=b.id.slice(2),s=BASE[k]&&stats(T.fac,k);b.classList.toggle('pqx',!!(kinds.size&&s&&!kinds.has(s.from)));}
    for(const d of document.querySelectorAll('#panel .sub[data-tab="units"]')){const c=CATS.find(c=>STRUCT[c].name===d.textContent);d.classList.toggle('pqx',!!(kinds.size&&c&&!kinds.has(c)));}
    if(kinds.size&&typeof showTab==='function'&&PQ.tabFor!==fk){PQ.tabFor=fk;showTab('units');}if(!kinds.size)PQ.tabFor='';}
  if(sig!==PQ.sig||force){PQ.sig=sig;const el=PQ.el;el.innerHTML='';pqPlace();
    for(const b of sel){const row=document.createElement('div');row.className='pqr';const n=document.createElement('span');n.className='pqn';n.textContent=bldName(b);row.append(n);
      const runs=pqRuns(b),SL=8;for(let i=0;i<SL;i++){const sl=document.createElement('div');sl.className='pqs e';const r=runs[i];if(r){sl.className='pqs';const im=UK.icon(r.kind,T.color);sl.append(im);if(r.n>1){const bd=document.createElement('span');bd.className='pqb';bd.textContent='×'+r.n;sl.append(bd);}if(i===0){const pb=document.createElement('div');pb.className='pqp';pb.dataset.b=b.id;sl.append(pb);}const s=stats(T.fac,r.kind);sl.title=s.name+(r.n>1?' ×'+r.n:'')+' - right-click: cancel one (full refund)';sl.oncontextmenu=e=>{e.preventDefault();pqCancelAt(b,r.last);};}row.append(sl);}
      const h=document.createElement('span');h.className='pqh';const nq=b.q?b.q.length:0,sh=runs.slice(0,SL).reduce((s,r)=>s+r.n,0);h.textContent=nq>sh?'+'+(nq-sh)+' more':nq?nq+' queued':'idle';row.append(h);el.append(row);}
    el.hidden=!sel.length;}
  if(PQ.el&&!PQ.el.hidden)for(const pb of PQ.el.querySelectorAll('.pqp')){const b=G.byId.get(+pb.dataset.b);if(b)pb.style.width=Math.round(pqProg(b)*100)+'%';}}
// floating badge + progress ring over each producing building of mine
function pqMap(){if(!G||G.over||G.grand||!PQ.map)return;let n=0;const T=G.teams[ME];
  for(const e of G.ents){if(!e.isB||e.team!==ME||e.dead||!e.q||!e.q.length||!CATS.includes(e.kind))continue;const p=toScreen(e.x,(typeof groundH==='function'?groundH(e.x,e.y):0)+46,e.y);if(p.z>1||p.x<-30||p.y<-30||p.x>innerWidth+30||p.y>innerHeight+30)continue;
    let d=PQ.mapEls[n];if(!d){d=document.createElement('div');d.innerHTML='<i></i><b></b>';PQ.map.append(d);PQ.mapEls[n]=d;}
    d.style.display='flex';d.style.left=p.x.toFixed(0)+'px';d.style.top=p.y.toFixed(0)+'px';const f=Math.round(pqProg(e)*100);d.style.background=`conic-gradient(#6fe08a ${f}%,rgba(255,255,255,.22) 0)`;const t=e.q.length>1?'×'+e.q.length:'1';if(d.lastChild.textContent!==t)d.lastChild.textContent=t;n++;}
  for(let i=n;i<PQ.mapEls.length;i++)PQ.mapEls[i].style.display='none';
  const now=performance.now();if(now-PQ.mmT>1000){PQ.mmT=now;const mm=$('mm');if(mm){const L=[];for(const e of G.ents)if(e.isB&&e.team===ME&&!e.dead&&e.q&&e.q.length&&CATS.includes(e.kind))L.push(bldName(e)+': '+e.q.length+' queued');mm.title=L.length?'Producing - '+L.join(', '):'';}}}
(function pqLoop(){requestAnimationFrame(pqLoop);try{if(!G)return;const now=performance.now();if(now-PQ.last>90){PQ.last=now;pqRender();}pqMap();}catch(e){}})();
