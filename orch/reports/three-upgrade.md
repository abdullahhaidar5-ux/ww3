# Graphics Phase 1: 3D engine upgrade (Three.js r128 → r186)

Branch `orch/three-upgrade` at 0f68c8f (latest `main` merged in). Not on `main` yet.

**What looks different:** almost nothing, on purpose. Same seed, same camera, old and new side by side
(`orch/shots/three-upgrade/`, 15 pictures): the 6 map overviews match. Shadows are a little softer and rounder at the
edges. Explosions, smoke and tracers look the same. The Apache is a touch greyer and shows its panel detail more
(the new engine uses the model's real surface directions; the old one got them slightly wrong). Edge smoothing works
like before.

**Frame times** (software graphics on a cloud machine, so only the before/after ratio counts):
desktop close-up −3%, desktop overview +2%, phone (390×844, 4× slower CPU) on a fixed view −2% at the base and +1.5%
in a fight. Phones are not slower. They still get the lighter phone look.

**Gate:** all 16 CI tests PASS on 0f68c8f, including mapsweep, controls, touch, multiplayer sync (both kinds) and the
three host-migration tests that failed earlier. Local smoke PASS.

**Fixes this run:** the comparison script now seeds the battle's random numbers so both builds play the same battle.
I did not need to change the game code. An Apache paint fix I tried turned out to duplicate code that was already
there, so I took it back out.

**Risky:** the page is ~60 KB bigger, because the engine is bundled in. Older phones and browsers without WebGL2
can't run r186. Battles that need the time-budgeted pathfinding drift between runs, so later close-ups compare the
look, not the exact scene.
