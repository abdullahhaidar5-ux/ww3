// ===== In-game UI kit (ingameui 2026-11-07, Abdullah 12:06 "Menus in game need to be much more intuitive and professional").
// ONE set of in-game components, styled like the redesigned main menu (Saira Condensed headers, gold accent, quiet panels):
// UK.tabs (text tab bar, one pane shown), UK.chip (icon + number), UK.sec (small caps header), UK.card (icon card with
// name/count/cost/time, disabled reason on hover), UK.seg (segmented choice), UK.tip (the one tooltip style, see slice 4).
// Used by: grand-map province panel (13c guSide), battle command panel, pause menu. Extend here, never add a second kit.
const UK=(function(){
const E=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
const st=E('style');st.id='ukCss';st.textContent=`
.uk{font:14px/1.4 var(--mono,monospace);color:#e6e2d6}
.uk-hd{display:flex;align-items:center;gap:10px;margin:0 0 6px}
.uk-hd canvas{width:36px;height:24px;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.35),0 2px 6px rgba(0,0,0,.5);flex:none}
.uk-hd h2{margin:0;font:600 24px/1 var(--display,sans-serif);letter-spacing:.02em;color:#f2ead2}
.uk-sub{font-size:13px;color:#a9b4bd;margin-top:2px}
.uk-badge{display:inline-block;font:600 11px/1 var(--display,sans-serif);letter-spacing:.12em;text-transform:uppercase;padding:3px 6px;border-radius:3px;border:1px solid #e3b341;color:#e3b341;margin-left:6px;vertical-align:1px}
.uk-badge.red{border-color:#e07a68;color:#ff9d8e}
.uk-chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 10px}
.uk-chip{display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;background:#0c1620;border:1px solid #23384b;font-size:13px;cursor:default}
.uk-chip i{font-style:normal;opacity:.9}.uk-chip b{color:#f2ead2;font-weight:600}.uk-chip.warn b{color:#ff9d8e}.uk-chip.good b{color:#9ee07a}
.uk-tabs{display:flex;gap:2px;border-bottom:1px solid #2c4358;margin:4px 0 10px}
.uk-tab{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:#8fa2b2;font:600 15px/1 var(--display,sans-serif);letter-spacing:.05em;white-space:nowrap;text-transform:uppercase;padding:8px 2px 7px;cursor:pointer;transition:color .15s,border-color .15s}
.uk-tab:hover{color:#e6e2d6}.uk-tab.on{color:#e3b341;border-bottom-color:#e3b341}
.uk-tab sup{font:600 10px var(--mono,monospace);color:#e3b341;margin-left:3px;letter-spacing:0}
.uk-pane{display:none}.uk-pane.on{display:block;animation:ukIn .18s ease-out}
@keyframes ukIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.uk-sec{font:600 12px/1 var(--display,sans-serif);letter-spacing:.16em;text-transform:uppercase;color:#8fa2b2;margin:12px 0 6px;display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.uk-sec:first-child{margin-top:2px}.uk-sec span{font:12px var(--mono,monospace);letter-spacing:0;text-transform:none;color:#a9b4bd}
.uk-note{font-size:13px;color:#a9b4bd;margin:4px 0}
.uk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.uk-list{display:grid;grid-template-columns:1fr;gap:5px}
.uk-list .uk-card .ic{width:52px;height:38px}.uk-list .uk-card .mt{padding-right:0}.uk-list .uk-card .ct{top:50%;transform:translateY(-50%);right:34px;font-size:14px}
.uk-card{position:relative;display:flex;gap:8px;align-items:center;text-align:left;padding:6px;border-radius:5px;background:linear-gradient(#162636,#111d29);border:1px solid #2a4157;color:#e6e2d6;cursor:pointer;font:inherit;min-width:0;transition:border-color .12s,background .12s,transform .12s}
.uk-card:hover{border-color:#e3b341;background:linear-gradient(#1c3044,#14222f)}.uk-card:active{transform:translateY(1px)}
.uk-card.off{opacity:.5;cursor:not-allowed;filter:grayscale(.6)}.uk-card.off:hover{border-color:#2a4157}
.uk-card.sel{border-color:#e3b341;box-shadow:inset 0 0 0 1px #e3b341}
.uk-card .ic{flex:none;width:44px;height:34px;border-radius:3px;display:flex;align-items:center;justify-content:center;font:700 16px var(--display,sans-serif);overflow:hidden}
.uk-card .ic canvas{width:100%;height:100%}
.uk-card .tx{min-width:0;flex:1}.uk-card .nm{font:600 15px/1.1 var(--display,sans-serif);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-card .mt{padding-right:20px;font-size:12px;color:#a9b4bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.uk-card .mt b{color:#e3b341;font-weight:600}
.uk-card .ct{position:absolute;top:3px;right:5px;font:600 12px var(--mono,monospace);color:#e3b341}
.uk-list .uk-card .rp{top:50%;bottom:auto;transform:translateY(-50%);font-size:15px;padding:2px 6px}
.uk-card .rp{position:absolute;bottom:3px;right:4px;font-size:12px;padding:0 4px;border-radius:3px;color:#8fa2b2;border:1px solid transparent}
.uk-card .rp:hover{color:#fff;border-color:#4a6580}.uk-card .rp.on{color:#e3b341;border-color:#e3b341}
.uk-seg{display:flex;border:1px solid #2c4358;border-radius:5px;overflow:hidden}
.uk-seg button{flex:1;background:#101c28;border:0;border-right:1px solid #2c4358;color:#a9b4bd;font:600 14px/1 var(--display,sans-serif);letter-spacing:.06em;padding:7px 4px;cursor:pointer}
.uk-seg button:last-child{border-right:0}.uk-seg button:hover{color:#fff}.uk-seg button.on{background:#3a3418;color:#f2d27a}
.uk-link{background:none;border:0;padding:4px 0;color:#e3b341;font:600 14px var(--display,sans-serif);letter-spacing:.06em;cursor:pointer;text-transform:uppercase}
.uk-link:hover{color:#ffe08a;text-decoration:underline}.uk-link.dim{color:#8fa2b2}
.uk-acts{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}
.uk-q{font-size:12px;color:#c9c3b0;margin-top:6px;padding:5px 7px;border-left:2px solid #e3b341;background:#0c1620}
/* battle command panel (slice 2): silhouette icon cards, selected-unit card */
#panel .btn.hasic{padding-left:47px!important}
#panel .btn .uic{position:absolute;left:4px;top:50%;transform:translateY(-50%);width:38px;height:30px;border-radius:2px;background:linear-gradient(180deg,#36473d,#141b17);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
#panel .btn.on .uic{box-shadow:inset 0 0 0 1px var(--accent,#e3b341)}
.uk-mu{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.uk-mu .mr{display:flex;align-items:flex-start;gap:8px;padding:4px 7px;border-radius:4px}.uk-mu .mul{display:flex;flex-wrap:wrap;gap:3px 10px;min-width:0}
.uk-mu .mr.g{background:rgba(52,150,80,.24);box-shadow:inset 0 0 0 1px rgba(110,220,130,.5)}.uk-mu .mr.r{background:rgba(170,52,44,.26);box-shadow:inset 0 0 0 1px rgba(240,120,105,.5)}
.uk-mu .mr b{font:700 11px var(--display,sans-serif);letter-spacing:.09em;min-width:56px;flex:none;line-height:21px}.uk-mu .mr.g b{color:#9be8a6}.uk-mu .mr.r b{color:#f3a096}
.uk-mu .mi{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#e6e2d6;white-space:nowrap}.uk-mu .mi img{width:28px;height:21px}.uk-mu .mi i{font-style:normal}
#panel .btn .uk-mu.mini{position:absolute;right:3px;top:50%;transform:translateY(-50%);width:26px;margin:0;gap:2px;pointer-events:none}
#panel .btn .uk-mu.mini .mr{padding:0;gap:1px;height:17px;justify-content:center;flex-wrap:nowrap;border-radius:2px}
#panel .btn .uk-mu.mini img{width:22px;height:16px;display:block}
#panel .btn.hasmu{padding-right:32px!important}#panel .btn.hasmu .q{right:33px}
#panel .btn:disabled .uk-mu.mini{opacity:.75}
#panel .btn.ctr{box-shadow:0 0 0 2px #6fe08a,0 0 14px rgba(111,224,138,.55)!important;z-index:1}
#panel .btn.ctr::after{content:'BEATS IT';position:absolute;left:4px;bottom:2px;font:800 8.5px/1 var(--display,sans-serif);letter-spacing:.06em;color:#06220c;background:#6fe08a;padding:1px 3px;border-radius:2px}
.tabs button.ctr{box-shadow:inset 0 -3px 0 #6fe08a}
#info .ukBy{margin-top:4px}
#info .ukU{display:flex;gap:9px;align-items:center;margin:0 0 4px}
#info .ukU img{width:52px;height:40px;flex:none;border-radius:3px;background:linear-gradient(180deg,#36473d,#141b17);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
#info .ukUt{min-width:0;flex:1}#info .ukUt b{display:block;font:600 16px/1.1 var(--display,sans-serif)}
#info .ukHp{display:block;height:5px;background:#0008;border-radius:2px;margin:3px 0 2px;overflow:hidden}#info .ukHp b{display:block;height:100%}
#info .ukV{font:600 11px var(--display,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#e3b341)}
#info .ukG{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 4px}#info .ukG span{position:relative}#info .ukG img{width:40px;height:30px;border-radius:2px;background:linear-gradient(180deg,#36473d,#141b17)}
#info .ukG em{position:absolute;right:2px;bottom:0;font:600 11px var(--mono,monospace);font-style:normal;color:#fff;text-shadow:0 1px 2px #000}
#ukTip{position:fixed;z-index:99990;pointer-events:none;max-width:320px;background:rgba(14,19,17,.97);border:1px solid #4a5a52;border-left:3px solid var(--accent,#e3b341);border-radius:2px;padding:8px 10px;color:#e6e2d6;font:13px/1.4 var(--mono,monospace);box-shadow:0 8px 24px rgba(0,0,0,.55);opacity:0;transition:opacity .12s}
#ukTip.on{opacity:1}#ukTip .t{font:700 15px/1.15 var(--display,sans-serif);letter-spacing:.02em;color:#f2ead2;margin-bottom:3px}
#ukTip .d{color:#b9c2c9}#ukTip .r{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #23384b;margin-top:5px;padding-top:4px;color:#e3b341}
#ukTip .w{color:#ff9d8e;margin-top:4px}
`;
(document.head||document.documentElement).appendChild(st);
/* Command-bar silhouettes (bugsA 2026-11-10): one clear picture per kind of thing, same flat cream-on-dark hand, no text. The class comes
   from the unit key + its stats/name (the key alone is shared across nations: 'arty' is a howitzer for the US but a rocket truck for
   Iran), and NOTHING that is not infantry falls back to the soldier. iconClass() is also what the tests read (UK.iconBranch). */
function iconClass(k,s){s=s||{};const nm=String(s.name||''),cl=s.cls||'';k=String(k||'');
  if(/^d(tank|sam|arty)$/.test(k))k=k==='dsam'?'sam':k.slice(1);
  if(k==='jeep'||k==='raidlead'||/technical/i.test(nm))return'jeep';
  if(k==='tank'||/tank|mbt/.test(k))return'tank';
  if(k==='sam'||k==='idome')return'samv';
  if(k==='atgm')return'atgmv';
  if(/^(ifv|apc)$/.test(k)||/^veh/.test(k))return'apc';
  if(k==='jeep'||k==='raidlead'||/technical/i.test(nm))return'jeep';
  if(k==='arty'||/arty|mlrs|how/.test(k))return(s.rocket||/rocket|launcher|mlrs|tos-|himars|phl|grad|fateh|smerch|uragan|bm-/i.test(nm))?'mlrs':'gun';
  if(k==='aa')return'spaa';
  if(k==='ew')return'ew';
  if(k==='cbr')return'radarv';
  if(k==='airlift'||(/heli|transport|chinook|mi-8|nh90|bell 214|z-8/i.test(nm)&&s.noAttack))return'lift';
  if(k==='heli'||/heli|chop/.test(k))return'heli';
  if(/jet|plane|bomb/.test(k))return'jet';
  if(k==='drone'||/drone|uav|shahed|lancet|loiter|fpv|quad|mq|tb2|delta/.test(k)){if(/mq-|reaper|tb2|bayraktar|heron|wing loong|predator|mohajer|akinci|orion|hermes|male/i.test(nm))return'male';if(/quad|fpv|loiter|lancet|switchblade|mavic|matrice/i.test(nm+' '+k))return'quad';return'delta';}
  if(k==='sub'||cl==='sub')return'sub';
  if(k==='fast')return'fast';
  if(k==='ship'||cl==='ship')return'ship';
  if(k==='lander'||/hovercraft/i.test(nm))return'hover';
  if(k==='minel')return'minel';
  if(k==='sweep')return'sweep';
  if(k==='carrier')return'carrier';
  if(/boat/.test(k)||cl==='boat')return'boat';
  if(/harv|truck|supply/.test(k))return'truck';
  if(k==='dozer')return'dozer';
  if(k==='medic')return'medic';
  if(/sapper|eng/.test(k))return'eng';
  if(/snip|marks/.test(k))return'sniper';
  if(/manpad|stinger|igla/.test(k))return'manpad';
  if(k==='at'||k==='atk')return'at';
  if(k==='mortar')return'mortar';
  if(k==='hacker')return'hacker';
  if(k==='commissar'||k==='cleric')return'commissar';
  if(k==='officer'||k==='hero')return'officer';
  if(k==='spy')return'spy';
  if(k==='champ'||cl==='hero')return'squad';
  if(k==='recon')return'recon';
  if(cl&&cl!=='inf'&&s.dom==='ground')return'apc';
  return'inf';}
function drawUnit(c,k,W,H,col,st){const K=iconClass(k,st);c.save();c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);
  const L='#e9e4d4',D='#0b130f',DM='#0008';c.fillStyle=L;c.strokeStyle=L;c.lineWidth=3;c.lineCap='round';
  const rect=(x,y,w,h,f)=>{c.fillStyle=f||L;c.fillRect(x,y,w,h);},line=(x1,y1,x2,y2,w,f)=>{c.strokeStyle=D;c.lineWidth=w+2.4;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle=f||L;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();},
    poly=(pts,f)=>{c.fillStyle=f||L;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();},dot=(x,y,r,f)=>{c.fillStyle=f||DM;c.beginPath();c.arc(x,y,r,0,7);c.fill();},
    wheels=(xs,y,r)=>{for(const x of xs)dot(x,y,r,D),dot(x,y,r*.45,L);},
    man=(ox,oy,sc)=>{c.save();c.translate(ox,oy);c.scale(sc,sc);c.fillStyle=L;c.beginPath();c.arc(0,-9,8,0,7);c.fill();c.beginPath();c.arc(0,-12,10,3.14,6.28);c.fillStyle=col;c.fill();c.fillStyle=L;c.beginPath();c.moveTo(-18,20);c.quadraticCurveTo(-18,2,0,2);c.quadraticCurveTo(18,2,18,20);c.fill();c.restore();},
    track=(x,y,w,h)=>{c.fillStyle=D;c.beginPath();c.roundRect?c.roundRect(x,y,w,h,h/2):c.rect(x,y,w,h);c.fill();for(let i=x+h/2;i<x+w-h/3;i+=h*.9)dot(i,y+h/2,h*.28,L);};
  switch(K){
  case'tank':rect(-26,4,52,12);c.fillStyle=L;c.beginPath();c.ellipse(0,2,15,9,0,0,7);c.fill();rect(0,-1,32,4);c.fillStyle=DM;for(let i=-22;i<=22;i+=11){c.beginPath();c.arc(i,11,4,0,7);c.fill();}break;
  case'apc':poly([[-30,14],[-30,-2],[12,-2],[30,7],[30,14]]);rect(-10,-11,18,9);rect(6,-9,22,3);wheels([-20,-6,8,22],14,6);break;
  case'atgmv':poly([[-30,14],[-30,0],[14,0],[30,8],[30,14]]);line(-6,-1,10,-22,5);line(4,-1,20,-20,5);poly([[8,-27],[14,-18],[4,-18]]);poly([[18,-25],[24,-16],[14,-16]]);wheels([-20,-6,8,22],14,6);break;
  case'jeep':rect(-28,3,56,8);poly([[2,3],[6,-8],[22,-8],[26,3]]);rect(8,-6,10,6,DM);line(-18,0,-6,-12,3);line(-6,-12,6,-12,3);wheels([-16,16],12,7);break;
  case'spaa':track(-28,6,56,10);rect(-18,-2,36,9);rect(-10,-10,22,9);line(4,-8,28,-28,5);line(12,-6,34,-22,5);line(-2,-8,-8,-12,3);break;
  case'samv':rect(-30,6,60,8);rect(14,-6,16,12);rect(18,-3,9,5,DM);for(const o of [0,8,16])line(-26+o,2,-10+o,-22,4);for(const o of [0,8,16])poly([[-10+o,-28],[-6+o,-20],[-14+o,-20]]);wheels([-22,-8,6,22],15,5);break;
  case'ew':rect(-30,6,60,8);rect(14,-6,16,12);rect(-26,-6,34,12);c.strokeStyle=L;c.lineWidth=3;c.beginPath();c.arc(-8,-18,13,.2,3.0,false);c.stroke();line(-8,-18,-8,-6,3);line(14,-6,14,-24,2);line(24,-6,24,-18,2);c.beginPath();c.arc(14,-26,4,0,7);c.stroke();wheels([-22,-8,6,22],15,5);break;
  case'radarv':rect(-30,6,60,8);rect(14,-6,16,12);rect(-26,-6,34,10);rect(-24,-26,30,18,L);rect(-21,-23,24,12,DM);line(-9,-8,-9,-2,3);wheels([-22,-8,6,22],15,5);break;
  case'gun':track(-28,6,56,10);poly([[-16,6],[-12,-6],[8,-6],[14,6]]);line(2,-3,34,-22,6);rect(31,-27,7,8,L);line(-16,6,-30,10,3);break;
  case'mlrs':rect(-30,7,60,8);rect(16,-5,14,12);rect(19,-2,8,5,DM);c.save();c.translate(-6,-4);c.rotate(-.5);rect(-24,-8,52,14);c.restore();for(const [x,y] of [[22,-24],[18,-17],[14,-10],[26,-18],[22,-11],[30,-12]])dot(x,y,3.2,D);wheels([-22,-8,6,22],15,5);break;
  case'truck':rect(-24,-8,30,18);rect(8,-2,16,12);rect(11,0,8,5,DM);wheels([-16,0,16],13,5);break;
  case'dozer':rect(-22,-2,30,12);rect(-8,-12,14,10);track(-24,8,40,9);poly([[24,-8],[30,-8],[30,16],[22,16]]);line(8,6,24,6,4);break;
  case'heli':c.fillStyle=L;c.beginPath();c.ellipse(-2,3,15,8,0,0,7);c.fill();rect(10,1,24,3);poly([[30,-8],[36,-8],[34,2],[30,2]]);rect(-28,-14,56,3);rect(-3,-12,3,6);line(-12,16,8,16,2);line(-8,10,-8,16,2);line(4,10,4,16,2);rect(-6,6,16,3);for(const x of [-8,6])rect(x,8,5,5,DM);line(-14,8,-26,12,2);break;
  case'lift':if(/chinook|ch-47/i.test(String(st&&st.name||''))){rect(-28,-2,56,12);poly([[28,-2],[34,4],[28,10]]);rect(-34,-12,32,3);rect(8,-12,32,3);rect(-14,-9,3,7);rect(22,-9,3,7);line(-26,14,26,14,2);rect(-22,2,10,6,DM);}
    else{c.fillStyle=L;c.beginPath();c.moveTo(-18,-4);c.lineTo(14,-4);c.lineTo(24,6);c.lineTo(14,12);c.lineTo(-18,12);c.closePath();c.fill();rect(-34,-2,18,4);poly([[-36,-10],[-30,-10],[-28,0],[-34,0]]);rect(-30,-16,60,3);rect(-1,-14,3,10);rect(-6,0,12,9,DM);rect(14,0,8,5,DM);line(-18,16,16,16,2);line(-10,12,-10,16,2);line(8,12,8,16,2);}break;
  case'jet':c.beginPath();c.moveTo(30,0);c.lineTo(-22,-4);c.lineTo(-22,4);c.closePath();c.fill();c.beginPath();c.moveTo(4,0);c.lineTo(-10,-22);c.lineTo(-16,-22);c.lineTo(-8,0);c.lineTo(-16,22);c.lineTo(-10,22);c.closePath();c.fill();rect(-26,-9,6,18);break;
  case'delta':c.beginPath();c.moveTo(30,0);c.lineTo(-20,-24);c.lineTo(-14,0);c.lineTo(-20,24);c.closePath();c.fill();rect(-24,-26,5,8);rect(-24,18,5,8);break;
  case'male':rect(-28,-3,54,6);poly([[26,-3],[34,0],[26,3]]);c.beginPath();c.ellipse(16,0,9,5,0,0,7);c.fill();rect(-2,-36,9,72);poly([[-28,-3],[-36,-14],[-30,-14],[-22,-3]]);poly([[-28,3],[-36,14],[-30,14],[-22,3]]);line(-24,0,-30,0,2);break;
  case'quad':line(-20,-18,20,18,4);line(20,-18,-20,18,4);rect(-8,-6,16,12);for(const [x,y] of [[-22,-20],[22,-20],[-22,20],[22,20]]){c.strokeStyle=L;c.lineWidth=2.5;c.beginPath();c.ellipse(x,y,11,4.5,0,0,7);c.stroke();}break;
  case'boat':poly([[-30,4],[30,4],[22,14],[-26,14]]);rect(-10,-8,16,12);rect(-2,-18,3,10);line(14,3,26,-8,3);poly([[22,-10],[28,-8],[26,-4]]);break;
  case'fast':poly([[-30,6],[26,0],[30,-4],[30,8],[22,14],[-28,14]]);rect(-6,-6,14,7);line(-34,-2,-42,-2,2);line(-34,4,-46,4,2);line(10,-1,24,-7,3);rect(-24,0,7,4,DM);rect(-14,0,7,4,DM);break;
  case'ship':poly([[-36,4],[34,4],[26,14],[-32,14]]);rect(-14,-8,28,12);rect(-4,-16,14,8);rect(2,-28,3,12);line(-2,-24,12,-24,2);c.beginPath();c.arc(24,4,6,Math.PI,0);c.fill();line(24,0,38,-8,3);for(const x of [-30,-24,-18])rect(x,-1,4,5,DM);break;
  case'sub':c.fillStyle=L;c.beginPath();c.ellipse(0,8,34,8,0,0,7);c.fill();rect(-8,-6,16,12);rect(-2,-16,3,10);rect(-2,-16,8,2.5);poly([[-34,8],[-40,0],[-34,2]]);poly([[-34,8],[-40,16],[-34,14]]);line(-24,22,24,22,2);break;
  case'hover':rect(-34,8,68,8,DM);c.fillStyle=L;c.beginPath();c.roundRect?c.roundRect(-34,2,68,10,5):c.rect(-34,2,68,10);c.fill();rect(-14,-8,24,10);poly([[34,2],[40,10],[34,10]]);rect(-30,-14,4,16);rect(-33,-17,10,3);rect(22,-14,4,16);rect(19,-17,10,3);break;
  case'minel':poly([[-30,4],[30,4],[22,14],[-26,14]]);rect(8,-8,14,12);rect(12,-16,3,8);for(const x of [-24,-14,-4]){dot(x,-1,4.5,L);line(x,-6,x,-9,2);line(x-5,-1,x-8,-1,2);line(x+5,-1,x+8,-1,2);}break;
  case'sweep':poly([[-30,4],[30,4],[22,14],[-26,14]]);rect(-4,-8,16,12);rect(2,-18,3,10);line(-30,6,-44,22,2);dot(-44,22,4,L);c.strokeStyle=L;c.lineWidth=2;c.beginPath();c.moveTo(-26,10);c.quadraticCurveTo(-30,24,-44,22);c.stroke();break;
  case'carrier':poly([[-40,4],[40,4],[34,14],[-38,14]]);rect(-38,-2,76,6);rect(8,-14,12,12);rect(12,-24,3,10);break;
  case'medic':rect(-5,-16,10,32);rect(-16,-5,32,10);break;
  case'at':man(-6,2,1);line(-22,0,32,-16,7);poly([[30,-23],[38,-20],[36,-10],[28,-12]]);rect(-4,-5,14,4,DM);break;
  case'sniper':man(-8,2,1);line(-26,14,40,-10,3);rect(2,-12,12,4);line(30,-8,36,6,2);line(30,-8,22,6,2);break;
  case'manpad':man(-6,2,1);line(-22,2,26,-20,6);poly([[26,-27],[32,-18],[22,-17]]);rect(-4,-6,12,4,DM);break;
  case'eng':man(-8,2,1);line(-26,16,2,-8,4);c.strokeStyle=L;c.lineWidth=5;c.beginPath();c.arc(8,-14,8,2.6,6.6,false);c.stroke();break;
  case'mortar':line(-16,14,12,-22,7);rect(-26,15,26,5);line(6,-6,22,16,3);line(6,-6,30,8,3);man(26,6,.55);break;
  case'hacker':man(-10,2,1);rect(2,2,28,15,L);rect(5,4,22,10,DM);rect(-1,17,34,3,L);break;
  case'officer':man(0,2,1);rect(-13,-19,26,4,L);rect(-9,-21,18,3,col);for(const x of [-16,10])line(x+3,3,x+7,9,4);poly([[0,8],[2,13],[7,13],[3,16],[5,21],[0,18],[-5,21],[-3,16],[-7,13],[-2,13]],DM);break;
  case'commissar':man(-8,2,1);rect(-14,-19,24,4,L);line(24,-30,24,18,2.5);rect(24,-30,18,12,col);poly([[28,-27],[30,-22],[36,-22],[31,-19],[33,-13],[28,-17],[23,-13],[25,-19],[20,-22],[26,-22]],'#f2ead2');break;
  case'spy':man(0,2,1);/* plain clothes: flat cap with a peak, dark glasses, a satchel on a strap, phone at the ear */c.beginPath();c.arc(0,-12,10.5,3.14,6.28);c.fillStyle=L;c.fill();rect(-11,-13,26,3.5,L);rect(-7,-9,14,3.5,D);line(-11,5,9,19,2.2,D);rect(6,14,13,10,L);rect(8,16,9,2,D);rect(-14,-12,4.5,10,L);break;
  case'squad':man(-18,5,.8);man(18,5,.8);man(0,-1,1.05);rect(-6,-15,12,4,D);line(-6,10,26,-6,3);break;
  case'recon':man(-8,4,.95);c.save();c.translate(24,-20);rect(-3,-2,6,4);line(-12,-8,12,8,2);line(12,-8,-12,8,2);for(const [x,y] of [[-12,-8],[12,-8],[-12,8],[12,8]]){c.strokeStyle=L;c.lineWidth=1.6;c.beginPath();c.ellipse(x,y,5,2,0,0,7);c.stroke();}c.restore();break;
  default:man(0,2,1);line(-16,13,28,-6,3.5);rect(-4,6,5,8,DM);}
  c.restore();}
function iconBranch(k,bld,st){return bld?bldClass(k,st):iconClass(k,st);}
/* building silhouettes for the battle BUILD tab (same hand as drawUnit) */
function bldClass(k,st){k=String(k||'');const nm=String((st&&st.name)||'');
  if(/factory/.test(k))return'factory';if(/airfield/.test(k))return'airfield';if(/shipyard/.test(k))return'shipyard';if(/depot/.test(k))return'depot';
  if(/uplink/.test(k))return'uplink';if(/coast/.test(k))return'coast';if(/sam/.test(k))return'sam';if(/turret|gun|battery/.test(k))return'turret';
  if(/econ|oil/.test(k))return/oil|gas|pipeline|petrol|crude|derrick|refiner/i.test(nm)||k==='oil'?'oil':'bank';
  if(/tunnel/.test(k))return'tunnel';if(/fort/.test(k))return'fort';if(/radio/.test(k))return'radio';if(/hq/.test(k))return'hq';if(/barracks/.test(k))return'barracks';return'house';}
function drawBld(c,k,W,H,st){const K=bldClass(k,st);c.save();c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);c.fillStyle='#e9e4d4';c.strokeStyle='#e9e4d4';c.lineWidth=3;c.lineCap='round';
  const D='#101a24';
  switch(K){
  case'factory':c.beginPath();c.moveTo(-28,16);for(let i=0;i<3;i++){c.lineTo(-28+i*16,-2);c.lineTo(-12+i*16,-10);c.lineTo(-12+i*16,-2);}c.lineTo(22,16);c.closePath();c.fill();c.fillRect(22,-22,7,38);break;
  case'airfield':c.fillRect(-30,10,60,6);c.fillRect(-6,-16,10,26);c.fillRect(-12,-24,22,9);break;
  case'shipyard':c.fillRect(-28,8,56,8);c.fillRect(-18,-22,5,30);c.fillRect(-18,-22,34,4);c.fillRect(12,-18,2,16);break;
  case'depot':for(const [x,y] of [[-22,0],[-4,0],[14,0],[-13,-16],[5,-16]])c.fillRect(x,y,15,14);break;
  case'oil':c.beginPath();c.moveTo(-16,16);c.lineTo(0,-24);c.lineTo(16,16);c.stroke();c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.moveTo(-6,-10);c.lineTo(6,-10);c.stroke();c.fillRect(-20,14,40,4);break;
  case'bank':c.beginPath();c.moveTo(-30,-6);c.lineTo(0,-24);c.lineTo(30,-6);c.closePath();c.fill();for(const x of [-22,-8,6,20])c.fillRect(x,-2,7,18);c.fillRect(-32,16,64,5);c.fillStyle=D;c.beginPath();c.arc(0,-11,5,0,7);c.fill();break;
  case'uplink':c.fillRect(-26,12,52,6);c.fillRect(-5,-18,10,30);c.beginPath();c.moveTo(-5,-18);c.quadraticCurveTo(0,-34,5,-18);c.fill();c.beginPath();c.moveTo(-5,4);c.lineTo(-14,14);c.lineTo(-5,12);c.closePath();c.fill();c.beginPath();c.moveTo(5,4);c.lineTo(14,14);c.lineTo(5,12);c.closePath();c.fill();c.fillStyle=D;c.fillRect(-5,-8,10,3);break;
  case'sam':c.fillRect(-24,8,48,9);c.fillRect(-8,0,16,10);for(const o of [-10,4]){c.lineWidth=7;c.strokeStyle=D;c.beginPath();c.moveTo(o,2);c.lineTo(o+16,-20);c.stroke();c.lineWidth=5;c.strokeStyle='#e9e4d4';c.beginPath();c.moveTo(o,2);c.lineTo(o+16,-20);c.stroke();c.beginPath();c.moveTo(o+19,-26);c.lineTo(o+22,-17);c.lineTo(o+11,-19);c.closePath();c.fill();}break;
  case'coast':c.fillRect(-28,6,50,8);c.save();c.translate(-4,2);c.rotate(-.35);c.fillRect(-14,-9,40,9);c.fillStyle=D;for(const x of [18,10,2])c.fillRect(x,-6,5,3);c.restore();c.lineWidth=2.5;c.beginPath();c.moveTo(-34,22);c.quadraticCurveTo(-26,16,-18,22);c.quadraticCurveTo(-10,28,-2,22);c.quadraticCurveTo(6,16,14,22);c.quadraticCurveTo(22,28,30,22);c.stroke();break;
  case'turret':c.fillRect(-20,4,40,12);c.beginPath();c.arc(0,4,11,Math.PI,0);c.fill();c.lineWidth=5;c.beginPath();c.moveTo(4,-2);c.lineTo(28,-16);c.stroke();break;
  case'tunnel':c.beginPath();c.moveTo(-26,16);c.lineTo(-26,0);c.arc(0,0,26,Math.PI,0);c.lineTo(26,16);c.closePath();c.fill();c.fillStyle=D;c.beginPath();c.moveTo(-12,16);c.lineTo(-12,2);c.arc(0,2,12,Math.PI,0);c.lineTo(12,16);c.fill();break;
  case'fort':c.beginPath();c.moveTo(-28,16);c.lineTo(-22,-6);c.lineTo(22,-6);c.lineTo(28,16);c.closePath();c.fill();c.fillStyle=D;c.fillRect(-14,0,28,4);break;
  case'radio':c.beginPath();c.moveTo(-12,16);c.lineTo(0,-24);c.lineTo(12,16);c.stroke();c.beginPath();c.arc(0,-24,6,0,7);c.stroke();c.beginPath();c.arc(0,-24,13,-.9,.9);c.stroke();break;
  case'hq':c.fillRect(-28,-2,56,18);c.fillRect(-12,-14,24,12);c.fillRect(10,-30,2,18);c.fillRect(12,-30,12,7);break;
  default:c.fillRect(-26,-4,52,20);c.beginPath();c.moveTo(-30,-4);c.lineTo(0,-20);c.lineTo(30,-4);c.closePath();c.fill();}
  c.restore();}
