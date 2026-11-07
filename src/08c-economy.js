/* ---------- ECONOMY 1 interface (sim: src/03h-economy.js): town panel (food, growth, invest, rebuild), world strips, 3D farmland /
   grown houses / mines / quarries / factories, trade route + caravans + mines on the minimap, income on the HUD. ---------- */
const EC_PTCOL=['#8d8473','#5a5148','#6d7a82'];
const ECV={g:null,grp:null,sig:'',inst:null};
function ecFoodCol(f){return f>=60?'#5fcf72':f>=25?'#f0c040':'#e5483c';}
function ecFoodTxt(t){return t.fd>=60?'well fed':t.fd>=25?'getting hungry':t.fd>0?'HUNGRY - unrest rising':'STARVING';}
// ---- town panel section ----
function ecTownHtml(t,mine){if(!G.ec||t.fd==null)return '';const lv=t.lv==null?(t.ham?0:1):t.lv,P=ecPlots(t),A=ecAlive(t);let h='<div style="margin-top:7px;border-top:1px solid #35503c;padding-top:6px">';
  h+=`<div><b>${EC_LV[lv]}</b> <span class="tm">${lv>=2?'(largest size)':'&middot; growth '+Math.round(t.gp||0)+'%'}</span></div>`;
  h+=`<div class="bar" title="Growth: calm, fed, connected and not shelled"><i style="width:${Math.min(100,t.gp||0)}%;background:#6fb7ff"></i></div>`;
  h+=`<div>Food ${Math.round(t.fd)}/100 <span class="tm">&middot; ${ecFoodTxt(t)} &middot; fields ${A.a}/${A.n}${t.cut?' &middot; CUT OFF':''}</span></div><div class="bar"><i style="width:${t.fd}%;background:${ecFoodCol(t.fd)}"></i></div>`;
  if(A.n&&A.a<A.n)h+='<div class="tm">Burnt fields replant after a couple of minutes. Keep shells away from the farmland.</div>';
  const dm=Math.round((t.dm||0)*100);if(dm>=3)h+=`<div>Damage ${dm}% <span class="tm">&middot; tax reduced until repaired${(t.fr>0||t.shl>G.t)?' (not under fire)':' - locals slowly, engineers (dozers) fast'}</span></div><div class="bar"><i style="width:${Math.min(100,dm)}%;background:#e5883c"></i></div>`;
  if(mine){const T=G.teams[ME],bs=G.bs||1;h+='<div class="tm" style="margin-top:4px">Invest (each: +10% tax, faster growth):</div><div class="rb" style="margin:4px 0">';
    for(let k=0;k<3;k++){const on=(t.inv|0)&(1<<k),c=ecInvCost(t,k);h+=`<button data-eco="${k}" ${on||(T&&T.credits<c)?'disabled':''} class="${on?'on':''}" style="min-height:44px;font-size:11px" title="${ECI_NAME[k]}">${ECI_NAME[k].split(' ')[0]}<br><span style="font-weight:400">${on?'built':'$'+c}</span></button>`;}
    h+='</div>';if(t.em!=null&&Math.abs(t.em-1)>.02)h+=`<div class="tm">Economy modifier on tax: ${t.em>=1?'+':''}${Math.round((t.em-1)*100)}%</div>`;}
  const mp=G.ec.pts.filter(p=>p.ti===t.i);for(const p of mp){const o=p.ow>=0&&G.teams[p.ow]?G.teams[p.ow].F.name:'nobody';h+=`<div class="tm" style="margin-top:3px">${EC_PT_NAME[p.k]} next to it: held by ${o}${p.cp>0&&p.cp<1?' (capturing '+Math.round(p.cp*100)+'%)':''}</div>`;}
  return h+'</div>';}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#townp button[data-eco]');if(!b||b.disabled||typeof TP==='undefined'||TP.ti<0)return;doAct({t:'eco',ti:TP.ti,k:+b.dataset.eco});TP.t=0;setTimeout(()=>townPanelTick(true),90);});
