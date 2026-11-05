// Trailer HUD stills (full UI, 1920x1080): hud-online.png (main menu: nations + Play online) and hud-supply.png (ammo/supply bars,
// selected squad, town). Slow in software GL (one screenshot each). Output: orch/shots/tr/hud-*.png
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('playwright').catch(() => import('/opt/npm-tools/node_modules/playwright/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const page0 = fs.readFileSync(path.join(ROOT, 'index.html'));
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page0); }
  if (p === '/sw.js') { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const U = `http://127.0.0.1:${server.address().port}/index.html`;
const OUT = path.join(ROOT, 'orch', 'shots', 'tr');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('ww3_welcomed', '1'); localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {} });
await page.goto(U, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, 'hud-online.png'), timeout: 300000 }); console.log('menu done');
await page.evaluate(() => { try { initAudio(); AU.musicOn = false; AU.sfxOn = false; AU.voiceOn = false; applyAudio(); } catch (e) {} QUAL.caps = [.667, .667, .667, .667, .667, .667]; QUAL.lv = 1; POST.phone = true;
  Object.assign(setup, { map: 'zagros', n: 1, p: 'RS', a: 'US', others: [], tm: [], slot: -1, seed: 7, w: 0 }); startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 900000, polling: 500 });
await page.evaluate(() => { window.__stopLoop = true; for (let i = 0; i < 60 * 70; i++) simUpdate(1 / 60); G.paused = true; });
const r = await page.evaluate(() => { const hq = G.ents.find(e => e.team === ME && e.kind === 'hq'); const us = G.ents.filter(e => e.team === ME && !e.isB && hasAmmo(e)).slice(0, 8);
  us.forEach((u, i) => { u.x = hq.x + 300 + (i % 4) * 34; u.y = hq.y + 60 + Math.floor(i / 4) * 40; ammoInit(u); u.am = [u.amx * .22, u.amx * .6, u.amx * .9][i % 3]; for (const k of ['ox']) u[k] = u.x; u.oy = u.y; });
  G.sel = us; centerOn(hq.x + 330, hq.y + 120, true); updateUI(); renderFrame(1 / 30); return us.length; });
console.log('units', r); await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, 'hud-supply.png'), timeout: 300000 }); console.log('hud done');
await browser.close(); server.close();
