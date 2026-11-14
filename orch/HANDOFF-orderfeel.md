# HANDOFF — orch/orderfeel (2026-11-14)

Abdullah 2026-11-13 17:26 "Focus all effort on wrapping up conquest and battle"; 17:31 "Can we start on these now?"
(selection rings + order preview, clearer goals on screen). Branch `orch/orderfeel`, lock `taken/orderfeel`. Not landed —
the conductor lands it after the gate.

## Done
1. **Selection rings** — `src/06d-orderfeel.js` `SELR`/`selRings()`: one instanced mesh (one draw call) replaces the old
   one-mesh-per-unit rings. Team color, thin line with a soft glow and a dark edge, tilted to the slope; round for soldiers
   and aircraft, oval for vehicles/ships (follows the hull's facing), rectangle with stronger corners for buildings;
   fainter hover ring (`HOVE`, set by `cursorIntent`). Color-blind setting keeps the segmented ring. Health/morale/ammo
   bars are smaller: selected units show only health unless morale/ammo is below full; damaged units still show health.
2. **Order markers** — `ORDM`/`ordMark()`: one instanced mesh, drawn on top (never hidden behind a building), at most 12
   alive, a new order of the same kind replaces the old one; hold then fade (~0.9 s). Move = green chevrons closing in,
   attack = red reticle that follows the target, attack-move (F) = orange chevrons, guard (G) = blue ring, queued /
   waypoint = amber diamond, line order = thin bar. Right-drag line = a ghost ring per soldier where the line order
   (`fmLayout`, same math as the sim) will put him, plus the bar. Shift/Alt queued paths: one numbered amber line per group
   while selected (was one line per unit). `mark()`/`markT()` in 08-ui are now just entry points into ORDM (PINGS stays
   for power/effect rings). No key changed.
   **Also fixed:** `screenToWorld` hit a flat plane at height 0, so on raised ground a click landed beyond the cursor; it
   now walks onto the real terrain height (falls back to the plane if anything is odd).
3. **Goal line** — `cqBanner()`/`goalText()` in `src/08c-towns.js`: one calm line under the top bar. Conquest
   `Setup 1:29 · no firing yet · Take towns for income (0 of 16 held) · Destroy the enemy base (5 of 5 structures left)`
   (counts the base buildings that actually decide Conquest: HQ, Barracks, War Factory, Airfield, Shipyard); Battle
   `BATTLE · Destroy every enemy building (N left)`; Missions: title · current objective ☐ · "N of M done" · status. The
   old mission objectives box (`campHud`) is removed. Short flash when the line's numbers change. Missile/uplink
   countdowns stay as a small second line.
4. Guards: `orch/decisions.mjs` static (no old RINGS, selRings/ordMark exactly once, no other file draws a ring from
   G.sel, mark/markT go to ordMark, `ORDM.cap` ≤ 16, no campHud) + runtime (ring count = selection, 40 markers → ≤ cap,
   2 instanced meshes, Conquest and Battle goal text). SYSTEMS.md rows added, DECISIONS.md + HISTORY.md lines.

## Not done / notes
- The order buttons in the lower-right and the build bar were left alone (orch/sweepfixB owns them).
- Software-GL screenshots wash colors toward cyan; on a real GPU the rings/markers should read greener.
- `ORDM.age` is a screenshot-tool hook only (holds markers at a fixed age); null in play.
- The rectangle on big compounds (HQ) is partly hidden under the building roof — it follows the building's footprint
  (`size`), not the whole yard.

## Pictures (orch/concepts/orderfeel/, 1280x720 JPG)
before-selected-group / after-selected-group, before-move-marker / after-move-marker, before-attack-move-marker /
after-attack-move-marker, after-attack-marker, after-line-ghost, after-queued-path, after-conquest-goal,
after-building-selected, after-battle-goal. Script: `node orch/orderfeelshots.mjs --tag after` (ONLY=cq|bt).

## Gate
See the end of this file (filled in after `orch/cigate.sh`).

## Ask Abdullah (2 minutes on PC)
Start a Conquest game, box-select a mix of soldiers and tanks, then right-click the ground, press F and right-click,
and right-drag a line: do the rings and the ground markers make it obvious what you just ordered? Link:
https://abdullahhaidar5-ux.github.io/ww3/
