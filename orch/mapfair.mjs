// Map fairness check in plain Node (no browser), on the real simulation via headless.mjs's makeSim.
//
//   node orch/mapfair.mjs --static                     # every map x every player count it supports: supply/oil share
//                                                       # per start position (by driving distance), route to nearest rival
//   node orch/mapfair.mjs --battles [--shard 3/20]      # AI-vs-AI batches: every map at 2, 4 (and its min) and max players;
//                                                       # nations rotate through every start position (Latin rotation), so
//                                                       # nation strength cancels out and only the start position is left
//   node orch/mapfair.mjs --battles --maps khyber,strait --minutes 14 --jobs 2
//   node orch/mapfair.mjs --report orch/out/mapfair-*.json   # merge shard results into one table
//
// A battle that runs out of time is adjudicated by base + army value (forceOf): the leader wins if 1.4x the runner-up.
// Writes orch/out/mapfair[-<shard>].json. Prints, per map and player count, win share and mean score share by position.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const ALL = ['US', 'TR', 'IL', 'EU', 'UA', 'RU', 'IR', 'SA', 'AE', 'PK', 'IN', 'CN', 'KP', 'KR', 'EG', 'CU', 'RS', 'DW'];

const STATIC_FN = `globalThis.__fairStatic=(k,n,seed)=>{setWorld(worldScaleFor(n));setBases(n,k,-1);const sv=srand;let M;try{M=mkMap(seed,k);}finally{srand=sv;}
  const cell=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL),DB=BASES.map(([x,y])=>gridDist(M.grid,x,y)),DC=gridDist(M.grid,MAPW/2,MAPH/2);
  const b=BASES.map(([x,y],i)=>({eD:Math.round(Math.min(...BASES.map((q,j)=>j===i?1e9:DB[i][cell(q[0],q[1])]))),dC:Math.round(DC[cell(x,y)]),f:0,o:0}));
  const share=(arr,key)=>{for(const p of arr){const d=DB.map(Q=>Q[cell(p.x,p.y)]),m=Math.min(...d);if(!(m<1e8))continue;const w=d.map((v,i)=>v<=m+Math.max(120,.04*m)?i:-1).filter(i=>i>=0);for(const i of w)b[i][key]+=1/w.length;}};
  share(M.fields,'f');share(M.oil,'o');
  const r={k,n,seed,W:MAPW,H:MAPH,F:M.fields.length,O:M.oil.length,b};if(globalThis.__fairDump){r.GW=GW;r.GH=GH;r.grid=Array.from(M.grid).join('');r.bases=BASES.map(([x,y])=>[x|0,y|0]);r.fields=M.fields.map(f=>[f.x|0,f.y|0]);r.oil=M.oil.map(o=>[o.x|0,o.y|0]);r.cities=M.cities.map(c=>[c.x|0,c.y|0,c.r|0]);}return r;}`;

