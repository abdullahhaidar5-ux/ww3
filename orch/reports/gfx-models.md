# Graphics Phase 2 — real unit models (branch `orch/gfx-models`)

**New models** (all CC BY, Sketchfab via Objaverse; authors added to the menu credits; decimated with gltfpack,
textures 256–512 px WebP, base colour only):

| Units | Nations | Model (author) | gz |
|---|---|---|---|
| Main battle tank | US, SA, AE, KR, EG | M1 Abrams (Artem.Goyko) | 207 KB |
| Main battle tank | IL | Merkava (klopikc) | 203 KB |
| Main battle tank | EU, TR | KF51 Panther (GRIP420) | 187 KB |
| Self-propelled gun | RU, KP, IR, UA, CN, IN, CU, PK | 2S19 Msta-S (lm9241221) | 110 KB |
| Self-propelled gun | Western 8 | G6 (existing spare model, desertfox2) | 322 KB |
| Supply / AA / radar / EW / Iron Dome / ATGM / rocket trucks | Western 8 / others | M35 (zerofrost) / Ural-4320 (davidbroutian) | 71 / 102 KB |
| Recon patrol | SA | Humvee (madtrollstudio) | 106 KB |
| Raid Leader technical | DW | existing Hilux + DShK | — |
| Transport helicopter (now with spinning rotors) | Western 8 / others | UH-60 / Mi-8 (manilov.ap) | 162 / 161 KB |

National paint is applied over each texture (dark textures brightened). New downloads: 1.3 MB; all models 5.3 MB;
a battle still loads only its nations' models (smoke: 47 of 60). Falls back to the old models if a file fails.

**Screenshots** (top = before, bottom = after, same seed/camera): `orch/shots/gfx-models/close-*.jpg`
(US, RU, IL, IR, EU, SA). Harness: `node orch/gfxshots.mjs --tag before|after [--html file]`.

**Gate:** smoke PASS; `orch/cigate.sh` on 2f29623 (origin/main + orch/three-upgrade merged in): **16/16 PASS** incl. mapsweep (71 battles), mpsync, migrate x3, touch.

**Next:** infantry (needs a rigged soldier with matching bones), buildings, more tank silhouettes (Type 99, K2, Altay).
