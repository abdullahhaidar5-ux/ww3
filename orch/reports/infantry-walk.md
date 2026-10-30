# Infantry walk fix (branch `orch/infantry-walk`)

**Cause:** setupWalk read the hip positions before the unit's yaw group (turned 90°) had updated its world matrix, but
converted the swing axis with bone rotations that did include the turn — so every soldier (all 3 uniform models, all
18 nations) swung its legs about the forward axis: sideways, feet crossing.
**Fix:** measure the hips in the soldier's own frame after a full matrix update (src/11-models.js setupWalk). No cost change.
**Test:** new `orch/walktest.mjs` (desktop + 390×844 phone, 6 nations, N/E/S/W/NE, 3 zooms): before worst swing 90°,
feet crossing → after ≤3° swing, ≤10° facing, no crossing. WALKTEST PASS; runs in the gate's controls job.
Shots: `orch/shots/infantry-walk/{before,after}/`.
**CIGATE: PASS 17/17** on 7befbdf (touch needed one re-run: first run died without reporting; passed locally too).
