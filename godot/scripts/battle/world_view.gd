## Lane B: Battle world visual renderer — P4c LookEnv (sky, lighting, weather, color grade), LookFx (GPU particles,
## tracers, explosions, craters, rubble, fog-of-war, 3D supply lines), X1 3D buildings with animated nation flags/radar/turrets,
## and X1 map objects (oil derricks, capturable tech buildings, supply crates, dugouts).
##
## Lifecycle (called by battle.gd):
##   var world_view := WorldView.new()
##   world_view.setup(self, sim, map, opts)
##   # after each sim step:
##   world_view.on_step(sim, events, me, see_all, ai_only)
##   # every frame:
##   world_view.tick(dt, cam, show_supply)
##   world_view.begin_frame()
##   world_view.draw_bld(self, fr, e, fac, p, gy, col, issel, mine)
##   world_view.draw_map_objects(self, fr)
##   world_view.end_frame()
##   # camera shake:
##   var shake := world_view.shake_offset()
##   # on restart / leave:
##   world_view.clear()
extends RefCounted

const LookEnv = preload("res://scripts/battle/look_env.gd")
const LookFx = preload("res://scripts/battle/look_fx.gd")
const X1 = preload("res://models/auto/x1_models.gd")
const Look = preload("res://scripts/battle/battle_look.gd")

const HUGE_AABB := AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
const FOG_INTERVAL := 0.25

static var _meta_cache: Dictionary = {} # "fac|kind" -> {ok, pack, pxf, h, scale}
static var _box_cache: Dictionary = {}  # int_size -> Mesh

var env = null          # LookEnv instance
var fx = null           # LookFx Node3D instance
var _host: Node3D = null
var _root: Node3D = null
var _mmi: Dictionary = {} # key -> MultiMeshInstance3D
var _buf: Dictionary = {} # key -> Array[Transform3D]
var _headless: bool = false
var _fog_next: float = 0.0
var _last_lgv: int = -1
var _lines_cache: Dictionary = {}
var _shake_phase: float = 0.0


func setup(host: Node3D, sim, map: Dictionary, opts: Dictionary = {}) -> void:
	clear()
	_headless = DisplayServer.get_name() == "headless"
	_host = host
	_fog_next = 0.0
	_last_lgv = -1
	_lines_cache = {}
	_shake_phase = 0.0
	if _headless or host == null:
		return

	var fx_map := _make_fx_map(map)
	var env_opts := opts.duplicate()
	if not env_opts.has("tod"):
		env_opts["tod"] = "day"
	if not env_opts.has("weather"):
		env_opts["weather"] = "clear"

	env = LookEnv.setup(host, fx_map, env_opts)
	if sim != null and sim.has_method("ground_h"):
		env.height_fn = Callable(sim, "ground_h")

	fx = LookFx.new()
	fx.name = "LookFx"
	host.add_child(fx)
	var tables: Dictionary = {}
	if sim != null and sim.get("T_") is Dictionary:
		tables = sim.T_
	fx.setup(fx_map, tables, env)
	fx.warmup()

	_root = Node3D.new()
	_root.name = "WorldView"
	host.add_child(_root)


func on_step(sim, events: Array, me: int, see_all: bool = false, ai_only: bool = false) -> void:
	if _headless or fx == null or sim == null:
		return
	fx.me = me
	var br = sim.get("br")
	if br != null:
		fx.step(br.ent, events)
		var lgv: int = int(br.lgv)
		if lgv != _last_lgv or _lines_cache.is_empty():
			_last_lgv = lgv
			var ln = br.lines()
			_lines_cache = ln if ln is Dictionary else {}
			var allies: Array = []
			if sim.teams is Array:
				for i in sim.teams.size():
					if i != me and sim.ally(me, i):
						allies.append(i)
			fx.set_lines(_lines_cache, me, allies)
		if see_all or ai_only:
			fx.fog_off()
		elif float(fx.t) >= _fog_next:
			_fog_next = float(fx.t) + FOG_INTERVAL
			var fg: PackedByteArray = br.fog(me)
			if fg.size() > 0:
				fx.set_fog(fg)
	else:
		if not events.is_empty():
			fx.events(events)
		if see_all or ai_only:
			fx.fog_off()


