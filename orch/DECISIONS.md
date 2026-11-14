# DECISIONS — Abdullah's standing decisions, with their dates and quotes (append-only)

`CLAUDE.md` is the short current-rules file every agent reads. **This file is the full record**: every decision with its date,
his quotes and the superseded wording. Never delete or rewrite an entry; to change a decision, append a dated line at the
bottom ("YYYY-MM-DD HH:MM Abdullah …: new rule; replaces …") and update the short bullet in `CLAUDE.md`.
`orch/decisions.mjs` checks that the key decision keywords exist in one of the two files.

## Full text of CLAUDE.md as it stood on 2026-11-10 (before the split; nothing removed)

### (old title) World War 3 — rules for every agent working in this repo

Browser RTS in the style of C&C Generals Zero Hour. Live at https://abdullahhaidar5-ux.github.io/ww3/ (GitHub Pages
serves `main`). The owner, Abdullah, shares it with friends on Discord, so **whatever lands on `main` is what his
friends play next**. All development is directed by **ORCH**, the orchestrator — read `orch/ORCH.md` before doing
anything.

#### Where things live

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
`node orch/smoke.mjs` must print `SMOKE PASS` → `node orch/smooth.mjs` must print `SMOOTH PASS` (smoothness gate, runs in CI as `gate/smooth-*`; if a change is intentionally heavier, re-baseline per `orch/SMOOTH.md`) → commit `src/` **and** `index.html` (and `sw.js` + `models/` if they
changed) together. Never write `</script` inside `src/` (escape as `<\/script`). Don't touch the vendored libraries
or the `MODEL_FILES` line in `index.html` (`build.py` writes it). Add or replace a model with
`python3 orch/build.py --add-model KEY file.glb`, never by renaming files in `models/` (the name carries its hash).

#### Abdullah's standing decisions (do not reverse without him asking)

- **IT'S A WORLD SIMULATOR** (Abdullah 2026-11-06 23:03 "You need to catch on we are creating a world simulator"): the grand campaign
  simulates the real world, and every feature is designed by asking **"what would really happen?"** — never as an isolated button.
  For each feature, before building, write down and build its chain: (1) **who reacts** — AI nations by their real interests and
  alliances, populations (unrest, war support, refugees), markets (oil, trade, prices), the UN/blocs, the media; (2) **second-order
  effects** across systems (a strike → prices → stability → elections → alliances…); (3) **realistic starting state and data** for
  Nov 2026 (look it up, don't guess); (4) **counter-play** — every action has a real-world answer the other side can take;
  (5) **costs** so nothing is free power. One shared world state (GMOD rows + the one event engine), so effects compound instead of
  living in separate mini-games. Tactical battles stay balanced games; the world around them is a simulation. Anticipate what a
  player expects to follow — don't wait to be told. **If in doubt, make it realistic** (Abdullah 2026-11-07 10:23 — after a nuclear warhead was given a month-long flight: real timings, ranges, numbers and reactions always win over convenient game values; look them up). **Calibrate on real history** (Abdullah 2026-11-07 20:20–20:21 sent Wikipedia "2026" and "Human history"): the world starts from the real 2026 (orch/REAL-2026.md, sources linked) and AI states behave like history's base rates — wars are rare, start for reasons, last long and cost a lot; capitals rarely fall quickly; most regimes fall from within (economy, elites, legitimacy), not from invasion; alliances shift by interest; empires overstretch and decline. Check behaviour against those base rates, not against what is fun for a single turn. The EU4 wiki (eu4.paradoxwikis.com) is the reference for how the grand campaign's screens and mechanics work (our own art, real-world content).
- **Vision:** massive columns of infantry and vehicles in intense combat, with aircraft and drones overhead.
  Graphics pushed toward Company of Heroes / Broken Arrow realism **in real gameplay**, not just staged shots.
  Most tactical/realistic gameplay possible: flanking, cover, suppression.
- **No decorative or ambient aircraft or drones.** They were removed because they confused players. Only real,
  controllable aircraft fly.
- **Controls (Abdullah, 2026-10-28 19:11 — replaces the 2026-10-26 Generals left-click scheme):** **left-click selects**
  (drag = box select, Shift adds, double-click selects that type on screen); **right-click moves and attacks** (ground =
  move, enemy = attack), right-drag draws the infantry line formation; **F + click = attack-move** (A no longer does
  it); **W A S D only scroll the camera — no other job in any scheme** (Abdullah, 19:17; Stop = X); G+click guard, Ctrl+click force-fire, Alt+click waypoints; **Q rotates the battle camera** (Abdullah 2026-11-07 19:54/19:55: hold Q + move mouse, tap = 45° clockwise, Shift+Q counter-clockwise, Home/double-tap = north-up; view only) and **Ctrl+A selects the whole army** (was Q); left-click ground with a production building selected
  sets its rally point. After an order the units deselect (Abdullah 2026-10-30 20:54; Settings toggle keeps them selected; Shift keeps them). The old Generals left-click-orders scheme may stay as a Settings option. On PCs **the mouse stays
  inside the game window** during a battle (pointer lock with the game's own cursor; edge scrolling works; Esc or the
  menu releases it; a Settings toggle turns it off). **Command bar text is bigger and easier to read** (PC and phone).
  **Getting in and out needs no button** (Abdullah, 19:14): enter = select units, right-click your own building /
  vehicle / transport / tunnel ("enter" cursor shown); leave a building = select it, right-click the ground (everyone
  comes out and runs there); leave a vehicle = select it and right-click the vehicle itself (unload here), or
  Alt+right-click a spot (drive there, then unload); touch: tap a selected vehicle again to unload, tap ground with a
  garrisoned building selected. The Unload/Leave buttons may stay as extras.
  (Touch controls are no longer required — see "PC only" below.)
- **UI flow** (Abdullah 2026-11-06 20:14 "You can transition between windows and screens not everything has to be shoved into a single screen with big ugly button"): one job per screen or window, smooth transitions between them, Back/Esc one step back, elegant text menu items and small buttons — never cram everything onto one screen, no big ugly buttons. Applies to menus, setup, grand-map panels and the battle HUD.
- **Factions (22 live → 54; IQ Iraq and SY Syria first cut live 2026-11-06, FR France and DE Germany first cut live 2026-11-06 (nation-frde: EU-based rows, EU recorded voices shared until XTTS re-records), JP Japan first cut live 2026-11-06 (nations-new2: full data, Honshu map, voices, anthem; 3D models still stand-ins); PL, AZ, JO, KD, IT, GR, ES first cut live 2026-11-06 (nations-a1; EU retired from menus, hidden base row only)):** US, TR, IL, EU, UA, RU, IR, SA, AE, PK, IN, CN, KP, KR, EG, CU, **RS "Lebanese Shia"** (renamed from "Mountain Shias" by Abdullah 2026-11-07 19:43),
  **DW "Zaidi Shia Movement" = Yemen** (renamed from "Coffee Shias" by Abdullah 2026-11-07 19:44) (Abdullah 2026-11-05 19:44: "make sure the Coffee Shias become Yemen" (now named Zaidi Shia Movement) — DW's home, look, maps and
  grand-map region are Yemen). **Adding full nations IQ Iraq, SY Syria, JP Japan** (19:45; own units, uniforms, buildings, voices,
  anthem, equal strength) → 21; then (19:49) **15 more full nations**: GB, FR, DE, PL, AZ, JO, KD (Kurdistan
  Region, Peshmerga), TW, VN, AU, PH, BR, VE, MX, CA + (19:56) **DZ, MA, NG, OM, IT, GR, ID, AF (stylised national army only), AR, CO** + (20:37) **ES, ZA, TH, ET, LY, SD (LY/SD: stylised national armies only, no real factions), SE, KZ, CL** → **54 full nations + two fictional factions OB "Palestine Islamic Brigade" (renamed from "Olive Brigades" by Abdullah 2026-11-07 19:40; original key-and-olive-branch emblem) (Gaza urban resistance, own `gaza` rubble map, Palestinian Arabic voices stand in) and BI "Desert Islamic Faction" (renamed from "Black Desert Insurgency" by Abdullah 2026-11-07 19:43) (Syria–Iraq desert insurgents; code BI because BD = Bangladesh; at war with its neighbours, no treaties) — Abdullah 21:26, nation-obbd 2026-11-06; inspired-by only: never any real group's name/flag/emblem/slogan/leader, no terror/hostage/suicide/civilian-target mechanics, battles military vs military** (GB, AU, CA, TW, PH, VN, ID, TH, KZ, AF, OM first cut live 2026-11-06 via `NEWNAT`; voices/anthems still open; **DZ, MA, NG, ZA, ET, LY, SD first cut live 2026-11-06 (nations-b2)**; BR, VE, MX, AR, CO, CL, SE first cut live 2026-11-06 via `NEWNAT` + `src/11z-nations-a2.js`) (the **EU retires as a nation** once FR, DE and PL are live — Abdullah 19:54: its units, voices and
  the Fulda map pass to FR/DE/PL, old EU saves load as DE; on the grand map the **European Union becomes an alliance** European
  nations can join, with a joint-operations bonus), built by `orch/nation-*` helpers following the
  nations-new1/2 pattern. Every other country on the grand map is a **playable minor nation** (shared regional army/look, own
  flag/name/colours, no unique voices). The IM faction was removed on purpose. Shia factions = IR, RS, DW, RV. **RV "Iraqi Shia Brigades"** (renamed from "River Shias" by Abdullah 2026-11-07 19:42; gold shrine on Iraqi green emblem) (Abdullah 2026-11-06 21:24 "Somehow incorporate the Iraqi PMF as a faction": name River Shias, own nation in south Iraq) = fictional Iraqi Shia volunteer-brigade faction, own nation in south Iraq (Najaf, Basra, the marshes), Zealous, member of the Resistance bloc; **never** the real organisation's name, flag/emblem or leaders.
