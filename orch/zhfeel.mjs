// Zero Hour feel test (zhfeel 2026-11-15, Abdullah 2026-11-14 19:52): build clock wipe + queue number on the bar buttons, Sell (3 s, 50% back, building removed) and Repair (hp restored, money spent), cursors. node orch/zhfeel.mjs -> ZHFEEL PASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'zhfeel');
const fails = [];
const ck = (c, m) => { if (!c) fails.push(m); };
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromiumPath() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
{
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const shot = async n => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
const ev = (fn, a) => page.evaluate(fn, a);
// text a player can actually see: visible elements only
const SEEN = () => { const out = []; const vis = e => { if (!e.isConnected) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (n.hidden || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let t; (t = w.nextNode());) { const s = t.nodeValue.trim(); if (s && t.parentElement && vis(t.parentElement)) out.push(s); }
  for (const e of document.querySelectorAll('[title]')) if (vis(e)) out.push(e.title); return out.join(' ¶ '); };
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  await ev(() => { setup.p = 'IR'; setup.a = 'US'; setup.n = 1; setup.mode = 'battle'; try { mxSetMode('battle'); } catch (e) {} setup.p = 'IR'; try { initAudio(); } catch (e) {} startSingle(); });
  await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING && G.battle, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle never loaded'));
  await page.waitForTimeout(1500);
  const r = await ev(() => {
    const out = {}; const T = G.teams[ME]; T.credits = 30000; const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq');
    const bar = addBld(ME, 'barracks', hq.x + 200, hq.y + 100, true), gen = addBld(ME, 'gen', hq.x + 260, hq.y + 160, true);
    // ---- Sell: 3 s, 50% back, building gone, no explosion bookkeeping
    const cost = bstats(T.fac, 'gen').cost, c0 = T.credits, lost0 = T.lost; G.sel = [gen]; act(ME, { t: 'sell', ids: [gen.id] });
    out.sellSet = !!gen.sell; simUpdate(1); out.still = !gen.dead; simUpdate(2.5); out.gone = !!gen.dead && !G.byId.has(gen.id); out.refund = T.credits - c0; out.wantRefund = Math.floor(cost * .5); out.lost = T.lost - lost0;
    // ---- Repair: restores hp and costs money; toggles off at full hp
    bar.hp = bar.max * .4; const c1 = T.credits, h1 = bar.hp; act(ME, { t: 'rep', ids: [bar.id] }); out.repOn = !!bar.rep; for (let i = 0; i < 10; i++) sellTick(1);
    out.healed = bar.hp > h1; out.spent = c1 - T.credits; for (let i = 0; i < 60 && bar.rep; i++) sellTick(1); out.full = bar.hp === bar.max && !bar.rep; out.spentAll = c1 - T.credits; out.wantSpent = bstats(T.fac, 'barracks').cost * .25 * .6;
    // broke: repair pauses
    bar.hp = bar.max * .5; T.credits = 0; act(ME, { t: 'rep', ids: [bar.id] }); sellTick(2); out.brokeHp = bar.hp === bar.max * .5; bar.rep = 0; T.credits = 30000;
    // sell with a queue refunds the queue; checkpoint carries sell/rep
    const b2 = addBld(ME, 'barracks', hq.x - 200, hq.y + 100, true); b2.hp = b2.max * .5; act(ME, { t: 'rep', ids: [b2.id] }); try { const ck = ckEncode(); const o = ck.ents.find(e => e.id === b2.id); out.ck = !!o && o.rep === 1; } catch (e) { out.ck = String(e); }
    // another team's building cannot be sold
    const foe = G.ents.find(e => e.isB && e.team !== ME && !e.dead); act(ME, { t: 'sell', ids: [foe.id] }); out.foeSafe = !foe.sell;
    // ---- bar: clock wipe + queue number on a unit button, Sell/Repair buttons on a selected building
    bar.hp = bar.max * .5; bar.q = []; enqueue(ME, 'inf', bar.id); enqueue(ME, 'inf', bar.id); enqueue(ME, 'inf', bar.id); for (let i = 0; i < 3; i++) simUpdate(1); G.sel = [bar]; try { showTab('units'); updateUI(); zhCtx(); updateUI(); } catch (e) { out.err = String(e); }
    const ub = document.getElementById('u_inf'); out.clock = ub ? ub.querySelector('.p').style.background : ''; out.qn = ub ? ub.querySelector('.q').textContent : ''; out.qlen = (bar.q || []).filter(i => i.kind === 'inf').length;   /* a fast unit may already have come out during the 3 s: the badge must show what is still queued */
    const sb = document.getElementById('zhSell'), rb = document.getElementById('zhRep'); out.sellBtn = !!sb && !sb.hidden; out.repBtn = !!rb && !rb.hidden; out.sellTxt = sb ? sb.textContent : ''; out.keys = KEYTAB.filter(x => x.id === 'sell' || x.id === 'rep').map(x => x.def).join('');
    return out; });
  console.log('zhfeel', JSON.stringify(r));
  ck(r.sellSet && r.still && r.gone, 'Sell: the building must stay for the 3 s sell-off, then be removed ' + JSON.stringify([r.sellSet, r.still, r.gone]));
  ck(r.refund === r.wantRefund && r.wantRefund > 0, 'Sell must refund exactly 50% of the cost ' + r.refund + ' vs ' + r.wantRefund);
  ck(r.lost === 0, 'a sold building is not a loss');
  ck(r.repOn && r.healed && r.spent > 0, 'Repair must restore hp and cost money ' + JSON.stringify([r.repOn, r.healed, r.spent]));
  ck(r.full && Math.abs(r.spentAll - r.wantSpent) < 2, 'a full repair costs a quarter of the price, then switches itself off ' + JSON.stringify([r.full, r.spentAll, r.wantSpent]));
  ck(r.brokeHp, 'Repair must pause while there is no money');
  ck(r.ck === true, 'repair/sell state must be in the checkpoint ' + r.ck); ck(r.foeSafe, 'an enemy building must not be sellable');
  ck(/conic-gradient/.test(r.clock) && r.qlen >= 2 && r.qn === String(r.qlen), 'a unit being built shows the clock wipe and the queue count as a number ' + JSON.stringify([r.clock, r.qn, r.qlen]));
  ck(r.sellBtn && r.repBtn && /Sell \$/.test(r.sellTxt) && r.keys === 'vo', 'a selected building must show Sell and Repair buttons, keys V / O ' + JSON.stringify([r.sellBtn, r.repBtn, r.sellTxt, r.keys]));
  await page.screenshot({ path: path.join(ROOT, 'orch', 'shots', 'zhfeel.jpg'), type: 'jpeg', quality: 85, timeout: 120000 }).catch(() => console.log('  (screenshot skipped)'));
  // ---- cursors
  const cu = await ev(() => { const o = {}; try { o.keys = Object.keys(CURD); o.sell = curCss('sell'); o.rep = curCss('repair'); o.mv = curCss('move'); o.btn = document.getElementById('zhSell').style.cursor; } catch (e) { o.err = String(e); } return o; });
  console.log('cursors', JSON.stringify(cu).slice(0, 300));
  ck(['sel', 'move', 'attack', 'nogo', 'enter', 'place', 'aim', 'sell', 'repair'].every(k => (cu.keys || []).includes(k)), 'Generals-style cursor set: normal/select/move/attack/cannot-move/enter/place/power/sell/repair ' + JSON.stringify(cu.keys));
  ck(/^url\("data:image\/png/.test(cu.sell || '') && /^url\("data:image\/png/.test(cu.rep || ''), 'sell and repair cursors are drawn data-URL cursors'); ck(/data:image/.test(cu.btn || ''), 'the Sell button shows the sell cursor');
} catch (e) { fails.push('zhfeel run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'ZHFEEL FAIL (' + fails.length + ')' : 'ZHFEEL PASS');
process.exit(fails.length ? 1 : 0);
