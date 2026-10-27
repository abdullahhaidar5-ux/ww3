/* ================= UI: sidebar, input, menu, main loop ================= */
const mouse={x:0,y:0,in:false};const keys={};let drag=null,TAB='build';
// Touch screens: TOUCHUI turns on touch wording and layout tweaks; PICKMIN is the smallest tap radius (px) around a unit.
let TOUCHUI=false,PICKMIN=10,LASTPT='mouse';
function log(team,msg,kind){FXE('log',[team,msg,kind||'']);}
function pushLog(m,k){if(!G)return;try{if(/ ready\.$/.test(m))speak(3);else if(/under attack/i.test(m))speak(4);}catch(e){}G.msgs.unshift({m,k});G.msgs.length=Math.min(G.msgs.length,5);
  // battle messages: a short feed over the battlefield's top-left corner, newest at the bottom; each line fades by itself
  const el=$('log');if(!el)return;const d=document.createElement('div');d.className=k||'';d.textContent=m;d.addEventListener('animationend',()=>d.remove());el.append(d);while(el.children.length>4)el.firstChild.remove();}
function endGame(winner,reason){if(!G||G.over)return;if(MODE==='host'&&G.out){G.out.push(['end',winner]);NET.evT=0;}showEnd(winner,reason);}
function rivals(){return G.teams.filter(T=>!ally(T.id,ME)).map(T=>T.F.name);}
function vsText(){const r=rivals();return r.length<=2?r.join(' and '):`${r.length} rivals`;}
function showEnd(winner,reason){if(!G)return;G.over=true;const T=G.teams,me=T[ME],m=Math.floor(G.t/60),s=Math.floor(G.t%60);
  const won=winner>=0&&ally(winner,ME);const wn=winner>=0?T.filter(Q=>ally(Q.id,winner)).map(Q=>Q.F.name):[];$('endt').textContent=won?'Victory':'Defeat';$('ends').textContent=(reason?reason+' ':'')+(winner>=0&&!won?`${wn.join(' and ')} won. `:won&&wn.length>1?`Your alliance (${wn.join(', ')}) won. `:'')+`${me.F.name} vs ${vsText()} · ${m}:${String(s).padStart(2,'0')}`+(MODE==='client'?'':` · You trained ${me.built} units, destroyed ${me.kills} enemy units and structures, and reached general rank ${me.rank}.`);
  $('again').hidden=MODE!=='single';if($('watch'))$('watch').hidden=true;$('end').hidden=false;}
function showElim(){if(!G)return;const left=G.teams.filter(T=>!T.out&&T.id!==ME).length;$('endt').textContent='Defeat';const why=G.teams[ME].whyOut;$('ends').textContent=`${G.teams[ME].F.name} has capitulated${why?': '+why:'.'} ${left} rival${left===1?'':'s'} still fighting. You can keep watching the battle.`;
  $('again').hidden=MODE!=='single';if($('watch'))$('watch').hidden=false;$('end').hidden=false;}

/* ---------- panels ---------- */
function btnHTML(id,name,cost,desc){return `<button class="btn" id="${id}"><span class="n"></span><span class="c"></span>${desc!=null?'<span class="d"></span>':''}<span class="q"></span><span class="p"></span></button>`;}
function buildPanels(){const T=G.teams[ME],el=$('panel');el.innerHTML='';const mk=(tab,id,name,cost,desc,on,onR,wide)=>{const b=document.createElement('button');b.className='btn'+(wide?' wide':'');b.id=id;b.dataset.tab=tab;
    b.innerHTML=`<span class="n"></span><span class="c"></span>${desc?'<span class="d"></span>':''}<span class="q"></span><span class="p"></span>`;b.querySelector('.n').textContent=name;b.querySelector('.c').textContent=cost;if(desc)b.querySelector('.d').textContent=desc;b.dataset.nm=name;if(desc)b.dataset.desc=desc;
    b.onclick=on;if(onR)b.oncontextmenu=e=>{e.preventDefault();onR();};el.append(b);return b;};
  const sub=(tab,txt)=>{const d=document.createElement('div');d.className='sub';d.dataset.tab=tab;d.textContent=txt;el.append(d);};
  for(const k of BUILD_ORDER){const s=bstats(T.fac,k);mk('build','b_'+k,s.name,'$'+s.cost,null,()=>{if(T.credits<s.cost||!reqMet(ME,k))return;G.aim=null;G.place=G.place===k?null:k;});}
  const R=roster(T.fac);for(const c of CATS){sub('units',STRUCT[c].name);for(const k of R[c]){const s=stats(T.fac,k);mk('units','u_'+k,s.name,'$'+s.cost,null,()=>{if(!(MODE==='client'?true:enqueue(ME,k)))pushLog('Not enough credits or missing building.','w');else if(MODE==='client')doAct({t:'q',k});},()=>doAct({t:'dq',k}));}}
  const ups=upgList(T.fac);for(const c of CATS){const list=ups.filter(k=>UPG[k].at===c);if(!list.length)continue;sub('upg',STRUCT[c].name);for(const k of list){const U=UPG[k];mk('upg','g_'+k,upgName(T.fac,k)+(U.sp?' ★':''),'$'+U.cost,U.desc,()=>doAct({t:'up',k}),null,true);}}
  for(const k in POWERS){const P=powInfo(k,T.fac);mk('pow','p_'+k,P.name,'',P.desc,()=>{if(!T.pw[k]){doAct({t:'buy',k});return;}if(P.passive||T.pw[k].cd>0)return;if(P.self){doAct({t:'pow',k,x:0,y:0});return;}G.place=null;G.aim=k;},null,true);}
  sub('pow','Level up');for(const k in POWERS){const P=powInfo(k,T.fac);mk('pow','pu_'+k,'▲ '+P.name,'',P.passive?'Bigger bounty per level':'Level 2: about 40% stronger, 15% faster cooldown. Level 3: about 80% stronger, 30% faster.',()=>doAct({t:'buy',k}),null,true);}
  showTab(TAB);updateUI();}
function showTab(t){TAB=t;const pn=$('panel');if(pn)pn.scrollLeft=0;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));document.querySelectorAll('#panel>[data-tab]').forEach(b=>b.hidden=b.dataset.tab!==t);}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{if(barMin())barMin(false);showTab(b.dataset.tab);});
function specLock(T,k){return k===T.F.special&&T.rank<SPEC_RANK;}
// the full text of a button (what it does, what it needs, what it counters) lives in data-tip and shows in the command
// tooltip (hover with a mouse; tap or long-press on a touch screen) instead of on the button itself
function setBtn(id,o){const b=$(id);if(!b)return;b.disabled=!!o.dis;if(o.cost!=null)b.querySelector('.c').textContent=o.cost;b.querySelector('.q').textContent=o.q||'';b.querySelector('.p').style.width=(o.p||0)*100+'%';b.classList.toggle('on',!!o.on);b.classList.toggle('done',!!o.done);b.classList.toggle('rdy',!!o.rdy);const t=o.title||'';if(b.dataset.tip!==t){b.dataset.tip=t;b.setAttribute('aria-label',[b.dataset.nm,b.dataset.desc,t].filter(Boolean).join('. '));}if(CTIP.b===b)ctipFill(b);}
const CTIP={el:null,b:null,hideT:0,lp:null,eat:0};
function ctipEl(){if(!CTIP.el){const d=document.createElement('div');d.id='ctip';d.hidden=true;d.setAttribute('role','tooltip');document.body.append(d);CTIP.el=d;}return CTIP.el;}
function ctipFill(b){const d=ctipEl();d.innerHTML='';const n=document.createElement('b');n.textContent=b.dataset.nm||b.querySelector('.n').textContent;const c=document.createElement('span');c.className='tc';c.textContent=[b.querySelector('.c').textContent,b.querySelector('.q').textContent?'queued '+b.querySelector('.q').textContent:''].filter(Boolean).join(' · ');d.append(n,c);
  if(b.dataset.desc){const s=document.createElement('span');s.textContent=b.dataset.desc;d.append(s);}if(b.dataset.tip){const s=document.createElement('span');s.className='tw';s.textContent=TOUCHUI?b.dataset.tip.replace(/Right-click/g,'Tap').replace(/right-click/g,'tap'):b.dataset.tip;d.append(s);}}
function ctipShow(b,ms){const d=ctipEl();clearTimeout(CTIP.hideT);CTIP.b=b;ctipFill(b);d.hidden=false;const r=b.getBoundingClientRect(),w=d.offsetWidth;d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';if(ms)CTIP.hideT=setTimeout(ctipHide,ms);}
function ctipHide(){clearTimeout(CTIP.hideT);CTIP.b=null;if(CTIP.el)CTIP.el.hidden=true;}
// which command button is under a point (disabled buttons let events through to the grid, so look them up by position)
function btnAt(x,y){for(const b of $('panel').children){if(!b.classList.contains('btn')||b.hidden||b.style.display==='none')continue;const r=b.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return b;}return null;}
{const pn=$('panel');
  pn.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const b=btnAt(e.clientX,e.clientY);if(b&&b!==CTIP.b)ctipShow(b);else if(!b&&CTIP.b)ctipHide();});
  pn.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')ctipHide();});
  // touch: a long press shows the full description without pressing the button; a tap presses it and shows it briefly
  pn.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const b=btnAt(e.clientX,e.clientY);if(!b)return;clearTimeout(CTIP.lp&&CTIP.lp.t);const L={x:e.clientX,y:e.clientY,b,fired:false};L.t=setTimeout(()=>{L.fired=true;ctipShow(b);try{navigator.vibrate&&navigator.vibrate(12);}catch(_){}},450);CTIP.lp=L;});
  pn.addEventListener('pointermove',e=>{const L=CTIP.lp;if(L&&e.pointerType!=='mouse'&&Math.hypot(e.clientX-L.x,e.clientY-L.y)>10){clearTimeout(L.t);CTIP.lp=null;}});
  const up=e=>{const L=CTIP.lp;if(!L||e.pointerType==='mouse')return;clearTimeout(L.t);CTIP.lp=null;if(L.fired){CTIP.eat=performance.now();if(CTIP.b)CTIP.hideT=setTimeout(ctipHide,2500);}else if(e.type==='pointerup'&&L.b)ctipShow(L.b,2600);};
  pn.addEventListener('pointerup',up);pn.addEventListener('pointercancel',up);
  // after a long press the finger lifts: swallow the click (and the long-press context menu) so nothing is bought
  pn.addEventListener('click',e=>{if(CTIP.eat&&performance.now()-CTIP.eat<1000){CTIP.eat=0;e.stopPropagation();e.preventDefault();}},true);
  pn.addEventListener('contextmenu',e=>{if((CTIP.lp&&CTIP.lp.fired)||CTIP.eat&&performance.now()-CTIP.eat<1000){e.stopPropagation();e.preventDefault();}},true);
  // mouse wheel scrolls the command grid sideways
  pn.addEventListener('wheel',e=>{if(pn.scrollWidth<=pn.clientWidth+1||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();pn.scrollLeft+=(e.deltaMode===1?e.deltaY*33:e.deltaY);},{passive:false});
  pn.addEventListener('scroll',()=>{if(CTIP.b&&!CTIP.lp)ctipHide();},{passive:true});}
function renderAllies(){const el=$('allyBox');if(!el||!G)return;const T=G.teams[ME];const A=G.teams.filter(O=>O.id!==ME&&ally(O.id,ME)&&!O.out);el.hidden=!A.length||!!G.sandbox;if(el.hidden)return;
  const key=A.map(O=>O.id).join(',');if(el.dataset.k!==key){el.dataset.k=key;el.innerHTML='<div class="lbl"><span>Allies</span><span id="allyt" style="font:12px var(--mono);color:var(--dim)">send money</span></div>';
    for(const O of A){const r=document.createElement('div');r.className='ar';r.innerHTML=`<b style="color:${O.color}">${O.F.name}</b>`;const sm=document.createElement('small');sm.dataset.c=O.id;r.append(sm);
      for(const v of [250,1000,'½']){const b=document.createElement('button');b.textContent=v==='½'?'Half':'+$'+v;b.dataset.v=v;b.title=v==='½'?'Send half of your money':`Send $${v}`;b.onpointerdown=ev=>{ev.preventDefault();const amt=v==='½'?Math.floor(G.teams[ME].credits/2):v;doAct({t:'give',to:O.id,amt});};r.append(b);}el.append(r);}}
  for(const sm of el.querySelectorAll('small[data-c]')){const O=G.teams[+sm.dataset.c];sm.textContent='$'+Math.floor(O.credits);}
  for(const b of el.querySelectorAll('button'))b.disabled=b.dataset.v==='½'?T.credits<100:T.credits<+b.dataset.v;}
