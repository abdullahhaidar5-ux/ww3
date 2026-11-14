/* ---------- ONE HUD (integrate1, SYSTEMS.md "HUD"): a single top bar (money, income, supply, world opinion, alerts) + ONE alerts feed + an
   overlay switcher for the map / minimap layers. View-only: no sim state, nothing here is saved or synced. Every alert comes from pushLog()
   (the one log entry point), every overlay flag is read by the draw code it switches (OVL.*), so no second panel is ever needed. ---------- */
const OVL={sonar:true,mines:true};   // 'supply' mirrors the logistics overlay (LGU.on, key L)
const HUD_OV=[['supply','Supply lines','Supply lines on the ground: green yours (units on them refill ammo), red the enemy\'s, gray nobody\'s, dashed = cut off (also key L)'],['sonar','Sonar','Submarine contacts on the map and minimap'],['mines','Mines','Mine markers on the map and minimap']];
const HUDS={al:[],unread:0,open:false,el:null,g:null,t:0,sig:''};
function hudAlert(m,k){if(!G||!m||(k!=='bad'&&k!=='w'))return;if(HUDS.g!==G){HUDS.g=G;HUDS.al.length=0;HUDS.unread=0;}
  const last=HUDS.al[0];if(last&&last.m===m&&G.t-last.t<2)return;HUDS.al.unshift({m,k,t:G.t});if(HUDS.al.length>30)HUDS.al.length=30;if(!HUDS.open)HUDS.unread=Math.min(99,HUDS.unread+1);HUDS.t=0;}
function hudBuild(){let b=document.getElementById('hudBar');if(b)return b;b=document.createElement('div');b.id='hudBar';
  b.style.cssText='position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:56;display:flex;gap:6px;align-items:center;padding:4px 8px;background:rgba(8,12,10,.78);border:1px solid rgba(255,255,255,.14);border-radius:8px;font:600 14px/1.2 system-ui,sans-serif;color:#f4e9c2;text-shadow:0 1px 2px #000;white-space:nowrap;max-width:calc(100vw - 150px)';
  const st=document.createElement('style');st.textContent='#hudBar .hs{padding:2px 8px;border-radius:5px;background:rgba(255,255,255,.07)}#hudBar button{font:600 13px system-ui,sans-serif;color:#cfd8c8;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:5px;padding:2px 8px;cursor:pointer}#hudBar button.on{background:rgba(111,178,255,.28);color:#fff;border-color:#6fb2ff}#hudBar #hudAl.hot{background:rgba(234,90,64,.35);border-color:#ea5a40;color:#fff}#hudFeed{position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:57;width:min(520px,calc(100vw - 160px));background:rgba(8,12,10,.92);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:6px 10px;font:500 14px/1.35 system-ui,sans-serif;color:#eee;max-height:260px;overflow:auto}#hudFeed div{padding:2px 0;border-bottom:1px solid rgba(255,255,255,.07)}#hudFeed .bad{color:#ff9a8a}#hudFeed .w{color:#f0d27a}';document.head.appendChild(st);
  b.innerHTML='<span class="hs" id="hudM"></span><span class="hs" id="hudS"></span><button id="hudAl" title="Alerts: missile strikes, cut supply lines, sonar contacts and other warnings. Click to read the last ones.">&#9888; 0</button> <button id="hudHelp" title="Show or hide the controls help line (Settings can keep it on)">?</button><span id="hudLy" style="position:relative"><button id="hudLyB" title="Map layers (key L toggles supply roads)">Layers &#9662;</button><span id="hudOv" style="display:none;position:absolute;top:30px;right:0;flex-direction:column;gap:4px;padding:6px;background:rgba(8,12,10,.95);border:1px solid rgba(255,255,255,.2);border-radius:8px;z-index:58"></span></span>';
  document.body.appendChild(b);const ov=b.querySelector('#hudOv');
  for(const [k,n,t] of HUD_OV){const x=document.createElement('button');x.dataset.o=k;x.textContent=n;x.style.textAlign='left';x.title='Show or hide: '+t;x.onclick=()=>hudToggle(k);ov.appendChild(x);}
  const lb=b.querySelector('#hudLyB');lb.onclick=e=>{e.stopPropagation();ov.style.display=ov.style.display==='flex'?'none':'flex';};document.addEventListener('mousedown',e=>{if(ov.style.display==='flex'&&!e.target.closest('#hudLy'))ov.style.display='none';});
  b.querySelector('#hudHelp').onclick=()=>{HUDS.help=!HUDS.help;hudDeclutter();};
  b.querySelector('#hudAl').onclick=()=>{HUDS.open=!HUDS.open;if(HUDS.open)HUDS.unread=0;HUDS.sig='';hudTick(true);};return b;}
