## Adapter: gives the battle scene the same interface the old GDScript sim (res://sim/sim.gd) had, on top of the
## JS-sim bridge (sim_bridge.gd). battle.gd keeps reading sim.ents / sim.teams / sim.t ... and calling sim.apply_order;
## everything comes from the browser game's JavaScript simulation. New code (visuals P4, UI P6, audio P5) reads
## `sim.br` directly (typed arrays + events, res://bridge/README.md).
extends RefCounted

const Bridge = preload("res://bridge/sim_bridge.gd")
const E = preload("res://sim/sim_ent.gd")

## Lightweight road/passability helper so HUD minimap baking and Test Range work identically on the JS sim.
class BridgeNav extends RefCounted:
	var P_ROAD := false
	var _rd := PackedByteArray()
	var _rw := 1
	var _rh := 1
	var _rC := 16.0
	var _grid := PackedByteArray()
	var _gw := 1
	var _gh := 1
	var _cell := 40.0
	func setup(map: Dictionary) -> void:
		_grid = PackedByteArray(map.get("grid", []))
		_gw = maxi(1, int(map.get("GW", 1)))
		_gh = maxi(1, int(map.get("GH", 1)))
		_cell = maxf(1.0, float(map.get("CELL", 40.0)))
		var road = map.get("road")
		if road != null and road is Dictionary and road.has("d"):
			_rd = PackedByteArray(road.d)
			_rw = maxi(1, int(road.get("w", 1)))
			_rC = maxf(1.0, float(road.get("C", 16.0)))
			_rh = maxi(1, _rd.size() / _rw)
			P_ROAD = _rd.size() > 0
		else:
			P_ROAD = false
	func on_road(x: float, y: float) -> bool:
		if not P_ROAD: return false
		var rx := clampi(int(x / _rC), 0, _rw - 1)
		var rz := clampi(int(y / _rC), 0, _rh - 1)
		return int(_rd[rz * _rw + rx]) != 0
	func pass_xy(_dom: int, x: float, y: float) -> bool:
		if _grid.is_empty(): return true
		var gx := clampi(int(x / _cell), 0, _gw - 1)
		var gz := clampi(int(y / _cell), 0, _gh - 1)
		var c := int(_grid[gz * _gw + gx])
		return c != 1 and c != 3 and c != 4

## Rules constants matching the browser game (used by battle.gd command bar, sell refund, minimap supply radii)
var R := {
	BUILD_ORDER = ["gen", "barracks", "depot", "factory", "radar", "turret", "sam", "airfield", "shipyard", "tech", "tunnel", "fort", "radio", "uplink", "super"],
	SELL_PCT = 0.5,
	SUP_R = {hq = 420.0, depot = 320.0, base = 200.0},
	SUP_NOB = ["wall", "turret", "sam", "coast"],
}

var br := Bridge.new()
var nav := BridgeNav.new()
var T_: Dictionary = {}            # tables
var ents: Array = []
var by_id: Dictionary = {}
var teams: Array = []
var oil: Array = []
var fields: Array = []
var proj: Array = []
var bases: Array = []
var map: Dictionary = {}
var t: float = 0.0
var over: bool = false
var winner: int = -1
var MAPW: float = 0.0
var MAPH: float = 0.0
var CELL: int = 40
var GW: int = 0
var GH: int = 0
var events: Array = []             # all events since take_events()
var _hg: PackedFloat32Array
var _hg_R: float = 10.0
var _hg_w: int = 0
var _hg_h: int = 0
var _pt: Dictionary = {}
var _facs: Array = []
var _lines_cache: Dictionary = {}
var _lines_lgv: int = -1

func available() -> bool:
	return br.available()

