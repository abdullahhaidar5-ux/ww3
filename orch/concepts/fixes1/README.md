# fixes1 — four small fixes (branch `orch/fixes1`, 2026-11-11/12, waiting for the conductor)

| # | What was reported | What it really was | What changed |
|---|---|---|---|
| 1 | Tutorial test red on main since the speed work | Not the speed work: the test has failed about 4 runs in 10 since 6 Nov (105 of 243 logged runs), always "step 9 did not complete" or "step 3 never started". Both are things a player can hit. Step 9: after a revolt the soldiers thrown out of a house stand at its door; a right-click on the ringed house landed on one of them and became a plain move. Step 3: a step the squad finishes on its own was ticked off the instant it appeared. | Game fix (`src/08-ui.js` `houseThru`, `src/08b-social.js`): with infantry selected, a right-click on a friendly soldier in front of a house sends the squad into the house; every tip stays at least 1.5 s. The test is unchanged. |
| 2 | Empty BEATS / WEAK TO rows in the hover card | Could not be reproduced. In a real battle (real mouse hover; Conquest and Battle; 75 build and unit buttons; with and without the campaign bundle; also at the commit that added the card) every row lists pictures and names. `orch/shots/lang-battle/btn-after.jpg` was taken before the card was finished and never retaken (left alone here: `orch/shots` is not to be committed). | No game change. Guard added. |
| 3 | White streaks in Arabia (suspected snow paint) | Not snow. The real land data (~6 MB) arrives a few seconds after the map is first drawn, so the **first map of every session** was built on the hand-shaped stand-in terrain and stayed on it for the whole campaign (Hejaz as a chalk-white wall, no Alps). | The campaign menu starts the download and the map waits for it behind a "Loading the world map" card (at most 10 s). Snow line added as asked (height that falls with latitude). Relief constants untouched. |
| 4 | Oversized palms | A palm picture holds 1–3 single palms, a forest picture a clump of 6–7 small trees, and both were drawn at the same size. | Palm picture drawn at 55% (1.05 × 1.2, was 1.9 × 2.1). Same one instanced draw, same count. |

Pictures (1600×900): `2-hover-card-reported.jpg` (the old picture) / `2-hover-card-now.jpg` · `3-arabia-before.jpg` / `3-arabia-after.jpg` ·
`4-palms-before.jpg` / `4-palms-after.jpg`. "Before" for 3 and 4 is what a player saw on the first map of a session.

Guards, all in `orch/decisions.mjs`: house click through a soldier at the door; hover card rows; map waits for the real land;
no snow weight in Arabia, snow on the Alps / Himalaya / Greenland; palms at most 0.7 of a forest picture and one instanced draw.

Left open (not done here):
- The claude.ai one-file edition cannot fetch `grand/elev.png` / `color.jpg`, so it always shows the stand-in terrain.
- On a line too slow to load 6 MB in 10 s the map still opens on the stand-in and keeps it until the campaign is re-entered.
- Automated tests still open the map on the stand-in terrain (they skip the wait unless `window.__grandWait` is set), so
  screenshots made by test scripts do not show what players see unless they set it or call `g3LoadReal()` first.
- The map is Equal Earth (`orch/grandproj.mjs`), not equirectangular: use `proj(lon, lat)` for map views.
