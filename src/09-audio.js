/* ================= AUDIO ENGINE: layered weapons, reverb, stereo, cinematic regional score ================= */
const AU={ctx:null,master:null,sfx:null,mus:null,rev:null,revIn:null,noise:null,musicOn:true,sfxOn:true,voiceOn:true,rate:{},style:null,next:0,step:0,timer:null,lastVoice:0,voices:[],heat:0,bar:0};
try{const v=JSON.parse(localStorage.getItem('ww3_audio')||'{}');if(v.m===false)AU.musicOn=false;if(v.s===false)AU.sfxOn=false;if(v.v===false)AU.voiceOn=false;}catch(e){}
function saveAudio(){try{localStorage.setItem('ww3_audio',JSON.stringify({m:AU.musicOn,s:AU.sfxOn,v:AU.voiceOn}));}catch(e){}}
function impulse(c,sec,decay){const n=c.sampleRate*sec,b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,decay)*(t<.003?t/.003:1);}}return b;}
// ----- Phone-proof sound start -----
// Phones only allow sound after a real tap, iPhones mute Web Audio when the ringer switch is on silent, and calls, Siri
// or switching apps "interrupt" the sound engine. Everything below makes sound start on the first tap, ignore the
// silent switch like any game or video does, and come back by itself after an interruption. Purely local audio.
// A fresh or damaged save never leaves the game silent: missing or broken volume values fall back to the defaults.
try{for(const [k,d] of [['mus',70],['fx',100],['vo',100]]){const v=Number(SET[k]);SET[k]=(SET[k]===''||SET[k]==null||!Number.isFinite(v))?d:Math.max(0,Math.min(100,v));}}catch(e){}
const IOSLIKE=(()=>{try{const u=navigator.userAgent||'';return /iP(hone|ad|od)/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1);}catch(e){return false;}})();
const PHONE=(()=>{try{return IOSLIKE||(matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches);}catch(e){return IOSLIKE;}})();
function audioErr(where,e){AU.err=where+': '+((e&&(e.name||e.message))||e||'error');}
function audioHeld(){return !!(G&&G.paused);}// a paused battle keeps its sound paused until the player resumes
function audioCtor(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  // some Android phones reject a latency hint; never assume a sample rate
  for(const o of [{latencyHint:'playback'},{latencyHint:'interactive'},null]){try{const c=o?new C(o):new C();if(c)return c;}catch(e){audioErr('engine',e);}}return null;}
// decodeAudioData: older WebKit only has the callback form, newer browsers return a promise; support both, never throw
function decodeAB(c,ab){return new Promise((res,rej)=>{let done=0;const ok=b=>{if(!done){done=1;res(b);}},no=e=>{if(!done){done=1;rej(e||new Error('decode failed'));}};
  try{const p=c.decodeAudioData(ab,ok,no);if(p&&typeof p.then==='function')p.then(ok,no);}catch(e){no(e);}});}
// iPhone silent switch: ask for the "playback" audio session (Safari 17+), and as a fallback keep a silent looping
// <audio> element playing, which switches iOS to the same media session that videos use.
const SIL={el:null,ok:false,want:false,uri:null};
function silentURI(){if(SIL.uri)return SIL.uri;const n=8000,b=new Uint8Array(44+n),v=new DataView(b.buffer),s=(o,t)=>{for(let i=0;i<t.length;i++)b[o+i]=t.charCodeAt(i);};
  s(0,'RIFF');v.setUint32(4,36+n,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n,true);
  let bin='';for(let i=0;i<b.length;i++)bin+=String.fromCharCode(b[i]);return SIL.uri='data:audio/wav;base64,'+btoa(bin);}
function silPlay(){if(!IOSLIKE)return;SIL.want=true;try{if(!SIL.el){const a=document.createElement('audio');a.setAttribute('playsinline','');a.setAttribute('webkit-playsinline','');a.setAttribute('x-webkit-airplay','deny');
      a.preload='auto';a.loop=true;a.controls=false;try{a.disableRemotePlayback=true;}catch(e){}a.src=silentURI();SIL.el=a;}
    const a=SIL.el;if(!a.paused){SIL.ok=true;return;}const p=a.play();
    if(p&&typeof p.then==='function')p.then(()=>{SIL.ok=true;},e=>{SIL.ok=false;if(e&&e.name!=='NotAllowedError'){audioErr('silent loop',e);SIL.el=null;}});else SIL.ok=!a.paused;}catch(e){SIL.ok=false;SIL.el=null;audioErr('silent loop',e);}}
function sessionOn(){try{const s=navigator.audioSession;if(s&&s.type!=='playback')s.type='playback';}catch(e){}silPlay();}
// Device speech (used when a recorded voice can't load): iOS needs its first speak() inside a tap; retry until it takes.
function speechUnlock(){try{const S=window.speechSynthesis;if(!S)return;if(!AU.voices.length)AU.voices=S.getVoices()||[];if(!AU.spHook){AU.spHook=1;S.onvoiceschanged=()=>{AU.voices=S.getVoices()||[];};}
  if(AU.spOK||(AU.spTry||0)>=6)return;AU.spTry=(AU.spTry||0)+1;const u=new SpeechSynthesisUtterance(' ');u.volume=0;u.onstart=u.onend=()=>{AU.spOK=1;};S.speak(u);}catch(e){}}
// Called synchronously inside touchend / click / keydown / pointerup: create or resume the engine, start a tiny silent
// buffer (what iOS needs to really open the audio path), start the playback session. Retried on every tap until running.
function audioUnlock(){if(AU.ctx&&audioHeld())return;sessionOn();initAudio();const c=AU.ctx;if(!c)return;
  if(c.state!=='running'||!AU.warm){try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);AU.warm=1;}catch(e){audioErr('warm-up',e);}}
  speechUnlock();try{const f=(G&&G.teams&&G.teams[ME]&&G.teams[ME].fac)||(typeof setup!=='undefined'&&setup&&setup.p);if(f)voLoad(f);}catch(e){}}
function audioState(){const c=AU.ctx;if(!c)return;if(c.state==='closed'){setTimeout(audioRebuild,0);return;}
  if(c.state!=='running'&&c.state!=='suspended'&&!document.hidden&&!audioHeld())setTimeout(()=>{try{if(AU.ctx===c&&c.state!=='running'&&c.state!=='closed'){const p=c.resume();if(p&&p.catch)p.catch(()=>{});}}catch(e){}},250);
  sndShow();}
// back from a call, Siri, an alarm or another app: resume (if that needs a tap, the next tap does it)
function audioWake(){if(document.hidden)return;if(SIL.want)silPlay();const c=AU.ctx;if(!c)return;if(c.state==='closed'){audioRebuild();return;}
  if(c.state!=='running'&&!audioHeld()){try{const p=c.resume();if(p&&p.catch)p.catch(()=>{});}catch(e){}}}
// a closed engine (rare, iOS) is rebuilt from scratch; recorded voices and instrument samples are kept
function audioRebuild(){const old=AU.ctx;if(!old||old.state!=='closed'||(AU.rebuilt||0)>=5)return;AU.rebuilt=(AU.rebuilt||0)+1;
  AU.ctx=null;AU.warm=0;clearInterval(AU.timer);AU.timer=null;try{DRS.clear();KSC.clear();}catch(e){}
  try{if(MYM.el){MYM.el.pause();MYM.el=null;MYM.src=null;}}catch(e){}
  if(SMP.st!=='ok'){SMP.st=null;}if(MEP.st!=='ok')MEP.st=null;for(const k in VOB)if(typeof VOB[k]==='string')delete VOB[k];
  initAudio();if(!AU.ctx)return;AU.menuKey=null;try{if(G&&!G.over&&G.teams&&G.teams[ME])startMusic(G.teams[ME].fac);else menuMusic();}catch(e){}}
function initAudio(){try{if(AU.ctx&&AU.ctx.state==='closed')audioRebuild();if(!AU.ctx){const c=audioCtor();if(!c)return;AU.ctx=c;
    try{if(c.addEventListener)c.addEventListener('statechange',audioState);else c.onstatechange=audioState;}catch(e){}
    AU.master=c.createGain();AU.master.gain.value=.75;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;AU.master.connect(comp);comp.connect(c.destination);
    AU.rev=c.createConvolver();AU.rev.buffer=impulse(c,1.8,3.2);AU.revIn=c.createGain();AU.revIn.gain.value=.55;AU.revIn.connect(AU.rev);AU.rev.connect(AU.master);
    AU.sfx=c.createGain();AU.sfx.connect(AU.master);AU.sfxRev=c.createGain();AU.sfxRev.gain.value=.35;AU.sfx.connect(AU.sfxRev);AU.sfxRev.connect(AU.revIn);
    AU.mus=c.createGain();AU.mus.gain.value=.19;{const lo=c.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=110;lo.gain.value=3;const mid=c.createBiquadFilter();mid.type='peaking';mid.frequency.value=420;mid.Q.value=.8;mid.gain.value=-2.5;const hi=c.createBiquadFilter();hi.type='highshelf';hi.frequency.value=7000;hi.gain.value=2.5;const gl=c.createDynamicsCompressor();gl.threshold.value=-18;gl.ratio.value=2.5;gl.attack.value=.02;gl.release.value=.3;AU.mus.connect(lo);lo.connect(mid);mid.connect(hi);hi.connect(gl);gl.connect(AU.master);}AU.musRev=c.createGain();AU.musRev.gain.value=.6;AU.mus.connect(AU.musRev);AU.musRev.connect(AU.revIn);AU.musBus=AU.mus;AU.mus=musLane(0);
    const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=b;
    const pb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),pd=pb.getChannelData(0);let l=0;for(let i=0;i<pd.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;pd[i]=l*3.5;}AU.brown=pb;}
  // resume from suspended and also from iOS "interrupted"
  if(AU.ctx.state!=='running'&&AU.ctx.state!=='closed'){const p=AU.ctx.resume();if(p&&p.catch)p.catch(e=>audioErr('resume',e));}applyAudio();}catch(e){audioErr('start',e);}
  speechUnlock();}
// sounds are only scheduled while the engine runs, so an interrupted phone doesn't pile up a burst of queued shots
function auOn(){return !!(AU.ctx&&AU.ctx.state==='running');}
function musBase(){return .19*(SET.mus/70);}
function applyAudio(){if(AU.ctx){AU.sfx.gain.value=AU.sfxOn?SET.fx/100:0;AU.musBus.gain.value=AU.musicOn?musBase():0;}const set=(id,on,l)=>{const b=$(id);if(b){b.textContent=l+(on?' on':' off');b.classList.toggle('on',on);}};set('aMus',AU.musicOn,'Music');set('aSfx',AU.sfxOn,'Sound');set('aVoc',AU.voiceOn,'Voices');}
function spatial(x,y){if(!G||!CAM)return null;const d=Math.hypot(x-cam.x,y-cam.y),r=cam.dist*1.25;if(d>r*1.8)return null;const v=Math.max(0,1-d/(r*1.8))*Math.pow(900/cam.dist,.5);TMP.set(x,0,y).project(CAM);return{v,pan:Math.max(-1,Math.min(1,TMP.x*.8)),far:Math.min(1,d/(r*1.8))};}
function bus(sp){const c=AU.ctx,g=c.createGain();g.gain.value=sp.v;let n=g;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=sp.pan;g.connect(p);n=p;}const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=18000-sp.far*14000;n.connect(lp);lp.connect(AU.sfx);return g;}
function limit(k,n,win=.12){const t=AU.ctx.currentTime;const a=AU.rate[k]=(AU.rate[k]||[]).filter(v=>t-v<win);if(a.length>=n)return false;a.push(t);return true;}
function nz(dst,t,dur,type,f1,f2,gain,q=.8,src){const c=AU.ctx,s=c.createBufferSource();s.buffer=src||AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f1,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.004);g.gain.exponentialRampToValueAtTime(.0005,t+dur);s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
function osc(dst,t,type,f1,f2,dur,gain,att=.003){const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+att);g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);}
function sfxShot(x,y,s){if(!auOn()||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02)return;const t=AU.ctx.currentTime+Math.random()*.01;
  if(s<=5){if(!limit('gun',6))return;const b=bus(sp);const n=1+(Math.random()*3|0);for(let i=0;i<n;i++){const ti=t+i*.075;nz(b,ti,.05,'highpass',1600,0,.5,.7);nz(b,ti,.09,'bandpass',900+Math.random()*400,300,.35,1.2);osc(b,ti,'sine',190,70,.05,.25);}}
  else if(s<=8){if(!limit('msl',3))return;const b=bus(sp);nz(b,t,.08,'highpass',2500,0,.4);nz(b,t,.9,'bandpass',350,3200,.32,1.6);osc(b,t,'sawtooth',90,40,.5,.06);}
  else{if(!limit('can',3))return;const b=bus(sp);nz(b,t,.025,'highpass',3000,0,.8);osc(b,t,'sine',95,30,.55,.9);nz(b,t,.5,'lowpass',2200,180,.7,1);nz(b,t+.02,1.2,'lowpass',600,90,.25,.5,AU.brown);}}
function sfxBoom(x,y,s,big){if(!auOn()||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02||!limit('boom',big?3:4,.15))return;const t=AU.ctx.currentTime,k=Math.min(1,.3+s/40)*(big?1.3:1),d=Math.min(3,.6+s/22);const b=bus(sp);
  nz(b,t,.04,'highpass',2000,0,.9*k);osc(b,t,'sine',big?62:85,24,d*.9,1.1*k,.006);nz(b,t,d,'lowpass',big?1600:2400,120,.9*k,.7);nz(b,t+.03,d*1.4,'lowpass',500,60,.5*k,.5,AU.brown);
  for(let i=0;i<(big?14:6);i++){const ti=t+.08+Math.random()*d*.6;nz(b,ti,.03+Math.random()*.04,'bandpass',1500+Math.random()*3000,0,.12*k*Math.random(),3);}
  AU.heat=Math.min(1,AU.heat+(big?.25:.06));}
// Live drone engines for the nearest few drones on screen: the Shahed-style delta drones putter like a two-stroke
// moped engine, quadcopters whine; pitch climbs as they dive onto a target, volume and stereo follow the camera.
const DRS=new Map();let drT=0;
function droneAudio(dt){if(!AU.ctx||!G)return;drT-=dt;if(drT>0)return;drT=.1;const c=AU.ctx,now=c.currentTime;const on=AU.sfxOn&&!G.over;
  const cand=on?G.ents.filter(e=>e.kind==='drone'&&!e.dead&&(e.team===ME||e.vis)).map(e=>[e,Math.hypot(e.x-cam.x,e.y-cam.y)]).filter(([e,d])=>d<cam.dist*1.4).sort((a,b)=>a[1]-b[1]).slice(0,4):[];
  const keep=new Set(cand.map(([e])=>e.id));
  for(const [id,n] of DRS)if(!keep.has(id)){n.g.gain.setTargetAtTime(0,now,.08);for(const o of n.os)try{o.stop(now+.4);}catch(_){}DRS.delete(id);}
  for(const [e,d] of cand){let n=DRS.get(e.id);const delta=(FACTIONS[G.teams[e.team].fac]&&droneTypeA(G.teams[e.team].fac)==='delta');
    if(!n){const g=c.createGain();g.gain.value=0;const f=c.createBiquadFilter();const os=[];let pan=null;if(c.createStereoPanner){pan=c.createStereoPanner();g.connect(pan);pan.connect(AU.sfx);}else g.connect(AU.sfx);
      if(delta){f.type='lowpass';f.frequency.value=1500;f.Q.value=1.2;const am=c.createGain();am.gain.value=.5;const lfo=c.createOscillator();lfo.frequency.value=17+Math.random()*3;const lg=c.createGain();lg.gain.value=.45;lfo.connect(lg);lg.connect(am.gain);
        for(const [r,a] of [[1,1],[2,.55],[3.02,.25]]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=88*r;const og=c.createGain();og.gain.value=a;o.connect(og);og.connect(am);os.push(o);}am.connect(f);os.push(lfo);}
      else{f.type='bandpass';f.frequency.value=1100;f.Q.value=.9;for(let k=0;k<4;k++){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=255*(1+k*.017);const og=c.createGain();og.gain.value=.3;o.connect(og);og.connect(f);os.push(o);}}
      f.connect(g);for(const o of os)o.start(now);n={g,f,os,pan,delta,base:delta?88:255};DRS.set(e.id,n);}
    const R=cam.dist*1.4,v=Math.max(0,1-d/R)*Math.pow(700/cam.dist,.4)*(n.delta?.09:.06);n.g.gain.setTargetAtTime(v,now,.1);
    const t=e.target,td=t&&!t.dead?Math.hypot(t.x-e.x,t.y-e.y):1e9,dive=td<170?1+(1-td/170)*(n.delta?.18:.35):1;
    for(let k=0;k<n.os.length;k++){const o=n.os[k];if(o.type==='sawtooth'){const r=n.delta?[1,2,3.02][k]||1:(1+k*.017);o.frequency.setTargetAtTime(n.base*r*dive,now,.15);}}
    if(n.pan){TMP.set(e.x,0,e.y).project(CAM);n.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,TMP.x*.8)),now,.1);}}}
function droneTypeA(fac){return fac==='IR'||fac==='RS'?'delta':fac==='TR'?'kargu':'fpv';}
function sfxUI(f){if(!auOn()||!AU.sfxOn)return;const t=AU.ctx.currentTime;osc(AU.sfx,t,'sine',f||880,0,.07,.08);osc(AU.sfx,t+.05,'sine',(f||880)*1.5,0,.08,.05);}
function sfxAlarm(){if(!auOn()||!AU.sfxOn)return;const c=AU.ctx,t=c.currentTime;for(let i=0;i<5;i++){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(480,t+i*.6);o.frequency.linearRampToValueAtTime(900,t+i*.6+.5);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=2200;g.gain.setValueAtTime(.0001,t+i*.6);g.gain.linearRampToValueAtTime(.08,t+i*.6+.05);g.gain.linearRampToValueAtTime(0,t+i*.6+.55);o.connect(f);f.connect(g);g.connect(AU.sfx);o.start(t+i*.6);o.stop(t+i*.6+.6);}}
/* ---------- voices ---------- */
const PHR={
  en:[['Ready.','Awaiting orders.','Standing by.'],['Moving out.','On my way.','Roger that.'],['Engaging!','Target acquired.','Weapons free!'],['Unit ready.','Reporting for duty.'],['Our base is under attack!']],
  tr:[['Hazırım.','Emir bekliyorum.'],['Hareket ediyoruz.','Anlaşıldı.'],['Saldırıyoruz!','Hedef görüldü.'],['Birlik hazır.'],['Üssümüz saldırı altında!']],
  he:[['מוכן.','ממתין לפקודות.'],['זזים.','בדרך.'],['תוקפים!','מטרה זוהתה.'],['היחידה מוכנה.'],['הבסיס שלנו תחת מתקפה!']],
  fr:[['Prêt.','J’attends vos ordres.'],['En route.','Bien reçu.'],['À l’attaque !','Cible acquise.'],['Unité prête.'],['Notre base est attaquée !']],
  uk:[['Готовий.','Чекаю наказів.'],['Виконую.','Рухаємось.'],['Атакуємо!','Ціль бачу.'],['Підрозділ готовий.'],['Нашу базу атакують!']],
  ru:[['Готов.','Жду приказа.'],['Выдвигаемся.','Есть.'],['Атакуем!','Цель вижу.'],['Подразделение готово.'],['Нашу базу атакуют!']],
  fa:[['آماده‌ام.','منتظر دستورم.'],['حرکت می‌کنیم.','در راهم.'],['حمله!','هدف شناسایی شد.'],['یگان آماده است.'],['پایگاه ما زیر حمله است!']],
  ar:[['جاهز.','بانتظار الأوامر.'],['نتحرك.','في الطريق.'],['هجوم!','تم تحديد الهدف.'],['الوحدة جاهزة.'],['قاعدتنا تتعرض للهجوم!']],
  ur:[['تیار ہوں۔','حکم کا انتظار ہے۔'],['روانہ ہو رہے ہیں۔','راستے میں ہوں۔'],['حملہ!','ہدف نظر میں ہے۔'],['یونٹ تیار ہے۔'],['ہمارے اڈے پر حملہ ہو رہا ہے!']],
  hi:[['तैयार हूँ।','आदेश का इंतज़ार है।'],['आगे बढ़ रहे हैं।','रास्ते में हूँ।'],['हमला!','लक्ष्य मिल गया।'],['यूनिट तैयार है।'],['हमारे अड्डे पर हमला हो रहा है!']],
  zh:[['准备就绪。','等待命令。'],['出发。','正在前进。'],['开火！','发现目标。'],['部队就绪。'],['我们的基地正在遭受攻击！']],
  ko:[['준비 완료.','명령을 기다립니다.'],['이동합니다.','알겠습니다.'],['공격!','목표 확인.'],['부대 준비 완료.'],['기지가 공격받고 있습니다!']],
  es:[['Listo.','Esperando órdenes.'],['En marcha.','Entendido.'],['¡Al ataque!','Objetivo localizado.'],['Unidad lista.'],['¡Nuestra base está bajo ataque!']],
};
// Each nation's soldiers talk the way their army does: dialect and slang per nation where several share a language
// (select, move, attack, unit ready, base alarm). Used whenever a voice for that language is available.
const PHR_FAC={
  RS:[['جاهزين يا حاج.','شو الأوامر؟','نحنا حاضرين.'],['ماشيين.','عالطريق.','يلّا يا شباب.'],['يلّا عليهن!','شايفينه، ضربناه!','نار!'],['الشباب جاهزين.'],['ضربوا عالمركز! تعوا بسرعة!']],
  DW:[['حاضرين يا قائد.','جاهزين ذلحين.','قد احنا جاهزين.'],['حيّا بنا!','سِرنا.','ماشيين على بركة الله.'],['اضرب!','عليهم يا رجال!','قدّام!'],['الرجال جاهزين.'],['المعسكر تحت الضرب! الحقوا!']],
  SA:[['جاهزين طال عمرك.','أبشر.'],['تم، ماشين.','على هالخشم.'],['هجوم!','الهدف قدامنا!'],['الوحدة جاهزة يا طويل العمر.'],['القاعدة تنضرب!']],
  AE:[['جاهزين.','حاضرين.'],['تم، متحركين.','زين، ماشين.'],['هجوم!','الهدف واضح!'],['الوحدة جاهزة.'],['القاعدة عليها هجوم!']],
  EG:[['جاهزين يا فندم.','تمام يا فندم.'],['ماشيين.','حاضر يا فندم.'],['اضرب!','يلّا يا رجّالة!'],['الكتيبة جاهزة يا فندم.'],['القاعدة بتضرب يا فندم!']],
  IR:[['آماده‌ایم فرمانده.','در خدمتیم.'],['حرکت می‌کنیم.','چشم فرمانده.'],['آتش!','بزنیدشون!'],['یگان آماده‌ست.'],['قرارگاه زیر آتش است!']],
  KP:[['준비됐습니다, 동무!','명령만 내리십시오!'],['전진한다!','알았습니다!'],['쏴라!','놈들을 쳐부숴라!'],['부대 준비 완료!'],['기지가 공격당하고 있다!']],
  KR:[['준비 완료!','명령 대기 중!'],['이동!','알겠습니다!'],['사격 개시!','적 발견!'],['부대 준비 완료!'],['기지가 공격받고 있습니다!']],
  CU:[['¡Listos, compañero!','¡A la orden!'],['¡Vamos, asere!','¡Dale!'],['¡Fuego!','¡Pa’lante!'],['¡La unidad está lista!'],['¡Nos atacan la base, compañeros!']],
  US:[['Ready to roll.','Locked and loaded.','Standing by, sir.'],['Moving out!','Oscar Mike.','Roger that.'],['Engaging!','Weapons free!','Light ’em up!'],['Unit ready.','Reporting for duty.'],['Our base is under attack!']],
  RU:[['Готов.','Жду приказа, командир.'],['Выдвигаемся!','Так точно!'],['Огонь!','Цель вижу, работаем!'],['Подразделение готово.'],['База под огнём!']],
  UA:[['Готовий!','Чекаю наказу, командире.'],['Виконую!','Рухаємось!'],['Вогонь!','Бачу ціль, працюємо!'],['Підрозділ готовий.'],['Базу атакують!']],
  IL:[['מוכן.','ממתין לפקודה.'],['זזים!','בדרך.'],['אש!','מטרה זוהתה, תוקפים!'],['הכוח מוכן.'],['הבסיס תחת מתקפה!']],
  TR:[['Hazırız komutanım!','Emredin!'],['İleri!','Anlaşıldı!'],['Ateş!','Hedef görüldü, saldırıyoruz!'],['Birlik hazır!'],['Üs saldırı altında!']],
  EU:[['Prêt.','À vos ordres.'],['En avant !','Bien reçu.'],['Feu !','Cible acquise !'],['Unité prête.'],['La base est attaquée !']],
  PK:[['تیار ہیں سر!','حکم کریں!'],['آگے بڑھو!','جی سر!'],['فائر!','دشمن پر حملہ!'],['یونٹ تیار ہے!'],['بیس پر حملہ ہو رہا ہے!']],
  IN:[['तैयार हैं साहब!','हुक्म कीजिए!'],['आगे बढ़ो!','जी साहब!'],['फायर!','दुश्मन पर टूट पड़ो!'],['यूनिट तैयार है!'],['बेस पर हमला हो रहा है!']],
  CN:[['准备完毕！','请指示！'],['前进！','明白！'],['开火！','发现敌人，攻击！'],['部队就位！'],['基地遭到攻击！']]};
