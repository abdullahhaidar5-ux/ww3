// A pass-through in front of local `wrangler dev` servers, for orch/cfclient.mjs: the test pages talk to the game
// servers only through this, so the test can do to the connection what the real internet does to it.
//
//   const P = await startProxy(srv.url);   // { url, setUpstream(url), route(fn), cut(fn), kill(code), down(bool), stop() }
//
// - route(fn): fn(pathname, query) -> upstream url for this connection (e.g. send /battle/ to a server that is over its
//   free-plan budget, so it answers "busy" for real), or null for the default upstream
// - cut(fn): drop the open WebSocket connections whose {path, code, id} match, as a network blip does
// - kill(code): the Cloudflare battle <code> is gone for good: its connections drop, and /battle/<code> answers
//   "!e nohost" from now on (what a page sees after the server lost the battle)
// - down(true): every new connection fails (server unreachable); setUpstream(url): point at a restarted server
// Everything else (HTTP and WebSockets: /lobby, /room/, /health) passes through byte for byte. Local only.
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { WebSocketServer } = createRequire(path.join(ROOT, 'server', 'package.json'))('ws');

export async function startProxy(upstream) {
  let up = new URL(upstream), router = () => null, isDown = false;
  const killed = new Set(), open = new Set();
  const wss = new WebSocketServer({ noServer: true });
  const pick = u => { const r = router(u.pathname, u.searchParams); return r ? new URL(r) : up; };
  const server = http.createServer((req, res) => {
    if (isDown) { req.socket.destroy(); return; }
    const u = new URL(req.url, 'http://x'), t = pick(u);
    const r = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: { ...req.headers, host: t.host } }, ur => {
      res.writeHead(ur.statusCode, ur.headers); ur.pipe(res); });
    r.on('error', () => { try { res.writeHead(502); res.end(); } catch {} });
    req.pipe(r);
  });
  server.on('upgrade', (req, sock, head) => {
    const u = new URL(req.url, 'http://x'), m = /^\/battle\/([a-z0-9]+)$/.exec(u.pathname);
    const info = { path: u.pathname, code: m ? m[1] : null, id: u.searchParams.get('id'), sock, up: null };
    sock.on('error', () => {});
    if (isDown) { sock.destroy(); return; }
    if (m && killed.has(m[1])) { wss.handleUpgrade(req, sock, head, ws => { ws.send('!e nohost'); ws.close(1000, 'nohost'); }); return; }
    const t = pick(u);
    const c = net.connect(+t.port, t.hostname, () => {
      let h = `${req.method} ${req.url} HTTP/1.1\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) h += `${req.rawHeaders[i]}: ${/^host$/i.test(req.rawHeaders[i]) ? t.host : req.rawHeaders[i + 1]}\r\n`;
      c.write(h + '\r\n'); if (head && head.length) c.write(head);
      c.pipe(sock); sock.pipe(c);
    });
    info.up = c; open.add(info);
    const done = () => { open.delete(info); c.destroy(); sock.destroy(); };
    c.on('error', done); c.on('close', done); sock.on('close', done);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const drop = f => { let n = 0; for (const i of [...open]) if (f(i)) { n++; i.sock.destroy(); if (i.up) i.up.destroy(); open.delete(i); } return n; };
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    setUpstream(u) { up = new URL(u); },
    route(fn) { router = fn || (() => null); },
    cut: drop,
    kill(code) { killed.add(code); return drop(i => i.code === code); },
    down(v) { isDown = !!v; if (isDown) drop(() => true); },
    open: () => [...open].map(i => ({ path: i.path, code: i.code, id: i.id })),
    stop() { drop(() => true); server.close(); },
  };
}
