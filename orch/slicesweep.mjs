// Slice sweep (audit, no game changes): pictures of the first ten minutes of Conquest and Battle at PC 1600x900 for the
// slice nations (IR RS DW RV IL SA US). JPGs -> orch/concepts/slicesweep/. Report: orch/reports/slice-sweep.md.
//   node orch/slicesweep.mjs --part menu|game|nations|online [--mode conquest|battle] [--nat IR] [--nats IR,RS]
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, startServer, launch, sleep, layoutAudit } from './qa-lib.mjs';
import { guardContext } from './serverdev.mjs';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PART = A('part', 'menu'), MODE = A('mode', 'conquest'), NAT = A('nat', 'IR'), NATS = A('nats', 'IR,RS,DW,RV,IL,SA,US').split(',');
const OUT = path.join(ROOT, 'orch', 'concepts', 'slicesweep'); fs.mkdirSync(OUT, { recursive: true });
const { server, origin, url } = await startServer();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
const errs = []; page.on('pageerror', e => errs.push((e.message || '').slice(0, 200)));
const log = s => console.log(s);
const shot = async (name, clip) => { await sleep(900); try { await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 62, clip, timeout: 240000 });
  const kb = fs.statSync(path.join(OUT, name + '.jpg')).size >> 10; log('shot ' + name + ' ' + kb + 'KB'); } catch (e) { log('shot ' + name + ' FAILED ' + String(e.message).split('\n')[0]); } };
