/* ================= UI: sidebar, input, menu, main loop ================= */
const mouse={x:0,y:0,in:false};const keys={};let drag=null,TAB='build';
// Touch screens: TOUCHUI turns on touch wording and layout tweaks; PICKMIN is the smallest tap radius (px) around a unit.
let TOUCHUI=false,PICKMIN=10,LASTPT='mouse',HINTDEV='mouse';
function pushLog(m,k){if(!G)return;try{if(/ ready\.$/.test(m))speak(3);else if(/under attack/i.test(m))speak(4);}catch(e){}G.msgs.unshift({m,k});G.msgs.length=Math.min(G.msgs.length,5);
  // battle messages: a short feed over the battlefield's top-left corner, newest at the bottom; each line stays still
  // for 7 s, then fades out in 0.6 s (no long-running CSS animation over the 3D canvas: it kept idle pages compositing)
  const el=$('log');if(!el)return;const d=document.createElement('div');d.className=k||'';d.textContent=m;setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),700);},7000);el.append(d);while(el.children.length>4)el.firstChild.remove();}
function rivals(){return G.teams.filter(T=>!ally(T.id,ME)).map(T=>T.F.name);}
function vsText(){const r=rivals();return r.length<=2?r.join(' and '):`${r.length} rivals`;}
function showEnd(winner,reason){if(!G)return;G.over=true;const T=G.teams,me=T[ME],m=Math.floor(G.t/60),s=Math.floor(G.t%60);
  const won=winner>=0&&ally(winner,ME);
  // the sim's reason is written from the winner's side ("The last enemy capitulated: …"); the losers read their own fall
  if(!won&&reason&&/^The last enemy capitulated/.test(reason)){const why=me.whyOut||String(reason).replace(/^The last enemy capitulated:\s*/,'');reason=`${me.F.name} has been defeated${why?': '+why:'.'}`;if(!/[.!]$/.test(reason))reason+='.';}
  const wn=winner>=0?T.filter(Q=>ally(Q.id,winner)).map(Q=>Q.F.name):[];$('endt').textContent=won?'Victory':'Defeat';$('ends').textContent=(reason?reason+' ':'')+(winner>=0&&!won?`${wn.join(' and ')} won. `:won&&wn.length>1?`Your alliance (${wn.join(', ')}) won. `:'')+`${me.F.name} vs ${vsText()} · ${m}:${String(s).padStart(2,'0')}`+(MODE==='client'?'':` · You trained ${me.built} units, destroyed ${me.kills} enemy units and structures, and reached general rank ${me.rank}.`);
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
function showTab(t){TAB=t;const pn=$('panel');if(pn)pn.scrollLeft=0;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));document.querySelectorAll('#panel>[data-tab]').forEach(b=>b.hidden=b.dataset.tab!==t);fitBtnNames();}
// phones: a command-button name that still doesn't fit in two lines gets a smaller font (down to 8.5 px) instead of "…"
const PHONE_BAR=typeof matchMedia==='function'?matchMedia('(max-width:560px),(max-width:760px) and (min-height:521px),(max-height:520px)'):null;
function fitBtnNames(){const pn=$('panel');if(!pn)return;const on=PHONE_BAR&&PHONE_BAR.matches;fitCols(pn);for(const n of pn.querySelectorAll('.btn:not([hidden]) .n')){n.style.fontSize='';n.style.overflowWrap='';const b=n.parentNode;if(b.dataset.nm&&n.textContent!==b.dataset.nm)n.textContent=b.dataset.nm;if(!n.clientWidth)continue;let f=parseFloat(getComputedStyle(n).fontSize)||11;const fmin=on?10:12;while(f>fmin&&(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1)){f-=.5;n.style.fontSize=f+'px';}const sh=on&&PHONE_NM[n.textContent];if(sh&&(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1))n.textContent=sh;if(n.scrollWidth>n.clientWidth+1)n.style.overflowWrap='anywhere';}
  for(const c of pn.querySelectorAll('.btn:not([hidden]) .c'))fitText(c,on?9.5:11);
  for(const el of [$('facname'),...document.querySelectorAll('#side .sup .lbl>span:first-child')])fitText(el,10);}
// a one-line label that doesn't fit gets a smaller font (down to min px) instead of "…"
function fitText(el,min){if(!el)return;el.style.fontSize='';if(!el.clientWidth||el.scrollWidth<=el.clientWidth+1)return;let f=parseFloat(getComputedStyle(el).fontSize)||13;while(f>min&&el.scrollWidth>el.clientWidth+1){f-=.5;el.style.fontSize=f+'px';}}
// the command grid shows whole buttons only: the button width is stretched a little so a whole number of columns fills
// the grid (no last column half hidden at the edge or under the panel beside it), the building labels between them counted
const BW_MIN={up:80,land:100,desk:150};
function fitCols(pn){const up=matchMedia('(max-width:560px),(max-width:760px) and (min-height:521px)').matches,land=!up&&matchMedia('(max-height:520px)').matches;
  const base=up?BW_MIN.up:land?BW_MIN.land:BW_MIN.desk,W=pn.clientWidth;if(!W)return;
  const P=pn.getBoundingClientRect();for(let k=0;k<2;k++){let subW=0;for(const d of pn.querySelectorAll('.sub:not([hidden])')){const r=d.getBoundingClientRect();if(r.left-P.left+pn.scrollLeft<W)subW+=r.width+3;}
    const w=W-subW,cols=Math.max(1,Math.floor((w+3)/(base+3))),bw=Math.min(base*1.45,Math.floor(((w+3)/cols-3)*4)/4);pn.style.setProperty('--bw',bw+'px');}}
