// Lane A2b gate: online grand campaign, as two players. HOST: menu → Grand campaign → Multiplayer → Grand campaign → lobby →
// friends → Begin (IR). FRIEND (second page): Grand campaign → Online campaign → types the code → Join → picks Saudi Arabia.
// Checks: the friend's map opens as SA; the host's AI stops running SA; a march the friend orders reaches the host's world;
// the host's clock carries the friend's map into the next month; the friend's Space pauses everyone; the friend leaving
// hands SA back to the AI. Pages talk through orch/mpsync.mjs's PeerJS stand-in (BroadcastChannel).   node orch/gnettest.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const arg0 = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg0('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const SAVE = arg0('save', ''), MKSAVE = arg0('mksave', '');
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots', 'laneA');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NAT = arg('nat', 'IR'), PROF = process.argv.includes('--prof');
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
// the PeerJS stand-in, taken verbatim from mpsync.mjs
const mps = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'mpsync.mjs'), 'utf8');
const a0 = mps.indexOf('function fakePeerShim(net) {'), a1 = mps.indexOf('\n}\n', a0) + 2;
if (a0 < 0) { console.log('GNETTEST FAIL\n  fakePeerShim not found in mpsync.mjs'); process.exit(1); }
// the host page draws the 3D grand map under SwiftShader (slow frames): give the stand-in's connect handshake 10 s, not 0.8 s
const SHIM = '(' + mps.slice(a0, a1).replace("this._emit('error', err('peer-unavailable', 'Could not connect to peer ' + rid)); }, 800);", "this._emit('error', err('peer-unavailable', 'Could not connect to peer ' + rid)); }, 10000);") + ')(null);';
const { chromium: cr } = await loadPW();
const browser = await cr.launch({ executablePath: chromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx);
await ctx.addInitScript({ content: SHIM });
await ctx.route('**/*', r => r.request().url().startsWith(URL0.replace('/index.html', '')) ? r.continue() : r.abort());
const fails = [], errs = [];
const t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
async function open(tag) { const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(tag + ' page error: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  page.on('console', m => { if (m.type() === 'warning' && /gnHost|gnJoin|p2p/.test(m.text())) console.log(tag, m.text()); if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource|peer|PeerJS|WebSocket|ICE|AudioContext|autoplay|speechSynthesis/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 300)); });
  await page.goto(URL0, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !!document.getElementById('grandBtn') && typeof NET !== 'undefined' && !!NET.room, null, { timeout: 90000 });
  return page; }
const click = async (page, sel, txt) => { const ok = await page.evaluate(([s, t]) => { const b = [...document.querySelectorAll(s)].find(x => !t || new RegExp(t).test(x.textContent)); if (!b) return false; b.click(); return true; }, [sel, txt]); if (!ok) throw new Error('no button ' + sel + ' ' + (txt || '')); };
const wait = (page, fn, arg, ms, what) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).catch(() => { throw new Error('timed out: ' + what); });
const shot = async (page, n) => { await page.screenshot({ path: path.join(SHOTS, n + '.png'), timeout: 120000 }).catch(() => console.log('  (screenshot skipped ' + n + ')')); };
try {
  const host = await open('host');
  // the host draws the flat map (SwiftShader can't run two 3D world maps at once in one process); the friend's page keeps 3D
  await host.evaluate(() => { window.g3Init = () => false; });
  await host.evaluate(() => localStorage.removeItem('ww3grand1'));
  await host.evaluate(() => { menuGo('online'); mxOnline('campaign'); }); await click(host, '#mxCampNew');
  await host.evaluate(() => { const s = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => o.value === 'IR')); s.value = 'IR'; s.onchange && s.onchange(); });
  await click(host, 'button', '^Create lobby$');
  await wait(host, () => GNT.lobby && GNT.code && document.getElementById('gnLobbyHost'), null, 60000, 'host lobby');
  await shot(host, 'camplobby-host-1');
  const code = await host.evaluate(() => GNT.code); console.log(el(), 'lobby open, code', code);
  const cl = await open('friend');
  await cl.evaluate(() => { menuGo('online'); });
  await cl.fill('#jcode', code.toUpperCase()); await click(cl, '#jbtn');
  await wait(cl, () => !!document.getElementById('gnLobbyCl') && !!document.getElementById('gnNat'), null, 30000, 'friend lobby screen');
  const opts = await cl.evaluate(() => [...document.getElementById('gnNat').options].filter(o => !o.disabled).map(o => o.value));
  if (opts.includes('IR')) fails.push('the creator\'s nation is offered to the friend');
  await cl.evaluate(() => { const s = document.getElementById('gnNat'); s.value = 'SA'; s.onchange(); });
  await wait(host, () => (GNT.hum.SA || {}).peer, null, 30000, 'host sees friend nation');
  await wait(cl, () => GNT.nat === 'SA' && document.getElementById('gnReady'), null, 30000, 'friend confirmed as SA');
  await wait(host, () => /Saudi/.test((document.getElementById('gnLobbyHost') || {}).textContent || ''), null, 15000, 'host lobby lists the friend');
  const st0 = await host.evaluate(() => { const b = document.getElementById('gnStart'); return b && b.disabled; });
  if (st0 !== true) fails.push('Start campaign was enabled before the friend ticked Ready');
  await click(cl, '#gnReady');
  await wait(host, () => { const b = document.getElementById('gnStart'); return b && !b.disabled && /Saudi/.test(document.getElementById('gnLobbyHost').textContent); }, null, 30000, 'host Start enabled after Ready');
  await shot(host, 'camplobby-host-2'); await shot(cl, 'camplobby-friend');
  { const lk = await host.evaluate(() => gnLink()); if (!/#gcamp=/.test(lk)) fails.push('invite link has no #gcamp= part: ' + lk); }
  await click(host, '#gnStart');
  await wait(host, () => GNT.host && GNT.code && document.getElementById('grandScreen'), null, 60000, 'host map + room').catch(async e => { console.log(await host.evaluate(() => JSON.stringify({ on: GNT.on, host: GNT.host, code: GNT.code, wh: GNT.wantHost, gs: !!document.getElementById('grandScreen'), hint: GV.hint, room: !!NET.room }))); throw e; });
  await host.evaluate(() => { const m = document.getElementById('gModal'); if (m) { const b = [...m.querySelectorAll('button')].pop(); if (b) b.click(); } });
  console.log(el(), 'campaign started');
  if (!/code/i.test(await host.evaluate(() => (document.getElementById('gnChip') || {}).textContent || ''))) fails.push('host map shows no online chip with the code');
  await wait(cl, () => typeof GC !== 'undefined' && GC && GC.me === 'SA' && document.getElementById('grandScreen'), null, 180000, 'friend map as SA').catch(async e => { console.log(await cl.evaluate(() => JSON.stringify({ note: (document.getElementById('gnNote') || {}).textContent, nat: GNT.nat, got: GNT.got, parts: Object.keys(GNT.parts).length, me: typeof GC !== 'undefined' && GC && GC.me }))); console.log(await host.evaluate(() => JSON.stringify({ hum: GNT.hum, busy: GNT.busy, last: GNT.last.length }))); throw e; });
  console.log(el(), 'friend joined as SA');
  const h1 = await host.evaluate(() => ({ ai: GC.nat.SA.ai, me: GC.me, chip: (document.getElementById('gnChip') || {}).textContent }));
  if (h1.ai !== false) fails.push('host AI still runs the friend\'s nation'); if (h1.me !== 'IR') fails.push('host lost its own nation'); if (!/Saudi/.test(h1.chip || '')) fails.push('host chip does not show the friend: ' + h1.chip);
  // the friend orders a march (the same function a right-click calls)
  const mv = await cl.evaluate(() => { for (const a of GC.armies.filter(x => x.o === 'SA' && x.u.length && !x.fl && !x.path.length)) for (const j of GCM.P[a.at].adj) { const P = GCM.P[j]; if (P.land && GC.prov[j].o === 'SA') { const r = grOrderMove(a.id, j); if (!r.err) return { id: a.id, to: j }; } } return null; });
  if (!mv) fails.push('friend found no army to march'); else {
    const ok = await host.waitForFunction(m => { const a = GC.armies.find(x => x.id === m.id); return a && a.path.length && a.path[a.path.length - 1] === m.to; }, mv, { timeout: 40000, polling: 250 }).then(() => true, () => false);
    if (!ok) fails.push('the friend\'s march never reached the host'); else console.log(el(), 'friend march reached host'); }
  // the friend sets a province's tax (the Low/Normal/High buttons call grSetTax)
  const tx = await cl.evaluate(() => { const p = GCM.P.find(q => q.land && GC.prov[q.i].o === 'SA'); const v = GC.prov[p.i].tax === 0 ? 2 : 0; grSetTax('SA', p.i, v); return { pi: p.i, v }; });
  if (!await host.waitForFunction(t => GC.prov[t.pi].tax === t.v, tx, { timeout: 40000, polling: 250 }).then(() => true, () => false)) fails.push('the friend\'s tax order never reached the host');
  // A2b slice 3: a friend's event lands on the friend's own map (not auto-picked by the host's AI) and their choice settles on the host
  await host.evaluate(() => { gevFire('SA', 'trade'); GNT.dirty = 1; GNT.last = ''; });
  const evq = await host.evaluate(() => (GC.ev.pend || []).some(p => p[0] === 'SA' && p[1] === 'trade'));
  if (!evq) fails.push('the host auto-picked the friend\'s event instead of asking the friend');
  else if (!await cl.waitForFunction(() => (GC.ev && GC.ev.pend || []).some(p => p[0] === 'SA' && p[1] === 'trade'), null, { timeout: 40000, polling: 250 }).then(() => true, () => false)) fails.push('the friend\'s event never reached the friend');
  else { await cl.evaluate(() => { gevShow(); }); const mb = await cl.evaluate(() => { const m = document.getElementById('gModal'); const b = m && [...m.querySelectorAll('button')].find(x => /Decline politely/.test(x.textContent)); if (b) b.click(); return !!b; });
    if (!mb) fails.push('the friend saw no event window');
    else if (!await host.waitForFunction(() => (GC.ev.hist || []).some(h => h[1] === 'SA' && h[2] === 'trade' && h[3] === 1) && !(GC.ev.pend || []).some(p => p[0] === 'SA'), null, { timeout: 40000, polling: 250 }).then(() => true, () => false)) fails.push('the friend\'s event choice never settled on the host');
    else console.log(el(), 'friend answered their own event'); }
  // a forged order for someone else's army is refused
  const forged = await cl.evaluate(() => { const a = GC.armies.find(x => x.o === 'IR' && !x.path.length && !x.fl); if (!a) return null; GNT.g.emit('gcmd', { k: 'cmd', f: 'grSplit', a: [a.id] }); return { id: a.id, n: a.u.length }; });
  // host plays at speed 5: the friend's calendar follows into the next month
  const turn0 = await cl.evaluate(() => GC.turn);
  await host.bringToFront(); await host.evaluate(() => guSpeed(5));
  await wait(cl, t => GC.turn > t && GC.me === 'SA', turn0, 150000, 'friend map reaches the next month').catch(async e => { console.log('host', await host.evaluate(() => JSON.stringify({ t: GC.turn, d: GC.day, spd: GV.spd, hid: document.hidden, ph: GC.ph, busy: GV.busy, modal: !!document.getElementById('gModal'), G: !!G, last: GNT.last.length }))); console.log('friend', await cl.evaluate(() => JSON.stringify({ t: GC.turn, d: GC.day, me: GC.me }))); throw e; });
  console.log(el(), 'month rolled on the friend\'s map');
  if (forged) { const n = await host.evaluate(id => (GC.armies.find(x => x.id === id) || { u: [] }).u.length, forged.id); if (n < forged.n) fails.push('host ran a forged order on its own army'); }
  const h2 = await host.evaluate(() => ({ t: GC.turn, ai: GC.nat.SA.ai }));
  if (h2.ai !== false) fails.push('SA went back to AI while the friend is connected');
  // the friend pauses everyone (Space)
  await cl.bringToFront(); await cl.evaluate(() => guSpeed(0));
  await wait(host, () => !GV.spd, null, 40000, 'friend pause reaches host');
  await wait(cl, () => !GV.spd, null, 40000, 'friend clock shows paused');
  console.log(el(), 'friend paused the world');
  await shot(cl, 'gnet-friend-SA'); await shot(host, 'gnet-host-IR');
  // the friend's attack is fought on the HOST's map by days (no prompt, nobody waits, no real-time battle); the friend sees the same battle
  // (marker, window, days) through the world state, and the result settles on the host's world
  const tgt = await cl.evaluate(() => { const near = a => { const s = new Set(GCM.P[a.at].adj); for (const k of GCM.P[a.at].adj) for (const m of GCM.P[k].adj) s.add(m); return [...s].sort((x, y) => x - y); };
    for (const a of GC.armies.filter(x => x.o === 'SA' && x.u.length >= 2 && !x.fl)) for (const j of near(a)) { const P = GCM.P[j]; if (!P.land || !GC.prov[j]) continue; const o = GC.prov[j].o; if (!o || o === 'SA' || o === 'IR' || GC.armies.some(x => x.at === j && x.o === 'IR')) continue;
      if (!grAtWar('SA', o)) grDeclare('SA', o); a.path = []; const r = grOrderMove(a.id, j); if (!r.err) return { id: a.id, to: j, o, t: GC.turn }; window.__why = [a.id, j, o, r.err, grAtWar('SA', o), GC.ph]; } return { dbg: JSON.stringify([window.__why, GC.armies.filter(x => x.o === 'SA').map(x => [x.id, x.at, x.u.length, !!x.fl])]).slice(0, 600) }; });
  if (tgt && tgt.dbg) { console.log('dbg', tgt.dbg); } if (!tgt || tgt.dbg) fails.push('friend found no enemy province to attack'); else {
    await wait(host, m => { const a = GC.armies.find(x => x.id === m.id); return a && a.path.length && grAtWar('SA', m.o); }, tgt, 40000, 'friend attack order on host');
    await host.bringToFront(); await host.evaluate(() => guSpeed(3));   // 2.5 days a second: slow enough for the friend's map to show the fight while it lasts
    let seenCl = null, done = null; const tEnd = Date.now() + 300000;
    while (Date.now() < tEnd) {
      const hs = await host.evaluate(m => { const B = gwBattleAt(m.to), S = gwSiegeAt(m.to), R = (GC.br || []).filter(r => r.p === m.to && (r.who || []).includes('SA')); return { t: GC.turn, d: GC.day | 0, ph: GC.ph, b: B ? B.d : -1, s: S ? S.d : -1, r: R.length, modal: (document.getElementById('gModal') || {}).textContent || '', g: typeof G !== 'undefined' && !!G }; }, tgt);
      const cs = await cl.evaluate(m => { const B = gwBattleAt(m.to), S = gwSiegeAt(m.to); return { b: B ? B.d : -1, s: S ? S.d : -1, r: (GC.br || []).filter(r => r.p === m.to).length, marks: GWU.marks.filter(x => x.p === m.to).length, modal: (document.getElementById('gModal') || {}).textContent || '', g: typeof G !== 'undefined' && !!G }; }, tgt);
      if (hs.modal && !/Fight it live|Auto-resolve/.test(hs.modal)) { await host.evaluate(() => { const m = document.getElementById('gModal'); if (m) { const b = [...m.querySelectorAll('button')].pop(); if (b) b.click(); } }); hs.modal = ''; }   // an event card: answer it so the clock runs on
      if (hs.modal || hs.g || cs.g || /Fight it live|Auto-resolve/.test(cs.modal)) { fails.push('a battle dialog or a real-time battle appeared in the online campaign: ' + JSON.stringify([hs, cs])); break; }
      if (!seenCl && cs.r && cs.b < 0 && cs.s < 0) { seenCl = cs; console.log(el(), 'friend has the result of the fight', JSON.stringify(cs)); }
      if (!seenCl && (cs.b >= 1 || cs.s >= 1)) { seenCl = cs; console.log(el(), 'friend sees the fight on the map', JSON.stringify(cs)); await cl.evaluate(m => { gwuOpen(m.to); }, tgt); await new Promise(r => setTimeout(r, 400));
        const w = await cl.evaluate(() => { const e = document.getElementById('gwWin'); return e ? e.textContent.replace(/\s+/g, ' ').slice(0, 120) : ''; }); if (!/^(Battle|Siege) of /.test(w)) fails.push('the friend cannot open the battle window: ' + w); await shot(cl, 'gnet-friend-battle'); await cl.evaluate(() => gwuClose()); }
      if ((hs.r && seenCl) || (seenCl && hs.s >= 12)) { done = hs; break; }
      await new Promise(r => setTimeout(r, 700)); }
    console.log(el(), 'online fight', JSON.stringify(done));
    if (!seenCl) fails.push('the friend never saw their battle or siege on their own map');
    if (!done) fails.push('the friend\'s fight never ran on the host\'s map');
    else if (done.ph !== 'plan') fails.push('the host map is stuck after the friend\'s fight: ' + JSON.stringify(done));
    await host.evaluate(() => guSpeed(0)); }
  // the friend leaves: SA back to the AI
  await click(cl, '#gMenuBtn'); await click(cl, '#gMenuPop button', '^Save & exit');   /* camphud: Save & exit lives in the bar's ☰ menu */
  await wait(host, () => GC.nat.SA.ai === true, null, 15000, 'SA handed back to the AI');
  console.log(el(), 'friend left, AI took over');
  { const lp = await host.evaluate(() => { gevS().pend.push(['SA', 'trade']); gevTurn(); return (GC.ev.pend || []).some(p => p[0] === 'SA'); });
    if (lp) fails.push('an event left open by a friend who quit was never answered by the AI'); }
} catch (e) { fails.push('error: ' + e.message); }
if (errs.length) fails.push(...errs.slice(0, 6));
await browser.close(); server.close();
console.log(fails.length ? 'GNETTEST FAIL\n  ' + fails.join('\n  ') : 'GNETTEST PASS'); process.exit(fails.length ? 1 : 0);
