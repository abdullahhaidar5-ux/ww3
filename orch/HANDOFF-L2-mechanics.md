# L2 Faction mechanics — status: code done, gates pending (see end)
Built (src/03k-factionmech.js + small hooks in 01-data, 03-sim, 08f): RV/OB Hidden Firing Post (tunnel slot renamed, 350 cost, hidden until it fires, no network; IR/RS/DW/KP keep tunnels; GPR reveals posts); Shia five (IR RS DW RV OB) turret/tunnel/coast/fort cost x0.6 in Battle (not in Realistic); US/IL cost +8%, HP +8%, unit build time +10% (off in Realistic); SA/AE SAM+AA within 300 m get +10% range (re-derived each second, not saved in checkpoints).
Not done: post holds no 4 units (plain hidden gun); screenshots; Europe perks / RU-CN platoon bonus are L1; tourney balance run not executed (too slow here).
Guard: orch/decisions.mjs "L2 faction mechanic broken". Smoke PASS.

## Gate status (2026-11-14 ~16:20 UTC)
Local: build --check OK, SMOKE PASS. Local decisions.mjs timed out (sandbox too slow, not a failure).
cigate: pushed gate/67bc39cd3c (run 43614928091, workflow "Ship gate (parallel)"), still QUEUED after ~20 min (runner backlog). NOT yet green: check its 28 gate/* statuses on commit 67bc39c before merging. NOT ready until they pass.
Branch: orch/L2-mechanics (not merged to main).
