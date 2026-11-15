# HANDOFF looktest (2026-11-14) — three looks for ONE battle, switch with `?look=a|b|c`

Branch `orch/looktest` (never landed on main; nothing lands until Abdullah picks). View only, Conquest/Battle; `src/13*` untouched.

## What to look at (phone-friendly)
`orch/concepts/looktest/looks-abc.jpg` (strip, A | B | C; the smoke clouds differ slightly between panels because A was shot a moment earlier) then `a.jpg b.jpg c.jpg` (normal play zoom, same frame: Iran vs Israel, tanks, infantry,
smoke, fires) and `a-wide.jpg b-wide.jpg c-wide.jpg` (wide view). To try live: add `?look=b` or `?look=c` to the game link (default = A).

## What each look changes (all in `src/10-post.js`, table `LOOKP`; one post chain, same passes, one shader)
Scene part (`wx`, replaces the battle-conditions row in `applyWeather` via `lookW`; skipped when time-of-day is on):
- **A Today**: nothing (table row has `wx:null`, final-pass multipliers all identity).
- **B Cinematic**: sun `#ffc48e` x3.0 at ~17 deg (offset -1250,430,-560 → long shadows), sky ambient `#8fa3c8` x0.9 over dark ground `#54443a`
  (deeper shadows), haze `#cfa47a` from 1000 to 4800 (today 1800–6200), exposure 1.04, tint 1.04/1.0/.92, saturation 1.0.
  Final pass: vignette x1.6, +0.012 grain, sharpen x1.2, contrast x1.10, bloom x1.7 (fire/explosions glow), distance haze x2.2 (needs the
  AO pass, like today's haze), shadows tinted blue (.94,.97,1.05), highlights warm (1.05,1.01,.92).
- **C Drone feed**: sun `#f4f7ff` x3.0 high (offset -650,1000,-450), sky `#a2b8d6` x1.15, ground `#575b60`, haze `#a9b3bd` 1700–6400, exposure .95,
  tint .95/1.0/1.06, saturation .62. Final pass: vignette x1.35, +0.038 grain, sharpen x2.4, contrast x1.22, bloom x.8, haze x.5,
  edge scanlines .22 (only beyond ~0.5 of the frame radius, so the middle stays clean), shadows/highlights slightly cool.
Cost: the final shader got 4 uniforms and ~6 multiplies/one contrast + tint + edge-line line; no extra pass, no extra texture. A is the same picture as before.
(Switching at run time: `LOOKK='b';applyWeather(0)` — used by `orch/looktestshots.mjs`/`looktestrepl.mjs` to render the same frame in all three.)

## Files
`src/10-post.js` (LOOKP table, lookW, lookPost, 4 uniforms + shader multiplies), `src/04-gfx.js` (one call: `lookW` in `applyWeather`),
`orch/looktestshots.mjs` (one-shot picture script), `orch/looktestrepl.mjs` (keeps a page open; software GL needs ~4 min per picture),
`orch/looktestjpg.py` (PNG → JPG under the size limits + strip), `orch/concepts/looktest/*.jpg`. The raw PNGs are not committed.

## After Abdullah picks (e.g. B)
1. Default: in `src/10-post.js` change `let LOOKK='a'` to `let LOOKK='b'` (one line; `?look=` still overrides).
   Better for the final cleanup: copy the chosen row's numbers into the base code and delete the table:
   - the scene numbers go into the `WX[0]`... row(s) in `src/04-gfx.js` (or a new weather row) and drop `lookW` + the `lookW` call in `applyWeather`;
   - the final-pass numbers become the constants in the shader (`lkA/lkB/lkS/lkH` defaults in `POST.mFinal` uniforms); then delete `LOOKP`, `LOOKK`, `lookPost` and its call in `renderPost`.
2. Leftovers (CLAUDE.md "a decision is done only when its leftovers are gone"): remove the unchosen rows, `?look=` handling, the three test scripts above,
   and the strip/pictures if no longer wanted; add a guard in `orch/decisions.mjs` that `LOOKP` no longer exists (or that the default is the pick).
   Note the older `LOOK` object in `src/11c-look.js` (faction models, `?nolook=1`) is a different system; the new names are `LOOKP`/`LOOKK` to avoid the clash.
3. Then `python3 orch/build.py`, smoke, `orch/cigate.sh` (smooth gates: expect no change, same passes).
4. Time-of-day battles keep their own light (`lookW` returns the row unchanged when `G.todM` is on); if the pick should also grade those, move its `wx` values into the TOD rows.

## Abdullah picked **B Cinematic** (Sat 2026-11-14 09:06 Chicago). ORCH made B the default (src/10-post.js LOOKK). ?look=a|c still works for comparison. Ready to land.
