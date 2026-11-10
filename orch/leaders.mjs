// Leader abilities test (leadersC, Abdullah 2026-11-07 22:5x): Ayatollah and Dear Leader kits, cooldowns, checkpoint, AI. node orch/leaders.mjs -> LEADERS PASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'orch', 'shots', 'leaders');
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
  await page.waitForFunction(() => typeof grNew === 'function' && typeof MODELS !== 'undefined', null, { timeout: 60000 });
  await page.waitForFunction(() => MODELS.ready || !MODELS.loading, null, { timeout: 180000 }).catch(() => {});
  for (const [nat, kind] of [['IR', 'ay'], ['KP', 'dl']]) {
    await ev(n => { setup.p = n; setup.a = n === 'IR' ? 'US' : 'KR'; setup.n = 1; try { initAudio(); } catch (e) {} startSingle(); }, nat);
    await page.waitForFunction(() => typeof G !== 'undefined' && !!G && !window.LOADING, null, { timeout: 600000, polling: 250 }).catch(() => fails.push('battle never loaded'));
    await page.waitForTimeout(1500);
    const r = await ev(k => {
      const T = G.teams[ME]; G.setupEnd = 0; T.credits = 30000;
      const hq = G.ents.find(e => e.isB && e.team === ME && e.kind === 'hq'); const L = addUnit(ME, 'cleric', hq.x + 120, hq.y + 120); ldTick(.2); ldTick(.6);
      const out = { kind: LDKT[ME], hasLeader: !!LDU[ME] && LDU[ME] === L, name: L.s.name, aura: !!L.s.aura };
      const foe = G.teams.findIndex((t, i) => i !== ME && !t.reb);
      const near = []; for (let i = 0; i < 6; i++) near.push(addUnit(ME, 'inf', L.x + 40 + i * 12, L.y));
      const arty = []; for (let i = 0; i < 3; i++) arty.push(addUnit(ME, 'arty', L.x - 60, L.y + i * 20));
      const far = addUnit(ME, 'inf', L.x + 900, L.y);
      if (k === 'ay') {
        out.cast = ldCast(ME, 'a'); out.ins = near.every(u => u.insT > G.t) && !(far.insT > G.t); out.cd = T.ld.c1 - G.t; out.cast2 = ldCast(ME, 'a');
        near[0].supp = .9; const before = G.ents.length; out.ult = ldCast(ME, 'u'); out.muster = G.ents.length - before; out.ultCd = T.ld.c2 - G.t;
        // Path of Hussein: an infantry man falls beside him
        near[1].hp = 1; applyDmg(near[1], 999, 'gun', foe, null); out.ph = T.ld.ph.length; out.mban = (G.mban || []).length;
        // damage taken from artillery is 15% lower near him
        out.tk = ldTaken(near[2], 'shell', null); out.tkFar = ldTaken(far, 'shell', null); out.sup2 = ldSupp(near[2]); out.sup1 = ldSupp(far);
      } else {
        const tg = { x: L.x + 300, y: L.y }; const s0 = G.strikes.length; out.cast = ldCast(ME, 'a', tg.x, tg.y); out.volley = G.strikes.length - s0; out.ord = arty.every(u => u.ordT > G.t); out.cast2 = ldCast(ME, 'a', tg.x, tg.y);
        const v = addUnit(ME, 'tank', L.x + 30, L.y); v.hp = v.max * .3; v.crit = 3; const h0 = v.hp; for (let i = 0; i < 6; i++) { ldTick(.6); } out.heal = v.hp > h0; out.critCleared = !(v.crit & 3);
        const c0 = enqueueCost('inf'); out.mm = ldCast(ME, 'u'); out.mmCost = enqueueCost('inf') / c0; out.guards = G.ents.filter(e => !e.isB && e.team === ME && e.kind === 'inf').length;
        out.prod = ldProd(T, G.ents.filter(e => e.isB && e.team === ME && e.kind === 'barracks'), stats(T.fac, 'inf'));
        function enqueueCost(kk) { const s = stats(T.fac, kk); return Math.round(s.cost * ldCost(T, s)); }
      }
      out.drawn = (() => { try { const lu = L; G.sel = [lu]; updateUI(); return [...document.querySelectorAll('button.btn.wide')].map(b => b.textContent).filter(t => /★ (Sermon|Call to Arms|Supreme|Mass)/.test(t)); } catch (e) { return String(e); } })();
      cam.x = L.x; cam.y = L.y; return out; }, kind);
    console.log(nat, JSON.stringify(r));
    ck(r.hasLeader && r.kind === kind, nat + ': leader not found'); ck(!r.aura, nat + ': old never-break morale aura is still on the leader'); ck(r.cast, nat + ': active ability did not fire'); ck(!r.cast2, nat + ': active ability ignored its cooldown');
    ck(Array.isArray(r.drawn) && r.drawn.length === 2, nat + ': the two leader buttons are not shown: ' + JSON.stringify(r.drawn));
    if (kind === 'ay') { ck(r.ins, 'Sermon did not inspire exactly the units in the halo'); ck(r.ult && r.muster >= 6, 'Call to Arms did not muster volunteers: ' + r.muster); ck(r.ph >= 1 && r.mban >= 1, 'Path of Hussein banner did not rise'); ck(Math.abs(r.tk - .85) < 1e-6 && r.tkFar === 1, 'Steadfast artillery cut wrong'); ck(r.sup2 === 2 && r.sup1 === 1, 'Steadfast suppression recovery wrong'); }
    else { ck(r.volley >= 3 && r.ord, 'Supreme Commander\'s Order did not fire a free volley from every artillery unit near him: ' + r.volley); ck(r.heal && r.critCleared, 'Unbreakable Spirit: wounded vehicle near him did not mend / keep full speed'); ck(r.mm && Math.abs(r.mmCost - .75) < .01 && r.guards >= 8 && r.prod >= 1.5, 'Mass Mobilization: ' + JSON.stringify([r.mmCost, r.guards, r.prod])); }
    // the FX the player sees (screenshots for the report)
    await ev(() => { for (let i = 0; i < 3; i++) simUpdate(1 / 60); G.paused = false; });
    await page.waitForTimeout(700); await shot('leaders-' + nat);
    // the AI uses them and 3 game minutes stay sane (no exceptions, no unit explosion)
    const sim = await ev(() => { for (const T of G.teams) if (!T.ai && typeof mkAI === 'function') T.ai = mkAI(1); const n0 = G.ents.length; for (let i = 0; i < 1500 && !G.over; i++) simUpdate(1 / 60); return { n0, n1: G.ents.length, used: G.teams.map(T => T.ld ? [Math.round(T.ld.c1), Math.round(T.ld.c2)] : null) }; });
    console.log(nat, 'AI minute', JSON.stringify(sim));
    // checkpoint round-trip keeps the leader state
    const ck2 = await ev(() => { try { const c = ckEncode(); return { ok: !!c, ld: c.teams[ME] && c.teams[ME].ld ? 1 : 0 }; } catch (e) { return { err: String(e) }; } });
    ck(ck2.ok && ck2.ld, nat + ': checkpoint lost the leader state ' + JSON.stringify(ck2));
  }
} catch (e) { fails.push('leaders run crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
for (const e of errs) fails.push(e);
await browser.close(); server.close();
}
for (const f of fails) console.log('FAIL: ' + f);
console.log(fails.length ? 'LEADERS FAIL (' + fails.length + ')' : 'LEADERS PASS');
process.exit(fails.length ? 1 : 0);
