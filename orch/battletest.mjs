// Battles hosted on Cloudflare (Stage 2, step 3): tests the server side without a browser. ~2-3 minutes.
//  1. Node: the battle bundle (server/gen/battle-sim.js, built from src/ by server/build-sim.mjs) runs the bench in plain
//     Node with the same code the Durable Object runs (server/src/battle.js), measuring CPU and memory.
//  2. Local `wrangler dev` (workerd, the Cloudflare runtime): GET /battle-bench streams a battle's cost.
//  3. BattleRoom protocol (orch/STAGE2.md section 8) with scripted players over WebSockets: create (owner key), join,
//     refusals (nohost, taken), lobby state ('blob'), owner-only configuration ('bset'), the game list entry (cf:1),
//     Start ('start' with sv:1, slots 0 and 1), snapshots/team panels/events in bundles, an order acknowledged and
//     carried out, a player reconnecting with their token, a checkpoint for the standby player, leaving -> AI takes over.
//  4. Budget guard: a second local server with a tiny allowance refuses new battles with "busy".
// Prints BATTLETEST PASS / BATTLETEST FAIL. Never touches the live servers (local wrangler dev only).
//
//   node orch/battletest.mjs                       # needs `npm ci` in server/ once
//   node orch/battletest.mjs --bench 2,4,8 --minutes 3 [--map fulda]   # Node cost table only (no server)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] != null && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
const { buildSim } = await import(path.join(ROOT, 'server', 'build-sim.mjs'));
buildSim();
const { createBattleSim } = await import(path.join(ROOT, 'server', 'gen', 'battle-sim.js'));
const { runBench } = await import(path.join(ROOT, 'server', 'src', 'battle.js'));
const FACS = ['US', 'RU', 'IR', 'CN', 'TR', 'IL', 'EU', 'PK'];
const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cpuMs = () => { const c = process.cpuUsage(); return (c.user + c.system) / 1000; };

async function nodeBench(players, minutes, map, write = () => {}) {
  if (global.gc) global.gc();
  const h0 = process.memoryUsage().heapUsed;
  const sim = createBattleSim();
  const r = await runBench(sim, { players, minutes, map, seed: 1, diff: 1, batch: Number(argS('batch', 60)), facs: FACS },
    { now: () => performance.now(), yieldFn: () => new Promise(res => setImmediate(res)), write, cpu: cpuMs });
  if (global.gc) global.gc();
  r.heapMB = +((process.memoryUsage().heapUsed - h0) / 1048576).toFixed(1);   // the battle is still alive here
  r.endEnts = sim.info().ents;
  return r;
}

if (has('bench')) {
  const map = argS('map', 'strait'), minutes = Number(argS('minutes', 3));
  console.log(`Node ${process.version}: battle server cost (battle + host netcode sending to every side), ${map}, ${minutes} game-min, Normal AI`);
  for (const n of String(argS('bench', '2,4,8')).split(',').map(Number)) {
    const r = await nodeBench(n, minutes, map, s => console.log('    ' + s));
    console.log(`  ${n} players: ${r.cpuMsPerGameS} ms CPU per game-second (avg), per event (${r.batch} step${r.batch > 1 ? "s" : ""}) p50 ${r.p50EventMs} / p90 ${r.p90EventMs} / p99 ${r.p99EventMs} / max ${r.maxEventMs} ms, worst minute ${Math.max(...r.rows.map(x => x.cpuMsPerGameS))} ms, peak ${r.peakEnts} entities, ${r.kbPerGameS} KB/s sent, battle heap ~${r.heapMB} MB${r.over ? ' (ended)' : ''}`);
  }
  process.exit(0);
}

// --cfbench 2,4,8: the same bench inside a BattleRoom on a local wrangler dev (workerd, Cloudflare's runtime)
if (has('cfbench')) {
  const map = argS('map', 'strait'), minutes = Number(argS('minutes', 3)), batch = Number(argS('batch', 60));
  const s = await startServer({ vars: { BENCH_KEY: 'localbenchkey' } });
  try {
    console.log(`local workerd (wrangler dev): /battle-bench, ${map}, ${minutes} game-min, ${batch} step(s) per event`);
    for (const n of String(argS('cfbench', '2,4,8')).split(',').map(Number)) {
      const txt = await (await fetch(`${s.url}/battle-bench?players=${n}&minutes=${minutes}&map=${map}&batch=${batch}&key=localbenchkey`)).text();
      const line = txt.split('\n').find(l => l.startsWith('RESULT ')); const r = line ? JSON.parse(line.slice(7)) : null;
      if (!r) { console.log(txt); continue; }
      console.log(`  ${n} players: ${r.wallMsPerGameS} ms per game-second (wall, avg), per event p50 ${r.p50EventMs} / p90 ${r.p90EventMs} / p99 ${r.p99EventMs} ms, worst minute ${Math.max(...r.rows.map(x => x.wallMsPerGameS))} ms, slowest event ${r.maxEventMs} ms, peak ${r.peakEnts} entities, ${r.kbPerGameS} KB/s sent${r.over ? ' (ended)' : ''}`);
    }
  } finally { s.stop(); }
  process.exit(0);
}

