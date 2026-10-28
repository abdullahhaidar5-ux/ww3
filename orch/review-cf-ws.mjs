// Independent review tests for Cloudflare battles over real WebSockets against a LOCAL `wrangler dev` (never the live
// servers). Uses the target checkout's own orch/serverdev.mjs. Each case prints ok/FAIL; a FAIL is a review finding
// (orch/reports/review-cf.md).
//   node orch/review-cf-ws.mjs --root /path/to/checkout-of-orch/stage2-dedicated [--only squat|ghost|flood]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(argS('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const ONLY = argS('only', null);
const { startServer } = await import(path.join(ROOT, 'orch', 'serverdev.mjs'));
const ORIGIN = 'https://abdullahhaidar5-ux.github.io';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
let ipN = 0;

const srv = await startServer({ vars: { TEST_HOOKS: '1' } });
const WS = srv.url.replace(/^http/, 'ws');
console.log('local server ' + srv.url);

function sock(code, id, own, ip) {
  const q = `role=client&id=${id}` + (own ? `&own=${own}` : '');
  const ws = new WebSocket(`${WS}/battle/${code}?${q}`, { headers: { Origin: ORIGIN, 'CF-Connecting-IP': ip || '10.9.0.' + (++ipN) } });
  const S = { ws, got: [], ctl: [], closed: false, recs: [] };
  ws.onmessage = ev => { const m = String(ev.data); if (m[0] === '!') { S.ctl.push(m); return; }
    for (const line of m.split('\n')) { const i = line.indexOf('|'); try { S.recs.push(JSON.parse(line.slice(i + 1))); } catch (e) {} } };
  ws.onclose = () => { S.closed = true; };
  S.open = () => new Promise(res => { const t0 = Date.now(); const f = () => { if (S.ctl.length || S.closed || Date.now() - t0 > 8000) res(S.ctl[0] || 'closed'); else setTimeout(f, 30); }; f(); });
  S.say = recs => ws.send(recs.map(r => '|' + JSON.stringify(r)).join('\n'));
  S.hi = (f, tok, n = 1) => S.say([{ k: 'p', p: { hi: { f, n, tok, ed: 1 } } }, { k: 'e', t: 'hello', d: { f } }]);
  S.emits = t => S.recs.filter(r => r.k === 'e' && r.t === t).map(r => r.d);
  return S;
}
const test = async (op, code, q = '') => (await fetch(`${srv.url}/battle-test/${code}?op=${op}${q}`)).json().catch(() => null);
const rnd = () => Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'a');

const cases = {};
// a socket that is not a player (joined after Start, told "full") keeps a battle running after every player left
cases.ghost = async () => {
  console.log('ghost: 2 players start a battle, a third socket connects and idles; both players leave');
  const code = rnd();
  const a = sock(code, 'ownerAAA1', 'ghostkey0001'); console.log('    owner: ' + await a.open()); a.hi('US', 'tokA000000');
  const b = sock(code, 'friendBB1'); await b.open(); b.hi('RU', 'tokB000000');
  await sleep(500);
  a.say([{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]);
  await sleep(500);
  a.say([{ k: 'p', p: { rd: 1 } }]); b.say([{ k: 'p', p: { rd: 1 } }]);
  await sleep(1500);
  const g = sock(code, 'ghostGG01'); console.log('    ghost: ' + await g.open()); g.hi('US', 'notatoken');
  await sleep(800);
  console.log(`    ghost told: ${JSON.stringify(g.emits('lobby').pop())}`);
  a.ws.close(); b.ws.close();
  console.log('    waiting 75 s (EMPTY_MS is 60 s)...');
  await sleep(75000);
  const st = await test('', code);
  console.log(`    after 75 s with only the idle socket: phase ${st && st.phase}, game time ${st && st.t && st.t.toFixed(0)} s`);
  check(!(st && st.phase === 'battle'), 'a battle whose players all left closes after 60 s even if a non-player socket is still connected');
  try { g.ws.close(); } catch (e) {}
  await sleep(1000);
};

// a flood of frames: the room must shed it and close the socket, and other players' battle must keep running
cases.flood = async () => {
  console.log('flood: one player sends 20,000 small frames as fast as it can, plus 200 frames of 1 MB');
  const code = rnd();
  const a = sock(code, 'ownerFL01', 'floodkey0001'); await a.open(); a.hi('US', 'tokA000001');
  const b = sock(code, 'friendFL1'); await b.open(); b.hi('RU', 'tokB000001');
  await sleep(500);
  a.say([{ k: 'e', t: 'bset', d: { tm: [0, 1], start: 1 } }]); await sleep(400);
  a.say([{ k: 'p', p: { rd: 1 } }]); b.say([{ k: 'p', p: { rd: 1 } }]); await sleep(1500);
  const t0 = (await test('', code)).t;
  const t1 = Date.now(); let sent = 0;
  for (let i = 0; i < 20000 && !b.closed; i++) { b.ws.send('|{"k":"p","p":{"pg":' + i + '}}'); sent++; }
  const big = '|' + JSON.stringify({ k: 'p', p: { x: 'y'.repeat(1 << 20) } });
  for (let i = 0; i < 200 && !b.closed; i++) { b.ws.send(big); sent++; }
  await sleep(4000);
  const st = await test('', code);
  console.log(`    sent ${sent} frames in ${Date.now() - t1} ms; flooder closed by server: ${b.closed}; battle time ${t0 && t0.toFixed(1)} -> ${st && st.t && st.t.toFixed(1)} s`);
  check(b.closed, 'the flooding socket is closed by the server');
  check(st && st.t - t0 > 3, 'the battle kept running for the other player during the flood');
  try { a.ws.close(); } catch (e) {}
  await sleep(1000);
};

// three idle sockets that never greet hold all three battle slots: nobody else can create a Cloudflare battle
cases.squat = async () => {
  console.log('squat: 3 sockets open a lobby each (owner key, no greeting, no players) and just stay connected');
  const sq = [];
  for (let k = 0; k < 3; k++) { const s = sock('sq' + rnd().slice(0, 4), 'squat00' + k, 'squatkey000' + k, '10.66.0.1'); sq.push(s); console.log('    squatter ' + k + ': ' + await s.open()); }
  await sleep(500);
  const legit = sock(rnd(), 'friend001', 'friendkey001'); const r = await legit.open();
  console.log(`    a real player creating a battle now gets: ${r}`);
  check(r !== '!e busy', 'three idle lobby sockets (one address, no greeting) cannot lock every other player out of Cloudflare battles');
  try { legit.ws.close(); } catch (e) {}
  for (const s of sq) try { s.ws.close(); } catch (e) {}
  await sleep(1500);
};

try {
  for (const [k, f] of Object.entries(cases)) { if (ONLY && !ONLY.split(',').includes(k)) continue; try { await f(); } catch (e) { check(false, `${k} threw: ${e && e.stack || e}`); } }
} finally { srv.stop(); }
console.log(fails.length ? `REVIEW-WS FAIL (${fails.length}): ${fails.join('; ')}` : 'REVIEW-WS PASS');
process.exit(fails.length ? 1 : 0);
