// Getting in and out with no button (CLAUDE.md "Getting in and out needs no button"), shared by orch/controls.mjs
// (mouse) and orch/touch.mjs (touch). Runs inside an already started single-player battle and checks:
//   enter  - infantry selected + right-click / tap your transport = board order
//   unload - transport selected + right-click / tap the transport itself = unload; several transports: all unload
//   drive  - Alt+right-click a spot (mouse) = drive there, then unload (and the battle does unload on arrival)
//   building - held building selected + right-click / tap the ground = everyone comes out and runs there;
//              an enemy = the garrison fires at it and stays inside
//   tunnel - tunnel selected + right-click / tap the ground = units come out and run there
// ck(name, ok, detail) reports one check; mode 'mouse' | 'touch'; tap(x, y) does one finger tap (touch mode).
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function enterExitChecks(page, { mode, ck, tap }) {
  const P = s => `${mode}: ${s}`;
  const S = await page.evaluate(() => {
    window.__eeOld = { paused: G.paused, mRC: SET.mRC };
    G.paused = true; SET.mRC = 'order'; // right-click gives orders while this runs (the scheme itself is tested elsewhere)
    const T = G.teams[ME], R = roster(T.fac), inf = R.barracks.find(k => { try { return canGarrison({ s: stats(T.fac, k), kind: k }); } catch (e) { return false; } }) || R.barracks[0];
    const hq = G.ents.find(b => b.team === ME && b.kind === 'hq');
    // open passable ground near the base, away from everything else
    const clear = (x, y) => passXY('ground', x, y) && !G.ents.some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < (e.isB ? e.size / 2 + 40 : 30));
    let C = null;
    for (let r = 260; r < 900 && !C; r += 40) for (let a = 0; a < 6.28 && !C; a += .3) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r;
      let ok = x > 200 && y > 200 && x < MAPW - 200 && y < MAPH - 200; for (let dx = -160; dx <= 160 && ok; dx += 40) for (let dy = -140; dy <= 140 && ok; dy += 35) if (!clear(x + dx, y + dy)) ok = false; if (ok) C = { x, y }; }
    if (!C) C = { x: hq.x + 300, y: hq.y };
    const tr = addUnit(ME, 'airlift', C.x - 55, C.y), tr2 = addUnit(ME, 'airlift', C.x + 55, C.y);
    const i1 = addUnit(ME, inf, C.x - 25, C.y + 55), i2 = addUnit(ME, inf, C.x + 25, C.y + 55);
    const tun = addBld(ME, 'tunnel', C.x, C.y - 95, true);
    const en = G.teams.find(Q => Q.id !== ME), e = addUnit(en.id, roster(en.fac).barracks[0], C.x + 60, C.y + 100);
    for (const u of [tr, tr2, i1, i2, e]) { u.max = u.hp = 1e7; u.vis = true; u.hid = false; }
    window.__EE = { C, tr: tr.id, tr2: tr2.id, i1: i1.id, i2: i2.id, tun: tun.id, e: e.id };
    if (window.__acts) window.__acts.length = 0;
    return window.__EE;
  });
  const acts = () => page.evaluate(() => { const a = (window.__acts || []).slice(); if (window.__acts) window.__acts.length = 0; return a; });
  const setSel = ids => page.evaluate(ids => { G.sel = ids.map(i => G.byId.get(i)).filter(Boolean); G.amove = G.defm = false; G.place = G.aim = null; if (typeof TC !== 'undefined') TC.lastTap = null; if (window.__acts) window.__acts.length = 0; updateUI(); }, ids);
  // screen points: entities and a free ground spot (nothing pickable there, the battlefield canvas on top)
  const view = () => page.evaluate(async () => {
    const E = window.__EE, C = E.C; camTarget(); cam.td = cam.dist = 460; centerOn(C.x, C.y - 10, true); renderFrame(0.016);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); renderFrame(0.016);
    const R = cv.getBoundingClientRect();
    const sc = id => { const e = G.byId.get(id); if (!e) return null; const p = toScreen(e.x, unitH(e) + entHeightMid(e) * .6, e.y); return { x: R.left + p.x, y: R.top + p.y, ok: document.elementFromPoint(R.left + p.x, R.top + p.y) === cv && pickAt(p.x, p.y, false) === e }; };
    let g = null;
    for (const [dx, dy] of [[-110, 40], [-120, -40], [100, -50], [-80, 110], [130, -10], [-140, 0], [0, 140]]) { const wx = C.x + dx, wy = C.y + dy, p = toScreen(wx, groundH(wx, wy), wy);
      const x = R.left + p.x, y = R.top + p.y; if (document.elementFromPoint(x, y) === cv && !pickAt(p.x, p.y, false) && passXY('ground', wx, wy)) { g = { x, y, wx, wy }; break; } }
    return { tr: sc(E.tr), tr2: sc(E.tr2), e: sc(E.e), tun: sc(E.tun), g };
  });
  const click = async (p, alt) => {
    if (mode === 'touch') { await tap(p.x, p.y); }
    else { await page.mouse.move(p.x, p.y); if (alt) await page.keyboard.down('Alt'); await page.mouse.click(p.x, p.y, { button: 'right' }); if (alt) await page.keyboard.up('Alt'); }
    await sleep(60);
  };
  const load = (ids, tid) => page.evaluate(([ids, tid]) => { const tr = G.byId.get(tid); for (const i of ids) { const u = G.byId.get(i) || G.ents.find(v => v.id === i); if (u && !u.inTun) boardTransport(u, tr); } return (tr.cargo || []).length; }, [ids, tid]);
  const cargo = tid => page.evaluate(tid => (G.byId.get(tid).cargo || []).length, tid);

  let V = await view();
  ck(P('enter/exit test units are on screen'), V.tr && V.tr.ok && V.tr2 && V.tr2.ok && V.g && V.e && V.e.ok, JSON.stringify(V));
  if (!(V.tr && V.tr.ok && V.g)) return;

  // 1. enter a transport
  await setSel([S.i1, S.i2]);
  await click(V.tr);
  let a = await acts();
  ck(P('infantry selected + right-click/tap own transport = they board it'), a.some(x => x.t === 'board' && x.tid === S.tr && x.ids.length === 2), JSON.stringify(a));
  if (mode === 'mouse') {
    await page.mouse.move(V.tr.x + 1, V.tr.y); const cur = await page.evaluate(() => { cursorTick(true); return cv.dataset.cur; });
    ck(P('the cursor shows "enter" over the transport'), cur === 'enter', cur);
  }

  // 2. unload by clicking the transport itself
  ck(P('test transport loaded'), await load([S.i1, S.i2], S.tr) === 2);
  await setSel([S.tr]);
  if (mode === 'mouse') {
    await page.mouse.move(V.tr.x, V.tr.y + 1); const cur = await page.evaluate(() => { cursorTick(true); return cv.dataset.cur; });
    ck(P('the cursor shows "get out" over the selected loaded transport'), cur === 'exit', cur);
  }
  await click(V.tr);
  a = await acts();
  ck(P('transport selected + right-click/tap it again = unload there'), a.some(x => x.t === 'unl' && x.tid === S.tr && !x.at), JSON.stringify(a));
  ck(P('…and the troops are out'), await cargo(S.tr) === 0);

  // 3. drive there, then unload (mouse: Alt+right-click a spot)
  await load([S.i1, S.i2], S.tr); V = await view();
  if (mode === 'mouse') {
    await setSel([S.tr]);
    await click(V.g, true);
    a = await acts();
    ck(P('Alt+right-click a spot = drive there, then unload'), a.some(x => x.t === 'unl' && x.tid === S.tr && x.at === 1 && Math.abs(x.x - V.g.wx) < 40), JSON.stringify(a));
    await setSel([S.tr]);
    await click(V.g, false);
    a = await acts();
    ck(P('plain right-click ground with a transport just moves it'), a.some(x => x.t === 'go') && !a.some(x => x.t === 'unl'), JSON.stringify(a));
  }
  const drive = await page.evaluate(([tid, x, y]) => { const tr = G.byId.get(tid); act(ME, { t: 'unl', tid, at: 1, x, y }); const r = { ul: !!(tr.order && tr.order.ul), n0: tr.cargo.length };
    const ox = tr.x, oy = tr.y; tr.x = tr.order.x; tr.y = tr.order.y; tr.order = null; updUnit(tr, 0.05); r.n1 = tr.cargo.length; tr.x = ox; tr.y = oy; tr.order = null; return r; }, [S.tr, V.g.wx, V.g.wy]);
  ck(P('battle: the transport drives off still loaded, then unloads where it stops'), drive.ul && drive.n0 === 2 && drive.n1 === 0, JSON.stringify(drive));

  // 4. several transports at once
  await load([S.i1], S.tr); await load([S.i2], S.tr2); V = await view();
  await setSel([S.tr, S.tr2]);
  await click(V.tr);
  a = await acts();
  ck(P('two transports selected + right-click/tap one = both unload'), a.filter(x => x.t === 'unl').length === 2, JSON.stringify(a));
  ck(P('…both empty'), await cargo(S.tr) === 0 && await cargo(S.tr2) === 0);
  // whatever happened above, the infantry are back on the ground for the next checks
  await page.evaluate(() => { for (const id of [window.__EE.tr, window.__EE.tr2]) unloadTransport(G.byId.get(id)); });

  // 5. a held city building
  const gar = await page.evaluate(([i1, i2]) => { const C = window.__EE.C; let best = null, bd = 1e9; for (const c of G.civ || []) { if (c.dead || c.g || c.cap < 2) continue; const d = Math.hypot(c.x - C.x, c.y - C.y); if (d < bd) { bd = d; best = c; } }
    if (!best) return null; enterGarrison(G.byId.get(i1), best); enterGarrison(G.byId.get(i2), best); window.__EE.ci = best.i; return best.g ? best.g.id : null; }, [S.i1, S.i2]);
  if (!gar) ck(P('held building (skipped: no city building on this map)'), true);
  else {
    V = await view();
    await setSel([gar]);
    await click(V.e);
    a = await acts();
    const still = await page.evaluate(gid => { const g = G.byId.get(gid); return !!g && !g.dead && g.civ.occ.length; }, gar);
    ck(P('held building selected + right-click/tap an enemy = garrison fires at it, nobody leaves'), a.some(x => x.t === 'atk' && x.tid === S.e && x.ids.includes(gar)) && !a.some(x => x.t === 'ungar') && still === 2, JSON.stringify({ a, still }));
    const ft = await page.evaluate(([gid, eid]) => G.byId.get(gid).civ.occ.every(u => u.target && u.target.id === eid), [gar, S.e]);
    ck(P('…every soldier inside targets that enemy'), ft);
    await setSel([gar]);
    await click(V.g);
    a = await acts();
    ck(P('held building selected + right-click/tap the ground = everyone comes out'), a.some(x => x.t === 'ungar' && x.tid === gar && x.at === 1), JSON.stringify(a));
    const out = await page.evaluate(([i1, i2, x, y]) => [i1, i2].map(i => G.byId.get(i)).every(u => u && !u.inTun && u.order && u.order.type === 'move' && Math.hypot(u.order.x - x, u.order.y - y) < 80), [S.i1, S.i2, V.g.wx, V.g.wy]);
    ck(P('…and they run to the spot clicked'), out);
  }

  // 6. tunnel network
  const inT = await page.evaluate(([i1, i2]) => { for (const i of [i1, i2]) { const u = G.byId.get(i); if (u && !u.inTun) enterTunnel(u); } return G.teams[ME].tun.length; }, [S.i1, S.i2]);
  V = await view();
  await setSel([S.tun]);
  if (mode === 'mouse') { await page.mouse.move(V.g.x, V.g.y); const cur = await page.evaluate(() => { cursorTick(true); return cv.dataset.cur; }); ck(P('the cursor shows "get out" over the ground with the tunnel selected'), cur === 'exit', cur); }
  await click(V.g);
  a = await acts();
  ck(P('tunnel selected + right-click/tap the ground = units come out there'), inT >= 2 && a.some(x => x.t === 'unl' && x.tid === S.tun && x.at === 1), JSON.stringify({ inT, a }));
  const tout = await page.evaluate(([i1, i2, x, y]) => [i1, i2].map(i => G.byId.get(i)).every(u => u && !u.inTun && u.order && Math.hypot(u.order.x - x, u.order.y - y) < 80) && G.teams[ME].tun.length === 0, [S.i1, S.i2, V.g.wx, V.g.wy]);
  ck(P('…and they run to the spot'), tout);

  await page.evaluate(() => { const o = window.__eeOld; G.paused = o.paused; SET.mRC = o.mRC; G.sel = []; updateUI(); });
}
