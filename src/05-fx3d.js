/* ================= 3D EFFECTS: particles, tracers, projectiles, decals, wrecks ================= */
const PMAX=3500;const SHOCKS=[],FIRES=[];let shockI=0;
const NFL={x:0,y:0,hot:-99,cd:6};function FXE_flare(x,y){FLARES.push({x,y,r:260,d:16,t:0,acc:0});if(FLARES.length>6)FLARES.shift();}
let PN_=null,PA_=null,TRC=null,SCORCH=null,TRACKS=null,CRATER=null,crI=0,LIGHTS=[],WLIGHTS=[],MLIGHTS=[],mlI=0,FLARES=[],FLL=[];const COLS=[];
const fxPH=()=>typeof POST!=='undefined'&&!!POST.phone;
const BMIS=[],DEBRIS=[];
// only the live part of a dynamic buffer is uploaded each frame (r159+: addUpdateRange replaces updateRange)
function fxUpd(A,count){if(A.clearUpdateRanges){A.clearUpdateRanges();A.addUpdateRange(0,count);}else{A.updateRange.offset=0;A.updateRange.count=count;}A.needsUpdate=true;}
// chunks of a destroyed structure thrown out by the blast, tumbling and bouncing until they settle
// rock chunks share a few quantised materials (they used to make one material per chunk: up to 110 live ones, never freed)
const CHUNKM=new Map();function chunkMat(col){const q=Math.floor(Math.random()*6),k=col+q;let m=CHUNKM.get(k);if(!m){m=new THREE.MeshStandardMaterial({color:new THREE.Color(col).multiplyScalar(.7+q*.07),roughness:.95});CHUNKM.set(k,m);}return m;}
let CHUNKG=null;function chunks(x,y,size,col,n){if(!inView(x,y,.3))return;if(!CHUNKG)CHUNKG=[0,1,2,3,4].map(i=>rockGeo(40+i*7,0,.6+i*.07,.55));const g0=groundH(x,y);n=Math.round(n*1.6);for(let i=0;i<n&&DEBRIS.length<110;i++){const s=rnd(.025,.07)*size,dk=Math.random()<.35,mm=chunkMat(dk?'#2f2b27':col);const m=new THREE.Mesh(CHUNKG[i%5],mm);m.scale.set(s*rnd(.8,1.5),s*rnd(.5,1),s*rnd(.7,1.3));m.castShadow=true;const a=Math.random()*6.28,r=Math.random()*size*.25;m.position.set(x+Math.cos(a)*r,g0+rnd(4,size*.4),y+Math.sin(a)*r);SCN.add(m);const sp=rnd(30,100);DEBRIS.push({m,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vh:rnd(50,140),wx:rnd(-9,9),wy:rnd(-9,9),wz:rnd(-9,9),t:0,rest:0,chunk:1,sz:s});}
  for(let i=0;i<Math.min(10,4+(size/8|0));i++){const a=rnd(0,6.28),v=rnd(20,70);part({x,y,h:g0+rnd(2,8),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(60,160),c:[.32,.27,.21],s:rnd(.9,1.8),f:.85,grav:1,bounce:1,d:rnd(1,1.8)});}}
function debrisTick(dt){if(!DEBRIS.length)return;let w=0;for(const d of DEBRIS){d.t+=dt;const m=d.m;if(!d.rest){d.vh-=220*dt;m.position.x+=d.vx*dt;m.position.z+=d.vz*dt;m.position.y+=d.vh*dt;m.rotation.x+=d.wx*dt;m.rotation.y+=d.wy*dt;m.rotation.z+=d.wz*dt;
    const g=groundH(m.position.x,m.position.z)+(d.sz?d.sz*.2:1.5);if(m.position.y<g){m.position.y=g;if(Math.abs(d.vh)<25){d.rest=1;}else{d.vh=-d.vh*.32;d.vx*=.55;d.vz*=.55;d.wx*=.5;d.wy*=.5;d.wz*=.5;for(let q=0;q<6;q++)part({x:m.position.x,y:m.position.z,h:g,vx:rnd(-25,25),vy:rnd(-25,25),c:C_DUST,s:rnd(5,9),g:10,d:rnd(.6,1),a:.45});}}
    if(Math.random()<dt*14)part({x:m.position.x,y:m.position.z,h:m.position.y,rise:20,c:C_DARK,s:rnd(4,7),d:rnd(1.2,2),a:.4});}
  if(d.t>(d.chunk?25:40)){SCN.remove(m);if(d.chunk)m.material.dispose();continue;}DEBRIS[w++]=d;}DEBRIS.length=w;}const _bmA=new THREE.Vector3(),_bmB=new THREE.Vector3(),_bmUp=new THREE.Vector3(0,1,0);
const FLOATS=[],PARTS=[],TRACERS=[],VPROJ=[],MARKERS=[],PLANES=[],WRECKS=[],PINGS=[],BODIES=[];let shake=0,flash=0,decI=0,trkI=0,lightI=0;
function mkPoints(blend){const g=new THREE.BufferGeometry(),pos=new Float32Array(PMAX*3),col=new Float32Array(PMAX*3),sz=new Float32Array(PMAX),al=new Float32Array(PMAX);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('pcol',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size',new THREE.BufferAttribute(sz,1).setUsage(THREE.DynamicDrawUsage));g.setAttribute('alpha',new THREE.BufferAttribute(al,1).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.ShaderMaterial({uniforms:{scale:{value:600},smk:{value:smokeTex()},hot:{value:blend===THREE.AdditiveBlending?1.:0.},dep:{value:null},sres:{value:new THREE.Vector2(1,1)},nf:{value:new THREE.Vector2(40,9000)},soft:{value:0},amb:WXAMB},transparent:true,depthWrite:false,blending:blend,
    vertexShader:`uniform float scale;attribute float size;attribute float alpha;attribute vec3 pcol;varying float va;varying vec3 vc;varying float vr;void main(){va=alpha;vc=pcol;vr=fract(position.x*.137+position.z*.291);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(220.,size*scale/-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D smk,dep;uniform float hot,soft;uniform vec2 sres,nf;uniform vec3 amb;float lz(float d){return nf.x*nf.y/(nf.y-(nf.y-nf.x)*d);}varying float va;varying vec3 vc;varying float vr;void main(){vec2 d=gl_PointCoord-.5;float an=vr*6.283;vec2 q=vec2(cos(an)*d.x-sin(an)*d.y,sin(an)*d.x+cos(an)*d.y)+.5;vec2 cell=vec2(step(.5,fract(vr*7.)),step(.5,fract(vr*13.)))*.5;float s=texture2D(smk,cell+clamp(q,0.,1.)*.5).r;float r=length(d)*2.;float a=va*smoothstep(.08,.62,s)*smoothstep(1.,.2,r+(s-.5)*.5);if(soft>.5){float sz=lz(texture2D(dep,gl_FragCoord.xy/sres).x),fz=lz(gl_FragCoord.z);a*=clamp((sz-fz)/16.,0.,1.);}vec3 c=vc*(hot>.5?vec3(1.05+s*.9):(.62+s*.55)*1.5*amb);gl_FragColor=vec4(pow(max(c,0.),vec3(2.2)),a);}`});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=5;SCN.add(p);return{g,pos,col,sz,al,p,m};}
function smokeTex(){if(smokeTex.t)return smokeTex.t;const n=256,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,n,n);
  const id=x.createImageData(n,n);let rn;const mkRn=()=>{rn=[];for(let o=0;o<5;o++){const S=4<<o,a=[];for(let i=0;i<(S+1)*(S+1);i++)a.push(Math.random());rn.push([S,a]);}};
  const vn=(u,v,S,a)=>{const fx=u*S,fy=v*S,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),A=a[iy*(S+1)+ix],B=a[iy*(S+1)+ix+1],C=a[(iy+1)*(S+1)+ix],D=a[(iy+1)*(S+1)+ix+1];return (A*(1-sx)+B*sx)*(1-sy)+(C*(1-sx)+D*sx)*sy;};
  for(let q=0;q<4;q++){mkRn();const ox=(q%2)*128,oy=(q>>1)*128;for(let py=0;py<128;py++)for(let px=0;px<128;px++){const u=px/128,v=py/128;let f=0,amp=.5;for(const [S,a] of rn){f+=vn(u,v,S,a)*amp;amp*=.5;}
      const dx=u-.5,dy=v-.5,r=Math.sqrt(dx*dx+dy*dy)*2;const m=Math.max(0,1-r*r*(1.1-f*.6))*Math.max(0,Math.min(1,(0.92-r)/0.25));const val=Math.max(0,Math.min(1,(f*1.35-.18)))*m;const k=((oy+py)*n+ox+px)*4;id.data[k]=id.data[k+1]=id.data[k+2]=val*255;id.data[k+3]=255;}}
  x.putImageData(id,0,0);
  const t=new THREE.CanvasTexture(c);smokeTex.t=t;return t;}
function initFX(){PN_=mkPoints(THREE.NormalBlending);PA_=mkPoints(THREE.AdditiveBlending);PA_.p.renderOrder=6;
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));tg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));
  TRC=new THREE.LineSegments(tg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));TRC.frustumCulled=false;SCN.add(TRC);
  {const rg=new THREE.RingGeometry(.72,1,48).rotateX(-Math.PI/2);for(let i=0;i<10;i++){const m=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:0xd8ccb4,transparent:true,opacity:0,depthWrite:false}));m.scale.setScalar(.001);m.position.set(0,-500,0);m.renderOrder=2;m.frustumCulled=false;SCN.add(m);SHOCKS.push({m,t:9,d:1,r0:1,r1:1,a0:0,x:0,y:0});}}
  initWash();initWake();
  for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffa860,0,320,2);l.position.set(-999,-999,-999);SCN.add(l);LIGHTS.push(l);}for(let i=0;i<3;i++){const l=new THREE.PointLight(0xff8a3a,0,170,2);l.position.set(-999,-999,-999);SCN.add(l);WLIGHTS.push(l);}
  // muzzle flashes and tracers get their own two short-lived lights on PCs (they used to steal the explosion lights)
  // illumination flares: two cold-white lights on PCs; phones (Low) get only the glow sprite, no dynamic light
  if(!(typeof gfxPhone==='function'&&gfxPhone()))for(let i=0;i<2;i++){const l=new THREE.PointLight(0xdfe8ff,0,520,1.6);l.position.set(-999,-999,-999);SCN.add(l);FLL.push(l);}
  if(!(typeof gfxPhone==='function'&&gfxPhone()))for(let i=0;i<2;i++){const l=new THREE.PointLight(0xffb060,0,140,2);l.position.set(-999,-999,-999);l.userData={d:.06,t:0};SCN.add(l);MLIGHTS.push(l);}}
// a quick orange flash that lights the ground around a firing gun (PC only; the light count is fixed at start-up)
function mlight(x,y,h,k,dist){if(!MLIGHTS.length||!inView(x,y,.05))return;const L=MLIGHTS[mlI++%MLIGHTS.length];L.position.set(x,h+5,y);L.intensity=k*WXFX*LUX;L.distance=dist;L.userData.d=.06;L.userData.t=0;}
function radTex(stops,n=64){const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d'),g=x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);stops.forEach(([o,s])=>g.addColorStop(o,s));x.fillStyle=g;x.fillRect(0,0,n,n);return new THREE.CanvasTexture(c);}
function buildDecals(){for(const d of [SCORCH,TRACKS,CRATER])if(d){SCN.remove(d);}
  const mk=(n,tex,op)=>{const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:op,polygonOffset:true,polygonOffsetFactor:-2}),n);
    for(let i=0;i<n;i++){TMPM.makeScale(0,0,0);m.setMatrixAt(i,TMPM);}m.renderOrder=1;m.frustumCulled=false;SCN.add(m);return m;};
  SCORCH=mk(320,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'rgba(10,8,6,.92)');g.addColorStop(.35,'rgba(18,14,10,.8)');g.addColorStop(.7,'rgba(30,24,16,.35)');g.addColorStop(1,'rgba(30,24,16,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<34;i++){const a=Math.random()*6.283,l=30+Math.random()*30,w=1+Math.random()*3;x.strokeStyle=`rgba(16,12,8,${.25+Math.random()*.35})`;x.lineWidth=w;x.beginPath();x.moveTo(64+Math.cos(a)*10,64+Math.sin(a)*10);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<40;i++){const a=Math.random()*6.283,r=Math.random()*55;x.fillStyle=`rgba(12,10,8,${Math.random()*.6})`;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,1+Math.random()*3,1+Math.random()*3);}
    const t=new THREE.CanvasTexture(c);return t;})(),1);TRACKS=mk(1600,(()=>{const c=document.createElement('canvas');c.width=16;c.height=32;const x=c.getContext('2d');for(let i=0;i<32;i+=4){x.fillStyle='rgba(52,40,26,.75)';x.fillRect(1,i,14,2.2);}const g=x.getImageData(0,0,16,32);for(let i=0;i<16*32;i++){const px=i%16;const e=Math.min(px,15-px)/3;g.data[i*4+3]*=Math.min(1,e);}x.putImageData(g,0,0);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.LinearFilter;return t;})(),.5);
  CRATER=mk(160,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');
    let g=x.createRadialGradient(64,64,0,64,64,62);g.addColorStop(0,'rgba(34,26,18,.95)');g.addColorStop(.32,'rgba(52,40,27,.9)');g.addColorStop(.5,'rgba(92,74,52,.55)');g.addColorStop(.62,'rgba(150,126,92,.6)');g.addColorStop(.72,'rgba(120,98,70,.42)');g.addColorStop(1,'rgba(110,90,64,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<60;i++){const a=Math.random()*6.283,r0=36+Math.random()*8,l=r0+6+Math.random()*20;x.strokeStyle=`rgba(${Math.random()<.5?'70,55,38':'140,118,86'},${.25+Math.random()*.35})`;x.lineWidth=1+Math.random()*2.5;x.beginPath();x.moveTo(64+Math.cos(a)*r0,64+Math.sin(a)*r0);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<70;i++){const a=Math.random()*6.283,r=30+Math.random()*30;x.fillStyle=`rgba(${Math.random()<.5?'60,46,32':'160,136,100'},${.3+Math.random()*.5})`;const z=1+Math.random()*3.5;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,z,z);}
    g=x.createRadialGradient(54,54,0,64,64,40);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    const t=new THREE.CanvasTexture(c);return t;})(),.95);CRATER.renderOrder=2;}
