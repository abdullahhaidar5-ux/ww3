// One-tap army stances (CLAUDE.md / BACKLOG "army stances"), shared by orch/controls.mjs (mouse, V key) and
// orch/touch.mjs (touch, Stance button). Runs in an already started single-player battle:
//   Hold      - does not chase an enemy that is outside its weapon range, fires at one in range
//   Guerrilla - holds fire on an enemy that is in range but not close, fires once it is close
//   Assault   - chases the same enemy
//   command   - the stance travels as a normal 'stance' command, V (mouse) / Stance button (touch) cycles it,
//               and it survives a host-migration checkpoint encode/decode
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function stanceChecks(page, { mode, ck, tap }) {
  const P = s => `${mode}: stances: ${s}`;
  const R = await page.evaluate(() => {
    const old = { paused: G.paused, sel: G.sel.slice() };
    G.paused = true;
    const T = G.teams[ME], hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), en = G.teams.find(Q => Q.id !== ME);
    const k = roster(T.fac).barracks[0], ek = roster(en.fac).barracks[0];
    const clear = (x, y) => passXY('ground', x, y) && !G.ents.some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < (e.isB ? e.size / 2 + 60 : 40));
    let C = null;
    for (let r = 300; r < 1400 && !C; r += 50) for (let a = 0; a < 6.28 && !C; a += .35) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r;
      let ok = x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300; for (let d = -250; d <= 250 && ok; d += 50) if (!clear(x + d, y)) ok = false; if (ok) C = { x, y }; }
    if (!C) C = { x: hq.x + 400, y: hq.y };
    const out = {};
    const trial = (st, frac) => {
      const u = addUnit(ME, k, C.x, C.y), e = addUnit(en.id, ek, C.x + 0, C.y);
      const rg = rngOf(u); e.x = C.x + rg * frac + (e.r || 0); e.y = C.y;
      u.st = st; u.max = u.hp = e.max = e.hp = 1e7; e.cd = 1e9; e.st = 2; e.vis = true; u.vis = true; u.hid = false; e.hid = false;
      if (e.vs) e.vs[ME] = true; if (u.vs) u.vs[en.id] = true;
      const x0 = u.x, y0 = u.y; let tgt = false;
      for (let i = 0; i < 40; i++) { simUpdate(.1); if (u.target === e) tgt = true; }
      const mv = Math.hypot(u.x - x0, u.y - y0);
      u.dead = e.dead = true; G.byId.delete(u.id); G.byId.delete(e.id);
      return { mv: Math.round(mv), tgt, rg: Math.round(rg) };
    };
    out.holdFar = trial(2, 1.5);   // enemy out of range
    out.holdNear = trial(2, .8);   // enemy in range
    out.guerFar = trial(3, .85);   // in range but not close
    out.guerNear = trial(3, .4);   // close
    out.assault = trial(1, 1.5);   // chases
    // command path + checkpoint
    const u = addUnit(ME, k, C.x, C.y + 100); G.sel = [u]; window.__stU = u.id; window.__acts && (window.__acts.length = 0);
    doAct({ t: 'stance', ids: [u.id], v: 3 });
    out.cmd = u.st; window.__stOld = old;
    try { const c = ckDecode(JSON.parse(JSON.stringify(ckEncode()))); out.ck = c.byId.get(u.id) && c.byId.get(u.id).st; } catch (e) { out.ckErr = String(e).slice(0, 80); }
    u.st = 1; // so the next cycle (Assault) -> Hold
    return out;
  });
  ck(P('Hold does not chase an enemy out of range'), R.holdFar.mv < 25 && !R.holdFar.tgt, JSON.stringify(R.holdFar));
  ck(P('Hold fires at an enemy in range'), R.holdNear.tgt, JSON.stringify(R.holdNear));
  ck(P('Guerrilla holds fire until the enemy is close'), !R.guerFar.tgt && R.guerFar.mv < 25, JSON.stringify(R.guerFar));
  ck(P('Guerrilla fires once the enemy is close'), R.guerNear.tgt, JSON.stringify(R.guerNear));
  ck(P('Assault chases'), R.assault.mv > 40, JSON.stringify(R.assault));
  ck(P('stance command sets the unit stance'), R.cmd === 3);
  ck(P('stance survives a host-migration checkpoint'), R.ck === 3, R.ckErr || String(R.ck));
  // the button / hotkey cycles Assault -> Hold
  if (mode === 'mouse') { await page.keyboard.press('v'); }
  else { await page.evaluate(() => tcCmd('sn')); }
  await sleep(200);
  const after = await page.evaluate(() => { const u = G.byId.get(window.__stU); return u && u.st; });
  ck(P(mode === 'mouse' ? 'V cycles the stance' : 'Stance button cycles the stance'), after === 2, String(after));
  await page.evaluate(() => { const u = G.byId.get(window.__stU); if (u) { u.dead = true; G.byId.delete(u.id); } G.paused = window.__stOld.paused; G.sel = []; updateUI(); });
}
