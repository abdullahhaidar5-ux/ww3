# HANDOFF zhfeel2 (2026-11-15)
Checked each item first; most existed, so polished instead of adding systems.
1. Radar events: Space already jumps to the last radio report (09b-radio radJump). NEW: every radio report with a place also rings the minimap (`mmPing` in 06-view: red attack, yellow strike, green done/complete; pool of 12).
2. Veterancy: chevrons + gold flash already in 06-view. NEW: floating "PROMOTED · RANK" text (vetCue in 09b-radio).
3. Control groups: number tags above units + double-tap centering already exist (08-ui `sqLast`). Unchanged.
4. Placement footprint: NEW `plFoot` (06-view drawHUD): green/red grid under the ghost (red = water/bridge/blocked or invalid spot).
5. Score screen: existed (08-ui ES_ROWS, Watch replay). NEW rows: Buildings built, Supplies collected, General's powers used, Score. Sim counters st.bb / st.sc / endStats sco (03-sim) -> sim change: servers-live must move.
Guards: orch/decisions.mjs "zhfeel2". Status of local gates / landing: see end of file.
