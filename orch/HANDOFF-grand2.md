# HANDOFF grand2 — NOT on main yet (push to main was blocked: the CI gate was not fully green)
Branch `orch/grand2` holds everything (merged with origin/main at 2026-11-06 ~23:00 UTC; local grandtest PASS on the merged map, SMOKE PASS earlier).
Gate run on a1339e8 (and a re-run): all green EXCEPT `smooth-mp` (MP client frame p95 395 then 309 ms vs 300 allowed; baseline 125). tutorial and mpsync failed once, then passed on the re-run. grand + grandsmooth + smooth-pc green.
My stage touches no multiplayer/Conquest code path (only src/13*.js, idle outside the grand map), so smooth-mp is probably runner load, but it is unproven: a control gate on main (branch gate/ctrl-main-888d) was queued to compare.
To finish: read gate/smooth-mp for gate/ctrl-main-888d (and for the merge commit); if main also fails or it passes, merge origin/main into orch/grand2, rebuild, fast-forward push to main.
Not done: battle supply trucks from the entry edge, 3D map building icons.
