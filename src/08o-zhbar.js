/* ================= ZERO HOUR COMMAND BAR LAYOUT (Abdullah 2026-11-14 14:13, sent the original C&C Generals Zero Hour control bar: "Exactly like the picture",
   "Pictures + hover card"). Layered over the gunmetal plate of 08o-genbar.js; view only, no per-frame work (the context check runs inside updateUI).
   Layout, left to right: minimap | small side buttons | ONE picture grid (no tabs: it shows what the selection can do) | unit portrait | general rank strip.
   Money sits in a plate on the top edge in the middle; the ★ button (top right) opens the generals' powers + Strike in the same grid.
   Hovering a picture shows its name, cost and text in a card above the minimap, as in Zero Hour. Hotkey letters and the Auto-build toggle are hidden. */
{const st=document.createElement('style');st.textContent=`@media(min-width:900px){
/* ZERO HOUR BAR v2 (Abdullah 15:02-15:05 sent three more Zero Hour shots): short steel bar with the nation's color on the trim, minimap left,
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
html body #side .cardhd{position:absolute!important;left:0;top:0;width:0!important;height:0!important;padding:0!important;margin:0!important;overflow:visible!important}
html body #side #fmb:not(.zhfm){display:none!important}
html body #side .tabs,html body #side .sqbar>:not(#fmb),html body #side #facname,html body #side #mmBtn{display:none!important}
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
html body #side #panel .btn>*:not(.q):not(.p):not(.n):not(.ic):not(.zhIc){display:none!important}
html body #side #panel .btn>.n{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;position:absolute!important;left:0;right:0;bottom:0;margin:0!important;padding:2px 3px!important;font:700 11px/1.15 system-ui,Segoe UI,sans-serif!important;color:#f2f6f8!important;text-align:center;white-space:normal!important;text-overflow:clip!important;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.8))!important;text-shadow:0 1px 1px #000}
html body #side #panel .btn:not(.hasic){background-image:none!important}
html body #side #panel .btn:not(.hasic)>.n{display:block!important;position:static!important;font:700 11px/1.15 system-ui,sans-serif!important;color:#e8eef2;white-space:normal;text-align:center;padding:3px}
html body #side #panel .btn:hover:not(:disabled){box-shadow:inset 0 0 0 2px #fff,0 0 8px var(--tc)!important}
html body #side #panel .btn:disabled,html body #side #panel .btn.dis{filter:grayscale(.9) brightness(.5)!important}
html body #side #panel .btn .q{position:absolute!important;right:3px;top:2px;font:900 26px/1 system-ui,sans-serif!important;color:#fff;text-shadow:0 0 4px #000,0 2px 2px #000,0 0 8px #000;z-index:3}
html body #side #panel .btn .p{position:absolute!important;left:0;bottom:0;height:100%!important;box-shadow:none!important;border-radius:0!important;pointer-events:none}
html body #side #panel .zhEmpty{display:none!important}
/* unit orders as pictures at the right end of the panel */
.orddock.zhin{right:auto!important;bottom:auto!important;min-width:0!important;padding:6px!important;background:none!important;box-shadow:none!important;border:0!important;display:flex!important;flex-wrap:wrap;justify-content:center;align-content:center;gap:4px;pointer-events:none}
.orddock.zhin.zhb{justify-content:center;align-content:center;flex-wrap:wrap}   /* centered, no flipped rows (Abdullah 21:24 "not centered") */
#fmb.zhfm{position:fixed!important;z-index:8;display:flex!important;justify-content:center;gap:6px!important;margin:0!important}
#fmb.zhfm button{min-width:86px;height:32px;font:700 13px system-ui,sans-serif!important;border:1px solid #9fc0e0!important;border-radius:3px!important;background:radial-gradient(circle at 50% 40%,#3b5566,#101a20 80%)!important;color:#eef3f6!important;padding:0 10px!important;cursor:pointer}
.orddock.zhin .cmdrow{display:contents!important}
.orddock.zhin button{pointer-events:auto;width:var(--zb,74px)!important;height:calc(var(--zb,74px)*.8)!important;padding:0!important;margin:0!important;font-size:0!important;border-radius:1px!important;border:1px solid #9fc0e0!important;
 background:radial-gradient(circle at 50% 40%,#3b5566,#101a20 80%)!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important}
.orddock.zhin button>i{position:static!important;margin:0!important;transform:none!important;display:block!important;width:100%!important;flex:1 1 100%!important;text-align:center!important;line-height:1!important;padding:0!important;font-size:30px!important;font-style:normal;filter:drop-shadow(0 1px 1px #000)}
.orddock.zhin button:hover{box-shadow:inset 0 0 0 2px #fff,0 0 8px #6fb0ff!important}
/* order buttons, Zero Hour look (Abdullah 2026-11-14 21:04 "Make these buttons sexier"): steel plate, colored line icon, name under it, hotkey in the corner */
.orddock.zhin button{flex-direction:column!important;gap:2px!important;position:relative!important;font:700 11px/1 system-ui,sans-serif!important;letter-spacing:.06em;text-transform:uppercase;color:#d9e4ea!important;border:1px solid #6f8ea4!important;border-radius:3px!important;background:linear-gradient(180deg,#34444e 0%,#1b252c 45%,#0d1418 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -2px 6px rgba(0,0,0,.6),0 2px 4px rgba(0,0,0,.5)!important;transition:transform .08s,box-shadow .12s,border-color .12s}
.orddock.zhin button>i svg{display:block;width:100%;height:100%}
.orddock.zhin button>i{flex:0 0 auto!important;width:56%!important;height:52%!important;font-size:0!important;background:center/contain no-repeat;filter:drop-shadow(0 0 4px rgba(0,0,0,.8))}
.orddock.zhin button>kbd{display:block!important;position:absolute!important;top:3px;right:4px;font:700 10px/1 var(--mono,monospace)!important;color:#9fb6c4!important;background:none!important;border:0!important;padding:0!important;opacity:.85}
.orddock.zhin button:hover{border-color:#ffd36a!important;box-shadow:inset 0 0 0 1px #ffd36a,inset 0 1px 0 rgba(255,255,255,.25)!important}
.orddock.zhin button:active{transform:translateY(1px);box-shadow:inset 0 2px 8px rgba(0,0,0,.8)!important}
.orddock.zhin button.on{border-color:#74d08f!important;box-shadow:inset 0 0 12px rgba(116,208,143,.45),0 0 8px rgba(116,208,143,.5)!important}
.orddock.zhin{flex-direction:row!important;flex-wrap:wrap!important;align-content:center!important;align-items:center!important}
.orddock.zhin button{flex:0 0 auto!important;height:calc(var(--zb,74px)*.8)!important;transition:none!important;white-space:normal!important;text-align:center!important;line-height:1.05!important;padding:2px 3px!important;overflow:hidden!important;font-size:10px!important;letter-spacing:.03em!important}
.orddock.zhin button:hover{transform:none!important}
.orddock{right:126px!important}
/* portrait / emblem + rank */
html body #side #info{grid-column:4!important;grid-row:1!important;padding:4px!important;overflow:hidden!important;font-size:12px!important;border-radius:4px!important;background:linear-gradient(180deg,#0e1820,#060b10)!important;box-shadow:inset 0 0 0 1px #000,inset 0 0 0 3px #39434c,0 0 0 2px #cfd7de!important}
html body #side #info .ukU{flex-direction:column!important;align-items:stretch!important;gap:3px!important;margin:0!important}
html body #side #info .ukU img,html body #side #info .ukU canvas{width:100%!important;height:calc(var(--gbH) - 72px)!important;object-fit:cover!important;border-radius:1px!important;border:1px solid color-mix(in srgb,var(--tc) 75%,#fff)}
html body #side #info .ukUt b{font-size:13px!important}
html body #side.zhnosel #info{display:none!important}
/* portrait card, Zero Hour look (Abdullah 2026-11-14 21:07 "Make this sexier"): bevelled steel frame, team-colour glow behind the picture, scanlines, name plate, gold rank, segmented health */
html body #side #info{padding:5px!important;background:linear-gradient(180deg,#22303a 0%,#0c1318 60%,#05090c 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 0 0 1px #000,inset 0 0 0 3px #2c3942,0 0 0 1px #8fb0c8,0 3px 10px rgba(0,0,0,.6)!important;border-radius:5px!important}
html body #side #info .ukU img,html body #side #info .ukU canvas{height:calc(var(--gbH) - 80px)!important;border:1px solid #000!important;border-radius:3px!important;object-fit:contain!important;
 background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px),radial-gradient(ellipse at 50% 70%,color-mix(in srgb,var(--tc,#4a7) 45%,#1d2c33) 0%,#0b1419 62%,#03070a 100%)!important;
 box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tc,#4a7) 70%,#fff),inset 0 0 24px rgba(0,0,0,.85),0 0 10px color-mix(in srgb,var(--tc,#4a7) 35%,transparent)!important;filter:contrast(1.08) saturate(1.1) drop-shadow(0 2px 3px rgba(0,0,0,.7))}
html body #side #info .ukUt{padding:3px 6px 2px!important;border-radius:3px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.25));box-shadow:inset 0 0 0 1px rgba(143,176,200,.25)}
html body #side #info .ukUt b{font:800 14px/1.15 var(--display,system-ui,sans-serif)!important;letter-spacing:.07em;text-transform:uppercase;color:#f2f6f8!important;text-shadow:0 1px 0 #000,0 0 8px color-mix(in srgb,var(--tc,#4a7) 55%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html body #side #info .ukV{display:inline-flex;align-items:center;gap:4px;font:800 11px/1 var(--display,system-ui,sans-serif)!important;letter-spacing:.16em;background:linear-gradient(180deg,#fff2b0,#e8b33a 55%,#a8721a);-webkit-background-clip:text;background-clip:text;color:transparent!important;filter:drop-shadow(0 1px 0 #000)}
html body #side #info .ukV svg,html body #side #info .ukV *{color:#f0c040;fill:#f0c040}
html body #side #info .ukHp{height:7px!important;margin:4px 0 1px!important;border-radius:1px!important;background:#000!important;box-shadow:inset 0 0 0 1px #2b3a44;overflow:hidden}
html body #side #info .ukHp b{background-image:repeating-linear-gradient(90deg,transparent 0 6px,rgba(0,0,0,.55) 6px 7px),linear-gradient(180deg,rgba(255,255,255,.35),rgba(0,0,0,.2))!important;box-shadow:0 0 6px currentColor}
html body #side .stat>.sup.rk{background:linear-gradient(180deg,#1b252c,#05090c)!important;box-shadow:inset 0 0 0 1px #000,0 0 0 1px #8fb0c8,inset 0 1px 0 rgba(255,255,255,.18)!important;border-radius:4px!important;padding:3px!important}
html body #side .stat>.sup.rk .bar{border-radius:2px;background:repeating-linear-gradient(0deg,#141c12 0 6px,#000 6px 8px)!important}
html body #side .stat>.sup.rk .bar i{background:repeating-linear-gradient(0deg,#ffd84a 0 6px,transparent 6px 8px)!important;filter:drop-shadow(0 0 4px rgba(255,200,60,.7))}
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
#pq{display:none!important}   /* the gray queue strip above the bar is gone (Abdullah 18:33); queue counts stay on the buttons */
#news,#mwPip{display:none!important}
.stanceBtn,[data-k="sn"]{display:none!important}   /* army stance removed */
#pwMeter{display:none!important}   /* power lives in the bar's top console now */
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

/* one console on the top edge: power | money | units (Abdullah 16:57 "Make power, money, units look better") */
html body #side #zhTop{position:absolute;top:-17px;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:stretch;height:30px;border-radius:5px;overflow:hidden;
 background:linear-gradient(180deg,#1b232a,#0b0f13);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 0 2px #c9d2da,0 0 0 3px #4a535c,0 3px 8px rgba(0,0,0,.55)}
html body #side #zhTop>*{position:static!important;transform:none!important;margin:0!important;box-shadow:none!important;border-radius:0!important;background:none!important;display:flex!important;align-items:center;gap:7px;padding:0 14px!important;white-space:nowrap}
html body #side #zhTop>*+*{border-left:1px solid #3a444d!important}
html body #side #zhTop #credits{min-width:150px;justify-content:center;font:700 18px "IBM Plex Mono",ui-monospace,monospace!important;color:#ffd75e!important;text-shadow:0 0 8px rgba(255,215,94,.35)!important;padding:0 18px!important}
html body #side #zhTop #zhPw{width:auto!important;height:auto!important;font:700 12px system-ui,sans-serif!important;letter-spacing:.04em;color:#bff2a8}
html body #side #zhTop #zhPw .zb{flex:none;width:70px;height:7px}
html body #side #zhTop #zhPw.low{color:#ff8a78}
html body #side #zhTop #popCap{font:700 12px system-ui,sans-serif!important;color:#cfe3f5!important;letter-spacing:.04em}
html body #side #zhTop #popCap::before{content:"👥";margin-right:6px;font-size:13px}
html body #side.min #zhTop{display:none!important}

/* upgrades are square picture buttons like everything else (Abdullah 18:20 "Why are supply tunnels just floating make it look better") */
html body #side #panel .btn.wide{grid-column:auto!important;width:auto!important;height:auto!important;padding:0!important;justify-content:flex-start!important;background-image:radial-gradient(circle at 50% 36%,#3d5a48,#12201a 72%)!important}
html body #side #panel .btn.wide::before{content:"▲";position:absolute;left:0;right:0;top:12%;text-align:center;font:900 calc(var(--zb)*.3) system-ui,sans-serif;color:#f4d96a;text-shadow:0 2px 3px #000}
html body #side #panel .btn.wide>.n{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;position:absolute!important;left:0;right:0;bottom:0;margin:0!important;padding:2px 3px!important;font:700 11px/1.15 system-ui,sans-serif!important;color:#f2f6f8!important;text-align:center!important;white-space:normal!important;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.8))!important}
html body #side #panel .btn.wide>.c,html body #side #panel .btn.wide>.d{display:none!important}
html body #side #panel .btn.wide.done::after,html body #side #panel .btn.wide[data-done="1"]::after{content:"✓";position:absolute;right:4px;top:2px;color:#7fe08a;font:900 16px system-ui}

html body #side #panel .btn.zhL{background-image:radial-gradient(circle at 50% 38%,#8a2a18,#2a0c06 75%)!important;border-color:#ff9a6a!important}
html body #side #panel .btn.zhL::before{content:"🚀";position:absolute;left:0;right:0;top:10%;text-align:center;font-size:calc(var(--zb)*.32)}
/* Sell ($) and Repair (wrench) for the selected building(s): original line icons, drawn here */
html body #side #panel .btn.zhSR{background-color:#1b2a22!important;background-size:auto 56%!important;background-position:center 12%!important;background-repeat:no-repeat!important}
html body #side #panel .btn.zhSR.zhSell{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='%23274a2b' stroke='%23f2d35a' stroke-width='4'/%3E%3Ctext x='32' y='45' font-family='Arial,sans-serif' font-weight='900' font-size='38' text-anchor='middle' fill='%23f2d35a'%3E$%3C/text%3E%3C/svg%3E")!important}
html body #side #panel .btn.zhSR.zhRep{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='%23263c52' stroke='%238fd0ff' stroke-width='4'/%3E%3Cpath d='M41 14a10 10 0 0 0-11 13L15 42a4 4 0 0 0 6 6l15-15a10 10 0 0 0 13-11l-6 6-5-1-1-5z' fill='%238fd0ff'/%3E%3C/svg%3E")!important}
html body #side #panel .btn.zhSR.on{box-shadow:inset 0 0 0 2px #8fd0ff,0 0 10px #8fd0ff!important}
html body #side #panel .btn.zhSR:disabled{filter:grayscale(.9) brightness(.5)!important}
html body #side #panel .btn.zhL.rdy{box-shadow:inset 0 0 0 2px #ffd23a,0 0 12px #ff7a3a!important;animation:zhPulse 1.2s ease-in-out infinite}
#zhTip{position:fixed;left:10px;z-index:60;width:clamp(240px,22vw,380px);pointer-events:none;padding:10px 14px;border-radius:4px;color:#e9efdc;font:14px/1.4 system-ui,sans-serif;
 background:linear-gradient(180deg,rgba(14,22,40,.95),rgba(8,14,30,.95));box-shadow:inset 0 0 0 1px #000,inset 0 0 0 2px #3a5ea8,0 4px 14px rgba(0,0,0,.6)}
#zhTip b{display:block;text-align:center;font-size:16px;margin-bottom:4px}#zhTip .zc{color:#f4d96a;font-weight:700}#zhTip .zd{color:#c9d3bd;margin-top:3px}#zhTip .zw{color:#ff9a7a;margin-top:3px}`;document.head.append(st);}

