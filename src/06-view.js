/* ================= VIEW: scene sync, camera, HUD, fog, minimap ================= */
const OBJ=new Map();let RINGS=[],GHOST=null,GHOSTK=null,RALLY=null,fogT=0,PPU=1;
const QUAL={lv:0,ema:1/60,bad:0,good:0,caps:[1,.85,.75,.67,.58,.5],hz:60,dts:[],cost:1/120,fps:60};  // resolution steps relative to the screen's own pixel density (the old absolute steps 2/1.5/1.25/1 changed nothing on ordinary screens)
// Frame-rate governor: aims for the chosen target (default 120 FPS) or the screen's own refresh rate if lower (a 60 Hz
// screen can never show more than 60). Missed frames step the render resolution and effects down; when frames are
// finishing with plenty of time to spare it steps back up.
function fpsTarget(){let t=120;try{t=+(localStorage.getItem('ww3_fpsT')||120)||120;}catch(e){}return Math.min(t,QUAL.hz*.97);}
function qualTick(dt){if(!(dt>0))return;QUAL.dts.push(dt);if(QUAL.dts.length>180)QUAL.dts.shift();if(QUAL.dts.length>=60&&QUAL.dts.length%30===0){const s=QUAL.dts.slice().sort((a,b)=>a-b);QUAL.hz=Math.max(30,Math.min(360,1/s[Math.floor(s.length*.1)]));}
  QUAL.ema+=(dt-QUAL.ema)*.05;QUAL.fps=1/QUAL.ema;if(QUAL.lock)return;const T=fpsTarget();
  if(QUAL.ema>1/(T*.88)){QUAL.bad+=dt;QUAL.good=0;}else if(QUAL.cost<.45/T){QUAL.good+=dt;QUAL.bad=0;}else{QUAL.bad=Math.max(0,QUAL.bad-dt);QUAL.good=0;}
  // step down after 1.5 s of missed frames - unless the frame is CPU-bound (game logic, not drawing), where a lower
  // resolution would only blur the picture without making it faster
  if(QUAL.bad>1.5&&QUAL.lv<5&&QUAL.cost<.75/T){QUAL.lv++;QUAL.bad=0;QUAL.ema=1/T;applyQual();}else if(QUAL.good>10&&QUAL.lv>0){QUAL.lv--;QUAL.good=0;applyQual();}}
function applyQual(){POST.aoOn=QUAL.lv<2;resize();}
function resize(){const r=cv.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1)*(((()=>{try{return GFX_PHONE;}catch(e){return false;}})())?Math.max(.85,QUAL.caps[QUAL.lv]):QUAL.caps[QUAL.lv]);/* phones stay sharp (Abdullah 2026-10-29: Low looked bad); they save on effects instead */VW=Math.max(1,r.width);VH=Math.max(1,r.height);
  if(R3){R3.setPixelRatio(dpr);R3.setSize(VW,VH,false);if(POST.rt)sizePost();CAM.aspect=VW/VH;CAM.updateProjectionMatrix();}hud.width=Math.round(VW*dpr);hud.height=Math.round(VH*dpr);}
// the player can pull the camera higher (ZMAX) and tilt it (cam.tilt: Shift+wheel, Page Up/Down, two fingers up/down) - Abdullah 2026-10-29
const ZMAX=2600;function tiltBy(v){cam.tilt=Math.max(-.32,Math.min(.62,(cam.tilt||0)+v));}
function placeCam(){const d=cam.dist,kz=Math.max(0,Math.min(1,(d-230)/(600-230)));let p=Math.max(.34+kz*.44,Math.asin(Math.min(1,112/d)));p=Math.max(.22,Math.min(1.42,p+(cam.tilt||0)));if(typeof SCN!=='undefined'&&SCN&&SCN.fog){const f=SCN.fog;if(f._set!==f.near){f.n0=f.near;f.f0=f.far;}const ex=Math.max(0,d-1400)*1.2;f.near=f.n0+ex;f.far=f.f0+ex;f._set=f.near;}/* zoomed far out, push the haze back so the battlefield stays clear */cam.x=Math.max(0,Math.min(MAPW,cam.x));cam.y=Math.max(Math.min(60+cam.dist*.5,MAPH/2),Math.min(MAPH+120,cam.y));{const lo=Math.min(cam.dist*.55,MAPW/2);cam.x=Math.max(lo,Math.min(MAPW-lo,cam.x));}
  const sx=shake>.3?rnd(-shake,shake):0,sy=shake>.3?rnd(-shake,shake):0;
  CAM.position.set(cam.x+sx,Math.sin(p)*d,cam.y+Math.cos(p)*d+sy);CAM.lookAt(cam.x+sx,0,cam.y+sy);CAM.updateMatrixWorld();if(window.SKY)SKY.position.copy(CAM.position);
  SUN.position.set(cam.x+SUNOFF[0],SUNOFF[1],cam.y+SUNOFF[2]);SUN.target.position.set(cam.x,0,cam.y);const hs=Math.max(380,d*1.05),sc=SUN.shadow.camera;if(sc.right!==hs){sc.left=-hs;sc.right=hs;sc.top=hs;sc.bottom=-hs;sc.updateProjectionMatrix();}
  TMP.set(cam.x,0,cam.y).project(CAM);const a=TMP.x;TMP.set(cam.x+100,0,cam.y).project(CAM);PPU=Math.abs(TMP.x-a)*VW/2/100;}
// Smooth camera: jumps (minimap, Home, squad hotkeys), scrolling and zoom set a target and the camera eases toward it
// every frame (frame-rate independent). Anything that moves the camera directly is respected.
function centerOn(x,y,instant){camTarget();cam.tx=x;cam.ty=y-cam.td*.08;if(instant||!G||G.t<.6){cam.x=cam.tx;cam.y=cam.ty;cam._xl=cam.x;cam._yl=cam.y;}}
function camTarget(){if(cam.tx==null||cam.x!==cam._xl||cam.y!==cam._yl){cam.tx=cam.x;cam.ty=cam.y;}if(cam.td==null||cam.dist!==cam._dl)cam.td=cam.dist;}
function camTick(dt){camTarget();const k=1-Math.exp(-dt*9),kz=1-Math.exp(-dt*11);cam.x+=(cam.tx-cam.x)*k;cam.y+=(cam.ty-cam.y)*k;cam.dist+=(cam.td-cam.dist)*kz;
  if(Math.abs(cam.tx-cam.x)<.05)cam.x=cam.tx;if(Math.abs(cam.ty-cam.y)<.05)cam.y=cam.ty;if(Math.abs(cam.td-cam.dist)<.05)cam.dist=cam.td;cam._xl=cam.x;cam._yl=cam.y;cam._dl=cam.dist;}