// ---- 3D: farmland, grown houses, mines / quarries / factories ----
let EC_FUR=null;   // furrow stripes for the farmland patches (canvas texture, tinted per plot)
function ecFurrow(){if(EC_FUR)return EC_FUR;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,64,64);for(let i=0;i<64;i+=8){x.fillStyle='rgba(0,0,0,.22)';x.fillRect(0,i+4,64,3);}x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=3;x.strokeRect(0,0,64,64);
  EC_FUR=new THREE.CanvasTexture(cv);EC_FUR.wrapS=EC_FUR.wrapT=THREE.RepeatWrapping;EC_FUR.colorSpace=THREE.SRGBColorSpace;return EC_FUR;}
function ecMat(c){return new THREE.MeshStandardMaterial({color:lin(c),roughness:.9,metalness:0});}
function ecViewSync(){if(!G||!G.ec||!G.towns||typeof SCN==='undefined'||!SCN)return;
  if(ECV.g!==G){if(ECV.grp)SCN.remove(ECV.grp);ECV.g=G;ECV.grp=null;ECV.sig='';}
  let sg=G.ec.pts.length+':';for(const t of G.towns){sg+=(t.lv|0)+(t.ow>=0?'o':'n');if(t.fb)for(let k=0;k<t.fb.length;k++)sg+=t.fb[k]>G.t?1:0;}for(const p of G.ec.pts)sg+=p.ow;
  if(sg===ECV.sig&&ECV.grp)return;ECV.sig=sg;if(ECV.grp){SCN.remove(ECV.grp);ECV.grp.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
  const grp=new THREE.Group(),M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color();
  const put=(im,i,x,y,z,sx,sy,sz,ry,col)=>{E.set(0,ry,0);Q.setFromEuler(E);M4.compose(V.set(x,y,z),Q,S.set(sx,sy,sz));im.setMatrixAt(i,M4);if(col)im.setColorAt(i,C.copy(lin(col)));};
  // farmland (flat patches: green crop / golden crop / burnt)
  const plots=[];for(const t of G.towns){const P=ecPlots(t);P.forEach((p,k)=>plots.push([p,t,k]));}
  if(plots.length){const pg=new THREE.PlaneGeometry(1,1);pg.rotateX(-Math.PI/2);const im=new THREE.InstancedMesh(pg,new THREE.MeshStandardMaterial({map:ecFurrow(),roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),plots.length);
    plots.forEach(([p,t,k],i)=>{const burnt=(t.fb&&t.fb[k]>G.t),col=burnt?'#2b2622':((t.i+k)%2?'#7c9a45':'#b59a45');put(im,i,p[0],groundH(p[0],p[1])+2.2,p[1],118,1,74,p[2]+1.5708,col);});
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;grp.add(im);}
  // extra houses for grown towns (3 per level above the start, ring around the old edge)
  const hs=[];for(const t of G.towns){const n=3*Math.max(0,(t.lv|0)-(t.lv0==null?(t.ham?0:1):t.lv0));if(!n)continue;const C0=G.ecHs||(G.ecHs={});
    for(let j=0;j<n;j++){const key=t.i+':'+j;let q=C0[key];if(q===undefined){const a=t.i*.9+j*.97+.3,rr=(t.r||160)*.9+34+(j%3)*20;q=nearestPassXY('ground',t.x+Math.cos(a)*rr,t.y+Math.sin(a)*rr);if(q&&Math.hypot(q[0]-(t.x+Math.cos(a)*rr),q[1]-(t.y+Math.sin(a)*rr))>24)q=null;C0[key]=q||0;q=C0[key];}
      if(q)hs.push([q,t,j]);}}
  if(hs.length){const wl=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),ecMat('#ffffff'),hs.length),rf=new THREE.InstancedMesh(TL.gable,ecMat('#ffffff'),hs.length);
    hs.forEach(([q,t,j],i)=>{const y=groundH(q[0],q[1]),ry=(t.i*3+j)*1.57,pl=TL_PLASTER[(t.i+j)%TL_PLASTER.length];put(wl,i,q[0],y+6.5,q[1],24,13,18,ry,pl);put(rf,i,q[0],y+13,q[1],26,8,22,ry,(t.i+j)%2?'#8a4a32':'#6d6a60');});
    for(const im of [wl,rf]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;grp.add(im);}}
  // mines (headframe + spoil heap), quarries (pit + heaps), factories (hall + chimneys); a flag in the owner's colour
  for(const p of G.ec.pts){const y=groundH(p.x,p.y),g=new THREE.Group(),mat=c=>ecMat(c),add=(geo,m,x,yy,z,rx,ry,rz,sx,sy,sz)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,yy,z);o.rotation.set(rx||0,ry||0,rz||0);if(sx)o.scale.set(sx,sy,sz);g.add(o);return o;};
    const cyl=new THREE.CylinderGeometry(1,1,1,10),cone=new THREE.ConeGeometry(1,1,9),box=new THREE.BoxGeometry(1,1,1);
    // DE-BLOCK slice 8: real-looking sites (PBR concrete/tin/plaster, lumpy rock, terraces, lattice, sawtooth roofs)
    const pbr=(k,c,r)=>typeof bkMat==='function'?bkMat(k,c,r):mat(c),rkM=pbr('concrete','#8b8272',3),rkD=pbr('concrete','#6a6254',3),tinM=pbr('tin','#8a8d8f',3),plM=pbr('plaster','#a89c84',2),dkM=mat('#25272a'),stM=mat('#4a4c4e'),
      lump=(sd,detail)=>{const gg=new THREE.IcosahedronGeometry(1,detail||2),pa=gg.attributes.position;for(let q=0;q<pa.count;q++){const x=pa.getX(q),yv=pa.getY(q),z=pa.getZ(q),n=1+.22*Math.sin(x*3.3+sd)*Math.cos(z*2.9+yv*2)+.1*Math.sin(z*8+yv*6+sd*2);pa.setXYZ(q,x*n,Math.max(yv,0)*n,z*n);}gg.computeVertexNormals();return gg;};
    if(p.k===1){add(lump(1,3),rkD,-26,0,10,0,0,0,34,26,30);add(lump(5,2),rkM,-44,0,26,0,0,0,16,10,14);
      add(cyl,mat('#141312'),22,1.5,12,0,0,0,18,3,18);add(cyl,rkM,22,2.6,12,0,0,0,21,1.4,21).rotation.x=0;
      for(const [x,z] of [[-8,-8],[12,-8]]){for(let t=0;t<5;t++){add(cyl,mat('#6b4a2c'),x*(1-t*.07)+1,5+t*10,z,0,0,x<0?.14:-.14,1.1,12,1.1);}}
      for(const x of [-6,10]){for(let t=0;t<4;t++){add(box,mat('#6b4a2c'),2,6+t*11,-8,0,0,t%2?.5:-.5,24,1,1);}}
      add(box,mat('#6b4a2c'),2,47,-8,0,0,0,24,2.4,3);add(cyl,mat('#3b3a38'),2,41,-8,Math.PI/2,0,0,7,2,7);add(cyl,mat('#c9a227'),2,41,-8,Math.PI/2,0,0,2.4,3,2.4);
      add(box,tinM,30,5,-16,0,0,0,26,10,16);add(box,dkM,30,10.4,-16,0,0,.0,28,1,18);add(box,stM,18,3,-24,0,0,0,10,6,8);
      for(let t=0;t<3;t++)add(box,dkM,4+t*7,1.6,26,0,0,0,5,3,3.2),add(cyl,dkM,4+t*7,.8,24.2,0,0,Math.PI/2,1.2,5,1.2);
      add(box,mat('#2b2b2b'),0,.4,26,0,0,0,40,.5,1.2);}
    else if(p.k===0){add(cyl,mat('#2c2822'),0,1.2,0,0,0,0,50,2.4,50);
      add(cyl,mat('#3a342a'),0,1.5,0,0,0,0,40,.6,40);for(let t=0;t<3;t++){const r0=18+t*9,wl=new THREE.CylinderGeometry(r0,r0,6,20,1,true,.5,4.4),lg=new THREE.RingGeometry(r0,r0+9,20,1,.5,4.4);lg.rotateX(-Math.PI/2);const m1=new THREE.Mesh(wl,t%2?rkD:rkM);m1.position.set(0,3+t*6,0);m1.material.side=THREE.DoubleSide;g.add(m1);const m2=new THREE.Mesh(lg,rkM);m2.position.set(0,6+t*6,0);g.add(m2);}
      for(let a=0;a<5;a++){const aa=a*1.26+.4;add(lump(a*3,1),a%2?rkD:rkM,Math.cos(aa)*60,0,Math.sin(aa)*60,0,aa,0,10+a%3*4,5+a%2*4,10+a%3*3);}
      add(lump(2,2),pbr('concrete','#a69c88',2),-52,0,14,0,0,0,24,20,24);add(lump(4,2),rkM,-70,0,-12,0,0,0,18,14,18);add(lump(7,2),pbr('concrete','#a69c88',2),52,0,-24,0,0,0,22,17,22);
      // conveyor + hopper, crusher shed, dump truck
      add(box,stM,22,9,24,0,0,.42,34,1.6,3.4);for(let t=0;t<5;t++)add(cyl,dkM,8+t*7,5+t*2.9,24,Math.PI/2,0,0,.7,4,.7);
      add(box,tinM,38,8,30,0,0,0,16,14,14);add(box,dkM,38,15.4,30,0,0,0,18,1,16);add(cone,mat('#9a8f7a'),38,2,40,0,0,0,10,10,10);
      add(box,mat('#c79a2c'),-14,3.4,46,0,0,0,16,4.6,8);add(box,mat('#c79a2c'),-20,7.2,46,0,0,-.5,10,5,8.4);add(box,mat('#2a2a2a'),-8,6.2,46,0,0,0,5,5,7);
      for(const [x,z] of [[-18,41.5],[-18,50.5],[-9,41.5],[-9,50.5]])add(cyl,dkM,x,2,z,Math.PI/2,0,0,2.6,2,2.6);}
    else{add(box,pbr('plaster','#9a9c9c',3),0,10,0,0,0,0,76,20,38);
      for(let t=0;t<4;t++){add(box,tinM,-27+t*18+.5,24.3,0,0,0,-.42,18,1,40);add(box,mat('#9fb4bd'),-27+t*18-8,23.2,0,0,0,0,.5,6.4,38);add(box,plM,-27+t*18+8.6,22.2,0,0,0,0,.6,4.4,40);}
      for(let t=0;t<6;t++)add(box,dkM,-30+t*12,12,19.2,0,0,0,7,5,.4);add(box,dkM,28,6,19.3,0,0,0,10,12,.4);
      for(const [x,h,r] of [[-26,48,2.8],[-8,42,2.4]]){add(cyl,pbr('concrete','#8a5c4a',2),x,h/2,-26,0,0,0,r,h,r);for(let t=0;t<3;t++)add(cyl,mat(t%2?'#d8d4cc':'#a33a2c'),x,h-3-t*5,-26,0,0,0,r*1.06,2.2,r*1.06);}
      add(cyl,tinM,44,8,22,0,0,0,9,16,9);add(cyl,tinM,56,7,28,0,0,0,7,14,7);add(cyl,tinM,-46,6,10,0,0,0,6,12,6);add(cyl,mat('#7d8184'),30,17,-12,0,0,Math.PI/2,1.4,50,1.4);add(cyl,mat('#7d8184'),30,14,-8,0,0,Math.PI/2,1.1,50,1.1);
      for(let t=0;t<5;t++)add(box,stM,18+t*11,7,-14,0,0,0,1.2,14,1.2);
      add(box,dkM,0,1.2,32,0,0,0,60,2.4,26);for(let t=0;t<4;t++)add(box,mat(['#7a3b2c','#35557a','#cfae3a','#4a6a46'][t]),-20+t*12,3.6,32,0,0,0,10,5,4);}
    const tc=p.ow>=0&&G.teams[p.ow]?G.teams[p.ow].color:'#bbbbbb';add(cyl,mat('#d8d8d8'),34,26,-30,0,0,0,1.4,52,1.4);add(box,mat(tc),44,46,-30,0,0,0,18,10,1.2);
    g.position.set(p.x,y,p.y);g.rotation.y=(p.i*1.7)%6.28;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});grp.add(g);}
  SCN.add(grp);ECV.grp=grp;}
