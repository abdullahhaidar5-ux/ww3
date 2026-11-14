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
/* A guided first Conquest battle (single-player, passive/calm enemy). Each step: t = what and why (short), a = the ONE thing to do,
   hl() = what to point the pulsing arrow at ({d:'css selector'} | {el:element} | {w:{x,y}} world spot), cam() = where the camera goes when the step starts,
   ok() = done test. The tests look at the state of the battle (not at "what changed"), so doing things out of order never blocks a step. */
// buildings are built only by a Construction Vehicle (Dozer): until one is selected the tutorial points at it
const tutDzHl=()=>{if(G.sel.some(u=>u.kind==='dozer'&&u.team===ME&&!u.dead))return null;const d=G.ents.find(u=>u.team===ME&&u.kind==='dozer'&&!u.dead);return d?{w:d}:null;};
const tutHQ=()=>G.ents.find(e=>e.team===ME&&e.kind==='hq'&&!e.dead);
const tutBld=k=>G.ents.find(e=>e.isB&&e.team===ME&&e.kind===k&&!e.dead);
const tutInf=()=>G.ents.filter(e=>!e.isB&&e.team===ME&&e.kind==='inf'&&!e.dead).length;
const tutFoe=()=>{const s=tutSquad()||tutHQ()||{x:0,y:0};let b=null,bd=1e9;for(const u of G.ents){if(u.isB||u.dead||u.team===ME||u.team===G.reb)continue;const d=Math.hypot(u.x-s.x,u.y-s.y);if(d<bd&&d<1200){bd=d;b=u;}}return b;};   // only enemies near your squad (not the far enemy base)
const tutFoeHQ=()=>G.ents.find(e=>e.team!==ME&&e.team!==G.reb&&e.kind==='hq'&&!e.dead);
function tutSquad(){const u=tutUnits();if(!u.length)return null;let x=0,y=0;for(const q of u){x+=q.x;y+=q.y;}return{x:x/u.length,y:y/u.length};}
function tutTown(){const T=TUTS;const own=T.town&&T.town.ow===ME?T.town:G.towns.find(t=>t.ow===ME);if(own){T.town=own;return own;}
  if(T.town)return T.town;const hq=tutHQ();let best=1e9,p=null;for(const t of G.towns){if(t.reb>G.t)continue;const d=hq?Math.hypot(t.x-hq.x,t.y-hq.y)+(t.ham?400:0):0;if(d<best){best=d;p=t;}}T.town=p;return p;}
