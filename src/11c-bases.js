/* ================= BASE LOOKS: three families (orch/L4-bases, Abdullah 2026-11-14 "Do all the dev work now") =================
   Owner row in orch/SYSTEMS.md: "Base looks". One switch, baseStyle(fac) = 'me' | 'soviet' | 'west':
     me     Middle-Eastern mud brick + compounds (IR RS DW RV OB SA AE EG and the Arab/mountain minors): the existing meKit / meRoofKit look in 04-gfx + 11-models
     soviet precast-concrete panel fence with barbed wire, green steel gate with red star, checkpoint booth, watch tower, floodlights (RU CN KP IN PK UA and eastern minors)
     west   light prefab: chain-link fence, boom-barrier gate, glass-and-white guard cabin, stacked cabins, jersey barriers, LED light poles, parking bays (US GB FR DE IL JP KR TR and the rest)
   Render only (no effect on the simulation). Each yard is ONE merged mesh per building (Bld), same footprint and same "one yard wall" count as before. */
{const OBX=['OB','BI'];for(const f of OBX)MEFAC.add(f);}
const BASE_ME_X=new Set(['AF','KD','SD','LY','DZ']);
function baseStyle(fac){if(MEFAC.has(fac)||BASE_ME_X.has(fac))return 'me';return EASTVEH.includes(fac)?'soviet':'west';}
// roof/wall colours per family; nation tint on the borrowed building models (replaces the old single concrete tint)
const BASE_PAL={me:{rf:'#9a9585',pl:'#b8a98a'},soviet:{rf:'#8f918a',pl:'#a3a49c'},west:{rf:'#b9bcbc',pl:'#d3d5d4'}};
const BASE_TINT={RU:'#9a9c92',CN:'#9b9a8e',KP:'#8f9584',IN:'#ad9b84',PK:'#a89f86',UA:'#9ea093',CU:'#a8a690',VN:'#9fa38e',
  US:'#c3c4c0',GB:'#b9b3a5',FR:'#cfc9b8',DE:'#bdc0bf',IL:'#d6cdb5',JP:'#d0d2d2',KR:'#c6c8ca',TR:'#cfc6b4',OB:'#a39d90'};
