/* ================= REAL-PLACE MAPS (Abdullah 2026-11-05 18:43; orch/reports/real-maps.md) =================
   Terrain shaped after real places (inspired, not exact: fairness wins). All are 4-fold symmetric ('quad': every corner base has the
   same ground, rivers, ridges and towns as every other), so nation and seat strength cancel and only the geometry is left.
   The north-west quarter is written once and mirrored (mirrorMap x then y); cities likewise (mirrorList). Designed on 3200 x 2200.
   The rivers/ridges are deterministic apart from the phase of the wiggle, which comes from the seed like on every other map.
   'ssn' = the map's default season (Seasons: 1 summer, 2 autumn mud, 3 winter snow; the lobby can override).
   Starts: four corners first (2-4 players take opposite corners), then the two middle-of-the-side positions for 5-6. */
{
const QS=[[420,300],[2780,1900],[2780,300],[420,1900],[420,1100],[2780,1100]];
const Q4=L=>mirrorList(mirrorList(L,'x'),'y');
const wig=(x0,x1,yf,st)=>{const p=[];for(let x=x0;x<=x1;x+=st||40)p.push([x,yf(x)]);return p;};
Object.assign(MAPS,{
  donbas:{name:'Donbas Steppe',min:2,max:6,sym:'quad',theme:'green',ssn:2,home:['UA','RU'],tag:'open fields · two rivers · mining towns · autumn mud',
    desc:'The open black-earth steppe of eastern Ukraine: two meandering rivers, slag-heap hills and mining towns around a big crossroads town. Best in autumn mud, when only the roads move fast.',
    slots:QS,cities:Q4([[1050,420,95,'russia'],[520,990,80,'russia']]).concat([[1600,1100,140,'russia']]),
    water(M,R){const ph=R()*6.28;M.rivers.push({pts:wig(-200,1600,x=>720+55*Math.sin(x*.0042+ph)+22*Math.sin(x*.012+ph*2)),hw:()=>52});M.bridgeAt=[[0,.5],[0,.86]];M.bridgeFrac=true;
      M.peaks.push({x:1150,y:1000,r:48,rx:1.6,rot:.4},{x:860,y:420,r:44,rx:1.3,rot:-.3},{x:300,y:560,r:40,rx:1.2,rot:.2});M.lakes.push({x:1330,y:470,r:62,rx:1.4,wob:q=>.1*Math.sin(q*3+ph)});mirrorMap(M,'x');mirrorMap(M,'y');}},
  golanplateau:{name:'Golan Plateau',min:2,max:4,sym:'quad',theme:'green',rough:1.5,ssn:1,home:['IL','RS','SY'],tag:'basalt plateau · valleys · lakes · passes',
    desc:'A raised basalt plateau in the middle, walled by ridges with narrow passes, and green valleys and lakes on both sides. Whoever holds the plateau town holds the passes.',
    slots:QS,cities:Q4([[640,400,100,'lebanon'],[1000,880,75,'mideast']]).concat([[1600,1100,130,'mideast']]),
    water(M,R){const ph=R()*6.28;const rg=[];for(let y=-200;y<=960;y+=40)rg.push([1280+34*Math.sin(y*.006+ph),y]);M.ridges.push({pts:rg,hw:()=>88});
      M.peaks.push({x:1600,y:180,r:150,rx:2.2,rot:0},{x:760,y:760,r:70,rx:1.4,rot:.5});M.lakes.push({x:60,y:1100,r:230,rx:.8,wob:q=>.1*Math.sin(q*3+ph)});mirrorMap(M,'x');mirrorMap(M,'y');}},
  dmziron:{name:'Korean DMZ: Iron Triangle',min:2,max:6,sym:'quad',theme:'green',rough:1.35,ssn:3,home:['KR','KP'],tag:'hills · two rivers · fortified strip · winter',
    desc:'The narrow demilitarised strip between two rivers, studded with fortified hills, and a wooded ridge on each flank. Armies cross by a few bridges under artillery cover. Best in winter snow.',
    slots:QS,cities:Q4([[1000,430,100,'korea'],[560,980,75,'asia']]).concat([[1600,1100,120,'korea']]),
    water(M,R){const ph=R()*6.28;M.rivers.push({pts:wig(-200,1600,x=>870+45*Math.sin(x*.0048+ph)+18*Math.sin(x*.014)),hw:()=>46});M.bridgeAt=[[0,.46],[0,.84]];M.bridgeFrac=true;
      M.peaks.push({x:1350,y:1010,r:62,rx:1.5,rot:.3},{x:900,y:1040,r:50,rx:1.4,rot:-.4},{x:640,y:520,r:66,rx:1.6,rot:.6},{x:1300,y:400,r:56,rx:1.3,rot:.1});
      const rg=[];for(let y=240;y<=700;y+=40)rg.push([780+40*Math.sin(y*.007+ph),y]);M.ridges.push({pts:rg,hw:()=>80});mirrorMap(M,'x');mirrorMap(M,'y');}},
  beqaa:{name:'Lebanon: Beqaa and Chouf',min:2,max:4,sym:'quad',theme:'green',rough:1.4,ssn:1,home:['RS','IL'],tag:'two mountain walls · valley river · coast',
    desc:'Mount Lebanon and the Anti-Lebanon rise on either side of the Beqaa valley and its river; the coastal plains lie behind the mountain walls. Three passes cross each wall and the valley crossroads decides the war.',
    slots:QS,cities:Q4([[640,420,110,'lebanon'],[1260,430,70,'lebanon'],[900,1010,70,'lebanon']]).concat([[1600,1100,140,'mideast']]),
    water(M,R){const ph=R()*6.28;const rg=[];for(let y=-200;y<=900;y+=40)rg.push([960+45*Math.sin(y*.005+ph)+16*Math.sin(y*.016),y]);M.ridges.push({pts:rg,hw:()=>86});
      M.lakes.push({x:-330,y:1100,r:640,rx:.7,wob:q=>.06*Math.sin(q*4+ph)});
      const vr=[];for(let y=-200;y<=860;y+=40)vr.push([1600,y]);M.rivers.push({pts:vr,hw:()=>38});M.bridgeAt=[[0,.5]];M.bridgeFrac=true;mirrorMap(M,'x');mirrorMap(M,'y');}},
  hormuzgate:{name:'Strait of Hormuz: Island Gate',min:2,max:4,sym:'quad',theme:'desert',ssn:1,home:['IR','AE'],fieldMinB:300,tag:'sea strait · island chain · two coasts · navies',
    desc:'The narrow strait between the Iranian and Arabian coasts, wide gulf at both ends and a chain of three islands in the narrows. Bridges hop island to island; fleets fight for the water, tanks for the causeways.',
    slots:[[420,300],[2780,1900],[2780,300],[420,1900]],cities:Q4([[1000,450,100,'mideast'],[560,820,80,'gulfcity']]),
    water(M,R){const pts=[];for(let x=-200;x<=3400;x+=40)pts.push([x,1100]);M.rivers.push({pts,hw:(t,x)=>140+160*Math.min(1,Math.abs(x-1600)/1000)});
      navIsle(M,{x:1600,y:1100,r:90,rx:2.1,w:a=>.05*Math.sin(a*3)});navIsle(M,{x:900,y:1100,r:60,rx:1.3,w:a=>.06*Math.sin(a*2)});navIsle(M,{x:2300,y:1100,r:60,rx:1.3,w:a=>.06*Math.sin(a*2)});
      M.bridgeAng.push([1600,960,0,1],[1600,1240,0,-1],[900,946,0,1],[900,1254,0,-1],[2300,946,0,1],[2300,1254,0,-1]);}},
  tihama:{name:'Yemen: Tihama and Highlands',min:2,max:6,sym:'quad',theme:'desert',rough:1.5,ssn:1,home:['DW','SA'],tag:'coastal plains · highland diamond · wadis',
    desc:'Hot coastal plains on both sides and a rugged highland diamond in the middle with the old capital inside. The wadi passes along the middle are the only easy way in; the ridge corners are for snipers and artillery.',
    slots:QS,cities:Q4([[760,420,110,'yemen'],[1180,880,75,'yemen']]).concat([[1600,1100,150,'yemen']]),
    water(M,R){const ph=R()*6.28;const rg=[];for(let i=0;i<=10;i++){const t=i/10;rg.push([1060+540*t+14*Math.sin(i*2.1+ph),860-520*t+14*Math.sin(i*1.7)]);}M.ridges.push({pts:rg,hw:()=>74});
      M.peaks.push({x:1600,y:420,r:90,rx:1.8,rot:0},{x:560,y:760,r:55,rx:1.3,rot:.3});M.lakes.push({x:-300,y:1100,r:600,rx:.7,wob:q=>.07*Math.sin(q*3+ph)});mirrorMap(M,'x');mirrorMap(M,'y');}}
});
MAP_KEYS.length=0;for(const k of Object.keys(MAPS))MAP_KEYS.push(k);
}
