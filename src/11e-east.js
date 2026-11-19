/* ART EAST (2026-11-19, orch/art-east): detailed code-built kits for the Russian / Chinese / North Korean support vehicles and
   the shared supply-truck cargo. Every piece of geometry is built once per nation and kind and shared (merged vertex-colour
   mesh, the same single material as every other model, so no draw call or shader is added per unit beyond one mesh).
   Hooks in 11-models.js modelFor: eastPre() marks the kind, eastKit() adds the parts; (supply-truck cargo and the bulldozer are art-west's, shared by all nations).
   Forward is +x, z is across, y up; the truck bed top is about y=18. */
const EASTSET={RU:1,CN:1,KP:1};
const EASTPAL={RU:{o:'#5a6148',d:'#383c2c',l:'#6e7659',w:'#85703f',m:'#a9ac9f'},CN:{o:'#646a4a',d:'#3b3f2e',l:'#767d5c',w:'#8a7442',m:'#b2b5a6'},KP:{o:'#585d45',d:'#363a2b',l:'#697054',w:'#7c6a3c',m:'#a0a396'}};
const EASTGEO={};
function eastPre(e,c,T){if(!T||!EASTSET[T.fac]||!c)return c;const k=e.kind;
  if(k==='atgm'||k==='ew'||k==='cbr'||(k==='aa'&&!/Technical/.test(e.s&&e.s.name||'')))return Object.assign({},c,{extra:'east_'+(k==='cbr'?'ew':k)});
  return c;}
