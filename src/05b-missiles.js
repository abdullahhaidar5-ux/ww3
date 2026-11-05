/* ===== 05b-missiles: cinematic missile strikes (visuals + sound only; the simulation is untouched) =====
   Smooth lathe missiles (slim body, ogive nose, swept fins - no boxes), staggered launches with a roaring motor flame and
   white launch smoke, long fading trails, a ballistic arc with a re-entry glow (or a low fast cruise run), a converging
   warning marker with an incoming whistle, and big layered blasts (flash, fireball, dust ring, rock fragments, a
   lingering mushroom column, scorch + crater). Particles are pooled by part(); phones get about half as many. */
let MSL_GEO=null,MSL_FL=null;const MUSH=[],MFALL=[];
function mslMerge(list){let np=0,ni=0;for(const g of list){np+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;}
  const P=new Float32Array(np*3),N=new Float32Array(np*3),C=new Float32Array(np*3),I=new Uint32Array(ni);let po=0,io=0;
  for(const g of list){const n=g.attributes.position.count;P.set(g.attributes.position.array,po*3);N.set(g.attributes.normal.array,po*3);C.set(g.attributes.color.array,po*3);
    if(g.index)for(let i=0;i<g.index.count;i++)I[io++]=g.index.array[i]+po;else for(let i=0;i<n;i++)I[io++]=po+i;po+=n;}
  const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(P,3));r.setAttribute('normal',new THREE.BufferAttribute(N,3));r.setAttribute('color',new THREE.BufferAttribute(C,3));r.setIndex(new THREE.BufferAttribute(I,1));return r;}
function mslPaint(g,hex){const c=lin(hex),n=g.attributes.position.count,A=new Float32Array(n*3);for(let i=0;i<n;i++){A[i*3]=c.r;A[i*3+1]=c.g;A[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(A,3));if(g.index&&g.index.count===0)return g;return g;}
// one merged smooth geometry per missile kind: kind 'ball' (long ballistic), 'cruise' (slim, short wings), 'bomb' (fat guided bomb)
function mslGeo(kind){MSL_GEO=MSL_GEO||{};if(MSL_GEO[kind])return MSL_GEO[kind];
  const L=kind==='ball'?36:kind==='cruise'?22:15,R=kind==='ball'?2.3:kind==='cruise'?1.35:2.7,list=[],seg=kind==='bomb'?14:12;
  const body=[],nose=[],h0=-L/2,h1=L*(kind==='bomb'?.12:.22);
  // smooth body: rounded tail, straight tube, then a long pointed ogive nose (Lathe = a surface of revolution, so no flat faces)
  body.push(new THREE.Vector2(0,h0),new THREE.Vector2(R*.7,h0),new THREE.Vector2(R*.96,h0+R*.35),new THREE.Vector2(R,h0+R*.8),new THREE.Vector2(R,h1));
  const NS=10;for(let i=1;i<=NS;i++){const t=i/NS;nose.push(new THREE.Vector2(R*Math.pow(1-Math.pow(t,1.7),.62),h1+(L/2-h1)*t));}
  const lathe=pts=>new THREE.LatheGeometry(pts,seg);
  list.push(mslPaint(lathe(body),kind==='bomb'?'#6a6f58':'#e4e1d6'));
  list.push(mslPaint(lathe([new THREE.Vector2(R*1.005,h1-L*.05),new THREE.Vector2(R*1.005,h1)]),'#2a2c2a'));          // dark band behind the nose
  list.push(mslPaint(lathe([new THREE.Vector2(R,h1),...nose]),kind==='bomb'?'#3f4436':'#4a4d4a'));                    // nose cone
  const fin=(span,root,tipC,y0,col,rot)=>{const sh=new THREE.Shape();sh.moveTo(R*.9,y0+root);sh.lineTo(R*.9+span,y0+root*.12);sh.lineTo(R*.9+span,y0-tipC*.2);sh.lineTo(R*.9,y0);sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:R*.1,bevelEnabled:false});g.translate(0,0,-R*.05);g.rotateY(rot);return mslPaint(g,col);};
  const fc=kind==='bomb'?'#3a3d32':'#3d403d',nF=4;
  for(let k=0;k<nF;k++)list.push(fin(R*(kind==='ball'?1.9:1.5),L*.2,L*.05,h0,fc,k*Math.PI/2+Math.PI/4));
  if(kind==='cruise')for(let k=0;k<2;k++)list.push(fin(R*5.2,L*.12,L*.05,-L*.05,'#555955',k*Math.PI));       // pop-out wings
  if(kind==='bomb')for(let k=0;k<4;k++)list.push(fin(R*1.2,L*.1,L*.04,h1+L*.1,'#464a3c',k*Math.PI/2));         // guidance canards
  return MSL_GEO[kind]=Object.assign(mslMerge(list),{userData:{L,R}});}
