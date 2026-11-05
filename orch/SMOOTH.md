# Smoothness gate (`orch/smooth.mjs`)

Answers one question for every change: *does a big late-game battle stay smooth on a PC, on a phone and in online multiplayer?*
It runs in CI as three parallel jobs (`gate/smooth-pc`, `gate/smooth-phone`, `gate/smooth-mp`, ~3-4 min each) and must be green before anything lands on `main`.

## Run it
```
node orch/smooth.mjs                    # all three, ~7 min on a 2-core box (needs the browser lock like smoke.mjs)
node orch/smooth.mjs --profile phone    # pc | phone | mp (comma list ok)
node orch/smooth.mjs --update-baseline  # write today's numbers into orch/smooth-baseline.json
node orch/smooth.mjs --night            # same battle at night (slower; not in the gate)
```
Prints a small table and `SMOOTH PASS` / `SMOOTH FAIL` with one plain line per regressed number ("median frame ms rose to 190, baseline 140, allowed up to 195"). Latest numbers: `orch/out/smooth.json`.
A failing profile is run a second time; it only fails if it fails twice. Never contacts the production servers.

## What is measured
* **pc** - 8 AI players on Fulda, fast-forwarded 2 game-minutes, two extra columns added (~300+ units fighting), camera on the biggest fight. Auto graphics (what a PC player gets), 640x360 window.
* **phone** - the same battle in an iPhone-like window (390x844, touch, `GFX_PHONE`), Low graphics, CPU throttled 4x (`Emulation.setCPUThrottlingRate`).
* **mp** - host + 2 clients + 5 computer players through the same in-page PeerJS stand-in as `mpsync.mjs`, with 80 +/- 30 ms latency, 1% loss (a lost packet costs a 250 ms re-send, in order, like a reliable channel). 40 s real time.

**Important honesty note:** headless Chromium draws with software GL, which needs ~8 s per frame for this scene and says nothing about a real GPU. So the gate swallows the draw commands (three.js still counts calls and triangles) and times everything the game's own code does per frame: simulation step, scene sync, fx, fog, HUD, command submission. "Frame ms" below means this CPU-side frame time - GPU load is only visible through **draw calls** and **triangles**. Real-GPU smoothness still needs a real iPhone.

| number | meaning |
|---|---|
| median / p95 / p99 frame ms | CPU-side frame time (one sim step + render preparation); lower is better |
| worst 1% FPS | 1000 / average of the slowest 1% of frames |
| frames >50 ms | stutter count (absolute, in the report only) |
| sim step p95 | one 60 Hz simulation step, 95th percentile |
| draw calls, k triangles | what the GPU would be asked to draw per frame |
| heap MB/min | JS heap growth after forced GC (leak check; absolute limit 60 MB/min, negative = fine) |
| load time | start of battle until the loading screen is gone |
| snapshot interval p95 / jitter | how evenly the host's updates reach a client (nominal 100 ms) |
| order latency p95 | client order sent -> host receives it (includes the 80 +/- 30 ms network) |
| client tick / frame p95 | client-side work per update / per drawn frame (draws swallowed as above) |
| desyncs | after the host pauses and sends a full update, anything a client sees that differs from the host (position, kind, team, hp, credits). Must be 0 |

## Budgets
Each number may be at most `baseline x ratio + slack` (ratios 1.5-2, see `BUDGETS` in `smooth.mjs`; deliberately wide because two runs of the same build differ by up to ~40% - the fight is not identical each time); FPS-style numbers may fall to 65% of baseline. CPU-bound numbers are scaled by a CPU speed check (`bench`, a fixed loop) so a slower or faster machine does not trip them. Absolute limits regardless of baseline: no desync, no frame over 1.5 s of game code (4 s on the throttled phone), no heap growth over 60 MB/min (absolute only), no client without a snapshot for 2.5 s, no page errors.

## When a change is intentionally heavier (or lighter)
1. Confirm it is intended (new effects, more units on screen...). Tell Abdullah in the report if it costs phones anything.
2. `node orch/smooth.mjs --update-baseline`, then commit `orch/smooth-baseline.json` with a line in the commit message saying which number moved and why.
3. Baselines are best taken on the CI runner: download the `out-smooth-*` artifact (`smooth.json`) of a green gate run and copy the numbers in if your machine differs a lot.

## In-game guard
`qualTick` (`06-view.js`) lowers resolution/effects after ~1.5 s of missed frames. It used to be switched off whenever Graphics was not Auto, which includes phones (forced to Low) - so a phone could never get lighter. Now Auto and Low both adapt (Low never goes back above its own level; High/Medium stay fixed) and a one-time message "Switched to lighter graphics to stay smooth" appears. Settings > Show FPS & ping also shows "1% low" FPS.

## Extra tools (2026-11-05)
* `node orch/smooth.mjs --profile pc --phases` then `python3 orch/phases.py orch/out/smooth-frames-pc.json` - time per part of the frame and the worst frames (what made each spike).
* The pc/phone profiles also time the first big explosion, a second one, and a switch to every other weather/night (ratio to a normal frame; fails over 15x). The mp profile counts client snaps (a unit jumping >12 world units in one tick; report only, 0 today).
* `node orch/wobble.mjs` - tanks, trucks, infantry across a map and back: position pops, heading flips, wobble after arrival, stuck units (`WOBBLE CLEAN` / `ISSUES`).
