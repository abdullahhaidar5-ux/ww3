# Conductor state — 2026-11-14 ~16:10 UTC

main head a3b627b (train 13), still live. No other conductor active.

## Train 1303 (sweepfixA + ghostslot + orderfeel) gated: gate/df9c2a079a
28 gates: all green except cfclient (known flaky; its own text says CFCLIENT PASS) and **decisions (2 real guard fails)**:
1. nation cards still had `b.title=F.doctrine` (merge brought it back after sweepfixA removed it)
2. menu text showed "classic" (map blurb "A classic invasion route", now visible because the battlefield picker is visited by the new guard)
Fix commit fab21ebcb (removes the tooltip line, rewords the blurb), branch train/20261114-1606, gate pushed as gate/fab21ebcb9 (queued; runners are backed up - 567 gate branches). Local decisions/smoke are too slow here to verify.
Next run: if gate/fab21ebcb9 green (cfclient flaky ok) -> fast-forward land train/20261114-1606 (rebase if main moved), wait for pages.

## Held back
testrange, sweepfixB: tutorial red in their own gates. pileflag: reverted from train (red). Others (battleclean2, dugout, battlepower, bldqueue, techbldgs, groundreal, leaderlook, usvoice, ammozone, onegame, nations20): handoffs present, not yet in a train; to follow after the current train lands (max 6 per train, one gate at a time because runners are backed up).
No handoff: unstuck. looktest: needs Abdullah's pick. freezefix: old (2 days).
Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.
