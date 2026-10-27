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
- [doing] Faster battle start on phones + loading screen with each nation's quotes (final multiplayer checks)
- [doing] Generals-style bottom command bar replacing the side menu
- [paused] Generals mouse controls + Mouse settings (work saved on a branch)
- [paused] More intuitive phone controls (one-finger scroll, command bar for touch)

## Multiplayer in the cloud
- [done] Game live on Cloudflare (ww3.abdullah-haidar5.workers.dev), updated automatically
- [doing] Matchmaking + relay servers with automatic fallback (final tests)
- [you] Put the servers live: one-time Cloudflare import, then tap Merge
- [todo] Battles run on a server (or a dedicated PC) instead of the host's device
- [todo] Fix: stale enemy soldiers left on a player's screen (about half of test runs)

## Audio and music overhaul
- [doing] Authentic Middle Eastern music: Iran, Mountain Shias, Coffee Shias, Saudi Arabia, UAE, Egypt
- [next] Region-specific music for the other 12 nations
- [next] Military band layer: each nation's public-domain US Navy Band anthem recording
- [todo] Recorded weapons, explosions, engines and aircraft (near and far, echo per theatre)
- [todo] Battlefield ambience per map and weather
- [todo] Full native-language unit voice lines per nation
- [todo] Real latmiyas found in free archives (synthesized ones stay until then)
- [todo] Proper mix: voices duck music, distance fade, even loudness

## Graphics overhaul
- [you] Approve Phase 1 and pick what comes first (units, terrain or effects); is a lighter phone look OK
- [todo] Phase 1 Foundations: art out of the game page onto Cloudflare, engine upgrade
- [todo] Phase 2 Real models: detailed units and buildings with national variants (free art)
- [todo] Phase 3 Terrain and world: sculpted ground, water, roads, craters
- [todo] Phase 4 Light and effects: shadows, smoke, fire, explosions, theatre colour
- [todo] Phase 5 Massive columns: hundreds of units at a smooth frame rate
- [todo] Phase 6 Device tiers: art and effects sized to each phone and PC

## Battlefield and maps
- [done] Bases always start on dry ground; all 28 maps checked by an automatic sweep
- [done] AI builds and uses a navy on water maps
- [todo] Fix AI blowouts: losing AI stops building and gets wiped in about two minutes
- [todo] Fix map picker calling Fulda Gap, Golan and Korean DMZ "open land"
