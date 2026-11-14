/* ================= ZERO HOUR COMMAND BAR LAYOUT (Abdullah 2026-11-14 14:13, sent the original C&C Generals Zero Hour control bar: "Exactly like the picture",
   "Pictures + hover card"). Layered over the gunmetal plate of 08o-genbar.js; view only, no per-frame work (the context check runs inside updateUI).
   Layout, left to right: minimap | small side buttons | ONE picture grid (no tabs: it shows what the selection can do) | unit portrait | general rank strip.
   Money sits in a plate on the top edge in the middle; the ★ button (top right) opens the generals' powers + Strike in the same grid.
   Hovering a picture shows its name, cost and text in a card above the minimap, as in Zero Hour. Hotkey letters and the Auto-build toggle are hidden. */
{const st=document.createElement('style');st.textContent=`@media(min-width:900px){
/* ZERO HOUR BAR v2 (Abdullah 15:02-15:05 sent three more Zero Hour shots): short steel bar with the nation's colour on the trim, minimap left,
   3 small side buttons, a dark panel with small picture buttons in 2 rows from the left (no words), unit orders as pictures at the right end,
   money plate on the top edge, portrait (or the nation's emblem when nothing is selected) on the right, thin rank bar, ▼ and ★ tabs on top right */
html body #side{--gbH:clamp(176px,20vh,226px);--zb:clamp(70px,calc((var(--gbH) - 44px)/1.6),120px);--tc:#4f88c6;height:var(--gbH)!important;padding:12px 12px 8px!important;gap:0 8px!important;
 grid-template-columns:clamp(196px,14.5vw,262px) 42px minmax(0,1fr) clamp(180px,13vw,240px) 22px!important;grid-template-rows:minmax(0,1fr)!important;background:radial-gradient(circle at 8px 8px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),radial-gradient(circle at calc(100% - 8px) 8px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),linear-gradient(180deg,var(--tc) 0 3px,transparent 3px),repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px),linear-gradient(180deg,#eef2f5 0,#c9d2da 12%,#a6b1bb 40%,#88949f 72%,#6b7681 100%)!important;box-shadow:inset 0 -3px 0 #1a1f24,0 -1px 0 #f4f7f9!important}
html body #side::before{top:-14px!important;clip-path:polygon(0 14px,calc(50% - 130px) 14px,calc(50% - 108px) 0,calc(50% + 108px) 0,calc(50% + 130px) 14px,100% 14px,100% 100%,0 100%)!important;
 background:radial-gradient(circle at 8px 22px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),radial-gradient(circle at calc(100% - 8px) 22px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),
  linear-gradient(180deg,transparent 0 13px,var(--tc) 13px 17px,transparent 17px),repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px),
  linear-gradient(180deg,#f2f5f7 0,#cdd5dc 10%,#a9b4be 38%,#8b97a2 70%,#6e7984 100%)!important;
 box-shadow:inset 0 2px 0 #f1f5f8,inset 0 -3px 0 #1a1f24,inset 3px 0 0 #d2d9df,inset -3px 0 0 #1a1f24!important}
html body #side #sideTop{grid-column:1!important;grid-row:1!important;padding:6px!important;background:#0a0f12!important;border-radius:6px!important;box-shadow:inset 0 0 0 2px #2a3138,0 0 0 2px #dfe5ea,0 0 0 4px #5d6873!important}
html body #side #sideTop::after{display:none!important}
html body #side .cardhd,html body #side .tabs,html body #side .sqbar,html body #side #facname,html body #side #mmBtn{display:none!important}
/* side buttons */
html body #side .stat>.hdr{grid-column:2!important;grid-row:1!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;align-items:stretch;gap:4px!important;padding:2px 0!important;background:none!important;box-shadow:none!important}
html body #side .stat>.hdr button{width:40px;height:30px;padding:0!important;font:700 13px system-ui,sans-serif!important;color:#fff;border-radius:4px;border:1px solid #1a1f24;overflow:hidden;white-space:nowrap;
 background:linear-gradient(180deg,color-mix(in srgb,var(--tc) 70%,#fff),var(--tc) 55%,color-mix(in srgb,var(--tc) 60%,#000))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 1px 0 #0b0d0f!important}
html body #side .stat>.hdr #aPause{font-size:0!important}html body #side .stat>.hdr #aPause::before{content:"❚❚";font-size:13px}
html body #side .stat>.hdr #aMenu{margin:0!important}
/* ▼ fold and ★ powers tabs on the top right */
html body #side #barGrip{display:block!important;position:absolute!important;right:62px;top:-26px;width:52px!important;height:24px!important;z-index:4;font-size:14px!important}
html body #side #zhStar,html body #side #barGrip{border-radius:4px 4px 0 0!important;border:1px solid #1a1f24!important;color:#fff!important;
 background:linear-gradient(180deg,#d9e0e6,#8d98a3 40%,var(--tc) 41%,color-mix(in srgb,var(--tc) 55%,#000))!important;box-shadow:inset 0 1px 0 #fff!important}
html body #side #zhStar{position:absolute!important;right:8px;top:-26px;width:52px;height:24px;z-index:4;font:900 13px system-ui,sans-serif!important;letter-spacing:-1px;color:#ffe680!important;text-shadow:0 1px 0 #000}
html body #side #zhStar.on{background:linear-gradient(180deg,#fff2b0,#d6a92c)!important;color:#3a2a00!important}
html body #side #zhStar .dot{position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:#ff5a3c;box-shadow:0 0 6px #ff5a3c}
html body #side #zhStar.rdy{animation:zhPulse 1.4s ease-in-out infinite}@keyframes zhPulse{50%{box-shadow:0 0 12px #ffe680}}
/* money plate */
html body #side #credits{position:absolute!important;top:-12px;left:50%;transform:translateX(-50%);z-index:3;min-width:170px;text-align:center;margin:0!important;padding:2px 14px!important;
 font:700 16px "IBM Plex Mono",ui-monospace,monospace!important;color:#e9eef2!important;text-shadow:none!important;background:linear-gradient(180deg,#0e1216,#1d242a)!important;border-radius:4px;box-shadow:inset 0 0 0 1px #000,0 0 0 2px #aeb8c1,0 2px 4px rgba(0,0,0,.5)!important}
html body #side #popCap{position:absolute!important;top:-9px;left:calc(50% + 100px);z-index:3;margin:0!important;font:700 11px system-ui,sans-serif!important;padding:2px 7px;border-radius:3px;background:rgba(10,13,16,.85)}
/* the picture panel */
html body #side #panel{grid-column:3!important;grid-row:1!important;display:grid!important;grid-template-columns:repeat(auto-fill,var(--zb))!important;grid-template-rows:none!important;grid-auto-rows:calc(var(--zb)*.86)!important;
 gap:4px!important;padding:6px!important;align-content:start!important;justify-content:start!important;overflow-y:auto!important;border-radius:4px!important;
 background:linear-gradient(180deg,#0c2522,#06140f)!important;box-shadow:inset 0 0 0 1px #000,inset 0 0 0 3px #39434c,0 0 0 2px #cfd7de!important}
html body #side #panel .btn{position:relative!important;padding:0!important;margin:0!important;width:auto!important;height:auto!important;min-height:0!important;border-radius:1px!important;overflow:hidden;
 border:1px solid color-mix(in srgb,var(--tc) 75%,#fff)!important;background-color:#1b2a22!important;background-size:auto 60%!important;background-repeat:no-repeat!important;background-position:center 14%!important;box-shadow:inset 0 0 0 1px #000!important;transform:none!important}
html body #side #panel .btn>*:not(.q):not(.p):not(.n){display:none!important}
html body #side #panel .btn>.n{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;position:absolute!important;left:0;right:0;bottom:0;margin:0!important;padding:2px 3px!important;font:700 11px/1.15 system-ui,Segoe UI,sans-serif!important;color:#f2f6f8!important;text-align:center;white-space:normal!important;text-overflow:clip!important;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.8))!important;text-shadow:0 1px 1px #000}
html body #side #panel .btn:not(.hasic){background-image:none!important}
html body #side #panel .btn:not(.hasic)>.n{display:block!important;position:static!important;font:700 11px/1.15 system-ui,sans-serif!important;color:#e8eef2;white-space:normal;text-align:center;padding:3px}
html body #side #panel .btn:hover:not(:disabled){box-shadow:inset 0 0 0 2px #fff,0 0 8px var(--tc)!important}
html body #side #panel .btn:disabled,html body #side #panel .btn.dis{filter:grayscale(.9) brightness(.5)!important}
html body #side #panel .btn .q{position:absolute!important;right:3px;top:2px;font:800 14px system-ui,sans-serif!important;color:#fff;text-shadow:0 0 3px #000,0 1px 1px #000}
html body #side #panel .btn .p{position:absolute!important;left:0;bottom:0;height:100%!important;background:rgba(0,0,0,.55)!important;box-shadow:none!important;border-radius:0!important;opacity:.9}
html body #side #panel .zhEmpty{display:none!important}
/* unit orders as pictures at the right end of the panel */
.orddock.zhin{right:auto!important;bottom:auto!important;min-width:0!important;padding:6px!important;background:none!important;box-shadow:none!important;border:0!important;display:flex!important;flex-wrap:wrap-reverse;justify-content:flex-end;align-content:flex-start;gap:4px;pointer-events:none}
.orddock.zhin .cmdrow{display:contents!important}
.orddock.zhin button{pointer-events:auto;width:var(--zb,74px)!important;height:calc(var(--zb,74px)*.8)!important;padding:0!important;margin:0!important;font-size:0!important;border-radius:1px!important;border:1px solid #9fc0e0!important;
 background:radial-gradient(circle at 50% 40%,#3b5566,#101a20 80%)!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important}
.orddock.zhin button>i{position:static!important;margin:0!important;transform:none!important;display:block!important;width:100%!important;flex:1 1 100%!important;text-align:center!important;line-height:1!important;padding:0!important;font-size:30px!important;font-style:normal;filter:drop-shadow(0 1px 1px #000)}
.orddock.zhin button:hover{box-shadow:inset 0 0 0 2px #fff,0 0 8px #6fb0ff!important}
.orddock{right:126px!important}
/* portrait / emblem + rank */
html body #side #info{grid-column:4!important;grid-row:1!important;padding:4px!important;overflow:hidden!important;font-size:12px!important;border-radius:4px!important;background:linear-gradient(180deg,#0e1820,#060b10)!important;box-shadow:inset 0 0 0 1px #000,inset 0 0 0 3px #39434c,0 0 0 2px #cfd7de!important}
html body #side #info .ukU{flex-direction:column!important;align-items:stretch!important;gap:3px!important;margin:0!important}
html body #side #info .ukU img,html body #side #info .ukU canvas{width:100%!important;height:calc(var(--gbH) - 72px)!important;object-fit:cover!important;border-radius:1px!important;border:1px solid color-mix(in srgb,var(--tc) 75%,#fff)}
html body #side #info .ukUt b{font-size:13px!important}
html body #side.zhnosel #info{display:none!important}
html body #side #zhEmb{display:none}html body #side.zhnosel #zhEmb{display:flex;grid-column:4;grid-row:1;align-items:center;justify-content:center;border-radius:4px;background:radial-gradient(circle,#18232c,#060b10 75%);box-shadow:inset 0 0 0 1px #000,inset 0 0 0 3px #39434c,0 0 0 2px #cfd7de}
html body #side #zhEmb i{width:62%;aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 54px system-ui,sans-serif;font-style:normal;color:#fff;text-shadow:0 2px 3px #000;
 background:radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--tc) 60%,#fff),var(--tc) 55%,color-mix(in srgb,var(--tc) 50%,#000));box-shadow:0 0 0 5px #d9b54a,0 0 0 7px #6b4f12,0 4px 10px #000}
html body #side .stat>.sup.rk{grid-column:5!important;grid-row:1!important;display:flex!important;flex-direction:column!important;padding:2px!important;gap:3px!important;border-radius:3px!important;background:#0a0f12!important}
html body #side .stat>.sup.rk .lbl{display:none!important}
html body #side .stat>.sup.rk .bar{width:100%!important;height:auto!important;flex:1;display:flex;flex-direction:column-reverse;background:repeating-linear-gradient(0deg,#0f1a12 0 7px,#000 7px 9px)!important}
html body #side .stat>.sup.rk .bar i{display:block;width:100%!important;height:var(--rk,0%)!important;background:repeating-linear-gradient(0deg,#ffd23a 0 7px,transparent 7px 9px)!important;box-shadow:none!important}
html body #side .stat>.sup.sw{display:none!important}
html body #side.zhpow .stat>.sup.sw{display:flex!important;grid-column:4!important;grid-row:1!important;position:static!important;padding:8px!important}
html body #side.zhpow #info,html body #side.zhpow #zhEmb{display:none!important}
#cmdP{bottom:auto!important;top:64px!important;left:10px!important;right:auto!important}
html body #side#side{background:radial-gradient(circle at 8px 8px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),radial-gradient(circle at calc(100% - 8px) 8px,#e7ecf0 0 2px,#3a4148 3px 4px,transparent 5px),linear-gradient(180deg,var(--tc) 0 3px,transparent 3px),repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px),linear-gradient(180deg,#eef2f5 0,#c9d2da 12%,#a6b1bb 40%,#88949f 72%,#6b7681 100%)!important}
#hudLyB{display:none!important}
/* ▼ folds the whole bar down off the screen; only the ▼/★ tabs stay (Abdullah 16:33 "Make this down arrow minimize the entire bar") */
html body #side.min{height:0!important;min-height:0!important;padding:0!important;overflow:visible!important;background:none!important;box-shadow:none!important;border:0!important}
html body #side.min #sideTop,html body #side.min #panel,html body #side.min .ccard,html body #side.min #info,html body #side.min .sup,html body #side.min #zhEmb,html body #side.min #zhPw,html body #side.min #credits,html body #side.min #popCap{display:none!important}
html body #side.min .stat>.hdr>:not(#barGrip){display:none!important}
html body #side.min::before{display:none!important}
html body #side.min #barGrip,html body #side.min #zhStar{top:-26px!important}   /* Abdullah 2026-11-14 "Remove map layers" */
html body #side kbd,html body #side .hk,#tstrip .hk,.orddock kbd,.abc{display:none!important}
}

/* ★ = the general's window on the right (Abdullah 16:34 "Have the stars when selected open a completely new menu window on the right hand side") */
#zhPow{position:fixed;right:12px;z-index:40;width:clamp(320px,24vw,430px);max-height:62vh;display:flex;flex-direction:column;border-radius:6px;overflow:hidden;font:14px/1.35 system-ui,Segoe UI,sans-serif;color:#eef3f6;
 background:linear-gradient(180deg,#14202a,#0a1219);box-shadow:0 0 0 2px #cfd7de,0 0 0 4px var(--tc,#4f88c6),0 10px 30px rgba(0,0,0,.6)}
#zhPow[hidden]{display:none}
#zhPow .zph{display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(180deg,#d9e0e6,#8d98a3);color:#101418;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
#zhPow .zph span{flex:1}#zhPow .zph button{border:0;background:none;font:900 18px system-ui;cursor:pointer;color:#101418}
#zhPow .zpb{overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
#zhPow .zrk{color:#ffd23a;font-weight:700}
#zhPow .zsw{padding:10px;border-radius:4px;background:#0c171f;box-shadow:inset 0 0 0 1px #2f4352;display:flex;align-items:center;gap:10px}
#zhPow .zsw div{flex:1}#zhPow .zsw b{display:block}#zhPow .zsw small{color:#f4d96a}
#zhPow .zsw button{font:800 13px system-ui;letter-spacing:.1em;padding:8px 14px;border-radius:4px;border:1px solid #2a0d08;color:#fff;background:linear-gradient(180deg,#d65a3c,#8f2a18);cursor:pointer}
#zhPow button:disabled{filter:grayscale(.9) brightness(.6);cursor:default}
#zhPow .zsub{margin-top:4px;font:800 12px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#9fb3c2}
#zhPow .zp{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:7px 10px;border-radius:4px;border:1px solid #2f4352;background:linear-gradient(180deg,#1d2c38,#122029);color:#eef3f6;cursor:pointer}
#zhPow .zp:hover:not(:disabled){box-shadow:inset 0 0 0 2px #fff}
#zhPow .zp b{font-size:14px}#zhPow .zp i{font-style:normal;color:#f4d96a;font-size:12px}#zhPow .zp span{font-size:12px;color:#b9c7d2}

/* power meter on the top edge of the bar, left of the money (Zero Hour style; Abdullah 16:36 "Where is power level?") */
html body #side #zhPw{position:absolute;top:-9px;right:calc(50% + 96px);z-index:3;width:clamp(160px,13vw,240px);height:18px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:3px;
 background:linear-gradient(180deg,#0e1216,#1d242a);box-shadow:inset 0 0 0 1px #000,0 0 0 2px #aeb8c1;font:700 11px system-ui,sans-serif;color:#dfe6ea;white-space:nowrap}
html body #side #zhPw .zb{flex:1;height:8px;border-radius:2px;background:#000;overflow:hidden;box-shadow:inset 0 0 0 1px #333}
html body #side #zhPw .zb i{display:block;height:100%;background:linear-gradient(90deg,#4cd964,#b8f36a)}
html body #side #zhPw.low{color:#ff8a78}html body #side #zhPw.low .zb i{background:linear-gradient(90deg,#ff5a3c,#ff9a5a)}
html body #side.min #zhPw{display:none!important}
#zhTip{position:fixed;left:10px;z-index:60;width:clamp(240px,22vw,380px);pointer-events:none;padding:10px 14px;border-radius:4px;color:#e9efdc;font:14px/1.4 system-ui,sans-serif;
 background:linear-gradient(180deg,rgba(14,22,40,.95),rgba(8,14,30,.95));box-shadow:inset 0 0 0 1px #000,inset 0 0 0 2px #3a5ea8,0 4px 14px rgba(0,0,0,.6)}
#zhTip b{display:block;text-align:center;font-size:16px;margin-bottom:4px}#zhTip .zc{color:#f4d96a;font-weight:700}#zhTip .zd{color:#c9d3bd;margin-top:3px}#zhTip .zw{color:#ff9a7a;margin-top:3px}`;document.head.append(st);}

