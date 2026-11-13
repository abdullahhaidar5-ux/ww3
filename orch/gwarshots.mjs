// Proof pictures for campaign battles on the map (src/13a-gwar.js, 13ab-gwarui.js): node orch/gwarshots.mjs
// -> orch/concepts/nofightit/{markers,token,battle,siege,result}.jpg (1280x720 JPEG). Not a gate test.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'orch', 'concepts', 'nofightit'); fs.mkdirSync(OUT, { recursive: true });
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium } = await loadPW();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.on('pageerror', e => console.log('PAGE ERROR ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 74 }); console.log(n + '.jpg', Math.round(fs.statSync(path.join(OUT, n + '.jpg')).size / 1024) + ' KB'); };
await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof grNew === 'function' && typeof gwOpen === 'function', null, { timeout: 120000 });
// Iran, November 2026. Iraq attacks Iran in the Zagros mountains; Iran besieges an Iraqi fort and fights a small field battle next door.
const info = await page.evaluate(() => { try { localStorage.setItem('ww3_gcoach', '1'); } catch (e) {} grNew({ me: 'IR', seed: 7, len: 'std' }); for (const k of Object.keys(GC.nat)) if (k !== 'IR') GC.nat[k].ai = false; GC.war[grWk('IR', 'IQ')] = 1;
  const mt = GCM.P.find(p => p.land && p.t === 'm' && GC.prov[p.i].o === 'IR' && !p.cap && p.adj.some(j => GCM.P[j].land && GC.prov[j].o === 'IQ')); GC.armies = GC.armies.filter(a => a.at !== mt.i);
  const D = grAddArmy('IR', mt.i, grGenUnits('IR', 30000, true)), A = grAddArmy('IQ', mt.i, grGenUnits(grNat('IQ').fac, 52000, true)); A.from = mt.adj.find(j => GCM.P[j].land && GC.prov[j].o === 'IQ');
  const forts = GCM.P.filter(p => p.land && GC.prov[p.i].o === 'IQ' && !p.cap && gwFort(p.i) > 0).sort((x, y) => gwFort(y.i) - gwFort(x.i)), ft = forts[0]; GC.armies = GC.armies.filter(a => a.at !== ft.i);
  GC.prov[ft.i].gar = grGenUnits(grNat('IQ').fac, 7000, false); const S1 = grAddArmy('IR', ft.i, grGenUnits('IR', 34000, true));
  const fl = GCM.P.find(p => p.land && GC.prov[p.i].o === 'IQ' && !gwFort(p.i) && p.i !== ft.i); GC.armies = GC.armies.filter(a => a.at !== fl.i); GC.prov[fl.i].gar = [];
  const a2 = grAddArmy('IR', fl.i, grGenUnits('IR', 30000, true)), d2 = grAddArmy('IQ', fl.i, grGenUnits(grNat('IQ').fac, 15000, true));
  gmilGenStep(true);
  gwOpen({ p: mt.i, an: 'IQ', dn: 'IR', att: [A.id], def: [D.id], garr: false, river: false, mtn: true, sea: false, done: 0 }); gwScanAt(ft.i);
  gwOpen({ p: fl.i, an: 'IR', dn: 'IQ', att: [a2.id], def: [d2.id], garr: false, river: false, mtn: false, sea: false, done: 0 });
  grandOpen(); try { guCentre(mt.i, 2.3); } catch (e) {} return { mt: mt.i, mtn: mt.n, ft: ft.i, ftn: ft.n, fortLevel: gwFort(ft.i), fl: fl.i, fln: fl.n }; });
console.log(JSON.stringify(info));
await page.waitForFunction(() => !!G3.real || !!G3.realFail, null, { timeout: 120000 }).catch(() => {}); await page.waitForTimeout(4000);
const days = async to => page.evaluate(to => { for (let d = (GC.day | 0) + 1; d <= to; d++) { GC.day = d; gwTo(d); gwUiDay(); } grandMapRefresh(); return { day: GC.day, bt: GC.bt.map(B => [GCM.P[B.p].n, B.d, Math.round(B.ma), Math.round(B.md)]), sg: GC.sg.map(S => [GCM.P[S.p].n, S.d, S.st, S.last]), br: GC.br.map(r => [r.pn, r.win, r.how, r.d]) }; }, to);
console.log(JSON.stringify(await days(8))); await shot('markers');
// the army token's odds pill: select an Iranian army next to an Iraqi army (the pill is gwOddsAt, the same rules played forward)
console.log(JSON.stringify(await page.evaluate(() => { const busy = new Set(GC.bt.map(B => B.p)); let best = null;
  for (const e of GC.armies) { if (e.o !== 'IQ' || busy.has(e.at)) continue; const j = GCM.P[e.at].adj.find(j => GCM.P[j].land && GC.prov[j].o === 'IR' && !busy.has(j)); if (j != null) { best = [e, j]; break; } }
  if (!best) return { token: 'no Iraqi army next to Iran' }; const M = grAddArmy('IR', best[1], grGenUnits('IR', 30000, true)); GC.ph = 'plan'; GV.sel = best[1]; GV.selA = M.id; guSide(); grandMapRefresh(); try { guCentre(best[0].at, 3.2); } catch (e) {}
  const o = gtkOdds([M.id], best[0].at); return { token: GCM.P[best[0].at].n, pill: o && o.t, pct: o && o.pct, tmp: M.id }; })));
await page.waitForTimeout(2500); await shot('token');
await page.evaluate(() => { const i = GC.armies.findIndex(a => a.id === GV.selA); if (i >= 0) GC.armies.splice(i, 1); GV.selA = null; grandMapRefresh(); });
await page.evaluate(pi => { GV.sel = pi; guSide(); gwuOpen(pi); }, info.mt); await shot('battle');
console.log(JSON.stringify(await days(13)));
await page.evaluate(pi => { gwuClose(); GV.sel = pi; guSide(); gwuOpen(pi); }, info.ft); await shot('siege');
await page.evaluate(() => { gwuClose(); });
let st = null; for (let d = 14; d <= 29; d++) { st = await days(d); if (await page.evaluate(() => !!document.querySelector('#gwCards .c'))) break; }
console.log(JSON.stringify(st)); await shot('result');
await browser.close(); server.close();