## players = [{fac, ai, tm}] (the old Sim.init shape); the map comes from the JS sim (any of its maps).
## Asynchronous when the sim runs in a Web Worker: call init(), then wait until ready() is true (one or more frames).
var _st: int = 0
var err := ""            # set when the sim refused the battle (unknown map key...): ready() never turns true
var _opts: Dictionary = {}
func init(map_key, players: Array, seed_value: int = 1, difficulty: int = 1, _rules: Dictionary = {}) -> bool:
	if not br.available(): push_error(Bridge.WEB_ONLY); return false
	var ps: Array = []
	for p in players: ps.append({nation = str(p.fac), ai = bool(p.get("ai", true)), team = int(p.get("tm", ps.size()))})
	_opts = {map = str(map_key), seed = seed_value, diff = difficulty, players = ps}
	_st = 0; err = ""; ents = []; by_id = {}; events = []; teams = []; _lines_cache = {}; _lines_lgv = -1
	return true

## the sim's own map list row for a key: {key, name, max (most players), battle} or {} (call once booted)
func map_row(key: String) -> Dictionary:
	if br.booted():
		for m in br.tables().get("maps", []):
			if str(m.key) == key: return m
	return {}

func ready() -> bool:
	if _st == 2: return true
	if _st == 0:
		if not br.booted(): return false
		T_ = br.tables()
		var r := br.new_game(_opts)
		if not int(r.get("ok", 0)): err = str(r.get("error", "new game failed")); _st = 3; return false
		_st = 1
	if _st == 3: return false
	if not br.ready():
		if br.error != "": err = br.error; _st = 3
		return false
	var ps: Array = _opts.players
	map = br.map_data()
	# keep typed copies for LookFx/terrain while preserving Array compatibility for legacy callers
	map.grid_bytes = map.grid; map.cover_bytes = map.cover; map.wood_bytes = map.wood
	map.grid = Array(map.grid); map.cover = Array(map.cover); map.wood = Array(map.wood)
	if map.get("hgrid") != null: map.hgrid.a_f = map.hgrid.a; map.hgrid.a = Array(map.hgrid.a)
	if map.get("road") != null: map.road.d_bytes = map.road.d; map.road.d = Array(map.road.d)
	MAPW = float(map.MAPW); MAPH = float(map.MAPH); CELL = int(map.CELL); GW = int(map.GW); GH = int(map.GH)
	nav.setup(map)
	bases = map.bases
	if map.get("hgrid") != null: _hg = map.hgrid.a_f; _hg_R = float(map.hgrid.R); _hg_w = int(map.hgrid.w); _hg_h = int(map.hgrid.h)
	fields = []
	for f in map.fields: fields.append({x = float(f.x), y = float(f.y), r = float(f.r), amt = float(f.amt)})
	oil = []
	for o in map.oil: oil.append({x = float(o.x), y = float(o.y), tb = o.tb, pw = int(o.pw), owner = -1, dead = false, hp = 1.0, max = 1.0, i = oil.size()})
	_facs = []
	for p in ps: _facs.append(p.nation)
	_sync()
	_st = 2
	return true

func step_n(k: int = 2) -> void:
	br.step(k)
	while br.poll():      # worker: the steps that have come back since the last frame (none, one or a few)
		events.append_array(br.events)
		_sync()

func step() -> void:
	step_n(1)

func peek_events() -> Array:
	return events

func take_events() -> Array:
	var e := events; events = []; return e

func _build_roster(ru: Dictionary) -> Dictionary:
	var ros: Dictionary = {}
	var raw_ros = ru.get("roster")
	if raw_ros is Dictionary and not raw_ros.is_empty():
		for k in raw_ros: ros[k] = Array(raw_ros[k]).duplicate()
	var units: Dictionary = ru.get("units", {})
	for uk in units:
		var u: Dictionary = units[uk]
		var cat := str(u.get("cat", ""))
		if cat == "": continue
		if not ros.has(cat): ros[cat] = []
		if not ros[cat].has(uk): ros[cat].append(uk)
	return ros

