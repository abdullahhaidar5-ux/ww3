// World War 3 servers: a Cloudflare Worker with two kinds of Durable Object.
//
//   GET  /health         -> {"ok":true,...}  (is the server up? is TURN configured?)
//   GET  /turn           -> {"configured":bool,"iceServers":[...]}  short-lived Cloudflare TURN logins (game pages only)
//   GET  /games          -> {"games":[[id,{g:{...}}],...]}  open games right now (for checks; the game uses /lobby)
//   WS   /lobby          -> the public game list, pushed live to every player on the multiplayer menu
//   WS   /room/<code>    -> one relay room per game code: carries every game message between the host and players
//                           whose networks can't connect browser-to-browser
//
// Both Durable Objects use the WebSocket Hibernation API (ctx.acceptWebSocket + webSocketMessage/webSocketClose): an
// idle lobby or room sleeps and is not billed for time, and keep-alive pings ("ping" -> "pong") are answered by
// Cloudflare without waking it. Nothing here keeps state that must survive: a room lives exactly as long as its sockets.
//
// Room wire format (text frames, payloads are never parsed by the server):
//   host   -> server: "<to>|<json>"   to = a player's id, or empty for everyone
//   player -> server: "|<json>"       always goes to the host
//   server -> anyone: "<from>|<json>"
//   control frames from the server start with "!":  "!w <id>" welcome (host: own id, player: the host's id),
//   "!j <id>" player joined (to the host), "!l <id>" left, "!e <reason>" refused (nohost / taken / full / bad)
// Lobby wire format: player -> server "p|{"g":{...}|null}" (the game this browser hosts, or none);
//   server -> players "!w <id>" then "l|[[id,{g}],...]" whenever the list changes.
import { DurableObject } from 'cloudflare:workers';

const VERSION = 1;
const HOME = 'https://abdullahhaidar5-ux.github.io';
// Pages and Workers that may use the servers. Extra exact origins: ALLOWED_ORIGINS var (comma-separated).
const ORIGINS = [HOME, 'https://ww3.abdullah-haidar5.workers.dev'];
const ORIGIN_RES = [
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.pages\.dev$/i,
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.workers\.dev$/i,
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/,
];
export function originOk(origin, env) {
  if (!origin) return false;
  const extra = String((env && env.ALLOWED_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  return ORIGINS.includes(origin) || extra.includes(origin) || ORIGIN_RES.some(r => r.test(origin));
}

// Game codes are 6 letters/digits; host migration adds "-m1", "-m2"...
const CODE_RE = /^[a-z0-9]{4,8}(-m[0-9]{1,2})?$/;
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const MAX_CLIENTS = 11;                 // host + 7 more players + 4 spectators (the game itself seats at most 8)
const MAX_HOST_MSG = 128 * 1024;        // a host bundle is normally < 20 KB
const MAX_CLIENT_MSG = 16 * 1024;       // a player's presence (orders queue) is capped at ~3.5 KB by the game
const MAX_LOBBY_MSG = 1024;
const MAX_LOBBY_GAMES = 200;
// token buckets: [messages per second, burst]. The host sends ~10-20 bundles a second per player.
const RATE = { host: [400, 800], c: [60, 120], v: [3, 10] };
const HOST_GRACE_MS = 3000;             // a host whose connection blips gets this long to come back before players are told

const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const ok = originOk(origin, env);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : HOME, 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors,
      'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
    const p = url.pathname;
    if (p === '/health' || p === '/')
      return json({ ok: true, service: 'ww3-servers', version: VERSION, turn: turnConfigured(env) }, 200, cors);
    if (p === '/turn') return ok ? turn(env, cors) : json({ error: 'origin not allowed' }, 403, cors);
    if (p === '/games') {
      const r = await lobby(env).fetch('https://lobby/games');
      return json(await r.json(), 200, cors);
    }
    const isWs = (req.headers.get('Upgrade') || '').toLowerCase() === 'websocket';
    if (p === '/lobby' || p.startsWith('/room/')) {
      if (!isWs) return json({ error: 'expected a WebSocket' }, 426, cors);
      if (!ok) return json({ error: 'origin not allowed' }, 403, cors);
      if (p === '/lobby') return lobby(env).fetch(req);
      const code = decodeURIComponent(p.slice(6)).toLowerCase();
      if (!CODE_RE.test(code)) return json({ error: 'bad game code' }, 400, cors);
      const role = url.searchParams.get('role'), id = url.searchParams.get('id') || '', key = url.searchParams.get('key') || '';
      if (role !== 'host' && role !== 'client') return json({ error: 'bad role' }, 400, cors);
      if (role === 'client' && (!ID_RE.test(id) || id.startsWith('ww3-'))) return json({ error: 'bad id' }, 400, cors);
      if (role === 'host' && !/^[A-Za-z0-9]{8,40}$/.test(key)) return json({ error: 'bad key' }, 400, cors);
      const room = env.ROOMS.get(env.ROOMS.idFromName(code));
      const fwd = new URL('https://room/');
      fwd.searchParams.set('code', code); fwd.searchParams.set('role', role); fwd.searchParams.set('id', id); fwd.searchParams.set('key', key);
      return room.fetch(new Request(fwd, req));
    }
    return json({ error: 'not found' }, 404, cors);
  },
};

