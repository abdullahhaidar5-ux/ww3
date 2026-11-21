# HANDOFF — Lane E (real-PC load + hitches), branch `orch/laneE`

Never pushed to main — ORCH lands it. Base: origin/main 10cf4bd (2026-11-21).

## What Abdullah's Performance log says (RTX 2070 Max-Q, ANGLE Direct3D 11, 2026-11-21 01:25 UTC)
- Shader warm-up **29,907 ms**, 63 models, **103 programs**, longest step 2805 ms, `models` stage 26,324 ms.
- The loading watchdog is **20 s** (`LOAD_WD`, src/08-ui.js). So his battle **started with the warm-up unfinished**; the rest kept
  compiling in the background during the first seconds of the battle. That is exactly the hitch list: 0:02 883 ms (programs 86→87),
  0:02 539 ms (86→88), 0:03 308 ms (97), 0:07 258 ms (103 = the warm-up's final count). In "late" mode the warm-up also SKIPS the strike
  extras and the battlefield draw slices, so more first-sight compiles follow later in the battle.
- Headless runs (SwiftShader) of IR-US (47 s) and RS-IL (106 s of AI battle) make **0 programs after loading** with a finished warm-up:
  the mid-battle programs come from the unfinished warm-up, not from something it misses.
- Why 30 s: the models were done **one at a time** — request a model's 1-3 programs, wait until linked (≤4 s), draw, next model.
  ~290 ms per program in a row. Direct3D's HLSL compile is the slow part; Chrome/ANGLE can run it on several worker threads
  (KHR_parallel_shader_compile), but only if many programs are in flight at once.

## What changed (view only; nothing in the simulation; looks identical)
1. **src/05-fx3d.js `warmShadersChunked`**: every model group (and its burnt-wreck copy) is built and its programs **requested** first,
   all of them (`R3.compile`, no waiting), a frame given back every ~30 ms or 6 new programs (keeps `orch/loadfreeze.mjs` LINKMAX 12);
   then the old steps draw them one by one (their programs are already compiling side by side). The strike extras (missiles,
   markers, garrison, soldiers per nation, Test-range kinds, rubble, banner, rings) are queued the same way (`qstep` + `flush`).
   New stage `requests` and `W.req` (programs requested up front) in LOAD.warm / Performance log.
2. **src/08-ui.js watchdog**: a loading step is given up after **20 s without progress** (the warm-up beats `LOAD.beat` at every
   sub-step) or **45 s in total** — before: 20 s flat, which started his battle mid-warm-up. A truly stuck compile still ends at 20 s.
3. **src/11-models.js `progDedupe`** (at model load, after mergeProto): RGBA vertex colours lose the alpha channel on solid parts / when
   alpha is 1 everywhere (own program variant); "transparent" untextured parts at ≥99% opacity become solid (the F-18 pilot's arms/chest:
   2 programs each, back + front pass). Measured headless: **IR-US 101 → 98 programs, warm-up 99 → 96**. Real glass (Mi-8/UH-60/Mi-24/
   MiG-29/Apache canopies) keeps its two-pass look on purpose (forceSinglePass would save ~5 more programs but changes the glass look).
4. **src/08o-perflog.js**: every shader program made after the loading screen is noted (material name, kind, short key hash), the
   hitch frame it cost is tagged ("new programs: …", "(warm-up still running)"), and the log text gets a "Shader programs made during
   the battle" block. Also `console.log`. So his next log names exactly what was late.
5. **orch/progprobe.mjs** (new tool): loads a Battle headless, lists every program + the ones made after loading (`OUT=`, `EVAL=`).

## Numbers (headless SwiftShader, 2 cores — no parallel compile there, so timing is NOT the proof)
| | before | after |
|---|---|---|
| programs after load, IR vs US | 101 | 98 |
| warm-up programs | 99 | 96 |
| warm-up steps | 666 | 677 |
| warm-up ms (SwiftShader, draws swallowed) | 7,937-8,245 | 7,577-7,837 |
| programs requested side by side before the first model draw | 0 (1 model at a time) | 41-43 |
| programs made in the battle after loading (47 s IR-US, 106 s RS-IL) | 0 | 0 |

## Expected on Abdullah's PC (estimate — the real proof is his next Performance log)
- If Chrome/ANGLE compiles on 4+ worker threads: warm-up ~8-12 s instead of 30 s; battle starts with everything compiled → no
  0:02-0:07 hitches.
- If it only overlaps a little: the warm-up may still take 20-30 s, but the battle now **waits for it** (up to 45 s, never stuck
  >20 s without progress) instead of starting with programs compiling mid-battle.
- Ask him: start a Battle as IR on PC, 2 minutes, then Settings → Graphics → Performance log → Copy: look for
  "Shader warm-up: … ms … requested side by side" and "No shader program made during the battle."

## Gate
`orch/cigate.sh` on 39820b2 — see the bottom of this file / HISTORY when the result is in.
