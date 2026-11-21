/* art-bld: base-building FAMILY look for non-Shia nations (view only). One code-built kit per family, merged into ONE mesh per building on the shared
   standard material (vertex colours, no new shader program): T-wall blast barriers with an entrance gap, sandbag corner posts, generator + AC
   condensers, an antenna mast with guy wires, a floodlight pole, fuel drums, dust drifts at the wall feet. Built once per family/kind/size and shared.
   Family paint: West concrete + olive/tan, East grey-green concrete + red-star-free plain steel, Regional sand concrete. Shia compounds are art-shia's (meRoofKit). */
const BFAM={US:'W',GB:'W',FR:'W',DE:'W',IL:'W',UA:'W',RU:'R',CN:'R',KP:'R',SA:'G',AE:'G',TR:'G',EG:'G',PK:'G'},BFON={G:1},   // lane C: only Regional (G) is on in this branch; West and East land on their own
 
  BFP={G:{c:'#b8a47c',c2:'#c9b78e',b:'#c2b08a',m:'#5a5a52',d:'#2a2b29',u:'#c4b284',g:'#6d6a52',h:'#a89a6a',a:'#34382f',w:'#dedacb'},R:{c:'#7a8172',c2:'#8c9284',b:'#1c1d1b',m:'#4b5046',d:'#252725',u:'#a79877',g:'#54603f',n:'#4d5a3a',n2:'#6b6446',r:'#a3262a',w:'#d9d6c8'},W:{c:'#8d8c85',c2:'#a3a29a',b:'#a89b77',m:'#5b615e',d:'#2a2c2b',u:'#b3a584',g:'#52584a'}};
const BFGEO={};
// national flags as flat coloured blocks (vertex colours, no texture): rects [x,y,w,h,col] and discs ['o',cx,cy,r,col] in 0..1 cloth space (y up)
const BFFLG={RU:[[0,.667,1,.333,'#e6e6e2'],[0,.333,1,.334,'#2a4fa0'],[0,0,1,.333,'#c0332b']],
  CN:[[0,0,1,1,'#c8202a'],['o',.17,.74,.12,'#f2d230'],['o',.34,.86,.04,'#f2d230'],['o',.4,.74,.04,'#f2d230'],['o',.4,.6,.04,'#f2d230'],['o',.34,.5,.04,'#f2d230']],
  KP:[[0,.83,1,.17,'#2a4a9c'],[0,.79,1,.04,'#e6e6e2'],[0,.21,1,.58,'#bf2a30'],[0,.17,1,.04,'#e6e6e2'],[0,0,1,.17,'#2a4a9c'],['o',.33,.5,.2,'#e6e6e2'],['o',.33,.5,.12,'#bf2a30']],
  SA:[[0,0,1,1,'#1f7a3c'],[.18,.3,.64,.07,'#e6e6e2'],[.22,.52,.56,.05,'#e6e6e2']],
  AE:[[0,0,.25,1,'#c0222b'],[.25,.667,.75,.333,'#1f7a3c'],[.25,.333,.75,.334,'#e6e6e2'],[.25,0,.75,.333,'#202020']],
  TR:[[0,0,1,1,'#c8202a'],['o',.38,.5,.26,'#e6e6e2'],['o',.44,.5,.21,'#c8202a'],['o',.62,.5,.07,'#e6e6e2']],
  EG:[[0,.667,1,.333,'#c0222b'],[0,.333,1,.334,'#e6e6e2'],[0,0,1,.333,'#202020'],['o',.5,.5,.1,'#c9a43a']],
  PK:[[0,0,1,1,'#1d6b3a'],[0,0,.25,1,'#e6e6e2'],['o',.62,.5,.24,'#e6e6e2'],['o',.68,.52,.2,'#1d6b3a'],['o',.78,.62,.06,'#e6e6e2']]};
