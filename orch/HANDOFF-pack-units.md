# HANDOFF pack-units (2026-11-19)

## Done
- Unit limit: `popCap()` in src/03-sim.js = 500 when the battle has at most 4 players (team slots, rebel team not counted), 300 for 5-8. Derived from the team list (fixed at start), so host, clients, servers, saves, migration agree; no checkpoint field needed. HUD tooltip mentions it; guard in orch/decisions.mjs ("unitlimit"); DECISIONS + CLAUDE.md updated. LANDED on main as d7fbc495e (own cigate green on the 2nd run: smooth-pc p99 spike and superfreeze failed once on slow runners, passed on gh run rerun --failed).
- NOTE: an earlier attempt read an unset `G.N` (cap would have stayed 300); fixed to count teams.

## Left
- Battle servers: check `git ls-remote origin servers-live` equals/after d7fbc495e once main's gate is green; if autodeploy has not moved it ~30 min after a fully green main, do the `merge -s ours` push from the task text.
- Soldiers up close: only WIP db86ffec6 (chest rig, radio, straps, view only, merged into the single soldier shape). Not gated, no before/after shots yet (orch/gfxinf.mjs --tag before/after was rendering locally, very slow). Still to do: IR camo texture/atlas, headgear, face shading, RS/DW/RV looks, smooth gates, shots in orch/shots/infantry-closeup-*.jpg.

## Try on PC (2 min)
Start a 1v1 Battle, build barracks, queue infantry: the counter should read units x/500. Then zoom right into an Iranian rifleman (once soldiers land).

## Update (restart run, 2026-11-19 evening)
- Main d7fbc495e had all 28 gates green; autodeploy had not moved servers-live after ~2 h, so servers-live was moved by hand (merge -s ours, b3f11e644). Battle servers now run the 500/300 cap.
- Soldiers: still only WIP db86ffec6 (+ before/after shots in orch/shots/gfx-infantry). Next: render a close-up of the IR rifleman with the WIP, then IR camo atlas + headgear, one gate run per landing (gate queues 30-60 min).

## Update (run 3)
- Servers verified: servers-live b3f11e64 contains d7fbc495. Unit limit fully done.
- Soldier chest rig/radio/straps re-applied onto main 074ab67 (branch orch/pack-units-r3; old orch/pack-units left untouched). Local smoke/decisions too slow in sandbox, relying on cigate. Left: IR camo atlas, headgear, face shading, RS/DW/RV.
- Gate on 1034a5f4b6: 27/28 green; gate/superfreeze (rangefreeze, OB) failed twice incl. one rerun: longest frame 676 ms vs quiet 42 ms, renderFrame-heavy; makeObj inf 19-25 ms. NOT landed on main. Next: check whether main alone passes rangefreeze on a re-run; if so the gear adds a first-use stall (pre-warm soldier gear merge / cut pouches) before retrying.
- Restart run (ORCH 2 note 18:35): rebased onto main 338cbae0 as orch/pack-units-r4 (0d96beae); gate again 27/28, superfreeze/rangefreeze FAIL a 3rd time (log shows only "RANGEFREEZE FAIL", OB ok; nation line not found in the tail). Not landed. Free soldier model scout: none usable, so keep improving our soldier. NOT started: camo textures per Shia nation, helmet cover/goggles, face shading. Next: run rangefreeze locally per nation on r4 vs main to find which one stalls and whether gear merge needs pre-warm.