const ZH={star:false,sig:'',pow:0};
/* which grid the selection gets: Construction Vehicle -> buildings; a production building -> its units; any other own building -> upgrades;
   ★ -> generals' powers + Strike; nothing that can act -> an empty grid (as in Zero Hour) */
function zhWant(){if(!G)return null;const s=(G.sel||[]).filter(e=>e&&!e.dead&&e.team===ME);
  if(s.some(u=>u.kind==='dozer'))return 'build';const b=s.find(e=>e.isB);if(b){if(typeof CATS!=='undefined'&&CATS.includes(b.kind))return 'units';return 'upg';}return 'none';}
function zhCtx(){if(!G||G.grand)return;const sd=$('side');if(!sd)return;
  let star=$('zhStar');if(!star){star=document.createElement('button');star.id='zhStar';star.type='button';star.title='Generals\' powers and Strike';star.innerHTML='★★★<i class="dot" hidden></i>';
    star.onclick=()=>{ZH.star=!ZH.star;ZH.sig='';zhPowWin();zhCtx();};sd.append(star);}
  {const T=G.teams[ME];if(T&&sd.dataset.tc!==T.color){sd.dataset.tc=T.color;sd.style.setProperty('--tc',T.color);}}
  {let pw=$('zhPw');if(G.battle&&typeof pwView==='function'){if(!pw){pw=document.createElement('div');pw.id='zhPw';pw.innerHTML='<span></span><span class="zb"><i></i></span>';sd.append(pw);}const v=pwView(),k=v.make+'|'+v.use;if(pw.dataset.k!==k){pw.dataset.k=k;pw.classList.toggle('low',!!v.low);pw.firstChild.textContent='⚡ POWER '+v.use+' / '+v.make;pw.querySelector('i').style.width=Math.round(100*Math.min(1,v.use/Math.max(1,v.make)))+'%';pw.title=v.low?'LOW POWER: build a Generator - powered buildings are offline':'Power used / produced';}}else if(pw)pw.remove();}
  let emb=$('zhEmb');if(!emb){emb=document.createElement('div');emb.id='zhEmb';emb.innerHTML='';sd.append(emb);}
  sd.classList.toggle('zhnosel',!(G.sel||[]).some(e=>e&&!e.dead&&e.team===ME));
  const sig=(G.sel||[]).map(e=>e.id).join(',');if(sig!==ZH.sig)ZH.sig=sig;try{zhPowWin();}catch(e){}
  star.classList.toggle('on',ZH.star);{const pd=document.querySelector('.tabs button[data-tab="pow"] .dot');const d=star.querySelector('.dot');if(d)d.hidden=!(pd&&!pd.hidden&&getComputedStyle(pd).display!=='none');}
  const w=zhWant();if(w&&TAB!==w)showTab(w);
  /* a selected building shows its own upgrades next to its units (upgrades are researched at their building: Abdullah 14:37) */
  {const pnU=$('panel'),sb=(G.sel||[]).find(e=>e&&!e.dead&&e.isB&&e.team===ME);if(pnU)for(const u of pnU.querySelectorAll(':scope>[data-tab="upg"]')){const want=!!sb&&u.dataset.from===sb.kind&&(w==='units'||w==='upg');if(u.classList.contains('sub')){u.hidden=true;continue;}if(u.hidden===want)u.hidden=!want;}}sd.classList.toggle('zhpow',w==='pow');{const sb=$('supbtn');star.classList.toggle('rdy',!!(sb&&!sb.disabled)&&!ZH.star);}
  {const od=document.querySelector('.orddock');const pn0=$('panel');if(od&&pn0&&innerWidth>=900){if((w==='none'||w==='build')&&!od.classList.contains('empty')){const r=pn0.getBoundingClientRect(),n=od.querySelectorAll('button').length,zb=(pn0.querySelector('.btn:not([hidden])')||{}).offsetWidth||90,cols=w==='build'?Math.ceil(n/2):Math.max(1,Math.ceil(r.width/(zb+4))),ow=Math.min(r.width,cols*(zb+4)+12);od.classList.add('zhin');od.style.left=(r.right-ow)+'px';od.style.top=r.top+'px';od.style.width=ow+'px';od.style.height=r.height+'px';if(w==='build')pn0.style.setProperty('padding-right',(ow+4)+'px','important');else pn0.style.removeProperty('padding-right');}else if(od.classList.contains('zhin')){od.classList.remove('zhin');pn0.style.removeProperty('padding-right');od.style.left=od.style.top=od.style.width=od.style.height='';}}}
  const pn=$('panel');if(pn){let e=pn.querySelector('.zhEmpty');const od2=document.querySelector('.orddock.zhin');const vis=!!od2||[...pn.querySelectorAll(':scope>[data-tab]')].some(b=>!b.hidden&&b.dataset.tab===TAB);
    if(!vis){if(!e){e=document.createElement('div');e.className='zhEmpty';pn.append(e);}e.textContent=w==='none'?'Select your Construction Vehicle to build, or a building to train units':'Nothing available here yet';e.hidden=false;}else if(e)e.hidden=true;}
  {const rk=document.querySelector('#side .sup.rk .bar i');if(rk){const wd=rk.style.width;if(wd&&rk.style.getPropertyValue('--rk')!==wd)rk.style.setProperty('--rk',wd);}}}