function hudToggle(k){if(k==='supply'){if(typeof lgToggle==='function')lgToggle();}else OVL[k]=!OVL[k];HUDS.sig='';hudTick(true);}
function hudOn(k){return k==='supply'?!!(typeof LGU!=='undefined'&&LGU.on):OVL[k]!==false;}
function hudTick(force){try{hudDeclutter();}catch(e){}if(!G||!G.teams||!G.teams[ME]||G.over){const o=document.getElementById('hudBar');if(o)o.hidden=true;const f=document.getElementById('hudFeed');if(f)f.remove();return;}
  const n=performance.now();if(!force&&n-HUDS.t<250)return;HUDS.t=n;if(HUDS.g!==G){HUDS.g=G;HUDS.al.length=0;HUDS.unread=0;HUDS.open=false;}
  const b=hudBuild();b.hidden=false;const T=G.teams[ME];
  let cut=0;for(const e of G.ents)if(e.isB&&!e.dead&&e.team===ME&&e.kind==='depot'&&e.built>=1&&lgDepCut(e))cut++;
  const sb=!!G.sandbox;const sig=[sb?1:0,Math.floor(T.credits),cut,HUDS.unread,HUDS.open?1:0,HUDS.al.length,HD_KEYS.map(hudOn).join('')].join('|');if(sig===HUDS.sig)return;HUDS.sig=sig;
  b.querySelector('#hudM').textContent='$'+Math.floor(T.credits).toLocaleString('en-US');b.querySelector('#hudM').title='Money: supply trucks, oil derricks and the buildings you capture pay it.';
  const s=b.querySelector('#hudS');s.textContent=cut?'Supply: '+cut+' depot'+(cut>1?'s':'')+' cut off':'Supply lines OK';s.style.color=cut?'#ff9a8a':'#9be39b';s.title='Supply Depots of yours that no road links to your Command Center (they reach half as far). Build a road to them or clear the crater.';s.hidden=sb;   /* Test range: unlimited ammo, no supply chip */
  const a=b.querySelector('#hudAl');a.textContent='\u26A0 '+(HUDS.unread||HUDS.al.length);a.className=HUDS.unread?'hot':'';
  for(const x of b.querySelectorAll('#hudOv button')){x.className=hudOn(x.dataset.o)?'on':'';if(x.dataset.o==='supply')x.hidden=sb;}
  let f=document.getElementById('hudFeed');if(!HUDS.open){if(f)f.remove();}else{if(!f){f=document.createElement('div');f.id='hudFeed';document.body.appendChild(f);}
    f.innerHTML='';if(!HUDS.al.length){const d=document.createElement('div');d.textContent='No alerts yet.';f.appendChild(d);}
    for(const q of HUDS.al.slice(0,12)){const d=document.createElement('div');d.className=q.k;const m=Math.max(0,Math.floor(G.t-q.t));d.textContent=(m<60?m+'s':Math.floor(m/60)+'m')+' ago · '+q.m;f.appendChild(d);}}}
const HD_KEYS=HUD_OV.map(q=>q[0]);
/* ---------- Edge alerts (idea 15): when something the alerts report happens OFF screen, a small arrow sits on the screen edge
   pointing at it for ~6 s; a click moves the camera there. ONE event source: pushLog(m,k,x,y) (every positioned log line: base under
   attack, troops under fire, unit lost, unit / building finished) and the team ping (FXH.mping) - any other display (the commander's
   radio) can read the same EDGE.last. View only: nothing here touches the simulation. Max 3, newest wins; Settings switch SET.edgeAl (default on), never over the command bar
   or the minimap (arrows stay inside the battlefield canvas, clear of the top bar and the bottom panels). ---------- */
