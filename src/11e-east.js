/* ART EAST (2026-11-19, orch/art-east): detailed code-built kits for the Russian / Chinese / North Korean support vehicles and
   the shared supply-truck cargo. Every piece of geometry is built once per nation and kind and shared (merged vertex-colour
   mesh, the same single material as every other model, so no draw call or shader is added per unit beyond one mesh).
   Hooks in 11-models.js modelFor: eastPre() marks the kind, eastKit() adds the parts; harvCargoGeo/ammot use cargoGeo().
   Forward is +x, z is across, y up; the truck bed top is about y=18. */
const EASTSET={RU:1,CN:1,KP:1};
const EASTPAL={RU:{o:'#5a6148',d:'#383c2c',l:'#6e7659',w:'#85703f',m:'#a9ac9f'},CN:{o:'#646a4a',d:'#3b3f2e',l:'#767d5c',w:'#8a7442',m:'#b2b5a6'},KP:{o:'#585d45',d:'#363a2b',l:'#697054',w:'#7c6a3c',m:'#a0a396'}};
const EASTGEO={};
function eastPre(e,c,T){if(!T||!EASTSET[T.fac]||!c)return c;const k=e.kind;
  if(k==='lander'||k==='minel'||k==='sweep')return Object.assign({},c,{extra:'east_'+k});
  if(k==='atgm'||k==='ew'||k==='cbr'||k==='dozer'||(k==='aa'&&!/Technical/.test(e.s&&e.s.name||'')))return Object.assign({},c,{extra:'east_'+(k==='cbr'?'ew':k)});
  return c;}
