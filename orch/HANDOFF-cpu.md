# HANDOFF cpu
Run on 2026-11-08 03:35Z stopped before code changes: smooth and grandsmooth were already FAIL on main 873fbf1e in the sandbox (see orch/reports/cpu.md).
Next: rerun each gate alone on a quiet machine (CI), get a baseline, then slice 1 (frame-budget scheduler after render in 08-ui loop), slice 2 (extend QUAL in 06-view.js + Performance Auto/Quality/Speed setting), slice 3 (worker for grand monthly AI), slice 4 (profile-driven).
