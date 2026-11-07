// Tutorial playthrough: boots the game on a PC screen (1920x1080), clicks the main-menu Tutorial button and plays every
// step the way a new player would (real mouse/keyboard events), screenshots each step into orch/shots/tutorial/ and
// prints TUTORIAL PASS / FAIL.   node orch/tutorialtest.mjs [--probe]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SH = path.join(ROOT, 'orch', 'shots', 'tutorial'); fs.mkdirSync(SH, { recursive: true });
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs')); const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url); let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe; try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('tutorialtest');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// --shots: PC 1920x1080 at full graphics with a screenshot of every step (slow); the CI gate runs 1280x720 on Low graphics without screenshots
const BIG = process.argv.includes('--shots'); const ctx = await browser.newContext({ viewport: BIG ? { width: 1920, height: 1080 } : { width: 1280, height: 720 } });
await ctx.addInitScript((sd) => { window.__tutSeed = sd; }, +process.env.TUT_SEED || 4242);   // same map every run
if (!BIG) await ctx.addInitScript(() => { try { localStorage.setItem('ww3_settings', JSON.stringify({ gfx: 'low' })); } catch (e) {} }); await guardContext(ctx);
const page = await ctx.newPage(); await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
let SHOTS = process.argv.includes('--shots'); const SHOTS_ON = SHOTS;
const KEEP = /^(00|01a|0[1-9]-.*-tip|1[0-4]-.*-tip|03-atk-after|06-town-after|08-revolt-after|04b|07b|10b|11b|12b|14c|15|16)/;   // a real 1920x1080 frame costs minutes in software GL: keep the useful ones
const problems = []; const bad = (m) => { problems.push(m); console.log('  FAIL', m); }; const ok = (c, m) => { if (!c) bad(m); else console.log('  ok  ', m); };
const errs = []; page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startTutorial === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
if (BIG) await page.screenshot({ path: path.join(SH, '00-main-menu.jpg'), type: 'jpeg', quality: 78, timeout: 300000 });
const info = await page.evaluate(() => ({ btn: document.getElementById('tutorial')?.textContent, vis: !!document.getElementById('tutorial')?.offsetParent }));
console.log('menu', JSON.stringify(info));

