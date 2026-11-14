/* ---------- Tactics visuals: earth berms, foxholes, sandbag rows, trenches, burning engines, broken tracks ----------
   Everything is irregular rock-like blobs (never cubes), drawn as ONE instanced mesh for all fortifications, rebuilt only
   when the synced list (G.dugV) changes. Cheap enough for phones. */
const TACT={mesh:null,v:-1,g:null,trk:[],tv:0,tkv:0};
function tactMesh(){if(TACT.mesh&&TACT.g===G)return TACT.mesh;TACT.trk=[];TACT.tkv=0;if(TACT.mesh){SCN.remove(TACT.mesh);TACT.mesh.dispose();}
  const geo=rockGeo(23,(typeof TOUCHUI!=='undefined'&&TOUCHUI)?0:1,.7,.42),mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97,metalness:0});
  const m=new THREE.InstancedMesh(geo,mat,3600);m.count=0;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.setColorAt(0,new THREE.Color(1,1,1));
  SCN.add(m);TACT.mesh=m;TACT.g=G;TACT.v=-1;return m;}
const _tm=new THREE.Matrix4(),_tq=new THREE.Quaternion(),_te=new THREE.Euler(),_tp=new THREE.Vector3(),_ts=new THREE.Vector3(),_tc=new THREE.Color(),_tY=new THREE.Vector3(0,1,0);
function tactBlob(m,n,x,y,dy,sx,sy,sz,yaw,r,g,b){if(n>=3600)return n;_te.set(0,yaw,0);_tq.setFromEuler(_te);_tp.set(x,groundH(x,y)+dy,y);_ts.set(sx,sy,sz);_tm.compose(_tp,_tq,_ts);m.setMatrixAt(n,_tm);_tc.setRGB(r,g,b);m.setColorAt(n,_tc);return n+1;}
function tactRebuild(){const m=tactMesh();let n=0;const L=G.dug||[];
  for(const d of L){const R=mulberry(d.id*977+11),ca=Math.cos(d.a),sa=Math.sin(d.a);
    const earth=()=>{const k=.8+R()*.3;return[.4*k,.3*k,.2*k];};
    if(d.k==='fox'){for(let i=0;i<12;i++){const t=i/12*6.283+R()*.25,rr=6+R()*1.3,c=earth();n=tactBlob(m,n,d.x+Math.cos(t)*rr,d.y+Math.sin(t)*rr,.2,3.1+R()*1.2,.95+R()*.5,2.3+R()*.8,t+1.57+R()*.6,c[0],c[1],c[2]);}
      for(let i=0;i<2;i++)n=tactBlob(m,n,d.x+(R()-.5)*2,d.y+(R()-.5)*2,-.3,5.2+R(),.5,5+R(),R()*6,.13,.1,.07);
      for(let i=0;i<4;i++){const t=(i-1.5)*.55+d.a,k=.9+R()*.2;n=tactBlob(m,n,d.x+Math.cos(t)*7.6,d.y+Math.sin(t)*7.6,1.3,2.6,.9,1.5,t+1.57,.6*k,.5*k,.31*k);}}
    else if(d.k==='sand'){for(let c=0;c<2;c++){const cnt=c?4:5;for(let i=0;i<cnt;i++){const u=(i-(cnt-1)/2)*5.2+(R()-.5)*.6+c*2.4,v=(R()-.5)*.9,k=.88+R()*.24;
        n=tactBlob(m,n,d.x+ca*u-sa*v,d.y+sa*u+ca*v,.7+c*1.55,2.9+R()*.4,1.05+R()*.25,1.7+R()*.35,-d.a+(R()-.5)*.3,.6*k,.5*k,.31*k);}}
      n=tactBlob(m,n,d.x,d.y,.15,13,.5,4.2,-d.a,.2,.15,.1);}
    else{for(const sg of [-1,1])for(let i=0;i<5;i++){const u=(i-2)*7+(R()-.5)*2,v=sg*(6.8+R()*1),c=earth();n=tactBlob(m,n,d.x+ca*u-sa*v,d.y+sa*u+ca*v,.4,4.4+R()*1.2,1.4+R()*.6,2.4+R()*.6,-d.a+(R()-.5)*.3,c[0],c[1],c[2]);}
      for(let i=0;i<3;i++){const u=(i-1)*9;n=tactBlob(m,n,d.x+ca*u,d.y+sa*u,-.4,10.5,.5,6.2,-d.a,.15,.115,.08);}}  // groundreal: the floor pieces overlap into one dug-earth channel (they were three separate near-black blocks: a dashed, blocky dark line)
      // sandbag parapet along both lips, wooden duckboards on the floor, revetment posts
      for(const sg of [-1,1])for(let i=0;i<3;i++){const u=(i-1)*9+(R()-.5)*1.5,v=sg*8.4,k=.9+R()*.2;n=tactBlob(m,n,d.x+ca*u-sa*v,d.y+sa*u+ca*v,1.5,3.2,.9,1.5,-d.a+(R()-.5)*.2,.6*k,.5*k,.31*k);}
      for(let i=0;i<2;i++){const u=(i-.5)*13;n=tactBlob(m,n,d.x+ca*u,d.y+sa*u,-.2,5.6,.22,2.2,-d.a,.34,.23,.12);}
      for(const sg of [-1,1]){const u=(R()-.5)*14,v=sg*5.2;n=tactBlob(m,n,d.x+ca*u-sa*v,d.y+sa*u+ca*v,1.2,.55,2.6,.55,0,.3,.2,.1);}
      // junction: another trench piece of ours close by (not along the same line) gets a widened mouth so the lines read as one network
      for(const o of L){if(o===d||o.k!=='trench'||o.team!==d.team||o.id<d.id)continue;const dx=o.x-d.x,dy=o.y-d.y,dd=dx*dx+dy*dy;if(dd>44*44||dd<12*12)continue;if(Math.abs(Math.sin(o.a-d.a))<.3)continue;
        n=tactBlob(m,n,(o.x+d.x)/2,(o.y+d.y)/2,-.1,7,.25,7,0,.2,.14,.08);}}
  for(const t of TACT.trk)for(const q of t.pts)n=tactBlob(m,n,q[0],q[1],.3,2.2,.4,1.7,q[2],.1,.095,.09);
  m.count=n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;TACT.v=G.dugV;TACT.tv=TACT.tkv|0;}
