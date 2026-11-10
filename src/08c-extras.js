/* ---------- 08c-extras: highlight clip (Save clip), Photo mode (P) and Voice commands (hold the mic / V) ----------
   UI and rendering only. Orders go through doAct() like every click, so multiplayer sync is untouched.
   Everything hides itself where the browser lacks the feature (MediaRecorder, canvas.captureStream, SpeechRecognition). */
const XS_CSS=`
#xsClip{display:none;align-items:center;justify-content:center;text-decoration:none}
#xsClip.on{display:inline-flex}
body.phOn #side{display:none!important}body.phOn #stage>*:not(#cv):not(#phOv),body.phOn #vcToast{visibility:hidden!important}
#phOv{position:fixed;z-index:85;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;overflow:hidden}
#phOv:active{cursor:grabbing}
#phOv .phv{position:absolute;inset:0;pointer-events:none}
#phOv .phd{position:absolute;left:0;right:0;pointer-events:none;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
#phOv .phd.t{top:0;height:30%;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)}
#phOv .phd.b{bottom:0;height:30%;-webkit-mask-image:linear-gradient(transparent,#000);mask-image:linear-gradient(transparent,#000)}
#phBar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:96%;padding:8px 10px;border-radius:10px;background:rgba(10,12,10,.72);border:1px solid rgba(255,255,255,.2);font:600 15px system-ui,sans-serif;color:#fff;cursor:default}
#phBar button,#phBar a{min-height:44px;min-width:44px;padding:0 14px;border-radius:7px;border:1px solid rgba(255,255,255,.4);background:rgba(30,34,28,.9);color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
#phBar button:hover,#phBar a:hover{background:rgba(70,78,62,.95)}#phBar button.on{background:#ffd27a;color:#17130a;border-color:#ffd27a}
#phBar .phl{min-width:150px}
#phHelp{position:absolute;left:14px;top:12px;color:#fff;font:500 13px/1.4 system-ui,sans-serif;text-shadow:0 1px 3px #000;opacity:.9;pointer-events:none}
#phPrev{position:absolute;right:14px;top:12px;width:min(240px,42%);padding:8px;border-radius:10px;background:rgba(10,12,10,.82);border:1px solid rgba(255,255,255,.25);display:none;flex-direction:column;gap:8px;cursor:default}
#phPrev.on{display:flex}#phPrev img{width:100%;border-radius:5px;display:block}#phPrev .r{display:flex;gap:8px}#phPrev .r>*{flex:1}
#phPrev button,#phPrev a{min-height:44px;border-radius:7px;border:1px solid rgba(255,255,255,.4);background:rgba(30,34,28,.9);color:#fff;font:600 15px system-ui,sans-serif;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}
#vcBtn{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}#vcBtn.live{background:#c8342a!important;color:#fff!important;border-color:#ffb3a8!important}
#vcToast{position:fixed;z-index:71;left:50%;top:22%;transform:translateX(-50%);max-width:88%;padding:10px 18px;border-radius:10px;background:rgba(10,12,10,.86);border:1px solid rgba(255,255,255,.3);color:#fff;font:600 20px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .25s}
#vcToast.on{opacity:1}#vcToast small{display:block;font:500 14px system-ui,sans-serif;opacity:.8;margin-top:2px}#vcToast.bad{border-color:#e8a34a}`;
(function(){const st=document.createElement('style');st.textContent=XS_CSS;document.head.append(st);})();
const xsTry=f=>{try{return f();}catch(e){}};
const xsShare=async(blob,name,title)=>{   // Share sheet where the browser has one for files, else a download
  const f=new File([blob],name,{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})&&navigator.share){try{await navigator.share({files:[f],title});return 'shared';}catch(e){if(e&&e.name==='AbortError')return 'cancel';}}
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);return 'saved';};

