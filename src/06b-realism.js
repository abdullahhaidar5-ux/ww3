/* ================= REALISM (render only, orch/realism): garrison windows, floor-by-floor damage, living towns ================= */
// Nothing here touches the simulation: it only reads G and draws. Garrisoned city buildings show dark silhouettes in their
// windows and flash when the troops inside fire; a garrison that is losing HP shows holes and smoke from more and more
// floors, then flames. Towns get a few civilians and cars that run when shooting starts nearby, and the street lights and
// window lights go dark while a fight rages near the camera. Civilians and cars are cosmetic (never targetable, never in
// the sim) and are off on Low / phones.
const RE={gars:[],gT:-9,sil:null,hole:null,cvs:null,shots:new Float32Array(96),shN:0,civ:[],cars:[],civT:0,dark:0,lampBase:null,lampSet:-1,cityBase:null,citySet:-1,tex:{}};
function reTex(k){if(RE.tex[k])return RE.tex[k];const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  if(k==='sil'){x.fillStyle='#06080a';x.beginPath();x.arc(32,19,9,0,6.3);x.fill();x.beginPath();x.moveTo(8,64);x.quadraticCurveTo(10,34,32,31);x.quadraticCurveTo(54,34,56,64);x.fill();x.fillStyle='#232a24';x.fillRect(38,40,22,3.5);}
  else{const g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(4,3,3,.96)');g.addColorStop(.45,'rgba(12,9,7,.9)');g.addColorStop(.75,'rgba(30,24,18,.45)');g.addColorStop(1,'rgba(30,24,18,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
    x.strokeStyle='rgba(20,16,12,.6)';x.lineWidth=1.4;for(let i=0;i<9;i++){const a=i*.7+.3,r0=14+(i%3)*3;x.beginPath();x.moveTo(32+Math.cos(a)*r0,32+Math.sin(a)*r0);x.lineTo(32+Math.cos(a+.2)*(r0+14),32+Math.sin(a+.2)*(r0+14));x.stroke();}}
  const t=new THREE.CanvasTexture(c);RE.tex[k]=t;return t;}
function rePool(k,n,w,h){const m=new THREE.MeshBasicMaterial({map:reTex(k),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,fog:true}),g=new THREE.PlaneGeometry(w,h),L=[];
  for(let i=0;i<n;i++){const q=new THREE.Mesh(g,m);q.visible=false;q.frustumCulled=false;q.renderOrder=3;SCN.add(q);L.push(q);}return L;}
// a shot was fired at (x,y) toward angle a: remember it (civilians flee, lights dim) and flash the window of a garrison
function reMuz(x,y,a){if(!G)return;const i=(RE.shN++%32)*3;RE.shots[i]=x;RE.shots[i+1]=y;RE.shots[i+2]=G.t;
  const e=RE.gars.length?reGarAt(x,y):null;if(!e)return;e.fa=a;if(!inView(x,y,.1)||cam.dist>900)return;const w=reWin(e,a,e.k++);if(!w)return;
  const h=w.y;part({x:w.x+w.nx*1.5,y:w.z+w.nz*1.5,h,s:2.6,d:.06,add:true,c:[3,2.4,1.2]});part({x:w.x+w.nx*3,y:w.z+w.nz*3,h,s:1.6,d:.05,add:true,c:[2.8,1.6,.6]});
  part({x:w.x+w.nx*2,y:w.z+w.nz*2,h,vx:w.nx*8,vy:w.nz*8,rise:6,c:[.5,.49,.46],s:rnd(1.5,2.4),g:3,d:rnd(.5,.8),a:.3});if(typeof mlight==='function')mlight(w.x+w.nx*3,w.z+w.nz*3,h,1.1,70);}
function reGarAt(x,y){for(const e of RE.gars)if((e.x|0)===(x|0)&&(e.y|0)===(y|0))return e;return null;}
// window cell on the wall of the block of civ cell e.civ that faces angle a (sim angle): {x,y(height),z(sim y),nx,nz}
function reWin(e,a,seed,minFl){const c=e.civ;if(!c||!c.b||!c.b.length)return null;const B=G.map.cityBlds,ca=Math.cos(a),sa=Math.sin(a);let wall,nx,nz;
  if(Math.abs(ca)>Math.abs(sa)){wall=ca>0?0:1;nx=ca>0?1:-1;nz=0;}else{wall=sa>0?2:3;nx=0;nz=sa>0?1:-1;}
  let b=null,best=-1e9;for(const i of c.b){const q=B[i];if(!q)continue;const ext=wall===0?q.x+q.w/2:wall===1?-(q.x-q.w/2):wall===2?q.y+q.d/2:-(q.y-q.d/2);if(ext+q.h*.01>best){best=ext+q.h*.01;b=q;}}
  if(!b)return null;const tower=b.style==='gulfcity'||b.style==='korea'||b.style==='asia',FH=tower?8:10,WS=tower?6:9,s=wall===0||wall===3?1:-1;
  const lo=wall<2?b.y-b.d/2:b.x-b.w/2,hi=wall<2?b.y+b.d/2:b.x+b.w/2,uLo=s>0?lo:-hi,uHi=s>0?hi:-lo,k0=Math.ceil((uLo+WS*.4)/WS-.5),k1=Math.floor((uHi-WS*.4)/WS-.5);if(k1<k0)return null;
  const k=k0+Math.floor(rh(seed*7.13+c.i)*(k1-k0+1)),t=s*(k+.5)*WS,fl=Math.max(0,Math.floor((b.h-.4)/FH)-1),f0=Math.min(fl,minFl==null?1:minFl),fy=f0+Math.floor(rh(seed*3.7+c.i*1.9)*(fl-f0+1)),gy=groundH(b.x,b.y);
  return{x:wall===0?b.x+b.w/2:wall===1?b.x-b.w/2:t,z:wall===2?b.y+b.d/2:wall===3?b.y-b.d/2:t,y:gy+(fy+.55)*FH,nx,nz,FH,WS,tower};}
function rh(n){const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);}
function reGarRefresh(){RE.gars.length=0;RE.gT=G.t;for(const e of G.ents)if(!e.dead&&e.kind==='garrison'&&e.civ&&!e.civ.dug){if(e.k==null)e.k=0;RE.gars.push(e);}}
function reGarFx(dt){const lo=typeof fxPH==='function'&&fxPH()||(typeof gfxLow==='function'&&gfxLow());if(!RE.sil){RE.sil=rePool('sil',lo?8:20,2.6,3.4);RE.hole=rePool('hole',lo?8:22,5.5,5.5);}
  if(RE.sil[0]&&!RE.sil[0].parent){for(const m of RE.sil.concat(RE.hole))SCN.add(m);}RE.sil.forEach(q=>q.visible=false);RE.hole.forEach(q=>q.visible=false);if(cam.dist>650)return;let si=0,hi=0;
  for(const e of RE.gars){if(!inView(e.x,e.y,.15))continue;const f=e.hp/e.max,occ=MODE==='client'?(e.occN|0):(e.civ.occ?e.civ.occ.length:0);
    const fa=e.fa!=null?e.fa:Math.atan2(MAPH/2-e.y,MAPW/2-e.x);
    if(occ>0)for(let q=0;q<Math.min(3,Math.ceil(occ/2));q++){if(si>=RE.sil.length)break;const w=reWin(e,fa+(q-1)*.2,1000+q*31+e.id*.17,1);if(!w)continue;const m=RE.sil[si++];m.position.set(w.x+w.nx*.3,w.y-.4,w.z+w.nz*.3);m.rotation.y=Math.atan2(w.nx,w.nz);m.visible=true;}
    if(f<.72){const nb=Math.min(7,1+Math.floor((.72-f)/.72*8));for(let q=0;q<nb;q++){const wl=q%4,ang=wl===0?0:wl===1?Math.PI:wl===2?Math.PI/2:-Math.PI/2,w=reWin(e,ang,200+q*17+e.id*.29,0);if(!w)continue;
      if(hi<RE.hole.length){const m=RE.hole[hi++];m.position.set(w.x+w.nx*.35,w.y,w.z+w.nz*.35);m.rotation.y=Math.atan2(w.nx,w.nz);m.visible=true;}
      if(Math.random()<dt*2.2)part({x:w.x+w.nx*2,y:w.z+w.nz*2,h:w.y+1,vx:w.nx*4+3,vy:w.nz*4,rise:rnd(14,24),c:[.12,.115,.11],c2:[.36,.34,.31],ck:.4,s:rnd(3,5),g:7,d:rnd(2,3.2),a:.34});
      if(f<.45&&Math.random()<dt*7){part({x:w.x+w.nx*1.6,y:w.z+w.nz*1.6,h:w.y+rnd(-1,1),vx:w.nx*3,vy:w.nz*3,rise:rnd(8,14),add:true,c:[2.6,1.3,.4],s:rnd(2,3.4),g:3,d:rnd(.3,.55),a:.7});}}}}}
