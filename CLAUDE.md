# World War 3 — rules for every agent working in this repo

Browser RTS in the style of C&C Generals Zero Hour. Live at https://abdullahhaidar5-ux.github.io/ww3/ (GitHub Pages
serves `main`). The owner, Abdullah, shares it with friends on Discord, so **whatever lands on `main` is what his
friends play next**. All development is directed by **ORCH**, the orchestrator — read `orch/ORCH.md` before doing
anything.

## Where things live

| Path | What it is | Edit? |
|---|---|---|
| `src/NN-*.js` | **The game.** 12 modules, the single source of truth (see map below) | Yes — only here |
| `index.html` | Build output: shell + vendored PeerJS/Three.js/GLTF + `MODEL_FILES` list + `src/` concatenated | Never by hand |
| `models/` | The 3D models, one gzipped `.glb` per model (`<key>.<hash>.glb.gz`), fetched by the game at startup | Via `build.py --add-model` |
| `orch/build.py` | Rebuilds `index.html` (and the model lists in it and `sw.js`) from `src/` + `models/` (`--check` verifies they match) | |
| `orch/smoke.mjs` | Headless Chromium test gate: boots the game, runs an AI battle, screenshots | |
| `orch/BACKLOG.md` | Everything open, by squad, prioritized | ORCH maintains |
| `orch/HISTORY.md` | Every past agent run and what it shipped | Append only |
| `orch/LOG.md` | ORCH's cycle log | ORCH appends |
| `orch/ROADMAP.md` | Progress of all big workstreams, status-tagged; drives the board's Progress section | ORCH + anyone shipping |
| `orch/board.py` → `orch/board.html` | Command Board (claude.ai/artifact/UENjCQzdzHCzYmqQQEuJLx), built from the three files above | Generated |
| `vo/`, `mus/` | Voice lines per nation (`vo/<CODE>.mp3`); music: the shared soundtrack `mus/st/` (tracks + `manifest.json`, made by `mus/st_pack.py`) and anthem excerpts `mus/an_<CODE>.mp3` (`mus/an_pack.py`) | Audio squad |
| `sw.js`, `manifest.webmanifest`, icons | Offline/PWA install | Rarely |
| `relay-worker.js`, `tools/` | Cloudflare relay for strict networks; Windows host tune-up scripts | Netcode squad |

`src/` module map: `01-data` factions, units, upgrades, powers, balance · `02-map` maps, terrain, pathfinding ·
`03-sim` authoritative simulation + AI · `04-gfx` 3D engine, terrain/buildings · `05-fx3d` particles, tracers,
explosions · `06-view` camera, HUD, fog, minimap · `07-net` multiplayer (host-authoritative, P2P) · `07b-ckpt`
host-migration checkpoints · `08-ui` sidebar, input, menus, main loop · `09-audio` weapons, voices, music ·
`10-post` post-processing · `11-models` 3D model loading/animation.

**Every change:** edit `src/` → `python3 orch/build.py` (syntax-checks, refuses to write on error) →
`node orch/smoke.mjs` must print `SMOKE PASS` → commit `src/` **and** `index.html` (and `sw.js` + `models/` if they
changed) together. Never write `</script` inside `src/` (escape as `<\/script`). Don't touch the vendored libraries
or the `MODEL_FILES` line in `index.html` (`build.py` writes it). Add or replace a model with
`python3 orch/build.py --add-model KEY file.glb`, never by renaming files in `models/` (the name carries its hash).

## Abdullah's standing decisions (do not reverse without him asking)

- **Vision:** massive columns of infantry and vehicles in intense combat, with aircraft and drones overhead.
  Graphics pushed toward Company of Heroes / Broken Arrow realism **in real gameplay**, not just staged shots.
  Most tactical/realistic gameplay possible: flanking, cover, suppression.
- **No decorative or ambient aircraft or drones.** They were removed because they confused players. Only real,
  controllable aircraft fly.
- **Controls = C&C Generals mechanics** (Abdullah, 2026-10-26 17:34, and re-confirmed 18:55 in the side-lane chat
  when asked about a 17:55 "freeze the live mouse controls" note from another chat: **Generals wins; the freeze is
  void**). Default mouse scheme is Generals' default: left-click selects and gives orders (ground = move, enemy =
  attack, own unit = select), Shift+click adds, double-click selects that type on screen, Ctrl+click force-fire,
  A+click attack-move, G+click guard, Alt+click waypoints, right-click deselects/cancels, right-drag draws the
  infantry line formation when units are selected and rapid-scrolls when nothing is selected, left-click ground with
  a production building selected sets its rally point. Today's scheme (right-click move/attack, right-drag line)
  lives on as Settings > "Alternate mouse setup". Every action must also work with touch alone; phone controls are
  being redesigned to be more intuitive (Abdullah, 18:49).
- **Factions (18 live):** US, TR, IL, EU, UA, RU, IR, SA, AE, PK, IN, CN, KP, KR, EG, CU, **RS "Mountain Shias"**,
  **DW "Coffee Shias"**. The IM faction was removed on purpose; 18 is the intended count (no 19th planned). Shia factions = IR, RS, DW.
- Keep the Mountain Shias' upgrade name **"Radwan Training"** exactly as is.
- **Audio:** real, professional military audio; top-quality unit voice acting in each nation's native language,
  including war slogans like "Labbaik ya Hussein". **Music = one shared soundtrack of real recorded tracks for all 18
  nations** (Abdullah, 2026-10-27, replacing the per-nation/region scores and the synthesized latmiyas): ~10–12 free
  tracks (CC0/CC-BY credited, or public-domain military band) — menu, calm, combat, victory/defeat — switching calm ↔
  combat with the fighting; Abdullah picks the tracks from a shortlist. Nation identity = its anthem at battle start
  and on victory. Shia factions (IR, RS, DW) use the shared soundtrack too; real recorded latmiyas may be added later
  if freely licensed ones are found.
- Multiplayer: up to 8 players, host's browser runs the battle. Never break multiplayer sync — host and clients
  must agree.
- Must stay smooth and **phone-playable**. Phones may get a lighter look to stay smooth; PCs get the full look
  (Abdullah, 2026-10-26).
- **Three live copies:** GitHub Pages (`main`), Cloudflare Workers `ww3` at https://ww3.abdullah-haidar5.workers.dev
  (Abdullah connected it 2026-10-26; Cloudflare builds the repo root from `main` automatically on every push — nothing
  to do at ship except check it serves the new version), and the claude.ai artifact (Qt3bimPhr31eZEUpqndGUi, republish
  per `orch/ARTIFACT.md`). Everything in the repo is served publicly by both Pages and the `ww3` Worker.
- **Art is free only** (Abdullah, 2026-10-26): CC0 or CC-BY models/textures/sounds, every author credited in the menu
  credits; no paid assets, no ripped game assets.
- Abdullah reads updates on his phone: short summaries, and send screenshots/clips as links or images that open on
  a phone (attached video files didn't open for him).

## Ground rules for agents

- Work only in your squad's files unless ORCH assigned otherwise; parallel agents share one repo.
- Small, verifiable changes. Describe each change in plain words a player would understand.
- No new runtime dependencies from other hosts beyond what's already used (Three.js r128 bundled, PeerJS bundled).
- Never force-push `main`, never delete branches or files you didn't create, never rewrite history.