const ZH={star:false,sig:'',pow:0};
/* which grid the selection gets: Construction Vehicle -> buildings; a production building -> its units; any other own building -> upgrades;
   ★ -> generals' powers + Strike; nothing that can act -> an empty grid (as in Zero Hour) */
function zhWant(){if(!G)return null;const s=(G.sel||[]).filter(e=>e&&!e.dead&&e.team===ME);
  if(s.some(u=>u.kind==='dozer'))return 'build';const b=s.find(e=>e.isB);if(b){if(typeof CATS!=='undefined'&&CATS.includes(b.kind))return 'units';return 'upg';}return 'none';}
function zhSelB(){return(G.sel||[]).filter(e=>e&&!e.dead&&e.isB&&e.team===ME&&e.built>=1&&!e.civ&&e.kind!=='garrison'&&!e.sell);}
function zhIsRep(b){return !!b.rep;}
/* Sell asks for a confirm click (Abdullah 2026-11-14 21:22 "Confirm sell"): the first click turns the button red "Confirm?" for 3 s, the second sells */
function sellSel(){if(!G||G.over)return;const ids=zhSelB().map(e=>e.id);if(!ids.length)return;const sl=$('zhSell'),k=ids.join(','),now=performance.now();
  if(!ZH.sellArm||ZH.sellArm.k!==k||now>ZH.sellArm.t){ZH.sellArm={k,t:now+3000};if(sl){sl.classList.add('arm');const n=sl.querySelector('.n');if(n){ZH.sellLab=n.textContent;n.textContent='Confirm?';}}try{sfxUI(520);}catch(_){}
    setTimeout(()=>{if(ZH.sellArm&&ZH.sellArm.k===k&&performance.now()>=ZH.sellArm.t){ZH.sellArm=null;const b=$('zhSell');if(b){b.classList.remove('arm');const n=b.querySelector('.n');if(n)n.textContent=ZH.sellLab||'Sell';}}},3050);return;}
  ZH.sellArm=null;if(sl){sl.classList.remove('arm');const n=sl.querySelector('.n');if(n)n.textContent=ZH.sellLab||'Sell';}doAct({t:'sell',ids});try{sfxUI(300);}catch(_){}ZH.sig='';}
{const st=document.createElement('style');st.textContent='#zhSell.arm{box-shadow:inset 0 0 0 2px #ff5a48,0 0 12px rgba(255,90,72,.7)!important;animation:zhArm .5s ease-in-out infinite alternate}#zhSell.arm .n{color:#ff8a78!important}@keyframes zhArm{to{filter:brightness(1.35)}}';document.head.appendChild(st);}
function repairSel(){if(!G||G.over)return;const bl=zhSelB();if(!bl.length)return;const on=!bl.every(b=>zhIsRep(b));doAct({t:'rep',ids:bl.map(e=>e.id),on});try{sfxUI(520);}catch(_){}}
function zhCtx(){if(!G)return;const sd=$('side');if(!sd)return;
  let star=$('zhStar');if(!star){star=document.createElement('button');star.id='zhStar';star.type='button';star.title='Generals\' powers and Strike';star.innerHTML='<i class="dot" hidden></i>';try{icoPut(star,'star');}catch(_){}
    star.onclick=()=>{ZH.star=!ZH.star;ZH.sig='';zhPowWin();zhCtx();};sd.append(star);}
  {const T=G.teams[ME];if(T&&sd.dataset.tc!==T.color){sd.dataset.tc=T.color;sd.style.setProperty('--tc',T.color);}}
  {let pw=$('zhPw');if(G.battle&&typeof pwView==='function'){if(!pw){pw=document.createElement('div');pw.id='zhPw';pw.innerHTML='<span></span><span class="zb"><i></i></span>';sd.append(pw);}const v=pwView(),k=v.make+'|'+v.use;if(pw.dataset.k!==k){pw.dataset.k=k;pw.classList.toggle('low',!!v.low);pw.firstChild.textContent='⚡ POWER '+v.use+' / '+v.make;pw.querySelector('i').style.width=Math.round(100*Math.min(1,v.use/Math.max(1,v.make)))+'%';pw.title=v.low?'LOW POWER: build a Generator - powered buildings are offline':'Power used / produced';}}else if(pw)pw.remove();}
  {let tp=$('zhTop');if(!tp){tp=document.createElement('div');tp.id='zhTop';sd.append(tp);}const cr=$('credits'),pw=$('zhPw'),pc=$('popCap');if(pw&&pw.parentNode!==tp)tp.prepend(pw);if(cr&&cr.parentNode!==tp){if(pw&&pw.parentNode===tp)pw.after(cr);else tp.prepend(cr);}if(pc&&pc.parentNode!==tp)tp.append(pc);
    if(pw&&pw.firstChild){const v=pw.dataset.k;if(v&&pw.dataset.k2!==v){pw.dataset.k2=v;const [mk,us]=v.split('|');pw.firstChild.textContent='⚡ '+us+' / '+mk;}}
    if(pc&&!/^\d/.test(pc.textContent))pc.textContent=pc.textContent.replace(/^units\s*/,'');}
  {const bn=$('cqBn');if(bn){const v=window.LOADING?'hidden':'';if(bn.style.visibility!==v)bn.style.visibility=v;}}   /* the goal line never floats over the loading screen */
  let emb=$('zhEmb');if(!emb){emb=document.createElement('div');emb.id='zhEmb';emb.innerHTML='';sd.append(emb);}
  sd.classList.toggle('zhnosel',!(G.sel||[]).some(e=>e&&!e.dead&&e.team===ME));
  const sig=(G.sel||[]).map(e=>e.id).join(',');if(sig!==ZH.sig)ZH.sig=sig;try{zhPowWin();}catch(e){}
  star.classList.toggle('on',ZH.star);{const pd=document.querySelector('.tabs button[data-tab="pow"] .dot');const d=star.querySelector('.dot');if(d)d.hidden=!(pd&&!pd.hidden&&getComputedStyle(pd).display!=='none');}
  const w=zhWant();if(w&&TAB!==w)showTab(w);
  /* a production building shows ONLY the units it makes (War Factory = vehicles, Barracks = infantry, ...) */
  {const pnF=$('panel'),sb=(G.sel||[]).find(e=>e&&!e.dead&&e.isB&&e.team===ME);if(pnF&&w==='units'&&sb){const T=G.teams[ME];for(const u of pnF.querySelectorAll(':scope>[data-tab="units"]')){if(u.classList.contains('sub')){u.hidden=true;continue;}const k=u.id.slice(2);let ok=false;try{ok=stats(T.fac,k).from===sb.kind;}catch(e){}if(u.hidden===ok)u.hidden=!ok;}}}
  /* Sell + Repair: shown while one of your finished buildings is selected (sim: act 'sell' / 'rep' in 03-sim.js; keys V / O) */
  {const pnS=$('panel');if(pnS){const bl=zhSelB();let sl=$('zhSell'),rp=$('zhRep');
    if(!sl||sl.parentNode!==pnS){sl=document.createElement('button');sl.id='zhSell';sl.type='button';sl.className='btn hasic zhSR zhSell';sl.innerHTML='<span class="n"></span>';try{icoPut(sl,'sell');}catch(_){}sl.onclick=()=>sellSel();try{sl.style.setProperty('cursor',curCss('sell'),'important');}catch(e){}pnS.append(sl);
      rp=document.createElement('button');rp.id='zhRep';rp.type='button';rp.className='btn hasic zhSR zhRep';rp.innerHTML='<span class="n"></span>';try{icoPut(rp,'wrench');}catch(_){}rp.onclick=()=>repairSel();try{rp.style.setProperty('cursor',curCss('repair'),'important');}catch(e){}pnS.append(rp);}
    const T=G.teams[ME];let ref=0,hurt=0,rep=0;for(const b of bl){ref+=Math.floor(bstats(T.fac,b.kind).cost*SELL_PCT);if(b.hp<b.max)hurt++;if(zhIsRep(b))rep++;}
    const k=bl.length+'|'+ref+'|'+hurt+'|'+rep;if(sl.dataset.k!==k){sl.dataset.k=k;sl.hidden=rp.hidden=!bl.length;
      sl.querySelector('.n').textContent='Sell $'+ref;sl.dataset.nm='Sell';sl.dataset.desc='Sell the selected building'+(bl.length>1?'s':'')+' for half its price after a 3 second sell-off ['+kbShow((KB.cur.sell||'v'))+'].';
      rp.querySelector('.n').textContent=rep?'Repairing':'Repair';rp.dataset.nm='Repair';rp.dataset.desc='Repair the selected building'+(bl.length>1?'s':'')+' over time. It costs a quarter of its price for a full repair, paid as it heals. Press again to stop ['+kbShow((KB.cur.rep||'o'))+'].';rp.disabled=!hurt&&!rep;rp.classList.toggle('on',!!rep);}}}
  /* the strike building gets its own LAUNCH button (Abdullah 18:26 "Missile city ... there is no way to use it") */
  {const pnL=$('panel');if(pnL){let lb=$('zhLaunch');if(!lb||lb.parentNode!==pnL){lb=document.createElement('button');lb.id='zhLaunch';lb.type='button';lb.className='btn zhL';lb.dataset.tab='upg';lb.dataset.from='uplink';lb.innerHTML='<span class="n"></span>';try{icoPut(lb,'rocket');}catch(_){}lb.onclick=()=>{const sb=$('supbtn');if(sb&&!sb.disabled)sb.click();};pnL.prepend(lb);}
    const sb=$('supbtn'),nm=(($('supname')||{}).textContent||'Strike'),st=(($('supt')||{}).textContent||''),dis=!sb||sb.disabled,lbl='LAUNCH '+nm+(st?' · '+st:'');if(lb.dataset.k!==lbl+dis){lb.dataset.k=lbl+dis;lb.querySelector('.n').textContent=dis?nm+(st?' · '+st:''):'LAUNCH '+nm;lb.dataset.nm=lb.querySelector('.n').textContent;lb.dataset.desc='Fire your strike: click LAUNCH, then click the target on the map.';lb.disabled=dis;lb.classList.toggle('rdy',!dis);}}}
  /* a selected building shows its own upgrades next to its units (upgrades are researched at their building: Abdullah 14:37) */
  {const pnU=$('panel'),sb=(G.sel||[]).find(e=>e&&!e.dead&&e.isB&&e.team===ME);if(pnU)for(const u of pnU.querySelectorAll(':scope>[data-tab="upg"]')){const want=!!sb&&u.dataset.from===sb.kind&&(w==='units'||w==='upg');if(u.classList.contains('sub')){u.hidden=true;continue;}if(u.hidden===want)u.hidden=!want;}}sd.classList.toggle('zhpow',w==='pow');{const sb=$('supbtn');star.classList.toggle('rdy',!!(sb&&!sb.disabled)&&!ZH.star);}
  {const od=document.querySelector('.orddock');const pn0=$('panel');if(od&&pn0&&innerWidth>=900){if((w==='none'||w==='build')&&!od.classList.contains('empty')){const z=+(od.currentCSSZoom||pn0.currentCSSZoom)||1,r=pn0.getBoundingClientRect(),n=od.querySelectorAll('button').length,zb=(()=>{const b=[...pn0.querySelectorAll('.btn.hasic')].find(b=>!b.hidden&&b.offsetWidth>20);return b?b.getBoundingClientRect().width:90;})(),cols=w==='build'?Math.ceil(n/2):Math.max(1,Math.ceil(r.width/(zb+4*z))),ow=Math.min(r.width,cols*(zb+4*z)+12*z+1);od.classList.add('zhin');od.classList.toggle('zhb',w==='build');const fm=document.getElementById('fmb'),fmOn=w==='none'&&fm&&!fm.hidden&&fm.style.display!=='none'&&fm.children.length;
      /* bar rects are window pixels, but #side carries the text-size zoom (Settings 115 / 130 %): style lengths are divided by it, or the dock lands below the window */
      if(w==='build'){od.style.left=(r.right-ow)/z+'px';od.style.top=r.top/z+'px';od.style.width=ow/z+'px';od.style.height=r.height/z+'px';}
      else{od.style.left=r.left/z+'px';od.style.top=(r.top/z+(fmOn?44:0))+'px';od.style.width=r.width/z+'px';od.style.height=(r.height/z-(fmOn?44:0))+'px';}
      if(fm){if(fmOn){fm.classList.add('zhfm');fm.style.left=r.left/z+'px';fm.style.width=r.width/z+'px';fm.style.top=(r.top/z+6)+'px';}else fm.classList.remove('zhfm');}if(w==='build'){pn0.style.removeProperty('padding-right');const nc=Math.max(2,Math.floor((r.width-ow-16*z)/(zb+4*z)));pn0.style.setProperty('grid-template-columns','repeat('+nc+','+Math.round(zb/z)+'px)','important');}else pn0.style.removeProperty('grid-template-columns');}else if(od.classList.contains('zhin')){od.classList.remove('zhin');{const fm=document.getElementById('fmb');if(fm)fm.classList.remove('zhfm');}pn0.style.removeProperty('padding-right');od.style.left=od.style.top=od.style.width=od.style.height='';}}}
  const pn=$('panel');if(pn){let e=pn.querySelector('.zhEmpty');const od2=document.querySelector('.orddock.zhin');const vis=!!od2||[...pn.querySelectorAll(':scope>[data-tab]')].some(b=>!b.hidden&&b.dataset.tab===TAB)||(!!$('zhSell')&&!$('zhSell').hidden);
    if(!vis){if(!e){e=document.createElement('div');e.className='zhEmpty';pn.append(e);}e.textContent=w==='none'?'Select your Construction Vehicle to build, or a building to train units':'Nothing available here yet';e.hidden=false;}else if(e)e.hidden=true;}
  {const rk=document.querySelector('#side .sup.rk .bar i');if(rk){const wd=rk.style.width;if(wd&&rk.style.getPropertyValue('--rk')!==wd)rk.style.setProperty('--rk',wd);}}}

