# HANDOFF lane B (re-apply good work) - 2026-11-21

Base: origin/main 55f2340 (= Nov 19 night game aae60d36). Each change re-applied with `git show <sha> -- src orch/decisions.mjs | git apply -3`,
index.html rebuilt with `python3 orch/build.py` (never copied from history). Nothing pushed to main - ORCH lands.

Smooth-pc numbers: the runners render in software and are shared, so the **median frame swings a lot between runs of the same game**
(main 55f2340: 37.1 ms; three other lanes' gate runs the same hour: 66.6 / 73.7 / 89.1 ms). Treat the median as noise unless it is far
outside that band; **draw calls are the stable number** to compare. Main 55f2340 smooth-pc: median 37.1 ms, p95 70.9, draw calls 1214, 6120 k tris.

## 1. orch/laneB-freeze - freeze fixes, no visible change
- Re-applied: 36b658f (the brief's "68f25ca2" does not exist; 36b658f is the "decode radio/shout/announcer sheets and engine loops at battle
  start" code commit that db5bb4a landed), b8ef475f (engine loops really decode), 37ecd31d + ea924648 (EW ring plain lines, only on screen).
- Gated sha **2217ba97** - `orch/cigate.sh`: **all 28 gate/* PASS** (incl. loadfreeze: longest task while preparing graphics 213 ms).
- smooth-pc: median 62.3 ms (noise band, see above), p95 113, **draw calls 1215 vs 1214 main** (same).
- Verdict: good to land. No visible change; it removes audio-decode and EW-ring stalls that were measured on Nov 20. Not seen on a real PC by me.

## 2. orch/laneB-ai - China/Russia AI counter-pick (SIMULATION change)
- Re-applied d6d545d2 (one line in src/03-sim.js: Normal China/Russia barracks use the counter-pick, fewer wasted anti-tank/medics).
- Gated sha **43d641b1** - **all 28 gate/* PASS** (loadfreeze was red on the first try - US "14 shader programs linked in one go, max 12" - and green on the re-run of that job; flaky, not caused by a one-line AI change).
- smooth-pc: median 57.5 ms (noise band), p95 220.7, draw calls 1223 vs 1214 main (+9 = different armies on the field, not render cost).
- **ORCH: this changes simulation files - after landing, the battle servers must move (autodeploy does it once all gate/* are green on main).**
- Verdict: good to land. Not play-tested by me - the tourney/AI-vs-AI numbers were not re-measured on this base.

## 3. orch/laneB-scale - vehicles drawn bigger next to infantry (VISIBLE, view only)
- Re-applied 83519cba (VEH_SCALE in src/11-models.js, label height in src/06-view.js) + bffe055 (its guard fix: soldier size 14.0).
  First gate on 3d0e471 failed `decisions` only because bffe055 was missing; fixed in 2441baaa.
- Also on the branch: `orch/laneBshots.mjs` + `.github/workflows/laneBshots.yml` (branch-only; renders before = origin/main, after = branch,
  normal battle camera, desert bm_breakwater + snowy Test range map, Day; pictures go to branch `orch/laneB-shots`, orch/shots/laneB/).
- Gated sha **2441baaa** - **NOT green: 26 of 28 PASS; audio FAIL** on the first try (green on re-run) and ("second battle: battle music again") and **superfreeze FAIL** (rangefreeze: power sounds decoded mid-battle - exactly the stall the freeze branch removes; main 55f2340 itself has both a red and a green superfreeze). VEH_SCALE is a view-only multiplier, so I read both as flaky/pre-existing, not caused by it - but **superfreeze was red again on the re-run** (Test range power/wave sounds decoded mid-battle = the stall the freeze branch fixes). smooth-pc: median 59.2 ms (noise band), p95 87.7, **draw calls 1204 vs 1214 main** (no extra draw cost), 6507 k tris.
- - Pictures (looked at them myself): `orch/shots/laneB/{before,after}-{desert,snow}.jpg` on this branch.
  - Desert (bm_breakwater, IR, Day): clean A/B. Vehicles are clearly bigger next to the soldiers (tanks/trucks about 1.3-1.45x), soldiers unchanged.
    **Problem: the game still spaces vehicles by their old size** (collision radius unchanged - view only), so in a tight group the bigger
    trucks and tanks merge into one block and the tanks hide behind the trucks. In a spread-out column it will look right; in a packed group it looks worse than before.
  - Snow (Test range on bm_splitridge, RU, Day): NOT a clean A/B - the after run had extra base buildings (factory, hangar, a tower over the
    infantry) that the before run did not draw (Test range layout/model loading differed between the two runs, not caused by VEH_SCALE).
    The vehicle row shows the same bigger-and-overlapping effect.
- Honest verdict: **not sure.** Scale reads more realistic, but packed groups overlap. Options for ORCH/Abdullah: land as is; or lower the
  factors (e.g. tank 1.25, trucks 1.1); or also widen vehicle spacing (that is a simulation change -> servers move).
- Per LESSONS rule 1 this one lands only after Abdullah sees the before/after pictures and says OK.

### Scale follow-up: orch/laneB-scale-on-freeze
- Same scale change (83519cba + bffe055) stacked on the gated freeze commit 2217ba97, sha **06c1e769**, gate pushed (gate/06c1e76955) -
  result NOT checked by me before stopping (runners were queued 1-2 h). Land order for ORCH: **freeze first, then this branch** if its gate is
  all green and Abdullah OKs the pictures. Do not land orch/laneB-scale itself (its gate is red).

## Summary
| branch | sha gated | gate | draw calls vs main 1214 | verdict |
|---|---|---|---|---|
| orch/laneB-freeze | 2217ba97 | 28/28 green | 1215 | land |
| orch/laneB-ai | 43d641b1 | 28/28 green (loadfreeze on re-run) | 1223 | land; then servers move (sim change) |
| orch/laneB-scale | 2441baaa | red (superfreeze twice) | 1204 | do not land; use scale-on-freeze |
| orch/laneB-scale-on-freeze | 06c1e769 | pending | - | after freeze + Abdullah's OK on the pictures |