func _sync() -> void:
	t = br.t; over = br.over; winner = br.winner
	# teams
	var NT := br.teams.size()
	if teams.size() != NT:
		teams = []
		for i in NT:
			var fac := str(br.teams[i].nation)
			var ru := br.rules(fac)
			var blds: Dictionary = ru.get("blds", {}) if ru.get("blds") is Dictionary else {}
			var units: Dictionary = ru.get("units", {}) if ru.get("units") is Dictionary else {}
			var upg_d: Dictionary = ru.get("upg", {}) if ru.get("upg") is Dictionary else {}
			var upg_l: Array = upg_d.keys()
			if ru.get("build_order") is Array and not (ru.build_order as Array).is_empty():
				R.BUILD_ORDER = ru.build_order
			var gpow := {}
			for pw_row in ru.get("powers", []):
				if pw_row is Dictionary and pw_row.has("k"):
					gpow[str(pw_row.k)] = {name = str(pw_row.get("name", pw_row.k)), desc = str(pw_row.get("desc", ""))}
			var F := {
				name = str(ru.get("name", fac)),
				style = str(ru.get("style", "")),
				roster = _build_roster(ru),
				units = units,
				blds = blds,
				upg = upg_d,
				upgList = upg_l,
				gpow = gpow,
				special = str(ru.get("special", "")) if ru.get("special") != null else "",
			}
			teams.append({id = i, fac = fac, F = F, upg = {}, rq = {}, built = 0, powers = [], leader = null, charge = 0, charge_max = 0})
	for i in NT:
		var a: Dictionary = br.teams[i]; var T: Dictionary = teams[i]
		T.tm = int(a.team); T.credits = float(a.credits); T.rank = int(a.rank); T.spent = int(a.get("spent", 0))
		T.out = bool(a.out); T.ai = a.ai
		T.kills = int(a.kills); T.lost = int(a.lost)
		T.pw = Vector2(float(a.power_make), float(a.power_use)); T.pop = int(a.pop); T.cap = int(a.cap); T.row = a
		T.charge = int(a.get("charge", 0)); T.charge_max = int(a.get("charge_max", 0))
		T.powers = a.get("powers", []); T.leader = a.get("leader", null)
		var u_map := {}
		for uk in a.get("upg", []): u_map[str(uk)] = true
		T.upg = u_map
		var rq_map := {}
		var res = a.get("research")
		if res is Dictionary and res.has("key"):
			var rk := str(res.key)
			var uinfo: Dictionary = T.F.upg.get(rk, {})
			var at_b := str(uinfo.get("at", "tech"))
			var tot := float(uinfo.get("time", 20.0))
			rq_map[at_b] = {key = rk, t = maxf(0.0, tot - float(res.get("left", 0.0)))}
		T.rq = rq_map
	# entities
	var a := br.ent; var S := Bridge.ENT_STRIDE; var kinds: Array = T_.kinds
	var live := {}
	var out: Array = []
	for i in br.n:
		var o := i * S
		var id := int(a[o]); var fl := int(a[o + 9]); var tm := int(a[o + 2])
		if id >= Bridge.OIL_ID:
			var oi := id - Bridge.OIL_ID
			if oi >= 0 and oi < oil.size():
				var row: Dictionary = oil[oi]
				row.owner = tm; row.dead = (fl & Bridge.F_BUILT) == 0; row.max = a[o + 17]; row.hp = a[o + 8] * row.max
			continue
		var e: E = by_id.get(id)
		if e == null:
			e = E.new(); e.id = id; e.kind = str(kinds[int(a[o + 1])]); e.is_b = (fl & Bridge.F_BUILDING) != 0; e.team = tm
			var st = stats(str(teams[tm].fac), e.kind) if (tm >= 0 and tm < NT and not e.is_b) else (bstats(str(teams[tm].fac), e.kind) if (tm >= 0 and tm < NT) else {})
			e.s = st if st != null else {}
			if not e.s.has("name"): e.s = e.s.duplicate(); e.s.name = e.kind
			e.cache_stats(); e.vs = PackedByteArray(); e.vs.resize(maxi(NT, 1))
			by_id[id] = e
			if e.is_b and tm >= 0 and tm < NT: teams[tm].built += 1
		live[id] = true
		e.team = tm
		var prev_hp := e.hp
		e.x = a[o + 3]; e.y = a[o + 4]; e.ang = a[o + 6]; e.va = e.ang; e.tang = a[o + 7]
		e.max = a[o + 17]; e.hp = a[o + 8] * e.max
		if prev_hp > 0.0 and e.hp < prev_hp - 0.5: e.last_hit = t
		e.rank = int(a[o + 11]); e.size = a[o + 15]; e.r = e.size / 2.0 if e.is_b else e.size
		e.built = a[o + 13] if e.is_b else 1.0
		e.v = 0.0 if e.is_b else a[o + 13] * e.s_spd
		e.am = a[o + 10]; e.amx = 1.0 if a[o + 10] >= 0 else 0.0
		e.rout = t + 1.0 if (fl & Bridge.F_ROUT) else 0.0
		e.sup = 1 if (fl & Bridge.F_SUPPLIED) else 0
		e.building = (fl & Bridge.F_WORKING) != 0
		e.dis = t + 1.0 if (fl & Bridge.F_NOPOWER) else 0.0
		e.sell = 1.0 if (fl & Bridge.F_SELLING) else 0.0
		e.rep = 1 if (fl & Bridge.F_REPAIRING) else 0
		e.cargo = 1 if (fl & Bridge.F_GARRISON) else 0
		if fl & Bridge.F_FIRED: e.last_fire = t
		var vm := int(a[o + 14])
		for k in e.vs.size(): e.vs[k] = (vm >> k) & 1
		var tg := int(a[o + 16])
		e.target = by_id.get(tg) if tg else null
		e.order = null
		var pr = br.prod.get(id)
		if pr != null:
			var q: Array = []
			for it in pr.q:
				q.append({kind = str(it[0]), t = float(it[1]), c = 0.0, tot = float(it[2])}); _pt[str(it[0])] = float(it[2])
			e.q = q; e.rally = {x = pr.rally.x, y = pr.rally.y} if pr.rally != null else null
		elif e.is_b: e.q = []; e.rally = null
		out.append(e)
	for e: E in ents:
		if not live.has(e.id): e.dead = true; by_id.erase(e.id)
	ents = out
	# shells / missiles in flight
	var p := br.proj; var m := p.size() / Bridge.PROJ_STRIDE; var W: Array = T_.weapons
	proj = []
	for i in m:
		var o := i * Bridge.PROJ_STRIDE; var pg := p[o + 7]
		var d1 := sqrt((p[o + 3] - p[o]) * (p[o + 3] - p[o]) + (p[o + 4] - p[o + 1]) * (p[o + 4] - p[o + 1]))
		var ln := d1 / maxf(0.02, 1.0 - pg)
		proj.append({x = p[o], y = p[o + 1], tx = p[o + 3], ty = p[o + 4], wpn = str(W[int(p[o + 5])]) if p[o + 5] >= 0 else "", team = int(p[o + 6]), p = pg * ln, len = ln, done = false, splash = 0.0})

