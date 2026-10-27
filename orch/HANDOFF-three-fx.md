# Handoff: Three.js r186 port of effects (05-fx3d) and post-processing (10-post)

Branch `orch/three-upgrade-fx`, made from `origin/orch/three-upgrade` (r186 vendored + 04/06/11 ported by the other
agent), with `origin/main` merged in. Never push to `main` or `orch/three-upgrade`; the other agent merges this branch.

## Done (commit 2511d84, merged with main in 0514cd9)
- **Particles and tracers drew nothing on r186.** `BufferAttribute.updateRange` no longer exists (removed after r159),
  so `fxUpdate` threw every frame and the rest of the frame (post-processing, HUD) never ran. Now `fxUpd()` uses
  `clearUpdateRanges()/addUpdateRange()` (falls back to `updateRange` on old Three), still uploading only the live part.
- **Edge smoothing (MSAA) in post-processing was silently off.** `WebGLMultisampleRenderTarget` is gone (r138+) and
  `capabilities.isWebGL2` is gone (r163+, WebGL2 only). Now `new WebGLRenderTarget(w,h,{samples})`, same sample counts
  as before (phones 4/2/0 by detail level, PC 4).
- Dropped the obsolete `extensions:{derivatives:true}` on the AO shader (built into WebGL2).
- `orch/three/fxshots.mjs`: deterministic FX captures (seeded Math.random, sim paused, frames stepped by hand):
  explosions (big/medium/small), smoke screen, tracer burst, muzzle flash, day + dusk, plus `--perf --mobile`
  (390x844, 4x CPU throttle, median/p90 renderFrame+gl.finish ms).

## Audited, needs no change (because of the other agent's step 2 decisions)
- Colours: `ColorManagement.enabled=false` in 04-gfx, so every hex colour in 05 (shock rings, strike rings, rain,
  debris chunks, light colours) keeps its r128 value. If colour management is ever turned on, these need raw values
  (`new THREE.Color().setRGB(r/255,g/255,b/255, THREE.LinearSRGBColorSpace)`), and so do PINGS (06-view/08-ui).
- Lights: the other agent multiplies point-light intensities by `LUX` (=PI) and patches `getDistanceAttenuation`
  back to r128's `(1-d/range)^decay`, so explosion / muzzle / wreck-fire lights are unchanged. (Without that patch, a
  fit that matches r128 within ~10%: decay .5, distance x0.83, intensity x PI x 0.262 x sqrt(range).)
- burntMat `onBeforeCompile`: chunks `<common> <project_vertex> <color_fragment> <emissivemap_fragment>` and
  `totalEmissiveRadiance` all still exist in r186 meshphysical. Wake shader fog chunks (`fog_pars_vertex`,
  `fog_vertex` needs `mvPosition`, `fog_fragment`) still match.
- Custom ShaderMaterials (particles, wake, post passes) use `texture2D`/`gl_FragColor`: Three still converts these to
  GLSL3 for ShaderMaterial. They write their own colour (particles do `pow(c,2.2)`; final pass does `pow(1/2.2)`), and
  Three adds no output conversion to custom shaders, so the look is unchanged. Render targets default to linear
  (NoColorSpace), as r128 did. All geometries were already BufferGeometry in r128.

## Left / next steps
1. **Before/after screenshots not taken yet.** The machine was overloaded (browser lock queue). On the new machine:
   `git worktree add /tmp/before origin/main` (r128), then
   `node orch/three/fxshots.mjs /tmp/before orch/shots/three-upgrade/fx before` and
   `node orch/three/fxshots.mjs . orch/shots/three-upgrade/fx after`, plus the same with `--perf --mobile` (tags
   `before-m`/`after-m`, prints a `PERF` line). Commit a few PNGs under `orch/shots/three-upgrade/fx/`.
   Compare: explosion fireball/flash, smoke density and colour, tracer streaks, dusk glow on the ground, bloom, AO,
   vignette/grain. Expect MSAA edges to look *smoother* than upstream step 2 (it was off there), same as r128.
2. **CI gate** (`orch/cigate.sh HEAD`) on 0514cd9: partial results when stopped: check, controls, touch, cfclient,
   mpsync, migrate-abrupt PASS; **migrate-down FAIL** (not yet investigated; host-migration test, probably unrelated
   to rendering: compare with the same test on origin/main / orch/three-upgrade before chasing it). Other 9 pending.
3. Merge `origin/orch/three-upgrade` again whenever it moves (05-fx3d.js there only has the LUX edits; this branch's
   edits are on other lines, so merges should be clean), rebuild (`python3 orch/build.py`), re-gate.
4. Watch the console in a real battle for r186 deprecation warnings from effects (none expected).

## Gotchas
- Gate with `orch/cigate.sh` (GitHub runners), not local browser runs; local browser tests queue behind a
  machine-wide lock (`/tmp/ww3-browser-gate.lock`).
- `index.html` is build output: edit `src/`, run `python3 orch/build.py`, commit both.
- The sim must never depend on rendering; nothing here touches 03-sim or the random stream of the battle.