// ---- world overlay: strips under the town labels, trade route, caravans, feature labels ----
function drawEconWorld(c){if(!G||!G.ec||!G.towns||G.over)return;try{ecViewSync();}catch(e){}
  const now=performance.now()/1000;c.save();c.textAlign='center';
  for(const t of G.towns){if(!townsMine(t)||t.fd==null||!inView(t.x,t.y,.1))continue;const p=toScreen(t.x,groundH(t.x,t.y)+(t.ham?70:110),t.y);if(p.z>1)continue;
    const w=112,x=p.x-w/2,y=p.y+24;c.fillStyle='rgba(8,12,10,.78)';c.fillRect(x,y,w,13);const lv=t.lv==null?1:t.lv;c.fillStyle='#e8f2e8';c.font='bold 10px system-ui,sans-serif';c.textAlign='left';c.fillText(EC_LV[lv].slice(0,4).toUpperCase()+'★'.repeat(lv),x+3,y+10);
    c.fillStyle='rgba(255,255,255,.16)';c.fillRect(x+50,y+3,34,7);c.fillStyle=ecFoodCol(t.fd);c.fillRect(x+50,y+3,34*t.fd/100,7);c.fillStyle='#6fb7ff';c.fillRect(x+50,y+10,34*Math.min(100,t.gp||0)/100,2);
    c.fillStyle='#ffd24a';c.fillText((t.inv&1?'P':'·')+(t.inv&2?'W':'·')+(t.inv&4?'R':'·'),x+87,y+10);if(t.fd<25){c.fillStyle='#ff6a55';c.fillText('!',x+104,y+10);}c.textAlign='center';}
  const T=G.teams[ME];
  if(T)for(const r of G.ec.rt){if(!ally(r.team,ME))continue;c.strokeStyle='rgba(255,214,90,.8)';c.lineWidth=2;c.setLineDash([9,7]);c.lineDashOffset=-now*18;c.beginPath();let st=false;
    for(const q of r.pts){const s=toScreen(q[0],groundH(q[0],q[1])+4,q[1]);if(s.z>1){st=false;continue;}if(!st){c.moveTo(s.x,s.y);st=true;}else c.lineTo(s.x,s.y);}c.stroke();c.setLineDash([]);}
  for(const e of G.ents){if(e.dead||!((e.cv&&e.cv.cav)||(G.ecCv&&G.ecCv.has(e.id)))||!inView(e.x,e.y,.1))continue;const p=toScreen(e.x,groundH(e.x,e.y)+34,e.y);if(p.z>1)continue;const fr=ally(e.team,ME);
    c.fillStyle='rgba(0,0,0,.78)';c.fillRect(p.x-17,p.y-16,34,13);c.fillStyle=fr?'#ffd24a':'#ff6a55';c.font='bold 9px system-ui,sans-serif';c.textAlign='center';c.fillText(fr?'TRADE':'RAID?',p.x,p.y-6);}
  c.font='bold 11px system-ui,sans-serif';for(const q of G.ec.pts){if(!inView(q.x,q.y,.1))continue;const p=toScreen(q.x,groundH(q.x,q.y)+66,q.y);if(p.z>1)continue;const mine=q.ow>=0&&ally(q.ow,ME),col=q.ow>=0&&G.teams[q.ow]?G.teams[q.ow].color:'#aaa';
    const lbl=EC_PT_NAME[q.k]+(q.k<2&&q.ow>=0&&mine?' +$'+(EC_PT_INC[q.k]*(G.bs||1)).toFixed(1)+'/s':q.k===2&&mine?' -8% cost':'');const w=c.measureText(lbl).width+10;
    c.fillStyle='rgba(8,12,10,.78)';c.fillRect(p.x-w/2,p.y-14,w,16);c.strokeStyle=col;c.lineWidth=1.5;c.strokeRect(p.x-w/2,p.y-14,w,16);c.fillStyle='#fff';c.fillText(lbl,p.x,p.y-2);
    if(q.cp>0&&q.cp<1){c.fillStyle='rgba(255,255,255,.25)';c.fillRect(p.x-w/2,p.y+3,w,4);c.fillStyle=G.teams[q.cpT>=0?q.cpT:0]?G.teams[q.cpT>=0?q.cpT:0].color:'#fff';c.fillRect(p.x-w/2,p.y+3,w*q.cp,4);}}
  c.restore();}
