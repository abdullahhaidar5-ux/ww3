# Destructible cities (orch/rubble, 959ddd0)
- What players see: a city block that's shot down leaves real rubble (dust spread over the street, a heap, tilted floor slabs, a broken wall still standing, loose bricks; phones/Low get a simpler heap).
- Infantry in rubble: "IN RUBBLE" — take 50% damage from bullets (70% from shells/blasts) vs 65%/80% in ordinary cover, and get suppressed ~40% slower.
- Tanks, artillery, supply trucks and other big trucks can't climb rubble and drive around it; infantry cross at 70% speed, jeeps/technicals/ATGM carriers at 50%.
- Hard AI infantry holding ground jump into nearby rubble when shot at; all AI routes respect it.
- Sync: rubble grid only exists after the first collapse (no collapse = same game as before); clients, rejoins and host-migration checkpoints rebuild it from the fallen blocks (test: identical).
- Test (added to orch/ewtest.mjs, South Lebanon): infantry route 80 px straight over rubble, tank route 160 px around; driven tank 0 ticks in rubble, arrived 8 px off; damage 25 vs 50 open; supp .057 vs .13.
- Screenshots: orch/shots/rubble/rubble-high.png, rubble-low.png.
- SMOKE PASS locally. CIGATE: 17/18 PASS (mpsync, mpsync-server, headless, migrate x4, ew, mapsweep all pass); touch FAIL on "choosing a building shows ✓/✕" — same check fails on main 5f77314, unrelated to this change.
- servers-live PR needed: yes (03-sim, 02-map, 07b-ckpt changed).