function zhPowWin(){let w=$('zhPow');if(!ZH.star||!G){if(w)w.hidden=true;return;}const sd=$('side');
  if(!w){w=document.createElement('div');w.id='zhPow';w.innerHTML='<div class="zph"><span>General</span><button type="button" title="Close (Esc)">✕</button></div><div class="zpb"></div>';document.body.append(w);
    w.querySelector('.zph button').onclick=()=>{ZH.star=false;zhPowWin();zhCtx();};addEventListener('keydown',e=>{if(e.key==='Escape'&&ZH.star){ZH.star=false;zhPowWin();zhCtx();}},true);}
  w.hidden=false;if(sd){const r=sd.getBoundingClientRect();w.style.bottom=(innerHeight-r.top+34)+'px';w.style.setProperty('--tc',getComputedStyle(sd).getPropertyValue('--tc'));}
  const body=w.querySelector('.zpb'),rk=document.querySelector('#side .sup.rk .lbl'),src=[...document.querySelectorAll('#panel>[data-tab="pow"]')];
  const sig=src.map(b=>(b.className.includes('sub')?'s':'')+b.id+(b.disabled?1:0)+(b.style.display==='none'?1:0)+(b.textContent||'').length).join('|')+'|'+(rk?rk.textContent:'')+'|'+(($('supt')||{}).textContent||'')+(($('supbtn')||{}).disabled?1:0);if(w.dataset.sig===sig)return;w.dataset.sig=sig;
  body.innerHTML='';if(rk){const d=document.createElement('div');d.className='zrk';d.textContent=[...rk.children].length?[...rk.children].map(c=>c.textContent.trim()).filter(Boolean).join(' · '):rk.textContent.trim();body.append(d);}
  /* the Strike is launched from its building and its own rail button, not from the General window (Abdullah 2026-11-14 22:10) */
  /* ONE row per power (Abdullah 2026-11-14 22:15 "Make these powers just general upgrades. Make sure there aren't too many upgrades"): the separate
     "Level up" list is folded in - an unlocked power's own row levels it up when you have a point */
  for(const b of src){if(b.classList.contains('sub')){if(/level up/i.test(b.textContent))continue;const s=document.createElement('div');s.className='zsub';s.textContent=b.textContent;body.append(s);continue;}if(b.style.display==='none'||/^pu_/.test(b.id))continue;   /* .hidden only means 'not the open tab' (showTab): the power rows live here now, whatever tab is open */
    const up=/^p_/.test(b.id)?$('pu_'+b.id.slice(2)):null,canUp=!!up&&!up.disabled&&!up.hidden&&up.style.display!=='none';
    const x=document.createElement('button');x.type='button';x.className='zp';x.disabled=b.disabled&&!canUp;{const ic=b.querySelector(':scope>.zhIc');if(ic){const c=ic.cloneNode(true);c.className='ic';x.append(c);}}const n=document.createElement('b');n.textContent=(b.querySelector('.n')||{}).textContent||b.dataset.nm||'';x.append(n);
    const c=(b.querySelector('.c')||{}).textContent;if(c){const i=document.createElement('i');i.textContent=c;x.append(i);}const dd=b.dataset.desc;if(dd){const s=document.createElement('span');s.textContent=dd;x.append(s);}
    if(b.dataset.nx&&/^p_/.test(b.id)){const nx=document.createElement('span');nx.className='znx';nx.textContent=(/^Level 2/.test(b.dataset.nx)?'':'Next: ')+b.dataset.nx;x.append(nx);}
    if(up&&up.style.display!=='none'){const u=document.createElement('i');u.className='zup';const m=/(\d+) point/.exec(up.textContent||'');u.textContent='▲ Level up · '+(m?m[1]:'')+' point'+(m&&m[1]>1?'s':'');x.append(u);}
    x.title=b.title||'';x.onclick=()=>{(canUp&&b.disabled?up:b).click();setTimeout(()=>{w.dataset.sig='';zhPowWin();},50);};body.append(x);}}
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
function zhCamPaint(){if(!G||!G.teams||!G.teams[ME])return;const f=G.teams[ME].fac,pn=$('panel');if(pn)for(const btn of pn.querySelectorAll('.btn.hasic')){const tab=btn.dataset.tab;if(tab!=='build'&&tab!=='units')continue;const k=btn.id.slice(2),b=tab==='build',cv=btn.querySelector('canvas.uic');if(!cv)continue;if(!btn.dataset.zbg||(btn.dataset.zbg==='f'&&performance.now()-(+btn.dataset.zbt||0)>1500&&!btn.dataset.zb2)){if(btn.dataset.zbg==='f')btn.dataset.zb2='1';btn.dataset.zbt=String(performance.now());btn.dataset.zbg='f';try{btn.style.setProperty('background-image','url('+cv.toDataURL()+')','important');}catch(e){}}
    const c=zhCamGet(f,k,b);if(c===undefined){if(!btn.hidden)zhCamWant(f,k,b);continue;}if(c&&btn.dataset.zbg!=='c'){btn.dataset.zbg='c';btn.style.setProperty('background-image','url('+(c._u||(c._u=c.toDataURL('image/jpeg',.85)))+')','important');}}
  const im=document.querySelector('#side #info .ukU img,#side #info .ukU canvas');if(im){const s=(G.sel||[]).find(e=>e&&!e.dead&&e.team===ME);if(s){const c=zhCamGet(f,s.kind,!!s.isB);if(c===undefined)zhCamWant(f,s.kind,!!s.isB);else if(c&&im.dataset.cam!==s.kind){im.dataset.cam=s.kind;if(im.tagName==='IMG')im.src=c._u||(c._u=c.toDataURL('image/jpeg',.85));else{const x=im.getContext('2d');x.clearRect(0,0,im.width,im.height);x.drawImage(c,0,0,im.width,im.height);}}}}}
{const _z=zhCtx;zhCtx=function(){_z();try{if(innerWidth>=900)zhCamPaint();}catch(e){}};}
/* the battlefield grows into the space when the bar is folded down, and shrinks back when it returns (Abdullah 16:54 "When dropping down the screen should expand") */
if(typeof barMin==='function'){const _zb=barMin;barMin=function(v){const r=_zb.apply(this,arguments);if(v!=null){const fx=()=>{try{barH();resize();}catch(e){}};requestAnimationFrame(fx);setTimeout(fx,120);}return r;};}
/* HOLOGRAM PORTRAIT (Abdullah 2026-11-14 21:09 "This is not sexy. Something cooler."): the selected unit's picture becomes a glowing tactical
   hologram - its silhouette filled with a cyan light gradient and scanlines (red for an enemy), a perspective grid floor, a scan bar sweeping
   down, corner brackets and two readouts (class, health). Pure CSS on two divs; the scan is a compositor animation, nothing per frame in JS. */
{const st=document.createElement('style');st.textContent=`@media(min-width:900px){
html body #side #info .ukU>img{display:none!important}
.zhHolo{--hc:#5fe6f2;--hd:#0b6f86;position:relative;width:100%;height:calc(var(--gbH) - 80px);overflow:hidden;border-radius:3px;
 background:radial-gradient(ellipse at 50% 85%,color-mix(in srgb,var(--hc) 22%,transparent),transparent 60%),radial-gradient(ellipse at 50% 40%,#0b1c24,#03080b 75%);
 box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--hc) 55%,transparent),inset 0 0 30px rgba(0,0,0,.9),0 0 12px color-mix(in srgb,var(--hc) 25%,transparent)}
.zhHolo.foe{--hc:#ff6b58;--hd:#7a1a12}
.zhHolo::before{content:'';position:absolute;left:-30%;right:-30%;bottom:-6%;height:46%;transform:perspective(160px) rotateX(58deg);transform-origin:50% 100%;
 background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--hc) 45%,transparent) 0 1px,transparent 1px 22px),repeating-linear-gradient(0deg,color-mix(in srgb,var(--hc) 45%,transparent) 0 1px,transparent 1px 22px);
 -webkit-mask:linear-gradient(0deg,#000 10%,transparent);mask:linear-gradient(0deg,#000 10%,transparent);opacity:.55}
.zhHolo::after{content:'';position:absolute;left:0;right:0;top:-30%;height:26%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--hc) 30%,transparent) 80%,color-mix(in srgb,var(--hc) 70%,#fff) 98%,transparent);animation:zhScan 2.6s linear infinite;animation-delay:var(--ad,0s);pointer-events:none;mix-blend-mode:screen}
@keyframes zhScan{to{transform:translateY(560%)}}
.zhHoloG{position:absolute;inset:9% 8% 7%;filter:drop-shadow(0 0 5px var(--hc)) drop-shadow(0 0 14px color-mix(in srgb,var(--hc) 60%,transparent));animation:zhFlick 4s steps(1) infinite;animation-delay:var(--fd,0s)}
@keyframes zhFlick{0%,100%{opacity:1}47%{opacity:.82}48%{opacity:1}83%{opacity:.9}}
.zhHoloF{position:absolute;inset:0;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;
 background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),linear-gradient(180deg,#f2feff 0%,var(--hc) 45%,var(--hd) 100%)}
.zhHoloD{position:absolute;inset:0;background:var(--m) center/contain no-repeat;filter:grayscale(1) contrast(1.6);mix-blend-mode:multiply;opacity:.35;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat}
.zhHoloC{position:absolute;inset:5px;pointer-events:none;background:
 linear-gradient(var(--hc),var(--hc)) 0 0/14px 2px no-repeat,linear-gradient(var(--hc),var(--hc)) 0 0/2px 14px no-repeat,
 linear-gradient(var(--hc),var(--hc)) 100% 0/14px 2px no-repeat,linear-gradient(var(--hc),var(--hc)) 100% 0/2px 14px no-repeat,
 linear-gradient(var(--hc),var(--hc)) 0 100%/14px 2px no-repeat,linear-gradient(var(--hc),var(--hc)) 0 100%/2px 14px no-repeat,
 linear-gradient(var(--hc),var(--hc)) 100% 100%/14px 2px no-repeat,linear-gradient(var(--hc),var(--hc)) 100% 100%/2px 14px no-repeat;opacity:.85}
.zhHoloC::before,.zhHoloC::after{position:absolute;top:4px;font:700 10px/1 var(--mono,monospace);letter-spacing:.12em;color:var(--hc);text-shadow:0 0 6px var(--hc)}
.zhHoloC::before{content:attr(data-l);left:20px}.zhHoloC::after{content:attr(data-r);right:20px}
}`;document.head.appendChild(st);}
function zhHolo(){const im=document.querySelector('#side #info .ukU>img');if(!im||innerWidth<900)return;const e=(G&&G.sel||[]).find(u=>u&&!u.dead);
  let h=im.parentElement.querySelector('.zhHolo');if(!h){h=document.createElement('div');h.className='zhHolo';h.innerHTML='<div class="zhHoloG"><div class="zhHoloF"></div><div class="zhHoloD"></div></div><div class="zhHoloC"></div>';im.after(h);}
  {const t=performance.now();h.style.setProperty('--ad',-(t%2600)+'ms');h.style.setProperty('--fd',-(t%4000)+'ms');}   /* the panel is rebuilt often: keep the scan on the clock so it never restarts (no flashing) */
  const m='url("'+im.src+'")';if(h.dataset.src!==im.src){h.dataset.src=im.src;h.style.setProperty('--m',m);}
  h.classList.toggle('foe',!!e&&e.team!==ME&&!(typeof ally==='function'&&ally(e.team,ME)));
  const c=h.lastChild;if(e&&e.s){const cl=String(e.s.cls||e.s.dom||'unit').toUpperCase(),hp=Math.round(100*Math.max(0,e.hp)/(e.max||1))+'%';if(c.dataset.l!==cl)c.dataset.l=cl;if(c.dataset.r!==hp)c.dataset.r=hp;}}
