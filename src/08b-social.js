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
   `<div class="stat"><div><b>${s.n}</b>battles</div><div><b>${s.w}</b>wins (${Math.round(100*s.w/s.n)}%)</div><div><b>${bhEsc(nm(s.fav))}</b>favourite nation</div><div><b>${bhFmt(s.best)}</b>fastest win</div><div><b>${Math.round(s.secs/60)} min</b>played</div></div>
   <div class="label">Most-used units</div><div>${s.top.length?s.top.map(k=>bhEsc(bhUnitName(s.fav,k))+' ×'+s.uc[k]).join(' · '):'Train some units in a battle to fill this in.'}</div>
   <div class="label">Last ${Math.min(20,a.length)} battles</div><div style="overflow-x:auto"><table><tr><th>Day</th><th>Nation</th><th>Result</th><th>Time</th><th>Map</th><th>Opponents</th><th title="units built / lost">B/L</th></tr>${rows}</table></div>`
   :`<div class="none">No finished battles yet. Win or lose one and it shows up here.</div>`)+
   `<div class="row" style="margin-top:12px"><button class="big ghost" id="mybClose">Close</button>`+(a.length?`<button class="big ghost" id="mybClear">Clear history</button>`:'')+`</div></div>`;
  ov.hidden=false;$('mybClose').onclick=()=>{ov.hidden=true;};const c=$('mybClear');if(c)c.onclick=()=>{if(confirm('Delete your saved battle history on this device?')){bhSave([]);bhOpen();}};}

/* ---------- Tutorial ---------- */
const TUT=[
 {k:'sel',pc:'Select your soldiers: left-click one, or drag a box around several.',tc:'Select your soldiers: tap one, or drag a box around several.'},
 {k:'move',pc:'Move them: with soldiers selected, right-click the ground where you want them to go.',tc:'Move them: with soldiers selected, tap the ground where you want them to go.'},
 {k:'atk',pc:'Attack: select your soldiers, then right-click a red enemy soldier. Press "Show me" to find them.',tc:'Attack: select your soldiers, then tap a red enemy soldier. Press "Show me" to find them.'},
 {k:'bar',pc:'Build a Barracks: open the build panel, pick Barracks, then click near your base to place it. Wait until it finishes.',tc:'Build a Barracks: open the build panel, pick Barracks, then tap near your base to place it. Wait until it finishes.'},
 {k:'trn',pc:'Train soldiers: select the Barracks (left-click it) and train some infantry from its panel.',tc:'Train soldiers: tap the Barracks and train some infantry from its panel.'},
 {k:'setup',pc:'Setup phase: in Conquest nobody can fire for the first 90 seconds (see the countdown at the top). Use it to build your barracks, factory and economy; the enemy base is safe from you too. This message goes away on its own.',tc:'Setup phase: nobody can fire for the first 90 seconds. Use it to build your base.'},
 {k:'town',pc:'Conquest - capture a town or hamlet: select infantry and right-click one of its houses so they garrison it. More than half of its key buildings makes it yours, and it pays you TAX. "Show me" finds the nearest one.',tc:'Conquest - capture a town or hamlet: select infantry and tap one of its houses so they garrison it. "Show me" finds the nearest one.'},
 {k:'tax',pc:'Set its tax: click your town (or its square/circle on the minimap) and pick Low / Normal / High / Extortionate. High tax pays more but angers the locals; near the front they rise much faster. High tax in safe towns behind your lines, Low tax on the front line - at 100 unrest the town revolts and rebels throw you out.',tc:'Set its tax: tap your town (or its marker on the minimap) and pick a rate. High in safe towns behind your lines, Low on the front line - at 100 unrest the town revolts.'},
 {k:'unrest',pc:'Unrest and revolts: every town you hold has an unrest bar. High tax and enemy troops nearby push it up; your own soldiers inside, low tax and a clinic push it down. Above 50 the town is Restless (pays less, easier to capture); at 100 it REVOLTS - your garrison is thrown out and armed rebels appear. Watch the yellow and red rings on the minimap.',tc:'Unrest and revolts: high tax and enemy troops raise a town\'s unrest bar; at 100 it revolts and rebels appear. Lower taxes or station troops there.'},
 {k:'civic',pc:'Civic buildings: each town has one perk building. A market adds tax (even more on Low), a garage or fuel station repairs your vehicles nearby, a clinic or mosque heals your infantry and calms unrest. Hold the building to get its perk; it switches off while the town is Restless.',tc:'Civic buildings: a market adds tax, a garage repairs vehicles, a clinic or mosque heals infantry and calms unrest. Hold the building to get the perk.'},
 {k:'hm',pc:'Hearts and minds: a town you have held for two minutes with low unrest turns LOYAL. Click it to recruit cheap local militia, and its informants ping enemy troops on the minimap. Restless enemy towns can be bribed. Shelling a town angers the locals, and a captured radio tower calms your towns and stirs up the enemy\'s.',tc:'Hearts and minds: a loyal town lets you recruit local militia and spots enemy troops. Bribe restless enemy towns; do not shell towns.'},
 {k:'logi',pc:'Logistics: towns need a road link to your base or they are CUT OFF (no ammo, less tax). Press L to see your supply lines. Your Construction Vehicle builds roads (click your town - Build road), lays road mines and checkpoints, blows or rebuilds bridges and lays pontoons; a Transport Helicopter can airlift supplies. Press L now.',tc:'Logistics: towns need a road link to your base or they are CUT OFF. Tap Supply lines to see the network.'},
 {k:'pow',pc:'Use a power: you have a free general point. Open Powers, buy one, then use it (a hotkey or a click on the map).',tc:'Use a power: you have a free general point. Open Powers, buy one, then use it.'},
 {k:'win',pc:'Win: destroy the enemy base. Build up an army, attack-move with F + click, and keep your Barracks producing. Victory finishes the tutorial.',tc:'Win: destroy the enemy base. Build up an army and attack. Victory finishes the tutorial.'}];
