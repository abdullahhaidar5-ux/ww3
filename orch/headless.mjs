// Headless battle simulation (Stage 2, step 1: server-hosted battles).
// Loads the game's authoritative simulation (src/01-data.js, src/02-map.js, src/03-sim.js, plus the handful of small
// functions they borrow from other modules, copied verbatim from src/) into plain Node: no DOM, no Three.js, no WebGL,
// no audio. Plays an AI-vs-AI battle and prints a state hash every N game-seconds and a final summary.
// See orch/STAGE2.md for what the sim touches in the browser and how each piece is handled here.
//
//   node orch/headless.mjs                                  # 2 players, Desert Strait, seed 1, 5 game-minutes
//   node orch/headless.mjs --players 4 --map fulda --minutes 10 --every 30 --seed 7
//   node orch/headless.mjs --facs US,RU,IR,CN               # pick the nations (default: a fixed list, one per slot)
//   node orch/headless.mjs --real-clock                     # real pathfinding time budget (as the browser runs it;
//                                                           # timing-dependent, so not reproducible); default = frozen
//   node orch/headless.mjs --bench                          # cost table: ms of CPU per game-second, 2/4/8 players,
//                                                           # early/mid/late game, plus heap memory
//        [--players-list 2,4,8] [--seeds 1,2] [--map strait] [--minutes 21] [--real-clock]
//   node orch/headless.mjs --compare                        # same battle in headless Chromium (the real index.html):
//                                                           # the state-hash sequences must be identical ->
//                                                           # HEADLESS PASS / HEADLESS FAIL
//   node orch/headless.mjs --compare --render               # same, but the browser also builds the 3D world, runs
//                                                           # every visual/audio effect and draws frames in between
//                                                           # (proves nothing render-side feeds back into the battle)
//   node orch/headless.mjs --compare --no-lock              # skip the machine-wide browser lock (browserlock.mjs)
//   node orch/headless.mjs --compare --native-math          # compare with each engine's own Math.sin/cos/atan2/exp/pow
//                                                           # (fails: Node 22 and Chromium 153 differ in the last bit)
//   node orch/headless.mjs --portable-math                  # plain run with the portable math --compare uses
//
// Determinism: the battle's Math.random is a generator seeded from --seed while the simulation runs (newGame and every
// simUpdate), and performance.now is frozen inside the simulation (the pathfinding time budget otherwise depends on
// CPU speed). The same driver code (DRIVER below) runs in Node and in the page, so both sides do exactly the same calls.
// With --compare (or --portable-math), Math.sin/cos/atan2/exp/pow are also swapped for one plain-JS implementation
// (fdlibm) inside the simulation, because different JS engines round those differently in the last bit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import v8 from 'node:v8';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const DEFAULT_FACS = ['US', 'RU', 'IR', 'CN', 'TR', 'IL', 'EU', 'PK'];
// Math functions the sim uses whose last bit differs between JS engines (measured: Node 22 vs Chromium 153)
const PORTABLE = ['sin', 'cos', 'atan2', 'exp', 'pow'];

// ------------------------------------------------------------------------------------------------ loading the sim
// Modules that ARE the simulation (loaded whole).
export const SIM_FILES = ['01-data.js', '02-map.js', '03-sim.js'];
// Functions the simulation calls that live in rendering/UI modules. They are pure (no DOM, no THREE), so they are
// copied verbatim from src/ and the server runs exactly the browser's code. Found with an identifier scan of the three
// sim modules (see STAGE2.md); headless.mjs fails loudly if any of them disappears or a new outside name is needed.
export const BORROW = {
  '04-gfx.js': ['groundH', 'groundH0', 'buildHGrid'], // ground height (slopes slow units, building placement)
  '05-fx3d.js': ['FXE'],                               // effect events: queued for the network in host mode
  '08-ui.js': ['log'],                                 // player messages (become FXE('log') events)
};
// Stand-ins for the few browser-only names the simulation touches.
const STUBS = `
const FXH={};let FXERR=0;              // 05-fx3d: effect handlers. None headless (same as G.headless in the page)
const mm={width:256,height:176};        // 04-gfx: minimap canvas; only its size is read (map thumbnail, never drawn)
let R3=null;                            // 04-gfx: WebGL renderer; terrTexMax() looks at it (picture size only)
const THREE={Color:class{constructor(h){const n=parseInt(String(h).slice(1),16);this.r=(n>>16&255)/255;this.g=(n>>8&255)/255;this.b=(n&255)/255;}}};
                                        // newGame() compares team colours with THREE.Color (r128: '#rrggbb' -> /255)
// 08-ui endGame() -> showEnd(): the sim only needs "battle over" (+ the host's 'end' event for the clients)
function endGame(winner,reason){if(!G||G.over)return;if(MODE==='host'&&G.out)G.out.push(['end',winner]);G.over=true;G.winner=winner;G.endWhy=reason||'';}
`;

