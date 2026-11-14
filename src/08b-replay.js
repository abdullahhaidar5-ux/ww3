/* ================= REPLAYS: record every battle, watch it again, save it as a small file =================
   Abdullah 2026-11-03: "every battle (skirmish and online) can be saved and re-watched".

   Why snapshots and not the order stream: the simulation is only reproducible under lab conditions (orch/headless.mjs
   seeds Math.random, freezes the pathfinding clock and swaps in one plain-JS Math.sin/cos/atan2), never in a real battle:
   it uses the browser's own Math.random, a pathfinding time budget measured with performance.now, larger steps on slow
   frames, and Safari and Chrome round trigonometry differently. Re-running the orders would drift into a different
   battle within seconds. So a replay is the battle as this screen saw it, written down like the host's own snapshots:
     - skirmish / hosting in this browser: every unit and building (nothing hidden, so the viewer can switch sides
       or turn the fog off), sampled twice a game-second (only what changed), a full keyframe every 10 s, every visual
       effect, and each side's money / derricks / who is out once a second ('S', 'E', 'T' frames);
     - an online player (the battle runs on the host or the game server): exactly the snapshots, effects and team
       panels this page received ('s', 'e', 't' frames: their own view, fog included).
   Watching feeds those frames through the same code a multiplayer client uses (applySnap / applyEvents / applyTeam,
   07-net) with MODE 'client' and no connection, so orders go nowhere (doAct) and the battle looks exactly as it did.
   Files: 'WW3R1' line, header JSON line, then gzip segments (4-byte length + bytes, ~30 game-s each, compressed while
   the battle runs so a phone never holds the whole battle as text). orch/replaytest.mjs checks a replay ends where the
   live battle ended. */
const RP={on:false,rec:null,last:null,frames:null,hdr:null,i:0,spd:1,paused:false,kf:[],fog:true,view:0,loading:false,
  SEG_T:30,SNAP_DT:.5,KF_DT:10,TEAM_DT:1,EV_MAX:400};
