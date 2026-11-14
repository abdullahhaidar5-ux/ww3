# STATE — conductor run 2026-11-14 ~16:00 UTC

main = 6c3916f (revert of the pileflag merge; gates: only the known-flaky audio / cfclient / tutorial red). Train `train/20261114-1610` = freezefix, sweepfixB, battleclean2, unstuck (dugout taken OUT: crashed decisions.mjs dugout check). Local build/smoke/decisions PASS. CI gate gate/a0b31f7264 queued 90+ min, never started: NOTHING LANDED. Next run: if that gate is green, fast-forward main to it.
Stale: train/20261114-1303 (based on pre-0256 main, own gate red: decisions, cfclient) — do not land; train/20261114-0900 = main.

| Branch | Last push (UTC) | Ahead of main | HANDOFF | Own gate | Train |
|---|---|---|---|---|---|
| freezefix | 11-13 03:04 | 12 | yes (ready, merged with main of 11-12) | none | IN train |
| sweepfixB | 11-14 03:38 | 3 (2-row order dock) | yes | none | IN train |
| battleclean2 | 11-14 04:00 | 8 | yes | 13 of 28 green, rest unreported | IN train |
| dugout | 11-14 03:54 | 12 | yes | none | IN train |
| unstuck | 11-14 01:59 | 2 | no | none | IN train (gate.yml + headless.mjs merged by hand) |
| battlepower | 11-14 03:03 | 5 | yes | 27 statuses, none red | CONFLICT in src/08-ui, 08c-towns, 08i-hud — next train (needs a rebase by its owner or a small-hunk merge) |
| bldqueue | 11-14 03:14 | 7 | yes | controls/tutorial/migrate* red (likely stale) | not yet (after battlepower) |
| techbldgs | 11-14 03:42 | 11 | yes (part 1 ready alone) | none | next train |
| groundreal / leaderlook / usvoice / ammozone | 11-14 03:55–05:29 | 4/11/3/7 | yes | gates were queued, no result | next trains |
| looktest | 11-14 15:07 | 3 | yes — Abdullah picked B Cinematic 09:06 | none | next train |
| onegame | 11-14 04:41 | 16 | yes | none | after the Battle branches |
| nations20 | 11-14 03:33 | 5 | yes (NATIONS20-NOTE: Keep 22 not applied) | none | last |
| orderfeel / ghostslot / testrange | | 1 each (handoff text only) | yes | green | already on main; nothing to land |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans, anything only in src/13*.
Lock with no orch branch: L3-economy, L5-unitlooks, army-standards, c-real-supply, finish-tokens, freezefix2, realwar, seamless-hud, spylook2 (age not checked; saved nothing).
