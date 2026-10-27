// World War 3 servers: a Cloudflare Worker with three kinds of Durable Object (see ../orch/SERVERS.md for the design).
//
//   GET  /health         -> {"ok":true,...,"budget":{...}}  is the server up, is TURN configured, today's free-tier use
//   GET  /turn           -> {"configured":bool,"iceServers":[...]}  short-lived Cloudflare TURN logins (game pages only)
//   GET  /games          -> {"games":[[id,{g:{...}}],...]}  open games right now (for checks; the game uses /lobby)
//   WS   /lobby          -> the public game list, pushed live to every player on the multiplayer menu
//   WS   /room/<code>    -> one relay room per game code: carries game messages between the host and the players whose
//                           networks can't connect browser-to-browser. Created next to the host (locationHint).
//   WS   /battle/<code>  -> a battle hosted on Cloudflare (BattleRoom): the server runs the battle itself and the players
//                           connect to it exactly as to a relay room (protocol: ../orch/STAGE2.md section 8)
//   GET  /battle-bench?players=N&minutes=M  -> runs one AI battle inside a BattleRoom and streams its cost (text)
//
// Cost rules this file follows (Workers Free plan: 100,000 Durable Object requests and 13,000 GB-s a day; incoming
// WebSocket messages count 1/20 of a request; outgoing messages and auto-answered pings are free):
//  - WebSocket Hibernation API everywhere: an idle lobby or room sleeps and costs nothing; "ping" -> "pong" keep-alives
//    are answered by Cloudflare without waking it.
//  - Game payloads are never parsed: a frame is one or more "<to>|<json>" records joined by "\n" (JSON.stringify never
//    emits a raw newline), routed by looking only at the short prefix. The page batches everything it sends in one
//    tick into one frame, so a host sends ~10 frames a second no matter how many players it relays.
//  - No storage writes per message: room state is the sockets themselves (tags + attachments) plus memory. Storage is
//    touched only when a host drops (grace timer) and by the periodic usage report.
//  - A daily budget (Budget object) stops new relay rooms at 80% of the free allowance and new lobby connections at
//    90%, so the free plan never hard-fails mid-match; players then simply play peer-to-peer.
//
// Room wire format:
//   host   -> server: "<to>|<json>"   to = a player's id, or empty for everyone      (records joined by "\n")
//   player -> server: "|<json>"       always goes to the host                          (records joined by "\n")
//   server -> anyone: "<from>|<json>"                                                  (records joined by "\n")
//   control frames from the server start with "!":  "!w <id>" welcome (host: own id, player: the host's id),
//   "!j <id>" player joined (to the host), "!l <id>" left, "!e <reason>" refused (nohost/taken/full/busy/limit)
// Lobby wire format: player -> server "p|{"g":{...}|null}" (the game this browser hosts, or none);
//   server -> players "!w <id>" then "l|[[id,{g}],...]" whenever the list changes.
import { DurableObject } from 'cloudflare:workers';
import { routeHost, routePlayer } from './route.js';
import { BattleHost, runBench } from './battle.js';
import { createBattleSim } from '../gen/battle-sim.js';   // the game's battle code, bundled by build-sim.mjs

