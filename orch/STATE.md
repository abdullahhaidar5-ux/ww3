# Conductor state — 2026-11-14 ~13:00 UTC

main head a3b627b (train 13). Live site = that. No other conductor run active (last train push 08:53 UTC).

## Update 13:35 UTC
Old train 0900 (gated 09:03, runners started it only 12:18): tutorial RED (twice, with testrange and sweepfixB; both of those were red on tutorial in their own gates; ghostslot, orderfeel, sweepfixA green). Not landed.
New train train/20261114-1303 = sweepfixA + ghostslot + orderfeel (the exact commits that had green own gates), gate pushed as gate/df9c2a079a, QUEUED on GitHub since 13:14 behind gate/0cea660215 (queued since 10:11). Next conductor run: if gate/df9c2a079a is green (no red main lacks), fast-forward land it (rebase if main moved), then wait for pages.
Held back: testrange, sweepfixB (tutorial red) - need a look.

## Train in flight (old)
train/20261114-0900 (fast-forward of main): ghostslot, sweepfixB, orderfeel, testrange, sweepfixA (pileflag merged then reverted). Own gate: smooth-pc/mp/grandsmooth/decisions/smoke4/check green; tutorial, audio, cfclient red (known flaky; audio+cfclient passed on previous train cd42446).

## Battle helpers (branch | last push UTC | ahead of main | HANDOFF)
| branch | last push | ahead | handoff | note |
|---|---|---|---|---|
| freezefix | 11-13 03:04 | 12 | yes | not in train, older |
| sweepfixA | 11-14 00:39 | 3 | yes | in train |
| sweepfixB | 11-14 03:38 | 7 | yes | in train (earlier state) |
| orderfeel | 11-14 04:37 | 5 | yes | in train (earlier state) |
| ghostslot | 11-14 03:28 | 3 | yes | in train |
| testrange | 11-14 03:06 | 7 | yes | in train |
| battleclean2 | 11-14 04:00 | 8 | yes | waiting |
| pileflag | 11-14 03:17 | 6 | yes | reverted from train (see its gate) |
| unstuck | 11-14 01:59 | 2 | NO | waiting |
| dugout | 11-14 03:54 | 12 | yes | waiting |
| battlepower | 11-14 03:03 | 5 | yes | waiting |
| bldqueue | 11-14 03:14 | 7 | yes | waiting |
| techbldgs | 11-14 03:42 | 11 | yes | waiting |
| groundreal | 11-14 05:04 | 4 | yes | waiting |
| leaderlook | 11-14 05:29 | 11 | yes | waiting |
| usvoice | 11-14 04:25 | 3 | yes | waiting |
| ammozone | 11-14 03:55 | 7 | yes | waiting |
| looktest | 11-14 02:35 | 2 | yes | needs Abdullah's look pick |
| onegame | 11-13 22:41 | 16 | yes | after the Battle branches |
| nations20 | 11-14 03:33 | 5 | yes | last |

Parked (removed from the game): camphud, nofightit, warpeace, mapshapes, eu4audit, civhumans.

## taken/ locks with no orch/ branch
Not checked branch-by-branch this run (1075 refs; fetch too slow). Candidate list above all have branches.