function zhPowWin(){let w=$('zhPow');if(!ZH.star||!G){if(w)w.hidden=true;return;}const sd=$('side');
  if(!w){w=document.createElement('div');w.id='zhPow';w.innerHTML='<div class="zph"><span>General</span><button type="button" title="Close (Esc)">✕</button></div><div class="zpb"></div>';document.body.append(w);
    w.querySelector('.zph button').onclick=()=>{ZH.star=false;zhPowWin();zhCtx();};addEventListener('keydown',e=>{if(e.key==='Escape'&&ZH.star){ZH.star=false;zhPowWin();zhCtx();}},true);}
  w.hidden=false;if(sd){const r=sd.getBoundingClientRect();w.style.bottom=(innerHeight-r.top+34)+'px';w.style.setProperty('--tc',getComputedStyle(sd).getPropertyValue('--tc'));}
  const body=w.querySelector('.zpb'),rk=document.querySelector('#side .sup.rk .lbl'),src=[...document.querySelectorAll('#panel>[data-tab="pow"]')];
  const sig=src.map(b=>(b.className.includes('sub')?'s':'')+b.id+(b.disabled?1:0)+(b.hidden?1:0)+(b.textContent||'').length).join('|')+'|'+(rk?rk.textContent:'')+'|'+(($('supt')||{}).textContent||'')+(($('supbtn')||{}).disabled?1:0);if(w.dataset.sig===sig)return;w.dataset.sig=sig;
  body.innerHTML='';if(rk){const d=document.createElement('div');d.className='zrk';d.textContent=rk.textContent.trim();body.append(d);}
  {const sb=$('supbtn'),d=document.createElement('div');d.className='zsw';d.innerHTML='<div><b></b><small></small></div><button type="button">LAUNCH</button>';d.querySelector('b').textContent=(($('supname')||{}).textContent||'Strike');d.querySelector('small').textContent=(($('supt')||{}).textContent||'');
    const lb=d.querySelector('button');lb.disabled=!sb||sb.disabled;lb.onclick=()=>{if(sb&&!sb.disabled)sb.click();};body.append(d);}
  for(const b of src){if(b.classList.contains('sub')){const s=document.createElement('div');s.className='zsub';s.textContent=b.textContent;body.append(s);continue;}if(b.style.display==='none')continue;
    const x=document.createElement('button');x.type='button';x.className='zp';x.disabled=b.disabled;const n=document.createElement('b');n.textContent=(b.querySelector('.n')||{}).textContent||b.dataset.nm||'';x.append(n);
    const c=(b.querySelector('.c')||{}).textContent;if(c){const i=document.createElement('i');i.textContent=c;x.append(i);}const dd=b.dataset.desc;if(dd){const s=document.createElement('span');s.textContent=dd;x.append(s);}
    x.title=b.title||'';x.onclick=()=>{b.click();setTimeout(()=>{w.dataset.sig='';zhPowWin();},50);};body.append(x);}}
