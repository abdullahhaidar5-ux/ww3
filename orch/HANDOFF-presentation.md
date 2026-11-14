# HANDOFF presentation (branch orch/presentation)
Scope changed by ORCH note (Abdullah 21:36): stats screen DROPPED ("Leave as is"); end screen untouched.

Done, in plain words:
- Command bar in the Classic Generals order: minimap | selected unit/building + money | build/command grid (CSS in src/08o-genbar.js, no second HUD).
- Camera: battles start lower and closer (distance 430 -> 300, pitch curve lower), wheel zoom now goes from 90 (close-up) to the old high view with easing; Q rotate untouched (src/06-view.js placeCam, ZMIN; 08-ui.js).
- Veterans (existing e.rank): gold chevrons on the bar portrait, Elite silver-blue and Heroic gold shimmer under the unit (one cached sprite each, ranks 2-3 only), promotion chime + the nation's existing "ready" radio line for Elite/Heroic (vetCue in 09b-radio.js).
- Hotkey letters added to the command strip buttons (em.hk in tcStrip) - NOT visible in my shots; the strip may be touch-only code, check on PC.

Pictures: orch/shots/presentation-camera.jpg, presentation-bar.jpg, presentation-veteran.jpg (stats shot dropped with the stats screen).

Gates: build.py --check passes. smoke/smooth are too slow in this sandbox (CLAUDE.md), orch/cigate.sh was run once, result below.

Left / known:
- Unit info panel is clipped by about one line when the Ammo row shows (720p).
- Build/unit buttons have no hotkeys: letters Q/W/A/S/D are taken by camera, needs a key-table decision.
- Missing voice lines: a dedicated "promoted / veteran" line per nation (using existing 'hsel' for now).
- Ask Abdullah: play a battle 2 minutes, scroll the wheel all the way in, and promote a unit.