- Keep the Mountain Shias' upgrade name **"Radwan Training"** exactly as is.
- **National morale styles** (Abdullah 2026-11-05 20:01): every nation has ONE battle morale style, different styles but **equal
  power** (proven by the balance tourneys): **Zealous** (slow to break, martyr banners, fervour when comrades fall — and losing a
  cleric/officer does **not** weaken them: they stay zealous; their cost is elsewhere, e.g. they hold ground and take heavier
  losses), **Professional** (steady under artillery, rally fast near officers; heavy losses sap them more), **Home defenders** (much braver on home turf / near own towns, ordinary abroad). A fifth, lowest-morale style **Firepower-reliant** (Abdullah 20:18: UAE, Saudi Arabia "below Home defenders"; 20:22: Israel too; **India moved to Home defenders** 2026-11-06 21:33): they break sooner, especially when unsupported, balanced by stronger fire support so they stay equally strong.
  **Routing follows the morale style** (Abdullah 2026-11-06 20:12): **Zealous (IR, RS, DW, RV, KP, OB, BI) never rout** — they fight to the last, cost: heavier losses; Professional rout below 15% of the enemy's strength, Home defenders below 8% at home / 20% abroad, Firepower-reliant below 25% (`rout` in `MSTYLES`). Zealous = IR, RS, DW, **OB and BI** (Abdullah 21:29), **North Korea** (20:16; ideological flavour — political officers/party banners, not Shia motifs); **Russia and Cuba = Professional** (20:15); **China, Pakistan, Egypt = Professional; Vietnam, Brazil, Nigeria, Indonesia = Home defenders** (20:26 — no nation uses Strength in numbers now); **Jordan = Home defenders** (20:28); **Ukraine, Cuba, Egypt moved to Home defenders** (2026-11-06 21:33); **Oman = Home defenders** (20:29); **South Africa, Thailand = Home defenders** (20:40); **Strength in numbers style removed entirely** (20:41) — four styles: Zealous, Professional, Home defenders, Firepower-reliant; the full assignment is in `orch/SYSTEMS.md` (set — balance by tuning numbers, not by moving nations).
  Grand-map national morale: raised/lowered by victories & defeats, casualties & war length, losing home/holy places (capital,
  war goals, heritage sites) and short national/religious-day boosts (equal value for all); on collapse: troops start battles
  shaken, forced peace talks, coups & civil war.