if(typeof updateUI==='function'){const _hU=updateUI;updateUI=function(){_hU.apply(this,arguments);try{zhHolo();}catch(e){}};}
/* ICONS FOR UPGRADES AND POWERS (Abdullah 2026-11-14 21:39 "make sure every button has an icon that makes sense"): each upgrade / power picture
   button gets a line icon chosen from what it does (its name + the building it comes from), drawn inline from the one icon table
   ICON_SVG (08-ui) so nothing flickers; set once per button. */
{const S=(b,c)=>"<svg viewBox='0 0 48 48' fill='none' stroke='"+c+"' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'>"+b+"</svg>";
 Object.assign(ICON_SVG,{
  armor:S("<path d='M24 5l15 5v11c0 10-6.5 17-15 22C15.5 38 9 31 9 21V10z'/><path d='M15 18h18M15 25h18M17 32h14'/>",'#9fc6e0'),
  missile:S("<path d='M30 6c6 0 12 6 12 12L22 38l-12-12z'/><path d='M14 30l-6 10 10-6'/><circle cx='31' cy='17' r='3'/>",'#ff8a5a'),
  radar:S("<path d='M10 38a20 20 0 0 1 0-28'/><path d='M16 32a12 12 0 0 1 0-16'/><circle cx='24' cy='24' r='3'/><path d='M24 24l16-10'/><path d='M38 30a20 20 0 0 1-6 8'/>",'#7fe0d0'),
  drone:S("<circle cx='10' cy='12' r='5'/><circle cx='38' cy='12' r='5'/><circle cx='10' cy='36' r='5'/><circle cx='38' cy='36' r='5'/><path d='M14 16l6 6M34 16l-6 6M14 32l6-6M34 32l-6-6'/><rect x='19' y='19' width='10' height='10' rx='2'/>",'#c9a6ff'),
  rifle:S("<path d='M4 26h30l8-4v6l-8 2H20l-4 8h-6l3-8H4z'/><path d='M22 26v-4h6'/>",'#d8e6a0'),
  tank:S("<path d='M6 30h36l-4 8H10z'/><path d='M12 30v-8h20v8'/><path d='M32 24h12'/><circle cx='14' cy='34' r='1.5'/><circle cx='24' cy='34' r='1.5'/><circle cx='34' cy='34' r='1.5'/>",'#c6d48a'),
  plane:S("<path d='M24 4c2 0 3 3 3 6v10l15 8v4l-15-4v8l5 4v3l-8-2-8 2v-3l5-4v-8L6 32v-4l15-8V10c0-3 1-6 3-6z'/>",'#9fd8ff'),
  ship:S("<path d='M4 30h40l-6 10H10z'/><path d='M14 30v-8h16v8'/><path d='M22 22v-8M22 14h8'/>",'#8fbfe8'),
  shell:S("<path d='M20 40V18c0-6 4-12 4-12s4 6 4 12v22z'/><path d='M18 40h12M20 26h8'/><path d='M10 40V28c0-4 2-7 2-7s2 3 2 7v12M34 40V28c0-4 2-7 2-7s2 3 2 7v12'/>",'#ffc04a'),
  camo:S("<path d='M4 24s8-12 20-12 20 12 20 12-8 12-20 12S4 24 4 24z'/><circle cx='24' cy='24' r='5'/><path d='M8 40L40 8'/>",'#a8c890'),
  eye:S("<path d='M4 24s8-12 20-12 20 12 20 12-8 12-20 12S4 24 4 24z'/><circle cx='24' cy='24' r='6'/><circle cx='24' cy='24' r='2' fill='#9fe6ff'/>",'#9fe6ff'),
  para:S("<path d='M6 20a18 14 0 0 1 36 0z'/><path d='M6 20l18 16 18-16M16 20l8 16M32 20l-8 16'/><circle cx='24' cy='40' r='3'/>",'#e0e6ee'),
  cash:S("<circle cx='24' cy='24' r='17'/><path d='M30 17c-2-2-4-3-7-3-4 0-7 2-7 5s3 4 7 5 8 2 8 5-3 5-8 5c-3 0-6-1-8-3M24 10v28'/>",'#f2cb5c'),
  star:S("<path d='M24 5l5.5 12 13 1.5-9.8 8.8 2.8 12.7L24 33.5 12.5 40l2.8-12.7L5.5 18.5l13-1.5z'/>",'#f2cb5c'),
  crate:S("<path d='M8 16l16-8 16 8v18l-16 8-16-8z'/><path d='M8 16l16 8 16-8M24 24v18'/>",'#e8d48a'),
  medic:S("<rect x='8' y='8' width='32' height='32' rx='6'/><path d='M24 15v18M15 24h18'/>",'#ff7a7a'),
  bolt:S("<path d='M27 4L10 27h12l-3 17 19-25H26z'/>",'#ffe066')
 });}
