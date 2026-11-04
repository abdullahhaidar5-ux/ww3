# Smooth check (branch `orch/smoothcheck`)

**Shipped:** `orch/smooth.mjs` (gate), `orch/smooth-baseline.json`, three CI jobs `gate/smooth-pc|phone|mp`, `orch/SMOOTH.md`, CLAUDE.md line.
Also: in-game fix + 1% low FPS in the Settings overlay (see below).

## Numbers today (this 2-core box, software GL; CPU-side frame = sim + scene prep + draw submission, no real GPU)
| | PC (auto gfx) | Phone (Low, 4x CPU slow) | Multiplayer (host + 2, 80±30 ms, 1% loss) |
|---|---|---|---|
| units fighting | ~315 | ~315 | 8 sides |
| median / p95 frame | ~140 / ~390 ms | ~235 / ~350 ms | client frame p95 ~76-125 ms |
| sim step p95 | ~11 ms | ~35-45 ms | host step p95 ~3 ms |
| draw calls / triangles | ~1050 / 6.2M | ~470 / 2.7M | - |
| snapshot interval p95 (100 ms nominal) | - | - | ~155 ms, jitter sd ~65 ms |
| order latency p95 | - | - | ~115 ms (network alone is 80±30) |
| desyncs | - | - | 0 |
| load to first battle frame | ~62 s | ~23 s | ~150 s for 3 pages |

## Findings
* **Real bug fixed:** the "lighten graphics when frames are missed" governor was fully switched off whenever Graphics was not Auto, and phones are forced to Low - so on a phone it never did anything. Now Auto and Low both adapt (Low never rises above Low; High/Medium stay fixed), and a one-time message "Switched to lighter graphics to stay smooth" appears. Verified by reading the code path and a clean smoke; not yet seen firing on a real phone. The FPS overlay now shows "1% low".
* **Draw calls are the GPU risk:** PC ~1050 calls / 6M triangles per frame, phone ~470 / 2.7M. perf-1103 already named these as the real limit; this gate now fails if they grow >50%.
* **Phone sim step ~35-45 ms at 4x slowdown** is over a 60 Hz budget (16 ms) in the biggest fights - on a real iPhone 12 (roughly 2-3x slower than this box, not 4x) expect ~15-25 ms. Worth watching.
* Nothing from today's ships (terrain/trees, night, weather, supply UI) stood out; night costs ~1.5-2x on software GL (`--night` runs it; not in the gate).
* No desync in multiplayer under 80±30 ms + 1% loss; worst gap between snapshots ~1.1 s (a lost packet re-sent in order).

## Limits (honest)
* Software GL needs ~8 s/frame for this scene, so the gate swallows draw commands and times the game's own code only. Real-GPU smoothness still needs a real iPhone.
* Two runs of one build differ by up to ~40% (the fight isn't identical), so budgets are wide (1.5-2x); it catches big regressions, not 10% ones. A failing profile is re-run once.
* Baseline was taken on this box; if CI runners differ a lot, re-baseline from the `out-smooth-*` artifact (see SMOOTH.md).

## 2-minute iPhone test for Abdullah
Open https://abdullahhaidar5-ux.github.io/ww3/ , Settings > turn on "Show FPS & ping", start a skirmish with 6-8 players and let armies grow ~6 min. Watch the "1% low" number in the big fight and tell me the FPS, whether the message "Switched to lighter graphics" appeared, and your phone model.
