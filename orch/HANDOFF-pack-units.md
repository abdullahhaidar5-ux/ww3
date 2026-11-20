# HANDOFF pack-units (2026-11-20)

## Done
- Item 1, unit limit 500 (<=4 players) / 300 (5-8): ALREADY on main (d7fbc49), DECISIONS line + guard in orch/decisions.mjs present, and `servers-live` (b3f11e6, "unit limit 500 for 1v1/2v2") already contains it. Nothing left.

## Not landed (nothing half-done on main)
- Item 2, soldiers up close: branch `orch/pack-units` holds ONE experiment, NOT landed because it is not proven: in `src/11-models.js` (`mergeSoldier`, the `solgear` map_fragment hook) a close-range cloth weave + fold-contrast term, faded out by `fwidth(uv)` so battle distance is unchanged (no new textures/draws). Before/after at normal zoom are near-identical (orch/shots/closeup-before|closeup-after/inf-golan-IR-IL.png, 3 min each on swiftshader). A true close-up could not be shot: `--idist 70` made the camera clip into the ground/leg (harness limit), so the visible gain is unverified.

## Left
- Find a camera setting (or a test hook) that frames one soldier at ~15-25 m; judge the weave (frequency 1900 may moiré/look noisy - tune `.0012/.006` fade).
- Real gains need gear geometry (chest rig, pouches, radio, backpack) via the glb pipeline (`build.py --add-model`) or shared-atlas vertex-colour parts in `mergeSoldier`; IR first, RS, DW, RV next. Keep the SOLB instanced path; run `orch/cigate.sh` (smooth-pc / smooth-mp) before landing.

## ONE 2-minute thing for Abdullah (once landed)
On PC, zoom the camera right down on an Iranian rifle squad in a Battle and tell me whether the uniform cloth now looks woven/less flat.

## Update (2026-11-20 04:05 UTC, restart run)
- Jacket camo NOT built. Reason: nation tint is baked per look in `mergeSoldier` (vertex colours, one material per soldier shape in SOLB batches), so a per-nation camo pattern needs a per-look uniform/attribute through `solbPatch`, and every check is a ~3 min swiftshader render with no close-up camera (gfxinf `--idist` <100 clips into the ground). Judged too risky to land unproven on main. Nothing gated or landed. Branch: orch/pack-units-b (orch/pack-units has the other runs' notes and diverged; not force-pushed).
- Suggested next step: add a close-up hook (camera at ~20 m, fixed pitch) to orch/gfxinf.mjs first, then a per-look camo seed in the vertex colour alpha/uv2 consumed in the `solgear` fragment hook.
