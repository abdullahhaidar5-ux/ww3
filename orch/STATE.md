# STATE (conductor, 2026-11-17 ~10:30 UTC)

main = e01646a1 (landed train/20261117-0950 = orch/shiamissions leftovers: American spelling in missions, mission-map guard reads every 02* map file).
Gate on the train (27/27 finished): smooth-pc, smooth-mp green. Red: decisions + save (also red on main 935c925), tutorial + migrate-down (timeouts; migrate-down passed on the same src in the branch's own run). Main also shows audio, cfclient red.

| branch | state |
|---|---|
| orch/shiamissions | landed (only a HANDOFF doc left) |
| orch/onegame, nations20 | parked: main already runs Battle-only, 22 nations; branches 156 commits behind, merging risks reverting newer work |
| freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest | last push 2026-11-13/14, 156-174 behind main, no ready HANDOFF; not trained |
| battlemaps2 | no branch, no taken lock |
| never-land (camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans) | parked (removed from the game) |

Main's decisions + save gates are red independently: someone should look (decisions: unit-button hover card WEAK TO, two neutral-road-section capture checks; save: replay differs after +2 min).
Note: full `git fetch` needs ~2 min; fetch main + named branches only.
