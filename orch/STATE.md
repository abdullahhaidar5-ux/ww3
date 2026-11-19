# STATE — conductor run 2026-11-19 ~23:15 UTC
Main head 2dc39a068 (art-regional tanks); all gates green there. No train this run: nothing finished with a clean gate.
| branch | ahead | own gate | verdict |
|---|---|---|---|
| orch/pack-art (edd9181) | +2 (on main head) | 23 ok; red: superfreeze (4th time on this code), audio (flaky) | held - superfreeze passes on main, fails on this code repeatedly; needs an owner to find the stall |
| orch/art-air (6c3c745) | +1 | 15 ok, red migrate-down; gate was still running | held |
| orch/pack-units-r5 (2248be8) | +3 | 26 ok, red superfreeze | held (same superfreeze pattern) |
| orch/pack-units2, art-east5 | +2 / +1 | no gate yet (art-east5 = docs only) | not landed |
| orch/art-west-r | +106 | stale base | parked |
Superfreeze red keeps appearing on branches with new model geometry: real freeze suspected, needs an owner.
No stuck helpers; only old taken/ locks (all older than 1 day, with no work lost known). Parked (removed from game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
Fetch of the repo takes ~4 min (729 gate branches).