func tick(dt: float, cam: Camera3D, show_supply: bool) -> void:
	if _headless:
		return
	_shake_phase += dt * 47.0
	if env != null:
		env.tick(dt, cam)
	if fx != null:
		fx.tick(dt, cam)
		fx.show_lines(show_supply)


func shake_offset() -> Vector3:
	if _headless or env == null:
		return Vector3.ZERO
	var s: float = float(env.shake)
	if s <= 0.01:
		return Vector3.ZERO
	s = minf(s, 35.0)
	return Vector3(
		sin(_shake_phase * 1.13) * s,
		cos(_shake_phase * 1.71) * s * 0.45,
		sin(_shake_phase * 0.89 + 1.4) * s
	)


func set_conditions(tod: String, weather: String) -> void:
	if env != null:
		env.set_conditions(tod, weather)


func begin_frame() -> void:
	if _headless or _root == null:
		return
	for k in _buf.keys():
		(_buf[k] as Array).clear()


func draw_bld(B, fr: Dictionary, e, fac: String, p: Vector2, gy: float, col: Color, issel: bool, mine: bool) -> void:
	if _headless or _root == null:
		return
	var kind_s := String(e.kind)
	var meta := _get_meta(fac, kind_s)
	if not bool(meta["ok"]):
		if B is Object and B.has_method("_draw_bld_fallback"):
			B._draw_bld_fallback(fr, e, fac, p, gy, col, issel, mine)
			return
		_draw_bld_box_fallback(B, fr, e, p, gy, col, issel, mine)
		return

	var sc: float = float(meta["scale"])
	var h: float = float(meta["h"])
	var pack: Dictionary = meta["pack"]
	var parts: Dictionary = pack.get("parts", {})
	var pxf: Dictionary = meta["pxf"]
	var built: float = clampf(float(e.built), 0.0, 1.0)
	var sink: float = (1.0 - built) * h * 0.9
	var now: float = float(B.t)
	var eid_f: float = float(e.id)
	var aim_ang: float = float(e.tang) if absf(float(e.tang)) > 0.0001 else float(e.ang)

	var root_xf := Transform3D(Basis.IDENTITY.scaled(Vector3(sc, sc, sc)), Vector3(p.x, gy - sink, p.y))
	for pk in parts.keys():
		var pks := String(pk)
		var pt: Transform3D = pxf.get(pks, Transform3D.IDENTITY)
		var part_xf: Transform3D
		match pks:
			"flag":
				var fy := 0.5 + sin(now * 0.3 + eid_f) * 0.25 + sin(now * 4.2 + eid_f) * 0.08
				part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, fy), Vector3.ZERO))
			"dish", "radar":
				part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, now * 1.4 + eid_f), Vector3.ZERO))
			"crane":
				part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, sin(now * 0.25 + eid_f) * 1.1), Vector3.ZERO))
			"gun", "turret", "turret2":
				part_xf = root_xf * Transform3D(Basis(Vector3.UP, -aim_ang) * pt.basis, pt.origin)
			_:
				part_xf = root_xf * pt
		_push_mm("b|" + fac + "|" + kind_s + "|" + pks, parts[pk] as Mesh, part_xf)

	_append_bld_overlays(B, fr, e, p, gy, h, col, issel, mine)


