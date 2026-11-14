/* ================= REALISM (render only, orch/realism): garrison windows, floor-by-floor damage, living towns ================= */
// Nothing here touches the simulation: it only reads G and draws. Garrisoned city buildings show dark silhouettes in their
// windows and flash when the troops inside fire; a garrison that is losing HP shows holes and smoke from more and more
// floors, then flames. Towns get a few civilians and cars that run when shooting starts nearby, and the street lights and
// window lights go dark while a fight rages near the camera. Civilians and cars are cosmetic (never targetable, never in
// the sim) and are off on Low / phones.
const RE={refD:0,refN:0,gars:[],gT:-9,sil:null,hole:null,cvs:null,shots:new Float32Array(96),shN:0,civ:[],cars:[],civT:0,dark:0,lampBase:null,lampSet:-1,cityBase:null,citySet:-1,tex:{}};
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
function reGarRefresh(){RE.gars.length=0;RE.gT=G.t;for(const e of G.ents)if(!e.dead&&e.kind==='garrison'&&e.civ){if(e.k==null)e.k=0;RE.gars.push(e);}}
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
const RE_CC=[[.72,.66,.58],[.38,.45,.55],[.55,.28,.25],[.3,.4,.3]];let RE_HUM=null,RE_CARM=null;
// Town civilians are people, not boxes (Abdullah 2026-11-13 "Make sure civilians on the maps look like humans and aren't
// blocky"): one smooth human figure (same height as the infantry, real proportions: rounded head with hair or a headscarf,
// neck, shoulders, tapered arms and legs, hands, shoes; an optional long robe), built in code once, drawn as ONE instanced
// mesh for every civilian on screen (plus a thinner copy for far views). Each person gets their own clothes, skin tone,
// hair or headscarf, robe or trousers and body size through per-instance values; the vertex shader swings the legs and arms
// (walk, or a run with bent elbows and a forward lean when shooting starts), so there are no skeletons to update on the CPU.
// Never olive/khaki together, never a helmet, vest or weapon: they must never look like soldiers.
const RE_HUMSKIN=['#f1c9a5','#e0ac85','#c68e64','#a8754f','#8a5a3b','#6b4430','#4e3022'],RE_HUMHAIR=['#141110','#1f1712','#2e2219','#4a3526','#6d6a66','#b9b4ab'],
  RE_HUMTOP=['#e9e6de','#d8d3c6','#9fb4c9','#5a7393','#2f3d57','#7c2f2f','#a8573a','#c9a24a','#4f5d6b','#2a2a2c','#6b4f3b','#8b8f95','#d9a7a0','#7a5a78'],
  RE_HUMBOT=['#2c3446','#3b475e','#25262a','#4a4038','#5d5a55','#3a3530','#1d2230'],RE_HUMROBE=['#ece8df','#ddd6c8','#c9bfae','#1a1a1c','#2b2622','#5e5a55','#3a3f4a'],
  RE_HUMSCARF=['#18181a','#232838','#d9d2c4','#6e2b33','#3d4a5c','#8a7a62','#ece8e0','#4a3f5a'];
