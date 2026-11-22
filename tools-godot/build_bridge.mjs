// Builds godot/web/ww3sim.js: the browser game's simulation (src/01-03, the same file list the battle servers run,
// orch/headless.mjs SIM_FILES) + the deterministic driver of orch/headless.mjs + the bridge API (window.WW3) that
// godot/bridge/sim_bridge.gd reads. No Three.js, no DOM: the sim gets the same stand-ins as in Node.
//   node tools-godot/build_bridge.mjs            -> godot/web/ww3sim.js
// Contract: godot/bridge/README.md. Proof: node tools-godot/bridge_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simSource, extractFn, SIM_FILES } from '../orch/headless.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'godot/web/ww3sim.js');

// the driver (W.start / W.step / W.hash, seeded Math.random, frozen path clock, portable math), with two changes:
// seats can be human (ai flags) and the bridge gets the sim() wrapper so orders run under the battle's random numbers
let driver = extractFn(fs.readFileSync(path.join(ROOT, 'orch/headless.mjs'), 'utf8'), 'DRIVER');
const swap = (a, b) => { if (!driver.includes(a)) throw new Error('build_bridge: orch/headless.mjs DRIVER changed, missing: ' + a); driver = driver.replace(a, b); };
swap('ai: o.facs.map(() => true)', 'ai: o.ai || o.facs.map(() => true)');
swap(/\n  return W;\n\}\s*$/.exec(driver)[0], '\n  W.sim = sim;\n  return W;\n}');