- **Grand-map-only assets** (Abdullah 2026-11-05 20:58): the **Ayatollah**, the **Dear Leader**, the **Mountain Fortress** and the
  **Bunker Buster** leave the tactical (Conquest) battle and live on the grand map: Ayatollah/Dear Leader = national leader figures
  (morale/loyalty, tour provinces, Fight-it battles there start with fervour; their people clamour for war — high war support, slow war weariness, fast recruits, but long peace brings war-fever unrest; no capital-falls penalty — Abdullah 2026-11-06 08:11), Mountain Fortress = a province building that
  appears pre-built for the defender in that province's battles, Bunker Buster = a grand-map strike on fortified provinces.
  Zealous morale no longer depends on a cleric unit. Campaign missions keep working (scripted versions where a mission needs them).
  **Signature assets are unique, not copied** (Abdullah 21:02 "I don't like all countries having the same thing"): the clerical
  leader only for IR/RS/DW — **one single Ayatollah leads all three Shia factions** (Abdullah 2026-11-06 21:23; resides in Iran, IR/RS/DW in a permanent alliance while he leads them); **sub-leaders like the real world** (Abdullah 2026-11-06 23:09 "they are sub leaders" → "Make it like the real world"; fictional names, never real leaders): **RS** = a cleric **Secretary-General ("Sayyid …")** who follows the Supreme Ayatollah's religious authority — full morale link; **DW (Yemen)** = **"Leader of the Revolution" ("Sayyid …")** of a Zaydi movement — a close ally with its own tradition, so a partial morale link and more independence; **RV (River Shias)** = a **Chairman** over brigade commanders with split loyalty — some brigades follow the Supreme Ayatollah, others the senior **Grand Ayatollah of Najaf** (an independent Iraqi religious authority, a world-sim actor whose stance moves Iraqi Shia opinion, IQ stability and RV recruitment); Iran's head of state is the Supreme Ayatollah himself, the Dear Leader only for KP, the Mountain Fortress only for **IR, RS, AF, KD, DW and KP** (21:03), the **Bunker Buster only for some
  nations (US, IL, RU, CN)**; every other nation gets a *different* signature asset of its own (not a copy), and overall strength
  stays even through balancing. Table of who has what: `orch/SIGNATURES.md` (grand stage 2 writes it).
- **Mountain Shias (RS) identity** (Abdullah 2026-11-05 19:46 "make it more obvious"): unmistakably a Lebanese mountain Shia
  resistance force through content — Lebanon home, Lebanese-dialect voices, Ashura/"Ya Hussein" religious motifs, tunnels, ATGM
  teams, rocket barrages, drones, mountain forts. **Never** the real organisation's name, flag/emblem (or a close copy) or real
  leaders' names/likeness; keep the name "Lebanese Shia" (Abdullah 2026-11-07 19:43, was "Mountain Shias") and an original emblem.
- **Audio:** real, professional military audio; top-quality unit voice acting in each nation's native language,
  including war slogans like "Labbaik ya Hussein". **Music = one shared soundtrack of real recorded tracks for all 18
  nations** (Abdullah, 2026-10-27, replacing the per-nation/region scores and the synthesized latmiyas): ~10–12 free
  tracks (CC0/CC-BY credited, or public-domain military band) — menu, calm, combat, victory/defeat — switching calm ↔
  combat with the fighting; Abdullah picks the tracks from a shortlist. Nation identity = its anthem at battle start
  and on victory. Shia factions (IR, RS, DW, RV) use the shared soundtrack too; real recorded latmiyas may be added later
  if freely licensed ones are found.
