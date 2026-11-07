// Portrait tool: renders one realistic 3D bust (MakeHuman CC0 head morph + procedural hair/beard/uniform/headgear) in studio
// portrait lighting, then gives it a painterly pass (Kuwahara + warm grade + canvas grain) and a gilded frame.
// Runs only at build time (orch/portraits/bake.mjs, sheet.html). three is imported from the page's import map.
import * as THREE from 'three';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),sst=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);};
const nz=(x,y,z)=>{const s=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;return s-Math.floor(s);};
const col=(h)=>new THREE.Color(h);
let RDR=null;
function renderer(w,h){if(!RDR){RDR=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});RDR.shadowMap.enabled=true;RDR.shadowMap.type=THREE.PCFSoftShadowMap;RDR.outputColorSpace=THREE.SRGBColorSpace;RDR.toneMapping=THREE.ACESFilmicToneMapping;RDR.toneMappingExposure=1.05;}RDR.setSize(w,h,false);return RDR;}
function geo(P,F,N){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));if(N)g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setIndex(F);return g;}
function tri(F4){const o=[];for(const q of F4)o.push(q[0],q[1],q[2],q[0],q[2],q[3]);return o;}

/* a shell hugging the head/body: wFn(i,x,y,z)->0..1 (zone), tFn(i,w,x,y,z)->thickness; returns Mesh using the base normals */
function shell(base,wFn,tFn,colFn,mat){const {P,N,F}=base,n=P.length/3,w=new Float32Array(n),Q=new Float32Array(n*3),C=new Float32Array(n*3);
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];w[i]=wFn(i,x,y,z);const t=w[i]>0?tFn(i,w[i],x,y,z):0;
    Q[i*3]=x+N[i*3]*t;Q[i*3+1]=y+N[i*3+1]*t;Q[i*3+2]=z+N[i*3+2]*t;const c=colFn(i,w[i],x,y,z);C[i*3]=c.r;C[i*3+1]=c.g;C[i*3+2]=c.b;}
  const idx=[];for(const q of F){if(w[q[0]]>.02&&w[q[1]]>.02&&w[q[2]]>.02&&w[q[3]]>.02)idx.push(q[0],q[1],q[2],q[0],q[2],q[3]);}
  if(!idx.length)return null;const g=geo(Q,idx);g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m;}