const ICON_RULES=[[/armou?r|plate|vest|kevlar|reactive|composite|chobham|kontakt|merkava|karrar|rudra|kavach|altay|chonma|al-khalid|body/i,'armor'],
 [/drone|fpv|bayraktar|sea baby|swarm/i,'drone'],[/radar|awacs|aegis|netra|kasta|pine|kalkan|iron dome|patriot|pantsir|datalink|network|starlink|electronic|jamm|krasukha|koral|spectra|countermeasure|firewall|sniper pod|avionics|fire control/i,'radar'],
 [/missile|rocket|grad|kalibr|brahmos|babur|hwasong|phoenix|meteor|astra|storm shadow|kh-38|phl|tariq|bomb|jdam|spice|guidance/i,'missile'],
 [/artiller|gun crew|munition|sabot|round|barrage|shell|koksan|ramses|mortar/i,'shell'],[/camouflag|stealth|hidden|passive|conceal/i,'camo'],
 [/spoils|bounty|cash|money|revenue/i,'cash'],[/logistic|supply|trade|railway|convoy|corridor|revenue|contract|industry|route|tunnel|chaebol|spoils|bounty|cash|money|aramco|free zone|grain|qat/i,'crate'],
 [/medic|hospital|heal|field aid/i,'medic'],[/watch|lookout|recon|reveal/i,'eye'],[/fortif|position|frontier|lookout|bunker|mountain/i,'wall'],[/para|drop|airborne|fighters/i,'para'],
 [/reveal|watch|recon|spy|eye|scan|sweep|intel/i,'eye'],[/repair|maintenance/i,'fix'],[/air ?strike|sortie|strike|bomber/i,'plane'],[/power|generator|grid/i,'bolt']];
