# Roadmap — progress of all the big work

The Command Board's **Progress** section is built from this file (`orch/board.py`). ORCH updates the status tags
every cycle (ORCH.md step 9); anyone who ships or starts an item updates its line here in the same commit.

Status tags: **[done]** shipped and live · **[doing]** being built or tested right now · **[next]** queued, nothing
blocking · **[you]** waiting on a decision or action from Abdullah · **[paused]** paused by Abdullah · **[todo]**
planned, not started. Keep each line short and in player terms. Plan doc for the overhauls:
https://claude.ai/artifact/QDp8ykMpW6fwW7YRn4jqUZ

## Grand strategy (Abdullah 2026-11-05 19:16 — the world-map layer over the RTS; design: orch/reports/grand-strategy.md)
- [done] S1 map, provinces, armies, simultaneous turns, Fight it / Auto-resolve battles with exactly your units, basic tax + unrest, save, Grand campaign menu (Missions renamed)
- [done] S5a 3D Total War-style campaign map: real coastlines + rivers (Natural Earth), painted relief with mountains/snow, sea shader, forests/palms, 3D towns, one soldier + big national flag per army (ships at sea), move/attack arrows, name banners, army cards, minimap, 8 map modes, turn report card, battle smoke (2026-11-06)
- [todo] S5b more living map: convoys, missile trails, burning cities after strikes (hooks ready: `GC.prov[i].burn`), GLB soldier models per nation
- [done] S1b battles mirror the grand map: every province generates its own battle map (terrain, relief, sea side, river with bridge + ford, forests, roads, 2+ routes, army enters from its edge); towns, owners, unrest, tax, buildings and damage appear in the battle and go back
- [done] S2 empire economy: province buildings (11 kinds, appear in that province's battle), autonomy, city tiers + focus, trade routes + merchants + embargoes + sanctions/smuggling, chokepoint closing, oil market + fuel/refineries, food + rationing, power grid, manpower, progressive upkeep, war bonds, central bank (lootable), total war, deterministic crises, salvage, bombing/loot/scorched earth, AI uses all of it; orch/SIGNATURES.md (54 nations); armies' ammo/fuel from the empire stock
- [done] S3 military (grand3, `src/13h-grandmil.js`): fictional generals with 4 equal-value traits that level up and can be killed/captured and fight as the hero unit in Fight-it; HOI4-style fronts (Hold / Push / Counter-attack, AI-assisted, player override); missile / air-raid / drone strikes from empire stocks with air-defence interception; fleets (ships as armies) with sea control, naval battles (auto or live), port blockades, mines and escorts. Not done: fort zones, encirclement and sieges, nation-signature M assets (SIGNATURES.md), 3D strike trails
- [todo] S4 events, minor nations, seasons, diplomacy and peace talks, research, cabinet, national missions, heritage and holy sites
- [todo] S4b diplomacy and government (call to arms, trust, great powers, reforms, prestige, hegemons)
- [todo] S5 3D world map, living map, turn news, map modes
- [todo] S6 fog, spies, proxy wars, insurgency, war weariness, coups, succession, scenarios, disasters, factions at home
- [todo] S7 friends multiplayer (turn resolution is already deterministic)

## Conquest (the only mode — Abdullah 2026-11-04)
- [done] Towns and hamlets pay tax; you set Low / Normal / High / Extortionate per town; angry towns revolt (rebels) — High tax in safe towns, Low at the front
- [done] Hamlets (small villages) on every map, placed fairly; minimap shows towns, hamlets, tax, unrest, rebels, alerts
- [done] Everything unlocked, $10,000 each, 90 s no-fire setup phase, territory pays the bills, win = destroy the enemy base
- [done] Fair missile strikes: minimum minute 8, costs money, 40% building cap, nation-named missile defence with visible intercepts, launch site exposed + countdown on the minimap
- [done] Bigger 2-4 player maps (+27%), town bands (rear villages / middle hamlets / centre prize town), roads with +15-30% speed, fair-start check (orch/bandfair.mjs)
- [open] 3-player maps: the isolated start wins ~55% (close pair + loner) - needs new 3p layouts or AI tuning
- [done] Fair upgrades (same tier = same cost for every nation), powers ranked by XP + calm-town command points, tutorial covers setup/towns/tax/unrest/civic, map-editor hamlets, AI raids rear towns
- [done] Logistics: supply runs on roads (build roads, CUT OFF towns, cratering, convoys + ambushes, territory + front line)
- [done] Logistics 2: forward depots + ports join the road network, mines + checkpoints (tolls), bridges blow / rebuild / pontoons, port blockades, airlift, AI uses it, tutorial step, road look per theme
- [next] Fairness proof: 18-nation tourney + start positions + tax-policy comparison (needs a bigger machine)

## Battlefield (Abdullah 2026-11-05 18:55)
- [done] Digging in: infantry or Construction Vehicles lay sandbag / trench lines by dragging, pieces shared between builders, trenches snap into networks, duckboards + sandbag parapets, AI squads dig lines when no dozer is idle
- [done] Collapsing buildings: three damage stages (cracked, smoking, burning), garrison bails out at the last stage, dust cloud on collapse, rubble cleared by Construction Vehicles (auto or the Clear rubble button)
- [done] Dams and floods: Twin Rivers + Fulda Gap each have two mirrored dams; shell one and the valley floods for 3 minutes (slows everything, closes bridges, drowns infantry); AI uses it
- [done] Medics and wounded: bullet-killed infantry go down wounded (red-cross icon, 32 s), Combat Medics (all nations) revive them with veterancy, squad mates drag them to cover, HQ/Depot aid stations, AI builds medics

## Phones and interface
- [done] Phones can play: reachable build buttons, two-finger pan and pinch zoom, touch placement
- [done] No install buttons: just open the link and play
- [done] iPhone sound works, even on silent, with a Sound check in Settings
- [done] Faster battle start on phones + loading screen with each nation's quotes
- [done] Generals-style bottom command bar replacing the side menu
- [done] Generals mouse controls + Mouse settings
- [done] Mouse: left-click selects, right-click moves and attacks; mouse stays inside the game window (2026-10-29)
- [done] Phone held upright: the build grid shows 4 whole columns, nothing cut off
- [done] Phone controls: drag scrolls the map, hold+drag selects or draws a line, tap gives orders with a marker, touch command strip, first-time guide

## Multiplayer in the cloud
- [done] Game live on Cloudflare (ww3.abdullah-haidar5.workers.dev), updated automatically
- [done] Matchmaking + relay servers with automatic fallback (built and tested; switched off until they're live)
- [done] Servers live on Cloudflare (ww3-servers), approved by Abdullah; multiplayer uses them (game list, relay for blocked networks)
- [done] Battles run on Cloudflare: one Play online button, optional passwords, quiet fallback to a player's browser (Abdullah merged 2026-10-28)
- [done] Fix: stale enemy soldiers left on a player's screen
- [done] Rejoining mid-battle restores your army, fog and money; short freezes no longer drop anyone; host takeover waits for a slow host
- [done] Only one player takes over when a browser host drops; no endless 'Connecting…' hang

## Audio and music overhaul
- [done] New soundtrack: 14 real recorded tracks for every nation (calm while building, combat when fighting); each nation's anthem at start and on victory
- [done] Authentic Middle Eastern music: Iran, Mountain Shias, Coffee Shias, Saudi Arabia, UAE, Egypt (real maqam/dastgah, regional rhythms, recorded percussion)
- [done] Asian music: Pakistan, India, China, North Korea, South Korea (regional instruments and rhythms)
- [done] Region-specific music for the other 7 nations (US, TR, IL, EU, UA, RU, CU) — all 18 done
- [doing] Military band layer: each nation's public-domain US Navy Band anthem recording (US, EU, IL, UA, CU, IN, CN, EG, PK, KR, RU done; TR free in 2029)
- [todo] Recorded weapons, explosions, engines and aircraft (near and far, echo per theatre)
- [todo] Battlefield ambience per map and weather
- [done] Native-language unit voice lines for all 18 nations, incl. new "under fire", "unit lost", "building ready"
- [done] Natural-sounding neural re-voicing for all 18 nations
- [todo] Real latmiyas added to the shared soundtrack if freely licensed ones are found
- [todo] Proper mix: voices duck music, distance fade, even loudness

## Graphics overhaul
- [done] Phase 1 Foundations: models in separate files; 3D engine upgraded (Three.js r186)
- [doing] Phase 2 Real models: real tanks (Abrams, Merkava, KF51 Panther), trucks (M35, Ural), SPGs (G6, Msta), Humvee, transport helicopters (UH-60, Mi-8), plus T-84 Oplot (UA), T-72 (IR), T-62 (KP), T-55 (CU), Leopard 2 (TR) live; next: infantry, buildings
- [done] Phase 3 Terrain and world: real ground textures, gravel roads, wet shores, surf, lasting craters (PC; phones keep the light look)
- [done] Phase 4 Light and effects: rolling fireballs, dust, smoke columns, lit muzzle flashes, theatre colour, steady shadows
- [done] Realistic muzzle flashes, sparks only off armour, sandbagged defences
- [done] Realistic vehicles: battle damage smoke/fire, nation kit (slat armour, cope cages, ERA, nets, jerrycans), real air force paint, Shahed/TB2/MQ/Lancet drones, ship details (2026-11-04)
- [todo] Big explosions: replace the flat yellow first-instant ball
- [doing] Phase 5 Massive columns: hundreds of units at a smooth frame rate (infantry merged, off-screen culling, no freeze on vehicle kills shipped; vehicles merged −40% draws; infantry next)
- [todo] Phase 6 Device tiers: phones stay smooth with a lighter look, PCs get everything

## Campaign
- [doing] Shia mini-campaign: 5 missions (Hold the Pass, Supply Run, Mountain Fortress, Retake the Town, Combined Arms) with briefings, objectives and debriefs (2026-11-03)

## Battlefield and maps
- [done] Martyrdom banner: fallen Shia soldiers leave a rally flag that steadies nearby troops
- [done] Bigger electronic warfare: minimap blackout and fake radar ghosts
- [next] Rubble from destroyed buildings becomes cover and blocks tanks
- [next] Tunnels counter: ground-penetrating radar, tunnel ambushes
- [next] Proxy militias you can fund near the front
- [next] Sanctions on an enemy's income, countered by smuggling routes
- [next] Day/night battles with thermal optics
- [done] Live news ticker · [done] end-of-match kill-cam replay · [done] end-of-match stats page (awards, scoreboard, army graph, Share) · [next] one-tap army stances (Assault/Hold/Guerrilla)
- [done] Bases always start on dry ground; all 28 maps checked by an automatic sweep
- [done] AI builds and uses a navy on water maps
- [done] Command & teams: battle plans (numbered arrows, Go/timer steps), named battle groups with Line/Column/Wedge, doctrine trees (3 tiers per doctrine), allied aid (fee + delay, give units), team pings/drawings/quick lines, free-for-all ceasefire offers
- [done] Real-place maps: Donbas Steppe, Golan Plateau, Korean DMZ Iron Triangle, Lebanon Beqaa and Chouf, Yemen Tihama and Highlands, Strait of Hormuz Island Gate (all fair-checked, mirror-symmetric)
- [done] Seasons on every map: Summer / Autumn mud / Winter snow (lobby option; looks + off-road movement; roads matter more)
- [done] Fix AI blowouts: no general powers in the first 3 minutes, AI always builds an army
- [done] Balance round 2: AI fields tanks, weak nations (Israel, Turkey, Korea) strengthened
- [done] Faster takeover when the host leaves a multiplayer battle (about 2 s)
- [done] Map picker describes every map correctly
- [done] AI fights by its doctrine: artillery barrages (RU, CN, KP), camouflaged ambushes (IL, AE), rebuilds lost radars
- [done] AI barrages never aim at their own troops; ambush pickets hold their posts
- [done] Hard AI = smarter, not richer: counter-builds, flanks, uses cover, focus-fires; navy on time + landing craft; supply trucks fixed
- [done] Balance round 3: every nation wins 37–65% vs the AI field (Israel 51%, UAE 57%)
- [done] Real soldier models (desert / green / militia fatigues) and Middle Eastern HQ, barracks and factory for IR, RS, DW, SA, AE, EG
- [done] Middle Eastern compounds, HESCO depots, bunkers and hardened airfields for the rest of those bases
- [done] Middle Eastern missile bunker (Strike Center) and harbour (Shipyard); camo nets that drape like real netting
- [done] Balance round 4: every nation wins 38–65% (Iran up from 12%)