export function buildBust(spec,meshData,F4){
  const P=Float32Array.from(meshData.P),n=P.length/3,scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
  const idx=tri(F4),g=geo(P,idx);g.computeVertexNormals();const N=g.getAttribute('normal').array,base={P,N,F:F4};
  const R=(()=>{let a=spec.seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};})();
  let topY=-9,chinY=9,halfW=0;for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];if(y>topY)topY=y;if(z>1.1&&y>6.4&&y<chinY)chinY=y;}
  for(let i=0;i<n;i++){const y=P[i*3+1];if(y>topY-.6&&y<topY-.25)halfW=Math.max(halfW,Math.abs(P[i*3]));}
  const mouthY=chinY+.5,noseY=chinY+.68,hs0=halfW/1.0,hatDY=meshData.eyeL[1]-8.077-.12;
  const skin=col(spec.skin),female=spec.sx==='f',age=spec.age,old=clamp((age-40)/40,0,1);
  /* ---- skin vertex colours: blush, lips, under-eye shadow, tiny mottling ---- */
  const C=new Float32Array(n*3);const eL=meshData.eyeL,eR=meshData.eyeR;
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];const c=skin.clone();const v=0.94+0.1*nz(x*9,y*9,z*9);c.multiplyScalar(v);
    const face=sst(0.2,1,z)*sst(7.0,7.4,y)*sst(8.9,8.5,y);
    const lip=sst(.5,.3,Math.abs(x))*sst(.09,.0,Math.abs(y-7.47))*sst(1.2,1.5,z);if(lip>0)c.lerp(col(female?0xb04a4e:0xa05a4a),lip*.6);
    const cheek=sst(1.0,.45,Math.abs(Math.abs(x)-.62))*sst(.35,.0,Math.abs(y-7.75))*face;c.lerp(col(0xc86a5a),cheek*.15);
    const eye=sst(.28,.05,Math.hypot(x-(x>0?eL[0]:eR[0]),y-(eL[1]-.13)))*face*(1);c.multiplyScalar(1-.14*eye*(.6+old*.8));
    C[i*3]=c.r;C[i*3+1]=c.g;C[i*3+2]=c.b;}
  const head=new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.52,clearcoat:.18,clearcoatRoughness:.5,sheen:.6,sheenColor:col(0xff9a7a),sheenRoughness:.5}));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));head.castShadow=true;head.receiveShadow=true;root.add(head);
  /* ---- eyes ---- */
  const eyeCol=col(spec.eye);for(const c of [eL,eR]){const eg=new THREE.Group();eg.position.set(c[0],c[1],c[2]+.018);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.158,24,18),new THREE.MeshPhysicalMaterial({color:0xf2ede4,roughness:.25,clearcoat:1,clearcoatRoughness:.05}));eg.add(ball);
    const dome=(rad,ang,mat)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(rad,24,8,0,Math.PI*2,0,ang),mat);m.rotation.x=Math.PI/2;return m;};
    eg.add(dome(.1606,Math.asin(.082/.158),new THREE.MeshPhysicalMaterial({color:eyeCol,roughness:.3,clearcoat:1})));eg.add(dome(.1612,Math.asin(.038/.158),new THREE.MeshBasicMaterial({color:0x050403})));
    const spec2=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));spec2.position.set(.035,.04,.158);eg.add(spec2);root.add(eg);}
  /* ---- eyebrows (tubes snapped to the face with a raycast) ---- */
  const ray=new THREE.Raycaster();const surf=(x,y)=>{ray.set(new THREE.Vector3(x,y,5),new THREE.Vector3(0,0,-1));const h=ray.intersectObject(head)[0];return h?h.point.z:1.3;};
  const bc=col(spec.hair.style==='bald'&&spec.beard.col!==undefined?spec.beard.col:spec.hair.col).multiplyScalar(.8);const bw=female?.7:1.15+.4*R();
  for(const s of [1,-1]){const pts=[];for(let k=0;k<=8;k++){const u=k/8,x=s*(.13+.58*u),y=eL[1]+.22+.06*Math.sin(u*Math.PI*.9)-.05*u*u+(female?.03:0);pts.push(new THREE.Vector3(x,y,surf(x,y)+.012));}
    const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.034*bw,6,false),new THREE.MeshStandardMaterial({color:bc,roughness:.85}));tube.scale.set(1,.7,1);root.add(tube);}
  /* ---- hair ---- */
  const hs=spec.hair,hc=col(hs.col);
  if(hs.style!=='bald'){const long=hs.style==='bob';const th={buzz:.03,short:.08,swept:.11,bob:.1}[hs.style]||.06;
    const hl=(x,z)=>z>.15?8.72-.5*sst(.45,1.0,Math.abs(x))-(long?.35:0):7.55+(8.2-7.55)*sst(-.7,.15,z)-(long?.25:0);
    const m=shell(base,(i,x,y,z)=>{const ear=(Math.abs(x)>.9&&y<8.45&&Math.abs(z)<.75&&!long)?0:1;return sst(hl(x,z),hl(x,z)+.14,y)*ear*(long||z>-.6||y>7.9?1:.9);},(i,w,x,y,z)=>w*(th+(hs.style==='swept'?.07*sst(8.7,9.2,y)*sst(-.3,1,z):0)+.015*nz(x*14,y*14,z*14))+(long?.05*sst(8.5,7.5,y):0),
      (i,w,x,y,z)=>{const c=hc.clone();c.multiplyScalar(.72+.5*nz(x*40+z*10,y*35,z*40));if(hs.style==='buzz')c.lerp(skin,.45);return c;},new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}));if(m)root.add(m);}
  /* ---- beard / moustache ---- */
  const bs=spec.beard;if(bs.style!=='none'){const bcol=col(bs.col),long=bs.style==='long',full=bs.style==='full'||long,mou=bs.style==='moustache',stub=bs.style==='stubble';
    const mY=mouthY,zone=(x,y,z)=>{const a=Math.abs(x);let w=0;if(full||stub){w=sst(.98,.8,a)*sst(eL[1]-.3,eL[1]-.55,y)*sst(chinY-.2,chinY+.12,y)*sst(-.2,.5,z)*(1-sst(noseY+.02,noseY-.1,y)*sst(.5,.2,a)*sst(1.3,1.6,z));w*=1-sst(.14,.04,Math.abs(y-mY))*sst(.45,.2,a)*(long?.55:1);}
      if(full||mou||stub&&false){const m2=sst(.5,.28,a)*sst(.16,.04,Math.abs(y-(noseY-.1)))*sst(1.2,1.5,z);w=Math.max(w,m2);}return clamp(w,0,1);};
    const m=shell(base,(i,x,y,z)=>zone(x,y,z)*(stub?.55:1),(i,w,x,y,z)=>w*((stub?.012:full?.075:.045)+.02*nz(x*17,y*17,z*17))+(long?w*.06*sst(7.4,6.8,y):0),
      (i,w,x,y,z)=>{const c=bcol.clone();c.multiplyScalar(.7+.5*nz(x*36,y*34+z*8,z*36));if(stub)c.lerp(skin,.5);return c;},new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}));if(m){
      if(long){const pa=m.geometry.getAttribute('position');for(let i=0;i<pa.count;i++){const y=pa.getY(i);if(y<chinY+.3){const d=chinY+.3-y;pa.setY(i,y-d*1.6);pa.setZ(i,pa.getZ(i)+d*.3);}}m.geometry.computeVertexNormals();}root.add(m);}}
  /* ---- clothing (shell over shoulders) ---- */
  const cl=spec.cloth,cc=col(cl.col);
  const cloth=shell(base,(i,x,y,z)=>{const r=Math.hypot(x*.9,z);const neck=sst(.5,.68,r);return sst(chinY-.05,chinY-.3,y)*neck+sst(chinY-.45,chinY-.7,y)*(1-neck);},
    (i,w,x,y,z)=>w*(cl.type==='robe'?.085:.055)+.012*Math.sin(x*16+y*9)*Math.sin(z*7+y*5),
    (i,w,x,y,z)=>{const c=cc.clone();c.multiplyScalar(.85+.3*nz(x*50,y*50,z*50)+(cl.type==='robe'?.0:.0));return c;},new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,}));
  if(cloth)root.add(cloth);
  const shMat=(c,r=.7,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const gold=shMat(cl.accent||0xc9a64a,.3,.85);
  const lathe=(prof,mat,seg=40)=>{const m=new THREE.Mesh(new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),seg),mat);m.castShadow=true;m.receiveShadow=true;return m;};
  // neck: open collar ring in the shirt/trim colour
  if(cl.type==='suit'||cl.type==='uniform'){const sh=lathe([[.58,6.78],[.66,6.95],[.64,7.12],[.58,7.2],[.55,7.1],[.58,6.95]],shMat(cl.col2||0xece8de,.7));sh.scale.set(1,1,.92);sh.position.z=-.02;root.add(sh);
    // tie / V front
    const tie=new THREE.Mesh(new THREE.PlaneGeometry(.2,.9,1,4),shMat(cl.type==='suit'?cl.accent:0x20201c,.5));tie.position.set(0,6.45,surf(0,6.45)+.07);root.add(tie);
    const kn=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),shMat(cl.type==='suit'?cl.accent:0x20201c,.5));kn.position.set(0,6.9,surf(0,6.9)+.06);kn.scale.set(1,.8,.7);root.add(kn);
    // lapels / collar flaps
    for(const s of [1,-1]){const lp=new THREE.Mesh(new THREE.BoxGeometry(.34,.95,.05),shMat(cc.clone().multiplyScalar(.9).getHex(),.8));lp.position.set(s*.45,6.45,surf(s*.45,6.45)+.09);lp.rotation.set(0,s*.25,s*-.38);root.add(lp);}}
  if(cl.type==='tunic'){const co=lathe([[.6,6.85],[.7,7.0],[.69,7.3],[.62,7.35],[.58,7.2],[.6,7.0]],shMat(cl.col,.85));co.position.z=-.02;root.add(co);
    for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),gold);b.position.set(0,6.85-k*.32,surf(0,6.85-k*.32)+.06);root.add(b);}}
  if(cl.type==='thobe'||cl.type==='robe'){const co=lathe([[.58,6.8],[.7,6.95],[.66,7.15],[.58,7.2]],shMat(cl.type==='robe'?0xf0ece2:0xf5f3ee,.7));co.scale.set(1,1,.9);co.position.z=-.02;root.add(co);
    if(cl.type==='robe'){const V=new THREE.Mesh(new THREE.PlaneGeometry(.55,.9),shMat(0xf0ece2,.7));V.position.set(0,6.4,surf(0,6.4)+.075);root.add(V);} }
  if(cl.type==='thobe'&&cl.col!==0xf2f0ea){/* bisht trim */for(const s of [1,-1]){const tr=new THREE.Mesh(new THREE.BoxGeometry(.05,1.6,.04),gold);tr.position.set(s*.62,6.4,surf(s*.62,6.4)+.07);tr.rotation.z=s*-.12;root.add(tr);}}
  if(cl.type==='uniform'){const sd=[1,-1];for(const s of sd){const ep=new THREE.Mesh(new THREE.BoxGeometry(.62,.05,.9),shMat(cl.col,.6));const px=s*1.45,py=(()=>{ray.set(new THREE.Vector3(px,9,0),new THREE.Vector3(0,-1,0));const h=ray.intersectObject(cloth||head)[0];return h?h.point.y:6.5;})();ep.position.set(px,py+.035,0);ep.rotation.z=s*-.2;root.add(ep);
      const ed=new THREE.Mesh(new THREE.BoxGeometry(.64,.058,.07),gold);ed.position.set(px+s*-.02,py+.04,.45);ed.rotation.z=s*-.2;root.add(ed);
      for(let k=0;k<cl.rank;k++){const st=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.02,5),gold);st.position.set(px,py+.07,-.2+k*.22);st.rotation.z=s*-.2;root.add(st);}}
    // ribbons + buttons
    const rc=[0xa22a2a,0x2a4a8a,0xd4b04a,0x2a6a3a,0xeeeeee,0x6a2a6a];for(let r=0;r<3;r++)for(let c=0;c<3;c++){const rb=new THREE.Mesh(new THREE.BoxGeometry(.17,.07,.02),new THREE.MeshBasicMaterial({color:rc[(r*3+c+spec.seed)%6]}));const px=.62+c*.18,py=6.45-r*.085;rb.position.set(px,py,surf(px,py)+.07);root.add(rb);}
    for(let k=0;k<3;k++){const b=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),gold);b.position.set(0,6.2-k*.3,surf(0,6.2-k*.3)+.07);root.add(b);}}
  /* ---- headgear ---- */
  const ht=spec.hat,hg=new THREE.Group();hg.position.y=hatDY;hg.scale.set(hs0,1,hs0);const hatAdd=(m)=>hg.add(m);const rootR=root;
  if(ht.type==='peaked'){const hc2=col(ht.col);const mat=shMat(hc2.clone().multiplyScalar(.9).getHex(),.75),bandM=shMat(hc2.clone().multiplyScalar(.5).getHex(),.6);
    const crown=lathe([[1.14,8.62],[1.12,8.9],[1.24,9.3],[1.36,9.5],[.9,9.52],[0.0,9.5]],mat,48);crown.scale.set(1,1,1.1);crown.position.z=-.12;hg.add(crown);
    const band=lathe([[1.15,8.6],[1.15,8.9],[1.13,8.92],[1.13,8.6]],bandM,48);band.scale.set(1,1,1.1);band.position.z=-.12;hg.add(band);
    const vis=new THREE.Mesh(new THREE.SphereGeometry(1.05,32,12,0,Math.PI*2,0,Math.PI*.5),shMat(0x17140f,.35));vis.scale.set(1,.12,.95);vis.position.set(0,8.64,1.55);vis.rotation.x=.12;vis.castShadow=true;hg.add(vis);
    const brd=new THREE.Mesh(new THREE.TorusGeometry(1.02,.03,6,40,Math.PI),gold);brd.rotation.set(Math.PI/2+.12,0,Math.PI);brd.scale.set(1,.95,1);brd.position.set(0,8.62,1.52);hg.add(brd);
    const bad=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.04,16),gold);bad.rotation.x=Math.PI/2;bad.position.set(0,8.8,1.55);hg.add(bad);
    const cord=new THREE.Mesh(new THREE.TorusGeometry(1.14,.028,6,48),gold);cord.rotation.x=Math.PI/2;cord.scale.set(1,1.1,1);cord.position.set(0,8.93,-.12);hg.add(cord);}
  if(ht.type==='beret'){const bm=shMat(ht.col,.95);const b=new THREE.Mesh(new THREE.SphereGeometry(1,40,20),bm);b.scale.set(1.28,.5,1.3);b.position.set(.2,9.18,-.1);b.rotation.set(.1,0,-.28);b.castShadow=true;hg.add(b);
    const bd=lathe([[1.12,8.62],[1.14,8.9],[1.1,8.92],[1.1,8.62]],shMat(0x14120e,.7),40);bd.position.z=-.1;hg.add(bd);const bad=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.04,14),gold);bad.rotation.x=Math.PI/2;bad.position.set(-.55,8.88,1.0);bad.rotation.y=.5;hg.add(bad);}
  if(ht.type==='turban'){const tc=col(ht.col),wrap=lathe(Array.from({length:14},(_,k)=>{const u=k/13;return [1.12+.28*Math.sin(Math.PI*u*.95)*(1-.25*u),8.55+u*1.05];}).concat([[.6,9.7],[0,9.72]]),new THREE.MeshStandardMaterial({color:tc,roughness:.9}),64);wrap.scale.set(1,1,1.08);wrap.position.set(0,0,-.1);hg.add(wrap);
    for(let k=0;k<5;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(1.1+.22*Math.sin(Math.PI*(k/4.6)*.95)*1.0,.06,8,60),new THREE.MeshStandardMaterial({color:tc.clone().multiplyScalar(k%2?.82:1.05),roughness:.9}));t.rotation.x=Math.PI/2+(k%2?.05:-.04);t.scale.set(1,1.08,1);t.position.set(0,8.66+k*.2,-.1);hg.add(t);}}
  if(ht.type==='ghutra'){const gm=new THREE.MeshStandardMaterial({color:ht.col,roughness:.9,side:THREE.DoubleSide}),cap=lathe([[1.08,8.3],[1.12,8.8],[1.12,9.1],[.7,9.5],[0,9.58]],gm,48);cap.scale.set(1,1,1.1);cap.position.z=-.1;hg.add(cap);
    for(const s of [1,-1]){const gg=new THREE.PlaneGeometry(1,1,10,16),pos=gg.getAttribute('position');for(let i=0;i<pos.count;i++){const v=pos.getX(i)+.5,u=pos.getY(i)+.5;const d=1-u;const x=s*(1.1+.55*d*d*d+.15*d),y=8.4-d*2.1+.0,z=.45-v*1.7-.25*d;pos.setXYZ(i,x+Math.sin(v*9+d*3)*.04,y,z);}
      gg.computeVertexNormals();const m=new THREE.Mesh(gg,gm);m.castShadow=true;m.receiveShadow=true;hg.add(m);}
    const bk=new THREE.PlaneGeometry(1,1,12,10),bp=bk.getAttribute('position');for(let i=0;i<bp.count;i++){const v=bp.getX(i)+.5,u=bp.getY(i)+.5;const a=(v-.5)*Math.PI*.95;bp.setXYZ(i,Math.sin(a)*1.2*(1+.35*(1-u)),8.6-(1-u)*1.9,-.8-Math.cos(a)*.35*(1-u)-.1);}bk.computeVertexNormals();const bm2=new THREE.Mesh(bk,gm);hg.add(bm2);
    for(const dy of [0,.14]){const ag=new THREE.Mesh(new THREE.TorusGeometry(1.16,.055,8,60),shMat(ht.col2||0x161412,.8));ag.rotation.x=Math.PI/2+.04;ag.scale.set(1,1.1,1);ag.position.set(0,9.0+dy,-.1);hg.add(ag);}}
  hg.rotation.y=0;root.add(hg);
  /* ---- studio lighting ---- */
  root.rotation.y=(R()-.5)*.28;root.position.y=-.0;
  const key=new THREE.DirectionalLight(0xfff0dc,2.6);key.position.set(-3.5,12,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:1,far:30});key.shadow.bias=-.0006;key.shadow.radius=4;key.target.position.set(0,8,0);scene.add(key,key.target);
  const rim=new THREE.DirectionalLight(0x9ab4ff,1.5);rim.position.set(5,9,-6);scene.add(rim);const fill=new THREE.DirectionalLight(0xffc9a0,.55);fill.position.set(6,7,6);scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xfff4e6,0x2a3340,.55));
  const cam=new THREE.PerspectiveCamera(12.6,.8,1,60);const hy=topY-2.15;cam.position.set(0,hy+.35,24);cam.lookAt(0,hy,0);
  return {scene,cam};}

