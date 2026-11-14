# HANDOFF battleclean2 (Sat 2026-11-14)

Branch `orch/battleclean2` (lock `taken/battleclean2`). Not landed on main; the conductor lands it after the gate.

## Done
- **No towns in Battle (any map, incl. Conquest battlefields picked from Battle).** `NO_TOWNS` in `src/02-map.js` (`mkMap`) drops the cities, hamlets and
  town-to-town roads for a Battle build only (`newGame` sets it around `mkMap`; the Battle map picture does too). So there are no town names/labels, capture,
  tax, opinion/revolts, minimap/top-bar town parts or town AI planning (`G.towns` is empty). Per Abdullah's 19:57 correction the neutral **buildings stay**
  (same spots, garrisonable, cover, destructible); civilians and civilian cars are off in Battle (`src/06b-realism.js`). Conquest builds are unchanged.
  Two Battle map texts that said "towns" now say mills / lakeside (`src/02d-battlemaps.js`). Guard: `orch/decisions.mjs` ("battle no towns").
- **Less dust and smoke (all modes, view only).** One table `FX_DUST` / `FX_SMOKE` in `src/05-fx3d.js` (amount, size, hang time, thickness); `part()` applies it
  to every non-fire, non-debris particle: dust = tan colors (vehicle trails, impacts, rotor wash, collapse), smoke = the rest (wrecks, burning buildings,
  explosion columns, muzzle, exhaust). Dust ~40% of the particles, 72% size, 50% life, 60% thickness; smoke 60/80/65/75%. Smoke screens keep count and
  duration (only size and thickness follow the table). Fireballs and sparks are untouched, so explosions stay short and punchy.
- CLAUDE.md line, orch/DECISIONS.md quote, orch/HISTORY.md lines.

## Not done / notes
- Dense clusters of houses on maps that used to have big towns still read as a built-up area (they are neutral buildings now, as asked). If Abdullah wants
  them thinner on Battle maps, that is a map-kit edit (battlemaps2 owns it).
- The ground paving/roads of towns are gone with the town layer (houses sit on plain ground).
- No ambient ground fog was found to cut; the pale cloud over a base was the sum of vehicle dust, construction dust and building smoke, now lighter.

## Gate
Local: build --check OK, smoke PASS, decisions PASS (battle no towns: 0 towns/hamlets/tax, 94 garrisonable houses, 12 maps clean; Conquest map still 54 cities).
GitHub (`gate/59fc2faa7c`, commit 59fc2faa7c): the runners were queued behind other helpers for ~40 min; cigate timed out at 13 of 28 results, ALL 13 PASS (art-mpsync, art-smoke,
audio, cfclient, controls, decals, grandlive, headless, icons, migrate, migrate-dual, mpsync, smoke4). The rest (incl. smooth-pc / smooth-mp / grandsmooth, tutorial,
mapsweep) had not reported yet: the conductor should read the remaining `gate/*` statuses on that commit before landing. The dust change only lowers particle counts, so smooth is expected equal or better.

## Pictures (orch/concepts/battleclean2/, before vs after, Battle as Lebanese Shia on Euphrates Crossing)
town-before / town-after, vehicles-before / vehicles-after, firefight-before / firefight-after.

## Try for 2 minutes
Battle as Lebanese Shia on "Euphrates Crossing" (Conquest battlefields too ->): look at the old town area (no names, no tax, no civilians), then drive a column of
tanks across the desert and fight at your base: dust trails should be thin and short, explosions still punchy. If still too heavy/light, change one number in `FX_DUST` / `FX_SMOKE` in `src/05-fx3d.js`.
