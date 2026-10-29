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
- **Controls (Abdullah, 2026-10-28 19:11 — replaces the 2026-10-26 Generals left-click scheme):** **left-click selects**
  (drag = box select, Shift adds, double-click selects that type on screen); **right-click moves and attacks** (ground =
  move, enemy = attack), right-drag draws the infantry line formation; **F + click = attack-move** (A no longer does
  it); **W A S D only scroll the camera — no other job in any scheme** (Abdullah, 19:17; Stop = X); G+click guard, Ctrl+click force-fire, Alt+click waypoints; left-click ground with a production building selected
  sets its rally point. The old Generals left-click-orders scheme may stay as a Settings option. On PCs **the mouse stays
  inside the game window** during a battle (pointer lock with the game's own cursor; edge scrolling works; Esc or the
  menu releases it; a Settings toggle turns it off). **Command bar text is bigger and easier to read** (PC and phone).
  **Getting in and out needs no button** (Abdullah, 19:14): enter = select units, right-click your own building /
  vehicle / transport / tunnel ("enter" cursor shown); leave a building = select it, right-click the ground (everyone
  comes out and runs there); leave a vehicle = select it and right-click the vehicle itself (unload here), or
  Alt+right-click a spot (drive there, then unload); touch: tap a selected vehicle again to unload, tap ground with a
  garrisoned building selected. The Unload/Leave buttons may stay as extras.
  Every action must also work with touch alone (phone touch controls unchanged).
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
- Multiplayer: up to 8 players. Never break multiplayer sync — host and clients must agree. **Battles are hosted on
  Cloudflare** (Abdullah, 2026-10-27 19:28: Cloudflare is the default and **no hosting button or wording at all** —
  19:30: "just host": the Multiplayer menu has one "Play online" button that joins an open battle or starts a new one on
  Cloudflare with the player's map/nation; friends join from the list or by invite code/link); hosting in a player's browser remains only as the automatic fallback (free-plan limit, busy, unreachable, or
  the server going away mid-match). Cloudflare battles run the copy of `src/` built into the
  server at its last deploy, so **whenever a ship changes the simulation (03-sim, 01-data, 02-map, 07*) open a
  `main → servers-live` PR for Abdullah to merge** (one tap; deploy runs from GitHub).
- Must stay smooth and **phone-playable**. Phones may get a lighter look to stay smooth; PCs get the full look
  (Abdullah, 2026-10-26).
- **Three live copies:** GitHub Pages (`main`), Cloudflare Workers `ww3` at https://ww3.abdullah-haidar5.workers.dev
  (Abdullah connected it 2026-10-26; since 2026-10-28 `.github/workflows/deploy-site.yml` also sends it from `main` on every
  push, status `deploy/site`, because Cloudflare's own builder got stuck — nothing to do at ship except check it serves the new version), and the claude.ai artifact (Qt3bimPhr31eZEUpqndGUi, republish
  per `orch/ARTIFACT.md`). Everything in the repo is served publicly by both Pages and the `ww3` Worker.
- **Targets (Abdullah, 2026-10-28 18:33):** a big battle shows **~300 units on screen** (all sides) and stays smooth;
  phones may draw far-away units simpler. **Unit voices:** every nation gets native-language lines now with the best
  free computer voice available — no real human recordings (Abdullah, 18:36: "forget the real recordings"). **Voices must sound natural,
  not robotic** (Abdullah, 19:12): use an expressive neural voice (XTTS-v2 for every language it covers — en, ar, tr,
  ru, zh, ko, hi/ur, es, fr, de; non-commercial licence accepted for this free game, as MMS already is) with radio
  treatment; Piper/MMS only where nothing more natural exists (fa, he, uk) and then the best-sounding option found. **Weapon/explosion sound: cinematic and
  punchy**, like a war film. **AI Hard = smarter tactics only, no extra money**; **all 18 nations about equally strong.**
- **Priorities (Abdullah, 2026-10-28 18:34):** his group plays the **Shia factions (IR, RS, DW) most** — do their voices,
  uniforms and buildings first, in a **realistic military** style (IRGC/Hezbollah-style fatigues, Middle Eastern
  compounds and bunkers). The group plays on **recent iPhones (12 or newer)** — that is the phone target. Biggest pain:
  **looks and performance** — better looks only where it stays smooth. Next focus after current work: **graphics
  realism**. Abdullah will test on his iPhone: when something visible ships, ask him in the report to try one specific
  thing for 2 minutes (with the link).
- **Art is free only** (Abdullah, 2026-10-26): CC0 or CC-BY models/textures/sounds, every author credited in the menu
  credits; no paid assets, no ripped game assets.
- Abdullah reads updates on his phone: short summaries, and send screenshots/clips as links or images that open on
  a phone (attached video files didn't open for him).

## Ground rules for agents

- Work only in your squad's files unless ORCH assigned otherwise; parallel agents share one repo.
- Small, verifiable changes. Describe each change in plain words a player would understand.
- No new runtime dependencies from other hosts beyond what's already used (Three.js r186 bundled via `orch/three/vendor.mjs`, PeerJS bundled).
- Never force-push `main`, never delete branches or files you didn't create, never rewrite history.

## Saving usage (Abdullah, 2026-10-28: move fast without burning through his usage limit)

Every token an agent reads counts against Abdullah's plan. Work like this:
- **Never read `index.html`** (2 MB, generated) or anything in `models/`, `mus/`, `vo/`, `sfx/`, `orch/out/`. Check the
  build with `python3 orch/build.py --check`, not by reading the output.
- **Never read a whole `src/` module.** They are 60–280 KB each (`04-gfx.js` alone is ~70k tokens). Find the spot with
  `grep -n` and read only that range (Read with offset/limit, ~100–200 lines).
- **Keep command output short:** pipe tests and builds through `| tail -20` (or grep for PASS/FAIL); never print whole
  gate logs, only the failing excerpt. Use `git log --oneline -10`, `git diff --stat` before full diffs.
- **Read only the top of `orch/BACKLOG.md`/`LOG.md`/`HISTORY.md`** (head -60) unless the task needs more.
- **Test smart:** quick local checks while working; run `orch/cigate.sh` (all 16 tests) once when done and once after a
  fix, not after every small step. Wait on it with one blocking command, not repeated polling.
- **Pick the cheaper model for simple work** (Abdullah, 2026-10-28 18:32: "mix models"): when dispatching helper agents,
  use `model: "sonnet"` for finding/packing free assets, credits, copy/text, layout tweaks and small fixes; keep Opus
  for netcode, the simulation/AI, performance and reviews. ORCH runs every 8 h while the side-lane agents work.
- **Write handoff notes** (`orch/HANDOFF-<branch>.md`) when stopping early, so a restart doesn't re-explore.
