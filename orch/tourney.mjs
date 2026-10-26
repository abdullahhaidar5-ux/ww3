// ORCH AI-vs-AI tournament: balance numbers for every faction.
// Boots the game once per worker in headless Chromium (same server/browser setup as smoke.mjs and mapsweep.mjs), with
// the render loop switched off before the page even starts, then plays 1v1 AI battles purely through the real
// simulation (newGame + simUpdate, no 3D world, no effects). Records winner, match length, units built/lost and value
// lost per side, and prints a win-rate table per faction. Writes orch/out/tourney.json and orch/out/tourney.md.
//
//   node orch/tourney.mjs                          # all 18 factions, 3 games each, 3 maps, Normal AI, 20-min cap
//   node orch/tourney.mjs --games 6 --minutes 25   # 6 games per faction
//   node orch/tourney.mjs --full                   # full round robin: every pair once (153 games for 18 factions)
//   node orch/tourney.mjs --factions UA,RU,US --games 4 --maps strait,fulda --diff hard --seed 7
//   node orch/tourney.mjs --jobs 2                 # two battles at once (one tab each; default = CPU count, max 4)
//   node orch/tourney.mjs --dry                    # print the schedule and the runtime estimate, play nothing
//   node orch/tourney.mjs --match 5                # replay only match #5 of the schedule (same seed => same game)
//   node orch/tourney.mjs --no-lock                # skip the machine-wide browser lock (see browserlock.mjs)
//   node orch/tourney.mjs --yield 10               # long runs hand the browser lock to waiting tests every 10 real
//                                                  # minutes (close browser, release, re-queue); --yield 0 = never
//
// Determinism: every match gets its own seed (from --seed and the match number). The map is built from it, and the
// page's Math.random is replaced by a seeded generator while that match's simulation runs. The pathfinding time budget
// (performance.now) is frozen during simulation too, so CPU speed doesn't change which paths get computed. The same
// --seed therefore replays the same battles. (--real-clock turns the frozen clock off.)
//
// Timeouts: a match still running at --minutes is adjudicated: the side with clearly more left on the field
// (base + army value, the same score the game uses to break ties) by at least --adj (default 1.5x) gets a timeout win,
// anything closer is a draw (half a win each in Win%).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock, releaseBrowserLock, watchPeakMemory } from './browserlock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const GAMES = Math.max(1, Number(argS('games', 3)));
const MINUTES = Math.max(1, Number(argS('minutes', 20)));
const SEED = Number(argS('seed', 1)) >>> 0;
const DIFF = (d => ({ easy: 0, normal: 1, hard: 2 })[String(d).toLowerCase()] ?? Math.max(0, Math.min(2, Number(d) | 0)))(argS('diff', 'normal'));
const DIFF_NAME = ['Easy', 'Normal', 'Hard'][DIFF];
const MAPS_ARG = String(argS('maps', 'strait,oasis,plateau')).split(',').map(s => s.trim()).filter(Boolean);
const FAC_ARG = argS('factions', '') ? argS('factions', '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : null;
const FULL = has('full'), DRY = has('dry'), REAL_CLOCK = has('real-clock');
const ONLY = argS('match', '') !== '' ? Number(argS('match', '')) : null;
const ADJ = Number(argS('adj', 1.5));
const YIELD = Number(argS('yield', 10)); // give the machine-wide browser lock back every N real minutes (0 = never)
const JOBS = Math.max(1, Math.min(4, Number(argS('jobs', Math.min(4, os.cpus().length || 1)))));

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found (npm i -g playwright, then npx playwright install chromium)');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

// ---------------------------------------------------------------- schedule (pure, deterministic per --seed)
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const matchSeed = i => (Math.imul(SEED + 1, 1000003) + Math.imul(i + 1, 7919)) >>> 0;
function schedule(facs, maps) {
  const R = mulberry(SEED * 31 + 17), pairs = [];
  if (FULL) {
    for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) pairs.push((i + j) % 2 ? [facs[i], facs[j]] : [facs[j], facs[i]]);
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  } else {
    // GAMES rounds; each round every faction plays once (one sits out per round if the count is odd), avoiding rematches
    const seen = new Set(), key = (a, b) => a < b ? a + b : b + a, sides = {};
    for (let r = 0; r < GAMES; r++) {
      let best = null, bestRep = 1e9;
      for (let tries = 0; tries < 200 && bestRep > 0; tries++) {
        const p = facs.slice(); for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
        if (p.length % 2) p.splice(r % p.length, 1);
        let rep = 0; for (let i = 0; i < p.length; i += 2) if (seen.has(key(p[i], p[i + 1]))) rep++;
        if (rep < bestRep) { best = p; bestRep = rep; }
      }
      for (let i = 0; i < best.length; i += 2) {
        let a = best[i], b = best[i + 1]; seen.add(key(a, b));
        if ((sides[a] || 0) > (sides[b] || 0)) [a, b] = [b, a]; // balance who gets slot 1
        sides[a] = (sides[a] || 0) + 1; sides[b] = (sides[b] || 0) - 1;
        pairs.push([a, b]);
      }
    }
  }
  return pairs.map(([a, b], i) => ({ i, a, b, map: maps[i % maps.length], seed: matchSeed(i) }));
}

