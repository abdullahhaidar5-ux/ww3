# HANDOFF pack-battlefield (2026-11-18)

Branch orch/pack-battlefield. Guard: orch/battlefield.mjs (runs inside gate/decisions).

## Done
1. **Destructible cities** (landed c24b2c7). Rubble, cover, heavy-vehicle blocking, CV clearing and route avoidance already existed (orch/reports/rubble.md); added: right-click rubble with a Construction Vehicle clears that cell (`{t:'clr',k}`), rubble on a supply road closes the line until cleared (`lgRubK` in 03c-logistics, part of lgCoverSig), AI idle CVs clear rubble on roads near their HQ.
2. **Tunnel radar** (kept as the existing HQ upgrade "Ground-Penetrating Radar", nations without tunnels; AI already buys it against tunnel nations; no new vehicle - it would need new art, PACK LOOKS): it now also hears movement under the ground - `gprHears` in 03-sim: going into / coming out of a tunnel, firing post or fortress within radar range gives a warning ping, troops coming out stay revealed 8 s.
3. **Live day + weather** (sim side): Conditions "Live day" (w=9): `G.tod()` hour 0..24, one day = 48 game min (`TOD_DAY`), start hour 7..16 from the seed; `G.wxv()` = `{kind,k}` (k 0..1 eased over 20 s). NOTE: `G.wx` stays the weather state object (many readers), so the function is `G.wxv()`. New kind `storm` (Thunderstorm, live day only): air factor 0 -> jets park, helicopters and drones fly home and hold; blizzard does the same now. Fog/sand/night cut sight as before. HUD chip shows HH:MM (updates only when text changes). `G.live`, `G.todH0` are in the checkpoint. Missions can pin a time/weather with a `w` field on the mission row. Test range: the picker lists "Live day". The look squad: storm currently renders as rain (05-fx3d `kk`); lightning/darkening via `G.wxv()` is theirs.
   Items 2 and 3 landed together on one gate run (not two) to save a 45-minute wait.

## Left
4. Stuck-units leftovers: only measured. 8-player scan (dmziron, oasis, hindukush, 8 game-min, seed 1): 7 episodes (dmziron 4, hindukush 2, oasis 1); 6 of 7 are units 11-25 px beside an own-base building (factory, barracks, hq, tunnel, garrison) with a move order that stops making progress - not armies passing through each other. Next: let `stalled` sidestep along the building edge instead of waiting 16 s. Dugout/garrison exits and ships under bridges not scripted. No sim change shipped for this item.
- Found, not touched: `unloadTunnel` and AI attack code use `Math.random` (host-only today).

## For Abdullah (2 minutes on PC)
Battle, Conditions = **Live day**: watch the clock chip top-right move (a day passes in 48 min; try the Test range picker to see it faster), then at night see your units' sight shrink. Also: knock down a town building with a tank, select a Construction Vehicle and right-click the rubble. https://abdullahhaidar5-ux.github.io/ww3/
