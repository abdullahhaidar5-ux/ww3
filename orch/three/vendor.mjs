// Vendors Three.js into index.html: bundles three + GLTFLoader + SkeletonUtils (orch/three/entry.js) into one minified
// classic script with esbuild and swaps it in for the vendored Three.js <script> block(s) in index.html's shell.
// Build-time only; nothing here is loaded by the game at runtime and no other host is contacted by players.
//
//   cd orch/three && npm ci && node vendor.mjs      # then: python3 orch/build.py --check
//
// The versions are pinned in orch/three/package.json. To upgrade: bump "three" there, npm install, rerun this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const HTML = path.join(ROOT, 'index.html');
const req = createRequire(import.meta.url);
const esbuild = req('esbuild');
const ver = JSON.parse(fs.readFileSync(path.join(DIR, 'node_modules', 'three', 'package.json'), 'utf8')).version;
const r = await esbuild.build({ entryPoints: [path.join(DIR, 'entry.js')], bundle: true, format: 'iife', minify: true,
  legalComments: 'none', target: 'es2020', write: false, logLevel: 'warning' });
let js = r.outputFiles[0].text.trim();
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
// First line: the marker build.py / artifact-harness.mjs look for ("Three.js Authors" near the top, and the version).
const banner = `/**\n * @license\n * Copyright 2010-2025 Three.js Authors\n * SPDX-License-Identifier: MIT\n * three.js ${ver} + GLTFLoader + SkeletonUtils, bundled by orch/three/vendor.mjs (WW3_THREE="${ver}")\n */\n`;
const block = '<script>' + banner + js + '</script>';

let html = fs.readFileSync(HTML, 'utf8');
// every vendored Three.js block in the shell: the core (license header), and the r128-era GLTFLoader/SkeletonUtils add-ons
const blocks = [];
for (let k = 0; ;) {
  const a = html.indexOf('<script>', k); if (a < 0) break;
  const e = html.indexOf('</script>', a); const body = html.slice(a + 8, e);
  if (body.slice(0, 300).includes('Three.js Authors') || /^\s*\(\s*function\s*\(\)\s*\{\s*class (GLTFLoader|SkeletonUtils)\b/.test(body))
    blocks.push([a, e + 9]);
  k = e + 9;
}
if (!blocks.length) { console.error('vendor: no vendored Three.js <script> found in index.html'); process.exit(1); }
for (let i = 1; i < blocks.length; i++) {
  const between = html.slice(blocks[i - 1][1], blocks[i][0]);
  if (between.trim()) { console.error('vendor: Three.js blocks are not adjacent in index.html: ' + between.slice(0, 80)); process.exit(1); }
}
const out = html.slice(0, blocks[0][0]) + block + html.slice(blocks[blocks.length - 1][1]);
fs.writeFileSync(HTML, out);
console.log(`vendored three.js ${ver} (+GLTFLoader, SkeletonUtils): ${blocks.length} block(s) replaced, ${(block.length / 1024).toFixed(0)} KB; index.html ${(html.length / 1e6).toFixed(2)} -> ${(out.length / 1e6).toFixed(2)} MB`);