// ---------------------------------------------------------------- in-page tournament helpers
const PAGE = () => {
  const TR = window.__TR = {};
  window.__stopLoop = true; // never render: the tournament drives simUpdate itself
  const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const realRandom = Math.random, perf = performance, realNow = performance.now.bind(performance);
  // Run fn with this match's seeded Math.random (and, unless realClock, a frozen performance.now so the pathfinding
  // time budget never depends on CPU speed). Restored afterwards, so the rest of the page is untouched.
  const sim = (fn) => {
    const S = TR.st; Math.random = S.rng; if (!S.realClock) perf.now = () => S.clock;
    try { return fn(); } finally { Math.random = realRandom; if (!S.realClock) delete perf.now; }
  };
  // count combat losses per side (kill() is the game's own death path; capitulation removals are not counted)
  const K = kill;
  window.kill = function (e, team, src) {
    const S = TR.st, was = e && e.dead, cargo = e && Array.isArray(e.cargo) ? e.cargo.filter(c => !c.dead) : [];
    const r = K(e, team, src);
    if (S && e && !was && e.dead && e.team >= 0 && e.team < S.side.length && !(e.kind === 'garrison' && e.civ)) {
      const d = S.side[e.team];
      if (e.isB) { d.bLost++; d.bLostV += e.kind === 'hq' ? 2000 : (e.s && e.s.cost) || 0; }
      else { d.uLost++; d.uLostV += (e.s && e.s.cost) || 0; for (const c of cargo) if (c.dead) { d.uLost++; d.uLostV += (c.s && c.s.cost) || 0; } }
    }
    return r;
  };
  const E = endGame;
  window.endGame = (w, why) => { if (TR.st && G && !G.over && !TR.st.end) TR.st.end = { w, t: G.t, why: why || '' }; return E(w, why); };

  TR.list = () => ({ facs: FKEYS.slice(), names: Object.fromEntries(FKEYS.map(k => [k, FACTIONS[k].name])), maps: MAP_KEYS.map(k => [k, MAPS[k].max]) });
  TR.start = (m, diff, realClock) => {
    if (G) G.over = true;
    MODE = 'single'; ME = 0; setup.d = diff; setup.map = m.map; setup.p = m.a; setup.a = m.b; setup.n = 1; setup.others = []; setup.tm = [0, 1]; setup.slot = -1; setup.seed = m.seed;
    TR.st = { rng: mul(m.seed ^ 0x9E3779B9), clock: 0, realClock, end: null, ms: 0, steps: 0, trace: [], nextT: 0,
      side: [0, 1].map(() => ({ uLost: 0, uLostV: 0, bLost: 0, bLostV: 0, peakU: 0, peakUV: 0 })) };
    const ms0 = realNow();
    sim(() => newGame({ seed: m.seed, facs: [m.a, m.b], ai: [true, true], map: m.map, tm: [0, 1], bs: setup.bs, slot: -1 }));
    G.headless = true; // FXE skips every visual/audio effect handler
    G.teams.forEach(T => { T.ai = mkAI(diff); T.ai.wave = Math.round(T.ai.wave * G.bs); }); // same as newGame does for AI slots
    return { facs: G.teams.map(T => T.fac), map: G.mapKey, ms: realNow() - ms0 };
  };
  const sample = () => {
    const S = TR.st;
    G.teams.forEach((T, i) => { const F = forceOf(T); const d = S.side[i]; d.peakU = Math.max(d.peakU, F.un); d.peakUV = Math.max(d.peakUV, F.uv); });
    if (G.t >= S.nextT) { S.nextT += 60; S.trace.push([Math.round(G.t / 60), ...G.teams.map(T => { const F = forceOf(T); return [F.un, F.bn, T.credits | 0, T.built]; })]); }
  };
  TR.chunk = (steps) => {
    const S = TR.st;
    try {
      sim(() => {
        for (let i = 0; i < steps && G && !G.over; i++) {
          const a = realNow(); simUpdate(1 / 60); S.ms += realNow() - a; S.steps++; S.clock += 1000 / 60;
          if (S.steps % 120 === 0) sample();
        }
      });
    } catch (e) { return { err: String(e && e.stack || e) }; }
    return { t: G.t, over: G.over };
  };
  TR.result = () => {
    const S = TR.st;
    sim(sample);
    const score = T => { const F = forceOf(T); return F.bv + F.uv + F.dz * 500; };
    return { t: G.t, over: G.over, end: S.end, msPerStep: S.ms / Math.max(1, S.steps), trace: S.trace,
      sides: G.teams.map((T, i) => { const F = forceOf(T); return { fac: T.fac, out: !!T.out, why: T.whyOut || '', built: T.built, made: T.made || {}, kills: T.kills,
        credits: T.credits | 0, score: score(T), units: F.un, blds: F.bn, ...S.side[i] }; }) };
  };
};

