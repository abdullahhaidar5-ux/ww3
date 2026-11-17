# STATE (conductor, 2026-11-17 ~08:00 UTC)

main = 935c9255d (shiamissions landed itself at 07:04 UTC). No train run.

| branch | last push | ahead of main | note |
|---|---|---|---|
| orch/shiamissions | 16 min before this run | 2 (handoff docs only) | code already on main; nothing to land |
| orch/onegame, orch/nations20 | 3 days | 17 / 6 | diverged from today's main (src diff ~1000 + / 3400 - lines); main already runs the 22-nation Battle-only game. Not landed: merging would risk reverting newer work |
| orch/dugout, bldqueue, battleclean2, battlepower, ammozone, pileflag, looktest, maptrim, dozerbuild | 3 days | 3-18 | no HANDOFF-ready/gate run seen; stale against main, not trained |
| other orch/* | 1-3+ weeks | many | old; ignored |

No taken/* locks found younger than 12 h without a branch. Note: local clone was a week stale; full fetch took ~10 min (gate/* has 600+ branches).