function mslFlameGeo(){if(MSL_FL)return MSL_FL;const mk=(c,op)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  return MSL_FL={outer:new THREE.ConeGeometry(1,1,10,1,true).rotateX(Math.PI).translate(0,-.5,0),mo:mk(new THREE.Color(2.4,1.15,.35),.75),mi:mk(new THREE.Color(3.2,2.8,1.8),.9)};}
// build one missile object: smooth body + (optional) motor flame; returns {g,fl:[outer,inner]|null,L,R}
function mslMake(kind,flame){mats();const geo=mslGeo(kind),L=geo.userData.L,R=geo.userData.R,g=new THREE.Group(),m=new THREE.Mesh(geo,MAT.std);m.castShadow=false;g.add(m);let fl=null;
  if(flame){const F=mslFlameGeo(),o=new THREE.Mesh(F.outer,F.mo),i=new THREE.Mesh(F.outer,F.mi);o.position.y=i.position.y=-L/2+R*.2;g.add(o,i);fl=[o,i];}
  g.visible=false;SCN.add(g);return{g,fl,L,R,body:m};}
function mslFlicker(M,k){if(!M.fl)return;const f=k*(.85+Math.random()*.3);M.fl[0].scale.set(M.R*1.7,M.L*.85*f,M.R*1.7);M.fl[1].scale.set(M.R*.95,M.L*.5*f,M.R*.95);}
// smoke + fire along the stretch the missile covered this frame (spaced by distance, so fast missiles keep a solid trail)
function mslTrail(m,px,py,ph,x,y,h,u,kind){const dx=x-px,dy=y-py,dh=h-ph,len=Math.hypot(dx,dy,dh);if(len<1e-3)return;m.acc=(m.acc||0)+len;const ST=kind==='bomb'?17:13;let n=0;const ph_=fxPH();
  while(m.acc>=ST&&n<9){m.acc-=ST;n++;const k=1-m.acc/len,tx=px+dx*k,ty=py+dy*k,th=ph+dh*k,early=u<.18;
    part({x:tx+rnd(-1,1),y:ty+rnd(-1,1),h:th,vx:rnd(-3,3),vy:rnd(-3,3),vh:rnd(-1,2),c:early?[.98,.97,.94]:[.93,.92,.89],c2:[.6,.59,.56],ck:.75,s:rnd(5,8)+(early?4:0),g:rnd(3.5,5.5),d:rnd(5.5,8.5),a:early?.62:.5,rise:.6});
    if(kind!=='bomb'){part({x:tx,y:ty,h:th,add:true,c:C_FIRE2,s:rnd(8,11),d:.16});if(!ph_||Math.random()<.5)part({x:tx,y:ty,h:th,add:true,c:[3,2.6,1.8],s:rnd(4,6),d:.09});}
    if(kind==='ball'&&u>.7){part({x:tx,y:ty,h:th,add:true,c:[3,1.4,.45],c2:[1,.25,.08],ck:.5,s:rnd(11,16)*(.6+u*.6),d:rnd(.25,.4),a:.8});if(Math.random()<.4)part({x:tx,y:ty,h:th,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(-20,20),add:true,c:C_SPARK,s:2,d:rnd(.3,.6),grav:1});}}}
// trajectory: ballistic = high arc whose horizontal speed eases in/out (so it climbs nearly vertically and dives steeply);
// cruise = pops out of the cell, pitches over and skims low and fast, dipping onto the target
function mslPos(m,u,out){const k=Math.max(0,Math.min(1,u));
  if(m.cruise){const A=Math.min(120,36+m.d*.014),pop=70*Math.pow(Math.min(1,k/.06),.55)*Math.pow(1-k,3);out.set(m.sx+(m.tx-m.sx)*k,m.sh+(m.th-m.sh)*k+A*4*k*(1-k)*Math.pow(1-k,.5)+pop,m.sy+(m.ty-m.sy)*k);return out;}
  const e=k<.5?k*k*2:1-Math.pow(-2*k+2,2)/2;out.set(m.sx+(m.tx-m.sx)*e,m.sh+(m.th-m.sh)*k+m.peak*4*k*(1-k),m.sy+(m.ty-m.sy)*e);return out;}