// ---- minimap: route lines, caravans, mines (triangle = quarry, diamond = mine, square-cross = factory) ----
function drawEconMini(c,sx,sy,now){if(!G||!G.ec||G.over)return;c.save();
  for(const r of G.ec.rt){if(!ally(r.team,ME))continue;c.strokeStyle='rgba(255,214,90,.85)';c.lineWidth=1.6;c.setLineDash([4,3]);c.beginPath();r.pts.forEach((q,i)=>{if(i)c.lineTo(q[0]*sx,q[1]*sy);else c.moveTo(q[0]*sx,q[1]*sy);});c.stroke();c.setLineDash([]);}
  for(const q of G.ec.pts){const x=q.x*sx,y=q.y*sy,col=q.ow>=0&&G.teams[q.ow]?G.teams[q.ow].color:'#999';c.fillStyle='#000';c.strokeStyle='#000';c.lineWidth=1;
    const sh=(r,f)=>{c.beginPath();if(q.k===0){c.moveTo(x,y-r);c.lineTo(x+r,y+r*.8);c.lineTo(x-r,y+r*.8);}else if(q.k===1){c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);}else{c.rect(x-r*.85,y-r*.85,r*1.7,r*1.7);}c.closePath();f?c.fill():c.stroke();};
    sh(5,true);c.fillStyle=q.ow>=0?col:'#444';sh(3.6,true);if(q.ow<0){c.strokeStyle='#ddd';sh(3.6,false);}
    if(q.k===2){c.strokeStyle='#000';c.beginPath();c.moveTo(x-2.4,y);c.lineTo(x+2.4,y);c.moveTo(x,y-2.4);c.lineTo(x,y+2.4);c.stroke();}}
  for(const e of G.ents){if(e.dead||!((e.cv&&e.cv.cav)||(G.ecCv&&G.ecCv.has(e.id))))continue;c.fillStyle='#000';c.fillRect(e.x*sx-3,e.y*sy-3,6,6);c.fillStyle=ally(e.team,ME)?'#ffd24a':'#ff4a3a';c.fillRect(e.x*sx-2,e.y*sy-2,4,4);}
  c.restore();}
// ---- HUD: extra income (caravans + mines + ports) next to the tax income ----
function ecHud(){const T=G&&G.teams&&G.teams[ME];if(!T)return;const s=$('terrInc');if(!s)return;const v=T.terr||0,x=T.eco||0;
  const txt=(v>0.05?'+$'+v.toFixed(1)+'/s':'')+(x>0.05?' &middot; trade +$'+x.toFixed(1)+'/s':'');if(s.dataset.ec!==txt){s.dataset.ec=txt;s.innerHTML=txt;s.title='Tax from your towns, plus trade: caravans, mines, quarries and ports'+(T.seaR>0.05?' (ports about $'+Math.round(T.seaR*60)+'/min)':'')+'. Press a town to change tax, invest or check food.';}}
