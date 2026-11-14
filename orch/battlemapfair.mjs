// Battle map fairness checker (plain Node, the real simulation through orch/headless.mjs; reuses mapfair's method).
//
//   node orch/battlemapfair.mjs --static                  # structural checks only (seconds): every Battle map must pass
//   node orch/battlemapfair.mjs --static --maps tarbasin  # one map (the id from src/02d-battlemaps.js)
//   node orch/battlemapfair.mjs --static --dump out.json  # + the ground grids, for orch/battlemapshots.py overview pictures
//   node orch/battlemapfair.mjs --battles [--games 40] [--minutes 22] [--jobs 2] [--maps a,b]
//                                                         # AI-vs-AI Battle games; writes orch/out/battlemapfair-battles.json
//   node orch/battlemapfair.mjs --report                  # writes orch/reports/battlemaps.md from the static check + saved battles
//
// STRUCTURE (per map, at 2 players, at its full player count and every even count between):
//   - every supply source and derrick of the map data is really on the ground (none swallowed by water, rock or a town)
//   - every start can drive to every other start
//   - nearest supply source: same driving distance for every start (within 12%)
//   - derricks within reach (0.75 x the shortest start-to-start route): same count for every start
//   - route to the nearest enemy: same length for every start (within 15%); mean route to all enemies within 20%
//   - at least 2 attack routes between every pair of starts: after walling off a 200-wide band along the shortest
//     route (outside 450 of both bases) another way through must remain
//   - cliffs, water, bridges, starts and resources are identical for different seeds (only the houses inside towns
//     and hamlets vary with the seed); every check runs on three seeds
// WIN RATES: mirror matches (every player the same nation, so only the start position differs), nations rotate per game.
//   2 players: 1v1. 4 / 6 players: 2v2 / 3v3 over every way to split the starts into two teams. A game that runs out of
//   time goes to the side with 1.15x the base + army value, else it is a draw (half a win each).
//   PASS = every start position wins 40-60% of its games.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const NATIONS = ['US', 'RU', 'CN', 'IR', 'TR', 'RS', 'IN', 'UA', 'KP', 'SA', 'PK', 'EG', 'IL', 'DW', 'KR', 'JP'];
const OUT = path.join(ROOT, 'orch/out'); fs.mkdirSync(OUT, { recursive: true });
const BATTLES_JSON = path.join(OUT, 'battlemapfair-battles.json'), STATIC_JSON = path.join(OUT, 'battlemapfair-static.json');

