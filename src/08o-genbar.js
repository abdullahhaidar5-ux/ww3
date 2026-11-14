/* ================= COMMAND BAR + VETERAN LOOK (presentation, Abdullah 2026-11-13 21:24 "Classic Generals bar", "Stripes + glow + voices") =================
   The end-of-match screen is NOT touched (he said "Leave as is", 21:36). View only. */
/* veteran look in the bar portrait (presentation): gold stripes, Elite silver-blue shimmer, Heroic gold glow */
{const st=document.createElement('style');st.textContent='.ukV .vsvg polygon{fill:#f2c94c;stroke:rgba(0,0,0,.7);stroke-width:1}.ukV.vet2 .vsvg polygon{fill:#bfe0ff}.ukV.vet2{color:#bfe0ff;animation:vetPulse 2.4s ease-in-out infinite}.ukV.vet3{color:#ffd76a;animation:vetPulse 1.6s ease-in-out infinite}.ukV.vet3 .vsvg polygon{fill:#ffd76a}@keyframes vetPulse{0%,100%{text-shadow:0 0 2px rgba(255,255,255,.0)}50%{text-shadow:0 0 9px currentColor}}';document.head.append(st);}

/* Classic Generals bar (presentation): hotkey letters sit on the command buttons (em.hk) */
{const st=document.createElement('style');st.textContent='#tstrip button{position:relative}#tstrip .hk{display:none}';document.head.append(st);}