const EDGE={a:[],el:null,g:null,last:null,LIFE:6000,MAX:3};
/* the arrow carries the SAME icon as the radio line of that report (radKind, 09b-radio.js): one sign language for both displays */
const EDGE_K={atk:['⚠','#ff6a55','Under attack'],eye:['◉','#ffd27a','Enemy spotted'],lost:['✖','#ffb0a0','Unit lost'],done:['✔','#8fe38f','Ready'],plus:['✚','#8fc7ff','Reinforcements'],msg:['›','#d5ddd6','Report'],ping:['◆','#7fbcff','Ally ping']};
const EDGE_PR={atk:3,lost:2,eye:1};
function edgeKind(m,k){if(k==='ping')return 'ping';if(k==='r:lost')return 'lost';if(k==='r:base')return 'atk';let r='msg';try{r=radKind(m||'')[1];}catch(e){}return EDGE_K[r]?r:'msg';}
function edgeAlert(m,k,x,y){if(!G||SET.edgeAl===0||!(x>=0)||!(y>=0))return;if(EDGE.g!==G){EDGE.g=G;EDGE.a.length=0;}const kind=edgeKind(m,k),now=performance.now();
  EDGE.last={m,kind,x,y,t:now};                                                   // the one feed entry (radio / "jump to last alert" read this)
  const o=EDGE.a.find(q=>(q.kind==='ping')===(kind==='ping')&&Math.hypot(q.x-x,q.y-y)<320);   // same place: ONE arrow, the more urgent report wins (attack > loss > sighting > the rest)
  if(o){o.t=now;if((EDGE_PR[kind]||0)>=(EDGE_PR[o.kind]||0)){o.x=x;o.y=y;o.m=m;if(o.kind!==kind){o.kind=kind;if(o.b){o.b.remove();o.b=null;}}}return;}
  EDGE.a.unshift({m,kind,x,y,t:now,b:null});while(EDGE.a.length>EDGE.MAX){const d=EDGE.a.pop();if(d.b)d.b.remove();}}
function edgeGo(q){try{centerOn(q.x,q.y);}catch(e){}q.t=-1e15;}
function edgeTick(){const A=EDGE.a;if(!A.length&&!EDGE.el)return;const now=performance.now();
  const off=!G||G.over||SET.edgeAl===0||EDGE.g!==G||(window.PHX&&PHX.on)||(typeof KC!=='undefined'&&KC.on)||document.body.classList.contains('inMenu');
  for(let i=A.length-1;i>=0;i--)if(off||now-A[i].t>EDGE.LIFE){if(A[i].b)A[i].b.remove();A.splice(i,1);}
  if(!A.length){if(EDGE.el)EDGE.el.style.display='none';return;}
  let el=EDGE.el;if(!el){const st=document.createElement('style');st.textContent='#edgeAl{position:fixed;z-index:7;pointer-events:none;overflow:hidden}#edgeAl button{position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;padding:0;border-radius:50%;border:2px solid var(--c);background:rgba(8,12,10,.82);color:var(--c);font:700 17px/30px system-ui,sans-serif;text-align:center;cursor:pointer;pointer-events:auto;box-shadow:0 1px 6px rgba(0,0,0,.6)}#edgeAl button.vhov,#edgeAl button:hover{background:rgba(40,50,44,.95)}#edgeAl button i{position:absolute;left:50%;top:50%;width:0;height:0;margin:-7px 0 0 -7px;border:7px solid transparent;border-left:11px solid var(--c);border-right:0;transform:rotate(var(--r)) translateX(22px);transform-origin:7px 7px;pointer-events:none}body.inMenu #edgeAl,body.phOn #edgeAl{display:none!important}';document.head.appendChild(st);
    el=EDGE.el=document.createElement('div');el.id='edgeAl';document.body.appendChild(el);}
  const r=cv.getBoundingClientRect();el.style.display='block';el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';
  const L=44,T=96,R=r.width-44,B=r.height-128,cx=(L+R)/2,cy=(T+B)/2,hw=(R-L)/2,hh=(B-T)/2;
  const lg=document.getElementById('log'),lr=lg&&lg.children.length?lg.getBoundingClientRect():null,put=[];   // keep clear of the radio feed and of each other
  for(const q of A){const p=toScreen(q.x,groundH(q.x,q.y),q.y);let vx=p.x-cx,vy=p.y-cy;if(p.z>1){vx=-vx;vy=-vy;}
    const on=p.z<=1&&p.x>=0&&p.x<=r.width&&p.y>=0&&p.y<=r.height;
    if(!q.b){const K=EDGE_K[q.kind],b=q.b=document.createElement('button');b.type='button';b.dataset.k=q.kind;b.style.setProperty('--c',K[1]);b.textContent=K[0];b.appendChild(document.createElement('i'));b.onclick=e=>{e.stopPropagation();edgeGo(q);};el.appendChild(b);}
    if(on){q.b.style.display='none';continue;}
    const k=1/Math.max(Math.abs(vx)/hw,Math.abs(vy)/hh,1e-6);let x=cx+vx*k,y=cy+vy*k;
    if(lr&&x<lr.right-r.left+26&&y<lr.bottom-r.top+26){x=L;y=lr.bottom-r.top+26;}
    for(let n=0;n<3;n++){const h=put.find(o=>Math.abs(o[0]-x)<40&&Math.abs(o[1]-y)<40);if(!h)break;if(x<=L+1||x>=R-1)y=h[1]+(h[1]>cy?-40:40);else x=h[0]+(h[0]>cx?-40:40);}
    put.push([x,y]);const fade=Math.min(1,(EDGE.LIFE-(now-q.t))/600);
    q.b.style.display='';q.b.title=EDGE_K[q.kind][2]+': '+q.m+' - click to look';q.b.style.opacity=fade.toFixed(2);q.b.style.transform='translate('+x.toFixed(0)+'px,'+y.toFixed(0)+'px)';q.b.style.setProperty('--r',Math.atan2(vy,vx).toFixed(2)+'rad');}}
