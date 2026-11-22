## Adapter: gives the battle scene the same interface the old GDScript sim (res://sim/sim.gd) had, on top of the
## JS-sim bridge (sim_bridge.gd). battle.gd keeps reading sim.ents / sim.teams / sim.t ... and calling sim.apply_order;
## everything comes from the browser game's JavaScript simulation. New code (visuals P4, UI P6, audio P5) should read
## `sim.br` directly (typed arrays + events, res://bridge/README.md) - the per-entity objects here are for the old code.
extends RefCounted

const Bridge = preload("res://bridge/sim_bridge.gd")
const E = preload("res://sim/sim_ent.gd")

var br := Bridge.new()
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

func available() -> bool:
	return br.available()

## players = [{fac, ai, tm}] (the old Sim.init shape); the map comes from the JS sim (any of its maps)
func init(map_key, players: Array, seed_value: int = 1, difficulty: int = 1, _rules: Dictionary = {}) -> bool:
	if not br.available(): push_error(Bridge.WEB_ONLY); return false
	T_ = br.tables()
	var ps: Array = []
	for p in players: ps.append({nation = str(p.fac), ai = bool(p.get("ai", true)), team = int(p.get("tm", ps.size()))})
	var r := br.new_game({map = str(map_key), seed = seed_value, diff = difficulty, players = ps})
	if not int(r.get("ok", 0)): push_error(str(r.get("error", "new game failed"))); return false
	map = br.map_data()
	# the old scene code types these as Array
	map.grid = Array(map.grid); map.cover = Array(map.cover); map.wood = Array(map.wood)
	if map.get("hgrid") != null: map.hgrid.a_f = map.hgrid.a; map.hgrid.a = Array(map.hgrid.a)
	if map.get("road") != null: map.road.d = Array(map.road.d)
	MAPW = float(map.MAPW); MAPH = float(map.MAPH); CELL = int(map.CELL); GW = int(map.GW); GH = int(map.GH)
	bases = map.bases
	if map.get("hgrid") != null: _hg = map.hgrid.a_f; _hg_R = float(map.hgrid.R); _hg_w = int(map.hgrid.w); _hg_h = int(map.hgrid.h)
	fields = []
	for f in map.fields: fields.append({x = float(f.x), y = float(f.y), r = float(f.r), amt = float(f.amt)})
	oil = []
	for o in map.oil: oil.append({x = float(o.x), y = float(o.y), tb = o.tb, pw = int(o.pw), owner = -1, dead = false, hp = 1.0, max = 1.0, i = oil.size()})
	_facs = []
	for p in ps: _facs.append(p.nation)
	ents = []; by_id = {}; events = []
	_sync()
	return true

func step_n(k: int = 2) -> void:
	br.step(k)
	events.append_array(br.events)
	_sync()

func step() -> void:
	step_n(1)

func take_events() -> Array:
	var e := events; events = []; return e

func _sync() -> void:
	t = br.t; over = br.over; winner = br.winner
	# teams
	var NT := br.teams.size()
	if teams.size() != NT:
		teams = []
		for i in NT:
			var ru := br.rules(str(br.teams[i].nation))
			teams.append({id = i, fac = str(br.teams[i].nation), F = {name = ru.get("name", ""), roster = ru.get("roster", {}) if ru.get("roster") != null else {}, special = ru.get("special", "")}})
	for i in NT:
		var a: Dictionary = br.teams[i]; var T: Dictionary = teams[i]
		T.tm = int(a.team); T.credits = float(a.credits); T.rank = int(a.rank); T.out = bool(a.out); T.ai = a.ai
		T.kills = int(a.kills); T.lost = int(a.lost); T.built = 0; T.pw = Vector2(a.power_make, a.power_use); T.pop = int(a.pop); T.cap = int(a.cap); T.row = a
	# entities
	var a := br.ent; var S := Bridge.ENT_STRIDE; var kinds: Array = T_.kinds
	var live := {}
	var out: Array = []
	for i in br.n:
		var o := i * S
		var id := int(a[o]); var fl := int(a[o + 9]); var tm := int(a[o + 2])
		if id >= Bridge.OIL_ID:
			var row: Dictionary = oil[id - Bridge.OIL_ID]
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
		live[id] = true
		e.team = tm
		e.x = a[o + 3]; e.y = a[o + 4]; e.ang = a[o + 6]; e.va = e.ang; e.tang = a[o + 7]
		e.max = a[o + 17]; e.hp = a[o + 8] * e.max; e.rank = int(a[o + 11]); e.size = a[o + 15]; e.r = e.size / 2.0 if e.is_b else e.size
		e.built = a[o + 13] if e.is_b else 1.0
		e.v = 0.0 if e.is_b else a[o + 13] * e.s_spd
		e.am = a[o + 10]; e.amx = 1.0 if a[o + 10] >= 0 else 0.0
		e.rout = t + 1.0 if (fl & Bridge.F_ROUT) else 0.0
		e.sup = 1 if (fl & Bridge.F_SUPPLIED) else 0
		e.building = (fl & Bridge.F_WORKING) != 0
		e.dis = t + 1.0 if (fl & Bridge.F_NOPOWER) else 0.0
		e.sell = 1.0 if (fl & Bridge.F_SELLING) else 0.0
		e.rep = 1 if (fl & Bridge.F_REPAIRING) else 0
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
	return teams[team].pw

func pop_used(team: int, _no_q: bool = true) -> int:
	return int(teams[team].pop)

func pop_cap() -> int:
	return int(teams[0].cap) if teams.size() else 0

func prod_time(_T: Dictionary, s: Dictionary) -> float:
	return float(_pt.get(str(s.get("kind", "")), s.get("time", 1.0)))

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
		"attack":
			var tg := int(o.target)
			j = {t = "atkOil", ids = o.get("ids", []), fi = tg - Bridge.OIL_ID} if tg >= Bridge.OIL_ID else {t = "atk", ids = o.get("ids", []), tid = tg}
		"build": j = {t = "bld", k = str(o.kind), x = float(o.x), y = float(o.y), dz = int(o.get("dz", 0))}
		"train": j = {t = "q", k = str(o.kind), tid = int(o.get("bid", 0))}
		"cancel", "cancel_train": j = {t = "dq", k = str(o.kind), tid = int(o.get("bid", 0))}
		"research": j = {t = "up", k = str(o.kind)}
		"rally": j = {t = "rally", ids = [int(o.bid)], x = float(o.x), y = float(o.y)}
		"repair": j = {t = "rep", ids = o.get("ids", [])}
		_:
			j = o.duplicate(); j.erase("team")
	br.order(team, j)
	return true
