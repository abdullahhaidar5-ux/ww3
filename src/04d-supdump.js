/* ================= SUPPLY DUMP LOOK (view only, never read by the sim) =================
   Abdullah 2026-11-13 19:52 (photo of Battle as Lebanese Shia, "In conquest and battle"): the supply source read as "Blocky supply pile".
   Then (19:58, "Make cargo look more like generals"): a chunky, readable stepped pyramid of supply crates on pallets (lids, stencils,
   straps) with low dressing around it (sandbags, fuel drums, a tarp-covered stack, one container) on a trodden dirt pad. Bevelled (chamfered) edges with worn paint, grime at the bottom, and one shared
   texture atlas with a normal map drawn here in code (our own procedural art, no third-party files).
   Draw cost: ONE merged mesh per dump, ONE shared material for all dumps (one draw call + its shadow).
   Depletion: the goods are written into the buffer in the order they are used up (what goes last first), so a shrinking
   draw range takes the pyramid down tier by tier, matching the field's supply number (sdDumpTick). */
const SD={tex:null,mat:null};
// atlas: 4x4 cells of 128 px. 0 olive ammo crate side, 1 wooden crate side, 2 crate lid, 3 burlap, 4 drum side, 5 container
// side, 6 container doors, 7 tarp canvas, 8 camo net (cut-out), 9 trodden dirt, 10 pallet wood, 11 worn edge, 12 cardboard,
// 13 rocket crate side, 14 strap webbing, 15 drum top
function sdAtlas(){if(SD.tex)return SD.tex;const N=512,C=128,cv=document.createElement('canvas'),hv=document.createElement('canvas'),ov=document.createElement('canvas');cv.width=cv.height=hv.width=hv.height=ov.width=ov.height=N;
  const x=cv.getContext('2d'),h=hv.getContext('2d'),o=ov.getContext('2d'),R=mulberry(4242);
  h.fillStyle='#808080';h.fillRect(0,0,N,N);o.fillStyle='#00e000';o.fillRect(0,0,N,N);   // ORM: G roughness, B metalness
  const cell=(i,f)=>{const cx=(i%4)*C,cy=(i/4|0)*C;x.save();h.save();o.save();for(const g of [x,h,o]){g.beginPath();g.rect(cx,cy,C,C);g.clip();g.translate(cx,cy);}f();x.restore();h.restore();o.restore();};
  const noise=(n,a,col)=>{for(let i=0;i<n;i++){x.fillStyle=col?col:`rgba(${R()<.5?0:255},${R()<.5?0:255},${R()<.5?0:255},${a*R()})`;const s=1+R()*3;x.fillRect(R()*C,R()*C,s,s);}};
  const grime=(a)=>{const g=x.createLinearGradient(0,0,0,C);g.addColorStop(0,'rgba(60,45,30,0)');g.addColorStop(.7,`rgba(60,45,30,${a*.4})`);g.addColorStop(1,`rgba(50,38,25,${a})`);x.fillStyle=g;x.fillRect(0,0,C,C);
    for(let i=0;i<40;i++){x.fillStyle=`rgba(40,30,20,${.05+R()*.08})`;x.beginPath();x.ellipse(R()*C,R()*C,2+R()*10,1+R()*5,R()*3,0,7);x.fill();}};
  const planks=(n,base,var_,dir)=>{for(let i=0;i<n;i++){const c=new THREE.Color(base).offsetHSL(0,0,(R()-.5)*var_);x.fillStyle='#'+c.getHexString();const p=i*C/n;if(dir)x.fillRect(p,0,C/n,C);else x.fillRect(0,p,C,C/n);
      h.fillStyle='#202020';if(dir)h.fillRect(p,0,1.5,C);else h.fillRect(0,p,C,1.5);x.fillStyle='rgba(20,15,8,.55)';if(dir)x.fillRect(p,0,1.2,C);else x.fillRect(0,p,C,1.2);
      for(let k=0;k<14;k++){x.strokeStyle=`rgba(30,20,10,${.06+R()*.08})`;x.lineWidth=.6;x.beginPath();const q=p+R()*C/n;if(dir){x.moveTo(q,0);x.bezierCurveTo(q+R()*3-1.5,C*.3,q+R()*3-1.5,C*.6,q+R()*2-1,C);}else{x.moveTo(0,q);x.bezierCurveTo(C*.3,q+R()*3-1.5,C*.6,q+R()*3-1.5,C,q+R()*2-1);}x.stroke();}}};
  const stencil=(lines,col,y0,sz)=>{x.fillStyle=col;x.textAlign='center';x.font=`bold ${sz}px "Arial Narrow",Arial,sans-serif`;lines.forEach((t,i)=>{x.globalAlpha=.85;x.fillText(t,C/2,y0+i*sz*1.15);});x.globalAlpha=1;
    for(let i=0;i<70;i++){x.fillStyle='rgba(80,80,60,.5)';x.fillRect(R()*C,y0-sz+R()*(lines.length*sz*1.2),1+R()*2,1);}};
  const frame=(col,w)=>{x.strokeStyle=col;x.lineWidth=w;x.strokeRect(w/2,w/2,C-w,C-w);h.strokeStyle='#b0b0b0';h.lineWidth=w;h.strokeRect(w/2,w/2,C-w,C-w);};
  // 0 olive ammo crate side: painted planks, frame battens, yellow band, stencil, rope handles
  cell(0,()=>{planks(4,'#727a48',.06,0);frame('#626a3c',10);x.fillStyle='#b99b2e';x.fillRect(10,30,C-20,7);stencil(['CTG 7.62MM','LOT 26-114'],'#e2dcc2',62,13);
    x.fillStyle='#2d2a20';for(const s of [24,C-34]){x.fillRect(s,92,10,4);h.fillStyle='#d0d0d0';h.fillRect(s,92,10,4);}grime(.55);noise(500,.08);});
  // 1 wooden crate side: raw planks, dark battens, black stencil
  cell(1,()=>{planks(5,'#c29a62',.1,0);frame('#94703f',9);x.strokeStyle='#8c6a3e';x.lineWidth=7;x.beginPath();x.moveTo(8,8);x.lineTo(C-8,C-8);x.stroke();h.strokeStyle='#c0c0c0';h.lineWidth=7;h.beginPath();h.moveTo(8,8);h.lineTo(C-8,C-8);h.stroke();
    stencil(['SUPPLY','RATIONS 12'],'#1c1a16',50,15);grime(.35);noise(500,.08);});
  // 2 lid: painted planks with worn top
  cell(2,()=>{planks(4,'#6e7646',.07,1);frame('#5e653a',8);x.fillStyle='rgba(170,150,110,.25)';for(let i=0;i<30;i++){x.beginPath();x.ellipse(R()*C,R()*C,3+R()*12,2+R()*6,R()*3,0,7);x.fill();}stencil(['▲'],'#e2dcc2',74,16);noise(500,.08);});
  // 3 burlap: woven, dusty
  cell(3,()=>{x.fillStyle='#a8916a';x.fillRect(0,0,C,C);for(let i=0;i<C;i+=3){x.fillStyle=`rgba(70,55,35,${.12+R()*.1})`;x.fillRect(i,0,1,C);x.fillRect(0,i,C,1);h.fillStyle='#606060';h.fillRect(i,0,1,C);h.fillRect(0,i,C,1);}
    x.strokeStyle='rgba(60,45,28,.55)';x.lineWidth=2;x.beginPath();x.moveTo(0,C*.5);for(let i=0;i<=C;i+=8)x.lineTo(i,C*.5+(i/8%2?2:-2));x.stroke();grime(.45);noise(900,.1);});
  // 4 drum side: light grey (vertex colour tints it), two rolling hoops, band, rust runs
  cell(4,()=>{x.fillStyle='#c8c8c4';x.fillRect(0,0,C,C);for(const y of [C*.33,C*.66]){x.fillStyle='#8a8a86';x.fillRect(0,y-3,C,6);x.fillStyle='#e0e0dc';x.fillRect(0,y-3,C,1.5);h.fillStyle='#e8e8e8';h.fillRect(0,y-3,C,6);}
    x.fillStyle='rgba(235,235,225,.6)';x.fillRect(0,C*.12,C,6);for(let i=0;i<14;i++){const sx=R()*C,g=x.createLinearGradient(0,C*.2,0,C);g.addColorStop(0,'rgba(120,60,25,.0)');g.addColorStop(1,'rgba(110,55,22,.55)');x.fillStyle=g;x.fillRect(sx,C*.2+R()*30,1+R()*3,C);}
    grime(.6);noise(600,.07);o.fillStyle='#007070';o.fillRect(0,0,C,C);});
  // 5 container side: corrugation, rust, faded
  cell(5,()=>{x.fillStyle='#c4c0b8';x.fillRect(0,0,C,C);for(let i=0;i<C;i+=8){const g=x.createLinearGradient(i,0,i+8,0);g.addColorStop(0,'#a8a49c');g.addColorStop(.5,'#dcd8d0');g.addColorStop(1,'#a8a49c');x.fillStyle=g;x.fillRect(i,0,8,C);
      const gh=h.createLinearGradient(i,0,i+8,0);gh.addColorStop(0,'#404040');gh.addColorStop(.5,'#c0c0c0');gh.addColorStop(1,'#404040');h.fillStyle=gh;h.fillRect(i,0,8,C);}
    x.fillStyle='#7f7b74';x.fillRect(0,0,C,5);x.fillRect(0,C-6,C,6);for(let i=0;i<26;i++){x.fillStyle=`rgba(120,58,26,${.15+R()*.3})`;const sx=R()*C;x.fillRect(sx,R()*C*.3,1+R()*3,20+R()*80);}grime(.5);noise(500,.06);o.fillStyle='#008a50';o.fillRect(0,0,C,C);});
  // 6 container doors: two leaves, locking bars
  cell(6,()=>{x.fillStyle='#bdb9b1';x.fillRect(0,0,C,C);x.fillStyle='#8c8880';x.fillRect(C/2-1,0,2,C);for(const s of [C*.18,C*.36,C*.64,C*.82]){x.fillStyle='#55524c';x.fillRect(s-2,6,4,C-12);h.fillStyle='#e0e0e0';h.fillRect(s-2,6,4,C-12);x.fillStyle='#3a3834';x.fillRect(s-5,C*.5-4,10,8);}
    for(let i=0;i<18;i++){x.fillStyle=`rgba(120,58,26,${.2+R()*.3})`;x.fillRect(R()*C,R()*C,2+R()*4,10+R()*40);}grime(.6);noise(500,.06);o.fillStyle='#008a50';o.fillRect(0,0,C,C);});
  // 7 tarp canvas: olive drab, folds
  cell(7,()=>{x.fillStyle='#5d5a3e';x.fillRect(0,0,C,C);for(let i=0;i<9;i++){const g=x.createLinearGradient(0,i*16,0,i*16+16);g.addColorStop(0,'rgba(0,0,0,.18)');g.addColorStop(.5,'rgba(255,255,230,.08)');g.addColorStop(1,'rgba(0,0,0,.18)');x.fillStyle=g;x.fillRect(0,i*16-4+R()*6,C,16);
      const gh=h.createLinearGradient(0,i*16,0,i*16+16);gh.addColorStop(0,'#505050');gh.addColorStop(.5,'#b0b0b0');gh.addColorStop(1,'#505050');h.fillStyle=gh;h.fillRect(0,i*16,C,16);}
    x.fillStyle='rgba(30,28,18,.6)';for(let i=8;i<C;i+=28){x.beginPath();x.arc(i,6,2.2,0,7);x.fill();}grime(.4);noise(1200,.06);});
  // 8 camo net: leaf cut-outs on a cord grid (alpha holes)
  cell(8,()=>{x.clearRect(0,0,C,C);const cols=['#4f5233','#6b6942','#3e4128','#7b6f4a','#5b5a37'];for(let i=0;i<260;i++){x.fillStyle=cols[i%5];x.save();x.translate(R()*C,R()*C);x.rotate(R()*7);x.beginPath();x.moveTo(-6,0);x.lineTo(-1,-4);x.lineTo(6,0);x.lineTo(0,4);x.closePath();x.fill();x.restore();}
    x.strokeStyle='#2c2b20';x.lineWidth=1.3;for(let i=0;i<C;i+=11){x.beginPath();x.moveTo(i,0);x.lineTo(i+20,C);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(C,i+20);x.stroke();}
    h.fillStyle='#a0a0a0';h.fillRect(0,0,C,C);});
  // 9 trodden dirt with gravel and tyre ruts
  cell(9,()=>{x.fillStyle='#8a7a60';x.fillRect(0,0,C,C);for(let i=0;i<1600;i++){const v=R();x.fillStyle=v<.5?`rgba(60,48,34,${.1+R()*.2})`:`rgba(200,185,150,${.08+R()*.18})`;const s=.8+R()*2.4;x.fillRect(R()*C,R()*C,s,s);h.fillStyle=v<.5?'#606060':'#a8a8a8';h.fillRect(R()*C,R()*C,s,s);}
    for(const ry of [40,56,84,100]){x.fillStyle='rgba(55,42,30,.22)';x.fillRect(0,ry,C,7);h.fillStyle='#5a5a5a';h.fillRect(0,ry,C,7);for(let i=0;i<C;i+=5){x.fillStyle='rgba(40,30,20,.2)';x.fillRect(i,ry+1,2,5);}}});
  // 10 pallet wood: raw, pale, nailed
  cell(10,()=>{planks(3,'#caa874',.1,1);x.fillStyle='#3a3a36';for(let i=0;i<12;i++)x.fillRect(10+(i%3)*C/3+R()*8,6+(i/3|0)*36,2,2);grime(.5);noise(500,.08);});
  // 11 worn edge: scuffed paint showing lighter primer / wood
  cell(11,()=>{x.fillStyle='#b8ab88';x.fillRect(0,0,C,C);for(let i=0;i<300;i++){x.fillStyle=`rgba(${R()<.5?'70,65,45':'230,220,190'},${.15+R()*.3})`;x.fillRect(R()*C,R()*C,2+R()*6,1+R()*2);}});
  // 12 cardboard / ammo cans on pallets, tape and labels
  cell(12,()=>{x.fillStyle='#b4936a';x.fillRect(0,0,C,C);for(let i=0;i<C;i+=4){x.fillStyle=`rgba(90,70,45,${.05+R()*.06})`;x.fillRect(i,0,1,C);}x.fillStyle='#c9b48c';x.fillRect(C/2-9,0,18,C);
    x.fillStyle='#e8e2d2';x.fillRect(18,72,44,26);x.fillStyle='#222';x.font='bold 8px Arial';x.fillText('NSN 8970',22,84);x.fillText('QTY 24',22,94);x.strokeStyle='#2a2a2a';x.lineWidth=1;x.strokeRect(80,74,28,20);grime(.5);noise(500,.07);});
  // 13 rocket crate: long, darker green, yellow band and stencil
  cell(13,()=>{planks(3,'#46502e',.06,0);frame('#3c4428',8);x.fillStyle='#c9a634';x.fillRect(8,20,C-16,6);x.fillRect(8,C-26,C-16,6);stencil(['ROCKET 107MM','HE  4 RDS'],'#e8e1c5',58,12);grime(.55);noise(500,.08);});
  // 14 strap webbing: yellow-orange weave with buckle
  cell(14,()=>{x.fillStyle='#c79a2c';x.fillRect(0,0,C,C);for(let i=0;i<C;i+=2){x.fillStyle=`rgba(80,55,10,${.15+(i%4?0:.15)})`;x.fillRect(i,0,1,C);h.fillStyle=i%4?'#909090':'#707070';h.fillRect(i,0,1,C);}x.fillStyle='#55534c';x.fillRect(0,C*.45,C,C*.1);grime(.4);});
  // 15 drum top: rim ring, bungs
  cell(15,()=>{x.fillStyle='#bdbdb8';x.fillRect(0,0,C,C);x.strokeStyle='#7c7c78';x.lineWidth=6;x.beginPath();x.arc(C/2,C/2,C/2-5,0,7);x.stroke();h.strokeStyle='#e0e0e0';h.lineWidth=6;h.beginPath();h.arc(C/2,C/2,C/2-5,0,7);h.stroke();
    for(const [bx,by,r] of [[C*.3,C*.32,8],[C*.68,C*.62,5]]){x.fillStyle='#55554f';x.beginPath();x.arc(bx,by,r,0,7);x.fill();h.fillStyle='#c8c8c8';h.beginPath();h.arc(bx,by,r,0,7);h.fill();}
    x.fillStyle='rgba(70,55,35,.3)';for(let i=0;i<20;i++){x.beginPath();x.arc(R()*C,R()*C,2+R()*8,0,7);x.fill();}noise(400,.07);o.fillStyle='#007070';o.fillRect(0,0,C,C);});
  // normal map from the height canvas (per pixel, wraps inside each cell)
  const H=h.getImageData(0,0,N,N).data,nc=document.createElement('canvas');nc.width=nc.height=N;const nx=nc.getContext('2d'),ni=nx.createImageData(N,N),hp=(px,py)=>H[(py*N+px)*4]/255;
  for(let py=0;py<N;py++)for(let px=0;px<N;px++){const cx=px-px%C,cy=py-py%C,l=cx+(px-cx+C-1)%C,r=cx+(px-cx+1)%C,u=cy+(py-cy+C-1)%C,d=cy+(py-cy+1)%C;let a=-(hp(r,py)-hp(l,py))*2.2,b=(hp(px,d)-hp(px,u))*2.2;const L=Math.hypot(a,b,1);const j=(py*N+px)*4;ni.data[j]=(a/L*.5+.5)*255;ni.data[j+1]=(b/L*.5+.5)*255;ni.data[j+2]=(1/L*.5+.5)*255;ni.data[j+3]=255;}
  nx.putImageData(ni,0,0);
  const T=(c,srgb)=>{const t=new THREE.CanvasTexture(c);t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;};
  return SD.tex={map:T(cv,1),n:T(nc,0),orm:T(ov,0)};}