/* ---------- What's new (one screen, newest first) ---------- */
const WHATS_NEW=[
 ['One game: Battle, now with supply lines','The game is now one game: Battle (Command Center, supply trucks, tech tree, destroy every enemy building). Conquest and the Grand campaign are gone. Battle has SUPPLY LINES: the roads running out of your Command Center and Supply Depots are green on the minimap (L shows them on the ground). Units refill ammo near your buildings and on those roads; far beyond them they fight until empty, then must come back or get a supply truck. Craters, blown bridges and enemy checkpoints cut a line (dashed) - your Construction Vehicle repairs a crater fast. Every old battlefield is now a Battle map, and the main menu is Play · Multiplayer · Test range.'],
 ['The main menu shows your war','The main menu background now shows whatever Continue would take you back to: that battlefield with your front line drawn in.'],
 ['Every button says what it beats','Unit buttons now carry two small pictures: green = what this unit BEATS best, red = what it is most WEAK TO. Hold the mouse on a button for the full list with names. Point at an enemy unit (or select it) and the buttons that beat it light up green with "BEATS IT". The game works these out from the real damage, armor, range and price numbers against the nation you are fighting, so they are always true - the Encyclopedia and the Unit guide show the same.'],
 ['Commander\'s radio','Every report from the field - base under attack, enemy spotted, unit lost, building finished, a unit ready - is now one short line with a small icon at the top left of the battle (three lines at most, each fades after a few seconds). Lines marked with a small arrow know where it happened: click the line, or press Space, and the camera goes there. Settings has a switch for it.'],
 ['Edge alerts','When something happens away from where you are looking - your base or troops come under attack, a unit is lost, a unit or building is finished, a teammate pings the map - a small round marker with an arrow now sits on the edge of the screen pointing at it for about six seconds (three at most). Click it and the camera goes there. Settings has a switch for it.'],
 ['Cleaner sound','The sound is mixed properly now: even the biggest fight no longer crackles or distorts, unit voices stay clear over the guns (explosions and music step back a little while a soldier speaks), every button and menu item gives a soft click, and each battlefield has a quiet background of its own - dry desert wind, wind in the trees, or a thin winter howl - with the muffled thump of fighting elsewhere on the map.'],
 ['Morale styles','Every nation now fights with one of four styles: Zealous (slow to break, banners rally the faithful, heavier losses), Professional (steady under artillery, rally fast near officers), Home defenders (much braver on home turf) and Firepower-reliant (break sooner, but stronger fire support). The style shows on the nation pick screen and in the Encyclopedia.']];
