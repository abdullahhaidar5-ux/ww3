# STATE — conductor run 2026-11-15 ~05:55 UTC (re-check: main moved only d3f3969/icons merges since 05:00; no new pushes on any candidate; no train landed; table below unchanged)

# (earlier) run ~05:00 UTC

**No train landed this run.** Every queued Battle branch was last based on a main that is now 135–153 commits behind; other lanes
(L1–L6 "Land:" commits, UI audit, gatefix) pushed ~10 commits to main in the last hour, and 6 of 6 trial merges conflicted in src.
The one I could finish (sweepfixA) turned out to be already in main by content (only its two decisions.mjs guards were new) —
not worth a main push on its own. No branch has its own gate run (only battlepower, bldqueue show one gate/ sha).
Owners must rebase on origin/main first (onegame: 275 files vs 658 changed on main since its base — needs a dedicated rebase).

| branch | last push | commits not in main | HANDOFF | note |
|---|---|---|---|---|
| freezefix | 2d | 11/12 | yes | conflicts gate.yml, 05-fx3d, 08-ui |
| sweepfixA | 28h | 3/3 | yes | already in main by content; decisions guards only |
| sweepfixB | 25h | 7/7 | yes | conflicts 08-ui, decisions |
| orderfeel | 24h | 5/5 | yes | conflicts 06-view, 06d, 12-campaign |
| ghostslot | 25h | 3/3 | yes | conflicts 03-sim, 08-ui |
| testrange | 26h | 7/7 | yes | conflicts 03-sim, 06-view, 08-ui, 08i-hud, 14-menu |
| battleclean2 | 25h | 8/8 | yes | not tried |
| pileflag | 10h | 6/7 | yes | not tried |
| unstuck | 27h | 2/2 | NO | not tried |
| dugout | 10h | 13/16 | yes | not tried |
| battlepower | 26h | 4/5 | yes | one old gate sha |
| bldqueue | 26h | 6/7 | yes | one old gate sha |
| techbldgs | 10h | 10/12 | yes | not tried |
| groundreal | 24h | 4/4 | yes | not tried |
| leaderlook | 23h | 11/11 | yes | not tried |
| usvoice | 24h | 3/3 | yes | not tried |
| ammozone | 25h | 6/7 | yes | folded into onegame |
| looktest | 14h | 3/3 | yes | needs Abdullah's look pick (plan75 not read) |
| onegame | 10h | 13/17 | yes | main still has src/12-campaign, 03e, 08c-towns; waits on rebase |
| nations20 | 10h | 5/6 | yes | last in order |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

taken/ locks with no orch/ branch (saved nothing): drawcalls, redgates, savesync (33 min, too young), army-standards, c-real-supply,
finish-tokens, freezefix2, realwar, seamless-hud, spylook2 (3–4 days).

train/20261115-0300 (gatefix) was pushed 02:52, not in main; older than 110 min so not blocking.
