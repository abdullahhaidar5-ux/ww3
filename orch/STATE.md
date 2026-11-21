# Conductor state — 2026-11-21 ~07:55 UTC

Rerun 07:55Z: FREEZE still on (train/20261121-0012-hold is still the newest train branch). main still 261e9af9 (2026-11-21 01:26Z). No train, no landing, step 1 only.
No candidate branch pushed since Nov 14; only lane branches (laneA/B/C/D, newest 05:42Z) and conductor are active. Gate statuses not checked (freeze).

--- previous run ---


Rerun 07:00Z: FREEZE still on (train/20261121-0012-hold, ORCH 00:09Z, newest train branch, nothing newer). main still 261e9af9 (2026-11-21 01:26Z). No train, no landing, step 1 only.
Candidate ahead-counts vs main this run (differ from the earlier run because main was rolled back): ghostslot +26, testrange +30, techbldgs +35, onegame +40, nations20 +29, unstuck +8; freezefix/ammozone thousands (old base). None re-pushed since Nov 14, none is a candidate under the freeze.
101 taken/* locks, 604 orch/* branches (lane branches still being pushed by ORCH lanes; not candidates).
Gate statuses not checked (freeze). Fetching this repo (8 GB) takes ~7 min in the sandbox.

--- previous run ---

Rerun 04:55Z: FREEZE still on, main still 261e9af9; no train, no landing. Candidate list unchanged (no candidate branch pushed since Nov 14; only conductor/lane branches active).
**FREEZE still on: no train this run.** `train/20261121-0012-hold` (ORCH, 00:09Z): nothing lands on main except ORCH's reviewed pieces; conductor does step 1 only.

main head 261e9af9 (2026-11-21 01:26Z, "Loading waits up to 60 s for graphics prep"), unchanged since last run.

Candidates vs main: freezefix, sweepfixA/B, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20 are already in main (ahead 0). Stale and not landed: ghostslot (+1, Nov 14), testrange (+1, Nov 14), techbldgs (+1, Nov 14), ammozone (+7, Nov 14). battlemaps2: no branch.

Active lane branches (pushed within the last hour, not candidates under the freeze): laneD-west-jeeps, laneD-west-tanks, laneD-drones, laneD-regional, laneD-west, laneD-shia, laneB-scale, laneB-shots, laneC-shots, laneC-bench, laneC-measure, laneC-shia-v2 / east-v2 / west-v2 / regional-v2, laneE, laneB-freeze, laneA-1. Several are based on an older main (behind by 61).

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

Not checked this run (freeze): gate/* statuses, age of the 101 taken/* locks.
Note: a full fetch of this 5.4 GB repo takes about 6 minutes in the cloud sandbox.
