// QA: 2-player online battle driven through the real menu buttons, like two friends: a desktop host and a phone
// client, through the local game servers (wrangler dev in server/; browser-to-browser blocked like mpsync --server).
// Host presses Host a game (or Play online when that ships); the client sees the game in Open games and taps Join;
// host presses Start; both load; the client taps its own unit and taps the ground (order must reach the host); then
// the client's page is reloaded mid-battle (a phone that dropped / refreshed) and must get back into the battle.
//   node orch/qa-mplobby.mjs [--client phoneP|phoneL|hd] [--host sm|phoneP|...] [--lobby-only]
import { startServer as startStatic, launch, openPage, toMenu, shot, layoutAudit, sleep } from './qa-lib.mjs';
import { startServer as startGameServer } from './serverdev.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CVP = A('client', 'phoneP'), HVP = A('host', 'sm'), LOBBY_ONLY = process.argv.includes('--lobby-only');
function blockedPeerShim(url) {
  window.WW3_SERVER = url;
  class BlockedPeer { constructor() { this._h = {}; this.destroyed = false; this.open = false;
      setTimeout(() => this._emit('error', Object.assign(new Error('browser-to-browser blocked (test)'), { type: 'network' })), 50); }
    on(t, f) { (this._h[t] = this._h[t] || []).push(f); return this; } _emit(t, ...a) { for (const f of (this._h[t] || []).slice()) try { f(...a); } catch (e) {} }
    connect() { return { on() {}, open: false, send() {} }; } destroy() { this.destroyed = true; } disconnect() {} reconnect() {} }
  Object.defineProperty(window, 'Peer', { configurable: false, get: () => BlockedPeer, set: () => {} });
  Object.defineProperty(window, 'Trystero', { configurable: false, get: () => undefined, set: () => {} });
}
const SRV = await startGameServer();
console.log('game server ' + SRV.url);
const { server, origin, url } = await startStatic();
const browser = await launch();
const errs = [], bugs = [];
const bug = s => { bugs.push(s); console.log('  ✗ ' + s); };
const note = s => console.log('  ' + s);
async function mk(vp, tag) {
  const { ctx, page } = await openPage(browser, origin, vp, errs, { allowHosts: [SRV.url, SRV.url.replace('http', 'ws')], dpr: 1 });
  const { guardContext } = await import('./serverdev.mjs'); await guardContext(ctx, SRV.url);
  await ctx.addInitScript(blockedPeerShim, SRV.url);
  await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
  page.on('crash', () => bug(tag + ' page crashed'));
  return { ctx, page };
}
const press = async (page, el, touch) => { await el.scrollIntoViewIfNeeded(); touch ? await el.tap() : await el.click(); };
const H = await mk(HVP, 'host'), C = await mk(CVP, 'client');
// (phones at deviceScaleFactor 1 here: SwiftShader draws 9x fewer pixels; layout is the same)
const ctouch = CVP.startsWith('phone'), htouch = HVP.startsWith('phone');
try {
  await toMenu(H.page, url); await toMenu(C.page, url);
  // host: the online button
  const hb = await H.page.evaluateHandle(() => [...document.querySelectorAll('#menu button')].find(b => b.offsetParent && /play online|host a game/i.test(b.innerText)));
  if (!hb.asElement()) { bug('host: no "Play online"/"Host a game" button'); throw new Error('stop'); }
  note('host presses: ' + await hb.asElement().innerText());
  await press(H.page, hb.asElement(), htouch);
  await sleep(3000);
  await shot(H.page, 'mp-host-lobby.png');
  note('host status: ' + await H.page.evaluate(() => ($('mpstatus').innerText + ' | ' + $('games').innerText).replace(/\s+/g, ' ').slice(0, 300)));
  // client: wait for the game in the list, tap Join
  let jb = null;
  for (let i = 0; i < 40 && !jb; i++) { await sleep(1000); const h = await C.page.evaluateHandle(() => [...document.querySelectorAll('#games button')].find(b => !b.disabled && /join/i.test(b.innerText))); jb = h.asElement(); }
  await shot(C.page, `mp-client-list-${CVP}.png`);
  if (!jb) { bug('client: hosted game never appeared in Open games (40 s)'); note('client list: ' + await C.page.evaluate(() => $('games').innerText)); throw new Error('stop'); }
  await press(C.page, jb, ctouch);
  await sleep(4000);
  note('client status: ' + await C.page.evaluate(() => $('mpstatus').innerText.replace(/\s+/g, ' ').slice(0, 300)));
  await shot(C.page, `mp-client-joined-${CVP}.png`);
  { const cb = await C.page.evaluate(() => ({ leave: [...document.querySelectorAll('#menu button')].filter(x => x.offsetParent && /cancel|leave/i.test(x.innerText)).map(x => x.innerText.trim()),
      host: { hidden: $('host').hidden, disabled: $('host').disabled }, join: [...document.querySelectorAll('#games button')].map(x => x.innerText.trim() + (x.disabled ? '(off)' : '')) }));
    note('client after joining: ' + JSON.stringify(cb));
    if (!cb.leave.length) bug('client in a lobby has no Leave/Cancel button (only a page reload gets out)');
    if (!cb.host.hidden && !cb.host.disabled) { const hb2 = await C.page.$('#host'); await press(C.page, hb2, ctouch); await sleep(1500);
      note('client pressed HOST A GAME while in a lobby: ' + await C.page.evaluate(() => $('mpstatus').innerText.slice(0, 200) + ' | code=' + NET.code)); } }
  const cl = await layoutAudit(C.page, '#menu'); if (cl.offscreen.length || cl.overlaps.length) bug(`client lobby layout on ${CVP}: ${JSON.stringify(cl)}`);
  // host: start
  let sb = null;
  for (let i = 0; i < 20 && !sb; i++) { const h = await H.page.evaluateHandle(() => [...document.querySelectorAll('#menu button')].find(b => b.offsetParent && !b.disabled && /start.*battle/i.test(b.innerText) && b.id !== 'start' && b.id !== 'sandbox')); sb = h.asElement(); if (!sb) await sleep(1000); }
  await shot(H.page, 'mp-host-lobby2.png');
  if (!sb) { bug('host: no enabled Start button after a player joined'); note('host lobby buttons: ' + await H.page.evaluate(() => [...document.querySelectorAll('#menu button')].filter(b => b.offsetParent).map(b => b.innerText.trim() + (b.disabled ? '(off)' : '')).join(' | ').slice(-600))); throw new Error('stop'); }
  { const hl = await layoutAudit(H.page, '#menu'); if (hl.offscreen.length || hl.overlaps.length || hl.tiny.length) bug(`host lobby layout on ${HVP}: ${JSON.stringify(hl)}`); }
  if (LOBBY_ONLY) throw new Error('stop');
  note('host presses: ' + await sb.innerText());
  await press(H.page, sb, htouch);
  const t0 = Date.now();
  const st = p => p.evaluate(() => ({ G: !!(typeof G !== 'undefined' && G), loading: !!window.LOADING, t: typeof G !== 'undefined' && G ? +G.t.toFixed(1) : null, mode: typeof MODE !== 'undefined' ? MODE : null,
    over: $('loadOv') ? $('loadOv').innerText.replace(/\s+/g, ' ').slice(0, 120) : '', status: $('mpstatus').innerText.slice(0, 120), net: ($('net') && !$('net').hidden) ? $('net').innerText.slice(0, 120) : '' })).catch(e => ({ err: e.message.slice(0, 80) }));
  let okBoth = false;
  for (let i = 0; i < 40 && !okBoth; i++) { await sleep(20000); const a = await st(H.page), b = await st(C.page);
    console.log(`   [${(Date.now() - t0) / 1000 | 0}s] host ${JSON.stringify(a)}\n            client ${JSON.stringify(b)}`);
    okBoth = a.G && !a.loading && a.t > 0.3 && b.G && !b.loading && b.t > 0.3; if (i === 6) { await shot(H.page, 'mp-host-wait.png'); await shot(C.page, `mp-client-wait-${CVP}.png`); } }
  if (!okBoth) { bug('battle did not get going on both pages within ~13 min after Start'); throw new Error('stop'); }
  note(`both in battle after ${((Date.now() - t0) / 1000) | 0}s; client MODE=` + await C.page.evaluate(() => MODE + ' ME=' + ME));
  await sleep(3000);
  await shot(C.page, `mp-client-battle-${CVP}.png`);
  await shot(H.page, 'mp-host-battle.png');
  // client: tap own unit, tap ground
  const us = await C.page.evaluate(() => { const u = G.ents.find(e => e.team === ME && !e.isB && !e.dead && !e.air); if (!u) return null; centerOn(u.x, u.y, true); renderFrame(0.016);
    const R = cv.getBoundingClientRect(); const p = toScreen(u.x, unitH(u) + entHeightMid(u) * .6, u.y); let g = null;
    for (let r = 90; r < 300 && !g; r += 30) for (let a = 0; a < 6.28; a += .5) { const x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r; if (!passXY('ground', x, y)) continue; const q = toScreen(x, groundH(x, y), y); const sx = R.left + q.x, sy = R.top + q.y; if (document.elementFromPoint(sx, sy) === cv && !pickAt(q.x, q.y, false)) { g = { sx, sy, x, y }; break; } }
    return { id: u.id, kind: u.kind, sx: R.left + p.x, sy: R.top + p.y, g }; });
  if (!us) bug('client has no units at battle start');
  else {
    await sleep(500);
    ctouch ? await C.page.touchscreen.tap(us.sx, us.sy) : await C.page.mouse.click(us.sx, us.sy); await sleep(500);
    const s = await C.page.evaluate(() => G.sel.length); if (!s) bug(`client: tapping own ${us.kind} did not select it`);
    if (us.g) { ctouch ? await C.page.touchscreen.tap(us.g.sx, us.g.sy) : await C.page.mouse.click(us.g.sx, us.g.sy);
      await sleep(6000);
      const moved = await H.page.evaluate(({ id, x, y }) => { const u = G.byId.get(id); return u ? { d: Math.hypot(u.x - x, u.y - y) | 0, tx: u.tx, ty: u.ty, st: u.st || u.order } : null; }, { id: us.id, x: us.g.x, y: us.g.y });
      note('client order on host: ' + JSON.stringify(moved)); }
  }
  // client reload mid-battle
  const before = await H.page.evaluate(() => ({ t: G.t | 0, n: G.ents.filter(e => e.team === 1 && !e.dead).length }));
  note('client reloads page at host t=' + before.t);
  await C.page.reload({ waitUntil: 'load' });
  await C.page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await sleep(5000);
  await shot(C.page, `mp-client-after-reload-${CVP}.png`);
  const rj = await C.page.evaluate(() => ({ menu: !$('menu').hidden, G: !!(typeof G !== 'undefined' && G), status: ($('mpstatus').innerText + ' | ' + $('games').innerText).replace(/\s+/g, ' ').slice(0, 300), btns: [...document.querySelectorAll('#menu button, body > div button')].filter(b => b.offsetParent && /rejoin|resume|back|join/i.test(b.innerText)).map(b => b.innerText.trim()) }));
  note('client after reload: ' + JSON.stringify(rj));
  if (!rj.G) {
    const rb = await C.page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.offsetParent && !b.disabled && /rejoin|back to (the )?battle|resume/i.test(b.innerText)) || [...document.querySelectorAll('#games button')].find(b => !b.disabled && /join/i.test(b.innerText)));
    if (!rb.asElement()) {
      bug('client reloaded mid-battle: no Rejoin button and the battle is listed as "In battle" (disabled)');
      // second try: Join by code with the host's code (a friend would have to ask the host for it)
      const code = await H.page.evaluate(() => NET.code || NET.baseCode);
      await C.page.fill('#jcode', String(code)); const jbtn = await C.page.$('.joinrow button'); await press(C.page, jbtn, ctouch); await sleep(8000);
      const r2 = await C.page.evaluate(() => ({ G: !!(typeof G !== 'undefined' && G), status: $('mpstatus').innerText.slice(0, 200) }));
      note('join by code after reload: ' + JSON.stringify(r2)); await shot(C.page, `mp-client-joincode-after-reload-${CVP}.png`);
      if (!r2.G) { let ok = false; try { await C.page.waitForFunction(() => G && !window.LOADING, null, { timeout: 400000, polling: 2000 }); ok = true; } catch (e) {}
        const hostNow = await H.page.evaluate(() => ({ t: G.t | 0, ai1: !!G.teams[1].ai }));
        note('after waiting: client in battle=' + ok + ' host ' + JSON.stringify(hostNow) + ' client status ' + await C.page.evaluate(() => $('mpstatus').innerText.slice(0, 200)));
        if (!ok) bug('client reloaded mid-battle: Join by code with the battle\'s code does not get back in either (AI keeps the slot)'); else await shot(C.page, `mp-client-rejoined-${CVP}.png`); }
    }
    else { note('client presses: ' + await rb.asElement().innerText()); await press(C.page, rb.asElement(), ctouch);
      try { await C.page.waitForFunction(() => G && !window.LOADING && G.t > 1, null, { timeout: 600000, polling: 1000 });
        const after = await C.page.evaluate(() => ({ t: G.t | 0, me: ME, mine: G.ents.filter(e => e.team === ME && !e.dead).length }));
        const hostNow = await H.page.evaluate((me) => ({ t: G.t | 0, mine: G.ents.filter(e => e.team === me && !e.dead).length, ai: !!G.teams[me].ai }), after.me);
        note('client back in: ' + JSON.stringify(after) + ' host view: ' + JSON.stringify(hostNow));
        if (Math.abs(after.mine - hostNow.mine) > 3) bug(`after rejoin the client sees ${after.mine} own entities, host has ${hostNow.mine}`);
        await shot(C.page, `mp-client-rejoined-${CVP}.png`);
      } catch (e) { bug('client pressed rejoin but never got back into the battle: ' + e.message.split('\n')[0]); await shot(C.page, `mp-client-rejoin-fail-${CVP}.png`); } }
  }
} catch (e) { if (e.message !== 'stop') bug('run aborted: ' + e.message.split('\n')[0]); }
await browser.close(); server.close(); SRV.stop();
console.log('\nBUGS:\n' + bugs.join('\n') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
process.exit(0);
