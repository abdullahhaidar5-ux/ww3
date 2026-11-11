// Seamless-flow test (ideas 7-10, orch/concepts/SEAMLESS.md): plays the setup like a player and checks what the menu promises.
//   node orch/seamlessflowtest.mjs   -> SEAMLESSFLOW PASS / FAIL
// 7: Conquest setup Nation > Battlefield > Opponents starts a battle and is remembered after a page reload; "Same again" starts the
//    same nation + map with one click; "Quick match" starts a battle; the campaign's three steps start a campaign as the picked nation
//    and "Same again" repeats it.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await (async () => { try { return await import('playwright'); } catch {} const q = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return q(p); } catch {} } throw new Error('playwright not found'); })();
const fails = [], ck = (c, m) => { if (!c) fails.push(m); };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const load = async () => { await page.goto(URL0); await page.waitForFunction(() => typeof startSingle === 'function' && typeof menuGo === 'function' && typeof grandSetup === 'function', null, { timeout: 120000 }); await page.waitForTimeout(1500); };
const ev = (f, a) => page.evaluate(f, a), W = ms => page.waitForTimeout(ms);
const inBattle = () => page.waitForFunction(() => document.getElementById('menu').hidden && typeof G !== 'undefined' && G && !G.over && G.teams, null, { timeout: 240000 });
const game = t => ev(t => { menuHome(); menuGo('single'); [...document.querySelectorAll('#ms-single .mxi')].find(b => ((b.firstChild || {}).textContent || '').trim() === t).click(); }, t);
try {
  await load();
  // --- Conquest: three steps, start, remembered
  await game('Conquest'); await W(400);
  const at = id => page.waitForFunction(i => MX.cur === i, id, { timeout: 20000 }).catch(() => {});
  await ev(() => document.querySelector('#pickP .fac:nth-child(5)').click()); await at('c-map'); await W(300);
  await ev(() => document.querySelector('#mx .mxmap:nth-child(3)').click()); await at('c-players');
  const pick = await ev(() => ({ cur: MX.cur, p: setup.p, map: setup.map }));
  ck(pick.cur === 'c-players', 'Conquest: after nation + battlefield the Opponents step should be open, on ' + pick.cur);
  await ev(() => MX.startP.click()); await inBattle();
  const g1 = await ev(() => ({ fac: G.teams[0].fac, map: G.map || setup.map, battle: !!G.battle }));
  ck(g1.fac === pick.p && !g1.battle, 'Conquest: started as ' + g1.fac + ', picked ' + pick.p);
  await load();   // a fresh page: the choices come back from the settings store
  await game('Conquest'); await W(500);
  const back = await ev(() => ({ p: setup.p, map: setup.map, same: !MX.same.hidden && MX.same.textContent }));
  ck(back.p === pick.p && back.map === pick.map, 'Conquest: last choices not remembered after a reload: ' + JSON.stringify(back) + ' vs ' + JSON.stringify(pick));
  ck(/^Same again/.test(back.same || ''), 'Conquest: "Same again" missing after a first game');
  await ev(() => { mxApply({ p: FKEYS[0], map: document.getElementById('mapSel').options[0].value }); MX.same.click(); }); await inBattle();
  const g2 = await ev(() => ({ fac: G.teams[0].fac, map: setup.map }));
  ck(g2.fac === pick.p && g2.map === pick.map, '"Same again" started ' + JSON.stringify(g2) + ', wanted ' + JSON.stringify(pick));
  // --- Battle: its own memory, Quick match starts right away
  await load(); await game('Battle'); await W(500);
  ck(await ev(() => MX.same.hidden), 'Battle: "Same again" shown before any Battle game was played (memory is per game)');
  await ev(() => MX.quick.click()); await inBattle();
  const g3 = await ev(() => ({ battle: !!G.battle, n: G.teams.filter(T => !T.reb).length })); ck(g3.battle && g3.n === 2, 'Quick match (Battle) should be a Battle against one computer, got ' + JSON.stringify(g3));
  // --- Grand campaign: Nation > World > Options, Start campaign, Same again
  await load(); await ev(() => { try { localStorage.removeItem(GR_KEY); } catch (e) {} });
  await ev(() => { menuHome(); menuGo('single'); grandSetup(); }); await W(500);
  ck(await ev(() => document.getElementById('gsSame').hidden), 'Campaign: "Same again" shown before any campaign was started');
  await ev(() => document.querySelector('#ms-g-nation .gfac[data-c="SA"]').click()); await W(600);
  await ev(() => document.querySelector('#ms-g-world .mxmap[data-k="gulf"]').click()); await W(600);
  await ev(() => document.querySelector('#ms-g-opts .seg button[data-v="std"]').click()); await ev(() => document.getElementById('gsGo').click());
  await page.waitForFunction(() => { const e = document.getElementById('grandScreen'); return e && e.style.display !== 'none' && GC; }, null, { timeout: 120000 });
  const c1 = await ev(() => ({ me: GC.me, max: GC.maxTurn, last: SET.last && SET.last.campaign })); ck(c1.me === 'SA' && c1.max === 60 && c1.last && c1.last.sc === 'gulf', 'Campaign start: ' + JSON.stringify(c1));
  await load(); await ev(() => { menuHome(); menuGo('single'); grandSetup(); }); await W(500);
  const c2 = await ev(() => ({ nat: GS.nat, len: GS.len, sc: GS.sc, same: !document.getElementById('gsSame').hidden && document.getElementById('gsSame').textContent }));
  ck(c2.nat === 'SA' && c2.len === 'std' && c2.sc === 'gulf' && /^Same again/.test(c2.same || ''), 'Campaign: last choices not remembered: ' + JSON.stringify(c2));
} catch (e) { fails.push('crashed: ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); }
for (const e of errs.slice(0, 5)) fails.push('page error: ' + e);
await b.close(); server.close();
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'SEAMLESSFLOW FAIL (' + fails.length + ')' : 'SEAMLESSFLOW PASS'); process.exit(fails.length ? 1 : 0);
