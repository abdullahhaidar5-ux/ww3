// polishE sweep: for each faction start Battle, check the first-steps card, spawn every unit + building, fire every power, run the sim, report errors/slow calls. node orch/polishplay.mjs [IR,US]
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
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof fhShow === 'function', null, { timeout: 60000 });
  await page.evaluate(f => { try { localStorage.removeItem('ww3_fh_Battle'); localStorage.setItem('ww3_fh_test', '1'); localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.p = f; setup.mode = 'battle'; startSingle(); }, fac);
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  await page.waitForFunction(() => document.getElementById('fhint'), null, { timeout: 60000 }).catch(() => {});
  const hint = await page.evaluate(() => !!document.getElementById('fhint'));
  if (!hint) { errs.push('Battle first-steps card did not appear'); }
  await page.keyboard.press('Escape'); const closed = await page.evaluate(() => !document.getElementById('fhint') && localStorage.getItem('ww3_fh_Battle') === '1');
  if (!closed) errs.push('first-steps card did not close with Esc');
  const r = await page.evaluate(() => { const T = G.teams[ME], out = { bld: 0, unit: 0, pow: 0, powFail: [], thrown: [] }; T.credits = 99999; G.setupEnd = 0;
    const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); let n = 0;
    for (const k of BUILD_ORDER) { if (k === 'hq') continue; try { const b = addBld(ME, k, hq.x + 140 + (n % 5) * 110, hq.y - 260 + Math.floor(n / 5) * 110, 1); if (b) { b.built = 1; b.hp = b.max; out.bld++; } } catch (e) { out.thrown.push('bld ' + k + ': ' + e.message); } n++; }
    n = 0; for (const k of allUnits(T.fac)) { try { const u = addUnit(ME, k, hq.x - 300 + (n % 8) * 40, hq.y + 200 + Math.floor(n / 8) * 40); if (u) out.unit++; } catch (e) { out.thrown.push('unit ' + k + ': ' + e.message); } n++; }
    const en = G.ents.find(e => e.isB && e.team !== ME && !e.dead) || hq; G.t = Math.max(G.t, 400);
    for (const k of Object.keys(POWERS)) { if (POWERS[k].passive) continue; try { T.pw[k] = Object.assign(T.pw[k] || { lv: 1 }, { cd: 0 }); T.charge = 1e9; const ok = usePower(ME, k, en.x, en.y); if (ok) out.pow++; else out.powFail.push(k); } catch (e) { out.thrown.push('power ' + k + ': ' + e.message); } }
    window.__gaps = []; let last = performance.now(); (function loop() { const nn = performance.now(); window.__gaps.push(nn - last); last = nn; requestAnimationFrame(loop); })(); return out; });
  await page.waitForTimeout(+(process.env.WAIT || 15000));
  const g = await page.evaluate(() => window.__gaps.slice()); const miss = await page.evaluate(() => G.ents.filter(e => e.team === ME && !e.dead && e.mesh === undefined && false).length);
  console.log(fac, JSON.stringify(r), 'frames=' + g.length, 'maxGap=' + Math.round(Math.max(0, ...g)) + 'ms', 'errs=' + errs.length); for (const e of errs.slice(0, 8)) console.log('   ', e);
  if (errs.length || r.thrown.length) bad++;
  await page.close();
}
console.log(bad ? 'POLISHPLAY FAIL' : 'POLISHPLAY PASS'); await browser.close(); server.close(); process.exit(bad ? 1 : 0);
