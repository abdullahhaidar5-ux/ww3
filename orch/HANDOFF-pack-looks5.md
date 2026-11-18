# HANDOFF pack-looks5 (2026-11-18)
Done (branch orch/pack-looks5): removed dead RMAP.tank.OB t55; RS/DW/RV/OB artillery no longer gets the Msta; RV joins EASTVEH truck family; CN/IN/PK tank paint variants (cn72/in90/pk72, existing models, no new meshes); guard in orch/decisions.mjs ("national vehicles"). build.py + --check pass.
Not verified: decisions.mjs / smoke / cigate did not finish in the sandbox (too slow) - run orch/cigate.sh before landing.
Left: West/East/Regional families (truck/AA/EW/ATGM looks), per-family screenshots orch/shots/vehicles-<family>.jpg, night headlights, wet ground in rain.
Try (2 min, PC): Test range as Palestine Islamic Brigade, spawn artillery: should be a rocket truck, no tank; then as China vs India vs Pakistan, tanks differ in colour.

Gate (commit 6dea3d5, gate/6dea3d58a7): 26/27 green; gate/superfreeze FAILED twice - rangefreeze after "OB ok": a new MeshDepthMaterial program linked during the Strike (strike model "Box001", depth `5:false->uv`), i.e. a pre-warm gap. Same failure on ef53a6b (pack-looks4); main 78e25dc was green. NOT landed. Next: pre-warm the strike model's depth program at battle load (or check if my paint variants matter - they should not: no new models), then re-run cigate and land.
