# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

- [open] **TOP PRIORITY — Server-hosted battles (Stage 2)** (Abdullah, 2026-10-27 07:07: "yes" to making it ORCH's
  top priority, ahead of Graphics Phase 1). Battles run on a server instead of the host's browser: no host advantage,
  phones never host big battles, host leaving doesn't disturb the match, bigger battles. Plan (agreed 2026-10-26 19:09):
  1. **Headless battle sim** — `03-sim`/`01-data`/`02-map` run with no DOM/Three.js; `orch/headless.mjs` plays an AI
     battle in plain Node and matches the browser's state hash for the same seed. **Side lane doing this now
     (2026-10-27 07:10, branch `orch/stage2-headless`); ORCH: don't duplicate step 1, take steps 2–4 after it lands.**
  2. **Dedicated PC server** (Node, `tools/Dedicated server.cmd`, no window) for the biggest battles; all players are
     clients over the existing relay/P2P paths.
  3. **"Host on Cloudflare"** lobby option in `server/` (Durable Object runs the sim): measure GB-s, requests and
     CPU per tick on the free plan first (estimate: ~225 GB-s per 30-min match → ~40–50 matches/day under the 80%
     guard; avoid per-tick alarms — they count as requests). Size the option to what the free plan sustains.
  4. **Lobby choice:** "Host in my browser" (default/fallback) / "Dedicated PC server" / "Cloudflare". Never break
     current P2P play; host and clients must agree (mpsync/migrate in the gate). Server changes go live only via a
     PR `main → servers-live` that Abdullah merges.
- [open] **Graphics overhaul — Phase 1 approved** (Abdullah, 2026-10-26 21:24; second after server-hosted battles). Plan:
  https://claude.ai/artifact/QDp8ykMpW6fwW7YRn4jqUZ. **Unblocked: the phone-speed fix and the bottom command bar landed on `main` 2026-10-27** — start it now. Phase 1 = move `MODEL_PACK` art out of
  `index.html` into compressed per-unit/per-nation files served next to the page (Cloudflare `ww3` + Pages), loaded per
  battle; build-time compression; upgrade Three.js r128 → current on a branch with side-by-side screenshots of every
  map and nation. Decisions: **units first** (Phase 2 next: detailed models, national variants), **phones stay smooth**
  (lighter phone look OK, PCs get everything), **free art only**. Audio overhaul runs alongside (next item).
- [open] **Audio and music overhaul** (Abdullah, 2026-10-26 21:09–21:15; same plan doc). Free only (CC0/CC-BY or public
  domain, credited). Real recorded weapons/battle/ambience; full native-language voice lines (volunteers, TTS fallback);
  proper mix. **Every nation gets region-specific music**: the region's scales, rhythms and instruments on free recorded
  samples, plus its public-domain US Navy Band anthem recording as a military-band layer (check each composition's
  status). Middle Eastern six done (side lane); Asian five (PK, IN, CN, KP, KR) done cycle 7; **next: US, TR, IL, EU, UA, RU, CU**.
  **Latmiyas:** keep the synthesized ones until real replacements are ready, then swap; replacements may be military
  band music; Abdullah can't record — search free archives (Commons, Internet Archive, Freesound, folk archives) for
  freely licensed real latmiyas; optionally draft a permission request he can send to a reciter. Likely mix: real
  latmiya for menu/calm, military band for battle. Religious and traditional pieces only — no armed-group anthems.
- [open] **Stage 1 SHIPPED to main 2026-10-27 (off until live; see [ask] Put the servers live). Stage 2 open. (side lane, restarted 19:36 — Abdullah: "do this now"; ORCH: don't take it; deploy via Cloudflare Workers Builds + merge-to-approve, no tokens) — Servers to assist multiplayer** (Abdullah, 2026-10-26 19:06: "make virtual servers assist with
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
- [open] Extend `orch/mpsync.mjs`: packet loss/latency, real WebRTC (3-player host migration is now covered by
  `orch/migrate.mjs`, cycle 6; its `--abrupt` mode — host vanishes without goodbye — is untested).
  Don't start from scratch — port the surviving old harnesses on the `testbed` branch: `tw8b.py` (host in Chicago +
  1–7 clients with real-world one-way delays, jitter and lag spikes; measures order latency, drift, bandwidth) and
  `p2pmig.py` (3 players over a local PeerJS server, host leaves, checks migration). `probe.py` = load-time probe.
- [open] Smoke runs share `orch/out/`: two runs back to back overwrite each other's screenshots — per-run subfolder.

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] **Faction balance round 2** (round 1 shipped cycle 6; full round robin after: SA 71, KP 71, RS 71, EG 65 high;
  CN 24, IN 29, AE 29, KR 35 low; runs swing ±12 points). Add a tourney option to play each pairing both ways (slot
  swap) and more games per pair before tuning further. Slot fairness checked: no real bias (slot 1 won 73/153).
