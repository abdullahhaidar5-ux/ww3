// Protocol test for the World War 3 servers (server/): starts them locally with `wrangler dev` and checks, without a
// browser, everything the game relies on: health, TURN "not configured", origin allow-list, relay rooms (welcome,
// join/leave notices, player -> host, host -> everyone, host -> one player, a host coming back after a blip keeps its
// players, a host that leaves for good releases them), refusals (no host, code taken, room full, message too big),
// per-socket rate limit, keep-alive ping, and the live game list (a hosted game appears for other players and
// disappears when the host leaves). ~20 s. Prints SERVERTEST PASS / SERVERTEST FAIL.
//
//   node orch/servertest.mjs            # needs `npm ci` in server/ once
//   node orch/servertest.mjs --url http://127.0.0.1:8787   # test an already running server instead
import { startServer } from './serverdev.mjs';

const ORIGIN = 'http://localhost:8000';
const argUrl = (() => { const i = process.argv.indexOf('--url'); return i > 0 ? process.argv[i + 1] : null; })();
const srv = argUrl ? { url: argUrl, stop() {} } : await startServer();
const HTTP = srv.url, WS = HTTP.replace(/^http/, 'ws');
const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a socket that records every frame, with helpers to wait for one
function sock(path, origin = ORIGIN) {
  const ws = new WebSocket(WS + path, { headers: { Origin: origin } });
  const got = [], waiters = [];
  ws.closed = null; ws.got = got;
  ws.onmessage = ev => { got.push(String(ev.data)); for (const w of waiters.splice(0)) w(); };
  ws.onclose = ev => { ws.closed = ev.code; for (const w of waiters.splice(0)) w(); };
  ws.onerror = () => {};
  ws.wait = async (pred, ms = 4000) => { const t = Date.now();
    for (;;) { const m = got.find(pred); if (m !== undefined) return m; if (Date.now() - t > ms) return null;
      await new Promise(r => { waiters.push(r); setTimeout(r, 100); }); } };
  ws.waitClose = async (ms = 6000) => { const t = Date.now(); while (ws.closed === null && Date.now() - t < ms) await sleep(50); return ws.closed; };
  ws.opened = new Promise(r => { ws.onopen = () => r(true); setTimeout(() => r(false), 4000); });
  return ws;
}
const KEY = 'k' + Math.random().toString(36).slice(2, 12) + 'xyz';
const room = (code, role, id = '', key = KEY) => sock(`/room/${code}?role=${role}&id=${id}&key=${key}`);