function updateUI(){if(!G)return;renderSquads();renderAllies();const T=G.teams[ME];sbPanel();$('facname').textContent=T.F.name;$('facname').style.color=T.color;$('credits').textContent=G.sandbox&&ME===0?'∞ Unlimited':'$'+Math.floor(T.credits).toLocaleString();
  for(const k of BUILD_ORDER){const s=bstats(T.fac,k),ok=reqMet(ME,k);if(!bldAllowed(T.fac,k)){setBtn('b_'+k,{dis:true,cost:'Not available',title:'This faction has no air force'});continue;}const lim=s.limit&&G.ents.filter(e=>!e.dead&&e.isB&&e.team===ME&&e.kind===k).length>=s.limit;setBtn('b_'+k,{dis:!ok||T.credits<s.cost||lim,cost:lim?'Max '+s.limit:'$'+s.cost,on:G.place===k,title:ok?(STRUCT[k].desc||(STRUCT[k].shore?'Place on the shoreline':'')):`Requires ${STRUCT[STRUCT[k].req].name}`});}
  for(const k of allUnits(T.fac)){const s=stats(T.fac,k),q=T.q[s.from]||[],n=q.filter(x=>x.kind===k).length,has=done(ME,s.from);const first=q[0]&&q[0].kind===k?(q[0].p!=null?q[0].p:q[0].t/prodTime(T,s)):0;
    const lk=specLock(T,k);setBtn('u_'+k,{dis:lk||!has||(T.credits<s.cost&&!n),cost:lk?`General rank ${SPEC_RANK}`:k===T.F.special?'$'+s.cost+(T.rank>=6?' · Elite':T.rank>=4?' · Veteran':''):'$'+s.cost,q:n?'×'+n:'',p:first,title:(lk?`Unlocks at general rank ${SPEC_RANK}; gets Veteran (+20%) at rank 4 and Elite (+40%) at rank 6. `:'')+(has?'':`Requires ${STRUCT[s.from].name}. `)+(k===T.F.special&&SPECIAL_TIP[k]?SPECIAL_TIP[k](s)+' ':'')+(COUNTER[k]||COUNTER[s.cls]||'')});}
  for(const k of upgList(T.fac)){const U=UPG[k],r=T.rq[U.at],mine=r&&r.key===k;setBtn('g_'+k,{dis:T.upg[k]||!done(ME,U.at)||(!!r&&!mine)||T.credits<U.cost&&!mine,done:T.upg[k],cost:T.upg[k]?'Researched':mine?'Researching…':'$'+U.cost,p:mine?r.t/U.time:0,title:done(ME,U.at)?'':`Requires ${STRUCT[U.at].name}`});}
  const pts=T.rank-T.spent;for(const k in POWERS){const P=powInfo(k,T.fac),w=T.pw[k];const lv=w?(w.lv||1):0;setBtn('p_'+k,{dis:w?(P.passive||w.cd>0):pts<1,done:!!w,on:G.aim===k,cost:w?('Lv '+lv+' · '+(P.passive?'Active':w.cd>0?`Ready in ${Math.ceil(w.cd)}s`:(P.self?'Ready · click to use':'Ready · click, then pick a spot'))):`Unlock · 1 point`});
    {const b=$('pu_'+k);if(b){const c=lv>=1&&lv<3?lv+1:0;b.style.display=c?'':'none';if(c)setBtn('pu_'+k,{dis:pts<c,cost:`To level ${lv+1} · ${c} points`});}}}
  const dot=$('pdot');const tb=document.querySelector('.tabs button[data-tab="pow"]');if(tb){let d=tb.querySelector('.dot');if(pts>0&&!d){d=document.createElement('span');d.className='dot';tb.append(d);}else if(pts<=0&&d)d.remove();}
  const up=done(ME,'uplink'),f=T.charge/T.sup.charge,rem=Math.max(0,Math.ceil(T.sup.charge-T.charge));$('supname').textContent=T.sup.name;$('side').classList.toggle('hasUp',!!up);$('supbar').style.width=(up?f*100:0)+'%';
  $('supt').textContent=!up?'needs Strike Center':f>=1?'READY':`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;$('supbtn').disabled=!(up&&f>=1);
  const nx=RANKS[T.rank]||null,pr=RANKS[T.rank-1];$('rankname').textContent=`General rank ${T.rank}`+(pts>0?` · ${pts} point${pts>1?'s':''} to spend`:'');$('rankbar').style.width=(nx?Math.min(1,(T.gxp-pr)/(nx-pr))*100:100)+'%';$('rankt').textContent=nx?`${T.gxp}/${nx} XP`:'Max rank';
  const md=$('mode'),mdSet=v=>{if(TOUCHUI)md.dataset.d=v;else md.textContent=v;};if(G.place){md.hidden=false;mdSet(`Place ${STRUCT[G.place].name}`+(STRUCT[G.place].shore?' on the shore':'')+' · a Construction Vehicle will drive here and build it'+' · Esc cancels');}else if(G.aim){md.hidden=false;mdSet(`Choose a target for ${G.aim==='sup'?T.sup.name:powInfo(G.aim,G.teams[ME].fac).name}`);}else if(G.amove){md.hidden=false;mdSet('Attack-move: click a destination');}else if(G.defm){md.hidden=false;mdSet('Defend area: click the spot to hold');}else md.hidden=true;if(TOUCHUI)touchHud(md);
  const s=G.sel.filter(e=>!e.dead);const el=$('info');el.innerHTML='';const b=document.createElement('b'),sp=document.createElement('span'),tip=document.createElement('span');tip.className='tip';
  if(s.length===1){const e=s[0];b.textContent=e.s.name+(e.rank?` · ${VET[e.rank]}`:'');sp.textContent=` ${Math.ceil(e.hp)} / ${e.max} HP`+(e.isB&&e.built<1?` · building ${Math.floor(e.built*100)}%`:'')+((e.dis>G.t||e.disv)?' · HACKED':'')+(e.kind==='jet'?` · ${e.landed?'parked':'airborne'}`:'');
    tip.textContent=e.kind==='hacker'?'Right-click an enemy building to disable it. Idle hackers earn cash.':e.s.demo?'Stealthed. Right-click an enemy building to plant explosives.':e.kind==='hero'?'Stealthed until it fires. Snipes infantry from long range.':e.kind==='jet'?'Right-click a target to strike. Jets return to the airfield to rearm.':e.kind==='harv'?'Right-click a supply field to send it there.':e.kind==='dozer'?'Builds everything: pick a building under Build, then click the map. Right-click an unfinished building to help. Repairs buildings it stands next to.':e.isB&&e.kind==='tunnel'&&e.team===ME?`Units inside: ${MODE==='client'?(T.tunN|0):T.tun.length} of 12. Select units and right-click a tunnel to send them in; they heal inside and can come out of any tunnel.`:e.isB&&e.nd&&e.built<1?(e.stall?'Waiting for a Construction Vehicle to arrive and build it.':'A Construction Vehicle is building this.'):e.isB&&e.team===ME&&CATS.includes(e.kind)?'Right-click the ground to set the rally point.':'';}
  else if(s.length){const c={};for(const e of s)c[e.s.name]=(c[e.s.name]||0)+1;b.textContent=`${s.length} selected`;sp.textContent=' '+Object.entries(c).map(([n,v])=>`${v}× ${n}`).join(' · ');}
  else{sp.textContent=TOUCHUI?'Tap a unit or building to select it. Double-tap a unit to select all of that type on screen.':'Click to select units or a building. Double-click selects all of a type on screen.';}
  if(s.length===1&&!s[0].isB&&s[0].aband)tip.textContent=ally(s[0].team,ME)?'Abandoned - the crew bailed out. Select infantry and right-click it to re-crew it before the enemy captures it.':'Abandoned enemy vehicle - select infantry and right-click it to capture it.';
  if(s.length===1&&!s[0].isB&&!s[0].aband&&SPECIAL_TIP[s[0].kind]&&s[0].kind===G.teams[s[0].team].F.special)tip.textContent=SPECIAL_TIP[s[0].kind](s[0].s);
  if(s.length===1&&!s[0].isB&&(COUNTER[s[0].s.cls]||COUNTER[s[0].kind])&&!tip.textContent)tip.textContent=COUNTER[s[0].kind]||COUNTER[s[0].s.cls];
  {const ms=s.filter(e=>!e.isB).map(moraleOf).filter(Boolean);if(ms.length){const avg=ms.reduce((a,m)=>a+m.v,0)/ms.length,fl=ms.every(m=>m.st==='fearless'),ls=ms.filter(m=>m.st==='last').length,rt=ms.filter(m=>m.st==='routing').length;const T0=G.teams[s[0].team],why=NOBREAK[T0.fac]?'never break':T0.clr?'Ayatollah':(T0.mart||0)>G.t?'martyrdom':'fervor';const st=fl?'fearless':ls>ms.length/2?'last':rt>ms.length/2?'routing':avg>.66?'steady':avg>.35?'shaken':'breaking';
    const mb=document.createElement('div');mb.className='morale';mb.innerHTML=`<span class="ml">Morale</span><span class="mbar"><i style="width:${Math.round(avg*100)}%;background:${MOR_COL[st]}"></i></span><span class="mt" style="color:${MOR_COL[st]}">${fl?'Fearless ('+why+')':MOR_TXT[st]+(st==='last'?'':' '+Math.round(avg*100)+'%')}${rt&&!fl?' · '+rt+' routing':''}${ls&&st!=='last'?' · '+ls+' last stand':''}</span>`;
    mb.title='Morale falls when units take fire, see comrades die or are outnumbered, and recovers out of combat. At zero they break and run back to base, ignoring orders, and take 25% extra damage while running. They rally fast near their HQ, an Ayatollah, a friendly-held building or an officer. Surrounded troops make a last stand instead (fearless but pinned). Crews bail out of badly damaged vehicles, which infantry can re-crew or capture. '+(fl?(NOBREAK[T0.fac]?'North Korean troops never break.':'While the Ayatollah lives, these troops never break.'):'Veterans, heroes, officers and cover help.');sp.after(mb);}}
  if(TOUCHUI&&tip.textContent)tip.textContent=tip.textContent.replace(/Right-click/g,'Tap').replace(/right-click/g,'tap');
  el.append(b,sp);if(tip.textContent)el.append(tip);
  if(s.some(u=>!u.isB&&u.team===ME&&!u.s.noAttack)){const r=document.createElement('div');r.className='cmdrow';const bd=document.createElement('button');bd.textContent=(s.some(u=>u.defend)?'✓ Defending · ':'')+'Defend area (G)';bd.onclick=()=>{G.defm=!G.defm;G.amove=false;updateUI();};const ba=document.createElement('button');ba.textContent='⚔ Attack (F)';ba.title='Advance to the spot you click and fight everything on the way';ba.onclick=()=>{G.amove=!G.amove;G.defm=false;updateUI();};if(G.amove){ba.classList.add('on');ba.textContent=TOUCHUI?'⚔ Attack: tap map…':'⚔ Attack: click map…';}bd.textContent=G.defm?(TOUCHUI?'🛡 Defend: tap map…':'🛡 Defend: click map…'):'🛡 '+bd.textContent;if(G.defm)bd.classList.add('on');bd.title='Hold the spot you click: engage anything that comes near it, then return';const bs=document.createElement('button');bs.textContent='Stop (X)';bs.onclick=()=>{doAct({t:'stop',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});};const br=document.createElement('button');br.textContent=s.some(u=>u.retreat)?'↩ Retreating…':'↩ Retreat (R)';br.title='Run back to the nearest HQ, barracks or factory: a bit faster and harder to hit, no stopping to fight';br.onclick=()=>{doAct({t:'ret',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});speak(2);};r.append(ba,bd,bs,br);el.append(r);}
  if(s.length===1&&!s[0].isB&&s[0].s.cap&&s[0].team===ME){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';const n=MODE==='client'?'':` (${cargoLoad(s[0])}/${s[0].s.cap})`;ub.textContent='Unload troops here'+n;const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='garrison'&&s[0].team===ME){const c=civAtXYAny(s[0].x,s[0].y),n=MODE==='client'?(s[0].occN|0):(c?c.occ.length:0),cap=MODE==='client'?(s[0].capN|0):(c?c.cap:0);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>Troops inside: '+n+' / '+cap+'</b><br>Safe inside, firing out at 20% longer range. Shells, rockets and tank guns can bring the building down.';el.append(d);const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring troops out';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'ungar',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1){const n=MODE==='client'?(T.tunN|0):T.tun.length,K=MODE==='client'?(T.tunK||{}):tunKinds(T);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>In the tunnel network: '+n+' / '+TUN_CAP+'</b>'+(n?'<br>'+Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+' × '+((()=>{try{return stats(T.fac,k).name}catch(_){return k}})())).join('<br>'):'<br>Empty. Right-click a tunnel with units selected to send them in.');el.append(d);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1&&(MODE==='client'?T.tunN:T.tun.length)){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring units out here';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  const net=$('net');if(MODE!=='single'){net.hidden=false;net.innerHTML=`<b>●</b> Online · ${MODE==='host'?'hosting':'connected'} · vs ${vsText()}`;}else net.hidden=true;}
$('supbtn').onclick=()=>{G.place=null;G.aim='sup';};


/* ---------- squads: group units so they move together ---------- */
// Up to 5 squads. "Group selected" (or Ctrl/Shift + 1-5) puts the selection in a squad; click a squad button or press 1-5 to
// select it, click twice to jump the camera to it. A squad moves in formation at the pace of its slowest unit.
const SQN=5;function sqList(i){if(!G||!G.sq)return[];const ids=G.sq[i]||[];return ids.map(id=>G.byId.get(id)).filter(u=>u&&!u.dead&&u.team===ME);}
function sqOfSel(){const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(own.length<2)return -1;for(let i=1;i<=SQN;i++){const L=sqList(i);if(L.length&&L.length===own.length&&own.every(u=>L.includes(u)))return i;}return -1;}
function sqAssign(i){const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(!own.length)return false;G.sq=G.sq||{};for(let k=1;k<=SQN;k++)if(k!==i&&G.sq[k])G.sq[k]=G.sq[k].filter(id=>!own.some(u=>u.id===id));G.sq[i]=own.map(u=>u.id);pushLog(`Squad ${i} formed: ${own.length} unit${own.length>1?'s':''}. It will move in formation.`,'g');sfxUI(520);renderSquads();return true;}
let sqLast={i:0,t:0};function sqSelect(i){const L=sqList(i);if(!L.length)return;const now=performance.now();if(sqLast.i===i&&now-sqLast.t<450){const x=L.reduce((s,u)=>s+u.x,0)/L.length,y=L.reduce((s,u)=>s+u.y,0)/L.length;centerOn(x,y);}sqLast={i,t:now};G.sel=L.slice();speak(0);updateUI();renderSquads();}
function renderSquads(){const el=$('sqs');if(!el||!G)return;if(!el.children.length)for(let i=1;i<=SQN;i++){const b=document.createElement('button');b.dataset.i=i;b.onclick=e=>{const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);if(e.shiftKey||e.ctrlKey||(!sqList(i).length&&own.length))sqAssign(i);else sqSelect(i);};el.append(b);}
  const cur=sqOfSel();G.sqOf={};for(let i=1;i<=SQN;i++){const L=sqList(i);if(G.sq)G.sq[i]=L.map(u=>u.id);for(const u of L)G.sqOf[u.id]=i;const b=el.children[i-1];b.innerHTML='';b.append(String(i));const sm=document.createElement('small');sm.textContent=L.length?`${L.length} unit${L.length>1?'s':''}`:'empty';b.append(sm);{const ms=L.map(moraleOf).filter(Boolean);if(ms.length){const avg=ms.reduce((a,m)=>a+m.v,0)/ms.length,fl=ms.every(m=>m.st==='fearless'),rt=ms.some(m=>m.st==='routing');const st=fl?'fearless':rt?'routing':avg>.66?'steady':avg>.35?'shaken':'breaking';const q=document.createElement('span');q.className='sqm';q.innerHTML=`<i style="width:${Math.round(avg*100)}%;background:${MOR_COL[st]}"></i>`;q.title='Squad morale: '+MOR_TXT[st];b.append(q);if(rt)b.classList.add('rout');else b.classList.remove('rout');}}b.classList.toggle('on',cur===i);b.classList.toggle('empty',!L.length);b.title=L.length?`Squad ${i}: click to select, click again to find it. Shift+click to replace it with the selection.`:'Empty: select units, then click here to make them squad '+i+'.';}
  const mk=$('sqMake');if(mk)mk.disabled=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).length<1;}
function selectArmy(){if(!G)return;G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!['harv','hacker','dozer'].includes(u.kind)&&!u.dead);if(G.sel.length)speak(0);updateUI();}
{const mk=$('sqMake');if(mk&&!$('sqAll')){const w=document.createElement('span');w.className='sqbtns';const a=document.createElement('button');a.id='sqAll';a.textContent='All army';a.title='Select every combat unit you have (Q)';a.onclick=selectArmy;mk.replaceWith(w);w.append(a,mk);}}
if($('sqMake'))$('sqMake').onclick=()=>{if(!G)return;let i=0;for(let k=1;k<=SQN;k++)if(!sqList(k).length){i=k;break;}if(!i)i=1;sqAssign(i);};
/* ---------- input ---------- */
function mpos(e){const r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;}
function pickAt(sx,sy,own){let best=null,bd=1e9;for(const e of G.ents){if(e.dead||!vis(e))continue;if(own&&e.team!==ME)continue;if(e.team!==ME&&e.hid)continue;const p=toScreen(e.x,unitH(e)+entHeightMid(e)*.6,e.y);const rad=Math.max(PICKMIN,(e.isB?e.size*.55:e.r+3)*PPU);const d=Math.hypot(p.x-sx,p.y-sy);if(d<rad&&d<bd){bd=d;best=e;}}return best;}
function fieldAt(w){const i=G.fields.findIndex(f=>Math.hypot(f.x-w.x,f.y-w.y)<f.r+10);return i;}
cv.addEventListener('mouseenter',e=>{mpos(e);mouse.in=true;});cv.addEventListener('mouseleave',()=>{mouse.in=false;});
cv.addEventListener('mousemove',e=>{mpos(e);});
cv.addEventListener('wheel',e=>{e.preventDefault();const dy=(e.deltaMode===1?e.deltaY*33:e.deltaY)*(SET.inv?-1:1)*(SET.zm||100)/100;camTarget();const od=cam.td,nd=Math.max(200,Math.min(1800,cam.td*Math.exp(dy*.0012)));cam.td=nd;{const w=screenToWorld(mouse.x,mouse.y);if(w){const f=1-nd/od;cam.tx+=(w.x-cam.tx)*f*.9;cam.ty+=(w.y-(cam.ty+cam.dist*.08))*f*.9;}}},{passive:false});
function issueCmd(w,t,rally){
    const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);
    if(rally&&!units.length&&G.sel.some(b=>b.isB&&b.team===ME)){doAct({t:'rally',x:w.x,y:w.y});pushLog('Rally point set.');return true;}
    if(!units.length)return false;const ids=units.map(u=>u.id);
    if(!t){const oi=G.oil.findIndex(o=>!o.dead&&!ally(o.owner,ME)&&o.owner>=0&&Math.hypot(o.x-w.x,o.y-w.y)<38);if(oi>=0){doAct({t:'atkOil',ids,fi:oi});speak(2);FXH.ping(G.oil[oi].x,G.oil[oi].y,30);return true;}}
    if(t&&t.team===ME&&!t.isB&&t.s.cap&&units.some(u=>u!==t&&canBoard(t,u))){doAct({t:'board',ids:units.filter(u=>u!==t&&canBoard(t,u)).map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.kind==='tunnel'&&t.built>=1&&units.some(u=>u.s.dom==='ground'&&u.kind!=='harv')){doAct({t:'tun',ids:units.filter(u=>u.s.dom==='ground'&&u.kind!=='harv').map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.built<1&&units.some(u=>u.kind==='dozer')){doAct({t:'bldGo',ids:units.filter(u=>u.kind==='dozer').map(u=>u.id),tid:t.id});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)&&t.aband&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){const inf=units.filter(u=>isInf(u.s)&&!u.s.noAttack);doAct({t:'go',ids:inf.map(u=>u.id),x:t.x,y:t.y,mode:'move'});const rest=units.filter(u=>!inf.includes(u));if(rest.length)doAct({t:'go',ids:rest.map(u=>u.id),x:t.x,y:t.y,mode:'amove'});speak(1);FXH.ping(t.x,t.y,30);pushLog('Infantry moving to capture the abandoned vehicle.');return true;}
    if(t&&ally(t.team,ME)&&t.aband&&!t.isB&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){doAct({t:'go',ids:units.filter(u=>isInf(u.s)&&!u.s.noAttack).map(u=>u.id),x:t.x,y:t.y,mode:'move'});speak(1);FXH.ping(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)){doAct({t:'atk',ids,tid:t.id});speak(2);FXH.ping(t.x,t.y,24);return true;}
    {const c=(!t||(t.kind==='garrison'&&ally(t.team,ME)))?(t&&t.kind==='garrison'?civAtXYAny(t.x,t.y):civUnder(mouse.x,mouse.y,w)):null;
     if(c&&!c.dead){const inf=units.filter(u=>canGarrison(u));const rest=units.filter(u=>!canGarrison(u)&&u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker');
       if(inf.length){doAct({t:'gar',ids:inf.map(u=>u.id),ci:c.i});speak(1);FXH.ping(c.x,c.y,30);if(!rest.length)return true;}
       if(rest.length&&!(t&&t.kind==='garrison')){doAct({t:'atkCiv',ids:rest.map(u=>u.id),ci:c.i});speak(2);FXH.ping(c.x,c.y,24);return true;}
       if(inf.length)return true;}}
    const fi=fieldAt(w);if(fi>=0&&units.some(u=>u.kind==='harv')){doAct({t:'fld',ids,fi});const rest=units.filter(u=>u.kind!=='harv').map(u=>u.id);if(rest.length)doAct({t:'go',ids:rest,x:w.x,y:w.y,mode:'move'});return true;}
    doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0,q:G.qShift?1:0});speak(1);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:G.qShift?0xe3b341:0x74d08f});return true;
}
// Controls (mouse): LEFT selects - click a unit or building, drag a box, double-click for all of a type, click empty
// ground to deselect; with a building or power chosen the left click places or aims it. RIGHT gives orders - move to
// the spot, attack the enemy under the cursor, board/enter/garrison/capture, or set a rally point for a selected
// building; right-click also cancels a pending placement. Touch and pen have no right button, so a tap there still
// selects or orders as before. Esc cancels.
let lastR={t:0,id:0},rDown=0;
function selectClick(t,shift){if(t&&t.team===ME){if(shift&&!t.isB){const i=G.sel.indexOf(t);i>=0?G.sel.splice(i,1):G.sel.push(t);}else G.sel=[t];}else if(t&&!shift)G.sel=[t];else if(!shift)G.sel=[];}
const CUR=(svg,x,y,fb)=>`url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fb}`;
const CURS={attack:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><g fill="none" stroke="#000" stroke-width="4"><circle cx="14" cy="14" r="8"/><path d="M14 1v7M14 20v7M1 14h7M20 14h7"/></g><g fill="none" stroke="#ff4a3a" stroke-width="2"><circle cx="14" cy="14" r="8"/><path d="M14 1v7M14 20v7M1 14h7M20 14h7"/></g></svg>',14,14,'crosshair'),
  move:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M13 2l7 9h-4v6h-6v-6H6z" fill="#7be08f" stroke="#0b1a10" stroke-width="1.5"/><ellipse cx="13" cy="22" rx="8" ry="2.6" fill="none" stroke="#7be08f" stroke-width="1.6"/></svg>',13,22,'pointer'),
  enter:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M5 13l9-8 9 8v11H5z" fill="#6fb2ff" stroke="#08121e" stroke-width="1.6"/><path d="M11 24v-7h6v7" fill="#08121e"/></svg>',14,14,'pointer'),
  capture:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M6 24V3" stroke="#111" stroke-width="3"/><path d="M6 24V3" stroke="#ffd166" stroke-width="1.6"/><path d="M7 4h13l-3 4 3 4H7z" fill="#ffd166" stroke="#111"/></svg>',6,24,'pointer'),
  sel:CUR('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><path d="M3 3h6M3 3v6M23 3h-6M23 3v6M3 23h6M3 23v-6M23 23h-6M23 23v-6" stroke="#000" stroke-width="3.4"/><path d="M3 3h6M3 3v6M23 3h-6M23 3v6M3 23h6M3 23v-6M23 23h-6M23 23v-6" stroke="#cfead6" stroke-width="1.6"/></svg>',13,13,'pointer')};
setInterval(()=>{try{if(!G||G.over||!mouse.in){cv.style.cursor='';return;}if(G.amove||G.defm||G.aim){cv.style.cursor=G.amove?CURS.attack:'crosshair';return;}if(G.place){cv.style.cursor='copy';return;}
  const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead),t=pickAt(mouse.x,mouse.y,false);
  if(!units.length){cv.style.cursor=t&&t.team===ME?CURS.sel:'';return;}
  if(t&&!ally(t.team,ME))cv.style.cursor=t.aband&&units.some(u=>isInf(u.s))?CURS.capture:CURS.attack;
  else if(t&&t.team===ME&&((t.kind==='tunnel'&&t.isB)||(t.s&&t.s.cap&&!t.isB)||t.kind==='garrison'))cv.style.cursor=CURS.enter;
  else if(t&&t.team===ME)cv.style.cursor=CURS.sel;
  else{const c=units.some(u=>canGarrison(u))?civUnder(mouse.x,mouse.y,null):null;cv.style.cursor=c&&!c.dead?CURS.enter:CURS.move;}}catch(_){}},120);
function defendAt(w){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);G.defm=false;if(!ids.length)return;doAct({t:'def',ids,x:w.x,y:w.y});speak(1);PINGS.push({x:w.x,y:w.y,r:300,t:0,d:1.1,c:0x6fb2ff});pushLog('Units moving to defend the area.');}
function rightPress(e){const w=screenToWorld(mouse.x,mouse.y);if(!w)return false;rDown=performance.now();if(G.defm){defendAt(w);return false;}
  if(G.place||G.aim){G.place=null;G.aim=null;return false;}
  if(G.amove){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return false;}
  return true;}
function orderClick(sh){if(!G||G.over)return;G.qShift=!!sh;const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place||G.aim){G.place=null;G.aim=null;updateUI();return;}if(G.defm){defendAt(w);return;}
  const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);
  if(G.amove&&units.length){const ids=units.filter(u=>u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return;}
  G.amove=false;const bsel=!units.length&&G.sel.some(b=>b.isB&&b.team===ME);if(!units.length&&!bsel)return;
  const t=pickAt(mouse.x,mouse.y,false);if(issueCmd(w,t,bsel))updateUI();}
function rightRelease(d){if(!G)return;
  if(d.box){const x0=Math.min(d.x0,mouse.x),x1=Math.max(d.x0,mouse.x),y0=Math.min(d.y0,mouse.y),y1=Math.max(d.y0,mouse.y);
    const got=G.ents.filter(u=>u.team===ME&&!u.isB&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u)+4,u.y);return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;})());G.sel=d.shift?[...new Set([...G.sel,...got])]:got;}
  else{const t=pickAt(mouse.x,mouse.y,false),now=performance.now();
    if(t&&t.team===ME&&!t.isB&&SET.dbl>0&&lastR.id===t.id&&now-lastR.t<SET.dbl){G.sel=G.ents.filter(u=>u.team===ME&&u.kind===t.kind&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u),u.y);return p.x>0&&p.y>0&&p.x<VW&&p.y<VH;})());lastR={t:0,id:0};updateUI();return;}
    lastR={t:now,id:t?t.id:0};
    const mine=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead),bsel=!mine&&G.sel.some(b=>b.isB&&b.team===ME);
    const dzHelp=t&&t.team===ME&&t.isB&&((t.built<1&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME&&!u.dead))||(t.kind==='tunnel'&&t.built>=1&&G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&u.s.dom==='ground')))||(t&&t.team===ME&&!t.isB&&t.s&&t.s.cap&&G.sel.some(u=>u!==t&&!u.isB&&canBoard(t,u)))||(t&&t.kind==='garrison'&&t.team===ME&&G.sel.some(u=>u.team===ME&&canGarrison(u)));
    if(d.pt!=='mouse'&&(mine||bsel)&&!d.shift&&(!(t&&t.team===ME)||dzHelp)){const w=screenToWorld(mouse.x,mouse.y);if(w&&issueCmd(w,t,bsel)){updateUI();return;}}
    selectClick(t,d.shift);}
  if(G.sel.some(u=>!u.isB&&u.team===ME))speak(0);else if(G.sel.length)sfxUI(660);updateUI();}
// Touch screens (phones, tablets). One finger works like the left mouse button: tap selects, tap the ground or an enemy
// with units selected moves or attacks, drag draws a selection box. Two fingers move the camera: slide to pan, pinch to
// zoom. With a building or power chosen, touch the map, slide to adjust and lift to build or fire there (a two-finger
// pan in between cancels nothing), so the camera can be moved without placing by accident.
const TCH=new Map(),TIGN=new Set();let PINCH=null,TPEND=null;
function tMid(){const a=[...TCH.values()],r=cv.getBoundingClientRect();return{x:(a[0].x+a[1].x)/2-r.left,y:(a[0].y+a[1].y)/2-r.top,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};}
function placeOrAim(w,shift){
  if(G.place){const m=validSpot(ME,G.place,w.x,w.y);if(m){const dz=G.sel.find(u=>u.kind==='dozer'&&u.team===ME&&!u.dead);doAct({t:'bld',k:G.place,x:w.x,y:w.y,dz:dz?dz.id:0});speak(1);if(!shift)G.place=null;}else pushLog(validSpot.why||'Cannot build there.','w');}
  else if(G.aim){if(G.aim==='sup')doAct({t:'sup',x:w.x,y:w.y});else doAct({t:'pow',k:G.aim,x:w.x,y:w.y});G.aim=null;}
  updateUI();}
function touchDown(e){TCH.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(TCH.size>=2){drag=null;RDRAG=null;TPEND=null;for(const id of TCH.keys())TIGN.add(id);if(!PINCH)PINCH=tMid();return true;}
  if(G.place||G.aim){mpos(e);TPEND={id:e.pointerId};return true;}
  return false;}
function touchMove(e){if(!TCH.has(e.pointerId))return false;TCH.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!PINCH||TCH.size<2)return false;
  const m=tMid(),P=PINCH;camTarget();
  if(P.d>24&&m.d>24){const od=cam.td,nd=Math.max(200,Math.min(1800,od*P.d/m.d));cam.td=nd;const w=screenToWorld(m.x,m.y);if(w){const f=1-nd/od;cam.tx+=(w.x-cam.tx)*f*.9;cam.ty+=(w.y-(cam.ty+cam.dist*.08))*f*.9;}}
  const a=screenToWorld(P.x,P.y),b=screenToWorld(m.x,m.y);if(a&&b){cam.tx+=a.x-b.x;cam.ty+=a.y-b.y;}
  PINCH={x:m.x,y:m.y,d:m.d};return true;}
function touchUp(e){TCH.delete(e.pointerId);if(TCH.size<2)PINCH=null;
  if(TIGN.has(e.pointerId)){TIGN.delete(e.pointerId);if(drag&&drag.id===e.pointerId)drag=null;return true;}
  if(TPEND&&TPEND.id===e.pointerId){TPEND=null;if(!G||G.over)return true;mpos(e);if(mouse.x<0||mouse.y<0||mouse.x>VW||mouse.y>VH)return true;const w=screenToWorld(mouse.x,mouse.y);if(w&&(G.place||G.aim))placeOrAim(w,false);return true;}
  return false;}
function touchCancel(e){TCH.delete(e.pointerId);TIGN.delete(e.pointerId);if(TCH.size<2)PINCH=null;if(TPEND&&TPEND.id===e.pointerId)TPEND=null;}
let mpan=null,RDRAG=null;cv.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});cv.addEventListener('pointerdown',e=>{if(!G||G.over)return;LASTPT=e.pointerType||'mouse';if(LASTPT==='touch'){if(!TOUCHUI)touchUI();PICKMIN=18;if(touchDown(e))return;}else if(LASTPT==='mouse')PICKMIN=10;mpos(e);if(e.button===1&&SET.mpan){e.preventDefault();mpan={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(e.button===2){e.preventDefault();const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);const w0=screenToWorld(mouse.x,mouse.y);if(own.length>=2&&w0&&!G.place&&!G.aim&&!G.defm){RDRAG={x0:mouse.x,y0:mouse.y,w0,id:e.pointerId,shift:e.shiftKey,am:G.amove,moved:false};try{cv.setPointerCapture(e.pointerId);}catch(_){}}else orderClick(e.shiftKey);return;}if(e.button!==0){e.preventDefault();return;}
  const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place||G.aim){placeOrAim(w,e.shiftKey);return;}
  if(!rightPress(e))return;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  drag={x0:mouse.x,y0:mouse.y,box:false,shift:e.shiftKey,id:e.pointerId,pt:e.pointerType||'mouse'};});
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')LASTPT='mouse';else if(e.pointerType==='touch'&&touchMove(e))return;mpos(e);if(RDRAG&&e.pointerId===RDRAG.id){if(Math.hypot(mouse.x-RDRAG.x0,mouse.y-RDRAG.y0)>22)RDRAG.moved=true;return;}if(mpan&&e.pointerId===mpan.id){const k=cam.dist/700*(SET.scr||100)/100;cam.x-=(e.clientX-mpan.x)*k;cam.y-=(e.clientY-mpan.y)*k*1.4;mpan.x=e.clientX;mpan.y=e.clientY;return;}if(drag&&Math.hypot(mouse.x-drag.x0,mouse.y-drag.y0)>(drag.pt==='touch'?Math.max(SET.tol||8,16):(SET.tol||8)))drag.box=true;});
window.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&touchUp(e))return;if(mpan&&e.pointerId===mpan.id){mpan=null;return;}if(RDRAG&&e.pointerId===RDRAG.id){const r=RDRAG;RDRAG=null;const w1=screenToWorld(mouse.x,mouse.y);const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(r.moved&&w1&&ids.length){doAct({t:'line',ids,x:r.w0.x,y:r.w0.y,x2:w1.x,y2:w1.y,mode:r.am?'amove':'move'});G.amove=false;speak(1);PINGS.push({x:(r.w0.x+w1.x)/2,y:(r.w0.y+w1.y)/2,r:16,t:0,d:.4,c:0x74d08f});updateUI();}else orderClick(r.shift);return;}if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;rightRelease(d);});
window.addEventListener('pointercancel',e=>{touchCancel(e);if(drag&&e.pointerId===drag.id)drag=null;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;if(!G||$('menu').hidden===false)return;
  if(/^Digit[1-5]$/.test(e.code)){const i=+e.code.slice(5);if(e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();sqAssign(i);}else sqSelect(i);}
  if(k==='p'&&!G.over){e.preventDefault();togglePause();return;}
  if(k==='Escape'&&menuOpen()){menuOpen(false);return;}
  if(k==='Escape'){if(G.defm){G.defm=false;return;}if(G.paused){togglePause(false);return;}if(!G.place&&!G.aim&&!G.amove&&!G.sel.length&&!G.over){togglePause(true);return;}if(!G.place&&!G.aim&&!G.amove)G.sel=[];G.place=null;G.aim=null;G.amove=false;}
  if(k==='q')G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!['harv','hacker','dozer'].includes(u.kind)&&!u.dead);
  if(k==='f'&&G.sel.some(u=>!u.isB)){G.amove=true;G.defm=false;}if(k==='g'&&G.sel.some(u=>!u.isB&&u.team===ME)){G.defm=true;G.amove=false;}
  if(k==='x'){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length)doAct({t:'stop',ids});}
  if(k==='r'&&!e.ctrlKey&&!e.metaKey){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length){doAct({t:'ret',ids});speak(2);}}
  if(k==='h'){const hq=G.ents.find(b=>b.team===ME&&b.kind==='hq');if(hq)centerOn(hq.x,hq.y);}
  if(k==='='||k==='+'){camTarget();cam.td=Math.max(200,cam.td/1.15);}if(k==='-'||k==='_'){camTarget();cam.td=Math.min(1800,cam.td*1.15);}
  if(k.startsWith('Arrow')||k===' ')e.preventDefault();updateUI();});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
function mmJump(e){const r=mm.getBoundingClientRect();centerOn((e.clientX-r.left)/r.width*MAPW,(e.clientY-r.top)/r.height*MAPH);}
// Minimap: left-click / tap / drag moves the view there; right-click sends the selected units there.
// Pointer events so it works the same with a mouse, trackpad, touch screen or pen.
let mmDown=null;mm.style.touchAction='none';mm.style.cursor='crosshair';
function mmSend(w){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(!ids.length)return false;doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0});speak(1);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0x74d08f});return true;}
function mmWorld(e){const r=mm.getBoundingClientRect();return{x:Math.max(0,Math.min(MAPW,(e.clientX-r.left)/r.width*MAPW)),y:Math.max(0,Math.min(MAPH,(e.clientY-r.top)/r.height*MAPH))};}
mm.addEventListener('pointerdown',e=>{if(!G)return;e.preventDefault();const w=mmWorld(e);
  if(e.button===2){mmSend(w);return;}
  if(e.button!==0)return;if(SET.mmc==='units'&&mmSend(w))return;mmDown=e.pointerId;try{mm.setPointerCapture(e.pointerId);}catch(_){}centerOn(w.x,w.y);});
mm.addEventListener('pointermove',e=>{if(mmDown!==e.pointerId)return;const w=mmWorld(e);centerOn(w.x,w.y);});
mm.addEventListener('pointerup',e=>{if(mmDown===e.pointerId)mmDown=null;});mm.addEventListener('pointercancel',()=>{mmDown=null;});
mm.addEventListener('contextmenu',e=>e.preventDefault());
/* ---------- phones and touch screens ---------- */
// The command bar's own phone layouts (portrait strip + fold handle, short landscape bar) live with its styles in the
// page shell; here: touch wording, finger-sized buttons, and small-screen placement of the battlefield chips.
{const st=document.createElement('style');st.id='phoneCss';st.textContent=`
#app,.overlay button,.overlay select{touch-action:manipulation}
#app{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
#settings .card>.row:last-child{position:sticky;bottom:-1px;z-index:2;background:linear-gradient(rgba(8,11,10,0),rgba(8,11,10,.97) 30%);padding:14px 0 4px}
body.touchui #mode{white-space:normal;text-align:left;width:max-content;max-width:calc(100% - 20px);box-sizing:border-box;font-size:12px;letter-spacing:.02em;line-height:1.2;padding:5px;display:flex;align-items:center;gap:6px;z-index:5}
body.touchui #mode>span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;padding-left:4px}
body.touchui #mode[hidden]{display:none}
#mode .mcx{pointer-events:auto;cursor:pointer;flex:none;background:var(--warn);color:#160806;border:0;font:700 13px var(--display);letter-spacing:.04em;text-transform:uppercase;padding:0 8px;min-height:34px}
body.touchui #hint{font-size:12px;color:#c9d4ce;background:rgba(8,11,10,.55);padding:4px 6px;left:6px;right:6px;bottom:6px}
@media (max-width:760px),(max-height:520px){
  #wxchip{top:6px;left:auto;right:6px;transform:none;white-space:normal;text-align:right;max-width:calc(62% - 16px);font-size:10px;padding:3px 7px}
  #net{top:auto;bottom:6px;right:6px;font-size:10px;padding:2px 6px}
}
@media (max-width:560px){
  .facs{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .fac{grid-template-columns:30px minmax(0,1fr);gap:8px;padding:8px 7px}
  .fac .ins{width:30px;height:30px;font-size:12px}.fac .ins canvas{width:30px!important;height:30px!important}
  .fac .nm{font-size:15px}
  .fac:not(.on) .dc,.fac:not(.on) .sp,.fac:not(.on) .sw{display:none}
  .card h1{font-size:clamp(34px,11vw,48px)}
  #pauseOv .row .big,#quitOv .row .big,#end .row .big{flex:1 1 auto}
}
@media (pointer:coarse){
  #allyBox button,.sbx button{min-height:36px}
  .trow select,.seat select,.mapsel select,#aiFac,.seg button,.chip,.mapsel .rndmap,.seatx{min-height:38px}
  .game button,.joinrow .big,.joinrow input{min-height:40px}
}`;document.body.append(st);}
function touchUI(){TOUCHUI=true;document.body.classList.add('touchui');const h=$('hint');if(h)h.textContent='Tap a unit to select it · with units selected, tap the ground to move or an enemy to attack · drag to box-select · two fingers: slide to pan, pinch to zoom · tap the small map to jump there';try{updateUI();}catch(e){}}
// on touch: the banner says how to place, and tapping it cancels; the long hint steps aside after the opening
function touchHud(md){if(!md.hidden){const t=G.place?`Place ${STRUCT[G.place].name}${STRUCT[G.place].shore?' on the shore':''}: touch the map, slide, lift to build`:G.aim?(md.dataset.d||'').replace(/^Choose a target/,'Tap a target'):(md.dataset.d||'').replace(/click/g,'tap');
    if(md.dataset.t!==t){md.dataset.t=t;md.innerHTML='<span></span><button class="mcx" type="button">✕ Cancel</button>';md.firstChild.textContent=t;}}else md.dataset.t='';
  const h=$('hint');if(h)h.hidden=!md.hidden||G.t>40;}
$('mode').onclick=e=>{if(!G||!e.target.closest('.mcx'))return;G.place=null;G.aim=null;G.amove=false;G.defm=false;updateUI();};
try{if(matchMedia('(hover:none) and (pointer:coarse)').matches)touchUI();}catch(e){}
function scroll(dt){camTarget();const sp=cam.td*1.1*dt*(SET.scr||100)/100;if(keys.ArrowLeft||keys.a)cam.tx-=sp;if(keys.ArrowRight||keys.d)cam.tx+=sp;if(keys.ArrowUp||keys.w)cam.ty-=sp;if(keys.ArrowDown||keys.s)cam.ty+=sp;
  if(mouse.in&&!drag&&SET.edge&&LASTPT!=='touch'){if(mouse.x<14)cam.tx-=sp;if(mouse.x>VW-14)cam.tx+=sp;if(mouse.y<14)cam.ty-=sp;if(mouse.y>VH-14)cam.ty+=sp;}cam.tx=Math.max(0,Math.min(MAPW,cam.tx));cam.ty=Math.max(0,Math.min(MAPH,cam.ty));camTick(dt);}

/* ---------- game start / reset ---------- */
function resetScene(){if(typeof WRECKQ!=="undefined")WRECKQ.length=0;for(const [,o] of OBJ)SCN.remove(o);OBJ.clear();for(const b of BODIES)SCN.remove(b.o);BODIES.length=0;for(const a of [WRECKS,MARKERS,PLANES])for(const x of a){for(const k of ['o','ring','disc','mis'])if(x[k])SCN.remove(x[k]);}WRECKS.length=MARKERS.length=PLANES.length=0;
  for(const p of PINGS)if(p.m)SCN.remove(p.m);PINGS.length=0;if(typeof FIRES!=='undefined'){FIRES.length=0;for(const S of SHOCKS){S.t=S.d;S.m.material.opacity=0;S.m.scale.setScalar(.001);}}PARTS.length=0;TRACERS.length=0;VPROJ.length=0;for(const r of RINGS)SCN.remove(r);RINGS=[];if(GHOST){SCN.remove(GHOST);GHOST=null;GHOSTK=null;}if(RALLY){SCN.remove(RALLY);RALLY=null;}for(const l of LIGHTS)l.intensity=0;}
/* ---------- loading screen: shown the moment a battle starts (Test Range, Deploy vs AI, Play again, multiplayer) ---------- */
// The battle itself (map, bases, units, AI) is set up at once and exactly as before; the slow drawing work (ground
// texture, 3D world, shader warm-up) then runs in steps with a frame in between, so the screen shows the theatre, the
// nations, a progress bar and a tip instead of freezing. The battle clock is held until the battlefield is on screen.
const LOAD={tok:0,tipI:0,tipT:null,cv:null};
const LOAD_TIPS=['Armour is thickest at the front: hits on a vehicle\'s side do 20% more damage, from behind 60% more. Flank them.',
  'Infantry in woods or beside buildings take less damage. Fight from cover.',
  'Firing downhill helps and firing uphill hurts. Take the high ground.',
  'Infantry under heavy fire get suppressed: they shoot and move slower until it wears off.',
  'Moving targets are harder to hit. Keep your vehicles moving under fire.',
  'Capture oil derricks with infantry or vehicles for extra income.',
  'Your Construction Vehicle builds everything. Start with a Barracks, then a War Factory.',
  'Pull damaged units back instead of losing them. Survivors gain rank and fight better.',
  'Infantry can garrison city buildings and turn them into strongholds.',
  'Every nation has its own special unit and its own strike power. Check the sidebar.'];
// Loading-screen quotes, one set per nation: the player always sees a line from their own nation's history.
// q: English, a: who and where, o: the original line (only where it is certain), l: its language. Only lines with a
// documented source (lines known only by tradition were left out); no living leaders.
const LOAD_QUOTES={
 US:[{q:'In war there is no substitute for victory.',a:'Douglas MacArthur, address to Congress, 1951'},
  {q:'Wars may be fought with weapons, but they are won by men. It is the spirit of the men who follow and of the man who leads that gains the victory.',a:'George S. Patton, Cavalry Journal, 1933'},
  {q:'I propose to fight it out on this line if it takes all summer.',a:'Ulysses S. Grant, dispatch from Spotsylvania, 1864'},
  {q:'These are the times that try men\'s souls.',a:'Thomas Paine, The American Crisis, 1776'},
  {q:'To be prepared for war is one of the most effectual means of preserving peace.',a:'George Washington, first annual address to Congress, 1790'},
  {q:'Nuts!',a:'Brig. Gen. Anthony McAuliffe, reply to the German surrender demand at Bastogne, 1944'}],
 TR:[{q:'Armies! Your first objective is the Mediterranean. Forward!',a:'Mustafa Kemal Atatürk, order of 1 September 1922',o:'Ordular! İlk hedefiniz Akdeniz\'dir. İleri!',l:'tr'},
  {q:'I do not order you to attack. I order you to die. In the time it takes us to die, other troops and commanders can come and take our places.',a:'Mustafa Kemal, Gallipoli, 1915',o:'Ben size taarruzu emretmiyorum, ölmeyi emrediyorum.',l:'tr'},
  {q:'There is no line of defence, there is a surface of defence. That surface is the whole homeland.',a:'Mustafa Kemal Atatürk, Battle of Sakarya, 1921',o:'Hatt-ı müdafaa yoktur, sath-ı müdafaa vardır. O satıh bütün vatandır.',l:'tr'},
  {q:'Peace at home, peace in the world.',a:'Mustafa Kemal Atatürk, 1931',o:'Yurtta sulh, cihanda sulh.',l:'tr'}],
 IL:[{q:'A time to love, and a time to hate; a time of war, and a time of peace.',a:'Ecclesiastes 3:8',o:'עֵת לֶאֱהֹב וְעֵת לִשְׂנֹא, עֵת מִלְחָמָה וְעֵת שָׁלוֹם',l:'he'},
  {q:'Masada shall not fall again.',a:'Yitzhak Lamdan, "Masada", 1927',o:'שֵׁנִית מְצָדָה לֹא תִּפֹּל',l:'he'},
  {q:'We shall fight the war as if there were no White Paper, and the White Paper as if there were no war.',a:'David Ben-Gurion, 1939'},
  {q:'We are a generation of settlement, and without the steel helmet and the cannon\'s muzzle we will not be able to plant a tree and build a house.',a:'Moshe Dayan, eulogy for Roi Rotberg, 1956'}],
 EU:[{q:'We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender.',a:'Winston Churchill, House of Commons, 4 June 1940'},
  {q:'Never in the field of human conflict was so much owed by so many to so few.',a:'Winston Churchill, House of Commons, 20 August 1940'},
  {q:'War is merely the continuation of policy by other means.',a:'Carl von Clausewitz, On War',o:'Der Krieg ist eine bloße Fortsetzung der Politik mit anderen Mitteln.',l:'de'},
  {q:'Everything in war is very simple, but the simplest thing is difficult.',a:'Carl von Clausewitz, On War',o:'Es ist im Kriege alles sehr einfach, aber das Einfachste ist schwierig.',l:'de'},
  {q:'Let him who desires peace prepare for war.',a:'Vegetius, Epitoma rei militaris, Book III',o:'Igitur qui desiderat pacem, praeparet bellum.',l:'la'},
  {q:'In war, three quarters turns on morale; the balance of manpower and materiel counts only for the remaining quarter.',a:'Napoleon Bonaparte, 1808',o:'À la guerre, les trois quarts sont des affaires morales ; la balance des forces réelles n\'est que pour un autre quart.',l:'fr'},
  {q:'Whatever happens, the flame of French resistance must not and shall not die.',a:'Charles de Gaulle, Appeal of 18 June 1940',o:'Quoi qu\'il arrive, la flamme de la résistance française ne doit pas s\'éteindre et ne s\'éteindra pas.',l:'fr'},
  {q:'Nothing except a battle lost can be half so melancholy as a battle won.',a:'The Duke of Wellington, after Waterloo, 1815'}],
 UA:[{q:'Fight, and you will win!',a:'Taras Shevchenko, "The Caucasus", 1845',o:'Борітеся — поборете!',l:'uk'},
  {q:'Bury me, then rise up and break your heavy chains.',a:'Taras Shevchenko, "Testament", 1845',o:'Поховайте та вставайте, кайдани порвіте',l:'uk'},
  {q:'Soul and body we shall lay down for our freedom.',a:'Pavlo Chubynsky, "Ukraine Has Not Yet Perished", 1862',o:'Душу й тіло ми положим за нашу свободу',l:'uk'},
  {q:'The eternal revolutionary: the spirit that drives the body into battle.',a:'Ivan Franko, "The Eternal Revolutionary", 1880',o:'Вічний революцьонер — дух, що тіло рве до бою',l:'uk'},
  {q:'Without hope, I hope.',a:'Lesya Ukrainka, "Contra spem spero", 1890',o:'Без надії сподіваюсь!',l:'uk'},
  {q:'Glory to Ukraine! Glory to the heroes!',a:'Traditional Ukrainian salute',o:'Слава Україні! Героям слава!',l:'uk'}],
 RU:[{q:'Hard in training, easy on the march.',a:'Alexander Suvorov, The Science of Victory',o:'Тяжело в ученье — легко в походе.',l:'ru'},
  {q:'The bullet is a fool, the bayonet a fine fellow.',a:'Alexander Suvorov, The Science of Victory',o:'Пуля — дура, штык — молодец.',l:'ru'},
  {q:'Our cause is just. The enemy will be defeated. Victory will be ours.',a:'Vyacheslav Molotov, radio address, 22 June 1941',o:'Наше дело правое. Враг будет разбит. Победа будет за нами.',l:'ru'},
  {q:'Whoever comes to us with the sword shall perish by the sword.',a:'Alexander Nevsky (1938 film), after Matthew 26:52',o:'Кто с мечом к нам придёт, от меча и погибнет.',l:'ru'}],
 IR:[{q:'Humiliation is far from us!',a:'Imam Hussein ibn Ali, Karbala, 680',o:'هيهات منا الذلة',l:'ar'},
  {q:'I see death as nothing but happiness, and life with oppressors as nothing but misery.',a:'Imam Hussein ibn Ali, on the road to Karbala, 680',o:'إني لا أرى الموت إلا سعادة، ولا الحياة مع الظالمين إلا برما',l:'ar'},
  {q:'Mountains may move, but you must not. Grit your teeth. Lend your skull to God. Plant your feet firmly in the earth.',a:'Imam Ali ibn Abi Talib, to his son at the Battle of the Camel, Nahj al-Balagha, Sermon 11',o:'تَزُولُ الْجِبَالُ وَلَا تَزُلْ، عَضَّ عَلَى نَاجِذِكَ، أَعِرِ اللَّهَ جُمْجُمَتَكَ، تِدْ فِي الْأَرْضِ قَدَمَكَ',l:'ar'},
  {q:'Mighty is he who is wise.',a:'Ferdowsi, Shahnameh',o:'توانا بود هر که دانا بود',l:'fa'},
  {q:'Death lies in living as the conquered, and life lies in dying as the victors.',a:'Imam Ali ibn Abi Talib, at Siffin, Nahj al-Balagha, Sermon 51',o:'فَالْمَوْتُ فِي حَيَاتِكُمْ مَقْهُورِينَ، وَالْحَيَاةُ فِي مَوْتِكُمْ قَاهِرِينَ',l:'ar'}],
 RS:[{q:'Here I am, O Hussein!',a:'Pledge of the mourners of Karbala',o:'لبيك يا حسين',l:'ar'},
  {q:'Plot your plots, strive your utmost, spare no effort: by God, you will never erase our remembrance.',a:'Sayyida Zaynab bint Ali, to Yazid in Damascus, 680',o:'فكِدْ كيدك، واسعَ سعيك، وناصب جهدك، فوالله لا تمحو ذكرنا',l:'ar'},
  {q:'If the religion of Muhammad stands only by my death, then, O swords, take me!',a:'Shaykh Muhsin Abu al-Hab, in the voice of Imam Hussein',o:'إن كان دين محمد لم يستقم إلا بقتلي فيا سيوف خذيني',l:'ar'},
  {q:'Death lies in living as the conquered, and life lies in dying as the victors.',a:'Imam Ali ibn Abi Talib, at Siffin, Nahj al-Balagha, Sermon 51',o:'فَالْمَوْتُ فِي حَيَاتِكُمْ مَقْهُورِينَ، وَالْحَيَاةُ فِي مَوْتِكُمْ قَاهِرِينَ',l:'ar'},
  {q:'I am the son of Mecca and Mina; I am the son of Zamzam and Safa.',a:'Imam Ali Zayn al-Abidin (al-Sajjad), sermon in Damascus, 680',o:'أنا ابن مكة ومنى، أنا ابن زمزم والصفا',l:'ar'},
  {q:'Humiliation is far from us!',a:'Imam Hussein ibn Ali, Karbala, 680',o:'هيهات منا الذلة',l:'ar'}],
 DW:[{q:'I did not rise out of arrogance or vanity, nor to spread corruption or oppression. I rose to seek reform in the nation of my grandfather.',a:'Imam Hussein ibn Ali, testament, 680',o:'إني لم أخرج أشِرًا ولا بطِرًا ولا مفسدًا ولا ظالمًا، وإنما خرجت لطلب الإصلاح في أمة جدي',l:'ar'},
  {q:'By God, never was a people attacked in the heart of their homes but they were humiliated.',a:'Imam Ali ibn Abi Talib, Nahj al-Balagha, Sermon 27',o:'فَوَاللَّهِ مَا غُزِيَ قَوْمٌ قَطُّ فِي عُقْرِ دَارِهِمْ إِلَّا ذَلُّوا',l:'ar'},
  {q:'Opportunity passes like the passing of clouds.',a:'Imam Ali ibn Abi Talib, Nahj al-Balagha, Saying 21',o:'الْفُرْصَةُ تَمُرُّ مَرَّ السَّحَابِ',l:'ar'},
  {q:'I saw nothing but beauty.',a:'Sayyida Zaynab bint Ali, to Ibn Ziyad in Kufa, 680',o:'ما رأيت إلا جميلا',l:'ar'}],
 SA:[{q:'I have come to you with men who love death as you love life.',a:'Khalid ibn al-Walid, letter to the Persian commanders, 633',o:'جئتكم بقوم يحبون الموت كما تحبون الحياة',l:'ar'},
  {q:'The horse, the night and the desert know me; and the sword, the lance, the paper and the pen.',a:'Al-Mutanabbi',o:'الخيل والليل والبيداء تعرفني، والسيف والرمح والقرطاس والقلم',l:'ar'},
  {q:'Do not kill a child, a woman or an old man. Do not cut down fruit-bearing trees, and do not destroy a dwelling.',a:'Abu Bakr al-Siddiq, orders to the army marching to Syria, 634'}],
 AE:[{q:'When you see the lion\'s fangs bared, do not think the lion is smiling.',a:'Al-Mutanabbi',o:'إذا رأيتَ نُيوبَ اللّيثِ بارِزَةً فَلا تَظُنّنّ أنّ اللّيثَ يَبْتَسِمُ',l:'ar'},
  {q:'Great resolves come in the measure of the resolute.',a:'Al-Mutanabbi',o:'على قَدْرِ أهْلِ العَزْمِ تأتي العَزائِمُ',l:'ar'},
  {q:'I have come to you with men who love death as you love life.',a:'Khalid ibn al-Walid, letter to the Persian commanders, 633',o:'جئتكم بقوم يحبون الموت كما تحبون الحياة',l:'ar'},
  {q:'Do not kill a child, a woman or an old man. Do not cut down fruit-bearing trees, and do not destroy a dwelling.',a:'Abu Bakr al-Siddiq, orders to the army marching to Syria, 634'}],
 PK:[{q:'Unity, Faith, Discipline.',a:'Muhammad Ali Jinnah'},
  {q:'There is no power on earth that can undo Pakistan.',a:'Muhammad Ali Jinnah, Lahore, 30 October 1947'},
  {q:'You are a falcon: flight is your calling. There are other skies before you.',a:'Allama Muhammad Iqbal, Bal-e-Jibril, 1935',o:'تو شاہیں ہے، پرواز ہے کام تیرا — ترے سامنے آسماں اور بھی ہیں',l:'ur'},
  {q:'Raise your selfhood so high that before every decree, God Himself asks you: tell me, what is your will?',a:'Allama Muhammad Iqbal, Bal-e-Jibril, 1935',o:'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے — خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے',l:'ur'}],
 IN:[{q:'Slain, you will win heaven; victorious, you will enjoy the earth. So rise, son of Kunti, resolved to fight.',a:'Bhagavad Gita 2.37',o:'हतो वा प्राप्स्यसि स्वर्गं जित्वा वा भोक्ष्यसे महीम्। तस्मादुत्तिष्ठ कौन्तेय युद्धाय कृतनिश्चयः॥',l:'sa'},
  {q:'You have a right to your actions, but never to their fruits.',a:'Bhagavad Gita 2.47',o:'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',l:'sa'},
  {q:'Truth alone triumphs.',a:'Mundaka Upanishad 3.1.6',o:'सत्यमेव जयते',l:'sa'},
  {q:'An arrow shot by an archer may kill one man or may not; but intellect applied by a wise man can kill even those in the womb.',a:'Kautilya (Chanakya), Arthashastra, Book 10'}],
 CN:[{q:'Know the enemy and know yourself; in a hundred battles you will never be in peril.',a:'Sun Tzu, The Art of War',o:'知彼知己，百战不殆',l:'zh'},
  {q:'All warfare is based on deception.',a:'Sun Tzu, The Art of War',o:'兵者，诡道也',l:'zh'},
  {q:'To subdue the enemy without fighting is the supreme excellence.',a:'Sun Tzu, The Art of War',o:'不战而屈人之兵，善之善者也',l:'zh'},
  {q:'Swift as the wind, silent as the forest, fierce as fire, immovable as the mountain.',a:'Sun Tzu, The Art of War',o:'其疾如风，其徐如林，侵掠如火，不动如山',l:'zh'},
  {q:'In war, let your great object be victory, not lengthy campaigns.',a:'Sun Tzu, The Art of War',o:'兵贵胜，不贵久',l:'zh'},
  {q:'Political power grows out of the barrel of a gun.',a:'Mao Zedong, 1927',o:'枪杆子里面出政权',l:'zh'}],
 KP:[{q:'Your divine plans have plumbed the heavens; your subtle reckoning has spanned the earth. You have won every battle and your merit is great. Now be content, and stop.',a:'General Eulji Mundeok, poem to the Sui general Yu Zhongwen, 612',o:'神策究天文 妙算窮地理 戰勝功旣高 知足願云止',l:'zh-Hant'},
  {q:'Seeing profit, think of what is right; seeing danger, offer your life.',a:'Ahn Jung-geun, calligraphy written in prison, 1910',o:'見利思義 見危授命',l:'zh-Hant'},
  {q:'Even if the sky falls, there is a hole to rise through.',a:'Korean proverb',o:'하늘이 무너져도 솟아날 구멍이 있다',l:'ko'},
  {q:'Even a sheet of paper is lighter when two lift it together.',a:'Korean proverb',o:'백지장도 맞들면 낫다',l:'ko'}],
 KR:[{q:'Those who seek to die shall live; those who seek to live shall die.',a:'Admiral Yi Sun-sin, before the Battle of Myeongnyang, 1597',o:'必死則生 必生則死',l:'zh-Hant'},
  {q:'Your servant still has twelve warships.',a:'Admiral Yi Sun-sin, report to King Seonjo, 1597',o:'今臣戰船 尙有十二',l:'zh-Hant'},
  {q:'One man holding a narrow pass can strike fear into a thousand.',a:'Admiral Yi Sun-sin, war diary, 1597',o:'一夫當逕 足懼千夫',l:'zh-Hant'},
  {q:'The battle is at its height. Do not announce my death.',a:'Admiral Yi Sun-sin, Battle of Noryang, 1598',o:'戰方急 愼勿言我死',l:'zh-Hant'},
  {q:'To give one\'s life for one\'s country is the duty of a soldier.',a:'Ahn Jung-geun, calligraphy written in prison, 1910',o:'爲國獻身 軍人本分',l:'zh-Hant'}],
 EG:[{q:'What was taken by force can only be restored by force.',a:'Gamal Abdel Nasser, 1967',o:'ما أُخذ بالقوة لا يُسترد بغير القوة',l:'ar'},
  {q:'Goals are not won by wishing; the world is taken by struggle.',a:'Ahmed Shawqi',o:'وما نيلُ المطالبِ بالتمنّي، ولكن تؤخَذُ الدنيا غِلابا',l:'ar'},
  {q:'All creation stood watching how I alone lay the foundations of glory.',a:'Hafez Ibrahim, "Egypt Speaks of Herself"',o:'وقف الخلقُ ينظرون جميعًا كيف أبني قواعدَ المجدِ وحدي',l:'ar'},
  {q:'I have come to you with men who love death as you love life.',a:'Khalid ibn al-Walid, letter to the Persian commanders, 633',o:'جئتكم بقوم يحبون الموت كما تحبون الحياة',l:'ar'}],
 CU:[{q:'Trenches of ideas are worth more than trenches of stone.',a:'José Martí, "Our America", 1891',o:'Trincheras de ideas valen más que trincheras de piedra.',l:'es'},
  {q:'To die for the homeland is to live.',a:'Pedro Figueredo, "La Bayamesa", 1868',o:'Morir por la patria es vivir.',l:'es'},
  {q:'Whoever tries to seize Cuba will gather only the dust of her soil drenched in blood, if he does not perish in the struggle.',a:'Antonio Maceo',o:'Quien intente apropiarse de Cuba recogerá el polvo de su suelo anegado en sangre, si no perece en la lucha.',l:'es'},
  {q:'Homeland is humanity.',a:'José Martí',o:'Patria es humanidad.',l:'es'}],
 _:[{q:'Let him who desires peace prepare for war.',a:'Vegetius, Epitoma rei militaris, Book III',o:'Igitur qui desiderat pacem, praeparet bellum.',l:'la'},
  {q:'Know the enemy and know yourself; in a hundred battles you will never be in peril.',a:'Sun Tzu, The Art of War'},
  {q:'Everything in war is very simple, but the simplest thing is difficult.',a:'Carl von Clausewitz, On War'}]};
function loadQuote(fac){const set=(LOAD_QUOTES[fac]&&LOAD_QUOTES[fac].length?LOAD_QUOTES[fac]:LOAD_QUOTES._);let last=-1;try{const v=JSON.parse(localStorage.getItem('ww3_lastq')||'null');if(v&&v.f===fac)last=v.i|0;}catch(e){}
  let i=Math.floor(Math.random()*set.length);if(set.length>1&&i===last)i=(i+1+Math.floor(Math.random()*(set.length-1)))%set.length;try{localStorage.setItem('ww3_lastq',JSON.stringify({f:fac,i}));}catch(e){}return set[i];}
function loadUI(){if(LOAD.el)return LOAD.el;const st=document.createElement('style');st.textContent=`
#loadOv{position:fixed;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0a0e0c;color:var(--fg);
  padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
#loadOv::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 38%,rgba(227,179,65,.09),transparent 62%),repeating-linear-gradient(135deg,rgba(255,255,255,.018) 0 2px,transparent 2px 9px);pointer-events:none}
#loadOv .lo{position:relative;width:min(560px,100%);display:flex;flex-direction:column;gap:12px}
#loadOv .lo-k{font:600 12px var(--mono);letter-spacing:.24em;text-transform:uppercase;color:var(--accent)}
#loadOv .lo-t{margin:0;font:700 clamp(28px,7vw,44px)/1 var(--display);letter-spacing:.04em;text-transform:uppercase}
#loadOv .lo-d{color:var(--dim);font-size:12px;line-height:1.45;margin-top:-4px}
#loadOv .lo-map{display:block;width:100%;aspect-ratio:384/264;height:auto;border:1px solid #3d5247;background:#141a16;box-shadow:0 0 0 1px #050807,0 10px 30px rgba(0,0,0,.55)}
#loadOv .lo-v{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
#loadOv .lo-tm{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 0}
#loadOv .lo-tm:last-child .lo-f{flex-direction:row-reverse;text-align:right}
#loadOv .lo-f{display:flex;align-items:center;gap:8px;min-width:0;padding:5px 8px;background:rgba(22,29,26,.92);border:1px solid var(--line);border-left:3px solid var(--c)}
#loadOv .lo-tm:last-child .lo-f{border-left-width:1px;border-right:3px solid var(--c)}
#loadOv .lo-f i{flex:none;display:grid;place-items:center;width:30px;height:30px;background:var(--c);color:#0b0f0d;font:700 13px var(--display);font-style:normal;overflow:hidden}
#loadOv .lo-f i canvas{width:30px;height:30px}
#loadOv .lo-f b{font:700 17px/1.05 var(--display);letter-spacing:.03em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#loadOv .lo-f small{display:block;font:500 10px var(--mono);color:var(--accent);letter-spacing:.12em}
#loadOv .lo-vs{flex:none;font:800 22px var(--display);color:var(--warn);letter-spacing:.06em}
#loadOv .lo-bar{height:14px;border:1px solid #4a5a3a;background:#0b0f0d;padding:2px;box-sizing:border-box}
#loadOv .lo-bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,var(--accent) 0 10px,transparent 10px 13px);transition:width .35s ease-out}
#loadOv .lo-s{display:flex;justify-content:space-between;gap:10px;font:500 12px var(--mono);color:var(--fg);text-transform:uppercase;letter-spacing:.08em;margin-top:-6px}
#loadOv .lo-s span:last-child{color:var(--accent);font-variant-numeric:tabular-nums}
#loadOv .lo-q{margin:4px 0 2px;padding:6px 6px 0 30px;position:relative;opacity:0}
#loadOv .lo-q.in{animation:loQ 1.1s ease-out forwards}
@keyframes loQ{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
#loadOv .lo-q::before{content:"\\201C";position:absolute;left:-2px;top:-14px;font:700 74px/1 var(--display);color:var(--accent);opacity:.35}
#loadOv .lo-qt{margin:0;font:600 clamp(19px,4.8vw,27px)/1.18 var(--display);letter-spacing:.01em;color:#f1ece0;text-wrap:balance}
#loadOv .lo-qo{margin-top:6px;font:500 clamp(14px,3.6vw,17px)/1.45 var(--display);color:#c9c2b0;unicode-bidi:plaintext}
#loadOv .lo-qo[dir=rtl]{text-align:right;font-family:'Noto Naskh Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif}
#loadOv .lo-qa{display:block;margin-top:7px;font:600 12px/1.35 var(--mono);font-style:normal;letter-spacing:.08em;font-variant:small-caps;color:var(--accent)}
#loadOv .lo-qa::before{content:"\\2014\\00a0"}
#loadOv .lo-tip{min-height:2.6em;padding:6px 10px;border:1px solid var(--line);background:rgba(22,29,26,.85);font-size:11px;line-height:1.45;color:var(--fg)}
#loadOv .lo-tip b{color:var(--accent);font:700 13px var(--display);letter-spacing:.1em;margin-right:6px}
#loadOv{overflow-y:auto;align-items:safe center}
@media (max-width:600px){#loadOv .lo{gap:9px}#loadOv .lo-map{max-height:24vh;width:auto;max-width:100%;margin-inline:auto}#loadOv .lo-f b{font-size:15px}#loadOv .lo-d{display:none}}
@media (max-height:640px){#loadOv .lo-map{max-height:28vh;width:auto;margin-inline:auto}#loadOv .lo{gap:8px}}`;document.head.append(st);
  const o=document.createElement('div');o.id='loadOv';o.hidden=true;o.setAttribute('role','status');o.setAttribute('aria-live','polite');
  o.innerHTML='<div class="lo"><div class="lo-k"></div><h1 class="lo-t"></h1><div class="lo-d"></div><canvas class="lo-map" width="384" height="264" aria-hidden="true"></canvas><div class="lo-v"></div><blockquote class="lo-q"><p class="lo-qt"></p><div class="lo-qo"></div><cite class="lo-qa"></cite></blockquote><div class="lo-bar"><i></i></div><div class="lo-s"><span></span><span></span></div><div class="lo-tip"><b>TIP</b><span></span></div></div>';
  document.body.append(o);LOAD.el=o;LOAD.cv=o.querySelector('.lo-map');return o;}
// draw the theatre: the real ground once it is painted, else the menu's map preview; start positions in each side's colour
function loadMap(mk,bases,cols,me,thumb){const cv=LOAD.cv;if(!cv)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.fillStyle='#141a16';c.fillRect(0,0,W,H);
  try{if(thumb)c.drawImage(thumb,0,0,W,H);else if(PREV[mk])c.putImageData(PREV[mk].img,0,0);}catch(e){}
  c.fillStyle='rgba(0,0,0,.18)';c.fillRect(0,0,W,H);
  (bases||[]).forEach(([x,y],i)=>{const X=x/MAPW*W,Y=y/MAPH*H,r=i===me?9:7;c.beginPath();c.arc(X,Y,r+3,0,7);c.fillStyle='rgba(8,10,9,.8)';c.fill();c.beginPath();c.arc(X,Y,r,0,7);c.fillStyle=cols[i]||'#888';c.fill();
    if(i===me){c.font='bold 11px sans-serif';c.textAlign='center';const tw=c.measureText('YOU').width+8;c.fillStyle='#e3b341';c.fillRect(X-tw/2,Y-r-19,tw,13);c.fillStyle='#111';c.textBaseline='middle';c.fillText('YOU',X,Y-r-12.5);}});}
// o: {mode, map, facs, tm, me, cols?, bases?}
function loadShow(o){const el=loadUI(),D=MAPS[o.map]||MAPS.strait;
  el.querySelector('.lo-k').textContent='World War 3 · '+({sandbox:'Test Range',single:'Skirmish vs AI',host:'Multiplayer battle',client:'Multiplayer battle'}[o.mode]||'Battle');
  el.querySelector('.lo-t').textContent=D.name;el.querySelector('.lo-d').textContent=D.desc||'';
  const v=el.querySelector('.lo-v');v.innerHTML='';const tms=[];o.facs.forEach((f,i)=>{const t=o.tm&&o.tm[i]!=null?o.tm[i]:i;let g=tms.find(q=>q.t===t);if(!g)tms.push(g={t,m:[]});g.m.push(i);});
  tms.sort((a,b)=>(b.m.includes(o.me)?1:0)-(a.m.includes(o.me)?1:0));
  tms.forEach((g,k)=>{if(k){const vs=document.createElement('div');vs.className='lo-vs';vs.textContent='VS';v.append(vs);}const col=document.createElement('div');col.className='lo-tm';
    for(const i of g.m){const f=o.facs[i],F=FACTIONS[f]||{name:f,color:'#888'},row=document.createElement('div');row.className='lo-f';row.style.setProperty('--c',(o.cols&&o.cols[i])||F.color);
      const ic=document.createElement('i');if(f==='RS'||f==='DW'){try{ic.append(emblemCanvas(f,30));}catch(e){ic.textContent=f;}}else ic.textContent=f;
      const tx=document.createElement('span');tx.style.minWidth='0';const b=document.createElement('b');b.textContent=F.name;const s=document.createElement('small');s.textContent=i===o.me?'YOU':o.mode==='sandbox'?'TARGETS':o.mode==='single'||o.ai&&o.ai[i]?'AI':'PLAYER';tx.append(b,s);row.append(ic,tx);col.append(row);}
    v.append(col);});
  loadMap(o.map,o.bases||null,o.cols||[],o.me);
  {const fac=o.facs[o.me];if(el.hidden||LOAD.qf!==fac){LOAD.qf=fac;const Q=loadQuote(fac),qe=el.querySelector('.lo-q');qe.classList.remove('in');el.querySelector('.lo-qt').textContent=Q.q;
    const og=el.querySelector('.lo-qo');og.textContent=Q.o||'';og.hidden=!Q.o;og.lang=Q.l||'';og.dir=/^(ar|fa|he|ur)$/.test(Q.l||'')?'rtl':'ltr';el.querySelector('.lo-qa').textContent=(Q.at?'attributed to ':'')+Q.a;void qe.offsetWidth;qe.classList.add('in');}}
  if(el.hidden){LOAD.tipI=Math.floor(Math.random()*LOAD_TIPS.length);clearInterval(LOAD.tipT);const tip=()=>{el.querySelector('.lo-tip span').textContent=LOAD_TIPS[LOAD.tipI++%LOAD_TIPS.length];};tip();LOAD.tipT=setInterval(tip,4500);}
  el.hidden=false;window.LOADING=true;}
function loadFromG(mode){if(!G)return;loadShow({mode,map:G.mapKey,facs:G.teams.map(T=>T.fac),tm:G.teams.map(T=>T.tm),me:ME,cols:G.teams.map(T=>T.color),ai:G.teams.map(T=>!!T.ai),bases:BASES.slice(0,G.teams.length)});}
function loadStep(label,p){const el=LOAD.el;if(!el)return;const s=el.querySelectorAll('.lo-s span');s[0].textContent=label;s[1].textContent=Math.round(p*100)+'%';el.querySelector('.lo-bar i').style.width=(p*100).toFixed(1)+'%';}
function loadHide(){clearInterval(LOAD.tipT);LOAD.tipT=null;if(LOAD.el)LOAD.el.hidden=true;window.LOADING=false;}
// wait until the browser has painted (falls back to a timer when the tab is in the background and frames stop)
function loadFrame(){return new Promise(r=>{let d=0;const go=()=>{if(!d){d=1;r();}};try{requestAnimationFrame(()=>setTimeout(go,0));}catch(e){}setTimeout(go,document.hidden?0:300);});}
function loadModelsWait(o){loadShow(o);loadStep('Loading 3D models…',.04);}
// true while the 3D models are still loading (false once they have finished, even if they failed: then the battle
// starts with simple shapes instead of waiting forever)
function modelsPending(){if(MODELS.ready||!MODELS.loading||LOAD.mdone)return false;if(!LOAD.mw){LOAD.mw=1;MODELS.loading.then(()=>{LOAD.mdone=1;},()=>{LOAD.mdone=1;});}return true;}
async function afterStart(){const tok=++LOAD.tok,g=G,mode=MODE==='single'?(g.sandbox?'sandbox':'single'):MODE;
  setTimeout(()=>{if(!MODELS.ready&&typeof pushLog==='function')pushLog('Detailed 3D models could not load on this device ('+(MODELS.err||'unknown')+'). Showing simple shapes.','bad');},500);
  initAudio();loadFromG(mode);g.paused=true;
  const live=()=>tok===LOAD.tok&&G===g;let tc=null;
  // [label, progress, work, is3dStart]; the battle clock stays held through every step
  // (the painted ground is held back from G.terrain until the end: the view draws nothing while G.terrain is unset)
  const steps=[['Generating terrain…',.08,()=>{paintTerrainNow();tc=g.terrain;g.terrain=null;loadMap(g.mapKey,BASES.slice(0,g.teams.length),g.teams.map(T=>T.color),ME,g.thumb);}],
    ['Building the battlefield…',.42,()=>{if(!R3)initGfx();else resetScene();},1],
    ['Building the battlefield…',.52,()=>{buildWorld(tc||g.terrain);resize();const [bx,by]=BASES[ME];{const fa=Math.atan2(MAPH/2-by,MAPW/2-bx);centerOn(bx+Math.cos(fa)*200,by+Math.sin(fa)*160);}cam.dist=430;}],
    ['Preparing graphics…',.78,()=>{try{warmShaders();}catch(e){console.warn('warm-up',e);}}],
    ['Deploying forces…',.9,()=>{buildPanels();}],
    // the first battle frame creates every unit, building, town and the fog of war on the GPU, by far the slowest frame
    // of the battle: draw it here, under the loading screen, so the battle appears already running
    ['Deploying forces…',.97,()=>{g.terrain=tc;try{renderFrame(1/60);}finally{g.terrain=null;}}]];
  const T0=performance.now(),TL=LOAD.times=[];
  for(const [label,p,fn,gl] of steps){loadStep(label,p);await loadFrame();if(!live()){if(tok===LOAD.tok)loadHide();return;}g.paused=true;const t1=performance.now();
    try{fn();TL.push([label,Math.round(performance.now()-t1)]);}catch(err){if(!gl){console.error(err);continue;}
      R3=null;loadHide();$('mpstatus').textContent='';$('menu').hidden=false;$('games').innerHTML='<div class="empty">This browser could not start 3D graphics (WebGL). Try another browser or turn on hardware acceleration.</div>';G=null;return;}}
  g.terrain=tc;loadStep('Ready',1);$('menu').hidden=true;$('end').hidden=true;
  TL.push(['total',Math.round(performance.now()-T0)]);console.log('battle start: '+TL.map(([a,b])=>a.replace('…','')+' '+b+' ms').join(', '));
  // multiplayer client: its battle clock stood still under the loading screen while the host's kept running; catch up
  // to the host's latest snapshot time so this player isn't permanently behind (host snapshots arrived meanwhile)
  if(MODE==='client'&&(NET.lastSnapT||0)>g.t)g.t=NET.lastSnapT;
  g.paused=false;last=performance.now();g.acc=0;qualReset();try{applyQual();}catch(e){}loadHide();
  pushLog(`${g.teams[ME].F.name} forces deployed. Select your Construction Vehicle, then build a Barracks, then send infantry or vehicles to capture oil derricks.`,'g');
  // music and this nation's voice lines start once the battlefield is up, so they don't compete with the loading work
  setTimeout(()=>{if(G!==g)return;try{startMusic(g.teams[ME].fac);}catch(e){}try{voLoad(g.teams[ME].fac);}catch(_){}},0);}
function startSingle(){if(modelsPending()&&!startSingle.w){startSingle.w=1;$('start').textContent='Loading 3D models…';{const f=rollAis();loadModelsWait({mode:'single',map:setup.map,facs:f,tm:setup.tm,me:0});}MODELS.loading.then(()=>{startSingle.w=0;$('start').textContent='Deploy vs AI';startSingle();});return;}if(modelsPending())return;MODE='single';ME=0;const facs=rollAis();if(new Set(setup.tm).size<2)setup.tm=facs.map((_,i)=>i);TERR_DEFER=true;try{newGame({seed:setup.seed||((Math.random()*1e9)|0),facs,ai:facs.map((_,i)=>i>0),map:setup.map,tm:setup.tm.slice(),bs:setup.bs,slot:setup.slot==null?-1:setup.slot});}finally{TERR_DEFER=false;}afterStart();}
// Test Range: you against a passive target enemy on a 2-player map, with unlimited money and everything unlocked
function startSandbox(){const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,setup.a&&setup.a!==setup.p?setup.a:en];
  if(modelsPending()){if(!startSandbox.w){startSandbox.w=1;loadModelsWait({mode:'sandbox',map:setup.map,facs,tm:[0,1],me:0});MODELS.loading.then(()=>{startSandbox.w=0;startSandbox();});}return;}MODE='single';ME=0;
  TERR_DEFER=true;try{newGame({seed:setup.seed||((Math.random()*1e9)|0),facs,ai:[false,false],map:setup.map,tm:[0,1],bs:1,slot:setup.slot==null?-1:setup.slot,sandbox:true});}finally{TERR_DEFER=false;}afterStart();}
function startMP(mode,seed,facs,slot,map,tm,aiD){if(modelsPending()){loadModelsWait({mode,map,facs,tm,me:slot|0,ai:facs.map((_,i)=>Array.isArray(aiD)&&aiD[i]!=null)});MODELS.loading.then(()=>startMP(mode,seed,facs,slot,map,tm,aiD));return;}NET.lastSnapT=0;NET.sc={};NET.kf={};NET.kt={};NET.cseq={};NET.cseqSlot=[];NET.ckAk=null;NET.ckOut=null;NET.iaDev=0;NET.tgC=null;NET.tgS=null;NET.ver=null;NET.sk=null;NET.gq=[];NET.civQ=[];NET.snapTo=[];NET.ia=0;NET.rxW=0;NET.prevT=0;MODE=mode;ME=slot|0;const isAI=i=>mode==='host'&&Array.isArray(aiD)&&aiD[i]!=null;TERR_DEFER=true;try{newGame({seed,facs,ai:facs.map((_,i)=>isAI(i)),map,tm});}finally{TERR_DEFER=false;}if(mode==='host')G.teams.forEach((T,i)=>{if(isAI(i))T.ai=mkAI(aiD[i]);});afterStart();$('mpstatus').textContent='';}

/* ---------- menu ---------- */
function facCards(){const el=$('pickP');el.innerHTML='';for(const k of FKEYS){const F=FACTIONS[k],b=document.createElement('button');b.className='fac'+(setup.p===k?' on':'');
    const sp=`Special: ${stats(k,F.special).name}`;b.innerHTML=`<span class="ins" style="background:${F.color}">${({RS:"MS",DW:"CS"})[k]||k}</span><span><div class="nm"></div><div class="dc"></div><div class="full"></div><div class="sp"></div><div class="sw"></div></span>`;
    b.querySelector('.nm').textContent=F.name;if(k==='RS'||k==='DW'){const ins=b.querySelector('.ins');ins.textContent='';const ec=emblemCanvas(k,38);ec.style.width='38px';ec.style.height='38px';ins.append(ec);}b.querySelector('.dc').textContent=F.docShort||F.doctrine;b.querySelector('.full').textContent=F.doctrine;b.title=F.doctrine;b.querySelector('.sp').textContent=sp+' · '+upgName(k,F.fup);b.querySelector('.sw').textContent='Strike: '+F.sup.name;b.onclick=()=>{setup.p=k;{const hm=MAP_KEYS.find(m=>(MAPS[m].home||[]).includes(k));if(hm&&$('mapSel')&&setup.map!==hm){$('mapSel').value=hm;$('mapSel').onchange();}}facCards();renderTeams();if(NET.code&&NET.code!=='join'&&NET.room)NET.room.presence({g:{c:NET.code,f:k,s:'open'}}).catch(()=>{});};el.append(b);}}
const PREV={};
// Draw start-slot markers on the preview: your chosen slot in gold with YOU, the slots the AIs will take in red, unused ones dim.
function prevMarks(){const cv=$('mapCv'),k=setup.map,P=PREV[k];if(!cv||!P)return;const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.putImageData(P.img,0,0);
  const n=Math.min((setup.n||1)+1,P.sl.length),pick=setup.slot==null?-1:setup.slot,used=slotOrder(MAPS[k],n,pick);c.textAlign='center';c.textBaseline='middle';
  P.sl.forEach(([x,y],i)=>{const X=x/MAPW*W,Y=y/MAPH*H,u=used.indexOf(i),me=pick>=0?i===pick:false;const r=me?11:9;
    c.globalAlpha=u<0?.55:1;c.fillStyle='rgba(8,10,9,.78)';c.beginPath();c.arc(X,Y,r,0,7);c.fill();c.lineWidth=2;c.strokeStyle=me?'#e3b341':u>0?'#ea5a40':u===0?'#e3b341':'rgba(220,220,220,.5)';c.stroke();
    c.font='bold 12px sans-serif';c.fillStyle=me?'#e3b341':'#eee';c.fillText(i+1,X,Y+.5);
    if(me){c.font='bold 10px sans-serif';const tw=c.measureText('YOU').width+8;c.fillStyle='#e3b341';c.fillRect(X-tw/2,Y-r-15,tw,12);c.fillStyle='#111';c.fillText('YOU',X,Y-r-8.5);}c.globalAlpha=1;});
  const note=$('slotNote');if(note)note.textContent=pick>=0?`You start at position ${pick+1}. Click another number to move, or click empty ground for a random start.`:'Click a numbered position on the map to choose where you start (random if none).';}
function mapPreview(k,cv){const c=cv.getContext('2d'),W=cv.width,H=cv.height;const old=srand;const M=(()=>{const keepB=BASES,keepS=BASE_SLOTS;setBases(MAPS[k].max,k);const m=mkMap(4242,k);const sl=BASES.slice();BASES=keepB;BASE_SLOTS=keepS;return{m,sl};})();srand=old;
  const id=c.createImageData(W,H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const wx=(i+.5)/W*MAPW,wy=(j+.5)/H*MAPH,e=M.m.edge(wx,wy),mt=M.m.mtn(wx,wy),q=(j*W+i)*4,sn=M.m.theme==='snow';const v=e>0?(sn?[150,180,196]:[44,92,102]):mt>0?(mt>(sn?20:75)?[236,240,246]:sn?[150,156,166]:[112,102,90]):e>-30?(sn?[220,226,234]:[201,174,124]):(sn?[206,214,224]:[168,130,90]);id.data.set([...v,255],q);}c.putImageData(id,0,0);
  c.fillStyle='#8a7b63';for(const b of M.m.bridges){c.save();c.translate(b.x/MAPW*W,b.y/MAPH*H);c.rotate(Math.atan2(b.n[1]*H/MAPH,b.n[0]*W/MAPW));c.fillRect(-b.h/MAPW*W,-1,b.h*2/MAPW*W,2);c.restore();}
  PREV[k]={img:c.getImageData(0,0,W,H),sl:M.sl};prevMarks();
  let wa=0,mo=0;for(let q=0;q<id.data.length;q+=4){const r=id.data[q],g=id.data[q+1],b=id.data[q+2];if(b>r+20&&g<200||r===150&&g===180)wa++;else if(r===112&&g===102||r===236&&g===240||r===150&&g===156)mo++;}const n=W*H;
  return{water:wa/n,mtn:mo/n,bridges:M.m.bridges.length};}
function syncAiN(){const mx=(MAPS[setup.map]||MAPS.strait).max-1;if($('aiN'))$('aiN').querySelectorAll('button').forEach(b=>{b.disabled=+b.dataset.n>mx;});if(setup.n>mx){setup.n=[1,2,3,5,7].filter(v=>v<=mx).pop();$('aiN').querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.n===setup.n));$('start').textContent=setup.n>1?`Deploy vs ${setup.n} AI`:'Deploy vs AI';}}
function mapCards(){const el=$('pickMap');if(!el)return;if(!setup.map)setup.map=(typeof SET!=='undefined'&&SET.map&&MAPS[SET.map])?SET.map:'strait';el.className='';el.innerHTML='';const box=document.createElement('div');box.className='mapsel';
  const cv=document.createElement('canvas');cv.id='mapCv';cv.width=384;cv.height=264;cv.setAttribute('aria-label','Map preview: click a numbered position to choose your start');cv.onclick=e=>{const P=PREV[setup.map];if(!P)return;const r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*MAPW,my=(e.clientY-r.top)/r.height*MAPH;let best=-1,bd=1e9;P.sl.forEach(([x,y],i)=>{const d=Math.hypot(x-mx,y-my);if(d<bd){bd=d;best=i;}});setup.slot=bd<MAPW*.09?best:-1;try{sfxUI(700);}catch(_){}prevMarks();};const right=document.createElement('div');const sel=document.createElement('select');sel.id='mapSel';sel.setAttribute('aria-label','Battlefield');
  for(const k of MAP_KEYS){const o=document.createElement('option');o.value=k;const hm=(MAPS[k].home||[]).map(f=>FACTIONS[f]&&FACTIONS[f].name).filter(Boolean);o.textContent=`${MAPS[k].name}${hm.length?' · home of '+hm.join(' & '):''} (${MAPS[k].min}–${MAPS[k].max} players)`;sel.append(o);}sel.value=setup.map;
  const pl=document.createElement('div');pl.className='pl';const dc=document.createElement('div');dc.className='dc';const sn=document.createElement('div');sn.className='dc';sn.id='slotNote';right.append(sel,pl,dc,sn);box.append(cv,right);el.append(box);
  const show=()=>{const D=MAPS[setup.map];const base=`${D.min}–${D.max} players`+(D.theme==='snow'?' · snow & ice':'');pl.textContent=base;dc.textContent=D.desc;
    setTimeout(()=>{try{const r=mapPreview(setup.map,cv);if(r){const t=[base];if(r.water>.28)t.push('naval-heavy');else if(r.water>.06)t.push('rivers & coast');else t.push('open land');if(r.mtn>.05)t.push('mountain passes');if(r.bridges)t.push(r.bridges+(r.bridges>1?' bridges':' bridge'));pl.textContent=t.join(' · ');}}catch(e){}},20);};
  const rb=document.createElement('button');rb.type='button';rb.className='rndmap';rb.textContent='Random battlefield';rb.onclick=()=>{const need=(setup.n||1)+1;const ks=MAP_KEYS.filter(k=>k!==setup.map&&MAPS[k].max>=Math.min(need,8));const k=ks[Math.floor(Math.random()*ks.length)]||setup.map;sel.value=k;sel.onchange();};right.insertBefore(rb,pl);
  sel.onchange=()=>{setup.map=sel.value;setup.slot=-1;try{SET.map=setup.map;saveSet();}catch(e){}show();syncAiN();renderTeams();if(typeof renderLobby==='function')renderLobby();};show();syncAiN();}
