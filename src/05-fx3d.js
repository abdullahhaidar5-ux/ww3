/* ================= 3D EFFECTS: particles, tracers, projectiles, decals, wrecks ================= */
const PMAX=3500;const SHOCKS=[],FIRES=[];let shockI=0;
let PN_=null,PA_=null,TRC=null,SCORCH=null,TRACKS=null,CRATER=null,crI=0,LIGHTS=[],WLIGHTS=[];
const BMIS=[],DEBRIS=[];
// chunks of a destroyed structure thrown out by the blast, tumbling and bouncing until they settle
let CHUNKG=null;function chunks(x,y,size,col,n){if(!inView(x,y,.3))return;if(!CHUNKG)CHUNKG=new THREE.BoxGeometry(1,1,1);const g0=groundH(x,y);for(let i=0;i<n&&DEBRIS.length<90;i++){const s=rnd(.08,.2)*size,mm=new THREE.MeshStandardMaterial({color:new THREE.Color(col).multiplyScalar(rnd(.7,1.05)),roughness:.95});const m=new THREE.Mesh(CHUNKG,mm);m.scale.set(s,s*rnd(.4,.9),s*rnd(.6,1.2));m.castShadow=true;const a=Math.random()*6.28,r=Math.random()*size*.3;m.position.set(x+Math.cos(a)*r,g0+rnd(4,size*.5),y+Math.sin(a)*r);SCN.add(m);const sp=rnd(30,90);DEBRIS.push({m,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vh:rnd(50,130),wx:rnd(-6,6),wy:rnd(-6,6),wz:rnd(-6,6),t:0,rest:0,chunk:1});}}
function debrisTick(dt){if(!DEBRIS.length)return;let w=0;for(const d of DEBRIS){d.t+=dt;const m=d.m;if(!d.rest){d.vh-=220*dt;m.position.x+=d.vx*dt;m.position.z+=d.vz*dt;m.position.y+=d.vh*dt;m.rotation.x+=d.wx*dt;m.rotation.y+=d.wy*dt;m.rotation.z+=d.wz*dt;
    const g=groundH(m.position.x,m.position.z)+1.5;if(m.position.y<g){m.position.y=g;if(Math.abs(d.vh)<25){d.rest=1;}else{d.vh=-d.vh*.32;d.vx*=.55;d.vz*=.55;d.wx*=.5;d.wy*=.5;d.wz*=.5;for(let q=0;q<6;q++)part({x:m.position.x,y:m.position.z,h:g,vx:rnd(-25,25),vy:rnd(-25,25),c:C_DUST,s:rnd(5,9),g:10,d:rnd(.6,1),a:.45});}}
    if(Math.random()<dt*14)part({x:m.position.x,y:m.position.z,h:m.position.y,rise:20,c:C_DARK,s:rnd(4,7),d:rnd(1.2,2),a:.4});}
  if(d.t>(d.chunk?25:40)){SCN.remove(m);if(d.chunk)m.material.dispose();continue;}DEBRIS[w++]=d;}DEBRIS.length=w;}const _bmA=new THREE.Vector3(),_bmB=new THREE.Vector3(),_bmUp=new THREE.Vector3(0,1,0);
function bmPos(m,u,out){const k=Math.max(0,Math.min(1,u)),e=k<.5?k*k*2:1-Math.pow(-2*k+2,2)/2;out.set(m.sx+(m.tx-m.sx)*e,m.sh+(m.th-m.sh)*k+m.peak*4*k*(1-k),m.sy+(m.ty-m.sy)*e);return out;}
function bmTick(dt){if(!BMIS.length)return;let w=0;for(const m of BMIS){m.t+=dt;if(m.t<0){BMIS[w++]=m;continue;}const u=m.t/m.T;
  if(u>=1){SCN.remove(m.g);continue;}m.g.visible=true;bmPos(m,u,_bmA);bmPos(m,u+.01,_bmB);_bmB.sub(_bmA);if(_bmB.lengthSq()>1e-6){_bmB.normalize();m.g.quaternion.setFromUnitVectors(_bmUp,_bmB);}
  m.g.position.copy(_bmA);m.fl.scale.set(1,2.2+Math.random()*.8,1);
  const tx=_bmA.x-_bmB.x*14,ty=_bmA.z-_bmB.z*14,th=_bmA.y-_bmB.y*14;
  part({x:tx,y:ty,h:th,add:true,c:C_FIRE2,s:rnd(5,8),d:.18});part({x:tx,y:ty,h:th,add:true,c:C_FIRE,s:rnd(7,10),d:.3});
  if(Math.random()<.8)part({x:tx+rnd(-2,2),y:ty+rnd(-2,2),h:th,vx:rnd(-4,4),vy:rnd(-4,4),vh:rnd(-2,3),c:u<.2?C_SMOKE:[.78,.76,.72],s:rnd(7,11)+u*6,g:0,d:rnd(3,5),a:.5,rise:1.5});
  BMIS[w++]=m;}BMIS.length=w;}
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
  for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffa860,0,320,2);l.position.set(-999,-999,-999);SCN.add(l);LIGHTS.push(l);}for(let i=0;i<3;i++){const l=new THREE.PointLight(0xff8a3a,0,170,2);l.position.set(-999,-999,-999);SCN.add(l);WLIGHTS.push(l);}}
function radTex(stops,n=64){const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d'),g=x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);stops.forEach(([o,s])=>g.addColorStop(o,s));x.fillStyle=g;x.fillRect(0,0,n,n);return new THREE.CanvasTexture(c);}
function buildDecals(){for(const d of [SCORCH,TRACKS,CRATER])if(d){SCN.remove(d);}
  const mk=(n,tex,op)=>{const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:op,polygonOffset:true,polygonOffsetFactor:-2}),n);
    for(let i=0;i<n;i++){TMPM.makeScale(0,0,0);m.setMatrixAt(i,TMPM);}m.renderOrder=1;m.frustumCulled=false;SCN.add(m);return m;};
  SCORCH=mk(180,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'rgba(10,8,6,.92)');g.addColorStop(.35,'rgba(18,14,10,.8)');g.addColorStop(.7,'rgba(30,24,16,.35)');g.addColorStop(1,'rgba(30,24,16,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<34;i++){const a=Math.random()*6.283,l=30+Math.random()*30,w=1+Math.random()*3;x.strokeStyle=`rgba(16,12,8,${.25+Math.random()*.35})`;x.lineWidth=w;x.beginPath();x.moveTo(64+Math.cos(a)*10,64+Math.sin(a)*10);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<40;i++){const a=Math.random()*6.283,r=Math.random()*55;x.fillStyle=`rgba(12,10,8,${Math.random()*.6})`;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,1+Math.random()*3,1+Math.random()*3);}
    const t=new THREE.CanvasTexture(c);return t;})(),1);TRACKS=mk(1600,(()=>{const c=document.createElement('canvas');c.width=16;c.height=32;const x=c.getContext('2d');for(let i=0;i<32;i+=4){x.fillStyle='rgba(52,40,26,.75)';x.fillRect(1,i,14,2.2);}const g=x.getImageData(0,0,16,32);for(let i=0;i<16*32;i++){const px=i%16;const e=Math.min(px,15-px)/3;g.data[i*4+3]*=Math.min(1,e);}x.putImageData(g,0,0);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.LinearFilter;return t;})(),.5);
  CRATER=mk(90,(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d');
    let g=x.createRadialGradient(64,64,0,64,64,62);g.addColorStop(0,'rgba(34,26,18,.95)');g.addColorStop(.32,'rgba(52,40,27,.9)');g.addColorStop(.5,'rgba(92,74,52,.55)');g.addColorStop(.62,'rgba(150,126,92,.6)');g.addColorStop(.72,'rgba(120,98,70,.42)');g.addColorStop(1,'rgba(110,90,64,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    for(let i=0;i<60;i++){const a=Math.random()*6.283,r0=36+Math.random()*8,l=r0+6+Math.random()*20;x.strokeStyle=`rgba(${Math.random()<.5?'70,55,38':'140,118,86'},${.25+Math.random()*.35})`;x.lineWidth=1+Math.random()*2.5;x.beginPath();x.moveTo(64+Math.cos(a)*r0,64+Math.sin(a)*r0);x.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<70;i++){const a=Math.random()*6.283,r=30+Math.random()*30;x.fillStyle=`rgba(${Math.random()<.5?'60,46,32':'160,136,100'},${.3+Math.random()*.5})`;const z=1+Math.random()*3.5;x.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r,z,z);}
    g=x.createRadialGradient(54,54,0,64,64,40);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,n,n);
    const t=new THREE.CanvasTexture(c);return t;})(),.95);CRATER.renderOrder=2;}
