## WW3 battle simulation - pure logic, no rendering. Translation of the browser game's Battle rules
## (src/03-sim.js simUpdate and friends, src/02-map.js routes, src/01-data.js rules via godot/data/rules.json).
##
## Use:
##   var Sim = preload("res://sim/sim.gd")
##   var sim = Sim.new()
##   sim.init(map_dict, [{fac="IR", ai=true}, {fac="US", ai=true}], seed, diff)
##   sim.step()                      # one fixed tick (1/60 s), like simUpdate(1/60)
##   sim.apply_order({...})          # player commands (see apply_order)
##   sim.ents / sim.teams / sim.oil / sim.fields / sim.proj   # read-only state for the renderer
##
## Deterministic: one seeded RNG (sim_rng.gd = the JS mulberry32), same update order as the JS (alternating unit-loop
## direction per tick, one AI think per tick, vision every 0.2 s, end check every 1 s).
## What is and isn't ported yet: see orch/HANDOFF-godot-sim.md.
extends RefCounted

const E = preload("res://sim/sim_ent.gd")
const Nav = preload("res://sim/sim_nav.gd")
const Rng = preload("res://sim/sim_rng.gd")
const AI = preload("res://sim/sim_ai.gd")

const DT := 1.0 / 60.0
const HC := 160
const VISMAX := 420.0
const _EMPTY: Array = []
const TANG_CLS := ["tank", "arty", "aa", "ship", "boat"]

var R: Dictionary              # rules.json
var nav                        # SimNav
var rng                        # SimRng
var ai                         # SimAI
var t: float = 0.0
var up_n: int = 0
var nid: int = 1
var ents: Array = []           # Array[SimEnt]
var by_id: Dictionary = {}
var teams: Array = []          # Array[Dictionary]
var proj: Array = []
var fields: Array = []
var oil: Array = []
var bases: Array = []
var cover: PackedByteArray
var hgrid: PackedFloat32Array
var hg_R: float = 10.0
var hg_w: int = 0
var hg_h: int = 0
var MAPW: float = 0.0
var MAPH: float = 0.0
var CELL: int = 40
var GW: int = 0
var GH: int = 0
var over: bool = false
var winner: int = -1
var battle: bool = true
var bs: float = 1.0
var diff: int = 1
var pf_tok: float = 12.0
var pf_ms: float = 0.0
var pf_n: int = 0
var vis_t: float = 0.0
var end_t: float = 3.0
var sup_t: float = 0.0
var pw_t: float = 0.0
var ai_tt: Array = []
var bdirty: bool = true
var log_lines: Array = []
var keep_log: bool = false
# spatial hash (buildHash / nearby): flat array of cells, HOT PATH
var hw: int = 0
var hn: int = 0
var hA: Array = []
var hO: Dictionary = {}
var bmax_h: float = 0.0
var _nb_cv: Array = []
var _nb_av: Array = []
var _nb_ne: Array = []
var _nb_fu: Array = []
var _nb_rz: Array = []
var _nb_mo: Array = []
var _nb_oil: Array = []
var _nb_vis: Array = []
# separate(): flat unit grid buffers + building grid (rebuilt only when the set of buildings changes)
var _sep_st := PackedInt32Array()
var _sep_cel := PackedInt32Array()
var _sep_ord := PackedInt32Array()
var _sep_fill := PackedInt32Array()
var _bg: Dictionary = {}
var _bg_sig: float = -1.0
var rmax: float = 20.0
# profiling (ms per section, summed)
var prof: Dictionary = {}
var do_prof: bool = false

# ------------------------------------------------------------------------------------------------ setup
func init(map: Dictionary, players: Array, seed_value: int = 1, difficulty: int = 1, rules: Dictionary = {}) -> void:
	R = rules if rules.size() else load_json("res://data/rules.json")
	rng = Rng.new(seed_value)
	nav = Nav.new(); nav.setup(map)
	MAPW = float(map.MAPW); MAPH = float(map.MAPH); CELL = int(map.CELL); GW = int(map.GW); GH = int(map.GH)
	hw = int(ceil(MAPW / HC)) + 2
	hn = hw * (int(ceil(MAPH / HC)) + 3)
	hA.resize(hn)
	for i in hn: hA[i] = []
	cover = PackedByteArray(); cover.resize(GW * GH)
	var cv: Array = map.cover
	for i in GW * GH: cover[i] = int(cv[i])
	if map.get("hgrid") != null:
		var H: Dictionary = map.hgrid
		hg_R = float(H.R); hg_w = int(H.w); hg_h = int(H.h)
		hgrid = PackedFloat32Array(); var ha: Array = H.a; hgrid.resize(ha.size())
		for i in ha.size(): hgrid[i] = float(ha[i])
	bases = map.bases
	diff = difficulty
	bs = float(R.BATTLE)
	for f in map.fields: fields.append({x = float(f.x), y = float(f.y), r = float(f.r), amt = float(f.amt)})
	var N := players.size()
	for o in map.oil:
		var row := {x = float(o.x), y = float(o.y), tb = o.tb, pw = int(o.pw), owner = -1, cp = [], inc = 0.0, dead = false, burn = 0.0, hit = -99.0, i = oil.size()}
		for k in N: row.cp.append(0.0)
		row.hp = float(R.TB_HP) if o.tb != null else float(R.OIL_HP); row.max = row.hp
		var tg := E.new(); tg.is_b = true; tg.kind = "techb" if o.tb != null else "derrick"; tg.team = -1; tg.x = row.x; tg.y = row.y; tg.r = 18; tg.size = 36
		tg.s = {name = "Oil derrick", armor = "bld"}; tg.oil = row.i; tg.hp = row.hp; tg.max = row.max; tg.cache_stats()
		tg.vs = PackedByteArray(); tg.vs.resize(16); tg.vs.fill(1)
		row.tg = tg
		oil.append(row)
	for i in N:
		var p: Dictionary = players[i]
		teams.append(mk_team(i, str(p.fac), bool(p.get("ai", true)), int(p.get("tm", 100 + i))))
	ai = AI.new(self)
	for i in N:
		var b: Array = bases[i]
		var bx := float(b[0]); var by := float(b[1])
		var a := base_facing(i); var cx := cos(a); var cy := sin(a)
		add_bld(i, "hq", bx, by, true)
		add_unit(i, "harv", bx + cx * 150 - cy * 60, by + cy * 150 + cx * 60)
		add_unit(i, "dozer", bx + cx * 120 - cy * 110, by + cy * 120 + cx * 110)
		add_unit(i, "inf", bx + cx * 130 + cy * 90, by + cy * 130 - cx * 90)
		add_unit(i, "inf", bx + cx * 150 + cy * 70, by + cy * 150 - cx * 70)

static func load_json(p: String) -> Dictionary:
	var f := FileAccess.open(p, FileAccess.READ)
	if f == null: push_error("cannot open " + p); return {}
	return JSON.parse_string(f.get_as_text())

func mk_team(i: int, fac: String, is_ai: bool, tm: int) -> Dictionary:
	var F: Dictionary = R.factions[fac]
	var T := {id = i, fac = fac, F = F, credits = roundf(3000.0 * (1 + (bs - 1) * 0.8) / 100.0) * 100.0, tm = tm, upg = {}, rq = {}, rally = null,
		built = 0, lost = 0, kills = 0, gxp = 0.0, rank = 1, out = false, pw_low = 0, uk = {}, ut = {}, earned = 0.0, spent = 0.0,
		ms = R.MSTYLES[F.morale], ai = null}
	if is_ai: T.ai = {d = diff, t = 0, bi = 0, rq = 0, nf = 0, re = null, wave = float(R.DIFF[diff].wave) * bs, inc = float(R.DIFF[diff].inc), foe = null, dep_f = null, op = null}
	return T

func base_facing(team: int) -> float:
	var b: Array = bases[team] if team < bases.size() else bases[0]
	return atan2(MAPH / 2.0 - float(b[1]), MAPW / 2.0 - float(b[0]))

func stats(fac: String, kind: String) -> Dictionary:
	var u: Dictionary = R.factions[fac].units
	return u.get(kind, {})

func bstats(fac: String, kind: String) -> Dictionary:
	var b: Dictionary = R.factions[fac].blds
	return b.get(kind, {})

func add_unit(team: int, kind: String, x: float, y: float) -> E:
	var T: Dictionary = teams[team]
	var s := stats(T.fac, kind)
	if s.is_empty(): return null
	var a := base_facing(team)
	var u := E.new()
	u.id = nid; nid += 1
	u.team = team; u.kind = kind; u.s = s; u.x = x; u.y = y; u.ang = a; u.va = a; u.tang = a
	u.r = float(s.get("r", 8)); u.cache_stats()
	u.max = roundf(float(s.hp) * upg_k(T, kind, "hp")); u.hp = u.max
	u.vs = PackedByteArray(); u.vs.resize(teams.size())
	if u.s_cls == "inf" and tb_held(team, "hosp"): u.rank = 1; u.xp = maxf(300.0, u.s_cost)
	ents.append(u); by_id[u.id] = u
	return u

func add_bld(team: int, kind: String, x: float, y: float, done_: bool) -> E:
	var T: Dictionary = teams[team]
	var s := bstats(T.fac, kind)
	var b := E.new()
	b.id = nid; nid += 1
	b.is_b = true; b.team = team; b.kind = kind; b.s = s; b.x = x; b.y = y; b.size = float(s.size); b.r = b.size / 2.0
	b.max = float(s.hp); b.hp = b.max if done_ else b.max * 0.1; b.built = 1.0 if done_ else 0.0; b.ang = base_facing(team)
	b.cache_stats()
	b.vs = PackedByteArray(); b.vs.resize(teams.size())
	bdirty = true
	ents.append(b); by_id[b.id] = b
	return b

# ------------------------------------------------------------------------------------------------ small helpers
func log_msg(team: int, msg: String) -> void:
	if keep_log: log_lines.append("%.1f [%d] %s" % [t, team, msg])

func ally(a: int, b: int) -> bool:
	if a == b: return true
	if a < 0 or b < 0 or a >= teams.size() or b >= teams.size(): return false
	return teams[a].tm == teams[b].tm

func seen_by(team: int, e: E) -> bool:
	return e.team == team or (team >= 0 and team < e.vs.size() and e.vs[team] != 0)

func dist(a, b) -> float:
	return sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))

static func hyp(dx: float, dy: float) -> float:
	return sqrt(dx * dx + dy * dy)

static func ang_diff(a: float, b: float) -> float:
	return fmod(b - a + PI * 3.0, PI * 2.0) - PI

static func lerp_a(a: float, b: float, k: float) -> float:
	var d := fmod(b - a + PI * 3.0, PI * 2.0) - PI
	return a + d * minf(1.0, k)

func rnd(a: float, b: float) -> float:
	return rng.rnd(a, b)

func dom_of(u: E) -> int:
	return Nav.dom_id(u.s_dom)

func ms_of(T: Dictionary) -> Dictionary:
	return T.ms

func done(team: int, k: String) -> bool:
	for e: E in ents:
		if e.is_b and e.team == team and e.kind == k and e.built >= 1.0 and not e.dead: return true
	return false

func working(team: int, k: String) -> bool:
	for e: E in ents:
		if e.is_b and e.team == team and e.kind == k and e.built >= 1.0 and not e.dead and not (e.dis > t): return true
	return false