function bfFlag(B,x,z,fac,H,ry){const pc='#3b3b36',W=10,Hh=6.2,r=BFFLG[fac];B.cyl(.28,.4,H,6,x,H/2,z,pc);B.sph(.6,x,H+.4,z,'#b8953c');if(!r)return;
  const cx=x+Math.cos(ry||0)*(W/2+.5),cz=z-Math.sin(ry||0)*(W/2+.5),y0=H-Hh-.6;
  for(const q of r){if(q[0]==='o'){const a=q[1]-.5,dx=a*W*Math.cos(ry||0),dz=-a*W*Math.sin(ry||0);B.cyl(q[3]*Hh,q[3]*Hh,.32,10,cx+dx,y0+q[2]*Hh,cz+dz,q[4],Math.PI/2,ry||0,0);}
    else{const a=q[0]+q[2]/2-.5,dx=a*W*Math.cos(ry||0),dz=-a*W*Math.sin(ry||0);B.box(q[2]*W,q[3]*Hh,.22,cx+dx,y0+(q[1]+q[3]/2)*Hh,cz+dz,q[4],0,ry||0);}}}
// East: Soviet-style precast concrete fence with barbed wire, stacked tyres, camo-net lean-to, guyed radio mast, flag, red board (no slogans)
function bfamEast(B,P,R,h,size,kind,fac){
  const panel=(x,z,ry)=>{const c=Math.cos(ry),s=Math.sin(ry);B.box(6.6,5.4,.8,x,2.9,z,R()<.5?P.c:P.c2,0,ry);B.box(6.8,.5,1.1,x,5.8,z,P.c2,0,ry);
    for(const q of [-2.2,2.2])B.box(.5,4.6,.3,x+c*q,2.9,z-s*q+.3*c,P.m,0,ry);B.box(.9,6.8,1.1,x+c*3.4,3.4,z-s*3.4,P.c2,0,ry);
    for(const q of [-2.6,2.6])B.box(.14,1.4,.14,x+c*q,6.8,z-s*q,P.d,0,ry);   // wire arms
    for(const y of [6.9,7.5])B.box(6.8,.1,.1,x,y,z-.35*Math.abs(c)*0,P.d,0,ry);B.box(6.6,.1,.1,x,7.2,z,P.d,0,ry,.45);};
  const zf=h+11,nf=Math.max(3,Math.round(h/6.8));for(let i=0;i<nf;i++){const x=6.5+i*7;if(x>h+9)break;panel(x,zf,0);panel(-x,zf,0);}
  if(kind!=='depot')for(let i=0;i<Math.round(nf*.7);i++)panel(-h-11,-h*.5+i*7,Math.PI/2);
  // gate posts with a swing barrier arm and red/white bar
  for(const sx of [-1,1])B.box(1.2,7.4,1.2,sx*5.2,3.7,zf,P.m);B.box(10,.6,.6,0,5.6,zf,P.r);for(let i=0;i<5;i++)B.box(1,.62,.64,-4+i*2,5.6,zf,P.w);
  // stacked tyres (low, painted white edge) inside the gate
  const tyre=(x,z,n)=>{for(let k=0;k<n;k++)B.cyl(1.35,1.35,.95,7,x,.5+k*.95,z,k%3?P.b:'#2a2b28');};
  for(const [x,z,n] of [[-9,zf-4,3],[-11.4,zf-4.4,2],[-9.4,zf-6,2],[9.6,zf-4,3],[11.8,zf-3.6,2]])tyre(x,z,n);
  // camo-net lean-to over the flank yard: four poles, sagging net of patchy rectangles
  const nx=h+9,nz=h*.2,ny=9.5;for(const a of [[-6,-7],[6,-7],[-6,7],[6,7]])B.cyl(.3,.3,ny+(a[1]>0?-1.6:0)+.6,5,nx+a[0],(ny+(a[1]>0?-1.6:0))/2,nz+a[1],P.m);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)B.box(4.3,.25,4.9,nx-4.3+i*4.3,ny-j*.6+.1,nz-5.2+j*4.9,(i+j)%3===0?P.n2:P.n,0,0,.12);
  // vehicle shadow under the net: ammo crates + generator
  B.box(5,3,3,nx-2,1.5,nz+1,P.g);B.box(5.2,.4,3.2,nx-2,3.1,nz+1,P.d);for(let i=0;i<3;i++)B.box(2.4,1.5,1.6,nx+3,.8+(i>1?1.5:0),nz-3+i%2*2.2,'#5b5c3e');
  // guyed radio mast: lattice pole, whips, yagi, guy wires, red lamp
  const mx=-h-9,mz=-h-9;B.cyl(.35,.5,36,6,mx,18,mz,P.m);for(let y=6;y<34;y+=8)B.box(5,.2,.2,mx,y,mz,P.m);
  for(const a of [[-1.8,0],[1.8,0],[0,1.8]])B.cyl(.07,.07,16,4,mx+a[0]*2.5,36+4,mz+a[1]*2.5,P.d);
  B.box(.2,.2,5.5,mx,28,mz+1.5,P.m);for(let i=-2;i<=2;i++)B.box(.14,2.8-Math.abs(i)*.3,.14,mx+i*.1,28,mz+i*1,P.m);B.sph(.5,mx,36.4,mz,'#c0392b');
  for(const a of [[1,0],[-1,0],[0,1],[0,-1]])B.box(.1,.1,19,mx+a[0]*7.5,15,mz+a[1]*7.5,P.d,a[1]?Math.atan2(15,7.5)*(a[1]>0?-1:1):0,0,a[0]?Math.atan2(15,7.5)*(a[0]>0?1:-1):0);
  // flag on a tall pole by the gate, and a red board on two posts (colour blocks only)
  if(kind==='hq')bfFlag(B,-17,zf+3,fac,26,0.2);
  const bx=15,bz=zf+3;B.box(.5,6,.5,bx-3.2,3,bz,P.m);B.box(.5,6,.5,bx+3.2,3,bz,P.m);B.box(7.6,4,.4,bx,7.6,bz,P.r);B.box(7.2,.7,.45,bx,8.6,bz,P.w);B.box(7.2,.7,.45,bx,6.6,bz,P.w);B.box(1.3,1.3,.5,bx,7.6,bz,'#e0c33a',0,0,Math.PI/4);
  // fuel drums by the net, dust drifts and worn-paint chips at the wall feet
  for(let i=0;i<3;i++){B.cyl(1.05,1.05,3.2,7,h+17+(i>1?1.2:i*2.3),1.6,-h*.5+(i>1?2:0),i===1?'#5d3a2a':P.g);B.cyl(1.08,1.08,.3,7,h+17+(i>1?1.2:i*2.3),2.9,-h*.5+(i>1?2:0),P.d);}
  for(let i=0;i<8;i++){const x=-h+R()*h*2,z=zf+(R()<.5?-1.6:1.8);B.rock(4+R()*6,.9,2.2,x,.15,z,P.u,0,R()*3,0,i);}
  return B.geo();}
