# STATE — conductor run 2026-11-20 09:00 UTC
Main head b86a73e (status success, West art bundle 4). No train/* newer than 20261119-2100 (12 h) — no other conductor running. No train built this run.
Blocker: gate/superfreeze red (rangefreeze stalls 115-750 ms on runners). Both pending finished branches fail ONLY that gate:
- orch/pack-art (Shia compound kit 29853d3; handoff says superfreeze red twice, other 28 green)
- orch/bld-west (West base buildings 0f63d63; 26 statuses, only gate/superfreeze red)
Waiting: orch/fix-superfreeze2 (EW ring + Test-range loop fixes, 2 commits, no gate yet) — land it first, then re-gate the two above.
Other: orch/pack-systems (10 ahead, smoothrender3 numbers; cap stays 300), orch/trailer-clips 18 ahead, orch/trailer 13 ahead, art-east10 handoff only. Old stale: ghostslot, testrange, techbldgs, ammozone (~680 behind). Conductor-prompt candidate list is stale (onegame, nations20 etc. landed long ago).
Tooling: ~22k remote refs; fetch takes ~6 min here (use background fetch).