const VERSION = 2;
const HOME = 'https://abdullahhaidar5-ux.github.io';
// Sites that may use the servers. Extra exact origins: ALLOWED_ORIGINS var (comma-separated).
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
const MAX_PER_IP_ROOM = 8;              // sockets from one address in one room (a LAN party shares one address)
const MAX_HOST_MSG = 128 * 1024;        // the page flushes its batch at 96 KB; a single host record is < 20 KB
const MAX_CLIENT_MSG = 16 * 1024;       // a player's presence (orders queue) is capped at ~3.5 KB by the game
const MAX_LOBBY_MSG = 1024;
const MAX_LOBBY_GAMES = 200;
const BATTLE_ENTRY_TTL = 150000;        // a battle's game-list entry lapses unless its BattleRoom refreshes it (every 60 s)
const MAX_LOBBY_PER_IP = 16;            // menu tabs from one address
// token buckets [frames per second, burst]. Batched, a host sends ~10-25 frames a second; a player ~1-3.
const RATE = { host: [150, 400], c: [30, 90], v: [3, 10], room: [300, 800], ipConnect: [0.5, 30] };
const HOST_GRACE_MS = 3000;             // a host whose connection blips gets this long to come back
const STALE_MS = 150000;                // a socket that sent nothing (not even its 25 s ping) for this long is dead
const SWEEP_MS = 5 * 60000;             // while a room/lobby has sockets: drop dead ones and report usage this often
// free-tier guard
const FREE_REQ = 100000, FREE_GBS = 13000;
const STOP_RELAY = 0.8, STOP_LOBBY = 0.9, STOP_BATTLE = 0.7;   // battles stop first: each keeps an object awake
const GB_PER_OBJECT = 0.125;            // Durable Objects are billed as 128 MB each while awake
const AWAKE_TAIL_MS = 10000;            // an object stays awake ~10 s after its last event before it may hibernate

const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// Durable Object location for a new room: the region of the host who opens it, so the relay hop stays short
const ME_COUNTRIES = new Set(['AE', 'BH', 'CY', 'EG', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE']);
export function locationHint(cf) {
  if (!cf) return undefined;
  const c = cf.continent, lon = +cf.longitude;
  if (ME_COUNTRIES.has(cf.country)) return 'me';
  if (c === 'NA') return isFinite(lon) && lon < -100 ? 'wnam' : 'enam';
  if (c === 'SA') return 'sam';
  if (c === 'EU') return isFinite(lon) && lon > 20 ? 'eeur' : 'weur';
  if (c === 'AS') return 'apac';
  if (c === 'OC') return 'oc';
  if (c === 'AF') return 'afr';
  return undefined;
}

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
    if (p === '/health' || p === '/') {
      let budget = null;
      try { budget = await (await budgetObj(env).fetch('https://budget/status')).json(); } catch (e) {}
      return json({ ok: true, service: 'ww3-servers', version: VERSION, turn: turnConfigured(env), battles: !!(budget && budget.battle), budget }, 200, cors);
    }
    if (p === '/turn') return ok ? turn(env, cors) : json({ error: 'origin not allowed' }, 403, cors);
    if (p === '/games') return json(await (await lobby(env).fetch('https://lobby/games')).json(), 200, cors);
    const isWs = (req.headers.get('Upgrade') || '').toLowerCase() === 'websocket';
    if (p === '/battle-bench') {
      // one bench at a time, in one fixed object; counted in the daily budget and refused at the guard
      const fwd = new URL('https://battle/bench'); fwd.search = url.search;
      return battles(env).get(battles(env).idFromName('bench')).fetch(new Request(fwd, { headers: req.headers }));
    }
    if (p.startsWith('/battle/')) {
      if (!isWs) return json({ error: 'expected a WebSocket' }, 426, cors);
      if (!ok) return json({ error: 'origin not allowed' }, 403, cors);
      const code = decodeURIComponent(p.slice(8)).toLowerCase();
      if (!BATTLE_CODE_RE.test(code)) return json({ error: 'bad game code' }, 400, cors);
      const id = url.searchParams.get('id') || '', own = url.searchParams.get('own') || '';
      if (url.searchParams.get('role') !== 'client') return json({ error: 'bad role' }, 400, cors);
      if (!ID_RE.test(id) || id.startsWith('ww3-')) return json({ error: 'bad id' }, 400, cors);
      if (own && !/^[A-Za-z0-9]{8,40}$/.test(own)) return json({ error: 'bad key' }, 400, cors);
      // the creator is the first to reach a battle, so the battle runs near the creator
      const hint = own ? locationHint(req.cf) : undefined;
      const room = battles(env).get(battles(env).idFromName(code), hint ? { locationHint: hint } : undefined);
      const fwd = new URL('https://battle/');
      for (const [k, v] of [['code', code], ['id', id], ['own', own]]) fwd.searchParams.set(k, v);
      return room.fetch(new Request(fwd, req));
    }
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
      // the host is normally the first to reach a room, so the room is placed near the host
      const hint = role === 'host' ? locationHint(req.cf) : undefined;
      const room = env.ROOMS.get(env.ROOMS.idFromName(code), hint ? { locationHint: hint } : undefined);
      const fwd = new URL('https://room/');
      for (const [k, v] of [['code', code], ['role', role], ['id', id], ['key', key]]) fwd.searchParams.set(k, v);
      return room.fetch(new Request(fwd, req));
    }
    return json({ error: 'not found' }, 404, cors);
  },
};

