
# ORCH to presentation — READ FIRST: Abdullah's answers (21:36), these REPLACE parts of your task
- **End-of-match stats screen: DROP IT.** He said "Leave as is". The end screen (showEnd in src/08-ui.js) and replays already exist; do not change them.
- **Veterans: YES, restyle the EXISTING ranks** (e.rank, drawn in src/06-view.js about line 206): stripes or chevrons, a glow for high ranks, a promotion voice line. No second rank system.
- **Camera: YES.** The camera exists (cam.dist, placeCam in 06-view); change only the default pitch, distance and zoom range.
- **Generals-style command bar: YES**, as in your task.

## Command bar (Abdullah 22:42, after seeing today's bar): "Full Generals redesign"

Rebuild the bottom bar to LOOK and FEEL like the C&C Generals Zero Hour command bar. It should be an original design (no copied art or logos) that reads as that bar:

- a framed metal or military panel across the bottom;

- the minimap in a bezel on the left;

- the selected unit or building portrait with health, rank and ammo in the middle;

- a big square icon button grid for build, units and commands with hotkey letters;

- money and power on the top edge;

- the generals' powers and Strike Center readiness on the right.



Reuse the existing HUD code; it must be one HUD. Readable from a normal PC distance. Before/after screenshots.
