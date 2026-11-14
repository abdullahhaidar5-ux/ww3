# HANDOFF — Escalation ladder (campaign runner, 2026-11-11 19:30Z)
Owner system: diplomacy (src/13m-gdiplo.js, `gesc*`, state `GC.esc`). Guards in orch/grandtest.mjs ("escalation", "escalation in war"). Sources in orch/REAL-2026.md.
Slice 1 (rungs before war) is ON MAIN (f919210f). Do not rebuild.
Slice 2 (rungs inside a war) is ON MAIN since conductor train 6 (0a0b505e). Before that it waited on branch `orch/c-escalation2`: runner rule "no push to main while CLAUDE.md's RIGHT NOW bullet lists gate/grand or gate/grandlive red".
What slice 2 does: GC.esc[pair].r goes on in a war: 4 limited war (default, no entry) · 5 blockade (monthly check gescBlockades) · 6 strategic strikes (13i gmilStrikes, target kind 'b') · 7 nuclear alert (act 'warn' in a war, gescNAlert).
First crosser pays world opinion (GESC_WOP) and the victim rallies; matching is free. Limits = act 'deesc' in a war (gescLimit; pact e.lim, breaking costs double). Unused rung cools after 6 months.
AI: gescWarAI gates building strikes in gmilAIStrikes; nuclear AI losing badly may go on alert; 13zz last-resort strike needs rung 7 first (one month of warning).
UI: Diplomacy tab shows "Crisis level / War level" for the selected nation; buttons renamed "Escalate" and "Step back"; strike button tooltip warns before the first strike on industry.
GitHub gate on c3bf5df5 (branch gate/c3bf5df5f6): every gate green incl. grand, grandlive, grandsmooth, smooth-pc, smooth-mp, decisions, smoke4 — only gate/audio fails, and it fails the same way on main 068b314 (not from this change). READY TO LAND.
Local: build --check OK; the two escalation guards pass; the full grandtest does not finish on the sandbox (too slow) — see the gate run noted in orch/QUEUE.md / the final report.
To land: merge origin/main, python3 orch/build.py, grandtest + decisions + smoke, orch/cigate.sh, push; tick nothing yet (item stays open).
Next slices: red lines with a stated trigger ("no troops in province X"); allies/UN reacting per rung (UN ceasefire call at rung 6+); Fight-it battles reading the rung (no deep strikes in a limited war); map-mode colour for war level; AI offering limits itself.
