# Map editor (2026-11-03/04, branch orch/map-editor)

Abdullah's ask: a map editor so his group can make and share their own maps.

## What shipped
- **Main menu → "🗺 Map editor"** (new `src/12-editor.js`, full-screen). Tools: Move, Raise (mountains), Lower (ponds/lakes),
  Flatten, River, Bridge, Road, Forest, Rocks, Town (civilian buildings, 10 looks), Oil, Supply, Start, Erase. Brush size slider.
  Players 2-8, size Small/Medium/Large/Huge, look Desert/Snow/Green. Undo/redo (Ctrl+Z / Ctrl+Y too).
- **Mirror**: off / left-right / top-bottom / 180° / 4-way repeats every stroke and every start; "Copy to other side",
  "Flip ↔", "Flip ↕", "Turn 180°" act on a finished map.
- **Mouse and touch**: pointer events; one finger paints, two fingers pan and zoom, mouse wheel zooms, Move tool pans.
- **Terrain preview** shows the real generated ground (same code the game uses).
- **Fair-play check** (runs on Save, on Play, and with the "Check this map" button) on the real built map: start on a
  mountain, no ground path between any two starts (water/rock without a bridge), starts unevenly spaced by road distance,
  no supply/oil within reach of a start, uneven supply or oil counts between starts, only ONE route between neighbours
  (block the shortest route's corridor and see if another remains), start positions not mirror images, uneven open ground.
  Errors/warnings are listed; saving is never blocked.
- **Play this map** → skirmish vs AI (every start filled) straight from the editor.
- **Save / load** on this device (localStorage `ww3_maps`), shown as **"My maps"** in the Battlefield list of Skirmish and
  the online lobby. **Share** = Copy code, Copy link (`…/ww3/#map=CODE`, opening it adds the map and selects it),
  Download file (.ww3map), Import (paste or file). A typical map is 0.8-3 KB of text.
- **Online**: the host sends the map code with the battle (P2P `start` message, host-migration checkpoint, rejoin) and with
  the Cloudflare lobby (`bset` → `blob` → `start`). The map's key `cm_<hash>` is a hash of its canonical content: a
  client or the server re-derives the key from the code and refuses a mismatch (hash-check on join). The server only
  accepts a custom map whose code matches the key the owner announced; code is capped at 40 KB and every field is clamped
  and counted (`cmCanon`), so a hostile code cannot blow up the simulation.

## Engine changes (02-map.js, 01-data.js) — existing maps unchanged
Custom map = plain data → one `MAPS` entry (`registerCustomMap`). New optional map fields `fieldAt` (fixed supply), `manual`
(skip the procedural neutral supply/oil when the author placed their own), `cscale` (world size), `M.roads` (drawn roads),
`addComplexity` keeps woods the map already set (`M.woods=M.woods||[]`, identical for built-ins). Everything else (bases,
own supply per base, cities, bridges, fog, AI) uses the existing code. Seeded RNG only; the same code builds the same grid
on every machine (test "map builds identically twice").

## Limits / notes
- Rocks = small mountains; Raise = impassable mountain ridges (the engine has no walkable hills). Roads are drawn on the
  ground and give no speed bonus (same as built-in roads).
- The check does not run AI-vs-AI win rates (that needs minutes per map); it checks geometry and resources only. Use
  `orch/mapfair.mjs` ideas later for a "Test fairness with AI" button.
- Server half (Cloudflare Workers `ww3`) needs the `main → servers-live` merge before custom maps work in **Cloudflare**
  battles; until then the host's browser fallback / P2P path handles them.

## Tests
`node orch/editortest.mjs` (new): opens the editor, paints with the mouse (mirror, river, bridges, mountains, forest, rocks,
town, oil, supply, road), undo/redo, erase, fair-play check (and a deliberately broken map), save, reload, share-code round trip,
tampered-code rejection, determinism, **Play this map**. Screenshots: `orch/shots/editor/`. `orch/servertest.mjs` gained a
custom-map check.
