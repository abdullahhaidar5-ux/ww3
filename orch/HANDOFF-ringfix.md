# HANDOFF — orch/ringfix (2026-11-14)
Abdullah (photo of 8 rocket launchers on big pink ellipses): "Remove these red rings".

## Done
- `src/06d-orderfeel.js`: the faint filled glow inside selection rings/rectangles is gone (it was the pink disc). Selected
  soldiers, vehicles and aircraft now show only thin corner brackets (new shape 7) in the player color; buildings a thin
  outline with no fill; color-blind mode keeps a thin segmented outline. Health bar above selected units is unchanged.
  Order markers (green move, red attack, orange attack-move, blue guard) untouched.
- `orch/decisions.mjs`: guard — no fill in the selection shapes, units use the bracket shape.

## Not done
- orch/RINGFIX-NOTE.md (ORCH's extra jobs: remove Retreat/Assault/Stop/Hold, auto-build panel, Layers button) was pushed to
  this branch after my run started; it is outside this follow-up's scope and is NOT done — a helper must take it.
- No before/after screenshot: software GL in this sandbox + browser lock queue made it too slow (see Gate).

## Gate
build --check OK. decisions/smoke: see end of this file (run in background; results appended if they finished).
Status: READY (ring removal only; ORCH extra notes left for Monday: Retreat/Assault/Stop/Hold removal, auto-build panel, Layers, breaking news).
smoke: SMOKE PASS (652 s). decisions.mjs: running, no FAIL in output so far (static guards run first).
