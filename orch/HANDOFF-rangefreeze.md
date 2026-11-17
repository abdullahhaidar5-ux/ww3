# HANDOFF rangefreeze — Test range stutters (Abdullah 2026-11-17 06:18 "the game is running slow now in test range")

Branch `orch/rangefreeze`. View/loading code only (src/05-fx3d.js, 06-view.js, 11-models.js) — no simulation change, servers need no move.

## What froze
New tool `orch/rangefreeze.mjs`: opens the Test range for a nation, spawns a wave of 6 of **every** unit kind it can build
(one kind every 1.5 s), buys and fires every general's power and the Strike, and logs every frame over 50 ms with what ran in it
(sim / render / UI ms, shaders, textures, buffers, canvases, audio decodes, which 3D object was being drawn). Since the
weekend the Test range opens every unit at once, so a player meets each kind's "first appearance" cost within seconds:
- **Jets: ~140 ms for every single jet** (not just the first): the exhaust-nozzle finder fires 275 ray casts into the model each time. Now once per jet model and nation (`JETNZ` cache, 11-models).
- **First unit of each kind compiled its shaders in the frame it appeared** (clerics, spies, AA, airlifters 5 programs, drones...). The loading warm-up now builds every unit kind of the player's nation and the target nation's kinds in the Test range, 3 kinds per step (05-fx3d `range ...` steps); their skinned rigs get pool bone textures too.
- **Fresh soldiers: three.js moved every vertex through the bones to size the figure for culling** (~30 ms per squad). Merged soldier shapes now carry a ready sphere (`skinBS`, rest pose x1.5).
- **Heroes** made their own bone textures on first draw (6 in one frame): every new skinned figure now takes one from the pool (`boneTake`, syncScene).
- **First casualty / first spy / first helicopter or recon-plane shadow** linked a shader: wounded markers, the spy-eye and ground-blob instanced markers, two-sided and cut-out shadow casters are prepared in the warm-up.
- **Fog of war re-drawn and re-uploaded (618 KB) 8x a second** although the Test range reveals the whole map: drawn once now (fog texture uploads 124 MB → 0 over a run).

## Numbers (2-core sandbox, CPU slowed 2x, longest frame during waves+powers+strike)
| nation | before (7db4c80, Saturday) | main ab83d2d | after |
|---|---|---|---|
| IR | 1285 ms, 10 programs, 24 textures in one frame | 879 ms, 9 programs | 227-313 ms, 0-1 programs, 0 textures |
| RS | 381 ms, 5 programs | – | 194 ms, 0 |
| US | 2371 ms, 3 programs | – | 205 ms, 0-1 |
| RU | 2564 ms, 8 programs | – | 195 ms, 0-1 |
| OB | 1232 ms, 3 programs | – | 196 ms, 0 |
(The rest of each long frame is the sandbox's software rendering; a real GPU frame is far shorter. Compare relative numbers.)

## Gate
`gate/superfreeze` now also runs `node orch/rangefreeze.mjs IR,RS,US,OB` (fails on >1 shader program after loading, >2 new
textures in one frame, a frame 300 ms over the quiet max, or errors; a failing nation runs twice before it fails).

## Left
- A rare shadow variant can still link 1 program (the dying enemy Apache glass shadow is now warmed; still seen: a shadow-depth variant with a texture for an enemy model at scale ~0 during the recon power, e.g. the G6 turret - PROGMAX=1 allows one; next step: find which code scales models to 0 while they still cast shadows).
- Steady per-frame costs found, not changed: `zhCtx` (command bar) forces layout 5x/s (getComputedStyle/getBoundingClientRect), the minimap drawImage ~0.8 ms/frame.

## Try for 2 minutes (PC)
https://abdullahhaidar5-ux.github.io/ww3/ → Test range → Iran vs United States → select the Airfield and queue 5 jets (Shift+click), then the Barracks: 5 of each infantry kind; fire the Strike. The screen should no longer hitch when each new kind rolls out.
