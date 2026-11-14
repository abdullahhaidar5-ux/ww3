// Regression: firing a nation's superweapon strike in a Battle must not freeze the game.
// Pass = launch works, no console/page errors, and no single simulation/FX function call (everything except the GPU draw, which is
// software-rendered and seconds per frame in headless boxes, so the raw frame gaps are printed for information only) takes > LIMIT ms.
// For each faction (default IR,RU,US) starts a Battle, builds an uplink, fires the strike, records requestAnimationFrame gaps
// for 15 s and console errors. Prints per faction max gap; "SUPERFREEZE PASS" (see above).
//   node orch/superfreeze.mjs [IR,RU,KP,US]   LIMIT=100 SHOT=1 (screenshots to orch/shots)
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
const LIMIT = +(process.env.LIMIT || 150), FACS = (process.argv[2] || 'IR,RU,US').split(',');
await acquireBrowserLock('superfreeze'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const fac of FACS) {
  const page = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(m => { window.__MAP = m; }, process.env.MAP || null);
  await page.evaluate(f => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = f; if (window.__MAP) setup.map = window.__MAP; startSingle(); }, fac);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  const info = await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq') || G.ents.find(e => e.team === ME && e.isB);
    let up = G.ents.find(e => e.team === ME && e.kind === 'uplink'); if (!up) up = addBld(ME, 'uplink', hq.x + 120, hq.y + 60, 1); up.built = 1; up.hp = up.max;
    const T = G.teams[ME]; T.credits = 50000; T.charge = T.sup.charge;
    let en = G.ents.find(e => e.isB && e.team !== ME && !e.dead) || hq;
    window.__gaps = []; let last = performance.now(); (function loop() { const n = performance.now(); window.__gaps.push(n - last); try { const i = R3.info; (window.__ri = window.__ri || []).push([i.render.calls, i.render.triangles, i.programs ? i.programs.length : -1, i.memory.geometries, i.memory.textures, typeof PARTS !== 'undefined' ? PARTS.length : -1].join('/')); } catch (e) {} last = n; if (window.__ff && G && !G.over) for (let k = 0; k < 25; k++) simUpdate(0.05); requestAnimationFrame(loop); })();
    cam.x = en.x; cam.y = en.y; window.__tgt = [en.x, en.y]; return { sup: T.sup.name, working: working(ME, 'uplink'), n: T.sup.n }; });
  await page.evaluate(() => { window.__prof = {}; for (const n of ['bmTick', 'updStrikes', 'explode', 'megaBoom', 'boomFX', 'mslSpawn', 'mslLaunch', 'mslTrail', 'mushTick', 'sfxMega', 'sfxBoom', 'sfxLaunch', 'launch', 'simUpdate', 'renderFrame', 'updateUI', 'netTick', 'kcRec', 'rpRecTick', 'scroll', 'qualTick', 'fireTick', 'polBlast', 'collateral', 'lgBlast', 'dugBlast', 'ecBoom', 'damBlast', 'fireHit', 'applyDmg', 'physImpulse', 'opHit', 'hulkAdd', 'bfSmkAdd']) { const f = window[n] || (0, eval)('typeof ' + n + "==='function'?" + n + ':null'); if (!f) continue; const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t, q = window.__prof[n] = window.__prof[n] || { n: 0, tot: 0, max: 0 }; q.n++; q.tot += d; q.max = Math.max(q.max, d); } }; try { (0, eval)(n + '=arguments[0]'); } catch (e) {} try { window[n] = w; } catch (e) {} } });
  await page.waitForTimeout(+(process.env.SETTLE || 12000)); const pre = await page.evaluate(() => { const g = window.__gaps.slice().sort((a, b) => a - b); return g[g.length >> 1] | 0; }); await page.evaluate(() => { window.__gaps.length = 0; });
  await page.evaluate(() => { window.__p0 = new Set(R3.info.programs.map(p => p.cacheKey)); });
  const ok = await page.evaluate(() => { window.__t0 = G.t; window.__ff = 1; return launch(ME, __tgt[0], __tgt[1]); });
  await page.waitForTimeout(+(process.env.WAIT || 25000));
  if (process.env.SHOT) await page.screenshot({ path: path.join(OUT, `superfreeze-${fac}.png`), timeout: 300000 });
  const g = await page.evaluate(() => window.__gaps.slice()); const max = Math.max(...g), over = g.filter(x => x > LIMIT).length;
  const newProgs = await page.evaluate(() => R3.info.programs.filter(p => !window.__p0.has(p.cacheKey)).map(p => (p.cacheKey.length + ':' + p.cacheKey.replace(/[\s]+/g, ' ').slice(0, 90))));
  console.log('newPrograms', newProgs.length, newProgs.join('\n  '));
  const prof = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.__prof || {}).map(([k, v]) => [k, [v.n, Math.round(v.tot), Math.round(v.max)]]))));
  console.log('prof', prof, 'preMedianGap=' + pre);
  console.log(fac, JSON.stringify(info), 'launched=' + ok, 'simSecs=' + Math.round(await page.evaluate(() => G.t - window.__t0)), 'frames=' + g.length, 'maxGap=' + Math.round(max) + 'ms', 'over' + LIMIT + '=' + over, 'ri(calls/tris/progs/geo/tex/parts)=' + (await page.evaluate(() => (window.__ri || []).slice(-14).join(' '))), 'gaps=' + g.slice(0, 12).map(Math.round).join(','), 'errors=' + errs.length, errs.slice(0, 3).join(' | '));
  const stall = await page.evaluate(() => Object.entries(window.__prof || {}).filter(([k]) => k !== 'renderFrame').map(([k, v]) => [k, Math.round(v.max)]).sort((a, b) => b[1] - a[1])[0] || ['-', 0]);
  console.log(fac, 'worst JS call (not drawing):', stall[0], stall[1] + 'ms', stall[1] > LIMIT ? 'TOO SLOW' : 'ok');
  if (!ok || stall[1] > LIMIT || errs.length) bad++;
  await page.close();
}
console.log(bad ? 'SUPERFREEZE FAIL' : 'SUPERFREEZE PASS'); await browser.close(); server.close(); process.exit(bad ? 1 : 0);