function tabs(host,list,cur,onPick){const bar=E('div','uk-tabs'),panes={};let pick=list.some(t=>t[0]===cur)?cur:list[0][0];
  for(const [k,label,badge] of list){const b=E('button','uk-tab'+(k===pick?' on':''),label);b.type='button';b.dataset.pt=k;if(badge){const s=E('sup','',String(badge));b.appendChild(s);}
    b.onclick=()=>{bar.querySelectorAll('.uk-tab').forEach(x=>x.classList.toggle('on',x===b));for(const q in panes)panes[q].classList.toggle('on',q===k);if(onPick)onPick(k);};bar.appendChild(b);
    panes[k]=E('div','uk-pane'+(k===pick?' on':''));panes[k].dataset.pane=k;}
  host.appendChild(bar);for(const [k] of list)host.appendChild(panes[k]);return panes;}
function chip(icon,val,label,tone){const c=E('span','uk-chip'+(tone?' '+tone:''));c.innerHTML='<i>'+icon+'</i><b></b>';c.querySelector('b').textContent=val;if(label)c.dataset.tt=label;return c;}
function sec(title,right){const d=E('div','uk-sec',title);if(right!=null){const s=E('span','',right);d.appendChild(s);}return d;}
function card(o){const b=E('button','uk-card'+(o.on===false?' off':'')+(o.sel?' sel':''));b.type='button';const ic=E('div','ic');
  if(o.icon instanceof HTMLElement)ic.appendChild(o.icon);else{ic.textContent=o.icon||'';ic.style.background=(o.col||'#4a6580')+'33';ic.style.border='1px solid '+(o.col||'#4a6580');ic.style.color=o.col||'#e6e2d6';}
  b.appendChild(ic);const tx=E('div','tx');tx.appendChild(E('div','nm',o.name));const mt=E('div','mt');mt.innerHTML=o.meta||'';tx.appendChild(mt);b.appendChild(tx);
  if(o.count)b.appendChild(E('span','ct',o.count));
  b.dataset.tt=JSON.stringify({t:o.name,d:o.desc||'',r:o.rows||[],w:o.on===false?(o.why||''):''});
  b.onclick=e=>{if(e.target.classList.contains('rp'))return;if(o.on===false){if(o.onDenied)o.onDenied();return;}if(o.onclick)o.onclick();};return b;}