/* ===== 1. Highlight clip: the end-of-match BATTLE REPLAY is recorded as it plays; "Save clip" shares or downloads it ===== */
const CLIP={rec:null,chunks:[],blob:null,mime:'',tm:null,dst:null,G:null,t0:0};
function clipOK(){return typeof MediaRecorder!=='undefined'&&!!(cv.captureStream)&&!!window.File;}
function clipMime(){for(const m of ['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'])if(xsTry(()=>MediaRecorder.isTypeSupported(m)))return m;return '';}
function clipBtn(){let a=$('xsClip');if(a)return a;const row=$('again')&&$('again').parentNode;if(!row)return null;a=document.createElement('button');a.id='xsClip';a.type='button';a.className='big ghost';a.textContent='Save clip';row.insertBefore(a,$('change'));
  a.onclick=async()=>{if(!CLIP.blob)return;a.disabled=true;const ext=/mp4/.test(CLIP.blob.type)?'mp4':'webm';const r=await xsShare(CLIP.blob,`ww3-highlight.${ext}`,'World War 3 highlight');a.textContent=r==='shared'?'Shared ✓':r==='saved'?'Saved ✓':'Save clip';a.disabled=false;setTimeout(()=>{a.textContent='Save clip';},2500);};return a;}
function clipStart(){if(!clipOK()||CLIP.rec)return;CLIP.blob=null;CLIP.chunks=[];CLIP.G=G;const b=$('xsClip');if(b)b.classList.remove('on');
  try{const stream=cv.captureStream(30);
    if(AU&&AU.ctx&&AU.master){try{CLIP.dst=AU.ctx.createMediaStreamDestination();AU.master.connect(CLIP.dst);for(const t of CLIP.dst.stream.getAudioTracks())stream.addTrack(t);}catch(e){CLIP.dst=null;}}   // the replay's battle sound, if the audio engine is up
    const mime=clipMime(),opt={videoBitsPerSecond:4.5e6};if(mime)opt.mimeType=mime;let rec;try{rec=new MediaRecorder(stream,opt);}catch(e){rec=new MediaRecorder(stream);}
    CLIP.mime=rec.mimeType||mime||'video/mp4';rec.ondataavailable=e=>{if(e.data&&e.data.size)CLIP.chunks.push(e.data);};rec.onstop=clipDone;rec.onerror=()=>{};
    rec.start(500);CLIP.rec=rec;CLIP.t0=performance.now();CLIP.tm=setTimeout(clipStop,26000);   // up to three highlights, about 7-9 s each
  }catch(e){CLIP.rec=null;console.warn('clip',e);}}
function clipStop(){clearTimeout(CLIP.tm);const r=CLIP.rec;if(!r)return;CLIP.rec=null;if(CLIP.dst){xsTry(()=>AU.master.disconnect(CLIP.dst));CLIP.dst=null;}xsTry(()=>{if(r.state!=='inactive')r.stop();});}
function clipDone(){if(CLIP.G!==G||!CLIP.chunks.length||performance.now()-CLIP.t0<1500)return;CLIP.blob=new Blob(CLIP.chunks,{type:(CLIP.mime||'video/mp4').split(';')[0]});CLIP.chunks=[];const b=clipBtn();if(b){b.classList.add('on');b.textContent='Save clip';}}

/* ===== 2. Photo mode ===== */
const PH_LOOKS=[
  {n:'Natural',sat:1,con:1,bri:1,tint:null,vig:.22},
  {n:'Warm dusk',sat:1.18,con:1.1,bri:1.02,tint:[255,206,150],ta:.3,vig:.5},
  {n:'Cold steel',sat:.7,con:1.18,bri:1,tint:[170,200,240],ta:.3,vig:.55},
  {n:'Newsreel B&W',sat:0,con:1.3,bri:.96,tint:null,vig:.62},
  {n:'Faded film',sat:.72,con:.88,bri:1.1,tint:[255,238,205],ta:.3,vig:.4}];
