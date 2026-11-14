# Conductor state — 2026-11-14 ~19:35 UTC

Main = daebfc2 (19:13: looktest, leaderlook, usvoice landed by push-fast; train 1845 = battlepower, techbldgs, groundreal landed 18:41). No train this run (no train/* in flight, none landed).

| Branch | State |
|---|---|
| freezefix, sweepfixA/B, battleclean2, unstuck, battlepower, groundreal, leaderlook, usvoice, looktest | on main |
| orderfeel, ghostslot, testrange, techbldgs | on main (only a note commit left) |
| pileflag | **reverted on main** (6c3916f), re-land needs the cause of the revert; src/04d-supdump.js not on main |
| dugout | **reverted on main** (a0b31f7); branch has the black-hexagon fix (16:59), no gate run |
| bldqueue | own gate 28 statuses: controls, tutorial, migrate, migrate-down, migrate-abrupt, migrate-dual red; 119 behind main — not landed |
| ammozone | 119 behind, gate never ran; overlaps onegame's ammo rule — not landed |
| onegame | **merge attempt failed**: 18 conflicted files (~40 hunks: 01-data, 03-sim 6, 06-view, 08-ui, 08i-hud, 08l-firsthint, 14-menu 5, decisions.mjs 9, gate workflows; main edited 08c-towns.js which onegame deletes). Branch is 119 behind. Helper must merge main itself, then re-gate. |
| nations20 | branch implements **18** nations; ORCH note says **22** (adds IN JP DE KR) and was not applied. Not landed until redone with 22 (must come after onegame). |
| camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans | parked (removed from the game) |
| taken/* with no orch/* branch | battlemaps2 (no taken lock either, no branch) — nothing to save |

Environment note: full `git fetch` of this repo times out (multi-GB, 15k refs); fetch single branches by refspec.