func draw_map_objects(B, fr: Dictionary) -> void:
	if _headless or _root == null or B == null or B.sim == null:
		return
	var rings: Array = fr["rings"]
	var now: float = float(B.t)

	# Oil derricks + capturable tech buildings (quarry, mine, power plant, field hospital)
	for o in B.sim.oil:
		if bool(o.dead):
			continue
		var key := "derrick" if o.tb == null else "techb_" + String(o.tb)
		var ox: float = float(o.x)
		var oz: float = float(o.y)
		var oy: float = float(B.sim.ground_h(ox, oz))
		var meta := _get_meta("_map", key)
		if bool(meta["ok"]):
			var sc: float = float(meta["scale"])
			var pack: Dictionary = meta["pack"]
			var parts: Dictionary = pack.get("parts", {})
			var pxf: Dictionary = meta["pxf"]
			var owned: bool = int(o.owner) >= 0
			var root_xf := Transform3D(Basis.IDENTITY.scaled(Vector3(sc, sc, sc)), Vector3(ox, oy, oz))
			for pk in parts.keys():
				var pks := String(pk)
				var pt: Transform3D = pxf.get(pks, Transform3D.IDENTITY)
				var part_xf: Transform3D
				if key == "derrick" and pks == "arm":
					var rock := sin(now * 2.2 + ox * 0.05) * (0.22 if owned else 0.0)
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.RIGHT, rock), Vector3.ZERO))
				elif key == "derrick" and pks == "crank":
					var spin := now * 2.2 + ox * 0.05 if owned else 0.0
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.RIGHT, spin), Vector3.ZERO))
				elif pks == "flag":
					var fy := sin(now * 3.8 + ox * 0.07) * 0.16
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, fy), Vector3.ZERO))
				else:
					part_xf = root_xf * pt
				_push_mm("m|" + key + "|" + pks, parts[pk] as Mesh, part_xf)
		elif B is Object and B.has_method("_bld_key") and B.has_method("_dk_info") and fr.has("per"):
			var bk: Array = B._bld_key("", key, 40.0 if o.tb == null else 60.0)
			B._dk_info(bk[0], bk[1])
			var per: Dictionary = fr["per"]
			if not per.has(bk[0]):
				per[bk[0]] = []
			(per[bk[0]] as Array).append(Transform3D(Basis.IDENTITY, Vector3(ox, oy, oz)))

		var oc := Color(0.75, 0.75, 0.75, 0.7)
		if int(o.owner) == int(B.me):
			oc = B.COL_ME
		elif int(o.owner) >= 0:
			oc = B.COL_ALLY if B.sim.ally(int(B.me), int(o.owner)) else B.COL_EN
		rings.append([Vector3(ox, oy + 1.0, oz), 34.0, oc])

	# Supply piles: keep existing crate visuals (delegated to battle.gd's crate MultiMesh when available)
	var use_host_crate: bool = B is Object and B.has_method("_dk_info") and fr.has("per")
	if use_host_crate:
		B._dk_info("crate", ["crate", "xz", 16.0])
		var per: Dictionary = fr["per"]
		if not per.has("crate"):
			per["crate"] = []
		var crate_arr: Array = per["crate"]
		for f in B.sim.fields:
			var n := clampi(int(ceil(float(f.amt) / 800.0)), 0, 16)
			for i in n:
				var ang2 := float(i) * 2.399
				var rr := 10.0 + sqrt(float(i)) * 11.0
				var cx: float = float(f.x) + cos(ang2) * rr
				var cz: float = float(f.y) + sin(ang2) * rr
				crate_arr.append(Transform3D(Basis(Vector3.UP, ang2), Vector3(cx, float(B.sim.ground_h(cx, cz)) + (8.0 if i % 5 == 4 else 0.0), cz)))
	else:
		if not _box_cache.has(14):
			_box_cache[14] = Look.box_mesh(14.0, Color(0.85, 0.75, 0.55))
		var cm: Mesh = _box_cache[14]
		for f in B.sim.fields:
			var n := clampi(int(ceil(float(f.amt) / 800.0)), 0, 16)
			for i in n:
				var ang2 := float(i) * 2.399
				var rr := 10.0 + sqrt(float(i)) * 11.0
				var cx: float = float(f.x) + cos(ang2) * rr
				var cz: float = float(f.y) + sin(ang2) * rr
				_push_mm("m|crate|", cm, Transform3D(Basis(Vector3.UP, ang2), Vector3(cx, float(B.sim.ground_h(cx, cz)) + (8.0 if i % 5 == 4 else 0.0), cz)))

	# Dugouts from bridge lines()
	var dugs: Array = _lines_cache.get("dug", [])
	if not dugs.is_empty():
		var dmeta := _get_meta("_map", "dugout")
		if bool(dmeta["ok"]):
			var dsc: float = float(dmeta["scale"])
			var dparts: Dictionary = (dmeta["pack"] as Dictionary).get("parts", {})
			var dpxf: Dictionary = dmeta["pxf"]
			for d in dugs:
				if not (d is Dictionary):
					continue
				var dx: float = float(d.get("x", 0.0))
				var dz: float = float(d.get("y", 0.0))
				var da: float = float(d.get("a", 0.0))
				var dy: float = float(B.sim.ground_h(dx, dz))
				var droot := Transform3D(Basis(Vector3.UP, -da).scaled(Vector3(dsc, dsc, dsc)), Vector3(dx, dy, dz))
				for pk in dparts.keys():
					var pks := String(pk)
					var pt: Transform3D = dpxf.get(pks, Transform3D.IDENTITY)
					_push_mm("m|dugout|" + pks, dparts[pk] as Mesh, droot * pt)


