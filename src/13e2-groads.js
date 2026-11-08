/* ===== groads (2026-11-08): roads, sea routes and movement arrows on the 3D grand map — drawing only, no sim state =====
   Roads: yellow-ochre ribbons between the main towns of neighbouring land provinces (Rome/Total War look), gentle curves that follow
   the terrain height, wider for routes between capitals/big cities, thin feeder roads from each province's smaller towns; ONE merged mesh.
   Sea routes: thin dashed white lines between neighbouring sea provinces; ONE merged mesh. Both fade out at world zoom.
   Arrows: thick 3D green arrows along the planned route of your armies (red for visible enemies), dark outline + soft ground shadow. */
const GR_ROADV=`uniform vec2 uRes;uniform float uPx,uF0,uF1;attribute vec3 aP0,aP1;attribute vec2 aC;attribute vec4 aCol;attribute vec2 aW;attribute float aS;varying vec4 vCol;varying float vD,vH,vS,vDist;
  void main(){vec4 c0=projectionMatrix*viewMatrix*vec4(aP0,1.),c1=projectionMatrix*viewMatrix*vec4(aP1,1.);vec2 s0=c0.xy/c0.w*uRes*.5,s1=c1.xy/c1.w*uRes*.5,d=s1-s0;float l=length(d);d=l>1e-4?d/l:vec2(1.,0.);vec2 n=vec2(-d.y,d.x);
    vec3 pm=mix(aP0,aP1,aC.x);float dist=length(cameraPosition-pm);float hw=max(aW.x*uPx,aW.y*uRes.y/(.65*dist))*.5;hw=max(hw,.6*uPx);
    vec4 c=mix(c0,c1,aC.x);float pad=hw+.75;vec2 off=n*aC.y*pad+d*(aC.x*2.-1.)*pad;c.xy+=off/(uRes*.5)*c.w;
    vD=aC.y*pad;vH=hw;vS=aS;vDist=dist;vCol=aCol;vCol.a*=1.-smoothstep(uF0,uF1,dist);gl_Position=c;}`;
// road: ochre core with a darker worn edge; sea: plain dashed line (dash length grows with distance so it never shimmers)
const GR_ROADF=`uniform float uDash;varying vec4 vCol;varying float vD,vH,vS,vDist;void main(){float cv=clamp(vH+.5-abs(vD),0.,1.);vec3 col=vCol.rgb;
  if(uDash>0.){float dl=max(uDash,vDist*.011);if(fract(vS/dl)>.55)discard;}else{float e=smoothstep(.45,1.,abs(vD)/max(vH,.5));col=mix(col,col*vec3(.42,.36,.28),e*.8);}
  gl_FragColor=vec4(col,vCol.a*cv);if(gl_FragColor.a<.01)discard;}`;
function grRoadMat(dash,f0,f1){const L=G3.LU;return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{uRes:L.uRes,uPx:L.uPx,uF0:{value:f0},uF1:{value:f1},uDash:{value:dash}},vertexShader:GR_ROADV,fragmentShader:GR_ROADF});}
// lines: [{xy:[[x,z,y],...],c:[r,g,b,a],w:[px,world]}] -> one strip mesh (same layout as g3LineMesh + along-line distance aS)
function grStripMesh(lines,mat){let ns=0;for(const l of lines)ns+=Math.max(0,l.xy.length-1);if(!ns)return null;
  const P0=new Float32Array(ns*12),P1=new Float32Array(ns*12),C=new Float32Array(ns*8),Col=new Float32Array(ns*16),Wd=new Float32Array(ns*8),S=new Float32Array(ns*4),ix=new Uint32Array(ns*6);let s=0;
  for(const l of lines){let acc=0;for(let a=0;a+1<l.xy.length;a++,s++){const A=l.xy[a],B=l.xy[a+1],sl=Math.hypot(B[0]-A[0],B[1]-A[1]);
    for(let v=0;v<4;v++){const o=(s*4+v)*3,k=s*4+v;P0[o]=A[0];P0[o+1]=A[2];P0[o+2]=A[1];P1[o]=B[0];P1[o+1]=B[2];P1[o+2]=B[1];C[k*2]=v>>1;C[k*2+1]=(v&1)?1:-1;
      Col.set(l.c,k*4);Wd[k*2]=l.w[0];Wd[k*2+1]=l.w[1];S[k]=acc+(v>>1)*sl;}
    acc+=sl;const b=s*4;ix.set([b,b+1,b+2,b+2,b+1,b+3],s*6);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P0,3));g.setAttribute('aP0',new THREE.BufferAttribute(P0,3));g.setAttribute('aP1',new THREE.BufferAttribute(P1,3));
  g.setAttribute('aC',new THREE.BufferAttribute(C,2));g.setAttribute('aCol',new THREE.BufferAttribute(Col,4));g.setAttribute('aW',new THREE.BufferAttribute(Wd,2));g.setAttribute('aS',new THREE.BufferAttribute(S,1));
  g.setIndex(new THREE.BufferAttribute(ix,1));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(1200,0,600),3000);const m=new THREE.Mesh(g,mat);m.frustumCulled=false;return m;}
