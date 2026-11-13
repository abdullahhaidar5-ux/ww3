/* ---------- Performance log (Settings → Graphics → "Performance log…") ----------
   No test machine has the player's graphics card, so the game keeps its own notes: every frame of a battle that takes
   longer than 250 ms is written down with what was going on - battle time, frame length, how many shader programs /
   textures / shapes the graphics card held before → after, the detail level, the last effect events (strike, boom,
   die...) and the graphics card's name. The last 30 are kept in memory only (nothing is saved or sent anywhere); the
   window shows them with a Copy button so they can be pasted into a message. View only: it reads counters three.js
   already keeps, once per frame, and touches nothing in the simulation. */
const PERF={log:[],max:30,slow:250,ev:[],evI:0,evN:16,prev:0,c1:null,c0:null,G:null,since:0,gpu:null,hid:0};
// the handful of effects that matter for a hitch are noted in a small ring (type + time); frequent ones (muzzle flashes, tracers) are not
function perfEv(k){const E=PERF.ev,i=PERF.evI++%PERF.evN,o=E[i]||(E[i]={k:'',t:0});o.k=k;o.t=performance.now();}
for(const k of ['strike','bmis','boom','die','plane','icpt','civd','gone','emp','cyb','smoke','flag']){const f=typeof FXH!=='undefined'&&FXH[k];if(!f)continue;FXH[k]=function(){perfEv(k);return f.apply(this,arguments);};}
function perfGpu(){if(PERF.gpu)return PERF.gpu;let n='unknown';try{const gl=R3.getContext(),x=gl.getExtension('WEBGL_debug_renderer_info');n=String((x&&gl.getParameter(x.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER)||'unknown');}catch(e){}return PERF.gpu=n;}
function perfCount(){const i=R3.info;return [i.programs?i.programs.length:0,i.memory.textures,i.memory.geometries,QUAL.lv,QUAL.fx||0];}
// called once at the start of every drawn battle frame (see the renderFrame wrapper below)
function perfTick(){const now=performance.now(),c=perfCount();
  if(PERF.G!==G){PERF.G=G;PERF.since=now;PERF.prev=0;}                                   // a new battle: its first seconds (loading work) are not hitches
  const gap=PERF.prev?now-PERF.prev:0;
  if(gap>PERF.slow&&gap<15000&&!PERF.hid&&now-PERF.since>3000&&!G.paused&&!window.LOADING){
    const a=PERF.c0||PERF.c1||c,ev=[];for(const e of PERF.ev)if(e&&now-e.t<gap+1500)ev.push([e.t,e.k]);ev.sort((x,y)=>x[0]-y[0]);
    const m={};for(const e of ev)m[e[1]]=(m[e[1]]||0)+1;
    PERF.log.push({t:G.t,ms:Math.round(gap),p:[a[0],c[0]],x:[a[1],c[1]],g:[a[2],c[2]],q:[a[3]+'/'+a[4],c[3]+'/'+c[4]],ev:Object.keys(m).map(k=>k+(m[k]>1?'×'+m[k]:'')).join(' ')||'-',u:G.ents?G.ents.length:0,mode:typeof MODE!=='undefined'?MODE:''});
    if(PERF.log.length>PERF.max)PERF.log.shift();perfGpu();}
  PERF.hid=0;PERF.prev=now;PERF.c0=PERF.c1;PERF.c1=c;}
try{document.addEventListener('visibilitychange',()=>{PERF.hid=1;});}catch(e){}             // a frame that spans a tab switch is not a hitch
{const _rf=renderFrame;renderFrame=function(dt){try{if(G&&G.terrain&&R3&&!window.GLLOST)perfTick();}catch(e){}return _rf.apply(this,arguments);};}
// loading: browser "long tasks" (over 50 ms, the pieces that make a tab feel stuck) seen while the loading screen is up
PERF.lt=[];try{new PerformanceObserver(l=>{if(!window.LOADING)return;for(const e of l.getEntries())PERF.lt.push([Math.round(e.startTime),Math.round(e.duration)]);if(PERF.lt.length>400)PERF.lt.splice(0,200);}).observe({entryTypes:['longtask']});}catch(e){}
function perfLoad(){const t=LOAD.times;if(!t||!t.length)return '';const W=LOAD.warm,w=LOAD.wt,lt=w&&w[1]?PERF.lt.filter(x=>x[0]>=w[0]-50&&x[0]<=w[1]).map(x=>x[1]):[];
  return 'Last battle load (ms per stage): '+t.map(x=>x[0].replace('…','')+' '+x[1]).join(', ')+'\n'+(W?'Shader warm-up: '+W.ms+' ms, '+W.models+' models, '+W.progs+' programs compiled, '+W.steps+' steps (longest '+W.maxStep+' ms)'+(W.stage.length?' ['+W.stage.map(x=>x[0]+' '+x[1]).join(', ')+']':'')+(W.late?', finished after the loading watchdog':'')+'\n'+(lt.length?'Long tasks while preparing graphics: '+lt.length+', longest '+Math.max(...lt)+' ms\n':'No long task while preparing graphics.\n'):'')+'\n';}
function perfClock(t){t=Math.max(0,t|0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function perfLine(e){return perfClock(e.t)+'  '+e.ms+' ms  programs '+e.p[0]+'→'+e.p[1]+'  textures '+e.x[0]+'→'+e.x[1]+'  shapes '+e.g[0]+'→'+e.g[1]+'  detail '+e.q[0]+'→'+e.q[1]+'  units '+e.u+'  events: '+e.ev;}
function perfText(){let v='';try{v=typeof BUILD!=='undefined'?' build '+BUILD:'';}catch(e){}
  return 'World War 3 performance log'+v+'\nGraphics card: '+perfGpu()+'\nScreen: '+Math.round(innerWidth)+'×'+Math.round(innerHeight)+' @'+(window.devicePixelRatio||1)+'  '+Math.round(QUAL.fps||0)+' FPS now\n'+perfLoad()+
    (PERF.log.length?'Frames over '+PERF.slow+' ms (battle time, length, before→after):\n'+PERF.log.map(perfLine).join('\n'):'No frame over '+PERF.slow+' ms recorded in this session.');}
function perfCss(){if(document.getElementById('pfCss'))return;const s=document.createElement('style');s.id='pfCss';s.textContent=`
#pfWin{position:fixed;inset:0;z-index:960;background:rgba(8,11,10,.84);display:flex;align-items:center;justify-content:center}
#pfWin .pfcard{width:min(860px,94vw);max-height:88vh;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(24,31,27,.98),rgba(14,19,17,.98));border:1px solid #3d4d44;border-top:2px solid var(--accent,#e3b341);border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:var(--fg,#e8eadf)}
#pfWin .pfhd{display:flex;align-items:center;gap:12px;padding:14px 18px 10px;border-bottom:1px solid #2c3830}#pfWin .pfhd h1{margin:0;font-size:20px;letter-spacing:.06em;flex:1}
#pfWin .pfx{background:none;border:0;color:inherit;font-size:20px;line-height:1;cursor:pointer;opacity:.7;padding:4px 8px}#pfWin .pfx:hover{opacity:1}
#pfWin .pfinfo{padding:10px 18px 0;font-size:14px;line-height:1.45;opacity:.9}
#pfWin pre{margin:10px 18px;padding:10px 12px;overflow:auto;flex:1 1 auto;min-height:90px;background:rgba(0,0,0,.35);border:1px solid #2c3830;border-radius:6px;font:13px/1.5 var(--mono,ui-monospace,monospace);white-space:pre;user-select:text;-webkit-user-select:text}
#pfWin .pfft{display:flex;align-items:center;gap:10px;padding:10px 18px 14px;border-top:1px solid #2c3830}#pfWin .pfft small{flex:1;opacity:.7;font-size:13px}
#pfWin .pfb{padding:6px 14px;border-radius:5px;border:1px solid #55664f;background:rgba(255,255,255,.06);color:inherit;font-size:14px;cursor:pointer}#pfWin .pfb:hover{border-color:var(--accent,#e3b341)}`;document.head.appendChild(s);}
function perfOpen(){perfCss();perfClose(true);const w=document.createElement('div');w.id='pfWin';
  w.innerHTML='<div class="pfcard" role="dialog" aria-label="Performance log"><div class="pfhd"><h1>PERFORMANCE LOG</h1><button type="button" class="pfx" id="pfX" title="Close (Esc)">✕</button></div>'+
    '<div class="pfinfo">Every battle frame longer than a quarter of a second is noted here with what was happening. If the game froze, press Copy and paste the text to the developers.</div><pre id="pfTxt"></pre>'+
    '<div class="pfft"><small id="pfMsg">Kept in memory only - nothing is saved or sent.</small><button type="button" class="pfb" id="pfCopy">Copy</button><button type="button" class="pfb" id="pfClear">Clear</button><button type="button" class="pfb" id="pfBack">‹ Back</button></div></div>';
  document.body.appendChild(w);const tx=w.querySelector('#pfTxt'),msg=w.querySelector('#pfMsg');tx.textContent=perfText();
  w.querySelector('#pfX').onclick=()=>perfClose();w.querySelector('#pfBack').onclick=()=>perfClose();
  w.querySelector('#pfClear').onclick=()=>{PERF.log.length=0;tx.textContent=perfText();msg.textContent='Cleared.';};
  w.querySelector('#pfCopy').onclick=()=>{const t=perfText(),ok=()=>{msg.textContent='Copied - paste it into a message.';},no=()=>{try{const r=document.createRange();r.selectNodeContents(tx);const s=getSelection();s.removeAllRanges();s.addRange(r);if(document.execCommand('copy'))return ok();}catch(e){}msg.textContent='Could not copy by itself: the text is selected, press Ctrl+C.';};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,no);return;}}catch(e){}no();};
  w.addEventListener('pointerdown',e=>{if(e.target===w)perfClose();});
  const st=document.getElementById('settings');PERF.back=!!(st&&!st.hidden);if(PERF.back)st.hidden=true;
  try{if(typeof KB!=='undefined'){KB.win=true;KB.onKey=e=>{if(e.key==='Escape')perfClose();};}}catch(e){}}
function perfClose(quiet){const w=document.getElementById('pfWin');if(!w)return;w.remove();try{if(typeof KB!=='undefined'){KB.win=false;KB.onKey=null;}}catch(e){}
  if(!quiet&&PERF.back){PERF.back=false;try{openSettings();}catch(e){}}}
// one small text button in Settings → Graphics (the label names frame-rate, which the tab sorter files under Graphics)
function perfInstall(){const body=document.getElementById('setBody');if(!body||document.getElementById('sPerf'))return;
  const l=document.createElement('div');l.className='label';l.id='sPerfL';l.textContent='Frame-rate hitches';const r=document.createElement('div');r.id='sPerfRow';
  const b=document.createElement('button');b.type='button';b.id='sPerf';b.className='big ghost';b.style.cssText='font-size:15px;padding:7px 16px';b.textContent='Performance log…';b.title='See which frames froze and why, and copy the list';b.onclick=()=>perfOpen();
  r.appendChild(b);const done=document.getElementById('sDone');const at=done&&done.parentNode===body?done:null;if(at){body.insertBefore(l,at);body.insertBefore(r,at);}else body.append(l,r);}
try{perfInstall();}catch(e){console.warn('performance log',e);}