// ---------------------------------------------------------------- main
await acquireBrowserLock();
const peakMB = watchPeakMemory();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const { chromium } = await loadPlaywright();
// No GPU flags: nothing is ever drawn. SwiftShader stays available for the WebGL context the page creates at boot.
let browser = null;
const launch = async () => { browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] }); };
await launch();
const errs = [];
async function openWorker(id) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } }); // own context => own renderer process
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__stopLoop = true; });
  await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
  const w = { id, page, cur: null };
  page.on('pageerror', e => (w.cur ? w.cur.errs : errs).push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => {
    if (m.type() !== 'error') return; const t = m.text();
    if (/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis|WebGL|THREE/i.test(t)) return;
    (w.cur ? w.cur.errs : errs).push('console error: ' + t.slice(0, 240));
  });
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof newGame === 'function' && typeof simUpdate === 'function' && typeof FKEYS !== 'undefined', null, { timeout: 120000 });
  await page.evaluate(PAGE);
  return w;
}

const w0 = await openWorker(0);
const info = await w0.page.evaluate(() => __TR.list());
const facs = FAC_ARG ? FAC_ARG.filter(f => info.facs.includes(f)) : info.facs;
if (FAC_ARG && facs.length !== FAC_ARG.length) console.log(`  warn: unknown factions ignored: ${FAC_ARG.filter(f => !info.facs.includes(f)).join(',')}`);
const mapOk = new Map(info.maps);
const maps = MAPS_ARG.filter(k => mapOk.has(k));
if (MAPS_ARG.length !== maps.length) console.log(`  warn: unknown maps ignored: ${MAPS_ARG.filter(k => !mapOk.has(k)).join(',')}`);
if (facs.length < 2 || !maps.length) { console.log('need at least 2 factions and 1 map'); process.exit(2); }
let sched = schedule(facs, maps);
if (ONLY != null) sched = sched.filter(m => m.i === ONLY);
const jobs = Math.min(JOBS, sched.length);
const bootS = (Date.now() - t0) / 1000;

