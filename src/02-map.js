/* ================= MAP: sea channel, bridges, grid, pathfinding ================= */
const COSB=0.894,BT=[0.894,0.447],BN=[-0.447,0.894];
/* Maps: each defines water features (rivers, lakes), bridges, base slots (in fill order) and a symmetry used to place supply fairly.
   Water is baked into an edge field: M.edge(x,y) > 0 is water (value = distance in from the shore), < 0 is land. */
const MAPS={
  strait:{name:'Desert Strait',min:2,max:8,sym:'point',desc:'A sea strait splits the desert. Three bridges.',
    slots:[[380,MAPH-360],[MAPW-380,360],[1150,MAPH-360],[MAPW-1150,360],[380,1150],[MAPW-380,MAPH-1150],[1780,MAPH-310],[MAPW-1780,310]],
    water(M,R){const p=[R()*6.28,R()*6.28,R()*6.28];const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,300+.5*x+45*Math.sin(x*.0035+p[0])+22*Math.sin(x*.009+p[1])]);
      M.rivers.push({pts,hw:(t,x)=>178+24*Math.sin(x*.006+p[2])});M.bridgeAt=[[0,700],[0,1600],[0,2500]];}},
  rivers:{name:'Twin Rivers',min:2,max:6,sym:'point',desc:'Two rivers cut the land into three bands. Four bridges.',
    slots:[[420,260],[MAPW-420,MAPH-260],[420,MAPH-260],[MAPW-420,260],[360,1100],[MAPW-360,1100]],
    water(M,R){const p=[R()*6.28,R()*6.28];for(const [yc,ph] of [[690,p[0]],[MAPH-690,p[1]]]){const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,yc+28*Math.sin(x*.0042+ph)+12*Math.sin(x*.011+ph*2)]);M.rivers.push({pts,hw:(t,x)=>96+14*Math.sin(x*.007+ph)});}
      M.bridgeAt=[[0,900],[0,2300],[1,900],[1,2300]];}},
  delta:{name:'River Delta',min:2,max:6,sym:'mirrorX',desc:'A river forks into two arms on its way to the sea. Five bridges.',
    slots:[[420,420],[MAPW-420,420],[420,1380],[MAPW-420,1380],[1150,1960],[MAPW-1150,1960]],
    water(M,R){const ph=R()*6.28,J=[1600,820];const wig=(a,b,amp)=>{const pts=[];const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,L=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,w=amp*Math.sin(t*9+ph)*Math.sin(t*Math.PI);pts.push([x+nx*w,y+ny*w]);}return pts;};
      M.rivers.push({pts:wig([1600,-200],J,22),hw:()=>120});const L=wig(J,[260,MAPH+200],40),Rr=L.map(([x,y])=>[MAPW-x,y]);M.rivers.push({pts:L,hw:()=>100});M.rivers.push({pts:Rr,hw:()=>100});
      M.bridgeAt=[[0,.45],[1,.33],[1,.72],[2,.33],[2,.72]];M.bridgeFrac=true;}},
  oasis:{name:'Oasis Basin',min:2,max:8,sym:'point',desc:'Open desert ringed around a central lake. No bridges, many approaches.',
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1250,1100+Math.sin(a)*800]);return s;})(),
    water(M,R){const w=[R()*6.28,R()*6.28];M.lakes.push({x:1600,y:1100,r:300,rx:1.35,wob:a=>.1*Math.sin(a*3+w[0])+.06*Math.sin(a*5+w[1])});
      for(const a of [-1.1,2.04,.47,-2.67]){const x=1600+Math.cos(a)*1250,y=1100+Math.sin(a)*800;M.lakes.push({x,y,r:85,rx:1.2,wob:q=>.15*Math.sin(q*3+x)});}}},
  gulf:{name:'Gulf Coast',min:2,max:4,sym:'mirrorX',desc:'Bases on a desert shore above the open sea. Naval power matters.',
    slots:[[450,330],[MAPW-450,330],[520,1250],[MAPW-520,1250]],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-300;x<=MAPW+300;x+=40)pts.push([x,MAPH+60-90*Math.cos((x-1600)/1600*Math.PI*.5)*0+40*Math.sin(x*.004+ph)]);M.rivers.push({pts,hw:(t,x)=>470+120*Math.exp(-Math.pow((x-1600)/380,2))});}},
  plateau:{name:'Sinai Plateau',min:2,max:8,sym:'point',desc:'Dry highlands with rock mesas and no water. A pure land war.',rough:1.6,
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1280,1100+Math.sin(a)*820]);return s;})(),
    water(){}},
  hormuz:{home:['IR','AE'],name:'Strait of Hormuz',min:2,max:8,sym:'none',desc:'Iran faces the Arabian shore across the world\'s busiest oil chokepoint. Navies rule the strait; armies must go the long way round.',
    slots:[[1650,270],[1750,1800],[450,330],[2750,1950],[2800,330],[480,1950],[1050,270],[1100,1830]],
    water(M,R){const ph=R()*6.28;const P=[[780,1280],[1150,1010],[1500,820],[1800,760],[2100,840],[2450,1080],[2800,1350],[3500,1720]];const pts=[];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let k=0;k<n;k++){const t=k/n;pts.push([a[0]+(b[0]-a[0])*t+12*Math.sin((a[1]+t*(b[1]-a[1]))*.02+ph),a[1]+(b[1]-a[1])*t+14*Math.sin((a[0]+t*(b[0]-a[0]))*.013+ph)]);}}pts.push(P[P.length-1]);
      M.rivers.push({pts,hw:(t,x)=>150+190*Math.min(1,Math.abs(x-1720)/900)});
      for(const [x,y,r,rx,rot] of [[1180,880,62,2.7,-.48],[1640,905,34,1.3,0],[1900,905,28,1.4,.4],[930,1170,30,1.2,0],[1030,1070,24,1.2,0],[2330,1150,30,1.6,.6]])M.islands.push({x,y,r,rx,rot,wob:q=>.12*Math.sin(q*3+x)});}},
  arctic:{name:'Arctic Front',min:2,max:8,sym:'point',theme:'snow',desc:'A frozen river and snowbound forests. Three bridges, rocky hills and falling snow.',
    slots:[[450,1100],[2750,1100],[1050,330],[2150,1870],[1050,1870],[2150,330],[420,330],[2780,1870]],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1600+70*Math.sin(y*.0035+ph)+25*Math.sin(y*.011+ph*2),y]);M.rivers.push({pts,hw:()=>118});M.bridgeAt=[[0,.2],[0,.5],[0,.8]];M.bridgeFrac=true;
      M.peaks.push({x:820,y:760,r:120,rx:1.6,rot:.5},{x:MAPW-820,y:MAPH-760,r:120,rx:1.6,rot:.5},{x:780,y:1500,r:90,rx:1.3,rot:-.4},{x:MAPW-780,y:MAPH-1500,r:90,rx:1.3,rot:-.4});}},
  islands:{name:'Island Chain',min:2,max:4,sym:'point',fieldMinB:340,desc:'Four island fortresses around a central isle in open sea. Long bridges are the only land routes, so fleets decide the war.',
    slots:[[560,470],[2640,1730],[560,1730],[2640,470]],
    water(M,R){M.lakes.push({x:1600,y:1100,r:6000,rx:1,wob:()=>0});const w=R()*6.28;
      for(const [x,y] of [[560,470],[2640,1730],[560,1730],[2640,470]])M.islands.push({x,y,r:330,rx:1.45,rot:0,wob:q=>.1*Math.sin(q*3+w+x)+.05*Math.sin(q*7+y)});
      M.islands.push({x:1600,y:1100,r:250,rx:1.7,rot:0,wob:q=>.08*Math.sin(q*4+w)});
      for(const [x,y] of [[1050,770],[2150,1430],[1050,1430],[2150,770]]){const dx=1600-x,dy=1100-y,L=Math.hypot(dx,dy);M.bridgeAng.push([x,y,dx/L,dy/L]);}}},
  zagros:{name:'Zagros Mountains',min:2,max:8,sym:'point',rough:1.3,desc:'Two snow-capped ranges split the land into three valleys. Armies fight for the mountain passes.',
    slots:[[450,1100],[2750,1100],[450,380],[2750,1820],[450,1820],[2750,380],[1600,350],[1600,1850]],
    water(M,R){const ph=R()*6.28;const ridge=(y0,y1)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([1100+60*Math.sin(y*.004+ph)+20*Math.sin(y*.013),y]);return pts;};
      for(const [a,b] of [[-200,470],[740,1440],[1720,MAPH+200]]){const L=ridge(a,b);M.ridges.push({pts:L,hw:()=>105});M.ridges.push({pts:L.map(([x,y])=>[MAPW-x,MAPH-y]),hw:()=>105});}
      M.lakes.push({x:1600,y:1100,r:120,rx:1.5,wob:q=>.1*Math.sin(q*3+ph)});}},
  // ---- real-world theatres ----
  lebanon:{home:['RS','IL'],name:'South Lebanon',min:2,max:6,sym:'none',theme:'green',rough:1.35,desc:'Green limestone hills between the Mediterranean coast and the Litani River. Villages to fight through, ridges to hold, two river crossings.',
    slots:[[760,1960],[2860,1180],[1300,260],[2880,1960],[2900,260],[1800,1260]],
    cities:[[470,1430,170,'lebanon'],[1550,1880,125,'lebanon'],[2350,330,140,'lebanon'],[2200,1500,90,'lebanon']],
    water(M,R){const ph=R()*6.28;const cst=[];for(let y=-200;y<=MAPH+200;y+=40)cst.push([-40+40*Math.sin(y*.004+ph),y]);M.rivers.push({pts:cst,hw:()=>300});
      const lit=[];for(let x=MAPW+200;x>=120;x-=40){const t=(MAPW+200-x)/(MAPW+80);lit.push([x,560+60*Math.sin(x*.004+ph)+(x<1100?(1100-x)*.42:0)]);}M.rivers.push({pts:lit,hw:()=>58});
      M.bridgeAt=[[1,.3],[1,.62]];M.bridgeFrac=true;M.peaks.push({x:1400,y:1300,r:95,rx:1.5,rot:.4},{x:2400,y:1050,r:85,rx:1.4,rot:-.3},{x:2100,y:1900,r:70,rx:1.6,rot:.2},{x:900,y:1000,r:70,rx:1.4,rot:.9});}},
  persia:{home:['IR'],name:'Persian Plateau',min:2,max:8,sym:'none',rough:1.25,desc:'Iran\'s high desert below the Alborz range: a salt lake in the middle, cities on the old caravan road and three mountain passes to the north.',
    slots:[[380,1180],[2840,1180],[420,1960],[2800,1960],[380,640],[2840,640],[1250,1980],[2050,1980]],
    cities:[[1500,700,190,'mideast'],[900,1560,120,'mideast'],[2420,1640,140,'mideast']],
    water(M,R){const ph=R()*6.28;const ridge=(x0,x1)=>{const pts=[];for(let x=x0;x<=x1;x+=40)pts.push([x,330+40*Math.sin(x*.003+ph)]);return pts;};for(const [a,b] of [[-200,640],[900,1900],[2160,MAPW+200]])M.ridges.push({pts:ridge(a,b),hw:()=>110});
      M.lakes.push({x:1700,y:1320,r:210,rx:1.7,wob:q=>.12*Math.sin(q*3+ph)+.05*Math.sin(q*7)});}},
  mesopotamia:{home:['IR','RS'],name:'Mesopotamia',min:2,max:6,sym:'none',desc:'Iraq between the Tigris and the Euphrates: Baghdad between the rivers, Basra by the Shatt al-Arab and bridges everywhere.',
    slots:[[450,1620],[2880,360],[1300,2000],[2700,920],[600,160],[2150,240]],
    cities:[[1400,900,200,'mideast'],[2900,1880,130,'mideast'],[650,820,110,'mideast']],
    water(M,R){const ph=R()*6.28;const line=(a,b,amp,f)=>{const pts=[];const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);for(let i=0;i<=n;i++){const t=i/n;pts.push([a[0]+(b[0]-a[0])*t+amp*Math.sin(t*f+ph),a[1]+(b[1]-a[1])*t+amp*Math.cos(t*f*.8+ph)]);}return pts;};
      M.rivers.push({pts:line([-200,420],[2400,1500],60,11),hw:()=>66});M.rivers.push({pts:line([1200,-200],[2400,1500],50,9),hw:()=>60});M.rivers.push({pts:line([2400,1500],[3500,2300],30,5),hw:()=>95});
      M.bridgeAt=[[0,.18],[0,.45],[0,.75],[1,.3],[1,.65],[2,.45]];M.bridgeFrac=true;M.lakes.push({x:2640,y:1290,r:70,rx:1.6,wob:q=>.2*Math.sin(q*3)});}},
  yemen:{home:['DW','SA'],name:'Yemen Highlands',min:2,max:6,sym:'none',rough:1.5,desc:'From the Red Sea coast up into the Sarawat mountains: tower-house cities of the highlands, narrow passes and a port on the plain.',
    slots:[[660,400],[2850,1900],[660,1900],[2850,350],[1950,1460],[1850,150]],
    cities:[[1850,800,180,'yemen'],[520,1120,140,'mideast'],[1650,1880,120,'yemen'],[2780,1060,100,'yemen']],
    water(M,R){const ph=R()*6.28;const cst=[];for(let y=-200;y<=MAPH+200;y+=40)cst.push([-60+50*Math.sin(y*.005+ph),y]);M.rivers.push({pts:cst,hw:()=>330});
      const ridge=(y0,y1,x0)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([x0+70*Math.sin(y*.004+ph),y]);return pts;};for(const [a,b] of [[-200,560],[820,1450],[1720,MAPH+200]])M.ridges.push({pts:ridge(a,b,1250),hw:()=>100});
      M.ridges.push({pts:ridge(1250,MAPH+200,2350),hw:()=>85});M.peaks.push({x:2350,y:500,r:90,rx:1.3,rot:.5});}},
  volga:{home:['RU'],name:'Volga Winter',min:2,max:8,sym:'none',theme:'snow',desc:'The frozen Volga in winter: a great river city on the east bank, villages in the snow and three bridges to fight over.',
    slots:[[400,1100],[2800,1100],[600,300],[2600,1900],[600,1900],[2600,300],[300,720],[2900,1500]],
    cities:[[2000,1080,200,'russia'],[760,560,90,'russia'],[2560,1700,90,'russia'],[880,1600,80,'russia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1560+190*Math.sin(y*.0026+ph)+40*Math.sin(y*.009+ph*2),y]);M.rivers.push({pts,hw:()=>140});M.bridgeAt=[[0,.22],[0,.5],[0,.8]];M.bridgeFrac=true;}},
  heartland:{home:['US'],name:'American Heartland',min:2,max:8,sym:'none',theme:'green',desc:'Farm country where two great rivers meet: a river city at the confluence, small towns and long bridges.',
    slots:[[350,1100],[2860,1150],[400,300],[2850,1900],[400,1900],[2850,300],[1000,1100],[2300,1500]],
    cities:[[1820,820,200,'america'],[650,560,95,'america'],[2650,1650,105,'america'],[760,1650,85,'america']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1480+150*Math.sin(y*.003+ph)+40*Math.sin(y*.011),y]);M.rivers.push({pts,hw:()=>110});
      const oh=[];for(let x=MAPW+200;x>=1520;x-=40){const t=(MAPW+200-x)/(MAPW-1320);oh.push([x,600+t*700+40*Math.sin(x*.006+ph)]);}M.rivers.push({pts:oh,hw:()=>70});
      M.bridgeAt=[[0,.2],[0,.46],[0,.82],[1,.45]];M.bridgeFrac=true;}},
  bosphorus:{name:'Bosphorus',min:2,max:8,sym:'none',theme:'green',home:['TR'],desc:'Istanbul on both shores of the Bosphorus, between the Black Sea and the Sea of Marmara. Two great bridges join Europe and Asia.',
    slots:[[380,1150],[2820,1100],[420,1950],[2800,1950],[600,320],[2600,320],[1150,1980],[2100,1980]],
    cities:[[1300,1000,210,'turkey'],[1950,1180,210,'turkey'],[900,1700,110,'turkey']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:1600,y:-380,r:600,rx:2.4,wob:q=>.05*Math.sin(q*5+ph)});M.lakes.push({x:1700,y:2560,r:560,rx:2.6,wob:q=>.05*Math.sin(q*4+ph)});
      const pts=[];for(let y=-100;y<=MAPH+100;y+=40)pts.push([1620+120*Math.sin(y*.004+ph)+(y-1100)*.08,y]);M.rivers.push({pts,hw:()=>70});M.bridgeAt=[[0,.36],[0,.62]];M.bridgeFrac=true;}},
  golan:{name:'Golan Heights',min:2,max:6,sym:'none',rough:1.6,home:['IL'],desc:'Basalt plateau above the Sea of Galilee, with Mount Hermon to the north and the Jordan valley below. High ground decides everything.',
    slots:[[950,1950],[2850,1950],[2850,700],[700,300],[1750,1950],[2800,180]],
    cities:[[820,1250,110,'lebanon'],[2150,1250,100,'mideast'],[1500,1820,80,'lebanon']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:560,y:880,r:200,rx:.8,wob:q=>.1*Math.sin(q*3+ph)});const jr=[];for(let y=1060;y<=MAPH+200;y+=40)jr.push([560+40*Math.sin(y*.01+ph),y]);M.rivers.push({pts:jr,hw:()=>34});M.bridgeAt=[[0,.5]];M.bridgeFrac=true;
      M.peaks.push({x:1700,y:250,r:200,rx:1.8,rot:.2},{x:1600,y:1000,r:80,rx:1.3,rot:.5},{x:2500,y:1500,r:75,rx:1.5,rot:-.3},{x:1250,y:1500,r:70,rx:1.4,rot:.8});}},
  fulda:{name:'Fulda Gap',min:2,max:8,sym:'point',theme:'green',home:['EU'],desc:'Rolling German farmland, forests and half-timbered towns on the old Cold War invasion route. A winding river with four bridges.',
    slots:[[400,1100],[2800,1100],[500,300],[2700,1900],[500,1900],[2700,300],[1200,1980],[2000,220]],
    cities:[[1150,700,120,'europe'],[2050,1500,120,'europe'],[1600,1100,95,'europe'],[700,1500,70,'europe'],[2500,700,70,'europe']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-200;x<=MAPW+200;x+=40)pts.push([x,1100+260*Math.sin(x*.0024+ph)+50*Math.sin(x*.009)]);M.rivers.push({pts,hw:()=>52});M.bridgeAt=[[0,.2],[0,.42],[0,.6],[0,.82]];M.bridgeFrac=true;
      M.peaks.push({x:1600,y:500,r:80,rx:1.6,rot:.2},{x:1600,y:1700,r:80,rx:1.6,rot:.2});}},
  dnipro:{name:'Dnipro Front',min:2,max:8,sym:'none',theme:'green',home:['UA'],desc:'The wide Dnipro splits Ukraine: a great city on both banks, river islands and long bridges under fire.',
    slots:[[380,1100],[2820,1100],[500,300],[2700,1900],[500,1900],[2700,300],[300,700],[2900,1500]],
    cities:[[1300,950,190,'russia'],[1980,1050,170,'russia'],[700,1600,80,'europe'],[2600,600,80,'europe']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([1640+150*Math.sin(y*.0028+ph),y]);M.rivers.push({pts,hw:()=>150});M.bridgeAt=[[0,.25],[0,.48],[0,.78]];M.bridgeFrac=true;
      M.islands.push({x:1650,y:620,r:60,rx:2,rot:1.4,wob:q=>.1*Math.sin(q*3)},{x:1640,y:1600,r:50,rx:1.8,rot:1.5,wob:q=>.1*Math.sin(q*4)});}},
  rubalkhali:{name:'Empty Quarter',min:2,max:8,sym:'point',rough:.85,home:['SA'],desc:'Endless dunes of the Rub al Khali around Riyadh. Wide open ground for armour; a few oases and oil everywhere.',
    slots:(()=>{const s=[];const ang=[2.5,-.64,.95,-2.19,3.14,0,-1.57,1.57];for(const a of ang)s.push([1600+Math.cos(a)*1300,1100+Math.sin(a)*840]);return s;})(),
    cities:[[1600,1100,190,'mideast']],
    water(M,R){for(const [x,y] of [[900,700],[2300,1500],[2300,700],[900,1500]])M.lakes.push({x,y,r:55,rx:1.4,wob:q=>.15*Math.sin(q*3+x)});}},
  emirates:{name:'Gulf Emirates',min:2,max:4,sym:'mirrorX',home:['AE'],desc:'A glittering skyline on the Gulf shore with palm-shaped islands offshore. Fight between the towers and the sea.',
    slots:[[450,1900],[2750,1900],[450,1200],[2750,1200]],
    cities:[[1600,1050,260,'gulfcity'],[800,1550,90,'mideast'],[2400,1550,90,'mideast']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-300;x<=MAPW+300;x+=40)pts.push([x,-70+30*Math.sin(x*.004+ph)]);M.rivers.push({pts,hw:()=>520});
      for(const [x,y] of [[900,640],[2300,640]]){M.islands.push({x,y,r:120,rx:1,rot:0,wob:q=>.35*Math.max(0,Math.sin(q*8))});}M.bridgeAng.push([900,560,0,1],[2300,560,0,1]);}},
  indus:{name:'Indus Valley',min:2,max:6,sym:'none',theme:'green',rough:1.2,home:['PK'],desc:'Pakistan\'s Indus plain under the Karakoram: a great river, a walled city and snow peaks guarding the north.',
    slots:[[400,1950],[2850,900],[600,1100],[2200,620],[1500,2000],[2200,1950]],
    cities:[[1700,1250,190,'southasia'],[800,1650,90,'southasia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let t=0;t<=1.0001;t+=.01){const x=-200+t*3600,y=300+t*1500+90*Math.sin(t*9+ph);pts.push([x,y]);}M.rivers.push({pts,hw:()=>95});M.bridgeAt=[[0,.25],[0,.5],[0,.75]];M.bridgeFrac=true;
      M.peaks.push({x:2200,y:220,r:200,rx:2.2,rot:.15},{x:900,y:150,r:150,rx:1.8,rot:-.1});}},
  kashmir:{name:'Kashmir Line',min:2,max:6,sym:'point',theme:'green',rough:1.5,home:['IN'],desc:'High valleys of Kashmir: a lake city in the middle, Himalayan ridges on both sides and contested passes.',
    slots:[[400,1100],[2800,1100],[500,300],[2700,1900],[500,1900],[2700,300]],
    cities:[[1600,1450,150,'southasia']],
    water(M,R){const ph=R()*6.28;M.lakes.push({x:1600,y:1000,r:150,rx:1.4,wob:q=>.12*Math.sin(q*3+ph)});
      const ridge=(y0,y1,x0)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([x0+60*Math.sin(y*.004+ph),y]);return pts;};for(const [a,b] of [[-200,620],[980,1350]]){M.ridges.push({pts:ridge(a,b,1000),hw:()=>100});M.ridges.push({pts:ridge(a,b,1000).map(([x,y])=>[MAPW-x,MAPH-y]),hw:()=>100});}}},
  taiwan:{name:'Taiwan Strait',min:2,max:6,sym:'none',theme:'green',home:['CN'],desc:'Mainland China faces the island across the strait. Two long military causeways can be stormed, but navies, landing craft and air power decide who lands where.',
    slots:[[450,1900],[2850,1600],[450,400],[2850,600],[700,1150],[2500,1100]],
    cities:[[900,800,150,'asia'],[2650,1850,140,'asia'],[2700,350,110,'korea']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let t=0;t<=1.0001;t+=.01){pts.push([1500+t*400+80*Math.sin(t*7+ph),-200+t*2600]);}M.rivers.push({pts,hw:(t,x)=>330});M.islands.push({x:1780,y:1000,r:60,rx:1.5,rot:.4,wob:q=>.1*Math.sin(q*3)});M.bridgeAng.push([1575,480,.988,-.152],[1835,1700,.988,-.152]);}},
  dmz:{name:'Korean DMZ',min:2,max:8,sym:'mirrorY',rough:1.3,home:['KP','KR'],desc:'The most fortified border on Earth: the Imjin river, the demilitarised strip, mountain ridges to the east and capitals within artillery range.',
    slots:[[500,250],[500,1950],[1600,200],[1600,2000],[2700,250],[2700,1950],[1050,300],[1050,1900]],
    cities:[[1150,1850,150,'korea'],[1150,350,120,'asia'],[2250,1880,90,'korea'],[2250,330,80,'asia']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let x=-200;x<=2200;x+=40)pts.push([x,1100+50*Math.sin(x*.005+ph)]);M.rivers.push({pts,hw:()=>58});M.bridgeAt=[[0,.25],[0,.6]];M.bridgeFrac=true;
      const ridge=(y0,y1)=>{const pts=[];for(let y=y0;y<=y1;y+=40)pts.push([2550+50*Math.sin(y*.006),y]);return pts;};M.ridges.push({pts:ridge(560,940),hw:()=>95},{pts:ridge(1260,1640),hw:()=>95});}},
  nile:{name:'Nile & Suez',min:2,max:8,sym:'none',home:['EG'],desc:'Cairo on the Nile and the Suez Canal to the east: green river banks in a sea of sand, with bridges and canal crossings to seize.',
    slots:[[350,1100],[2850,1100],[350,300],[2850,1900],[350,1900],[2850,300],[2200,1950],[2200,250]],
    cities:[[1050,1000,200,'mideast'],[2420,1100,90,'mideast'],[1100,1850,80,'mideast']],
    water(M,R){const ph=R()*6.28;const pts=[];for(let y=-200;y<=MAPH+200;y+=40)pts.push([820+60*Math.sin(y*.004+ph),y]);M.rivers.push({pts,hw:()=>75});
      const can=[];for(let y=-200;y<=MAPH+200;y+=40)can.push([2550+8*Math.sin(y*.002),y]);M.rivers.push({pts:can,hw:()=>38});M.bridgeAt=[[0,.25],[0,.5],[0,.78],[1,.3],[1,.7]];M.bridgeFrac=true;}},
  caribbean:{name:'Caribbean Island',min:2,max:4,sym:'point',theme:'green',home:['CU'],desc:'A long tropical island in warm seas: Havana on the north shore, palm-fringed cays and landings on the beaches.',
    slots:[[700,900],[2500,1300],[1250,1450],[1950,750]],
    cities:[[1300,780,160,'latin'],[2150,1380,110,'latin']],
    water(M,R){M.lakes.push({x:1600,y:1100,r:6000,rx:1,wob:()=>0});const w=R()*6.28;M.islands.push({x:1600,y:1100,r:520,rx:2.6,rot:-.12,wob:q=>.12*Math.sin(q*3+w)+.07*Math.sin(q*7+w*2)});
      for(const [x,y] of [[500,300],[2700,1900],[2800,350],[400,1850]])M.islands.push({x,y,r:90,rx:1.6,rot:.4,wob:q=>.15*Math.sin(q*3+x)});}},
};
const MAP_KEYS=Object.keys(MAPS);
let BASE_SLOTS=MAPS.strait.slots;
let BASES=BASE_SLOTS.slice(0,2);
// Start positions: by default players take the map's first n slots. If the player picked a slot, they get it and the
// others are spread out by farthest-point choice so nobody starts next door to anyone.
function slotOrder(D,n,pick){const S=D.slots.slice(0,D.max||D.slots.length);n=Math.max(2,Math.min(S.length,n));if(!(pick>=0&&pick<S.length))return S.slice(0,n).map((_,i)=>i);
  const out=[pick];while(out.length<n){let best=-1,bd=-1;for(let i=0;i<S.length;i++){if(out.includes(i))continue;const d=Math.min(...out.map(j=>Math.hypot(S[i][0]-S[j][0],S[i][1]-S[j][1])));if(d>bd+1e-6){bd=d;best=i;}}out.push(best);}return out;}
