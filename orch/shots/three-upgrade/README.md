# Three.js r128 → r186: before/after

Each PNG is one shot, **left = r128 (origin/main ac24072)**, **right = r186 (orch/three-upgrade)**, same seed, same
nations, same camera, made on one cloud machine with `orch/three/compare.mjs` (maps, close-ups, aircraft, phone) and
`orch/three/fxshots.mjs` (effects, fully deterministic). The battle's random numbers are seeded in both builds, so the
first minutes play out identically (map overviews, `close-fulda`, effects). Later close-ups (`close-golan`,
`close-dmz`) drift apart, because pathfinding has a per-frame time budget, so those compare look, not the exact scene.

| File | What |
|---|---|
| `map-strait/arctic/fulda/gulf/zagros/dmz` | whole-map overview after 60 s of US vs RU |
| `close-fulda-US-RU`, `close-golan-IR-IL`, `close-dmz-RS-CN` | zoomed-in on the busiest fight after 5 min |
| `air-apache-f16`, `air-wide` | Apache close-up with explosion, smoke and tracers |
| `fx-day-boom`, `fx-dusk-boom`, `fx-day-smoke` | explosions and smoke screen, frames stepped by hand |
| `phone-fulda` | 390×844 phone, phone look |

## Frame time (ms per frame: median / 90th percentile)

Software GPU (SwiftShader) on a 2-core cloud machine, so a frame takes seconds; only before/after ratios mean
anything. Frame = `renderFrame` + a GPU read-back so the GPU work is counted.

| Scene | r128 | r186 | Change |
|---|---|---|---|
| Desktop 1280×720, close-up fulda fight | 9026 / 9459 | 8784 / 9039 | −3% |
| Desktop 1280×720, fulda overview | 12817 / 13450 | 13135 / 13659 | +2% |
| Phone 390×844 ×3, 4× CPU throttle, fixed camera on own base (2 runs) | 9191 / 9589, 8899 / 9247 | 8975 / 9172, 8692 / 8869 | −2% |
| Phone, same, fixed camera on the fulda fighting | 10398 / 10860 | 10552 / 11933 | +1.5% |
| Phone, "busiest fight" camera (lands on a different spot in each build) | 8698, 9375, 9844 | 10652, 11156, 10685 | not the same picture |

Phones run at the same speed (within noise); phone look and level 1 detail are picked the same way in both builds
(527×761 px render).