export const STATIC_FN = `globalThis.__bmStatic=(k,n,seed,dump)=>{setWorld(worldScaleFor(n,k));setBases(n,k,-1);const sv=srand;let M,M2;try{M=mkMap(seed,k);M2=mkMap(seed+977,k);}finally{srand=sv;}
  const B=BM[k],cell=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL),NB=BASES.length,DB=BASES.map(([x,y])=>gridDist(M.grid,x,y));
  const town=(x,y)=>M.cities.some(c=>Math.hypot(c.x-x,c.y-y)<c.r+90)||M.hamlets.some(h=>Math.hypot(h.x-x,h.y-y)<190);let same=M.grid.length===M2.grid.length;for(let i=0;same&&i<M.grid.length;i++)if(M.grid[i]!==M2.grid[i]&&!town((i%GW)*CELL+CELL/2,((i/GW)|0)*CELL+CELL/2))same=false;
  const dAt=(i,x,y)=>{let m=DB[i][cell(x,y)];if(m<1e8)return m;for(let r=1;r<4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=Math.floor(x/CELL)+dx,Y=Math.floor(y/CELL)+dy;if(X<0||Y<0||X>=GW||Y>=GH)continue;m=Math.min(m,DB[i][Y*GW+X]+CELL*r);}return m;};
  const eD=BASES.map((_,i)=>BASES.map((q,j)=>j===i?0:Math.round(dAt(i,q[0],q[1]))));
  let near=1e9;for(let i=0;i<NB;i++)for(let j=0;j<NB;j++)if(i!==j)near=Math.min(near,eD[i][j]);const reach=.75*near;
  const b=BASES.map(([x,y],i)=>{const en=eD[i].filter((_,j)=>j!==i);return{x:Math.round(x),y:Math.round(y),sup:Math.round(Math.min(...M.fields.map(f=>dAt(i,f.x,f.y)))),supN:M.fields.filter(f=>dAt(i,f.x,f.y)<=reach).length,
    oil:M.oil.filter(o=>dAt(i,o.x,o.y)<=reach).length,eMin:Math.min(...en),eMean:Math.round(en.reduce((a,v)=>a+v,0)/en.length),ok:en.every(v=>v<1e8)};});
  // 2 attack routes: wall off a band along the shortest route (outside both base zones) and look for another way
  const routes=[];const ZB=450,RB=Math.round(100/CELL);
  for(let i=0;i<NB;i++)for(let j=i+1;j<NB;j++){if(!(eD[i][j]<1e8)){routes.push([i,j,0]);continue;}
    const g2=Uint8Array.from(M.grid);let c=cell(BASES[j][0],BASES[j][1]);if(!(DB[i][c]<1e8)){let bd=1e9,bc=c;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const q=c+dy*GW+dx;if(q>=0&&q<GW*GH&&DB[i][q]<bd){bd=DB[i][q];bc=q;}}c=bc;}
    const path=[c];let guard=0;while(DB[i][c]>CELL&&guard++<20000){const cx=c%GW,cy=(c/GW)|0;let bc=-1,bd=DB[i][c];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=cx+dx,Y=cy+dy;if(X<0||Y<0||X>=GW||Y>=GH)continue;const q=Y*GW+X;if(DB[i][q]<bd){bd=DB[i][q];bc=q;}}if(bc<0)break;c=bc;path.push(c);}
    // pull the cell route straight (line of sight on the ground grid), so the band follows the real line of advance
    const ps=v=>v===0||v===2,clear=(a,b)=>{const ax=a%GW,ay=(a/GW)|0,bx=b%GW,by=(b/GW)|0,n=Math.ceil(Math.hypot(bx-ax,by-ay)*2);for(let q=0;q<=n;q++){const X=Math.round(ax+(bx-ax)*q/n),Y=Math.round(ay+(by-ay)*q/n);if(!ps(M.grid[Y*GW+X]))return false;}return true;};
    const sm=[path[0]];for(let a=0;a<path.length-1;){let b=path.length-1;while(b>a+1&&!clear(path[a],path[b]))b--;sm.push(path[b]);a=b;}
    for(let a=0;a<sm.length-1;a++){const ax=sm[a]%GW,ay=(sm[a]/GW)|0,bx=sm[a+1]%GW,by=(sm[a+1]/GW)|0,n=Math.ceil(Math.hypot(bx-ax,by-ay)*2)||1;for(let q=0;q<=n;q++){const fx=ax+(bx-ax)*q/n,fy=ay+(by-ay)*q/n,px=fx*CELL+CELL/2,py=fy*CELL+CELL/2;
      if(Math.hypot(px-BASES[i][0],py-BASES[i][1])<ZB||Math.hypot(px-BASES[j][0],py-BASES[j][1])<ZB)continue;
      for(let dy=-RB;dy<=RB;dy++)for(let dx=-RB;dx<=RB;dx++){const X=Math.round(fx)+dx,Y=Math.round(fy)+dy;if(X>=0&&Y>=0&&X<GW&&Y<GH&&dx*dx+dy*dy<=RB*RB)g2[Y*GW+X]=3;}}}
    const D2=gridDist(g2,BASES[i][0],BASES[i][1]);let m=1e9;{const X0=Math.floor(BASES[j][0]/CELL),Y0=Math.floor(BASES[j][1]/CELL);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const X=X0+dx,Y=Y0+dy;if(X>=0&&Y>=0&&X<GW&&Y<GH)m=Math.min(m,D2[Y*GW+X]);}}
    routes.push([i,j,m<1e8?2:1,Math.round(m<1e8?m:0)]);}
  const r={k,n,seed,W:MAPW,H:MAPH,F:M.fields.length,O:M.oil.length,wantF:B?B.E.fl.length:-1,wantO:B?B.E.oil.length:-1,same,reach:Math.round(reach),b,eD,routes,water:M.hasWater?1:0};
  if(dump){r.GW=GW;r.GH=GH;r.grid=Array.from(M.grid).join('');r.fields=M.fields.map(f=>[f.x|0,f.y|0,f.amt]);r.oil=M.oil.map(o=>[o.x|0,o.y|0]);r.cities=M.cities.map(c=>[c.x|0,c.y|0,c.r|0]);r.hamlets=M.hamlets.map(h=>[h.x|0,h.y|0]);r.theme=M.theme;r.name=M.name;r.roads=(M.roads||[]).map(p=>p.map(([x,y])=>[x*WK|0,y*WK|0]));r.cb=(M.cityBlds||[]).length;}
  return r;}`;