window.PHX={on:false,look:0,dof:false,snap:null,st:null,ov:null,ptr:new Map(),k:{},blob:null,url:null};
function phRect(){const r=cv.getBoundingClientRect(),o=PHX.ov;if(!o)return;o.style.left=r.left+'px';o.style.top=r.top+'px';o.style.width=r.width+'px';o.style.height=r.height+'px';}
function phLook(){const L=PH_LOOKS[PHX.look],o=PHX.ov;if(!o)return;cv.style.filter=L.sat===1&&L.con===1&&L.bri===1?'':`saturate(${L.sat}) contrast(${L.con}) brightness(${L.bri})`;
  const t=o.querySelector('.phTint');t.style.background=L.tint?`rgb(${L.tint})`:'transparent';t.style.opacity=L.ta||0;
  o.querySelector('.phVig').style.background=`radial-gradient(ellipse at 50% 48%,transparent 42%,rgba(0,0,0,${L.vig}) 100%)`;
  for(const d of o.querySelectorAll('.phd'))d.style.display=PHX.dof?'block':'none';
  $('phLook').textContent='Look: '+L.n;$('phDof').classList.toggle('on',PHX.dof);}
function phEls(){if(PHX.ov)return;const o=document.createElement('div');o.id='phOv';o.hidden=true;
  o.innerHTML='<div class="phd t"></div><div class="phd b"></div><div class="phv phTint" style="mix-blend-mode:multiply"></div><div class="phv phVig"></div>'
   +'<div id="phHelp">Photo mode · drag: orbit · right-drag / WASD: move · wheel / pinch: zoom · Q E: turn</div>'
   +'<div id="phPrev"><img alt="Your picture"><div class="r"><button type="button" id="phShare">Share</button><a id="phDl" download="ww3-photo.png">Download</a></div></div>'
   +'<div id="phBar"><button type="button" id="phLook" class="phl"></button><button type="button" id="phDof">Focus blur</button><button type="button" id="phSave">📷 Take photo</button><button type="button" id="phExit">✕ Exit</button></div>';
  document.body.append(o);PHX.ov=o;
  $('phLook').onclick=()=>{PHX.look=(PHX.look+1)%PH_LOOKS.length;phLook();};$('phDof').onclick=()=>{PHX.dof=!PHX.dof;phLook();};$('phExit').onclick=()=>phExit();$('phSave').onclick=()=>{PHX.snap='take';};
  $('phShare').onclick=async()=>{if(PHX.blob){const r=await xsShare(PHX.blob,'ww3-photo.png','World War 3');if(r==='shared'||r==='saved')$('phShare').textContent='Done ✓';}};
  if(!(navigator.canShare&&navigator.share))$('phShare').style.display='none';
  for(const el of o.querySelectorAll('#phBar,#phPrev'))for(const t of ['pointerdown','pointermove','pointerup','wheel'])el.addEventListener(t,e=>e.stopPropagation());
  o.addEventListener('contextmenu',e=>e.preventDefault());
  o.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{o.setPointerCapture(e.pointerId);}catch(_){}PHX.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,t:e.pointerType});PHX.pd=null;});
  o.addEventListener('pointermove',e=>{const p=PHX.ptr.get(e.pointerId);if(!p)return;e.preventDefault();e.stopPropagation();const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(PHX.ptr.size>=2){   // two fingers: pinch to zoom, drag to move
      const ps=[...PHX.ptr.entries()],q=ps.find(([id])=>id!==e.pointerId)[1],d0=Math.hypot(p.x-q.x,p.y-q.y),d1=Math.hypot(e.clientX-q.x,e.clientY-q.y);
      if(d0>10)cam.dist=Math.max(40,Math.min(1600,cam.dist*d0/Math.max(10,d1)));phPan(-dx*.5,-dy*.5);}
    else if(p.t==='mouse'&&(p.b===2||p.b===1))phPan(-dx,-dy);
    else{cam.ryaw=(cam.ryaw||0)-dx*.006;cam.pitch=Math.max(.08,Math.min(1.5,cam.pitch+dy*.004));}
    p.x=e.clientX;p.y=e.clientY;});
  const up=e=>{PHX.ptr.delete(e.pointerId);e.stopPropagation();};o.addEventListener('pointerup',up);o.addEventListener('pointercancel',up);
  o.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();cam.dist=Math.max(40,Math.min(1600,cam.dist*Math.exp((e.deltaMode===1?e.deltaY*33:e.deltaY)*.0012)));},{passive:false});
  addEventListener('keydown',e=>{if(!PHX.on)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
    e.preventDefault();e.stopImmediatePropagation();if(k==='Escape'||(k==='p'&&!e.shiftKey)){phExit();return;}PHX.k[k]=true;},true);
  addEventListener('keyup',e=>{if(!PHX.on)return;const k=e.key.length===1?e.key.toLowerCase():e.key;PHX.k[k]=false;e.stopImmediatePropagation();},true);
  addEventListener('resize',()=>{if(PHX.on)phRect();});try{new ResizeObserver(()=>{if(PHX.on)phRect();}).observe(cv);}catch(e){}}
