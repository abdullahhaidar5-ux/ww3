# polishfeel: how Battle and the Test range feel (2026-11-14)

Play-through script: `node orch/polishshots.mjs --tag before|after [--only]` (menu → Battle setup → match → Test range, 1600x900).
Screenshots: `orch/shots/polishfeel-before-*.jpg`, `polishfeel-after-*.jpg`. The main branch still has the old menu
(Conquest/Grand on top level); `orch/onegame`, `orderfeel`, `testrange`, `bldqueue` own those areas, so I left them alone.

## The 10 roughest spots

| # | Spot | State |
|---|------|-------|
| 1 | Controls hint under the battle: a 600-character monospace line cut off by "…" ("Right-click your bu…"), tiny, running under the Command strip | FIXED: one short line in the HUD font (`polishfeel-after-07`) |
| 2 | Test range had no way to spawn a unit (only "new targets", "enemy fights back", "clear") | FIXED: Spawn any unit for either side (1/5/10/20, click the map, Shift keeps placing, right-click/Esc stops) |
| 3 | Test range could not pause or change speed without the pause menu | FIXED: Time row Pause / ½× / 1× / 2× / 4× (no overlay, so you can place units while frozen) |
| 4 | Test range had no overview camera, repair or reset | FIXED: Overview, Heal all, Reset range |
| 5 | Command-bar prices were 9–10 px and building group headings 10 px | FIXED: prices 11.5 px, headings 11 px on PC (names stay 12 px: larger names clip "Underground Missile City") |
| 6 | Battle opens with the camera tight on the HQ, building cut off at the screen edge | NOT FIXED (camera start belongs with orderfeel/battle camera work) |
| 7 | Setup screens mix monospace body text with sans headings and native browser dropdowns | NOT FIXED (menu styling is under onegame's rewrite) |
| 8 | Menu tagline and descriptive text tiny and monospace | NOT FIXED (same) |
| 9 | Test range header "TEST RANGE" fold button is 14 px tall | NOT FIXED (old panel shell in index.html, `testrange` helper owns it) |
| 10 | Esc in battle opened nothing visible in headless run while the doctrine popup was up (popup text 11 px) | NOT FIXED, needs live play check |

Text-size/clip/tiny-button audit of every menu screen found nothing under 11 px and no clipped text; the HUD audit found the 9–10 px prices (fixed) and the 14 px fold button.
