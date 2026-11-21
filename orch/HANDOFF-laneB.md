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
- Gated sha **43d641b1** - GATE_AI_RESULT
- smooth-pc: median 57.5 ms (noise band), p95 220.7, draw calls 1223 vs 1214 main (+9 = different armies on the field, not render cost).
- **ORCH: this changes simulation files - after landing, the battle servers must move (autodeploy does it once all gate/* are green on main).**
- Verdict: GATE_AI_VERDICT

## 3. orch/laneB-scale - vehicles drawn bigger next to infantry (VISIBLE, view only)
- Re-applied 83519cba (VEH_SCALE in src/11-models.js, label height in src/06-view.js) + bffe055 (its guard fix: soldier size 14.0).
  First gate on 3d0e471 failed `decisions` only because bffe055 was missing; fixed in 2441baaa.
- Also on the branch: `orch/laneBshots.mjs` + `.github/workflows/laneBshots.yml` (branch-only; renders before = origin/main, after = branch,
  normal battle camera, desert bm_breakwater + snowy Test range map, Day; pictures go to branch `orch/laneB-shots`, orch/shots/laneB/).
- Gated sha **2441baaa** - GATE_SCALE_RESULT
- SHOTS_VERDICT
- Per LESSONS rule 1 this one lands only after Abdullah sees the before/after pictures and says OK.
