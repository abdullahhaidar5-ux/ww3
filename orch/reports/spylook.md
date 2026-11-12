# spylook — Infiltrators look like actual spies (branch `orch/spylook`, 2026-11-12)

**What a player sees:** the Infiltrator is a plain-clothes operative: long plain coat with a belt, a red scarf, binoculars at the
eyes — no rifle, no helmet, no combat kit, no camouflage, no nation tint. While it is hidden, its owner (only)
sees a small eye above it. Pictures: `orch/concepts/spy/` (one look, outfit B chosen by Abdullah 2026-11-12 12:45 "Go with B").

**Before:** the spy had no model entry at all, so it was the fallback box figure (green box, ball head, stick).

**How:** same soldier body and skeleton as other infantry (`MCFG.spy`), so it walks and is drawn the same way — ONE merged
skinned mesh per spy, shapes shared (`SOLM`), far mesh as usual. `spyKit` (props + arm poses, no `solRifle`, no kit variant),
`spyPaint` (re-colors the body by bone: trousers, jacket, skin; keeps cloth folds from the old texture's brightness; pulls
the helmet in under the hair/cap). Eye mark = one more kind in the existing instanced decal system (`decal('eye')`), shown by
06-view only when `e.hid && e.team===ME`. Fallback box figure got its own `spy:body` (no rifle); `spy` left `GEO_ALIAS`.
View only: nothing in 03-sim / checkpoint / net changed.

**Leftovers done:** build icon (cap, dark glasses, satchel strap, phone — the old hat-with-brim icon is gone), hover text and
encyclopedia text (`BASE.spy.desc`; the hover used to show the rifleman's "Beats AT teams…" line), selection tip. Guard:
`orch/decisions.mjs` "spy look" (static).

**Also checked (ORCH's box-figure soldiers):** on main the soldier models DO load in a normal run — "3D models for IR/IL/DW:
62 of 62 ready" in 2.5–4 s here, `MODELS.proto` has sol_m / sol_w, riflemen are the real models. Nothing that landed
today broke it. What ORCH saw is the slow test browser: the loading screen stops waiting for models after 40 s, and units
already on the field then kept their box figure for the rest of the battle (only units built later got the model).
Small fix included: a unit that started as a box figure is rebuilt with the real model as soon as it lands
(`MODELS.gen`, 06-view; check `node orch/spyshot.mjs --late 1`).

**Known limits:** on the helmeted soldier bodies (US and most nations) the torso keeps the bulk of the old chest rig under
the jacket; at the far default zoom the coat reads as one muted-brown figure; faces are flat-colored.
