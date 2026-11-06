// Territory probe: influence field, front line segments, build blocked in enemy territory.
import { makeSim } from './headless.mjs';
const { W } = makeSim();
W.start({ seed: 3, facs: ['US', 'RU'], map: process.argv[2] || 'fulda' });
W.ev('G.teams.forEach(T=>{T.ai=null;})');W.step(5);
console.log(W.ev(`(()=>{const T=terrUpdate(true);const c=[0,0,0];for(const o of T.own)c[o<0?2:o]++;return JSON.stringify({cells:T.own.length,t0:c[0],t1:c[1],neutral:c[2],seg:T.seg.length})})()`));
console.log(W.ev(`(()=>{const B1=BASES[1];const sp=(x,y)=>validSpot(0,'barracks',x,y)||validSpot.why;
 return JSON.stringify({inEnemyBase:sp(B1[0]-200,B1[1]+200),terrAtB1:terrAt(B1[0]-200,B1[1]+200),ownBase:sp(BASES[0][0]+250,BASES[0][1]+250)})})()`));
console.log(W.ev(`(()=>{const B=BASES[1];const ts=[...G.towns].sort((a,b)=>Math.hypot(a.x-B[0],a.y-B[1])-Math.hypot(b.x-B[0],b.y-B[1]));
  for(const t of ts.slice(0,3))for(const c of t.cells)if(c.key)c.ow=0;G.civDirty=true;return 'took '+ts.slice(0,3).map(t=>t.name)})()`));
W.step(4);
console.log(W.ev(`(()=>{const T=G.terr;const t=G.towns.find(t=>t.ow===0&&Math.hypot(t.x-BASES[1][0],t.y-BASES[1][1])<2500);const c=[0,0,0];for(const o of T.own)c[o<0?2:o]++;
 const e=terrEnemy(0,BASES[1][0]-150,BASES[1][1]-150);return JSON.stringify({t0:c[0],t1:c[1],seg:T.seg.length,enemyAtB1:e,townTerr:t&&terrAt(t.x,t.y)})})()`));
