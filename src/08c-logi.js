/* ---------- SUPPLY LINES interface (Battle, Abdullah 2026-11-13 20:19 "Bring supply lines into battle"): overlay (key L), craters, cut-off depots ---------- */
const LGU={on:false,btn:null,rs:null,rk:''};
function lgToggle(){LGU.on=!LGU.on;lgBtnSync();}
function lgBtnSync(){if(LGU.btn){LGU.btn.className=LGU.on?'on':'';}}
// the road overlay on the ground shows while it is switched on (L), with a Construction Vehicle selected, or on the minimap always
function lgWanted(){return LGU.on||!!(G.sel&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME))||(typeof supplyWanted==='function'&&supplyWanted());}
function lgStroke(c,pts,sc){let on=false;c.beginPath();for(const p of pts){const q=toScreen(p[0],groundH(p[0],p[1])+3,p[1]);if(q.z>1){on=false;continue;}if(!on){c.moveTo(q.x,q.y);on=true;}else c.lineTo(q.x,q.y);}c.stroke();}
function lgDensify(pts,step){const o=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(L/step));for(let j=1;j<=k;j++)o.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k]);}return o;}
/* ROAD COLORS (Abdullah 2026-11-11 20:12 "a neutral road is one color. Captured road one color. Enemy road another color", 20:13 "Green for your team"):
   a stretch on your (or an ally's) supply lines is green, on an enemy's red, nobody's light gray; a supply line that runs into a crater, a blown
   bridge or an enemy checkpoint is dashed in its owner's color up to the break. Same sets feed the minimap and the ground. View only. */
const LG_COL={mine:'#4ddc6a',foe:'#ff5a4a',neu:'#c9ced2'},LG_CLS=['mine','foe','neu'];
function lgRoadCol(k){if(typeof SET!=='undefined'&&SET.cb&&typeof ID_CB!=='undefined')return k==='mine'?ID_CB[6]:k==='foe'?ID_CB[3]:LG_COL.neu;return LG_COL[k];}   // colour-blind mode: Okabe-Ito bluish green vs vermillion
function lgTeamCls(o){return o==null||o<0||o>=G.teams.length?2:(!G.teams[o].reb&&ally(o,ME))?0:1;}
// who supplies road edge i at distance s along it: 0 mine/ally, 1 enemy, 2 nobody; dash = that owner's line is closed on this road
function lgSegCls(i,s,L0){const C=G.lg.cov;if(!C)return [2,0];const inn=(V,x)=>V.some(q=>x>=q[0]-1&&x<=q[1]+1);let foe=null,fd=null;
  for(let k=0;k<C.length;k++){const c=C[k]&&C[k][i];if(!c||G.teams[k].reb)continue;const on=inn(c.v,s),dd=!on&&inn(c.d,s);if(!on&&!dd)continue;if(ally(k,ME)){if(on)return [0,0];fd=fd||[0,1];}else if(on)foe=foe||[1,0];else fd=fd||[1,1];}
  return foe||fd||[2,0];}
function lgRoadSets(){const L=G.lg,D=G.lgd;if(!L||!D||!L.cov)return null;
  const key=(G.lgv|0)+'|'+L.E.length+'|'+ME;if(LGU.rs&&LGU.rk===key)return LGU.rs;
  const S=[[],[],[],[],[],[]];
  L.E.forEach((e,i)=>{const P=e.pts,cm=e.cum;let cur=null,ck=-1;
    for(let j=1;j<P.length;j++){const a=P[j-1],b=P[j],[cl,dash]=lgSegCls(i,(cm[j-1]+cm[j])/2,e.len),k=cl*2+dash;
      if(k!==ck){cur={p:[a],bb:[a[0],a[1],a[0],a[1]]};S[k].push(cur);ck=k;}
      cur.p.push(b);const q=cur.bb;q[0]=Math.min(q[0],b[0]);q[1]=Math.min(q[1],b[1]);q[2]=Math.max(q[2],b[0]);q[3]=Math.max(q[3],b[1]);}});
  const dots=[];for(const n of L.N){if(!(n.e||n.b>=0))continue;const o=n.e?n.tm:n.b;dots.push([n.x,n.y,lgTeamCls(o)]);}
  LGU.rs={S,dots};LGU.rk=key;return LGU.rs;}