if(typeof updateUI==='function'){const _zhU=updateUI;updateUI=function(){_zhU.apply(this,arguments);try{zhCtx();}catch(e){}};}
/* hover card above the minimap */
{let tip=null;const show=b=>{if(!tip){tip=document.createElement('div');tip.id='zhTip';document.body.append(tip);}const sd=$('side'),r=sd?sd.getBoundingClientRect():null;
    const nm=b.dataset.nm||(b.querySelector('.n')||{}).textContent||b.getAttribute('aria-label')||b.title||'',c=(b.querySelector('.c')||{}).textContent||'',d=b.dataset.desc||'',why=b.disabled&&b.title&&b.title!==d?b.title:'';
    tip.innerHTML='';const h=document.createElement('b');h.textContent=nm;tip.append(h);if(c){const x=document.createElement('div');x.className='zc';x.textContent=/^\$|^\d/.test(c)?'Cost: '+c:c;tip.append(x);}
    if(d){const x=document.createElement('div');x.className='zd';x.textContent=d;tip.append(x);}if(why){const x=document.createElement('div');x.className='zw';x.textContent=why;tip.append(x);}
    tip.style.bottom=(r?innerHeight-r.top+18:300)+'px';tip.hidden=false;};
  document.addEventListener('mouseover',e=>{const b=e.target&&e.target.closest&&e.target.closest('#panel .btn,.orddock.zhin button');if(b&&innerWidth>=900)show(b);else if(tip&&!tip.hidden)tip.hidden=true;},true);}