function decal(m,i,x,y,s,r){TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r||0),new THREE.Vector3(s,1,s));m.setMatrixAt(i,TMPM);m.instanceMatrix.needsUpdate=true;}
function scorch(x,y,s){if(!SCORCH)return;decal(SCORCH,decI++%320,x,y,s*2.4,Math.random()*6);}
function crater(x,y,s){if(!CRATER)return;decal(CRATER,crI++%160,x,y,s,Math.random()*6);}
function track(x,y,a){if(!TRACKS)return;const i=trkI++%1600;TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),-(a||0)+Math.PI/2),new THREE.Vector3(4.2,1,9.5));TRACKS.setMatrixAt(i,TMPM);TRACKS.instanceMatrix.needsUpdate=true;}
function pBudget(){const lv=(typeof QUAL!=='undefined'&&fxLv())||0;return [1700,1400,1100,850,650,500][lv]||500;}
// particles that would start well off-screen are skipped (smoke and exhaust from units across the map used CPU and
// ate the particle budget meant for what the player is looking at)
function part(o){if(!inView(o.x,o.y,.4))return;const B=pBudget(),n=PARTS.length;if(n>B){if(!o.add||n>B*1.35)return;}else if(n>B*.6&&!o.add&&Math.random()<(n-B*.6)/(B*.4))return;PARTS.push(Object.assign({vx:0,vy:0,vh:0,t:0,d:1,s:6,g:0,a:1,h:0,c:[.4,.39,.36],add:false,f:.25,rise:0},o));}
const C_SMOKE=[.42,.4,.37],C_DARK=[.13,.12,.11],C_DUST=[.66,.58,.44],C_FIRE=[1,.42,.1],C_FIRE2=[1,.68,.3],C_SPARK=[1,.75,.35];
/* Battle damage on a unit (visual only): a thin grey trickle of smoke from 75% health, thick smoke from 50%, black
   smoke with flames and sparks under 25%. Aircraft leave a smoke trail behind the tail; damaged ships list to one
   side, settle lower in the water and burn on deck. */
function unitDamageFX(e,o,s,gh,dt){if(!inView(e.x,e.y,.1))return;const f=e.hp/e.max,air=s.dom==='air',nav=s.dom==='naval',ca=Math.cos(e.va||0),sa=Math.sin(e.va||0),r=e.r||8,lo=fxPH();
  if(nav&&f<.6){const k=(.6-f)/.6;o.rotation.x+=k*.09*(e.id&1?1:-1);o.position.y-=k*3.5;}
  if(air){const n=f<.25?24:f<.5?13:4;if(Math.random()<dt*n*(lo?.6:1)){const bx=e.x-ca*r*.8+rnd(-1,1),by=e.y-sa*r*.8+rnd(-1,1);
      part({x:bx,y:by,h:gh+rnd(-1,1),rise:rnd(2,6),c:f<.5?C_DARK:C_SMOKE,c2:[.5,.48,.45],ck:.35,s:rnd(2.2,3.4),g:f<.5?7:4,d:rnd(1.8,2.8),a:f<.5?.5:.26});
      if(f<.25&&Math.random()<.6)part({x:bx,y:by,h:gh,add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(2.5,4),g:-1.5,d:rnd(.12,.25)});}return;}
  const hh=gh+(nav?5:7),rate=(f<.25?7:f<.5?2.6:.8)*(lo?.6:1);
  if(Math.random()<dt*rate){const ox=nav?rnd(-r*.5,r*.4):rnd(-3,3),oy=nav?0:rnd(-3,3),x=e.x+ca*ox-sa*oy,y=e.y+sa*ox+ca*oy;
    part({x,y,h:hh+4,rise:rnd(f<.5?34:22,f<.5?48:32),vx:rnd(2,6),c:f<.25?C_DARK:C_SMOKE,c2:[.46,.44,.41],ck:rnd(.25,.4),s:f<.5?rnd(3,5):rnd(1.8,2.8),g:f<.5?6:4,d:rnd(1.6,2.4)*(f<.5?1:.8),a:f<.5?.38:.2});
    if(f<.25&&Math.random()<.55)part({x,y,h:hh,rise:14,add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(3,5)*(nav?1.4:1),g:-3,d:rnd(.2,.4)});
    if(f<.25&&!lo&&Math.random()<.25)for(let q=0;q<3;q++)part({x,y,h:hh,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:.9,f:.6,grav:1,d:rnd(.3,.6)});}}
function inView(x,y,m){if(!CAM)return true;TMP.set(x,0,y).project(CAM);return Math.abs(TMP.x)<1+m&&Math.abs(TMP.y)<1+m;}
// GAME FEEL (q-feel): what a shell hits decides what flies up. Water = a white spray column, a foam ring and drifting mist (no dirt, no
// scorch mark, no lingering dust or smoke column); a road or other hard surface = grey chips, more sparks and pale grey dust; open ground =
// clods and dust in the colour of this map's soil (sand, dark earth or snow). View only, all through the budgeted part() pool.
const SOILC={desert:[[.6,.5,.35],[.47,.38,.26],[.3,.24,.17]],green:[[.42,.33,.22],[.3,.24,.17],[.22,.17,.12]],snow:[[.92,.94,.97],[.74,.76,.8],[.36,.33,.3]],hard:[[.56,.55,.52],[.4,.4,.39],[.27,.27,.26]]};
function impactSurf(x,y){try{if(groundH(x,y)<=(typeof WL==='number'?WL+1:-1e9))return'water';const q=G&&G.roadMask;if(q&&q.f&&q.f[(y/q.C|0)*q.w+(x/q.C|0)]>.3)return'hard';const th=G&&G.map?G.map.theme:'';return th==='snow'?'snow':th==='green'||th==='temperate'?'green':'desert';}catch(_){return'desert';}}
function splashFX(x,y,s,big){const g=(typeof WL==='number'?WL:groundH(x,y))+.5,W=[.86,.9,.95],W2=[.7,.78,.86],n=Math.min(22,8+(s/2|0));
  // the column: fast, narrow, falls back under gravity
  for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(2,s*.5);part({k:'spray',x:x+rnd(-s*.12,s*.12),y:y+rnd(-s*.12,s*.12),h:g+rnd(0,3),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(s*4,s*(big?11:8)),f:.35,grav:1,c:i%3?W:W2,s:rnd(s*.22,s*.42),g:s*.9,d:rnd(.8,1.5),a:.8});}
  // the crown: a ring of low spray thrown outward
  for(let i=0;i<Math.min(16,6+(s/3|0));i++){const a=i/8*3.1416+rnd(-.2,.2),v=rnd(s*1.6,s*3.2);part({k:'spray',x,y,h:g+1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(s*1.2,s*2.6),f:.3,grav:1,c:W,s:rnd(s*.18,s*.32),g:s*.7,d:rnd(.6,1.1),a:.7});}
  // droplets and the mist that hangs and drifts for a few seconds
  for(let i=0;i<Math.min(18,6+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(30,110)*(.5+s/40);part({k:'spray',x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(80,240),c:W,s:rnd(1.2,2.4),f:.8,grav:1,d:rnd(.7,1.4),a:.85});}
  if(s>=12&&!fxPH())for(let i=0;i<5;i++){const a=rnd(0,6.28),r=rnd(0,s*.6);part({k:'spray',x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(3,s*.4),vx:Math.cos(a)*rnd(3,10),vy:Math.sin(a)*rnd(3,10),f:.5,rise:rnd(1,3),c:W,c2:W2,ck:.6,s:rnd(s*.8,s*1.3),g:s*.35,d:rnd(3,5),a:.28});}
  // under the column the sea boils: a dark churned patch swells and fades, and a ring of foam runs outward along the surface
  if(s>=8){const nb=fxPH()?2:4;for(let i=0;i<nb;i++){const a=rnd(0,6.28),r=rnd(0,s*.25);part({k:'boil',x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+.2,f:.9,c:[.1,.15,.19],c2:[.3,.4,.46],ck:.7,s:rnd(s*.7,s*1.05),g:s*.8,d:rnd(1.6,2.6),a:.42});}
    const nr=fxPH()?8:14;for(let i=0;i<nr;i++){const a=i/nr*6.2832+rnd(-.12,.12),v=rnd(s*1.5,s*2.1);part({k:'foam',x:x+Math.cos(a)*s*.3,y:y+Math.sin(a)*s*.3,h:g+.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:.12,c:W,c2:W2,ck:.5,s:rnd(s*.2,s*.34),g:s*.25,d:rnd(1.3,2),a:.55});}}}
function boomFX(x,y,s,big,h=0){sfxBoom(x,y,s,big);const gr=h<4,SF=gr?impactSurf(x,y):'air',wet=SF==='water',grd=gr&&!wet,SC=SOILC[SF]||SOILC.desert,g=wet&&typeof WL==='number'?WL+.5:groundH(x,y)+h,n=Math.min(18,4+(s/5|0)),wk=wet?.45:1;if(wet)splashFX(x,y,s,big);
  if(s<=10&&!big){for(let i=0;i<9;i++){const a=rnd(0,6.28),v=rnd(80,200);part({x,y,h:g+rnd(4,9),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(60,180),add:true,c:i%3?C_SPARK:[3,2.4,1.4],s:rnd(1,1.8),f:.5,grav:1,bounce:1,d:rnd(.25,.6)});}part({x,y,h:g+6,s:s*2.2,d:.06,add:true,c:[3.2,2.4,1.4]});}
  // brief white-hot flash (a blink, not a lingering ball) then a lumpy fireball built of many small rolling puffs
  part({x,y,h:g+s*.3,s:s*.75*wk,d:big?.07:.05,add:true,c:[3.4,2.9,2.1],a:.7});
  {const nl=wet?2:big?9:4;for(let i=0;i<nl;i++){const a=rnd(0,6.28),r=rnd(0,s*.35),v=rnd(2,s*.5);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(s*.1,s*.55),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(6,s*1.2),f:.2,rise:rnd(8,20),add:true,c:[2.6,1.2,.3],c2:[.6,.16,.04],ck:.5,s:rnd(s*.16,s*.3)*wk,g:s*.9*wk,d:rnd(.3,.6),a:.8});}}
  const nf=wet?3:Math.min(16,5+(s/4|0));for(let i=0;i<nf;i++){const a=rnd(0,6.28),r=rnd(0,s*.45),v=rnd(4,s*.9),hot=rnd(.8,1.15);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(1,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(8,s*1.6),f:.15,rise:rnd(6,18),c:[3.4*hot,1.5*hot,.4*hot],c2:wet?[.8,.83,.86]:i%3?[.5,.47,.42]:[.36,.34,.31],ck:rnd(.12,.25),s:rnd(s*.4,s*.7)*wk,g:s*.8,d:rnd(2,3.4),a:.62});}
  for(let i=0;i<(wet?n>>2:n>>1);i++){const a=rnd(0,6.28),v=rnd(10,s*2);part({x,y,h:g+rnd(0,s*.6),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(10,s*1.8),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(s*.15,s*.34)*wk,g:s*.5,d:rnd(.25,.5),a:.5});}
  for(let i=0;i<(wet?n>>1:n);i++){const a=rnd(0,6.28),v=rnd(5,s*.9);part({x:x+rnd(-s*.3,s*.3),y:y+rnd(-s*.3,s*.3),h:g+rnd(2,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,rise:rnd(16,34),c:wet?[.74,.77,.8]:i%4?C_SMOKE:C_DARK,c2:wet?[.88,.9,.92]:[.5,.47,.42],ck:.4,s:rnd(s*.4,s*.7),g:s*.6,d:rnd(2.2,3.8),a:.5});}
  if(grd&&s>8){const C_DIRT=SC[0];for(let i=0;i<Math.min(16,5+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(10,s*1.6);part({x:x+rnd(-3,3),y:y+rnd(-3,3),h:g+2,vx:Math.cos(a)*v*.4,vy:Math.sin(a)*v*.4,vh:rnd(s*3,s*6),f:.5,grav:1,k:'dirt',c:i%2?C_DIRT:SC[1],s:rnd(s*.35,s*.6),g:s*1.1,d:rnd(.9,1.5),a:.75});}
    for(let i=0;i<Math.min(24,8+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(40,140)*(.5+s/40);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(90,260),c:SC[2],s:rnd(1.6,3.2),f:.85,grav:1,bounce:1,d:rnd(1,1.8)});}}
  if(grd)for(let i=0;i<Math.min(14,6+(s/4|0));i++){const a=i/7*3.1416+rnd(-.2,.2),v=rnd(s*2,s*3.5);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:.08,c:SF==='hard'?[.62,.61,.58]:C_DUST,s:rnd(s*.35,s*.55),g:s*.5,d:rnd(1,1.6),a:.45});}
  for(let i=0;i<(SF==='hard'?n*2:wet?n>>2:n);i++){const a=rnd(0,6.28),v=rnd(90,260)*(.5+s/60);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(40,200),add:true,c:C_SPARK,s:1.4,f:.6,grav:1,d:rnd(.3,.7)});}
  if(s>10&&!wet)for(let i=0;i<Math.min(12,s/3|0);i++){const a=rnd(0,6.28),v=rnd(30,130);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(80,220),c:C_DARK,s:rnd(1.4,2.8),f:.85,grav:1,bounce:1,d:rnd(1.2,2.2)});}
  // the fireball lingers and rolls upward, cooling from orange to dark red before the smoke takes over
  if(s>=14&&!wet&&!fxPH()){const nb=5;for(let i=0;i<nb;i++){const a=rnd(0,6.28),r=rnd(0,s*.3);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(s*.2,s*.6),vx:Math.cos(a)*rnd(3,s*.5),vy:Math.sin(a)*rnd(3,s*.5),vh:rnd(10,s*1.1),f:.2,rise:rnd(6,14),add:true,c:[2.4,.9,.22],c2:[.35,.1,.03],ck:.55,s:rnd(s*.3,s*.5),g:s*1.1,d:rnd(.55,.95),a:.6});}}
  // lingering dust: a low, wide cloud of ground-coloured dust that hangs over the impact and drifts off for several seconds
  if(grd&&s>=14&&!fxPH()){const th=G&&G.map?(G.map.theme==='snow'?'snow':G.map.theme==='green'?'green':'desert'):'desert',C=SF==='hard'?DUSTC_HARD:DUSTC[th],nd=Math.min(8,4+(s/10|0)),dk=th==='snow'?.92:.78;
    for(let i=0;i<nd;i++){const a=rnd(0,6.28),r=rnd(s*.2,s*.8);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(4,s*.35),vx:Math.cos(a)*rnd(4,14),vy:Math.sin(a)*rnd(4,14),vh:rnd(0,4),f:.5,rise:rnd(1,4),c:[C[i&1][0]*dk,C[i&1][1]*dk,C[i&1][2]*dk],c2:C[2],ck:.6,s:rnd(s*.9,s*1.4),g:rnd(s*.3,s*.45),d:rnd(6,9),a:th==='snow'?.3:.4});}}
  // heavy ground hits throw a few tumbling chunks of debris (PC only)
  if(grd&&s>=18&&!big&&!fxPH())chunks(x,y,s*2.2,SF==='hard'?'#5a5955':'#3e3a34',SF==='hard'?6:4);
  // a column of dark smoke keeps climbing from the biggest blasts long after the fire is out
  if(grd&&(big||s>=20&&!fxPH())&&inView(x,y,.3)){if(COLS.length>=12)COLS.shift();COLS.push({x,y,g,t:0,d:big?16:rnd(7,10),big:!!big,acc:0,G0:G});}
  if(big&&!wet&&!fxPH()){for(let i=0;i<10;i++){const a=rnd(0,6.28),v=rnd(20,s*1.4);part({x,y,h:g+rnd(2,s*.3),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(s*1.2,s*3.2),f:.3,grav:1,rise:rnd(4,10),c:C_DARK,c2:[.2,.18,.16],ck:.5,s:rnd(s*.14,s*.26),g:s*1.1,d:rnd(1.2,2.2),a:.8});}
    for(let i=0;i<14;i++){const a=rnd(0,6.28),v=rnd(40,s*3);part({x,y,h:g+rnd(2,6),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(60,s*6),c:i&1?[.16,.14,.12]:[.3,.25,.2],s:rnd(1.5,3.4),f:.7,grav:1,bounce:1,d:rnd(1.2,2.4)});}}
  if(!wet)scorch(x,y,s);if(gr&&s>=16&&groundH(x,y)>(typeof WL==="number"?WL+1:-1e9))crater(x,y,s*1.5);
  // pressure wave: a pale ring of dust racing outward along the ground; heavy hits leave a fire burning for a few seconds
  if(gr&&s>=14&&SHOCKS.length&&inView(x,y,.4)){const S=SHOCKS[shockI++%SHOCKS.length];S.t=0;S.d=big?.75:.45;S.r0=s*.5;S.r1=s*(big?6.5:4.2);S.a0=big?.6:.42;S.x=x;S.y=y;S.m.position.set(x,g+2.5,y);}
  if(gr&&(s>=20||big)&&groundH(x,y)>(typeof WL==="number"?WL+1:-1e9)){if(FIRES.length>=10)FIRES.shift();FIRES.push({x,y,g,t:0,d:big?9:rnd(4,6.5),r:Math.min(30,s*.45),big:!!big,acc:0});}
  if(s>12&&LIGHTS.length){const L=LIGHTS[lightI++%LIGHTS.length];L.position.set(x,g+20,y);L.intensity=(big?7:3.2)*WXFX*LUX;L.distance=big?600:300;L.userData.d=big?.8:.35;L.userData.t=0;}
  if(gr&&(big||s>=28))megaBoom(x,y,s,big);
  if(inView(x,y,.3)){const kd=typeof cam!=='undefined'?Math.max(.25,1-Math.hypot(x-cam.x,y-cam.y)/(cam.dist*2.2)):1;if(s>14)shake=Math.min(18,shake+s/(big?5:13)*kd);if(big)flash=Math.min(.2,flash+.1);}}