try {
  console.log('server at ' + HTTP);
  let r = await fetch(HTTP + '/health'); let j = await r.json();
  check(r.ok && j.ok === true && j.service === 'ww3-servers', 'GET /health answers ok');
  r = await fetch(HTTP + '/turn', { headers: { Origin: ORIGIN } }); j = await r.json();
  check(r.ok && j.configured === false && Array.isArray(j.iceServers) && !j.iceServers.length, 'GET /turn says "not configured" when no TURN key is set');
  r = await fetch(HTTP + '/turn', { headers: { Origin: 'https://evil.example' } });
  check(r.status === 403, '/turn refuses other websites');
  r = await fetch(HTTP + '/turn', { headers: { Origin: 'https://ww3.abdullah-haidar5.workers.dev' } });
  check(r.ok && r.headers.get('access-control-allow-origin') === 'https://ww3.abdullah-haidar5.workers.dev', '/turn allows the ww3 Worker site');
  r = await fetch(HTTP + '/turn', { headers: { Origin: 'https://abdullahhaidar5-ux.github.io' } });
  check(r.ok, '/turn allows GitHub Pages');

  // origin allow-list on sockets
  { const w = sock('/lobby', 'https://evil.example'); check(!(await w.opened), 'sockets from other websites are refused'); }

  // relay room
  const code = 'ab' + Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'q');
  const HID = 'ww3-' + code;
  { const c = room(code, 'client', 'ww3p-early1'); check(await c.wait(m => m === '!e nohost') !== null, 'joining a game nobody hosts is refused (nohost)'); }
  const host = room(code, 'host');
  check(await host.wait(m => m === '!w ' + HID) !== null, 'host is welcomed with its id');
  { const h2 = room(code, 'host', '', 'otherkey1234'); check(await h2.wait(m => m === '!e taken') !== null, 'a second host for the same code is refused (taken)'); }
  const a = room(code, 'client', 'ww3p-aaaa1'), b = room(code, 'client', 'ww3p-bbbb2');
  check(await a.wait(m => m === '!w ' + HID) !== null && await b.wait(m => m === '!w ' + HID) !== null, 'players are welcomed with the host id');
  check(await host.wait(m => m === '!j ww3p-aaaa1') !== null && await host.wait(m => m === '!j ww3p-bbbb2') !== null, 'host is told each player joined');
  { const d = room(code, 'client', 'ww3p-aaaa1'); check(await d.wait(m => m === '!e taken') !== null, 'a duplicate player id is refused'); }
  a.send('|{"k":"e","t":"hello","d":{"f":"RU"}}');
  check(await host.wait(m => m === 'ww3p-aaaa1|{"k":"e","t":"hello","d":{"f":"RU"}}') !== null, 'player -> host arrives with the sender id');
  a.send('ww3p-bbbb2|{"k":"e","t":"sneak"}');
  await sleep(300);
  check(!b.got.some(m => m.includes('sneak')) && host.got.some(m => m === 'ww3p-aaaa1|{"k":"e","t":"sneak"}'), 'players can only talk to the host (no player -> player)');
  host.send('|{"k":"p","p":{"h":1}}');
  check(await a.wait(m => m === HID + '|{"k":"p","p":{"h":1}}') !== null && await b.wait(m => m === HID + '|{"k":"p","p":{"h":1}}') !== null, 'host -> everyone reaches every player');
  host.send('ww3p-bbbb2|{"k":"e","t":"snap","d":{"to":"ww3p-bbbb2"}}');
  check(await b.wait(m => m.includes('"snap"')) !== null, 'host -> one player reaches that player');
  await sleep(300); check(!a.got.some(m => m.includes('"snap"')), '... and nobody else');
  a.send('ping'); check(await a.wait(m => m === 'pong') !== null, 'keep-alive ping is answered');

  // host blip: the same host (same key) reconnects, gets its players back, players are not told anything
  host.close(); await sleep(400);
  const host2 = room(code, 'host');
  check(await host2.wait(m => m === '!j ww3p-aaaa1') !== null && await host2.wait(m => m === '!j ww3p-bbbb2') !== null, 'a host coming back after a blip gets its players back');
  await sleep(3500);
  check(a.closed === null && !a.got.some(m => m.startsWith('!l')), 'players stay connected through a short host blip');
  b.send('|{"k":"e","t":"cmd"}'); check(await host2.wait(m => m.startsWith('ww3p-bbbb2|') && m.includes('cmd')) !== null, 'relay works through the new host connection');

  // limits
  b.send('|' + 'x'.repeat(17 * 1024));
  check(await b.waitClose() === 1009, 'an oversized player message closes that socket (1009)');
  check(await host2.wait(m => m === '!l ww3p-bbbb2') !== null, 'host is told the player left');
  const n0 = host2.got.length;
  for (let i = 0; i < 400; i++) a.send('|{"k":"e","t":"spam","d":' + i + '}');
  await sleep(1500);
  const n = host2.got.slice(n0).filter(m => m.includes('spam')).length;
  check(n >= 100 && n <= 200, `rate limit: ${n} of 400 burst messages passed (expect ~120-180)`);
  const extra = [];
  for (let i = 0; i < 10; i++) extra.push(room(code, 'client', 'ww3p-fill' + i));
  await Promise.all(extra.map(w => w.wait(m => m.startsWith('!w'))));
  const over = room(code, 'client', 'ww3p-over1');
  check(await over.wait(m => m === '!e full') !== null, 'room refuses a 12th player/spectator (full)');
  for (const w of extra) w.close();

  // host leaves for good: players are released after the grace period
  host2.close();
  check(await a.wait(m => m === '!l ' + HID, 8000) !== null, 'players are told when the host leaves for good');
  check(await a.waitClose() === 4002, '... and their sockets are closed');

  // lobby / matchmaking
  const v1 = sock('/lobby'), v2 = sock('/lobby');
  const id1 = (await v1.wait(m => m.startsWith('!w ')) || '').slice(3);
  check(!!id1 && await v2.wait(m => m.startsWith('l|')) !== null, 'lobby welcomes viewers and sends the game list');
  v1.send('p|' + JSON.stringify({ g: { c: code, f: 'US', s: 'open', n: 1, m: 'strait', mx: 8, junk: 'x'.repeat(50) } }));
  const lst = await v2.wait(m => m.startsWith('l|') && m.includes(code));
  check(!!lst && JSON.parse(lst.slice(2)).some(([id, p]) => id === id1 && p.g.c === code && p.g.f === 'US' && !p.g.junk), 'a hosted game shows up for other players (and only known fields are kept)');
  r = await fetch(HTTP + '/games'); j = await r.json();
  check(j.games.some(([, p]) => p.g.c === code), 'GET /games lists it');
  v1.send('p|{"g":{"c":"<script>","f":"US"}}'); await sleep(300);
  check(!(await (await fetch(HTTP + '/games')).json()).games.some(([, p]) => /script/.test(p.g.c)), 'invalid game codes are dropped');
  v1.send('p|' + JSON.stringify({ g: { c: code, f: 'US', s: 'full', n: 2 } }));
  v1.close();
  check(await v2.wait(m => m === 'l|[]', 5000) !== null, 'the game disappears when the host leaves the menu');
  v2.close();
} catch (e) { fails.push('crashed: ' + (e && e.stack || e)); }
srv.stop();
if (fails.length) { console.log(`\nSERVERTEST FAIL: ${fails[0]}` + (fails.length > 1 ? ` (+${fails.length - 1} more)` : '')); process.exit(1); }
console.log('\nSERVERTEST PASS');
process.exit(0);