// runtime estimate: real seconds per game-minute from the last run on this machine, else a conservative guess
const prevFile = path.join(OUT, 'tourney.json');
// (per match: a fixed start cost — building the map — plus real seconds per simulated game-minute, which grows as armies do)
let secPerMin = 3.5, startS = 15, avgMin = MINUTES * .75, estSrc = 'first-run guess';
try { const P = JSON.parse(fs.readFileSync(prevFile, 'utf8')); if (P.perf && P.perf.secPerSimMin > 0) {
  secPerMin = P.perf.secPerSimMin; startS = P.perf.startS || startS; if (P.config && P.config.minutes === MINUTES && P.perf.avgGameMin) avgMin = P.perf.avgGameMin;
  estSrc = `last run on this machine: ${startS.toFixed(0)}s start + ${secPerMin.toFixed(1)}s per game-minute per match`; } } catch {}
const estimate = n => n * (startS + avgMin * secPerMin) / jobs;
const fmtT = s => s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 90 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`;
const perFac = {}; for (const m of sched) { perFac[m.a] = (perFac[m.a] || 0) + 1; perFac[m.b] = (perFac[m.b] || 0) + 1; }
console.log(`tourney: ${facs.length} factions, ${sched.length} matches (${FULL ? 'full round robin' : GAMES + ' per faction'}), maps ${maps.join('/')}, ${DIFF_NAME} AI, cap ${MINUTES} game-min, seed ${SEED}, ${jobs} job(s) (boot ${bootS.toFixed(0)}s)`);
console.log(`estimated runtime ≈ ${fmtT(estimate(sched.length))} (${estSrc}); full round robin of ${facs.length} would be ${facs.length * (facs.length - 1) / 2} matches ≈ ${fmtT(estimate(facs.length * (facs.length - 1) / 2))}`);
if (DRY) {
  for (const m of sched) console.log(`  #${String(m.i).padStart(3)} ${m.a} vs ${m.b} on ${m.map} seed ${m.seed}`);
  await browser.close(); server.close(); process.exit(0);
}

