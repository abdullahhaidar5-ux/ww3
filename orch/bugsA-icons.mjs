// Contact sheet of every command-bar picture (build + units tabs) for IR, US, RU, KP, RS, CN. TAG=before|after. Prints key/name/branch per button.

import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import { createRequire } from 'node:module';import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots');
const { acquireBrowserLock } = await import(path.join(ROOT, 'orch/browserlock.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of ['/opt/npm-tools/node_modules/playwright','/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } } } catch {}
await acquireBrowserLock('bugsA-icons'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} setup.n = 1; startSingle(); });
await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000, polling: 500 });

const FACS = (process.env.FACS || 'IR,US,RU,KP,RS,CN').split(',');
const data = await page.evaluate((FACS) => { const T = G.teams[ME], f0 = T.fac, out = {};
  for (const f of FACS) { T.fac = f; buildPanels(); out[f] = [];
    for (const tab of ['build', 'units']) { showTab(tab);
      for (const b of document.querySelectorAll('#panel>.btn[data-tab="' + tab + '"]')) { const cv = b.querySelector('canvas.uic'); if (!cv) continue; out[f].push({ tab, key: b.id.slice(2), name: b.dataset.nm, img: cv.toDataURL(), cls: (b.id.startsWith('u_') ? (stats(f, b.id.slice(2)) || {}).cls : 'bld'), br: (typeof UK !== 'undefined' && UK.iconBranch) ? UK.iconBranch(b.id.slice(2), tab === 'build', tab === 'build' ? bstats(f, b.id.slice(2)) : stats(f, b.id.slice(2))) : '' }); } } }
  T.fac = f0; buildPanels(); return out; }, FACS);
for (const f of FACS) console.log(f, data[f].map(d => d.key + (d.br ? ':' + d.br : '')).join(' '));
// guard: nothing that is not infantry may fall back to the soldier picture, and every faction's buttons must have a picture
const bad = []; for (const f of FACS) for (const d of data[f]) { if (!d.br) bad.push(f + ' ' + d.key + ': no icon class'); else if (d.br === 'inf' && d.cls !== 'inf') bad.push(f + ' ' + d.key + ' (' + d.cls + ') draws the soldier'); }
console.log(bad.length ? 'ICONS FAIL\n  ' + bad.join('\n  ') : 'ICONS PASS');
const pg = await (await browser.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
let html = '<body style="background:#16201b;color:#e9e4d4;font:11px sans-serif;margin:6px">';
for (const f of FACS) { html += '<div style="margin:4px 0 2px;font:700 13px sans-serif;color:#e3b341">' + f + '</div><div style="display:flex;flex-wrap:wrap;gap:4px">'; for (const d of data[f]) html += '<div style="width:88px;text-align:center;background:#24332b;border-radius:3px;padding:2px"><img src="' + d.img + '" style="width:72px;height:56px"><div style="height:26px;overflow:hidden;line-height:13px">' + d.name + '</div></div>'; html += '</div>'; }
await pg.setContent(html); await pg.screenshot({ path: path.join(OUT, 'icons-' + (process.env.TAG || 'before') + '.png'), fullPage: true });
await browser.close(); server.close(); process.exit(bad.length ? 1 : 0);
