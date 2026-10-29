// QA follow-ups check (orch/reports/followups.md): one skirmish per screen size, then reads what a player sees:
// command-button names that don't fit (Q7) or sit under another panel (Q5), the battle hint line for each mouse scheme
// and on touch, and the Defeat screen text (Q4). Exit 1 on any problem.
//   node orch/qa-followups.mjs [--vp hd,phoneL,phoneP,fhd] [--nat RS] [--css "extra css to try"]
import { startServer, launch, openPage, toMenu, waitLoaded, shot, sleep } from './qa-lib.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VPS = A('vp', 'hd,phoneL').split(','), NAT = A('nat', 'RS'), CSS = A('css', '');
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  ✗ ' + s); }, note = s => console.log('  ' + s);
for (const VP of VPS) {
  const touch = VP.startsWith('phone');
  console.log(`\n=== ${VP} (${NAT}) ===`);
  const { ctx, page } = await openPage(browser, origin, VP, errs, { dpr: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
  await toMenu(page, url);
  await page.evaluate((NAT) => { setup.p = NAT; setup.n = 1; setup.map = 'zagros'; setup.others = []; rollAis(); }, NAT);
  const b = await page.$('#start'); await b.scrollIntoViewIfNeeded(); touch ? await b.tap() : await b.click();
  await waitLoaded(page); await sleep(1500);
  if (CSS) await page.addStyleTag({ content: CSS });
  // ---- every tab: names that don't fit, buttons hidden under something else
  for (const tab of ['build', 'units', 'upg', 'pow']) {
    await page.evaluate(t => { showTab(t); updateUI(); }, tab); await sleep(250);
    if (tab === 'units') await page.evaluate(() => { const f = G.ents.find(e => e.team === ME && e.isB && e.built >= 1 && e.kind !== 'hq'); if (f) { G.sel = [f]; updateUI(); } showTab('units'); });
    await sleep(250); await page.evaluate(() => { try { fitBtnNames(); } catch (e) {} });
    const r = await page.evaluate(() => {
      const pn = $('panel'), P = pn.getBoundingClientRect(), cut = [], under = [], sizes = [];
      for (const b of pn.querySelectorAll('.btn')) { if (b.hidden || !b.offsetParent || getComputedStyle(b).display === 'none') continue;
        const n = b.querySelector('.n'); const nm = b.dataset.nm || (n && n.textContent) || '';
        if (n && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1 || (b.dataset.nm && n.textContent !== b.dataset.nm))) cut.push(nm);
        const c = b.querySelector('.c'); if (c && c.scrollWidth > c.clientWidth + 1) cut.push(nm + ' (cost line)');
        const R = b.getBoundingClientRect(); sizes.push(Math.round(R.width) + 'x' + Math.round(R.height));
        // visible part of the button inside the scrolling grid: whole, or partly showing (a sliver = bad)
        const vis = Math.min(R.right, P.right) - Math.max(R.left, P.left);
        if (vis > 4 && vis < R.width - 2) under.push(nm + ` (${Math.round(vis)}/${Math.round(R.width)} px showing)`);
        else if (vis >= R.width - 2) { const e = document.elementFromPoint(R.left + R.width / 2, R.top + R.height / 2); if (e && !b.contains(e) && e !== pn) under.push(nm + ' under ' + (e.id || e.className || e.tagName)); } }
      const fn = $('facname'); if (fn && fn.offsetParent && (fn.scrollWidth > fn.clientWidth + 1 || fn.scrollHeight > fn.clientHeight + 1)) cut.push('faction name ' + fn.textContent);
      for (const s of document.querySelectorAll('#side .sup .lbl>span:first-child')) if (s.offsetParent && (s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1)) cut.push('side panel ' + s.textContent);
      return { cut, under, sizes: [...new Set(sizes)] };
    });
    note(`${tab}: buttons ${r.sizes.join(',')}` + (r.cut.length ? ` · cut: ${r.cut.join(' | ')}` : '') + (r.under.length ? ` · partly hidden: ${r.under.join(' | ')}` : ''));
    if (r.cut.length) bug(`${VP} ${tab}: names cut: ${r.cut.join(', ')}`);
    if (r.under.length) bug(`${VP} ${tab}: buttons partly hidden: ${r.under.join(', ')}`);
    await shot(page, `fu-${VP}-${tab}.png`);
  }
  // ---- the hint line
  const hints = await page.evaluate(() => { const h = () => $('hint').textContent; const o = {}; const save = JSON.stringify(SET);
    if (TOUCHUI) { o.touch = h(); return o; }
    o.default = h(); Object.assign(SET, MPRE.std); mouseScheme(); o.std = h(); Object.assign(SET, MPRE.gen); mouseScheme(); o.gen = h(); Object.assign(SET, JSON.parse(save)); mouseScheme(); return o; });
  for (const [k, v] of Object.entries(hints)) note(`hint (${k}): ${v}`);
  if (touch) { if (!/tap/i.test(hints.touch || '') || /click/i.test(hints.touch || '')) bug(`${VP}: touch hint talks about the mouse: ${hints.touch}`); }
  else {
    if (!/Right-click: move/i.test(hints.default) || /left-click ground to move/i.test(hints.default)) bug(`${VP}: default (Standard) hint describes another scheme: ${hints.default}`);
    if (!/left-click ground to move/i.test(hints.gen)) bug(`${VP}: Generals hint lacks left-click move: ${hints.gen}`);
  }
  // ---- defeat screen: wipe out my side
  await page.evaluate(() => { for (const e of G.ents.filter(e => e.team === ME && !e.dead)) { e.hp = 0; try { kill(e, 1, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); renderFrame(0.016); });
  const end = await page.evaluate(() => ({ over: G.over, t: $('endt').innerText, s: $('ends').innerText }));
  note(`end: ${end.t} — ${end.s}`);
  if (!end.over) bug(`${VP}: battle did not end after my side was wiped out`);
  else if (!/defeat/i.test(end.t) || /last enemy/i.test(end.s)) bug(`${VP}: defeat screen reads like a win: ${end.t} — ${end.s}`);
  await shot(page, `fu-${VP}-defeat.png`);
  await ctx.close();
}
await browser.close(); server.close();
for (let i = errs.length - 1; i >= 0; i--) if (/toNonIndexed|willReadFrequently|WebSocket connection to 'ws:\/\/127\.0\.0\.1:9/.test(errs[i])) errs.splice(i, 1);   // harmless (qa.md)
if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); }
console.log(bugs.length || errs.length ? `QA-FOLLOWUPS FAIL (${bugs.length} problems, ${errs.length} errors)` : 'QA-FOLLOWUPS PASS');
process.exit(bugs.length || errs.length ? 1 : 0);
