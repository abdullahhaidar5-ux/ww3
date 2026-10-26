# World War 3 — rules for every agent working in this repo

Browser RTS in the style of C&C Generals Zero Hour. Live at https://abdullahhaidar5-ux.github.io/ww3/ (GitHub Pages
serves `main`). The owner, Abdullah, shares it with friends on Discord, so **whatever lands on `main` is what his
friends play next**. All development is directed by **ORCH**, the orchestrator — read `orch/ORCH.md` before doing
anything.

## Where things live

| Path | What it is | Edit? |
|---|---|---|
| `src/NN-*.js` | **The game.** 12 modules, the single source of truth (see map below) | Yes — only here |
| `index.html` | Build output: shell + vendored PeerJS/Three.js/GLTF + `MODEL_PACK` + `src/` concatenated | Never by hand |
| `orch/build.py` | Rebuilds `index.html` from `src/` (`--check` verifies they match) | |
| `orch/smoke.mjs` | Headless Chromium test gate: boots the game, runs an AI battle, screenshots | |
| `orch/BACKLOG.md` | Everything open, by squad, prioritized | ORCH maintains |
| `orch/HISTORY.md` | Every past agent run and what it shipped | Append only |
| `orch/LOG.md` | ORCH's cycle log | ORCH appends |
| `orch/board.py` → `orch/board.html` | Command Board (claude.ai/artifact/UENjCQzdzHCzYmqQQEuJLx), built from the three files above | Generated |
| `vo/`, `mus/` | Voice lines per nation (`vo/<CODE>.mp3`), music | Audio squad |
| `sw.js`, `manifest.webmanifest`, icons | Offline/PWA install | Rarely |
| `relay-worker.js`, `tools/` | Cloudflare relay for strict networks; Windows host tune-up scripts | Netcode squad |

`src/` module map: `01-data` factions, units, upgrades, powers, balance · `02-map` maps, terrain, pathfinding ·
`03-sim` authoritative simulation + AI · `04-gfx` 3D engine, terrain/buildings · `05-fx3d` particles, tracers,
explosions · `06-view` camera, HUD, fog, minimap · `07-net` multiplayer (host-authoritative, P2P) · `07b-ckpt`
host-migration checkpoints · `08-ui` sidebar, input, menus, main loop · `09-audio` weapons, voices, music ·
`10-post` post-processing · `11-models` 3D model loading/animation.

**Every change:** edit `src/` → `python3 orch/build.py` (syntax-checks, refuses to write on error) →
`node orch/smoke.mjs` must print `SMOKE PASS` → commit `src/` **and** `index.html` together.
Never write `</script` inside `src/` (escape as `<\/script`). Don't touch the vendored libraries or the
`MODEL_PACK` line in `index.html`.

## Abdullah's standing decisions (do not reverse without him asking)

- **Vision:** massive columns of infantry and vehicles in intense combat, with aircraft and drones overhead.
  Graphics pushed toward Company of Heroes / Broken Arrow realism **in real gameplay**, not just staged shots.
  Most tactical/realistic gameplay possible: flanking, cover, suppression.
- **No decorative or ambient aircraft or drones.** They were removed because they confused players. Only real,
  controllable aircraft fly.
- **Controls:** left-click is the primary scheme (left-click select; with units selected, left-click ground = move,
  left-click enemy = attack). Right-click move/attack and right-drag line formation stay as optional shortcuts
  (Abdullah, 2026-10-26) — every action must still be doable with left-click/touch alone.
- **Factions (18 live):** US, TR, IL, EU, UA, RU, IR, SA, AE, PK, IN, CN, KP, KR, EG, CU, **RS "Mountain Shias"**,
  **DW "Coffee Shias"**. The IM faction was removed on purpose; 18 is the intended count (no 19th planned). Shia factions = IR, RS, DW.
- Keep the Mountain Shias' upgrade name **"Radwan Training"** exactly as is.
- **Audio:** real, professional military audio; top-quality unit voice acting in each nation's native language,
  including war slogans like "Labbaik ya Hussein". **Shia factions (IR, RS, DW) use latmiyas as their music**;
  every other nation gets its own country-specific war score.
- Multiplayer: up to 8 players, host's browser runs the battle. Never break multiplayer sync — host and clients
  must agree.
- Must stay smooth and **phone-playable**.
- **Two live copies:** GitHub Pages (`main`) and the claude.ai artifact (Qt3bimPhr31eZEUpqndGUi). Keep both in sync
  on every ship (see BACKLOG request for the artifact build).
- Abdullah reads updates on his phone: short summaries, and send screenshots/clips as links or images that open on
  a phone (attached video files didn't open for him).

## Ground rules for agents

- Work only in your squad's files unless ORCH assigned otherwise; parallel agents share one repo.
- Small, verifiable changes. Describe each change in plain words a player would understand.
- No new runtime dependencies from other hosts beyond what's already used (Three.js r128 bundled, PeerJS bundled).
- Never force-push `main`, never delete branches or files you didn't create, never rewrite history.
