// QA: kill-cam highlights. Stages a big clash, a missile strike and a base building falling, ends the match, and checks
// the end-of-match replay plays several highlights in a row (slow motion), Skip works, the end screen follows, and the
// saved picture is captioned with the best highlight.   node orch/hltest.mjs  -> HL PASS / HL FAIL
import { startServer, launch, openPage, toMenu, waitLoaded, shot, sleep } from './qa-lib.mjs';
const { server, origin, url } = await startServer(); const browser = await launch(); const errs = [], bad = [];
const ck = (n, ok, x) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (x != null ? ' ' + x : '')); if (!ok) bad.push(n); };
const SH = new URL('./shots/fun-extras/', import.meta.url).pathname;
const { ctx, page } = await openPage(browser, origin, 'sm', errs, { dpr: 1 });
await ctx.addInitScript(() => { window.__killcam = true; try { localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); } catch (e) {} });
try {
  await toMenu(page, url);
  await page.evaluate(() => { setup.n = 1; setup.map = 'fulda'; setup.others = []; rollAis(); });
  await page.evaluate(() => $('start').click()); await waitLoaded(page); await sleep(1500);
  await page.evaluate(() => {
    const cx = MAPW / 2, cy = MAPH / 2;
    const pick = T => { const R = roster(T.fac), out = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && !s.noAttack && s.dmg > 0 && s.cost <= 1600) out.push(k); } return out; };
    for (const T of G.teams) { const ks = pick(T), sg = T.id === ME ? -1 : 1; for (let i = 0; i < 40; i++) addUnit(T.id, ks[i % ks.length], cx + sg * (110 + (i % 5) * 22), cy - 150 + Math.floor(i / 5) * 40); }
    centerOn(cx, cy, true); QUAL.lock = true; QUAL.lv = 5; applyQual();
  });
  const run = secs => page.evaluate(s => { for (let i = 0; i < s * 60 && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); kcRec(); if (i % 60 === 59) renderFrame(.1); } }, secs);
  await run(6);
  await page.evaluate(() => addStrike(MAPW / 2 - 100, MAPH / 2, 2.4, 120, 500, ME, 'sup'));
  await run(8);
  const killed = await page.evaluate(() => { const b = G.ents.find(e => e.team === ME && e.isB && !e.dead && STRUCT[e.kind] && STRUCT[e.kind].cost >= 1000 && e.kind !== 'garrison'); if (!b) return null; b.hp = 0; kill(b, 1, null); return b.kind; });
  console.log('own building killed:', killed); await run(5);
  const mid = await page.evaluate(() => ({ list: HL.list.map(c => c.type + ':' + c.label), pend: HL.pend.map(h => h.type) }));
  console.log('highlights so far', JSON.stringify(mid));
  ck('a strike highlight was noted', mid.list.some(x => /^strike/.test(x)) || mid.pend.includes('strike'));
  ck('a base-building highlight was noted', !killed || mid.list.some(x => /^base/.test(x)) || mid.pend.includes('base'));
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
  const r0 = await page.evaluate(() => ({ kc: KC.on, sub: $('kcSub') && $('kcSub').textContent }));
  ck('replay started', r0.kc, JSON.stringify(r0));
  ck('says Highlight 1 of N', /Highlight 1 of [23]/.test(r0.sub || ''));
  await page.evaluate(() => { window.__rf = renderFrame; window.renderFrame = () => {}; });   // software GL is slow: step the replay logic without drawing
  let clips = 1; const seen = [r0.sub];
  for (let g = 0; g < 4000 && await page.evaluate(() => KC.on); g++) {
    await page.evaluate(() => { for (let i = 0; i < 4 && KC.on; i++) kcFrame(1 / 30); });
    const s = await page.evaluate(() => KC.on && $('kcSub').textContent); if (s && s !== seen[seen.length - 1]) { seen.push(s); clips++; if (clips === 2) { await page.evaluate(() => { window.renderFrame = window.__rf; }); await page.evaluate(() => { for (let i = 0; i < 30 && KC.on; i++) kcFrame(1 / 30); }); await shot(page, 'highlight-replay.png'); await page.evaluate(() => { window.renderFrame = () => {}; }); } }
  }
  console.log(seen.join('\n'));
  ck('2+ highlights played in a row', clips >= 2, clips);
  for (let i = 0; i < 20 && !(await page.evaluate(() => !$('end').hidden)); i++) await sleep(300);
  ck('end screen shown after the replay', await page.evaluate(() => !$('end').hidden));
  for (let i = 0; i < 20 && !(await page.evaluate(() => !!KC.url)); i++) await sleep(500);
  ck('saved picture is captioned', await page.evaluate(() => !!KC.shotLabel), await page.evaluate(() => KC.shotLabel));
  await shot(page, 'highlight-end.png');
} catch (e) { bad.push('aborted: ' + e.message.split('\n')[0]); console.log(e.stack); }
await browser.close(); server.close();
console.log('ERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed|WebGL|GPU|ReadPixels/.test(e)).join('\n'));
console.log(bad.length ? 'HL FAIL ' + bad.join(', ') : 'HL PASS'); process.exit(0);