// ---- the bridge: runs inside the sim's scope (sees G, act, KINDS, FACTIONS, groundH ...) -------------------------
function BRIDGE(W) {
  const ES = 18, PS = 8;
  const STATES = ['idle', 'move', 'fire', 'build', 'gather', 'dig', 'fly', 'park', 'rout', 'dead'];
  const F = { BUILDING: 1, BUILT: 2, SELECTABLE: 4, DEAD: 8, GARRISON: 16, ROUT: 32, DUG: 64, FIRED: 128, NOPOWER: 256, SELLING: 512, REPAIRING: 1024, SUPPLIED: 2048, ABANDONED: 4096, LANDED: 8192, WORKING: 16384, CAPTURABLE: 32768 };
  const kinds = KINDS.slice(), kIdx = new Map(kinds.map((k, i) => [k, i]));
  const kindOf = k => { let i = kIdx.get(k); if (i === undefined) { i = kinds.length; kinds.push(k); kIdx.set(k, i); } return i; };
  for (const k of ['derrick', 'pplant', 'garrison', 'civb']) kindOf(k);
  for (const k of Object.keys(TB)) kindOf('tb_' + k);
  const weapons = Object.keys(VS), wIdx = new Map(weapons.map((k, i) => [k, i]));
  const OIL_ID = 1000000;   // derricks / capturable buildings are not sim entities: they get ids OIL_ID + index
  let ent = new Float32Array(ES * 1024), proj = new Float32Array(PS * 256), n = 0, m = 0;
  let EV = [], Q = [], seen = new Map(), stepT = 0, fogs = [], lastStepMs = 0;
  // every effect / sound the sim triggers (FXE in src/03-sim.js calls fxPlay when it exists)
  W.fx = (type, args) => { EV.push([type, ...args]); };
  const teamBit = e => { let v = 0; const N = G.teams.length; for (let t = 0; t < N; t++) if (e.team === t || (e.vs && e.vs[t]) || (e.team >= 0 && ally(e.team, t))) v |= 1 << t; return v; };
  const fill = () => {
    const E = G.ents, need = (E.length + G.oil.length) * ES; if (ent.length < need) ent = new Float32Array(need * 2);
    const a = ent, t = G.t; let j = 0; const now = new Map();
    for (let i = 0; i < E.length; i++) {
      const e = E[i]; if (e.dead || e.inTun) continue; const s = e.s || {}, o = j * ES, air = !e.isB && s.dom === 'air';
      let f = 0, st = 0;
      if (e.isB) {
        f |= F.BUILDING; if (e.built >= 1) f |= F.BUILT; if (e.team >= 0 && e.kind !== 'garrison') f |= F.SELECTABLE; else if (e.kind === 'garrison') f |= F.SELECTABLE;
        if (e.dis > t) f |= F.NOPOWER; if (e.sell) f |= F.SELLING; if (e.rep) f |= F.REPAIRING;
        if ((e.kind === 'garrison' && e.civ && e.civ.occ.length) || (e.gar && e.gar.length) || (e.kind === 'tunnel' && G.teams[e.team] && G.teams[e.team].tun && G.teams[e.team].tun.length)) f |= F.GARRISON;
        if (e.kind === 'garrison' && e.civ && e.civ.dug) f |= F.DUG;
        if (t - (e.lastFire ?? -9) < stepT + .02) { f |= F.FIRED; st = 2; }
        const was = seen.get(e.id); if (was !== undefined && was < 1 && e.built >= 1) EV.push(['built', e.team, e.id, kindOf(e.kind)]);
        now.set(e.id, e.built);
      } else {
        f |= F.SELECTABLE; if (e.rout > t) f |= F.ROUT; if (e.sup) f |= F.SUPPLIED; if (e.aband) f |= F.ABANDONED; if (e.landed) f |= F.LANDED;
        if (e.building || (e.kind === 'harv' && e.state === 'gather')) f |= F.WORKING; if (e.cargo && e.cargo.length) f |= F.GARRISON;
        const fired = t - (e.lastFire ?? -9) < stepT + .02 && !e.building; if (fired) f |= F.FIRED;
        const moving = t - (e.mv ?? -9) < stepT + .1;
        st = e.rout > t ? 8 : e.building ? 3 : (e.kind === 'harv' && e.state === 'gather') ? 4 : air ? (e.landed ? 7 : 6) : fired ? 2 : moving ? 1 : (e.order && e.order.type === 'garrison') ? 5 : 0;
        if (!seen.has(e.id) && t > 1) EV.push(['ready', e.team, e.id, kindOf(e.kind)]);
        now.set(e.id, 1);
      }
      a[o] = e.id; a[o + 1] = kindOf(e.kind); a[o + 2] = e.team == null ? -1 : e.team; a[o + 3] = e.x; a[o + 4] = e.y;
      a[o + 5] = groundH(e.x, e.y) + (air && !e.landed ? (s.alt === 'high' ? 110 : 55) : 0);
      a[o + 6] = e.isB ? (e.ang || 0) : (e.va ?? e.ang ?? 0); a[o + 7] = e.tang ?? e.ang ?? 0; a[o + 8] = e.max > 0 ? Math.max(0, e.hp / e.max) : 1; a[o + 9] = f;
      a[o + 10] = e.am === undefined || !(e.amx > 0) ? -1 : e.am / e.amx; a[o + 11] = e.rank | 0; a[o + 12] = st;
      a[o + 13] = e.isB ? e.built : (s.spd > 0 ? Math.min(1, (e.v || 0) / s.spd) : 0); a[o + 14] = teamBit(e); a[o + 15] = e.isB ? e.size : (e.r || s.r || 8); a[o + 16] = e.target && !e.target.dead && e.target.id ? e.target.id : (e.order && e.order.target && e.order.target.id) || 0; a[o + 17] = e.max || 0;
      j++;
    }
    for (let i = 0; i < G.oil.length; i++) {
      const q = G.oil[i], o = j * ES; let f = F.BUILDING | F.CAPTURABLE; if (!q.dead) f |= F.BUILT;
      a[o] = OIL_ID + i; a[o + 1] = kindOf(q.tb ? 'tb_' + q.tb : q.pw ? 'pplant' : 'derrick'); a[o + 2] = q.owner; a[o + 3] = q.x; a[o + 4] = q.y; a[o + 5] = groundH(q.x, q.y);
      a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = q.max > 0 ? Math.max(0, q.hp / q.max) : 1; a[o + 9] = f; a[o + 10] = -1; a[o + 11] = 0; a[o + 12] = q.dead ? 9 : 0; a[o + 13] = q.dead ? 0 : 1;
      a[o + 14] = (1 << G.teams.length) - 1; a[o + 15] = 36; a[o + 16] = 0; a[o + 17] = q.max || 0; j++;
    }
    n = j; seen = now;
    const P = G.proj; if (proj.length < P.length * PS) proj = new Float32Array(P.length * PS * 2);
    for (let i = 0; i < P.length; i++) {
      const p = P[i], o = i * PS, d0 = Math.hypot((p.tx - (p.sx ?? p.x)), (p.ty - (p.sy ?? p.y))) || 1, d1 = Math.hypot(p.tx - p.x, p.ty - p.y);
      proj[o] = p.x; proj[o + 1] = p.y; proj[o + 2] = p.z ?? p.h ?? 0; proj[o + 3] = p.tx; proj[o + 4] = p.ty; proj[o + 5] = wIdx.get(p.wpn) ?? -1; proj[o + 6] = p.team ?? -1; proj[o + 7] = Math.max(0, Math.min(1, 1 - d1 / d0));
    }
    m = P.length;
  };
  const teamRows = () => G.teams.filter(T => !T.reb).map((T, i) => {
    let pw = { make: 0, use: 0 }, pop = 0, units = 0, blds = 0; try { pw = pwrOf(i); pop = popUsed(i, true); } catch (_) {}
    for (const e of G.ents) if (!e.dead && e.team === i) { if (e.isB) blds++; else units++; }
    const powers = []; try { for (const k in (T.pw || {})) { const p = T.pw[k]; powers.push({ k, name: powInfo(k, T.fac).name, lv: p.lv || 1, ready: !(p.cd > 0), left: Math.max(0, Math.round(p.cd || 0)) }); } } catch (_) {}
    let research = null; try { for (const c in (T.rq || {})) if (T.rq[c]) research = { key: T.rq[c].key, left: Math.round(T.rq[c].t) }; } catch (_) {}
    let cap = 0; try { cap = popCap(); } catch (_) {} if (!isFinite(cap)) cap = 0;
    return { nation: T.fac, name: (FACTIONS[T.fac] || {}).name || T.fac, color: T.color, team: T.tm, ai: !!T.ai, out: !!T.out, credits: Math.round(T.credits), power_make: pw.make, power_use: pw.use, pop, cap,
      rank: T.rank | 0, spent: T.spent | 0, gxp: Math.round(T.gxp || 0), upg: Object.keys(T.upg || {}), research, charge: Math.round(T.charge || 0), charge_max: (T.sup && T.sup.charge) || 0, powers, leader: T.ld ? { on: 1 } : null,
      units, blds, kills: T.kills | 0, lost: T.lost | 0, tun: (T.tun || []).length };
  });
  const prodRows = () => { const o = []; for (const e of G.ents) { if (!e.isB || e.dead || !((e.q && e.q.length) || e.rally)) continue; const T = G.teams[e.team];
      o.push([e.id, (e.q || []).map(it => { let tot = 0; try { tot = prodTime(T, stats(T.fac, it.kind)); } catch (_) {} return [it.kind, +(+it.t || 0).toFixed(2), +tot.toFixed(2)]; }), e.rally ? Math.round(e.rally.x) : -1, e.rally ? Math.round(e.rally.y) : -1]); } return o; };
  const api = {
    ES, PS, OIL_ID, version: 1,
    tables: () => JSON.stringify({ kinds, states: STATES, weapons, flags: F, E_STRIDE: ES, PROJ_STRIDE: PS, OIL_ID,
      events: ['txt', 'boom', 'ping', 'tping', 'heal', 'halo', 'die', 'strike', 'smoke', 'gone', 'flag', 'shout', 'plane', 'dam', 'bmis', 'vig', 'tr', 'toss', 'say', 'salvo', 'rubc', 'rank', 'pj', 'muz', 'mping', 'mmst', 'mdraw', 'log', 'icpt', 'hl', 'hack', 'give', 'flare', 'emp', 'elim', 'cyb', 'civs', 'civd', 'chf', 'cfs', 'cfo', 'cfb', 'bfx', 'bfh', 'ready', 'built', 'end'],
      nations: FKEYS.map(k => ({ key: k, name: FACTIONS[k].name, color: FACTIONS[k].color || FACTIONS[k].col || '', style: FACTIONS[k].morale || '' })),
      maps: Object.keys(MAPS).filter(k => !MAPS[k].hidden && !MAPS[k].custom).map(k => ({ key: k, name: MAPS[k].name, min: MAPS[k].min || 2, max: MAPS[k].max || 2, battle: BM_KEYS.includes(k) ? 1 : 0 })) }),   // battle 1 = a Battle map (src/02d-battlemaps.js BATTLE_MAPS) for min..max players; the sim swaps any other key / player count for a fair Battle map
    // o = {map, seed, diff, players:[{nation, ai, team}]}
    newGame: js => {
      const o = typeof js === 'string' ? JSON.parse(js) : js, P = o.players || [];
      if (o.map && !MAPS[o.map]) return JSON.stringify({ ok: 0, error: 'Unknown map "' + o.map + '": the simulation has no map with that key.' });   // never a silent fallback
      EV = []; Q = []; seen = new Map(); fogs = [];
      const r = W.start({ seed: (o.seed | 0) || 1, facs: P.map(p => p.nation), ai: P.map(p => p.ai !== false), tm: P.map((p, i) => p.team == null ? i : p.team), map: o.map || 'bm_splitridge', battle: 1, diff: o.diff == null ? 1 : o.diff,
        portMath: o.nativeMath ? [] : ['sin', 'cos', 'atan2', 'exp', 'pow'] });
      stepT = 0; fill(); EV = [];
      return JSON.stringify({ ok: 1, ms: Math.round(r.ms), map: { key: G.mapKey, name: (MAPS[G.mapKey] || {}).name, MAPW, MAPH, CELL, GW, GH }, teams: teamRows() });
    },
    order: (team, js) => { Q.push([team | 0, typeof js === 'string' ? JSON.parse(js) : js]); },
    // k fixed ticks of 1/60 s; queued orders are applied first. Returns the per-step JSON (events + teams + clock).
    step: k => {
      if (typeof G === 'undefined' || !G) return '{}';
      const t0 = W.realNow(), was = !!G.over;
      if (Q.length) { const q = Q; Q = []; W.sim(() => { for (const [tm, a] of q) { try { act(tm, a); } catch (e) { EV.push(['log', tm, 'order failed: ' + e.message, 'w']); } } }); }
      const r = W.step((k | 0 || 1) / 60); stepT = r.steps / 60; fill();
      if (!was && G.over) EV.push(['end', G.winner == null ? -1 : G.winner, G.endWhy || '']);
      lastStepMs = W.realNow() - t0; const ev = EV; EV = [];
      return JSON.stringify({ t: G.t, over: !!G.over, winner: G.winner == null ? -1 : G.winner, n, m, ms: +lastStepMs.toFixed(2), lgv: (G.lgv | 0) + (G.dugV | 0), ev, teams: teamRows(), prod: prodRows() });
    },
    // exact-size copies (Godot's js_buffer_to_packed_byte_array takes the whole underlying buffer)
    entBuf: () => new Uint8Array(ent.buffer.slice(0, n * ES * 4)),
    projBuf: () => new Uint8Array(proj.buffer.slice(0, m * PS * 4)),
    hash: () => W.hash(),
    lgv: () => (typeof G !== 'undefined' && G ? (G.lgv | 0) + (G.dugV | 0) : 0),
    info: () => JSON.stringify(W.info()),
    mapMeta: () => {
      const rm = G.roadMask, h = G.hgrid, B = (G.map && G.map.bridges) || [];
      return JSON.stringify({ key: G.mapKey, name: (MAPS[G.mapKey] || {}).name, theme: (G.map && G.map.theme) || 'green', MAPW, MAPH, CELL, GW, GH, bases: BASES.slice(0, Math.max(G.teams.length, 2)).map(b => [b[0], b[1]]),
        hgrid: h ? { R: h.R, w: h.w, h: h.h } : null, road: rm ? { C: rm.C || 16, w: rm.w, h: rm.h } : null,
        fields: G.fields.map(f => ({ x: f.x, y: f.y, r: f.r, amt: f.amt })), oil: G.oil.map(o => ({ x: o.x, y: o.y, tb: o.tb || null, pw: o.pw || 0 })),
        civ: (G.civ || []).filter(c => !c.dug).map(c => ({ i: c.i, x: Math.round(c.x), y: Math.round(c.y), h: +(c.h || 0).toFixed(1), rot: +(c.rot || 0).toFixed(2), ruin: c.ruin ? 1 : 0 })),
        trees: (G.treePos || []).map(t => [Math.round(t[0]), Math.round(t[1]), +(t[2] || 1).toFixed(2)]),
        bridges: B.map(b => ({ x: b.x, y: b.y, h: b.h, n: b.n, t: b.t })) });
    },
    // name: grid | cover | wood | hgrid (Float32) | road
    mapBuf: name => {
      const u8 = a => a ? new Uint8Array(a.buffer ? a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength) : Uint8Array.from(a).buffer) : new Uint8Array(0);
      if (name === 'grid') return u8(Uint8Array.from(G.grid)); if (name === 'cover') return u8(Uint8Array.from(G.cover || [])); if (name === 'wood') return u8(Uint8Array.from(G.wood || []));
      if (name === 'hgrid') return G.hgrid ? u8(Float32Array.from(G.hgrid.a)) : new Uint8Array(0);
      if (name === 'road') return G.roadMask ? u8(Uint8Array.from(G.roadMask.d || G.roadMask.a || [], v => v ? 1 : 0)) : new Uint8Array(0);
      return new Uint8Array(0);
    },
    lines: () => {
      const L = G.lg, D = G.lgd; if (!L || !D) return '{}'; const r1 = v => Math.round(v);
      return JSON.stringify({ roads: L.E.map(e => e.pts.map(p => [r1(p[0]), r1(p[1])])), len: L.E.map(e => r1(e.len)),
        cov: (L.cov || []).map(C => { if (!C) return null; const o = {}; for (const i in C) o[i] = { v: C[i].v.map(q => [r1(q[0]), r1(q[1])]), d: C[i].d.map(q => [r1(q[0]), r1(q[1])]) }; return o; }),
        bead: (L.bead || []).map(b => b ? b.map(p => [r1(p.x), r1(p.y), p.r]) : null),
        craters: Object.keys(D.cr).map(k => ({ e: +k, x: D.cr[k].x, y: D.cr[k].y, left: r1(D.cr[k].t - G.t) })),
        bridges_dead: ((G.map && G.map.bridges) || []).map((b, i) => b.dead ? i : -1).filter(i => i >= 0),
        ck: (D.ck || []).map(q => ({ team: q.team, x: q.x, y: q.y })), mines: (D.mn || []).map(q => ({ team: q.team, x: q.x, y: q.y })), rc: D.rc || {},
        dug: (G.dug || []).map(d => ({ x: d.x, y: d.y, a: d.a, k: d.k, team: d.team })) });
    },
    // GW x GH bytes: 0 never seen, 1 seen before, 2 visible now (the team and its allies)
    fog: team => {
      const N = GW * GH; let g = fogs[team]; if (!g) g = fogs[team] = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (g[i] === 2) g[i] = 1;
      for (const e of G.ents) { if (e.dead || e.team == null || e.team < 0 || !ally(e.team, team)) continue;
        const R = e._vr || 280, c0 = Math.max(0, Math.floor((e.x - R) / CELL)), c1 = Math.min(GW - 1, Math.floor((e.x + R) / CELL)), r0 = Math.max(0, Math.floor((e.y - R) / CELL)), r1 = Math.min(GH - 1, Math.floor((e.y + R) / CELL)), R2 = R * R;
        for (let cy = r0; cy <= r1; cy++) { const dy = cy * CELL + CELL / 2 - e.y; for (let cx = c0; cx <= c1; cx++) { const dx = cx * CELL + CELL / 2 - e.x; if (dx * dx + dy * dy <= R2) g[cy * GW + cx] = 2; } } }
      return g.slice();
    },
    validSpot: (team, kind, x, y) => { try { return validSpot(team, kind, x, y) ? 1 : 0; } catch (_) { return 0; } },
    reqMet: (team, kind) => { try { return reqMet(team, kind) ? 1 : 0; } catch (_) { return 0; } },
    inside: id => {
      const b = G.byId.get(id); if (!b) return '[]'; let L = [];
      if (b.kind === 'garrison' && b.civ) L = b.civ.occ; else if (b.gar) L = b.gar; else if (b.kind === 'tunnel') L = G.teams[b.team].tun || []; else if (b.cargo) L = b.cargo;
      return JSON.stringify(L.map(u => ({ id: u.id, kind: kindOf(u.kind), hp: u.max > 0 ? +(u.hp / u.max).toFixed(2) : 1 })));
    },
    rules: fac => {
      const Fc = FACTIONS[fac]; if (!Fc) return '{}'; const units = {}, blds = {}, upg = {}, powers = [];
      const cats = {}; try { for (const c of CATS) for (const k of (typeof rosterOf === 'function' ? rosterOf(fac, c) : [])) cats[k] = c; } catch (_) {}
      for (const k of Object.keys(BASE)) { try { const s = stats(fac, k); if (!s || s.hide) continue; units[k] = { ...JSON.parse(JSON.stringify(s)), name: s.name, cost: s.cost, time: s.time, cat: cats[k] || s.from || s.cat || '', req: s.req || null, pop: typeof popOf === 'function' ? popOf(s) : 1, hp: s.hp, rng: s.rng || 0, cls: s.cls || '', dom: s.dom || 'ground' }; } catch (_) {} }
      for (const k of Object.keys(STRUCT)) { try { const s = bstats(fac, k); if (!s) continue; blds[k] = { ...JSON.parse(JSON.stringify(s)), name: s.name, cost: s.cost, time: s.time, req: s.req || null, size: s.size, hp: s.hp }; } catch (_) {} }
      try { const U = typeof upgList === 'function' ? upgList(fac) : (Fc.upgList || []); for (const u of U) { const k = u.key || u.k || u; const d = typeof u === 'object' ? u : (typeof UPG !== 'undefined' && UPG[k]) || {}; upg[k] = { name: d.name || k, cost: d.cost || 0, time: d.time || 0, req: d.req || null, desc: d.desc || '' }; } } catch (_) {}
      try { for (const k of Object.keys(POWERS)) { if (typeof sigBan === 'function' && sigBan(fac, k)) continue; const p = powInfo(k, fac); powers.push({ k, name: p.name, desc: p.desc || '' }); } } catch (_) {}
      return JSON.stringify({ units, blds, upg, powers, build_order: typeof BUILD_ORDER !== 'undefined' ? BUILD_ORDER : Object.keys(blds), roster: Fc.roster || null, special: Fc.special || null, name: Fc.name, style: Fc.morale || '' });
    },
    // debug / tests only: evaluate inside the sim's scope
    ev: src => W.ev(src),
  };
  return api;
}

