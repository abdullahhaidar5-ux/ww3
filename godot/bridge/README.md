# godot/bridge — the JS-sim bridge (lane P1, branch `orch/gport-p1`)

The Godot **web** build does not simulate anything. The page loads `ww3sim.js` (the browser game's own simulation:
`src/01-*`, `02-*`, `03-*` bundled without Three.js / DOM by `tools-godot/build_bridge.mjs`) **before** the engine, and
Godot reads the battle from it once per tick and sends orders into it. Same rules, same AI, same numbers as the JS game
because it *is* the JS game's sim. Desktop / headless Godot has no JS engine: `SimBridge.available()` is false there
and `new_game` fails with a clear "web only" error.

```
src/*.js ──build_bridge.mjs──▶ godot/web/ww3sim.js ──(custom HTML shell loads it first)──▶ window.WW3
                                                                    ▲ one bulk read per tick
godot/bridge/sim_bridge.gd  (autoload-free: `const SimBridge = preload("res://bridge/sim_bridge.gd")`)
```

Files: `godot/web/ww3sim.js` (build output, never edit), `godot/web/shell.html` (custom HTML shell → P7 sets
`html/custom_html_shell="res://web/shell.html"` in `export_presets.cfg` and ships `ww3sim.js` next to `index.html`),
`godot/web/ww3bridge.js` (worker client, ships next to `index.html` too), `godot/bridge/sim_bridge.gd`, `tools-godot/build_bridge.mjs`, `tools-godot/bridge_test.mjs` (Node proof).

Units everywhere = the browser game's design units (bm_splitridge is 4800×3320; a soldier ≈ 8 wide). `x` right, `y` down
on the map (Godot: x → X, y → Z); heights `z` in the same units. Angles in radians, `atan2(dy, dx)` on the map.
Time: the sim runs fixed ticks of **1/60 s**; call `step(2)` per 30 Hz frame (or `step(1)` per 60 Hz).

## Status (2026-11-22) — implemented and proven
- `node tools-godot/build_bridge.mjs` → `godot/web/ww3sim.js` (≈0.8 MB, 22 sim modules). `tools-godot/export_web.sh`
  = build + export + copy `ww3sim.js` next to `index.html` → `godot-build/web/` (not committed).
- `node tools-godot/bridge_test.mjs` (BRIDGE PASS): same state hash as `orch/headless.mjs` every 30 s for 3 min, events,
  buffers, map, supply lines, fog, rules, a human seat's move / build / train orders. `--nations`: all 22 start and run.
  `--long`: 4-player AI battle 10 min. `--bench`: 500 units a side.
- In the browser (`node tools-godot/web_test.mjs "bridge-test&minutes=10&bench"`, headless Chromium, Godot 4.4.1 web
  export): 4-player AI battle 10 game-minutes, **state hash every minute identical to Node**; JS sim 0.41 ms per tick,
  Godot's bulk read 0.27 ms per step; 500 units a side: 7.6 ms per tick + 0.35 ms read (cloud sandbox CPU).
- `scenes/battle.tscn` runs on the bridge through `bridge_sim.gd` (an adapter with the old GDScript sim's interface, so
  the scene code kept working). **New visuals / UI / audio code should read `sim.br` (this API) directly.**
  URL switches on the web: `index.html?battle-ai&fac=IR&vs=US`, `?battle`, `?bridge-test`, `?worker-test&units=500`.
- Desktop / headless: prints the "web only" error (`--gdsim` = the parked GDScript rules, developers only).

## The sim runs in a Web Worker (default)

`godot/web/ww3bridge.js` (loaded by the shell) starts `new Worker("ww3sim.js")`: the simulation and Godot's rendering run
on two cores. Godot posts orders + "step k"; the worker answers with one **transferred** ArrayBuffer snapshot (entities),
one for projectiles, and the step's JSON (events, teams, clock). Plain Worker + transferables: no SharedArrayBuffer, so
no COOP/COEP headers (GitHub Pages works). Nothing in the sim needs the main thread.
What that changes for callers - everything else below is the same:
- `sim.booted()` → the worker has loaded (tables + rules of all 22 nations are in; menus can be built before a game).
- `sim.new_game(opts)` returns `{ok, pending=true}`; wait until `sim.ready()` is true (a few frames), then `map_data()`.
- `sim.step(k)` only *asks*; every frame do `while sim.poll(): ...` - each true = one finished step is now in
  `ent / proj / events / teams / prod` (0, 1 or a few per frame). **Interpolate** positions between the last two steps.
  At most 6 steps are in flight; a `step` beyond that is dropped (`sim.js.pending()` tells), orders are never dropped.
