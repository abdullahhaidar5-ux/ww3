# Handoff: orch/q-feel — "Game feel" (queue item, Abdullah 2026-11-09 22:44)

STATUS after night 1 (2026-11-10): **slice 1 built and tested on this branch** (surface-matched shell impacts + hull rock on firing).
Not on main yet: look/visual changes may not land while `gate/smooth-mp` is red on main (CLAUDE.md "RIGHT NOW"). Land it when main is green
(merge main, `python3 orch/build.py`, `orch/cigate.sh`), then continue below. Guard: `node orch/gamefeel.mjs` (FEEL PASS) + static check "0a" in `orch/decisions.mjs`.

## Audit: what the item asks for vs what the game already had (so nobody rebuilds it)
| Asked | Already in the game before tonight | Where |
|---|---|---|
| weapon recoil | heavy vehicles slide back 2.4 units for 0.2 s when they fire | src/06-view.js syncScene (`ft<.2`) |
| muzzle flash timing | flash, flame tongue, side jets, smoke and ground dust on the shot event | src/05-fx3d.js `FXH.muz` |
| hull rock on firing | **was missing -> built tonight** (pitch + sideways rock, scaled by weapon) | src/06-view.js `ud.rock` |
| tracks leave marks, suspension | track decals, terrain tilt, squat/dip/lean | 05-fx3d.js `trkI`, 06-view.js `ud.sp/ud.sr` |
| dust/exhaust from movement | exhaust code exists; movement dust NOT checked tonight - verify before building | grep `exhaust` in 11-models.js, 05-fx3d.js |
| impacts match the surface | **was missing -> built tonight**: water spray, road chips, soil colour per map | 05-fx3d.js `impactSurf`, `splashFX`, `SOILC` |
| buildings crack and collapse in stages | staged damage + collapse + rubble exist for town buildings | `civStage`, `collapseCiv`, 06b-realism.js |
| infantry prone / hit / fall | posture system + bodies exist | 06-view.js `postApply`, `BODIES` |
| camera shake by distance | yes, scaled by blast size and distance to the camera | 05-fx3d.js end of `boomFX` (`shake`) |
| sound lands on the hit, distance delay | yes: clips are delayed by distance (`sp.far*…`) | 09-audio.js `sfxShot`, `sfxBoom` |

## Tonight's numbers (node orch/gamefeel.mjs, strait map)
water hit: 54 spray particles, 0 dirt, no scorch mark · road hit: grey chips [.40,.40,.39] · desert hit: sand-coloured clods [.47,.38,.26], 1 scorch mark ·
tank firing: hull pitch 0.028 rad (1.6 degrees) at 0.09 s, 0 at rest; same sideways when the turret points 90 degrees off.
No new meshes, materials or draw calls: everything goes through the budgeted particle pool `part()`.

## Slice 2 (night 2, 2026-11-10 ~10:00Z) — on this branch, merged with main fed30cb2
- Shells on water: the fireball is now a brief small burst at the surface (fire measure 34 vs 655 on land), steam instead of black smoke, no dark debris;
  the sea boils (dark patch, `k:'boil'`) and a foam ring runs outward (`k:'foam'`) — `splashFX` / `boomFX` (`wet`, `wk`).
- Missile / strike-sized blasts (`megaBoom`, src/05b-missiles.js) match the surface: white spray wall on water (no scorch, no chunks, no mushroom
  column, smaller fireball), grey wall on roads, brown on green maps, sand in the desert.
- Guard: orch/gamefeel.mjs checks all of it (FEEL PASS). No new meshes/materials/draw calls (particle pool only).
- Still waiting to land for the same reason as slice 1 (gate/smooth-mp red on main).
- Note for whoever lands it: gate/smooth-mp is very noisy on GitHub's runners — the same code measured 176-240 ms (pass) and 360-840 ms (fail)
  on different runs tonight (see the table in the morning report / `git branch -r | grep smooth-mp` logs). Re-run before concluding anything.

## Next (by value)
1. (done in slice 2) water fireball + boil ring, missile impacts by surface.
2. Turret recoil: the gun barrel sliding back needs a separate barrel node (`P.gun`) — only some models have one; code-built vehicles
   (queue item "Original models built in code") should all have it.
3. Wheels/tracks that visibly turn with speed (scrolling track texture / wheel nodes) — check which models expose wheel nodes first.
4. Buildings of the bases (not only town buildings) shedding pieces in stages; infantry hit reactions seen from gameplay zoom.
5. Before/after CLIPS for Abdullah (short webm links): the sandbox renders ~1 frame per 8 s in software GL, so clips must be recorded
   on a machine with a GPU or as frame sequences stitched with ffmpeg; tonight only stills exist (orch/shots/feel/impact-*.jpg).
