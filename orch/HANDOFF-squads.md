# HANDOFF squads (small change, as ORCH's note said: view only)

Soldiers now drop one by one as a squad loses health: visible soldiers = ceil(hp/max x N). A soldier who drops tips over, lies about
6 s, then disappears; a healed unit shows them again. Squad sizes and offsets untouched. No sim, balance, sync or checkpoint change
(count comes from hp). Members are the existing per-unit soldier models, no new meshes, so no new draw calls.
Change: `src/06-view.js` (walker loop). Screenshots: `orch/shots/squads-drop.jpg` (full 4 / half 2 / nearly dead 1),
`squads-drop-falling.jpg`. Script: `node orch/squadshots.mjs`.
Ignored per ORCH note: bigger squads, firepower scaling, per-member muzzle flashes, pips, garrison display.
Gates: see the gate result line below.
