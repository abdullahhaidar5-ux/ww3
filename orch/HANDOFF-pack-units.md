# HANDOFF pack-units (2026-11-20)

## Done
- Unit limit: 500 per player in battles of up to 4 players, 300 for 5-8 (popCap counts team slots, fixed at start). On main (d7fbc49), guard in orch/decisions.mjs, DECISIONS + CLAUDE.md updated. Battle servers moved by hand (servers-live b3f11e644) because autodeploy had not moved it.
- Soldiers up close, piece 1: chest rig with mag pouches and grenade, radio with antenna on the pack, shoulder/helmet straps; merged into the single soldier shape (no extra draws). Landed on main fa72859 after a full green gate (controls needed one rerun of the failed job: 134/135 flake).

## Left
- IR camo texture/atlas (IRGC-style), headgear, face/skin shading, then RS (Lebanese mountain look), DW, RV, rest.
- Close-up shots orch/shots/infantry-closeup-*.jpg (local rendering is far too slow here; render on a faster box or CI).
- Branch orch/pack-units is older and diverged; use orch/pack-units-ir.

## Try on PC (2 min)
Start a 1v1 Battle as Iran, build a Barracks, train riflemen, zoom right in: look for the chest rig, radio antenna and straps. Counter should read units x/500.