function decal(m,i,x,y,s,r){TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r||0),new THREE.Vector3(s,1,s));m.setMatrixAt(i,TMPM);m.instanceMatrix.needsUpdate=true;}
function scorch(x,y,s){if(!SCORCH)return;decal(SCORCH,decI++%180,x,y,s*2.4,Math.random()*6);}
function crater(x,y,s){if(!CRATER)return;decal(CRATER,crI++%90,x,y,s,Math.random()*6);}
function track(x,y,a){if(!TRACKS)return;const i=trkI++%1600;TMPM.compose(TMP.set(x,groundH(x,y)+.6,y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),-(a||0)+Math.PI/2),new THREE.Vector3(4.2,1,9.5));TRACKS.setMatrixAt(i,TMPM);TRACKS.instanceMatrix.needsUpdate=true;}
function pBudget(){const lv=(typeof QUAL!=='undefined'&&QUAL.lv)||0;return [1700,1400,1100,850,650,500][lv]||500;}
// particles that would start well off-screen are skipped (smoke and exhaust from units across the map used CPU and
// ate the particle budget meant for what the player is looking at)
function part(o){if(!inView(o.x,o.y,.4))return;const B=pBudget(),n=PARTS.length;if(n>B){if(!o.add||n>B*1.35)return;}else if(n>B*.6&&!o.add&&Math.random()<(n-B*.6)/(B*.4))return;PARTS.push(Object.assign({vx:0,vy:0,vh:0,t:0,d:1,s:6,g:0,a:1,h:0,c:[.4,.39,.36],add:false,f:.25,rise:0},o));}
const C_SMOKE=[.42,.4,.37],C_DARK=[.13,.12,.11],C_DUST=[.66,.58,.44],C_FIRE=[1,.42,.1],C_FIRE2=[1,.68,.3],C_SPARK=[1,.75,.35];
function inView(x,y,m){if(!CAM)return true;TMP.set(x,0,y).project(CAM);return Math.abs(TMP.x)<1+m&&Math.abs(TMP.y)<1+m;}
function boomFX(x,y,s,big,h=0){sfxBoom(x,y,s,big);const g=groundH(x,y)+h,n=Math.min(18,4+(s/5|0)),gr=h<4;
  if(s<=10&&!big){for(let i=0;i<9;i++){const a=rnd(0,6.28),v=rnd(80,200);part({x,y,h:g+rnd(4,9),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(60,180),add:true,c:i%3?C_SPARK:[3,2.4,1.4],s:rnd(1,1.8),f:.5,grav:1,bounce:1,d:rnd(.25,.6)});}part({x,y,h:g+6,s:s*2.2,d:.06,add:true,c:[3.2,2.4,1.4]});}
  part({x,y,h:g+s*.35,s:s*1.25,d:big?.18:.1,add:true,c:[1.9,.95,.35],a:.8});part({x,y,h:g+s*.5,s:s*.7,d:big?.35:.2,add:true,c:[2.4,1.3,.4],g:s*.8,a:.9});
  const nf=Math.min(16,5+(s/4|0));for(let i=0;i<nf;i++){const a=rnd(0,6.28),r=rnd(0,s*.45),v=rnd(4,s*.9),hot=rnd(.8,1.15);part({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,h:g+rnd(1,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(8,s*1.6),f:.15,rise:rnd(6,18),c:[3.4*hot,1.5*hot,.4*hot],c2:i%3?[.5,.47,.42]:[.36,.34,.31],ck:rnd(.12,.25),s:rnd(s*.4,s*.7),g:s*.8,d:rnd(2,3.4),a:.62});}
  for(let i=0;i<(n>>1);i++){const a=rnd(0,6.28),v=rnd(10,s*2);part({x,y,h:g+rnd(0,s*.6),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(10,s*1.8),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(s*.3,s*.6),g:s*.5,d:rnd(.25,.5),a:.7});}
  for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(5,s*.9);part({x:x+rnd(-s*.3,s*.3),y:y+rnd(-s*.3,s*.3),h:g+rnd(2,s*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,rise:rnd(16,34),c:i%4?C_SMOKE:C_DARK,c2:[.5,.47,.42],ck:.4,s:rnd(s*.4,s*.7),g:s*.6,d:rnd(2.2,3.8),a:.5});}
  if(gr&&s>8){const C_DIRT=[.42,.33,.22];for(let i=0;i<Math.min(16,5+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(10,s*1.6);part({x:x+rnd(-3,3),y:y+rnd(-3,3),h:g+2,vx:Math.cos(a)*v*.4,vy:Math.sin(a)*v*.4,vh:rnd(s*3,s*6),f:.5,grav:1,c:i%2?C_DIRT:[.3,.24,.17],s:rnd(s*.35,s*.6),g:s*1.1,d:rnd(.9,1.5),a:.75});}
    for(let i=0;i<Math.min(24,8+(s/2|0));i++){const a=rnd(0,6.28),v=rnd(40,140)*(.5+s/40);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(90,260),c:[.22,.17,.12],s:rnd(1.6,3.2),f:.85,grav:1,bounce:1,d:rnd(1,1.8)});}}
  if(gr)for(let i=0;i<Math.min(14,6+(s/4|0));i++){const a=i/7*3.1416+rnd(-.2,.2),v=rnd(s*2,s*3.5);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,f:.08,c:C_DUST,s:rnd(s*.35,s*.55),g:s*.5,d:rnd(1,1.6),a:.45});}
  for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(90,260)*(.5+s/60);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(40,200),add:true,c:C_SPARK,s:1.4,f:.6,grav:1,d:rnd(.3,.7)});}
  if(s>10)for(let i=0;i<Math.min(12,s/3|0);i++){const a=rnd(0,6.28),v=rnd(30,130);part({x,y,h:g+2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(80,220),c:C_DARK,s:rnd(1.4,2.8),f:.85,grav:1,bounce:1,d:rnd(1.2,2.2)});}
  scorch(x,y,s);if(gr&&s>=16&&groundH(x,y)>(typeof WL==="number"?WL+1:-1e9))crater(x,y,s*1.5);
  // pressure wave: a pale ring of dust racing outward along the ground; heavy hits leave a fire burning for a few seconds
  if(gr&&s>=14&&SHOCKS.length&&inView(x,y,.4)){const S=SHOCKS[shockI++%SHOCKS.length];S.t=0;S.d=big?.75:.45;S.r0=s*.5;S.r1=s*(big?6.5:4.2);S.a0=big?.6:.42;S.x=x;S.y=y;S.m.position.set(x,g+2.5,y);}
  if(gr&&(s>=20||big)&&groundH(x,y)>(typeof WL==="number"?WL+1:-1e9)){if(FIRES.length>=10)FIRES.shift();FIRES.push({x,y,g,t:0,d:big?9:rnd(4,6.5),r:Math.min(30,s*.45),big:!!big,acc:0});}
  if(s>12&&LIGHTS.length){const L=LIGHTS[lightI++%LIGHTS.length];L.position.set(x,g+20,y);L.intensity=(big?7:3.2)*WXFX*LUX;L.distance=big?600:300;L.userData.d=big?.8:.35;L.userData.t=0;}
  if(inView(x,y,.3)){if(s>14)shake=Math.min(18,shake+s/(big?5:13));if(big)flash=Math.min(.2,flash+.1);}}
