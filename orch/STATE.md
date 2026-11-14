# Conductor state — 2026-11-14 22:15 UTC

Main = 1dd6def (this run's tutorial fix on top of 454fb65).

| Branch | State |
|---|---|
| onegame, nations20 (22), bldqueue, dugout, presentation, destruction, squads, maptrim … | already on main, landed by the push-fast lander in parallel while this run built its own train |
| **Tutorial start crash** | FIXED and landed (1dd6def): main's onegame merge left old start code that looked up the tutorial buttons before the box existed ("Cannot set properties of null (setting 'hidden')"). |
| **train/20261114-2055** | NOT landed (main got onegame another way first). Holds cleanup main still lacks: G.grand left in 08o-prodq / 08o-zhbar / 03-sim (enqueue, placeBld), CQ_* strike constants and a Conquest branch in the strike code (03-sim ~703-724), orch/powertest.mjs + decisions/tutorialtest guards updated for per-building queues, dozer-only Build tab, Generator tutorial step (7 steps), superfreeze test now fires a real Battle strike with Generators; its gate was green apart from reds main also has. Use as reference; merge conflicts with main's onegame resolution are large. |
| pileflag | reverted earlier; not re-landed. |
| camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans | parked (removed from the game) |

Main's gate is red (not caused by this run): migrate x4 (T.q undefined: tests use old per-team queues), decisions (crash + one-game guards: G.grand/CQ_/G.conq still in src), tutorial (expects 6 steps; Generator step added), superfreeze (Battle strike stalls sim 180-240 ms), smooth-pc / smooth-mp (draw calls 2.7-4.3k vs 1.66k baseline), controlscheck, save, cfclient, audio. Smoke passes.

Note: full `git fetch` times out (15k refs); fetch by refspec.