- Multiplayer: up to 8 players. Never break multiplayer sync — host and clients must agree. **Battles are hosted on
  Cloudflare** (Abdullah, 2026-10-27 19:28: Cloudflare is the default and **no hosting button or wording at all** —
  19:30: "just host": the Multiplayer menu has one "Play online" button that joins an open battle or starts a new one on
  Cloudflare with the player's map/nation; friends join from the list or by invite code/link); hosting in a player's browser remains only as the automatic fallback (free-plan limit, busy, unreachable, or
  the server going away mid-match). Cloudflare battles run the copy of `src/` built into the
  server at its last deploy, so **whenever a ship changes the simulation (03-sim, 01-data, 02-map, 07*) open a
  `main → servers-live` PR for Abdullah to merge** (one tap; deploy runs from GitHub).
- **PC only — phones abandoned** (Abdullah, 2026-11-04 20:13 "Forget phones entirely", 20:16 "Abandon phones";
  replaces the 2026-10-26/29 phone rules). Design, look and performance target = PC (mouse + keyboard). No phone
  constraints, no phone/touch tests (gate `touch` and `smooth-phone` removed); old phone code may stay but needn't be
  maintained. Must stay smooth on PC (smooth-pc, smooth-mp gates).
- **THREE GAMES** (Abdullah 2026-11-07 21:38 "Let's have four distinct versions. Campaign. Conquest. And battle. Battle works like Generals." then "Sorry 3"; **replaces "Conquest is the only game mode" below**): the main menu's big items are **Grand campaign · Conquest · Battle**, each its own game; Missions and Tutorial stay as smaller items below. **Battle = C&C Generals Zero Hour rules** (the old Classic ruleset, `G.battle`, flag `battle:1` in `newGame`): start with a Command Center + a dozer + a supply truck, money from supply trucks hauling to the Command Center / Supply Depots, build power/barracks/War Factory/airfield, tech tree applies, generals' powers from rank, no town taxes/unrest/setup phase/supply-line roads, win = destroy every enemy building. Conquest and the grand campaign are unchanged; the online lobby has a Conquest/Battle switch (`bm` in the start message, also through the Cloudflare server). Guard: orch/decisions.mjs.
- ~~**Conquest is the only game mode**~~ (superseded above) (Abdullah, 2026-11-04 19:49): same full base + money for all, everything
  unlocked, income from taxing towns/hamlets you hold (tax rate, unrest, revolts, civic buildings — "High tax in safe
  rear towns, Low tax on the front"), fair upgrades/powers/missile strikes, win = destroy the enemy base. ~$10,000 start,
  ~90 s no-fire setup. Classic is removed from menus/lobby; the old story missions + tutorial stay; the story missions are named **"Missions"** in the menu (Abdullah 2026-11-06 05:58) so "campaign" only ever means the grand campaign — main menu: Grand campaign · Conquest · Missions · Tutorial. Spec/progress: `orch/reports/conquest.md`,
  `orch/HANDOFF-conquest.md`.
- **Supply lines are in** (Abdullah, 2026-11-04 20:16 "Forget the rule about no supply lines"; replaces 2026-10-29):
  supply runs on roads you build (convoys, cut-off towns, forward depots).
- **Grand strategy layer** (Abdullah, 2026-11-05 19:16–19:20): the RTS battle is one layer under a Total War / EU4-style
  grand map where you run your empire and choose to fight each battle live ("Fight it") or auto-resolve; results flow back.
  **Real time with pause, EU4-style** (Abdullah 2026-11-06 17:58, replaces "simultaneous turns": days tick, speeds 1–5, pause; battles pause the map; orders while paused; still deterministic from state + timestamped orders + seed; mechanics mirror EU4 — power points, ideas, stability, cores, estates, development, trade nodes, force limit, tradition; specs in `orch/PLAN-SAT.md`); **the map is the real world, proportional** (Abdullah 2026-11-07 06:55 "make the grand map size and countries proportional", "Brazil is really off": real coastlines/borders from Natural Earth, one true projection, no magnified regions — detail comes from more, smaller provinces where it matters); **a world map with detail where it matters** (19:41, replaces "three theatres": detailed provinces around all full nations (21 incl. IQ/SY/JP; DW at home in Yemen) — Middle East & North Africa, Europe/Russia, East Asia, South Asia, North America & Caribbean — oceans as big sea lanes linking them); **solo vs AI empires first,
  friends multiplayer later** (turn resolution must be deterministic from state + orders + seed); **empire-level economy
  lives on the grand map** (war bonds, upkeep, fuel, manpower, oil market, crises… — not inside battles). Conquest battles
  stay the tactical layer. **Fight-it battles start with exactly the units you have on the grand map** (Abdullah 2026-11-05
  21:22): every army in or next to the province brings its real units (same types, counts, health, veterancy, ammo/fuel, general as
  hero); no free Conquest base or $10,000 in campaign battles — the defender also gets the province's own garrison, buildings
  and forts; no building new units in the battle (Abdullah 2026-11-06 "Army only") — armies next door arrive as reinforcement waves; survivors, damage and veterancy go back to the map, the dead are
  gone. **Battles mirror the grand map** (Abdullah 2026-11-06 08:09 "full mirror"): the Fight-it map is generated from the province (terrain, coast, rivers, forests, roads, town positions; real-place maps where they exist) and its towns match exactly both ways (names, size, owner, loyalty, buildings, damage). **Air & supply in campaign battles** (Abdullah 2026-11-06 08:08): jets come as limited sorties from grand-map airfields/carriers in range; **large drones that need a runway (MALE/strike types like TB2/MQ-9 class) also fly from airfields as sorties; long-range one-way attack drones (Shahed-type) launch from ground racks — truck-mounted mobile launchers and fixed launch sites in a province, no runway needed, ~2,000 km range** (Abdullah 2026-11-07 21:12 "Make drones available from air fields, isn't that more realistic"); helicopters and small tactical drones (quadcopters, FPV, team-launched loitering munitions) travel with the army; ammo/fuel = the army's grand-map stock, resupplied by trucks from the map edge it entered along roads (cut roads starve units; captured towns = forward supply). Standalone Conquest battles keep the normal equal start. **Grand campaign start is realistic** (Abdullah 2026-11-06 17:53): real economic/military gaps (not equalised), real-world alliances, real opening conflicts, armies on real fronts + real overseas bases/fleets — spec "REALISTIC START" in GRAND-PICKS; the tactical "equally strong" rule still governs unit balance. Design/stages: `orch/reports/grand-strategy.md`; Abdullah's extra picks per stage (every grand stage
  helper must build its section too): `orch/GRAND-PICKS.md`. **Grand-map multiplayer battles** (19:30): if
  EITHER side wants "Fight it live", it's live (an away player's side is played by the battle AI); auto-resolve only if both
  pick it; others keep planning and can spectate, an ally in the war can join a live battle as co-commander, and any empire in the war can send air/missile/drone support into it from its grand-map stocks (Abdullah 2026-11-06 07:51); several battles in a turn run at the same time; the battle time limit is the host's pick at campaign creation (30 / 60 default / no limit, then auto-resolve from where it stands) and waiting players can vote to end a battle early (Abdullah 2026-11-06 07:56). **Grand map look = a Total War-style 3D campaign map** (Abdullah 2026-11-06 08:04: painted 3D terrain, forests, small 3D towns, each army = one general figure with a big national flag, name banners, unit cards at the bottom; modern-war theme, original art — spec in GRAND-PICKS "Stage 5 — THE LOOK"). **Art bar (Abdullah 2026-11-06 16:59): the grand map must look like a $60 studio game — `orch/ART-BAR.md` (checklist + self-scoring); keep iterating until it passes.** Grand campaigns live on
  Cloudflare; battles stay cloud-first with the automatic strongest-PC fallback (19:27).
- **Three live copies:** GitHub Pages (`main`), Cloudflare Workers `ww3` at https://ww3.abdullah-haidar5.workers.dev
  (Abdullah connected it 2026-10-26; since 2026-10-28 `.github/workflows/deploy-site.yml` also sends it from `main` on every
  push, status `deploy/site`, because Cloudflare's own builder got stuck — nothing to do at ship except check it serves the new version), and the claude.ai artifact (Qt3bimPhr31eZEUpqndGUi, republish
  per `orch/ARTIFACT.md`). Everything in the repo is served publicly by both Pages and the `ww3` Worker.
- **Targets (Abdullah, 2026-10-28 18:33):** a big battle shows **~300 units on screen** (all sides) and stays smooth;
  phones may draw far-away units simpler. **Unit voices:** every nation gets native-language lines now with the best
  free computer voice available — no real human recordings (Abdullah, 18:36: "forget the real recordings"). **Voices must sound natural,
  not robotic** (Abdullah, 19:12) **and tough** (Abdullah, 2026-10-29 19:01: deep, gritty, hard-edged combat soldiers, not
  calm narrators; 20:36 after hearing the first tough pass for RS/DW/IR: "Tougher" — deeper, barked/shouted combat lines, grittier radio, still clear and human; 2026-10-30 06:08 he approved the second tough pass ("tough2", orch/voices-tough) as the level for all 18): use an expressive neural voice (XTTS-v2 for every language it covers — en, ar, tr,
  ru, zh, ko, hi/ur, es, fr, de; non-commercial licence accepted for this free game, as MMS already is) with radio
  treatment; Piper/MMS only where nothing more natural exists (fa, he, uk) and then the best-sounding option found. **Weapon/explosion sound: cinematic and
  punchy**, like a war film. **AI Hard = smarter tactics only, no extra money**; **all nations (18, soon 21) about equally strong** in Conquest's default **Balanced** mode — a lobby toggle **Realistic** (Abdullah 2026-11-06 21:31) makes fire support follow real-world power tiers instead; the grand campaign is always realistic.
- **Priorities (Abdullah, 2026-10-28 18:34):** his group plays the **Shia factions (IR, RS, DW, RV) most** — do their voices,
  uniforms and buildings first, in a **realistic military** style (IRGC/Hezbollah-style fatigues, Middle Eastern
  compounds and bunkers). The game targets **PC** (see "PC only"). Biggest pain:
  **looks and performance** — better looks only where it stays smooth. Next focus after current work: **graphics
  realism**. When something visible ships, ask Abdullah in the report to try one specific thing for 2 minutes on PC
  (with the link).
- **Maps (Abdullah, 2026-10-29):** a little bigger than before (room to flank), maps for every player count, and **every
  map fun and fair**: symmetric starts and resources, at least two real attack routes, something worth fighting over,
  proven by AI-vs-AI win rates per start position. Any new or changed map must pass that check.
- **Art is free only** (Abdullah, 2026-10-26): CC0 or CC-BY models/textures/sounds, every author credited in the menu
  credits; no paid assets, no ripped game assets.
- Abdullah reads updates on his phone: short summaries, and send screenshots/clips as links or images that open on
  a phone (attached video files didn't open for him).

#### Ground rules for agents

- **RIGHT NOW (2026-11-10, remove this bullet when main is green again):** (1) The cloud sandboxes are too slow to run `orch/smooth.mjs` / `orch/grandsmooth.mjs` (they time out or fail on unchanged main) — do NOT conclude anything from a local smooth run and do not stop because of one: run the gate on GitHub's runners with `orch/cigate.sh` (pushes your commit to `gate/<sha>`, waits for the `gate/*` statuses). (2) `main` at 3364ee9 is RED on six gates in CI (run 42758865781): `gate/smooth-mp`, `gate/decisions`, `gate/tutorial`, `gate/grand`, `gate/grandlive`, `gate/cfclient`. Owner of making main green: branch `orch/greenK` — nobody else fixes those six. Until they are green: other lanes may ship a change only if their own `orch/cigate.sh` run shows NO failing gate beyond that list (and none of those six fails in a new way because of the change); **look/visual changes do not ship to main until `gate/smooth-mp` is green** (Smooth first) — keep them on your branch, ready to land.

- **Smooth first** (Abdullah 2026-11-07 14:11 "Game is lagging", 14:15 "Make sure things stay smooth"): every visual change must keep `gate/smooth-pc`, `gate/smooth-mp` and `gate/grandsmooth` green — run `node orch/smooth.mjs` (battle) and the grand smoothness test locally **before** pushing any look change; new props/decals/labels must be instanced or merged per material, never one mesh per object; never raise a budget or re-baseline to make a look change pass. If a smoothness gate is red on main, **all look work stops** until it is green again (the lane that broke it fixes it first).

- **A decision is done only when its leftovers are gone** (Abdullah 2026-11-06 23:16 "Be smarter" — after finding a leftover End turn button and Ayatollah button): when you ship or change one of Abdullah's decisions, grep and play-test for **every trace of the old way** (buttons, hotkeys, menu items, tooltips, encyclopedia/what's-new text, AI build lists, tests, saves) and remove it in the same ship, then add a guard assertion (orch/smoke.mjs or orch/decisions.mjs) so it can't come back. Think like the player who'll open the game next.

- **GOAL: a $75 studio game by Sat 2026-11-07 20:00 Chicago** (Abdullah 2026-11-06 18:02 "centralizing and becoming faster. Kaizen afterwards"): all work runs in the four lanes of **`orch/PLAN-SAT.md`** (one owner per file, one central prioritized list); Saturday's goal is a **Middle East vertical slice** at full quality (Abdullah 18:52; rest of the world just works); no other helpers until the deadline except the cheap Haiku **janitor** (keeps BRIEF.md/ROADMAP/PLAN-SAT ticks tidy and writes Abdullah's status).
- **Kaizen** (Abdullah 2026-11-06 17:15 "faster and more efficient, kaizen, non-stop iterations"): read **`orch/BRIEF.md`** first (one-page state of the game, kept fresh by the kaizen loop) instead of re-reading many reports; follow `orch/KAIZEN.md` (measure → one small high-value change → prove → ship → log).
- **Usage governor** (Abdullah 2026-11-06 17:18 "won't break usage but still occur constantly"): loops obey `orch/BUDGET.md` — max 4 helpers at once (loops back off when busy), max 12 iterations per loop per day, self-start only when quiet, stop cleanly on rate limits.

