# Graphics Phase 2, rest — infantry + Middle Eastern buildings (branch `orch/gfx-infantry`)

**Infantry** (CC BY, Sketchfab via Objaverse; Mixamo rigs retargeted by renaming bones to the game's; meshes merged to one
body + one 768 px atlas, decimated to ~4.5k tris, WebP): `sol_w` US Marine desert camo (doctortex, 130 KB gz) for
US/EU/IL/UA/KR/TR/SA/AE/EG; `sol_e` Russian soldier green camo (doctortex, 111 KB) for RU/CN/KP/CU/IN/PK; `sol_m` woodland
militia fatigues (joneborden123, 136 KB) for IR/RS/DW. National colour is a tint over the camo. Each soldier gets a
merged-mesh rifle and a two-bone arm pose (low-ready); DW keeps its shemagh. Walk cycle is the existing procedural one.
Zoomed far out (cam > 480) the rifle/kit hide and legs stop animating. Old `soldier` model stays as fallback.
Not done: baked run/shoot/die clips and a separate low-poly distant mesh (no spare time; the sim has no hooks for them).

**Buildings** (Middle Eastern style for IR/RS/DW/SA/AE/EG, loaded only for those nations): HQ = sandstone house
(Avgust9, 134 KB), barracks = mud-brick block (filthycent, 225 KB), war factory = walled workshop (gerard0, 113 KB).
Other buildings and the Eastern/Western set unchanged (no suitable free models found for the rest).

**Size:** +849 KB total; a battle loads one soldier model (+3 buildings for ME nations). Credits added to the menu.

**Screenshots** (before/after, same seed): `orch/shots/gfx-infantry/{before,after}/` — `inf-*` close-ups, `bld-*` Iran/DW bases.
Harness: `node orch/gfxinf.mjs --tag X [--html old.html] [--bld 1] [--scenes map:P:A,...]`.

**Merged:** origin/orch/columns (its mergeSoldier runs on the old model; mine are single-mesh) and origin/main.
**CIGATE: PASS (16/16 incl. mapsweep, touch) on c28782c (report-only commit follows).
