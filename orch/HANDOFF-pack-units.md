# HANDOFF pack-units (updated 2026-11-20)

## Done
- Unit limit 500 (battles with up to 4 players) / 300 (5-8): LANDED on main (d7fbc49); guard "unitlimit" in orch/decisions.mjs; DECISIONS + CLAUDE.md updated; servers-live hand-moved to b3f11e6 (autodeploy had not moved it). Nothing left for item 1.
- Soldiers up close: chest rig/radio/straps gear is on main. NEW on branch orch/pack-units (3244e4e): national field-camouflage blotches for IR, RS, DW, RV, OB in the soldier shader (`SOLCAMO` + `solCamo` in src/11-models.js; called from tintedProto; 3 colours from 2 noise octaves in rest-pose body space, keeps texture folds, skips skin). Same instanced SOLB path, no new material/texture/draw call.

## Left
- Local sandbox renders are too slow: smoke/decisions/gfxinf were started but not confirmed. Run `orch/cigate.sh` on this branch; if green, rebase on origin/main, rebuild, land, HISTORY line. Check close-up with `node orch/gfxinf.mjs --tag camo --out infantry-closeup-after` (maps zagros) and a battle-distance shot; judge blotch size (`fq=6/height` in solCamo) and skin mask.
- Not done: headgear/face shading, normal/roughness maps, camo for the other nations, shots in orch/shots/infantry-closeup-*.jpg.

## Try on PC (2 min)
Start a 1v1 Battle as Iran, build a Barracks, train riflemen, zoom right into one: the uniform should show olive/brown/tan camouflage blotches. Counter should read units x/500.

## 2026-11-20 PACK run (camo contrast)
Done: step 1 of the plan: SOLCAMO 1.5x brighter, rel clamp .6-1.6, mix .95; IR jacket now reads olive (orch/shots/infantry-closeup-{before,after}-IR.jpg). Sandbox render ~5-8 min per scene (`--scenes fulda:IR:US`), so steps 2-6 (dark boots, rig band, helmet strap, weapon grip, face/skin) are left; legs still look dark.
Try on PC (2 min): Iran Battle, train riflemen, zoom close: camouflage blotches on jackets should be clearly visible.

## 2026-11-20 PACK run 3
Item 1 verified done (main d7fbc49, servers-live contains it). Item 2: SOLCAMO brightness floor raised (rel clamp .82-1.5) so trousers/legs read olive; shot orch/shots/infantry-closeup-legs-IR.jpg. Local smoke/decisions too slow here; gate via orch/cigate.sh.
Left: headgear/face shading, boots/rig band, normal/roughness, camo for other nations.
Try on PC (2 min): Iran Battle, train riflemen, zoom right in: jackets AND trousers should show olive/brown camouflage, not near-black legs.
