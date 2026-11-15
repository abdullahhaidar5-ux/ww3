/* TOWN LOOK (Abdullah 2026-11-05 "How can these buildings look better?"). Visuals only: the sim footprints/heights of the
   town buildings (map.cityBlds) are untouched; this module only changes how they are DRAWN, into the same two merged
   meshes buildCity() already makes (walls with the window shader, and everything else) - so a whole map's towns stay at
   2 draw calls. Stage 1 = Middle East (mideast / lebanon / yemen / southasia): flat roofs with parapets and cornices,
   rendered plaster, arched doors with frames, shop fronts with striped awnings, balconies, set-back upper storeys,
   rooftop tanks / dishes / AC / solar panels / rebar stubs, a domed mosque with real minarets, dirt+asphalt streets with
   kerbs, power poles and cables, palms, parked cars and market stalls. Everything is deterministic per building. */
const TL_ME={mideast:1,lebanon:1,yemen:1,southasia:1};
const TL={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,8),cyl5:new THREE.CylinderGeometry(1,1,1,5),cone:new THREE.ConeGeometry(1,1,6),cone4:new THREE.ConeGeometry(1,1,4),
  sph:new THREE.SphereGeometry(1,6,4),dome:new THREE.SphereGeometry(1,14,6,0,Math.PI*2,0,Math.PI/2)};
// gable prism: ridge along local x, width w (z), height h, length l (x). Flat-shaded, no bottom.
TL.gable=(()=>{const P=[],a=[-.5,0,-.5],b=[.5,0,-.5],c=[.5,0,.5],d=[-.5,0,.5],r0=[-.5,1,0],r1=[.5,1,0];const tri=(...v)=>{for(const q of v)P.push(...q);};
  tri(d,c,r1);tri(d,r1,r0);tri(a,r0,r1);tri(a,r1,b);tri(a,d,r0);tri(b,r1,c);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.computeVertexNormals();return g;})();
const TL_Q=new THREE.Quaternion(),TL_E=new THREE.Euler(),TL_V=new THREE.Vector3(),TL_S=new THREE.Vector3();
// one primitive: scaled shared geometry at world position (x,y,z), yaw ry, optional pitch (tilt about local x) and roll
function tlPut(B,g,sx,sy,sz,x,y,z,col,ry=0,tilt=0,roll=0){if(!g.index)g=g.clone();   // merge() transforms non-indexed geometry in place
  TL_E.set(tilt,ry,roll,'YXZ');TL_Q.setFromEuler(TL_E);
  B._p.push({g,m:new THREE.Matrix4().compose(TL_V.set(x,y,z),TL_Q,TL_S.set(sx,sy,sz)),c:typeof col==='string'?lin(col):col});}
