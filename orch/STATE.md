# STATE (conductor, 2026-11-21 ~22:00 UTC)

main = 9ff51b0e2 (landed: ready-power icon column, Lebanese voices 18% faster, performance log details). Its gate: all green after one re-run of loadfreeze + mpsync (both red the first time, green on re-run).

| branch | ahead | note |
|---|---|---|
| orch/laneE-land | 2 docs-only commits left | rest landed; docs not pushed to main on their own |
| orch/fingers | 1 (9 behind) | no gate, no handoff |
| orch/godot, godot-sim, godot-net | 3 / 2 / 5 | Godot rebuild branches, not part of the JS game; not landed |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Taken locks with no branch: none newer than 11-18. No train/* newer than 20261121-0012-hold.
