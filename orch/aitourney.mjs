// Fast AI-vs-AI balance tournament in plain Node (no browser): runs the real simulation through headless.mjs's
// makeSim, several battles at once (one child process each). Full round robin of every faction pair by default.
//
//   node orch/aitourney.mjs                         # all 18 factions, every pair once (153 games), Normal, 20-min cap
//   node orch/aitourney.mjs --rounds 2              # every pair twice (second round: slots swapped, other map)
//   node orch/aitourney.mjs --diff 2 --maps strait,fulda --minutes 25 --jobs 2 --seed 3
//   node orch/aitourney.mjs --factions IL,AE,US,RU  # only these
//   node orch/aitourney.mjs --vs IL,AE              # only games involving IL or AE (every other nation, both slots)
//   node orch/aitourney.mjs --hard-vs-normal        # slot A plays Hard, slot B Normal (does Hard beat Normal?)
//
// Timeouts are adjudicated like tourney.mjs: base + army value (forceOf) ahead by --adj (1.5x) wins, else draw (half).
// Writes orch/out/aitourney.json and prints a win-rate table per faction.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);

if (process.argv[2] === '--child') {
  globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
  const { makeSim } = await import('./headless.mjs');
  process.on('message', m => {
    if (!m) process.exit(0);
    const t0 = Date.now(); let r;
    try {
      const { W } = makeSim(undefined, { prof: [] });
      const P = globalThis.__ww3prof;
      W.start({ seed: m.seed, map: m.map, facs: m.facs, diff: m.diff });
      if (m.diffs) P.ev(`G.teams.forEach((T,i)=>{ if (T.ai) T.ai = mkAI(${JSON.stringify(m.diffs)}[i]); })`);
      let st = null;
      const haul = [0, 0];
      const HAUL = `G.teams.map(T=>{let mx=0;const dr=G.ents.filter(e=>e.isB&&e.team===T.id&&(e.kind==='hq'||e.kind==='depot')&&e.built>=1&&!e.dead);for(const u of G.ents)if(u.team===T.id&&u.kind==='harv'&&!u.dead&&u.field){let d=1e9;for(const b of dr)d=Math.min(d,dist(b,u.field));if(d<1e9)mx=Math.max(mx,d);}return Math.round(mx);})`;
      for (let t = 0; t < m.minutes * 60; t += 30) { st = W.step(30); const h = P.ev(HAUL); h.forEach((v, i) => { haul[i] = Math.max(haul[i], v); }); if (st.over) break; }
      const info = W.info();
      const score = P.ev(`G.teams.map(T=>{const F=forceOf(T);return F.bv+F.uv+F.dz*500;})`);
      const extra = P.ev(`G.teams.map(T=>Object.assign({upg:Object.keys(T.upg).length},(T.ai&&T.ai.st)||{}))`); extra.forEach((x, i) => { x.haul = haul[i]; });
      let winner = -1, result = 'draw';
      if (info.over && info.winner != null && info.winner >= 0) { winner = info.winner; result = 'kill'; }
      else if (score[0] >= score[1] * m.adj && score[0] > 0) { winner = 0; result = 'timeout'; }
      else if (score[1] >= score[0] * m.adj && score[1] > 0) { winner = 1; result = 'timeout'; }
      r = { ...m, winner, result, t: info.t, per: info.per, score, extra, wall: Date.now() - t0 };
    } catch (e) { r = { ...m, winner: -1, result: 'error', err: String(e && e.stack || e).slice(0, 400) }; }
    process.send(r);
  });
} else {
  const ALL = ['US', 'TR', 'IL', 'EU', 'UA', 'RU', 'IR', 'SA', 'AE', 'PK', 'IN', 'CN', 'KP', 'KR', 'EG', 'CU', 'RS', 'DW'];
  const FAC = argS('factions', '') ? argS('factions').split(',').map(s => s.trim().toUpperCase()) : ALL;
  const VS = argS('vs', '') ? argS('vs').split(',').map(s => s.trim().toUpperCase()) : null;
  const MAPS = argS('maps', 'strait,oasis,plateau,fulda,zagros').split(',');
  const ROUNDS = Number(argS('rounds', 1)), MIN = Number(argS('minutes', 20)), SEED = Number(argS('seed', 1));
  const DIFF = Number(argS('diff', 1)), ADJ = Number(argS('adj', 1.5));
  const JOBS = Math.max(1, Number(argS('jobs', os.cpus().length)));
  const HVN = has('hard-vs-normal');
  const OUT = argS('out', path.join(ROOT, 'orch', 'out', 'aitourney.json'));
  const sched = []; let k = 0;
  for (let r = 0; r < ROUNDS; r++)
    for (let i = 0; i < FAC.length; i++) for (let j = i + 1; j < FAC.length; j++) {
      if (VS && !VS.includes(FAC[i]) && !VS.includes(FAC[j])) continue;
      const sw = (k + r) % 2 === 1;
      const facs = sw ? [FAC[j], FAC[i]] : [FAC[i], FAC[j]];
      sched.push({ n: k, facs, map: MAPS[(k * 7 + r * 3) % MAPS.length], seed: (SEED * 1000 + k * 13 + r * 7919) >>> 0, diff: DIFF,
        diffs: HVN ? [2, 1] : null, minutes: MIN, adj: ADJ });
      k++;
    }
  if (HVN) for (const m of sched) if (m.n % 2) { m.facs.reverse(); m.diffs = [1, 2]; } // Hard plays both slots
  console.log(`aitourney: ${sched.length} games, ${JOBS} at a time, ${MIN}-min cap, maps ${MAPS.join(',')}${HVN ? ', Hard vs Normal' : ', diff ' + DIFF}`);
  const res = []; let next = 0; const t0 = Date.now();
  await new Promise(done => {
    let live = 0;
    const spawn = () => {
      const c = fork(fileURLToPath(import.meta.url), ['--child'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      live++;
      const give = () => { if (next < sched.length) c.send(sched[next++]); else { c.send(null); } };
      c.on('message', r => {
        res.push(r);
        if (res.length % 10 === 0 || res.length === sched.length) console.log(`  ${res.length}/${sched.length} done, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
        if (r.result === 'error') console.log('  ERROR', r.facs, r.map, r.err);
        give();
      });
      c.on('exit', () => { if (--live === 0) done(); });
      give();
    };
    for (let i = 0; i < Math.min(JOBS, sched.length); i++) spawn();
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const tab = {};
  const T = f => tab[f] || (tab[f] = { g: 0, w: 0, kill: 0, to: 0, d: 0, len: 0 });
  let hardW = 0, hardG = 0;
  for (const r of res) {
    if (r.result === 'error') continue;
    r.facs.forEach((f, i) => { const s = T(f); s.g++; s.len += r.t / 60; if (r.winner === i) { s.w++; if (r.result === 'kill') s.kill++; else s.to++; } else if (r.winner < 0) { s.w += .5; s.d++; } });
    if (r.diffs) { hardG++; const hi = r.diffs.indexOf(2); hardW += r.winner === hi ? 1 : r.winner < 0 ? .5 : 0; }
  }
  const rows = Object.entries(tab).sort((a, b) => b[1].w / b[1].g - a[1].w / a[1].g);
  console.log('\nfac  games  win%   kills timeouts draws  avg-min');
  for (const [f, s] of rows) console.log(`${f.padEnd(4)} ${String(s.g).padStart(5)}  ${(100 * s.w / s.g).toFixed(0).padStart(4)}%  ${String(s.kill).padStart(5)} ${String(s.to).padStart(8)} ${String(s.d).padStart(5)}  ${(s.len / s.g).toFixed(1).padStart(6)}`);
  const s0 = res.filter(r => r.winner === 0).length, s1 = res.filter(r => r.winner === 1).length;
  console.log(`slot A won ${s0}, slot B won ${s1}, draws ${res.filter(r => r.result === 'draw').length}, errors ${res.filter(r => r.result === 'error').length}; ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  const agg = {}; for (const r of res) for (const x of (r.extra || [])) for (const k in x) if (!/T$/.test(k)) agg[k] = (agg[k] || 0) + x[k];
  const firsts = k => { const v = res.flatMap(r => (r.extra || []).map(x => x[k]).filter(Boolean)); return v.length ? `${v.length} sides, median ${v.sort((a, b) => a - b)[v.length >> 1]} s` : 'none'; };
  const hauls = res.flatMap(r => (r.extra || []).map(x => x.haul || 0)).sort((a, b) => a - b);
  console.log(`tactics (totals over all sides): ${Object.entries(agg).filter(([k]) => k !== 'haul' && k !== 'upg').map(([k, v]) => k + ' ' + v).join(', ')}`);
  console.log(`shipyard placed: ${firsts('yardT')}; first warship: ${firsts('fleetT')}; truck haul (field to nearest drop) worst per side: median ${hauls[hauls.length >> 1] || 0}, max ${hauls[hauls.length - 1] || 0}`);
  if (hardG) console.log(`Hard vs Normal: Hard scored ${hardW}/${hardG} (${(100 * hardW / hardG).toFixed(0)}%)`);
}