const TL_PLASTER=['#e3d6b8','#d9c7a2','#eadfc8','#cdb48a','#e9e2d3','#d2b98f','#ddd0b6','#c7ae86'];
const TL_ACC=['#2f5d50','#3a5a7a','#7a4a2c','#4d3a2c','#6a2f2a','#2d6a72','#8a6a2c'];
const TL_AWN=[['#b3342b','#efe6d2'],['#2f6b8f','#efe6d2'],['#2f7a4e','#efe6d2'],['#c58a2a','#efe6d2'],['#7a2f5a','#efe6d2']];
function tlShade(c,f){const o=new THREE.Color(c);o.multiplyScalar(f);return '#'+o.getHexString();}
// stage-1 builder for one Middle Eastern town building. B = detail mesh, W = wall mesh (with the window shader), BT = shader attributes.
// Returns true when handled. mosque = this building becomes the town's mosque.
function tlMEBuilding(B,W,BT,b,P,g,mosque,shia){
  const R=mulberry(((b.x*13)^(b.y*7))|0),low=b.h<14,small=b.w<22;
  let w=b.w*.95,dd=b.d*.95,h=b.h;const f=(R()*4)|0,yaw=(R()-.5)*.12+f*Math.PI/2;
  let col=P[Math.floor(b.v*P.length)%P.length];if(b.style!=='yemen'&&R()<.6)col=TL_PLASTER[(R()*TL_PLASTER.length)|0];
  const cs=Math.cos(yaw),sn=Math.sin(yaw),X=(lx,lz)=>b.x+lx*cs+lz*sn,Z=(lx,lz)=>b.y-lx*sn+lz*cs;
  const bx=(sw,sh,sd,lx,y,lz,c,tilt=0,ry=0,roll=0)=>tlPut(B,TL.box,sw,sh,sd,X(lx,lz),y,Z(lx,lz),c,yaw+ry,tilt,roll);
  const pt=(g,sx,sy,sz,lx,y,lz,c,tilt=0,roll=0)=>tlPut(B,g,sx,sy,sz,X(lx,lz),y,Z(lx,lz),c,yaw,tilt,roll);
  const cy=(r,sh,lx,y,lz,c,hi=true)=>tlPut(B,hi?TL.cyl:TL.cyl5,r,sh,r,X(lx,lz),y,Z(lx,lz),c);
  const dm=(r,sy,lx,y,lz,c)=>tlPut(B,TL.dome,r,r*sy,r,X(lx,lz),y,Z(lx,lz),c);
  const wall=(ww,hh,dd_,lx,yb,lz,type)=>{W.box(ww,hh,dd_,X(lx,lz),yb+hh/2,Z(lx,lz),col,0,yaw,0);BT.push([yb+1,yb+hh,type,mosque?.2:b.v]);};
  const wear=R()<.55?0:R();const T=4+Math.min(.99,wear)*.9;   // shader type 4.x = Middle East facade, fraction = war wear
  // ground patch under the whole plot (beaten earth / paving) so the building sits in a yard, not on bare terrain
  bx(w+7,.6,dd+7,0,g+1,0,tlShade(R()<.5?'#a8997c':'#9b9078',.9+R()*.15));
  const ac=TL_ACC[(R()*TL_ACC.length)|0];
  if(mosque){col='#efe6d0';tlMosque(b,g,w,dd,col,shia,wall,bx,pt);return true;}
  // body: tall blocks step back on the upper floors
  let top;
  if(h>=20&&R()<.6){const h1=Math.round(h*.6/10)*10||10,sx=.74+R()*.12;wall(w,h1,dd,0,g,0,T);
    const ox=(R()-.5)*w*.12,oz=-(1-sx)*dd*.5*(R()<.5?1:-.4);wall(w*sx,h-h1,dd*sx,ox,g+h1,oz,T);
    // terrace on the lower roof: parapet along the front edge + a pergola
    bx(w,1.1,.7,0,g+h1+.55,dd/2-.35,col);bx(.7,1.1,dd,w/2-.35,g+h1+.55,0,col);bx(.7,1.1,dd,-w/2+.35,g+h1+.55,0,col);
    if(R()<.5){for(const s of[-1,1])bx(.5,3,.5,s*w*.3,g+h1+1.5,dd*.38,'#5a4a3a');bx(w*.7,.4,.5,0,g+h1+3.1,dd*.38,'#5a4a3a');}
    top=g+h;tlRoof(B,bx,cy,R,w*sx,dd*sx,top,ox,oz,col,low,true);}
  else{wall(w,h,dd,0,g,0,T);top=g+h;tlRoof(B,bx,cy,R,w,dd,top,0,0,col,low,false);}
  // plinth (grimy stone base), cornice under the roof
  bx(w+.5,1.6,dd+.5,0,g+1.3,0,tlShade(col,.62));
  bx(w+.9,.9,dd+.9,0,top-.7,0,tlShade(col,1.08));
  // arched door with frame and steps on the front (+z)
  const dx=(R()-.5)*w*.45;
  bx(3.4,4.2,.5,dx,g+3.1,dd/2+.15,tlShade(col,1.15));pt(TL.cyl,1.7,.5,1.7,dx,g+5.2,dd/2+.15,tlShade(col,1.15),Math.PI/2);
  bx(2.6,4.2,.6,dx,g+3.1,dd/2+.3,ac);pt(TL.cyl,1.3,.6,1.3,dx,g+5.2,dd/2+.3,ac,Math.PI/2);
  bx(4.6,.5,1.6,dx,g+1.3,dd/2+.9,'#bdb29a');
  // shop front with striped awning on the street side of bigger town blocks
  if(!small&&!b.ham&&b.core>.3&&R()<.55){const aw=TL_AWN[(R()*TL_AWN.length)|0],sw=w*.5,sx0=-w*.12;
    bx(sw,4.6,.5,sx0,g+3.4,dd/2+.2,'#2c2620');
    const ns=6;for(let k=0;k<ns;k++)bx(sw/ns,.28,2.8,sx0-sw/2+sw/ns*(k+.5),g+6.1,dd/2+1.5,aw[k&1],-.42);
    bx(sw*.8,1.3,.3,sx0,g+7.6,dd/2+.4,R()<.5?'#1f4f6a':'#6a1f1f');
    for(let k=0;k<3;k++)bx(1.6,1.2,1.2,sx0-sw*.3+k*sw*.3,g+1.8,dd/2+2.2,['#8a6a3c','#6a8a3c','#a8442f'][k]);}   // crates of goods
  // balcony on the upper floors
  if(h>=15&&R()<.65){const by=g+(h>=25&&R()<.5?20:10.2),bxx=(R()-.5)*w*.4;
    bx(7,.5,2.4,bxx,by,dd/2+1.2,tlShade(col,1.1));for(const s of[-1,0,1])bx(.3,1.2,.3,bxx+s*3.2,by+.9,dd/2+2.3,'#2c2c2a');bx(7,.25,.3,bxx,by+1.5,dd/2+2.3,'#2c2c2a');
    bx(3.2,4.4,.4,bxx,by+2.4,dd/2+.1,ac);}
  // wall-mounted AC units and a drain pipe on the sides/back
  {const n=(R()*3)|0;for(let k=0;k<n;k++){const wy=g+5+((R()*Math.max(1,Math.floor(h/10)))|0)*10;bx(2.2,1.5,1.2,(R()<.5?-1:1)*(w/2-3-R()*6),wy,-dd/2-.6,'#cfcfca');}
    if(R()<.7)cy(.25,h,w/2+.35,g+h/2,-dd/2+2,'#6f6f69',false);}
  // plot wall with a gate for the low houses, and a palm / garden
  if(low||b.ham){const wc=tlShade(col,.95);bx(w+5,1.9,.6,0,g+2,-dd/2-3.2,wc);bx(.6,1.9,dd+5,-w/2-3.2,g+2,0,wc);bx(.6,1.9,dd+5,w/2+3.2,g+2,0,wc);
    bx((w+5)*.35,1.9,.6,-(w+5)*.325,g+2,dd/2+3.2,wc);bx((w+5)*.35,1.9,.6,(w+5)*.325,g+2,dd/2+3.2,wc);bx(3.4,.5,.9,0,g+3.1,dd/2+3.2,wc);}
  if(b.style!=='yemen'&&R()<.45)tlPalm(B,X(w/2+1.5,dd/2+1),Z(w/2+1.5,dd/2+1),g+1.2,R);
  else if(R()<.4){tlPut(B,TL.sph,2.2,1.6,2.2,X(-w/2-.5,dd/2+1.5),g+2.2,Z(-w/2-.5,dd/2+1.5),'#5f7a3c');}
  return true;}
