// sweepfixB proof pictures (Conquest/Battle HUD polish): order buttons with an army / the dozer selected, build bar per
// nation, in-game Settings, Victory screen. JPGs -> orch/concepts/sweepfixB/<tag>-*.jpg
//   node orch/sweepfixB.mjs --tag after [--w 1280] [--nat IR] [--parts army,doz,bar,settings,end] [--mode conquest]
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, startServer, launch, sleep } from './qa-lib.mjs';
import { guardContext } from './serverdev.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = A('tag', 'after'), W = +A('w', 1280), H = Math.round(W * 9 / 16), NAT = A('nat', 'IR'), MODE = A('mode', 'conquest');
const PARTS = A('parts', 'army,doz,bar,settings,end').split(','), BARN = A('bar', 'IR,RS').split(',');
const OUT = path.join(ROOT, 'orch', 'concepts', 'sweepfixB'); fs.mkdirSync(OUT, { recursive: true });
const { server, url } = await startServer();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await guardContext(ctx);
await ctx.addInitScript(() => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); localStorage.setItem('ww3_gfx', 'low'); } catch (e) {} });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push((e.message || '').slice(0, 200)));
const log = s => console.log(s);
const shot = async name => { await sleep(700); const p = path.join(OUT, TAG + '-' + name + '-' + W + '.jpg');
  try { await page.screenshot({ path: p, type: 'jpeg', quality: 60, timeout: 240000 }); log('shot ' + path.basename(p) + ' ' + (fs.statSync(p).size >> 10) + 'KB'); } catch (e) { log('shot FAILED ' + String(e.message).split('\n')[0]); } };
const ui = () => page.evaluate(() => { try { updateUI(); } catch (e) {} });
await page.goto(url + (url.includes('?') ? '&' : '?') + 'lazy=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof setup === 'object', null, { timeout: 120000 });
await sleep(1500);
async function start(nat) {
  const t0 = Date.now();
  await page.evaluate(([nat, mode]) => { setup.mode = mode; setup.p = nat; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); }, [nat, MODE]);
  await page.waitForFunction(() => typeof G !== 'undefined' && G && !window.LOADING, null, { timeout: 900000, polling: 1000 });
  log('loaded ' + nat + ' in ' + Math.round((Date.now() - t0) / 1000) + 's');
  await page.evaluate(() => { const h = G.ents.find(e => e.team === ME && e.isB && !e.dead); if (h) centerOn(h.x, h.y, true); G.sel = []; updateUI(); });
}
// what the order corner looks like: every visible order button, cut text, overlap with the bottom bar
const corner = () => page.evaluate(() => { const bs = [...document.querySelectorAll('#info .cmdrow button')].filter(b => b.offsetParent);
  const side = document.getElementById('side').getBoundingClientRect();
  return { n: bs.length, cut: bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent), low: bs.filter(b => b.getBoundingClientRect().bottom > side.top + 1).length,
    txt: bs.map(b => b.textContent).join(' | ') }; });
await start(NAT);
if (PARTS.includes('army')) {
  await page.evaluate(() => { const T = G.teams[ME], R = roster(T.fac), ks = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && s.dmg > 0) ks.push(k); }
    const h = G.ents.find(e => e.team === ME && e.isB && !e.dead); for (let i = 0; i < 12; i++) addUnit(ME, ks[i % Math.min(ks.length, 4)], h.x + 120 + (i % 4) * 18, h.y + 90 + Math.floor(i / 4) * 18);
    G.sel = G.ents.filter(e => e.team === ME && !e.dead && !e.isB && e.kind !== 'dozer'); centerOn(h.x + 150, h.y + 110, true); updateUI(); });
  await ui(); log('ARMY ' + JSON.stringify(await corner())); await shot('army');
  await page.evaluate(() => { G.sel = G.ents.filter(e => e.team === ME && !e.dead && !e.isB); updateUI(); });
  log('ALLARMY ' + JSON.stringify(await corner())); await shot('allarmy');
}
if (PARTS.includes('doz')) {
  await page.evaluate(() => { const d = G.ents.find(e => e.team === ME && !e.dead && e.kind === 'dozer'); G.sel = d ? [d] : []; if (d) centerOn(d.x, d.y, true); updateUI(); });
  log('DOZER ' + JSON.stringify(await corner())); await shot('dozer');
}
if (PARTS.includes('bar')) {
  for (const n of BARN) {
    if (n !== NAT) { await page.evaluate(() => { G.over = 1; }); await start(n); }
    await page.evaluate(() => { const d = G.ents.find(e => e.team === ME && !e.dead && e.kind === 'dozer'); G.sel = d ? [d] : []; updateUI(); const b = document.querySelector('.tabs button[data-tab="build"]'); if (b) b.click(); });
    log('BAR ' + n + ' ' + JSON.stringify(await page.evaluate(() => { const cut = [...document.querySelectorAll('#panel .btn .n')].filter(e => e.offsetParent && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 3)).map(e => e.textContent);
      const f = document.getElementById('facname'), c = document.getElementById('credits'); const fr = f && f.getBoundingClientRect(), cr = c && c.getBoundingClientRect();
      const hd = f && f.parentElement; return { hdr: hd && [...hd.children].map(c => (c.id || c.className || c.tagName) + ':' + Math.round(c.getBoundingClientRect().width)).join(','), hdrW: hd && Math.round(hd.getBoundingClientRect().width), hdrId: hd && (hd.id || hd.className), cut, fac: f && f.textContent, facFont: f && getComputedStyle(f).fontSize, facCut: f && f.scrollWidth > f.clientWidth + 1, facH: fr && Math.round(fr.height), facLines: f ? Math.round(fr.height / parseFloat(getComputedStyle(f).lineHeight || 16)) : 0, overlap: fr && cr ? fr.right > cr.left && fr.left < cr.right && fr.bottom > cr.top && fr.top < cr.bottom : null }; })));
    await shot('bar-' + n);
  }
}
if (PARTS.includes('settings')) {
  await page.evaluate(() => togglePause(true)); await sleep(300);
  await page.evaluate(() => { const b = document.getElementById('pSettings'); if (b) b.click(); }); await sleep(400);
  log('SETTINGS ' + JSON.stringify(await page.evaluate(() => { const t = document.getElementById('topbar') || document.querySelector('#top,#hud'); const s = document.getElementById('settings');
    const pick = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) + '' : ''; };
    return { top: pick(innerWidth / 2, 20), settingsZ: s && getComputedStyle(s).zIndex, r: s && JSON.stringify(s.getBoundingClientRect()) }; })));
  await shot('settings');
  await page.keyboard.press('Escape'); await sleep(300); await page.keyboard.press('Escape'); await sleep(300); await page.evaluate(() => { try { togglePause(false); } catch (e) {} });
}
if (PARTS.includes('end')) {
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 400 && !G.over; i++) simUpdate(1 / 30); });
  await page.evaluate(() => { if (typeof KC !== 'undefined') for (let i = 0; i < 400 && KC.on; i++) kcFrame(1 / 15); }); await page.keyboard.press('Escape'); await sleep(1500);
  log('END ' + JSON.stringify(await page.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, 20); return { over: !!G.over, top: e ? (e.id || e.className || e.tagName) + '' : '' }; })));
  await shot('victory');
}
log('PAGEERRORS ' + [...new Set(errs)].slice(0, 6).join(' || '));
await browser.close(); server.close(); process.exit(0);