function setBases(n,mk,pick){const D=MAPS[mk]||MAPS.strait;BASE_SLOTS=D.slots.map(([x,y])=>[x*WK,y*WK]);BASES=slotOrder(D,n,pick).map(i=>BASE_SLOTS[i]);}
let EF_R=8;let EF_W=Math.ceil(MAPW/EF_R)+1,EF_H=Math.ceil(MAPH/EF_R)+1;
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1;let t=((px-ax)*dx+(py-ay)*dy)/L;t=Math.max(0,Math.min(1,t));const qx=ax+dx*t,qy=ay+dy*t;return[Math.hypot(px-qx,py-qy),t];}
function mkMap(seed,mk){
  mk=MAPS[mk]?mk:'strait';const D=MAPS[mk];
  srand=mulberry(seed);const R=srand;
  const M={seed,key:mk,name:D.name,rough:D.rough||1,theme:D.theme||'desert',rivers:[],lakes:[],islands:[],ridges:[],peaks:[],bridgeAng:[],bridges:[]};
  {const sw=MAPW,sh=MAPH;MAPW=3200;MAPH=2200;try{D.water(M,R);}finally{MAPW=sw;MAPH=sh;}}
  // the map is designed at 3200 x 2200: scale every feature to the current world size
  if(WK!==1){const k=WK,P=p=>p.map(([x,y])=>[x*k,y*k]);
    for(const rv of M.rivers){rv.pts=P(rv.pts);const h0=rv.hw;rv.hw=(t,x)=>h0(t,x/k)*k;}
    for(const L of M.lakes){L.x*=k;L.y*=k;L.r*=k;}for(const I of M.islands){I.x*=k;I.y*=k;I.r*=k;}
    for(const rg of M.ridges){rg.pts=P(rg.pts);const h0=rg.hw;rg.hw=()=>h0()*k;}for(const pk of M.peaks){pk.x*=k;pk.y*=k;pk.r*=k;}
    if(M.bridgeAt&&!M.bridgeFrac)M.bridgeAt=M.bridgeAt.map(([ri,at])=>[ri,at*k]);M.bridgeAng=M.bridgeAng.map(([x,y,nx,ny])=>[x*k,y*k,nx,ny]);}
  // edge field
  const EF=new Float32Array(EF_W*EF_H).fill(-1000);
  for(const rv of M.rivers){const P=rv.pts;let acc=[0];for(let i=1;i<P.length;i++)acc.push(acc[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));rv.len=acc[acc.length-1];rv.acc=acc;
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;for(const [x,y] of P){mnx=Math.min(mnx,x);mxx=Math.max(mxx,x);mny=Math.min(mny,y);mxy=Math.max(mxy,y);}let hmax=0;for(let q=0;q<=20;q++)hmax=Math.max(hmax,rv.hw(q/20,mnx+(mxx-mnx)*q/20));const pad=hmax+650;
    for(let j=0;j<EF_H;j++){const y=j*EF_R;if(y<mny-pad||y>mxy+pad)continue;for(let i=0;i<EF_W;i++){const x=i*EF_R;if(x<mnx-pad||x>mxx+pad)continue;let bd=pad,bi=-1,bt=0;
      for(let k=0;k<P.length-1;k++){const a=P[k],b=P[k+1];const lb=Math.max(Math.min(Math.abs(a[0]-x),Math.abs(b[0]-x)),Math.min(Math.abs(a[1]-y),Math.abs(b[1]-y)))-60;if(lb>bd)continue;const [d,t]=segDist(x,y,a[0],a[1],b[0],b[1]);if(d<bd){bd=d;bi=k;bt=t;}}
      if(bi<0)continue;const qx=P[bi][0]+(P[bi+1][0]-P[bi][0])*bt;const e=rv.hw((acc[bi]+(acc[bi+1]-acc[bi])*bt)/rv.len,qx)-bd;const k2=j*EF_W+i;if(e>EF[k2])EF[k2]=e;}}}
  for(const L of M.lakes){for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,dx=(x-L.x)/L.rx,dy=y-L.y,d=Math.hypot(dx,dy);if(d>L.r*1.6+600)continue;const a=Math.atan2(dy,dx);const e=(L.r*(1+L.wob(a))-d)*Math.min(1,L.rx*.9);const k2=j*EF_W+i;if(e>EF[k2])EF[k2]=e;}}}
  for(const I of M.islands){const c=Math.cos(-I.rot),sn=Math.sin(-I.rot);for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,qx=x-I.x,qy=y-I.y,lx=(qx*c-qy*sn)/I.rx,ly=qx*sn+qy*c,d=Math.hypot(lx,ly);if(d>I.r*1.6+400)continue;const e=(I.r*(1+I.wob(Math.atan2(ly,lx)))-d)*Math.min(1,I.rx*.9);const k2=j*EF_W+i;if(-e<EF[k2])EF[k2]=-e;}}}
  M.EF=EF;
  // mountains: positive inside a ridge or peak (distance in from its foot)
  const MF=new Float32Array(EF_W*EF_H).fill(-1000);
  for(const rv of M.ridges){const P=rv.pts;for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R;let bd=500;for(let k=0;k<P.length-1;k++){const a=P[k],b=P[k+1];const lb=Math.max(Math.min(Math.abs(a[0]-x),Math.abs(b[0]-x)),Math.min(Math.abs(a[1]-y),Math.abs(b[1]-y)))-60;if(lb>bd)continue;const [d]=segDist(x,y,a[0],a[1],b[0],b[1]);if(d<bd)bd=d;}
      if(bd>=500)continue;const e=rv.hw()*(1+.18*Math.sin(x*.013+y*.009)+.1*Math.sin(x*.031-y*.027))-bd;const k2=j*EF_W+i;if(e>MF[k2])MF[k2]=e;}}}
  for(const K of M.peaks){const c=Math.cos(-K.rot),sn=Math.sin(-K.rot);for(let j=0;j<EF_H;j++){const y=j*EF_R;for(let i=0;i<EF_W;i++){const x=i*EF_R,qx=x-K.x,qy=y-K.y,lx=(qx*c-qy*sn)/K.rx,ly=qx*sn+qy*c,d=Math.hypot(lx,ly);if(d>K.r+500)continue;const e=(K.r*(1+.15*Math.sin(Math.atan2(ly,lx)*4+K.x))-d)*Math.min(1,K.rx);const k2=j*EF_W+i;if(e>MF[k2])MF[k2]=e;}}}
  M.MF=MF;M.hasMtn=M.ridges.length+M.peaks.length>0;
  M.mf=(x,y)=>{const fx=Math.max(0,Math.min(EF_W-1.001,x/EF_R)),fy=Math.max(0,Math.min(EF_H-1.001,y/EF_R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*EF_W+i;return(MF[k]*(1-tx)+MF[k+1]*tx)*(1-ty)+(MF[k+EF_W]*(1-tx)+MF[k+EF_W+1]*tx)*ty;};
  M.edge=(x,y)=>{const fx=Math.max(0,Math.min(EF_W-1.001,x/EF_R)),fy=Math.max(0,Math.min(EF_H-1.001,y/EF_R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*EF_W+i;return(EF[k]*(1-tx)+EF[k+1]*tx)*(1-ty)+(EF[k+EF_W]*(1-tx)+EF[k+EF_W+1]*tx)*ty;};
  M.isWater=(x,y)=>M.edge(x,y)>0;
  M.hasWater=M.rivers.length+M.lakes.length>0;M.mtn=(x,y)=>M.hasMtn?M.mf(x,y):-1000;
  // compatibility helpers used by older code paths
  M.depth=(x,y)=>{const e=M.edge(x,y);return e>0?0:-e+200;};M.hw=()=>200;
  M.deeper=(x,y,r)=>{let best=[x,y],be=M.edge(x,y);for(let a=0;a<6.28;a+=.39)for(const rr of [r*.5,r]){const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;const e=M.edge(px,py);if(e>be){be=e;best=[px,py];}}return best;};
  // bridges: perpendicular across a river at a point along it
  for(const [ri,at] of (M.bridgeAt||[])){const rv=M.rivers[ri];if(!rv)continue;const P=rv.pts;let k=0;
    if(M.bridgeFrac){const target=at*rv.len;while(k<P.length-2&&rv.acc[k+1]<target)k++;}else{let bd=1e9;for(let q=0;q<P.length-1;q++){const d=Math.abs((P[q][0]+P[q+1][0])/2-at);if(d<bd){bd=d;k=q;}}}
    const a=P[k],b=P[k+1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,t=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-t[1],t[0]],cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
    let h=40;while(h<900&&(M.edge(cx+n[0]*h,cy+n[1]*h)>-8||M.edge(cx-n[0]*h,cy-n[1]*h)>-8))h+=8;h+=26;
    M.bridges.push({x:cx,y:cy,h,n,t,a:[cx-n[0]*h,cy-n[1]*h],b:[cx+n[0]*h,cy+n[1]*h]});}
  for(const [cx,cy,nx,ny] of M.bridgeAng){const n=[nx,ny],t=[-ny,nx];let h=40;while(h<900&&(M.edge(cx+n[0]*h,cy+n[1]*h)>-8||M.edge(cx-n[0]*h,cy-n[1]*h)>-8))h+=8;h+=26;M.bridges.push({x:cx,y:cy,h,n,t,a:[cx-n[0]*h,cy-n[1]*h],b:[cx+n[0]*h,cy+n[1]*h]});}
  const grid=new Uint8Array(GW*GH);
  for(let cy=0;cy<GH;cy++)for(let cx=0;cx<GW;cx++){const x=cx*CELL+CELL/2,y=cy*CELL+CELL/2;if(!M.isWater(x,y)){if(M.mtn(x,y)>0)grid[cy*GW+cx]=3;continue;}let v=1;
    for(const b of M.bridges){const dx=x-b.x,dy=y-b.y,along=Math.abs(dx*b.t[0]+dy*b.t[1]),acr=Math.abs(dx*b.n[0]+dy*b.n[1]);if(along<36&&acr<b.h+10)v=2;}grid[cy*GW+cx]=v;}
  M.grid=grid;
  // Cities: blocks of buildings on a street grid. Building lots are impassable (units use the streets) and give
  // infantry cover; bases, supply and oil keep clear of them.
  M.cities=[];M.cityBlds=[];
  if(D.cities){const CR=mulberry((seed|0)*13+7);for(const [cxd,cyd,rd,style] of D.cities){const cx=cxd*WK,cy=cyd*WK,r=rd*Math.pow(WK,.78)*1.3;M.cities.push({x:cx,y:cy,r,style});
    const i0=Math.floor((cx-r)/CELL),i1=Math.ceil((cx+r)/CELL),j0=Math.floor((cy-r)/CELL),j1=Math.ceil((cy+r)/CELL),sx=Math.floor(cx/CELL),sy=Math.floor(cy/CELL);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(i<1||j<1||i>=GW-1||j>=GH-1)continue;const x=i*CELL+CELL/2,y=j*CELL+CELL/2,d=Math.hypot(x-cx,y-cy);if(d>r)continue;
      if(((i-sx)%4+4)%4===0||((j-sy)%4+4)%4===0)continue;if(grid[j*GW+i]!==0)continue;if(BASES.some(([bx,by])=>Math.hypot(bx-x,by-y)<400))continue;
      if(M.edge(x,y)>-50||M.mtn(x,y)>-40)continue;const core=1-d/r;if(CR()>.42+.6*core)continue;grid[j*GW+i]=3;
      const tall=style==='russia'?18+core*46*CR():style==='america'?(core>.55?28+core*70*CR():8+CR()*5):style==='yemen'?16+CR()*22:style==='gulfcity'?(core>.35?45+core*110*CR():12+CR()*8):style==='korea'?24+core*50*CR():style==='asia'?14+core*38*CR():style==='europe'?9+CR()*9:style==='latin'?7+CR()*8:style==='southasia'?8+CR()*12:8+CR()*10+core*16*CR();
      if(CR()<.55&&tall<30){for(const [ox,oy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){if(CR()<.15)continue;M.cityBlds.push({x:x+ox*CELL*.24,y:y+oy*CELL*.24,w:CELL*(.36+CR()*.1),d:CELL*(.36+CR()*.1),h:tall*(.6+CR()*.7),style,core,v:CR()});}}
      else M.cityBlds.push({x,y,w:CELL*(.74+CR()*.18),d:CELL*(.74+CR()*.18),h:tall,style,core,v:CR()});}}}
  M.cityNear=(x,y,pad)=>M.cities.some(c=>Math.hypot(x-c.x,y-c.y)<c.r+(pad||0));
  {const reach=new Uint8Array(GW*GH),st=[];const s0=[Math.floor(BASES[0][0]/CELL),Math.floor(BASES[0][1]/CELL)];st.push(s0[1]*GW+s0[0]);reach[st[0]]=1;
   while(st.length){const c=st.pop(),cx=c%GW,cy=(c/GW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const k=ny*GW+nx;if(reach[k])continue;const v=grid[k];if(v===0||v===2){reach[k]=1;st.push(k);}}}M.reach=reach;}
  // supply fields and oil: one field by each base, then neutral ones placed in symmetric pairs
  const mir=D.sym==='none'?null:D.sym==='mirrorX'?([x,y])=>[MAPW-x,y]:D.sym==='mirrorY'?([x,y])=>[x,MAPH-y]:([x,y])=>[MAPW-x,MAPH-y];
  const dry=(x,y,m)=>x>90&&y>90&&x<MAPW-90&&y<MAPH-90&&!M.cityNear(x,y,60)&&M.edge(x,y)<-(m||90)&&M.mtn(x,y)<-(m||90)*.8&&M.reach[Math.floor(y/CELL)*GW+Math.floor(x/CELL)]===1;
  M.fields=[];M.oil=[];
  for(const [bx,by] of BASES){const a0=Math.atan2(MAPH/2-by,MAPW/2-bx);let put=false;for(let r of [390,430,350,470,300,250])for(let q=0;q<14&&!put;q++){const a=a0+(q%2?1:-1)*Math.ceil(q/2)*.35,fx=bx+Math.cos(a)*r,fy=by+Math.sin(a)*r;
      if(!dry(fx,fy,110))continue;if(BASES.some(([qx,qy])=>(qx!==bx||qy!==by)&&Math.hypot(qx-fx,qy-fy)<380))continue;if(M.fields.some(f=>Math.hypot(f.x-fx,f.y-fy)<220))continue;M.fields.push({x:fx,y:fy,r:46,amt:9000});put=true;}}
  const free=(x,y,minB,minF,minO)=>dry(x,y,110)&&BASES.every(([bx,by])=>Math.hypot(bx-x,by-y)>minB)&&M.fields.every(f=>Math.hypot(f.x-x,f.y-y)>minF)&&M.oil.every(o=>Math.hypot(o.x-x,o.y-y)>minO);
  const pairs=(want,push,minB,minF,minO)=>{let got=0;if(!mir)want*=2;for(let k=0;k<900&&got<want;k++){const p=[srnd(160,MAPW-160),srnd(160,MAPH-160)];if(!mir){if(free(p[0],p[1],minB,minF,minO)){push(p);got++;}continue;}const q=mir(p);if(Math.hypot(p[0]-q[0],p[1]-q[1])<260)continue;if(!free(p[0],p[1],minB,minF,minO))continue;const undo=push(p);if(!free(q[0],q[1],minB,minF,minO)){undo();continue;}push(q);got++;}return mir?got:got/2;};
  // neutral supply scales with the number of players: a duel has a few contested fields, an 8-way war many more
  {const want=2+Math.ceil(BASES.length*.75)+Math.max(0,Math.round((WK-1)*1.6));let got=0;for(const rl of [1,.8,.62,.5]){if(got>=want)break;got+=pairs(want-got,([x,y])=>{M.fields.push({x,y,r:46,amt:9000});return()=>M.fields.pop();},(D.fieldMinB||520)*Math.min(1,WK)*rl,(D.fieldMinB?240:300)*Math.min(1,WK)*rl,0);}}
  {const want=2+Math.ceil(BASES.length/2)+Math.max(0,Math.round((WK-1)*1.1));let got=0;for(const rl of [1,.8,.62,.5]){if(got>=want)break;got+=pairs(want-got,([x,y])=>{M.oil.push({x,y,owner:-1,cp:[0,0],inc:0});return()=>M.oil.pop();},(D.fieldMinB||470)*Math.min(1,WK)*rl,170*Math.min(1,WK)*rl,(D.fieldMinB?220:300)*Math.min(1,WK)*rl);}}
  return M;
}
// P_B: while planning a route (pathfinding / line of sight in navTo), ground cells under buildings count as blocked,
// so units route around bases instead of walking into walls. Plain movement checks ignore buildings (separation handles them).
let P_B=false;
function bocc(){if(!G.bocc||G.bdirty){G.bdirty=false;G.boccV=(G.boccV|0)+1;const o=G.bocc||(G.bocc=new Uint8Array(GW*GH));o.fill(0);for(const b of G.ents){if(!b.isB||b.dead)continue;const h=b.size/2-CELL*.25;
  const x0=Math.ceil((b.x-h)/CELL-.5),x1=Math.floor((b.x+h)/CELL-.5),y0=Math.ceil((b.y-h)/CELL-.5),y1=Math.floor((b.y+h)/CELL-.5);for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)if(cx>=0&&cy>=0&&cx<GW&&cy<GH)o[cy*GW+cx]=1;}}return G.bocc;}
function passC(dom,cx,cy){if(cx<0||cy<0||cx>=GW||cy>=GH)return false;const i=cy*GW+cx,v=G.grid[i];if(dom==='naval')return v===1||v===2;if(v!==0&&v!==2)return false;return !(P_B&&G.bocc&&G.bocc[i]);}
function passXY(dom,x,y){return dom==='air'||passC(dom,Math.floor(x/CELL),Math.floor(y/CELL));}
function los(dom,x0,y0,x1,y1){if(dom==='air')return true;const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/16);for(let i=1;i<=n;i++){const t=i/n;if(!passXY(dom,x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
function nearestPass(dom,cx,cy){if(passC(dom,cx,cy))return[cx,cy];for(let r=1;r<16;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;if(passC(dom,cx+dx,cy+dy))return[cx+dx,cy+dy];}return null;}
function nearestPassXY(dom,x,y){const c=nearestPass(dom,Math.floor(x/CELL),Math.floor(y/CELL));if(!c)return null;if(passXY(dom,x,y))return[x,y];return[c[0]*CELL+CELL/2,c[1]*CELL+CELL/2];}
let PN=GW*GH,P_g=new Float32Array(PN),P_came=new Int32Array(PN),P_mark=new Uint32Array(PN),P_closed=new Uint32Array(PN);let P_stamp=1;
function setWorld(k){k=k||1;WK=k;MAPW=Math.round(3200*k/CELL)*CELL;MAPH=Math.round(2200*k/CELL)*CELL;GW=Math.ceil(MAPW/CELL);GH=Math.ceil(MAPH/CELL);EF_R=Math.max(8,Math.round(8*k/1.25));EF_W=Math.ceil(MAPW/EF_R)+1;EF_H=Math.ceil(MAPH/EF_R)+1;
  if(GW*GH!==PN){PN=GW*GH;P_g=new Float32Array(PN);P_came=new Int32Array(PN);P_mark=new Uint32Array(PN);P_closed=new Uint32Array(PN);P_stamp=1;}if(typeof HW!=='undefined')HW=Math.ceil(MAPW/HC)+2;}
// Clearance cost: ground cells touching impassable ground cost a little more, so routes run down the middle of
// streets and passes instead of scraping along walls, shorelines and cliffs. Rebuilt when the grid changes.
let P_W=null,P_Wv=-1,P_Wg=null;function wallCost(){if(P_W&&P_Wg===G.grid&&P_Wv===(G.gridV|0)&&P_W.length===GW*GH)return P_W;P_W=new Float32Array(GW*GH);P_Wv=G.gridV|0;P_Wg=G.grid;const g=G.grid;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const i=y*GW+x;if(g[i]!==0&&g[i]!==2)continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=GW||Y>=GH){n++;continue;}const v=g[Y*GW+X];if(v!==0&&v!==2)n++;}P_W[i]=Math.min(.9,n*.18);}return P_W;}
// Connected regions of land and water (flood-filled once per map, redone if a building collapse opens a street).
// A unit sent somewhere it can't reach (an island, across the sea) is re-targeted to the nearest cell it CAN reach
// instead of letting the search scan the whole map first.
const P_REG={};function regions(dom){const key=dom;let R=P_REG[key];if(R&&R.g===G.grid&&R.v===(G.gridV|0)&&R.a.length===GW*GH)return R.a;
  const a=new Int32Array(GW*GH),pass=i=>{const v=G.grid[i];return dom==='naval'?(v===1||v===2):(v===0||v===2);};let id=0;const st=[];
  for(let i=0;i<a.length;i++){if(a[i]||!pass(i))continue;id++;a[i]=id;st.push(i);while(st.length){const c=st.pop(),cx=c%GW,cy=(c/GW)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const n=ny*GW+nx;if(a[n]||!pass(n))continue;if(dx&&dy&&(!pass(cy*GW+nx)||!pass(ny*GW+cx)))continue;a[n]=id;st.push(n);}}}
  P_REG[key]={a,g:G.grid,v:G.gridV|0};return a;}
function nearestInRegion(R,reg,gx,gy){for(let r=1;r<90;r++){let best=-1,bd=1e9;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=gx+dx,y=gy+dy;if(x<0||y<0||x>=GW||y>=GH)continue;if(R[y*GW+x]!==reg)continue;const d=dx*dx+dy*dy;if(d<bd){bd=d;best=y*GW+x;}}if(best>=0)return[best%GW,(best/GW)|0];}return null;}
function findPath(dom,sx,sy,tx,ty){
  const s0=nearestPass(dom,Math.floor(sx/CELL),Math.floor(sy/CELL));let g0=nearestPass(dom,Math.floor(tx/CELL),Math.floor(ty/CELL));if(!s0||!g0)return null;
  let unreach=false;if(dom==='ground'||dom==='naval'){const R=regions(dom),rs=R[s0[1]*GW+s0[0]];if(rs&&R[g0[1]*GW+g0[0]]!==rs){const q=nearestInRegion(R,rs,g0[0],g0[1]);if(!q)return null;g0=q;unreach=true;}}
  const st=++P_stamp,start=s0[1]*GW+s0[0],goal=g0[1]*GW+g0[0];const gx=g0[0],gy=g0[1];
  // binary heap on typed arrays (no per-node allocations)
  if(!findPath.hf||findPath.hf.length<PN*4){findPath.hf=new Float32Array(PN*4);findPath.hi=new Int32Array(PN*4);}const HF=findPath.hf,HI=findPath.hi;let HN=0;
  const push=(f,i)=>{let k=HN++;while(k>0){const p=(k-1)>>1;if(HF[p]<=f)break;HF[k]=HF[p];HI[k]=HI[p];k=p;}HF[k]=f;HI[k]=i;};
  const pop=()=>{const top=HI[0];HN--;if(HN>0){const f=HF[HN],v=HI[HN];let k=0;for(;;){const l=2*k+1,r=l+1;let m=-1,mf=f;if(l<HN&&HF[l]<mf){m=l;mf=HF[l];}if(r<HN&&HF[r]<mf){m=r;}if(m<0)break;HF[k]=HF[m];HI[k]=HI[m];k=m;}HF[k]=f;HI[k]=v;}return top;};
  const hfn=(cx,cy)=>{const dx=Math.abs(cx-gx),dy=Math.abs(cy-gy);return dx+dy-.586*Math.min(dx,dy);};
  const WC=dom==='ground'?wallCost():null;let bestN=start,bestH=hfn(s0[0],s0[1]);
  P_mark[start]=st;P_g[start]=0;P_came[start]=-1;push(hfn(s0[0],s0[1]),start);let it=0,found=false;
  while(HN>0&&it++<Math.max(9000,PN*.45)&&HN<PN*4-8){const cur=pop();if(P_closed[cur]===st)continue;P_closed[cur]=st;if(cur===goal){found=true;break;}
    const cx=cur%GW,cy=(cur/GW)|0;{const hh=hfn(cx,cy);if(hh<bestH){bestH=hh;bestN=cur;}}
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(!passC(dom,nx,ny))continue;if(dx&&dy&&(!passC(dom,cx+dx,cy)||!passC(dom,cx,cy+dy)))continue;
      const ni=ny*GW+nx;if(P_closed[ni]===st)continue;const ng=P_g[cur]+(dx&&dy?1.414:1)*(WC?1+WC[ni]:1);if(P_mark[ni]!==st||ng<P_g[ni]){P_mark[ni]=st;P_g[ni]=ng;P_came[ni]=cur;push(ng+hfn(nx,ny),ni);}}}
  let end=goal;if(!found){if(bestN===start||bestH>hfn(s0[0],s0[1])-2)return null;end=bestN;}
  const cells=[];for(let c=end;c!==-1;c=P_came[c])cells.push(c);cells.reverse();
  const pts=cells.map(c=>[(c%GW)*CELL+CELL/2,((c/GW)|0)*CELL+CELL/2]);if(found&&!unreach&&passXY(dom,tx,ty))pts[pts.length-1]=[tx,ty];
  const out=[];let ax=sx,ay=sy,i=0;while(i<pts.length){let j=pts.length-1;while(j>i&&!los(dom,ax,ay,pts[j][0],pts[j][1]))j--;out.push(pts[j]);ax=pts[j][0];ay=pts[j][1];i=j+1;}
  return out;
}