function eastGeo(fac,kind){const K=fac+'|'+kind;if(EASTGEO[K])return EASTGEO[K];const P=EASTPAL[fac]||EASTPAL.RU,r=[];
  const S=Bld(),H=Bld();   // S = static parts, H = turning head (+x forward)
  if(kind==='aa'){ // Pantsir-style gun/missile system: gun turret with twin 30 mm, 6 missile canisters each side, radar and optics
    S.box(15,1.2,12.6,-6.5,18.5,0,P.d);for(const sg of [-1,1])for(const x of [-12,-1.5]){S.box(1.1,5,1.1,x,16.2,sg*7.6,P.d);S.box(2.6,.5,2.6,x,13.6,sg*7.6,'#2a2b26');}
    S.cyl(4.8,5.4,1.6,14,-7,19.8,0,P.d);S.box(3,2,3,-14,20,0,P.o);
    H.box(8.6,4.2,7.2,0,2.8,0,P.l);H.box(7.6,.5,6.4,0,5.1,0,P.d);H.box(.6,3.4,6.8,4.4,2.8,0,P.o,0,0,.2);
    for(const sg of [-1,1]){H.box(1.8,1.6,1.6,4.6,2.8,sg*2.3,'#2a2b27');H.cyl(.38,.38,9,8,9,2.9,sg*2.3,'#1e1f1c',0,0,Math.PI/2);H.cyl(.62,.62,1.1,8,13.6,2.9,sg*2.3,'#15160f',0,0,Math.PI/2);
      for(let i=0;i<3;i++)for(let j=0;j<2;j++){H.box(8.2,1.15,1.15,.2,3.2+j*1.55,sg*(4.35+i*1.25),P.m);H.cyl(.5,.5,.5,8,4.5,3.2+j*1.55,sg*(4.35+i*1.25),'#3a3c36',0,0,Math.PI/2);}}
    H.box(1.4,1.6,1.4,-3.2,6.2,0,P.d);H.cyl(1.6,1.6,.6,10,-3.2,7.2,0,'#2e302b',Math.PI/2,0,0);H.sph(.9,2,5.9,0,'#232b2e');H.box(.5,2.8,5.2,-3.9,6.2,0,P.m,0,0,-.18);
  }else if(kind==='atgm'){ // Kornet-type launcher on a rear pedestal: two tubes, thermal sight, reload canisters; crates and net roll on the bed
    S.box(15,1.2,12.6,-6.5,18.5,0,P.d);for(const z of [-3,0,3])S.box(7,.9,1.7,-10,20.4,z,P.o);for(const sg of [-1,1]){S.box(7.6,2.6,2.5,-10.5,21.1,sg*6,P.o);S.box(7.8,.3,2.7,-10.5,22.5,sg*6,P.d);}
    S.cyl(2.6,3.1,2.4,12,-1.2,20.4,0,P.d);S.cyl(1.2,1.2,3.8,10,-1.2,23,0,'#2a2c27');S.cyl(1.3,1.3,5,8,-12.5,21,-4.8,'#5c5f46',Math.PI/2,0,0);
    H.box(4.4,1.6,5,0,.7,0,P.d);H.box(2.4,3,1.2,-1,2.3,0,P.d);
    for(const sg of [-1,1]){H.box(10.4,1.7,1.7,4,3.1,sg*1.9,P.l);H.cyl(.95,.95,2,10,9.8,3.1,sg*1.9,'#16170f',0,0,Math.PI/2);H.cyl(.8,.8,.9,10,-1.4,3.1,sg*1.9,'#35382d',0,0,Math.PI/2);}
    H.box(3.2,2.3,2.6,2,5.5,0,P.o);H.cyl(.9,.9,1.1,10,3.9,5.5,0,'#1a2528',0,0,Math.PI/2);H.sph(.6,4.6,5.5,0,'#2c4448');
  }else if(kind==='ew'){ // electronic-warfare truck: shelter with ribs, folded antenna mast, outriggers, twin dishes on a turning head
    S.box(14.5,1.2,12.8,-6.5,18.5,0,P.d);S.box(14,7.4,11.6,-7,22.9,0,P.o);S.box(14.4,.5,12,-7,26.8,0,P.d);
    for(const x of [-13,-10,-7,-4,-1])for(const sg of [-1,1])S.box(.45,6.8,.35,x,22.9,sg*5.95,P.d);
    S.box(.3,5,3,1,22.1,-2,P.d);for(const sg of [-1,1])S.box(.3,2.3,2.7,-2.5,22.9,sg*6,'#2a2c28');
    for(const [x,z] of [[-14,-7.8],[-14,7.8],[-1.5,-8.2],[-1.5,8.2]]){S.box(.9,.9,5.4,x,17.9,z*.8+(z>0?2.6:-2.6),P.d,0,0,0);S.box(3,.5,3,x,14.2,z*1.02,'#2a2b26');S.box(.8,4,.8,x,16.3,z,P.d);}
    S.cyl(.5,.6,4,8,-12.5,29.2,-4,P.d);S.cyl(.2,.2,3.5,6,-12.5,31.8,-4,P.m);
    H.box(1.2,5,1.2,0,2.5,0,P.d);H.cyl(.5,.5,5,8,0,5.2,0,'#2c2e29');
    for(const sg of [-1,1]){H.cyl(4.6,.9,1.3,16,0,6.5,sg*4.6,P.m,Math.PI/2.5,0,0);H.cyl(.28,.28,3.3,6,0,7.5,sg*4.6,'#2a2b26',Math.PI/2.5,0,0);H.box(.5,.5,.5,0,9,sg*4.6,'#2a2b26');}
    for(let i=0;i<3;i++)H.box(.35,2.8,2.1,-1.6,7+i*.15,-3+i*3,P.l);
  }
  const gs=S.geo(),gh=H._p.length?H.geo():null;if(typeof gcKeep==='function'){gcKeep(gs);if(gh)gcKeep(gh);}
  return EASTGEO[K]=[gs,gh];}
function eastKit(e,c,o,yaw,T){if(!c||!c.extra||c.extra.slice(0,5)!=='east_'||!T||!EASTSET[T.fac])return;const kind=c.extra.slice(5),g=eastGeo(T.fac,kind);
  o.add(mesh(g[0]));
  if(g[1]){const h=new THREE.Group(),m=mesh(g[1]);h.add(m);const px={aa:-7,atgm:-1.2,ew:-7}[kind]||0,py={aa:20.6,atgm:24.4,ew:27}[kind]||0;h.position.set(px,py,0);o.add(h);o.userData.parts[kind==='ew'?'crane':'turret']=h;}}
