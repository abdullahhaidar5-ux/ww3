# Conductor state — 2026-11-15 12:00 UTC

main = a11728d (Merge redfixC), live: pages-build-deployment for it succeeded 11:46 UTC. Gate on d1a6ff1 (redfixB fix) had no non-green statuses.

## Helper branches with unmerged work
| branch | last push | state |
|---|---|---|
| orch/voices2 | 22 min ago | WIP (RV south-Iraqi voices, vo/RV.mp3 + refs). Still working, no handoff, no own gate. Not landed. |
| orch/redfixC | 8 min | code already on main; only HISTORY line + handoff left (docs-only, not pushed to main) |
| orch/handoff-orch1, polishB | hours | handoff docs only |

## Stale queue names (freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest, onegame, nations20)
Branches are 17+ h old with no new pushes; the work is already in main (one-game, supply lines, 22 nations are on main per CLAUDE.md) or superseded. Nothing to train. Parked (removed from game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

## Train
None this run: no ready candidate. Last train branch train/20261115-0300.

## Taken locks
99 taken/* branches exist; per-lock age not checked this run (fetching 16k refs too slow). Note: the repo has ~14.5k gate-logs/* branches which make full fetch time out; fetch by pattern.
