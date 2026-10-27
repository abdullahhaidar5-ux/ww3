// Benchmark for the World War 3 servers (server/), run locally with wrangler dev. No browser needed.
//
//  1. Latency: a player and a host in one relay room; the player sends, the host answers at once, 400 round trips.
//     Compared with the bare socket round trip ("ping" answered by Cloudflare itself, no game code), the difference is
//     what the relay's own work adds. (Locally both hops are loopback; real-world estimates are in orch/SERVERS.md.)
//  2. CPU: a host pushes 20,000 batched frames (3 records each, real-sized) to 3 players while the CPU time of the
//     local Cloudflare runtime (workerd) is read from /proc -> CPU ms per 1,000 relayed frames. Upper bound: it
//     includes the runtime's own socket and framing work, not just the room code.
//  3. Projection: messages, bytes and free-tier use for 2/4/8-player matches and for an evening of play, from the
//     per-player traffic that `node orch/mpsync.mjs --server` measured in a real battle (orch/out/srv-traffic.json;
//     built-in defaults if that file is missing).
//
//   node orch/serverbench.mjs            # ~1 min; prints a report and writes orch/out/serverbench.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'out');
const ORIGIN = 'http://localhost:8000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const srv = await startServer();
const WS = srv.url.replace(/^http/, 'ws');

function open(p, ip) {
  return new Promise((res, rej) => {
    const w = new WebSocket(WS + p, { headers: { Origin: ORIGIN, 'CF-Connecting-IP': ip } });
    w.onmessage = ev => { const m = String(ev.data); if (m.startsWith('!w')) res(w); else if (m.startsWith('!e')) rej(new Error(m)); };
    w.onerror = () => rej(new Error('socket error'));
  });
}
const KEY = 'benchkey' + Date.now().toString(36);
const result = {};

// ---- 1. latency ----
{
  const code = 'lat' + Math.random().toString(36).slice(2, 5);
  const host = await open(`/room/${code}?role=host&key=${KEY}`, '10.1.0.1');
  const pl = await open(`/room/${code}?role=client&id=ww3p-bench1`, '10.1.0.2');
  host.onmessage = ev => { const m = String(ev.data); if (m[0] !== '!') { const i = m.indexOf('|'); host.send(m.slice(0, i) + m.slice(i)); } };
  // paced at 25 round trips a second: a player may send ~30 frames/s (the server drops the excess, by design)
  const rtt = async (n, send, isReply) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const t = performance.now();
      const ok = await new Promise(r => { const to = setTimeout(() => r(false), 2000); pl.onmessage = ev => { if (isReply(String(ev.data))) { clearTimeout(to); r(true); } }; send(k); });
      if (ok) out.push(performance.now() - t);
      await sleep(40);
    }
    return out;
  };
  console.log('measuring latency…');
  await rtt(20, k => pl.send('|{"w":' + k + '}'), m => m.includes('"w"'));          // warm-up
  const relay = await rtt(300, k => pl.send('|{"t":' + k + '}'), m => m.includes('"t"'));
  const bare = await rtt(300, () => pl.send('ping'), m => m === 'pong');
  if (relay.length < 290) console.log(`  warn: only ${relay.length}/300 relay round trips answered`);
  result.latency = { relayRttP50: +pct(relay, .5).toFixed(2), relayRttP95: +pct(relay, .95).toFixed(2),
    bareRttP50: +pct(bare, .5).toFixed(2), bareRttP95: +pct(bare, .95).toFixed(2) };
  // relay round trip = player->room->host->room->player (two relay passes); bare = one socket round trip
  result.latency.addedPerPassMs = +Math.max(0, (result.latency.relayRttP50 - 2 * result.latency.bareRttP50) / 2).toFixed(2);
  host.close(); pl.close();
}

