/* ---------- LOGISTICS interface: supply overlay (key L), roads being built, craters, cut-off towns (orch/logistics) ---------- */
const LGU={on:false,btn:null};
function lgToggle(){LGU.on=!LGU.on;lgBtnSync();}
function lgBtnSync(){if(LGU.btn){LGU.btn.className=LGU.on?'on':'';}}
function lgWanted(){return LGU.on||(G.sel&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME))||(typeof TP!=='undefined'&&TP.ti>=0);}
function lgEdgeState(e,i){const L=G.lg,D=G.lgd;if(D.cr[i]&&D.cr[i].t>G.t)return 2;if(D.mn&&lgBlk(i,ME))return 2;const r=L.reach&&L.reach[ME];if(!r)return 0;return r[e.a]&&r[e.b]?1:0;}
function lgStroke(c,pts,sc){let on=false;c.beginPath();for(const p of pts){const q=toScreen(p[0],groundH(p[0],p[1])+3,p[1]);if(q.z>1){on=false;continue;}if(!on){c.moveTo(q.x,q.y);on=true;}else c.lineTo(q.x,q.y);}c.stroke();}
function lgDensify(pts,step){const o=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(L/step));for(let j=1;j<=k;j++)o.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k]);}return o;}
function drawLogiWorld(c){if(!G||!G.lg||!G.lgd||G.over)return;
  lgUiTick();
  if(G.roadV!==G.roadVS){G.roadVS=G.roadV;try{roadTexRefresh();}catch(e){}}
  const L=G.lg,D=G.lgd,me=G.teams[ME];if(!me)return;c.save();c.lineCap='round';c.lineJoin='round';
  if(lgWanted()){L.E.forEach((e,i)=>{const b=e.bb;if(!inView((b[0]+b[2])/2,(b[1]+b[3])/2,.9)&&!inView(e.pts[0][0],e.pts[0][1],.4)&&!inView(e.pts[e.pts.length-1][0],e.pts[e.pts.length-1][1],.4))return;
    const s=lgEdgeState(e,i);const P=lgDensify(e.pts,140);
    if(s===1){c.setLineDash([]);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=6;lgStroke(c,P);c.strokeStyle='#5fe07a';c.lineWidth=3;lgStroke(c,P);}
    else{c.setLineDash([12,9]);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=6;lgStroke(c,P);c.strokeStyle='#ff5a4a';c.lineWidth=3;lgStroke(c,P);}});c.setLineDash([]);}
  // front line: where enemy territories meet (red/white dashes) - always on in Conquest
  {const T=terrUpdate();if(T&&T.seg.length){c.lineWidth=5;c.strokeStyle='rgba(0,0,0,.55)';c.setLineDash([]);const vis=[];for(const g of T.seg){if(inView((g[0]+g[2])/2,(g[1]+g[3])/2,.15))vis.push(g);}
    if(vis.length){const run=(w,col,dash)=>{c.lineWidth=w;c.strokeStyle=col;c.setLineDash(dash);c.beginPath();for(const g of vis){const a=toScreen(g[0],groundH(g[0],g[1])+4,g[1]),b=toScreen(g[2],groundH(g[2],g[3])+4,g[3]);if(a.z>1||b.z>1)continue;c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}c.stroke();};
      run(6,'rgba(0,0,0,.5)',[]);run(3,'#ff5a4a',[]);run(2,'rgba(255,255,255,.85)',[10,12]);c.setLineDash([]);}}}
  // craters
  for(const k in D.cr){const q=D.cr[k];if(q.t<=G.t||!inView(q.x,q.y,.1))continue;const p=toScreen(q.x,groundH(q.x,q.y)+20,q.y);if(p.z>1)continue;
    c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-34,p.y-22,68,17);c.fillStyle='#ff6a55';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD CUT '+Math.ceil(q.t-G.t)+'s',p.x,p.y-9);
    c.strokeStyle='#ff5a4a';c.lineWidth=3;c.beginPath();c.moveTo(p.x-7,p.y-2);c.lineTo(p.x+7,p.y+12);c.moveTo(p.x+7,p.y-2);c.lineTo(p.x-7,p.y+12);c.stroke();}
  // roads under construction: finished part solid, the rest dashed
  for(const j of D.job){if(j.team!==ME&&!ally(j.team,ME))continue;const P=lgDensify(j.pts,100);let acc=0,done=[],todo=[];P.forEach((p,i)=>{if(i)acc+=Math.hypot(p[0]-P[i-1][0],p[1]-P[i-1][1]);(acc<=j.prog?done:todo).push(p);});if(done.length&&todo.length)todo.unshift(done[done.length-1]);
    c.setLineDash([]);if(done.length>1){c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=6;lgStroke(c,done);c.strokeStyle='#d9c27a';c.lineWidth=3;lgStroke(c,done);}
    if(todo.length>1){c.setLineDash([6,8]);c.strokeStyle='#f0d060';c.lineWidth=2;lgStroke(c,todo);c.setLineDash([]);}
    const fp=lgPoint(j,j.prog),p=toScreen(fp[0],groundH(fp[0],fp[1])+60,fp[1]);if(p.z<=1){c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-38,p.y-16,76,16);c.fillStyle='#f0d060';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD '+Math.round(100*j.prog/Math.max(1,j.len))+'%',p.x,p.y-4);}}
  // supply convoys: a crate badge (green = yours / allied, red = enemy) + stocked towns
  for(const e of G.ents){if(e.dead||!((e.cv&&!e.cv.cav)||(G.lgCv&&G.lgCv.has(e.id)))||!inView(e.x,e.y,.1))continue;const p=toScreen(e.x,groundH(e.x,e.y)+34,e.y);if(p.z>1)continue;const fr=ally(e.team,ME);
    c.fillStyle='rgba(0,0,0,.78)';c.fillRect(p.x-15,p.y-18,30,14);c.fillStyle=fr?'#7ee88f':'#ff6a55';c.fillRect(p.x-9,p.y-15,8,8);c.fillRect(p.x+1,p.y-15,8,8);c.fillStyle='#fff';c.font='bold 8px system-ui,sans-serif';c.textAlign='center';c.fillText(fr?'SUP':'CVY',p.x,p.y-6);}
  // cut-off and trade-route tags on your towns
  for(const t of G.towns){if(!townsMine(t)||!inView(t.x,t.y,.1))continue;if(!t.cut&&!t.al&&!((t.trade||t.sk||t.dl>G.t)&&lgWanted()))continue;const p=toScreen(t.x,groundH(t.x,t.y)+(t.ham?70:110),t.y);if(p.z>1)continue;
    c.font='bold 11px system-ui,sans-serif';c.textAlign='center';const txt=t.al?'AIRLIFTED':t.cut?'CUT OFF':(t.trade?'TRADE ROUTE +25%':'')+((t.sk||t.dl>G.t)?(t.trade?' · ':'')+'STOCKED':'');c.fillStyle='rgba(0,0,0,.78)';const w=c.measureText(txt).width+12;c.fillRect(p.x-w/2,p.y+4,w,16);c.fillStyle=t.cut?'#ff6a55':'#7ee88f';c.fillText(txt,p.x,p.y+16);}
  try{drawLogi2(c);}catch(e){}
  c.restore();}