let workers = [w0];
for (let i = 1; i < jobs; i++) workers.push(await openWorker(i));
const results = [];
let doneN = 0, simSecs = 0, gameMins = 0, startSum = 0;
async function play(w, m) {
  const r = { ...m, errs: [] }; w.cur = r;
  const tr = Date.now();
  try {
    const st = await w.page.evaluate(([m, d, rc]) => __TR.start(m, d, rc), [m, DIFF, REAL_CLOCK]);
    if (st.map !== m.map) r.errs.push(`started on ${st.map}, not ${m.map}`);
    r.startS = st.ms / 1000;
    const steps = Math.round(MINUTES * 3600), CH = 3600;
    for (let done = 0; done < steps; done += CH) {
      const c = await w.page.evaluate(k => __TR.chunk(k), Math.min(CH, steps - done));
      if (c.err) { r.fatal = true; r.errs.push('simulation threw: ' + c.err.split('\n').slice(0, 4).join(' | ')); break; }
      if (c.over) break;
    }
    Object.assign(r, await w.page.evaluate(() => __TR.result()));
  } catch (e) { r.fatal = true; r.errs.push(String(e && e.message || e).split('\n')[0]); }
  w.cur = null;
  r.real = (Date.now() - tr) / 1000;
  // outcome: decisive (a side capitulated), timeout win (clear lead at the cap), draw, or error
  if (r.sides) {
    const [A, B] = r.sides;
    if (r.end && r.end.w >= 0) { r.result = 'win'; r.winner = r.end.w; }
    else if (r.over) { r.result = 'draw'; r.winner = -1; }
    else if (A.score >= B.score * ADJ && A.score > 0) { r.result = 'timeout'; r.winner = 0; }
    else if (B.score >= A.score * ADJ && B.score > 0) { r.result = 'timeout'; r.winner = 1; }
    else { r.result = 'draw'; r.winner = -1; }
    if (r.fatal) r.result = 'error';
  } else r.result = 'error';
  results.push(r); doneN++;
  if (r.t) { simSecs += r.real - (r.startS || 0); gameMins += r.t / 60; startSum += r.startS || 0; }
  const left = sched.length - doneN, rate = gameMins ? simSecs / gameMins : secPerMin, avg = doneN ? gameMins / doneN : avgMin, st = doneN ? startSum / doneN : startS;
  const S = r.sides || [{}, {}], wn = r.winner >= 0 ? S[r.winner].fac : '-';
  console.log(`  #${String(r.i).padStart(3)} ${r.a} vs ${r.b} ${r.map.padEnd(10)} ${r.result === 'win' ? 'won by ' + wn : r.result === 'timeout' ? 'timeout, ' + wn + ' ahead' : r.result}`.padEnd(48) +
    ` ${r.t ? (r.t / 60).toFixed(1).padStart(4) : '   -'} min  built ${S[0].built ?? '-'}/${S[1].built ?? '-'} lost ${S[0].uLost ?? '-'}/${S[1].uLost ?? '-'}  (${r.real.toFixed(0)}s${left ? ', ~' + fmtT(left * (st + avg * rate) / jobs) + ' left' : ''})${r.errs.length ? '  ✗ ' + r.errs[0].slice(0, 120) : ''}`);
}
{ // simple worker pool over the schedule, in schedule order; every --yield minutes the browser lock goes back to the
  // queue so other agents' smoke/mpsync runs aren't blocked for the whole tournament (boot is only a few seconds)
  let next = 0, lockT = Date.now();
  const canYield = YIELD > 0 && !has('no-lock');
  while (next < sched.length) {
    await Promise.all(workers.map(async w => { while (next < sched.length && !(canYield && Date.now() - lockT > YIELD * 60000)) { const m = sched[next++]; await play(w, m); } }));
    if (next >= sched.length) break;
    console.log(`  … ${next}/${sched.length} done; handing the browser lock to any waiting test`);
    await browser.close(); releaseBrowserLock();
    await new Promise(r => setTimeout(r, 5000));
    await acquireBrowserLock(); lockT = Date.now();
    await launch(); workers = [];
    for (let i = 0; i < jobs; i++) workers.push(await openWorker(i));
  }
}
await browser.close();
server.close();
results.sort((a, b) => a.i - b.i);

// ---------------------------------------------------------------- tables
const T = {};
for (const f of facs) T[f] = { fac: f, name: info.names[f], g: 0, w: 0, tw: 0, l: 0, tl: 0, d: 0, err: 0, winMin: [], built: 0, uLost: 0, kills: 0, lostV: 0 };
for (const r of results) {
  if (!r.sides || r.result === 'error') { for (const f of [r.a, r.b]) T[f].err++; continue; }
  r.sides.forEach((s, i) => {
    const t = T[s.fac]; t.g++; t.built += s.built; t.uLost += s.uLost; t.kills += s.kills; t.lostV += s.uLostV;
    if (r.winner < 0) t.d++;
    else if (r.winner === i) { if (r.result === 'win') { t.w++; t.winMin.push(r.t / 60); } else t.tw++; }
    else { if (r.result === 'win') t.l++; else t.tl++; }
  });
}
const rows = Object.values(T).filter(t => t.g || t.err).map(t => ({ ...t, pct: t.g ? (t.w + t.tw + t.d / 2) / t.g : 0, avgWin: t.winMin.length ? t.winMin.reduce((a, b) => a + b, 0) / t.winMin.length : null }))
  .sort((a, b) => b.pct - a.pct || b.w - a.w || a.fac.localeCompare(b.fac));
