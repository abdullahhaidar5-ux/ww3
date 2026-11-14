# Conductor state — 2026-11-14 ~21:00 UTC (train 20261114-2055)

Main at start = a6c5239 (camera tilt). No other train/* was in flight (last train 1845 is already in main).

| Branch | State |
|---|---|
| freezefix, sweepfixA/B, battleclean2, unstuck, battlepower, groundreal, leaderlook, usvoice, looktest | already on main |
| ghostslot, testrange, orderfeel, techbldgs | already on main (branch had only a note commit); merged again in the train, no-op |
| **onegame** | IN TRAIN. Merge needed ~40 hunks resolved by hand (main had landed battlepower/techbldgs/orderfeel/ghostslot/testrange around it). Kept from main: Generators + power meter (HUD goal line moved into 08c-logi `cqBanner`), capturable tb buildings (`tbAdd`/`tbTick`), test-range window, sandbox always-in-supply. Dropped: Conquest, campaign, 08c-towns.js, Realistic/balance toggle, old plant rows (`infraInit` now empty). Guards in decisions.mjs / powertest.mjs adjusted by hand. |
| **nations20** | IN TRAIN, after onegame. Branch had 18 nations; ORCH note says 22 — applied the 22 (IN JP DE KR added to PLAYABLE, removed from NATFALL, guard + CLAUDE.md updated). |
| pileflag | reverted earlier on main (6c3916f); not re-landed (no cause found). |
| dugout | reverted earlier on main (a0b31f7); branch has black-hexagon fix, no gate run. Not in train. |
| bldqueue | own gate: controls, tutorial, migrate* red; 122 behind. Not landed. |
| ammozone | overlaps onegame's ammo rule; not landed. |
| camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans | parked (removed from the game) |
| taken/* with no orch/* branch | battlemaps2 (no branch) |

Notes: full `git fetch` times out (15k refs); fetch by refspec. Local smoke ~6 min, local decisions >10 min (use the gate).
