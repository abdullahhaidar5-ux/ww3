// Stuck-unit scan: seeded AI-vs-AI games in the headless sim; logs every ground/sea unit that holds a move order but makes
// no progress for STUCK_S game-seconds (where, what, what blocks it). Used by the gate in its short form (--short) and for
// orch/reports/stuck.md.   node orch/stuckscan.mjs [--maps strait,golan|all] [--mode conquest|battle|both] [--minutes 6]
//   [--players 2] [--seed 1] [--stuck 10] [--short] [--max N] [--md orch/reports/stuck.md] [--json out.json]
// --short = 6 maps x conquest + battle, 9 game-minutes; "STUCKSCAN PASS" when the stuck-episode count stays under --max (default 8: the code before the fixes had 11 on this set, today's has 3).
import fs from 'node:fs'; import path from 'node:path';
const { makeSim } = await import('./headless.mjs');
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const short = process.argv.includes('--short');
const minutes = +A('minutes', short ? 9 : 6), players = +A('players', 2), seed = +A('seed', 1), STUCK = +A('stuck', 10), MAX = +A('max', 8);
const mode = A('mode', 'both');
const FACS = ['US', 'RU', 'IR', 'CN', 'KP', 'RS', 'IL', 'FR'];
const SRCDIR = A('src', undefined);
const { W } = makeSim(SRCDIR);
const allMaps = JSON.parse(JSON.stringify(W.ev('Object.keys(MAPS)')));
let maps = A('maps', short ? 'strait,golan,taiwan,honshu,volga,rivers' : 'all'); maps = maps === 'all' ? allMaps : maps.split(',');
const modes = mode === 'both' ? ['conquest', 'battle'] : [mode];
const SAMPLE = `(()=>{const o=[];for(const e of G.ents){if(e.dead||e.isB||e.aband||(e.crit&1)||e.stun>G.t||!e.s||e.s.dom==='air'||!e.order||(e.order.type!=='move'&&e.order.type!=='amove'&&e.order.type!=='attackmove'))continue;o.push([e.id,e.kind,e.team,e.x,e.y,e.order.x,e.order.y,e.s.dom,e.s.cls,e.inside?1:0,e.state||'',(e.cargoOf||0)||(e.target&&!e.target.dead?1:0),e.r||0]);}return o;})()`;
const WHY = (x, y, dom, id) => `(()=>{const x=${x},y=${y},cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);const v=G.grid[cy*GW+cx];let blk=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&!passC('${dom}',cx+dx,cy+dy))blk++;
 let nb=null,nd=1e9;for(const e of G.ents){if(!e.isB||e.dead)continue;const d=Math.hypot(e.x-x,e.y-y)-(e.r||30);if(d<nd){nd=d;nb=e.kind;}}let cr=0;for(const e of G.ents){if(e.dead||e.isB||e.id===${id}||!e.s||e.s.dom==='air')continue;if(Math.hypot(e.x-x,e.y-y)<40)cr++;}
 return {tile:v,blk,bld:nb,bd:Math.round(nd),crowd:cr,ok:passXY('${dom}',x,y)};})()`;