# ---- the old Sim's helpers the battle scene calls -----------------------------------------------------------
func ground_h(x: float, y: float) -> float:
	if _hg_w == 0: return 0.0
	var fx := clampf(x / _hg_R, 0.0, _hg_w - 1.001); var fy := clampf(y / _hg_R, 0.0, _hg_h - 1.001)
	var i := int(fx); var j := int(fy); var tx := fx - i; var ty := fy - j; var k := j * _hg_w + i
	return (_hg[k] * (1 - tx) + _hg[k + 1] * tx) * (1 - ty) + (_hg[k + _hg_w] * (1 - tx) + _hg[k + _hg_w + 1] * tx) * ty

func ally(a: int, b: int) -> bool:
	if a == b: return true
	if a < 0 or b < 0 or a >= teams.size() or b >= teams.size(): return false
	return teams[a].tm == teams[b].tm

func seen_by(team: int, e) -> bool:
	return e.team == team or (team >= 0 and team < e.vs.size() and e.vs[team] != 0)

func stats(fac: String, kind: String) -> Dictionary:
	var u = br.rules(fac).get("units", {}).get(kind)
	return u if u != null else {}

func bstats(fac: String, kind: String) -> Dictionary:
	var b = br.rules(fac).get("blds", {}).get(kind)
	return b if b != null else {}

func base_facing(team: int) -> float:
	var b: Array = bases[team] if team < bases.size() else bases[0]
	return atan2(MAPH / 2.0 - float(b[1]), MAPW / 2.0 - float(b[0]))

