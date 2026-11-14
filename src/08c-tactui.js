/* ---------- Tactics UI: dig in, sandbag lines / trenches, field repair, vehicle damage readout (Abdullah, 2026-11-04) ----------
   Hotkey I: infantry dig a dugout and go inside it (vehicles never dig in) (like garrisoning a building; select the dugout + right-click ground to bring them out); with only Construction Vehicles selected it starts a fortification line. A line is traced: press and drag along the path you want (curves and corners), release to order it; or click where it
   starts, then where it ends. Right-click (or Esc) cancels. Infantry never build lines, they only dig in. */
const CRIT_NAME={1:'Tracks / wheels knocked out - cannot move',2:'Turret jammed - slow to aim and fire',4:'Engine on fire - burning and slower'};
function critText(c){const a=[];for(const b of [1,2,4])if(c&b)a.push(CRIT_NAME[b]);return a.join(' · ');}
const LOWSET=new Set();   // ids this player ordered to fly low (button label only; the host holds the real state)
function tactOwn(){return G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);}
function tactBuilders(){return tactOwn().filter(u=>u.kind==='dozer');}   /* only a Construction Vehicle builds a fortification line; everyone else just digs in */
function tactClr(){const ids=tactOwn().filter(u=>u.kind==='dozer').map(u=>u.id);if(!ids.length)return;doAct({t:'clr',ids});speak(1);sfxUI(500);pushLog('Clearing the nearest rubble.');}
function tactWall(k){const d=tactBuilders();if(!d.length)return;G.wallM=G.wallM===k?null:k;G.wallP=null;G.amove=false;G.defm=false;G.place=null;G.aim=null;sfxUI(560);updateUI();}
function tactKey(){const own=tactOwn();if(!own.length)return;const d=own.filter(u=>u.kind==='dozer');
  if(d.length&&!own.some(digCan))tactWall('trench');else tactDig();}
