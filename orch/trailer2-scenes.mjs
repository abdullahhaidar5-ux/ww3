// Trailer v2 scenes (desert / Middle East look: Empty Quarter dunes + Zagros rocks). Same format as trailer-scenes.mjs.
// Capture-only; view only, never lands on main. Kinds: tank inf at arty aa heli jet drone. Weather w: 0 day, 4 night, 6 sandstorm.
const BASE = `A.b0=BASES[0];A.b1=BASES[1];A.c=[MAPW/2,MAPH/2];A.d=TR.dir(0);`;
const boomsAt = (fn, every, big) => `TR.events=(i,u)=>{if(i%${every}===0){const f=${fn}();boomFX(f[0]+(Math.random()-.5)*110,f[1]+(Math.random()-.5)*110,${big?36:24},${big?'true':'false'});}}`;
const mid2 = `(()=>{const f=TR.fight();if(f)return f;const a=TR.avgL(TR.A.g0),b=TR.avgL(TR.A.g1);return [(a[0]+b[0])/2,(a[1]+b[1])/2]})`;
// two big armies marching on each other, artillery behind IR; A.g0 = IR group, A.g1 = US group
const ARMIES = `${BASE}A.g0=TR.col(0,'tank',.30,14,7,30,.62).concat(TR.col(0,'inf',.24,100,16,14,.62),TR.col(0,'at',.22,12,6,16,.62),TR.col(0,'arty',.14,6,6,26,.50));
 A.g1=TR.col(1,'tank',.16,14,7,30,.40).concat(TR.col(1,'inf',.10,100,16,14,.40),TR.col(1,'at',.08,12,6,16,.40),TR.col(1,'arty',.04,6,6,26,.50));`;