// launch burst at the cell / truck: motor flash, a billow of white smoke along the ground, a rising column
function mslLaunch(m){const ph=fxPH(),g=groundH(m.sx,m.sy),k=ph?.5:1,x=m.sx,y=m.sy;sfxLaunch(x,y,m.cruise);mlight(x,y,m.sh,3.4,320);
  if(!inView(x,y,.6))return;
  part({x,y,h:g+m.sh-g,s:30,d:.14,add:true,c:[3.6,2.6,1.4],a:.85});
  for(let i=0;i<Math.round(22*k);i++){const a=rnd(0,6.28),v=rnd(30,95);part({x:x+Math.cos(a)*3,y:y+Math.sin(a)*3,h:g+rnd(1,5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(0,5),f:.22,rise:rnd(1,3),c:[.97,.96,.93],c2:[.68,.67,.64],ck:.85,s:rnd(14,24),g:rnd(10,18),d:rnd(5.5,9),a:.62});}
  for(let i=0;i<Math.round(10*k);i++)part({x:x+rnd(-4,4),y:y+rnd(-4,4),h:g+rnd(2,(m.sh-g)),vx:rnd(-8,8),vy:rnd(-8,8),vh:rnd(10,40),f:.4,rise:rnd(4,10),c:[.96,.95,.92],c2:[.66,.65,.62],ck:.8,s:rnd(9,15),g:rnd(7,12),d:rnd(4,7),a:.55});
  for(let i=0;i<Math.round(8*k);i++){const a=rnd(0,6.28),v=rnd(40,120);part({x,y,h:g+4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(20,90),add:true,c:C_SPARK,s:1.8,f:.6,grav:1,d:rnd(.4,.9)});}}
// ---- missile spawn / tick (replaces the old box missile) ----
function mslSpawn(sx,sy,tx,ty,T,i){let up=null,bd=1e9;for(const e of G.ents){if(e.kind!=='uplink'||e.dead)continue;const d=Math.hypot(e.x-sx,e.y-sy);if(d<bd){bd=d;up=e;}}
  const fac=up&&G.teams[up.team]?G.teams[up.team].fac:null,st=fac&&UPLINK[fac]?UPLINK[fac][1]:'silo',cruise=st==='vls',kind=cruise?'cruise':'ball';
  const M=mslMake(kind,true),d=Math.hypot(tx-sx,ty-sy),g0=groundH(sx,sy),sh=g0+(UPHY[st]||20)*.85;
  const FD=cruise?Math.min(2.6,Math.max(1.2,T-.05)):Math.min(3,Math.max(1.2,T-.05));          // flight time; the launch waits so the hit lands on the sim's own strike
  BMIS.push({g:M.g,M,sx,sy,sh,tx,ty,th:groundH(tx,ty),T:FD,t:-Math.max(0,T-.05-FD),peak:Math.max(cruise?0:380,Math.min(1100,d*.4)),d,cruise,kind,px:0,py:0,ph:0,started:0,acc:0,spin:rnd(0,6)});}
function bmTick(dt){if(!BMIS.length)return;let w=0;
  for(const m of BMIS){m.t+=dt;if(m.t<0){BMIS[w++]=m;continue;}const u=m.t/m.T;
    if(u>=1){SCN.remove(m.g);continue;}
    m.g.visible=true;bmPosT(m,u);
    if(!m.started){m.started=1;m.px=_bmA.x;m.py=_bmA.z;m.ph=_bmA.y;mslLaunch(m);}
    bmPos2(m,u+.012,_bmB);_bmB.sub(_bmA);if(_bmB.lengthSq()>1e-6){_bmB.normalize();m.g.quaternion.setFromUnitVectors(_bmUp,_bmB);}
    m.spin+=dt*3.2;m.g.rotateY(m.spin);m.g.rotateX(Math.sin(m.t*15+m.spin)*.022*(1-u*.6));m.g.rotateZ(Math.cos(m.t*11)*.018);   // slight corkscrew + wobble
    m.g.position.copy(_bmA);mslFlicker(m.M,u<.06?1.35:1);
    // exhaust leaving the motor: backwards along the body
    const tx=_bmA.x-_bmB.x*m.M.L*.5,ty=_bmA.z-_bmB.z*m.M.L*.5,th=_bmA.y-_bmB.y*m.M.L*.5;
    mslTrail(m,m.px,m.py,m.ph,tx,ty,th,u,m.kind);m.px=tx;m.py=ty;m.ph=th;
    // for the first third of a second the motor blasts the ground under it: a spreading white cloud
    if(m.t<.38&&(!fxPH()||Math.random()<.5)){const g=groundH(m.sx,m.sy),a=rnd(0,6.28),v=rnd(25,70);part({x:m.sx+rnd(-3,3),y:m.sy+rnd(-3,3),h:g+rnd(1,4),vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:.25,c:[.97,.96,.93],c2:[.7,.69,.66],ck:.8,s:rnd(14,22),g:rnd(10,16),d:rnd(5,8),a:.55});mlight(m.sx,m.sy,m.sh,2.4*(1-m.t/.38)+.4,260);}
    BMIS[w++]=m;}BMIS.length=w;}
function bmPos2(m,u,out){return mslPos(m,u,out);}
function bmPosT(m,u){return mslPos(m,u,_bmA);}
// ---- falling missile / guided bomb under the strike marker (air-launched missiles, Bunker Buster) ----
function mslFallStart(m,kind){const M=mslMake(kind,kind!=='bomb');M.g.rotation.x=Math.PI;m.fall={M,kind,px:m.x,py:m.y,ph:0,acc:0,spin:rnd(0,6)};}
function mslFallTick(m,dt){const f=m.fall,FT=kind_t(f.kind);if(m.t>=FT){return;}const q=Math.max(0,m.t/FT),h=groundH(m.x,m.y)+q*q*900+6,x=m.x+Math.sin(m.t*9)*.5*q,y=m.y;
  f.M.g.visible=true;f.spin+=dt*4;f.M.g.position.set(x,h+f.M.L*.5,y);f.M.g.rotation.set(Math.PI,f.spin,0);mslFlicker(f.M,1.1);
  if(!f.started){f.started=1;f.ph=h+f.M.L;if(f.kind==='bomb')sfxFallBomb(m.x,m.y);}
  mslTrail(f,f.px,f.py,f.ph,x,y,h+f.M.L,1-q,f.kind==='bomb'?'bomb':'fall');f.px=x;f.py=y;f.ph=h+f.M.L;
  if(f.kind==='bomb'&&(!fxPH()||Math.random()<.5))part({x,y,h:h+f.M.L,add:true,c:[2,1.6,1],s:rnd(3,5),d:.08,a:.7});}
function kind_t(k){return k==='bomb'?1.5:1.25;}
// ---- the big blast: layered on top of boomFX() for every strike-sized explosion ----
function megaBoom(x,y,s,big){if(!inView(x,y,.5))return;const ph=fxPH(),S=big?s:s*1.45,g=groundH(x,y),k=ph?.55:1,th=G&&G.map&&G.map.theme==='snow',dust=th?[.86,.88,.9]:[.64,.55,.4],dust2=th?[.7,.72,.75]:[.5,.44,.33];
  sfxMega(x,y,S);
  part({x,y,h:g+S*.4,s:S*3.6,d:.1,add:true,c:[4,3.4,2.4],a:.9});part({x,y,h:g+S*.5,s:S*2,d:.35,add:true,c:[3,1.6,.5],c2:[1,.3,.08],ck:.7,a:.9});flash=Math.min(.3,flash+.12);
  PINGS.push({x,y,r:S*5.2,t:0,d:.8,c:0xffe6bb});                                           // fast bright shock ring on the ground
  // full-circle dust wall racing outward
  {const N=Math.round(30*k);for(let i=0;i<N;i++){const a=i/N*6.2832+rnd(-.1,.1),v=S*rnd(3.6,4.8);part({x:x+Math.cos(a)*S*.25,y:y+Math.sin(a)*S*.25,h:g+rnd(2,5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(2,9),f:.1,rise:rnd(1,3),c:dust,c2:dust2,ck:.5,s:rnd(S*.45,S*.7),g:S*.6,d:rnd(2.2,3.4),a:.62});}}
  // rolling fireball: many orange puffs that climb and cool
  for(let i=0;i<Math.round(13*k);i++){const a=rnd(0,6.28),r=rnd(0,S*.32);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(S*.1,S*.5),vx:Math.cos(a)*rnd(2,S*.6),vy:Math.sin(a)*rnd(2,S*.6),vh:rnd(S*.5,S*1.7),f:.2,rise:rnd(8,18),add:true,c:[3,1.45,.4],c2:[.55,.13,.04],ck:.55,s:rnd(S*.45,S*.8),g:S*1.1,d:rnd(.7,1.3),a:.75});}
  for(let i=0;i<Math.round(9*k);i++){const a=rnd(0,6.28),r=rnd(0,S*.3);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(S*.2,S*.6),vx:Math.cos(a)*rnd(2,S*.5),vy:Math.sin(a)*rnd(2,S*.5),vh:rnd(S*.4,S*1.2),f:.25,rise:rnd(10,22),c:[1.7,.75,.22],c2:[.16,.12,.1],ck:.45,s:rnd(S*.5,S*.85),g:S*.9,d:rnd(1.5,2.6),a:.8});}
  // glowing fragments (irregular, small) arcing out, then rocks
  for(let i=0;i<Math.round(22*k);i++){const a=rnd(0,6.28),v=rnd(30,S*3.2);part({x,y,h:g+4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(S*2,S*6),f:.5,grav:1,add:true,c:[3,1.6,.5],c2:[1,.3,.1],ck:.6,s:rnd(2,4),d:rnd(.9,1.8),a:.9});}
  if(!ph)chunks(x,y,S*1.0,'#4a4034',big?8:5);else chunks(x,y,S*.9,'#4a4034',3);
  // lingering mushroom column (only a few at a time so a whole salvo stays cheap)
  if(MUSH.length<4)MUSH.push({x,y,g,S,t:0,acc:0,cap:0});
  const sc=S*1.5;scorch(x,y,sc);if(g>(typeof WL==='number'?WL+1:-1e9))crater(x,y,S*1.7);
  const kd=Math.max(0,1-Math.hypot(x-cam.x,y-cam.y)/(cam.dist*2.3));shake=Math.min(26,shake+S*.3*kd*(ph?.7:1));}