const tutHouse=()=>{const t=tutTown();if(!t)return null;const c=t.cells.find(c=>c.key&&c.ow!==ME&&!c.dead)||t.cells.find(c=>c.ow!==ME&&!c.dead);return c?{x:c.x,y:c.y}:{x:t.x,y:t.y};};
const tutGarN=()=>{let n=0;for(const t of G.towns)for(const c of t.cells)if(c.occ)for(const u of c.occ)if(u.team===ME)n++;return n;};
function tutSpawn(n,x,y){let c=0;for(let i=0;i<n;i++){const p=nearestPassXY('ground',x+Math.cos(i*2.1)*40,y+Math.sin(i*2.1)*40);if(p&&addUnit(ME,'inf',p[0],p[1]))c++;}return c;}
const tutPanelBtn=id=>document.getElementById(id);
const tutTownBtn=r=>{const p=document.getElementById('townp');return p&&p.style.display!=='none'&&TP.ti===(TUTS.town&&TUTS.town.i)?p.querySelector('button[data-r="'+r+'"]'):null;};
const tutTownHL=r=>{const b=tutTownBtn(r);if(b)return{el:b};const t=tutTown();return t?{mm:{x:t.x,y:t.y}}:null;};
const TUTC=[
 {k:'sel',t:'Welcome to Conquest! These are your soldiers.',a:'Left-click one, or drag a box around them, to select.',
  hl:()=>({w:tutSquad()}),cam:()=>tutSquad(),ok:()=>G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&!['harv','dozer','hacker'].includes(u.kind))},
 {k:'move',t:'Selected soldiers take orders with the RIGHT mouse button.',a:'Right-click the glowing spot to send them there.',
  enter:()=>{const s=tutSquad();if(s){let best=null;   /* walkable ground a short way off (never across water), preferably straight across the screen */
      for(const R of [220,160,110,70]){for(const [dx,dy] of [[1,0],[-1,0],[.7,-.7],[-.7,-.7],[0,-1],[.7,.7],[-.7,.7],[0,1]]){const tx=s.x+dx*R,ty=s.y+dy*R,p=nearestPassXY('ground',tx,ty);if(p&&Math.hypot(p[0]-tx,p[1]-ty)<35){best={x:p[0],y:p[1]};break;}}if(best)break;}
      TUTS.mk=best||{x:s.x+60,y:s.y+40};}TUTS.pos=new Map(tutUnits().map(u=>[u.id,[u.x,u.y]]));},
  hl:()=>({w:TUTS.mk}),cam:()=>{const s=tutSquad();return s&&TUTS.mk?{x:(s.x+TUTS.mk.x)/2,y:(s.y+TUTS.mk.y)/2}:s;},
  ok:()=>{for(const u of tutUnits()){const p=TUTS.pos.get(u.id);if(p&&Math.hypot(u.x-p[0],u.y-p[1])>(Math.hypot(TUTS.mk.x-p[0],TUTS.mk.y-p[1])>140?80:35))return true;}return false;}},
 {k:'atk',t:'Red soldiers are enemies. Your men also shoot on their own, but you choose the targets. (After an order they deselect: pick them again.)',a:'Select your soldiers, then right-click a red enemy to attack.',
  enter:()=>{TUTS.k0=G.teams[ME].kills|0;if(!tutFoe()){const s=tutSquad()||tutHQ();if(s)for(let i=0;i<2;i++){const p=nearestPassXY('ground',s.x+330+i*30,s.y+i*25);const u=p&&Math.hypot(p[0]-s.x,p[1]-s.y)<700&&addUnit(1,'inf',p[0],p[1]);if(u)u.hp*=.7;}}},
  hl:()=>({w:tutFoe()}),cam:()=>tutFoe(),ok:()=>(G.teams[ME].kills|0)>TUTS.k0},
 {k:'setup',t:'Setup phase: in every match nobody can shoot for the first 90 seconds (timer at the top), and you start with a full base: Barracks, War Factory, Supply Depot and $10,000. Spend the time adding to it.',a:'Click your Dozer (Construction Vehicle), open Build, click Defense Gun, then click next to your base. The Dozer drives there and builds it.',
  enter:()=>{G.setupEnd=Math.max(G.setupEnd||0,G.t+75);},
  hl:()=>{if(tutBld('turret'))return{w:tutBld('turret')};{const z=tutDzHl();if(z)return z;}if(G.place==='turret'){const h=tutHQ();return{w:h?{x:h.x+120,y:h.y+90}:null};}return{d:'#b_turret'};},cam:()=>tutHQ(),
  ok:()=>G.ents.some(e=>e.isB&&e.team===ME&&e.kind==='turret'&&!e.dead&&e.built>=1)},
 {k:'trn',t:'The Barracks trains soldiers. Training takes a few seconds.',a:'Click your Barracks, then click a soldier in the bar. Each building has its own queue (right-click to cancel).',
  enter:()=>{TUTS.n0=tutInf();},
  hl:()=>{const b=tutBld('barracks');if(!b)return{w:tutHQ()};if(G.sel.includes(b)){const k=roster(G.teams[ME].fac).barracks[0];return{d:'#u_'+k};}return{w:b};},cam:()=>tutBld('barracks')||tutHQ(),
  ok:()=>tutInf()>TUTS.n0},
 {k:'town',t:()=>{const t=TUTS&&tutTown(),K=t?t.cells.filter(c=>c.key).length||t.K:3;return 'Towns and hamlets pay you TAX. To own one, hold MORE THAN HALF of its key houses (here '+(Math.floor(K/2)+1)+' of '+K+'). A house takes a few soldiers.';},a:'Select soldiers and right-click the ringed house. Then send other soldiers into the next one.',
  enter:()=>{tutTown();const h=tutHQ();if(h&&tutInf()+tutGarN()<4)tutSpawn(3,h.x+70,h.y+140);},
  hl:()=>({w:tutHouse()}),cam:()=>tutTown(),ok:()=>G.towns.some(t=>t.ow===ME)},
 {k:'tax',t:'This town is far behind your front line, so it is safe: HIGH tax pays the most. Near the enemy use LOW, or the locals get angry.',a:'Click your town\'s marker on the minimap (bottom left), then press High.',
  hl:()=>tutTownHL(2),cam:()=>tutTown(),ok:()=>{const t=tutTown();return t&&t.ow===ME&&t.rate>=2;}},
 {k:'unrest',t:'Angry locals fill the Unrest bar. At 100 the town REVOLTS and rebels throw you out. Let us watch one (yellow and red rings on the minimap warn you).',a:'Open the town panel (its minimap marker) and press Extortionate. Wait a few seconds.',
  hl:()=>tutTownHL(3),cam:()=>tutTown(),ok:()=>(G.teams[ME].revN|0)>0},
 {k:'retake',t:'Revolt! Rebels hold the town now. Reinforcements are arriving. Lesson: lower the tax before the bar fills.',a:'Select soldiers and right-click the ringed houses to take it back.',
  enter:()=>{const t=tutTown(),h=tutHQ();if(t){for(const c of t.cells)if(c.g&&!c.g.dead&&c.g.team===G.reb&&c.occ&&c.occ.length){try{leaveGarrison(c);}catch(e){}}
      let n=0;for(const u of (t.rebU||[])){if(!u||u.dead)continue;if(++n>2){try{kill(u,ME,null);}catch(e){u.dead=true;}}else u.hp*=.4;}}   /* only two weak rebels stay (the lesson is the tax, not a hard fight) and they do not hole up in the houses */   /* tutorial rebels are weak: the lesson is the tax, not a hard fight */
    if(t&&h&&tutUnits().length<10){const a=Math.atan2(h.y-t.y,h.x-t.x);tutSpawn(6,t.x+Math.cos(a)*330,t.y+Math.sin(a)*330);try{pushLog('Reinforcements have arrived.','w');}catch(e){}}},
  hl:()=>({w:tutHouse()}),cam:()=>tutTown(),ok:()=>{const t=tutTown();return!!t&&t.ow===ME;}},
 {k:'civic',t:'Each town has one perk building (market: more tax; garage: repairs vehicles; clinic or mosque: heals soldiers, calms unrest). Hold it to get the perk.',a:'Open the town panel (minimap marker), read its perk line, then press Low (a freshly retaken town is touchy).',
  enter:()=>{TUTS.civ=0;},
  hl:()=>tutTownHL(0),cam:()=>tutTown(),ok:()=>{const t=tutTown();return!!t&&t.ow===ME&&t.rate===0;}},
 {k:'logi',t:'Towns need a road to your base. A town with no link is CUT OFF: no ammo and less tax. Your Construction Vehicle builds roads.',a:'Press L (or open Layers at the top and pick Supply) to see your supply network.',
  hl:()=>{const b=document.getElementById('hudLyB');return b?{el:b}:null;},cam:()=>tutHQ(),ok:()=>(typeof LGU!=='undefined'&&LGU.on)},
 {k:'pow',t:'Powers use your General points, and you have two to spend. (They cannot be used during the setup phase.)',a:'Open the Powers tab and click a power to buy it.',
  enter:()=>{TUTS.s0=G.teams[ME].spent|0;TUTS.p0=Object.keys(G.teams[ME].pw).length;if(G.t<G.setupEnd)G.setupEnd=G.t;},
  hl:()=>{if(typeof TAB!=='undefined'&&TAB==='pow'){const b=[...document.querySelectorAll('#panel button[id^="p_"]')].find(x=>x.offsetParent&&!x.disabled);return b?{el:b}:null;}return{d:'.tabs button[data-tab="pow"]'};},cam:()=>tutHQ(),
  ok:()=>(G.teams[ME].spent|0)>TUTS.s0||Object.keys(G.teams[ME].pw).length>TUTS.p0},
 {k:'md',t:'Enemies can fire missiles at your base. An Anti-Air Missile Site shoots them down. Build one near your base.',a:'Click your Dozer, open Build, click the Anti-Air Missile Site, then click next to your base. The Dozer builds it.',
  hl:()=>{if(tutBld('sam'))return null;{const z=tutDzHl();if(z)return z;}if(G.place==='sam'){const h=tutHQ();return{w:h?{x:h.x-130,y:h.y+80}:null};}return{d:'#b_sam'};},cam:()=>tutHQ(),ok:()=>!!tutBld('sam')},
 {k:'win',t:'Last step: destroy the enemy base to win. It is far away (see the minimap) and only lightly guarded. Reserves arrive now; keep your Barracks producing too.',a:'Gather your soldiers, then hold F and click the enemy base to attack-move.',
  enter:()=>{const T=G.teams[ME],h=tutHQ();T.credits+=2500;if(h)tutSpawn(6,h.x+70,h.y+140);try{pushLog('Reserves have arrived.','w');}catch(e){}},   // the calm enemy stays calm (no AI): the tutorial finale stays winnable and deterministic
  hl:()=>({w:tutFoeHQ()}),cam:()=>tutHQ(),ok:()=>false}];
