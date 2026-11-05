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
await acquireBrowserLock('heartsshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SH = path.join(ROOT, 'orch', 'shots', 'hearts-minds'); fs.mkdirSync(SH, { recursive: true });
const c = { name: 'desktop', viewport: { width: 1366, height: 768 } };
const ctx = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 1 });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
// lobby / map picker with the home-turf label
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} });
const sel = await page.evaluate(() => { const o = [...document.querySelectorAll('option')].filter(o => /Home turf/.test(o.textContent)).map(o => o.textContent); return o.slice(0, 6); });
console.log('picker options', JSON.stringify(sel));
await page.evaluate(() => { try { setup.n = 1; setup.map = 'zagros'; setup.p = 'IR'; setup.a = 'US'; } catch (e) {} const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => /Home turf/.test(o.textContent))); if (s) { s.value = 'zagros'; s.dispatchEvent(new Event('change')); s.scrollIntoView(); } });
await page.screenshot({ path: path.join(SH, '1-lobby-home-turf.png'), timeout: 300000 });
await page.evaluate(() => { startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
const shot = async (name) => { await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; }); await page.waitForTimeout(700); await page.screenshot({ path: path.join(SH, name + '.png'), timeout: 300000 }); console.log('shot', name); };
const info = await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; G.teams[ME].ai = null; const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const d = t => Math.hypot(t.x - hq.x, t.y - hq.y);
  const towns = G.towns.slice().sort((a, b) => (a.ham - b.ham) || d(a) - d(b)); return { rear: towns[0].i, front: (towns[1] || towns[0]).i, fac: G.teams[ME].fac, home: mapHome(), turf: turfOf(ME), tow: G.tow.map(w => [w.x | 0, w.y | 0]) }; });
console.log(JSON.stringify(info));
const focus = (x, y) => page.evaluate(([x, y]) => { centerOn(x, y, true); G.sel = []; simUpdate(.3); updateUI(); }, [x, y]);
// 2: loyal town, recruit militia
await page.evaluate(([r]) => { const t = G.towns[r]; for (const k of t.cells) if (k.key) k.ow = ME; simUpdate(.6); t.rate = 0; t.un = 6; t.hold = G.t - 200; t.fresh = 0; G.t = Math.max(G.t, G.setupEnd + 1); G.teams[ME].credits = 5000; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 800, t: 600 }); simUpdate(.6); for (let i = 0; i < 3; i++) { townRecruit(ME, { ti: t.i }); G.t += 7; t.milR = 0; } simUpdate(.5); }, [info.rear]);
await focus((await page.evaluate(([r]) => G.towns[r].x, [info.rear])), (await page.evaluate(([r]) => G.towns[r].y + 30, [info.rear])));
await page.evaluate((r) => townOpen(r), info.rear); await shot('2-recruit-militia-loyal-town');
// 3: informant ping on the minimap (enemy squad near the loyal town)
await page.evaluate(([r]) => { const t = G.towns[r]; const en = G.teams.findIndex((T, i) => i !== ME && !T.reb); for (let i = 0; i < 4; i++) addUnit(en, 'inf', t.x + 330 + i * 12, t.y + 120); G.humA = 99; simUpdate(.3); G.t += 3; simUpdate(.3); }, [info.rear]);
await page.waitForTimeout(400); await shot('3-informant-ping');
const mm = await page.evaluate(() => { const r = mm.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
await page.screenshot({ path: path.join(SH, '3b-informant-minimap.png'), clip: { x: Math.max(0, mm.x - 6), y: Math.max(0, mm.y - 6), width: mm.w + 12, height: mm.h + 12 }, timeout: 300000 });
// 4: collateral warning
await page.evaluate(([r]) => { const t = G.towns[r]; const en = G.teams.findIndex((T, i) => i !== ME && !T.reb); G.towns[r].cwT = 0; for (let i = 0; i < 12; i++) explode(t.x + i * 5, t.y, 55, 75, ME, 'shell', 'shell'); simUpdate(.3); }, [info.rear]);
await page.waitForTimeout(500); await page.evaluate((r) => townOpen(r), info.rear); await shot('4-collateral-warning');
// 5: bribe panel on a restless enemy town
await page.evaluate(([r]) => { const en = G.teams.findIndex((T, i) => i !== ME && !T.reb); const t = G.towns.find(q => q.i !== r && !q.ham) || G.towns.find(q => q.i !== r); for (const k of t.cells) if (k.key) k.ow = en; simUpdate(.6); t.un = 72; G.teams[ME].credits = 4000; G.teams[ME].brT = 0; G.teams[ME].reveals.push({ x: t.x, y: t.y, r: 800, t: 600 }); G.bt = t.i; }, [info.rear]);
await focus(await page.evaluate(() => G.towns[G.bt].x), await page.evaluate(() => G.towns[G.bt].y + 30));
await page.evaluate(() => townOpen(G.bt)); await shot('5-bribe-panel');
// 6: propaganda tower
await page.evaluate(() => { const w = G.tow[0]; G.teams[ME].reveals.push({ x: w.x, y: w.y, r: 800, t: 600 }); });
await focus(await page.evaluate(() => G.tow[0].x - 40), await page.evaluate(() => G.tow[0].y + 70)); await page.evaluate(() => townClose()); await shot('6-propaganda-tower');
await page.evaluate(() => { G.tow[0].ow = ME; simUpdate(.3); }); await shot('6b-tower-captured');
// 7: home-turf badge on the town panel
await page.evaluate(() => townOpen(G.towns.findIndex(t => t.ow === ME))); await focus(await page.evaluate(() => { const t = G.towns.find(t => t.ow === ME); return t.x; }), await page.evaluate(() => { const t = G.towns.find(t => t.ow === ME); return t.y + 30; })); await shot('7-home-turf-panel');
await ctx.close();
await browser.close(); server.close(); process.exit(0);