// timers for effects: ones started while the kill-cam replay runs are dropped if the replay has already ended
function fxLater(fn,ms){const rp=typeof KC!=='undefined'&&KC.on&&KC.R?KC.R:null;return setTimeout(()=>{if(rp&&KC.R!==rp)return;fn();},ms);}
const FXH={
  hl(k,a,b,tx){if(typeof tkPublic==='function')tkPublic(k,a,b,tx);},
  muz(x,y,h,a,s){try{if(G&&G.todM&&todLvl()===2){NFL.x=x;NFL.y=y;NFL.hot=G.t;}}catch(_){}try{if(typeof reMuz==='function')reMuz(x,y,a);}catch(_){}sfxShot(x,y,s);if(s>=13){const gh=groundH(x,y),ca=Math.cos(a),sa=Math.sin(a);for(let i=0;i<10;i++){const b=a+rnd(-1.3,1.3),v=rnd(30,90);part({x:x+ca*4,y:y+sa*4,h:h+rnd(-1,2),vx:Math.cos(b)*v+ca*40,vy:Math.sin(b)*v+sa*40,vh:rnd(4,18),f:.25,rise:rnd(6,14),c:i%3?C_SMOKE:[.62,.6,.56],c2:[.55,.53,.5],ck:.3,s:rnd(8,13),g:16,d:rnd(1.8,2.8),a:.62});}for(let i=0;i<12;i++){const b=rnd(0,6.28),v=rnd(40,80);part({x,y,h:gh+2,vx:Math.cos(b)*v,vy:Math.sin(b)*v,f:.1,c:C_DUST,s:rnd(5,8),g:10,d:rnd(.8,1.3),a:.35});}part({x:x+ca*8,y:y+sa*8,h,s:s*1.9,d:.08,add:true,c:[3.2,1.8,.6]});}// big guns: a hot core, a flame tongue down the barrel and two side jets from the muzzle brake, sized to the tank
    // rather than one fuzzy ball bigger than the vehicle
    if(s>=13){const ca=Math.cos(a),sa=Math.sin(a);part({x,y,h,s:s*1.5,d:.06,add:true,c:[3.2,2.4,1.2]});part({x:x+ca*s*.8,y:y+sa*s*.8,h,s:s*1.15,d:.05,add:true,c:[2.8,1.5,.5]});
      if(!fxPH())for(const k of [-1,1])part({x:x+ca*2-sa*k*s*.45,y:y+sa*2+ca*k*s*.45,h,s:s*.6,d:.045,add:true,c:[2.6,1.3,.4]});}
    // rifles, machine guns, rockets: a small white-hot core and a short flame tongue pointing down the barrel instead of
    // one big round glow that swallowed the whole squad; each shot's flame is a little different in length
    else{const ca=Math.cos(a),sa=Math.sin(a),L=s*rnd(.55,.85);part({x,y,h,s:s*1.15,d:.045,add:true,c:[3,2.3,1.2]});part({x:x+ca*L,y:y+sa*L,h,s:s*.8,d:.04,add:true,c:[2.8,1.5,.5]});
      if(!fxPH())part({x:x+ca*L*1.9,y:y+sa*L*1.9,h,s:s*.5,d:.035,add:true,c:[2.2,1,.3]});if(s<=6&&!fxPH()&&Math.random()<.5)part({x:x+ca*3,y:y+sa*3,h,vx:ca*rnd(20,40),vy:sa*rnd(20,40),vh:rnd(2,6),f:.2,c:[.5,.49,.46],s:rnd(2,3),g:7,d:rnd(.35,.6),a:.32});}
    if(s>9)mlight(x,y,h,s>=13?3:2.2,s>=13?200:150);if(s>9)for(let i=0;i<3;i++)part({x,y,h,vx:Math.cos(a)*rnd(20,50),vy:Math.sin(a)*rnd(20,50),c:C_SMOKE,s:rnd(4,7),g:12,d:rnd(.5,.9),a:.5});},
  tr(x1,y1,h1,x2,y2,h2,flak){if(MLIGHTS.length&&Math.random()<.35)mlight(x1,y1,h1,flak?1.6:1.1,90);TRACERS.push({a:[x1,h1,y1],b:[x2,h2,y2],t:0,d:.09,c:flak?[3,1.5,.5]:[3,1.9,.7]});if(!flak&&G&&G.todM&&todLvl()===2&&Math.random()<.5)fxLater(()=>part({x:x2,y:y2,h:h2,add:true,c:C_SPARK,s:3.2,d:.1,a:.8}),90);// night: tracer rounds spark where they land (view only)if(flak){part({x:x2,y:y2,h:h2,s:7,d:.12,add:true,c:C_FIRE});part({x:x2,y:y2,h:h2,s:5,g:7,d:.8,c:[.3,.29,.27],c2:[.5,.48,.45],ck:.3,a:.5});}
    else if(h2<10){if(ricoHit(x2,y2))ricochet(x1,y1,x2,y2);else if(Math.random()<.4)part({x:x2,y:y2,h:groundH(x2,y2)+1,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(10,30),c:C_DUST,s:3,g:6,d:.4,a:.6});}},
  salvo(x,y,h,tx,ty,ang){const sx=Math.cos(ang),sy=Math.sin(ang),px=-sy,py=sx;
    for(let i=0;i<3;i++){const side=i%2?1:-1,ox=x+px*side*5,oy=y+py*side*5,ix=tx+rnd(-18,18)+sx*rnd(-10,20),iy=ty+rnd(-18,18)+sy*rnd(-10,20);const len=Math.max(1,Math.hypot(ix-ox,iy-oy));VPROJ.push({x:ox,y:oy,h,sx:ox,sy:oy,sh:h,tx:ix,ty:iy,th:groundH(ix,iy)+1,spd:520,wpn:'missile',rocket:1,len,p:-i*55,vis:1});}
    for(let i=0;i<6;i++){const k=i/5,gx=tx-sx*40+sx*80*k+rnd(-8,8),gy=ty-sy*40+sy*80*k+rnd(-8,8);fxLater(()=>{TRACERS.push({a:[x,h-3,y],b:[gx,groundH(gx,gy)+1,gy],t:0,d:.09,c:[3,1.9,.7]});part({x:gx,y:gy,h:groundH(gx,gy)+2,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(20,50),c:C_DUST,s:rnd(3,5),g:8,d:rnd(.5,.9),a:.55});part({x:gx,y:gy,h:groundH(gx,gy)+2,add:true,c:C_SPARK,s:2.2,d:.08});},80+i*55);}},
  pj(x,y,h,tx,ty,th,spd,wpn,rocket){const len=Math.max(1,Math.hypot(tx-x,ty-y));VPROJ.push({x,y,h,sx:x,sy:y,sh:h,tx,ty,th,spd,wpn,rocket,len,p:0});},
  boom(x,y,s,big){boomFX(x,y,s,big);},
  // missile-defence intercept: an interceptor streaks up from the battery, a bright flash high over the target
  icpt(sx,sy,tx,ty){const N=7;for(let i=0;i<N;i++){const k0=i/N,k1=(i+1)/N,h0=groundH(sx,sy)+8+k0*210,h1=groundH(sx,sy)+8+k1*210;fxLater(()=>{TRACERS.push({a:[sx+(tx-sx)*k0,h0,sy+(ty-sy)*k0],b:[sx+(tx-sx)*k1,h1,sy+(ty-sy)*k1],t:0,d:.35,c:[2.6,2.2,1.4]});},i*70);}
    fxLater(()=>boomFX(tx,ty,30,true,210),N*70);},
  toss(id,vh){const o=OBJ.get(id);if(o)o.userData.toss={h:0,vh,sp:(Math.random()<.5?-1:1)*rnd(4,9),r:0};},
  // ballistic missile: launch plume at the silo, a high arc with a burning exhaust and a long smoke trail, then a steep
  // dive onto the target (the sim's own strike makes the explosion on arrival)
  // ballistic / cruise missile launched from the strike building (src/05b-missiles.js draws it)
  bmis(sx,sy,tx,ty,T,i){mslSpawn(sx,sy,tx,ty,T,i);},
  die(id,x,y,ki,isB,team){const kind=KINDS[ki],o=OBJ.get(id);const rot=o?o.rotation.y:0;
    if(isB){boomFX(x,y,40,true,10);chunks(x,y,STRUCT[kind].size,'#8a8478',10);for(let i=0;i<5;i++)fxLater(()=>boomFX(x+rnd(-35,35),y+rnd(-35,35),18,false,rnd(0,20)),i*180);rubble(x,y,STRUCT[kind].size,o);}
    else{const s=BASE[kind];if(s.armor==='light'&&s.dom==='ground'){for(let i=0;i<6;i++)part({x,y,h:groundH(x,y)+3,vx:rnd(-30,30),vy:rnd(-30,30),c:C_DUST,s:rnd(4,7),g:10,d:rnd(.5,.9),a:.6});}
      else if(kind==='drone')boomFX(x,y,16,false,unitH({s,x,y,id:0}));else{const air=s.dom==='air';boomFX(x,y,air?18:s.r*1.5,false,air&&o?o.position.y-groundH(x,y):0);if(o&&!air){const P=o.userData.parts||{};if(P.turret&&s.armor==='heavy'&&Math.random()<.45&&inView(x,y,.2)){const tu=P.turret;o.updateMatrixWorld(true);const wp=new THREE.Vector3(),wq=new THREE.Quaternion();tu.getWorldPosition(wp);tu.getWorldQuaternion(wq);tu.parent.remove(tu);tu.position.copy(wp);tu.quaternion.copy(wq);if(typeof burntMat==='function')tu.traverse(m=>{if(m.isMesh&&m.material&&!Array.isArray(m.material))m.material=burntMat(m.material);});SCN.add(tu);const a=Math.random()*6.28;DEBRIS.push({m:tu,vx:Math.cos(a)*rnd(15,45),vz:Math.sin(a)*rnd(15,45),vh:rnd(70,120),wx:rnd(-4,4),wy:rnd(-5,5),wz:rnd(-4,4),t:0,rest:0});for(let q=0;q<14;q++)part({x,y,h:wp.y,vx:rnd(-40,40),vy:rnd(-40,40),vh:rnd(30,90),add:true,c:C_FIRE2,s:rnd(4,7),d:rnd(.3,.6)});}if(WRECKQ.length<6)WRECKQ.push([o,x,y]);}}}
    if(o&&!isB&&BASE[kind].armor==='light'&&BASE[kind].dom==='ground'&&o.userData.model&&o.userData.parts.body){OBJ.delete(id);const P=o.userData.parts;if(P.tring)P.tring.visible=false;o.userData.walker=false;
      const figs=P.body.children.map((f,i)=>{const md=Math.random(),h=Math.random()<.5?-1:1;/* death falls: sideways, face-down, backwards, or sink to the knees first */return{f,dl:i*.12+Math.random()*.15,dir:md<.4?h:0,rx:md<.4?rnd(-.35,.35):md<.7?1.45:md<.9?-1.35:.5,rz:md>=.9?h*.9:0,sp:md>=.9?1:0,yw:rnd(-.7,.7),base:f.position.clone(),by:f.rotation.y,bz:f.position.z};});BODIES.push({o,t:0,figs,x,y});if(BODIES.length>(fxPH()?40:90)){const b=BODIES.shift();SCN.remove(b.o);}return;}
    if(o){SCN.remove(o);OBJ.delete(id);}},
  strike(x,y,t,r,sup,arc){if(sup)sfxAlarm();const gy=groundH(x,y)+1.5,objs=[],mk=(g,col,op)=>{const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));m.position.set(x,gy,y);SCN.add(m);objs.push(m);return m;};
    // warning marker: steady outer ring, a ring that shrinks onto the target as the hit gets closer, a faint disc, a cross and four ticks
    const ring=mk(new THREE.RingGeometry(r*.95,r,56).rotateX(-Math.PI/2),0xea3a2c,.8),inner=mk(new THREE.RingGeometry(r*.9,r,56).rotateX(-Math.PI/2),0xff6a3a,.7),disc=mk(new THREE.CircleGeometry(r,48).rotateX(-Math.PI/2),0xea3a2c,.1);
    const bar=(w,h,px,pz,rot)=>{const m=mk(new THREE.PlaneGeometry(w,h).rotateX(-Math.PI/2),0xff5a3a,.8);m.position.x+=px;m.position.z+=pz;m.rotation.y=rot||0;};
    const cl=Math.max(5,r*.16);bar(cl*2,1.2,0,0);bar(1.2,cl*2,0,0);for(let q=0;q<4;q++){const a=q*Math.PI/2;bar(r*.2,1.6,Math.cos(a)*r*1.06,Math.sin(a)*r*1.06,-a);}
    const MK={x,y,t,t0:Math.max(.5,t),r,sup,ring,disc,inner,objs};
    if(sup&&!arc){mslFallStart(MK,'cruise');}else if(!sup&&r>=68){mslFallStart(MK,'bomb');}
    MARKERS.push(MK);},
  hack(x,y){for(let i=0;i<24;i++)part({x:x+rnd(-30,30),y:y+rnd(-30,30),h:groundH(x,y)+rnd(5,40),vh:rnd(10,30),add:true,c:[.3,1,.5],s:rnd(2,4),d:rnd(.6,1.2)});},
  rank(id,r,x,y){if(typeof RKV!=='undefined')RKV.set(id,{r,t:performance.now()});try{if(typeof vetCue==='function')vetCue(id,r);}catch(e){}if(inView(x,y,.1)){const g=groundH(x,y);for(let i=0;i<10;i++){const a=rnd(0,6.28);part({x:x+Math.cos(a)*3,y:y+Math.sin(a)*3,h:g+2,vx:Math.cos(a)*14,vy:Math.sin(a)*14,vh:rnd(10,24),add:true,c:[1,.85,.4],s:rnd(2,4),d:.6,a:.8});}}},
  chf(x,y,h,jet){for(let i=0;i<(jet?7:5);i++){const b=rnd(0,6.28),v=rnd(25,60);part({x,y,h,vx:Math.cos(b)*v,vy:Math.sin(b)*v,vh:rnd(-8,6),g:18,add:true,c:jet?[2.6,2.6,3.2]:[3.4,2.2,.8],s:rnd(2.5,4),d:rnd(.7,1.2)});part({x,y,h,vx:Math.cos(b)*v*.6,vy:Math.sin(b)*v*.6,vh:rnd(-6,2),g:14,c:C_SMOKE,s:rnd(3,5),d:rnd(.8,1.3),a:.4});}mlight(x,y,h,2,120);},
  flare(x,y,r,d){FLARES.push({x,y,r,d:d||30,t:0,acc:0});if(FLARES.length>6)FLARES.shift();},
  ping(x,y,r){PINGS.push({x,y,r,t:0,d:1.6,c:0x7fb8e6});},
  smoke(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0xb9bdbb});for(let i=0;i<140;i++){const a=rnd(0,6.28),d=Math.sqrt(Math.random())*r;part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,14),vh:rnd(1,4),rise:rnd(2,6),c:C_SMOKE,c2:[.75,.75,.73],ck:.4,s:rnd(30,55),g:2,d:rnd(12,20),a:.5});}},
  halo(x,y,r,c){PINGS.push({x,y,r,t:0,d:1.8,c:c|0});},   /* leader abilities (03i-leaders): a coloured ring from the pooled ping rings */
  vig(team,col,snd){if(team!==ME||typeof document==='undefined')return;try{let v=document.getElementById('ldVig');if(!v){v=document.createElement('div');v.id='ldVig';v.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9;opacity:0;transition:opacity .35s';document.body.appendChild(v);}
    v.style.background='radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,'+col+' 140%)';v.style.boxShadow='inset 0 0 160px 30px '+col;v.style.opacity='.85';clearTimeout(v._t);v._t=setTimeout(()=>{v.style.opacity='0';},2600);
    if(snd&&typeof sfxAlarm==='function')sfxAlarm();else if(typeof martyrSwell==='function'){AU.swellT=0;martyrSwell(team);}}catch(_){}},
  heal(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0x74d08f});for(let i=0;i<40;i++){const a=rnd(0,6.28),d=rnd(0,r);part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,20),vh:rnd(15,40),add:true,c:[.4,1,.55],s:rnd(2,4),d:rnd(.8,1.4)});}},
  plane(sx,sy,tx,ty,team){mats();const T=G.teams[team],o=mesh(geoFor('plane',T.fac,T,'body'));o.scale.setScalar(1.2);SCN.add(o);const a=Math.atan2(ty-sy,tx-sx),L=Math.hypot(tx-sx,ty-sy);PLANES.push({o,sx,sy,a,v:L/2.6,t:0,tx,ty,dropped:false});},
  log(team,msg,kind,x,y){if(team===ME)pushLog(msg,kind,x,y);},
  end(winner){showEnd(winner);},
  elim(team){if(team===ME&&G&&!G.over)showElim();},
  oilDry(i){const o=G.oil&&G.oil[i];if(!o)return;if(MODE==='client'){o.res=0;}if(o.owner===ME||MODE==='client')try{pushLog('An oil derrick has run dry.','w');}catch(_){}},
  give(f,t,a){if(t===ME&&typeof sfxUI==='function')sfxUI(880);},
  civd(i,q){const c=G.civ&&G.civ[i];if(!c)return;if(c.ruin&&c.obj){c.obj.visible=false;if(typeof scorch==='function')scorch(c.x,c.y,30);}if(MODE==='client'){c.dead=true;if(G.grid[c.k]===3)G.grid[c.k]=0;if(typeof rubMark==='function')rubMark(c);}G.civDirty=true;const g=groundH(c.x,c.y);if(!q)try{FXH.boom(c.x|0,c.y|0,26,1);chunks(c.x,c.y,48,'#cfc6b2',12);}catch(_){}},
  // P2P: a remembered enemy building that was destroyed out of this player's sight - removed silently (leaving rubble)
  // when they next see the spot, instead of an explosion that would give the fight away
  gone(id,x,y,ki){const k=KINDS[ki];if(k&&STRUCT[k])try{rubble(x,y,STRUCT[k].size);}catch(_){}},
  flag(x,y,team,dur){flagFX(x,y,team,dur);if(typeof martyrSwell==='function')martyrSwell(team);},
  txt(x,y,str,team,vic){if(!SET.txt||team!==ME&&vic!==ME&&vic!==-2)return;FLOATS.push({x,y,s:str,t0:performance.now(),c:vic===-2?(ally(team,ME)?(str==='RALLIED'?'#74d08f':'#ea5a40'):'#f2c94c'):team===ME?'#f2c94c':'#ea5a40'});if(FLOATS.length>14)FLOATS.shift();},
};
// Kill-cam (08-ui.js): the visual-only effects are also noted for the end-of-match replay, on the host (via fxPlay) and
// on clients (via applyEvents) alike. FXH_RAW keeps the plain handlers so the replay can play them without re-noting
// them. Effects that change game state (civd, oilDry, log, end, ...) are never noted or replayed.
const FXH_RAW={};
for(const k of ['muz','tr','salvo','pj','boom','toss','bmis','die','strike','smoke','heal','hack','plane','gone']){const f=FXH[k];if(!f)continue;FXH_RAW[k]=f;
  FXH[k]=function(...a){try{if(typeof kcFx==='function')kcFx(k,a);}catch(_){}return f.apply(FXH,a);};}
