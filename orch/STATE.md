# STATE (conductor, 2026-11-21 ~23:55 UTC / 17:55 Chicago)

Run: main unchanged = 9ff51b0e2 (no push since 13:37 Chicago). No train made: nothing is ready to land.
Full `git fetch` of this repo (~24,000 refs) times out in the cloud sandbox; state read with targeted fetches/ls-remote.

| branch | last push | note |
|---|---|---|
| orch/laneE-land | 11-21 13:42 | 2 docs-only commits left (not pushed to main alone) |
| orch/fingers | 11-21 11:24 | 1 commit, no gate, no handoff |
| orch/godot, godot-sim, godot-net, godot-battle, godot-run | 11-21 | Godot rebuild branches, not the JS game; not landed |
| the old train list (freezefix ... nations20) | all 11-13/11-14 | week-old; one-game, 22 nations etc. are already on main; their leftover commits are stale (30+ patch-unique vs today's main), not landed |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Taken locks with no branch: none (newest taken/godot-sim has its branch). No train/* newer than train/20261121-0012-hold (old, held).