function lgDrawRoadsMini(c,sx,sy){const R=lgRoadSets();if(!R)return;c.lineCap='round';c.lineJoin='round';
  for(let k=0;k<6;k++){if(!R.S[k].length)continue;c.strokeStyle=lgRoadCol(LG_CLS[k>>1]);c.lineWidth=k>>1===2?1:1.6;c.setLineDash(k&1?[3,3]:[]);c.beginPath();for(const pl of R.S[k])pl.p.forEach((p,i)=>i?c.lineTo(p[0]*sx,p[1]*sy):c.moveTo(p[0]*sx,p[1]*sy));c.stroke();}
  c.setLineDash([]);for(const d of R.dots){c.fillStyle=lgRoadCol(LG_CLS[d[2]]);c.beginPath();c.arc(d[0]*sx,d[1]*sy,2.2,0,7);c.fill();}}
function lgDrawRoadsWorld(c){const R=lgRoadSets();if(!R)return;
  for(let k=0;k<6;k++){const col=lgRoadCol(LG_CLS[k>>1]),dash=k&1?[10,8]:[];
    for(const pl of R.S[k]){const b=pl.bb,p=pl.p;if(!inView((b[0]+b[2])/2,(b[1]+b[3])/2,.9)&&!inView(p[0][0],p[0][1],.4)&&!inView(p[p.length-1][0],p[p.length-1][1],.4))continue;
      const P=lgDensify(p,140);c.setLineDash([]);c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=4;lgStroke(c,P);c.setLineDash(dash);c.strokeStyle=col;c.lineWidth=2;lgStroke(c,P);}}
  c.setLineDash([]);for(const d of R.dots){if(!inView(d[0],d[1],.1))continue;const q=toScreen(d[0],groundH(d[0],d[1])+3,d[1]);if(q.z>1)continue;c.fillStyle=lgRoadCol(LG_CLS[d[2]]);c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.5;c.beginPath();c.arc(q.x,q.y,5,0,7);c.fill();c.stroke();}}
function drawLogiWorld(c){if(!G||!G.lg||!G.lgd||G.over)return;
  lgUiTick();cqBanner();
  if(G.roadV!==G.roadVS){G.roadVS=G.roadV;try{roadTexRefresh();}catch(e){}}
  const L=G.lg,D=G.lgd,me=G.teams[ME];if(!me)return;c.save();c.lineCap='round';c.lineJoin='round';
  if(lgWanted())lgDrawRoadsWorld(c);
  // craters
  for(const k in D.cr){const q=D.cr[k];if(q.t<=G.t||!inView(q.x,q.y,.1))continue;const p=toScreen(q.x,groundH(q.x,q.y)+20,q.y);if(p.z>1)continue;
    c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-34,p.y-22,68,17);c.fillStyle='#ff6a55';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD CUT '+Math.ceil(q.t-G.t)+'s',p.x,p.y-9);
    c.strokeStyle='#ff5a4a';c.lineWidth=3;c.beginPath();c.moveTo(p.x-7,p.y-2);c.lineTo(p.x+7,p.y+12);c.moveTo(p.x+7,p.y-2);c.lineTo(p.x-7,p.y+12);c.stroke();}
  // roads under construction: finished part solid, the rest dashed
  for(const j of D.job){if(j.team!==ME&&!ally(j.team,ME))continue;const P=lgDensify(j.pts,100);let acc=0,done=[],todo=[];P.forEach((p,i)=>{if(i)acc+=Math.hypot(p[0]-P[i-1][0],p[1]-P[i-1][1]);(acc<=j.prog?done:todo).push(p);});if(done.length&&todo.length)todo.unshift(done[done.length-1]);
    c.setLineDash([]);if(done.length>1){c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=6;lgStroke(c,done);c.strokeStyle='#d9c27a';c.lineWidth=3;lgStroke(c,done);}
    if(todo.length>1){c.setLineDash([6,8]);c.strokeStyle='#f0d060';c.lineWidth=2;lgStroke(c,todo);c.setLineDash([]);}
    const fp=lgPoint(j,j.prog),p=toScreen(fp[0],groundH(fp[0],fp[1])+60,fp[1]);if(p.z<=1){c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-38,p.y-16,76,16);c.fillStyle='#f0d060';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD '+Math.round(100*j.prog/Math.max(1,j.len))+'%',p.x,p.y-4);}}
  try{drawLogi2(c);}catch(e){}
  c.restore();}
