// QA: the end-of-match summary page. Plays a short skirmish against 2 AIs (real AI fighting, sim driven by hand), ends
// it (all enemies destroyed), skips the kill-cam, then checks the scoreboard / awards / army graph / Share picture and
// screenshots them into orch/out/ (endstats-<vp>-top.png, -bottom.png, -share.png).
//   node orch/endstats.mjs [--vp sm|hd|phoneP|phoneL] [--secs 240]
import fs from 'fs'; import path from 'path';
import { ROOT, startServer, launch, openPage, toMenu, waitLoaded, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'sm'), SECS = +A('secs', 240), OUT = path.join(ROOT, 'orch', 'out'); fs.mkdirSync(OUT, { recursive: true });
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  x ' + s); }, note = s => console.log('  ' + s);
const { ctx, page } = await openPage(browser, origin, VP, errs, { dpr: 1 });
page.on('console', m => { if (m.type() === 'error' && !/WebSocket|Failed to load/.test(m.text())) console.log('  CONSOLE ERR ' + m.text().slice(0, 300)); });
await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); } catch (e) {} });
try {
  await toMenu(page, url);
  await page.evaluate(() => { setup.n = 2; setup.map = 'fulda'; setup.others = []; rollAis(); });
  await page.evaluate(() => $('start').click());
  await waitLoaded(page); await sleep(1000);
  // the player's side is run by an AI too, so every side builds, fights and spends; plus a staged clash in mid-map
  await page.evaluate(() => { const T = G.teams[ME]; T.ai = mkAI(1); const cx = MAPW / 2, cy = MAPH / 2;
    const pick = T => { const R = roster(T.fac), out = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && !s.noAttack && s.dmg > 0 && s.cost <= 1600) out.push(k); } return out; };
    G.teams.forEach((T, j) => { const ks = pick(T), a = j * 2.1; for (let i = 0; i < 24; i++) addUnit(T.id, ks[i % ks.length], cx + Math.cos(a) * 160 + (i % 4) * 20, cy + Math.sin(a) * 160 + Math.floor(i / 4) * 20); });
    QUAL.lock = true; QUAL.lv = 5; applyQual(); });
  for (let g = 0; g < SECS / 4; g++) await page.evaluate(() => { for (let i = 0; i < 240 && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); kcRec(); } });
  await page.evaluate(() => { G.teams[ME].ai = null; const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
  await page.evaluate(() => { for (let i = 0; i < 2000 && KC.on; i++) kcFrame(1 / 15); });
  await page.keyboard.press('Escape'); await page.evaluate(() => { if (KC.on) kcFrame(1 / 30); }); await sleep(800);
  const r = await page.evaluate(() => ({ over: G.over, endHidden: $('end').hidden, kc: KC.on, stats: !!G.endStats, cards: document.querySelectorAll('#endStats .esC').length,
    awards: [...document.querySelectorAll('#endStats .esAw')].map(d => d.querySelector('b').textContent + ': ' + d.querySelector('.who').textContent + ' - ' + d.querySelector('.what').textContent),
    graph: !!$('esGraph') && $('esGraph').width > 0, share: $('endShare') && !$('endShare').hidden, blob: ES.blob && ES.blob.size,
    me: G.endStats && G.endStats.p[ME], samples: G.endStats && G.endStats.a.map(a => a.length), hscroll: document.documentElement.scrollWidth > innerWidth + 1 }));
  note('end: ' + JSON.stringify(r));
  if (!r.over || r.endHidden || r.kc) bug('end page not shown');
  if (!r.stats || r.cards !== 3) bug('scoreboard missing (cards ' + r.cards + ')');
  if (!r.awards.length) bug('no awards');
  if (!r.graph) bug('army graph not drawn');
  if (!r.share || !r.blob) bug('Share picture not ready');
  if (r.me && !(r.me.b > 0 && r.me.ku > 0 && r.me.ms > 0)) bug('player numbers look empty');
  if (r.hscroll) bug('page scrolls sideways');
  await page.screenshot({ path: path.join(OUT, `endstats-${VP}-top.png`) });
  await page.evaluate(() => { const o = $('end'); o.scrollTop = o.scrollHeight; }); await sleep(200);
  await page.screenshot({ path: path.join(OUT, `endstats-${VP}-bottom.png`) });
  const png = await page.evaluate(async () => { const b = new Uint8Array(await ES.blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); });
  fs.writeFileSync(path.join(OUT, `endstats-${VP}-share.png`), Buffer.from(png, 'base64'));
  // Share without a share sheet (headless): falls back to download + a picture on the page
  await page.evaluate(() => $('endShare').click()); await sleep(500);
  if (!(await page.evaluate(() => !!$('esPrev')))) bug('Share fallback picture not shown');
  note('shots: orch/out/endstats-' + VP + '-{top,bottom,share}.png');
} catch (e) { bug('run aborted: ' + e.message.split('\n')[0]); }
await browser.close(); server.close();
console.log((bugs.length ? 'ENDSTATS FAIL' : 'ENDSTATS PASS') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
process.exit(bugs.length ? 1 : 0);
