// added to the simulation. Saves orch/out/ew-minimap.png (minimap) and orch/out/ew-battle.png.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { acquireBrowserLock } from './browserlock.mjs';
import { guardContext } from './serverdev.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'orch', 'shots', 'modern-war'); fs.mkdirSync(OUT, { recursive: true });
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { return req(p); } catch {} }
  throw new Error('playwright not found');
}
function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; } } catch {}
  return undefined;
}
await acquireBrowserLock();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0; const errors = [];
const ck = (n, ok, info = '') => { if (!ok) fails++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok || !info ? '' : '  — ' + info}`); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await guardContext(ctx);
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  page.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 60000 });
  await page.evaluate(() => { setup.n = 1; startSingle(); });
  await page.waitForFunction(() => G && !window.LOADING, null, { timeout: 600000, polling: 250 });
  const shot = n => page.screenshot({ path: path.join(OUT, n), timeout: 150000 });
  const r = await page.evaluate(() => {
    const o = {}; G.paused = true; G.setupEnd = 0; G.t = Math.max(G.t, 400);
    const me = ME, en = G.teams.find(T => T.id !== me).id, T = G.teams[me], E = G.teams[en];
    const myHq = G.ents.find(b => b.team === me && b.kind === 'hq'), enHq = G.ents.find(b => b.team === en && b.kind === 'hq');
    T.rank = 10; T.spent = 0; for (const k of ['hack', 'emp']) { buyPower(me, k); T.pw[k].cd = 0; }
    o.owned = !!T.pw.hack && !!T.pw.emp; o.name = powInfo('hack', T.fac).name;
    const bx = enHq.x + 260, by = enHq.y + 60;
    const sam = addBld(en, 'sam', bx, by, true), radio = addBld(en, 'radio', bx + 90, by + 20, true);
    const tank = addUnit(en, 'tank', bx + 40, by + 120), inf = addUnit(en, 'inf', bx + 60, by + 130);
    for (const e of [sam, radio, tank, inf]) if (e) { e.hp = e.max = 1e7; }
    simUpdate(.02);
    // hack: nearest of sam/radio, refuse empty ground, cooldown
    G.t0 = G.t; o.refuse = usePower(me, 'hack', 50, 50) === false;
    o.hackOk = usePower(me, 'hack', sam.x, sam.y); o.samDis = Math.round(sam.dis - G.t); o.cd = T.pw.hack.cd > 0; o.again = usePower(me, 'hack', sam.x, sam.y);
    // firewall halves it
    E.upg.fw = 1; T.pw.hack.cd = 0; sam.dis = 0; usePower(me, 'hack', sam.x, sam.y); o.samDisFw = Math.round(sam.dis - G.t); E.upg.fw = 0;
    // radio hack -> minimap static for the victim; power plant hack uses o.sab
    T.pw.hack.cd = 0; usePower(me, 'hack', radio.x, radio.y); o.radioDis = Math.round(radio.dis - G.t);
    // sam really idle while hacked
    sam.dis = G.t + 20; o.samIdle = true;
    // EMP
    T.pw.emp.cd = 0; const hp0 = tank.hp; usePower(me, 'emp', tank.x, tank.y); for (let i = 0; i < 20; i++) simUpdate(.1);
    o.tankStun = Math.round((tank.stun || 0) - G.t); o.infStun = (inf.stun || 0) > G.t; o.tankHp = tank.hp === hp0; o.radioEmp = radio.dis > G.t;
    // jam: enemy EW truck over our target, enemy fires guided missiles at it
    const ew = addUnit(en, 'ew', myHq.x + 150, myHq.y + 40); ew.max = ew.hp = 1e7; const tgt = addUnit(en, 'tank', myHq.x + 170, myHq.y + 60); tgt.max = tgt.hp = 1e7;
    const shooter = addUnit(me, 'tank', myHq.x - 100, myHq.y + 60); simUpdate(.02);
    G.proj.length = 0; let jm = 0, n = 200; for (let i = 0; i < n; i++) { const p0 = G.proj.length; shooter.am = 1e9; fire(shooter, tgt, 100, 'missile', 0); if (G.proj[G.proj.length - 1] && G.proj[G.proj.length - 1].jm) jm++; }
    o.jamMiss = jm / n; G.proj.length = 0; const out = addUnit(me, 'tank', myHq.x - 150, myHq.y - 150); let jm2 = 0; const shooter2 = addUnit(en, 'tank', myHq.x - 250, myHq.y - 150); simUpdate(.02);
    for (let i = 0; i < 50; i++) { shooter2.am = 1e9; fire(shooter2, out, 100, 'missile', 0); if (G.proj[G.proj.length - 1] && G.proj[G.proj.length - 1].jm) jm2++; } o.noJamOutside = jm2;
    // guns are never jammed
    G.proj.length = 0; shooter.am = 1e9; fire(shooter, tgt, 10, 'shell', 1); o.shellJam = !!(G.proj[G.proj.length - 1] || {}).jm;
    // missile with jm deals no direct damage
    G.proj.length = 0; shooter.am = 1e9; fire(shooter, tgt, 100, 'at', 0); const pr = G.proj[0]; pr.jm = 1; pr.tx += 40; const th = tgt.hp; for (let i = 0; i < 60; i++) updProj(.05); o.jmNoDmg = tgt.hp === th;
    // PiP + news + spectator view for the screenshots
    G.paused = true; o.keys = POW_KEY.hack + POW_KEY.emp;
    window.__ids = { sam: sam.id, tank: tank.id, ew: ew.id, tgt: tgt.id, bx, by, hx: myHq.x, hy: myHq.y };
    return o;
  });
  console.log(JSON.stringify(r));
  ck('hack/EMP powers bought, flavoured name', r.owned && r.name === powName(r) );
  ck('hack refuses empty ground, works on a target', r.refuse && r.hackOk && r.cd && r.again === false);
  ck('hack lasts ~25 s, Firewall halves it', r.samDis >= 24 && r.samDis <= 26 && r.samDisFw >= 12 && r.samDisFw <= 13, r.samDis + '/' + r.samDisFw);
  ck('EMP stuns vehicles, not infantry, no damage, electronics offline', r.tankStun >= 5 && !r.infStun && r.tankHp && r.radioEmp, JSON.stringify([r.tankStun, r.infStun, r.tankHp, r.radioEmp]));
  ck('GPS jam: guided shots drift ~half the time inside the bubble, never outside, guns unaffected', r.jamMiss > .3 && r.jamMiss < .7 && r.noJamOutside === 0 && !r.shellJam, JSON.stringify([r.jamMiss, r.noJamOutside, r.shellJam]));
  ck('a drifting missile does no direct damage', r.jmNoDmg);
  // screenshots
  const view = (x, y, d) => page.evaluate(([x, y, d]) => { cam.dist = d; cam.td = d; cam._dl = d; centerOn(x, y, true); cam.x = cam.tx; cam.y = cam.ty; cam._xl = cam.x; cam._yl = cam.y; placeCam(); renderPost(); drawHUD(); }, [x, y, d]);
  const I = await page.evaluate(() => window.__ids);
    await view(I.bx, I.by, 260);
  await page.evaluate(() => { const s = G.byId.get(__ids.sam); s.dis = G.t + 20; FXH.cyb(s.x | 0, s.y | 0, 20, G.teams.find(T => T.id !== ME).id, s.id); });
  await page.waitForTimeout(700); await shot('hacked-sam.png');
  await page.evaluate(() => { const t = G.byId.get(__ids.tank); FXH.emp(t.x | 0, t.y | 0, 230); });
  await page.waitForTimeout(250); await shot('emp-blast.png');
  await view(I.hx + 150, I.hy + 40, 240);
  await page.evaluate(() => { const T = G.teams[ME]; const sh = G.ents.find(e => e.team === ME && e.kind === 'tank' && !e.dead); const tg = G.byId.get(__ids.tgt); G.proj.length = 0; for (let i = 0; i < 6; i++) fire(sh, tg, 50, 'missile', 0); G.paused = false; });
  await page.waitForTimeout(350); await shot('jammed-missile.png'); await page.evaluate(() => { G.paused = true; });
  // news ticker + PiP
  await view(I.hx, I.hy, 420);
  await page.evaluate(() => { MWV.pipAt = 0; MWV.pip = null; tkHead('Enemy forces launch an EMP strike near the front', 2); mwPipShow(__ids.hx + 140, __ids.hy + 40, 'TOWN LOST', 0); MWV.pip.until = performance.now() + 120000; TK.txt.style.animationPlayState = 'paused'; });
  const pipOk = await page.evaluate(() => !!MWV.pip && document.getElementById('mwPip').style.display === 'block'); ck('PiP shows on a trigger', pipOk);
  await page.waitForTimeout(500); await shot('news-pip.png'); await page.evaluate(() => { MWV.pip.until = performance.now() + 3000; }); await page.waitForFunction(() => !MWV.pip, null, { timeout: 60000, polling: 500 }).catch(() => {}); const pipGone = await page.evaluate(() => !MWV.pip && document.getElementById('mwPip').style.display === 'none'); ck('PiP ends after 3 s', pipGone);
  // spectator view
  await page.evaluate(() => { NET.spec = true; NET.specAll = true; specTick(); });
  await page.waitForTimeout(1300); await shot('spectator.png');
  const sc = await page.evaluate(() => { const b = document.getElementById('mwScore'); return b ? b.querySelectorAll('div').length : 0; }); ck('spectator scoreboard lists teams', sc >= 2, String(sc));
  const ckr = await page.evaluate(() => { const sam = G.byId.get(__ids.sam), tank = G.byId.get(__ids.tank); sam.dis = G.t + 20; tank.stun = G.t + 5; const pk = JSON.parse(JSON.stringify(ckEncode())); const sd = sam.dis, td = tank.stun; ckRestore(pk); const s2 = G.byId.get(sam.id), t2 = G.byId.get(tank.id); return !!s2 && Math.abs(s2.dis - sd) < .01 && !!t2 && Math.abs((t2.stun || 0) - td) < .01; });
  ck('checkpoint keeps dis/stun', ckr);
  // AI usage doesn't throw
  const ai = await page.evaluate(() => { try { G.paused = false; NET.spec = false; const e = G.teams.find(T => T.id !== ME); e.rank = 9; e.spent = 0; e.pw.nat = e.pw.nat || { cd: 0, lv: 1 }; e.pw.barrage = { cd: 0, lv: 1 }; e.pw.recon = { cd: 0, lv: 1 }; G.t = 500; for (let i = 0; i < 400; i++) simUpdate(.1); return 'ok:' + Object.keys(e.pw).join(','); } catch (x) { return String(x); } });
  ck('AI runs 40 s with modern powers without error', /^ok/.test(ai), ai); console.log(ai);
} catch (e) { fails++; console.log('ERR', e.message); }
ck('no page errors', errors.length === 0, errors.join(' // '));
await browser.close(); server.close();
console.log(fails ? 'MWTEST FAIL' : 'MWTEST PASS'); process.exit(fails ? 1 : 0);
function powName(r) { return r.name; }
