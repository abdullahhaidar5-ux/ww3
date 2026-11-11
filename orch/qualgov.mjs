// Guard for the frame-time governor (src/06-view.js, qualGov): under an artificial heavy load it steps down, when the load
// goes away it steps back up, a CPU-bound frame lowers effects only (never resolution), and it never flickers.
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/06-view.js', import.meta.url), 'utf8');
const m = src.match(/\/\*QUALGOV\*\/([\s\S]*?)\/\*QUALGOV\*\//); if (!m) { console.log('QUALGOV FAIL: markers missing'); process.exit(1); }
const qualGov = new Function(m[1] + ';return qualGov;')();
let bad = 0; const ok = (c, msg) => { if (!c) { bad++; console.log('FAIL ' + msg); } };
const T = 60, mk = () => ({ lv: 0, fx: 0, t: 0, wait: 10, ema: 1 / 60, bad: 0, good: 0, cost: 1 / 200, min: 0 });
// simulate: frame time ft (s), CPU share cost (s) per frame for sec seconds; returns step log
function run(Q, sec, ft, cost, f) { const log = []; for (let i = 0; i < sec * 60; i++) { Q.ema += (ft - Q.ema) * .05; Q.cost += (cost - Q.cost) * .05; const l = Q.lv, x = Q.fx; if (qualGov(Q, ft, T)) log.push([+Q.t.toFixed(1), l, x, Q.lv, Q.fx]); if (f) f(Q); } return log; }
// 1. GPU-bound overload (30 fps, cheap CPU): resolution steps down, several steps, none faster than 2 s apart
let Q = mk(), L = run(Q, 30, 1 / 30, 1 / 200);
ok(Q.lv >= 3 && Q.fx === 0, 'GPU-bound load: resolution should step down (lv=' + Q.lv + ')');
ok(L.every((s, i) => i === 0 || s[0] - L[i - 1][0] >= 1.9), 'steps closer than 2 s');
// 2. load goes away: steps back up to 0
L = run(Q, 200, 1 / 60, 1 / 200); ok(Q.lv === 0 && Q.fx === 0, 'after the load: should be back at full (lv=' + Q.lv + ' fx=' + Q.fx + ')');
// 3. CPU-bound overload: effects only, resolution untouched
Q = mk(); run(Q, 30, 1 / 30, 1 / 33); ok(Q.lv === 0 && Q.fx >= 3, 'CPU-bound: only effects should drop (lv=' + Q.lv + ' fx=' + Q.fx + ')');
run(Q, 200, 1 / 60, 1 / 200); ok(Q.fx === 0, 'CPU-bound recovery');
// 4. no flicker: a step that is too light for the load (the load returns right after every step up) backs off
Q = mk(); run(Q, 20, 1 / 30, 1 / 200); let ups = 0, downs = 0;
for (let c = 0; c < 8; c++) { for (const s of run(Q, 40, 1 / 60, 1 / 200)) if (s[3] < s[1] || s[4] < s[2]) { ups++; break; } for (const s of run(Q, 10, 1 / 30, 1 / 200)) downs++; }
ok(Q.wait > 10, 'wait should have grown after undone steps (wait=' + Q.wait + ')');
// 5. steady good frames at full level: never steps at all
Q = mk(); L = run(Q, 120, 1 / 60, 1 / 200); ok(L.length === 0, 'steady fast frames must cause no steps');
// 6. Low never goes above its own level
Q = mk(); Q.lv = 3; Q.min = 3; L = run(Q, 100, 1 / 60, 1 / 200); ok(Q.lv === 3, 'Low must stay at its own level');
// 7. an effects-only step must not rebuild the picture buffers, and the two half-rate passes must take turns
{ const V = fs.readFileSync(new URL('../src/06-view.js', import.meta.url), 'utf8'), P = fs.readFileSync(new URL('../src/10-post.js', import.meta.url), 'utf8');
  const aq = (V.match(/function applyQual\(\)\{[^\n]*/) || [''])[0], ad = (P.match(/function aoDue\(\)\{[^\n]*/) || [''])[0];
  ok(/QUAL\.rk===k[^;]*return;[^\n]*resize\(\)/.test(aq), 'applyQual must skip resize() when the resolution step did not change');
  ok(/\(_shN&1\)===0/.test(ad), 'ambient occlusion must redraw on the frames the half-rate shadow pass skips'); }
console.log(bad ? 'QUALGOV FAIL' : 'QUALGOV PASS');
process.exit(bad ? 1 : 0);