const FXH={
  muz(x,y,h,a,s){sfxShot(x,y,s);if(s>=13){const gh=groundH(x,y),ca=Math.cos(a),sa=Math.sin(a);for(let i=0;i<10;i++){const b=a+rnd(-1.3,1.3),v=rnd(30,90);part({x:x+ca*4,y:y+sa*4,h:h+rnd(-1,2),vx:Math.cos(b)*v+ca*40,vy:Math.sin(b)*v+sa*40,vh:rnd(4,18),f:.25,rise:rnd(6,14),c:i%3?C_SMOKE:[.62,.6,.56],c2:[.55,.53,.5],ck:.3,s:rnd(8,13),g:16,d:rnd(1.8,2.8),a:.62});}for(let i=0;i<12;i++){const b=rnd(0,6.28),v=rnd(40,80);part({x,y,h:gh+2,vx:Math.cos(b)*v,vy:Math.sin(b)*v,f:.1,c:C_DUST,s:rnd(5,8),g:10,d:rnd(.8,1.3),a:.35});}part({x:x+ca*8,y:y+sa*8,h,s:s*3.2,d:.09,add:true,c:[3.2,1.8,.6]});}part({x,y,h,s:s*2.4,d:.07,add:true,c:[3,2,.9]});part({x:x+Math.cos(a)*s*.9,y:y+Math.sin(a)*s*.9,h,s:s*1.4,d:.05,add:true,c:[2.6,1.4,.5]});if(s>9&&LIGHTS.length&&inView(x,y,.1)){const L=LIGHTS[lightI++%LIGHTS.length];L.position.set(x,h+6,y);L.intensity=2.2*WXFX;L.distance=160;L.userData.d=.08;L.userData.t=0;}if(s>9)for(let i=0;i<3;i++)part({x,y,h,vx:Math.cos(a)*rnd(20,50),vy:Math.sin(a)*rnd(20,50),c:C_SMOKE,s:rnd(4,7),g:12,d:rnd(.5,.9),a:.5});},
  tr(x1,y1,h1,x2,y2,h2,flak){TRACERS.push({a:[x1,h1,y1],b:[x2,h2,y2],t:0,d:.09,c:flak?[3,1.5,.5]:[3,1.9,.7]});if(flak){part({x:x2,y:y2,h:h2,s:7,d:.12,add:true,c:C_FIRE});part({x:x2,y:y2,h:h2,s:5,g:7,d:.8,c:[.3,.29,.27],c2:[.5,.48,.45],ck:.3,a:.5});}
    else if(h2<10){if(ricoHit(x2,y2))ricochet(x1,y1,x2,y2);else if(Math.random()<.4)part({x:x2,y:y2,h:groundH(x2,y2)+1,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(10,30),c:C_DUST,s:3,g:6,d:.4,a:.6});}},
  salvo(x,y,h,tx,ty,ang){const sx=Math.cos(ang),sy=Math.sin(ang),px=-sy,py=sx;
    for(let i=0;i<3;i++){const side=i%2?1:-1,ox=x+px*side*5,oy=y+py*side*5,ix=tx+rnd(-18,18)+sx*rnd(-10,20),iy=ty+rnd(-18,18)+sy*rnd(-10,20);const len=Math.max(1,Math.hypot(ix-ox,iy-oy));VPROJ.push({x:ox,y:oy,h,sx:ox,sy:oy,sh:h,tx:ix,ty:iy,th:groundH(ix,iy)+1,spd:520,wpn:'missile',rocket:1,len,p:-i*55,vis:1});}
    for(let i=0;i<6;i++){const k=i/5,gx=tx-sx*40+sx*80*k+rnd(-8,8),gy=ty-sy*40+sy*80*k+rnd(-8,8);setTimeout(()=>{TRACERS.push({a:[x,h-3,y],b:[gx,groundH(gx,gy)+1,gy],t:0,d:.09,c:[3,1.9,.7]});part({x:gx,y:gy,h:groundH(gx,gy)+2,vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(20,50),c:C_DUST,s:rnd(3,5),g:8,d:rnd(.5,.9),a:.55});part({x:gx,y:gy,h:groundH(gx,gy)+2,add:true,c:C_SPARK,s:2.2,d:.08});},80+i*55);}},
  pj(x,y,h,tx,ty,th,spd,wpn,rocket){const len=Math.max(1,Math.hypot(tx-x,ty-y));VPROJ.push({x,y,h,sx:x,sy:y,sh:h,tx,ty,th,spd,wpn,rocket,len,p:0});},
  boom(x,y,s,big){boomFX(x,y,s,big);},
  toss(id,vh){const o=OBJ.get(id);if(o)o.userData.toss={h:0,vh,sp:(Math.random()<.5?-1:1)*rnd(4,9),r:0};},
  // ballistic missile: launch plume at the silo, a high arc with a burning exhaust and a long smoke trail, then a steep
  // dive onto the target (the sim's own strike makes the explosion on arrival)
  bmis(sx,sy,tx,ty,T,i){mats();const g=new THREE.Group(),B=Bld();B.cyl(1.7,1.7,20,10,0,0,0,'#e6e2d6');B.cone(1.7,6,10,0,13,0,'#3a3c38');B.cyl(1.75,1.75,2.2,10,0,6,0,'#2f3a2c');
    for(let k=0;k<4;k++){const a=k*Math.PI/2;B.box(.35,4,3,Math.cos(a)*2.2,-8,Math.sin(a)*2.2,'#3a3c38',0,-a,0);}g.add(mesh(B.geo()));
    const fl=new THREE.Mesh(new THREE.SphereGeometry(2.6,10,8),MAT.glow);fl.scale.set(1,2.4,1);fl.position.y=-12.5;g.add(fl);g.visible=false;SCN.add(g);
    const sh=groundH(sx,sy)+6,th=groundH(tx,ty),d=Math.hypot(tx-sx,ty-sy),peak=Math.max(420,Math.min(1100,d*.42));
    BMIS.push({g,fl,sx,sy,sh,tx,ty,th,T:Math.max(1.2,T-.05),t:-(i||0)*.04,peak,d});
    if(!(i%3))sfxBoom(sx,sy,10,false);
    for(let q=0;q<26;q++)part({x:sx+rnd(-10,10),y:sy+rnd(-10,10),h:sh-4+rnd(0,6),vx:rnd(-60,60),vy:rnd(-60,60),vh:rnd(5,30),c:C_SMOKE,s:rnd(10,18),g:-2,d:rnd(2.5,4.5),a:.6,rise:4});
    for(let q=0;q<10;q++)part({x:sx,y:sy,h:sh+rnd(0,10),vx:rnd(-20,20),vy:rnd(-20,20),vh:rnd(20,60),add:true,c:C_FIRE2,s:rnd(5,9),d:rnd(.2,.4)});},
  die(id,x,y,ki,isB,team){const kind=KINDS[ki],o=OBJ.get(id);const rot=o?o.rotation.y:0;
    if(isB){boomFX(x,y,40,true,10);chunks(x,y,STRUCT[kind].size,'#8a8478',10);for(let i=0;i<5;i++)setTimeout(()=>boomFX(x+rnd(-35,35),y+rnd(-35,35),18,false,rnd(0,20)),i*180);rubble(x,y,STRUCT[kind].size,o);}
    else{const s=BASE[kind];if(s.armor==='light'&&s.dom==='ground'){for(let i=0;i<6;i++)part({x,y,h:groundH(x,y)+3,vx:rnd(-30,30),vy:rnd(-30,30),c:C_DUST,s:rnd(4,7),g:10,d:rnd(.5,.9),a:.6});}
      else if(kind==='drone')boomFX(x,y,16,false,unitH({s,x,y,id:0}));else{const air=s.dom==='air';boomFX(x,y,air?18:s.r*1.5,false,air&&o?o.position.y-groundH(x,y):0);if(o&&!air){const P=o.userData.parts||{};if(P.turret&&s.armor==='heavy'&&Math.random()<.45&&inView(x,y,.2)){const tu=P.turret;o.updateMatrixWorld(true);const wp=new THREE.Vector3(),wq=new THREE.Quaternion();tu.getWorldPosition(wp);tu.getWorldQuaternion(wq);tu.parent.remove(tu);tu.position.copy(wp);tu.quaternion.copy(wq);if(typeof burntMat==='function')tu.traverse(m=>{if(m.isMesh&&m.material&&!Array.isArray(m.material))m.material=burntMat(m.material);});SCN.add(tu);const a=Math.random()*6.28;DEBRIS.push({m:tu,vx:Math.cos(a)*rnd(15,45),vz:Math.sin(a)*rnd(15,45),vh:rnd(70,120),wx:rnd(-4,4),wy:rnd(-5,5),wz:rnd(-4,4),t:0,rest:0});for(let q=0;q<14;q++)part({x,y,h:wp.y,vx:rnd(-40,40),vy:rnd(-40,40),vh:rnd(30,90),add:true,c:C_FIRE2,s:rnd(4,7),d:rnd(.3,.6)});}if(WRECKQ.length<6)WRECKQ.push([o,x,y]);}}}
    if(o&&!isB&&BASE[kind].armor==='light'&&BASE[kind].dom==='ground'&&o.userData.model&&o.userData.parts.body){OBJ.delete(id);const P=o.userData.parts;if(P.tring)P.tring.visible=false;o.userData.walker=false;
      const figs=P.body.children.map((f,i)=>({f,dl:i*.12+Math.random()*.15,dir:Math.random()<.5?-1:1,rx:rnd(-.35,.35),base:f.position.clone()}));BODIES.push({o,t:0,figs,x,y});if(BODIES.length>40){const b=BODIES.shift();SCN.remove(b.o);}return;}
    if(o){SCN.remove(o);OBJ.delete(id);}},
  strike(x,y,t,r,sup,arc){if(sup)sfxAlarm();const ring=new THREE.Mesh(new THREE.RingGeometry(r*.94,r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.8,depthWrite:false}));ring.position.set(x,groundH(x,y)+1.5,y);SCN.add(ring);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.12,depthWrite:false}));disc.position.copy(ring.position);SCN.add(disc);
    let mis=null;if(sup&&!arc){mats();if(MODELS.ready&&MODELS.proto.missile){mis=new THREE.Group();const mm=instModel('missile',null,'y',30);mm.rotation.x=Math.PI;mm.position.y=30;mis.add(mm);}else mis=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,22,8),new THREE.MeshStandardMaterial({color:lin('#e8e4d6')}));mis.visible=false;SCN.add(mis);}MARKERS.push({x,y,t,r,sup,ring,disc,mis});},
  hack(x,y){for(let i=0;i<24;i++)part({x:x+rnd(-30,30),y:y+rnd(-30,30),h:groundH(x,y)+rnd(5,40),vh:rnd(10,30),add:true,c:[.3,1,.5],s:rnd(2,4),d:rnd(.6,1.2)});},
  ping(x,y,r){PINGS.push({x,y,r,t:0,d:1.6,c:0x7fb8e6});},
  smoke(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0xb9bdbb});for(let i=0;i<140;i++){const a=rnd(0,6.28),d=Math.sqrt(Math.random())*r;part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,14),vh:rnd(1,4),rise:rnd(2,6),c:C_SMOKE,c2:[.75,.75,.73],ck:.4,s:rnd(30,55),g:2,d:rnd(12,20),a:.5});}},
  heal(x,y,r){PINGS.push({x,y,r,t:0,d:1.2,c:0x74d08f});for(let i=0;i<40;i++){const a=rnd(0,6.28),d=rnd(0,r);part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,20),vh:rnd(15,40),add:true,c:[.4,1,.55],s:rnd(2,4),d:rnd(.8,1.4)});}},
  plane(sx,sy,tx,ty,team){mats();const T=G.teams[team],o=mesh(geoFor('plane',T.fac,T,'body'));o.scale.setScalar(1.2);SCN.add(o);const a=Math.atan2(ty-sy,tx-sx),L=Math.hypot(tx-sx,ty-sy);PLANES.push({o,sx,sy,a,v:L/2.6,t:0,tx,ty,dropped:false});},
  log(team,msg,kind){if(team===ME)pushLog(msg,kind);},
  end(winner){showEnd(winner);},
  elim(team){if(team===ME&&G&&!G.over)showElim();},
  oilDry(i){const o=G.oil&&G.oil[i];if(!o)return;if(MODE==='client'){o.res=0;}if(o.owner===ME||MODE==='client')try{pushLog('An oil derrick has run dry.','w');}catch(_){}},
  give(f,t,a){if(t===ME&&typeof sfxUI==='function')sfxUI(880);},
  civd(i,q){const c=G.civ&&G.civ[i];if(!c)return;if(c.ruin&&c.obj){c.obj.visible=false;if(typeof scorch==='function')scorch(c.x,c.y,30);}if(MODE==='client'){c.dead=true;if(G.grid[c.k]===3)G.grid[c.k]=0;}G.civDirty=true;const g=groundH(c.x,c.y);if(!q)try{FXH.boom(c.x|0,c.y|0,26,1);chunks(c.x,c.y,48,'#cfc6b2',12);}catch(_){}},
  // P2P: a remembered enemy building that was destroyed out of this player's sight - removed silently (leaving rubble)
  // when they next see the spot, instead of an explosion that would give the fight away
  gone(id,x,y,ki){const k=KINDS[ki];if(k&&STRUCT[k])try{rubble(x,y,STRUCT[k].size);}catch(_){}},
  txt(x,y,str,team,vic){if(!SET.txt||team!==ME&&vic!==ME&&vic!==-2)return;FLOATS.push({x,y,s:str,t0:performance.now(),c:vic===-2?(ally(team,ME)?(str==='RALLIED'?'#74d08f':'#ea5a40'):'#f2c94c'):team===ME?'#f2c94c':'#ea5a40'});if(FLOATS.length>14)FLOATS.shift();},
};
// An effect must never throw into the simulation (that stopped the whole battle): the battle can run before the 3D
// world exists (behind the loading screen, or in headless tests), so a failing effect is skipped and the battle goes on.
let FXERR=0;
// Plays one battle effect on this screen. FXE (03-sim.js) calls it after queuing the effect for the clients.
function fxPlay(type,args){if(FXH[type]&&!G.headless)try{FXH[type](...args);}catch(e){if(FXERR++<5)console.warn('effect '+type+' skipped: '+(e&&e.message));}}
// Burnt-out wrecks keep their shape and panel detail: patchy soot, rust-brown scorched paint and grey ash with the
// original surface showing faintly through, glowing embers that die down over ~20 seconds, and a slight list.
const WRECK_HEAT={value:1};let WRECKM=null;const WRECKQ=[],BURNT=new Map();
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
function wreck(o,x,y){mats();let w;const mats2=[];const rec={heat:1};const bm=src=>{const key=src?src.uuid:'none';let m=BURNT.get(key);if(!m){m=burntMat(src);BURNT.set(key,m);}return m;};if(o.userData.model){w=o.clone(true);w.traverse(c=>{if(c.isMesh){c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);}if(c.isSkinnedMesh)c.visible=false;});w.rotation.z=rnd(-.08,.08);w.rotation.x=rnd(-.05,.05);}else{w=new THREE.Group();o.traverse(c=>{if(c.isMesh&&c.material===MAT.std){const m=new THREE.Mesh(c.geometry,bm(c.material));m.position.copy(c.position);m.rotation.copy(c.rotation);m.castShadow=true;w.add(m);}});
  w.position.copy(o.position);w.rotation.y=o.rotation.y;}const P=o.userData.parts;if(P.turret){const t=w.children[1];if(t)t.rotation.set(rnd(-.2,.2),rnd(-1,1),rnd(-.2,.2));}w.traverse(c=>{if(c.isMesh){c.onBeforeRender=(r,s,cam,g,m)=>{if(m&&m.userData.heat&&m.userData.heat.value!==rec.heat){m.userData.heat.value=rec.heat;m.uniformsNeedUpdate=true;}};}});SCN.add(w);WRECKS.push({o:w,x,y,t:0,rec});}