const PHONE_NM={'Hetman Sahaidachny Frigate':'Sahaidachny Frigate'}; // phones only, when even the smallest font can't fit the full name (the tooltip keeps it)
addEventListener('resize',()=>{clearTimeout(fitBtnNames.t);fitBtnNames.t=setTimeout(fitBtnNames,150);});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{if(barMin())barMin(false);showTab(b.dataset.tab);});
function specLock(T,k){return k===T.F.special&&T.rank<SPEC_RANK;}
// the full text of a button (what it does, what it needs, what it counters) lives in data-tip and shows in the command
// tooltip (hover with a mouse; tap or long-press on a touch screen) instead of on the button itself
function setBtn(id,o){const b=$(id);if(!b)return;b.disabled=!!o.dis;if(o.cost!=null){const c=b.querySelector('.c');if(c.textContent!==String(o.cost)){c.textContent=o.cost;if(!b.hidden&&b.dataset.tab===TAB)fitText(c,PHONE_BAR&&PHONE_BAR.matches?7.5:8.5);}}b.querySelector('.q').textContent=o.q||'';b.querySelector('.p').style.width=(o.p||0)*100+'%';b.classList.toggle('on',!!o.on);b.classList.toggle('done',!!o.done);b.classList.toggle('rdy',!!o.rdy);const t=o.title||'';if(b.dataset.tip!==t){b.dataset.tip=t;b.setAttribute('aria-label',[b.dataset.nm,b.dataset.desc,t].filter(Boolean).join('. '));}if(CTIP.b===b)ctipFill(b);}
const CTIP={el:null,b:null,hideT:0,lp:null,eat:0};
function ctipEl(){if(!CTIP.el){const d=document.createElement('div');d.id='ctip';d.hidden=true;d.setAttribute('role','tooltip');document.body.append(d);CTIP.el=d;}return CTIP.el;}
function ctipFill(b){const d=ctipEl();d.innerHTML='';const n=document.createElement('b');n.textContent=b.dataset.nm||b.querySelector('.n').textContent;const c=document.createElement('span');c.className='tc';c.textContent=[b.querySelector('.c').textContent,b.querySelector('.q').textContent?'queued '+b.querySelector('.q').textContent:''].filter(Boolean).join(' · ');d.append(n,c);
  if(b.dataset.desc){const s=document.createElement('span');s.textContent=b.dataset.desc;d.append(s);}if(b.dataset.tip){const s=document.createElement('span');s.className='tw';s.textContent=TOUCHUI?b.dataset.tip.replace(/Right-click/g,'Tap').replace(/right-click/g,'tap'):leftOrders()?b.dataset.tip.replace(/Right-click/g,'Click').replace(/right-click/g,'click'):b.dataset.tip;d.append(s);}}
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
function updateUI(){if(!G)return;renderSquads();renderAllies();const T=G.teams[ME];sbPanel();$('facname').textContent=T.F.name;$('facname').style.color=T.color;$('credits').textContent=G.sandbox&&ME===0?(innerWidth<561?'∞':'∞ Unlimited'):'$'+Math.floor(T.credits).toLocaleString();
  for(const k of BUILD_ORDER){const s=bstats(T.fac,k),ok=reqMet(ME,k);if(!bldAllowed(T.fac,k)){setBtn('b_'+k,{dis:true,cost:'Not available',title:'This faction has no air force'});continue;}const lim=s.limit&&G.ents.filter(e=>!e.dead&&e.isB&&e.team===ME&&e.kind===k).length>=s.limit;setBtn('b_'+k,{dis:!ok||T.credits<s.cost||lim,cost:lim?'Max '+s.limit:'$'+s.cost,on:G.place===k,title:ok?(STRUCT[k].desc||(STRUCT[k].shore?'Place on the shoreline':'')):`Requires ${STRUCT[STRUCT[k].req].name}`});}
  for(const k of allUnits(T.fac)){const s=stats(T.fac,k),q=T.q[s.from]||[],n=q.filter(x=>x.kind===k).length,has=done(ME,s.from);const first=q[0]&&q[0].kind===k?(q[0].p!=null?q[0].p:q[0].t/prodTime(T,s)):0;
    const lk=specLock(T,k);setBtn('u_'+k,{dis:lk||!has||(T.credits<s.cost&&!n),cost:lk?`General rank ${SPEC_RANK}`:k===T.F.special?'$'+s.cost+(T.rank>=6?' · Elite':T.rank>=4?' · Veteran':''):'$'+s.cost,q:n?'×'+n:'',p:first,title:(lk?`Unlocks at general rank ${SPEC_RANK}; gets Veteran (+20%) at rank 4 and Elite (+40%) at rank 6. `:'')+(has?'':`Requires ${STRUCT[s.from].name}. `)+(k===T.F.special&&SPECIAL_TIP[k]?SPECIAL_TIP[k](s)+' ':'')+(COUNTER[k]||COUNTER[s.cls]||'')});}
  for(const k of upgList(T.fac)){const U=UPG[k],r=T.rq[U.at],mine=r&&r.key===k;setBtn('g_'+k,{dis:T.upg[k]||!done(ME,U.at)||(!!r&&!mine)||T.credits<U.cost&&!mine,done:T.upg[k],cost:T.upg[k]?'Researched':mine?'Researching…':'$'+U.cost,p:mine?r.t/U.time:0,title:done(ME,U.at)?'':`Requires ${STRUCT[U.at].name}`});}
  const pts=T.rank-T.spent;for(const k in POWERS){const P=powInfo(k,T.fac),w=T.pw[k];const lv=w?(w.lv||1):0;setBtn('p_'+k,{dis:w?(P.passive||w.cd>0):pts<1,done:!!w,on:G.aim===k,cost:w?('Lv '+lv+' · '+(P.passive?'Active':w.cd>0?`Ready in ${Math.ceil(w.cd)}s`:(P.self?'Ready · click to use':'Ready · click, then pick a spot'))):`Unlock · 1 point`});
    {const b=$('pu_'+k);if(b){const c=lv>=1&&lv<3?lv+1:0;const dv=c?'':'none';if(b.style.display!==dv){b.style.display=dv;if(c)fitBtnNames();}if(c)setBtn('pu_'+k,{dis:pts<c,cost:`To level ${lv+1} · ${c} points`});}}}
  const dot=$('pdot');const tb=document.querySelector('.tabs button[data-tab="pow"]');if(tb){let d=tb.querySelector('.dot');if(pts>0&&!d){d=document.createElement('span');d.className='dot';tb.append(d);}else if(pts<=0&&d)d.remove();}
  const up=done(ME,'uplink'),f=T.charge/T.sup.charge,rem=Math.max(0,Math.ceil(T.sup.charge-T.charge));$('supname').textContent=T.sup.name;$('side').classList.toggle('hasUp',!!up);$('supbar').style.width=(up?f*100:0)+'%';
  $('supt').textContent=!up?'needs Strike Center':f>=1?'READY':`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;$('supbtn').disabled=!(up&&f>=1);
  const nx=RANKS[T.rank]||null,pr=RANKS[T.rank-1];$('rankname').textContent=`General rank ${T.rank}`+(pts>0?` · ${pts} point${pts>1?'s':''} to spend`:'');$('rankbar').style.width=(nx?Math.min(1,(T.gxp-pr)/(nx-pr))*100:100)+'%';$('rankt').textContent=nx?`${T.gxp}/${nx} XP`:'Max rank';
  const md=$('mode'),mdSet=v=>{if(TOUCHUI)md.dataset.d=v;else md.textContent=v;};if(G.place){md.hidden=false;mdSet(`Place ${STRUCT[G.place].name}`+(STRUCT[G.place].shore?' on the shore':'')+' · a Construction Vehicle will drive here and build it'+(stdMouse()?' · Esc cancels':' · right-click or Esc cancels'));}else if(G.aim){md.hidden=false;mdSet(`Choose a target for ${G.aim==='sup'?T.sup.name:powInfo(G.aim,G.teams[ME].fac).name}`);}else if(G.amove){md.hidden=false;mdSet('Attack-move: click a destination');}else if(G.defm){md.hidden=false;mdSet('Defend area: click the spot to hold');}else md.hidden=true;if(TOUCHUI)touchHud(md);
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
  else if(leftOrders()&&tip.textContent)tip.textContent=tip.textContent.replace(/Right-click/g,'Click').replace(/right-click/g,'click');
  el.append(b,sp);if(tip.textContent)el.append(tip);
  if(s.some(u=>!u.isB&&u.team===ME&&!u.s.noAttack)){const r=document.createElement('div');r.className='cmdrow';const bd=document.createElement('button');bd.textContent=(s.some(u=>u.defend)?'✓ Defending · ':'')+'Defend area (G)';bd.onclick=()=>{G.defm=!G.defm;G.amove=false;updateUI();};const ba=document.createElement('button');ba.textContent='⚔ Attack (F)';ba.title='Advance to the spot you click and fight everything on the way';ba.onclick=()=>{G.amove=!G.amove;G.defm=false;updateUI();};if(G.amove){ba.classList.add('on');ba.textContent=TOUCHUI?'⚔ Attack: tap map…':'⚔ Attack: click map…';}bd.textContent=G.defm?(TOUCHUI?'🛡 Defend: tap map…':'🛡 Defend: click map…'):'🛡 '+bd.textContent;if(G.defm)bd.classList.add('on');bd.title='Hold the spot you click: engage anything that comes near it, then return';const bs=document.createElement('button');bs.textContent='Stop (X)';bs.onclick=()=>{doAct({t:'stop',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});};const br=document.createElement('button');br.textContent=s.some(u=>u.retreat)?'↩ Retreating…':'↩ Retreat (R)';br.title='Run back to the nearest HQ, barracks or factory: a bit faster and harder to hit, no stopping to fight';br.onclick=()=>{doAct({t:'ret',ids:s.filter(u=>!u.isB&&u.team===ME).map(u=>u.id)});speak(2);};r.append(ba,bd,bs,br);el.append(r);}
  {const ap=$('app'),o=!!el.querySelector('.cmdrow');if(ap.classList.contains('orders')!==o)ap.classList.toggle('orders',o);}
  if(s.length===1&&!s[0].isB&&s[0].s.cap&&s[0].team===ME){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';const n=MODE==='client'?'':` (${cargoLoad(s[0])}/${s[0].s.cap})`;ub.textContent='Unload troops here'+n;const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='garrison'&&s[0].team===ME){const c=civAtXYAny(s[0].x,s[0].y),n=MODE==='client'?(s[0].occN|0):(c?c.occ.length:0),cap=MODE==='client'?(s[0].capN|0):(c?c.cap:0);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>Troops inside: '+n+' / '+cap+'</b><br>Safe inside, firing out at 20% longer range. Shells, rockets and tank guns can bring the building down.';el.append(d);const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring troops out';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'ungar',tid});};el.append(ub);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1){const n=MODE==='client'?(T.tunN|0):T.tun.length,K=MODE==='client'?(T.tunK||{}):tunKinds(T);const d=document.createElement('div');d.className='tunlist';d.innerHTML='<b>In the tunnel network: '+n+' / '+TUN_CAP+'</b>'+(n?'<br>'+Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+' × '+((()=>{try{return stats(T.fac,k).name}catch(_){return k}})())).join('<br>'):'<br>Empty. '+(TOUCHUI?'Tap':leftOrders()?'Click':'Right-click')+' a tunnel with units selected to send them in.');el.append(d);}
  if(s.length===1&&s[0].isB&&s[0].kind==='tunnel'&&s[0].team===ME&&s[0].built>=1&&(MODE==='client'?T.tunN:T.tun.length)){const ub=document.createElement('button');ub.className='btn wide';ub.style.marginTop='6px';ub.textContent='Bring units out here';const tid=s[0].id;ub.onpointerdown=ev=>{ev.preventDefault();doAct({t:'unl',tid});};el.append(ub);}
  const net=$('net');if(MODE!=='single'){net.hidden=false;net.innerHTML=`<b>●</b> Online · vs ${vsText()}`;}else net.hidden=true;}
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
    if(!t){const oi=G.oil.findIndex(o=>!o.dead&&!ally(o.owner,ME)&&o.owner>=0&&Math.hypot(o.x-w.x,o.y-w.y)<38);if(oi>=0){doAct({t:'atkOil',ids,fi:oi});speak(2);markT(G.oil[oi].x,G.oil[oi].y,30);return true;}}
    if(t&&t.team===ME&&!t.isB&&t.s.cap&&units.some(u=>u!==t&&canBoard(t,u))){doAct({t:'board',ids:units.filter(u=>u!==t&&canBoard(t,u)).map(u=>u.id),tid:t.id});speak(1);markT(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.kind==='tunnel'&&t.built>=1&&units.some(u=>u.s.dom==='ground'&&u.kind!=='harv')){doAct({t:'tun',ids:units.filter(u=>u.s.dom==='ground'&&u.kind!=='harv').map(u=>u.id),tid:t.id});speak(1);markT(t.x,t.y,30);return true;}
    if(t&&t.team===ME&&t.isB&&t.built<1&&units.some(u=>u.kind==='dozer')){doAct({t:'bldGo',ids:units.filter(u=>u.kind==='dozer').map(u=>u.id),tid:t.id});speak(1);markT(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)&&t.aband&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){const inf=units.filter(u=>isInf(u.s)&&!u.s.noAttack);doAct({t:'go',ids:inf.map(u=>u.id),x:t.x,y:t.y,mode:'move'});const rest=units.filter(u=>!inf.includes(u));if(rest.length)doAct({t:'go',ids:rest.map(u=>u.id),x:t.x,y:t.y,mode:'amove'});speak(1);markT(t.x,t.y,30);pushLog('Infantry moving to capture the abandoned vehicle.');return true;}
    if(t&&ally(t.team,ME)&&t.aband&&!t.isB&&units.some(u=>isInf(u.s)&&!u.s.noAttack)){doAct({t:'go',ids:units.filter(u=>isInf(u.s)&&!u.s.noAttack).map(u=>u.id),x:t.x,y:t.y,mode:'move'});speak(1);markT(t.x,t.y,30);return true;}
    if(t&&!ally(t.team,ME)){doAct({t:'atk',ids,tid:t.id});speak(2);markT(t.x,t.y,24);return true;}
    {const c=(!t||(t.kind==='garrison'&&ally(t.team,ME)))?(t&&t.kind==='garrison'?civAtXYAny(t.x,t.y):civUnder(mouse.x,mouse.y,w)):null;
     if(c&&!c.dead){const inf=units.filter(u=>canGarrison(u));const rest=units.filter(u=>!canGarrison(u)&&u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker');
       if(inf.length){doAct({t:'gar',ids:inf.map(u=>u.id),ci:c.i});speak(1);markT(c.x,c.y,30);if(!rest.length)return true;}
       if(rest.length&&!(t&&t.kind==='garrison')){doAct({t:'atkCiv',ids:rest.map(u=>u.id),ci:c.i});speak(2);markT(c.x,c.y,24);return true;}
       if(inf.length)return true;}}
    const fi=fieldAt(w);if(fi>=0&&units.some(u=>u.kind==='harv')){doAct({t:'fld',ids,fi});const rest=units.filter(u=>u.kind!=='harv').map(u=>u.id);if(rest.length)doAct({t:'go',ids:rest,x:w.x,y:w.y,mode:'move'});return true;}
    doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0,q:G.qShift?1:0});speak(1);mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:G.qShift?0xe3b341:0x74d08f});return true;
}
// Controls (mouse), default "Standard" scheme (Abdullah, 2026-10-28):
//   LEFT selects - click a unit (Shift+click adds/removes, double-click selects all of that type on screen, drag a box
//   to select units); a click on empty ground deselects. With a production building selected, a left click on the
//   ground sets its rally point. With units selected, Ctrl+click force-fires and Alt+click adds a waypoint. A building
//   or power chosen from the sidebar is placed or aimed with a left click.
//   RIGHT orders - click the ground to move, an enemy to attack, your own transport / tunnel / building to go in
//   (Ctrl+right-click force-fires); it first cancels placement or power targeting. Right-drag with units selected draws
//   the infantry line formation; with nothing selected it does nothing.
//   F then click attack-moves, G then click guards an area, X stops, R retreats (A no longer attack-moves anywhere).
// Settings > Mouse lets each function be chosen (saved in SET): mLG left-click on the ground with units selected
// (move | desel), mRC right-click (cancel = deselect & cancel | order = move & attack), mRDU right-drag with units
// (line | scroll), mRDN right-drag with nothing selected (scroll | box | none), mRS rapid-scroll speed, mCur contextual
// cursor, mPing order markers, mLock keep the mouse inside the game window (pointer lock, see MLOCK). Two presets:
// Standard (default) and Generals (left-click gives orders, right-click deselects / cancels, right-drag scrolls).
// Saved settings from before 2026-10-29 are moved to Standard once (ctl2). mAK is always 'f' now (F attack-move, X stop).
// Touch and pen have no right button, so a tap selects or orders as before. The cursor shows what a click will do.
let lastR={t:0,id:0},rDown=0;
const MDEF={mLG:'desel',mRC:'order',mRDU:'line',mRDN:'none',mAK:'f',mRS:100,mCur:1,mPing:1,mLock:1};
const MPRE={std:{mLG:'desel',mRC:'order',mRDU:'line',mRDN:'none'},gen:{mLG:'move',mRC:'cancel',mRDU:'line',mRDN:'scroll'}};
if(SET.ctl2!==1){Object.assign(SET,MPRE.std);SET.ctl2=1;try{saveSet();}catch(_){}}for(const k in MDEF)if(SET[k]==null)SET[k]=MDEF[k];SET.mAK='f';delete SET.alt;
function mPreset(){for(const p in MPRE)if(Object.keys(MPRE[p]).every(k=>SET[k]===MPRE[p][k]))return p;return 'custom';}
function stdMouse(){return mPreset()==='std';}
function leftOrders(){return SET.mLG==='move';}
function rightOrders(){return SET.mRC==='order';}
// order markers (ground pings for move / attack orders), Settings > Mouse > Order markers
function mark(o){if(SET.mPing!==0)PINGS.push(o);}
function markT(x,y,r){if(SET.mPing!==0)FXH.ping(x,y,r);}
const MODK={ctrl:false,alt:false,shift:false};
function selfSel(){return G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);}
function prodSel(){return G.sel.some(b=>b.isB&&b.team===ME&&!b.dead&&CATS.includes(b.kind)&&b.built>=1);}
function selectClick(t,shift){if(t&&t.team===ME){if(shift&&!t.isB){const i=G.sel.indexOf(t);i>=0?G.sel.splice(i,1):G.sel.push(t);}else G.sel=[t];}else if(t&&!shift)G.sel=[t];else if(!shift)G.sel=[];}
// a click on one of your own units/buildings that the selection can use (board, enter, garrison, build, re-crew) instead of selecting it
function helpOn(t,sel){return !!t&&t.team===ME&&((t.isB&&((t.built<1&&sel.some(u=>u.kind==='dozer'&&u.team===ME&&!u.dead))||(t.kind==='tunnel'&&t.built>=1&&sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&u.s.dom==='ground'))))||(!t.isB&&t.s&&t.s.cap&&sel.some(u=>u!==t&&!u.isB&&canBoard(t,u)))||(t.kind==='garrison'&&sel.some(u=>u.team===ME&&canGarrison(u)))||(!t.isB&&t.aband&&sel.some(u=>!u.isB&&u.team===ME&&isInf(u.s)&&!u.s.noAttack)));}
function oilAt(w,neutralToo){return G.oil.findIndex(o=>!o.dead&&!ally(o.owner,ME)&&(neutralToo||o.owner>=0)&&Math.hypot(o.x-w.x,o.y-w.y)<38);}
// nowhere any selected unit can go (water for tanks, cliffs and mountains for everything on the ground)
function noGo(units,w){return units.length>0&&units.every(u=>!passXY(u.s.dom,w.x,w.y));}
// Ctrl+click: fire on what is under the cursor even if the unit would not pick it. The battle supports forcing an attack on
// enemies, enemy or neutral oil derricks and empty city buildings; firing at the ground or at friendly units is not available.
function forceTarget(t,w){if(t&&!t.dead)return ally(t.team,ME)?null:{t:'atk',tid:t.id,x:t.x,y:t.y};
  const oi=oilAt(w,true);if(oi>=0)return{t:'atkOil',fi:oi,x:G.oil[oi].x,y:G.oil[oi].y};
  const c=civUnder(mouse.x,mouse.y,w);if(c&&!c.dead){if(c.g&&!c.g.dead)return ally(c.g.team,ME)?null:{t:'atk',tid:c.g.id,x:c.x,y:c.y};return{t:'atkCiv',ci:c.i,x:c.x,y:c.y};}return null;}
function forceFire(w,t,units){const f=forceTarget(t,w);if(!f){pushLog(t?'Force-fire on your own or allied units is not available.':'Force-fire on empty ground is not available - Ctrl+click an enemy, a derrick or a building.','w');try{sfxUI(220);}catch(_){}return false;}
  const ids=units.map(u=>u.id),a={t:f.t,ids};if(f.tid!=null)a.tid=f.tid;if(f.fi!=null)a.fi=f.fi;if(f.ci!=null)a.ci=f.ci;doAct(a);speak(2);markT(f.x,f.y,24);return true;}
// Alt+click: add a waypoint (units finish their current move first)
function waypoint(w,units){if(noGo(units,w)){try{sfxUI(220);}catch(_){}return false;}doAct({t:'go',ids:units.map(u=>u.id),x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0,q:1});speak(1);mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xe3b341});return true;}
/* ---------- contextual cursor ---------- */
// small cursors drawn once on a canvas (no image files); `CURS[key]` is a ready CSS cursor value
const CURD={
  sel:[3,2,'default',c=>{c.beginPath();c.moveTo(3,2);c.lineTo(3,24);c.lineTo(9,19);c.lineTo(13,28);c.lineTo(17,26);c.lineTo(13,17.5);c.lineTo(21,17.5);c.closePath();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#000';c.stroke();c.fillStyle='#e9f5ec';c.fill();
    c.lineWidth=3.4;c.strokeStyle='#000';const br=()=>{c.beginPath();c.moveTo(20,23);c.lineTo(20,29);c.lineTo(26,29);c.moveTo(30,23);c.lineTo(30,29);c.lineTo(24,29);c.stroke();};br();c.lineWidth=1.6;c.strokeStyle='#7be08f';br();}],
  arrow:[3,2,'default',c=>{c.beginPath();c.moveTo(3,2);c.lineTo(3,24);c.lineTo(9,19);c.lineTo(13,28);c.lineTo(17,26);c.lineTo(13,17.5);c.lineTo(21,17.5);c.closePath();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#000';c.stroke();c.fillStyle='#e9f5ec';c.fill();}],
  move:[16,27,'pointer',c=>{const arrow=()=>{c.beginPath();c.moveTo(16,23);c.lineTo(25,12);c.lineTo(19.5,12);c.lineTo(19.5,3);c.lineTo(12.5,3);c.lineTo(12.5,12);c.lineTo(7,12);c.closePath();};arrow();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#04140a';c.stroke();c.fillStyle='#7be08f';c.fill();
    c.beginPath();c.ellipse(16,27,11,3.6,0,0,7);c.lineWidth=3.6;c.strokeStyle='#04140a';c.stroke();c.lineWidth=1.8;c.strokeStyle='#7be08f';c.stroke();}],
  attack:[16,16,'crosshair',c=>ring(c,'#ff4a3a',false)],
  force:[16,16,'crosshair',c=>{ring(c,'#ffb02e',true);c.font='bold 9px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#000';c.strokeText('F',26,30);c.fillStyle='#ffb02e';c.fillText('F',26,30);}],
  amove:[16,16,'crosshair',c=>{ring(c,'#ff4a3a',false);c.beginPath();c.moveTo(21,3);c.lineTo(30,3);c.lineTo(30,12);c.moveTo(30,3);c.lineTo(22,11);c.lineCap='round';c.lineWidth=4;c.strokeStyle='#000';c.stroke();c.lineWidth=2;c.strokeStyle='#ffd166';c.stroke();}],
  nogo:[16,16,'not-allowed',c=>{c.beginPath();c.arc(16,16,11,0,7);c.moveTo(8.2,8.2);c.lineTo(23.8,23.8);c.lineWidth=6;c.strokeStyle='#000';c.stroke();c.lineWidth=3.4;c.strokeStyle='#ff3b30';c.stroke();}],
  guard:[16,16,'crosshair',c=>{c.beginPath();c.moveTo(16,3);c.lineTo(27,7);c.quadraticCurveTo(27,22,16,29);c.quadraticCurveTo(5,22,5,7);c.closePath();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#06101c';c.stroke();c.fillStyle='#6fb2ff';c.fill();c.beginPath();c.moveTo(16,8);c.lineTo(16,24);c.moveTo(10,14);c.lineTo(22,14);c.lineWidth=2;c.strokeStyle='#06101c';c.stroke();}],
  rally:[5,30,'pointer',c=>flag(c,'#7be08f')],
  way:[5,30,'pointer',c=>{flag(c,'#e3b341');c.fillStyle='#000';c.beginPath();c.arc(24,26,4.6,0,7);c.fill();c.fillStyle='#e3b341';c.beginPath();c.arc(24,26,3,0,7);c.fill();c.fillStyle='#000';c.beginPath();c.arc(14,29,2.6,0,7);c.fill();c.fillStyle='#e3b341';c.beginPath();c.arc(14,29,1.5,0,7);c.fill();}],
  capture:[5,30,'pointer',c=>flag(c,'#ffd166')],
  enter:[16,16,'pointer',c=>{c.beginPath();c.moveTo(4,15);c.lineTo(16,4);c.lineTo(28,15);c.lineTo(28,29);c.lineTo(4,29);c.closePath();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#06101c';c.stroke();c.fillStyle='#6fb2ff';c.fill();c.fillStyle='#06101c';c.fillRect(12,19,8,10);c.beginPath();c.moveTo(16,11);c.lineTo(16,18);c.moveTo(12.5,14.5);c.lineTo(16,18);c.lineTo(19.5,14.5);c.lineWidth=2;c.stroke();}],
  place:[16,16,'copy',c=>{c.lineWidth=3.6;c.strokeStyle='#000';c.strokeRect(6,6,20,20);c.lineWidth=1.8;c.strokeStyle='#ffd166';c.setLineDash([4,3]);c.strokeRect(6,6,20,20);c.setLineDash([]);c.beginPath();c.moveTo(16,10);c.lineTo(16,22);c.moveTo(10,16);c.lineTo(22,16);c.lineWidth=4;c.strokeStyle='#000';c.stroke();c.lineWidth=2;c.strokeStyle='#ffd166';c.stroke();}],
  aim:[16,16,'crosshair',c=>{for(const [r,w] of [[13,2],[7,2]]){c.beginPath();c.arc(16,16,r,0,7);c.lineWidth=w+2.2;c.strokeStyle='#000';c.stroke();c.lineWidth=w;c.strokeStyle='#ff6a3a';c.stroke();}c.fillStyle='#000';c.fillRect(14,14,4,4);c.fillStyle='#ff6a3a';c.fillRect(15,15,2,2);}],
  scroll:[16,16,'all-scroll',c=>{const tri=(x,y,dx,dy)=>{c.beginPath();c.moveTo(x+dx*7,y+dy*7);c.lineTo(x-dy*6,y+dx*6);c.lineTo(x+dy*6,y-dx*6);c.closePath();c.lineWidth=2.6;c.strokeStyle='#000';c.stroke();c.fillStyle='#f2f5f3';c.fill();};tri(16,7,0,-1);tri(16,25,0,1);tri(7,16,-1,0);tri(25,16,1,0);c.fillStyle='#000';c.beginPath();c.arc(16,16,3.4,0,7);c.fill();c.fillStyle='#f2f5f3';c.beginPath();c.arc(16,16,2,0,7);c.fill();}],
  line:[16,16,'crosshair',c=>{c.beginPath();c.moveTo(3,24);c.lineTo(29,8);c.lineWidth=4.4;c.strokeStyle='#000';c.stroke();c.lineWidth=2.2;c.strokeStyle='#7be08f';c.stroke();for(const [x,y] of [[6,22],[12,18.3],[18,14.6],[24,11]]){c.beginPath();c.arc(x,y,3.2,0,7);c.fillStyle='#000';c.fill();c.beginPath();c.arc(x,y,2,0,7);c.fillStyle='#d6f7de';c.fill();}}]};
function ring(c,col,dot){const g=()=>{c.beginPath();c.arc(16,16,8,0,7);c.moveTo(16,2);c.lineTo(16,9);c.moveTo(16,23);c.lineTo(16,30);c.moveTo(2,16);c.lineTo(9,16);c.moveTo(23,16);c.lineTo(30,16);};g();c.lineWidth=4.4;c.strokeStyle='#000';c.stroke();g();c.lineWidth=2.2;c.strokeStyle=col;c.stroke();if(dot){c.fillStyle='#000';c.beginPath();c.arc(16,16,3,0,7);c.fill();c.fillStyle=col;c.beginPath();c.arc(16,16,1.8,0,7);c.fill();}}
function flag(c,col){c.beginPath();c.moveTo(5,30);c.lineTo(5,3);c.lineWidth=4;c.strokeStyle='#000';c.stroke();c.lineWidth=2;c.strokeStyle='#d9d9d2';c.stroke();c.beginPath();c.moveTo(6,4);c.lineTo(25,4);c.lineTo(20,10);c.lineTo(25,16);c.lineTo(6,16);c.closePath();c.lineJoin='round';c.lineWidth=2.4;c.strokeStyle='#000';c.stroke();c.fillStyle=col;c.fill();}
const CURS={},CURIMG={};
function curCss(k){if(!k||!CURD[k])return '';if(!CURS[k]){const [hx,hy,fb,draw]=CURD[k];try{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');draw(x);CURIMG[k]=c.toDataURL('image/png');CURS[k]=`url("${CURIMG[k]}") ${hx} ${hy}, ${fb}`;}catch(e){CURS[k]=fb;}}return CURS[k];}
// what a click on the battlefield would do right now (left click in the Generals scheme, right click in the alternate one)
function cursorIntent(){if(!G||G.over)return '';const lo=leftOrders(),ro=rightOrders();
  if(RDRAG&&RDRAG.moved)return !RDRAG.gen||RDRAG.line?'line':RDRAG.mode==='scroll'?'scroll':'';
  if(G.place)return 'place';if(G.aim)return 'aim';if(G.amove)return 'amove';if(G.defm)return 'guard';
  const units=selfSel(),t=pickAt(mouse.x,mouse.y,false);
  if(!units.length){if(t)return t.team===ME?'sel':'';if((lo||ro)&&prodSel())return 'rally';return '';}
  if(!lo&&(MODK.ctrl||MODK.alt)){const w=screenToWorld(mouse.x,mouse.y);if(MODK.ctrl)return w&&forceTarget(t,w)?'force':'nogo';return w&&!noGo(units,w)?'way':'nogo';}
  if(!lo&&!ro)return t&&t.team===ME?'sel':'';
  const w=screenToWorld(mouse.x,mouse.y);
  if(lo&&MODK.ctrl)return w&&forceTarget(t,w)?'force':'nogo';
  if(lo&&MODK.alt)return w&&!noGo(units,w)?'way':'nogo';
  if(t&&t.team===ME)return helpOn(t,units)?(t.aband?'capture':'enter'):'sel';
  if(t&&!ally(t.team,ME))return t.aband&&units.some(u=>isInf(u.s))?'capture':'attack';
  if(t&&t.aband&&!t.isB&&units.some(u=>isInf(u.s)))return 'capture';
  if(!w)return '';
  return t?'move':groundIntent(units,w);}
// empty ground (or a city building / derrick / supply field) under the cursor with units selected
function groundIntent(units,w){const c=civUnder(mouse.x,mouse.y,w);if(c&&!c.dead&&(!c.g||ally(c.g.team,ME))){if(units.some(u=>canGarrison(u)))return 'enter';if(!c.g&&units.some(u=>u.kind!=='harv'&&u.kind!=='dozer'&&u.kind!=='hacker'))return 'attack';}
  if(oilAt(w,false)>=0)return 'attack';if(fieldAt(w)>=0&&units.some(u=>u.kind==='harv'))return 'move';
  return noGo(units,w)?'nogo':'move';}
const CURST={k:null,t:0,x:-1,y:-1,m:''};
function cursorTick(force){const now=performance.now();if(!force&&now-CURST.t<50)return;
  if(!G||G.over||!mouse.in||LASTPT==='touch'||SET.mCur===0){if(CURST.k!==''){CURST.k='';cv.style.cursor='';cv.dataset.cur='';}return;}
  const m=(G.place||'')+(G.aim||'')+(+!!G.amove)+(+!!G.defm)+(+MODK.ctrl)+(+MODK.alt)+G.sel.length+(RDRAG?(RDRAG.moved?2:1):0);
  if(!force&&mouse.x===CURST.x&&mouse.y===CURST.y&&m===CURST.m&&now-CURST.t<250)return;
  CURST.t=now;CURST.x=mouse.x;CURST.y=mouse.y;CURST.m=m;let k='';try{k=cursorIntent();}catch(_){k='';}
  if(k!==CURST.k){CURST.k=k;cv.style.cursor=curCss(k);cv.dataset.cur=k;}}
setInterval(()=>cursorTick(false),50);
function defendAt(w){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);G.defm=false;if(!ids.length)return;doAct({t:'def',ids,x:w.x,y:w.y});speak(1);mark({x:w.x,y:w.y,r:300,t:0,d:1.1,c:0x6fb2ff});pushLog('Units moving to defend the area.');}
function rightPress(e){const w=screenToWorld(mouse.x,mouse.y);if(!w)return false;rDown=performance.now();if(G.defm){defendAt(w);return false;}
  if(G.place||G.aim){G.place=null;G.aim=null;return false;}
  if(G.amove){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return false;}
  return true;}
function orderClick(sh){if(!G||G.over)return;G.qShift=!!sh;const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place||G.aim){G.place=null;G.aim=null;updateUI();return;}if(G.defm){defendAt(w);return;}
  const units=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);
  if(G.amove&&units.length){const ids=units.filter(u=>u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});G.amove=false;return;}
  G.amove=false;const bsel=!units.length&&G.sel.some(b=>b.isB&&b.team===ME);if(!units.length&&!bsel)return;
  const t=pickAt(mouse.x,mouse.y,false);if(units.length&&MODK.ctrl){forceFire(w,t,units);updateUI();return;}if(issueCmd(w,t,bsel))updateUI();}
// Generals scheme, a left click with the mouse: orders for the selection, or a rally point for a production building.
// Returns false when the click should simply select what is under the cursor.
function genClick(d,t){const units=selfSel(),w=screenToWorld(mouse.x,mouse.y);if(!w)return false;
  if(units.length){if(d.ctrl){forceFire(w,t,units);updateUI();return true;}
    if(d.alt){waypoint(w,units);updateUI();return true;}
    if(t&&t.team===ME&&!helpOn(t,units))return false;
    if(!t&&groundIntent(units,w)==='nogo'){try{sfxUI(220);}catch(_){}return true;}
    G.qShift=!!d.shift;const ok=issueCmd(w,t,false);G.qShift=false;if(ok){updateUI();return true;}return false;}
  if(!t&&!d.shift&&prodSel()){issueCmd(w,null,true);updateUI();return true;}
  return false;}
// Standard scheme, a left click with the mouse: Ctrl+click force-fires and Alt+click adds a waypoint for the selected units;
// with a production building selected, a click on the ground sets its rally point. False = just select.
function selClick(d,t){const units=selfSel(),w=screenToWorld(mouse.x,mouse.y);if(!w)return false;
  if(units.length&&d.ctrl){forceFire(w,t,units);updateUI();return true;}
  if(units.length&&d.alt){waypoint(w,units);updateUI();return true;}
  if(!units.length&&!t&&!d.shift&&prodSel()){issueCmd(w,null,true);updateUI();return true;}
  return false;}
function rightRelease(d){if(!G)return;
  if(d.box){const x0=Math.min(d.x0,mouse.x),x1=Math.max(d.x0,mouse.x),y0=Math.min(d.y0,mouse.y),y1=Math.max(d.y0,mouse.y);
    const got=G.ents.filter(u=>u.team===ME&&!u.isB&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u)+4,u.y);return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;})());G.sel=d.shift?[...new Set([...G.sel,...got])]:got;}
  else{const t=pickAt(mouse.x,mouse.y,false),now=performance.now();
    if(t&&t.team===ME&&!t.isB&&SET.dbl>0&&lastR.id===t.id&&now-lastR.t<SET.dbl&&!d.ctrl&&!d.alt){G.sel=G.ents.filter(u=>u.team===ME&&u.kind===t.kind&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u),u.y);return p.x>0&&p.y>0&&p.x<VW&&p.y<VH;})());lastR={t:0,id:0};updateUI();return;}
    lastR={t:now,id:t?t.id:0};
    const mine=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead),bsel=!mine&&G.sel.some(b=>b.isB&&b.team===ME);
    const dzHelp=t&&t.team===ME&&t.isB&&((t.built<1&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME&&!u.dead))||(t.kind==='tunnel'&&t.built>=1&&G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&u.s.dom==='ground')))||(t&&t.team===ME&&!t.isB&&t.s&&t.s.cap&&G.sel.some(u=>u!==t&&!u.isB&&canBoard(t,u)))||(t&&t.kind==='garrison'&&t.team===ME&&G.sel.some(u=>u.team===ME&&canGarrison(u)));
    if(d.pt==='mouse'&&(leftOrders()?genClick(d,t):selClick(d,t)))return;
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
// Generals scheme, right button: a click without dragging cancels the current mode (placement, power, attack-move,
// guard) or, if there is none, deselects everything. Right-drag with units selected draws the line formation.
function rightCancel(){if(!G||G.over)return;if(G.place||G.aim||G.amove||G.defm){G.place=null;G.aim=null;G.amove=false;G.defm=false;}else G.sel=[];updateUI();}
function rightClickAct(sh){if(rightOrders())orderClick(sh);else rightCancel();}
function lineOrder(r){const w1=screenToWorld(mouse.x,mouse.y);const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(!w1||!ids.length)return;doAct({t:'line',ids,x:r.w0.x,y:r.w0.y,x2:w1.x,y2:w1.y,mode:r.am?'amove':'move'});G.amove=false;speak(1);mark({x:(r.w0.x+w1.x)/2,y:(r.w0.y+w1.y)/2,r:16,t:0,d:.4,c:0x74d08f});updateUI();}
let mpan=null,RDRAG=null;cv.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});cv.addEventListener('pointerdown',e=>{if(!G||G.over)return;LASTPT=e.pointerType||'mouse';hintDev(LASTPT);if(LASTPT==='touch'){if(!TOUCHUI)touchUI();PICKMIN=18;if(touchDown(e))return;}else if(LASTPT==='mouse')PICKMIN=10;mpos(e);if(e.button===1&&SET.mpan){e.preventDefault();mpan={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(e.button===2){e.preventDefault();const own=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);const w0=screenToWorld(mouse.x,mouse.y);if(LASTPT==='mouse'){let mode=own.length?SET.mRDU:SET.mRDN;if(mode==='line'&&!(own.length>=(rightOrders()?2:1)&&w0&&!G.place&&!G.aim&&!G.defm))mode='none';try{cv.setPointerCapture(e.pointerId);}catch(_){}if(mode==='box'){drag={x0:mouse.x,y0:mouse.y,box:false,shift:e.shiftKey,id:e.pointerId,pt:'mouse',rb:1};return;}RDRAG={x0:mouse.x,y0:mouse.y,w0,id:e.pointerId,shift:e.shiftKey,am:G.amove,moved:false,gen:1,mode,line:mode==='line'};return;}if(own.length>=2&&w0&&!G.place&&!G.aim&&!G.defm){RDRAG={x0:mouse.x,y0:mouse.y,w0,id:e.pointerId,shift:e.shiftKey,am:G.amove,moved:false};try{cv.setPointerCapture(e.pointerId);}catch(_){}}else orderClick(e.shiftKey);return;}if(e.button!==0){e.preventDefault();return;}
  const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(G.place||G.aim){placeOrAim(w,e.shiftKey);return;}
  if(!rightPress(e))return;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  drag={x0:mouse.x,y0:mouse.y,box:false,shift:e.shiftKey,ctrl:e.ctrlKey||e.metaKey,alt:e.altKey,id:e.pointerId,pt:e.pointerType||'mouse'};});
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){LASTPT='mouse';mouse.in=true;MODK.ctrl=e.ctrlKey||e.metaKey;MODK.alt=e.altKey;MODK.shift=e.shiftKey;}else if(e.pointerType==='touch'&&touchMove(e))return;mpos(e);if(RDRAG&&e.pointerId===RDRAG.id){if(Math.hypot(mouse.x-RDRAG.x0,mouse.y-RDRAG.y0)>(RDRAG.gen&&!RDRAG.line?(SET.tol||8):22))RDRAG.moved=true;return;}if(mpan&&e.pointerId===mpan.id){const k=cam.dist/700*(SET.scr||100)/100;cam.x-=(e.clientX-mpan.x)*k;cam.y-=(e.clientY-mpan.y)*k*1.4;mpan.x=e.clientX;mpan.y=e.clientY;return;}if(drag&&Math.hypot(mouse.x-drag.x0,mouse.y-drag.y0)>(drag.pt==='touch'?Math.max(SET.tol||8,16):(SET.tol||8)))drag.box=true;});
window.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&touchUp(e))return;if(mpan&&e.pointerId===mpan.id){mpan=null;return;}if(RDRAG&&e.pointerId===RDRAG.id&&RDRAG.gen){const r=RDRAG;RDRAG=null;if(r.moved&&r.line)lineOrder(r);else if(!(r.moved&&r.mode==='scroll'))rightClickAct(r.shift);cursorTick(true);return;}if(RDRAG&&e.pointerId===RDRAG.id){const r=RDRAG;RDRAG=null;const w1=screenToWorld(mouse.x,mouse.y);const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(r.moved&&w1&&ids.length){doAct({t:'line',ids,x:r.w0.x,y:r.w0.y,x2:w1.x,y2:w1.y,mode:r.am?'amove':'move'});G.amove=false;speak(1);mark({x:(r.w0.x+w1.x)/2,y:(r.w0.y+w1.y)/2,r:16,t:0,d:.4,c:0x74d08f});updateUI();}else orderClick(r.shift);return;}if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(d.rb&&!d.box){rightClickAct(d.shift);return;}rightRelease(d);});
window.addEventListener('pointercancel',e=>{touchCancel(e);if(drag&&e.pointerId===drag.id)drag=null;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;MODK.ctrl=e.ctrlKey||e.metaKey||k==='Control'||k==='Meta';MODK.alt=e.altKey||k==='Alt';MODK.shift=e.shiftKey;if(!G||$('menu').hidden===false)return;if(k==='Alt')e.preventDefault();
  const gk=genKeys()&&!e.ctrlKey&&!e.metaKey&&!e.altKey;/* W A S D only scroll the camera in every scheme (Abdullah 2026-10-28): no A attack-move, no S stop (X stops) */
  if(/^Digit[1-5]$/.test(e.code)){const i=+e.code.slice(5);if(e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();sqAssign(i);}else sqSelect(i);}
  if(k==='p'&&!G.over){e.preventDefault();togglePause();return;}
  if(k==='Escape'&&MLOCK.on){MLOCK.escK=performance.now();mlockCancelModes();mlockOff();return;}
  if(k==='Escape'&&menuOpen()){menuOpen(false);return;}
  if(k==='Escape'){if(G.defm){G.defm=false;return;}if(G.paused){togglePause(false);return;}if(!G.place&&!G.aim&&!G.amove&&!G.sel.length&&!G.over){togglePause(true);return;}if(!G.place&&!G.aim&&!G.amove)G.sel=[];G.place=null;G.aim=null;G.amove=false;}
  if(k==='q')G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!['harv','hacker','dozer'].includes(u.kind)&&!u.dead);
  if(k==='f'&&G.sel.some(u=>!u.isB)){G.amove=true;G.defm=false;}if(k==='g'&&G.sel.some(u=>!u.isB&&u.team===ME)){G.defm=true;G.amove=false;}
  if(k==='x'){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length)doAct({t:'stop',ids});}
  if(k==='r'&&!e.ctrlKey&&!e.metaKey){const ids=G.sel.filter(u=>!u.isB&&u.team===ME).map(u=>u.id);if(ids.length){doAct({t:'ret',ids});speak(2);}}
  if(k==='h'){const hq=G.ents.find(b=>b.team===ME&&b.kind==='hq');if(hq)centerOn(hq.x,hq.y);}
  if(k==='='||k==='+'){camTarget();cam.td=Math.max(200,cam.td/1.15);}if(k==='-'||k==='_'){camTarget();cam.td=Math.min(1800,cam.td*1.15);}
  if(k.startsWith('Arrow')||k===' ')e.preventDefault();updateUI();});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;MODK.ctrl=e.ctrlKey||e.metaKey;MODK.alt=e.altKey;MODK.shift=e.shiftKey;if(k==='Alt'&&G&&$('menu').hidden)e.preventDefault();});
window.addEventListener('blur',()=>{MODK.ctrl=MODK.alt=MODK.shift=false;});
// Keys: F arms attack-move, G guard, X stops, R retreats in every mouse scheme; WASD and the arrow keys always scroll
// (A no longer arms attack-move - Abdullah, 2026-10-28).
function genKeys(){return false;}
function mmJump(e){const r=mm.getBoundingClientRect();centerOn((e.clientX-r.left)/r.width*MAPW,(e.clientY-r.top)/r.height*MAPH);}
// Minimap: left-click / tap / drag moves the view there; right-click sends the selected units there.
// Pointer events so it works the same with a mouse, trackpad, touch screen or pen.
let mmDown=null;mm.style.touchAction='none';mm.style.cursor='crosshair';
function mmSend(w){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).map(u=>u.id);if(!ids.length)return false;doAct({t:'go',ids,x:w.x,y:w.y,mode:'move',fm:sqOfSel()>0?1:0});speak(1);mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:0x74d08f});return true;}
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
#settings{background:#080b0a}
#setBody{display:flex;flex-direction:column;gap:14px;overflow-y:auto;min-height:0;flex:1 1 auto;padding-right:6px;overscroll-behavior:contain}
#settings .card>.row:last-child{flex:none;border-top:1px solid rgba(255,255,255,.12);padding:12px 0 2px}
body.touchui #mode{white-space:normal;text-align:left;width:max-content;max-width:calc(100% - 20px);box-sizing:border-box;font-size:12px;letter-spacing:.02em;line-height:1.2;padding:5px;display:flex;align-items:center;gap:6px;z-index:5}
body.touchui #mode>span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;padding-left:4px}
body.touchui #mode[hidden]{display:none}
#mode .mcx{pointer-events:auto;cursor:pointer;flex:none;background:var(--warn);color:#160806;border:0;font:700 13px var(--display);letter-spacing:.04em;text-transform:uppercase;padding:0 8px;min-height:34px}
body.touchui #hint{font-size:12px;color:#c9d4ce;background:rgba(8,11,10,.55);padding:4px 6px;left:6px;right:6px;bottom:6px}
@media (max-width:760px),(max-height:520px){
  #wxchip{top:6px;left:auto;right:6px;transform:none;white-space:normal;text-align:right;max-width:calc(62% - 16px);font-size:10px;padding:3px 7px}
  #net{top:auto;bottom:6px;right:6px;font-size:10px;padding:2px 6px}
}
/* phone bar: command-button names wrap onto two lines instead of ending in "…" (fitBtnNames shrinks the longest) */
@media (max-width:560px),(max-width:760px) and (min-height:521px),(max-height:520px){
  #panel .btn{padding:2px 4px 3px;gap:0}
  #panel .btn .n{white-space:normal;overflow-wrap:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;text-overflow:clip;font-size:11px;line-height:1.05;letter-spacing:-.015em;padding-right:7px}
  #panel .btn .c{font-size:9.5px;line-height:1.05}
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
const HINT_TOUCH='Drag to scroll · pinch to zoom · tap a unit to select it, then tap the ground to move or an enemy to attack · double-tap: all of that type · hold, then drag: box-select (or a battle line with units selected)';
function touchUI(){TOUCHUI=true;HINTDEV='touch';document.body.classList.add('touchui');setHint();try{updateUI();}catch(e){}}
// on touch: the banner says how to place, and tapping it cancels; the long hint steps aside after the opening
function touchHud(md){if(!md.hidden){const t=G.place?`Place ${STRUCT[G.place].name}${STRUCT[G.place].shore?' on the shore':''}: tap a spot (drag scrolls), then ✓ Build`:G.aim?(md.dataset.d||'').replace(/^Choose a target/,'Tap a target')+', then ✓ Fire':(md.dataset.d||'').replace(/click/g,'tap');
    if(md.dataset.t!==t){md.dataset.t=t;md.innerHTML='<span></span><button class="mcx" type="button">✕ Cancel</button>';md.firstChild.textContent=t;}}else md.dataset.t='';
  const h=$('hint');if(h)h.hidden=!md.hidden||G.t>40;}
$('mode').onclick=e=>{if(!G||!e.target.closest('.mcx'))return;G.place=null;G.aim=null;G.amove=false;G.defm=false;updateUI();};
try{if(matchMedia('(hover:none) and (pointer:coarse)').matches)touchUI();}catch(e){}
// phones held upright: the menu is several screens long, so Deploy and Play online ride along at the bottom of the screen
// (they press the real buttons further down)
{const card=document.querySelector('#menu>.card');if(card&&!$('qDeploy')){const q=document.createElement('div');q.id='qDeploy';
  for(const [id,t] of [['start','▶ Deploy vs AI'],['playOnline','Play online']]){const b=document.createElement('button');b.type='button';b.className='big'+(id==='start'?'':' ghost');b.textContent=t;b.onclick=()=>{const r=$(id);if(r&&!r.disabled&&!r.hidden)r.click();};b.dataset.for=id;q.append(b);}
  card.append(q);const st=document.createElement('style');st.textContent=`#qDeploy{display:none}
@media (max-width:560px){#qDeploy{display:flex;gap:6px;position:sticky;bottom:0;z-index:4;margin:0 -4px;padding:8px 4px max(6px,env(safe-area-inset-bottom,0px));background:linear-gradient(rgba(8,11,10,0),rgba(8,11,10,.96) 28%)}#qDeploy button{flex:1 1 0;min-height:44px}#qDeploy.near{display:none}}`;document.head.append(st);
  // stepped aside while the real buttons are on screen
  try{const io=new IntersectionObserver(es=>{const vis=es.some(e=>e.isIntersecting);q.classList.toggle('near',vis);},{root:$('menu')});io.observe($('start'));}catch(e){}
  setInterval(()=>{if($('menu').hidden)return;for(const b of q.children){const r=$(b.dataset.for);b.hidden=!r||r.hidden;b.disabled=!!(r&&r.disabled);}},700);}}