const body = simSource() +
  '\n/* ===== bridge: effects go to the event list ===== */\nlet __WW3FX=null;function fxPlay(type,args){if(__WW3FX)__WW3FX(type,args);}\n' +
  `\n/* ===== driver (orch/headless.mjs) ===== */\nconst __W=(${driver})();\n` +
  `\n/* ===== bridge API (tools-godot/build_bridge.mjs) ===== */\nconst __API=(${BRIDGE.toString()})(__W);__WW3FX=__W.fx;\nreturn __API;\n`;
const out = `// GENERATED by tools-godot/build_bridge.mjs from src/ (${SIM_FILES.length} sim modules) - do not edit. Contract: godot/bridge/README.md
(function(root){
  var noop=function(){};
  var ctx2d=new Proxy({},{get:function(t,k){return k in t?t[k]:noop;},set:function(){return true;}});
  var canvas=function(){return{width:0,height:0,style:{},getContext:function(){return ctx2d;}};};
  var store=new Map();
  var rp=(typeof performance!=='undefined'?performance:{now:function(){return Date.now();}});
  var perf=Object.create({now:function(){return rp.now();}});
  var env={document:{createElement:canvas,getElementById:function(){return null;},hidden:true,addEventListener:noop},
    localStorage:{getItem:function(k){return store.has(k)?store.get(k):null;},setItem:function(k,v){store.set(k,String(v));},removeItem:function(k){store.delete(k);}},
    matchMedia:function(){return{matches:false,addEventListener:noop};},navigator:{userAgent:'ww3-bridge',hardwareConcurrency:4},performance:perf};
  env.window=env.self=env;
  root.WW3=(function(window,self,document,localStorage,matchMedia,navigator,performance){
${body}
  })(env.window,env.self,env.document,env.localStorage,env.matchMedia,env.navigator,env.performance);
})(typeof globalThis!=='undefined'?globalThis:this);
/* ===== Web Worker mode: new Worker('ww3sim.js') - the sim runs off the page's main thread (godot/web/ww3bridge.js is the client) ===== */
if(typeof WorkerGlobalScope!=='undefined'&&typeof self!=='undefined'&&self instanceof WorkerGlobalScope){(function(){
  var W=self.WW3,lgv=-1;
  var boot={c:'boot',tables:W.tables(),rules:{}};JSON.parse(boot.tables).nations.forEach(function(n){try{boot.rules[n.key]=W.rules(n.key);}catch(e){boot.rules[n.key]='{}';}});
  self.postMessage(boot);
  self.onmessage=function(e){var m=e.data;
    if(m.c==='new'){lgv=-1;var r=W.newGame(m.o),b={},tr=[];if(JSON.parse(r).ok!==1){self.postMessage({c:'new',r:r,meta:'{}',bufs:{},ent:new ArrayBuffer(0),lines:'{}',hash:''});return;}['grid','cover','wood','hgrid','road'].forEach(function(k){b[k]=W.mapBuf(k).buffer;tr.push(b[k]);});
      var ent=W.entBuf().buffer;tr.push(ent);self.postMessage({c:'new',r:r,meta:W.mapMeta(),bufs:b,ent:ent,lines:W.lines(),hash:W.hash()},tr);lgv=W.lgv();}
    else if(m.c==='step'){var t0=performance.now();for(var i=0;i<m.orders.length;i++)W.order(m.orders[i][0],m.orders[i][1]);
      var js=W.step(m.k),ent2=W.entBuf().buffer,pj=W.projBuf().buffer,o={c:'step',js:js,ent:ent2,proj:pj},tr2=[ent2,pj];
      var v=W.lgv();if(v!==lgv){lgv=v;o.lines=W.lines();}
      if(m.fog>=0){o.fog=W.fog(m.fog).buffer;tr2.push(o.fog);}if(m.hash)o.hash=W.hash();o.wms=performance.now()-t0;self.postMessage(o,tr2);}
    else if(m.c==='ask'){var a=m.a,val=m.q==='valid'?W.validSpot(a[0],a[1],a[2],a[3]):m.q==='req'?W.reqMet(a[0],a[1]):m.q==='inside'?W.inside(a[0]):m.q==='ev'?JSON.stringify(W.ev(a[0])):null;self.postMessage({c:'ans',key:m.key,v:val});}
  };
})();}
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`wrote ${path.relative(ROOT, OUT)}: ${(out.length / 1024).toFixed(0)} KB from ${SIM_FILES.length} sim modules`);
