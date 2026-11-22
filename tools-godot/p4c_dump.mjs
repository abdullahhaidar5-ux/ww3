// Lane P4c: dumps what the bridge gives Godot for one map (map_data + lines + fog + a stretch of battle events)
// into godot-build/p4c/<map>.json so the desktop viewer (godot/scenes/p4c_view.tscn) can draw the same ground
// and replay the same effects without a browser.
//   node tools-godot/p4c_dump.mjs bm_splitridge [--fight 240] [--secs 20] [--facs IR,US]
import fs from 'node:fs';
import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync(new URL('../godot/web/ww3sim.js', import.meta.url), 'utf8'), { filename: 'ww3sim.js' });
const B = globalThis.WW3;
const map = process.argv[2] || 'bm_splitridge';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const facs = arg('facs', 'IR,US').split(','), fight = +arg('fight', 0), secs = +arg('secs', 20);
const b64 = u => Buffer.from(u.buffer, u.byteOffset, u.byteLength).toString('base64');
const info = JSON.parse(B.newGame({ map, seed: +arg('seed', 1), players: facs.map((f, i) => ({ nation: f, team: i })) }));
const T = JSON.parse(B.tables());
const m = JSON.parse(B.mapMeta());
for (const k of ['grid', 'cover', 'wood', 'hgrid', 'road']) m['_' + k] = b64(B.mapBuf(k));
const out = { tables: { kinds: T.kinds, weapons: T.weapons, states: T.states }, map: m, teams: info.teams, lines: JSON.parse(B.lines()), frames: [] };
if (fight > 0) {
  let r; for (let s = 0; s < fight * 30; s++) { r = JSON.parse(B.step(2)); if (r.over) break; }
  out.lines = JSON.parse(B.lines());
  for (let s = 0; s < secs * 30; s++) { r = JSON.parse(B.step(2)); out.frames.push({ t: r.t, ev: r.ev, ent: b64(B.entBuf()), proj: b64(B.projBuf()) }); }
  out.fog = b64(B.fog(0));
  const c = {}; for (const f of out.frames) for (const e of f.ev) c[e[0]] = (c[e[0]] || 0) + 1; console.log('events', JSON.stringify(c));
}
fs.mkdirSync('godot-build/p4c', { recursive: true });
fs.writeFileSync(`godot-build/p4c/${map}.json`, JSON.stringify(out));
console.log(`${map}: ${m.MAPW}x${m.MAPH} hgrid ${m.hgrid.w}x${m.hgrid.h} R${m.hgrid.R}, ${m.trees.length} trees, ${m.civ.length} civ, ${m.bridges.length} bridges, ${out.frames.length} frames -> godot-build/p4c/${map}.json (${(fs.statSync(`godot-build/p4c/${map}.json`).size / 1e6).toFixed(1)} MB)`);
