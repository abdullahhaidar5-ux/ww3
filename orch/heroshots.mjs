// Hero squad screenshots (desktop 1366x768 + one phone view) -> orch/shots/heroes/. node orch/heroshots.mjs [IR,RS,DW,US,RU,KP]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = createRequire(import.meta.url)(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('heroshots');
const SH = path.join(ROOT, 'orch', 'shots', 'heroes'); fs.mkdirSync(SH, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const facs = (process.argv[2] || 'IR,RS,DW,US,RU,KP').split(',');
for (const fac of facs) {
  for (const phone of fac === 'IR' ? [false, true] : [false]) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
    await guardContext(ctx); const page = await ctx.newPage();
    await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
    page.on('pageerror', e => console.log('PAGEERR', e.message));
    await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
    await page.evaluate((f) => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} setup.n = 1; setup.p = f; setup.a = f === 'US' ? 'RU' : 'US'; try { setup.map = 'fulda'; } catch (e) {} startSingle(); }, fac);
    await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
    const shot = async (name) => { await page.evaluate(() => { for (const el of document.querySelectorAll('div')) if (/Choose your General Doctrine/.test(el.textContent) && el.getBoundingClientRect().height < 200 && el.children.length < 8) el.style.display = 'none'; }); await page.waitForTimeout(1200); await page.screenshot({ path: path.join(SH, name + '.png'), timeout: 180000 }); };
    // a hero squad with a few riflemen, fog lifted, the unit selected with its ability button on the command card
    const info = await page.evaluate(() => { for (const T of G.teams) if (T.ai) T.ai = null; G.setupEnd = 0; const T = G.teams[ME]; T.rank = 5; T.credits = 99999;
      const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const x = hq.x + 150, y = hq.y + 40;
      const h = addUnit(ME, 'champ', x, y); h.habT = 0; for (let i = 0; i < 6; i++) addUnit(ME, 'inf', x - 30 + (i % 3) * 14, y + 20 + ((i / 3) | 0) * 14);
      T.reveals.push({ x, y, r: 400, t: 600 }); centerOn(x, y, true); G.sel = [h]; for (let i = 0; i < 3; i++) simUpdate(.2); updateUI(); return { name: h.s.name, hab: h.s.hab, fac: T.fac }; });
    console.log(fac, JSON.stringify(info));
    await shot((phone ? 'phone-' : '') + fac + '-hero');
    if (fac === 'IR' && !phone) { await page.evaluate(() => { radioCall('armL'); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SH, 'IR-callout-subtitle.png'), timeout: 180000 }); }
    if (fac === 'US') { await page.evaluate(() => { radioCall('base'); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SH, 'US-callout-subtitle.png'), timeout: 180000 }); }
    await ctx.close();
  }
}
await browser.close(); server.close(); console.log('HEROSHOTS DONE');