// flat roof: parapet (varied height), stair head, tank, dish, solar panels, rebar stubs for the unfinished next floor
function tlRoof(B,bx,cy,R,w,dd,top,ox,oz,col,low,stepped){
  const ph=.9+R()*1.3,pc=tlShade(col,1.06);
  bx(w+.4,ph,.8,ox,top+ph/2,oz+dd/2,pc);bx(w+.4,ph,.8,ox,top+ph/2,oz-dd/2,pc);bx(.8,ph,dd,ox-w/2,top+ph/2,oz,pc);bx(.8,ph,dd,ox+w/2,top+ph/2,oz,pc);
  const n=low?1:1+((R()*3)|0);
  for(let q=0;q<n;q++){const rx=ox+(R()-.5)*w*.55,rz=oz+(R()-.5)*dd*.55,k=R();
    if(k<.3){cy(1.6,2.4,rx,top+1.7,rz,R()<.5?'#e9e6df':'#26282b');bx(.3,1.2,.3,rx+1.2,top+.9,rz+1.2,'#555');}
    else if(k<.5)bx(5,3.2,5,rx,top+1.8,rz,col);                       // stair head
    else if(k<.65){bx(.3,3,.3,rx,top+1.6,rz,'#666');bx(2.4,.5,2.4,rx,top+3.4,rz,'#e4e4e0',-.7);}
    else if(k<.8){for(let s=0;s<2;s++)bx(3.4,.25,2.2,rx+s*3.8,top+1.2,rz,'#1f2f48',-.5);}  // solar panels
    else {for(const s of[[-1,-1],[1,-1],[-1,1],[1,1]])cy(.18,5,rx+s[0]*3,top+2.7,rz+s[1]*3,'#4d4742',false);bx(7,.3,7,rx,top+5.3,rz,'#55524c');}   // rebar stubs
  }
  if(!low&&R()<.25)cy(.1,7,ox-w*.3,top+3.5,oz+dd*.2,'#555',false);}
