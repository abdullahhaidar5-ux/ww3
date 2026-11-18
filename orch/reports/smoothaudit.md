# Smoothness audit (2026-11-17, orch/smoothaudit)

Abdullah, 2026-11-17 06:33: "Once these are all done, audit the game for smoothness. Ensure the game runs smoothly."

## In plain words (for Abdullah)

- **Found the biggest slowdown and fixed it.** In a big battle the game was re-calculating the position of every arm, leg and
  gun of *every* unit and building on the map, every frame - including the ~85% that are off screen and not drawn. That was
  about 40% of the game's work per frame. Off-screen units now skip it. In the 8-player test battle (~340 units) the game's own
  work per frame dropped from **72 ms to ~40 ms** on the slow test machine (about 45% less; a real PC is much faster, but the
  share saved is the same). Nothing looks different.
- **Second fix:** two HUD pieces (the supply-lines button and the off-screen alert arrows) made the browser re-measure the whole
  page every frame. Now 2-4 times a second.
- **Third fix:** every visible soldier's arms, hands and head (about 40 of its 49 "bones") were re-calculated every frame
  although only the legs, hips and chest ever move. They are now worked out once. Together with the first fix the number of
  these calculations per frame fell from **73 555 to about 4 500**.
- **What is still heavy** (next fixes, in order): the number of separate things the graphics card is asked to draw (~650-800 per
  frame; every soldier is drawn on its own), sending every visible soldier's skeleton to the graphics card every frame, a second "depth" drawing
  of the scene for soft shadows, path-finding when hundreds of units get orders at once, and the 2D health-bar layer.
- No memory leak, no sound files decoded during play, simulation cost is modest (~4-5 ms per step for ~340 units on the slow box).

## How it was measured

New tool `node orch/smoothaudit.mjs [big,duel,range,menu,m:<mission>]` (Playwright headless, same battle recipe as `gate/smooth-pc`:
8 players, 2 game-minutes, then two big columns meet; camera on the densest fight). Per scene: frame ms (avg / median / 1%-low),
sim ms per tick and per unit, draw calls, triangles, shader programs, textures, heap growth, DOM mutations / forced layouts /
2D-canvas calls per frame, and a CPU sampling profile (top functions by self and inclusive time) for the simulation alone and for
whole frames. Software GL: draw commands are swallowed (three.js still counts them), so numbers are the game's CPU work only and
are **relative** (2-core cloud sandbox, ~4-6x slower than a gaming PC). Real-runner numbers: `gate/smooth-pc`, `gate/smooth-mp`.

## Numbers (sandbox, before = main f44fc89)

| scene | units | frame avg | 1%-low | sim/tick | per unit | draw calls | k tris | layouts/frame | 2D calls/frame |
|---|---|---|---|---|---|---|---|---|---|
| 8 players, Rhine 10880x7480, before | 346 | **72.5 ms** | 177 ms | 4.4 ms | 15 us | 808 | 4960 | 1.2 | 445 |
| same, after fix 1 | 332-340 | **39-43 ms** | 106-109 ms | 3.9-4.9 ms | 15-17 us | 650-806 | 4200-4880 | 1.3-1.7 | 270-360 |
| same, after fixes 1+2+3 | 348 | **34.2 ms** | 88.7 ms | 4.7 ms | 18 us | 679 | 4270 | 0.1 | 245 |
| 2 players, Split Ridge, before | 182 | 47.3 ms | 116 ms | 2.7 ms | 18 us | 762 | 3370 | 1.7 | 439 |
| Shia mission "pass" (Beqaa), after fix 1 | 34 | 10.6 ms | 39 ms | 0.2 ms | 7 us | 255 | 2320 | 0.2 | 40 |
| Test range, 332 units ALL on screen (IR vs US), after 1+2+3 | 332 | 79 ms | 152 ms | 5.2 ms | 17 us | 1456 | 6570 | 0.2 | 738 |
| main menu (first 8 s) | - | 17.6 ms busy/frame | - | - | - | - | - | - | - |