// ---- 2. CPU per 1,000 frames ----
function workerdCpuMs() {
  let ticks = 0;
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      if (!fs.readFileSync(`/proc/${d}/comm`, 'utf8').startsWith('workerd')) continue;
      const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), f = st.slice(st.lastIndexOf(')') + 2).split(' ');
      ticks += +f[11] + +f[12];                                                      // utime + stime
    } catch {}
  }
  return ticks * 10;                                                                 // 100 Hz clock ticks -> ms
}
{
  // 10 rooms at once (one Durable Object each), each: a host relaying to 3 players at ~140 frames/s (the room's limit is
  // 150/s per host), 2,000 frames per host. A real host sends ~10-15 frames/s, so this is ~10x a full match per room.
  const ROOMS = 10, PER = 2000;
  // a realistic batched host frame: one ~1.5 KB snapshot bundle per player
  const row = () => JSON.stringify(Array.from({ length: 40 }, (_, i) => [1000 + i, 3, 1, 1500 + i, 900 - i, 12, 0, 100, 100, 2048, 80]));
  let got = 0; const rooms = [];
  for (let r = 0; r < ROOMS; r++) {
    const code = 'cpu' + r + Math.random().toString(36).slice(2, 4).replace(/[^a-z0-9]/g, 'q');
    const host = await open(`/room/${code}?role=host&key=${KEY}`, `10.2.${r}.1`);
    const pls = [];
    for (let i = 0; i < 3; i++) { const w = await open(`/room/${code}?role=client&id=ww3p-cpu${i}`, `10.2.${r}.${i + 2}`); w.onmessage = () => { got++; }; pls.push(w); }
    rooms.push({ host, pls, frame: [0, 1, 2].map(i => `ww3p-cpu${i}|{"k":"e","t":"b","d":{"to":"ww3p-cpu${i}","m":[["snap",{"t":12.3,"iv":0.1,"e":${row()}}]]}}`).join('\n') });
  }
  console.log(`measuring CPU: ${ROOMS} rooms open…`);
  await sleep(500);
  const idle0 = workerdCpuMs(); await sleep(3000); const idle = (workerdCpuMs() - idle0) / 3000;   // background CPU per ms
  const c0 = workerdCpuMs(), t0 = performance.now();
  await Promise.all(rooms.map(async R => { for (let k = 0; k < PER; k += 7) { for (let j = 0; j < 7 && k + j < PER; j++) R.host.send(R.frame); await sleep(50); } }));
  const want = ROOMS * PER * 3, tw = Date.now();
  while (got < want * 0.98 && Date.now() - tw < 30000) await sleep(100);
  const wall = performance.now() - t0, cpu = workerdCpuMs() - c0 - idle * wall, N = ROOMS * PER;
  result.cpu = { frames: N, rooms: ROOMS, recordsDelivered: got, recordsExpected: want, frameBytes: rooms[0].frame.length, cpuMs: Math.round(cpu), wallMs: Math.round(wall),
    cpuMsPer1000Frames: +(cpu / N * 1000).toFixed(1), cpuUsPerFrame: +(cpu / N * 1000).toFixed(0) };
  for (const R of rooms) { R.host.close(); for (const w of R.pls) w.close(); }
}
srv.stop();

// ---- 2b. the room's own code, timed alone (same routing module the Durable Object runs) ----
{
  const { routeHost, routePlayer } = await import(path.join(ROOT, 'server', 'src', 'route.js'));
  const row = JSON.stringify(Array.from({ length: 40 }, (_, i) => [1000 + i, 3, 1, 1500 + i, 900 - i, 12, 0, 100, 100, 2048, 80]));
  const byId = new Map(Array.from({ length: 7 }, (_, i) => ['ww3p-p' + i, { n: 0 }]));
  const send = (w, f) => { w.n += f.length; };
  const batch7 = [...byId.keys()].map(id => `${id}|{"k":"e","t":"b","d":{"to":"${id}","m":[["snap",{"t":1,"e":${row}}]]}}`).join('\n');
  const single = `ww3p-p3|{"k":"e","t":"b","d":{"to":"ww3p-p3","m":[["snap",{"t":1,"e":${row}}]]}}`;
  const pres = '|{"k":"p","p":{"pg":1730000000000,"pi":42,"cq":[{"s":1,"a":{"t":"go","ids":[1,2,3],"x":100,"y":200}}]}}';
  const time = (n, f) => { for (let i = 0; i < 2000; i++) f(); const t = process.hrtime.bigint(); for (let i = 0; i < n; i++) f(); return Number(process.hrtime.bigint() - t) / 1000 / n; };
  result.roomCode = { usPerHostBatchFrame7Players: +time(100000, () => routeHost(batch7, 'ww3-abcdef', byId, send)).toFixed(2),
    usPerHostSingleRecordFrame: +time(300000, () => routeHost(single, 'ww3-abcdef', byId, send)).toFixed(2),
    usPerPlayerFrame: +time(300000, () => routePlayer(pres, 'ww3p-p1')).toFixed(2), batchFrameBytes: batch7.length };
}