function phPan(dx,dy){const s=cam.dist/700,ry=cam.ryaw||0,c=Math.cos(ry),n=Math.sin(ry);cam.x+=(dx*c+dy*n)*s;cam.y+=(-dx*n+dy*c)*s;}
function phEnter(){if(!G||G.over||PHX.on||window.GLLOST||!R3||window.LOADING)return false;if(KC.on)return false;if($('menu')&&!$('menu').hidden)return false;
  phEls();const d=cam.dist,kz=Math.max(0,Math.min(1,(d-230)/370)),p0=Math.max(.34+kz*.44,Math.asin(Math.min(1,112/d))),p=Math.max(.22,Math.min(1.42,p0+(cam.tilt||0)));
  PHX.st={c:{x:cam.x,y:cam.y,dist:cam.dist,tilt:cam.tilt,tx:cam.tx,ty:cam.ty,td:cam.td,_xl:cam._xl,_yl:cam._yl,_dl:cam._dl},paused:G.paused,G,mp:MODE!=='single'};
  if(!PHX.st.mp){G.paused=true;xsTry(syncPause);}   // single player stops the battle; online only your own camera is freed
  xsTry(mlockOff);cam.free=true;cam.pitch=p;cam.ryaw=cam.yaw||0;cam.tilt=0;PHX.on=true;PHX.k={};PHX.ptr.clear();PHX.blob=null;
  document.body.classList.add('phOn');phRect();PHX.ov.hidden=false;$('phPrev').classList.remove('on');$('phShare').textContent='Share';phLook();return true;}
function phExit(){if(!PHX.on)return;const s=PHX.st;PHX.on=false;PHX.snap=null;document.body.classList.remove('phOn');cv.style.filter='';if(PHX.ov)PHX.ov.hidden=true;
  cam.free=false;cam.ryaw=0;if(s){Object.assign(cam,s.c);if(G===s.G&&!s.mp&&!s.paused){G.paused=false;xsTry(syncPause);last=performance.now();}}
  if(PHX.url){xsTry(()=>URL.revokeObjectURL(PHX.url));PHX.url=null;}PHX.blob=null;}
PHX.frame=function(dt){if(!G||G.over||(PHX.st&&PHX.st.G!==G)){phExit();return;}
  const k=PHX.k,sp=cam.dist*.9*dt*(k.Shift?2.5:1);let fx=0,fy=0;if(k.w||k.ArrowUp)fy-=1;if(k.s||k.ArrowDown)fy+=1;if(k.a||k.ArrowLeft)fx-=1;if(k.d||k.ArrowRight)fx+=1;
  if(fx||fy)phPan(fx*sp*.7,fy*sp*.7);if(k.q)cam.ryaw-=dt*.8;if(k.e)cam.ryaw+=dt*.8;
  cam.tx=cam.x;cam.ty=cam.y;cam.td=cam.dist;cam._xl=cam.x;cam._yl=cam.y;cam._dl=cam.dist;
  renderFrame(dt);if(PHX.snap){PHX.snap=null;xsTry(phCapture);}};