(Two runs of the same build differ by ~10-15%: the camera lands on a different fight.)
Scene graph in the 8-player battle: **~72 000 3D objects** (42 500 of them skeleton bones), 3 900 meshes; 400 unit/building objects,
of which only ~60 are on screen. Heap: 430 MB, growth after GC -3 MB/min (no leak), ~0.2 MB allocated per frame.
Shader programs: 112 after loading; +5 linked during the measured big-battle frames (first sight of a variant - the cause of single
hitches; the Test range side of this is covered by orch/rangefreeze.mjs).

The Test range scene (every unit on screen at once - Abdullah's "300 units on screen" target) shows what is left once nothing is
off screen: three.js per-object work for 1456 draw calls (`projectObject`/render lists ~13 ms, state/uniforms ~7 ms), the world
matrices of ~330 units' visible bones (~7 ms), the AO hide pass `traverseVisible` (~6 ms) and the 2D HUD (740 canvas calls).
Those are causes 2-4 and 6 below, in that order of cost.

## Top 10 causes, ranked by cost (8-player battle, ms per frame in the sandbox)

| # | cause | measured | fix (status) |
|---|---|---|---|
| 1 | **Hidden units/buildings recomputed every part and bone each frame.** three.js r186 only skips an object's *own* world matrix when `matrixWorldAutoUpdate` is off, then still walks all children. 73 555 matrix updates per frame, 65 000 of them on hidden objects. | **~29 ms** (updateMatrixWorld 2641 ms / 90 frames) | **FIXED (landing 1)**: hidden entity roots skip their whole subtree (`umwVis`, 06-view); the first frame they show again recomputes everything. 72.5 -> 39 ms. Guard: decisions.mjs counts updates under a hidden unit (must be 0). |
| 2 | **Draw submission per object**: 650-810 draw calls per frame (+ the same again for the AO depth pass and the shadow pass on their frames); every soldier is its own skinned mesh. three.js internals (render lists, state, uniforms, VAO binds) | ~10-12 ms | Plan: merge static base/prop parts per material (`mergeByMat`, already used for bridges) for buildings; instanced or merged far-LOD soldier figures (`soldierLo`) per squad. |
| 3 | **Visible soldiers' skeletons**: ~6 800 bone re-compositions + ~218 bone-texture uploads per frame (`texSubImage2D` from `setTexture2D`); only 9 of ~49 bones per figure are ever animated | ~2-3 ms (+ GPU upload calls) | **PART FIXED (landing 3)**: the ~40 never-animated bones are composed once (`boneFreeze`, 06-view): bone re-compositions 6 800 -> ~1 000 per frame, no visual change. Guard in decisions.mjs. Left: bone textures are still uploaded every frame for every visible soldier - next step: far soldiers refresh their skeleton every 2nd-3rd frame (a small visual change, to be said in the report when shipped). |
| 4 | **AO depth pre-pass**: `traverseVisible` over every visible object to hide transparent ones, then a full extra scene render, every frame at Medium (auto) | ~1.7-2 ms (+ a second draw of everything) | Plan: build the hide list every 4th AO frame (top-level effects every frame); consider AO at half rate on Medium like shadows. |
| 5 | **Simulation** 3.9-4.9 ms per 60 Hz step for ~340 units: `findPath` 0.5-0.65 ms, `separate` 0.45-0.6 ms, `nearby`/`nearestEnemy`, `navTo` | ~4-6 ms (one step per frame at 60 fps) | Plan: a per-tick path-finding budget (queue long requests, deterministic order so host/clients/servers agree), reuse the spatial hash inside `separate`. |
| 6 | **2D HUD layer** (`drawHUD`): 270-445 canvas calls per frame; every entity is checked and projected (`toScreen`) before the off-screen test; `G.sel.includes(e)` per entity (O(n x selection) with Ctrl+A) | ~3 ms | Plan: cheap on-screen test first, a Set for the selection, cached font/text widths. |
| 7 | **Effects update** (`fxUpdate`) | ~1.3 ms | Plan: look at it after 2-4. |
| 8 | **Forced page layouts**: `lgUiTick` read the minimap rectangle and `edgeTick` the screen + radio rectangles every frame, right after the HUD changed the DOM | ~1.1 ms in the sandbox (a full page layout per frame on a real browser) | **FIXED (landing 2)**: read 2x / 4x a second and on resize. Guards in decisions.mjs. (`zhCtx` in missions still reads layout ~5x a second - left.) |
| 9 | **DOM churn**: ~13 DOM mutations and ~1.7 `innerHTML` writes per frame; `updateUI` every 0.2 s costs 4-8 ms in one frame (a small hitch 5x a second) | ~0.5 ms avg, 4-8 ms every 12th frame | Plan: write only changed text (compare before set), split `updateUI` parts over frames. |
| 10 | **Main menu first seconds**: map preview generation (`mkMap` ~200 ms, `segDist`), plus GC | 17.6 ms busy per frame over the first 8 s | Plan: cache the previews (they are deterministic) or build them in idle time. |

Not causes (checked): JS heap (no growth), audio decodes during play (0), shader compiles in steady frames (only first-sight
variants), texture uploads of the fog (only on its 8 Hz tick, 0 in the Test range since rangefreeze).

## Not measured in this run (left)

- Online (2 browsers + local server): covered by `gate/smooth-mp` on every landing; not profiled separately here.
- Every Shia mission (only "pass" profiled: light, ~11 ms frames); battle loading time is 55-75 s in the sandbox (warm-up costs are
  in orch/reports/load.md).

## smoothaudit2 (2026-11-17/18, branch orch/smoothaudit2)

**Main was red (gate/superfreeze, Test-range part).** Traced on GitHub's runners (`TRACE=1 node orch/rangefreeze.mjs`, lists every task
over TRACEMS in any Chrome process/thread and what ran inside the longest ones):
- one real game cause: **a shader program linked mid-game** - `weather()` put uniform *values* (wear amount, vehicle kind, camo
  pattern, wall style) into the program key, so a Palestine barracks with wear 1.35 linked 3 programs. Fixed (7cc0afd, on main).
