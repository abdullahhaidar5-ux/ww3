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
const KEEP = /^(00|01a|0[1-9]-.*-tip|0[1-6]-.*-after|04b|06b|06c|07|08)/;   // a real 1920x1080 frame costs minutes in software GL: keep the useful ones
const problems = []; const bad = (m) => { problems.push(m); console.log('  FAIL', m); }; const ok = (c, m) => { if (!c) bad(m); else console.log('  ok  ', m); };
const errs = []; page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startBattleTutorial === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
if (BIG) await page.screenshot({ path: path.join(SH, '00-main-menu.jpg'), type: 'jpeg', quality: 78, timeout: 300000 });
const info = await page.evaluate(() => ({ btn: document.getElementById('tutorial')?.textContent, vis: !!document.getElementById('tutorial')?.offsetParent }));
console.log('menu', JSON.stringify(info));

const wait = (ms) => page.waitForTimeout(ms);
const diag = async (label) => console.log('  DIAG', label, JSON.stringify(await ev(() => { try { return { t: G.t | 0, step: TUTS && TUTS.i + 1, k: TUTS && TUT[TUTS.i] && TUT[TUTS.i].k, blds: G.ents.filter(e => e.isB && e.team === ME && !e.dead).map(e => e.kind + (e.built < 1 ? '?' : '')).join(','), cr: G.teams[ME].credits | 0 }; } catch (e) { return String(e); } })));
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
  // slow runners: give the highlight ring up to 6 s to appear before judging it (the ring follows the camera and the target's position)
  for (let n = 0; n < 20; n++) { if (await ev(() => { const h = document.getElementById('tutHL'); return !!(h && h.style.display !== 'none') || TUT[TUTS.i].k === 'md'; })) break; await wait(300); }
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

const shotAfter = async (n, name) => { await wait(500); await shot(String(n).padStart(2, '0') + '-' + name + '-after'); };