function tlPalm(B,x,z,g,R){const h=8+R()*5,lean=(R()-.5)*.25;tlPut(B,TL.cyl5,.5,h,.5,x,g+h/2,z,'#7b6244',0,lean,0);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+R()*.5;tlPut(B,TL.box,.5,.18,5.2,x+Math.sin(a)*2.4,g+h+.3,z+Math.cos(a)*2.4,k&1?'#4f7a35':'#5e8a3d',a,.5,0);}}
// the town mosque: prayer hall, drum + dome, arched iwan portal, courtyard wall, and two proper minarets with balcony and cap
function tlMosque(b,g,w,dd,col,shia,wall,bx,P){
  const hw=Math.min(w,dd)*.62,H=11,dc=shia?'#2a8c92':'#d8d0bb',gold='#c9a23a',cream='#efe6d0',dz=-dd*.08,tile=shia?'#2f7f86':'#d9cfb4';
  wall(hw*1.5,H,hw*1.2,0,g,dz,3);
  bx(hw*1.5+.9,.9,hw*1.2+.9,0,g+H-.5,dz,tlShade(cream,1.05));
  P(TL.cyl,hw*.42,3.4,hw*.42,0,g+H+1.7,dz,cream);P(TL.dome,hw*.5,hw*.5*1.12,hw*.5,0,g+H+3.4,dz,dc);
  P(TL.cyl5,.18,hw*.5,.18,0,g+H+3.4+hw*.56+1.6,dz,gold);P(TL.sph,.55,.55,.55,0,g+H+3.4+hw*.56+.4,dz,gold);
  for(const sx of[-1,1]){P(TL.dome,hw*.13,hw*.13,hw*.13,sx*hw*.66,g+H,dz+hw*.5,dc);P(TL.dome,hw*.13,hw*.13,hw*.13,sx*hw*.66,g+H,dz-hw*.5,dc);}
  // iwan portal on the front: tiled slab with an arched dark doorway
  const pz=dz+hw*.6+.3;bx(hw*.7,H+3,1.4,0,g+(H+3)/2,pz,tile);P(TL.cyl,hw*.35,1.4,hw*.35,0,g+H+3,pz,tile,Math.PI/2);
  bx(hw*.34,H*.5,1.6,0,g+H*.25+1.2,pz+.3,'#1d1a16');P(TL.cyl,hw*.17,1.6,hw*.17,0,g+H*.5+1.2,pz+.3,'#1d1a16',Math.PI/2);
  bx(hw*.5,.4,1.8,0,g+1.6,pz+1.4,'#bdb29a');
  bx(hw*2.1,.4,hw*1.6,0,g+1.2,dz+hw*.7,'#cfc6b0');   // courtyard paving
  for(const s of[-1,1]){const mx=s*hw*1.0,mz=dz+hw*.62,r0=1.9,Hm=H+19;
    bx(r0*2.6,4,r0*2.6,mx,g+2.6,mz,cream);
    P(TL.cyl,r0,Hm,r0*.8,mx,g+Hm/2+1,mz,cream);P(TL.cyl,r0*1.7,.7,r0*1.7,mx,g+Hm-4,mz,tlShade(cream,.9));
    P(TL.cyl,r0*1.55,.5,r0*1.55,mx,g+Hm-3.5,mz,dc);P(TL.cyl,r0*.72,5,r0*.66,mx,g+Hm-1,mz,cream);
    P(TL.dome,r0*1.1,r0*1.1,r0*1.1,mx,g+Hm+1.5,mz,dc);P(TL.cone,.35,4,.35,mx,g+Hm+4.5,mz,gold);
    P(TL.cyl,r0*1.4,.6,r0*1.4,mx,g+12.5,mz,tlShade(cream,.92));}
}
// streets of one town: asphalt carriageway, kerbs/pavement, junction patches, power poles and cables, a few parked cars and market stalls.
function tlStreets(B,c){const kind=TL_KIND[c.style]||'me';
  const M=G.map,sx=Math.floor(c.x/CELL),sy=Math.floor(c.y/CELL),Rn=Math.ceil(c.r/CELL),R=mulberry(((c.x*7+c.y*3)|0)+5),seg=CELL/2;
  const ok=(x,y)=>Math.hypot(x-c.x,y-c.y)<=c.r&&M.edge(x,y)<-50&&M.mtn(x,y)<-40;
  const strip=(x0,y0,x1,y1)=>{const gA=groundH(x0,y0),gB=groundH(x1,y1),mx=(x0+x1)/2,my=(y0+y1)/2,hor=Math.abs(x1-x0)>Math.abs(y1-y0),L=Math.hypot(x1-x0,y1-y0),sl=Math.atan2(gB-gA,L),yw=hor?0:Math.PI/2,ym=(gA+gB)/2;
    const asph=tlShade(R()<.35?'#4b4a47':kind==='me'?'#58554f':'#4a4d50',.9+R()*.3);
    tlPut(B,TL.box,L+.2,.5,CELL*.96,mx,ym+.2,my,tlShade('#8d8068',.85+R()*.2),yw,0,hor?sl:-sl);       // pavement / dirt shoulder
    tlPut(B,TL.box,L+.2,.6,CELL*.56,mx,ym+.3,my,asph,yw,0,hor?sl:-sl);                                   // carriageway
    if((x0*7+y0*3|0)%3===0)tlPut(B,TL.box,L*.6,.62,.35,mx,ym+.3,my,'#cfc7a8',yw,0,hor?sl:-sl);};       // centre dashes
  for(let k=-Rn;k<=Rn;k++){if(((k%4)+4)%4!==0)continue;
    for(let q=-Rn*2;q<Rn*2;q++){
      // horizontal street at row sy+k, running along x
      const hy=(sy+k)*CELL+CELL/2,hx0=(sx+q/2)*CELL+CELL/2,hx1=hx0+seg;if(ok((hx0+hx1)/2,hy))strip(hx0,hy,hx1,hy);
      const vx=(sx+k)*CELL+CELL/2,vy0=(sy+q/2)*CELL+CELL/2,vy1=vy0+seg;if(ok(vx,(vy0+vy1)/2))strip(vx,vy0,vx,vy1);}}
  // trees along the streets of green / snowy towns
  if(kind!=='me'){const snow=G.map.theme==='snow';for(let k=0;k<Rn*5;k++){const x=c.x+(R()-.5)*c.r*1.9,y=c.y+(R()-.5)*c.r*1.9,ls=((Math.round((x-sx*CELL)/CELL)%4)+4)%4,lt=((Math.round((y-sy*CELL)/CELL)%4)+4)%4;if(ok(x,y)&&(ls===0||lt===0)&&R()<.6)tlTree(B,x+CELL*.37,y,groundH(x,y),R,snow);}}
  // power poles + cables, parked cars, stalls
  const poles=[];
  for(let k=-Rn;k<=Rn;k++){if(((k%4)+4)%4!==0)continue;for(let q=-Rn;q<=Rn;q+=2){const hy=(sy+k)*CELL+CELL/2+CELL*.4,hx=(sx+q)*CELL+CELL/2;if(ok(hx,hy))poles.push([hx,hy,0]);
      const vx=(sx+k)*CELL+CELL/2+CELL*.4,vy=(sy+q)*CELL+CELL/2;if(ok(vx,vy))poles.push([vx,vy,1]);}}
  for(const [px,py,v] of poles){const g=groundH(px,py);tlPut(B,TL.cyl5,.28,10,.28,px,g+5,py,'#4a3d30');tlPut(B,TL.box,v?.25:3.2,.25,v?3.2:.25,px,g+9.6,py,'#3d3128');
    // cable to the next pole of the same direction
    const nx=v?px:px+CELL*2,ny=v?py+CELL*2:py;if(poles.some(p=>p[2]===v&&Math.abs(p[0]-nx)<1&&Math.abs(p[1]-ny)<1)){const g2=groundH(nx,ny),L=CELL*2;
      for(const o of[-1.2,1.2])tlPut(B,TL.box,v?.06:L,.06,v?L:.06,(px+nx)/2+(v?o:0),(g+g2)/2+9.1,(py+ny)/2+(v?0:o),'#1f1f1f',0,0,0);}}
  const nc=c.prize?7:4;for(let k=0;k<nc;k++){const q=((R()*Rn*2)|0)-Rn,line=(((R()*3)|0)-1)*4,hor=R()<.5,x=hor?(sx+q)*CELL+CELL/2:(sx+line)*CELL+CELL/2+(R()<.5?-1:1)*CELL*.18,y=hor?(sy+line)*CELL+CELL/2+(R()<.5?-1:1)*CELL*.18:(sy+q)*CELL+CELL/2;
    if(!ok(x,y))continue;const g=groundH(x,y),yw=hor?0:Math.PI/2,cc=['#d9d9d6','#2c2f33','#7a2a26','#6e7a82','#b9a77a'][(R()*5)|0];
    tlPut(B,TL.box,4.6,1.1,2,x,g+1.3,y,cc,yw);tlPut(B,TL.box,2.4,.9,1.8,x-.2*(hor?1:0),g+2.2,y-.2*(hor?0:1),tlShade(cc,.8),yw);tlPut(B,TL.box,4.2,.5,2.2,x,g+.8,y,'#16161a',yw);}
  // market stalls in the heart of the town
  for(let k=0;k<(kind!=='me'?0:c.prize?6:3);k++){const x=c.x+(R()-.5)*CELL*3,y=c.y+(R()-.5)*CELL*3;if(!ok(x,y))continue;const g=groundH(x,y),aw=TL_AWN[(R()*TL_AWN.length)|0];
    for(const [dx,dz] of[[-1.6,-1.2],[1.6,-1.2],[-1.6,1.2],[1.6,1.2]])tlPut(B,TL.cyl5,.12,3,.12,x+dx,g+2.1,y+dz,'#5a4a3a');
    tlPut(B,TL.box,4,.2,3.2,x,g+3.7,y,aw[k&1],0,.1);tlPut(B,TL.box,3.4,1,1.2,x,g+1.5,y,'#8a6a3c');tlPut(B,TL.sph,.7,.5,.7,x-.8,g+2.2,y,['#c6422b','#d9a21b','#5f8a3c'][k%3]);}
}
// map-wide: pick one mosque per non-hamlet town (the biggest building nearest the centre) - returns Set of building indices
function tlMosques(){return [];const out=new Set(),M=G.map;if(!M.cities)return out;
  for(const c of M.cities){if(c.ham||!TL_ME[c.style])continue;let bi=-1,bs=1e18;M.cityBlds.forEach((b,i)=>{if(b.w<26||b.h>34)return;const d=Math.hypot(b.x-c.x,b.y-c.y);if(d>c.r*.7)return;const s=d+(b.h>20?60:0);if(s<bs){bs=s;bi=i;}});if(bi>=0)out.add(bi);}
  return out;}

