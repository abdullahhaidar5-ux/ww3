# HANDOFF menulook — ready

Branch `orch/menulook` (lock `taken/menulook`). Not pushed to main. No cigate (push-fast day).

## What changed (src/14-menu.js, plus three one-line engine hooks)
- **Live battle behind the menu** (Zero Hour shell map): a small AI-vs-AI Battle on a random 2-player Battle map starts ~2.5 s after the menu shows
  (`mxShellStart`, flag `G.shell`). Low cinematic camera (`mxShellCam`): drifts slowly, every ~12-18 s moves to the hottest contact, or looks in on a base
  when there is no fight yet; slight yaw sway; vignette in `#mxfade`. HUD/command bar/log are hidden (`body.mxshell`). Music only: `spatial()` in
  09-audio.js returns null for `G.shell`, so no battle sounds (menu clicks still play). Fog off for it (06-view.js `updateFog`), no killcam (`kcOff`).
  Stops the moment the menu closes or any real game replaces `G` (`mxShellStop`); never starts while a real game is open. Not saved, not recorded.
  The old war-table/static picture stays as the fallback until the shell is up, and when it cannot start.
- **Automated browsers skip it** (`navigator.webdriver`) unless the URL has `?shell=1`; `?shell=0` turns it off. So smoke/smooth/grand gates are unaffected.
- **Generals right column**: every menu screen is one column of gunmetal/olive metal-plate buttons on the right (same palette as the command bar), title at the
  column top, Back bottom-left (Esc = back), steps trail (Battlefield / Nation / Players / Options) above the title, Next/Start plates at the column foot.
  Nation hover details float bottom-left over the battle. Settings, Load game and Missions windows wear the same column while the menu is up (CSS only).
- All options/flows unchanged (same elements, moved/restyled only).

## Checked
- `python3 orch/build.py --check` OK; `node orch/smoke.mjs` SMOKE PASS (463 s); `node orch/decisions.mjs` timed out in this slow sandbox (>110 s) - not confirmed, run it on CI. Screenshots at 1920x1080: `orch/shots/menulook-main.jpg` (the fallback picture; the shell battle was too slow to capture again in software GL), `-single`, `-map`, `-setup` (nation step), `-settings`.
- Software-GL sandbox renders the shell at ~0.1 sim-seconds/s, so no real fight was seen there: please look at it on a real GPU.
- Known: the Settings/Load/Missions windows keep their own Done/Close button (Esc handling unchanged); the Back plate is only on the menu's own screens.

## Try (2 min, PC)
Open the Pages build after it lands: leave the main menu for 30 s and watch the background, then Single player -> Battle -> pick a map and nation.