// a broken track lying behind a vehicle whose tracks / wheels were shot away: ten dark link blobs in the same instanced mesh
function tactTrack(e){const hd=e.hd??e.ang??0,ca=Math.cos(hd),sa=Math.sin(hd),R=mulberry(e.id*31+7),bx=e.x-ca*(e.r+9),by=e.y-sa*(e.r+9),pts=[];
  for(let i=0;i<10;i++){const u=-i*3.7,v=(R()-.5)*1.6+i*i*.09*(e.id%2?1:-1);pts.push([bx+ca*u-sa*v,by+sa*u+ca*v,-hd+(R()-.5)*.5]);}
  TACT.trk.push({e,pts});TACT.tkv=(TACT.tkv|0)+1;}
function tactFxTick(dt){if(!G||!SCN||!G.terrain)return;
  if((G.dugN|0)>0||TACT.mesh||TACT.trk.length){if(TACT.g!==G)TACT.mesh=null;if(TACT.v!==G.dugV||TACT.g!==G||TACT.tv!==(TACT.tkv|0)){try{tactRebuild();}catch(err){}}}
  for(let i=TACT.trk.length-1;i>=0;i--){const t=TACT.trk[i],e=t.e;if(e.dead||e.gone||!(e.crit&1)||G.byId.get(e.id)!==e){TACT.trk.splice(i,1);TACT.tkv=(TACT.tkv|0)+1;e.trkM=0;}}
  for(const e of G.ents){if(e.isB||e.dead||!e.s||e.s.dom!=='ground')continue;const c=e.crit|0,low=e.hp<e.max*.35&&e.s.armor==='heavy';
    if(c&1&&!e.trkM&&TACT.trk.length<24){e.trkM=1;try{tactTrack(e);}catch(err){}}
    if(!(c&4)&&!low&&!e.aband)continue;if(!inView(e.x,e.y,.25))continue;const h=unitH(e)+entHeightMid(e)*.7,fr=c&4?1:low?.3:.14;
    if(Math.random()<dt*14*fr){const x=e.x+rnd(-5,5),y=e.y+rnd(-5,5);part({x,y,h:h+rnd(-2,3),vx:rnd(-4,4),vy:rnd(-4,4),vh:rnd(8,18),rise:rnd(18,32),c:c&4?[.07,.065,.06]:[.3,.29,.27],s:rnd(5,9),g:7,d:rnd(1.4,2.4),a:c&4?.6:.38,f:.5});}
    if(c&4&&Math.random()<dt*16){const x=e.x+rnd(-4,4),y=e.y+rnd(-4,4);part({x,y,h:h+rnd(-1,2),vx:rnd(-3,3),vy:rnd(-3,3),rise:rnd(14,26),add:true,c:Math.random()<.5?[2.6,1.1,.3]:[2.9,1.7,.6],s:rnd(3,6),g:-3,d:rnd(.3,.6),a:.85});}}}
