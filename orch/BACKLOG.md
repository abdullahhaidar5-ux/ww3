# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

- [open] **IN PROGRESS (side lane, 2026-10-26 19:25 — Abdullah: "do this now"; ORCH: don't take it) — Servers to assist multiplayer** (Abdullah, 2026-10-26 19:06: "make virtual servers assist with
  multiplayer"). Target: Cloudflare free tier (Workers + Durable Objects), deployed by a GitHub Actions workflow that Abdullah
  approves from his phone (see the [ask] item under Multiplayer; no secrets in chat or repo). Build and test everything locally first; deployment itself is the only [ask]. Account exists (19:11).
  **Stage 1 — relay + signalling:** WebSocket relay rooms in a Durable Object (game code = room) that carry all game
  traffic for players whose networks block WebRTC, plus our own signalling to replace the public PeerJS broker, plus
  short-lived TURN credentials (existing `relay-worker.js`). Game auto-falls back: direct P2P → TURN → WebSocket relay.
  **Stage 2 — server-hosted battles:** run the authoritative simulation headless (no DOM/Three.js) inside the Durable
  Object (or Node for local tests); all players become clients. Step 1 is a feasibility report: what in `03-sim`/
  `01-data`/`02-map` touches DOM/THREE/window, and a headless sim runner (`orch/headless.mjs`) that plays an AI battle
  in plain Node and matches the browser's state hash for the same seed. Netcode + QA squads; never break current
  P2P play — servers are an extra path, P2P stays the default until Abdullah says otherwise.
  **Where battles run (Abdullah, 19:09, agreed plan):** write the headless battle server once so it runs both on
  Cloudflare and on a PC as a "dedicated server" (Node, `tools/Dedicated server.cmd`, no window); lobby lets the host
  pick "Host on my PC (browser)" / "Dedicated PC server" / "Cloudflare". Cloudflare always does matchmaking + relays.
  Benchmark the largest battle each can sustain (8 players, late game) and report it.
- _(none open — cycle 4 shipped the artifact build and republished it)_

## Questions for Abdullah

- _(none open)_ — 2026-10-26 answers: keep right-click as an optional shortcut; stay at 18 factions; the old
  development chat is gone (its `assets/`, ROUNDS.md and test scripts are lost — harnesses get rebuilt in `orch/`,
  3D models can't be re-packed from source); keep the claude.ai artifact in sync with Pages.

## P1 — now

**Foundation (ORCH itself)**
- [open] Extend `orch/mpsync.mjs`: 3+ human players, packet loss/latency, host migration (`07b-ckpt`), real WebRTC.
  Don't start from scratch — port the surviving old harnesses on the `testbed` branch: `tw8b.py` (host in Chicago +
  1–7 clients with real-world one-way delays, jitter and lag spikes; measures order latency, drift, bandwidth) and
  `p2pmig.py` (3 players over a local PeerJS server, host leaves, checks migration). `probe.py` = load-time probe.
- [open] Smoke runs share `orch/out/`: two runs back to back overwrite each other's screenshots — per-run subfolder.
- [open] AI-vs-AI tournament harness (all 18 factions, headless, sim-only) → win-rate table for balance.

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] **AI blowouts:** in 2-player AI games Ukraine fields 6–8 combat units within 10 s and wipes the other side
  in 1.4–2.9 min (Rivers, Heartland, Fulda); the losing AI never builds a combat unit and its money sits near $300.
  Also seen in a 4-player smoke (one side gone by minute 4). Find out why the losing AI stalls (economy, build order,
  a faction-specific cost?) and whether UA's start is out of line. Repro: `node orch/mapsweep.mjs --players 2`.
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).
- [open] AI navy arrives late (~6 game-min on Normal; buildings come first) and never uses landing craft.
- [check] AI uses flanking and cover (DIFF has `flank`/`retreat` params) — verify in battles, strengthen on Hard.

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Measure FPS on a real phone (needs a real device, not emulation): busy 4-player late game, many helicopters
  (rotor wash), and the new phone layout.
- [check] Time-of-day/lighting variety: the skirmish menu already has Conditions (Clear day / Golden hour /
  Overcast, `#wx` in `08-ui`). Verify each looks right in battle and that multiplayer matches use it too; consider
  dusk and a "random" option.

**Audio & voice** (`09-audio`, `vo/`, `mus/`)
- [open] Full native-language unit responses per nation (select / move / attack / under fire / unit lost), recorded
  quality, not browser text-to-speech. `vo/` holds one clip per nation today.
- [open] Real recorded war scores for the 15 non-Shia nations (today all music is synthesized live per nation from
  `09-audio.js` STYLES + instrument samples in `mus/smp.mp3`).
- [open] Listen on a phone: the new signature layers (US bugles, EU strings, RU choir/bells, KP brass, RS qanun/daf)
  were tuned headless — check they're audible but not too loud next to the main mix.
- [open] Menu music: test iOS audio unlock on a real iPhone; soft fade-in on first note; it loads the 3.3 MB `mus/smp.mp3` on first tap.

## P2 — next

**Visuals**
- [open] Ricochet sparks may also show on infantry standing right next to a vehicle — filter by actual target.
- [check] Muzzle-flash and impact-spark polish.
- [check] Battlefield debris near roads: shell casings, burnt patches (some debris exists).
- [check] Bridge guard rails and lamp posts look too modern.
- [check] Tree canopies a little faceted up close.
- [check] Shoreline foam variation on water.
- [check] Sandbags/props around buildings (sandbag model exists — check placement).
- [check] Infantry helmet/kit variety beyond v68 tone variation.