function drawLogiMini(c,sx,sy){if(!G||!G.lg||!G.lgd)return;c.save();c.lineCap='round';
  lgDrawRoadsMini(c,sx,sy);
  try{drawLogiMini2(c,sx,sy);}catch(e){}
  c.restore();}
/* the one-line Battle banner at the top: what wins, and when each side's missile strike is ready */
function strikeSecs(T){let f;if(MODE==='client'&&G.sfd)f=G.sfd[T.id];else f=T._upl?100*T.charge/T.sup.charge:-1;if(f==null||f<0)return -1;return Math.max((1-f/100)*T.sup.charge,0);}
function pwView(){const k=Math.floor(G.t*2),c=G._pwv;if(c&&c.k===k)return c;const p=pwrOf(ME);return G._pwv={k,make:p.make,use:p.use,low:p.use>p.make};}
/* THE goal line (Abdullah 2026-11-13 17:31 "clearer goals on screen"): one calm line under the top bar that says what wins this
   game and how far along it is, updated live; a short flash when it moves (a base building falls, a town is taken).
   Battle: Destroy every enemy building (N left). Missions: the current objective with its check state (replaces the old
   mission objectives box). Missile / uplink countdowns stay as a small second line under it. */
const GOAL={pk:{},key:'',fl:0};
function goalText(){if(GOAL.g!==G){GOAL.g=G;GOAL.pk={};GOAL.key='';}const me=G.teams[ME];if(!me)return null;const enemy=T=>!T.reb&&!T.out&&!ally(T.id,ME);const B=['hq','barracks','factory','airfield','shipyard'];
  if(G.camp){const c=G.camp,m=c.m,done=m.obj.filter(o=>c.o[o[0]]).length,cur=m.obj.find(o=>!c.o[o[0]]);
    return{k:'m'+done+(cur?cur[0]:''),h:`<b>${m.title}</b><i>·</i>`+(cur?`<span class="gb">☐</span> ${cur[1]}`:`<span class="gk">☑</span> All objectives complete`)+`<i>·</i><span class="gn">${done} of ${m.obj.length} done</span>`+(c.status?`<i>·</i><span class="gs">${c.status}</span>`:'')};}
  if(G.battle){let n=0;for(const e of G.ents)if(e.isB&&!e.dead&&e.built>=1&&e.kind!=='garrison'&&e.team>=0&&G.teams[e.team]&&enemy(G.teams[e.team]))n++;
    return{k:'b'+n,h:`<b>Battle</b><i>·</i>Destroy every enemy building <span class="gn">(${n} left)</span>`};}
  return null;}
