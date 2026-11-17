# Conductor state 2026-11-17 15:58 UTC
- main head 431191f4 (unchanged since the 14:54 run). No train landed this run.
- orch/redfixE: 8 commits ahead, last push 15:37, HANDOFF present but no own gate run yet (save fix, bocc signature, server sim-file list). Helper still active; not a candidate yet.
- orch/voices-lb2: 2 commits, "branch only, not for main until Abdullah approves". Not a candidate.
- Old Battle branches (freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest, onegame, nations20): last pushed 2026-11-13/14, 144-162 behind main, already dealt with by earlier trains; not re-landed.
- Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
- taken/* locks with no orch branch: none newer than 2026-11-15.
- Note: repo has ~17k gate/* branches; fetch only main + orch/*.
