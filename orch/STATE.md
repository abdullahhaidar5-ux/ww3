# STATE — 2026-11-18 ~03:00 UTC (conductor run)

No train this run: nothing waiting to land.

main = 10cf4bd (Stuck units report), Pages build for it = success (live). No `train/*` branch exists.

Train candidates (all stale, nothing to merge):
- freezefix, sweepfixA/B, orderfeel, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest, onegame, nations20: 0 commits ahead of main (already landed).
- ghostslot (1), testrange (1): handoff-only commits from 2026-11-14, nothing to land.
- techbldgs (1): ORCH note only (2026-11-14), not landed.
- ammozone (7): 2026-11-14 Conquest-era ammo zone; its rule is already in Battle on main, branch superseded.
- battlemaps2: no branch, no taken lock.

Never-land branches: parked (removed from the game).

In flight (helpers land through their own gate/* runs): Proxy Militia power (gate/6542a3a968, queued), chunk depth material guard (gate/5250b982ca, queued), Destructible cities (gate/dc307f86f4, running).
Recently red own-gates: Instanced soldiers chunk material (gate/41a0e5e888), controlsfeel WASD guard (gate/737598d243), Controls feel glide (gate/1020fe142e).
Main head gates: smooth-pc success; audio failure (known flaky).

Note: a full `git fetch` of this repo times out here (600+ branches), so state was read through the GitHub API.