// Martyrdom banner (Shia factions): a crimson cloth on a wooden pole planted where a soldier fell. It rises out of the
// ground, waves, and sinks away when the sim's banner runs out (the sim re-sends 'flag' to renew it). All banners share
// one pole and one cloth geometry (the cloth's wave is moved once a frame for all of them): 3 small meshes each.
const FLAGS=[];let FLAGG=null;
function flagGeo(){if(FLAGG)return FLAGG;const pole=new THREE.CylinderGeometry(.45,.6,30,6).translate(0,15,0),tip=new THREE.SphereGeometry(1,6,4).translate(0,30.5,0);
  const cloth=new THREE.PlaneGeometry(13,8,8,2).translate(6.5,24.5,0),P=cloth.attributes.position,base=Float32Array.from(P.array);
  FLAGG={pole,tip,cloth,base,mPole:new THREE.MeshStandardMaterial({color:lin('#4a3a28'),roughness:.9}),mTip:new THREE.MeshStandardMaterial({color:lin('#b8953c'),roughness:.4,metalness:.6}),
    mCloth:new THREE.MeshStandardMaterial({color:lin('#8a1212'),roughness:.85,side:THREE.DoubleSide})};return FLAGG;}
function flagFX(x,y,team,dur){for(const f of FLAGS)if(f.team===team&&f.x===x&&f.y===y){f.left=Math.max(f.left,dur);return;}
  const F=flagGeo(),g=new THREE.Group(),pm=new THREE.Mesh(F.pole,F.mPole),tm=new THREE.Mesh(F.tip,F.mTip),cm=new THREE.Mesh(F.cloth,F.mCloth);pm.castShadow=cm.castShadow=true;g.add(pm,tm,cm);
  g.position.set(x,groundH(x,y)-30,y);g.rotation.y=-(((x*7+y*13)%628)/100);SCN.add(g);FLAGS.push({g,x,y,team,left:dur,t:0,G0:G});if(FLAGS.length>24){const o=FLAGS.shift();SCN.remove(o.g);}}
let FLAGT=null;
function flagTick(rdt){if(!FLAGS.length){FLAGT=null;return;}let any=false;const gn=G?G.t:0,dt=FLAGT!=null?Math.max(0,Math.min(.25,gn-FLAGT)):0;FLAGT=gn;   // fade runs on game time: a paused battle holds the flags
  for(let i=FLAGS.length-1;i>=0;i--){const f=FLAGS[i];f.t+=dt;f.left-=dt;if(f.left<=-1.2||f.G0!==G){SCN.remove(f.g);FLAGS.splice(i,1);continue;}
    const up=Math.min(1,f.t/.5),dn=f.left<0?Math.min(1,-f.left/1.2):0,k=up*(1-dn);f.g.position.y=groundH(f.x,f.y)-30*(1-k*k*(3-2*k));f.g.visible=k>.02;any=true;}
  if(!any||!FLAGG)return;const P=FLAGG.cloth.attributes.position,A=P.array,B=FLAGG.base,t=performance.now()/1000;
  for(let i=0;i<A.length;i+=3){const u=B[i]/13;A[i+2]=Math.sin(B[i]*.55-t*5.2)*1.6*u;A[i+1]=B[i+1]-u*u*1.2;}P.needsUpdate=true;FLAGG.cloth.computeVertexNormals();}
// An effect must never throw into the simulation (that stopped the whole battle): the battle can run before the 3D
// world exists (behind the loading screen, or in headless tests), so a failing effect is skipped and the battle goes on.
let FXERR=0;
// Plays one battle effect on this screen. FXE (03-sim.js) calls it after queuing the effect for the clients.
function fxPlay(type,args){if(FXH[type]&&!G.headless)try{FXH[type](...args);}catch(e){if(FXERR++<5)console.warn('effect '+type+' skipped: '+(e&&e.message));}}
// Burnt-out wrecks keep their shape and panel detail: patchy soot, rust-brown scorched paint and grey ash with the
// original surface showing faintly through, glowing embers that die down over ~20 seconds, and a slight list.
const WRECK_HEAT={value:1};let WRECKM=null;const WRECKQ=[],BURNT=new Map();
// Object3D.clone() deep-copies every userData through JSON; a unit's userData holds its 3D parts, so cloning one for its
// wreck serialised the whole model (geometry, even textures as images) - seconds of frozen game per destroyed vehicle in a
// big battle. Wrecks never need the copied userData: clone with it set aside.
function cloneLite(o){const keep=[];o.traverse(c=>{keep.push([c,c.userData]);c.userData={};});try{return o.clone(true);}finally{for(const [c,u] of keep)c.userData=u;}}
// Lingering battle smoke (Abdullah 2026-11-03 "epic maps"): where wrecks and ruins pile up, a tall dark column keeps rising for
// a minute or two, so a big fight can be seen from far away. Looks only (no sim), max 3 columns on Low, 7 otherwise; wrecks
// within ~180 of a column feed it instead of starting another.
const SMKCOL=[];function smkAdd(x,y,w){try{if(typeof G==='undefined'||!G||!G.t)return;for(const c of SMKCOL)if(Math.hypot(c.x-x,c.y-y)<180){c.t=Math.min(c.t,12);c.n+=w;return;}
  if(SMKCOL.length>=(fxPH()?3:7))SMKCOL.shift();SMKCOL.push({x,y,t:0,L:75+Math.random()*45,n:w,b:G.t});}catch(e){}}
function smkTick(dt){for(let i=SMKCOL.length-1;i>=0;i--){const c=SMKCOL[i];c.t+=dt;if(c.t>c.L||G.t<c.b){SMKCOL.splice(i,1);continue;}
  if(!inView(c.x,c.y,.9))continue;const fade=Math.min(1,(c.L-c.t)/20),PH=fxPH(),k=Math.min(2.2,.8+c.n*.12);
  if(Math.random()<dt*(PH?3:6)*k){part({x:c.x+rnd(-8,8),y:c.y+rnd(-8,8),h:groundH(c.x,c.y)+10,vx:rnd(8,14),vy:rnd(-2,2),rise:rnd(55,80),c:[.12,.115,.11],c2:[.4,.38,.35],ck:rnd(.3,.5),s:PH?rnd(9,13):rnd(11,17),g:rnd(15,22),d:PH?rnd(7,9):rnd(9,12),a:.32*fade+.04});}}}
function wreckTick(){const q=WRECKQ.shift();if(q)try{wreck(q[0],q[1],q[2]);}catch(e){}}
function burntMat(src){const m=new THREE.MeshStandardMaterial({color:0xffffff,map:src&&src.map||null,roughness:1,metalness:.05,vertexColors:!!(src&&src.vertexColors)});
  if(src&&src.color)m.userData.base=src.color.clone();m.color.copy(m.userData.base||new THREE.Color(.3,.3,.3));const heat={value:1};m.userData.heat=heat;
  m.onBeforeCompile=sh=>{sh.uniforms.uHeat=heat;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBW;').replace('#include <project_vertex>','#include <project_vertex>\nvBW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uHeat;varying vec3 vBW;\n'+WX_COMMON.replace('varying vec3 vWP;','')).replace('#include <color_fragment>',`#include <color_fragment>
      {vec3 b=diffuseColor.rgb;float l=dot(b,vec3(.3,.59,.11));float n=wn(vBW*.32)*.6+wn(vBW*1.25)*.4,n2=wn(vBW*2.6+3.1);
       vec3 soot=vec3(.03,.028,.026),rust=vec3(.30,.16,.075)*(.65+.7*l),ash=vec3(.36,.34,.31);
       vec3 c=mix(soot,rust,smoothstep(.42,.68,n));c=mix(c,ash*(.5+l*.6),smoothstep(.72,.9,n2)*.55);c=mix(c,b*.3,.22);diffuseColor.rgb=c;}`)
     .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      {float e=smoothstep(.70,.82,wn(vBW*.55+7.)*.7+wn(vBW*2.1)*.3);totalEmissiveRadiance+=vec3(1.6,.48,.1)*e*uHeat*uHeat;}`);};
  m.customProgramCacheKey=()=>'burnt1';return m;}
