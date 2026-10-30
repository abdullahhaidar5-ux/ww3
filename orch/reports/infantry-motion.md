# Infantry motion fix (branch `orch/infantry-motion`, e249eee)
**Cause (arms):** the rifle and arms were posed with raw world axes, but each soldier sits in its unit's 90°-turned yaw
group — so the rifle stuck out to the soldier's side and both hands hung off one side, behind the hips (support hand
-0.39 "ahead" of the hips). The leg fix made those matrices current, which exposed it. Arms weren't animated at all.
**Cause (gait):** stride and cadence were fixed while infantry move at ~3.4 body-heights/s, so planted feet slid at
50-74% of ground speed; a constant sideways roll (3.4°) tilted every moving soldier; spine leaned backwards.
**Fix:** src/11-models.js newSoldierKit poses arms/rifle in the soldier's own frame (rifle forward, low-ready). New gait
(setupWalk/walkPose): speed-driven jog — planted foot moves back at exactly ground speed (thigh solved per frame), hip
height from the real leg shape, knee lift/heel kick, flat planted foot, pelvis turn countered by the spine, forward lean
growing with speed, chest+rifle dip with each footfall, idle breathing; 06-view: no roll, cadence from speed. No new per-frame allocations, same draw calls, 03-sim/01-data/02-map/07* untouched.
**Numbers (walktest, before → after):** support hand ahead of hips -0.39 → +3.3; hand sideways sway 0° → ≤2.5° (travel
.08-.21, all along the walking line); foot slip .48-.74 → .08-.11; body roll 3.4° → 0°; legs ≤6° off, facing ≤6°. **Test:** orch/walktest.mjs now runs at real speed and FAILS on rifle-not-in-front, arm sway >20° (travel >.15), slip >.35,
roll >2°. Stills: orch/shots/infantry-motion/{before,after}/ (side-1, front, rts-1). SMOKE PASS.
**CIGATE: PASS 17/17** on e249eee (touch: 2 hold-drag box-select checks failed once, not motion-related; passed on the one re-run).