let TUTS=null;
function tutEl(){let el=document.getElementById('tut');if(el)return el;el=document.createElement('div');el.id='tut';el.hidden=true;
  el.innerHTML=`<div class="tt"><b id="tutN"></b><span id="tutT"></span></div><div class="tb"><button id="tutShow">Show me</button><button id="tutSkip">Skip step</button><button id="tutExit">Exit tutorial</button></div>`;
  document.body.append(el);const st=document.createElement('style');st.textContent=`#tut{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:40;width:min(560px,calc(100% - 20px));background:rgba(10,16,13,.93);border:1px solid #6fd36f;color:var(--fg,#e8efe9);padding:9px 11px;font-size:15px;line-height:1.35;box-shadow:0 4px 18px #0008}#tut[hidden]{display:none}#tut .tt b{color:#6fd36f;margin-right:8px}#tut .tb{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}#tut button{background:var(--panel2,#1a241f);color:inherit;border:1px solid var(--line,#33433a);padding:7px 11px;font:inherit;font-size:14px;min-height:36px}#tut.ok{border-color:#fff}body.touchui #tut{font-size:16px}body.touchui #tut button{min-height:44px}`;document.head.append(st);
  $('tutShow').onclick=tutShow;$('tutSkip').onclick=()=>tutAdvance(true);$('tutExit').onclick=tutExit;return el;}
function tutUnits(){return G.ents.filter(u=>!u.isB&&u.team===ME&&!u.dead&&!['harv','dozer','hacker'].includes(u.kind));}
function tutShow(){if(!G||!G.tut||!TUTS)return;const k=TUT[TUTS.i].k,me=G.teams[ME];let p=null;
  if(k==='atk'){const e=G.ents.find(u=>!u.isB&&u.team!==ME&&!u.dead);if(e)p=e;}
  else if(k==='town'||k==='tax'||k==='hm'){let best=1e9;const hq=G.ents.find(e=>e.team===ME&&e.kind==='hq');for(const t of G.towns){if(k==='town'?t.ow===ME:t.ow!==ME)continue;const d=hq?Math.hypot(t.x-hq.x,t.y-hq.y):0;if(d<best){best=d;p=t;}}}
  else if(k==='win'){p=G.ents.find(e=>e.team!==ME&&e.kind==='hq'&&!e.dead);}
  else p=G.ents.find(e=>e.team===ME&&e.kind==='hq'&&!e.dead);
  if(p)try{centerOn(p.x,p.y);}catch(e){}}
function tutRender(){const el=tutEl();if(!TUTS||!G||!G.tut){el.hidden=true;return;}el.hidden=false;const s=TUT[TUTS.i];
  $('tutN').textContent=`Step ${TUTS.i+1}/${TUT.length}`;$('tutT').textContent=TOUCHUI?s.tc:s.pc;el.classList.remove('ok');}
function tutEnter(){const s=TUT[TUTS.i],me=G.teams[ME];TUTS.e0=performance.now();
  if(s.k==='move')TUTS.pos=new Map(tutUnits().map(u=>[u.id,[u.x,u.y]]));
  if(s.k==='atk')TUTS.k0=me.kills|0;
  if(s.k==='trn')TUTS.b0=me.built|0;
  if(s.k==='town')TUTS.t0=G.towns.filter(t=>t.ow===ME).length;
  if(s.k==='pow'){TUTS.unl={};}
  tutRender();}
function tutAdvance(skip){if(!TUTS||!G||!G.tut)return;const el=tutEl();
  if(TUTS.i>=TUT.length-1){if(skip)tutExit();return;}
  if(skip){TUTS.i++;tutEnter();return;}
  el.classList.add('ok');$('tutT').textContent='Good!';TUTS.wait=true;setTimeout(()=>{if(!TUTS||!G||!G.tut)return;TUTS.wait=false;TUTS.i++;tutEnter();},900);}