/* BATTLE tutorial (polishE 2026-11-10): the Generals-rules lesson, same step machinery as the Conquest one (one system per idea). */
const tutMob=()=>G.ents.filter(e=>!e.isB&&e.team===ME&&!e.dead&&!['harv','dozer','hacker'].includes(e.kind));
const tutBPlace=(k,dx,dy)=>{if(tutBld(k))return{w:tutBld(k)};{const z=tutDzHl();if(z)return z;}if(G.place===k){const h=tutHQ();return{w:h?{x:h.x+dx,y:h.y+dy}:null};}return{d:'#b_'+k};};
const TUTB=[
 {k:'gen',t:'Welcome to Battle! Your electronic buildings (air defense, Strike Center, radio, Airfield) need power. You build a Generator for it, and you can capture map power plants for extra. Without enough power they switch off.',a:'Click your Dozer (Construction Vehicle), open Build, click Generator, then click the ground near your base.',
  hl:()=>tutBPlace('gen',-100,-110),cam:()=>tutHQ(),ok:()=>!!tutBld('gen')},
 {k:'dep',t:'Your Supply Trucks haul money to the Command Center. A Supply Depot next to a far supply field shortens the trip.',a:'Click your Dozer, open Build, click Supply Depot, then click the ground near your base.',
  hl:()=>tutBPlace('depot',-130,90),cam:()=>tutHQ(),ok:()=>!!tutBld('depot')},
 {k:'bar',t:'Barracks train infantry, and they unlock the rest of your tech tree.',a:'Click your Dozer, open Build, click Barracks, then click next to your base. Hold Shift to line up several buildings.',
  hl:()=>tutBPlace('barracks',120,90),cam:()=>tutHQ(),ok:()=>!!tutBld('barracks')},
 {k:'fac',t:'The War Factory builds tanks and other vehicles. It needs a Barracks first.',a:'With your Dozer selected, open Build and place a War Factory next to your base. Right-click a half-built building with another Dozer to help.',
  hl:()=>tutBPlace('factory',150,-60),cam:()=>tutHQ(),ok:()=>!!tutBld('factory')},
 {k:'veh',t:'Now put the factory to work. A selected production building shows what it can make and its own queue. Vehicles are built only in the War Factory.',a:'Click your War Factory, then click a vehicle to train it.',
  hl:()=>{const b=tutBld('factory');if(!b)return{w:tutHQ()};return G.sel.includes(b)?{d:'#u_tank'}:{w:b};},cam:()=>tutBld('factory'),
  enter:()=>{TUTS.k0=tutMob().length;},ok:()=>tutMob().length>TUTS.k0},
 {k:'atk',t:'Your army is ready. Select it (Ctrl+A selects everything), then send it at the enemy with a right-click. Destroy every enemy building to win.',a:'Select your army and right-click an enemy building.',
  enter:()=>{G.teams[ME].credits+=2500;},hl:()=>({w:tutFoeHQ()}),cam:()=>tutFoeHQ(),ok:()=>false}];