func req_met(team: int, k: String) -> bool:
	var s := bstats(teams[team].fac, k)
	var rq = s.get("req")
	if k == "uplink": rq = "airfield"
	return rq == null or done(team, str(rq))

func upg_match(c: String, s: Dictionary, b: bool) -> bool:
	if b: return c == "bld"
	match c:
		"all": return true
		"inf": return s.get("armor") == "light" and s.get("dom") == "ground"
		"rifle": return s.get("kind") == "inf"
		"atinf": return s.get("cls") == "at"
		"veh": return s.get("armor") == "heavy" and s.get("dom") == "ground"
		"tank", "arty", "aa", "drone", "heli", "jet", "ship", "boat": return s.get("cls") == c
		"air": return s.get("dom") == "air"
		"naval": return s.get("dom") == "naval"
	return false

## upgAgg/upgK: every finished upgrade folded into one multiplier per stat, cached per team and kind
func upg_k(T: Dictionary, kind: String, st: String) -> float:
	var c: Dictionary = T.uk
	if not c.has(kind):
		var r := {hp = 1.0, dmg = 1.0, taken = 1.0, mis = 1.0, rng = 1.0, rof = 1.0, spd = 1.0, build = 1.0, splash = 1.0, regen = 0.0, courage = 1.0}
		var f: Dictionary = T.F
		var b: bool = not f.units.has(kind) and f.blds.has(kind)
		var s: Dictionary = f.blds[kind] if b else f.units.get(kind, {})
		for k in T.upg:
			var U = f.upg.get(k)
			if U == null or U.get("fx") == null: continue
			for fx in U.fx:
				var stn: String = fx[0]
				if not r.has(stn) or not upg_match(str(fx[1]), s, b): continue
				if stn == "regen": r[stn] += float(fx[2])
				else: r[stn] *= float(fx[2])
		c[kind] = r
	return c[kind][st]

func upg_t(T: Dictionary, st: String) -> float:
	var c: Dictionary = T.ut
	if c.has(st): return c[st]
	var v := 0.0 if st == "salvage" else 1.0
	for k in T.upg:
		var U = T.F.upg.get(k)
		if U == null or U.get("fx") == null: continue
		for fx in U.fx:
			if fx[0] == st:
				if st == "salvage": v += float(fx[2])
				else: v *= float(fx[2])
	c[st] = v
	return v

func tb_held(team: int, k: String) -> bool:
	for o in oil:
		if o.tb == k and not o.dead and o.owner == team: return true
	return false

func ground_h(x: float, y: float) -> float:
	if hg_w == 0: return 0.0
	var fx := clampf(x / hg_R, 0.0, hg_w - 1.001); var fy := clampf(y / hg_R, 0.0, hg_h - 1.001)
	var i := int(fx); var j := int(fy); var tx := fx - i; var ty := fy - j; var k := j * hg_w + i
	return (hgrid[k] * (1 - tx) + hgrid[k + 1] * tx) * (1 - ty) + (hgrid[k + hg_w] * (1 - tx) + hgrid[k + hg_w + 1] * tx) * ty

func cover_kind(x: float, y: float) -> int:
	var cx := floori(x / CELL); var cy := floori(y / CELL); var n := 0
	for j in range(-1, 2):
		for i in range(-1, 2):
			var X := cx + i; var Y := cy + j
			if X >= 0 and Y >= 0 and X < GW and Y < GH: n += cover[Y * GW + X]
	if n >= 2: return 1
	for b: E in nearby(x, y, bmax_h + 34, _nb_cv):
		if b.is_b and not b.dead and b.hp > b.max * 0.35 and absf(b.x - x) < b.size / 2 + 34 and absf(b.y - y) < b.size / 2 + 34: return 1
	return 0

func cover_at(x: float, y: float) -> bool:
	return cover_kind(x, y) > 0

func mass_of(u: E) -> float:
	if u.ms > 0: return u.ms
	var m := 1.0
	if u.s_dom == "ground" and not (u.is_inf and not TANG_CLS.slice(0, 3).has(u.s_cls) and u.kind != "harv" and u.kind != "dozer"):
		m = (12.0 + float(u.s.hp) / 60.0) if u.s_armor == "heavy" else (5.0 + float(u.s.hp) / 120.0)
	if u.s_dom == "naval": m = 40.0
	u.ms = m
	return m

func is_wheeled(u: E) -> bool:
	return R.WHEELED.has(u.kind) or (u.kind == "arty" and u.s.get("rocket", false)) or str(u.s.get("name", "")).contains("Technical")

func can_rout(u: E) -> bool:
	return u.s_dom == "ground" and not u.s_no_attack and u.kind != "hero" and u.kind != "champ" and u.kind != "harv" and u.kind != "dozer" and u.kind != "hacker"

func fearless(T: Dictionary, _u: E) -> bool:
	return T.F.nobreak or float(T.ms.rout) == 0.0

func courage_of(u: E) -> float:
	var T: Dictionary = teams[u.team]; var ms: Dictionary = T.ms
	var c := float(ms.cour) * (1 + 0.12 * u.rank) * upg_k(T, u.kind, "courage")
	if ms.get("home") and u.hm: c *= float(ms.home)
	if ms.get("lone") and u.nsup: c /= float(ms.lone)
	return c

func can_target(s: Dictionary, e: E) -> bool:
	if e == null or e.dead: return false
	var air: bool = not e.is_b and e.s_dom == "air"
	if air: return int(s.get("aa", 0)) >= (2 if e.s_alt == "high" else 1)
	return s.get("ground", true) != false

func eff_on(s: Dictionary, e: E) -> float:
	var w = s.get("wpn")
	if w == null or w == "": return 0.0
	var ar: String = "bld" if e.is_b else e.s_armor
	return float(R.VS.get(w, {}).get(ar, 0.0))

func rng_of(e: E) -> float:
	if e.team < 0: return e.s_rng
	return e.s_rng * upg_k(teams[e.team], e.kind, "rng")

func dmg_out(src: E) -> float:
	if src.is_b: return 1.0
	var T: Dictionary = teams[src.team]
	var m: float = [1.0, 1.2, 1.35, 1.5][src.rank]
	if src.last > t: m *= 1.25
	var ms: Dictionary = T.ms
	if ms.get("sup") and (src.s_cls == "arty" or src.s_dom == "air"): m *= float(ms.sup)
	m *= upg_k(T, src.kind, "dmg")
	return m

func rof_mult(u: E) -> float:
	return upg_k(teams[u.team], u.kind, "rof") * (1.6 if u.supp > 0.5 else 1.0)

func dmg_in(e: E, _wpn: String) -> float:
	if e.team < 0: return 1.0
	var T: Dictionary = teams[e.team]
	if e.is_b: return upg_k(T, e.kind, "taken")
	var m := 0.7 if e.retreat else 1.0
	if e.rout > t: m *= 1.25
	m *= upg_k(T, e.kind, "taken") * float(T.ms.get("taken", 1.0))
	return m

func has_ammo(u: E) -> bool:
	return not u.is_b and u.s_dom == "ground" and u.s_dmg > 0 and u.s_rof > 0 and not u.s_no_attack and u.kind != "harv" and u.kind != "dozer" and u.kind != "hacker"

func ammo_init(u: E) -> void:
	u.amx = float(u.s.get("ammoCap", 100)); u.am = u.amx

func hq_of(team: int):
	for e: E in ents:
		if e.team == team and e.kind == "hq" and not e.dead: return e
	return null

# ------------------------------------------------------------------------------------------------ spatial hash (HOT PATH)
func build_hash() -> void:
	for i in hn:
		var L: Array = hA[i]
		if L.size(): L.clear()
	hO.clear()
	var bm := 0.0; var rm := 0.0
	for e: E in ents:
		if e.dead: continue
		if e.is_b:
			if e.size > bm: bm = e.size
		elif e.r > rm: rm = e.r
		var k := floori(e.x / HC) + 1 + (floori(e.y / HC) + 1) * hw
		if k >= 0 and k < hn: hA[k].append(e)
		else:
			if hO.has(k): hO[k].append(e)
			else: hO[k] = [e]
	bmax_h = bm / 2.0; rmax = rm if rm > 0 else 20.0

## out = a reusable buffer of the caller (like the JS NB/NB2/MOR_N... arrays); only leaf loops may pass one
func nearby(x: float, y: float, Rr: float, out: Array = []) -> Array:
	out.clear()
	var x0 := floori((x - Rr) / HC) + 1; var x1 := floori((x + Rr) / HC) + 1
	var y0 := floori((y - Rr) / HC) + 1; var y1 := floori((y + Rr) / HC) + 1
	for cy in range(y0, y1 + 1):
		for cx in range(x0, x1 + 1):
			var k := cx + cy * hw
			if k >= 0 and k < hn: out.append_array(hA[k])
			elif hO.size() and hO.has(k): out.append_array(hO[k])
	return out

# ------------------------------------------------------------------------------------------------ the tick
func step() -> void:
	if over: return
	var dt := DT
	t += dt; up_n += 1
	var t0 := 0
	pf_tok = minf(float(R.PF.BURST), pf_tok + dt * float(R.PF.RATE)); pf_ms = 0.0; pf_n = 0
	if do_prof: t0 = Time.get_ticks_usec()
	production(dt); sell_tick(dt)
	build_hash()
	if do_prof: t0 = _pt("prod+hash", t0)
	var n := ents.size(); var rv := up_n & 1
	for k in n:
		var e: E = ents[n - 1 - k] if rv else ents[k]
		if e.dead: continue
		if e.is_b: upd_bld(e, dt)
		else:
			if e.kind != "jet":
				e.va = lerp_a(e.va, e.ang, dt * 7)
				var tt := e.va
				if e.target != null and not e.target.dead: tt = atan2(e.target.y - e.y, e.target.x - e.x)
				elif e.order != null and e.order.get("target") != null and not e.order.target.dead: tt = atan2(e.order.target.y - e.y, e.order.target.x - e.x)
				e.tang = lerp_a(e.tang, tt, dt * 8)
			upd_unit(e, dt)
			if e.v > 0 and e.vt != t:
				var M: Array = R.MOVE.get(e.s_cls, [4, 80])
				e.v = maxf(0.0, e.v - float(M[1]) * 2.5 * dt)
				if e.v > 1 and e.s_dom != "air":
					var nx := e.x + cos(e.hd) * e.v * dt; var ny := e.y + sin(e.hd) * e.v * dt
					if nav.pass_xy(dom_of(e), nx, ny): e.x = nx; e.y = ny; e.mv = t
	if do_prof: t0 = _pt("units", t0)
	upd_proj(dt)
	separate()
	if do_prof: t0 = _pt("proj+separate", t0)
	upd_oil(dt); battle_power(dt); upd_supply(dt)
	if do_prof: t0 = _pt("oil+power+supply", t0)
	var j := 0
	for i in ents.size():
		var e2: E = ents[i]
		if not e2.dead: ents[j] = e2; j += 1
	ents.resize(j)
	# one AI thinks per tick (seat fairness: the starting team rotates)
	if ai_tt.is_empty():
		for i in teams.size(): ai_tt.append(i * 0.13)
	var thought := false
	var NT := teams.size()
	for qq in NT:
		var T: Dictionary = teams[(qq + up_n) % NT]
		if T.ai != null and not T.out:
			ai_tt[T.id] -= dt
			if ai_tt[T.id] <= 0 and not thought:
				thought = true; ai_tt[T.id] = float(R.DIFF[T.ai.d].think)
				ai.think(T)
	if do_prof: t0 = _pt("ai", t0)
	vis_t -= dt
	if vis_t <= 0: vis_t = 0.2; update_vis()
	if do_prof: t0 = _pt("vision", t0)
	end_t -= dt
	if end_t <= 0: end_t = 1.0; check_end()