// which city building is under the cursor (rooftops included)
function civUnder(sx,sy,w){if(!G.civ||!G.civ.length)return null;if(CITYM){const v=new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1);RAY.setFromCamera(v,CAM);const h=RAY.intersectObject(CITYM,true)[0];if(h){const c=civAtXY(h.point.x-h.face.normal.x*2,h.point.z-h.face.normal.z*2);if(c)return c;}}return w?civAtXY(w.x,w.y):null;}
function screenToWorld(sx,sy){const v=new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1);RAY.setFromCamera(v,CAM);const out=new THREE.Vector3();if(!RAY.ray.intersectPlane(GPLANE,out))return null;return{x:out.x,y:out.z};}
function toScreen(x,h,y){TMP.set(x,h,y).project(CAM);return{x:(TMP.x+1)/2*VW,y:(1-TMP.y)/2*VH,z:TMP.z};}
function vis(e){return e.team===ME||e.vis;}
function entHeightMid(e){return e.isB?BH[e.kind]*.6:(e.s.dom==='air'?unitH(e)-groundH(e.x,e.y):6);}
const _OS=new THREE.Vector3();function onScr(x,h,y,m){if(!CAM)return true;_OS.set(x,h,y).project(CAM);return _OS.z<1&&Math.abs(_OS.x)<1+m&&Math.abs(_OS.y)<1+m;}
function syncScene(dt){const live=new Set();
  // one object that fails to update must never freeze the whole picture: skip it (logged once) and draw the rest
  for(const e of G.ents){try{if(e.dead)continue;live.add(e.id);let o=OBJ.get(e.id);if(o&&o.userData.tm!==undefined&&o.userData.tm!==e.team){SCN.remove(o);o=null;}if(!o){o=makeObj(e);o.userData.tm=e.team;OBJ.set(e.id,o);}
    const v=vis(e);
    // off-screen units and buildings are neither drawn nor have their 3D parts (49 bones per soldier) recomputed; the
    // margin keeps shadows cast from just outside the view
    const on=v&&onScr(e.x,e.isB?0:(e.s&&e.s.dom==='air'?unitH(e):0),e.y,e.isB?.6:.35);o.visible=on;o.matrixWorldAutoUpdate=on;if(!v)continue;const P=o.userData.parts,gh=unitH(e);{let ex=e.x,ey=e.y;if(MODE!=='client'&&!e.isB&&e.ox!=null){const dx=e.x-e.ox,dy=e.y-e.oy;if(dx*dx+dy*dy<900){const a=G.alpha??1;ex=e.ox+dx*a;ey=e.oy+dy*a;}}o.position.set(ex,gh,ey);}{const ts=o.userData.toss;if(ts){ts.vh-=260*dt;ts.h+=ts.vh*dt;ts.r+=ts.sp*dt;if(ts.h<=0){o.userData.toss=null;if(P.body)P.body.rotation.z=0;}else{o.position.y+=ts.h;if(P.body)P.body.rotation.z=ts.r;}}}
    if(!e.isB&&P.pennant&&inView(e.x,e.y,.05)){const g=P.pennant.geometry.attributes.position,b=P.pennant.userData.base,t=G.t*(7+(e.v||0)*.08)+e.id;for(let i=0;i<g.count;i++){const x=b[i*3];g.array[i*3+2]=Math.sin(x*.9-t)*x*.12;}g.needsUpdate=true;}
    if(e.isB&&P.flag&&inView(e.x,e.y,.1)){const g=P.flag.geometry.attributes.position,b=P.flag.userData.base||(P.flag.userData.base=Float32Array.from(g.array)),t=G.t*4+e.id;for(let i=0;i<g.count;i++){const x=b[i*3];g.array[i*3+2]=Math.sin(x*.55-t)*x*.09;}g.needsUpdate=true;P.flag.rotation.y=.5+Math.sin(G.t*.3+e.id)*.25;}
    if(e.isB&&e.built>=1){const f=e.hp/e.max,lv=f<.3?2:f<.6?1:0,ud=o.userData;if((ud.dmg||0)<lv){mats();for(let q=ud.dmg||0;q<lv;q++){const h=e.size/2;for(let j=0;j<3;j++){const a=Math.random()*6.28,r=h*(1+Math.random()*.35),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r;scorch(x,y,rnd(12,18));const B=Bld();for(let c=0;c<6;c++){const sz=rnd(3,7);B.box(sz,sz*.6,sz*rnd(.6,1.4),rnd(-6,6),sz*.3,rnd(-6,6),Math.random()<.5?'#4a4640':'#1f1d1a',rnd(-.4,.4),rnd(0,6),rnd(-.4,.4));}const m=mesh(B.geo());m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.castShadow=true;o.add(m);(ud.debris=ud.debris||[]).push(m);}}ud.dmg=lv;}
      else if((ud.dmg||0)>lv&&f>.95){for(const m of ud.debris||[])o.remove(m);ud.debris=[];ud.dmg=0;}}
    if(e.isB){const k=e.built<1,bs=e.kind==='garrison'?1:BSC;o.scale.set(bs,(k?Math.max(.12,e.built):1)*bs,bs);P.scaf.visible=k;P.scaf.scale.y=bs/o.scale.y;
      if(P.gun)P.gun.rotation.y=-e.ang;if(P.dish)P.dish.rotation.y+=dt*(o.userData.parts.dish.isGroup?.5:1.6);if(P.crane)P.crane.rotation.y=Math.sin(G.t*.2+e.id)*1.1;
      if(P.da){const T=G.teams[e.team],f=e.chg!=null?e.chg:(T.charge/T.sup.charge);P.da.position.x=-9-f*16;P.db.position.x=9+f*16;P.missile.position.y=-20+f*24+(P.hy||0);}
      if(!k){const f=e.hp/e.max;
        if(e.built>=1&&f<.4&&inView(e.x,e.y,.2)){if(!e.fires){const R=mulberry(e.id*17+3);e.fires=[];for(let q=0;q<3;q++){const edge=q===2;e.fires.push([(R()-.5)*e.size*(edge?.9:.5),(R()-.5)*e.size*(edge?.9:.5),edge?BH[e.kind]*(.3+R()*.3):BH[e.kind]*(.85+R()*.25)]);}}
          const nf=f<.2?3:f<.3?2:1;for(let q=0;q<nf;q++){const [fx,fy,fh]=e.fires[q];if(Math.random()<dt*16){part({x:e.x+fx+rnd(-3,3),y:e.y+fy+rnd(-3,3),h:gh+fh,vh:rnd(12,26),rise:rnd(16,26),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(7,13),g:-3,d:rnd(.4,.8),a:.9});}
            if(Math.random()<dt*5)part({x:e.x+fx,y:e.y+fy,h:gh+fh+6,vx:3,rise:rnd(36,50),c:C_DARK,c2:[.36,.35,.33],ck:.35,s:rnd(7,11),g:12,d:rnd(2.8,3.8),a:.5});
            if(Math.random()<dt*2.5)part({x:e.x+fx,y:e.y+fy,h:gh+fh,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:1.3,f:.6,grav:1,d:rnd(.4,.8)});}
          if(e.fires&&Math.random()<dt*1.2){const L=LIGHTS&&LIGHTS.find(l=>l.intensity<.05*LUX);if(L){L.position.set(e.x+e.fires[0][0],gh+e.fires[0][2]+6,e.y+e.fires[0][1]);L.color.setRGB(1,.55,.2);L.intensity=1.6*LUX;L.distance=120;L.userData.d=.9;L.userData.t=0;}}}
        if(f<.6&&Math.random()<dt*(f<.3?9:4))part({x:e.x+rnd(-e.size*.3,e.size*.3),y:e.y+rnd(-e.size*.3,e.size*.3),h:gh+BH[e.kind]*rnd(.5,1),rise:rnd(30,44),c:f<.3?C_DARK:C_SMOKE,c2:[.46,.44,.41],ck:.35,s:rnd(7,11),g:12,d:rnd(2,3),a:.5});
        if(f<.3&&Math.random()<dt*7)part({x:e.x+rnd(-e.size*.3,e.size*.3),y:e.y+rnd(-e.size*.3,e.size*.3),h:gh+BH[e.kind]*rnd(.4,1),rise:20,add:true,c:C_FIRE,s:rnd(6,12),g:-5,d:rnd(.3,.6)});
        if(e.kind==='factory'&&(e.busy||(G.teams[e.team].q.factory||[]).length)&&Math.random()<dt*5)part({x:e.x+28,y:e.y-26,h:gh+46,vx:rnd(2,8),rise:24,c:C_SMOKE,s:rnd(5,9),g:14,d:rnd(1.8,2.6),a:.45});
        if(e.dis>G.t||e.disv){if(Math.random()<dt*10)part({x:e.x+rnd(-e.size*.4,e.size*.4),y:e.y+rnd(-e.size*.4,e.size*.4),h:gh+rnd(4,BH[e.kind]),vh:rnd(10,30),add:true,c:[.3,1,.5],s:rnd(2,3.5),d:rnd(.4,.9)});}
        if(e.charge||e.chv){if(Math.random()<dt*14)part({x:e.x+e.size*.45,y:e.y+e.size*.45,h:gh+4,add:true,c:[1,.2,.1],s:4,d:.12});}}}
    else{const s=e.s,c=s.cls;if(s.dom==='ground'&&s.armor==='heavy'){const ft=G.t-(e.lastFire||-9);if(ft<.2&&ft>=0){const k=(1-ft/.2)*2.4,ang=e.tang??e.va;o.position.x-=Math.cos(ang)*k;o.position.z-=Math.sin(ang)*k;o.rotation.x=0;}}if(s.dom==='naval'){o.rotation.z=Math.sin(G.t*1.1+e.id)*.025;o.rotation.x=Math.sin(G.t*.8+e.id*2)*.02;o.position.y+=Math.sin(G.t*1.4+e.id)*.6;}const mv0=G.t-(e.mv||-9)<.15||(e.mvC>0);let yawT=e.va;if(o.userData.model&&!P.turret&&!mv0&&e.tang!=null&&G.t-(e.lastFire||-9)<4&&s.dom!=='air')yawT=e.tang;
      if(o.userData.yaw==null)o.userData.yaw=yawT;o.userData.yaw=lerpA(o.userData.yaw,yawT,Math.min(1,dt*3.5));o.rotation.y=-o.userData.yaw;
      if(P.turret)P.turret.rotation.y=-(e.tang-e.va);
      // ground vehicles: follow the terrain slope, squat under acceleration, dip when braking and lean into turns
      if(s.dom==='ground'&&s.armor==='heavy'&&o.userData.model&&inView(e.x,e.y,.1)){const ud=o.userData,ca=Math.cos(e.va),sa=Math.sin(e.va),L=Math.max(10,e.r*1.1);
        const fr=groundH(e.x+ca*L,e.y+sa*L),bk=groundH(e.x-ca*L,e.y-sa*L),lf=groundH(e.x-sa*L*.7,e.y+ca*L*.7),rt=groundH(e.x+sa*L*.7,e.y-ca*L*.7);
        const tp=Math.atan2(fr-bk,2*L),tr=Math.atan2(lf-rt,1.4*L);const v=e.v||0,acc=(v-(ud.pv??v))/Math.max(dt,1e-3);ud.pv=v;
        const yr=angDiff(ud.pyaw2??ud.yaw,ud.yaw)/Math.max(dt,1e-3);ud.pyaw2=ud.yaw;
        ud.sp=(ud.sp||0)+((Math.max(-.05,Math.min(.05,acc*.0011)))-(ud.sp||0))*Math.min(1,dt*6);ud.sr=(ud.sr||0)+((Math.max(-.05,Math.min(.05,yr*v*.0009)))-(ud.sr||0))*Math.min(1,dt*5);
        o.rotation.order="YZX";o.rotation.z=tp+ud.sp;o.rotation.x=-tr+ud.sr;
        if(v>2)o.position.y+=Math.sin(G.t*23+e.id)*.12*Math.min(1,v/40);}
      if(e.kind==='heli'){const ud=o.userData;o.rotation.order='YXZ';const mv=(G.t-(e.mv||-9)<.25)||(e.mvC>0);const prev=ud.pyaw??ud.yaw;let tr=ud.yaw-prev;tr=Math.atan2(Math.sin(tr),Math.cos(tr))/Math.max(dt,1e-3);ud.pyaw=ud.yaw;
        const hv=e.v||0,ha=(hv-(ud.phv??hv))/Math.max(dt,1e-3);ud.phv=hv;ud.pt=(ud.pt||0)+((e.landed?0:Math.max(-.22,Math.min(.3,.04+hv/Math.max(60,e.s.spd)*.24-ha*.003)))-(ud.pt||0))*Math.min(1,dt*1.8);ud.rl=(ud.rl||0)+((e.landed?0:Math.max(-.32,Math.min(.32,tr*.35)))-(ud.rl||0))*Math.min(1,dt*2.5);
        o.rotation.z=-ud.pt;o.rotation.x=ud.rl;if(!e.landed){o.position.y+=Math.sin(G.t*1.3+e.id)*1.2;}}
      if(s.cls==='heli'&&!e.landed)rotorWash(e,o,dt);
      if(s.dom==='naval')shipWake(e,o,dt);
      if(s.dom==='ground'&&s.armor==='heavy')dustTrail(e,o,dt);
      if(P.props){for(const p of P.props)p.m.rotation[p.ax]+=dt*(p.ax==='x'?55:70);if(e.kind==='drone'){const ud=o.userData,prev=ud.pyd??ud.yaw;let tr=angDiff(prev,ud.yaw)/Math.max(dt,1e-3);ud.pyd=ud.yaw;const t=e.target,d=t&&!t.dead?Math.hypot(t.x-e.x,t.y-e.y):1e9;
          const dsp=Math.hypot(e.x-(ud.dpx??e.x),e.y-(ud.dpy??e.y))/Math.max(dt,1e-3);ud.dpx=e.x;ud.dpy=e.y;ud.dsv=(ud.dsv||0)+(Math.min(1,dsp/Math.max(40,e.s.spd))-(ud.dsv||0))*Math.min(1,dt*3);
          ud.dp=(ud.dp||0)+(((d<170?.55*(1-d/170):0)+(ud.dtype==='delta'?.04:.04+.26*ud.dsv))-(ud.dp||0))*Math.min(1,dt*4);if(ud.dtype==='delta'&&inView(e.x,e.y,.1)&&Math.random()<dt*10){const bx=e.x-Math.cos(ud.yaw)*12,by=e.y-Math.sin(ud.yaw)*12;part({x:bx,y:by,h:o.position.y,c:[.6,.6,.58],s:rnd(2.5,3.5),g:0,d:rnd(.8,1.3),a:.22,rise:.5});}o.rotation.order='YZX';o.rotation.z=-ud.dp;o.rotation.x=Math.max(-.75,Math.min(.75,tr*(ud.dtype==='delta'?.55:.15)));
          if(P.dshadow){P.dshadow.position.y=groundH(e.x,e.y)-o.position.y+.8;}}}
      if(P.rotor)P.rotor.rotation.y+=dt*(e.landed?3:28);if(P.blades){P.blades.rotation.y+=dt*(e.landed?2.5:13);if(P.rotor)P.rotor.visible=!e.landed;}if(P.tailR)P.tailR.rotation.z+=dt*(e.landed?6:42);if(P.tailR0)P.tailR0.rotation.x+=dt*(e.landed?6:42);
      if(P.glow)P.glow.visible=!e.landed;
      if(P.cargo)P.cargo.visible=!!e.cargo;
      if((e.kind==='ew'||e.kind==='cbr')&&P.crane)P.crane.rotation.y+=dt*(e.kind==='ew'?2.2:.9);
      if(e.kind==='dozer'){const cr=P.crane;if(cr){cr.rotation.y=e.building?.5+Math.sin(G.t*1.3+e.id)*.9:lerpA(cr.rotation.y,.5,dt*2);}if(e.building&&inView(e.x,e.y,.1)&&Math.random()<dt*9){const ca=Math.cos(e.va),sa=Math.sin(e.va),hx=e.x+ca*30+rnd(-10,10),hy=e.y+sa*30+rnd(-10,10),gh=groundH(hx,hy)+rnd(4,14);part({x:hx,y:hy,h:gh,s:2.2,d:.08,add:true,c:[3,2.6,1.6]});for(let q=0;q<3;q++)part({x:hx,y:hy,h:gh,vx:rnd(-50,50),vy:rnd(-50,50),vh:rnd(30,90),add:true,c:C_SPARK,s:1.1,f:.6,grav:1,d:rnd(.25,.5)});if(Math.random()<.3)part({x:hx,y:hy,h:gh,vx:rnd(-6,6),vy:rnd(-6,6),rise:12,c:C_DUST,s:rnd(4,7),g:8,d:1.2,a:.3});}}
      const moving=G.t-(e.mv||-9)<.15||(e.mvC>0);
      {const f=e.hp/e.max;if(f<.5&&!['inf','at','hacker','hero'].includes(c)&&Math.random()<dt*(f<.25?7:2.5)){const hh=gh+(s.dom==='air'?0:8);part({x:e.x+rnd(-3,3),y:e.y+rnd(-3,3),h:hh+4,rise:rnd(34,48),c:f<.25?C_DARK:C_SMOKE,c2:[.46,.44,.41],ck:rnd(.25,.4),s:rnd(3,5),g:6,d:rnd(1.6,2.4),a:.38});if(f<.25&&Math.random()<.5)part({x:e.x+rnd(-3,3),y:e.y+rnd(-3,3),h:hh,rise:14,add:true,c:C_FIRE,s:rnd(3,5),g:-3,d:rnd(.2,.4)});}}
      if(o.userData.mixers)playAnim(o,c==='hero'?(moving?'run':(G.t-(e.lastFire||-9)<1?'shoot':'aim')):'stand',dt);
      if(P.body&&(o.userData.walker||['inf','at','hero','hacker'].includes(c))){if(o.userData.walker){const near=inView(e.x,e.y,.05);o.userData.wa=Math.max(0,Math.min(1,(o.userData.wa||0)+(moving?dt*5:-dt*5)));const wa=o.userData.wa;{const far=cam.dist>480;if(o.userData.farS!==far){o.userData.farS=far;o.traverse(q=>{if(q.userData&&q.userData.gear===2)q.visible=!far;});}}{const ud=o.userData,px=o.position.x,pz=o.position.z;if(ud.gpx!==undefined&&dt>0)ud.gv+=(Math.min(150,Math.hypot(px-ud.gpx,pz-ud.gpz)/dt)-ud.gv)*Math.min(1,dt*8);else ud.gv=0;ud.gpx=px;ud.gpz=pz;}const gv=Math.max(o.userData.gv,moving?8:0),run=Math.max(0,Math.min(1,(gv-12)/30)),ga=.38+.1*run,gs=.5-.29*run,pose=near&&cam.dist<760,br=!moving&&pose&&cam.dist<480;let k=0;for(const m of P.body.children){const W=m.userData.legs,ud=m.userData;if(ud.wph===undefined)ud.wph=(e.id*.618+k*.31)%1;if(wa>0&&W)ud.wph=(ud.wph+dt*gs*gv/Math.max(1,gSweep(W,ga,run)))%1;m.position.y=0;m.rotation.x=0;m.rotation.z=0;const b=br?.018*Math.sin(G.t*1.7+e.id+k*2.1):0;if(pose&&W&&(wa>0||ud.wl||b))m.position.y=walkPose(m,ud.wph,wa,ga,gs,run,b);ud.wl=wa>0||b!==0;k++;}}else if(o.userData.cleric){P.body.position.y=moving?Math.abs(Math.sin(G.t*5+e.id))*.22:0;P.body.rotation.x=moving?Math.sin(G.t*5+e.id)*.03:0;}else P.body.position.y=moving&&!o.userData.mixers?Math.abs(Math.sin(G.t*12+e.id))*1.2:0;}
      if(c==='hero'&&P.body&&!o.userData.model){const hid=e.hid;P.body.material=hid?(MAT.stealth||(MAT.stealth=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.35}))):MAT.std;}
      if(c==='jet'&&!e.landed){const ud=o.userData;o.rotation.order='YZX';const tr=angDiff(ud.pjy??e.va,e.va)/Math.max(dt,1e-3);ud.pjy=e.va;ud.bk=(ud.bk||0)+((Math.max(-1.05,Math.min(1.05,-tr*.55)))-(ud.bk||0))*Math.min(1,dt*3);
        const vy=(gh-(ud.pgh??gh))/Math.max(dt,1e-3);ud.pgh=gh;ud.pc=(ud.pc||0)+((Math.max(-.6,Math.min(.6,Math.atan2(vy,Math.max(60,e.s.spd)))))-(ud.pc||0))*Math.min(1,dt*3);o.rotation.x=ud.bk;o.rotation.z=ud.pc;
        if(P.glow){const ab=(e.toT!=null&&G.t-e.toT<4)||vy>25;P.glow.scale.setScalar(ab?1.6:1);}
        if(inView(e.x,e.y,.15)){const yw=e.va||0,cx=Math.cos(yw),sx=Math.sin(yw),hard=Math.abs(ud.bk)>.45||Math.abs(ud.pc)>.3;for(const sd of [-1,1]){if(hard||Math.random()<.35){const wx=e.x-cx*6-sx*sd*15,wy=e.y-sx*6+cx*sd*15;part({x:wx,y:wy,h:gh+sd*Math.sin(ud.bk)*8,c:[.93,.94,.96],s:hard?2.6:1.6,g:0,d:hard?.9:.45,a:hard?.42:.22,f:0});}}
          if(Math.random()<.7)part({x:e.x-cx*24,y:e.y-sx*24,h:gh+1,c:[.55,.54,.52],s:rnd(2.5,4),g:0,d:rnd(.35,.6),a:.18,f:0});}
        if(Math.abs(ud.bk)>.7&&Math.random()<dt*30){for(const sg of [-1,1])part({x:e.x+Math.sin(e.va)*sg*16,y:e.y-Math.cos(e.va)*sg*16,h:gh+sg*Math.sin(ud.bk)*10,c:[.95,.95,.98],s:1.6,g:2,d:.5,a:.4,f:1});}if(Math.random()<dt*20)part({x:e.x-Math.cos(e.va)*18,y:e.y-Math.sin(e.va)*18,h:gh,c:[.85,.85,.85],s:2.2,g:3,d:.7,a:.35});}
      if(c==='heli'&&!e.landed&&gh-groundH(e.x,e.y)<70&&Math.random()<dt*4)part({x:e.x+rnd(-20,20),y:e.y+rnd(-20,20),h:groundH(e.x,e.y)+1,vx:rnd(-40,40),vy:rnd(-40,40),c:C_DUST,s:rnd(4,7),g:10,d:.8,a:.25});
      if(moving){const dx=e.x-(e.lx??e.x),dy=e.y-(e.ly??e.y),dd=Math.hypot(dx,dy);e.odo=(e.odo||0)+dd;
        if(s.dom==='ground'&&s.armor==='heavy'&&Math.floor(e.odo/8)!==Math.floor((e.odo-dd)/8)){const ca=Math.cos(e.va),sa=Math.sin(e.va),w=e.r*.68;track(e.x-sa*w,e.y+ca*w,e.va);track(e.x+sa*w,e.y-ca*w,e.va);if(Math.random()<.4)for(let q=0;q<3;q++)part({x:e.x-ca*e.r,y:e.y-sa*e.r,h:gh+2,vx:-ca*rnd(20,50)+rnd(-15,15),vy:-sa*rnd(20,50)+rnd(-15,15),vh:rnd(40,90),c:[.25,.2,.14],s:rnd(1.2,2.2),f:.8,grav:1,d:rnd(.5,.9)});}
        if(s.dom==='ground'&&s.armor==='heavy'&&Math.random()<dt*6){const ca=Math.cos(e.va),sa=Math.sin(e.va);part({x:e.x-ca*e.r*1.1,y:e.y-sa*e.r*1.1,h:gh+7,vx:-ca*10,vy:-sa*10,rise:14,c:[.3,.29,.27],c2:[.5,.48,.45],ck:.3,s:rnd(2,3.2),g:6,d:rnd(.6,.9),a:.28});}
        if(s.dom==='naval'&&dd>0&&Math.random()<dt*25){const ca=Math.cos(e.va),sa=Math.sin(e.va),sp=Math.min(1,dd/Math.max(dt,1e-3)/60),big=e.r>18?1.6:1;for(const sd of [-1,1])part({x:e.x-ca*e.r+sa*sd*e.r*.4,y:e.y-sa*e.r-ca*sd*e.r*.4,h:WL+1,vx:sa*sd*14,vy:-ca*sd*14,c:[.85,.92,.95],s:rnd(3,5)*big,g:8,d:1.2,a:.7});
          part({x:e.x-ca*e.r*1.05+rnd(-2,2),y:e.y-sa*e.r*1.05+rnd(-2,2),h:WL+.6,vx:-ca*8,vy:-sa*8,f:.6,c:[.8,.88,.9],s:rnd(3,5)*big,g:3*big,d:rnd(.7,1.1),a:.24*(.4+sp*.6)});
          if(sp>.4)for(const sd of [-1,1])part({x:e.x+ca*e.r*.75+sa*sd*e.r*.25,y:e.y+sa*e.r*.75-ca*sd*e.r*.25,h:WL+2,vx:sa*sd*rnd(20,40)+ca*10,vy:-ca*sd*rnd(20,40)+sa*10,vh:rnd(10,30),grav:1,f:.7,c:[.92,.96,1],s:rnd(2,3.5)*big,g:6,d:rnd(.4,.7),a:.6});}}
      e.lx=e.x;e.ly=e.y;}}catch(err){if(!e._drawErr){e._drawErr=1;console.warn('draw skipped',e.kind,err);}}}
  for(const [id,o] of OBJ)if(!live.has(id)){SCN.remove(o);OBJ.delete(id);}
  if(G.fieldObj)G.fields.forEach((f,i)=>{const v=G.fieldObj[i];if(!v)return;const k=Math.ceil(v.n*Math.max(0,f.amt)/(f.amt0||9000));v.items.forEach((it,j)=>it.visible=j<k);});
  if(G.sceneryPos)for(const [sx,sy,k,wx,wy] of G.sceneryPos){if(k!==2||wx==null||Math.random()>dt*5||!inView(sx,sy,.2))continue;part({x:wx+rnd(-3,3),y:wy+rnd(-3,3),h:groundH(wx,wy)+10,vx:2,rise:rnd(40,52),c:C_SMOKE,c2:[.5,.48,.45],ck:.35,s:rnd(4,6),g:7,d:rnd(3,4),a:.2});}
  if(G.oilObj)G.oil.forEach((o,i)=>{const v=G.oilObj[i];const ph=G.t*1.6+i;
    if(o.dead!==v.wasDead){v.wasDead=o.dead;v.grp.rotation.x=o.dead?.32:0;v.grp.rotation.z=o.dead?-.22:0;v.grp.position.y=groundH(o.x,o.y)-(o.dead?5:0);v.grp.traverse(c=>{if(c.isMesh&&c.material&&c.material.color){if(!c.userData.oc)c.userData.oc=c.material.color.clone();if(c.material===MAT.std)return;c.material=c.material.clone();c.material.color.copy(o.dead?c.userData.oc.clone().multiplyScalar(.22):c.userData.oc);}});if(o.dead&&typeof scorch==='function')scorch(o.x,o.y,34);}
    if(o.dead){const gh=groundH(o.x,o.y);if(inView(o.x,o.y,.2)){const k=o.burn>0?1:.25;if(Math.random()<dt*14*k)part({x:o.x+rnd(-10,10),y:o.y+rnd(-10,10),h:gh+rnd(4,14),vh:rnd(10,30),rise:rnd(14,24),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(5,11),g:-2,d:rnd(.4,.8),a:.9});
      if(Math.random()<dt*9*k)part({x:o.x+rnd(-8,8),y:o.y+rnd(-8,8),h:gh+16,vx:4,rise:rnd(30,44),c:C_DARK,c2:[.3,.29,.27],ck:.35,s:rnd(8,13),g:14,d:rnd(3.5,5),a:.55});}return;}
    {const dry=o.res0&&o.res<=0;if(dry!==!!v.wasDry){v.wasDry=dry;v.grp.traverse(c=>{if(c.isMesh&&c.material&&c.material.color&&c!==v.flag){if(!c.userData.oc)c.userData.oc=c.material.color.clone();if(c.material===MAT.std)return;if(!c.userData.ownM){c.material=c.material.clone();c.userData.ownM=1;}c.material.color.copy(dry?c.userData.oc.clone().multiplyScalar(.55):c.userData.oc);}});}if(dry){v.arm.rotation.z=.18;return;}}
    v.arm.rotation.z=Math.sin(ph)*.24;if(v.crank)v.crank.rotation.z=ph+Math.PI/2;v.flag.material.color.set(o.owner>=0?G.teams[o.owner].color:'#8a8a80');if(o.owner>=0&&Math.random()<dt*1.5)part({x:o.x+10,y:o.y+6,h:groundH(o.x,o.y)+12,rise:12,c:C_DARK,s:4,g:6,d:1.5,a:.35});});
  // selection rings
  while(RINGS.length<G.sel.length){const m=new THREE.Mesh(new THREE.RingGeometry(.86,1,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x8af0a6,transparent:true,opacity:.85,depthWrite:false}));m.renderOrder=3;SCN.add(m);RINGS.push(m);}
  RINGS.forEach((m,i)=>{const e=G.sel[i];if(!e||e.dead){m.visible=false;return;}m.visible=true;m.material.color.setHex(e.isB?0x8af0a6:(e.st>=2?(e.st===2?0x6fb4ff:0xffb347):0x8af0a6));const r=e.isB?e.size*.75:e.r+6;m.scale.set(r,1,r);m.position.set(e.x,groundH(e.x,e.y)+1.2,e.y);});
  // rally flag
  const T=G.teams[ME];if(T&&T.rally){if(!RALLY){RALLY=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,24,5),new THREE.MeshBasicMaterial({color:0x2a2b26}));pole.position.y=12;RALLY.add(pole);const fl=new THREE.Mesh(new THREE.PlaneGeometry(12,7),new THREE.MeshBasicMaterial({color:0x74d08f,side:THREE.DoubleSide}));fl.position.set(6,20,0);RALLY.add(fl);SCN.add(RALLY);}
    RALLY.visible=true;RALLY.position.set(T.rally.x,groundH(T.rally.x,T.rally.y),T.rally.y);RALLY.children[1].rotation.y=Math.sin(G.t*3)*.3;}else if(RALLY)RALLY.visible=false;
  // placement ghost
  if(G.place){if(GHOSTK!==G.place){if(GHOST)SCN.remove(GHOST);GHOST=makeGhost(G.place);GHOST.scale.setScalar(BSC);GHOSTK=G.place;}const w=screenToWorld(mouse.x,mouse.y);if(w){const ok=validSpot(ME,G.place,w.x,w.y);G.placeWhy=ok?(ok===2?'dz':''):validSpot.why;GHOST.visible=true;GHOST.position.set(w.x,groundH(w.x,w.y),w.y);
    GHOST.traverse(c=>{if(c.isMesh&&c!==GHOST.userData.ring)c.material=ok?MAT.ghostOk:MAT.ghostBad;});const rg=STRUCT[G.place].rng||0;GHOST.userData.ring.visible=!!rg;GHOST.userData.ring.scale.set(rg/BSC,1,rg/BSC);GHOST.userData.ring.position.y=2;}}
  else if(GHOST){SCN.remove(GHOST);GHOST=null;GHOSTK=null;}
  // pings
  for(const p of PINGS){if(!p.m){p.m=new THREE.Mesh(new THREE.RingGeometry(.9,1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:p.c,transparent:true,depthWrite:false}));p.m.position.set(p.x,groundH(p.x,p.y)+3,p.y);SCN.add(p.m);}
    const k=p.t/p.d;p.m.scale.setScalar(p.r*(.2+k*.8));p.m.material.opacity=1-k;if(k>=.98){SCN.remove(p.m);}}
}
function updateFog(){const c=FOGC.b.getContext('2d'),W=FOGC.width,H=FOGC.height,sx=W/MAPW,sy=H/MAPH;c.globalCompositeOperation='source-over';c.fillStyle='rgb(212,212,212)';c.fillRect(0,0,W,H);
  const hole=(x,y,R)=>{const g=c.createRadialGradient(x*sx,y*sy,R*sx*.5,x*sx,y*sy,R*sx);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.arc(x*sx,y*sy,R*sx,0,7);c.fill();};
  {const sk=(G.teams[ME].F.mods.sight||1)*1.08;for(const e of G.ents)if(e.team===ME&&!e.dead)hole(e.x,e.y,(!e.isB&&e.s.vis?e.s.vis:e.isB?340:e.s.dom==='air'?340:e.s.dom==='naval'?380:280)*sk);}
  for(const r of (G.teams[ME].reveals||[]))hole(r.x,r.y,r.r);c.globalCompositeOperation='source-over';const f=FOGC.getContext('2d');f.filter='blur(4px)';f.drawImage(FOGC.b,0,0);f.filter='none';FOGT.needsUpdate=true;}
