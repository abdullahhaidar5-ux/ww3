const BASE = `A.b0=BASES[0];A.b1=BASES[1];A.c=[MAPW/2,MAPH/2];A.d=TR.dir(0);`;
const cam = h => `(u,A)=>{const F=TR.avgL(A.g0),d=A.d;return TR.cam(F[0]-d[1]*60+d[0]*-70,${h},F[1]+d[0]*60+d[1]*-70,F[0]+d[0]*40,5,F[1]+d[1]*40,40)}`;
const hide = f => `()=>{let n=0;const L=[];SCN.traverse(o=>{if((o.isMesh)&&o.visible&&(${f}))n++,L.push([o.geometry.type,o.count,o.name,o.renderOrder,o.material.color&&o.material.color.getHexString(),o.material.opacity]);});return 'PREPERR '+JSON.stringify(L)}`;
export const SCENES = { euphrates: { map: 'euphrates', p: 'IR', a: 'US', w: 0, warm: 20,
  prep: `()=>{const A=TR.A;${BASE}A.g0=TR.col(0,'tank',.30,10,5,30,.62).concat(TR.col(0,'inf',.24,50,10,14,.62));A.g1=TR.col(1,'tank',.16,10,5,30,.4);TR.step(60*3);}`,
  shots: [{ n: 'h0', dur: 1, cam: cam(22) }] } };
