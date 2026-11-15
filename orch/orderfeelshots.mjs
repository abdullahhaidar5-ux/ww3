// Proof pictures for the "orderfeel" pass (selection rings, order markers, goal line): a selected mixed group (infantry +
// tanks), a move order marker, an attack-move marker, a right-drag line ghost, the Conquest and the Battle goal line.
//   node orch/orderfeelshots.mjs [--tag before|after]   -> orch/concepts/orderfeel/<tag>-*.jpg (1280x720 JPG)
// Also prints ORDERFEEL numbers (ring instances, order markers alive) so a run can be compared without looking.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : 'after';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
await acquireBrowserLock('orderfeelshots');
const SH = path.join(ROOT, 'orch', 'concepts', 'orderfeel'); fs.mkdirSync(SH, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = k => !ONLY || ONLY.includes(k);

async function game(mode) {
  const ctx = await browser.newContext({ viewport: process.env.DBG ? { width: 480, height: 300 } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} SET.mLock = 0; setup.n = 1; setup.map = 'fulda'; setup.mode = m; startSingle(); }, mode);
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.ents && G.ents.length, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; for (const T of G.teams) if (T.ai) T.ai = null; });
  return { ctx, page };
}
const shot = async (page, name, wait = 1200) => { await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/^Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; }); await page.waitForTimeout(wait); await page.screenshot({ path: path.join(SH, `${TAG}-${name}.jpg`), type: 'jpeg', quality: 78, timeout: 300000 }); console.log('shot', `${TAG}-${name}.jpg`); };
// software GL needs ~1 min per frame, far longer than a marker lives: hold every marker at 0.2 s of age while the picture is taken
const freeze = page => page.evaluate(() => { clearInterval(window.__fz); ORDM.age = .2; });
const resel = page => page.evaluate(() => { G.sel = window.__grp.map(id => G.byId.get(id)).filter(u => u && !u.dead); updateUI(); });
const stats = page => page.evaluate(() => ({ rings: typeof SELR !== 'undefined' && SELR.m ? SELR.m.count : (typeof RINGS !== 'undefined' ? RINGS.filter(r => r.visible).length : -1), marks: typeof ORDM !== 'undefined' ? ORDM.list.length : -1, goal: (document.getElementById('cqBn') || {}).textContent || '' }));

