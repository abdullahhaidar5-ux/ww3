// Dump the materials of a unit's 3D model in a given build (r128 vs r186 debugging).
//   node orch/three/matprobe.mjs <repoRoot> [kind=heli] [nation=US]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const [ROOT, KIND = 'heli', FAC = 'US'] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('/opt/npm-tools/node_modules/playwright');
const server = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (p === '/sw.js' || !f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const U = `http://127.0.0.1:${server.address().port}/index.html`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
await pg.route('**/*', r => r.request().url().startsWith(U.replace('/index.html', '')) ? r.continue() : r.abort());
await pg.goto(U, { waitUntil: 'load', timeout: 180000 });
await pg.waitForFunction(() => typeof startSingle === 'function', null, { timeout: 120000 });
const out = await pg.evaluate(async ([K, F]) => { window.__stopLoop = true; try { AU.musicOn = AU.sfxOn = AU.voiceOn = false; } catch (e) {}
  Object.assign(setup, { map: 'golan', n: 1, p: F, a: 'RU', others: [], tm: [], slot: -1, seed: 5 }); startSingle();
  const w0 = performance.now(); while (window.LOADING && performance.now() - w0 < 600000) await new Promise(r => setTimeout(r, 100));
  G.paused = true; const [bx, by] = BASES[0]; const u = addUnit(0, K, bx + 200, by); u.ox = u.x; u.oy = u.y; for (let i = 0; i < 3; i++) renderFrame(1 / 60);
  const res = []; const seen = new Set();
  const root = OBJ.get(u.id); if (!root) return { err: 'no object' }; root.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (seen.has(m)) continue; seen.add(m);
      const tx = t => t ? (t.colorSpace || t.encoding) + (t.channel != null ? ' ch' + t.channel : '') : null;
      res.push({ mesh: o.name, type: m.type, name: m.name, color: m.color && m.color.getHexString(), rough: m.roughness, metal: m.metalness, op: m.opacity, tr: m.transparent, map: tx(m.map), ao: tx(m.aoMap), aoI: m.aoMapIntensity, nrm: tx(m.normalMap), ns: m.normalScale && [m.normalScale.x, m.normalScale.y], rmap: tx(m.roughnessMap), mmap: tx(m.metalnessMap), env: !!m.envMap, emis: m.emissive && m.emissive.getHexString(), vis: m.visible, spec: m.specularIntensity, uvs: Object.keys(o.geometry.attributes).join(',') }); } });
  return { rev: THREE.REVISION, n: res.length, res: res.slice(0, 12), ud: Object.keys(u) .length }; }, [KIND, FAC]);
console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{'));
const OUTD = process.env.PROBE_OUT; if (OUTD) { fs.mkdirSync(OUTD, { recursive: true });
  // fixed camera, no animation (dt 0): one picture with the unit hidden (background), then one per material variant
  const V = { hidden: 'root.visible=false', asis: '', noao: 'm.aoMapIntensity=0', flipy: 'if(m.normalScale)m.normalScale.y*=-1', rough6: 'm.roughness=Math.max(m.roughness,.6)', notan: 'o.geometry.deleteAttribute("tangent")', metal0: 'm.metalness=0' };
  for (const [k, f] of Object.entries(V)) {
    await pg.evaluate(`(()=>{const u=G.ents[G.ents.length-1];const root=OBJ.get(u.id);
      if(!window.__orig){window.__orig=[];root.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))window.__orig.push({o,m,s:{ao:m.aoMapIntensity,ns:m.normalScale&&m.normalScale.clone(),r:m.roughness,mt:m.metalness},t:o.geometry.attributes.tangent});});}
      root.visible=true;for(const q of window.__orig){const m=q.m;m.aoMapIntensity=q.s.ao;if(q.s.ns)m.normalScale.copy(q.s.ns);m.roughness=q.s.r;m.metalness=q.s.mt;if(q.t)q.o.geometry.setAttribute('tangent',q.t);m.needsUpdate=true;}
      for(const q of window.__orig){const m=q.m,o=q.o;${f};m.needsUpdate=true;}
      cam.dist=cam.td=150;cam.x=cam.tx=u.x;cam.y=cam.ty=u.y-75;cam._xl=cam.x;cam._yl=cam.y;cam._dl=cam.dist;for(let i=0;i<3;i++)renderFrame(0);})()`);
    await pg.screenshot({ path: path.join(OUTD, k + '.png'), timeout: 300000 }); }
}
await b.close(); server.close();