// ---- 1. Node
console.log('1. Node: the bundled battle runs the bench');
{
  const lines = [];
  const r = await nodeBench(2, 1, 'strait', s => lines.push(s));
  check(r.rows.length >= 1 && r.gameSeconds >= 59 && r.endEnts > 5, `2-player AI battle, 1 game-minute in Node: ${r.cpuMsPerGameS} ms CPU per game-second, ${r.endEnts} entities, ${r.msgs} messages (${r.kbPerGameS} KB/s) to 2 players`);
  check(r.msgs > 100, 'the host netcode sent snapshots/events/team panels to every side');
}

const STATE = fs.mkdtempSync(path.join(os.tmpdir(), 'ww3-battletest-'));   // kept across the restart test
let srv = await startServer({ state: STATE });
let HTTP = srv.url, WS = HTTP.replace(/^http/, 'ws');
const ORIGIN = 'http://localhost:8000';
let srv2 = null;
try {
  // ---- 2. wrangler dev bench
  console.log('2. local Cloudflare runtime (wrangler dev): GET /battle-bench');
  {
    const r = await fetch(HTTP + '/battle-bench?players=2&minutes=0.5&batch=6');
    const txt = await r.text();
    const res = txt.split('\n').find(l => l.startsWith('RESULT '));
    let j = null; try { j = JSON.parse(res.slice(7)); } catch {}
    for (const l of txt.split('\n').filter(l => l && !l.startsWith('RESULT'))) console.log('       ' + l);
    check(r.ok && j && j.gameSeconds >= 29 && j.endEnts > 5 && j.msgs > 50, `/battle-bench ran a 2-player battle inside a BattleRoom: ${j && j.wallMsPerGameS} ms per game-second (wall), slowest event ${j && j.maxEventMs} ms`);
    const r2 = await fetch(HTTP + '/battle-bench?players=2&minutes=0.25');
    check(r2.status === 429, 'without a BENCH_KEY, a second bench within the hour is refused');
    const h = await (await fetch(HTTP + '/health')).json();
    check(h.battles === true && h.budget && h.budget.gbs > 0, `/health says battles are allowed, and the bench's awake time is in today's budget (${h.budget && h.budget.gbs} GB-s)`);
  }

  // ---- 3. protocol
  console.log('3. BattleRoom protocol with scripted players');
  let ipN = 0;
  function player(code, id, own) {
    const q = `role=client&id=${id}` + (own ? `&own=${own}` : '');
    const ws = new WebSocket(`${WS}/battle/${code}?${q}`, { headers: { Origin: ORIGIN, 'CF-Connecting-IP': '10.0.2.' + (++ipN) } });
    const P = { ws, id, got: [], ctl: [], closed: null, pres: {}, n: 0 };
    ws.onmessage = ev => { const m = String(ev.data); if (m[0] === '!') { P.ctl.push(m); return; }
      for (const r of m.split('\n')) { const i = r.indexOf('|'); let d; try { d = JSON.parse(r.slice(i + 1)); } catch { continue; } if (d.k === 'e') P.got.push([d.t, d.d]); } };
    ws.onclose = ev => { P.closed = ev.code; }; ws.onerror = () => {};
    P.open = new Promise(r => { ws.onopen = () => r(true); setTimeout(() => r(false), 5000); });
    P.emit = (t, d) => ws.send('|' + JSON.stringify({ k: 'e', t, d }));
    P.presence = p => { Object.assign(P.pres, p); ws.send('|' + JSON.stringify({ k: 'p', p: P.pres })); };
    P.hello = (f, tok) => { P.presence({ hi: { f, n: ++P.n, tok, ed: 1 } }); P.emit('hello', { f }); };
    P.wait = async (pred, ms = 5000) => { const t = Date.now(); for (;;) { const x = P.got.find(pred); if (x) return x; if (Date.now() - t > ms) return null; await sleep(50); } };
    P.last = t => { for (let i = P.got.length - 1; i >= 0; i--) if (P.got[i][0] === t) return P.got[i][1]; return null; };
    P.waitCtl = async (pred, ms = 5000) => { const t = Date.now(); for (;;) { const x = P.ctl.find(pred); if (x) return x; if (Date.now() - t > ms) return null; await sleep(50); } };
    return P;
  }
  // bundles: ['b', {m:[[topic,data]...]}] flattened
  const flat = P => P.got.flatMap(([t, d]) => (t === 'b' ? (d.m || []) : [[t, d]]));
  const code = 'cf' + Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'q');
  const KEY = 'own' + Math.random().toString(36).slice(2, 12);
  {
    const x = player(code, 'ww3p-nobody1');
    check(!!(await x.waitCtl(m => m === '!e nohost')), 'joining a battle that does not exist: "!e nohost"');
  }
  const A = player(code, 'ww3p-alice01', KEY);
  check(!!(await A.waitCtl(m => m === '!w ww3-' + code)), 'creating a battle (owner key): welcome "!w ww3-<code>", the same host id as a relay room');
  A.hello('US', 'tokalice01');
  check(!!(await A.wait(([t, d]) => t === 'lobby' && d.to === 'ww3p-alice01' && d.n === 1)), 'the owner\'s greeting is answered with today\'s "lobby" message');
  check(!!(await A.wait(([t, d]) => t === 'blob' && d.own === 1 && d.you === 0 && d.seats.length === 1 && d.pv > 0)), '"blob" lobby state: owner, seat 0, version');
  {
    const x = player(code, 'ww3p-thief01', 'ownWRONGkey1');
    check(!!(await x.waitCtl(m => m === '!e taken')), 'creating with a code someone else\'s lobby uses: "!e taken"');
  }
  const Bp = player(code, 'ww3p-bobby01');
  check(!!(await Bp.waitCtl(m => m.startsWith('!w '))), 'a second player joins exactly like a relay room client');
  Bp.hello('RU', 'tokbobby01');
  check(!!(await A.wait(([t, d]) => t === 'blob' && d.seats.length === 2 && d.seats[1].f === 'RU')), 'the owner sees the new player and their nation');
  check(!!(await Bp.wait(([t, d]) => t === 'blob' && d.own === 0 && d.you === 1)), 'the joiner gets the lobby state too (not owner, seat 1)');
  { const n0 = Bp.got.filter(([t]) => t === 'blob').length; Bp.hello('RU', 'tokbobby01');
    await Bp.wait(() => Bp.got.filter(([t]) => t === 'blob').length > n0, 3000);
    check(Bp.got.filter(([t]) => t === 'blob').length > n0, 'every new greeting (hi with a new n) is answered with the lobby state again'); }
  Bp.emit('bset', { ais: [{ f: 'CN', d: 2, tm: 0 }], start: 1 });
  await sleep(500);
  check(!Bp.got.some(([t]) => t === 'start') && (A.last('blob') || {}).seats.length === 2, 'only the owner can configure or start');
  A.emit('bset', { map: 'strait', tm: [0, 1], ais: [{ f: 'CN', d: 0, tm: 1 }] });
  check(!!(await Bp.wait(([t, d]) => t === 'blob' && d.seats.length === 3 && d.seats[2].ai === 1 && d.ok === 1)), 'the owner adds a computer player and sets teams; everyone sees it; Start is allowed');
  {
    await sleep(300);
    const g = await (await fetch(HTTP + '/games')).json();
    const e = (g.battles || []).find(([id]) => id === 'b-' + code);
    check(!!(e && e[1].g.cf === 1 && e[1].g.c === code && e[1].g.s === 'open' && e[1].g.n === 3), 'the game list has the battle in its own list ("b|" frame / battles: cf:1, open, 3 players)');
    check(!(g.games || []).some(([id]) => id === 'b-' + code), '...and not in the list today\'s pages show (they could not join it yet)');
    const lw = new WebSocket(WS + '/lobby', { headers: { Origin: ORIGIN, 'CF-Connecting-IP': '10.0.3.1' } }); const lf = [];
    lw.onmessage = ev => lf.push(String(ev.data)); lw.onerror = () => {};
    const t = Date.now(); while (lf.length < 3 && Date.now() - t < 4000) await sleep(100);
    check(lf.some(m => m.startsWith('b|') && m.includes('b-' + code)) && lf.some(m => m.startsWith('l|') && !m.includes('b-' + code)), 'a page on the menu gets the battle in a "b|" frame, not in "l|"');
    lw.close();
  }
  A.emit('bset', { start: 1 });
  const sA = await A.wait(([t]) => t === 'start', 15000), sB = await Bp.wait(([t]) => t === 'start', 15000);
  check(!!(sA && sB && sA[1].sv === 1 && sA[1].slot === 0 && sB[1].slot === 1 && sA[1].facs.join() === 'US,RU,CN' && sA[1].seed === sB[1].seed), 'Start: each player gets "start" with sv:1 and their slot (0 and 1), same seed, nations US RU CN');
  // the battle is held until every player's loading screen has closed (presence rd:1), at most 20 s
  await sleep(1200);
  check(!flat(A).some(([t]) => t === 'snap') && !flat(Bp).some(([t]) => t === 'snap'), 'after Start the battle waits for the players\' loading screens (no snapshots before rd:1)');
  A.presence({ rd: 1 }); await sleep(600);
  check(!flat(A).some(([t]) => t === 'snap'), '...still waiting while one player is loading');
  Bp.presence({ rd: 1 });
  // battle traffic
  const tb = await A.wait(([t, d]) => t === 'b' && (d.m || []).some(([tt]) => tt === 'team'), 15000);
  check(!!tb, 'the server sends bundles ("b") with team panels');
  await sleep(2500);
  const fa = flat(A), snaps = fa.filter(([t]) => t === 'snap'), mine = snaps.flatMap(([, d]) => d.e || []).filter(r => r[2] === 0);
  check(snaps.length > 5 && mine.length > 0, `snapshots arrive (${snaps.length} in ~3 s), with the player's own units`);
  // an order: move one of my units somewhere
  const KS = createBattleSim();
  const unit = mine.filter(r => KS.isUnit(r[1])).pop();
  const ux = unit[3], uy = unit[4], tx = Math.min(2000, ux + 120), ty = uy;
  A.presence({ cq: [{ s: 7, a: { t: 'go', ids: [unit[0]], x: tx, y: ty } }] });
  const ack = await A.wait(([t, d]) => t === 'b' && (d.m || []).some(([tt, dd]) => tt === 'team' && dd.ak >= 7), 6000);
  check(!!ack, 'an order sent in the presence queue is acknowledged (team panel ak)');
  await sleep(3000);
  {
    const rows = flat(A).filter(([t]) => t === 'snap').flatMap(([, d]) => d.e || []).filter(r => r[0] === unit[0]);
    const lastRow = rows[rows.length - 1];
    check(!!lastRow && Math.hypot(lastRow[3] - ux, lastRow[4] - uy) > 15, `the ordered unit moved (${lastRow ? Math.round(Math.hypot(lastRow[3] - ux, lastRow[4] - uy)) : 0} m)`);
  }
  // pings
  A.presence({ pg: 12345 });
  check(!!(await A.wait(([t, d]) => (t === 'pong' && d.t === 12345) || (t === 'b' && (d.m || []).some(([tt, dd]) => tt === 'pong' && dd.t === 12345)), 4000)), 'ping answered with pong');
  // reconnect
  Bp.ws.close();
  await sleep(1500);
  const B2 = player(code, 'ww3p-bobby02');
  await B2.waitCtl(m => m.startsWith('!w '));
  B2.hello('RU', 'tokbobby01');
  const rs = await B2.wait(([t, d]) => t === 'start' || (t === 'b' && (d.m || []).some(([tt]) => tt === 'start')), 6000);
  check(!!rs, 'a player who reconnects with their token gets "start" again (same slot) and the battle continues');
  check(!!(await B2.wait(([t, d]) => t === 'b' && (d.m || []).some(([tt]) => tt === 'snap'), 6000)), '...and receives snapshots again');
  // checkpoint for the standby player
  const ck = await Promise.race([A.wait(([t]) => t === 'ck', 15000), B2.wait(([t]) => t === 'ck', 15000)]);
  check(!!ck, 'a checkpoint ("ck") goes to a standby player, for host migration if the server disappears');
  // leaving: the AI takes over after 30 s (only the log message is checked here; 30 s is long)
  B2.ws.close();
  const lost = await A.wait(([t, d]) => t === 'b' && (d.m || []).some(([tt, dd]) => tt === 'evt' && (dd.e || []).some(v => v[0] === 'log' && /lost connection/.test(v[2] || ''))), 12000);
  check(flat(A).some(([t]) => t === 'evt'), 'event streams arrive');
  check(!!lost, 'a player who leaves: the others are told "commander lost connection" (the AI takes over after 30 s)');
  // the server restarts mid-battle (a redeploy or an evicted object): the battle is picked up from its kept checkpoint
  {
    const t0 = Math.max(0, ...flat(A).filter(([t]) => t === 'team').map(([, d]) => d.gt || 0));
    srv.stop(); await sleep(2500);
    srv = await startServer({ state: STATE }); HTTP = srv.url; WS = HTTP.replace(/^http/, 'ws');
    check(A.closed !== null, 'server restarted: the players\' sockets closed');
    const A2 = player(code, 'ww3p-alice02');
    check(!!(await A2.waitCtl(m => m === '!w ww3-' + code, 15000)), 'the first player back (same /battle/ address) finds the battle again');
    A2.hello('US', 'tokalice01');
    const st = await A2.wait(([t, d]) => t === 'start' || (t === 'b' && (d.m || []).some(([tt]) => tt === 'start')), 8000);
    const tp = await A2.wait(([t, d]) => t === 'b' && (d.m || []).some(([tt, dd]) => tt === 'team' && dd.gt > 0), 8000);
    const gt = tp ? Math.max(...tp[1].m.filter(([tt]) => tt === 'team').map(([, dd]) => dd.gt)) : 0;
    check(!!st && !!tp && gt >= 3 && gt > t0 - 12, `...picked up from its checkpoint: "start" again and the battle goes on from ${gt.toFixed(0)} s (it was at ${t0.toFixed(0)} s)`);
    // at most 3 battles at once (the resumed one holds a slot until it closes)
    const more = [];
    for (let k = 0; k < 3; k++) {
      const P = player('s' + k + code.slice(2), 'ww3p-slot000' + k, 'ownslotkey' + k);
      more.push(await Promise.race([P.waitCtl(m => m.startsWith('!w ') || m.startsWith('!e '), 8000)]));
      P.ws.close && setTimeout(() => P.ws.close(), 200);
    }
    check(more[0] && more[0].startsWith('!w') && more[1] && more[1].startsWith('!w') && more[2] === '!e busy', `at most 3 battles run at once: the 4th is refused with "busy" (${more.join(', ')})`);
    A2.ws.close();
  }
  await sleep(500);

  // ---- 4. budget guard
  console.log('4. budget guard');
  srv2 = await startServer({ vars: { FREE_GBS: '0.001', BENCH_KEY: 'benchtestkey1' } });
  { // put some usage on the books: a bench reports its awake time
    const r0 = await fetch(srv2.url + '/battle-bench?players=2&minutes=0.25');
    check(r0.status === 403, 'with a BENCH_KEY set, a bench without the key is refused');
    const r = await fetch(srv2.url + '/battle-bench?players=2&minutes=0.25&batch=60&key=benchtestkey1'); const tx = await r.text();
    check(r.ok && tx.includes('RESULT '), '...and runs with it');
    await sleep(500);
    const ws = new WebSocket(`${srv2.url.replace(/^http/, 'ws')}/battle/zz${code.slice(2)}?role=client&id=ww3p-late0001&own=ownkeylate01`, { headers: { Origin: ORIGIN } });
    const got = await new Promise(res => { ws.onmessage = ev => res(String(ev.data)); ws.onerror = () => res('error'); setTimeout(() => res('timeout'), 6000); });
    check(got === '!e busy', `over the guard, a new battle is refused with "!e busy" (got ${got})`);
    const r2 = await fetch(srv2.url + '/battle-bench?players=2&minutes=0.25&key=benchtestkey1');
    check(r2.status === 503, 'over the guard, /battle-bench is refused too');
  }
} catch (e) { fails.push(String(e && e.stack || e)); console.log(e); }
srv.stop(); if (srv2) srv2.stop();
try { fs.rmSync(STATE, { recursive: true, force: true }); } catch {}
if (fails.length) { console.log('\nBATTLETEST FAIL'); for (const f of fails) console.log('  x ' + f); process.exit(1); }
console.log('\nBATTLETEST PASS');
process.exit(0);
