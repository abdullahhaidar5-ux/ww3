# HANDOFF menucamp (branch orch/menucamp)

Abdullah 2026-11-13 06:15 / 06:17: pause the campaign, move it to Extras.

## Done
- Single player: Conquest, Battle, then Missions, Tutorial, Battle tutorial, Load game. No Grand campaign.
- Multiplayer: game choice is Conquest / Battle only; campaign rows hidden from the open-games list (CSS in 14-menu.js); a campaign invite link or code still joins (joinByCode and gnLobby untouched; `mxOnline('campaign')` still works and does not stick for the next visit).
- Extras: "Grand campaign (preview, paused)" with the note "In development - Conquest and Battle come first."; opens the existing campaign start screen via `grandBtn` (lazy bundle unchanged).
- Continue and the menu background: newest Conquest/Battle save first; campaign save only if it is the only save, labelled "Grand campaign (preview)" (`svMenuSync` in 08d-save.js, `mxWarSrc` in 14-menu.js).
- Leftovers: tooltips, first-run quick button (08-ui), new What's new entry. Playtest card list is generated from HISTORY, left alone.
- Docs: CLAUDE.md MENU STRUCTURE + Grand strategy layer, orch/DECISIONS.md (both quotes), HISTORY line. orch/decisions.mjs guard updated.
- src/13* not changed.

## Not done
- No line in Settings (would clutter; Extras is enough).
- Tests that click the hidden `#grandBtn` directly (grandtest, gnettest, grandlive...) still work, so not edited.

## Checks
build.py + --check OK, smoke PASS, decisions PASS (local). cigate: see below.

## Pictures
orch/concepts/menucamp/1-main-menu.jpg, 2-single-player, 3-multiplayer, 4-extras, 5-campaign-from-extras (all viewed).
Note 1 shows the neutral map (no saves in the proof browser).
