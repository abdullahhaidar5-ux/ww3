// Netcode soak test: JavaScript and headless Godot clients play the toy battle through the relay with random orders
// and must report identical state hashes on every checked turn. Also exercises a network blip (reconnect with
// have=), a crash + fresh rejoin (snapshot from a healthy player, or full replay with --nosnap-rejoin), and,
// with --scenario desync, a deliberately corrupted client that the relay must detect and repair.
//
//   node test/soak.mjs --relay local --clients 3 --godot 1 --minutes 10 --turnms 10     (10 game-minutes in ~1 min)
//   node test/soak.mjs --relay http://127.0.0.1:8787 --clients 2 --godot 2 --minutes 10 --turnms 100   (wrangler dev, real time)
//   node test/soak.mjs --scenario desync --minutes 2 --turnms 10
//   node test/soak.mjs --scenario lag --godot 1 --minutes 2 --turnms 10   (G0 runs slower than real time: the relay waits)
// Godot binary: --godot-bin or $GODOT (default: godot on PATH).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LockstepClient } from './client.mjs';
import { ToySim, WORLD } from './sim.mjs';
import { startLocal } from '../local-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : '1') : d; };
const NJS = +arg('clients', 3), NG = +arg('godot', 1), MIN = +arg('minutes', 10), TURNMS = +arg('turnms', 10);
const SCEN = arg('scenario', 'soak'), GODOT = arg('godot-bin', process.env.GODOT || 'godot');
const STOP = Math.round(MIN * 600);                 // 10 turns per game-second
const REPORT = arg('report', '');
const log = (...a) => console.log(`[soak ${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
const T0 = Date.now();

const hashes = new Map();   // turn -> Map(client name -> hash)
const events = [];
function rec(name, k, h) { if (k > STOP) return; let e = hashes.get(k); if (!e) hashes.set(k, e = new Map()); e.set(name, String(h)); }

let relay = null, base = arg('relay', 'local');
if (base === 'local') { relay = await startLocal(0); base = `ws://127.0.0.1:${relay.port}`; }
else base = base.replace(/^http/, 'ws');
const httpBase = base.replace(/^ws/, 'http');
const code = (await (await fetch(httpBase + '/new')).json()).code;
const query = `&turnms=${TURNMS}`;
log(`relay ${base} room ${code}: ${NJS} JS + ${NG} Godot clients, ${MIN} game-minutes (${STOP} turns) at ${TURNMS} ms/turn, scenario ${SCEN}`);

// ---------- JavaScript clients ----------
const total = NJS + NG;
const done = new Set(), want = new Set();
let startSent = false;
function jsClient(name, plan, tok) {
  let sim = null;
  const c = new LockstepClient({ base, code, name, tok, query, hooks: {
    started: (info) => { sim = new ToySim(info.seed, info.players.map(p => p.s)); },
    tick: (t, orders) => sim.step(orders),
    hash: (k) => { const h = sim.hash(); rec(name, k, h); return h; },
    snapshot: () => sim.snapshot(),
    restore: (b) => { sim.restore(b); events.push(`${name} restored from snapshot`); },
    resynced: (k) => { events.push(`${name} resynced at turn ${k}`); log(name, 'resynced at', k); },
    desync: (m) => { if (name === 'J0') { events.push(`desync reported at turn ${m.k}, bad slots ${JSON.stringify(m.bad)}`); log('DESYNC', JSON.stringify(m)); } },
    failed: (why) => { log(name, 'FAILED', why); },
    lobby: (m) => {
      if (name === 'J0' && !startSent && m.players.length === total) { startSent = true; log('all', total, 'in the lobby: start'); c.send({ t: 'start' }); }
    },
    turnDone: (k) => {
      if (k >= STOP) { if (!done.has(name)) { done.add(name); c.quit(); } return; }
      if (plan.blip === k) { events.push(`${name} network blip at turn ${k}`); log(name, 'blip at', k); c.drop(); }
      if (plan.corrupt === k) { sim.u[0][1] += 1; events.push(`${name} corrupted its state at turn ${k}`); log(name, 'corrupted at', k); }
      if (plan.crash === k) {
        events.push(`${name} crashed at turn ${k} and rejoins fresh`); log(name, 'crash at', k);
        c.closedByUs = true; c.phase = 'ended'; c.ws.close();
        setTimeout(() => { const n = jsClient(name, {}, c.tok); n.snapOK = !plan.nosnap; n.connect(); }, 200);
        return;
      }
      if (Math.random() < 0.3) {
        const mine = sim.owned(c.you);
        if (Math.random() < 0.7 && mine.length) {
          const u = []; for (let j = 1 + (Math.random() * 4 | 0); j > 0; j--) u.push(mine[Math.random() * mine.length | 0]);
          c.order({ k: 'mv', u, x: Math.random() * WORLD | 0, y: Math.random() * WORLD | 0 });
        } else c.order({ k: 'sp' });
      }
    },
  } });
  return c;
}

const plans = [];
for (let i = 0; i < NJS; i++) plans.push({});
if (SCEN === 'soak') {
  if (NJS > 1) plans[1].blip = Math.round(STOP * 0.25);
  if (NJS > 2) { plans[2].crash = Math.round(STOP * 0.5); plans[2].nosnap = !!process.argv.includes('--nosnap-rejoin'); }
} else if (SCEN === 'desync') {
  plans[NJS > 1 ? 1 : 0].corrupt = Math.round(STOP * 0.3);   // see `corrupt` below (same turn)
}
const corrupt = {};   // name -> turn it corrupts its own state at
if (SCEN === 'desync') { corrupt[NJS > 1 ? 'J1' : 'J0'] = Math.round(STOP * 0.3); if (NG > 0) corrupt.G0 = Math.round(STOP * 0.6); }
for (let i = 0; i < NJS; i++) want.add('J' + i);

const js = [];
js.push(jsClient('J0', plans[0])); js[0].connect();
await new Promise(r => setTimeout(r, 300));
for (let i = 1; i < NJS; i++) { js.push(jsClient('J' + i, plans[i])); js[i].connect(); }

// ---------- Godot clients ----------
const procs = [];
if (NG > 0) {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'ww3-godot-net-'));
  fs.writeFileSync(path.join(proj, 'project.godot'), 'config_version=5\n\n[application]\nconfig/name="ww3 net test"\n');
  fs.symlinkSync(path.join(repo, 'godot/net'), path.join(proj, 'net'));
  for (let i = 0; i < NG; i++) {
    const name = 'G' + i;
    want.add(name);
    const extra = [];
    if (SCEN === 'soak' && i === 0) extra.push('--blip-at', String(Math.round(STOP * 0.35)));
    if (SCEN === 'soak' && i === 1) extra.push('--crash-at', String(Math.round(STOP * 0.6)));
    if (corrupt[name] != null) extra.push('--corrupt-at', String(corrupt[name]));
    if (SCEN === 'lag' && i === 0) extra.push('--slow-ms', arg('slow-ms', '5'), '--realtime', '1');
    if (SCEN === 'soak' && i === 0 && !process.argv.includes('--no-quick')) extra.push('--quick');   // joins via /quick (HTTP), like "Play online"
    if (SCEN === 'soak' && i === 0) extra.push('--realtime', '1'); else extra.push('--realtime', i % 2 ? '0' : '1');
    const args = ['--headless', '--path', proj, '--script', 'res://net/test/soak_client.gd', '--',
      '--url', base, '--code', code, '--name', name, '--stop', String(STOP), '--query', query, ...extra];
    const p = spawn(GODOT, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    procs.push(p);
    p.on('error', (e) => { console.error(`Can't start Godot (${GODOT}): ${e.message}. Pass --godot-bin or set $GODOT, or run with --godot 0.`); process.exit(2); });
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d; let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (line.startsWith('HASH ')) { const [, k, h] = line.split(' '); rec(name, +k, h); }
        else if (line.startsWith('EVENT ')) { log(name, line.slice(6)); if (!/joined|started/.test(line)) events.push(`${name} ${line.slice(6)}`); }
        else if (line.startsWith('DONE')) { log(name, line); done.add(name); }
        else if (/ERROR|SCRIPT ERROR|error/i.test(line)) log(name, line);
      }
    });
    p.stderr.on('data', (d) => { const s = String(d).trim(); if (s) log(name, 'stderr:', s.slice(0, 400)); });
    p.on('exit', (c) => { if (!done.has(name)) { log(name, 'exited early with', c); done.add(name); events.push(`${name} exited early (${c})`); } });
  }
}

