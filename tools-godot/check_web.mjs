// Web part of tools-godot/check.sh: opens the web export (godot-build/web, made by tools-godot/export_web.sh) in
// headless Chromium and checks (1) the page loads and the main menu appears, (2) ?battle-ai&fac=IR&vs=US runs
// SECS game-seconds on the JS-sim bridge - both with 0 console errors. Screenshots: orch/shots/check/menu.png, battle.png.
//   node tools-godot/check_web.mjs [--secs 60] [--limit 900]      (prints PASS / FAIL lines and timings, exit 0 / 1)
//   node tools-godot/check_web.mjs --maps bm_a,bm_b:ffa,bm_c      on demand (KAIZEN 2): only the map test - an AI battle on each
//     map key (":ffa" = 4 players on a 4+ player map): the sim's map is the one asked for, every side alive after SECS
//     game-seconds, 0 console errors; then an unknown key must give an error message. Shot of the first: map-other.png
// The build is served at /godot/ under the repo root, so the sound files (vo/ sfx/ mus/) sit one folder above it,
// the same layout as the live site (orch/HANDOFF-gport-p5.md). thread_support=false: no COOP/COEP headers needed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BUILD = path.join(ROOT, 'godot-build/web'), SHOTS = path.join(ROOT, 'orch/shots/check');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SECS = +arg('secs', 60), LIMIT = +arg('limit', 900) * 1000;
const MAPS = arg('maps', '') ? arg('maps', '').split(',') : null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.opus': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((rq, rs) => {
  let u = decodeURIComponent(rq.url.split('?')[0]);
  if (u === '/' || u === '/godot' || u === '/godot/') u = '/godot/index.html';
  let f = u.startsWith('/godot/') ? path.join(BUILD, u.slice(7)) : path.join(ROOT, u);
  // on the live site index.html sits at the site root next to vo/ mus/ sfx/ models/ art/: serve those beside the build too
  if (u.startsWith('/godot/') && !fs.existsSync(f) && /^\/godot\/(vo|mus|sfx|models|art)\//.test(u)) f = path.join(ROOT, u.slice(7));
  if (!f.startsWith(ROOT)) { rs.writeHead(403); rs.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); rs.end(d); });
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/godot/index.html`;
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0;
const line = (ok, name, extra) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) fail++; };

async function open(q, until, budget) {
  const pg = await br.newPage({ viewport: { width: 1536, height: 790 } });
  const errs = [], log = [];
  pg.on('console', m => { const t = m.text(); log.push(t); if (m.type() === 'error' || /SCRIPT ERROR|^ERROR:|USER ERROR/.test(t)) errs.push(t.slice(0, 300)); });
  pg.on('pageerror', e => errs.push('PAGE ERROR ' + String(e).slice(0, 300)));
  pg.on('requestfailed', r => errs.push('REQUEST FAILED ' + r.url().replace(base, '')));
  const t0 = Date.now();
  await pg.goto(base + (q ? '?' + q : ''));
  let hit = null;
  while (!hit && Date.now() - t0 < budget && errs.length === 0) { hit = log.find(t => until.test(t)) || null; if (!hit) await pg.waitForTimeout(250); }
  return { pg, errs, log, hit, ms: Date.now() - t0 };
}

if (MAPS) {
  const want = Math.max(1, Math.round(SECS / 60));
  const until = { test: t => { const m = /^min +(\d+) /.exec(t); return !!m && +m[1] >= want; } };
  for (const [i, spec] of MAPS.entries()) {
    const [mk, mode] = spec.split(':');
    const r = await open(`battle-ai&fac=IR&vs=US&map=${mk}&mode=${mode || '1v1'}&seed=1&shot-t=${SECS + 5}&ff=150`, until, LIMIT);
    const got = r.log.find(t => /^BATTLE map: /.test(t)) || '';
    if (i === 0) { await r.pg.waitForTimeout(1500); await r.pg.screenshot({ path: path.join(SHOTS, 'map-other.png'), timeout: 240000 }); }
    const sides = r.hit ? [...r.hit.matchAll(/(\w+) (\d+)u (\d+)b /g)] : [];
    line(got.startsWith(`BATTLE map: ${mk} `), `${mk}: the sim's map is the one asked for`, got.slice(12, 100));
    line(sides.length >= (mode === 'ffa' ? 4 : 2) && sides.every(m => +m[2] > 0 && +m[3] > 0), `${mk}: every side alive after ${SECS} game-seconds`, sides.map(m => `${m[1]} ${m[2]}u ${m[3]}b`).join(', '));
    line(!!r.hit && r.errs.length === 0, `${mk}: 0 console errors`, `${(r.ms / 1000).toFixed(1)} s wall, ${r.errs.length} errors`);
    for (const e of r.errs.slice(0, 6)) console.log('   ' + e);
    await r.pg.close();
  }
  { // an unknown key is an error message, never another map
    const pg = await br.newPage({ viewport: { width: 1536, height: 790 } }); const log = [];
    pg.on('console', m => log.push(m.text()));
    await pg.goto(base + '?battle-ai&fac=IR&vs=US&map=no_such_map');
    const t0 = Date.now(); let hit = null;
    while (!hit && Date.now() - t0 < 120000) { hit = log.find(t => /^BATTLE: Unknown map/.test(t)) || null; if (!hit) await pg.waitForTimeout(250); }
    line(!!hit && !log.some(t => /^BATTLE (start|map)/.test(t)), 'unknown map key: error message, no battle', hit ? hit.slice(8, 100) : '');
    await pg.close();
  }
  await br.close(); srv.close();
  process.exit(fail ? 1 : 0);
}
// 1. the page loads and the main menu appears
{
  const r = await open('', /^MENU ready/, 180000);
  if (r.hit) await r.pg.waitForTimeout(3000);   // the menu fades in
  await r.pg.screenshot({ path: path.join(SHOTS, 'menu.png') });
  const boot = r.log.find(t => /^Godot Engine v/.test(t));
  line(!!boot, 'web page loads (Godot engine starts)', boot ? boot.slice(0, 40) : '');
  line(!!r.hit && r.errs.length === 0, 'main menu appears', `${(r.ms / 1000).toFixed(1)} s, ${r.errs.length} console errors`);
  for (const e of r.errs.slice(0, 5)) console.log('   ' + e);
  await r.pg.close();
}
// 2. AI vs AI battle on the JS-sim bridge, SECS game-seconds
{
  // ff=150 + shot-t: the worker sim is asked for 150 ticks (5 game-seconds) per call up to that game time, so the
  // battle does not wait on drawn frames (software GL here draws well under 1 frame a second in a battle)
  const want = Math.max(1, Math.round(SECS / 60));
  const until = { test: t => { const m = /^min +(\d+) /.exec(t); return !!m && +m[1] >= want; } };
  const r = await open(`battle-ai&fac=IR&vs=US&seed=1&shot-t=${SECS + 5}&ff=150`, until, LIMIT);
  const start = r.log.find(t => /^BATTLE start/.test(t));
  await r.pg.waitForTimeout(1500);
  await r.pg.screenshot({ path: path.join(SHOTS, 'battle.png'), timeout: 240000 });
  line(!!start, 'battle starts on the JS sim (Web Worker)', start ? start.slice(0, 90) : '');
  const sides = r.hit ? [...r.hit.matchAll(/(\w+) (\d+)u (\d+)b /g)] : [];
  line(sides.length >= 2 && sides.every(m => +m[2] > 0 && +m[3] > 0), 'both sides still have units and buildings', sides.map(m => `${m[1]} ${m[2]} units ${m[3]} buildings`).join(', '));
  line(!!r.hit && r.errs.length === 0, `battle runs ${SECS} game-seconds`, `${(r.ms / 1000).toFixed(1)} s wall, ${r.errs.length} console errors${r.hit ? ', ' + r.hit.replace(/\s+/g, ' ').slice(0, 90) : ''}`);
  for (const e of r.errs.slice(0, 8)) console.log('   ' + e);
  await r.pg.close();
}
await br.close(); srv.close();
console.log('screenshots: orch/shots/check/menu.png, orch/shots/check/battle.png');
process.exit(fail ? 1 : 0);
