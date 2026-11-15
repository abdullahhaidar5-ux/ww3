# HANDOFF sweepfixA (branch orch/sweepfixA, lock taken/sweepfixA)

## Done
- Batch 1: nation cards in the picker no longer have a native `title` (the right-hand detail panel already shows doctrine, morale, strike). No other menu card had a duplicating tooltip; small icon-button tooltips left alone.
- Batch 2: every battlefield card now opens with a calm placeholder (theme color, map name, player count) that fades into the thumbnail when it is ready. Thumbnails stay cached for the session, and any not yet drawn are queued in grid order (visible cards first).
- Guards in `orch/decisions.mjs`: nation cards have no title attribute; every map card has placeholder + canvas right after opening.
- One line in `orch/HISTORY.md`, inside the code commit.

## Not done
- Batches 3-6 of the slice sweep (other helpers/ORCH).
- Local `decisions.mjs` was killed for time in this sandbox; the GitHub gate ran it (PASS).

## Gate
`orch/cigate.sh`: CIGATE PASS, 28 of 28 (mapsweep skipped as no map changes). Local: `build.py --check` OK, `smoke.mjs` SMOKE PASS.

## Pictures
`orch/concepts/sweepfixA/nation-hover.jpg` (hovered nation, no OS tooltip), `map-open.jpg` (battlefield picker right after opening, all tiles have placeholders; one already faded to its thumbnail).

Ready for the conductor to land. Try for 2 minutes on PC: Single player > Conquest, open the battlefield list, then hover nations.
