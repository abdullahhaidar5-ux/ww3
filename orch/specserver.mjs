// Spectators in a battle hosted on Cloudflare (server/src/battle.js + the shared host netcode, src/07a-hostsnap.js),
// in plain Node with scripted sockets and a manual clock (no wrangler, a few seconds). Checks that a spectator:
//   - waits in the lobby without a seat (the lobby and the game list count them), at most 4 (the 5th is told "full");
//   - gets the battle's start (sp:1), then snapshots with every unit of every side and the effects;
//   - can't command (forged order queue and 'cmd' ignored), never gets a checkpoint (so never the next host);
//   - leaving and joining mid-battle changes nothing for the players (same snapshots keep flowing, no AI take-over);
//   - doesn't keep the battle alive on its own: with every player gone, the battle ends.
//   node orch/specserver.mjs        -> SPECSERVER PASS / SPECSERVER FAIL
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildSim } = await import(path.join(ROOT, 'server', 'build-sim.mjs'));
buildSim();
const { createBattleSim } = await import(path.join(ROOT, 'server', 'gen', 'battle-sim.js'));
const { BattleHost, EMPTY_MS } = await import(path.join(ROOT, 'server', 'src', 'battle.js'));
const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
let t = 1e6;
const inbox = new Map(), closed = new Map(), pub = [];
const h = new BattleHost({ sim: createBattleSim(), code: 'spec01', ownKey: 'ownerkey123', seed: 7, readyMs: 1000, now: () => t,
  send: (id, f) => { const a = inbox.get(id) || []; inbox.set(id, a); for (const line of f.split('\n')) { const i = line.indexOf('|'); if (i < 0) continue; try { a.push(JSON.parse(line.slice(i + 1))); } catch (e) {} } },
  close: (id, c, why) => closed.set(id, why), publish: e => pub.push(e), save: () => {}, log: () => {} });
const connect = (id, own) => { const why = h.admit(id, own); if (why) return why; h.join(id, own); return null; };
const say = (id, recs) => h.frame(id, recs.map(r => '|' + JSON.stringify(r)).join('\n'));
const hi = (id, f, tok) => say(id, [{ k: 'p', p: { hi: { f, n: 1, tok, ed: 1 } } }, { k: 'e', t: 'hello', d: { f } }]);
const shi = (id) => say(id, [{ k: 'p', p: { hi: { sp: 1, n: 1, ed: 0 } } }, { k: 'e', t: 'hello', d: { sp: 1 } }]);
const emits = (id, topic) => (inbox.get(id) || []).filter(m => m.k === 'e' && m.t === topic).map(m => m.d);
// every message to a page, bundles ('b') opened
const msgs = (id, topic) => { const out = []; for (const m of inbox.get(id) || []) { if (m.k !== 'e') continue; if (m.t === topic) out.push(m.d); if (m.t === 'b' && Array.isArray(m.d.m)) for (const [tt, d] of m.d.m) if (tt === topic) out.push(d); } return out; };
const run = async (sec, ping) => { const end = t + sec * 1000; let n = 0; while (t < end) { const w = h.tick(); if (w < 0) return -1; t += Math.max(16, w); if (++n % 10 === 0) await new Promise(r => setTimeout(r, 1)); if (ping && n % 30 === 0) for (const id of ping) say(id, [{ k: 'p', p: { pg: t } }]); } return 0; };

console.log('lobby');
connect('owner1', 'ownerkey123'); hi('owner1', 'US', 'TOKowner0000001');
connect('friend1'); hi('friend1', 'RU', 'TOKfriend000001');
connect('spec1'); shi('spec1');
check(h.order.length === 2 && !h.order.includes('spec1'), `the spectator holds no seat (${h.order.length} seats)`);
check(h.specs.has('spec1'), 'the server lists the spectator');
check(emits('spec1', 'lobby').some(d => d.spec === 1), "the spectator is told it's watching (lobby spec:1)");
{ const b = emits('owner1', 'blob').pop(); check(b && b.ns === 1, `the lobby shows 1 watching (blob ns ${b && b.ns})`); }
{ const e = pub.filter(Boolean).pop(); check(e && e.sp === 1 && e.ns === 1, `the game list marks the battle watchable with 1 watching (${JSON.stringify(e)})`); }
for (const k of [2, 3, 4, 5]) { connect('spec' + k); shi('spec' + k); }
check(h.specs.size === 4 && !h.specs.has('spec5'), `at most 4 spectators (${h.specs.size})`);
check(emits('spec5', 'lobby').some(d => d.full && d.spec), 'the 5th spectator is told the battle is full of spectators');
for (const k of [3, 4]) h.leave('spec' + k);
h.leave('spec5');