function rubble(x,y,size,o){mats();const w=new THREE.Group();const B=Bld(),h=size*.5;const gr=['#7d7a72','#8e8b82','#6c6962','#5a5751','#9a968c'];
  B.box(size*.95,1.6,size*.95,0,.8,0,'#5e5b54');
  for(let i=0;i<46;i++){const s2=rnd(2.5,10),r=Math.sqrt(Math.random())*h*1.05,a=rnd(0,6.28);B.box(s2,s2*rnd(.3,.7),s2*rnd(.5,1.3),Math.cos(a)*r,s2*.25+rnd(0,3)*(1-r/h),Math.sin(a)*r,Math.random()<.2?'#2b2925':gr[i%5],rnd(-.5,.5),rnd(0,6),rnd(-.5,.5));}
  for(let k=0;k<3;k++){const a=rnd(0,6.28),r=rnd(h*.3,h*.8),ht=rnd(6,18),wd=rnd(10,22);B.box(wd,ht,2.5,Math.cos(a)*r,ht/2,Math.sin(a)*r,'#86837a',rnd(-.12,.12),a+1.57,rnd(-.1,.1));}
  for(let k=0;k<8;k++){const a=rnd(0,6.28),r=rnd(0,h*.8);B.cyl(.25,.25,rnd(6,14),4,Math.cos(a)*r,rnd(3,6),Math.sin(a)*r,'#3a2a20',rnd(-1,1),0,rnd(-1,1));}
  const m=mesh(B.geo());w.add(m);scorch(x,y,size*.7);
  w.position.set(x,groundH(x,y),y);SCN.add(w);WRECKS.push({o:w,x,y,t:0,big:true});}
