# History — every agent run and what it shipped

Reconstructed on 2026-10-25 by ORCH from the scheduled-task records of all past chats, the `testbed` branch and the
live build. Before ORCH, work ran as self-rescheduling "rounds" inside one long chat (session
`session_01NYN6pWTrTJTmBddAW2fZh4`, linked to LAPTOP-26MKDH7J). That session kept its sources (`v3/`), model
assets (`assets/`), test harnesses and a `ROUNDS.md` change log in its own private workspace — none of that was in
the repo. ORCH recovered the up-to-date game sources from the live `index.html` into `src/` (byte-identical
rebuild), so the repo is now the single source of truth.

## Agent runs (all finished; none still scheduled)

| # | When (UTC) | Name | Cadence | Focus | Output |
|---|---|---|---|---|---|
| 0 | Oct 18 21:21 – Oct 19 01:21 | WW3 graphics hourly check-in (4 rounds) | hourly | graphics | screenshots each hour |
| 0b | Oct 19 03:32 – 04:18 | WW3 continuous graphics work | 45 min | graphics | clip every 4 h |
| 1 | Oct 19 12:00 – 17:41 | WW3 graphics round (cycle from 07:00 Chicago) | 2 min back-to-back | graphics v58–v63 | 30 s clip at 16:00 |
| 2 | Oct 20 12:04 – Oct 21 12:00 | 24-hour development run + clip backstops + safety net | 2–30 min | graphics v64–v71 | 45 s clip every 4 h |
| 3 | Oct 21 01:15 – Oct 22 01:15 | 24-hour development cycle #2 | ~30 min | graphics + controls v72–v75 | 45 s clip every 4 h |
| 4 | Oct 21 12:55 – Oct 22 13:00 | Development run #3 | ~30 min | graphics, gameplay, speech v76–v84 | clips on the "World War 3 Clips" page |
| 5 | Oct 22 01:28 – 10:00 | Overnight run #4 | ~30 min | rotation: graphics, mechanics, audio, gameplay, map select, unit art, faction art, music, menu settings, tactics | clips 05:30 / 09:30 |
| 6 | Oct 23 18:00 – 22:30 | Development run #5 | ~30 min | Abdullah's run-5 backlog (lived in that session's ROUNDS.md) | one summary |
| 7 | Oct 25 14:04 – 14:33 | `testbed` branch | — | netcode: P2P transport, per-player event filtering, host-migration checkpoints | ~95% merged into live |
| 8 | Oct 25 | main | — | GitHub Pages hosting, PWA install/offline, host-in-background worker, host tune-up tools, Cloudflare relay, "Radwan Training" name restored | live |

Published game artifact used by runs 1–6: https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi ("World War 3").
Clip page: https://claude.ai/artifact/NqbVv2hseRUctmafy3AFC2 ("World War 3 Clips").

## Shipped improvements by version

**v58–v63 (Oct 19)** — finer grass tufts, scattered stones, vehicle camo pattern · paler sun-bleached terrain,
weathered lighter rocks, removed green blob shrubs · two-track dirt roads with wheel ruts, broken-up leafy acacia
canopies with shaded undersides, wispier grey wreck smoke · windblown sand over concrete base pads, dappled canopies ·
weathered/grimier buildings, muted team trim, regional building tints (US/EU/KR) · short warm-orange tracers.

**v64–v71 (Oct 20)** — lighter grey-brown explosion smoke, low rolling ridges, finer terrain mesh, grey wreck-smoke
columns, neutral fog of war (v64) · tank stowage/antennas on the real rear deck (v65) · sunlit smoke and dust, pale
sandstone slopes, softer cloud shadows, rising damage smoke (v66) · weathered bridge deck with drifts, cracks,
potholes, faded markings; warmer building walls (v67) · thin whip antennas, fainter team rings, soldier tone
variation (v68) · thinner greyer smoke, warmer sand-bounce fill light (v69) · ragged-edged smoke/dust puffs, lighter
exhaust, gentler dunes, milder slope darkening (v70) · brighter teal river with turquoise shallows (v71).

**v72–v75 (Oct 21)** — left-click controls; helicopter flies nose-first; softer acacia canopies (v73) · 8-player
multiplayer, native-language voices, national flags/camo/uniforms, realistic vehicle motion, destructible oil
derricks (v75).

**v76–v84 (Oct 21–22)** — stronger national vehicle paint (Russian/Chinese green vs US/Gulf tan) (v76) · badly
damaged buildings burn: roof/wall fires, sparks, black smoke, firelight (v77) · killed soldiers topple and lie
~15 s instead of vanishing (v78) · helicopter rocket salvos with smoke trails, walking cannon bursts (v79) ·
deterministic map seeds for recordings · Construction Vehicle + build anywhere, buildable Command HQ, 10 maps
(strait, rivers, delta, oasis, gulf, plateau, hormuz, arctic, islands, zagros), unique national scores, natural
voice preference, factions renamed (RS "Mountain Shias", DW "Coffee Shias"), IM removed (v84).

