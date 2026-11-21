# Conductor state — 2026-11-21 02:55 UTC

**FREEZE: no train this run.** `train/20261121-0012-hold` (pushed 00:09Z by ORCH): "Abdullah 2026-11-20 18:09 approved plan: nothing lands on main except ORCH's reviewed pieces. Conductor: do step 1 only."

main head 261e9af9 (2026-11-21 01:26Z, "Loading waits up to 60 s for graphics prep"). Recent main: rollbacks to aae60d36 (Nov 19 night), soldiers drawn one by one again.

Candidate branches vs main (ahead count / last push):
- Already in main (ahead 0): freezefix, sweepfixA, sweepfixB, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20
- ghostslot ahead 1 (Nov 14 03:28), testrange ahead 1 (Nov 14 03:06), techbldgs ahead 1 (Nov 14 18:46), ammozone ahead 7 (Nov 14 03:55): stale, not landed (frozen)
- battlemaps2: no such branch

Note: local git fetch of this 5.4 GB repo times out in the cloud sandbox; state read via GitHub API. gate/* statuses and taken/* lock ages not checked this run (freeze).