function whatsNewPage(){const o=idOv('idNew',"What's new"),b=o.querySelector('.idbody');b.innerHTML='';for(const [h,t] of WHATS_NEW){const d=document.createElement('div');d.style.cssText='margin:10px 0;text-align:left';const a=document.createElement('div');a.style.cssText='font:700 17px system-ui,sans-serif;color:#f4e9c2';a.textContent=h;const p=document.createElement('div');p.style.cssText='font:500 15px/1.4 system-ui,sans-serif;color:#dfe5da';p.textContent=t;d.append(a,p);b.appendChild(d);}o.hidden=false;}
(function(){const op=document.getElementById('openSettings');if(op&&op.parentNode){const b=document.createElement('button');b.className='big ghost';b.style.cssText='font-size:15px;padding:7px 16px';b.textContent="What's new";b.onclick=whatsNewPage;op.parentNode.appendChild(b);}
})();
/* Battle HUD never shows over the menus (Abdullah 2026-11-06 19:52 photo: "Why do these buttons remain" — the top bar, alerts feed,
   Supply lines button and the battle banner stayed on screen after leaving a battle). One rule: while the main menu is open,
   body gets .inMenu and every battle-only overlay is hidden; nothing else changes. */
function hudMenuWatch(){const m=document.getElementById('menu');if(!m||hudMenuWatch.on)return;hudMenuWatch.on=1;
  const st=document.createElement('style');st.textContent='body.inMenu #log,body.inMenu #hudBar,body.inMenu #hudFeed,body.inMenu #lgBtn,body.inMenu #cqBn,body.inMenu #townp{display:none!important}';document.head.appendChild(st);
  const sync=()=>document.body.classList.toggle('inMenu',!m.hidden);sync();new MutationObserver(sync).observe(m,{attributes:true,attributeFilter:['hidden']});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hudMenuWatch);else hudMenuWatch();}

/* ---------- in-game confirm / text prompt (replaces browser confirm()/prompt(): no native dialogs in battles) ---------- */
function uiDialog(msg,opt,cb){const old=document.getElementById('uiDlg');if(old)old.remove();const d=document.createElement('div');d.id='uiDlg';
  d.style.cssText='position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);font:600 17px/1.4 system-ui,sans-serif;color:#f4e9c2';
  const bx=document.createElement('div');bx.style.cssText='background:rgba(14,18,12,.97);border:1px solid #6d7d57;border-radius:10px;padding:16px 20px;max-width:min(420px,90vw);text-align:center';
  const p=document.createElement('div');p.textContent=msg;bx.appendChild(p);let inp=null;
  if(opt.input){inp=document.createElement('input');inp.value=opt.def||'';inp.maxLength=24;inp.style.cssText='margin:10px 0 0;width:100%;box-sizing:border-box;font:600 16px system-ui;padding:6px 8px;border-radius:6px;border:1px solid #6d7d57;background:#0b0f09;color:#fff';bx.appendChild(inp);}
  const r=document.createElement('div');r.style.cssText='display:flex;gap:10px;justify-content:center;margin-top:14px';
  const mk=(t,bg,f)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.style.cssText='font:600 16px system-ui;padding:8px 18px;border-radius:7px;border:1px solid #8a8a7a;color:#fff;cursor:pointer;background:'+bg;b.onclick=()=>{d.remove();f();};r.appendChild(b);return b;};
  mk(opt.no||'Cancel','#333b30',()=>{});mk(opt.yes||'OK',opt.danger?'#7a3a2c':'#3d5a36',()=>cb(inp?inp.value:true));
  bx.appendChild(r);d.appendChild(bx);document.body.appendChild(d);if(inp){inp.focus();inp.select();inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){d.remove();cb(inp.value);}else if(e.key==='Escape')d.remove();};}
  return d;}
function uiConfirm(msg,yes,cb,danger){return uiDialog(msg,{yes,danger},cb);}

/* ---------- declutter (Abdullah 2026-11-06 "Terrible clutter"): one place that decides what is shown ----------
   Controls help line hidden unless asked (? button, Settings, or the first 45 s of a player's first battle). */
