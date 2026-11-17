# HANDOFF redfixE (2026-11-17)

Job: red gates on main (save, migrate-down, loadfreeze, decisions). Branch `orch/redfixE`.

## gate/save - a loaded game played on differently (FIXED)
Found with `orch/_savediag.mjs` (runs A 5 min, saves, loads into a fresh page C, compares a per-tick hash; `FULL=1` hashes the whole
checkpoint with sorted keys, then snapshots both runs at the first differing tick and traces Math.random callers of that tick).
Causes, in the order they showed up:
1. **Sounds/effects took the battle's random numbers** (the real cause of the "money differs"): `FXE` -> `fxPlay` -> `sfxShot`/`sfxClip`
   drew `Math.random` inside the simulation step, so whether the sound files had finished loading changed the battle (A also differed
   run to run on CI). `FXE` (03-sim) now swaps in its own `FX_RND` while effects play.
2. **Building footprint map (`bocc`) went stale** when a building left without `kill()` (no `bdirty`), so routes differed after a load.
   `bocc()` now compares a cheap signature of standing buildings once per step (`boccSig`, `G.boccU/boccS`; boccS in the checkpoint).
3. Checkpoint additions (07b-ckpt): supply network as last worked out (`lgc`: sig, reach, trade, cover, beads, cvT/cvs/csig, lgv - it is
   refreshed once a second), `G.ruins` decoded (were `{$c}` stubs), `_fmQ` (per-second faction tick), CK_UKEEP fields of units inside
   buildings/tunnels, units' route fields (`ffc`: fresh ones rebuilt on load, stale ones stored), loaded units share the nation's stat table.
Local: SAVETEST PASS (5 + 2 min). Old saves load (all new fields optional). Guards in orch/decisions.mjs ("redfixE").

## gate/loadfreeze
"16 / 13 shader programs linked in one go at unit ..." - the battlefield compile loop (05-fx3d) also gives a frame back after every 8 new
programs (it only checked 30 ms of work). Passed on ab83d2d already (flaky by nature).

## gate/decisions
- Road capture: lebanon has ONE 6.8 km road section with the own dozer and enemy infantry on it (captured during the "air" phase /
  contested = nothing / cut). The test parks those units (inTun) for the check and works the network out if it is not yet (lgCompute). Game rule unchanged.
- AT-team hover card "WEAK TO only": the panel can re-lay out between reading the button rect and the hover; the mouse sat on the unarmed
  medic. Test now hovers until the card belongs to the target button (data via matchUp is correct for IR vs every nation).

## gate/migrate-down
Not reproduced: passed on eb5d5b8 and ab83d2d; e01646a failed on "client B never appeared in the host lobby" (p2p fallback flake with
servers down). No change.

## Battle servers / headless (FOUND ON THE WAY)
`SIM_FILES` in orch/headless.mjs (the list server/build-sim.mjs builds the Cloudflare battle sim from) missed 01d-signatures, 01e-ob,
01f-irbm and 03k-factionmech: online battles on the servers ran without faction mechanics / signature units / OB / the Zolfaghar.
Added; `headless --compare` (node vs browser) is identical again (it was hidden behind the night failure). Guard in decisions.mjs.

## Also
- headless `--night`: test expected the old x0.6 / x0.9 night sight; the game rule since 2026-11-14 is x0.75 / x0.95 ("a little less
  sight, not a lot", todVis). Test updated (the gate shows SKIP because of `|| echo SKIP`).
- gate/audio "second battle: battle music again" and gate/superfreeze failed on ab83d2d only (voices commit / runner) - not looked at.

## Gate results
- f4410f4 (all game changes): every gate green except decisions (test fixes came next).
- 0783445 (+ test fixes only): every gate green including save, decisions, loadfreeze, migrate-down, headless, audio - except
  superfreeze: the new Test-range part (rangefreeze, landed today) had one 617-879 ms frame on IR in "wave dsam" with almost all of it
  outside the game's measured work (renderFrame 127 ms); the same game code passed superfreeze on f4410f4, and RS failed it once on
  f9b4ec6. Looks like a runner stall/flaky new check - next owner of rangefreeze: watch it on main.
- Landed on main; servers-live moved (simulation + checkpoint + server file list changed).