func hq_of(team: int):
	for e: E in ents:
		if e.team == team and e.kind == "hq" and not e.dead: return e
	return null

func done(team: int, k: String) -> bool:
	for e: E in ents:
		if e.is_b and e.team == team and e.kind == k and e.built >= 1.0 and not e.dead: return true
	return false

func unit_count(team: int, kind: String) -> int:
	var c := 0
	for e: E in ents:
		if not e.is_b and e.team == team and e.kind == kind: c += 1
	return c

func valid_spot(team: int, kind: String, x: float, y: float) -> int:
	return 1 if br.valid_spot(team, kind, x, y) else 0

func req_met(team: int, k: String) -> bool:
	return br.req_met(team, k)

func pwr_of(team: int) -> Vector2:
	return teams[team].pw if team >= 0 and team < teams.size() else Vector2.ZERO

func pop_used(team: int, _no_q: bool = true) -> int:
	return int(teams[team].pop) if team >= 0 and team < teams.size() else 0

func pop_cap() -> int:
	return int(teams[0].cap) if teams.size() else 0

func prod_time(_T: Dictionary, s: Dictionary) -> float:
	return float(_pt.get(str(s.get("kind", "")), s.get("time", 1.0)))

# ---- supply lines, powers & dig-in parity (KAIZEN steps 5, 6, 7) -------------------------------------------
func _lines_data() -> Dictionary:
	if _lines_lgv != br.lgv or _lines_cache.is_empty():
		_lines_cache = br.lines()
		_lines_lgv = br.lgv
	return _lines_cache

func supply_lines(team: int) -> Array:
	var L := _lines_data()
	var roads: Array = L.get("roads", [])
	var cov_all: Array = L.get("cov", [])
	if team < 0 or team >= cov_all.size() or cov_all[team] == null: return []
	var C: Dictionary = cov_all[team]
	var out: Array = []
	for ei_str in C:
		var ei := int(ei_str)
		if ei < 0 or ei >= roads.size(): continue
		var pts: Array = roads[ei]
		if pts.size() < 2: continue
		var seg: Dictionary = C[ei_str]
		var v: Array = seg.get("v", [])
		var d: Array = seg.get("d", [])
		if not v.is_empty(): out.append({pts = pts, cut = false})
		if not d.is_empty(): out.append({pts = pts, cut = true})
	return out

func supply_points() -> Array:
	var out: Array = []
	var SR: Dictionary = R.SUP_R
	for i in teams.size(): out.append([])
	for e: E in ents:
		if e.dead or not e.is_b or e.team < 0 or e.team >= teams.size() or e.built < 1.0: continue
		if R.SUP_NOB.has(e.kind): continue
		var rad := float(SR.hq) if e.kind == "hq" else (float(SR.depot) if e.kind == "depot" else float(SR.base))
		out[e.team].append(Vector3(e.x, e.y, rad))
	return out

func gp_points(team: int) -> int:
	if team < 0 or team >= teams.size(): return 0
	var T: Dictionary = teams[team]
	return maxi(0, int(T.rank) - int(T.get("spent", 0)))

func gpow_has(team: int, key: String) -> bool:
	if team < 0 or team >= teams.size(): return false
	for p in teams[team].get("powers", []):
		if str(p.get("k", "")) == key: return true
	return false

func power_list(team: int) -> Array:
	if team < 0 or team >= teams.size(): return []
	var T: Dictionary = teams[team]
	var out: Array = []
	if int(T.get("charge_max", 0)) > 0:
		var rdy := clampf(float(T.charge) / maxf(1.0, float(T.charge_max)), 0.0, 1.0)
		out.append({key = "sup", name = "Strike", desc = "Strategic Strike", ready = rdy})
	for p in T.get("powers", []):
		var k := str(p.get("k", ""))
		var desc := str(T.F.gpow.get(k, {}).get("desc", ""))
		var rdy := 1.0 if bool(p.get("ready", false)) else clampf(1.0 - float(p.get("left", 0)) / 90.0, 0.0, 0.99)
		out.append({key = k, name = str(p.get("name", k)), desc = desc, ready = rdy})
	return out

