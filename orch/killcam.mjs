// QA: the kill-cam. Starts a skirmish, stages a big clash in mid-map in real time, ends the match (all enemies
// destroyed), then checks the end-of-match replay plays (screenshots during it), Skip/end screen and the
// "Save screenshot" button, and prints the recording cost per sample.
//   node orch/killcam.mjs [--vp hd|phoneP] [--secs 25]
import { startServer, launch, openPage, toMenu, waitLoaded, shot, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'sm'), SECS = +A('secs', 25);
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  x ' + s); }, note = s => console.log('  ' + s);
const { ctx, page } = await openPage(browser, origin, VP, errs, { dpr: 1 });
page.on('console', m => { if (m.type() === 'error' && !/WebSocket|Failed to load/.test(m.text())) console.log('  CONSOLE ERR ' + m.text().slice(0, 300)); });
await ctx.addInitScript(() => { window.__killcam = true; try { localStorage.setItem('ww3_touchGuide', '1'); localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); } catch (e) {} });
try {
  await toMenu(page, url);
  await page.evaluate(() => { setup.n = 1; setup.map = 'fulda'; setup.others = []; rollAis(); });
  await page.evaluate(() => $('start').click());
  await waitLoaded(page); await sleep(1500);
  // stage a clash: ~40 units a side face each other in mid-map, the camera on them
  await page.evaluate(() => {
    const cx = MAPW / 2, cy = MAPH / 2;
    const pick = T => { const R = roster(T.fac), out = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && !s.noAttack && s.dmg > 0 && s.cost <= 1600) out.push(k); } return out; };
    for (const T of G.teams) { const ks = pick(T), sg = T.id === ME ? -1 : 1; for (let i = 0; i < 40; i++) { const k = ks[i % ks.length]; addUnit(T.id, k, cx + sg * (110 + (i % 5) * 22), cy - 150 + Math.floor(i / 5) * 40); } }
    centerOn(cx, cy, true);
  });
  await page.evaluate(() => { QUAL.lock = true; QUAL.lv = 5; applyQual(); });
  // rAF does not run in this headless browser: drive the game loop's work by hand (sim at 60 Hz, kill-cam notes, a frame now and then)
  for (let g = 0; g < SECS / 2; g++) await page.evaluate(() => { for (let i = 0; i < 120 && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); kcRec(); if (i === 119) renderFrame(.1); } });

  const mid = await page.evaluate(() => ({ t: G.t | 0, snaps: KC.snaps.length, fx: KC.fx.length - KC.fh, deaths: KC.deaths.length, best: KC.best && KC.best.score, n: KC.n, msPer: KC.n ? +(KC.ms / KC.n).toFixed(3) : 0, ents: G.ents.length }));
  note('during battle: ' + JSON.stringify(mid));
  if (!mid.best) bug('no biggest moment was recorded');
  if (mid.msPer > 0.5) bug('recording costs ' + mid.msPer + ' ms per sample');
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
  const r0 = await page.evaluate(() => ({ over: G.over, kc: KC.on, endHidden: $('end').hidden, ov: !$('kcOv')?.hidden, sub: $('kcSub')?.textContent }));
  note('at end: ' + JSON.stringify(r0));
  if (!r0.kc) bug('replay did not start');


  const step = n => page.evaluate(n => { for (let i = 0; i < n && KC.on; i++) kcFrame(1 / 30); }, n);
  // play up to just after the biggest kill (the saved frame is taken there), screenshot, then Esc skips the rest
  await page.evaluate(() => { const R = KC.R; for (let i = 0; i < 400 && KC.on && R.rt < R.B.peak.t + .2; i++) kcFrame(1 / 30); });
  note('replay at ' + JSON.stringify(await page.evaluate(() => KC.R ? { rt: +(KC.R.rt - KC.R.B.t0).toFixed(1), peak: +(KC.R.B.peak.t - KC.R.B.t0).toFixed(1), shot: KC.R.shot } : null)));
  await shot(page, `killcam-${VP}-peak.png`);
  await page.evaluate(() => { for (let i = 0; i < 12 && KC.on; i++) kcFrame(1 / 30); });
  await page.keyboard.press('Escape'); await page.evaluate(() => { if (KC.on) kcFrame(1 / 30); });


  for (let i = 0; i < 20 && !(await page.evaluate(() => !!KC.url)); i++) await sleep(500);
  const e1 = await page.evaluate(() => ({ kc: KC.on, endHidden: $('end').hidden, save: $('kcSave') && !$('kcSave').hidden, href: $('kcSave') && $('kcSave').href.slice(0, 5), shot: KC.shot && KC.shot.size, hud: document.body.classList.contains('kcOn') }));
  note('after: ' + JSON.stringify(e1));
  if (e1.kc || e1.endHidden) bug('end screen not shown after the replay');
  if (!e1.save) bug('no Save screenshot button');
  await shot(page, `killcam-${VP}-end.png`);
  // dump the saved picture
  const png = await page.evaluate(async () => { const r = await fetch($('kcSave').href); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); });
  const fs = await import('fs'); const out = new URL('./shots/qa/killcam-' + VP + '-saved.png', import.meta.url); fs.writeFileSync(out, Buffer.from(png, 'base64')); note('saved picture: ' + out.pathname);
  // Play again works
  await page.evaluate(() => $('again').click()); await waitLoaded(page); await sleep(1000);
  const ok = await page.evaluate(() => G && !G.over && $('end').hidden && !KC.on && KC.snaps.length >= 0); if (!ok) bug('Play again failed'); else note('play again ok');
} catch (e) { bug('run aborted: ' + e.message.split('\n')[0]); }
await browser.close(); server.close();
console.log('\nBUGS:\n' + bugs.join('\n') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