const SHORTN={inf:'INF',at:'AT',aa:'AA',tank:'TANK',arty:'ARTY',apc:'APC',hero:'HERO',hacker:'HACK',dozer:'DOZER',demo:'DEMO',sniper:'SNIPER',mlrs:'MLRS',ifv:'IFV'};
function drawHUD(){const c=hx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,VW,VH);
  for(const e of G.ents){if(e.dead||!vis(e))continue;const sel=G.sel.includes(e);if(SET.hp!=='all'&&!sel&&e.hp>=e.max&&!(e.rank>0)&&!(e.isB&&e.built<1)&&!e.hacking&&!e.planting&&!(e.building&&e.team===ME)&&!((e.supp||0)>.5&&e.team===ME)&&!(e.rout>G.t||e.routV)&&!(e.team===ME&&!e.isB&&(()=>{const m=moraleOf(e);return m&&m.v<.995;})())&&!(e.team===ME&&G.sqOf&&G.sqOf[e.id])&&!(e.mark>G.t||e.markV))continue;
    const top=e.isB?BH[e.kind]+8:entHeightMid(e)+(e.s.dom==='air'?14:16);const p=toScreen(e.x,unitH(e)+top,e.y);if(p.z>1||p.x<-40||p.y<-40||p.x>VW+40||p.y>VH+40)continue;
    const w=Math.max(18,Math.min(90,(e.isB?e.size:e.r*2.6)*PPU));
    if(sel||e.hp<e.max||SET.hp==='all'){const f=Math.max(0,e.hp/e.max);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-w/2-1,p.y-1,w+2,5);c.fillStyle=f>.5?'#74d08f':f>.25?'#e3b341':'#ea5a40';c.fillRect(p.x-w/2,p.y,w*f,3);c.fillStyle='rgba(0,0,0,.45)';for(let i=1;i<5;i++)c.fillRect(p.x-w/2+w*i/5,p.y,1,3);}
    if(e.aband&&!e.isB){c.font='bold 10px system-ui,sans-serif';c.textAlign='center';c.fillStyle='rgba(0,0,0,.7)';c.fillText('ABANDONED',p.x+1,p.y-4);c.fillStyle=ally(e.team,ME)?'#e3b341':'#ffd166';c.fillText('ABANDONED',p.x,p.y-5);c.textAlign='left';}
    {const mo=!e.isB?moraleOf(e):null;if(mo&&(sel||mo.v<.995||mo.st==='fearless'&&e.team===ME&&sel||mo.st==='routing')&&(ally(e.team,ME)||sel||mo.v<.66)){const y=p.y+(sel||e.hp<e.max||SET.hp==='all'?5:0);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-w/2-1,y-1,w+2,4);c.fillStyle=MOR_COL[mo.st];c.fillRect(p.x-w/2,y,Math.max(2,w*mo.v),2);if(mo.st==='fearless'){c.fillStyle='#5fd38a';c.beginPath();c.arc(p.x+w/2+5,y+1,2.2,0,7);c.fill();}}}
    if(!e.isB&&e.team===ME&&G.sqOf&&G.sqOf[e.id]){const q=G.sqOf[e.id];c.fillStyle='rgba(0,0,0,.7)';c.fillRect(p.x-w/2-13,p.y-3,10,10);c.fillStyle='#e3b341';c.font='700 10px IBM Plex Mono, monospace';c.textAlign='center';c.fillText(q,p.x-w/2-8,p.y+5);}
    if(e.rank>0){c.fillStyle='#f2c94c';c.strokeStyle='rgba(0,0,0,.7)';c.lineWidth=1;for(let i=0;i<e.rank;i++){const x=p.x+w/2+4,y=p.y+4-i*4;c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y-3);c.lineTo(x+8,y);c.lineTo(x+8,y+2);c.lineTo(x+4,y-1);c.lineTo(x,y+2);c.closePath();c.fill();c.stroke();}}
    if(e.isB&&e.built<1){c.fillStyle='#000';c.fillRect(p.x-w/2,p.y+7,w,4);c.fillStyle='#e3b341';c.fillRect(p.x-w/2,p.y+7,w*e.built,4);if(e.stall&&e.team===ME){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('WAITING FOR CONSTRUCTION VEHICLE',p.x,p.y+24);}}
    if(!e.isB&&e.team!==ME&&(e.mark>G.t||e.markV)){c.strokeStyle='#ea5a40';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y-14,6,0,7);c.moveTo(p.x-9,p.y-14);c.lineTo(p.x+9,p.y-14);c.moveTo(p.x,p.y-23);c.lineTo(p.x,p.y-5);c.stroke();}
    {const rt=MODE==='client'?e.routV:e.rout>G.t,sh=!rt&&(MODE==='client'?e.shakV:(!e.isB&&e.s&&canRout(e)&&(e.fear||0)>courageOf(e)*.65));
     if(!e.isB&&rt){c.font='700 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle=ally(e.team,ME)?'#ea5a40':'#f2c94c';c.fillText('ROUTING',p.x,p.y-6);}
     else if(!e.isB&&e.team===ME&&sh){c.font='600 10px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('SHAKEN',p.x,p.y-6);}
     else if(!e.isB&&e.team===ME&&(e.supp||0)>.5){c.font='600 10px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#ea5a40';c.fillText('SUPPRESSED',p.x,p.y-6);}}
    if(e.kind==='dozer'&&e.building&&e.team===ME){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#e3b341';c.fillText('BUILDING',p.x,p.y-6);}
    if(e.hacking||e.planting){c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle=e.planting?'#ea5a40':'#74d08f';c.fillText(e.planting?'PLANTING':(e.order&&e.order.type==='hack'||e.hk)?'HACKING':'+$ ONLINE',p.x,p.y-6);}}
  {const T=G.teams[ME];if(T){const n=MODE==='client'?(T.tunN|0):(T.tun||[]).length,K=MODE==='client'?(T.tunK||{}):tunKinds(T);
   for(const e of G.ents){if(e.dead||e.team!==ME||e.kind!=='tunnel'||e.built<1)continue;const p=toScreen(e.x,groundH(e.x,e.y)+BH.tunnel+14,e.y);if(p.z>1||p.x<-80||p.y<-40||p.x>VW+80||p.y>VH+40)continue;
     const parts=Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>v+' '+(SHORTN[k]||k.toUpperCase()));const t1='TUNNEL '+n+'/'+TUN_CAP,t2=n?parts.join(' · '):'empty';
     c.font='700 12px Saira Condensed, sans-serif';const w1=c.measureText(t1).width;c.font='500 10px IBM Plex Mono, monospace';const w2=c.measureText(t2).width;const W=Math.max(w1,w2)+14,H=n?31:29;
     c.fillStyle='rgba(8,12,10,.82)';c.fillRect(p.x-W/2,p.y-H,W,H);c.strokeStyle=n>=TUN_CAP?'#ea5a40':n?'#74d08f':'#55655c';c.lineWidth=1.5;c.strokeRect(p.x-W/2+.5,p.y-H+.5,W-1,H-1);
     c.fillStyle=n>=TUN_CAP?'#ea5a40':'#e8efe9';c.textAlign='center';c.font='700 12px Saira Condensed, sans-serif';c.fillText(t1,p.x,p.y-H+13);c.font='500 10px IBM Plex Mono, monospace';c.fillStyle=n?'#b9d8c2':'#7f8f86';c.fillText(t2,p.x,p.y-H+25);
     c.fillStyle='rgba(0,0,0,.5)';c.fillRect(p.x-W/2+3,p.y-3,W-6,2);c.fillStyle=n>=TUN_CAP?'#ea5a40':'#74d08f';c.fillRect(p.x-W/2+3,p.y-3,(W-6)*n/TUN_CAP,2);}}}
  // garrison prompt: with infantry selected, outline the city building under the cursor and say how many fit
  {const inf=G.sel.some(u=>!u.isB&&u.team===ME&&!u.dead&&typeof canGarrison==='function'&&canGarrison(u));if(inf&&!G.place&&!G.aim){const now=performance.now();if(now-(drawHUD.ht||0)>90){drawHUD.ht=now;const w=screenToWorld(mouse.x,mouse.y);drawHUD.hc=civUnder(mouse.x,mouse.y,w);}
    const cv=drawHUD.hc;if(cv&&!cv.dead){const own=cv.g&&!cv.g.dead,mine=own&&ally(cv.g.team,ME),enemy=own&&!mine;const n=MODE==='client'?(own?(cv.g.occN|0):0):cv.occ.length,cap=cv.cap;const bh=cv.h,g0=groundH(cv.x,cv.y),hw=CELL/2;
      const pts=[[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]].map(([dx,dy])=>toScreen(cv.x+dx,g0+bh+1,cv.y+dy));const pb=[[-hw,-hw],[hw,-hw],[hw,hw],[-hw,hw]].map(([dx,dy])=>toScreen(cv.x+dx,g0,cv.y+dy));
      c.strokeStyle=enemy?'#ea5a40':n>=cap?'#e3b341':'#74d08f';c.lineWidth=2;c.setLineDash([]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();for(let i=0;i<4;i++){c.beginPath();c.moveTo(pts[i].x,pts[i].y);c.lineTo(pb[i].x,pb[i].y);c.stroke();}
      const top=pts.reduce((a,p)=>p.y<a.y?p:a,pts[0]);const t=enemy?'ENEMY-HELD BUILDING':n>=cap?'BUILDING FULL '+n+'/'+cap:'CLICK TO GARRISON  '+n+'/'+cap;c.font='700 12px Saira Condensed, sans-serif';const tw=c.measureText(t).width+12;c.fillStyle='rgba(8,12,10,.85)';c.fillRect(top.x-tw/2,top.y-24,tw,17);c.fillStyle=c.strokeStyle;c.textAlign='center';c.fillText(t,top.x,top.y-11);}}}
  // own garrisons: troop count over the building
  for(const e of G.ents){if(e.dead||e.kind!=='garrison'||!ally(e.team,ME))continue;const cv=civAtXYAny(e.x,e.y);const bh=cv?cv.h:20;const p=toScreen(e.x,groundH(e.x,e.y)+bh+22,e.y);if(p.z>1||p.x<-40||p.y<-40||p.x>VW+40||p.y>VH+40)continue;const n=MODE==='client'?(e.occN|0):(cv?cv.occ.length:0),cap=MODE==='client'?(e.capN|0):(cv?cv.cap:0);
    const t='GARRISON '+n+'/'+cap;c.font='700 11px Saira Condensed, sans-serif';const tw=c.measureText(t).width+10;c.fillStyle='rgba(8,12,10,.8)';c.fillRect(p.x-tw/2,p.y-13,tw,15);c.fillStyle=e.team===ME?'#74d08f':'#7fb6e8';c.textAlign='center';c.fillText(t,p.x,p.y-2);}
  for(const m of (G.mines||[])){if(m.team!==ME)continue;const p=toScreen(m.x,groundH(m.x,m.y)+1,m.y);if(p.z>1||p.x<-10||p.y<-10||p.x>VW+10||p.y>VH+10)continue;c.strokeStyle='#e3b341';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,4,0,7);c.stroke();c.fillStyle='rgba(20,20,16,.85)';c.beginPath();c.arc(p.x,p.y,2.5,0,7);c.fill();}
  {const now=performance.now();c.textAlign='center';c.font='700 13px Saira Condensed, sans-serif';for(let i=FLOATS.length-1;i>=0;i--){const f=FLOATS[i],k=(now-f.t0)/1100;if(k>=1){FLOATS.splice(i,1);continue;}const p=toScreen(f.x,groundH(f.x,f.y)+26+k*26,f.y);if(p.z>1)continue;c.globalAlpha=1-k*k;c.fillStyle='rgba(0,0,0,.6)';c.fillText(f.s,p.x+1,p.y+1);c.fillStyle=f.c;c.fillText(f.s,p.x,p.y);}c.globalAlpha=1;}
  for(const o of G.oil){const p=toScreen(o.x,groundH(o.x,o.y)+48,o.y);if(p.z>1)continue;let cp=0,t=-1;o.cp.forEach((q,k)=>{if(q>cp){cp=q;t=k;}});
    if(o.res0&&!o.dead&&inView(o.x,o.y,.05)){const r=Math.max(0,o.res/o.res0);c.textAlign='center';if(r<=0){c.font='700 12px Saira Condensed, sans-serif';c.fillStyle='rgba(0,0,0,.6)';c.fillRect(p.x-22,p.y+14,44,15);c.fillStyle='#b9b2a2';c.fillText('DRY',p.x,p.y+26);}else{c.fillStyle='rgba(0,0,0,.72)';c.fillRect(p.x-26,p.y+14,52,15);c.fillStyle=r<.2?'#ea5a40':r<.5?'#e3b341':'#c9a24a';c.fillRect(p.x-25,p.y+25,50*r,3);c.font='600 10px IBM Plex Mono, monospace';c.fillStyle='#e8e2cf';c.fillText('OIL '+Math.ceil(r*100)+'%',p.x,p.y+23);}}
    if(!o.dead&&o.hp<o.max){const f=Math.max(0,o.hp/o.max);c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-25,p.y+8,50,5);c.fillStyle=f>.5?'#74d08f':f>.25?'#e3b341':'#ea5a40';c.fillRect(p.x-24,p.y+9,48*f,3);}
    if(cp<=0||t<0)continue;const need=o.dead?12:6;c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-25,p.y-1,50,6);c.fillStyle=G.teams[t].color;c.fillRect(p.x-24,p.y,48*Math.min(1,cp/need),4);c.font='600 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillStyle='#fff';c.fillText(o.dead?'REPAIRING':'CAPTURING',p.x,p.y-4);}
  for(const m of MARKERS){const p=toScreen(m.x,groundH(m.x,m.y),m.y);if(p.z>1)continue;c.font='700 13px IBM Plex Mono, monospace';c.textAlign='center';c.fillStyle='#ea5a40';if(m.t>0)c.fillText(m.t.toFixed(1),p.x,p.y+4);}
  {const posts=new Map();for(const u of G.sel)if(u.defend&&u.team===ME&&!u.dead){const k=(u.defend.x|0)+','+(u.defend.y|0);if(!posts.has(k))posts.set(k,u.defend);}for(const D of posts.values()){c.strokeStyle='rgba(111,178,255,.75)';c.lineWidth=1.5;c.setLineDash([6,5]);c.beginPath();for(let i=0;i<=40;i++){const a=i/40*6.2832,p=toScreen(D.x+Math.cos(a)*D.r,groundH(D.x+Math.cos(a)*D.r,D.y+Math.sin(a)*D.r)+2,D.y+Math.sin(a)*D.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);const p=toScreen(D.x,groundH(D.x,D.y)+3,D.y);c.fillStyle='#6fb2ff';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('🛡 DEFEND',p.x,p.y);c.textAlign='left';}}
  {const seen=new Set();for(const u of G.sel){if(u.team!==ME||u.dead||u.isB||!u.wq||!u.wq.length||!u.order)continue;let a=toScreen(u.order.x,groundH(u.order.x,u.order.y)+2,u.order.y);c.strokeStyle='rgba(227,179,65,.7)';c.lineWidth=1.2;c.setLineDash([4,4]);c.beginPath();c.moveTo(a.x,a.y);for(const q of u.wq){const b=toScreen(q.x,groundH(q.x,q.y)+2,q.y);c.lineTo(b.x,b.y);}c.stroke();c.setLineDash([]);for(const q of u.wq){const k=(q.x|0)+','+(q.y|0);if(seen.has(k))continue;seen.add(k);const b=toScreen(q.x,groundH(q.x,q.y)+2,q.y);c.fillStyle='#e3b341';c.beginPath();c.arc(b.x,b.y,3.5,0,7);c.fill();}}}
  if(typeof RDRAG!=='undefined'&&RDRAG&&RDRAG.moved&&(!RDRAG.gen||RDRAG.line)){const w1=screenToWorld(mouse.x,mouse.y);if(w1){const n=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead).length,a=toScreen(RDRAG.w0.x,groundH(RDRAG.w0.x,RDRAG.w0.y)+2,RDRAG.w0.y),b=toScreen(w1.x,groundH(w1.x,w1.y)+2,w1.y);
    c.strokeStyle=RDRAG.am?'rgba(234,90,64,.9)':'rgba(116,208,143,.9)';c.lineWidth=2;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.fillStyle=c.strokeStyle;
    for(let i=0;i<Math.min(n,40);i++){const t=n>1?i/(n-1):.5,x=RDRAG.w0.x+(w1.x-RDRAG.w0.x)*t,y=RDRAG.w0.y+(w1.y-RDRAG.w0.y)*t,p=toScreen(x,groundH(x,y)+2,y);c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill();}}}
  if(drag&&drag.box){c.strokeStyle='#8af0a6';c.lineWidth=1;c.fillStyle='rgba(116,208,143,.1)';const x=Math.min(drag.x0,mouse.x),y=Math.min(drag.y0,mouse.y);c.fillRect(x,y,Math.abs(mouse.x-drag.x0),Math.abs(mouse.y-drag.y0));c.strokeRect(x+.5,y+.5,Math.abs(mouse.x-drag.x0),Math.abs(mouse.y-drag.y0));}
  if(G.aim){const w=screenToWorld(mouse.x,mouse.y);if(w){const r=G.aim==='sup'?G.teams[ME].sup.r+G.teams[ME].sup.spread:(powInfo(G.aim,G.teams[ME].fac).r||60);c.strokeStyle='#ea5a40';c.lineWidth=1.5;c.setLineDash([6,4]);c.beginPath();
    for(let i=0;i<=40;i++){const a=i/40*6.28,p=toScreen(w.x+Math.cos(a)*r,groundH(w.x,w.y),w.y+Math.sin(a)*r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);}}
  if(flash>0){c.fillStyle=`rgba(255,236,210,${flash*.45})`;c.fillRect(0,0,VW,VH);}}