function mushTick(dt){if(!MUSH.length)return;const ph=fxPH();for(let i=MUSH.length-1;i>=0;i--){const m=MUSH[i];m.t+=dt;const S=m.S,TS=3.4,H=S*5.3;
    if(m.t<TS){m.acc+=dt*(ph?9:17);while(m.acc>=1){m.acc-=1;const q=m.t/TS,h=m.g+q*H*.96,r=S*(.1+.06*Math.sin(q*9));part({x:m.x+rnd(-r,r),y:m.y+rnd(-r,r),h,vx:rnd(-4,4),vy:rnd(-4,4),vh:rnd(0,8),rise:rnd(2,6),c:q<.3?[.5,.28,.12]:[.3,.27,.24],c2:[.52,.5,.47],ck:.7,s:rnd(S*.4,S*.6),g:S*.22,d:rnd(8,11),a:.6});}}
    if(!m.cap&&m.t>=TS*.78){m.cap=1;const top=m.g+H;for(let j=0;j<Math.round(18*(ph?.55:1));j++){const a=j/18*6.28+rnd(-.2,.2),v=S*rnd(.5,1.0);part({x:m.x+Math.cos(a)*S*.2,y:m.y+Math.sin(a)*S*.2,h:top+rnd(-S*.25,S*.25),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(0,8),f:.35,rise:rnd(3,6),c:[.4,.37,.33],c2:[.55,.53,.5],ck:.6,s:rnd(S*.8,S*1.3),g:S*.2,d:rnd(11,16),a:.55});}
      for(let j=0;j<5;j++)part({x:m.x+rnd(-S*.2,S*.2),y:m.y+rnd(-S*.2,S*.2),h:top+rnd(-S*.2,S*.3),vx:rnd(-6,6),vy:rnd(-6,6),rise:rnd(2,5),c:[.34,.31,.28],c2:[.5,.48,.45],ck:.6,s:rnd(S*1,S*1.5),g:S*.15,d:rnd(12,16),a:.6});}
    if(m.t>TS+.2)MUSH.splice(i,1);}}