/* ================= TOUCH CONTROLS (phones, tablets) — touch only ================= */
// Everything in this block acts only on touch (pointerType 'touch'). Touches on the battlefield are taken here in the
// capture phase and stopped, so they never reach the mouse handlers above, and a mouse or pen never reaches this code:
// the desktop mouse scheme is unchanged. (touchDown/touchMove/touchUp above are the older touch code, no longer reached.)
//   one finger drag ........ scrolls the map like a maps app (it follows the finger and glides on after a flick)
//   two fingers ............ pinch to zoom, slide to pan
//   tap .................... selects a unit or building; with units selected, tap the ground to move, an enemy to
//                            attack, or your own transport / tunnel / building they can use to go in. A production
//                            building selected: tap the ground for its rally point. A ring flashes where the order went.
//   double-tap a unit ...... selects all of that type on screen
//   hold, then drag ........ box-select; with units selected it draws the infantry line formation instead
//   command strip .......... above the bar while units are selected: attack-move, guard, stop, line, same type, all army,
//                            retreat, deselect
//   building or power ...... tap to choose the spot (one finger still scrolls), then ✓ to build / fire or ✕ to cancel
//   first battle ........... a 3-step guide shows once (remembered on this device); ☰ > Touch controls shows it again
const TC={ids:new Map(),g:null,pinch:null,vel:{x:0,y:0},glide:false,lastTap:null,pick:null,lineArm:false,lpT:0,last:performance.now(),
  touch:false,stripK:'',stripT:0,marks:0,seen:{}};
