# dashI handoff (2026-11-10)
Branch orch/dashI = commit 4dbe1c2e, pushed also as gate/dashI (CI run https://github.com/abdullahhaidar5-ux/ww3/actions/runs/42768960553).
Local: build OK, SMOKE PASS. smooth.mjs not completed locally (sandbox: battle load alone took 272 s) -> GitHub gate decides; ship to main only if gate/smooth-pc, smooth-mp, grandsmooth, stuck, mpsync are green. Not yet run locally: mpsync (sim change: separation weights + stalled()).
Stuck: results + causes + open ideas in orch/reports/stuck.md (46 -> 36 on 4 runs; ~6 transient stalls per column remain). Guard `--max 40`: if gate/stuck is flaky (sweep is not bit-deterministic across page loads), raise to 50 or tighten after re-measuring.
Controls: src/08i-feel.js (markers, edge ease, minimap alert) + small hooks in 06-view / 08-ui. Not eyeballed in a screenshot yet - check markers look right (orientation with Q-rotated camera).
After ship: tick both QUEUE lines, add commit, open main -> servers-live PR.
