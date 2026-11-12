# Handoff — orch/armytokens2 (army tokens on the grand map), helper finish-tokens, 2026-11-12 08:20 UTC

State: finished and pushed; NOT landed (conductor batches). Two usable commits:
- **adfc9d8** (main train 7 + tokens): `gate/adfc9d88cf` **28 of 28 green**.
- **e301b90** (adfc9d8 + merge of main train 9, 7b4baa2 + two more ids in the "keep tokens off the controls" list — monthly report, map key): `gate/e301b90b64`
  **28 of 28 green** after re-running two jobs. First pass: `tutorial` ("step 3 never started") and `mpsync` (delayed-network check) were red on a slow run
  (two other jobs took over an hour to report); both passed when re-run on the same commit with no change — flaky battle tests, not this branch
  (it changes no battle or net code). LAND THIS ONE.
Merging: e301b90 already contains main 7b4baa2. If main moves again: `index.html`, `grand.*.js`, `sw.js` → rebuild with `python3 orch/build.py`; `orch/HISTORY.md` → keep both sides.

NOT DONE — new requests that reached this helper as a note on a manual re-run (not in this helper's stored job, so left for ORCH / Abdullah to confirm and queue):
1. Token SHAPES: land armies = shield, fleets = ship hull, air groups = swept wing; far dots = tiny versions; capitals stay round (note says Abdullah chose "Shield" 2026-11-11 17:37).
2. Everything on the map stays under the HUD: tokens are done (this branch); still open = the yellow dashed sea lanes over the unit cards / news panel, and the
   Political (map mode) button sitting on the selected army's unit cards (visible in orch/concepts/tokens/after-selected.jpg) — move it to the other map-mode controls.
3. One route style instead of the chunky green 3D arrows (`g3BuildArrows`, src/13e2-groads.js) plus the yellow dotted line (picture orch/concepts/bugs/map-ugly-arrows-blocky-coast.jpg).
4. Cargo ships on sea lanes too big; road web over Iran too loud, towns hard to spot.
5. Blocky sand squares along the Gulf coast.
Note: item 3 contradicts this helper's stored job ("movement arrows … still work"), which is why it was not started without confirmation.

What changed (view only; no sim, sync hash or checkpoint change):
- `src/13e3-gtokens.js` — the tokens. Far = one Points draw of dots + small number tags; middle = tokens only; close = token + main's small on-land figures.
  `gtkNudge`/`gtkOver`: a crowded token takes the nearest free spot (max 60 px), else joins its own nation's stack (far + middle), faint ones drop out; capital plates (`G3.plR`) count as occupied.
  New today: `gtkHud` — no token is drawn on top of the minimap, unit cards or round buttons (the map runs under them; tokens beside them step aside).
- `src/13e-grand3d.js` — `g3Batch` draws figures only at tier 2 or for the selected army, flag only for the selected army; old far-figure code and shield badges removed; `g3HitAt` box targets = whole token.
- Guards: `orch/grandtest.mjs` (armytokens block: ≤1 marker per province at middle zoom, 0 figures/flags at far+middle unless selected, close view has figures, no token over the map controls), `orch/decisions.mjs`.
- Pictures: `orch/concepts/tokens/` (before = main 1407bde, after = this branch, + README).

Open end: a nudged token's pin moves with it (up to 60 px off the exact spot at middle zoom).