// ---- 3. projection ----
let traffic = null;
// prefer the 8-side battle (mpsync --server --ais 6): one human player's stream in an 8-player match
for (const f of ['srv-traffic-ais6.json', 'srv-traffic.json']) { if (traffic) break; try { traffic = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')); traffic.file = f; } catch {} }
const T = traffic || { source: 'defaults', hostToPlayer: { framesPerGameMin: 700, bytesPerGameMin: 900000, wireBytesPerGameMin: 250000 },
  playerToHost: { framesPerRealMin: 75, bytesPerRealMin: 40000, wireBytesPerRealMin: 12000 } };
// In a real match the host sends one batched frame per network tick (0.1 s), carrying one record per relayed player;
// the test harness runs several ticks per step, so frames there are merged: records per minute for ONE player = the
// real-time host frame rate. A player sends its presence (ping, orders) at least once a second.
const Fh = T.hostToPlayer.recordsPerGameMin || T.hostToPlayer.framesPerGameMin, Fp = Math.max(60, T.playerToHost.framesPerRealMin);
const B = T.hostToPlayer.bytesPerGameMin, Bw = T.hostToPlayer.wireBytesPerGameMin, Bp = T.playerToHost.wireBytesPerRealMin;
const MATCH_MIN = 30, GBS_PER_MIN = 60 * 0.125;
// relayed = how many of the players (besides the host) go through the server
function match(players, relayed) {
  const incomingPerMin = relayed ? Fh + relayed * Fp : 0;            // only incoming frames are billed (1/20 request)
  const conns = 1 + players + (relayed ? relayed : 0) + 2;          // lobby sockets, host relay socket, relayed players, migration slack
  const req = incomingPerMin * MATCH_MIN / 20 + conns + (relayed ? MATCH_MIN / 5 * 2 : 1);   // + sweep alarms & budget reports
  const gbs = relayed ? MATCH_MIN * GBS_PER_MIN : 1;                // awake the whole match while it relays; else ~asleep
  return { players, relayed, framesPerMin: incomingPerMin, req: Math.round(req), gbs: Math.round(gbs),
    hostUpKBPerMin: Math.round(relayed * Bw / 1024), playerDownKBPerMin: Math.round(Bw / 1024), rawPlayerDownKBPerMin: Math.round(B / 1024) };
}
result.traffic = traffic ? `measured (orch/out/${traffic.file})` : 'built-in defaults (run node orch/mpsync.mjs --server first)';
result.perPlayer = { hostToPlayerFramesPerMin: Fh, hostToPlayerRawKBPerMin: Math.round(B / 1024), hostToPlayerWireKBPerMin: Math.round(Bw / 1024),
  playerToHostFramesPerMin: Fp, playerToHostWireKBPerMin: +(Bp / 1024).toFixed(1) };
result.matches = [match(2, 1), match(4, 3), match(8, 7), match(8, 1), match(8, 0)];
const evening = (relayedPerMatch) => { const m = match(8, relayedPerMatch); return { matches: 10, players: 8, minutes: MATCH_MIN, relayedPerMatch,
  req: m.req * 10, reqPctOfFree: +(m.req * 10 / 1000).toFixed(1), gbs: m.gbs * 10, gbsPctOfFree: +(m.gbs * 10 / 130).toFixed(1) }; };
result.evening = [evening(0), evening(1), evening(7)];

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'serverbench.json'), JSON.stringify(result, null, 2));
const L = result.latency, C = result.cpu;
console.log(`latency (local): relay round trip p50 ${L.relayRttP50} ms / p95 ${L.relayRttP95} ms; bare socket round trip p50 ${L.bareRttP50} ms -> relay adds ~${L.addedPerPassMs} ms per pass`);
console.log(`cpu: ${C.frames} frames in ${C.rooms} rooms (${C.frameBytes} B, 3 records each; ${C.recordsDelivered}/${C.recordsExpected} records delivered) in ${C.wallMs} ms wall, ${C.cpuMs} ms runtime CPU -> ${C.cpuMsPer1000Frames} ms per 1,000 frames (${C.cpuUsPerFrame} us each, upper bound)`);
{ const R = result.roomCode; console.log(`room code alone: ${R.usPerHostBatchFrame7Players} us per host frame batching 7 players (${(R.batchFrameBytes / 1024).toFixed(0)} KB), ${R.usPerHostSingleRecordFrame} us per single-record frame, ${R.usPerPlayerFrame} us per player frame -> ~${(R.usPerHostBatchFrame7Players).toFixed(0)} ms CPU per 1,000 host frames`); }
console.log(`traffic per relayed player (${result.traffic}): host->player ${Fh} frames, ${result.perPlayer.hostToPlayerRawKBPerMin} KB raw / ${result.perPlayer.hostToPlayerWireKBPerMin} KB on the wire per minute; player->host ${Fp} frames, ${result.perPlayer.playerToHostWireKBPerMin} KB per minute`);
for (const m of result.matches) console.log(`  ${m.players} players, ${m.relayed} relayed: ${m.framesPerMin} billed frames/min, 30-min match = ${m.req} requests, ${m.gbs} GB-s; host upload ${m.hostUpKBPerMin} KB/min`);
for (const e of result.evening) console.log(`evening (10 x 8 players x 30 min, ${e.relayedPerMatch} relayed per match): ${e.req} requests (${e.reqPctOfFree}% of 100k/day), ${e.gbs} GB-s (${e.gbsPctOfFree}% of 13,000/day)`);
console.log('SERVERBENCH DONE (orch/out/serverbench.json)');
process.exit(0);
