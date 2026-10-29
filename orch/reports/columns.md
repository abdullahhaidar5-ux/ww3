# Graphics Phase 5 — massive columns (branch `orch/columns`)

**What changed (player terms)**
- Each soldier is now drawn as one piece instead of ten (rifle, uniform parts and kit merged). Looks the same, ~8× fewer draw calls for infantry.
- Forests, grass and rocks used to be drawn across the whole map every frame; they are cut into map tiles and only the ones in view are drawn. Trees and rocks cast their shadow from a simplified copy (same shadow, ~4× fewer triangles).
- Units and buildings off screen are no longer drawn or posed.
- Fixed a freeze of several seconds every time a vehicle was destroyed (making its wreck copied the whole 3D model through text). Big battles no longer hitch on every kill.
- New profiler `orch/columns.mjs` (8 players, late game, +320-unit clash, frame split into sim/sync/effects/render/HUD).

**Before → after** (8-player Fulda, ~640 units fighting in view; SwiftShader, relative only)

| | median frame | slowest 10% | draw calls | triangles |
|---|---|---|---|---|
| Desktop 1280×720 | 901 → 414 ms | 63 s → 0.57 s | 6183 → 2932 | 15.9M → 6.7M |
| Phone 390×844, 4× CPU | 2977 → 994 ms | 129 s → 1.4 s | 4462 → 2360 | 11.0M → 3.4M |

Simulation untouched (sim ≈ 15 ms/step desktop); HEADLESS PASS, multiplayer unaffected. Remaining biggest cost: vehicle models (many parts each) — next candidate for merging.

Screenshots: `orch/shots/columns/desktop-huge-battle.jpg`, `phone-huge-battle.jpg`.

**CIGATE 16/16 PASS** on bfee864 (includes origin/main merged). An earlier run had touch + migrate-abrupt fail once; both passed on the re-run.