/* ---- painterly pass: generalised Kuwahara (4 sectors) on the 2D canvas, warm grade, grain ---- */
function kuwahara(src,rad){const w=src.width,h=src.height,sc=src.getContext('2d').getImageData(0,0,w,h),d=sc.data,o=new Uint8ClampedArray(d.length);
  const lum=new Float32Array(w*h);for(let i=0;i<w*h;i++)lum[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let best=1e9,br=0,bg=0,bb=0;
    for(let q=0;q<4;q++){const x0=q&1?x:x-rad,y0=q&2?y:y-rad;let s=0,s2=0,r=0,g=0,b=0,cnt=0;
      for(let yy=y0;yy<=y0+rad;yy++){if(yy<0||yy>=h)continue;for(let xx=x0;xx<=x0+rad;xx++){if(xx<0||xx>=w)continue;const k=yy*w+xx,l=lum[k];s+=l;s2+=l*l;r+=d[k*4];g+=d[k*4+1];b+=d[k*4+2];cnt++;}}
      const m=s/cnt,v=s2/cnt-m*m;if(v<best){best=v;br=r/cnt;bg=g/cnt;bb=b/cnt;}}
    const k=(y*w+x)*4;o[k]=br;o[k+1]=bg;o[k+2]=bb;o[k+3]=255;}
  sc.data.set(o);src.getContext('2d').putImageData(sc,0,0);}