// Skirmish roster: you, the main opponent and the other AIs (rolled once so you can see who they are), each with a team.
function rollAis(){const n=Math.max(1,Math.min((MAPS[setup.map]||MAPS.strait).max-1,setup.n||1));const facs=[setup.p,setup.a];const pool=FKEYS.filter(k=>!facs.includes(k)&&!(setup.others||[]).includes(k));
  setup.others=(setup.others||[]).filter(k=>!facs.includes(k)).slice(0,n-1);while(setup.others.length<n-1){const k=pool.splice(Math.floor(Math.random()*pool.length),1)[0]||FKEYS[setup.others.length%FKEYS.length];setup.others.push(k);}
  const tm=(setup.tm||[]).slice(0,n+1);while(tm.length<n+1)tm.push(tm.length);setup.tm=tm;return[...facs,...setup.others];}
function renderTeams(){const el=$('teamList');if(!el)return;const facs=rollAis();el.innerHTML='';const N=facs.length;
  facs.forEach((f,i)=>{const row=document.createElement('div');row.className='trow';const nm=document.createElement('span');nm.textContent=(i===0?'You · ':`AI ${i} · `)+FACTIONS[f].name;
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm.textContent);for(let t=0;t<Math.max(2,N);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=setup.tm[i];
    s.onchange=()=>{setup.tm[i]=+s.value;checkTeams();};row.append(nm,s);el.append(row);});checkTeams();}
