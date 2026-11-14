# STATE (conductor, 2026-11-14 18:50 UTC) — main = c53e750 (landed 18:30 UTC: train 1610 + battleclean2)

Landed already (ahead=0): freezefix, sweepfixA, sweepfixB, unstuck, battleclean2.
Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, anything only in src/13*.

| branch | last push | ahead | HANDOFF | own gate on branch head |
|---|---|---|---|---|
| orderfeel | 14 h | 1 | yes | none seen |
| ghostslot | 15 h | 1 | yes | none seen |
| testrange | 16 h | 1 | yes | 26/27 green, audio red (known flaky) per handoff |
| pileflag | 15 h | 2 | yes | none seen |
| dugout | 88 min | 3 | yes | none seen |
| battlepower | 16 h | 5 | yes | 27 green |
| bldqueue | 15 h | 7 | yes | 22 green; controls, tutorial, migrate x4 red |
| techbldgs | 15 h | 11 | yes (part 1 ready) | none seen |
| groundreal | 14 h | 4 | yes | none seen |
| leaderlook | 13 h | 11 | yes | none seen |
| usvoice | 14 h | 3 | yes | run sat queued >1 h, no result |
| ammozone | 15 h | 7 | yes | run queued 45 min, no result |
| onegame | 14 h | 16 | yes | none seen |
| nations20 | 15 h | 5 | yes (says 18 nations; brief says 22 - needs fixing before landing) | none seen |
| looktest | 3 h | 3 | yes | never lands until Abdullah picks a look |

Taken locks with no orch branch: not checked this run (state only).
No train this run: main was pushed 5 min ago, its Main gate and Pages build are still queued; another push now would cancel the live-site update. Next run: train battlepower, testrange, ghostslot, orderfeel, pileflag, dugout (<=6).