function seg(names,cur,fn,tips){const s=E('div','uk-seg');names.forEach((n,i)=>{const b=E('button',i===cur?'on':'',n);b.type='button';if(tips&&tips[i])b.dataset.tt=tips[i];b.onclick=()=>fn(i);s.appendChild(b);});return s;}
function link(t,fn,tip,dim){const b=E('button','uk-link'+(dim?' dim':''),t);b.type='button';if(tip)b.dataset.tt=tip;b.onclick=fn;return b;}
/* ---- the one tooltip: any element with data-tt (plain text or JSON {t,d,r:[[k,v]],w}) or a title attribute inside game UI ---- */
const icC={};function icon(k,col,bld){const key=k+'|'+col+'|'+(bld?1:0);let u=icC[key];if(!u){const cv=document.createElement('canvas');cv.width=104;cv.height=80;const x=cv.getContext('2d');try{if(bld)drawBld(x,k,104,80);else drawUnit(x,k,104,80,col||'#7a8a6a');}catch(e){}u=icC[key]=cv.toDataURL();}const im=document.createElement('img');im.src=u;im.alt='';return im;}
let tipEl=null,tipFor=null;
function tipShow(el,x,y){let raw=el.dataset.tt;if(raw==null)return;let o;if(raw[0]==='{'){try{o=JSON.parse(raw);}catch(e){o={d:raw};}}else{const L=raw.split(/\n| — | - (?=[A-Z])/);o=L.length>1&&L[0].length<40?{t:L[0],d:L.slice(1).join(' ')}:{d:raw};}
  if(!o.t&&!o.d)return;if(!tipEl){tipEl=E('div');tipEl.id='ukTip';document.body.appendChild(tipEl);}
  tipEl.innerHTML='';if(o.t)tipEl.appendChild(E('div','t',o.t));if(o.d)tipEl.appendChild(E('div','d',o.d));for(const r of (o.r||[])){const d=E('div','r');d.appendChild(E('span','',r[0]));d.appendChild(E('b','',String(r[1])));tipEl.appendChild(d);}if(o.w)tipEl.appendChild(E('div','w',o.w));
  tipFor=el;tipMove(x,y);tipEl.classList.add('on');}
