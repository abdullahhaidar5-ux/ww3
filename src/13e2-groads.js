/* ===== groads (2026-11-08): roads, sea routes and movement arrows on the 3D grand map — drawing only, no sim state =====
   Roads: yellow-ochre ribbons between the main towns of neighbouring land provinces (Rome/Total War look), gentle curves that follow
   the terrain height, wider for routes between capitals/big cities, thin feeder roads from each province's smaller towns; ONE merged mesh.
   Sea routes: thin dashed white lines between neighbouring sea provinces; ONE merged mesh. Both fade out at world zoom.
   Routes: one thin calm line along the planned route of your armies (muted red for visible enemies) with a small arrow head at the destination (g3Routes below). */
const GR_ROADV=`uniform vec2 uRes;uniform float uPx,uF0,uF1;attribute vec3 aP0,aP1;attribute vec2 aC;attribute vec4 aCol;attribute vec2 aW;attribute float aS;varying vec4 vCol;varying float vD,vH,vS,vDist;
  void main(){vec4 c0=projectionMatrix*viewMatrix*vec4(aP0,1.),c1=projectionMatrix*viewMatrix*vec4(aP1,1.);vec2 s0=c0.xy/c0.w*uRes*.5,s1=c1.xy/c1.w*uRes*.5,d=s1-s0;float l=length(d);d=l>1e-4?d/l:vec2(1.,0.);vec2 n=vec2(-d.y,d.x);
    vec3 pm=mix(aP0,aP1,aC.x);float dist=length(cameraPosition-pm);float hw=max(aW.x*uPx,aW.y*uRes.y/(.65*dist))*.5;hw=max(hw,.6*uPx);
    vec4 c=mix(c0,c1,aC.x);float pad=hw+.75;vec2 off=n*aC.y*pad+d*(aC.x*2.-1.)*pad;c.xy+=off/(uRes*.5)*c.w;
    vD=aC.y*pad;vH=hw;vS=aS;vDist=dist;vCol=aCol;vCol.a*=1.-smoothstep(uF0,uF1,dist);gl_Position=c;}`;
// road: ochre core with a darker worn edge; sea: plain dashed line (dash length grows with distance so it never shimmers)
const GR_ROADF=`uniform float uDash,uFade;varying vec4 vCol;varying float vD,vH,vS,vDist;void main(){float cv=clamp(vH+.5-abs(vD),0.,1.);vec3 col=vCol.rgb;
  if(uDash>0.){float dl=max(uDash,vDist*.011);if(fract(vS/dl)>.55)discard;}else{float e=smoothstep(.45,1.,abs(vD)/max(vH,.5));col=mix(col,col*vec3(.42,.36,.28),e*.8);}
  gl_FragColor=vec4(col,vCol.a*cv*uFade);if(gl_FragColor.a<.01)discard;}`;
function grRoadMat(dash,f0,f1){const L=G3.LU;return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{uRes:L.uRes,uPx:L.uPx,uF0:{value:f0},uF1:{value:f1},uDash:{value:dash},uFade:{value:1}},vertexShader:GR_ROADV,fragmentShader:GR_ROADF});}
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
  const n=Math.max(3,Math.ceil(L/3.5)),out=[];let wet=0;
  for(let i=0;i<=n;i++){const t=i/n,u=1-t,x=u*u*A[0]+2*u*t*cx+t*t*B[0],z=u*u*A[1]+2*u*t*cz+t*t*B[1];if(grLandAt(x,z)<.4&&++wet>2)return null;out.push([x,z,Math.max(.2,g3MeshH(x,z))+.32]);}
  return out;}