function grLandAt(x,z){const F=G3.F,W=F.W,cx=Math.max(0,Math.min(W-1,x/2|0)),cz=Math.max(0,Math.min(F.H-1,z/2|0));return F.Ls[cz*W+cx];}
// a gently curved road from A to B sampled every ~2.5 units; it bends toward the lower side so it hugs valleys; null if it would cross open water
function grRoadPts(A,B,seed){const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz);if(L<2)return null;const nx=-dz/L,nz=dx/L,mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2,o=L*.18;
  const hl=g3HeightAt(mx+nx*o,mz+nz*o),hr=g3HeightAt(mx-nx*o,mz-nz*o),bend=(g3Hash(seed,7)-.5)*.22*L+(hr>hl+1?.12:hl>hr+1?-.12:0)*L,cx=mx+nx*bend,cz=mz+nz*bend;
  const n=Math.max(3,Math.ceil(L/2.5)),out=[];let wet=0;
  for(let i=0;i<=n;i++){const t=i/n,u=1-t,x=u*u*A[0]+2*u*t*cx+t*t*B[0],z=u*u*A[1]+2*u*t*cz+t*t*B[1];if(grLandAt(x,z)<.4&&++wet>2)return null;out.push([x,z,Math.max(.2,g3MeshH(x,z))+.32]);}
  return out;}
function g3BuildRoads(sc){try{if(!G3.F||!G3.LU)return;const P=GCM.P,T=g3Towns(),main=new Map();for(const t of T)if(t.t===0)main.set(t.pi,t);
  const big=p=>p.cap||p.tw>=3,R=[];
  for(const p of P){if(!p.land)continue;const a=main.get(p.i);if(!a)continue;
    for(const j of p.adj){if(j<=p.i||!P[j].land)continue;const b=main.get(j);if(!b)continue;if(Math.hypot(b.x-a.x,b.z-a.z)>170)continue;
      const xy=grRoadPts([a.x,a.z],[b.x,b.z],p.i*977+j);if(!xy)continue;const maj=big(p)&&big(P[j]);
      R.push({xy,c:maj?[.96,.8,.42,.92]:[.84,.68,.38,.72],w:maj?[2,1.7]:[1.1,.8]});}
    for(const t of T)if(t.pi===p.i&&t.t>0){const xy=grRoadPts([t.x,t.z],[a.x,a.z],p.i*31+t.t);if(xy)R.push({xy,c:[.78,.64,.38,.5],w:[.7,.5]});}}
  const S=[];for(const p of P){if(!p.sea)continue;for(const j of p.adj){if(j<=p.i||!P[j].sea)continue;const q=P[j],L=Math.hypot(q.x-p.x,q.y-p.y);if(L>420)continue;
      const n=Math.max(2,Math.ceil(L/6)),xy=[];let dry=0;for(let i=0;i<=n;i++){const t=i/n,x=p.x+(q.x-p.x)*t,z=p.y+(q.y-p.y)*t;if(grLandAt(x,z)>.6)dry++;xy.push([x,z,.35]);}
      if(dry>n*.15)continue;S.push({xy,c:[.93,.96,1,.55],w:[1.3,0]});}}
  const rm=grStripMesh(R,grRoadMat(0,750,1300)),sm=grStripMesh(S,grRoadMat(5,1600,2700));
  if(rm){rm.renderOrder=1;sc.add(rm);}if(sm){sm.renderOrder=1;sc.add(sm);}G3.roads={n:R.length,sea:S.length,rm,sm};}catch(e){console.warn('groads',e);}}
