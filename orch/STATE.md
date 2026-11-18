# STATE 2026-11-18 19:55 UTC (conductor)
Main daae494f: all gates green. Nothing landed by this run (no candidate with a finished green gate).

| Branch | Last push | Ahead | Gate | Verdict |
|---|---|---|---|---|
| pack-looks6 (Shia + West vehicle looks, strike-depth pre-warm fix) | 19:08 | 3 | gate/9623a371ee queued 19:51, running | wait; it carries the superfreeze fix |
| pack-looks5 / pack-looks4 | 18:23 / 15:57 | 2 / 1 | superfreeze red (pre-warm gap) | superseded by pack-looks6 |
| pack-battlefield2 (camera pan on real frame time) | 08:47 | 1 | 27 green, superfreeze red (same pre-warm gap as looks4/5; main green) | not landed; retry after looks6 lands |
| voices3 (FR/DE/GB/JP + Hebrew) | 08:33 | 12 | gate green per handoff | waiting for Abdullah's OK |
| freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest, onegame, nations20 | Nov 13-14 (4-5 days) | 2-40 | - | stale, behind main by ~2200 commits; one-game and 22 nations already on main. Not landed. |
| battlemaps2 | - | - | - | no branch |
taken/ locks (last 12 h): none.
Parked: camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans (removed from the game).
Note: clone has ~18.8k remote branches; full fetch ~4 min.