// bake the film look into the picture: grade, tint, vignette and a cheap tilt-shift blur (same recipe as the live preview)
function phCapture(){const L=PH_LOOKS[PHX.look],W=cv.width,H=cv.height,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(cv,0,0,W,H);
  if(L.sat!==1||L.con!==1||L.bri!==1){const im=x.getImageData(0,0,W,H),d=im.data,s=L.sat,cn=L.con,b=L.bri;
    for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],bl=d[i+2],y=.299*r+.587*g+.114*bl;let R=y+(r-y)*s,G_=y+(g-y)*s,B=y+(bl-y)*s;
      R=((R-127.5)*cn+127.5)*b;G_=((G_-127.5)*cn+127.5)*b;B=((B-127.5)*cn+127.5)*b;d[i]=R<0?0:R>255?255:R;d[i+1]=G_<0?0:G_>255?255:G_;d[i+2]=B<0?0:B>255?255:B;}
    x.putImageData(im,0,0);}
  if(PHX.dof){const t=document.createElement('canvas'),sw=Math.max(8,W>>3),sh=Math.max(8,H>>3);t.width=sw;t.height=sh;const tx=t.getContext('2d');tx.imageSmoothingQuality='high';tx.drawImage(c,0,0,sw,sh);
    const m=document.createElement('canvas');m.width=W;m.height=H;const mx=m.getContext('2d');mx.imageSmoothingEnabled=true;mx.imageSmoothingQuality='high';mx.drawImage(t,0,0,W,H);
    mx.globalCompositeOperation='destination-in';const g=mx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.3,'rgba(0,0,0,0)');g.addColorStop(.7,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');mx.fillStyle=g;mx.fillRect(0,0,W,H);
    x.drawImage(m,0,0);}
  if(L.tint){x.globalCompositeOperation='multiply';x.globalAlpha=L.ta||0;x.fillStyle=`rgb(${L.tint})`;x.fillRect(0,0,W,H);x.globalAlpha=1;x.globalCompositeOperation='source-over';}
  {const g=x.createRadialGradient(W/2,H*.48,Math.min(W,H)*.2,W/2,H*.48,Math.hypot(W,H)*.5);g.addColorStop(.0,'rgba(0,0,0,0)');g.addColorStop(.55,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${L.vig})`);x.fillStyle=g;x.fillRect(0,0,W,H);}
  c.toBlob(b=>{if(!b)return;if(PHX.url)xsTry(()=>URL.revokeObjectURL(PHX.url));PHX.blob=b;PHX.url=URL.createObjectURL(b);const im=$('phPrev').querySelector('img');im.src=PHX.url;$('phDl').href=PHX.url;$('phShare').textContent='Share';$('phPrev').classList.add('on');PHX.size=W+'x'+H;},'image/png');}
// entry points: the P key (Shift+P still pauses), and a button next to Pause
addEventListener('keydown',e=>{const k=e.key;if((k!=='p'&&k!=='P')||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||PHX.on)return;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
  if(!G||G.over||G.paused||($('pauseOv')&&!$('pauseOv').hidden)||KC.on)return;if(phEnter()){e.preventDefault();e.stopImmediatePropagation();}},true);
(function(){const ref=$('aPauseM');if(ref){const b=document.createElement('button');b.id='aPhoto';b.setAttribute('role','menuitem');b.textContent='📷 Photo mode (P)';ref.after(b);
    b.onclick=()=>{xsTry(()=>menuOpen(false));$('amenu').hidden=true;phEnter();};}})();

/* ===== 3. Voice commands ===== */
const VC={SR:window.SpeechRecognition||window.webkitSpeechRecognition,on:false,rec:null,handled:false,txt:'',has:false,tm:null,tt:null,vk:0,
  lang:(xsTry(()=>localStorage.getItem('ww3_voiceLang'))||'en-US')};
const VC_LANGS=[['en-US','EN'],['ar-SA','عر'],['fa-IR','فا']];
const arNorm=s=>s.toLowerCase().replace(/[ً-ٰٟـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ی/g,'ي').replace(/ک/g,'ك').replace(/‌/g,' ').replace(/[.,!?؟،]/g,' ').replace(/\s+/g,' ').trim();
const arPat=s=>s.toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ی/g,'ي').replace(/ک/g,'ك');
const vcRx=a=>new RegExp(arPat(a));
// order matters: the first rule that matches wins. English, Arabic and Persian words are all tried whatever language the mic listens in.
const VC_RULES=[
  ['selTanks',vcRx('select (all )?(the |my )?tanks?|all tanks|tanks only|(حدد|اختر|انتق) (كل )?(ال)?دبابات|دبابات|(انتخاب|انتخاب كن) .*تانك|تانك ها')],
  ['selInf',vcRx('select (all )?(the |my )?(infantry|troops|soldiers|men|riflemen)|all infantry|(حدد|اختر|انتق) (كل )?(ال)?(مشاه|جنود)|مشاه|(انتخاب|انتخاب كن) .*(پياده|سرباز)|پياده نظام')],
  ['selAll',vcRx('select (all|everything|everyone|the army|my army|army)|all units|(حدد|اختر) (كل|الجيش|الجميع)|كل الوحدات|(انتخاب|انتخاب كن) .*(همه|ارتش)|همه نيروها')],
  ['capture',vcRx('capture|seize|take (the |that |this )?(town|village|city|hamlet)|(استولي|احتل|سيطر).*|استيلا|(تصرف|فتح|اشغال).*|شهر رو بگير|شهر را بگير')],
  ['retreat',vcRx('retreat|fall back|pull back|withdraw|run away|تراجع|انسحاب|انسحب|ارجع|ارتد|عقب نشيني|عقب نشين|برگرد|عقب بكش|عقب')],
  ['guard',vcRx('guard|defend|protect|(احرس|احمي|دافع|حراسه|حمايه)|دفاع|محافظت|نگهباني|حفظ كن')],
  ['hold',vcRx('\\bhold\\b|stay (here|put)|stand (your )?ground|(اثبت|ثبات|احتفظ|قف مكانك|انتظر)|مقاومت|نگه دار|همين جا بمان|بمان|ثابت')],
  ['stop',vcRx('\\bstop\\b|cease|halt|توقف|(^| )قف( |$)|بايست|ايست')],
  ['attack',vcRx('attack|engage|charge|assault|fire|destroy|(هجوم|اهجم|هاجم|اضرب|دمر|هجم)|حمله|بزن|نابود')],
  ['move',vcRx('move|go (there|here)|come here|advance|(تحرك|اذهب|تقدم|تعال|هنا)|حركت|برو|بيا|اينجا|پيش')]];
function vcParse(t){const n=arNorm(t);if(!n)return null;for(const [id,rx] of VC_RULES)if(rx.test(n))return id;return null;}
let vcToastT=null;
function vcSay(h,sub,bad){let el=$('vcToast');if(!el){el=document.createElement('div');el.id='vcToast';document.body.append(el);}el.classList.toggle('bad',!!bad);el.innerHTML='';const b=document.createElement('div');b.textContent=h;el.append(b);
  if(sub){const s=document.createElement('small');s.textContent=sub;el.append(s);}el.classList.add('on');clearTimeout(vcToastT);vcToastT=setTimeout(()=>el.classList.remove('on'),bad?3200:2600);}
function vcHere(){let w=null;if(VC.has&&mouse&&(mouse.x||mouse.y))w=screenToWorld(mouse.x,mouse.y);if(!w)w=screenToWorld(VW/2,VH/2);return w;}
function vcOwn(){return G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead);}
function vcDo(id,heard){if(!G||G.over||PHX.on)return;const L={selTanks:'Select tanks',selInf:'Select infantry',selAll:'Select the whole army',capture:'Capture the town',retreat:'Retreat',guard:'Guard here',hold:'Hold position',stop:'Stop',attack:'Attack-move here',move:'Move here'};
  const say=(extra)=>vcSay('🎤 “'+heard+'”',extra||('→ '+L[id]));
  const mine=u=>u.team===ME&&!u.isB&&!u.dead&&!['harv','hacker','dozer'].includes(u.kind);
  if(id==='selTanks'||id==='selInf'||id==='selAll'){const a=G.ents.filter(u=>mine(u)&&(id==='selAll'||(id==='selTanks'?u.s.cls==='tank':isInf(u.s))));
    if(!a.length){vcSay('🎤 “'+heard+'”','You have no '+(id==='selTanks'?'tanks':id==='selInf'?'infantry':'army')+' to select',true);return;}G.sel=a;xsTry(()=>speak(0));xsTry(updateUI);say('→ '+L[id]+' ('+a.length+')');return;}
  const own=vcOwn(),ids=own.filter(u=>u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);
  if(!ids.length){vcSay('🎤 “'+heard+'”','Select some units first (say “select all tanks”)',true);return;}
  const w=vcHere(),fm=xsTry(()=>sqOfSel()>0?1:0)||0;
  if(id==='retreat'){doAct({t:'ret',ids});xsTry(()=>speak(2));}
  else if(id==='hold'){doAct({t:'stance',ids,v:2});}
  else if(id==='stop'){doAct({t:'stop',ids});}
  else if(id==='guard'){if(!w){vcSay('🎤 “'+heard+'”','No spot to guard',true);return;}doAct({t:'def',ids,x:w.x,y:w.y});xsTry(()=>mark({x:w.x,y:w.y,r:300,t:0,d:1.1,c:0x6fb2ff}));}
  else if(id==='attack'||id==='move'){if(!w){vcSay('🎤 “'+heard+'”','No spot to go to',true);return;}doAct({t:'go',ids,x:w.x,y:w.y,mode:id==='attack'?'amove':'move',fm});xsTry(()=>speak(id==='attack'?2:1));xsTry(()=>mark({x:w.x,y:w.y,r:16,t:0,d:.4,c:id==='attack'?0xea5a40:0x74d08f}));}
  else if(id==='capture'){const inf=own.filter(u=>canGarrison(u)),cx=own.reduce((s,u)=>s+u.x,0)/own.length,cy=own.reduce((s,u)=>s+u.y,0)/own.length;let bc=null,bd=1e9;
    for(const c of (G.civ||[])){if(c.dead||c.ruin||(c.ow!=null&&c.ow>=0&&ally(c.ow,ME)))continue;const d=Math.hypot(c.x-cx,c.y-cy);if(d<bd){bd=d;bc=c;}}
    if(!bc){vcSay('🎤 “'+heard+'”','No town left to capture',true);return;}
    if(bc.g&&!ally(bc.g.team,ME))doAct({t:'atkCiv',ids:own.map(u=>u.id),ci:bc.i});else if(inf.length){doAct({t:'gar',ids:inf.map(u=>u.id),ci:bc.i});const rest=own.filter(u=>!inf.includes(u)&&u.kind!=='harv'&&u.kind!=='dozer').map(u=>u.id);if(rest.length)doAct({t:'go',ids:rest,x:bc.x,y:bc.y,mode:'move'});}
    else doAct({t:'go',ids,x:bc.x,y:bc.y,mode:'move'});xsTry(()=>mark({x:bc.x,y:bc.y,r:30,t:0,d:.6,c:0xffd166}));}
  say();xsTry(()=>ordDone(false));xsTry(updateUI);}
function vcFinish(alts){if(VC.handled)return;const list=alts&&alts.length?alts:[VC.txt];for(const t of list){const id=vcParse(t);if(id){VC.handled=true;vcDo(id,t.trim());return;}}
  VC.handled=true;const t=(list[0]||'').trim();if(t)vcSay('🎤 “'+t+'”','Not a command. Try: attack, retreat, hold, move here, select all tanks, guard, capture the town',true);else vcSay('🎤 Didn’t hear anything','Hold the button and speak',true);}
function vcStart(){if(!VC.SR||VC.on||!G||G.over||PHX.on)return;VC.on=true;VC.handled=false;VC.txt='';VC.alts=null;const b=$('vcBtn');if(b)b.classList.add('live');vcSay('🎤 Listening…','Say “attack”, “retreat”, “hold”, “move here”, “select all tanks”');
  try{const r=new VC.SR();VC.rec=r;r.lang=VC.lang;r.interimResults=true;r.maxAlternatives=3;r.continuous=false;
    r.onresult=e=>{let txt='',alts=null,fin=false;for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];txt+=res[0].transcript;if(res.isFinal){fin=true;alts=[];for(let j=0;j<res.length;j++)alts.push(res[j].transcript);}}
      VC.txt=txt;if(fin){VC.alts=alts;}else vcSay('🎤 “'+txt+'”','Listening…');};
    r.onerror=e=>{const er=e&&e.error;if(er==='not-allowed'||er==='service-not-allowed'){VC.handled=true;vcSay('🎤 Microphone is blocked','Allow the microphone for this site in your browser settings',true);}else if(er==='no-speech'){}else if(er==='language-not-supported'){VC.handled=true;vcSay('🎤 That language is not supported here','Tap the language chip to switch',true);}else if(er!=='aborted'&&er!=='network'){}else if(er==='network'){VC.handled=true;vcSay('🎤 Voice needs an internet connection','',true);}};
    r.onend=()=>{VC.on=false;VC.rec=null;const b2=$('vcBtn');if(b2)b2.classList.remove('live');vcFinish(VC.alts);};
    r.start();}catch(e){VC.on=false;VC.rec=null;if(b)b.classList.remove('live');vcSay('🎤 Voice commands are not available here','',true);}}
function vcStop(){if(VC.rec)xsTry(()=>VC.rec.stop());}
(function vcInit(){if(!VC.SR)return;const ref=$('aPause');if(!ref)return;const b=document.createElement('button');b.id='vcBtn';b.type='button';b.className=ref.className;b.textContent='🎤';b.title='Hold and speak a command (or hold V)';b.setAttribute('aria-label','Voice command: hold and speak');ref.before(b);
  const lg=document.createElement('button');lg.id='aVoiceLang';lg.type='button';lg.setAttribute('role','menuitem');const pm=$('aPhoto')||$('aPauseM');if(pm)pm.after(lg);
  const sl=()=>{const e=VC_LANGS.find(l=>l[0]===VC.lang)||VC_LANGS[0];lg.textContent='🎤 Voice language: '+e[1];};sl();
  lg.onclick=e=>{e.stopPropagation();const i=VC_LANGS.findIndex(l=>l[0]===VC.lang);VC.lang=VC_LANGS[(i+1)%VC_LANGS.length][0];xsTry(()=>localStorage.setItem('ww3_voiceLang',VC.lang));sl();};
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{b.setPointerCapture(e.pointerId);}catch(_){}vcStart();});
  for(const t of ['pointerup','pointercancel'])b.addEventListener(t,e=>{e.stopPropagation();vcStop();});
  b.addEventListener('contextmenu',e=>e.preventDefault());
  // last tap / cursor position on the map = "here"
  for(const t of ['pointerdown','pointermove'])cv.addEventListener(t,()=>{VC.has=true;},{passive:true});
  // V: hold to talk (a quick tap still cycles the army stance, as before)
  addEventListener('keydown',e=>{if(e.key!=='v'&&e.key!=='V')return;if(e.ctrlKey||e.metaKey||e.altKey||PHX.on)return;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;if(!G||G.over||KC.on)return;
    e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;VC.vk=performance.now();clearTimeout(VC.tt);VC.tt=setTimeout(vcStart,260);},true);
  addEventListener('keyup',e=>{if(e.key!=='v'&&e.key!=='V')return;if(!VC.vk)return;clearTimeout(VC.tt);const held=performance.now()-VC.vk;VC.vk=0;if(VC.on||held>=260){vcStop();return;}
    if(G&&!G.over&&!PHX.on&&!KC.on)xsTry(cycleStance);},true);})();
