# STATE — conductor run 2026-11-21 ~13:00 UTC

HOLD still in force: `train/20261121-0012-hold` (ORCH 2 freeze; Abdullah 2026-11-20 18:09 approved plan: nothing lands on main except ORCH's reviewed pieces; conductor does step 1 only). No train, no gate, no landing this run.

- origin/main head: 261e9af (2026-11-21 01:26 UTC, "Loading waits up to 60 s for graphics prep"). Main was rolled back to the Nov 19 night code on 11-20/21.
- Battle candidate branches (all last pushed 2026-11-13/14, none newer): 0 commits ahead of main (already in main or empty): freezefix, sweepfixA, sweepfixB, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20.
- 1+ ahead but ~710-720 commits behind main (stale, not landable without a rebase by their owner): ghostslot (1), testrange (1), techbldgs (1), ammozone (7).
- Never-land branches (camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans): parked (removed from the game).
- No fresh `orch/*` work found; HANDOFF/gate-status and taken-lock ages not collected (nothing to land; git fetch of the 4.9 GB repo times out here, REST lists give no dates).
- Remote hygiene: ~1200 branches, mostly `gate/*` (~800) and `gate-logs/*`; they make fetch/listing very slow. Suggest ORCH prunes old ones.