function cqBanner(){if(!G||!(G.battle||G.camp)){const o=$('cqBn');if(o&&o.dataset.h){o.dataset.h='';o.innerHTML='';}return;}
  if(G.over){const o=$('cqBn');if(o&&o.dataset.h){o.dataset.h='';o.innerHTML='';}return;}let b=$('cqBn');
  if(!b){if(!$('goalCss')){const st=document.createElement('style');st.id='goalCss';st.textContent=`#cqBn{position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:55;pointer-events:none;text-align:center;max-width:calc(100vw - 420px);color:#e6e1cc;font:500 13px/1.5 system-ui,sans-serif;letter-spacing:.01em;text-shadow:0 1px 2px #000,0 0 6px rgba(0,0,0,.6)}
#cqBn .gl{display:inline-block;padding:2px 20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;border-radius:3px;background:linear-gradient(90deg,rgba(10,13,10,0),rgba(10,13,10,.62) 18%,rgba(10,13,10,.62) 82%,rgba(10,13,10,0))}
#cqBn b{font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#d9c48a}#cqBn i{font-style:normal;opacity:.45;margin:0 8px}#cqBn .gn{color:#f3dc8c}#cqBn .gs{color:#ffd77a}#cqBn .gk{color:#9fd36b}#cqBn .gb{opacity:.8}
#cqBn .gl.fl{animation:goalFl 1.3s ease-out}@keyframes goalFl{0%{background-color:rgba(243,220,140,.45);color:#fff}100%{background-color:rgba(243,220,140,0)}}
#cqBn .sl{font-size:11.5px;margin-top:1px}`;document.head.appendChild(st);}
    b=document.createElement('div');b.id='cqBn';document.body.appendChild(b);}
  const g=goalText();if(!g){if(b.dataset.h){b.dataset.h='';b.innerHTML='';}return;}
  if(g.k!==GOAL.key){if(GOAL.key&&GOAL.key[0]===g.k[0])GOAL.fl=performance.now();GOAL.key=g.k;}
  let h=`<div class="gl${performance.now()-GOAL.fl<1300?' fl':''}">${g.h}</div>`;
  if(G.battle){const pw=pwView(),pc=pw.low?'#ff6a55':'#7fe08a',fr=Math.min(1,pw.make/Math.max(1,pw.use,pw.make));h+=`<div id="pwMeter" style="margin-top:3px;display:inline-flex;align-items:center;gap:8px;font:700 12px system-ui,sans-serif;color:${pc};background:rgba(8,12,10,.72);border:1px solid ${pc};border-radius:6px;padding:2px 10px"><span>&#9889; POWER ${pw.make} produced &middot; ${pw.use} used</span><span style="display:inline-block;width:70px;height:7px;background:rgba(255,255,255,.18);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(fr*100)}%;background:${pc}"></i></span>${pw.low?'<span>LOW POWER - build a Generator</span>':''}</div>`;}
  if(!G.camp){const tm=x=>Math.floor(x/60)+':'+String(Math.floor(x%60)).padStart(2,'0');
   for(const T of G.teams){if(T.reb||T.out||!T.sup)continue;const sec=strikeSecs(T);if(sec<0)continue;const mine=ally(T.id,ME);
     h+=`<div class="sl" style="color:${mine?'#bfe8c4':'#ffb4a8'}">${T.F.name} ${UPLINK[T.fac]?UPLINK[T.fac][0]:'missile strike'}: ${sec<=0.5?'READY':'ready in '+tm(sec)}</div>`;}}
  if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h;}}
function lgUiInit(){if(LGU.btn||typeof document==='undefined')return;const b=document.createElement('button');b.id='lgBtn';b.textContent='Supply lines (L)';b.title='Show or hide the supply lines on the ground: green = yours (units on them refill ammo), red = the enemy\'s, gray = nobody\'s, dashed = cut off by a crater, a blown bridge or a checkpoint. L key.';
  b.style.cssText='position:fixed;right:8px;bottom:222px;z-index:55;padding:5px 9px;font:600 12px system-ui,sans-serif;color:#e8f2e8;background:rgba(10,16,12,.86);border:1px solid #4a6a52;border-radius:6px;cursor:pointer;display:none';
  b.onclick=()=>lgToggle();document.body.appendChild(b);LGU.btn=b;}
function lgUiTick(){lgUiInit();if(G&&G.lgM&&!(G.sel||[]).some(u=>!u.dead&&u.team===ME&&(u.kind==='dozer'||u.kind==='airlift'))){G.lgM=null;lgHint();}
  if(G&&MODE==='client'&&G.lg&&G.lg.nS!=null&&performance.now()-(LGU.dt||0)>1000){LGU.dt=performance.now();const s0=G.lg.dsig;lgDyn();if(G.lg.dsig!==s0)try{lgCompute();}catch(e){}else if(G.lg.reach)try{const cs=lgCoverSig();if(cs!==G.lg.cvs){G.lg.cvs=cs;lgCover();}}catch(e){}}
  if(!LGU.btn)return;const show=!!(G&&G.lgd&&!G.sandbox&&!G.over);const d=show?'block':'none';if(LGU.btn.style.display!==d)LGU.btn.style.display=d;
  if(show){const mmEl=document.getElementById('mm');if(mmEl){const r=mmEl.getBoundingClientRect();if(r.width){const y=Math.max(8,innerHeight-r.top+6);LGU.btn.style.bottom=y+'px';LGU.btn.style.right=Math.max(8,innerWidth-r.right)+'px';}}}}
