# HANDOFF mapfix2 (2026-11-15)

Task: finish map fairness (Abdullah 2026-11-15 04:09 "Yes"). Details and table: `orch/reports/mapfair.md` ("mapfix2").

Cause: a supply truck that came back to a corner of the HQ never unloaded (centre-distance test vs a square building), so one of the two starting trucks was lost for the whole game - always base 2 on caribbean/hormuzgate. Fix: unload by distance to the building edge (`src/03-sim.js` updHarv). Guard `orch/decisions.mjs` "mapfix2".

Proof: 120 AI-vs-AI games per map, position 1 wins caribbean 46%, hormuzgate 57% (before: 81% / 72% on 36 games each from main). Pooled over 13 two-player maps (104 games): seat 1 : seat 2 = 33 : 33 (was 19 : 11). Khyber 69% / lebanon 25% on only 8 games each - worth a bigger sample later.

Servers: simulation changed -> servers-live moved manually (see task text) after landing.
Ideas not needed any more: mirror G.treePos, coastSpot tie-break. Next if a map leans again: run the same per-side probe (same nation both seats, credits/buildings every 10 s for the first 3 minutes) before touching map data.
