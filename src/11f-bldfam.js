/* art-bld: base-building FAMILY look for non-Shia nations (view only). One code-built kit per family, merged into ONE mesh per building on the shared
   standard material (vertex colours, no new shader program): T-wall blast barriers with an entrance gap, sandbag corner posts, generator + AC
   condensers, an antenna mast with guy wires, a floodlight pole, fuel drums, dust drifts at the wall feet. Built once per family/kind/size and shared.
   Family paint: West concrete + olive/tan, East grey-green concrete + red-star-free plain steel, Regional sand concrete. Shia compounds are art-shia's (meRoofKit). */
const BFAM={US:'W',GB:'W',FR:'W',DE:'W',IL:'W',UA:'W'},BFON={W:1},   // East (R) and Regional (G) get switched on in their own landings
  BFP={W:{c:'#8d8c85',c2:'#a3a29a',b:'#a89b77',m:'#5b615e',d:'#2a2c2b',u:'#b3a584',g:'#52584a'}};
const BFGEO={};
function bfamGeo(fam,kind,size){const K=fam+kind+size;if(BFGEO[K])return BFGEO[K];const P=BFP[fam],B=Bld(),h=size/2,R=mulberry(size*7+kind.length*13+fam.charCodeAt(0));
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
  for(let i=0;i<14;i++){const x=-h+R()*h*2,z=zf+(R()<.5?-1.6:1.8);B.rock(4+R()*4,.9,2.2,x,.15,z,P.u,0,R()*3,0,i);}
  return BFGEO[K]=B.geo();}
function bfamKit(e,o,T){if(!T||!['hq','barracks','factory','depot'].includes(e.kind))return;const fam=BFAM[T.fac];if(!fam||!BFON[fam])return;
  const m=mesh(bfamGeo(fam,e.kind,e.size|0));m.userData.bfam=1;m.castShadow=false;o.add(m);if(typeof gcKeep==='function'&&!m.geometry.userData.kept){m.geometry.userData.kept=1;gcKeep(m.geometry);}}
