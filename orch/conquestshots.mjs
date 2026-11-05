// Screenshots of the command bar in a live skirmish at phone portrait (390x844), phone landscape (844x390, both with
// mobile/touch emulation) and desktop (1366x768) sizes, with the Construction Vehicle selected so the Build tab shows
// its full grid. Prints, per size, where each command button sits and any text in the bar that is cut off without an
// ellipsis. Screenshots: orch/out/bar-portrait.png, bar-landscape.png, bar-desktop.png.
//   node orch/barshots.mjs [--tag -x] [--names]   (SIZES=p,l,d,w to pick sizes, w = 1920x1080; OUT=dir for the screenshots; --names: list every faction's command-button
//   names that don't fit, and buttons under 40 px, on every tab -> BARNAMES PASS / FAIL)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'orch', 'out');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of [ '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('conquestshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sizes = (process.env.SIZES || 'p,l,d').split(',');
const cfg = { p: { name: 'portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  l: { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  d: { name: 'desktop', viewport: { width: 1366, height: 768 } },
  w: { name: 'desktop1920', viewport: { width: 1920, height: 1080 } } };
const SH = path.join(ROOT, 'orch', 'shots', 'conquest'); fs.mkdirSync(SH, { recursive: true });
const MAP = process.env.MAP || 'fulda';
for (const s of sizes) {
  const c = cfg[s]; const ctx = await browser.newContext({ viewport: c.viewport, isMobile: !!c.isMobile, hasTouch: !!c.hasTouch, deviceScaleFactor: c.deviceScaleFactor || 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate((m) => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} setup.n = 1; try { setup.map = m; } catch (e) {} startSingle(); }, MAP);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.children.length < 8 && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
  const shot = async (name) => { await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; }); await page.waitForTimeout(1800); await page.screenshot({ path: path.join(SH, `${name}-${c.name}.png`), timeout: 300000 }); console.log('shot', name, c.name); };
  const focus = (idx, dx, dy) => page.evaluate(([i, dx, dy]) => { const t = G.towns[i]; centerOn(t.x + dx, t.y + dy, true); G.sel = []; simUpdate(.3); updateUI(); }, [idx, dx || 0, dy || 0]);
  const pick = await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const d = t => Math.hypot(t.x - hq.x, t.y - hq.y);
    const towns = G.towns.filter(t => !t.ham).sort((a, b) => d(a) - d(b)), hams = G.towns.filter(t => t.ham).sort((a, b) => d(a) - d(b));
    G.teams[ME].ai = null; for (const T of G.teams) if (T.ai) T.ai = null;
    return { rear: towns[0] && towns[0].i, front: towns[1] && towns[1].i, ham: hams[0] && hams[0].i, n: G.towns.length, nh: hams.length }; });
  console.log(c.name, JSON.stringify(pick));
  if (s === 'd') await shot('0-setup-banner');
  // 1: rear town on High tax, calm
  await page.evaluate(([r]) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = ME; simUpdate(.6); t.rate = 2; t.un = 18; t.hold = G.t - 100; t.fresh = 0; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 700, t: 600 }); }, [pick.rear]);
  await focus(pick.rear, 0, 20); await shot('1-rear-high-calm');
  await page.evaluate((r) => townOpen(r), pick.rear); await shot('2-tax-panel'); await page.evaluate(() => townClose());
  // 3: front-line town on Extortionate: boiling red
  await page.evaluate(([r]) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = ME; simUpdate(.6); t.rate = 3; t.un = 88; t.hold = G.t - 100; t.fresh = 0; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 700, t: 600 }); }, [pick.front]);
  await focus(pick.front, 0, 20); await shot('3-front-boiling');
  await page.evaluate((r) => townOpen(r), pick.front); await shot('4-front-panel'); await page.evaluate(() => townClose());
  // 5: revolt with rebels
  await page.evaluate(([r]) => { const t = G.towns[r]; t.un = 100; simUpdate(.6); simUpdate(.6); simUpdate(.6); }, [pick.front]);
  await page.evaluate(([r]) => { const t = G.towns[r]; if (t.ow >= 0) { townRevolt(t); } }, [pick.front]);
  await focus(pick.front, 0, 20); await shot('5-revolt-rebels');
  // 6: hamlet
  if (pick.ham != null) { await page.evaluate(([r]) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = ME; simUpdate(.6); t.rate = 1; t.un = 5; t.hold = G.t - 40; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 600, t: 600 }); }, [pick.ham]);
    await focus(pick.ham, 0, 10); await shot('6-hamlet'); }
  // 7: whole screen with the minimap (HUD) - pings + rings
  await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); centerOn(hq.x + 200, hq.y + 100, true); for (const t of G.towns) if (t.ow === ME) G.tpings = (G.tpings || []).concat([{ x: t.x, y: t.y, k: 0, t: performance.now() }]); });
  await shot('7-minimap-hud');
  const mm = await page.evaluate(() => { const r = mm.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.screenshot({ path: path.join(SH, `8-minimap-${c.name}.png`), clip: { x: Math.max(0, mm.x - 6), y: Math.max(0, mm.y - 6), width: mm.w + 12, height: mm.h + 12 }, timeout: 300000 });
  if (s === 'd') {   // 9: strike countdown + launch site exposed + missile-defence intercept; 10: end screen; (setup banner is shot 0)
    await page.evaluate(() => { G.t = 600; G.setupEnd = 90; const me = G.teams[ME], en = G.teams.find(T => !T.reb && T.id !== ME);
      const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), eh = G.ents.find(e => e.team === en.id && e.kind === 'hq');
      const mk = (team, kind, x, y) => { me.credits = en.credits = 99999; for (const T of G.teams) if (!T.reb) T.pwOff = 0; const t0 = G.ents.length; placeBld(team, kind, x, y); for (const e of G.ents) if (e.isB && e.team === team && e.kind === kind) { e.built = 1; e.hp = e.max; } };
      mk(ME, 'uplink', hq.x + 140, hq.y + 60); mk(en.id, 'sam', eh.x - 150, eh.y + 40); mk(en.id, 'sam', eh.x + 120, eh.y - 90);
      me.charge = me.sup.charge; simUpdate(.5); launch(ME, eh.x, eh.y); G.teams[ME].reveals.push({ x: eh.x, y: eh.y, r: 700, t: 600 }); centerOn(eh.x, eh.y, true); G.sel = []; simUpdate(1.2); updateUI(); });
    await shot('9-strike-inbound');
    await page.evaluate(() => { const eh = G.ents.find(e => e.team !== ME && e.kind === 'hq' && !e.isGhost); for (let i = 0; i < 8; i++) { simUpdate(.3); } updateUI(); });
    await shot('9b-strike-impact-or-intercept');
    await page.evaluate(() => { for (const e of G.ents) if (e.isB && e.team !== ME && !G.teams[e.team].reb && ['hq', 'barracks', 'factory', 'airfield', 'shipyard'].includes(e.kind)) { e.hp = 0; } for (let i = 0; i < 6; i++) simUpdate(.5); updateUI(); });
    await new Promise(r => setTimeout(r, 2500)); await shot('10-end-screen');
  }
  await ctx.close();
}
await browser.close(); server.close(); process.exit(0);