/* ---------- LOGISTICS stage 5b-9 interface (orch/logistics3): engineer jobs, airlift, depot panel, bridges, ports ---------- */
const BRGRP=new WeakMap(),LGG={g:null,bv:-1,n:-1};
function lgDepCut(e){return MODE==='client'?!!(G.lgDc&&G.lgDc.has(e.id)):!!e.lcut;}
function lgBlkd(e){return MODE==='client'?!!(G.lgPb&&G.lgPb.has(e.id)):!!e.blk;}
// 3D: hide the deck of a blown bridge (the piers stay standing), build / show pontoon bridges
function lgPontMesh(b){const g=new THREE.Group();g.position.set(b.x,0,b.y);g.rotation.y=-Math.atan2(b.n[1],b.n[0]);const L=b.h*2+30;
  const fm=new THREE.MeshStandardMaterial({color:lin('#3d4430'),roughness:.8}),dm=new THREE.MeshStandardMaterial({color:lin('#6b5d48'),roughness:.95});
  const fg=new THREE.BoxGeometry(10,5,52);for(let s=-L/2+6;s<L/2;s+=13){const f=new THREE.Mesh(fg,fm);f.position.set(s,WL+2,0);f.castShadow=true;g.add(f);}
  const dm2=new THREE.MeshStandardMaterial({color:lin('#57503f'),roughness:.95}),sg=new THREE.BoxGeometry(12.2,1.4,44);let k=0;for(let s=-L/2+6.5;s<L/2;s+=13,k++){const d=new THREE.Mesh(sg,k%2?dm:dm2);d.position.set(s,4,0);d.castShadow=d.receiveShadow=true;g.add(d);}
  for(const z of [-11,11]){const tr=new THREE.Mesh(new THREE.BoxGeometry(L,.3,7),dm2);tr.position.set(0,4.85,z);g.add(tr);}
  for(const z of [-23,23]){const r=new THREE.Mesh(new THREE.BoxGeometry(L,.8,.8),fm);r.position.set(0,6.6,z);g.add(r);for(let s=-L/2+4;s<L/2;s+=26){const p=new THREE.Mesh(new THREE.BoxGeometry(.8,3,.8),fm);p.position.set(s,5.2,z);g.add(p);}}
  return g;}
function lgGfx(){const D=G.lgd,B=G.map&&G.map.bridges;if(!D||!B||typeof THREE==='undefined'||typeof WORLD==='undefined'||!WORLD)return;if(LGG.g===G&&LGG.bv===D.bv&&LGG.n===B.length)return;LGG.g=G;LGG.bv=D.bv;LGG.n=B.length;
  for(const b of B){let grp=BRGRP.get(b);if(!grp&&b.pont){try{grp=lgPontMesh(b);BRGRP.set(b,grp);WORLD.add(grp);}catch(e){}}if(!grp)continue;
    if(b.pont){grp.visible=!b.dead;continue;}for(const c of grp.children)if(c.position.y>-5)c.visible=!b.dead;}}
function lgTag(c,x,y,h,txt,col,bg){const p=toScreen(x,groundH(x,y)+h,y);if(p.z>1)return;c.font='bold 11px system-ui,sans-serif';c.textAlign='center';const w=c.measureText(txt).width+12;c.fillStyle=bg||'rgba(0,0,0,.78)';c.fillRect(p.x-w/2,p.y-12,w,16);c.fillStyle=col;c.fillText(txt,p.x,p.y);}
function drawLogi2(c){const D=G.lgd,B=G.map.bridges||[];if(!D.mn)return;lgGfx();
  for(const m of D.mn)if(ally(m.team,ME)&&inView(m.x,m.y,.1)){const p=toScreen(m.x,groundH(m.x,m.y)+2,m.y);if(p.z>1)continue;c.fillStyle='rgba(0,0,0,.7)';c.beginPath();c.moveTo(p.x,p.y-8);c.lineTo(p.x+8,p.y);c.lineTo(p.x,p.y+8);c.lineTo(p.x-8,p.y);c.fill();c.fillStyle='#ffb04a';c.beginPath();c.moveTo(p.x,p.y-5);c.lineTo(p.x+5,p.y);c.lineTo(p.x,p.y+5);c.lineTo(p.x-5,p.y);c.fill();if(lgWanted())lgTag(c,m.x,m.y,26,'MINE','#ffb04a');}
  for(const q of D.ck)if(inView(q.x,q.y,.1))lgTag(c,q.x,q.y,46,'CHECKPOINT',ally(q.team,ME)?'#7ee88f':'#ff6a55');
  for(let i=0;i<B.length;i++){const b=B[i],s=D.bd[i];if(!inView(b.x,b.y,.2))continue;
    if(b.dead)lgTag(c,b.x,b.y,30,b.pont?'PONTOON DESTROYED':'BRIDGE DOWN','#ff6a55');
    else if(s&&s.ch){const left=Math.max(0,Math.ceil(s.ch.t-G.t)),fl=(G.t*3|0)%2;lgTag(c,s.ch.x,s.ch.y,40,'CHARGES '+left+'s',fl?'#fff':'#ff6a55',fl?'rgba(160,20,10,.85)':'rgba(0,0,0,.8)');}
    else if(b.pont&&lgWanted())lgTag(c,b.x,b.y,24,'PONTOON',ally(b.team,ME)?'#d9c27a':'#ff9a7a');}
  for(const e of G.ents){if(e.dead||!e.isB||(e.kind!=='depot'&&e.kind!=='shipyard')||!inView(e.x,e.y,.1))continue;const mine=ally(e.team,ME);
    if(e.kind==='shipyard'){if(lgBlkd(e))lgTag(c,e.x,e.y,70,'BLOCKADED',mine?'#ff6a55':'#ffd27a');else if(mine&&lgWanted())lgTag(c,e.x,e.y,70,'PORT · SUPPLY','#7ee88f');continue;}
    if(!mine||e.built<1)continue;if(lgDepCut(e))lgTag(c,e.x,e.y,64,'CUT OFF','#ff6a55');else if(lgWanted())lgTag(c,e.x,e.y,64,'ON NETWORK','#7ee88f');}
  if(MODE!=='client')for(const u of G.ents)if(u.alq&&!u.dead&&ally(u.team,ME)&&inView(u.x,u.y,.1))lgTag(c,u.x,u.y,unitH(u)+30,'AIRLIFT','#7ee88f');}