// Lexer-aware scan: s[i] is '(' '[' or '{'; returns the index just after its matching close. Handles strings, template
// literals (with nested \${...}), comments and regex literals, which is enough for this codebase's compact style.
function scanGroup(s, i) {
  const st = [];
  let prev = '(';
  const OPEN = { '(': ')', '[': ']', '{': '}' };
  const KW = /(?:^|[^\w$])(return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$/;
  for (; i < s.length; i++) {
    const c = s[i], top = st[st.length - 1];
    if (top === '`') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { st.pop(); prev = 'a'; continue; }
      if (c === '$' && s[i + 1] === '{') { st.push('${'); i++; prev = '('; }
      continue;
    }
    if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < s.length && s[i] !== c) { if (s[i] === '\\') i++; i++; } prev = 'a'; continue; }
    if (c === '`') { st.push('`'); continue; }
    if (c === '/') {
      const word = /[\w$]/.test(prev) && KW.test(s.slice(Math.max(0, i - 12), i).trimEnd());
      if (!/[\w$)\]]/.test(prev) || word) { // regex literal
        let cls = false; i++;
        for (; i < s.length; i++) { const d = s[i]; if (d === '\\') { i++; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; }
        while (/[a-z]/i.test(s[i + 1] || '')) i++;
        prev = 'a'; continue;
      }
      prev = '/'; continue;
    }
    if (OPEN[c]) { st.push(c); prev = c; continue; }
    if (c === ')' || c === ']' || c === '}') {
      const t = st.pop();
      if (!st.length) return i + 1;
      prev = t === '${' ? prev : c; continue;
    }
    if (!/\s/.test(c)) prev = /[\w$]/.test(c) ? c : c;
  }
  throw new Error('unbalanced source while scanning');
}
// Text of one top-level `function NAME(...){...}` declaration (must start at the beginning of a line).
export function extractFn(src, name) {
  const m = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\(').exec(src);
  if (!m) throw new Error(`function ${name} not found`);
  const start = m.index + m[1].length;
  const p = src.indexOf('(', start);
  const afterParams = scanGroup(src, p);
  const b = src.indexOf('{', afterParams);
  return src.slice(start, scanGroup(src, b));
}
// The whole headless simulation as one script (also what a server would load).
export function simSource(srcDir = SRC) {
  const read = f => fs.readFileSync(path.join(srcDir, f), 'utf8');
  let code = '';
  for (const f of SIM_FILES) code += `\n/* ===== src/${f} ===== */\n` + read(f);
  for (const [f, names] of Object.entries(BORROW)) {
    const text = read(f);
    code += `\n/* ===== borrowed from src/${f}: ${names.join(', ')} ===== */\n` + names.map(n => extractFn(text, n)).join('\n') + '\n';
  }
  return code + '\n/* ===== headless stand-ins ===== */\n' + STUBS;
}

// A fresh, self-contained battle: the sim source wrapped in one function whose parameters are the minimal browser
// surface its load-time and battle-start code touches. (Not a vm context: there, every call to a top-level function
// goes through the sandbox's global-object interceptor and the sim runs several times slower.) Each call returns an
// independent simulation with its own G, caches and driver.
const BROWSER_NAMES = ['window', 'self', 'document', 'localStorage', 'matchMedia', 'navigator', 'performance'];
let compiled = null;
export function makeSim(srcDir = SRC) {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  const canvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d });
  const store = new Map();
  const perf = Object.create({ now: () => performance.now() }); // own-property override + delete, as in the page
  const env = {
    document: { createElement: canvas, getElementById: () => null, hidden: true, addEventListener: noop },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    navigator: { userAgent: 'node', hardwareConcurrency: os.cpus().length },
    performance: perf,
  };
  env.window = env.self = env;
  if (!compiled || compiled.dir !== srcDir) {
    const body = simSource(srcDir) + `\n/* ===== driver ===== */\nreturn (${DRIVER.toString()})();\n//# sourceURL=ww3-sim.js`;
    compiled = { dir: srcDir, fn: new vm.Script(`(function(${BROWSER_NAMES.join(',')}){\n${body}\n})`, { filename: 'ww3-sim.js' }).runInThisContext() };
  }
  return { W: compiled.fn(...BROWSER_NAMES.map(k => env[k])) };
}

