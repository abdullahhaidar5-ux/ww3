/* ---------- 08b-social: the Tutorial (guided first battle) and "My battles" (local match history + stats) ----------
   Single-player tutorial only: it starts its own passive-enemy battle and never touches online play.
   History is saved in this browser only (localStorage 'ww3_battles', newest last, max 200). */
const BH_KEY='ww3_battles',TUT_KEY='ww3_tutdone';
function bhLoad(){try{const a=JSON.parse(localStorage.getItem(BH_KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function bhSave(a){try{localStorage.setItem(BH_KEY,JSON.stringify(a.slice(-200)));}catch(e){}}
/* units this player trained: a once-a-second scan of our own new units (starting units are not counted) */
function bhScan(){if(!G||G.over||G.sandbox||G.tut||!G.teams||!G.teams[ME])return;
  if(!G.bhSeen){G.bhSeen=new Set();G.bhUc={};G.bhInit=false;}
  const first=!G.bhInit&&G.t<3;if(G.t>=3)G.bhInit=true;
  for(const e of G.ents){if(e.isB||e.team!==ME||G.bhSeen.has(e.id))continue;G.bhSeen.add(e.id);if(!first&&!e.dead)G.bhUc[e.kind]=(G.bhUc[e.kind]||0)+1;}}
function bhRecord(winner){if(!G||G.bhDone||G.sandbox||G.tut||G.rp||NET.spec||G.t<20)return;   // (replays and spectated battles are not your battles)
G.bhDone=true;
  const T=G.teams.filter(Q=>!Q.reb),me=T[ME];if(!me)return;const won=winner>=0&&ally(winner,ME);
  const opp=T.filter(Q=>Q.id!==ME&&!ally(Q.id,ME)).map(Q=>(Q.F&&Q.F.name)||Q.fac);
  const mp=MAPS&&MAPS[G.mapKey];
  const a=bhLoad();a.push({t:Date.now(),nat:me.fac,res:won?'W':'L',len:Math.round(G.t),built:me.built|0,lost:me.lost|0,kills:me.kills|0,
    map:(mp&&mp.name)||G.mapKey||'?',mode:MODE,opp:opp.slice(0,7),uc:G.bhUc||{}});bhSave(a);}
{const _se=showEnd;showEnd=function(winner,reason){try{bhScan();bhRecord(winner);}catch(e){console.warn('history',e);}
  try{if(G&&G.tut&&winner>=0&&ally(winner,ME)){tutDone();}}catch(e){}return _se.apply(this,arguments);};}
setInterval(()=>{try{bhScan();}catch(e){}},1000);

function bhStats(a){const o={n:a.length,w:0,secs:0,nat:{},uc:{},best:0};
  for(const b of a){if(b.res==='W'){o.w++;if(!o.best||b.len<o.best)o.best=b.len;}o.secs+=b.len||0;o.nat[b.nat]=(o.nat[b.nat]||0)+1;for(const k in b.uc||{})o.uc[k]=(o.uc[k]||0)+b.uc[k];}
  o.fav=Object.keys(o.nat).sort((x,y)=>o.nat[y]-o.nat[x])[0]||null;
  o.top=Object.keys(o.uc).sort((x,y)=>o.uc[y]-o.uc[x]).slice(0,5);return o;}
function bhFmt(s){s=Math.max(0,s|0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function bhEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function bhUnitName(fac,k){try{const s=stats(fac,k);if(s&&s.name)return s.name;}catch(e){}return k;}
function bhOpen(){let ov=document.getElementById('myb');
  if(!ov){ov=document.createElement('div');ov.id='myb';ov.className='overlay';ov.hidden=true;document.body.append(ov);
    const st=document.createElement('style');st.textContent=`#myb{z-index:60}#myb .card{max-width:560px;max-height:88vh;overflow:auto}#myb table{width:100%;border-collapse:collapse;font-size:14px}#myb td,#myb th{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left}#myb .win{color:#6fd36f}#myb .loss{color:#e26a5a}#myb .stat{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}#myb .stat div{flex:1 1 110px;background:var(--panel2);padding:8px;border:1px solid var(--line)}#myb .stat b{display:block;font-size:20px}#myb .none{opacity:.7;padding:12px 0}`;document.head.append(st);}
  const a=bhLoad(),s=bhStats(a),nm=k=>(FACTIONS[k]&&FACTIONS[k].name)||k||'-';
  const rows=a.slice(-20).reverse().map(b=>`<tr><td>${bhEsc(new Date(b.t).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</td><td>${bhEsc(nm(b.nat))}</td><td class="${b.res==='W'?'win':'loss'}">${b.res==='W'?'Victory':'Defeat'}</td><td>${bhFmt(b.len)}</td><td>${bhEsc(b.map)}</td><td>vs ${bhEsc((b.opp||[]).join(', ')||'-')}</td><td>${b.built}/${b.lost}</td></tr>`).join('');
  ov.innerHTML=`<div class="card"><h1>My battles</h1><p style="opacity:.75;margin:0">Saved on this device only. Skirmish, online and finished battles count; the Tutorial and Test Range do not.</p>`+(a.length?
   `<div class="stat"><div><b>${s.n}</b>battles</div><div><b>${s.w}</b>wins (${Math.round(100*s.w/s.n)}%)</div><div><b>${bhEsc(nm(s.fav))}</b>favorite nation</div><div><b>${bhFmt(s.best)}</b>fastest win</div><div><b>${Math.round(s.secs/60)} min</b>played</div></div>
   <div class="label">Most-used units</div><div>${s.top.length?s.top.map(k=>bhEsc(bhUnitName(s.fav,k))+' ×'+s.uc[k]).join(' · '):'Train some units in a battle to fill this in.'}</div>
   <div class="label">Last ${Math.min(20,a.length)} battles</div><div style="overflow-x:auto"><table><tr><th>Day</th><th>Nation</th><th>Result</th><th>Time</th><th>Map</th><th>Opponents</th><th title="units built / lost">B/L</th></tr>${rows}</table></div>`
   :`<div class="none">No finished battles yet. Win or lose one and it shows up here.</div>`)+
   `<div class="row" style="margin-top:12px"><button class="big ghost" id="mybClose">Close</button>`+(a.length?`<button class="big ghost" id="mybClear">Clear history</button>`:'')+`</div></div>`;
  ov.hidden=false;$('mybClose').onclick=()=>{ov.hidden=true;};const c=$('mybClear');if(c)c.onclick=()=>{uiConfirm('Delete your saved battle history on this device?','Delete',()=>{bhSave([]);bhOpen();},1);};}

/* ---------- Tutorial ---------- */
/* The ONE tutorial: a guided first Battle (single-player, passive enemy) that also teaches the supply lines. Each step: t = what and why (short), a = the ONE thing to do,
   hl() = what to point the pulsing arrow at ({d:'css selector'} | {el:element} | {w:{x,y}} world spot), cam() = where the camera goes when the step starts,
   ok() = done test. The tests look at the state of the battle (not at "what changed"), so doing things out of order never blocks a step. */
const tutHQ=()=>G.ents.find(e=>e.team===ME&&e.kind==='hq'&&!e.dead);
const tutBld=k=>G.ents.find(e=>e.isB&&e.team===ME&&e.kind===k&&!e.dead);
const tutInf=()=>G.ents.filter(e=>!e.isB&&e.team===ME&&e.kind==='inf'&&!e.dead).length;
const tutFoe=()=>{const s=tutSquad()||tutHQ()||{x:0,y:0};let b=null,bd=1e9;for(const u of G.ents){if(u.isB||u.dead||u.team===ME||u.team===G.reb)continue;const d=Math.hypot(u.x-s.x,u.y-s.y);if(d<bd&&d<1200){bd=d;b=u;}}return b;};   // only enemies near your squad (not the far enemy base)
const tutFoeHQ=()=>G.ents.find(e=>e.team!==ME&&e.team!==G.reb&&e.kind==='hq'&&!e.dead);
function tutSquad(){const u=tutUnits();if(!u.length)return null;let x=0,y=0;for(const q of u){x+=q.x;y+=q.y;}return{x:x/u.length,y:y/u.length};}
function tutSpawn(n,x,y){let c=0;for(let i=0;i<n;i++){const p=nearestPassXY('ground',x+Math.cos(i*2.1)*40,y+Math.sin(i*2.1)*40);if(p&&addUnit(ME,'inf',p[0],p[1]))c++;}return c;}
const tutPanelBtn=id=>document.getElementById(id);
/* BATTLE tutorial (polishE 2026-11-10; supply lines 2026-11-14): the Generals-rules lesson. */
const tutMob=()=>G.ents.filter(e=>!e.isB&&e.team===ME&&!e.dead&&!['harv','dozer','hacker'].includes(e.kind));
const tutBPlace=(k,dx,dy)=>{if(tutBld(k))return{w:tutBld(k)};if(G.place===k){const h=tutHQ();return{w:h?{x:h.x+dx,y:h.y+dy}:null};}return{d:'#b_'+k};};
const TUTB=[
 {k:'gen',t:'Welcome to Battle! Your electronic buildings (air defense, Strike Center, radio, Airfield) need power. You build a Generator for it, and you can capture map power plants for extra. Without enough power they switch off.',a:'Open Build, click Generator, then click the ground near your base.',
  hl:()=>tutBPlace('gen',-100,-110),cam:()=>tutHQ(),ok:()=>!!tutBld('gen')},
 {k:'dep',t:'Your Supply Trucks haul money to the Command Center. A Supply Depot next to a far supply field shortens the trip.',a:'Open Build, click Supply Depot, then click the ground near your base.',
  hl:()=>tutBPlace('depot',-130,90),cam:()=>tutHQ(),ok:()=>!!tutBld('depot')},
 {k:'bar',t:'Barracks train infantry, and they unlock the rest of your tech tree.',a:'Build a Barracks (Build tab) next to your base. Your Dozer builds it.',
  hl:()=>tutBPlace('barracks',120,90),cam:()=>tutHQ(),ok:()=>!!tutBld('barracks')},
 {k:'fac',t:'The War Factory builds tanks and other vehicles. It needs a Barracks first.',a:'Build a War Factory (Build tab) next to your base.',
  hl:()=>tutBPlace('factory',150,-60),cam:()=>tutHQ(),ok:()=>!!tutBld('factory')},
 {k:'sup',t:'SUPPLY LINES: your troops carry limited ammo. They refill near your buildings and along your supply lines - the roads running out from your Command Center and Supply Depots (green). Outside them they fight until they are empty, then come back or need a supply truck. Craters and blown bridges cut a line (dashed).',a:'Press L to show your supply lines.',
  hl:()=>({d:'#lgBtn'}),cam:()=>tutHQ(),ok:()=>!!(typeof LGU!=='undefined'&&LGU.on)},
 {k:'veh',t:'Now put the factory to work. Units appear in the Units tab when a production building is selected.',a:'Click your War Factory, then click a vehicle to train it.',
  hl:()=>{const b=tutBld('factory');if(!b)return{w:tutHQ()};return G.sel.includes(b)?{d:'#u_tank'}:{w:b};},cam:()=>tutBld('factory'),
  enter:()=>{TUTS.k0=tutMob().length;},ok:()=>tutMob().length>TUTS.k0},
 {k:'atk',t:'Your army is ready. Select it (Ctrl+A selects everything), then send it at the enemy with a right-click. Keep an eye on its ammo bar far from your supply lines. Destroy every enemy building to win.',a:'Select your army and right-click an enemy building.',
  enter:()=>{G.teams[ME].credits+=2500;},hl:()=>({w:tutFoeHQ()}),cam:()=>tutFoeHQ(),ok:()=>false}];
let TUT=TUTB;
let TUTS=null;
function tutEl(){let el=document.getElementById('tut');if(el)return el;el=document.createElement('div');el.id='tut';el.hidden=true;
  el.innerHTML=`<div class="tt"><b id="tutN"></b><span id="tutT"></span></div><div class="ta" id="tutA"></div><div class="tb"><button id="tutShow">Show me</button><button id="tutSkip">Skip step</button><button id="tutExit">Exit tutorial</button></div>`;
  document.body.append(el);const st=document.createElement('style');st.textContent=`#tut{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:41;width:min(760px,calc(100% - 20px));background:rgba(10,16,13,.95);border:1px solid #6fd36f;color:var(--fg,#e8efe9);padding:8px 14px;font-size:16px;line-height:1.3;box-shadow:0 4px 18px #0008}#tut[hidden]{display:none}#tut .tt b{color:#6fd36f;margin-right:8px;white-space:nowrap}#tut .ta{margin-top:5px;font-weight:700;color:#ffe27a}#tut .tb{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}#tut button{background:var(--panel2,#1a241f);color:inherit;border:1px solid var(--line,#33433a);padding:3px 10px;font:inherit;font-size:13px;min-height:28px;cursor:pointer}#tut.ok{border-color:#fff}#tut.ok .ta{display:none}
#tutHL{position:fixed;z-index:45;pointer-events:none;border:3px solid #ffe27a;border-radius:50%;box-shadow:0 0 14px 3px #ffe27ab0,inset 0 0 12px #ffe27a80;animation:tutP 1s ease-in-out infinite}#tutHL.box{border-radius:6px}#tutHL i{position:absolute;left:50%;top:-34px;margin-left:-14px;font-style:normal;font-size:30px;line-height:30px;color:#ffe27a;text-shadow:0 0 6px #000;animation:tutB .7s ease-in-out infinite alternate}#tutHL.low i{top:auto;bottom:-34px;transform:rotate(180deg)}#tutHL.edge{border:0;box-shadow:none;animation:none}#tutHL.edge i{top:0;left:0;margin:0;animation:none}
@keyframes tutP{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.65}}@keyframes tutB{from{transform:translateY(0)}to{transform:translateY(8px)}}
#tutReady{position:fixed;inset:0;z-index:3000;background:rgba(4,8,6,.86);display:flex;align-items:center;justify-content:center}#tutReady .c{background:#0e1712;border:1px solid #6fd36f;max-width:560px;width:calc(100% - 28px);padding:22px 26px;color:#e8efe9;font-size:18px;line-height:1.45}#tutReady h2{margin:0 0 10px;color:#6fd36f;font-size:28px}#tutReady ol{margin:8px 0 16px;padding-left:22px}#tutReady li{margin:6px 0}#tutReady .r{display:flex;gap:10px;flex-wrap:wrap}#tutReady button{font:inherit;font-size:18px;padding:10px 18px;min-height:44px;cursor:pointer;background:#1b3a25;color:#fff;border:1px solid #6fd36f}#tutReady button.g{background:#1a241f;border-color:#33433a}`;document.head.append(st);
  $('tutShow').onclick=tutShow;$('tutSkip').onclick=()=>tutAdvance(true);$('tutExit').onclick=tutExit;return el;}
function tutUnits(){return G.ents.filter(u=>!u.isB&&u.team===ME&&!u.dead&&!['harv','dozer','hacker'].includes(u.kind));}
function tutCam(){try{const s=TUT[TUTS.i];const p=s.cam&&s.cam();if(p)centerOn(p.x,p.y-90);}catch(e){}}   // a little north of the target so it sits below the tip box
function tutShow(){if(!G||!G.tut||!TUTS)return;tutCam();try{const s=TUT[TUTS.i],h=s.hl&&s.hl();if(h&&h.w)centerOn(h.w.x,h.w.y-90);}catch(e){}}
function tutRender(){const el=tutEl();if(!TUTS||!G||!G.tut){el.hidden=true;return;}el.hidden=false;const s=TUT[TUTS.i];
  $('tutN').textContent=`Step ${TUTS.i+1}/${TUT.length}`;$('tutT').textContent=typeof s.t==='function'?s.t():s.t;$('tutA').textContent='▶ '+s.a;el.classList.remove('ok');}
function tutEnter(){const s=TUT[TUTS.i];TUTS.e0=performance.now();try{if(s.enter)s.enter();}catch(e){console.warn('tutorial step',e);}tutRender();tutCam();TUTS.ping=0;}
function tutAdvance(skip){if(!TUTS||!G||!G.tut)return;const el=tutEl();
  if(TUTS.i>=TUT.length-1){if(skip)tutExit();return;}
  if(skip){TUTS.i++;tutEnter();return;}
  el.classList.add('ok');$('tutT').textContent='Good!';TUTS.wait=true;setTimeout(()=>{if(!TUTS||!G||!G.tut)return;TUTS.wait=false;TUTS.i++;tutEnter();},900);}
function tutHLHide(){const h=document.getElementById('tutHL');if(h)h.style.display='none';}
function tutExit(){if(G)G.tut=false;TUTS=null;const el=document.getElementById('tut');if(el)el.hidden=true;tutHLHide();}
function tutDone(){try{localStorage.setItem(TUT_KEY,'1');}catch(e){}TUTS=null;tutHLHide();const el=document.getElementById('tut');if(el)el.hidden=true;
  let r=document.getElementById('tutReady');if(r)r.remove();r=document.createElement('div');r.id='tutReady';
  r.innerHTML=`<div class="c"><h2>You're ready!</h2>Three tips for a real match:<ol><li>Supply Trucks pay for everything: build a Supply Depot beside a far supply field and grab oil derricks.</li><li>Push your supply lines forward with Supply Depots along the roads (press <b>L</b>); crater the enemy's roads and hunt its supply trucks.</li><li>Right-click orders, <b>F</b> + click attack-move, <b>X</b> stops. Attack as one big group.</li></ol><div class="r"><button id="tutGo">Start a real match</button><button id="tutMenu" class="g">Main menu</button></div></div>`;
  document.body.append(r);$('tutGo').onclick=()=>{r.remove();$('end').hidden=true;try{G.tut=false;}catch(e){}initAudio();startSingle();};
  $('tutMenu').onclick=()=>{r.remove();const c=$('change');if(c)c.click();};setTimeout(()=>{if(G)G.tut=false;},50);}
function tutHLTick(){let h=document.getElementById('tutHL');if(!TUTS||!G||!G.tut||G.over||TUTS.wait||!$('menu').hidden){if(h)h.style.display='none';return;}
  const s=TUT[TUTS.i];let tg=null;try{tg=s.hl&&s.hl();}catch(e){}
  if(!tg){if(h)h.style.display='none';return;}
  if(!h){h=document.createElement('div');h.id='tutHL';h.innerHTML='<i>▼</i>';document.body.append(h);}
  let el=tg.el||(tg.d?document.querySelector(tg.d):null);
  if(el&&(!el.offsetParent&&getComputedStyle(el).position!=='fixed'))el=null;
  if(!el&&tg.d&&/^#[bup]_/.test(tg.d)){el=document.querySelector('.tabs button[data-tab="'+({b:'build',u:'units',p:'pow'})[tg.d[1]]+'"]');}   // the button is on another tab: point at that tab first
  const set=(x,y,w,hh,cls)=>{h.style.display='block';h.className=cls||'';h.style.left=x+'px';h.style.top=y+'px';h.style.width=w+'px';h.style.height=hh+'px';};
  if(el){const r=el.getBoundingClientRect();if(r.width<2){h.style.display='none';return;}set(r.left-4,r.top-4,r.width+8,r.height+8,'box'+(r.top<90?' low':''));return;}
  if(tg.mm){const r=mm.getBoundingClientRect();if(r.width<2){h.style.display='none';return;}set(r.left+tg.mm.x/MAPW*r.width-17,r.top+tg.mm.y/MAPH*r.height-17,34,34,'low');return;}
  if(tg.w){const p=toScreen(tg.w.x,8,tg.w.y),cr=cv.getBoundingClientRect(),W=innerWidth,H=Math.min(innerHeight,cr.bottom);
    if(p.z<1&&p.x>40&&p.x<W-40&&p.y>110&&p.y<H-40){set(p.x-45,p.y-45,90,90,'');
      if(performance.now()-(TUTS.ping||0)>4000){TUTS.ping=performance.now();(G.tpings=G.tpings||[]).push({x:tg.w.x,y:tg.w.y,k:0,t:performance.now()});}}
    else{const tb=document.getElementById('tut'),top=tb&&!tb.hidden?tb.getBoundingClientRect().bottom+24:120,cx=W/2,hh=Math.max(40,(H-40-top)/2),cy=top+hh;let dx=p.x-cx,dy=p.y-cy;if(p.z>1){dx=-dx;dy=-dy;}const m=Math.max(Math.abs(dx)/(cx-60),Math.abs(dy)/hh)||1,ex=cx+dx/m,ey=cy+dy/m;   /* edge arrow: inside the game view, below the tip box */
      
      set(ex-15,ey-15,30,30,'edge');h.firstChild.style.transform='rotate('+(Math.atan2(dy,dx)*180/Math.PI-90)+'deg)';
      if(performance.now()-(TUTS.ping||0)>4000){TUTS.ping=performance.now();(G.tpings=G.tpings||[]).push({x:tg.w.x,y:tg.w.y,k:0,t:performance.now()});}return;}
    h.firstChild.style.transform='';}
  else h.style.display='none';}
function tutLayout(){const el=document.getElementById('tut');if(!el||el.hidden)return;const b=document.getElementById('cqBn');let top=8;if(b&&b.dataset.h){const r=b.getBoundingClientRect();if(r.height>0)top=Math.max(8,Math.round(r.bottom+6));}el.style.top=top+'px';{const w=el.offsetWidth;el.style.left=Math.round(Math.min(Math.max(innerWidth/2,335+w/2),innerWidth-w/2-8))+'px';}}   /* keep the tip clear of the town panel on the left */
function tutCheck(){{const el=document.getElementById('tut');if(el&&!el.hidden&&(!G||!G.tut))el.hidden=true;}if(!TUTS||!G||!G.tut||G.over||TUTS.wait||!$('menu').hidden)return;
  const me=G.teams[ME],k=TUT[TUTS.i].k;tutLayout();
  let ok=false;try{ok=!!TUT[TUTS.i].ok();}catch(e){}
  if(ok&&performance.now()-(TUTS.e0||0)>=1500)tutAdvance(false);}   /* every tip stays up at least 1.5 s before it is ticked off: a step your men finish on their own (they shoot by themselves) used to flash by unread */
setInterval(()=>{try{tutCheck();}catch(e){}},400);setInterval(()=>{try{tutHLTick();}catch(e){}},120);
function startBattleTutorial(){TUT=TUTB;MODE='single';ME=0;const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,en];
  const mk=MAPS[setup.map]&&MAPS[setup.map].min<=2&&MAPS[setup.map].max>=2?setup.map:'strait';
  TERR_DEFER=true;try{newGame({w:setup.w|0,seed:(window.__tutSeed||Math.random()*1e9)|0,facs,ai:[false,false],map:mk,tm:[0,1],bs:setup.bs,slot:-1,st:skSt(2)});}finally{TERR_DEFER=false;}
  const T=G.teams[0];G.tut=true;G.docDis=1;T.credits+=1500;if(T.ai)T.ai=null;if(G.teams[1])G.teams[1].ai=null;
  try{const eh=G.ents.find(e=>e.team===1&&e.kind==='hq');if(eh){eh.max=eh.hp=Math.min(eh.max,1500);}}catch(e){}
  TUTS={i:0};afterStart();{const el=tutEl();for(const id of ['tutShow','tutSkip'])$(id).hidden=false;$('tutExit').textContent='Exit tutorial';}tutEnter();}
function socialMenu(){const row=document.getElementById('openSettings');
  if(row&&!$('openMyb')){const b=document.createElement('button');b.className='big ghost';b.id='openMyb';b.style.cssText='font-size:15px;padding:7px 16px;margin-left:6px';b.textContent='My battles';b.onclick=bhOpen;row.after(b);}
  const st=$('start');if(st&&!$('tutorial')){const t=document.createElement('button');t.className='big ghost';t.id='tutorial';t.textContent=(()=>{try{return localStorage.getItem(TUT_KEY)==='1'?'Tutorial (replay)':'▶ Tutorial: learn Battle (10 min)';}catch(e){return 'Tutorial';}})();
    t.title='A guided first Battle against a calm enemy, supply lines included (about 10 minutes). Single-player only.';t.onclick=()=>{initAudio();startBattleTutorial();};st.before(t);}}
try{socialMenu();}catch(e){console.warn('social menu',e);}