function checkTeams(){const ok=new Set(setup.tm).size>1;const b=$('start');if(!b)return;b.disabled=!ok;b.title=ok?'':'Put at least one player on a different team.';}
mapCards();
facCards();const sel=$('aiFac');for(const k of FKEYS){const o=document.createElement('option');o.value=k;o.textContent=FACTIONS[k].name;sel.append(o);}sel.value=setup.a;setTimeout(renderTeams,0);sel.onchange=()=>{setup.a=sel.value;renderTeams();};if($('aiN'))$('aiN').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.n=+b.dataset.n;setTimeout(prevMarks,0);$('aiN').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('start').textContent=setup.n>1?`Deploy vs ${setup.n} AI`:'Deploy vs AI';renderTeams();});if($('watch'))$('watch').onclick=()=>{$('end').hidden=true;};
if($('wx'))$('wx').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.w=+b.dataset.w;$('wx').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));});
$('diff').querySelectorAll('button').forEach(b=>b.onclick=()=>{setup.d=+b.dataset.d;$('diff').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));});
$('start').onclick=()=>{initAudio();startSingle();};if($('sandbox'))$('sandbox').onclick=()=>{initAudio();startSandbox();};$('host').onclick=()=>{initAudio();hostGame();};
{const tk=$('sTrk');if(tk)for(const b of tk.querySelectorAll('button'))b.onclick=()=>{initAudio();setMyMode(b.dataset.v);myUI();if(G&&!G.over)myStart();};
  const f=$('myF');if(f)f.onchange=async()=>{initAudio();const n=await myAdd(f.files);f.value='';if(n){setMyMode('mine');if(G&&!G.over)myStart();}myUI();};
  if($('myNx'))$('myNx').onclick=()=>{initAudio();if(myMode()==='mine'&&MYM.list.length&&G&&!G.over)myNext();};if($('myCl'))$('myCl').onclick=async()=>{await myClear();setMyMode('score');if(G&&!G.over)myStart();myUI();};
  myList().then(l=>{MYM.list=l;myUI();});}