// Regional (light: shared shape, few parts, no shadow casting): sand concrete wall with crenellated top and blind arches, HESCO bastion line, AC units, satellite dish, HQ flag
function bfamReg(B,P,R,h,size,kind,fac){
  const wall=(x,z,ry)=>{const c=Math.cos(ry),s=Math.sin(ry);B.box(7,5.2,1.2,x,2.7,z,R()<.5?P.c:P.c2,0,ry);B.box(7.2,.5,1.5,x,5.5,z,P.c2,0,ry);
    for(const q of [-2.4,0,2.4])B.box(1.6,1.1,1.2,x+c*q,6.3,z-s*q,P.c,0,ry);   // crenellations
    B.box(1.3,2.2,.3,x+s*.7,2.6,z+c*.7,P.a,0,ry);B.half(.65,.3,x+s*.7,3.7,z+c*.7,P.a,ry+Math.PI/2);};
  const zf=h+11,nf=Math.max(3,Math.round(h/7));for(let i=0;i<nf;i++){const x=6.8+i*7.2;if(x>h+9)break;wall(x,zf,0);wall(-x,zf,0);}
  const hesco=(x,z,ry,n)=>{const c=Math.cos(ry),s=Math.sin(ry);for(let i=0;i<n;i++){const o=i*3.3;B.box(3.2,6.4,3.2,x+c*o,3.2,z-s*o,i%2?P.h:P.u,0,ry,R()*.04);B.box(3.3,.25,3.3,x+c*o,6.5,z-s*o,P.d,0,ry);}};
  hesco(h+11,-h*.8,Math.PI/2,Math.max(3,Math.round(h/3)));if(kind!=='depot')hesco(-h-11,-h*.5,Math.PI/2,Math.round(h/4));
  for(const sx of [-1,1]){B.box(2.4,8,2.4,sx*5.6,4,zf,P.c2);B.box(3.2,.7,3.2,sx*5.6,8.2,zf,P.c);}B.box(14,1.2,2,0,8.6,zf,P.c2);B.half(5.2,1.6,0,8,zf,P.a,0);
  for(const z of [h*.1,h*.1+4.2]){B.box(3.4,2.8,2.8,h+7,1.4,z,P.c2);B.cyl(1.05,1.05,.3,8,h+7,2.95,z,P.d);}
  B.cyl(.3,.4,10,5,h+16,5,h*.6,P.m);B.cyl(3.2,.2,.6,10,h+16.8,10.4,h*.6,P.w,0,0,.9);
  if(kind==='hq')bfFlag(B,-16,zf+3,fac,26,0.2);
  B.box(4,1,4,h+8,.5,-h*.6,P.c2);B.cyl(1.5,1.5,3.6,8,h+8,2.8,-h*.6,'#46504a');
  const mx=-h-9,mz=-h-9;B.cyl(.35,.5,30,5,mx,15,mz,P.m);for(let y=6;y<30;y+=8)B.box(4,.2,.2,mx,y,mz,P.m);B.sph(.45,mx,30.4,mz,'#c0392b');
  for(let i=0;i<8;i++){const x=-h+R()*h*2,z=zf+(R()<.5?-1.8:2);B.rock(4+R()*5,1.1,2.4,x,.15,z,P.u,0,R()*3,0,i);}
  return B.geo();}