func _pt(k: String, t0: int) -> int:
	var t1 := Time.get_ticks_usec()
	prof[k] = prof.get(k, 0.0) + (t1 - t0) / 1000.0
	return t1

# ------------------------------------------------------------------------------------------------ production & building
func prod_blds(team: int, cat: String) -> Array:
	var r: Array = []
	for e: E in ents:
		if e.is_b and e.team == team and e.kind == cat and e.built >= 1.0 and not e.dead: r.append(e)
	return r

func q_items(T: Dictionary, cat: String) -> Array:
	var r: Array = []
	for e: E in prod_blds(T.id, cat): r.append_array(e.q)
	return r

func q_pick(team: int, cat: String):
	var best = null; var bsc := 1e9
	for e: E in prod_blds(team, cat):
		var n2 := e.q.size() + (50 if e.dis > t else 0)
		if n2 < bsc: bsc = n2; best = e
	return best

func unit_count(team: int, kind: String) -> int:
	var n := 0
	for e: E in ents:
		if not e.is_b and e.team == team and e.kind == kind: n += 1
	var s := stats(teams[team].fac, kind)
	for it in q_items(teams[team], str(s.get("from", ""))):
		if it.kind == kind: n += 1
	return n

func pop_of(s: Dictionary) -> int:
	return int(s.get("pop", 1))

func pop_cap() -> int:
	return int(R.POP_CAP_SMALL) if teams.size() <= 4 else int(R.POP_CAP)

func pop_used(team: int, no_q: bool) -> int:
	var n := 0
	for e: E in ents:
		if not e.is_b and not e.dead and e.team == team: n += pop_of(e.s)
	if not no_q:
		for c in R.CATS:
			for it in q_items(teams[team], c): n += pop_of(stats(teams[team].fac, it.kind))
	return n

func pop_full(T: Dictionary, kind: String, no_q: bool) -> bool:
	return pop_used(T.id, no_q) + pop_of(stats(T.fac, kind)) > pop_cap()

func prod_time(T: Dictionary, s: Dictionary) -> float:
	var tt := float(s.time) / (1 + bs * 0.6 - 0.6)
	if s.get("from") != "hq": tt *= float(T.F.econLight[0])
	tt *= upg_k(T, str(s.kind), "build")
	return tt

func enqueue(team: int, kind: String, bid: int = 0) -> bool:
	var T: Dictionary = teams[team]
	var s := stats(T.fac, kind)
	if s.is_empty(): return false
	if kind == T.F.special and int(T.rank) < 2: return false
	var cst := roundf(float(s.cost))
	if T.credits < cst or not done(team, str(s.from)): return false
	if s.get("limit") and unit_count(team, kind) >= int(s.limit): return false
	var b = null
	if bid:
		var o = by_id.get(bid)
		if o != null and o.is_b and o.team == team and o.kind == s.from and o.built >= 1.0 and not o.dead: b = o
	if b == null: b = q_pick(team, str(s.from))
	if b == null: return false
	if pop_full(T, kind, false): return false
	T.credits -= cst; T.spent += cst
	b.q.append({kind = kind, t = 0.0, c = cst})
	return true

func production(dt: float) -> void:
	for b: E in ents:
		if not b.is_b or b.q.is_empty(): continue
		if b.dead: q_refund(b); continue
		if b.built < 1.0 or b.dis > t or b.sell > 0: continue
		var T: Dictionary = teams[b.team]
		var it: Dictionary = b.q[0]
		var s := stats(T.fac, it.kind)
		it.t += dt
		if it.t >= prod_time(T, s):
			if pop_full(T, it.kind, true): it.t = prod_time(T, s); continue
			b.q.pop_front(); spawn_from(T, b, it.kind)
	for T in teams:
		for cat in T.rq.keys():
			var r = T.rq[cat]
			if r == null: continue
			if not working(T.id, cat): continue
			r.t += DT
			if r.t >= float(T.F.upg[r.key].time):
				T.rq[cat] = null; T.upg[r.key] = true; T.uk = {}; T.ut = {}
				for e: E in ents:
					if not e.is_b and e.team == T.id:
						var nm := roundf(float(e.s.hp) * upg_k(T, e.kind, "hp"))
						if nm != e.max: e.hp *= nm / e.max; e.max = nm

func q_refund(b: E) -> void:
	var T: Dictionary = teams[b.team]; var sum := 0.0
	for it in b.q: sum += float(it.c)
	b.q = []
	T.credits += sum

func spawn_from(T: Dictionary, b: E, kind: String) -> void:
	var s := stats(T.fac, kind)
	var a := atan2(MAPH / 2 - b.y, MAPW / 2 - b.x)
	var x := b.x + cos(a) * (b.size / 2 + 16); var y := b.y + sin(a) * (b.size / 2 + 16)
	if s.get("dom") == "naval": return   # navy not ported (no water battle maps in the 4-nation slice)
	if s.get("dom") == "ground":
		var p = nav.nearest_pass_xy(Nav.DOM_GROUND, x, y)
		if p != null: x = p.x; y = p.y
	var u := add_unit(T.id, kind, x, y)
	if u == null: return
	T.built += 1
	if kind == "jet":
		u.state = "park"; u.ang = -1.57; u.va = -1.57
	elif kind != "harv":
		var Rl = b.rally if b.rally != null else T.rally
		if Rl == null: Rl = {x = b.x + cos(a) * (b.size / 2 + 70), y = b.y + sin(a) * (b.size / 2 + 70)}
		set_move(u, Rl.x + rnd(-35, 35), Rl.y + rnd(-35, 35), "move")

func start_research(team: int, key: String) -> bool:
	var T: Dictionary = teams[team]; var U = T.F.upg.get(key)
	if U == null or T.upg.has(key): return false
	if T.rq.get(U.at) != null or not done(team, U.at) or T.credits < float(U.cost): return false
	for r in T.rq.values():
		if r != null and r.key == key: return false
	T.credits -= float(U.cost); T.spent += float(U.cost)
	T.rq[U.at] = {key = key, t = 0.0}
	return true

const ZONE_R := 460.0
const FRONT_R := 620.0
const ONSITE_R := 360.0
const VS_OFF := [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]

func valid_spot(team: int, kind: String, x: float, y: float) -> int:
	var s := bstats(teams[team].fac, kind); var size := float(s.size); var h := size / 2
	if x < h + 10 or y < h + 10 or x > MAPW - h - 10 or y > MAPH - h - 10: return 0
	for o in VS_OFF:
		var cx := floori((x + o[0] * h) / CELL); var cy := floori((y + o[1] * h) / CELL)
		if nav.grid[cy * GW + cx] != 0: return 0
	var lo := 1e9; var hi := -1e9
	for o in VS_OFF:
		var g := ground_h(x + o[0] * h, y + o[1] * h); lo = minf(lo, g); hi = maxf(hi, g)
	if hi - lo > 7: return 0
	var enemy := 1e9
	var dz: Array = []
	for e: E in ents:
		if e.dead: continue
		if e.is_b:
			var g2 := (e.size + size) / 2 + 14
			if absf(e.x - x) < g2 and absf(e.y - y) < g2: return 0
			var d := hyp(e.x - x, e.y - y)
			if e.team != team and not ally(e.team, team) and d < enemy: enemy = d
		elif e.kind == "dozer" and e.team == team: dz.append(e)
	for f in fields:
		if hyp(f.x - x, f.y - y) < f.r + h + (6 if kind == "depot" else 16): return 0
	for o in oil:
		if hyp(o.x - x, o.y - y) < h + 40: return 0
	if dz.is_empty(): return 0
	if enemy < FRONT_R:
		var ok := false
		for u: E in dz:
			if hyp(u.x - x, u.y - y) < ONSITE_R: ok = true
		if not ok: return 0
	return 2

func place_bld(team: int, kind: String, x: float, y: float, dz_id: int = 0) -> bool:
	var T: Dictionary = teams[team]; var s := bstats(T.fac, kind)
	if s.is_empty() or not R.BUILD_ORDER.has(kind) or not req_met(team, kind) or T.credits < float(s.cost): return false
	var m := valid_spot(team, kind, x, y)
	if m == 0: return false
	var b := add_bld(team, kind, x, y, false)
	T.credits -= float(s.cost); T.spent += float(s.cost)
	b.nd = true
	var dz: Array = []
	for u: E in ents:
		if u.kind == "dozer" and u.team == team and not u.dead: dz.append(u)
	var pick = null
	for u: E in dz:
		if u.id == dz_id: pick = u
	if pick == null:
		var idle: Array = []
		for u: E in dz:
			if u.order == null or u.order.type != "build": idle.append(u)
		var L: Array = idle if idle.size() else dz
		pick = L[0]
		for u: E in L:
			if hyp(u.x - x, u.y - y) < hyp(pick.x - x, pick.y - y): pick = u
	pick.bq = []; pick.order = {type = "build", target = b}; pick.has_path = false
	return true

func bld_workers(b: E) -> int:
	var n := 0
	for u: E in ents:
		if u.kind == "dozer" and u.team == b.team and not u.dead and u.order != null and u.order.type == "build" and u.order.target == b and hyp(u.x - b.x, u.y - b.y) < b.size / 2 + 48: n += 1
	return n

func sell_tick(dt: float) -> void:
	for b: E in ents:
		if not b.is_b or b.dead or (b.sell <= 0 and not b.rep): continue
		var T: Dictionary = teams[b.team]
		if b.sell > 0:
			if t >= b.sell:
				var r := floorf(float(b.s.cost) * float(R.SELL_PCT)); T.credits += r; kill(b, -1, null)
			continue
		if b.hp >= b.max or b.built < 1.0: b.rep = 0; continue
		var hh := minf(b.max - b.hp, b.max * dt / float(R.REP_T)); var c := hh / b.max * float(b.s.cost) * float(R.REP_COST)
		if T.credits >= c:
			T.credits -= c; b.hp += hh
			if b.hp >= b.max - 0.01: b.hp = b.max; b.rep = 0

func upd_bld(b: E, dt: float) -> void:
	if b.built < 1.0:
		var wk := bld_workers(b); b.stall = wk < 1
		if b.stall: return
		var bk := 1 + 0.35 * (mini(wk, 4) - 1)
		b.built = minf(1.0, b.built + bk * dt / float(b.s.time))
		b.hp = minf(b.max, b.hp + bk * b.max * 0.9 * dt / float(b.s.time))
		if b.built >= 1.0: log_msg(b.team, "%s complete." % b.s.name)
		return
	if b.dis > t: return
	if b.kind != "turret" and b.kind != "sam" and b.kind != "coast" and b.kind != "tunnel": return
	if b.s_rng <= 0: return
	b.cd -= dt
	var tg = b.target
	if tg != null and (tg.dead or hyp(tg.x - b.x, tg.y - b.y) - tg.r > rng_of(b) or not seen_by(b.team, tg) or not can_target(b.s, tg)): b.target = null
	if b.target == null:
		b.sc_t -= dt
		if b.sc_t <= 0 or b.last_hit > t - dt * 1.5:
			b.sc_t = 0.2 + (b.id % 7) * 0.02; b.target = nearest_enemy(b, rng_of(b))
	if b.target != null:
		b.ang = atan2(b.target.y - b.y, b.target.x - b.x)
		if b.cd <= 0: fire(b, b.target, b.s_dmg, b.s_wpn, 0.0); b.cd = b.s_rof

