// WAR & PEACE guards (helper warpeace, Abdullah 2026-11-12 20:29 "Go"). Plain page code: orch/grandtest.mjs evaluates this file in the
// campaign page and fails on every string it returns. One block per decision; keep each block independent (it starts its own campaign).
(() => { const F = [], ok = (c, m) => { if (!c) F.push('warpeace: ' + m); };
  const border = (a) => { for (const p of GCM.P) if (p.land && GC.prov[p.i].o === a) for (const j of p.adj) { const o = GCM.P[j].land && GC.prov[j].o; if (o && o !== a && !grAllied(a, o) && GC.nat[o].cap !== j && !grOverlord(o) && GCM.P.filter(q => q.land && GC.prov[q.i].o === o).length > 3) return [p.i, j, o]; } return null; };
  const occupy = (a, pj) => { const b = GC.prov[pj].o, ar = GC.armies.find(x => x.o === a && !x.fl); ar.at = pj; ar.path = []; GC.prov[pj].gar = []; for (const x of GC.armies) if (x.o === b && x.at === pj) x.at = GC.nat[b].cap; return grCapture(pj); };
  // ---- 1. OCCUPIED LAND IS NOT YOURS UNTIL PEACE
  { grNew({ me: 'IR', seed: 5, len: 'std' }); const a = 'IR', [pi, pj, b] = border(a); grDeclare(a, b); const al0 = aeCount(a);
    ok(occupy(a, pj), 'an army on an empty enemy province must take control of it');
    const st = GC.prov[pj]; ok(st.o === a && st.ow === b && ocOwner(pj) === b, 'a captured province is held by the winner but still owned by the loser (st.ow)');
    ok(aeCount(a) === al0, 'occupied land must not count as owned (alarm)'); ok(/Occupied/.test(grRecruit(a, pj, 'inf')), 'no recruiting on occupied land');
    ok(/Occupied by/.test(ocLine(pj)), 'the province window must say who occupies and who owns');
    const save = JSON.stringify(GC), back = () => { GC = JSON.parse(save); };
    // months of war: the owner never changes while the war lasts
    for (let i = 0; i < 3; i++) { GC.turn++; ocSweep(); } ok(GC.prov[pj].ow === b, 'the owner changed during the war without a peace deal');
    back(); ok(gpApply(a, b, { prov: [] }) === '' && GC.prov[pj].o === b && !GC.prov[pj].ow, 'a peace that does not hand the province over must give it back');
    back(); GC.wsT[grWk(a, b)] = GC.turn - 30; const e = gpEval(a, b, { prov: [pj] }); ok(e.ok && gpApply(a, b, { prov: [pj] }) === '' && GC.prov[pj].o === a && !GC.prov[pj].ow && aeCount(a) === al0 + 1, 'a peace deal that signs the province over must make it yours: ' + JSON.stringify(e));
    back(); delete GC.war[grWk(a, b)]; ocSweep(); ok(GC.prov[pj].o === b && !GC.prov[pj].ow, 'land held without a war must go home (ceasefire, truce, forced peace)');
    back(); GC.nat[b].dead = 1; ocSweep(); ok(GC.prov[pj].o === a && !GC.prov[pj].ow, 'a collapsed nation\'s land goes to whoever holds it');
    back(); const br = GC.armies.find(x => x.o === b && !x.fl); for (const x of GC.armies) if (x.o === a && x.at === pj) x.at = pi; br.at = pj; br.path = []; GC.prov[pj].gar = []; grCapture(pj); ok(GC.prov[pj].o === b && !GC.prov[pj].ow, 'taking your own land back ends the occupation');
    back(); const h = grHash(); delete GC.prov[pj].ow; ok(h !== grHash(), 'occupation must be part of the campaign hash');
    back(); const rt = JSON.parse(JSON.stringify(GC)); ok(rt.prov[pj].ow === b, 'occupation must survive a save');
    for (const p of GC.prov) delete p.ow; ocSweep(); ok(GC.prov[pj].o === a, 'an old save (no st.ow) must load as plain ownership'); }
  // AI wars over 30 months: no province changes owner while its two nations are at war, except by collapse; same seed = same result
  { const run = () => { grNew({ me: null, seed: 4242, len: 'std' }); let bad = ''; const own = GCM.P.map(p => p.land ? ocOwner(p.i) : '');
      for (let m = 0; m < 30 && !GC.over; m++) { grEndTurn(true); for (const p of GCM.P) { if (!p.land) continue; const w = ocOwner(p.i), w0 = own[p.i]; if (w !== w0) { if (GC.nat[w0] && !GC.nat[w0].dead && grAtWar(w, w0) && !bad) bad = p.n + ' ' + w0 + '>' + w + ' month ' + m; own[p.i] = w; } } }
      return { bad, h: grHash(), occ: GC.prov.filter(p => p.ow).length, deals: GC.log.filter(l => /^Peace between/.test(l[1])).length }; };
    const r1 = run(), r2 = run(); ok(!r1.bad, 'a province changed owner in the middle of a war: ' + r1.bad); ok(r1.h === r2.h, 'same seed gave a different campaign with occupation'); ok(r1.deals > 0, 'AI wars must end in peace deals (none in 30 months)'); }
  return F; })()