function bfamGeo(fam,kind,size,fac){const K=fam+kind+size+(kind==='hq'?fac:'');if(BFGEO[K])return BFGEO[K];const P=BFP[fam],B=Bld(),h=size/2,R=mulberry(size*7+kind.length*13+fam.charCodeAt(0));if(fam==='G')return BFGEO[K]=bfamReg(B,P,R,h,size,kind,fac);if(fam==='R')return BFGEO[K]=bfamEast(B,P,R,h,size,kind,fac);
  const tw=(x,z,ry)=>{ // T-wall: tall slab on a wider foot, cap strip, lifting lugs
    B.box(6.4,1.1,3.2,x,.55,z,P.c2,0,ry);B.box(6,6.2,1.6,x,4,z,R()<.5?P.c:P.c2,0,ry);B.box(6.2,.5,1.9,x,7.3,z,P.c2,0,ry);
    const c=Math.cos(ry),s=Math.sin(ry);for(const q of [-2.2,2.2])B.box(.5,.5,.4,x+c*q,6.8,z-s*q-0,P.m,0,ry);B.box(5.6,.18,1.7,x,3.6,z,P.d,0,ry);};
  // two blast-wall lines with a 12-unit entrance gap in the middle of the front, shorter one on the flank
  const zf=h+11,nf=Math.max(3,Math.round(h/6.4));for(let i=0;i<nf;i++){const x=6+i*6.5;if(x>h+8)break;tw(x,zf,0);tw(-x,zf,0);}
  if(kind!=='depot')for(let i=0;i<Math.round(nf*.7);i++){const z=-h*.5+i*6.5;tw(-h-11,z,Math.PI/2);}
  // sandbag guard posts either side of the gap: stepped courses, a dark firing slit
  for(const sx of [-1,1]){const bx=sx*8,bz=zf+4;for(let r=0;r<4;r++)for(let c=0;c<5-r;c++)B.box(2.7,1.05,1.7,bx+(c-(4-r)/2)*2.8*sx*-1,1.6+r*1.05,bz+(r%2?.3:-.2),P.b,0,(c+r)%2?.07:-.06);
    B.box(7,.5,3,bx,6,bz,P.g);}
  // generator + two AC condensers on the flank, fuel drums
  B.box(5.5,3.4,3.2,h+7,1.7,-h*.35,P.g);B.box(5.7,.5,3.4,h+7,3.5,-h*.35,P.d);B.cyl(.5,.5,2.6,6,h+7+2.4,4.6,-h*.35,P.m);
  for(const z of [h*.1,h*.1+4.2]){B.box(3.4,2.8,2.8,h+7,1.4,z,P.c2);B.cyl(1.05,1.05,.3,12,h+7,2.95,z,P.d);for(let i=-1;i<=1;i++)B.box(.2,2.4,2.9,h+8.8,1.4,z+i*.8,P.m);}
  for(let i=0;i<3;i++){B.cyl(1.05,1.05,3.2,10,h+8+i*2.4,1.6,-h*.7,i===1?'#6b3b2c':P.g);B.cyl(1.08,1.08,.3,10,h+8+i*2.4,2.9,-h*.7,P.d);}
  // antenna mast: lattice legs, cross arms, dish, red lamp
  const mx=-h-9,mz=-h-9;for(const a of [[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]])B.box(.28,34,.28,mx+a[0],17,mz+a[1],P.m);
  for(let y=4;y<34;y+=5){B.box(1.7,.2,.2,mx,y,mz-.6,P.m);B.box(1.7,.2,.2,mx,y,mz+.6,P.m);}
  B.box(6,.3,.3,mx,31,mz,P.m);B.box(.3,.3,6,mx,27,mz,P.m);B.cyl(1.8,.4,.8,10,mx+2,22,mz,P.c2,0,0,Math.PI/2);B.sph(.45,mx,34.4,mz,'#c0392b');
  // floodlight pole by the gap
  B.cyl(.35,.45,14,6,14,7,zf+2,P.m);B.box(3.2,1.2,1.6,14,14.3,zf+2,P.d);B.box(2.8,.5,1.3,14,14.3,zf+2.9,'#e8e4c0');
  // dust drifts at the wall feet
  for(let i=0;i<8;i++){const x=-h+R()*h*2,z=zf+(R()<.5?-1.6:1.8);B.rock(4+R()*6,.9,2.2,x,.15,z,P.u,0,R()*3,0,i);}
  return BFGEO[K]=B.geo();}
function bfamKit(e,o,T){if(!T||!['hq','barracks','factory','depot'].includes(e.kind))return;const fam=BFAM[T.fac];if(!fam||!BFON[fam])return;if(fam==='G'&&typeof MEFAC!=='undefined'&&MEFAC.has(T.fac))return;/* SA, AE, EG already have the walled Middle Eastern compound: a second wall ring inside it only cluttered the base (lane C pictures) */
  const m=mesh(bfamGeo(fam,e.kind,e.size|0,T.fac));m.userData.bfam=1;m.castShadow=false;o.add(m);if(typeof gcKeep==='function'&&!m.geometry.userData.kept){m.geometry.userData.kept=1;gcKeep(m.geometry);}}
