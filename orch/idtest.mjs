// ideas test (EU4-style idea groups, slots, AI character, save/load, determinism, Ideas screen): node orch/idtest.mjs
// from the map holds EXACTLY the army's units (types and counts) and no production, survivors/losses flow back exactly,
// the province is captured. Screenshots: orch/shots/grand1/.   node orch/grandtest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'ideas');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MIN = Number(arg('minutes', 2)), ONLY = arg('only', '');
async function loadPW() { try { return await import('playwright'); } catch {} const r = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return r(p); } catch {} } throw new Error('no playwright'); }
function chromium() { const b = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'; try { for (const d of fs.readdirSync(b).filter(d => d.startsWith('chromium-')).sort().reverse()) { const e = path.join(b, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(e)) return e; } } catch {} }
await acquireBrowserLock();
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }); await guardContext(ctx);

const fails = [];
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
await page.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof gidPick === 'function', null, { timeout: 60000 });
  const r = await ev(() => { const out = {};
    const keys = Object.keys(GID_GROUPS).filter(k => !GID_GROUPS[k].tree);
    out.n18 = keys.length === 18 && GID_COLS.every(c => keys.filter(k => GID_GROUPS[k].col === c).length === 6);
    out.seven = keys.every(k => GID_GROUPS[k].ideas.length === 7 && GID_GROUPS[k].bonus && GID_GROUPS[k].cost && GID_MOT[GID_GROUPS[k].art]);
    const used = ['income', 'manpower', 'upkeep', 'warSupport', 'unrest', 'forceLimit', 'armyMor', 'ppPol', 'ppDip', 'ppMil', 'fires', 'attack', 'defense', 'spy', 'spyDef'];
    out.stats = keys.every(k => GID_GROUPS[k].ideas.every(i => used.includes(i[3])));
    // equal value: every idea = 2 units of its stat, bonus 3, cost -1
    const val = k => GID_GROUPS[k].ideas.reduce((a, i) => { const U = GID_U[i[3]]; const v = i[4].add !== undefined ? i[4].add : i[4].mul - 1; return a + v / U[1]; }, 0);
    out.equal = keys.every(k => Math.abs(val(k) - 14) < .01);
    const ids = new Set(); out.uniq = Object.values(GID_GROUPS).every(G => G.ideas.every(i => !ids.has(i[0]) && ids.add(i[0])));
    grNew({ me: 'KR', seed: 5, len: 'std' }); const N = gidN('KR'); N.pp = { pol: 500, dip: 500, mil: 500, t: GC.turn }; N.rs = { gov: 0, dip: 0, mil: 0 };
    out.slots = gidSlots('KR') === 2 && gidSlots('US') === 3;
    const a0 = gmod('nation', 'KR', 'attack', 1), inc0 = gmod('nation', 'KR', 'income', 100);
    out.pick = gidPick('KR', 'ca') === '' && gidPick('KR', 'tech') === '' && gidPick('KR', 'air') !== '' && gidBuy('KR', 'air') !== '';
    out.costrow = gmod('nation', 'KR', 'income', 100) < inc0;   // combined arms + technocratic costs
    out.buy = gidBuy('KR', 'ca') === '' && N.pp.mil === 470 && gidBuy('KR', 'ca') === '' && N.pp.mil === 425 && gmod('nation', 'KR', 'attack', 1) > a0;
    N.rs.gov = 2; out.slot3 = gidSlots('KR') === 3 && gidPick('KR', 'air') === ''; N.rs = { gov: 5, dip: 5, mil: 5 }; out.max8 = gidSlots('KR') === 8;
    N.pp.mil = 9999; for (let i = 0; i < 5; i++) gidBuy('KR', 'ca'); out.done = gidLevel('KR', 'ca') === 7 && GMOD_ROWS.some(x => x.id === 'idea_ca_done') && gmodRows('nation', 'KR', 'attack').some(x => x.id === 'idea_ca_done');
    const pm = N.pp.pol; out.drop = gidDrop('KR', 'tech') === '' && N.ig.indexOf('tech') < 0 && N.pp.pol === pm;
    // the doctrine stats scale army strength
    out.auto = grIdeaMul('KR', 'attack') > 1.1;
    // save/load round trip
    const js = JSON.stringify(GC); const G2 = JSON.parse(js); out.save = JSON.stringify(G2.nat.KR.ig) === JSON.stringify(N.ig) && G2.nat.KR.idea.length === N.idea.length;
    // old save: old shared groups map onto modern groups
    const O = GC.nat.KR; O.ig = undefined; O.idea = ['pf1', 'ec1', 'ec2', 'ml1']; gidN('KR'); out.old = O.idea.includes('pf1') && O.idea.includes('econ1') && O.idea.includes('econ2') && O.idea.includes('quan1') && O.ig.join() === 'econ,quan';
    // AI character + determinism
    const run = () => { grNew({ me: null, seed: 31, len: 'quick' }); grRunAI(4); const o = {}; for (const c of Object.keys(GC.nat).sort()) o[c] = [GC.nat[c].ig.join(), GC.nat[c].idea.join()]; return JSON.stringify(o); };
    const h1 = run(), il = GC.nat.IL && GC.nat.IL.ig.join(), ir = GC.nat.IR && GC.nat.IR.ig.join(), us = GC.nat.US && GC.nat.US.ig.join(); const h2 = run();
    out.det = h1 === h2; out.ai = il === 'qual,intel' && ir === 'rel,proxy' && us === 'naval,ca,ally'; out.aiv = [il, ir, us].join(' / ');
    grRunAI(8); out.bought = Object.values(GC.nat).some(n => n.idea.some(i => keys.some(k => i === k + '1')));
    // world reaction: proxies make nearby nations trust Iran less
    if (GC.nat.IR) { const near = Object.keys(GC.nat).filter(o => o !== 'IR' && !GC.nat[o].dead && grDist(GC.nat.IR.cap, GC.nat[o].cap) < 900 && !grAtWar('IR', o) && !grAllied('IR', o));
      const b = near.map(o => grOpinion('IR', o)); grRunAI(2); out.threat = near.length > 0 && near.some((o, i) => grOpinion('IR', o) < b[i]); }
    out.tab = NP.tabs.some(t => t.id === 'idea'); out.net = GNT_W.gidPick === 0;
    return out; });
  console.log('idtest', JSON.stringify(r));
  for (const [k, v] of Object.entries(r)) if (!v) fails.push('ideas ' + k);
  // the Ideas screen (phone-sized screenshot <= 1200 px)
  await page.setViewportSize({ width: 1200, height: 860 });
  await ev(() => { grNew({ me: 'IR', seed: 7, len: 'quick' }); const N = gidN('IR'); N.pp = { pol: 260, dip: 240, mil: 300, t: GC.turn }; gidPick('IR', 'rel'); gidPick('IR', 'quan'); gidBuy('IR', 'zeal'); gidBuy('IR', 'rel'); gidBuy('IR', 'rel'); gidBuy('IR', 'quan'); grandOpen(); });
  await page.waitForTimeout(2500);
  const ui = await ev(() => { npOpen('IR', 'idea'); const w = document.getElementById('npWin'); return { open: !!w, cards: w ? w.querySelectorAll('svg').length : 0, cols: w ? /Political[\s\S]*Diplomatic[\s\S]*Military/.test(w.textContent) : false, pick: w ? [...w.querySelectorAll('button')].filter(b => b.textContent === 'Pick').length : 0 }; });
  console.log('idui', JSON.stringify(ui)); if (!ui.open || ui.cards < 18 || !ui.cols || ui.pick !== 16) fails.push('ideas ui ' + JSON.stringify(ui));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'ideas-phone.jpg'), type: 'jpeg', quality: 82 });
} catch (e) { fails.push('exception: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 5));
await browser.close(); server.close();
console.log(fails.length ? 'IDTEST FAIL\n' + fails.join('\n') : 'IDTEST PASS'); process.exit(fails.length ? 1 : 0);