function baseTint(fac,rt){return BASE_TINT[fac]||rt;}
function basePal(e){const T=G.teams&&G.teams[e.team],s=T?baseStyle(T.fac):'west',p=BASE_PAL[s];return {style:s,rf:p.rf,pl:p.pl,col:T?T.color:'#888888'};}
// yard fence around HQ/barracks/factory/depot etc. (called from roofKit in 11-models). Returns true when it drew the yard.
function baseYard(e,o,P,RR,gate,BP){
  if(BP.style==='me')return false;
  const B=Bld(),R=mulberry((e.kind.length*53+(e.size|0))>>>0),k=e.kind,nat=new THREE.Color(BP.col).lerp(new THREE.Color('#777777'),.35).getHexString();
  const line=(x0,z0,x1,z1,fn)=>{const L=Math.hypot(x1-x0,z1-z0),a=Math.atan2(z1-z0,x1-x0);fn(L,(x0+x1)/2,(z0+z1)/2,-a,x0,z0,x1,z1);};
  const sides=[[-RR,-RR,RR,-RR],[-RR,-RR,-RR,RR],[RR,-RR,RR,RR],[-RR,RR,-gate,RR],[gate,RR,RR,RR]];
  if(BP.style==='soviet'){
    const pan='#a3a49c',jt='#85867f',wire='#2c2d2a';
    for(const [x0,z0,x1,z1] of sides)line(x0,z0,x1,z1,(L,x,z,a,ax,az,bx,bz)=>{const n=Math.max(1,Math.round(L/6)),dx=(bx-ax)/n,dz=(bz-az)/n;
      B.box(L,4.2,.9,x,2.4,z,pan,0,a,0);B.box(L,.5,1.2,x,.25,z,jt,0,a,0);
      for(let i=0;i<=n;i++){B.box(.9,5,1.3,ax+dx*i,2.5,az+dz*i,jt,0,a,0);}
      // barbed wire: two outward-leaning arms and three strands
      B.box(L,.18,.18,x,5.6,z,wire,0,a,0);B.box(L,.18,.18,x,6.2,z,wire,0,a,0);B.box(L,.18,.18,x,6.8,z,wire,0,a,0);
      for(let i=0;i<=n;i++)B.box(.2,2.2,.2,ax+dx*i,5.9,az+dz*i,wire,0,a,0);});
    // gate: two green steel leaves with a red star plate, concrete gate posts
    for(const s of [-1,1]){B.box(gate-.6,4.6,.5,s*gate/2,2.6,RR,'#4f6a47');B.box(gate-.6,.4,.7,s*gate/2,5.1,RR,wire);B.box(1.5,1.5,.2,s*gate/2,3.2,RR+.4,'#b3262a');B.box(.5,.5,.2,s*gate/2,3.2,RR+.55,'#e8c13a');B.box(2.6,7.2,2.6,s*(gate+.4),3.6,RR,jt);B.box(3.2,.7,3.2,s*(gate+.4),7.4,RR,pan);}
    // checkpoint booth (concrete, dark window, flat roof, striped barrier) beside the gate
    B.box(5,4,5,gate+7,2,RR+4,pan);B.box(5.4,.6,5.4,gate+7,4.3,RR+4,jt);B.box(3.2,1.4,.3,gate+7,2.8,RR+6.6,'#1b1d1c');B.box(.4,.4,gate*1.7,0,2.8,RR+8,'#b3262a');B.box(.5,.5,2.5,-gate*.8,2.8,RR+8,'#e8e8e0');
    B.box(.6,3,.6,gate*.85,1.5,RR+8,wire);
    // corner watch towers (concrete shaft, cabin, flat roof) and floodlight masts along the sides
    for(const [tx,tz] of [[-RR,-RR],[RR,-RR]]){B.box(3.4,11,3.4,tx,5.5,tz,pan);B.box(5.4,2.6,5.4,tx,12.4,tz,jt);B.box(5.6,.9,3.2,tx,12.6,tz,'#15130f');B.box(6.6,.6,6.6,tx,14.0,tz,pan);B.cyl(.12,.12,4,4,tx,16,tz,wire);}
    for(const [fx,fz] of [[-RR,0],[RR,0],[0,-RR]]){B.cyl(.3,.4,15,6,fx,7.5,fz,'#6c6f6a');B.box(3.2,.7,1.2,fx,15.2,fz,'#3a3c3a');B.box(2.6,.3,.9,fx,14.8,fz,'#f1ecc4');}
    // propaganda board (red panel with a pale band) on two posts, inside the yard facing the gate, and a flag-lined concrete pad at the gate
    B.box(.6,6,.6,-gate-8,3,RR-5,wire);B.box(.6,6,.6,-gate-20,3,RR-5,wire);B.box(13,5,.4,-gate-14,7.2,RR-5,'#a82a2d');B.box(11.5,1,.45,-gate-14,7.2,RR-4.9,'#e5d9a8');
    B.box(gate*2+10,.3,12,0,.15,RR+4,'#8d8e88');
    // vent stacks and a concrete utility annex beside big buildings
    if(k==='factory'||k==='hq'){B.box(8,4.4,6,RR*.45,2.2,-RR+4,pan);B.box(8.4,.6,6.4,RR*.45,4.5,-RR+4,jt);for(let i=0;i<2;i++)B.cyl(.9,1.1,9,8,RR*.45-2+i*4,9,-RR+4,'#7d7f78');}
  }else{
    const rail='#aab0b2',post='#7f868a',glass='#456579',wht='#dcdedd';
    // chain-link style fence: posts every 5, three rails, a lighter top rail
    for(const [x0,z0,x1,z1] of sides)line(x0,z0,x1,z1,(L,x,z,a,ax,az,bx,bz)=>{const n=Math.max(1,Math.round(L/5)),dx=(bx-ax)/n,dz=(bz-az)/n;
      B.box(L,.18,.18,x,1.2,z,rail,0,a,0);B.box(L,.18,.18,x,3.2,z,rail,0,a,0);B.box(L,.22,.22,x,5,z,post,0,a,0);B.box(L,3.4,.06,x,2.7,z,'#8e9496',0,a,0);
      for(let i=0;i<=n;i++)B.cyl(.18,.18,5.4,5,ax+dx*i,2.7,az+dz*i,post);});
    // sliding gate leaf, boom barrier (red and white), prefab guard cabin with glass strip
    B.box(gate-.4,4.4,.2,-gate/2,2.4,RR,'#8a9194');B.box(gate-.4,.3,.3,-gate/2,4.7,RR,post);
    for(const s of [-1,1])B.box(1.4,5.6,1.4,s*(gate+.2),2.8,RR,post);
    B.box(gate*.9,.35,.35,gate*.5,3.4,RR+7,'#ffffff');for(let i=0;i<4;i++)B.box(gate*.9/8,.38,.38,gate*.12+i*gate*.22,3.4,RR+7,'#c8302c');B.box(.7,3.4,.7,gate*.95+.4,1.7,RR+7,post);
    B.box(6,3.8,4.6,gate+7,1.9,RR+5,wht);B.box(6.2,.5,4.8,gate+7,4.0,RR+5,'#8b9195');B.box(4.6,1.5,.2,gate+7,2.6,RR+7.4,glass);B.box(.2,1.5,3.4,gate+4,2.6,RR+5,glass);
    // jersey barriers in a chicane before the gate
    for(let i=0;i<4;i++){const bx=(i%2?-1:1)*(gate*.55+i*.6),bz=RR+13+i*5;B.box(5,2.4,1.6,bx,1.2,bz,'#b6b7b2');B.box(5,.7,2.4,bx,.35,bz,'#a5a69f');}
    // stacked prefab cabins (blue-grey over white, window strips) as a site annex
    {const cx=-RR*.5,cz=-RR+3;B.box(14,3.6,5.2,cx,1.8,cz,'#6f7f8d');B.box(14,3.6,5.2,cx+3,5.4,cz,wht);B.box(11,1.1,.25,cx,2.2,cz+2.7,glass);B.box(11,1.1,.25,cx+3,5.8,cz+2.7,glass);B.box(2.4,3.2,.3,cx+4.5,1.8,cz+2.7,'#41505a');B.box(14.4,.3,5.6,cx+3,7.3,cz,'#8b9195');
      for(const s of [-1,1])B.box(1.4,5.4,1.4,cx+s*7.5+1.5,2.7,cz-3.2,rail);}
    // LED light poles (tall, bent head) at the corners, camera mast by the gate, parking bays with white lines at the front
    for(const [fx,fz] of [[-RR,-RR],[RR,-RR],[-RR,RR],[RR,RR],[0,-RR]]){B.cyl(.22,.35,16,6,fx,8,fz,'#8a9094');B.box(3.4,.5,1,fx,16.2,fz,'#3d4144');B.box(3,.2,.8,fx,15.9,fz,'#f4f4ea');}
    B.cyl(.18,.18,7,5,-gate-4,3.5,RR+3,post);B.box(1.3,.9,.9,-gate-4,7.2,RR+3,'#2c2f31');
    B.box(gate*2+22,.25,16,-gate*.2,.12,RR+11,'#7b7e80');for(let i=0;i<7;i++)B.box(.35,.1,8,-gate-10+i*5,.3,RR+13,'#f0f0ea');
    if(k==='factory'||k==='hq'){for(let i=0;i<3;i++)B.box(7,3.2,3,RR*.5+i*.2,1.6+i*3.2,-RR+2,['#7a8f6e','#8d6e52','#6f7f8d'][i]);}
  }
  const m=mesh(B.geo());m.userData.pid=-1;P.add(m);return true;}
