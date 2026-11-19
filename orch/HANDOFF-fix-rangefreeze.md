# HANDOFF fix-rangefreeze (2026-11-19)
Branch orch/fix-rangefreeze. Problem: gate/superfreeze (orch/rangefreeze.mjs) red on main eb208aa8 and 8cca2262 (stalls 300-1300 ms at waves ew/bmt/dtank/dsam/darty/drone, up to 5-11 s on a bad runner).

## Cause (found with branch-only probe runs `probe/rf/a`, workflow kept there; Chrome trace + GL counters)
1. Unit add-ons were rebuilt as brand-new geometry for every unit: the missile truck's big missile (`bm`, IR bmt), zu23/dshk guns (RS/OB aa, dsam, tank, dtank), mortar, mg, gun, crane, ammo-truck cargo; helicopters/airlifters built ~10 new rotor shapes + materials each (40 GPU buffers, 24 vertex arrays per heli). A wave of 6 = 18 buffers / 12 vertex arrays (240 / 144 for helis) created in ONE frame; every failing slow frame had exactly that signature (`buf 18, bufKB 55-60, vao 12`).
2. Trace of the slow frames: the main thread sat blocked in a synchronous GL call (`GLES2::GetString` -> `CommandBufferHelper::Finish`) for 0.9-2.8 s while the GPU process worked one huge task. That sync call was `perfGpu()` (08o-perflog.js), first called in the FIRST logged hitch of a battle, i.e. exactly when the GPU is behind. Any sync GL call after a burst of new buffers waits like this.
3. (Not fixed, noise) the machine itself stalls for seconds on a loaded runner (a 5 s and an 11 s frame with ~100 ms of JS); rangefreeze already retries a nation once. One shadow-depth program variant (`depth ... uv`, textured, front-face source) is still linked late in some runs (programs=1, allowed by PROGMAX=1); I did not find which model combination it is - next step if the gate is still flaky: print the full cache key (rangefreeze already prints SRC= material of a late link).

## Fix
- src/11-models.js: heli/airlift rotor disc, mast, blades, hub, tail blades/disc use shared unit-size geometry (`rotG`) scaled per unit + shared materials (`rotM`); `addonGeo` now `gcKeep`s its shapes and zu23, dshk, bm, mg, mortar, gun, crane, ammot add-ons use it (`addonGeo('x_...')`). Looks identical (same sizes, colours, positions).
- src/05-fx3d.js: `perfGpu()` is called at the end of the load warm-up (GPU idle), not in the first slow frame.
- orch/rangefreeze.mjs: UPS=1 (texture uploads by caller), TRACE also lists GC pauses, late-linked program prints the source material. No limit changed.
- orch/decisions.mjs: two guards (shared add-ons, GPU name at load).

## Numbers (local, 1x CPU, first spawn of 6 units)
heli 240 buffers -> 0; bmt 18 -> 0 (per-unit geometry gone: `EVAL` list empty for IR, RS); soldiers' kit variants still make 16-24 buffers the first time a new variant shows (by design, warm-up covers variants 1,2,5).
Gate: orch/cigate.sh on f7b9885: all green incl. superfreeze and decisions; migrate-down failed once on its known lobby timeout and passed on a failed-job re-run.

## Still open (honest)
After the fix 8 single-try probe runs of rangefreeze (no retry) still failed 4 times (300-3100 ms, programs 0, JS small). A Chrome trace of such a frame (probe/rf/b) shows the GPU process busy in `SkiaOutputSurfaceImplOnGpu::SwapBuffers` for ~500 ms: the software GL (SwiftShader) executes the frame's queued non-draw GL work (clears, post targets, uploads) at swap, and on a 2-vCPU runner with TurboFan/audio-decode worker tasks it spikes. The gate's own retry (TRIES=2) absorbs it most of the time. Probe branches: probe/rf/a (workflow + 8 runs), probe/rf/b, probe/rf/c (trace shows what runs at the same time as the long swap). Ideas if the gate is still flaky: decode the nation's voice sheets (09-audio.js voRLoad/vohLoad/vosLoad, annClip) during loading instead of at first use; find which late `depth ... uv` shadow variant links (programs=1).