function sdMat(){if(SD.mat)return SD.mat;const A=sdAtlas();SD.mat=new THREE.MeshStandardMaterial({vertexColors:true,map:A.map,normalMap:A.n,normalScale:new THREE.Vector2(1.1,1.1),roughnessMap:A.orm,metalnessMap:A.orm,roughness:1,metalness:1,alphaTest:.5});
  if(typeof weather==='function')weather(SD.mat,.6);return SD.mat;}
// Geometry kit: chamfered boxes, drums, sandbags, draped cloth. Every polygon gets a flat normal, atlas UVs and a vertex colour
// with ground grime; parts are grouped into items with a key (low key = written first = used up last; -1 = always stays).
function sdKit(){const items=[];let cur=null;const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),A=new THREE.Vector3(),B=new THREE.Vector3(),Nn=new THREE.Vector3(),cen=new THREE.Vector3();
  const uvc=(ci,s,t)=>{const cx=(ci%4)*128,cy=(ci/4|0)*128;s=Math.min(1,Math.max(0,s));t=Math.min(1,Math.max(0,t));return [(cx+4+s*120)/512,1-(cy+4+t*120)/512];};
  const k={item(key){cur={key,P:[],N:[],U:[],C:[]};items.push(cur);return k;},
    at(x,y,z,ry=0,rx=0,rz=0){M.compose(V.set(x,y,z),Q.setFromEuler(E.set(rx,ry,rz,'YXZ')),S);return k;},
    // pts: local points; uvf(p) -> [cell,s,t]; col THREE.Color (linear); c0: local centre for outward winding
    poly(pts,uvf,col,c0,ds){const W=pts.map(p=>p.clone().applyMatrix4(M));cen.copy(c0).applyMatrix4(M);A.subVectors(W[1],W[0]);B.subVectors(W[2],W[0]);Nn.crossVectors(A,B).normalize();
      const mid=W.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/W.length);let flip=false;if(!ds&&Nn.dot(mid.clone().sub(cen))<0){Nn.negate();flip=true;}
      const uv=Array.isArray(uvf)?uvf:pts.map(p=>uvf(p));for(let i=1;i<W.length-1;i++){const tri=flip?[0,i+1,i]:[0,i,i+1];for(const j of tri){const w=W[j];cur.P.push(w.x,w.y,w.z);cur.N.push(Nn.x,Nn.y,Nn.z);const u=uvc(...uv[j]);cur.U.push(u[0],u[1]);
        const g=Math.min(1,Math.max(0,w.y/5)),ao=.62+.38*g*g*(3-2*g);cur.C.push(col.r*ao,col.g*ao,col.b*ao);}}return k;},
    // chamfered box (w,h,d) sitting on y=0; cells {s:side,t:top,e:edge,x:end (optional, the +-x faces)}
    box(w,h,d,e,cells,col,ecol){const a=w/2,b=h/2,c=d/2,hh=[a,b,c],c0=new THREE.Vector3(0,b,0),P=(x,y,z)=>new THREE.Vector3(x,y+b,z);e=Math.min(e,a*.45,b*.45,c*.45);
      const uvf=(ci,ax)=>p=>{const y=p.y-b;if(ax===0)return [ci,(p.z+c)/(2*c),(b-y)/(2*b)];if(ax===2)return [ci,(p.x+a)/(2*a),(b-y)/(2*b)];return [ci,(p.x+a)/(2*a),(p.z+c)/(2*c)];};
      const ord=(pts,ax)=>{const u=ax===0?2:0,v=ax===1?2:1,cm=pts.reduce((s,p)=>[s[0]+p.getComponent(u),s[1]+p.getComponent(v)],[0,0]).map(q=>q/pts.length);return pts.sort((p,q)=>Math.atan2(p.getComponent(v)-cm[1],p.getComponent(u)-cm[0])-Math.atan2(q.getComponent(v)-cm[1],q.getComponent(u)-cm[0]));};
      const ec=ecol||col;
      for(let ax=0;ax<3;ax++)for(const sg of [-1,1]){const pts=[];for(const s1 of [-1,1])for(const s2 of [-1,1]){const q=[0,0,0];q[ax]=sg*hh[ax];const o=[0,1,2].filter(i=>i!==ax);q[o[0]]=s1*(hh[o[0]]-e);q[o[1]]=s2*(hh[o[1]]-e);pts.push(P(...q));}
        const ci=ax===1?(sg>0?cells.t:(cells.b!=null?cells.b:cells.t)):ax===0&&cells.x!=null?cells.x:cells.s;k.poly(ord(pts,ax),uvf(ci,ax),col,c0);}
      if(e>.01){for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)for(const si of [-1,1])for(const sj of [-1,1]){const kx=3-i-j,pts=[];for(const sk of [-1,1]){const q1=[0,0,0],q2=[0,0,0];q1[i]=si*hh[i];q1[j]=sj*(hh[j]-e);q1[kx]=sk*(hh[kx]-e);q2[i]=si*(hh[i]-e);q2[j]=sj*hh[j];q2[kx]=sk*(hh[kx]-e);pts.push(P(...q1),P(...q2));}
          k.poly([pts[0],pts[1],pts[3],pts[2]],uvf(cells.e,kx===1?(i===0?2:0):1),ec,c0);}
        for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])k.poly([P(sx*a,sy*(b-e),sz*(c-e)),P(sx*(a-e),sy*b,sz*(c-e)),P(sx*(a-e),sy*(b-e),sz*c)],uvf(cells.e,1),ec,c0);}
      return k;},
    // drum / cylinder standing on y=0 (lying: rx=PI/2 in at())
    drum(r,h,seg,cs,ct,col){const c0=new THREE.Vector3(0,h/2,0);for(let i=0;i<seg;i++){const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,p=(a,y)=>new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
        const s0=(i%5)/5,s1=(i%5+1)/5;k.poly([p(a0,0),p(a1,0),p(a1,h),p(a0,h)],[[cs,s0,1],[cs,s1,1],[cs,s1,0],[cs,s0,0]],col,c0);}
      for(const y of [h,0]){const pts=[];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}k.poly(pts,q=>[ct,.5+q.x/(2*r),.5+q.z/(2*r)],col,c0);}
      // rim lip
      for(let i=0;i<seg;i++){const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,p=(a,rr,y)=>new THREE.Vector3(Math.cos(a)*rr,y,Math.sin(a)*rr);k.poly([p(a0,r*1.04,h-.35),p(a1,r*1.04,h-.35),p(a1,r*1.04,h+.12),p(a0,r*1.04,h+.12)],()=>[11,.5,.5],col.clone().multiplyScalar(.8),c0);}
      return k;},
    // draped cloth: a grid over (w x d) whose height is hf(u,v) (u,v in -1..1), facing up
    drape(w,d,nx,nz,hf,ci,col){const g=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const u=i/nx*2-1,v=j/nz*2-1;g.push(new THREE.Vector3(u*w/2,hf(u,v),v*d/2));}
      const c0=new THREE.Vector3(0,-50,0);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const q=[g[j*(nx+1)+i],g[j*(nx+1)+i+1],g[(j+1)*(nx+1)+i+1],g[(j+1)*(nx+1)+i]];
        k.poly(q,p=>[ci,p.x/w+.5,p.z/d+.5],col,c0,0);}return k;},
    // stages: st -> draw everything whose key is below TH[st] (TH = [0, .55, 2, 3, inf]: empty pallets / half the bottom tier / 2 tiers / 3 tiers / full)
    build(TH){items.sort((p,q)=>p.key-q.key);let n=0;for(const it of items)n+=it.P.length/3;const P=new Float32Array(n*3),Nr=new Float32Array(n*3),U=new Float32Array(n*2),C=new Float32Array(n*3);let o=0;const stage=TH.map(()=>0);
      for(const it of items){P.set(it.P,o*3);Nr.set(it.N,o*3);U.set(it.U,o*2);C.set(it.C,o*3);o+=it.P.length/3;TH.forEach((t,i)=>{if(it.key<t)stage[i]=o;});}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(Nr,3));g.setAttribute('uv',new THREE.BufferAttribute(U,2));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.computeBoundingSphere();
      return {g,stage};}};
  return k;}
