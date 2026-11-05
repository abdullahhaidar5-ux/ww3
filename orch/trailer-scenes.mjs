// Trailer scenes. Each scene boots a real battle (map, nations, weather w: 0 day, 3 dusk, 4 night, 6 sandstorm, 8 snow),
// warms the sim `warm` game-seconds, runs `prep` (page-side JS; TR.A holds anchors) then each shot: `dur` seconds of
// output, `speed` (1 real time, .5 slow motion), `prep` (runs before the shot), `events(i,u)` per frame, `cam(u, A)` -> camera
// for u in 0..1. Camera helpers: TR.orb(tx,ty,radius,height,angle,lookH,fov), TR.cam(px,py,pz,lx,ly,lz,fov).
const BASE = `A.b0=BASES[0];A.b1=BASES[1];A.c=[MAPW/2,MAPH/2];A.d=TR.dir(0);`;
const boomsAt = (fn, every, big) => `TR.events=(i,u)=>{if(i%${every}===0){const f=${fn}();boomFX(f[0]+(Math.random()-.5)*110,f[1]+(Math.random()-.5)*110,${big?36:24},${big?'true':'false'});}}`;
const mid2 = `(()=>{const f=TR.fight();if(f)return f;const a=TR.avgL(TR.A.g0),b=TR.avgL(TR.A.g1);return [(a[0]+b[0])/2,(a[1]+b[1])/2]})`;
export const SCENES = {
  horizon: { map: 'zagros', p: 'IR', a: 'US', w: 0, warm: 90,
    prep: `()=>{const A=TR.A;${BASE}for(let i=0;i<7;i++)smkAdd(A.c[0]+(i-3)*240,A.c[1]+(i%2)*160-80,6);return 1}`,
    shots: [
      { n: 'wide', dur: 5, cam: `(u,A)=>TR.orb(A.c[0],A.c[1],lerp(950,620,ease(u)),lerp(95,58,u),lerp(-1.95,-1.62,u),22,40)`,
        prep: `()=>{TR.events=(i)=>{if(i%24===0)boomFX(TR.A.c[0]+(Math.random()-.5)*500,TR.A.c[1]+(Math.random()-.5)*300,26,false)}}` },
      { n: 'base', dur: 3.5, cam: `(u,A)=>TR.orb(A.b0[0],A.b0[1],lerp(240,190,u),lerp(46,30,u),lerp(.2,1.0,ease(u)),26,42)` },
      { n: 'parade', dur: 2.6, speed: 0, cam: `(u,A)=>TR.cam(A.P[0]-110+u*190,13,A.P[1]+46,A.P[0]-50+u*190,10,A.P[1],38)`,
        prep: `()=>{const A=TR.A,P=TR.land(A.b0[0]+A.d[0]*230,A.b0[1]+A.d[1]*230+60,A.c[0],A.c[1]);A.P=P;const ks=['tank','tank','arty','aa','tank','at','tank'];ks.forEach((k,i)=>{const u=addUnit(0,k,P[0]+i*34-80,P[1]);if(u)u.order=null;});TR.step(30);}` },
    ] },
  columns: { map: 'fulda', p: 'RS', a: 'RU', w: 0, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}A.t0=TR.col(0,'tank',.30,14,7,30,.62).concat(TR.col(0,'inf',.24,90,15,14,.62),TR.col(0,'at',.22,12,6,16,.62));
      A.g0=A.t0;A.t1=TR.col(1,'tank',.16,14,7,30,.40).concat(TR.col(1,'inf',.10,90,15,14,.40),TR.col(1,'at',.08,12,6,16,.40));A.g1=A.t1;TR.step(60);return A.t0.length+'/'+A.t1.length}`,
    shots: [
      { n: 'track', dur: 4, cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*lerp(95,70,u)+d[0]*lerp(-70,60,u),lerp(17,26,u),F[1]+d[0]*lerp(95,70,u)+d[1]*lerp(-70,60,u),F[0]+d[0]*45,9,F[1]+d[1]*45,40)}` },
      { n: 'clash', dur: 3.5, speed: .6, prep: `()=>{TR.step(300);${boomsAt(mid2, 5, true)}}`,
        cam: `(u,A)=>{const m=${mid2}();return TR.orb(m[0],m[1],lerp(300,230,u),lerp(95,60,u),lerp(-.6,.3,u),6,42)}` },
      { n: 'air', dur: 2.5, prep: `()=>{const A=TR.A,B=BASES[0];TR.events=null;const hs=[];for(let i=0;i<3;i++)hs.push(addUnit(0,'heli',B[0]+A.d[0]*500+i*30,B[1]+A.d[1]*500+i*40));for(let i=0;i<2;i++)hs.push(addUnit(0,'jet',B[0]+i*30,B[1]));for(let i=0;i<3;i++)hs.push(addUnit(0,'drone',B[0]+A.d[0]*400+i*25,B[1]+A.d[1]*400));const m=${mid2}();for(const u of hs)if(u)u.order={type:'amove',x:m[0],y:m[1]};A.air=hs;TR.step(90);}`,
        cam: `(u,A)=>{const h=A.air[0];if(h&&!h.dead)TR.last=[h.x,h.y];const F=TR.last||[A.c[0],A.c[1]];return TR.cam(F[0]-A.d[1]*150,lerp(45,70,u),F[1]+A.d[0]*150,F[0]+A.d[0]*40,40,F[1]+A.d[1]*40,50)}` },
      { n: 'finale', dur: 6, prep: `()=>{TR.events=null;for(let w=0;w<3;w++){TR.col(0,'tank',.30+w*.03,8,8,30,.6);TR.col(0,'inf',.26+w*.03,60,15,14,.6);TR.col(1,'tank',.30+w*.03,8,8,30,.4);TR.col(1,'inf',.26+w*.03,60,15,14,.4);}TR.step(60*4)}`,
        cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*lerp(150,280,ease(u))+d[0]*lerp(-130,-60,u),lerp(75,160,ease(u)),F[1]+d[0]*lerp(150,280,ease(u))+d[1]*lerp(-130,-60,u),F[0]+d[0]*90,0,F[1]+d[1]*90,46)}` },
    ] },
  night: { map: 'fulda', p: 'DW', a: 'RU', w: 4, warm: 80,
    prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.34,6,3,30,.5).concat(TR.col(0,'inf',.31,40,8,14,.5));A.g1=TR.col(1,'tank',.60,6,3,30,.7).concat(TR.col(1,'inf',.57,40,8,14,.7));TR.step(60*5);
      const m=TR.mid(0,1,.38);A.m=m;G.teams[0].pw.flare={cd:0,lv:1};usePower(0,'flare',m[0],m[1]);TR.step(60);return JSON.stringify(m)}`,
    shots: [
      { n: 'wide', dur: 3.5, cam: `(u,A)=>{const m=(()=>TR.fight()||TR.A.m)();return TR.orb(m[0],m[1],lerp(230,160,u),lerp(95,62,u),lerp(-1.2,-.7,u),4,42)}` },
      { n: 'low', dur: 2.5, prep: `()=>{TR.step(60)}`, cam: `(u,A)=>{const m=(()=>TR.fight()||TR.A.m)(),d=A.d;return TR.cam(m[0]-d[0]*115-d[1]*lerp(50,25,u),lerp(18,26,u),m[1]-d[1]*115+d[0]*lerp(50,25,u),m[0],8,m[1],42)}` },
    ] },
  storm: { map: 'rubalkhali', p: 'DW', a: 'SA', w: 6, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.30,8,4,30,.6).concat(TR.col(0,'inf',.26,50,10,14,.6));A.g1=TR.col(1,'tank',.26,8,4,30,.4).concat(TR.col(1,'inf',.22,50,10,14,.4));TR.step(60*4)}`,
    shots: [{ n: 'low', dur: 3, cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*100+d[0]*lerp(-110,30,u),lerp(30,36,u),F[1]+d[0]*100+d[1]*lerp(-110,30,u),F[0]+d[0]*30,8,F[1]+d[1]*30,44)}` }] },
  snow: { map: 'arctic', p: 'RS', a: 'RU', w: 8, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.30,8,4,30,.6).concat(TR.col(0,'inf',.26,50,10,14,.6));A.g1=TR.col(1,'tank',.26,8,4,30,.4).concat(TR.col(1,'inf',.22,50,10,14,.4));TR.step(60*4)}`,
    shots: [{ n: 'low', dur: 3, cam: `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*lerp(110,80,u)+d[0]*-70,lerp(32,24,u),F[1]+d[0]*lerp(110,80,u)+d[1]*-70,F[0]+d[0]*30,8,F[1]+d[1]*30,44)}` }] },
  naval: { map: 'babelmandeb', p: 'DW', a: 'SA', w: 0, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}const W=TR.water(A.c[0],A.c[1]);A.W=W;const o=[[0,'ship',-170,0],[0,'ship',-190,150],[0,'sub',-120,-90],[0,'boat',-120,60],[1,'ship',170,20],[1,'ship',190,-140],[1,'boat',120,-60],[1,'sub',150,120]];
      const out=[];for(const [t,k,dx,dy] of o){const p=TR.water(W[0]+dx,W[1]+dy)||W;const u=addUnit(t,k,p[0],p[1]);if(u){out.push(k);u.order={type:'amove',x:W[0]+(t?-1:1)*60,y:W[1]};}}
      TR.step(60*3);return JSON.stringify([W,out])}`,
    shots: [
      { n: 'fleet', dur: 3.5, cam: `(u,A)=>TR.orb(A.W[0],A.W[1],lerp(300,240,u),lerp(115,85,u),lerp(-1.9,-1.4,u),0,42)` },
      { n: 'strike', dur: 3, speed: .6, prep: `()=>{TR.events=${'null'}}`, cam: `(u,A)=>TR.orb(A.W[0],A.W[1],lerp(210,160,u),lerp(85,55,u),lerp(-1.2,-.5,u),0,40)` },
    ] },
  fort: { map: 'zagros', p: 'IR', a: 'US', w: 0, warm: 60,
    prep: `()=>{const A=TR.A;${BASE}const F=TR.land(A.b0[0]+A.d[0]*200,A.b0[1]+A.d[1]*200+80,A.c[0],A.c[1]);A.F=F;const b=addBld(0,'fort',F[0],F[1],true);G.t=310;const T=G.teams[1];T.credits=9000;T.pw.bb={cd:0,lv:1};const ok=usePower(1,'bb',F[0],F[1]);return JSON.stringify([F,!!b,ok])}`,
    shots: [{ n: 'bb', dur: 7, speed: .7, prep: `()=>{TR.step(100)}`, cam: `(u,A)=>TR.orb(A.F[0],A.F[1],lerp(300,190,ease(u)),lerp(90,45,u),lerp(-1.9,-1.2,u),20,42)` }] },
  camp: { camp: 'town', map: 'camp', p: 'RS', a: 'RU', w: 0, warm: 30,
    prep: `()=>{const A=TR.A;A.me=TR.avg(0);A.d=[0,1];return JSON.stringify(A.me)}`,
    shots: [{ n: 'm1', dur: 2.5, cam: `(u,A)=>TR.orb(A.me[0],A.me[1],lerp(140,100,u),lerp(40,28,u),lerp(-1.6,-.9,u),8,42)` }] },
};
