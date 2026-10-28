// QA playthrough like a real player: menu (nation, map, AI count via the real controls) -> Deploy -> loading ->
// build a barracks from the sidebar (desktop: Generals left-click placement; phone: tap + confirm) -> train infantry
// -> select them by clicking/tapping -> move/attack order -> powers tab -> let both sides fight (player's slot run by
// the AI, simulation fast-forwarded) until someone wins -> end screen -> Play again / Main menu.
// Records page/console errors, frame-time spikes, layout problems, and stuck steps. Screenshots in orch/shots/qa/.
//   node orch/qa-play.mjs --vp hd --nat RS --map zagros --ai 3 [--minutes 25] [--tag x] [--end again|menu|quit]
import { startServer, launch, openPage, toMenu, waitLoaded, shot, layoutAudit, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'hd'), NAT = A('nat', 'US'), MAP = A('map', 'strait'), NAI = +A('ai', 1), MIN = +A('minutes', 25), END = A('end', 'menu');
const TAG = A('tag', `${VP}-${NAT}-${MAP}-${NAI}`);
const touch = VP.startsWith('phone');
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], notes = [];
const note = s => { notes.push(s); console.log('  ' + s); };
const bug = s => { errs.push(s); console.log('  ✗ ' + s); };
const { ctx, page } = await openPage(browser, origin, VP, errs);
const tap = async (sel) => { const el = await page.$(sel); if (!el) throw new Error('no ' + sel); await el.scrollIntoViewIfNeeded(); touch ? await el.tap() : await el.click(); };
const t0 = Date.now();
try {
  await toMenu(page, url);
  // pick nation, map, AI count with the real menu controls
  const natBtn = await page.evaluateHandle((n) => [...document.querySelectorAll('#pickP button')].find(b => (b.innerText || '').trim().startsWith(n) || b.dataset.k === n || (n === 'RS' && /Mountain Shias/.test(b.innerText)) || (n === 'DW' && /Coffee Shias/.test(b.innerText))), NAT);
  if (!natBtn.asElement()) bug(`menu: no nation card for ${NAT}`); else { await natBtn.asElement().scrollIntoViewIfNeeded(); touch ? await natBtn.asElement().tap() : await natBtn.asElement().click(); }
  await page.selectOption('#mapSel', MAP).catch(e => bug('menu: map select failed: ' + e.message.split('\n')[0]));
  const aiB = await page.$(`#aiN button[data-n="${NAI}"]`);
  if (aiB) { if (await aiB.isDisabled()) note(`AI count ${NAI} disabled on ${MAP}`); else { await aiB.scrollIntoViewIfNeeded(); touch ? await aiB.tap() : await aiB.click(); } }
  const pre = await page.evaluate(() => ({ p: setup.p, map: setup.map, n: setup.n }));
  if (pre.p !== NAT) bug(`menu: tapped ${NAT} but setup.p=${pre.p}`);
  if (pre.map !== MAP) bug(`menu: chose ${MAP} but setup.map=${pre.map}`);
  await shot(page, `${TAG}-menu.png`);
  await tap('#start');
  const tl = Date.now();
  await waitLoaded(page);
  note(`loaded in ${((Date.now() - tl) / 1000).toFixed(0)}s: ` + JSON.stringify(await page.evaluate(() => ({ facs: G.teams.map(t => t.fac), map: G.mapKey, me: G.teams[ME].fac }))));
  await sleep(2500);
  await shot(page, `${TAG}-start.png`);
  // frame times over ~5 s of real rendering
  const ft = await page.evaluate(() => new Promise(res => { const d = []; let l = performance.now(); const f = (t) => { d.push(t - l); l = t; if (d.length < 40) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); setTimeout(() => res(d), 15000); }));
  const sorted = [...ft].sort((a, b) => a - b); note(`frame ms (SwiftShader, CPU) median ${sorted[sorted.length >> 1]?.toFixed(0)} max ${sorted[sorted.length - 1]?.toFixed(0)} n=${ft.length}`);
  const lay = await layoutAudit(page, 'body'); note('layout: ' + JSON.stringify(lay));
  if (lay.offscreen.length) bug(`HUD controls off-screen on ${VP}: ${lay.offscreen.slice(0, 6).join('; ')}`);
  if (lay.overlaps.length) note(`HUD overlaps on ${VP}: ${lay.overlaps.slice(0, 6).join('; ')}`);
  // touch guide?
  const guide = await page.evaluate(() => { const o = [...document.querySelectorAll('body > div')].find(d => !d.hidden && /guide|tcg/i.test(d.id || '')); return o ? o.id : null; });
  if (guide) { note('touch guide shown: #' + guide); await shot(page, `${TAG}-guide.png`);
    for (let i = 0; i < 4; i++) { const b = await page.$(`#${guide} button:visible`); if (!b) break; await b.tap().catch(() => {}); await sleep(300); } }

  // ---- build a barracks via the sidebar
  const P = await page.evaluate(() => { const hq = G.ents.find(b => b.team === ME && b.isB && b.kind === 'hq'); const eq = G.ents.find(b => b.team !== ME && b.isB && b.kind === 'hq');
    centerOn(hq.x, hq.y, true); renderFrame(0.016); return { hx: hq.x, hy: hq.y, ex: eq.x, ey: eq.y }; });
  await sleep(500);
  const tabB = await page.$('.tabs button[data-tab="build"]'); if (tabB) { touch ? await tabB.tap() : await tabB.click(); }
  await sleep(300);
  const bb = await page.$('#b_barracks');
  const bbState = bb ? await bb.evaluate(b => ({ dis: b.disabled, vis: !!b.offsetParent, r: b.getBoundingClientRect().toJSON(), t: b.innerText.replace(/\s+/g, ' ') })) : null;
  note('barracks button: ' + JSON.stringify(bbState));
  if (!bb || !bbState.vis) bug(`build tab: barracks button not visible on ${VP}`);
  else {
    try { touch ? await bb.tap() : await bb.click(); } catch (e) { bug('could not press barracks button: ' + e.message.split('\n')[0]); }
    await sleep(300);
    const placing = await page.evaluate(() => G.place);
    if (placing !== 'barracks') bug(`pressing Barracks did not start placement (G.place=${placing})`);
    // a valid spot on screen near the HQ, toward the enemy
    const spot = await page.evaluate(({ hx, hy, ex, ey }) => { const R = cv.getBoundingClientRect(); const d = Math.hypot(ex - hx, ey - hy);
      for (let r = 170; r < 420; r += 25) for (let a = 0; a < 6.28; a += .35) { const ang = Math.atan2(ey - hy, ex - hx) + a; const x = hx + Math.cos(ang) * r, y = hy + Math.sin(ang) * r;
        if (!validSpot(ME, 'barracks', x, y)) continue; const p = toScreen(x, groundH(x, y), y); const sx = R.left + p.x, sy = R.top + p.y;
        if (sx > 20 && sy > 20 && sx < innerWidth - 20 && sy < innerHeight - 20 && document.elementFromPoint(sx, sy) === cv) return { sx, sy, x, y }; }
      return null; }, P);
    if (!spot) bug('no on-screen valid barracks spot near the HQ (camera/HUD hides the base?)');
    else {
      if (touch) { await page.touchscreen.tap(spot.sx, spot.sy); await sleep(400); await shot(page, `${TAG}-place.png`);
        const ok = await page.$('#tstrip button[data-k="ok"]'); if (!ok || !(await ok.isVisible())) bug('phone: no visible Confirm button after tapping a building spot'); else await ok.tap(); }
      else { await page.mouse.move(spot.sx, spot.sy); await sleep(200); await shot(page, `${TAG}-place.png`); await page.mouse.click(spot.sx, spot.sy); }
      await sleep(500);
      const got = await page.evaluate(() => G.ents.some(e => e.team === ME && e.isB && e.kind === 'barracks' && !e.dead));
      if (!got) bug(`barracks not placed after ${touch ? 'tap+confirm' : 'left-click'} on a valid spot (log: ${await page.evaluate(() => [...document.querySelectorAll('#log > *')].slice(-2).map(e => e.innerText).join(' / '))})`);
      else note('barracks placed');
    }
  }
  // fast-forward 50 game-seconds so it finishes
  await page.evaluate(() => { for (let i = 0; i < 3000 && !G.over; i++) simUpdate(1 / 60); renderFrame(0.016); });
  const bdone = await page.evaluate(() => { const b = G.ents.find(e => e.team === ME && e.isB && e.kind === 'barracks' && !e.dead); return b ? { built: !b.bp || b.bp >= 1, bp: b.bp, hp: b.hp } : null; });
  note('barracks after 50s: ' + JSON.stringify(bdone));
  // ---- train infantry from the units tab
  const tabU = await page.$('.tabs button[data-tab="units"]'); if (tabU) { touch ? await tabU.tap() : await tabU.click(); }
  await sleep(300);
  const ub = await page.evaluateHandle(() => [...document.querySelectorAll('#panel button[data-tab="units"]')].find(b => !b.disabled && b.offsetParent));
  const before = await page.evaluate(() => G.ents.filter(e => e.team === ME && !e.isB && !e.dead).length);
  if (!ub.asElement()) bug('units tab: no enabled unit button after building a barracks');
  else { const nm = await ub.asElement().evaluate(b => b.dataset.nm); for (let i = 0; i < 3; i++) { touch ? await ub.asElement().tap() : await ub.asElement().click(); await sleep(150); }
    await page.evaluate(() => { for (let i = 0; i < 2400 && !G.over; i++) simUpdate(1 / 60); renderFrame(0.016); });
    const after = await page.evaluate(() => G.ents.filter(e => e.team === ME && !e.isB && !e.dead).length);
    note(`trained "${nm}" x3: units ${before} -> ${after}`); if (after <= before) bug(`pressed "${nm}" 3x, no new units after 40 game-seconds`); }
  await shot(page, `${TAG}-units.png`);
  // ---- select a unit by clicking/tapping it, then order a move by clicking/tapping ground
  await page.evaluate(() => { window.__acts = []; const o = doAct; doAct = function (a) { __acts.push(a.t); return o(a); }; });
  const us = await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.isB && !e.dead && e.kind !== 'dozer' && !e.air).pop() || G.ents.find(e => e.team === ME && !e.isB && !e.dead);
    if (!u) return null; centerOn(u.x, u.y, true); renderFrame(0.016); const R = cv.getBoundingClientRect(); const p = toScreen(u.x, unitH(u) + entHeightMid(u) * .6, u.y);
    let g = null; for (let r = 90; r < 300 && !g; r += 30) for (let a = 0; a < 6.28; a += .5) { const x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r; if (!passXY('ground', x, y)) continue; const q = toScreen(x, groundH(x, y), y);
      const sx = R.left + q.x, sy = R.top + q.y; if (document.elementFromPoint(sx, sy) === cv && !pickAt(q.x, q.y, false)) { g = { sx, sy }; break; } }
    return { id: u.id, kind: u.kind, sx: R.left + p.x, sy: R.top + p.y, g, top: document.elementFromPoint(R.left + p.x, R.top + p.y)?.id }; });
  if (us) {
    await sleep(300);
    if (touch) await page.touchscreen.tap(us.sx, us.sy); else await page.mouse.click(us.sx, us.sy);
    await sleep(400);
    const s = await page.evaluate(() => G.sel.map(e => e.kind));
    if (!s.length) bug(`${touch ? 'tapping' : 'left-clicking'} my ${us.kind} did not select it (element on top: #${us.top})`);
    else { note('selected: ' + s.join(','));
      await shot(page, `${TAG}-selected.png`);
      if (us.g) { if (touch) await page.touchscreen.tap(us.g.sx, us.g.sy); else await page.mouse.click(us.g.sx, us.g.sy); await sleep(300);
        const a = await page.evaluate(() => window.__acts.slice()); note('orders sent: ' + a.join(','));
        if (!a.includes('mv') && !a.includes('move') && !a.length) bug(`${touch ? 'tap' : 'left-click'} on ground with a unit selected sent no order`); }
    }
  }
  // ---- powers tab
  const tabP = await page.$('.tabs button[data-tab="pow"]'); if (tabP) { touch ? await tabP.tap() : await tabP.click(); await sleep(300); await shot(page, `${TAG}-powers.png`);
    const pl = await layoutAudit(page, '#side'); if (pl.offscreen.length || pl.clipped.length) note('powers tab layout: ' + JSON.stringify(pl)); }
  // ---- play the battle out: AI takes my slot, fast-forward, check progress
  await page.evaluate(() => { if (!G.teams[0].ai && typeof mkAI === 'function') G.teams[0].ai = mkAI(1); });
  let last = null, stall = 0, prevSig = '';
  const steps = Math.round(MIN * 60 / 30);
  for (let i = 0; i < steps; i++) {
    last = await page.evaluate(() => { const ms = performance.now(); let worst = 0; try { for (let k = 0; k < 1800 && !G.over; k++) { const a = performance.now(); simUpdate(1 / 60); worst = Math.max(worst, performance.now() - a); } } catch (e) { return { err: String(e.stack || e).slice(0, 400) }; }
      const alive = G.teams.map(T => G.ents.filter(e => e.team === T.id && !e.dead).length); return { t: G.t | 0, over: G.over, alive, ms: performance.now() - ms | 0, worst: worst | 0, endHidden: $('end').hidden, cr: G.teams.map(T => T.credits | 0) }; });
    if (last.err) { bug('simulation threw: ' + last.err); break; }
    if (last.worst > 250) note(`slow sim step ${last.worst} ms at t=${last.t}`);
    if (i % 6 === 5) console.log('   t=' + last.t + ' alive ' + last.alive.join('/') + ' credits ' + last.cr.join('/') + ' chunk ' + last.ms + 'ms');
    const sig = last.alive.join('/'); if (sig === prevSig) stall++; else stall = 0; prevSig = sig;
    if (last.over) break;
  }
  note('battle state: ' + JSON.stringify(last));
  if (last && !last.over) note(`no winner after ${MIN} game-min (alive ${last.alive.join('/')})`);
  await page.evaluate(() => { try { renderFrame(0.016); } catch (e) {} }); await sleep(1500);
  await shot(page, `${TAG}-end.png`);
  if (last && last.over) {
    const end = await page.evaluate(() => ({ hidden: $('end').hidden, t: $('endt').innerText, s: $('ends').innerText.slice(0, 200), again: !$('again').hidden }));
    note('end screen: ' + JSON.stringify(end)); if (end.hidden) bug('battle over but the end screen is not shown');
    const el = await layoutAudit(page, '#end'); if (el.offscreen.length || el.overlaps.length) bug('end screen layout on ' + VP + ': ' + JSON.stringify(el));
    if (END === 'again') { await tap('#again'); await waitLoaded(page); await sleep(1500); const ok = await page.evaluate(() => G && !G.over && G.t >= 0 && $('end').hidden); if (!ok) bug('Play again did not start a fresh battle'); else note('Play again: new battle running'); await shot(page, `${TAG}-again.png`); }
    else { await tap('#change'); await sleep(800); const ok = await page.evaluate(() => !$('menu').hidden && G === null); if (!ok) bug('Main menu button did not return to the menu'); else note('back at main menu'); }
  } else {
    // quit through the pause menu
    if (touch) { const pb = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.offsetParent && /pause|menu|❚❚|⏸/i.test(b.innerText + b.title + (b.getAttribute('aria-label') || '')) && !b.closest('#menu,#settings'))); if (pb.asElement()) await pb.asElement().tap(); else bug('phone: no visible pause/menu button to quit a battle'); }
    else await page.keyboard.press('Escape');
    await sleep(500); await shot(page, `${TAG}-pause.png`);
    const pv = await page.evaluate(() => !$('pauseOv').hidden);
    if (!pv) bug(`${touch ? 'pause button' : 'Escape'} did not open the pause menu`);
    else { await tap('#pQuit'); await sleep(300); if (await page.evaluate(() => !$('quitOv').hidden)) await tap('#quitYes'); await sleep(800);
      const ok = await page.evaluate(() => !$('menu').hidden); if (!ok) bug('Quit battle did not return to the main menu'); else note('quit to menu ok'); }
  }
} catch (e) { bug('run aborted: ' + String(e.message || e).split('\n')[0]); await shot(page, `${TAG}-abort.png`); }
await browser.close(); server.close();
console.log(`\n${TAG}: ${((Date.now() - t0) / 1000) | 0}s`);
console.log('BUGS:\n' + [...new Set(errs)].join('\n'));
