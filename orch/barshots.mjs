// Screenshots of the command bar in a live skirmish at phone portrait (390x844), phone landscape (844x390, both with
// mobile/touch emulation) and desktop (1366x768) sizes, with the Construction Vehicle selected so the Build tab shows
// its full grid. Prints, per size, where each command button sits and any text in the bar that is cut off without an
// ellipsis. Screenshots: orch/out/bar-portrait.png, bar-landscape.png, bar-desktop.png.
//   node orch/barshots.mjs [--tag -x] [--names]   (SIZES=p,l,d to pick sizes; --names: list every faction's command-button
//   names that don't fit, and buttons under 40 px, on every tab -> BARNAMES PASS / FAIL)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'out');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '';
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(ROOT, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of [ '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('barshots');
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
  d: { name: 'desktop', viewport: { width: 1366, height: 768 } } };
const errs = [], NAMES = process.argv.includes('--names'); let namesBad = 0;
for (const s of sizes) {
  const c = cfg[s]; const ctx = await browser.newContext({ viewport: c.viewport, isMobile: !!c.isMobile, hasTouch: !!c.hasTouch, deviceScaleFactor: c.deviceScaleFactor || 1 });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push(c.name + ': ' + e.message));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; startSingle(); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });
  // select the dozer so the build tab shows its full grid
  await page.evaluate(() => { const dz = G.ents.find(e => e.team === ME && e.kind === 'dozer'); if (dz) { G.sel = [dz]; } try { updateUI(); } catch (e) {} });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => { const p = document.getElementById('panel'), r = p.getBoundingClientRect(); const out = [];
    for (const b of p.querySelectorAll('.btn')) { const q = b.getBoundingClientRect(); out.push([b.textContent.trim().slice(0, 18), Math.round(q.left), Math.round(q.right)]); }
    const clip = []; for (const el of document.querySelectorAll('#side *')) { if (!el.offsetParent || !el.childElementCount && !el.textContent.trim()) continue;
      const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && cs.textOverflow !== 'ellipsis') clip.push((el.id || el.className || el.tagName) + ' ' + el.scrollWidth + '>' + el.clientWidth); }
    return { vw: innerWidth, panel: [Math.round(r.left), Math.round(r.right), p.scrollWidth, p.clientWidth], btns: out, clip: clip.slice(0, 12), info: document.getElementById('info').innerText.slice(0, 200) }; });
  console.log(c.name, JSON.stringify(m));
  await page.screenshot({ path: path.join(OUT, `bar-${c.name}${TAG}.png`), timeout: 300000 });
  if (NAMES) { // every faction, every tab: which command-button names don't fit (ellipsis or clipped)
    const cut = await page.evaluate(() => { const T = G.teams[ME], f0 = T.fac, out = {}, Fs = Object.keys(FACTIONS);
      for (const f of Fs) { T.fac = f; try { buildPanels(); } catch (e) { out[f] = ['buildPanels: ' + e.message]; continue; }
        for (const tab of ['build', 'units', 'upg', 'pow']) { showTab(tab);
          for (const b of document.querySelectorAll('#panel>.btn[data-tab="' + tab + '"]')) { const n = b.querySelector('.n'), r = b.getBoundingClientRect();
            if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) (out[f] = out[f] || []).push(tab + ': ' + n.textContent + ' (' + n.scrollWidth + '>' + n.clientWidth + ')');
            if (r.height < 40 || r.width < 40) (out[f] = out[f] || []).push(tab + ': ' + n.textContent + ' button ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' < 40px'); } } }
      T.fac = f0; buildPanels(); return out; });
    const n = Object.values(cut).reduce((a, v) => a + v.length, 0);
    console.log(`${c.name}: ${n} command-button names cut off or buttons under 40 px` + (n ? '\n  ' + Object.entries(cut).map(([f, v]) => f + ': ' + v.join(' | ')).join('\n  ') : ''));
    if (n) namesBad += n;
  }
  await ctx.close();
}
await browser.close(); server.close();
if (errs.length) console.log('ERRORS', errs);
if (NAMES) console.log(namesBad ? `BARNAMES FAIL (${namesBad})` : 'BARNAMES PASS');
