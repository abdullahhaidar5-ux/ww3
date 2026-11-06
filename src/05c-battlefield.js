/* ---------- Battlefield visuals: wounded soldiers + red-cross icons, damaged-building smoke and collapse dust, the dam, the flood ----------
   (sim: 03e-battlefield.js). Everything is cheap: wounded are two small instanced meshes + one Points layer for the icons (so
   they stay readable from high up), damaged buildings only emit a few smoke / flame puffs a second while on screen, the dam is
   a handful of meshes built once, the flood is ONE translucent mesh rebuilt a few times a second while water is up. No cubes:
   bodies and rocks are blobs, the dam is an arch. */
const BFX={wb:null,wh:null,wp:null,wtex:null,wg:null,civ:new Set(),civG:null,dam:[],damG:null,fl:null,flG:null,flT:0,wt:0,brk:[]};
function bfIconTex(){if(BFX.wtex)return BFX.wtex;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.arc(32,32,30,0,6.283);x.fill();x.fillStyle='#f4f4f0';x.beginPath();x.arc(32,32,26,0,6.283);x.fill();
  x.fillStyle='#d62a22';x.fillRect(27,13,10,38);x.fillRect(13,27,38,10);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;BFX.wtex=t;return t;}
function bfWoundInit(){if(BFX.wg===G&&BFX.wb)return;for(const k of ['wb','wh','wp'])if(BFX[k]){SCN.remove(BFX[k]);if(BFX[k].geometry)BFX[k].geometry.dispose();BFX[k]=null;}
  const geo=new THREE.IcosahedronGeometry(1,1),mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0});
  for(const k of ['wb','wh']){const m=new THREE.InstancedMesh(geo,mat,96);m.count=0;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=true;m.setColorAt(0,new THREE.Color(1,1,1));SCN.add(m);BFX[k]=m;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(96*3),3));
  const p=new THREE.Points(g,new THREE.PointsMaterial({map:bfIconTex(),size:24,sizeAttenuation:false,transparent:true,depthTest:false,depthWrite:false,alphaTest:.05}));p.frustumCulled=false;p.renderOrder=40;p.visible=false;SCN.add(p);BFX.wp=p;BFX.wg=G;}
const _bq=new THREE.Quaternion(),_be=new THREE.Euler(),_bp=new THREE.Vector3(),_bs=new THREE.Vector3(),_bm=new THREE.Matrix4(),_bc=new THREE.Color();
function bfWoundTick(dt){const L=G.wnd;if(!L||!L.length){if(BFX.wp)BFX.wp.visible=false;if(BFX.wb){BFX.wb.count=0;BFX.wh.count=0;}return;}
  bfWoundInit();let n=0,np=0;const P=BFX.wp.geometry.attributes.position;
  for(const w of L){if(n>=96)break;
    if(MODE!=='client'&&!ally(w.team,ME)){let seen=false;for(const e of G.ents){if(e.team===ME&&!e.dead&&!e.isB&&(e.x-w.x)**2+(e.y-w.y)**2<230*230){seen=true;break;}}if(!seen)continue;}
    const gy=groundH(w.x,w.y),T=G.teams[w.team],col=T&&T.color?_bc.set(T.color):_bc.set('#6b705a'),yaw=(w.id*2.399)%6.283;
    _be.set(0,yaw,0);_bq.setFromEuler(_be);_bp.set(w.x,gy+1.1,w.y);_bs.set(5.6,1.5,2.3);_bm.compose(_bp,_bq,_bs);BFX.wb.setMatrixAt(n,_bm);BFX.wb.setColorAt(n,_bc.clone().multiplyScalar(.3).lerp(new THREE.Color(.24,.22,.15),.55));
    _bp.set(w.x+Math.cos(yaw)*-5.6,gy+1.7,w.y+Math.sin(-yaw)*-5.6);_bs.set(1.9,1.7,1.9);_bm.compose(_bp,_bq,_bs);BFX.wh.setMatrixAt(n,_bm);BFX.wh.setColorAt(n,new THREE.Color(.55,.42,.33));
    const left=Math.max(0,w.until-G.t),blink=left<10&&((G.t*(left<5?5:3))%1)<.45;
    if(!blink||!ally(w.team,ME)){P.setXYZ(np,w.x,gy+16,w.y);np++;}n++;}
  BFX.wb.count=BFX.wh.count=n;BFX.wb.instanceMatrix.needsUpdate=BFX.wh.instanceMatrix.needsUpdate=true;if(BFX.wb.instanceColor)BFX.wb.instanceColor.needsUpdate=true;if(BFX.wh.instanceColor)BFX.wh.instanceColor.needsUpdate=true;
  P.needsUpdate=true;BFX.wp.geometry.setDrawRange(0,np);BFX.wp.visible=np>0;}

/* ---------- damaged buildings: smoke, flames, collapse dust ---------- */
function bfDust(x,y,h,big){const k=big?1:.6,hh=Math.min(70,(h||30)*.5);for(let i=0;i<Math.round(26*k);i++){const a=Math.random()*6.283,v=rnd(6,big?34:20);
    part({x:x+rnd(-14,14),y:y+rnd(-14,14),h:rnd(2,hh),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rnd(4,16),rise:rnd(2,9),c:[.66,.6,.5],s:rnd(20,44),g:1.5,d:rnd(3.4,6),a:.62,f:.5});}}
