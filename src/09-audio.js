/* ================= AUDIO ENGINE: layered weapons, reverb, stereo, recorded soundtrack ================= */
const AU={ctx:null,master:null,sfx:null,mus:null,rev:null,revIn:null,noise:null,musicOn:true,sfxOn:true,voiceOn:true,rate:{},lastVoice:0,voices:[],heat:0};
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
  stBless();speechUnlock();try{const f=(G&&G.teams&&G.teams[ME]&&G.teams[ME].fac)||(typeof setup!=='undefined'&&setup&&setup.p);if(f)voLoad(f);}catch(e){}}
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
  initAudio();}// the soundtrack notices the new engine (stBus) and starts a fresh track for the current scene
function initAudio(){try{if(AU.ctx&&AU.ctx.state==='closed')audioRebuild();if(!AU.ctx){const c=audioCtor();if(!c)return;AU.ctx=c;
    try{if(c.addEventListener)c.addEventListener('statechange',audioState);else c.onstatechange=audioState;}catch(e){}
    AU.master=c.createGain();AU.master.gain.value=.75;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.25;AU.master.connect(comp);comp.connect(c.destination);
    AU.rev=c.createConvolver();AU.rev.buffer=impulse(c,1.8,3.2);AU.revIn=c.createGain();AU.revIn.gain.value=.55;AU.revIn.connect(AU.rev);AU.rev.connect(AU.master);
    AU.sfx=c.createGain();AU.sfx.connect(AU.master);AU.sfxRev=c.createGain();AU.sfxRev.gain.value=.35;AU.sfx.connect(AU.sfxRev);AU.sfxRev.connect(AU.revIn);
    AU.mus=c.createGain();AU.mus.gain.value=.19;AU.mus.connect(AU.master);AU.musBus=AU.mus;// real recordings: no EQ or reverb on the music
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
function sfxShot(x,y,s){stHeat(x,y,.004);if(!auOn()||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02)return;const t=AU.ctx.currentTime+Math.random()*.01;
  if(s<=5){if(!limit('gun',6))return;const b=bus(sp);const n=1+(Math.random()*3|0);for(let i=0;i<n;i++){const ti=t+i*.075;nz(b,ti,.05,'highpass',1600,0,.5,.7);nz(b,ti,.09,'bandpass',900+Math.random()*400,300,.35,1.2);osc(b,ti,'sine',190,70,.05,.25);}}
  else if(s<=8){if(!limit('msl',3))return;const b=bus(sp);nz(b,t,.08,'highpass',2500,0,.4);nz(b,t,.9,'bandpass',350,3200,.32,1.6);osc(b,t,'sawtooth',90,40,.5,.06);}
  else{if(!limit('can',3))return;const b=bus(sp);nz(b,t,.025,'highpass',3000,0,.8);osc(b,t,'sine',95,30,.55,.9);nz(b,t,.5,'lowpass',2200,180,.7,1);nz(b,t+.02,1.2,'lowpass',600,90,.25,.5,AU.brown);}}
function sfxBoom(x,y,s,big){stHeat(x,y,big?.25:.06);if(!auOn()||!AU.sfxOn)return;const sp=spatial(x,y);if(!sp||sp.v<.02||!limit('boom',big?3:4,.15))return;const t=AU.ctx.currentTime,k=Math.min(1,.3+s/40)*(big?1.3:1),d=Math.min(3,.6+s/22);const b=bus(sp);
  nz(b,t,.04,'highpass',2000,0,.9*k);osc(b,t,'sine',big?62:85,24,d*.9,1.1*k,.006);nz(b,t,d,'lowpass',big?1600:2400,120,.9*k,.7);nz(b,t+.03,d*1.4,'lowpass',500,60,.5*k,.5,AU.brown);
  for(let i=0;i<(big?14:6);i++){const ti=t+.08+Math.random()*d*.6;nz(b,ti,.03+Math.random()*.04,'bandpass',1500+Math.random()*3000,0,.12*k*Math.random(),3);}}
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
function sfxAlarm(){AU.heat=Math.min(1,AU.heat+.4);if(!auOn()||!AU.sfxOn)return;const c=AU.ctx,t=c.currentTime;for(let i=0;i<5;i++){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(480,t+i*.6);o.frequency.linearRampToValueAtTime(900,t+i*.6+.5);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=2200;g.gain.setValueAtTime(.0001,t+i*.6);g.gain.linearRampToValueAtTime(.08,t+i*.6+.05);g.gain.linearRampToValueAtTime(0,t+i*.6+.55);o.connect(f);f.connect(g);g.connect(AU.sfx);o.start(t+i*.6);o.stop(t+i*.6+.6);}}
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
function speak(kind){if(kind===4)AU.heat=Math.min(1,AU.heat+.4);// base under attack: battle music
  if(!AU.voiceOn||!G)return;const now=performance.now();if(now-AU.lastVoice<1300)return;AU.lastVoice=now;{const fac=G.teams[ME].fac;voLoad(fac);if(voPlay(fac,kind)){if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}return;}}if(!window.speechSynthesis)return;
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


/* ---------- soundtrack ---------- */
// One shared soundtrack of real recorded tracks for all 18 nations, Shia factions included (Abdullah, 2026-10-27; he
// picked these from a shortlist). Files: mus/st/<id>.mp3, made by mus/st/encode.py (96 kbps, -16 LUFS); titles, authors,
// licences and sources are in mus/st/manifest.json and the menu credits. Pools: menu (main menu, lobby), calm (battle,
// quiet), combat (battle, fighting), victory, defeat. A battle starts calm and turns to combat when AU.heat (explosions,
// gunfire and alarms near the camera) runs high, and back when it cools, with 3 s crossfades and at least 60 s in a
// mood before it may switch again. Each pool plays in random order without repeating the track just played. Every track
// streams through an <audio> element that only gets its file when it is about to play, so a phone downloads one track
// at a time. A nation's identity is its anthem (public-domain US Navy Band recording, mus/an_<CODE>.mp3, where one
// exists) at battle start and on victory, with the soundtrack ducked under it. Purely local audio: nothing here
// touches the battle or the network.
const ST_TRACKS={menu:['menu-02','menu-04'],calm:['calm-01','calm-02','calm-03','calm-05'],
  combat:['combat-01','combat-02','combat-05','combat-06','combat-09','combat-11'],victory:['victory-01'],defeat:['defeat-02']};
const ST={decks:[],cur:null,scene:null,mood:'calm',moodT:0,dwell:60,xf:3,bag:{},lastId:null,bus:null,ctx:null,endG:null,log:[],errs:0,hold:false,tapped:false,anFac:null,anUntil:0};
const ST_GAIN=4.2,ST_HOT=.35,ST_COOL=.1,AN_GAIN=6;
function stNow(){return performance.now()/1000;}
// the decks' shared bus (ducked under the anthem); a rebuilt engine drops the old decks, which belong to the old one
function stBus(){const c=AU.ctx;if(!c)return null;if(ST.ctx!==c){for(const d of ST.decks)try{d.el.pause();d.el.removeAttribute('src');d.el.load();}catch(e){}
    ST.decks=[];ST.cur=null;ST.ctx=c;ST.bus=c.createGain();ST.bus.gain.value=1;ST.bus.connect(AU.musBus);}return ST.bus;}
function stDeck(i){if(!stBus())return null;let d=ST.decks[i];if(d)return d;
  const el=new Audio();el.preload='none';el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');try{el.disableRemotePlayback=true;}catch(e){}
  d={el,i,id:null,g:null,tok:0,fading:false,blocked:false,fadeIn:0,old:null};
  try{const s=AU.ctx.createMediaElementSource(el);d.g=AU.ctx.createGain();d.g.gain.value=0;s.connect(d.g);d.g.connect(ST.bus);}catch(e){d.g=null;audioErr('music deck',e);}
  // the crossfade starts once the new track really plays (a phone may need a moment to fetch its first bytes)
  el.addEventListener('playing',()=>{if(!d.fadeIn)return;const xf=d.fadeIn;d.fadeIn=0;stGain(d,1,xf);if(d.old){stFadeOut(d.old,xf);d.old=null;}});
  el.addEventListener('ended',()=>{if(ST.cur===d&&!d.fading)stAdvance();});
  el.addEventListener('error',()=>{if(!d.id||d.fading)return;audioErr('music '+d.id,{name:'media error '+((el.error&&el.error.code)||'?')});
    if(d.old){stFadeOut(d.old,1);d.old=null;}if(ST.cur===d&&ST.errs++<6)setTimeout(()=>{if(ST.cur===d)stAdvance();},1500);});
  return ST.decks[i]=d;}
function stGain(d,v,sec){if(d.g){const c=AU.ctx,p=d.g.gain,t=c.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(Math.max(.0001,p.value),t);p.linearRampToValueAtTime(Math.max(.0001,v*ST_GAIN),t+Math.max(.05,sec));}
  else d.el.volume=v?Math.min(1,SET.mus/100*(AU.musicOn?1:0)):0;}
function stStop(d){d.el.pause();d.el.removeAttribute('src');try{d.el.load();}catch(e){}d.id=null;d.fading=false;d.fadeIn=0;d.old=null;}
function stFadeOut(d,sec){if(!d||!d.id)return;d.fading=true;stGain(d,0,sec);const tok=d.tok;setTimeout(()=>{if(d.tok===tok&&ST.cur!==d)stStop(d);},sec*1000+300);}
function stResume(d){if(!d||!d.id||ST.hold)return;d.blocked=false;try{const p=d.el.play();if(p&&p.catch)p.catch(e=>{if(e&&e.name==='NotAllowedError')d.blocked=true;else if(e&&e.name!=='AbortError')audioErr('music play',e);});}catch(e){audioErr('music play',e);}}
// next track of a pool: a shuffled bag, refilled when empty, never starting with the track that just played
function stNext(pool){const L=ST_TRACKS[pool];if(!L||!L.length)return null;let b=ST.bag[pool];
  if(!b||!b.length){b=ST.bag[pool]=L.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}if(b.length>1&&b[0]===ST.lastId)b.push(b.shift());}
  return b.shift();}
function stPlay(id){if(!id||!AU.ctx||!stBus())return;let old=ST.cur&&ST.cur.id?ST.cur:null;
  if(old&&old.fadeIn){const prev=old.old;stStop(old);old=prev&&prev.id?prev:null;}// the last change never got going: replace it
  const D=ST.decks,d=stDeck(old?1-old.i:(D[0]&&D[0].id&&!(D[1]&&D[1].id)?1:0));if(!d)return;
  if(d.id)stStop(d);d.tok++;d.id=id;d.fading=false;d.fadeIn=old?ST.xf:.6;d.old=old;stGain(d,0,.05);
  d.el.src='mus/st/'+id+'.mp3';ST.cur=d;ST.lastId=id;ST.log.push(ST.scene+':'+id);if(ST.log.length>40)ST.log.shift();stResume(d);
  if(ST.hold&&old){stFadeOut(old,.1);d.old=null;}}
function stPool(){return ST.scene==='battle'?ST.mood:ST.scene;}
function stAdvance(){if(ST.scene==='victory'||ST.scene==='defeat')ST.scene='menu';if(stWant())stPlay(stNext(stPool()));}
function stHush(sec){if(ST.cur){const d=ST.cur;ST.cur=null;if(d.old){stFadeOut(d.old,sec);d.old=null;}stFadeOut(d,sec);}}
// the soundtrack plays when music is on and the player isn't listening to their own imported music
function stWant(){return AU.musicOn&&!MYM.on&&!(myMode()==='mine'&&MYM.list.length);}
function stHeat(x,y,a){try{if(G&&!G.over&&Math.hypot(x-cam.x,y-cam.y)<cam.dist*2.2)AU.heat=Math.min(1,AU.heat+a);}catch(e){}}
// iPhones only let an <audio> element play after a tap has played it once: bless both decks on the first taps
function stBless(){if(!IOSLIKE)return;for(const i of [0,1]){const d=stDeck(i);if(!d||d.blessed||d.id)continue;d.blessed=1;const tok=++d.tok;
  try{d.el.src=silentURI();const p=d.el.play();if(p&&p.then)p.then(()=>{if(d.tok===tok&&!d.id){d.el.pause();d.el.removeAttribute('src');}},()=>{d.blessed=0;});}catch(e){d.blessed=0;}}}
function stTick(){AU.heat=Math.max(0,AU.heat-.006);if(!AU.ctx)return;
  const hold=audioHeld()||document.hidden;// a paused battle or a hidden page stops the stream (and the phone's data use)
  if(hold!==ST.hold){ST.hold=hold;for(const d of ST.decks)if(d.id){if(hold)d.el.pause();else if(d===ST.cur||d.fading)stResume(d);}}
  if(myMode()==='mine'&&MYM.list.length){if(!MYM.on&&!MYM.busy&&ST.tapped&&ST.scene){MYM.busy=1;myStart().finally(()=>{MYM.busy=0;});}}else if(MYM.on)myStop();
  if(ST.scene==='battle'&&onMenu()&&!(G&&G.over&&ST.endG===G)){ST.scene='menu';if(ST.cur)stAdvance();}
  if(ST.anFac){const e=ANB[ST.anFac];if(e&&e.st==='ok'&&!hold){anPlay(ST.anFac);ST.anFac=null;}else if(stNow()>ST.anUntil||(e&&e.st==='fail'))ST.anFac=null;}
  if(!stWant()){stHush(.8);return;}
  if(!ST.scene||hold)return;
  if(ST.scene==='battle'){const t=stNow(),dw=t-ST.moodT>=ST.dwell;
    if(ST.mood==='calm'&&AU.heat>ST_HOT&&dw){ST.mood='combat';ST.moodT=t;stPlay(stNext('combat'));return;}
    if(ST.mood==='combat'&&AU.heat<ST_COOL&&dw){ST.mood='calm';ST.moodT=t;stPlay(stNext('calm'));return;}}
  const d=ST.cur;if(!d){stPlay(stNext(stPool()));return;}
  // start the next track a crossfade before this one ends
  const el=d.el;if(!d.fading&&!d.fadeIn&&!el.paused&&isFinite(el.duration)&&el.duration>ST.xf*2&&el.currentTime>el.duration-ST.xf-.3)stAdvance();}
// ----- anthems -----
// Public-domain US Navy Band recordings, a 26 s excerpt each (cut by mus/an_pack.py), for every nation that has one.
const AN_FAC=/*ANFAC*/{US:1,EU:1,IL:1,UA:1,CU:1,IN:1,CN:1,EG:1};
const ANB={};
function anLoad(fac){if(!AU.ctx||!AN_FAC[fac])return;const s=ANB[fac];if(s&&(s.st==='ok'||s.st==='loading'||(s.tries||0)>=2))return;const e=ANB[fac]={st:'loading',tries:((s&&s.tries)||0)+1};
  fetch('mus/an_'+fac+'.mp3').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{e.buf=buf;e.st='ok';}).catch(err=>{e.st='fail';audioErr('anthem',err);});}
function anQueue(fac){if(!AN_FAC[fac])return;anLoad(fac);ST.anFac=fac;ST.anUntil=stNow()+10;}// plays when loaded, if that takes under 10 s
function anStop(fade){const a=AU.an;if(!a||!AU.ctx)return;AU.an=null;const c=AU.ctx;try{a.g.gain.cancelScheduledValues(c.currentTime);a.g.gain.setTargetAtTime(.0001,c.currentTime,(fade||.4)/3);a.src.stop(c.currentTime+(fade||.4)+.1);}catch(e){}
  try{if(ST.bus){ST.bus.gain.cancelScheduledValues(c.currentTime);ST.bus.gain.setTargetAtTime(1,c.currentTime,.4);}}catch(e){}}
function anPlay(fac){const e=ANB[fac];if(!e||e.st!=='ok'||!AU.ctx)return false;const c=AU.ctx,t=c.currentTime+.05,L=e.buf.duration;anStop(.2);stBus();
  const src=c.createBufferSource(),g=c.createGain();src.buffer=e.buf;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(AN_GAIN,t+.08);
  src.connect(g);g.connect(AU.musBus);src.start(t);
  const b=ST.bus.gain;b.cancelScheduledValues(t);b.setTargetAtTime(.3,t,.25);b.setTargetAtTime(1,t+L-2.5,.8);
  AU.an={src,g,fac,end:t+L};src.onended=()=>{if(AU.an&&AU.an.src===src)AU.an=null;};ST.log.push('anthem:'+fac);return true;}
// ----- entry points -----
// a battle starts (08-ui afterStart): anthem, then the calm pool (or the player's own music)
function startMusic(fac){if(!AU.ctx)return;ST.scene='battle';ST.mood='calm';ST.moodT=stNow();ST.endG=null;AU.heat=0;anStop(1.5);anQueue(fac);
  if(stWant())stPlay(stNext('calm'));}
function stopMusic(){stHush(1);try{anStop(1);}catch(e){}myStop();}
// the battle ends (showEnd in 08-ui): victory or defeat track once, the anthem on victory, then the menu pool
function stEnd(){if(!G||ST.endG===G)return;ST.endG=G;const won=(($('endt')&&$('endt').textContent)||'')==='Victory';ST.scene=won?'victory':'defeat';
  anStop(1);if(won&&G.teams&&G.teams[ME])anQueue(G.teams[ME].fac);if(AU.ctx&&stWant())stPlay(stNext(ST.scene));}
if(typeof showEnd==='function'){const _showEnd=showEnd;showEnd=function(){const r=_showEnd.apply(this,arguments);try{stEnd();}catch(e){audioErr('music end',e);}return r;};}
setInterval(()=>{try{stTick();}catch(e){audioErr('music',e);}},250);

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
// with My music on, the soundtrack fades out; switching back lets stTick start the soundtrack again
async function myStart(){MYM.list=await myList();if(myMode()==='mine'&&MYM.list.length&&AU.ctx){stHush(1);if(!MYM.on)myNext();return true;}myStop();return false;}
function myUI(){const n=$('myN');if(n)n.textContent=MYM.list.length?(MYM.list.length+' track'+(MYM.list.length>1?'s':'')+' imported'+(MYM.on&&MYM.list[MYM.i]?' · now playing: '+MYM.list[MYM.i].name:'')):'No tracks imported yet';
  const s=$('sTrk');if(s)for(const b of s.querySelectorAll('button'))b.classList.toggle('on',b.dataset.v===myMode());}
// ===== Menu music =====
// The main menu and lobby play the menu pool; browsers only allow sound after a tap or click, so it starts on the
// first one (and a track the browser blocked resumes on the next tap). Starting a battle crossfades into the battle
// pools; quitting crossfades back.
function onMenu(){const m=$('menu');return !G||G.over||(m&&m.hidden===false);}
function menuMusic(){if(!AU.ctx||!ST.tapped)return;if(ST.cur&&ST.cur.blocked&&!ST.hold)stResume(ST.cur);
  if(!ST.scene&&onMenu()){ST.scene='menu';if(stWant())stPlay(stNext('menu'));}}
{const ACT={touchend:1,click:1,keydown:1,pointerup:1,mousedown:1};
  const kick=ev=>{try{if(ACT[ev.type]){ST.tapped=true;if(!AU.ctx||AU.ctx.state!=='running'||(IOSLIKE&&SIL.el&&SIL.el.paused)||!SIL.ok&&IOSLIKE||!AU.spOK)audioUnlock();}
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
  p.push('Music: '+(ST.cur&&ST.cur.id?ST.scene+' · '+ST.cur.id+(ST.cur.el.paused?' (paused)':''):MYM.on?'my music':'none')+(AU.an?', anthem '+AU.an.fac:''));
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