// Tactical minimap: desaturated terrain with contour-style mountains, grid squares (A-H / 1-6), fog of war,
// unit symbols by type (dot infantry, square armour, triangle aircraft, hull ships), contact flashes where your units
// are taking fire, strike warning rings, squad tags, a radar sweep and a bracketed camera box.
const MMG={cols:8,rows:6};
function mmBase(){const W=mm.width,H=mm.height,sx=W/MAPW,sy=H/MAPH;const c=document.createElement('canvas');c.width=W;c.height=H;const q=c.getContext('2d');
  q.drawImage(G.thumb,0,0,W,H);q.globalCompositeOperation='saturation';q.fillStyle='hsla(0,0%,50%,.62)';q.fillRect(0,0,W,H);q.globalCompositeOperation='multiply';q.fillStyle='#7f9a8e';q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over';
  const id=q.getImageData(0,0,W,H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const wx=(i+.5)/sx,wy=(j+.5)/sy,k=(j*W+i)*4;const e=G.map.edge?G.map.edge(wx,wy):-99;
    if(e>0){const d=Math.min(1,e/120);id.data[k]=18+10*(1-d);id.data[k+1]=52+16*(1-d);id.data[k+2]=66+18*(1-d);continue;}
    if(e>-10){id.data[k]=150;id.data[k+1]=170;id.data[k+2]=150;continue;}
    const mt=G.map.mtn?G.map.mtn(wx,wy):0;if(mt>0){const band=Math.floor(mt/22)%2,hat=((i+j)%4===0);const v=band?.78:.62;id.data[k]*=v;id.data[k+1]*=v;id.data[k+2]*=v;if(hat){id.data[k]=id.data[k+1]=id.data[k+2]=40;}}}
  q.putImageData(id,0,0);
  q.fillStyle='rgba(205,190,150,.85)';for(const b of G.map.bridges){q.save();q.translate(b.x*sx,b.y*sy);q.rotate(Math.atan2(b.n[1]*sy,b.n[0]*sx));q.fillRect(-b.h*sx,-2,b.h*2*sx,4);q.restore();}
  q.strokeStyle='rgba(180,230,200,.16)';q.lineWidth=1;q.beginPath();for(let i=1;i<MMG.cols;i++){const x=Math.round(i*W/MMG.cols)+.5;q.moveTo(x,0);q.lineTo(x,H);}for(let j=1;j<MMG.rows;j++){const y=Math.round(j*H/MMG.rows)+.5;q.moveTo(0,y);q.lineTo(W,y);}q.stroke();
  q.font='600 9px IBM Plex Mono, monospace';q.fillStyle='rgba(190,235,205,.55)';q.textBaseline='top';for(let i=0;i<MMG.cols;i++)q.fillText('ABCDEFGH'[i],i*W/MMG.cols+3,2);for(let j=1;j<MMG.rows;j++)q.fillText(String(j+1),2,j*H/MMG.rows+2);
  return c;}
