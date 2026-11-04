// Map editor test: opens the editor from the menu, paints a symmetric map with the mouse, undo/redo, fair-play check,
// save/reload, share code round trip (same key = same map), then plays it vs AI. Screenshots -> orch/shots/editor/.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SH = path.join(ROOT, 'orch', 'shots', 'editor');
fs.mkdirSync(SH, { recursive: true });
async function loadPlaywright() { try { return await import('playwright'); } catch {} const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} } throw new Error('no playwright'); }
function findChromium() { const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;
const fails = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
await ctx.route('**/*', r => r.request().url().startsWith(BASE.replace('/index.html', '')) ? r.continue() : r.abort());
const page = await ctx.newPage();
page.on('pageerror', e => fails.push('page error: ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load|peer|WebSocket|AudioContext|ICE/i.test(m.text())) fails.push('console: ' + m.text().slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof ED === 'object', null, { timeout: 60000 });
ok(await page.evaluate(() => !!document.getElementById('edBtn')), 'menu has the Map editor button');
await page.evaluate(() => document.getElementById('edBtn').click());
await page.waitForTimeout(400);
ok(await page.evaluate(() => ED.open && document.getElementById('edOv').classList.contains('on')), 'editor opens');
// world <-> page coordinates
const toPage = async (x, y) => page.evaluate(([x, y]) => { const r = ED.cv.getBoundingClientRect(), s = edW2S(x, y); return [r.left + s[0], r.top + s[1]]; }, [x, y]);
const tool = id => page.evaluate(id => document.querySelector(`#edTools button[data-t=${id}]`).click(), id);
const click = async (x, y) => { const [px, py] = await toPage(x, y); await page.mouse.click(px, py); };
const drag = async pts => { const [x0, y0] = await toPage(...pts[0]); await page.mouse.move(x0, y0); await page.mouse.down(); for (const p of pts.slice(1)) { const [x, y] = await toPage(...p); await page.mouse.move(x, y, { steps: 4 }); } await page.mouse.up(); };
await page.evaluate(() => { ED.c.nm = 'Test Ford'; ED.mirror = 'p'; edUI(); });
await tool('start'); await click(520, 1500);
ok(await page.evaluate(() => ED.c.sl.length === 2), 'one tap with 180° mirror places 2 starts');
await tool('river'); await page.evaluate(() => { ED.mirror = 'off'; }); await drag([[-0, 1100], [900, 1000], [1700, 1200], [2400, 1050], [3200, 1100]].map(([x, y]) => [Math.max(10, x), y]));
ok(await page.evaluate(() => ED.c.rv.length === 1), 'river drawn');
await tool('bridge'); await click(900, 1000); await click(2400, 1050);
ok(await page.evaluate(() => ED.c.br.length === 2), 'two bridges placed on the river');
await page.evaluate(() => { ED.mirror = 'p'; });
await tool('raise'); await drag([[1300, 400], [1500, 560], [1800, 520]]);
await tool('forest'); await drag([[900, 1650], [1100, 1700], [1300, 1650]]);
await tool('rocks'); await click(1600, 700);
await tool('town'); await click(2300, 1650);
await tool('oil'); await click(1500, 1550);
await tool('supply'); await click(900, 1300);
await tool('road'); await drag([[520, 1500], [1000, 1380], [1500, 1100]]);
const n1 = await page.evaluate(() => ED.c.rg.length + ED.c.wd.length + ED.c.pk.length + ED.c.ct.length + ED.c.oil.length + ED.c.fl.length + ED.c.rd.length);
ok(n1 >= 14, 'mirror doubles each placement (' + n1 + ' features)');
await page.screenshot({ path: path.join(SH, 'editor-painted.png') });
await page.evaluate(() => edUndo()); ok(await page.evaluate(() => ED.redo.length === 1), 'undo works'); await page.evaluate(() => edRedo());
ok(await page.evaluate(() => ED.redo.length === 0 && ED.c.rd.length === 2), 'redo works');
// erase one town both sides
await tool('erase'); await page.evaluate(() => { ED.mirror = 'off'; }); await click(2300, 1650);
ok(await page.evaluate(() => ED.c.ct.length === 1), 'erase removes a feature'); await page.evaluate(() => edUndo());
// check + preview
const res = await page.evaluate(() => edCheck(ED.c));
console.log('check:', JSON.stringify(res));
ok(Array.isArray(res) && res.length > 0, 'fair-play check runs');
await page.evaluate(() => { ED.showPrev = true; edPrev(); }); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(SH, 'editor-preview.png') });
// a deliberately broken map: starts split by an unbridged river must be reported
const bad = await page.evaluate(() => { const c = JSON.parse(JSON.stringify(ED.c)); c.br = []; c.rv = [[200, 0, 1100, 3200, 1100]]; c.rg = []; c.lk = []; c.sl = [[500, 400], [2700, 1800]]; c.fl = []; c.oil = []; return edCheck(c); });
ok(bad.some(r => r.l === 'err' && /No ground path/.test(r.m)), 'check reports starts cut off by water');
// save, share code, key identical on a fresh register, library persists over reload
await page.evaluate(() => edSave());
const info = await page.evaluate(() => { const k = registerCustomMap(ED.c); return { k, code: customMapCode(k), lib: edLib().length, ok2: registerCustomMap(customMapCode(k)) === k }; });
ok(/^cm_/.test(info.k) && info.ok2 && info.lib === 1, 'saved; code round-trips to the same key ' + info.k + ' (' + info.code.length + ' chars)');
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startSingle === 'function' && typeof ED === 'object', null, { timeout: 60000 });
ok(await page.evaluate(k => !!MAPS[k], info.k), 'saved map is known after a reload');
ok(await page.evaluate(k => !!document.querySelector('#mapSel option[value=' + k + ']'), info.k), 'saved map is in the battlefield list');
// a tampered code must not match the announced key
ok(await page.evaluate(([k, code]) => acceptCustomMap(k, code.slice(0, -6) + 'AAAAAA') === null && acceptCustomMap(k, code) === k, [info.k, info.code]), 'hash check rejects a changed map');
// same map -> same world on two builds (sim determinism of the map generator)
const sig = await page.evaluate(k => { const o = [];for (let i = 0; i < 2; i++) { setWorld(worldScaleFor(2, k)); setBases(2, k); const M = mkMap(99, k); let h = 0; for (const v of M.grid) h = (h * 31 + v) | 0; o.push(h + ':' + M.fields.length + ':' + M.oil.length); } return o; }, info.k);
ok(sig[0] === sig[1], 'map builds identically twice: ' + sig[0]);
// play it
await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 240000 }).catch(() => {});
await page.evaluate(() => document.getElementById('edBtn').click()); await page.waitForTimeout(300);
await page.evaluate(() => { edPlay(); });
await page.waitForFunction(() => window.G && !window.LOADING, null, { timeout: 400000, polling: 300 }).catch(() => fails.push('battle did not load'));
const g = await page.evaluate(() => ({ key: G.mapKey, n: G.teams.length, ents: G.ents.length }));
ok(g.key === info.k && g.n === 2 && g.ents > 10, 'Play this map starts a battle on the custom map: ' + JSON.stringify(g));
await page.evaluate(() => { for (const T of G.teams) if (!T.ai) T.ai = mkAI(1); for (let i = 0; i < 600; i++) simUpdate(1 / 30); });
const t = await page.evaluate(() => G.t); ok(t > 15, 'battle runs (t=' + t.toFixed(0) + ')');
await page.waitForTimeout(2500); await page.screenshot({ path: path.join(SH, 'played-map.png'), timeout: 170000 }).catch(() => console.log('warn: battle screenshot skipped (software renderer)'));
await browser.close(); server.close();
if (fails.length) { console.log('EDITOR FAIL\n' + fails.join('\n')); process.exit(1); } console.log('EDITOR PASS');
