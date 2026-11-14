/* ===== ORDER FEEL (Abdullah 2026-11-13 17:26 "Focus all effort on wrapping up conquest and battle", 17:31 "Can we start
   on these now?" - selection rings + order preview, clearer goals on screen). View only: nothing here touches the
   simulation, so multiplayer sync is untouched.
   SELR = THE selection-ring system (replaces the old one-mesh-per-unit ring list): one instanced mesh, one draw call. Every
     selected unit gets a thin, softly glowing ring in its team color under the model, tilted to the slope so it never
     cuts into a hillside: round for soldiers and aircraft, oval for vehicles and ships, a rectangle for buildings. The
     unit under the mouse gets a fainter one (hover).
   ORDM = THE order-marker system (replaces the old ground pings for orders): one instanced mesh, one draw call, at most
     ORDM.cap markers alive (the oldest goes first), each fades in under a second. move = green chevrons closing in,
     attack = red reticle on the target (follows it), attack-move = orange chevrons, guard = blue ring, queued /
     waypoint = amber diamond, line order = a thin bar along the line. The same mesh draws the right-drag ghost: one small
     ring per soldier where the line formation will put him, before the button is released.
   Both share one decal shader (ofMat). Settings > Mouse > Order markers Off hides the order markers (not the rings). */
const SELR={m:null,max:400,n:0};
const ORDM={m:null,cap:12,list:[],gmax:96,n:0,age:null};   // age: screenshot tools only (holds every marker at that age in seconds)
const OFK={mv:[0x5fe08a,2,3,.9],am:[0xff8a2a,2,3,.9],atk:[0xff4a3a,3,3,.95],gd:[0x5fb0ff,4,2.2,1.1],wp:[0xffc23a,5,2.2,1],ln:[0x5fe08a,6,2,.8],lna:[0xff8a2a,6,2,.8],use:[0x9fe0b0,0,2,.7]};   // color, shape, line px, life s
function ofMat(top){   // top: drawn over everything (order markers must never hide behind a building or a hill)
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:!top,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,toneMapped:false,
    vertexShader:`attribute vec3 aC;attribute vec4 aP;attribute vec3 aS;varying vec2 vP;varying vec3 vC;varying vec4 vQ;varying vec3 vS;
      void main(){vS=aS;vC=aC;vQ=aP;vec2 h=aS.xy*1.45+aP.w*3.+2.;vP=position.xz*h;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(vP.x,0.,vP.y,1.);}`,
    fragmentShader:`varying vec2 vP;varying vec3 vC;varying vec4 vQ;varying vec3 vS;
      float sg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
      void main(){float sh=vQ.y,w=vQ.w,k=vS.z,fill=0.,d;vec2 p=vP,s=vS.xy;
        if(sh>6.5){vec2 q=abs(p);float a=min(s.x,s.y)*.45;d=min(sg(q,s,vec2(s.x-a,s.y)),sg(q,s,vec2(s.x,s.y-a)));}
        else if(sh<.5){vec2 q=p/s;float l=length(q);vec2 g=q/(s*max(l,1e-3));d=abs((l-1.)/max(length(g),1e-3));
          if(vQ.z>.5){float f=fract(atan(q.y,q.x)/6.2832*vQ.z);d+=step(f,.22)*1e3;}}
        else if(sh<1.5){vec2 q=abs(p)-s;float sd=length(max(q,0.))+min(max(q.x,q.y),0.);d=abs(sd);
          vec2 c=abs(p)-s*.72;if(c.x>0.&&c.y>0.)w*=1.7;}
        else if(sh<2.5){float R=s.x*(1.05-.5*k),a=s.x*.34;vec2 q=abs(p);q=q.x>q.y?q:q.yx;d=sg(q,vec2(R,0.),vec2(R+a,a));d=min(d,max(length(p)-w*.8,0.));}
        else if(sh<3.5){float r=s.x*(1.3-.3*min(1.,k*4.));float l=length(p);d=abs(l-r);vec2 q=abs(p);q=q.x>q.y?q:q.yx;
          d=min(d,sg(q,vec2(r*.5,0.),vec2(r*1.22,0.)));d=min(d,max(l-w*.7,0.));}
        else if(sh<4.5){float r=s.x*(1.12-.12*min(1.,k*3.));float l=length(p);d=abs(l-r);fill=(1.-smoothstep(r*.96,r,l))*.07;
          float f=fract(atan(p.y,p.x)/6.2832*24.);d=min(d,abs(l-r*.86)+step(.5,f)*1e3);}
        else if(sh<5.5){d=max(abs(p.x)+abs(p.y)-s.x,0.);}
        else{d=sg(p,vec2(-s.x,0.),vec2(s.x,0.));vec2 q=vec2(abs(p.x)-s.x,abs(p.y));d=min(d,sg(q,vec2(0.,0.),vec2(0.,s.y)));}
        float aa=max(fwidth(d),.04),core=1.-smoothstep(w*.5-aa,w*.5+aa,d),edge=(1.-core)*(1.-smoothstep(w*.5,w*1.15+aa,d))*.5,glow=(1.-core)*exp(-max(d-w*.5,0.)/(w*1.6+.8))*.32;
        float a=clamp(core+edge+glow+fill,0.,1.);vec3 c=(mix(vC,vec3(1.),.12)*core+vC*.12*edge+vC*(glow+fill))/max(a,1e-3);c=max(vec3(dot(c,vec3(.3,.59,.11)))+(c-vec3(dot(c,vec3(.3,.59,.11))))*1.6,0.);a*=vQ.x;if(a<.008)discard;   // a little extra saturation: the battle's color grade washes thin lines toward gray
       
        gl_FragColor=vec4(c,a);
        #include <colorspace_fragment>
      }`});}