// ---- Conquest: group, rings, markers, line ghost, goal line
if (want('cq')) {
  const { ctx, page } = await game('conquest');
  const pos = await page.evaluate(() => {
    const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const bx = hq.x + 260, by = hq.y + 40; const us = [];
    const kinds = ['inf', 'inf', 'inf', 'inf', 'inf', 'inf', 'at', 'at', 'tank', 'tank', 'tank'];
    kinds.forEach((k, i) => { const u = addUnit(ME, k, bx + (i % 4) * 22 - 30, by + Math.floor(i / 4) * 26); if (u) us.push(u); });
    us[1].hp = us[1].max * .45; us[8].hp = us[8].max * .6;
    window.__grp = us.map(u => u.id); G.sel = us.slice(); centerOn(bx + 20, by + 30, true); simUpdate(.05); updateUI();
    for (let i = 0; i < 3; i++) simUpdate(.02); try { placeCam(); } catch (e) {} CAM.updateMatrixWorld(true); CAM.matrixWorldInverse.copy(CAM.matrixWorld).invert();
    const p = toScreen(bx + 20, groundH(bx + 20, by + 20), by + 20); const h = us[9]; const ph = toScreen(h.x, unitH(h) + 4, h.y);
    return { x: p.x, y: p.y, hx: ph.x, hy: ph.y, bx, by };
  });
  // the same functions a right-click calls (orderClick / lineOrder), with the mouse put on the spot: playwright's mouse in a
  // 1-frame-per-minute software-GL page does not land reliably
  const at = (x, y) => page.evaluate(([x, y]) => { mouse.x = x; mouse.y = y; mouse.in = true; try { cursorTick(true); } catch (e) {} }, [x, y]);
  const order = (x, y, o = {}) => page.evaluate(([x, y, o]) => { try { placeCam(); } catch (e) {} CAM.updateMatrixWorld(true); CAM.matrixWorldInverse.copy(CAM.matrixWorld).invert(); mouse.x = x; mouse.y = y; mouse.in = true; G.sel = window.__grp.map(id => G.byId.get(id)).filter(u => u && !u.dead); if (o.am) G.amove = true; MODK.shift = !!o.sh; orderClick(!!o.sh); MODK.shift = false; }, [x, y, o]);
  await at(pos.hx, pos.hy); await page.waitForTimeout(300);
  await shot(page, 'selected-group', 2500); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  await at(5, 5);
  // move order on open ground ahead of the group
  await order(pos.x + 40, pos.y + 110); await freeze(page);
  await shot(page, 'move-marker', 250); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  // attack-move (F)
  await page.evaluate(() => { ORDM.list.length = 0; }); await order(pos.x - 250, pos.y + 50, { am: 1 }); await freeze(page);
  await shot(page, 'attack-move-marker', 250); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  // attack: an enemy tank
  const ep = await page.evaluate((p) => { const en = G.teams.find(T => !T.reb && T.id !== ME); const u = addUnit(en.id, 'tank', p.bx + 120, p.by - 150); u.vis = true; ORDM.list.length = 0; const s = toScreen(u.x, unitH(u) + 5, u.y); return { x: s.x, y: s.y }; }, pos);
  await order(ep.x, ep.y); await freeze(page);
  await shot(page, 'attack-marker', 250); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  await page.evaluate(() => { ORDM.age = null; ORDM.list.length = 0; });
  // right-drag infantry line: the ghost while the button is still held
  await page.evaluate(([x0, y0, x1, y1]) => { G.sel = window.__grp.map(id => G.byId.get(id)).filter(u => u && !u.dead); RDRAG = { x0, y0, w0: screenToWorld(x0, y0), id: -99, moved: true, gen: 1, line: true, mode: 'line', am: false }; mouse.x = x1; mouse.y = y1; mouse.in = true; }, [pos.x - 160, pos.y - 140, pos.x + 140, pos.y - 176]);
  await shot(page, 'line-ghost', 600);
  console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  await page.evaluate(() => { const r = RDRAG; RDRAG = null; lineOrder(r); });
  // Shift-queued path (shown while selected)
  for (const [dx, dy] of [[260, 90], [330, 200], [180, 260]]) await order(pos.x + dx, pos.y + dy, { sh: 1 });
  await resel(page); await page.evaluate(() => { ORDM.list.length = 0; });
  await shot(page, 'queued-path', 400); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  // spam: many orders fast, markers must stay capped
  for (let i = 0; i < 30; i++) await order(pos.x + (i % 6) * 40 - 100, pos.y - 100 + Math.floor(i / 6) * 30, { am: i % 2 });
  console.log('ORDERFEEL spam', JSON.stringify(await stats(page)));
  // goal line (setup countdown still running)
  await page.evaluate(() => { G.sel = []; updateUI(); });
  await shot(page, 'conquest-goal', 900);
  // base building: selected HQ (rectangle)
  await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); G.sel = [hq]; centerOn(hq.x, hq.y, true); updateUI(); });
  await shot(page, 'building-selected', 1500);
  await ctx.close();
}
// ---- Battle: goal line
if (want('bt')) {
  const { ctx, page } = await game('battle');
  await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.isB); centerOn(hq.x + 100, hq.y + 60, true); simUpdate(.1); updateUI(); });
  await shot(page, 'battle-goal', 2500); console.log('ORDERFEEL', JSON.stringify(await stats(page)));
  await ctx.close();
}
await browser.close(); server.close(); process.exit(0);
