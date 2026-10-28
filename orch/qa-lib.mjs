// Shared setup for the QA playtest scripts (orch/qa-*.mjs): local static server for the repo, headless Chromium
// (SwiftShader WebGL), pages that collect page errors / console errors, desktop or phone (touch) contexts, and a few
// helpers to read the DOM like a player sees it (what is on screen, clipped, overlapping).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { guardContext } from './serverdev.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHOTS = path.join(ROOT, 'orch', 'shots', 'qa');
fs.mkdirSync(SHOTS, { recursive: true });
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const VIEWPORTS = {
  fhd: { viewport: { width: 1920, height: 1080 } },
  hd: { viewport: { width: 1366, height: 768 } },
  sm: { viewport: { width: 1024, height: 576 } },
  phoneP: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  phoneL: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
};

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) {
    try { return req(p); } catch {}
  }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch {}
  return undefined;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.gz': 'application/gzip', '.glb': 'model/gltf-binary' };
export async function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, url: origin + '/index.html' };
}

export async function launch() {
  const { chromium } = await loadPlaywright();
  return chromium.launch({ executablePath: findChromium(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}

// errs: array the page pushes problems into (page errors, console errors, failed local requests)
export async function openPage(browser, origin, vpKey, errs, { storageState, allowHosts = [], dpr } = {}) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vpKey], ...(dpr ? { deviceScaleFactor: dpr } : {}), ...(storageState ? { storageState } : {}) });
  await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url(); return u.startsWith(origin) || allowHosts.some(h => u.startsWith(h)) ? r.continue() : r.abort(); });
  page.on('pageerror', e => errs.push(`[${vpKey}] page error: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() !== 'error' && m.type() !== 'warning') return; const t = m.text();
    if (/ERR_FAILED|net::ERR_|peer|PeerJS|ICE|AudioContext|autoplay|speechSynthesis|GPU stall|WebGL|GL_/i.test(t)) return;
    errs.push(`[${vpKey}] console ${m.type()}: ` + t.slice(0, 300)); });
  page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) errs.push(`[${vpKey}] HTTP ${r.status()} ${r.url().slice(origin.length)}`); });
  return { ctx, page };
}

export async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOTS, name), timeout: 180000 }); return 'orch/shots/qa/' + name; }
  catch (e) { console.log('  (screenshot ' + name + ' skipped: ' + String(e.message || e).split('\n')[0] + ')'); return null; }
}

export async function toMenu(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await sleep(800);
}

export async function waitLoaded(page, ms = 600000) {
  await page.waitForFunction(() => typeof G !== 'undefined' && G && !window.LOADING, null, { timeout: ms, polling: 500 });
}

// Visible interactive elements that stick out of the viewport, have clipped text, or overlap each other.
export async function layoutAudit(page, rootSel = 'body') {
  return page.evaluate((rootSel) => {
    const W = innerWidth, H = innerHeight, out = { offscreen: [], clipped: [], overlaps: [], tiny: [] };
    const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      for (let p = el; p; p = p.parentElement) if (p.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ' "' + (el.innerText || el.value || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
    const els = [...document.querySelectorAll(rootSel + ' button, ' + rootSel + ' select, ' + rootSel + ' input, ' + rootSel + ' a, ' + rootSel + ' label.btn2')].filter(vis);
    // scrollable ancestors make off-screen fine (menus scroll)
    const inScroller = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return true; } return false; };
    const rects = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if ((r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1) && !inScroller(el)) out.offscreen.push(name(el) + ` @${r.left|0},${r.top|0} ${r.width|0}x${r.height|0}`);
      if (el.tagName === 'BUTTON' && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && getComputedStyle(el).overflow !== 'visible') out.clipped.push(name(el));
      if (matchMedia('(pointer:coarse)').matches && (r.width < 32 || r.height < 32) && el.tagName === 'BUTTON') out.tiny.push(name(el) + ` ${r.width|0}x${r.height|0}`);
      rects.push([el, r]);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i], [b, rb] = rects[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 6 && iy > 6) {
        // only report if the top-most element at the overlap centre is one of them hiding the other
        const cx = (Math.max(ra.left, rb.left) + Math.min(ra.right, rb.right)) / 2, cy = (Math.max(ra.top, rb.top) + Math.min(ra.bottom, rb.bottom)) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (top && (a.contains(top) || b.contains(top))) out.overlaps.push(name(a) + ' × ' + name(b));
      }
    }
    return out;
  }, rootSel);
}
