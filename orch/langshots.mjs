// "One language" battle pictures (orch/concepts/ONE-LANGUAGE.md, ideas 3, 1, 2) at 1600x900 in a real skirmish.
//   node orch/langshots.mjs <scene> <tag>     scene = btn | ring | order ; writes orch/shots/lang-battle/<scene>-<tag>.jpg
// Prints LANGSHOTS OK / page errors. The scene only places units and moves the mouse - it reads no game internals
// that the idea did not add (so the same script takes the BEFORE and the AFTER picture).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots', 'lang-battle');
const SCENE = process.argv[2] || 'btn', TAG = process.argv[3] || 'after';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('langshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await guardContext(ctx);
const page = await ctx.newPage(), errs = [];
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => errs.push(e.message));
await page.goto(ORIGIN + '/index.html?lazy=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.fac = 'IR'; startSingle(); });
await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.t > .2, null, { timeout: 600000, polling: 500 });
// the scene: a mixed group of mine near my base, a mixed enemy group a little to the side; camera on them
const info = await page.evaluate((scene) => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'), T = G.teams[ME]; T.credits = 9000;
  const en = G.teams.findIndex((t, i) => i !== ME && !ally(i, ME)); const cx = hq.x + (hq.x < MAPW / 2 ? 330 : -330), cy = hq.y + (hq.y < MAPH / 2 ? 260 : -260);
  const mine = ['inf', 'inf', 'at', 'tank', 'aa', 'inf'], foe = ['tank', 'inf', 'heli'], out = { mine: [], foe: [] };
  mine.forEach((k, i) => { const u = addUnit(ME, k, cx - 120 + (i % 3) * 70, cy + 40 + ((i / 3) | 0) * 70); if (u) out.mine.push(u.id); });
  foe.forEach((k, i) => { const u = addUnit(en, k, cx + 130 + i * 70, cy - 150); if (u) { u.hold = 1; out.foe.push(u.id); } });
  
  try { centerOn(cx, cy, true); } catch (e) {} try { showTab('units'); } catch (e) {} try { updateUI(); } catch (e) {}
  return out; }, SCENE);
await page.waitForTimeout(3000);
if (SCENE === 'btn') { // hover a unit button, then (AFTER only does something) select the enemy tank
  const b = await page.$('#u_at'); if (b) { const r = await b.boundingBox(); if (r) await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); }
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `btn-${TAG}.jpg`), type: 'jpeg', quality: 82, timeout: 300000 }); console.log("shot");
  await page.evaluate((id) => { const e = G.ents.find(u => u.id === id); G.sel = [e]; try { updateUI(); } catch (_) {} }, info.foe[0]);
  await page.mouse.move(800, 300); await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `btn-enemy-${TAG}.jpg`), type: 'jpeg', quality: 82, timeout: 300000 }); console.log("shot");
}
const bar = await page.evaluate(() => { const p = document.getElementById('panel').getBoundingClientRect(); return [p.left | 0, p.top | 0, p.width | 0, p.height | 0]; });
console.log('panel', JSON.stringify(bar));
await ctx.close(); await browser.close(); server.close();
console.log(errs.length ? 'LANGSHOTS ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'LANGSHOTS OK');
process.exit(0);
