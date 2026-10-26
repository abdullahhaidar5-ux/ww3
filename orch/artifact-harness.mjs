// Test helpers for the claude.ai artifact edition (python3 orch/build.py --artifact -> orch/out/artifact/index.html).
// Used by `node orch/smoke.mjs --artifact` and `node orch/mpsync.mjs --artifact`; see orch/ARTIFACT.md.
//
//  - artifactHtml(): the built artifact page wrapped in the same <!doctype>/<head>/<body> skeleton the claude.ai
//    Artifact publisher adds, so the test loads exactly what a player's browser gets.
//  - threeJs(): the vendored Three.js r128 from index.html, served in place of the cdnjs request (no network in tests).
//  - roomStub(opts): an in-page stand-in for the artifact runtime's window.claude.use('room') / use('user'), carried
//    between test pages over a BroadcastChannel. It follows the runtime contract (orch/ARTIFACT.md): lobby + join(name)
//    named rooms, emit/on, presence/peers/onPeers, Sender fields (peer/by/isMe/sameTab), 4 KiB limits on emit data and
//    on presence, topic grammar, and - like a Contributor - only the topics the publish declaration opens. It records
//    what the real runtime would reject or drop in window.__fpStats so the tests can fail on it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ART_DIR = path.join(ROOT, 'orch', 'out', 'artifact');
export const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';

export function artifactHtml() {
  const f = path.join(ART_DIR, 'index.html');
  if (!fs.existsSync(f)) throw new Error('orch/out/artifact/index.html missing - run: python3 orch/build.py --artifact');
  const built = fs.statSync(f).mtimeMs;
  for (const n of fs.readdirSync(path.join(ROOT, 'src')))
    if (fs.statSync(path.join(ROOT, 'src', n)).mtimeMs > built) throw new Error(`src/${n} is newer than the artifact build - run: python3 orch/build.py --artifact`);
  return SKELETON + fs.readFileSync(f, 'utf8') + '</body></html>';
}

export function threeJs() {
  const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = h.indexOf('Three.js Authors'), s = h.lastIndexOf('<script>', a), e = h.indexOf('</script>', a);
  if (a < 0 || s < 0 || e < 0) throw new Error('vendored Three.js not found in index.html');
  return h.slice(s + '<script>'.length, e);
}

export function roomTopics() {
  try { return Object.keys(JSON.parse(fs.readFileSync(path.join(ART_DIR, 'publish.json'), 'utf8')).capabilities.room.topics); }
  catch { return null; }
}

