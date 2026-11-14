/* ================= GENERALS STATS SCREEN (presentation, Abdullah 2026-11-13 21:24 "Generals stats screen" = built, lost, killed, money) =================
   Page 1 of the end of a battle: one table, a column per player in nation colours, rows = units built / lost / killed, buildings built / lost /
   destroyed, structures captured, money earned / spent, time in the match. Buttons: Continue (opens the awards, scoreboard and after-action map that were
   already on the end screen), Rematch, Main menu. Counters are T.st (03-sim stNew/endStats, they ride the checkpoint and the host's 'est' event);
   this file only draws them. View only. */
const GS_ROWS=[['Units built',p=>p.b|0],['Units lost',p=>p.lu|0],['Units killed',p=>p.ku|0],['Buildings built',p=>p.bb|0],['Buildings lost',p=>p.lb|0],['Buildings destroyed',p=>p.kb|0],
  ['Structures captured',p=>p.cb|0],['Money earned',p=>'$'+(p.me|0).toLocaleString('en-US')],['Money spent',p=>'$'+(p.ms|0).toLocaleString('en-US')],['Time in the match',p=>esT(p.ta)]];
function gsCss(){if($('gsCss'))return;const st=document.createElement('style');st.id='gsCss';st.textContent=`
#gsBox{border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(20,28,22,.92),rgba(10,14,12,.92));border-radius:6px;padding:14px 16px 16px;overflow-x:auto}
#gsBox h2{margin:0 0 10px}
#gsBox table{border-collapse:collapse;width:100%;font-size:16px;font-variant-numeric:tabular-nums}
#gsBox th,#gsBox td{padding:6px 12px;text-align:right;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap}
#gsBox th:first-child,#gsBox td:first-child{text-align:left;opacity:.85;letter-spacing:.03em}
#gsBox thead th{border-bottom:3px solid var(--c,#888);font-size:15px;letter-spacing:.06em;text-transform:uppercase}
#gsBox thead th small{display:block;font-size:11px;font-weight:500;opacity:.7;letter-spacing:.02em;text-transform:none}
#gsBox td.best{color:#f2c94c;font-weight:700}#gsBox th.win::after{content:" \\2605";color:#f2c94c}#gsBox th.me{background:rgba(255,255,255,.06)}
#gsBtns{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
#gsBtns button{font:700 15px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8efe4;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:4px;padding:8px 18px;cursor:pointer}
#gsBtns button:hover{background:rgba(255,255,255,.16)}#gsBtns button.pri{background:#2f5d3a;border-color:#6fbf82}
#endStats.gsFirst>section:not(#gsBox){display:none}`;document.head.append(st);}
function gsPage(S){const box=$('endStats');if(!box)return;const old=$('gsBox');if(old)old.remove();box.classList.remove('gsFirst');if(!S||!Array.isArray(S.p)||!S.p.length||box.hidden)return;
  gsCss();const ord=esOrder(S),sec=document.createElement('section');sec.id='gsBox';const h=document.createElement('h2');h.textContent='Battle report · '+esT(S.t);sec.append(h);
  const tb=document.createElement('table'),hd=document.createElement('tr');hd.append(document.createElement('th'));
  for(const i of ord){const p=S.p[i],th=document.createElement('th');th.style.setProperty('--c',p.c);th.className=(esWin(S,i)?'win ':'')+(i===ME?'me':'');th.textContent=FACTIONS[p.f]?FACTIONS[p.f].name:esName(p);const sm=document.createElement('small');sm.textContent=(p.n||(p.ai?'AI':'Player'))+(i===ME?' (you)':'');th.append(sm);hd.append(th);}
  const th0=document.createElement('thead');th0.append(hd);tb.append(th0);const bd=document.createElement('tbody');
  for(const [lab,f] of GS_ROWS){const tr=document.createElement('tr'),td0=document.createElement('td');td0.textContent=lab;tr.append(td0);
    const raw=ord.map(i=>{const v=f(S.p[i]);return typeof v==='number'?v:+String(v).replace(/[^0-9]/g,'');});const top=lab==='Time in the match'?-1:Math.max(...raw),multi=ord.length>1;
    ord.forEach((i,k)=>{const td=document.createElement('td');td.textContent=f(S.p[i]);if(multi&&top>0&&raw[k]===top&&!/lost|spent/.test(lab))td.className='best';tr.append(td);});bd.append(tr);}
  tb.append(bd);sec.append(tb);const bt=document.createElement('div');bt.id='gsBtns';
  const mk=(t,cls,fn)=>{const b=document.createElement('button');b.textContent=t;if(cls)b.className=cls;b.onclick=fn;bt.append(b);return b;};
  mk('Continue','pri',()=>{box.classList.remove('gsFirst');const c=bt.firstChild;if(c)c.hidden=true;});
  if(MODE==='single'&&$('again'))mk('Rematch','',()=>$('again').click());
  mk('Main menu','',()=>{const c=$('change');if(c)c.click();});
  sec.append(bt);box.prepend(sec);box.classList.add('gsFirst');}
{const _ep=esPage;esPage=function(S){const r=_ep.apply(this,arguments);try{gsPage(S);}catch(e){console.warn('genstats',e);}return r;};}

/* veteran look in the bar portrait (presentation): gold stripes, Elite silver-blue shimmer, Heroic gold glow */
{const st=document.createElement('style');st.textContent='.ukV .vsvg polygon{fill:#f2c94c;stroke:rgba(0,0,0,.7);stroke-width:1}.ukV.vet2 .vsvg polygon{fill:#bfe0ff}.ukV.vet2{color:#bfe0ff;animation:vetPulse 2.4s ease-in-out infinite}.ukV.vet3{color:#ffd76a;animation:vetPulse 1.6s ease-in-out infinite}.ukV.vet3 .vsvg polygon{fill:#ffd76a}@keyframes vetPulse{0%,100%{text-shadow:0 0 2px rgba(255,255,255,.0)}50%{text-shadow:0 0 9px currentColor}}';document.head.append(st);}

/* Classic Generals bar (presentation): minimap | selected unit / building | command + build grid; hotkey letters sit on the command buttons (em.hk) */
{const st=document.createElement('style');st.textContent='#tstrip button{position:relative}#tstrip .hk{position:absolute;right:3px;top:1px;font:700 10px system-ui,sans-serif;font-style:normal;color:#f2c94c;opacity:.95;pointer-events:none}@media(min-width:900px){body:not(.gbat) #side{grid-template-columns:238px minmax(300px,340px) 1fr}body:not(.gbat) #side>.ccard{order:3}body:not(.gbat) #side>:nth-child(3){order:2}}';document.head.append(st);}