- the long frames (300 ms - 9.5 s, in the ew / drone / drone-tank waves of every nation) contain **20-130 ms of game code**; the
  rest is the **GPU process** (SwiftShader `Scheduler::RunTask` of 150-650 ms, no draws - the test swallows them) and V8 compile
  threads on the shared runner. They also fail on unchanged main (~40% of main's superfreeze runs since 2026-11-16). The check
  compares the whole rAF gap; changing it to judge only the page's own busy time was NOT done (needs Abdullah/ORCH approval).

**Soldier draw calls (cause 2 + 3 of the top-10).** Merged soldier figures are drawn by one instanced draw per look (shape +
material, near/far version), bone matrices of every visible figure packed into one shared float texture (4096 wide, rows in use
uploaded once per frame), figure meshes kept in the graph on layer 7 (`SOLB`, `solbFill`, `solbAO` in 11-models; AO depth pass
draws the batches with a depth-only copy; warm-up draws all three variants).

| sandbox, same build pair, same session | before (7cc0afd) | after (e43e0d1) |
|---|---|---|
| 8 players (big): frame avg / draw calls | 32.4 ms / 869 | 27.4-35.4 ms / 627-646 |
| Test range 332 units: frame avg / draw calls | 44.2 ms / 1020 | 38.1-44.3 ms / 932-993 |
| soldier draws per frame (big, census) | ~193 + ~47 AO | ~20 batches |
| soldier triangles (range, 2 frames) | 2135 k | 1760 k |
| bone-texture uploads per frame | one per visible soldier (~200) | 1 texture, used rows only |

(Frame times in software GL move 10-15% between runs of the same build; draw calls are the stable number. On a real GPU the
saving is per-draw driver work, which software GL swallows here.) What now dominates draw calls: instanced props/groups
(~170/frame) and vehicles (~130/frame, many parts each) - next: merge static vehicle/building parts per material.
