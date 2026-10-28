// Independent review tests for the Cloudflare BattleRoom core (server/src/battle.js), in plain Node, no wrangler.
// Drives BattleHost directly with scripted players and a manual clock. Each case prints ok/FAIL; a FAIL is a bug found
// by the review (see orch/reports/review-cf.md).
//   node orch/review-cf-unit.mjs --root /path/to/checkout-of-orch/stage2-dedicated [--only name]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(argS('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const ONLY = argS('only', null);
const { buildSim } = await import(path.join(ROOT, 'server', 'build-sim.mjs'));
buildSim();
const { createBattleSim } = await import(path.join(ROOT, 'server', 'gen', 'battle-sim.js'));
const { BattleHost } = await import(path.join(ROOT, 'server', 'src', 'battle.js'));

const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

// a room with a manual clock; players' received records are parsed
function mkRoom(o = {}) {
  let t = 1e6;
  const inbox = new Map(), closed = new Map(), saved = [], logs = [];
  const h = new BattleHost({ sim: createBattleSim(), code: o.code || 'abcd12', ownKey: 'ownerkey123', seed: 7, readyMs: 1000,
    now: () => t, send: (id, f) => { const a = inbox.get(id) || []; inbox.set(id, a);
      for (const line of f.split('\n')) { const i = line.indexOf('|'); if (i < 0) { a.push({ ctl: line }); continue; } try { a.push(JSON.parse(line.slice(i + 1))); } catch (e) { a.push({ bad: line }); } } },
    close: (id, c, why) => closed.set(id, why), save: r => saved.push(r), log: m => logs.push(m) });
  const R = { h, inbox, closed, saved, logs,
    adv: ms => { t += ms; }, now: () => t,
    connect(id, own) { const why = h.admit(id, own); if (why) return why; h.join(id, own); return null; },
    say(id, recs) { h.frame(id, recs.map(r => '|' + JSON.stringify(r)).join('\n')); },
    hi(id, f, tok, n = 1) { R.say(id, [{ k: 'p', p: { hi: { f, n, tok, ed: 1 } } }, { k: 'e', t: 'hello', d: { f } }]); },
    emits(id, topic) { return (inbox.get(id) || []).filter(m => m.k === 'e' && m.t === topic).map(m => m.d); },
    run(sec, step = 16) { const end = t + sec * 1000; while (t < end) { const n = h.tick(); if (n < 0) return -1; t += Math.max(step, n); } return 0; },
    async arun(sec, step = 16) { const end = t + sec * 1000; let k = 0; while (t < end) { const n = h.tick(); if (n < 0) return -1; t += Math.max(step, n); if (++k % 10 === 0) await new Promise(r => setTimeout(r, 1)); } return 0; },
  };
  return R;
}
const cases = {};

// 1. more humans than the chosen map's seats: Start must refuse (or the battle must still run)
cases.mapShrink = () => {
  console.log('mapShrink: 5 humans in the lobby, owner picks a 4-seat map (gulf) and starts');
  const R = mkRoom();
  R.connect('owner1', 'ownerkey123'); R.hi('owner1', 'US', 'tok00000owner');
  const facs = ['RU', 'IR', 'CN', 'TR'];
  facs.forEach((f, i) => { R.connect('pl' + i + 'xx'); R.hi('pl' + i + 'xx', f, 'tok0000000' + i); });
  check(R.h.order.length === 5, `5 humans seated (${R.h.order.length})`);
  R.say('owner1', [{ k: 'e', t: 'bset', d: { map: 'gulf', tm: [0, 1, 1, 1, 1] } }]);
  const blob = R.emits('owner1', 'blob').pop();
  console.log(`    lobby after picking gulf: mx ${blob.mx}, ${blob.seats.length} seats, ok ${blob.ok}, why "${blob.why}"`);
  check(blob.seats.length <= blob.mx, `the lobby never shows more seats than the map holds (${blob.seats.length} > ${blob.mx})`);
  let err = null;
  try { R.say('owner1', [{ k: 'e', t: 'bset', d: { start: 1 } }]); } catch (e) { err = e; }
  const starts = R.emits('pl3xx', 'start');
  console.log(`    phase ${R.h.phase}; 'start' sent to the 5th player: ${starts.length ? 'yes, slot ' + starts[0].slot + ' of ' + starts[0].facs.length + ' sides' : 'no'}; logs: ${R.logs.slice(-2).join(' | ').slice(0, 300)}`);
  if (R.h.phase === 'battle') {
    R.order = R.h.order.slice(); for (const id of R.h.order) R.say(id, [{ k: 'p', p: { rd: 1 } }]);
    let crashed = null; try { R.run(5); } catch (e) { crashed = e; }
    check(!crashed, `the battle runs 5 s with 5 sides on a 4-seat map${crashed ? ' (tick threw: ' + String(crashed.message).slice(0, 120) + ')' : ''}`);
    for (let k = 0; k < 5; k++) { const b = R.h.sim.test.base(k), v = R.h.sim.test.view(k); console.log(`    side ${k} (${R.h.facs[k]}): base at ${b.map(Math.round)}, ${v.list.filter(r => r[2] === k).length} own entities`); }
  }
  check(!(starts.length && R.h.phase !== 'battle'), "players are never sent 'start' for a battle the server did not start (stuck loading screens)");
  check(!(R.h.phase === 'battle' && R.h.facs.length > R.h.mx()), `a battle never starts with more sides than the map has seats (${R.h.map}: ${R.h.mx()})`);   // the server may refuse the smaller map instead
};

