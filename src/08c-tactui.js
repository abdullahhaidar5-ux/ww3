/* ---------- Tactics UI: dig in, sandbag lines / trenches, field repair, vehicle damage readout (Abdullah, 2026-11-04) ----------
   Hotkey I: infantry dig a foxhole; with a Construction Vehicle selected it starts a sandbag line instead (press again for a
   trench). A line is two clicks / taps: where it starts, where it ends. Right-click (or Esc) cancels. Buttons in the command bar
   (and a touch strip "Dig in" button) do the same, so everything works with touch alone. */
const CRIT_NAME={1:'Tracks / wheels knocked out - cannot move',2:'Turret jammed - slow to aim and fire',4:'Engine on fire - burning and slower'};
function critText(c){const a=[];for(const b of [1,2,4])if(c&b)a.push(CRIT_NAME[b]);return a.join(' · ');}
const LOWSET=new Set();   // ids this player ordered to fly low (button label only; the host holds the real state)
function tactOwn(){return G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);}
function tactBuilders(){return tactOwn().filter(u=>u.kind==='dozer'||digCan(u));}
function tactClr(){const ids=tactOwn().filter(u=>u.kind==='dozer').map(u=>u.id);if(!ids.length)return;doAct({t:'clr',ids});speak(1);sfxUI(500);pushLog('Clearing the nearest rubble.');}
function tactWall(k){const d=tactBuilders();if(!d.length)return;G.wallM=G.wallM===k?null:k;G.wallP=null;G.amove=false;G.defm=false;G.place=null;G.aim=null;sfxUI(560);updateUI();}
function tactKey(){const own=tactOwn();if(!own.length)return;const d=own.filter(u=>u.kind==='dozer');
  if(d.length&&!own.some(digCan))tactWall(G.wallM==='sand'?'trench':'sand');else tactDig();}
function tactDig(){const ids=tactOwn().filter(digCan).map(u=>u.id);if(!ids.length)return;doAct({t:'dig',ids});speak(1);sfxUI(500);}
function tactFix(){const ids=tactOwn().filter(u=>u.kind==='dozer').map(u=>u.id);if(!ids.length)return;doAct({t:'fix',ids});speak(1);sfxUI(500);}
function wallHintEl(){let h=document.getElementById('wallHint');if(!h){h=document.createElement('div');h.id='wallHint';h.style.cssText='position:fixed;z-index:8;left:50%;top:70px;transform:translateX(-50%);padding:7px 14px;border-radius:8px;background:rgba(24,32,28,.94);border:1px solid #d9b97a;color:#f0e3c4;font:600 14px system-ui,sans-serif;pointer-events:none;text-align:center';h.hidden=true;document.body.append(h);}return h;}
function tactRow(el,s){
  const h=wallHintEl();
  if(G.wallM&&!tactBuilders().length){G.wallM=null;G.wallP=null;}
  if(G.wallM){const k=G.wallM==='trench'?'Trench':'Sandbag line';h.hidden=false;h.textContent=(G.wallP?`${k}: ${TOUCHUI?'tap':'click'} where it ends (or drag)`:`${k}: drag a line, or ${TOUCHUI?'tap':'click'} where it starts`)+` · costs ${DUG[G.wallM].cost} per piece · ${TOUCHUI?'tap ✕':'right-click'} to cancel`;}else h.hidden=true;
  if(s.length===1&&!s[0].isB&&s[0].crit){const d=document.createElement('div');d.className='morale';d.innerHTML='<span class="ml" style="color:#ea8a5a">Damaged</span><span style="font-size:12px;opacity:.9">'+critText(s[0].crit)+'</span>';d.title='A Construction Vehicle (or the war factory yard) repairs these.';el.append(d);}
  const own=tactOwn(),inf=own.some(digCan),doz=own.filter(u=>u.kind==='dozer'),air=own.filter(u=>u.s.dom==='air'&&(u.s.cls==='heli'||u.s.cls==='jet'));if(!inf&&!doz.length&&!air.length)return;
  const r=document.createElement('div');r.className='cmdrow tact';const mk=(t,ti,fn,on)=>{const b=document.createElement('button');b.textContent=t;b.title=ti;b.onclick=fn;if(on)b.classList.add('on');r.append(b);return b;};
  if(inf)mk('⛏ Dig in (I)','Dig a foxhole where they stand: a few seconds, then they sit low in it and take about half damage. They climb out when you give a move order.',tactDig);
  if(doz.length||inf){mk('▤ Sandbags'+(doz.length?' (I)':''),`Lay a sandbag line: ${TOUCHUI?'tap':'click'} its start, then its end. ${DUG.sand.cost} supplies a piece. Cover for infantry, slows vehicles.`,()=>tactWall('sand'),G.wallM==='sand');
    mk('▭ Trench','Dig a trench line: drag it out, or click its start then its end; a new line that starts at the end of a trench joins it into a network. '+DUG.trench.cost+' supplies a piece. Best cover, slows vehicles.',()=>tactWall('trench'),G.wallM==='trench');
    if(doz.length){if(G.rubN)mk('🧹 Clear rubble','Clear the nearest fallen building so tanks can pass again (idle Construction Vehicles do it on their own).',tactClr);
    mk('🔧 Fix vehicles','Repair knocked-out tracks, jammed turrets and engine fires on nearby vehicles (idle Construction Vehicles do it on their own).',tactFix);}}
  if(air.length){const lowNow=air.some(u=>LOWSET.has(u.id));mk(lowNow?'⬆ Fly high':'⬇ Fly low','Nap of the earth: low flyers cannot be locked by long-range SAM sites, but guns and shoulder-fired AA hurt them 35% more. Aircraft also pop flares / chaff on their own against SAM missiles (4 charges, refilled when landed).',()=>{const v=lowNow?0:1;for(const u of air){if(v)LOWSET.add(u.id);else LOWSET.delete(u.id);}doAct({t:'low',ids:air.map(u=>u.id),v});sfxUI(520);updateUI();},lowNow);}
  const off=el.querySelector('.cmdrow.off');if(off)off.style.display='none';el.append(r);}