// up to 10 town civilians plus the refugee columns in view (at most 10 columns of 9)
const RE_HUMCAP=100;
function reHumGeo(lo){const parts=[],S=lo?6:12,SA=lo?5:9,SB=lo?4:8,V2=a=>a.map(p=>new THREE.Vector2(p[0],p[1]));
  const M=(x,y,z,sx,sy,sz,rz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rz||0),new THREE.Vector3(sx||1,sy||1,sz||1));
  const add=(g,rg,pt,m)=>{if(m)g.applyMatrix4(m);parts.push({g,rg,pt});};
  const lathe=(pts,seg)=>new THREE.LatheGeometry(V2(pts),seg||S),sph=r=>new THREE.SphereGeometry(r,S,SB);
  // regions: 0 skin 1 top 2 trousers 3 hair 4 shoes 5 headscarf (optional) 6 robe (optional); parts: 0 body, 1/2 left thigh/shin,
  // 3/4 right thigh/shin, 5/6 left upper arm/forearm, 7/8 right. The figure stands on y=0, faces +x, is 1.75 tall, left = +z.
  for(const sd of [1,-1]){const z=.095*sd,L=sd>0?0:2,A=sd>0?0:2;
    add(sph(1),4,2+L,M(.045,.045,z,.135,.055,.058));
    add(lathe([[0,.07],[.04,.08],[.046,.18],[.055,.32],[.048,.45],[0,.52]],SA),2,2+L,M(0,0,z));
    add(lathe([[0,.46],[.056,.48],[.069,.62],[.082,.79],[.088,.9],[0,.97]],SA),2,1+L,M(0,0,z));
    add(sph(1),1,0,M(0,1.37,.185*sd,.075,.068,.075));
    add(lathe([[0,1.09],[.041,1.11],[.047,1.2],[.051,1.32],[.046,1.41],[0,1.44]],SA),1,5+A,M(0,0,.205*sd));
    add(lathe([[0,.85],[.034,.87],[.04,.99],[.043,1.1],[0,1.15]],SA),1,6+A,M(0,0,.205*sd));
    add(sph(1),0,6+A,M(.005,.8,.205*sd,.034,.055,.026));}
  add(sph(1),2,0,M(0,.93,0,.12,.11,.17));
  add(lathe([[0,.9],[.13,.93],[.135,1.02],[.15,1.19],[.163,1.31],[.148,1.41],[.07,1.47],[0,1.48]]),1,0,M(0,0,0,.74,1,1.22));
  add(lathe([[0,1.4],[.05,1.42],[.047,1.55],[0,1.58]],SA),0,0);
  add(sph(1),0,0,M(.006,1.638,0,.104,.118,.096));
  add(sph(1),0,0,M(.1,1.625,0,.02,.026,.015));
  add(new THREE.SphereGeometry(1,S,SB,0,Math.PI*2,0,Math.PI*.56),3,0,M(-.012,1.648,0,.11,.122,.104,.32));
  add(new THREE.SphereGeometry(1,S,SB,Math.PI+.82,Math.PI*2-1.64,0,Math.PI*.8),5,0,M(-.004,1.64,0,.118,.13,.113));
  add(lathe([[.07,1.56],[.12,1.5],[.2,1.42],[.235,1.33],[0,1.31]]),5,0,M(-.01,0,0,.78,1,1.06));
  add(lathe([[.14,1.0],[.16,.84],[.195,.52],[.225,.22],[.24,.06],[0,.05]]),6,0,M(0,0,0,.82,1,1.04));
  let nv=0,ni=0;for(const p of parts){nv+=p.g.attributes.position.count;ni+=p.g.index.count;}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),R=new Float32Array(nv*2),I=new Uint16Array(ni);let ov=0,oi=0;
  for(const p of parts){const a=p.g.attributes.position,n=p.g.attributes.normal,c=a.count;P.set(a.array,ov*3);N.set(n.array,ov*3);for(let i=0;i<c;i++){R[(ov+i)*2]=p.rg;R[(ov+i)*2+1]=p.pt;}
    const ix=p.g.index.array;for(let i=0;i<ix.length;i++)I[oi+i]=ix[i]+ov;oi+=ix.length;ov+=c;p.g.dispose();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('hr',new THREE.BufferAttribute(R,2));g.setIndex(new THREE.BufferAttribute(I,1));
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.9,0),1.2);return g;}
// the pose, shared by the picture and the shadow: legs swing about the hips with the knee bending through the swing, arms
// swing opposite, elbows bend more when running, the body leans into a run and drops as the legs open (feet stay down)
let RE_HUMVS=`attribute vec2 hr;attribute vec4 iA;attribute vec4 iT;attribute vec3 iBt;attribute vec3 iS;attribute vec3 iH;attribute vec3 iSc;
vec3 hR(vec3 p,vec3 o,float a){p-=o;float c=cos(a),s=sin(a);return vec3(p.x*c-p.y*s,p.x*s+p.y*c,p.z)+o;}
vec3 hPose(vec3 p,inout vec3 n){float rg=hr.x,pt=hr.y,ph=iA.x,run=iA.y,mv=iT.w;
 if(rg>4.5&&rg<5.5&&iA.z<.5)return vec3(0.,1.62,0.);if(rg>5.5&&iA.w<.5)return vec3(0.,.92,0.);
 float A=mix(.34,.62,run)*mv,K=mix(.6,1.45,run)*mv,AR=mix(.3,.55,run)*mv,E=.14+mix(.12,1.05,run)*min(1.,mv*3.),LN=.2*run*mv;
 float sd=(pt>.5&&pt<2.5)||(pt>4.5&&pt<6.5)?0.:3.14159,q=ph+sd,zs=sd>1.?-1.:1.;
 if(pt>.5&&pt<4.5){float th=A*sin(q),kn=.06+K*max(0.,cos(q-.55));vec3 hp=vec3(0.,.9,.095*zs);
  if(pt>1.5&&pt<2.5||pt>3.5){p=hR(p,vec3(0.,.49,.095*zs),-kn);n=hR(n,vec3(0.),-kn);}p=hR(p,hp,th);n=hR(n,vec3(0.),th);}
 else{if(pt>4.5){float ua=-AR*sin(q)-.03,el=E+.25*AR*(.5-.5*sin(q));vec3 sp=vec3(0.,1.4,.205*zs);
  if(pt>5.5&&pt<6.5||pt>7.5){p=hR(p,vec3(0.,1.12,.205*zs),el);n=hR(n,vec3(0.),el);}p=hR(p,sp,ua);n=hR(n,vec3(0.),ua);}
  if(rg<5.5){p=hR(p,vec3(0.,.92,0.),-LN);n=hR(n,vec3(0.),-LN);}else{p.x+=.03*sin(2.*ph)*mv*(1.-p.y);}}
 p.y-=.88*(1.-cos(A*sin(ph)))-run*mv*.035*abs(cos(ph));return p;}`;
