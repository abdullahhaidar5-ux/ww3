# HANDOFF captest (2026-11-19)
Branch `orch/captest` (never merge: POP_CAP=500 there; main stays 300).
Done: `orch/capprobe.mjs` (one scenario per run: --players N --per P --fill pop|units), `.github/workflows/captest.yml` (8 jobs, runs on push to orch/captest only), results in `orch/reports/captest.md` + `captest-raw.json`.
Left: (1) multiplayer number (host + 1 client snapshot/tick p95 for 1v1 at 500) - reuse `mpProfile` from smooth.mjs with the army-adding block of capprobe; (2) census is taken after a 20 s fight, so units alive are below target - spawn, census, then measure if exact counts matter; (3) re-run after scene-tree work (matrix freezing/instancing) to see if 500 becomes smooth; (4) nothing else pushed to main.
Re-run: push any commit to orch/captest (or Actions > Cap test); logs print JSON after `=====JSON=====`.