// ---- stage 2: Europe / snow-country / Korea & East-Asia towns ------------------------------------------------------------
const TL_KIND={mideast:'me',lebanon:'me',yemen:'me',southasia:'me',europe:'eu',russia:'eu',korea:'as',asia:'as',japan:'as'};
const TL_TILE=['#9a4632','#7d3a2c','#a65a3a','#6a4a3a','#4d5560'],TL_PLEU=['#efe6d2','#e2d2b4','#d8c8a8','#f2ead8','#cfc3a6','#b9a98c'];
// pitched roof: two tilted slabs with eaves + a wall-coloured gable-end prism. Ridge along the longer side. snow = white cap.
function tlGable(pt,w,dd,top,rh,tile,wall,snow){const rz=dd>w*1.12,L=rz?dd:w,Wd=rz?w:dd,half=Wd/2+.9,a=Math.atan(rh/half),sw=half/Math.cos(a)+.15,off=half/2,y=top+(rh-.3)/2,ry=rz?Math.PI/2:0;
  pt(TL.gable,L,rh,Wd,0,top,0,wall,0,0,ry);
  for(const s of[-1,1]){pt(TL.box,L+1.6,.5,sw,rz?s*off:0,y,rz?0:s*off,tile,s*a,0,ry);if(snow)pt(TL.box,L+1.3,.55,sw*.97,rz?s*off:0,y+.42,rz?0:s*off,'#eef2f6',s*a,0,ry);}
  return rz;}
function tlTree(B,x,z,g,R,conifer){if(conifer){const h=9+R()*5;tlPut(B,TL.cyl5,.4,3,.4,x,g+1.5,z,'#4a3a2a');tlPut(B,TL.cone,3.2,h*.8,3.2,x,g+h*.4+2,z,'#2f4a3a');}
  else{const h=5+R()*3;tlPut(B,TL.cyl5,.45,h,.45,x,g+h/2,z,'#5a4630');tlPut(B,TL.sph,3.6,3,3.6,x,g+h+1.5,z,R()<.5?'#5a7a3a':'#6b8a45');}}