// ---------- wait, then compare ----------
const limitMs = Math.max(120000, STOP * TURNMS * (SCEN === 'lag' ? 6 : 2.5) + 60000);
let lastLog = Date.now();
while (done.size < want.size && Date.now() - T0 < limitMs) {
  await new Promise(r => setTimeout(r, 500));
  if (Date.now() - lastLog > 15000) { lastLog = Date.now(); log('progress', js.map(c => `${c.name}:${c.turn}`).join(' '), `done ${done.size}/${want.size}`); }
}
await new Promise(r => setTimeout(r, 500));
for (const p of procs) try { p.kill(); } catch (e) {}

let checked = 0, mismatched = 0, firstBad = null, coverage = {};
const resyncAt = {};
for (const n in corrupt) { const e = events.find(x => x.startsWith(n + ' resynced') && +x.match(/turn[ =](\d+)/)[1] >= corrupt[n]); resyncAt[n] = e ? +e.match(/turn[ =](\d+)/)[1] : -1; }
for (const n of want) coverage[n] = 0;
for (const [k, e] of [...hashes].sort((a, b) => a[0] - b[0])) {
  const vals = new Map();
  for (const [n, h] of e) {
    coverage[n]++;
    if (corrupt[n] != null && k >= corrupt[n] && (resyncAt[n] < 0 || k <= resyncAt[n])) continue;   // expected wrong until repaired   // expected wrong between corruption and repair
    vals.set(n, h);
  }
  if (vals.size < 2) continue;
  checked++;
  if (new Set(vals.values()).size > 1) { mismatched++; if (!firstBad) firstBad = { turn: k, hashes: Object.fromEntries(vals) }; }
}
const expectTurns = STOP / 10 + 1;
const stats = relay ? [...relay.rooms.values()].map(r => r.stats()) : null;
const desyncEvents = events.filter(e => e.startsWith('desync'));
let ok = mismatched === 0 && done.size === want.size && checked >= expectTurns * 0.9 && !events.some(e => /early|failed/.test(e));
if (SCEN === 'desync') ok = ok && desyncEvents.length >= Object.keys(corrupt).length && Object.values(resyncAt).every(k => k > 0);
else ok = ok && desyncEvents.length === 0;
if (SCEN === 'lag' && stats) ok = ok && stats[0].stalls > 0;   // the relay really waited for the slow player
const summary = { ok, scenario: SCEN, clients: [...want], gameMinutes: MIN, turns: STOP, turnMs: TURNMS, realSeconds: +((Date.now() - T0) / 1000).toFixed(1),
  turnsCompared: checked, mismatches: mismatched, firstMismatch: firstBad, hashesPerClient: coverage, events, relay: stats };
console.log(JSON.stringify(summary, null, 2));
console.log(ok ? 'NETSOAK PASS' : 'NETSOAK FAIL');
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));
if (relay) relay.close();
process.exit(ok ? 0 : 1);
