// In-game UI shots + checks (ingameui, Abdullah 2026-11-07 12:06 "Menus in game need to be much more intuitive and professional").
// node orch/ingameui.mjs [--tag before|after] [--only province,battle,pause]  → orch/shots/ingameui/<tag>-<name>.png (≤1200 px)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = arg('tag', 'after'), ONLY = arg('only', 'province,battle,pause').split(',');
const OUT = path.join(ROOT, 'orch', 'shots', 'ingameui'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1200, height: 720 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 2).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const fails = []; const shot = async (n, clip) => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, TAG + '-' + n + '.png'), clip, timeout: 120000 }).catch(e => console.log('shot skipped', n, e.message.slice(0, 80))); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  if (ONLY.includes('battle') || ONLY.includes('pause')) {
    await page.evaluate(() => { startSingle(); $('menu').hidden = true; });
    await page.waitForFunction(() => !window.LOADING, null, { timeout: 480000, polling: 500 }).catch(() => fails.push('battle loading did not finish')); await page.waitForTimeout(1500);
    if (ONLY.includes('battle')) {
      await shot('battle');
      await page.evaluate(() => { const L = G.ents.filter(e => e.team === ME && !e.dead && !e.isB); G.sel = L.slice(0, 1); updateUI(); });
      await shot('battle-sel1');
      const r = await page.evaluate(() => { const L = G.ents.filter(e => e.team === ME && !e.dead && !e.isB); G.sel = L; updateUI(); return { card: !!document.querySelector('#info .ukG, #info .ukU'), icons: document.querySelectorAll('#panel .btn .uic').length, subs: [...document.querySelectorAll('#panel .sub[data-tab=build]')].length }; });
      console.log('battle', JSON.stringify(r)); if (TAG === 'after' && (!r.card || r.icons < 10 || r.subs < 2)) fails.push('battle panel: ' + JSON.stringify(r));
      await shot('battle-sel');
      await page.evaluate(() => { const b = document.querySelector('.tabs button[data-tab="units"]'); if (b) b.click(); }); await shot('battle-units');
    }
    if (ONLY.includes('pause')) {
      await page.evaluate(() => { G.sel = []; togglePause(true); }); await shot('pause');
      const pm = await page.evaluate(() => ({ items: [...document.querySelectorAll('#pauseOv .ukMenu button')].map(b => b.textContent), vis: !$('pauseOv').hidden }));
      console.log('pause', JSON.stringify(pm)); if (TAG === 'after' && (!pm.vis || pm.items.length < 6)) fails.push('pause menu: ' + JSON.stringify(pm));
      await page.evaluate(() => $('pSettings').click()); await shot('settings');
      const sp = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('#settings .uk-tab')].filter(b => !b.hidden).map(b => b.textContent), on: !$('settings').hidden }));
      console.log('settings', JSON.stringify(sp)); if (TAG === 'after' && sp.tabs.length < 3) fails.push('settings tabs: ' + JSON.stringify(sp));
      await page.evaluate(() => { const b = document.querySelector('#settings .uk-tab[data-pt="ctl"]'); if (b) b.click(); }); await shot('settings-controls');
      await page.keyboard.press('Escape'); const back = await page.evaluate(() => ({ set: $('settings').hidden, pause: !$('pauseOv').hidden }));
      console.log('esc', JSON.stringify(back)); if (TAG === 'after' && !(back.set && back.pause)) fails.push('Esc from Settings should go back to the pause menu ' + JSON.stringify(back));
    }
  }
} catch (e) { fails.push('crash: ' + e.message.slice(0, 200)); }
if (errs.length) console.log('page errors:', errs.slice(0, 4).join(' || '));
console.log(fails.length ? 'INGAMEUI FAIL ' + fails.join('; ') : 'INGAMEUI PASS');
await b.close(); server.close(); process.exit(fails.length ? 1 : 0);
