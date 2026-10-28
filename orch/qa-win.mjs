// QA: the Victory path. Starts a skirmish (2 or more AIs, optionally allied with you), wipes out every enemy entity
// in the battle (as if your army had), lets the battle notice, then checks the Victory screen's text and layout and
// that Play again / Main menu work.
//   node orch/qa-win.mjs [--vp phoneP] [--ai 3] [--ally]
import { startServer, launch, openPage, toMenu, waitLoaded, shot, layoutAudit, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'phoneP'), NAI = +A('ai', 1), ALLY = process.argv.includes('--ally');
const touch = VP.startsWith('phone');
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  ✗ ' + s); }, note = s => console.log('  ' + s);
const { ctx, page } = await openPage(browser, origin, VP, errs, { dpr: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
try {
  await toMenu(page, url);
  await page.evaluate(({ NAI, ALLY }) => { setup.n = NAI; setup.map = 'fulda'; setup.others = []; rollAis(); setup.tm = setup.tm.map((t, i) => ALLY && i === NAI ? 0 : i); }, { NAI, ALLY });
  const b = await page.$('#start'); await b.scrollIntoViewIfNeeded(); touch ? await b.tap() : await b.click();
  await waitLoaded(page); await sleep(1500);
  note('battle: ' + JSON.stringify(await page.evaluate(() => G.teams.map(T => T.fac + (ally(T.id, ME) ? '(ally)' : '')))));
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); renderFrame(0.016); });
  await sleep(1500);
  const end = await page.evaluate(() => ({ over: G && G.over, hidden: $('end').hidden, t: $('endt').innerText, s: $('ends').innerText, btn: [...document.querySelectorAll('#end button')].filter(x => x.offsetParent).map(x => x.innerText.trim()) }));
  note('end: ' + JSON.stringify(end));
  await shot(page, `win-${VP}-${NAI}${ALLY ? 'ally' : ''}.png`);
  if (!end.over || end.hidden) bug('all enemies destroyed but no end screen');
  else if (!/victory/i.test(end.t)) bug(`all enemies destroyed but the screen says "${end.t}"`);
  const lay = await layoutAudit(page, '#end'); if (lay.offscreen.length || lay.overlaps.length || lay.clipped.length) bug('victory screen layout: ' + JSON.stringify(lay));
  const again = await page.$('#again'); await again.scrollIntoViewIfNeeded(); touch ? await again.tap() : await again.click();
  await waitLoaded(page); await sleep(1000);
  const ok = await page.evaluate(() => G && !G.over && $('end').hidden && G.teams.length); note('play again: teams=' + ok); if (!ok) bug('Play again after a victory did not start a new battle');
} catch (e) { bug('run aborted: ' + e.message.split('\n')[0]); }
await browser.close(); server.close();
console.log('\nBUGS:\n' + bugs.join('\n') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
