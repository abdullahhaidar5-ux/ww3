// Chokepoint test: scripted columns squeezed through narrow spots in the headless sim (no AI, no enemy in reach), timed.
// Each scenario spawns a group on one side, gives ONE player order (act 'go' / 'line', the same path a click takes) and
// steps the sim until everyone has arrived or the time limit passes. Reports: time until 95% / 100% are there, and every
// unit that held a move order but moved < 14 px in 10 s while > 70 px from its goal ("stuck").
//   node orch/chokepoint.mjs [--only bridge40,inf60] [--json out.json] [--gate]
// --gate: prints CHOKEPOINT PASS when every scenario finishes inside its limit with nobody stuck > 10 s.
const { makeSim } = await import('./headless.mjs');
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const gate = process.argv.includes('--gate'), only = A('only', '');
const { W } = makeSim(A('src', undefined));
// spawn: kinds [[kind,count]], block centre (x,y), facing away from goal; goal (gx,gy); lim = seconds allowed for 100%
const SC = [
  { k: 'bridge40', map: 'bm_ferryquarter', units: [['tank', 40]], at: [1700, 1620], goal: [3100, 1620], lim: 75, what: '40 tanks over the middle river bridge (2 tiles wide)' },
  { k: 'inf60', map: 'bm_ferryquarter', units: [['inf', 60]], at: [1750, 1620], goal: [3050, 1620], lim: 75, what: '60 infantry over the same bridge' },
  { k: 'mixed', map: 'bm_ferryquarter', units: [['tank', 12], ['inf', 24], ['at', 8], ['arty', 4], ['aa', 4]], at: [1750, 1620], goal: [3050, 1620], lim: 80, what: 'mixed column (tanks, infantry, AT, artillery, AA) over the bridge' },
  { k: 'longbridge', map: 'bm_breakwater', units: [['tank', 30]], at: [1790, 1500], goal: [1790, 2950], lim: 90, what: '30 tanks down the long sea bridge (12 tiles long)' },
  { k: 'riverbank', map: 'bm_ferryquarter', units: [['tank', 24], ['inf', 16]], at: [1500, 1200], goal: [2330, 1250], lim: 45, what: 'group ordered onto the river bank (slots fall in the water)' },
  { k: 'dragline', map: 'bm_ferryquarter', units: [['tank', 16], ['inf', 24]], at: [1500, 1620], line: [[3000, 1350], [3000, 1900]], lim: 80, what: 'right-drag line on the far bank (column must cross the bridge)' },
  { k: 'corner', map: 'bm_ferryquarter', units: [['tank', 20], ['inf', 20]], at: [600, 500], goal: [60, 60], lim: 45, what: 'group ordered into the map corner (slots fall off the map)' },
  { k: 'boats', map: 'bm_breakwater', dom: 'naval', units: [['boat', 12]], at: [900, 2200], goal: [5400, 2200], lim: 90, what: '12 boats down the sea lane under both bridges' },
  { k: 'base', map: 'bm_ferryquarter', units: [['tank', 20], ['inf', 20]], at: [1150, 1650], goal: [450, 1650], lim: 60, what: 'group ordered through its own base to the far side' },
];
const STUCK = 10, rows = [];
for (const c of SC) {
  if (only && !only.split(',').includes(c.k)) continue;
  W.start({ seed: 7, facs: ['US', 'RU'], map: c.map, battle: true, diff: 1, mode: 'single' });
  const ids = W.ev(`(()=>{for(const T of G.teams)T.ai=null;for(const e of G.ents)if(!e.isB&&!e.dead){e.dead=true;e.hp=0;}G.ents=G.ents.filter(e=>!e.dead);
    const out=[],L=${JSON.stringify(c.units)};let n=0;for(const [k,m] of L)n+=m;const cols=Math.ceil(Math.sqrt(n*1.4));let i=0;
    for(const [k,m] of L)for(let j=0;j<m;j++,i++){const r=Math.floor(i/cols),q=i%cols;let x=${c.at[0]}-r*34,y=${c.at[1]}+(q-(cols-1)/2)*34;const p=nearestPassXY('${c.dom||'ground'}',x,y);if(p){x=p[0];y=p[1];}const u=addUnit(0,k,x,y);out.push(u.id);}
    return JSON.stringify(out);})()`);
  W.step(0.5);
  const a = c.line ? `{t:'line',ids:${ids},x:${c.line[0][0]},y:${c.line[0][1]},x2:${c.line[1][0]},y2:${c.line[1][1]}}` : `{t:'go',ids:${ids},x:${c.goal[0]},y:${c.goal[1]},mode:'move'}`;
  W.ev(`act(0,${a})`);
  const t0 = W.ev('G.t'); let t95 = null, t100 = null, stuck = [], trk = new Map(), worst = 0; const N = JSON.parse(ids).length;
  const ms0 = Date.now(); let pfN = 0;
  for (let s = 0; s < c.lim * 2 + 60; s++) {
    W.step(0.5);
    const S = W.ev(`(()=>{const o=[];for(const id of ${ids}){const u=G.byId.get(id);if(!u||u.dead){o.push(null);continue;}o.push([u.x,u.y,u.order?u.order.x:null,u.order?u.order.y:null]);}return o;})()`);
    pfN += +W.ev('G.pfN||0');
    const T = W.ev('G.t') - t0; let done = 0;
    S.forEach((v, i) => { if (!v) { done++; return; } const [x, y, ox, oy] = v; if (ox == null) { done++; trk.delete(i); return; }
      const d = Math.hypot(ox - x, oy - y), a = trk.get(i);
      if (!a || Math.hypot(a.x - x, a.y - y) > 14) { trk.set(i, { x, y, t: T }); return; }
      const w = T - a.t; if (w > worst && d > 70) worst = w;
      if (w >= STUCK && d > 70 && !a.rep) { a.rep = 1; stuck.push({ i, x: Math.round(x), y: Math.round(y), d: Math.round(d), t: Math.round(T) }); } });
    if (t95 == null && done >= Math.ceil(N * .95)) t95 = T;
    if (done >= N) { t100 = T; break; }
  }
  const r = { k: c.k, what: c.what, n: N, t95: t95 == null ? null : +t95.toFixed(1), t100: t100 == null ? null : +t100.toFixed(1), lim: c.lim, stuck: stuck.length, worst: +worst.toFixed(1), ms: Date.now() - ms0, where: stuck.slice(0, 5) };
  r.ok = t100 != null && t100 <= c.lim && !stuck.length; rows.push(r);
  console.log(c.k.padEnd(11), `n=${N}`.padEnd(6), '95%', String(r.t95).padStart(5), 's  all', String(r.t100).padStart(5), `s (limit ${c.lim})  stuck ${r.stuck}  longest stall ${r.worst}s  ${r.ms}ms`, r.ok ? 'ok' : 'FAIL', stuck.length ? JSON.stringify(r.where) : '');
}
if (A('json')) (await import('node:fs')).writeFileSync(A('json'), JSON.stringify(rows, null, 1));
if (gate) { const bad = rows.filter(r => !r.ok); console.log(bad.length ? 'CHOKEPOINT FAIL ' + bad.map(r => r.k).join(',') : 'CHOKEPOINT PASS'); process.exit(bad.length ? 1 : 0); }
