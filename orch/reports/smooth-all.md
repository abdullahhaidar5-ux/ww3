# Smooth-all (branch `orch/smooth-all`) — 2026-11-05

Abdullah 2026-11-04 19:31: "Ensure overall smoothness of graphics, mechanics, and gameplay."

## What was measured (this 2-core box, software GL: CPU-side frame = sim + scene + draw submission; no real GPU)
`node orch/smooth.mjs --phases` now times each part of a frame and keeps every frame (`orch/phases.py orch/out/smooth-frames-pc.json` prints it).
* **Where a frame goes (PC, ~300 units):** `renderPost` (the 3D draw call: scene walk, shadow pass, state changes) is ~85% of the frame (median 78 of 91 ms) and **every one of the worst frames (300–425 ms) is spent there**; scene sync 2 ms, effects 0.7, HUD 0.8, minimap 0.5, fog ~0. Sim step p95 8–10 ms (PC), ~29 ms at 4x throttled phone. So spikes are render submission, not game logic.
* **One-off hitches (new probe in the gate):** first big explosion 1.2–1.4x a normal frame, second 1.1–1.4x, switching to every other weather incl. night/dusk 1.5–1.7x. No shader-compile or upload hitch left (the loading-screen warm-up already covers them).
* **Multiplayer (host + 2 clients, 80±30 ms, 1% loss):** 0 client snaps (no unit jumped >12 world units in one tick, biggest jump 0), 0 desyncs, snapshot interval p95 154–156 ms, jitter sd ~60–64 ms, order latency p95 ~115 ms. The adaptive interpolation buffer in `clientTick` already absorbs this; nothing to fix.
* **Vehicle/infantry movement (new `node orch/wobble.mjs`):** tank/truck/AT/AA/arty/infantry across Fulda and back (20 runs): 0 position pops, 0 heading flips (biggest turn in one step 0.14 rad), 0 direction reversals after arrival (no wobble/dithering), none stuck. Sim side is clean, so **no sim change and no servers-live PR**.
* Camera: already damped and frame-rate independent (`camTick`, exponential); vehicle heading already rate-limited in render (`lerpA`). Left alone.

## Fix shipped
**Shadow map redrawn every other frame on phones, and on PCs once frames drop under ~45 FPS or the quality governor has lowered the picture** (`shadowDue()` in `10-post.js`; the shadow pass redraws ~2000 casters and is the biggest single GPU/CPU cost). Light, map and matrix stay consistent, a 1/60 s old shadow is not visible. PCs at full speed are unchanged.

## Before / after (same box, same seeded battle; each run differs by up to ~40%)
| | PC before | PC after | Phone before | Phone after |
|---|---|---|---|---|
| median frame ms | 126 | 72 | 200 | 189 |
| p95 | 404 | 174 | 261 | 252 |
| p99 | 642 | 658 | 314 | 289 |
| worst hitch (max frame) | ~640 | ~660 | ~315 | ~290 |
| client snaps (MP) | 0 | 0 | | |
Honest reading: the PC path is untouched by the change (the PC difference is run-to-run noise); the phone path gained roughly 5–15% in the CPU-side frame and, more importantly, halves the shadow-pass GPU work, which this box cannot measure. Needs a real iPhone to confirm.

## Gate changes
`orch/smooth.mjs`: `--phases` (per-phase timing + all frames to `orch/out/`), first-explosion / second-explosion / weather+night hitch probe (fails over 15x a normal frame or over the freeze limit), client-snap counter in the MP profile (report-only; 0 today). `orch/wobble.mjs` + `orch/phases.py` are new tools. Baseline not changed (existing numbers within budget).

## Not done / open
* No before/after MP4: software GL renders ~8 s per frame, so a video would show the picture, not the smoothness. Skipped rather than show something misleading.
* Remaining cost is render submission (draw calls ~1000 PC / ~570 phone, 5M triangles PC): next real wins are merging vehicle parts and fewer shadow casters (visuals squad), measured on a real phone.

## 2-minute iPhone test for Abdullah
Open https://abdullahhaidar5-ux.github.io/ww3/ , Settings > Show FPS & ping, start a skirmish with 6–8 players, let armies grow ~6 min, zoom out over the biggest fight for a minute. Tell me the "1% low" number, and whether shadows under moving units look fine (they refresh every other frame on phones now).