function drawLogiMini(c,sx,sy){if(!G||!G.lg||!G.lgd)return;const L=G.lg,D=G.lgd;c.save();c.lineCap='round';
  {const T=terrUpdate();if(T&&T.own){const cw=T.cw,ch=T.ch;
    if(!LGU.tc||LGU.tcv!==T.v||LGU.tcw!==cw){LGU.tc=LGU.tc||document.createElement('canvas');LGU.tc.width=cw;LGU.tc.height=ch;LGU.tcv=T.v;LGU.tcw=cw;const x=LGU.tc.getContext('2d'),im=x.createImageData(cw,ch);
      for(let i=0;i<cw*ch;i++){const o=T.own[i];if(o<0)continue;const col=G.teams[o]&&G.teams[o].color||'#888',m=/^#([0-9a-f]{6})$/i.exec(col);const v=m?parseInt(m[1],16):0x888888;im.data[i*4]=v>>16;im.data[i*4+1]=(v>>8)&255;im.data[i*4+2]=v&255;im.data[i*4+3]=62;}x.putImageData(im,0,0);}
    c.imageSmoothingEnabled=false;c.drawImage(LGU.tc,0,0,cw*TR_CELL*sx,ch*TR_CELL*sy);
    c.strokeStyle='#ff5a4a';c.lineWidth=1.8;c.beginPath();for(const g of T.seg){c.moveTo(g[0]*sx,g[1]*sy);c.lineTo(g[2]*sx,g[3]*sy);}c.stroke();}}
  L.E.forEach((e,i)=>{const s=lgEdgeState(e,i);if(s===1){c.setLineDash([]);c.strokeStyle='rgba(95,224,122,.75)';c.lineWidth=1.6;}else{c.setLineDash([4,3]);c.strokeStyle='rgba(255,90,74,.9)';c.lineWidth=1.6;}
    c.beginPath();e.pts.forEach((p,k)=>k?c.lineTo(p[0]*sx,p[1]*sy):c.moveTo(p[0]*sx,p[1]*sy));c.stroke();});c.setLineDash([]);
  for(const t of G.towns)if(t.cut&&townsMine(t)){c.strokeStyle='#ff5a4a';c.lineWidth=2;c.beginPath();c.arc(t.x*sx,t.y*sy,8,0,7);c.stroke();}
  for(const e of G.ents){if(e.dead||!((e.cv&&!e.cv.cav)||(G.lgCv&&G.lgCv.has(e.id))))continue;c.fillStyle=ally(e.team,ME)?'#ffe45a':'#ff4a3a';c.fillRect(e.x*sx-2.5,e.y*sy-2.5,5,5);}
  try{drawLogiMini2(c,sx,sy);}catch(e){}
  c.restore();}
function lgTownHtml(t,mine){if(!mine||!G.lg)return'';const T=G.teams[ME];let h='';
  if(t.al)h+='<div class="tm" style="margin-top:6px;color:#7ee88f">AIRLIFTED: cut off from the roads, but supplied by air for now.</div>';
  if(t.cut)h+='<div class="warn" style="margin-top:6px">CUT OFF: no road link to your supply network. No ammo refill here, tax -50%, unrest rising. Repair or rebuild the road, retake the town in between, or build a bypass.</div>';
  else if(t.trade)h+='<div class="tm" style="margin-top:6px;color:#7ee88f">Trade route: connected to your base by roads through your own towns (+25% tax, calmer locals).</div>';
  else h+='<div class="tm" style="margin-top:6px">Supplied, but the road runs through neutral land. Build a road to turn it into a trade route (+25% tax).</div>';
  if(!t.trade)h+=`<div class="rb"><button data-act="road">Build road here<br><span style="font-weight:400;font-size:11px">select an engineer first (or the nearest builds it)</span></button></div>`;
  return h;}
function lgUiInit(){if(LGU.btn||typeof document==='undefined')return;const b=document.createElement('button');b.id='lgBtn';b.textContent='Supply lines (L)';b.title='Show or hide the supply network: solid green = connected to your base, red dashed = cut off. L key.';
  b.style.cssText='position:fixed;right:8px;bottom:222px;z-index:55;padding:5px 9px;font:600 12px system-ui,sans-serif;color:#e8f2e8;background:rgba(10,16,12,.86);border:1px solid #4a6a52;border-radius:6px;cursor:pointer;display:none';
  b.onclick=()=>lgToggle();document.body.appendChild(b);LGU.btn=b;}
function lgUiTick(){lgUiInit();if(G&&G.lgM&&!(G.sel||[]).some(u=>!u.dead&&u.team===ME&&(u.kind==='dozer'||u.kind==='airlift'))){G.lgM=null;lgHint();}
  if(G&&MODE==='client'&&G.lg&&G.lg.nS!=null&&performance.now()-(LGU.dt||0)>1000){LGU.dt=performance.now();const s0=G.lg.dsig;lgDyn();if(G.lg.dsig!==s0)try{lgCompute();}catch(e){}}
  if(!LGU.btn)return;const show=!!(G&&G.lgd&&G.conq&&!G.over);const d=show?'block':'none';if(LGU.btn.style.display!==d)LGU.btn.style.display=d;
  if(show){const mmEl=document.getElementById('mm');if(mmEl){const r=mmEl.getBoundingClientRect();if(r.width){const y=Math.max(8,innerHeight-r.top+6);LGU.btn.style.bottom=y+'px';LGU.btn.style.right=Math.max(8,innerWidth-r.right)+'px';}}}}
/* ---------- LOGISTICS stage 5b-9 interface (orch/logistics3): engineer jobs, airlift, depot panel, bridges, ports ---------- */
const BRGRP=new WeakMap(),LGG={g:null,bv:-1,n:-1};
function lgDepCut(e){return MODE==='client'?!!(G.lgDc&&G.lgDc.has(e.id)):!!e.lcut;}
function lgDepSt(e){return MODE==='client'?!!(G.lgDs&&G.lgDs.has(e.id)):e.dl>G.t;}
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
    if(e.kind==='shipyard'){if(lgBlkd(e))lgTag(c,e.x,e.y,70,'BLOCKADED',mine?'#ff6a55':'#ffd27a');else if(mine&&lgWanted()&&G.conq)lgTag(c,e.x,e.y,70,'PORT · SEA TRADE','#7ee88f');continue;}
    if(!mine||e.built<1)continue;if(lgDepCut(e))lgTag(c,e.x,e.y,64,'CUT OFF','#ff6a55');else if(lgWanted()||lgDepSt(e))lgTag(c,e.x,e.y,64,lgDepSt(e)?'STOCKED':'ON NETWORK','#7ee88f');}
  if(MODE!=='client')for(const u of G.ents)if(u.alq&&!u.dead&&ally(u.team,ME)&&inView(u.x,u.y,.1))lgTag(c,u.x,u.y,unitH(u)+30,'AIRLIFT','#7ee88f');}