// gun / SAM pits of soviet and west bases: soviet = precast panel ring, west = sandbag ring, both open at the back (added to the building slab, merged)
function baseSlabKit(B,e,T,s){const st=baseStyle(T.fac);if(st==='me')return;const h=s/2,r=h+3;
  if(e.kind==='turret'||e.kind==='sam'){
    const seg=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),a=Math.atan2(z1-z0,x1-x0);
      if(st==='soviet'){B.box(L,3.6,1.1,(x0+x1)/2,1.8+2.4,(z0+z1)/2,'#9a9b93',0,-a,0);B.box(L,.5,1.5,(x0+x1)/2,4.3+2.4,(z0+z1)/2,'#85867f',0,-a,0);}
      else{const n=Math.max(1,Math.round(L/2.8));for(let q=0;q<3;q++)for(let i=0;i<n-(q%2);i++){const t=(i+.5+(q%2)*.5)/n;B.box(L/n-.2,1.2,2,x0+(x1-x0)*t,2.4+.65+q*1.15,z0+(z1-z0)*t,['#8b8a72','#7f7e68','#94927a'][(i+q)%3],0,-a,0);}}};
    seg(-r,-r,r,-r);seg(r,-r,r,r);seg(-r,-r,-r,r);seg(-r,r,-5,r);seg(5,r,r,r);}}