# ------------------------------------------------------------------------------------------------ units
func set_move(u: E, x: float, y: float, type: String) -> void:
	if u.s_dom != "air":
		var d := dom_of(u)
		var pb: bool = nav.P_B
		if d == Nav.DOM_GROUND: bocc_update(); nav.P_B = true
		var p = nav.nearest_pass_xy(d, x, y)
		nav.P_B = pb
		if p != null: x = p.x; y = p.y
		var qq = reach_xy(u, x, y)
		if qq != null: x = qq.x; y = qq.y
	u.order = {type = type, x = x, y = y}
	u.target = null; u.guard = null; u.has_path = false

func reach_xy(u: E, x: float, y: float):
	var d := dom_of(u)
	if d == Nav.DOM_AIR: return null
	var s0 = nav.nearest_pass(d, floori(u.x / CELL), floori(u.y / CELL)); var g0 = nav.nearest_pass(d, floori(x / CELL), floori(y / CELL))
	if s0 == null or g0 == null: return null
	var Rg: PackedInt32Array = nav.regions(d); var rs := Rg[s0.y * GW + s0.x]
	if rs == 0 or Rg[g0.y * GW + g0.x] == rs: return null
	var qq = nav.nearest_in_region(Rg, rs, g0.x, g0.y)
	return Vector2(qq.x * CELL + CELL / 2.0, qq.y * CELL + CELL / 2.0) if qq != null else null

func bocc_update() -> void:
	if not bdirty: return
	bdirty = false
	var o: PackedByteArray = nav.bocc
	o.fill(0)
	for b: E in ents:
		if not b.is_b or b.dead: continue
		var h := b.size / 2 - CELL * 0.25
		var x0 := ceili((b.x - h) / CELL - 0.5); var x1 := floori((b.x + h) / CELL - 0.5)
		var y0 := ceili((b.y - h) / CELL - 0.5); var y1 := floori((b.y + h) / CELL - 0.5)
		if x0 > x1: x0 = floori(b.x / CELL); x1 = x0
		if y0 > y1: y0 = floori(b.y / CELL); y1 = y0
		for cy in range(y0, y1 + 1):
			for cx in range(x0, x1 + 1):
				if cx >= 0 and cy >= 0 and cx < GW and cy < GH: o[cy * GW + cx] = 1

## stepTo: vehicle-style motion (heading turns at a limited rate, accelerates, brakes, slows to turn)
func step_to(u: E, x: float, y: float, dt: float, fin: bool) -> void:
	if do_prof:
		var t0 := Time.get_ticks_usec()
		_step_to(u, x, y, dt, fin)
		prof["  stepTo"] = prof.get("  stepTo", 0.0) + (Time.get_ticks_usec() - t0) / 1000.0
		return
	_step_to(u, x, y, dt, fin)

func _step_to(u: E, x: float, y: float, dt: float, fin: bool) -> void:
	var want := atan2(y - u.y, x - u.x)
	var dist2 := hyp(x - u.x, y - u.y)
	if u.av_t > t and dist2 > 60: want += u.av_o
	var M: Array = R.MOVE.get(u.s_cls, [4, 80]); var m0 := float(M[0]); var m1 := float(M[1])
	var d := dom_of(u)
	if not u.has_hd or (m0 >= 8 and t - u.vt > 0.3): u.hd = u.ang; u.has_hd = true
	var err := ang_diff(u.hd, want)
	var whl := d == Nav.DOM_GROUND and m0 < 8 and is_wheeled(u)
	var tr := m0 * dt
	if whl:
		tr *= minf(1.25, 0.25 + u.v / maxf(20.0, u.s_spd * 0.45))
		if u.v < 6 and absf(err) > 0.6: u.v = maxf(u.v, 7.0)
	u.hd += clampf(err, -tr, tr)
	var ae := absf(ang_diff(u.hd, want)); var foot := m0 >= 8
	var f := (1.0 if ae < 1.2 else 0.35) if foot else maxf(0.12, cos(minf(ae, 1.45)))
	if whl: f = maxf(0.35, cos(minf(ae, 1.2)))
	var sl := 1.0
	if d == Nav.DOM_GROUND:
		var ca := cos(u.hd); var sa := sin(u.hd); var g0 := ground_h(u.x, u.y); var g1 := ground_h(u.x + ca * 14, u.y + sa * 14); var gr := (g1 - g0) / 14.0
		sl = clampf(1 - gr * (0.9 if foot else 1.6), 0.45, 1.15)
	var T: Dictionary = teams[u.team]
	var top := u.s_spd * f * sl * upg_k(T, u.kind, "spd")
	if d == Nav.DOM_GROUND and nav.on_road(u.x, u.y): top *= float(R.ROAD_W) if whl else float(R.ROAD_T)
	if u.supp > 0.5: top *= 0.6
	if u.order != null and u.order.get("cap") != null: top = minf(top, float(u.order.cap) * f)
	if fin:
		var brake := m1 * 1.4
		top = minf(top, sqrt(2 * brake * maxf(0.0, dist2 - 2)) + 4)
	if u.retreat: top *= 1.15
	if d == Nav.DOM_GROUND and not foot and u.v > 4:
		var la := u.r * 2 + 12; var px2 := u.x + cos(u.hd) * la; var py2 := u.y + sin(u.hd) * la
		for o: E in nearby(px2, py2, 34, _nb_av):
			if o == u or o.dead or o.is_b or o.s_dom != "ground" or (o.order == null and o.team == u.team and u.order != null): continue
			var dx := o.x - px2; var dy := o.y - py2
			if dx * dx + dy * dy > (o.r + u.r * 0.8) * (o.r + u.r * 0.8): continue
			if o.v > 4 and absf(ang_diff(u.hd, o.ang)) < 0.6: top = minf(top, maxf(8.0, o.v * 0.95))
			elif mass_of(o) >= mass_of(u) * 0.5:
				var ah := ang_diff(u.hd, atan2(o.y - u.y, o.x - u.x))
				var sg := signf(ah) if ah != 0 else 1.0
				u.hd -= sg * minf(1.8 * dt, 0.12); top *= 0.75
				if o.v <= 4: u.av_o = -sg * 0.85; u.av_t = t + 0.8
			break
	var acc := (m1 if u.v < top else m1 * 2.2) * dt
	u.v += clampf(top - u.v, -acc, acc); u.vt = t
	var stp := minf(u.v * dt, dist2 + 0.5)
	var nx := u.x + cos(u.hd) * stp; var ny := u.y + sin(u.hd) * stp
	u.ang = u.hd
	if nav.pass_xy(d, nx, ny): u.x = nx; u.y = ny
	elif nav.pass_xy(d, nx, u.y): u.x = nx; u.v *= 0.97
	elif nav.pass_xy(d, u.x, ny): u.y = ny; u.v *= 0.97
	else: u.v *= 0.3; u.hd += 0.6 * dt * (signf(err) if err != 0 else 1.0)
	if stp > 0.01: u.mv = t

func stalled(u: E, o: Dictionary) -> bool:
	var d := hyp(o.x - u.x, o.y - u.y)
	if not is_same(u.so, o): u.so = o; u.sb_d = d; u.sb_t = t; u.srp = 0; return false
	if d < u.sb_d - 4: u.sb_d = d; u.sb_t = t; return false
	var w := t - u.sb_t
	if d < 70 and w > 2.5: return true
	if w > 7 and not u.srp: u.srp = 1; u.has_path = false
	if w > 16: u.srp = 0; return true
	return false

## navTo: route (A*, budgeted per tick) + unstick + stepTo. HOT PATH.
func nav_to(u: E, x: float, y: float, dt: float, fin: bool = false) -> void:
	var d := dom_of(u)
	if d == Nav.DOM_AIR: step_to(u, x, y, dt, fin); return
	var goal_moved: bool = not u.has_path or hyp(u.pgx - x, u.pgy - y) > 60
	if goal_moved or t > u.prt:
		bocc_update()
		if nav.los_b(d, u.x, u.y, x, y):
			u.path = [[x, y]]; u.has_path = true; u.pgx = x; u.pgy = y; u.prt = t + 2.5 + rng.next()
		elif pf_tok >= 1 and pf_n < int(R.PF.N):
			pf_tok -= 1
			if d == Nav.DOM_GROUND: nav.P_B = true
			nav.P_ROAD = u.kind == "harv"
			var fp0 := Time.get_ticks_usec() if do_prof else 0
			var P = nav.smooth_p(d, u.x, u.y, nav.find_path(d, u.x, u.y, x, y))
			if do_prof: prof["  findPath"] = prof.get("  findPath", 0.0) + (Time.get_ticks_usec() - fp0) / 1000.0
			nav.P_ROAD = false; nav.P_B = false
			pf_n += nav.last_iters
			u.path = P if P != null and P.size() else [[x, y]]; u.has_path = true
			u.pgx = x; u.pgy = y; u.prt = t + 2.5 + rng.next()
		elif goal_moved:
			u.v *= 0.85; return
	var sk := 12.0 if float(R.MOVE.get(u.s_cls, [4])[0]) >= 8 else 26.0
	while u.path.size() > 1 and hyp(u.path[0][0] - u.x, u.path[0][1] - u.y) < sk: u.path.pop_front()
	var wp: Array = u.path[0]; var dd := hyp(wp[0] - u.x, wp[1] - u.y)
	if not is_same(u.np_w, wp): u.np_w = wp; u.np_d = dd; u.np_t = t
	elif dd < u.np_d - 3: u.np_d = dd; u.np_t = t
	elif t - u.np_t > 2.5 and dd > 20:
		u.np_t = t
		var base := atan2(wp[1] - u.y, wp[0] - u.x); var sg := 1.0 if (u.id + int(t)) % 2 else -1.0
		var ok = null
		for c in [[1.57 * sg, 45], [-1.57 * sg, 45], [2.3 * sg, 60], [-2.3 * sg, 60], [1.57 * sg, 80]]:
			var x2: float = u.x + cos(base + c[0]) * c[1]; var y2: float = u.y + sin(base + c[0]) * c[1]
			if nav.pass_xy(d, x2, y2) and nav.los(d, u.x, u.y, x2, y2): ok = [x2, y2]; break
		if ok != null: u.path.push_front(ok); u.np_w = ok; u.np_d = 1e9
		u.prt = minf(u.prt, t + 1.2)
	step_to(u, u.path[0][0], u.path[0][1], dt, u.path.size() == 1 and fin)

func nearest_enemy(src: E, rng_: float, s = null, min_eff: float = 0.0) -> E:
	if do_prof:
		var t0 := Time.get_ticks_usec()
		var r := _nearest_enemy(src, rng_, s, min_eff)
		prof["  nearestEnemy"] = prof.get("  nearestEnemy", 0.0) + (Time.get_ticks_usec() - t0) / 1000.0
		return r
	return _nearest_enemy(src, rng_, s, min_eff)