function drawLogiMini2(c,sx,sy){const D=G.lgd,B=G.map.bridges||[];if(!D.mn)return;
  for(const b of B)if(b.dead){c.strokeStyle='#ff4a3a';c.lineWidth=2;const x=b.x*sx,y=b.y*sy;c.beginPath();c.moveTo(x-4,y-4);c.lineTo(x+4,y+4);c.moveTo(x+4,y-4);c.lineTo(x-4,y+4);c.stroke();}
  for(const q of D.ck){c.fillStyle=ally(q.team,ME)?'#7ee88f':'#ff6a55';c.fillRect(q.x*sx-2,q.y*sy-2,4,4);}
  for(const m of D.mn)if(ally(m.team,ME)){c.fillStyle='#ffb04a';c.fillRect(m.x*sx-1.5,m.y*sy-1.5,3,3);}
  for(const e of G.ents)if(!e.dead&&e.isB&&e.kind==='shipyard'&&lgBlkd(e)){c.strokeStyle='#ff4a3a';c.lineWidth=1.5;c.beginPath();c.arc(e.x*sx,e.y*sy,6,0,7);c.stroke();}}
// command bar buttons + one-click targeting (left-click picks the spot, right-click cancels)
function lgMode(k){G.lgM=G.lgM===k?null:k;G.wallM=null;G.wallP=null;G.amove=false;G.defm=false;G.place=null;G.aim=null;try{sfxUI(560);}catch(e){}updateUI();}
const LG_HINT={mine:'Mine a road: click a spot on a road',ckpt:'Checkpoint: click a spot on a road',demo:'Blow a bridge: click the bridge',fixb:'Rebuild a bridge: click the blown bridge',pont:'Pontoon bridge: click on a narrow river',alift:'Airlift: click one of your towns or Supply Depots'};
function lgHint(){const h=typeof wallHintEl==='function'?wallHintEl():null;if(!h)return;if(G&&G.lgM){h.hidden=false;h.textContent=LG_HINT[G.lgM]+' · right-click to cancel';}else if(!G||!G.wallM)h.hidden=true;}
function lgRow(el,s){if(!G||!G.conq||!G.lgd)return;const own=s.filter(u=>u.team===ME&&!u.dead);
  const doz=own.filter(u=>!u.isB&&u.kind==='dozer'),hel=own.filter(u=>!u.isB&&u.kind==='airlift'),dep=own.length===1&&own[0].isB&&(own[0].kind==='depot'||own[0].kind==='shipyard')&&!(own[0].built<1)?own[0]:null;
  if(G.lgM&&!(G.lgM==='alift'?hel.length:doz.length))G.lgM=null;lgHint();if(!doz.length&&!hel.length&&!dep)return;
  const hasT=!!el.querySelector('.cmdrow.tact'),r=document.createElement('div');r.className='cmdrow lgr';r.style.bottom=`calc(var(--barh,170px) + ${hasT?100:54}px)`;r.style.width='min(640px,calc(100vw - 16px))';r.style.flexWrap='wrap';el.append(r);
  const mk=(t,ti,fn,on)=>{const b=document.createElement('button');b.textContent=t;b.title=ti;b.onclick=fn;if(on)b.classList.add('on');r.append(b);return b;};
  if(doz.length){mk('✹ Mine road',`Lay a hidden mine on a road ($${LGC.mine}): the first enemy vehicle over it is hit. Enemy engineers can clear it. Up to ${LG_MINE_MAX}.`,()=>lgMode('mine'),G.lgM==='mine');
    mk('⛔ Checkpoint',`Set up a checkpoint on a road ($${LGC.ckpt}): enemy supply can't use that road while it stands, and it collects a toll while the road is on your network. Up to ${LG_CK_MAX}.`,()=>lgMode('ckpt'),G.lgM==='ckpt');
    mk('💥 Blow bridge',`Rig a bridge with charges ($${LGC.demo}): it blows ${LG_CHG} s later. Enemy infantry or engineers on the charges can clear them.`,()=>lgMode('demo'),G.lgM==='demo');
    mk('🌉 Rebuild',`Rebuild a blown bridge ($${LGC.fixb}, ${LGT.fixb} s of work).`,()=>lgMode('fixb'),G.lgM==='fixb');
    mk('≋ Pontoon',`Lay a pontoon bridge across a narrow river ($${LGC.pont}, ${LGT.pont} s). Up to ${LG_PONT_MAX}.`,()=>lgMode('pont'),G.lgM==='pont');}
  if(hel.length)mk('📦 Airlift supplies',`Fly supplies to one of your towns or Supply Depots ($${LG_AIRC} on delivery): it is stocked, and a cut-off one counts as supplied for 2 minutes.`,()=>lgMode('alift'),G.lgM==='alift');
  if(dep){const st=dep.kind==='shipyard'?(lgBlkd(dep)?'BLOCKADED - break it with warships':'Port: sea trade + supply by sea'):lgDepCut(dep)?'CUT OFF - build a road to it':lgDepSt(dep)?'Stocked by a convoy':'On the supply network';
    const sp=document.createElement('span');sp.style.cssText='font:600 12px system-ui,sans-serif;align-self:center;padding:0 6px;color:'+(/CUT|BLOCK/.test(st)?'#ff8a75':'#9fe8a8');sp.textContent=st;r.append(sp);
    if(dep.kind==='depot')mk('⚑ Rally here','New units from your barracks and factories gather at this depot.',()=>{doAct({t:'rally',x:dep.x,y:dep.y});try{mark({x:dep.x,y:dep.y,r:22,t:0,d:.8,c:0x7ee88f});sfxUI(560);}catch(e){}});
    mk('🛣 Road to here','Build a road from your network to this '+(dep.kind==='depot'?'depot':'port')+' (selected or nearest Construction Vehicle).',()=>{doAct({t:'lg',k:'droad',tid:dep.id,ids:[]});try{sfxUI(560);}catch(e){}});}}