function wreck(o,x,y){mats();let w;const mats2=[];const rec={heat:1};const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};if(o.userData.model){w=cloneLite(o);w.visible=true;w.traverse(c=>{c.matrixWorldAutoUpdate=true;if(c.isMesh){c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);}if(c.isSkinnedMesh)c.visible=false;});w.rotation.z=rnd(-.08,.08);w.rotation.x=rnd(-.05,.05);}else{w=new THREE.Group();o.traverse(c=>{if(c.isMesh&&c.material===MAT.std){const m=new THREE.Mesh(c.geometry,bm(c.material));m.position.copy(c.position);m.rotation.copy(c.rotation);m.castShadow=true;w.add(m);}});
  w.position.copy(o.position);w.rotation.y=o.rotation.y;}const P=o.userData.parts;if(P.turret){const t=w.children[1];if(t)t.rotation.set(rnd(-.2,.2),rnd(-1,1),rnd(-.2,.2));}w.traverse(c=>{if(c.isMesh){c.onBeforeRender=(r,s,cam,g,m)=>{if(m&&m.userData.heat&&m.userData.heat.value!==rec.heat){m.userData.heat.value=rec.heat;m.uniformsNeedUpdate=true;}};}});SCN.add(w);WRECKS.push({o:w,x,y,t:0,rec});while(WRECKS.length>(fxPH()?12:30)){const q=WRECKS.shift();SCN.remove(q.o);}smkAdd(x,y,1);}
function rubble(x,y,size,o){if(size>=28)smkAdd(x,y,2);mats();const w=new THREE.Group();const B=Bld(),h=size*.5;const gr=['#7d7a72','#8e8b82','#6c6962','#5a5751','#9a968c'];
  B.rock(size*.95,1.6,size*.95,0,.3,0,'#5e5b54',0,rnd(0,6),0);
  for(let i=0;i<46;i++){const s2=rnd(2.5,10),r=Math.sqrt(Math.random())*h*1.05,a=rnd(0,6.28);B.rock(s2*1.3,s2*rnd(.5,.9),s2*rnd(.8,1.5),Math.cos(a)*r,s2*.1+rnd(0,3)*(1-r/h),Math.sin(a)*r,Math.random()<.2?'#2b2925':gr[i%5],rnd(-.5,.5),rnd(0,6),rnd(-.5,.5));}
  for(let k=0;k<3;k++){const a=rnd(0,6.28),r=rnd(h*.3,h*.8),ht=rnd(6,18),wd=rnd(10,22);B.box(wd,ht,2.5,Math.cos(a)*r,ht/2,Math.sin(a)*r,'#86837a',rnd(-.12,.12),a+1.57,rnd(-.1,.1));}
  for(let k=0;k<8;k++){const a=rnd(0,6.28),r=rnd(0,h*.8);B.cyl(.25,.25,rnd(6,14),4,Math.cos(a)*r,rnd(3,6),Math.sin(a)*r,'#3a2a20',rnd(-1,1),0,rnd(-1,1));}
  const m=mesh(B.geo());w.add(m);scorch(x,y,size*.7);
  w.position.set(x,groundH(x,y),y);SCN.add(w);WRECKS.push({o:w,x,y,t:0,big:true});smkAdd(x,y,2);}
function fxUpdate(dt){
  for(const p of PARTS){p.t+=dt;const fr=Math.pow(p.f,dt);p.vx*=fr;p.vy*=fr;p.vh*=fr;if(p.grav)p.vh-=420*dt;p.x+=(p.vx+(p.add?0:6))*dt;p.y+=p.vy*dt;p.h+=(p.vh+p.rise)*dt;p.s=Math.max(.4,p.s+p.g*dt);
    if(p.bounce&&p.h<groundH(p.x,p.y)){p.h=groundH(p.x,p.y);p.vh*=-.3;p.vx*=.4;p.vy*=.4;}}
  for(let i=PARTS.length-1;i>=0;i--)if(PARTS[i].t>=PARTS[i].d){PARTS[i]=PARTS[PARTS.length-1];PARTS.pop();}
  let nN=0,nA=0;for(const p of PARTS){const P=p.add?PA_:PN_;let i=p.add?nA++:nN++;if(i>=PMAX)continue;const k=p.t/p.d;
    P.pos[i*3]=p.x;P.pos[i*3+1]=p.h;P.pos[i*3+2]=p.y;if(p.c2){const m=Math.min(1,k/(p.ck||.3));P.col[i*3]=p.c[0]+(p.c2[0]-p.c[0])*m;P.col[i*3+1]=p.c[1]+(p.c2[1]-p.c[1])*m;P.col[i*3+2]=p.c[2]+(p.c2[2]-p.c[2])*m;}else{P.col[i*3]=p.c[0];P.col[i*3+1]=p.c[1];P.col[i*3+2]=p.c[2];}P.sz[i]=p.s*2;P.al[i]=p.add?p.a*(1-k)*(1-k):p.a*(1-k)*Math.min(1,k*5+.3);}
  for(const [P,n] of [[PN_,nN],[PA_,nA]]){const m=Math.min(n,PMAX);P.g.setDrawRange(0,m);if(m||P.lastN)for(const k of ['position','pcol','size','alpha']){const A=P.g.attributes[k];fxUpd(A,Math.max(m,1)*A.itemSize);}P.lastN=m;   /* only the live part of the buffers is uploaded (it was all 3,500 slots per layer every frame) */P.m.uniforms.scale.value=VH*dpr/(2*Math.tan(CAM.fov*Math.PI/360));}
  for(const t of TRACERS){t.t+=dt;const k=Math.min(1,t.t/t.d*1.25);for(let q=0;q<3;q++){const u=Math.max(0,k-q*.05);part({x:t.a[0]+(t.b[0]-t.a[0])*u,h:t.a[1]+(t.b[1]-t.a[1])*u,y:t.a[2]+(t.b[2]-t.a[2])*u,s:3.4-q*.7,d:.05,add:true,c:[t.c[0]*.9,t.c[1]*.8,t.c[2]*.7],a:.9-q*.2});}}for(let i=TRACERS.length-1;i>=0;i--)if(TRACERS[i].t>=TRACERS[i].d)TRACERS.splice(i,1);
  const tp=TRC.geometry.attributes.position.array,tc=TRC.geometry.attributes.color.array;let n=0;const NB=(G&&G.todM)?(todLvl()||0):0,NG=1+NB*.7,NL=.14+NB*.07;for(const t of TRACERS){if(n>=800)break;const L=Math.hypot(t.b[0]-t.a[0],t.b[1]-t.a[1],t.b[2]-t.a[2])||1,u=Math.min(1,t.t/t.d*1.25),u0=Math.max(0,u-Math.min(NL,(20+NB*14)/L));for(let j=0;j<3;j++){tp[n*6+j]=t.a[j]+(t.b[j]-t.a[j])*u0;tp[n*6+3+j]=t.a[j]+(t.b[j]-t.a[j])*u;}for(let j=0;j<3;j++){tc[n*6+j]=t.c[j]*.1*NG;tc[n*6+3+j]=t.c[j]*(j?.72:.95)*NG;}n++;}
  TRC.geometry.setDrawRange(0,n*2);if(n||TRC.lastN)for(const k of ['position','color']){const A=TRC.geometry.attributes[k];fxUpd(A,Math.max(n,1)*6);}TRC.lastN=n;
  bmTick(dt);mushTick(dt);debrisTick(dt);
  for(const p of VPROJ){const ox=p.x,oy=p.y,oh=p.h;p.p+=p.spd*dt;const k=Math.min(1,p.p/p.len);p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k;const arc=p.wpn==='shell'?Math.sin(k*Math.PI)*p.len*.22:0;p.h=p.sh+(p.th-p.sh)*k+arc;
    if(p.p<0){p.x=p.sx;p.y=p.sy;p.h=p.sh;continue;}
    if(k>=1){p.done=true;if(p.vis)boomFX(p.tx,p.ty,9,false);continue;}
    if(p.wpn==='at'||p.wpn==='missile'||p.rocket){if(Math.random()<.5)part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE,a:.7});for(let q=0;q<2;q++)part({x:p.x+rnd(-1,1),y:p.y+rnd(-1,1),h:p.h,vx:rnd(-4,4),vy:rnd(-4,4),c:[.88,.87,.84],s:rnd(3,5),g:9,d:rnd(1.6,2.6),a:.55});}
    else if(p.wpn==='shell'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,add:true,c:C_FIRE});if(Math.random()<.6)part({x:p.x,y:p.y,h:p.h,vx:rnd(-2,2),vy:rnd(-2,2),c:[.7,.68,.65],s:rnd(1.6,2.4),g:3.5,d:rnd(.8,1.3),a:.32});}
    else if(p.wpn==='torp'){if(Math.random()<.7)part({x:p.x,y:p.y,h:groundH(p.x,p.y)+1.5,vx:rnd(-3,3),vy:rnd(-3,3),c:[.92,.96,1],s:rnd(3,5),d:rnd(.9,1.5),a:.6});}
    else if(p.wpn==='bomb'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,c:C_DARK,a:1});}
    else{part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE2});if(ox!=null)TRACERS.push({a:[ox,oh,oy],b:[p.x,p.h,p.y],t:0,d:.07,c:[1.6,1.2,.7]});}}
  for(let i=VPROJ.length-1;i>=0;i--)if(VPROJ[i].done)VPROJ.splice(i,1);
  for(const m of MARKERS){m.t-=dt;const fast=m.t<1.6,pu=.5+.5*Math.sin(performance.now()/(fast?55:110));m.ring.material.opacity=.45+.4*pu;m.disc.material.opacity=.07+.1*pu;
    if(m.inner){const q=Math.max(0,Math.min(1,m.t/m.t0));m.inner.scale.setScalar(.12+.88*q);m.inner.material.opacity=.35+.5*pu;}
    if(m.t<1.8&&!m.ws){m.ws=1;if(m.sup||m.r>=68)sfxWhistle(m.x,m.y,Math.max(.8,m.t));}
    if(m.fall)mslFallTick(m,dt);
    if(m.t<=-.05){m.done=true;for(const o of m.objs){SCN.remove(o);o.geometry.dispose();o.material.dispose();}if(m.fall)SCN.remove(m.fall.M.g);}}
  for(let i=MARKERS.length-1;i>=0;i--)if(MARKERS[i].done)MARKERS.splice(i,1);
  for(const p of PLANES){p.t+=dt;const d=p.v*p.t;const x=p.sx+Math.cos(p.a)*d,y=p.sy+Math.sin(p.a)*d;p.o.position.set(x,groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+150,y);p.o.rotation.y=-p.a;
    if(!p.dropped&&p.t>=2.6){p.dropped=true;for(let i=0;i<5;i++)part({x:p.tx+rnd(-40,40),y:p.ty+rnd(-40,40),h:groundH(p.tx,p.ty)+140,vh:-60,f:1,c:[.95,.95,.9],s:5,d:2.2,a:.9});}
    if(p.t>6){p.done=true;SCN.remove(p.o);}}
  for(let i=PLANES.length-1;i>=0;i--)if(PLANES[i].done)PLANES.splice(i,1);
  for(const w of WRECKS){w.t+=dt;if(w.rec)w.rec.heat=Math.max(0,1-w.t/20);const vis=inView(w.x,w.y,.25),burn=w.t<(w.big?30:24),fade=Math.max(0,1-w.t/(w.big?40:32));
    if(vis&&w.t<(w.big?40:32)&&Math.random()<dt*(w.big?7:4.5)){const PH=fxPH();part({x:w.x+rnd(-5,5),y:w.y+rnd(-5,5),h:groundH(w.x,w.y)+8,vx:PH?rnd(5,9):rnd(6,12),rise:PH?rnd(40,56):rnd(34,48),c:Math.random()<.6?C_DARK:[.2,.19,.18],c2:[.44,.42,.39],ck:rnd(.25,.4),s:PH?rnd(4,7):rnd(7,11),g:PH?7:rnd(9,12),d:PH?rnd(3,4.2):rnd(5,7),a:.4*fade+.08});}
    if(vis&&burn&&Math.random()<dt*(w.big?14:10)){const fx=w.x+rnd(-9,9),fy=w.y+rnd(-9,9);part({x:fx,y:fy,h:groundH(fx,fy)+rnd(3,9),vx:rnd(-3,3),vy:rnd(-3,3),rise:rnd(14,26),add:true,c:Math.random()<.5?[2.6,1.1,.3]:[2.9,1.7,.6],s:rnd(4,8),g:-3,d:rnd(.35,.7),a:.85});}
    if(vis&&burn&&Math.random()<dt*2)part({x:w.x+rnd(-6,6),y:w.y+rnd(-6,6),h:groundH(w.x,w.y)+6,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:1.2,f:.6,grav:1,d:rnd(.4,.8)});
    if(vis&&burn&&Math.random()<dt*3){const gl=w.big?30:20;part({x:w.x+rnd(-3,3),y:w.y+rnd(-3,3),h:groundH(w.x,w.y)+1.5,add:true,c:[1.5,.55,.14],s:gl,d:.5,a:(G&&G.todM&&todLvl()===2?.5:.16)*fade+.04});}// fire glow pooled on the sand under a burning wreck (stronger at night)
    if(burn&&!w.light&&LIGHTS.length){w.light=1;}
    if(w.t>(w.big?200:180))w.o.position.y-=dt*1.5;if(w.t>(w.big?210:188)){w.done=true;SCN.remove(w.o);}}
  smkTick(dt);
  for(let i=WRECKS.length-1;i>=0;i--)if(WRECKS[i].done)WRECKS.splice(i,1);
  {let k=0;const now=performance.now()/1000;for(const w of WRECKS){if(k>=WLIGHTS.length)break;if(w.t>=(w.big?30:24)||!inView(w.x,w.y,.1))continue;const L=WLIGHTS[k++],fl=.75+.25*Math.sin(now*17+w.x)*Math.sin(now*11.3+w.y),fade=Math.min(1,w.t*2)*Math.min(1,((w.big?30:24)-w.t)/6);L.position.set(w.x,groundH(w.x,w.y)+16,w.y);L.intensity=(w.big?3.2:2.2)*fl*fade*WXFX*LUX;}for(;k<WLIGHTS.length;k++)WLIGHTS[k].intensity=0;}
  for(const b of BODIES){b.t+=dt;for(const g of b.figs){const k=Math.max(0,Math.min(1,(b.t-g.dl)/.45));const e=k*k*(3-2*k);g.f.rotation.z=g.dir*1.5*e+(g.rz||0)*e;g.f.rotation.x=g.rx*e;g.f.rotation.y=g.by+(g.yw||0)*e;g.f.position.y=g.base.y-e*(g.sp?.3:.6)+(Math.abs(g.rx)>1?e*1.1:0);if(g.rx>1&&g.rx<1.6)g.f.position.z=g.bz-e*3.2;if(k>0&&k<1&&!g.dust&&e>.9){g.dust=1;part({x:b.x,y:b.y,h:groundH(b.x,b.y)+1,vx:rnd(-12,12),vy:rnd(-12,12),c:C_DUST,s:rnd(4,6),g:6,d:.7,a:.4});}}
    if(b.t>50)b.o.position.y-=dt*1.2;if(b.t>58){b.done=true;SCN.remove(b.o);}}
  for(let i=BODIES.length-1;i>=0;i--)if(BODIES[i].done)BODIES.splice(i,1);
  // RF15: at night, mortar illumination rounds go up over a fight you can see (view only, nothing in the simulation)
  if(G&&G.todM&&todLvl()===2){NFL.cd-=dt;if(NFL.cd<=0&&G.t-NFL.hot<4&&FLARES.length<3&&inView(NFL.x,NFL.y,1.5)){FXE_flare(NFL.x+rnd(-70,70),NFL.y+rnd(-70,70));NFL.cd=rnd(14,22);}}
  {for(let i=FLARES.length-1;i>=0;i--){const F=FLARES[i];F.t+=dt;if(F.t>=F.d)FLARES.splice(i,1);}
   FLARES.sort((a,b)=>Math.hypot(a.x-CAM.position.x,a.y-CAM.position.z)-Math.hypot(b.x-CAM.position.x,b.y-CAM.position.z));
   for(let k=0;k<Math.max(FLL.length,0);k++){const L=FLL[k],F=FLARES[k];if(!F){L.intensity=0;continue;}const fade=Math.min(1,F.t/1.2)*Math.min(1,(F.d-F.t)/5),fl=.9+.1*Math.sin(F.t*23)*Math.sin(F.t*9.1),hh=groundH(F.x,F.y)+Math.max(90,210-F.t*4);L.position.set(F.x,hh,F.y);L.intensity=26*fade*fl*LUX;L.distance=F.r*2.2;}
   for(const F of FLARES){if(!inView(F.x,F.y,.4))continue;F.acc+=dt;if(F.acc<.1)continue;F.acc=0;const fade=Math.min(1,F.t/1.2)*Math.min(1,(F.d-F.t)/5);part({x:F.x,y:F.y,h:groundH(F.x,F.y)+Math.max(90,210-F.t*4),vh:0,add:true,c:[1,.95,.8],s:46*fade+8,d:.2,a:.55*fade});}}
  for(const L of MLIGHTS){if(L.intensity>0){L.intensity=Math.max(0,L.intensity*(1-dt/L.userData.d*2.2));if(L.intensity<.05*LUX)L.intensity=0;}}
  for(const L of LIGHTS){if(L.intensity>0){L.userData.t+=dt;L.intensity=Math.max(0,L.intensity*(1-dt/L.userData.d*2.2));if(L.intensity<.05*LUX)L.intensity=0;}}
  for(const S of SHOCKS){if(S.t>=S.d){if(S.m.material.opacity){S.m.material.opacity=0;S.m.scale.setScalar(.001);}continue;}S.t+=dt;const k=Math.min(1,S.t/S.d),e=1-(1-k)*(1-k)*(1-k);S.m.scale.setScalar(S.r0+(S.r1-S.r0)*e);S.m.material.opacity=S.a0*(1-k)*(1-k);}
  for(let i=FIRES.length-1;i>=0;i--){const F=FIRES[i];F.t+=dt;if(F.t>=F.d){FIRES.splice(i,1);continue;}if(!inView(F.x,F.y,.3))continue;const life=1-F.t/F.d;F.acc+=dt*(F.big?16:9)*(.4+.6*life);
    while(F.acc>=1){F.acc-=1;const a=rnd(0,6.28),r=rnd(0,F.r);const fx=F.x+Math.cos(a)*r,fy=F.y+Math.sin(a)*r;
      // flames always; smoke only while the screen isn't already busy with particles (large smoke is the costliest pixel work)
      if(Math.random()<.75)part({x:fx,y:fy,h:F.g+rnd(1,4),vh:rnd(14,30),rise:rnd(4,10),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(5,9)*(.6+.4*life),g:3,d:rnd(.35,.7),a:.75});
      else if(PARTS.length<pBudget()*.6)part({x:fx,y:fy,h:F.g+rnd(6,12),vx:rnd(-4,4),vy:rnd(-4,4),rise:rnd(14,F.big?34:24),c:Math.random()<.6?C_DARK:C_SMOKE,c2:[.45,.43,.4],ck:.35,s:rnd(8,13)*(F.big?1.35:1),g:F.big?9:5,d:rnd(2,F.big?4.5:3.2),a:.4});}}
  // smoke columns: thick at the base, spreading and leaning downwind as they climb (rate halves on phones and when busy)
  {const PH=fxPH(),B=pBudget();for(let i=COLS.length-1;i>=0;i--){const C=COLS[i];C.t+=dt;if(C.t>=C.d||C.G0!==G){COLS.splice(i,1);continue;}if(!inView(C.x,C.y,.35)||PARTS.length>B*.8)continue;
    const life=1-C.t/C.d;C.acc+=dt*(C.big?9:5)*(PH?.5:1)*(.35+.65*life)*(PARTS.length>B*.55?.5:1);
    while(C.acc>=1){C.acc-=1;const fx=C.x+rnd(-6,6),fy=C.y+rnd(-6,6);part({x:fx,y:fy,h:C.g+rnd(6,14),vx:rnd(6,12),vy:rnd(-3,3),vh:rnd(4,10),f:.4,rise:rnd(28,42)*(C.big?1.15:1),c:Math.random()<.65?C_DARK:[.2,.19,.18],c2:[.42,.4,.37],ck:.35,s:PH?rnd(7,10):rnd(12,18),g:PH?8:rnd(12,18),d:PH?rnd(3.5,5):rnd(5,7.5),a:.5*life+.15});}}}
  flagTick(dt);
  for(const p of PINGS)p.t+=dt;for(let i=PINGS.length-1;i>=0;i--)if(PINGS[i].t>=PINGS[i].d)PINGS.splice(i,1);
  washTick();wakeTick(dt);dustN=0;
  gpuGcHook();gcT-=dt;if(gcT<=0){gcT=15;try{gpuGc();}catch(e){console.warn('gpu gc',e);}}
  if(G&&G.map&&G.map.theme==='snow'&&CAM&&typeof cam!=='undefined'){const n=Math.min(30,dt*Math.min(150,cam.dist*.16))|0;const R=Math.max(500,cam.dist*1.1);for(let i=0;i<n+(Math.random()<dt*20?1:0);i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(60,260),vx:rnd(8,22),vy:rnd(-4,6),vh:-rnd(26,40),f:1,c:[1.05,1.08,1.12],s:rnd(1.4,2.4),d:rnd(4,6.5),a:.85});}}
  try{weatherFX(dt);}catch(e){}
  shake*=Math.exp(-7*dt);flash=Math.max(0,flash-dt*1.6);}