function ofMesh(max,top){const g=new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2);
  g.setAttribute('aC',new THREE.InstancedBufferAttribute(new Float32Array(max*3),3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aP',new THREE.InstancedBufferAttribute(new Float32Array(max*4),4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aS',new THREE.InstancedBufferAttribute(new Float32Array(max*3),3).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.InstancedMesh(g,ofMat(top),max);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.renderOrder=top?6:3;m.count=0;m.userData.of=1;SCN.add(m);return m;}
const _OF={q:new THREE.Quaternion(),qy:new THREE.Quaternion(),n:new THREE.Vector3(),up:new THREE.Vector3(0,1,0),p:new THREE.Vector3(),s:new THREE.Vector3(1,1,1),m:new THREE.Matrix4(),c:new THREE.Color()};
// one decal instance: centre (x,y) at height h, turned by yaw (world radians, like an object's rotation.y), tilted to the ground under radius R
function ofPut(M,i,x,y,h,yaw,R,tilt,col,alpha,shape,seg,wpx,sx,sz,k){
  if(tilt){const d=Math.max(4,Math.min(R,70)),hx=groundH(x+d,y)-groundH(x-d,y),hz=groundH(x,y+d)-groundH(x,y-d);_OF.n.set(-hx/(2*d),1,-hz/(2*d)).normalize();_OF.q.setFromUnitVectors(_OF.up,_OF.n);}else _OF.q.identity();
  _OF.qy.setFromAxisAngle(_OF.up,yaw||0);_OF.q.multiply(_OF.qy);_OF.p.set(x,h,y);_OF.m.compose(_OF.p,_OF.q,_OF.s);M.setMatrixAt(i,_OF.m);
  const g=M.geometry.attributes,w=wpx/Math.max(PPU,.02);_OF.c.set(col);g.aC.setXYZ(i,_OF.c.r,_OF.c.g,_OF.c.b);g.aP.setXYZW(i,alpha,shape,seg||0,w);g.aS.setXYZ(i,sx,sz,k||0);}
function ofDone(M,n){M.count=n;M.instanceMatrix.needsUpdate=true;const g=M.geometry.attributes;g.aC.needsUpdate=g.aP.needsUpdate=g.aS.needsUpdate=true;M.visible=n>0;}
function ofReset(){for(const o of [SELR,ORDM])if(o.m){SCN.remove(o.m);o.m.geometry.dispose();o.m.material.dispose();o.m=null;}ORDM.list.length=0;}
/* ---- selection rings ---- */
let HOVE=null;   // the unit / building under the mouse (set by cursorIntent in 08-ui, which already picks it)
function selShape(e){   // [shape, half-size x (along the facing), half-size z, line px, tilt]
  if(e.isB){const h=e.size*.5+5;return[1,h,h,2.8,1];}
  const s=e.s,air=s.dom==='air'&&!e.landed;
  if(air||isInf(s))return[SET.cb?0:7,e.r+(air?7:4),e.r+(air?7:4),1.5,!air];
  return[SET.cb?0:7,e.r*1.2+5,e.r*.78+4.5,1.6,s.dom!=='naval'];}
function selRingCol(e){const T=G.teams[e.team];_OF.c.set(T&&T.color||'#8af0a6');return _OF.c.lerp(_OFW,.3).getHex();}const _OFW=new THREE.Color(1,1,1);
function selRings(){if(!SCN||!G)return;if(!SELR.m)SELR.m=ofMesh(SELR.max);const M=SELR.m;let n=0;
  const put=(e,a)=>{if(n>=SELR.max||!e||e.dead||!vis(e))return;const[sh,sx,sz,wpx,tilt]=selShape(e),o=OBJ.get(e.id),yaw=e.isB?(o?o.rotation.y:0):(o?o.rotation.y:-(e.va||0));
    const h=e.isB||tilt?groundH(e.x,e.y)+1.4:unitH(e)+1.2;ofPut(M,n++,e.x,e.y,h,yaw,Math.max(sx,sz),tilt,selRingCol(e),a,sh,SET.cb&&!e.isB?idRingSeg(e.team):0,wpx,sx,sz,0);};
  for(const e of G.sel)put(e,e.team===ME?.8:.65);
  const hv=mouse.in&&!drag&&HOVE&&!HOVE.dead&&!G.sel.includes(HOVE)?HOVE:null;if(hv)put(hv,.42);
  SELR.n=n;ofDone(M,n);}
/* ---- order markers ---- */
// kind: mv | am | atk | gd | wp | ln | lna | use ; e = entity to follow (attack target); o = {r, x2, y2 (line end), c (color)}
function ordMark(k,x,y,e,o){if(!G||SET.mPing===0||!OFK[k]||!isFinite(x)||!isFinite(y))return;o=o||{};const L=ORDM.list;
  // a new order of the same kind replaces the old one instead of stacking; never more than ORDM.cap alive
  for(let i=L.length-1;i>=0;i--)if(L[i].k===k&&k!=='wp')L.splice(i,1);while(L.length>=ORDM.cap)L.shift();
  let r=o.r||(e&&e.r?Math.max(14,e.isB?e.size*.5:e.r+8):16);if(k!=='gd'&&k!=='ln'&&k!=='lna')r=Math.max(r,15/Math.max(PPU,.05));
  L.push({k,x,y,e:e||null,r,x2:o.x2,y2:o.y2,c:o.c,t:performance.now()});}
function ordLineGhost(){   // right-drag: where each soldier of the line will stand (the same layout the order uses, fmLayout in 03-sim)
  if(typeof RDRAG==='undefined'||!RDRAG||!RDRAG.moved||!(!RDRAG.gen||RDRAG.line)||!RDRAG.w0)return null;const w1=screenToWorld(mouse.x,mouse.y);if(!w1)return null;
  const us=G.sel.filter(u=>!u.isB&&u.team===ME&&!u.dead&&u.s&&u.s.spd>0&&u.kind!=='harv'&&u.kind!=='dozer');if(!us.length)return null;
  const a=RDRAG.w0,dx=w1.x-a.x,dy=w1.y-a.y,L=Math.max(1,Math.hypot(dx,dy)),ux=dx/L,uy=dy/L;let cx=0,cy=0;for(const u of us){cx+=u.x;cy+=u.y;}cx/=us.length;cy/=us.length;
  let nx=-uy,ny=ux;if(((a.x+w1.x)/2-cx)*nx+((a.y+w1.y)/2-cy)*ny<0){nx=-nx;ny=-ny;}
  const gnd=us.filter(u=>u.s.dom==='ground'),sp=Math.max(18,...us.map(u=>u.r*2.6)),per=Math.max(2,Math.floor(L/sp)+1),sp2=Math.max(18,...gnd.map(u=>u.r*2.6),20);
  const cnt={S:0,A:0,I:0,F:0,R:0};const rs=[];for(const u of gnd){const r=fmRole(u);cnt[r]++;rs.push([r,u]);}
  const S=fmLayout('line',cnt,sp2,per,L/Math.max(1,per-1)),mx=(a.x+w1.x)/2,my=(a.y+w1.y)/2,px=-ny,py=nx,out=[];
  for(const r in S)for(const k of S[r]){const u=rs.find(q=>q[0]===r);out.push({x:mx+nx*k[0]+px*k[1],y:my+ny*k[0]+py*k[1],r:u?u[1].r+3:7,veh:u&&!isInf(u[1].s)});}
  return{pts:out,am:!!(RDRAG.am||G.amove),a,b:w1};}
function ordMarks(){if(!SCN||!G)return;if(!ORDM.m)ORDM.m=ofMesh(ORDM.cap+ORDM.gmax+2,1);const M=ORDM.m,now=performance.now(),L=ORDM.list;let n=0;
  for(let i=L.length-1;i>=0;i--){const m=L[i],K=OFK[m.k],k=(ORDM.age!=null?ORDM.age:(now-m.t)/1000)/K[3];if(k>=1||(m.e&&m.e.dead&&k>.3)){L.splice(i,1);continue;}}
  for(const m of L){const K=OFK[m.k],k=Math.min(1,(ORDM.age!=null?ORDM.age:(now-m.t)/1000)/K[3]),a=(k<.4?1:Math.pow(1-(k-.4)/.6,1.5))*Math.min(1,k*14+.4);   /* hold, then fade */
    let x=m.x,y=m.y,yaw=0,sx=m.r,sz=m.r;if(m.e&&!m.e.dead){x=m.e.x;y=m.e.y;}
    if(K[1]===6&&m.x2!=null){const dx=m.x2-m.x,dy=m.y2-m.y;x=(m.x+m.x2)/2;y=(m.y+m.y2)/2;yaw=-Math.atan2(dy,dx);sx=Math.max(6,Math.hypot(dx,dy)/2);sz=7;}
    const air=m.e&&m.e.s&&m.e.s.dom==='air'&&!m.e.landed;
    ofPut(M,n++,x,y,(air?unitH(m.e):groundH(x,y))+1.6,yaw,K[1]===6?20:sx,!air,m.c||K[0],a*.95,K[1],0,K[2],sx,sz,k);}
  if(SET.mPing!==0){const gh=ordLineGhost();if(gh){const col=gh.am?OFK.am[0]:OFK.mv[0],dx=gh.b.x-gh.a.x,dy=gh.b.y-gh.a.y;
    ofPut(M,n++,(gh.a.x+gh.b.x)/2,(gh.a.y+gh.b.y)/2,groundH((gh.a.x+gh.b.x)/2,(gh.a.y+gh.b.y)/2)+1.6,-Math.atan2(dy,dx),20,true,col,.9,6,0,2.4,Math.max(6,Math.hypot(dx,dy)/2),6,0);
    for(const p of gh.pts){if(n>=M.instanceMatrix.count)break;ofPut(M,n++,p.x,p.y,groundH(p.x,p.y)+1.4,0,p.r,true,col,.95,0,0,2.2,p.r,p.r,0);}}}
  ORDM.n=n;ofDone(M,n);}
