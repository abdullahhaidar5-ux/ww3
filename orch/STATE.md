# STATE — conductor run 2026-11-19 ~17:35 UTC (3rd run today)
Main head d7fbc495e (pack-limit 500-unit cap landed 15:11Z by another helper; its gate was re-run green).
Train train/20261119-1654 = main + art-east + art-regional + pack-art (docs/screenshot conflicts only). Local: build/check OK, smoke PASS. Gate gate/ce0bfb7ccb queued on GitHub >25 min (runner backlog behind gate/eda1004bce). Not landed yet.
| branch | ahead | note |
|---|---|---|
| orch/art-east | 6 | East kits RU/CN/KP; own gate 28/28 green -> in train |
| orch/art-regional | 1 | regional fixed-wing drones; own gate green so far -> in train |
| orch/pack-art | 4 | Shia truck paint + art audit; own gate only cfclient (flaky) red -> in train |
| orch/pack-units-land | 1 | same unit-limit commit already on main |
| orch/pack-units | 3 | WIP soldiers close-up, not gated |
Repo has ~19.8k gate-logs/* branches: fetch takes ~5 min. Please prune.