- `sim.fog_team = me` → the fog grid of that team comes with every step (`sim.fog(me)`); `sim.want_hash = true` → the
  state hash too (`sim.state_hash()`); `lines()` is pushed whenever it changed.
- `valid_spot`, `req_met`, `inside` answer from the last reply and refresh in the background (one frame late).
- `sim.want_worker = false` before the first call keeps the sim on the page's thread (synchronous; tests use it).
- `sim.worker_stats()` → `{steps, bytesPerStep, workerMsPerStep, mainMsPerStep}` since the last call.

Measured in headless Chromium (cloud sandbox CPU, `node tools-godot/web_test.mjs "worker-test&units=500"`):

| Units a side | Worker, per tick | Bytes per 2-tick step | Main thread per frame (request + read + JSON) | Message handler per step |
|---|---|---|---|---|
| 300 (618 entities) | 4.9 ms | 43.8 KB | 0.32 ms | 0.03 ms |
| 500 (1019 entities) | 8.0 ms | 72.6 KB | 0.32 ms | 0.04 ms |

The worker gives the same state hash as Node after one game-minute of the 4-player battle (69d57490568345ba).

## GDScript API (`sim_bridge.gd`)

```gdscript
var sim := SimBridge.new()
if not sim.available(): ...                       # desktop/headless: show "web only"
var T: Dictionary = sim.tables()                  # once: names for every id below (see Tables)
var info := sim.new_game({map = "bm_splitridge", seed = 1, diff = 1,
    players = [{nation = "IR", ai = false, team = 0}, {nation = "US", ai = true, team = 1}]})
#   players[i]: nation (one of T.nations[].key), ai (bool; false = a human seat, nobody plays it but orders),
#   team (same number = allies). diff 0 Easy / 1 Normal / 2 Hard (all AI seats). info = {ok, map:{...}, teams:[...]}
sim.order(0, {t = "go", ids = [12, 13], x = 2100, y = 900})   # queued; applied at the start of the next tick
sim.step(2)                                       # 2 fixed ticks; then ONE bulk read fills the arrays below
sim.n                                             # entities this tick
sim.ent  : PackedFloat32Array                     # n × ENT_STRIDE (18)  — see Entity record
sim.proj : PackedFloat32Array                     # shells / missiles in flight, m × PROJ_STRIDE (8)
sim.events : Array                                # everything that happened in these ticks (see Events)
sim.teams : Array                                 # refreshed every step (cheap): money, power, pop... (see Teams)
sim.prod : Dictionary                             # building id -> {q:[[kind, done_s, total_s]..], rally: Vector2 or null}
sim.valid_spot(team, kind, x, y) -> bool          # may this building go here (the JS validSpot)
sim.req_met(team, kind) -> bool                   # tech requirement met
sim.t, sim.over, sim.winner                       # game seconds, bool, winning team slot or -1
sim.map_data()                                    # once after new_game: heightfield, grid, roads, props (see Map)
sim.lines()                                       # supply lines, craters, bridges; re-read when sim.lgv changed
sim.fog(team)   -> PackedByteArray                # GW×GH: 0 never seen, 1 seen before, 2 visible now (allies share)
sim.inside(id)  -> Array                          # who is inside a garrisoned building / dugout / tunnel / transport
sim.rules(nation) -> Dictionary                   # build + train menus for a nation (see Rules)
sim.state_hash() -> String                        # same 16-hex hash as orch/headless.mjs W.hash()
```
Zero per-entity JS calls: `step` makes one JS call and three buffer copies (ents, proj, events+teams JSON).

## Entity record (`sim.ent`, 18 floats each; `SimBridge.E_*` constants)

| # | const | what |
|---|---|---|
| 0 | E_ID | entity id (stable for its life; ids are never reused) |
| 1 | E_KIND | index into `tables().kinds` (units and buildings share the table: "inf", "tank", "hq", "barracks"...) |
| 2 | E_TEAM | team slot 0..7 (−1 = neutral). Nation = `teams[slot].nation` |
| 3,4 | E_X, E_Y | map position |
| 5 | E_Z | height of its feet/base: ground height, + flight altitude for aircraft |
| 6 | E_ANG | hull heading |
| 7 | E_TANG | turret / aim heading (= hull for things without a turret) |
| 8 | E_HP | hp ÷ max, 0..1 |
| 9 | E_FLAGS | bit field, see below (`int(ent[i + E_FLAGS]) & F_ROUT`) |
| 10 | E_AMMO | ammo left 0..1; −1 = this thing has no ammo rule |
| 11 | E_RANK | veterancy 0..3 |
| 12 | E_STATE | animation / action: index into `tables().states` ("idle","move","fire","build","gather","dig","fly","park","rout","dead") |
| 13 | E_BUILT | buildings: construction 0..1 (1 = finished); units: speed now ÷ top speed, 0..1 |
| 14 | E_VIS | bit mask of team slots that see it now (bit t = team t). Draw an enemy only if your bit is set |
| 15 | E_SIZE | footprint: building side length, unit radius |
| 16 | E_TARGET | id of what it is shooting at / ordered to attack, 0 = none |
| 17 | E_MAXHP | full hit points (absolute) |

