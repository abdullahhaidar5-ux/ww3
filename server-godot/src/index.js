// Cloudflare Worker + Durable Objects for the Godot edition's multiplayer (lockstep relay). Separate from server/
// (the browser game's servers): its own Worker name, never deployed by the browser game's workflows.
//   GET  /health                 -> {"ok":true}
//   GET  /new                    -> {"code":"abc234"}            a fresh game code
//   GET  /list                   -> {"games":[{code,n,max,host}]} open lobbies
//   GET  /quick                  -> {"code":"..."}                an open lobby with room, else a fresh code ("Play online")
//   GET  /room/<code>?name=&tok=&have=&snap=&v=1   (WebSocket)    play: see ../PROTOCOL.md
import { DurableObject } from 'cloudflare:workers';
import { Room, randomCode } from './relay-core.js';

const CODE_RE = /^[a-z0-9]{4,8}$/;
const ORIGINS = ['https://abdullahhaidar5-ux.github.io', 'https://ww3.abdullah-haidar5.workers.dev'];
const ORIGIN_RES = [
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.pages\.dev$/i,
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.workers\.dev$/i,
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.itch\.zone$/i,
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/,
];
// The Windows build sends no Origin header (it is not a web page), so "no Origin" is allowed; web pages must be ours.
function originOk(origin, env) {
  if (!origin) return true;
  const extra = String((env && env.ALLOWED_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  return ORIGINS.includes(origin) || extra.includes(origin) || ORIGIN_RES.some(r => r.test(origin));
}
const rand32 = () => crypto.getRandomValues(new Uint32Array(1))[0];
function json(obj, status = 200, origin = '') {
  return new Response(JSON.stringify(obj), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin || '*', 'Vary': 'Origin' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    if (!originOk(origin, env)) return json({ error: 'not allowed' }, 403);
    const path = url.pathname;
    if (path === '/health') return json({ ok: true, proto: 1 }, 200, origin);
    if (path === '/new') return json({ code: randomCode(rand32) }, 200, origin);
    if (path === '/list' || path === '/quick') {
      const lobby = env.LOBBY.get(env.LOBBY.idFromName('lobby'));
      return lobby.fetch('https://lobby' + path);
    }
    const m = path.match(/^\/room\/([a-z0-9]{4,8})$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected a WebSocket' }, 426);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return stub.fetch(req);
    }
    return json({ error: 'not found' }, 404);
  },
};

export class GodotRoom extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.room = null; }

  makeRoom(code, url) {
    const opt = {};
    // tests only (wrangler dev with TEST_SPEED=1): a faster clock so 10 game-minutes take one real minute
    if (this.env.TEST_SPEED === '1' && url.searchParams.get('turnms')) opt.turnMs = Math.max(5, +url.searchParams.get('turnms') | 0);
    const env = this.env;
    const io = {
      now: () => Date.now(),
      every: (ms, fn) => { const h = setInterval(fn, ms); return () => clearInterval(h); },
      rand32,
      log: (...a) => console.log(...a),
      changed: (info) => {
        const lobby = env.LOBBY.get(env.LOBBY.idFromName('lobby'));
        this.ctx.waitUntil(lobby.fetch('https://lobby/upd', { method: 'POST', body: JSON.stringify(info) }).catch(() => {}));
      },
    };
    return new Room(code, io, opt);
  }

  async fetch(req) {
    const url = new URL(req.url);
    const code = url.pathname.split('/').pop();
    if (!CODE_RE.test(code)) return json({ error: 'bad code' }, 400);
    if (!this.room || this.room.phase === 'ended') this.room = this.makeRoom(code, url);
    const room = this.room;
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    server.accept();       // ordinary socket (not hibernating): a battle's clock keeps this object awake anyway
    const conn = {
      send: (t) => { try { server.send(t); } catch (e) {} },
      close: (c, r) => { try { server.close(c, r); } catch (e) {} },
    };
    server.addEventListener('message', (e) => room.message(conn, typeof e.data === 'string' ? e.data : ''));
    // answer the close handshake ourselves (older compatibility dates don't), or the player never sees the close
    server.addEventListener('close', (e) => { room.leave(conn); conn.close(1000, 'bye'); });
    server.addEventListener('error', () => room.leave(conn));
    const q = Object.fromEntries(url.searchParams);
    room.join(conn, q);
    return new Response(null, { status: 101, webSocket: client });
  }
}

// One instance ("lobby"): open games for the menu and the "Play online" button. In memory; rooms refresh every 5 s.
export class GodotLobby extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.games = new Map(); }
  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    for (const [c, g] of this.games) if (now - g.at > 30000 || g.phase !== 'lobby') this.games.delete(c);
    if (url.pathname === '/upd' && req.method === 'POST') {
      try {
        const g = await req.json();
        if (g && CODE_RE.test(g.code)) { g.at = now; if (g.phase === 'lobby' && g.n > 0) this.games.set(g.code, g); else this.games.delete(g.code); }
      } catch (e) {}
      return json({ ok: true });
    }
    const open = [...this.games.values()].filter(g => g.n < g.max).sort((a, b) => b.n - a.n)
      .slice(0, 50).map(({ code, n, max, host }) => ({ code, n, max, host }));
    if (url.pathname === '/quick') return json({ code: open.length ? open[0].code : randomCode(rand32) });
    return json({ games: open });
  }
}
