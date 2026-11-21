# Conductor state — 2026-11-21 ~16:00 UTC

**HOLD in force**: `train/20261121-0012-hold` (ORCH 2, Abdullah 2026-11-20 18:09 plan): nothing lands on main except ORCH's reviewed pieces; conductor does step 1 only. No train built, nothing gated or landed this run.

- origin/main head: 1a09fdf (2026-11-21 09:39 CT, "Bring back freeze fixes + China/Russia AI counter-pick", ORCH piece). Before it: anthems removed, rollback to Nov 17/19 versions.
- Branch counts on origin: orch/* 606, taken/* 101, train/* 44, gate/* 800, gate-logs/* ~21k (a plain `git fetch --prune` now times out; fetch single refs).
- Old candidates from the stored prompt (freezefix, sweepfixA/B, orderfeel, ghostslot, testrange, battleclean2, pileflag, unstuck, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, looktest) still exist as branches but predate the Nov 18-20 rollbacks; not evaluated (hold).
- Fetched: orch/testrange last push 11-14 03:06 (30 ahead), orch/onegame and orch/nations20 last push 11-14 12:46 (40 / 29 ahead). One game and 22 nations are already in main's CLAUDE.md rules, so these are superseded/parked.
- Never-land (parked, removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, src/13*-only.
- Not checked this run: per-branch gate statuses, taken/* locks without orch/* branch (fetch too slow).