function paintTerrain(M){const TEXMAX=Math.min(3072,(typeof R3!=='undefined'&&R3&&R3.capabilities)?R3.capabilities.maxTextureSize:4096);
  srand=mulberry(M.seed*7+3);
  const TS=Math.min(1,TEXMAX/MAPW,TEXMAX/MAPH),TA=Math.max(1,MAPW*MAPH*TS*TS/(3200*2200));const c=document.createElement('canvas');c.width=Math.round(MAPW*TS);c.height=Math.round(MAPH*TS);const t=c.getContext('2d',{willReadFrequently:true});t.setTransform(TS,0,0,TS,0,0);
  t.fillStyle='#a8825a';t.fillRect(0,0,MAPW,MAPH);
  const blotch=(cells,cols,al)=>{const w=Math.ceil(MAPW/cells)+1,h=Math.ceil(MAPH/cells)+1,s=document.createElement('canvas');s.width=w;s.height=h;const sx=s.getContext('2d'),id=sx.createImageData(w,h);
    for(let i=0;i<w*h;i++){const q=cols[Math.floor(srand()*cols.length)];id.data.set([q[0],q[1],q[2],255*al*srand()],i*4);}sx.putImageData(id,0,0);t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';t.drawImage(s,0,0,MAPW+cells,MAPH+cells);};
  blotch(260,[[178,138,96],[164,120,82],[190,152,108],[150,108,74],[172,134,92]],1);blotch(90,[[184,146,102],[154,114,80],[198,164,118],[140,104,72]],.7);blotch(30,[[172,146,104],[154,130,92],[128,112,78]],.45);blotch(9,[[140,120,84],[200,178,134]],.2);
  {const P=(n,col,rmin,rmax,al)=>{for(let k=0;k<n;k++){const x=srand()*MAPW,y=srand()*MAPH,r=srnd(rmin,rmax);for(let q=0;q<5;q++){const qx=x+srnd(-r,r)*.6,qy=y+srnd(-r,r)*.6,qr=r*srnd(.4,.8);const g=t.createRadialGradient(qx,qy,0,qx,qy,qr);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(.6,`rgba(${col},${al*.5})`);g.addColorStop(1,`rgba(${col},0)`);t.fillStyle=g;t.beginPath();t.ellipse(qx,qy,qr,qr*srnd(.5,1),srnd(0,3),0,7);t.fill();}}};
   P(140*TA|0,'126,104,72',20,70,.4);P(220*TA|0,'112,108,70',10,40,.3);P(160*TA|0,'206,186,140',8,26,.35);
   for(let k=0;k<26000*TA;k++){const x=srand()*MAPW,y=srand()*MAPH,v=srand();t.fillStyle=v<.4?'rgba(96,80,56,.35)':v<.8?'rgba(214,196,152,.35)':'rgba(120,104,76,.4)';t.fillRect(x,y,srnd(1,2.6),srnd(1,2.6));}}
  for(let k=0;k<70*TA;k++){const cx=srand()*MAPW,cy=srand()*MAPH,R=srnd(70,170);const pts=[];for(let i=0;i<55;i++){const a=srand()*6.283,r=Math.sqrt(srand())*R;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8]);}
    for(const [ax,ay] of pts){const nb=pts.map(q=>[q,(q[0]-ax)**2+(q[1]-ay)**2]).sort((u,v)=>u[1]-v[1]).slice(1,4);for(const [[bx,by]] of nb){const fade=1-Math.hypot(ax-cx,ay-cy)/R;if(fade<=0)continue;t.strokeStyle=`rgba(86,66,44,${.4*fade})`;t.lineWidth=1.3;t.beginPath();t.moveTo(ax,ay);t.lineTo((ax+bx)/2+srnd(-3,3),(ay+by)/2+srnd(-3,3));t.lineTo(bx,by);t.stroke();t.strokeStyle=`rgba(226,208,166,${.22*fade})`;t.lineWidth=1;t.beginPath();t.moveTo(ax+1,ay+1);t.lineTo(bx+1,by+1);t.stroke();}}}
  // water and shore, painted from the edge field at half resolution then scaled up smoothly
  if(M.hasWater){const SP=2/TS,W2=Math.ceil(MAPW/SP),H2=Math.ceil(MAPH/SP),wc=document.createElement('canvas');wc.width=W2;wc.height=H2;const wx=wc.getContext('2d'),wi=wx.createImageData(W2,H2),wd=wi.data;
    const ss=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};const L=[[-60,[214,192,140],.45],[-30,[201,174,124],1],[-16,[156,133,96],1],[-7,[122,102,73],1]];
    for(let j=0;j<H2;j++)for(let i=0;i<W2;i++){const x=i*SP+SP/2,y=j*SP+SP/2,e=M.edge(x,y);if(e<-62)continue;let r=0,g=0,b=0,al=0;
      const over=(c,a)=>{if(a<=0)return;const na=a+al*(1-a);r=(c[0]*a+r*al*(1-a))/na;g=(c[1]*a+g*al*(1-a))/na;b=(c[2]*a+b*al*(1-a))/na;al=na;};
      for(const [o,c,a] of L)over(c,a*ss(o-6,o+6,e)*(.85+.15*Math.sin(x*.05+y*.037)));
      const u=(x+y)/(MAPW+MAPH);over([44-4*Math.sin(u*6),92-6*Math.sin(u*6),102-3*Math.sin(u*6)],ss(-1.5,1.5,e));
      over([28,66,80],.55*ss(25,55,e));over([18,50,66],.55*ss(75,115,e));over([12,40,56],.5*ss(125,160,e));
      const k=(j*W2+i)*4;wd[k]=r;wd[k+1]=g;wd[k+2]=b;wd[k+3]=al*255;}
    wx.putImageData(wi,0,0);t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';t.drawImage(wc,0,0,W2*SP,H2*SP);}
  // mountains: rock faces, scree at the foot, snow on the peaks
  if(M.hasMtn){const SP=2/TS,W2=Math.ceil(MAPW/SP),H2=Math.ceil(MAPH/SP),mc=document.createElement('canvas');mc.width=W2;mc.height=H2;const mx2=mc.getContext('2d'),mi=mx2.createImageData(W2,H2),md=mi.data;const snow=M.theme==='snow';
    for(let j=0;j<H2;j++)for(let i=0;i<W2;i++){const x=i*SP+SP/2,y=j*SP+SP/2,m=M.mf(x,y);if(m<-70)continue;const n=Math.sin(x*.05+y*.031)*.5+Math.sin(x*.13-y*.11)*.3+Math.sin(x*.37+y*.29)*.2;const str=Math.sin((x*.6+y*.25)*.09+n*3);
      let r,g,b,a;if(m<0){const k=(m+70)/70;r=120+20*n;g=106+16*n;b=86+12*n;a=k*k*.7;}else{const v=.75+.18*n+.1*str;r=110*v;g=100*v;b=88*v;a=.95;if(snow){r=r*.6+60;g=g*.6+66;b=b*.6+78;}}
      const cap=snow?20:75;if(m>cap){const k=Math.min(1,(m-cap)/30)*(.75+.25*Math.max(0,str));r=r*(1-k)+236*k;g=g*(1-k)+240*k;b=b*(1-k)+246*k;}
      const q=(j*W2+i)*4;md[q]=r;md[q+1]=g;md[q+2]=b;md[q+3]=a*255;}
    mx2.putImageData(mi,0,0);t.imageSmoothingEnabled=true;t.drawImage(mc,0,0,W2*SP,H2*SP);}
  // base pads
  // roads
  const RP=[];const road=(pts,w)=>{for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],n=Math.ceil(Math.hypot(bx-ax,by-ay)/40);for(let j=0;j<=n;j++)RP.push([ax+(bx-ax)*j/n,ay+(by-ay)*j/n]);}
    const path=()=>{t.beginPath();t.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;t.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}const l=pts[pts.length-1];t.lineTo(l[0],l[1]);};
    t.lineCap='round';t.lineJoin='round';path();t.strokeStyle='rgba(176,150,108,.22)';t.lineWidth=w+26;t.stroke();path();t.strokeStyle='rgba(70,60,40,.22)';t.lineWidth=w+8;t.stroke();path();t.strokeStyle='rgba(138,116,84,.62)';t.lineWidth=w;t.stroke();
    {const P=[];let cx=pts[0][0],cy=pts[0][1];P.push([cx,cy]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;for(let k=1;k<=24;k++){const u=k/24,a=(1-u)*(1-u),b=2*u*(1-u),c=u*u;P.push([a*cx+b*pts[i][0]+c*mx,a*cy+b*pts[i][1]+c*my]);}cx=mx;cy=my;}const l=pts[pts.length-1];for(let k=1;k<=12;k++)P.push([cx+(l[0]-cx)*k/12,cy+(l[1]-cy)*k/12]);
     const off=(o,jit)=>{t.beginPath();for(let i=0;i<P.length;i++){const p=P[Math.max(0,i-1)],q=P[Math.min(P.length-1,i+1)];let dx=q[0]-p[0],dy=q[1]-p[1];const L=Math.hypot(dx,dy)||1;const nx=-dy/L,ny=dx/L,j=Math.sin(i*.21+o)*jit;const x=P[i][0]+nx*(o+j),y=P[i][1]+ny*(o+j);i?t.lineTo(x,y):t.moveTo(x,y);}};
     for(const sg of [-1,1]){off(sg*w*.24,1.6);t.strokeStyle='rgba(84,68,46,.26)';t.lineWidth=w*.17;t.stroke();off(sg*w*.24,1.2);t.strokeStyle='rgba(62,50,34,.3)';t.lineWidth=w*.07;t.stroke();off(sg*w*.24+w*.1*sg,1);t.strokeStyle='rgba(196,172,128,.16)';t.lineWidth=w*.05;t.stroke();}
     off(0,2);t.strokeStyle='rgba(168,146,104,.28)';t.lineWidth=w*.2;t.stroke();
     for(let i=0;i<P.length;i+=2){if(srand()>.35)continue;const [x,y]=P[i];t.fillStyle='rgba(66,54,38,.22)';t.beginPath();t.ellipse(x+srnd(-w*.35,w*.35),y+srnd(-w*.35,w*.35),srnd(2,6),srnd(1.5,4),srnd(0,3),0,7);t.fill();}}};
  {const crosses=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/30);for(let i=1;i<n-1;i++){const x=a[0]+(b[0]-a[0])*i/n,y=a[1]+(b[1]-a[1])*i/n;if(M.edge(x,y)>-25||M.mtn(x,y)>-30)return true;}return false;};
   const mid=(a,b)=>{for(let k=0;k<6;k++){const m=[(a[0]+b[0])/2+srnd(-60,60),(a[1]+b[1])/2+srnd(-60,60)];if(M.edge(m[0],m[1])<-60)return m;}return[(a[0]+b[0])/2,(a[1]+b[1])/2];};
   const linked=new Set(),ends=[];for(const b of M.bridges)for(const e of [b.a,b.b])ends.push(e);
   for(const e of ends){const c=BASES.map((B,i)=>[i,Math.hypot(B[0]-e[0],B[1]-e[1])]).filter(([i])=>!crosses(BASES[i],e)).sort((p,q)=>p[1]-q[1]);if(c.length){const i=c[0][0];road([BASES[i],mid(BASES[i],e),e],38);linked.add(i);}}
   BASES.forEach((B,i)=>{if(linked.has(i))return;const c=ends.filter(e=>!crosses(B,e)).sort((p,q)=>Math.hypot(p[0]-B[0],p[1]-B[1])-Math.hypot(q[0]-B[0],q[1]-B[1]));if(c.length){road([B,mid(B,c[0]),c[0]],34);return;}
     let hx=MAPW/2,hy=MAPH/2;const a=Math.atan2(hy-B[1],hx-B[0]);const L=Math.hypot(hx-B[0],hy-B[1]);for(let r=300;r<L;r+=20){const x=B[0]+Math.cos(a)*r,y=B[1]+Math.sin(a)*r;if(M.edge(x,y)>-170||M.mtn(x,y)>-120){hx=B[0]+Math.cos(a)*(r-40);hy=B[1]+Math.sin(a)*(r-40);break;}}
     if(!crosses(B,[hx,hy]))road([B,mid(B,[hx,hy]),[hx,hy]],34);});}
  for(const [bx,by] of BASES){const R=276;
    // worn dirt apron blending pad into terrain
    const ap=t.createRadialGradient(bx,by,R*.9,bx,by,R*1.45);ap.addColorStop(0,'rgba(122,108,80,.75)');ap.addColorStop(1,'rgba(122,108,80,0)');t.fillStyle=ap;t.fillRect(bx-R*1.5,by-R*1.5,R*3,R*3);
    {t.fillStyle=M.theme==='green'?'#9b9a92':'#a3967f';t.beginPath();const cr=70,N=96;for(let q=0;q<=N;q++){const a=q/N*6.2832,ca=Math.cos(a),sa=Math.sin(a);const sq=Math.pow(Math.pow(Math.abs(ca),5)+Math.pow(Math.abs(sa),5),-1/5);const rr=(R-cr*.25)*sq*(1+.025*Math.sin(a*7+bx)+.015*Math.sin(a*13+by));const x=bx+ca*rr,y=by+sa*rr;q?t.lineTo(x,y):t.moveTo(x,y);}t.closePath();t.fill();{const fc=t.fillStyle;t.save();try{t.filter='blur('+Math.max(4,Math.round(14*TS))+'px)';}catch(e){}t.strokeStyle=fc;t.globalAlpha=.55;t.lineWidth=34;t.stroke();t.globalAlpha=.3;t.lineWidth=64;t.stroke();t.restore();}
     t.save();t.clip();
    // slab tone variation
    for(let k=0;k<70;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(20,70),v=srnd(-8,8);const g=t.createRadialGradient(x,y,0,x,y,r);const gC=M.theme==='green'?`${150+v|0},${149+v|0},${144+v|0}`:`${156+v|0},${143+v|0},${120+v|0}`;g.addColorStop(0,`rgba(${gC},.22)`);g.addColorStop(1,`rgba(${gC},0)`);t.fillStyle=g;t.fillRect(x-r,y-r,2*r,2*r);}
    // fine aggregate speckle
    {const X0=Math.round((bx-R)*TS),Y0=Math.round((by-R)*TS),RW=Math.max(1,Math.round(2*R*TS));const sp=t.getImageData(X0,Y0,RW,RW),d=sp.data;for(let k=0;k<d.length;k+=4){const n=(srand()-.5)*14;d[k]+=n;d[k+1]+=n;d[k+2]+=n*.9;}t.putImageData(sp,X0,Y0);}
    // grime, oil stains and weathering
    for(let k=0;k<60;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(6,34);const g=t.createRadialGradient(x,y,0,x,y,r);const dk=srand()<.4;g.addColorStop(0,dk?'rgba(34,30,26,.35)':(M.theme==='green'?'rgba(90,89,85,.22)':'rgba(96,88,72,.22)'));g.addColorStop(1,'rgba(40,36,30,0)');t.fillStyle=g;t.beginPath();t.ellipse(x,y,r,r*srnd(.5,1),srnd(0,3),0,7);t.fill();}
    // expansion joints (thin, sealed)
    // cracks
    t.strokeStyle='rgba(50,46,40,.45)';t.lineWidth=.8;for(let k=0;k<40;k++){let x=bx+srnd(-R,R),y=by+srnd(-R,R),a=srnd(0,6.3);t.beginPath();t.moveTo(x,y);for(let q=0;q<6;q++){a+=srnd(-.7,.7);x+=Math.cos(a)*srnd(3,9);y+=Math.sin(a)*srnd(3,9);t.lineTo(x,y);}t.stroke();}
    // windblown sand drifting over the slab, heavier at the edges
    {const wa=.6,GRn=M.theme==='green',DC1=GRn?'146,144,138':'178,142,100',DC2=GRn?'146,144,138':'176,142,102',DA=GRn?.35:1;for(let k=0;k<220;k++){const side=srand()*4|0,u=srnd(-R,R),inn=Math.pow(srand(),2.2)*R*.9;let x,y;if(side===0){x=bx+u;y=by-R+inn;}else if(side===1){x=bx+u;y=by+R-inn;}else if(side===2){x=bx-R+inn;y=by+u;}else{x=bx+R-inn;y=by+u;}const r=srnd(10,48)*(1.2-inn/R*.6),al=.85*(1-inn/R*.6)*srnd(.45,1);const g=t.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${DC1},${al*DA})`);g.addColorStop(.6,`rgba(${DC2},${al*.45*DA})`);g.addColorStop(1,`rgba(${DC2},0)`);t.fillStyle=g;t.beginPath();t.ellipse(x,y,r*1.8,r*.55,wa+srnd(-.2,.2),0,7);t.fill();}
     for(let k=0;k<70;k++){const x=bx+srnd(-R,R),y=by+srnd(-R,R),r=srnd(10,30);t.fillStyle=GRn?`rgba(146,144,138,${srnd(.05,.1)})`:`rgba(170,138,98,${srnd(.08,.18)})`;t.beginPath();t.ellipse(x,y,r*2.4,r*.35,wa+srnd(-.15,.15),0,7);t.fill();}}
    // tyre tracks
    for(let k=0;k<7;k++){const x0=bx+srnd(-R*.8,R*.8),y0=by+srnd(-R*.8,R*.8),a=srnd(0,6.3),L=srnd(80,200),c=srnd(-.004,.004);t.strokeStyle='rgba(40,36,30,.13)';t.lineWidth=4;for(const off of [-7,7]){t.beginPath();for(let q=0;q<=20;q++){const u=q/20*L,aa=a+c*u;const x=x0+Math.cos(a)*u-Math.sin(aa)*off,y=y0+Math.sin(a)*u+Math.cos(aa)*off;q?t.lineTo(x,y):t.moveTo(x,y);}t.stroke();}}
    // painted markings, faded

    t.restore();}}
  for(const f of M.fields){const g=t.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*1.8);g.addColorStop(0,'rgba(120,96,60,.6)');g.addColorStop(1,'rgba(120,96,60,0)');t.fillStyle=g;t.beginPath();t.arc(f.x,f.y,f.r*1.8,0,7);t.fill();}
  {const C=16,w=Math.ceil(MAPW/C),h=Math.ceil(MAPH/C),d=new Uint8Array(w*h);for(const [a,b] of RP){const r=2;const ci=a/C|0,cj=b/C|0;for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const x=ci+i,y=cj+j;if(x>=0&&y>=0&&x<w&&y<h&&Math.hypot(i,j)<=r)d[y*w+x]=1;}}const f=new Float32Array(w*h),R2=7;for(const [a,b] of RP){const ci=a/C|0,cj=b/C|0;for(let i=-R2;i<=R2;i++)for(let j=-R2;j<=R2;j++){const x=ci+i,y=cj+j;if(x<0||y<0||x>=w||y>=h)continue;const v=1-Math.max(0,(Math.hypot(i,j)-2)/(R2-2));if(v>f[y*w+x])f[y*w+x]=v;}}G.roadMask={C,w,h,d,f};}
  const roadD=(x,y)=>{let m=1e12;for(const [a,b] of RP){const d=(a-x)**2+(b-y)**2;if(d<m)m=d;}return Math.sqrt(m);};
  const clear=(x,y,pad=0)=>!M.cityNear(x,y,30+pad)&&Math.abs(M.depth(x,y))>M.hw(x)+60+pad&&M.mtn(x,y)<-30-pad&&BASES.every(([bx,by])=>Math.hypot(x-bx,y-by)>340)&&M.fields.every(f=>Math.hypot(f.x-x,f.y-y)>f.r+60)&&M.oil.every(o=>Math.hypot(o.x-x,o.y-y)>70);
  const AR=Math.min(3,Math.max(1,MAPW*MAPH/(3200*2200)));for(let i=0;i<26*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y))continue;const r=srnd(14,34);const g=t.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,'rgba(40,34,22,.35)');g.addColorStop(.8,'rgba(40,34,22,.1)');g.addColorStop(.9,'rgba(170,150,110,.25)');g.addColorStop(1,'rgba(170,150,110,0)');t.fillStyle=g;t.beginPath();t.arc(x,y,r,0,7);t.fill();}
  for(let i=0;i<480*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y))continue;const n=2+srand()*4|0,sz=srnd(4,9);
    for(let j=0;j<n;j++){const ox=x+srnd(-sz*1.4,sz*1.4),oy=y+srnd(-sz,sz),r=sz*srnd(.6,1.1);const g=t.createRadialGradient(ox,oy,0,ox,oy,r*1.3);g.addColorStop(0,'rgba(104,92,60,.32)');g.addColorStop(.7,'rgba(118,104,70,.16)');g.addColorStop(1,'rgba(118,104,70,0)');t.fillStyle=g;t.beginPath();t.arc(ox,oy,r*1.3,0,7);t.fill();}}
  // forests
  const trees=[];
  for(let i=0;i<70*AR;i++){const cx=srnd(80,MAPW-80),cy=srnd(80,MAPH-80);if(!clear(cx,cy,40)||roadD(cx,cy)<150)continue;const n=10+srand()*26|0;for(let j=0;j<n;j++){const x=cx+srnd(-150,150),y=cy+srnd(-100,100);if(clear(x,y)&&roadD(x,y)>70)trees.push([x,y]);}}
  G.treePos=trees.map(([x,y])=>[x,y,srnd(.75,1.35),srnd(0,6.28)]);
  for(let i=0;i<90*TA;i++){const x=srnd(0,MAPW),y=srnd(0,MAPH);if(!clear(x,y)||roadD(x,y)<40)continue;const m=1+srand()*3|0;
    for(let j=0;j<m;j++){const cx=x+srnd(-18,18),cy=y+srnd(-12,12),r=srnd(7,20),pts=[],k=7+srand()*4|0;for(let q=0;q<k;q++){const a=q/k*6.28,rr=r*srnd(.7,1.1);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.75]);}
      const poly=(dx,dy)=>{t.beginPath();pts.forEach((p,q)=>q?t.lineTo(p[0]+dx,p[1]+dy):t.moveTo(p[0]+dx,p[1]+dy));t.closePath();};poly(r*.35,r*.3);t.fillStyle='rgba(25,22,14,.4)';t.fill();poly(0,0);const g=t.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#a59c86');g.addColorStop(.55,'#7a725f');g.addColorStop(1,'#4d473a');t.fillStyle=g;t.fill();t.strokeStyle='rgba(40,36,28,.5)';t.lineWidth=1;t.stroke();}}
  for(const c of M.cities){const g=t.createRadialGradient(c.x,c.y,0,c.x,c.y,c.r*1.15);g.addColorStop(0,'rgba(120,112,98,.55)');g.addColorStop(.85,'rgba(126,116,98,.35)');g.addColorStop(1,'rgba(126,116,98,0)');t.fillStyle=g;t.beginPath();t.arc(c.x,c.y,c.r*1.15,0,7);t.fill();}
  for(const b of M.cityBlds){t.fillStyle=b.style==='russia'?'#77736c':b.style==='america'?'#8a8278':'#b8a888';t.fillRect(b.x-b.w/2,b.y-b.d/2,b.w,b.d);}
  const CW=c.width,CH=c.height,id=t.getImageData(0,0,CW,CH),d=id.data;const SN=M.theme==='snow',GR=M.theme==='green';const WS=new Float32Array(CW);for(let x=0;x<CW;x++)WS[x]=Math.sin(x/TS*.0021);for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*16;if(GR&&!(d[i+2]>d[i]+10)){const gy=Math.max(Math.abs(d[i]-d[i+1]),Math.abs(d[i+1]-d[i+2])*.72),gk=Math.max(0,Math.min(1,(gy-5)/13));if(gk>0){const px=(i>>2)%CW,py=((i>>2)/CW)|0;const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11,w=WS[px]*Math.cos(py/TS*.0017)*.5+.5;d[i]=d[i]*(1-gk)+(l*.42+30+18*w+n)*gk;d[i+1]=d[i+1]*(1-gk)+(l*.52+56+10*w+n)*gk;d[i+2]=d[i+2]*(1-gk)+(l*.3+22+n*.6)*gk;continue;}}if(SN&&!(d[i+2]>d[i]+10)){const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=l*.42+128+n*.6;d[i+1]=l*.44+134+n*.6;d[i+2]=l*.45+146+n*.6;continue;}d[i]+=n;d[i+1]+=n;d[i+2]+=n*.8;}t.putImageData(id,0,0);
  const e=t.createRadialGradient(MAPW/2,MAPH/2,MAPH*.55,MAPW/2,MAPH/2,MAPW*.72);e.addColorStop(0,'rgba(0,0,0,0)');e.addColorStop(1,'rgba(0,0,0,.35)');t.fillStyle=e;t.fillRect(0,0,MAPW,MAPH);
  G.terrain=c;G.tctx=t;buildHGrid();const th=document.createElement('canvas');th.width=mm.width;th.height=mm.height;th.getContext('2d').drawImage(c,0,0,th.width,th.height);G.thumb=th;
  srand=Math.random;
}