try{TC.touch=matchMedia('(hover:none) and (pointer:coarse)').matches;}catch(e){}
const TC_LP=380,TC_SLOP=10,TC_DBL=420;
function tcOwn(){return G?G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead):[];}
function tcXY(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function tcMid(){const a=[...TC.ids.values()];return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};}
function tcOnScreen(u,h){const p=toScreen(u.x,unitH(u)+(h||0),u.y);return p.x>0&&p.y>0&&p.x<VW&&p.y<VH;}
// move the camera by a world offset, at once (no easing), kept on the map
function tcCam(dx,dy){camTarget();const ox=cam.tx,oy=cam.ty;cam.tx=Math.max(0,Math.min(MAPW,cam.tx+dx));cam.ty=Math.max(0,Math.min(MAPH,cam.ty+dy));
  const mx=cam.tx-ox,my=cam.ty-oy;cam.x+=mx;cam.y+=my;cam._xl=cam.x;cam._yl=cam.y;return Math.abs(mx)+Math.abs(my)>1e-3;}
// a ring that flashes where an order went (move green, attack red, attack-move orange, guard blue, rally, line, blocked)
function tcMark(x,y,k){TC.marks++;TC.seen[k]=(TC.seen[k]||0)+1;if(SET.mPing===0)return;const r=cv.getBoundingClientRect(),d=document.createElement('div');d.className='tmark '+k;d.style.left=(x+r.left)+'px';d.style.top=(y+r.top)+'px';document.body.append(d);setTimeout(()=>d.remove(),750);}
function tcHold(x,y){let h=$('thold');if(x==null){if(h)h.hidden=true;return;}if(!h){h=document.createElement('div');h.id='thold';document.body.append(h);}const r=cv.getBoundingClientRect();h.style.left=(x+r.left)+'px';h.style.top=(y+r.top)+'px';h.hidden=false;}
// your own unit or building that the selection can use (board, enter a tunnel, garrison, help build, re-crew)
function tcUse(t,own){if(!t||t.team!==ME||t.dead)return false;
  if(t.kind==='garrison'&&own.some(u=>canGarrison(u)))return true;
  if(t.isB)return(t.built<1&&own.some(u=>u.kind==='dozer'))||(t.kind==='tunnel'&&t.built>=1&&own.some(u=>u.s.dom==='ground'&&u.kind!=='harv'));
  return!!(t.s&&t.s.cap&&own.some(u=>u!==t&&canBoard(t,u)))||(!!t.aband&&own.some(u=>isInf(u.s)&&!u.s.noAttack));}