func _nearest_enemy(src: E, rng_: float, s = null, min_eff: float = 0.0) -> E:
	var ss: Dictionary = s if s != null else src.s
	var best: E = null; var bd := 1e9
	var wpn = ss.get("wpn")
	var VSw: Dictionary = R.VS.get(wpn, {}) if wpn != null else {}
	for e: E in nearby(src.x, src.y, rng_ + 60, _nb_ne):
		if e.dead or e.aband or ally(e.team, src.team) or not can_target(ss, e) or not seen_by(src.team, e): continue
		if min_eff > 0 and eff_on(ss, e) < min_eff: continue
		var d := hyp(e.x - src.x, e.y - src.y) - e.r
		if d > rng_: continue
		var sc := d
		if wpn != null:
			var ar: String = "bld" if e.is_b else e.s_armor
			sc -= float(VSw.get(ar, 0.0)) * 90
		sc -= (1 - maxf(0.0, e.hp) / e.max) * 70
		if not e.is_b and e.s_dmg > 0 and can_target(e.s, src): sc -= 35
		if e.is_b: sc += 60 if (e.kind == "turret" or e.kind == "sam" or e.kind == "coast") else 180
		if e.kind == "harv" or e.kind == "dozer": sc += 30
		if sc < bd: bd = sc; best = e
	return best

func friends_under_fire(u: E) -> bool:
	for o: E in nearby(u.x, u.y, 320, _nb_fu):
		if o.dead or o.is_b or o == u or o.team != u.team: continue
		if o.last_hit > t - 2.5 and hyp(o.x - u.x, o.y - u.y) < 320: return true
	return false

func auto_engage(u: E, o, T: Dictionary) -> void:
	if u.s_no_attack or u.rout > t or u.retreat: return
	var base := u.s_aggro * upg_k(T, u.kind, "rng"); var hit := u.last_hit > t - 1.5; var odds := u.odds
	if u.st >= 2 and o == null:
		var rg := rng_of(u); var e = nearest_enemy(u, rg * 0.6 if (u.st == 3 and not hit) else rg)
		if e != null: u.target = e
		return
	if o != null and o.type == "move":
		if o.get("hold") or (u.is_veh and u.hp < u.max * 0.3): return
		if hit and odds <= 0.9:
			var e = nearest_enemy(u, rng_of(u))
			if e != null and eff_on(u.s, e) >= 0.4: u.target = e
			return
		if odds > 1.5: return
		var hq = hq_of(u.team)
		if hq != null and hyp(o.x - hq.x, o.y - hq.y) < hyp(u.x - hq.x, u.y - hq.y) - 200: return
		var e2 = nearest_enemy(u, rng_of(u) + 10, null, 0.5)
		if e2 == null or e2.is_b: return
		if mass_of(u) >= 10 and mass_of(e2) < 2 and hyp(e2.x - u.x, e2.y - u.y) < 160: return
		var ah := atan2(o.y - u.y, o.x - u.x); var ae := atan2(e2.y - u.y, e2.x - u.x)
		if absf(ang_diff(ah, ae)) < 1.05 or hit: u.target = e2
		return
	var help := o == null and friends_under_fire(u)
	var Rr := base + (60 if (o != null or u.st == 1) else 0) + (160 if help else 0)
	var e3 = nearest_enemy(u, Rr)
	if e3 == null: return
	if eff_on(u.s, e3) < 0.35 and not (e3.is_b and u.s_wpn != "gun"):
		var alt = nearest_enemy(u, Rr, null, 0.35)
		if alt != null: e3 = alt
		elif not hit and not (o != null and o.type == "amove") and hyp(e3.x - u.x, e3.y - u.y) - e3.r > rng_of(u) + 10: return
	var d: float = hyp(e3.x - u.x, e3.y - u.y) - e3.r
	if o == null and u.st != 1 and odds > 2.6 and d > rng_of(u) + 10: return
	u.target = e3
	if o == null and u.guard == null: u.guard = {x = u.x, y = u.y}

## unitBrain (Normal AI / player units): retreat when badly hurt, cover hop for infantry under fire, re-pick target,
## kite when outranging, turn the front armour toward the target
func unit_brain(u: E, dt: float, o) -> bool:
	if o != null and o.type == "move" and not o.get("auto"): return false
	u.bt -= dt
	if u.bt <= 0:
		u.bt = 0.9 + rng.next() * 0.3
		var RAI = teams[u.team].ai
		var RD: int = int(R.DIFF[RAI.d].retreat) if RAI != null else 1
		var RH := ((0.5 if u.is_veh else 0.38) if RD > 2 else ((0.4 if u.is_veh else 0.3) if RD > 1 else 0.25))
		if u.hp < u.max * RH and u.rt == 0 and u.s_dom != "air" and t - u.last_hit < 3 and u.target != null and not (RAI != null and RD == 0) and float(teams[u.team].ms.rout) != 0.0:
			var home = null; var hd2 := 1e18
			for b: E in ents:
				if b.is_b and b.team == u.team and not b.dead:
					var q2 := dist(b, u)
					if q2 < hd2: hd2 = q2; home = b
			if home != null and hd2 > 260:
				u.rt = t
				var a := atan2(home.y - u.y, home.x - u.x); var k := minf(480.0, hd2 - 200) if RD > 1 else 260.0
				set_move(u, u.x + cos(a) * k, u.y + sin(a) * k, "move"); u.order.auto = 1
				return true
		if u.rt > 0 and t - u.rt > 12: u.rt = 0
		if u.is_inf and o == null and t - u.last_hit < 1.5 and not cover_at(u.x, u.y) and t - u.cv_t > (3.0 if u.st == 3 else 6.0):
			u.cv_t = t
			var best = null; var bd := 1e9; var cx := floori(u.x / CELL); var cy := floori(u.y / CELL)
			for j in range(-3, 4):
				for i in range(-3, 4):
					var X := cx + i; var Y := cy + j
					if X < 0 or Y < 0 or X >= GW or Y >= GH or cover[Y * GW + X] == 0: continue
					var x2 := X * CELL + CELL / 2.0; var y2 := Y * CELL + CELL / 2.0
					if not cover_at(x2, y2): continue
					var d2 := hyp(x2 - u.x, y2 - u.y)
					if d2 < bd and d2 < 130: bd = d2; best = [x2, y2]
			if best != null:
				set_move(u, best[0], best[1], "move"); u.order.auto = 1; u.guard = {x = best[0], y = best[1]}
				return true
		if u.target != null and (o == null or o.type == "amove"):
			var b2 = nearest_enemy(u, rng_of(u) + 20)
			if b2 != null and b2 != u.target: u.target = b2
	var tg: E = u.target
	if tg == null or tg.dead: return false
	var d := hyp(tg.x - u.x, tg.y - u.y) - tg.r; var Rr := rng_of(u)
	if not tg.is_b and tg.s_rng > 0 and u.s_dom == "ground" and u.s_minr == 0 and Rr > tg.s_rng * 1.3 and d < minf(Rr * 0.6, tg.s_rng + 30) and can_target(tg.s, u):
		var a2 := atan2(u.y - tg.y, u.x - tg.x)
		step_to(u, u.x + cos(a2) * 60, u.y + sin(a2) * 60, dt, false)
		if u.cd <= 0 and absf(ang_diff(u.tang, atan2(tg.y - u.y, tg.x - u.x))) < 0.35:
			fire(u, tg, u.s_dmg * dmg_out(u), u.s_wpn, u.s_splash); u.cd = u.s_rof * rof_mult(u)
		return true
	if u.is_veh and d <= Rr and t - u.mv > 0.4:
		var want := atan2(tg.y - u.y, tg.x - u.x); var M: Array = R.MOVE.get(u.s_cls, [2, 40])
		if not u.has_hd: u.hd = u.ang; u.has_hd = true
		var e := ang_diff(u.hd, want)
		if absf(e) > 0.35:
			var lim := float(M[0]) * 0.5 * dt
			u.hd += clampf(e, -lim, lim); u.ang = u.hd
	return false

func upd_unit(u: E, dt: float) -> void:
	if u.cr_t > 0 and t > u.cr_t: u.dead = true; by_id.erase(u.id); return
	if u.aband: u.target = null; u.order = null; return
	var T: Dictionary = teams[u.team]
	u.cd -= dt
	if u.supp > 0: u.supp = maxf(0.0, u.supp - dt * 0.22)
	if t - u.last_hit > 5 and u.hp < u.max:
		var rg := float(T.F.mods.get("regen", 0)) + (5.0 if u.rank >= 3 else 0.0) + upg_k(T, u.kind, "regen")
		if rg > 0: u.hp = minf(u.max, u.hp + rg * dt)
	if u.kind == "harv": upd_harv(u, dt); return
	if u.kind == "dozer": upd_dozer(u, dt); return
	if u.kind == "jet": return   # aircraft not ported yet (AI does not buy them in the slice)
	if can_rout(u) and morale_tick(u, dt): return
	var o = u.order
	if u.s_no_attack:
		if o != null and (o.type == "move" or o.type == "amove"):
			if hyp(o.x - u.x, o.y - u.y) < 14 or stalled(u, o): u.order = null
			else: nav_to(u, o.x, o.y, dt, true)
		return
	if o != null and o.type == "attack":
		if o.target.dead or not can_target(u.s, o.target) or not seen_by(u.team, o.target): u.order = null; o = null; u.target = null
		else: u.target = o.target
	if u.target != null and (u.target.dead or not seen_by(u.team, u.target) or not can_target(u.s, u.target)): u.target = null
	if u.target == null and (o == null or o.type == "amove" or o.type == "move"):
		u.sc_t -= dt
		if u.sc_t <= 0 or u.last_hit > t - dt * 1.5:
			u.sc_t = 0.2 + (u.id % 7) * 0.02; auto_engage(u, o, T)
	if unit_brain(u, dt, o): return
	if u.target != null:
		var tg: E = u.target
		if o == null and u.st != 1 and u.guard != null and hyp(u.x - u.guard.x, u.y - u.guard.y) > 420:
			u.target = null; set_move(u, u.guard.x, u.guard.y, "move"); return
		var d := hyp(tg.x - u.x, tg.y - u.y) - tg.r; var Rr := rng_of(u)
		if d > Rr and u.st >= 2 and o == null: u.target = null; return
		if u.st == 3 and o == null and d > Rr * 0.6 and not (u.last_hit > t - 1.5): u.target = null; return
		if d > Rr:
			if o != null and o.type == "move": u.target = null; nav_to(u, o.x, o.y, dt, true); return
			nav_to(u, tg.x, tg.y, dt); return
		if not TANG_CLS.has(u.s_cls): u.ang = atan2(tg.y - u.y, tg.x - u.x)
		if u.s_minr > 0 and d < u.s_minr: step_to(u, u.x * 2 - tg.x, u.y * 2 - tg.y, dt, false); return
		if u.cd <= 0 and absf(ang_diff(u.tang, atan2(tg.y - u.y, tg.x - u.x))) < 0.35:
			fire(u, tg, u.s_dmg * dmg_out(u), u.s_wpn, u.s_splash * upg_k(T, u.kind, "splash")); u.cd = u.s_rof * rof_mult(u)
		return
	if o != null and (o.type == "move" or o.type == "amove"):
		var od := hyp(o.x - u.x, o.y - u.y)
		var arr := 8.0 if float(R.MOVE.get(u.s_cls, [4])[0]) >= 8 else 14.0
		if od < arr or (od < 40 and t - u.mv > 1.2) or stalled(u, o):
			u.order = null; u.guard = null; u.retreat = 0
		else: nav_to(u, o.x, o.y, dt, true)

