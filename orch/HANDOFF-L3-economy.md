# HANDOFF L3-economy (branch orch/L3-economy, lock taken/L3-economy)

Status: code done, NOT yet proven - not ready to land. Gate run gate/86425d3e18 was still "queued" on GitHub after ~25 min (runners busy), so no gate result yet.

Done (answer Q1a, light version always on in Battle):
- `src/01-data.js`: `ECON_LIGHT` table + `econBT`/`econUp`. Rich-expensive US GB FR DE IL JP KR SA AE: train x1.1, income x0.9. Poorer-fast IR RS DW RV OB KP UA: train x0.75. Others 1.0. Only active when `G.battle` and not grand Fight-it; Realistic (`G.real`) keeps full REAL_TIER; Conquest untouched (so orch/onegame removing Conquest does not conflict).
- `src/03-sim.js`: `prodTime` and `incMul` use them (no new sim state, derived from G.battle + nation, so nothing for 07b-ckpt).
- `orch/decisions.mjs`: runtime guard "L3 light economy".
- Local: build --check OK, SMOKE PASS. decisions.mjs timed out locally (slow sandbox); smooth/grandtest not run locally per CLAUDE.md.

Left: (1) read gate/86425d3e18 statuses when the run finishes; (2) `node orch/tourney.mjs` equal-win-chance proof (45-55%) - needs a fast machine; if poor-fast nations win too often, raise bt to .85; if rich lose, lower up penalty; (3) encyclopedia/lobby text mention (optional); (4) then rebase on origin/main, rebuild, land.