// When a browser has no voice for a language, a related voice reads the same words:
// Ukrainian text through a Russian voice; Urdu (spoken Hindustani) through a Hindi voice in Devanagari;
// Arabic, Persian, Hebrew and Turkish as phonetic spellings read by a Spanish/Italian voice, so the speech stays in the native language.
const PHR_ALT={
  uk:{v:['ru'],lines:null},
  ur:{v:['hi'],lines:[['तैयार हूँ।','हुक्म का इंतज़ार है।'],['रवाना हो रहे हैं।','रास्ते में हूँ।'],['हमला!','निशाना नज़र में है।'],['यूनिट तैयार है।'],['हमारे अड्डे पर हमला हो रहा है!']]},
  ar:{v:['fa','ur','es','it'],keep:['fa','ur'],lines:[['Yájiz.','Bintizár al-awámir.'],['Natajárrak.','Fi tarik.'],['¡Juyúm!','Tamma tajdíd al-jadaf.'],['Al-wajda yájiza.'],['¡Kaidatuna tataárrad lil-juyúm!']]},
  fa:{v:['es','it'],lines:[['Amadé-am.','Montazeré dastur-am.'],['Harakat mikoním.','Dar ráham.'],['¡Hamlé!','Hadaf shenasaí shod.'],['Yegán amadé ast.'],['¡Paygahé ma ziré hamlé ast!']]},
  he:{v:['es','it'],lines:[['Mujan.','Mamtín le-pkudót.'],['Zazím.','Ba-dérej.'],['¡Tokfím!','Matará zuhatá.'],['Ha-yejidá mujaná.'],['¡Ha-basís shelanu tájat mitkafá!']]},
  tr:{v:['es','it'],lines:[['Hazírum.','Emir bekliyorum.'],['Haréket ediyoruz.','Anlashíldi.'],['¡Saldíriyoruz!','Hedef guerduldú.'],['Birlik hazír.'],['¡Usumuz saldirí altindá!']]},
};
// Battle cries and salutes in each nation's own voice: [select, move, attack, unit ready, base alarm]. Mixed in
// with the ordinary acknowledgements. Native script for native voices; FCRY_ALT is a phonetic spelling for when the
// device lacks that voice (read by a Spanish/Italian voice); FCRY_EN is used when only English is available.
const FCRY={
  US:[['Hooah!','Semper Fi!'],['Let’s roll!','Oscar Mike.'],['Hooah! Weapons free!','Light ’em up!'],['Ready to roll, sir. Hooah!'],null],
  TR:[['Emret komutanım!','Vatan sana canım feda!'],['Bismillah, ilerliyoruz!'],['Allah Allah!','Şehitler ölmez, vatan bölünmez!'],['Ne mutlu Türküm diyene!'],null],
  IL:[['אחריי!'],['קדימה!'],['עם ישראל חי!','קדימה, הסתעעות!'],['עם ישראל חי!'],null],
  EU:[['Pour l’Europe !'],['En avant !'],['En avant, pour la liberté !','Vive l’Europe !'],['Prêts à défendre l’Europe !'],null],
  UA:[['Слава Україні!'],['Героям слава!'],['Слава Україні!','Ворог не пройде!'],['Слава Україні! Готові!'],null],
  RU:[['Служу России!'],['Вперёд!'],['Ура!','За Родину!'],['Служу России!'],null],
  IR:[['یا علی!','یا علی مدد!'],['به امید خدا!'],['لبیک یا حسین!','الله اکبر!','یا زهرا!'],['لبیک یا حسین!'],null],
  RS:[['يا علي!','لبيك يا حسين!'],['يا علي مدد!'],['لبيك يا حسين!','هيهات منا الذلة!','يا زهراء!'],['لبيك يا حسين!'],null],
  DW:[['يا علي!'],['بسم الله!'],['لبيك يا حسين!','يا آل البيت!','الله أكبر!'],['يا علي!'],null],
  SA:[['فداك يا وطن!'],['بسم الله!'],['الله أكبر!','للمجد والعلياء!'],['فداك يا وطن!'],null],
  AE:[['عيشي بلادي!'],['بسم الله!'],['الله أكبر!','فداك يا إمارات!'],['عيشي بلادي!'],null],
  EG:[['تحيا مصر!'],['يالله يا رجالة!'],['الله أكبر!','تحيا مصر!'],['تحيا مصر!'],null],
  PK:[['پاکستان زندہ باد!'],['بسم اللہ!'],['نعرہ تکبیر، اللہ اکبر!','حیدری!'],['پاکستان زندہ باد!'],null],
  IN:[['जय हिंद!'],['आगे बढ़ो!'],['भारत माता की जय!','आयो गोरखाली!'],['जय हिंद!'],null],
  CN:[['为人民服务！'],['听党指挥！'],['冲啊！','保卫祖国！'],['为人民服务！'],null],
  KP:[['위대한 수령님을 위하여!'],['결사옹위!'],['김정은 동지 만세!','조국을 위하여!'],['위대한 수령님을 위하여!'],null],
  KR:[['충성!'],['필승!'],['대한민국 만세!','필승!'],['충성! 준비 완료!'],null],
  CU:[['¡Patria o muerte!'],['¡Adelante!'],['¡Venceremos!','¡Hasta la victoria siempre!'],['¡Patria o muerte!'],null]};
const FCRY_ALT={
  TR:[['¡Emret komutaním!'],['¡Bismiláh!'],['¡Aláh, Aláh!','¡Vatan sana yaním fedá!'],['¡Ne mutlú Turkúm diyené!'],null],
  IL:[['¡Ajarái!'],['¡Kadimá!'],['¡Am Israél jai!','¡Kadimá, histaarút!'],['¡Am Israél jai!'],null],
  IR:[['¡Ya Alí!','¡Ya Alí madad!'],['¡Be omidé Jodá!'],['¡Labbéik ya Huséin!','¡Aláju akbar!','¡Ya Zahrá!'],['¡Labbéik ya Huséin!'],null],
  RS:[['¡Ya Alí!','¡Labbéik ya Huséin!'],['¡Ya Alí madad!'],['¡Labbéik ya Huséin!','¡Hayhát minná al-dhílla!','¡Ya Zahrá!'],['¡Labbéik ya Huséin!'],null],
  DW:[['¡Ya Alí!'],['¡Bismiláh!'],['¡Labbéik ya Huséin!','¡Ya al al-béit!','¡Aláju akbar!'],['¡Ya Alí!'],null],
  SA:[['¡Fidák ya watán!'],['¡Bismiláh!'],['¡Aláju akbar!','¡Lil-mayd wal-alyá!'],['¡Fidák ya watán!'],null],
  AE:[['¡Áishi biládi!'],['¡Bismiláh!'],['¡Aláju akbar!','¡Fidák ya Imarát!'],['¡Áishi biládi!'],null],
  PK:[['पाकिस्तान ज़िंदाबाद!'],null,['अल्लाहु अकबर!','हैदरी!'],null,null],
  EG:[['¡Tahia Masr!'],['¡Yalá ya riggála!'],['¡Aláju akbar!','¡Tahia Masr!'],['¡Tahia Masr!'],null]};
const FCRY_EN={TR:[['My life for the homeland!'],null,['Allah Allah!'],null,null],IL:[['Follow me!'],['Kadima!'],['Am Yisrael Chai!'],null,null],EU:[['For Europe!'],null,['Forward, for freedom!'],null,null],UA:[['Slava Ukraini!'],null,['Slava Ukraini! The enemy shall not pass!'],null,null],
  RU:[['I serve Russia!'],null,['Urraaah! For the Motherland!'],null,null],IR:[['Ya Ali!'],null,['Labbaik ya Hussein!','Allahu Akbar!'],['Labbaik ya Hussein!'],null],RS:[['Ya Ali!'],null,['Labbaik ya Hussein!','Hayhat minna al-dhilla!'],['Labbaik ya Hussein!'],null],
  DW:[['Ya Ali!'],null,['Labbaik ya Hussein!','Allahu Akbar!'],null,null],SA:[['For the homeland!'],null,['Allahu Akbar!'],null,null],AE:[['Long live my country!'],null,['Allahu Akbar!'],null,null],EG:[['Long live Egypt!'],null,['Allahu Akbar! Long live Egypt!'],null,null],
  PK:[['Pakistan Zindabad!'],null,['Nara-e-Takbeer, Allahu Akbar!','Haideri!'],null,null],IN:[['Jai Hind!'],null,['Bharat Mata ki Jai!','Ayo Gorkhali!'],null,null],CN:[['Serve the people!'],null,['Charge! Defend the motherland!'],null,null],
  KP:[['For the Great Leader!'],null,['Long live Comrade Kim Jong Un!','For the fatherland!'],['For the Great Leader!'],null],KR:[['Loyalty!'],null,['Pilseung! Certain victory!','Long live the Republic of Korea!'],null,null],CU:[['Patria o muerte!'],null,['Venceremos!'],null,null]};
const LANG_PREF={es:['es-US','es-MX','es-419','es-ES','es'],'ar-lb':['ar-lb','ar-sy','ar-sa','ar'],'ar-ye':['ar-ye','ar-sa','ar-eg','ar']};
// Prefer the most natural-sounding voice the device offers for the language: neural/"Natural" voices (Edge, Windows),
// Siri/Premium/Enhanced voices (Apple), then Google voices; avoid compact and eSpeak voices that sound robotic.
function voiceScore(v){const n=v.name||'';let s=0;if(/natural|neural/i.test(n))s+=60;if(/online/i.test(n))s+=40;if(/premium|enhanced|siri/i.test(n))s+=35;if(/google/i.test(n))s+=20;if(v.localService===false)s+=5;if(/espeak|compact|robot|novelty|bad news|zarvox|whisper|bells|cellos|organ|trinoids|albert|bahh|boing|bubbles|jester|superstar|wobble/i.test(n))s-=80;return s;}
// All unit voices are male. Browsers don't report a voice's gender, so known male voice names (Apple, Microsoft, Google,
// Android) are preferred, known female ones avoided, and anything left unknown is pitched down to sound like a man.
const MALE_V=/\bmale\b|david|\bmark\b|\bguy\b|ryan|christopher|\beric\b|andrew|brian|roger|steffan|davis|tony|jason|daniel|\balex\b|fred|aaron|arthur|gordon|rishi|oliver|thomas|george|james|liam|william|\btom\b|evan|nathan|reed|rocko|grandpa|eddy|maged|majed|hamed|shakir|naayf|omar|fahed|taim|rami|bassel|moaz|hamdan|jamal|saleh|hedi|farid|avri|asaf|ahmet|cem|henri|paul|claude|remy|jerome|ostap|dmitr|pavel|yuri|maxim|asad|salman|madhur|hemant|prabhat|yunxi|yunyang|kangkang|yunjian|yunze|injoon|hyunsu|bongjin|gookmin|jorge|juan|diego|alvaro|pablo|raul|gonzalo|manuel|tomas|enrique|carlos|alonso|gerardo|jose|liberto|emilio|andres|lorenzo|luca|cosimo|diego|benigno|giorgio|stefan|conrad|killian|hans|markus|antoine|mathieu|nicolas|xavier|ahmad|reza|dilan/i;
const FEMALE_V=/female|samantha|zira|susan|hazel|aria|jenny|michelle|karen|moira|tessa|fiona|victoria|allison|\bava\b|serena|kate|laila|mariam|zariyah|salma|hoda|amira|dilara|carmit|hila|amelie|denise|julie|audrey|aurelie|marie|celine|milena|irina|katya|svetlana|dariya|polina|lekha|kalpana|swara|heera|neerja|uzma|\bgul\b|xiaoxiao|tingting|huihui|yaoyao|meijia|sin-ji|yuna|sora|sunhi|heami|paulina|monica|elvira|laura|helena|sabina|dalia|\bsara\b|lucia|paloma|esperanza|alice|elsa|isabella|anna|katja|nora|zuzana|ioana|lana|yelda|emel|seda|dina|rana|zeina|leila|nour|shirin|layla|dorsa|joanna|nicky|catherine|emma|libby|sonia|natasha|clara|sofie|kalina/i;
const DEEP_V=/guy|davis|christopher|roger|\beric\b|tony|jason|fred|daniel|arthur|hamed|shakir|rami|bassel|farid|ahmet|henri|dmitr|ostap|madhur|yunyang|injoon|jorge|alvaro|gordon|thomas/i;
function voiceMale(v){const n=v.name||'';return MALE_V.test(n)&&!/female/i.test(n)?1:FEMALE_V.test(n)?-1:0;}
function pickVoice(vs,L){const low=L.toLowerCase(),base=low.split('-')[0];const norm=v=>(v.lang||'').replace('_','-').toLowerCase();
  const pref=(L==='es-CU'?LANG_PREF.es:LANG_PREF[low]||[low,base]).map(p=>p.toLowerCase());
  // a male voice in any accepted dialect beats a female one in the preferred dialect
  const all=[];for(let i=0;i<pref.length;i++){const p=pref[i];for(const x of vs)if((norm(x)===p||norm(x).startsWith(p+'-'))&&!all.includes(x))all.push(x);}
  const men=all.filter(x=>voiceMale(x)===1);if(!men.length)return null;return men.map((x,i)=>[x,(DEEP_V.test(x.name||'')?45:0)+voiceScore(x)-i*.01]).sort((a,b)=>b[1]-a[1])[0][0];}
// Recorded voice lines: one clip sheet per nation (vo/XX.mp3, generated offline with open neural voices and processed
// to sound deep and military), with the clip offsets below. Loaded on demand; device speech is the fallback.
const VO_MAP={"RS":{"l":[[[0.0,1.972],[2.092,1.251],[3.464,1.609]],[[5.193,0.793],[6.106,0.858],[7.085,1.461]],[[8.665,1.412],[10.197,1.535],[11.852,0.765]],[[12.737,1.918]],[[14.775,1.972]]],"c":[[[16.867,1.026],[18.013,1.5]],[[19.633,1.389]],[[21.141,1.548],[22.81,1.733],[24.663,1.133]],[[25.915,1.552]],[]]},"DW":{"l":[[[0.0,1.766],[1.886,1.78],[3.786,1.831]],[[5.737,0.995],[6.851,0.684],[7.655,2.469]],[[10.244,0.632],[10.996,1.639],[12.755,0.651]],[[13.526,1.755]],[[15.4,2.951]]],"c":[[[18.471,1.047]],[[19.638,1.236]],[[20.994,1.453],[22.567,1.417],[24.104,1.297]],[[25.522,0.985]],[]]},"SA":{"l":[[[0.0,1.964],[2.084,0.614]],[[2.818,1.357],[4.296,1.393]],[[5.809,0.873],[6.802,1.403]],[[8.325,2.69]],[[11.135,1.445]]],"c":[[[12.699,1.428]],[[14.247,1.142]],[[15.509,1.255],[16.884,1.413]],[[18.417,1.528]],[]]},"AE":{"l":[[[0.0,1.13],[1.25,1.067]],[[2.438,1.612],[4.169,1.344]],[[5.633,0.786],[6.54,1.488]],[[8.148,1.458]],[[9.726,2.233]]],"c":[[[12.079,1.373]],[[13.572,1.152]],[[14.844,1.339],[16.303,1.488]],[[17.912,1.346]],[]]},"EG":{"l":[[[0.0,1.718],[1.838,1.414]],[[3.372,0.789],[4.281,1.498]],[[5.9,0.541],[6.56,1.378]],[[8.058,2.236]],[[10.414,1.932]]],"c":[[[12.466,1.065]],[[13.65,1.583]],[[15.354,1.377],[16.851,1.077]],[[18.047,1.048]],[]]},"IR":{"l":[[[0.0,1.477],[1.597,1.193]],[[2.911,1.113],[4.144,1.415]],[[5.679,1.042],[6.842,1.056]],[[8.018,1.249]],[[9.386,1.682]]],"c":[[[11.189,1.042],[12.351,1.41]],[[13.88,1.586]],[[15.586,1.552],[17.258,1.248],[18.627,1.373]],[[20.12,1.385]],[]]},"KP":{"l":[[[0.0,2.481],[2.601,1.685]],[[4.406,1.133],[5.66,0.717]],[[6.497,0.72],[7.337,1.503]],[[8.959,1.421]],[[10.5,2.012]]],"c":[[[12.632,1.862]],[[14.614,0.937]],[[15.672,1.666],[17.457,1.229]],[[18.806,1.873]],[]]},"KR":{"l":[[[0.0,1.179],[1.299,1.375]],[[2.793,0.745],[3.658,1.023]],[[4.801,0.966],[5.887,1.019]],[[7.026,1.504]],[[8.65,1.967]]],"c":[[[10.738,0.783]],[[11.641,0.843]],[[12.604,1.274],[13.997,0.825]],[[14.943,1.567]],[]]},"CU":{"l":[[[0.0,1.528],[1.648,1.056]],[[2.825,1.274],[4.218,0.854]],[[5.192,0.863],[6.176,0.996]],[[7.292,1.72]],[[9.132,2.228]]],"c":[[[11.48,1.423]],[[13.023,1.113]],[[14.255,1.177],[15.552,1.758]],[[17.429,1.423]],[]]},"US":{"l":[[[0.0,1.301],[1.421,1.446],[2.987,1.373]],[[4.48,1.041],[5.641,1.186],[6.946,0.99]],[[8.056,1.116],[9.292,1.247],[10.659,1.13]],[[11.909,1.09],[13.119,1.641]],[[14.88,1.835]]],"c":[[[16.835,0.848],[17.803,0.831]],[[18.754,0.975],[19.849,1.181]],[[21.15,1.291],[22.561,1.131]],[[23.812,1.901]],[]]},"RU":{"l":[[[0.0,0.783],[0.903,1.324]],[[2.347,1.168],[3.634,0.971]],[[4.726,0.722],[5.567,1.349]],[[7.036,1.489]],[[8.644,1.121]]],"c":[[[9.885,1.091]],[[11.096,0.738]],[[11.954,0.701],[12.775,0.891]],[[13.786,1.015]],[]]},"UA":{"l":[[[0.0,0.954],[1.074,2.51]],[[3.704,1.202],[5.025,1.262]],[[6.407,0.9],[7.427,1.859]],[[9.407,1.584]],[[11.111,1.577]]],"c":[[[12.808,2.072]],[[14.999,1.519]],[[16.638,1.824],[18.583,1.676]],[[20.379,2.733]],[]]},"IL":{"l":[[[0.0,1.025],[1.145,1.5]],[[2.765,1.028],[3.913,0.963]],[[4.996,0.854],[5.97,1.701]],[[7.791,1.492]],[[9.403,2.209]]],"c":[[[11.732,0.838]],[[12.691,0.94]],[[13.75,1.546],[15.416,1.49]],[[17.026,1.51]],[]]},"TR":{"l":[[[0.0,1.33],[1.45,0.84]],[[2.409,0.726],[3.255,0.93]],[[4.305,0.732],[5.156,1.912]],[[7.188,1.089]],[[8.397,1.379]]],"c":[[[9.895,1.266],[11.281,1.648]],[[13.05,1.624]],[[14.793,0.98],[15.893,2.135]],[[18.149,1.613]],[]]},"EU":{"l":[[[0.0,0.699],[0.819,0.929]],[[1.868,0.71],[2.698,0.945]],[[3.763,0.702],[4.584,1.284]],[[5.988,1.022]],[[7.13,1.269]]],"c":[[[8.519,0.92]],[[9.56,0.766]],[[10.446,1.594],[12.16,0.908]],[[13.188,1.567]],[]]},"PK":{"l":[[[0.0,1.216],[1.336,0.94]],[[2.396,1.028],[3.544,0.817]],[[4.481,0.7],[5.302,1.326]],[[6.747,1.223]],[[8.091,1.879]]],"c":[[[10.089,1.972]],[[12.181,1.089]],[[13.391,2.418],[15.929,0.753]],[[16.802,1.9]],[]]},"IN":{"l":[[[0.0,1.468],[1.588,1.408]],[[3.116,1.235],[4.472,1.268]],[[5.86,0.926],[6.906,1.844]],[[8.87,1.566]],[[10.557,2.005]]],"c":[[[12.681,1.238]],[[14.04,1.236]],[[15.395,1.818],[17.333,1.422]],[[18.875,1.246]],[]]},"CN":{"l":[[[0.0,1.367],[1.487,1.282]],[[2.889,1.045],[4.054,0.893]],[[5.067,0.894],[6.081,1.729]],[[7.931,1.335]],[[9.386,1.551]]],"c":[[[11.057,1.292]],[[12.469,1.383]],[[13.971,0.847],[14.939,1.315]],[[16.373,1.292]],[]]}};const VOB={};
// clips are already processed to natural depth and pace (tts/proc2.py); playback speed stays at 1
const VO_PITCH=1;
// a failed clip sheet is retried once (a dropped connection); device speech covers until then, and music/effects never wait on it
const VOP={},VOT={};
function voLoad(fac){if(!AU.ctx||!VO_MAP[fac])return null;if(VOB[fac]==='fail'&&(VOT[fac]||0)<2)delete VOB[fac];if(VOB[fac])return VOP[fac]||null;VOB[fac]='loading';VOT[fac]=(VOT[fac]||0)+1;
  return VOP[fac]=fetch(window.VO_INLINE&&VO_INLINE[fac]?'data:audio/mpeg;base64,'+VO_INLINE[fac]:'vo/'+fac+'.mp3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOB[fac]=buf;return buf;}).catch(e=>{VOB[fac]='fail';audioErr('voice '+fac,e);return null;});}
function voPlay(fac,kind){const buf=VOB[fac],M=VO_MAP[fac];if(!buf||typeof buf==='string'||!M||!auOn())return false;let set=(M.l[kind]&&M.l[kind].length)?M.l[kind]:M.l[0];const cr=M.c&&M.c[kind];if(cr&&cr.length&&Math.random()<(kind===2?.5:.38))set=cr;if(!set||!set.length)return false;
  const c=AU.ctx;// one line at a time: a new line never talks over (and seems to cut off) the one still playing
  if(AU.voEnd&&c.currentTime<AU.voEnd-.05)return true;
  const [o,d]=set[Math.floor(Math.random()*set.length)],src=c.createBufferSource(),g=c.createGain();src.buffer=buf;src.playbackRate.value=VO_PITCH;const vol=Math.max(0,Math.min(1.5,SET.vo/100*1.25)),t0=c.currentTime+.02,dur=d/VO_PITCH;
  // soft edges so a clip never starts or stops with a click
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.005);g.gain.setValueAtTime(vol,Math.max(t0+.006,t0+dur-.05));g.gain.linearRampToValueAtTime(0,t0+dur);AU.voEnd=t0+dur;src.connect(g);g.connect(c.destination);
  if(AU.musicOn&&AU.mus){AU.musBus.gain.setTargetAtTime(musBase()*.45,c.currentTime,.05);AU.musBus.gain.setTargetAtTime(musBase(),c.currentTime+d+.1,.25);}src.start(t0,o,d);return true;}
function speak(kind){if(!AU.voiceOn||!G)return;const now=performance.now();if(now-AU.lastVoice<1300)return;AU.lastVoice=now;{const fac=G.teams[ME].fac;voLoad(fac);if(voPlay(fac,kind)){if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}return;}}if(!window.speechSynthesis)return;
  const L=G.teams[ME].F.lang,base=L.split('-')[0];const vs=AU.voices.length?AU.voices:speechSynthesis.getVoices();let voice=pickVoice(vs,L),lines=(voice&&PHR_FAC[G.teams[ME].fac])||PHR[base]||PHR.en,lang=L;
  if(!voice&&PHR_ALT[base]){const A=PHR_ALT[base];for(const b of A.v){const v=pickVoice(vs,b==='es'?'es-CU':b);if(v){voice=v;lang=v.lang;if(A.lines&&!(A.keep&&A.keep.includes(b)))lines=A.lines;break;}}}
  if(!voice&&vs.length){voice=pickVoice(vs,'en-US');lines=PHR.en;lang='en-US';}
  if(!voice)return;// no known male voice on this device: stay silent rather than use a default (often female) voice
  let set=lines[kind]||lines[0];{const fac=G.teams[ME].fac,C=lines===PHR.en?(fac==='US'?FCRY.US:FCRY_EN[fac]):(PHR_ALT[base]&&lines===PHR_ALT[base].lines)?FCRY_ALT[fac]:FCRY[fac];if(C&&C[kind]&&Math.random()<(kind===2?.5:.38))set=C[kind];}
  const u=new SpeechSynthesisUtterance(set[Math.floor(Math.random()*set.length)]);u.lang=lang;if(voice)u.voice=voice;u.rate=kind===2||kind===4?1.12:1.04;u.pitch=(voice&&voiceMale(voice)>0?.78:voice&&voiceMale(voice)<0?.6:.7)+Math.random()*.04;u.volume=Math.min(1,u.volume*1.1);u.volume=Math.max(0,Math.min(1,SET.vo/100));
  // duck the music while a unit talks; cancel only if something is still speaking (cancel+speak back to back drops speech in Chrome)
  u.onstart=()=>{if(AU.ctx&&AU.musicOn)AU.musBus.gain.setTargetAtTime(musBase()*.45,AU.ctx.currentTime,.05);};u.onend=u.onerror=()=>{if(AU.ctx&&AU.musicOn)AU.musBus.gain.setTargetAtTime(musBase(),AU.ctx.currentTime,.25);};
  try{const busy=speechSynthesis.speaking||speechSynthesis.pending;if(busy)speechSynthesis.cancel();if(speechSynthesis.paused)speechSynthesis.resume();if(busy)setTimeout(()=>{try{speechSynthesis.speak(u);}catch(e){}},60);else speechSynthesis.speak(u);}catch(e){}
  if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}}