/* ---- backdrop (painted gradient with brush noise), frame ---- */
function backdrop(ctx,w,h,seed,tint){const g=ctx.createRadialGradient(w*.5,h*.38,h*.05,w*.5,h*.5,h*.8);const t=tint||[34,46,60];g.addColorStop(0,`rgb(${t[0]+46},${t[1]+40},${t[2]+34})`);g.addColorStop(.55,`rgb(${t[0]+8},${t[1]+8},${t[2]+8})`);g.addColorStop(1,`rgb(${Math.max(0,t[0]-22)},${Math.max(0,t[1]-22)},${Math.max(0,t[2]-20)})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  let a=seed|0;const rnd=()=>{a=(a+0x6D2B79F5)|0;let q=Math.imul(a^(a>>>15),1|a);q=(q+Math.imul(q^(q>>>7),61|q))^q;return((q^(q>>>14))>>>0)/4294967296;};
  for(let i=0;i<70;i++){ctx.globalAlpha=.05+rnd()*.05;ctx.fillStyle=rnd()<.5?'#000':'#c9a66a';const bw=30+rnd()*90,bh=6+rnd()*10;ctx.save();ctx.translate(rnd()*w,rnd()*h);ctx.rotate((rnd()-.5)*.8);ctx.fillRect(-bw/2,-bh/2,bw,bh);ctx.restore();}ctx.globalAlpha=1;}
function frame(ctx,w,h){const b=Math.round(w*.045);const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#f2d58a');g.addColorStop(.3,'#a8802e');g.addColorStop(.55,'#e8c874');g.addColorStop(1,'#7a5a1e');
  ctx.lineWidth=b;ctx.strokeStyle=g;ctx.strokeRect(b/2,b/2,w-b,h-b);ctx.lineWidth=1.5;ctx.strokeStyle='rgba(30,20,6,.9)';ctx.strokeRect(b,b,w-2*b,h-2*b);ctx.strokeRect(1,1,w-2,h-2);ctx.strokeStyle='rgba(255,240,190,.55)';ctx.strokeRect(b+2.5,b+2.5,w-2*b-5,h-2*b-5);
  for(const [x,y] of [[b/2,b/2],[w-b/2,b/2],[b/2,h-b/2],[w-b/2,h-b/2]]){const r=ctx.createRadialGradient(x-1,y-1,0,x,y,b*.55);r.addColorStop(0,'#fff0b8');r.addColorStop(1,'#8a6420');ctx.fillStyle=r;ctx.beginPath();ctx.arc(x,y,b*.55,0,7);ctx.fill();}
  const v=ctx.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,h*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.38)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);}

export function renderPortrait(spec,meshData,F4,W=240,H=300,opt={}){
  const SS=2,rw=W*SS,rh=H*SS,r=renderer(rw,rh),{scene,cam}=buildBust(spec,meshData,F4);r.setClearColor(0x000000,0);r.render(scene,cam);
  const work=document.createElement('canvas');work.width=rw;work.height=rh;const wc=work.getContext('2d');backdrop(wc,rw,rh,spec.seed,opt.tint);wc.drawImage(r.domElement,0,0);
  // soften + painterly
  const sm=document.createElement('canvas');sm.width=W*2;sm.height=H*2;sm.getContext('2d').drawImage(work,0,0,sm.width,sm.height);kuwahara(sm,2);
  const out=document.createElement('canvas');out.width=W;out.height=H;const oc=out.getContext('2d');oc.imageSmoothingQuality='high';oc.drawImage(sm,0,0,W,H);
  // warm grade + canvas grain
  oc.globalCompositeOperation='soft-light';oc.fillStyle='rgba(255,170,90,.18)';oc.fillRect(0,0,W,H);oc.globalCompositeOperation='source-over';
  const id=oc.getImageData(0,0,W,H),d=id.data;for(let i=0;i<d.length;i+=4){const k=(Math.sin((i>>2)*12.9898)*43758.5453)%1,g=(k-.5)*10;d[i]+=g;d[i+1]+=g;d[i+2]+=g;}oc.putImageData(id,0,0);
  frame(oc,W,H);return out;}