function reHumMat(depth){const m=depth?new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}):new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,metalness:0});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+RE_HUMVS+(depth?'':'\nvarying vec3 vHC;'))
    .replace('#include <begin_vertex>','vec3 hN0=vec3(0.,1.,0.);vec3 transformed=hPose(vec3(position),hN0);');
    if(!depth){sh.vertexShader=sh.vertexShader.replace('#include <beginnormal_vertex>','vec3 hP0=vec3(position);vec3 objectNormal=vec3(normal);hP0=hPose(hP0,objectNormal);')
      .replace('#include <color_vertex>','#include <color_vertex>\nvHC=hr.x<.5?iS:hr.x<1.5?iT.rgb:hr.x<2.5?iBt:hr.x<3.5?iH:hr.x<4.5?vec3(.035,.03,.028):hr.x<5.5?iSc:iBt;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHC;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vHC;');}};
  m.customProgramCacheKey=()=>'civhum'+(depth?'d':'');return m;}
function reHumMesh(lo){const g=reHumGeo(lo),cap=RE_HUMCAP;for(const [k,n] of [['iA',4],['iT',4],['iBt',3],['iS',3],['iH',3],['iSc',3]]){const a=new THREE.InstancedBufferAttribute(new Float32Array(cap*n),n);a.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,a);}
  const m=new THREE.InstancedMesh(g,reHumMat(0),cap);m.customDepthMaterial=reHumMat(1);m.count=0;m.visible=false;m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;m.name='civilians';SCN.add(m);return m;}
// one person's look: clothes, skin, hair or headscarf, robe (thobe / abaya) or shirt and trousers, height and build
function reHumLook(R){R=R||Math.random;const pk=a=>a[(R()*a.length)|0],L=c=>new THREE.Color(c).convertSRGBToLinear(),robe=R()<.28,scarf=robe?R()<.55:R()<.22;
  let top=pk(RE_HUMTOP),bot=pk(RE_HUMBOT);if(robe){top=bot=pk(RE_HUMROBE);}
  return{robe,scarf,top:L(top),bot:L(bot),skin:L(pk(RE_HUMSKIN)),hair:L(robe&&!scarf&&R()<.5?'#ecebe6':pk(RE_HUMHAIR)),sc:L(pk(RE_HUMSCARF)),s:.9+.15*R(),w:.92+.2*R()};}
// a fixed look per refugee (the same person every frame, on every screen)
function reRng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function reCivInit(){const mk=(builder,cap,cols)=>cols.map(col=>{const B=Bld();builder(B,col);const m=new THREE.InstancedMesh(B.geo(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),cap);m.count=0;m.frustumCulled=false;m.castShadow=true;SCN.add(m);return m;});
  const hex=a=>'#'+a.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  RE_HUM=[reHumMesh(0),reHumMesh(1)];
  RE_CARM=mk((B,c)=>{B.box(12,2.6,5.6,0,2.4,0,hex(c));B.box(6.4,2.2,5,-.8,4.8,0,hex(c.map(v=>v*.8)));B.box(5.6,1.1,5.1,-.8,5,0,'#1a2228');for(const sx of [-3.8,3.8])for(const sz of [-2.9,2.9])B.box(2.4,2.4,.8,sx,1.2,sz,'#14120f');},3,RE_CC);}