const lobby = env => env.LOBBY.get(env.LOBBY.idFromName('lobby'));
const battles = env => env.BATTLES;
const BATTLE_CODE_RE = /^[a-z0-9]{4,8}$/;      // a migrated battle ("-m1") is an ordinary browser-hosted relay room
const budgetObj = env => env.BUDGET.get(env.BUDGET.idFromName('budget'));
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

// token bucket on any key; lives in memory (resets if the object sleeps, which only happens when nobody is sending)
function allow(map, key, [rate, burst]) {
  const now = Date.now();
  let b = map.get(key);
  if (!b) { b = { t: burst, at: now, drop: 0 }; map.set(key, b); }
  b.t = Math.min(burst, b.t + (now - b.at) * rate / 1000); b.at = now;
  if (b.t >= 1) { b.t -= 1; return true; }
  b.drop++;
  return false;
}
const isOpen = ws => ws.readyState === 1;
const safeSend = (ws, s) => { try { ws.send(s); } catch (e) {} };
const safeClose = (ws, code, why) => { try { ws.close(code, why); } catch (e) {} };
const ipOf = req => req.headers.get('CF-Connecting-IP') || 'local';
function refuse(why) {
  // a refused connection gets one "!e <why>" frame and is closed; never hibernated, so it costs nothing to keep
  const [c, s] = Object.values(new WebSocketPair());
  s.accept(); s.send('!e ' + why); s.close(4000, why);
  return new Response(null, { status: 101, webSocket: c });
}