func end_frame() -> void:
	if _headless or _root == null:
		return
	for key in _mmi.keys():
		var mi: MultiMeshInstance3D = _mmi[key]
		var arr: Array = _buf.get(key, [])
		var n: int = arr.size()
		var mm := mi.multimesh
		if n == 0:
			mm.visible_instance_count = 0
			continue
		if mm.instance_count < n:
			var cap := maxi(16, mm.instance_count)
			while cap < n:
				cap *= 2
			mm.instance_count = cap
		for i in n:
			mm.set_instance_transform(i, arr[i] as Transform3D)
		mm.visible_instance_count = n


func clear() -> void:
	if _root != null and is_instance_valid(_root):
		_root.queue_free()
	if fx != null and is_instance_valid(fx):
		fx.queue_free()
	if env != null:
		if env.we != null and is_instance_valid(env.we):
			env.we.queue_free()
		if env.sun != null and is_instance_valid(env.sun):
			env.sun.queue_free()
		if env.hemi != null and is_instance_valid(env.hemi):
			env.hemi.queue_free()
		if env.grade_layer != null and is_instance_valid(env.grade_layer):
			env.grade_layer.queue_free()
		if env.rain != null and is_instance_valid(env.rain):
			env.rain.queue_free()
	_root = null
	fx = null
	env = null
	_host = null
	_mmi.clear()
	_buf.clear()
	_lines_cache.clear()
	_last_lgv = -1
	_fog_next = 0.0


# ------------------------------------------------------------------ internals
func _append_bld_overlays(B, fr: Dictionary, e, p: Vector2, gy: float, model_h: float, col: Color, issel: bool, mine: bool) -> void:
	var rings: Array = fr["rings"]
	var bars: Array = fr["bars"]
	rings.append([Vector3(p.x, gy + 1.0, p.y), float(e.size) * 0.72, Color(1, 1, 1) if issel else Color(col.r, col.g, col.b, 0.8)])
	var built: float = float(e.built)
	if issel or float(e.hp) < float(e.max) or built < 1.0:
		var max_hp: float = maxf(1.0, float(e.max))
		var f: float = clampf(built if built < 1.0 else float(e.hp) / max_hp, 0.0, 1.0)
		bars.append([Vector3(p.x, gy + model_h + 10.0, p.y), 64.0, Color(0.1, 0.1, 0.1, 0.8), f, Color(0.95, 0.8, 0.3) if built < 1.0 else Color(1.0 - f, f, 0.15)])
	if mine and issel and e.rally != null:
		var rx: float = float(e.rally.x)
		var ry: float = float(e.rally.y)
		rings.append([Vector3(rx, float(B.sim.ground_h(rx, ry)) + 1.0, ry), 10.0, Color(0.4, 1.0, 0.5)])


func _draw_bld_box_fallback(B, fr: Dictionary, e, p: Vector2, gy: float, col: Color, issel: bool, mine: bool) -> void:
	var sz: int = maxi(24, int(round(float(e.size))))
	if not _box_cache.has(sz):
		_box_cache[sz] = Look.box_mesh(float(sz), Look.BOX_COL)
	var h: float = float(sz) * 0.45
	var sink: float = (1.0 - clampf(float(e.built), 0.0, 1.0)) * h * 0.9
	_push_mm("b|_box|" + str(sz), _box_cache[sz] as Mesh, Transform3D(Basis.IDENTITY, Vector3(p.x, gy - sink, p.y)))
	_append_bld_overlays(B, fr, e, p, gy, h, col, issel, mine)


func _push_mm(key: String, mesh: Mesh, xf: Transform3D) -> void:
	if mesh == null:
		return
	if not _mmi.has(key):
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = 16
		mm.visible_instance_count = 0
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.custom_aabb = HUGE_AABB
		mi.extra_cull_margin = 16384.0
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_root.add_child(mi)
		_mmi[key] = mi
		_buf[key] = []
	(_buf[key] as Array).append(xf)


