// DUGOUT test (Abdullah 2026-11-13 20:00): Dig in puts the squad INSIDE a dugout (the garrison system), they stay until taken out, saves keep them.
//   node orch/dugouttest.mjs            prints DUGOUT PASS / DUGOUT FAIL      SHOTS=1 also writes pictures to orch/concepts/dugout/
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const OUT = path.join(ROOT, 'orch', 'concepts', 'dugout');
const fails = []; const ck = (c, m) => { console.log((c ? '  ok  ' : '  FAIL ') + m); if (!c) fails.push(m); };
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock(); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium } = await loadPW(); const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' | '))); await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, a) => page.evaluate(fn, a); const shot = async n => { if (!process.env.SHOTS) return; await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, n + '.png'), timeout: 120000 }); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; setup.mode = 'conquest'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('game never loaded'));
  await page.waitForTimeout(1500);
  const R = await ev(() => {
    const o = {}, T = G.teams[ME], hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), inf = roster(T.fac).barracks[0];
    try {
    G.setupEnd = 0; for (const t of G.teams) t.ai = null;
    let C = null; for (let r = 300; r < 1500 && !C; r += 40) for (let a = 0; a < 6.28 && !C; a += .3) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; let ok = x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300; for (let dx = -80; dx <= 80 && ok; dx += 40) for (let dy = -80; dy <= 80 && ok; dy += 40) if (!passXY('ground', x + dx, y + dy) || G.grid[Math.floor((y + dy) / CELL) * GW + Math.floor((x + dx) / CELL)] !== 0 || G.ents.some(e => !e.dead && Math.hypot(e.x - x - dx, e.y - y - dy) < (e.isB ? e.size / 2 + 50 : 70))) ok = false; if (ok) C = { x, y }; }
    o.C = C; const sol = [0, 1, 2, 3, 4, 5].map(i => addUnit(ME, inf, C.x - 25 + (i % 3) * 22, C.y - 12 + Math.floor(i / 3) * 24)); for (const u of sol) { u.vis = true; u.hid = false; }
    o.ids = sol.map(u => u.id); o.n0 = G.civ.length;
    act(ME, { t: 'dig', ids: o.ids }); o.holes = (G.dug || []).filter(d => d.k === 'hole').length; o.civN = G.civ.length - o.n0;
    for (let i = 0; i < 40; i++) simUpdate(.1); o.mid = sol.filter(u => !u.inTun).length;   // still digging (4.5 s): nobody inside yet? (they may enter when the dig is done)
    for (let i = 0; i < 80; i++) simUpdate(.1);
    const c = G.civ.find(q => q.dug && !q.dead); o.c = c ? c.i : -1; o.inside = c ? c.occ.length : -1; o.onMap = sol.filter(u => G.byId.has(u.id)).length; o.gEnt = !!(c && c.g && !c.g.dead);
    // a move order to the former units does nothing
    act(ME, { t: 'go', ids: o.ids, x: C.x + 200, y: C.y, mode: 'move' }); for (let i = 0; i < 30; i++) simUpdate(.1); o.stay = c.occ.length === 6 && sol.every(u => u.inTun);
    // ctrl+A style: whole army move does not pull them out
    act(ME, { t: 'go', ids: G.ents.filter(e => e.team === ME && !e.isB && !e.dead).map(e => e.id), x: C.x + 200, y: C.y, mode: 'move' }); for (let i = 0; i < 10; i++) simUpdate(.1); o.stay2 = c.occ.length === 6;
    // fires from inside
    const en = addUnit(G.teams.find(q => q.id !== ME).id, roster(G.teams.find(q => q.id !== ME).fac).barracks[0], C.x + 120, C.y); en.vis = true; en.max = en.hp = 400;
    for (let i = 0; i < 60; i++) simUpdate(.1); o.fired = en.hp < 400 || en.dead;
    // save / load keeps them inside
    const ck0 = ckEncode(); const js = JSON.parse(JSON.stringify(ck0)); o.ckOcc = js.civ[c.i] && js.civ[c.i].occ && js.civ[c.i].occ.length;
    // client sync list
    const pk = dgPack(T); o.pk = pk && pk.dg.some(v => v[3] === DUGK.indexOf('hole') && v[6] === c.i);
    // leave: select dugout + right click ground
    o.dbg = { occ: c.occ.length, g: !!c.g, dead: c.dead, fd: c.fd, dg: c.dg, t: G.t, ord: sol.map(u => u.order && u.order.type + ':' + u.inTun) };
    if (!c.g) return o;
    act(ME, { t: 'ungar', tid: c.g.id, at: 1, x: C.x - 150, y: C.y }); o.out = c.occ.length === 0 && sol.every(u => G.byId.has(u.id) && !u.inTun); o.gGone = !c.g;
    for (let i = 0; i < 20; i++) simUpdate(.1); o.moving = sol.some(u => u.order || G.t - (u.mv || -9) < 1);
    // empty dugout is reusable: dig in again on top of it
    sol.forEach((u, i) => { u.x = C.x - 20 + i * 8; u.y = C.y + 30; u.order = null; u.path = null; });
    act(ME, { t: 'dig', ids: o.ids }); for (let i = 0; i < 160; i++) simUpdate(.1); o.reuse = G.civ.filter(q => q.dug && !q.dead).length === 1 && c.occ.length >= 5;
    o.dbg2 = { occ: c.occ.length, g: !!c.g, civs: G.civ.filter(q => q.dug && !q.dead).length }; if (c.g) act(ME, { t: 'ungar', tid: c.g.id, at: 0 }); o.fd = c.fd - G.t;
    // fades after a while if unused
    for (let i = 0; i < 1100; i++) simUpdate(.1); o.faded = c.dead && !(G.dug || []).some(d => d.k === 'hole');
    o.civAfter = G.civ.filter(q => q.dug && !q.dead).length;
    } catch (e) { o.err = String(e.stack).slice(0, 400); }
    return o;
  });
  console.log(JSON.stringify(R));
  ck(R.holes === 1 && R.civN === 1, 'six soldiers dig ONE dugout (' + R.holes + ' holes, ' + R.civN + ' new slots)');
  ck(R.inside === 6 && R.onMap === 0, 'the squad is inside the dugout, not on the map (' + R.inside + ' inside, ' + R.onMap + ' on map)');
  ck(R.gEnt, 'the dugout is a selectable garrison entity');
  ck(R.stay && R.stay2, 'move orders (also a whole-army one) do not pull units out of the dugout');
  ck(R.fired, 'units fire from inside');
  ck(R.ckOcc === 6, 'a checkpoint / save keeps six soldiers inside (' + R.ckOcc + ')'); ck(R.pk, 'the dugout is in the client list');
  ck(R.out && R.gGone, 'dugout selected + right-click ground brings them out'); ck(R.moving, 'they walk to the spot');
  ck(R.reuse, 'an empty dugout is reused when infantry dig in again'); ck(R.faded, 'an unused dugout fades away'); 
  if (process.env.SHOTS) {   // pictures for the owner: digging, occupants, selected + leave cursor, squad back out
    const P = await ev(() => { const T = G.teams[ME], hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), inf = roster(T.fac).barracks[0]; let C = null;
      for (let r = 300; r < 1500 && !C; r += 40) for (let a = 0; a < 6.28 && !C; a += .3) { const x = hq.x + Math.cos(a) * r, y = hq.y + Math.sin(a) * r; if (x > 300 && y > 300 && x < MAPW - 300 && y < MAPH - 300 && dugSiteOk(x, y) && !G.ents.some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < (e.isB ? e.size / 2 + 60 : 80))) C = { x, y }; }
      const us = [0, 1, 2, 3, 4, 5, 6, 7].map(i => addUnit(ME, inf, C.x - 30 + (i % 4) * 14, C.y - 8 + Math.floor(i / 4) * 16)); for (const u of us) { u.vis = true; u.hid = false; } window.__us = us; window.__C = C;
      act(ME, { t: 'dig', ids: us.map(u => u.id) }); for (let i = 0; i < 12; i++) simUpdate(.1); return C; });
    const view = async (d, dx = 0, dy = 0) => { await ev(([x, y, d]) => { camTarget(); cam.td = cam.dist = d; centerOn(x, y, true); for (let i = 0; i < 3; i++) renderFrame(.016); }, [P.x + dx, P.y + dy, d]); await page.waitForTimeout(500); await ev(() => { renderFrame(.016); tactFxTick(.5); renderFrame(.016); drawHUD && 0; }); };
    await view(150); await shot('1-squad-digging-in');
    await ev(() => { for (let i = 0; i < 80; i++) simUpdate(.1); G.sel = []; updateUI(); }); await view(150); await shot('2-dugout-with-occupants');
    await ev(() => { const c = G.civ.find(q => q.dug && !q.dead); G.sel = [c.g]; updateUI(); const im = document.createElement('img'); im.id = 'dgcur'; im.src = CURIMG.exit || (curCss('exit'), CURIMG.exit); im.style.cssText = 'position:fixed;z-index:99;left:760px;top:430px;width:32px;height:32px;pointer-events:none'; document.body.append(im); const w = { x: window.__C.x + 70, y: window.__C.y + 40 }; mark({ x: w.x, y: w.y, r: 16, t: 0, d: 5, c: 0x74d08f }); });
    await view(150, 35, 20); await shot('3-dugout-selected-leave');
    await ev(() => { document.getElementById('dgcur').remove(); const c = G.civ.find(q => q.dug && !q.dead); act(ME, { t: 'ungar', tid: c.g.id, at: 1, x: window.__C.x + 70, y: window.__C.y + 40 }); G.sel = window.__us.slice(); for (let i = 0; i < 60; i++) simUpdate(.1); updateUI(); }); await view(150, 35, 20); await shot('4-squad-back-out');
  }

  ck(!errs.length, 'page errors: ' + errs.join(' || '));
} catch (e) { fails.push('crash: ' + (e.stack || e)); }
await browser.close(); server.close();
console.log(fails.length ? 'DUGOUT FAIL\n' + fails.join('\n') : 'DUGOUT PASS'); process.exit(fails.length ? 1 : 0);