export const SCENES = {
  // ---- A: columns marching, crane up, track (day) ----
  dunesA: { map: 'rubalkhali', p: 'IR', a: 'US', w: 0, warm: 40,
    prep: `()=>{const A=TR.A;${ARMIES}TR.step(60*3);return A.g0.length+'/'+A.g1.length}`,
    shots: [
      { n: 'track', dur: 4, cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*lerp(85,60,u)+d[0]*lerp(-80,70,u),lerp(9,14,u),F[1]+d[0]*lerp(85,60,u)+d[1]*lerp(-80,70,u),F[0]+d[0]*45,6,F[1]+d[1]*45,38)}` },
      { n: 'crane', dur: 4, prep: `()=>{TR.step(60*10);${boomsAt(mid2, 4, true)}}`,
        cam: `(u,A)=>{const m=${mid2}();return TR.orb(m[0],m[1],lerp(130,300,ease(u)),lerp(14,140,ease(u)),lerp(-.9,-.2,u),6,lerp(36,44,u))}` },
      { n: 'clash', dur: 3.5, speed: .8, prep: `()=>{TR.step(60*4)}`,
        cam: `(u,A)=>{const m=${mid2}(),d=A.d;return TR.cam(m[0]-d[0]*lerp(90,50,u)-d[1]*40,lerp(10,16,u),m[1]-d[1]*lerp(90,50,u)+d[0]*40,m[0],5,m[1],34)}` },
    ] },
  // ---- B: tank firing push-in, artillery, air ----
  dunesB: { map: 'rubalkhali', p: 'IR', a: 'US', w: 0, warm: 40, seed: 11,
    prep: `()=>{const A=TR.A;${ARMIES}TR.step(60*14);A.hero=null;return A.g0.length+'/'+A.g1.length}`,
    shots: [
      { n: 'push', dur: 3.5, speed: .7,
        prep: `()=>{const A=TR.A;const t=G.ents.find(u=>!u.dead&&u.team===0&&u.s&&u.s.cls==='tank'&&u.target)||A.g0.find(u=>u&&!u.dead&&u.s&&u.s.cls==='tank');A.hero=t;TR.step(30)}`,
        cam: `(u,A)=>{const h=A.hero;if(h&&!h.dead)TR.last=[h.x,h.y];const F=TR.last||A.c,d=A.d;return TR.cam(F[0]+d[0]*lerp(70,24,ease(u))-d[1]*lerp(34,18,u),lerp(10,6,u),F[1]+d[1]*lerp(70,24,ease(u))+d[0]*lerp(34,18,u),F[0]-d[0]*10,4.5,F[1]-d[1]*10,lerp(40,30,u))}` },
      { n: 'arty', dur: 4, speed: 1,
        prep: `()=>{const A=TR.A;const ar=A.g0.filter(u=>u&&!u.dead&&u.s&&u.s.cls==='arty');A.ar=ar;const m=${mid2}();for(const u of ar)u.order={type:'amove',x:m[0],y:m[1]};TR.events=(i)=>{if(i%3===0){const mm=${mid2}();boomFX(mm[0]+(Math.random()-.5)*260,mm[1]+(Math.random()-.5)*260,30,i%6===0)}}}`,
        cam: `(u,A)=>{const F=TR.avgL(A.ar),m=${mid2}(),d=A.d;return TR.cam(F[0]-d[1]*50-d[0]*40,lerp(8,16,u),F[1]+d[0]*50-d[1]*40,m[0],lerp(25,20,u),m[1],lerp(38,34,u))}` },
      { n: 'air', dur: 3, prep: `()=>{const A=TR.A,B=BASES[0];TR.events=null;const hs=[];const m=${mid2}();for(let i=0;i<3;i++)hs.push(addUnit(0,'heli',m[0]-A.d[0]*260+i*30,m[1]-A.d[1]*260+i*40));for(let i=0;i<3;i++)hs.push(addUnit(0,'drone',m[0]-A.d[0]*240,m[1]-A.d[1]*240+i*30));for(const u of hs)if(u)u.order={type:'amove',x:m[0],y:m[1]};A.air=hs;TR.step(60)}`,
        cam: `(u,A)=>{const h=A.air[0];if(h&&!h.dead)TR.last=[h.x,h.y];const F=TR.last||A.c;return TR.cam(F[0]-A.d[1]*lerp(150,110,u),lerp(40,30,u),F[1]+A.d[0]*lerp(150,110,u),F[0]+A.d[0]*60,30,F[1]+A.d[1]*60,48)}` },
    ] },
  // ---- C: Iran base with flags + parade (golden desert) ----
  base: { map: 'zagros', p: 'IR', a: 'US', w: 0, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}const P=TR.land(A.b0[0]+A.d[0]*200,A.b0[1]+A.d[1]*200+50,A.c[0],A.c[1]);A.P=P;const ks=['tank','tank','at','tank','aa','tank'];ks.forEach((k,i)=>{const u=addUnit(0,k,P[0]+i*30-70,P[1]);if(u)u.order=null;});TR.step(30);return 1}`,
    shots: [
      { n: 'flags', dur: 3.5, cam: `(u,A)=>TR.orb(A.b0[0],A.b0[1],lerp(150,105,u),lerp(22,14,u),lerp(.1,1.0,ease(u)),22,40)` },
      { n: 'parade', dur: 3, speed: 0, cam: `(u,A)=>TR.cam(A.P[0]-90+u*150,9,A.P[1]+36,A.P[0]-40+u*150,7,A.P[1],36)` },
    ] },
  // ---- D: night battle with tracers (desert) ----
  night: { map: 'rubalkhali', p: 'IR', a: 'US', w: 4, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.34,8,4,30,.5).concat(TR.col(0,'inf',.31,60,10,14,.5));A.g1=TR.col(1,'tank',.60,8,4,30,.7).concat(TR.col(1,'inf',.57,60,10,14,.7));TR.step(60*5);
      const m=TR.mid(0,1,.38);A.m=m;G.teams[0].pw.flare={cd:0,lv:1};usePower(0,'flare',m[0],m[1]);TR.step(60);return JSON.stringify(m)}`,
    shots: [
      { n: 'low', dur: 3.5, prep: `()=>{TR.step(60*3)}`, cam: `(u,A)=>{const m=(()=>TR.fight()||TR.A.m)(),d=A.d;return TR.cam(m[0]-d[0]*115-d[1]*lerp(50,25,u),lerp(10,20,u),m[1]-d[1]*115+d[0]*lerp(50,25,u),m[0],6,m[1],40)}` },
      { n: 'wide', dur: 3, cam: `(u,A)=>{const m=(()=>TR.fight()||TR.A.m)();return TR.orb(m[0],m[1],lerp(230,160,u),lerp(80,50,u),lerp(-1.2,-.7,u),4,42)}` },
    ] },
  // ---- E: sandstorm column ----
  storm: { map: 'rubalkhali', p: 'IR', a: 'SA', w: 6, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.30,10,5,30,.6).concat(TR.col(0,'inf',.26,60,10,14,.6));A.g1=TR.col(1,'tank',.26,10,5,30,.4).concat(TR.col(1,'inf',.22,60,10,14,.4));TR.step(60*4)}`,
    shots: [{ n: 'low', dur: 3.5, cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*80+d[0]*lerp(-100,30,u),lerp(10,14,u),F[1]+d[0]*80+d[1]*lerp(-100,30,u),F[0]+d[0]*30,6,F[1]+d[1]*30,40)}` }] },
  // ---- F: Bunker Buster strike on a fortress: explosion + collapse ----
  fort: { map: 'zagros', p: 'IR', a: 'US', w: 0, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}const F=TR.land(A.b0[0]+A.d[0]*200,A.b0[1]+A.d[1]*200+80,A.c[0],A.c[1]);A.F=F;const b=addBld(0,'fort',F[0],F[1],true);G.t=310;const T=G.teams[1];T.credits=9000;T.pw.bb={cd:0,lv:1};const ok=usePower(1,'bb',F[0],F[1]);return JSON.stringify([F,!!b,ok])}`,
    shots: [{ n: 'bb', dur: 7, speed: .7, prep: `()=>{TR.step(100)}`, cam: `(u,A)=>TR.orb(A.F[0],A.F[1],lerp(300,190,ease(u)),lerp(90,45,u),lerp(-1.9,-1.2,u),20,42)` }] },
};