// civilians stand as tall as the infantry (about 1.75 m): game units per meter
function reHumU(){const c=typeof MCFG!=='undefined'&&MCFG.inf;return((c&&c.size)||16)*.95/1.75;}
function reShotNear(x,y,R,age){let best=1e9,bx=0,by=0;for(let i=0;i<96;i+=3){const t=RE.shots[i+2];if(!t||G.t-t>age||G.t<t)continue;const d=Math.hypot(RE.shots[i]-x,RE.shots[i+1]-y);if(d<R&&d<best){best=d;bx=RE.shots[i];by=RE.shots[i+1];}}return best<1e9?[bx,by,best]:null;}
function reFree(x,y){return passC('ground',Math.floor(x/CELL),Math.floor(y/CELL));}
function reLine(x,y,tx,ty){const n=Math.ceil(Math.hypot(tx-x,ty-y)/10);for(let i=1;i<=n;i++)if(!reFree(x+(tx-x)*i/n,y+(ty-y)*i/n))return false;return true;}
function reCivTick(dt){if(!G.civ||!G.civ.length||cam.dist>820){if(RE_HUM)for(const m of RE_HUM)m.visible=false;return;}if(!RE_HUM)reCivInit();const U=reHumU();
  RE.civT-=dt;const danger=reShotNear(cam.x,cam.y,cam.dist*1.1+400,4);
  if(RE.civT<=0){RE.civT=.7;const lim=Math.min(10,Math.ceil(cam.dist/70));
    for(let tr=0;tr<10&&RE.civ.length<lim;tr++){const c=G.civ[(Math.random()*G.civ.length)|0];if(!c||c.dead||c.ruin||Math.hypot(c.x-cam.x,c.y-cam.y)>cam.dist*.9+60)continue;if(c.g)continue;
      const x=c.x+rnd(-CELL*1.3,CELL*1.3),y=c.y+rnd(-CELL*1.3,CELL*1.3);if(!reFree(x,y)||reShotNear(x,y,380,5)||!inView(x,y,-.05)&&Math.random()<.7)continue;RE.civ.push({x,y,a:rnd(0,6.28),sp:rnd(1.15,1.45)*U,tx:x,ty:y,lk:reHumLook(),ph:Math.random()*6,g:0,mv:1,fl:0,age:0,home:c});}
    if(RE.cars.length<3&&Math.random()<.35&&!danger)for(let tr=0;tr<30;tr++){const c=G.civ[(Math.random()*G.civ.length)|0];if(!c||c.dead||c.ruin||Math.hypot(c.x-cam.x,c.y-cam.y)>cam.dist*.9)continue;const a=(Math.random()<.5?0:Math.PI/2)+(Math.random()<.5?0:Math.PI),x=c.x,y=c.y,L=rnd(90,200),tx=x+Math.cos(a)*L,ty=y+Math.sin(a)*L;
      if(!reFree(x,y)||!reLine(x,y,tx,ty))continue;RE.cars.push({x,y,a,tx,ty,sp:rnd(22,30),col:(Math.random()*4)|0,age:0,fl:0});break;}}
  const vis=[];const tmp=RE.tmpM||(RE.tmpM=new THREE.Matrix4()),q=RE.tmpQ||(RE.tmpQ=new THREE.Quaternion()),v=RE.tmpV||(RE.tmpV=new THREE.Vector3()),sc=RE.tmpS||(RE.tmpS=new THREE.Vector3(1,1,1)),ax=RE.ax||(RE.ax=new THREE.Vector3(0,1,0));
  for(let i=RE.civ.length-1;i>=0;i--){const p=RE.civ[i];p.age+=dt;const dg=reShotNear(p.x,p.y,300,4);
    if(p.home&&p.home.dead||p.age>400||(dg&&dg[2]<45&&Math.random()<dt*.5)){RE.civ.splice(i,1);continue;}
    if(dg){p.fl=1;const ax2=p.x-dg[0],ay2=p.y-dg[1],d=Math.hypot(ax2,ay2)||1;let ta=Math.atan2(ay2,ax2);for(const da of [0,.7,-.7,1.4,-1.4]){const nx=p.x+Math.cos(ta+da)*14,ny=p.y+Math.sin(ta+da)*14;if(reFree(nx,ny)){p.a=ta+da;break;}}p.sp=5.2*U;}
    else{if(p.fl){p.fl=0;p.sp=rnd(1.15,1.45)*U;p.tx=p.x;p.ty=p.y;}
      if(Math.hypot(p.tx-p.x,p.ty-p.y)<3){let ok=false;for(let tr=0;tr<6&&!ok;tr++){const a=rnd(0,6.28),L=rnd(30,90),tx=p.x+Math.cos(a)*L,ty=p.y+Math.sin(a)*L;if(reLine(p.x,p.y,tx,ty)){p.tx=tx;p.ty=ty;p.a=a;ok=true;}}if(!ok){p.age+=60;}}else p.a=Math.atan2(p.ty-p.y,p.tx-p.x);}
    const nx=p.x+Math.cos(p.a)*p.sp*dt,ny=p.y+Math.sin(p.a)*p.sp*dt;if(reFree(nx,ny)){p.x=nx;p.y=ny;}else if(p.fl){p.sp=0;}else{p.tx=p.x;p.ty=p.y;}
    if(p.fl&&!inView(p.x,p.y,.3)&&Math.hypot(p.x-cam.x,p.y-cam.y)>cam.dist+250){RE.civ.splice(i,1);continue;}
    // gait: run blend eases in/out, the stride cadence follows the ground speed so feet do not slide
    p.g+=((p.fl?1:0)-p.g)*Math.min(1,dt*4);p.mv+=((p.sp>.5?1:0)-p.mv)*Math.min(1,dt*6);const lk=p.lk;p.ph+=dt*6.2832*p.sp/(U*lk.s*(1.2+1.5*p.g));
    if(!inView(p.x,p.y,.1))continue;
    q.setFromAxisAngle(ax,-p.a);v.set(p.x,groundH(p.x,p.y),p.y);const k=U*lk.s;sc.set(k*lk.w,k,k*lk.w);tmp.compose(v,q,sc);vis.push([tmp.clone(),p]);}
  // refugee columns (sim state G.refs, synced): the people walking away from a town under fire are drawn with the same figure;
  // the 2D overlay then only shows its REFUGEES label (drawRefugeesWorld)
  if(G.refs&&G.refs.length){RE.refD=performance.now();const LS=RE.refLk||(RE.refLk={});if(RE.refN++>2000){RE.refN=0;for(const k in LS)if(!G.refs.some(r=>k.startsWith(r.id+'_')))delete LS[k];}
    for(const r of G.refs){if(!(G.t<r.t0+r.dur))continue;const pp=refPos(r);if(!inView(pp[0],pp[1],.15))continue;q.setFromAxisAngle(ax,-Math.atan2(r.dy,r.dx));
      for(let i=0;i<r.n;i++){const off=i*9-r.n*4.5,x=pp[0]-r.dx*off+r.dy*((i%3)-1)*7,y=pp[1]-r.dy*off-r.dx*((i%3)-1)*7,key=r.id+'_'+i,lk=LS[key]||(LS[key]=reHumLook(reRng(r.id*131+i*17+7)));
        v.set(x,groundH(x,y),y);const k=U*lk.s;sc.set(k*lk.w,k,k*lk.w);tmp.compose(v,q,sc);vis.push([tmp.clone(),{ph:(G.t-r.t0)*REF_SP*6.2832/(U*lk.s*1.2)+i*1.9,g:0,mv:1,lk}]);}}}
  const far=cam.dist>300,hm=RE_HUM[far?1:0],ho=RE_HUM[far?0:1];ho.count=0;ho.visible=false;const ga=hm.geometry.attributes;let n=0;
  for(const [M,p] of vis){if(n>=RE_HUMCAP)break;const lk=p.lk;hm.setMatrixAt(n,M);ga.iA.setXYZW(n,p.ph%6.2832,p.g,lk.scarf?1:0,lk.robe?1:0);ga.iT.setXYZW(n,lk.top.r,lk.top.g,lk.top.b,p.mv);
    ga.iBt.setXYZ(n,lk.bot.r,lk.bot.g,lk.bot.b);ga.iS.setXYZ(n,lk.skin.r,lk.skin.g,lk.skin.b);ga.iH.setXYZ(n,lk.hair.r,lk.hair.g,lk.hair.b);ga.iSc.setXYZ(n,lk.sc.r,lk.sc.g,lk.sc.b);n++;}
  hm.count=n;hm.visible=n>0;hm.instanceMatrix.needsUpdate=true;for(const k of ['iA','iT','iBt','iS','iH','iSc'])ga[k].needsUpdate=true;
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
function realTick(dt){if(!G||!G.terrain||!(dt>0))return;if(window.NOREAL)return;if(RE.gG!==G){RE.gG=G;RE.civ.length=0;RE.cars.length=0;RE.shots.fill(0);RE.dark=0;if(RE_HUM)for(const m of RE_HUM.concat(RE_CARM)){m.count=0;if(!m.parent)SCN.add(m);}}if(G.t-RE.gT>.5)reGarRefresh();
  try{reDark(dt);}catch(e){}try{reGarFx(dt);}catch(e){if(!RE.er++)console.warn('realism garrison',e);}
  const lo=typeof fxPH==='function'&&fxPH()||(typeof gfxLow==='function'&&gfxLow());if(!lo)try{reCivTick(dt);}catch(e){if(!RE.er++)console.warn('realism towns',e);}else if(RE_HUM){for(const m of RE_HUM.concat(RE_CARM))m.count=0;RE.civ.length=0;RE.cars.length=0;}}
RE.er=0;
