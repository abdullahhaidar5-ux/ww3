# HANDOFF rangemirror — ready

Branch `orch/rangemirror` (lock `taken/rangemirror`). Abdullah 2026-11-14 13:51 "Make test range mirror battle".

- `newGame({sandbox:true})` now sets `battle` too: G.battle true, no towns, Battle capturable buildings, power, weather, supply/ammo, tech tree, build speed, build-spot rules, dozer-only building all as Battle. Start = Command Center + dozer + supply truck, no free buildings.
- Kept test tools: unlimited money, full-rank general / powers without cooldown, full-map vision, spawn/new targets/clear/"Enemy fights back"/Change nations, passive target base.
- Test range maps = Battle maps only (`trBmap` in 08-ui, `mxTrFill` in 14-menu); an old saved Conquest map falls back to the first 2-player Battle map.
- Guard in `orch/decisions.mjs` (2d + Test range start check): G.battle true, Battle map, same starting buildings and build list as Battle; old "sandbox is always supplied" guard replaced.
- Also: origin/main's index.html held leftover git conflict markers; the rebuild clears them (src was clean).
- Checked locally: build + `--check` pass; a quick script confirmed sandbox == Battle start (hq only, 0 towns, 4 capturable buildings), screenshot `orch/shots/rangemirror.jpg`. Full `node orch/decisions.mjs` is too slow in this sandbox (timed out) — NOT run to completion; no cigate (push-fast day).
- Try (2 min, PC): Test range → build with the dozer, tech up, capture a quarry/mine.