(function(){const st=document.createElement('style');st.textContent='#info .cmdrow.tact{bottom:calc(var(--barh,170px) + 54px)}@media (max-width:900px){#info .cmdrow.tact{bottom:calc(var(--barh,200px) + 58px)}}';document.head.append(st);})();
// two-click line placement: captured before the normal pointer handlers so it works with mouse and touch
function wallPointer(e){if(!G||G.over||!G.wallM)return;e.stopImmediatePropagation();e.preventDefault();
  if(e.button===2){G.wallM=null;G.wallP=null;updateUI();return;}
  mpos(e);const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(!G.wallP){G.wallP={x:w.x,y:w.y};G.wallDn={sx:mouse.x,sy:mouse.y};mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});sfxUI(560);updateUI();return;}
  const p=G.wallP,ids=tactBuilders().map(u=>u.id);doAct({t:'wall',ids,k:G.wallM,x:p.x,y:p.y,x2:w.x,y2:w.y});speak(1);mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});
  G.wallM=null;G.wallP=null;updateUI();}
cv.addEventListener('pointerdown',wallPointer,true);
// drag a line: press where it starts, release where it ends (a short press keeps the two-click way working)
window.addEventListener('pointerup',e=>{if(!G||G.over||!G.wallM||!G.wallP||!G.wallDn||e.button===2)return;mpos(e);const dx=mouse.x-G.wallDn.sx,dy=mouse.y-G.wallDn.sy;G.wallDn=null;if(dx*dx+dy*dy<26*26)return;
  const w=screenToWorld(mouse.x,mouse.y);if(!w)return;const p=G.wallP,ids=tactBuilders().map(u=>u.id);doAct({t:'wall',ids,k:G.wallM,x:p.x,y:p.y,x2:w.x,y2:w.y});speak(1);mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});G.wallM=null;G.wallP=null;updateUI();},true);
cv.addEventListener('contextmenu',e=>{if(G&&G.wallM){e.preventDefault();}});
