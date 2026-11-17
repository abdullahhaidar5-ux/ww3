# HANDOFF shiamissions (resumed 2026-11-17 after the Saturday "drop missions" pause)

Branch `orch/shiamissions`, one file of game code changed: `src/12-campaign.js` (+ rebuilt `index.html`). The conductor lands it; nothing was pushed to main.

## The six missions (Missions list, each Easy / Medium / Hard)
1. **Hold the Pass** (Lebanese Shia, ~12-18 min) - ridge defence on the Beqaa/Chouf hills map. Dug-in guns, a capturable ridge depot, wave warnings on screen, a radio line in Lebanese Arabic.
2. **Supply Run** (Zaidi Shia Movement) - convoy of 6 trucks over the Yemeni highlands (Tihama map); ambush warnings, optional cistern depot at the halfway ridge.
3. **Mountain Fortress** (Iran) - Zagros; the Ayatollah starts with the garrison, valley depot, wave and bunker-buster warnings.
4. **Retake the Village** (Lebanese Shia + Zaidi ally, ~14-20 min) - the old "town" is now a fortified hill village of garrisonable houses (Golan hills map) with an enemy-held fuel depot at the far gate. New: after the village is taken you must also beat the three counter-attacks (objective "hold the village"); before this change the scripted player won in 2 minutes. Enemy garrisons are about 30% bigger.
5. **Combined Arms** (Iran) - Caspian coast, forward depot, objective banners.
6. **Bridgehead on the Euphrates** (Iraqi Shia Brigades, ~16-22 min) - replaces the short "Hold the Causeway" defence: take the east end of the bridge, capture the ammunition dump, hold the bridgehead against counter-attacks while the column crosses (marshes and river map).

Shared: the objective is the one goal line under the top bar (the old objectives box is gone, as on main), a short toast under it for "objective complete" / wave warnings, radio lines in the nation's language with English beside them. A "depot" is a capturable derrick row (the sim's one capture system). No Conquest or campaign code is used.

## Tests
- `node orch/camptest.mjs` (all six): each mission loads, runs 2 game-minutes with a scripted player, objectives completed by script -> **victory** debrief and saved best time; then a restart where everything the player owns is destroyed -> **defeat** debrief. PASS for all six (village re-checked after the tuning).
- Screenshots: `orch/shots/shiamissions-<id>-briefing.jpg` and `-mission.jpg` (made by `orch/shiamissionshots.mjs`).

## Gate / status
See the bottom of this file for the build, smoke, decisions and `orch/cigate.sh` result.

## Not proven (honest)
- Nobody has played these by hand. The scripted player proves they can be won and lost and do not crash, not that they are fun or well balanced; ask Abdullah to play "Retake the Village" and "Bridgehead on the Euphrates" for 2 minutes on Medium.
- Maps (beqaa, tihama, golan, caspian, euphrates) were chosen for the real geography; pathing was only checked by the scripted run.
- Dugouts were not added to the missions (dugout orders belong to the player); capturable tech buildings are not placed by the missions, the depots use the derrick system.

## Gate result (orch/cigate.sh, run twice: before and after one fix)
Second run on 840d76b: 25 of 27 gates green, including `campaign`-related smoke, build, smooth-pc, smooth-mp, mpsync, tutorial. Two red, **both already red on main (eb5d5b8: "RED: decisions, icons, save")** and not touched by this branch:
- `decisions`: 3 failures, none about missions: the unit-button hover card (WEAK TO), and the two neutral-road-section capture checks. My own two decisions failures (British spelling "defences", mission map `beqaa` lives in 02b-realmaps) were fixed in this branch.
- `save`: "replay differs after +2 min" in the Battle save/replay test.
Local `node orch/smoke.mjs` and `decisions.mjs` time out in this sandbox (per CLAUDE.md), so GitHub is the proof.

**Ready to land** as far as the missions go; the conductor should know main's decisions/save/icons are red independently.