function tlOtherBuilding(B,W,BT,b,P,g,church,kind){
  const k=TL_KIND[b.style],snow=b.style==='russia'||G.map.theme==='snow';
  if(k==='eu'&&b.h>24)return false;                      // tall Soviet blocks keep the old look for now
  const R=mulberry(((b.x*13)^(b.y*7))|0),f=(R()*4)|0,yaw=(R()-.5)*.12+f*Math.PI/2,w=b.w*.94,dd=b.d*.94,h=b.h;
  const cs=Math.cos(yaw),sn=Math.sin(yaw),X=(lx,lz)=>b.x+lx*cs+lz*sn,Z=(lx,lz)=>b.y-lx*sn+lz*cs;
  const pt=(g_,sx,sy,sz,lx,y,lz,c,tilt=0,roll=0,ry=0)=>tlPut(B,g_,sx,sy,sz,X(lx,lz),y,Z(lx,lz),c,yaw+ry,tilt,roll),bx=(sw,sh,sd,lx,y,lz,c,tilt=0)=>pt(TL.box,sw,sh,sd,lx,y,lz,c,tilt);
  let col=P[Math.floor(b.v*P.length)%P.length];if(k==='eu')col=TL_PLEU[(R()*TL_PLEU.length)|0];
  const wall=(ww,hh,dd_,lx,yb,lz,type)=>{W.box(ww,hh,dd_,X(lx,lz),yb+hh/2,Z(lx,lz),col,0,yaw,0);BT.push([yb+1,yb+hh,type,b.v]);};
  bx(w+6,.6,dd+6,0,g+1,0,tlShade(snow?'#d9dde0':k==='eu'?'#7d8a5a':'#9b9078',.92+R()*.12));       // plot: lawn / snow / paving
  if(church){col='#e6dcc4';const nw=w*.62;wall(nw,12,dd*.92,0,g,0,0);BT[BT.length-1][3]=.2;tlGable(pt,nw,dd*.92,g+12,8,'#6b7682',col,snow);
    const tz=dd*.5+3;wall(8,h+14,8,0,g,tz,1);bx(9,.8,9,0,g+h+14.4,tz,tlShade(col,.9));bx(5,5,5,0,g+h+17,tz,col);
    pt(TL.cone4,5.8,15,5.8,0,g+h+22,tz,'#4d5a52',0,0,Math.PI/4);pt(TL.sph,.7,.7,.7,0,g+h+30.2,tz,'#c9a23a');bx(.3,2.6,.3,0,g+h+32,tz,'#c9a23a');bx(1.6,.3,.3,0,g+h+32.4,tz,'#c9a23a');
    bx(3,3,.4,0,g+h+9,tz+4.1,'#f4f0e2');bx(3.6,5.5,.4,0,g+3.2,tz+4.1,'#3a2c20');return true;}
  if(k==='eu'){
    wall(w,h,dd,0,g,0,2);bx(w+.4,1.4,dd+.4,0,g+1.4,0,tlShade(col,.6));                     // stone plinth
    const rh=Math.max(4.5,Math.min(w,dd)*(snow?.5:.38)),tile=snow?'#5a4a44':TL_TILE[(R()*TL_TILE.length)|0];
    const rz=tlGable(pt,w,dd,g+h,rh,tile,col,snow);
    // eave gutters, chimney, porch canopy over the door, garden fence, trees
    bx(w+1.8,.3,.3,0,g+h-.2,dd/2+.9,'#3a3a38');
    const cx=(R()-.5)*(rz?w:w)*.5;bx(1.8,rh*.7+3,1.8,cx,g+h+rh*.35+1.5,rz?0:0,'#8a4b3a');
    const dx=(R()-.5)*w*.4;bx(4.2,.4,2.2,dx,g+6.2,dd/2+1.2,tile);bx(.3,5,.3,dx-1.8,g+3.7,dd/2+2.1,'#5a4a3a');bx(.3,5,.3,dx+1.8,g+3.7,dd/2+2.1,'#5a4a3a');bx(2.6,4.6,.4,dx,g+3.3,dd/2+.25,TL_ACC[(R()*TL_ACC.length)|0]);
    if(b.h<14){const fc=snow?'#e8e4da':'#e4dccb';bx(w+4,1.2,.3,0,g+1.9,-dd/2-2.6,fc);bx(.3,1.2,dd+4,-w/2-2,g+1.9,0,fc);bx(.3,1.2,dd+4,w/2+2,g+1.9,0,fc);bx((w+4)*.3,1.2,.3,-(w+4)*.35,g+1.9,dd/2+2.6,fc);bx((w+4)*.3,1.2,.3,(w+4)*.35,g+1.9,dd/2+2.6,fc);}
    if(R()<.6)tlTree(B,X(w/2+2.5,dd/2-1),Z(w/2+2.5,dd/2-1),g+1,R,snow);
    return true;}
  // Korea / East Asia: low houses get a grey tile roof, taller blocks get roof clutter and ground-floor signs
  wall(w,h,dd,0,g,0,0);bx(w+.4,1.4,dd+.4,0,g+1.3,0,tlShade(col,.6));
  if(h<26){const sq=Math.abs(w-dd)<5,tile=b.style==='korea'||b.style==='japan'?'#4d5a66':'#5a4a44';
    if(sq){bx(w+2.4,.6,dd+2.4,0,g+h+.3,0,tile);pt(TL.cone4,(w+1.6)/1.414,Math.min(w,dd)*.34,(dd+1.6)/1.414,0,g+h+Math.min(w,dd)*.17+.6,0,tile,0,0,Math.PI/4);}
    else tlGable(pt,w,dd,g+h,Math.min(w,dd)*.3,tile,col,snow);}
  else{const top=g+h;bx(w+.4,1.3,.8,0,top+.65,dd/2,col);bx(w+.4,1.3,.8,0,top+.65,-dd/2,col);bx(.8,1.3,dd,-w/2,top+.65,0,col);bx(.8,1.3,dd,w/2,top+.65,0,col);
    const n=1+((R()*3)|0);for(let q=0;q<n;q++){const rx=(R()-.5)*w*.6,rz2=(R()-.5)*dd*.6,kk=R();if(kk<.4){pt(TL.cyl,1.7,2.6,1.7,rx,top+1.8,rz2,'#e9e6df');}else if(kk<.7)bx(3,2,2.4,rx,top+1.6,rz2,'#c9c9c4');else{bx(.25,6,.25,rx,top+3.3,rz2,'#666');bx(3,.2,.2,rx,top+5.5,rz2,'#666');}}
    for(let q=0;q<3;q++)bx(w*.22,2.4,.5,-w*.3+q*w*.3,g+3.6,dd/2+.3,['#d94a3a','#2f6fb0','#e8b82a','#3a9a5a'][(R()*4)|0]);}   // shop signs
  if(R()<.5)tlTree(B,X(w/2+2,dd/2),Z(w/2+2,dd/2),g+1,R,false);
  return true;}
function tlLandmarks(){const out=new Map(),M=G.map;if(!M.cities)return out;
  for(const c of M.cities){const k=TL_KIND[c.style];if(c.ham||!k)continue;let bi=-1,bs=1e18;M.cityBlds.forEach((b,i)=>{if(b.w<26||b.h>(k==='me'?34:24)||out.has(i))return;const d=Math.hypot(b.x-c.x,b.y-c.y);if(d>c.r*.7)return;const s=d+(b.h>20?60:0);if(s<bs){bs=s;bi=i;}});if(bi>=0)out.set(bi,k==='me'?'mosque':k==='eu'?'church':'');}
  return out;}

// towns as chunks: every building belongs to its nearest town / hamlet centre (cached per map)
function tlChunks(){const M=G.map;if(M._tlCk)return M._tlCk;const cs=M.cities||[],m=new Map();
  M.cityBlds.forEach((b,bi)=>{let k=-1,bd=1e18;cs.forEach((c,i)=>{const d=Math.hypot(b.x-c.x,b.y-c.y)/(c.r+CELL);if(d<bd){bd=d;k=i;}});if(bd>1.6)k=-1;const hk=k>=0&&cs[k].ham?'h':k;if(!m.has(hk))m.set(hk,{key:hk,city:hk==='h'?null:cs[k]||null,items:[]});m.get(hk).items.push([bi,b]);});   // all hamlets share one small chunk
  return M._tlCk=[...m.values()];}

/* ===== power plant model (Infrastructure): turbine hall, two striped stacks, a cooling tower, a transformer yard with pylons and a fence.
   Owner colour shows on the flag. Same builder API as the oil derrick (Bld/mesh). ===== */

