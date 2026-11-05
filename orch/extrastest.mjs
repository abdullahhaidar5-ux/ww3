// QA for the "extras" UI: Photo mode (P), Voice commands (mic / V, with a mocked SpeechRecognition), and the highlight
// clip (Save clip after the kill-cam replay). Drives the loop by hand (rAF does not run headless).
//   node orch/extrastest.mjs [--vp hd|phoneP]      screenshots -> orch/shots/extras/
import fs from 'node:fs';
import { startServer, launch, openPage, toMenu, waitLoaded, sleep, ROOT } from './qa-lib.mjs';
import path from 'node:path';
const A = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VP = A('vp', 'hd'), OUT = path.join(ROOT, 'orch', 'shots', 'extras');
fs.mkdirSync(OUT, { recursive: true });
const { server, origin, url } = await startServer();
const browser = await launch();
const errs = [], bugs = []; const bug = s => { bugs.push(s); console.log('  x ' + s); }, note = s => console.log('  ' + s);
const { ctx, page } = await openPage(browser, origin, VP, errs, { dpr: 1 });
const shot = async n => { try { await page.screenshot({ path: path.join(OUT, `${n}-${VP}.png`), timeout: 120000 }); } catch (e) { note('shot ' + n + ' skipped'); } };
await ctx.addInitScript(() => {
  window.__killcam = true;
  try { localStorage.setItem('ww3_touchGuide', '1'); } catch (e) {}
  window.SpeechRecognition = window.webkitSpeechRecognition = class { constructor() { window.__sr = this; } start() { this.started = true; } stop() { this.stopped = true; } };
});
const frames = (n, dt = 1 / 30) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { if (window.PHX && PHX.on) PHX.frame(dt); else if (KC.on) kcFrame(dt); else renderFrame(dt); } }, [n, dt]);
try {
  await toMenu(page, url);
  await page.evaluate(() => { setup.n = 1; setup.map = 'fulda'; setup.others = []; rollAis(); });
  await page.evaluate(() => $('start').click());
  await waitLoaded(page); await sleep(1500);
  await page.evaluate(() => {
    const cx = MAPW / 2, cy = MAPH / 2;
    const pick = T => { const R = roster(T.fac), out = []; for (const c in R) for (const k of R[c]) { const s = stats(T.fac, k); if (s.dom === 'ground' && !s.noAttack && s.dmg > 0 && s.cost <= 1600) out.push(k); } return out; };
    for (const T of G.teams) { const ks = pick(T), sg = T.id === ME ? -1 : 1; for (let i = 0; i < 40; i++) { const k = ks[i % ks.length]; addUnit(T.id, k, cx + sg * (110 + (i % 5) * 22), cy - 150 + Math.floor(i / 5) * 40); } }
    centerOn(cx, cy, true); QUAL.lock = true; QUAL.lv = 5; applyQual(); window.__orders = []; const o = doAct; window.doAct = a => { __orders.push(a); return o(a); };
  });
  await frames(3);

  // ---- voice: parser
  const parse = await page.evaluate(() => Object.fromEntries(['Attack!', 'fall back', 'retreat now', 'hold position', 'move here', 'select all tanks', 'select infantry', 'guard', 'capture the town', 'stop', 'hello there',
    'هجوم', 'تراجع', 'ثبات', 'حدد الدبابات', 'استولي على المدينة', 'حمله', 'عقب نشینی', 'انتخاب تانک ها', 'نگه دار'].map(t => [t, vcParse(t)])));
  note('parse ' + JSON.stringify(parse));
  const want = { 'Attack!': 'attack', 'fall back': 'retreat', 'retreat now': 'retreat', 'hold position': 'hold', 'move here': 'move', 'select all tanks': 'selTanks', 'select infantry': 'selInf', guard: 'guard', 'capture the town': 'capture', stop: 'stop', 'hello there': null,
    'هجوم': 'attack', 'تراجع': 'retreat', 'ثبات': 'hold', 'حدد الدبابات': 'selTanks', 'استولي على المدينة': 'capture', 'حمله': 'attack', 'عقب نشینی': 'retreat', 'انتخاب تانک ها': 'selTanks', 'نگه دار': 'hold' };
  for (const k in want) if (parse[k] !== want[k]) bug(`vcParse(${k}) = ${parse[k]}, wanted ${want[k]}`);

  // ---- voice: mic button end to end
  const mic = await page.evaluate(() => { vcInit; return null; }).catch(() => null);
  await sleep(900);
  const vis = await page.evaluate(() => !!$('vcBtn') && $('vcBtn').offsetParent !== null);
  if (!vis) bug('mic button not visible in battle');
  const say = async (text) => { await page.evaluate(() => { $('vcBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })); });
    await page.evaluate(t => { const r = __sr; const res = [{ transcript: t }]; res.isFinal = true; r.onresult({ resultIndex: 0, results: [res] }); }, text);
    await page.evaluate(() => { $('vcBtn').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); __sr.onend(); }); await sleep(100); };
  await say('select all tanks');
  const s1 = await page.evaluate(() => ({ n: G.sel.length, allTank: G.sel.every(u => u.s.cls === 'tank'), toast: $('vcToast').textContent }));
  note('select tanks -> ' + JSON.stringify(s1)); if (!s1.n || !s1.allTank) bug('select all tanks did not select tanks');
  await shot('voice-select');
  await page.evaluate(() => { __orders.length = 0; });
  await say('attack'); await frames(1);
  const o1 = await page.evaluate(() => ({ o: __orders.map(a => a.t + ':' + a.mode), toast: $('vcToast').textContent, left: G.sel.length }));
  note('attack -> ' + JSON.stringify(o1)); if (!o1.o.includes('go:amove')) bug('attack did not send an attack-move');
  await shot('voice-attack');
  await page.evaluate(() => { selectArmy(); __orders.length = 0; });
  for (const [t, ty] of [['retreat', 'ret'], ['hold', 'stance'], ['move here', 'go'], ['guard', 'def'], ['capture the town', null]]) { await page.evaluate(() => { selectArmy(); __orders.length = 0; }); await say(t); const r = await page.evaluate(() => __orders.map(a => a.t)); note(`${t} -> ${r.join(',')}`); if (ty && !r.includes(ty)) bug(`"${t}" did not send ${ty}`); if (!ty && !r.length) bug('capture sent nothing'); }
  await say('blah blah'); const nc = await page.evaluate(() => $('vcToast').textContent); if (!/Not a command/.test(nc)) bug('unknown phrase gave no feedback: ' + nc);
  // V key: hold = talk, tap = stance
  await page.evaluate(() => { selectArmy(); __sr = null; });
  await page.keyboard.down('v'); await sleep(400); const vk = await page.evaluate(() => ({ live: VC.on, sr: !!window.__sr })); await page.keyboard.up('v'); await sleep(100);
  if (!vk.live || !vk.sr) bug('holding V did not start listening'); else note('V hold ok');
  await page.evaluate(() => { __sr && __sr.onend && __sr.onend(); __orders.length = 0; });
  await page.keyboard.press('v'); await sleep(150); const tap = await page.evaluate(() => __orders.map(a => a.t)); if (!tap.includes('stance')) bug('quick V tap no longer cycles stance'); else note('V tap = stance ok');

  // ---- photo mode
  await page.evaluate(() => { G.sel = []; const c = G.ents.find(e => e.team === ME && !e.isB && !e.dead); centerOn(c.x, c.y, true); cam.dist = 260; });
  await frames(2);
  await page.keyboard.press('p'); await sleep(100);
  const p0 = await page.evaluate(() => ({ on: PHX.on, paused: G.paused, free: cam.free, hidden: getComputedStyle($('side')).visibility }));
  note('photo mode ' + JSON.stringify(p0)); if (!p0.on || !p0.paused) bug('P did not open photo mode');
  const t0 = await page.evaluate(() => G.t);
  await page.evaluate(() => { cam.ryaw = .9; cam.pitch = .38; cam.dist = 190; PHX.look = 1; PHX.dof = true; phLook(); });
  await frames(3); await shot('photo-warm-dof');
  await page.evaluate(() => { PHX.look = 2; PHX.dof = false; phLook(); }); await frames(2); await shot('photo-cold');
  await page.evaluate(() => { PHX.look = 1; PHX.dof = true; phLook(); $('phSave').click(); }); await frames(2); for (let i = 0; i < 40 && !(await page.evaluate(() => !!PHX.blob)); i++) await sleep(250);
  const pb = await page.evaluate(() => ({ blob: PHX.blob && PHX.blob.size, size: PHX.size, prev: $('phPrev').classList.contains('on') }));
  note('photo saved ' + JSON.stringify(pb)); if (!pb.blob) bug('photo not saved');
  const png = await page.evaluate(async () => { const r = await fetch($('phDl').href); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); });
  fs.writeFileSync(path.join(OUT, `photo-saved-${VP}.png`), Buffer.from(png, 'base64'));
  await shot('photo-ui');
  const t1 = await page.evaluate(() => G.t); if (Math.abs(t1 - t0) > 0.01) bug('game time moved during photo mode');
  await page.keyboard.press('Escape'); await sleep(100);
  const p1 = await page.evaluate(() => ({ on: PHX.on, paused: G.paused, free: cam.free, filter: cv.style.filter }));
  note('after exit ' + JSON.stringify(p1)); if (p1.on || p1.paused || p1.free) bug('photo mode did not restore the game');

  // ---- highlight clip
  for (let g = 0; g < 12; g++) await page.evaluate(() => { for (let i = 0; i < 120 && !G.over; i++) { for (const e of G.ents) if (!e.isB) { e.ox = e.x; e.oy = e.y; } simUpdate(1 / 60); kcRec(); if (i === 119) renderFrame(.1); } });
  await page.evaluate(() => { const foe = G.ents.filter(e => !ally(e.team, ME) && !e.dead); for (const e of foe) { e.hp = 0; try { kill(e, ME, null); } catch (x) { e.dead = true; } } for (let i = 0; i < 1800 && !G.over; i++) simUpdate(1 / 60); });
  const kc = await page.evaluate(() => ({ kc: KC.on, rec: !!CLIP.rec, ok: clipOK(), mime: clipMime() }));
  note('replay ' + JSON.stringify(kc)); if (!kc.kc) bug('replay did not start');
  if (kc.ok) {
    if (!kc.rec) bug('clip recorder did not start');
    for (let i = 0; i < 10 && (await page.evaluate(() => KC.on)); i++) { await page.evaluate(() => { for (let j = 0; j < 1 && KC.on; j++) kcFrame(1 / 30); }); await sleep(45); }
    await page.evaluate(() => { if (KC.on) kcSkip(); }); await page.evaluate(() => { if (KC.on) kcFrame(1 / 30); });
    for (let i = 0; i < 30 && !(await page.evaluate(() => !!CLIP.blob)); i++) await sleep(300);
    const cl = await page.evaluate(() => ({ blob: CLIP.blob && CLIP.blob.size, type: CLIP.blob && CLIP.blob.type, btn: $('xsClip') && $('xsClip').classList.contains('on') }));
    note('clip ' + JSON.stringify(cl)); if (!cl.blob) bug('no clip recorded'); else if (!cl.btn) bug('Save clip button not shown');
    await shot('clip-button');
  } else note('MediaRecorder unsupported in this browser: clip feature hides (ok)');
} catch (e) { bug('run aborted: ' + e.message.split('\n')[0]); }
await browser.close(); server.close();
console.log('\nBUGS:\n' + bugs.join('\n') + '\nERRORS:\n' + [...new Set(errs)].filter(e => !/Canvas2D|toNonIndexed/.test(e)).join('\n'));
console.log(bugs.length ? 'EXTRAS FAIL' : 'EXTRAS PASS');