func upd_harv(u: E, dt: float) -> void:
	var T: Dictionary = teams[u.team]
	if u.order != null:
		if hyp(u.order.x - u.x, u.order.y - u.y) < 10: u.order = null
		else: nav_to(u, u.order.x, u.order.y, dt); return
	if u.state == "ret":
		var best = u.drop if (u.drop != null and not u.drop.dead and t < u.drop_t) else null
		if best == null:
			var bd := 1e9
			for e: E in ents:
				if e.is_b and e.team == u.team and (e.kind == "hq" or e.kind == "depot") and e.built >= 1.0 and not e.dead:
					var d := dist(e, u)
					if d < bd: bd = d; best = e
			u.drop = best; u.drop_t = t + 1.5
		if best == null: return
		if hyp(maxf(0.0, absf(best.x - u.x) - best.size / 2), maxf(0.0, absf(best.y - u.y) - best.size / 2)) < 26:
			var g := roundf(u.cargo * (float(T.ai.inc) if T.ai != null else 1.0) * bs)
			T.credits += g; T.earned += g; u.cargo = 0; u.state = "go"
		else: nav_to(u, best.x, best.y, dt)
		return
	if u.field == null or u.field.amt <= 0:
		if t < u.fld_t: return
		u.fld_t = t + 1.5
		var drops: Array = []
		for e: E in ents:
			if e.is_b and e.team == u.team and (e.kind == "hq" or e.kind == "depot") and e.built >= 1.0 and not e.dead: drops.append(e)
		var best = null; var bd := 1e9; var bdd := 0.0
		var rg: int = nav.region_at(Nav.DOM_GROUND, u.x, u.y)
		for f in fields:
			if f.amt <= 0: continue
			var fr: int = nav.region_at(Nav.DOM_GROUND, f.x, f.y)
			if rg != 0 and fr != 0 and fr != rg: continue
			var dd := 1e9
			for b: E in drops: dd = minf(dd, dist(b, f))
			var foe := 0.0
			if T.ai != null:
				for b: E in nearby(f.x, f.y, 700):
					if b.is_b and not b.dead and b.team >= 0 and not ally(b.team, u.team): foe = 1500.0; break
			var d := dist(f, u) * 0.6 + (dd if drops.size() else 0.0) + (0.0 if nav.los(Nav.DOM_GROUND, u.x, u.y, f.x, f.y) else 900.0) + foe
			if d < bd: bd = d; best = f; bdd = dd
		u.field = best
		if best == null: return
		if T.ai != null and bdd > 900 and bdd < 1e9: T.ai.dep_f = best
	var fl: Dictionary = u.field
	if u.state == "go":
		if dist(fl, u) < fl.r + 6: u.state = "gather"; u.gt = 0
		else: nav_to(u, fl.x, fl.y, dt)
	elif u.state == "gather":
		u.gt += dt
		if u.gt >= 3:
			var take := minf(roundf(160 * upg_t(T, "harv") * float(T.F.mods.get("harv", 1))), fl.amt)
			fl.amt -= take; u.cargo = int(take); u.state = "ret"

func upd_dozer(u: E, dt: float) -> void:
	u.building = false
	var o = u.order
	if o != null and o.type == "build":
		var b: E = o.target
		if b.dead or b.built >= 1.0:
			u.order = null
			while u.bq.size():
				var nb = by_id.get(u.bq.pop_front())
				if nb != null and nb.is_b and not nb.dead and nb.built < 1 and nb.team == u.team: u.order = {type = "build", target = nb}; u.has_path = false; break
			return
		var d := hyp(b.x - u.x, b.y - u.y)
		if d > b.size / 2 + 30: nav_to(u, b.x, b.y, dt); return
		u.building = true; u.ang = atan2(b.y - u.y, b.x - u.x); u.last_fire = t; return
	if o != null and o.type == "move":
		if hyp(o.x - u.x, o.y - u.y) < 14 or stalled(u, o): u.order = null
		else: nav_to(u, o.x, o.y, dt, true); return
	for b: E in ents:
		if b.is_b and b.team == u.team and not b.dead and b.built < 1.0 and b.nd and hyp(b.x - u.x, b.y - u.y) < 320:
			u.order = {type = "build", target = b}; return
	for b: E in ents:
		if b.is_b and b.team == u.team and not b.dead and b.built >= 1.0 and b.hp < b.max and t - b.last_hit > 4 and hyp(b.x - u.x, b.y - u.y) < b.size / 2 + 70:
			b.hp = minf(b.max, b.hp + b.max * 0.012 * dt); u.building = true; break

# ------------------------------------------------------------------------------------------------ combat
func fire(src: E, tg: E, dmg: float, wpn: String, splash: float) -> void:
	if not src.is_b and splash > 0 and src.s_cls == "arty" and wpn == "shell":
		var gap := t - src.last_fire
		if gap > 25: dmg *= 0.3   # RF3: a new fire mission opens with a weak spotting round
	if not src.is_b and has_ammo(src):
		if src.am < 0: ammo_init(src)
		if src.am <= 0:
			if not src.is_inf: return
			dmg *= 0.12
		else: src.am -= 1
	src.last_fire = t
	var a := src.ang if src.is_b else (src.tang if TANG_CLS.has(src.s_cls) else atan2(tg.y - src.y, tg.x - src.x))
	var ln := 20.0 if src.is_b else float({inf = 8, at = 10, hero = 10, tank = 24, arty = 27, aa = 16, boat = 16, ship = 30, heli = 14, jet = 10}.get(src.s_cls, 10))
	var ox := src.x + cos(a) * ln; var oy := src.y + sin(a) * ln
	if wpn == "gun" or wpn == "tower" or wpn == "snipe" or wpn == "flak":
		apply_dmg(tg, dmg, wpn, src.team, src, 0.0); return
	var d := hyp(tg.x - ox, tg.y - oy)
	var spd := 170.0 if wpn == "torp" else (280.0 if wpn == "shell" else (430.0 if (wpn == "at" or wpn == "missile") else (380.0 if wpn == "bomb" else 640.0)))
	proj.append({x = ox, y = oy, tx = tg.x, ty = tg.y, tgt = tg, p = 0.0, len = maxf(d, 1.0), spd = spd, dmg = dmg, wpn = wpn, splash = splash, team = src.team, src = src, done = false})

func upd_proj(dt: float) -> void:
	for p in proj:
		var tg: E = p.tgt
		if p.wpn != "shell" and p.wpn != "bomb" and not tg.dead: p.tx = tg.x; p.ty = tg.y
		var a := atan2(p.ty - p.y, p.tx - p.x); var st := float(p.spd) * dt; var rem := hyp(p.tx - p.x, p.ty - p.y)
		p.p += st
		if rem <= st:
			p.done = true
			var src = p.src if (p.src != null and not p.src.dead) else null
			if p.splash > 0: explode(p.tx, p.ty, p.splash, p.dmg, p.team, p.wpn, src)
			elif not tg.dead: apply_dmg(tg, p.dmg, p.wpn, p.team, src, 0.0)
		else: p.x += cos(a) * st; p.y += sin(a) * st
	proj = proj.filter(func(q): return not q.done)

func tactic(e: E, wpn: String, src, splash: float) -> float:
	var m := 1.0
	if e.is_b or src == null or src.is_b: return m
	var air: bool = e.s_dom == "air"; var sair: bool = src.s_dom == "air"
	if not air and (e.is_veh or e.s_dom == "naval") and splash == 0 and wpn != "bomb":
		var a := atan2(e.y - src.y, e.x - src.x); var rel := absf(ang_diff(e.hd if e.has_hd else e.ang, a))
		if rel < 0.95: m *= 1.6
		elif rel < 2.1: m *= 1.2
		else: m *= 0.8
	if e.is_inf and not air:
		var ck := cover_kind(e.x, e.y)
		if ck:
			var hv := wpn == "shell" or wpn == "boom" or splash > 0
			m *= (0.3 if hv else 0.45) if ck >= 3 else ((0.5 if hv else 0.6) if ck == 2 else (0.8 if hv else 0.65))
		if e.supp > 0.5: m *= 0.9
	if not air and not sair:
		var dh := ground_h(src.x, src.y) - ground_h(e.x, e.y)
		if dh > 10: m *= 1.15
		elif dh < -10: m *= 0.9
	if not air and t - e.mv < 0.35 and wpn in ["cannon", "at", "tower", "snipe", "gun"]: m *= 0.85
	return m

func apply_dmg(e: E, d: float, wpn: String, team: int, src, splash: float) -> void:
	if e.dead: return
	if e.oil >= 0:
		var mm := float(R.VS.get(wpn, {}).get("bld", 0))
		if mm > 0: damage_oil(oil[e.oil], d * mm, team)
		return
	var ar: String = "bld" if e.is_b else e.s_armor
	var m := float(R.VS.get(wpn, {}).get(ar, 0.0))
	if m == 0: return
	var tc := tactic(e, wpn, src, splash)
	var dd := d * m * dmg_in(e, wpn) * tc
	e.hp -= dd; e.last_hit = t
	if not e.is_b and can_rout(e):
		e.fear += dd / e.max * (1.25 if e.is_inf else 0.7) * (0.7 if (e.is_inf and cover_at(e.x, e.y)) else 1.0) + (0.05 if splash > 0 else 0.02)
	if not e.is_b and e.is_inf:
		var heavy := wpn == "shell" or wpn == "rocket" or splash > 0
		e.supp = minf(1.0, e.supp + (dd / e.max * 1.4 + (0.06 if (wpn == "gun" or wpn == "tower") else 0.12)) * (float(teams[e.team].ms.get("art", 1.0)) if heavy else 1.0))
	if e.hp <= 0: kill(e, team, src)

func explode(x: float, y: float, r: float, d: float, team: int, wpn: String, src) -> void:
	for e: E in nearby(x, y, r + bmax_h + 20):
		if e.dead: continue
		var fr := ally(e.team, team)
		if fr and not (battle and not e.is_b and team >= 0): continue
		var air: bool = not e.is_b and e.s_dom == "air"
		if air and not R.VS[wpn].get("air"): continue
		var dd := hyp(e.x - x, e.y - y) - e.r
		if dd > r: continue
		var m := 1 - 0.5 * maxf(0.0, dd) / r
		if fr: m *= 0.5
		apply_dmg(e, d * m, wpn, team, src, 1.0)
	for o in oil:
		if o.dead: continue
		var dd2 := hyp(o.x - x, o.y - y) - 18
		if dd2 > r: continue
		var mm := float(R.VS.get(wpn, {}).get("bld", 0))
		if mm > 0: damage_oil(o, d * (1 - 0.5 * maxf(0.0, dd2) / r) * mm, team)

const VET := ["", "Veteran", "Elite", "Heroic"]

