// JavaScript reference lockstep client (same behaviour as godot/net/lockstep_net.gd), used by the soak test.
// Runs every tick it has as soon as it has it (like the Godot client with realtime = false).
export class LockstepClient {
  constructor({ base, code, name, tok, snap = true, query = '', hooks = {} }) {
    Object.assign(this, { base, code, name, tok: tok || null, snapOK: snap, query, hooks });
    this.phase = 'offline'; this.you = -1; this.info = null; this.seq = 0;
    this.turns = new Map(); this.turn = 0; this.sub = 0; this.t = 0; this.recvUpto = -1;
    this.awaitSnap = false; this.snapParts = []; this.snapReq = -1; this.closedByUs = false;
    this.tpt = 3; this.hashEvery = 10; this.desyncs = []; this.reconnects = 0;
  }
  connect() {
    const have = this.phase === 'battle' && this.recvUpto >= 0 ? this.recvUpto : -1;
    const url = `${this.base}/room/${this.code}?v=1&name=${encodeURIComponent(this.name)}&tok=${this.tok || ''}&have=${have}&snap=${this.snapOK ? 1 : 0}${this.query}`;
    if (this.phase === 'offline') this.phase = 'connecting';
    const ws = this.ws = new WebSocket(url);
    ws.onmessage = (e) => { if (ws === this.ws) { this.rx = Date.now(); this.onMsg(JSON.parse(e.data)); } };
    ws.onclose = (e) => { if (ws !== this.ws) return; this.hooks.closed && this.hooks.closed(e.code); if (!this.closedByUs && e.code !== 4001 && this.phase !== 'ended') setTimeout(() => { this.reconnects++; this.connect(); }, 300); };
    ws.onerror = () => {};
    this.rx = Date.now();
    clearInterval(this.dog);
    this.dog = setInterval(() => {                         // a dead link never closes by itself: notice the silence
      if (ws !== this.ws || this.closedByUs || this.phase === 'ended') { clearInterval(this.dog); return; }
      if (Date.now() - this.rx > (this.phase === 'battle' ? 5000 : 40000)) { clearInterval(this.dog); this.ws = null; try { ws.close(); } catch (e) {} this.reconnects++; this.connect(); }
    }, 1000);
  }
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  drop() { const w = this.ws; this.ws = null; try { w.close(); } catch (e) {} this.reconnects++; this.connect(); }   // network blip: reconnect with have=
  quit() { this.closedByUs = true; this.send({ t: 'bye' }); if (this.ws) this.ws.close(); this.phase = 'ended'; clearInterval(this.dog); }
  order(o) { if (this.phase === 'battle') this.send({ t: 'o', s: ++this.seq, o }); }
  resetBattle() { this.turns = new Map(); this.turn = 0; this.sub = 0; this.t = 0; this.recvUpto = -1; }

  onMsg(m) {
    switch (m.t) {
      case 'W': this.you = m.you; this.tok = m.tok; if (m.phase === 'lobby') this.phase = 'lobby'; this.hooks.joined && this.hooks.joined(m); break;
      case 'p': break;
      case 'E': this.phase = 'ended'; this.hooks.failed && this.hooks.failed(m.m); break;
      case 'L': this.phase = 'lobby'; this.hooks.lobby && this.hooks.lobby(m); break;
      case 'S':
        this.info = m; this.tpt = m.tpt; this.hashEvery = m.hashEvery; this.you = m.you;
        if (this.phase !== 'battle') { this.phase = 'battle'; this.resetBattle(); this.hooks.started(m); }
        break;
      case 'T':
        if (m.k === this.recvUpto + 1) { if (m.o) this.turns.set(m.k, m.o); this.recvUpto = m.k; }
        break;
      case 'C':
        if (this.t > 0 && (m.replay || m.from === 0)) { this.resetBattle(); this.hooks.started(this.info); }
        for (const [k, o] of m.o) if (k > this.recvUpto) this.turns.set(k, o);
        this.recvUpto = Math.max(this.recvUpto, m.to);
        break;
      case 'D': this.desyncs.push(m); this.hooks.desync && this.hooks.desync(m); break;
      case 'SR': this.snapReq = m.id; break;
      case 'SW': this.awaitSnap = true; this.snapParts = []; break;
      case 'SX': this.awaitSnap = false; break;
      case 'snap': {
        this.snapParts.length = m.n; this.snapParts[m.i] = m.d;
        for (let i = 0; i < m.n; i++) if (this.snapParts[i] == null) return;
        this.hooks.restore(Buffer.from(this.snapParts.join(''), 'base64'));
        this.turn = m.k + 1; this.sub = 0; this.t = this.turn * this.tpt; this.turns = new Map(); this.recvUpto = m.k;
        this.awaitSnap = false; this.snapParts = []; this.hooks.resynced && this.hooks.resynced(m.k);
        break;
      }
      case 'X': this.phase = 'ended'; this.hooks.ended && this.hooks.ended(m.m); break;
    }
    if (this.phase === 'battle' && !this.awaitSnap) this.run();
  }

  run() {
    while (this.turn <= this.recvUpto && this.phase === 'battle') {
      const orders = this.sub === 0 ? (this.turns.get(this.turn) || []).map(([s, q, o]) => ({ s, q, o })) : [];
      this.hooks.tick(this.t, orders);
      this.t++; this.sub++;
      if (this.sub >= this.tpt) {
        const k = this.turn; this.turns.delete(k); this.turn++; this.sub = 0;
        if (k % this.hashEvery === 0) {
          const h = this.hooks.hash(k);
          this.send({ t: 'H', k, h: String(h) });
        }
        if (this.snapReq >= 0) {
          const id = this.snapReq; this.snapReq = -1;
          const b64 = Buffer.from(this.hooks.snapshot()).toString('base64'), part = 512 * 1024, n = Math.max(1, Math.ceil(b64.length / part));
          for (let i = 0; i < n; i++) this.send({ t: 'snap', id, k, i, n, d: b64.slice(i * part, (i + 1) * part) });
        }
        this.hooks.turnDone && this.hooks.turnDone(k);
      }
    }
  }
}