const lobby = env => env.LOBBY.get(env.LOBBY.idFromName('lobby'));
const turnConfigured = env => !!(env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN);

// Cloudflare TURN (Realtime > TURN Server): set TURN_KEY_ID and TURN_KEY_API_TOKEN as secrets on this Worker.
// Without them the game simply skips the TURN step and goes straight to the relay rooms.
async function turn(env, cors) {
  if (!turnConfigured(env)) return json({ configured: false, iceServers: [] }, 200, cors);
  let r;
  try {
    r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }) });
  } catch (e) { return json({ configured: true, error: 'turn unreachable', iceServers: [] }, 502, cors); }
  if (!r.ok) return json({ configured: true, error: 'turn ' + r.status, iceServers: [] }, 502, cors);
  const j = await r.json().catch(() => ({}));
  let s = j.iceServers || [];
  if (!Array.isArray(s)) s = [s];
  // browsers refuse TURN on port 53 and time out on it: drop those urls (Cloudflare's own advice)
  s = s.map(x => ({ ...x, urls: [].concat(x.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(x => x.urls.length);
  return json({ configured: true, iceServers: s }, 200, cors);
}

// per-socket token bucket; lives in memory (resets if the object sleeps, which only happens when nobody is sending)
function allow(buckets, ws, kind) {
  const [rate, burst] = RATE[kind];
  const now = Date.now();
  let b = buckets.get(ws);
  if (!b) { b = { t: burst, at: now, drop: 0 }; buckets.set(ws, b); }
  b.t = Math.min(burst, b.t + (now - b.at) * rate / 1000); b.at = now;
  if (b.t >= 1) { b.t -= 1; return true; }
  b.drop++;
  return false;
}
const isOpen = ws => ws.readyState === 1;
const safeSend = (ws, s) => { try { ws.send(s); } catch (e) {} };
const safeClose = (ws, code, why) => { try { ws.close(code, why); } catch (e) {} };
function refuse(why) {
  // a refused connection gets one "!e <why>" frame and is closed; never hibernated, so it costs nothing to keep
  const [c, s] = Object.values(new WebSocketPair());
  s.accept(); s.send('!e ' + why); s.close(4000, why);
  return new Response(null, { status: 101, webSocket: c });
}

// ---------------------------------------------------------------------------------------------------------------
// One game room. The host's browser still runs the battle; this only passes messages along.
export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.buckets = new WeakMap();
    this.meta = new WeakMap();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  info(ws) { let m = this.meta.get(ws); if (!m) { try { m = ws.deserializeAttachment(); } catch (e) {} m = m || {}; this.meta.set(ws, m); } return m; }
  hosts(except) { return this.ctx.getWebSockets('host').filter(w => w !== except && isOpen(w)); }
  clients(except) { return this.ctx.getWebSockets('c').filter(w => w !== except && isOpen(w)); }

  async fetch(req) {
    const u = new URL(req.url), code = u.searchParams.get('code'), role = u.searchParams.get('role');
    const hostId = 'ww3-' + code;
    if (role === 'host') {
      const key = u.searchParams.get('key');
      const old = this.hosts();
      if (old.some(w => this.info(w).key !== key)) return refuse('taken');
      const [c, s] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(s, ['host']);
      const m = { role: 'host', id: hostId, key };
      s.serializeAttachment(m); this.meta.set(s, m);
      // the same host coming back after a blip replaces its old connection and gets its players back
      for (const w of old) { this.info(w).replaced = 1; safeClose(w, 4001, 'replaced'); }
      await this.ctx.storage.deleteAlarm();
      s.send('!w ' + hostId);
      for (const w of this.clients()) s.send('!j ' + this.info(w).id);
      return new Response(null, { status: 101, webSocket: c });
    }
    const id = u.searchParams.get('id');
    const host = this.hosts()[0];
    if (!host) return refuse('nohost');
    const cl = this.clients();
    if (cl.length >= MAX_CLIENTS) return refuse('full');
    if (cl.some(w => this.info(w).id === id)) return refuse('taken');
    const [c, s] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(s, ['c', 'c:' + id]);
    const m = { role: 'c', id, host: hostId };
    s.serializeAttachment(m); this.meta.set(s, m);
    s.send('!w ' + hostId);
    safeSend(host, '!j ' + id);
    return new Response(null, { status: 101, webSocket: c });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string') return;
    const m = this.info(ws), host = m.role === 'host';
    if (msg.length > (host ? MAX_HOST_MSG : MAX_CLIENT_MSG)) { safeClose(ws, 1009, 'message too big'); return; }
    if (!allow(this.buckets, ws, host ? 'host' : 'c')) {
      const b = this.buckets.get(ws);
      if (b.drop > 2000) safeClose(ws, 1008, 'too many messages');
      return;
    }
    const i = msg.indexOf('|');
    if (i < 0 || i > 40) return;
    if (host) {
      const frame = m.id + msg.slice(i);
      if (i === 0) { for (const w of this.clients()) safeSend(w, frame); }
      else { const w = this.ctx.getWebSockets('c:' + msg.slice(0, i))[0]; if (w && isOpen(w)) safeSend(w, frame); }
    } else {
      const h = this.hosts()[0];
      if (h) safeSend(h, m.id + msg.slice(i));
    }
  }

  async webSocketClose(ws, code) { this.gone(ws); safeClose(ws, 1000, 'bye'); }
  async webSocketError(ws) { this.gone(ws); }

  async gone(ws) {
    const m = this.info(ws);
    if (m.done) return; m.done = 1;
    if (m.role === 'c') { const h = this.hosts()[0]; if (h) safeSend(h, '!l ' + m.id); return; }
    if (m.role !== 'host' || m.replaced || this.hosts(ws).length) return;
    // the host dropped: give it a moment to come back before telling the players
    await this.ctx.storage.setAlarm(Date.now() + HOST_GRACE_MS);
  }

  async alarm() {
    if (this.hosts().length) return;
    for (const w of this.clients()) { safeSend(w, '!l ' + this.info(w).host); safeClose(w, 4002, 'host left'); }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The public game list: every browser on the multiplayer menu keeps one socket here; a host's socket carries the
// game it is hosting. The list is the sockets themselves (their attachments), so there is nothing to clean up.
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : undefined;
const int = (v, lo, hi) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined;
function cleanGame(g) {
  if (!g || typeof g !== 'object' || typeof g.c !== 'string' || !CODE_RE.test(g.c)) return null;
  const o = { c: g.c, f: str(g.f, 4), s: g.s === 'full' ? 'full' : 'open', n: int(g.n, 0, 16), m: str(g.m, 24), mx: int(g.mx, 1, 16) };
  for (const k in o) if (o[k] === undefined) delete o[k];
  return o;
}
export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.buckets = new WeakMap();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  list() {
    const out = [];
    for (const w of this.ctx.getWebSockets()) {
      if (!isOpen(w)) continue;
      let a = null; try { a = w.deserializeAttachment(); } catch (e) {}
      if (a && a.g) out.push([a.id, { g: a.g }]);
      if (out.length >= MAX_LOBBY_GAMES) break;
    }
    return out;
  }
  broadcast() {
    const s = 'l|' + JSON.stringify(this.list());
    for (const w of this.ctx.getWebSockets()) if (isOpen(w)) safeSend(w, s);
  }
  async fetch(req) {
    if (new URL(req.url).pathname === '/games') return json({ games: this.list() });
    const [c, s] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(s);
    const id = 'v' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    s.serializeAttachment({ id, g: null });
    s.send('!w ' + id);
    s.send('l|' + JSON.stringify(this.list()));
    return new Response(null, { status: 101, webSocket: c });
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_LOBBY_MSG || !msg.startsWith('p|')) return;
    if (!allow(this.buckets, ws, 'v')) return;
    let p; try { p = JSON.parse(msg.slice(2)); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {};
    const g = cleanGame(p && p.g);
    if (JSON.stringify(g) === JSON.stringify(a.g || null)) return;
    a.g = g; ws.serializeAttachment(a);
    this.broadcast();
  }
  async webSocketClose(ws) { this.left(ws); safeClose(ws, 1000, 'bye'); }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    let a = null; try { a = ws.deserializeAttachment(); } catch (e) {}
    if (a && a.g) { a.g = null; try { ws.serializeAttachment(a); } catch (e) {} this.broadcast(); }
  }
}
