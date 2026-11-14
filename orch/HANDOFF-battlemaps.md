# HANDOFF battlemaps (branch orch/battlemaps)

## Done
1. Map kit: `src/02d-battlemaps.js` (`BMAPS`, format in the file header; goes through the editor's `cmCanon`/`cmBuild`, one map system; deterministic).
2. Checker: `node orch/battlemapfair.mjs` (`--static`, `--battles`, `--report`); report `orch/reports/battlemaps.md`.
3. Battle map list (setup + online lobby), previews drawn from the map data; Conquest list untouched. Guards in `orch/decisions.mjs`.
4. Six maps written. **Five listed and passing**: Split Ridge, Ferry Quarter (2p), Breakwater, Four Mills (4p), Six Roads (6p; 180 games 54/54/53/53/45/42).
   **Tar Basin is held back (`hold:1`)**: structure passes but start 1 won 60% of 120 games (63% of an earlier 40; 61% pooled), over the 40-60 rule. It is not in any list. Next step: find why (geometry is exactly mirrored; try moving the center derricks/rock outcrops), re-run `--battles --games 120 --maps tarbasin`, remove `hold:1` when it passes.

## Gate
Local: build --check OK, static PASS, BATTLEMAPLIST PASS, decisions PASS, smoke PASS. cigate on ec0cbb4 (+revert): 27 of 28 statuses in, all green except audio (sprite sheet decode) and cfclient (creator gets no fresh state), both on the known-flaky list; not re-run (no re-run tool here). smooth-pc, smooth-mp, grandsmooth, decisions green.

## Pictures (orch/concepts/battlemaps/)
overview-{tarbasin,splitridge,ferryquarter,breakwater,fourmills,sixroads}.jpg (top-down; red starts, green supply, black derricks), ingame-{tarbasin(desert),splitridge(snow),ferryquarter(green),breakwater}.jpg, list-battle-setup.jpg, list-battle-picker.jpg (5 maps).

## Adding the next six maps (cheaper helper)
1. Add an entry to `BMAPS` in `src/02d-battlemaps.js`, author ONE part of the map (`sym:'r'|'x'|'y'|'q'` mirrors it); copy the nearest existing map as a template. Original names and layouts only. Put `hold:1` on it first.
2. `python3 orch/build.py`; `node orch/battlemapfair.mjs --static --maps <id>` (seconds; must print PASS).
3. `node orch/battlemapfair.mjs --battles --games 120 --maps <id>` (2p about 7 s/game; 6p about 25 s/game, run it in the background), then `--report`. All starts must win 40-60%.
4. When it passes remove `hold:1`; `node orch/battlemapshots.mjs` (list picture) and `node orch/battlemapfair.mjs --static --dump orch/out/bm-static.json && python3 orch/battlemapshots.py orch/out/bm-static.json orch/concepts/battlemaps` (overview). Then smoke, decisions, one `orch/cigate.sh`.

## Not done (new ORCH rules, orch/BATTLEMAPS-NOTE.md, arrived after this run started)
Roads as supply lines per map, capturable tech buildings slots, no named towns, 120-game rule (already met for the 5 listed). The 5 listed maps still have town-to-town roads/named towns; next helper adapts them and then deletes the note.