// What this object has cost since its last report (estimated the way Cloudflare bills it), and the cached verdict of
// the daily budget. Shared by GameRoom and Lobby.
class Usage {
  constructor(env) { this.env = env; this.msgs = 0; this.req = 0; this.awakeMs = 0; this.last = 0; this.status = null; this.statusAt = 0; }
  event(isMsg) {
    const now = Date.now();
    if (isMsg) this.msgs++; else this.req++;
    this.awakeMs += this.last ? Math.min(now - this.last, AWAKE_TAIL_MS) : AWAKE_TAIL_MS;
    this.last = now;
  }
  // a battle keeps its object awake the whole time: count every ms since the last event, not just a short tail
  wake() { const now = Date.now(); if (this.last) this.awakeMs += now - this.last; this.last = now; }
  take() {
    const r = { req: this.req + this.msgs / 20, gbs: this.awakeMs / 1000 * GB_PER_OBJECT };
    this.req = 0; this.msgs = 0; this.awakeMs = 0;
    return r;
  }
  async report() {
    const u = this.take();
    if (!u.req && !u.gbs) return;
    try { this.setStatus(await (await budgetObj(this.env).fetch('https://budget/add', { method: 'POST', body: JSON.stringify(u) })).json()); } catch (e) {}
  }
  setStatus(s) { if (s && typeof s.reqPct === 'number') { this.status = s; this.statusAt = Date.now(); } }
  // share of today's free allowance used (0..1+), refreshed at most every 5 minutes per object (one request)
  async used() {
    if (!this.status || Date.now() - this.statusAt > SWEEP_MS) {
      try { this.setStatus(await (await budgetObj(this.env).fetch('https://budget/status')).json()); } catch (e) {}
    }
    return this.status ? Math.max(this.status.reqPct, this.status.gbsPct) / 100 : 0;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// One game room. The host's browser still runs the battle; this only passes messages along.
export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.meta = new WeakMap();
    this.buckets = new WeakMap();
    this.ipBuckets = new Map();
    this.roomBucket = new Map();
    this.usage = new Usage(env);
    this.host = undefined;              // cached host socket (undefined = rebuild from the sockets on next use)
    this.byId = null;                   // cached player id -> socket
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  info(ws) { let m = this.meta.get(ws); if (!m) { try { m = ws.deserializeAttachment(); } catch (e) {} m = m || {}; this.meta.set(ws, m); } return m; }
  index() {
    if (this.byId) return;
    this.byId = new Map(); this.host = null;
    for (const w of this.ctx.getWebSockets()) {
      if (!isOpen(w)) continue;
      const m = this.info(w);
      if (m.role === 'host') this.host = w; else if (m.role === 'c') this.byId.set(m.id, w);
    }
  }
  dirty() { this.byId = null; this.host = undefined; }
  liveHost() { this.index(); return this.host && isOpen(this.host) ? this.host : null; }

  async fetch(req) {
    this.usage.event(false);
    const u = new URL(req.url), code = u.searchParams.get('code'), role = u.searchParams.get('role'), ip = ipOf(req);
    if (!allow(this.ipBuckets, ip, RATE.ipConnect)) return refuse('limit');
    if (await this.usage.used() >= STOP_RELAY) return refuse('busy');
    const hostId = 'ww3-' + code;
    this.index();
    const all = this.ctx.getWebSockets().filter(isOpen);
    if (all.filter(w => this.info(w).ip === ip).length >= MAX_PER_IP_ROOM) return refuse('limit');
    if (role === 'host') {
      const key = u.searchParams.get('key');
      const old = all.filter(w => this.info(w).role === 'host');
      if (old.some(w => this.info(w).key !== key)) return refuse('taken');
      const [c, s] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(s, ['host']);
      const m = { role: 'host', id: hostId, key, ip, at: Date.now() };
      s.serializeAttachment(m); this.meta.set(s, m);
      // the same host coming back after a blip replaces its old connection and gets its players back
      for (const w of old) { this.info(w).replaced = 1; safeClose(w, 4001, 'replaced'); }
      this.dirty();
      await this.ctx.storage.delete('hostGoneAt');
      s.send('!w ' + hostId);
      this.index();
      for (const id of this.byId.keys()) s.send('!j ' + id);
      await this.arm(SWEEP_MS);
      return new Response(null, { status: 101, webSocket: c });
    }
    const id = u.searchParams.get('id');
    const host = this.liveHost();
    if (!host) return refuse('nohost');
    if (this.byId.size >= MAX_CLIENTS) return refuse('full');
    if (this.byId.has(id)) return refuse('taken');
    const [c, s] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(s, ['c']);
    const m = { role: 'c', id, host: hostId, ip, at: Date.now() };
    s.serializeAttachment(m); this.meta.set(s, m);
    this.byId.set(id, s);
    s.send('!w ' + hostId);
    safeSend(host, '!j ' + id);
    return new Response(null, { status: 101, webSocket: c });
  }

  async webSocketMessage(ws, msg) {
    this.usage.event(true);
    if (typeof msg !== 'string') return;
    const m = this.info(ws), isHost = m.role === 'host';
    if (msg.length > (isHost ? MAX_HOST_MSG : MAX_CLIENT_MSG)) { safeClose(ws, 1009, 'message too big'); return; }
    if (!allow(this.buckets, ws, isHost ? RATE.host : RATE.c) || !allow(this.roomBucket, 0, RATE.room)) {
      if (this.buckets.get(ws).drop > 2000) safeClose(ws, 1008, 'too many messages');
      return;
    }
    if (this.usage.msgs >= 20000) this.ctx.waitUntil(this.usage.report());
    this.index();
    if (isHost) { routeHost(msg, m.id, this.byId, safeSend); return; }
    const h = this.liveHost(), f = h && routePlayer(msg, m.id);
    if (f) safeSend(h, f);
  }

  async webSocketClose(ws) { await this.gone(ws); safeClose(ws, 1000, 'bye'); }
  async webSocketError(ws) { await this.gone(ws); }

  async gone(ws) {
    const m = this.info(ws);
    if (m.done) return; m.done = 1;
    this.dirty();
    if (m.role === 'c') { const h = this.liveHost(); if (h) safeSend(h, '!l ' + m.id); }
    else if (m.role === 'host' && !m.replaced && !this.liveHost()) {
      // the host dropped: give it a moment to come back before telling the players
      await this.ctx.storage.put('hostGoneAt', Date.now());
      await this.arm(HOST_GRACE_MS);
    }
    if (!this.ctx.getWebSockets().some(w => w !== ws && isOpen(w))) await this.usage.report();
  }

  // one alarm does everything: release players after the host's grace period, drop dead sockets, report usage
  async arm(ms) {
    const at = Date.now() + ms, cur = await this.ctx.storage.getAlarm();
    if (!cur || cur > at) await this.ctx.storage.setAlarm(at);
  }
  async alarm() {
    this.usage.event(false);
    const now = Date.now();
    this.dirty(); this.index();
    const goneAt = await this.ctx.storage.get('hostGoneAt');
    if (!this.host && goneAt != null) {
      if (now - goneAt < HOST_GRACE_MS) { await this.ctx.storage.setAlarm(goneAt + HOST_GRACE_MS); return; }
      for (const w of this.byId.values()) { safeSend(w, '!l ' + this.info(w).host); safeClose(w, 4002, 'host left'); }
      await this.ctx.storage.delete('hostGoneAt');
      this.dirty();
    }
    sweep(this.ctx, w => this.info(w), now);
    this.dirty();
    await this.usage.report();
    if (this.ctx.getWebSockets().some(isOpen)) await this.ctx.storage.setAlarm(now + SWEEP_MS);
  }
}

// close sockets that have been silent (not even a keep-alive ping) for STALE_MS: browsers that vanished without
// closing (crashed tab, phone dropped off the network). Their games leave the list with them.
function sweep(ctx, info, now) {
  for (const w of ctx.getWebSockets()) {
    if (!isOpen(w)) continue;
    let last = 0; try { const t = ctx.getWebSocketAutoResponseTimestamp(w); if (t) last = +t; } catch (e) {}
    const m = info(w) || {};
    last = Math.max(last, m.at || 0, m.seen || 0);
    if (now - last > STALE_MS) safeClose(w, 4003, 'silent');
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The public game list: every browser on the multiplayer menu keeps one socket here; a host's socket carries the
// game it is hosting. The list is the sockets' attachments, cached as the ready-to-send frame.
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : undefined;
const int = (v, lo, hi) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined;
function cleanGame(g) {
  if (!g || typeof g !== 'object' || typeof g.c !== 'string' || !CODE_RE.test(g.c)) return null;
  const o = { c: g.c, f: str(g.f, 4), s: g.s === 'full' ? 'full' : 'open', n: int(g.n, 0, 16), m: str(g.m, 24), mx: int(g.mx, 1, 16), cf: g.cf ? 1 : undefined };
  for (const k in o) if (o[k] === undefined) delete o[k];
  return o;
}
export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.buckets = new WeakMap();
    this.ipBuckets = new Map();
    this.usage = new Usage(env);
    this.cache = null;                  // "l|[...]" frame, rebuilt only when a game changes
    this.cacheExp = Infinity;           // ...or when a battle entry in it expires
    this.bat = {};                      // battles hosted on Cloudflare: 'b-<code>' -> {g, exp} (they have no socket here)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => { this.bat = (await ctx.storage.get('bat')) || {}; });
  }
  att(w) { try { return w.deserializeAttachment() || {}; } catch (e) { return {}; } }
  frame() {
    if (this.cache && Date.now() < this.cacheExp) return this.cache;
    const out = [], now = Date.now();
    this.cacheExp = Infinity;
    for (const [id, b] of Object.entries(this.bat)) {
      if (!b || b.exp <= now) { delete this.bat[id]; continue; }
      out.push([id, { g: b.g }]); this.cacheExp = Math.min(this.cacheExp, b.exp);
    }
    for (const w of this.ctx.getWebSockets()) {
      if (!isOpen(w)) continue;
      const a = this.att(w);
      if (a.g) out.push([a.id, { g: a.g }]);
      if (out.length >= MAX_LOBBY_GAMES) break;
    }
    return (this.cache = 'l|' + JSON.stringify(out));
  }
  broadcast() {
    this.cache = null;
    const s = this.frame();
    for (const w of this.ctx.getWebSockets()) if (isOpen(w)) safeSend(w, s);
  }
  async fetch(req) {
    this.usage.event(false);
    const path = new URL(req.url).pathname;
    if (path === '/games') return json({ games: JSON.parse(this.frame().slice(2)) });
    if (path === '/battle' && req.method === 'POST') {   // a BattleRoom (re)publishes its game, or removes it (g: null)
      const b = await req.json().catch(() => ({}));
      if (typeof b.id !== 'string' || !/^b-[a-z0-9]{4,8}$/.test(b.id)) return json({ ok: false }, 400);
      const g = b.g ? cleanGame({ ...b.g, cf: 1 }) : null, old = this.bat[b.id];
      if (g) this.bat[b.id] = { g, exp: Date.now() + BATTLE_ENTRY_TTL }; else delete this.bat[b.id];
      await this.ctx.storage.put('bat', this.bat);
      if (JSON.stringify((old && old.g) || null) !== JSON.stringify(g)) this.broadcast(); else this.cache = null;
      return json({ ok: true });
    }
    const ip = ipOf(req);
    if (!allow(this.ipBuckets, ip, RATE.ipConnect)) return refuse('limit');
    if (await this.usage.used() >= STOP_LOBBY) return refuse('busy');
    const socks = this.ctx.getWebSockets().filter(isOpen);
    if (socks.filter(w => this.att(w).ip === ip).length >= MAX_LOBBY_PER_IP) return refuse('limit');
    const [c, s] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(s);
    const id = 'v' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    s.serializeAttachment({ id, g: null, ip, at: Date.now() });
    s.send('!w ' + id);
    s.send(this.frame());
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
    return new Response(null, { status: 101, webSocket: c });
  }
  async webSocketMessage(ws, msg) {
    this.usage.event(true);
    if (typeof msg !== 'string' || msg.length > MAX_LOBBY_MSG || !msg.startsWith('p|')) return;
    if (!allow(this.buckets, ws, RATE.v)) return;
    let p; try { p = JSON.parse(msg.slice(2)); } catch (e) { return; }
    const a = this.att(ws);
    const g = cleanGame(p && p.g);
    if (JSON.stringify(g) === JSON.stringify(a.g || null)) return;
    a.g = g; ws.serializeAttachment(a);
    this.broadcast();
  }
  async webSocketClose(ws) { this.left(ws); safeClose(ws, 1000, 'bye'); }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    const a = this.att(ws);
    if (a.g) { a.g = null; try { ws.serializeAttachment(a); } catch (e) {} this.broadcast(); }
  }
  async alarm() {
    this.usage.event(false);
    const now = Date.now();
    sweep(this.ctx, w => this.att(w), now);
    this.cache = null;
    await this.usage.report();
    if (this.ctx.getWebSockets().some(isOpen)) await this.ctx.storage.setAlarm(now + SWEEP_MS);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Today's estimated free-tier use (UTC day), reported by rooms and the lobby every few minutes. One small row a day.
export class Budget extends DurableObject {
  async fetch(req) {
    const day = new Date().toISOString().slice(0, 10);
    let d = (await this.ctx.storage.get('d')) || { day, req: 0, gbs: 0 };
    if (d.day !== day) d = { day, req: 0, gbs: 0 };
    d.req += 1;                                             // this call itself
    if (new URL(req.url).pathname === '/add' && req.method === 'POST') {
      const u = await req.json().catch(() => ({}));
      d.req += Math.max(0, Math.min(1e6, +u.req || 0)); d.gbs += Math.max(0, Math.min(1e6, +u.gbs || 0));
    }
    await this.ctx.storage.put('d', d);
    // FREE_REQ / FREE_GBS vars exist only so the local test can shrink the allowance; never set them in Cloudflare
    const fr = +this.env.FREE_REQ || FREE_REQ, fg = +this.env.FREE_GBS || FREE_GBS;
    const reqPct = Math.round(d.req / fr * 1000) / 10, gbsPct = Math.round(d.gbs / fg * 1000) / 10;
    return json({ day, req: Math.round(d.req), gbs: Math.round(d.gbs), reqPct, gbsPct,
      relay: Math.max(reqPct, gbsPct) < STOP_RELAY * 100, lobby: Math.max(reqPct, gbsPct) < STOP_LOBBY * 100,
      battle: Math.max(reqPct, gbsPct) < STOP_BATTLE * 100 });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// A battle hosted on Cloudflare: this object runs the battle (the game's own code, bundled from src/) and is itself the
// room the players connect to, with the relay-room wire format (protocol: ../orch/STAGE2.md section 8).
// Cost rules: the battle runs from a timer loop inside the object (setTimeout; timers are not billed) with one or two
// 1/60 s steps per callback, never one alarm per tick (alarms are requests). Its sockets are ordinary (not hibernating)
// so the battle stays in memory; the object is awake (billed GB-s) from the first player to the room closing, and
// that whole time is counted in the daily budget. New battles are refused at 70% of the free allowance.
const BENCH_FACS = ['US', 'RU', 'IR', 'CN', 'TR', 'IL', 'EU', 'PK'];
const MAX_BATTLE_SOCKETS_PER_IP = 8;
const LIST_REFRESH_MS = 60000;
export class BattleRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.usage = new Usage(env);
    this.host = null;                   // BattleHost while a lobby or battle exists
    this.socks = new Map();             // player id -> socket
    this.ips = new Map();               // player id -> address
    this.buckets = new WeakMap();
    this.ipBuckets = new Map();
    this.timer = null; this.lastRep = Date.now(); this.lastList = 0; this.benching = false;
  }

  async fetch(req) {
    this.usage.event(false);
    const u = new URL(req.url);
    if (u.pathname === '/bench') return this.bench(u);
    const code = u.searchParams.get('code'), id = u.searchParams.get('id'), own = u.searchParams.get('own') || '', ip = ipOf(req);
    if (!allow(this.ipBuckets, ip, RATE.ipConnect)) return refuse('limit');
    if (this.host && this.host.phase === 'closed') this.stop();
    if (!this.host) {
      if (!own) return refuse('nohost');
      if (await this.usage.used() >= STOP_BATTLE) return refuse('busy');
      if (!this.host) {                 // (another creator may have got in while the budget was being checked)
        this.code = code;
        this.host = new BattleHost({ sim: createBattleSim(), code, ownKey: own, now: () => Date.now(),
          send: (pid, f) => { const w = this.socks.get(pid); if (w) safeSend(w, f); },
          close: (pid, c, why) => { const w = this.socks.get(pid); this.socks.delete(pid); this.ips.delete(pid); if (w) safeClose(w, c, why); },
          publish: g => this.publish(g), log: m => console.log(m) });
        this.loop(0);
      }
    }
    if ([...this.ips.values()].filter(x => x === ip).length >= MAX_BATTLE_SOCKETS_PER_IP) return refuse('limit');
    const why = this.host.admit(id, own);
    if (why) return refuse(why);
    const [c, s] = Object.values(new WebSocketPair());
    s.accept();
    this.socks.set(id, s); this.ips.set(id, ip);
    s.addEventListener('message', ev => {
      this.usage.event(true);
      const m = ev.data;
      if (typeof m !== 'string' || this.socks.get(id) !== s || !this.host) return;
      if (m === 'ping') { safeSend(s, 'pong'); return; }
      if (!allow(this.buckets, s, RATE.c)) { if (this.buckets.get(s).drop > 2000) safeClose(s, 1008, 'too many messages'); return; }
      this.host.frame(id, m);
    });
    const bye = () => { if (this.socks.get(id) !== s) return; this.socks.delete(id); this.ips.delete(id); if (this.host) this.host.leave(id); };
    s.addEventListener('close', bye); s.addEventListener('error', bye);
    this.host.join(id, own);
    return new Response(null, { status: 101, webSocket: c });
  }

  // the battle loop: BattleHost.tick() says when the next step is due (about every 16 ms during a battle)
  loop(ms) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.host) return;
      let next;
      try { next = this.host.tick(); } catch (e) { console.log('battle tick: ' + (e && e.stack || e)); next = this.host.shut('server error'); }
      this.usage.wake();
      const now = Date.now();
      if (now - this.lastRep > SWEEP_MS) { this.lastRep = now; this.usage.report().catch(() => {}); }
      if (next >= 0 && now - this.lastList > LIST_REFRESH_MS) this.host.list(true);
      if (next < 0) { this.stop(); return; }
      this.loop(next);
    }, ms);
  }
  stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.host && this.host.phase !== 'closed') this.host.shut('closed');
    for (const w of this.socks.values()) safeClose(w, 4002, 'closed');
    this.socks.clear(); this.ips.clear();
    this.host = null;
    this.usage.wake(); this.usage.report().catch(() => {});
  }
  // the game list (Lobby object): this battle's entry, or null to remove it
  publish(g) {
    this.lastList = Date.now();
    if (!this.code) return;
    lobby(this.env).fetch('https://lobby/battle', { method: 'POST', body: JSON.stringify({ id: 'b-' + this.code, g }) }).catch(() => {});
  }

  // GET /battle-bench: one AI battle as fast as the object can run it, streamed as text, then "RESULT {json}"
  async bench(u) {
    if (this.benching) return json({ error: 'busy: a bench is already running, try again in a few minutes' }, 429);
    if (await this.usage.used() >= STOP_BATTLE) return json({ error: 'busy: today\'s free-plan guard is reached' }, 503);
    const q = k => u.searchParams.get(k);
    const num = (k, lo, hi, d) => { const v = Number(q(k)); return q(k) != null && q(k) !== '' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
    const sim = createBattleSim();
    const o = { players: Math.round(num('players', 2, 8, 2)), minutes: num('minutes', 0.25, 10, 2), seed: Math.round(num('seed', 0, 1e9, 1)),
      diff: Math.round(num('diff', 0, 2, 1)), batch: Math.round(num('batch', 1, 60, 1)), facs: BENCH_FACS };
    o.map = sim.mapOk(q('map') || '') && sim.mapMax(q('map')) >= o.players ? q('map') : 'strait';
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter(), enc = new TextEncoder();
    const write = s => w.write(enc.encode(s + '\n')).catch(() => {});
    this.benching = true;
    const t0 = Date.now();
    const work = (async () => {
      try {
        write(`World War 3 battle bench on Cloudflare (Durable Object, ${new Date().toISOString()})`);
        const r = await runBench(sim, o, { now: () => Date.now(), write,
          yieldFn: () => new Promise(res => setTimeout(() => { this.usage.wake(); res(); }, 0)) });
        r.totalWallMs = Date.now() - t0;
        write(`done: ${r.gameSeconds} game-seconds in ${r.totalWallMs} ms; ${r.wallMsPerGameS} ms per game-second (wall time of the steps, an upper bound on CPU); slowest event ${r.maxEventMs} ms; sent ${r.kbPerGameS} KB per game-second to ${r.players} players`);
        write('RESULT ' + JSON.stringify(r));
      } catch (e) { write('ERROR ' + String(e && e.stack || e)); }
      finally { this.benching = false; this.usage.wake(); await this.usage.report().catch(() => {}); w.close().catch(() => {}); }
    })();
    this.ctx.waitUntil(work);
    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
