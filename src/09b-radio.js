/* ===== Commander radio + hero squad voice (2026-11-05) =====
   The host raises plain log events of kind 'r:<key>' (03c-heroes.js, 03-sim.js); pushLog (08-ui.js) calls radioCall(key) here.
   Each callout = one line in the commander's radio feed (English + the nation's own wording in small print) and, when the nation's radio sheet vo/CODE_h.mp3 is loaded,
   a short deep radio line. Throttled client-side as well, so it is never spammy. Data (VOH/RADT/RADE) is written by tools/voices/patch_map.py. */
const RADCLS={base:'w',air:'w',armL:'w',armR:'w',msl:'w',town_lost:'bad',town_taken:'g',lost:'',hero:'g',hab:'g'};
const RADGAP={base:25,air:45,armL:40,armR:40,msl:8,lost:25,town_lost:10,town_taken:10,hero:0,hab:0};
const RADS={last:{},any:-99,nat:''};
const VOHB={};
function vohLoad(fac){if(!AU.ctx||!VOH[fac]||VOHB[fac])return;VOHB[fac]='loading';fetch('vo/'+(VO_SHEET[fac]||fac)+'_h.mp3?v=1').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOHB[fac]=buf;}).catch(e=>{VOHB[fac]='fail';});}
/* plays one clip of the nation's radio sheet; key = event/hero line key; returns true if a clip was started */
function vohPlay(fac,key,over){const buf=VOHB[fac],M=VOH[fac];if(!buf||typeof buf==='string'||!M||!M[key]||!auOn())return false;
  const ent=M[key].find(a=>a&&a.length);if(!ent)return false;const c=AU.ctx;if(AU.voEnd&&c.currentTime<AU.voEnd-.05&&!over)return false;
  const [o,d]=ent[Math.floor(Math.random()*ent.length)],src=c.createBufferSource(),g=c.createGain();src.buffer=buf;
  const vol=Math.max(0,Math.min(1.5,SET.vo/100*1.25)),t0=c.currentTime+.02;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.005);g.gain.setValueAtTime(vol,Math.max(t0+.006,t0+d-.05));g.gain.linearRampToValueAtTime(0,t0+d);AU.voEnd=t0+d;src.connect(g);g.connect(AU.vox||c.destination);
  if(AU.musicOn&&AU.mus){AU.musBus.gain.setTargetAtTime(musBase()*.45,c.currentTime,.05);AU.musBus.gain.setTargetAtTime(musBase(),c.currentTime+d+.1,.25);}src.start(t0,o,d);return true;}
/* ===== Commander's radio feed (idea 10, 2026-11-11): the ONE short text feed of the battle (#log, top left). Every report that reaches
   pushLog() - spoken or not - becomes one line here: a kind icon, the English text, and (for a spoken callout) the nation's own wording in
   small print. At most 3 lines, each fades after ~6 s. A line that knows where it happened (log(team,msg,kind,x,y) from the sim, or the
   town ping raised next to it) can be clicked to move the camera there; Space jumps to the newest such place. View only. ===== */
const RADF={pos:null,tp:null,last:null,n:0};
const RAD_KIND=[[/under attack|under fire|assault|inbound|incoming|REVOLT|turn on us|take cover/i,'atk','⚠'],[/spotted|sighted|detected|flank|moving out|contact/i,'eye','◉'],[/\blost\b|destroyed|killed|CUT OFF|casualt|shrinking/i,'lost','✖'],[/ ready\.$|complete\.|secured|captured|is ours|taken up arms/i,'done','✔'],[/reinforcement|arrived|airborne|drop/i,'plus','✚']];
function radKind(m){for(const r of RAD_KIND)if(r[0].test(m))return r;return [null,'msg','›'];}
function radCss(){if(document.getElementById('radCss'))return;const st=document.createElement('style');st.id='radCss';
  st.textContent='#log div{display:flex;align-items:baseline;gap:6px;font-size:12.5px;padding:3px 9px 3px 6px}#log div i{font-style:normal;flex:none;width:13px;text-align:center;font-size:11px;color:#9fb0a6}#log div i.atk{color:#ff8a70}#log div i.eye{color:#ffd27a}#log div i.lost{color:#ff8a70}#log div i.done{color:#8fe3a4}#log div i.plus{color:#8fc7ff}#log div small{font:500 11px/1.2 system-ui,sans-serif;color:#9aa79f;margin-left:4px}#log div.go{pointer-events:auto;cursor:pointer}#log div.go:hover,#log div.go.vhov{background:rgba(30,40,34,.9);color:#fff}#log div.go:after{content:"\\25B8";color:#c9a227;margin-left:2px;font-size:10px}';document.head.append(st);}
