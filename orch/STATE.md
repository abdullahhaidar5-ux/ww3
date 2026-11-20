# STATE — conductor run 2026-11-20 ~16:00 UTC

main = 9b59678 (East base buildings, landed this run). Pages build for it: success.

## Landed this run
- orch/bld-east: RU/CN/KP bases get concrete walls, barbed wire, tyres, camo net, radio mast, flags (view only). Own gate (9b5967892) green except gate/audio (known flaky). Based on main head, fast-forwarded. Local smoke timed out in the sandbox (too slow); GitHub gate smoke4/art-smoke/decisions/smooth-pc/smooth-mp were green.

## Waiting
- orch/bld-regional (SA AE TR EG PK buildings): last commit "(WIP)" 15:20, no handoff, no gate yet. Helper still working; next run.

## Nothing to land
pack-units, pack-art, art-east*, fix-superfreeze, pack-systems, trailer, trailer-clips, conductor-20261120: only HANDOFF/doc/shot commits (or already landed).
Stale Conquest-era (parked): ghostslot, testrange, techbldgs, ammozone. Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, src/13*.
Saved-nothing locks (taken/ with no orch/ branch, all >5 days): rv-voice, savesync, redgates, drawcalls, spylook2, freezefix2, finish-tokens, c-real-supply, seamless-hud, realwar, army-standards.
Note: origin has ~22k gate/* heads; plain `git fetch` times out — use fetch --no-tags with refs/heads/* in the background.
