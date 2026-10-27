// The battle's control panel, as the server sees it. build-sim.mjs pastes this function's text INSIDE the bundled game
// code (src/01-data, 02-map, 03-sim, 07a-hostsnap, 07b-ckpt), so it can reach the game's own names (G, NET, MODE, ME,
// newGame, simUpdate, netTick, hostPres...). It must not use anything from this file's module scope.
// Each createBattleSim() call (gen/battle-sim.js) is a separate battle with its own G and NET.
export function BATTLE_DRIVER() {
  const B = {};
  B.pv = NET_PV;
  B.facs = FKEYS.slice();
  B.mapMax = k => (MAPS[k] || MAPS.strait).max;
  B.mapOk = k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(MAPS, k);
  B.mapName = k => (MAPS[k] || MAPS.strait).name;
  // the room the host netcode talks through: emit(topic, data) and buffered(to) (07a-hostsnap)
  B.room = r => { NET.game = r; NET.p2p = true; };
  // a player's presence / emits, before and during the battle (07a hostPres, hostCmd, hostGone, hostRejoin)
  B.pres = (peer, p, hello) => { if (p && typeof p === 'object') hostPres({ peer, by: null, presence: p }, hello); };
  B.cmd = (peer, d) => hostCmd(peer, d);
  B.gone = peer => hostGone(peer);
  B.rejoin = (peer, tok) => hostRejoin(peer, tok);
  B.hasTok = tok => !!(tok && NET.toks && NET.toks.indexOf(tok) >= 0);
  B.forget = peer => { for (const k of ['seen', 'lastHi', 'lastPg', 'lastKr', 'edOf']) if (NET[k]) delete NET[k][peer]; };
  // Start the battle as a host that has no side of its own (ME = -1): every slot is a player or a computer player.
  // Same steps as startMP('host', ...) in the page (08-ui), minus the drawing.
  // o = {seed, facs, map, tm, w, aiD: [null | difficulty per slot], peers: [player id | null], toks: [token | null], code}
  B.start = o => {
    Object.assign(NET, { lastSnapT: 0, sc: {}, kf: {}, kt: {}, cseq: {}, cseqSlot: [], ckAk: null, ckOut: null, sbSlot: null, iaDev: 0, tgC: null, tgS: null, ver: null, sk: null, gq: [], civQ: [], snapTo: [], ia: 0, rxW: 0, prevT: 0,
      snapT: 0, evT: 0, teamT: 0, bT: 0, verSt: 0, skP: 0, dhG: null, dh: null, dyC: null, trr: 0, ckT: null, ckBusy: false, ckId: 0 });
    MODE = 'host'; ME = -1;
    const isAI = i => Array.isArray(o.aiD) && o.aiD[i] != null;
    TERR_DEFER = true;
    try { newGame({ seed: o.seed, facs: o.facs, ai: o.facs.map((_, i) => isAI(i)), map: o.map, tm: o.tm }); } finally { TERR_DEFER = false; }
    G.teams.forEach((T, i) => { T.ai = isAI(i) ? mkAI(o.aiD[i]) : null; });
    G.headless = true;
    NET.peers = o.peers.slice(); NET.toks = o.toks.slice(); NET.gen = 0; NET.code = o.code || null; NET.baseCode = o.code || null;
    NET.startInfo = { seed: o.seed, facs: o.facs.slice(), map: o.map, tm: o.tm.slice(), w: o.w | 0, sv: 1 };
    return B.info();
  };
  // The checkpoint the host netcode just packed for its standby player (07b ckTick, every 8 s while a player is
  // connected), once per checkpoint: the server also keeps it, to pick the battle up again after a restart.
  // (it is noted before each send loop: a small one can go out whole, and be dropped from NET.ckOut, within one loop)
  const ckNote = () => { const O = NET.ckOut; if (O && O.id !== B.ckSeen) { B.ckSeen = O.id; B.ckPend = O.s; } };
  B.ckFresh = () => { ckNote(); const s = B.ckPend || null; B.ckPend = null; return s; };
  // Pick a battle up from a kept checkpoint (si: the start info). Like promoteToHost (07b) on a page, except that no
  // side is the host's: every human side waits up to 30 s for its player to reconnect, then the AI takes it over.
  B.restore = async (si, s) => {
    const ck = await ckUnpack(s);
    const st = ck.start || si, n = st.facs.length;
    B.start({ seed: st.seed, facs: st.facs, map: st.map, tm: st.tm, w: st.w, aiD: st.facs.map(() => null), peers: st.facs.map(() => null), toks: Array.isArray(ck.toks) ? ck.toks.slice(0, n) : st.facs.map(() => null), code: si.code });
    ckRestore(ck);
    NET.cseqSlot = Array.isArray(ck.cs) ? ck.cs.slice() : []; NET.gen = ck.gen || 0;
    for (const T of G.teams) if (!T.ai && !T.out) T.discT = G.t;
    return B.info();
  };
  B.step = dt => { if (G && !G.over) simUpdate(dt); };
  B.net = dt => { if (G) { ckNote(); netTick(dt); } };
  B.info = () => {
    if (!G) return null;
    const per = G.teams.map(T => ({ fac: T.fac, units: 0, blds: 0, credits: Math.round(T.credits), out: !!T.out, ai: !!T.ai }));
    for (const e of G.ents) { if (e.dead || !per[e.team]) continue; if (e.isB) per[e.team].blds++; else per[e.team].units++; }
    return { t: G.t, over: !!G.over, winner: G.winner, map: G.mapKey, ents: G.ents.length, per };
  };
  B.isUnit = ki => !!KINDS[ki] && !STRUCT[KINDS[ki]];   // a snapshot row's kind index: a unit, not a building
  B.teamOf = peer => (NET.peers ? NET.peers.indexOf(peer) : -1);
  // Bench: every side is played by the AI, and the host netcode sends to all of them as if they were connected players
  // (their AI is hidden from the netcode while it runs, as orch/headless.mjs --hostsnap does).
  B.benchStart = o => {
    const n = o.facs.length;
    const r = B.start({ seed: o.seed, facs: o.facs, map: o.map, tm: o.facs.map((_, i) => i), w: 0, aiD: o.facs.map(() => o.diff | 0), peers: o.facs.map((_, k) => 'p' + k), toks: o.facs.map((_, k) => 't' + k), code: 'bench' });
    B.bots = o.facs.map((_, k) => k).slice(0, n);
    return r;
  };
  B.benchNet = dt => {
    const ai = B.bots.map(k => G.teams[k].ai);
    for (const k of B.bots) G.teams[k].ai = null;
    try { netTick(dt); } finally { B.bots.forEach((k, j) => { G.teams[k].ai = ai[j]; }); }
  };
  B.ckBusy = () => !!NET.ckBusy;
  // Test views (reached only through the local test hooks, /battle-test/, which exist only with TEST_HOOKS=1 in
  // `wrangler dev`; never on Cloudflare): what slot k may see, as orch/mpsync.mjs compares a page with its host.
  B.test = {
    keyframe: k => { if (NET.kf) NET.kf[k] = 0; NET.snapT = 0; NET.teamT = 0; },
    team: k => { const T = G && G.teams[k]; return T ? { ai: !!T.ai, disc: T.discT || 0, out: !!T.out, credits: Math.floor(T.credits), fac: T.fac } : null; },
    view: k => { const out = []; for (const e of G.ents) { if (e.dead) continue; const own = e.team === k, vis = own || !!(e.vs && e.vs[k]);
        if (!vis && !(e.isB && ((e.sn | 0) & (1 << k)))) continue; out.push([e.id, e.kind, e.team, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.isB ? 1 : 0, vis ? 1 : 0]); }
      return { t: G.t, list: out, credits: Math.floor(G.teams[k].credits), all: G.ents.filter(e => !e.dead).length }; },
    pos: ids => ids.map(id => { const e = G.byId.get(id); return e ? [e.x, e.y] : null; }),
    base: k => { const b = G.ents.filter(e => e.team === k && e.isB && !e.dead); return b.length ? [b.reduce((s, e) => s + e.x, 0) / b.length, b.reduce((s, e) => s + e.y, 0) / b.length] : [MAPW / 2, MAPH / 2]; },
    ck: () => ({ sb: NET.sbSlot, id: NET.ckId || 0 }),
    peers: () => (NET.peers || []).slice(),
  };
  return B;
}