func dig_in() -> bool:
	return true

func info() -> Dictionary:
	var per: Array = []
	for a in br.teams: per.append({fac = a.nation, units = int(a.units), blds = int(a.blds), credits = int(a.credits), built = 0, lost = int(a.lost), kills = int(a.kills), out = bool(a.out)})
	return {t = t, over = over, winner = winner, ents = ents.size(), proj = proj.size(), per = per}

## the old GDScript order shapes -> the JS game's act() objects; anything else is passed through unchanged
func apply_order(o: Dictionary) -> bool:
	var team := int(o.get("team", 0))
	var j: Dictionary
	match str(o.get("t", "")):
		"move": j = {t = "go", ids = o.get("ids", []), x = float(o.x), y = float(o.y)}
		"amove": j = {t = "go", mode = "amove", ids = o.get("ids", []), x = float(o.x), y = float(o.y)}
		"line": j = {t = "line", ids = o.get("ids", []), x = float(o.x), y = float(o.y), x2 = float(o.x2), y2 = float(o.y2)}
		"guard": j = {t = "def", ids = o.get("ids", []), x = float(o.x), y = float(o.y)}
		"force": j = {t = "go", mode = "amove", ids = o.get("ids", []), x = float(o.x), y = float(o.y)}
		"stop": j = {t = "stop", ids = o.get("ids", [])}
		"digin": j = {t = "dig", ids = o.get("ids", [])}
		"enter":
			var tg_id := int(o.get("target", 0))
			var tg_e = by_id.get(tg_id)
			if tg_e != null and tg_e.is_b and (tg_e.kind == "tunnel" or tg_e.kind == "fort"):
				j = {t = "tun", ids = o.get("ids", []), tid = tg_id}
			elif tg_e != null and not tg_e.is_b:
				j = {t = "board", ids = o.get("ids", []), tid = tg_id}
			else:
				j = {t = "go", ids = o.get("ids", []), x = float(o.get("x", 0)), y = float(o.get("y", 0))}
		"unload":
			var ids: Array = o.get("ids", [])
			var tid := int(ids[0]) if ids.size() > 0 else 0
			var te = by_id.get(tid)
			var has_xy := o.has("x") and o.has("y")
			if te != null and te.kind == "garrison":
				j = {t = "ungar", tid = tid, at = 1 if has_xy else 0, x = float(o.get("x", 0)), y = float(o.get("y", 0))}
			else:
				j = {t = "unl", tid = tid, at = 1 if has_xy else 0, x = float(o.get("x", 0)), y = float(o.get("y", 0))}
		"attack":
			var tg := int(o.target)
			j = {t = "atkOil", ids = o.get("ids", []), fi = tg - Bridge.OIL_ID} if tg >= Bridge.OIL_ID else {t = "atk", ids = o.get("ids", []), tid = tg}
		"build": j = {t = "bld", k = str(o.kind), x = float(o.x), y = float(o.y), dz = int(o.get("dz", 0))}
		"train": j = {t = "q", k = str(o.kind), tid = int(o.get("bid", 0))}
		"cancel", "cancel_train": j = {t = "dq", k = str(o.kind), tid = int(o.get("bid", 0))}
		"research": j = {t = "up", k = str(o.kind)}
		"rally": j = {t = "rally", ids = [int(o.bid)], x = float(o.x), y = float(o.y)}
		"sell": j = {t = "sell", ids = o.get("ids", [])}
		"repair": j = {t = "rep", ids = o.get("ids", [])}
		"gpow": j = {t = "buy", k = str(o.kind)}
		"power":
			if str(o.kind) == "sup": j = {t = "sup", x = float(o.x), y = float(o.y)}
			else: j = {t = "pow", k = str(o.kind), x = float(o.x), y = float(o.y)}
		"ldr": j = {t = "ldr", k = "a" if int(o.get("n", 0)) == 0 else "u", x = float(o.get("x", 0)), y = float(o.get("y", 0))}
		_:
			j = o.duplicate(); j.erase("team")
	br.order(team, j)
	return true
