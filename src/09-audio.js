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
const VO_MAP={"AE":{"l":[[[0.0,0.721],[0.841,1.927],[2.888,0.86],[3.868,1.815]],[[5.803,1.91],[7.833,1.403],[9.356,2.161],[11.637,1.932]],[[13.689,2.204],[16.013,1.223],[17.356,0.94],[18.416,1.841]],[[20.377,1.382],[21.879,2.534],[24.533,1.809],[26.463,1.575]],[[28.157,1.623],[29.9,1.964],[31.984,1.564]],[[33.668,1.638],[35.426,1.963],[37.509,1.249],[38.879,1.697]],[[40.696,1.468],[42.284,1.233],[43.637,1.297],[45.054,1.137]],[[46.311,1.207],[47.637,1.429],[49.187,3.329],[52.635,1.185]]],"c":[[[53.94,1.137]],[[55.197,0.737]],[[56.054,0.961],[57.135,1.665]],[[58.921,1.115]],[],[],[],[]]},"CN":{"l":[[[0.0,1.009],[1.129,0.854],[2.103,1.644],[3.867,1.148]],[[5.135,1.367],[6.622,1.057],[7.799,1.185],[9.104,0.875]],[[10.099,0.545],[10.765,1.665],[12.549,0.62],[13.289,1.431]],[[14.84,0.785],[15.745,1.393],[17.259,2.193],[19.571,1.521]],[[21.213,1.382],[22.715,1.569],[24.404,0.94]],[[25.464,2.305],[27.889,2.433],[30.442,1.905],[32.467,1.158]],[[33.745,1.489],[35.354,1.607],[37.081,1.004],[38.205,1.084]],[[39.409,1.095],[40.623,1.297],[42.041,2.695],[44.855,1.675]]],"c":[[[46.651,1.462]],[[48.233,1.142]],[[49.495,0.62],[50.235,1.121]],[[51.475,1.372]],[],[],[],[]]},"CU":{"l":[[[0.0,1.841],[1.961,0.859],[2.94,1.228],[4.288,2.427]],[[6.835,1.447],[8.402,1.703],[10.225,1.527],[11.871,0.923]],[[12.915,0.657],[13.692,0.838],[14.65,2.353],[17.123,2.113]],[[19.356,2.017],[21.493,2.759],[24.372,2.609],[27.101,0.727]],[[27.947,1.084],[29.151,1.916],[31.187,1.617]],[[32.925,1.185],[34.229,2.523],[36.873,2.347],[39.34,1.452]],[[40.912,1.687],[42.719,1.025],[43.864,1.009],[44.993,1.607]],[[46.72,1.799],[48.639,3.255],[52.013,2.679],[54.812,1.484]]],"c":[[[56.416,1.323]],[[57.859,0.891]],[[58.871,0.823],[59.813,1.575]],[[61.508,1.233]],[],[],[],[]]},"DW":{"l":[[[0.0,1.318],[1.438,1.761],[3.319,2.071],[5.51,1.441]],[[7.071,1.905],[9.096,1.558],[10.774,2.252],[13.146,1.671]],[[14.937,0.668],[15.725,1.415],[17.259,1.585],[18.965,1.457]],[[20.542,1.798],[22.46,2.689],[25.269,1.553],[26.942,1.457]],[[28.519,1.601],[30.24,1.937],[32.297,2.358]],[[34.775,1.521],[36.415,2.38],[38.915,2.284],[41.319,2.278]],[[43.717,1.697],[45.535,2.049],[47.704,1.047],[48.871,1.435]],[[50.426,1.191],[51.737,1.916],[53.773,1.862],[55.755,1.196]]],"c":[[[57.071,0.769],[57.959,0.94]],[[59.019,0.764],[59.903,1.575]],[[61.598,1.377],[63.095,1.131],[64.346,1.111],[65.577,2.038]],[[67.735,0.679]],[],[],[],[]]},"EG":{"l":[[[0.0,2.023],[2.143,1.212],[3.475,1.585],[5.18,1.595]],[[6.895,1.143],[8.158,1.228],[9.506,1.66],[11.286,2.124]],[[13.53,1.281],[14.931,2.087],[17.138,2.614],[19.872,1.574]],[[21.566,2.503],[24.189,2.14],[26.449,1.532],[28.101,2.764]],[[30.985,2.454],[33.559,2.145],[35.824,1.809]],[[37.753,2.049],[39.922,2.844],[42.886,1.686],[44.692,2.14]],[[46.952,2.321],[49.393,1.905],[51.419,2.263],[53.801,1.767]],[[55.688,2.123],[57.931,1.563],[59.615,1.788],[61.523,1.697]]],"c":[[[63.34,1.014]],[[64.474,1.856]],[[66.45,1.788],[68.358,1.163]],[[69.641,1.163]],[],[],[],[]]},"EU":{"l":[[[0.0,0.716],[0.836,3.633],[4.589,7.094],[11.803,0.759]],[[12.682,1.255],[14.057,1.527],[15.703,2.342],[18.165,0.913]],[[19.199,0.982],[20.301,1.137],[21.557,0.998],[22.675,1.659]],[[24.455,1.467],[26.042,1.703],[27.865,0.833],[28.818,2.081]],[[31.019,1.313],[32.453,2.411],[34.984,1.158]],[[36.262,0.934],[37.316,2.519],[39.955,1.628],[41.703,1.601]],[[43.424,0.892],[44.436,2.759],[47.315,1.767],[49.201,1.175]],[[50.496,1.799],[52.415,1.238],[53.773,1.303],[55.195,3.372]]],"c":[[[58.687,0.641]],[[59.449,0.641]],[[60.21,1.787],[62.117,0.801]],[[63.039,1.409]],[],[],[],[]]},"IL":{"l":[[[0.0,0.793],[0.913,1.279],[2.312,0.959],[3.391,0.437]],[[3.947,0.687],[4.755,0.837],[5.711,1.305],[7.137,0.643]],[[7.899,0.655],[8.674,1.877],[10.671,0.703],[11.494,0.719]],[[12.333,1.354],[13.807,1.983],[15.91,1.365],[17.395,2.186]],[[19.701,1.989],[21.809,1.253],[23.182,1.839]],[[25.141,1.545],[26.807,1.081],[28.008,1.523],[29.651,0.831]],[[30.602,1.124],[31.846,0.815],[32.781,1.034],[33.935,0.741]],[[34.795,1.231],[36.147,1.385],[37.652,1.353],[39.125,1.221]]],"c":[[[40.466,0.602]],[[41.188,0.474]],[[41.782,1.327],[43.229,1.422]],[[44.771,0.901]],[],[],[],[]]},"IN":{"l":[[[0.0,1.286],[1.386,1.051],[2.537,2.133],[4.77,1.393]],[[6.263,2.005],[8.368,0.967],[9.435,1.838],[11.372,1.069]],[[12.541,0.681],[13.322,2.125],[15.547,1.144],[16.791,2.186]],[[19.077,1.18],[20.358,1.591],[22.049,1.507],[23.656,1.613]],[[25.369,1.686],[27.154,2.158],[29.412,1.84]],[[31.352,1.81],[33.262,2.372],[35.734,1.793],[37.627,2.016]],[[39.743,1.595],[41.437,2.273],[43.81,1.592],[45.503,1.187]],[[46.789,1.285],[48.175,1.627],[49.902,1.49],[51.492,2.044]]],"c":[[[53.636,0.966]],[[54.702,0.967]],[[55.769,1.786],[57.655,1.195]],[[58.95,0.966]],[],[],[],[]]},"IR":{"l":[[[0.0,1.476],[1.596,0.627],[2.343,1.039],[3.502,1.071]],[[4.694,2.191],[7.005,0.824],[7.949,0.72],[8.789,0.859]],[[9.768,0.756],[10.644,1.335],[12.099,0.575],[12.795,1.361]],[[14.275,1.386],[15.781,2.271],[18.173,1.311],[19.604,1.623]],[[21.347,1.717],[23.184,1.354],[24.658,1.807]],[[26.585,1.3],[28.005,2.924],[31.049,1.322],[32.491,1.428]],[[34.039,1.689],[35.848,0.833],[36.801,1.007],[37.929,1.181]],[[39.23,1.42],[40.77,1.721],[42.611,1.818],[44.549,2.369]]],"c":[[[47.038,0.821],[47.979,0.848]],[[48.946,0.834],[49.9,1.381]],[[51.402,1.684],[53.206,1.099],[54.425,0.954],[55.499,0.987]],[[56.606,0.952]],[],[],[],[]]},"KP":{"l":[[[0.0,2.657],[2.777,2.849],[5.746,2.508],[8.374,2.62]],[[11.114,5.622],[16.856,5.873],[22.849,3.35],[26.319,1.137]],[[27.576,4.689],[32.385,3.409],[35.915,1.702],[37.737,3.985]],[[41.841,3.26],[45.221,3.02],[48.361,3.707],[52.189,2.977]],[[55.286,3.259],[58.665,3.303],[62.088,2.849]],[[65.057,6.513],[71.691,3.063],[74.873,2.79],[77.783,1.265]],[[79.169,4.209],[83.498,2.103],[85.721,5.931],[91.772,3.43]],[[95.322,4.46],[99.902,3.537],[103.559,3.35],[107.029,3.537]]],"c":[[[110.686,3.431]],[[114.237,5.639]],[[119.995,3.313],[123.428,1.713]],[[125.261,3.543]],[],[],[],[]]},"KR":{"l":[[[0.0,7.275],[7.395,2.507],[10.023,2.619],[12.762,5.767]],[[18.649,1.068],[19.837,2.929],[22.885,1.559],[24.564,4.828]],[[29.512,6.081],[35.713,2.375],[38.208,1.329],[39.657,2.577]],[[42.354,6.907],[49.381,5.484],[54.985,3.831],[58.936,8.396]],[[67.452,3.713],[71.285,2.113],[73.519,3.051]],[[76.69,2.107],[78.917,3.18],[82.217,3.404],[85.741,5.894]],[[91.755,1.143],[93.018,2.215],[95.353,1.527],[96.999,4.38]],[[101.499,5.057],[106.676,5.643],[112.439,3.804],[116.363,2.753]]],"c":[[[119.237,0.844]],[[120.201,3.847]],[[124.167,2.07],[126.357,3.847]],[[130.324,5.991]],[],[],[],[]]},"PK":{"l":[[[0.0,2.118],[2.238,0.661],[3.019,2.225],[5.364,1.045]],[[6.529,3.057],[9.706,0.655],[10.481,2.444],[13.045,0.847]],[[14.012,1.095],[15.227,3.766],[19.113,1.403],[20.636,3.249]],[[24.005,2.726],[26.851,1.178],[28.149,1.199],[29.467,2.977]],[[32.565,2.849],[35.533,3.553],[39.207,2.784]],[[42.111,2.689],[44.92,2.052],[47.092,2.439],[49.651,3.366]],[[53.137,2.78],[56.037,3.275],[59.432,2.417],[61.969,0.879]],[[62.968,3.004],[66.092,1.167],[67.379,2.689],[70.189,3.766]]],"c":[[[74.075,2.279]],[[76.473,0.969]],[[77.563,3.521],[81.204,0.65]],[[81.974,2.955]],[],[],[],[]]},"RS":{"l":[[[0.0,1.559],[1.679,1.031],[2.829,1.932],[4.881,1.537]],[[6.539,0.801],[7.46,1.851],[9.431,1.856],[11.407,1.564]],[[13.091,1.105],[14.316,1.633],[16.069,1.387],[17.577,2.129]],[[19.826,1.862],[21.808,2.369],[24.297,2.311],[26.728,1.478]],[[28.326,1.948],[30.394,2.263],[32.777,2.087]],[[34.983,2.247],[37.35,1.863],[39.333,1.735],[41.187,2.103]],[[43.41,1.932],[45.462,2.924],[48.506,1.244],[49.87,1.313]],[[51.303,2.092],[53.515,1.414],[55.049,1.878],[57.047,1.697]]],"c":[[[58.865,0.668],[59.653,1.665]],[[61.437,1.388],[62.945,1.98]],[[65.045,1.579],[66.745,1.51],[68.375,1.031],[69.525,1.735]],[[71.38,1.462]],[],[],[],[]]},"RU":{"l":[[[0.0,0.758],[0.878,2.689],[3.687,1.047],[4.854,0.529]],[[5.503,1.297],[6.921,1.041],[8.082,1.409],[9.611,1.164]],[[10.895,0.694],[11.709,1.767],[13.595,0.971],[14.687,1.846]],[[16.653,1.809],[18.582,2.315],[21.017,1.803],[22.941,1.521]],[[24.581,1.143],[25.844,1.814],[27.778,1.473]],[[29.371,1.34],[30.831,1.244],[32.195,2.348],[34.663,2.039]],[[36.822,1.153],[38.095,1.063],[39.277,1.243],[40.641,1.105]],[[41.866,2.023],[44.009,1.521],[45.65,2.663],[48.433,3.015]]],"c":[[[51.567,1.329]],[[53.017,1.595]],[[54.732,0.865],[55.717,1.036]],[[56.873,1.419]],[],[],[],[]]},"SA":{"l":[[[0.0,1.751],[1.871,0.561],[2.552,2.108],[4.78,2.119]],[[7.019,1.228],[8.367,1.516],[10.003,2.567],[12.689,1.286]],[[14.095,1.639],[15.854,1.723],[17.697,1.137],[18.955,1.783]],[[20.857,3.425],[24.403,2.198],[26.721,1.745],[28.586,1.564]],[[30.27,2.374],[32.764,2.619],[35.503,1.335]],[[36.958,1.771],[38.849,2.198],[41.167,2.481],[43.768,1.884]],[[45.772,1.927],[47.819,2.241],[50.18,1.435],[51.735,0.983]],[[52.838,2.065],[55.023,2.343],[57.486,1.772],[59.378,2.119]]],"c":[[[61.617,1.105]],[[62.842,0.759]],[[63.721,1.43],[65.271,1.334]],[[66.725,1.11]],[],[],[],[]]},"TR":{"l":[[[0.0,1.857],[1.977,1.718],[3.815,1.729],[5.664,1.185]],[[6.969,2.545],[9.634,1.761],[11.515,0.721],[12.357,1.691]],[[14.168,1.19],[15.478,2.134],[17.732,0.881],[18.733,2.459]],[[21.313,1.457],[22.889,1.137],[24.147,2.503],[26.769,2.23]],[[29.119,1.467],[30.707,1.004],[31.831,1.371]],[[33.322,1.265],[34.707,1.99],[36.817,1.553],[38.491,2.15]],[[40.761,1.707],[42.588,1.499],[44.207,2.966],[47.293,1.495]],[[48.908,2.689],[51.717,1.894],[53.731,1.548],[55.399,1.591]]],"c":[[[57.11,1.409],[58.639,1.34]],[[60.099,1.804]],[[62.023,1.003],[63.147,2.459]],[[65.726,2.135]],[],[],[],[]]},"UA":{"l":[[[0.0,0.905],[1.025,1.579],[2.725,1.212],[4.057,1.082]],[[5.259,0.959],[6.337,0.943],[7.4,2.105],[9.625,0.649]],[[10.395,0.677],[11.191,1.815],[13.126,0.959],[14.205,2.219]],[[16.545,1.659],[18.324,1.697],[20.141,1.305],[21.567,2.17]],[[23.857,1.18],[25.157,1.674],[26.951,1.159]],[[28.229,1.727],[30.077,1.433],[31.63,2.443],[34.193,0.57]],[[34.883,1.077],[36.08,1.303],[37.503,1.301],[38.923,1.505]],[[40.548,1.75],[42.418,1.258],[43.796,1.654],[45.57,2.266]]],"c":[[[47.956,1.375]],[[49.451,1.105]],[[50.677,1.375],[52.172,1.189]],[[53.481,2.294]],[],[],[],[]]},"US":{"l":[[[0.0,1.185],[1.305,7.271],[8.695,1.345],[10.161,0.855]],[[11.135,1.041],[12.296,1.03],[13.446,1.393],[14.959,1.217]],[[16.297,0.902],[17.319,2.326],[19.765,1.799],[21.683,1.297]],[[23.101,0.833],[24.054,1.153],[25.327,0.902],[26.349,0.838]],[[27.307,1.302],[28.729,1.836],[30.685,2.241]],[[33.046,1.137],[34.303,2.561],[36.983,2.663],[39.766,0.743]],[[40.629,1.276],[42.025,1.175],[43.319,3.835],[47.275,0.695]],[[48.089,1.393],[49.602,1.847],[51.569,1.089],[52.778,0.817]]],"c":[[[53.715,1.18],[55.015,1.377]],[[56.513,0.881],[57.514,0.865]],[[58.499,2.049],[60.669,0.838]],[[61.627,2.433]],[],[],[],[]]}};const VOB={};
// clips are already processed to natural depth and pace (tts/proc2.py); playback speed stays at 1
const VO_PITCH=1;
// a failed clip sheet is retried once (a dropped connection); device speech covers until then, and music/effects never wait on it
const VOP={},VOT={};
function voLoad(fac){if(!AU.ctx||!VO_MAP[fac])return null;if(VOB[fac]==='fail'&&(VOT[fac]||0)<2)delete VOB[fac];if(VOB[fac])return VOP[fac]||null;VOB[fac]='loading';VOT[fac]=(VOT[fac]||0)+1;
  return VOP[fac]=fetch(window.VO_INLINE&&VO_INLINE[fac]?'data:audio/mpeg;base64,'+VO_INLINE[fac]:'vo/'+fac+'.mp3?v=3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOB[fac]=buf;return buf;}).catch(e=>{VOB[fac]='fail';audioErr('voice '+fac,e);return null;});}
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

