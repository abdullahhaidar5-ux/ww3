# HANDOFF pack-units (2026-11-19, second run)

## Done
- Unit limit 500 (<=4 players) / 300 (5-8) is LANDED on main (d7fbc49) and servers-live (b3f11e6, 16:51 UTC) already contains it. Nothing left on the cap.

## Left
- Soldiers up close (view only): only WIP db86ffec6 on `orch/pack-units` (chest rig, radio, straps; not gated, no before/after shots). Still to do: IR camo texture atlas, helmet/headgear, face shading, RS/DW/RV looks, before/after sheets (orch/gfxinf.mjs --tag; very slow in this sandbox, use GitHub runners).

## Try on PC (2 min)
1v1 Battle, build a Barracks, queue infantry: counter reads units x/500.
