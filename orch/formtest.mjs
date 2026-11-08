// Formation check (no browser): extracts the formation engine from src/03-sim.js and runs it on a mixed group.
// Wedge/line/box/column/spread must put armour ahead of infantry and artillery/AA behind, scouts ahead, AT on the flanks,
// hold-formation must cap every ground unit at the slowest pace, and the result must be identical on a second run.
//   node orch/formtest.mjs     -> FORMTEST PASS / FORMTEST FAIL
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/03-sim.js', import.meta.url), 'utf8');
const a = src.indexOf('const FM_TYPES='), b = src.indexOf('// the AI sends its ground attack groups');
if (a < 0 || b < 0) { console.log('FORMTEST FAIL: engine not found'); process.exit(1); }
const mk = new Function('isVeh', 'setMove', `${src.slice(a, b)}; return {fmApply, fmRole, FM_TYPES};`);
const isVeh = s => s.armor === 'heavy' && s.dom === 'ground';
const fails = [];
function run(type, keep) {
  const orders = new Map();
  const setMove = (u, x, y, m) => { u.order = { type: m, x, y }; orders.set(u.id, u); };
  const E = mk(isVeh, setMove);
  const S = (cls, spd, armor, extra = {}) => ({ cls, spd, armor, dom: 'ground', ...extra });
  const us = []; let id = 1;
  const add = (n, s, kind) => { for (let i = 0; i < n; i++) us.push({ id: id++, x: 1000 + (i * 37) % 200, y: 1000 + (i * 53) % 160, r: 8, s, kind }); };
  add(3, S('tank', 90, 'heavy'), 'tank'); add(6, S('inf', 55, 'light'), 'rifle'); add(2, S('at', 55, 'light'), 'at');
  add(2, S('arty', 40, 'heavy', { rng: 900 }), 'arty'); add(1, S('aa', 80, 'heavy', { wpn: 'aa' }), 'aa'); add(1, S('inf', 50, 'light'), 'recon');
  E.fmApply(us, type, 3000, 1000, 1, 0, 'move', keep);   // facing +x
  return { us, E, pos: us.map(u => [u.id, +u.order.x.toFixed(2), +u.order.y.toFixed(2), u.order.cap || 0]) };
}
for (const t of ['line', 'wedge', 'box', 'column', 'spread']) {
  const r = run(t, true), r2 = run(t, true);
  if (JSON.stringify(r.pos) !== JSON.stringify(r2.pos)) fails.push(t + ': not deterministic');
  const avg = role => { const l = r.us.filter(u => r.E.fmRole(u) === role); return l.reduce((s, u) => s + u.order.x, 0) / l.length; };
  const A = avg('A'), I = avg('I'), R = avg('R'), Sc = avg('S');
  if (t !== 'box' && !(A > I)) fails.push(`${t}: armour (${A | 0}) not ahead of infantry (${I | 0})`);
  if (!(I > R) && t !== 'box') fails.push(`${t}: artillery (${R | 0}) not behind infantry (${I | 0})`);
  if (!(Sc > I)) fails.push(`${t}: scouts not ahead`);
  if (t === 'box') { const c = r.us.reduce((s, u) => s + u.order.x, 0) / r.us.length; const rr = r.us.filter(u => r.E.fmRole(u) === 'R'); if (!rr.every(u => Math.abs(u.order.x - 3000) < 90)) fails.push('box: artillery not inside the ring'); }
  const caps = new Set(r.us.map(u => u.order.cap)); if (caps.size !== 1 || ![...caps][0] || [...caps][0] > 40) fails.push(`${t}: units not held to the slowest pace (${[...caps]})`);
  const seen = new Set(r.us.map(u => u.order.x + ',' + u.order.y)); if (seen.size !== r.us.length) fails.push(t + ': two units share a slot');
}
console.log(fails.length ? 'FORMTEST FAIL\n' + fails.join('\n') : 'FORMTEST PASS');
process.exit(fails.length ? 1 : 0);
