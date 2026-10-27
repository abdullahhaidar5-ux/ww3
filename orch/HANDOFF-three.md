# Handoff: Three.js r128 -> r186 upgrade (Graphics overhaul Phase 1, last piece)

Branch `orch/three-upgrade` (from origin/main 788029a, origin/main merged in at 462b34c, helper branch
`orch/three-upgrade-fx` merged at 100d652). Merged LAST, after the other side lanes. Not shipped.

## Version and how the library is built

- **three.js 0.186.1 (r186)**, released 2026-09-24, on cdnjs (cdnjs only has ES modules for it: `three.module.js` +
  `three.core.js`; no UMD `three.min.js` since r160, and GLTFLoader/SkeletonUtils are not on cdnjs at all).
- Bundled at build time into one classic script that sets `window.THREE` (+ `THREE.GLTFLoader`, `THREE.SkeletonUtils`
  namespace with `clone`): `orch/three/` = `package.json` (three 0.186.1, esbuild 0.25.10 pinned) + `entry.js` +
  `vendor.mjs`. Run: `cd orch/three && npm ci && node vendor.mjs`, then `python3 orch/build.py`. vendor.mjs swaps the
  vendored Three block(s) in `index.html` (it replaced r128 + GLTFLoader + SkeletonUtils, 3 blocks -> 1, 712 -> 773 KB).
  The bundle starts with a license comment containing `Three.js Authors` and `WW3_THREE="0.186.1"` (build.py and the
  test harness find it by those). `orch/three/node_modules/` is gitignored. No runtime host added.
- **Artifact edition:** no more cdnjs script; the bundle stays inline like on Pages (`build.py --artifact` now refuses
  any external script; page ~1.74 MB). `smoke.mjs --artifact` checks THREE.REVISION against the bundle's marker.
  ARTIFACT.md and CLAUDE.md updated.

## Done (src)

- `04-gfx`: `THREE.ColorManagement.enabled=false` (hex colours used as before; code already linearises with `lin()`);
  `outputColorSpace=SRGBColorSpace`; `LUX=Math.PI` multiplies every light intensity (sun, hemisphere, point lights in
  04/05/06; r155+ dropped the hidden PI); `legacyFalloff()` patches `ShaderChunk.lights_pars_begin`
  `getDistanceAttenuation` back to r128's `(1-d/cutoff)^decay` (point-light glows); PCFSoftShadowMap is gone -> PCF
  everywhere (5 filtered taps over `shadow.radius`, so desktop now honours the per-weather radius `w.sr`); terrain
  hook `vUv` -> `vMapUv`; `.encoding` -> `.colorSpace`.
- `06-view`: flicker point light x LUX.
- `11-models`: GLTFLoader plugin `SpecGloss` (KHR_materials_pbrSpecularGlossiness was dropped after r128; the Apache
  `m_apache` uses it) -> standard material, roughness from glossiness as `plainStd()` did; transmission (F-16 canopy)
  -> plain opacity (real transmission renders the scene twice per frame); removed `skinning:` material param; flag
  texture colorSpace.
- `05-fx3d`/`10-post` (helper, merged): `updateRange` -> `clearUpdateRanges/addUpdateRange`; MSAA post target via
  `samples` on WebGLRenderTarget; `isWebGL2` gone.

## Gate so far

CI gate (`orch/cigate.sh`) on 462b34c (before the helper merge, same rendering): check, smoke4, mpsync, mpsync-server,
art-smoke, art-mpsync, headless, servertest PASS; migrate x3 FAIL **but they fail the same way on main (ce80b7b)**
= pre-existing, not this branch. mapsweep result was still pending. Re-run `orch/cigate.sh` on 100d652+.

## Left to do

1. **Before/after screenshots + perf.** Harness `orch/three/compare.mjs` (`--html <r128 index.html> --tag before`,
   then `--tag after`, then `--sheet` -> `orch/shots/three-upgrade/` side-by-side PNGs + contact sheet; perf.json with
   desktop 1280x720 close-up/overview and phone 390x844 x3 + 4x CPU throttle frame times). Untested end-to-end yet.
   A throwaway CI run is in progress: branch `three-compare/1` (= 462b34c + `.github/workflows/three-compare.yml` +
   `orch/three/before.html`; NOT for merge), run 40601111971, artifacts `three-a` / `three-b` downloadable with
   `gh api repos/abdullahhaidar5-ux/ww3/actions/runs/40601111971/artifacts` -> `archive_download_url`. Look at them,
   copy pairs/sheets into `orch/shots/three-upgrade/`, commit. If broken, fix compare.mjs and push `three-compare/2`.
2. Look hard at the screenshots: shadow softness/noise (new PCF uses interleaved-gradient noise; the post pass
   sharpens), point-light flashes, Apache paint, F-16 canopy, PMREM env reflections, overall exposure. Calibrate if off.
3. Watch the console for r186 warnings (e.g. unknown material params, `extensions.derivatives`).
4. Full gate via `orch/cigate.sh`, merge origin/main again, final report.

## Gotchas

- `THREE.ColorManagement.enabled=false` must run before any `THREE.Color` is made (top of 04-gfx; 01-03 don't use THREE).
- InstancedMesh in r186 computes its bounding sphere from all instances on first render: instances must be placed
  before the first frame (they are today); trees/rocks that used to pop out at the map origin now cull correctly.
- Possible later improvements (not done): real sRGB colour pipeline + ACES/AgX tone mapping in place of the hand-made
  post grade; physical light units; tree-shaking the bundle (named imports, maybe -200 KB for phones); per-weather
  shadow radius tuning on desktop.
- Local browser runs queue for hours on the shared box; use the CI runners.