/* ---------- national scores ---------- */
// Every nation has its own theme: a mode (with real quarter tones for Persian and Arabic maqams), tempo, chord
// progression, signature melody, lead and second instruments, drones and percussion. The score cycles
// intro -> theme -> battle -> anthem, and turns to the battle section when fighting heats up.
// perc letters: K kick, S snare, s ghost snare, H hat, D doum, T tek, B big drum (davul/taiko), F frame drum,
// R clave/clap, C conga, c bongo/janggu, G gong, P timpani, N tabla na, g tabla ge
const STYLES={
  US:{scale:[0,2,3,5,7,8,10],root:49,bpm:108,prog:[0,5,2,6,0,5,3,4],lead:'trumpet',lead2:'horn',pad:'strings',bass:'ost',perc:['K...s..KK...S...','K.sSK.sSKKsSK.SS'],motif:[[0,3],[4,1],[7,4],[7,2],[8,2],[7,4],[5,2],[4,2],[5,4],[4,8]]},
  TR:{scale:[0,1,4,5,7,8,10],root:55,bpm:100,prog:[0,0,6,0,5,5,1,0],lead:'zurna',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['B..T.T..B.T.T...','B.TTB.T.B.TTB.TT'],motif:[[4,4],[5,2],[4,2],[3,2],[2,2],[1,4],[0,8],[1,2],[2,2],[1,4],[0,4]]},
  IL:{scale:[0,1,4,5,7,8,10],root:58.27,bpm:104,prog:[0,0,3,0,6,5,1,0],lead:'clarinet',lead2:'strings',pad:'strings',bass:'ost',perc:['K...S...K..KS...','K.HKS.HKK.HKS.HS'],motif:[[0,2],[1,2],[2,4],[3,2],[4,2],[5,4],[4,2],[3,2],[2,4],[1,2],[0,6]]},
  EU:{scale:[0,2,3,5,7,8,10],root:52,bpm:100,prog:[0,5,2,6,3,0,4,4],lead:'strings',lead2:'horn',pad:'strings',bass:'walk',perc:['P.......S.......','P..PS..PP..PS.SS'],motif:[[2,4],[2,4],[3,4],[4,4],[4,4],[3,4],[2,4],[1,4],[0,4],[0,4],[1,4],[2,4],[2,6],[1,2],[1,8]]},
  UA:{scale:[0,2,3,6,7,9,10],root:55,bpm:98,prog:[0,5,2,6,0,3,4,0],lead:'bandura',lead2:'choir',pad:'choir',bass:'ost',perc:['K.......S.......','K...K.s.S...K.SS'],motif:[[0,2],[2,2],[3,2],[4,2],[3,4],[2,2],[1,2],[0,4],[4,4],[5,2],[4,2],[3,8]]},
  RU:{scale:[0,2,3,5,7,8,11],root:46.25,bpm:92,prog:[0,5,3,4,0,5,2,4],lead:'choir',lead2:'lowbrass',pad:'choir',bass:'ost',perc:['B.......S.......','B...B...S.B.B.S.'],motif:[[0,4],[0,2],[2,2],[3,4],[2,4],[0,4],[-1,4],[0,8]]},
  // Latmiya scores: a solo chanter calls, the chorus answers, over steady chest-beating (L) and a low hum.
  IR:{scale:[0,1.5,3,5,7,8,10],root:55,bpm:70,prog:[0,0,3,0,0,4,3,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L.......L.......','L...L...L...L...'],motif:[[4,4],[3,2],[2,2],[1,4],[2,2],[1,2],[0,8],[2,2],[3,2],[2,2],[1,2],[0,8]]},
  SA:{scale:[0,1.5,3,5,7,8,10],root:49,bpm:90,prog:[0,0,6,0,3,2,1,0],lead:'oud',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['B...F...B.F.F...','B.F.B.FFB.F.BFF.'],motif:[[0,4],[1,2],[2,2],[3,4],[2,2],[1,2],[0,2],[1,2],[0,8]]},
  AE:{scale:[0,2,3.5,5,7,9,10.5],root:51.91,bpm:100,prog:[0,5,2,6,0,3,4,0],lead:'qanun',lead2:'brass',pad:'strings',bass:'ost',perc:['K..T..T.K..T.T..','K.TTK.TTK.TTKTTT'],motif:[[0,2],[2,2],[3,2],[4,4],[5,2],[4,2],[3,2],[2,2],[1,2],[0,6]]},
  PK:{scale:[0,2,3,5,7,9,10],root:55,bpm:104,prog:[0,0,3,4,0,0,3,0],lead:'harmonium',lead2:'choir',pad:'none',drone:1,bass:'drone',perc:['g.N.g.N.g.NNg.N.','g.NgR.NgR.gNgRNR'],motif:[[4,2],[4,2],[5,2],[4,2],[3,4],[2,2],[3,2],[4,8],[2,2],[1,2],[0,8]]},
  IN:{scale:[0,1,4,5,7,8,11],root:51.91,bpm:96,prog:[0,0,3,0,4,3,1,0],lead:'sitar',lead2:'flute',pad:'none',drone:1,bass:'drone',perc:['g..N.Ng.g.N.N.N.','g.NNgNNgg.NNgNNN'],motif:[[0,2],[1,2],[2,4],[3,2],[4,4],[5,2],[4,2],[2,2],[1,2],[0,8]]},
  CN:{scale:[0,2,3,7,8],root:49,bpm:96,prog:[0,3,1,4,0,3,2,4],lead:'guzheng',lead2:'bowed',pad:'strings',bass:'ost',perc:['G.......B.......','B...B...S.B.B.S.'],motif:[[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[2,2],[0,2],[1,8]]},
  KP:{scale:[0,3,5,7,10],root:55,bpm:116,prog:[0,3,1,4,0,3,2,4],lead:'trumpet',lead2:'brass',pad:'strings',bass:'ost',perc:['K...S...K...S...','KsSsKsSsKsSsKSSS'],motif:[[0,2],[0,2],[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[0,8]]},
  KR:{scale:[0,3,5,7,10],root:58.27,bpm:108,prog:[0,3,1,4,0,3,2,4],lead:'gayageum',lead2:'synth',pad:'strings',bass:'ost',perc:['K...c.c.K.c.S...','K.cKS.cKK.cKS.cS'],motif:[[0,2],[1,2],[2,2],[4,4],[3,2],[2,2],[1,4],[0,2],[1,6]]},
  EG:{scale:[0,1,4,5,7,8,11],root:49,bpm:104,prog:[0,0,3,0,4,3,1,0],lead:'qanun',lead2:'ney',pad:'strings',drone:1,bass:'drone',perc:['D..T.TD.D.TTD.T.','D.TTD.TTD.TTDTTT'],motif:[[4,2],[5,2],[6,2],[7,4],[6,2],[5,2],[4,4],[3,2],[2,2],[1,2],[0,8]]},
  CU:{scale:[0,2,3,5,7,9,10],root:55,bpm:116,prog:[0,5,2,6,0,3,4,4],lead:'trumpet',lead2:'tres',pad:'none',bass:'tumbao',perc:['R..R..R...R.R...','RcCRc.RcCcRcRcCC'],motif:[[4,2],[4,1],[5,1],[4,2],[2,2],[0,4],[1,2],[2,2],[4,2],[2,6]]},
  RS:{scale:[0,1.5,3,4,7,8,10],root:51.91,bpm:66,fill:'bowed',prog:[0,0,2,0,0,1,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L.......L.......','L.....L.L.....L.'],motif:[[3,4],[3,2],[2,2],[3,4],[2,2],[1,2],[0,8],[1,4],[2,2],[1,2],[0,8]]},
  DW:{scale:[0,1.5,3,5,7,8,10],root:55,bpm:100,prog:[0,0,3,0,4,3,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,perc:['L...L...L...L...','L.L.L.L.L.L.L.LL'],motif:[[0,2],[1,2],[2,2],[3,2],[2,4],[1,2],[0,2],[1,2],[2,2],[1,2],[0,6]]},
};
// More latmiyas: each Shia faction rotates through three. All keep the chanter calling and the chorus answering over
// chest-beats; they differ in maqam/dastgah, tempo, rhythm and accompaniment.
Object.assign(STYLES,{
  IR_b:{name:'Sanj-o-Dammam (Bushehr)',scale:[0,1.5,4,5,7,8,10],root:55,bpm:88,prog:[0,0,3,0,0,4,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['Q...L...Q.Z.L...','Q.ZLQ.ZLQ.ZLQZZL'],motif:[[2,2],[3,2],[4,4],[3,2],[2,2],[1,4],[2,2],[1,2],[0,8],[4,2],[3,2],[2,2],[1,2],[0,8]]},
  IR_c:{name:'Shoor (Rising Chest-Beat)',scale:[0,1.5,3,5,7,8.5,10],root:58.27,bpm:112,prog:[0,0,3,3,0,4,3,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L..L..L.L..L..L.','LMLLMLLMLMLLMLLL'],motif:[[0,2],[2,2],[3,2],[4,2],[3,2],[2,2],[1,4],[2,2],[3,2],[2,2],[1,2],[0,8]]},
  RS_b:{name:'Mountain Vigil',fill:'bowed',scale:[0,1,3,5,7,8,10],root:49,bpm:58,prog:[0,0,6,0,0,5,6,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L...............','L.......L...M...'],motif:[[4,6],[3,2],[2,4],[1,4],[2,2],[1,2],[0,8],[1,2],[2,2],[1,4],[0,8]]},
  RS_c:{name:'Marching Noha',fill:'bowed',scale:[0,1,4,5,7,8,10],root:51.91,bpm:92,prog:[0,0,6,0,5,5,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L...M...L...M...','L.M.L.MFL.M.L.MM'],motif:[[0,2],[1,2],[2,4],[2,2],[3,2],[2,4],[1,2],[0,2],[1,4],[0,8]]},
  DW_b:{name:'Highland Clapping Chant',scale:[0,2,3.5,5,7,9,10.5],root:55,bpm:108,prog:[0,0,4,0,3,4,1,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L.W.L.W.L.W.LW..','LWLWL.WWLWLWLWWW'],motif:[[0,2],[2,2],[2,2],[3,2],[4,4],[3,2],[2,2],[3,2],[2,2],[1,4],[0,8]]},
  DW_c:{name:'Desert Lament',scale:[0,2,3,5,7,8,11],root:49,bpm:80,prog:[0,0,3,4,0,5,4,0],lead:'chanter',lead2:'chorus',pad:'none',drone:'hum',bass:'drone',cr:1,
    perc:['L.....L.L.......','L...M.L.L...M.LM'],motif:[[4,4],[5,2],[4,2],[3,4],[2,2],[1,2],[2,4],[1,2],[0,2],[-1,2],[0,8]]},
});
STYLES.IR.name='Shur Noha';STYLES.RS.name='Saba Lament';STYLES.DW.name='Bayati March';
// Every other nation gets a second battle variation built from its own theme: faster, with the progression shifted
// and the melody answered in reverse, so long matches don't loop one tune.
// Track titles, shown in the battle log when the score moves on to the next piece.
const TITLES={US:['Bugles of Liberty','Eagle Charge'],TR:['Mehter Advance','Anatolian Storm'],IL:['Negev Watch','Hora of Steel'],EU:['Concert of Europe','Rhine Line'],
  UA:['Steppe Duma','Kozak March'],RU:['Bells of the Kremlin','Volga Thunder'],SA:['Najd Ardah','Sands of Arabia'],AE:['Falcon Ayala','Gulf Storm'],PK:['Khyber Watch','Lahore Charge'],
  IN:['Himalaya Raga','Ganga Charge'],CN:['Great Wall Overture','Red Dragon March'],KP:['Chollima Parade','Taedong March'],KR:['Arirang Front','Han River Charge'],EG:['Nile Maqam','Sinai Storm'],CU:['Sierra Maestra Son','Havana Charge']};
for(const k of ['US','TR','IL','EU','UA','RU','SA','AE','PK','IN','CN','KP','KR','EG','CU']){const S=STYLES[k];if(!S)continue;const m=S.motif.slice().reverse();const T=TITLES[k];
  const mo=m.map(([d,l],i)=>[i===m.length-1?0:d,l]);STYLES[k+'_b']=Object.assign({},S,{bpm:Math.round(S.bpm*1.08),prog:S.prog.slice(4).concat(S.prog.slice(0,4)),motif:mo,name:T[1]});if(!S.name)S.name=T[0];}
const PLAYLIST={IR:['IR','IR_b','IR_c'],RS:['RS','RS_b','RS_c'],DW:['DW','DW_b','DW_c']};
// ----- Middle Eastern scores: real maqamat / dastgah, regional instruments and rhythms (see "Middle Eastern
// instruments" below). Scales are in cents: 150 = a quarter-tone above a semitone (Arabic), 140 = the Persian koron.
const MAQ={bayati:[0,150,300,500,700,800,1000],hijaz:[0,110,390,500,700,800,1000],saba:[0,150,300,400,700,800,1000],
  rast:[0,200,350,500,700,900,1050],nahawand:[0,200,300,500,700,800,1100],shur:[0,140,300,500,700,800,1000],
  homayoun:[0,140,400,500,700,800,1000],chahargah:[0,140,400,500,700,840,1100]};
const mq=k=>MAQ[k].map(c=>c/100);
// Rhythm layers per section (1 theme, 2 battle, 3 finale), one 16-step bar each, letters as in meDrum.
// Khaleeji: doum-tek with the Gulf's syncopated group claps; ardah / ayala: tabl and tar frame drums (+ tus cymbals
// in the Emirates); Saidi: D T - D D - T - with riq; maqsum: D T - T D - T -; Yemeni 3+3+2 with claps.
const KHAL='d..t.dt.d..t.dt.',KCLAP='...w..w....w..w.',MAQSUM='d.t...t.d...t...',SAIDI='d.t...d.d...t...',RIQ='r.j.r.j.r.j.r.jj';
Object.assign(STYLES,{
  SA:{me:1,name:'Najd Ardah',scale:mq('bayati'),root:49,bpm:84,prog:[0,0,3,0,0,4,3,0],lead:'m_takht',lead2:'m_kam',pad:'none',bass:'drone',lv:1,
    perc:['f.......e...f...','b...e.e.b.b.e.ee'],motif:[[0,2],[1,1],[2,1],[3,3],[2,1],[3,2],[4,2],[3,2],[2,1],[1,1],[2,2],[1,2],[0,6]],
    mx:{tq:'m_oud',dr:'cel',ens:['m_oud','m_kam'],lay:{1:[KHAL,KCLAP],2:['e.e.f.e.e.e.f.ee',KCLAP]},roll:'e',call:'m_chant',rows:1,cg:.24,cm:[[2,4],[2,2],[3,2],[2,3],[1,1],[0,6]]}},
  SA_b:{me:1,name:'Sands of Arabia',scale:mq('hijaz'),root:49,bpm:96,prog:[0,0,3,0,4,3,0,0],lead:'m_oud',lead2:'m_qanun',pad:'none',bass:'drone',lv:1,
    perc:['d.....t.d..t....','b..e..e.b..e..e.'],motif:[[0,2],[1,2],[2,3],[3,1],[4,4],[3,2],[2,2],[1,3],[2,1],[1,2],[0,6]],
    mx:{tq:'m_kam',dr:'cel',ens:['m_oud','m_qanun'],lay:{1:['w..w..w.w..w..w.','d..t..t.d..t..t.'],2:['w..w..w.w..w..w.','e..e..e.e.e.e.ee']},roll:'tk',call:'m_chant',rows:1,cg:.24,cm:[[4,3],[3,1],[2,2],[1,2],[0,6]]}},
  AE:{me:1,name:'Falcon Ayala',scale:mq('rast'),root:51.91,bpm:100,prog:[0,0,3,0,4,3,0,0],lead:'m_takht',lead2:'m_oud',pad:'none',bass:'drone',lv:1,
    perc:[KHAL,'b..e.eb.b.ee.e.e'],motif:[[0,2],[1,2],[2,2],[3,2],[4,4],[5,2],[4,1],[3,1],[2,2],[3,2],[2,2],[1,2],[0,6]],
    mx:{tq:'m_qanun',dr:'cel',ens:['m_qanun','m_oud'],lay:{1:[KCLAP,RIQ],2:['..y...y...y...y.',KCLAP]},roll:'tk',cym:1,call:'m_chant',rows:1,cg:.24,cm:[[4,2],[4,2],[5,2],[4,2],[3,2],[2,2],[0,6]]}},
  AE_b:{me:1,name:'Gulf Storm',scale:mq('bayati'),root:51.91,bpm:112,prog:[0,0,3,0,0,4,3,0],lead:'m_oud',lead2:'m_qanun',pad:'none',bass:'drone',lv:1,
    perc:[KHAL,'b.eeb.e.b.eeb.ee'],motif:[[3,2],[2,1],[1,1],[2,2],[0,2],[1,2],[2,2],[3,4],[4,2],[3,2],[2,2],[1,2],[0,6]],
    mx:{tq:'m_oud',dr:'cel',ens:['m_oud','m_qanun'],lay:{1:[KCLAP,'..r...r...r...r.'],2:['..y...y...y...y.',KCLAP,'d..t.dt.d..t.dt.']},roll:'tk',cym:1,call:'m_chant',rows:1,cg:.24,cm:[[0,2],[2,2],[3,4],[2,2],[1,2],[0,4]]}},
  EG:{me:1,name:'Nile Maqam',scale:mq('rast'),root:43.65,bpm:104,prog:[0,0,3,0,4,3,0,0],lead:'m_takht',lead2:'m_ney',pad:'none',bass:'drone',lv:1,
    perc:[SAIDI,'d.t..dd.t.t.d.tt'],motif:[[4,2],[5,1],[4,1],[3,2],[2,2],[3,2],[4,4],[2,2],[1,1],[2,1],[1,2],[0,6]],
    mx:{tq:'m_ney',dr:'cel',ens:['m_qanun','m_ney'],lay:{1:[RIQ],2:[RIQ,'....k...k.k.k...']},roll:'tk',roll2:'d',call:'m_miz',cg:.2,brass:1,cm:[[4,1],[5,1],[6,2],[5,1],[4,1],[3,2],[4,4],[2,2],[0,4]]}},
  EG_b:{me:1,name:'Sinai Storm',scale:mq('hijaz'),root:43.65,bpm:112,prog:[0,0,3,0,4,3,0,0],lead:'m_miz',lead2:'m_qanun',pad:'none',bass:'drone',lv:1,
    perc:[MAQSUM,'d.t.k.t.d.k.t.kk'],motif:[[0,2],[1,1],[2,1],[3,4],[4,2],[5,1],[4,1],[3,2],[2,2],[1,2],[0,6]],
    mx:{tq:'m_qanun',dr:'cel',ens:['m_qanun','m_ney'],lay:{1:[RIQ],2:[RIQ,'f.......f...f...']},roll:'tk',roll2:'d',call:'m_miz',cg:.2,brass:1,cm:[[4,2],[5,2],[4,1],[3,1],[2,2],[1,2],[0,6]]}},
});
// Latmiyas stay voice-led (a radood calls, the crowd answers and beats their chests on the beat); the regional
// instruments only open each piece with a taqsim, fill the gaps between lines and join in the battle sections.
for(const [k,o] of Object.entries({
  IR:{scale:mq('shur'),fill:'m_ney',resp:[[0,2],[1,2],[2,4],[1,2],[0,6]],mx:{tq:'m_santur',lay:{2:['o..pp.o.o..pp.o.']},roll:'p'}},
  IR_b:{scale:mq('homayoun'),fill:'m_kam',resp:[[2,4],[1,2],[2,2],[1,2],[0,6]],perc:['Q...L...Q.Z.L...','Q.ZLQ.ZLQ.ZLQZZL'],mx:{tq:'m_kam',lay:{1:['..y...y...y...y.'],2:['b.....b...b.....','..y...y...y...y.']},roll:'Q',call:'m_boogh',cg:.16,cm:[[4,8],[3,4],[4,12]]}},
  IR_c:{scale:mq('shur'),fill:'m_kam',resp:[[3,2],[2,2],[1,2],[0,6]],mx:{tq:'m_ney',lay:{2:['o..pp.o.o..pp.o.','f.......f...f...']},roll:'p'}},
  RS:{scale:mq('saba'),fill:'m_qanun',resp:[[2,2],[3,2],[2,2],[1,2],[0,6]],mx:{tq:'m_oud',lay:{2:['f...e.e.f...e.e.','d..t..t.d..t..t.']},roll:'tk'}},
  RS_b:{scale:mq('bayati'),fill:'m_ney',resp:[[1,2],[2,2],[1,2],[0,6]],mx:{tq:'m_ney',lay:{2:['f.......f.e.e...']},roll:'e'}},
  RS_c:{scale:mq('hijaz'),fill:'m_oud',resp:[[0,2],[1,2],[2,4],[1,2],[0,6]],mx:{tq:'m_qanun',lay:{2:[MAQSUM,'r.r.r.r.r.r.r.r.','f.......f...f...']},roll:'tk'}},
  DW:{scale:mq('bayati'),fill:'m_qnb',resp:[[2,2],[1,2],[0,4]],mx:{tq:'m_qnb',lay:{2:['d..x..d.t..x..t.','w..w..w.w..w..w.']},roll:'tx'}},
  DW_b:{scale:mq('rast'),fill:'m_miz',resp:[[4,2],[3,2],[2,2],[0,4]],mx:{tq:'m_qnb',lay:{1:['w..w..w.w..w..w.'],2:['w..w..w.w..w..w.','d..t..d.t..d..t.']},roll:'tx'}},
  DW_c:{scale:mq('hijaz'),fill:'m_miz',resp:[[1,2],[2,2],[1,2],[0,4]],mx:{tq:'m_qnb',lay:{2:['d.....t.d..t....','w.......w...w...']},roll:'t'}},
}))Object.assign(STYLES[k],{me:1},o);
// measured output levels (orch renders): every nation's battle music lands near -22 LUFS and its menu music near -26
for(const [k,v] of Object.entries({SA:[1.45,1.43],SA_b:[1.46,1.4],AE:[1.3,1.05],AE_b:[1.15,1.1],EG:[1.32,1.16],EG_b:[1.32,1.16],IR:[1.46,1.24],IR_b:[1.06,1.3],IR_c:[0.94,1.3],RS:[1.43,1.33],RS_b:[1.8,1.3],RS_c:[1.22,1.3],DW:[1.08,1.32],DW_b:[0.94,1.3],DW_c:[1.41,1.3]}))Object.assign(STYLES[k],{og:v[0],ogc:v[1]});
Object.assign(STYLES,{west:STYLES.US,slavic:STYLES.RU,mideast:STYLES.SA,southasia:STYLES.IN,eastasia:STYLES.CN,latin:STYLES.CU});
function panTo(n,p){const c=AU.ctx;if(p&&c.createStereoPanner){const sp=c.createStereoPanner();sp.pan.value=p;n.connect(sp);sp.connect(AU.mus);}else n.connect(AU.mus);}
function mnote(f,t,dur,type,gain,cut,att=.02,rel=null,det=0,pan=0){const c=AU.ctx,o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type=type;o.frequency.value=f;o.detune.value=det;fl.type='lowpass';fl.frequency.value=cut;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+att);g.gain.setValueAtTime(gain,t+Math.max(att,dur-(rel||dur*.4)));g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(fl);fl.connect(g);panTo(g,pan);o.start(t);o.stop(t+dur+.05);return o;}
function vib(o,t,dur,rate,depth,delay){const c=AU.ctx,l=c.createOscillator(),lg=c.createGain();l.frequency.value=rate;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(depth,t+Math.min(dur,delay+.25));l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05);}
function strings(f,t,dur,gain){let k=0;for(const d of [-14,-8,-3,3,8,14]){const o=mnote(f,t,dur,'sawtooth',gain*.17,1900,.7,dur*.45,d,[-.7,.5,-.3,.3,-.5,.7][k++]);vib(o,t,dur,4.8+k*.13,f*.004,.4);}mnote(f/2,t,dur,'sawtooth',gain*.14,650,.9,dur*.45,6,0);}
// plucked strings: Karplus-Strong buffers, cached per pitch and timbre
const KSC=new Map();
function ksBuf(f,dur,bright,damp){const c=AU.ctx,sr=c.sampleRate,key=Math.round(f*4)+'|'+bright+'|'+damp+'|'+dur;let b=KSC.get(key);if(b)return b;if(KSC.size>400)KSC.clear();
  const N=Math.max(2,Math.round(sr/f)),len=Math.floor(sr*dur);b=c.createBuffer(1,len,sr);const d=b.getChannelData(0),buf=new Float32Array(N);let lp=0;for(let i=0;i<N;i++){lp+=((Math.random()*2-1)-lp)*bright;buf[i]=lp;}
  let ix=0,pk=1e-6;for(let i=0;i<len;i++){const a=buf[ix],nx=buf[(ix+1)%N];d[i]=a;buf[ix]=(a+nx)*.5*damp;ix=(ix+1)%N;if(Math.abs(a)>pk)pk=Math.abs(a);}for(let i=0;i<len;i++)d[i]/=pk;KSC.set(key,b);return b;}
function pluck(f,t,dur,gain,bright,damp,cut,bend,rate,pan){const c=AU.ctx,s=c.createBufferSource();s.buffer=ksBuf(f,Math.min(3,Math.max(.6,dur+.4)),bright,damp);if(bend){s.playbackRate.setValueAtTime(bend,t);s.playbackRate.exponentialRampToValueAtTime(rate||1,t+.09);}else if(rate)s.playbackRate.value=rate;
  const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;const g=c.createGain();g.gain.setValueAtTime(gain,t);g.gain.setValueAtTime(gain,t+Math.max(.05,dur));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.35);s.connect(fl);fl.connect(g);panTo(g,pan||0);s.start(t);s.stop(t+dur+.4);return s;}
function choir(f,t,dur,gain){while(f>230)f/=2;const c=AU.ctx,g=c.createGain(),out=c.createGain();out.gain.value=1;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.3);g.gain.setValueAtTime(gain,t+Math.max(.3,dur*.6));g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  for(const [fq,q,a] of [[730,6,1],[1090,7,.55],[2440,9,.3]]){const b=c.createBiquadFilter();b.type='bandpass';b.frequency.value=fq*(f<200?.85:1);b.Q.value=q;const bg=c.createGain();bg.gain.value=a*3;g.connect(b);b.connect(bg);panTo(bg,fq<1000?-.35:fq<2000?.35:0);}
  for(const d of [-9,-3,3,9]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;vib(o,t,dur,5+Math.random(),f*.006,.2);o.connect(g);o.start(t);o.stop(t+dur+.05);}}
function brass(f,t,dur,gain,bright){const c=AU.ctx,g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.Q.value=1.5;fl.frequency.setValueAtTime(380,t);fl.frequency.exponentialRampToValueAtTime(bright||2400,t+.09);fl.frequency.exponentialRampToValueAtTime((bright||2400)*.6,t+Math.max(.2,dur));
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.05);g.gain.setValueAtTime(gain*.85,t+Math.max(.06,dur*.7));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.08);fl.connect(g);panTo(g,(Math.random()-.5)*.5);
  for(const d of [-7,0,7]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;if(dur>.35)vib(o,t,dur,5.2,f*.005,.25);o.connect(fl);o.start(t);o.stop(t+dur+.1);}}
function reed(f,t,dur,gain,kind){const c=AU.ctx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),bp=c.createBiquadFilter(),hp=c.createBiquadFilter();
  o.type='square';o2.type='sawtooth';o.frequency.value=f;o2.frequency.value=f;o2.detune.value=kind==='harmonium'?9:4;
  if(kind==='zurna'){bp.type='peaking';bp.frequency.value=1500;bp.Q.value=1.4;bp.gain.value=12;hp.type='highpass';hp.frequency.value=500;}else if(kind==='clarinet'){bp.type='lowpass';bp.frequency.value=1900;bp.Q.value=.7;hp.type='highpass';hp.frequency.value=120;o2.type='triangle';}else{bp.type='lowpass';bp.frequency.value=2300;bp.Q.value=.6;hp.type='highpass';hp.frequency.value=90;}
  if(kind!=='harmonium'&&dur>.25)vib(o,t,dur,kind==='zurna'?6.2:5,f*.009,.18);if(kind==='zurna'){o.frequency.setValueAtTime(f*.97,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);}
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+(kind==='harmonium'?.08:.04));g.gain.setValueAtTime(gain,t+Math.max(.05,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.06);
  const mg=c.createGain();mg.gain.value=kind==='clarinet'?.6:.5;o.connect(mg);o2.connect(mg);mg.connect(bp);bp.connect(hp);hp.connect(g);g.connect(AU.mus);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);
  if(kind==='harmonium'){const o3=c.createOscillator();o3.type='square';o3.frequency.value=f*2;o3.detune.value=-6;const g3=c.createGain();g3.gain.value=.25;o3.connect(g3);g3.connect(bp);o3.start(t);o3.stop(t+dur+.1);}}
function bowed(f,t,dur,gain,from){const c=AU.ctx,g=c.createGain(),pk=c.createBiquadFilter(),lp=c.createBiquadFilter();pk.type='peaking';pk.frequency.value=f*3;pk.Q.value=2;pk.gain.value=8;lp.type='lowpass';lp.frequency.value=3200;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.09);g.gain.setValueAtTime(gain,t+Math.max(.1,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.1);pk.connect(lp);lp.connect(g);g.connect(AU.mus);
  for(const d of [-5,5]){const o=c.createOscillator();o.type='sawtooth';o.detune.value=d;if(from&&Math.abs(from/f-1)<.4){o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(f,t+.08);}else o.frequency.value=f;vib(o,t,dur,5.6,f*.011,.15);o.connect(pk);o.start(t);o.stop(t+dur+.15);}
  nz(AU.mus,t,Math.min(.25,dur),'bandpass',f*4,0,gain*.06,3);}
function flute(f,t,dur,gain,ney){const c=AU.ctx,o=mnote(f,t,dur,'sine',gain,4000,ney?.12:.06,dur*.4);const o2=mnote(f*2,t,dur,'triangle',gain*(ney?.08:.12),5000,.08,dur*.4);vib(o,t,dur,ney?5.2:5.8,f*(ney?.014:.008),.2);
  nz(AU.mus,t,dur*.9,'bandpass',f*(ney?1.5:2.5),0,gain*(ney?.22:.1),ney?3:5);}
function synthLead(f,t,dur,gain){for(const d of [-12,-5,0,5,12])mnote(f,t,dur,'sawtooth',gain*.16,2600,.01,dur*.3,d);mnote(f/2,t,dur,'square',gain*.1,1200,.01,dur*.3);}
// Sung words for the latmiyas: a formant singing voice with consonants. The chanter cycles the lines
// "Ya A-li", "Al-lah", "Ya Hu-sein", "Lab-baik Ya Hu-sein" and the chorus answers "A-li", "Lab-baik", "Ya Hu-sein".
// Each phone: three formants [Hz] with levels, voicing (0 = breath only) and an optional noise band for h / s / k.
const PH={a:{F:[760,1230,2650],A:[1,.62,.34],v:1},i:{F:[290,2250,3010],A:[1,.4,.5],v:1},u:{F:[340,830,2450],A:[1,.34,.14],v:1},e:{F:[470,1900,2600],A:[1,.48,.36],v:1},
  y:{F:[300,2150,2900],A:[.7,.4,.34],v:1},l:{F:[370,1050,2650],A:[.4,.16,.12],v:.85},n:{F:[260,1450,2600],A:[.34,.07,.05],v:.8},b:{F:[300,900,2300],A:[.04,.02,.02],v:.25},
  h:{F:[700,1220,2600],A:[.08,.05,.04],v:0,nf:1500,nq:.7,ng:.5},s:{F:[400,1700,2600],A:[0,0,0],v:0,nf:6200,nq:1.2,ng:.75},k:{F:[400,1700,2600],A:[0,0,0],v:0,nf:2400,nq:1.6,ng:.7}};
// syllable -> [phone, start] with start as seconds from the onset (negative = seconds before the end of the note)
const SYL={ya:[['y',0],['a',.07]],a:[['a',0]],li:[['l',0],['i',.07]],al:[['a',0],['l',-.09]],lah:[['l',0],['a',.06],['h',-.13]],hu:[['h',0],['u',.08]],
  sein:[['s',0],['e',.1],['i',.62],['n',-.16]],'~a':[['a',0]],'~e':[['e',0]],'~i':[['i',0]],'~u':[['u',0]],lab:[['l',0],['a',.06],['b',-.06]],baik:[['b',0],['a',.05],['i',.55],['k',-.05]],ya2:[['y',0],['a',.07]],hey:[['h',0],['e',.07],['i',-.14]],lel:[['l',0],['e',.06],['l',-.09]],wa:[['u',0],['a',.06]]};
const LYR={lead:['ya','a','li','ya','a','li','al','lah','ya','hu','sein','lab','baik','ya','hu','sein','ya','a','li','al','lah'],chorus:['a','li','a','li','lab','baik','ya','hu','sein','al','lah']};
// Whole lines sung per phrase, so words never split across phrases; spare notes become held vowels (melisma)
const LINES={lead:[[['ya','a','li'],['ya','a','li'],['al','lah']],[['lab','baik'],['ya','hu','sein']],[['ya','hu','sein'],['ya','a','li']],[['al','lah'],['al','lah'],['ya','a','li']]],
  chorus:[[['a','li'],['a','li']],[['lab','baik'],['ya','hu','sein']],[['ya','hu','sein']],[['al','lah'],['a','li']]],
  chant:[[['ya','lel'],['ya','lel']],[['hey'],['ya','a']],[['wa','hey'],['ya','lel']]]};
const HOLD={hey:'~i',lel:'~e',wa:'~a',ya:'~a',a:'~a',li:'~i',al:'~a',lah:'~a',hu:'~u',sein:'~i',lab:'~a',baik:'~i'};
function lyricFor(n,role,motif){const L=LINES[role][((role==='lead'?AU.ln:AU.cln)||0)%LINES[role].length];if(role==='lead')AU.ln=(AU.ln||0)+1;else AU.cln=(AU.cln||0)+1;
  const out=[];let w=0;const words=[];while(words.flat().length<n*2)words.push(...L);
  // fit whole words; when the next word doesn't fit in the notes left, hold the last vowel over the longest notes
  for(let k=0;k<words.length&&out.length<n;k++){const wd=words[k];if(out.length+wd.length<=n)out.push(...wd);else break;}
  while(out.length<n){let best=-1,bl=-1;for(let k=0;k<out.length;k++){if(motif[k]&&motif[k][1]>bl&&['ya','a','li','hu'].includes(out[k])){bl=motif[k][1];best=k;}}
    if(best<0){out.push(HOLD[out[out.length-1]]||'~a');continue;}out.splice(best+1,0,HOLD[out[best]]||'~a');}
  return out.slice(0,n);}
function hallSend(){const c=AU.ctx;if(!AU.vrev||AU.vrevC!==c){AU.vrevC=c;AU.vrev=c.createConvolver();AU.vrev.buffer=impulse(c,3,2.4);AU.vrevIn=c.createGain();AU.vrevIn.gain.value=.5;AU.vrevIn.connect(AU.vrev);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;AU.vrev.connect(lp);lp.connect(AU.musBus);}return AU.vrevIn;}
function glottal(c){if(AU.glotC!==c){AU.glotC=c;const N=56,re=new Float32Array(N),im=new Float32Array(N);for(let n=1;n<N;n++)im[n]=Math.pow(n,-1.45)*(n%2?1:.82);AU.glot=c.createPeriodicWave(re,im);}return AU.glot;}
function voice(f,t,dur,gain,from,syl,nv){const c=AU.ctx,src=c.createGain(),amp=c.createGain(),L=dur+.12;const hold=syl&&syl[0]==='~';
  const seq=(SYL[syl]||SYL.a).map(([p,st])=>[p,st>=0?Math.min(st*(dur<.35?.6:1),L*.7):Math.max(L+st,L*.4)]);
  for(const d of nv>1?[-12,-5,4,11].slice(0,nv):[0]){const o=c.createOscillator();o.setPeriodicWave(glottal(c));o.detune.value=d+(nv>1?Math.random()*5-2.5:0);
    // a sobbing scoop up into the note, then a falling sigh as it releases
    const st=from&&Math.abs(from/f-1)<.35?from:f*.93;o.frequency.setValueAtTime(st,t);o.frequency.exponentialRampToValueAtTime(f,t+Math.min(hold?.12:.18,dur*.3));
    // tahrir: a quick vocal turn ornamenting long solo notes
    if(nv===1&&dur>.85){const a=t+dur*.38,q=.055;o.frequency.setValueAtTime(f,a);o.frequency.linearRampToValueAtTime(f*1.06,a+q);o.frequency.linearRampToValueAtTime(f,a+2*q);o.frequency.linearRampToValueAtTime(f*.972,a+3*q);o.frequency.linearRampToValueAtTime(f,a+4*q);}
    if(dur>.5){o.frequency.setValueAtTime(f,t+dur*.8);o.frequency.exponentialRampToValueAtTime(f*.95,t+dur+.12);}
    vib(o,t,dur,nv>1?4.8+Math.random()*.8:4.7+Math.random()*.4,f*(nv>1?.008:.016),.3);vib(o,t,dur,.6+Math.random()*.5,f*.004,0);o.connect(src);o.start(t);o.stop(t+L+.2);}
  // breath mixed into the voice, plus a separate noise band for h / s / k
  const br=c.createBufferSource();br.buffer=AU.noise;br.loop=true;const bg=c.createGain();bg.gain.value=nv>1?.04:.07;br.connect(bg);bg.connect(src);
  const nzs=c.createBufferSource();nzs.buffer=AU.noise;nzs.loop=true;const nb=c.createBiquadFilter();nb.type='bandpass';const ng=c.createGain();nzs.connect(nb);nb.connect(ng);ng.connect(amp);
  const vg=c.createGain();src.connect(vg);
  const bank=[0,1,2].map(k=>{const b=c.createBiquadFilter();b.type='bandpass';b.Q.value=[5,8,11][k];const g=c.createGain();vg.connect(b);b.connect(g);g.connect(amp);return[b,g];});
  // singer's formant (the ring of a trained voice) and a little body underneath, both following the voicing
  {const sf=c.createBiquadFilter();sf.type='bandpass';sf.frequency.value=nv>1?3000:3050;sf.Q.value=7;const sg=c.createGain();sg.gain.value=nv>1?.5:1.1;vg.connect(sf);sf.connect(sg);sg.connect(amp);
   const bo=c.createBiquadFilter();bo.type='lowpass';bo.frequency.value=f*2.2;const bog=c.createGain();bog.gain.value=.35;vg.connect(bo);bo.connect(bog);bog.connect(amp);}
  const tr=.035;seq.forEach(([p,st],j)=>{const P=PH[p],tt=t+st,tt2=tt+(j===0?0:tr),sh=f<180?.9:1;
    const Q=j?PH[seq[j-1][0]]:P;const set=(prm,val,prev)=>{if(j===0)prm.setValueAtTime(val,tt);else{prm.setValueAtTime(prev,tt);prm.linearRampToValueAtTime(val,tt2);}};
    bank.forEach(([b,g],k)=>{set(b.frequency,P.F[k]*sh,Q.F[k]*sh);set(g.gain,P.A[k]*3.4,Q.A[k]*3.4);});set(vg.gain,P.v,Q.v);
    if(P.nf){nb.frequency.setValueAtTime(P.nf,tt);nb.Q.setValueAtTime(P.nq,tt);ng.gain.setValueAtTime(0,tt);ng.gain.linearRampToValueAtTime(P.ng*(nv>1?.5:1),tt+.015);ng.gain.linearRampToValueAtTime(0,Math.min(t+L,tt+(p==='k'?.05:.11)));}else if(j===0)ng.gain.setValueAtTime(0,tt);});
  amp.gain.setValueAtTime(.0001,t);amp.gain.linearRampToValueAtTime(gain,t+(hold?.03:nv>1?.12:.06));amp.gain.setValueAtTime(gain,t+Math.max(.1,dur*.8));amp.gain.exponentialRampToValueAtTime(.0005,t+L+.1);
  br.start(t);br.stop(t+L+.2);nzs.start(t);nzs.stop(t+L+.2);
  if(nv>1)panTo(amp,(Math.random()-.5)*.6);else amp.connect(AU.mus);amp.connect(hallSend());}
function chant(f,t,dur,gain,from){const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';
  if(from&&Math.abs(from/f-1)<.35){o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(f,t+.1);}else{o.frequency.setValueAtTime(f*1.06,t);o.frequency.exponentialRampToValueAtTime(f,t+.12);}vib(o,t,dur,5.4,f*.013,.2);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.07);g.gain.setValueAtTime(gain,t+Math.max(.08,dur*.75));g.gain.exponentialRampToValueAtTime(.0005,t+dur+.12);o.connect(g);
  for(const [a1,a2,q,amp] of [[720,460,6,1],[1160,820,7,.6],[2650,2800,9,.35]]){const b=c.createBiquadFilter();b.type='bandpass';b.Q.value=q;b.frequency.setValueAtTime(a1,t);b.frequency.linearRampToValueAtTime(a2,t+Math.max(.1,dur*.8));const bg=c.createGain();bg.gain.value=amp*3.2;g.connect(b);b.connect(bg);bg.connect(AU.mus);}
  o.start(t);o.stop(t+dur+.2);nz(AU.mus,t,.06,'bandpass',3000,0,gain*.15,2);}
function inst(kind,f,t,dur,gain,syl){
  switch(kind){
    case 'chanter':{if(AU.style&&AU.style.cr){const sy=syl||LYR.lead[AU.syl%LYR.lead.length];AU.syl++;voice(f*2,t,dur,gain*1.55,AU.lastF,sy,1);}else chant(f*2,t,dur,gain*1.7,AU.lastF);break;}
    case 'chorus':{const d=Math.max(dur,.4),sy=syl||LYR.chorus[AU.csyl%LYR.chorus.length];AU.csyl++;const j=()=>Math.random()*.035;voice(f*2,t+j(),d,gain*.6,0,sy,3);voice(f*2,t+j(),d,gain*.55,0,sy,3);voice(f,t+j(),d,gain*.65,0,sy,3);break;}
    case 'trumpet':brass(f*2,t,dur,gain*.8,3200);break;
    case 'brass':brass(f,t,dur,gain*.9,2100);brass(f/2,t,dur,gain*.45,1200);break;
    case 'horn':brass(f,t,dur,gain*.9,1500);break;
    case 'lowbrass':brass(f*2,t,dur,gain*.8,1300);brass(f,t,dur,gain*.55,900);break;
    case 'harp':pluck(f*2,t,dur,gain*1.1,.5,.998,4000);pluck(f,t+.012,dur,gain*.45,.45,.998,2400);break;
    case 'choir':choir(f,t,Math.max(dur,.4),gain*.9);break;
    case 'strings':for(const d of [-8,0,8]){const o=mnote(f*2,t,dur,'sawtooth',gain*.24,2600,.08,dur*.4,d);vib(o,t,dur,5.5,f*.02,.2);}break;
    case 'flute':flute(f*2,t,dur,gain);break;
    case 'ney':flute(f*2,t,dur,gain*1.05,1);break;
    case 'zurna':reed(f*2,t,dur,gain*.55,'zurna');break;
    case 'clarinet':reed(f*2,t,dur,gain*.7,'clarinet');break;
    case 'harmonium':reed(f*2,t,dur,gain*.55,'harmonium');break;
    case 'bowed':bowed(f*2,t,dur,gain*.6,AU.lastF);break;
    case 'synth':synthLead(f*2,t,dur,gain);break;
    case 'oud':pluck(f,t,dur,gain*1.4,.32,.995,2200);if(dur>.45)pluck(f,t+dur*.5,dur*.5,gain*.8,.32,.995,2200);break;
    case 'santur':{const n=dur>.3?Math.max(2,Math.round(dur/.075)):1;for(let k=0;k<n;k++)pluck(f*2,t+k*.075,.25,gain*(k%2?.55:.8)*(1-k/(n+2)),.85,.997,7000);break;}
    case 'qanun':pluck(f*2,t,dur,gain*1.1,.75,.996,5200);pluck(f,t,dur,gain*.4,.6,.996,3000);break;
    case 'guzheng':pluck(f*2,t,dur,gain*1.2,.6,.998,4800,1.06,1);break;
    case 'gayageum':pluck(f,t,dur,gain*1.4,.45,.998,3600,.95,1);break;
    case 'bandura':pluck(f*2,t,dur,gain*1.1,.55,.998,4200);pluck(f,t+.01,dur,gain*.5,.5,.998,2500);break;
    case 'tres':pluck(f*2,t,dur,gain,.65,.995,4000);pluck(f*2,t+.012,dur,gain*.8,.65,.995,4000,0,1.004);break;
    case 'sitar':pluck(f*2,t,dur,gain*1.1,.75,.9985,5200,1.045,1);pluck(f*4,t+.02,dur*.6,gain*.15,.9,.999,8000);break;
    default:brass(f,t,dur,gain,1800);}
  AU.lastF=f*2;}
function drum(t,k,g=1){
  switch(k){
    // latmiya percussion: Q dammam (deep barrel drum of the Bushehri sanj-o-dammam), Z sanj (pair of hand cymbals),
    // W group hand-claps, M a lighter single chest-beat for off-beats
    case 'Q':osc(AU.mus,t,'sine',64,40,.7,1.15*g,.003);nz(AU.mus,t,.35,'lowpass',220,70,.55*g,.6,AU.brown);nz(AU.mus,t,.025,'bandpass',700,0,.25*g,1.2);break;
    case 'Z':nz(AU.mus,t,.55,'bandpass',5200,3800,.24*g,1.4);nz(AU.mus,t,.3,'highpass',7500,5000,.16*g,.6);osc(AU.mus,t,'square',1830,1790,.18,.04*g,.001);osc(AU.mus,t,'square',2470,2440,.14,.03*g,.001);break;
    case 'W':for(let k=0;k<6;k++){const tt=t+Math.random()*.025;nz(AU.mus,tt,.05,'bandpass',1400+Math.random()*900,0,.22*g,1.8);}break;
    case 'M':{const tt=t+Math.random()*.02;osc(AU.mus,tt,'sine',96,52,.18,.42*g,.003);nz(AU.mus,tt,.08,'lowpass',420,140,.3*g,.7);break;}
    case 'K':osc(AU.mus,t,'sine',110,38,.45,1.0*g,.002);nz(AU.mus,t,.06,'lowpass',900,0,.35*g);break;
    case 'L':for(let k=0;k<4;k++){const tt=t+Math.random()*.03;osc(AU.mus,tt,'sine',88,46,.24,.7*g,.003);nz(AU.mus,tt,.11,'lowpass',380,120,.5*g,.7);nz(AU.mus,tt,.035,'bandpass',950,0,.22*g,1.5);}break;
    case 'S':nz(AU.mus,t,.22,'bandpass',1700,900,.55*g,.9);osc(AU.mus,t,'triangle',220,140,.08,.25*g);break;
    case 's':nz(AU.mus,t,.1,'bandpass',2200,1200,.18*g,.9);break;
    case 'H':nz(AU.mus,t,.04,'highpass',7000,0,.18*g);break;
    case 'D':osc(AU.mus,t,'sine',95,70,.35,.9*g,.002);nz(AU.mus,t,.05,'lowpass',500,0,.2*g);break;
    case 'T':nz(AU.mus,t,.07,'bandpass',3200,0,.4*g,2.5);osc(AU.mus,t,'sine',520,480,.05,.12*g);break;
    case 'B':osc(AU.mus,t,'sine',72,34,.9,1.2*g,.003);nz(AU.mus,t,.5,'lowpass',260,60,.5*g,.6,AU.brown);nz(AU.mus,t,.03,'bandpass',900,0,.3*g,1);break;
    case 'F':osc(AU.mus,t,'sine',120,85,.4,.7*g,.003);nz(AU.mus,t,.12,'bandpass',800,0,.3*g,1.5);break;
    case 'R':nz(AU.mus,t,.035,'bandpass',2500,0,.5*g,6);osc(AU.mus,t,'sine',1800,1700,.03,.15*g);break;
    case 'C':osc(AU.mus,t,'sine',210,190,.25,.55*g,.002);nz(AU.mus,t,.03,'bandpass',1200,0,.15*g,2);break;
    case 'c':osc(AU.mus,t,'sine',360,330,.14,.45*g,.002);nz(AU.mus,t,.025,'bandpass',2600,0,.18*g,2);break;
    case 'G':for(const [r,a] of [[1,.4],[1.48,.25],[2.1,.18],[2.76,.12]])osc(AU.mus,t,'sine',90*r,88*r,3.5,a*g,.01);nz(AU.mus,t,1.5,'bandpass',600,300,.2*g,1);break;
    case 'P':{const f=(AU.style?AU.style.root:55)*1.5;osc(AU.mus,t,'sine',f*1.04,f,1.2,.9*g,.004);osc(AU.mus,t,'sine',f*2.01,f*2,.6,.25*g,.004);nz(AU.mus,t,.2,'lowpass',400,100,.3*g,.7);break;}
    case 'N':osc(AU.mus,t,'sine',620,600,.18,.4*g,.002);osc(AU.mus,t,'sine',1250,1240,.08,.15*g,.002);nz(AU.mus,t,.02,'bandpass',3000,0,.12*g,3);break;
    case 'g':{const c=AU.ctx,o=c.createOscillator(),gg=c.createGain();o.type='sine';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(115,t+.25);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.8*g,t+.004);gg.gain.exponentialRampToValueAtTime(.0005,t+.5);o.connect(gg);gg.connect(AU.mus);o.start(t);o.stop(t+.55);break;}}}
// Epic war layer shared by every score: war drums and taiko rolls, low string ostinato, brass stabs,
// cymbal swells into each section and a battle choir. Latmiyas keep their chanter, chorus and chest-beats on top.
function crash(t,g){nz(AU.mus,t,2.2,'highpass',5000,2500,.22*g,.5);nz(AU.mus,t,1.4,'bandpass',3200,1800,.12*g,.8);}
function swell(t,dur,g){const c=AU.ctx,s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(800,t);f.frequency.exponentialRampToValueAtTime(7000,t+dur);
  const gg=c.createGain();gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.16*g,t+dur);gg.gain.linearRampToValueAtTime(0,t+dur+.03);s.connect(f);f.connect(gg);gg.connect(AU.mus);s.start(t);s.stop(t+dur+.05);}
// ===== Big modern war-film scoring (every nation, latmiyas included) =====
// Built in layers that stack section by section: a sub drone and low piano pulse, then driving spiccato string
// ostinatos in 3+3+2, then taiko ensembles and huge low-brass "braams", and in the finale the faction's own theme
// played slow and enormous by eight horns over choir. Slow chord changes and pedal tones keep it heavy.
function shaper(){const c=AU.ctx;if(AU.shC!==c){AU.shC=c;const n=1024,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cv[i]=Math.tanh(2.2*x)/Math.tanh(2.2);}AU.sh=cv;}return AU.sh;}
function braam(f,t,dur,gain){const c=AU.ctx,g=c.createGain(),lp=c.createBiquadFilter(),ws=c.createWaveShaper();ws.curve=shaper();lp.type='lowpass';lp.Q.value=2.5;
  lp.frequency.setValueAtTime(140,t);lp.frequency.exponentialRampToValueAtTime(1700,t+.35);lp.frequency.exponentialRampToValueAtTime(420,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.09);g.gain.setValueAtTime(gain,t+dur*.45);g.gain.exponentialRampToValueAtTime(.0005,t+dur+.4);
  for(const [r,d,a] of [[.5,-9,1],[.5,8,1],[1,-5,.8],[1,6,.8],[1.5,0,.45],[2,-3,.3],[2,4,.3]]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f*r;o.detune.value=d;const og=c.createGain();og.gain.value=a*.22;o.connect(og);og.connect(ws);o.start(t);o.stop(t+dur+.5);}
  ws.connect(lp);lp.connect(g);panTo(g,0);}
function hornsec(f,t,dur,gain){const c=AU.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=1;lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(1500,t+Math.min(1,dur*.5));lp.frequency.linearRampToValueAtTime(900,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(.35,dur*.3));g.gain.setValueAtTime(gain*.92,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0005,t+dur+.35);
  let k=0;for(const d of [-12,-7,-3,0,3,7,12,16]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;vib(o,t,dur,4.6+k*.11,f*.003,.5);const og=c.createGain();og.gain.value=.11;o.connect(og);og.connect(lp);o.start(t);o.stop(t+dur+.4);k++;}
  const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f/2;const g2=c.createGain();g2.gain.value=.35;o2.connect(g2);g2.connect(lp);o2.start(t);o2.stop(t+dur+.4);lp.connect(g);panTo(g,0);}
function spicc(f,t,gain,pan){const c=AU.ctx,g=c.createGain(),bp=c.createBiquadFilter();bp.type='lowpass';bp.frequency.value=2600;bp.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0005,t+.16);
  for(const d of [-8,0,7]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;o.connect(bp);o.start(t);o.stop(t+.2);}bp.connect(g);panTo(g,pan||0);}
function taiko(t,g,low){osc(AU.mus,t,'sine',low?58:82,low?32:44,low?1.4:.8,1.25*g,.002);osc(AU.mus,t+.004,'sine',low?92:120,60,.3,.6*g,.002);nz(AU.mus,t,low?.9:.5,'lowpass',low?240:380,60,.75*g,.6,AU.brown);nz(AU.mus,t,.03,'bandpass',1400,0,.25*g,1.2);}
function pianoLow(f,t,gain){osc(AU.mus,t,'triangle',f,f,2.2,gain,.004);osc(AU.mus,t,'sine',f*2,f*2,1.4,gain*.35,.004);osc(AU.mus,t,'sine',f*3.01,f*3.01,.6,gain*.08,.004);}
function riser(t,dur,g){swell(t,dur,g);const c=AU.ctx,o=c.createOscillator(),gg=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(640,t+dur);
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(4000,t+dur);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.07*g,t+dur);gg.gain.linearRampToValueAtTime(0,t+dur+.02);o.connect(lp);lp.connect(gg);gg.connect(AU.mus);o.start(t);o.stop(t+dur+.05);}
const OST=[1,0,0,.7,0,0,.85,0,1,0,0,.7,0,0,.85,.5];
// Each nation keeps its own voice inside the big score: a folk instrument doubles the string ostinato and a national
// percussion section drives the battle sections (military snare, davul, darbuka, tabla, war drums, congas...).
const REGO={US:['','field'],EU:['harp','timp'],IL:['qanun','darbuka'],TR:['santur','davul'],UA:['bandura','snare'],RU:['lowbrass','march'],IR:['santur','dammam'],SA:['oud','darbuka'],AE:['qanun','darbuka'],
  PK:['sitar','tabla'],IN:['sitar','tabla'],CN:['guzheng','wardrum'],KP:['','parade'],KR:['gayageum','buk'],EG:['qanun','darbuka'],CU:['tres','conga'],RS:['qanun','daf'],DW:['oud','darbuka']};
const RPERC={snare:{s:[1,3,5,7,9,11,13,15],S:[4,12]},field:{S:[4,12],s:[2,3,6,9,10,11,14,15]},timp:{P:[0,6,8],s:[4,12]},march:{B:[0,8],S:[4,12],s:[14]},
  parade:{B:[0,8],S:[4,12],s:[2,6,10,14]},daf:{F:[0,3,6,10,12],M:[8]},davul:{B:[0,8],T:[3,6,10,13]},darbuka:{D:[0,8],T:[4,6,12,14],R:[15]},dammam:{Q:[0,6,8],Z:[4,12]},
  tabla:{g:[0,6,8],N:[3,4,10,12,14]},wardrum:{B:[0,6,8],K:[12]},buk:{F:[0,3,6,10],B:[8]},conga:{C:[0,7,8],c:[3,6,11,14,15]}};// 3+3+2 accents across a bar of sixteenths
function bigScore(t,i,bar,sec,ch,hz,S,sp,intense){const lat=!!S.cr,lv=(lat?.7:1)*.8,root=hz(ch),pb=Math.floor(bar/8)*8,bi=bar-pb;
  // sub drone on the tonic, always present
  if(i===0&&bar%4===0){mnote(S.root/2,t,sp*64,'sine',.38*lv,160,1.2,sp*16);mnote(S.root,t,sp*64,'sawtooth',.06*lv,260,2,sp*16);}
  // section downbeats: braam + taiko + gong; riser into every new section
  if(i===0&&bi===0){braam(root,t,sp*20,(sec===0?.16:.26)*lv);taiko(t,1.1*lv,1);crash(t,.7*lv);if(sec>=2)drum(t,'G',.6*lv);}
  if(bi===7&&i===0)riser(t,sp*16,.9*lv);
  // section 0: lonely low piano pulse
  if(sec===0&&i%4===0&&!lat)pianoLow(root,t,(i===0?.22:.12));
  // ostinato strings from section 1, doubling an octave up in the battle sections
  if(sec>=1&&!(lat&&sec===1&&i%2)){const a=OST[i];if(a){const step=[0,0,4,0,0,4,7,4][i%8],f=root*Math.pow(2,0)*(step===7?2:1)*(step===4?Math.pow(2,(S.scale[(4)%S.scale.length]-S.scale[0])/12):1);
      spicc(root*2*(i%8===6?1.5:1),t,.11*a*lv,-.4);if(sec>=2)spicc(root*4*(i%8===6?1.5:1),t,.07*a*lv,.4);if(sec>=2)mnote(root/2,t,sp*1.2,'sawtooth',.11*a*lv,380,.004,sp*.8);}}
  // national folk instrument doubling the ostinato, and the national percussion section
  {const R=REGO[AU.fac]||['',''];if(R[0]&&sec>=1&&i%2===0&&OST[i]){inst(R[0],root*(i%8===6?1.5:1),t,sp*1.6,(sec>=2?.15:.12)*lv);}
   const P=RPERC[R[1]];if(P&&sec>=1){for(const k in P)if(P[k].includes(i))drum(t,k,(sec>=2?.75:.5)*(k==='s'?.45:1)*lv);}}
  natColour(t,i,bar,sec,ch,hz,S,sp,lv);
  // taiko ensemble groove in the battle sections, with rolls into each phrase
  if(sec>=2){if(i===0||i===10)taiko(t,(i===0?1:.75)*lv,1);if(i===6||i===14)taiko(t,.55*lv,0);if(intense&&(i===3||i===12))taiko(t,.4*lv,0);if(bi===7&&i>=8&&i%2===0)taiko(t,(.4+.08*(i-8))*lv,0);}
  else if(sec===1&&(i===0||i===8))taiko(t,.55*lv,1);
  // low brass power chords every two bars from section 2
  if(sec>=2&&i===0&&bar%2===0){braam(root,t,sp*30,.13*lv);hornsec(root*2,t,sp*30,.06*lv);hornsec(hz(ch+4)*2,t,sp*30,.045*lv);}
  // finale: the faction's theme, slow and huge on eight horns over a battle choir
  if(sec===3&&!lat&&i===0&&bar%8===0){let st=t;const aug=2;for(const [d,l] of S.motif.slice(0,8)){hornsec(hz(d)*2,st,sp*l*aug*.95,.075);st+=sp*l*aug;}}
  if(sec===3&&i===0&&bar%4===0){choir(root*2,t,sp*60,.07*lv);choir(hz(ch+2)*2,t,sp*60,.05*lv);choir(hz(ch+4)*2,t,sp*60,.05*lv);}
  if(sec===0&&bar%2===0&&i===0)strings(root,t,sp*32,.16*lv);}
function epic(t,i,bar,sec,ch,hz,S,sp,intense){const lat=!!S.cr,g=lat?.75:1;
  if(lat){// mourning strings under the whole piece, swelling with each section; low horns and a huge choir in the finale
    if(i===0&&bar%2===0){const dur=sp*32,k=[.55,.8,1,1.15][sec];strings(hz(ch)*2,t,dur,.2*k);strings(hz(ch+2)*2,t,dur,.15*k);strings(hz(ch)*1,t,dur,.18*k);if(sec>=2)strings(hz(ch+4)*4,t,dur,.1*k);}
    if(sec>=2&&i===0&&bar%4===0){inst('horn',hz(ch)*.5,t,sp*30,.13);inst('horn',hz(ch+4)*.5,t,sp*30,.08);}
    if(sec===3&&i===0&&bar%4===0){choir(hz(ch)*2,t,sp*60,.075);choir(hz(ch+2)*2,t,sp*60,.055);choir(hz(ch+4)*2,t,sp*60,.05);choir(hz(ch),t,sp*60,.06);}
    if(sec>=1&&i===0&&bar%4===0)drum(t,'G',.55);}
  if(i===0&&bar%8===0)crash(t,lat?.6:1);
  if(i===8&&bar%8===7)swell(t,sp*8,lat?.6:1);
  if(sec>=1&&(i===0||i===8))drum(t,'B',(intense?.85:.6)*g);
  if(intense&&(i===6||i===14)&&!lat)drum(t,'B',.5);
  if(bar%8===7&&i>=12)drum(t,'B',.35+.1*(i-12));
  if(intense&&!lat&&i%1===0&&(sec===2||sec===3)){const acc=i%4===0?1:.55;mnote(hz(ch)*(i%8<4?1:1),t,sp*.9,'sawtooth',.075*acc,900,.004,sp*.6,-6);mnote(hz(ch)*2,t,sp*.9,'sawtooth',.045*acc,1200,.004,sp*.6,6);}
  if(lat&&intense&&i%2===0){mnote(hz(ch),t,sp*1.8,'sawtooth',.07,700,.004,sp*1.2);}
  if((sec===2||sec===3)&&i===0&&bar%2===0){for(const d of [0,2,4])brass(hz(ch+d)*2,t,sp*3,lat?.05:.08,1800);brass(hz(ch),t,sp*4,lat?.06:.09,900);}
  if(sec===3&&i===0&&bar%4===0&&!lat){choir(hz(ch)*2,t,sp*60,.06);choir(hz(ch+2)*2,t,sp*60,.045);choir(hz(ch+4)*2,t,sp*60,.045);}
  if(sec===0&&bar%2===0&&i===0)mnote(hz(ch)*.5,t,sp*32,'sawtooth',.1,240,.6,sp*12);
  if(!lat&&sec>=1&&i%2===0){const seq=[0,2,4,7,4,2,7,9];const d=ch+seq[(i/2)%8];pluck(hz(d)*4,t,sp*2.2,.13*(i%4===0?1:.75),.75,.997,6500,0,0,(i%4===0?-.45:.45));}
  if(!lat&&sec===3&&i===0&&bar%2===0){brass(hz(ch+4)*2,t,sp*30,.055,1400);brass(hz(ch+2)*4,t,sp*30,.035,1800);}}
// Each piece plays on its own lane into the music bus. Starting a new piece fades the old lane out while the new one
// fades in, so notes already scheduled (and long pad tails) don't clash with the next tune.
function musLane(fade){const c=AU.ctx,g=c.createGain(),og=c.createGain();g.connect(og);og.connect(AU.musBus);g.og=og;if(fade>0){g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(1,c.currentTime+fade);}else g.gain.value=1;return g;}
function musXfade(){const c=AU.ctx,o=AU.mus;if(!o||o===AU.musBus)return;o.gain.cancelScheduledValues(c.currentTime);o.gain.setValueAtTime(Math.max(.0001,o.gain.value),c.currentTime);o.gain.exponentialRampToValueAtTime(.0001,c.currentTime+2.2);
  setTimeout(()=>{try{o.disconnect();}catch(e){}},9000);AU.mus=musLane(AU.timer?1.6:.4);}
function startMusic(style,calm){if(!AU.ctx)return;musXfade();AU.calm=!!calm;AU.pl=PLAYLIST[style]||(!calm&&STYLES[style+'_b']?[style,style+'_b']:[style]);AU.fac=style;AU.pi=0;AU.syl=0;AU.csyl=0;AU.style=STYLES[AU.pl[0]]||STYLES.US;AU.step=4*16;AU.next=AU.ctx.currentTime+.3;AU.mi=4;AU.bar=0;AU.mq=[];AU.lastF=0;AU.mL={};musOG();clearInterval(AU.timer);AU.timer=setInterval(musicTick,50);}
// each piece's own output level (regional scores are sparser than the orchestral ones, so they're lifted to match)
function musOG(){try{const S=AU.style,og=AU.mus&&AU.mus.og;if(!og||!S)return;og.gain.setTargetAtTime((S.og||1)*(AU.calm&&S.ogc?S.ogc:1),AU.ctx.currentTime,.3);}catch(e){}}
function stopMusic(){clearInterval(AU.timer);AU.timer=null;}
function queueMotif(at,S,instr,oct,gain,mo){mo=mo||S.motif;let st=at;const ly=S.cr&&(instr==='chanter'||instr==='chorus')?lyricFor(mo.length,instr==='chanter'?'lead':'chorus',mo):null;mo.forEach(([d,l],k)=>{AU.mq.push({st,d,l,instr,oct,gain,syl:ly?ly[k]:null});st+=l;});return st;}
function musicTick(){if(!AU.ctx||!AU.style)return;const S=AU.style,sp=60/(S.bpm*(AU.calm?.9:1))/4,n=S.scale.length;AU.heat=Math.max(0,AU.heat-.0012);
  const hz=deg=>S.root*Math.pow(2,(S.scale[((deg%n)+n)%n]+12*Math.floor(deg/n))/12);
  {const now=AU.ctx.currentTime;if(AU.next<now-.05){const miss=Math.ceil((now+.05-AU.next)/sp);AU.next+=miss*sp;AU.step+=miss;}}
  while(AU.next<AU.ctx.currentTime+1){
    // after each full piece (4 sections of 8 bars) move on to the faction's next track
    if(AU.step%512===0&&AU.step>64&&AU.pl&&AU.pl.length>1&&AU.swAt!==AU.step){AU.swAt=AU.step;AU.pi=(AU.pi+1)%AU.pl.length;AU.style=STYLES[AU.pl[AU.pi]]||AU.style;AU.mq=[];musOG();
      try{if(typeof pushLog==='function'&&AU.musicOn&&!AU.calm&&AU.style.name)pushLog('♪ '+AU.style.name);}catch(e){}return musicTick();}
    const t=AU.next,i=AU.step%16,bar=Math.floor(AU.step/16),sec=Math.floor(bar/8)%(AU.calm?2:4),intense=!AU.calm&&(sec===2||sec===3||AU.heat>.35);
    const ch=S.prog[Math.floor(bar/2)%S.prog.length];
    // pads and drones
    if(i===0&&bar%2===0){const dur=sp*32;if(S.pad==='strings'){strings(hz(ch)*2,t,dur,.38);strings(hz(ch+4)*2,t,dur,.26);strings(hz(ch+2)*4,t,dur,.2);if(!S.cr)strings(hz(ch)*4,t,dur,.12);}else if(S.pad==='choir'){choir(hz(ch)*2,t,dur,.1);choir(hz(ch+2)*2,t,dur,.07);choir(hz(ch+4)*2,t,dur,.07);}
      if(S.bass!=='drone')mnote(hz(ch),t,dur,'sine',.32,300,.4);}
    if(S.drone==='hum'){if(i===0&&bar%4===0){choir(S.root*2,t,sp*64,.09);choir(S.root*3,t,sp*64,.045);}}
    else if(S.drone&&!S.me){if(S.lead==='sitar'||S.lead==='harmonium'){if(i%4===0){const k=(i/4)|0;pluck(S.root*(k===0?1.5:1)*2,t,sp*4,.32,.4,.999,2400);}}else if(i===0&&bar%4===0){mnote(S.root,t,sp*64,'sawtooth',.13,380,1.5,sp*20,-4);mnote(S.root*1.5,t,sp*64,'sawtooth',.07,420,1.5,sp*20,4);mnote(S.root*2,t,sp*64,'sine',.16,600,1.5,sp*20);}}
    // percussion
    const pat=S.perc[intense?1:0];const k=pat[i];if(k!=='.')drum(t,k,intense?1:S.me&&!S.cr&&sec===0?.4:.7);if(intense&&i%2===1&&(S.bass==='ost'||S.bass==='walk'))drum(t,'H',.5);if(intense&&i===0&&bar%8===0)drum(t,S.perc[0][0]==='G'?'G':'B',.8);
    // bass lines
    if(S.bass==='ost'&&AU.big===false&&(intense||sec===1)&&i%2===0){const d=(i%8===6)?ch+4:ch;mnote(hz(d),t,sp*1.6,'sawtooth',.15,520,.005,sp*1.2);}
    else if(S.bass==='walk'&&sec>0&&i%4===0){mnote(hz(ch+[0,2,4,5][i/4])*.5*2,t,sp*3.6,'triangle',.3,700,.01,sp*2);}
    else if(S.bass==='tumbao'&&(i===6||i===12||i===15&&intense)){mnote(hz(i===12?ch+4:ch),t,sp*3,'triangle',.4,800,.005,sp*2);mnote(hz(i===12?ch+4:ch)*2,t,sp*2,'sine',.12,1500,.005,sp*1.5);}
    // signature melody: theme section on the lead, anthem section on the second instrument with the lead doubling
    if(i===0&&(sec===1&&bar%4===0||sec===3&&bar%4===0||sec===0&&bar===6)){const mlen=S.motif.reduce((a,m)=>a+m[1],0);if(!AU.mq.some(q=>q.st>=AU.step)){if(S.cr){const e=queueMotif(AU.step,S,S.lead,1,sec===0?.17:.22);if(sec!==0){const e2=queueMotif(e,S,S.lead2,1,.2,S.resp);if(S.resp)queueMotif(e2,S,S.lead2,1,.2,S.resp);}}else if(sec===3){queueMotif(AU.step,S,S.lead2,1,.2);queueMotif(AU.step,S,S.lead,2,.12);}else queueMotif(AU.step,S,S.lead,1,sec===0?.15:.21);}}
    let motifNow=false;for(const q of AU.mq){if(q.st===AU.step){motifNow=true;if(q.d!=null){inst(q.instr,hz(q.d)*(q.oct===2?2:1),t,sp*q.l*(q.syl&&q.syl[0]==='~'?1.02:.95),q.gain,q.syl);if(q.instr==='chorus'&&q.syl&&q.syl[0]!=='~'&&S.perc[0][i]==='.')drum(t,'L',.6);}}else if(q.st<AU.step&&q.st+q.l>AU.step)motifNow=true;}
    AU.mq=AU.mq.filter(q=>q.st+q.l>AU.step);
    if(S.cr&&!motifNow&&(i===4||i===10)&&Math.random()<(sec===0?.75:.4)){const top=4+(Math.random()*2|0);const fi=S.fill||'ney';inst(fi,hz(top),t,sp*3.5,.13);inst(fi,hz(top-1),t+sp*3.5,sp*5,.12);}
    // improvised lead in the battle section, built around the theme's notes
    if(!motifNow&&sec===2){const on=(i===0||i===6||i===8||i===12)?.7:(i%2===0?.22:0);if(Math.random()<on){AU.mi=Math.max(-1,Math.min(11,AU.mi+[-2,-1,-1,0,1,1,2,3][Math.random()*8|0]));if(Math.random()<.35){const m=S.motif[Math.random()*S.motif.length|0];AU.mi=m[0];}
      const len=(i===0||i===8)?sp*(Math.random()<.5?6:4):sp*2;inst(S.lead,hz(AU.mi),t,len,intense?.2:.16);}}
    if(intense&&i===0&&bar%4===0&&S.bass==='ost'){for(const d of [0,2,4])mnote(hz(ch+d)*2,t,sp*3,'sawtooth',.13,2200,.01,sp*2.5);}
    if(S.me)meScore(t,i,bar,sec,ch,hz,S,sp,intense);else if(AU.big!==false)bigScore(t,i,bar,sec,ch,hz,S,sp,intense);else epic(t,i,bar,sec,ch,hz,S,sp,intense);
    AU.next+=sp;AU.step++;}}

// ===== Sampled orchestra =====
// Real recorded instruments (FluidR3 GM soundfont, MIT licence) replace the oscillator voices once the sample sheet
// mus/smp.mp3 has loaded: string ensemble, cellos and basses, violin, choir, horns, trombones, trumpets, tuba,
// timpani, taiko, piano, flute, pan flute (ney), shehnai (zurna), clarinet, accordion (harmonium), sitar, koto
// (qanun / guzheng / gayageum), harp (bandura), nylon guitar (oud / tres) and pizzicato. Sustained notes loop a
// cross-faded section, so a chord can hold for as long as the score asks. Synth voices stay as the fallback.
const SMP_META={"acc":[{"m":48,"o":0.0,"n":2.75,"l":[1.0,2.75],"r":0.229},{"m":54,"o":2.95,"n":2.75,"l":[1.0,2.75],"r":0.221},{"m":60,"o":5.9,"n":2.75,"l":[1.0,2.75],"r":0.204},{"m":66,"o":8.8501,"n":2.75,"l":[1.0,2.75],"r":0.233},{"m":72,"o":11.8001,"n":2.75,"l":[1.0,2.75],"r":0.159}],"pno":[{"m":24,"o":14.7501,"n":3.1,"l":null,"r":0.322},{"m":30,"o":18.0501,"n":3.1,"l":null,"r":0.321},{"m":36,"o":21.3501,"n":3.1,"l":null,"r":0.246},{"m":42,"o":24.6501,"n":3.1,"l":null,"r":0.3},{"m":48,"o":27.9501,"n":3.1,"l":null,"r":0.199}],"gtr":[{"m":36,"o":31.2501,"n":2.2,"l":null,"r":0.308},{"m":42,"o":33.6501,"n":2.2,"l":null,"r":0.302},{"m":48,"o":36.0501,"n":2.2,"l":null,"r":0.267},{"m":54,"o":38.4501,"n":2.2,"l":null,"r":0.294},{"m":60,"o":40.8501,"n":2.2,"l":null,"r":0.198},{"m":66,"o":43.2501,"n":2.2,"l":null,"r":0.152}],"cel":[{"m":36,"o":45.6501,"n":2.75,"l":[1.0,2.75],"r":0.157},{"m":42,"o":48.6001,"n":2.75,"l":[1.0,2.75],"r":0.199},{"m":48,"o":51.5502,"n":2.75,"l":[1.0,2.75],"r":0.219},{"m":54,"o":54.5002,"n":2.75,"l":[1.0,2.75],"r":0.328},{"m":60,"o":57.4502,"n":2.75,"l":[1.0,2.75],"r":0.274}],"cho":[{"m":48,"o":60.4002,"n":2.75,"l":[1.0,2.75],"r":0.188},{"m":54,"o":63.3502,"n":2.75,"l":[1.0,2.75],"r":0.173},{"m":60,"o":66.3003,"n":2.75,"l":[1.0,2.75],"r":0.184},{"m":66,"o":69.2503,"n":2.75,"l":[1.0,2.75],"r":0.246},{"m":72,"o":72.2003,"n":2.75,"l":[1.0,2.75],"r":0.215}],"cla":[{"m":54,"o":75.1503,"n":2.75,"l":[1.0,2.75],"r":0.289},{"m":60,"o":78.1004,"n":2.75,"l":[1.0,2.75],"r":0.362},{"m":66,"o":81.0504,"n":2.75,"l":[1.0,2.75],"r":0.32},{"m":72,"o":84.0004,"n":2.75,"l":[1.0,2.75],"r":0.449},{"m":78,"o":86.9504,"n":2.75,"l":[1.0,2.75],"r":0.451}],"cbs":[{"m":36,"o":89.9005,"n":2.75,"l":[1.0,2.75],"r":0.363},{"m":42,"o":92.8505,"n":2.75,"l":[1.0,2.75],"r":0.328},{"m":48,"o":95.8005,"n":2.75,"l":[1.0,2.75],"r":0.297}],"flt":[{"m":60,"o":98.7505,"n":2.75,"l":[1.0,2.75],"r":0.326},{"m":66,"o":101.7005,"n":2.75,"l":[1.0,2.75],"r":0.362},{"m":72,"o":104.6506,"n":2.75,"l":[1.0,2.75],"r":0.354},{"m":78,"o":107.6006,"n":2.75,"l":[1.0,2.75],"r":0.418},{"m":84,"o":110.5506,"n":2.75,"l":[1.0,2.75],"r":0.477}],"hrn":[{"m":36,"o":113.5006,"n":2.75,"l":[1.0,2.75],"r":0.232},{"m":42,"o":116.4507,"n":2.75,"l":[1.0,2.75],"r":0.262},{"m":48,"o":119.4007,"n":2.75,"l":[1.0,2.75],"r":0.217},{"m":54,"o":122.3507,"n":2.75,"l":[1.0,2.75],"r":0.247},{"m":60,"o":125.3007,"n":2.75,"l":[1.0,2.75],"r":0.284},{"m":66,"o":128.2507,"n":2.75,"l":[1.0,2.75],"r":0.326}],"kot":[{"m":48,"o":131.2008,"n":3.1,"l":null,"r":0.146},{"m":54,"o":134.5008,"n":3.1,"l":null,"r":0.123},{"m":60,"o":137.8008,"n":3.1,"l":null,"r":0.105},{"m":66,"o":141.1008,"n":3.1,"l":null,"r":0.096},{"m":72,"o":144.4008,"n":3.1,"l":null,"r":0.115},{"m":78,"o":147.7008,"n":3.1,"l":null,"r":0.094}],"hrp":[{"m":36,"o":151.0008,"n":3.1,"l":null,"r":0.243},{"m":42,"o":154.3008,"n":3.1,"l":null,"r":0.206},{"m":48,"o":157.6008,"n":3.1,"l":null,"r":0.249},{"m":54,"o":160.9008,"n":3.1,"l":null,"r":0.268},{"m":60,"o":164.2008,"n":3.1,"l":null,"r":0.32},{"m":66,"o":167.5008,"n":3.1,"l":null,"r":0.189},{"m":72,"o":170.8008,"n":3.1,"l":null,"r":0.156}],"pfl":[{"m":60,"o":174.1008,"n":2.75,"l":[1.0,2.75],"r":0.388},{"m":66,"o":177.0508,"n":2.75,"l":[1.0,2.75],"r":0.391},{"m":72,"o":180.0008,"n":2.75,"l":[1.0,2.75],"r":0.383},{"m":78,"o":182.9508,"n":2.75,"l":[1.0,2.75],"r":0.401},{"m":84,"o":185.9009,"n":2.75,"l":[1.0,2.75],"r":0.421}],"piz":[{"m":36,"o":188.8509,"n":2.2,"l":null,"r":0.226},{"m":42,"o":191.2509,"n":2.2,"l":null,"r":0.244},{"m":48,"o":193.6509,"n":2.2,"l":null,"r":0.236},{"m":54,"o":196.0509,"n":2.2,"l":null,"r":0.18},{"m":60,"o":198.4509,"n":2.2,"l":null,"r":0.213},{"m":66,"o":200.8509,"n":2.2,"l":null,"r":0.151},{"m":72,"o":203.2509,"n":2.2,"l":null,"r":0.149}],"shn":[{"m":60,"o":205.6509,"n":2.75,"l":[1.0,2.75],"r":0.262},{"m":66,"o":208.6009,"n":2.75,"l":[1.0,2.75],"r":0.275},{"m":72,"o":211.5509,"n":2.75,"l":[1.0,2.75],"r":0.233},{"m":78,"o":214.501,"n":2.75,"l":[1.0,2.75],"r":0.335}],"sit":[{"m":48,"o":217.451,"n":3.1,"l":null,"r":0.223},{"m":54,"o":220.751,"n":3.1,"l":null,"r":0.202},{"m":60,"o":224.051,"n":3.1,"l":null,"r":0.176},{"m":66,"o":227.351,"n":3.1,"l":null,"r":0.16},{"m":72,"o":230.651,"n":3.1,"l":null,"r":0.131}],"str":[{"m":48,"o":233.951,"n":2.75,"l":[1.0,2.75],"r":0.237},{"m":54,"o":236.901,"n":2.75,"l":[1.0,2.75],"r":0.188},{"m":60,"o":239.851,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":66,"o":242.801,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":72,"o":245.7511,"n":2.75,"l":[1.0,2.75],"r":0.177},{"m":78,"o":248.7011,"n":2.75,"l":[1.0,2.75],"r":0.226}],"tai":[{"m":36,"o":251.6511,"n":3.1,"l":null,"r":0.256},{"m":48,"o":254.9511,"n":3.1,"l":null,"r":0.223}],"tim":[{"m":36,"o":258.2511,"n":3.1,"l":null,"r":0.159},{"m":42,"o":261.5511,"n":3.1,"l":null,"r":0.201},{"m":48,"o":264.8511,"n":3.1,"l":null,"r":0.124}],"tbn":[{"m":36,"o":268.1511,"n":2.75,"l":[1.0,2.75],"r":0.161},{"m":42,"o":271.1011,"n":2.75,"l":[1.0,2.75],"r":0.157},{"m":48,"o":274.0512,"n":2.75,"l":[1.0,2.75],"r":0.253},{"m":54,"o":277.0012,"n":2.75,"l":[1.0,2.75],"r":0.347},{"m":60,"o":279.9512,"n":2.75,"l":[1.0,2.75],"r":0.451}],"tpt":[{"m":54,"o":282.9012,"n":2.75,"l":[1.0,2.75],"r":0.162},{"m":60,"o":285.8512,"n":2.75,"l":[1.0,2.75],"r":0.164},{"m":66,"o":288.8013,"n":2.75,"l":[1.0,2.75],"r":0.167},{"m":72,"o":291.7513,"n":2.75,"l":[1.0,2.75],"r":0.213},{"m":78,"o":294.7013,"n":2.75,"l":[1.0,2.75],"r":0.248}],"tba":[{"m":24,"o":297.6513,"n":2.75,"l":[1.0,2.75],"r":0.186},{"m":30,"o":300.6014,"n":2.75,"l":[1.0,2.75],"r":0.243},{"m":36,"o":303.5514,"n":2.75,"l":[1.0,2.75],"r":0.264},{"m":42,"o":306.5014,"n":2.75,"l":[1.0,2.75],"r":0.353}],"vln":[{"m":55,"o":309.4514,"n":2.75,"l":[1.0,2.75],"r":0.258},{"m":61,"o":312.4015,"n":2.75,"l":[1.0,2.75],"r":0.279},{"m":67,"o":315.3515,"n":2.75,"l":[1.0,2.75],"r":0.28},{"m":73,"o":318.3015,"n":2.75,"l":[1.0,2.75],"r":0.236},{"m":79,"o":321.2515,"n":2.75,"l":[1.0,2.75],"r":0.245},{"m":85,"o":324.2015,"n":2.75,"l":[1.0,2.75],"r":0.234}]};const SMP={st:null,ok:null};
const CAL={str:1,cbs:1,cel:1,vln:1,cho:1,hrn:1,tbn:1,tpt:1,tba:1,tim:1,tai:1,pno:1,flt:1,pfl:1,shn:1,cla:1,acc:1,sit:1,kot:1,hrp:1,gtr:1,piz:1};/*SMPCAL*/
const FCAL={"strings": 0.603, "choir": 1.85, "horn": 2.762, "trumpet": 3.183, "trombone": 2.486, "hornsec": 1.6, "braam": 1.453, "spicc": 1.716, "taiko": 1.595, "pianoLow": 1.167, "zurna": 2.486, "clarinet": 1.973, "harmonium": 1.896, "bowed": 3.249, "flute": 2.272, "ney": 2.049, "i_oud": 1.171, "i_tres": 1.297, "i_qanun": 1.254, "i_guzheng": 1.078, "i_gayageum": 1.591, "i_sitar": 1.141, "i_bandura": 1.455, "i_strings": 0.938};
// On phones the 3.3 MB sheet is decoded at its own 22 kHz rate (a quarter of the memory of decoding at 48 kHz); if that
// path isn't supported it falls back to the normal decode, and if decoding fails altogether (low memory) the score keeps
// playing on the synthesized instruments instead of going silent. One retry, in case the download was cut off.
function smpLoad(){if(!AU.ctx||!SMP_META.str)return;if(SMP.st==='fail'&&(SMP.tries||0)<2)SMP.st=null;if(SMP.st)return;SMP.st='loading';SMP.tries=(SMP.tries||0)+1;
  fetch('mus/smp.mp3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>{let dc=null;
    if(PHONE){try{const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(O)dc=new O(1,1,22050);}catch(e){dc=null;}}
    if(!dc)return decodeAB(AU.ctx,b);const keep=b.slice(0);return decodeAB(dc,b).catch(()=>decodeAB(AU.ctx,keep));}).then(buf=>{
    const sr=buf.sampleRate,d=buf.getChannelData(0),ok={};
    for(const k in SMP_META){ok[k]=[];for(const s of SMP_META[k]){let o=Math.floor(s.o*sr);const a=Math.max(0,o-Math.floor(.1*sr)),z=Math.min(d.length,o+Math.floor(.25*sr));
      let on=-1;for(let i=a;i<z;i++)if(Math.abs(d[i])>.004){on=i;break;}if(on>=0)o=Math.max(0,on-Math.floor(.004*sr));// mp3 decoder delay
      const n=Math.min(d.length-o,Math.floor(s.n*sr));if(n<200)continue;const b2=AU.ctx.createBuffer(1,n,sr);b2.getChannelData(0).set(d.subarray(o,o+n));ok[k].push({m:s.m,buf:b2,l:s.l,r:s.r});}}
    SMP.ok=ok;SMP.st='ok';}).catch(e=>{SMP.st='fail';audioErr('instruments',e);});}
function m2f(m){return 440*Math.pow(2,(m-69)/12);}
function sPlay(k,f,t,dur,gain,pan,att,rel,from){const L=SMP.ok&&SMP.ok[k];if(!L||!L.length||!(f>0))return null;const m=69+12*Math.log2(f/440);let b=L[0];for(const s of L)if(Math.abs(s.m-m)<Math.abs(b.m-m))b=s;
  const c=AU.ctx,src=c.createBufferSource();src.buffer=b.buf;const rt=Math.pow(2,(m-b.m)/12);
  if(from&&Math.abs(from/f-1)<.4){src.playbackRate.setValueAtTime(rt*from/f,t);src.playbackRate.exponentialRampToValueAtTime(rt,t+.09);}else src.playbackRate.value=rt;
  if(b.l){src.loop=true;src.loopStart=b.l[0];src.loopEnd=b.l[1];}
  att=att||.008;rel=rel||.25;const g=c.createGain(),v=Math.max(0,gain*(CAL[k]||1)*(.2/Math.max(.05,b.r))),end=t+Math.max(att+.01,dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.setValueAtTime(v,end);g.gain.setTargetAtTime(.0001,end,rel/3.5);
  src.connect(g);panTo(g,pan||0);src.start(t);src.stop(end+rel*1.4+.05);return src;}
// keep the synth versions, then route each voice to its recorded instrument when the samples are ready
const SYN={strings,choir,brass,reed,bowed,flute,hornsec,spicc,taiko,pianoLow,braam,inst,drum};
strings=function(f,t,dur,gain){if(!SMP.ok)return SYN.strings(f,t,dur,gain);gain*=FCAL.strings||1;const at=Math.min(.6,dur*.3),rl=Math.min(1.2,dur*.35);
  sPlay('str',f,t,dur,gain*.5,-.35,at,rl);sPlay('str',f*1.002,t+.012,dur,gain*.42,.35,at,rl);sPlay(f<110?'cbs':'cel',f/(f<220?1:2),t,dur,gain*.36,0,at,rl);SYN.strings(f,t,dur,gain*.18);};
choir=function(f,t,dur,gain){if(!SMP.ok)return SYN.choir(f,t,dur,gain);gain*=FCAL.choir||1;while(f>260)f/=2;while(f<120)f*=2;sPlay('cho',f,t,Math.max(dur,.4),gain*.85,-.25,.35,.6);sPlay('cho',f*1.003,t+.02,Math.max(dur,.4),gain*.7,.25,.4,.6);};
brass=function(f,t,dur,gain,bright){if(!SMP.ok)return SYN.brass(f,t,dur,gain,bright);gain*=FCAL[(bright>=3000?'trumpet':f<140?'trombone':'horn')]||1;const k=bright>=3000?'tpt':f<140?'tbn':'hrn';sPlay(k,f,t,dur,gain*.95,(Math.random()-.5)*.4,.03,.22);if(k!=='tpt'&&f<300)sPlay('tbn',f,t,dur,gain*.35,0,.04,.2);};
hornsec=function(f,t,dur,gain){if(!SMP.ok)return SYN.hornsec(f,t,dur,gain);gain*=FCAL.hornsec||1;while(f>420)f/=2;const at=Math.min(.35,dur*.3);sPlay('hrn',f,t,dur,gain*.55,-.4,at,.5);sPlay('hrn',f*1.003,t+.015,dur,gain*.5,.4,at,.5);sPlay('tbn',f/2,t,dur,gain*.42,0,at,.5);sPlay('tba',f/4,t,dur,gain*.3,0,at,.5);};
braam=function(f,t,dur,gain){SYN.braam(f,t,dur,SMP.ok?gain*.5:gain);if(SMP.ok){gain*=FCAL.braam||1;sPlay('tbn',f,t,dur,gain*.6,-.2,.06,.5);sPlay('tba',f/2,t,dur,gain*.55,.2,.06,.5);sPlay('hrn',f*2,t,dur,gain*.3,0,.08,.5);}};
spicc=function(f,t,gain,pan){if(!SMP.ok)return SYN.spicc(f,t,gain,pan);gain*=FCAL.spicc||1;while(f>700)f/=2;sPlay(f<200?'cel':'vln',f,t,.12,gain*.8,pan,.004,.07);sPlay('piz',f,t,.15,gain*.35,-(pan||0),.002,.1);SYN.spicc(f,t,gain*.3,pan);};
taiko=function(t,g,low){if(!SMP.ok)return SYN.taiko(t,g,low);g*=FCAL.taiko||1;sPlay('tai',low?m2f(36):m2f(48),t,1.2,g*.9,(Math.random()-.5)*.3,.002,.4);if(low)sPlay('tim',m2f(36),t,1.4,g*.5,0,.002,.6);SYN.taiko(t,g*.35,low);};
pianoLow=function(f,t,gain){if(!SMP.ok)return SYN.pianoLow(f,t,gain);gain*=FCAL.pianoLow||1;sPlay('pno',f,t,2.2,gain*1.1,0,.003,.8);};
reed=function(f,t,dur,gain,kind){if(!SMP.ok)return SYN.reed(f,t,dur,gain,kind);gain*=FCAL[kind]||1;const k=kind==='zurna'?'shn':kind==='clarinet'?'cla':'acc';sPlay(k,f,t,dur,gain*1.2,0,kind==='harmonium'?.06:.03,.15);};
bowed=function(f,t,dur,gain,from){if(!SMP.ok)return SYN.bowed(f,t,dur,gain,from);gain*=FCAL.bowed||1;sPlay('vln',f,t,dur,gain*1.25,.1,.06,.18,from);};
flute=function(f,t,dur,gain,ney){if(!SMP.ok)return SYN.flute(f,t,dur,gain,ney);gain*=FCAL[(ney?'ney':'flute')]||1;sPlay(ney?'pfl':'flt',f,t,dur,gain*1.2,0,ney?.08:.04,.2);if(ney)nz(AU.mus,t,dur*.8,'bandpass',f*1.5,0,gain*.08,3);};
const PLK={oud:['gtr',1,1.3],tres:['gtr',2,1.1],qanun:['kot',2,1.1],guzheng:['kot',2,1.2],gayageum:['kot',1,1.3],sitar:['sit',2,1.2],bandura:['hrp',2,1.2],harp:['hrp',2,1.1],strings:['str',2,.9]};
inst=function(kind,f,t,dur,gain,syl){const p=SMP.ok&&PLK[kind];if(!p)return SYN.inst(kind,f,t,dur,gain,syl);gain*=FCAL['i_'+kind]||1;
  if(kind==='strings'){sPlay('vln',f*2,t,dur,gain*.8,-.2,.06,.25);sPlay('str',f*2,t,dur,gain*.5,.2,.08,.3);}
  else{const fr=f*p[1];sPlay(p[0],fr,t,Math.max(dur,.5),gain*p[2],(Math.random()-.5)*.3,.002,.35);if(kind==='oud'&&dur>.45)sPlay('gtr',fr,t+dur*.5,dur*.5,gain*.8,0,.002,.3);if(kind==='qanun')sPlay('hrp',f,t,dur,gain*.35,0,.002,.3);}
  AU.lastF=f*2;};
drum=function(t,k,g=1){SYN.drum(t,k,g);if(!SMP.ok)return;if(k==='B'||k==='G')sPlay('tai',m2f(k==='G'?36:43),t,1.2,g*.55,0,.002,.4);else if(k==='P')sPlay('tim',(AU.style?AU.style.root:55)*1.5,t,1.2,g*.6,0,.002,.5);};

// ===== National colour =====
// Signature sounds layered over the big score for nations whose themes are orchestral: a US bugle call, European
// horn calls over harp, Russian church bells over low brass, and a North Korean brass-band oom-pah march.
function tuba(f,t,dur,gain){while(f>140)f/=2;while(f<45)f*=2;if(SMP.ok&&sPlay('tba',f,t,dur,gain*(FCAL.trombone||1),0,.012,.12))return;mnote(f,t,dur,'sawtooth',gain*.9,420,.012,dur*.5);}
function bell(f,t,g){for(const [r,a,d] of [[.5,.45,4],[1,1,3],[1.19,.38,2.2],[1.5,.28,1.8],[2,.32,1.4],[2.74,.16,.9]])osc(AU.mus,t,'sine',f*r,f*r*.999,d,a*g,.002);nz(AU.mus,t,.04,'bandpass',f*4,0,g*.25,2);}
function natColour(t,i,bar,sec,ch,hz,S,sp,lv){const f=AU.fac,bi=bar%4;
  if(f==='US'){// bugle call: root-root-fifth-octave answered from the fifth, on trumpet, every four bars
    if(sec>=1&&bi===3&&i===4){const r=hz(ch)*4;let st=t;for(const [m,l] of [[1,1],[1,1],[1.5,2],[2,4],[1.5,2],[2,6]]){brass(r*m,st,sp*l*.9,(sec>=2?.19:.14)*lv,3200);st+=sp*l;}}
    if(sec===0&&bar%8===4&&i===0){const r=hz(ch)*2;brass(r,t,sp*6,.1*lv,1500);brass(r*1.5,t+sp*6,sp*10,.1*lv,1500);}}
  else if(f==='EU'){// horn call in open fifths, and the harp rolling the chord in the quiet sections
    if(sec>=1&&bi===0&&i===0){const r=hz(ch)*2;brass(r,t,sp*12,.14*lv,1500);brass(r*1.5,t+sp*4,sp*8,.12*lv,1500);if(sec>=2)brass(r*2,t+sp*8,sp*8,.1*lv,1500);}
    if(sec<=1&&i%2===0&&bar%2===0){const d=ch+[0,2,4,7,4,2,0,2][i/2];inst('harp',hz(d),t,sp*2,.16*lv);}}
  else if(f==='RU'){// church bells: a great bell on the chord root, small bells pealing above it in battle
    if(i===0&&(bar%2===0&&sec>=1||bar%4===0)){bell(hz(ch)*4,t,.15*lv);}
    if(sec>=2&&(i===4||i===6||i===10)){bell(hz(ch+[4,2,7][(i-4)/3|0])*8,t,.05*lv);}
    if(sec>=1&&i===8&&bar%2===1)tuba(hz(ch)*2,t,sp*7,.18*lv);}
  else if(f==='KP'){// brass-band march: tuba on the beat, horn chord on the off-beat, cymbals on the downbeat
    if(sec>=1){if(i===0||i===8)tuba(hz(i===0?ch:ch+4)*2,t,sp*3,.24*lv);
      if(i===4||i===12){for(const d of [0,2,4])brass(hz(ch+d)*4,t,sp*1.6,.07*lv,1500);}
      if(sec>=2&&i===0&&bar%2===0)crash(t,.45*lv);}}}

// ===== Middle Eastern instruments and maqam scores =====
// Iran, the Arab nations and the Shia factions (IR, SA, AE, EG, RS, DW) play their music on real recorded regional
// instruments from a second, small sample sheet, mus/me.mp3 (about 0.55 MB), fetched only when one of these factions'
// music starts, so other nations and phones never download it:
//  - VCSL by Versilian Studios (CC0): darbuka doum/tek/ka/slap, large and small frame drums (daf, tar, bendir), muted
//    frame-drum and hand strokes (chest-beats of the matam/sineh-zani), group hand-claps, tambourine (riq jingles),
//    finger cymbals (sagat), clash cymbals (sanj / tus) and a bass drum (tabl, dammam);
//  - FluidR3 GM by Frank Wen (MIT): hammered dulcimer (santur), shakuhachi (end-blown, breathy: the ney), fiddle
//    (kamancheh / rebab) and shamisen (a skin-topped lute like Yemen's qanbus).
// No free oud recording was found, so the oud is built from the nylon-string guitar sample: darker and shorter, a
// woody body resonance, a risha (plectrum) click, double courses and fretless slides. The mizmar/zurna is the
// shehnai sample, the qanun the koto sample (both from the main sheet).
// Melodies follow real maqamat and Persian dastgah with their microtones (quarter-tones, koron), written in cents.
const ME_META=/*MEMETA*/{"san":[{"m":52,"o":0.25,"n":2.0,"r":0.194},{"m":58,"o":2.5,"n":2.0,"r":0.163},{"m":64,"o":4.75,"n":2.0,"r":0.127},{"m":70,"o":7.0,"n":2.0,"r":0.119},{"m":76,"o":9.25,"n":2.0,"r":0.127},{"m":82,"o":11.5,"n":2.0,"r":0.12}],"kam":[{"m":55,"o":13.75,"n":2.38,"r":0.247,"l":[1.0,2.38]},{"m":61,"o":16.38,"n":2.38,"r":0.237,"l":[1.0,2.38]},{"m":67,"o":19.01,"n":2.38,"r":0.274,"l":[1.0,2.38]},{"m":73,"o":21.64,"n":2.38,"r":0.223,"l":[1.0,2.38]},{"m":79,"o":24.27,"n":2.38,"r":0.239,"l":[1.0,2.38]}],"ney":[{"m":60,"o":26.9,"n":2.38,"r":0.413,"l":[1.0,2.38]},{"m":66,"o":29.53,"n":2.38,"r":0.349,"l":[1.0,2.38]},{"m":72,"o":32.16,"n":2.38,"r":0.308,"l":[1.0,2.38]},{"m":78,"o":34.79,"n":2.38,"r":0.285,"l":[1.0,2.38]}],"qnb":[{"m":48,"o":37.42,"n":1.5,"r":0.132},{"m":54,"o":39.17,"n":1.5,"r":0.133},{"m":60,"o":40.92,"n":1.5,"r":0.119},{"m":66,"o":42.67,"n":1.5,"r":0.113},{"m":72,"o":44.42,"n":1.5,"r":0.12}],"dum":[{"m":0,"o":46.17,"n":0.8,"r":0.2},{"m":0,"o":47.22,"n":0.8,"r":0.222}],"tek":[{"m":0,"o":48.27,"n":0.4,"r":0.068},{"m":0,"o":48.92,"n":0.4,"r":0.072}],"ka":[{"m":0,"o":49.57,"n":0.35,"r":0.079},{"m":0,"o":50.17,"n":0.35,"r":0.078}],"slp":[{"m":0,"o":50.77,"n":0.45,"r":0.068}],"fdl":[{"m":0,"o":51.47,"n":1.2,"r":0.185},{"m":0,"o":52.92,"n":1.2,"r":0.194}],"fdm":[{"m":0,"o":54.37,"n":0.5,"r":0.07},{"m":0,"o":55.12,"n":0.5,"r":0.078},{"m":0,"o":55.87,"n":0.5,"r":0.128}],"fds":[{"m":0,"o":56.62,"n":0.7,"r":0.084},{"m":0,"o":57.57,"n":0.7,"r":0.062}],"hnd":[{"m":0,"o":58.52,"n":0.4,"r":0.117},{"m":0,"o":59.17,"n":0.4,"r":0.083}],"clp":[{"m":0,"o":59.82,"n":0.28,"r":0.085},{"m":0,"o":60.35,"n":0.28,"r":0.066},{"m":0,"o":60.88,"n":0.28,"r":0.063},{"m":0,"o":61.41,"n":0.28,"r":0.033},{"m":0,"o":61.94,"n":0.28,"r":0.035}],"tmb":[{"m":0,"o":62.47,"n":0.5,"r":0.103},{"m":0,"o":63.22,"n":0.5,"r":0.092}],"zil":[{"m":0,"o":63.97,"n":1.2,"r":0.097}],"snj":[{"m":0,"o":65.42,"n":1.1,"r":0.104},{"m":0,"o":66.77,"n":1.1,"r":0.093}],"bdr":[{"m":0,"o":68.12,"n":1.2,"r":0.151},{"m":0,"o":69.57,"n":1.2,"r":0.144}]};
const MEP={st:null,ok:null,tries:0};
const ME_FAC={IR:1,SA:1,AE:1,EG:1,RS:1,DW:1};
// cut a decoded sample sheet into one buffer per slice (skips the mp3 decoder delay at each slice start)
function sheetSlice(buf,META){const sr=buf.sampleRate,d=buf.getChannelData(0),ok={};
  for(const k in META){ok[k]=[];for(const s of META[k]){let o=Math.floor(s.o*sr);const a=Math.max(0,o-Math.floor(.1*sr)),z=Math.min(d.length,o+Math.floor(.2*sr));
    let on=-1;for(let i=a;i<z;i++)if(Math.abs(d[i])>.004){on=i;break;}if(on>=0)o=Math.max(0,on-Math.floor(.003*sr));
    const n=Math.min(d.length-o,Math.floor(s.n*sr));if(n<200)continue;const b2=AU.ctx.createBuffer(1,n,sr);b2.getChannelData(0).set(d.subarray(o,o+n));ok[k].push({m:s.m,buf:b2,l:s.l,r:s.r});}}
  return ok;}
function meLoad(){if(!AU.ctx||!ME_META.san)return;if(MEP.st==='fail'&&(MEP.tries||0)<2)MEP.st=null;if(MEP.st)return;MEP.st='loading';MEP.tries=(MEP.tries||0)+1;
  fetch('mus/me.mp3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>{let dc=null;
    if(PHONE){try{const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(O)dc=new O(1,1,22050);}catch(e){dc=null;}}
    if(!dc)return decodeAB(AU.ctx,b);const keep=b.slice(0);return decodeAB(dc,b).catch(()=>decodeAB(AU.ctx,keep));})
    .then(buf=>{MEP.ok=sheetSlice(buf,ME_META);MEP.st='ok';}).catch(e=>{MEP.st='fail';audioErr('regional instruments',e);});}
// play one slice: pitched slices pick the nearest recorded note and retune it (microtones included); unpitched ones
// pick a variant. Options: pan, att, rel, from (slide in from the previous note), glide, rate, det (cents), vib
// (vibrato depth in cents) and vr (rate), hp / lp / pk [Hz, Q, dB] filters, v (variant).
function xPlay(L,f,t,dur,gain,o){o=o||{};if(!L||!L.length||!AU.ctx)return null;const c=AU.ctx;let b=L[0],rt=o.rate||1;
  if(f>0){const m=69+12*Math.log2(f/440);for(const s of L)if(Math.abs(s.m-m)<Math.abs(b.m-m))b=s;rt*=Math.pow(2,(m-b.m)/12);}
  else b=L[o.v!=null?o.v%L.length:(Math.random()*L.length|0)];
  const src=c.createBufferSource();src.buffer=b.buf;
  if(o.from&&f>0&&Math.abs(o.from/f-1)<.45){src.playbackRate.setValueAtTime(rt*o.from/f,t);src.playbackRate.exponentialRampToValueAtTime(rt,t+(o.glide||.08));}else src.playbackRate.value=rt;
  if(o.det&&src.detune)src.detune.value=o.det;
  if(b.l){src.loop=true;src.loopStart=b.l[0];src.loopEnd=b.l[1];}
  if(o.vib&&src.detune&&dur>.3){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vr||5.5;lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,t+Math.min(.2,dur*.3));lg.gain.linearRampToValueAtTime(o.vib,t+Math.min(dur,.6));l.connect(lg);lg.connect(src.detune);l.start(t);l.stop(t+dur+.6);}
  let n=src;const fl=(type,fq,q,gn)=>{const x=c.createBiquadFilter();x.type=type;x.frequency.value=fq;if(q)x.Q.value=q;if(gn)x.gain.value=gn;n.connect(x);n=x;};
  if(o.hp)fl('highpass',o.hp,.7);if(o.lp)fl('lowpass',o.lp,.7);if(o.pk)fl('peaking',o.pk[0],o.pk[1],o.pk[2]);
  const att=o.att||.003,rel=o.rel||.2,g=c.createGain(),v=Math.max(0,gain*(.2/Math.max(.05,b.r))),end=t+Math.max(att+.01,dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.setValueAtTime(v,end);g.gain.setTargetAtTime(.0001,end,rel/3.5);
  n.connect(g);panTo(g,o.pan||0);src.start(t);src.stop(end+rel*1.4+.05);return src;}
function mP(k,f,t,dur,gain,o){return xPlay(MEP.ok&&MEP.ok[k],f,t,dur,gain,o);}
// loudness trims per instrument (measured with orch renders so every nation sits at the same level)
const MECAL={oud:2.78,qanun:3.85,santur:3.46,kam:4.2,ney:4.7,qnb:4.26,miz:3.9,brass:1.36,chant:1.27,drum:1};
// The regional instruments. f is the score's note in its low register; each instrument plays it in its own octave.
function meInst(kind,f,t,dur,gain,syl){const L=AU.mL||(AU.mL={}),from=L[kind];let fo=f;
  switch(kind){
    case 'm_oud':{fo=f*4;gain*=MECAL.oud;const d=Math.max(.25,Math.min(dur,1.3)),o={from,lp:2400,pk:[230,1.1,5],rel:.16,glide:.07,att:.002};
      if(SMP.ok&&SMP.ok.gtr){xPlay(SMP.ok.gtr,fo,t,d,gain*.85,Object.assign({pan:-.1},o));xPlay(SMP.ok.gtr,fo,t+.008,d,gain*.5,Object.assign({pan:.12,det:5},o));}
      else pluck(fo,t,d,gain*1.3,.3,.994,2200);
      pluck(fo,t,Math.min(d,.5),gain*.3,.55,.99,3400,0,0,.05);nz(AU.mus,t,.016,'bandpass',3300,0,gain*.22,2.4);
      // long notes: the oud player's tremolo (rish), quick repeated strokes of the risha
      if(dur>.8){for(let k=1;k*.12<dur-.12&&k<12;k++){const tk=t+k*.12;if(SMP.ok&&SMP.ok.gtr)xPlay(SMP.ok.gtr,fo,tk,.18,gain*(k%2?.42:.5),{lp:2200,pk:[230,1.1,5],rel:.08});else pluck(fo,tk,.15,gain*.5,.3,.99,2200);}}
      break;}
    case 'm_qanun':{fo=f*4;gain*=MECAL.qanun;const d=Math.max(.3,dur);
      if(SMP.ok&&SMP.ok.kot){sPlay('kot',fo,t,d,gain*1.05,-.15,.002,.3);sPlay('kot',fo*2,t+.006,d,gain*.42,.2,.002,.3);}else{pluck(fo,t,d,gain*1.1,.75,.996,5200);pluck(fo*2,t,d,gain*.4,.6,.996,5200);}
      // riyash: the qanun's fast alternating-octave tremolo on held notes
      if(dur>.6){for(let k=1;k*.075<dur-.1&&k<16;k++){const tk=t+k*.075,ff=k%2?fo*2:fo;if(SMP.ok&&SMP.ok.kot)sPlay('kot',ff,tk,.12,gain*(k%2?.32:.4),k%2?.2:-.15,.002,.1);else pluck(ff,tk,.12,gain*.4,.75,.99,5200);}}
      break;}
    case 'm_santur':{fo=f*8;gain*=MECAL.santur;const hit=(tt,gg,pn)=>{if(!mP('san',fo,tt,1.6,gg,{pan:pn,rel:.4}))pluck(fo,tt,.25,gg*1.4,.85,.997,7000);};
      hit(t,gain,-.1);
      // riz: the two mallets alternate fast on long notes
      if(dur>.4){for(let k=1;k*.068<dur-.05&&k<20;k++)hit(t+k*.068,gain*(k%2?.48:.62)*(1-.25*k*.068/dur),k%2?.12:-.1);}
      break;}
    case 'm_kam':{fo=f*8;gain*=MECAL.kam;if(!mP('kam',fo,t,dur,gain,{from,glide:.11,vib:24,vr:5.6,hp:200,pk:[1700,1.3,4],att:.07,rel:.25,pan:.12}))bowed(fo,t,dur,gain*.6,from);break;}
    case 'm_ney':{fo=f*8;gain*=MECAL.ney;if(mP('ney',fo,t,dur,gain,{from,glide:.13,vib:16,vr:5,att:.09,rel:.3,pan:-.15,lp:5200}))nz(AU.mus,t,Math.max(.2,dur*.85),'bandpass',fo*1.6,0,gain*.07,2.5);else flute(fo,t,dur,gain,1);break;}
    case 'm_qnb':{fo=f*4;gain*=MECAL.qnb;const d=Math.max(.25,Math.min(dur,1.1));if(!mP('qnb',fo,t,d,gain,{from,glide:.06,lp:3600,pk:[320,1,3],rel:.14,pan:-.05}))pluck(fo,t,d,gain*1.2,.6,.993,3600);
      if(dur>.7){for(let k=1;k*.13<dur-.12&&k<10;k++)mP('qnb',fo,t+k*.13,.16,gain*.42,{lp:3400,rel:.08});}break;}
    case 'm_miz':{fo=f*8;gain*=MECAL.miz;// two mizmars in heterophony, each note entered with a grace note from above
      if(SMP.ok&&SMP.ok.shn){for(const [dt,dd,pn,gg] of [[0,-9,-.25,1],[.012,10,.25,.75]]){const s=sPlay('shn',fo,t+dt,dur,gain*gg,pn,.015,.12,fo*1.09);if(s&&s.detune)s.detune.value=dd;}}
      else reed(fo,t,dur,gain*.55,'zurna');break;}
    case 'm_brass':{gain*=MECAL.brass;brass(f*4,t,dur,gain,3200);brass(f*2,t,dur,gain*.55,1500);break;}
    case 'm_boogh':{gain*=MECAL.brass;brass(f*2,t,dur,gain,900);break;}// the Bushehri boogh horn
    case 'm_chant':{gain*=MECAL.chant;const d=Math.max(dur,.35),sy=syl||'ya',j=()=>Math.random()*.03;// a row of men chanting in unison
      voice(f*2,t+j(),d,gain*.55,0,sy,3);voice(f*2,t+j(),d,gain*.5,0,sy,3);voice(f,t+j(),d,gain*.6,0,sy,3);break;}
    case 'm_takht':{const E=(AU.style&&AU.style.mx&&AU.style.mx.ens)||['m_oud','m_qanun'];// the takht ensemble plays the tune together, each a hair apart
      E.forEach((k,n)=>meInst(k,f,t+n*.011,dur,gain*(n?.6:.9)));return;}
    default:return;}
  L[kind]=fo;AU.lastF=f*2;}
// Regional percussion. Letters: d darbuka doum, t tek, k ka, x slap, r riq, j riq shake, f daf, e small frame drum
// (tar / bendir), b tabl / dammam, y sanj / tus cymbals, z finger cymbals (sagat), w group claps, o tombak tom,
// p tombak pelang. With the sheet loaded the latmiya letters become recorded too: L group chest-beat (matam /
// sineh-zani), M light chest-beat, W claps, Q dammam, Z sanj; and D/T/F/B doum, tek, frame drum, big drum.
const ME_DR={d:'D',t:'T',k:'T',x:'T',r:'R',j:'H',f:'F',e:'F',b:'B',y:'Z',z:'Z',w:'W',o:'D',p:'T'};
function meDrum(t,k,g){g*=MECAL.drum;const P=(s,gg,o)=>mP(s,0,t+((o&&o.dt)||0),(o&&o.d)||1.2,g*gg,Object.assign({pan:(Math.random()-.5)*.3,rate:.97+Math.random()*.06,att:.001,rel:.12},o||{}));
  switch(k){
    case 'd':case 'D':P('dum',1,{v:Math.random()<.7?0:1});break;
    case 't':case 'T':P('tek',.75);break;
    case 'k':P('ka',.45);break;
    case 'x':P('slp',.7);break;
    case 'r':P('tmb',.5,{v:0,d:.45});P('tek',.18,{rate:1.3});break;
    case 'j':P('tmb',.32,{v:1,d:.4});break;
    case 'f':case 'F':P('fdl',.7,{v:0,d:.7,rel:.25});P('tmb',.16,{v:1,d:.45});break;
    case 'e':P('fds',.55,{v:Math.random()<.6?0:1,d:.5});break;
    case 'b':case 'B':P('bdr',1,{v:0,rate:.9+Math.random()*.06,d:1.2});P('fdl',.3,{rate:.8});break;
    case 'Q':P('bdr',1.05,{v:1,rate:.86,d:1.2});P('fdm',.35,{rate:.75});break;
    case 'y':case 'Z':P('snj',.5,{v:0,d:.9});P('zil',.12,{d:.6});break;
    case 'z':P('zil',.32,{d:1});break;
    case 'w':case 'W':for(let n=0;n<6;n++)P('clp',.45,{dt:Math.random()*.03,v:n%5});break;
    case 'o':P('dum',.85,{rate:.78});P('fdm',.28,{rate:.92});break;
    case 'p':P('tek',.55,{rate:.9});break;
    // a crowd beating their chests together: many muted, fleshy thumps a few milliseconds apart, plus palm slaps
    case 'L':for(let n=0;n<8;n++){P('fdm',.36,{dt:Math.random()*.045,rate:.8+Math.random()*.28,v:n%3,d:.45});if(n<3)P('hnd',.32,{dt:Math.random()*.04,v:0,d:.35});}break;
    case 'M':for(let n=0;n<4;n++)P('fdm',.28,{dt:Math.random()*.03,rate:.9+Math.random()*.2,v:n%3,d:.4});P('hnd',.2,{v:0,d:.3});break;
    default:return false;}
  return true;}
{const _inst=inst,_drum=drum;
  inst=function(kind,f,t,dur,gain,syl){if(kind&&kind[0]==='m'&&kind[1]==='_')return meInst(kind,f,t,dur,gain,syl);return _inst(kind,f,t,dur,gain,syl);};
  drum=function(t,k,g=1){if(ME_DR[k]){if(MEP.ok&&meDrum(t,k,g))return;return _drum(t,ME_DR[k],g*.8);}
    if(MEP.ok&&AU.style&&AU.style.me&&'LMWQZDTFB'.includes(k)&&meDrum(t,k,g))return;return _drum(t,k,g);};}
// Taqsim: a free-time solo that opens each piece over the drone. It climbs the maqam's lower jins step by step with
// small turns back, rests and ornaments on the ghammaz (the 4th or 5th degree), then sinks back to the tonic.
function taqsim(t,kind,hz,S,sp,len,gain){const top=(S.mx&&S.mx.gh)||(Math.random()<.5?3:4),seq=[[0,4]];let d=0;
  while(d<top){d+=Math.random()<.22&&d>0?-1:1;seq.push([d,Math.random()<.5?1:2]);}
  seq.push([top,6]);seq.push([top+1,1]);seq.push([top,1]);seq.push([top-1,2]);seq.push([top,3]);
  while(d>0){d-=Math.random()<.2?0:1;seq.push([Math.max(0,d),Math.random()<.4?2:1]);}
  seq.push([1,1]);seq.push([0,6]);
  // free time: every note is stretched or rushed a little, the way a soloist breathes through a taqsim
  let tt=0;for(const [dg,l] of seq){const dd=sp*l*(.75+Math.random()*.6);if(tt+dd>len*sp)break;meInst(kind,hz(dg),t+tt,dd*1.05,gain*(l>=4?1:.85));tt+=dd;}}
function meCall(t,S,X,hz,sp,gain){let st=0;const mo=X.cm||S.motif.slice(0,6),syl=X.call==='m_chant'?lyricFor(mo.length,'chant',mo):null;
  mo.forEach(([d,l],k)=>{meInst(X.call,hz(d)*(X.coct||1),t+st*sp,sp*l*.92,gain,syl&&syl[k]);st+=l;});return st;}
// The regional "war layer" that replaces the orchestral one for these nations: a modal drone instead of chords,
// a taqsim intro, layered national rhythms that thicken as the fighting heats up, drum rolls into each section,
// frame-drum and tabl hits on the downbeats, and battle calls (mizmar, the two chanting rows of the ardah and ayala,
// the zamil, Egypt's military brass, Bushehr's boogh horn).
function meScore(t,i,bar,sec,ch,hz,S,sp,intense){const X=S.mx||{},lat=!!S.cr,bi=bar%8,lv=S.lv||1,battle=intense||sec>=2;
  // drone on the tonic (with a soft fifth): maqam music is modal, so no chord changes underneath
  if(i===0&&bar%4===0&&X.dr==='cel'){const r=hz(0);if(SMP.ok&&SMP.ok.cel){const C=SMP.ok.cel,o={att:1.2,rel:1.5,lp:700};xPlay(C,r*2,t,sp*64,.09*lv,Object.assign({pan:-.2},o));xPlay(C,r*3,t+.05,sp*64,.045*lv,Object.assign({pan:.2},o));if(battle&&SMP.ok.cbs)xPlay(SMP.ok.cbs,r,t,sp*64,.08*lv,o);}
    else{mnote(r*2,t,sp*64,'sawtooth',.05*lv,500,1.5,sp*20);mnote(r*3,t,sp*64,'sawtooth',.025*lv,600,1.5,sp*20);}}
  if(i===0&&bar%4===0&&battle)mnote(S.root,t,sp*64,'sine',.22*lv,140,1,sp*16);
  // taqsim intro (not over the theme's entry in bars 6-7)
  if(sec===0&&X.tq&&i===0&&bar%2===0&&bi<6)taqsim(t,X.tq,hz,S,sp,30,(lat?.12:.17)*lv);
  // layered rhythms
  const Ly=X.lay&&(battle?(sec===3&&X.lay[3])||X.lay[2]:X.lay[sec]);
  if(Ly){const gg=(battle?.85:AU.calm?.45:.6)*lv;for(const p of Ly){const k=p[i];if(k&&k!=='.')drum(t,k,gg*(k==='w'||k==='y'?.8:1));}}
  // a roll into each new section, and a heavy downbeat when it lands
  if(sec>=1&&bi===7&&i>=8&&X.roll){const k=X.roll[i%X.roll.length];drum(t,k,(.3+.07*(i-8))*lv);if(i>=12&&battle&&X.roll2)drum(t,X.roll2,.5*lv);}
  if(i===0&&bi===0&&sec>=1){drum(t,'b',(battle?1:.7)*lv);if(X.cym&&battle)drum(t,'y',.8*lv);}
  // battle calls, answered by a second row/instrument when the style has one
  if(battle&&X.call&&i===0&&bar%4===2){const g=(X.cg||.2)*lv,e=meCall(t,S,X,hz,sp,g);if(X.rows)meCall(t+e*sp,S,X,hz,sp,g*.9);}
  // Egypt: the military band takes up the theme in the battle sections, over a snare
  if(X.brass&&battle&&i===0&&bar%8===4){let st=t;for(const [d,l] of S.motif.slice(0,8)){meInst('m_brass',hz(d),st,sp*l*.9,.13*lv);st+=sp*l;}}
  if(X.brass&&battle&&(i===4||i===12))drum(t,'S',.9*lv);}

// ===== Your own music =====
// Players can import their own tracks (mp3, m4a, ogg, wav, flac...). They are kept in this browser (IndexedDB)
// and play through the music bus, so the music volume, the music toggle and the voice ducking all apply.
const MYM={list:[],el:null,src:null,i:-1,url:null,on:false};
function myMode(){try{return localStorage.getItem('ww3_sndtrk')||'score';}catch(e){return 'score';}}
function setMyMode(v){try{localStorage.setItem('ww3_sndtrk',v);}catch(e){}}
function myDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open('ww3_music',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function myList(){try{const db=await myDB();return await new Promise(res=>{const q=db.transaction('t').objectStore('t').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([]);});}catch(e){return MYM.mem||[];}}
async function myAdd(files){const add=[...files].filter(f=>/^audio\//.test(f.type)||/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name)).slice(0,60);if(!add.length)return 0;
  try{const db=await myDB();await new Promise((res,rej)=>{const tx=db.transaction('t','readwrite'),st=tx.objectStore('t');for(const f of add)st.add({name:f.name.replace(/\.[^.]+$/,''),blob:f});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
  catch(e){MYM.mem=(MYM.mem||[]).concat(add.map((f,i)=>({id:Date.now()+i,name:f.name.replace(/\.[^.]+$/,''),blob:f})));}// storage blocked: keep them for this session
  MYM.list=await myList();return add.length;}
async function myClear(){try{const db=await myDB();await new Promise(res=>{const tx=db.transaction('t','readwrite');tx.objectStore('t').clear();tx.oncomplete=res;tx.onerror=res;});}catch(e){}MYM.mem=[];MYM.list=[];myStop();}
function myStop(){MYM.on=false;if(MYM.el){try{MYM.el.pause();}catch(e){}}if(MYM.url){URL.revokeObjectURL(MYM.url);MYM.url=null;}}
function myNext(){if(!AU.ctx||!MYM.list.length)return false;let i=MYM.list.length>1?Math.floor(Math.random()*MYM.list.length):0;if(MYM.list.length>1&&i===MYM.i)i=(i+1)%MYM.list.length;MYM.i=i;const tr=MYM.list[i];
  if(!MYM.el){MYM.el=new Audio();MYM.el.preload='auto';MYM.el.onended=()=>{if(MYM.on)myNext();};MYM.el.onerror=()=>{if(MYM.on&&MYM.list.length>1)setTimeout(myNext,300);};
    try{MYM.src=AU.ctx.createMediaElementSource(MYM.el);const g=AU.ctx.createGain();g.gain.value=4.2;MYM.src.connect(g);g.connect(AU.musBus);}catch(e){MYM.src=null;}}
  if(MYM.url)URL.revokeObjectURL(MYM.url);MYM.url=URL.createObjectURL(tr.blob);MYM.el.src=MYM.url;MYM.on=true;if(!MYM.src)MYM.el.volume=Math.min(1,SET.mus/100);
  MYM.el.play().catch(()=>{});try{if(typeof pushLog==='function'&&AU.musicOn)pushLog('♪ '+tr.name);}catch(e){}myUI();return true;}
async function myStart(){MYM.list=await myList();if(myMode()==='mine'&&MYM.list.length&&AU.ctx){MYM.keep=1;stopMusic();MYM.keep=0;myNext();return true;}myStop();if(G&&!G.over&&!AU.timer&&G.teams&&G.teams[ME])_startMusic(G.teams[ME].fac);return false;}
function myUI(){const n=$('myN');if(n)n.textContent=MYM.list.length?(MYM.list.length+' track'+(MYM.list.length>1?'s':'')+' imported'+(MYM.on&&MYM.list[MYM.i]?' · now playing: '+MYM.list[MYM.i].name:'')):'No tracks imported yet';
  const s=$('sTrk');if(s)for(const b of s.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===myMode());}
const _startMusic=startMusic,_stopMusic=stopMusic;
stopMusic=function(){_stopMusic();if(!MYM.keep)myStop();};
startMusic=function(style,calm){if(!AU.ctx)return;AU.menuKey=null;smpLoad();if(ME_FAC[style])meLoad();myStop();_startMusic(style,calm);if(myMode()==='mine')myStart();};

// ===== Menu music =====
// The main menu, lobby and Victory/Defeat screens play a calm version of the score of the nation picked in the menu
// (intro and theme only, a little slower, no battle sections; Shia factions keep their latmiyas). Browsers only allow
// sound after a tap or click, so it starts on the first one. Starting a battle crossfades into the battle score;
// leaving it crossfades back. Purely local audio: nothing here touches the battle or the network.
function onMenu(){const m=$('menu');return !G||G.over||(m&&m.hidden===false);}
function menuMusic(){if(!AU.ctx||AU.ctx.state==='suspended'&&G&&G.paused)return;
  if(!onMenu()){AU.menuKey=null;return;}
  const fac=(typeof setup!=='undefined'&&setup.p&&STYLES[setup.p])?setup.p:'US',key=fac+(myMode()==='mine'?':mine':'');
  if(!AU.musicOn&&myMode()!=='mine'){if(AU.timer)stopMusic();AU.menuKey=null;return;}// music off: don't spend CPU on a silent score
  if(AU.menuKey===key)return;
  if(AU.menuFac!==fac){AU.menuFac=fac;AU.menuPick=performance.now();}
  if(AU.menuKey&&performance.now()-AU.menuPick<1200)return;// let the player finish browsing nations before switching
  startMusic(fac,true);AU.menuKey=key;}
// first tap/click/key unlocks sound (but never un-pauses a paused battle's sound). touchend, click, keydown, pointerup
// and mousedown count as a real tap for the browser, so the unlock runs there; pointerdown only prepares the engine.
// The listeners sit on window in the capture phase, so no game handler (or preventDefault) can stop them.
{const ACT={touchend:1,click:1,keydown:1,pointerup:1,mousedown:1};
  const kick=ev=>{try{if(ACT[ev.type]){if(!AU.ctx||AU.ctx.state!=='running'||(IOSLIKE&&SIL.el&&SIL.el.paused)||!SIL.ok&&IOSLIKE||!AU.spOK)audioUnlock();}
      else if(!AU.ctx||AU.ctx.state!=='running'&&!audioHeld())initAudio();menuMusic();}catch(e){}};
  for(const ev of ['pointerdown','pointerup','touchend','mousedown','click','keydown'])window.addEventListener(ev,kick,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{try{if(document.hidden){if(SIL.el&&!SIL.el.paused)SIL.el.pause();}else audioWake();}catch(e){}});
  window.addEventListener('pageshow',()=>{try{audioWake();}catch(e){}});window.addEventListener('focus',()=>{try{audioWake();}catch(e){}});
  let wt=0;setInterval(()=>{try{menuMusic();}catch(e){}
    // watchdog: an engine left interrupted (call, Siri, alarm) is nudged every 2 s while the page is visible
    try{const c=AU.ctx;if(c&&++wt%4===0&&!document.hidden&&!audioHeld()){if(c.state==='closed')audioRebuild();else if(c.state==='interrupted'){const p=c.resume();if(p&&p.catch)p.catch(()=>{});}}}catch(e){}
    try{const s=$('settings');if(s&&!s.hidden)sndShow();}catch(e){}},500);}
// A broken sound call must never break the battle or the interface: every sound entry point used by other modules
// swallows its own errors (the last one is shown in Settings > Sound check).
{const safe=(f,n)=>function(){try{return f.apply(this,arguments);}catch(e){audioErr(n,e);}};
  sfxShot=safe(sfxShot,'shot');sfxBoom=safe(sfxBoom,'boom');sfxUI=safe(sfxUI,'ui');sfxAlarm=safe(sfxAlarm,'alarm');speak=safe(speak,'voice');droneAudio=safe(droneAudio,'drones');}

// ===== Sound check (Settings) =====
// One button that plays a radio beep and one voice line, and a status line saying exactly what this device reports,
// so a player whose phone stays silent can tell us why. Built from here so it needs no change to the page shell.
function sndStatus(){const c=AU.ctx,p=[],C=window.AudioContext||window.webkitAudioContext;
  p.push('Engine: '+(c?c.state+' ('+c.sampleRate+' Hz)':C?'not started yet (tap anywhere)':'not supported by this browser'));
  if(IOSLIKE){let s='';try{const a=navigator.audioSession;if(a)s='session '+a.type+', ';}catch(e){}p.push('Silent-switch bypass: '+s+'loop '+(SIL.el&&!SIL.el.paused?'playing':'off'));}
  else p.push('Playback session: normal');
  p.push('Instruments: '+(SMP.st==='ok'?'loaded':SMP.st==='loading'?'loading':SMP.st==='fail'?'failed, using synth':'not loaded yet')+(MEP.st?', regional '+(MEP.st==='ok'?'loaded':MEP.st):''));
  const f=(G&&G.teams&&G.teams[ME]&&G.teams[ME].fac)||(typeof setup!=='undefined'&&setup&&setup.p)||'US',vb=VOB[f];
  p.push('Voices: '+f+' clips '+(vb&&typeof vb!=='string'?'ready':vb==='loading'?'loading':vb==='fail'?'failed':'not loaded')+', device voices '+(window.speechSynthesis?(AU.voices.length||speechSynthesis.getVoices().length):'none'));
  p.push('Music '+(AU.musicOn?SET.mus+'%':'off')+', Sound '+(AU.sfxOn?SET.fx+'%':'off')+', Voices '+(AU.voiceOn?SET.vo+'%':'off'));
  if(AU.err)p.push('Last error: '+AU.err);return p.join(' · ');}
function sndShow(){const el=$('sndSt');if(el)el.textContent=sndStatus();}
function testSound(){audioUnlock();const c=AU.ctx;if(!c){sndShow();return;}
  try{const t=c.currentTime+.06;// radio beep straight to the speakers (plays even with Sound switched off, so the test is honest)
    osc(AU.master,t,'sine',1000,0,.11,.22);osc(AU.master,t+.15,'sine',1400,0,.11,.22);nz(AU.master,t+.29,.16,'bandpass',2200,0,.1,2);}catch(e){audioErr('test beep',e);}
  const f=(G&&G.teams&&G.teams[ME]&&G.teams[ME].fac)||(typeof setup!=='undefined'&&setup&&setup.p&&VO_MAP[setup.p]?setup.p:'US');
  const say=buf=>{try{const M=VO_MAP[f];if(!buf||!M||!AU.ctx)return sayDevice();const k=AU.ctx,[o,d]=M.l[0][0],s=k.createBufferSource(),g=k.createGain(),t0=Math.max(k.currentTime+.05,(AU.testT||0));
      g.gain.value=1;s.buffer=buf;s.connect(g);g.connect(k.destination);s.start(t0,o,d);}catch(e){audioErr('test voice',e);}setTimeout(sndShow,200);};
  const sayDevice=()=>{try{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance('Radio check. Sound is working.');u.lang='en-US';speechSynthesis.speak(u);}catch(e){}};
  AU.testT=c.currentTime+.55;const vb=VOB[f];if(vb&&typeof vb!=='string')say(vb);else{const pr=voLoad(f);if(pr)pr.then(say);else sayDevice();}
  sndShow();setTimeout(sndShow,800);setTimeout(sndShow,2500);}
(function sndCheckUI(){try{const vo=$('sVo');if(!vo||$('sndChk'))return;const w=document.createElement('div');w.id='sndChk';
  w.innerHTML='<div class="label">Sound check</div>'+
    '<div class="myrow"><button id="sndTest" class="btn2" type="button">Test sound</button></div><div style="font-size:12px;opacity:.7;margin-top:6px">You should hear a radio beep, then a voice. No sound? Send us this line:</div><div class="sv" id="sndSt" style="margin:2px 0 6px;opacity:.85;word-break:break-word"></div>';
  vo.insertAdjacentElement('afterend',w);$('sndTest').addEventListener('click',testSound);sndShow();}catch(e){}})();