function fxUpdate(dt){
  for(const p of PARTS){p.t+=dt;const fr=Math.pow(p.f,dt);p.vx*=fr;p.vy*=fr;p.vh*=fr;if(p.grav)p.vh-=420*dt;p.x+=(p.vx+(p.add?0:6))*dt;p.y+=p.vy*dt;p.h+=(p.vh+p.rise)*dt;p.s=Math.max(.4,p.s+p.g*dt);
    if(p.bounce&&p.h<groundH(p.x,p.y)){p.h=groundH(p.x,p.y);p.vh*=-.3;p.vx*=.4;p.vy*=.4;}}
  for(let i=PARTS.length-1;i>=0;i--)if(PARTS[i].t>=PARTS[i].d){PARTS[i]=PARTS[PARTS.length-1];PARTS.pop();}
  let nN=0,nA=0;for(const p of PARTS){const P=p.add?PA_:PN_;let i=p.add?nA++:nN++;if(i>=PMAX)continue;const k=p.t/p.d;
    P.pos[i*3]=p.x;P.pos[i*3+1]=p.h;P.pos[i*3+2]=p.y;if(p.c2){const m=Math.min(1,k/(p.ck||.3));P.col[i*3]=p.c[0]+(p.c2[0]-p.c[0])*m;P.col[i*3+1]=p.c[1]+(p.c2[1]-p.c[1])*m;P.col[i*3+2]=p.c[2]+(p.c2[2]-p.c[2])*m;}else{P.col[i*3]=p.c[0];P.col[i*3+1]=p.c[1];P.col[i*3+2]=p.c[2];}P.sz[i]=p.s*2;P.al[i]=p.add?p.a*(1-k)*(1-k):p.a*(1-k)*Math.min(1,k*5+.3);}
  for(const [P,n] of [[PN_,nN],[PA_,nA]]){const m=Math.min(n,PMAX);P.g.setDrawRange(0,m);if(m||P.lastN)for(const k of ['position','pcol','size','alpha']){const A=P.g.attributes[k];A.clearUpdateRanges();A.addUpdateRange(0,Math.max(m,1)*A.itemSize);A.needsUpdate=true;}P.lastN=m;   /* only the live part of the buffers is uploaded (it was all 3,500 slots per layer every frame) */P.m.uniforms.scale.value=VH*dpr/(2*Math.tan(CAM.fov*Math.PI/360));}
  for(const t of TRACERS){t.t+=dt;const k=Math.min(1,t.t/t.d*1.25);for(let q=0;q<3;q++){const u=Math.max(0,k-q*.05);part({x:t.a[0]+(t.b[0]-t.a[0])*u,h:t.a[1]+(t.b[1]-t.a[1])*u,y:t.a[2]+(t.b[2]-t.a[2])*u,s:3.4-q*.7,d:.05,add:true,c:[t.c[0]*.9,t.c[1]*.8,t.c[2]*.7],a:.9-q*.2});}}for(let i=TRACERS.length-1;i>=0;i--)if(TRACERS[i].t>=TRACERS[i].d)TRACERS.splice(i,1);
  const tp=TRC.geometry.attributes.position.array,tc=TRC.geometry.attributes.color.array;let n=0;for(const t of TRACERS){if(n>=800)break;const L=Math.hypot(t.b[0]-t.a[0],t.b[1]-t.a[1],t.b[2]-t.a[2])||1,u=Math.min(1,t.t/t.d*1.25),u0=Math.max(0,u-Math.min(.14,20/L));for(let j=0;j<3;j++){tp[n*6+j]=t.a[j]+(t.b[j]-t.a[j])*u0;tp[n*6+3+j]=t.a[j]+(t.b[j]-t.a[j])*u;}for(let j=0;j<3;j++){tc[n*6+j]=t.c[j]*.1;tc[n*6+3+j]=t.c[j]*(j?.72:.95);}n++;}
  TRC.geometry.setDrawRange(0,n*2);if(n||TRC.lastN)for(const k of ['position','color']){const A=TRC.geometry.attributes[k];A.clearUpdateRanges();A.addUpdateRange(0,Math.max(n,1)*6);A.needsUpdate=true;}TRC.lastN=n;
  bmTick(dt);debrisTick(dt);
  for(const p of VPROJ){const ox=p.x,oy=p.y,oh=p.h;p.p+=p.spd*dt;const k=Math.min(1,p.p/p.len);p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k;const arc=p.wpn==='shell'?Math.sin(k*Math.PI)*p.len*.22:0;p.h=p.sh+(p.th-p.sh)*k+arc;
    if(p.p<0){p.x=p.sx;p.y=p.sy;p.h=p.sh;continue;}
    if(k>=1){p.done=true;if(p.vis)boomFX(p.tx,p.ty,9,false);continue;}
    if(p.wpn==='at'||p.wpn==='missile'||p.rocket){if(Math.random()<.5)part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE,a:.7});for(let q=0;q<2;q++)part({x:p.x+rnd(-1,1),y:p.y+rnd(-1,1),h:p.h,vx:rnd(-4,4),vy:rnd(-4,4),c:[.88,.87,.84],s:rnd(3,5),g:9,d:rnd(1.6,2.6),a:.55});}
    else if(p.wpn==='shell'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,add:true,c:C_FIRE});if(Math.random()<.6)part({x:p.x,y:p.y,h:p.h,vx:rnd(-2,2),vy:rnd(-2,2),c:[.7,.68,.65],s:rnd(1.6,2.4),g:3.5,d:rnd(.8,1.3),a:.32});}
    else if(p.wpn==='bomb'){part({x:p.x,y:p.y,h:p.h,s:3,d:.04,c:C_DARK,a:1});}
    else{part({x:p.x,y:p.y,h:p.h,s:2.6,d:.04,add:true,c:C_FIRE2});if(ox!=null)TRACERS.push({a:[ox,oh,oy],b:[p.x,p.h,p.y],t:0,d:.07,c:[1.6,1.2,.7]});}}
  for(let i=VPROJ.length-1;i>=0;i--)if(VPROJ[i].done)VPROJ.splice(i,1);
  for(const m of MARKERS){m.t-=dt;const pu=.5+.5*Math.sin(performance.now()/90);m.ring.material.opacity=.5+.4*pu;m.disc.material.opacity=.08+.1*pu;
    if(m.mis){if(m.t<1.2){m.mis.visible=true;const h=groundH(m.x,m.y)+(m.t/1.2)*800;m.mis.position.set(m.x,h+11,m.y);part({x:m.x,y:m.y,h:h+24,s:7,g:16,vx:rnd(-6,6),vy:rnd(-6,6),c:C_SMOKE,d:rnd(.8,1.4),a:.7});if(Math.random()<.5)part({x:m.x,y:m.y,h:h+24,s:7,d:.06,add:true,c:C_FIRE,a:.6});}}
    if(m.t<=-.05){m.done=true;SCN.remove(m.ring);SCN.remove(m.disc);if(m.mis)SCN.remove(m.mis);}}
  for(let i=MARKERS.length-1;i>=0;i--)if(MARKERS[i].done)MARKERS.splice(i,1);
  for(const p of PLANES){p.t+=dt;const d=p.v*p.t;const x=p.sx+Math.cos(p.a)*d,y=p.sy+Math.sin(p.a)*d;p.o.position.set(x,groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+150,y);p.o.rotation.y=-p.a;
    if(!p.dropped&&p.t>=2.6){p.dropped=true;for(let i=0;i<5;i++)part({x:p.tx+rnd(-40,40),y:p.ty+rnd(-40,40),h:groundH(p.tx,p.ty)+140,vh:-60,f:1,c:[.95,.95,.9],s:5,d:2.2,a:.9});}
    if(p.t>6){p.done=true;SCN.remove(p.o);}}
  for(let i=PLANES.length-1;i>=0;i--)if(PLANES[i].done)PLANES.splice(i,1);
  for(const w of WRECKS){w.t+=dt;if(w.rec)w.rec.heat=Math.max(0,1-w.t/20);const vis=inView(w.x,w.y,.25),burn=w.t<(w.big?30:24),fade=Math.max(0,1-w.t/(w.big?40:32));
    if(vis&&w.t<(w.big?40:32)&&Math.random()<dt*(w.big?7:4.5))part({x:w.x+rnd(-5,5),y:w.y+rnd(-5,5),h:groundH(w.x,w.y)+8,vx:rnd(5,9),rise:rnd(40,56),c:Math.random()<.6?C_DARK:[.2,.19,.18],c2:[.44,.42,.39],ck:rnd(.25,.4),s:rnd(4,7),g:7,d:rnd(3,4.2),a:.4*fade+.08});
    if(vis&&burn&&Math.random()<dt*(w.big?14:10)){const fx=w.x+rnd(-9,9),fy=w.y+rnd(-9,9);part({x:fx,y:fy,h:groundH(fx,fy)+rnd(3,9),vx:rnd(-3,3),vy:rnd(-3,3),rise:rnd(14,26),add:true,c:Math.random()<.5?[2.6,1.1,.3]:[2.9,1.7,.6],s:rnd(4,8),g:-3,d:rnd(.35,.7),a:.85});}
    if(vis&&burn&&Math.random()<dt*2)part({x:w.x+rnd(-6,6),y:w.y+rnd(-6,6),h:groundH(w.x,w.y)+6,vx:rnd(-30,30),vy:rnd(-30,30),vh:rnd(30,70),add:true,c:C_SPARK,s:1.2,f:.6,grav:1,d:rnd(.4,.8)});
    if(burn&&!w.light&&LIGHTS.length){w.light=1;}
    if(w.t>50)w.o.position.y-=dt*4;if(w.t>56){w.done=true;SCN.remove(w.o);}}
  for(let i=WRECKS.length-1;i>=0;i--)if(WRECKS[i].done)WRECKS.splice(i,1);
  {let k=0;const now=performance.now()/1000;for(const w of WRECKS){if(k>=WLIGHTS.length)break;if(w.t>=(w.big?30:24)||!inView(w.x,w.y,.1))continue;const L=WLIGHTS[k++],fl=.75+.25*Math.sin(now*17+w.x)*Math.sin(now*11.3+w.y),fade=Math.min(1,w.t*2)*Math.min(1,((w.big?30:24)-w.t)/6);L.position.set(w.x,groundH(w.x,w.y)+16,w.y);L.intensity=(w.big?3.2:2.2)*fl*fade*WXFX*LUX;}for(;k<WLIGHTS.length;k++)WLIGHTS[k].intensity=0;}
  for(const b of BODIES){b.t+=dt;for(const g of b.figs){const k=Math.max(0,Math.min(1,(b.t-g.dl)/.45));const e=k*k*(3-2*k);g.f.rotation.z=g.dir*1.5*e;g.f.rotation.x=g.rx*e;g.f.position.y=g.base.y-e*.6;if(k>0&&k<1&&!g.dust&&e>.9){g.dust=1;part({x:b.x,y:b.y,h:groundH(b.x,b.y)+1,vx:rnd(-12,12),vy:rnd(-12,12),c:C_DUST,s:rnd(4,6),g:6,d:.7,a:.4});}}
    if(b.t>14)b.o.position.y-=dt*2.5;if(b.t>17){b.done=true;SCN.remove(b.o);}}
  for(let i=BODIES.length-1;i>=0;i--)if(BODIES[i].done)BODIES.splice(i,1);
  for(const L of LIGHTS){if(L.intensity>0){L.userData.t+=dt;L.intensity=Math.max(0,L.intensity*(1-dt/L.userData.d*2.2));if(L.intensity<.05*LUX)L.intensity=0;}}
  for(const S of SHOCKS){if(S.t>=S.d){if(S.m.material.opacity){S.m.material.opacity=0;S.m.scale.setScalar(.001);}continue;}S.t+=dt;const k=Math.min(1,S.t/S.d),e=1-(1-k)*(1-k)*(1-k);S.m.scale.setScalar(S.r0+(S.r1-S.r0)*e);S.m.material.opacity=S.a0*(1-k)*(1-k);}
  for(let i=FIRES.length-1;i>=0;i--){const F=FIRES[i];F.t+=dt;if(F.t>=F.d){FIRES.splice(i,1);continue;}if(!inView(F.x,F.y,.3))continue;const life=1-F.t/F.d;F.acc+=dt*(F.big?16:9)*(.4+.6*life);
    while(F.acc>=1){F.acc-=1;const a=rnd(0,6.28),r=rnd(0,F.r);const fx=F.x+Math.cos(a)*r,fy=F.y+Math.sin(a)*r;
      // flames always; smoke only while the screen isn't already busy with particles (large smoke is the costliest pixel work)
      if(Math.random()<.75)part({x:fx,y:fy,h:F.g+rnd(1,4),vh:rnd(14,30),rise:rnd(4,10),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(5,9)*(.6+.4*life),g:3,d:rnd(.35,.7),a:.75});
      else if(PARTS.length<pBudget()*.6)part({x:fx,y:fy,h:F.g+rnd(6,12),vx:rnd(-4,4),vy:rnd(-4,4),rise:rnd(14,F.big?34:24),c:Math.random()<.6?C_DARK:C_SMOKE,c2:[.45,.43,.4],ck:.35,s:rnd(8,13)*(F.big?1.35:1),g:F.big?9:5,d:rnd(2,F.big?4.5:3.2),a:.4});}}
  for(const p of PINGS)p.t+=dt;for(let i=PINGS.length-1;i>=0;i--)if(PINGS[i].t>=PINGS[i].d)PINGS.splice(i,1);
  washTick();wakeTick(dt);dustN=0;
  gpuGcHook();gcT-=dt;if(gcT<=0){gcT=15;try{gpuGc();}catch(e){console.warn('gpu gc',e);}}
  if(G&&G.map&&G.map.theme==='snow'&&CAM&&typeof cam!=='undefined'){const n=Math.min(30,dt*Math.min(150,cam.dist*.16))|0;const R=Math.max(500,cam.dist*1.1);for(let i=0;i<n+(Math.random()<dt*20?1:0);i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(60,260),vx:rnd(8,22),vy:rnd(-4,6),vh:-rnd(26,40),f:1,c:[1.05,1.08,1.12],s:rnd(1.4,2.4),d:rnd(4,6.5),a:.85});}}
  try{weatherFX(dt);}catch(e){}
  shake*=Math.exp(-7*dt);flash=Math.max(0,flash-dt*1.6);}
