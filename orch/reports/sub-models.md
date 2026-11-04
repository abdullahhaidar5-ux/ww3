# Realistic submarines + coastal battery (branch orch/sub-models, 2026-11-04)
Abdullah 2026-11-03: "Subs look bad, very blocky." Visuals only (no change to 03-sim / 01-data / 02-map / 07*).

Source: Objaverse (Hugging Face allenai/objaverse metadata, Sketchfab licence + author; only CC-BY / CC0). Decimated with gltfpack (no meshopt).
| Key | Model (Sketchfab author, CC BY) | Used by | gz |
|---|---|---|---|
| m_subw | "Submarine" (Warfare), Los Angeles/Virginia-style attack boat | US, TR, IL, EU, SA, AE, KR, EG | 50 KB |
| m_sube | "Submarine 641B" Foxtrot (8bit), red anti-fouling band tinted dark | RU, KP, UA, CN, IN, CU, PK | 290 KB |
| m_subm | "Sinpo-class submarine" (KoreanNavy), smaller coastal boat | IR, RS, DW (stands in for a Ghadir midget) | 363 KB |
| m_cbat | "Rough SCUD" 8x8 launcher truck (PaintedTarget), repainted olive | coastal missile battery, all nations | ~390 KB |
Credits added to the menu credits paragraph (shell in index.html).

- Subs ride awash (hull dy), dark paint, flag on the hull and hull number (factionKit now treats `sub` like a ship). When the sim says the sub is hidden (`e.hid`) it sinks 6 units under the water; it comes back up when it fires or is detected (06-view).
- Coastal battery: the launcher truck sits on the pad and still turns toward its target (part 'gun'); a sandbag wall (sandbag prop model) round three sides and a small command/radar truck (the nation's own truck model + dish) beside the pad. Falls back to the old procedural shapes until the models arrive.
- Not found: a Kilo/Yasen-shaped or true Ghadir midget sub under CC0/CC-BY; Foxtrot and Sinpo are the closest. Submerged is "sunk and dark", not truly transparent (shared materials).
- Shots: orch/shots/subs/ (made by `node orch/subshots.mjs`, PC 1280x720 and phone 390x844; each shot takes ~30 s in headless).