function radFeed(m,k,x,y,nat){const el=document.getElementById('log');if(!el||!m||SET.radio===0)return null;radCss();const now=performance.now();
  if(x==null&&RADF.tp&&now-RADF.tp.t<400&&(k==='bad'||k==='w'||k==='g')){x=RADF.tp.x;y=RADF.tp.y;}
  const d=document.createElement('div'),K=radKind(m),i=document.createElement('i');d.className=k||'';i.className=K[1];i.textContent=K[2];d.append(i,document.createTextNode(m));d._t=now;d._k=k;
  if(nat&&nat!==m){const sm=document.createElement('small');sm.textContent=nat;d.append(sm);}
  if(x!=null&&y!=null)radPin(d,x,y);
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),700);},6000);el.append(d);while(el.children.length>3)el.firstChild.remove();RADF.last=d;RADF.n++;return d;}
function radPin(d,x,y){d._p={x,y};d.classList.add('go');d.title='Click to look there (or press Space)';d.addEventListener('click',e=>{e.stopPropagation();radGo(d._p);});RADF.pos={x,y,g:G};}
/* the town ping raised beside a town report tells where it happened */
function radAt(x,y){const now=performance.now(),d=RADF.last;RADF.tp={x,y,t:now};if(d&&d.isConnected&&!d._p&&now-d._t<400&&(d._k==='bad'||d._k==='w'||d._k==='g'))radPin(d,x,y);}
function radGo(p){if(!p||!G||typeof centerOn!=='function')return false;centerOn(p.x,p.y);try{if(typeof mark==='function')mark({x:p.x,y:p.y,r:26,t:0,d:.7,c:0xc9a227});}catch(e){}return true;}
/* Space: look at the place of the newest report */
function radJump(){const p=RADF.pos;return !!(p&&p.g===G&&radGo(p));}
/* returns true when the callout was handled (subtitle shown, and voiced or deliberately skipped); false = the caller may use its old voice cue */
function radioCall(key){if(!G||!G.teams[ME])return false;const fac=G.teams[ME].fac,now=performance.now()/1000,gap=RADGAP[key]??15;
  if(now-(RADS.last[key]||-99)<gap)return true;if(key!=='hab'&&key!=='hero'&&now-RADS.any<5)return true;   // never spammy
  RADS.last[key]=now;if(key!=='hab'&&key!=='hero')RADS.any=now;
  if(typeof SET!=='undefined'&&SET.subs===false)return AU.voiceOn&&!!VOHB[fac];
  RADS.nat=(RADT[fac]&&RADT[fac][key])||'';if(!AU.voiceOn)return true;vohLoad(fac);const ok=vohPlay(fac,key,key==='hab'||key==='msl');
  if(ok){try{duck();}catch(e){}if(AU.ctx&&AU.sfxOn){const t=AU.ctx.currentTime;nz(AU.sfx,t,.12,'bandpass',2200,0,.08,2);}}return ok;}
/* hero squad lines: when a hero squad is among the selected units, select / move / attack use its own 3 lines */
function heroSpeak(fac,kind){if(!G||!G.sel||!VOH[fac])return false;const h=G.sel.find(u=>!u.isB&&u.kind==='champ'&&u.team===ME&&!u.dead);if(!h)return false;
  const key=['hsel','hmove','hatk'][kind];return !!key&&vohPlay(fac,key,false);}
