# Free model scout (2026-11-19, helper `model-scout`)

**Result: no new model accepted. Nothing found is better than what `models/` already has (m_t72, m_t90, m_abrams, m_hilux, m_humvee, m_ural, m_m35, m_mi8, m_ka52 ... plus `soldier`/`sol_*`). Every unit without a real model stays code-built.**

## What was searched
- GitHub repo search (`gh api search/repositories`): tank, military, soldier, helicopter, humvee, drone, quaternius, kenney. Hits are metadata only: this run's GitHub access covers `abdullahhaidar5-ux/ww3` only, so reading/cloning any other repo (e.g. `alexmaietta/terrestrial-mobility-assets` BSD-3, `amvlab/aircraft-models` NOASSERTION, `trebeljahr/quaternius-showcase` MIT) was denied. Those need adding to the task's repos if you want them inspected. License of `amvlab/aircraft-models` is unclear (NOASSERTION), so it would be rejected anyway until a license text is read.
- npm: `@netforge/asset-library-files` 0.2.0 (MIT wrapper; NOTICE lists Quaternius via Poly Pizza + Kenney, all CC0 1.0) and `@jgengine/assets` 0.59.0 (Apache-2.0 index of CC0 packs: only cars, ships, spaceships, toon shooter, medieval/steampunk props). Searches for T-72, BMP, Shahed, Mi-8, F-16 etc. found nothing.

## Candidates checked (CC0 1.0, Quaternius / Kenney Car Kit; credit not required but already in the 3D models credit line)
| key (not added) | what | license | author | tris | verdict |
|---|---|---|---|---|---|
| tank | toy tank, skinned (3 skins), 200 u wide | CC0 | Quaternius (poly.pizza) | 6544 | reject: cartoon, skinned, does not match Abrams/T-72 |
| tank_heavy | toy heavy tank, skinned | CC0 | Quaternius | 6064 | reject, same |
| soldier | cartoon soldier, rigged, 14 anims | CC0 | Quaternius | 20712 | reject: 5x over the 4k budget, cartoon proportions |
| truck / truck_flat | toy pickups | CC0 | Kenney Car Kit | 1418 / 1632 | reject: toy look, worse than m_hilux for technicals |
| delivery_van, suv, tractor, digger (dozer) | toy vehicles | CC0 | Kenney Car Kit | 1620-2646 | reject: toy look |
| turret, turret_double, cargo_ship, rover | sci-fi/toy | CC0 | Quaternius/Kenney | <900 | reject |
Preview: `orch/shots/freemodels-candidates.jpg` (all converted to plain GLB, meshopt decoded). Converter: `orch/freemodels-convert.mjs` (gltf-transform; prints tris/skins/textures/size).

## Per unit family
Shia (T-55/72, BMP, technical DShK/ZU-23, Ural/KamAZ, Shahed, quadcopter, Mi-8, fast boat), West (M1, Bradley, HMMWV, FMTV, MQ-9, AH-64, F-16/F-35), East (BMP-3, BM-21, Su-25), Regional (K2, Type 10, TB2), generic dozer, AA/SPG/MLRS, patrol boats: **no free licensed realistic model reachable**; keep code-built parts (BMP, drones, boats, BM-21 etc.). Dozer: the Kenney `digger` is CC0 but toy-styled; not recommended.

## Not done / needs Abdullah
Landing models + one cigate was skipped on purpose: shipping toy models nobody wires in only adds download weight. If he wants a deeper search, add repos to the scheduled task (it cannot add repos itself) and name them.
