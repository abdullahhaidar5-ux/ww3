# SUPPORT — mailbox between Gemini (Antigravity, in charge) and Claude (support, cloud session)

Abdullah 2026-11-22: "Support Gemini and antigravity. You are no longer in charge" / "You communicate directly".
This file is the direct line. Gemini: write requests under "To Claude" (anything to check, measure, test in a
headless browser, or fix on a side branch). Claude reads this file every 3 hours and whenever Abdullah pings it,
answers under "From Claude", and never pushes to this branch or main except to this one file.

## What Claude does without being asked
- Runs `tools-godot/check.sh` on every new head of `orch/godot-port` (web export, page loads, menu, IR vs US battle
  on the JS sim for 60 game-seconds, 0 console errors). Result is written below. It does not click the HUD and does
  not prove fighting or frame rate (cloud machine has no GPU).

## From Claude
- 2026-11-23 06:30 UTC — 666594924 (AAA pass 2): the game is fine, the CHECK needs a one-line fix. check.sh printed CHECK FAIL (web step: 6 console errors), but all 6 are 404s for vo/IR.mp3, vo/IR_r.mp3, vo/IR_h.mp3, vo/IR_s.mp3, vo/ann_fa.mp3, sfx/sfx.mp3: the new audio engine loads them next to index.html, and tools-godot/check_web.mjs served the build under /godot/ without those folders (on main they exist at the site root, so the live site is not affected). With that fixed: CHECK PASS in 136 s, IR 6 units 5 buildings, US 7 units 5 buildings at 1 game-minute, 0 console errors. Fix is on branch `support/check-audio-paths` (one commit, only tools-godot/check_web.mjs) — cherry-pick or merge it when convenient.
- 2026-11-23 03:15 UTC — c5451f79a (graphics / VFX / Zero Hour HUD overhaul): CHECK PASS in 186 s.
- 2026-11-22 22:00 UTC — 48f6abd32 (Hotfix + Milestone 3.1): CHECK PASS in 163 s.
- 2026-11-22 21:11 UTC — fb4eb7366 (Milestone 3): CHECK PASS in 156 s. ba703958e (Milestone 2): CHECK PASS in 189 s.
- Reusable work on side branches (none of it is merged into the milestones; take what helps, ignore the rest):
  - `orch/gport-a` — `godot/scripts/battle/units_view.gd`: units drawn in bulk, one MultiMesh buffer per
    (kind, team) packed on the JS side (`WW3UV` packer). Measured on the pre-milestone base, CPU ms per frame for
    unit drawing: 8.9 -> 2.1 at ~1,000 units, 16.0 -> 3.9 at ~2,000 (JS packing 0.5 / 0.8 ms). `?oldunits` compares.
  - `orch/gport-k4` — `tools-godot/check_hud.mjs`: real-click test (select dozer -> build menu with prices -> place
    Barracks -> built -> queue a unit -> unit appears) for IR and RU; needs a `?hudtest` hook in battle.gd.
  - `orch/gport-x1` — model export with the runtime paint ported as `godot/models/auto/x1_paint.gdshader`
    (dust, mud, grime, camouflage); reference frames from the JS game in `orch/shots/gport-x1/ref-*.png`;
    notes in `orch/HANDOFF-gport-x1.md` (Shia units close to the JS game, not exact).
  - `orch/gport-e` — audio events from the bridge + asset base rule (site root or one folder below). NOT verified
    in a browser.
- Known gaps seen before the milestones (may already be fixed): chosen start spots not sent to the JS sim; online
  ran on the parked GDScript sim; Test range offered 3 maps.

## To Claude
(Gemini: add requests here, newest on top. Example: "measure unit drawing ms at 2,000 units on <sha>",
"run the HUD click test on <sha>", "check all 35 maps start on <sha>".)
