# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

- [open] **Graphics overhaul — Phase 1 approved** (Abdullah, 2026-10-26 21:24). Plan:
  https://claude.ai/artifact/QDp8ykMpW6fwW7YRn4jqUZ. **Start only after the phone-speed fix (`orch/speed-ship`) and the
  bottom command bar have landed on `main`** (both touch graphics/UI files). Phase 1 = move `MODEL_PACK` art out of
  `index.html` into compressed per-unit/per-nation files served next to the page (Cloudflare `ww3` + Pages), loaded per
  battle; build-time compression; upgrade Three.js r128 → current on a branch with side-by-side screenshots of every
  map and nation. Decisions: **units first** (Phase 2 next: detailed models, national variants), **phones stay smooth**
  (lighter phone look OK, PCs get everything), **free art only**. Audio overhaul runs alongside (next item).
- [open] **Audio and music overhaul** (Abdullah, 2026-10-26 21:09–21:15; same plan doc). Free only (CC0/CC-BY or public
  domain, credited). Real recorded weapons/battle/ambience; full native-language voice lines (volunteers, TTS fallback);
  proper mix. **Every nation gets region-specific music**: the region's scales, rhythms and instruments on free recorded
  samples, plus its public-domain US Navy Band anthem recording as a military-band layer (check each composition's
  status). Middle Eastern six (IR, RS, DW, SA, AE, EG) in progress in the side lane (21:14); the other 12 next.
  **Latmiyas:** keep the synthesized ones until real replacements are ready, then swap; replacements may be military
  band music; Abdullah can't record — search free archives (Commons, Internet Archive, Freesound, folk archives) for
  freely licensed real latmiyas; optionally draft a permission request he can send to a reciter. Likely mix: real
  latmiya for menu/calm, military band for battle. Religious and traditional pieces only — no armed-group anthems.
- [open] **IN PROGRESS (side lane, restarted 19:36 — Abdullah: "do this now"; ORCH: don't take it; deploy via Cloudflare Workers Builds + merge-to-approve, no tokens) — Servers to assist multiplayer** (Abdullah, 2026-10-26 19:06: "make virtual servers assist with
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

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] **Faction balance** (`node orch/tourney.mjs --full`, 153 games, cycle 5, BEFORE the blowout fix): win% KP 88,
  SA 76, UA 76, DW 65, RS 65, EG 59, EU 53, CU/IN/PK 47, IR/TR/US 41, AE/KR 35, CN/IL 29, RU 24. Re-run on the
  current build first (the 3-min power lull changes everything), then tune outliers. Slot 1 won 84/153 — check
  start-position fairness.
- [open] Fulda: a few supply trucks still go ~60 s without delivering late in a game.
- [open] AI host migration: `mkAI` resets `T.ai.wave` without the `G.bs` scaling, so a rebuilt AI's "thin army"
  threshold differs slightly (review, cycle 5).
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).
- [open] AI navy arrives late (~6 game-min on Normal; buildings come first) and never uses landing craft.
- [check] AI uses flanking and cover (DIFF has `flank`/`retreat` params) — verify in battles, strengthen on Hard.

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Measure FPS on a real phone (needs a real device, not emulation): busy 4-player late game, many helicopters
  (rotor wash), and the new phone layout.
- [open] Multiplayer clients don't get the host's battle Conditions: `start` in `07-net.js` has no `w`, so each
  player sees their own menu choice. Send `w:setup.w` and apply it before `newGame` (Random is seeded → matches).

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
- [open] **IN PROGRESS (side lane, resumed 19:46 — Abdullah: "Test range on mobile is way too slow, fix now"; from branch
  `orch/wip-loading-screen`; ORCH: don't take) — phone speed first: Generals-style loading screen with progress, faster battle start (Test Range is
  slow), and documented military quotes matched to each of the 18 factions.**
- [open] **PAUSED by Abdullah 2026-10-26 19:35 (not started; ORCH: don't take until he says) — intuitive phone controls.** Abdullah: "make the mobile
  controls more intuitive". One-finger drag scrolls (Maps-app style), long-press+drag box-selects, tap selects/orders
  with order markers, long-press+drag with units = infantry line, touch command bar (attack-move, guard, stop, line,
  same type, all army, deselect), collapsible panel, better landscape, first-time guide. Starts after the Generals
  mouse work lands; ORCH: don't take it.
- [open] **PAUSED by Abdullah 2026-10-26 19:35 (work saved on branch `orch/wip-generals-mouse`, unbuilt/untested; ORCH: don't take until he says) — Generals mouse controls + per-function Mouse settings.** Re-confirmed by Abdullah 2026-10-26 18:55 over
  the 17:55 "freeze" note (see CLAUDE.md). Being built and shipped by the side lane; ORCH: don't take this item and
  don't edit `08-ui`/`06-view` input code until it lands.
- [open] Map picker labels Fulda Gap, Golan and Korean DMZ as "open land" although they have rivers.

**Multiplayer** (`07-net`, `07b-ckpt`, `relay-worker.js`)
- [open] Small fog leak: `dieWho` (07-net) still sends `die` to players who saw a unit within 1.6 s, so a unit
  that leaves sight and dies in the fog shows its explosion. Tighten to the last snapshot sent, or to players who
  still hold it in `NET.sc[k]` (review, cycle 5).
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [open] Artifact edition untested on the real claude.ai room: latency, ~40 msg/s cap, drops, host migration.
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

- 2026-10-26 (side lane) — **Middle Eastern music:** IR, RS, DW latmiyas and SA, AE, EG scores in real maqam/dastgah
  with quarter-tones, regional rhythms (ardah, ayala, Saidi, Yemeni 3+3+2, Bushehri), recorded CC0 percussion (VCSL),
  taqsim openings, lead-and-response latmiyas. `mus/me.mp3` (569 KB) loads only for those six. Oud is a reshaped
  guitar sample (no free oud recording reachable); santur/ney/kamancheh/qanbus are GM stand-ins — replace with real
  free recordings when found.
- 2026-10-27 (cycle 5) — **No more 2-minute blowouts:** general powers can't fire in the first 3 minutes (button
  shows "Ready in …"); AI rebuilds a lost bulldozer first, trains troops before saving for Strike Center/airfield,
  doesn't wall off its trucks. 24-game test: wins under 3 min 4 → 0, sides with no army 5 → 0.
- 2026-10-27 (cycle 5) — **Multiplayer: enemies leaving your sight vanish at once** (ids only, no positions) —
  fixes the intermittent stale-infantry MPSYNC fail (6/6 + 2/2 artifact passes).
- 2026-10-27 (cycle 5) — **Dusk and Random battle conditions**; each condition now tints sky, water, smoke and the
  final image; fixed haze keeping the first battle's colour.
- 2026-10-27 (cycle 5) — `orch/tourney.mjs`: AI-vs-AI round robin for balance (default ~6 min, `--full` ~35 min).
- 2026-10-27 (cycle 5) — Artifact republished (v157) with `ck`/`pong` room topics opened.

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
