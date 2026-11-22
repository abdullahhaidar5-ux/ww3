// Opens the Godot web export (godot-build/web, made by tools-godot/export_web.sh) in headless Chromium and prints the
// page's BRIDGETEST / BATTLE console lines.
//   node tools-godot/web_test.mjs "bridge-test&minutes=10&bench" [--secs 600] [--shot out.png]
//   node tools-godot/web_test.mjs "battle-ai&fac=IR&vs=US" --secs 60 --shot orch/shots/godot-bridge/battle.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIR = path.resolve('godot-build/web'), q = process.argv[2] || 'bridge-test';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const secs = +arg('secs', 600), shot = arg('shot', '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' };
const srv = http.createServer((rq, rs) => { const f = path.join(DIR, decodeURIComponent(rq.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rs.end(d); }); });
await new Promise(r => srv.listen(0, r));
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
let done = false, errs = 0;
pg.on('console', m => { const t = m.text(); if (/BRIDGETEST|BATTLE|SCRIPT ERROR|ERROR:/.test(t) || m.type() === 'error') { console.log(t.slice(0, 400)); if (/ERROR/.test(t) || m.type() === 'error') errs++; } if (/BRIDGETEST DONE|BRIDGETEST FAIL|BATTLE-AI RESULT|time cap reached/.test(t)) done = true; });
pg.on('pageerror', e => { console.log('PAGE ERROR ' + String(e).slice(0, 400)); errs++; });
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?${q}`);
const t0 = Date.now();
while (!done && Date.now() - t0 < secs * 1000) await pg.waitForTimeout(500);
if (shot) { fs.mkdirSync(path.dirname(shot), { recursive: true }); await pg.screenshot({ path: shot, timeout: 240000 }); console.log('shot ' + shot); }
console.log(`web_test: ${done ? 'finished' : 'stopped at the time limit'} after ${Math.round((Date.now() - t0) / 1000)} s, ${errs} error lines`);
await br.close(); srv.close();
