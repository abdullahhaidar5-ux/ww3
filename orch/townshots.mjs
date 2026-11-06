// Town look screenshots: node orch/townshots.mjs <tag> [map:nation:style ...]  -> orch/shots/towns-look/<tag>-<map>-<style>.png
// For each map picks the biggest non-hamlet town (or the first hamlet with --ham), frames it at RTS height, and also a close-up.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const req = createRequire(import.meta.url);
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs')); const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
pw = pw.chromium ? pw : pw.default;
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('townshots');
const TAG = process.argv[2] || 'x'; const JOBS = process.argv.slice(3).map(s => s.split(':')); const HAM = process.argv.includes('--ham');
const OUT = path.join(ROOT, 'orch/shots/towns-look'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; let f = path.join(ROOT, p); if (process.env.INDEX_FILE && p === '/index.html') f = process.env.INDEX_FILE;
  if (!(f.startsWith(ROOT) || f === process.env.INDEX_FILE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await (pw.chromium || pw).launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
console.log('start');
for (const [map, nat, wantStyle] of JOBS) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort()); page.on('pageerror', e => console.log('PAGEERR', e.message)); page.on('console', m => { const t = m.text(); if (/error|warn|load/i.test(t)) console.log('CON', t.slice(0, 160)); });
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(([m, n]) => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; setup.map = m; setup.p = n; setup.a = n === 'US' ? 'RU' : 'US'; startSingle(); }, [map, nat]);
  console.log('page up'); for (let i = 0; i < 60; i++) { const st = await page.evaluate(() => ({ L: window.LOADING && String(window.LOADING).slice(0, 60), G: typeof G !== 'undefined' && !!G })); console.log('state', JSON.stringify(st)); if (!st.L && st.G) break; await page.waitForTimeout(15000); }
  await page.waitForFunction(() => !window.LOADING && typeof G !== 'undefined' && G && G.towns, null, { timeout: 900000, polling: 500 });
  const info = await page.evaluate(([ham, ws]) => { document.querySelectorAll('div').forEach(el => { if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200) el.style.display = 'none'; });
    const c = G.towns.filter(t => !!t.ham === ham && (!ws || (t.style || '').includes(ws))).sort((a, b) => b.cells.length - a.cells.length)[0]; if (!c) return null; G.fogOff = 1; try { for (const T of G.teams) T.fogOff = 1; } catch (e) {} return { x: c.x, y: c.y, style: c.style, name: c.name, n: c.cells.length }; }, [HAM, wantStyle || '']);
  if (!info) { console.log('no town', map); await ctx.close(); continue; } console.log(map, JSON.stringify(info));
  if (process.env.PROBE) { console.log('PROBE', JSON.stringify(await page.evaluate(() => { const o = []; CITYM.traverse(m => { if (m.geometry) o.push(m.geometry.attributes.position.count); }); try { R3.info.autoReset = false; R3.info.reset(); renderFrame(1 / 60); } catch (e) {} return { nm: o.length, verts: o.reduce((a, b) => a + b, 0), calls: R3.info.render.calls, tris: R3.info.render.triangles, objs: WORLD.children.length, builds: window.__cb | 0 }; }))); await ctx.close(); continue; }
  const shot = async (name, dist, tilt) => { await page.evaluate(([x, y, d, tl]) => { centerOn(x, y, true); cam.td = d; cam.dist = d; if (tl != null) cam.tilt = tl; G.sel = []; try { simUpdate(.1); updateUI(); } catch (e) {} for (let i = 0; i < 6; i++) { try { camTick(.2); } catch (e) {} } }, [info.x, info.y, dist, tilt]); await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${TAG}-${map}-${name}.png`), timeout: 300000 }); };
  await shot('rts', 430, null); await shot('close', 230, null);
  const mq = await page.evaluate(() => { try { const e = [...tlLandmarks()].find(q => q[1]); const b = e && G.map.cityBlds[e[0]]; return b ? { x: b.x, y: b.y } : null; } catch (e) { return null; } }); if (mq) { info.x = mq.x; info.y = mq.y; await shot('mosque', 130, null); }
  await ctx.close();
}
await browser.close(); server.close(); process.exit(0);
