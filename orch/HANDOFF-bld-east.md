# HANDOFF bld-east (branch orch/bld-east2) 2026-11-20
Redo of reverted East kit: geometry shared RU/CN/KP per kind/size (flag+board only on HQ geo), ~40% fewer parts, castShadow=false, 7-seg cylinders. Gate result: see HISTORY / gate/<sha> runs.
Left: Regional (SA AE TR EG PK): code exists on origin/orch/bld-regional (bfamReg), port it with the same lean rules (shared geo, no shadows) and BFON.G=1; then land separately.