const wait = (ms) => page.waitForTimeout(ms);
const diag = async (label) => console.log('  DIAG', label, JSON.stringify(await ev(() => { try { const t = tutTown(), h = tutHQ(); return { t: G.t | 0, step: TUTS && TUTS.i + 1, town: t && { n: t.name, ow: t.ow, reb: t.reb, d: h && Math.round(Math.hypot(t.x - h.x, t.y - h.y)), cells: t.cells.map(c => [!!c.key, c.ow, !!c.g, (c.occ || []).length, c.cap, c.dead ? 1 : 0]) }, units: G.ents.filter(u => !u.isB && u.team === ME && !u.dead).map(u => [u.kind, u.x | 0, u.y | 0, u.order ? u.order.type : '', u.inGar ? 1 : 0]), sel: G.sel.length }; } catch (e) { return String(e); } })));
// fast-forward the battle clock (software rendering and slow CI machines run the live loop at a fraction of real time); inputs stay real, only waiting is accelerated
const ff = (sec) => page.evaluate((n) => { for (let k = 0; k < Math.ceil(n * 60) && G && !G.over; k++) simUpdate(1 / 60); }, sec);
const shot = async (name) => { if (!SHOTS || !KEEP.test(name)) return; await ev(() => { R3.render = window.__realRender; }); await ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); await page.screenshot({ path: path.join(SH, name + '.jpg'), type: 'jpeg', quality: 78, timeout: 300000 }); await ev(() => { R3.render = () => {}; }); };
const ev = (f, a) => page.evaluate(f, a);
const raf2 = () => ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const scr = async (x, y, h = 8) => { await raf2(); return ev(([x, y, h]) => { const p = toScreen(x, h, y); return { x: p.x, y: p.y, z: p.z }; }, [x, y, h]); };
const T0 = Date.now(); const stepTimes = [];
// wait until tutorial step i is on screen and the camera has stopped moving
async function waitStep(i, timeout = 300000) {
  await page.waitForFunction((i) => TUTS && TUTS.i === i && !TUTS.wait, i, { timeout, polling: 300 }).catch(async () => { bad('step ' + (i + 1) + ' never started (stuck on ' + (await ev(() => TUTS ? TUTS.i + 1 : 'none')) + ')'); throw new Error('stuck'); });
  let last = null; for (let n = 0; n < 40; n++) { const c = await ev(() => [cam.x, cam.y].join()); if (c === last) break; last = c; await wait(250); } await wait(400);
  const st = await ev(() => { const s = TUT[TUTS.i], hl = document.getElementById('tutHL'), box = document.getElementById('tut'), r = box.getBoundingClientRect();
    const h = hl && hl.style.display !== 'none' ? hl.getBoundingClientRect() : null; const ov = h && r.bottom > h.top && r.top < h.bottom && r.right > h.left && r.left < h.right;
    return { k: s.k, text: (typeof s.t === 'function' ? s.t() : s.t) + ' ' + s.a, hl: !!h, hlCls: hl ? hl.className : '', overlap: !!ov, vis: !box.hidden, tutBottom: r.bottom, rects: JSON.stringify([r, h].map(q => q && [q.left | 0, q.top | 0, q.right | 0, q.bottom | 0])) }; });
  console.log('step', i + 1, st.k, '| highlight:', st.hl ? (st.hlCls || 'ring') : 'none', '| words:', st.text.split(/\s+/).length);
  ok(st.vis, 'step ' + (i + 1) + ' tip visible'); ok(st.text.split(/\s+/).length <= 50, 'step ' + (i + 1) + ' tip short (<=50 words)');
  if (st.k !== 'md') ok(st.hl, 'step ' + (i + 1) + ' has an arrow/ring on its target'); else console.log('    (highlight optional at this moment)');
  ok(!st.overlap, 'step ' + (i + 1) + ' tip box does not cover its own highlight ' + (st.overlap ? st.rects : ''));
  await shot(String(i + 1).padStart(2, '0') + '-' + st.k + '-tip'); return st;
}
async function done(i) { const t0 = Date.now(); for (;;) { if (await ev((i) => !TUTS || TUTS.i > i || TUTS.wait, i)) break; if (Date.now() - t0 > 600000) { bad('step ' + (i + 1) + ' did not complete'); await diag('stuck'); await ev(() => console.log(1)); throw new Error('stuck'); } await ff(3); await wait(150); } stepTimes.push(Math.round((Date.now() - t0) / 1000)); }
const click = async (x, y, o = {}) => { await page.mouse.move(x, y); await page.mouse.click(x, y, o); };
async function boxSelectSquad() {
  const sq = await ev(() => { const u = tutUnits(); let x = 0, y = 0; u.forEach(q => { x += q.x; y += q.y; }); return { x: x / u.length, y: y / u.length, n: u.length }; });
  await ev(([x, y]) => centerOn(x, y, true), [sq.x, sq.y]); await wait(700);
  const c = await scr(sq.x, sq.y); await page.mouse.move(c.x - 220, c.y + 130); await page.mouse.down(); await page.mouse.move(c.x + 220, c.y - 90, { steps: 8 }); await page.mouse.up();
  await page.waitForFunction(() => G.sel.some(u => !u.isB), null, { timeout: 15000, polling: 200 }).catch(() => {});
  return ev(() => G.sel.filter(u => !u.isB).length);
}