function tactDig(){const ids=tactOwn().filter(digCan).map(u=>u.id);if(!ids.length)return;doAct({t:'dig',ids});speak(1);sfxUI(500);}
function tactFix(){const ids=tactOwn().filter(u=>u.kind==='dozer').map(u=>u.id);if(!ids.length)return;doAct({t:'fix',ids});speak(1);sfxUI(500);}
function wallHintEl(){let h=document.getElementById('wallHint');if(!h){h=document.createElement('div');h.id='wallHint';h.style.cssText='position:fixed;z-index:8;left:50%;top:70px;transform:translateX(-50%);padding:7px 14px;border-radius:8px;background:rgba(24,32,28,.94);border:1px solid #d9b97a;color:#f0e3c4;font:600 14px system-ui,sans-serif;pointer-events:none;text-align:center';h.hidden=true;document.body.append(h);}return h;}
function tactRow(el,s){
  const h=wallHintEl();
  if(G.wallM&&!tactBuilders().length){G.wallM=null;G.wallP=null;}
  if(G.wallM){const k='Fortification line';h.hidden=false;h.textContent=(G.wallDn?`${k}: keep dragging along the path, release to build`:G.wallP?`${k}: ${TOUCHUI?'tap':'click'} where it ends`:`${k}: drag to trace a line, or ${TOUCHUI?'tap':'click'} where it starts`)+` · costs ${DUG[G.wallM].cost} per piece · ${TOUCHUI?'tap ✕':'right-click'} to cancel`;}else h.hidden=true;
  if(s.length===1&&!s[0].isB&&s[0].crit){const d=document.createElement('div');d.className='morale';d.innerHTML='<span class="ml" style="color:#ea8a5a">Damaged</span><span style="font-size:12px;opacity:.9">'+critText(s[0].crit)+'</span>';d.title='A Construction Vehicle (or the War Factory yard) repairs these.';el.append(d);}
  const own=tactOwn(),inf=own.some(digCan),doz=own.filter(u=>u.kind==='dozer'),air=own.filter(u=>u.s.dom==='air'&&(u.s.cls==='heli'||u.s.cls==='jet'));if(!inf&&!doz.length&&!air.length)return;
  const r=document.createElement('div');r.className='cmdrow tact';const mk=(t,ti,fn,on)=>{const b=document.createElement('button');b.textContent=t;b.title=ti;b.onclick=fn;if(on)b.classList.add('on');r.append(b);return b;};
  if(inf)mk('⛏ Dig in (I)','Dig a dugout where they stand and go inside, like garrisoning a building: a few seconds, then they are under strong cover and fire from inside. They stay until you select the dugout and right-click the ground (or right-click it with more infantry to add them).',tactDig);
  if(doz.length){mk('⛏ Fortification line'+(inf?'':' (I)'),'Build a fortification line (Construction Vehicles only): press and drag along the path you want, curves and corners included, or click its start then its end. A trench with a sandbag parapet; a new line that starts at the end of another joins it into a network. '+DUG.trench.cost+' supplies a piece. Best cover, slows vehicles.',()=>tactWall('trench'),G.wallM==='trench');
    {if(G.rubN)mk('🧹 Clear rubble','Clear the nearest fallen building so tanks can pass again (idle Construction Vehicles do it on their own).',tactClr);
    mk('🔧 Fix vehicles','Repair knocked-out tracks, jammed turrets and engine fires on nearby vehicles (idle Construction Vehicles do it on their own).',tactFix);}}
  if(air.length){const lowNow=air.some(u=>LOWSET.has(u.id));mk(lowNow?'⬆ Fly high':'⬇ Fly low','Nap of the earth: low flyers cannot be locked by long-range SAM sites, but guns and shoulder-fired AA hurt them 35% more. Aircraft also pop flares / chaff on their own against SAM missiles (4 charges, refilled when landed).',()=>{const v=lowNow?0:1;for(const u of air){if(v)LOWSET.add(u.id);else LOWSET.delete(u.id);}doAct({t:'low',ids:air.map(u=>u.id),v});sfxUI(520);updateUI();},lowNow);}
  const off=el.querySelector('.cmdrow.off');if(off)off.style.display='none';el.append(r);}
/* the dig-in / fortification row sits in the one order dock (ordDock in 08-ui), no position of its own */
// trace a line: press where it starts and drag along the path, release to order it (a short press keeps the two-click way working)
const WALL_STEP=12,WALL_MAXPTS=24;
function wallSimplify(P,tol){if(P.length<=4)return P;const n=P.length/2,keep=new Array(n).fill(false);keep[0]=keep[n-1]=true;
  const st=[[0,n-1]];while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const ax=P[a*2],ay=P[a*2+1],bx=P[b*2],by=P[b*2+1],L=Math.hypot(bx-ax,by-ay)||1;
    for(let i=a+1;i<b;i++){const d=Math.abs((bx-ax)*(ay-P[i*2+1])-(ax-P[i*2])*(by-ay))/L;if(d>md){md=d;mi=i;}}
    if(mi>=0&&md>tol){keep[mi]=true;st.push([a,mi],[mi,b]);}}
  const o=[];for(let i=0;i<n;i++)if(keep[i])o.push(P[i*2],P[i*2+1]);return o;}
// the points of the line being traced (world units), thinned to at most 24; end = the pointer
function wallPts(end){let P=G.wallTr&&G.wallTr.length?G.wallTr.slice():G.wallP?[G.wallP.x,G.wallP.y]:null;if(!P)return null;if(end&&Math.hypot(end.x-P[P.length-2],end.y-P[P.length-1])>=2)P.push(end.x,end.y);
  if(P.length<4)return null;let tol=5;P=wallSimplify(P,tol);while(P.length>WALL_MAXPTS*2&&tol<400){tol*=1.6;P=wallSimplify(P,tol);}
  if(P.length>WALL_MAXPTS*2){const q=[];for(let i=0;i<WALL_MAXPTS;i++){const j=Math.round(i*(P.length/2-1)/(WALL_MAXPTS-1));q.push(P[j*2],P[j*2+1]);}P=q;}
  return P.map(v=>Math.round(v*10)/10);}
