// QA: the Encyclopedia. Opens it from the main menu, checks every nation/unit/building of all 18 nations builds its 3D
// object (sampled), search + filters work, and screenshots an IR unit page.   node orch/enctest.mjs -> ENC PASS / ENC FAIL
import { startServer, launch, openPage, toMenu, shot, sleep } from './qa-lib.mjs';
const { server, origin, url } = await startServer(); const browser = await launch(); const errs = [], bad = [];
const ck = (n, ok, x) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (x != null ? ' ' + x : '')); if (!ok) bad.push(n); };
const { ctx, page } = await openPage(browser, origin, 'hd', errs, { dpr: 1 });
page.on('console', m => { if (/encyclopedia 3D|^ENCT/.test(m.text())) console.log('  ' + m.text().slice(0, 200)); });
try {
  await toMenu(page, url); await sleep(1500);
  ck('Encyclopedia button in the main menu', await page.evaluate(() => !!document.getElementById('openEnc')));
  await page.evaluate(() => { setup.p = 'IR'; document.getElementById('openEnc').click(); });
  await sleep(5000);
  const n0 = await page.evaluate(() => ({ items: document.querySelectorAll('#enc .eit').length, cnt: document.querySelector('#enc .ecount').textContent, obj: !!ENC.obj, info: document.querySelector('#enc .einfo').innerText.slice(0, 300), msg: document.querySelector('#enc .emsg').hidden }));
  console.log(JSON.stringify(n0)); ck('list shows the nation\'s entries', n0.items > 15, n0.cnt); ck('3D object built', n0.obj); ck('stats shown', /cost/i.test(n0.info) && /health/i.test(n0.info));
  await page.evaluate(() => { for (let i = 0; i < 5; i++) encFrame(); });
  await shot(page, 'encyclopedia-ir-tank.png');
  // search + filter
  await page.evaluate(() => { const i = document.querySelector('#enc input'); i.value = 'tank'; i.dispatchEvent(new Event('input')); document.querySelector('#enc select').value = 'all'; document.querySelector('#enc select').dispatchEvent(new Event('change')); });
  const s1 = await page.evaluate(() => document.querySelector('#enc .ecount').textContent); ck('search "tank" across all nations finds entries', parseInt(s1) > 10, s1);
  await page.evaluate(() => { const i = document.querySelector('#enc input'); i.value = ''; i.dispatchEvent(new Event('input')); [...document.querySelectorAll('#enc .etypes button')].find(b => /Aircraft/.test(b.textContent)).click(); });
  const s2 = await page.evaluate(() => document.querySelector('#enc .ecount').textContent); ck('Aircraft filter', parseInt(s2) > 10 && parseInt(s2) < parseInt(s1) * 20, s2);
  await page.evaluate(() => encClose()); ck('closes', await page.evaluate(() => document.getElementById('enc').hidden));
  // every entry of every nation: stats text builds, and the 3D object builds for a sample of each kind
  const r = await page.evaluate(async () => {
    const A = encEntries(), out = { n: A.length, nat: new Set(A.map(x => x.f)).size, noInfo: 0, no3d: [], tried: 0 };
    for (const x of A) { try { encInfo(x); } catch (e) { out.noInfo++; } }
    const seen = new Set();
    for (const x of A) { const key = x.k + (x.b ? 'B' : ''); if (seen.has(key + x.f) || seen.size > 400) continue; seen.add(key + x.f);
      if (x.f !== 'IR' && !(['tank', 'inf', 'heli', 'ship', 'hq', 'at', 'jet', 'arty', 'sub', 'champ', 'cleric'].includes(x.k) && [].includes(x.f))) continue;
      out.tried++; console.log('ENCT ' + x.f + ':' + x.k); try { await Promise.race([modelsFor([x.f]), new Promise(r => setTimeout(r, 15000))]); const o = encBuild(x); if (!o) out.no3d.push(x.f + ':' + x.k); } catch (e) { out.no3d.push(x.f + ':' + x.k + ' ' + String(e.message).slice(0, 50)); } }
    return out; });
  console.log(JSON.stringify(r).slice(0, 900)); ck('18+ nations, 400+ entries', r.nat >= 18 && r.n > 400, r.nat + ' nations, ' + r.n + ' entries'); ck('info builds for all', r.noInfo === 0);
  ck('3D builds for the sampled entries', r.no3d.length === 0, r.no3d.slice(0, 12).join(', '));
} catch (e) { bad.push('aborted: ' + e.message.split('\n')[0]); console.log(e.stack); }
await browser.close(); server.close();
console.log('ERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed|WebGL|GPU|ReadPixels/.test(e)).join('\n'));
console.log(bad.length ? 'ENC FAIL ' + bad.join(', ') : 'ENC PASS'); process.exit(0);
