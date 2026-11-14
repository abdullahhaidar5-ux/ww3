# HANDOFF leaderlook (2026-11-14)

Abdullah (2026-11-13 20:01 Chicago): "Make the ayatollah and dear leader more realistic and human looking".

## Done (view only, no simulation change)
- Both leader units (kind `cleric`) are now drawn on the realistic soldier body and skeleton (the bare-faced `sol_m` rig:
  real face texture, hands, proportions, the procedural walk) instead of the old code-built box figure
  (`leaderObj` → `modelFor` → `newSoldierKit(...,'ldr')` → `leaderKit`, painted by `spyPaint` with `LDRLOOK`, all in `src/11-models.js`).
  - **Ayatollah (IR / RS / DW):** fictional elderly senior cleric — white wrapped turban, grey hair below it, a full grey
    beard painted onto the face (follows the jaw) with body under the chin, a light qaba robe under an open dark aba
    cloak with a thin gold edge, hands folded at the waist with prayer beads. Green halo on the ground.
  - **Dear Leader (KP):** fictional middle-aged head of state — dark high-collared tunic suit (stand collar, small gold
    collar stars, five buttons, breast pockets), neat short dark hair, arms at his sides. Gold halo on the ground.
  - Each walks at a calm pace (never jogs) between two armed bodyguards of his nation (the unit is still one unit).
  - Leader cloth uses a clean material (no camo, no field grime: the dust tint showed as pale blotches on dark cloth).
  - Fictional people only: no spectacles, no signature hairstyle, no real names. The old stand-in (shown only until
    the soldier model has loaded, then swapped) lost its spectacles/black turban and the Dear Leader's shaved-sides hair.
  - KP battles now also load `sol_m` (135 KB) because KP's own soldier wears a mask.
- Command bar + selected-unit card: each leader has his own painted bust (`case'ayatollah'` / `case'dearleader'` in
  `src/08j-uikit.js`; the unit card / group strip pass the unit's stats so the Dear Leader gets his own picture).
- Guard: `orch/decisions.mjs` "leader look" (makeObj uses leaderObj, MCFG.cleric/leaderKit/LDRLOOK paint exist, Dear
  Leader branch, no spectacles/rifle/combat kit, own icons).
- Proof script: `node orch/leadershot.mjs --p IR|KP [--repl dir]` (based on spyshot).

## NOT done — ORCH note on this branch (orch/LEADERLOOK-NOTE.md, Abdullah 21:50–21:55)
ORCH pushed a note asking this helper to also simplify the leader MECHANICS (no auras/buttons, both leaders: all your
units take 5% less damage and deal 5% more damage while he lives; remove E/Shift+E, the eight abilities, T.ld etc.,
update AI, missions, achievements, encyclopedia, orch/leaders.mjs, CLAUDE.md, tourney balance). That is a simulation
change well outside this run's view-only brief, so it was **not** done here; the note is left in place (not deleted)
so the next helper/conductor picks it up as its own gated job.

## Gate
See the end of this file (filled in after `orch/cigate.sh`).

## Pictures (looked at)
`orch/concepts/leaderlook/`: `ir-close.jpg`, `ir-zoom.jpg`, `kp-close.jpg`, `kp-zoom.jpg` (each leader beside a rifle squad
close up and at the normal battle camera), `icons.jpg` (the two busts large and at command-bar size, next to the rifleman).
Known limits: at close zoom the beard is a painted shape (a little flat); the faces are the soldier model's one face
(generic young-ish man), so age reads from the beard / grey hair only.

## Credits
No new assets: built on the existing soldier model (already credited) and code-made clothes.

## Abdullah, try for 2 minutes (PC)
After the conductor lands it: https://abdullahhaidar5-ux.github.io/ww3/ → Single player → Battle as Iran, build the
Ayatollah at the Barracks, zoom in next to a rifle squad and walk him around; then a Battle as North Korea and do the
same with the Dear Leader. Do they read as real (fictional) people at your normal zoom?