func kill(e: E, team: int, src) -> void:
	if e.dead: return
	e.dead = true
	if e.is_b: bdirty = true; q_refund(e)
	if not e.is_b and e.s_dom == "ground":
		for o: E in nearby(e.x, e.y, 240):
			if o.dead or o.is_b or o == e or not can_rout(o): continue
			if o.team == e.team:
				var mo: Dictionary = teams[o.team].ms
				o.fear = maxf(0.0, o.fear + (0.16 if e.is_inf else 0.26) * float(mo.get("loss", 1)) - float(mo.get("ferv", 0)))
			elif team >= 0 and ally(o.team, team): o.fear = maxf(0.0, o.fear - 0.08)
	by_id.erase(e.id)
	if e.sell <= 0 and e.team >= 0: teams[e.team].lost += 1
	if team >= 0 and not ally(team, e.team):
		var T: Dictionary = teams[team]
		var val := (2000.0 if e.kind == "hq" else maxf(400.0, e.s_cost)) if e.is_b else e.s_cost
		T.kills += 1; T.gxp += val
		var rk := 1
		while rk < R.RANKS.size() and T.gxp >= float(R.RANKS[rk]): rk += 1
		if rk > T.rank: T.rank = rk
		if src != null and not src.is_b and not src.dead:
			src.xp += val * upg_t(T, "xp")
			var base := maxf(300.0, src.s_cost); var need := [1.0, 2.5, 5.0]; var r := 0
			while r < 3 and src.xp >= base * need[r]: r += 1
			if r > src.rank: src.rank = r; src.hp = src.max

# ------------------------------------------------------------------------------------------------ morale
func rally_zone(u: E) -> String:
	for o: E in nearby(u.x, u.y, 380, _nb_rz):
		if o.dead or not ally(o.team, u.team): continue
		if o.kind == "hq" and o.is_b and hyp(o.x - u.x, o.y - u.y) < o.size / 2 + 260: return "HQ"
	return ""

func morale_tick(u: E, dt: float) -> bool:
	if do_prof:
		var t0 := Time.get_ticks_usec()
		var r := _morale_tick(u, dt)
		prof["  morale"] = prof.get("  morale", 0.0) + (Time.get_ticks_usec() - t0) / 1000.0
		return r
	return _morale_tick(u, dt)

func _morale_tick(u: E, dt: float) -> bool:
	var T0: Dictionary = teams[u.team]
	if fearless(T0, u):
		u.fear = 0; u.last = 0
		if u.rout > 0: u.rout = 0
		return false
	var C := courage_of(u); var f := u.fear
	u.m_t -= dt
	if u.m_t <= 0:
		u.m_t = 1 + (u.id % 5) * 0.05
		var fr := 0.0; var en := 0.0; var q := 0; var qn := 0; var sp := 0
		for o: E in nearby(u.x, u.y, 300, _nb_mo):
			if o.dead or o.is_b or o.s_dom == "air": continue
			if ally(o.team, u.team):
				fr += o.s_cost if o.s_cost else 300.0
				if o.s_cls == "tank" or o.s_cls == "arty": sp = 1
			else:
				en += o.s_cost if o.s_cost else 300.0
				if not o.s_no_attack: qn += 1; q |= 1 << ((1 if o.x > u.x else 0) + (2 if o.y > u.y else 0))
		u.odds = en / maxf(1.0, fr)
		u.nsup = 1 if (sp == 0 and T0.ms.get("lone")) else 0
		u.hm = bool(u.sup) if T0.ms.get("home") else false
		u.sur = qn >= 4 and ((q & 1) + (q >> 1 & 1) + (q >> 2 & 1) + (q >> 3 & 1)) >= 3
		u.rz = rally_zone(u)
	if u.rout > t:
		u.target = null; u.order = null; u.guard = null
		var Rt = u.rt_to
		if Rt != null and hyp(Rt.x - u.x, Rt.y - u.y) > 30: nav_to(u, Rt.x, Rt.y, dt, true)
		f = maxf(0.0, f - dt * (0.3 if u.rz != "" else 0.04)); u.fear = f
		if u.rz != "" and f < C * 0.6: u.rout = 0; return false
		return true
	if u.rout > 0: u.rout = 0; u.fear = C * 0.45; f = u.fear
	if u.last > t: u.fear = minf(f, C * 0.85); u.supp = maxf(u.supp, 0.75); return false
	var calm := t - u.last_hit > 4
	f += ((0.03 * minf(3.0, u.odds - 1.2)) if (u.odds > 2.2 and not calm) else 0.0) * dt
	f -= dt * (0.025 + (0.07 if calm else 0.0) + (0.14 if u.rz != "" else 0.0) + (0.02 if (u.is_inf and cover_at(u.x, u.y)) else 0.0))
	f = maxf(0.0, f); u.fear = f
	if f > C:
		if u.sur:
			u.last = t + 10; u.fear = C * 0.85; u.supp = maxf(u.supp, 0.75); return false
		if u.is_veh and u.hp < u.max * 0.3 and not u.s.get("noCrew"):
			bail_out(u); return true
		var best = null; var bd := 1e12
		for b: E in ents:
			if b.dead or not b.is_b or b.team != u.team or b.built < 1.0: continue
			var d := (b.x - u.x) * (b.x - u.x) + (b.y - u.y) * (b.y - u.y)
			if d < bd and d > 140 * 140: bd = d; best = b
		if best == null:
			u.last = t + 10; u.fear = C * 0.85; u.supp = maxf(u.supp, 0.75); return false
		var a := atan2(u.y - best.y, u.x - best.x)
		u.rt_to = {x = best.x + cos(a) * (best.size / 2 + 60), y = best.y + sin(a) * (best.size / 2 + 60)}
		u.rout = t + maxf(4.0, 9 - 3 * (C - 0.9)); u.target = null; u.order = null; u.guard = null
		return true
	return false

func bail_out(u: E) -> void:
	u.aband = 1; u.target = null; u.order = null; u.guard = null; u.rout = 0; u.fear = 0; u.last = 0
	var nc := 0
	for q: E in ents:
		if q.crew and not q.dead and q.team == u.team: nc += 1
	if nc >= 4: return
	var a := fmod(u.id * 2.399, 6.28)
	var c := add_unit(u.team, "inf", u.x + cos(a) * (u.r + 10), u.y + sin(a) * (u.r + 10))
	if c != null: c.hp = c.max * 0.5; c.crew = 1; c.cr_t = t + 16; c.fear = courage_of(c) * 1.05

# ------------------------------------------------------------------------------------------------ separation (HOT PATH)
func separate() -> void:
	var groups := {ground = [], naval = [], air = []}
	var bn := 0; var bsum := 0
	for e: E in ents:
		if e.dead: continue
		if e.is_b: bn += 1; bsum += e.id; continue
		if e.kind == "jet": continue
		groups[e.s_dom].append(e)
	# buildings don't move: their grid is rebuilt only when the set of buildings changes
	var BC := 160; var BW := int(ceil(MAPW / BC)) + 2
	var bsig := bn * 1e7 + bsum + BW
	if bsig != _bg_sig:
		_bg_sig = bsig; _bg.clear()
		for b: E in ents:
			if not b.is_b or b.dead: continue
			var rr := b.size / 2 + 20
			for yy in range(floori((b.y - rr) / BC) + 1, floori((b.y + rr) / BC) + 2):
				for xx in range(floori((b.x - rr) / BC) + 1, floori((b.x + rr) / BC) + 2):
					var kk := xx + yy * BW
					if _bg.has(kk): _bg[kk].append(b)
					else: _bg[kk] = [b]
	for dom: String in ["ground", "naval", "air"]:
		var U: Array = groups[dom]; var k := 0.3 if dom == "air" else 0.5
		for a: E in U: a.px = a.x; a.py = a.y
		var SC := 64; var SW := int(ceil(MAPW / SC)) + 2; var SH := int(ceil(MAPH / SC)) + 3; var NC := SW * SH; var n := U.size()
		if _sep_st.size() != NC + 1: _sep_st.resize(NC + 1); _sep_fill.resize(NC)
		if _sep_cel.size() < n: _sep_cel.resize(n + 256); _sep_ord.resize(n + 256)
		var stc := _sep_st; var cel := _sep_cel; var ordr := _sep_ord
		stc.fill(0)
		for i in n:
			var a: E = U[i]
			var cx := clampi(floori(a.x / SC) + 1, 0, SW - 1); var cy := clampi(floori(a.y / SC) + 1, 0, SH - 1)
			var c := cx + cy * SW; cel[i] = c; stc[c + 1] += 1
		for c in NC: stc[c + 1] += stc[c]
		var fill := _sep_fill
		for c in NC: fill[c] = stc[c]
		for i in n: ordr[fill[cel[i]]] = i; fill[cel[i]] += 1
		for i in n:
			var a: E = U[i]
			var cx := floori(a.x / SC) + 1; var cy := floori(a.y / SC) + 1
			for yy in range(cy - 1, cy + 2):
				if yy < 0 or yy >= SH: continue
				for xx in range(cx - 1, cx + 2):
					if xx < 0 or xx >= SW: continue
					var c := xx + yy * SW
					for qi in range(stc[c], stc[c + 1]):
						var j := ordr[qi]
						if j <= i: continue
						var b: E = U[j]
						var dx := b.x - a.x; var dy := b.y - a.y; var m := a.r + b.r
						if absf(dx) > m or absf(dy) > m: continue
						var d := sqrt(dx * dx + dy * dy)
						if d == 0: d = 0.01
						if d < m:
							var ma := mass_of(a); var mb := mass_of(b)
							var ov := m - d; var soft := dom == "ground" and ma < 2 and mb < 2
							if dom == "ground" and (a.order == null) != (b.order == null) and a.team == b.team:
								if a.order != null: mb *= 0.15
								else: ma *= 0.15
							if soft and ov <= 0.7: continue
							var p := (ov - 0.7) * 0.7 if soft else ov * k * 2
							var nx := dx / d; var ny := dy / d; var wa := mb / (ma + mb); var wb := ma / (ma + mb)
							a.x -= nx * p * wa; a.y -= ny * p * wa; b.x += nx * p * wb; b.y += ny * p * wb
			if dom == "ground":
				for b: E in _bg.get(floori(a.x / BC) + 1 + (floori(a.y / BC) + 1) * BW, _EMPTY):
					var h := b.size / 2 + a.r; var dx2 := a.x - b.x; var dy2 := a.y - b.y
					if absf(dx2) < h and absf(dy2) < h:
						var px2 := h - absf(dx2); var py2 := h - absf(dy2)
						if px2 < py2: a.x += (signf(dx2) if dx2 != 0 else 1.0) * px2
						else: a.y += (signf(dy2) if dy2 != 0 else 1.0) * py2
		if dom != "air":
			var di := Nav.dom_id(dom)
			for a: E in U:
				if not nav.pass_xy(di, a.x, a.y):
					var nx2: float = a.x; var ny2: float = a.y
					if nav.pass_xy(di, nx2, a.py): a.y = a.py
					elif nav.pass_xy(di, a.px, ny2): a.x = a.px
					else: a.x = a.px; a.y = a.py
	for e: E in ents:
		e.x = clampf(e.x, 10, MAPW - 10); e.y = clampf(e.y, 10, MAPH - 10)

# ------------------------------------------------------------------------------------------------ derricks, capturable buildings, power, supply
func damage_oil(o: Dictionary, d: float, team: int) -> void:
	if o.dead or d <= 0: return
	if team >= 0 and ally(team, o.owner): return
	o.hp -= d; o.hit = t; o.tg.hp = o.hp
	if o.hp <= 0:
		o.dead = true; o.hp = 0; o.owner = -1; o.burn = 45.0
		for k in o.cp.size(): o.cp[k] = 0.0
		o.tg.dead = true