// shared supply-truck / ammo-truck cargo (all nations): crates on pallets, sacks, a lashed tarp roll, jerrycans, side stakes
function cargoGeo(kind){const K='cargo|'+kind;if(EASTGEO[K])return EASTGEO[K];const B=Bld(),OL='#5b6144',OD='#3f4430',WD='#86704a',WD2='#6d5a3a',TP='#4f5439',SK='#b5a77f';
  B.box(19,.8,15.4,-6.5,18.4,0,'#4a3f2b');B.box(18.6,.9,1.2,-6.5,17.6,-6,WD2);B.box(18.6,.9,1.2,-6.5,17.6,6,WD2);   // bed boards
  for(const z of [-7.9,7.9]){B.box(19,.5,.35,-6.5,20.2,z,WD2);B.box(19,.5,.35,-6.5,21.6,z,WD2);for(const x of [-15.5,-11,-6.5,-2,2.5])B.box(.5,4.4,.5,x,20.3,z,'#55472d');}
  B.box(.35,3.6,15.4,-16.1,20.2,0,WD2);
  if(kind==='harv'){
    for(const x of [-13,-7.6,-2.2])for(const z of [-4.6,1.4]){B.box(5.2,3.5,4.6,x,20.6,z,OL);B.box(5.4,.35,4.8,x,22.45,z,OD);B.box(.5,3.6,4.8,x-1.6,20.6,z,OD);B.box(.5,3.6,4.8,x+1.6,20.6,z,OD);}
    for(const [x,z] of [[-13,-4.6],[-2.2,1.4],[-7.6,-4.6]]){B.box(5,3.2,4.4,x,24.4,z,WD);B.box(5.2,.3,4.6,x,26.1,z,WD2);B.box(.4,3.3,4.6,x-1.4,24.4,z,WD2);B.box(.4,3.3,4.6,x+1.4,24.4,z,WD2);}
    for(let i=0;i<6;i++)B.sph(1.7,-14+i*2.6,19.9+(i%2)*.2,6.1,SK,1.15,.62,.9);
    B.cyl(1.9,1.9,15,10,-7,26.4,5.2,TP,0,0,Math.PI/2);for(const x of [-13,-7,-1])B.box(.4,4,.4,x,26.4,5.2,OD);
    for(const x of [-14,-12.6])B.box(1.3,2.1,.8,x,19.9,-7.2,x<-13?'#4a5030':'#6a5a30');B.cyl(1.7,1.7,1.2,10,-15.2,21,4.6,'#1b1b1a',Math.PI/2,0,0);
  }else{ // ammunition: rows of shell cases in a cradle plus lidded steel boxes
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){B.cyl(.95,.95,8,8,-11+j*2.3,20+i*0+((j%2)?0:0),-4.2+i*2.2-.2,j%2?'#3d4231':'#454a36',0,0,Math.PI/2);}
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)B.cyl(.95,.95,8,8,-10+j*2.3,22.0,-4+i*2.2,'#464b37',0,0,Math.PI/2);
    for(let i=0;i<4;i++)B.cyl(.8,.8,.6,8,-6.9+(i%2)*0,20+0,-4.2+i*2.2,'#b08a3c',0,0,Math.PI/2);
    for(const z of [3.6,6]){B.box(6.2,3,2.2,-11,20.4,z,OL);B.box(6.4,.35,2.4,-11,22.1,z,OD);B.box(6.2,3,2.2,-4,20.4,z,OL);B.box(6.4,.35,2.4,-4,22.1,z,OD);}
    B.box(17,.35,15.6,-6.5,23.7,0,TP,0,0,.04);B.box(17,.5,.5,-6.5,24,-3,OD);B.box(17,.5,.5,-6.5,24,3,OD);
  }
  const g=B.geo();if(typeof gcKeep==='function')gcKeep(g);return EASTGEO[K]=g;}
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
  }else if(kind==='dozer'){ // tracked bulldozer: roller frames, hull, hood, glazed cab with roll bar, blade on push arms, ripper
    const TR='#25251f',TRD='#1a1a16',Y=P.w==='#85703f'?'#a58a31':P.w==='#8a7442'?'#9a8a38':'#8f8036';
    for(const sg of [-1,1]){const z=sg*6.4;S.box(25,4.4,3.8,-1,3.2,z,TR);S.cyl(2.7,2.7,3.9,14,10.8,3.4,z,TR,Math.PI/2,0,0);S.cyl(2.5,2.5,3.9,14,-12.8,3.6,z,TR,Math.PI/2,0,0);S.cyl(1.9,1.9,4.1,10,10.8,3.4,z,'#4a4b43',Math.PI/2,0,0);S.cyl(1.9,1.9,4.1,10,-12.8,3.6,z,'#4a4b43',Math.PI/2,0,0);
      S.box(23,.7,4,-1,.7,z,TRD);S.box(23,.7,4,-1,5.7,z,TRD);for(const x of [-8,-3,2,7])S.cyl(1.5,1.5,4.2,8,x,2.2,z,'#34352e',Math.PI/2,0,0);for(let i=0;i<12;i++)S.box(.9,.5,4.2,-11+i*2.1,.15,z,'#33332b');S.box(9,2.4,4.5,-2,6.6,z,TRD);}
    S.box(24,3.4,9.4,-1,7.4,0,Y);S.box(14,4.2,8.6,6,10.2,0,Y);S.box(14.4,.4,9,6,12.45,0,Y);S.box(7,.3,5.4,8,12.75,0,'#2e2e29');for(let i=0;i<5;i++)S.box(.5,.3,5.6,5+i*1.4,12.95,0,Y);S.box(3.6,3,8.6,13.6,9.1,0,'#33332d');for(const z of [-2.6,0,2.6])S.box(.3,2.4,.5,14.4,9.8,z,'#15150f');
    S.box(10,1.4,9.6,-8,9.7,0,Y);S.box(9.2,4.6,8.4,-8.6,12.6,0,'#1f2b31');S.box(9.4,.4,9.2,-8.6,15,0,'#222');for(const x of [-4,-13.2])for(const z of [-4.4,4.4])S.box(.8,5,.8,x,12.6,z,Y);S.box(.5,3.6,6,-13.4,12.8,0,'#33332d');S.box(.4,5.6,.5,-4.1,12.4,3.9,'#2a2a25');S.box(.4,5.6,.5,-4.1,12.4,-3.9,'#2a2a25');S.box(.4,5.6,.5,-13.1,12.4,3.9,'#2a2a25');S.box(.4,5.6,.5,-13.1,12.4,-3.9,'#2a2a25');
    S.box(11.4,.9,10.4,-8.6,15.8,0,Y);S.box(1.2,.7,1.2,-4.8,16.7,-3,'#f0a020');S.cyl(.6,.7,5.6,8,2.2,16,3.6,'#2a2b27');S.cyl(.9,.9,.6,8,2.2,19,3.6,'#171713');S.box(3,2.4,8,-14.4,8.6,0,'#33332d');
    S.box(2,2,1.2,-15.5,11,3.2,'#2b2b26');
    for(const sg of [-1,1]){S.box(11.5,1.5,1.5,10.6,4.6,sg*8.2,Y);S.cyl(.7,.7,6.2,8,13.2,7.6,sg*6.5,'#7d8184',0,0,Math.PI/2+.45);S.cyl(.9,.9,1.3,8,8.6,5.9,sg*6.5,'#3a3b36',Math.PI/2,0,0);}
    S.box(2.2,6.2,22,20,4.5,0,Y,0,0,.06);S.box(2.6,1.2,22.4,19.4,7.8,0,'#2d2d28',0,0,.06);S.box(1.4,2.2,22.4,21.3,1.4,0,'#8d9094');for(const z of [-5,0,5])S.box(.8,2,3,18.7,3.4,z,'#35352f');
    S.box(2.5,2.4,6.4,-17.3,2.4,0,'#2c2c27');for(const z of [-1.6,1.6])S.box(1.2,3.2,.9,-19.6,2.6,z,'#2f302a');
  }else if(kind==='lander'||kind==='minel'||kind==='sweep'){ // small navy craft: own hull (stepped bow, bulwarks, deck plates), role gear
    const HU={RU:'#6c747a',CN:'#66707a',KP:'#6a7168'}[fac]||'#6c747a',HD='#3b4146',DK='#4c5256',BT='#6a2c28',WH='#9aa0a3',Ds='#2a2e31';
    const L=kind==='lander'?52:kind==='minel'?50:46,Wd=kind==='lander'?22:18,hl=L/2;
    // hull body, waterline stripe, stepped bow, transom
    S.box(L*.66,5.2,Wd,-L*.17,2.6,0,HU);S.box(L*.66,1.4,Wd+.1,-L*.17,.9,0,BT);
    const bw=[[.9,.8],[.72,.62],[.5,.5],[.28,.4]];let bx=L*.16;for(const [f,ln] of bw){const l=L*.16*ln*1.4;S.box(l,5.2,Wd*f,bx+l/2,2.6,0,HU);S.box(l,1.4,Wd*f+.1,bx+l/2,.9,0,BT);bx+=l*.82;}
    S.box(.8,5.2,Wd*.96,-L*.5,2.6,0,HD);S.box(L*.66,.5,Wd-1,-L*.17,5.3,0,DK);
    for(const sg of [-1,1]){S.box(L*.66,2.2,.7,-L*.17,6.4,sg*(Wd/2-.4),HU);S.box(L*.18,2.2,.7,L*.22,6.4,sg*(Wd/2*.8),HU,0,sg*.35,0);}
    for(let i=0;i<7;i++)S.box(.5,.45,Wd-3,-L*.46+i*L*.09,5.75,0,Ds);   // deck plate seams
    if(kind==='lander'){ // landing craft: raised bow ramp, open well deck, bridge aft, twin machine guns
      S.box(L*.24,.8,Wd*.62,L*.4,7.2,0,HD,0,0,-.5);S.box(2,3.8,Wd*.62,L*.31,6.6,0,HU);for(const sg of [-1,1])S.box(.6,3,.6,L*.44,8.4,sg*Wd*.28,DK,0,0,-.5);
      S.box(9,6.4,Wd*.55,-L*.33,9,0,HU);S.box(9.2,.5,Wd*.58,-L*.33,12.4,0,HD);S.box(.5,2,Wd*.5,-L*.29,10.4,0,'#1f2b31');S.box(7.8,1.8,.5,-L*.33,11,Wd*.28,'#1f2b31');S.box(7.8,1.8,.5,-L*.33,11,-Wd*.28,'#1f2b31');
      S.cyl(.4,.4,9,6,-L*.35,17,0,Ds);S.box(2.4,1.6,.2,-L*.35,20.5,1,'#b03028');
      for(const sg of [-1,1]){S.cyl(.7,.7,2,8,L*.1,7.6,sg*Wd*.3,Ds);S.cyl(.22,.22,3.2,6,L*.1+1.8,8.2,sg*Wd*.3,Ds,0,0,Math.PI/2);}
      S.box(11,2.4,Wd*.3,-L*.02,7.4,0,'#4b5038');S.box(10,.5,Wd*.28,-L*.02,8.8,0,'#3b3f2e');   // tracked cargo under a tarp
    }else if(kind==='minel'){ // minelayer: stern rails with mines, derrick crane, funnel, bow gun
      S.box(9,7,Wd*.6,L*.05,9.2,0,HU);S.box(9.2,.5,Wd*.64,L*.05,12.8,0,HD);S.box(.5,2.2,Wd*.52,L*.1,11,0,'#1f2b31');S.box(2.8,5,2.8,-L*.04,16,0,HD);S.cyl(1.5,1.7,4.4,10,-L*.04,17,0,Ds);
      for(const z of [-Wd*.26,Wd*.26]){S.box(L*.4,.5,.7,-L*.26,6.4,z,Ds);for(let i=0;i<7;i++){S.sph(1.35,-L*.45+i*L*.055,7.4,z,'#2f3a33');S.cyl(.2,.2,.9,5,-L*.45+i*L*.055,8.6,z,'#8c8f78');}}
      S.cyl(.55,.55,9,6,-L*.46,10,0,HD);S.box(.5,.5,10,-L*.46,14.6,0,HD,.0,0,0);S.box(.4,.4,9,-L*.4,13.4,0,HD,0,0,.55);
      S.cyl(1.2,1.4,1.6,10,L*.3,6.8,0,HD);S.cyl(.3,.3,5,6,L*.3+2.6,7.8,0,Ds,0,0,Math.PI/2+.15);
    }else{ // minesweeper: bridge forward, sweep winch drum and A-frame aft, paravanes, bow gun
      S.box(9,6.6,Wd*.62,L*.02,9,0,HU);S.box(9.2,.5,Wd*.66,L*.02,12.4,0,HD);S.box(.5,2,Wd*.56,L*.07,10.8,0,'#1f2b31');S.cyl(.25,.25,6,5,L*.02,15.5,0,Ds);S.box(3,.3,.3,L*.02,17,0,Ds);
      S.cyl(2.2,2.2,Wd*.5,12,-L*.26,8,0,'#d0a030',Math.PI/2,0,0);for(const sg of [-1,1])S.cyl(2.8,2.8,.4,12,-L*.26,8,sg*Wd*.27,HD,Math.PI/2,0,0);
      for(const sg of [-1,1]){S.box(.6,9,.6,-L*.42,10,sg*Wd*.34,HD,sg*.3,0,0);S.box(.5,.5,Wd*.7,-L*.42,14.4,0,HD);S.cyl(.4,.7,5,8,-L*.2,6.6,sg*(Wd/2+.8),'#d0a030',0,0,Math.PI/2);S.cone(.7,1.4,8,-L*.2+3.1,6.6,sg*(Wd/2+.8),'#d0a030',0,0,-Math.PI/2);}
      S.box(8,1.6,1.4,-L*.32,6.6,0,'#3b3f2e');
      S.cyl(1.1,1.3,1.5,10,L*.3,6.8,0,HD);S.cyl(.28,.28,4.5,6,L*.3+2.3,7.8,0,Ds,0,0,Math.PI/2+.1);
    }
  }
  const gs=S.geo(),gh=H._p.length?H.geo():null;if(typeof gcKeep==='function'){gcKeep(gs);if(gh)gcKeep(gh);}
  return EASTGEO[K]=[gs,gh];}
function eastKit(e,c,o,yaw,T){if(!c||!c.extra||c.extra.slice(0,5)!=='east_'||!T||!EASTSET[T.fac])return;const kind=c.extra.slice(5),g=eastGeo(T.fac,kind);
  if((kind==='dozer'||kind==='lander'||kind==='minel'||kind==='sweep')&&yaw.children[0])yaw.children[0].visible=false;
  o.add(mesh(g[0]));
  if(g[1]){const h=new THREE.Group(),m=mesh(g[1]);h.add(m);const px={aa:-7,atgm:-1.2,ew:-7}[kind]||0,py={aa:20.6,atgm:24.4,ew:27}[kind]||0;h.position.set(px,py,0);o.add(h);o.userData.parts[kind==='ew'?'crane':'turret']=h;}}