const n1 = x => x == null ? '-' : x.toFixed(1);
const head = ['Faction', 'G', 'W', 'TW', 'D', 'TL', 'L', 'Win%', 'Avg win min', 'Built/g', 'Lost/g', 'Kills/g'];
const line = t => [`${t.fac} ${t.name}`, t.g, t.w, t.tw, t.d, t.tl, t.l, t.g ? Math.round(t.pct * 100) + '%' : '-', n1(t.avgWin), t.g ? n1(t.built / t.g) : '-', t.g ? n1(t.uLost / t.g) : '-', t.g ? n1(t.kills / t.g) : '-'];
const W = head.map((h, i) => Math.max(h.length, ...rows.map(t => String(line(t)[i]).length)));
console.log('\n' + head.map((h, i) => i ? h.padStart(W[i]) : h.padEnd(W[i])).join('  '));
for (const t of rows) console.log(line(t).map((v, i) => i ? String(v).padStart(W[i]) : String(v).padEnd(W[i])).join('  '));
console.log('W = won by capitulation, TW/TL = ahead/behind at the time cap, D = draw (counts half), L = capitulated');

// flags worth a look: blowouts, sides that barely built anything, errors
const flags = [];
for (const r of results) {
  if (r.result === 'error') { flags.push(`#${r.i} ${r.a} vs ${r.b} on ${r.map}: error — ${r.errs[0]}`); continue; }
  if (!r.sides) continue;
  r.sides.forEach((s, i) => {
    const o = r.sides[1 - i];
    if (r.winner === 1 - i && s.built < 8) flags.push(`#${r.i} ${s.fac} lost to ${o.fac} on ${r.map} in ${(r.t / 60).toFixed(1)} min after building only ${s.built} units (peak ${s.peakU} combat units) — AI stall?`);
  });
  if (r.result === 'win' && r.t < 6 * 60) flags.push(`#${r.i} ${r.sides[r.winner].fac} beat ${r.sides[1 - r.winner].fac} on ${r.map} in only ${(r.t / 60).toFixed(1)} min`);
  if (r.errs.length) flags.push(`#${r.i} ${r.a} vs ${r.b}: ${r.errs.length} error(s), first: ${r.errs[0]}`);
}
const decisive = results.filter(r => r.result === 'win').length, timeouts = results.filter(r => r.result === 'timeout').length, draws = results.filter(r => r.result === 'draw').length;
const slot1 = results.filter(r => r.winner === 0).length, slot2 = results.filter(r => r.winner === 1).length;
const totalS = (Date.now() - t0) / 1000;
const perf = { secPerSimMin: gameMins ? simSecs / gameMins : null, startS: results.length ? startSum / results.length : null, jobs, avgGameMin: results.length ? gameMins / results.length : null,
  msPerStep: results.filter(r => r.msPerStep).reduce((a, r) => a + r.msPerStep, 0) / Math.max(1, results.filter(r => r.msPerStep).length), totalS, bootS };
const mb = peakMB();
console.log(`\n${results.length} matches: ${decisive} decisive, ${timeouts} timeout-adjudicated, ${draws} draws, ${results.filter(r => r.result === 'error').length} errors; slot 1 won ${slot1}, slot 2 won ${slot2}`);
for (const f of flags.slice(0, 30)) console.log('  ! ' + f);
for (const e of [...new Set(errs)].slice(0, 5)) console.log('  ✗ ' + e);
console.log(`runtime ${fmtT(totalS)} (${perf.secPerSimMin ? `per match ${perf.startS.toFixed(0)}s start + ${perf.secPerSimMin.toFixed(1)}s per game-minute, ${jobs} at a time, ` : ''}sim ${perf.msPerStep.toFixed(2)} ms/step${mb ? ', peak memory ' + mb + ' MB' : ''})`);

