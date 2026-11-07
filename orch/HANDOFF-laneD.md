# HANDOFF laneD (2026-11-07 04:45Z)
Shipped: D2 slice 3 (MBT -> Tank names). newplayer audit clean (0 issues). Local smooth gate times out on the cloud box; CI gates it.
## D1b "Realistic" toggle — findings so far (not started in code)
- No `realistic` option exists anywhere in src/ (grep confirmed); GR_REAL (src/13i-grandrealstart.js) has nation tiers [gdp, mil, ...] but is grand-only.
- Battle options ride in `setup.w` (weather base + season in tens digit, wxJoin/wxBase/wxSsn in 08-ui.js ~1184). Net validates `d.w` in -31..39 (07-net.js:228), so a new flag must NOT be packed into w without widening that check in 07-net, the server copy and checkpoints (07b-ckpt). Cleaner: add a separate `bal` field next to `w` in cfCfg (07-net.js:125) / startMP / newGame opts, saved in checkpoint.
- Hooks for the tier table: CQ_START (03-sim.js:1369) for money, power cooldown/count in 01-data powers, AI uses same rows.
- Needs a servers-live PR after merge (sim change). Do as one Opus/Sonnet session with smoke + mp gates; ~2 h.
## Next in order: D1b -> D3 (XTTS voices need GPU/runner) -> D4 balancer workflow -> D5.
