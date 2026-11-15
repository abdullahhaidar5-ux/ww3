# HANDOFF polishB (landing run 2026-11-15)
The three lane branches were stacked: orch/L2-mechanics already contained L1-signatures and L3-economy. Landing L2 therefore landed all three at once (main 2141fb11e, servers-live 19b2c991e).
- L2 mechanics: merged with main (kept Zero Hour bar, controls, 22 nations, one-game removal; Realistic/Conquest bits dropped). fmTick now keys off G.t (no module accumulator) so host and clients agree. Hidden Firing Post RV/OB, Shia forts x0.6 in Battle, US/IL +8% cost/hp, SA/AE air-defence link.
- L3 economy: ECON_LIGHT (rich nations train 10% slower, poorer-fast nations 25% faster) is live in Battle. Not proven by orch/tourney.mjs.
- L1 signatures (src/01d-signatures.js): RS tunnel ambush, IL/DE APS, RU/CN mass armour, KP KN-25 rocket battery are live. Still NOT done: UA FPV team, TR Bayraktar, IR Shahed truck, L1 decision guards, AI build list for KN-25, tourney balance run, playtest that the 12-rocket ripple stays smooth.
Checks here: build + --check OK, no conflict markers, decisions.mjs ran 15 min with no FAIL (timeout), smoke.mjs too slow in sandbox. No cigate (push-fast mode). Please run orch/cigate.sh and tourney.mjs on a fast machine.