function drawLogiMini2(c,sx,sy){const D=G.lgd,B=G.map.bridges||[];if(!D.mn)return;
  for(const b of B)if(b.dead){c.strokeStyle='#ff4a3a';c.lineWidth=2;const x=b.x*sx,y=b.y*sy;c.beginPath();c.moveTo(x-4,y-4);c.lineTo(x+4,y+4);c.moveTo(x+4,y-4);c.lineTo(x-4,y+4);c.stroke();}
  for(const q of D.ck){c.fillStyle=ally(q.team,ME)?'#7ee88f':'#ff6a55';c.fillRect(q.x*sx-2,q.y*sy-2,4,4);}
  for(const m of D.mn)if(ally(m.team,ME)){c.fillStyle='#ffb04a';c.fillRect(m.x*sx-1.5,m.y*sy-1.5,3,3);}
  for(const e of G.ents)if(!e.dead&&e.isB&&e.kind==='shipyard'&&lgBlkd(e)){c.strokeStyle='#ff4a3a';c.lineWidth=1.5;c.beginPath();c.arc(e.x*sx,e.y*sy,6,0,7);c.stroke();}}
// command bar buttons + one-click targeting (left-click picks the spot, right-click cancels)
function lgMode(k){G.lgM=G.lgM===k?null:k;G.wallM=null;G.wallP=null;G.amove=false;G.defm=false;G.place=null;G.aim=null;try{sfxUI(560);}catch(e){}updateUI();}
const LG_HINT={mine:'Mine a road: click a spot on a road',ckpt:'Checkpoint: click a spot on a road',demo:'Blow a bridge: click the bridge',fixb:'Rebuild a bridge: click the blown bridge',pont:'Pontoon bridge: click on a narrow river',alift:'Airlift: click one of your Supply Depots'};
function lgHint(){const h=typeof wallHintEl==='function'?wallHintEl():null;if(!h)return;if(G&&G.lgM){h.hidden=false;h.textContent=LG_HINT[G.lgM]+' · right-click to cancel';}else if(!G||!G.wallM)h.hidden=true;}
function lgRow(el,s){if(!G||G.sandbox||!G.lgd)return;const own=s.filter(u=>u.team===ME&&!u.dead);
  const doz=own.filter(u=>!u.isB&&u.kind==='dozer'),hel=own.filter(u=>!u.isB&&u.kind==='airlift'),dep=own.length===1&&own[0].isB&&(own[0].kind==='depot'||own[0].kind==='shipyard')&&!(own[0].built<1)?own[0]:null;
  if(G.lgM&&!(G.lgM==='alift'?hel.length:doz.length))G.lgM=null;lgHint();if(!doz.length&&!hel.length&&!dep)return;
  const r=document.createElement('div');r.className='cmdrow lgr';el.append(r);   /* placed in the one order dock by ordDock() (08-ui) */
  const mk=(t,ti,fn,on)=>{const b=document.createElement('button');b.textContent=t;b.title=ti;b.onclick=fn;if(on)b.classList.add('on');r.append(b);return b;};
  if(doz.length){mk('✹ Mine road',`Lay a hidden mine on a road ($${LGC.mine}): the first enemy vehicle over it is hit. Enemy engineers can clear it. Up to ${LG_MINE_MAX}.`,()=>lgMode('mine'),G.lgM==='mine');
    mk('⛔ Checkpoint',`Set up a checkpoint on a road ($${LGC.ckpt}): enemy supply lines can't use that road while it stands. Up to ${LG_CK_MAX}.`,()=>lgMode('ckpt'),G.lgM==='ckpt');
    mk('💥 Blow bridge',`Rig a bridge with charges ($${LGC.demo}): it blows ${LG_CHG} s later. Enemy infantry or engineers on the charges can clear them.`,()=>lgMode('demo'),G.lgM==='demo');
    mk('🌉 Rebuild',`Rebuild a blown bridge ($${LGC.fixb}, ${LGT.fixb} s of work).`,()=>lgMode('fixb'),G.lgM==='fixb');
    mk('≋ Pontoon',`Lay a pontoon bridge across a narrow river ($${LGC.pont}, ${LGT.pont} s). Up to ${LG_PONT_MAX}.`,()=>lgMode('pont'),G.lgM==='pont');}
  if(hel.length)mk('📦 Airlift supplies',`Fly supplies to one of your Supply Depots ($${LG_AIRC} on delivery): troops there refill, and a cut-off depot counts as supplied for 2 minutes.`,()=>lgMode('alift'),G.lgM==='alift');
  if(dep){const st=dep.kind==='shipyard'?(lgBlkd(dep)?'BLOCKADED - break it with warships':'Port: supply lines run from here'):lgDepCut(dep)?'CUT OFF - build a road to it':'On the supply network';
    const sp=document.createElement('span');sp.style.cssText='font:600 12px system-ui,sans-serif;align-self:center;padding:0 6px;color:'+(/CUT|BLOCK/.test(st)?'#ff8a75':'#9fe8a8');sp.textContent=st;r.append(sp);
    if(dep.kind==='depot')mk('⚑ Rally here','New units from your barracks and factories gather at this depot.',()=>{doAct({t:'rally',x:dep.x,y:dep.y});try{mark({x:dep.x,y:dep.y,r:22,t:0,d:.8,c:0x7ee88f});sfxUI(560);}catch(e){}});
    mk('🛣 Road to here','Build a road from your network to this '+(dep.kind==='depot'?'depot':'port')+' (selected or nearest Construction Vehicle).',()=>{doAct({t:'lg',k:'droad',tid:dep.id,ids:[]});try{sfxUI(560);}catch(e){}});}}
