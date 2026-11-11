# HANDOFF — Escalation ladder (campaign runner A, extra run, 2026-11-11)
Branch `orch/c-escalation`. Owner system: diplomacy (src/13m-gdiplo.js, `gesc*`, state `GC.esc`); hooks in src/13-grand.js (grDeclare -> gescDeclared; AI war decision -> gescGate). Guard in orch/grandtest.mjs ("escalation"). Sources in orch/REAL-2026.md.
NOT on main: runner rule "no push to main while CLAUDE.md's RIGHT NOW bullet lists gate/grand or gate/grandlive as red".
Slice 1 (the rungs before war): warning -> red line -> forces on alert ($150/mo both); surprise-attack penalty below the red line; off-ramps with/without a mediator; 12-month cool-off;
AI: answers a warning by strength (hold firm / counter-escalate / back down), starts crises ~2% of months, climbs the ladder before every AI war, nuclear pairs stop at the red line (1%/mo war chance there); Crisis alert chip; Diplomacy acts "Escalate" and "Step back".
NOTE for balance: AI wars are now rarer and come 2+ months after the first warning (intended: wars rare). If a test or scenario needs early AI wars, that is where to look (gescGate).
Next slices: the rungs inside a war (limited strikes -> blockade -> strategic strikes -> nuclear alert) tying 13i strikes, blockade and 13zz nuclear into the same GC.esc level; allies/UN reacting per rung; red lines with a stated trigger (e.g. "no troops in province X"); SYSTEMS.md row; screenshot of the Diplomacy tab.
To land: merge origin/main, rebuild, grandtest + decisions + smoke, cigate, push.
