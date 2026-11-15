// Contact sheet of the command-bar cameos (src/08q-cameos.js) for IR RS US RU -> orch/shots/cameos.jpg.  node orch/cameos-sheet.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const m = fs.readFileSync(path.join(ROOT, 'src/11-models.js'), 'utf8').split('\n').slice(63, 68).join('\n');
const code = fs.readFileSync(path.join(ROOT, 'src/08q-cameos.js'), 'utf8');
const U = ['inf','at','sniper','eng','medic','manpad','mortar','officer','dozer','truck','ammo','jeep','apc','atgmv','tank','gun','mlrs','spaa','samv','ew','radarv','heli','lift','jet','delta','male','quad','boat','fast','ship','sub'];
const B = ['hq','barracks','factory','airfield','shipyard','gen','depot','turret','sam','coast','uplink','tunnel','fort','radio','oil','house'];
const NAT = [['IR','#d0453a'],['RS','#e3b341'],['US','#3a7bd5'],['RU','#8a5cc2']];
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1900, height: 1000 } });
await p.setContent('<body style="margin:0;background:#111"><canvas id=c></canvas></body>');
const r = await p.evaluate(({ m, code, U, B, NAT }) => {
  (0, eval)(m + ';window.solX=solX;'); (0, eval)(code + ';window.CAMEO=CAMEO;');
  const w = 144, h = 112, cols = 16, rows = NAT.length * (Math.ceil(U.length / cols) + Math.ceil(B.length / cols));
  const cv = document.getElementById('c'); cv.width = w * cols; cv.height = h * rows; const x = cv.getContext('2d'); let row = 0, errs = [];
  for (const [f, col] of NAT) for (const [L, fn] of [[U, 'unit'], [B, 'bld']]) {
    L.forEach((k, i) => { x.save(); x.translate((i % cols) * w, (row + Math.floor(i / cols)) * h); x.beginPath(); x.rect(0, 0, w, h); x.clip(); try { CAMEO[fn](x, k, w, h, { fac: f, col, bg: true }); } catch (e) { errs.push(f + k + e.message); } x.restore(); });
    row += Math.ceil(L.length / cols);
  }
  return { errs, w: cv.width, h: cv.height };
}, { m, code, U, B, NAT });
console.log(JSON.stringify(r.errs));
await (await p.$('#c')).screenshot({ path: path.join(ROOT, 'orch/shots/cameos.jpg'), type: 'jpeg', quality: 85 });
await b.close();