static func _make_fx_map(map: Dictionary) -> Dictionary:
	var out := map.duplicate(false)
	var gw := maxi(1, int(map.get("GW", 1)))
	var gh := maxi(1, int(map.get("GH", 1)))
	var cell := float(map.get("CELL", 40.0))
	out["GW"] = gw
	out["GH"] = gh
	out["CELL"] = cell
	if not out.has("MAPW"):
		out["MAPW"] = float(gw) * cell
	if not out.has("MAPH"):
		out["MAPH"] = float(gh) * cell

	# grid -> PackedByteArray
	var raw_grid = map.get("grid_bytes", map.get("grid", null))
	if raw_grid is PackedByteArray:
		out["grid"] = raw_grid
	elif raw_grid is Array:
		out["grid"] = PackedByteArray(raw_grid)
	else:
		var gb := PackedByteArray()
		gb.resize(gw * gh)
		out["grid"] = gb

	# hgrid.a -> PackedFloat32Array
	var hg_raw = map.get("hgrid", null)
	if hg_raw is Dictionary:
		var hg: Dictionary = (hg_raw as Dictionary).duplicate(false)
		var ha = hg.get("a_f", hg.get("a", null))
		if ha is PackedFloat32Array:
			hg["a"] = ha
		elif ha is Array:
			hg["a"] = PackedFloat32Array(ha)
		else:
			var w := maxi(1, int(hg.get("w", 1)))
			var h := maxi(1, int(hg.get("h", 1)))
			var fa := PackedFloat32Array()
			fa.resize(w * h)
			hg["a"] = fa
		out["hgrid"] = hg
	else:
		var fa := PackedFloat32Array([0.0])
		out["hgrid"] = {a = fa, w = 1, h = 1, R = 10.0}

	# road.d -> PackedByteArray (optional)
	var rd_raw = map.get("road", null)
	if rd_raw is Dictionary:
		var rd: Dictionary = (rd_raw as Dictionary).duplicate(false)
		var rda = rd.get("d_bytes", rd.get("d", null))
		if rda is PackedByteArray:
			rd["d"] = rda
		elif rda is Array:
			rd["d"] = PackedByteArray(rda)
		else:
			rd["d"] = PackedByteArray()
		out["road"] = rd
	return out


static func _get_meta(fac: String, kind_s: String) -> Dictionary:
	var key := fac + "|" + kind_s
	if _meta_cache.has(key):
		return _meta_cache[key] as Dictionary
	var pack: Dictionary = X1.merged_pack(fac, kind_s)
	if pack.is_empty():
		var miss := {ok = false}
		_meta_cache[key] = miss
		return miss
	var sc: float = float(pack.get("scale", 1.0))
	var entry: Dictionary = X1.entry(fac, kind_s)
	var pd: Dictionary = entry.get("parts", {})
	var pxf := {}
	var parts: Dictionary = pack.get("parts", {})
	for pk in parts.keys():
		var pks := String(pk)
		var t := Transform3D.IDENTITY
		var q = pks
		var guard := 0
		while q != null and String(q) != "" and pd.has(q) and guard < 8:
			var qd: Dictionary = pd[q]
			t = X1.xf(qd.get("m", null)) * t
			q = qd.get("parent", null)
			guard += 1
		pxf[pks] = t
	var h: float = _compute_height(parts, pxf, sc, float(pack.get("h", 40.0)))
	var meta := {
		ok = true,
		pack = pack,
		pxf = pxf,
		h = h,
		scale = sc,
	}
	_meta_cache[key] = meta
	return meta


static func _compute_height(parts: Dictionary, pxf: Dictionary, sc: float, fallback_h: float) -> float:
	var max_y := 0.0
	for pk in parts.keys():
		var m = parts[pk]
		if not (m is Mesh):
			continue
		var bb: AABB = (m as Mesh).get_aabb()
		var t: Transform3D = pxf.get(String(pk), Transform3D.IDENTITY)
		for ci in 8:
			var pt := t * bb.get_endpoint(ci)
			if pt.y > max_y:
				max_y = pt.y
	if max_y > 1.0:
		return maxf(16.0, max_y * sc)
	return maxf(16.0, fallback_h)
