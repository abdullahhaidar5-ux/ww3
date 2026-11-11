# Handoff: maptrees (real-looking trees on the grand campaign map) — 2026-11-11 19:55 UTC

**State: GATED, READY FOR THE CONDUCTOR.** Commit `22ac8a8` on `orch/maptrees` (= main f80df29 merged in, rebuilt) passed ALL 28 gates on GitHub's runners
(branch `gate/22ac8a8349`, Actions run 43070538130; no failure at all, including `grandsmooth`, `smooth-pc`, `smooth-mp`, `grand` with the new "maptrees" guard, `decisions`, `check`).
Main has moved since (068b314): the conductor merges/rebuilds as usual (`index.html`, `grand.*.js`, `sw.js` conflicts -> rebuild; HISTORY keep both sides) and gates the batch.
The first gate run (b3aa92bf12) gave no verdict: GitHub's runners could not install their tools at that time (apt could not resolve security.ubuntu.com).

What changed (only `src/13e-grand3d.js` tree drawing + one guard + pictures):
- `g3ForestAtlas`: 4 kinds x 4 variants in ONE 512x512 texture (same pixel count as the old 1024x256). Variant 0 = one small tree (used where forest cover is thin = edges), 1-3 = small groves. Ragged noisy crowns, muted palette `G3F_PAL`, lit from the `G3L.sun` side, dark ground patch. Uploaded as a DataTexture so far-away trees get no dark rim.
- `g3ForestMesh`: same single instanced mesh, same `G3F_MAX`; shader picks the variant from the spare `iD.w`; smaller tree sizes; gain `G3F_GAIN`. No extra texture reads or draw calls.
- `g3ForestTick`: zoom growth capped at 1.6x (was 3.2x); colour by climate (temperate / cold / tropical / dry) stored per tree at planting in the integer part of pool slot 6.
- Placement rules (`g3ForestCover`) untouched. Desert rule untouched.
- Guard: `orch/grandtest.mjs` "maptrees" (uses `g3TreeLook()`): fails on lime/neon tree pictures, fewer than 3 variants, zoom growth above 1.7x, or a raised tree budget.
- Pictures: `orch/concepts/trees/` (before/after of 5 views), made with `node orch/maptreeshots.mjs <prefix> [view]`.

Tests ran on GitHub's runners only (the sandbox is too slow); `python3 orch/build.py --check` passes locally.
Ideas left: firs could be a touch lighter still; palms are small at mid zoom on the Gulf rivers.
