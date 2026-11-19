# Conductor state — 2026-11-19 06:52 UTC
main = eb208aa8 (2026-11-19, smooth-render). No `train/*` branch in flight.

All 20 train candidates in the 2026-11-13 prompt are STALE: last push 5–6 days ago, each 114 commits behind main, none merged, none with a fresh gate. Their ideas mostly landed since through other trains (controls feel, stuck units, one game, nations, looks packs). Merging them now would re-apply week-old diffs onto a changed main, so nothing was landed.

| branch | ahead | behind | HANDOFF |
|---|---|---|---|
| freezefix | 2203 | 114 | 1 |
| sweepfixA | 9 | 114 | 1 |
| sweepfixB | 13 | 114 | 1 |
| orderfeel | 11 | 114 | 1 |
| ghostslot | 26 | 114 | 1 |
| testrange | 30 | 114 | 1 |
| battleclean2 | 31 | 114 | 1 |
| pileflag | 30 | 114 | 1 |
| unstuck | 8 | 114 | 0 |
| dugout | 39 | 114 | 1 |
| battlepower | 28 | 114 | 1 |
| bldqueue | 30 | 114 | 1 |
| techbldgs | 35 | 114 | 1 |
| groundreal | 27 | 114 | 1 |
| leaderlook | 34 | 114 | 1 |
| usvoice | 26 | 114 | 1 |
| ammozone | 2046 | 114 | 1 |
| looktest | 26 | 114 | 1 |
| onegame | 40 | 114 | 1 |
| nations20 | 29 | 114 | 1 |

freezefix and ammozone show ~2000+ ahead (branched from an old base; do not merge). battlemaps2 has no branch.
Note: origin has ~19,000 branches (gate/*), so full `git fetch` times out in the sandbox; only named refs were fetched.