const ICON_BY_AT={barracks:'rifle',factory:'tank',airfield:'plane',shipyard:'ship',hq:'star',uplink:'missile'};
const ICON_POW=[[/para|drop|fighters|reinforce|airborne/i,'para'],[/reveal|watch|recon|spy|eye|scan|sweep|intel/i,'eye']];
function zhIconFor(nm,at,tab){if(tab==='pow')for(const [re,k] of ICON_POW)if(re.test(nm))return k;for(const [re,k] of ICON_RULES)if(re.test(nm))return k;return tab==='pow'?'star':ICON_BY_AT[at]||'star';}
function zhIcons(){const pn=$('panel');if(!pn)return;for(const b of pn.querySelectorAll('.btn[data-tab="upg"]:not([data-ic]):not(.zhL),.btn[data-tab="pow"]:not([data-ic])')){
  const n=b.querySelector('.n'),nm=(n&&n.textContent||b.dataset.nm||'').replace(/^[▲\s]+/,''),k=zhIconFor(nm,b.dataset.from||((UPG||{})[String(b.id).replace(/^g_/,'')]||{}).at,b.dataset.tab);
  b.dataset.ic=k;const i=document.createElement('i');i.className='zhIc';i.innerHTML=ICON_SVG[k]||ICON_SVG.star;b.prepend(i);}}
{const st=document.createElement('style');st.textContent=`html body #side #panel .btn[data-ic]::before{content:none!important}
html body #side #panel .btn>.zhIc{position:absolute;left:0;right:0;top:9%;margin:auto;width:46%;height:52%;pointer-events:none;filter:drop-shadow(0 0 4px rgba(0,0,0,.85))}
html body #side #panel .btn>.zhIc svg{display:block;width:100%;height:100%}`;document.head.appendChild(st);}
if(typeof updateUI==='function'){const _iU=updateUI;updateUI=function(){_iU.apply(this,arguments);try{zhIcons();}catch(e){}};}

