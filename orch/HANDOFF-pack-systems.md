# HANDOFF pack-systems (2026-11-20)
Branch `orch/pack-systems` (commit 4e73441).
Item 2 (CN/RU weak AI): Normal AI now uses the Hard counter-pick for the Barracks of CN and RU only (src/03-sim.js, the `pick` line in the AI buy loop); pack-polish2 had found Normal's blind pick buys many anti-tank/medics. Not landed yet.
 - Gate run 44651799014 (gate/4e73441670) and Balance run 44651803964 (balance/1120a) were queued, waiting for runners, when this session stopped. Local smoke is too slow in the sandbox (no output in 9 min).
 - Next: when both are done, check CN/RU pooled win% (target 40-60); if gate is green and CN/RU improved, rebase on origin/main, rebuild, land on main, then move servers-live (sim change): git fetch origin +refs/heads/servers-live:refs/remotes/origin/servers-live; git checkout -B sl origin/main; git merge -s ours origin/servers-live -m "servers-live: CN/RU AI"; git push origin sl:servers-live. Write orch/reports/balance-1120.md.
Item 1 (500 units, 8 players): NOT started. Plan: merge each building model's static meshes per material once per model key (cached, same materials, so no new shader programs), or instance identical buildings; measure with the Cap test; only then raise popCap.
Note: `gh` CLI auth fails in this sandbox (bad GH_TOKEN); use the github MCP actions_* tools to poll runs.