// ---- living towns ----
const RE_CC=[[.72,.66,.58],[.38,.45,.55],[.55,.28,.25],[.3,.4,.3]];let RE_CIVM=null,RE_CARM=null;
function reCivInit(){const mk=(builder,cap,cols)=>cols.map(col=>{const B=Bld();builder(B,col);const m=new THREE.InstancedMesh(B.geo(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),cap);m.count=0;m.frustumCulled=false;m.castShadow=true;SCN.add(m);return m;});
  const hex=a=>'#'+a.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  RE_CIVM=mk((B,c)=>{B.box(1,3.4,1,-.6,1.7,0,'#35302a');B.box(1,3.4,1,.6,1.7,0,'#35302a');B.box(2.4,3.2,1.4,0,5,0,hex(c));B.box(1.3,1.4,1.3,0,7.3,0,'#b88d6a');},10,RE_CC);
  RE_CARM=mk((B,c)=>{B.box(12,2.6,5.6,0,2.4,0,hex(c));B.box(6.4,2.2,5,-.8,4.8,0,hex(c.map(v=>v*.8)));B.box(5.6,1.1,5.1,-.8,5,0,'#1a2228');for(const sx of [-3.8,3.8])for(const sz of [-2.9,2.9])B.box(2.4,2.4,.8,sx,1.2,sz,'#14120f');},3,RE_CC);}
