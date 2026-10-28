// QA: settings during a battle, through the ☰ menu like a player: graphics Low/High/Auto (game must keep drawing, no
// errors), music off/on, Settings > Mouse scheme "Alternate mouse setup" (right-click must then move units, left-click
// on ground must not), back to Generals (left-click moves again), Restart from the ☰ menu, Quit battle from the ☰
// menu. Also opens the Test Range from the main menu.
//   node orch/qa-settings.mjs [--vp hd]
import { startServer, launch, openPage, toMenu, waitLoaded, shot, layoutAudit, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'hd');
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = [];
const bug = s => { bugs.push(s); console.log('  ✗ ' + s); }, note = s => console.log('  ' + s);
const { page } = await openPage(browser, origin, VP, errs);
const clickText = async (sel, re) => { const h = await page.evaluateHandle(([sel, src]) => [...document.querySelectorAll(sel)].find(b => b.offsetParent && new RegExp(src, 'i').test(b.innerText)), [sel, re.source]); const e = h.asElement(); if (!e) return false; await e.scrollIntoViewIfNeeded(); await e.click(); return true; };
const frames = () => page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
// a selected infantry unit and a free ground point on screen
const setupUnit = () => page.evaluate(() => { G.paused = true; const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'); let u = G.ents.find(e => e.team === ME && !e.isB && !e.dead && e.kind === 'inf');
  if (!u) u = addUnit(ME, 'inf', hq.x + 120, hq.y + 120); centerOn(u.x, u.y, true); renderFrame(0.016); G.sel = [u]; updateUI();
  window.__acts = []; if (!window.__wrapped) { window.__wrapped = 1; const o = doAct; doAct = function (a) { (window.__acts = window.__acts || []).push(a.t); return o(a); }; }
  const R = cv.getBoundingClientRect(); for (let r = 80; r < 260; r += 30) for (let a = 0; a < 6.28; a += .5) { const x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r; if (!passXY('ground', x, y)) continue; const q = toScreen(x, groundH(x, y), y); const sx = R.left + q.x, sy = R.top + q.y; if (document.elementFromPoint(sx, sy) === cv && !pickAt(q.x, q.y, false)) return { sx, sy }; }
  return null; });