HUDS.help=false;
function hudDeclutterCss(){if(document.getElementById('hudDcCss'))return;const st=document.createElement('style');st.id='hudDcCss';
  st.textContent='#hint{display:none!important}body.helpOn #hint{display:block!important}#lgBtn{display:none!important}'
  +'#docPick{top:auto!important;left:auto!important;transform:none!important;right:10px!important;bottom:262px!important;opacity:.88;padding:4px 6px!important;max-width:380px!important}#docPick button{min-height:26px!important;font-size:12px!important;padding:2px 6px!important}#docPick>div:first-child{font-size:11px!important;margin-bottom:3px!important}#townp{max-height:calc(100vh - 560px)!important;min-height:120px}'
  +'#sqMake{display:none!important}#info .cmdrow.off{display:none!important}body.gbat #docPick,body.gbat #credits,body.gbat .sup{display:none!important}'
  +'body.gbat #autoP,body.gbat .tabs,body.gbat #lgBtn{display:none!important}body.gbat #panel>*:not(#gbRoster){display:none!important}'
  +'#gbRoster{display:flex!important;flex-wrap:wrap;gap:6px;align-content:flex-start;padding:8px 6px;grid-column:1/-1}#gbRoster button{font:600 15px system-ui,sans-serif;color:#f0f5e6;background:#2c3a26;border:1px solid #6b7a63;border-radius:6px;padding:6px 12px;cursor:pointer;min-height:38px}#gbRoster button:hover{background:#3d5236}#gbRoster .gbh{width:100%;font:600 13px system-ui;opacity:.7;text-transform:uppercase;letter-spacing:.06em}';
  document.head.appendChild(st);}
function hudDeclutter(){hudDeclutterCss();const on=!!(G&&!G.over&&G.teams&&G.teams[ME]);let seen=1;try{seen=!!localStorage.getItem('ww3_helpSeen');}catch(e){}
  let help=on&&(HUDS.help||SET.helpLine);
  if(on&&!seen&&G.t<45)help=true;else if(on&&!seen&&G.t>=45){try{localStorage.setItem('ww3_helpSeen','1');}catch(e){}}
  document.body.classList.toggle('helpOn',!!help);
  const sb=document.getElementById('setBody');if(sb&&!document.getElementById('sHelpLine')){const r=document.createElement('label');r.style.cssText='display:flex;gap:8px;align-items:center;margin:10px 0;font-size:15px;cursor:pointer';r.innerHTML='<input type="checkbox" id="sHelpLine"> Always show the controls help line at the bottom of the battle';const c=r.querySelector('input');c.checked=!!SET.helpLine;c.onchange=()=>{SET.helpLine=c.checked?1:0;saveSet();};sb.append(r);}
  /* one switch each for the commander's radio feed and the edge alerts (both default on; view only) */
  if(sb&&!document.getElementById('sRadio'))for(const [id,key,txt] of [['sRadio','radio','Commander\'s radio: short battle reports at the top left of the battle'],['sEdgeAl','edgeAl','Edge alerts: an arrow on the screen edge points to things happening off screen']]){const r=document.createElement('label');r.style.cssText='display:flex;gap:8px;align-items:center;margin:10px 0;font-size:15px;cursor:pointer';r.innerHTML='<input type="checkbox" id="'+id+'"> '+txt;const c=r.querySelector('input');c.checked=SET[key]!==0;c.onchange=()=>{SET[key]=c.checked?1:0;saveSet();if(!c.checked&&key==='radio'){const l=document.getElementById('log');if(l)l.textContent='';}};sb.append(r);}}
/* ---------- bottom dock (declutter2, Abdullah 2026-11-06 20:30 "shouldn't be side by side, too cluttered"): the bottom of the battle screen reads as
   one tidy panel. Command + Auto-build are ONE strip (08g/08h); the Supply lines button is gone (the top bar's Supply switch and key L do it);
   the controls hint is one quiet line that never runs under the order buttons; empty battle-group slots shrink to their number. View-only CSS. */
(function(){if(typeof document==='undefined')return;const st=document.createElement('style');st.textContent=
 'body #lgBtn{display:none!important}'+
 '#app #hint{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;right:520px;opacity:.7}'+
 '#sqs button.empty{opacity:.55}#sqs button.empty small{display:none}#sqs button.empty{min-width:0;padding-left:7px;padding-right:7px}';
 document.head.append(st);})();