function wallSend(end){const P=wallPts(end),ids=tactBuilders().map(u=>u.id);if(P&&ids.length){doAct({t:'wall',ids,k:G.wallM,pts:P});speak(1);mark({x:P[P.length-2],y:P[P.length-1],r:14,t:0,d:.7,c:0xd9b97a});}
  G.wallM=null;G.wallP=null;G.wallTr=null;G.wallDn=null;updateUI();}
function wallPointer(e){if(!G||G.over||!G.wallM)return;e.stopImmediatePropagation();e.preventDefault();
  if(e.button===2){G.wallM=null;G.wallP=null;G.wallTr=null;G.wallDn=null;updateUI();return;}
  mpos(e);const w=screenToWorld(mouse.x,mouse.y);if(!w)return;
  if(!G.wallP){G.wallP={x:w.x,y:w.y};G.wallTr=[w.x,w.y];G.wallDn={sx:mouse.x,sy:mouse.y};mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});sfxUI(560);updateUI();return;}
  G.wallTr=null;wallSend(w);}
cv.addEventListener('pointerdown',wallPointer,true);
window.addEventListener('pointermove',e=>{if(!G||G.over||!G.wallM||!G.wallDn||!G.wallTr)return;mpos(e);const w=screenToWorld(mouse.x,mouse.y);if(!w)return;const T=G.wallTr;if(Math.hypot(w.x-T[T.length-2],w.y-T[T.length-1])>=WALL_STEP&&T.length<2000)T.push(w.x,w.y);},true);
window.addEventListener('pointerup',e=>{if(!G||G.over||!G.wallM||!G.wallP||!G.wallDn||e.button===2)return;mpos(e);const dx=mouse.x-G.wallDn.sx,dy=mouse.y-G.wallDn.sy;G.wallDn=null;if(dx*dx+dy*dy<26*26){G.wallTr=null;return;}
  const w=screenToWorld(mouse.x,mouse.y);if(!w){G.wallTr=null;return;}wallSend(w);},true);
cv.addEventListener('contextmenu',e=>{if(G&&G.wallM){e.preventDefault();}});
// live preview while tracing: the path, the pieces it will become and the total supply cost (drawn on the HUD canvas)
function wallPreview(c){if(!G||!G.wallM||!G.wallP)return;const w=screenToWorld(mouse.x,mouse.y);const P=wallPts(w);if(!P)return;
  const pl=wallPlan(G.wallM,P),cost=pl.length*DUG[G.wallM].cost,T=G.teams[ME],ok=T.credits>=cost,col=ok?'rgba(217,185,122,.95)':'rgba(234,90,64,.95)',sc=(x,y)=>toScreen(x,groundH(x,y)+2,y);
  c.save();c.textAlign='left';c.lineWidth=3;c.strokeStyle=col;c.lineJoin='round';c.beginPath();for(let i=0;i<P.length;i+=2){const p=sc(P[i],P[i+1]);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.stroke();
  c.fillStyle=col;for(const q of pl){const p=sc(q.x,q.y),dx=Math.cos(q.a)*14,dy=Math.sin(q.a)*14,a=sc(q.x-dx,q.y-dy),b=sc(q.x+dx,q.y+dy);c.lineWidth=7;c.strokeStyle='rgba(60,45,25,.85)';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.lineWidth=3;c.strokeStyle=col;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  const e=sc(P[P.length-2],P[P.length-1]);c.font='600 14px system-ui,sans-serif';c.fillStyle='rgba(24,32,28,.9)';const t=pl.length+' pieces · '+cost+' supplies'+(ok?'':' (not enough)');const tw=c.measureText(t).width;c.fillRect(e.x+12,e.y-28,tw+14,24);c.fillStyle=ok?'#f0e3c4':'#ff9a80';c.fillText(t,e.x+19,e.y-11);c.restore();}
