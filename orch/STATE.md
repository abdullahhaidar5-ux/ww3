# STATE — conductor run 2026-11-14 17:05 UTC (short run)

Another conductor run is still working: `train/20261114-1610` was pushed 16:40 UTC (21 min ago, 43 commits ahead of main, not landed yet). Rule: step 1 only, no new train. main = 6c3916f.

| Idea (orch/…) | last push (UTC) | ahead | HANDOFF | own gate |
|---|---|---|---|---|
| freezefix | 11-13 03:04 | 12 | yes | none found |
| sweepfixA | 11-14 00:39 | 0 | yes | already in main |
| sweepfixB | 11-14 03:38 | 3 | yes | none found |
| orderfeel | 11-14 04:37 | 1 | yes | none found |
| ghostslot | 11-14 03:28 | 1 | yes | none found |
| testrange | 11-14 03:06 | 1 | yes | none found |
| battleclean2 | 11-14 04:00 | 8 | yes | none found |
| pileflag | 11-14 03:17 | 2 | yes | none found (merge was reverted on main) |
| battlemaps | 11-14 04:24 | 6 | yes | none found |
| unstuck / unstuck2 | 11-14 01:59 / 02:39 | 2 / 4 | no | none found |
| dugout | 11-14 16:42 | 13 | yes | none found |
| battlepower | 11-14 03:03 | 5 | yes | gate/146a42a7cb |
| bldqueue | 11-14 03:14 | 7 | yes | gate/6a914bdfd2 |
| techbldgs | 11-14 03:42 | 11 | yes | none found |
| groundreal | 11-14 05:04 | 4 | yes | none found |
| leaderlook | 11-14 05:29 | 11 | yes | none found |
| usvoice | 11-14 04:25 | 3 | yes | none found |
| ammozone / ammotruck | 11-14 03:55 / 06:02 | 7 / 9 | yes | none found |
| looktest | 11-14 09:07 | 3 | yes | none found (needs Abdullah's look pick) |
| onegame | 11-13 22:41 | 16 | yes | none found (lands after the others) |
| nations20 | 11-14 03:33 | 5 | yes | none found (lands last) |
| dozerbuild, destruction, squads, battlerules2, pacecap, polishspeed, polishfeel | 11-14 03:34–10:24 | 2–8 | yes | none found |
| battlemaps2 | no branch, no lock | | | |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

Locks with no `orch/` branch (saved nothing): army-standards (11-10), c-real-supply (11-11), finish-tokens (11-11), freezefix2 (11-12), realwar (11-11), seamless-hud (11-11), spylook2 (11-12).
