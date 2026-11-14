# HANDOFF dugout (branch orch/dugout)

Owner (Abdullah, Fri 2026-11-13 20:00 Chicago): "Make it digging in like garrisoning units in that you have to remove them from the dugout".

## Done
- **Dig in (I)** no longer puts a stance on soldiers. The squad (up to 12 per dugout) digs a **dugout** where it stands (~4.5 s) and goes **inside** it the way infantry enter a building: off the map, they fire from inside (20% longer range), are safe like a building garrison, and are thrown out hurt if it is destroyed.
- They **stay until taken out**: select the dugout + right-click ground = they leave to that spot; right-click the dugout with more infantry adds them. Move orders (also Ctrl+A or a box that includes the dugout) never pull them out. An empty dugout stays for reuse and fades after ~100 s unused.
- **One garrison system**: a dugout is one more slot of the city-building garrison code (`G.civ` entry `dug:1`; `enterGarrison` / `leaveGarrison` / `updGarrison` / `collapseCiv` shared). Look + client sync = `G.dug` entry kind `hole` (`d.ci` = civ slot), instanced earth ring + sandbags + team stake + flag; label "DUGOUT n/12" with occupant pips.
- Checkpoint / save / host migration: `ckRestore` makes room for dugout slots (`dugEnsure`) and rebuilds the cell map; old saves load (old `fox` holes still draw/cover, nothing creates them).
- AI digs in as a squad when idle (max 6 dugouts per AI team) and comes out when its wave is ready (`aiDugRelease`). Zealous never-rout untouched.
- Removed: `u.dig`, `startDig`, `digTick`, foxhole texts. Never touched `src/13*`.
- Guards: `orch/decisions.mjs` ("dugout" static + runtime), new `node orch/dugouttest.mjs` (SHOTS=1 for pictures), `orch/tacttest.mjs` updated.

## Gate
- Local: `python3 orch/build.py --check` OK, `node orch/smoke.mjs` SMOKE PASS, `node orch/dugouttest.mjs` DUGOUT PASS, decisions see below / cigate result appended by the last line of this file.
- No local smooth runs (per CLAUDE.md). cigate: see bottom.

## Pictures (looked at, JPG < 250 KB) — `orch/concepts/dugout/`
1-squad-digging-in · 2-dugout-with-occupants · 3-dugout-selected-leave (cursor + marker overlay added by the test; panel title there predates the "Dugout" rename) · 4-squad-back-out.

## Try for 2 minutes on PC
Select 8-10 infantry, press **I**, wait 5 seconds, then box-select the area and right-click far away (nothing moves, they are inside). Now click the dugout, right-click the ground: they walk out. Then send an enemy tank at an occupied dugout and see them thrown out.
