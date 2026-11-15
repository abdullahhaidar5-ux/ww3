/* ONE icon table for every button the player clicks (Abdullah 2026-11-14 21:39 "make sure every button has an icon that makes sense").
   ICON_SVG (declared in 08-ui.js with the order-dock icons) is extended here: same inline line style (48x48 box, stroke 3.2, one bright
   colour per icon), no emoji, no image files. Icons are made once per button (icoPut); a MutationObserver re-puts them only when
   code rewrites a HUD button's text, never per frame. Units and buildings keep their drawn pictures (UK.icon / drawUnit / drawBld). */
{const S=(c,b)=>`<svg viewBox='0 0 48 48' fill='none' stroke='${c}' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'>${b}</svg>`;
 const Y='#ffd24a',G='#7be08f',B='#6fbaff',R='#ff6a50',W='#e6eef2',O='#ffa84a',P='#c79bff';
 Object.assign(ICON_SVG,{
  rifle:S(O,"<path d='M4 28h30l4-4h6v6h-8l-3 3H18l-2 8h-6l2-8H4z'/><path d='M22 24v4'/>"),
  vest:S(G,"<path d='M14 6l-8 8 4 6 4-2v26h20V18l4 2 4-6-8-8-6 4h-8z'/>"),
  armor:S(B,"<path d='M24 5l15 5v12c0 9-6 16-15 21C15 38 9 31 9 22V10z'/><path d='M24 14v22M15 22h18'/>"),
  shell:S(Y,"<path d='M18 42V20c0-8 4-14 6-16 2 2 6 8 6 16v22z'/><path d='M18 32h12M18 42h12'/>"),
  scope:S(R,"<circle cx='24' cy='24' r='15'/><path d='M24 3v12M24 33v12M3 24h12M33 24h12'/><path d='M30 18l-6 6'/>"),
  speed:S(G,"<path d='M8 12l14 12L8 36M24 12l14 12-14 12'/><path d='M42 12v24'/>"),
  plane:S(B,"<path d='M24 4c2 0 3 3 3 6v10l17 9v5l-17-4v9l5 4v3l-8-2-8 2v-3l5-4v-9L4 34v-5l17-9V10c0-3 1-6 3-6z'/>"),
  drone:S(P,"<circle cx='24' cy='26' r='5'/><path d='M19 22l-9-9M29 22l9-9M19 30l-9 9M29 30l9 9'/><circle cx='9' cy='11' r='4'/><circle cx='39' cy='11' r='4'/><circle cx='9' cy='41' r='4'/><circle cx='39' cy='41' r='4'/>"),
  heli:S(B,"<path d='M5 8h38M24 8v8'/><path d='M10 28c0-8 6-12 14-12s12 5 12 12-4 8-10 8H14c-2 0-4-2-4-8z'/><path d='M36 26l9-3M20 36l-3 6M30 36l3 6M14 42h22'/>"),
  ship:S(B,"<path d='M4 30h40l-6 10H10z'/><path d='M14 30V18h20v12M24 18V8M20 12h8'/>"),
  rocket:S(R,"<path d='M24 4c7 6 10 14 8 26H16C14 18 17 10 24 4z'/><circle cx='24' cy='19' r='3.5'/><path d='M16 30l-7 8 8-2M32 30l7 8-8-2M24 34v10'/>"),
  star:S(Y,"<path d='M24 5l5.6 12 13 1.5-9.6 9 2.7 13L24 33.5 12.3 40.5 15 27.5 5.4 18.5l13-1.5z'/>"),
  flag:S(R,"<path d='M10 44V6'/><path d='M10 8h26l-6 8 6 8H10'/>"),
  cash:S(G,"<circle cx='24' cy='24' r='18'/><path d='M29 17c-1-2-3-3-5-3-3 0-5 2-5 4 0 6 11 3 11 10 0 3-2 5-6 5-3 0-5-1-6-4M24 10v4M24 34v4'/>"),
  radar:S(G,"<circle cx='24' cy='24' r='18'/><circle cx='24' cy='24' r='9'/><path d='M24 24l13-13'/><circle cx='31' cy='31' r='2.5' fill='#7be08f'/>"),
  eye:S(B,"<path d='M3 24c6-10 12-15 21-15s15 5 21 15c-6 10-12 15-21 15S9 34 3 24z'/><circle cx='24' cy='24' r='7'/><circle cx='24' cy='24' r='2.5' fill='#6fbaff'/>"),
  clock:S(O,"<circle cx='24' cy='26' r='17'/><path d='M24 14v12l8 5M18 4h12'/>"),
  wrench:S(G,"<path d='M31 6a10 10 0 0 0-9 14L6 36l6 6 16-16a10 10 0 0 0 14-9l-7 5-6-2-2-6z'/>"),
  leaf:S(G,"<path d='M8 40C6 20 18 8 42 6c0 24-12 36-30 34'/><path d='M8 40L28 20'/>"),
  burst:S(O,"<path d='M24 3l4 11 11-6-5 11 11 4-11 4 5 11-11-6-4 11-4-11-11 6 5-11-11-4 11-4-5-11 11 6z'/>"),
  parachute:S(B,"<path d='M5 22C5 11 13 4 24 4s19 7 19 18c-3-3-7-3-10 0-3-3-7-3-9 0-2-3-6-3-9 0-3-3-7-3-10 0z'/><path d='M5 22l15 17M43 22L28 39M24 22v17'/><circle cx='24' cy='43' r='3'/>"),
  flare:S(Y,"<circle cx='24' cy='24' r='8'/><path d='M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6'/>"),
  troops:S(O,"<circle cx='24' cy='13' r='6'/><path d='M12 42V30c0-6 5-10 12-10s12 4 12 10v12'/><circle cx='8' cy='18' r='4'/><circle cx='40' cy='18' r='4'/>"),
  bomb:S(R,"<circle cx='22' cy='30' r='14'/><path d='M32 20l6-6M36 8l4 4M34 12l4-4'/><path d='M16 26a8 8 0 0 1 6-5'/>"),
  tank:S(G,"<rect x='6' y='28' width='36' height='12' rx='6'/><path d='M12 28v-8h18v8M30 23h14'/>"),
  ban:S(R,"<circle cx='24' cy='24' r='18'/><path d='M11 37L37 11'/>"),
  bolt:S(Y,"<path d='M27 3L9 27h13l-3 18 20-26H26z'/>"),
  cloud:S(W,"<path d='M13 36a8 8 0 0 1-1-16 11 11 0 0 1 21-2 9 9 0 0 1 2 18z'/>"),
  crate:S(O,"<path d='M6 14l18-8 18 8v22l-18 8-18-8z'/><path d='M6 14l18 8 18-8M24 22v22'/>"),
  sell:S(G,"<circle cx='19' cy='19' r='13'/><path d='M23 13c-1-2-2-3-4-3-2 0-4 1-4 3 0 5 8 2 8 7 0 2-2 3-4 3-2 0-4-1-4-3'/><path d='M30 34h14M38 28l6 6-6 6'/>"),
  pause:S(W,"<path d='M16 8v32M32 8v32'/>"),
  play:S(G,"<path d='M13 7l26 17-26 17z'/>"),
  menu:S(W,"<path d='M8 12h32M8 24h32M8 36h32'/>"),
  down:S(W,"<path d='M8 16l16 16 16-16'/>"),
  up:S(W,"<path d='M8 32l16-16 16 16'/>"),
  map:S(G,"<path d='M4 10l12-4 16 4 12-4v32l-12 4-16-4-12 4z'/><path d='M16 6v32M32 10v32'/>"),
  gear:S(W,"<circle cx='24' cy='24' r='7'/><path d='M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5'/>"),
  restart:S(O,"<path d='M40 24a16 16 0 1 1-5-11.5'/><path d='M38 4v10H28'/>"),
  quit:S(R,"<path d='M18 6H8v36h10M20 24h22M34 15l9 9-9 9'/>"),
  music:S(P,"<path d='M18 36V10l22-5v26'/><circle cx='12' cy='36' r='6'/><circle cx='34' cy='31' r='6'/>"),
  sound:S(B,"<path d='M6 18h8l10-9v30l-10-9H6z'/><path d='M32 17c3 4 3 10 0 14M38 11c6 7 6 19 0 26'/>"),
  voice:S(G,"<rect x='17' y='4' width='14' height='26' rx='7'/><path d='M9 24c0 9 7 14 15 14s15-5 15-14M24 38v7'/>"),
  camera:S(W,"<path d='M4 14h9l3-6h16l3 6h9v28H4z'/><circle cx='24' cy='27' r='8'/>"),
  squad:S(G,"<circle cx='14' cy='14' r='5'/><circle cx='34' cy='14' r='5'/><circle cx='24' cy='32' r='5'/><path d='M14 19v6l10 4M34 19v6l-10 4'/>"),
  army:S(G,"<path d='M6 40V22l9-6 9 6v18M24 40V14l9-6 9 6v26'/><path d='M4 40h40'/>"),
  target:S(R,"<circle cx='24' cy='24' r='17'/><circle cx='24' cy='24' r='9'/><circle cx='24' cy='24' r='2.6' fill='#ff6a50'/>"),
  trash:S(R,"<path d='M8 12h32M18 12V6h12v6M12 12l2 30h20l2-30M20 20v16M28 20v16'/>"),
  swords:S(O,"<path d='M8 6l18 18M6 8l6 6M30 24l-6 6M12 36l6-6M40 6L22 24M42 8l-6 6M36 36l-6-6M18 30l-6 6'/><path d='M14 34l-8 8M34 34l8 8'/>"),
  check:S(G,"<path d='M8 25l11 11L40 12'/>"),
  plus:S(G,"<path d='M24 8v32M8 24h32'/>"),
  same:S(B,"<rect x='5' y='5' width='15' height='15' rx='2'/><rect x='28' y='5' width='15' height='15' rx='2'/><rect x='5' y='28' width='15' height='15' rx='2'/><rect x='28' y='28' width='15' height='15' rx='2'/>"),
  fuel:S(O,"<path d='M10 44V8h20v36M6 44h28M10 20h20M30 16l8 6v16a3 3 0 0 0 6 0V18l-6-6'/>"),
  sun:S(Y,"<circle cx='24' cy='24' r='9'/><path d='M24 4v7M24 37v7M4 24h7M37 24h7M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5'/>"),
  dusk:S(O,"<path d='M10 32a14 14 0 0 1 28 0M4 32h40M12 40h24M24 10v6M9 17l4 4M39 17l-4 4'/>"),
  moon:S(P,"<path d='M38 30A16 16 0 1 1 20 8a13 13 0 0 0 18 22z'/>"),
  rain:S(B,"<path d='M13 28a8 8 0 0 1-1-16 11 11 0 0 1 21-2 9 9 0 0 1 2 18z'/><path d='M16 34l-3 8M26 34l-3 8M36 34l-3 8'/>"),
  storm:S(O,"<path d='M6 16h24a5 5 0 1 0-5-5M6 26h34a5 5 0 1 1-5 5M6 36h18'/>"),
  snow:S(W,"<path d='M24 4v40M7 14l34 20M41 14L7 34M18 7l6 5 6-5M18 41l6-5 6 5'/>"),
  alert:S(Y,"<path d='M24 5L3 41h42z'/><path d='M24 18v12M24 35v1'/>"),
  help:S(B,"<circle cx='24' cy='24' r='18'/><path d='M18 18c0-4 3-6 6-6s6 2 6 6c0 5-6 5-6 10M24 35v1'/>"),
  skull:S(R,"<path d='M10 24c0-9 6-16 14-16s14 7 14 16c0 5-2 8-5 10v6H15v-6c-3-2-5-5-5-10z'/><circle cx='18' cy='24' r='3'/><circle cx='30' cy='24' r='3'/><path d='M22 34v6M26 34v6'/>"),
 });
 /* put the icon first in an element: <i class="ic">svg</i>; strips a leading glyph from text buttons. Once per button. */
 window.icoPut=function(el,key,keepText){if(!el||!ICON_SVG[key])return el;let i=el.querySelector(':scope>i.ic');if(!i){i=document.createElement('i');i.className='ic';el.prepend(i);}if(i.dataset.k!==key){i.dataset.k=key;i.innerHTML=ICON_SVG[key];}return el;};
 /* HUD / menu / Test range buttons: id -> icon key (a function when it depends on the label) */
 const HUD={aPause:t=>/Resume/.test(t)?'play':'pause',aPauseM:t=>/Resume/.test(t)?'play':'pause',aMenu:()=>'menu',barGrip:t=>/▴/.test(t)?'up':'down',mmBtn:()=>'map',aMus:()=>'music',aSfx:()=>'sound',aVoc:()=>'voice',aSet:()=>'gear',aRestart:()=>'restart',aQuit:()=>'quit',aPhoto:()=>'camera',
  sbFold:()=>'target',sbNations:()=>'flag',hudAl:()=>'alert',hudHelp:()=>'help',sqMake:()=>'squad',sqAll:()=>'army',sbTargets:()=>'target',sbClear:()=>'trash',sbFight:()=>'swords',resumeBtn:()=>'play',pRestart:()=>'restart',pQuit:()=>'quit'};
 const ICON_ONLY={hudHelp:1,aMenu:1,barGrip:1,mmBtn:1};
 const busy=new WeakSet();
 window.icoHud=function(){for(const id in HUD){const b=document.getElementById(id);if(!b)continue;icoOne(b,id);}};
 function icoOne(b,id){if(busy.has(b))return;busy.add(b);try{const t=b.textContent||'';const k=HUD[id](t);const keep=b.querySelector(':scope>i.dot');
   if(!ICON_ONLY[id]){let txt=''; for(const n of b.childNodes)if(n.nodeType===3)txt+=n.nodeValue;txt=txt.replace(/^[^A-Za-z0-9$]+/,'');
     const had=b.querySelector(':scope>i.ic');if(!had||b.dataset.itx!==txt){b.textContent='';icoPut(b,k);b.append(document.createTextNode(' '+txt));b.dataset.itx=txt;}else icoPut(b,k);}
   else{const had=b.querySelector(':scope>i.ic');if(!had||had.dataset.k!==k){b.textContent='';icoPut(b,k);if(keep)b.append(keep);}}
   b.classList.add('hasico');}finally{queueMicrotask(()=>busy.delete(b));}}
 const mo=new MutationObserver(ms=>{for(const m of ms){const b=m.target.nodeType===1?m.target:m.target.parentElement;if(!b)continue;const x=b.closest&&b.closest('button');if(x&&HUD[x.id])icoOne(x,x.id);}});
 window.icoWatch=function(){icoHud();for(const id in HUD){const b=document.getElementById(id);if(b&&!b.dataset.icw){b.dataset.icw=1;mo.observe(b,{childList:true,characterData:true,subtree:true});}}};
 const st=document.createElement('style');st.textContent=`i.ic{display:inline-flex;align-items:center;justify-content:center;font-style:normal;pointer-events:none;width:1.2em;height:1.2em;max-width:2.4em;max-height:2.4em;flex:none}i.ic svg{width:100%;height:100%;display:block;filter:drop-shadow(0 1px 1px #000)}
button.hasico>i.ic,.menuitem>i.ic{width:1.15em;height:1.15em;vertical-align:-.22em;margin-right:.2em}
button.hasico.ico1>i.ic,#aMenu>i.ic,#barGrip>i.ic,#mmBtn>i.ic,#zhStar>i.ic{width:1.25em;height:1.25em;margin:0}
#sbx button>i.ic{width:20px!important;height:20px!important;margin:0 6px 0 0!important;flex:none}#sbCond button>i.ic{display:block;margin:0 auto 2px!important}
.zp>i.ic{position:static;width:22px;height:22px;float:left;margin:0 8px 0 0}#zhSell>i.ic,#zhRep>i.ic,#zhLaunch>i.ic{width:1.3em;height:1.3em;margin-right:6px}.zsw button>i.ic{width:1.2em;height:1.2em;margin-right:5px;vertical-align:-.25em}`;document.head.append(st);}