const audit = async tag => { const a = await layoutAudit(page).catch(() => null); if (a && (a.offscreen.length || a.clipped.length || a.overlaps.length)) log('AUDIT ' + tag + ' ' + JSON.stringify({ off: a.offscreen.slice(0, 6), clip: a.clipped.slice(0, 6), ov: a.overlaps.slice(0, 6) })); };
const mx = t => page.evaluate(t => { const e = [...document.querySelectorAll('#ms-' + MX.cur + ' .mxi,#ms-' + MX.cur + ' .mxgo,#ms-' + MX.cur + ' .mxlink')].find(x => x.offsetParent && (x.textContent || '').trim().toLowerCase().startsWith(t)); if (!e) return false; e.click(); return true; }, t);
const text = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 900), sel);
async function boot(fresh) {
  if (!fresh) await ctx.addInitScript(() => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof menuGo === 'function' && typeof MX !== 'undefined' && MX.screens && MX.screens.title, null, { timeout: 120000 });
  await sleep(2500);
}
async function setupTo(mode, nat, pre) {
  await mx('single player'); await sleep(700); if (pre) await shot(pre + 'single');
  await mx(mode); await sleep(900); if (pre) { await shot(pre + 'map'); await audit('map'); log('MAPTEXT ' + await text('#ms-c-map .mxsub')); }
  await page.evaluate(() => document.querySelector('#mx .mxmap:nth-child(1)').click()); await sleep(900);
  const mapBefore = await page.evaluate(() => setup.map);
  if (pre) { await page.locator('#pickP .fac').nth(await page.evaluate(n => FKEYS.indexOf(n), nat)).hover(); await shot(pre + 'nation-hover-' + nat); log('DET ' + await text('#mxdet')); }
  await page.locator('#pickP .fac').nth(await page.evaluate(n => FKEYS.indexOf(n), nat)).click(); await sleep(900); await page.mouse.move(1500, 120);
  log('map before nation pick ' + mapBefore + ' after ' + await page.evaluate(() => setup.map) + ' screen ' + await page.evaluate(() => MX.cur));
  if (pre) { await shot(pre + 'players'); await audit('players'); await page.evaluate(() => menuGo('c-opts')); await sleep(700); await shot(pre + 'options'); await audit('opts'); await page.evaluate(() => menuBack()); await sleep(500); }
}
async function start(pre) {
  await mx('start '); const t0 = Date.now();
  if (pre) { for (const ms of [2500, 15000]) { await sleep(ms); if (await page.evaluate(() => !!window.LOADING)) await shot(pre + 'loading-' + Math.round((Date.now() - t0) / 1000) + 's'); } }
  await page.waitForFunction(() => typeof G !== 'undefined' && G && !window.LOADING, null, { timeout: 900000, polling: 1000 });
  log('loaded in ' + Math.round((Date.now() - t0) / 1000) + 's, battle=' + await page.evaluate(() => G.battle) + ' conq=' + await page.evaluate(() => G.conq));
}
const ui = () => page.evaluate(() => { try { updateUI(); } catch (e) {} });
const step = (s) => page.evaluate(s => { for (let i = 0; i < s * 30; i++) simUpdate(1 / 30); try { updateUI(); } catch (e) {} }, s);
const scr = (x, y) => page.evaluate(([x, y]) => toScreen(x, 0, y), [x, y]);
async function game(mode, nat) {
  const P = (mode === 'battle' ? 'b' : 'c') + '-';
  await boot(false); await setupTo(mode, nat, P); await start(P);
  await shot(P + '10-second0-' + nat); log('TOPBAR ' + await text('#top, #hud, #res'));
  log('ALLTEXT0 ' + await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200)));
  await audit('second0');
  const own = await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.dead); return { units: u.filter(e => !e.isB).map(e => e.kind), blds: u.filter(e => e.isB).map(e => e.kind), cr: Math.floor(G.teams[ME].credits) }; });
  log('OWN ' + JSON.stringify(own));
  // select the builder (dozer / construction vehicle) or the HQ -> build bar
  const sel = await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.dead); const d = u.find(e => /dozer|cv|eng|worker|build/i.test(e.kind) && !e.isB) || u.find(e => e.kind === 'hq'); G.sel = d ? [d] : []; if (d) centerOn(d.x, d.y, true); updateUI(); return d && d.kind; });
  await shot(P + '11-buildbar-' + sel); log('PANEL ' + await text('#panel')); await audit('buildbar');
  for (const tab of ['units', 'upg', 'pow']) { const ok = await page.evaluate(t => { const b = document.querySelector('.tabs button[data-tab="' + t + '"]'); if (!b || !b.offsetParent) return false; b.click(); return true; }, tab); if (ok) { await shot(P + '12-tab-' + tab); log('TAB ' + tab + ' ' + await text('#panel')); } }
  log('TABS ' + await page.evaluate(() => [...document.querySelectorAll('.tabs button')].map(b => b.dataset.tab + ':' + b.textContent.trim() + (b.offsetParent ? '' : '(hidden)')).join(', ')));
  // building placement: click the first enabled build button and hover the ground near base
  await page.evaluate(() => { const b = document.querySelector('.tabs button[data-tab="build"]'); if (b) b.click(); });
  const placed = await page.evaluate(() => { const b = [...document.querySelectorAll('#panel .btn')].find(x => x.offsetParent && !x.disabled && !x.classList.contains('dis')); if (!b) return null; b.click(); return b.innerText.replace(/\s+/g, ' ').slice(0, 40); });
  const hq = await page.evaluate(() => { const h = G.ents.find(e => e.team === ME && e.isB && !e.dead); centerOn(h.x, h.y, true); return { x: h.x, y: h.y }; });
  await sleep(400); await page.mouse.move(800, 380); await page.mouse.move(820, 390); await shot(P + '13-placing-' + (placed || 'none').split(' ')[0]);
  log('PLACING ' + placed + ' mode=' + await page.evaluate(() => JSON.stringify(typeof PLACE !== 'undefined' ? PLACE : null)?.slice(0, 120)));
  await page.mouse.click(820, 390); await sleep(300); await page.keyboard.press('Escape'); await sleep(300);
  // give the player an army near base, then mouse-drive the orders
  await page.evaluate(() => { const T = G.teams[ME]; const R = roster(T.fac), ks = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && s.dmg > 0) ks.push(k); }
    const h = G.ents.find(e => e.team === ME && e.isB && !e.dead); for (let i = 0; i < 16; i++) addUnit(ME, ks[i % Math.min(ks.length, 5)], h.x + 120 + (i % 4) * 18, h.y + 90 + Math.floor(i / 4) * 18); centerOn(h.x + 150, h.y + 110, true); G.sel = []; updateUI(); });
  await step(0.5);
  const box = await page.evaluate(() => { const L = G.ents.filter(e => e.team === ME && !e.dead && !e.isB && e.kind !== 'dozer'); const pts = L.map(e => toScreen(e.x, 0, e.y)).filter(p => p.x > 0 && p.x < VW && p.y > 0 && p.y < VH);
    if (!pts.length) return null; return { x0: Math.min(...pts.map(p => p.x)) - 30, y0: Math.min(...pts.map(p => p.y)) - 30, x1: Math.max(...pts.map(p => p.x)) + 30, y1: Math.max(...pts.map(p => p.y)) + 30, n: pts.length }; });
  log('BOX ' + JSON.stringify(box));
  if (box) {
    await page.mouse.move(box.x0, box.y0); await page.mouse.down(); await page.mouse.move((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, { steps: 4 }); await page.mouse.move(box.x1, box.y1, { steps: 4 });
    await shot(P + '14-box-dragging'); await page.mouse.up(); await sleep(300);
    log('SELECTED ' + await page.evaluate(() => G.sel.length + ' ' + [...new Set(G.sel.map(e => e.kind))].join(',')));
    await shot(P + '15-selected-army'); log('INFO ' + await text('#info')); log('PANEL ' + await text('#panel'));
    await page.mouse.click(1150, 330, { button: 'right' }); await sleep(200); await shot(P + '16-rightclick-move');
    log('DESELECT_AFTER_ORDER sel=' + await page.evaluate(() => G.sel.length));
    await page.evaluate(() => { G.sel = G.ents.filter(e => e.team === ME && !e.dead && !e.isB && e.kind !== 'dozer'); updateUI(); });
    await page.mouse.move(700, 600); await page.mouse.down({ button: 'right' }); await page.mouse.move(850, 640, { steps: 5 }); await page.mouse.move(1000, 660, { steps: 5 });
    await shot(P + '17-rightdrag-line'); await page.mouse.up({ button: 'right' }); await sleep(300); await step(1); await shot(P + '17b-line-after');
    await page.evaluate(() => { G.sel = G.ents.filter(e => e.team === ME && !e.dead && !e.isB && e.kind !== 'dozer'); updateUI(); });
    await page.keyboard.down('f'); await page.mouse.click(1200, 250); await page.keyboard.up('f'); await sleep(200); await shot(P + '18-attackmove');
  }
  // minimap crop
  const mm = await page.evaluate(() => { const m = document.getElementById('mm'); if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (mm) await shot(P + '19-minimap', { x: Math.max(0, mm.x - 8), y: Math.max(0, mm.y - 8), width: Math.min(1600, mm.w + 16), height: Math.min(900, mm.h + 16) });
  // alerts: enemy raid into the base, run 25 s
  await page.evaluate(() => { const en = G.teams.find(T => T.id !== ME && !T.reb); const R = roster(en.fac), ks = []; for (const c in R) for (const k of R[c]) { const s = stats(en.fac, k); if (s.dom === 'ground' && s.dmg > 0) ks.push(k); }
    const h = G.ents.find(e => e.team === ME && e.isB && !e.dead); for (let i = 0; i < 10; i++) addUnit(en.id, ks[i % Math.min(3, ks.length)], h.x - 160 + (i % 3) * 15, h.y - 120 + Math.floor(i / 3) * 15); const far = G.ents.find(e => e.team === ME && !e.dead && !e.isB); centerOn(h.x + 500, h.y + 400, true); });
  await step(6); await shot(P + '20-alert-under-attack'); log('ALERTS ' + await text('#alerts, .alert, #toast, #evlog, .toast'));
  // a short mid-game glance (light sim only; the sandbox cannot run 10 real minutes)
  await page.evaluate(() => { G.teams[ME].ai = mkAI(1); });
  for (let g = 0; g < 4; g++) await step(12);
  await page.evaluate(() => { G.teams[ME].ai = null; const h = G.ents.find(e => e.team === ME && e.isB && !e.dead && e.kind === 'hq') || G.ents.find(e => e.team === ME && e.isB && !e.dead); if (h) centerOn(h.x, h.y, true); G.sel = []; updateUI(); });
  await shot(P + '22-midgame-base'); log('T=' + await page.evaluate(() => Math.round(G.t)) + ' OWN ' + await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.dead); return u.filter(e => e.isB).length + ' blds ' + u.filter(e => !e.isB).length + ' units $' + Math.floor(G.teams[ME].credits); }));
  // pause + settings
  await page.evaluate(() => togglePause(true)); await shot(P + '23-pause'); log('PAUSE ' + await text('#pauseOv'));
  await page.evaluate(() => { const b = document.getElementById('pSettings'); if (b) b.click(); }); await shot(P + '24-settings'); log('SETTINGS ' + await text('#settings'));
  await page.evaluate(() => { const b = document.querySelector('#settings .uk-tab[data-pt="ctl"]'); if (b) b.click(); }); await shot(P + '25-settings-controls');
  await page.keyboard.press('Escape'); await sleep(300); await page.keyboard.press('Escape'); await sleep(300); await page.evaluate(() => { try { togglePause(false); } catch (e) {} });
  // win: destroy every enemy building and unit
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 400 && !G.over; i++) simUpdate(1 / 30); });
  await page.evaluate(() => { if (typeof KC !== 'undefined') for (let i = 0; i < 400 && KC.on; i++) kcFrame(1 / 15); }); await page.keyboard.press('Escape'); await sleep(1500);
  await shot(P + '26-end-win-top'); log('END ' + await page.evaluate(() => ({ over: G.over, end: !document.getElementById('end').hidden })).then(JSON.stringify)); log('ENDTEXT ' + await text('#end'));
  await page.evaluate(() => { const o = document.getElementById('end'); if (o) o.scrollTop = o.scrollHeight; }); await shot(P + '27-end-win-bottom'); await audit('end');
}
async function nations(mode) {
  const P = (mode === 'battle' ? 'b' : 'c') + '-nat-';
  await boot(false);
  for (const n of NATS) {
    await page.evaluate(() => { try { if (typeof G !== 'undefined' && G) { G.over = 1; } } catch (e) {} menuHome(); document.getElementById('menu').hidden = false; });
    await sleep(800); await setupTo(mode, n, null); await start(null);
    const sel = await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.dead); const d = u.find(e => /dozer|cv|eng|worker|build/i.test(e.kind) && !e.isB) || u.find(e => e.kind === 'hq'); G.sel = d ? [d] : []; const h = u.find(e => e.kind === 'hq') || d; if (h) centerOn(h.x, h.y, true); updateUI(); return d && d.kind; });
    await shot(P + n + '-second0'); log(n + ' map=' + await page.evaluate(() => setup.map) + ' sel=' + sel + ' PANEL ' + await text('#panel'));
    log(n + ' OWN ' + await page.evaluate(() => { const u = G.ents.filter(e => e.team === ME && !e.dead); return JSON.stringify({ b: u.filter(e => e.isB).map(e => e.kind), u: u.filter(e => !e.isB).length, cr: Math.floor(G.teams[ME].credits) }); }));
    await page.evaluate(() => { const L = G.ents.filter(e => e.team === ME && !e.dead && !e.isB); G.sel = L; if (L[0]) centerOn(L[0].x, L[0].y, true); updateUI(); });
    await shot(P + n + '-army'); log(n + ' INFO ' + await text('#info'));
  }
}
async function online() {
  await boot(false);
  await mx('multiplayer'); await sleep(900); await shot('o-01-multiplayer'); await audit('mp'); log('MPTEXT ' + await text('#ms-online'));
  for (const g of ['conquest', 'battle']) { await page.evaluate(g => MX.olBtns[g].click(), g); await sleep(2500); await shot('o-02-' + g); log('OL ' + g + ' cur=' + await page.evaluate(() => MX.cur) + ' ' + await text('#ms-online, #lobby, .lobby'));
    await audit('ol-' + g); }
}
async function menu() {
  await boot(true); await shot('m-00-title-firstrun'); log('TITLE ' + await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 600))); await audit('title');
  await mx('single player'); await sleep(800); await shot('m-01-single'); log('SP ' + await text('#ms-single'));
  await mx('battle'); await sleep(800); await shot('m-02-battle-map'); log('BMAP ' + await text('#ms-c-map .mxsub'));
  log('MAPS ' + await page.evaluate(() => [...document.querySelectorAll('#mx .mxmap')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' | ').slice(0, 1500)));
  await sleep(6000); await shot('m-02b-battle-map-after6s'); await page.evaluate(() => document.querySelector('#mx .mxmap:nth-child(3)').click()); await sleep(800);
  await shot('m-03-nation-list'); log('NATS ' + await page.evaluate(() => [...document.querySelectorAll('#pickP .fac .nm')].map(e => e.textContent).join(', ')));
  await page.locator('#pickP .fac').nth(await page.evaluate(() => FKEYS.indexOf('RS'))).hover(); await sleep(1200); await shot('m-04-nation-RS-hover'); log('DET-RS ' + await text('#mxdet'));
  for (const k of ['DW', 'RV', 'IL', 'SA', 'US']) { await page.locator('#pickP .fac').nth(await page.evaluate(k => FKEYS.indexOf(k), k)).hover(); await sleep(400); log('DET-' + k + ' ' + await text('#mxdet')); }
  await page.evaluate(() => { const b = [...document.querySelectorAll('#menu .mxi')].find(x => /^settings/i.test(x.textContent.trim())); });
  await page.evaluate(() => menuHome()); await sleep(500); await mx('settings'); await sleep(900); await shot('m-05-settings-from-menu'); await page.keyboard.press('Escape'); await sleep(500);
  await mx('extras'); await sleep(700); await shot('m-06-extras');
}
try {
  if (PART === 'menu') await menu(); else if (PART === 'game') await game(MODE, NAT); else if (PART === 'nations') await nations(MODE); else if (PART === 'online') await online();
} catch (e) { log('ABORT ' + String(e.message || e).split('\n').slice(0, 2).join(' ')); await shot('zz-abort-' + PART + '-' + MODE); }
log('PAGEERRORS ' + [...new Set(errs)].slice(0, 8).join(' || '));
await browser.close(); server.close(); process.exit(0);