// capture the town the way a player does: click a soldier, right-click a ringed house; repeat with other soldiers until the town is ours
async function takeHouses(label) {
  for (let k = 0; k < 30; k++) {
    const st = await ev(() => { const t = tutTown(); if (t.ow === ME) return { done: true }; const c = t.cells.find(c => c.key && c.ow !== ME && !c.g && !c.dead) || t.cells.find(c => c.ow !== ME && !c.dead); const free = G.ents.filter(u => !u.isB && !u.dead && u.team === ME && u.kind === 'inf' && !u.order && !u.inGar);
      return { cell: c && { x: c.x, y: c.y }, unit: free[0] && { x: free[0].x, y: free[0].y }, n: free.length }; });
    if (k < 6 || k % 10 === 0) console.log('    takeHouses', k, JSON.stringify(st)); if (st.done) return true; if (!st.cell || !st.unit) { await ff(4); await wait(200); continue; }
    await ev(([x, y]) => centerOn(x, y, true), [st.unit.x, st.unit.y]); let p = await scr(st.unit.x, st.unit.y, 8); await ev(() => { G.sel = []; }); await click(p.x, p.y); await page.waitForFunction(() => G.sel.length > 0, null, { timeout: 8000 }).catch(() => {});
    await ev(([x, y]) => centerOn(x, y, true), [st.cell.x, st.cell.y]); p = await scr(st.cell.x, st.cell.y, 6); await click(p.x, p.y, { button: 'right' }); await ff(6); await wait(200);
    if (k === 1) await shot(label + '-garrisoning');
  } return false;
}
const openTown = async () => { const m = await ev(() => { const t = tutTown(), r = mm.getBoundingClientRect(); return { x: r.left + t.x / MAPW * r.width, y: r.top + t.y / MAPH * r.height }; }); await click(m.x, m.y); await page.waitForFunction(() => TP.ti >= 0, null, { timeout: 8000 }).catch(() => {}); await wait(300); };
const shotAfter = async (n, name) => { await wait(500); await shot(String(n).padStart(2, '0') + '-' + name + '-after'); };

