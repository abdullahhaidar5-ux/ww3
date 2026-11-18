# HANDOFF endscreen (2026-11-18)

Shipped: the end-of-battle score screen (Abdullah 2026-11-17 17:27, polish queue item 1).
- `src/08-ui.js` es* block: banner (flag + emblem, Victory/Defeat, map + battle time), tabs Score · Timeline · Awards · Map,
  Zero Hour score table `esTable(S)` (also used by the Missions debrief in `src/12-campaign.js`), small war-room buttons
  (Continue = old #change, Rematch = old #again, skirmish only). Esc on another tab goes back to Score.
- `src/03-sim.js` stSample also records money earned so far (`T.st.mr`, every army sample, halves with it); endStats
  sends it as `S.m`. Sim counters only; rides in the team checkpoint (T.st). Stats come from the host / server ('est').
- `src/08b-aar.js` the after-action map now sits in the Map tab.
- Guards: `orch/smoke.mjs` (screen visible after a battle, one row per side, non-zero numbers, timelines);
  `orch/endstats.mjs` (manual QA, screenshots every tab).
- Test range: unchanged - no score screen (leaving the range goes straight to the menu).

Leftovers / ideas: the Share picture (esImage) still uses the older layout; could get the steel-teal table too.

## Try this (2 minutes, PC)
Open https://abdullahhaidar5-ux.github.io/ww3/ → Play → Battle vs 1 AI on Easy, win or lose a quick battle, then click
through Score → Timeline (switch Army strength / Money) → Awards → Map, press Esc, and hit Rematch.