/* PICTURE BUTTONS ("Pictures + hover card"): every Build/Units button and the portrait show a small rendered picture of the real 3D model the battle
   uses (three-quarter view, the player's colour, over a sky-and-ground backdrop), like the Zero Hour cameos. Drawn once per kind with the battle's own
   renderer into an off-screen target, one picture per idle moment (never inside a busy frame), cached for the visit. The flat icon stays until then. */
const ZHC={cache:new Map(),q:[],busy:false,rt:null,scn:null,cam:null};
function zhCamScene(){if(ZHC.scn)return;const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(lin('#d6e2f5'),lin('#5a4a33'),1.15*LUX));
  const sun=new THREE.DirectionalLight(lin('#fff0d8'),2.7*LUX);sun.position.set(-200,320,240);sc.add(sun);ZHC.scn=sc;ZHC.cam=new THREE.PerspectiveCamera(30,4/3,1,4000);
  ZHC.rt=new THREE.WebGLRenderTarget(288,216,{samples:4});ZHC.rt.texture.colorSpace=THREE.SRGBColorSpace;}
function zhCamBuild(f,k,b){const F=FACTIONS[f],T0=G&&G.teams&&G.teams[ME],col=(T0&&T0.fac===f&&T0.color)||F.color,T={id:0,fac:f,F,sup:F.sup,color:col,dark:shade(col,.45),credits:0,upg:{},pw:{},st:null};
  const s=b?bstats(f,k):stats(f,k);const e=b?{id:3,kind:k,team:0,isB:true,x:0,y:0,size:s.size,s,hp:s.hp,max:s.hp,built:1,ang:0}:{id:3,kind:k,team:0,isB:false,x:0,y:0,s,hp:s.hp,max:s.hp,ang:0,va:0};
  const g0=G,s0=SCN;const stub=Object.assign(Object.create(g0||null),{teams:[T],t:0,ents:[],byId:new Map(),map:(g0&&g0.map)||{theme:'temperate'}});G=stub;SCN=ZHC.scn;let o=null;try{o=makeObj(e);}finally{G=g0;SCN=s0;}return o;}
