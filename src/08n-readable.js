/* ================= READABILITY (queue "Readability", orch/polishP2): text size + colour-blind extras =================
   TEXT SIZE (Settings: 100 / 115 / 130 %): one switch, SET.ts. Every text surface that is ordinary page content is listed in
   TS_ROOTS and is laid out a little smaller and shown enlarged by the same factor (CSS zoom), so each panel keeps its own
   layout and simply gets bigger: the command bar, battle log / hints, every menu and overlay card and the keyboard window. A panel that would then reach past the screen edge is
   capped to the screen and scrolls inside (tsFit) - nothing is cut off at 1366x768 or 1920x1080 (orch/polishtest.mjs sect. 4).
   The 3D picture and the labels painted over the battlefield are not page content and stay as they are.
   A NEW PANEL that is appended to the page body gets its root added to TS_ROOTS.
   COLOUR-BLIND MODE lives in 08b-identity.js (safe palette, shapes on the minimap and selection rings); this file adds the
   same team shape to the town / tower name plates and the allies list, so team identity never rests on colour alone. */
const TS_STEPS=[1,1.15,1.3];
const TS_ROOTS=['#side','#log','#hint','#mode','#wxchip','#net','#allyBox','#sbx','.overlay>.card','#mx','#campScreen>div','#kbWin .kbcard'];
const TS_FIT='#kbWin .kbcard';
function tsVal(){const v=+(typeof SET!=='undefined'&&SET.ts);return TS_STEPS.includes(v)?v:1;}
function tsCss(){if(document.getElementById('tsCss'))return;const s=document.createElement('style');s.id='tsCss';
  s.textContent='html.ts-on :is('+TS_ROOTS.join(',')+'){zoom:var(--ts,1)}html.ts-on .overlay{padding-block:8px}';document.head.appendChild(s);}
/* keep every enlarged floating panel inside the window: cap its height / width to the room it has, scroll inside */
function tsFit(){const z=tsVal();for(const el of document.querySelectorAll(TS_FIT)){if(el.dataset.tsfit){el.style.maxHeight=el.dataset.tsmh||'';el.style.maxWidth=el.dataset.tsmw||'';delete el.dataset.tsfit;}
    if(z<=1||!el.getClientRects().length)continue;const r=el.getBoundingClientRect(),H=innerHeight,W=innerWidth;if(r.bottom<=H-4&&r.right<=W-4&&r.left>=0)continue;
    el.dataset.tsfit='1';el.dataset.tsmh=el.style.maxHeight||'';el.dataset.tsmw=el.style.maxWidth||'';
    const cs=getComputedStyle(el),bb=cs.boxSizing==='border-box',px=k=>parseFloat(cs[k])||0,xh=bb?0:px('paddingTop')+px('paddingBottom')+px('borderTopWidth')+px('borderBottomWidth'),xw=bb?0:px('paddingLeft')+px('paddingRight')+px('borderLeftWidth')+px('borderRightWidth');
    if(r.bottom>H-4){el.style.maxHeight=Math.max(120,Math.floor((H-8-Math.max(0,r.top))/z-xh))+'px';if(cs.overflowY==='visible')el.style.overflowY='auto';}
    if(r.right>W-4||r.left<0)el.style.maxWidth=Math.max(200,Math.floor((W-12)/z-xw))+'px';}}
let TS_OBS=null,TS_WAS=1;
let TS_Q=0;function tsFitSoon(){if(TS_Q)return;TS_Q=requestAnimationFrame(()=>{TS_Q=0;try{tsFit();}catch(e){}});}
function tsApply(){tsCss();const z=tsVal(),h=document.documentElement;h.style.setProperty('--ts',String(z));h.classList.toggle('ts-on',z>1);
  /* the page is only watched for new panels while a bigger text size is on (at 100% there is nothing to fit) */
  if(z>1&&!TS_OBS){TS_OBS=new MutationObserver(tsFitSoon);TS_OBS.observe(document.body,{childList:true,subtree:true});}else if(z<=1&&TS_OBS){TS_OBS.disconnect();TS_OBS=null;}
  if(z>1||TS_WAS>1){try{dispatchEvent(new Event('resize'));}catch(e){}}TS_WAS=z;tsFitSoon();}
function tsSet(v){v=+v;SET.ts=TS_STEPS.includes(v)?v:1;try{saveSet();}catch(e){}tsApply();}
function tsInstall(){const body=document.getElementById('setBody');if(!body||document.getElementById('sTs'))return;
  const l=document.createElement('div');l.className='label';l.textContent='Text size (menus, panels and the command bar)';
  const sg=document.createElement('div');sg.className='seg';sg.id='sTs';sg.innerHTML=TS_STEPS.map(v=>'<button type="button" data-v="'+v+'">'+Math.round(v*100)+'%</button>').join('');
  const sync=()=>sg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===tsVal()));
  sg.querySelectorAll('button').forEach(b=>b.onclick=()=>{tsSet(b.dataset.v);sync();});sync();
  const cb=document.getElementById('sCb'),at=cb?cb.nextSibling:null;if(cb)cb.parentNode.insertBefore(l,at),cb.parentNode.insertBefore(sg,at);else body.append(l,sg);
  const cl=cb&&cb.previousElementSibling;if(cl&&/Colourblind/.test(cl.textContent))cl.textContent='Color-blind mode (safe team colors from the next battle; each team also gets its own shape on the minimap, selection rings, town name plates and the allies list)';}
try{tsInstall();tsApply();addEventListener('resize',tsFitSoon);}catch(e){console.warn('text size',e);}

/* ---------- colour-blind extras: the team's shape as text (allies list) ---------- */
const CB_GLYPH={40:'●',4:'■',3:'▲',6:'⬢',5:'⬟',10:'○',11:'⊕',12:'⊕'};
function cbGlyph(team){try{return SET.cb?(CB_GLYPH[idRingSeg(team)]||'●'):'';}catch(e){return '';}}