function rpCanZip(){return typeof CompressionStream==='function'&&typeof DecompressionStream==='function'&&typeof Response==='function';}
async function rpZip(s){const b=new TextEncoder().encode(s);if(!rpCanZip())return {z:0,b};
  try{const st=new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'));return {z:1,b:new Uint8Array(await new Response(st).arrayBuffer())};}catch(e){return {z:0,b};}}
async function rpUnzip(seg){if(!seg.z)return new TextDecoder().decode(seg.b);
  const st=new Blob([seg.b]).stream().pipeThrough(new DecompressionStream('gzip'));return await new Response(st).text();}
/* ---------- recording ---------- */
function rpRecStart(o){if(RP.loading||RP.on)return;const si={};for(const k of ['seed','facs','map','tm','w','st','bs','slot','sandbox'])if(o[k]!==undefined)si[k]=Array.isArray(o[k])?o[k].slice():o[k];
  RP.rec={si,g:null,mode:null,full:false,lines:[],segs:[],segT:0,snapT:-1,kfT:-1,teamT:-1,ev:[],at:Date.now(),t:0,n:0};}
// called each frame (08-ui loop) after the battle step
function rpRecTick(){const R=RP.rec;if(!R||RP.on||!G)return;if(!R.g){R.g=G;R.mode=MODE;R.me=ME;R.full=MODE!=='client'||!!NET.spec;R.sp=NET.spec?1:0;}if(R.g!==G)return;
  R.t=Math.max(R.t,G.t);if(MODE!=='client'){if(R.ev.length){rpLine(R,'E',{e:R.ev});R.ev=[];}
    if(G.t>=R.snapT){R.snapT=G.t+RP.SNAP_DT;rpSnapS(R,G.t>=R.kfT);}
    if(G.t>=R.teamT){R.teamT=G.t+RP.TEAM_DT;rpLine(R,'T',{c:G.teams.map(T=>Math.floor(T.credits||0)),o:G.teams.map(T=>T.out?1:0),oil:(G.oil||[]).map(o=>[o.owner,o.dead?1:0]),fa:(G.fields||[]).map(f=>f.amt|0),wx:G.wx?G.wx.k:'clear'});}}
  if(G.t-R.segT>=RP.SEG_T)rpSeg(R);}
function rpSnapS(R,kf){if(kf)R.kfT=G.t+RP.KF_DT;const last=R.last||(R.last=new Map()),seen=new Set(),e=[];
  for(const x of G.ents){if(x.dead)continue;let a;try{a=encEnt(x,false);}catch(err){continue;}seen.add(a[0]);const s=a.join(',');if(kf||last.get(a[0])!==s){last.set(a[0],s);e.push(a);}}
  const dr=[];for(const id of last.keys())if(!seen.has(id)){dr.push(id);last.delete(id);}
  const d={t:+G.t.toFixed(2),iv:RP.SNAP_DT,e};if(kf)d.f=1;if(dr.length)d.dr=dr;rpLine(R,'S',d);}
function rpLine(R,k,d){R.lines.push((G?G.t:0).toFixed(2)+'|'+k+'|'+JSON.stringify(d));R.n++;}
function rpSeg(R){R.segT=G?G.t:0;if(!R.lines.length)return;const s=R.lines.join('\n');R.lines=[];R.segs.push(rpZip(s));}
// every visual effect of a skirmish / browser-hosted battle (03-sim FXE), noted for the 'E' frames
function rpFx(type,args,own){const R=RP.rec;if(!R||RP.on||!G||MODE==='client'||type==='end'||R.g&&R.g!==G)return;if(R.ev.length>=RP.EV_MAX&&(type==='muz'||type==='tr'))return;
  try{const v=[type,...args];if(own!=null)v.own=own;R.ev.push(JSON.parse(JSON.stringify(v)));}catch(e){}}
// an online player: what arrived from the battle, as it arrived
function rpIn(k,d){const R=RP.rec;if(!R||RP.on||!G||MODE!=='client'||!d)return;if(!R.g){R.g=G;R.mode='client';R.me=ME;R.full=!!NET.spec;R.sp=NET.spec?1:0;}if(R.g!==G)return;R.t=Math.max(R.t,G.t);try{rpLine(R,k,d);}catch(e){}}
{const _fxe=FXE;FXE=function(type,args,own){try{rpFx(type,args,own);}catch(e){}return _fxe(type,args,own);};}
{const _ng=newGame;newGame=function(o){const r=_ng.apply(this,arguments);try{rpRecStart(o);}catch(e){}return r;};}
{const _s=applySnap,_e=applyEvents,_t=applyTeam;RP._s=_s;RP._e=_e;RP._t=_t;
  applySnap=function(d){rpIn('s',d);return _s(d);};applyEvents=function(d){rpIn('e',d);return _e(d);};applyTeam=function(d){rpIn('t',d);return _t(d);};}
// the finished recording: header + compressed segments, as one file
async function rpPack(){const R=RP.rec;if(!R||!R.g)return null;
  // the battle's very last moment as a keyframe, so the replay ends exactly where the battle ended
  if(R.full&&G===R.g&&!RP.on&&G.t>(R.endT||-1)){R.endT=G.t;if(R.ev.length){rpLine(R,'E',{e:R.ev});R.ev=[];}rpSnapS(R,true);R.t=Math.max(R.t,G.t);}
  rpSeg(R);const segs=await Promise.all(R.segs);
  const hdr={v:1,si:R.si,me:R.me|0,full:R.full?1:0,sp:R.sp?1:0,mode:R.mode,dur:+R.t.toFixed(1),at:R.at,facs:R.si.facs,map:R.si.map,ver:typeof NET_PV==='number'?NET_PV:0,
    win:R.g.winner!=null?R.g.winner:-1,z:segs.map(s=>s.z)};
  const head=new TextEncoder().encode('WW3R1\n'+JSON.stringify(hdr)+'\n');let n=head.length;for(const s of segs)n+=4+s.b.length;
  const out=new Uint8Array(n);out.set(head,0);let p=head.length;for(const s of segs){new DataView(out.buffer).setUint32(p,s.b.length,true);out.set(s.b,p+4);p+=4+s.b.length;}return out;}
async function rpParse(buf){const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);const td=new TextDecoder();let a=u.indexOf(10);if(a<0||td.decode(u.subarray(0,a))!=='WW3R1')throw new Error('not a World War 3 replay file');
  const b=u.indexOf(10,a+1);if(b<0)throw new Error('replay file is damaged');const hdr=JSON.parse(td.decode(u.subarray(a+1,b)));let p=b+1,i=0;const frames=[];
  while(p+4<=u.length){const L=new DataView(u.buffer,u.byteOffset+p,4).getUint32(0,true);const seg={z:hdr.z?hdr.z[i]|0:1,b:u.subarray(p+4,p+4+L)};p+=4+L;i++;
    const txt=await rpUnzip(seg);for(const ln of txt.split('\n')){const x=ln.indexOf('|'),y=ln.indexOf('|',x+1);if(x<0||y<0)continue;frames.push([+ln.slice(0,x),ln.slice(x+1,y),ln.slice(y+1)]);}}
  if(!Array.isArray(hdr.si&&hdr.si.facs)||!hdr.si.facs.every(f=>FKEYS.includes(f)||f==='EU'))throw new Error('this replay has nations this version does not know');return {hdr,frames};}
/* ---------- watching ---------- */
async function rpWatch(buf){let P;try{P=await rpParse(buf);}catch(e){uiDialog('Could not open the replay: '+(e&&e.message||e),{yes:'OK',no:'Close'},()=>{});return false;}
  if(typeof NET_PV==='number'&&(P.hdr?.ver|0)!==NET_PV){uiDialog('This replay was recorded with an older version of the game (before Conquest) and cannot be played back.',{yes:'OK',no:'Close'},()=>{});return false;}
  if(NET.game||NET.code)try{leaveNet();}catch(e){}try{kcReset();}catch(e){}
  $('end').hidden=true;RP.hdr=P.hdr;RP.frames=P.frames;RP.i=0;RP.spd=1;RP.paused=false;RP.kf=[];RP.fog=!P.hdr.full;RP.view=P.hdr.me|0;
  P.frames.forEach((f,i)=>{if(f[1]==='S'&&f[2].indexOf('"f":1')>=0)RP.kf.push(i);});
  const si=P.hdr.si;MODE='client';ME=Math.max(0,Math.min(si.facs.length-1,P.hdr.me|0));RP.loading=true;TERR_DEFER=true;
  try{newGame(Object.assign({},si,{keepMap:1,ai:si.facs.map(()=>false)}));}finally{TERR_DEFER=false;RP.loading=false;}
  RP.on=true;G.rp=1;NET.spec=P.hdr.sp?1:0;NET.specAll=0;Object.assign(NET,{lastSnapT:0,iv:RP.SNAP_DT,ia:0,iaDev:0,rxW:0,prevT:0,cq:[]});document.body.classList.add('rp');
  rpBar();await afterStart();rpBarSync();return true;}
function rpApply(f,quiet){const [t,k,s]=f;let d;try{d=JSON.parse(s);}catch(e){return;}
  if(k==='S'||k==='s'){if(k==='S'){const st=d.t;for(const e of G.ents){e.seenAt=st;e.seenL=G.t;}}if(d.f&&k==='S'){const ids=new Set(d.e.map(a=>a[0]));for(const e of G.ents)if(!ids.has(e.id))e.gone=true;}_rpApplySnap(d);}
  else if(k==='E'||k==='e'){if(!Array.isArray(d.e))return;d.e=d.e.filter(v=>Array.isArray(v)&&v[0]!=='end'&&(!quiet||v[0]==='die'||v[0]==='gone'||v[0]==='civd'||v[0]==='oilDry'||v[0]==='est'));try{_rpApplyEvents(d);}catch(e){}}
  else if(k==='t'){try{_rpApplyTeam(d);}catch(e){}}
  else if(k==='T'){(d.c||[]).forEach((c,i)=>{if(G.teams[i])G.teams[i].credits=c;});(d.o||[]).forEach((o,i)=>{if(G.teams[i]&&o)G.teams[i].out=true;});
    (d.oil||[]).forEach((v,i)=>{const o=G.oil&&G.oil[i];if(o){o.owner=v[0];o.dead=!!v[1];}});(d.fa||[]).forEach((a,i)=>{if(G.fields&&G.fields[i])G.fields[i].amt=a;});if(typeof WEATHER==='object'&&WEATHER[d.wx]){G.wx=G.wx||{t:0,next:1e9};G.wx.k=d.wx;}}}
// the real appliers (the recording wrappers above would note the replay again)
function _rpApplySnap(d){return RP._s(d);}
function _rpApplyEvents(d){return RP._e(d);}
function _rpApplyTeam(d){return RP._t(d);}
function rpTick(dt){if(!G||!RP.frames)return;if(RP.paused){rpVis();return;}const sdt=dt*RP.spd,to=G.t+sdt;const F=RP.frames;
  while(RP.i<F.length&&F[RP.i][0]<=to){rpApply(F[RP.i]);RP.i++;}clientTick(sdt);rpVis();
  if(RP.i>=F.length&&G.t>=(RP.hdr.dur||0)){RP.paused=true;rpBarSync();try{pushLog('End of the replay. Drag the timeline to watch any moment again.','g');}catch(e){}}
  RP.uiT=(RP.uiT||0)-dt;if(RP.uiT<=0){RP.uiT=.25;rpBarSync();}}
// jump to a moment: start from the last keyframe before it (or the very start) and apply everything up to it at once
function rpSeek(t){if(!G||!RP.frames)return;const F=RP.frames;t=Math.max(0,Math.min(RP.hdr.dur||0,t));let s=0;for(const i of RP.kf){if(F[i][0]<=t)s=i;else break;}
  for(const e of G.ents){e.gone=true;}for(const e of G.ents)G.byId.delete(e.id);G.ents=[];G.sel=[];NET.lastSnapT=0;NET.prevT=0;NET.rxW=0;
  G.t=s?F[s][0]:0;if(!s){// a partial recording (an online player's own view) has no keyframes: replay its start quietly
    for(let i=0;i<F.length&&F[i][0]<=t;i++){G.t=F[i][0];rpApply(F[i],true);}}
  else for(let i=s;i<F.length&&F[i][0]<=t;i++){G.t=F[i][0];rpApply(F[i],true);}
  RP.i=0;while(RP.i<F.length&&F[RP.i][0]<=t)RP.i++;G.t=t;for(const e of G.ents){e.seenL=t;if(e.tx!=null){e.x=e.tx;e.y=e.ty;e.fx=e.tx;e.fy=e.ty;}}
  rpBarSync();}
// player view with fog: only what that side (and its allies) could see; 'everything' = no fog at all
function rpVis(){if(!G)return;if(!RP.fog){for(const e of G.ents)e.vis=true;return;}if(!RP.hdr||!RP.hdr.full)return;visFor();}
function visFor(){const mine=G.ents.filter(e=>!e.dead&&ally(e.team,ME)),sk=(G.teams[ME].F.mods.sight||1)*1.08;
  const R=e=>(!e.isB&&e.s&&e.s.vis?e.s.vis:e.isB?340:e.s&&e.s.dom==='air'?340:e.s&&e.s.dom==='naval'?380:280)*sk;
  for(const e of G.ents){if(ally(e.team,ME)){e.vis=true;continue;}let v=false;for(const m of mine){const r=R(m)+(e.r||0),dx=m.x-e.x,dy=m.y-e.y;if(dx*dx+dy*dy<r*r){v=true;break;}}if(!v&&e.isB&&e.seenBy&&e.seenBy[ME])v=true;if(v&&e.isB)(e.seenBy=e.seenBy||{})[ME]=1;e.vis=v;}}
function rpSetView(k){if(!G||!RP.on)return;if(k<0){RP.fog=false;}else{if(!RP.hdr.full&&k!==(RP.hdr.me|0))return;RP.fog=true;ME=k;RP.view=k;try{const b=BASES[k];if(b)centerOn(b[0],b[1]);}catch(e){}}
  fogT=0;rpBarSync();}
function rpExit(){RP.on=false;NET.spec=0;RP.frames=null;RP.hdr=null;document.body.classList.remove('rp');const b=$('rpBar');if(b)b.hidden=true;try{quitGame();}catch(e){}}
/* ---------- the replay bar: play/pause, speed, timeline, whose view, exit (mouse and touch alike) ---------- */
function rpT(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function rpBar(){let b=$('rpBar');if(!b){b=document.createElement('div');b.id='rpBar';b.innerHTML='<button type="button" id="rpPlay">❚❚</button><span id="rpSp"></span><input id="rpTl" type="range" min="0" max="100" step="0.5" value="0"><span id="rpTm">0:00</span><select id="rpView"></select><button type="button" id="rpExit">✕ Exit replay</button>';
    document.body.appendChild(b);const st=document.createElement('style');st.textContent='#rpBar{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:60;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 16px);background:rgba(10,14,12,.86);border:1px solid #4a5a48;border-radius:8px;padding:6px 8px;color:#e8eadf;font:600 15px system-ui,sans-serif}#rpBar button,#rpBar select{min-height:36px;min-width:40px;background:#26312a;color:#e8eadf;border:1px solid #56685a;border-radius:6px;font:inherit;padding:0 10px}#rpBar button.on{background:#7a8f3c;color:#111}#rpTl{width:min(320px,48vw);height:28px}body.rp #side{display:none!important}';document.head.appendChild(st);
    $('rpPlay').onclick=()=>{if(RP.i>=(RP.frames||[]).length&&RP.paused)rpSeek(0);RP.paused=!RP.paused;rpBarSync();};$('rpExit').onclick=rpExit;
    const sp=$('rpSp');for(const v of [1,2,4,8]){const x=document.createElement('button');x.type='button';x.dataset.v=v;x.textContent=v+'x';x.onclick=()=>{RP.spd=v;rpBarSync();};sp.appendChild(x);}
    const tl=$('rpTl');tl.oninput=()=>{RP.drag=1;$('rpTm').textContent=rpT(+tl.value)+' / '+rpT(RP.hdr&&RP.hdr.dur);};tl.onchange=()=>{RP.drag=0;rpSeek(+tl.value);};
    $('rpView').onchange=e=>rpSetView(+e.target.value);}
  b.hidden=false;const V=$('rpView');V.innerHTML='';const H=RP.hdr,add=(v,t)=>{const o=document.createElement('option');o.value=v;o.textContent=t;V.appendChild(o);};
  if(H.full)add(-1,'Everything (no fog)');H.si.facs.forEach((f,i)=>{if(H.full||i===(H.me|0))add(i,(FACTIONS[f]?FACTIONS[f].name:f)+(i===(H.me|0)?' (you)':'')+"'s view");});
  $('rpTl').max=String(Math.max(1,H.dur||1));rpBarSync();}
function rpBarSync(){const b=$('rpBar');if(!b||!RP.hdr)return;$('rpPlay').textContent=RP.paused?'▶':'❚❚';for(const x of $('rpSp').children)x.classList.toggle('on',+x.dataset.v===RP.spd);
  if(!RP.drag&&G){$('rpTl').value=String(Math.min(RP.hdr.dur||0,G.t));$('rpTm').textContent=rpT(G.t)+' / '+rpT(RP.hdr.dur);}$('rpView').value=String(RP.fog?RP.view:-1);}
/* ---------- end of battle: Watch replay / Save replay; main menu: Watch a replay file ---------- */
function rpEndBtns(){const row=$('again')&&$('again').parentNode;if(!row)return;let w=$('rpWatch'),s=$('rpSave');
  if(!w){w=document.createElement('button');w.id='rpWatch';w.type='button';w.className='big ghost';w.textContent='▶ Watch replay';w.onclick=async()=>{const u=await rpPack();if(u)rpWatch(u);};row.insertBefore(w,$('change'));}
  if(!s){s=document.createElement('button');s.id='rpSave';s.type='button';s.className='big ghost';s.textContent='⬇ Save replay';s.onclick=rpSave;row.insertBefore(s,$('change'));}
  const ok=!!(RP.rec&&RP.rec.g&&RP.rec.n>0&&!RP.on);w.hidden=!ok;s.hidden=!ok||!rpCanSave();}
// the claude.ai artifact edition runs in a sandbox that may not allow downloads: Save is offered on the website only
function rpCanSave(){return !!window.WW3_P2P;}
async function rpSave(){const u=await rpPack();if(!u)return;const H=RP.rec,d=new Date(H.at),p=n=>String(n).padStart(2,'0');
  const name=`ww3-replay-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${(H.si.facs||[]).join('-')}.ww3replay`;
  const url=URL.createObjectURL(new Blob([u],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  const s=$('rpSave');if(s){const o=s.textContent;s.textContent='Saved ✓ ('+Math.max(1,Math.round(u.length/1024))+' KB)';setTimeout(()=>{s.textContent=o;},2500);}}
function rpMenuBtn(){const sb=$('sandbox')||$('start');if(!sb||$('rpOpen'))return;const b=document.createElement('button');b.id='rpOpen';b.type='button';b.className=sb.className||'big ghost';b.textContent='▶ Watch a replay file';
  const inp=document.createElement('input');inp.type='file';inp.accept='.ww3replay,application/octet-stream';inp.hidden=true;inp.id='rpFile';
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];inp.value='';if(!f)return;try{initAudio();}catch(e){}rpWatch(new Uint8Array(await f.arrayBuffer()));};
  b.onclick=()=>inp.click();sb.parentNode.insertBefore(b,sb.nextSibling);sb.parentNode.insertBefore(inp,b.nextSibling);}
{const _se=showEnd;showEnd=function(w,r){if(RP.on){if(G)G.over=false;return;}const out=_se.apply(this,arguments);if(NET.spec){try{$('endt').textContent='Battle over';const b=$('specBar');if(b)b.hidden=true;}catch(e){}}try{if(RP.rec&&RP.rec.g===G)RP.rec.t=Math.max(RP.rec.t,G.t);rpEndBtns();}catch(e){}return out;};}
try{rpMenuBtn();}catch(e){}
/* ---------- spectating an online battle (07a specJoin): no army, no orders, see everything or one side's view ---------- */
function specTick(){if(!G)return;let b=$('specBar');if(b&&b._g!==G){b.remove();b=null;}if(!b&&!window.LOADING){b=document.createElement('div');b.id='specBar';b.innerHTML='<b>👁 Spectating</b><select id="specView"></select><button type="button" id="specLeave">Leave</button>';b._g=G;document.body.appendChild(b);
    const st=document.createElement('style');st.textContent='#specBar{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:60;display:flex;gap:8px;align-items:center;background:rgba(10,14,12,.86);border:1px solid #4a5a48;border-radius:8px;padding:6px 10px;color:#e8eadf;font:600 15px system-ui,sans-serif}#specBar select,#specBar button{min-height:36px;background:#26312a;color:#e8eadf;border:1px solid #56685a;border-radius:6px;font:inherit;padding:0 10px}body.spec #side{display:none!important}';document.head.appendChild(st);
    const V=$('specView'),add=(v,t)=>{const o=document.createElement('option');o.value=v;o.textContent=t;V.appendChild(o);};add(-1,'Everything (no fog)');G.teams.forEach((T,i)=>{if(!T.reb)add(i,T.F.name+"'s view");});
    V.onchange=()=>{const k=+V.value;NET.specAll=k<0;if(k>=0){ME=k;try{const p=BASES[k];if(p)centerOn(p[0],p[1]);}catch(e){}}if(NET.game)NET.game.presence({sv:Math.max(0,k)}).catch(()=>{});fogT=0;};
    $('specLeave').onclick=()=>{try{quitGame();}catch(e){}const x=$('specBar');if(x)x.remove();};}
  if(b){b.hidden=!!G.over;document.body.classList.add('spec');}
  if(NET.specAll){for(const e of G.ents)e.vis=true;}else visFor();}