function reShotNear(x,y,R,age){let best=1e9,bx=0,by=0;for(let i=0;i<96;i+=3){const t=RE.shots[i+2];if(!t||G.t-t>age||G.t<t)continue;const d=Math.hypot(RE.shots[i]-x,RE.shots[i+1]-y);if(d<R&&d<best){best=d;bx=RE.shots[i];by=RE.shots[i+1];}}return best<1e9?[bx,by,best]:null;}
function reFree(x,y){return passC('ground',Math.floor(x/CELL),Math.floor(y/CELL));}
function reLine(x,y,tx,ty){const n=Math.ceil(Math.hypot(tx-x,ty-y)/10);for(let i=1;i<=n;i++)if(!reFree(x+(tx-x)*i/n,y+(ty-y)*i/n))return false;return true;}
function reCivTick(dt){if(!G.civ||!G.civ.length||cam.dist>820)return;if(!RE_CIVM)reCivInit();
  RE.civT-=dt;const danger=reShotNear(cam.x,cam.y,cam.dist*1.1+400,4);
  if(RE.civT<=0){RE.civT=.7;const lim=Math.min(10,Math.ceil(cam.dist/70));
    for(let tr=0;tr<10&&RE.civ.length<lim;tr++){const c=G.civ[(Math.random()*G.civ.length)|0];if(!c||c.dead||c.ruin||Math.hypot(c.x-cam.x,c.y-cam.y)>cam.dist*.9+60)continue;if(c.g)continue;
      const x=c.x+rnd(-CELL*1.3,CELL*1.3),y=c.y+rnd(-CELL*1.3,CELL*1.3);if(!reFree(x,y)||reShotNear(x,y,380,5)||!inView(x,y,-.05)&&Math.random()<.7)continue;RE.civ.push({x,y,a:rnd(0,6.28),sp:rnd(5,8),tx:x,ty:y,col:(Math.random()*4)|0,ph:Math.random()*6,fl:0,age:0,home:c});}
    if(RE.cars.length<3&&Math.random()<.35&&!danger)for(let tr=0;tr<30;tr++){const c=G.civ[(Math.random()*G.civ.length)|0];if(!c||c.dead||c.ruin||Math.hypot(c.x-cam.x,c.y-cam.y)>cam.dist*.9)continue;const a=(Math.random()<.5?0:Math.PI/2)+(Math.random()<.5?0:Math.PI),x=c.x,y=c.y,L=rnd(90,200),tx=x+Math.cos(a)*L,ty=y+Math.sin(a)*L;
      if(!reFree(x,y)||!reLine(x,y,tx,ty))continue;RE.cars.push({x,y,a,tx,ty,sp:rnd(22,30),col:(Math.random()*4)|0,age:0,fl:0});break;}}
  const mats=[0,1,2,3].map(()=>[]);const tmp=RE.tmpM||(RE.tmpM=new THREE.Matrix4()),q=RE.tmpQ||(RE.tmpQ=new THREE.Quaternion()),v=RE.tmpV||(RE.tmpV=new THREE.Vector3()),sc=RE.tmpS||(RE.tmpS=new THREE.Vector3(1,1,1)),ax=RE.ax||(RE.ax=new THREE.Vector3(0,1,0));
  for(let i=RE.civ.length-1;i>=0;i--){const p=RE.civ[i];p.age+=dt;const dg=reShotNear(p.x,p.y,300,4);
    if(p.home&&p.home.dead||p.age>400||(dg&&dg[2]<45&&Math.random()<dt*.5)){RE.civ.splice(i,1);continue;}
    if(dg){p.fl=1;const ax2=p.x-dg[0],ay2=p.y-dg[1],d=Math.hypot(ax2,ay2)||1;let ta=Math.atan2(ay2,ax2);for(const da of [0,.7,-.7,1.4,-1.4]){const nx=p.x+Math.cos(ta+da)*14,ny=p.y+Math.sin(ta+da)*14;if(reFree(nx,ny)){p.a=ta+da;break;}}p.sp=26;}
    else{if(p.fl){p.fl=0;p.sp=rnd(5,8);p.tx=p.x;p.ty=p.y;}
      if(Math.hypot(p.tx-p.x,p.ty-p.y)<3){let ok=false;for(let tr=0;tr<6&&!ok;tr++){const a=rnd(0,6.28),L=rnd(30,90),tx=p.x+Math.cos(a)*L,ty=p.y+Math.sin(a)*L;if(reLine(p.x,p.y,tx,ty)){p.tx=tx;p.ty=ty;p.a=a;ok=true;}}if(!ok){p.age+=60;}}else p.a=Math.atan2(p.ty-p.y,p.tx-p.x);}
    const nx=p.x+Math.cos(p.a)*p.sp*dt,ny=p.y+Math.sin(p.a)*p.sp*dt;if(reFree(nx,ny)){p.x=nx;p.y=ny;}else if(p.fl){p.sp=0;}else{p.tx=p.x;p.ty=p.y;}
    if(p.fl&&!inView(p.x,p.y,.3)&&Math.hypot(p.x-cam.x,p.y-cam.y)>cam.dist+250){RE.civ.splice(i,1);continue;}
    if(!inView(p.x,p.y,.1))continue;p.ph+=dt*(p.fl?12:7);const bob=Math.abs(Math.sin(p.ph))*(p.fl?.9:.4);
    q.setFromAxisAngle(ax,-p.a+Math.PI/2*0);const lean=p.fl?.25:0;v.set(p.x,groundH(p.x,p.y)+bob,p.y);sc.set(1,1,1);tmp.compose(v,q,sc);mats[p.col].push(tmp.clone());}
  for(let c=0;c<4;c++){const m=RE_CIVM[c];let n=0;for(const M of mats[c]){if(n>=10)break;m.setMatrixAt(n++,M);}m.count=n;m.instanceMatrix.needsUpdate=true;}
  const cm=[0,1,2,3].map(()=>[]);
  for(let i=RE.cars.length-1;i>=0;i--){const p=RE.cars[i];p.age+=dt;const dg=reShotNear(p.x,p.y,320,4);if(dg){p.fl=1;const a=Math.atan2(p.y-dg[1],p.x-dg[0]);if(Math.abs(Math.sin(a-p.a))>.8||Math.cos(a-p.a)<0){/* turn away along the street axis */const aa=Math.cos(a-p.a)<0?p.a+Math.PI:p.a;p.a=aa;}p.sp=55;p.tx=p.x+Math.cos(p.a)*400;p.ty=p.y+Math.sin(p.a)*400;}
    const arrive=Math.hypot(p.tx-p.x,p.ty-p.y)<4;if(arrive&&!p.fl){RE.cars.splice(i,1);continue;}
    const nx=p.x+Math.cos(p.a)*p.sp*dt,ny=p.y+Math.sin(p.a)*p.sp*dt;if(!reFree(nx,ny)){if(p.fl&&p.sp>0){p.a+=Math.PI;}else{RE.cars.splice(i,1);continue;}}else{p.x=nx;p.y=ny;}
    if(!inView(p.x,p.y,-.0)&&Math.hypot(p.x-cam.x,p.y-cam.y)>cam.dist+300||p.age>120){RE.cars.splice(i,1);continue;}
    if(!inView(p.x,p.y,.1))continue;q.setFromAxisAngle(ax,-p.a);v.set(p.x,groundH(p.x,p.y),p.y);sc.set(1,1,1);tmp.compose(v,q,sc);cm[p.col].push(tmp.clone());}
  for(let c=0;c<4;c++){const m=RE_CARM[c];let n=0;for(const M of cm[c]){if(n>=3)break;m.setMatrixAt(n++,M);}m.count=n;m.instanceMatrix.needsUpdate=true;}}
