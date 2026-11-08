# CPU speed-up run (orch/cpu-202611080335)
Baseline on main 873fbf1e, measured in this sandbox (software GL; smooth + grandsmooth ran concurrently, so numbers are inflated):
- smooth.mjs: SMOOTH FAIL (5 problems; pc/phone/mp each REGRESSED twice; pc load time 107.8 s vs baseline 61.4 s)
- grandsmooth.mjs: GRANDSMOOTH FAIL (wide 8796 ms, region 7876 ms, close 5806 ms vs budget 5000)
Not profiled (no Playwright profile run: gates were red before any change, so per CLAUDE.md look/perf work must wait for green).
## Findings from reading code
- Adaptive quality already exists: QUAL governor in src/06-view.js (resolution steps, AO off) and g3ApplyQuality in src/13e-grand3d.js. Slice (2) should extend it (shadow-map every N frames, far-unit anim rate, particle caps, Auto/Quality/Speed setting), not add a second system.
- No frame-budget scheduler exists yet (slice 1); main loop is requestAnimationFrame(loop) in src/08-ui.js ~1494.
## Shipped
Nothing: no code change could be proven green.
