# HANDOFF orch/maps-big (maps +25% and more complex) — NOT shipped

**Done on the branch:** `worldScaleFor` 1.56→1.95 (`src/01-data.js`, optional per-map `oldScale:[n]`); `addComplexity()` in
`src/02-map.js`: between every pair of neighbouring bases (Gabriel graph) a ravine on the halfway line with 1–3 bridges,
rock spurs splitting the approaches into lanes, mirrored woods and flank villages; skipped near existing water/rock/cities,
islands maps, and `plain:[n]` (Fulda 6p, Heartland 4p). `G.wood` + `woodSlow()` in `03-sim`: vehicles ×0.7 in woods.
**Checks:** smoke PASS; mapfair static all even (404); battles 660 games → hot seats only fulda|6, heartland|4 (fixed by
plain/oldScale, re-verified), caribbean|4 / taiwan|6 (no new features; clean on re-run). Bench fulda 8p ms/unit·s 0.51→0.45;
phone columns median 411→336 ms. CIGATE: 16–17/18; **touch / controls stance checks fail** ("Hold does not chase/fires
in range": unit pushed 73, or targets at 1.5× range) — 3 runs; plus cfclient "after restart: entities differ" once
(likely the old server build until servers-live deploys). A test-spot tweak in `orch/stances.mjs` made controls fail
instead, so it was reverted. Headless can't repro (holdFar fails there even on main).
**Next:** find why the stance trial spot misbehaves on the bigger maps (print map key + C in `orch/stances.mjs` in the
browser), fix, then cigate, ship, and open main → servers-live.
