# Conductor state 2026-11-17 16:55 UTC
- main head f44fc895 (redfixE landed itself: save replays exactly, server sim-file list, gate test races). Main gate + Gate bisect still running on it; autodeploy servers green.
- orch/redfixE: 0 ahead of main, merged. orch/shiamissions: 0 ahead (already in main). Nothing to train, nothing landed this run.
- Old Battle branches (freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest, onegame, nations20): last pushed 2026-11-13/14, long behind main, dealt with by earlier trains; not re-landed.
- Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
- taken/* locks with no orch branch: none newer than 2026-11-15. Last train/* branch: 20261117-0950 (in main).
- Note: clone is 4.8 GB and fetch of all branches times out; state read through the GitHub API (events + compare).