function lgPointer(e){if(!G||G.over||!G.lgM)return;e.stopImmediatePropagation();e.preventDefault();if(e.button===2){G.lgM=null;updateUI();return;}
  mpos(e);const w=screenToWorld(mouse.x,mouse.y);if(!w)return;const k=G.lgM;
  if(k==='alift'){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind==='airlift'&&!u.dead).map(u=>u.id);let tid=0,ti=-1,bd=1e9;
    for(const b of G.ents)if(b.isB&&!b.dead&&b.team===ME&&b.kind==='depot'){const d=Math.hypot(b.x-w.x,b.y-w.y);if(d<130&&d<bd){bd=d;tid=b.id;}}
    if(!tid&&ti<0){try{sfxUI(220);}catch(err){}return;}doAct({t:'lg',k,ids,tid,ti:Math.max(0,ti)});}
  else{const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind==='dozer'&&!u.dead).map(u=>u.id);doAct({t:'lg',k,ids,x:w.x,y:w.y});}
  try{speak(1);mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});}catch(err){}G.lgM=null;updateUI();}
if(typeof cv!=='undefined'&&cv){cv.addEventListener('pointerdown',lgPointer,true);cv.addEventListener('contextmenu',e=>{if(G&&G.lgM)e.preventDefault();});}
