# Middle Eastern base buildings (Visuals, branch `worktree-agent-a5285a1324211cf16`)

**For IR/RS/DW/SA/AE/EG** (the nations that already got ME HQ/barracks/factory models), the rest of the base now looks
Middle Eastern and military too. All of it is built in code from simple merged boxes (one mesh per building, no new
models, +0 KB download); footprints and the simulation are untouched.

- **Revenue Center:** walled sandstone compound with corner towers and a gate, two-storey flat-roofed office with arched
  windows, oil tanks, rooftop water tanks, camo-netted parking.
- **Supply Depot:** HESCO perimeter, sandbag chicane at the front, mud-brick shed, crates under camo netting, fuel drums.
- **Tunnel:** concrete bunker portal in an earth mound, T-wall wings, two-course sandbag ring, net over the entrance.
- **Airfield:** hardened aircraft shelter with sand berms, sandstone control tower, T-wall rows, sandbag post, netted fuel point.
- **Defense Gun / SAM:** HESCO ring around the pit (replaces the loose sandbag props).
- **HQ / barracks / factory:** T-walls on two sides and a sandbag corner post.

Code: `meKit`/`meGeo` in `src/04-gfx.js` (used by `geoFor` when the nation is in `MEFAC`); ring/walls in `bldModel` and
prop tweak in `decorateBld` (`src/11-models.js`). Free models: none suitable found within the size budget; not needed.

**Shots:** `orch/shots/me-buildings/{before,after}/bld-*.jpg` (staged full base), `after/live-*.jpg` (AI base after 9 game-min).
Harness: `node orch/gfxinf.mjs --out me-buildings --bld 1 [--bkinds kind:dx:dy,...] [--dist N] [--live SECS]`.

**Follow-ups:** camo nets read a bit like parasols from far away (a textured net card would look better); Strike Center
and Shipyard still use the national/generic look; ME city-style wall textures (vertex colours only now).
