# Decals fix (2026-11-05, branch orch/decals-fix)

Abdullah 2026-11-04: "designs hang over the wings of planes, numbers on ships are larger than the ships."

## Cause
Every marking (roundel, fin flash, flag, hull number, slogan, stencil) was an axis-aligned card sized as a share of the
whole model (jet roundel 16% of length, hull flag 17-18%, ship flag up to 12 units, ground flag 17%...) and pushed out to
the ray-hit point of ONE probe, so it overhung wing edges, fins and hull curves; digits on the `-z` side were also in reverse order.

## What changed (src/11-models.js only, visuals only)
- `kitDec()` (+ `kitPanel`, `kitSurf`): sizes every decal from the **measured surface under it**. It marches probes outward to find the flat
  panel around the decal centre (stops at a gap or a step), lets the decal use only a share of it (<= 80% everywhere, roundels 1/3 of the chord,
  fin flash 60% of the fin), then probes 4 corners + 4 edge middles + centre, shrinks the decal until all 9 lie on the surface (plane-fit residual
  <= 4% of its size + 0.03), tilts it to the fitted surface normal, sits it just above the highest point, and **skips it** if it cannot fit.
- Per-type rules: jet roundels on upper AND lower wing at ~2/3 span; fin flash inside the vertical tail with a small serial under it; heli/transport
  flag on the tail boom; ship/boat hull numbers on both bow sides, height <= 40% of hull-side height (smaller or none on small/round hulls, none on landers);
  ensign only on a small pole at the stern (<= 8% of length, pole shorter); tank/truck flags <= 7% of hull length on the side, a small painted flag on
  the deck, KP star on the turret roof, IR hull number and KP/RU stencils at real stencil size; drone stencils fitted onto the wing top, tiny serials.
- Numerals now read left-to-right on both sides (the far side used to be mirrored).
- **Faster too:** probes no longer ray-cast (2 ms per ray on a warship) but query a 2D triangle grid built once per model (`kitGrid`). Kit building for all
  168 model/nation kits of the 18 nations: 0.56 s total (the old code took ~0.1 s per ship).
- `orch/decalcheck.mjs`: builds 13 unit types x nations in a headless battle and re-checks every recorded decal (`userData.aud`): 4 corners + 4 edge
  middles + centre ray-probed along the decal's own normal (miss = overhang, far below = floating, above = buried), <= its allowed panel share (<= 80%),
  <= its semantic cap (roundel, numeral, flag...), <= 15% of length for pole flags, never larger than the model. `--facs all|IR,US,..`, `--kinds`, `--verbose`.
  Prints DECALCHECK PASS/FAIL. New CI job `gate/decals` (all 18 nations); cigate.sh now waits for 22 results.
- Result on all 18 nations: 635+ decals audited, 0 failures.

## Not done / notes
- Landers and subs get no hull markings (no flat panel big enough; the pole ensign stays on landers).
- Close-ups: `orch/shots/decals-fix/after/` (PC IR/DW/IL/US/RU/KP).
- Phone-size screenshot not captured (tutorial popup covers the view); Low-graphics aircraft/ships use the same code path, covered by decalcheck.