async function startTut() {
  await ev(() => document.getElementById('tutorial').click());
  await page.waitForFunction(() => !window.LOADING && G && G.tut && TUTS, null, { timeout: 900000, polling: 500 });
  await ev((big) => { try { MLOCK.broken = true; mlockOff(); } catch (e) {} window.__realRender = R3.render; R3.render = () => {}; SET.spd = 3; }, BIG);   // no GPU drawing between screenshots (software GL needs seconds per frame) - the game logic and the HUD run normally; --shots draws real frames just for each screenshot
}
async function reloadMenu() { await page.reload({ waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => typeof startTutorial === 'function', null, { timeout: 60000 }); }
try {
  // ---- part A: out-of-order play, Skip step, Exit tutorial, restart
  console.log('-- out of order / skip / exit / restart'); SHOTS = false;
  await startTut(); await waitStep(0);
  { await page.click('#b_barracks'); const h = await ev(() => { const q = tutHQ(); return { x: q.x, y: q.y }; }); let placed = false;
    for (const [dx, dy] of [[120, 90], [-140, 90], [150, -90], [-150, -100], [0, 170]]) { await ev(([x, y]) => centerOn(x, y, true), [h.x, h.y]); const p = await scr(h.x + dx, h.y + dy, 0); await click(p.x, p.y); await wait(500);
      if (await ev(() => G.ents.some(e => e.isB && e.team === ME && e.kind === 'barracks' && !e.dead))) { placed = true; break; } if (!(await ev(() => G.place === 'barracks'))) await page.click('#b_barracks'); }
    ok(placed, 'out of order: Barracks placed during step 1');
    for (let k = 0; k < 100 && !(await ev(() => G.ents.some(e => e.isB && e.team === ME && e.kind === 'barracks' && !e.dead && e.built >= 1))); k++) await ff(3); if (!(await ev(() => G.ents.some(e => e.isB && e.team === ME && e.kind === 'barracks' && !e.dead && e.built >= 1)))) bad('Barracks never finished');
    ok(await ev(() => TUTS.i === 0), 'out of order: the tutorial stays on step 1 (no crash, no skipping ahead)');
    for (let k = 0; k < 3; k++) { await page.click('#tutSkip'); await wait(250); }
    ok(await ev(() => TUTS.i === 3), 'Skip step moves to the next step (3 clicks -> step 4)');
    await page.waitForFunction(() => TUTS.i >= 4 || TUTS.wait, null, { timeout: 20000, polling: 300 }).then(() => ok(true, 'a step already done earlier completes by itself (Barracks built before step 4)')).catch(() => bad('step 4 did not notice the Barracks that already stood'));
    await page.click('#tutExit'); await wait(500);
    ok(await ev(() => G.tut === false && document.getElementById('tut').hidden && !(document.getElementById('tutHL') && document.getElementById('tutHL').style.display !== 'none')), 'Exit tutorial hides the tips and arrow and leaves the battle running'); }
  await reloadMenu();
  ok(await ev(() => /Tutorial: learn/.test(document.getElementById('tutorial').textContent)), 'menu still offers the tutorial (not marked done after exiting)');
  // ---- part B: the full playthrough
  console.log('-- full playthrough'); SHOTS = SHOTS_ON;
  await startTut();
  await shot('01a-battle-start');
  // 1 select
  await waitStep(0); { const n = await boxSelectSquad(); ok(n > 0, 'drag-select picks up soldiers (' + n + ')'); } await done(0); await shotAfter(1, 'sel');
  // 2 move
  await waitStep(1); { const m = await ev(() => TUTS.mk); await boxSelectSquad(); await ev(() => { const q = TUT[TUTS.i].cam(); centerOn(q.x, q.y - 90, true); }); const p = await scr(m.x, m.y, 0); console.log('    marker at', Math.round(p.x), Math.round(p.y)); ok(p.x > 20 && p.x < 1260 && p.y > 215 && p.y < 520, 'the move marker is on screen below the tip box'); await click(p.x, p.y, { button: 'right' }); } await done(1); await shotAfter(2, 'move');
  // 3 attack
  await waitStep(2); { await boxSelectSquad(); const f = await ev(() => { const e = tutFoe(); return e ? { x: e.x, y: e.y } : null; }); ok(!!f, 'a red enemy exists to attack');
    for (let k = 0; k < 6 && f; k++) { const fe = await ev(() => { const e = tutFoe(), q = tutSquad(); return e && q && Math.hypot(e.x - q.x, e.y - q.y) < 900 ? { x: e.x, y: e.y } : null; }); if (!fe) break;   /* only the nearby scouts, never the far enemy base */ await ev(([x, y]) => centerOn(x, y, true), [fe.x, fe.y]); await wait(500); const p = await scr(fe.x, fe.y, 10); await boxSelectSquad().catch(() => 0); await ev(([x, y]) => centerOn(x, y, true), [fe.x, fe.y]); await wait(500); const p2 = await scr(fe.x, fe.y, 10); await click(p2.x, p2.y, { button: 'right' }); await ff(8);
      if (await ev(() => TUTS.wait || TUTS.i > 2)) break; } }
  await done(2); await shotAfter(3, 'atk');
  // 4 setup + barracks
  await waitStep(3); { await shot('04b-setup-banner'); await page.click('#b_barracks'); await wait(300); const h = await ev(() => { const q = tutHQ(); return { x: q.x, y: q.y }; });
    ok(await ev(() => G.place === 'barracks'), 'clicking Barracks arms placement'); await shot('04c-placing');
    let placed = false; for (const [dx, dy] of [[120, 90], [-140, 90], [150, -90], [-150, -100], [0, 170], [220, 40]]) { await ev(([x, y]) => centerOn(x, y, true), [h.x, h.y]); await wait(500); const p = await scr(h.x + dx, h.y + dy, 0); await click(p.x, p.y); await wait(600);
      if (await ev(() => G.ents.some(e => e.isB && e.team === ME && e.kind === 'barracks' && !e.dead))) { placed = true; break; } if (!(await ev(() => G.place === 'barracks'))) await page.click('#b_barracks'); }
    ok(placed, 'Barracks placed with a click next to the base'); }
  await done(3); await shotAfter(4, 'bar');
  // 5 train
  await waitStep(4); { const b = await ev(() => { const e = tutBld('barracks'); return { x: e.x, y: e.y }; }); await ev(([x, y]) => centerOn(x, y, true), [b.x, b.y]); await wait(600); const p = await scr(b.x, b.y, 10); await click(p.x, p.y); await wait(500);
    ok(await ev(() => G.sel.some(e => e.kind === 'barracks')), 'left-click selects the Barracks'); await wait(700); await shot('05b-barracks-selected');
    const hl0 = await ev(() => { const h = document.getElementById('tutHL'); const t = document.querySelector('.tabs button[data-tab="units"]').getBoundingClientRect(), r = h.getBoundingClientRect(); return TAB !== 'units' && Math.abs(r.left - t.left) < 12; }); ok(hl0, 'arrow points at the Units tab first'); await page.click('.tabs button[data-tab="units"]'); await wait(300); await shot('05c-units-tab');
    const id = await ev(() => '#u_' + roster(G.teams[ME].fac).barracks[0]); await page.click(id); await wait(300); }
  await done(4); await shotAfter(5, 'trn');
  // 6 capture a town
  await waitStep(5); await takeHouses('06b'); await done(5); await shotAfter(6, 'town');
  // 7 tax High
  await waitStep(6); { const t = await ev(() => ({ x: tutTown().x, y: tutTown().y })); await ev(([x, y]) => centerOn(x, y, true), [t.x, t.y]); await wait(800); await ev(() => { G.sel = []; }); await openTown(); ok(await ev(() => TP.ti >= 0), 'clicking the town marker on the minimap opens its tax panel'); await wait(700); await shot('07b-tax-panel');
    await page.click('#townp button[data-r="2"]'); await wait(300); }
  await done(6); await shotAfter(7, 'tax');
  // 8 unrest -> revolt
  await waitStep(7); { if (!(await ev(() => TP.ti >= 0))) await openTown(); await page.click('#townp button[data-r="3"]'); await wait(2500); await shot('08b-unrest-rising'); }
  await done(7); await shotAfter(8, 'revolt');
  // 9 retake
  await waitStep(8); await takeHouses('09b'); await done(8); await shotAfter(9, 'retake');
  // 10 civic
  await waitStep(9); { await ev(() => { G.sel = []; }); if (!(await ev(() => TP.ti >= 0))) await openTown(); await wait(1000); await shot('10b-civic-panel');
    await page.click('#townp button[data-r="0"]'); await wait(300); }
  await done(9); await shotAfter(10, 'civic');
  // 11 supply lines
  await waitStep(10); { await page.keyboard.press('l'); await wait(800); ok(await ev(() => LGU.on), 'L key shows supply lines'); await shot('11b-supply-lines'); }
  await done(10);
  // 12 powers
  await waitStep(11); { await page.click('.tabs button[data-tab="pow"]'); await wait(600); await shot('12b-powers-tab');
    const id = await ev(() => { const b = [...document.querySelectorAll('#panel button[id^="p_"]')].find(x => x.offsetParent && !x.disabled); return b && b.id; }); ok(!!id, 'a power button is visible'); await page.click('#' + id); await wait(400); }
  await done(11); await shotAfter(12, 'pow');
  // 13 missile defence
  await waitStep(12); { await page.click('.tabs button[data-tab="build"]'); await wait(500); await shot('13b-build-tab'); const enabled = await ev(() => { const b = document.getElementById('b_sam'); return b && !b.disabled && !/Not available/i.test(b.textContent); }); ok(enabled, 'Missile defence is buildable');
    await page.click('#b_sam'); await wait(300); const h = await ev(() => { const q = tutHQ(); return { x: q.x, y: q.y }; }); let placed = false;
    for (const [dx, dy] of [[-130, 80], [-160, -60], [150, 120], [0, -170], [200, -40]]) { await ev(([x, y]) => centerOn(x, y, true), [h.x, h.y]); await wait(500); const p = await scr(h.x + dx, h.y + dy, 0); await click(p.x, p.y); await wait(500); if (await ev(() => !!tutBld('sam'))) { placed = true; break; } if (!(await ev(() => G.place === 'sam'))) await page.click('#b_sam'); }
    ok(placed, 'missile defence placed'); }
  await done(12); await shotAfter(13, 'md');
  // 14 win: a real player trains an army; to keep the test short a strike force is added, then ordered with F + click
  await waitStep(13); { await ev(() => { const e = tutFoeHQ(), h = tutHQ(), a = Math.atan2(h.y - e.y, h.x - e.x); for (let i = 0; i < 20; i++) { const p = nearestPassXY('ground', e.x + Math.cos(a) * 500 + (i % 5) * 24, e.y + Math.sin(a) * 500 + Math.floor(i / 5) * 24); if (p) addUnit(ME, 'inf', p[0], p[1]); } });   // test shortcut: the strike force a player would train and march (~4 min) starts 500 units from the enemy base
    const en = await ev(() => { const q = tutFoeHQ(); return { x: q.x, y: q.y }; }); await shot('14b-enemy-base-far');
    if (await ev(() => LGU.on)) await page.keyboard.press('l');   // supply lines off again (a player would too): cheaper frames for the big fight
    const tEnd = Date.now() + 10 * 60 * 1000;   // the battle clock is fast-forwarded between orders; wall-time cap for slow machines
    for (let k = 0; Date.now() < tEnd; k++) { if (await ev(() => G.over)) break;
      const idle = await ev(() => tutUnits().filter(u => !u.order).length); if (k % 4 === 0 || idle > 3) { await ev(([x, y]) => centerOn(x, y, true), [en.x, en.y]); await ev(() => { G.sel = tutUnits(); }); const p = await scr(en.x, en.y, 0); await page.keyboard.press('f'); await click(p.x, p.y); }
      if (k % 2 === 0) console.log('    attack round', k, JSON.stringify(await ev(() => ({ t: G.t | 0, mine: tutUnits().length, foe: G.ents.filter(e => e.team === 1 && !e.dead).length }))));
      await ff(12); await wait(200); if (k === 1) await shot('14c-attack'); } }
  await page.waitForFunction(() => document.getElementById('tutReady'), null, { timeout: 300000 }).catch(() => bad('no "You are ready" screen after the win'));
  await wait(800); await shot('15-ready-screen');
  ok(await ev(() => !!document.getElementById('tutReady') && /3|Three/.test(document.getElementById('tutReady').innerText) && document.querySelectorAll('#tutReady li').length === 3), 'ready screen shows 3 tips');
  ok(await ev(() => { try { return localStorage.getItem('ww3_tutdone') === '1'; } catch (e) { return false; } }), 'completion remembered');
  await page.click('#tutGo'); await page.waitForFunction(() => !window.LOADING && G && !G.tut && G.conq, null, { timeout: 900000, polling: 500 }).catch(() => bad('Start a real match did not start a Conquest battle'));
  ok(await ev(() => G.teams[ME].fac === setup.p && G.teams.some(T => T.ai)), 'real match starts with the same nation and an AI opponent');
  await shot('16-real-match');
  await reloadMenu(); ok(await ev(() => /replay/i.test(document.getElementById('tutorial').textContent)), 'after finishing, the menu button says Tutorial (replay)');
} catch (e) { if (e.message !== 'stuck') { bad('exception: ' + e.message); } await shot('99-stuck').catch(() => {}); }
console.log('step seconds:', JSON.stringify(stepTimes), 'total', Math.round((Date.now() - T0) / 1000), 's');
if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
await browser.close(); server.close();
console.log(problems.length ? 'TUTORIAL FAIL (' + problems.length + ')' : 'TUTORIAL PASS'); process.exit(problems.length ? 1 : 0);