if(window.WW3_P2P&&$('relayBox')){$('relayBox').hidden=false;let r={};try{r=JSON.parse(localStorage.getItem('ww3_relay')||'{}')||{};}catch(e){}$('relayU').value=r.urls||'';$('relayN').value=r.username||'';$('relayP').value=r.credential||'';
  const sv=()=>{try{const u=$('relayU').value.trim();if(u)localStorage.setItem('ww3_relay',JSON.stringify({urls:u,username:$('relayN').value.trim(),credential:$('relayP').value}));else localStorage.removeItem('ww3_relay');$('relayS').textContent='Saved. Takes effect for the next game you host or join (reload the page).';}catch(e){}};for(const id of ['relayU','relayN','relayP'])$(id).onchange=sv;}
{const seg=(id,key,def)=>{const el=$(id);if(!el)return;let v=def;try{v=localStorage.getItem(key)||def;}catch(e){}const paint=()=>{for(const b of el.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===v);};paint();for(const b of el.querySelectorAll('button'))b.onclick=()=>{v=b.dataset.v;try{localStorage.setItem(key,v);}catch(e){}paint();QUAL.bad=QUAL.good=0;};};seg('sFpsT','ww3_fpsT','120');seg('sHideIp','ww3_hideip','0');seg('sFpsS','ww3_fpsShow','0');}
$('aMus').onclick=()=>{initAudio();AU.musicOn=!AU.musicOn;saveAudio();applyAudio();};$('aSfx').onclick=()=>{initAudio();AU.sfxOn=!AU.sfxOn;saveAudio();applyAudio();};$('aVoc').onclick=()=>{initAudio();AU.voiceOn=!AU.voiceOn;saveAudio();applyAudio();};$('cancelHost').onclick=cancelHost;
// settings panel (main menu and in game)
// Phones (touch screen, no mouse): render at most 1.5 pixels per screen point instead of the full 2 (about half the
// pixels to shade at the start level), ambient occlusion only at the top level, lighter edge smoothing below it, and
// Auto starts one level down so the battle is smooth from its first frame; Auto still steps up when frames have time
// to spare and down when they don't. Desktop and the High setting are unchanged.
const GFX_PHONE=(()=>{try{return matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches;}catch(e){return false;}})();
const QCAPS0=QUAL.caps.slice();
function gfxPhone(){return GFX_PHONE&&SET.gfx!=='high';}
function qualStartLv(){return SET.gfx==='auto'?(gfxPhone()?1:0):({high:0,med:1,low:3}[SET.gfx]??0);}
// a fresh start for the frame-rate governor (a new battle, or a settings change): the long frames of the loading
// screen must not count as stutter
function qualReset(){QUAL.lv=qualStartLv();QUAL.bad=QUAL.good=0;QUAL.ema=1/60;QUAL.dts.length=0;}
function applyGfx(){if(typeof QUAL==='undefined')return;const ph=gfxPhone(),base=Math.min(2,window.devicePixelRatio||1);
  QUAL.caps=ph?QCAPS0.map((c,i)=>Math.min(c,[1.5,1.35,1.25,1.1,1,.9][i]/base)):QCAPS0.slice();POST.aoLv=ph?1:2;POST.phone=ph;
  QUAL.lock=SET.gfx==='auto'?0:1;qualReset();try{applyQual();}catch(e){}}
