# HANDOFF redfixA (2026-11-15)

Job: make gate/decisions, gate/controls, gate/controlscheck, gate/save green again (failures from main 90ec5bf).

## Game fixes (src/)
- 08-ui.js `orderClick`: a right-click with an armed power / Strike now fires it (`placeOrAim`) instead of cancelling it
  (CLAUDE.md: powers are RIGHT-click). The old guard `rclaunch` only looked at `rightPress`, which is actually the LEFT-down path.
  New guard line in orch/decisions.mjs (rclaunch) checks `orderClick`.
- 08-ui.js: in the "Classic left-click" mouse scheme (Settings > Mouse, `leftOrders()`), left-click gives F/G targets and fires
  powers (there right-click cancels); the hint text says "F then click" there. Standard scheme unchanged.
- 08o-zhbar.js: the order dock inside the Zero Hour bar divides its positions by the text-size zoom (`currentCSSZoom`), so at
  130 % it is no longer pushed below the window (gate/save "battle HUD at 130%").
- 06z-keys.js: row `abuild` = U (auto-build list). **Sanctions has no key**: it is not offered in Battle (01-data POWERS note,
  not in POW_KEY), so a key would be a dead key (UI-audit guard). It still fires with one click of its button if ever granted.
- 08i-hud.js: alert button keeps its svg icon when the count changes. 01f-irbm / 12-campaign: American spellings. 03k: stale
  "Realistic" comment removed (one-game guard).

## Tests updated to the current rules (CLAUDE.md Controls / HANDOFF-orch1)
- controls.mjs: hint regex "F then right-click"; F then left-click cancels; G then right-click guards; no Type button
  (removed 19:18); right-click cancels placement with a Construction Vehicle selected; command-bar check clicks the ★ button
  (no tabs in the ZH bar); building queue cancelled by right-clicking its icon (Cancel button is for Construction Vehicles);
  U = auto-build list.
- controlscheck.mjs: rally flag lets the building go (19:06).
- polishtest.mjs: spare key F9 (F8 = photo mode now); graphics check picks Ultra on fast PCs (Ultra preset exists).
- zhfeel.mjs: queue badge must equal what is still queued (a fast unit can finish within the 3 s).
- decisions.mjs: key-table parse sanity >= 18 rows (table shrank after the UI audit).

## Not mine / still red elsewhere (from 90ec5bf decisions log)
missions marsh map 'marshes' missing; hover card BEATS row for the AT team; road-section capture (air/10 s) — maps/data lanes.