// structural verdict for one map at one player count: list of problems (empty = pass)
export function judge(r) {
  const bad = [], sp = a => { const lo = Math.min(...a), hi = Math.max(...a); return lo > 0 ? (hi - lo) / lo : 9; };
  if (r.F !== r.wantF) bad.push(`only ${r.F} of ${r.wantF} supply sources are on the ground`);
  if (r.O !== r.wantO) bad.push(`only ${r.O} of ${r.wantO} oil derricks are on the ground`);
  if (!r.same) bad.push('the ground changes with the seed');
  if (r.b.some(b => !b.ok)) bad.push('a start cannot drive to every other start');
  else {
    if (sp(r.b.map(b => b.sup)) > .12) bad.push(`nearest supply source is not equally far (${r.b.map(b => b.sup).join(' / ')})`);
    if (new Set(r.b.map(b => b.oil)).size > 1) bad.push(`oil derricks within reach differ (${r.b.map(b => b.oil).join(' / ')})`);
    if (sp(r.b.map(b => b.eMin)) > .15) bad.push(`route to the nearest enemy is not equally long (${r.b.map(b => b.eMin).join(' / ')})`);
    if (sp(r.b.map(b => b.eMean)) > .20) bad.push(`mean route to the enemies is not equally long (${r.b.map(b => b.eMean).join(' / ')})`);
    const one = r.routes.filter(q => q[2] < 2); if (one.length) bad.push(`fewer than 2 attack routes between starts ${one.map(q => (q[0] + 1) + '-' + (q[1] + 1)).join(', ')}`);
  }
  return bad;
}
// the player counts a map is checked at: 2, its full count, and the even counts between
export const countsOf = max => { const a = []; for (let n = 2; n <= max; n += 2) a.push(n); if (!a.includes(max)) a.push(max); return a; };
// every way to split n starts into two equal teams (start 0 always on team 0)
function splits(n) { if (n === 2) return [[0, 1]]; const out = [], h = n / 2; const rec = (i, tm, c0) => { if (i === n) { if (c0 === h) out.push(tm.slice()); return; } if (c0 < h) { tm[i] = 0; rec(i + 1, tm, c0 + 1); } if (i - c0 < h) { tm[i] = 1; rec(i + 1, tm, c0); } }; rec(1, [0], 1); return out; }

