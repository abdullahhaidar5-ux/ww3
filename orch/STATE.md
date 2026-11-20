# STATE — conductor run 2026-11-20 11:00 UTC
Main head b86a73e (30/30 gates green). No other conductor running (last train 20261119-2100, 14 h ago).
Train train/20261120-1103 = main + fix-superfreeze2 + pack-art (Shia compound kit) + bld-west (West base buildings); gate running.
- orch/fix-superfreeze2 (3 ahead, pushed 10:42): own gate so far 21/30 reported; superfreeze, smooth-pc, smooth-mp green; migrate-down red (main green) — re-run once.
- orch/pack-art, orch/bld-west: earlier red ONLY on gate/superfreeze; re-gated inside the train.
- orch/pack-systems (10 ahead): smoothrender3 numbers only, cap stays 300 — not landed. orch/trailer-clips (18), orch/trailer (13): not Battle-ready, not landed. art-east10: handoff only.
- Stale locks (taken/*, no orch/ branch or 5+ days old): ~100 old taken/* branches, all from Nov 13-18; none are fresh.
Tooling: ~22k remote refs; fetch ~6 min (background it). Local smoke/decisions time out here; the gate decides.