**UI/UX & controls** (`08-ui`, `06-view`)
- [open] **IN PROGRESS (side lane, 2026-10-26 18:50) — intuitive phone controls.** Abdullah: "make the mobile
  controls more intuitive". One-finger drag scrolls (Maps-app style), long-press+drag box-selects, tap selects/orders
  with order markers, long-press+drag with units = infantry line, touch command bar (attack-move, guard, stop, line,
  same type, all army, deselect), collapsible panel, better landscape, first-time guide. Starts after the Generals
  mouse work lands; ORCH: don't take it.
- [open] **IN PROGRESS (side lane) — Generals mouse controls.** Re-confirmed by Abdullah 2026-10-26 18:55 over
  the 17:55 "freeze" note (see CLAUDE.md). Being built and shipped by the side lane; ORCH: don't take this item and
  don't edit `08-ui`/`06-view` input code until it lands.
- [open] Map picker labels Fulda Gap, Golan and Korean DMZ as "open land" although they have rivers.

**Multiplayer** (`07-net`, `07b-ckpt`, `relay-worker.js`)
- [open] Intermittent MPSYNC fail (1 of 3 runs, 2026-10-26): at the final settle check the client still showed 4 host
  infantry (team 0) that had left its vision — stale units not removed on the client when they leave sight. Find and fix.
  Confirmed pre-existing (2026-10-26 evening): unchanged live build failed 1 of 2 runs the same way (4 host
  infantry stale on the client); the maps build failed 1 of 1, the phone+maps build passed. ~40-50% of runs.
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [open] Artifact: next republish pass `capabilities` once (from `orch/out/artifact/publish.json`) to open the `ck`
  and `pong` room topics; cycle 4 republished without it (stored declaration carried forward). Untested on the real
  claude.ai room: latency, ~40 msg/s cap, drops, host migration.
- [ask] Cloudflare deploy — **approved from Abdullah's phone** (Abdullah, 19:12). He has a free Cloudflare account
  (19:11). Deploy with GitHub Actions: `.github/workflows/deploy-servers.yml` runs `wrangler deploy` for the server
  code, using GitHub environment **`cloudflare`** (required reviewer: abdullahhaidar5-ux) with environment secrets
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Trigger: push to `main` touching the server folder, plus manual
  run. GitHub then notifies his phone → "Review deployments" → Approve. He sets up the environment + secrets once on
  his phone (steps given in chat 19:13); check with `gh` whether the run is waiting/failed and tell him exactly what's
  missing. Never ask for tokens or passwords in chat. Keep `tools/Deploy servers.cmd` only as a PC fallback.
- Campaign or scenario missions; tutorial; replays; spectator mode for MP.
- Clip/showcase pipeline rebuilt in `orch/` so ORCH can post short phone-friendly clips of new features.

## Done

Moved here by ORCH with date and version. Full pre-ORCH record: `orch/HISTORY.md`.

- 2026-10-26 (side lane) — **iPhone sound:** plays with the silent switch on (playback audio session + silent
  keep-alive), unlocks on a real tap, recovers after calls/Siri/app switches, low-memory sample decode with synth
  fallback, voice problems can't silence music/SFX, broken saved volumes reset. Settings > Sound check > Test sound
  shows the engine status. Needs Abdullah's real-iPhone confirmation.
- 2026-10-26 (cycle 4) — **claude.ai artifact back in sync with Pages:** `build.py --artifact` builds it from `src/`
  (`orch/ARTIFACT.md`), artifact smoke + MPSYNC in a stand-in room pass; republished (version 155).
- 2026-10-26 (cycle 4) — A multiplayer player whose connection blips gets their army back on reconnect (`07-net`).
- 2026-10-26 (cycle 4) — AI builds a shipyard and fields a navy (12/18/26% of army by difficulty) on water maps.
- 2026-10-26 (cycle 4) — Dust trails behind fast vehicles (by terrain; none on water) + ricochet sparks on armour.
- 2026-10-26 (cycle 4) — National music identity: US bugles + field snare, EU strings/horns/harp, RU male choir +
  low brass + bells, KP brass-band march, RS qanun/daf/violin (still latmiyas); nation-specific track titles.

- 2026-10-26 (side lane) — **Phones can play:** build tabs no longer hidden behind the small map (it moves to the
  battlefield corner); two-finger pan and pinch zoom; touch placement with a Cancel button; bigger buttons; touch
  hints; "All army" button; Settings "Done" always visible. 38 emulated-phone checks pass in portrait and landscape.
- 2026-10-26 (side lane) — [check] Settings: all options work; fixed "Clicking the minimap: Sends selected units".
- 2026-10-26 (side lane) — **Maps:** bases always start on dry ground (Caribbean could spawn a base in the sea;
  Bosphorus/Fulda/Caribbean bases were partly under water), Fulda's river bends around the main bases, 8-player maps
  load ~2.4x faster. New `orch/mapsweep.mjs` (all 28 maps x 2/4/8 players, ~21 min; `--maps/--players/--minutes`).
- 2026-10-26 (side lane) — [check] Map previews: all 28 render right at phone and desktop width.
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