- **DEADLINE Saturday 2026-11-07 20:00 Chicago (02:00Z Sun)** (Abdullah 2026-11-06 15:52 "this needs to be done by Saturday 8 pm, think of usage"): everything ships by then. Ship what is green in small pieces as you go; after Sat 18:00 Chicago start no new scope — finish, ship, or write the HANDOFF; never leave main broken. Prefer the cheapest approach that meets the spec; skip optional extras ("if time allows") when behind.

- **Grand stages chain** (Abdullah 2026-11-06 "chain the stages"): if your branch is `orch/grand1`…`orch/grand7`, `orch/grand4b` or
  `orch/integrate2`, follow `orch/CHAIN.md` — its FIRST check before any other work, its LAST step (start the next stage) at the end.

- **One system per idea** (Abdullah, 2026-11-05 19:34 "two militias — fix that"): before building, read `orch/SYSTEMS.md`, find
  the owner of your idea and extend it; never add a second system for the same job (add a row if it's new). New sim state goes
  into the checkpoint (`src/07b-ckpt.js`) so saves and host migration keep working; new hotkeys go in the one key table.

- Work only in your squad's files unless ORCH assigned otherwise; parallel agents share one repo.
- Small, verifiable changes. Describe each change in plain words a player would understand.
- No new runtime dependencies from other hosts beyond what's already used (Three.js r186 bundled via `orch/three/vendor.mjs`, PeerJS bundled).
- Never force-push `main`, never delete branches or files you didn't create, never rewrite history.

#### Saving usage (Abdullah, 2026-10-28: move fast without burning through his usage limit)

Every token an agent reads counts against Abdullah's plan. Work like this:
- **Never read `index.html`** (2 MB, generated) or anything in `models/`, `mus/`, `vo/`, `sfx/`, `orch/out/`. Check the
  build with `python3 orch/build.py --check`, not by reading the output.
- **Never read a whole `src/` module.** They are 60–280 KB each (`04-gfx.js` alone is ~70k tokens). Find the spot with
  `grep -n` and read only that range (Read with offset/limit, ~100–200 lines).
- **Keep command output short:** pipe tests and builds through `| tail -20` (or grep for PASS/FAIL); never print whole
  gate logs, only the failing excerpt. Use `git log --oneline -10`, `git diff --stat` before full diffs.
- **Read only the top of `orch/BACKLOG.md`/`LOG.md`/`HISTORY.md`** (head -60) unless the task needs more.
- **Test smart:** quick local checks while working; run `orch/cigate.sh` (all 18 tests) once when done and once after a
  fix, not after every small step. Wait on it with one blocking command, not repeated polling.
- **Pick the cheaper model for simple work** (Abdullah, 2026-10-28 18:32: "mix models"): when dispatching helper agents,
  use `model: "sonnet"` for finding/packing free assets, credits, copy/text, layout tweaks and small fixes; keep Opus
  for netcode, the simulation/AI, performance and reviews. ORCH runs every 8 h while the side-lane agents work.
- **Dispatching agents (Abdullah, 2026-10-30 22:20):** batch small requests into one agent (collect them for up to ~1 h)
  instead of one agent per request; schedule every new cloud agent ≥5 min ahead and switch its model before it starts
  (a trigger that fires before the switch runs on Opus); use the cheapest model that fits — Haiku for text/price/colour
  tweaks, Sonnet for features and fixes, Opus only for hard netcode/sim work — the full gate still checks every change.
- **Write handoff notes** (`orch/HANDOFF-<branch>.md`) when stopping early, so a restart doesn't re-explore.

## Decisions added to CLAUDE.md by other lanes while it was being split (full text, 2026-11-07 22:xx; main commits c7e510a, 6862506)

- **Zealous NEVER rout, in any form of the game** (Abdullah 2026-11-07 22:5x "these factions never rout in any form of the game"; Zealous = IR, RS, DW, RV, KP, OB, BI): no rout, retreat, flee, crew-bail-out or AI pull-back in Conquest, Battle, Missions or grand Fight-it battles (incl. "shaken" starts); a beaten Zealous army on the grand map fights to the last instead of falling back — the cost is heavier losses. Guard in orch/decisions.mjs (`fearlessT`, `msOf(..).rout===0`).

- **Signature assets are back in Conquest and Battle** (Abdullah 2026-11-07 22:38 "Keep ayatollah dear leader bunker buster and mountain fortress in conquest and battle" + "But in campaign they don't play into the battles like we discussed"): the Ayatollah (IR/RS/DW), Dear Leader (KP), Bunker Buster (US/IL/RU/CN) and Mountain Fortress (IR/RS/AF/KD/DW/KP) are playable again in standalone Conquest, Battle, Missions and the sandbox, for those nations only (`conqBan`/`sigBan` in 01-data); in grand-campaign Fight-it battles (G.grand) the Ayatollah/Dear Leader and Bunker Buster stay OUT (not buildable, not in powers, not spawned); nothing is built or bought there, and the grand map's own pre-built defender Mountain Fortress (province building) stays as designed on 2026-11-05. The old "grand-map-only" wording below describes the grand-map side only. **Leader abilities** (Abdullah 22:4x–22:58 "Think of a creative buff" → "Make the ayatollah buff cooler" → "Make the dear leader cooler as well"): ONE shared system (`src/03i-leaders.js`; state `T.ld`, action `{t:'ldr'}`, E / Shift+E): Ayatollah = Steadfast, Path of Hussein, Sermon, Call to Arms; Dear Leader = On-the-spot guidance, Unbreakable Spirit, Supreme Commander's Order, Mass Mobilization; the old "never break while he lives" aura is gone (redundant). Guard: orch/leaders.mjs.

- **Grand-map-only assets** (Abdullah 2026-11-05 20:58, partly superseded by the bullet above for Conquest/Battle): the **Ayatollah**, the **Dear Leader**, the **Mountain Fortress** and the
  **Bunker Buster** leave the tactical (Conquest) battle and live on the grand map: Ayatollah/Dear Leader = national leader figures
  (morale/loyalty, tour provinces, Fight-it battles there start with fervour; their people clamour for war — high war support, slow war weariness, fast recruits, but long peace brings war-fever unrest; no capital-falls penalty — Abdullah 2026-11-06 08:11), Mountain Fortress = a province building that
  appears pre-built for the defender in that province's battles, Bunker Buster = a grand-map strike on fortified provinces.
  Zealous morale no longer depends on a cleric unit. Campaign missions keep working (scripted versions where a mission needs them).
  **Signature assets are unique, not copied** (Abdullah 21:02 "I don't like all countries having the same thing"): the clerical
  leader only for IR/RS/DW — **one single Ayatollah leads all three Shia factions** (Abdullah 2026-11-06 21:23; resides in Iran, IR/RS/DW in a permanent alliance while he leads them); **sub-leaders like the real world** (Abdullah 2026-11-06 23:09 "they are sub leaders" → "Make it like the real world"; fictional names, never real leaders): **RS** = a cleric **Secretary-General ("Sayyid …")** who follows the Supreme Ayatollah's religious authority — full morale link; **DW (Yemen)** = **"Leader of the Revolution" ("Sayyid …")** of a Zaydi movement — a close ally with its own tradition, so a partial morale link and more independence; **RV (River Shias)** = a **Chairman** over brigade commanders with split loyalty — some brigades follow the Supreme Ayatollah, others the senior **Grand Ayatollah of Najaf** (an independent Iraqi religious authority, a world-sim actor whose stance moves Iraqi Shia opinion, IQ stability and RV recruitment); Iran's head of state is the Supreme Ayatollah himself, the Dear Leader only for KP, the Mountain Fortress only for **IR, RS, AF, KD, DW and KP** (21:03), the **Bunker Buster only for some
  nations (US, IL, RU, CN)**; every other nation gets a *different* signature asset of its own (not a copy), and overall strength
  stays even through balancing. Table of who has what: `orch/SIGNATURES.md` (grand stage 2 writes it).

- **Targets (Abdullah, 2026-10-28 18:33):** a big battle shows **~300 units on screen** (all sides) and stays smooth;
  phones may draw far-away units simpler. **Unit voices:** every nation gets native-language lines now with the best
  free computer voice available — no real human recordings (Abdullah, 18:36: "forget the real recordings"). **Voices must sound natural,
  not robotic** (Abdullah, 19:12) **and tough** (Abdullah, 2026-10-29 19:01: deep, gritty, hard-edged combat soldiers, not
  calm narrators; 20:36 after hearing the first tough pass for RS/DW/IR: "Tougher" — deeper, barked/shouted combat lines, grittier radio, still clear and human; 2026-10-30 06:08 he approved the second tough pass ("tough2", orch/voices-tough) as the level for all 18): use an expressive neural voice (XTTS-v2 for every language it covers — en, ar, tr,
  ru, zh, ko, hi/ur, es, fr, de; non-commercial licence accepted for this free game, as MMS already is) with radio
  treatment; Piper/MMS only where nothing more natural exists (fa, he, uk) and then the best-sounding option found. **Weapon/explosion sound: cinematic and
  punchy**, like a war film. **AI Hard = smarter tactics only, no extra money**; **all nations (18, soon 21) about equally strong** in Conquest's default **Balanced** mode — a lobby toggle **Realistic** (Abdullah 2026-11-06 21:31) makes fire support follow real-world power tiers instead; **Realistic is also a realistic start** (Abdullah 2026-11-07 22:5x "Does conquest have realistic start?" → "Yes but keep the game fair"): each nation starts like its real 2026 military but with EQUAL win chance through asymmetry — big powers: richer, a high-tech start (tanks, AA), more air/fire support, but costlier/slower production and income upkeep; small nations and Zealous factions: many cheap infantry/AT, faster recruitment, cheap fortifications and ATGM/drone/rocket teams (`REAL_TIER` columns bt/up/fort/atg/st; proven by `node orch/tourney.mjs --real --pairs …`, results in orch/reports/realstart.md); the grand campaign is always realistic.

## Log of changes after the split

- 2026-11-10 loadF: CLAUDE.md split; this file created. 2026-11-09 22:33 Abdullah chose "All" of: faster loading (grand campaign loads on demand), automatic server updates, shorter helper rules.
- 2026-11-09 Abdullah said **yes** to automatic server updates: a GitHub Actions workflow moves `servers-live` to a main commit when all gates are green and it changed simulation files (orch/AUTODEPLOY.md); replaces "open a main → servers-live PR for Abdullah to merge". Kill switch: orch/AUTODEPLOY = off.

- **Iran voices stay as they are** (Abdullah 2026-11-10 06:17, after listening to orch/voices-manly/ir-compare.html — current vs F5-Persian options A/B: "Keep current"). Do not replace vo/IR.mp3 with the F5-Persian options; the unused `f5fa` engine in orch/vo/render.py may stay. Re-open only if he asks or a clearly better free Persian voice appears (send him a comparison page first).

- **Smooth pass marks re-measured on GitHub runners** (Abdullah 2026-11-10 11:15, "Go", answering the proposal): the `gate/smooth-mp` marks (and the smooth-pc load-time mark) were taken on 2026-11-04 on a faster machine; on GitHub's runners the gate failed on every commit, even the root commit, so the yardstick was broken, not the game. This is the **one allowed re-baseline**: median of 5 CI runs of main (00d2a09) per metric, stored under `ci` in `orch/smooth-baseline.json` and used only when `GITHUB_ACTIONS` is set (a local machine still compares with its own top-level numbers); ratios/slack unchanged; the gate already retries once on a noisy failure. Raw runs: orch/reports/smooth-baseline-ci.md. "Never raise a budget or re-baseline to make a change pass" stays for everything else.

- **American spelling in all game text** (Abdullah 2026-11-10 18:17 "American", answering the loop's question): color/armor/defense etc. in every player-facing string; code identifiers and save keys unchanged.

- **Full throttle until Saturday** (Abdullah 2026-11-10 18:17: "New overall development style. Usage is no longer a concern. Let's go full throttle. Stalingrad!"): helper cap 4 → 8, loop cap 12 → 24/day, runners more often (campaign every 3 h, look/AI queue every 4 h, loop every 2 h). Unchanged: Smooth first, gates, one landing at a time, no force-push, safety/wording rules. Supersedes the 14:23 slow-down of the same day.

- **Fable for all runners and helpers until Saturday** (Abdullah 2026-11-10 18:20 "Consider using more of fable to speed things up", 18:21 "Move what you can to fable"): look/AI queue runner, campaign realism runner, the loop and re-fired helpers on Fable; replaces "cheaper models for simple work" (11-09) and the 14:30 move of the nightly runner to Sonnet.

- **Army Standards — one round token per army on the grand map** (Abdullah 2026-11-10 19:12 "Why not have the armies represented in a better way. Come up with something creative, clean, and intuitive. Impress me", 19:14 "Also why so many flags?", 19:17 "Go" to `orch/concepts/army-standards.jpg`): the token (flag disc, green strength ring, gold supply ring, pin, number plate, general stars; rim white = yours / red = enemy / blue = ally, the rest small and faint; shape = holding / marching / dug in / besieging / fighting; far = dots and numbers, middle = token, close = token + the real army in miniature; odds pills from the auto-resolve estimate; stacks fan out) replaces the figure blobs, shield badges and per-army waving flags. Owner: `src/13e3-gtokens.js`. Spec `orch/concepts/ARMY-STANDARDS.md`; guards in orch/grandtest.mjs ("armytokens") and orch/decisions.mjs.
- **Army Standards, finishing pass** (helper finish-tokens, 2026-11-11, from the scheduled task Abdullah set up after his "Go"): far view = dots and numbers, middle view = tokens only, close view = the token plus the small on-land figures from the believable-scale work (ONE figure system, `g3Batch` in `src/13e-grand3d.js` — the first version's second miniature system `gtkMinis` was removed); a waving flag only on the selected army; crowded tokens step apart, join their own nation's stack, and step off capital name plates (`gtkNudge`). Guards: `orch/grandtest.mjs` (at most one army marker per province at middle zoom, zero flags and figures there unless an army is selected), `orch/decisions.mjs`.
- **Fortification lines: only the Construction Vehicle builds them, and you trace them** (Abdullah 2026-11-11 19:02 Chicago: "Make it so that only the construction vehicle can build a fortification line other units just dig in" and "Make it so you can drag and trace the line"): wallOrder/`tactBuilders`/button/AI use `kind==='dozer'` only; every other digger keeps just "Dig in". The order is `{t:'wall',ids,k,pts:[x0,y0,…]}` (4–48 numbers; old x,y,x2,y2 still accepted); segments every 30 units along the path, ≤28 per order; guards in orch/smoke.mjs + orch/decisions.mjs.
- **Conquest starts with the full base** (Abdullah 2026-11-11 19:46 "I started conquest without a full base and 10k"; enforces 2026-11-04 19:49 "same full base + money for all"): at second 0 every team has HQ + Barracks + War Factory + Supply Depot + Airfield (+ Shipyard near water) already built and $10,000 (Balanced); `conqBase()` in 03-sim.js, guard in orch/decisions.mjs. Battle keeps Command Center + dozer + supply truck. (There is no player-built power building in this game; power is the map's power plants.)
- **Battle has no supply lines** (Abdullah 2026-11-11 19:41 "Also for battle take out the concept the supply lines and the dotted roads"; Conquest keeps supply lines on roads, 2026-11-04 20:16): in `G.battle` nothing road-based is drawn (minimap, ground), no Supply overlay/key L/"Supply OK" chip, no out-of-supply status or healing penalty; money = supply trucks + oil derricks. Ammo refill circles are the ammo rule, not supply lines, and stay. Guard in orch/decisions.mjs.
- **Conquest road colors** (Abdullah 2026-11-11 20:12 "The road color should be more intuitive. For example a neutral road is one color. Captured road one color. Enemy road another color.", 20:13 "Green for your team"): roads are green (yours + allies) / red (enemy) / light gray (neutral) by territory owner, dashed = cut off, same on minimap and ground, dots take the owner's color, color-blind palette via `ID_CB`; code `lgRoadSets()` in 08c-logi.js.
- **Rally flags** (Abdullah 2026-11-11 19:45 "Once I click this should disappear"): the rally flag shows only while a production building is selected (+1.5 s flash when set), one flag per army; guard in orch/decisions.mjs.
- **Grand campaign paused, moved to Extras** (Abdullah 2026-11-13 06:15 Chicago: "Can we pause campaign for now and just finish developing conquest and battle"; 06:17: "Move campaign to settings and extras for now"): Single player lists Conquest and Battle (then Missions, Tutorial, Load game); Multiplayer offers Conquest and Battle only and hides campaign rows from the open-games list (campaign invite links still join); the campaign opens from Extras → "Grand campaign (preview, paused)"; Continue and the menu background prefer the newest Conquest/Battle save. Supersedes the campaign parts of the 2026-11-07 MENU STRUCTURE entry. Guard: orch/decisions.mjs.
- **Battle has its own maps** (Abdullah 2026-11-11 19:40 and 20:14, as passed on in the battlemaps helper brief, wording not quoted: the Battle game gets its own small Generals-style maps with supply sources and oil derricks; many more maps of all sizes and themes — naval-heavy, mountains, deserts, cities; Conquest and campaign maps stay unchanged): Battle maps are plain data in `src/02d-battlemaps.js` (`BMAPS`, key `bm_<id>`), an extension of the map editor's custom-map format that goes through the same loader (`cmCanon`/`cmBuild`, one map system); the author writes one part of the map and the kit mirrors it, so starts and resources are symmetric by construction. A map is listed only if `node orch/battlemapfair.mjs` passes it (structure + AI-vs-AI win rate 40-60% per start; report `orch/reports/battlemaps.md`). Original names and layouts only, never copies of another game's maps. Guards in orch/decisions.mjs.
- **Infiltrator looks like a civilian spy** (Abdullah 2026-11-11 18:23 "Make them look like actual spies"; shown three outfits, 2026-11-12 12:45 "Go with B"): the Infiltrator is drawn in plain clothes — a long plain coat with a belt, a red scarf, binoculars at the eyes — no rifle, helmet or camouflage; a hidden spy shows its owner a small eye. Only this one look exists (outfits A and C removed); guard `orch/decisions.mjs` "spy look".
