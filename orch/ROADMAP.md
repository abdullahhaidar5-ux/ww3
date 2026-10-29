# Roadmap — progress of all the big work

The Command Board's **Progress** section is built from this file (`orch/board.py`). ORCH updates the status tags
every cycle (ORCH.md step 9); anyone who ships or starts an item updates its line here in the same commit.

Status tags: **[done]** shipped and live · **[doing]** being built or tested right now · **[next]** queued, nothing
blocking · **[you]** waiting on a decision or action from Abdullah · **[paused]** paused by Abdullah · **[todo]**
planned, not started. Keep each line short and in player terms. Plan doc for the overhauls:
https://claude.ai/artifact/QDp8ykMpW6fwW7YRn4jqUZ

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
- [todo] Big explosions: replace the flat yellow first-instant ball
- [doing] Phase 5 Massive columns: hundreds of units at a smooth frame rate (infantry merged, off-screen culling, no freeze on vehicle kills shipped; vehicles next)
- [todo] Phase 6 Device tiers: phones stay smooth with a lighter look, PCs get everything

## Battlefield and maps
- [done] Bases always start on dry ground; all 28 maps checked by an automatic sweep
- [done] AI builds and uses a navy on water maps
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
- [done] Balance round 4: every nation wins 38–65% (Iran up from 12%)
