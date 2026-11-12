# Handoff — orch/armytokens2 (army tokens on the grand map), helper finish-tokens, 2026-11-12 06:50 UTC

State: finished, pushed, READY TO LAND; NOT landed (conductor batches). Based on main 1407bde (train 7) + this branch.
Gated commit: adfc9d8 (`gate/adfc9d88cf`) — **28 of 28 green** (decisions, grand, grandsmooth, smooth-pc/mp, mpsync, tutorial, audio, migrate-dual, check all PASS).
(The run before, 6f1873c, was 27 of 28: only `check` red, because an old `grand.<hash>.js` file was still in the commit; adfc9d8 removes it, nothing else.)
Last night's red `migrate-dual`, `tutorial`, `audio` were flaky: all three passed on both runs today with the same token code.

For the conductor: main has moved on (trains 8-9). A trial merge with 7b4baa2 conflicts only in the built files and HISTORY —
`index.html`, `grand.*.js`, `sw.js` → rebuild with `python3 orch/build.py`; `orch/HISTORY.md` → keep both sides. All `src/` files merge cleanly.

What changed (view only; no sim, sync hash or checkpoint change):
- `src/13e3-gtokens.js` — the tokens. Far = one Points draw of dots + small number tags; middle = tokens only; close = token + main's small on-land figures.
  `gtkNudge`/`gtkOver`: a crowded token takes the nearest free spot (max 60 px), else joins its own nation's stack (far + middle), faint ones drop out; capital plates (`G3.plR`) count as occupied.
  New today: `gtkHud` — no token is drawn on top of the minimap, unit cards or round buttons (the map runs under them; tokens beside them step aside).
- `src/13e-grand3d.js` — `g3Batch` draws figures only at tier 2 or for the selected army, flag only for the selected army; old far-figure code and shield badges removed; `g3HitAt` box targets = whole token.
- Guards: `orch/grandtest.mjs` (armytokens block: ≤1 marker per province at middle zoom, 0 figures/flags at far+middle unless selected, close view has figures, no token over the map controls), `orch/decisions.mjs`.
- Pictures: `orch/concepts/tokens/` (before = main 1407bde, after = this branch, + README).

Open end: a nudged token's pin moves with it (up to 60 px off the exact spot at middle zoom).
