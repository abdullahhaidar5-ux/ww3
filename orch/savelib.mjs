// Shared helpers for save-game tests: a static server, headless Chromium, and a game boot.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.wasm': 'application/wasm' };
export async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
export async function boot() {
  await acquireBrowserLock();
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await guardContext(ctx);
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  const errs = [];
  async function open() {
    const page = await ctx.newPage();
    // deterministic mode: ONE seeded Math.random installed before the game loads (the game keeps references to it) that
    // window.__reseed(n) restarts, and a fake clock for performance.now (the path-finder's time budget)
    await page.addInitScript(() => { let a = 1, b = 7; window.__rc = 0; window.__stk = null;
      const caller = () => { const m = /\n\s*at [^\n]*\n\s*at [^\n]*\n\s*at ([^\n]*)/.exec(new Error().stack); return m ? m[1].replace(/\(.*$/, '').trim() : ''; };
      const toks = (x) => x.split(/[\s.\[\]]+/).filter(t => t && !['Object', 'as', 'at', 'Function', 'new', 'async'].includes(t));
      Math.random = () => { if (window.__probe) { window.__uuidName = toks(caller()); window.__probe = false; }
        if (window.__uuidName && toks(caller()).some(t => window.__uuidName.includes(t))) { b = Math.imul(b ^ b >>> 15, 0x2c1b3c6d) + 0x9e3779b9 | 0; return ((b ^ b >>> 13) >>> 0) / 4294967296; }  // Three.js object ids: their own stream
        window.__rc++; if (window.__stk) window.__stk.push(caller());
        a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; const r = ((t ^ t >>> 14) >>> 0) / 4294967296; if (window.__vals) window.__vals.push(window.__tick + ':' + r.toFixed(5) + ':' + (window.__stk ? '' : '')); return r; };
      window.__reseed = (s) => { a = s | 0; }; const pn = performance.now.bind(performance); let fake = false, c = 1e6; performance.now = () => fake ? (c += 1e-3) : pn(); window.__fakeClock = (on) => { fake = !!on; if (on) { try { part = function () {}; } catch (e) {} try { speak = function () {}; } catch (e) {} window.requestAnimationFrame = () => 0; }  /* no render loop: frames draw random numbers between the test's own steps */ }; });
    page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console error: ' + m.text().slice(0, 300)); });
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
    await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
    await page.evaluate(() => { window.__probe = true; THREE.MathUtils.generateUUID(); });
    return page;
  }
  return { open, ctx, browser, server, errs, base, close: async () => { await browser.close(); server.close(); } };
}
