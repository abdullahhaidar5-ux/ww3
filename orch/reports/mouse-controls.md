# Mouse controls (C&C Generals) — report

Branch `orch/controls`, final commit tested: `2d781d5` (includes latest `main`).

## What the mouse does now (default = Generals)
- Left-click a unit or building: select it. Shift+click: add to selection. Double-click: select all of that type on screen. Left-drag: selection box.
- Left-click ground with units selected: move. Left-click an enemy: attack.
- Ctrl+click: force-fire. A then click: attack-move. G then click: guard area. Alt+click: add a waypoint. S: stop.
- Right-click: cancels attack-move / building placement first, otherwise deselects.
- Right-drag with units selected: infantry line formation. Right-drag with nothing selected: fast camera scroll.
- Production building selected + left-click ground: sets its rally point.
- Settings > Mouse > "Alternate mouse setup" brings back the old scheme (right-click move/attack, right-drag line, F = attack-move). Each function can also be set separately; "Reset mouse settings" returns to Generals. The choice is saved.
- Phone taps unchanged (tap unit = select, tap ground = move).

## Test results (CIGATE on GitHub, commit 2d781d5)
PASS: check, servertest, headless, smoke4, mpsync, mpsync-server, art-smoke, art-mpsync, mapsweep, **controls (43/43)**, touch, audio, cfclient.
FAIL: migrate, migrate-abrupt, migrate-down — the known failure that also happens on `main` on GitHub's runners (being fixed on `orch/open-reconnect-phonebar`); this branch doesn't touch multiplayer code.
Locally `orch/controls.mjs` passed 43/43 twice; on GitHub it passed on both of the last two commits.

## Left / risky
- Nothing open for the mouse. Touch paths untouched; `orch/touch-controls` can build on this commit.
- Note for agents: `gh` login didn't work on this machine, so `orch/cigate.sh` can't read results here; I read the `gate-logs/<sha>-<test>` branches instead.