// move arrows: thick raised ribbon along the route (dark outline, bright centre, soft ground shadow), arrow head at the destination
function g3BuildArrows(){if(!G3.arrows)return;while(G3.arrows.children.length){const c=G3.arrows.children.pop();c.geometry.dispose();c.material.dispose();}if(!GC)return;const Pos=[],Col=[];
  const v=(x,y,z,c)=>{Pos.push(x,y,z);Col.push(c[0],c[1],c[2],c[3]);},quad=(A,B,ya,yb,wa,wb,ca,cb,da,db)=>{   // strip between lateral offsets wa..wb of samples A,B
    const a0=[A[0]+A[2]*wa+(da||0),ya,A[1]+A[3]*wa+(da||0)],a1=[A[0]+A[2]*wb+(da||0),ya,A[1]+A[3]*wb+(da||0)],b0=[B[0]+B[2]*wa+(db||0),yb,B[1]+B[3]*wa+(db||0)],b1=[B[0]+B[2]*wb+(db||0),yb,B[1]+B[3]*wb+(db||0)];
    v(...a0,ca);v(...a1,cb);v(...b1,cb);v(...a0,ca);v(...b1,cb);v(...b0,ca);};
  for(const a of GC.armies){if(!a.path.length)continue;const mine=!GC.me||a.o===GC.me,enemy=!mine&&GC.me&&grAtWar(a.o,GC.me)&&grSeen(a);if(!mine&&!enemy&&a.id!==GV.selA)continue;
    const pts=g3PathPts(a);if(pts.length<2)continue;const sel=a.id===GV.selA,base=mine?[.36,.9,.26]:enemy?[.95,.2,.16]:[.95,.78,.25],w=(sel?5.2:mine?3.8:3)*(a.sea?.8:1);
    const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'catmullrom',.4),len=cv.getLength(),n=Math.max(8,Math.round(len/4));
    const S=[];for(let i=0;i<=n;i++){const q=cv.getPoint(i/n);S.push([q.x,q.z]);}
    for(let i=0;i<S.length;i++){const p=S[i],pr=S[Math.max(0,i-1)],nx=S[Math.min(S.length-1,i+1)];let dx=nx[0]-pr[0],dz=nx[1]-pr[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;S[i]=[p[0],p[1],-dz/2,dx/2,dx,dz];}
    const Y=S.map(s=>Math.max(.8,g3HeightAt(s[0],s[1]))),hl=w*2.7,hk=Math.max(1,Math.min(S.length-2,Math.round(hl/(len/n))));
    const ol=[base[0]*.22,base[1]*.22,base[2]*.22,.95],ed=[base[0]*.7,base[1]*.7,base[2]*.7,.95],ce=[Math.min(1,base[0]*1.18+.08),Math.min(1,base[1]*1.12+.06),Math.min(1,base[2]*1.15+.06),.95],sh=[0,0,0,.3];
    const end=S.length-1-hk,sd=w*.35;
    for(let i=0;i<end;i++){const A=S[i],B=S[i+1],ya=Y[i],yb=Y[i+1],fa=Math.min(1,i/3);   // tail fades in
      quad(A,B,ya+.25,yb+.25,-w*1.05,w*1.05,sh,sh,sd,sd);
      const ta=ya+1.4,tb=yb+1.4,o=[ol[0],ol[1],ol[2],.95*(.35+.65*fa)];
      quad(A,B,ta,tb,-w*1.12,-w*.82,o,o);quad(A,B,ta,tb,w*.82,w*1.12,o,o);
      quad(A,B,ta,tb,-w*.82,0,[ed[0],ed[1],ed[2],.95*(.35+.65*fa)],[ce[0],ce[1],ce[2],.95*(.35+.65*fa)]);quad(A,B,ta,tb,0,w*.82,[ce[0],ce[1],ce[2],.95*(.35+.65*fa)],[ed[0],ed[1],ed[2],.95*(.35+.65*fa)]);}
    const H=S[end],Tp=S[S.length-1],hy=Math.max(Y[end],Y[S.length-1])+1.45,hw=w*1.15,tip=[Tp[0]+Tp[4]*w*.6,Tp[1]+Tp[5]*w*.6],L0=[H[0]+H[2]*2*hw,H[1]+H[3]*2*hw],R0=[H[0]-H[2]*2*hw,H[1]-H[3]*2*hw];
    v(L0[0]+sd,hy-1.15,L0[1]+sd,sh);v(R0[0]+sd,hy-1.15,R0[1]+sd,sh);v(tip[0]+sd,hy-1.15,tip[1]+sd,sh);   // head shadow
    const g=1.18,Lg=[H[0]+H[2]*2*hw*g-H[4]*w*.25,H[1]+H[3]*2*hw*g-H[5]*w*.25],Rg=[H[0]-H[2]*2*hw*g-H[4]*w*.25,H[1]-H[3]*2*hw*g-H[5]*w*.25],tg=[tip[0]+Tp[4]*w*.45,tip[1]+Tp[5]*w*.45];
    v(Lg[0],hy-.02,Lg[1],ol);v(Rg[0],hy-.02,Rg[1],ol);v(tg[0],hy-.02,tg[1],ol);   // head outline
    v(L0[0],hy,L0[1],ed);v(H[0],hy,H[1],ce);v(tip[0],hy,tip[1],ce);v(H[0],hy,H[1],ce);v(R0[0],hy,R0[1],ed);v(tip[0],hy,tip[1],ce);}
  if(!Pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Col,4));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false}));m.renderOrder=4;m.frustumCulled=false;G3.arrows.add(m);}
