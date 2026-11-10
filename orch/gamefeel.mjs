// GAME FEEL guard (orch/q-feel): shell impacts match the surface, tanks rock when they fire.   node orch/gamefeel.mjs  -> FEEL PASS
// Runs a real battle on the strait map (sea + roads + desert), then fires the game's own explosion effect on water, on a road and on
// open ground and looks at what the particle pool received; fires a tank's gun and looks at the hull's pitch. Pictures: orch/shots/feel/*.jpg
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs'; import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'shots', 'feel');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url); for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('playwright not found'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux', 'chrome'); if (fs.existsSync(e)) return e; const e2 = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e2)) return e2; } } catch {} return undefined; }
if (!process.argv.includes('--no-lock')) await acquireBrowserLock(); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webp': 'image/webp' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPW();
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = []; let fail = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx); const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate(() => { setup.map = 'strait'; setup.p = 'IR'; setup.a = 'US'; setup.n = 1; setup.seed = 4242; setup.w = 0; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 900000, polling: 500 });
  const R = await page.evaluate(() => {
    window.__stopLoop = true; G.paused = true; G.teams.forEach(T => { T.ai = null; }); G.setupEnd = 0; window.vis = () => true; try { FOGM.visible = false; } catch (e) {}
    const out = { pts: {} }, pick = (want) => { for (let k = 0; k < 60000; k++) { const x = 200 + Math.random() * (MAPW - 400), y = 200 + Math.random() * (MAPH - 400); if (impactSurf(x, y) === want) return [x, y]; } return null; };
    const fire = a => { let t = 0; for (const p of a) if (p.add && p.d > .2) t += p.s * p.s; return t; };
    const kinds = a => { const m = {}; for (const p of a) m[p.k || '-'] = (m[p.k || '-'] || 0) + 1; return m; };
    for (const sf of ['water', 'hard', 'desert']) { const p = pick(sf); out.pts[sf] = p; if (!p) continue; camTarget(); cam.td = cam.dist = 420; centerOn(p[0], p[1], true); for (let i = 0; i < 3; i++) renderFrame(.016);
      PARTS.length = 0; const d0 = decI; boomFX(p[0], p[1], 22, false); const dirt = PARTS.find(z => z.k === 'dirt'); out[sf] = { k: kinds(PARTS), n: PARTS.length, scorch: decI - d0, dirt: dirt ? dirt.c.map(v => +v.toFixed(2)) : null, fire: +fire(PARTS).toFixed(0) };
      // strike-sized blast (missile impact) on the same spot: megaBoom's own code path
      PARTS.length = 0; const m0 = MUSH.length, d1 = decI; megaBoom(p[0], p[1], 30, true); const wall = PARTS.find(z => !z.add && z.rise && z.f === .1); out[sf].mega = { n: PARTS.length, mush: MUSH.length - m0, scorch: decI - d1, fire: +fire(PARTS).toFixed(0), wall: wall ? wall.c.map(v => +v.toFixed(2)) : null }; MUSH.length = m0; }
    // hull rock: a tank that has just fired pitches; the same tank at rest does not
    const hq = G.ents.find(b => b.team === ME && b.kind === 'hq'), p = nearestPassXY('ground', hq.x + 260, hq.y + 40) || [hq.x + 260, hq.y], t = addUnit(ME, 'tank', p[0], p[1]); t.tang = t.va; camTarget(); cam.td = cam.dist = 300; centerOn(t.x, t.y, true);
    for (let i = 0; i < 4; i++) renderFrame(.016); const o = OBJ.get(t.id); t.lastFire = -9; renderFrame(.016); const r0 = o.userData.rock;
    t.lastFire = G.t - .09; renderFrame(.016); const r1 = o.userData.rock; t.tang = t.va + Math.PI / 2; renderFrame(.016); const x1 = o.rotation.x; t.lastFire = -9; renderFrame(.016); const x0 = o.rotation.x;
    out.rock = { r0: r0 == null ? null : +(+r0).toFixed(4), r1: r1 == null ? null : +(+r1).toFixed(4), side: +(x1 - x0).toFixed(4), model: !!o.userData.model }; return out; });
  console.log('FEEL ' + JSON.stringify(R));
  const ck = (c, m) => { if (!c) { console.log('FAIL: ' + m); fail = 1; } };
  ck(R.pts.water && R.water && (R.water.k.spray || 0) >= 12, 'a hit on water throws no spray'); ck(R.water && !R.water.k.dirt && R.water.scorch === 0, 'a hit on water still throws dirt or leaves a scorch mark');
  // slice 2: the sea swallows the fireball (much less fire than the same shell on land), boils and throws a foam ring; missile blasts match the surface too
  ck(R.water && R.desert && R.water.fire < R.desert.fire * .5, 'the fireball on water is as big as on land (' + (R.water && R.water.fire) + ' vs ' + (R.desert && R.desert.fire) + ')');
  ck(R.water && (R.water.k.boil || 0) >= 2 && (R.water.k.foam || 0) >= 8, 'a hit on water has no boil / foam ring'); ck(R.desert && !R.desert.k.boil && !R.desert.k.foam, 'boil or foam on dry land');
  ck(R.water && R.water.mega && R.water.mega.mush === 0 && R.water.mega.scorch === 0 && R.water.mega.fire < R.desert.mega.fire * .6, 'a missile blast on water still burns, scorches or leaves a smoke column like on land ' + JSON.stringify(R.water && R.water.mega));
  ck(R.water && R.water.mega.wall && R.water.mega.wall[2] > .9 && R.desert.mega.wall && R.desert.mega.wall[0] > R.desert.mega.wall[2] + .1 && R.desert.mega.mush === 1 && R.desert.mega.scorch >= 1, 'missile blast wall: water should be white spray, desert sand ' + JSON.stringify([R.water && R.water.mega, R.desert && R.desert.mega]));
  if (R.pts.hard) ck(R.hard.mega.wall && Math.abs(R.hard.mega.wall[0] - R.hard.mega.wall[2]) < .08, 'missile blast on a road throws sand-coloured dust instead of grey');
  ck(R.desert && (R.desert.k.dirt || 0) >= 4 && R.desert.scorch === 1 && !R.desert.k.spray, 'a hit on open ground lost its dirt / scorch mark'); ck(R.desert && R.desert.dirt && R.desert.dirt[0] > R.desert.dirt[2] + .1, 'desert dirt is not sand-coloured');
  if (R.pts.hard) ck(R.hard && R.hard.dirt && Math.abs(R.hard.dirt[0] - R.hard.dirt[2]) < .08, 'a hit on a road throws brown dirt instead of grey chips'); else console.log('(no road cell found on this map: road check skipped)');
  ck(R.rock.model && Math.abs(R.rock.r1) > .01 && R.rock.r0 === 0, 'a tank that fires does not rock (rest ' + R.rock.r0 + ', firing ' + R.rock.r1 + ')'); ck(Math.abs(R.rock.side) > .008, 'no sideways rock when the turret fires off to the side');
  for (const sf of ['water', 'hard', 'desert']) { const p = R.pts[sf]; if (!p) continue; await page.evaluate(([x, y]) => { camTarget(); cam.td = cam.dist = 360; centerOn(x, y, true); renderFrame(.016); PARTS.length = 0; boomFX(x, y, 22, false); for (let i = 0; i < 14; i++) renderFrame(.03); }, p);
    await page.screenshot({ path: path.join(OUT, 'impact-' + sf + '.jpg'), type: 'jpeg', quality: 86, timeout: 300000 }).catch(() => console.log('shot skipped ' + sf)); console.log('shot impact-' + sf); }
  if (errs.length) { console.log('PAGE ERRORS: ' + errs.join('\n').slice(0, 1500)); fail = 1; }
} finally { await browser.close(); server.close(); }
console.log(fail ? 'FEEL FAIL' : 'FEEL PASS'); process.exit(fail);