// units standing on a tile they cannot stand on (ground/sea units embedded in rock, water or a building footprint)
const EMB = `(()=>{const o=[];bocc();for(const e of G.ents){if(e.dead||e.isB||e.aband||(e.crit&1)||e.stun>G.t||!e.s||e.s.dom==='air'||e.inside||e.cargoOf||e.inTun||e.s.cls==='boat'&&0)continue;if(!passXY(e.s.dom,e.x,e.y))o.push([e.id,e.kind,e.team,e.x,e.y,e.s.dom,e.s.cls]);}return o;})()`;
const rows = [], per = [], embSeen = new Set();
for (const md of modes) for (const mp of maps) {
  const n = Math.max(2, Math.min(players, +W.ev(`(MAPS['${mp}']||{max:2}).max`) || 2));
  const facs = FACS.slice(0, n); let st;
  try { st = W.start({ seed, facs, map: mp, battle: md === 'battle', diff: 1, mode: 'single' }); } catch (e) { console.log('skip', md, mp, e.message.slice(0, 80)); continue; }
  if (st.map !== mp) { console.log('skip', md, mp, '(map not used)'); continue; }
  const trk = new Map(), done = new Set(); let eps = 0, moving = 0;
  for (let t = 1; t <= minutes * 60; t++) {
    const r = W.step(1); const T = r.t, S = W.ev(SAMPLE); moving += S.length;
    if (t % 5 === 0) for (const [id, kind, team, x, y, dom, cls] of W.ev(EMB)) { if (embSeen.has(md + mp + id)) continue; embSeen.add(md + mp + id); eps++; rows.push({ mode: md, map: mp, t: Math.round(T), id, kind, cls, dom, team, x: Math.round(x), y: Math.round(y), dist: 0, ...W.ev(WHY(x, y, dom, id)), state: 'embedded', emb: 1 }); }
    const seen = new Set();
    for (const [id, kind, team, x, y, ox, oy, dom, cls, ins, state, cg, rr] of S) {
      seen.add(id); if (ins || cg) { trk.delete(id); continue; }
      let a = trk.get(id); if (!a || Math.hypot(a.x - x, a.y - y) > 14 || Math.hypot(ox - a.ox, oy - a.oy) > 30) { trk.set(id, { x, y, t: T, ox, oy, t0: T }); continue; }
      const dist = Math.hypot(ox - x, oy - y);
      if (T - a.t >= STUCK && dist > 70 && !done.has(id + ':' + (a.t | 0))) {
        done.add(id + ':' + (a.t | 0)); eps++;
        const w = W.ev(WHY(x, y, dom, id));
        rows.push({ mode: md, map: mp, t: Math.round(T), id, kind, cls, dom, team, x: Math.round(x), y: Math.round(y), dist: Math.round(dist), ...w, state });
      }
    }
    for (const id of [...trk.keys()]) if (!seen.has(id)) trk.delete(id);
    if (r.over) break;
  }
  per.push({ mode: md, map: mp, eps, moving }); console.log(md.padEnd(8), mp.padEnd(12), 'stuck episodes', String(eps).padStart(3), ' mover-seconds', moving);
}
const cause = r => r.emb ? 'embedded in blocked tile/footprint' : !r.ok ? 'inside blocked tile' : r.bd < 12 && r.bld ? 'against building ' + r.bld : r.crowd >= 6 ? 'crowd jam' : r.blk >= 5 ? 'narrow gap / coast' : r.tile === 2 ? 'bridge' : 'open ground';
for (const r of rows) r.cause = cause(r);
const total = rows.length;
const byCause = {}; for (const r of rows) byCause[r.cause] = (byCause[r.cause] || 0) + 1;
console.log('total stuck episodes', total, JSON.stringify(byCause));
if (A('json')) fs.writeFileSync(A('json'), JSON.stringify({ per, rows }, null, 1));
if (A('md')) {
  let m = `# Stuck units (orch/stuckscan.mjs)\n\nSeeded AI-vs-AI games (${players} players, seed ${seed}, ${minutes} game-minutes each). An episode = a unit with a move order that moved less than 14 px for ${STUCK}+ seconds while still more than 70 px from its goal.\n\n**Total ${total}** — ${Object.entries(byCause).map(([k, v]) => k + ' ' + v).join(', ')}\n\n| mode | map | episodes |\n|---|---|---|\n`;
  for (const p of per) if (p.eps) m += `| ${p.mode} | ${p.map} | ${p.eps} |\n`;
  m += `\n## Where (first 80)\n\n| mode | map | t | unit | class | spot | to goal | cause | tile | blocked nbrs | nearest building | crowd |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows.slice(0, 80)) m += `| ${r.mode} | ${r.map} | ${r.t} | ${r.kind} | ${r.cls}/${r.dom} | ${r.x},${r.y} | ${r.dist} | ${r.cause} | ${r.tile} | ${r.blk} | ${r.bld || '-'} ${r.bd} | ${r.crowd} |\n`;
  fs.writeFileSync(A('md'), m);
}
if (short) { console.log(total <= MAX ? 'STUCKSCAN PASS' : 'STUCKSCAN FAIL', `(${total} <= ${MAX})`); process.exit(total <= MAX ? 0 : 1); }