func upd_oil(dt: float) -> void:
	var N := teams.size()
	var here: Array = []
	here.resize(N)
	for o in oil:
		here.fill(0)
		for e: E in nearby(o.x, o.y, 70, _nb_oil):
			if e.dead or e.is_b or e.kind == "harv": continue
			if e.s_dom != "ground": continue
			if absf(e.x - o.x) < 60 and absf(e.y - o.y) < 60 and hyp(e.x - o.x, e.y - o.y) < 60: here[e.team] += 1
		var present: Array = []
		for tt in N:
			if here[tt]: present.append(tt)
		if o.dead:
			o.burn = maxf(0.0, o.burn - dt)
			var pw_ok := true
			if o.pw or o.tb != null:
				pw_ok = false
				if present.size():
					for e: E in ents:
						if e.kind == "dozer" and not e.dead and e.team == present[0] and hyp(e.x - o.x, e.y - o.y) < float(R.PW_R): pw_ok = true; break
			var all_al := present.size() > 0
			for qq in present:
				if not ally(qq, present[0]): all_al = false
			if pw_ok and all_al:
				var tt: int = present[0]
				o.cp[tt] += dt
				if o.cp[tt] >= (float(R.PW_FIX) if (o.pw or o.tb != null) else 12.0):
					o.dead = false; o.hp = o.max * 0.4; o.owner = tt; o.tg.dead = false; o.tg.hp = o.hp
					for k in N: o.cp[k] = 0.0
			else:
				for tt in N:
					if not here[tt]: o.cp[tt] = maxf(0.0, o.cp[tt] - dt * 0.5)
			continue
		for tt in N:
			var only_al := true
			for qq in present:
				if not ally(qq, tt): only_al = false
			if here[tt] and only_al and not ally(o.owner, tt):
				o.cp[tt] += dt
				if o.cp[tt] >= 6:
					o.owner = tt
					for k in N: o.cp[k] = 0.0
					log_msg(tt, "derrick captured")
			elif not here[tt]: o.cp[tt] = maxf(0.0, o.cp[tt] - dt * 0.5)
		if o.hp < o.max and t - o.hit > 8: o.hp = minf(o.max, o.hp + o.max * 0.01 * dt); o.tg.hp = o.hp
		var TBr = R.TB.get(o.tb) if o.tb != null else null
		if o.owner >= 0 and not o.pw and (o.tb == null or (TBr != null and TBr.get("inc"))):
			o.inc += dt
			if o.inc >= 2:
				o.inc = 0.0
				var T: Dictionary = teams[o.owner]
				var g := roundf(float(TBr.inc) * bs) if TBr != null else roundf(14.0 * float(T.F.mods.get("oil", 1)) * bs)
				T.credits += g; T.earned += g
		if o.tb == "hosp" and o.owner >= 0 and not o.dead:
			for e: E in nearby(o.x, o.y, float(TBr.r)):
				if e.dead or e.is_b or e.team != o.owner or not e.is_inf or e.hp >= e.max: continue
				if hyp(e.x - o.x, e.y - o.y) < float(TBr.r): e.hp = minf(e.max, e.hp + e.max * float(TBr.heal) * dt)
	econ_tick(dt)

var ec_t: float = 0.0
func econ_tick(dt: float) -> void:
	ec_t += dt
	if ec_t < 2: return
	ec_t -= 2
	var per := {}
	for b: E in ents:
		if b.dead or not b.is_b or b.kind != "econ" or b.built < 1.0: continue
		per[b.team] = per.get(b.team, 0) + 1
		var k: int = per[b.team]
		var T: Dictionary = teams[b.team]
		var er: Array = R.ECON_RATE
		var v := float(b.s.get("inc", 0)) * 2 * (float(er[k - 1]) if k - 1 < er.size() else 0.0) * (0.0 if b.dis > t else 1.0)
		b.xp += v
		var w := floorf(b.xp)
		if w > 0: b.xp -= w; T.credits += w; T.earned += w

func pwr_of(team: int) -> Vector2:
	var make := 0.0; var use := 0.0
	for e: E in ents:
		if not e.is_b or e.dead or e.team != team or e.built < 1.0: continue
		if not (e.dis > t): make += float(R.POWER.make.get(e.kind, 0))
		use += float(R.POWER.use.get(e.kind, 0))
	for o in oil:
		if o.tb == "plant" and not o.dead and o.owner == team: make += float(R.POWER.plant)
	return Vector2(make, use)

func battle_power(dt: float) -> void:
	pw_t += dt
	if pw_t < 0.5: return
	pw_t = 0.0
	for T in teams:
		if T.out: continue
		var p := pwr_of(T.id)
		T.pw_low = 1 if p.y > p.x else 0
		if T.pw_low:
			for e: E in ents:
				if e.is_b and e.team == T.id and not e.dead and R.POWER.use.has(e.kind) and not (e.dis > t + 1.2): e.dis = maxf(e.dis, t + 1.2)

## supplyPoints: THE one "your area" (HQ 380, depot 320, other buildings 170, held map buildings 170)
## Supply LINES (roads out of HQ/depots, 03c-logistics lgCover) are not ported yet: area = circles only.
func supply_points() -> Array:
	var N := teams.size(); var P: Array = []
	for i in N: P.append([])
	var SR: Dictionary = R.SUP_R
	for e: E in ents:
		if e.dead or e.team < 0 or e.team >= N: continue
		var r := 0.0
		if e.is_b:
			if e.built < 1.0 or R.SUP_NOB.has(e.kind): continue
			r = float(SR.hq) if e.kind == "hq" else (float(SR.depot) if e.kind == "depot" else float(SR.base))
		if r > 0:
			for tt in N:
				if ally(e.team, tt): P[tt].append(Vector3(e.x, e.y, r))
	for o in oil:
		if not o.dead and o.owner >= 0 and o.owner < N:
			for tt in N:
				if ally(o.owner, tt): P[tt].append(Vector3(o.x, o.y, float(SR.base)))
	return P

func upd_supply(dt: float) -> void:
	sup_t += dt
	if sup_t < 0.5: return
	var st := sup_t; sup_t = 0.0
	var P := supply_points()
	for u: E in ents:
		if u.dead or u.is_b: continue
		var pts: Array = P[u.team]
		var ins := false
		for p in pts:
			if absf(p.x - u.x) < p.z and absf(p.y - u.y) < p.z and hyp(p.x - u.x, p.y - u.y) < p.z: ins = true; break
		u.sup = 1 if ins else 0
		if has_ammo(u):
			if u.am < 0: ammo_init(u)
			if ins and u.am < u.amx: u.am = minf(u.amx, u.am + u.amx * 0.07 * st)

# ------------------------------------------------------------------------------------------------ vision & the end
func vis_r(m: E) -> float:
	var k := float(teams[m.team].F.mods.get("sight", 1)) if m.team >= 0 else 1.0
	if not m.is_b and m.s.get("vis"): return float(m.s.vis) * k
	return (340.0 if m.is_b else (340.0 if m.s_dom == "air" else (380.0 if m.s_dom == "naval" else 280.0))) * k

func update_vis() -> void:
	build_hash()
	var N := teams.size()
	for e: E in ents:
		if not e.dead: e.vr = vis_r(e)
	var AM: Array = []
	for a in N:
		var m := 0
		for b in N:
			if teams[a].tm == teams[b].tm: m |= 1 << b
		AM.append(m)
	var ALL := (1 << N) - 1
	for e: E in ents:
		if e.dead: continue
		var seen: int = AM[e.team] | (1 << e.team)
		if seen != ALL:
			for m: E in nearby(e.x, e.y, VISMAX + e.r, _nb_vis):
				var need: int = AM[m.team] & ~seen
				if not need: continue
				var dx := m.x - e.x; var dy := m.y - e.y; var Rr := m.vr + e.r
				if dx * dx + dy * dy < Rr * Rr: seen |= need
				if seen == ALL: break
		for o in N: e.vs[o] = 1 if (seen & (1 << o)) else 0

func force_of(T: Dictionary) -> Dictionary:
	var bv := 0.0; var bn := 0; var uv := 0.0; var un := 0; var dz := 0
	for e: E in ents:
		if e.dead or e.team != T.id: continue
		if e.is_b:
			if e.built < 1.0: continue
			bv += 2000.0 if e.kind == "hq" else maxf(300.0, e.s_cost); bn += 1
		elif e.kind == "dozer": dz += 1
		elif not e.s_no_attack and e.kind != "harv" and e.kind != "hacker" and not e.aband: uv += e.s_cost if e.s_cost else 300.0; un += 1
	return {bv = bv, bn = bn, uv = uv, un = un, dz = dz}

func check_end() -> void:
	for T in teams:
		if T.out: continue
		var F := force_of(T)
		if F.bn == 0 and F.dz == 0 and F.un == 0: T.out = true; continue
		if F.bn == 0: T.out = true   # Battle (Generals rule): lose your last structure and you are out
	var alive: Array = []
	for T in teams:
		if not T.out: alive.append(T.id)
	var same := true
	for a in alive:
		if teams[a].tm != teams[alive[0]].tm: same = false
	if alive.size() <= 1 or same:
		over = true; winner = alive[0] if alive.size() else -1

# ------------------------------------------------------------------------------------------------ orders (the player's commands)
## order = {t = "move"|"amove"|"attack"|"stop"|"build"|"train"|"cancel_train"|"research"|"rally"|"sell"|"repair", team, ids:[...], x, y, target, kind, bid}
func apply_order(o: Dictionary) -> bool:
	var team: int = int(o.get("team", 0))
	match str(o.get("t", "")):
		"move", "amove":
			for i in o.get("ids", []):
				var u = by_id.get(i)
				if u != null and not u.is_b and u.team == team: set_move(u, float(o.x), float(o.y), str(o.t))
			return true
		"attack":
			var tg = by_id.get(int(o.target))
			if tg == null: return false
			for i in o.get("ids", []):
				var u = by_id.get(i)
				if u != null and not u.is_b and u.team == team and can_target(u.s, tg): u.order = {type = "attack", target = tg}; u.has_path = false
			return true
		"stop":
			for i in o.get("ids", []):
				var u = by_id.get(i)
				if u != null and u.team == team: u.order = null; u.target = null; u.guard = null
			return true
		"build": return place_bld(team, str(o.kind), float(o.x), float(o.y), int(o.get("dz", 0)))
		"train": return enqueue(team, str(o.kind), int(o.get("bid", 0)))
		"research": return start_research(team, str(o.kind))
		"rally":
			var b = by_id.get(int(o.bid))
			if b != null and b.is_b and b.team == team: b.rally = {x = float(o.x), y = float(o.y)}
			return true
		"sell":
			for i in o.get("ids", []):
				var b = by_id.get(i)
				if b != null and b.is_b and b.team == team and b.built >= 1.0: b.sell = t + float(R.SELL_T); b.q = []
			return true
		"repair":
			for i in o.get("ids", []):
				var b = by_id.get(i)
				if b != null and b.is_b and b.team == team and b.hp < b.max: b.rep = 1
			return true
	return false

## per-team tally for logs and tests (same fields as orch/headless.mjs W.info)
func info() -> Dictionary:
	var per: Array = []
	for T in teams: per.append({fac = T.fac, units = 0, blds = 0, credits = roundi(T.credits), built = T.built, lost = T.lost, kills = T.kills, out = T.out})
	for e: E in ents:
		if e.dead or e.team < 0: continue
		if e.is_b: per[e.team].blds += 1
		else: per[e.team].units += 1
	return {t = t, over = over, winner = winner, ents = ents.size(), proj = proj.size(), per = per}