// 2. the standby player's checkpoint carries every player's reconnect token: a third socket using a stolen token takes
//    over another player's side
cases.tokSteal = async () => {
  console.log("tokSteal: the standby's checkpoint holds the other players' reconnect tokens");
  const R = mkRoom();
  R.connect('owner1', 'ownerkey123'); R.hi('owner1', 'US', 'TOKowner0000001');
  R.connect('friend1'); R.hi('friend1', 'RU', 'TOKfriend000001');
  R.say('owner1', [{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
  check(R.h.phase === 'battle', 'battle started');
  for (const id of ['owner1', 'friend1']) R.say(id, [{ k: 'p', p: { rd: 1 } }]);
  // keep both players "heard from" while the battle runs ~12 s so a checkpoint goes out
  for (let s = 0; s < 14; s++) { await R.arun(1); for (const id of ['owner1', 'friend1']) R.say(id, [{ k: 'p', p: { pg: s + 1 } }]); }
  const parts = {}; let who = null;
  for (const id of ['owner1', 'friend1']) for (const c of R.emits(id, 'ck')) { who = id; (parts[c.id] = parts[c.id] || { n: c.n, a: [] }).a[c.i] = c.d; }
  const ids = Object.keys(parts).map(Number).filter(k => parts[k].a.filter(Boolean).length === parts[k].n);
  check(ids.length > 0, `a whole checkpoint reached the standby (${who})`);
  if (!ids.length) return;
  const s = parts[Math.max(...ids)].a.join('');
  let ck; if (s[0] === 'J') ck = JSON.parse(s.slice(1)); else {
    const bin = Buffer.from(s.slice(1), 'base64'); const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    ck = JSON.parse(await new Response(ds).text()); }
  const victim = who === 'owner1' ? 'friend1' : 'owner1', vslot = R.h.order.indexOf(victim);
  console.log(`    standby ${who} holds toks ${JSON.stringify(ck.toks)}`);
  const stolen = ck.toks && ck.toks[vslot];
  check(!stolen || stolen !== (victim === 'owner1' ? 'TOKowner0000001' : 'TOKfriend000001'), "the checkpoint sent to a player does not contain another player's reconnect token in the clear");
  // the attack: a new socket greets with the stolen token, then orders the victim's units
  R.connect('thief01'); R.hi('thief01', 'US', stolen);
  const peers = R.h.sim.test.peers();
  console.log(`    sides now controlled by: ${JSON.stringify(peers)}`);
  check(peers[vslot] !== 'thief01', `a third socket with a token lifted from the checkpoint cannot take over slot ${vslot} (${victim}'s side)`);
};

// 3. sockets that are not seated (spectators / late joiners) can't order anything
cases.spectator = () => {
  console.log('spectator: a socket that joined after Start sends orders');
  const R = mkRoom();
  R.connect('owner1', 'ownerkey123'); R.hi('owner1', 'US', 'TOKowner0000001');
  R.connect('friend1'); R.hi('friend1', 'RU', 'TOKfriend000001');
  R.say('owner1', [{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
  for (const id of ['owner1', 'friend1']) R.say(id, [{ k: 'p', p: { rd: 1 } }]);
  R.run(2);
  R.connect('late001'); R.hi('late001', 'US', 'guess0000000000');
  const full = R.emits('late001', 'lobby').pop();
  check(full && full.full === 1, 'late joiner is told the game is full');
  const before = JSON.stringify(R.h.sim.test.view(0).list.filter(r => !r[6]).map(r => [r[3], r[4]]));
  const ids = R.h.sim.test.view(0).list.filter(r => r[2] === 0 && !r[6]).map(r => r[0]);
  R.say('late001', [{ k: 'e', t: 'cmd', d: { t: 'go', ids, x: 10, y: 10 } }, { k: 'p', p: { cq: [{ s: 1, a: { t: 'go', ids, x: 10, y: 10 } }] } }]);
  R.run(2);
  const after = R.h.sim.test.view(0).list.filter(r => !r[6]);
  check(after.every(r => !(r[3] < 200 && r[4] < 200)), 'units of slot 0 did not obey the late joiner');
};

// 4. (batch 3) a socket that connected while the lobby was open but never greeted (no seat): after Start it is not
//    marked "full", so it keeps a battle running AI vs AI after every real player left (R3 again, via the lobby)
cases.lobbyGhost = () => {
  console.log('lobbyGhost: an ungreeted socket joins the lobby, the battle starts, both players leave, the ghost keeps pinging');
  const R = mkRoom();
  R.connect('owner1', 'ownerkey123'); R.hi('owner1', 'US', 'TOKowner0000001');
  R.connect('friend1'); R.hi('friend1', 'RU', 'TOKfriend000001');
  R.connect('ghost01');                       // no greeting, just keep-alives
  R.say('owner1', [{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
  for (const id of ['owner1', 'friend1']) R.say(id, [{ k: 'p', p: { rd: 1 } }]);
  R.run(3); R.h.leave('owner1'); R.h.leave('friend1');
  let r = 0; for (let s = 0; s < 120 && r >= 0; s++) { r = R.run(1, 50); if (!R.closed.has('ghost01')) R.h.heard('ghost01'); }
  console.log(`    after 120 s: phase ${R.h.phase}, ghost closed: ${R.closed.get('ghost01') || 'no'}`);
  check(R.h.phase === 'closed' || r < 0, 'a battle whose players all left closes even if a socket that sat ungreeted in the lobby keeps pinging');
};
// 5. (batch 3) what a socket without a side receives during the battle (passwords are no longer checked once it runs)
cases.unseatedRx = () => {
  console.log('unseatedRx: a socket with no side (told "full") during the battle: does it get battle updates?');
  const R = mkRoom();
  R.connect('owner1', 'ownerkey123'); R.hi('owner1', 'US', 'TOKowner0000001');
  R.connect('friend1'); R.hi('friend1', 'RU', 'TOKfriend000001');
  R.say('owner1', [{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
  for (const id of ['owner1', 'friend1']) R.say(id, [{ k: 'p', p: { rd: 1 } }]);
  R.run(2);
  R.connect('peek001'); R.hi('peek001', 'US', 'nottoken000000');
  R.inbox.set('peek001', []); R.run(10);
  const got = R.inbox.get('peek001') || [], kinds = {};
  for (const m of got) { const k = m.ctl ? 'ctl' : (m.k + ':' + (m.t || '')); kinds[k] = (kinds[k] || 0) + 1; }
  console.log(`    received in 10 s: ${JSON.stringify(kinds)}`);
  check(!got.some(m => m.k === 'e' && (m.t === 'b' || m.t === 'snap' || m.t === 'evt' || m.t === 'ck')), 'a socket without a side gets no battle updates or checkpoints');
};

for (const [k, f] of Object.entries(cases)) { if (ONLY && ONLY !== k) continue; try { await f(); } catch (e) { check(false, `${k} threw: ${e && e.stack || e}`); } }
console.log(fails.length ? `REVIEW-UNIT FAIL (${fails.length}): ${fails.join('; ')}` : 'REVIEW-UNIT PASS');
process.exit(fails.length ? 1 : 0);
