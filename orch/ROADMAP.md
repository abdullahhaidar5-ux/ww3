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
- [paused] Generals mouse controls + Mouse settings (work saved on a branch)
- [paused] More intuitive phone controls (one-finger scroll, command bar for touch)

## Multiplayer in the cloud
- [done] Game live on Cloudflare (ww3.abdullah-haidar5.workers.dev), updated automatically
- [done] Matchmaking + relay servers with automatic fallback (built and tested; switched off until they're live)
- [done] Servers live on Cloudflare (ww3-servers), approved by Abdullah
- [doing] Battles run on a server (or a dedicated PC) instead of the host's device — top priority (step 1 done: battle runs without graphics, identical to the browser; next: PC server + Cloudflare option)
- [done] Fix: stale enemy soldiers left on a player's screen

## Audio and music overhaul
- [done] Authentic Middle Eastern music: Iran, Mountain Shias, Coffee Shias, Saudi Arabia, UAE, Egypt (real maqam/dastgah, regional rhythms, recorded percussion)
- [done] Asian music: Pakistan, India, China, North Korea, South Korea (regional instruments and rhythms)
- [done] Region-specific music for the other 7 nations (US, TR, IL, EU, UA, RU, CU) — all 18 done
- [doing] Military band layer: each nation's public-domain US Navy Band anthem recording (US, EU done)
- [todo] Recorded weapons, explosions, engines and aircraft (near and far, echo per theatre)
- [todo] Battlefield ambience per map and weather
- [todo] Full native-language unit voice lines per nation
- [todo] Real latmiyas found in free archives (synthesized ones stay until then)
- [todo] Proper mix: voices duck music, distance fade, even loudness

## Graphics overhaul
- [next] Phase 1 Foundations: art out of the game page onto Cloudflare, engine upgrade (approved; unblocked, starts next)
- [todo] Phase 2 Real models (first look to improve): detailed units and buildings with national variants (free art)
- [todo] Phase 3 Terrain and world: sculpted ground, water, roads, craters
- [todo] Phase 4 Light and effects: shadows, smoke, fire, explosions, theatre colour
- [todo] Phase 5 Massive columns: hundreds of units at a smooth frame rate
- [todo] Phase 6 Device tiers: phones stay smooth with a lighter look, PCs get everything

## Battlefield and maps
- [done] Bases always start on dry ground; all 28 maps checked by an automatic sweep
- [done] AI builds and uses a navy on water maps
- [done] Fix AI blowouts: no general powers in the first 3 minutes, AI always builds an army
- [done] Balance round 2: AI fields tanks, weak nations (Israel, Turkey, Korea) strengthened
- [done] Faster takeover when the host leaves a multiplayer battle (about 2 s)
- [todo] Fix map picker calling Fulda Gap, Golan and Korean DMZ "open land"
