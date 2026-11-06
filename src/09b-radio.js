/* ===== Commander radio + hero squad voice (2026-11-05) =====
   The host raises plain log events of kind 'r:<key>' (03c-heroes.js, 03-sim.js); pushLog (08-ui.js) calls radioCall(key) here.
   Each callout = a small subtitle (the nation's language + English) and, when the nation's radio sheet vo/CODE_h.mp3 is loaded,
   a short deep radio line. Throttled client-side as well, so it is never spammy. Data (VOH/RADT/RADE) is written by tools/voices/patch_map.py. */
const RADCLS={base:'w',air:'w',armL:'w',armR:'w',msl:'w',town_lost:'bad',town_taken:'g',lost:'',hero:'g',hab:'g'};
const RADGAP={base:25,air:45,armL:40,armR:40,msl:8,lost:25,town_lost:10,town_taken:10,hero:0,hab:0};
const RADS={last:{},any:-99,hide:0,el:null};
const VOHB={};
function vohLoad(fac){if(!AU.ctx||!VOH[fac]||VOHB[fac])return;VOHB[fac]='loading';fetch('vo/'+(VO_SHEET[fac]||fac)+'_h.mp3?v=1').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOHB[fac]=buf;}).catch(e=>{VOHB[fac]='fail';});}
/* plays one clip of the nation's radio sheet; key = event/hero line key; returns true if a clip was started */
function vohPlay(fac,key,over){const buf=VOHB[fac],M=VOH[fac];if(!buf||typeof buf==='string'||!M||!M[key]||!auOn())return false;
  const ent=M[key].find(a=>a&&a.length);if(!ent)return false;const c=AU.ctx;if(AU.voEnd&&c.currentTime<AU.voEnd-.05&&!over)return false;
  const [o,d]=ent[Math.floor(Math.random()*ent.length)],src=c.createBufferSource(),g=c.createGain();src.buffer=buf;
  const vol=Math.max(0,Math.min(1.5,SET.vo/100*1.25)),t0=c.currentTime+.02;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.005);g.gain.setValueAtTime(vol,Math.max(t0+.006,t0+d-.05));g.gain.linearRampToValueAtTime(0,t0+d);AU.voEnd=t0+d;src.connect(g);g.connect(c.destination);
  if(AU.musicOn&&AU.mus){AU.musBus.gain.setTargetAtTime(musBase()*.45,c.currentTime,.05);AU.musBus.gain.setTargetAtTime(musBase(),c.currentTime+d+.1,.25);}src.start(t0,o,d);return true;}
function radSub(key,fac){const T=RADT[fac];if(!T||!T[key])return;let el=RADS.el;
  if(!el||!el.isConnected){if(!document.getElementById('radCss')){const st=document.createElement('style');st.id='radCss';st.textContent='#radsub{position:fixed;z-index:6;left:50%;top:58px;transform:translateX(-50%);max-width:min(78vw,520px);padding:5px 12px 6px;background:rgba(10,14,12,.72);border-left:3px solid var(--rc,#c9a227);border-radius:3px;color:#e8ece4;font:600 15px/1.25 system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .25s;text-align:center}#radsub.on{opacity:1}#radsub small{display:block;font:500 12px/1.2 system-ui,sans-serif;color:#aab5a6;margin-top:2px}#radsub i{font-style:normal;font-size:10px;letter-spacing:.14em;color:#c9a227;margin-right:6px}';document.head.append(st);}
    el=RADS.el=document.createElement('div');el.id='radsub';document.body.append(el);}
  const nat=T[key],en=(typeof RADE!=='undefined'&&RADE[key])||'';el.style.setProperty('--rc',(G&&G.teams[ME]&&G.teams[ME].color)||'#c9a227');
  el.innerHTML='';const i=document.createElement('i');i.textContent='RADIO';el.append(i,document.createTextNode(nat));if(en&&en!==nat){const sm=document.createElement('small');sm.textContent=en;el.append(sm);}
  el.classList.add('on');clearTimeout(RADS.hide);RADS.hide=setTimeout(()=>el.classList.remove('on'),3600);}
/* returns true when the callout was handled (subtitle shown, and voiced or deliberately skipped); false = the caller may use its old voice cue */
function radioCall(key){if(!G||!G.teams[ME])return false;const fac=G.teams[ME].fac,now=performance.now()/1000,gap=RADGAP[key]??15;
  if(now-(RADS.last[key]||-99)<gap)return true;if(key!=='hab'&&key!=='hero'&&now-RADS.any<5)return true;   // never spammy
  RADS.last[key]=now;if(key!=='hab'&&key!=='hero')RADS.any=now;
  if(typeof SET!=='undefined'&&SET.subs===false)return AU.voiceOn&&!!VOHB[fac];
  radSub(key,fac);if(!AU.voiceOn)return true;vohLoad(fac);const ok=vohPlay(fac,key,key==='hab'||key==='msl');
  if(ok){try{duck();}catch(e){}if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}}return ok;}
/* hero squad lines: when a hero squad is among the selected units, select / move / attack use its own 3 lines */
function heroSpeak(fac,kind){if(!G||!G.sel||!VOH[fac])return false;const h=G.sel.find(u=>!u.isB&&u.kind==='champ'&&u.team===ME&&!u.dead);if(!h)return false;
  const key=['hsel','hmove','hatk'][kind];return !!key&&vohPlay(fac,key,false);}