function lgPointer(e){if(!G||G.over||!G.lgM)return;e.stopImmediatePropagation();e.preventDefault();if(e.button===2){G.lgM=null;updateUI();return;}
  mpos(e);const w=screenToWorld(mouse.x,mouse.y);if(!w)return;const k=G.lgM;
  if(k==='alift'){const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind==='airlift'&&!u.dead).map(u=>u.id);let tid=0,ti=-1,bd=1e9;
    for(const b of G.ents)if(b.isB&&!b.dead&&b.team===ME&&b.kind==='depot'){const d=Math.hypot(b.x-w.x,b.y-w.y);if(d<130&&d<bd){bd=d;tid=b.id;}}
    if(!tid)for(const t of G.towns||[])if(t.ow===ME){const d=Math.hypot(t.x-w.x,t.y-w.y);if(d<(t.ham?240:400)&&d<bd){bd=d;ti=t.i;}}
    if(!tid&&ti<0){try{sfxUI(220);}catch(err){}return;}doAct({t:'lg',k,ids,tid,ti:Math.max(0,ti)});}
  else{const ids=G.sel.filter(u=>!u.isB&&u.team===ME&&u.kind==='dozer'&&!u.dead).map(u=>u.id);doAct({t:'lg',k,ids,x:w.x,y:w.y});}
  try{speak(1);mark({x:w.x,y:w.y,r:14,t:0,d:.7,c:0xd9b97a});}catch(err){}G.lgM=null;updateUI();}
if(typeof cv!=='undefined'&&cv){cv.addEventListener('pointerdown',lgPointer,true);cv.addEventListener('contextmenu',e=>{if(G&&G.lgM)e.preventDefault();});}