function bfCivTick(dt){if(!G.civ)return;if(BFX.civG!==G){BFX.civG=G;BFX.civ.clear();for(const c of G.civ)if(c.stg>0&&!c.dead)BFX.civ.add(c);}
  for(const c of BFX.civ){if(c.dead){BFX.civ.delete(c);continue;}if(!inView(c.x,c.y,.25))continue;const st=c.stg|0,h=Math.min(60,(c.h||30)*.8)+groundH(c.x,c.y);
    if(Math.random()<dt*(st>1?5:1.6))part({x:c.x+rnd(-12,12),y:c.y+rnd(-12,12),h:h+rnd(-4,3),vx:rnd(-3,3),vy:rnd(-3,3),vh:rnd(6,12),rise:rnd(14,26),c:st>1?[.08,.075,.07]:[.34,.33,.31],s:rnd(7,13),g:5,d:rnd(2,3.4),a:st>1?.6:.38});
    if(st>1&&Math.random()<dt*4)part({x:c.x+rnd(-10,10),y:c.y+rnd(-10,10),h:h+rnd(-6,0),vx:rnd(-2,2),vy:rnd(-2,2),rise:rnd(14,24),add:true,c:Math.random()<.5?[2.6,1.1,.3]:[2.9,1.7,.6],s:rnd(4,8),g:-3,d:rnd(.3,.7),a:.9});}}
/* ---------- the dam and the flood ---------- */
function bfDamBuild(){if(BFX.damG===G)return;for(const o of BFX.dam)SCN.remove(o.g);BFX.dam=[];BFX.damG=G;if(!G.dams)return;
  const conc=new THREE.MeshStandardMaterial({color:0x9c9a92,roughness:.96,metalness:0,side:THREE.DoubleSide});
  for(const d of G.dams){const g=new THREE.Group(),R=d.w*1.5,half=Math.asin(Math.min(.98,d.w/R)),H=36,y0=WL-14;
    const arc=(a0,a1,r,h,y,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18,1,true,a0,a1-a0),mat);m.position.set(0,y+h/2,-R);m.castShadow=true;m.receiveShadow=true;return m;};
    // the cylinder's angle 0 points to +z; the arc is centred on 0 and bulges toward +z (upstream)
    const parts={l:arc(-half,-half/3,R,H,y0,conc),m:arc(-half/3,half/3,R,H,y0,conc),r:arc(half/3,half,R,H,y0,conc)};
    const para=new THREE.MeshStandardMaterial({color:0x6e6c66,roughness:.9,side:THREE.DoubleSide});
    const crest=arc(-half,half,R+1.6,3,y0+H-1,para);
    const back=arc(-half,half,R-7,H-2,y0,conc);   // the downstream face, so the wall has thickness
    const walk=new THREE.Mesh(new THREE.RingGeometry(R-7,R+1.6,24,1,-Math.PI/2-half,half*2),para);walk.rotation.x=-Math.PI/2;walk.position.set(0,y0+H+.5,-R);
    g.add(parts.l,parts.m,parts.r,crest,back,walk);
    const rk=rockGeo(41+d.i,1,.8,.4),rm=new THREE.MeshStandardMaterial({color:0x7d776a,roughness:1});
    for(const s of [-1,1]){const b=new THREE.Mesh(rk,rm);b.position.set(s*d.w*.97,y0+H*.5,-R+R*Math.cos(half*.98));b.scale.set(26,H*.7,22);g.add(b);}
    const tw=new THREE.Mesh(new THREE.CylinderGeometry(5,6.4,24,10),new THREE.MeshStandardMaterial({color:0xb7b3a6,roughness:.9}));tw.position.set(-d.w*.8,y0+H+10,-R+R*Math.cos(half*.8)-4);g.add(tw);
    const rf=new THREE.Mesh(new THREE.ConeGeometry(7.4,7,10),new THREE.MeshStandardMaterial({color:0x7a3b2c,roughness:.9}));rf.position.set(tw.position.x,tw.position.y+15,tw.position.z);g.add(rf);
    const nx=-d.ty,ny=d.tx,ux=-d.dir*d.tx,uy=-d.dir*d.ty;   // chord along the river's normal, bulge upstream
    g.matrixAutoUpdate=false;const gy=0;g.matrix.makeBasis(new THREE.Vector3(nx,0,ny),new THREE.Vector3(0,1,0),new THREE.Vector3(ux,0,uy)).setPosition(d.x,gy,d.y);
    SCN.add(g);BFX.dam.push({g,d,parts,mat:conc,col:new THREE.Color(0x9c9a92),brk:false});}}
