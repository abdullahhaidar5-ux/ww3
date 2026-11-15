# HANDOFF polishspeed (branch orch/polishspeed)

Plain words: a big Battle spent most of each frame in the three.js draw preparation, recalculating the position of every object in the scene twice per frame. Now it is done once, the ambient-occlusion pass skips hidden objects, and static building props (pallets, barrels, containers) are no longer recomputed each frame. Look is unchanged; sim and sync untouched.

Numbers (local probe, 450 units): render prep 80 ms -> 50 ms per frame; depth pass 21 -> 9 ms; colour pass 30 -> 19 ms. Details: orch/reports/polishspeed.md.
Local: build --check OK, smoke PASS, decisions OK. Smooth gates: GitHub run `gate/46e01bce38` was queued (runners busy) when this was written - ready if smooth-pc and smooth-mp are green; check `gate/*` statuses on that sha.
Left for next round: merge static props into the building mesh, far-infantry LOD, far shadow half-rate. Also added `--scene` probe to orch/smooth.mjs. Rebase on main after orch/onegame lands (rebuild index.html).
