# STATE — conductor run 2026-11-19 12:50 UTC
main head 81a0822 (rangefreeze handoff). Newest train/* is 20261119-0900(b), already in main, >3 h old → no other conductor running.
No train this run: every Battle helper branch below is last pushed 2026-11-13/14, forked from a main ~5 days old
(diff vs main: 600-800 files), has no own gate result visible, and main already runs the one-game rules (no src/13*, 22 nations,
supply lines in Battle). Landing them would revert 5 days of main work, so none were merged.

| branch | last push | note |
|---|---|---|
| onegame, nations20, techbldgs, dugout, pileflag | 11-14 | stale fork of old main; superseded by what is on main — needs owner rebase/ORCH decision |
| freezefix, ammozone, conductor | 11-13/14 | ahead >2000 = old history line; not mergeable |
| sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, unstuck, battlepower, bldqueue, groundreal, leaderlook, usvoice, looktest | 11-14 | stale, no handoff seen, not landed |
| battlemaps2 | — | no branch |
| camphud nofightit warpeace mapshapes eu4audit civhumans | — | parked (removed from the game) |

Repo has ~19.6k remote branches (17k gate-logs/*): plain `git fetch --prune` times out; fetch named refs only. Suggest ORCH prune gate-logs/*.
Scheduled prompt's CURRENT FOCUS is from 2026-11-13 and out of date.