function tutExit(){if(G)G.tut=false;TUTS=null;const el=document.getElementById('tut');if(el)el.hidden=true;}
function tutDone(){try{localStorage.setItem(TUT_KEY,'1');}catch(e){}const el=tutEl();el.hidden=false;el.classList.add('ok');$('tutN').textContent='Tutorial complete!';$('tutT').textContent='You know the basics. Pick a nation and try a Skirmish or Play online.';
  for(const id of ['tutShow','tutSkip'])$(id).hidden=true;$('tutExit').textContent='Close';TUTS=null;setTimeout(()=>{if(G)G.tut=false;},50);}
function tutCheck(){{const el=document.getElementById('tut');if(el&&!el.hidden&&(!G||!G.tut))el.hidden=true;}if(!TUTS||!G||!G.tut||G.over||TUTS.wait||!$('menu').hidden)return;
  const me=G.teams[ME],k=TUT[TUTS.i].k;let ok=false;
  if(k==='sel')ok=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&!['harv','dozer','hacker'].includes(u.kind));
  else if(k==='move'){for(const u of tutUnits()){const p=TUTS.pos.get(u.id);if(p&&Math.hypot(u.x-p[0],u.y-p[1])>80){ok=true;break;}}}
  else if(k==='atk')ok=(me.kills|0)>TUTS.k0;
  else if(k==='bar')ok=G.ents.some(e=>e.isB&&e.team===ME&&e.kind==='barracks'&&!e.dead&&e.built>=1);
  else if(k==='trn')ok=(me.built|0)>TUTS.b0&&G.ents.some(e=>e.team===ME&&e.kind==='inf'&&!e.dead)||(me.built|0)>TUTS.b0+1;
  else if(k==='town')ok=G.towns.filter(t=>t.ow===ME).length>TUTS.t0;
  else if(k==='tax')ok=G.towns.some(t=>t.ow===ME&&t.rate!==1);
  else if(k==='setup'||k==='unrest'||k==='civic')ok=performance.now()-(TUTS.e0||0)>(k==='setup'?12000:16000)||(k==='setup'&&G.setupEnd&&G.t>G.setupEnd);
  else if(k==='hm')ok=G.towns.some(t=>t.ow===ME&&t.loy);
  else if(k==='logi')ok=(typeof LGU!=='undefined'&&LGU.on)||performance.now()-(TUTS.e0||0)>25000;
  else if(k==='pow'){/* powers start locked for a few minutes: unlock any we own on first sight; a cooldown that starts afterwards means one was used */
    for(const pk in me.pw){const c=me.pw[pk].cd;if(TUTS.unl[pk]){if(c>0.5)ok=true;}else{TUTS.unl[pk]=true;if(c>0)me.pw[pk].cd=0;}}}
  if(ok)tutAdvance(false);}
setInterval(()=>{try{tutCheck();}catch(e){}},400);
function startTutorial(){MODE='single';ME=0;const en=FKEYS.find(k=>k!==setup.p&&k!=='RS'&&k!=='DW')||'US',facs=[setup.p,en];
  const mk=MAPS[setup.map]&&MAPS[setup.map].min<=2&&MAPS[setup.map].max>=2?setup.map:'strait';
  TERR_DEFER=true;try{newGame({w:setup.w|0,seed:(Math.random()*1e9)|0,facs,ai:[false,false],map:mk,tm:[0,1],bs:setup.bs,slot:-1,st:skSt(2)});}finally{TERR_DEFER=false;}
  const T=G.teams[0];G.tut=true;G.setupEnd=0;T.credits+=3000;T.gxp=Math.max(T.gxp|0,RANKS[1]);promoteGeneral(T);if(T.ai)T.ai=null;if(G.teams[1])G.teams[1].ai=null;
  try{const hq=G.ents.find(e=>e.team===0&&e.kind==='hq'),a=Math.atan2(MAPH/2-hq.y,MAPW/2-hq.x);
    for(let i=0;i<3;i++){const p=nearestPassXY('ground',hq.x+Math.cos(a)*380+rnd(-60,60),hq.y+Math.sin(a)*380+rnd(-60,60));if(p)addUnit(1,'inf',p[0],p[1]);}}catch(e){console.warn('tutorial spawn',e);}
  TUTS={i:0};afterStart();{const el=tutEl();for(const id of ['tutShow','tutSkip'])$(id).hidden=false;$('tutExit').textContent='Exit tutorial';}tutEnter();}
function socialMenu(){const row=document.getElementById('openSettings');
  if(row&&!$('openMyb')){const b=document.createElement('button');b.className='big ghost';b.id='openMyb';b.style.cssText='font-size:15px;padding:7px 16px;margin-left:6px';b.textContent='My battles';b.onclick=bhOpen;row.after(b);}
  const st=$('start');if(st&&!$('tutorial')){const t=document.createElement('button');t.className='big ghost';t.id='tutorial';t.textContent=(()=>{try{return localStorage.getItem(TUT_KEY)==='1'?'Tutorial (replay)':'▶ Tutorial: learn the basics (3 min)';}catch(e){return 'Tutorial';}})();
    t.title='A short guided battle against a passive enemy. Single-player only.';t.onclick=()=>{initAudio();startTutorial();};st.before(t);}}
try{socialMenu();}catch(e){console.warn('social menu',e);}
