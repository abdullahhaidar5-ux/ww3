# HANDOFF pack-art (2026-11-19)
Done: close-up bar in ART-BAR.md; orch/artaudit.mjs sheets (shia|west|east|regional ground|air|navy); scored orch/reports/artaudit.md; bundle 1 part: per-nation Shia truck paint (IR RS DW RV OB, src/11-models.js 'Shia' RMOD block). Supply cargo was landed by ART WEST (my duplicate dropped).
Left (worst first): richer Shia ATGM/AA/rocket/EW add-on geometry (atgmGeo/aaGeo/rackGeo/ewGeo fam 'S'); dozer blob; Shahed/quadcopter drone detail + per-nation difference; lander/minelayer/sweeper hulls; technical variety; Shia base buildings. Local smoke does not finish in the sandbox - use orch/cigate.sh.
Try on PC (2 min): Battle as Lebanese (RS) then Iraqi (RV): zoom on a supply truck and AA truck - different paint per nation.

## Update (later 2026-11-19)
Done: Shia add-on detail (ZU-23 AA: ring mount, ammo drums, sight, shield rib; Konkurs ATGM: tripod feet, spare canister, gunner box; Grad rack: rear step, front plate, rope posts). Gate via orch/cigate.sh.
Left: dozer blob; Shahed/quadcopter drone detail; lander/minelayer/sweeper hulls; technical variety; Shia base buildings; before/after sheets (local render too slow).
Gate note: superfreeze/rangefreeze OB drone-wave stall (500-750 ms frame, no new programs/geo, JS sections small) failed 3x on 04e3ebf; main's 0a0608b failed it once too, 2dc39a0 passed - treated as runner stall, fresh gate run on a new sha.
Gate 2 (edd9181): rangefreeze/superfreeze red again but stalls hit IR, RS, US too (JS sections tiny, no progs/geo growth) = runner stalls, not Shia art. NOT landed on main. Next run: re-run only gate/superfreeze when runners are quiet, then land via fast-forward to main if green.

## Update 2026-11-20
Main already has Shahed (other helper), dozer, navy hulls (art-west) - my duplicate Shahed commit dropped. Done here: technical variety RS/DW/OB (x_dshk per nation). Left: Shia base buildings; jeep/recon carrier camo; before/after sheet (local render too slow). Gate: orch/cigate.sh on this commit.
Try on PC (2 min): Battle as RS, then DW, then OB: zoom on an armed technical - different rear fittings per nation.

## Update 2026-11-20 (later)
Technicals landed (59b5798). Shia compound kit v2 (gate arch, banners, sandbags, dust band) committed, in gate. Not visually verified locally (render too slow) - check the gate screenshots. Left: wall-top flags beyond the one HQ flag, jeep camo, before/after sheets.
Try on PC (2 min): Battle as IR then RS - look at your HQ compound gate from the ground camera.