function bfDamTick(dt){if(!G.dams)return;bfDamBuild();
  for(const o of BFX.dam){const d=o.d;o.mat.color.copy(o.col).lerp(new THREE.Color(.36,.3,.26),1-Math.max(0,d.hp)/d.max).multiplyScalar(d.dead?.85:1);
    if(d.dead&&!o.brk){o.brk=true;o.parts.m.visible=false;}
    if(d.dead&&G.t-d.t0<22&&inView(d.x,d.y,.5)){const q=G.t-d.t0,jets=Math.max(0,1-q/22);   // the breach: a roaring jet of white water and spray
      if(Math.random()<dt*40*jets)part({x:d.x+rnd(-14,14),y:d.y+rnd(-14,14)-d.dir*d.ty*6,h:rnd(2,16),vx:d.dir*d.tx*rnd(40,90),vy:d.dir*d.ty*rnd(40,90),vh:rnd(4,18),rise:rnd(0,6),c:[.86,.9,.94],s:rnd(10,20),g:8,d:rnd(1,2),a:.7,f:.4});}}}
function bfFloodTick(dt){const D=G.dams;let active=false;if(D)for(const d of D)if(d.dead&&!d.fin&&d.fc&&G.t-d.t0<FL_RISE+FL_HOLD+FL_FALL+1){active=true;break;}
  if(!active){if(BFX.fl&&BFX.fl.visible){BFX.fl.visible=false;}return;}
  BFX.flT-=dt;if(BFX.flT>0&&BFX.fl&&BFX.fl.visible)return;BFX.flT=.3;
  if(BFX.flG!==G||!BFX.fl){if(BFX.fl){SCN.remove(BFX.fl);BFX.fl.geometry.dispose();}const MAXQ=14000,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MAXQ*12),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(MAXQ*16),4));
    const idx=new Uint32Array(MAXQ*6);for(let q=0;q<MAXQ;q++){const b=q*4;idx.set([b,b+1,b+2,b,b+2,b+3],q*6);}g.setIndex(new THREE.BufferAttribute(idx,1));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:true}));m.frustumCulled=false;m.renderOrder=3;SCN.add(m);BFX.fl=m;BFX.flG=G;}
  const P=BFX.fl.geometry.attributes.position,C=BFX.fl.geometry.attributes.color,M=G.map;let q=0;const S=CELL/2,tm=G.t;
  for(const d of D){if(!d.dead||d.fin||!d.fc)continue;const lv=damLevel(d),fr=damFront(d);if(lv<=0)continue;
    for(const k of d.fc.keys()){const c=d.fc.get(k),cx0=(k%GW)*CELL,cy0=((k/GW)|0)*CELL;if(c[0]>fr+10)continue;
      for(let a=0;a<2;a++)for(let b=0;b<2;b++){if(q>=14000)break;const x=cx0+a*S,y=cy0+b*S,e=M.edge(x+S/2,y+S/2);if(e>6)continue;   // river cells are already water
        const f=Math.max(0,Math.min(1,(e+FL_EXTRA*lv)/40))*Math.max(0,Math.min(1,(fr-c[0])/120));if(f<.04)continue;
        const al=Math.min(.82,f*1.1);for(let v=0;v<4;v++){const vx=x+(v===1||v===2?S:0),vy=y+(v>=2?S:0),h=Math.max(groundH(vx,vy),WL)+1.2+f*1.6+Math.sin(tm*2.1+vx*.05+vy*.04)*.35*f;P.setXYZ(q*4+v,vx,h,vy);
          C.setXYZW(q*4+v,.06+.02*Math.sin(vx*.03+tm),.11,.115,al);}q++;}}}
  BFX.fl.geometry.setDrawRange(0,q*6);P.needsUpdate=true;C.needsUpdate=true;BFX.fl.visible=q>0;}
function bfFxTick(dt){if(!G||!SCN||!G.terrain)return;try{bfWoundTick(dt);}catch(e){}try{bfCivTick(dt);}catch(e){}try{bfDamTick(dt);bfFloodTick(dt);}catch(e){}}
// effect handlers (host and clients both run these; the state itself comes from the sim / the snapshot)
(function(){const civd0=FXH.civd;
  FXH.civd=function(i,q){civd0(i,q);const c=G.civ&&G.civ[i];if(!c)return;BFX.civ.delete(c);try{bfDust(c.x,c.y,c.h,true);}catch(_){}};
  FXH.civs=function(i,s){const c=G.civ&&G.civ[i];if(!c)return;c.stg=s;BFX.civ.add(c);try{bfDust(c.x,c.y,c.h,false);if(typeof chunks==='function')chunks(c.x,c.y,26,'#cfc6b2',6);}catch(_){}};
  FXH.rubc=function(i){const c=G.civ&&G.civ[i];if(!c)return;if(MODE==='client'){c.clr=1;rubSync();}G.civDirty=true;try{bfDust(c.x,c.y,20,false);}catch(_){}};
  FXH.dam=function(i,x,y){const d=G.dams&&G.dams[i];if(MODE==='client'&&d&&!d.dead){d.dead=true;d.t0=G.t;}try{FXH.boom(x|0,y|0,64,1);if(typeof chunks==='function')chunks(x,y,60,'#a8a59b',18);}catch(_){}};
})();