// Weather on screen: rain streaks, blowing sand, heavy snow and thick fog close in the view; the haze colour and
// distance ease in and out as the weather changes.
let RAIN=null,WXV={k:'clear',m:0};
function weatherFX(dt){if(!G||!G.map||!CAM)return;const k=(G.wx&&G.wx.k)||'clear';if(WXV.base==null&&SCN.fog){WXV.base={c:SCN.fog.color.clone(),n:SCN.fog.near,f:SCN.fog.far};}const B=WXV.base;if(!B)return;
  if(WXV.k!==k){WXV.m=Math.max(0,WXV.m-dt*.5);if(WXV.m<=0)WXV.k=k;}else WXV.m=Math.min(1,WXV.m+dt*.35);const m=WXV.k==='clear'?0:WXV.m,K=WXV.k;
  const T={rain:{c:'#7d868c',n:500,f:3200},fog:{c:'#b9bdbb',n:150,f:1500},sandstorm:{c:'#b88a52',n:40,f:950},blizzard:{c:'#dfe6ee',n:150,f:1700}}[K];
  if(T){const tc=lin(T.c);SCN.fog.color.copy(B.c).lerp(tc,m*.85);SCN.fog.near=B.n+(T.n-B.n)*m;SCN.fog.far=B.f+(T.f-B.f)*m;}else{SCN.fog.color.lerp(B.c,Math.min(1,dt*2));SCN.fog.near+=(B.n-SCN.fog.near)*Math.min(1,dt*2);SCN.fog.far+=(B.f-SCN.fog.far)*Math.min(1,dt*2);}
  const R=Math.max(420,cam.dist*1.1);
  if(K==='sandstorm'&&m>.05){const n=(dt*90*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(2,60),vx:rnd(90,160),vy:rnd(-15,15),vh:rnd(-4,8),f:.9,c:[.78,.6,.38],s:rnd(18,36),g:22,d:rnd(1.6,2.8),a:.3*m});}}
  if(K==='blizzard'&&m>.05){const n=(dt*120*m)|0;for(let i=0;i<n;i++){const x=cam.x+rnd(-R,R),y=cam.y+rnd(-R*.7,R*.7);part({x,y,h:groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y)))+rnd(40,220),vx:rnd(50,90),vy:rnd(-10,14),vh:-rnd(30,50),f:1,c:[1.05,1.08,1.12],s:rnd(1.6,2.8),d:rnd(3,5),a:.9});}}
  if(K==='rain'){if(!RAIN){const N=1400,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6),3).setUsage(THREE.DynamicDrawUsage));RAIN=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xaab4be,transparent:true,opacity:.35,depthWrite:false}));RAIN.frustumCulled=false;RAIN.userData.d=[];for(let i=0;i<N;i++)RAIN.userData.d.push([rnd(-1,1),rnd(-1,1),rnd(0,1)]);SCN.add(RAIN);}
    RAIN.visible=m>.02;RAIN.material.opacity=.35*m;const p=RAIN.geometry.attributes.position.array,D=RAIN.userData.d,H=320;
    for(let i=0;i<D.length;i++){const d=D[i];d[2]-=dt*1.6;if(d[2]<0){d[2]+=1;d[0]=rnd(-1,1);d[1]=rnd(-1,1);}const x=cam.x+d[0]*R,y=cam.y+d[1]*R*.7,gh=groundH(Math.max(0,Math.min(MAPW,x)),Math.max(0,Math.min(MAPH,y))),h=gh+d[2]*H;p.set([x,h,y,x+3,h+14,y],i*6);}
    RAIN.geometry.attributes.position.needsUpdate=true;}else if(RAIN)RAIN.visible=false;
  const el=document.getElementById('wxchip');if(el){const W=WEATHER[k];const on=k!=='clear';el.hidden=!on;if(on){const txt=`${W.name.toUpperCase()} · vision ${Math.round((W.vis-1)*100)}% · accuracy ${Math.round((W.acc-1)*100)}%${W.air===0?' · jets grounded':''}`;if(el.textContent!==txt)el.textContent=txt;}}}
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
const DUSTC={desert:[[.86,.76,.6],[.8,.69,.53],[.9,.83,.7]],green:[[.6,.55,.45],[.53,.49,.41],[.66,.62,.54]],snow:[[.95,.97,1],[.9,.93,.97],[.97,.98,1]]};
let dustN=0;
function dustTrail(e,o,dt){if(!o||!o.visible||!(dt>0)||!e.s||!G||!G.map)return;const ud=o.userData,px=o.position.x,pz=o.position.z;
  const raw=ud.tdx==null?0:Math.min(300,Math.hypot(px-ud.tdx,pz-ud.tdz)/dt);ud.tdx=px;ud.tdz=pz;ud.tsp=(ud.tsp||0)+(raw-(ud.tsp||0))*Math.min(1,dt*3);
  const top=Math.max(35,e.s.spd||60),k=Math.max(0,Math.min(1,(ud.tsp/top-.3)/.45));if(k<=0||!inView(px,pz,.2)){ud.tacc=0;return;}
  // what is underfoot: water and bridge decks throw no dust; rain wets the ground (snow maps keep their powder)
  const M=G.map,th=M.theme==='snow'?'snow':M.theme==='green'?'green':'desert',gc=G.grid?G.grid[Math.floor(pz/CELL)*GW+Math.floor(px/CELL)]:0;
  if(gc===2||(M.isWater&&M.isWater(px,pz))||(G.wx&&G.wx.k==='rain'&&th!=='snow')){ud.tacc=0;return;}
  const B=pBudget(),n0=PARTS.length;if(n0>B*.7)return;const busy=n0>B*.45?.5:1,amp=th==='desert'?1:th==='green'?.6:.45;
  const r=e.r||12,sc=Math.min(1.5,Math.max(.8,r/12));ud.tacc=(ud.tacc||0)+dt*16*k*amp*busy*Math.min(1.2,B/1400)*sc;
  const a=ud.yaw??e.va??0,ca=Math.cos(a),sa=Math.sin(a),C=DUSTC[th],gh=groundH(px,pz),cap=B>=1100?28:16;let n=0;
  while(ud.tacc>=1&&n<3&&dustN<cap){ud.tacc-=1;n++;dustN++;const sd=(ud.tsd=-(ud.tsd||1)),w=r*rnd(.45,.65),bk=r*rnd(.75,1.05),x=px-ca*bk-sa*sd*w,y=pz-sa*bk+ca*sd*w,ov=rnd(4,12),bv=rnd(8,20)*(.5+k);
    part({x,y,h:gh+rnd(4,8),vx:-ca*bv-sa*sd*ov,vy:-sa*bv+ca*sd*ov,vh:rnd(2,6),f:.3,rise:rnd(1.5,4.5),c:C[n&1],c2:C[2],ck:.6,s:rnd(7,10)*sc*(th==='snow'?.8:1),g:rnd(9,14)*sc,d:rnd(2.2,3.4)*(th==='snow'?.7:1),a:(th==='snow'?.26:.46)*(.55+.45*k)});}
  if(ud.tacc>1)ud.tacc=1;}