async function startTut() {
  await ev(() => document.getElementById('tutorial').click());
  await page.waitForFunction(() => !window.LOADING && G && G.tut && TUTS, null, { timeout: 900000, polling: 500 });
  await ev((big) => { try { MLOCK.broken = true; mlockOff(); } catch (e) {} window.__realRender = R3.render; R3.render = () => {}; SET.spd = 3; }, BIG);   // no GPU drawing between screenshots (software GL needs seconds per frame) - the game logic and the HUD run normally; --shots draws real frames just for each screenshot
}
async function reloadMenu() { await page.reload({ waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => typeof startBattleTutorial === 'function', null, { timeout: 60000 }); }
// place building kind k with a real click next to the HQ (Build tab button, then the ground); true when it stands (or is being built)
async function placeNear(k, spots) { await page.click('.tabs button[data-tab="build"]').catch(() => {}); await wait(300); await page.click('#b_' + k); await wait(300);
  const h = await ev(() => { const q = tutHQ(); return { x: q.x, y: q.y }; });
  for (const [dx, dy] of spots) { await ev(([x, y]) => centerOn(x, y, true), [h.x, h.y]); await wait(500); const p = await scr(h.x + dx, h.y + dy, 0); await click(p.x, p.y); await wait(500);
    if (await ev((k) => G.ents.some(e => e.isB && e.team === ME && e.kind === k && !e.dead), k)) return true; if (!(await ev((k) => G.place === k, k))) { await page.click('#b_' + k); await wait(300); } }
  return false; }
const builtUp = async (k) => { for (let n = 0; n < 120 && !(await ev((k) => G.ents.some(e => e.isB && e.team === ME && e.kind === k && !e.dead && e.built >= 1), k)); n++) await ff(3); return ev((k) => G.ents.some(e => e.isB && e.team === ME && e.kind === k && e.built >= 1), k); };
const SPOTS = [[-130, 90], [120, 90], [150, -60], [-150, -100], [0, 180], [220, 40], [-220, 30], [60, -190]];
try {
  // ---- part A: Skip step, Exit tutorial, restart
  console.log('-- skip / exit / restart'); SHOTS = false;
  await startTut(); await waitStep(0);
  ok(await ev(() => TUT === TUTB && TUT.length === 7 && TUT.map(s => s.k).join() === 'gen,dep,bar,fac,sup,veh,atk'), 'the one tutorial is the Battle tutorial with a supply-lines step');
  for (let k = 0; k < 3; k++) { await page.click('#tutSkip'); await wait(250); }
  ok(await ev(() => TUTS.i === 3), 'Skip step moves to the next step (3 clicks -> step 4)');
  await page.click('#tutExit'); await wait(500);
  ok(await ev(() => G.tut === false && document.getElementById('tut').hidden && !(document.getElementById('tutHL') && document.getElementById('tutHL').style.display !== 'none')), 'Exit tutorial hides the tips and arrow and leaves the battle running');
  await reloadMenu();
  ok(await ev(() => /Tutorial: learn Battle/.test(document.getElementById('tutorial').textContent)), 'menu still offers the tutorial (not marked done after exiting)');
  // ---- part B: the full playthrough
  console.log('-- full playthrough'); SHOTS = SHOTS_ON;
  await startTut();
  await shot('01a-battle-start');
  ok(await ev(() => G.battle && !G.towns), 'the tutorial is a Battle (no towns)');
  // 1 Supply Depot
  await waitStep(0); ok(await placeNear('depot', SPOTS), 'Supply Depot placed with a click next to the base'); await done(0); await shotAfter(1, 'dep');
  // 2 Barracks
  await waitStep(1); ok(await placeNear('barracks', SPOTS), 'Barracks placed'); await done(1); await shotAfter(2, 'bar');
  ok(await builtUp('barracks'), 'the Dozer finishes the Barracks');
  // 3 War Factory
  await waitStep(2); ok(await placeNear('factory', SPOTS), 'War Factory placed'); await done(2); await shotAfter(3, 'fac');
  // 4 supply lines: L shows them (green roads out of the Command Center)
  await waitStep(3); { await page.keyboard.press('l'); await wait(800); ok(await ev(() => LGU.on), 'L key shows supply lines');
    const cov = await ev(() => { const C = G.lg && G.lg.cov && G.lg.cov[ME]; return C ? Object.keys(C).length : 0; }); ok(cov > 0, 'your supply lines cover at least one road (' + cov + ')'); await shot('04b-supply-lines'); }
  await done(3); await shotAfter(4, 'sup');
  // 5 train a vehicle
  await waitStep(4); { ok(await builtUp('factory'), 'the Dozer finishes the War Factory'); const b = await ev(() => { const e = tutBld('factory'); return { x: e.x, y: e.y }; }); await ev(([x, y]) => centerOn(x, y, true), [b.x, b.y]); await wait(600); const p = await scr(b.x, b.y, 10); await click(p.x, p.y); await wait(500);
    ok(await ev(() => G.sel.some(e => e.kind === 'factory')), 'left-click selects the War Factory');
    const id = await ev(() => '#u_' + roster(G.teams[ME].fac).factory.find(k => document.getElementById('u_' + k) && !document.getElementById('u_' + k).disabled)); await page.click(id); await wait(300);
    for (let n = 0; n < 60 && !(await ev(() => TUTS.i > 4 || TUTS.wait)); n++) await ff(3); }
  await done(4); await shotAfter(5, 'veh');
  // 6 win: a real player trains an army; to keep the test short a strike force is added, then ordered with a right-click
  await waitStep(5); { await ev(() => { const e = tutFoeHQ(), h = tutHQ(), a = Math.atan2(h.y - e.y, h.x - e.x); for (let i = 0; i < 20; i++) { const p = nearestPassXY('ground', e.x + Math.cos(a) * 500 + (i % 5) * 24, e.y + Math.sin(a) * 500 + Math.floor(i / 5) * 24); if (p) addUnit(ME, i % 3 ? 'inf' : 'tank', p[0], p[1]); } });
    const en = await ev(() => { const q = tutFoeHQ(); return { x: q.x, y: q.y }; }); await shot('06b-enemy-base');
    if (await ev(() => LGU.on)) await page.keyboard.press('l');
    const tEnd = Date.now() + 10 * 60 * 1000;
    for (let k = 0; Date.now() < tEnd; k++) { if (await ev(() => G.over)) break;
      const tg = await ev(() => { const b = G.ents.find(e => e.isB && e.team === 1 && !e.dead); return b ? { x: b.x, y: b.y } : null; }); if (!tg) { await ff(5); continue; }
      await ev(([x, y]) => centerOn(x, y, true), [tg.x, tg.y]); await ev(() => { G.sel = tutUnits(); }); const p = await scr(tg.x, tg.y, 0); await click(p.x, p.y, { button: 'right' });
      if (k % 2 === 0) console.log('    attack round', k, JSON.stringify(await ev(() => ({ t: G.t | 0, mine: tutUnits().length, foe: G.ents.filter(e => e.team === 1 && !e.dead).length }))));
      await ff(12); await wait(200); if (k === 1) await shot('06c-attack'); } }
  await page.waitForFunction(() => document.getElementById('tutReady'), null, { timeout: 300000 }).catch(() => bad('no "You are ready" screen after the win'));
  await wait(800); await shot('07-ready-screen');
  ok(await ev(() => !!document.getElementById('tutReady') && /3|Three/.test(document.getElementById('tutReady').innerText) && document.querySelectorAll('#tutReady li').length === 3 && /supply lines/i.test(document.getElementById('tutReady').innerText)), 'ready screen shows 3 tips (supply lines among them)');
  ok(await ev(() => { try { return localStorage.getItem('ww3_tutdone') === '1'; } catch (e) { return false; } }), 'completion remembered');
  await page.click('#tutGo'); await page.waitForFunction(() => !window.LOADING && G && !G.tut && G.battle, null, { timeout: 900000, polling: 500 }).catch(() => bad('Start a real match did not start a Battle'));
  ok(await ev(() => G.teams[ME].fac === setup.p && G.teams.some(T => T.ai)), 'real match starts with the same nation and an AI opponent');
  await shot('08-real-match');
  await reloadMenu(); ok(await ev(() => /replay/i.test(document.getElementById('tutorial').textContent)), 'after finishing, the menu button says Tutorial (replay)');
} catch (e) { if (e.message !== 'stuck') { bad('exception: ' + e.message); } await shot('99-stuck').catch(() => {}); }
console.log('step seconds:', JSON.stringify(stepTimes), 'total', Math.round((Date.now() - T0) / 1000), 's');
if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
await browser.close(); server.close();
console.log(problems.length ? 'TUTORIAL FAIL (' + problems.length + ')' : 'TUTORIAL PASS'); process.exit(problems.length ? 1 : 0);
