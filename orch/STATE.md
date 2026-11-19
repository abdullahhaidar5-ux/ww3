# STATE — conductor run 2026-11-19 ~18:50 UTC
Main head 074ab6724 (West art bundle 2 landed 17:57Z, East close-ups, regional drones, pack-limit already in main).
Train train/20261119-1850 = main + art-west (landing craft) + art-east2 (East navy). Merged clean; build/check OK; local smoke too slow in sandbox (gate decides). Gate gate/3d487367ef pushed.
| branch | note |
|---|---|
| orch/art-west | 19/28 gate statuses, none red yet -> in train |
| orch/art-east2 | 18/28, only gate/audio red (known flaky) -> in train |
| orch/art-east-b2 | East ships; gate 4/28 so far, overlaps art-east2 -> waits |
| orch/pack-art | Shia truck paint + audit; gate 6/28 so far, none red -> waits |
| orch/art-regional | its drones landed; leftover navy commit had gate/superfreeze red -> not taken |
| orch/pack-units, pack-units-land | WIP soldier close-ups / handoff only; cap already landed |
| orch/model-scout | report only |
Parked (removed from game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
No stuck helpers found (taken/ locks: 101, mostly old). Repo has ~19.8k gate-logs/* branches; fetch is slow.