/* Capturable buildings of Battle: Quarry, Mine, Field Hospital (the Power plant reuses plantObj). Each one merged mesh (Bld) + an owner flag.
   Look only; effects are in 03-sim.js (TB). Real-world detail: stepped rock faces, crusher + conveyor, headframe + wheel, canvas tents. */
function techObj(o){const k=o.tb;if(k==='plant'){const r=plantObj(o);r.tb=1;return r;}
  const grp=new THREE.Group(),B=Bld(),dk='#2c2e2c',tent='#9c9468',red='#b3322a',wh='#f1ede2',rk='#c2ad82',rk2='#a8946b',rk3='#8a7a58',gv='#a39b86';
  if(k==='hosp'){
    B.box(70,1.6,50,0,.8,0,'#8a8474');                                                                            // packed-earth pad
    for(const z of [-9,12]){B.box(28,8,14,-8,5,z,tent);B.cyl(7.4,7.4,28,3,-8,12.6,z,tent,0,0,Math.PI/2);B.box(.8,6,6,-22.4,4.5,z,'#5a5648');B.box(28,.8,.8,-8,9.4,z+7.2,'#8a846f');
      for(const q of [7.3,-7.3]){B.box(9,6.4,.3,-8,6.4,z+q,wh);B.box(1.8,5,.4,-8,6.4,z+q*1.01,red);B.box(5,1.8,.4,-8,6.4,z+q*1.01,red);}}              // two long canvas tents with a red cross panel each
    B.box(14,8,10,22,5,-6,'#d9d6cc');B.box(14,1.2,11,22,9.6,-6,'#a6a39a');B.box(3,5,.8,22,3.5,-.9,'#5d7380');B.box(1.2,3.4,.4,22,6,-.7,red);B.box(3.4,1.2,.4,22,6,-.7,red);   // prefab ward with a window and a cross
    B.box(1.4,22,1.4,-30,11,-18,'#55595c');B.box(12,8,.8,-30,21,-18,wh);B.box(2.4,6.4,.9,-30,21,-17.5,red);B.box(6.4,2.4,.9,-30,21,-17.5,red);   // tall sign board with a red cross (neutral)
    B.box(16,3.2,7,10,3.4,19,'#e9e7df');B.box(6,3.4,6.6,15,6.6,19,'#d8d6ce');B.box(.8,2.4,.9,9,5.6,22.6,red);B.box(2.4,.8,.9,9,5.6,22.6,red);for(const x of [6,14])B.cyl(1.5,1.5,1.2,10,x,1.5,22.6,dk,Math.PI/2),B.cyl(1.5,1.5,1.2,10,x,1.5,15.4,dk,Math.PI/2);   // ambulance
    B.box(3,.8,6.4,-24,2.2,-1,'#6a7360');B.box(.6,1.2,6.4,-22.6,1.8,-1,'#4b5246');B.box(3,.8,6.4,-20,2.2,-1,'#6a7360');   // stretchers
    B.box(7,5,5,-26,4,26,'#5f6b4f');B.box(5,1,5,-26,6.8,26,dk);B.cyl(.6,.6,5,6,-24,8.8,27,'#55595c');B.cyl(2.8,2.8,2,10,-12,3,26,'#6d6f6c');   // generator and fuel drum
    for(let i=0;i<5;i++)B.box(2.6,1.8,2.6,26+i*3.2,2.5,24,'#7d8a6b');for(let i=0;i<3;i++)B.box(2.6,1.8,2.6,28+i*3.2,4.3,24,'#8b9677');   // supply crates
    for(const sx of [-34,34])B.box(.5,3,48,sx,2,0,'#6a6658');
  }else if(k==='quarry'){
    B.box(84,1.4,70,0,.5,0,gv);                                                                                      // gravel floor
    for(let t=0;t<4;t++){const y=3.5+t*7,w=60-t*8,d=14-t*1.2;B.box(w,7,d,-4-t*3,y,-26+t*3,t%2?rk:rk2);B.box(w-2,.9,d+.6,-4-t*3,y+3.7,-26+t*3,'#b8b09a');}   // stepped cut rock faces (benches)
    for(const x of [-26,-12,6,22])B.box(2.4,2.4,6,x,4.6,-18,rk3,.3,x*.1,.2);                                          // boulders at the toe of the face
    B.box(14,7,12,-20,4.5,10,'#8a8f86');B.box(10,10,8,-20,12,10,'#7f847b');B.box(12,2,10,-20,18,10,'#6c7068');   // crusher hall on a platform
    B.box(24,1.2,3,-4,7,10,dk,0,0,-.28);B.box(24,.6,3.6,-4,7.2,10,'#55595c',0,0,-.28);                              // conveyor belt, rising
    for(const x of [-10,0,8])B.box(.8,7,.8,x,3.5,10,'#55595c');
    for(const [x,z,h] of [[16,6,10],[22,8,7],[26,2,5]]){B.cyl(.4,h*.9,h,10,x,h/2+1,z,'#a39c88');}                    // conical stone piles
    B.box(10,4,6,28,4.2,-6,'#c9a227');B.box(5,3.4,5.6,31,7.2,-6,'#d9b43a');B.cyl(1.6,1.6,1,10,25,2.4,-3,dk,Math.PI/2);B.cyl(1.6,1.6,1,10,31,2.4,-3,dk,Math.PI/2);B.cyl(1.6,1.6,1,10,25,2.4,-9,dk,Math.PI/2);B.cyl(1.6,1.6,1,10,31,2.4,-9,dk,Math.PI/2);   // dump truck
    B.box(10,2,5,-4,2.5,-6,'#c9a227');B.box(5,.8,.8,2,6,-6,'#55595c',0,0,.7);B.box(3,1.6,2,6,7.6,-6,'#55595c');       // excavator
    B.box(8,4,5,-34,3.8,24,'#8d8a80');B.box(8.6,.9,5.6,-34,6.2,24,'#6f6c63');                                          // site cabin
    B.box(1.4,20,1.4,-36,10,-30,'#55595c');
  }else{
    B.box(76,1.4,66,0,.5,0,'#6f6a5c');                                                                                // trampled spoil ground
    B.box(1.8,36,1.8,-8,18,-4,'#4b5056',0,0,.18);B.box(1.8,36,1.8,-2,18,-4,'#4b5056',0,0,-.18);B.box(1.8,36,1.8,-8,18,4,'#4b5056',0,0,.18);B.box(1.8,36,1.8,-2,18,4,'#4b5056',0,0,-.18);   // headframe legs
    for(const y of [8,16,24])B.box(8,.8,.8,-5,y,-4,'#4b5056'),B.box(8,.8,.8,-5,y,4,'#4b5056');B.box(7,1.4,10,-5,36.5,0,'#3e4246');
    B.cyl(5.6,5.6,1.4,18,-5,38,-3,'#b7421f',Math.PI/2);B.cyl(5.6,5.6,1.4,18,-5,38,3,'#b7421f',Math.PI/2);B.cyl(1.3,1.3,8,8,-5,38,0,dk,Math.PI/2);   // two winding wheels
    B.box(14,8,12,-24,5,-2,'#8a8f86');B.box(15,1.2,13,-24,9.6,-2,'#6c7068');B.box(3,5,.8,-24,3.5,4.2,dk);                // winding house
    B.box(10,9,9,10,6,-14,'#7c7870');B.box(12,2,11,10,11.6,-14,'#686459');B.box(5,3,5,10,2.6,-6,'#5a5648');             // ore hopper and chute
    B.cyl(.4,14,13,12,24,7,-6,'#4a4640');B.cyl(.4,10,9,12,32,5,-12,'#524e44');B.cyl(.4,8,7,12,16,4,-24,'#46423a');     // spoil heaps (dark, steep)
    B.box(34,.5,.8,6,1.7,20,'#55595c');B.box(34,.5,.8,6,1.7,23,'#55595c');for(let x=-10;x<=22;x+=4)B.box(.8,.4,5,x,1.4,21.5,'#5a5348');   // rail track
    B.box(5,2.4,3.2,4,3.2,21.5,'#8c4a2a');B.box(5,2.4,3.2,12,3.2,21.5,'#8c4a2a');B.box(5,2.4,3.2,20,3.2,21.5,'#7a3e22');                  // ore carts
    for(const x of [2,6,10,14,18,22])B.cyl(.7,.7,.5,8,x,1.9,19.3,dk,Math.PI/2);
    B.box(.6,18,.6,-36,9,-30,'#55595c');B.box(5,2.2,3.6,-30,3.2,24,'#6a6a5a');B.box(3,2,3,-26,3,28,'#7d8a6b');
  }
  const base=mesh(B.geo());grp.add(base);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshBasicMaterial({color:0x888888,side:THREE.DoubleSide}));flag.position.set(-36,24,k==='quarry'?-26:-28);grp.add(flag);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,26,6),MAT.std);pole.position.set(-41,13,k==='quarry'?-26:-28);grp.add(pole);
  grp.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
  grp.scale.setScalar(1.55);grp.position.set(o.x,groundH(o.x,o.y),o.y);grp.rotation.y=(o.x*.01)%6;WORLD.add(grp);return{grp,arm:null,flag,crank:null,tb:1};}