// Weather on screen: rain streaks, blowing sand, heavy snow and thick fog close in the view; the haze colour and
// distance ease in and out as the weather changes.
let RAIN=null,WXV={k:'clear',m:0};
function weatherFX(dt){if(!G||!G.map||!CAM)return;if(G.todM===3&&Math.round(todSeg(G.t).d*20)!==WXT)try{applyWeather(0);}catch(e){}const k=(G.wx&&G.wx.k)||'clear';if(WXV.base==null&&SCN.fog){WXV.base={c:SCN.fog.color.clone(),n:SCN.fog.near,f:SCN.fog.far};}const B=WXV.base;if(!B)return;
  if(WXV.k!==k){WXV.m=Math.max(0,WXV.m-dt*.5);if(WXV.m<=0)WXV.k=k;}else WXV.m=Math.min(1,WXV.m+dt*.35);const m=WXV.k==='clear'?0:WXV.m,K=WXV.k;
  const T={rain:{c:'#7d868c',n:500,f:3200},fog:{c:'#b9bdbb',n:150,f:1500},sandstorm:{c:'#b88a52',n:30,f:720},blizzard:{c:'#dfe6ee',n:150,f:1700},snow:{c:'#e3e9f0',n:220,f:2300}}[K];
  if(T){const tc=lin(T.c);SCN.fog.color.copy(B.c).lerp(tc,m*.85);SCN.fog.near=B.n+(T.n-B.n)*m;SCN.fog.far=B.f+(T.f-B.f)*m;}else{SCN.fog.color.lerp(B.c,Math.min(1,dt*2));SCN.fog.near+=(B.n-SCN.fog.near)*Math.min(1,dt*2);SCN.fog.far+=(B.f-SCN.fog.far)*Math.min(1,dt*2);}
  const R=Math.max(420,cam.dist*1.1);
  if(K==='sandstorm'&&m>.05){const n=(dt*90*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(2,60),vx:rnd(90,160),vy:rnd(-15,15),vh:rnd(-4,8),f:.9,c:[.78,.6,.38],s:rnd(18,36),g:22,d:rnd(1.6,2.8),a:.3*m});}}
  if((K==='blizzard'||K==='snow')&&m>.05){const n=(dt*(K==='snow'?(SET.gfx==='low'?35:70):120)*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(40,220),vx:rnd(50,90),vy:rnd(-10,14),vh:-rnd(30,50),f:1,c:[1.05,1.08,1.12],s:rnd(1.6,2.8),d:rnd(3,5),a:.9});}}
  if(K==='rain'){if(!RAIN){const N=1400,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6),3).setUsage(THREE.DynamicDrawUsage));RAIN=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xaab4be,transparent:true,opacity:.35,depthWrite:false}));RAIN.frustumCulled=false;RAIN.userData.d=[];for(let i=0;i<N;i++)RAIN.userData.d.push([rnd(-1,1),rnd(-1,1),rnd(0,1)]);SCN.add(RAIN);}
    RAIN.visible=m>.02;RAIN.material.opacity=.35*m;const p=RAIN.geometry.attributes.position.array,D=RAIN.userData.d,H=320;
    for(let i=0;i<D.length;i++){const d=D[i];d[2]-=dt*1.6;if(d[2]<0){d[2]+=1;d[0]=rnd(-1,1);d[1]=rnd(-1,1);}const x=cam.x+d[0]*R,y=cam.y+d[1]*R*.7,gh=groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y))),h=gh+d[2]*H;p.set([x,h,y,x+3,h+14,y],i*6);}
    RAIN.geometry.attributes.position.needsUpdate=true;}else if(RAIN)RAIN.visible=false;
  const el=document.getElementById('wxchip');if(el){const W=WEATHER[k];const tl=G.todM?todLvl():0,tn=tl===2?'NIGHT':tl===1?(G.todM===3&&(G.t%1200)>=800?'DAWN':'DUSK'):'';const on=k!=='clear'||!!tn;el.hidden=!on;if(on){const txt=(tn?tn+(k!=='clear'?' · ':' · sight '+(tl===2?'-40%':'-20%')+', thermal optics see further'):'')+(k!=='clear'?`${W.name.toUpperCase()} · vision ${Math.round((W.vis-1)*100)}% · accuracy ${Math.round((W.acc-1)*100)}%${W.air===0?' · jets grounded':''}`:'');if(el.textContent!==txt)el.textContent=txt;}}}
/* ---------- Helicopter rotor wash ----------
   A helicopter's downwash blasts whatever is under it: a ring of dust rolls outward on land (powder snow on snow maps),
   white spray and a flattened, swirling ring on water. Strongest when the helicopter hovers low and slow; a fast pass
   leaves a thinner trail. Purely visual: it reads the unit and where it is drawn and never touches the battle.
   It uses the shared particle pool plus 6 ground rings made once at start-up and reused, so a long battle allocates
   nothing new on the GPU. On phones / low quality it spawns fewer particles and backs off when the screen is busy. */
const WASH=[];let washFr=0;
function initWash(){WASH.length=0;const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,63);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.35,'rgba(255,255,255,.12)');g.addColorStop(.62,'rgba(255,255,255,.6)');g.addColorStop(.8,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
  x.globalCompositeOperation='destination-out';for(let i=0;i<46;i++){const a=Math.random()*6.283,w=.03+Math.random()*.07;x.fillStyle=`rgba(0,0,0,${.25+Math.random()*.5})`;x.beginPath();x.moveTo(64,64);x.arc(64,64,64,a,a+w);x.closePath();x.fill();}
  const tex=new THREE.CanvasTexture(c),geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  for(let i=0;i<6;i++){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,color:0xffffff,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.visible=false;m.renderOrder=2;m.frustumCulled=false;SCN.add(m);WASH.push({m,fr:-9,id:-1});}}