function tcProd(){return G.sel.some(b=>b.isB&&b.team===ME&&!b.dead&&CATS.includes(b.kind)&&b.built>=1);}
function tcSelSound(){if(G.sel.some(u=>!u.isB&&u.team===ME))speak(0);else if(G.sel.length)sfxUI(660);}
function tcAbort(){clearTimeout(TC.lpT);tcHold();const g=TC.g;TC.g=null;if(!g)return;if(drag&&drag.id===g.id)drag=null;if(RDRAG&&RDRAG.id===g.id)RDRAG=null;}
function tcTap(x,y,ts){if(ts==null)ts=performance.now();mouse.x=x;mouse.y=y;const w=screenToWorld(x,y);if(!w)return;
  if(G.place||G.aim){TC.pick=w;sfxUI(520);updateUI();return;}
  const own=tcOwn();
  if(G.defm){if(own.length){defendAt(w);tcMark(x,y,'gd');}G.defm=false;updateUI();return;}
  if(G.amove&&own.length){const ids=own.filter(u=>u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);if(ids.length){doAct({t:'go',ids,x:w.x,y:w.y,mode:'amove',fm:sqOfSel()>0?1:0});speak(2);PINGS.push({x:w.x,y:w.y,r:16,t:0,d:.4,c:0xea5a40});tcMark(x,y,'am');}G.amove=false;updateUI();return;}
  G.amove=false;
  const t=pickAt(x,y,false),now=ts,L=TC.lastTap;
  TC.tapLog={x:Math.round(x),y:Math.round(y),t:t?t.kind+'/'+t.team:null,own:own.length};
  if(t&&t.team===ME&&!t.isB&&L&&now-L.t<TC_DBL&&L.kind===t.kind&&Math.hypot(x-L.x,y-L.y)<60){TC.lastTap=null;
    G.sel=G.ents.filter(u=>u.team===ME&&u.kind===t.kind&&!u.dead&&tcOnScreen(u));tcMark(x,y,'sel');tcSelSound();updateUI();return;}
  TC.lastTap=t&&t.team===ME&&!t.isB?{t:now,kind:t.kind,x,y}:null;
  if(own.length&&!(t&&t.team===ME&&!tcUse(t,own))){
    if(!t&&typeof noGo==='function'&&noGo(own,w)){try{sfxUI(220);}catch(_){}tcMark(x,y,'no');return;}
    if(issueCmd(w,t,false)){tcMark(x,y,t&&!ally(t.team,ME)?'atk':'mv');updateUI();return;}}
  if(!t&&!own.length&&tcProd()){issueCmd(w,null,true);tcMark(x,y,'rl');updateUI();return;}
  selectClick(t,false);if(t)tcMark(x,y,'sel');tcSelSound();updateUI();}
function tcBox(g){const x0=Math.min(g.x0,g.x),x1=Math.max(g.x0,g.x),y0=Math.min(g.y0,g.y),y1=Math.max(g.y0,g.y);
  G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!u.dead&&(()=>{const p=toScreen(u.x,unitH(u)+4,u.y);return p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;})());tcSelSound();updateUI();}
function tcLine(g){const w0=g.w0,w1=screenToWorld(g.x,g.y),ids=tcOwn().map(u=>u.id);TC.lineArm=false;if(!w0||!w1||!ids.length)return;
  doAct({t:'line',ids,x:w0.x,y:w0.y,x2:w1.x,y2:w1.y,mode:G.amove?'amove':'move'});G.amove=false;speak(1);PINGS.push({x:(w0.x+w1.x)/2,y:(w0.y+w1.y)/2,r:16,t:0,d:.4,c:0x74d08f});
  tcMark(g.x0,g.y0,'ln');tcMark(g.x,g.y,'ln');updateUI();}
function tcStartDrag(g,ts){const own=tcOwn();
  if(own.length&&!G.place&&!G.aim&&(g.mode==='hold'||TC.lineArm)){g.mode='line';g.w0=screenToWorld(g.x0,g.y0);RDRAG={x0:g.x0,y0:g.y0,w0:g.w0,id:g.id,am:G.amove,moved:true,line:true,tc:1};}
  else if(g.mode==='hold'&&!G.place&&!G.aim){g.mode='box';drag={x0:g.x0,y0:g.y0,box:true,shift:false,id:g.id,pt:'touch',tc:1};}
  else{g.mode='pan';g.lt=ts;TC.vel={x:0,y:0};}
  tcHold();}
function tcLong(){const g=TC.g;if(!g||g.mode!=='tap')return;g.mode='hold';tcHold(g.x,g.y);try{navigator.vibrate&&navigator.vibrate(15);}catch(_){}}
window.addEventListener('pointerdown',e=>{TC.touch=e.pointerType==='touch';TC.nd=(TC.nd||0)+1;TC.lastDown=e.pointerType+':'+(e.target&&(e.target.id||e.target.tagName));if(e.pointerType!=='touch'||e.target!==cv)return;
  if(typeof menuOpen==='function'&&menuOpen())return; // the menu's own handler closes it and swallows the tap
  e.stopPropagation();e.preventDefault();if(!G||G.over)return;
  LASTPT='touch';if(!TOUCHUI)touchUI();else hintDev('touch');PICKMIN=20;mouse.in=false;try{cv.setPointerCapture(e.pointerId);}catch(_){}
  TC.glide=false;const p=tcXY(e);TC.ids.set(e.pointerId,p);
  if(TC.ids.size>=2){tcAbort();if(!TC.pinch&&TC.ids.size===2)TC.pinch=tcMid();return;}
  TC.g={id:e.pointerId,x0:p.x,y0:p.y,x:p.x,y:p.y,mode:'tap',t0:e.timeStamp};clearTimeout(TC.lpT);TC.lpT=setTimeout(tcLong,TC_LP);},true);
window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')TC.nm=(TC.nm||0)+1;if(e.pointerType!=='touch'||!TC.ids.has(e.pointerId))return;e.stopPropagation();if(!G)return;
  const p=tcXY(e),q=TC.ids.get(e.pointerId);TC.ids.set(e.pointerId,p);
  if(TC.pinch&&TC.ids.size>=2){const m=tcMid(),P=TC.pinch;camTarget();
    if(P.d>24&&m.d>24){const od=cam.td,nd=Math.max(200,Math.min(1800,od*P.d/m.d));cam.td=nd;const w=screenToWorld(m.x,m.y);if(w){const f=1-nd/od;cam.tx+=(w.x-cam.tx)*f*.9;cam.ty+=(w.y-(cam.ty+cam.dist*.08))*f*.9;}}
    const a=screenToWorld(P.x,P.y),b=screenToWorld(m.x,m.y);if(a&&b){cam.tx+=a.x-b.x;cam.ty+=a.y-b.y;}TC.pinch={x:m.x,y:m.y,d:m.d};return;}
  const g=TC.g;if(!g||g.id!==e.pointerId)return;g.x=p.x;g.y=p.y;
  if(g.mode==='tap'||g.mode==='hold'){if(Math.hypot(p.x-g.x0,p.y-g.y0)<=TC_SLOP)return;clearTimeout(TC.lpT);
    // held or not is decided by how long the finger rested before it moved (event times), not by when the timer ran
    g.mode=e.timeStamp-g.t0>=TC_LP?'hold':'tap';tcStartDrag(g,e.timeStamp);if(g.mode==='pan')q.x=g.x0,q.y=g.y0;}
  if(g.mode==='pan'){const a=screenToWorld(q.x,q.y),b=screenToWorld(p.x,p.y);if(!a||!b)return;let dx=a.x-b.x,dy=a.y-b.y;const cap=cam.dist*1.5,n=Math.hypot(dx,dy);if(n>cap){dx*=cap/n;dy*=cap/n;}
    tcCam(dx,dy);const now=e.timeStamp,dt=Math.max(.004,(now-g.lt)/1000);g.lt=now;const ix=dx/dt,iy=dy/dt;
    TC.vel=dt>.1?{x:ix,y:iy}:{x:TC.vel.x*.45+ix*.55,y:TC.vel.y*.45+iy*.55};return;}
  mouse.x=p.x;mouse.y=p.y;},true);