if (process.argv[2] === '--child') {
  globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
  const { makeSim } = await import('./headless.mjs');
  process.on('message', m => {
    if (!m) process.exit(0);
    const t0 = Date.now(); let r;
    try {
      if (m.static) { const P = globalThis.__ww3prof; if (!P.ev) makeSim(undefined, { prof: [] }); if (!globalThis.__fairStatic) P.ev(STATIC_FN); globalThis.__fairDump = !!m.dump;
        const a = Date.now(); r = P.ev(`__fairStatic(${JSON.stringify(m.map)},${m.n},${m.seed})`); r.ms = Date.now() - a; process.send(r); return; }
      const { W } = makeSim(undefined, { prof: [] });
      const P = globalThis.__ww3prof;
      W.start({ seed: m.seed, map: m.map, facs: m.facs, diff: m.diff });
      let st = null;
      for (let t = 0; t < m.minutes * 60; t += 30) { st = W.step(30); if (st.over) break; }
      const info = W.info();
      const score = P.ev(`G.teams.map(T=>{const F=forceOf(T);return Math.round(F.bv+F.uv+F.dz*500);})`);
      const alive = P.ev(`G.teams.map(T=>!T.out)`);
      let winner = -1, result = 'draw';
      const ord = score.map((s, i) => [s, i]).filter(([, i]) => alive[i]).sort((a, b) => b[0] - a[0]);
      if (info.over && info.winner != null && info.winner >= 0) { winner = info.winner; result = 'kill'; }
      else if (ord.length && (ord.length < 2 || ord[0][0] >= ord[1][0] * m.adj) && ord[0][0] > 0) { winner = ord[0][1]; result = 'timeout'; }
      r = { ...m, winner, result, t: Math.round(info.t), score, alive, wall: Date.now() - t0 };
    } catch (e) { r = { ...m, winner: -1, result: 'error', err: String(e && e.stack || e).slice(0, 400) }; }
    process.send(r);
  });
} else if (has('report')) {
  const files = process.argv.slice(process.argv.indexOf('--report') + 1).filter(f => !f.startsWith('--'));
  report(files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
} else {
  // load the map list from the source
  globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
  const { makeSim } = await import('./headless.mjs');
  makeSim(undefined, { prof: [] });
  const P = globalThis.__ww3prof;
  const MI = P.ev(`MAP_KEYS.map(k=>[k,MAPS[k].min||2,MAPS[k].max||8])`);
  const ONLY = argS('maps', '') ? argS('maps').split(',') : null;
  const maps = MI.filter(([k]) => !ONLY || ONLY.includes(k));
  const JOBS = Math.max(1, Number(argS('jobs', os.cpus().length)));
  const MIN = Number(argS('minutes', 15)), ADJ = Number(argS('adj', 1.4)), DIFF = Number(argS('diff', 1));
  const sched = [];
  if (has('static')) {
    const seeds = Number(argS('seeds', 2));
    for (const [k, lo, hi] of maps) for (let n = lo; n <= hi; n++) for (let s = 1; s <= seeds; s++) sched.push({ static: 1, map: k, n, seed: 1000 + s * 77, dump: has('dump') && (n === hi) && s === 1 });
  } else {
    const CNT = argS('counts', '') ? argS('counts').split(',').map(Number) : null;
    maps.forEach(([k, lo, hi], mi) => {
      const counts = CNT ? CNT.filter(n => n >= lo && n <= hi) : [...new Set([lo, Math.max(lo, 2), 4, hi].filter(n => n >= lo && n <= hi))];
      for (const n of counts) {
        const reps = n === 2 ? 2 : 1; // a duel: 2 seeds x both sides; bigger: one full rotation of n nations through n positions
        for (let rep = 0; rep < reps; rep++) {
          const set = Array.from({ length: n }, (_, i) => ALL[(mi * 5 + rep * 7 + i * 3) % ALL.length]);
          for (let g = 0; g < n; g++) sched.push({ map: k, n, seed: (mi * 1000 + n * 37 + rep * 11 + 1) >>> 0, facs: set.map((_, i) => set[(i + g) % n]), diff: DIFF, minutes: MIN, adj: ADJ });
        }
      }
    });
  }
  // sharding: biggest games first, dealt round-robin so every shard gets a similar load
  sched.sort((a, b) => (b.n || 0) - (a.n || 0));
  const SH = argS('shard', '');
  let mine = sched;
  if (SH) { const [i, n] = SH.split('/').map(Number); mine = sched.filter((_, j) => j % n === i); }
  const OUT = argS('out', path.join(ROOT, 'orch', 'out', `mapfair${SH ? '-' + SH.replace('/', 'of') : ''}${has('static') ? '-static' : ''}.json`));
  console.log(`mapfair: ${mine.length}${SH ? ' of ' + sched.length : ''} ${has('static') ? 'static checks' : 'battles'}, ${JOBS} at a time`);
  const res = []; let next = 0; const t0 = Date.now();
  await new Promise(done => {
    let live = 0;
    const spawn = () => {
      const c = fork(fileURLToPath(import.meta.url), ['--child'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      live++;
      const give = () => { if (next < mine.length) c.send(mine[next++]); else c.send(null); };
      c.on('message', r => {
        res.push(r);
        if (!has('static') && (res.length % 5 === 0 || res.length === mine.length)) console.log(`  ${res.length}/${mine.length} done, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
        if (r.result === 'error') console.log('  ERROR', r.map, r.n, r.err);
        give();
      });
      c.on('exit', () => { if (--live === 0) done(); });
      give();
    };
    for (let i = 0; i < Math.min(JOBS, mine.length); i++) spawn();
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(res));
  report(res);
  console.log(`MAPFAIR DONE ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${path.relative(ROOT, OUT)}`);
}

function report(res) {
  const st = res.filter(r => r.b);
  if (st.length) {
    console.log('\nSTATIC  map            n  size       fields oil | field share by base | oil share | route to nearest rival (min-max) | to centre');
    let bad = 0;
    for (const r of st) {
      const f = r.b.map(x => x.f), o = r.b.map(x => x.o), e = r.b.map(x => x.eD), c = r.b.map(x => x.dC);
      const sp = a => Math.max(...a) - Math.min(...a), rt = a => Math.max(...a) / Math.max(1, Math.min(...a));
      const flag = (sp(f) > 1.01 || sp(o) > 1.01) ? ' <<' : '';
      if (flag) bad++;
      console.log(`  ${r.k.padEnd(14)} ${String(r.n).padStart(2)}  ${r.W}x${r.H} ${r.ms}ms  ${String(r.F).padStart(3)} ${String(r.O).padStart(3)} | ${f.map(v => v.toFixed(1)).join(' ')} | ${o.map(v => v.toFixed(1)).join(' ')} | ${Math.min(...e)}-${Math.max(...e)} | ${Math.min(...c)}-${Math.max(...c)}${flag}`);
    }
    console.log(`STATIC ${bad ? bad + ' flagged' : 'all even'} (${st.length} layouts)`);
  }
  const bt = res.filter(r => r.facs);
  if (!bt.length) return;
  const by = {};
  for (const r of bt) (by[r.map + '|' + r.n] || (by[r.map + '|' + r.n] = [])).push(r);
  console.log('\nBATTLES map            n games  kills  win share by start position (fair = 1/n)        score share by position     avg-min');
  const rows = [];
  for (const key of Object.keys(by).sort()) {
    const L = by[key], n = L[0].n, w = Array(n).fill(0), sc = Array(n).fill(0);
    let kills = 0, len = 0, err = 0;
    for (const r of L) {
      if (r.result === 'error') { err++; continue; }
      if (r.winner >= 0) w[r.winner]++; else for (let i = 0; i < n; i++) w[i] += 1 / n;
      if (r.result === 'kill') kills++;
      const tot = r.score.reduce((a, b) => a + b, 0) || 1; r.score.forEach((s, i) => { sc[i] += s / tot; });
      len += r.t / 60;
    }
    const g = L.length - err, ws = w.map(v => v / Math.max(1, g)), ss = sc.map(v => v / Math.max(1, g));
    const dev = Math.max(...ss.map(v => v * n)); // best position's score share relative to fair
    rows.push({ key, n, g, dev });
    console.log(`  ${key.split('|')[0].padEnd(14)} ${String(n).padStart(2)} ${String(g).padStart(5)} ${String(kills).padStart(6)}  ${ws.map(v => (100 * v).toFixed(0).padStart(3)).join(' ').padEnd(46)} ${ss.map(v => (100 * v).toFixed(0).padStart(3)).join(' ').padEnd(27)} ${(len / Math.max(1, g)).toFixed(1)}${err ? ' ERR ' + err : ''}${dev > 1.6 ? ' <<' : ''}`);
  }
  console.log(`BATTLES ${bt.length} games; layouts where one position's mean score share > 1.6x fair: ${rows.filter(r => r.dev > 1.6).map(r => r.key).join(', ') || 'none'}`);
}