function zhCamShot(f,k,b){if(typeof R3==='undefined'||!R3||typeof makeObj!=='function')return null;zhCamScene();const o=zhCamBuild(f,k,b);if(!o)return null;o.traverse(m=>{if(m.isMesh||m.isInstancedMesh){m.frustumCulled=false;m.visible=m.visible!==false;}});
  try{o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o),ctr=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.y*1.3,sz.z)||40;
    const wr=new THREE.Group();o.position.sub(new THREE.Vector3(ctr.x,bb.min.y,ctr.z));wr.add(o);wr.rotation.y=b?.55:-.75;ZHC.scn.add(wr);
    const R=r*1.62+8,p=b?.5:.36;ZHC.cam.position.set(Math.sin(.6)*Math.cos(p)*R,Math.sin(p)*R+sz.y*.35,Math.cos(.6)*Math.cos(p)*R);ZHC.cam.lookAt(0,sz.y*.42,0);ZHC.cam.updateProjectionMatrix();
    const pc=new THREE.Color(),pa=R3.getClearAlpha();R3.getClearColor(pc);const prt=R3.getRenderTarget();R3.setRenderTarget(ZHC.rt);R3.setClearColor(0x000000,0);R3.clear(true,true,true);R3.render(ZHC.scn,ZHC.cam);
    const W=288,H=216,px=new Uint8Array(W*H*4);R3.readRenderTargetPixels(ZHC.rt,0,0,W,H,px);R3.setRenderTarget(prt);R3.setClearColor(pc,pa);ZHC.scn.remove(wr);
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
    {const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7f9db8');g.addColorStop(.55,'#c9c3a8');g.addColorStop(.56,'#8a7a58');g.addColorStop(1,'#4e4532');x.fillStyle=g;x.fillRect(0,0,W,H);}
    {let n=0;for(let i=3;i<px.length;i+=16)if(px[i]>20)n++;if(n<W*H/16*.02)return null;}const im=x.createImageData(W,H);for(let y=0;y<H;y++)im.data.set(px.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);const t=document.createElement('canvas');t.width=W;t.height=H;t.getContext('2d').putImageData(im,0,0);x.drawImage(t,0,0);
    {const v=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=v;x.fillRect(0,0,W,H);}
    return cv;}catch(err){console.warn('cameo',k,err);return null;}}