function g3BuildRoads(sc){try{if(!G3.F||!G3.LU)return;const P=GCM.P,T=g3Towns(),main=new Map();for(const t of T)if(t.t===0)main.set(t.pi,t);
  const big=p=>p.cap||p.tw>=3,R=[];
  for(const p of P){if(!p.land)continue;const a=main.get(p.i);if(!a)continue;
    for(const j of p.adj){if(j<=p.i||!P[j].land)continue;const b=main.get(j);if(!b)continue;if(Math.hypot(b.x-a.x,b.z-a.z)>170)continue;
      const xy=grRoadPts([a.x,a.z],[b.x,b.z],p.i*977+j);if(!xy)continue;const maj=big(p)&&big(P[j]);
      R.push({xy,c:maj?[.96,.8,.42,.92]:[.84,.68,.38,.72],w:maj?[2,.55]:[1.1,.3]});}   /* mapscale: world width in the towns' scale family (a road is narrower than a house row); the pixel minimum keeps roads readable from afar */
    for(const t of T)if(t.pi===p.i&&t.t>0){const xy=grRoadPts([t.x,t.z],[a.x,a.z],p.i*31+t.t);if(xy)R.push({xy,c:[.78,.64,.38,.5],w:[.7,.2]});}}
  const S=[];for(const p of P){if(!p.sea)continue;for(const j of p.adj){if(j<=p.i||!P[j].sea)continue;const q=P[j],L=Math.hypot(q.x-p.x,q.y-p.y);if(L>420)continue;
      const n=Math.max(2,Math.ceil(L/6)),xy=[];let dry=0;for(let i=0;i<=n;i++){const t=i/n,x=p.x+(q.x-p.x)*t,z=p.y+(q.y-p.y)*t;if(grLandAt(x,z)>.6)dry++;xy.push([x,z,.35]);}
      if(dry>n*.15)continue;S.push({xy,c:[.93,.96,1,.55],w:[1.3,0]});}}
  const rm=grStripMesh(R,grRoadMat(0,750,1300)),sm=grStripMesh(S,grRoadMat(5,1600,2700));
  if(rm){rm.renderOrder=1;sc.add(rm);}if(sm){sm.renderOrder=1;sc.add(sm);}G3.roads={n:R.length,sea:S.length,rm,sm};}catch(e){console.warn('groads',e);}}
// ROUTES (mapshapes; Abdullah's picture orch/concepts/bugs/map-ugly-arrows-blocky-coast.jpg): the ONE way a move is drawn on the campaign map — a thin, calm line along the
// route with a small arrow head at the destination. It replaced the chunky green 3D ribbons and the yellow dotted hover line. The line keeps the same width on screen at every zoom
// (the vertex shader pushes each vertex sideways in screen pixels), one mesh for every route, one more for the route you are about to order. View only.
function g3RouteMat(){if(G3.routeMat)return G3.routeMat;return G3.routeMat=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,uniforms:{uRes:{value:new THREE.Vector2(1600,900)}},
  vertexShader:'attribute vec3 aT;attribute vec2 aOff;attribute vec4 aC;uniform vec2 uRes;varying vec4 vC;void main(){vC=aC;mat4 m=projectionMatrix*modelViewMatrix;vec4 c=m*vec4(position,1.),d=m*vec4(position+aT,1.);vec2 t=(d.xy/d.w-c.xy/c.w)*uRes;float l=length(t);t=l>1e-4?t/l:vec2(1.,0.);c.xy+=(t*aOff.x+vec2(-t.y,t.x)*aOff.y)*2./uRes*c.w;gl_Position=c;}',
  fragmentShader:'varying vec4 vC;void main(){gl_FragColor=vC;}'});}