function tipMove(x,y){if(!tipEl)return;const w=tipEl.offsetWidth,h=tipEl.offsetHeight;let L=x+16,T=y+18;if(L+w>innerWidth-6)L=x-w-12;if(T+h>innerHeight-6)T=y-h-12;tipEl.style.left=Math.max(4,L)+'px';tipEl.style.top=Math.max(4,T)+'px';}
function tipHide(){tipFor=null;if(tipEl)tipEl.classList.remove('on');}
function tipAt(t){for(let e=t,i=0;e&&e!==document.body&&i<6;e=e.parentElement,i++){if(e.nodeType!==1)continue;   /* a fresh title (code may rewrite it) wins over an older converted one */
    if(e.title&&typeof e.title==='string'){e.dataset.tt=e.title;e.removeAttribute('title');return e;}if(e.dataset&&e.dataset.tt!=null)return e;}return null;}
document.addEventListener('mouseover',e=>{const el=tipAt(e.target);if(!el){if(tipFor)tipHide();return;}if(el!==tipFor)tipShow(el,e.clientX,e.clientY);},true);
document.addEventListener('mousemove',e=>{if(tipFor){if(!tipFor.isConnected)tipHide();else if(tipFor.title){const el=tipFor;tipFor=null;tipAt(el);tipShow(el,e.clientX,e.clientY);}else tipMove(e.clientX,e.clientY);}},{passive:true});
document.addEventListener('mousedown',()=>tipHide(),true);
/* matchup chips (one language, idea 3): BEATS / WEAK TO with unit pictures. Reads matchUp() in 01-data - the one helper. o.mini = the two small rows on a command button. */
function match(fac,kind,foe,o){o=o||{};let m;try{m=matchUp(fac,kind,foe);}catch(e){return null;}if(!m.beats.length&&!m.weak.length)return null;if(o.mini&&!m.armed)return null;   /* unarmed: the hover card says what hunts it; the button keeps its full name */
  const w=E('div','uk-mu'+(o.mini?' mini':'')),n=o.n||(o.mini?1:4);w.dataset.k=kind;
  const row=(cls,lab,L)=>{if(!L.length)return;const r=E('div','mr '+cls),ms=o.mini?r:E('div','mul');if(!o.mini){r.appendChild(E('b','',lab));r.appendChild(ms);}for(const x of L.slice(0,n)){const s=E('span','mi');s.appendChild(icon(x.k,cls==='g'?'#9be8a6':'#f3a096',x.b));if(!o.mini)s.appendChild(E('i','',x.n));ms.appendChild(s);}w.appendChild(r);};
  row('g','BEATS',m.beats);row('r','WEAK TO',m.weak);return w;}
