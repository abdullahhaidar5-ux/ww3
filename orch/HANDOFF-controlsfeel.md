# HANDOFF — orch/controlsfeel (2026-11-18)

Abdullah 2026-11-17 17:27 polish queue "Controls feel". Builds on orch/orderfeel (rings SELR, order markers ORDM, hover
attack/enter cursors already in `cursorIntent`) — nothing there was replaced.

## Done (view only, no simulation change, no key changed)
1. **Camera glide** — `camGlide()` in `src/08-ui.js` (state `CAMS` in `src/06-view.js`): WASD/arrows, edge-scroll and rapid
   scroll ease their speed in (rate 7/s) and out (8/s) with `exp(-dt*rate)`, so it is the same at 30 or 144 fps; Settings
   scroll speed still sets the top speed. A camera jump (`centerOn`) stops any glide. Wheel zoom already moved the zoom
   target toward the cursor; `camTick` now eases it a touch softer (8/s) with smoothing on.
   **Settings > Mouse > Camera smoothing** (`SET.mCam`, default On; Off = old instant pan and zoom ease).
2. **Selection** — pick-up pulse in the one ring system (`SELR.ts`): a newly selected unit's ring starts ~45% wider and
   brighter and settles in 0.32 s. Box select (`selBox`) = dark outline + bright line + corner brackets.
3. **Shift/Alt path preview** (`wayPreview`): while Shift or Alt is held with own units selected, a dashed amber line
   runs from where the group's path ends now to the cursor, with a diamond at the cursor (Alt slightly brighter).
4. Guards: `orch/decisions.mjs` (controlsfeel block, static) + `orch/controls.mjs` "camera feel" (no zoom jump, gentle
   start, 30 vs 144 fps within 6%, coast then stop, pulse tracked).

## Try this (2 minutes on PC)
Start a Battle, hold **D** for a second and let go, then roll the **mouse wheel** over a spot — the camera should glide
in and settle, not jerk. Then select a squad and hold **Shift**: you should see the dashed line to your cursor.
If it feels floaty, Settings > Mouse > Camera smoothing: Off.
