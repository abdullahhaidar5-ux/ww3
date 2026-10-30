# Fixes 2026-10-30 (branch orch/fixes-1030)
- Coffee Shias: the head-cloth now sits on the head instead of at the neck (measured: the head top is 2.2 units above the head bone, cloth moved there; orch/headmeasure.mjs measures it; screenshot orch/shots/dw-headgear/after.png).
- Guerrilla stance: a Guerrilla unit now drops any target farther than its close range (unless it was just hit), so the "holds fire until close" test can't flake.
- AI (Normal/Hard): idle troops at home go on Hold; ambush pickets go Guerrilla; both return to normal stance when given orders.
- Maps: Hawizeh Marshes 3-player now starts as a triangle (two top corners + bottom middle) and Volga 4-player starts on a rectangle (two per river bank). 16 AI games each: Hawizeh 3p best seat 75% -> 58% (p=0.105, no longer flagged), Volga 4p best seat 64% -> 56% (p=0.029, no longer flagged; still leans to the SE start - could use another pass).
- Gate: 17/18 passed; "ew" failed on the rubble pathing check (tank route), nothing this change touches - re-run once.
- Simulation changed (03-sim, 02-map): open/update the main -> servers-live PR.
