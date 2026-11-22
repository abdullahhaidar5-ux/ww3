// Local relay for tests and LAN play: the same relay-core.js as the Cloudflare Durable Object, on Node + `ws`.
//   node local-server.mjs [--port 8788]        (any ?turnms= is honoured here: it's a test server)
import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { Room, randomCode } from './src/relay-core.js';

export function startLocal(port = 8788, { quiet = true, opt = {} } = {}) {
  const rooms = new Map();
  const rand32 = () => crypto.randomBytes(4).readUInt32LE(0);
  const json = (res, o, st = 200) => { res.writeHead(st, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(o)); };
  const open = () => [...rooms.values()].map(r => r.info()).filter(g => g.phase === 'lobby' && g.n > 0 && g.n < g.max);
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/health') return json(res, { ok: true, proto: 1 });
    if (u.pathname === '/new') return json(res, { code: randomCode(rand32) });
    if (u.pathname === '/list') return json(res, { games: open() });
    if (u.pathname === '/quick') { const g = open()[0]; return json(res, { code: g ? g.code : randomCode(rand32) }); }
    if (u.pathname === '/stats') return json(res, { rooms: [...rooms.values()].map(r => r.stats()) });
    json(res, { error: 'not found' }, 404);
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 20 });
  server.on('upgrade', (req, sock, head) => {
    const u = new URL(req.url, 'http://x');
    const m = u.pathname.match(/^\/room\/([a-z0-9]{4,8})$/);
    if (!m) { sock.destroy(); return; }
    wss.handleUpgrade(req, sock, head, (ws) => {
      let room = rooms.get(m[1]);
      if (!room || room.phase === 'ended') {
        const o = { ...opt }; if (u.searchParams.get('turnms')) o.turnMs = Math.max(5, +u.searchParams.get('turnms') | 0);
        room = new Room(m[1], {
          now: () => Date.now(),
          every: (ms, fn) => { const h = setInterval(fn, ms); return () => clearInterval(h); },
          rand32, log: (...a) => { if (!quiet || a[0] === 'desync' || a[0] === 'resync') console.log('[relay]', ...a); },
          changed: () => {},
        }, o);
        rooms.set(m[1], room);
      }
      const conn = { send: (t) => { if (ws.readyState === 1) ws.send(t); }, close: (c, r) => { try { ws.close(c, r); } catch (e) {} } };
      ws.on('message', (d, isBin) => room.message(conn, isBin ? '' : d.toString()));
      ws.on('close', () => room.leave(conn));
      ws.on('error', () => room.leave(conn));
      room.join(conn, Object.fromEntries(u.searchParams));
    });
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({ server, rooms, port: server.address().port,
    close: () => { for (const r of rooms.values()) r.end('server stopped'); wss.close(); server.close(); } })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--port');
  const port = i > 0 ? +process.argv[i + 1] : 8788;
  startLocal(port, { quiet: false }).then(s => console.log('Godot relay on http://127.0.0.1:' + s.port));
}
