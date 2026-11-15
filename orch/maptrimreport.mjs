// Merge the Battle fairness games of the maptrim shortlist into orch/reports/maptrim.md.
//   node orch/maptrimreport.mjs <dir-with-fair-*.json> [more dirs...] [--kept a@2,b@4,...]
// Input: the shard files written by `node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json --out ...`
// (fetched from the maptrim-logs/* branches). Per map@players: games, kills/timeouts/draws, win rate per start, verdict
// (PASS = every start 40-60%). Static (structure) results are advisory for old maps (they are seed-random, not mirrored).
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), kept = (process.argv.includes('--kept') ? process.argv[process.argv.indexOf('--kept') + 1] : '').split(',').filter(Boolean);
const names = JSON.parse(fs.readFileSync('orch/out/mt-names.json', 'utf8'));   // id -> map name (written by the pipeline)
const all = [];
for (const d of args) for (const f of fs.readdirSync(d)) if (/^fair-.*\.json$/.test(f)) all.push(...JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
// one game = (id, round, g): later files win
const seen = new Map(); for (const r of all) seen.set((r.id || r.map) + '|' + r.round + '|' + r.g, r);
const by = {};
for (const r of seen.values()) { if (r.result === 'error') { (by[r.id] ||= { err: 0, G: [] }).err++; continue; } (by[r.id || r.map] ||= { err: 0, G: [] }).G.push(r); }
const rows = [];
for (const id of Object.keys(by)) {
  const { G, err } = by[id], n = +id.split('@')[1], w = new Array(n).fill(0), c = new Array(n).fill(0); let kill = 0, time = 0, draw = 0;
  for (const r of G) { if (r.result === 'kill') kill++; else if (r.result === 'timeout') time++; else draw++;
    r.tm.forEach((t, i) => { const p = r.st ? r.st[i] : i; c[p]++; w[p] += r.win < 0 ? .5 : r.win === t ? 1 : 0; }); }
  const rate = w.map((v, i) => c[i] ? v / c[i] : .5), ok = G.length >= 30 && rate.every(v => v >= .4 && v <= .6);
  rows.push({ id, n, games: G.length, err, kill, time, draw, rate, ok });
}
rows.sort((a, b) => a.n - b.n || a.id.localeCompare(b.id));
const out = ['# Battle maps: fairness of the maptrim shortlist', '',
  'AI-vs-AI Battle games (`node orch/battlemapfair.mjs --battles --list orch/maptrim-list.json`; mirror matches, seats rotate through the start positions, sides swap team numbers). **PASS = every start wins 40-60%.**',
  'Merged by `node orch/maptrimreport.mjs`. Old maps (the 2-8 player maps from `src/02-map.js`, `02b`, `02c`) are seed-random, not mirrored by construction, so the strict structure check of `battlemapfair --static` is advisory for them; the game results decide.', '',
  '| Map@players | Name | Games (kill / on time / draw / errors) | Win rate per start | Verdict | In the Battle list |', '|---|---|---|---|---|---|'];
for (const r of rows) out.push(`| ${r.id} | ${names[r.id] || ''} | ${r.games} (${r.kill} / ${r.time} / ${r.draw} / ${r.err}) | ${r.rate.map(v => Math.round(v * 100) + '%').join(' / ')} | ${r.ok ? 'PASS' : 'FAIL'} | ${kept.includes(r.id) ? 'yes' : ''} |`);
out.push('');
fs.writeFileSync('orch/reports/maptrim-raw.md', out.join('\n'));
console.log(out.join('\n')); fs.writeFileSync('orch/out/mt-rows.json', JSON.stringify(rows));
