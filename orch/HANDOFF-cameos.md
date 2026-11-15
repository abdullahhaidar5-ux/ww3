# Handoff: cameos (2026-11-15)
Build/train buttons and the selected-unit portrait now use Zero Hour-style cameos painted in code: `src/08q-cameos.js` (`CAMEO.unit` / `CAMEO.bld`), called from `drawUnit` / `drawBld` in `src/08j-uikit.js` (the class still comes from `iconClass` / `bldClass`; Ayatollah / Dear Leader keep their painted busts).
- Nation flavour: uniform + headgear from `SOLX` (11-models.js: beret / cap / shemagh / helmets), vehicle paint per nation (`PAINT`), sandstone arched compounds for Arab/Shia nations, concrete elsewhere, team-colour stripe + edge.
- Buttons (`bg:true`): dark backdrop, soft top-left light, team edge. Portrait / `UK.icon` (`bg:false`, now 208x160, cache key includes the nation): transparent, solid outlined shape, so the `zhHolo` mask (alpha) still reads. `UK.icon(kind,col,bld,st,fac)` has a new 5th arg; selection-card callers pass the team's nation.
- New class `ammo` (Ammo Truck was drawn as a soldier before).
- Guard: orch/decisions.mjs "cameos" check (all buildable units/buildings of every PLAYABLE nation draw >400 opaque px). Contact sheet: `node orch/cameos-sheet.mjs` -> orch/shots/cameos.jpg (IR RS US RU).
- Not run here: smoke / smooth (sandbox too slow) - rely on the GitHub gate. Please try: start a Battle as IR, look at the build tabs and select a tank (hologram portrait).