let TUT=TUTC;
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
  r.innerHTML=`<div class="c"><h2>You're ready!</h2>Three tips for a real match:<ol><li>Tax: <b>High</b> in safe towns behind your lines, <b>Low</b> on the front line. Watch the unrest bars.</li><li>Keep your towns linked by road (press <b>L</b>) and build missile defense before the enemy's strike is ready.</li><li>Right-click orders, <b>F</b> + click attack-move, <b>X</b> stops. Attack as one big group.</li></ol><div class="r"><button id="tutGo">Start a real match</button><button id="tutMenu" class="g">Main menu</button></div></div>`;
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
  /* safety nets: never leave the player without soldiers; the unrest lesson is sped up so a revolt really happens within seconds */
  if(TUT===TUTC&&!tutUnits().length&&!tutGarN()&&!G.ents.some(e=>e.isB&&e.team===ME&&e.kind==='barracks'&&!e.dead&&e.built>=1&&e.q&&e.q.length)){const h=tutHQ();if(h&&(TUTS.rescue|0)<4){TUTS.rescue=(TUTS.rescue|0)+1;tutSpawn(5,h.x+60,h.y+130);try{pushLog('Reserves have arrived.','w');}catch(e){}}}
  if(TUTS.town){for(const c of TUTS.town.cells){const g=c.g;if(g&&!g.dead&&g.max&&g.team===ME&&g.hp<g.max*.4)g.hp=g.max*.4;}}   /* the tutorial town's houses cannot be shot to rubble (that would make the town impossible to take) */
  if(k==='retake'&&TUTS.town){for(const c of TUTS.town.cells)if(c.g&&!c.g.dead&&c.g.team===G.reb&&c.occ&&c.occ.length){try{leaveGarrison(c);}catch(e){}}
    if(performance.now()-TUTS.e0>8000){for(const u of G.ents.slice())if(!u.isB&&!u.dead&&u.team===G.reb&&Math.hypot(u.x-TUTS.town.x,u.y-TUTS.town.y)<600){try{kill(u,ME,null);}catch(e){u.dead=true;}}}}   /* after a few seconds the last rebels give up, so nothing contests the town */   /* rebels never hole up in the houses during the tutorial: they fight in the open and the houses stay free to take */
  if(k==='unrest'){const t=tutTown();if(t&&t.ow===ME&&t.rate>=3)t.un=Math.min(100,t.un+6);}
  let ok=false;try{ok=!!TUT[TUTS.i].ok();}catch(e){}
  if(ok&&performance.now()-(TUTS.e0||0)>=1500)tutAdvance(false);}   /* every tip stays up at least 1.5 s before it is ticked off: a step your men finish on their own (they shoot by themselves) used to flash by unread */
