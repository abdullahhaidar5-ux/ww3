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

## Vehicles + realistic looks (ORCH note, Abdullah 2026-11-13 20:43)
- Tanks / IFVs / APCs / ground AA / artillery dig a hull-down position with Dig in (I): ~7 s, berm + ramp + track marks, front damage x0.5 and side x0.6 (rear unchanged), turret still fires, no movement until a move order (select + right-click ground). AI digs in when idle (max 8 per team) and leaves with its attack wave. `G.dug` kind `vpos` + `u.dgv`, in checkpoint and client list. Not done: a Construction Vehicle digging it for another vehicle (vehicles dig themselves in).
- Looks: spoil lip, timber boards, firing steps, camo net on some, debris, scuffed earth on dugouts, trenches, sandbags and vehicle positions; instanced in the one mesh (cap raised 3600 -> 6000 blobs). Close-ups: `orch/shots/dugout-foxhole.jpg`, `dugout-trench.jpg`, `dugout-tank.jpg`.

## Replace with dugouts only (ORCH note, Abdullah 2026-11-13 21:38)
- Removed the automatic dig-in: `mods.dugIn` no longer cuts infantry damage while holding position (it now makes the Lebanese Shia's DUGOUTS take 30% less damage), UA's Territorial Defense lands veterans instead of "dug in" troops (`digT` gone), upgrade "Dug In" renamed "Hardened Infantry", PL/RS doctrine texts fixed. Guard in decisions.mjs. **Not done:** the defense tourney rebalance (`node orch/tourney.mjs`) - too slow in the sandbox; worth a run if infantry look weak on defense.

## Gate
- Local: `python3 orch/build.py --check` OK, `node orch/smoke.mjs` SMOKE PASS, `node orch/dugouttest.mjs` DUGOUT PASS, decisions see below / cigate result appended by the last line of this file.
- No local smooth runs (per CLAUDE.md). Local full `decisions.mjs` was too slow here (stopped); its static part passes and its new dugout runtime guard is in the file for CI.
- cigate: first pushed as `gate/8f7b45449a` (cancelled: stale), final code commit e649430 pushed as `gate/e6494308be`. On 2026-11-14 03:07-04:00 UTC GitHub Actions had every run queued (main, other gate branches too), so no gate/* status had arrived when I stopped. Check `gate/e6494308be`; known flaky: audio, mpsync, cfclient, icons, tutorial, mapsweep (re-run a failed job once).

## Pictures (looked at, JPG < 250 KB) — `orch/concepts/dugout/`
1-squad-digging-in · 2-dugout-with-occupants · 3-dugout-selected-leave (cursor + marker overlay added by the test; panel title there predates the "Dugout" rename) · 4-squad-back-out.

## Try for 2 minutes on PC
Select 8-10 infantry, press **I**, wait 5 seconds, then box-select the area and right-click far away (nothing moves, they are inside). Now click the dugout, right-click the ground: they walk out. Then send an enemy tank at an occupied dugout and see them thrown out.

## Look fix (ORCH note Sat 16:43Z) - ready
Trench floor, dugout pit and ramp were near-black rock blobs that read as black hexagons from above; now flat dark-soil blobs. Trenches lost the green camo net; other nets are duller olive-brown. Re-shot orch/shots/dugout-*.jpg (looked at). build --check OK, SMOKE and DUGOUT PASS locally. Status: READY (gate on gate/* still to be read by the conductor).