// ------------------------------------------------------------------------------------------------ the driver
// Runs unchanged in Node (inside the vm context) and in the page (as a <script>), so both make the same calls.
function DRIVER() {
  const W = {};
  // Portable math: fdlibm (the C library V8 itself used) ported to plain JS, using only + - * / and bit access, so
  // every JS engine gives bit-identical results. Current Chromium (V8 15) and Node 22 (V8 12) disagree in the last bit
  // for sin, cos, atan2, exp and pow (hypot and sqrt agree); see STAGE2.md. sin/cos/atan/atan2/exp match Node 22 bit
  // for bit; pow is within 1 ulp of it. Used only when asked (--compare uses it by default).
  function PORTMATH() {
    // fdlibm sin/cos (k_sin.c, k_cos.c, e_rem_pio2.c without the huge-argument kernel), using only + - * / so every
    // JS engine gives bit-identical results
    const F = new Float64Array(1), U = new Uint32Array(F.buffer);
    const hi = x => { F[0] = x; return U[1]; };
    const withHi = (h, l) => { U[1] = h; U[0] = l; return F[0]; };
    const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
    const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
    const ksin = (x, y, iy) => { const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))); return iy === 0 ? x + v * (S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * S1); };
    const kcos = (x, y) => {
      const ix = hi(x) & 0x7fffffff; const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
      if (ix < 0x3FD33333) return 1 - (0.5 * z - (z * r - x * y));
      const qx = ix > 0x3fe90000 ? 0.28125 : withHi(ix - 0x00200000, 0);
      const hz = 0.5 * z - qx, a = 1 - qx; return a - (hz - (z * r - x * y));
    };
    const invpio2 = 6.36619772367581382433e-01, p1 = 1.57079632673412561417e+00, p1t = 6.07710050650619224932e-11, p2 = 6.07710050630396597660e-11, p2t = 2.02226624879595063154e-21, p3 = 2.02226624871116645580e-21, p3t = 8.47842766036889956997e-32;
    const Y = [0, 0];
    const rem = x => { // returns n, Y = [y0, y1]; |x| < 2^20*pi/2
      const ix = hi(x) & 0x7fffffff, t0 = Math.abs(x); const n = (t0 * invpio2 + 0.5) | 0, fn = n;
      let r = t0 - fn * p1, w = fn * p1t, y0 = r - w; const j = ix >> 20; let i = j - ((hi(y0) >> 20) & 0x7ff);
      if (i > 16) { let t = r; w = fn * p2; r = t - w; w = fn * p2t - ((t - r) - w); y0 = r - w; i = j - ((hi(y0) >> 20) & 0x7ff);
        if (i > 49) { t = r; w = fn * p3; r = t - w; w = fn * p3t - ((t - r) - w); y0 = r - w; } }
      const y1 = (r - y0) - w; if (x < 0) { Y[0] = -y0; Y[1] = -y1; return -n; } Y[0] = y0; Y[1] = y1; return n;
    };
    const nsin = Math.sin, ncos = Math.cos;
    const sin = x => { const ix = hi(x) & 0x7fffffff; if (ix <= 0x3fe921fb) return ix < 0x3e400000 ? x : ksin(x, 0, 0); if (ix >= 0x7ff00000) return NaN; if (ix >= 0x413921fb) return nsin(x);
      const n = rem(x); switch (n & 3) { case 0: return ksin(Y[0], Y[1], 1); case 1: return kcos(Y[0], Y[1]); case 2: return -ksin(Y[0], Y[1], 1); default: return -kcos(Y[0], Y[1]); } };
    const cos = x => { const ix = hi(x) & 0x7fffffff; if (ix <= 0x3fe921fb) return ix < 0x3e400000 ? 1 : kcos(x, 0); if (ix >= 0x7ff00000) return NaN; if (ix >= 0x413921fb) return ncos(x);
      const n = rem(x); switch (n & 3) { case 0: return kcos(Y[0], Y[1]); case 1: return -ksin(Y[0], Y[1], 1); case 2: return -kcos(Y[0], Y[1]); default: return ksin(Y[0], Y[1], 1); } };
    return { sin, cos };
  }
  function PORTMATH2() {
    const F = new Float64Array(1), U = new Uint32Array(F.buffer);
    const hi = x => { F[0] = x; return U[1] | 0; };
    const lo = x => { F[0] = x; return U[0]; };
    const mk = (h, l) => { U[1] = h; U[0] = l; return F[0]; };
    const lo0 = x => { F[0] = x; U[0] = 0; return F[0]; };
    // s_atan.c
    const atanhi = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
    const atanlo = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
    const aT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
    const atan = x0 => {
      let x = x0; const hx = hi(x), ix = hx & 0x7fffffff; let id;
      if (ix >= 0x44100000) { if (x !== x) return x + x; return hx > 0 ? atanhi[3] + atanlo[3] : -atanhi[3] - atanlo[3]; }
      if (ix < 0x3fdc0000) { if (ix < 0x3e400000) return x; id = -1; }
      else { x = Math.abs(x);
        if (ix < 0x3ff30000) { if (ix < 0x3fe60000) { id = 0; x = (2.0 * x - 1.0) / (2.0 + x); } else { id = 1; x = (x - 1.0) / (x + 1.0); } }
        else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1.0 + 1.5 * x); } else { id = 3; x = -1.0 / x; } }
      const z = x * x, w = z * z;
      const s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))));
      const s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))));
      if (id < 0) return x - x * (s1 + s2);
      const r = atanhi[id] - ((x * (s1 + s2) - atanlo[id]) - x); return hx < 0 ? -r : r;
    };
    // e_atan2.c
    const tiny = 1.0e-300, pi_o_4 = 7.8539816339744827900E-01, pi_o_2 = 1.57079632679489655800E+00, pi = 3.14159265358979311600E+00, pi_lo = 1.2246467991473531772E-16;
    const atan2 = (y, x) => {
      if (x !== x || y !== y) return x + y;
      const hx = hi(x), lx = lo(x), hy = hi(y), ly = lo(y), ix = hx & 0x7fffffff, iy = hy & 0x7fffffff;
      if (x === 1) return atan(y);
      let m = ((hy >>> 31) & 1) | ((hx >>> 30) & 2);
      if ((iy | ly) === 0) { switch (m) { case 0: case 1: return y; case 2: return pi + tiny; default: return -pi - tiny; } }
      if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
      if (ix === 0x7ff00000) {
        if (iy === 0x7ff00000) { switch (m) { case 0: return pi_o_4 + tiny; case 1: return -pi_o_4 - tiny; case 2: return 3.0 * pi_o_4 + tiny; default: return -3.0 * pi_o_4 - tiny; } }
        switch (m) { case 0: return 0; case 1: return -0; case 2: return pi + tiny; default: return -pi - tiny; }
      }
      if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
      const k = (iy - ix) >> 20; let z;
      if (k > 60) { z = pi_o_2 + 0.5 * pi_lo; m &= 1; }
      else if (hx < 0 && k < -60) z = 0.0;
      else z = atan(Math.abs(y / x));
      switch (m) { case 0: return z; case 1: return -z; case 2: return pi - (z - pi_lo); default: return (z - pi_lo) - pi; }
    };
    // e_exp.c
    const halF = [0.5, -0.5], o_th = 7.09782712893383973096e+02, u_th = -7.45133219101941108420e+02,
      ln2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], ln2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10], invln2 = 1.44269504088896338700e+00,
      P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05, P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
    const twopk = k => k >= -1022 ? mk((0x3ff00000 + (k << 20)) | 0, 0) : mk((0x3ff00000 + ((k + 1000) << 20)) | 0, 0) * 9.33263618503218878990e-302;
    const exp = x0 => {
      let x = x0, hx = hi(x); const xsb = (hx >>> 31) & 1; hx &= 0x7fffffff; let hi_ = 0, lo_ = 0, k = 0;
      if (hx >= 0x40862E42) { if (hx >= 0x7ff00000) { if (x !== x) return x + x; return xsb === 0 ? x : 0.0; } if (x > o_th) return Infinity; if (x < u_th) return 0; }
      if (hx > 0x3fd62e42) {
        if (hx < 0x3FF0A2B2) { hi_ = x - ln2HI[xsb]; lo_ = ln2LO[xsb]; k = 1 - xsb - xsb; }
        else { k = (invln2 * x + halF[xsb]) | 0; const t = k; hi_ = x - t * ln2HI[0]; lo_ = t * ln2LO[0]; }
        x = hi_ - lo_;
      } else if (hx < 0x3e300000) { return 1 + x; }
      else k = 0;
      const t = x * x, c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
      if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
      const y = 1 - ((lo_ - (x * c) / (2.0 - c)) - hi_);
      if (k === 1024) return y * 2.0 * 8.98846567431158e307;
      return k >= -1021 ? y * twopk(k) : y * twopk(k);
    };
    // e_pow.c
    const bp = [1.0, 1.5], dp_h = [0.0, 5.84962487220764160156e-01], dp_l = [0.0, 1.35003920212974897128e-08], two53 = 9007199254740992.0, huge = 1.0e300,
      L1 = 5.99999999999994648725e-01, L2 = 4.28571428578550184252e-01, L3 = 3.33333329818377432918e-01, L4 = 2.72728123808534006489e-01, L5 = 2.30660745775561754067e-01, L6 = 2.06975017800338417784e-01,
      lg2 = 6.93147180559945286227e-01, lg2_h = 6.93147182464599609375e-01, lg2_l = -1.90465429995776804525e-09, ovt = 8.0085662595372944372e-17,
      cp = 9.61796693925975554329e-01, cp_h = 9.61796700954437255859e-01, cp_l = -7.02846165095275826516e-09, ivln2 = 1.44269504088896338700e+00, ivln2_h = 1.44269502162933349609e+00, ivln2_l = 1.92596299112661746887e-08;
    const scalbn = (z, n) => { while (n > 1000) { z *= mk(0x7e700000, 0); n -= 1000; } while (n < -1000) { z *= mk(0x01700000, 0); n += 1000; } return z * mk((0x3ff00000 + (n << 20)) | 0, 0); };
    const pow = (x, y) => {
      const hx = hi(x), lx = lo(x), hy = hi(y), ly = lo(y); let ix = hx & 0x7fffffff; const iy = hy & 0x7fffffff;
      if ((iy | ly) === 0) return 1;
      if (x !== x || y !== y) return x + y;
      let yisint = 0;
      if (hx < 0) {
        if (iy >= 0x43400000) yisint = 2;
        else if (iy >= 0x3ff00000) { const k = (iy >> 20) - 0x3ff;
          if (k > 20) { const j = ly >>> (52 - k); if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1); }
          else if (ly === 0) { const j = iy >> (20 - k); if ((j << (20 - k)) === iy) yisint = 2 - (j & 1); } }
      }
      if (ly === 0) {
        if (iy === 0x7ff00000) { if (((ix - 0x3ff00000) | lx) === 0) return y - y; if (ix >= 0x3ff00000) return hy >= 0 ? y : 0; return hy < 0 ? -y : 0; }
        if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
        if (hy === 0x40000000) return x * x;
        if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
      }
      let ax = Math.abs(x);
      if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
        let z = ax; if (hy < 0) z = 1 / z;
        if (hx < 0) { if (((ix - 0x3ff00000) | yisint) === 0) z = (z - z) / (z - z); else if (yisint === 1) z = -z; }
        return z;
      }
      let n = (hx >>> 31) - 1;
      if ((n | yisint) === 0) return (x - x) / (x - x);
      let s = 1; if ((n | (yisint - 1)) === 0) s = -1;
      let t1, t2;
      if (iy > 0x41e00000) {
        if (iy > 0x43f00000) { if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny; if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny; }
        if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny;
        if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny;
        const t = ax - 1, w = (t * t) * (0.5 - t * (0.3333333333333333333333 - t * 0.25)), u = ivln2_h * t, v = t * ivln2_l - w * ivln2;
        t1 = lo0(u + v); t2 = v - (t1 - u);
      } else {
        n = 0;
        if (ix < 0x00100000) { ax *= two53; n -= 53; ix = hi(ax); }
        n += (ix >> 20) - 0x3ff; const j = ix & 0x000fffff; ix = j | 0x3ff00000; let k;
        if (j <= 0x3988E) k = 0; else if (j < 0xBB67A) k = 1; else { k = 0; n += 1; ix -= 0x00100000; }
        ax = mk(ix, lo(ax));
        let u = ax - bp[k], v = 1 / (ax + bp[k]); const ss = u * v, s_h = lo0(ss);
        let t_h = mk((((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18)) | 0, 0);
        let t_l = ax - (t_h - bp[k]);
        const s_l = v * ((u - s_h * t_h) - s_h * t_l);
        let s2 = ss * ss; let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
        r += s_l * (s_h + ss); s2 = s_h * s_h; t_h = lo0(3.0 + s2 + r); t_l = r - ((t_h - 3.0) - s2);
        u = s_h * t_h; v = s_l * t_h + t_l * ss;
        const p_h = lo0(u + v), p_l = v - (p_h - u);
        const z_h = cp_h * p_h, z_l = cp_l * p_h + p_l * cp + dp_l[k];
        const t = n; t1 = lo0(((z_h + z_l) + dp_h[k]) + t); t2 = z_l - (((t1 - t) - dp_h[k]) - z_h);
      }
      const y1 = lo0(y); const p_l = (y - y1) * t1 + y * t2; let p_h = y1 * t1; let z = p_l + p_h;
      let j = hi(z), i = lo(z);
      if (j >= 0x40900000) { if (((j - 0x40900000) | i) !== 0) return s * huge * huge; if (p_l + ovt > z - p_h) return s * huge * huge; }
      else if ((j & 0x7fffffff) >= 0x4090cc00) { if (((j - (0xc090cc00 | 0)) | i) !== 0) return s * tiny * tiny; if (p_l <= z - p_h) return s * tiny * tiny; }
      i = j & 0x7fffffff; let k = (i >> 20) - 0x3ff; n = 0;
      if (i > 0x3fe00000) {
        n = (j + (0x00100000 >> (k + 1))) | 0; k = ((n & 0x7fffffff) >> 20) - 0x3ff;
        const t = mk(n & ~(0x000fffff >> k), 0); n = ((n & 0x000fffff) | 0x00100000) >> (20 - k); if (j < 0) n = -n; p_h -= t;
      }
      let t = lo0(p_l + p_h); const u = t * lg2_h, v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
      z = u + v; const w = v - (z - u); t = z * z; t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
      const r = (z * t1) / (t1 - 2) - (w + z * w); z = 1 - (r - z);
      j = hi(z); j = (j + (n << 20)) | 0;
      if ((j >> 20) <= 0) z = scalbn(z, n); else z = mk(j, lo(z));
      return s * z;
    };
    return { atan, atan2, exp, pow };
  }
  const PM = Object.assign(PORTMATH(), PORTMATH2()), NATIVE = {};
  for (const k in PM) NATIVE[k] = Math[k];
  const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const realRandom = Math.random, perf = performance, realNow = perf.now.bind(perf);
  let S = null;
  // Run fn with the battle's seeded Math.random and (unless realClock) a frozen performance.now, then restore both,
  // so nothing outside the simulation (rendering, effects, UI) draws from the battle's random numbers.
  const sim = fn => {
    const own = Object.prototype.hasOwnProperty.call(perf, 'now'), old = perf.now;
    Math.random = S.rng; if (!S.realClock) perf.now = () => S.clock;
    for (const k of S.portMath) Math[k] = PM[k];
    try { return fn(); } finally { Math.random = realRandom; for (const k of S.portMath) Math[k] = NATIVE[k]; if (!S.realClock) { if (own) perf.now = old; else delete perf.now; } }
  };
  W.realNow = realNow;
  W.start = o => {
    if (typeof G !== 'undefined' && G) G.over = true;
    S = { rng: mul((o.seed ^ 0x9E3779B9) >>> 0), clock: 0, realClock: !!o.realClock, portMath: (o.portMath || []).filter(k => PM[k]), steps: 0, ms: 0 };
    MODE = o.mode || 'single'; ME = 0; setup.d = o.diff == null ? 1 : o.diff;
    const t0 = realNow();
    sim(() => { TERR_DEFER = true; try { newGame({ seed: o.seed, facs: o.facs, ai: o.facs.map(() => true), map: o.map, tm: o.tm || o.facs.map((_, i) => i), slot: -1 }); } finally { TERR_DEFER = false; } });
    G.headless = !o.fx; // the page runs no visual/audio effect handlers unless --render
    if (o.fx && !W.fxWrapped) { // effects on: they may use Math.random/performance.now, but never the battle's
      W.fxWrapped = true; const f = FXE;
      FXE = function () { const r = Math.random, n = perf.now; Math.random = realRandom; perf.now = realNow; try { return f.apply(this, arguments); } finally { Math.random = r; perf.now = n; } };
    }
    return Object.assign(W.info(), { ms: realNow() - t0 });
  };
  W.step = sec => {
    const n = Math.round(sec * 60); let done = 0; const t0 = realNow();
    sim(() => { for (let i = 0; i < n && G && !G.over; i++) { simUpdate(1 / 60); S.clock += 1000 / 60; done++; } });
    const ms = realNow() - t0; S.ms += ms; S.steps += done;
    return { t: G.t, over: !!G.over, ms, steps: done };
  };
  // 64-bit (two 32-bit lanes) hash of the battle state; numbers are hashed by their exact IEEE-754 bits
  const H = () => {
    let a = 0x811c9dc5 | 0, b = 0x9747b28c | 0; const f = new Float64Array(1), u = new Uint32Array(f.buffer);
    const w = x => { a = Math.imul(a ^ x, 0x01000193); b = Math.imul(b ^ x, 0x5bd1e995); b ^= b >>> 15; };
    const n = v => { if (typeof v === 'boolean') v = v ? 1 : 0; else if (v == null) v = -1.5e300; else if (typeof v !== 'number') v = Number(v); if (v !== v) { w(0x7ff80000); w(1); return; } f[0] = v; w(u[0]); w(u[1]); };
    const s = v => { v = String(v); w(v.length); for (let i = 0; i < v.length; i++) w(v.charCodeAt(i)); };
    return { n, s, out: () => (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0') };
  };
  W.hash = () => {
    const { n, s, out } = H();
    n(G.t); n(G.nid); n(G.over); s(G.wx ? G.wx.k : ''); n(G.wx ? G.wx.next : 0);
    for (const T of G.teams) {
      s(T.fac); s(T.color); n(T.credits); n(T.charge); n(T.gxp); n(T.rank); n(T.built); n(T.lost); n(T.kills); n(T.out); n(T.tun.length);
      for (const k of Object.keys(T.upg).sort()) s(k);
      for (const c in T.q) { s(c); for (const it of T.q[c]) { s(it.kind); n(it.t); } }
      for (const c in T.rq) if (T.rq[c]) { s(c); s(T.rq[c].key); n(T.rq[c].t); }
    }
    for (const e of G.ents) {
      n(e.id); s(e.kind); n(e.team); n(e.x); n(e.y); n(e.hp); n(e.max);
      if (e.isB) { n(e.built); n(e.dis || 0); }
      else { n(e.ang); n(e.v || 0); s(e.state); s(e.order ? e.order.type : ''); n(e.target ? e.target.id : 0); n(e.fear || 0); n(e.ammo || 0); n(e.xp || 0); }
    }
    n(G.proj.length); for (const p of G.proj) { n(p.x); n(p.y); n(p.tx); n(p.ty); n(p.dmg); }
    n(G.strikes.length); for (const q of G.strikes) { n(q.x); n(q.y); n(q.t); }
    for (const o of G.oil) { n(o.hp); n(o.owner); for (const v of o.cp) n(v); }
    for (const c of (G.civ || [])) { n(c.hp); n(c.dead); n(c.occ ? c.occ.length : 0); }
    n(G.timers.length); n((G.mines || []).length);
    return out();
  };
  // everything the battle reads from the map and terrain plan (grid, cover, trees, roads, ground heights, bases)
  W.mapParts = () => {
    const part = fn => { const h = H(); fn(h.n, h.s); return h.out(); };
    return {
      world: part((n, s) => { n(MAPW); n(MAPH); n(GW); n(GH); s(G.mapKey); for (const B of BASES) { n(B[0]); n(B[1]); } }),
      grid: part(n => { for (let i = 0; i < G.grid.length; i++) n(G.grid[i]); }),
      cover: part(n => { for (let i = 0; i < G.cover.length; i++) n(G.cover[i]); }),
      trees: part(n => { n((G.treePos || []).length); for (const t of (G.treePos || [])) for (const v of t) n(v); }),
      roads: part(n => { if (G.roadMask) for (let i = 0; i < G.roadMask.f.length; i++) n(G.roadMask.f[i]); }),
      heights: part(n => { if (G.hgrid) for (let i = 0; i < G.hgrid.a.length; i++) n(G.hgrid.a[i]); }),
      fields: part(n => { for (const f of G.fields) { n(f.x); n(f.y); n(f.r); n(f.amt); } for (const o of G.oil) { n(o.x); n(o.y); } }),
      civ: part(n => { for (const c of (G.civ || [])) { n(c.x); n(c.y); n(c.max); } }),
    };
  };
  W.mapHash = () => { const h = H(), p = W.mapParts(); for (const k in p) h.s(p[k]); return h.out(); };
  W.info = () => {
    const per = G.teams.map(T => ({ fac: T.fac, units: 0, blds: 0, credits: Math.round(T.credits), built: T.built, lost: T.lost, kills: T.kills, out: !!T.out }));
    let proj = 0; for (const e of G.ents) { if (e.dead || !per[e.team]) continue; if (e.isB) per[e.team].blds++; else per[e.team].units++; }
    proj = G.proj.length;
    return { t: G.t, over: !!G.over, winner: G.winner, map: G.mapKey, mapName: (MAPS[G.mapKey] || {}).name, ents: G.ents.length, proj, per };
  };
  // compact state for diffing a divergence
  W.dump = () => ({
    teams: G.teams.map(T => [T.fac, T.credits, T.built, T.lost, T.kills, Object.keys(T.upg).sort().join('+')]),
    ents: G.ents.map(e => [e.id, e.kind, e.team, e.x, e.y, e.hp, e.isB ? e.built : e.state, e.order ? e.order.type : '', e.target ? e.target.id : 0]),
  });
  W.facs = () => FKEYS.slice();
  return W;
}

// ------------------------------------------------------------------------------------------------ Node runs
function opts() {
  const players = Math.max(2, Math.min(8, Number(argS('players', 2))));
  const facs = argS('facs', '') ? argS('facs', '').split(',').map(s => s.trim().toUpperCase()) : DEFAULT_FACS.slice(0, players);
  return { seed: Number(argS('seed', 1)) >>> 0, map: argS('map', 'strait'), facs, diff: Number(argS('diff', 1)),
    minutes: Number(argS('minutes', 5)), every: Math.max(1, Number(argS('every', 10))), realClock: has('real-clock'),
    portMath: has('portable-math') ? PORTABLE : [] };
}

export function runNode(o, { log = true, dumps = false } = {}) {
  const t0 = performance.now();
  const { W } = makeSim();
  const load = performance.now() - t0;
  const st = W.start(o);
  const mh = W.mapHash(), mapParts = W.mapParts();
  const seq = [{ t: 0, h: W.hash(), d: dumps ? W.dump() : null }];
  if (log) console.log(`node: ${o.facs.length} players${o.portMath && o.portMath.length ? ` [portable math: ${o.portMath.join(',')}]` : ''} ${st.per.map(p => p.fac).join(' vs ')} on ${st.mapName} (${st.map}), seed ${o.seed}; sim loaded in ${load.toFixed(0)} ms, battle set up in ${st.ms.toFixed(0)} ms; map ${mh}`);
  if (log) console.log(`  t=   0s  ${seq[0].h}`);
  let ms = 0, r = null;
  for (let t = o.every; t <= o.minutes * 60 + 1e-9; t += o.every) {
    r = W.step(o.every); ms += r.ms;
    const h = W.hash(); seq.push({ t: Math.round(r.t), h, d: dumps ? W.dump() : null });
    if (log) { const i = W.info(); console.log(`  t=${String(Math.round(r.t)).padStart(4)}s  ${h}  ents ${String(i.ents).padStart(4)}  ${(r.ms / (r.steps / 60 || 1)).toFixed(1).padStart(6)} ms/game-s  ${i.per.map(p => p.units + 'u' + p.blds + 'b').join(' ')}`); }
    if (r.over) break;
  }
  const info = W.info();
  return { seq, mapHash: mh, mapParts, info, ms, W };
}

function summary(res, o) {
  const { info } = res;
  console.log(`\nfinal after ${(info.t / 60).toFixed(1)} game-min${info.over ? ` (battle over, winner slot ${info.winner})` : ''}: ${info.ents} entities, ${info.proj} projectiles in flight`);
  for (const [i, p] of info.per.entries()) console.log(`  slot ${i} ${p.fac}: ${p.units} units, ${p.blds} buildings, $${p.credits}, built ${p.built}, lost ${p.lost}, kills ${p.kills}${p.out ? ', OUT' : ''}`);
  console.log(`  sim cost: ${(res.ms / Math.max(1, info.t)).toFixed(1)} ms of CPU per game-second on average (${o.realClock ? 'real' : 'frozen'} pathfinding clock)`);
  console.log(`  final hash ${res.seq[res.seq.length - 1].h}`);
}

// ------------------------------------------------------------------------------------------------ --bench
function bench() {
  // re-run with --expose-gc so heap numbers are live data, not garbage
  if (typeof globalThis.gc !== 'function') {
    const r = spawnSync(process.execPath, ['--expose-gc', ...process.argv.slice(1)], { stdio: 'inherit' });
    process.exit(r.status ?? 1);
  }
  const PH = { early: [0, 3], mid: [8, 11], late: [18, 21] };
  const cfgs = String(argS('players-list', '2,4,8')).split(',').map(Number);
  const seeds = String(argS('seeds', '1')).split(',').map(Number);
  const map = argS('map', 'strait');
  const END = Number(argS('minutes', 21)), DIFFB = Number(argS('diff', 1));
  console.log(`bench: AI difficulty ${DIFFB}, Node ${process.version}, ${os.cpus()[0].model} x${os.cpus().length}, map ${map}, seeds ${seeds.join(',')}, ${has('real-clock') ? 'real' : 'frozen (reproducible; no ms cap on route searches)'} pathfinding clock, ${END} game-min per battle; costs are process CPU time (incl. GC threads)`);
  gc(); const base0 = process.memoryUsage().heapUsed;
  const rows = [];
  for (const N of cfgs) for (const seed of seeds) {
    gc();
    const { W } = makeSim();
    const st = W.start({ seed, map, facs: DEFAULT_FACS.slice(0, N), diff: DIFFB, realClock: has('real-clock') });
    const acc = {}; let peakMs = 0, peakEnts = 0, heap = 0;
    for (let m = 0; m < END; m++) {
      const c0 = process.cpuUsage();
      const r = W.step(60);
      const cu = process.cpuUsage(c0); r.wall = r.ms; r.ms = (cu.user + cu.system) / 1000; // CPU time: robust on a busy machine
      const i = W.info();
      const ph = Object.keys(PH).find(k => m >= PH[k][0] && m < PH[k][1]);
      if (ph) { const a = acc[ph] || (acc[ph] = { ms: 0, s: 0, ents: 0, n: 0 }); a.ms += r.ms; a.s += r.steps / 60; a.ents += i.ents; a.n++; }
      peakMs = Math.max(peakMs, r.ms / Math.max(1, r.steps / 60)); peakEnts = Math.max(peakEnts, i.ents);
      if (m % 3 === 2 || r.over) { gc(); heap = Math.max(heap, process.memoryUsage().heapUsed); }
      process.stdout.write(`\r  ${N}p seed ${seed}: game-min ${m + 1}/${END}, ${i.ents} entities, ${(r.ms / Math.max(1, r.steps / 60)).toFixed(1)} ms/game-s      `);
      if (r.over) break;
    }
    process.stdout.write('\n');
    const row = { N, seed, map, diff: DIFFB, setupMs: st.ms, peakMs, peakEnts, heapMB: heap / 1048576, end: W.info() };
    for (const k of Object.keys(PH)) row[k] = acc[k] ? { msPerS: acc[k].ms / acc[k].s, ents: acc[k].ents / acc[k].n } : null;
    rows.push(row);
  }
  console.log('\nms of CPU per game-second (avg entities)        early 0-3 min     mid 8-11 min     late 18-21 min   worst minute   JS heap after GC (whole process)');
  for (const r of rows) {
    const c = k => r[k] ? `${r[k].msPerS.toFixed(1).padStart(6)} (${Math.round(r[k].ents).toString().padStart(4)})` : '     (ended)';
    console.log(`  ${r.N} players, seed ${r.seed}, peak ${String(r.peakEnts).padStart(4)} ents${' '.repeat(10)}${c('early')}    ${c('mid')}    ${c('late')}    ${r.peakMs.toFixed(1).padStart(6)} ms     ${r.heapMB.toFixed(1)} MB${r.end.over ? `  (ended at ${(r.end.t / 60).toFixed(1)} min)` : ''}`);
  }
  console.log(`  JS heap of a bare Node process running this script, before any battle: ${(base0 / 1048576).toFixed(1)} MB`);
  console.log(`  battle setup (newGame: map + terrain plan): ${rows.map(r => `${r.N}p ${r.setupMs.toFixed(0)} ms`).join(', ')}`);
  fs.mkdirSync(path.join(ROOT, 'orch', 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'orch', 'out', `headless-bench-${map}-d${DIFFB}.json`), JSON.stringify({ node: process.version, cpu: os.cpus()[0].model, map, rows }, null, 1));
}

// ------------------------------------------------------------------------------------------------ --compare
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

async function compare(o) {
  const RENDER = has('render');
  const node = runNode(o, { dumps: true });
  summary(node, o);

  const { acquireBrowserLock, watchPeakMemory } = await import('./browserlock.mjs');
  await acquireBrowserLock();
  const peakMB = watchPeakMemory();
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: findChromium(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  const fails = [];
  let browserSeq = [], bmap = null, binfo = null, bms = 0, bsec = 0;
  try {
    const page = await browser.newPage({ viewport: RENDER ? { width: 960, height: 540 } : { width: 800, height: 600 } });
    await page.addInitScript(() => { window.__stopLoop = true; }); // the harness drives simUpdate itself
    await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
    page.on('pageerror', e => fails.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
    await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => typeof newGame === 'function' && typeof simUpdate === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
    if (RENDER) await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 300000 }).catch(() => console.log('  (3D models still loading; rendering simple shapes)'));
    await page.addScriptTag({ content: `window.__W3=(${DRIVER.toString()})();` });
    const st = await page.evaluate(o => __W3.start(o), { seed: o.seed, map: o.map, facs: o.facs, diff: o.diff, fx: RENDER, portMath: o.portMath });
    if (RENDER) { // the real battle start: terrain picture, 3D world, shaders, first frame (behind the loading screen)
      await page.evaluate(() => { try { initAudio(); } catch (e) {} afterStart(); });
      await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
      await page.evaluate(() => { window.__stopLoop = true; });
    }
    bmap = await page.evaluate(() => __W3.mapHash());
    browserSeq.push({ t: 0, h: await page.evaluate(() => __W3.hash()) });
    console.log(`\nbrowser (Chromium, real index.html${RENDER ? ', 3D world + effects + frames drawn' : ', no drawing'}): ${st.per.map(p => p.fac).join(' vs ')} on ${st.mapName}; map ${bmap}`);
    if (bmap !== node.mapHash) {
      const bp = await page.evaluate(() => __W3.mapParts()), np = node.mapParts;
      fails.push(`map/terrain plan differs: node ${node.mapHash} vs browser ${bmap} (parts that differ: ${Object.keys(np).filter(k => np[k] !== bp[k]).join(', ')})`);
    }
    const show = (t, h, ok, ms) => console.log(`  t=${String(t).padStart(4)}s  ${h}  ${ok ? 'same' : 'DIFFERENT'}${ms != null ? `  ${ms.toFixed(1).padStart(6)} ms/game-s in the page` : ''}`);
    show(0, browserSeq[0].h, browserSeq[0].h === node.seq[0].h);
    for (let k = 1; k < node.seq.length; k++) {
      const r = await page.evaluate(([sec, render]) => {
        const out = []; // with --render: draw a frame every game-second (effects and render state live), else one chunk
        if (render) { let last = null, ms = 0, steps = 0; for (let i = 0; i < sec; i++) { last = __W3.step(1); ms += last.ms; steps += last.steps; try { renderFrame(1 / 60); } catch (e) { out.push(String(e)); } if (last.over) break; } return { r: Object.assign(last, { ms, steps }), h: __W3.hash(), errs: out }; }
        return { r: __W3.step(sec), h: __W3.hash(), errs: out };
      }, [o.every, RENDER]);
      browserSeq.push({ t: Math.round(r.r.t), h: r.h });
      const same = r.h === node.seq[k].h && Math.round(r.r.t) === node.seq[k].t;
      bms += r.r.ms; bsec += r.r.steps / 60; show(Math.round(r.r.t), r.h, same, r.r.ms / Math.max(1e-9, r.r.steps / 60));
      if (r.errs.length) fails.push('render error: ' + r.errs[0]);
      if (!same) {
        fails.push(`state hash differs at t=${Math.round(r.r.t)}s (node ${node.seq[k].h}, browser ${r.h})`);
        // find the first differing entity/team field
        const bd = await page.evaluate(() => __W3.dump()), nd = node.seq[k].d;
        const diff = [];
        for (let i = 0; i < Math.max(bd.teams.length, nd.teams.length) && diff.length < 8; i++) if (JSON.stringify(bd.teams[i]) !== JSON.stringify(nd.teams[i])) diff.push(`team ${i}: node ${JSON.stringify(nd.teams[i])} browser ${JSON.stringify(bd.teams[i])}`);
        const bm = new Map(bd.ents.map(e => [e[0], e]));
        for (const e of nd.ents) { if (diff.length >= 12) break; const b = bm.get(e[0]); if (!b) diff.push(`entity ${e[0]} ${e[1]} only in node`); else if (JSON.stringify(b) !== JSON.stringify(e)) diff.push(`entity ${e[0]}: node ${JSON.stringify(e)} browser ${JSON.stringify(b)}`); }
        if (bd.ents.length !== nd.ents.length) diff.push(`entity count node ${nd.ents.length} browser ${bd.ents.length}`);
        console.log('  first differences:\n    ' + diff.join('\n    '));
        break;
      }
      if (r.r.over) break;
    }
    binfo = await page.evaluate(() => __W3.info());
    if (RENDER) { fs.mkdirSync(path.join(ROOT, 'orch', 'out'), { recursive: true }); await page.screenshot({ path: path.join(ROOT, 'orch', 'out', 'headless-render.png'), timeout: 180000 }).catch(() => {}); }
  } catch (e) { fails.push(String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
  await browser.close(); server.close();
  { const mb = peakMB(); if (mb) console.log(`peak memory (node + browser, summed RSS): ${mb} MB`); }
  if (!fails.length && browserSeq.length !== node.seq.length) fails.push(`browser produced ${browserSeq.length} hashes, node ${node.seq.length}`);
  if (fails.length) { console.log(`\nHEADLESS FAIL`); for (const f of [...new Set(fails)]) console.log('  x ' + f); process.exit(1); }
  console.log(`sim cost: Node ${(node.ms / Math.max(1, node.info.t)).toFixed(1)} ms per game-second, Chromium ${(bms / Math.max(1e-9, bsec)).toFixed(1)} ms per game-second (wall clock, busy machine)`);
  console.log(`\nHEADLESS PASS — ${node.seq.length} state hashes identical (Node ${process.version} vs Chromium${RENDER ? ' with rendering' : ''}), ${(binfo.t / 60).toFixed(1)} game-min, ${binfo.ents} entities at the end`);
}

// ------------------------------------------------------------------------------------------------ main
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (has('bench')) bench();
  else if (has('compare')) { const o = opts(); o.realClock = false; o.portMath = has('native-math') ? [] : PORTABLE; await compare(o); }
  else { const o = opts(); const res = runNode(o); summary(res, o); }
}