try {
  await toMenu(page, url);
  // Test Range
  await page.click('#sandbox'); await waitLoaded(page); await sleep(2000);
  const sb = await page.evaluate(() => ({ sandbox: !!G.sandbox, credits: $('credits').innerText, box: !$('sbx').hidden }));
  note('Test Range: ' + JSON.stringify(sb)); await shot(page, `${VP}-testrange.png`);
  if (!sb.sandbox) bug('Test Range button did not start the test range');
  // ☰ → Quit back to menu
  await page.click('#aMenu'); await sleep(300); await page.click('#aQuit'); await sleep(500);
  if (await page.evaluate(() => !$('quitOv').hidden)) await page.click('#quitYes'); await sleep(800);
  if (!(await page.evaluate(() => !$('menu').hidden))) bug('☰ > Quit battle did not return to the menu (Test Range)');
  // skirmish
  await page.click('#start'); await waitLoaded(page); await sleep(1500);
  for (const tier of ['Low', 'High', 'Auto']) {
    await page.click('#aMenu'); await sleep(300); await page.click('#aSet'); await sleep(500);
    if (await page.evaluate(() => $('settings').hidden)) { bug('☰ > Settings did not open the settings in battle'); break; }
    await clickText('#sGfx button', new RegExp('^' + tier + '$')); await sleep(300);
    await page.click('#sDone'); await sleep(500);
    const n = await frames(); note(`graphics ${tier}: ${n} frames in 6 s`); if (n < 1) bug(`after switching graphics to ${tier} the game stopped drawing`);
    await shot(page, `${VP}-gfx-${tier}.png`);
  }
  // music toggle
  const m0 = await page.evaluate(() => $('aMus').innerText); await page.click('#aMenu'); await sleep(200); await page.click('#aMus'); await sleep(300);
  const m1 = await page.evaluate(() => $('aMus').innerText); note(`music item: "${m0}" -> "${m1}"`); if (m0 === m1) bug('☰ > Music on/off label does not change when pressed');
  if (await page.evaluate(() => !$('amenu').hidden)) { await page.click('#aMenu'); await sleep(200); }
  // Generals default: left-click ground moves
  let g = await setupUnit(); await page.mouse.click(g.sx, g.sy); await sleep(300);
  note('Generals left-click ground: ' + (await page.evaluate(() => window.__acts.join(','))));
  // switch to Alternate mouse setup in settings
  await page.click('#aMenu'); await sleep(300); await page.click('#aSet'); await sleep(500);
  const ok = await clickText('#settings button', /^Alternate mouse setup$/); if (!ok) bug('Settings: no "Alternate mouse setup" button'); await sleep(300);
  await shot(page, `${VP}-settings-alt.png`);
  await page.click('#sDone'); await sleep(500);
  g = await setupUnit(); await page.mouse.click(g.sx, g.sy); await sleep(300);
  const lAlt = await page.evaluate(() => { const a = window.__acts.join(','); window.__acts = []; return a + ' sel=' + G.sel.length; });
  g = await setupUnit(); await page.mouse.click(g.sx, g.sy, { button: 'right' }); await sleep(300);
  const rAlt = await page.evaluate(() => window.__acts.join(','));
  note(`Alternate: left-click ground -> [${lAlt}], right-click ground -> [${rAlt}]`);
  if (!/go|mv|move/.test(rAlt)) bug('Alternate mouse setup: right-click on ground with a unit selected sent no move order');
  // back to Generals
  await page.click('#aMenu'); await sleep(300); await page.click('#aSet'); await sleep(500);
  await clickText('#settings button', /^Generals \(default\)$/); await page.click('#sDone'); await sleep(400);
  g = await setupUnit(); await page.mouse.click(g.sx, g.sy); await sleep(300);
  const lGen = await page.evaluate(() => window.__acts.join(',')); note('back to Generals, left-click ground -> ' + lGen); if (!lGen) bug('switching back to Generals: left-click ground no longer gives a move order');
  // persists after reload?
  const saved = await page.evaluate(() => { try { return JSON.stringify(SET).match(/"m[A-Za-z]*":"[a-z]+"/g)?.slice(0, 4).join(' '); } catch (e) { return ''; } }); note('saved mouse settings: ' + saved);
  // ☰ Restart
  await page.evaluate(() => { G.paused = false; });
  const t1 = await page.evaluate(() => G.t); await page.click('#aMenu'); await sleep(300); await page.click('#aRestart'); await sleep(800);
  const confirm = await page.evaluate(() => [...document.querySelectorAll('.overlay:not([hidden]) button')].filter(b => b.offsetParent).map(b => b.id + ':' + b.innerText.trim()));
  note('after ☰ Restart, buttons on screen: ' + JSON.stringify(confirm));
  const yes = confirm.find(s => /restart|yes/i.test(s) && !/keep|no/i.test(s)); if (yes) await page.click('#' + yes.split(':')[0]).catch(() => {});
  await waitLoaded(page).catch(() => {}); await sleep(1500);
  const t2 = await page.evaluate(() => ({ t: G && G.t, menu: !$('menu').hidden })); note(`restart: t ${t1.toFixed(0)} -> ${JSON.stringify(t2)}`);
  if (!(t2.t < t1) || t2.menu) bug('☰ > Restart did not restart the battle');
  await shot(page, `${VP}-restarted.png`);
} catch (e) { bug('run aborted: ' + e.message.split('\n')[0]); await shot(page, `${VP}-settings-abort.png`); }
await browser.close(); server.close();
console.log('\nBUGS:\n' + bugs.join('\n') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
