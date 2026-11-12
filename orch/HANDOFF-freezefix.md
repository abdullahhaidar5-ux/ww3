# Handoff — freezefix (2026-11-12 08:55 UTC)

**State:** branch `orch/freezefix` (0fd2bbb + this note) is finished and gated twice, NOT landed (conductor lands).
What was found/changed and the before/after table: `orch/concepts/freezefix/README.md`.

**A second firing of this helper arrived at 08:54 UTC with new evidence; it stopped by its own rule (lock exists, branch
pushed under 60 min ago). Nothing was done for it. What it said, and what is and is not covered:**

1. *"Kheibar strike still freezing" on Abdullah's Windows laptop (ROG, 240 Hz, Chrome, ANGLE/Direct3D).* Covered by
   this branch: the cause was the "BREAKING NEWS" corner picture compiling a second copy of every shader in view 1.2 s
   before the first hit (in flight, every strike that shows new things in the corner view). Light count was already
   constant. The in-game recorder exists (Settings → Graphics → Performance log…, frames over 250 ms).
2. *Fight-it battle from the grand campaign stuck at "PREPARING GRAPHICS… 78%" with Chrome "Page Unresponsive".*
   **NOT covered — needs its own helper.** Known from this helper's runs: the 78% step is `warmShaders()`
   (`src/05-fx3d.js`, called from the load step list in `src/08-ui.js` ~1121). On PC it is ONE synchronous task: it
   instances every model (plus a burnt copy), then `R3.compile(SCN,CAM)` + one full draw. Even the test browser logs
   "shader warm-up 25–33 s, ~210 objects"; on Direct3D each program link is far slower, hence "Page Unresponsive".
   The phone path next to it (`warmShadersPhone`) already does the right thing: a few models per frame,
   `compileAsync`, progress on the loading screen, a watchdog. Suggested fix: use that chunked path on PC too (only the
   nations in the battle, keep the strike/marker/rubble/corner-picture warm-ups this branch added to `warmShaders`),
   and add per-stage load timing to the Performance log. The Performance log deliberately ignores the first 3 s of a
   battle and loading, so it does not record this stall yet.

**For Abdullah (2 minutes, PC, once this branch is live):** fire one Kheibar strike as Iran. If it still freezes:
Settings → Graphics → Performance log… → Copy → paste to ORCH. The 78% load hang is a separate fix, not in this branch.