// One game speed for everyone, a little brisker than real time so battles keep moving.
const GSPD=1.2;
function syncSettings(){const segs=[['sGfx','gfx',String],['sHp','hp',String],['sEdge','edge',Number],['sTxt','txt',Number],['sInv','inv',Number],['sDbl','dbl',Number],['sTol','tol',Number],['sMmc','mmc',String],['sMpan','mpan',Number]];
  for(const [id,k,cv] of segs){const el=$(id);if(!el)continue;el.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',cv(b.dataset.v)===SET[k]);b.onclick=()=>{SET[k]=cv(b.dataset.v);saveSet();syncSettings();if(k==='gfx')applyGfx();};});}
  for(const [id,k] of [['sMus','mus'],['sFx','fx'],['sVo','vo'],['sScr','scr'],['sZm','zm']]){const el=$(id);if(!el)continue;el.value=SET[k];const out=$(id+'V');if(out)out.textContent=SET[k]+'%';el.oninput=()=>{SET[k]=+el.value;if(out)out.textContent=SET[k]+'%';saveSet();if(k!=='scr'&&k!=='zm')applyAudio();};}}
function openSettings(){try{myUI();}catch(e){}syncSettings();$('settings').hidden=false;}
if($('openSettings'))$('openSettings').onclick=openSettings;if($('aSet'))$('aSet').onclick=openSettings;if($('sDone'))$('sDone').onclick=()=>{$('settings').hidden=true;};
syncSettings();setTimeout(applyGfx,0);
// Pause and quit. Single player and skirmish vs AI pause the whole battle; in multiplayer the battle keeps running for
// everyone else, so the menu opens without stopping time and says so.
function togglePause(on){if(!G||G.over||window.LOADING)return;const mp=MODE!=='single';if(on==null)on=!(G.paused||!$('pauseOv').hidden);
  if(on){if(!mp){G.paused=true;try{if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend();}catch(e){}try{if(window.speechSynthesis)speechSynthesis.pause();}catch(e){}}
    $('pauseSub').textContent=mp?'Multiplayer battles cannot be paused - the battle continues while this menu is open.':'The battle is on hold. Nothing moves until you resume. (P or Esc to resume)';$('resumeBtn').textContent=mp?'Back to battle':'Resume';$('pauseOv').hidden=false;}
  else{G.paused=false;$('pauseOv').hidden=true;try{if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();}catch(e){}try{if(window.speechSynthesis)speechSynthesis.resume();}catch(e){}last=performance.now();}
  syncPause();}
function askRestart(){if(!G)return;if(MODE!=='single'){pushLog('Multiplayer battles cannot be restarted - quit and host a new one.','w');return;}askQuit();G.restartAsk=true;$('quitOv').querySelector('h1').textContent='Restart this battle?';$('quitSub').textContent='The battle starts over with the same nations, map and settings.';$('quitYes').textContent='Restart';}
function askQuit(){if(!G)return;G.restartAsk=false;$('quitOv').querySelector('h1').textContent='Quit this battle?';$('quitYes').textContent='Quit to main menu';if(MODE==='single'&&!G.over&&!G.paused){G.paused=true;G.qPause=true;try{if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend();}catch(e){}}$('pauseOv').hidden=true;$('quitSub').textContent=MODE==='single'?"The battle will end and you'll return to the main menu.":'You will leave the multiplayer battle; your army will be left without a commander.';$('quitOv').hidden=false;}
function quitGame(){$('quitOv').hidden=true;$('pauseOv').hidden=true;$('end').hidden=true;try{if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();}catch(e){}try{if(window.speechSynthesis){speechSynthesis.cancel();}}catch(e){}
  if(G){G.over=true;G.paused=false;}menuOpen(false);syncPause();$('menu').hidden=false;if(MODE!=='single')leaveNet();MODE='single';ME=0;G=null;renderGames();}
$('aPause').onclick=()=>togglePause();$('aQuit').onclick=askQuit;$('resumeBtn').onclick=()=>togglePause(false);$('pQuit').onclick=askQuit;$('quitYes').onclick=()=>{const rs=G&&G.restartAsk;quitGame();if(rs){initAudio();startSingle();}};$('aRestart').onclick=askRestart;$('pRestart').onclick=askRestart;
/* ---------- command bar: ☰ menu, fold handle (phones), tactical-map button while folded ---------- */
function syncPause(){const p=!!(G&&G.paused&&!G.over);for(const id of ['aPause','aPauseM']){const b=$(id);if(!b)continue;b.textContent=p?'▶ Resume':'❚❚ Pause';b.classList.toggle('pz',p);b.title=p?'Resume the battle (P)':'Pause the battle (P)';}}
function menuOpen(v){const m=$('amenu'),b=$('aMenu');if(!m)return false;if(v==null)return !m.hidden;m.hidden=!v;if(b)b.setAttribute('aria-expanded',v?'true':'false');if(v){syncPause();ctipHide();}return !!v;}
if($('aMenu')){$('aMenu').onclick=e=>{e.stopPropagation();menuOpen(!menuOpen());};
  // a tap or click anywhere outside the menu closes it (and does nothing else, so a stray tap can't order units)
  document.addEventListener('pointerdown',e=>{if(!menuOpen())return;const m=$('amenu');if(m.contains(e.target)||$('aMenu').contains(e.target))return;menuOpen(false);if(e.target===cv){e.stopPropagation();e.preventDefault();}},true);
  // Pause, Settings, Restart and Quit close the menu; the sound switches keep it open to flip several in a row
  for(const id of ['aSet','aRestart','aQuit'])$(id).addEventListener('click',()=>menuOpen(false));
  $('aPauseM').onclick=()=>{menuOpen(false);togglePause();};}
// the bar's height, for things that float just above it (unit orders on phones, button descriptions)
function barH(){const sd=$('side');if(!sd)return;const h=sd.hidden?0:Math.round(sd.getBoundingClientRect().height);document.documentElement.style.setProperty('--barh',h+'px');}
try{new ResizeObserver(barH).observe($('side'));}catch(e){addEventListener('resize',barH);}
// phones: the handle folds the bar down to its top strip (money, tabs, pause, menu) and back; remembered on this device
function barMin(v){const sd=$('side');if(!sd)return false;if(v==null)return sd.classList.contains('min');v=!!v;sd.classList.toggle('min',v);if(!v)mapPeek(false);
  const g=$('barGrip');if(g){g.textContent=v?'▴':'▾';g.setAttribute('aria-expanded',v?'false':'true');g.title=v?'Show the command bar':'Fold the command bar down';}
  try{localStorage.setItem('ww3_barMin',v?'1':'0');}catch(e){}ctipHide();barH();return v;}
function mapPeek(v){const sd=$('side'),b=$('mmBtn');if(!sd)return;if(v==null)v=!sd.classList.contains('mmOn');sd.classList.toggle('mmOn',!!v);if(b)b.setAttribute('aria-pressed',v?'true':'false');}
if($('barGrip'))$('barGrip').onclick=()=>barMin(!barMin());
if($('mmBtn'))$('mmBtn').onclick=()=>mapPeek();
{let m=false;try{m=localStorage.getItem('ww3_barMin')==='1';}catch(e){}if(m)barMin(true);}
// Test Range controls fold to their title so they don't cover the battlefield
if($('sbFold')){const sb=$('sbx'),f=v=>{sb.classList.toggle('fold',v);$('sbFold').setAttribute('aria-expanded',v?'false':'true');};let v=false;try{v=localStorage.getItem('ww3_sbFold')==='1';}catch(e){}f(v);
  $('sbFold').onclick=()=>{const n=!sb.classList.contains('fold');f(n);try{localStorage.setItem('ww3_sbFold',n?'1':'0');}catch(e){}};}
$('quitNo').onclick=()=>{$('quitOv').hidden=true;if(G&&G.qPause){G.qPause=false;togglePause(false);}};
$('again').onclick=()=>{initAudio();startSingle();};$('change').onclick=()=>{$('end').hidden=true;$('menu').hidden=false;if(MODE!=='single')leaveNet();MODE='single';ME=0;G=null;renderGames();};

let last=performance.now();
// FPS and ping readout (Settings > Show FPS & ping)
let _fpsT=0;function fpsHud(){const now=performance.now();if(now-_fpsT<500)return;_fpsT=now;const el=$('fpsHud');if(!el)return;let on=false;try{on=localStorage.getItem('ww3_fpsShow')==='1';}catch(e){}el.hidden=!on||!G;if(el.hidden)return;
  el.textContent=Math.round(QUAL.fps)+' FPS'+(QUAL.lv?' · detail −'+QUAL.lv:'')+(MODE==='client'&&NET.ping?' · ping '+Math.round(NET.ping)+' ms':MODE==='host'&&NET.pings&&Object.keys(NET.pings).length?' · ping '+Object.values(NET.pings).map(v=>Math.round(v)).join('/')+' ms':'');}
function loop(now){if(window.__stopLoop)return;const _w0=performance.now();const rawDt=Math.max(0,(now-last)/1000);const dt=Math.min(.05,rawDt);last=now;if(G&&!document.hidden&&rawDt<.5)qualTick(rawDt);
  try{if(G&&!G.over&&!G.paused){if(MODE==='client')clientTick(dt);else{const sd=dt*GSPD;
    // fixed 60 Hz simulation: it used to run once per rendered frame (144-240x a second on high-refresh monitors, all of it
    // host CPU in multiplayer); drawing interpolates unit positions between steps so motion stays smooth at any refresh rate
    const ST=1/60;
    if(sd>1/40){G.acc=0;G.alpha=1;if(sd>.06){simUpdate(sd/2);simUpdate(sd/2);}else simUpdate(sd);}   // slow frames (under 40 fps): one larger step, as before
    else{G.acc=Math.min(.1,(G.acc||0)+sd);let n=0;while(G.acc>=ST-1e-6&&n<3){for(const e of G.ents)if(!e.isB){e.ox=e.x;e.oy=e.y;}simUpdate(ST);G.acc-=ST;n++;}G.alpha=Math.max(0,Math.min(1,G.acc/ST));}}G.uiT-=dt;if(G.uiT<=0){G.uiT=.2;updateUI();}}
    if(G)netTick(dt);
    if(G){scroll(dt);renderFrame(dt);}}catch(err){console.error(err);}
  QUAL.cost+=((performance.now()-_w0)/1000-QUAL.cost)*.05;fpsHud();
  requestAnimationFrame(loop);}
// Hosting from a hidden or minimized window. Browsers stop drawing frames for a page you can't see (requestAnimationFrame
// pauses completely, and ordinary timers slow to about once a second), and the host's browser runs the whole battle, so
// switching to another window used to freeze the match for every player until they dropped. While the host's page is
// hidden, a tiny background worker ticks the battle about 30 times a second instead: the simulation and the network keep
// running in real time and only the drawing is skipped. Solo games still pause when hidden, as before.
const HBG={w:null,iv:null,t:0};
function hbgNeeded(){return !!(G&&!G.over&&MODE==='host'&&NET.game&&NET.peers&&NET.peers.some((p,k)=>k!==ME&&p));}
function hbgStep(){if(!document.hidden||window.__stopLoop||!G){hbgStop();return;}const now=performance.now();const rawDt=Math.min(1,Math.max(0,(now-HBG.t)/1000));HBG.t=now;if(rawDt<=0)return;
  try{if(!G.over&&!G.paused&&MODE!=='client'){const ST=1/60;G.acc=Math.min(1,(G.acc||0)+rawDt*GSPD);let n=0;
      while(G.acc>=ST-1e-6&&n<80){for(const e of G.ents)if(!e.isB){e.ox=e.x;e.oy=e.y;}simUpdate(ST);G.acc-=ST;n++;}G.alpha=1;}
    netTick(rawDt);}catch(err){console.error(err);}}
function hbgStart(){if(HBG.w||HBG.iv)return;HBG.t=Math.max(last,performance.now()-50);
  try{HBG.w=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33)'],{type:'text/javascript'})));HBG.w.onmessage=hbgStep;HBG.w.onerror=()=>{try{HBG.w.terminate();}catch(e){}HBG.w=null;if(!HBG.iv)HBG.iv=setInterval(hbgStep,33);};}
  catch(e){HBG.w=null;HBG.iv=setInterval(hbgStep,33);}}
function hbgStop(){const was=!!(HBG.w||HBG.iv);if(HBG.w){try{HBG.w.terminate();}catch(e){}HBG.w=null;}if(HBG.iv){clearInterval(HBG.iv);HBG.iv=null;}if(was){last=performance.now();if(G)G.acc=Math.min(.1,G.acc||0);}}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&hbgNeeded())hbgStart();else hbgStop();});
// Hosting on battery: Windows lets a laptop slow down, dim and sleep much sooner on battery, which shows up as lag or
// dropped players for everyone in the match. Remind the host (once per match, and again if they unplug mid-match).
const HBAT={b:null,warned:null,asked:false};
function hbatCheck(){if(!(G&&!G.over&&hbgNeeded()))return;const b=HBAT.b;
  if(!b){if(!HBAT.asked&&navigator.getBattery){HBAT.asked=true;navigator.getBattery().then(x=>{HBAT.b=x;x.addEventListener('chargingchange',hbatCheck);hbatCheck();}).catch(()=>{});}return;}
  if(b.charging){if(HBAT.warned===G)HBAT.warned=null;return;}
  if(HBAT.warned===G)return;HBAT.warned=G;
  try{pushLog("You're hosting on battery. Plug your laptop in so it stays fast and awake for everyone in the match.",'w');}catch(e){}}