function reDark(dt){let n=0;const now=G.t;for(let i=0;i<96;i+=3){const t=RE.shots[i+2];if(t&&now>=t&&now-t<3&&Math.hypot(RE.shots[i]-cam.x,RE.shots[i+1]-cam.y)<cam.dist*1.2+350)n++;}
  const tg=Math.min(1,n/10),k=tg>RE.dark?dt*.6:dt*.15;RE.dark+=(tg-RE.dark)*Math.min(1,k);
  if(typeof LAMPM!=='undefined'&&LAMPM){if(RE.lampBase==null||Math.abs(LAMPM.emissiveIntensity-RE.lampSet)>1e-4)RE.lampBase=LAMPM.emissiveIntensity;RE.lampSet=RE.lampBase*(1-.9*RE.dark);LAMPM.emissiveIntensity=RE.lampSet;}
  if(typeof WXCITY!=='undefined'){if(RE.cityBase==null||Math.abs(WXCITY.value-RE.citySet)>1e-4)RE.cityBase=WXCITY.value;RE.citySet=RE.cityBase*(1-.85*RE.dark);WXCITY.value=RE.citySet;}}
function realTick(dt){if(!G||!G.terrain||!(dt>0))return;if(window.NOREAL)return;if(RE.gG!==G){RE.gG=G;RE.civ.length=0;RE.cars.length=0;RE.shots.fill(0);RE.dark=0;if(RE_CIVM)for(const m of RE_CIVM.concat(RE_CARM)){m.count=0;if(!m.parent)SCN.add(m);}}if(G.t-RE.gT>.5)reGarRefresh();
  try{reDark(dt);}catch(e){}try{reGarFx(dt);}catch(e){if(!RE.er++)console.warn('realism garrison',e);}
  const lo=typeof fxPH==='function'&&fxPH()||(typeof gfxLow==='function'&&gfxLow());if(!lo)try{reCivTick(dt);}catch(e){if(!RE.er++)console.warn('realism towns',e);}else if(RE_CIVM){for(const m of RE_CIVM.concat(RE_CARM))m.count=0;RE.civ.length=0;RE.cars.length=0;}}
RE.er=0;
