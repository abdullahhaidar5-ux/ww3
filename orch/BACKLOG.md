# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

- [open] **Keep the claude.ai artifact in sync with GitHub Pages** (Abdullah, 2026-10-26). Artifact:
  https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi (7 MB page + 20 published files). It is NOT a copy of
  `index.html`: it loads Three.js from cdnjs and its multiplayer runs over the artifact `room` capability (topics
  cmd/evt/hello/lobby/snap/start/team) instead of PeerJS. Needed: `orch/build.py --artifact` that emits the artifact
  variant from `src/` (room transport in place of PeerJS, `vo/`+`mus/` as published files, no SW/manifest), verify
  with smoke, then ORCH republishes it with the Artifact tool at every ship (step 8). Netcode squad + QA.

## Questions for Abdullah

- _(none open)_ — 2026-10-26 answers: keep right-click as an optional shortcut; stay at 18 factions; the old
  development chat is gone (its `assets/`, ROUNDS.md and test scripts are lost — harnesses get rebuilt in `orch/`,
  3D models can't be re-packed from source); keep the claude.ai artifact in sync with Pages.

## P1 — now

**Foundation (ORCH itself)**
- [open] Extend `orch/mpsync.mjs`: 3+ human players, packet loss/latency, host migration (`07b-ckpt`), real WebRTC.
- [open] Smoke runs share `orch/out/`: two runs back to back overwrite each other's screenshots — per-run subfolder.
- [open] Map sweep: smoke every map in `MAPS` at 2, 4 and 8 players; fix any that fail.
- [open] AI-vs-AI tournament harness (all 18 factions, headless, sim-only) → win-rate table for balance.

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).
- [check] AI uses flanking and cover (DIFF has `flank`/`retreat` params) — verify in battles, strengthen on Hard.

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Measure rotor-wash FPS cost on a real phone with many helicopters.
- [open] AI almost never builds boats, so naval wakes (and navy) are rarely seen — make AI use navy on water maps.
- [open] Ricochet sparks when small arms hit armour.
- [open] Time-of-day/lighting variety per match (golden hour, overcast, dusk) — recordings had it, the game doesn't.

**Audio & voice** (`09-audio`, `vo/`, `mus/`)
- [open] Full native-language unit responses per nation (select / move / attack / under fire / unit lost), recorded
  quality, not browser text-to-speech. `vo/` holds one clip per nation today.
- [open] Real recorded war scores for the 15 non-Shia nations (today all music is synthesized live per nation from
  `09-audio.js` STYLES + instrument samples in `mus/smp.mp3`). Meanwhile: give US, EU, RU, KP a signature instrument
  (only snare today); IR and RS share santur+dammam backing — differentiate; tracks named "Battle Theme I/II".
- [open] Menu music: test iOS audio unlock on a real iPhone; soft fade-in on first note; it loads the 3.3 MB `mus/smp.mp3` on first tap.

## P2 — next

**Visuals**
- [check] Muzzle-flash and impact-spark polish.
- [check] Battlefield debris near roads: shell casings, burnt patches (some debris exists).
- [check] Bridge guard rails and lamp posts look too modern.
- [check] Tree canopies a little faceted up close.
- [check] Shoreline foam variation on water.
- [check] Sandbags/props around buildings (sandbag model exists — check placement).
- [check] Infantry helmet/kit variety beyond v68 tone variation.

**UI/UX & controls** (`08-ui`, `06-view`)
- [open] Phone-playability pass: touch select/move/attack, sidebar layout at phone width, mobile GPU performance.
- [check] Settings menu completeness (graphics, volumes, speed, HUD).

**Multiplayer** (`07-net`, `07b-ckpt`, `relay-worker.js`)
- [open] Intermittent MPSYNC fail (1 of 3 runs, 2026-10-26): at the final settle check the client still showed 4 host
  infantry (team 0) that had left its vision — stale units not removed on the client when they leave sight. Find and fix.
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [ask] Cloudflare relay: needs Abdullah's Cloudflare account to deploy `relay-worker.js` and set `RELAY_CF_URL`.

**Maps** (`02-map`)
- [open] Map-select screen previews (thumbnail per map).

## P3 — later

- Campaign or scenario missions; tutorial; replays; spectator mode for MP.
- Clip/showcase pipeline rebuilt in `orch/` so ORCH can post short phone-friendly clips of new features.

## Done

Moved here by ORCH with date and version. Full pre-ORCH record: `orch/HISTORY.md`.

- 2026-10-26 (cycle 2) — A match always has a winner: if the last sides collapse on the same tick, the strongest is
  spared (fixes Rivers 4-player all-surrender draw). `checkEnd` in `03-sim`, host-only, reviewed: no desync risk.
- 2026-10-26 (cycle 2) — Naval wakes: white foam V, stern stripe and bow wave behind moving boats/ships (`05-fx3d`).
- 2026-10-26 (cycle 2) — Menu music: calm version of the picked nation's score (latmiya for IR/RS/DW) on menu,
  lobby and victory/defeat; crossfades into battle music.
- 2026-10-26 (cycle 2) — Gate memory: `smoke.mjs`/`mpsync.mjs` take a machine-wide lock (`orch/browserlock.mjs`),
  print peak memory; `--no-lock` escape hatch.

- 2026-10-26 — Multiplayer sync test `orch/mpsync.mjs` (host + client pages, loopback PeerJS stand-in, 4 game-min,
  compares units/credits) added to the ship gate.
- 2026-10-26 — Helicopter rotor wash: rolling dust ring on land, powder snow on snow maps, white spray on water.
- 2026-10-26 — [check] Stuck/idle units after long games: six 16–20 min 4-player AI battles on 6 maps, ~0 stuck; no
  change needed.
- 2026-10-26 — [check] Per-nation music: all 18 nations already have distinct synthesized scores; IR/RS/DW latmiyas.
