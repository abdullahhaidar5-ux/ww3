import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), ROOT = process.env.GAMEROOT ? path.resolve(process.env.GAMEROOT) : HERE, OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'orch', 'out');
const TAG = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '';
const { acquireBrowserLock } = await import(path.join(HERE, 'orch/browserlock.mjs'));
const { guardContext } = await import(path.join(HERE, 'orch/serverdev.mjs'));
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch {} if (!pw || !pw.chromium) for (const p of [ '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { pw = req(p); break; } catch {} }
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; let exe;
for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) { exe = e; break; } }
await acquireBrowserLock('finishshots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((rq, res) => { let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });




// Proof pictures for the battle report card and the front lines (finish-report): 1600x900 JPEGs -> orch/concepts/report/
//   node orch/finishshots.mjs
const SH = path.join(HERE, 'orch', 'concepts', 'report'); fs.mkdirSync(SH, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await guardContext(ctx);
const page = await ctx.newPage();
await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
page.on('pageerror', e => console.log('PAGEERR', e.message));
const jpg = async (n, q) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(SH, n + '.jpg'), type: 'jpeg', quality: q || 62, timeout: 180000 }); console.log('shot', n, Math.round(fs.statSync(path.join(SH, n + '.jpg')).size / 1024) + ' KB'); };
await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof grandOpen === 'function', null, { timeout: 120000 });
await page.evaluate(() => { try { localStorage.setItem('ww3_welcomed', '1'); } catch (e) {} grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); const c = document.getElementById('gCoach'); if (c) c.remove(); });
await page.waitForFunction(() => typeof G3 !== 'undefined' && G3.lines && G3.arrows && G3.F, null, { timeout: 600000, polling: 500 });
const settle = async () => { await page.waitForFunction(() => { const t = G3.time; if (window.__ft === undefined) { window.__ft = t; return false; } return G3.time - window.__ft > .05 && (window.__fn = (window.__fn | 0) + 1) > 4; }, null, { timeout: 300000, polling: 1500 }); await page.evaluate(() => { window.__ft = undefined; window.__fn = 0; }); };
const tiers = () => page.evaluate(() => { const F = G3.front; return F && F.data ? { tier: grTier(), d: Math.round(G3.cc.d), fr: F.data.fr.length, vis: [!!(F.fm && F.fm.visible), !!(F.hm && F.hm.visible), !!(F.vm && F.vm.visible)] } : null; });
if (!process.argv.includes('--cards')) {
  // ---- front lines: Iran at war with Iraq, Middle East region (middle zoom), then close, the world view, and peace
  await page.evaluate(() => { for (const id of ['gModal', 'gCoach']) { const e = document.getElementById(id); if (e) e.remove(); } grDeclare('IR', 'IQ'); for (const id of ['gModal']) { const e = document.getElementById(id); if (e) e.remove(); } guFit(GR_REGIONS[4][1]); guRedraw(); });
  await page.waitForTimeout(8000); await settle(); console.log('middle', JSON.stringify(await tiers())); await jpg('front-middle-east');
  await page.evaluate(() => { const p = GCM.P.find(p => p.land && GC.prov[p.i].o === 'IR' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === 'IQ')); g3Centre(p.i); G3.camera.d = 190; G3.moved = true; });
  await page.waitForTimeout(6000); await settle(); console.log('close', JSON.stringify(await tiers())); await jpg('front-close');
  await page.evaluate(() => { guFit(null); guRedraw(); }); await page.waitForTimeout(6000); await settle(); console.log('far', JSON.stringify(await tiers())); await jpg('front-far-none', 50);
  await page.evaluate(() => { for (const k of Object.keys(GC.war)) delete GC.war[k]; guFit(GR_REGIONS[4][1]); guRedraw(); }); await page.waitForTimeout(8000); await settle(); console.log('peace', JSON.stringify(await tiers())); await jpg('front-peace-none');
}
// ---- the report card after an auto-resolved battle (also at 130 % text) and after a battle fought live
await page.evaluate(() => { grNew({ me: 'IR', seed: 99, len: 'quick' }); grandOpen(); grDeclare('IR', 'IQ'); for (const id of ['gModal', 'gCoach']) { const e = document.getElementById(id); if (e) e.remove(); } guFit(GR_REGIONS[4][1]); guRedraw(); });
await page.waitForTimeout(6000);
const mk = () => page.evaluate(() => { const pi = GCM.P.findIndex(p => p.land && GC.prov[p.i].o === 'IQ' && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === 'IR')), from = GCM.P[pi].adj.find(j => GCM.P[j].land && GC.prov[j].o === 'IR');
  const A = grAddArmy('IR', from, grGenUnits(grNat('IR').fac, 3000, true)), D = grAddArmy('IQ', pi, grGenUnits(grNat('IQ').fac, 1800, true)); A.from = from; A.at = pi;
  window.__b = { p: pi, an: 'IR', dn: 'IQ', att: [A.id], def: [D.id], garr: true, river: false, mtn: false, done: 0 }; guCentre(pi, 2.2); return GCM.P[pi].n; });
console.log('battle at', await mk());
await page.evaluate(() => { const keep = window.grBattleDone; window.grBattleDone = () => {}; try { grBattleAutoShow(window.__b); } finally { window.grBattleDone = keep; } });
await page.waitForTimeout(3000); await jpg('card-auto');
await page.evaluate(() => { tsSet(1.3); }); await page.waitForTimeout(1500); await jpg('card-auto-text130');
console.log('fits at 130%', JSON.stringify(await page.evaluate(() => { const r = document.querySelector('#gReport>div').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), x: !!document.querySelector('#gReport .gpx-x') }; })));
await page.keyboard.press('Escape'); await page.waitForTimeout(400); console.log('Esc closed auto card', await page.evaluate(() => !document.getElementById('gReport')));
await page.evaluate(() => { tsSet(1); });
console.log('battle at', await mk());
await page.evaluate(() => { grandFightLive(window.__b); });
await page.waitForFunction(() => typeof G !== 'undefined' && G && G.grand && !G.loading && G.ents && G.ents.length > 4, null, { timeout: 600000, polling: 1000 });
await page.waitForTimeout(20000);
await page.evaluate(() => { for (let i = 0; i < 1500; i++) simUpdate(1 / 30); const foes = G.ents.filter(e => e.team === 1 && !e.isB); for (const e of foes.slice(0, Math.ceil(foes.length * .8))) kill(e, 0, null); const mine = G.ents.filter(e => e.team === 0 && !e.isB); for (const e of mine.slice(0, Math.ceil(mine.length * .25))) kill(e, 1, null); window.__done = 0; const keep = window.grBattleDone; window.grBattleDone = (b, w, h) => { window.__done = [w, h]; window.grBattleDone = keep; }; grandTestFinish(0); });
await page.waitForTimeout(3000); await jpg('card-live');
await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
console.log('Esc closed live card', JSON.stringify(await page.evaluate(() => ({ gone: !document.getElementById('gReport'), settled: window.__done, battle: !!(window.G && G.grand), map: document.getElementById('grandScreen').style.display }))));
console.log('done'); await browser.close(); server.close(); process.exit(0);