function tcEnd(e,cancel){if(e.pointerType!=='touch'||!TC.ids.has(e.pointerId))return;e.stopPropagation();TC.ids.delete(e.pointerId);if(TC.ids.size<2)TC.pinch=null;
  const g=TC.g;if(!g||g.id!==e.pointerId)return;clearTimeout(TC.lpT);tcHold();TC.g=null;TC.endLog={mode:g.mode,ms:Math.round(e.timeStamp-g.t0),d:Math.round(Math.hypot(g.x-g.x0,g.y-g.y0))};
  if(g.mode==='line'&&RDRAG&&RDRAG.id===g.id)RDRAG=null;if(g.mode==='box'&&drag&&drag.id===g.id)drag=null;
  if(cancel||!G||G.over)return;
  if(g.mode==='tap'||g.mode==='hold')tcTap(g.x0,g.y0,e.timeStamp);
  else if(g.mode==='box')tcBox(g);
  else if(g.mode==='line')tcLine(g);
  else if(g.mode==='pan'){const sp=Math.hypot(TC.vel.x,TC.vel.y),cap=cam.dist*4;if(e.timeStamp-g.lt<90&&sp>cam.dist*.35){if(sp>cap){TC.vel.x*=cap/sp;TC.vel.y*=cap/sp;}TC.glide=true;}}}
window.addEventListener('pointerup',e=>tcEnd(e,false),true);
window.addEventListener('pointercancel',e=>tcEnd(e,true),true);
/* ---- command strip (touch only, while units are selected) and build / fire confirm ---- */
const TC_BTN=[['am','⚔','Attack','Attack-move: tap a spot, they fight everything on the way'],['gd','🛡','Guard','Guard: tap the spot to hold'],['st','■','Stop','Stop'],
  ['ln','╱','Line','Line: drag on the map to draw the battle line'],['ty','◎','Type','Select all units of the selected types on screen'],['all','★','Army','Select your whole army'],
  ['rt','↩','Retreat','Retreat to the nearest base building'],['ds','✕','Clear','Deselect']];
function tcCmd(k){if(!G||G.over)return;const own=tcOwn(),ids=own.map(u=>u.id);
  if(k==='am'){G.amove=!G.amove;G.defm=false;TC.lineArm=false;}
  else if(k==='gd'){G.defm=!G.defm;G.amove=false;TC.lineArm=false;}
  else if(k==='st'){if(ids.length)doAct({t:'stop',ids});sfxUI(520);}
  else if(k==='ln'){TC.lineArm=!TC.lineArm;G.amove=false;G.defm=false;}
  else if(k==='ty'){const ks=new Set(own.map(u=>u.kind));G.sel=G.ents.filter(u=>u.team===ME&&!u.isB&&!u.dead&&ks.has(u.kind)&&tcOnScreen(u));tcSelSound();}
  else if(k==='all'){selectArmy();}
  else if(k==='rt'){if(ids.length){doAct({t:'ret',ids});speak(2);}}
  else if(k==='ds'){G.sel=[];G.amove=false;G.defm=false;TC.lineArm=false;}
  else if(k==='ok'){if(TC.pick&&(G.place||G.aim)){const p=toScreen(TC.pick.x,0,TC.pick.y);placeOrAim(TC.pick,false);if(!G.place&&!G.aim){tcMark(p.x,p.y,'am');TC.pick=null;}}}
  else if(k==='no'){G.place=null;G.aim=null;TC.pick=null;}
  TC.stripK='';updateUI();tcStrip(true);}
function tcStrip(force){const now=performance.now();if(!force&&now-TC.stripT<120)return;TC.stripT=now;
  let s=$('tstrip');if(!s){s=document.createElement('div');s.id='tstrip';s.hidden=true;s.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)tcCmd(b.dataset.k);});document.body.append(s);}
  const on=TOUCHUI&&TC.touch&&G&&!G.over&&!window.LOADING&&$('menu').hidden;const own=on?tcOwn():[];
  const mode=!on?'':(G.place||G.aim)?'conf':own.length?'cmd':'';
  const ok=mode==='conf'&&!!TC.pick&&(G.aim||!!validSpot(ME,G.place,TC.pick.x,TC.pick.y));
  const key=mode+'|'+(mode==='cmd'?[G.amove,G.defm,TC.lineArm,own.some(u=>u.retreat)].join():mode==='conf'?(G.place?'b':'f')+ok:'');
  document.body.classList.toggle('tstripOn',mode==='cmd');document.body.classList.toggle('tconfOn',mode==='conf');
  if(key===TC.stripK)return;TC.stripK=key;s.hidden=!mode;s.className=mode;s.innerHTML='';if(!mode)return;
  const mk=(k,ic,tx,ti,cl)=>{const b=document.createElement('button');b.type='button';b.dataset.k=k;b.title=ti;b.setAttribute('aria-label',ti);if(cl)b.className=cl;const i=document.createElement('i');i.textContent=ic;const t=document.createElement('span');t.textContent=tx;b.append(i,t);s.append(b);return b;};
  if(mode==='conf'){const b=mk('ok','✓',G.place?'Build here':'Fire here',G.place?'Build it at the marked spot':'Fire at the marked spot','go');b.disabled=!ok;mk('no','✕','Cancel','Cancel','cx');return;}
  for(const [k,ic,tx,ti] of TC_BTN){const b=mk(k,ic,tx,ti);if((k==='am'&&G.amove)||(k==='gd'&&G.defm)||(k==='ln'&&TC.lineArm)||(k==='rt'&&own.some(u=>u.retreat)))b.classList.add('on');}}
/* ---- first-time guide: three steps, shown once, remembered; ☰ > Touch controls shows it again. A card near the top,
   not a full-screen cover: the battle keeps running (multiplayer can't pause) and stays playable around it ---- */
const TC_GUIDE=[['☝','Move the map','Drag one finger to scroll the battlefield; flick to glide. Pinch with two fingers to zoom.'],
  ['◉','Select and command','Tap a unit to select it, then tap the ground to move or an enemy to attack: a ring shows where the order went. Double-tap a unit to select all of that type on screen.'],
  ['▭','Hold, then drag','Hold a finger still for a moment, then drag to box-select a group. With units selected, hold and drag to draw a battle line. The buttons above the bar give attack-move, guard, stop and more.']];
function tcGuideSeen(){try{return localStorage.getItem('ww3_touchGuide')==='1';}catch(e){return false;}}
function tcGuide(show){let o=$('tguide');if(show===false){if(o)o.hidden=true;return;}
  if(!o){o=document.createElement('div');o.id='tguide';o.setAttribute('role','dialog');o.setAttribute('aria-label','Touch controls');o.innerHTML='<div class="tgc"><div class="tgn"></div><div class="tgi"></div><b></b><p></p><div class="tgb"><button type="button" class="tgs">Skip</button><button type="button" class="tgx">Next</button></div></div>';document.body.append(o);
    o.querySelector('.tgs').onclick=()=>tcGuide(false);o.querySelector('.tgx').onclick=()=>{if(o.dataset.i>=TC_GUIDE.length-1)tcGuide(false);else tcGuideStep(+o.dataset.i+1);};}
  try{localStorage.setItem('ww3_touchGuide','1');}catch(e){}TC.guideShown=(TC.guideShown||0)+1;o.hidden=false;tcGuideStep(0);}
