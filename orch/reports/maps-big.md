# Maps-big — bigger, more complex maps (shipped b9131be)
**Size:** `worldScaleFor` 1.56→1.95 (+25%); per-map `oldScale:[n]` keeps 1.56 (Heartland 4p).
**Complexity:** `addComplexity()` (02-map): per neighbouring-base pair (Gabriel graph) a ravine on the halfway line with 1–3 bridges, rock spurs splitting lanes, mirrored woods, flank villages; skipped near existing water/rock/cities and on island maps; `plain:[n]` opts out (Fulda 6p, Heartland 4p). Woods slow vehicles ×0.7 (`woodSlow`, 03-sim).
**Fairness:** static all even (404 layouts); 660 AI games → hot seats fixed or clean on re-run. **Cost:** fulda 8p 0.51→0.45 ms/unit·s; phone columns median 411→336 ms; 8p setup +~2 s.
**Tests:** stance test pins its target; touch test re-selects before strip taps (main's deselect-after-order had broken it). CIGATE 18/18 (ew, migrate-abrupt passed on one rerun).
**Needs:** Abdullah merges servers-live PR #13.