const MAIN = !!process.argv[1] && path.resolve(process.argv[1]) === SELF;
if (!MAIN) { /* imported (orch/decisions.mjs uses STATIC_FN, judge, countsOf) */ } else if (process.argv[2] === '--child') {
  globalThis.__ww3prof = { now: () => performance.now(), t: {}, c: {} };
  const { makeSim } = await import('./headless.mjs');
  let W = null; const P = globalThis.__ww3prof;
  process.on('message', m => {
    if (!m) process.exit(0);
    const t0 = Date.now(); let r;
    try {
      if (!W) W = makeSim(undefined, { prof: [] }).W;
      if (m.list) { process.send({ list: P.ev('BM_KEYS.concat(BM_HELD).map(k=>bmInfo(k))') }); return; }
      if (m.static) { if (!globalThis.__bmStatic) P.ev(STATIC_FN); r = P.ev(`__bmStatic(${JSON.stringify(m.map)},${m.n},${m.seed},${m.dump ? 1 : 0})`); process.send(r); return; }
      W.start({ seed: m.seed, map: m.map, facs: m.facs, tm: m.tm, st: m.st, diff: m.diff, battle: 1 });
      let st = null;
      for (let t = 0; t < m.minutes * 60; t += 30) { st = W.step(30); if (st.over) break; }
      const info = W.info();
      const score = P.ev(`G.teams.filter(T=>!T.reb).map(T=>{const F=forceOf(T);return T.out?0:Math.round(F.bv+F.uv+F.dz*500);})`);
      const side = [0, 0]; m.tm.forEach((t, i) => { side[t] += score[i] || 0; });
      let win = -1, result = 'draw';
      if (info.over && info.winner != null && info.winner >= 0 && m.tm[info.winner] != null) { win = m.tm[info.winner]; result = 'kill'; }
      else if (side[0] >= side[1] * m.adj && side[0] > 0) { win = 0; result = 'timeout'; }
      else if (side[1] >= side[0] * m.adj && side[1] > 0) { win = 1; result = 'timeout'; }
      const at = P.ev('G.teams.filter(T=>!T.reb).map((T,i)=>{const h=G.ents.find(e=>e.isB&&e.team===T.id&&e.kind==="hq");return BASES[i]?BASE_SLOTS.indexOf(BASES[i]):-1})');
      r = { ...m, win, result, t: Math.round(info.t), score, at, wall: Date.now() - t0, battle: P.ev('G.battle?1:0') };
    } catch (e) { r = { ...m, win: -1, result: 'error', err: String(e && e.stack || e).slice(0, 400) }; }
    process.send(r);
  });
} else {
  const JOBS = Math.max(1, +argS('jobs', Math.min(os.cpus().length, 4)));
  const pool = (jobs, n, onDone) => new Promise(res => {
    const out = []; let next = 0, live = 0;
    const spawn = () => { const ch = fork(SELF, ['--child'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] }); live++;
      const feed = () => { if (next >= jobs.length) { ch.send(null); return; } ch.send(jobs[next++]); };
      ch.on('message', r => { out.push(r); if (onDone) onDone(r, out.length); feed(); }); ch.on('exit', () => { if (--live === 0) res(out); }); feed(); };
    for (let i = 0; i < Math.min(n, Math.max(1, jobs.length)); i++) spawn();
  });
  const list = (await pool([{ list: 1 }], 1))[0].list;
  const want = argS('maps', '') ? argS('maps', '').split(',').map(s => 'bm_' + s.replace(/^bm_/, '')) : null;
  const maps = list.filter(m => !want || want.includes(m.k));
  if (!maps.length) { console.error('no Battle map matches'); process.exit(1); }

  const runStatic = async dump => {
    const jobs = []; for (const m of maps) for (const n of countsOf(m.players)) for (const seed of [4242, 7, 990001]) jobs.push({ static: 1, map: m.k, n, seed, dump: dump && n === m.players && seed === 4242 });
    const res = await pool(jobs, JOBS); res.sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : a.n - b.n || a.seed - b.seed);
    for (const r of res) r.bad = judge(r); return res;
  };

  if (has('static')) {
    const dumpF = argS('dump', ''), res = await runStatic(!!dumpF); let fail = 0;
    for (const r of res) { const ok = !r.bad.length; if (!ok) fail++;
      if (ok && r.seed !== 4242) continue;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.k.padEnd(16)} ${r.n}p seed ${r.seed}  supply ${r.b.map(b => b.sup).join('/')}  oil in reach ${r.b.map(b => b.oil).join('/')}  nearest enemy ${r.b.map(b => b.eMin).join('/')}  routes ${r.routes.every(q => q[2] >= 2) ? '2+' : 'ONE'}${ok ? '' : '\n       ' + r.bad.join('\n       ')}`); }
    if (dumpF) fs.writeFileSync(dumpF, JSON.stringify(res.filter(r => r.grid)));
    fs.writeFileSync(STATIC_JSON, JSON.stringify(res.map(r => { const q = { ...r }; delete q.grid; return q; })));
    console.log(fail ? `BATTLEMAPFAIR STATIC FAIL (${fail})` : `BATTLEMAPFAIR STATIC PASS (${maps.length} maps, ${res.length} checks)`);
    process.exit(fail ? 1 : 0);
  } else if (has('battles')) {
    const GAMES = +argS('games', 40), MIN = +argS('minutes', 22), ROUND = +argS('round', 1), jobs = [];
    for (const m of maps) { const S = splits(m.players), per = Math.ceil(GAMES / (S.length * m.players)) * S.length * m.players;
      for (let g = 0; g < per; g++) { const f = NATIONS[(g + (ROUND - 1) * 5 + m.k.length) % NATIONS.length];
        // seats rotate through the start positions (player i starts on spot st[i]), so a seat's own quirks (who moves first) cancel out
        const rot = Math.floor(g / S.length) % m.players, st = Array.from({ length: m.players }, (_, i) => (i + rot) % m.players);
        // ... and the two sides swap their team numbers every full cycle (and from round to round), so "team 1 moves first" cancels out too
        const flip = (Math.floor(g / (S.length * m.players)) + ROUND) % 2;
        jobs.push({ map: m.k, n: m.players, g, seed: 9000 * ROUND + g * 131 + m.k.length * 7, facs: new Array(m.players).fill(f), st, flip, v: 3, tm: st.map(p => S[g % S.length][p] ^ flip), minutes: MIN + (m.players > 2 ? 6 : 0), diff: 1, adj: 1.15, round: ROUND }); } }
    console.log(`battlemapfair: ${jobs.length} Battle games on ${maps.length} maps, ${JOBS} at a time`);
    let prev = []; try { prev = JSON.parse(fs.readFileSync(BATTLES_JSON, 'utf8')); } catch (e) { }
    const keep = prev.filter(r => !jobs.some(j => j.map === r.map && j.g === r.g && j.round === r.round));
    const t0 = Date.now(); const acc = [];
    await pool(jobs, JOBS, (r, k) => { acc.push(r); if (k % 4 === 0 || r.result === 'error') { console.log(`  ${k}/${jobs.length}  ${r.map} g${r.g} ${r.facs[0]} ${r.result}${r.err ? ' ' + r.err : ''} win side ${r.win} t=${r.t}s  (${Math.round((Date.now() - t0) / 1000)} s)`); fs.writeFileSync(BATTLES_JSON, JSON.stringify(keep.concat(acc))); } });
    fs.writeFileSync(BATTLES_JSON, JSON.stringify(keep.concat(acc)));
    console.log(rates(keep.concat(acc), maps).txt);
  } else if (has('report')) {
    const st = await runStatic(false); let bt = []; try { bt = JSON.parse(fs.readFileSync(BATTLES_JSON, 'utf8')); } catch (e) { }
    const R = rates(bt, maps), md = ['# Battle maps: fairness report', '', 'Written by `node orch/battlemapfair.mjs --report` (structure checked now; win rates from the saved AI-vs-AI Battle games in `orch/out/battlemapfair-battles.json`).', '',
      '## Structure', '', '| Map | Players | Supply sources / derricks | Nearest supply (each start) | Derricks in reach | Route to nearest enemy | 2+ attack routes | Verdict |', '|---|---|---|---|---|---|---|---|'];
    for (const r of st.filter(r => r.seed === 4242 || r.bad.length)) md.push(`| ${maps.find(m => m.k === r.k).name} | ${r.n} | ${r.F} / ${r.O} | ${r.b.map(b => b.sup).join(' / ')} | ${r.b.map(b => b.oil).join(' / ')} | ${r.b.map(b => b.eMin).join(' / ')} | ${r.routes.every(q => q[2] >= 2) ? 'yes' : 'NO'} | ${r.bad.length ? 'FAIL: ' + r.bad.join('; ') : 'pass'} |`);
    md.push('', 'Distances are driving distances on the ground grid, in map units. Tolerances and method: header of `orch/battlemapfair.mjs`.', '', '## Win rate per start position (AI vs AI, mirror matches)', '',
      'Every player in a game is the same nation, so only the start position differs; the nation changes from game to game, and the seats rotate through the start positions and the two sides swap team numbers, so a seat\'s or a team number\'s own quirks cancel out. 2 players: 1v1. 4 / 6 players: 2v2 / 3v3 over every split of the starts into two teams. Out of time: the side with 1.15x the value wins, else a draw (half a win each). Pass = every start between 40% and 60%. The verdict uses rounds 4 and 5 (design and size fixed before they were run).', '',
      '| Map | Players | Games (decided by kill / on time / draws) | Win rate per start | Verdict |', '|---|---|---|---|---|');
    for (const m of maps) { const q = R.by[m.k]; md.push(q ? `| ${m.name} | ${m.players} | ${q.n} (${q.kill} / ${q.time} / ${q.draw}) | ${q.rate.map(v => Math.round(v * 100) + '%').join(' / ')} | ${q.ok ? 'pass' : 'FAIL'} |` : `| ${m.name} | ${m.players} | 0 | not run | NOT PROVEN |`); }
    md.push('', 'Replay: `node orch/battlemapfair.mjs --battles --games 40 --round 4` and `--round 5` (same seeds, same games).', '');
    const R0 = rates(bt, maps, false); if (Object.keys(R0.by).length) { md.push('### Pilot runs (not used for the verdict)', '',
      'Round 1 had no seat rotation (player 1 always on start 1), rounds 2-3 rotated seats but the side holding start 1 was always team 1. Start 1 won about 57% across maps in these runs, so the final design also swaps team numbers. Breakwater and Six Roads were changed after these runs (home supply moved closer), so their pilot numbers are for the old layout. Kept for the record.', '', '| Map | Games | Win rate per start |', '|---|---|---|');
      for (const m of maps) { const q = R0.by[m.k]; if (q) md.push(`| ${m.name} | ${q.n} | ${q.rate.map(v => Math.round(v * 100) + '%').join(' / ')} |`); } md.push(''); }
    fs.writeFileSync(path.join(ROOT, 'orch/reports/battlemaps.md'), md.join('\n'));
    console.log(md.join('\n'));
    const bad = st.some(r => r.bad.length) || maps.some(m => !R.by[m.k] || !R.by[m.k].ok); process.exit(bad ? 1 : 0);
  } else { console.log('usage: --static | --battles | --report   (see the header of this file)'); }
}

function rates(res, maps, rot = true) {   // rot: the final design (v 3: seats rotate, sides swap numbers); false: the earlier pilot games
  const by = {}, lines = [];
  for (const m of maps) { const G = res.filter(r => r.map === m.k && r.result !== 'error' && (rot ? r.v === 3 : r.v !== 3)); if (!G.length) continue;
    const w = new Array(m.players).fill(0), c = new Array(m.players).fill(0); let kill = 0, time = 0, draw = 0;
    for (const r of G) { if (r.result === 'kill') kill++; else if (r.result === 'timeout') time++; else draw++;
      r.tm.forEach((t, i) => { const p = r.st ? r.st[i] : i; c[p]++; w[p] += r.win < 0 ? .5 : r.win === t ? 1 : 0; }); }
    const rate = w.map((v, i) => v / c[i]), ok = rate.every(v => v >= .4 && v <= .6);
    by[m.k] = { n: G.length, kill, time, draw, rate, ok };
    lines.push(`${ok ? 'ok  ' : 'FAIL'} ${m.k.padEnd(16)} ${G.length} games (${kill} kill, ${time} on time, ${draw} draw)  win rate per start ${rate.map(v => Math.round(v * 100) + '%').join(' / ')}`); }
  return { by, txt: lines.join('\n') };
}