setInterval(()=>{try{tutCheck();}catch(e){}},400);setInterval(()=>{try{tutHLTick();}catch(e){}},120);
function startBattleTutorial(){TUT=TUTB;MODE='single';ME=0;const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,en];
  const mk=MAPS[setup.map]&&MAPS[setup.map].min<=2&&MAPS[setup.map].max>=2?setup.map:'strait';
  TERR_DEFER=true;try{newGame({battle:1,w:setup.w|0,seed:(window.__tutSeed||Math.random()*1e9)|0,facs,ai:[false,false],map:mk,tm:[0,1],bs:setup.bs,slot:-1,st:skSt(2)});}finally{TERR_DEFER=false;}
  const T=G.teams[0];G.tut=true;G.docDis=1;G.setupEnd=0;T.credits+=1500;if(T.ai)T.ai=null;if(G.teams[1])G.teams[1].ai=null;
  try{const eh=G.ents.find(e=>e.team===1&&e.kind==='hq');if(eh){eh.max=eh.hp=Math.min(eh.max,1500);}}catch(e){}
  TUTS={i:0};afterStart();for(const id of ['tutShow','tutSkip'])$(id).hidden=false;$('tutExit').textContent='Exit tutorial';tutEnter();}
function startTutorial(){TUT=TUTC;MODE='single';ME=0;const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,en];
  const mk=MAPS[setup.map]&&MAPS[setup.map].min<=2&&MAPS[setup.map].max>=2?setup.map:'strait';
  TERR_DEFER=true;try{newGame({w:setup.w|0,seed:(window.__tutSeed||Math.random()*1e9)|0,facs,ai:[false,false],map:mk,tm:[0,1],bs:setup.bs,slot:-1,st:skSt(2)});}finally{TERR_DEFER=false;}
  const T=G.teams[0];G.tut=true;G.docDis=1;G.setupEnd=0;T.credits+=3000;T.gxp=Math.max(T.gxp|0,RANKS[1]);promoteGeneral(T);if(T.ai)T.ai=null;if(G.teams[1])G.teams[1].ai=null;
  try{const hq=G.ents.find(e=>e.team===0&&e.kind==='hq'),a=Math.atan2(MAPH/2-hq.y,MAPW/2-hq.x);
    for(let i=0;i<2;i++){const p=nearestPassXY('ground',hq.x+Math.cos(a)*470+rnd(-60,60),hq.y+Math.sin(a)*470+rnd(-60,60));const u=p&&addUnit(1,'inf',p[0],p[1]);if(u)u.hp*=.7;}
    {const q=G.ents.find(e=>e.team===0&&e.kind==='inf'&&!e.dead);tutSpawn(3,q?q.x+45:hq.x+70,q?q.y+45:hq.y+140);}}catch(e){console.warn('tutorial spawn',e);}   // 3 more soldiers right next to the starting squad
  try{const eh=G.ents.find(e=>e.team===1&&e.kind==='hq');if(eh){eh.max=eh.hp=Math.min(eh.max,1500);}}catch(e){}   // a lighter enemy HQ so the finale does not drag on
  TUTS={i:0};afterStart();{const el=tutEl();for(const id of ['tutShow','tutSkip'])$(id).hidden=false;$('tutExit').textContent='Exit tutorial';}tutEnter();}
function socialMenu(){const row=document.getElementById('openSettings');
  if(row&&!$('openMyb')){const b=document.createElement('button');b.className='big ghost';b.id='openMyb';b.style.cssText='font-size:15px;padding:7px 16px;margin-left:6px';b.textContent='My battles';b.onclick=bhOpen;row.after(b);}
  const st=$('start');if(st&&!$('tutorial')){const t=document.createElement('button');t.className='big ghost';t.id='tutorial';t.textContent=(()=>{try{return localStorage.getItem(TUT_KEY)==='1'?'Tutorial (replay)':'▶ Tutorial: learn Conquest (10 min)';}catch(e){return 'Tutorial';}})();
    t.title='A guided first Conquest battle against a calm enemy (about 10 minutes). Single-player only.';t.onclick=()=>{initAudio();startTutorial();};st.before(t);}}
try{socialMenu();}catch(e){console.warn('social menu',e);}
