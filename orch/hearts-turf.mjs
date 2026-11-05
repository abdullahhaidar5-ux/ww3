// Home-turf fairness: for each (home nation, home map) plays AI battles vs non-home opponents with the home-turf effects ON and OFF
// (same seeds / slots), so the difference is the effect itself. Usage: node orch/hearts-turf.mjs [--minutes 14] [--seeds 2] [--jobs 2] [--only IR:zagros,...]
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
if (process.argv[2] === '--child') {
  const { makeSim } = await import('./headless.mjs');
  process.on('message', m => {
    if (!m) process.exit(0);
    let r;
    try {
      const { W } = makeSim();
      W.start({ seed: m.seed, map: m.map, facs: m.facs, diff: 1 });
      if (!m.turf) W.ev('G.noTurf=1');
      for (let t = 0; t < m.minutes * 60; t += 30) { const st = W.step(30); if (st.over) break; }
      const info = W.info();
      const sc = W.ev(`G.teams.filter(T=>!T.reb).map(T=>{const F=forceOf(T);return F.bv+F.uv+F.dz*500;})`);
      let w = -1; if (info.over && info.winner >= 0) w = info.winner; else if (sc[0] >= sc[1] * 1.5) w = 0; else if (sc[1] >= sc[0] * 1.5) w = 1;
      const tw = W.ev(`G.towns.filter(t=>t.ow>=0).reduce((a,t)=>{a[t.ow]=(a[t.ow]||0)+1;return a},{})`);
      r = { ...m, w, t: info.t, tw };
    } catch (e) { r = { ...m, w: -2, err: String(e).slice(0, 200) }; }
    process.send(r);
  });
} else {
  const MIN = +argS('minutes', 14), SEEDS = +argS('seeds', 2), JOBS = +argS('jobs', 2);
  const PAIRS = (argS('only', '') ? argS('only').split(',') : ['IR:zagros', 'RS:lebanon', 'DW:yemen', 'TR:bosphorus', 'UA:dnipro', 'EU:fulda', 'KR:dmz', 'PK:indus']).map(s => s.split(':'));
  const OPP = ['US', 'RU', 'CN', 'IN', 'EG'];
  const jobs = [];
  for (const [home, map] of PAIRS) for (let s = 0; s < SEEDS; s++) { const opp = OPP.filter(o => o !== home)[s % 4]; for (const turf of [1, 0]) for (const sw of [0, 1]) jobs.push({ home, map, opp, turf, sw, seed: 1000 + s * 17 + (sw ? 3 : 0), facs: sw ? [opp, home] : [home, opp], minutes: MIN }); }
  console.log(`hearts-turf: ${jobs.length} games`);
  const res = []; let next = 0;
  await new Promise(done => { let live = 0; const spawn = () => { const c = fork(fileURLToPath(import.meta.url), ['--child'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] }); live++; const give = () => { if (next < jobs.length) c.send(jobs[next++]); else c.send(null); }; c.on('message', r => { res.push(r); if (r.w === -2) console.log('ERR', r.err); if (res.length % 8 === 0) console.log(res.length + '/' + jobs.length); give(); }); c.on('exit', () => { if (--live === 0) done(); }); give(); }; for (let i = 0; i < JOBS; i++) spawn(); });
  console.log('\nhome:map     | turf ON home win% | OFF home win% | games each | ON-OFF');
  for (const [home, map] of PAIRS) {
    const row = turf => { const g = res.filter(r => r.home === home && r.map === map && r.turf === turf && r.w !== -2); let w = 0; for (const r of g) { const hi = r.facs.indexOf(home); w += r.w === hi ? 1 : r.w < 0 ? .5 : 0; } return [g.length ? w / g.length * 100 : NaN, g.length]; };
    const [a, n] = row(1), [b] = row(0);
    console.log(`${home}:${map}`.padEnd(14), '|', a.toFixed(0).padStart(5) + '%', '|', b.toFixed(0).padStart(5) + '%', '|', n, '|', (a - b).toFixed(0));
  }
  const tot = turf => { const g = res.filter(r => r.turf === turf && r.w !== -2); let w = 0; for (const r of g) { w += r.w === r.facs.indexOf(r.home) ? 1 : r.w < 0 ? .5 : 0; } return [w / g.length * 100, g.length]; };
  console.log('ALL ON', tot(1)[0].toFixed(1) + '% of', tot(1)[1], ' ALL OFF', tot(0)[0].toFixed(1) + '% of', tot(0)[1]);
  console.log(JSON.stringify(res.map(r => [r.home, r.map, r.opp, r.turf, r.sw, r.w, r.t | 0, r.tw])));
}
