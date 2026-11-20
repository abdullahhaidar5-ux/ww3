# HANDOFF art-air
Bundle 1 (drones, src/11-models.js buildDrone + dLathe/dWing/dFin/dProp helpers): delta (Shahed), tb2/mq, lancet rebuilt; quads only got motor bells + tapered props. Before/after sheets: orch/shots/art-air-{before,after}-<family>.jpg.
Todo: quadcopter/FPV/Kargu body detail, Mohajer-6 for IR, then bundle 2 (helis/jets on m_* models: canopy glass, pylons, markings). Local smoke/decisions too slow in sandbox: use orch/cigate.sh.

## Status 2026-11-20
Bundle 1 pushed on orch/art-air (6c3c745), NOT on main. Gate run 44629024309: 27/28 green; gate/superfreeze red 3x on OB: "longest frame 1488 ms ... over quiet 33 ms (max 300)". Locally rangefreeze passes for IR, RS, US, OB (longest 147-190 ms, 0 new programs). Main commit 0a0608b was already red on gate/superfreeze before this work, so it may be a runner/main problem. Needs: someone check whether main is superfreeze-red now; if green, retry bundle 1 on a fresh gate; if still red only on this branch, look at the OB drone wave (fpv quadcopter, new dProp blades + motor bells) first.
Bundle 2 (helis/jets) not started.
