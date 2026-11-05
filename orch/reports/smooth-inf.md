# smooth-inf — infantry on bridges, swarms, wind (2026-11-05)

Owner's complaint (2026-11-04 19:29): "infantry on bridges, infantry swarms bugging out, small bushes swaying badly".
Probe: `node orch/smoothinf.mjs --tag before|after --scene bridge,blob,wind [--frames N --fps 15]` (per-tick unit traces on Fulda, deterministic
60 Hz stepping; frames are consecutive game frames). Before/after clips and contact sheets: `orch/shots/smooth-inf/`
(`bridge-before-after.mp4`, `blob-before-after.mp4`, `before|after/*-sheet.jpg`; trailer reference sheets in `before/trailer-*.jpg`).

## What was wrong (measured, 60 soldiers over a bridge / 120 vs 120 fighting, 900 ticks)
| problem | before | after |
|---|---|---|
| Bridge: biggest one-tick height jump of a soldier | 3.8-6.6 units (snap into the riverbed) | 0.35 |
| Bridge: ticks with a height jump > 0.8 | ~180 | 0 |
| Bridge: direction reversals per 1000 unit-ticks | 2-3.5 | 0.5-1 |
| Bridge: jerk p95 / p99 (velocity change per tick) | 0.13 / 0.42 | 0.077 / 0.26 |
| Blob fight: direction reversals per 1000 | 8.5-10.6 | 3.3 |
| Blob fight: jerk p99 | 1.1-2.1 | 0.67 |
Frame refs: `before/bridge-sheet.jpg` frames 2-10 show soldiers standing in the river beside the deck (rings over the water) and hugging the
parapet; `after/bridge-sheet.jpg` has everybody on the deck. Trailer `trailer-bridge-night.jpg` shows the same bunching at the parapet.

Causes found
1. **Bridge edge:** the walkable grid allows +-36 across the deck but the deck/parapets are +-33 and the height ramp dropped to riverbed height
   over the last 6 units, so soldiers walking the edge sank up to 15 units and popped back (viewH side ramp), and could stand in the parapets.
2. **No lanes:** everyone took the centre line and piled up.
3. **Swarm jitter:** `separate()` fully resolved every overlap every tick, order-dependent -> units pushed each other back and forth;
   a push that landed on impassable ground threw the whole push away (units vibrated at bridge sides / water edges).
4. **Wind:** grass shader moved tips by up to ~2.4 units on 5-unit tufts at 1.7 and 3.1 rad/s (flapping, blades stretched because only x/z moved);
   canopy shader used a per-vertex phase (`transformed.z*.15`) so a tree/bush deformed (shear) instead of leaning as one.

## Fixes (src only)
* `03-sim.js` `separate()`: foot soldiers (mass < 2) ignore overlaps under 0.7 and ease out the rest at 70% per tick, continuously (no on/off chatter);
  vehicles unchanged. A push onto impassable ground now slides along the edge instead of being cancelled.
* `03-sim.js` new `bridgeLanes()` (a correction is only applied if the new spot is walkable - first version dropped soldiers into water cells, caught by mapsweep): soldiers are kept inside the parapets (|across| <= 30 - radius), eased (<= 0.35/tick) into 4 lanes by unit id
  while on the deck; correction per tick capped at 0.9 so entering is smooth. Pure function of positions: identical wherever the sim runs.
* `04-gfx.js` `viewH`: full deck height to +-35 across, 30-unit ramp at the ends.
* `04-gfx.js` / `11-models.js` wind: slow (period 4.5-7 s), small (<= 0.4 unit tip on grass), phase from position only, base anchored, blade
  length kept (tip dips by a^2/2h), canopy leans as one piece; storm/sand/blizzard strength x1.4-1.8 via `WINDS` uniform set in `06-view.js`.
* `06-view.js`: foot soldiers' drawn position/height are low-passed (26/s and 16/s, snaps if > 24 / 9 units away). Render only; sim and snapshots
  untouched, works the same on host and clients. Foot-sliding: the gait already runs from the drawn speed, so it now sees the smoothed speed.

## Not done / notes
* Wind clips were not usable (software-GL meadow shot is nearly bare); wind is verified by the shader numbers above, please eyeball on a real GPU.
* Sim change (03-sim) -> `main -> servers-live` PR needed for Cloudflare battles.
