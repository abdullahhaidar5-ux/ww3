# polishD handoff (2026-11-15)
Done in src/: UA FPV Drone Team `fpvt` (barracks, vehicles only via `vehOnly` in canTarget, 8 drones), TR Bayraktar TB2 `tb2` (airfield heli-class, rank-gated, max 2), IR Shahed Launcher Truck `shl` (War Factory, rocket artillery 640 m, 6 drones, rank-gated, max 2) - data + tips in `src/01d-signatures.js`, `SIGU` rank gate in 08-ui, barracks extras in `roster()`, icons in 08j-uikit, alias/voice/model hooks.
AI: `aiSigWant` (end of 03g-modern.js) deliberately buys krb / shl / tb2 / fpvt (rank >= SPEC_RANK, army size gates, max counts).
Hidden Firing Post (RV/OB): holds 4 infantry in `b.gar` (like the Mountain Fortress list, so the checkpoint saves it), enter = right-click with infantry (`tun` action), leave = select post + right-click ground (`unl`), each soldier inside speeds its fire +30%, garrison walks out when it falls. Client display of the count is not shown (exit works regardless).
Guards: orch/decisions.mjs "polishD signature/post broken". Smoke PASS locally.
See orch/reports/balance-1115.md for the balance run.