function mmGrid(x,y){return 'ABCDEFGH'[Math.max(0,Math.min(7,Math.floor(x/MAPW*MMG.cols)))]+(Math.max(0,Math.min(5,Math.floor(y/MAPH*MMG.rows)))+1);}
const MMC=[];let mmFogT=0;
// Electronic warfare on the minimap (view only). Where an enemy jamming truck covers our units the minimap there turns
// to static and hides every contact under it; radar-spoof ghosts show as enemy armour moving toward us. A working
// Strike Center sees through them: drawn faded with a "?". Our own spoof's ghosts show as faint outlines.
function ewMine(){return MODE==='client'?G.ewv:(typeof ewView==='function'&&G.teams[ME]?ewView(ME):null);}
function mmEW(c,sx,sy,now){const V=ewMine();if(!V)return;const el=G.t-(V.rt||G.t);
  for(const [x,y,r] of V.j||[]){const X=x*sx,Y=y*sy,R=Math.max(6,r*sx);c.save();c.beginPath();c.arc(X,Y,R,0,7);c.clip();c.fillStyle='#0d110f';c.fillRect(X-R,Y-R,R*2,R*2);
    const f=(now*12)|0;for(let i=0;i<70;i++){const h=((i*2654435761+f*40503)>>>0)%10007,px=X-R+(h%97)/97*R*2,py=Y-R+((h/97|0)%103)/103*R*2,v=60+(h%7)*22;c.fillStyle=`rgb(${v},${v+8},${v})`;c.fillRect(px,py,1.6,1.2);}
    c.fillStyle='rgba(150,170,160,.18)';for(let k=0;k<4;k++){const yy=Y-R+((f*3+k*37)%100)/100*R*2;c.fillRect(X-R,yy,R*2,1);}c.restore();
    c.strokeStyle='rgba(234,90,64,.7)';c.lineWidth=1;c.setLineDash([2,2]);c.beginPath();c.arc(X,Y,R,0,7);c.stroke();c.setLineDash([]);
    if(R>12){c.font='700 8px IBM Plex Mono, monospace';c.fillStyle='rgba(234,90,64,.9)';c.textAlign='center';c.fillText('JAM',X,Y+3);c.textAlign='left';}}
  for(const q of V.g||[]){if(q[4]-el<=0)continue;const x=(q[0]+q[2]*el)*sx,y=(q[1]+q[3]*el)*sy,col=(G.teams[q[6]]||{}).color||'#ea5a40';
    if(q[5]===2){c.strokeStyle=col;c.globalAlpha=.45;c.lineWidth=1;c.setLineDash([2,1.5]);c.strokeRect(x-2.7,y-2.7,5.4,5.4);c.setLineDash([]);c.globalAlpha=1;continue;}
    if(q[5]===1){c.globalAlpha=.35;c.fillStyle=col;c.fillRect(x-2.2,y-2.2,4.4,4.4);c.globalAlpha=1;c.font='700 8px IBM Plex Mono, monospace';c.fillStyle='#e3b341';c.fillText('?',x+3,y-2);continue;}
    c.fillStyle=col;c.strokeStyle='#050807';c.lineWidth=1;c.fillRect(x-2.2,y-2.2,4.4,4.4);c.strokeRect(x-2.7,y-2.7,5.4,5.4);}}
