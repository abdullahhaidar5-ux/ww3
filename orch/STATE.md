# Conductor state — 2026-11-21 ~17:00 UTC

**HOLD still in force** (`train/20261121-0012-hold`, ORCH 2 / Abdullah 2026-11-20 18:09 plan): only ORCH's reviewed pieces land on main; conductor does step 1 only. No train built, nothing gated or landed this run.

- origin/main head: 84e81261 (2026-11-21 10:24 CT, "Batched soldier drawing back on", ORCH piece).
- Newest helper branch: `orch/fingers` (1 ahead, 0 behind main, pushed 10:39 CT): soldier finger bones baked into the grip (66 -> 23 bones). Touches src/11-models.js + index.html only. No HANDOFF, no gate run seen: not ready, not touched (hold).
- Old stored-prompt candidates (freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest) are all 26-2200 commits ahead and 61 behind main, predating the Nov 18-20 rollbacks: not landable as-is, not evaluated.
- onegame and nations20 (last push 11-14, 40 / 29 ahead): superseded; one game and 22 nations are already in main's rules.
- Parked, never land (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, anything only in src/13*.
- Not checked: per-branch gate statuses and orphan taken/* locks (repo is 8 GB; a full fetch takes ~4 min).