/* Abdullah 2026-11-14 15:33 "We don't need 3d models now": the flat picture icons stay; no 3D renders are made */
function zhCamGet(f,k,b){return null;}
function zhCamWant(f,k,b){const key=f+'|'+k+'|'+(b?1:0);if(ZHC.cache.has(key)||ZHC.q.some(q=>q.key===key))return;ZHC.q.push({key,f,k,b});zhCamPump();}
function zhCamPump(){if(ZHC.busy||!ZHC.q.length)return;ZHC.busy=true;const go=()=>{ZHC.busy=false;const it=ZHC.q.shift();if(!it)return;let cv=null;try{cv=zhCamShot(it.f,it.k,it.b);}catch(e){}ZHC.cache.set(it.key,cv);zhCamPaint();zhCamPump();};
  (window.requestIdleCallback?requestIdleCallback(go,{timeout:700}):setTimeout(go,60));}
function zhCamPaint(){if(!G||!G.teams||!G.teams[ME])return;const f=G.teams[ME].fac,pn=$('panel');if(pn)for(const btn of pn.querySelectorAll('.btn.hasic')){const tab=btn.dataset.tab;if(tab!=='build'&&tab!=='units')continue;const k=btn.id.slice(2),b=tab==='build',cv=btn.querySelector('canvas.uic');if(!cv)continue;if(!btn.dataset.zbg){btn.dataset.zbg='f';try{btn.style.setProperty('background-image','url('+cv.toDataURL()+')','important');}catch(e){}}
    const c=zhCamGet(f,k,b);if(c===undefined){if(!btn.hidden)zhCamWant(f,k,b);continue;}if(c&&btn.dataset.zbg!=='c'){btn.dataset.zbg='c';btn.style.setProperty('background-image','url('+(c._u||(c._u=c.toDataURL('image/jpeg',.85)))+')','important');}}
  const im=document.querySelector('#side #info .ukU img,#side #info .ukU canvas');if(im){const s=(G.sel||[]).find(e=>e&&!e.dead&&e.team===ME);if(s){const c=zhCamGet(f,s.kind,!!s.isB);if(c===undefined)zhCamWant(f,s.kind,!!s.isB);else if(c&&im.dataset.cam!==s.kind){im.dataset.cam=s.kind;if(im.tagName==='IMG')im.src=c._u||(c._u=c.toDataURL('image/jpeg',.85));else{const x=im.getContext('2d');x.clearRect(0,0,im.width,im.height);x.drawImage(c,0,0,im.width,im.height);}}}}}
{const _z=zhCtx;zhCtx=function(){_z();try{if(innerWidth>=900)zhCamPaint();}catch(e){}};}
/* the battlefield grows into the space when the bar is folded down, and shrinks back when it returns (Abdullah 16:54 "When dropping down the screen should expand") */
if(typeof barMin==='function'){const _zb=barMin;barMin=function(v){const r=_zb.apply(this,arguments);if(v!=null){const fx=()=>{try{barH();resize();}catch(e){}};requestAnimationFrame(fx);setTimeout(fx,120);}return r;};}
