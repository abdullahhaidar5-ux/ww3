// Side-by-side per-minute table: the browser game's simulation (js_*.json from js_baseline.mjs) vs the Godot port
// (godot_*.json from godot/sim/tests/battle_test.gd). Same nations, map, seed and difficulty.
// The port is not bit-exact yet (subset of systems), so the comparison is about shape: economy curve, army size,
// base growth, who wins and when. Writes tools-godot/out/compare.md.
//   node tools-godot/compare.mjs
import fs from 'node:fs';
const D = 'tools-godot/out';
const files = fs.readdirSync(D).filter(f => f.startsWith('js_') && f.endsWith('.json'));
let md = '# JS game vs Godot port: AI-vs-AI Battle, per game-minute\n\nunits u / buildings b / money $ for each side (rebel slot hidden). `end` = minute the battle ended and the winner.\n\n';
const sum = { js: { ms: [], end: [] }, godot: { ms: [], end: [] } };
for (const f of files.sort()) {
  const g = f.replace(/^js_/, 'godot_');
  if (!fs.existsSync(`${D}/${g}`)) continue;
  const J = JSON.parse(fs.readFileSync(`${D}/${f}`)), G = JSON.parse(fs.readFileSync(`${D}/${g}`));
  const side = (p) => `${p.units}u ${p.blds}b $${p.credits}`;
  md += `## ${J.facs.join(' vs ')} · ${J.map} → bm_splitridge · seed ${J.seed}\n\n| min | JS ${J.facs[0]} | JS ${J.facs[1]} | Godot ${G.facs[0]} | Godot ${G.facs[1]} |\n|---|---|---|---|---|\n`;
  const n = Math.max(J.rows.length, G.rows.length);
  for (let i = 0; i < n; i++) {
    const a = J.rows[i], b = G.rows[i];
    md += `| ${(a || b).min} | ${a ? side(a.per[0]) : '—'} | ${a ? side(a.per[1]) : '—'} | ${b ? side(b.per[0]) : '—'} | ${b ? side(b.per[1]) : '—'} |\n`;
  }
  const end = (R, F) => { const l = R.rows[R.rows.length - 1]; return l.over ? `min ${l.min}, ${l.winner >= 0 ? F[l.winner] : 'draw'} won` : 'running at min 10'; };
  md += `\nend: JS ${end(J, J.facs)} · Godot ${end(G, G.facs)}\n\n`;
  for (const [k, R] of [['js', J], ['godot', G]]) for (const r of R.rows) if (r.msPerStep) sum[k].ms.push(r.msPerStep);
}
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : '-';
md += `## Step cost in these small battles (10-50 entities)\n\nJS (Node 22, V8 JIT): ${avg(sum.js.ms)} ms/step · Godot 4.4 GDScript: ${avg(sum.godot.ms)} ms/step (mean of the per-minute means)\n`;
fs.writeFileSync(`${D}/compare.md`, md);
console.log(md);
