// AI probe: what does each side own over time? node orch/aiprobe.mjs CN,IR [map] [seed] [diff]
globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
const { makeSim } = await import('./headless.mjs');
const [A, B] = (process.argv[2] || 'CN,IR').split(',');
const { W } = makeSim(undefined, { prof: [] });
const P = globalThis.__ww3prof;
W.start({ seed: +(process.argv[4] || 1000), map: process.argv[3] || 'strait', facs: [A, B], diff: +(process.argv[5] || 1) });
for (let t = 0; t < +(process.env.T||1200); t += +(process.env.DT||120)) {
  const st = W.step(+(process.env.DT||120));
  const r = P.ev(`G.teams.filter(T=>!T.reb).map(T=>{const c={},b={};for(const e of G.ents){if(e.dead||e.team!==T.id)continue;const m=e.isB?b:c;m[e.kind]=(m[e.kind]||0)+1;}return {fac:T.fac,cr:Math.round(T.credits),u:c,b:b};})`);
  console.log('t=' + (t + 120), r.map(x => x.fac + ' cr' + x.cr + ' U' + JSON.stringify(x.u) + ' B' + JSON.stringify(x.b)).join('\n      '));
  if (st.over) break;
}
process.exit(0);
