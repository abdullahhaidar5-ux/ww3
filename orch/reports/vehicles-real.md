# Vehicles real (2026-11-04, branch orch/vehicles-real)

## Shipped (stage 1: realistic materials, `weather()` in src/11-models.js)
- New shader kinds (`userData.wk`, set in `tintedProto`): ground (0), ships/boats/subs (1), aircraft (2). No new draw calls or textures — procedural noise in the existing weathering shader.
- Ground: sun-faded upward faces, rust streaks, mud/sand/snow grime on the lower hull taken from the map theme (shared uniform `WXE`, set by `wxEnv()`: green = mud, desert = sand, snow = white settling on top surfaces).
- Ships: rust runs down the hull, dark waterline grime, faint salt staining.
- Aircraft/helis/drones: panel-line shading, exhaust-soot streaks, slightly sun-faded top surfaces.
- `orch/factionshots.mjs` got a `--dir` option; close-ups in `orch/shots/vehicles-real/after/`.

## Shipped (stage 2-3, branch orch/vehicles-real2)
- **Battle damage** (`unitDamageFX` in 05-fx3d, called from 06-view): thin grey smoke from 75% health, thick smoke from 50%, black smoke + flames + sparks under 25%; aircraft trail smoke behind the tail (denser and burning when badly hit); damaged ships list to one side, settle lower and burn on deck. Phones emit ~60%.
- **Nation kit** (kitGeo, 11-models): bevelled/round shapes only (new builder parts `rbox`, `ell`, `bar`, `net`). IR slat armour + Persian hull numbers; RS camo nets, 12-tube rocket pod on technicals; DW jerrycans, spare tyre, sandbags; KP Korean slogan panel ("For the Fatherland"); RU cope cage (round bars), ERA tiles on the glacis, white unit letters (Б-21); UA cope cage; US remote weapon station + antennas; IL turret bustle basket + ball-and-chain curtain; TR spare track links; EU/CN/KR smoke dischargers; SA/AE/IN stowage bags + jerrycans; PK/CU/KR/IN rolled nets/tarps; EG sandbags. Tank commanders in their hatches, bedrolls. Ground kit is skipped on Low (phones).
- **Air forces**: each nation's real scheme (`AIRX`): US/TR/EU/CN/IN/KR/PK/SA/EG grey, RU blue-grey camo, UA pixel grey-blue, IR/RS/DW/IL desert three-tone, KP olive, CU olive camo, AE desert; helicopter schemes separately (olive/dark green/sand). Fin serial numbers, underwing drop tanks and missiles on pylons (PC), door gunners on transport helicopters. RS/DW jets are now MiG-29s instead of the old blocky jet.
- **Drones**: Shahed-style delta for IR/RS/DW with Persian/Arabic stencils (شاهد / أبابيل / قاصف) and serials; Bayraktar-style light grey for TR; MQ-9/Hermes-style grey for US/IL; Lancet-style dark X-wing for RU; bigger quadcopter for CN/KR; taped-battery FPV with antennas for the rest; nav lights, spinning prop discs; own paint material (the shared one dusted every drone sand-coloured).
- **Ships**: guard rails, VLS cells, life-raft canisters, a rotating search radar on the mast, hull numbers kept below the deck line, no painted hull flag (ensign on its staff only); IRGC-style fast boats get a bow machine gun; funnel smoke when moving. Existing bow waves/wakes/spray kept.
- **Bug fixed**: faction kit used to appear only on the first nation to use each model (the cached probe ray-cast the first unit). Every nation now gets its kit.
- **Draw calls**: kit, radars and drone stencils are instanced (`kitMarker`, one draw call per kit shape for the whole battle). First attempt (one mesh per unit) doubled draw calls and failed smooth-pc; fixed.
- Already present and kept: exhaust puffs, theme-aware driving dust, track marks, recoil rock, rotor-wash dust, afterburner glow on take-off, wakes.
- Checked: damage particles spawn (counted near the unit; fire glow visible), but the grey smoke itself did not show in the headless close-up harness (normal-blend particles) - worth a look on a real screen.
- Gate: cigate 21/21 on d8751dda (migrate-down flaked once - AI had $340 - and passed on rerun; controls flaked once on the first commit).
- Close-ups: `orch/shots/vehicles-real2/after/` (JPEG; some RS/DW jet and drone close-ups predate the MiG-29 swap and the drone-distance fix) (`node orch/factionshots.mjs --solo tank,jet,heli,drone,ship [--dmg 0.2] [--low 1]` is the new single-unit close-up mode).

## Not done
Objaverse search for Type 99 / K2 / Altay / Al-Khalid / Shahed-136 / TB2 models (stage 4) — not started; the hand-built drones cover Shahed/TB2 for now.