return {E,drawUnit,drawBld,iconBranch,icon,tabs,chip,sec,card,seg,link,tipHide,match};
})();
/* ===== ingameui slice 3: pause menu = one centred panel with a vertical text menu; Settings in tabs; Esc = one step back ===== */
(function(){const $$=id=>document.getElementById(id);
  const st=document.createElement('style');st.textContent=`
#pauseOv.ukP{display:flex;align-items:center;justify-content:center}#pauseOv[hidden]{display:none!important}
#pauseOv.ukP .card{width:min(380px,92vw);padding:26px 30px 22px;background:linear-gradient(180deg,rgba(24,31,27,.97),rgba(14,19,17,.97));border:1px solid #3d4d44;border-top:2px solid var(--accent,#e3b341);box-shadow:0 18px 50px rgba(0,0,0,.6);text-align:left;animation:ukIn .2s ease-out}
#pauseOv.ukP h1{font:600 34px/1 var(--display,sans-serif);letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px;color:#f2ead2}
#pauseOv.ukP #pauseSub{font:13px/1.45 var(--mono,monospace);color:var(--dim,#8a9a92);margin:0 0 16px}
#pauseOv.ukP .ukMenu{display:flex;flex-direction:column;border-top:1px solid #2c3833}
#pauseOv.ukP .ukMenu button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;width:100%;padding:11px 4px;border-bottom:1px solid #2c3833;font:600 19px/1 var(--display,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#cfd8d2;cursor:pointer;transition:color .12s,padding .12s,background .12s}
#pauseOv.ukP .ukMenu button::after{content:'›';opacity:0;color:var(--accent,#e3b341);transition:opacity .12s}
#pauseOv.ukP .ukMenu button:hover,#pauseOv.ukP .ukMenu button:focus-visible{color:var(--accent,#e3b341);padding-left:10px;background:rgba(227,179,65,.05)}#pauseOv.ukP .ukMenu button:hover::after{opacity:1}
#pauseOv.ukP .ukMenu button.pri{color:var(--accent,#e3b341)}#pauseOv.ukP .ukMenu button.dng{color:#d99a8e}#pauseOv.ukP .ukMenu button[hidden]{display:none}
#pauseOv.ukP .ukMenu .gap{height:10px;border-bottom:1px solid #2c3833}
#pauseOv.ukP .ukKeys{margin-top:12px;font:12px var(--mono,monospace);color:var(--dim,#8a9a92)}
#settings .uk-tabs{margin:2px 0 12px}#settings .uk-tab{font-size:16px}
#settings .uk-pane .label:first-child{margin-top:0}
#settings .uk-pane .sethd{display:none}`;document.head.appendChild(st);
  function pauseInstall(){const ov=$$('pauseOv');if(!ov||ov.classList.contains('ukP'))return;const card=ov.querySelector('.card'),row=card&&card.querySelector('.row');if(!row)return;ov.classList.add('ukP');
    const m=document.createElement('nav');m.className='ukMenu';m.setAttribute('role','menu');const add=(b,cls)=>{if(!b)return;b.className=cls||'';b.setAttribute('role','menuitem');m.append(b);};
    const mk=(id,t,fn,tip)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=t;b.onclick=fn;if(tip)b.dataset.tt=tip;return b;};
    add($$('resumeBtn'),'pri');
    add(mk('pSettings','Settings',()=>{try{openSettings();}catch(e){}},'Graphics, sound, mouse and gameplay options'));
    add($$('svSave'));
    add(mk('pLoad','Load game',()=>{try{svLoadDialog();}catch(e){}},'Load a saved battle'));
    add(mk('pEnc','Encyclopedia',()=>{try{encOpen();}catch(e){}},'Every unit, building and nation, with counters'));
    const g=document.createElement('div');g.className='gap';m.append(g);
    add($$('pRestart'));const q=$$('pQuit');if(q){q.textContent='Quit to menu';add(q,'dng');}
    row.replaceWith(m);const k=document.createElement('div');k.className='ukKeys';k.textContent='Esc or P — resume';card.append(k);}
  /* Settings: one tab per job (Gameplay · Controls · Graphics · Audio); rows keep their ids and handlers, only move into panes */
  const SET_TAB=[['aud',/^(sMus|sTrk|myF|myN|myNx|sFx|sVo)/,/music|soundtrack|volume|voice|radio chatter|sound/i],['gfx',/^(sGfx|sFps|sHp)/,/graphic|quality|frame-rate|shadow|resolution|painterly|bloom|\bfps\b|health bar/i],['ctl',/^(sScr|sZm|sInv|sDbl|sTol|sMmc|sMpan|sEdge|sM[A-Z])/,/mouse|scroll|zoom|click|cursor|hotkey|keyboard|camera|drag/i]];
  function setTabs(){const body=$$('setBody');if(!body)return;let P=body._ukP;
    if(!P){const h1=body.querySelector('h1');const host=document.createElement('div');P=body._ukP=UK.tabs(host,[['game','Gameplay'],['ctl','Controls'],['gfx','Graphics'],['aud','Audio']],(UK._setTab||'gfx'),k=>{UK._setTab=k;});
      const kids=[...host.childNodes];if(h1)h1.after(...kids);else body.prepend(...kids);body._ukBar=kids[0];}
    const panes=new Set(Object.values(P));let cur=null;
    for(const el of [...body.children]){if(el===body._ukBar||panes.has(el)||el.tagName==='H1')continue;
      if(el.classList.contains('sethd')){el.remove();continue;}
      if(el.classList.contains('label')||el.id==='relayBox'||!cur){const nid=el.nextElementSibling?el.nextElementSibling.id||'':'',tx=el.textContent||'';const r=SET_TAB.find(t=>t[1].test(el.id)||t[1].test(nid))||SET_TAB.find(t=>t[2].test(tx));cur=P[r?r[0]:'game'];if(el.id==='relayBox')cur=P.game;}
      cur.append(el);}
    for(const k in P){const b=body._ukBar.querySelector('[data-pt="'+k+'"]');if(b)b.hidden=!P[k].children.length;}}
  try{pauseInstall();}catch(e){console.warn('ukPause',e);}
  try{const o=openSettings;openSettings=function(){o.apply(this,arguments);try{setTabs();}catch(e){console.warn('ukSet',e);}};const b1=$$('openSettings'),b2=$$('aSet');if(b1)b1.onclick=openSettings;if(b2)b2.onclick=openSettings;}catch(e){}
  /* Esc steps back one window: Settings → (pause menu / main menu) */
  addEventListener('keydown',e=>{if(e.key!=='Escape')return;const s=$$('settings');if(s&&!s.hidden){e.preventDefault();e.stopImmediatePropagation();s.hidden=true;}},true);
})();