const SDC=(h)=>{const c=new THREE.Color(h);return typeof lin==='function'?lin(h):c;};
// one dump: f = supply field (r ~46; trucks load at r+6 from the centre). ORCH note 2026-11-13 19:58 (Abdullah "Make cargo look more like
// generals"): a clear, chunky, game-readable pyramid of supply crates on pallets in the middle - bright, you know at a glance "trucks
// collect money here" - that drops tier by tier as it is emptied. Around it, kept low so they never hide the pile: the trodden pad,
// a short sandbag wall, a fuel drum cluster, a tarp-covered spare stack and one shipping container at the back.
function sdDump(f,fi){const R=mulberry(fi*131+17),k=sdKit(),tint=(h,v)=>SDC(h).clone().multiplyScalar(1+(R()-.5)*(v||.18)),gy=groundH(f.x,f.y);
  const rot=(fi*1.7+R()*.6)%(Math.PI*2),cs=Math.cos(rot),sn=Math.sin(rot),gh=(lx,lz)=>groundH(f.x+lx*cs+lz*sn,f.y-lx*sn+lz*cs)-gy,Y=(x,z)=>gh(x,z)+.3;   // local -> world (mesh rotation.y = rot)
  // trodden dirt pad, irregular edge, follows the ground
  {k.item(-1);const seg=28,rr=[];for(let i=0;i<seg;i++)rr.push(f.r*(.86+R()*.16)*(i%2?1:.94));const pts=i=>{const a=i/seg*Math.PI*2;return new THREE.Vector3(Math.cos(a)*rr[i%seg]*1.1,0,Math.sin(a)*rr[i%seg]);};
    const ring=[0,.55,1];for(let ri=0;ri<2;ri++)for(let i=0;i<seg;i++){const q=[[ri,i],[ri,i+1],[ri+1,i+1],[ri+1,i]].map(([a,b])=>{const p=pts(b).multiplyScalar(ring[a]);p.y=gh(p.x,p.z)+.35;return p;});
      k.at(0,0,0).poly(ri===0?[q[0],q[2],q[3]]:q,p=>[9,p.x/(f.r*2.4)+.5,p.z/(f.r*2.2)+.5],SDC('#857660'),new THREE.Vector3(0,-50,0),0);}}
  // the pile: pallets (stay) and a stepped pyramid of crates, tier t = (5-t) x (4-t), each crate a body + lid
  const CW=8.3,CH=5.8,base=[];
  for(let i=0;i<5;i++)for(let j=0;j<4;j++)base.push([(i-2)*CW,(j-1.5)*CW]);
  for(const [x,z] of base){k.item(-1).at(x+(R()-.5)*.4,Y(x,z)-.1,z,(R()-.5)*.05).box(8,1.25,8,.12,{s:10,t:10,e:10},tint('#c9b58c',.16));}
  const y0=Math.max(...base.map(([x,z])=>Y(x,z)))+1.2;
  for(let t=0;t<4;t++)for(let i=0;i<5-t;i++)for(let j=0;j<4-t;j++){const x=(i-(4-t)/2)*CW+(R()-.5)*.7,z=(j-(3-t)/2)*CW+(R()-.5)*.7,yy=y0+t*(CH+.55),ry=(R()-.5)*.09,wood=R()<.68,key=t===0?R()*.99:t+R()*.99;
    k.item(key).at(x,yy,z,ry).box(7.5,CH,7.5,.3,{s:wood?1:0,t:10,e:11},wood?tint('#fff4dc',.14):tint('#f2f6e0',.12),wood?SDC('#e2c99a'):SDC('#b8b08a'));
    k.at(x,yy+CH,z,ry).box(7.8,.55,7.8,.2,{s:wood?10:2,t:wood?10:2,e:11},wood?tint('#fff0d4',.12):tint('#ffffff',.1),SDC('#d8c8a0'));}
  // straps over the bottom two tiers' rows (go with their tier)
  for(const [t,zz] of [[0,-.5*CW],[0,.5*CW],[1,0]]){k.item(t===0?.3:t+.5).at(0,y0+t*(CH+.55)-.05,zz).box((5-t)*CW-.2,CH+.75,.4,.05,{s:14,t:14,e:14},SDC('#ffffff'));}
  // short sandbag wall on one side (stays)
  {const R0=f.r*.84,n=Math.round(R0*1.1/3.15);for(let c=0;c<2;c++)for(let i=0;i<n-c;i++){const a=-.5+(i+.5+c*.5)/n*1.1,x=Math.cos(a+Math.PI)*R0,z=Math.sin(a+Math.PI)*R0;k.item(-1).at(x,Y(x,z)+c*1.05,z,-(a+Math.PI)+Math.PI/2+(R()-.5)*.12).box(3.3,1.15,1.8,.5,{s:3,t:3,e:3},tint('#d8cfb8',.16));}}
  // fuel drums, one cluster + one lying (stay)
  {const DC=['#4f5a3a','#3d4f5f','#7a3328','#5e6b40'],cx=f.r*.62,cz=f.r*.5;for(let row=0;row<2;row++)for(let c=0;c<3;c++){const x=cx+c*3.1+(row%2)*1.55,z=cz+row*2.7;k.item(-1).at(x,Y(x,z),z,R()*6).drum(1.45,4.4,10,4,15,tint(DC[(R()*DC.length)|0],.2));}
    const lx=cx-2,lz=cz+6.5;k.item(-1).at(lx,Y(lx,lz)+1.45,lz,.9,Math.PI/2).drum(1.45,4.4,10,4,15,tint(DC[(R()*DC.length)|0],.2));}
  // tarp-covered spare stack (stays)
  {const x=-f.r*.62,z=f.r*.55,hh=4.2;k.item(-1).at(x,Y(x,z),z,.4).drape(10,9,8,8,(u,v)=>{const a=Math.max(Math.abs(u),Math.abs(v));return a<.72?hh+Math.sin(u*9)*.12:hh*Math.max(0,1-(a-.72)/.28*1.03);},7,tint('#ffffff',.1));}
  // one shipping container at the back (stays)
  {const CC=['#8a4a2c','#a89270','#3f5a6e','#7a3a30'],x=f.r*.1,z=-f.r*.8;k.item(-1).at(x,Y(x,z)-.2,z,.03).box(26,10.5,10,.35,{s:5,t:5,x:6,e:11},tint(CC[(R()*CC.length)|0],.12),SDC('#6d6a62'));}
  const B=k.build([0,.55,2,3,1e9]),m=new THREE.Mesh(B.g,sdMat());m.castShadow=true;m.receiveShadow=true;m.position.set(f.x,gy,f.y);m.rotation.y=rot;m.userData.sdStage=B.stage;m.name='supplyDump';return m;}
// depletion: full / 3 tiers / 2 tiers / half the bottom tier / empty pallets, matching the field's supply number against what the map started it with
function sdDumpTick(){if(!G||!G.fieldObj)return;for(let i=0;i<G.fields.length;i++){const v=G.fieldObj[i],f=G.fields[i];if(!v||!v.m)continue;const a0=Math.max(1,v.a0||9000),q=Math.max(0,f.amt)/a0,st=f.amt<=0?0:Math.min(4,Math.ceil(q*4-1e-6));
    if(st!==v.st){v.st=st;v.m.geometry.setDrawRange(0,v.m.userData.sdStage[st]);}}}