/* ---------- Ricochet sparks ----------
   Rifle and machine-gun rounds striking a tank or other armoured vehicle throw a few bright, short-lived sparks off
   the hull (back toward the shooter) instead of a puff of dirt. Visual only: it looks up which vehicle is at the impact
   point without changing anything. */
const RICO_NB=[];
function ricoHit(x,y){if(!G||!G.ents||!inView(x,y,.05))return false;let hit=false;try{nearby(x,y,30,RICO_NB);for(let i=0;i<RICO_NB.length;i++){const e=RICO_NB[i];if(e.dead||e.isB||!e.s||e.s.dom!=='ground'||e.s.armor!=='heavy')continue;const R=(e.r||12)+5;if((e.x-x)*(e.x-x)+(e.y-y)*(e.y-y)<R*R){hit=true;break;}}}catch(err){}RICO_NB.length=0;return hit;}
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
  const a=e.va||0,ca=Math.cos(a),sa=Math.sin(a),r=e.r||14,big=r>20,lv=(typeof QUAL!=='undefined'&&QUAL.lv)||0,near=inView(px,pz,.35);
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
    if(T){try{const w=o.clone(true);w.traverse(c=>{if(c.isMesh)c.material=Array.isArray(c.material)?c.material.map(bm):bm(c.material);if(c.isSkinnedMesh)c.visible=false;});add(w);}catch(e){}}}
  try{add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),bm(MAT.std)));add(new THREE.Mesh(new THREE.BoxGeometry(4,4,4),MAT.std));if(typeof gearVCMat==='function'){const gm=gearVCMat();const gg=new THREE.BoxGeometry(2,2,2);const cc=new Float32Array(gg.attributes.position.count*3).fill(.5);gg.setAttribute('color',new THREE.BufferAttribute(cc,3));add(new THREE.Mesh(gg,gm));add(new THREE.Mesh(gg,bm(gm)));}}catch(e){}
  for(const op of [.8,.12])add(new THREE.Mesh(new THREE.CircleGeometry(4,8),new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:op,depthWrite:false})));
  // shockwave rings: drawn once, faintly and in view, so the GPU has their exact drawing state ready too
  const shk=SHOCKS.map(S=>[S.m.position.clone(),S.m.scale.x,S.m.material.opacity]);for(const S of SHOCKS){S.m.position.set(bx,groundH(bx,by)+2.5,by);S.m.scale.setScalar(60);S.m.material.opacity=.01;}
  const W0=WASH[0];if(W0){W0.m.visible=true;W0.m.material.opacity=.01;W0.m.position.set(bx,groundH(bx,by)+2.5,by);W0.m.scale.setScalar(60);}
  // With post-processing on, the battle is only ever drawn into the post-processing target, never straight to the
  // screen (which needs different shader variants), so the warm-up prepares those variants only: one scene draw, not two.
  SCN.add(grp);try{if(typeof placeCam==='function')placeCam();const post=typeof renderPost==='function'&&POST.on&&POST.mFinal;if(post){sizePost();R3.setRenderTarget(POST.rt);}R3.compile(SCN,CAM);if(typeof renderPost==='function'){CAM.updateMatrixWorld();renderPost();}R3.setRenderTarget(null);if(!post)R3.render(SCN,CAM);}catch(e){console.warn('shader warm-up',e);}SCN.remove(grp);SHOCKS.forEach((S,i)=>{S.m.position.copy(shk[i][0]);S.m.scale.setScalar(shk[i][1]);S.m.material.opacity=shk[i][2];});
  console.log('shader warm-up',Math.round(performance.now()-t0)+' ms, '+grp.children.length+' objects');}

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

