// battlerules2 browser check (not a gate): Strike Center warning/countdown/strike, fog memory, splash friendly fire, Brutal AI.
// Screenshots: orch/shots/battlerules2-{banner,strike,fog}.jpg      node orch/br2check.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.gz': 'application/gzip', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await br.newContext({ viewport: { width: 1400, height: 800 } })).newPage(); const fails = [];
pg.on('pageerror', e => fails.push('page error: ' + e.message.split('\n')[0]));
await pg.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?lazy=1`, { waitUntil: 'load', timeout: 120000 });
await pg.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 120000 });
const R = await pg.evaluate(async () => {
  const o = {}; setup.n = 1; setup.mode = 'battle'; setup.d = 3; startSingle(); G.teams[0].ai = null;
  o.brutal = { d: G.teams[1].ai.d, inc: G.teams[1].ai.inc, hardInc: DIFF[2].inc, btn: !!document.querySelector('#diff [data-d="3"]') };
  const T = G.teams[0], E = G.teams[1], hq0 = G.ents.find(e => e.team === 0 && e.kind === 'hq'), hq1 = G.ents.find(e => e.team === 1 && e.kind === 'hq');
  o.sw = { name: T.sup.name, charge: T.sup.charge, cost: bstats(T.fac, 'uplink').cost, req: reqMet(0, 'uplink'), conquestCost: STRUCT.uplink.cost };
  addBld(0, 'airfield', hq0.x + 200, hq0.y + 60, true); o.sw.reqAfter = reqMet(0, 'uplink');
  addBld(0, 'uplink', hq0.x + 120, hq0.y - 200, true); T.charge = T.sup.charge - 3; simUpdate(.1); simUpdate(.1); T.charge = T.sup.charge;
  o.msgs1 = G.msgs.slice(-4).map(m => m.t || m.m || JSON.stringify(m)).slice(-4);
  // splash friendly fire: own infantry + own tank next to a blast; a bullet-type hit never reaches them
  const ix = hq1.x + 400, iy = hq1.y; const own = addUnit(0, 'inf', ix, iy), en = addUnit(1, 'inf', ix + 20, iy);
  const h0 = own.hp, eh0 = en.hp; explode(ix + 10, iy, 80, 100, 0, 'shell', 'shell', null); o.ff = { ownLoss: h0 - own.hp, enemyLoss: eh0 - en.hp, ratio: (h0 - own.hp) / (eh0 - en.hp) };
  // strike on enemy base: HQ must survive one full salvo
  const hqHp = hq1.hp; simUpdate(.1); T.charge = T.sup.charge; const ok = launch(0, hq1.x, hq1.y); for (let i = 0; i < 80; i++) simUpdate(.1); o.strike = { ok, hq: Math.round(hq1.hp / hq1.max * 100), dead: hq1.dead, lost: Math.round((hqHp - hq1.hp) / hq1.max * 100) };
  o.msgs2 = G.msgs.slice(-3).map(m => m.t || m.m || JSON.stringify(m));
  return o; });
console.log(JSON.stringify(R));
async function shot(n) { try { await pg.screenshot({ path: path.join(OUT, `battlerules2-${n}.jpg`), type: 'jpeg', quality: 72, timeout: 180000 }); } catch (e) { console.log('shot skipped', n, e.message.split('\n')[0]); } }
await pg.evaluate(() => { const T = G.teams[0]; T.charge = T.sup.charge - 200; G.teams[1].charge = 120; const e = G.ents.find(e => e.team === 1 && e.kind === 'hq'); addBld(1, 'uplink', e.x - 100, e.y + 150, true); simUpdate(.1); G.teams[1].charge = 120; });
await pg.waitForTimeout(1500); await shot('banner');
await pg.waitForFunction(() => typeof FOGC !== 'undefined' && FOGC && FOGC.b, null, { timeout: 170000 });
const F = await pg.evaluate(async () => { const hq0 = G.ents.find(e => e.team === 0 && e.kind === 'hq'); const hq1 = G.ents.find(e => e.team === 1 && e.kind === 'hq');
  for (let i = 0; i < 6; i++) updateFog(); const px = (x, y) => { const c = FOGC, v = c.getContext('2d').getImageData(Math.floor(x * c.width / MAPW), Math.floor(y * c.height / MAPH), 1, 1).data[1]; return v; };
  const o = { home: px(hq0.x, hq0.y), enemyBase: px(hq1.x, hq1.y) };
  const u = G.ents.find(e => e.team === 0 && !e.isB && !e.dead); const ox = u.x, oy = u.y; const tgt = { x: Math.min(MAPW - 200, ox + 900), y: oy }; u.x = tgt.x; u.y = tgt.y; for (let i = 0; i < 6; i++) updateFog();
  o.newSpot = px(tgt.x, tgt.y); u.x = ox; u.y = oy; for (let i = 0; i < 6; i++) updateFog(); o.rememberedWhenAway = px(tgt.x, tgt.y); o.unexploredRef = px(MAPW - 60, MAPH - 60); return o; });
console.log(JSON.stringify(F)); await shot('fog');
await pg.evaluate(() => { const hq1 = G.ents.find(e => e.team === 1 && e.kind === 'hq'); G.teams[0].charge = G.teams[0].sup.charge; launch(0, hq1.x, hq1.y); simUpdate(1); });
await pg.waitForTimeout(2500); await shot('strike');
console.log(fails.length ? 'FAIL ' + fails.join(' | ') : 'br2check done'); await br.close(); srv.close();