// Runs inside the page (addInitScript): must be self-contained.
export function roomStub(opts) {
  if (window.__roomStub) return; window.__roomStub = true;
  const TOPICS = opts && opts.topics, BC = new BroadcastChannel('ww3-roomstub');
  const me = Math.random().toString(36).slice(2, 10), byOf = id => 'user-' + id;
  const stats = window.__fpStats = { tx: 0, rx: 0, txB: 0, rxB: 0, dropped: 0, big: {}, denied: {}, bigPres: 0, perSec: {}, peakRate: 0, peakAt: 0 };
  const err = (code, msg) => Object.assign(new Error(code + ': ' + (msg || '')), { code });
  const bytes = s => new TextEncoder().encode(s).length;
  const rooms = new Map();
  const peerObj = (id, pres, t) => Object.freeze({ peer: id, by: byOf(id), isMe: id === me, sameTab: id === me, kind: 'viewer', guest: false,
    presence: Object.freeze(pres), updatedAt: t });
  function mkRoom(name) {
    const R = { name, mine: {}, others: new Map(), ls: {}, pls: [], pend: { joined: [], left: [], updated: [] }, sched: false, left: false };
    R.selfObj = peerObj(me, {}, Date.now());
    const rebuild = () => { R.snap = Object.freeze([R.selfObj, ...R.others.values()]); };
    rebuild();
    const notify = (kind, p) => { R.pend[kind].push(p); if (R.sched) return; R.sched = true;
      setTimeout(() => { R.sched = false; if (R.left) return; const ch = { peers: R.snap, joined: R.pend.joined, left: R.pend.left, updated: R.pend.updated };
        R.pend = { joined: [], left: [], updated: [] }; for (const f of R.pls.slice()) try { f(ch); } catch (e) { console.error(e); } }, 16); };
    const sendPres = (ack) => BC.postMessage({ k: 'p', room: name, from: me, s: JSON.stringify(R.mine), ack });
    R.onMsg = m => {
      if (m.k === 'hi') { sendPres(true); return; }
      if (m.k === 'bye') { const p = R.others.get(m.from); if (p) { R.others.delete(m.from); rebuild(); notify('left', p); } return; }
      if (window.__fpDrop) { stats.dropped++; return; }
      if (m.k === 'p') { const had = R.others.has(m.from), p = peerObj(m.from, JSON.parse(m.s), Date.now()); R.others.set(m.from, p); rebuild();
        notify(had ? 'updated' : 'joined', p); if (!had && !m.ack) sendPres(true); return; }
      if (m.k === 'e') { if (m.from !== me) { stats.rx++; stats.rxB += m.s.length; }
        const msg = { peer: m.from, by: byOf(m.from), isMe: m.from === me, sameTab: m.from === me, kind: 'viewer', guest: false, topic: m.topic, data: JSON.parse(m.s) };
        for (const f of (R.ls[m.topic] || []).slice()) try { f(msg); } catch (e) { console.error(e); } }
    };
    R.api = Object.freeze({
      name,
      emit(topic, data) {
        if (R.left) return Promise.reject(err('invalid_argument', 'room left'));
        if (typeof topic !== 'string' || !/^[a-z][a-z0-9_.-]{0,47}$/.test(topic)) return Promise.reject(err('invalid_argument', 'topic ' + topic));
        const s = JSON.stringify(data === undefined ? null : data), n = bytes(s);
        if (n > 4096) { stats.big[topic] = Math.max(stats.big[topic] || 0, n); return Promise.reject(err('invalid_argument', `data ${n} bytes > 4 KiB`)); }
        if (TOPICS && !TOPICS.includes(topic)) { stats.denied[topic] = (stats.denied[topic] || 0) + 1; return Promise.reject(err('not_permitted', topic)); }
        // send budget (~40/s shared by emits + presence): counted per game-second, the clock the host's netTick runs on
        // (G is the game's top-level `let`, reachable by name from this init script once the game has loaded)
        const gt = (typeof G !== 'undefined' && G && G.t) || 0, sec = Math.floor(gt);
        if (gt > 0) { const B = stats.perSec[sec] = stats.perSec[sec] || { n: 0 }; B.n++; B[topic] = (B[topic] || 0) + 1;
          if (B.n > stats.peakRate) { stats.peakRate = B.n; stats.peakAt = sec; stats.peakMix = B; } }
        stats.tx++; stats.txB += s.length;
        const m = { k: 'e', room: name, from: me, topic, s }; BC.postMessage(m); setTimeout(() => R.onMsg(m), 0); return Promise.resolve();
      },
      on(topic, fn) { if (typeof fn !== 'function') throw new TypeError('handler'); (R.ls[topic] = R.ls[topic] || []).push(fn); return () => { R.ls[topic] = (R.ls[topic] || []).filter(x => x !== fn); }; },
      presence(patch) {
        if (R.left) return Promise.reject(err('invalid_argument', 'room left'));
        const m = Object.assign({}, R.mine); for (const k in patch) { if (patch[k] === null) delete m[k]; else m[k] = patch[k]; }
        const s = JSON.stringify(m); if (bytes(s) > 4096) { stats.bigPres = Math.max(stats.bigPres, bytes(s)); return Promise.reject(err('invalid_argument', 'presence > 4 KiB')); }
        R.mine = JSON.parse(s); R.selfObj = peerObj(me, JSON.parse(s), Date.now()); rebuild(); notify('updated', R.selfObj); sendPres(true); return Promise.resolve();
      },
      peers() { return R.snap; },
      onPeers(fn) { R.pls.push(fn); setTimeout(() => { if (R.pls.includes(fn)) fn({ peers: R.snap, joined: R.snap.slice(), left: [], updated: [] }); }, 0);
        return () => { R.pls = R.pls.filter(x => x !== fn); }; },
      connected() { return !R.left; },
      onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
      leave() { if (!R.left) { R.left = true; R.ls = {}; R.pls = []; rooms.delete(name); BC.postMessage({ k: 'bye', room: name, from: me }); } return Promise.resolve(); },
      ...(name === '' ? { join } : {}),
    });
    rooms.set(name, R); BC.postMessage({ k: 'hi', room: name, from: me });
    return R;
  }
  function join(name) {
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) return Promise.reject(err('invalid_argument', 'room name ' + name));
    if (arguments.length > 1 && arguments[1] !== undefined) console.warn('roomStub: join() got a second argument; the real runtime takes only a name');
    const R = rooms.get(name) || mkRoom(name);
    return new Promise(r => setTimeout(() => r(R.api), 60));
  }
  BC.onmessage = ev => { const m = ev.data; if (!m || m.from === me) return; const R = rooms.get(m.room); if (R) R.onMsg(m); };
  window.addEventListener('pagehide', () => { for (const R of rooms.values()) R.api.leave(); });
  const lobby = mkRoom('');
  const user = Object.freeze({ id: async () => byOf(me), me: async () => ({ id: byOf(me), name: 'Tester ' + me.slice(0, 4) }),
    profiles: async ids => Object.fromEntries((ids || []).map(id => [id, { id, name: 'Tester ' + String(id).slice(5, 9) }])),
    isOwner: () => false, canEdit: () => false, can: () => null });
  // like the real runtime: the namespace arrives later, never during the page's first script run
  Object.defineProperty(window, 'claude', { configurable: false, writable: false,
    value: Object.freeze({ use: name => new Promise(r => setTimeout(() => r(name === 'room' ? lobby.api : name === 'user' ? user : null), 30)) }) });
}

// After a run: what the real runtime would have refused. Returns { fails: [...], warns: [...] }.
export function judgeRoomStats(tag, s) {
  const fails = [], warns = [];
  if (!s) return { fails, warns };
  for (const [t, n] of Object.entries(s.big || {})) fails.push(`${tag}: a '${t}' message was ${n} bytes; the room refuses anything over 4096`);
  for (const [t, n] of Object.entries(s.denied || {})) fails.push(`${tag}: ${n} '${t}' message(s) refused - topic not opened in the publish capabilities (build.py ROOM_TOPICS)`);
  if (s.bigPres) fails.push(`${tag}: presence grew to ${s.bigPres} bytes; the room refuses anything over 4096`);
  if (s.peakRate > 40) warns.push(`${tag}: peak ${s.peakRate} room messages in one game-second (t=${s.peakAt}s: ${JSON.stringify(s.peakMix)}); the room drops sends past ~40/s (burst 80)`);
  return { fails, warns };
}