Flags (`SimBridge.F_*`): 1 BUILDING · 2 BUILT (finished) · 4 SELECTABLE (a player may select it) · 8 DEAD (reserved:
the sim removes the dead before the read - use the `die` event, or an id missing from the next read) · 16 GARRISON (a building/dugout/tunnel/transport holding troops) · 32 ROUT ·
64 DUG (a dugout, or a unit in a trench) · 128 FIRED (shot during this step) · 256 NOPOWER (building switched off /
disabled) · 512 SELLING · 1024 REPAIRING · 2048 SUPPLIED (inside its side's supply area) · 4096 ABANDONED (crew bailed
out) · 8192 LANDED (aircraft on the ground) · 16384 WORKING (dozer building / truck loading) · 32768 CAPTURABLE (neutral
derrick / quarry / mine / power plant / hospital; `E_TEAM` = owner or −1).
Derricks and capturable map buildings come as entities with ids `OIL_ID (1000000) + index` (kinds `derrick`, `pplant`,
`tb_<key>`; attack them with `{t:"atkOil", fi: id - OIL_ID}`).
Soldiers inside a building, dugout, tunnel or transport are **not** in the list (the JS sim removes them from the
world); the holder has F_GARRISON and `inside(id)` lists them `[{id, kind, hp}]`.

## Projectiles (`sim.proj`, 8 floats): x, y, z, target x, target y, weapon index (`tables().weapons`), team, 0..1 progress

## Events (`sim.events`: Array of Arrays, in order; first item = type)

They are the JS game's own effect queue (`FXE(type, args)` in src/03-sim.js), passed through unchanged, so every sound
and effect the browser game plays has its trigger here. The ones every lane needs (args after the type):

| type | args | meaning |
|---|---|---|
| `tr` | x0,y0,x1,y1,weapon,… | a shot / tracer (bullets, tank guns) — muzzle flash + sound at x0,y0 |
| `muz` | id,… | muzzle flash on a unit |
| `pj` | … | a shell / missile launched (its flight is in `sim.proj`) |
| `boom` | x,y,radius,big(0/1) | explosion / impact |
| `die` | id,x,y,kind index,isBuilding(0/1),team | a unit or building destroyed |
| `gone` | id,x,y,… | removed without a death effect (sold, entered, despawned) |
| `txt` | x,y,text,team,… | floating text ("DIGGING IN", "+160") |
| `log` | team,message,kind('g' good,'w' warning,'bad'),[x,y] | radio / message feed line for that team |
| `say` / `shout` | … | unit voice trigger (acknowledge / battle shout) |
| `rank` | id,… | promotion |
| `strike`,`plane`,`salvo`,`bmis`,`emp`,`smoke`,`flare`,`icpt` | … | generals' powers, air strikes, missiles |
| `civs`,`civd` | building index, stage | a map building damaged (stage 1,2) / collapsed |
| `heal`,`halo`,`flag`,`ping`,`tping`,`mping` | … | heal puff, aura, capture flag, minimap pings |
| `elim` | team | a player is out |
| **`ready`** | team, id, kind index | *(bridge)* a unit left its factory |
| **`built`** | team, id, kind index | *(bridge)* a building finished |
| **`end`** | winner slot, reason | *(bridge)* victory / defeat |

Full argument lists: grep `FXE('<type>'` in `src/03*.js`; `tables().events` lists every type name that exists.
Unknown types are safe to ignore.

## Teams (`sim.teams[slot]`)

`{nation, name, color:"#rrggbb", team, ai, out, credits, power_make, power_use, pop, cap, rank, gxp,
  upg:[keys done], research:{key, left} or null, charge, powers:[{k, name, ready(bool), left(seconds)}],
  leader:{...} or null, units, blds, kills, lost}`

## Map (`sim.map_data()`, once per game)