// ---------------------------------------------------------------- files
const cfg = { date: new Date().toISOString(), factions: facs, maps, games: GAMES, full: FULL, minutes: MINUTES, diff: DIFF_NAME, seed: SEED, adj: ADJ, jobs, realClock: REAL_CLOCK, match: ONLY };
fs.writeFileSync(prevFile, JSON.stringify({ config: cfg, perf, table: rows.map(({ winMin, ...t }) => t), flags,
  matches: results.map(r => ({ i: r.i, a: r.a, b: r.b, map: r.map, seed: r.seed, startS: r.startS != null ? +r.startS.toFixed(1) : null, result: r.result, winner: r.winner >= 0 && r.sides ? r.sides[r.winner].fac : null,
    min: r.t ? +(r.t / 60).toFixed(2) : null, why: r.end ? r.end.why : '', real: +r.real.toFixed(1), msPerStep: r.msPerStep ? +r.msPerStep.toFixed(3) : null, errs: r.errs, sides: r.sides, trace: r.trace })) }, null, 1));
const md = [];
md.push(`# AI tournament — ${cfg.date.slice(0, 16).replace('T', ' ')} UTC`, '');
md.push(`${facs.length} factions · ${results.length} 1v1 matches (${FULL ? 'full round robin' : GAMES + ' per faction'}) · maps ${maps.join(', ')} · ${DIFF_NAME} AI both sides · ${MINUTES}-minute cap · seed ${SEED} · runtime ${fmtT(totalS)}`, '');
md.push(`Replay: \`node orch/tourney.mjs ${process.argv.slice(2).join(' ')}\`  (same seed => same battles; \`--match N\` replays one)`, '');
md.push('| ' + head.join(' | ') + ' |', '|' + head.map((_, i) => i ? '---:' : '---').join('|') + '|');
for (const t of rows) md.push('| ' + line(t).join(' | ') + ' |');
md.push('', 'W = won by capitulation · TW/TL = ahead/behind at the time cap (by ' + ADJ + 'x base+army value) · D = draw (half a win) · L = capitulated. Built = units trained; Lost = units killed in combat.', '');
md.push(`**Totals:** ${decisive} decisive, ${timeouts} timeout-adjudicated, ${draws} draws, ${results.filter(r => r.result === 'error').length} errors. Slot 1 won ${slot1}, slot 2 won ${slot2}.`, '');
if (flags.length) { md.push('## Flags', ''); for (const f of flags) md.push('- ' + f); md.push(''); }
md.push('## Matches', '', '| # | Slot 1 | Slot 2 | Map | Result | Min | Built | Lost (units) | Why |', '|---:|---|---|---|---|---:|---|---|---|');
for (const r of results) {
  const S = r.sides || [{}, {}], wn = r.winner >= 0 && r.sides ? S[r.winner].fac : '';
  md.push(`| ${r.i} | ${r.a} | ${r.b} | ${r.map} | ${r.result === 'win' ? wn + ' won' : r.result === 'timeout' ? wn + ' ahead' : r.result} | ${r.t ? (r.t / 60).toFixed(1) : '-'} | ${S[0].built ?? '-'}/${S[1].built ?? '-'} | ${S[0].uLost ?? '-'}/${S[1].uLost ?? '-'} | ${(r.end && r.end.why || r.errs[0] || '').replace(/\|/g, '/').slice(0, 110)} |`);
}
fs.writeFileSync(path.join(OUT, 'tourney.md'), md.join('\n') + '\n');
console.log(`\nTOURNEY DONE — orch/out/tourney.md, orch/out/tourney.json`);
process.exit(results.some(r => r.result === 'error') ? 1 : 0);