/* one mesh for a list of routes: [{pts:[[x,z],...],c:[r,g,b,a],w:line width in screen pixels}] */
function g3RouteMesh(L){const Pos=[],Tan=[],Off=[],Col=[],dark=[.04,.07,.1];
  const v=(p,ox,oy,c,al)=>{Pos.push(p[0],p[2],p[1]);Tan.push(p[3],0,p[4]);Off.push(ox,oy);Col.push(c[0],c[1],c[2],al);};
  for(const R of L){if(R.pts.length<2)continue;const cv=new THREE.CatmullRomCurve3(R.pts.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'catmullrom',.4),len=cv.getLength(),n=Math.max(6,Math.min(160,Math.round(len/5))),S=[];
    for(let i=0;i<=n;i++){const q=cv.getPoint(i/n);S.push([q.x,q.z]);}
    for(let i=0;i<S.length;i++){const pr=S[Math.max(0,i-1)],nx=S[Math.min(S.length-1,i+1)];let dx=nx[0]-pr[0],dz=nx[1]-pr[1];const l=Math.hypot(dx,dz)||1;S[i]=[S[i][0],S[i][1],Math.max(.8,g3HeightAt(S[i][0],S[i][1]))+1.3,dx/l,dz/l];}
    const strip=(hw,c,al)=>{for(let i=0;i<n;i++){const A=S[i],B=S[i+1],fa=al*Math.min(1,.25+i/4),fb=al*Math.min(1,.25+(i+1)/4);   /* the start fades in under the army's own token */
        v(A,0,-hw,c,fa);v(A,0,hw,c,fa);v(B,0,hw,c,fb);v(A,0,-hw,c,fa);v(B,0,hw,c,fb);v(B,0,-hw,c,fb);}},
      head=(ln,hw,fw,c,al)=>{const T=S[n];v(T,fw,0,c,al);v(T,fw-ln,-hw,c,al);v(T,fw-ln,hw,c,al);};
    const w=R.w,al=R.c[3];strip(w/2+1,dark,al*.55);head(w*3.2+3.5,w*1.6+2,2,dark,al*.6);strip(w/2,R.c,al);head(w*3.2,w*1.6,0,R.c,al);}   /* a soft dark edge so the line reads on sand, snow and sea alike */
  if(!Pos.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Pos,3));g.setAttribute('aT',new THREE.Float32BufferAttribute(Tan,3));g.setAttribute('aOff',new THREE.Float32BufferAttribute(Off,2));g.setAttribute('aC',new THREE.Float32BufferAttribute(Col,4));
  const m=new THREE.Mesh(g,g3RouteMat());m.renderOrder=4;m.frustumCulled=false;m.onBeforeRender=()=>{g3RouteMat().uniforms.uRes.value.set(Math.max(1,GV.w),Math.max(1,GV.h));};return m;}
const G3_ROUTE={me:[.95,.92,.82,.9],sel:[1,.98,.9,1],foe:[.9,.42,.36,.85],prev:[.95,.92,.82,.6]};   // calm cream = yours, muted red = a visible enemy's; the selected army's is a little brighter and wider
function g3Routes(){if(!G3.routes)return;for(const c of G3.routes.children.slice())if(c!==G3.routePrev){G3.routes.remove(c);c.geometry.dispose();}if(!GC)return;const L=[];
  for(const a of GC.armies){if(!a.path.length)continue;const mine=!GC.me||a.o===GC.me,enemy=!mine&&GC.me&&grAtWar(a.o,GC.me)&&grSeen(a);if(!mine&&!enemy&&a.id!==GV.selA)continue;
    const pts=g3PathPts(a);if(pts.length<2)continue;const sel=a.id===GV.selA;L.push({pts,c:sel&&mine?G3_ROUTE.sel:mine?G3_ROUTE.me:G3_ROUTE.foe,w:sel?3:2.2});}
  const m=g3RouteMesh(L);G3.routeN=L.length;if(m)G3.routes.add(m);}
/* the route you are about to order (mouse over a province with your army selected): the same line, fainter. path = province numbers from the army's own province on; null = none */
function g3RoutePreview(path){if(!G3.routes)return;if(G3.routePrev){G3.routes.remove(G3.routePrev);G3.routePrev.geometry.dispose();G3.routePrev=null;}if(!path||path.length<2||!GC)return;
  const a=GC.armies.find(x=>x.id===GV.selA),P=GCM.P,q=i=>{const p=P[i],tw=!p.sea?g3Main(i):null;return [tw?tw.x:p.x,tw?tw.z:p.y];},pts=path.map(q);{const e=a&&a.at===path[0]&&G3.arm&&G3.arm.get(a.id);if(e&&(e.x||e.z))pts[0]=[e.x,e.z];}
  const m=g3RouteMesh([{pts,c:G3_ROUTE.prev,w:2.2}]);if(m){G3.routePrev=m;G3.routes.add(m);}}
