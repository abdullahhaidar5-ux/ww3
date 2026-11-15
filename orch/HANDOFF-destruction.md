# HANDOFF destruction (branch orch/destruction, 2026-11-14)

## What players see now
- **Base buildings** (3 stages): light (<60% health) scorch marks and debris; heavy (<40%) fire and black smoke; **new: below 30% the roof sags and the walls lean slightly**; destroyed: **new short collapse** (the building sinks with a dust cloud for ~2 s, tilting a little), then a rubble pile rises where it stood.
- **Rubble from a fallen base building stays** for the whole battle (visual 15 min) and **now acts as cover**: its ground cell is rubble (tanks route around, infantry cross it) and gives cover. Deterministic: it reuses the existing hulk list `G.bfHulk` (entry flag `b:1`), which is already in the checkpoint (`src/07b-ckpt.js`), so saves, rejoins and host migration agree. Clearing orders (Construction Vehicle/Dozer) remove it like a wreck.
- Already in main and kept as is: neutral/garrisonable buildings have 3 stages and collapse to rubble (`civStage`, `collapseCiv`, `src/03f`, `05c`); vehicles smoke at heavy damage, burn at critical (`unitDamageFX`) and leave a burnt wreck with cover (`hulkAdd`, `src/03g`). Infantry: no gore (untouched).
- Smoothness: no new meshes per building: the collapse reuses the building's own object, the pile is one merged mesh, the sag is a scale/tilt. Rubble is limited to buildings of size 24+ and shares the 96-entry hulk cap (oldest fades).

## Code
`src/03g-battlefeel.js` (hulkAdd accepts base buildings) · `src/05-fx3d.js` (SINKS collapse, long-lived rubble) · `src/06-view.js` (stage-3 sag). `orch/destrshots.mjs` makes the screenshots.

## Screenshots (orch/shots/)
destruction-base-1-light.jpg, base-2-heavy, base-3a-collapsing, base-3b-rubble, destruction-neutral-1-light, neutral-2-heavy, neutral-3-rubble, destruction-tank-1-heavy, tank-2-critical, tank-3-wreck.

## Gates
- `python3 orch/build.py` and `--check`: pass.
- Local smoke: the sandbox is too slow (loading screen took 228 s); it got through battle setup and building checks without errors but did not reach SMOKE PASS in 10 min. decisions.mjs also timed out here.
- `orch/cigate.sh` run ONCE on gate/<sha of this branch head at the time>: **no result** - GitHub's runner queue held 30 queued gate runs; mine stayed queued for 1 h and the script timed out at 0/28 (not a failure). Re-run `orch/cigate.sh` (or just wait for run 43553394717) before landing.
- Not added: a decisions.mjs guard for building rubble (not run locally); the sim state check is `G.bfHulk.some(h=>h.b)`.

## Status
Code is **ready for review, gates not yet confirmed green**. Conductor: land only after smooth-pc / smooth-mp / smoke are green on GitHub. Try for 2 minutes: Battle, shoot a barracks down with a tank and watch it sink, then walk infantry into the pile.