function plantObj(o){const grp=new THREE.Group(),B=Bld(),cn='#9a978d',cd='#6f6c63',dk='#2c2e2c',st='#b8b5aa';
  B.box(64,2,50,0,1,0,'#7c796f');                                   // slab
  B.box(40,15,22,-6,9.5,-6,cn);B.box(40,1.6,23,-6,17.8,-6,cd);B.box(40,3,.8,-6,12,5.1,'#5d7380');B.box(8,10,.8,-20,6,5.1,dk);   // turbine hall, roof lip, window band, door
  B.box(14,7,12,-24,5,12,'#8d8a80');B.box(10,5,8,-4,4,13,'#8d8a80');   // boiler annexes
  for(const x of [10,18]){B.cyl(2.1,2.6,36,12,x,19,-16,'#cfcac0');B.cyl(2.3,2.3,3,12,x,34,-16,'#a43a2c');B.cyl(2.2,2.2,3,12,x,28,-16,'#f1ece0');}   // stacks with red/white bands
  B.cyl(7.5,10.5,24,18,-24,13,-18,'#b3b0a6');B.cyl(7.6,7.6,1.4,18,-24,25.5,-18,'#8a877d');                                                   // cooling tower
  for(const z of [14,19,24]){B.box(4,5,4,18+((z*7)%5),3.5,z-12,dk);B.box(.8,6,.8,22,6,z-12,'#55595c');}   // transformers
  for(const x of [26,-30]){B.box(1.2,30,1.2,x,15,22,'#55595c',0,0,.16);B.box(1.2,30,1.2,x,15,26,'#55595c',0,0,-.16);B.box(1.4,1.4,10,x,26,24,'#55595c');B.box(1.4,1.4,10,x,22,24,'#55595c');}
  for(const sx of [-31,31])B.box(.5,4,48,sx,2,0,'#44484b');for(const sz of [-24,24])B.box(62,4,.5,0,2,sz,'#44484b');   // fence
  const base=mesh(B.geo());grp.add(base);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshBasicMaterial({color:0x888888,side:THREE.DoubleSide}));flag.position.set(-36,22,-28);grp.add(flag);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,24,6),MAT.std);pole.position.set(-41,12,-28);grp.add(pole);
  grp.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
  grp.scale.setScalar(1.6);grp.position.set(o.x,groundH(o.x,o.y),o.y);grp.rotation.y=(o.x*.01)%6;WORLD.add(grp);return{grp,arm:null,flag,crank:null,pw:1};}