setInterval(hbatCheck,5000);
// Keep the screen, and with it the PC, awake during an online match (host or player), so a laptop doesn't drift off to
// sleep mid-battle and drop everyone. The browser only grants this while the game is on screen; it is let go after the match.
const WAKE={s:null,busy:false};
setInterval(async()=>{if(document.hidden&&hbgNeeded())hbgStart();
  const want=!!(G&&!G.over&&(MODE==='host'||MODE==='client')&&!document.hidden);
  if(want&&!WAKE.s&&!WAKE.busy&&navigator.wakeLock){WAKE.busy=true;try{const s=await navigator.wakeLock.request('screen');WAKE.s=s;s.addEventListener('release',()=>{if(WAKE.s===s)WAKE.s=null;});}catch(e){}WAKE.busy=false;}
  else if(!want&&WAKE.s){const s=WAKE.s;WAKE.s=null;try{await s.release();}catch(e){}}},2000);
new ResizeObserver(()=>resize()).observe(cv);
requestAnimationFrame(loop);netInit();

function sbPanel(){const el=$('sbx');if(!el)return;el.hidden=!(G&&G.sandbox);if(el.hidden)return;const D=G.teams[1];const b=$('sbFight');if(b){b.textContent=D.fight?'Enemy fights back: ON':'Enemy fights back: OFF';b.classList.toggle('on',!!D.fight);}
  const n=G.ents.filter(e=>e.team===1&&!e.dead&&!e.isB).length;const c=$('sbCount');if(c)c.textContent=`${n} enemy target${n===1?'':'s'} left`;}
if($('sbTargets'))$('sbTargets').onclick=()=>{if(G&&G.sandbox){sandboxTargets();pushLog('New targets have arrived.','g');updateUI();}};
if($('sbFight'))$('sbFight').onclick=()=>{if(G&&G.sandbox){const D=G.teams[1];D.fight=!D.fight;updateUI();}};
if($('sbClear'))$('sbClear').onclick=()=>{if(G&&G.sandbox){for(const e of G.ents)if(e.team===1&&!e.isB&&!e.dead){e.dead=true;G.byId.delete(e.id);FXE('die',[e.id,e.x|0,e.y|0,KINDS.indexOf(e.kind),0,1]);}updateUI();}};

