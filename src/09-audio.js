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
// a closed engine (rare, iOS) is rebuilt from scratch; recorded voices are kept
function audioRebuild(){const old=AU.ctx;if(!old||old.state!=='closed'||(AU.rebuilt||0)>=5)return;AU.rebuilt=(AU.rebuilt||0)+1;
  AU.ctx=null;AU.warm=0;try{DRS.clear();}catch(e){}
  try{if(MYM.el){MYM.el.pause();MYM.el=null;MYM.src=null;}}catch(e){}
  for(const k in VOB)if(typeof VOB[k]==='string')delete VOB[k];
  initAudio();if(!AU.ctx)return;try{if(G&&!G.over&&G.teams&&G.teams[ME])startMusic(G.teams[ME].fac);else menuMusic();}catch(e){}}
function initAudio(){try{if(AU.ctx&&AU.ctx.state==='closed')audioRebuild();if(!AU.ctx){const c=audioCtor();if(!c)return;AU.ctx=c;
    try{if(c.addEventListener)c.addEventListener('statechange',audioState);else c.onstatechange=audioState;}catch(e){}
    AU.master=c.createGain();AU.master.gain.value=.75;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;AU.master.connect(comp);comp.connect(c.destination);
    AU.rev=c.createConvolver();AU.rev.buffer=impulse(c,1.8,3.2);AU.revIn=c.createGain();AU.revIn.gain.value=.55;AU.revIn.connect(AU.rev);AU.rev.connect(AU.master);
    AU.sfx=c.createGain();AU.sfx.connect(AU.master);AU.sfxRev=c.createGain();AU.sfxRev.gain.value=.35;AU.sfx.connect(AU.sfxRev);AU.sfxRev.connect(AU.revIn);
    AU.mus=c.createGain();AU.mus.gain.value=.19;{const lo=c.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=110;lo.gain.value=3;const mid=c.createBiquadFilter();mid.type='peaking';mid.frequency.value=420;mid.Q.value=.8;mid.gain.value=-2.5;const hi=c.createBiquadFilter();hi.type='highshelf';hi.frequency.value=7000;hi.gain.value=2.5;const gl=c.createDynamicsCompressor();gl.threshold.value=-18;gl.ratio.value=2.5;gl.attack.value=.02;gl.release.value=.3;AU.mus.connect(lo);lo.connect(mid);mid.connect(hi);hi.connect(gl);gl.connect(AU.master);}AU.musRev=c.createGain();AU.musRev.gain.value=.08;AU.mus.connect(AU.musRev);AU.musRev.connect(AU.revIn);AU.musBus=AU.mus;
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
function sfxBoom(x,y,s,big){if(auOn()&&!AU.sfxOn){const sp=spatial(x,y);if(sp&&sp.v>=.02)AU.heat=Math.min(1,AU.heat+(big?.25:.06));return;}if(!auOn())return; // with sound effects off, nearby explosions still tell the music the fighting started
  const sp=spatial(x,y);if(!sp||sp.v<.02||!limit('boom',big?3:4,.15))return;const t=AU.ctx.currentTime,k=Math.min(1,.3+s/40)*(big?1.3:1),d=Math.min(3,.6+s/22);const b=bus(sp);
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
const VO_MAP={"AE":{"l":[[[0.0,0.86],[0.96,3.01],[4.069,1.007],[5.176,1.177]],[[6.453,1.957],[8.509,1.26],[9.869,1.312],[11.282,1.526]],[[12.907,0.843],[13.851,2.089],[16.039,1.54],[17.679,2.319]],[[20.098,1.741],[21.939,3.5],[25.539,1.998],[27.637,1.868]],[[29.606,2.434],[32.14,2.759],[34.999,2.299]],[[37.398,1.623],[39.121,2.024],[41.245,1.529],[42.874,2.057]],[[45.031,2.357],[47.488,1.194],[48.782,1.874],[50.756,1.384]],[[52.239,1.545],[53.884,1.413],[55.397,3.544],[59.041,1.449]]],"c":[[[60.591,1.37]],[[62.06,1.21]],[[63.37,1.326],[64.796,1.542]],[[66.438,1.37]],[],[],[],[]]},"CN":{"l":[[[0.0,1.129],[1.229,0.873],[2.203,0.994],[3.296,1.258]],[[4.654,1.147],[5.901,1.027],[7.028,1.05],[8.178,1.097]],[[9.375,0.718],[10.193,1.267],[11.561,0.647],[12.307,1.135]],[[13.542,1.117],[14.759,1.063],[15.923,1.461],[17.484,1.495]],[[19.079,1.481],[20.66,1.601],[22.361,1.02]],[[23.481,2.132],[25.714,1.698],[27.512,1.547],[29.159,1.053]],[[30.312,1.334],[31.746,1.634],[33.48,0.986],[34.567,1.242]],[[35.909,1.254],[37.263,1.115],[38.478,1.526],[40.104,1.57]]],"c":[[[41.774,1.214]],[[43.088,1.074]],[[44.262,0.647],[45.009,1.064]],[[46.173,1.214]],[],[],[],[]]},"CU":{"l":[[[0.0,1.488],[1.588,1.004],[2.692,1.339],[4.132,2.17]],[[6.401,1.404],[7.905,1.744],[9.749,1.831],[11.681,1.06]],[[12.84,0.788],[13.729,1.042],[14.87,2.385],[17.355,2.443]],[[19.898,1.374],[21.373,2.24],[23.713,2.561],[26.374,1.17]],[[27.644,1.712],[29.455,1.965],[31.52,1.801]],[[33.42,1.539],[35.06,2.268],[37.428,1.903],[39.43,1.971]],[[41.502,1.402],[43.003,1.338],[44.441,1.32],[45.861,2.116]],[[48.077,1.692],[49.869,1.756],[51.725,2.431],[54.256,1.729]]],"c":[[[56.084,1.388]],[[57.572,1.05]],[[58.722,0.985],[59.807,2.394]],[[62.3,1.355]],[],[],[],[]]},"DW":{"l":[[[0.0,1.646],[1.746,1.65],[3.497,1.549],[5.146,1.813]],[[7.059,2.317],[9.475,1.285],[10.861,1.872],[12.833,1.54]],[[14.472,0.689],[15.262,1.591],[16.953,0.893],[17.946,1.602]],[[19.647,1.581],[21.328,2.725],[24.153,1.914],[26.167,1.54]],[[27.806,1.898],[29.805,2.402],[32.307,2.732]],[[35.138,1.632],[36.871,2.745],[39.716,2.07],[41.886,2.521]],[[44.507,2.366],[46.974,2.251],[49.325,1.475],[50.9,1.657]],[[52.658,1.328],[54.086,3.046],[57.232,1.921],[59.252,1.34]]],"c":[[[60.693,0.843],[61.635,1.151]],[[62.886,1.211],[64.198,1.35]],[[65.648,1.65],[67.397,1.291],[68.788,1.238],[70.127,1.923]],[[72.15,0.843]],[],[],[],[]]},"EG":{"l":[[[0.0,1.837],[1.937,1.49],[3.527,1.759],[5.386,0.626]],[[6.112,1.546],[7.758,1.441],[9.299,1.387],[10.786,1.905]],[[12.792,0.645],[13.537,2.064],[15.701,2.451],[18.252,1.229]],[[19.581,2.763],[22.444,1.86],[24.404,1.704],[26.208,2.628]],[[28.937,2.799],[31.836,2.806],[34.742,1.923]],[[36.765,1.574],[38.439,2.282],[40.821,1.822],[42.743,2.694]],[[45.537,2.623],[48.26,2.063],[50.423,1.872],[52.395,1.601]],[[54.096,2.378],[56.575,1.401],[58.075,1.948],[60.123,2.302]]],"c":[[[62.525,1.108]],[[63.733,1.445]],[[65.278,1.267],[66.645,1.108]],[[67.853,1.108]],[],[],[],[]]},"EU":{"l":[[[0.0,3.679],[3.779,0.686],[4.565,1.351],[6.016,1.115]],[[7.23,1.888],[9.219,1.609],[10.928,2.005],[13.033,0.794]],[[13.927,1.053],[15.08,0.922],[16.102,1.076],[17.278,1.655]],[[19.033,1.006],[20.14,1.088],[21.327,1.16],[22.587,1.432]],[[24.119,1.533],[25.752,1.514],[27.366,1.704]],[[29.17,1.055],[30.324,1.374],[31.799,1.528],[33.427,1.796]],[[35.323,1.109],[36.532,1.171],[37.803,1.578],[39.481,1.163]],[[40.744,1.505],[42.349,1.149],[43.598,1.701],[45.398,1.418]]],"c":[[[46.916,1.211]],[[48.227,0.695]],[[49.022,1.857],[50.979,2.589]],[[53.669,2.195]],[],[],[],[]]},"IL":{"l":[[[0.0,0.735],[0.835,1.408],[2.343,0.949],[3.393,0.647]],[[4.14,0.801],[5.041,1.423],[6.564,0.972],[7.636,0.852]],[[8.587,0.645],[9.333,2.759],[12.192,0.528],[12.82,0.901]],[[13.821,0.952],[14.874,2.062],[17.036,1.025],[18.161,1.43]],[[19.691,1.299],[21.089,1.431],[22.62,1.546]],[[24.266,1.008],[25.374,1.759],[27.233,1.291],[28.624,0.931]],[[29.655,0.965],[30.721,1.257],[32.077,0.944],[33.122,0.959]],[[34.181,1.115],[35.395,1.45],[36.946,1.054],[38.1,1.167]]],"c":[[[39.367,0.672]],[[40.138,0.851]],[[41.09,1.127],[42.317,1.487]],[[43.904,1.195]],[],[],[],[]]},"IN":{"l":[[[0.0,1.286],[1.386,1.051],[2.537,2.133],[4.77,1.393]],[[6.263,2.005],[8.368,0.967],[9.435,1.838],[11.372,1.069]],[[12.541,0.681],[13.322,2.125],[15.547,1.144],[16.791,2.186]],[[19.077,1.18],[20.358,1.591],[22.049,1.507],[23.656,1.613]],[[25.369,1.686],[27.154,2.158],[29.412,1.84]],[[31.352,1.81],[33.262,2.372],[35.734,1.793],[37.627,2.016]],[[39.743,1.595],[41.437,2.273],[43.81,1.592],[45.503,1.187]],[[46.789,1.285],[48.175,1.627],[49.902,1.49],[51.492,2.044]]],"c":[[[53.636,0.966]],[[54.702,0.967]],[[55.769,1.786],[57.655,1.195]],[[58.95,0.966]],[],[],[],[]]},"IR":{"l":[[[0.0,1.287],[1.387,0.99],[2.477,1.138],[3.715,1.977]],[[5.792,2.831],[8.722,1.488],[10.31,0.583],[10.993,1.346]],[[12.439,0.626],[13.165,2.105],[15.37,0.689],[16.159,2.287]],[[18.546,1.351],[19.997,2.342],[22.439,1.259],[23.798,2.228]],[[26.126,1.531],[27.757,1.601],[29.457,1.847]],[[31.404,1.234],[32.739,3.703],[36.541,1.293],[37.935,1.893]],[[39.928,2.168],[42.196,1.113],[43.409,0.849],[44.358,1.755]],[[46.213,1.268],[47.581,1.728],[49.409,1.636],[51.145,2.524]]],"c":[[[53.769,0.851],[54.72,1.184]],[[56.004,1.089],[57.193,1.267]],[[58.56,1.208],[59.868,1.38],[61.349,2.269],[63.717,1.231]],[[65.049,1.41]],[],[],[],[]]},"KP":{"l":[[[0.0,2.397],[2.497,1.448],[4.045,1.586],[5.73,1.303]],[[7.134,0.982],[8.215,1.052],[9.367,1.528],[10.995,0.642]],[[11.737,0.608],[12.445,1.268],[13.813,0.984],[14.897,0.932]],[[15.929,1.283],[17.312,1.556],[18.968,2.895],[21.963,0.974]],[[23.036,1.887],[25.024,1.585],[26.709,1.253]],[[28.062,1.793],[29.955,1.322],[31.378,1.642],[33.119,0.606]],[[33.825,1.273],[35.197,1.277],[36.574,1.331],[38.005,1.359]],[[39.464,1.452],[41.016,2.081],[43.196,2.025],[45.321,1.052]]],"c":[[[46.473,1.738]],[[48.311,1.074]],[[49.485,1.587],[51.172,1.025]],[[52.297,1.738]],[],[],[],[]]},"KR":{"l":[[[0.0,1.124],[1.224,1.557],[2.881,1.42],[4.401,1.136]],[[5.638,1.072],[6.81,2.076],[8.986,1.03],[10.116,1.079]],[[11.295,0.939],[12.334,1.21],[13.644,0.968],[14.712,1.519]],[[16.331,1.406],[17.838,1.774],[19.712,1.642],[21.454,1.519]],[[23.073,1.793],[24.966,1.772],[26.838,1.358]],[[28.297,1.585],[29.981,2.057],[32.138,2.035],[34.273,1.387]],[[35.76,1.05],[36.91,1.111],[38.121,1.141],[39.363,1.04]],[[40.502,1.099],[41.702,2.042],[43.843,1.564],[45.507,1.426]]],"c":[[[47.034,0.797]],[[47.931,0.725]],[[48.756,1.206],[50.062,0.928]],[[51.09,2.16]],[],[],[],[]]},"PK":{"l":[[[0.0,1.193],[1.293,0.863],[2.256,1.126],[3.482,1.11]],[[4.692,1.458],[6.249,0.978],[7.328,1.045],[8.473,0.915]],[[9.488,0.585],[10.173,2.139],[12.412,0.804],[13.316,1.861]],[[15.276,1.07],[16.446,1.703],[18.249,1.236],[19.585,1.489]],[[21.174,1.486],[22.76,2.802],[25.662,1.368]],[[27.13,1.52],[28.75,1.816],[30.667,1.193],[31.96,1.885]],[[33.944,1.578],[35.622,1.95],[37.672,1.142],[38.914,1.006]],[[40.021,1.397],[41.518,1.702],[43.32,1.218],[44.638,1.807]]],"c":[[[46.545,1.435]],[[48.08,0.996]],[[49.176,1.811],[51.087,0.753]],[[51.939,1.435]],[],[],[],[]]},"RS":{"l":[[[0.0,1.771],[1.871,1.212],[3.183,1.37],[4.653,1.735]],[[6.488,0.828],[7.416,2.356],[9.872,1.381],[11.353,2.02]],[[13.473,1.486],[15.059,1.75],[16.909,1.614],[18.623,2.283]],[[21.006,1.649],[22.755,2.855],[25.709,1.947],[27.756,1.815]],[[29.672,2.03],[31.802,3.184],[35.086,2.72]],[[37.906,2.473],[40.479,1.896],[42.475,1.802],[44.377,2.194]],[[46.671,2.394],[49.165,3.559],[52.824,1.934],[54.858,1.734]],[[56.692,2.127],[58.919,1.397],[60.416,2.053],[62.569,2.412]]],"c":[[[65.081,0.797],[65.978,1.705]],[[67.783,1.397],[69.28,1.809]],[[71.189,1.622],[72.911,1.923],[74.933,1.117],[76.15,1.026]],[[77.276,1.599]],[],[],[],[]]},"RU":{"l":[[[0.0,0.738],[0.838,1.394],[2.331,1.042],[3.473,0.723]],[[4.297,1.857],[6.254,0.993],[7.347,1.227],[8.674,1.076]],[[9.849,0.677],[10.626,1.282],[12.007,0.779],[12.887,1.869]],[[14.856,1.701],[16.657,1.341],[18.097,1.916],[20.113,1.11]],[[21.323,1.338],[22.761,1.482],[24.344,1.413]],[[25.857,1.446],[27.402,0.922],[28.424,1.898],[30.421,2.0]],[[32.522,1.13],[33.751,0.951],[34.802,1.134],[36.036,1.279]],[[37.416,1.449],[38.965,0.97],[40.035,1.529],[41.663,1.958]]],"c":[[[43.721,1.116]],[[44.937,0.595]],[[45.633,0.601],[46.334,0.948]],[[47.382,1.116]],[],[],[],[]]},"SA":{"l":[[[0.0,2.08],[2.18,0.819],[3.099,2.277],[5.475,0.904]],[[6.479,1.339],[7.918,1.415],[9.433,2.257],[11.79,1.624]],[[13.514,0.874],[14.488,1.944],[16.532,1.519],[18.151,2.258]],[[20.508,3.347],[23.955,2.748],[26.804,1.925],[28.829,1.842]],[[30.771,2.77],[33.641,2.742],[36.483,2.234]],[[38.816,2.213],[41.129,2.346],[43.575,2.998],[46.672,2.332]],[[49.104,2.531],[51.735,1.192],[53.027,1.807],[54.934,1.475]],[[56.509,2.398],[59.007,3.793],[62.9,2.05],[65.05,1.467]]],"c":[[[66.617,1.626]],[[68.343,1.215]],[[69.658,1.348],[71.106,1.929]],[[73.135,1.626]],[],[],[],[]]},"TR":{"l":[[[0.0,1.2],[1.3,1.105],[2.505,1.161],[3.766,0.889]],[[4.755,2.099],[6.954,1.241],[8.295,1.053],[9.447,1.09]],[[10.638,0.831],[11.568,2.4],[14.068,1.254],[15.423,2.062]],[[17.585,1.174],[18.858,1.319],[20.277,1.377],[21.754,1.675]],[[23.529,1.713],[25.342,1.262],[26.704,1.52]],[[28.324,1.434],[29.858,2.181],[32.139,1.599],[33.838,1.739]],[[35.677,1.854],[37.631,1.15],[38.881,1.825],[40.805,1.172]],[[42.078,1.49],[43.667,1.319],[45.087,1.567],[46.753,1.488]]],"c":[[[48.341,1.375],[49.816,1.583]],[[51.499,1.832]],[[53.432,0.97],[54.502,2.475]],[[57.076,1.593]],[],[],[],[]]},"UA":{"l":[[[0.0,1.083],[1.183,1.954],[3.237,1.417],[4.754,1.339]],[[6.193,1.115],[7.408,1.058],[8.566,2.025],[10.691,1.043]],[[11.834,0.81],[12.744,2.04],[14.885,1.018],[16.003,2.482]],[[18.585,1.763],[20.448,1.737],[22.284,1.368],[23.752,2.238]],[[26.09,1.742],[27.931,1.999],[30.031,1.487]],[[31.617,1.928],[33.645,1.615],[35.36,2.768],[38.228,0.767]],[[39.095,1.179],[40.374,1.479],[41.953,1.529],[43.582,1.917]],[[45.599,2.274],[47.972,1.309],[49.381,1.693],[51.174,2.827]]],"c":[[[54.1,1.584]],[[55.785,1.328]],[[57.213,1.423],[58.735,1.666]],[[60.502,2.833]],[],[],[],[]]},"US":{"l":[[[0.0,0.762],[0.862,1.355],[2.318,1.242],[3.66,1.069]],[[4.829,1.022],[5.951,0.945],[6.995,0.81],[7.905,1.114]],[[9.119,0.92],[10.139,1.192],[11.431,1.631],[13.162,1.214]],[[14.477,1.014],[15.591,1.57],[17.26,1.308],[18.669,1.057]],[[19.825,1.449],[21.374,1.777],[23.252,2.24]],[[25.592,1.111],[26.803,1.938],[28.841,1.643],[30.584,0.834]],[[31.518,0.913],[32.531,1.158],[33.789,2.403],[36.292,0.956]],[[37.348,1.395],[38.843,1.858],[40.802,1.358],[42.26,1.075]]],"c":[[[43.434,0.819],[44.353,1.027]],[[45.48,1.055],[46.635,0.803]],[[47.538,1.214],[48.852,0.957]],[[49.909,1.665]],[],[],[],[]]}};const VOB={};
// clips are already processed to natural depth and pace (tts/proc2.py); playback speed stays at 1
const VO_PITCH=1;
// a failed clip sheet is retried once (a dropped connection); device speech covers until then, and music/effects never wait on it
const VOP={},VOT={};
function voLoad(fac){if(!AU.ctx||!VO_MAP[fac])return null;if(VOB[fac]==='fail'&&(VOT[fac]||0)<2)delete VOB[fac];if(VOB[fac])return VOP[fac]||null;VOB[fac]='loading';VOT[fac]=(VOT[fac]||0)+1;
  return VOP[fac]=fetch(window.VO_INLINE&&VO_INLINE[fac]?'data:audio/mpeg;base64,'+VO_INLINE[fac]:'vo/'+fac+'.mp3?v=2').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOB[fac]=buf;return buf;}).catch(e=>{VOB[fac]='fail';audioErr('voice '+fac,e);return null;});}
function voPlay(fac,kind){const buf=VOB[fac],M=VO_MAP[fac];if(!buf||typeof buf==='string'||!M||!auOn())return false;let set=(M.l[kind]&&M.l[kind].length)?M.l[kind]:kind<5?M.l[0]:null;if(!set)return false;const cr=M.c&&M.c[kind];if(cr&&cr.length&&Math.random()<(kind===2?.5:.38))set=cr;if(!set||!set.length)return false;
  const c=AU.ctx;// one line at a time: a new line never talks over (and seems to cut off) the one still playing
  if(AU.voEnd&&c.currentTime<AU.voEnd-.05)return true;
  const [o,d]=set[Math.floor(Math.random()*set.length)],src=c.createBufferSource(),g=c.createGain();src.buffer=buf;src.playbackRate.value=VO_PITCH;const vol=Math.max(0,Math.min(1.5,SET.vo/100*1.25)),t0=c.currentTime+.02,dur=d/VO_PITCH;
  // soft edges so a clip never starts or stops with a click
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.005);g.gain.setValueAtTime(vol,Math.max(t0+.006,t0+dur-.05));g.gain.linearRampToValueAtTime(0,t0+dur);AU.voEnd=t0+dur;src.connect(g);g.connect(c.destination);
  if(AU.musicOn&&AU.mus){AU.musBus.gain.setTargetAtTime(musBase()*.45,c.currentTime,.05);AU.musBus.gain.setTargetAtTime(musBase(),c.currentTime+d+.1,.25);}src.start(t0,o,d);return true;}
function speak(kind){if(!AU.voiceOn||!G)return;const now=performance.now();if(now-AU.lastVoice<1300)return;AU.lastVoice=now;{const fac=G.teams[ME].fac;voLoad(fac);if(voPlay(fac,kind)){if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}return;}}if(kind>4||!window.speechSynthesis)return;// under fire / unit lost / building ready exist only as recorded lines
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

/* ---------- anthems ---------- */
// the national anthem excerpts (one small file per nation, fetched only for that nation)
const AN_FAC=/*ANFAC*/{US:1,EU:1,IL:1,UA:1,CU:1,IN:1,CN:1,EG:1,PK:1,KR:1,RU:1};
const ANB={};
function anLoad(fac){if(!AU.ctx||!AN_FAC[fac])return;const s=ANB[fac];if(s&&(s.st==='ok'||s.st==='loading'||(s.tries||0)>=2))return;const e=ANB[fac]={st:'loading',tries:((s&&s.tries)||0)+1};
  fetch('mus/an_'+fac+'.mp3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{e.buf=buf;e.st='ok';}).catch(err=>{e.st='fail';audioErr('anthem',err);});}

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
// switching to My music halts the soundtrack; switching back (or clearing the list) brings the soundtrack back
async function myStart(){MYM.list=await myList();MYM.listed=1;if(myMode()==='mine'&&MYM.list.length&&AU.ctx){stHalt();myNext();return true;}
  myStop();if(G&&!G.over&&G.teams&&G.teams[ME])startMusic(G.teams[ME].fac);return false;}
function myUI(){const n=$('myN');if(n)n.textContent=MYM.list.length?(MYM.list.length+' track'+(MYM.list.length>1?'s':'')+' imported'+(MYM.on&&MYM.list[MYM.i]?' · now playing: '+MYM.list[MYM.i].name:'')):'No tracks imported yet';
  const s=$('sTrk');if(s)for(const b of s.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===myMode());}
// ===== Menu music =====
// The main menu and lobby play the soundtrack's menu pool (see Shared soundtrack below). Browsers only allow sound
// after a tap or click, so it starts on the first one. Starting a battle crossfades into the battle pools; leaving it
// crossfades back. Purely local audio: nothing here touches the battle or the network.
function onMenu(){const m=$('menu');return !G||G.over||(m&&m.hidden===false);}
function menuMusic(){if(!AU.ctx||AU.ctx.state==='suspended'&&G&&G.paused)return;stCtx();
  if(!onMenu())return;
  if(myMode()==='mine'){if(!MYM.listed){if(!MYM.busy){MYM.busy=1;myList().then(l=>{MYM.list=l;MYM.listed=1;}).finally(()=>{MYM.busy=0;});}return;}
    if(MYM.list.length){if(ST.mode)stHalt();if(!MYM.on)myNext();return;}}// My music chosen but nothing imported: the soundtrack plays
  if(ST.fail&&!stUse())return;
  if(ST.mode==='menu'||ST.mode==='end')return;
  startMusic((typeof setup!=='undefined'&&setup.p)||'US',true);}
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

// ===== Shared soundtrack =====
// One set of real recorded tracks for every nation (Abdullah, 2026-10-27), built by mus/st_pack.py into
// mus/st/<id>.mp3. Pools: menu (main menu, lobby, after the end-screen sting), calm and combat (in battle, switched on
// AU.heat, the fighting-intensity signal), victory and defeat. Tracks stream through two <audio> decks routed into the
// music bus, so the Music volume, the music toggle, voice ducking and the iOS unlock all still apply, and only the
// track about to play is downloaded (never the whole set: phones). At battle start the player's nation's anthem
// (mus/an_XX.mp3, where there is one) plays first and the score fades in after it; on victory the anthem follows the
// victory track. If tracks can't load (offline, error) the music rests and tries again two minutes later.
// "My music" still replaces all of this when chosen. Purely local: nothing here touches the battle or the network game.
const ST_TR={'menu-02':['The Fall of Arcana','Matthew Pablo'],'menu-04':['Epic Orchestral Fantasy Theme','Markus Lindner'],
  'calm-01':['Conflict','Alexandr Zhelanov'],'calm-02':['Enemy Spotted','Alexandr Zhelanov'],'calm-03':['Tabuk','Kevin MacLeod'],'calm-05':['Impending Boom','Kevin MacLeod'],
  'combat-01':['Dream Raid','Matthew Pablo'],'combat-02':['Tactical Pursuit','Matthew Pablo'],'combat-05':['Howitzer','joeBaxterWebb'],'combat-06':['Act of War','Alexandr Zhelanov'],
  'combat-09':['Black Vortex','Kevin MacLeod'],'combat-11':['Curse of the Scarab','Kevin MacLeod'],'victory-01':['Egmont Overture Finale','Kevin MacLeod'],'defeat-02':['Death of Kings','Kevin MacLeod']};
const ST_POOL={};for(const k in ST_TR){const p=k.split('-')[0];(ST_POOL[p]=ST_POOL[p]||[]).push(k);}
// gain: deck level into the music bus (tracks are mastered to -18 LUFS, calm ones -20); anGain: the anthem's level.
// hot/cool: AU.heat thresholds into / out of the combat pool; dwell: least time (ms) in a pool before leaving it.
const ST={decks:[],cur:-1,pool:null,id:null,since:0,last:{},mode:null,fac:null,fail:0,failAt:0,errs:0,an:null,anWait:null,anG:null,endG:null,endK:null,off:0,
  gain:2.6,anGain:3,fade:3,hot:.35,cool:.1,dwell:{calm:30000,combat:60000},req:[]};
function stDeck(){const c=AU.ctx,el=new Audio(),d={el,ctx:c,g:c.createGain(),src:null,id:null,on:false,started:false,t0:0,adv:false,tok:0};
  el.crossOrigin='anonymous';el.preload='none';try{el.setAttribute('playsinline','');}catch(e){}
  d.g.gain.value=.0001;d.g.connect(AU.musBus);d.src=c.createMediaElementSource(el);d.src.connect(d.g);
  el.addEventListener('ended',()=>{if(d.on&&ST.decks[ST.cur]===d)stNext(d);});
  el.addEventListener('error',()=>{if(d.on&&!/^data:/.test(el.src||''))stErr(d,'track '+d.id+' media error '+(el.error?el.error.code:''));});
  return d;}
// a rebuilt audio engine (iOS) needs new decks: the old ones belong to the closed engine
function stCtx(){if(!ST.decks.length||ST.decks[0].ctx===AU.ctx)return;for(const d of ST.decks){d.on=false;try{d.el.pause();}catch(e){}}ST.decks=[];ST.cur=-1;ST.mode=null;ST.an=null;ST.anWait=null;ST.blessed=0;}
function stDecks(){stCtx();if(!ST.decks.length){ST.decks=[stDeck(),stDeck()];ST.cur=-1;}return ST.decks;}
function stFadeTo(d,v,sec){const c=AU.ctx,t=c.currentTime,g=d.g.gain;g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.0001,g.value),t);g.linearRampToValueAtTime(Math.max(.0001,v),t+Math.max(.05,sec));}
function stOff(d,sec){if(!d||!d.on)return;d.on=false;sec=sec==null?ST.fade:sec;try{stFadeTo(d,0,sec);}catch(e){}const tok=++d.tok;setTimeout(()=>{if(d.tok===tok&&!d.on){try{d.el.pause();}catch(e){}}},(sec+.3)*1000);}
function stPick(pool){const L=ST_POOL[pool]||[];let c=L.filter(k=>k!==ST.id&&k!==ST.last[pool]);if(!c.length)c=L.filter(k=>k!==ST.id);if(!c.length)c=L;return c[Math.random()*c.length|0];}
function stBattlePool(){ST.mode='battle';return AU.heat>ST.hot?'combat':'calm';}
// crossfade into a new track from a pool: the new deck fades in (and the old one out) once it actually starts playing
function stPlay(pool,fade){if(!AU.ctx)return;let D;try{D=stDecks();}catch(e){audioErr('soundtrack',e);return stFallback();}
  if(!AU.musicOn){ST.pool=pool;ST.off=1;for(const d of D)if(d.on)stOff(d,.3);return;}
  const id=stPick(pool);if(!id)return;const old=D[ST.cur],d=D[ST.cur===0?1:0],c=AU.ctx;
  d.tok++;d.on=true;d.started=false;d.adv=false;d.id=id;d.pool=pool;d.fade=fade==null?ST.fade:fade;d.t0=performance.now();d.tryAt=0;d.held=0;d.blocked=0;d.old=old&&old.on?old:null;
  d.g.gain.cancelScheduledValues(c.currentTime);d.g.gain.setValueAtTime(.0001,c.currentTime);
  const url='mus/st/'+id+'.mp3';ST.req.push(url);d.el.preload='auto';d.el.src=url;
  if(pool!==ST.pool)ST.since=performance.now();ST.cur=D.indexOf(d);ST.pool=pool;ST.id=id;ST.last[pool]=id;stStart(d);
  const T=ST_TR[id];try{if(T&&typeof pushLog==='function'&&G&&!G.over)pushLog('♪ '+T[0]+' — '+T[1]);}catch(e){}}
function stStart(d){if(AU.ctx.state!=='running')return;const tok=d.tok;let p;try{p=d.el.play();}catch(e){p=Promise.reject(e);}
  Promise.resolve(p).then(()=>{if(d.tok!==tok||!d.on||d.started)return;d.started=true;ST.errs=0;stFadeTo(d,ST.gain,d.fade);if(d.old){stOff(d.old,d.fade);d.old=null;}})
    .catch(e=>{if(d.tok!==tok||!d.on)return;if(e&&(e.name==='NotAllowedError'||e.name==='AbortError')){d.blocked=1;return;}stErr(d,e);});}
// the current track is about to end: what comes next
function stNext(d){if(d.adv)return;d.adv=true;
  if(d.pool==='victory'){if(AN_FAC[ST.fac]){stAnthemQ(ST.fac,()=>{ST.mode='menu';return 'menu';});return;}ST.mode='menu';return stPlay('menu');}
  if(d.pool==='defeat'){if(G&&!G.over&&G.teams&&G.teams[ME])return stPlay(stBattlePool());ST.mode='menu';return stPlay('menu');}
  stPlay(d.pool);}
// a track that fails to load: try another one once; if nothing plays, rest and try again in two minutes (stUse)
function stErr(d,e){audioErr('soundtrack',e);if(!d.on)return;d.on=false;try{d.el.pause();}catch(x){}ST.errs++;
  const o=ST.decks.find(x=>x!==d&&x.on&&x.started);
  if(o&&ST.errs<3){ST.cur=ST.decks.indexOf(o);if(o.pool!==ST.pool)ST.since=performance.now();ST.pool=o.pool;ST.id=o.id;return;}
  if(ST.errs<2&&ST.mode&&ST.pool){stPlay(ST.pool);return;}
  stFallback();}
function stFallback(){ST.fail=1;ST.failAt=performance.now();stHalt();}
function stUse(){if(ST.fail&&performance.now()-ST.failAt>120000)ST.fail=0;return !ST.fail;}// back online: try again
function stAnthemQ(fac,then){anLoad(fac);ST.anWait={fac,then,until:performance.now()+15000};}
function stAnthem(buf,then){const c=AU.ctx,src=c.createBufferSource(),g=c.createGain(),t=c.currentTime+.05,L=buf.duration;src.buffer=buf;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(ST.anGain,t+.1);g.gain.setValueAtTime(ST.anGain,t+Math.max(.2,L-2));g.gain.linearRampToValueAtTime(.0001,t+L);
  src.connect(g);g.connect(AU.musBus);src.start(t);src.stop(t+L+.05);const d=ST.decks[ST.cur];if(d&&d.on)stOff(d,1.5);ST.an={src,g,end:t+L,then,next:0};}
function stAnStop(){ST.anWait=null;const a=ST.an;ST.an=null;if(!a||!AU.ctx)return;const c=AU.ctx;try{a.g.gain.cancelScheduledValues(c.currentTime);a.g.gain.setTargetAtTime(.0001,c.currentTime,.2);a.src.stop(c.currentTime+.8);}catch(e){}}
function stHalt(){ST.mode=null;stAnStop();for(const d of ST.decks)if(d.on)stOff(d,.8);ST.id=null;ST.pool=null;ST.off=0;}
function stGo(style,calm){stCtx();try{AU.musRev.gain.setTargetAtTime(.08,AU.ctx.currentTime,.2);}catch(e){}// recorded tracks bring their own hall
  if(calm){if((ST.mode==='menu'||ST.mode==='end')&&(ST.decks.some(d=>d.on)||ST.an||ST.anWait||ST.off))return;ST.mode='menu';stAnStop();return stPlay('menu');}
  if(ST.mode==='battle'&&ST.fac===style&&(ST.decks.some(d=>d.on)||ST.an||ST.anWait||ST.off))return;
  ST.mode='battle';ST.fac=style;AU.heat=0;stAnStop();
  if(AN_FAC[style]&&ST.anG!==G&&AU.musicOn){ST.anG=G;stAnthemQ(style,stBattlePool);}else stPlay(stBattlePool());}
function stEnd(won,elim){if(!AU.ctx||!G||myMode()==='mine'||ST.fail)return;const k=won?'v':'d';if(ST.endG===G&&ST.endK===k)return;ST.endG=G;ST.endK=k;
  stCtx();stAnStop();ST.mode=elim?'battle':'end';stPlay(won?'victory':'defeat',1.5);}
function stTick(){try{AU.heat=Math.max(0,AU.heat-.006);if(!AU.ctx)return;
  if(ST.fail){if(stUse()&&G&&!G.over&&G.teams&&G.teams[ME]&&!onMenu())startMusic(G.teams[ME].fac);return;}// back online: battle music again
  stCtx();if(!ST.mode)return;const c=AU.ctx,now=performance.now();
  if(!AU.musicOn){if(!ST.off){ST.off=1;for(const d of ST.decks)if(d.on)stOff(d,.3);stAnStop();}return;}
  if(ST.off){ST.off=0;if(ST.mode==='end')ST.mode='menu';stPlay(ST.mode==='menu'?'menu':stBattlePool(),1);return;}
  const run=c.state==='running';
  for(const d of ST.decks){if(!d.on)continue;
    if(!run){if(!d.el.paused){try{d.el.pause();}catch(e){}d.held=1;}continue;}
    if(d.el.paused&&(d.held||d.blocked||!d.started)&&now-(d.tryAt||0)>1500){d.tryAt=now;d.held=0;d.blocked=0;if(d.started)d.el.play().catch(()=>{});else stStart(d);}
    if(!d.started&&now-d.t0>25000)stErr(d,'track '+d.id+' did not start (slow or no connection)');}
  if(!run)return;
  if(ST.anWait){const w=ST.anWait,e=ANB[w.fac];if(e&&e.st==='ok'){ST.anWait=null;stAnthem(e.buf,w.then);}else if(!e||e.st==='fail'||now>w.until){ST.anWait=null;stPlay(w.then(),2);}return;}
  if(ST.an){if(!ST.an.next&&c.currentTime>=ST.an.end-ST.fade){ST.an.next=1;stPlay(ST.an.then(),ST.fade);}if(c.currentTime>ST.an.end+.5)ST.an=null;return;}
  if(ST.mode==='battle'&&(ST.pool==='calm'||ST.pool==='combat')){const want=ST.pool==='calm'?(AU.heat>ST.hot?'combat':'calm'):(AU.heat<ST.cool?'calm':'combat');
    if(want!==ST.pool&&now-ST.since>=ST.dwell[ST.pool]){stPlay(want);return;}}
  const d=ST.decks[ST.cur];if(d&&d.on&&d.started&&!d.adv&&isFinite(d.el.duration)&&d.el.duration>0&&d.el.currentTime>d.el.duration-ST.fade-.25)stNext(d);
}catch(e){audioErr('soundtrack',e);}}
setInterval(stTick,250);
// iOS lets an <audio> element play later without a tap only if it first played during one: bless both decks then
function stBless(){try{if(!IOSLIKE||!AU.ctx||ST.blessed||ST.fail)return;const D=stDecks();for(const d of D){if(d.on)continue;d.el.src=silentURI();const p=d.el.play();if(p&&p.then)p.then(()=>{if(!d.on)d.el.pause();}).catch(()=>{});}ST.blessed=1;}catch(e){}}
for(const ev of ['touchend','click','keydown'])window.addEventListener(ev,stBless,{capture:true,passive:true});
// a battle starts (08-ui), or the menu / lobby (calm=true): the soundtrack, or the player's own music
function startMusic(style,calm){if(!AU.ctx)return;
  if(myMode()==='mine'){stHalt();myList().then(l=>{MYM.list=l;MYM.listed=1;if(myMode()!=='mine')return;if(l.length&&AU.ctx){if(!MYM.on)myNext();}else stGo(style,calm);});return;}
  myStop();if(!stUse()){stHalt();return;}stGo(style,calm);}
function stopMusic(){myStop();stHalt();}
{const _se=showEnd,_sl=showElim;
  showEnd=function(winner){const r=_se.apply(this,arguments);try{stEnd(winner>=0&&ally(winner,ME),false);}catch(e){audioErr('soundtrack',e);}return r;};
  showElim=function(){const r=_sl.apply(this,arguments);try{stEnd(false,true);}catch(e){audioErr('soundtrack',e);}return r;};}
{const _ss=sndStatus;sndStatus=function(){return _ss()+' · Soundtrack: '+(ST.fail?'could not load, trying again shortly':ST.id&&ST_TR[ST.id]?ST_TR[ST.id][0]+' ('+ST.pool+')':ST.an?'anthem':'idle');};}(function stCredits(){try{if(document.getElementById('stCred'))return;const ps=[...document.querySelectorAll('p.credits')];if(!ps.length)return;
  const p=document.createElement('p');p.className='credits';p.id='stCred';
  p.textContent='Soundtrack: The Fall of Arcana, Dream Raid and Tactical Pursuit by Matthew Pablo (www.matthewpablo.com, CC BY 3.0); Epic Orchestral Fantasy Theme by Markus Lindner (CC BY 4.0); Conflict (CC BY 4.0), Enemy Spotted and Act of War (CC BY 3.0) by Alexandr Zhelanov; Howitzer by joeBaxterWebb (CC BY 4.0); all via OpenGameArt.org. Tabuk, Impending Boom, Black Vortex, Curse of the Scarab, Egmont Overture Finale and Death of Kings by Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/';
  ps[0].insertAdjacentElement('beforebegin',p);}catch(e){}})();

