# Handoff — freezefix (updated 2026-11-13, helper freezefix2)

**Branch `orch/freezefix`** (merged with main of 2026-11-12; NOT landed — the conductor lands gated branches).

## Done
- Kheibar strike freeze fix + Performance log (from before, still green: `superfreeze` IR, RU, US pass).
- Branch merged with current main (HISTORY keeps both sides, `build.py --check` passes).
- **Load hang fixed ("PREPARING GRAPHICS… 78%", Page Unresponsive):** `warmShaders()` is gone; `warmShadersChunked()`
  (src/05-fx3d.js) runs on every device: one model per frame on PC (4 on phones), only the nations in the battle, own team
  variant, `compileAsync`, textures sent one at a time, battlefield compiled child by child, depth/shadow variants drawn
  a slice at a time, strike warm-ups kept (missiles, flames, rock chunks, markers, rubble, banner, shock rings, jet plume,
  corner picture), a frame given back every ~30 ms. Temporary groups no longer go through the scene's GPU clean-up queue.
- Loading watchdog (20 s, already in 08-ui) now starts the battle; the warm-up then continues in the background through
  the same queue, one batch per frame, off the scene.
- Performance log shows per-stage load times, programs compiled, longest step, long tasks while preparing graphics.
- New gate `loadfreeze` (orch/loadfreeze.mjs, wired in .github/workflows/gate.yml): 4× CPU slowdown, subtracts GL time
  (software GL links synchronously; real GPUs do it in the background), fails above 2500 ms of own work without a break,
  more than 20 stretches over 200 ms, or more than 12 programs linked between two breaks.
- superfreeze harness now swallows draws during loading too (software GL needs seconds per draw).

## Not done / honest limits
- The 200 ms target is **measured, not enforced strictly**: on this slow test machine, 3–7 stretches of 200–1300 ms still
  appear (texture decode/upload, first model builds, hiccups of the machine itself); the gate fails only above 2500 ms.
  Only Abdullah's real Windows laptop can confirm.
- The old whole-scene draw at the end of the warm-up is gone (the "Deploying forces" step still draws the real first frame).

## Gate result
Four `orch/cigate.sh` runs (head c8e1cd75f4 → this commit). **Latest run (this head): everything green except
`superfreeze` (red) and `cfclient` (known flaky, text says PASS).** `loadfreeze` PASS, `smooth-pc` PASS (p95 359 / p99 476 /
worst-1% 1.89), `smooth-mp`, `grandsmooth`, `decisions`, `headless`, `mpsync*`, `migrate*` PASS.
- **superfreeze RED (not landable yet):** IR passes; RU and US each show ONE ~1 s JavaScript-only frame 3.9–4.4 s after the
  launch (no shader/texture/buffer work in it), quiet max 250–280 ms. Old branch head (3048ada0) had 313 ms in the same test.
  Not found yet. What I learned: the stall is NOT the wound blobs (tried, removed), NOT shader compiles/new meshes (0 now;
  IR/RU/US show 0–2 new vertex arrays vs limit 6). Suspect list for the next helper: (1) the strike-extras draw that runs the
  depth (AO) pass unconditionally (`drawOnly(ex,1)` in warmShadersChunked) — making it conditional again brought the
  "8 new meshes (max 6)" RU failure of the first run back, and running the AO pass for *all* models made `smooth-pc` red
  (p95 565); (2) first wreck/hulk creation or first-time JS at impact now not covered by the old whole-scene draw.
  Use `VAO=1 node orch/superfreeze.mjs RU` (prints which shapes get new vertex arrays) and `PROF=1`.
- Earlier runs: first run red on smooth-pc (worst-1% FPS 1.67 vs 1.7) and RU 8 new meshes; second/third red on smooth-pc
  (AO pass for all models) and superfreeze (the same 1 s frame).

## Before / after load trace (test browser, software GL, IR Conquest)
| | before (one task) | after (chunked) |
|---|---|---|
| Preparing graphics | 22–33 s in ONE task | ~7–10 s in ~600 pieces (4× CPU: longest own-work stretch ≈ 0.3–1.3 s, mostly texture upload / machine noise) |
| Programs compiled | one burst | 100–120, never more than 12 between breaks |

## Try for 2 minutes (PC): https://abdullahhaidar5-ux.github.io/ww3/
Start one Conquest battle, watch the loading bar keep moving, then fire one Kheibar strike as Iran. If anything hangs:
Settings → Graphics → Performance log… → Copy → paste to ORCH (it now includes the load timings).
