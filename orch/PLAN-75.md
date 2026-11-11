# PLAN-75 — from "ambitious free browser game" to a game worth $75, on a fixed usage budget

Owner: Abdullah. Written by ORCH 2026-11-11 after: "You're going to come up with a plan to retain usage and turn
this into 75 dollar game" (17:51) and "No budget. Get creative and get it done." (17:52). Earlier the same evening:
"We need to actually think of usage. No more resets. So let's be smart." (17:45), Sonnet allowed for simple
merge-and-retest helpers (17:48).

## Usage rules (binding for ORCH and every helper)
- Weekly allowance ≈ 4 full sessions (Fable-only ≈ 2.5). That is ≈ 8 helper-hours a day. No resets, no credits.
- At most 2 building helpers at once (4 only to finish the list below), plus the conductor. One in, one out.
- Sonnet for mechanical work (merges, test fixes, spelling, voices, asset conversion). Fable for look, design, battle rules.
- Background runners (campaign realism, dev loop, nightly queue) stay OFF unless an item is on this plan.
- ORCH starts a FRESH conversation each morning from this file + orch/BRIEF.md + the conductor's orch/STATE.md
  (branch orch/conductor). Long threads cost as much per check-in as a helper.
- Helpers: one narrow job, exact file/line pointers, save early, own proof pictures, one gate run, conductor lands.
- Feature freeze after wave 2. New ideas go to a list, not to a helper. Changing direction mid-build is the costliest thing we do.

## Phase 0 — finish the list (to Sat 2026-11-14)
Wave 1 (started Wed 17:44): battle report card + front lines; commander's radio + edge alerts; living main menu;
small fixes (tutorial test, empty Beats/Weak-to boxes, white streaks in Arabia, palms); gentler mountains (orch/mtnfix2);
army pieces as SHIELDS (+ hull for fleets, wing for air groups, smaller cargo ships, quieter roads) from 22:32.
Wave 2 (one at a time, mostly Sonnet): Nation window tabs → six groups; one setup screen; unit rings + order preview;
stuck-unit/controls fixes; map fairness; HUD trio (cursor language, how-you-win card, goal line); real-war rules 1–3.
Wave 3 (ping wheel, photo mode, opening shot, real-war rules 4–8, veterans…) is FROZEN until phase 5.

## Phase 1 — one slice, no rough edges (week of Nov 16)
Slice: IR, RS, DW, RV + IL, SA, US; one campaign start (Iran, Nov 2026); three battle maps.
Sweep every screen of the slice: open it, picture it, check it against orch/ART-BAR.md, fix it. First ten minutes flawless.
All 28 tests green and kept green. Done when Abdullah plays Iran for an hour and notes nothing broken or ugly.

## Phase 2 — looks without a budget (3 weeks). Free art only (CC0 / CC-BY / public domain, credited).
1. Code is the artist: lighting, shadows, color grade, haze, dust, smoke, tracers, explosions, scorch decals, wear —
   through the shared material library. This is what makes a screenshot look expensive, and it costs no assets.
2. One art direction that makes simple models look intended. FIRST STEP: a picture study of one battle in three looks
   (today's, cinematic grade, "drone feed") — Abdullah picks by picture, then everything follows that look.
3. Kitbash: the 20 most-seen units/buildings of the slice rebuilt from the best CC0 parts (Quaternius, Kenney,
   Poly Haven, ambientCG, CC0 Sketchfab), unified by one palette and material set so it reads as one art team.
4. Motion by code: recoil, suspension, track dust, turret traverse, infantry bob, wreck states.
5. Public-domain reality: NASA/USGS terrain and imagery for maps; public-domain equipment/landscape photos (no
   identifiable people) for menu, loading and encyclopedia screens.
Done when a battle screenshot could pass for a paid game.

## Phase 3 — feel and sound (1 week)
CC0 weapon sounds and mix, voices for the slice, calm↔combat music; pathing and responsiveness; a Hard AI that plays
convincingly. Done when friends stop mentioning controls or sound.

## Phase 4 — proof of fun (from phase 1, every week)
Abdullah's Discord group plays three evenings a week; ORCH fixes their top ten complaints each week; balance by tourney.

## Phase 5 — widen
The frozen ideas, one at a time, each finished before the next; more nations to the slice's standard.

## Honest bar
Phases 1–4 ≈ six weeks at this usage → one slice people would pay for. The whole game at $75 is months beyond that;
art is the limit, and with no budget the answer is direction + code-made effects + careful kitbashing, not more features.