function rotorWash(e,o,dt){if(!e||e.landed||!o||!G||!G.map||!WASH.length||!inView(e.x,e.y,.15))return;
  // what is underneath: a bridge deck counts as land (same deck height the units drive on), open water gets spray
  const M=G.map,ud=o.userData,gc=G.grid?G.grid[Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL)]:0,deck=gc===2,wet=!deck&&!!(M.isWater&&M.isWater(e.x,e.y)),gh=groundH(e.x,e.y),sh=deck?Math.max(gh,4):wet?Math.max(gh,WL):gh,snow=M.theme==='snow',ice=wet&&snow;
  const px=o.position.x,pz=o.position.z,sp=ud.wpx==null?0:Math.min(400,Math.hypot(px-ud.wpx,pz-ud.wpz)/Math.max(dt,1e-3));ud.wpx=px;ud.wpz=pz;ud.wsp=(ud.wsp||0)+(sp-(ud.wsp||0))*Math.min(1,dt*4);
  const agl=o.position.y-sh,low=Math.max(0,Math.min(1,(115-agl)/75));if(low<=0)return;
  const fast=Math.min(1,ud.wsp/Math.max(60,(e.s&&e.s.spd)||95)),k=low*(1-.55*fast),R0=Math.max(12,(e.r||14)*1.25);
  // ground ring: one pooled disc follows this helicopter (the same one each frame), spinning and breathing with the rotor
  let D=null;for(const w of WASH)if(w.id===e.id&&w.fr!==washFr){D=w;break;}if(!D)for(const w of WASH)if(w.fr<washFr-1){D=w;break;}
  if(D){D.id=e.id;D.fr=washFr;const m=D.m,col=wet&&!ice?[.92,.96,1]:snow?[.95,.97,1]:M.theme==='green'?[.78,.72,.58]:[.86,.75,.56];m.material.color.setRGB(col[0],col[1],col[2]);
    m.visible=true;m.material.opacity=(wet&&!ice?.45:.55)*k;m.position.set(px,sh+(wet?.6:1),pz);m.scale.setScalar(R0*(3+.18*Math.sin(G.t*6+e.id))*(1-.25*fast));m.rotation.y+=dt*(wet?2.4:3.2);}
  // particles: spawn rate follows the quality budget and backs off when the screen is already full of smoke. They start
  // ~10 above the surface because soft particles fade out where they touch the ground and would vanish at ground level
  const B=pBudget(),busy=PARTS.length>B*.75?.3:PARTS.length>B*.5?.65:1;ud.wacc=(ud.wacc||0)+dt*(wet?30:32)*k*busy*(B/1400);
  let n=0;while(ud.wacc>=1&&n<6){ud.wacc-=1;n++;const a=rnd(0,6.283),ca=Math.cos(a),sa=Math.sin(a),r=R0*rnd(.45,1),v=rnd(55,100)*(.55+.45*low),x=px+ca*r,y=pz+sa*r;
    if(wet&&!ice){part({x,y,h:sh+rnd(6,12),vx:ca*v,vy:sa*v,vh:rnd(3,9),f:.4,c:[.88,.92,.95],s:rnd(5,9),g:rnd(16,24),d:rnd(.9,1.4),a:.26+.16*low});
      if(Math.random()<.6)part({x,y,h:sh+1,vx:ca*v*.7,vy:sa*v*.7,vh:rnd(25,55),f:.85,grav:1,c:[1,1,1],s:rnd(1.2,2),d:rnd(.35,.6),a:.85});}
    else{const c=snow?[.94,.96,1]:M.theme==='green'?[.68,.63,.52]:C_DUST;part({x,y,h:sh+rnd(9,17),vx:ca*v,vy:sa*v,vh:rnd(4,14),f:.38,c,s:rnd(10,16),g:rnd(18,28),d:rnd(1.2,1.9),a:.4+.22*low});}}
  if(n>=6)ud.wacc=0;}
function washTick(){for(const w of WASH)if(w.fr!==washFr&&w.m.visible){w.m.visible=false;w.id=-1;}washFr++;}
/* ---------- Vehicle dust trails ----------
   Tanks, trucks and other ground vehicles moving at speed kick a low, rolling plume of dust off their tracks/wheels
   that drifts and fades out behind them. Desert ground throws the thickest, sand-coloured dust; green maps a thinner
   earthy haze; snow maps a faint white powder. Nothing on water, on bridge decks or while it rains (wet ground).
   A slow or stopped vehicle leaves none. Purely visual: it reads where the vehicle is drawn and never touches the
   battle or its random numbers. It uses the shared particle pool (like rotor wash) with a cap per frame, spawns fewer
   on phones / low quality and backs off when the screen is already full of smoke. */
const DUSTC_HARD=[[.66,.65,.62],[.58,.57,.55],[.74,.73,.7]];const DUSTC={desert:[[.86,.76,.6],[.8,.69,.53],[.9,.83,.7]],green:[[.6,.55,.45],[.53,.49,.41],[.66,.62,.54]],snow:[[.95,.97,1],[.9,.93,.97],[.97,.98,1]]};
let dustN=0;
function dustTrail(e,o,dt){if(!o||!o.visible||!(dt>0)||!e.s||!G||!G.map)return;const ud=o.userData,px=o.position.x,pz=o.position.z;
  const raw=ud.tdx==null?0:Math.min(300,Math.hypot(px-ud.tdx,pz-ud.tdz)/dt);ud.tdx=px;ud.tdz=pz;ud.tsp=(ud.tsp||0)+(raw-(ud.tsp||0))*Math.min(1,dt*3);
  const top=Math.max(35,e.s.spd||60),k=Math.max(0,Math.min(1,(ud.tsp/top-.3)/.45));if(k<=0||!inView(px,pz,.2)){ud.tacc=0;return;}
  // what is underfoot: water and bridge decks throw no dust; rain wets the ground (snow maps keep their powder)
  const M=G.map,th=M.theme==='snow'?'snow':M.theme==='green'?'green':'desert',gc=G.grid?G.grid[Math.floor(pz/CELL)*GW+Math.floor(px/CELL)]:0;
  if(gc===2||(M.isWater&&M.isWater(px,pz))||(G.wx&&G.wx.k==='rain'&&th!=='snow')){ud.tacc=0;return;}
  const B=pBudget(),n0=PARTS.length;if(n0>B*.7)return;const busy=n0>B*.45?.5:1,amp=(th==='desert'?1:th==='green'?.6:.45)*(G.wx&&G.wx.k==='sandstorm'?1.7:1);
  const r=e.r||12,sc=Math.min(1.5,Math.max(.8,r/12));ud.tacc=(ud.tacc||0)+dt*16*k*amp*busy*Math.min(1.2,B/1400)*sc;
  const a=ud.yaw??e.va??0,ca=Math.cos(a),sa=Math.sin(a),C=DUSTC[th],gh=groundH(px,pz),cap=B>=1100?28:16;let n=0;
  while(ud.tacc>=1&&n<3&&dustN<cap){ud.tacc-=1;n++;dustN++;const sd=(ud.tsd=-(ud.tsd||1)),w=r*rnd(.45,.65),bk=r*rnd(.75,1.05),x=px-ca*bk-sa*sd*w,y=pz-sa*bk+ca*sd*w,ov=rnd(4,12),bv=rnd(8,20)*(.5+k);
    part({x,y,h:gh+rnd(4,8),vx:-ca*bv-sa*sd*ov,vy:-sa*bv+ca*sd*ov,vh:rnd(2,6),f:.3,rise:rnd(1.5,4.5),c:C[n&1],c2:C[2],ck:.6,s:rnd(7,10)*sc*(th==='snow'?.8:1),g:rnd(9,14)*sc,d:rnd(2.2,3.4)*(th==='snow'?.7:1),a:(th==='snow'?.26:.46)*(.55+.45*k)});}
  if(ud.tacc>1)ud.tacc=1;}
/* ---------- Ricochet sparks ----------
   Rifle and machine-gun rounds striking a tank or other armoured vehicle throw a few bright, short-lived sparks off
   the hull (back toward the shooter) instead of a puff of dirt. Visual only: it looks up what was hit without changing
   anything. The sim aims each round at its target's centre (give or take 4 units), so the unit whose centre is nearest
   the impact point IS the real target: sparks only when that unit is an armoured vehicle, never for a soldier who
   happens to stand beside a tank. */
const RICO_NB=[];
function ricoHit(x,y){if(!G||!G.ents||!inView(x,y,.05))return false;let best=null,bd=64;try{nearby(x,y,16,RICO_NB);for(let i=0;i<RICO_NB.length;i++){const e=RICO_NB[i];if(e.dead||e.isB||!e.s||e.s.dom!=='ground')continue;const d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;best=e;}}}catch(err){}RICO_NB.length=0;return !!best&&best.s.armor==='heavy';}
const C_RICO=[3,2.5,1.5];
function ricochet(x1,y1,x,y){const h=groundH(x,y)+rnd(5,10),b=Math.atan2(y1-y,x1-x);part({x,y,h,s:2.4,d:.045,add:true,c:C_RICO});
  const n=3+(Math.random()*3|0);for(let i=0;i<n;i++){const a=b+rnd(-1.4,1.4),v=rnd(60,150);part({x,y,h,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(15,80),add:true,c:i&1?C_SPARK:C_RICO,s:rnd(.7,1.2),f:.5,grav:1,d:rnd(.1,.26)});}}
/* ---------- Naval wakes ----------
   A moving boat or ship leaves a white V of foam on the water that spreads out and fades behind it, a churned
   white trail straight behind the stern and a curl of bow wave at the front. Faster boats throw a wider, brighter
   wake; a stopped boat leaves none. The V is built from foam "bars" laid across the boat's path: each bar widens
   with age at the speed the boat was doing (the real ~19 degree wake angle), so the ends of older bars trace the two
   arms of the V. Purely visual: it reads where the boat is drawn and never touches the battle or its random numbers.
   All of it is one pooled mesh (one draw call, nothing allocated during a battle); phones get shorter, fewer marks. */