function tcGuideStep(i){const o=$('tguide'),[ic,h,p]=TC_GUIDE[i];o.dataset.i=i;o.querySelector('.tgn').textContent=`${i+1} / ${TC_GUIDE.length}`;o.querySelector('.tgi').textContent=ic;o.querySelector('b').textContent=h;o.querySelector('p').textContent=p;o.querySelector('.tgx').textContent=i===TC_GUIDE.length-1?'Got it':'Next';}
{const m=$('amenu'),s=$('aSet');if(m&&s&&!$('aGuide')){const b=document.createElement('button');b.id='aGuide';b.className='on';b.setAttribute('role','menuitem');b.textContent='☝ Touch controls';b.title='Show the touch controls guide';b.onclick=()=>{menuOpen(false);tcGuide(true);};s.after(b);}}
/* ---- every frame: flick glide, the build / fire marker stays on its spot while the map scrolls, strip, guide ---- */
(function tcLoop(){requestAnimationFrame(tcLoop);const now=performance.now(),dt=Math.min(.05,(now-TC.last)/1000);TC.last=now;TC.frames=(TC.frames||0)+1;if(!G)return;
  try{if(TC.glide){if(!tcCam(TC.vel.x*dt,TC.vel.y*dt))TC.glide=false;const k=Math.exp(-dt*4.2);TC.vel.x*=k;TC.vel.y*=k;if(Math.hypot(TC.vel.x,TC.vel.y)<cam.dist*.04)TC.glide=false;}
    if((G.place||G.aim)&&TC.touch&&!G.over){if(!TC.pick)TC.pick=screenToWorld(VW/2,VH*.42);if(TC.pick){const p=toScreen(TC.pick.x,0,TC.pick.y);mouse.x=p.x;mouse.y=p.y;}}else TC.pick=null;
    tcStrip(false);
    if(TOUCHUI&&TC.touch&&!G.over&&!window.LOADING&&$('menu').hidden&&!tcGuideSeen())tcGuide(true);}catch(e){TC.err=String(e&&e.stack||e).slice(0,300);}})();
{const st=document.createElement('style');st.id='touchCss';st.textContent=`
.tmark{position:fixed;z-index:7;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #7be08f;box-shadow:0 0 0 2px rgba(0,0,0,.55),inset 0 0 0 2px rgba(0,0,0,.4);pointer-events:none;animation:tmk .7s ease-out forwards}
.tmark::after{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px;border-radius:50%;background:currentColor;color:inherit}
.tmark.mv{border-color:#7be08f;color:#7be08f}.tmark.atk{border-color:#ff4a3a;color:#ff4a3a}.tmark.am{border-color:#ffb02e;color:#ffb02e}.tmark.gd{border-color:#6fb2ff;color:#6fb2ff}
.tmark.rl{border-color:#7be08f;color:#7be08f;border-style:dashed}.tmark.ln{border-color:#d6f7de;color:#d6f7de;width:30px;height:30px;margin:-15px}.tmark.sel{border-color:#e9f5ec;color:transparent;border-radius:6px}.tmark.no{border-color:#ff3b30;color:#ff3b30}
@keyframes tmk{from{transform:scale(.35);opacity:1}60%{opacity:1}to{transform:scale(1.35);opacity:0}}
#thold{position:fixed;z-index:7;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:2px solid rgba(233,245,236,.9);background:rgba(123,224,143,.14);pointer-events:none}
#thold[hidden]{display:none}
#tstrip{position:fixed;z-index:7;left:max(6px,env(safe-area-inset-left,0px));right:max(6px,env(safe-area-inset-right,0px));bottom:calc(var(--barh,180px) + 6px);display:flex;justify-content:center;gap:4px;pointer-events:none}
#tstrip[hidden]{display:none}
#tstrip button{pointer-events:auto;flex:1 1 0;min-width:40px;max-width:76px;min-height:44px;padding:2px 1px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:rgba(24,32,28,.94);border:1px solid #3d4d44;color:var(--fg,#e9f5ec);font:600 10px var(--display,system-ui);letter-spacing:.02em;box-shadow:0 2px 8px rgba(0,0,0,.5);touch-action:manipulation;cursor:pointer}
#tstrip button i{font-style:normal;font-size:16px;line-height:1}
#tstrip button.on{border-color:var(--accent,#7be08f);color:var(--accent,#7be08f);background:rgba(40,60,46,.96)}
#tstrip.conf{justify-content:flex-end}
#tstrip.conf button{flex:0 1 96px;max-width:none;font-size:12px}
#tstrip.conf button.go{border-color:var(--ok,#7be08f);color:var(--ok,#7be08f)}#tstrip.conf button.go:disabled{opacity:.45}
#tstrip.conf button.cx{border-color:var(--warn,#ea5a40);color:var(--warn,#ea5a40)}
body.tstripOn #info .cmdrow{display:none!important}
#tguide{position:fixed;left:0;right:0;top:max(44px,calc(env(safe-area-inset-top,0px) + 38px));z-index:30;display:flex;justify-content:center;padding:0 10px;pointer-events:none}
#tguide[hidden]{display:none}
#tguide .tgc{pointer-events:auto;width:min(360px,100%);box-sizing:border-box;background:rgba(18,24,21,.98);border:1px solid #3d4d44;box-shadow:0 10px 30px rgba(0,0,0,.6);padding:16px 16px 12px;color:var(--fg,#e9f5ec);font:14px/1.4 system-ui,sans-serif}
#tguide .tgn{font:600 11px var(--mono,monospace);color:var(--dim,#9aa8a0);letter-spacing:.08em}
#tguide .tgi{font-size:34px;line-height:1.2;margin:4px 0;color:var(--accent,#7be08f)}
#tguide b{display:block;font:700 18px var(--display,system-ui);letter-spacing:.03em;margin-bottom:4px}
#tguide p{margin:0 0 12px;color:#c9d4ce}
#tguide .tgb{display:flex;gap:8px;justify-content:flex-end}
#tguide .tgb button{min-height:44px;min-width:88px;padding:0 14px;background:var(--panel2,#1d2622);border:1px solid #3d4d44;color:var(--fg,#e9f5ec);font:600 14px var(--display,system-ui);cursor:pointer}
#tguide .tgx{border-color:var(--accent,#7be08f)!important;color:var(--accent,#7be08f)!important}
body:not(.touchui) #aGuide{display:none}
@media (max-height:520px){#tguide .tgi{font-size:26px}#tguide .tgc{padding:10px 14px 8px}#tguide p{margin-bottom:8px}}`;document.body.append(st);}
setTimeout(setHint,0);
function scroll(dt){camTarget();const sp=cam.td*1.1*dt*(SET.scr||100)/100,gk=genKeys();if(keys.ArrowLeft||(keys.a&&!gk))cam.tx-=sp;if(keys.ArrowRight||keys.d)cam.tx+=sp;if(keys.ArrowUp||keys.w)cam.ty-=sp;if(keys.ArrowDown||(keys.s&&!gk))cam.ty+=sp;
  // Generals rapid scroll: right-drag with nothing selected pans toward the drag, faster the further you drag
  if(RDRAG&&RDRAG.gen&&RDRAG.mode==='scroll'&&RDRAG.moved){const dx=mouse.x-RDRAG.x0,dy=mouse.y-RDRAG.y0,d=Math.hypot(dx,dy);if(d>4){const v=sp*Math.min(6,.6+d/70)*(SET.mRS||100)/100;cam.tx+=dx/d*v;cam.ty+=dy/d*v;}}
  if(MLOCK.on&&!mouse.in&&!drag&&SET.edge){const W=innerWidth-1,H=innerHeight-1;if(MLOCK.x<=0)cam.tx-=sp;if(MLOCK.x>=W)cam.tx+=sp;if(MLOCK.y<=0)cam.ty-=sp;if(MLOCK.y>=H)cam.ty+=sp;}
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
function loadHide(){clearInterval(LOAD.tipT);LOAD.tipT=null;if(LOAD.el)LOAD.el.hidden=true;window.LOADING=false;
  // a battle hosted on Cloudflare waits (up to 20 s) until every player is past the loading screen ('rd' in their presence)
  // (the presence carries the player's token, so a server that gave up on a player who was silent while loading links
  // them back at once)
  if(MODE==='client'&&NET.sv&&NET.game)NET.game.presence({rd:1}).catch(()=>{});}
// wait until the browser has painted (falls back to a timer when the tab is in the background and frames stop)
function loadFrame(){return new Promise(r=>{let d=0;const go=()=>{if(!d){d=1;r();}};try{requestAnimationFrame(()=>setTimeout(go,0));}catch(e){}setTimeout(go,document.hidden?0:300);});}
async function afterStart(){const tok=++LOAD.tok,g=G,mode=MODE==='single'?(g.sandbox?'sandbox':'single'):MODE;
  // the 3D models of the shared scenery and of the nations in this battle (only those) download while the ground is painted
  const mp=modelsFor(g.teams.map(T=>T.fac),(d,n)=>{if(tok===LOAD.tok)loadStep('Loading 3D models… '+d+' of '+n,.08+.3*d/n);});
  mp.then(r=>setTimeout(()=>{if(G!==g||typeof pushLog!=='function')return;if(!MODELS.ready)pushLog('Detailed 3D models could not load on this device ('+(MODELS.err||'unknown')+'). Showing simple shapes.','bad');
    else if(r.bad.length)pushLog(r.bad.length+' of '+r.n+' 3D models did not load ('+r.bad.join(', ')+'). Those units show simpler shapes.','bad');},500));
  initAudio();loadFromG(mode);g.paused=true;
  const live=()=>tok===LOAD.tok&&G===g;let tc=null;
  // [label, progress, work, is3dStart]; the battle clock stays held through every step
  // (the painted ground is held back from G.terrain until the end: the view draws nothing while G.terrain is unset)
  const steps=[['Generating terrain…',.08,()=>{paintTerrainNow();tc=g.terrain;g.terrain=null;loadMap(g.mapKey,BASES.slice(0,g.teams.length),g.teams.map(T=>T.color),ME,g.thumb);
      // bake the tactical map's ground now, while the GPU is idle: baked on the first battle frame it has to read pixels
      // back after all the 3D work queued ahead of it, which froze that frame for seconds on phones and slow PCs
      try{if(G===g&&g.thumb&&!g.mmBase)g.mmBase=mmBase();}catch(e){}}],
    ['Loading 3D models…',.38,()=>mp],
    ['Building the battlefield…',.42,()=>{if(!R3)initGfx();else resetScene();},1],
    ['Building the battlefield…',.52,()=>{buildWorld(tc||g.terrain);resize();const [bx,by]=BASES[ME];{const fa=Math.atan2(MAPH/2-by,MAPW/2-bx);centerOn(bx+Math.cos(fa)*200,by+Math.sin(fa)*160);}cam.dist=430;}],
    ['Preparing graphics…',.78,()=>{try{warmShaders();}catch(e){console.warn('warm-up',e);}}],
    ['Deploying forces…',.9,()=>{buildPanels();}],
    // the first battle frame creates every unit, building, town and the fog of war on the GPU, by far the slowest frame
    // of the battle: draw it here, under the loading screen, so the battle appears already running
    ['Deploying forces…',.97,()=>{g.terrain=tc;try{renderFrame(1/60);}finally{g.terrain=null;}}]];
  const T0=performance.now(),TL=LOAD.times=[];
  for(const [label,p,fn,gl] of steps){loadStep(label,p);await loadFrame();if(!live()){if(tok===LOAD.tok)loadHide();return;}g.paused=true;const t1=performance.now();
    try{const r=fn();if(r&&r.then)await r;TL.push([label,Math.round(performance.now()-t1)]);}catch(err){if(!gl){console.error(err);continue;}
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
function startSingle(){MODE='single';ME=0;const facs=rollAis();if(new Set(setup.tm).size<2)setup.tm=facs.map((_,i)=>i);TERR_DEFER=true;try{newGame({seed:setup.seed||((Math.random()*1e9)|0),facs,ai:facs.map((_,i)=>i>0),map:setup.map,tm:setup.tm.slice(),bs:setup.bs,slot:setup.slot==null?-1:setup.slot});}finally{TERR_DEFER=false;}afterStart();}
// Test Range: you against a passive target enemy on a 2-player map, with unlimited money and everything unlocked
function startSandbox(){const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,setup.a&&setup.a!==setup.p?setup.a:en];
  MODE='single';ME=0;
  TERR_DEFER=true;try{newGame({seed:setup.seed||((Math.random()*1e9)|0),facs,ai:[false,false],map:setup.map,tm:[0,1],bs:1,slot:setup.slot==null?-1:setup.slot,sandbox:true});}finally{TERR_DEFER=false;}afterStart();}
function startMP(mode,seed,facs,slot,map,tm,aiD){NET.lastSnapT=0;NET.sc={};NET.kf={};NET.kt={};NET.cseq={};NET.cseqSlot=[];NET.ckAk=null;NET.ckOut=null;NET.sbSlot=null;NET.iaDev=0;NET.tgC=null;NET.tgS=null;NET.ver=null;NET.sk=null;NET.gq=[];NET.civQ=[];NET.snapTo=[];NET.ia=0;NET.rxW=0;NET.prevT=0;MODE=mode;ME=slot|0;const isAI=i=>mode==='host'&&Array.isArray(aiD)&&aiD[i]!=null;TERR_DEFER=true;try{newGame({seed,facs,ai:facs.map((_,i)=>isAI(i)),map,tm});}finally{TERR_DEFER=false;}if(mode==='host')G.teams.forEach((T,i)=>{if(isAI(i))T.ai=mkAI(aiD[i]);});afterStart();$('mpstatus').textContent='';}

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
  const show=()=>{const D=MAPS[setup.map];const base=`${D.min}–${D.max} players`+(D.theme==='snow'?' · snow & ice':'');pl.textContent=base+(D.tag?' · '+D.tag:'');dc.textContent=D.desc;
    setTimeout(()=>{try{const r=mapPreview(setup.map,cv);if(r){const t=[base];if(D.tag)t.push(D.tag);else if(r.water>.28)t.push('naval-heavy');else if(r.water>.06)t.push('rivers & coast');else t.push(r.bridges?'rivers':'open land');if(!D.tag&&r.mtn>.05)t.push('mountain passes');if(r.bridges)t.push(r.bridges+(r.bridges>1?' bridges':' bridge'));pl.textContent=t.join(' · ');}}catch(e){}},20);};
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
$('start').onclick=()=>{initAudio();startSingle();};if($('sandbox'))$('sandbox').onclick=()=>{initAudio();startSandbox();};$('host').onclick=()=>{initAudio();newBattle();};if($('playOnline'))$('playOnline').onclick=()=>{initAudio();playOnline();};
{const tk=$('sTrk');if(tk)for(const b of tk.querySelectorAll('button'))b.onclick=()=>{initAudio();setMyMode(b.dataset.v);myUI();if(G&&!G.over)myStart();};
  const f=$('myF');if(f)f.onchange=async()=>{initAudio();const n=await myAdd(f.files);f.value='';if(n){setMyMode('mine');if(G&&!G.over)myStart();}myUI();};
  if($('myNx'))$('myNx').onclick=()=>{initAudio();if(myMode()==='mine'&&MYM.list.length&&G&&!G.over)myNext();};if($('myCl'))$('myCl').onclick=async()=>{await myClear();setMyMode('score');if(G&&!G.over)myStart();myUI();};
  myList().then(l=>{MYM.list=l;myUI();});}
if(window.WW3_P2P&&$('relayBox')){$('relayBox').hidden=false;let r={};try{r=JSON.parse(localStorage.getItem('ww3_relay')||'{}')||{};}catch(e){}$('relayU').value=r.urls||'';$('relayN').value=r.username||'';$('relayP').value=r.credential||'';
  const sv=()=>{try{const u=$('relayU').value.trim();if(u)localStorage.setItem('ww3_relay',JSON.stringify({urls:u,username:$('relayN').value.trim(),credential:$('relayP').value}));else localStorage.removeItem('ww3_relay');$('relayS').textContent='Saved. Takes effect for the next battle you start or join (reload the page).';}catch(e){}};for(const id of ['relayU','relayN','relayP'])$(id).onchange=sv;}
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
  for(const [id,k] of [['sMus','mus'],['sFx','fx'],['sVo','vo'],['sScr','scr'],['sZm','zm']]){const el=$(id);if(!el)continue;el.value=SET[k];const out=$(id+'V');if(out)out.textContent=SET[k]+'%';el.oninput=()=>{SET[k]=+el.value;if(out)out.textContent=SET[k]+'%';saveSet();if(k!=='scr'&&k!=='zm')applyAudio();};}
  syncMouseUI();}
// Settings > Mouse: a scheme preset (Generals / Alternate mouse setup / Custom) and a choice for each mouse function
const MOPT=[['sMpre','Mouse scheme',null,[['std','Standard (default)'],['gen','Generals'],['custom','Custom']]],
  ['sMLock','Keep the mouse inside the game window (PC, during a battle)','mLock',[['1','On'],['0','Off']]],
  ['sMLG','Left-click on the ground with units selected','mLG',[['move','Move'],['desel','Deselect']]],
  ['sMRC','Right-click','mRC',[['cancel','Deselect & cancel'],['order','Move & attack']]],
  ['sMRDU','Right-drag with units selected','mRDU',[['line','Infantry line'],['scroll','Rapid scroll']]],
  ['sMRDN','Right-drag with nothing selected','mRDN',[['scroll','Rapid scroll'],['box','Box select'],['none','Nothing']]],
  ['sMCur','Cursor shows what a click will do','mCur',[['1','On'],['0','Off']]],
  ['sMPing','Order markers on the ground','mPing',[['1','On'],['0','Off']]]];
{const hd=[...document.querySelectorAll('#settings h2.sethd')].find(h=>/mouse/i.test(h.textContent));if(hd&&!$('sMpre')){const els=[];
  for(const [id,txt,,opts] of MOPT){const lb=document.createElement('div');lb.className='label';lb.textContent=txt;const sg=document.createElement('div');sg.className='seg';sg.id=id;for(const [v,t] of opts){const b=document.createElement('button');b.dataset.v=v;b.textContent=t;sg.append(b);}els.push(lb,sg);
    if(id==='sMpre'){const n=document.createElement('div');n.className='sv';n.id='sMpreN';n.style.cssText='opacity:.8;margin:2px 0 4px';els.push(n);}
    if(id==='sMRDN'){const lr=document.createElement('div');lr.className='label';lr.innerHTML='<label for="sMRS">Rapid-scroll speed</label> <span class="sv" id="sMRSV"></span>';const r=document.createElement('input');r.type='range';r.id='sMRS';r.min=40;r.max=300;r.step=10;els.push(lr,r);}}
  const wn=document.createElement('div');wn.className='sv';wn.id='sMwarn';wn.style.cssText='color:var(--warn);margin:4px 0';wn.hidden=true;wn.textContent='Neither mouse button gives move orders now - set Left-click to Move or Right-click to Move & attack.';els.push(wn);
  hd.after(...els);
  const rs=document.createElement('button');rs.className='btn2';rs.id='sMreset';rs.type='button';rs.textContent='Reset mouse settings to defaults';rs.style.margin='10px 0 4px';const sb=$('setBody');if(sb)sb.append(rs);else{const last=$('settings').querySelector('.card>.row:last-child');if(last)last.before(rs);}}}
function syncMouseUI(){const pre=mPreset();
  for(const [id,,k] of MOPT){const el=$(id);if(!el)continue;for(const b of el.querySelectorAll('button')){const v=b.dataset.v;b.classList.toggle('on',k?String(SET[k])===v:v===pre);if(id==='sMpre'&&v==='custom')b.disabled=pre!=='custom';
      b.onclick=()=>{if(k)SET[k]=(k==='mCur'||k==='mPing'||k==='mLock')?+v:v;if(k==='mLock'&&!SET.mLock)try{mlockOff();}catch(_){}else if(MPRE[v])Object.assign(SET,MPRE[v]);else return;saveSet();syncMouseUI();mouseScheme();};}}
  const n=$('sMpreN');if(n)n.textContent=pre==='std'?'Standard: left-click selects, right-click moves and attacks, right-drag draws a line. F then click: attack-move.':pre==='gen'?'Command & Conquer Generals: left-click selects and gives orders, right-click deselects, right-drag scrolls.':'Custom: your own mix of the choices below.';
  const r=$('sMRS');if(r){r.value=SET.mRS;const o=$('sMRSV');if(o)o.textContent=SET.mRS+'%';r.oninput=()=>{SET.mRS=+r.value;if(o)o.textContent=SET.mRS+'%';saveSet();};}
  const w=$('sMwarn');if(w)w.hidden=leftOrders()||rightOrders();
  const rb=$('sMreset');if(rb)rb.onclick=()=>{Object.assign(SET,MDEF,{scr:100,zm:100,inv:0,dbl:350,tol:8,mmc:'cam',mpan:1,edge:1});saveSet();syncSettings();mouseScheme();};}
const HINT_STD='Left-click or drag: select (Shift adds, double-click: all of a type) · Right-click: move / attack · Right-drag: line formation · F then click: attack-move · G then click: defend area · X: stop · R: retreat · Ctrl+click: force-fire · Alt+click: waypoint · Q: army · H: home · Wheel: zoom · WASD/arrows: scroll · Esc: cancel / deselect';
// the on-screen hint follows the chosen mouse functions (the Standard preset has its own fixed text)
function hintText(){if(stdMouse())return HINT_STD;const L=leftOrders(),R=rightOrders(),P=[];
  P.push(L?'Left-click: select · with units selected, left-click ground to move, enemy to attack · Shift+click: add':'Left-click or drag: select (click empty ground to deselect)');
  P.push('Double-click: all of a type');P.push('Ctrl+click: force-fire · Alt+click: waypoint');
  P.push('F then click: attack-move · G then click: defend area · X: stop');P.push('R: retreat');
  P.push(R?'Right-click: move / attack':'Right-click: deselect / cancel');
  const nm={line:'infantry line',scroll:'rapid scroll',box:'box-select'},U=nm[SET.mRDU],N=nm[SET.mRDN]||'nothing';P.push('Right-drag: '+U+(N!==U?' (nothing selected: '+N+')':''));
  P.push('Q: army · H: home · Wheel: zoom · Arrows/WASD: scroll');return P.join(' · ');}
// the hint line speaks to what the player last used: touch wording after a tap, the active mouse scheme after a click
// (a touchscreen laptop switches back and forth)
function setHint(){const h=$('hint');if(h)h.textContent=TOUCHUI&&HINTDEV==='touch'?HINT_TOUCH:hintText();}
function hintDev(t){const d=t==='touch'?'touch':t==='mouse'?'mouse':null;if(d&&d!==HINTDEV){HINTDEV=d;setHint();}}
function mouseScheme(){setHint();CURST.k=null;try{cursorTick(true);}catch(_){}if(G)updateUI();}
// Keep the mouse inside the game window (PC, Abdullah 2026-10-28; Settings > Mouse, SET.mLock, default on). During a
// battle a mouse click on the battlefield takes the browser's Pointer Lock on the canvas: the system cursor is hidden and
// the game draws its own (#vcur, the same pictures as the contextual cursor), moved by movementX/Y and clamped to the
// window, so pushing against an edge scrolls the camera. While locked every mouse event gets the virtual position as
// clientX/Y (window, capture phase); over the command bar, minimap or ☰ button the press / release / click / wheel / hover
// are re-sent to the element under the virtual cursor, so the bar works as usual. Esc (the browser itself releases the
// lock), the ☰ menu, pause, settings and the end screen release it; the next click on the battlefield locks again.
// Never on touch, never in the menus; a browser that refuses the lock (or an embedding frame without allow-pointer-lock)
// simply keeps the normal cursor. Esc while locked only cancels the current mode (attack-move, guard, placement, power).
const MLOCK={on:false,x:0,y:0,self:false,escK:0,cap:null,down:null,hov:null,hovB:null,img:'',req:0,cx:null,cy:null,bad:0,broken:false};
const VCUR=document.createElement('div');VCUR.id='vcur';VCUR.hidden=true;VCUR.setAttribute('aria-hidden','true');
VCUR.style.cssText='position:fixed;left:0;top:0;width:32px;height:32px;z-index:2147483000;pointer-events:none;background:no-repeat 0 0/32px 32px;will-change:transform';
document.body.append(VCUR);
function mlockOk(){return !!G&&!G.over&&!window.LOADING&&SET.mLock!==0&&$('menu').hidden&&!document.querySelector('.overlay:not([hidden])')&&!menuOpen();}
function mlockOff(){if(document.pointerLockElement){MLOCK.self=true;try{document.exitPointerLock();}catch(_){}}}
// (not under browser automation - the test harness stands in for the lock itself, see orch/controls.mjs - and not after a
// browser showed it does not really lock: the cursor kept moving freely with no movementX/Y)
function mlockReq(e){if(MLOCK.on||MLOCK.broken||e.pointerType!=='mouse'||!e.isTrusted||!mlockOk()||!cv.requestPointerLock||(navigator.webdriver&&!window.__mlockTest))return;
  MLOCK.x=e.clientX;MLOCK.y=e.clientY;MLOCK.req++;try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(_){}}
function mlockCancelModes(){if(!G)return;if(G.place||G.aim||G.amove||G.defm){G.place=null;G.aim=null;G.amove=false;G.defm=false;try{updateUI();}catch(_){}}}
function vcurDraw(){if(!MLOCK.on)return;const k=mouse.in?CURST.k:'';let img,hx=3,hy=2;if(k&&CURD[k]){curCss(k);img=CURIMG[k];hx=CURD[k][0];hy=CURD[k][1];}if(!img){curCss('arrow');img=CURIMG.arrow;hx=3;hy=2;}
  if(img!==MLOCK.img){MLOCK.img=img;VCUR.style.backgroundImage=img?`url("${img}")`:'';}
  VCUR.style.transform=`translate(${MLOCK.x-hx}px,${MLOCK.y-hy}px)`;}
document.addEventListener('pointerlockchange',()=>{const on=document.pointerLockElement===cv;const was=MLOCK.on;MLOCK.on=on;VCUR.hidden=!on;document.body.classList.toggle('mlock',on);
  if(on){MLOCK.img='';MLOCK.cx=null;MLOCK.bad=0;mouse.x=MLOCK.x-cv.getBoundingClientRect().left;mouse.y=MLOCK.y-cv.getBoundingClientRect().top;mouse.in=true;CURST.k=null;try{cursorTick(true);}catch(_){}vcurDraw();}
  else{if(MLOCK.hovB)MLOCK.hovB.classList.remove('vhov');MLOCK.hov=MLOCK.hovB=null;MLOCK.cap=null;
    if(was&&!MLOCK.self&&performance.now()-MLOCK.escK>400)mlockCancelModes(); // Esc released it and the key itself never reached the page
    MLOCK.self=false;}});
document.addEventListener('pointerlockerror',()=>{MLOCK.on=false;VCUR.hidden=true;});
setInterval(()=>{if(MLOCK.on&&!mlockOk())mlockOff();},100);
function mlPatch(e,x,y){for(const [k,v] of [['clientX',x],['clientY',y],['pageX',x],['pageY',y],['x',x],['y',y]])try{Object.defineProperty(e,k,{value:v,configurable:true});}catch(_){}}
function mlSend(el,ty,e,x,y,bub){const o={bubbles:bub!==false,cancelable:true,composed:true,clientX:x,clientY:y,screenX:x,screenY:y,button:e.button||0,buttons:e.buttons||0,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey,metaKey:e.metaKey,view:window};
  let ev;if(ty.startsWith('pointer'))ev=new PointerEvent(ty,Object.assign(o,{pointerId:e.pointerId||1,pointerType:'mouse',isPrimary:true}));else if(ty==='wheel')ev=new WheelEvent(ty,Object.assign(o,{deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode}));else ev=new MouseEvent(ty,o);
  el.dispatchEvent(ev);return ev;}
function mlHover(el,e,x,y){const old=MLOCK.hov;if(el===old)return;
  if(MLOCK.hovB){MLOCK.hovB.classList.remove('vhov');MLOCK.hovB=null;}
  if(old){mlSend(old,'pointerout',e,x,y);mlSend(old,'mouseout',e,x,y);for(let a=old;a&&a!==document.body&&!(el&&a.contains(el));a=a.parentElement){mlSend(a,'pointerleave',e,x,y,false);mlSend(a,'mouseleave',e,x,y,false);}}
  MLOCK.hov=el;if(el){const b=el.closest('button,.btn,a');if(b){b.classList.add('vhov');MLOCK.hovB=b;}mlSend(el,'pointerover',e,x,y);mlSend(el,'mouseover',e,x,y);for(let a=el;a&&a!==document.body&&!(old&&a.contains(old));a=a.parentElement){mlSend(a,'pointerenter',e,x,y,false);mlSend(a,'mouseenter',e,x,y,false);}}}
function mlEv(e){if(!MLOCK.on||!e.isTrusted)return;const ty=e.type;
  if(ty==='pointermove'){const cx=e.clientX,cy=e.clientY;if(!e.movementX&&!e.movementY&&MLOCK.cx!=null&&(cx!==MLOCK.cx||cy!==MLOCK.cy)){if(++MLOCK.bad>3){MLOCK.broken=true;mlockOff();}}else MLOCK.bad=0;MLOCK.cx=cx;MLOCK.cy=cy;}
  if(ty==='pointermove'||(ty==='mousemove'&&!window.PointerEvent)){MLOCK.x=Math.max(0,Math.min(innerWidth-1,MLOCK.x+(e.movementX||0)));MLOCK.y=Math.max(0,Math.min(innerHeight-1,MLOCK.y+(e.movementY||0)));}
  const x=MLOCK.x,y=MLOCK.y;mlPatch(e,x,y);
  if(ty==='contextmenu'){e.preventDefault();e.stopImmediatePropagation();return;}
  const under=document.elementFromPoint(x,y);let el=MLOCK.cap||under;
  if(ty==='pointerdown')MLOCK.cap=MLOCK.down=el;
  if(ty==='mouseup'||ty==='pointerup')setTimeout(()=>{MLOCK.cap=null;},0);
  const onCv=!el||el===cv;
  if(ty==='pointermove'||ty==='mousemove'){mouse.in=!!under&&under===cv&&!MLOCK.cap||MLOCK.cap===cv;mlHover(onCv?null:under,e,x,y);vcurDraw();}
  if(onCv)return; // the battlefield: the game's own handlers run with the virtual position
  e.stopImmediatePropagation();
  if(ty==='wheel'){e.preventDefault();const w=mlSend(el,'wheel',e,x,y);if(!w.defaultPrevented)for(let a=el;a;a=a.parentElement){const cs=getComputedStyle(a);if(/(auto|scroll)/.test(cs.overflowY+cs.overflowX)&&(a.scrollHeight>a.clientHeight||a.scrollWidth>a.clientWidth)){a.scrollBy(e.deltaX,e.deltaY);break;}}return;}
  if(ty==='click'||ty==='dblclick'||ty==='auxclick'){const d=MLOCK.down;if(d&&(d===under||d.contains(under)||under&&under.contains(d)))mlSend(under||d,ty,e,x,y);return;}
  mlSend(el,ty,e,x,y);}
for(const t of ['pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup','click','dblclick','auxclick','contextmenu','wheel'])window.addEventListener(t,mlEv,{capture:true,passive:false});
cv.addEventListener('pointerdown',mlockReq);
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
function askRestart(){if(!G)return;if(MODE!=='single'){pushLog('Multiplayer battles cannot be restarted - quit and start a new one.','w');return;}askQuit();G.restartAsk=true;$('quitOv').querySelector('h1').textContent='Restart this battle?';$('quitSub').textContent='The battle starts over with the same nations, map and settings.';$('quitYes').textContent='Restart';}
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
function mapPeek(v){const sd=$('side'),b=$('mmBtn');if(!sd)return;if(v==null)v=!sd.classList.contains('mmOn');sd.classList.toggle('mmOn',!!v);$('app').classList.toggle('mmpeek',!!v);if(b)b.setAttribute('aria-pressed',v?'true':'false');}
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
  try{pushLog("Your device is running this battle on battery. Plug your laptop in so it stays fast and awake for everyone in the match.",'w');}catch(e){}}
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

