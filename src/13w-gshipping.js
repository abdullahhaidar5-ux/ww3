// SHIPPING LANES (laneC, ART-BAR "life"): tankers and container ships sail the real sea lanes of the grand map, leaving a wake.
// Visual traffic only (no sim state, no checkpoint): ships random-walk along clear sea-province links. They are not aircraft/drones.
function g3ShipGeo(kind){
  const P=[],N=[],C=[];const box=(w,h,d,x,y,z,col)=>{const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);const p=g.attributes.position.array,n=g.attributes.normal.array,c=new THREE.Color(col);
    for(let i=0;i<p.length;i++){P.push(p[i]);N.push(n[i]);}for(let i=0;i<p.length/3;i++)C.push(c.r,c.g,c.b);};
  // hull points along +z (bow); tapered by three stacked boxes
  box(2.2,1.1,9,0,.55,0,kind?0x2a3440:0x6b2a24);box(1.7,.9,2.2,0,.5,5.4,kind?0x2a3440:0x6b2a24);box(2.3,.25,9,0,1.2,0,0x3a3d40);
  if(kind){const cs=[0xc0452b,0x2f6fa8,0xd0a53a,0x4a8a5a,0xa8a8a8];for(let i=0;i<5;i++){box(1.9,.8,1.3,0,1.7,-3.2+i*1.5,cs[i]);if(i%2)box(1.9,.8,1.3,0,2.5,-3.2+i*1.5,cs[(i+2)%5]);}}
  else{box(1.8,.4,6,0,1.5,.6,0x1d1f21);box(.6,.5,.6,0,1.9,2.4,0x888888);}
  box(1.6,1.6,1.4,0,2.1,-3.8,0xe8e4d8);box(.5,.9,.5,0,3.3,-4,0xd8402c);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g;}
function g3ShipInit(sc){
  if(!GCM||!G3.F)return;const P=GCM.P,nb=new Map();
  const clear=(a,b)=>{for(let k=1;k<12;k++){const t=k/12,x=a.x+(b.x-a.x)*t,z=a.y+(b.y-a.y)*t;if(g3HeightAt(x,z)>.25)return false;}return g3HeightAt(a.x,a.y)<=.25&&g3HeightAt(b.x,b.y)<=.25;};
  for(const p of P)if(p.sea){const L=[];for(const j of p.adj)if(P[j].sea&&clear(p,P[j]))L.push(j);if(L.length)nb.set(p.i,L);}
  const nodes=[...nb.keys()];if(!nodes.length)return;
  const N=Math.min(46,Math.max(18,nodes.length)),ships=[];
  for(let i=0;i<N;i++){const a=nodes[(g3Hash(i,7)*nodes.length)|0],L=nb.get(a),b=L[(g3Hash(i,11)*L.length)|0];ships.push({a,b,t:g3Hash(i,3),sp:.05+g3Hash(i,5)*.04,k:g3Hash(i,9)>.45?1:0,off:(g3Hash(i,13)-.5)*14,seed:i});}
  const mk=k=>{const m=new THREE.InstancedMesh(g3ShipGeo(k),new THREE.MeshLambertMaterial({vertexColors:true}),N);m.frustumCulled=false;m.count=0;sc.add(m);return m;};
  const wk=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0,0,-.5),new THREE.MeshBasicMaterial({color:0xeaf6ff,transparent:true,opacity:.42,depthWrite:false}),N);wk.frustumCulled=false;wk.renderOrder=2;sc.add(wk);
  G3.ship={ships,nb,m:[mk(0),mk(1)],wk,dummy:new THREE.Object3D()};}
function g3ShipTick(dt,s){
  const S=G3.ship;if(!S||!GCM)return;const P=GCM.P,D=S.dummy,cnt=[0,0];let w=0;
  for(const sh of S.ships){
    sh.t+=dt*sh.sp*(100/Math.max(40,Math.hypot(P[sh.b].x-P[sh.a].x,P[sh.b].y-P[sh.a].y)))*1.5;
    if(sh.t>=1){sh.t=0;const prev=sh.a;sh.a=sh.b;const L=S.nb.get(sh.a)||[],F=L.filter(j=>j!==prev),pool=F.length?F:L;sh.b=pool[(g3Hash(sh.seed*31+((G3.time*10)|0),sh.a)*pool.length)|0];}
    const A=P[sh.a],B=P[sh.b],dx=B.x-A.x,dz=B.y-A.y,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
    const x=A.x+dx*sh.t+nx*sh.off,z=A.y+dz*sh.t+nz*sh.off,sc=Math.max(.55,s*.38);   /* mapshapes: cargo ships are half the size they were, so they read as traffic and not as fleets */
    D.position.set(x,.35+Math.sin(G3.time*1.3+sh.seed)*.12,z);D.rotation.set(0,Math.atan2(dx,dz),0,'YXZ');D.scale.setScalar(sc);D.updateMatrix();S.m[sh.k].setMatrixAt(cnt[sh.k]++,D.matrix);
    D.position.y=.2;D.scale.set(sc*2.3,1,sc*(6+3*Math.sin(G3.time*2+sh.seed)));D.position.x=x-Math.sin(D.rotation.y)*sc*4.4;D.position.z=z-Math.cos(D.rotation.y)*sc*4.4;D.updateMatrix();S.wk.setMatrixAt(w++,D.matrix);}
  for(let k=0;k<2;k++){S.m[k].count=cnt[k];S.m[k].instanceMatrix.needsUpdate=true;}S.wk.count=w;S.wk.instanceMatrix.needsUpdate=true;}