// command-card button for the EW truck's radar spoof (08-ui puts it on the card; works by click or tap)
function spoofBtn(u){const V=ewMine(),cd=MODE==='client'?((V&&V.cd||[]).find(r=>r[0]===u.id)||[0,0])[1]-(G.t-((V&&V.rt)||G.t)):(u.spfT||0)-G.t;
  const b=document.createElement('button');b.className='btn wide';b.style.marginTop='6px';const left=Math.ceil(cd);
  b.textContent=left>0?'📡 Radar spoof (ready in '+left+' s)':'📡 Radar spoof';b.disabled=left>0;
  b.title='For 20 seconds 3-4 fake contacts appear on enemy radar near this truck and move toward them like an attacking column. Enemies with a Strike Center see they are fake. Recharges in 60 s.';
  b.onpointerdown=ev=>{ev.preventDefault();if(!b.disabled)doAct({t:'spoof',tid:u.id});};return b;}
function drawMini(){const W=mm.width,H=mm.height,sx=W/MAPW,sy=H/MAPH,now=performance.now()/1000,c=mx;
  if(!G.mmBase)G.mmBase=mmBase();c.drawImage(G.mmBase,0,0);
  // fog of war: hidden ground darker
  if(FOGC){if(!G.mmFog||now-mmFogT>.15){mmFogT=now;const f=G.mmFog||(G.mmFog=document.createElement('canvas'));f.width=W;f.height=H;const q=f.getContext('2d');q.drawImage(FOGC,0,0,W,H);q.globalCompositeOperation='difference';q.fillStyle='#fff';q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over';}
    c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.6;c.drawImage(G.mmFog,0,0);c.restore();}
  // resources
  c.fillStyle='rgba(227,179,65,.8)';for(const f of G.fields)if(f.amt>0)c.fillRect(f.x*sx-1.5,f.y*sy-1.5,3,3);
  for(const o of G.oil){const x=o.x*sx,y=o.y*sy;c.fillStyle='#0b0f0d';c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.closePath();c.fill();c.fillStyle=o.dead?'#5a2a20':(o.res0&&o.res<=0)?'#555852':o.owner>=0?G.teams[o.owner].color:'#9a9a90';c.beginPath();c.moveTo(x,y-3.2);c.lineTo(x+3.2,y);c.lineTo(x,y+3.2);c.lineTo(x-3.2,y);c.closePath();c.fill();}
  // strike warnings
  for(const st of (G.strikes||[])){const x=st.x*sx,y=st.y*sy,r=Math.max(4,st.r*sx);c.strokeStyle=ally(st.team,ME)?'rgba(116,208,143,.9)':'rgba(234,90,64,.95)';c.lineWidth=1.5;c.setLineDash([3,2]);c.beginPath();c.arc(x,y,r,0,7);c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(x-r-3,y);c.lineTo(x+r+3,y);c.moveTo(x,y-r-3);c.lineTo(x,y+r+3);c.stroke();}
  // units and buildings
  const sel=new Set(G.sel);
  for(const e of G.ents){if(e.dead||!vis(e))continue;const x=e.x*sx,y=e.y*sy,col=G.teams[e.team].color,own=e.team===ME;
    if(e.isB){const s=e.kind==='hq'?9:e.kind==='turret'||e.kind==='sam'||e.kind==='tunnel'?5:7;c.fillStyle='#050807';c.fillRect(x-s/2-1.5,y-s/2-1.5,s+3,s+3);c.fillStyle=col;c.fillRect(x-s/2,y-s/2,s,s);if(e.kind==='hq'){c.fillStyle='#050807';c.fillRect(x-1.5,y-1.5,3,3);}if(e.built<1){c.fillStyle='rgba(0,0,0,.45)';c.fillRect(x-s/2,y-s/2,s,s*(1-e.built));}continue;}
    const d=e.s.dom;c.fillStyle=col;c.strokeStyle=own?'rgba(255,255,255,.75)':'#050807';c.lineWidth=1;
    if(d==='air'){const a=e.ang||0;c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(4.5,0);c.lineTo(-3,3);c.lineTo(-1.5,0);c.lineTo(-3,-3);c.closePath();c.fill();c.stroke();c.restore();}
    else if(d==='naval'){const a=e.ang||0;c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(5,0);c.lineTo(1,2.6);c.lineTo(-4,2.2);c.lineTo(-4,-2.2);c.lineTo(1,-2.6);c.closePath();c.fill();c.stroke();c.restore();}
    else if(isInf(e.s)){c.beginPath();c.arc(x,y,1.9,0,7);c.fill();if(!own){c.stroke();}}
    else{c.fillRect(x-2.2,y-2.2,4.4,4.4);c.strokeRect(x-2.7,y-2.7,5.4,5.4);}
    if(sel.has(e)){c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(x,y,4.5,0,7);c.stroke();}
    if(own&&G.t-(e.lastHit||-99)<1.2&&Math.random()<.04)MMC.push({x:e.x,y:e.y,t:now});}
  mmEW(c,sx,sy,now);
  // contact flashes where we're under fire
  for(let i=MMC.length-1;i>=0;i--){const m=MMC[i],a=now-m.t;if(a>1.4){MMC.splice(i,1);continue;}c.strokeStyle=`rgba(255,80,60,${1-a/1.4})`;c.lineWidth=1.5;c.beginPath();c.arc(m.x*sx,m.y*sy,3+a*9,0,7);c.stroke();}
  if(MMC.length>40)MMC.splice(0,MMC.length-40);
  if((performance.now()/250|0)%2){c.fillStyle='#ea5a40';for(const m of MARKERS){c.beginPath();c.arc(m.x*sx,m.y*sy,5,0,7);c.fill();}}
  // squad tags
  if(G.sq)for(let i=1;i<=5;i++){const L=(G.sq[i]||[]).map(id=>G.byId.get(id)).filter(u=>u&&!u.dead);if(!L.length)continue;const x=L.reduce((a,u)=>a+u.x,0)/L.length*sx,y=L.reduce((a,u)=>a+u.y,0)/L.length*sy;c.fillStyle='rgba(5,8,7,.8)';c.fillRect(x+5,y-12,10,10);c.fillStyle='#e3b341';c.font='700 9px IBM Plex Mono, monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(i,x+10,y-6.5);c.textAlign='left';c.textBaseline='alphabetic';}
  // radar sweep
  try{const a=(now*.9)%(Math.PI*2),g=c.createConicGradient(a,W/2,H/2);g.addColorStop(0,'rgba(120,255,170,.16)');g.addColorStop(.08,'rgba(120,255,170,0)');g.addColorStop(1,'rgba(120,255,170,0)');c.fillStyle=g;c.fillRect(0,0,W,H);}catch(_){}
  // camera box with corner brackets
  const pts=[[0,0],[VW,0],[VW,VH],[0,VH]].map(([x,y])=>screenToWorld(x,y));if(pts.every(Boolean)){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x*sx,p.y*sy):c.moveTo(p.x*sx,p.y*sy));c.closePath();c.stroke();
    c.strokeStyle='#e3b341';c.lineWidth=2;for(let i=0;i<4;i++){const p=pts[i],n=pts[(i+1)%4],m=pts[(i+3)%4];const P=[p.x*sx,p.y*sy];const v=(q)=>{const dx=q.x*sx-P[0],dy=q.y*sy-P[1],L=Math.hypot(dx,dy)||1;return[dx/L*6,dy/L*6];};const a1=v(n),a2=v(m);c.beginPath();c.moveTo(P[0]+a1[0],P[1]+a1[1]);c.lineTo(P[0],P[1]);c.lineTo(P[0]+a2[0],P[1]+a2[1]);c.stroke();}}
  // frame + readout
  c.strokeStyle='rgba(190,235,205,.5)';c.lineWidth=2;const k=10;for(const [x,y,dx,dy] of [[1,1,1,1],[W-1,1,-1,1],[1,H-1,1,-1],[W-1,H-1,-1,-1]]){c.beginPath();c.moveTo(x+dx*k,y);c.lineTo(x,y);c.lineTo(x,y+dy*k);c.stroke();}
  const cw=screenToWorld(VW/2,VH/2);const vis2=G.ents.filter(e=>!e.dead&&e.team!==ME&&!ally(e.team,ME)&&!e.isB&&vis(e)).length;c.font='600 9px IBM Plex Mono, monospace';const txt=(cw?'GRID '+mmGrid(cw.x,cw.y)+'  ':'')+'CONTACTS '+vis2;const tw=c.measureText(txt).width;c.fillStyle='rgba(5,8,7,.75)';c.fillRect(W-tw-10,H-15,tw+8,13);c.fillStyle='#bfe9cd';c.textBaseline='alphabetic';c.fillText(txt,W-tw-6,H-5);}
function renderFrame(dt){if(!G||!G.terrain||!R3||window.GLLOST)return;if(WRECKQ.length)wreckTick();if(G.civDirty&&performance.now()-(G.civRb||0)>400){G.civDirty=false;G.civRb=performance.now();try{buildCity();}catch(e){console.warn(e);}}try{droneAudio(dt);}catch(_){}if(window.SKY)SKY.material.uniforms.t.value=G.t;if(window.WINDU)WINDU.value=performance.now()/1000;syncScene(dt);fxUpdate(dt);placeCam();WATER.material.uniforms.t.value=G.t;WATER.material.uniforms.cpos.value.copy(CAM.position);
  fogT-=dt;if(fogT<=0){fogT=.12;updateFog();}renderPost();drawHUD();{const w=performance.now();if(!(w-(G.mmT||0)<33)){G.mmT=w;drawMini();}}}  // minimap at ~30 Hz (it was redrawn every frame, up to 240x a second)