- [open] Fulda: a few supply trucks still go ~60 s without delivering late in a game.
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).
- [open] AI navy arrives late (~6 game-min on Normal; buildings come first) and never uses landing craft.
- [check] AI uses flanking and cover (DIFF has `flank`/`retreat` params) — verify in battles, strengthen on Hard.

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Measure FPS on a real phone (needs a real device, not emulation): busy 4-player late game, many helicopters
  (rotor wash), and the new phone layout.

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
- [open] Phone portrait bottom bar: the 4th build column (Defense Gun, SAM Site…) is cut off at the right edge and
  the hint text under the tabs is clipped mid-line — make the grid fit or scroll visibly (side lane, 2026-10-27).
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
- [open] **P1:** after a client reconnects mid-battle its state is wrong (own units missing, enemy base visible, money
  off) — found by the side-lane agent 2026-10-27 while testing the bottom bar. Reproduce, fix, add to `orch/migrate.mjs`.
- [open] Host migration polish (found by `orch/migrate.mjs`): client B retries the new room 0.1 s too early and
  wastes ~5 s on the dead old room; a client already reconnecting when the host leaves ignores the disconnect and
  waits for the 5 s timeout (`clientReconnect`, 07-net).
- [open] Asian music stand-ins (no free recording found yet): janggu, haegeum, piri, taepyeongso, gayageum, guzheng, sitar, shehnai — swap in real free recordings when found (`mus/as_pack.py`). Check the new credit line shows in the menu.
- [open] After an MP battle, "Play again" reuses the host's Conditions until the player opens the menu (cycle 7 netcode note).
- [open] Israel and UAE stayed weak in every cycle-7 tourney sample (13–30%) even with price cuts — likely a unit-mix/AI cause, not cost. Cap tourney runs at ~90 min.
- [open] Add a Conditions check (host Overcast → client shows Overcast) to `orch/mpsync.mjs` permanently.
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [open] Artifact edition untested on the real claude.ai room: latency, ~40 msg/s cap, drops, host migration.
- Campaign or scenario missions; tutorial; replays; spectator mode for MP.
- Clip/showcase pipeline rebuilt in `orch/` so ORCH can post short phone-friendly clips of new features.

## Done

Moved here by ORCH with date and version. Full pre-ORCH record: `orch/HISTORY.md`.

- 2026-10-27 (side lane) — **Servers live:** Worker `ww3-servers` on Abdullah's Cloudflare (root `server`, production
  branch `servers-live`, preview builds off), PR #1 merged with Abdullah's go-ahead; `/health` ok (version 2);
  `node orch/servertest.mjs --url …` PASS against the live server (test no longer sends `CF-Connecting-IP` there).
  Game switch-over (`WW3_SERVER_URL`) on branch `orch/servers-on`, gating.
- 2026-10-27 (side lane) — **Bottom command bar + faster phone start:** Generals-style bar along the bottom
  (minimap left; Build/Units/Upgrade/Powers centre; money, strike and rank right; one ☰ menu; Pause one tap; fold
  handle on phones; ≥40 px buttons; descriptions on hover/long-press). Step-by-step loading screen with each nation's
  documented military quotes; no seconds-long freeze drawing the minimap. iPhone 13 (4× CPU) Test Range: tap → response
  ~80 s → 2.1 s, first battle frame ~81 s → 46 s. `orch/mpsync.mjs` waits for both loading screens and stops checking
  a client whose side is wiped out.
- 2026-10-27 (cycle 7) — **Asian war music:** Pakistan (qawwali march, bhangra charge), India (sitar/bansuri over tanpura+tabla, dhol-tasha), China (guzheng/erhu, suona/dizi march), North Korea (brass band), South Korea (gayageum/daegeum in 12/8, taepyeongso). `mus/as.mp3` (484 KB) loads only for those five; CC0/CC-BY/PD, credited.
- 2026-10-27 (cycle 6) — **Balance round 1:** SA/DW/KP/EG/RS reined in, IL/AE/KR/IR/CN lifted (data only); typical
  gap from 50% win rate 20 → 14 points; no start-slot bias. Migrated/lobby AIs now use the same attack-wave size as
  a fresh AI. Protocol version 5 (old cached copies are told to refresh).
- 2026-10-27 (cycle 6) — **Multiplayer:** every player sees the host's Conditions (incl. Random); units and
  remembered buildings that die in the fog no longer show their explosion.
- 2026-10-27 (cycle 6) — New gate test `orch/migrate.mjs`: 3 players, host leaves, new host takes over, AI takes
  the old host's army, remaining players stay in sync (3/3 + 1 gate run PASS).

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