/* STRIKE ON THE LEFT RAIL (Abdullah 2026-11-14 22:10 "Strike launch from the building and its own separate button like artillery barrage in left hand"):
   one rail button under the generals' powers, shown while you own a Strike Center; it fills up as the Strike charges, glows when READY,
   one click arms it, then RIGHT-click the target (left-click cancels; Abdullah 2026-11-15 00:26) - the same as pressing LAUNCH on the building. */
/* the ready column sits at the right edge; in the Test range it moves left of the range panel instead of covering it */
function qpPlace(){const Q=document.getElementById('qpow'),X=document.getElementById('sbx');if(!Q)return;let r='';if(X&&X.offsetParent){const a=X.getBoundingClientRect();if(a.width)r=Math.round(innerWidth-a.left+10)+'px';}if(Q.style.right!==r)Q.style.right=r;}
function qpStrike(){const Q=document.getElementById('qpow'),sb=$('supbtn');if(!Q)return;qpPlace();let b=document.getElementById('qpStrike');
  /* readiness straight from the team (it used to follow the LAUNCH button, which only refreshed once some building was selected: Abdullah 2026-11-21 'Rocket barrage only appears after selecting another first') */
  const TT=G&&G.teams&&G.teams[ME],own=!!(TT&&TT.sup&&!G.over&&G.ents&&G.ents.some(e=>e.isB&&e.team===ME&&!e.dead&&e.kind==='uplink'&&e.built>=1)),sRdy=own&&(TT.charge||0)>=TT.sup.charge;
  if(!own||!sRdy){if(b)b.hidden=true;if(Q.querySelector('.qcol')&&!Q.querySelector('.qcol').children.length)Q.hidden=true;return;}   /* right rail shows READY things only (Abdullah 2026-11-21 13:03) */
  if(!b){b=document.createElement('button');b.id='qpStrike';b.type='button';b.innerHTML='<div class="qf"></div>'+(ICON_SVG.missile||'')+'<span class="qc"></span>';b.onclick=()=>{G.place=null;G.aim='sup';try{sfxUI(620);}catch(_){}try{updateUI();}catch(_){}};
    let col=Q.querySelector('.qstr');if(!col){col=document.createElement('div');col.className='qstr';Q.insertBefore(col,Q.querySelector('.qtab'));}col.append(b);}
  Q.hidden=false;b.hidden=false;const nm=(($('supname')||{}).textContent||'Strike'),st=(($('supt')||{}).textContent||''),T=G.teams[ME],c=T&&T.sup&&T.sup.charge?Math.min(1,(T.charge||0)/T.sup.charge):1,rdy=sRdy,k=nm+st+rdy+(G.aim==='sup')+Math.round(c*40);
  if(b.dataset.k===k)return;b.dataset.k=k;b.title=nm+(st?' - '+st:'')+(rdy?' - click, then click the target':'');b.setAttribute('aria-label',nm);
  b.className=(G.aim==='sup'?'arm ':'')+(rdy?'rdy':'');const f=b.querySelector('.qf');f.style.background=c<1?'conic-gradient(rgba(0,0,0,.68) '+Math.round(360*(1-c))+'deg,transparent 0)':'none';b.querySelector('.qc').textContent=rdy?'READY':Math.round(c*100)+'%';}
{const st=document.createElement('style');st.textContent=`#qpow .qstr{display:flex;flex-direction:column;gap:6px;margin-top:8px}#qpow.off .qstr{display:none}
#qpStrike{pointer-events:auto;position:relative;overflow:hidden;width:56px;height:56px;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:6px;border:1px solid #c97a3a;background:linear-gradient(160deg,#3a2418,#1a100a);color:#ffb07a;cursor:pointer}
#qpStrike svg{width:30px;height:30px;position:relative;margin-top:-6px;pointer-events:none}#qpStrike .qf{position:absolute;inset:0;pointer-events:none}
#qpStrike .qc{position:absolute;bottom:2px;left:0;right:0;text-align:center;font:800 9px/1 system-ui,sans-serif;letter-spacing:.05em;color:#ffd9b0;pointer-events:none}
#qpStrike.rdy{border-color:#ffd23a;box-shadow:0 0 10px rgba(255,160,60,.7)}#qpStrike.arm{border-color:#ea5a40;background:linear-gradient(160deg,#7a2a1c,#4a1a12)}`;document.head.appendChild(st);}
if(typeof updateUI==='function'){const _sU=updateUI;updateUI=function(){_sU.apply(this,arguments);try{qpStrike();}catch(e){}};}

{const st=document.createElement('style');st.textContent='#zhPow .zp .znx{display:block;color:#9fd0ff;font-size:12px;margin-top:2px}#zhPow .zp .zup{display:block;font-style:normal;color:#ffd23a;font-weight:700;font-size:12px;margin-top:2px}';document.head.appendChild(st);}