const NWAKE={n:0,m:null,pos:null,uv:null,al:null,Q:[],qi:0,fr:0,NB:12};
function initWake(){const NQ=NWAKE.NB+300;NWAKE.n=NQ;
  const W=512,H=128,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const blob=(cx,cy,r,a)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);};
  // cell 0 (u 0-.25): the two V arms, thin broken foam lines at either end of the bar
  for(let i=0;i<70;i++){const sd=i&1,v=6+Math.random()*116;blob(sd?128-9+Math.random()*-6:9+Math.random()*6,v,3+Math.random()*5,.35+Math.random()*.4);}
  for(let i=0;i<40;i++){const sd=i&1,v=Math.random()*128;blob(sd?128-22-Math.random()*14:22+Math.random()*14,v,2+Math.random()*4,.12+Math.random()*.15);}
  // cell 1: churned foam straight behind the stern, dense in the middle, broken at the edges
  for(let i=0;i<150;i++){const u=128+64+(Math.random()+Math.random()+Math.random()-1.5)*60,v=8+Math.random()*112;blob(u,v,3+Math.random()*7,.18+Math.random()*.35);}
  // cell 2: bow wave, two curling foam arcs meeting at the front (v=0 is the back of the quad, top of canvas = front)
  for(let i=0;i<120;i++){const t=Math.random(),sd=Math.random()<.5?-1:1,u=256+64+sd*(4+58*Math.pow(t,.8)),v=6+t*112;blob(u+(Math.random()-.5)*6,v,2.5+Math.random()*4*(.5+t),.3+Math.random()*.45*(1-t*.5));}
  // soften every cell towards its front/back edges so overlapping marks blend into one continuous trail
  // (done on the pixels: 'destination-in' would wipe the other cells, since it clears everything outside what it draws)
  const id=x.getImageData(0,0,W,H),D=id.data,ss=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
  for(let py=0;py<H;py++){const v=1-py/(H-1),kt=Math.min(ss(v/.18),ss((1-v)/.18)),kb=Math.min(.45+.55*ss((1-v)/.15),ss(v/.25));
    for(let px=0;px<W;px++){const o=(py*W+px)*4+3;D[o]=D[o]*(px<256?kt:kb);}}
  x.putImageData(id,0,0);
  const tex=new THREE.CanvasTexture(c);
  const g=new THREE.BufferGeometry();NWAKE.pos=new Float32Array(NQ*12);NWAKE.uv=new Float32Array(NQ*8);NWAKE.al=new Float32Array(NQ*4);const idx=new Uint16Array(NQ*6);
  for(let i=0;i<NQ;i++){idx.set([i*4,i*4+2,i*4+1,i*4+1,i*4+2,i*4+3],i*6);NWAKE.Q.push({on:0,t:0,L:1,x:0,z:0,ca:1,sa:0,w0:1,sp:0,len:1,a0:0,c:0,f:0,id:-1,fr:-9});}
  g.setIndex(new THREE.BufferAttribute(idx,1));g.setAttribute('position',new THREE.BufferAttribute(NWAKE.pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('uv',new THREE.BufferAttribute(NWAKE.uv,2).setUsage(THREE.DynamicDrawUsage));g.setAttribute('wa',new THREE.BufferAttribute(NWAKE.al,1).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{map:{value:null},ice:{value:0}}]),transparent:true,depthWrite:false,fog:true,side:THREE.DoubleSide,
    vertexShader:`attribute float wa;varying float va;varying vec2 vu;
#include <fog_pars_vertex>
void main(){va=wa;vu=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader:`uniform sampler2D map;uniform float ice;varying float va;varying vec2 vu;
#include <fog_pars_fragment>
void main(){float a=texture2D(map,vu).a*va*1.5;if(a<.004)discard;gl_FragColor=vec4(mix(vec3(.9,.95,.97),vec3(.75,.78,.8),ice),min(1.,a));
#include <fog_fragment>
}`});
  mat.uniforms.map.value=tex;mat.uniforms.ice.value=G&&G.map&&G.map.theme==='snow'?1:0;
  NWAKE.m=new THREE.Mesh(g,mat);NWAKE.m.frustumCulled=false;NWAKE.m.renderOrder=2;NWAKE.m.visible=false;SCN.add(NWAKE.m);}
function wakeQ(x,z,ca,sa,w0,sp,len,a0,c,L){const N=NWAKE.n-NWAKE.NB,q=NWAKE.Q[NWAKE.NB+(NWAKE.qi++%N)];q.on=1;q.t=0;q.L=L;q.x=x;q.z=z;q.ca=ca;q.sa=sa;q.w0=w0;q.sp=sp;q.len=len;q.a0=a0;q.c=c;q.f=Math.random()<.5?1:0;}
function shipWake(e,o,dt){if(!NWAKE.m||!o||!o.visible||!(dt>0)||!e.s)return;const ud=o.userData,px=o.position.x,pz=o.position.z;
  const raw=ud.kpx==null?0:Math.min(300,Math.hypot(px-ud.kpx,pz-ud.kpz)/dt);ud.kpx=px;ud.kpz=pz;ud.ksp=(ud.ksp||0)+(raw-(ud.ksp||0))*Math.min(1,dt*3);
  const sp=ud.ksp,top=Math.max(30,e.s.spd||60),k=Math.max(0,Math.min(1,(sp/top-.08)/.55));if(k<=0){ud.kod=0;return;}
  const a=e.va||0,ca=Math.cos(a),sa=Math.sin(a),r=e.r||14,big=r>20,lv=(typeof QUAL!=='undefined'&&fxLv())||0,near=inView(px,pz,.35);
  // bow wave: a pooled slot that follows this boat (the same one each frame)
  if(near){let B=null;for(let i=0;i<NWAKE.NB;i++){const q=NWAKE.Q[i];if(q.id===e.id&&q.fr!==NWAKE.fr){B=q;break;}}if(!B)for(let i=0;i<NWAKE.NB;i++){const q=NWAKE.Q[i];if(q.fr<NWAKE.fr-1){B=q;break;}}
    if(B){B.id=e.id;B.fr=NWAKE.fr;B.on=1;B.c=2;B.f=0;B.t=0;B.L=1e9;B.sp=0;const bl=r*(1.05+.35*k);B.x=px+ca*(r*.95-bl*.5);B.z=pz+sa*(r*.95-bl*.5);B.ca=ca;B.sa=sa;B.w0=r*(.95+.5*k);B.len=bl;B.a0=(.45+.4*k)*(.9+.1*Math.sin(G.t*9+e.id));}}
  // trail: a foam bar (V arms) and a churned patch every ds of travel, laid at the stern
  const ds=r*(big?.8:.9);ud.kod=(ud.kod||0)+sp*dt;if(ud.kod<ds)return;ud.kod%=ds;if(!near&&!inView(px,pz,.8))return;
  const L=(big?4.6:3.4)*(lv>=3?.6:lv>=1?.8:1),sx=px-ca*r*.85,sz=pz-sa*r*.85;
  wakeQ(sx,sz,ca,sa,r*.85,sp*.72+4,ds*2,.62*k,0,L);
  wakeQ(sx-ca*ds*.3,sz-sa*ds*.3,ca,sa,r*.7,sp*.09+3,ds*2.3,.55*(.4+.6*k),1,L*.7);}
function wakeTick(dt){if(!NWAKE.m)return;const P=NWAKE.pos,U=NWAKE.uv,A=NWAKE.al,h=WL+.35;let any=false;
  for(let i=0;i<NWAKE.n;i++){const q=NWAKE.Q[i];if(i<NWAKE.NB&&q.on&&q.fr<NWAKE.fr-1){q.on=0;q.id=-1;}if(q.on&&i>=NWAKE.NB){q.t+=dt;if(q.t>=q.L)q.on=0;}
    if(!q.on){if(A[i*4]!==0){A[i*4]=A[i*4+1]=A[i*4+2]=A[i*4+3]=0;P.fill(0,i*12,i*12+12);}continue;}any=true;
    const u=q.t/q.L,w=(q.w0+q.sp*q.t)*.5,l=q.len*.5*(1+u*.35),fa=q.a0*Math.min(1,q.t/.12+(i<NWAKE.NB?1:0))*Math.pow(1-u,1.6)*(q.c===0?1/(1+q.sp*q.t/(q.w0*16)):1);
    const fx=q.ca*l,fz=q.sa*l,sx=-q.sa*w,sz=q.ca*w,o=i*12;
    // corners: back-left, back-right, front-left, front-right (u across the path, v along it)
    P[o]=q.x-fx-sx;P[o+1]=h;P[o+2]=q.z-fz-sz;P[o+3]=q.x-fx+sx;P[o+4]=h;P[o+5]=q.z-fz+sz;P[o+6]=q.x+fx-sx;P[o+7]=h;P[o+8]=q.z+fz-sz;P[o+9]=q.x+fx+sx;P[o+10]=h;P[o+11]=q.z+fz+sz;
    const u0=q.c*.25+.002,u1=u0+.246,v0=q.f?1:0,v1=1-v0,b=i*8;U[b]=u0;U[b+1]=v0;U[b+2]=u1;U[b+3]=v0;U[b+4]=u0;U[b+5]=v1;U[b+6]=u1;U[b+7]=v1;
    A[i*4]=A[i*4+1]=A[i*4+2]=A[i*4+3]=fa;}
  NWAKE.fr++;NWAKE.m.visible=any;if(any){const g=NWAKE.m.geometry;g.attributes.position.needsUpdate=true;g.attributes.uv.needsUpdate=true;g.attributes.wa.needsUpdate=true;}}
/* ---------- Shader warm-up ----------
   The first time a new kind of object is drawn (a missile, a burnt-out wreck, an aircraft...) the graphics driver has to
   compile its shader, which can stall the game for a moment - several at once during a big strike felt like a freeze.
   While the battle loads, every model and its burnt-wreck version is drawn once out of sight so all shaders are ready. */
function warmShaders(){if(!R3||!SCN||!CAM||!G||G.headless)return;mats();const t0=performance.now();const grp=new THREE.Group();
  const [bx,by]=BASES[ME]||[MAPW/2,MAPH/2];grp.position.set(bx,groundH(bx,by),by);
  const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};
  const add=o=>{if(!o)return;o.traverse(c=>{c.frustumCulled=false;if(c.isMesh)c.castShadow=true;});grp.add(o);};
  const teams=[G.teams[ME],null];
  for(const k of Object.keys(MODELS.proto||{}))for(const T of teams){let o=null;try{o=instModel(k,T,'y',12);}catch(e){}if(!o)continue;add(o);
    if(T){try{const w=cloneLite(o);w.visible=true;w.traverse(c=>{c.matrixWorldAutoUpdate=true;if(c.isMesh)c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);if(c.isSkinnedMesh)c.visible=false;});add(w);}catch(e){}}}
  // the merged one-mesh soldier (mergeSoldier) is its own shader variant (skinned + vertex colours)
  if(typeof mergeSoldier==='function')for(const T of teams){try{const o=instModel('soldier',T,'y',12);if(o&&mergeSoldier(o,'warm|'+(T?T.color+T.fac:'')))add(o);}catch(e){}}
  try{add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),bm(MAT.std)));add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),MAT.std));if(typeof gearVCMat==='function'){const gm=gearVCMat();const gg=new THREE.BoxGeometry(2,2,2);const cc=new Float32Array(gg.attributes.position.count*3).fill(.5);gg.setAttribute('color',new THREE.BufferAttribute(cc,3));add(new THREE.Mesh(gg,gm));add(new THREE.Mesh(gg,bm(gm)));}}catch(e){}
  for(const op of [.8,.12])add(new THREE.Mesh(new THREE.CircleGeometry(4,8),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:op,depthWrite:false})));
  // shockwave rings: drawn once, faintly and in view, so the GPU has their exact drawing state ready too
  const shk=SHOCKS.map(S=>[S.m.position.clone(),S.m.scale.x,S.m.material.opacity]);for(const S of SHOCKS){S.m.position.set(bx,groundH(bx,by)+2.5,by);S.m.scale.setScalar(60);S.m.material.opacity=.01;}
  const W0=WASH[0];if(W0){W0.m.visible=true;W0.m.material.opacity=.01;W0.m.position.set(bx,groundH(bx,by)+2.5,by);W0.m.scale.setScalar(60);}
  // With post-processing on, the battle is only ever drawn into the post-processing target, never straight to the
  // screen (which needs different shader variants), so the warm-up prepares those variants only: one scene draw, not two.
  // first strike / big explosion used to compile ~20 shaders in one frame (a multi-second freeze): missiles, flames and rock chunks are prepared here
  try{if(typeof mslWarm==='function')mslWarm(grp);if(!CHUNKG)CHUNKG=[0,1,2,3,4].map(i=>rockGeo(40+i*7,0,.6+i*.07,.55));const rk=new THREE.Mesh(CHUNKG[0],chunkMat('#4a4034'));rk.castShadow=true;rk.frustumCulled=false;rk.scale.setScalar(2);grp.add(rk);}catch(e){}
  SCN.add(grp);try{if(typeof placeCam==='function')placeCam();const post=typeof renderPost==='function'&&POST.on&&POST.mFinal;if(post){sizePost();R3.setRenderTarget(POST.rt);}R3.compile(SCN,CAM);if(typeof renderPost==='function'){CAM.updateMatrixWorld();renderPost();}R3.setRenderTarget(null);if(!post)R3.render(SCN,CAM);}catch(e){console.warn('shader warm-up',e);}SCN.remove(grp);SHOCKS.forEach((S,i)=>{S.m.position.copy(shk[i][0]);S.m.scale.setScalar(shk[i][1]);S.m.material.opacity=shk[i][2];});
  console.log('shader warm-up',Math.round(performance.now()-t0)+' ms, '+grp.children.length+' objects');}

// Phones: the same warm-up, but light and spread over frames, so a phone never sits for a minute on one frame (Safari on
// iPhone compiles shaders slowly and can drop the whole graphics context after one huge frame): only the models of the
// nations in this battle, only the player's own team variant (team colour is a shader input, not a separate shader),
// burnt wreck variants once per kind of material, a few models per frame with progress on the loading screen, a texture
// memory budget, and a stop flag the loading watchdog sets (whatever isn't prepared then is prepared when first seen).
// onProg(done,total) reports progress. Resolves when done or stopped.
async function warmShadersPhone(onProg,stop){if(!R3||!SCN||!CAM||!G||G.headless)return;mats();const t0=performance.now();
  const [bx,by]=BASES[ME]||[MAPW/2,MAPH/2],T=G.teams[ME],gy=groundH(bx,by);
  const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};
  const want=new Set(typeof modelKeysFor==='function'?modelKeysFor(G.teams.map(q=>q.fac)):[]);
  const keys=Object.keys(MODELS.proto||{}).filter(k=>!want.size||want.has(k));
  const sig=new Set(),texSeen=new Set();let texB=0;const TEXMAX=192*1048576;let nObj=0,nBatch=0;
  const frame=()=>new Promise(r=>{let d=0;const go=()=>{if(!d){d=1;r();}};try{requestAnimationFrame(()=>setTimeout(go,0));}catch(e){}setTimeout(go,120);});
  const upTex=o=>o.traverse(c=>{if(!c.isMesh)return;for(const m of (Array.isArray(c.material)?c.material:[c.material]))for(const p of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap']){const t=m&&m[p];if(!t||texSeen.has(t))continue;texSeen.add(t);
    const im=t.image||{},b=(im.width||0)*(im.height||0)*4*1.33;if(texB+b>TEXMAX)continue;texB+=b;try{R3.initTexture(t);}catch(e){}}});
  const BATCH=4;
  for(let i=0;i<keys.length;i+=BATCH){if(stop&&stop())break;if(window.GLLOST)break;const grp=new THREE.Group();grp.position.set(bx,gy,by);
    for(const k of keys.slice(i,i+BATCH)){let o=null;try{o=instModel(k,T,'y',12);}catch(e){}if(!o)continue;o.traverse(c=>{c.frustumCulled=false;if(c.isMesh)c.castShadow=true;});grp.add(o);
      // a burnt copy only for a kind of material not seen yet (most wrecks share a handful of burnt shaders)
      let s='';o.traverse(c=>{if(c.isMesh&&!c.isSkinnedMesh){const m=Array.isArray(c.material)?c.material[0]:c.material;if(m)s+=m.type+(m.map?'m':'')+(m.normalMap?'n':'')+(m.vertexColors?'v':'')+'|';}});
      if(s&&!sig.has(s)){sig.add(s);try{const w=cloneLite(o);w.visible=true;w.traverse(c=>{c.matrixWorldAutoUpdate=true;if(c.isMesh)c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);if(c.isSkinnedMesh)c.visible=false;});grp.add(w);}catch(e){}}}
    nObj+=grp.children.length;nBatch++;SCN.add(grp);
    try{const post=typeof renderPost==='function'&&POST.on&&POST.mFinal;if(post){sizePost();R3.setRenderTarget(POST.rt);}
      // compileAsync uses the browser's background shader compiling where it has it; the watchdog below never lets
      // a program that never reports ready hold the loading screen
      const p=R3.compileAsync(grp,CAM,SCN);R3.setRenderTarget(null);
      await Promise.race([p,new Promise(r=>setTimeout(r,4000))]);upTex(grp);}catch(e){console.warn('phone warm-up',e);}
    SCN.remove(grp);if(onProg)try{onProg(Math.min(keys.length,i+BATCH),keys.length);}catch(e){}await frame();}
  // the merged one-mesh soldier and the shared plain materials
  if(!(stop&&stop())&&!window.GLLOST){const grp=new THREE.Group();grp.position.set(bx,gy,by);
    try{if(typeof mergeSoldier==='function'){const o=instModel('soldier',T,'y',12);if(o&&mergeSoldier(o,'warm|'+T.color+T.fac))grp.add(o);}}catch(e){}
    try{grp.add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),bm(MAT.std)));grp.add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),MAT.std));if(typeof gearVCMat==='function'){const gm=gearVCMat();const gg=new THREE.BoxGeometry(2,2,2);gg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count*3).fill(.5),3));grp.add(new THREE.Mesh(gg,gm));grp.add(new THREE.Mesh(gg,bm(gm)));}}catch(e){}
    grp.traverse(c=>{c.frustumCulled=false;});SCN.add(grp);
    // and the battlefield itself (ground, scenery, buildings), drawn into the post-processing target as in the battle
    try{if(typeof placeCam==='function')placeCam();const post=typeof renderPost==='function'&&POST.on&&POST.mFinal;if(post){sizePost();R3.setRenderTarget(POST.rt);}const p=R3.compileAsync(SCN,CAM);R3.setRenderTarget(null);await Promise.race([p,new Promise(r=>setTimeout(r,6000))]);}catch(e){console.warn('phone warm-up',e);}
    SCN.remove(grp);}
  console.log('shader warm-up (phone)',Math.round(performance.now()-t0)+' ms, '+keys.length+' models, '+nObj+' objects in '+nBatch+' steps, textures '+Math.round(texB/1048576)+' MB'+(stop&&stop()?' (stopped by the loading watchdog)':''));}

/* ---------- GPU memory clean-up ----------
   Units, wrecks, rubble and effects create their own small shapes (selection rings, contact shadows, soldier kit,
   rotors, flags, debris...). Removing an object from the scene does not free its GPU buffers, so a long battle kept
   piling them up (growing memory, stutter, at worst a lost graphics context). Everything removed from the scene is
   queued; every 15 s, shapes and canvas textures no longer drawn anywhere are freed. Shared model shapes are never
   touched, and freeing is safe anyway: three.js simply re-uploads a shape if it is ever drawn again. Materials are left
   alone (freeing one could force a shader recompile later). */
const GCQ=[];let GC_PROTO=null,gcT=15;
function gpuGcHook(){if(!SCN||SCN.__gc)return;const rm=SCN.remove.bind(SCN);SCN.remove=function(...objs){for(const o of objs)if(o)GCQ.push(o);return rm(...objs);};SCN.__gc=1;}
function gpuGc(){if(!GCQ.length||!SCN)return 0;if(!GC_PROTO){GC_PROTO=new Set();for(const k in MODELS.proto)MODELS.proto[k].scene.traverse(o=>{if(o.geometry)GC_PROTO.add(o.geometry);});}
  const used=new Set(),usedT=new Set();SCN.traverse(o=>{if(o.geometry)used.add(o.geometry);const m=o.material;if(m)for(const mm of (Array.isArray(m)?m:[m]))if(mm&&mm.map)usedT.add(mm.map);});
  const q=GCQ.splice(0,GCQ.length),seen=new Set();let n=0;
  for(const root of q){if(root.parent)continue;root.traverse(o=>{const g=o.geometry;if(g&&!seen.has(g)&&!used.has(g)&&!GC_PROTO.has(g)){seen.add(g);g.dispose();n++;}
    const m=o.material;if(m)for(const mm of (Array.isArray(m)?m:[m])){const t=mm&&mm.map;if(t&&t.isCanvasTexture&&!usedT.has(t)&&!seen.has(t)){seen.add(t);t.dispose();}}});}
  return n;}

