# Handoff — camphud (branch orch/camphud, 2026-11-12/13)

State: DONE on the branch, waiting for the conductor to land it. Never pushed to main. View/UI only (no simulation,
save or sync-hash change). Lock branch: taken/camphud.

What it is (plain words): the grand campaign screen has ONE top bar (time left, six resource chips in the middle,
Nation · Economy · Military + a small ☰ menu right), ONE "Go to" list on the minimap instead of ten region buttons,
at most five alert chips sorted by urgency with "+N more", and a Nation window with six groups instead of ~36 tabs.
Pictures, the tab mapping and notes for the next helper: orch/concepts/camphud/README.md.

Files: src/13c-grandui.js (guCss, guTop, guClockUI, guPop, guGoUI, guTopFit, guTrend) · src/13j-nationpanel.js
(NP_GROUPS, npDraw, npGroup, npGo/npBack, the new Summary screen) · src/13l-galerts.js (alBar: five chips, urgency,
"+N more") · src/13zzz-gpanels.js (Esc: small menu → one step back → close) · small edits: 13h/13j-grandmilui (old
bar hooks geUiTop/gmilUiTop removed), 13y-gforce (gfChip returns numbers), 13e-grand3d (legend 30 px higher),
13u/13r (open another nation through npGo/npOpen), 08n-readable (.gpop in the text-size list), 08i-hud (what's new).
Tests changed: orch/decisions.mjs (new "camphud" guards + #npBody), polishtabs, ctabs2test, gnettest (Save & exit is
in the ☰ menu), grandtest (gfChip). Tool: orch/camphudshots.mjs.

Checks: build.py + --check OK; the camphud guards pass locally (1280 wide, also at 130% text); full gate = orch/cigate.sh
result in the final report / LOG. Local smooth/grand runs prove nothing in the sandbox.

Notes
- ORCH pushed orch/CAMPHUD-LAYOUT.md onto this branch mid-run (same layout as the task; it asked to be deleted, done).
  It listed the ☰ menu as "Save & exit and Settings"; the task prompt also asks for Help, which is in.
  Its optional source orch/reports/eu4-gap.md (branch orch/eu4audit) does not exist yet, so the mapping is my own.
- Not done / ideas: window items do not light up while their window is open; "Help" re-shows the first-minute tips
  (there is no campaign help page yet); News and Encyclopedia are not Nation screens today.
- Seen, not mine: at 1280 wide the army cards overlap the minimap and the round buttons (before and after).
