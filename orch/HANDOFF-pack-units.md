# HANDOFF pack-units (2026-11-19, second run)

## Done
- Unit limit 500 (<=4 players) / 300 (5-8): branch `orch/pack-units-land` (654c68a3b3), rebased on main 5355925, gate run 44560263882: 26/27 green. Only `superfreeze` (RANGEFREEZE FAIL, slow runner) red after one --failed rerun; first smooth-pc red also passed on rerun. Not landed (rule: one rerun only).
- popCap() counts non-rebel teams at start (no checkpoint field needed; derived from G.teams). Guard in orch/decisions.mjs. CLAUDE.md, DECISIONS, HISTORY updated.

## Left
- Re-run superfreeze (or fresh cigate) on 654c68a3b3, land to main, then check autodeploy moved servers-live (else: git checkout -B sl origin/main; git merge -s ours origin/servers-live -m "servers-live: unit limit 500 for 1v1/2v2"; git push origin sl:servers-live).
- Soldiers up close: only WIP db86ffec6 on `orch/pack-units` (chest rig, radio, straps; not gated, no before/after shots). Still to do: IR camo texture atlas, headgear, face shading, RS/DW/RV looks.

## Try on PC (2 min)
Start a 1v1 Battle, build a Barracks, queue infantry: the counter should read units x/500.
