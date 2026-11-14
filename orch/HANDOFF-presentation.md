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

Gate result: ready for the gate, not yet judged. `orch/cigate.sh` pushed gate/752cd2b1b5; run 43554480066 was still "queued" 40 min later (GitHub runners busy). Conductor: check `gate/smooth-pc`, `gate/smooth-mp`, then land. Status: READY pending gate.

## genbar pass (Sat 2026-11-14, Full Generals redesign) - look done, later notes NOT done
What changed (CSS only in src/08o-genbar.js, no new HUD, no per-frame work, PC width only, tabs/buttons/hotkeys all still work):
- The bar is now a framed gunmetal plate: bevelled edges, rivets, fine brushed lines, an angled top edge that rises in the middle.
- Minimap sits in a heavy bezel on the left with a "TACTICAL MAP" stamp.
- Money (big gold readout) + faction + Pause/menu on the top edge of the middle block; General rank on the top edge at the right.
- Middle: big framed portrait of the selected unit/building with name, health bar, rank stripes, tip text (the old info panel restyled).
- Right: stamped metal tabs (Build / Units / Upgrade / Powers) above a grid of square-ish icon buttons (5 across, 3 rows, scrolls for more): icon, short name, cost badge, queue count, progress bar, gold hover, pressed-in state, greyed when unavailable. Strike Center + Launch in its own panel on the right edge.
- Bar height is 36% of the window (256-360 px).
Pictures: orch/shots/genbar-before.jpg, genbar-after.jpg (same frame, Construction Vehicle selected, Build tab), genbar-step4..7.jpg (Units tab steps).
Tool: orch/genbarshot.mjs (loads a skirmish once, then re-screenshots after CSS changes; slow in the sandbox, ~4 min per picture).

NOT done - ORCH notes added to orch/PRESENTATION-NOTE.md AFTER this task was written (09:14-09:23) change the plan: no tabs (context-only grid), no portrait/selected panel, powers + Strike as an icon column on the right edge of the screen outside the bar, money/power moved into the top-centre strip, hotkey letters hidden. I did only the cheap one (hotkey letters hidden: #tstrip .hk). The rest are functional changes (selection-driven grid, tutorial/hint text that says "Build tab", decisions.mjs guard) and need a fresh run; this pass is the visual shell they build on (plate, bezel, square button grid).
Known: hotkey letters are not on the grid buttons (Q/W/A/S/D taken by camera, and the note says hide them); wide Upgrade/Powers buttons span 4 columns and clip long descriptions to 2 lines (full text in the tooltip); bar uses 5 columns at 1366 wide.
