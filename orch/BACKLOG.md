# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

**NEW FEATURE PACK (Abdullah, 2026-10-29 19:26 — picked from a Rise of the Reds–inspired list; "Get more creative"; NO drone
swarm economy, NO supply lines (Abdullah 19:29); nuclear deterrence, world campaign map and commander co-op were NOT picked — don't build them).** Several
already exist in some form (checked 2026-10-29): morale/rout + officer/Ayatollah auras, weather incl. sandstorm/fog
grounding jets, EW Jamming Truck, hidden Tunnel Networks (IR/RS/DW/KP), city buildings that collapse to rubble. Build
on those, don't duplicate. Every sim item: randomness only via the seeded RNG, host-authoritative, and open a
`main → servers-live` PR after shipping. Keep all 18 nations about equally strong (run the tourney after balance-touching items). Order = priority:
- [open] **Destructible cities that change the map** — Battlefield + Visuals. Rubble from collapsed city buildings
  becomes infantry cover (like `coverAt`) and slows/blocks heavy vehicles (tanks route around; infantry/light vehicles
  pass slowly). Pathfinding grid updates when a block falls. Rubble must look like rubble (Visuals).
- [open] **Tunnels, deeper** — Battlefield. Tunnels already exist; add the counter: a "Ground-Penetrating Radar"
  upgrade (or scout ability) for non-tunnel factions that reveals enemy tunnel entrances in a radius, plus tunnel
  ambush: units can pop out of a tunnel with a short first-shot bonus.
- [open] **Proxy militias** — Battlefield + Interface. Each faction can fund an allied militia (a general power or a
  "Fund militia" building action, cost + cooldown): a squad of militia infantry/technicals spawns at a neutral map
  spot near the front and fights for you (AI-controlled or player-controlled — pick whichever is cleaner and say
  which). Flavour per faction (e.g. IR/RS/DW: allied PMF-style volunteers; US: contractors; RU: PMC). AI uses it.
- [open] **Sanctions & smuggling** — Battlefield + Interface. A power that sanctions one enemy: their income drops
  ~20% for ~60 s (shown to them with a clear banner). Counter: "Smuggling routes" upgrade/structure that cuts the
  penalty and gives a small trickle while sanctioned. Balance so it's an annoyance, not a win button.
- [open] **Day/night** — Visuals + Battlefield. Battles can start at dusk or go through night (with weather). Night:
  shorter sight for everyone, except units with thermal optics (tanks, recon, certain infantry/upgrade) who keep more;
  muzzle flashes and fires light the scene (Visuals; must stay smooth — phones on Low get a simple darker tint).
- [open] **One-tap army stances** — Interface + Battlefield. One button (and hotkey) switches selected units — or the
  whole army when nothing is selected — between **Assault** (attack-move, chase), **Hold** (stay, fire in range only)
  and **Guerrilla** (hold fire until enemies come close, hit-and-run, stay in cover). Works on touch.

**CYCLE 17 (2026-10-30 night): martyrdom banner + news ticker shipped; servers-live PR opened.** **CYCLE 16 (2026-10-29 evening): ME Strike Center/Shipyard + camo nets, phone voice fallback, gate touch check shipped; AI navy/flanking verified OK.** **CYCLE 15 (2026-10-29): side lane finished (voices-natural + enter-exit on main). PR #7 (balance → servers-live) merged 2026-10-29.**

**SIDE LANE IN FLIGHT (Abdullah 2026-10-28 18:23: "move faster, don't run over usage") — ORCH: don't take these, merge their branches when their report lands:** Phase 5 massive columns → `orch/columns` (04-gfx instancing/LOD, sim perf); recorded weapon/engine/explosion sounds + ambience + mix → `orch/audio-sfx` (09-audio, `sfx/`); native-language unit voices for all 18 nations → `orch/voices` (`vo/`, voice hooks in 09-audio). Queued (staggered to keep usage steady): AI tactics + navy + balance (flanking/cover on Hard, navy on time + landing craft, IL/AE win rates, Fulda supply trucks) → `orch/ai-tactics` from ~20:30; infantry + building models (Phase 2 rest) → `orch/gfx-infantry` from ~22:30. Keep ORCH cycles to ≤ 3 agents while these run.

**ROUND RESUMED (2026-10-28 07:00 Chicago):** the side lane finished order steps 1–3 (Cloudflare battles live, open items, music) and graphics Phases 1–4 shipped; the 4-hourly ORCH schedule is back on. `orch/followups` (QA findings, battle hint text, review R11/R12) and `orch/qa` are side-lane agents — integrate their reports, don't redo them. Keep usage steady (Abdullah 02:05): at most ~4 agents at once.

**2026-10-28 06:55 (Chicago) SHIPPED:** small fixes (8e5ad4d); Cloudflare battles (7e44492; Abdullah merged PR #4 → servers-live, deploy OK); graphics Phases 1–4 (three-upgrade + gfx-models + gfx-terrain + gfx-fx, 16/16 on 663efc6). Running: `orch/qa` (until 12:00 UTC), `orch/followups` (QA findings + review R11/R12). ww3 Cloudflare site build lagging (still old version at 06:47).

**2026-10-28 01:45 (Chicago):** all 8 cloud agents of 19:36 stopped at ~20:00 on the account's USAGE LIMIT (too many at once). Shipped touch controls (a1bdcb3, CIGATE 16/16). Restarted as TWO agents only: `orch/cf-final` (merges stage2-dedicated + play-online + passwords + battle-spikes, fixes review-cf R1–R9, staging bench) and `orch/three-upgrade` (finish). 01:45 Abdullah: "Bring all 9 and continue" → 9 cloud agents: cf-final, three-upgrade, battle-spikes, review-cf (re-review cf-final), small-fixes, gfx-models (Phase 2), gfx-terrain (Phase 3), gfx-fx (Phase 4), qa (playtester, report only). Gfx branches build on three-upgrade, which ships first. If they hit the usage limit again, restart from their branches.

**SHIPPED 2026-10-27 19:50:** reconnect + host-takeover fix + phone portrait bar (`orch/open-reconnect-phonebar`, CIGATE 16/16 incl. all three migrate tests). **ADDED 19:36:** cloud agents `orch/passwords`, `orch/play-online` (one Play online button, replaces cf-battle-client's hosting choice), `orch/review-cf` (independent review), `orch/assembler` (merges + gates finished branches → `orch/ready-<name>`, READY.md), `orch/battle-spikes`. **Test copy of the servers on real Cloudflare:** `ww3-servers-staging` — push to `staging/<name>` (see orch/SERVERS.md).

**IN FLIGHT — moved 2026-10-27 18:39 to one-off cloud scheduled tasks (each on its own machine; local agents were killed by a container restart), same branches, each writes `orch/reports/<name>.md` when done.** **IN FLIGHT (side lane, 2026-10-27 18:10 — Abdullah: "spawn more agents to finish all this work by tonight"; ORCH: don't
take these):** Cloudflare battles → branch `orch/stage2-dedicated` (BattleRoom DO + `/bench` first); reconnect bug +
phone-portrait bar → `orch/open-reconnect-phonebar`; Generals mouse → `orch/controls`; phone touch controls → `orch/touch-controls`; Cloudflare battles browser side
(lobby choice, fallback) → `orch/cf-battle-client`; shared
soundtrack from the 14 keeps → `orch/soundtrack`; Three.js upgrade (Graphics Phase 1, merged last) → `orch/three-upgrade`.

**CLOUDFLARE BENCH RESULT (2026-10-27 19:21, real free plan):** 8 players Fulda 3 min ran fully (no 10 ms cap), 63 ms
wall per game-second, but single events up to **1.6 s** — find what spikes (AI/pathfinding bursts? GC?) and spread it
across ticks before switching players to Cloudflare hosting. Server deploys now go through GitHub
(`.github/workflows/deploy-servers.yml`) on Abdullah's servers-live merge.

**DECISION (Abdullah, 2026-10-27 19:28): "Host on Cloudflare" is the only hosting choice players see — hide "Host in my
browser"; keep browser hosting purely as the automatic fallback.** **19:30 update: no hosting button or wording at all — one "Play online" button: join an open battle if there is one,
otherwise start a new battle on Cloudflare with the player's map/nation (listed for others; invite code/link still works).
Browser hosting only as the silent fallback.**
**Password-protected games (Abdullah, 2026-10-27 19:30: "make it so games can be password protected"):** when starting a
battle, an optional password; the game list shows a 🔒 on protected battles; joiners (from the list or by invite
code/link) are asked for it; the SERVER checks it (BattleRoom / relay room — never only in the page), stores only a salted
hash, never puts it in the public game list, and rate-limits wrong guesses; the invite link may carry the password so
friends join in one tap. Must also work on the browser-hosted fallback (host checks it). Build right after the Cloudflare
battle client/server branches land (same files).

**ORDER OF WORK (Abdullah, 2026-10-27 17:58): "Do the battles on servers first. Then address the open items. Then fix
the music and move onto the graphics overhaul."** ORCH follows this order across cycles; don't start a later stage while
an earlier one still has work a squad can take (other squads may only do small P1 fixes that don't compete):
1. **Server-hosted battles** (TOP PRIORITY item below) — **on Cloudflare** (Abdullah, 18:02: "I want the hosting of
   battles to be on Cloudflare"): BattleRoom Durable Object running the sim; lobby "Host on Cloudflare" with "Host in my
   browser" as default/fallback; PC dedicated server dropped. First measure CPU on the real free plan (`/bench`, via a
   `servers-live` PR Abdullah merges); if the free plan's CPU limit can't hold a battle, ask him about Workers Paid.
2. **Open items:** client reconnect state wrong (Multiplayer P1); phone-portrait bar clipping (UI); then the two
   items Abdullah had paused — **Generals mouse controls + Mouse settings** (branch `orch/wip-generals-mouse`) and
   **intuitive phone controls** — now unpaused by this instruction (side lane read "open items" to include them; he
   can say otherwise).
3. **Music:** the shared real soundtrack (step 2+), using the keeps on the listening page (14 keeps pre-filled by ORCH
   at 22:50 UTC as suggestions — Abdullah may still change them; read the page's `picks` when starting).
4. **Graphics overhaul** (Phase 1 engine upgrade onward).

- [open] **TOP PRIORITY — Server-hosted battles (Stage 2)** (Abdullah, 2026-10-27 07:07: "yes" to making it ORCH's
  top priority, ahead of Graphics Phase 1). Battles run on a server instead of the host's browser: no host advantage,
  phones never host big battles, host leaving doesn't disturb the match, bigger battles. Plan (agreed 2026-10-26 19:09):
  1. **Headless battle sim** — `03-sim`/`01-data`/`02-map` run with no DOM/Three.js; `orch/headless.mjs` plays an AI
     battle in plain Node and matches the browser's state hash for the same seed. **DONE 2026-10-27 (side lane):**
     `node orch/headless.mjs` (+ `--compare` → `HEADLESS PASS`, identical hashes vs Chromium at 2 and 8 players, with and
     without rendering); report + measured costs in `orch/STAGE2.md` (8 players: ~0.2–0.3 s CPU per game-second mid
     game; ~45 thirty-minute matches/day on the free plan; no blockers). Node and Chromium differ in the last digit of
     Math.sin/cos/atan2/exp/pow: fine while one machine decides everything. **ORCH: steps 2–4 next** (split the
     host-side snapshot code out of `07-net`, move the borrowed helpers into the sim modules — see STAGE2.md). **Helpers moved in cycle 9** (01+02+03 load in
     plain Node with no stand-ins; `headless.mjs` adapted). **Host-netcode slice done cycle 10** (`src/07a-hostsnap.js`, `headless.mjs --hostsnap [--compare]`; STAGE2.md §7).
     Next: move `wireHost`'s battle half (orders, pong, keyframe requests) into 07a, then the Node dedicated server.
  2. **Dedicated PC server** (Node, `tools/Dedicated server.cmd`, no window) for the biggest battles; all players are
     clients over the existing relay/P2P paths.
  3. **"Host on Cloudflare"** lobby option in `server/` (Durable Object runs the sim): measure GB-s, requests and
     CPU per tick on the free plan first (estimate: ~225 GB-s per 30-min match → ~40–50 matches/day under the 80%
     guard; avoid per-tick alarms — they count as requests). Size the option to what the free plan sustains.
  4. **Lobby choice:** "Host in my browser" (default/fallback) / "Dedicated PC server" / "Cloudflare". Never break
     current P2P play; host and clients must agree (mpsync/migrate in the gate). Server changes go live only via a
     PR `main → servers-live` that Abdullah merges.
- [open] **Graphics overhaul — Phase 1 approved** (Abdullah, 2026-10-26 21:24; second after server-hosted battles). Plan:
  https://claude.ai/artifact/QDp8ykMpW6fwW7YRn4jqUZ. **Slice 1 shipped cycle 9 (models in `models/*.glb.gz`); slice 2 cycle 10 (battles load only their nations' models).
  Next slice: Three.js upgrade.** **Unblocked: the phone-speed fix and the bottom command bar landed on `main` 2026-10-27** — start it now. Phase 1 = move `MODEL_PACK` art out of
  `index.html` into compressed per-unit/per-nation files served next to the page (Cloudflare `ww3` + Pages), loaded per
  battle; build-time compression; upgrade Three.js r128 → current on a branch with side-by-side screenshots of every
  map and nation. Decisions: **units first** (Phase 2 next: detailed models, national variants), **phones stay smooth**
  (lighter phone look OK, PCs get everything), **free art only**. Audio overhaul runs alongside (next item).
- [open] **NOTE 2026-10-27 18:55: steps 1–3 SHIPPED on main (5e5015b + 1d90339, 14 kept tracks in `mus/st/`, anthems, `orch/musiccheck.mjs`). Only step 4 is left (remove `mus/smp.mp3`, `me/as/we` sample sheets and the generator once the fallback isn't needed). Soundtrack agent on `orch/soundtrack`: rebase your work onto main's version, keep main's player, do only step 4.**  **Redo the whole soundtrack: one shared real soundtrack** (Abdullah, 2026-10-27: "they suck… redo the entire
  soundtrack and not do faction specific"; chose "shared + anthems", Shia factions on the shared soundtrack too).
  Why today's music is weak: every track is generated live from a ~10-note motif over one 8-chord loop on 2000s GM
  soundfont samples + raw oscillators; per nation ~2.5 min of material looped all battle (the `_b` track is the motif
  reversed); random-note "improvised" battle lead; stand-in instruments; latmiya vocals are a formant synth.
  Plan: (1) Audio agent builds a shortlist of ~25 free tracks (CC0 / CC-BY credited / PD military band; NOT Pixabay or
  other non-CC licences) in a C&C / Company of Heroes style with source + licence links, published as a phone-friendly
  listening page (artifact) where Abdullah taps keep/drop — **[ask] he picks**; (2) after his picks: replace the
  generator with a track player — pools menu / calm / combat / victory / defeat, calm↔combat on `AU.heat` with
  crossfade and ≥60 s dwell, each track streamed only when about to play (phones), menu credits per track;
  (3) anthem at battle start + victory for nations that have a PD recording (8 today; find more); (4) remove
  `mus/smp.mp3` (3.3 MB), `me/as/we` sample sheets and the score generator once nothing uses them (keep "My music").
  `build.py --check` credit checks must follow.
  **Step 1 DONE 2026-10-27:** 32 licence-checked candidates (menu 4, calm 8, combat 14, victory 3, defeat 3; Kevin MacLeod
  CC-BY 4.0, OpenGameArt CC-BY/CC0, Musopen PD on archive.org, US Marine Band PD) in `mus/new/candidates.json`
  (titles, licences, source + download URLs, preview start points). Listening page:
  https://claude.ai/artifact/24sKTTjkx1pfPxVzt3si8f — Abdullah's picks land in its database, collection `picks`
  (doc id = track id, `{v: "keep"|"drop"}`; read with ArtifactData `list`). **[ask] waiting on his picks**; once
  there are keeps in every pool, do step 2 (re-download the kept tracks from `download_url`, encode for phones).
  Left out as doubtful: Jonathan Shaw "RPG Orchestral Essentials" (own non-CC licence in the zip), Holst "Mars" on
  Commons (generic "Attribution" licence). Victory pool is thin.
  **Steps 2–3 SHIPPED 2026-10-27 (this chat, Abdullah: "keep what you think is best and proceed")** — ORCH chose the 14
  keeps (in the page's `picks`, `by: "orch"`); player in `09-audio.js` (calm↔combat on `AU.heat` ≥0.35, 3 s crossfade,
  dwell combat 60 s / calm 30 s, streamed one file at a time, falls back to the generated score if a track can't load),
  anthem at battle start + after victory, credits, `sw.js` never stores `mus/st/`, `orch/musiccheck.mjs` (in the gate
  for audio changes). `mus/st/` 32 MB at 112 kbps. **Side lane on `orch/soundtrack`: this replaces your step 2 —
  don't merge your `mus/st/` re-encode over it (same file names).** Remaining (step 4): remove the old generator,
  `mus/smp.mp3` and the me/as/we sheets (offline play still uses them today); if Abdullah changes picks on the page,
  swap files to match.
- [open] **Audio and music overhaul** (Abdullah, 2026-10-26 21:09–21:15; same plan doc; **music part superseded
  2026-10-27 by the shared-soundtrack item above** — don't add more per-nation music). Free only (CC0/CC-BY or public
  domain, credited). Real recorded weapons/battle/ambience; full native-language voice lines (volunteers, TTS fallback);
  proper mix. ~~Every nation gets region-specific music~~ (old): the region's scales, rhythms and instruments on free recorded
  samples, plus its public-domain US Navy Band anthem recording as a military-band layer (check each composition's
  status). Middle Eastern six done (side lane); Asian five (PK, IN, CN, KP, KR) done cycle 7; Western seven (US, TR, IL, EU, UA, RU, CU) done cycle 8 — **all 18 now have region music**; next: real recordings for the stand-in instruments, remaining PD anthems, recorded weapons/ambience.
  **Latmiyas:** keep the synthesized ones until real replacements are ready, then swap; replacements may be military
  band music; Abdullah can't record — search free archives (Commons, Internet Archive, Freesound, folk archives) for
  freely licensed real latmiyas; optionally draft a permission request he can send to a reciter. Likely mix: real
  latmiya for menu/calm, military band for battle. Religious and traditional pieces only — no armed-group anthems.
- [open] **Stage 1 SHIPPED to main 2026-10-27 (off until live; see [ask] Put the servers live). Stage 2 open. (side lane, restarted 19:36 — Abdullah: "do this now"; stage 1 done; deploy via Cloudflare Workers Builds + merge-to-approve, no tokens) — Servers to assist multiplayer** (Abdullah, 2026-10-26 19:06: "make virtual servers assist with
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

- [open] **Phase 5 next: infantry draws** (Visuals, cycle 19) — vehicles merged; infantry is now the biggest cost (~16 draws per squad); artillery add-on gun still its own draw; decal ring/shadow refill runs twice per frame (10-post re-renders the scene — skip if `R3.info.render.frame` unchanged); run `columns.mjs --phone`. If turrets are ever animated, keep their parts out of the merge.
- [open] **End-stats follow-ups** (Interface, cycle 19): cap awards per player (one player can sweep them all); show player names; army graph stops at 720 samples (~2 h) — halve + double interval instead; `orch/endstats.mjs` failed once then passed ×2 (flaky? add to gate when stable); ask Abdullah to test on iPhone.
- [open] **Soldier animation clips + distant low-poly soldier** (Visuals, gfx-infantry follow-up): baked run/shoot/die; the
  remaining buildings (only HQ/barracks/factory got ME models).
- [open] **QA: CI `cfclient` flaked once on d136254 and again in cycle 19 (passed on rerun)** ("no player took over after the server lost it"); passed locally ×1 and on
  the branches. If it fails again in CI, root-cause the takeover-after-server-restart timing.

- [open] **ME buildings follow-ups** (Visuals, cycle 16): Strike Center close-ups from a real battle; Egypt vs Saudi/UAE versions differ only in silo height — give EG its own touch.
- [open] **Balance: watch TR (38%) and KR (41%)** next round; CN highest (65%). Tool: `node orch/aitourney.mjs` (Battlefield).

**Foundation (ORCH itself)**


- [open] Extend `orch/mpsync.mjs`: packet loss/latency, real WebRTC (3-player host migration is now covered by
  `orch/migrate.mjs`, cycle 6; its `--abrupt` mode — host vanishes without goodbye — is untested).
  Don't start from scratch — port the surviving old harnesses on the `testbed` branch: `tw8b.py` (host in Chicago +
  1–7 clients with real-world one-way delays, jitter and lag spikes; measures order latency, drift, bandwidth) and
  `p2pmig.py` (3 players over a local PeerJS server, host leaves, checks migration). `probe.py` = load-time probe.

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] (side lane `orch/ai-tactics` has this; ORCH cycle 13's own version is on branch `worktree-agent-af18354e507b5537f` e597af4 if theirs falls through) Fulda: late-game supply trucks haul from fields up to ~4,000 away because nearby fields run dry (cycle 12
  finding) — AI should expand: build a depot or HQ near the new field.
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Big explosions still open with a soft, flat yellow ball for their first instant — rework (cycle 12).
- [open] `migrate.mjs` failed once in cycle 10's gate ("a client fell 59 game-s behind before the host left") right
  after a 6-min `mpsync --server` run; passed on rerun. Watch for a repeat (load-sensitive?). Very old Safari (<16.4, no DecompressionStream) now
  gets simple shapes. Check after ship that Pages + the `ww3` Worker serve `models/*.glb.gz` (loader also accepts
  already-unzipped bytes) and that the artifact publish with `application/gzip` files works.
- [open] More national tanks when free models appear: Type 99 (CN), K2 (KR), Altay (TR), Al-Khalid (PK) — none free
  and downloadable in cycle 11 (Type 99s are War Thunder rips).
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

- [open] Martyrdom banner follow-ups (cycle 17): staged/real-battle screenshot of the flag; flag fade runs on real time, not game time (can outlast the buff when paused); banners aren't in checkpoints or sent to clients who arrive in view later (8 s, accepted). 
- [open] News ticker follow-ups (cycle 17): only shows own-team news (clients get only their own messages) — consider host-broadcast public headlines for enemy captures/losses; click-test the Settings toggle.
- [open] touch.mjs still ~265 s — cut software-GL screenshots to get under 3 min (QA).

- [open] EW follow-ups (cycle 18 review): (checkpoint save + ewtest in gate DONE cycle 19) EW truck exists only for RU — consider giving the jam/spoof to another nation's special if Abdullah wants it wider; ewtest.mjs into the gate.
- [open] Kill-cam follow-ups (cycle 18 review): replayed plane effects / building-death timers keep running after the replay and cam._xl/_yl/_dl aren't restored (kcStop in 08-ui); first replay frame may stutter; test on a real iPhone. claude.ai copy: Save screenshot does nothing there (artifact viewer blocks plain downloads) — use the `downloads` capability (window.claude.downloads.save) in the artifact build or hide the button there. Headless replay shot shows a black band under the picture (~40% of the screen, where the command bar was) — check the letterbox layout on PC and phone.

## P2 — next

**Visuals**
- [check] Battlefield debris near roads: shell casings, burnt patches (some debris exists).
- [check] Bridge guard rails and lamp posts look too modern.
- [check] Tree canopies a little faceted up close.
- [check] Shoreline foam variation on water.
- [check] Infantry helmet/kit variety beyond v68 tone variation.

**UI/UX & controls** (`08-ui`, `06-view`)

**Multiplayer** (`07-net`, `07b-ckpt`, `relay-worker.js`)
- [open] "Play again" path should restore the player's own Conditions if it skips `leaveNet` (cosmetic, cycle 8 review).
- [open] Asian music stand-ins (no free recording found yet): janggu, haegeum, piri, taepyeongso, gayageum, guzheng, sitar, shehnai — swap in real free recordings when found (`mus/as_pack.py`). Check the new credit line shows in the menu.
- [open] Music follow-ups: real ney (Freesound blocks this sandbox with 403 — needs a download from elsewhere) (Freesound
  #580759 CC0, #328744 CC BY); gayageum/guzheng/sitar blocked by Wikimedia rate limits; no clean bandura/balalaika
  found; still stand-ins: bandura, balalaika/domra, tres, bayan, sopilka. TR/RU anthems skipped (not clearly PD).
  No freely licensed real
  latmiya found yet (cycle 9 search).
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [open] Artifact edition untested on the real claude.ai room: latency, ~40 msg/s cap, drops, host migration.
- Campaign or scenario missions; tutorial; replays; spectator mode for MP.
- Clip/showcase pipeline rebuilt in `orch/` so ORCH can post short phone-friendly clips of new features.

## Done

- 2026-10-30 (cycle 19) — End-of-match summary page for every player (host and clients): awards, scoreboard per nation, army-strength graph, Share picture (iPhone share sheet). Counting only.
- 2026-10-30 (cycle 19) — Vehicles drawn as one merged mesh per type/team + batched team rings/shadows: −40% draw calls in a 620-unit battle, same look.
- 2026-10-30 (cycle 19) — Host takeover keeps fake radar contacts and martyr banners; EW test in the CI gate (18 jobs).
- 2026-10-30 (cycle 18) — Bigger EW (RU EW truck): enemies inside its bubble get a "JAM" static patch on their minimap; new Radar spoof button (60 s recharge, AI uses it) puts 3–4 fake contacts on enemy minimaps for 20 s; a Strike Center (yours or an ally's) marks fakes with "?".
- 2026-10-30 (cycle 18) — Kill-cam: ~10 s slow-motion replay of the battle's biggest moment before the score screen (skip with tap/Esc), plus a Save screenshot button.
- 2026-10-30 (cycle 18) — Martyr banner: the soundtrack swells briefly for its side (max once per 20 s).
- 2026-10-30 (cycle 17) — Martyrdom banner: fallen IR/RS/DW infantry leave a crimson rally flag (~8 s, one per area): nearby infantry shake off fear faster, routers rally, +10% damage / ~9% faster fire; "MARTYR" text.
- 2026-10-30 (cycle 17) — Live news ticker: thin BREAKING strip at the top with battle headlines (captures, eliminations, weather, superweapons, heavy losses); Settings → News ticker.
- 2026-10-30 (cycle 17) — AI unit/upgrade picks use the seeded RNG; touch.mjs ~265 s (was >600 s).
- 2026-10-29 (cycle 16) — Strike Center + Shipyard get the Middle Eastern military look (IR, RS, DW, SA, AE, EG); camo nets now drape low instead of looking like parasols.
- 2026-10-29 (cycle 16) — Phones with no voice for a nation's language speak the English line instead of staying silent.
- 2026-10-29 (cycle 16) — [verified] AI navy on time (first warship ~4.3 min Normal, ~3.6 Hard) and lands troops by landing craft; Hard flanks/uses cover (won 10/12 vs Normal, no extra money).
- 2026-10-29 (cycle 16) — QA: "SKIP touch" came from a branch older than touch.mjs; CI now fails loudly instead of skipping.

Moved here by ORCH with date and version. Full pre-ORCH record: `orch/HISTORY.md`.

- 2026-10-29 (cycle 15) — **Middle Eastern bases complete (Visuals):** Revenue Center = walled sandstone compound with
  towers, oil tanks, camo netting; Supply Depot = HESCO walls + sandbags; Tunnel = concrete bunker in an earth mound;
  Airfield = hardened shelter + sandstone tower; Defense Gun/SAM = HESCO ring; HQ/barracks/factory got blast walls
  (IR, RS, DW, SA, AE, EG; built in code, no extra download).
- 2026-10-29 (cycle 15) — **Balance round 4 (Battlefield):** IR −6%, DW −7%, TR/CU −4%, EG −3%, IN −2%, RU −1% cheaper;
  CN +2%, PK +3% dearer. 504 AI games: before 12–71% (IR 12%), after 38–65%. Server PR #7 (main → servers-live) opened.
- 2026-10-29 (cycle 15) — **Voice fallback (Audio):** when a recorded voice sheet can't load, "under fire", "unit lost"
  and "building ready" are spoken by the device in the nation's language.
- 2026-10-29 (side lane, after cycle 14) — **Natural voices (`orch/voices-natural`)** for all 18 nations (XTTS-v2 /
  Piper / MMS) and **no-button enter/exit (`orch/enter-exit`)** merged to main by the side lane.
- 2026-10-29 (cycle 14) — **Massive columns (side lane `orch/columns`):** soldiers drawn as one piece, forests/rocks drawn only in
  view, off-screen units skipped, no more multi-second freeze when a vehicle dies (8-player battle: frame time halved).
- 2026-10-29 (cycle 14) — **Real soldiers + Middle Eastern buildings (`orch/gfx-infantry`):** desert / green / militia-fatigue
  soldier models; sandstone HQ, mud-brick barracks, walled factory for IR, RS, DW, SA, AE, EG.
- 2026-10-29 (cycle 14) — **AI tactics + navy + balance (`orch/ai-tactics`):** Hard has no extra money but counter-builds, flanks,
  uses cover, focus-fires; shipyard ~3 min, landing craft; trucks fixed; nations 37–65% (IL 51%, AE 57%).
- 2026-10-29 (cycle 14) — **Unit voices (`orch/voices`):** native-language lines for all 18 nations + under fire / unit lost /
  building ready. Review fix: "Building ready" played every moment during construction → now once when done.
- 2026-10-29 (cycle 13) — **Mouse:** left-click selects, right-click moves/attacks, mouse stays in the game window
  (Abdullah's live request) — already shipped by the side lane (8b970d4) while ORCH was building the same; ORCH's copy
  dropped (kept on branch `orch-cycle13-dup-controls`), gate re-run on main's version (controls PASS).
- 2026-10-29 (cycle 13) — Map picker says "rivers" (not "open land") for Fulda Gap, Golan, Korean DMZ and other bridged maps.
- 2026-10-29 (cycle 13) — **Host takeover with two backups at once:** new test `migrate.mjs --dual-claim` (gate job
  migrate-dual); a player who steps down no longer sees frozen ghost units, and fades them out (review fix).
- 2026-10-29 (cycle 13, verified) — Reconnect state bug was fixed 2026-10-27 (`orch/open-reconnect-phonebar`, in mpsync).

- 2026-10-28 (cycle 12, verified) — Already live, removed from P2: phone-portrait whole columns, Generals mouse
  controls + Mouse settings, intuitive phone controls (shipped by side lanes 10-27/28; roadmap [done]).

- 2026-10-28 (cycle 12) — **AI barrages never aim at their own troops** (7 of 52 → 0 of 59 in 12 test battles); IL/AE
  ambush pickets fight only within range of their post and slip back (time far from post 0.6% → 0.08%).
- 2026-10-28 (cycle 12) — **Realistic muzzle flashes:** small bright core + short flame (no more glowing balls over
  squads), tank guns get a sized flash with side jets (phones lighter); ricochet sparks only when the round hit armour;
  sandbags at SAM sites, tunnels and all sides of defence guns.
- 2026-10-28 (cycle 12) — **Safer host takeover (browser-hosted battles):** only one player takes over (newest backup
  wins; a second host steps down); joining the takeover room times out after 12 s, opening a battle after 20 s; waiting
  players retry 0.5→2.5 s apart instead of every 0.3 s; a cancelled battle never opens late.
- 2026-10-28 (cycle 12) — Gate: `build.py` refuses merge-conflict markers; mpsync no longer fails on "models missing"
  in this sandbox (local `--artifact` passes again); mpsync checks host Conditions reach the client.

- 2026-10-28 (cycle 11) — **Five more national tanks:** Ukraine T-84 Oplot, Iran T-72, North Korea T-62, Cuba T-55,
  Turkey Leopard 2A4 (CC BY, credited).
- 2026-10-28 (cycle 11) — **Smarter AI doctrines:** AIs rebuild a lost counter-battery radar; RU/CN/KP keep ~1/5
  artillery and fire barrages at troop groups (2–3 per game, was ~1); IL/AE set camouflaged ambush pickets.
- 2026-10-28 (cycle 11) — **Anthems for Pakistan, South Korea and Russia** (US Navy Band, PD; reasons in
  `mus/an_pack.py`). Skipped, not clearly PD: TR (free 2029), SA, AE, IR, KP.
- 2026-10-28 (cycle 11) — **Faster first visit:** the offline helper no longer downloads all 60 models at install; it
  saves what the game loads (59 → 1 model requests at install; offline replay of a played battle works).
- 2026-10-28 (side lane, shipped before cycle 11) — QA follow-ups: pasted invites join the right game, Rejoin after a
  reload, defeat text, settings screen, whole command buttons, review R11/R12/R4. **Server part (R12, R4) goes live
  only after the main → servers-live PR is merged.**

- 2026-10-27 (after cycle 10) — claude.ai copy's voice clips replaced with the repo's `vo/` (Abdullah: he didn't upload
  other voices); artifact v165. Republishes may pass `vo/` again.

- 2026-10-27 (cycle 10) — **Faster battle start:** a battle downloads only the models of the nations in it (others
  fetch quietly in the menu); throttled 4 Mbit/s Start → first frame 61 → 40 s; the log names any model that failed,
  and a failed one is retried next battle.
- 2026-10-27 (cycle 10) — **Anthems for India, China and Egypt** (US Navy Band, public domain) in the battle finale;
  IL's anthem confirmed playing.
- 2026-10-27 (cycle 10) — **Server battles prep:** everything the host sends players lives in `src/07a-hostsnap.js` and
  runs in plain Node; Node and Chromium hosts send identical messages (4,265/4,265). No change for players.
- 2026-10-27 (cycle 10) — **claude.ai edition gets its models again:** `build.py --artifact` publishes them as base64
  `.txt` files the host accepts; the artifact test server serves only accepted types.

- 2026-10-27 (cycle 9) — **Faster page load:** the 3D models are separate files (`models/`, 50 gzipped .glb) fetched
  while the menu is up; `index.html` 8.3 → 1.8 MB; menu ready at 3 Mbit/s 16 s → 2 s; offline cache includes them.
- 2026-10-27 (cycle 9) — **Anthems + real Turkish instruments:** IL, UA, CU anthem by the US Navy Band (PD) in the battle
  finale; zurna (cdrk, CC BY 4.0) and davul (kroshe, CC0) are real recordings now.
- 2026-10-27 (cycle 9) — **Server battles prep:** battle code (`01`–`03`) runs on its own in plain Node (ground height,
  effect queue, log, end-of-battle core moved into the sim; no THREE use). No change for players; headless hashes match.
- 2026-10-27 (cycle 9) — `build.py --check` now fails if the page shell loses server code, a music/voice/model credit,
  or gets install buttons back; smoke/mpsync/migrate keep each run's screenshots in `orch/out/runs/` (last 10).

- 2026-10-27 (cycle 8) — **Region music for the last seven nations:** US fife & drum + Sousa march, TR Ottoman mehter +
  halay, IL klezmer + Mizrahi hora, EU baroque fanfare + Ode to Joy march, UA bandura duma + Cossack march, RU Orthodox
  choir with bells + soldiers' march, CU son + mambo; US/EU anthems by the US Navy Band (public domain) in the battle
  finale. `mus/we.mp3` (0.42 MB) loads only for these seven.
- 2026-10-27 (cycle 8) — **Balance round 2:** AI keeps about a third of its army in vehicles (was 2–19%), stops saving
  for unarmed trucks, buys KR radar once; prices SA +5%, UA/RS +3%, IL −5%, KR −4%, TR −3%. `tourney.mjs --swap`.
  Protocol version 6 (old and new copies don't mix).
- 2026-10-27 (cycle 8) — **Faster host takeover:** normal 3.6 → 1.9 s (others back in 4.6 → 2.6 s), abrupt host loss
  9.3 → 6.3 s; leaving an online battle restores your own Conditions. Review fix: a standby whose takeover hits a
  brief network error keeps trying. `migrate.mjs` no longer mistakes its own screenshot freeze for a lost host.

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