/* FULL GENERALS-STYLE COMMAND BAR (Abdullah 2026-11-14 "Full Generals redesign"): one HUD, the existing elements restyled by CSS only (original art:
   gunmetal plate with bevel, rivets, angled top edge; minimap in a bezel; unit portrait; square icon buttons; stamped tabs; money on the top edge;
   Strike Center + general rank on the right). The .stat wrapper becomes display:contents so its pieces sit in the bar grid. PC width only. No per-frame work. */
{const st=document.createElement('style');st.textContent=`/* GENERALS-STYLE COMMAND BAR (original art, CSS only, no per-frame work) */
@media(min-width:900px){
body #side{--gbH:clamp(256px,36vh,360px);--bs:clamp(60px,calc((var(--gbH) - 80px)/3),100px);--st1:#4a5445;--st2:#2e352c;--st3:#1b201a;--hi:#7d8a6c;--gold:#e8c85c;
 position:relative;isolation:isolate;display:grid!important;grid-template-columns:262px minmax(350px,400px) minmax(0,1fr) 214px!important;grid-template-rows:38px minmax(0,1fr)!important;gap:4px 12px!important;
 height:var(--gbH)!important;box-sizing:border-box;padding:8px 16px 12px!important;border:0!important;background:none!important;overflow:visible!important;font-family:system-ui,Segoe UI,sans-serif}
/* the plate: angled top edge, gunmetal gradient, fine brushed lines, bevel */
body #side::before{content:"";position:absolute;z-index:-1;left:0;right:0;bottom:0;top:-16px;pointer-events:none;
 clip-path:polygon(0 16px,300px 16px,326px 0,calc(100% - 244px) 0,calc(100% - 218px) 16px,100% 16px,100% 100%,0 100%);
 background:
  radial-gradient(circle at 9px 25px,#9aa68a 0 2px,#262b24 3px 4px,transparent 5px),
  radial-gradient(circle at calc(100% - 9px) 25px,#9aa68a 0 2px,#262b24 3px 4px,transparent 5px),
  radial-gradient(circle at 9px calc(100% - 9px),#9aa68a 0 2px,#262b24 3px 4px,transparent 5px),
  radial-gradient(circle at calc(100% - 9px) calc(100% - 9px),#9aa68a 0 2px,#262b24 3px 4px,transparent 5px),
  repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),
  repeating-linear-gradient(0deg,rgba(0,0,0,.10) 0 1px,transparent 1px 4px),
  linear-gradient(180deg,#5b6653 0,#434c3e 7%,#343c31 40%,#262c25 100%);
 box-shadow:inset 0 2px 0 #8c9a7a,inset 0 -3px 0 #151913,inset 3px 0 0 #6a7660,inset -3px 0 0 #151913;}
body #side::after{content:"";position:absolute;z-index:-1;left:0;right:0;top:-16px;height:16px;pointer-events:none;filter:drop-shadow(0 -3px 6px rgba(0,0,0,.55))}
/* minimap in a heavy bezel */
body #sideTop{grid-column:1;grid-row:1/3;display:flex!important;align-items:center;justify-content:center;padding:9px!important;margin:0!important;border-radius:5px;
 background:linear-gradient(145deg,#22271f,#3f493a 50%,#1b1f19);box-shadow:inset 0 0 0 2px #10130e,inset 0 0 0 4px #7a876a,inset 0 0 0 6px #2a3025,0 2px 0 #0b0d09,0 0 14px rgba(0,0,0,.6)}
body #sideTop{flex-direction:column;gap:6px}
body #sideTop::after{content:'TACTICAL MAP';font:800 11px system-ui,sans-serif;letter-spacing:.3em;color:#aab59a;text-shadow:0 1px 0 #000}
body #sideTop #mm{width:100%!important;height:auto!important;aspect-ratio:384/264;max-height:100%;border-radius:2px;box-shadow:0 0 0 2px #0b0d09,0 0 0 3px #5d6951,inset 0 0 18px rgba(0,0,0,.5)}
/* centre: unit portrait + info. the .stat wrapper dissolves so its children sit in the bar grid */
body #side>.stat{display:contents!important}
body #side .stat>.hdr{grid-column:2;grid-row:1;display:flex!important;align-items:center;gap:10px;padding:0 12px!important;margin:0!important;min-width:0;border-radius:4px;
 background:linear-gradient(180deg,#10140f,#1b2118);box-shadow:inset 0 0 0 1px #070906,inset 0 0 0 2px #5a6650,0 1px 0 #7d8a6c}
body #side #facname{flex:none;font:800 15px system-ui,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}
body #side #credits{flex:none;font:800 20px "IBM Plex Mono",ui-monospace,monospace!important;color:#f4d96a!important;text-shadow:0 0 8px rgba(244,217,106,.35),0 1px 0 #000;margin-left:6px;padding:0 12px;border-radius:3px;background:#0a0d09;box-shadow:inset 0 0 0 1px #3b4433,inset 0 2px 6px #000}
body #side #barGrip,body #side #mmBtn{display:none!important}
body #side .stat>.hdr button{font:700 14px system-ui,sans-serif!important;color:#e6ecd8;border-radius:3px;border:1px solid #1a1f17;background:linear-gradient(180deg,#566150,#363e32);box-shadow:inset 0 1px 0 #8f9c7e,0 1px 0 #0b0d09;padding:4px 8px}
body #side .stat>.hdr button:hover{background:linear-gradient(180deg,#6b785f,#444e3d)}
body #side .stat>.hdr button:active{background:linear-gradient(180deg,#2b3228,#3d4639);box-shadow:inset 0 2px 4px #000}
body #side .stat>.hdr #aMenu{margin-left:auto}
body #side #info{grid-column:2;grid-row:2;min-height:0;overflow-y:auto;overflow-x:hidden;padding:10px 12px!important;border-radius:4px;scrollbar-width:thin;
 background:linear-gradient(180deg,#141914,#0e120d);box-shadow:inset 0 0 0 1px #070906,inset 0 0 0 2px #5a6650,inset 0 8px 18px rgba(0,0,0,.5),0 1px 0 #7d8a6c;font-size:14px;line-height:1.35}
body #side #info .ukU{gap:12px;align-items:flex-start;margin:0 0 6px}
body #side #info .ukU img{width:112px!important;height:86px!important;border-radius:3px;object-fit:contain;background:radial-gradient(circle at 50% 40%,#46543f,#171d15 80%)!important;box-shadow:inset 0 0 0 1px #aeb99b,inset 0 0 0 3px #1a1f17,inset 0 0 0 4px #66725a,0 0 8px #000!important}
body #side #info .ukUt{min-width:0;flex:1}
body #side #info .ukUt b{font:800 19px system-ui,sans-serif;display:block;color:#f1f5e4;letter-spacing:.02em}
body #side #info .ukHp{height:12px!important;margin:5px 0!important;border-radius:2px;background:#050704!important;box-shadow:inset 0 0 0 1px #3d4733,0 1px 0 #6f7b5f}
body #side #info .ukV{font-weight:700;font-size:14px}
body #side #info .morale,body #side #info #ammoRow{font-size:13px}
/* right of centre: tabs + big square button grid */
body #side>.ccard{display:contents!important}
body #side .cardhd{grid-column:3;grid-row:1;display:flex!important;align-items:flex-end;justify-content:space-between;gap:8px;min-width:0;margin:0!important;padding:0 2px!important}
body #side .tabs{display:flex!important;gap:3px;align-items:flex-end}
body #side .tabs button{position:relative;height:30px;padding:0 11px!important;font:800 12px system-ui,sans-serif!important;letter-spacing:.08em;text-transform:uppercase;color:#aeb89c;border:0!important;border-radius:5px 5px 0 0!important;
 clip-path:polygon(0 100%,0 7px,7px 0,calc(100% - 7px) 0,100% 7px,100% 100%);background:linear-gradient(180deg,#3d4639,#242a22)!important;box-shadow:none}
body #side .tabs button:hover{color:#fff;background:linear-gradient(180deg,#566150,#303829)!important}
body #side .tabs button.on{height:34px;color:#1b1a0e!important;background:linear-gradient(180deg,#f0d66e,#c4a23b 55%,#a8872b)!important;text-shadow:0 1px 0 rgba(255,255,255,.35)}
body #side .tabs button .dot{background:#ff5a3c!important}
body #side .sqbar{margin:0!important;flex:0 1 auto}
body #side .sqbar button{font:700 12px system-ui,sans-serif;border-radius:3px;border:1px solid #1a1f17;background:linear-gradient(180deg,#566150,#363e32);color:#e6ecd8;padding:3px 9px}
body #side #panel{grid-column:3;grid-row:2;min-height:0;overflow-x:hidden!important;overflow-y:auto!important;display:grid!important;grid-template-columns:repeat(auto-fill,minmax(calc(var(--bs)*1.08),1fr))!important;grid-auto-rows:var(--bs);grid-auto-flow:row!important;grid-auto-columns:0!important;gap:5px!important;align-content:start;padding:6px!important;scrollbar-width:thin;
 border-radius:4px;background:linear-gradient(180deg,#0f130e,#171d15);box-shadow:inset 0 0 0 1px #070906,inset 0 0 0 2px #5a6650,inset 0 6px 14px rgba(0,0,0,.55),0 1px 0 #7d8a6c}
body #side #panel .sub{display:none!important}
/* square icon buttons */
body #side #panel .btn{position:relative;display:flex!important;flex-direction:column!important;align-items:stretch;justify-content:flex-start;width:auto!important;min-width:0!important;height:var(--bs)!important;min-height:0!important;padding:3px 3px 2px!important;gap:1px;overflow:hidden;text-align:center;border-radius:4px;border:0!important;
 background:linear-gradient(180deg,#59654f 0,#3e4839 14%,#2a3127 100%)!important;box-shadow:inset 0 1px 0 #a6b392,inset 0 0 0 1px #151913,0 2px 0 #0a0c08!important;transition:none}
body #side #panel .btn.wide{width:auto!important;height:var(--bs)!important;grid-column:span 4;text-align:left;justify-content:center;padding:6px 12px!important}
body #side #panel .btn.wide .n{font-size:14px!important;white-space:normal;text-align:left}
body #side #panel .btn.wide .d{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.25;color:#b9c4a6;text-align:left}
body #side #panel .btn[hidden],body #side #panel .btn[style*="display: none"],body #side #panel .sub[hidden]{display:none!important}
body #side #panel .btn.hasic canvas.uic{position:static!important;display:block!important;order:0;width:100%!important;height:calc(var(--bs) - 1.45em - 8px)!important;min-height:18px;flex:none;object-fit:contain;border-radius:2px;background:radial-gradient(circle at 50% 50%,#4f5d48,#1a2018 88%);box-shadow:inset 0 0 0 1px #0d100b}
body #side #panel .btn{font-size:clamp(11px,calc(var(--bs)*.17),14px)}
body #side #panel .btn .n{position:static!important;order:1;width:auto!important;margin-top:2px;font:800 1em/1.15 system-ui,sans-serif!important;color:#f2f6e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;text-shadow:0 1px 1px #000}
body #side #panel .btn .c{position:absolute!important;right:5px;bottom:calc(1.45em + 5px);z-index:2;font:800 .92em/1 "IBM Plex Mono",ui-monospace,monospace!important;color:var(--gold)!important;background:rgba(8,10,7,.82);padding:2px 4px;border-radius:2px;box-shadow:0 0 0 1px rgba(232,200,92,.25)}
body #side #panel .btn:not(.wide) .d{display:none!important}
body #side #panel .btn:not(.hasic){justify-content:center}
body #side #panel .btn:not(.hasic) .n{white-space:normal}
body #side #panel .btn:not(.hasic) .c{position:static!important;background:none;box-shadow:none;margin-top:3px}
body #side #panel .btn.wide .c{position:static!important;background:none;box-shadow:none}
body #side #panel .btn .q{position:absolute!important;right:4px;top:3px;left:auto!important;bottom:auto!important;font:800 13px system-ui,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 1px 1px #000;background:none;padding:0}
body #side #panel .btn .p{position:absolute!important;left:3px;bottom:3px;height:4px!important;border-radius:2px;background:#79d65b!important;box-shadow:0 0 4px #79d65b}
body #side #panel .btn:hover:not(:disabled){background:linear-gradient(180deg,#7a8a68 0,#556248 14%,#3b4635 100%)!important;box-shadow:inset 0 1px 0 #dbe8c4,inset 0 0 0 2px #e8c85c,0 2px 0 #0a0c08!important}
body #side #panel .btn:active:not(:disabled){background:linear-gradient(180deg,#1e231b,#2f382b)!important;box-shadow:inset 0 3px 6px #000,inset 0 0 0 1px #000!important;transform:translateY(1px)}
body #side #panel .btn:disabled,body #side #panel .btn.dis{filter:grayscale(.85) brightness(.62);box-shadow:inset 0 0 0 1px #151913!important}
/* right edge: Strike Center + general rank */
body #side .stat>.sup.rk{grid-column:4;grid-row:1;margin:0!important;padding:2px 10px!important;min-width:0;display:flex!important;flex-direction:column;justify-content:center;gap:2px;border-radius:4px;background:linear-gradient(180deg,#10140f,#1b2118);box-shadow:inset 0 0 0 1px #070906,inset 0 0 0 2px #5a6650,0 1px 0 #7d8a6c;overflow:hidden}
body #side .stat>.sup.rk .lbl{font-size:12px;display:flex;justify-content:space-between;gap:6px;white-space:nowrap}
body #side .stat>.sup.rk .lbl span:first-child{overflow:hidden;text-overflow:ellipsis;color:#e8c85c;font-weight:700}
body #side .stat>.sup.sw{grid-column:4;grid-row:2;display:flex!important;flex-direction:column;justify-content:center;gap:8px;margin:0!important;padding:12px!important;border-radius:4px;background:linear-gradient(180deg,#141914,#0e120d);box-shadow:inset 0 0 0 1px #070906,inset 0 0 0 2px #5a6650,inset 0 8px 18px rgba(0,0,0,.5),0 1px 0 #7d8a6c}
body #side .stat>.sup.sw .lbl{display:flex;flex-direction:column;gap:3px}
body #side .stat>.sup.sw #supname{font:800 15px system-ui,sans-serif;letter-spacing:.04em;color:#f1f5e4}
body #side .stat>.sup.sw #supt{font:700 13px "IBM Plex Mono",monospace;color:#e8c85c}
body #side .stat>.sup.rk .bar{height:6px!important}
body #side .stat>.sup .bar{height:10px!important;border-radius:2px;background:#050704!important;box-shadow:inset 0 0 0 1px #3d4733}
body #side .stat>.sup.sw #supbtn{font:800 16px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;height:48px;border-radius:4px;border:1px solid #2a0d08;color:#fff;background:linear-gradient(180deg,#d65a3c,#8f2a18);box-shadow:inset 0 1px 0 #ff9a7a,0 2px 0 #0a0c08}
body #side .stat>.sup.sw #supbtn:disabled{filter:grayscale(.9) brightness(.55)}
}
`;document.head.append(st);}
