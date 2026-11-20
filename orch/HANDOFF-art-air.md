# HANDOFF art-air
Bundle 1 (drones, src/11-models.js buildDrone + dLathe/dWing/dFin/dProp helpers): delta (Shahed), tb2/mq, lancet rebuilt; quads only got motor bells + tapered props. Before/after sheets: orch/shots/art-air-{before,after}-<family>.jpg.
Todo: quadcopter/FPV/Kargu body detail, Mohajer-6 for IR, then bundle 2 (helis/jets on m_* models: canopy glass, pylons, markings). Local smoke/decisions too slow in sandbox: use orch/cigate.sh.

## Status 2026-11-20
Bundle 1 pushed on orch/art-air (6c3c745), NOT on main. Gate run 44629024309: 27/28 green; gate/superfreeze red 3x on OB: "longest frame 1488 ms ... over quiet 33 ms (max 300)". Locally rangefreeze passes for IR, RS, US, OB (longest 147-190 ms, 0 new programs). Main commit 0a0608b was already red on gate/superfreeze before this work, so it may be a runner/main problem. Needs: someone check whether main is superfreeze-red now; if green, retry bundle 1 on a fresh gate; if still red only on this branch, look at the OB drone wave (fpv quadcopter, new dProp blades + motor bells) first.
Bundle 2 (helis/jets) not started.

## Status 2026-11-20 (run 2)
Rebased bundle 1 onto main 73e8a86. Gate 27/28 green twice; only gate/superfreeze red, at DIFFERENT places each time (966 ms in "wave dtank" on try 1, 728 ms in "wave drone" with renderFrame only 29 ms on the rerun). Main itself flips superfreeze success/failure commit to commit (73e8a86 ok, 07674c0 red, a7a2b73 red, 04e3ebf red) so it is runner noise. Trying one fresh gate on a new commit before landing. Bundle 2 (helis/jets) still not started.

## Status (landed)
Bundle 1 (drones) is on main (a3540c1) after a green full gate (third gate run; the first two hit flaky superfreeze at different waves, main flips on it too). Bundle 2 (helis/jets: canopy glass, pylons, rotor detail, markings on m_* models) NOT started - next helper picks it up from here. Still todo for drones: quadcopter/FPV/Kargu body detail, Mohajer-6 for IR.

## Restart check 2026-11-20 (ORCH 2 note)
Checked own part: drone geometry is built once per nation+type (DPROTO cache in src/11-models.js droneModel), cloned afterwards, one shared MeshStandardMaterial (DPROTO._mat) - no new shader program variants; the Test-range warm-up in src/05-fx3d.js already builds every unit kind of each team (drones included) before play. Bundle 1 is already on main and green. Superfreeze spikes moved between waves (dtank, drone, ew) so they are not drone-specific. Next: quadcopter/FPV/Kargu body detail, Mohajer-6 (IR), then bundle 2 (helis/jets). Not started this run.