console.log('battle');
say('owner1', [{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
check(h.phase === 'battle', 'battle started');
const st = emits('spec1', 'start')[0];
check(!!st && st.sp === 1 && st.sv === 1 && st.facs.length === 2, `the spectator gets the start (sp ${st && st.sp}, sv ${st && st.sv}, ${st && st.facs.length} sides)`);
check(!emits('spec1', 'start').some(d => d.slot > 0) && h.sim.teamOf('spec1') < 0, 'the spectator has no side in the battle');
for (const id of ['owner1', 'friend1', 'spec1']) say(id, [{ k: 'p', p: { rd: 1 } }]);
await run(6, ['owner1', 'friend1', 'spec1', 'spec2']);
{ const snaps = msgs('spec1', 'snap'), teams = new Set(); let rows = 0; for (const d of snaps) for (const a of d.e || []) { rows++; teams.add(a[2]); }
  check(snaps.length > 10 && teams.has(0) && teams.has(1), `the spectator sees both sides (${snaps.length} snapshots, ${rows} rows, sides ${[...teams]})`);
  check(msgs('spec1', 'team').length > 0, 'the spectator gets a side panel'); }
// what the spectator sees, against everything on the server
{ const all = h.sim.test.view(0).all, got = new Map(); for (const d of msgs('spec1', 'snap')) if (d.f) { got.clear(); } for (const d of msgs('spec1', 'snap')) for (const a of d.e || []) got.set(a[0], a);
  check(got.size >= all * .9, `the spectator has (nearly) every entity on the server (${got.size} of ${all})`); }
// forged orders from the spectator
const u0 = h.sim.test.view(0).list.find(r => r[2] === 0 && !r[6] && r[1] !== 'harv');
if (u0) { say('spec1', [{ k: 'p', p: { cq: [{ s: 9e12, a: { t: 'go', ids: [u0[0]], x: 33, y: 33 } }] } }, { k: 'e', t: 'cmd', d: { t: 'go', ids: [u0[0]], x: 33, y: 33 } }]);
  const p0 = h.sim.test.pos([u0[0]])[0]; await run(3, ['owner1', 'friend1', 'spec1']); const p1 = h.sim.test.pos([u0[0]])[0];
  check(!p1 || Math.hypot(p1[0] - 33, p1[1] - 33) > Math.hypot(p0[0] - 33, p0[1] - 33) - 30, "the spectator's forged orders are ignored"); }
await run(12, ['owner1', 'friend1', 'spec1', 'spec2']);
check(!emits('spec1', 'ck').length && !emits('spec2', 'ck').length, 'spectators never get a checkpoint (never the standby / next host)');
check(emits('owner1', 'ck').length + emits('friend1', 'ck').length > 0, 'a player is the standby');
// leaving and joining mid-battle
const before = msgs('friend1', 'snap').length;
h.leave('spec1'); await run(2, ['owner1', 'friend1', 'spec2']);
check(!h.sim.specs().includes('spec1') && !h.specs.has('spec1'), 'a spectator that left is gone from the battle');
connect('spec6'); shi('spec6');
check(emits('spec6', 'start').some(d => d.sp === 1), 'a spectator joining mid-battle gets the start');
await run(4, ['owner1', 'friend1', 'spec2', 'spec6']);
check(msgs('spec6', 'snap').length > 5, 'the mid-battle spectator gets snapshots');
check(msgs('friend1', 'snap').length > before + 20, 'the players keep getting snapshots while spectators come and go');
{ const T0 = h.sim.test.team(0), T1 = h.sim.test.team(1); check(!T0.ai && !T1.ai && !T0.disc && !T1.disc, 'no side was handed to the AI or marked disconnected'); }
// every player leaves: spectators alone don't keep the battle going
h.leave('owner1'); h.leave('friend1');
const r = await run(EMPTY_MS / 1000 + 40, ['spec2', 'spec6']);
check(r === -1 || h.phase === 'closed', `with only spectators left the battle ends (phase ${h.phase})`);
console.log(fails.length ? 'SPECSERVER FAIL: ' + fails[0] : 'SPECSERVER PASS');
process.exit(fails.length ? 1 : 0);