**Oct 22–23 (runs #4–5, detail lived in ROUNDS.md)** — work across mechanics, audio, map selection, unit and
faction art, music, menu settings and tactical realism (flanking, cover). The live build shows the results:
dynamic weather per theatre, national specials, doctrines, upgrades, national powers, general ranks, veterancy,
courage/morale and suppression, garrisoning, the Ayatollah unit for Shia factions, latmiyas, voice slogans.

**Oct 25** — P2P netcode with per-player event filtering and host-migration checkpoints; host keeps the battle
running when its window is hidden; battery and wake-lock handling for hosts; GitHub Pages + installable PWA;
Windows host tune-up scripts; Cloudflare relay worker; "Radwan Training" restored.

## Test harnesses the old runs used (not in the repo)

`audit.py` (unit mechanics), `aiall.py` (AI games, stuck units), `t8.py`/`t6b.py` (multiplayer sync), `sbtest.py`
(sandbox), `maptest.py` (maps), `shotf.py`/`shot2.py` (screenshots), `rec.py`/`rec2.py` + `raudio.py` + `mix.py` +
`phone.sh` (clips). ORCH replaces the core of these with `orch/smoke.mjs`; the rest should be recovered from that
session if it still exists, or rebuilt in `orch/`.

---

## 2026-10-26 — Full sweep and index by area (added by ORCH on Abdullah's request)

**Sweep covered:** every scheduled task on the account, every claude.ai artifact, both GitHub branches, the repo
history, ORCH's cycles 1–2. Running Claude sessions: none besides ORCH's own runs.

**Agents, all of them:**

| Agent | Status |
|---|---|
| **ORCH** (scheduled task, every 4 h at :24 Chicago time) | **Active — the only standing game agent.** Spawns ≤4 squad agents + 1 reviewer per cycle; they end with the cycle. |
| Squad agents: Visuals, Battlefield, Maps, Audio, Netcode, Interface, QA | Spawned by ORCH per cycle (see `ORCH.md`) |
| ≈45 "WW3 graphics/dev round" one-shot tasks, runs #0–#5 (Oct 18–23), old dev chat on LAPTOP-26MKDH7J | Retired — all fired and disabled; that chat is gone |
| `testbed` branch work (Oct 25) | Retired — ~95% merged; review queued in backlog |
| Daily World News Briefing, Daily Email Briefer | Not game agents — untouched |

**Correction:** three old test harnesses are *not* lost — they are on `testbed`: `tw8b.py` (worldwide-latency
multiplayer test, 1–7 clients), `p2pmig.py` (3-player host-migration test over a local PeerJS server), `probe.py`
(load-time probe), plus `v3/shell.html` and `v3/p2p.js`. Lost for good: `audit.py`, `aiall.py`, `t8.py`, `sbtest.py`,
`maptest.py`, the clip pipeline (`rec2.py`, `raudio.py`, `mix.py`, `phone.sh`) and the source 3D model files.

**Other places the game lives:** GitHub Pages (`main`, current) · claude.ai artifact "World War 3"
(Qt3bimPhr31eZEUpqndGUi — behind `main` by rotor wash, boat wakes, menu music, always-a-winner) · claude.ai artifact
"World War 3 Clips" (NqbVv2hseRUctmafy3AFC2, showcase clips from runs 3–4, last updated Oct 22).

### Everything shipped, by area

**Visuals** — *Terrain:* fine grass tufts and stones, sun-bleached sand, weathered rocks, low ridges and gentle dunes,
pale sandstone slopes, finer terrain mesh, two-track dirt roads with ruts, windblown sand on base pads (v58–v70).
*Vegetation:* broken-up, dappled acacia canopies; green blob shrubs removed (v59–v73). *Water:* teal river with
turquoise shallows (v71), boat/ship foam wakes (ORCH c2), rotor-wash spray (ORCH c1). *Smoke & fire:* realistic
grey/brown smoke, sunlit dust, rising damage smoke, ragged puffs (v60–v70); burning damaged buildings with sparks and
firelight (v77). *Vehicles:* camo, stowage, antennas, national paint and camo, realistic motion (v58–v76).
*Infantry:* tone variation, national uniforms, fallen soldiers stay down ~15 s (v68–v78). *Buildings & bridges:*
weathered walls, regional tints, cracked bridge deck (v62–v67). *Weapons:* warm tracers (v63), helicopter rocket
salvos and walking cannon bursts (v79), rotor-wash dust (ORCH c1). *Light:* cloud shadows, warm bounce light, neutral
fog of war, Clear / Golden hour / Overcast conditions.

**Battlefield** — national specials, doctrines, per-nation upgrades and national powers, general ranks, unit
veterancy, courage/morale and suppression, flank/rear hits, garrisoning, squads, the Ayatollah for Shia factions,
weather that changes vision/accuracy/speed/air, destructible oil derricks (v75), Construction Vehicle + build
anywhere + buildable HQ (v84), teams and allies, AI difficulty with flanking/focus fire/retreat on Hard, a match
always has a winner (ORCH c2).

**Maps** — 10 theatres (Strait, Rivers, Delta, Oasis, Gulf, Plateau, Hormuz, Arctic, Islands, Zagros), map picker
with thumbnails, map size scales with player count, deterministic seeds, weather per theatre (v84 and runs #4–5).

**Audio** — native-language unit voices (v75), slogans, unique synthesized national scores and latmiyas for IR/RS/DW
(v84), natural-voice preference, "My music" import, calm menu/lobby music (ORCH c2).

**Netcode** — 8-player multiplayer (v75), direct P2P via PeerJS with per-player event filtering and host-migration
checkpoints, host keeps running in the background, battery and wake-lock handling, Cloudflare relay worker, optional
TURN relay settings (Oct 25).

**Interface** — left-click control scheme with right-click as optional shortcut (v72, 2026-10-26 decision), full
Settings (graphics, volumes, FPS target, health bars, edge scroll, mouse), pause/restart/quit, Test Range sandbox,
FPS/ping readout, installable app with offline solo play (Oct 25), renamed factions (v84).

**QA (ORCH's gate)** — `build.py` (src ↔ index.html), `smoke.mjs` (headless AI battle + screenshots), `mpsync.mjs`
(host/client sync, ORCH c1), machine-wide browser lock (ORCH c2).

**Correction (2026-10-26 evening):** the game has **28 maps** in `MAPS`, not 10 — runs #4–5 added 18 more
(e.g. Bosphorus, Fulda Gap, Caribbean, Golan, Korean DMZ, Heartland). The map picker is now a dropdown with one large
preview, not per-map thumbnail cards.
- 2026-11-03 faction-looks (helper agent): per-nation flag/roundel decals, hull numbers, navy paint, Shia/KP/RU/West vehicle kits (procedural); new free models skipped (no verifiable licences). See orch/reports/faction-looks.md
- 2026-11-03 orch/bolder-marks (helper): Mountain Fortress is now a standalone garrison (own 20 slots, not linked to tunnels, heals infantry, releases units alive when destroyed); bolder faction markings verified (screenshots bolder-IR/KP). Report: orch/reports/fort-standalone.md
- 2026-11-04 doctrines (helper agent): General Doctrines — Armour/Guerrilla/Air/Artillery, 4 perks each, picked in first 2 min (touch card, Powers tab, setup row), AI picks by nation, doctrine shown in allies box + scoreboard; AI-vs-AI 44-55% each. See orch/reports/doctrines.md
- 2026-11-04 orch/map-editor (helper): in-game Map editor (menu → Map editor): paint terrain/water/bridges/roads/forests/towns/oil/supply/starts with mirror + undo, fair-play check, Play-this-map vs AI, save/load locally, share by code/link/file, custom maps in skirmish + online lobbies (map code sent by host, hash-checked; Cloudflare server updated). Report: orch/reports/map-editor.md
- 2026-11-03 orch/campaign (helper): 5-mission Shia campaign (Campaign button; Hold the Pass, Supply Run, Mountain Fortress, Retake the Town, Combined Arms): briefings, objectives panel, debriefs, saved progress, Easy/Medium/Hard; src/12-campaign.js + small hooks in 03-sim; orch/camptest.mjs. See orch/reports/campaign.md
- 2026-11-04 identity: Medals (25 achievements, toasts, local history), Profile (team colour + emblem synced via start ids), Unit guide, colourblind mode. See orch/reports/identity.md
- 2026-11-04 night-tactics (helper): Night in Random, Illumination Flares power (L), night vision for special forces/recon, crumbling building cover, suppression pin marker, rank chevrons + rank-up flash; report orch/reports/night-tactics.md; servers-live PR needed.
- 2026-11-03 orch/social-1103 (helper): Discord/Twitter link-preview tags + og-image.jpg; Tutorial button (8-step guided first battle, PC+touch, skippable); My battles (local history + stats in the menu). Shared leaderboard proposed, not built. Report: orch/reports/social-1103.md
- 2026-11-04 perf-1103 (helper): profiler extended (--simprof/--syncprof/--glcount); unit push-apart (03-sim separate) 38% faster; findings in orch/reports/perf-1103.md — render side needs a real-iPhone measurement.
- 2026-11-04 coop-ai: AI personalities (Tank Rush, Guerrilla, Artillery Turtle, Air Power, Random) + Co-op vs AI lobby/skirmish presets; aitourney --pers; tourney 38-58%.
- 2026-11-03 orch/polish-1103 (helper): end-stats awards capped per player + player names + long-battle graph downsampled; EW jam/spoof truck now also for US, CN, IR, IL; kill-cam leaves no stray effects and restores camera; news ticker shows host-broadcast public headlines (oil seizures, superweapons); Play again restores your own Conditions; martyr flags fade on game time. Report: orch/reports/polish-1103.md

- 2026-11-04 audio-1103 (Sonnet): role voices - 9 unit roles x select/move/attack in native language for 16 nations (IR/RS/DW with all Shia slogans first); KR/KP left (see orch/reports/audio-1103.md).
- 2026-11-04 vis-1103 (Sonnet): explosions reworked (flash + lumpy fireball + dark debris); distant low-poly soldier (vertex-clustered skinned LOD, swapped in past cam.dist 480). Kit variety, scenery details, baked clips left open (see orch/HANDOFF-vis-1103.md).
- 2026-11-04 orch/replay-spec (helper): Replays (every battle recorded as compressed snapshots; Watch/Save replay on the end screen, Watch a replay file in the menu; play/pause, 1-8x, timeline seek, side view / fog off) + spectators (👁 Watch in the game list, up to 4, see everything or one side, never a side/standby/host; server battles end when only spectators remain). Tests: replaytest (end hash matches), mpsync --spectator, specserver. Report: orch/reports/replay-spec.md
- 2026-11-04 orch/smoothcheck (helper): smoothness gate orch/smooth.mjs (pc / iPhone-like 4x-throttled Low / multiplayer with 80±30 ms + 1% loss; baseline orch/smooth-baseline.json; 3 CI jobs gate/smooth-*; docs orch/SMOOTH.md). Fixed: auto-lighten governor was switched off on phones (Low = locked) — now adapts + one-time 'Switched to lighter graphics' hint; FPS overlay shows 1% low. Report orch/reports/smoothcheck.md.
- 2026-11-04 terrain-urgent: stronger ground detail/patches/slope rock, card-foliage conifers + broadleaf trees, muted grass tufts (src/04-gfx.js, src/11-models.js).
- 2026-11-03/04 supply-towns (Sonnet): ammo per ground unit, supply circles (HQ/depot/truck/held town), Resupply order, ammo bars/panel row/out-of-supply icon, capturable towns with income + minimap owner, AI uses supply. Report orch/reports/supply-towns.md, shots orch/shots/supply/. Touches 03-sim/07* so needs main→servers-live PR.
- 2026-11-04 balance-models JOB A: AI tournament (306 games) found IR 79%/DW 71% too strong, SA 21%/EU 26% too weak; 6 small cost/speed tweaks in 01-data (IR Basij, DW speed+cost, SA/EU unit cost, SA jets, EU tanks) -> all four 50-65%; report orch/reports/balance-1103.md
- 2026-11-04 orch/net-1103 (helper): online reliability — fortress/tunnel/city garrisons survive host takeover (07b-ckpt), standby no longer gives up on its own late try, Cloudflare server never hangs on its Budget call; mpsync --lossy (bad-network sync test, in the gate), cfclient full-state check after reconnect, migrate paced like a real match. orch/reports/net-1103.md
- 2026-11-04 balance-models JOB B: 7 free CC-BY models from Objaverse (Mi-28 RU, Ka-52 EG, AH-1 TR/PK/IR, Type 45 West, F123 EU, Russian destroyer East, camo speedboat IR/RS/DW), visual only; report orch/reports/faction-models.md
- 2026-11-04 terrain2: no more cubes (rock-shaped boulders/rubble/explosion fragments), seamless 512px ambientCG ground atlas, stripes removed; see orch/reports/terrain2.md
- 2026-11-04 vis2-1103: soldier helmet/kit variety (4 seeded looks per nation, Shia first); scenery + baked clips still open.
- 2026-11-04 weather-naval: fixed Sandstorm/Rain/Snow Conditions; submarines (stealth, sonar), coastal missile batteries, offshore oil rigs, AI subs/batteries/rig grabs, wider beach unloads; 4 naval maps (Coral Archipelago, Hormuz Narrows, Delta Harbour, Pacific Atolls) with AI-vs-AI fairness table. Report: orch/reports/weather-naval.md
- 2026-11-04 orch/sub-models (Sonnet): realistic submarines (CC-BY Warfare/8bit/KoreanNavy models for West/East/IR-RS-DW) and a Scud-truck coastal missile battery with sandbags + command truck; visual only. Report orch/reports/sub-models.md
- 2026-11-04 trees: real CC0 Poly Haven fir/leaf textures on conifers, oak/acacia, palms (tree_tex model); report orch/reports/trees.md
- 2026-11-04 vehicles-real (Sonnet): shader weathering stage 1 — ships rust/waterline, aircraft panel lines/soot, map-aware mud/sand/snow grime; rest in HANDOFF-vehicles-real.md
- 2026-11-04 leftovers-1104 (Sonnet): scenery shipped — old-style bridge parapets/lamps, burnt patches + war debris (no cubes, skipped on Low), varied shoreline foam; gate 21/21. Voices KR/KP not finished (XTTS CPU too slow; see HANDOFF-audio-1103).
- 2026-11-04 epic-maps: 2-3 player maps +12-15% bigger, camera zooms out further on big maps, distant mountain ranges beyond the edge (flat at sea), tall battle-smoke columns over wrecks/ruins (max 3 on phones), 16 epic map names; fairness 235 AI games (no unfair seat). Report: orch/reports/epic-maps.md
- 2026-11-05 trailer (Sonnet): 65 s cinematic trailer from real in-game footage (headless capture, free camera, ffmpeg edit) -> trailer/ww3-trailer.mp4 + poster.jpg; scripts orch/trailer*.mjs/.py, notes orch/TRAILER.md. Footage predates the vehicles-real2 + KR/KP voice merges.
- 2026-11-04 vehicles-real2 (Opus): battle damage smoke/fire/ship list, nation kit for all 18 (fixed kit only showing on the first nation per model), air force paint + stores, Shahed/TB2/MQ/Lancet/FPV drones with stencils, ship rails/VLS/radar, tank commanders; kit instanced. Report orch/reports/vehicles-real.md
- 2026-11-04 voices-krkp (Opus): South/North Korea unit-type voices shipped (last 2 nations; all 18 now have role voices); KP leader = 'Dear Leader' lines; Korean QC sped up (2 takes, retry only clearly wrong, babble cut via Whisper timestamps). 1 known long KR navy line. gate/controls 136/138 pre-existing on main.
- 2026-11-05 smooth-inf (Sonnet): infantry stay on bridge decks (no sinking/edge snaps, 4 lanes, inside parapets), swarm separation damped (reversals -60-70%), foot-soldier drawing smoothed, gentle coherent wind on grass/bushes/trees; probe orch/smoothinf.mjs; report orch/reports/smooth-inf.md, clips orch/shots/smooth-inf/.
- 2026-11-05 missiles (Sonnet): cinematic missile strikes — smooth lathe missiles, staggered launches with flame + white smoke + roar, cruise (VLS) vs ballistic arcs with re-entry glow, converging warning ring + whistle, falling Bunker Buster bombs, big layered blasts with mushroom column, distance-scaled shake. Visuals/sound only (src/05b-missiles.js). Report: orch/reports/missiles.md
- 2026-11-05 decals-fix (Sonnet): every national marking now fitted to the real surface (kitDec: panel measured with probes, <=80% of it, 9-point on-surface test, skipped if it can't fit); roundels 1/3 chord on the wings, small fin flashes, hull numbers <=40% of hull height, small ensigns, tiny drone stencils; probes use a triangle grid (kit build 10x faster); new orch/decalcheck.mjs + CI job gate/decals (22 jobs). Report orch/reports/decals-fix.md
- 2026-11-05 smooth-all: measured frame spikes (all in 3D render submission), no shader/explosion/weather hitches, 0 MP client snaps, vehicles clean; shipped shadow map refresh every other frame on phones/slow frames; gate gained --phases, hitch probes, client-snap count; new orch/wobble.mjs. Report orch/reports/smooth-all.md
- 2026-11-05 conquest (Opus-class helper, scheduled): Conquest mode stages 1-2 + part of 3 on branch orch/conquest: town tax (4 rates) + unrest + revolt with rebel team (hidden last entry of G.teams), hamlets on every map, minimap towns/tax/unrest/alerts, tax panel (08c-towns.js), $10k start / no prerequisites / 90 s setup / base trickle / Revenue Center removed, win = base destroyed (HQ+production), missile rules (min 8:00, $1500, 40% cap, SAM = missile defence, public countdown), tutorial town+tax steps, NET_PV 7. Report orch/reports/conquest.md, next steps orch/HANDOFF-conquest.md.
- 2026-11-05 jet-exhaust (Opus): replaced the solid yellow cone behind jets with a soft additive plume at each real nozzle (ray-probed; MiG-29 etc. get two), red-hot nozzle ring, shock diamonds; full plume only on take-off/climb, faint short glow in cruise.
- 2026-11-05 hearts-minds (Sonnet-class helper, scheduled): Conquest follow-up on orch/hearts-minds: local militia recruits in loyal towns, informant pings, collateral damage (population + anger), bribe the elders, propaganda towers (1 per map), smuggling-tunnel hook for logistics, home turf per map (lobby label, town panel; capped social effects), AI uses it; fixed tax command losing its town index online. Fairness: turf tourney 55.5% home win (OFF 58.6%), CPU +0.23 ms/sim-s. Report orch/reports/hearts-minds.md
- 2026-11-05 tactics (Sonnet): digging in (I = foxhole for infantry; Construction Vehicle lays 2-click sandbag lines / trench segments; cover via coverAt, slows vehicles, tanks crush, shells destroy; AI digs in + AI dozers build lines after min 4) and Company-of-Heroes vehicle damage (tracks/wheels out, turret jam, engine fire from seeded hit-angle rolls; bail-out below 20% HP; dozers/factory yard repair; icons on bar + unit card, smoke/flames/broken track). New src/03b-tactics.js, 05b-tactfx.js, 08c-tactui.js; test orch/tacttest.mjs. Report orch/reports/tactics.md, shots orch/shots/tactics/. Sim change -> servers-live PR.
- 2026-11-05 extras (orch/extras): Save clip on the battle replay, Photo mode (P) with film looks, voice commands (hold mic / V). Report orch/reports/extras.md
- 2026-11-05 realism (Sonnet): soldiers go prone/crouch under fire + reload/grenade motion; distance-aware battle sound (rumble far, crack near, cap); bigger scar pools, 4 death falls, bodies ~50 s, wrecks ~3 min; garrison windows (silhouettes, flashes, floor-by-floor holes/smoke/fire); civilians + cars that flee, lights go dark in battle (new 06b-realism.js). Render-only. Report orch/reports/realism.md
- 2026-11-05 conquest-maps (Opus-class helper, scheduled): 2-4 player maps +27% (worldScaleFor), Conquest town bands on every map (2-3 rear hamlets per base, middle + contested hamlets on >=2 routes, one centre prize town with +50% tax, tax-potential balance step), road network base->towns->centre with road speed +30% wheeled / +15% tracked+infantry and trucks preferring roads; orch/bandfair.mjs static check (175/205 layouts clean), 383 AI battles (none decided <3 min, median 17 min, 2p/4p seats fair; 3p seat bias 28/56/16 is pre-existing on main), overview pictures in orch/shots/conquest-maps/, report orch/reports/conquest-maps.md. CIGATE 20/20.
- 2026-11-05 heroes (Sonnet, orch/heroes): hero squad for all 18 nations (rank 3, one alive, 150 s rebuy, one ability each: strike/charges/rally/fog/ambush/town-flip; E key; AI trains+uses), commander radio callouts (base, air, armour left/right, towns, missile, unit lost, hero ready) with subtitles, 13 deep-voiced radio lines per nation. NET_PV 8. Report orch/reports/heroes.md
- 2026-11-05 orch/ai-hard (helper, Opus): Hard AI plays Conquest like a smart human (towns on several routes, defend/retake, rear-High/front-Low tax, town + launch-site raids, missile defence, staged pincer, base-building focus, coherent research). Tactics only, Easy/Normal unchanged. Hard vs Normal 54% -> 88% (153 games, 4 maps, all >=76%). Hard-vs-Hard slots even, but IR 76% / SA 34% need a balance pass (pre-existing). CIGATE 20/20 PASS. main 931f5c29, PR #20 commented. Report orch/reports/ai-hard.md
- 2026-11-05 logistics stage 1 (Sonnet 5.5, orch/logistics, scheduled): road graph (bases+towns, static roads + player-built), per-team supply network, CUT OFF towns (no ammo refill, tax -50%, unrest up, red tag/minimap ring), TRADE ROUTE bonus (+25% tax via own-town road links), "Build road here" in the town panel (construction vehicles build at the frontier, $0.09/unit, live gravel on the ground), shells/bombs/missiles crater roads (150 s, repair 6x with a dozer), supply overlay (L / button; minimap always), AI builds roads. New `src/03c-logistics.js`, `src/08c-logi.js`, command `road`, `lg` in teamGlobals, `lgd` in checkpoints. Gate: 18/18 CI green on the pre-merge commit; local smoke PASS; local smooth fails on this slow box the same way plain main does (load 2.5x, +60% draw calls) so smooth-pc in CI is the judge. Not done: convoys, front line/territory, mines/checkpoints, bridges/pontoons, ports, airlift, AI beyond roads, tutorial step, AI tourney + CF CPU numbers (see orch/reports/logistics.md).
- 2026-11-05 net-host (Opus helper, scheduled): measured the Cloudflare battle server on current main (2/4/8 sides, 15 game-min, Normal + Hard; live /battle-bench 8 sides): late 8-side Hard ~200 ms CPU per game-second (~20 % of a core), Cloudflare keeps up with ~5x headroom, no paid plan needed. AI naval planning cached (15-35 ms AI spikes gone on water maps). Smart hosting: pages report a CPU benchmark, hosts make the strongest PC the standby; Cloudflare hands a battle that falls behind real time (<0.8x for 30 s) to it, and stops re-picking up a battle after 2 crashes in 10 min. New test orch/cfbattle-overrun.mjs (CFOVER PASS). Report orch/reports/net-host.md
- 2026-11-05 04:05Z jet-exhaust soft plume (Claude, main session): the exhaust plume is now soft textured crossed quads (white-hot core, shock diamonds, orange fade, soft edges) + a round nozzle glow instead of hard-edged cones — afterburner reads as a real heat plume, not a box. orch/shots/jet-exhaust/soft/.
- 2026-11-05 towns-look stage 1+2 (Sonnet 5.5, orch/towns-look, scheduled): town buildings redrawn region by region — Middle East (flat roofs, parapets, arched doors, awnings, balconies, shutters, rooftop tanks/dishes/solar, plot walls, palms, domed mosque with minarets, streets with kerbs/poles/cars/stalls, bullet pocks + soot), Europe/snow (gable roofs, chimneys, fences, trees, church), Korea/Asia (tile roofs, signs). One mesh per town (frustum-culled, rebuilt per town only). Sim untouched. orch/reports/towns-look.md, shots in orch/shots/towns-look/
- 2026-11-05 conquest-finish (Sonnet 5.5, scheduled, orch/conquest-finish): Conquest stage 3+4 finished. Every nation pays the same cost/time per upgrade tier (barracks/factory/airfield/HQ/shipyard tables in 01-data); powers get command points (XP) from calm held towns, first charge waits until setup end + 30 s; a strike exposes its launch site to enemies for 45 s and the minimap shows a red countdown ring on every inbound missile; missile defence = the SAM building with a national name for all 18 nations (Patriot, Iron Dome, S-400 ...), intercepts now show an interceptor streak + flash; map editor Hamlet tool; AI raid squad hits enemy rear towns; tutorial teaches setup phase, unrest/revolts and civic buildings; no Classic wording left. HUD XP no longer shows long decimals. Screenshots orch/shots/conquest (0-setup-banner, 9-strike-inbound, 10-end-screen). Gate note: command points at 2.5/s failed gate/smooth-pc (AIs reached powers sooner, draw calls x2); 0.8 used. Balance tourneys not run (separate agent). HANDOFF-conquest and HANDOFF-heroes deleted (heroes leftovers moved to reports/heroes.md).
- 2026-11-05 logistics stage 3 (Sonnet 5.5, orch/logistics2, scheduled): CONVOYS - automatic supply trucks drive the road network from the HQ to held towns, stock their supply circle (full range vs half), can be ambushed, escorts cut damage 45%, SUP/CVY badges + minimap squares; see orch/reports/logistics.md. Stages 5-10 still open.

## 2026-11-05 voices-manly
Measured all 1,936 voice clips; deepened ~330 weak (high/thin) clips across all 18 nations by pitch-down + warmth post-processing (no re-synthesis). Report orch/reports/voices-manly.md. Handoff orch/HANDOFF-voices-manly.md.
- 2026-11-05 logistics stage 5 part (Sonnet 5.5, orch/logistics2): TERRITORY + FRONT LINE - influence field from HQs/towns/depots, dashed front line on map+minimap, no building (except depots) in enemy territory. Convoys (stage 3) already on main.
- 2026-11-05 logistics stages 5b-10 (Opus 5.5, orch/logistics3, scheduled): depots + ports as road-network nodes (cut-off depots, convoys deliver to depots, stocked depot heals, rally at depot), road mines + checkpoints with tolls, bridges with HP / 30 s demolition charges / rebuild / pontoons (path grid + route caches update deterministically), port blockade + sea trade + sea supply, airlift by Transport Helicopter, AI uses all of it (Hard blows bridges), tutorial Logistics step, road look per theme (dirt / asphalt / gravel). Probe orch/logi3probe.mjs, shots orch/shots/logistics/. HANDOFF-logistics removed (all stages done). See orch/reports/logistics.md.
- 2026-11-05 voices-manly3 (Opus): installed XTTS-v2 + Piper/MMS + Whisper on CPU; re-voiced the 83 still-weak clips (UA, IL, EU, CU, RU, KP, RS) with the deepest male voice per language, barked, 2 takes + Whisper QC, tough2 radio + manly_fix chain; their median F0 ~126 -> ~93 Hz, weak clips 83 -> 20 (6 kept old: no clean take). Tool tools/voices/manly_resynth.py; report orch/reports/voices-manly.md.

## 2026-11-05 — balance (orch/balance, Sonnet)
Ran the first full Conquest balance on GitHub runners (new `balance.yml`, `aitourney --shard`, `balance_merge.py`): 18-nation Normal and Hard round robins (612 games each per run), Hard vs Normal, tax policies, home turf, mapfair rounds on flagged maps. Tuned 15 nations' numbers (IR/TR/KR/RS/EU down; SA/DW/PK/AE/UA/CN/EG/RU/IN/KP up), High tax unrest .6 -> .85; pooled win rates now 43-61%. Fixed two sim crashes from logistics (roads ending at a vanished depot node, lgJobs/lgSync) that broke 20-30% of AI battles. Hard beats Normal 93%, games 14-16 min median, none under 3 min. Open: heartland 6 / rubalkhali 6 seat 4 (and rubalkhali 8 seat 8) win far above share; hero A/B not measured. Report: orch/reports/balance-1105.md.

## 2026-11-06 — fun-extras (orch/fun-extras, Sonnet, scheduled)
Abdullah's three picks: (1) friend invites: one `join.html#join=CODE` link (own Discord card `og-invite.jpg`) opens straight into the lobby; guests pick nation + team and press Ready, the leader's Start glows only when all are ready ("Start anyway" always there); `server/src/battle.js` got `pick()` + `seats[].r` (servers-live PR needed). (2) kill-cam highlights: multi-kill / missile strike / base building falling / revolt / hero ability are noted during the match and the end-of-match replay is a reel of up to 3, "Highlight saved" toast, Save clip records the reel. (3) Encyclopedia: every unit + building of every nation in 3D with stats from 01-data and a short real-world note, search + nation/type filters. New modules 08d-lobby, 08e-highlights, 08f-encyclopedia; tests lobbytest / hltest / enctest; report orch/reports/fun-extras.md; shots orch/shots/fun-extras/.
## 2026-11-06 — infra-militias (orch/infra-militias, Sonnet)
Abdullah's 2026-11-05 18:43 picks: **power plants** (one per base + neutral ones, capturable, ⚡ on the minimap; no power = SAM/guns/coastal/strike centre offline with a red banner; Construction Vehicle repairs), **fuel** (no oil held for 15 min → vehicles 72 % speed, never dead) and **neutral militias** (35 % most contested towns start with 3-4 armed locals who join the side that treats the area best — loyal/Low-tax/clinic/home turf/no collateral — or turn on whoever angers/shoots them). Report `orch/reports/infra-militias.md`, test `orch/infra-test.mjs`, shots `orch/shots/infra-militias/`. Sim change → servers-live PR.
## 2026-11-06 — units-new (orch/units-new, Sonnet 5.5, scheduled)
Call-In Reinforcements power (K; $1200 + 1 point; same platoon for all nations; AI uses it), flares/chaff decoys with refill at the airfield, Fly low order (SAM-proof, gun-vulnerable), counter-battery map ping, drone swarm target spreading. Landers, airlift, counter-battery radar and drone swarms already existed. Not done: swarm pack, AI air assault, shoot-and-scoot, screenshots. See orch/reports/units-new.md.

## 2026-11-06 — atmosphere (orch/atmosphere, Sonnet 5.5, scheduled)
Abdullah's 11-05 18:47 picks. Shipped: day/night cycle is now a smooth blend (day → dusk → night → dawn → day over 1200 s, lighting, shadows, sky, fog and grade interpolate; sim vision follows the same deterministic clock), mid-battle weather is seeded (same for every player) and announced ~25 s ahead ("Forecast: sandstorm rolling in…"), night vision (green, grain, bloom) and white-hot thermal view on key N / button when it is dark (visual only, same visible units), subtle depth of field when zoomed close on High, and an after-action map on the end screen (territory + front line over time, town captures, revolts, big fights, strikes, slider + replay). Not done: god rays, shoreline foam/reflections, extra PBR, lingering smoke, mud (needs real-maps seasons). See orch/reports/atmosphere.md.

## 2026-11-06 — real-maps (orch/real-maps, Sonnet 5.5)
Abdullah 2026-11-05 18:43 picks: real-place maps + seasons. Shipped 6 new 4-fold-symmetric maps in `src/02b-realmaps.js` (Donbas Steppe, Golan Plateau, Korean DMZ: Iron Triangle, Lebanon: Beqaa and Chouf, Yemen: Tihama and Highlands, Strait of Hormuz: Island Gate; 2-6 / 2-4 players) and **Seasons** for every map (lobby row Summer / Autumn mud / Winter snow / Map default; rides in the tens digit of the weather value `w`, so host, clients, Cloudflare and checkpoints agree; off-road mud slows wheels x0.72 / tracks x0.9, snow slows infantry x0.84 / wheels x0.88 / tracks x0.94, roads never; mud = dark ground + puddles + orange leaves + rain, winter = the snow theme). Fairness: mapfair static + bandfair + 122 AI battles (no position significant except Tihama 2p, p=0.009 over 12 games, watch list). Report orch/reports/real-maps.md, pictures orch/shots/real-maps/ (`orch/realshots.mjs`), `orch/headless.mjs` SIM_FILES now includes 02b-realmaps.js (server build uses it too).

## 2026-11-06 navy2 (Sonnet, scheduled helper)
Shipped Abdullah's 2026-11-05 18:49 naval picks: submarine stealth/sonar (hovering heli dipping sonar, active ping button/E, 6 s reveal on firing, contact markers on map + minimap), naval mines (minelayer F+click, hidden until swept/sonar, minesweeper clears, minimap markers, AI uses both), fast attack craft swarms for every nation with warship CIWS counter. New `src/03d-navy2.js`, `src/06c-navy2view.js`, test `orch/navy2test.mjs`, report `orch/reports/navy2.md`, shots `orch/shots/navy2/`. Sim change: needs servers-live deploy.
- 2026-11-06 savegame (Sonnet 5.5, orch/savegame, scheduled): save games — Esc → Save game (named slots, overwrite asks), 3-min Autosave slot, main-menu Continue + Load game (thumbnails, delete with confirm), .ww3save download / load-from-file, IndexedDB with blocked-storage message, versioned (older saves refused, never crash). Built on ckEncode/ckRestore (no second serializer); audited and fixed the checkpoint (towns, AI memory, projectiles, strikes, clocks, Conquest setup timer, squads, who-sees-whom, upgrade caches, roads, identity checks) which also hardens host migration. New gate job `save` (orch/savetest.mjs: save → fresh page → identical state hash after 2 more minutes), orch/savelib.mjs deterministic harness, orch/savediverge.mjs. Multiplayer saving left in orch/HANDOFF-savegame.md. Report: orch/reports/savegame.md.

## 2026-11-06 — command-teams (orch/command-teams, Sonnet 5.5)
Abdullah 2026-11-05 18:49 picks. Shipped: **battle plans** (key O: numbered Move / Assault / Hold steps with Auto, 10 s, 30 s or On GO triggers; Enter = go; runs client-side through ordinary orders), **battle groups** (control groups now 1-9 with names, Line/Column/Wedge formation, health + ammo bars, Select/Send/Hold/Stop), **doctrine trees** (5-perk tree per doctrine, tier 1 → two branches → capstones, nation-flavoured perk names, same numbers), **allied aid** (10% fee + 4 s delay on money, "Give units" up to 12 per 20 s), **pings & drawing** (`, . /` pings, `'` line, `;` circle, quick lines; allies only, 10 s, map + minimap), **ceasefire offers** (free-for-all only, 1-3 min; AI answers sensibly; breaking costs unrest + oathbreaker tag). New files `src/03d-command.js` (sim, also in orch/headless.mjs SIM_FILES for the server build) and `src/08g-command.js` (Command panel); `ally()` honours truces, new `sameTm()` is the strict team test; truce state in snapshot field `ct` and checkpoint `CK_G`. Test `node orch/ctshots.mjs` (CT PASS); report `orch/reports/command-teams.md`; screenshots `orch/shots/command-teams/`. Sim changed → main→servers-live PR.
