// Shots + checks for helper extras-command (edge alerts, photo mode mark, slow-motion command, draw your plan).
//   node orch/extrascmd.mjs [edge|photo|slow|all]     screenshots -> orch/shots/extras-command/ (1600x900)
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, openPage, toMenu, waitLoaded, sleep, ROOT } from './qa-lib.mjs';
const WHAT = process.argv[2] || 'all', OUT = path.join(ROOT, 'orch', 'shots', 'extras-command');
fs.mkdirSync(OUT, { recursive: true });
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  x ' + s); }, note = s => console.log('  [' + Math.round(performance.now() / 1000) + 's] ' + s);
const { ctx, page } = await openPage(browser, origin, 'hd', errs, { dpr: 1 });
await page.setViewportSize({ width: 1600, height: 900 });
const shot = async n => { try { await page.screenshot({ path: path.join(OUT, n + '.png'), timeout: 120000 }); } catch (e) { note('shot ' + n + ' skipped'); } };
const frames = (n, dt = 1 / 30) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { if (window.PHX && PHX.on) PHX.frame(dt); else renderFrame(dt); } }, [n, dt]);
const want = k => WHAT === 'all' || WHAT === k;
try {
  await toMenu(page, url);
  await page.evaluate(() => { setup.n = 1; setup.map = 'fulda'; setup.others = []; rollAis(); });
  await page.evaluate(() => $('start').click());
  await waitLoaded(page); await sleep(1500);
  await page.evaluate(() => {
    const cx = MAPW / 2, cy = MAPH / 2;
    const pick = T => { const R = roster(T.fac), out = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && !s.noAttack && s.dmg > 0 && s.cost <= 1600) out.push(k); } return out; };
    for (const T of G.teams) { const ks = pick(T), sg = T.id === ME ? -1 : 1; for (let i = 0; i < 40; i++) { const k = ks[i % ks.length]; addUnit(T.id, k, cx + sg * (110 + (i % 5) * 22), cy - 150 + Math.floor(i / 5) * 40); } }
    centerOn(cx, cy, true); QUAL.lock = true; QUAL.lv = 5; applyQual();
  });
  note('battle up'); await frames(4); note('frames ok');
  if (WHAT === 'base') await shot('00-base');
  if (want('edge')) {
    await page.evaluate(() => { EDGE.LIFE = 1e12; const b = G.ents.filter(e => e.isB && e.team === ME)[0]; window.__hq = { x: b.x, y: b.y };
      const far = [[MAPW - 200, 300], [200, MAPH - 200], [MAPW - 300, MAPH - 300]];
      pushLog('Old alert.', 'g', 300, 300); pushLog('Tank ready.', '', MAPW / 2 + 20, MAPH / 2);   // oldest is pushed out (max 4); on screen: no arrow
      pushLog('Our base is under attack!', 'r:base', b.x, b.y); pushLog('Unit lost.', 'r:lost', far[0][0], far[0][1]);
      pushLog('Barracks complete.', 'g', far[1][0], far[1][1]); FXH.mping(ME === 0 ? 0 : ME, 1, far[2][0], far[2][1]); edgeAlert('Ally ping', 'ping', far[2][0], far[2][1]);
      });
    await frames(3); await shot('15-edge-alerts');
    const st = await page.evaluate(() => { const bs = [...document.querySelectorAll('#edgeAl button')].filter(b => b.style.display !== 'none'), r = b => b.getBoundingClientRect();
      const hit = (a, id) => { const e = document.getElementById(id); if (!e || e.offsetParent === null) return false; const q = e.getBoundingClientRect(); return !(a.right < q.left || a.left > q.right || a.bottom < q.top || a.top > q.bottom); };
      return { n: bs.length, all: EDGE.a.length, kinds: bs.map(b => b.dataset.k).sort().join(','), over: bs.some(b => ['side', 'hudBar', 'mm', 'mini'].some(id => hit(r(b), id))), cam: [cam.tx, cam.ty] }; });
    note('edge ' + JSON.stringify(st));
    if (st.all !== 4) bug('edge: wanted 4 alerts kept (newest wins), got ' + st.all);
    if (st.over) bug('edge: an arrow sits over the command bar / top bar / minimap');
    if (st.n !== 3 && st.n !== 4) bug('edge: wanted 2-4 arrows on the edge, got ' + st.n);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#edgeAl button')].find(b => b.dataset.k === 'lost'); b.click(); });
    await frames(2);
    const c2 = await page.evaluate(() => ({ d: Math.hypot(cam.tx - (MAPW - 200), cam.ty - 300), n: EDGE.a.length }));
    if (c2.d > 400) bug('edge: clicking the arrow did not move the camera there (' + Math.round(c2.d) + ')');
    if (c2.n !== 3) bug('edge: clicked arrow should go away, left ' + c2.n);
    if (!(await page.evaluate(() => EDGE.last && EDGE.last.kind === 'ping'))) bug('edge: EDGE.last (the shared feed entry) is not the newest alert');
    await page.evaluate(() => { centerOn(MAPW / 2, MAPH / 2, true); for (const q of EDGE.a) q.t = -1e13; }); await frames(2);
    if (await page.evaluate(() => document.querySelectorAll('#edgeAl button').length)) bug('edge: arrows did not expire');
  }
  if (want('photo')) {
    await page.evaluate(() => { centerOn(MAPW / 2 - 120, MAPH / 2, true); }); await frames(2);
    const before = await page.evaluate(() => JSON.stringify([cam.x, cam.y, cam.dist, cam.tilt, cam.yaw, G.paused]));
    await page.evaluate(() => { window.__dl = 0; HTMLAnchorElement.prototype.click = function () { if (this.id === 'phDl') window.__dl++; }; });
    if (!(await page.evaluate(() => phEnter()))) bug('photo: could not enter photo mode');
    await page.evaluate(() => { cam.dist = 250; cam.pitch = .26; cam.ryaw = .5; PHX.look = 1; phLook(); }); await frames(3);
    const hud = await page.evaluate(() => ['side', 'hudBar', 'edgeAl', 'log'].filter(id => { const e = document.getElementById(id); return e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0; }));
    if (hud.length) bug('photo: HUD still visible: ' + hud.join(','));
    if (!(await page.evaluate(() => G.paused))) bug('photo: single-player battle is not paused');
    await page.evaluate(() => $('phSave').click()); await frames(1);
    await page.waitForFunction(() => !!PHX.blob, null, { timeout: 120000 }).catch(() => bug('photo: no picture'));
    const b64 = await page.evaluate(async () => { const b = PHX.blob; if (!b) return ''; const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); });
    if (b64) fs.writeFileSync(path.join(OUT, '16-photo.png'), Buffer.from(b64, 'base64'));
    const ph = await page.evaluate(() => ({ dl: window.__dl, size: PHX.size, mark: typeof phMark === 'function' && /WORLD WAR 3/.test(String(phMark)) }));
    note('photo ' + JSON.stringify(ph) + ' ' + Math.round(b64.length / 1366) + ' KB');
    if (ph.dl !== 1) bug('photo: the picture was not saved (download) exactly once: ' + ph.dl);
    if (!ph.mark) bug('photo: no WORLD WAR 3 mark');
    await page.keyboard.press('Escape'); await frames(2);
    const after = await page.evaluate(() => JSON.stringify([cam.x, cam.y, cam.dist, cam.tilt, cam.yaw, G.paused]));
    if (after !== before) bug('photo: Esc did not return to the previous view: ' + before + ' -> ' + after);
    if (await page.evaluate(() => PHX.on || document.body.classList.contains('phOn') || $('side').offsetParent === null)) bug('photo: HUD did not come back');
  }
  //SLOW
} catch (e) { bug('threw: ' + (e && e.message)); }
for (const e of errs) if (!/favicon|ERR_|net::|404|console warning/.test(e)) bug('console: ' + String(e).slice(0, 200));
await browser.close(); server.close();
console.log(bugs.length ? 'EXTRASCMD FAIL (' + bugs.length + ')' : 'EXTRASCMD PASS');
process.exit(bugs.length ? 1 : 0);