`{key, name, MAPW, MAPH, CELL, GW, GH, bases:[[x,y]..],
  grid: PackedByteArray GW×GH (0 land, 1 water, 2 bridge deck/ford, 3 building/wall, 4 deep water / blown bridge),
  cover, wood: PackedByteArray GW×GH,
  hgrid:{R, w, h, a: PackedFloat32Array}  (ground height at (i*R, j*R)),
  road:{C, w, h, d: PackedByteArray}      (road mask, C units per cell),
  fields:[{x,y,r,amt}], oil:[{x,y,tb,pw}] (derricks + capturable buildings; live owner/hp come as entities),
  civ:[{i,x,y,h,rot,ruin}]                (garrisonable map buildings / props), trees:[[x,y,s]..], bridges:[{x,y,h,n,t}]}`

`sim.lines()` (re-read when `sim.lgv` changes): `{roads:[[[x,y]..]..], cov:[per team {edge:{v:[[s0,s1]..], d:[..]}}],
bead:[per team [[x,y,r]..]], craters:[{x,y,left}], bridges_dead:[i..], ck:[{team,x,y}], mines:[{team,x,y}],
rc:{edge:{o,c,p}}, dug:[{x,y,a,k,team}]}` — colours: green yours, red enemy, gray neutral; `d` = cut (dashed).

## Orders (`sim.order(team_slot, obj)`) — exactly the JS game's `act(team, a)` objects

| what | object |
|---|---|
| move / attack-move | `{t:"go", ids:[..], x, y}` / `{t:"go", mode:"amove", ids, x, y}` (`q:1` = add waypoint) |
| attack a unit/building | `{t:"atk", ids, tid}` · derrick / capturable: `{t:"atkOil", ids, fi}` · map building: `{t:"atkCiv", ids, ci}` |
| stop | `{t:"stop", ids}` · guard here `{t:"def", ids, x, y}` · infantry line `{t:"line", ids, x, y, x2, y2}` · stance `{t:"stance", ids, v:0..3}` |
| place a building | `{t:"bld", k:"barracks", x, y, dz:<dozer id>}` · help build `{t:"bldGo", ids, tid}` · cancel `{t:"cb", tid}` |
| train | `{t:"q", k:"inf", tid:<building id>}` · cancel one `{t:"dq", k, tid, ti:<queue index>}` |
| rally point | `{t:"rally", ids:[building ids], x, y}` |
| sell / repair | `{t:"sell", ids:[building ids]}` / `{t:"rep", ids:[building ids]}` |
| research | `{t:"up", k:<upgrade key>}` |
| generals' power | `{t:"buy", k}` then `{t:"pow", k, x, y}` · strike launch `{t:"sup", x, y}` |
| leader ability | `{t:"ldr", k:"a"|"u", x, y}` |
| dig in | `{t:"dig", ids}` |
| enter | map building / dugout `{t:"gar", ids, ci}` · tunnel / fortress `{t:"tun", ids, tid}` · transport `{t:"board", ids, tid}` |
| leave | building / dugout `{t:"ungar", tid:<garrison id>, at:1, x, y}` · tunnel / transport `{t:"unl", tid, at:1, x, y}` (`at:0` = here) |
| supply truck to a field | `{t:"fld", ids, fi}` · resupply `{t:"resup", ids}` |
| road jobs | `{t:"lg", k:"mine"|"ckpt"|"demo"|"fixb"|"pont", x, y, ids:[dozer]}` |

Every other `case` of `act()` in src/03-sim.js works too (the object is passed through). Orders are validated by the
sim; a bad one is ignored. Online (P7): send these objects over the wire and feed them to `order()` on the agreed tick.

## Tables (`sim.tables()`)

`{kinds:[..]` (E_KIND), `states:[..]` (E_STATE), `weapons:[..]`, `events:[..]`,
`nations:[{key, name, color, style}]` (the 22 playable, in menu order), `maps:[{key, name, max}]`,
`E_STRIDE, PROJ_STRIDE}`

## Rules (`sim.rules(nation)`) — for build / train menus and tooltips

`{units:{kind:{name, cost, time, cat ("barracks"/"factory"/"airfield"/"shipyard"/"hq"), req, pop, hp, rng, cls}},
  blds:{kind:{name, cost, time, req, size, hp}}, upg:{key:{name, cost, time, req, desc}}, powers:[{k, name, cost, desc}],
  build_order:[kinds the dozer menu shows], style}`

## Determinism

`new_game` seeds the battle's `Math.random` and freezes the path-budget clock exactly like `orch/headless.mjs`
(portable sin/cos/atan2/exp/pow on), so the same seed + same orders at the same ticks = the same `state_hash()` in
Node and in every browser. Never call anything on `window.WW3` between ticks except `order`.
