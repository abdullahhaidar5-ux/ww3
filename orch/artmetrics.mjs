// ART METRICS (D0b): headless shots of the standard battle views -> numbers (fps, draw calls, colour range, edge/boxiness,
// empty space) written to orch/reports/artmetrics.md. Numbers only: a human/ORCH glances at them, nobody reads pixels.
//   node orch/artmetrics.mjs            # writes orch/reports/artmetrics.md, prints the table
// Not a pass/fail gate (SwiftShader fps is meaningless as an absolute); compare run to run. Exit 1 only if it cannot run.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
import { newRun } from './runs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
}
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const RUN = newRun('artmetrics');
const rows = [];
let err = '';
// pixel stats computed inside the browser from the PNG (no image library needed)
const STATS = async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H); const hist = new Uint32Array(256); const hues = new Set();
  for (let i = 0, j = 0; i < d.length; i += 4, j++) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; L[j] = l; hist[l | 0]++;
    hues.add((d[i] >> 5) << 6 | (d[i + 1] >> 5) << 3 | (d[i + 2] >> 5)); }
  const pct = q => { let s = 0; const t = W * H * q; for (let i = 0; i < 256; i++) { s += hist[i]; if (s >= t) return i; } return 255; };
  // edge strength (Sobel), plus axis-aligned share = "boxiness" (hard horizontal/vertical edges vs diagonal/organic)
  let edge = 0, strong = 0, axis = 0; const B = 32, bw = Math.floor(W / B), bh = Math.floor(H / B), blk = new Float32Array(bw * bh);
  for (let y = 1; y < H - 1; y += 2) for (let xx = 1; xx < W - 1; xx += 2) {
    const i = y * W + xx, gx = L[i + 1] - L[i - 1], gy = L[i + W] - L[i - W], m = Math.hypot(gx, gy);
    edge += m; blk[Math.floor(y / B) * bw + Math.floor(xx / B)] += m;
    if (m > 40) { strong++; if (Math.min(Math.abs(gx), Math.abs(gy)) < .25 * Math.max(Math.abs(gx), Math.abs(gy))) axis++; } }
  const n = (W / 2) * (H / 2); let empty = 0; const bm = B * B / 4; for (const v of blk) if (v / bm < 3) empty++;
  return { p5: pct(.05), p95: pct(.95), range: pct(.95) - pct(.05), colours: hues.size, edge: +(edge / n).toFixed(2), strongPct: +(100 * strong / n).toFixed(1),
    boxiness: strong ? +(100 * axis / strong).toFixed(0) : 0, emptyPct: +(100 * empty / (bw * bh)).toFixed(0) };
};
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.n = 1; try { initAudio(); } catch {} startSingle(); if (G.teams[0] && !G.teams[0].ai) G.teams[0].ai = mkAI(1); });
  await page.waitForFunction(() => !window.LOADING, null, { timeout: 600000 });
  const views = [['base', null], ['army', 'army'], ['front', 'front']];
  for (let vi = 0; vi < views.length; vi++) {
    if (vi) await page.evaluate(() => { for (let i = 0; i < 5400; i++) simUpdate(1 / 60); }); // ~90 s of battle between views
    const [name, kind] = views[vi];
    await page.evaluate(([kind]) => {
      const live = G.ents.filter(e => !e.dead);
      let c = live.find(e => e.isB && e.team === 0) || live[0];
      if (kind) { const us = live.filter(e => !e.isB && e.team === 0); if (us.length) { const mx = us.reduce((s, e) => s + e.x, 0) / us.length, my = us.reduce((s, e) => s + e.y, 0) / us.length;
        c = us.reduce((b, e) => Math.hypot(e.x - mx, e.y - my) < Math.hypot(b.x - mx, b.y - my) ? e : b, us[0]); } }
      if (c) centerOn(c.x, c.y, true);
    }, [kind]);
    // fps = wall-clock frames of the real render path (software GL here: use it to compare runs, not as an absolute)
    const perf = await page.evaluate(() => { try { renderFrame(0.016); } catch {} R3.info.autoReset = false; R3.info.reset();
      const t = performance.now(); let n = 0; while (performance.now() - t < 2500 && n < 60) { renderFrame(0.016); n++; }
      const r = R3.info.render, f = Math.max(1, n); const out = { fps: +(n / ((performance.now() - t) / 1000)).toFixed(1), calls: Math.round(r.calls / f), tris: Math.round(r.triangles / f / 1000),
        units: G.ents.filter(e => !e.dead && !e.isB).length }; R3.info.autoReset = true; return out; });
    console.error("view",name,JSON.stringify(perf));const b64 = await page.evaluate(() => { renderFrame(0.016); return R3.domElement.toDataURL('image/png').split(',')[1]; }); // the 3D view only (no HUD), grabbed in the render task
    const png = path.join(RUN.dir, `art-${name}.png`); fs.writeFileSync(png, Buffer.from(b64, 'base64'));
    const st = await page.evaluate(STATS, b64);
    rows.push({ name, ...perf, ...st });
  }
} catch (e) { err = String(e && e.message || e); }
await browser.close(); server.close();
if (err || !rows.length) { console.log('ARTMETRICS FAIL: ' + err); process.exit(1); }
const sha = (await import('node:child_process')).execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
let md = `# Art metrics — ${new Date().toISOString().slice(0, 16)}Z @ ${sha}\n\nHeadless software-GL (SwiftShader), 800x450: **compare run to run, "fps" is CPU-side submit rate only, GPU work is not included.** Generated by \`node orch/artmetrics.mjs\`.\n\n`
  + `| view | units | fps | draw calls | k tris | luma range (p5–p95) | colours | edge | boxiness % | empty % |\n|---|---|---|---|---|---|---|---|---|---|\n`
  + rows.map(r => `| ${r.name} | ${r.units} | ${r.fps} | ${r.calls} | ${r.tris} | ${r.p5}–${r.p95} (${r.range}) | ${r.colours} | ${r.edge} | ${r.boxiness} | ${r.emptyPct} |`).join('\n')
  + `\n\nReading it: luma range < 90 = flat/washed; boxiness > 70 % = mostly straight axis-aligned edges (box buildings); empty % = share of 32px blocks with almost no detail (bare ground/sky).\n`;
fs.mkdirSync(path.join(ROOT, 'orch', 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'orch', 'reports', 'artmetrics.md'), md);
console.log(md); console.log('ARTMETRICS OK — shots in ' + RUN.rel);
