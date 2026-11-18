# HANDOFF pack-looks4 (PACK looks helper, 2026-11-18)

Findings
- Vehicles in battle are NOT the code-built shapes: modelFor() (src/11-models.js) uses the glb models picked per nation in RMAP/RMOD; the code-built geoFor kit in 04-gfx.js is only the fallback before models load. So "national vehicles" is mostly an RMAP/RMOD job (which model each nation gets) plus new glb models via build.py --add-model; new code-built hulls would hardly ever show.
- Still sharing one model: CN/IN/EG/PK/RU all T-90; every West/East truck/AA/ew/cbr/atgm is the same M35 / Ural; RS/DW/RV/OB have no arty/AA model of their own (RS/DW arty falls back to the code-built rocket truck).

Done (branch orch/pack-looks4, commit "RV and OB get their own tank models", NOT on main)
- RMAP.tank: RV -> T-62, OB -> T-55 (were the generic tank). One-line change + HISTORY line.
- Full cloud gate: all 26 green except gate/superfreeze, which failed twice (rangefreeze, "OB ok" printed before the FAIL; the earlier nation that failed was not identified; HANDOFF-pack-looks2 documents rangefreeze flakiness). Not landed, per the rule.

Left: everything else in items 1 and 2 (other families, headlights, wet ground). Next helper: re-run cigate on this branch (or on main first to see if superfreeze is red there); if green, land. Local smoke times out in the sandbox (>10 min).

Try (2 min, PC, after it lands): Test range as Iraqi Shia Brigades, spawn tanks; then Palestine Islamic Brigade - the tank silhouettes should differ from other nations.
