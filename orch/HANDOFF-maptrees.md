# Handoff: maptrees (real-looking trees on the grand campaign map) — 2026-11-11 16:05 UTC

**State: work done and pushed on `orch/maptrees`; NOT gated yet.** The one gate run (commit `b3aa92bf12`, branch `gate/b3aa92bf12`, Actions run 43044791991)
gave no test verdict: every job that got a runner died in the "Tools" setup step because GitHub's runners could not resolve `security.ubuntu.com`
(apt cannot install the browser's fonts). No test ran, so nothing is known good or bad from CI. Not caused by this change.

Next step (anyone, or this helper's follow-up): when GitHub's runners can install tools again, run `orch/cigate.sh b3aa92bf12` once more (or re-run the failed jobs of run 43044791991).
Land only if no gate fails beyond main's known red ones (main ac59908: `cfclient`, `tutorial`). Watch `gate/grandsmooth`, `gate/grand` (new "maptrees" guard line), `gate/decisions`, `gate/check`.
This is a look change: per CLAUDE.md it also waits until `gate/smooth-mp` is green on main. Do not land it ungated.

What changed (only `src/13e-grand3d.js` tree drawing + one guard + pictures):
- `g3ForestAtlas`: 4 kinds x 4 variants in ONE 512x512 texture (same pixel count as the old 1024x256). Variant 0 = one small tree (used where forest cover is thin = edges), 1-3 = small groves. Ragged noisy crowns, muted palette `G3F_PAL`, lit from the `G3L.sun` side, dark ground patch. Uploaded as a DataTexture so far-away trees get no dark rim.
- `g3ForestMesh`: same single instanced mesh, same `G3F_MAX`; shader picks the variant from the spare `iD.w`; smaller tree sizes; gain `G3F_GAIN`. No extra texture reads or draw calls.
- `g3ForestTick`: zoom growth capped at 1.6x (was 3.2x); colour by climate (temperate / cold / tropical / dry) stored per tree at planting in the integer part of pool slot 6.
- Placement rules (`g3ForestCover`) untouched. Desert rule untouched.
- Guard: `orch/grandtest.mjs` "maptrees" (uses `g3TreeLook()`): fails on lime/neon tree pictures, fewer than 3 variants, zoom growth above 1.7x, or a raised tree budget.
- Pictures: `orch/concepts/trees/` (before/after of 5 views), made with `node orch/maptreeshots.mjs <prefix> [view]`.

Not verified locally: `orch/decisions.mjs` timed out in the sandbox (too slow, 580 s); `orch/grandtest.mjs` and the smooth gates were not run locally (rule). `python3 orch/build.py --check` passes.
Ideas left: firs could be a touch lighter still; palms are small at mid zoom on the Gulf rivers.
