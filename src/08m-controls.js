/* ================= SETTINGS: KEYBOARD KEYS WINDOW + FIRST-LAUNCH GRAPHICS CHECK (queue "Settings", orch/polishP2) =================
   1. Settings -> Controls -> "Keyboard keys": one window that lists every row of the one key table (src/06z-keys.js KEYTAB),
      grouped; click a key, press a letter, done. A key in use, W A S D or anything but a letter / spare key is refused with a plain sentence.
      "Reset to defaults" puts every key back. Esc / Back / the X go one step back to Settings (UI flow rule).
   2. The first time the game is played on a PC, the first 3 seconds of the first battle are timed and the Graphics quality
      setting is chosen from it (once): a fast PC gets High, a slow one Low, the rest stay on Auto (the frame-rate governor
      QUAL in 06-view.js keeps working exactly as before - this only picks its starting preset). Never in automated tests. */
const KBUI={el:null,cap:null,msg:'',bad:false};
function kbuCss(){if(document.getElementById('kbuCss'))return;const s=document.createElement('style');s.id='kbuCss';s.textContent=`
#kbWin{position:fixed;inset:0;z-index:960;background:rgba(8,11,10,.84);display:flex;align-items:center;justify-content:center}
#kbWin .kbcard{position:relative;width:min(760px,94vw);max-height:90vh;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(24,31,27,.98),rgba(14,19,17,.98));border:1px solid #3d4d44;border-top:2px solid var(--accent,#e3b341);border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:var(--fg,#e8eadf)}
#kbWin .kbhd{display:flex;align-items:center;gap:12px;padding:14px 18px 10px;border-bottom:1px solid #2c3830}
#kbWin .kbhd h1{margin:0;font-size:20px;letter-spacing:.06em;flex:1}
#kbWin .kbx{background:none;border:0;color:inherit;font-size:20px;line-height:1;cursor:pointer;opacity:.7;padding:4px 8px}#kbWin .kbx:hover{opacity:1}
#kbWin .kbmsg{min-height:1.5em;padding:8px 18px 0;font-size:14px;color:#9fd36b}#kbWin .kbmsg.bad{color:#f0a08f}
#kbWin .kbbody{overflow:auto;padding:4px 18px 10px;columns:2;column-gap:28px}
#kbWin .kbgrp{break-inside:avoid;margin:10px 0 4px}
#kbWin .kbgrp h2{margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#e3b341);font-weight:600}
#kbWin .kbrow{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:14px;line-height:1.3;border-bottom:1px solid rgba(255,255,255,.05)}
#kbWin .kbrow span{flex:1;min-width:0}
#kbWin .kbk{flex:none;min-width:38px;padding:3px 9px;border-radius:5px;border:1px solid #55664f;background:rgba(255,255,255,.06);color:inherit;font:600 13px var(--mono,monospace);text-align:center;cursor:pointer}
#kbWin .kbk:hover{border-color:var(--accent,#e3b341)}#kbWin .kbk.cap{border-color:var(--accent,#e3b341);background:rgba(227,179,65,.18)}#kbWin .kbk.chg{color:var(--accent,#e3b341)}
#kbWin .kbfix{flex:none;font:500 12px var(--mono,monospace);opacity:.6;text-align:right;max-width:46%}
#kbWin .kbft{display:flex;align-items:center;gap:10px;padding:10px 18px 14px;border-top:1px solid #2c3830}
#kbWin .kbft small{flex:1;opacity:.6;font-size:12px;line-height:1.35}
#kbWin .kbb{padding:6px 14px;border-radius:5px;border:1px solid #55664f;background:transparent;color:inherit;font-size:14px;cursor:pointer}#kbWin .kbb:hover{border-color:var(--accent,#e3b341)}
#kbWin .kbb[disabled]{opacity:.4;cursor:default}
@media (max-width:760px){#kbWin .kbbody{columns:1}}`;document.head.appendChild(s);}
function kbuMsg(t,bad){KBUI.msg=t||'';KBUI.bad=!!bad;const m=KBUI.el&&KBUI.el.querySelector('.kbmsg');if(m){m.textContent=KBUI.msg;m.classList.toggle('bad',KBUI.bad);}}
function kbuPaint(){const w=KBUI.el;if(!w)return;const body=w.querySelector('.kbbody');body.textContent='';let grp=null,box=null;
  for(const r of KEYTAB){if(r.grp!==grp){grp=r.grp;box=document.createElement('div');box.className='kbgrp';const h=document.createElement('h2');h.textContent=grp;box.appendChild(h);body.appendChild(box);}
    const row=document.createElement('div');row.className='kbrow';const n=document.createElement('span');n.textContent=r.name;row.appendChild(n);
    if(r.def){const b=document.createElement('button');b.type='button';b.className='kbk'+(KBUI.cap===r.id?' cap':'')+(KB.cur[r.id]!==r.def?' chg':'');b.dataset.id=r.id;b.textContent=KBUI.cap===r.id?'…':kbKey(r.id);
      b.title=KB.cur[r.id]!==r.def?'Standard key: '+kbShow(r.def):'Click, then press the letter you want';b.onclick=()=>{KBUI.cap=KBUI.cap===r.id?null:r.id;kbuMsg(KBUI.cap?'Press the letter for "'+r.name.replace(/ \(.*$/,'')+'" (Esc to keep '+kbKey(r.id)+').':'');kbuPaint();};row.appendChild(b);}
    else{const f=document.createElement('div');f.className='kbfix';f.textContent=r.fix;f.title='This key is fixed';row.appendChild(f);}
    box.appendChild(row);}
  const rs=w.querySelector('#kbReset');if(rs)rs.disabled=!kbChanged();}
function kbuKey(e){const k=e.key;
  if(k==='Escape'){if(KBUI.cap){KBUI.cap=null;kbuMsg('');kbuPaint();}else kbuClose();return;}
  if(!KBUI.cap)return;if(k==='Shift'||k==='Control'||k==='Alt'||k==='Meta')return;
  const id=KBUI.cap,r=KEYTAB.find(x=>x.id===id),err=(e.ctrlKey||e.metaKey||e.altKey)?'Press one key on its own, without Ctrl or Alt.':kbSet(id,kbPhys(e));
  if(err){kbuMsg(err,true);return;}
  KBUI.cap=null;kbuMsg('"'+r.name.replace(/ \(.*$/,'')+'" is now '+kbKey(id)+'.');kbuPaint();}
function kbuOpen(){kbuCss();kbuClose(true);const w=document.createElement('div');w.id='kbWin';
  w.innerHTML='<div class="kbcard" role="dialog" aria-label="Keyboard keys"><div class="kbhd"><h1>KEYBOARD KEYS</h1><button type="button" class="kbx" id="kbX" title="Close (Esc)">✕</button></div><div class="kbmsg"></div><div class="kbbody"></div>'+
    '<div class="kbft"><small>Click a key, then press the letter you want (spare keys: '+KB_SPARE+'). W A S D always scroll the camera. Buttons and tips in the game keep showing the standard letter.</small><button type="button" class="kbb" id="kbReset">Reset to defaults</button><button type="button" class="kbb" id="kbBack">‹ Back</button></div></div>';
  document.body.appendChild(w);KBUI.el=w;KBUI.cap=null;KBUI.msg='';
  w.querySelector('#kbX').onclick=()=>kbuClose();w.querySelector('#kbBack').onclick=()=>kbuClose();
  w.querySelector('#kbReset').onclick=()=>{kbReset();KBUI.cap=null;kbuMsg('Every key is back to its standard letter.');kbuPaint();};
  w.addEventListener('pointerdown',e=>{if(e.target===w)kbuClose();});
  KBUI.back=!!(document.getElementById('settings')&&!document.getElementById('settings').hidden);if(KBUI.back)document.getElementById('settings').hidden=true;
  KB.win=true;KB.onKey=kbuKey;kbuPaint();}
function kbuClose(quiet){const w=document.getElementById('kbWin');if(w)w.remove();KBUI.el=null;KBUI.cap=null;KB.win=false;KB.onKey=null;
  if(!quiet&&KBUI.back){KBUI.back=false;try{openSettings();}catch(e){}}}
function kbuInstall(){const body=document.getElementById('setBody');if(!body||document.getElementById('sKeys'))return;
  const l=document.createElement('div');l.className='label';l.textContent='Keyboard';const r=document.createElement('div');r.id='sKeysRow';
  const b=document.createElement('button');b.type='button';b.id='sKeys';b.className='big ghost';b.style.cssText='font-size:15px;padding:7px 16px';b.textContent='Keyboard keys…';b.title='See every key and choose your own letters';b.onclick=()=>kbuOpen();
  r.appendChild(b);const done=document.getElementById('sDone');const at=done&&done.parentNode===body?done:null;if(at){body.insertBefore(l,at);body.insertBefore(r,at);}else body.append(l,r);}
try{kbuInstall();}catch(e){console.warn('keys window',e);}

/* ---------- first-launch graphics check ---------- */
const BENCH={t:0,n:0,skip:1,done:false,res:null,secs:3};
/* a returning player (settings already stored) keeps what he has: only a brand-new install is measured */
try{if(typeof SET!=='undefined'&&SET.gfxB===undefined&&localStorage.getItem('ww3_settings')!==null)SET.gfxB=1;}catch(e){}
function benchWant(){return !BENCH.done&&typeof SET!=='undefined'&&SET.gfx==='auto'&&!SET.gfxB&&!(typeof GFX_PHONE!=='undefined'&&GFX_PHONE)&&(!navigator.webdriver||!!window.__bench);}
/* fps = frames per second measured at full quality; ref = what this screen can show (at most 60 counts) */
function benchPick(fps,lv,cost,hz){const ref=Math.min(60,hz||60);if(lv>0||fps<ref*.6)return 'low';if(fps>=ref*.95&&cost<.25/ref)return 'ultra';if(fps>=ref*.95&&cost<.5/ref)return 'high';return 'auto';}
function benchTick(dt){if(!benchWant())return;
  if(typeof G==='undefined'||!G||G.over||G.paused||G.rp||window.LOADING||document.hidden){BENCH.t=0;BENCH.n=0;BENCH.skip=1;return;}
  if(BENCH.skip>0){BENCH.skip-=dt;return;}BENCH.t+=dt;BENCH.n++;if(BENCH.t<BENCH.secs)return;
  const fps=BENCH.n/BENCH.t,pick=benchPick(fps,QUAL.lv,QUAL.cost,QUAL.hz);BENCH.done=true;BENCH.res={fps:Math.round(fps),pick};
  SET.gfx=pick;SET.gfxB=1;try{saveSet();}catch(e){}try{applyGfx();}catch(e){}try{if(typeof syncSettings==='function'&&!document.getElementById('settings').hidden)syncSettings();}catch(e){}
  try{pushLog('Graphics checked for this PC: '+({ultra:'Ultra',high:'High',low:'Low',auto:'Medium'}[pick])+'. Change it any time in Settings → Graphics.','g');}catch(e){}}
try{const _qt=qualTick;qualTick=function(dt){_qt(dt);try{benchTick(dt);}catch(e){}};}catch(e){}
/* choosing a quality by hand is final: the check never overrides the player */
try{const g=document.getElementById('sGfx');if(g)g.addEventListener('click',e=>{if(e.target&&e.target.tagName==='BUTTON'&&typeof SET!=='undefined'&&!SET.gfxB){SET.gfxB=1;BENCH.done=true;try{saveSet();}catch(_){}}});}catch(e){}
