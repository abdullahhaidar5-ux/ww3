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
const BLD_FX_DIST_SQ := 2000.0 * 2000.0

const C_BLD_SMK1 := Color(0.24, 0.23, 0.22)
const C_BLD_SMK2 := Color(0.32, 0.31, 0.30)
const C_BLD_BLK := Color(0.14, 0.13, 0.12)
const C_BLD_FIRE1 := Color(1.0, 0.52, 0.14)
const C_BLD_FIRE2 := Color(0.90, 0.16, 0.04)
const C_BLD_EMBER1 := Color(1.0, 0.78, 0.32)
const C_BLD_EMBER2 := Color(1.0, 0.35, 0.08)

static var _meta_cache: Dictionary = {} # "fac|kind" -> {ok, pack, pxf, h, scale}
static var _box_cache: Dictionary = {}  # int_size -> Mesh
static var _civ_mesh_cache: Dictionary = {} # "theme|variant" -> ArrayMesh

var env = null          # LookEnv instance
var fx = null           # LookFx Node3D instance
var _host: Node3D = null
var _root: Node3D = null
var _mmi: Dictionary = {} # key -> MultiMeshInstance3D
var _buf: Dictionary = {} # key -> Array[Transform3D]
var _ao_mi: MultiMeshInstance3D = null
var _ao_xf: Array[Transform3D] = []
var _ao_col: Array[Color] = []
var _pad_mi: MultiMeshInstance3D = null
var _pad_xf: Array[Transform3D] = []
var _bld_fx_cd: Dictionary = {} # eid (int) -> float (next damage smoke/fire emit time)
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
	_setup_ao()
	_setup_base_pads(String(map.get("theme", "desert")))
	_setup_civ_buildings(sim, map)


func _setup_base_pads(th: String) -> void:
	# Grounded C&C Generals concrete/gravel military compound apron under every base building
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var c_edge := Color(0.32, 0.31, 0.28)
	var c_slab := Color(0.46, 0.44, 0.40)
	var c_trim := Color(0.58, 0.52, 0.34)
	if th == "snow":
		c_edge = Color(0.36, 0.39, 0.44); c_slab = Color(0.50, 0.53, 0.57)
	elif th == "green":
		c_edge = Color(0.28, 0.30, 0.26); c_slab = Color(0.40, 0.40, 0.38)
	# Outer compacted bevel skirt + inner poured military concrete pad + corner hazard stripes
	_civ_box(st, Vector3(0.0, 0.14, 0.0), Vector3(2.35, 0.28, 2.35), c_edge)
	_civ_box(st, Vector3(0.0, 0.26, 0.0), Vector3(2.08, 0.24, 2.08), c_slab)
	for sx in [-0.94, 0.94]:
		for sz in [-0.94, 0.94]:
			_civ_box(st, Vector3(sx, 0.39, sz), Vector3(0.24, 0.04, 0.24), c_trim)
	var m := st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.albedo_color = Color.WHITE
	mat.roughness = 0.88
	mat.metallic = 0.04
	if ResourceLoader.exists("res://tex/road_nrm.png"):
		mat.normal_enabled = true
		mat.normal_texture = load("res://tex/road_nrm.png")
		mat.normal_scale = 0.45
	m.surface_set_material(0, mat)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = m
	mm.instance_count = 64
	mm.visible_instance_count = 0
	var mi := MultiMeshInstance3D.new()
	mi.name = "BldFoundationPads"
	mi.multimesh = mm
	mi.custom_aabb = HUGE_AABB
	mi.extra_cull_margin = 16384.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_root.add_child(mi)
	_pad_mi = mi


func _setup_ao() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(2.0, 2.0)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = pm
	mm.instance_count = 64
	mm.visible_instance_count = 0
	var mi := MultiMeshInstance3D.new()
	mi.name = "BldContactAO"
	mi.multimesh = mm
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/contact_ao.gdshader")
	mat.render_priority = -1
	mi.material_override = mat
	mi.custom_aabb = HUGE_AABB
	mi.extra_cull_margin = 16384.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_root.add_child(mi)
	_ao_mi = mi


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
			_sync_bridges(_lines_cache)
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
		if _host != null:
			var tm := _host.get_node_or_null("TerrainMesh")
			if tm is MeshInstance3D and (tm as MeshInstance3D).material_override is ShaderMaterial:
				((tm as MeshInstance3D).material_override as ShaderMaterial).set_shader_parameter("wetness", float(env.wet))
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
	_ao_xf.clear()
	_ao_col.clear()
	_pad_xf.clear()
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

	# Grounded CoH3/Zero Hour concrete military compound pad + contact AO shadow disc beneath building footprint
	var pad_r: float = maxf(float(e.r) * 0.96, 18.0)
	_pad_xf.append(Transform3D(Basis.IDENTITY.scaled(Vector3(pad_r, 1.0, pad_r)), Vector3(p.x, gy + 0.04, p.y)))
	var ao_r: float = maxf(float(e.r) * 1.24, 22.0)
	_ao_xf.append(Transform3D(Basis.IDENTITY.scaled(Vector3(ao_r, 1.0, ao_r)), Vector3(p.x, gy + 0.36, p.y)))
	_ao_col.append(Color(1.0, 1.0, 1.0, 0.38 * maxf(0.25, built)))

	_emit_bld_damage_fx(B, e, p, gy, h, now)
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

	if _pad_mi != null:
		var pad_mm := _pad_mi.multimesh
		var pad_n := _pad_xf.size()
		if pad_n == 0:
			pad_mm.visible_instance_count = 0
		else:
			if pad_mm.instance_count < pad_n:
				var cap := maxi(64, pad_mm.instance_count)
				while cap < pad_n:
					cap *= 2
				pad_mm.instance_count = cap
			for i in pad_n:
				pad_mm.set_instance_transform(i, _pad_xf[i])
			pad_mm.visible_instance_count = pad_n

	if _ao_mi != null:
		var ao_mm := _ao_mi.multimesh
		var ao_n := _ao_xf.size()
		if ao_n == 0:
			ao_mm.visible_instance_count = 0
		else:
			if ao_mm.instance_count < ao_n:
				var cap := maxi(64, ao_mm.instance_count)
				while cap < ao_n:
					cap *= 2
				ao_mm.instance_count = cap
			for i in ao_n:
				ao_mm.set_instance_transform(i, _ao_xf[i])
				ao_mm.set_instance_color(i, _ao_col[i])
			ao_mm.visible_instance_count = ao_n


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
	_ao_mi = null
	_ao_xf.clear()
	_ao_col.clear()
	_pad_mi = null
	_pad_xf.clear()
	fx = null
	env = null
	_host = null
	_mmi.clear()
	_buf.clear()
	_bld_fx_cd.clear()
	_lines_cache.clear()
	_last_lgv = -1
	_fog_next = 0.0


# ------------------------------------------------------------------ internals
func _emit_bld_damage_fx(B, e, p: Vector2, gy: float, h: float, now: float) -> void:
	if fx == null or float(e.built) < 1.0 or float(e.max) <= 0.0:
		return
	var hp_ratio: float = float(e.hp) / float(e.max)
	if hp_ratio >= 0.55:
		return
	if p.distance_squared_to(B.cam_target) > BLD_FX_DIST_SQ:
		return
	var eid_i: int = int(e.id)
	if now < float(_bld_fx_cd.get(eid_i, 0.0)):
		return
	var critical: bool = hp_ratio < 0.30
	_bld_fx_cd[eid_i] = now + (0.20 if critical else 0.28)
	var spread: float = maxf(6.0, float(e.size) * 0.25)
	var sx: float = p.x + randf_range(-spread, spread)
	var sz: float = p.y + randf_range(-spread, spread)
	fx.part(false, Vector3(sx, gy + h * 0.65, sz), Vector3(randf_range(-5.0, 5.0), 14.0, randf_range(-5.0, 5.0)), 2.4, 12.0, 22.0, 0.60, C_BLD_BLK if critical else C_BLD_SMK1, C_BLD_SMK2, 16.0, 0.42, 0)
	if critical:
		var fx_x: float = p.x + randf_range(-spread, spread)
		var fx_z: float = p.y + randf_range(-spread, spread)
		fx.part(true, Vector3(fx_x, gy + h * 0.50, fx_z), Vector3(randf_range(-4.0, 4.0), randf_range(10.0, 20.0), randf_range(-4.0, 4.0)), 0.55, 11.0, -4.0, 0.95, C_BLD_FIRE1, C_BLD_FIRE2, 16.0, 0.40, 0)
		fx.part(true, Vector3(fx_x, gy + h * 0.62, fx_z), Vector3(randf_range(-16.0, 16.0), randf_range(26.0, 48.0), randf_range(-16.0, 16.0)), 0.95, 2.6, -1.5, 1.0, C_BLD_EMBER1, C_BLD_EMBER2, 18.0, 0.55, 0)


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
	_emit_bld_damage_fx(B, e, p, gy, h, float(B.t))
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


# ------------------------------------------------------------------ destroyed bridge sync
func _sync_bridges(L: Dictionary) -> void:
	if _host == null or not L.has("bridges_dead"):
		return
	var b_root := _host.get_node_or_null("Bridges")
	if b_root == null:
		return
	var dead_raw = L.get("bridges_dead", [])
	if not (dead_raw is Array):
		return
	var dead_set := {}
	for idx in dead_raw:
		dead_set[int(idx)] = true
	for ch in b_root.get_children():
		var nm := String(ch.name)
		if nm.begins_with("Bridge_") and ch is Node3D:
			var bi := int(nm.substr(7))
			(ch as Node3D).visible = not dead_set.has(bi)


# ------------------------------------------------------------------ static civilian / village buildings (map.civ)
func _setup_civ_buildings(sim, map: Dictionary) -> void:
	if _root == null:
		return
	var civ_raw = map.get("civ", null)
	if not (civ_raw is Array) or (civ_raw as Array).is_empty():
		return
	var civ_arr: Array = civ_raw
	var th := String(map.get("theme", "desert"))
	var has_gh: bool = sim != null and sim.has_method("ground_h")
	var buckets := [[], [], []]

	for idx in civ_arr.size():
		var c = civ_arr[idx]
		if not (c is Dictionary):
			continue
		var cx := float(c.get("x", 0.0))
		var cz := float(c.get("y", 0.0))
		var ch := float(c.get("h", 26.0))
		var rot := float(c.get("rot", 0.0))
		var is_ruin := int(c.get("ruin", 0)) != 0
		var ci := int(c.get("i", idx))
		var gy := float(sim.ground_h(cx, cz)) if has_gh else 0.0

		var v := 2 if is_ruin else (ci & 1)
		var sy: float
		var sxz: float
		if is_ruin:
			sy = clampf(maxf(ch, 10.0) / 14.0, 0.75, 1.35)
			sxz = 0.94 + float((ci * 29) % 15) * 0.01
		else:
			sy = clampf(maxf(ch, 16.0) / 30.0, 0.55, 1.85)
			sxz = 0.92 + float((ci * 37) % 17) * 0.01
		var xf := Transform3D(Basis(Vector3.UP, -rot).scaled(Vector3(sxz, sy, sxz)), Vector3(cx, gy - 1.5, cz))
		(buckets[v] as Array).append(xf)

	for v in 3:
		var xfs: Array = buckets[v]
		if xfs.is_empty():
			continue
		var mesh := _get_civ_mesh(th, v)
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = xfs.size()
		for i in xfs.size():
			mm.set_instance_transform(i, xfs[i] as Transform3D)
		var mi := MultiMeshInstance3D.new()
		mi.name = "CivBuildings_%d" % v
		mi.multimesh = mm
		mi.custom_aabb = HUGE_AABB
		mi.extra_cull_margin = 16384.0
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_root.add_child(mi)


static func _get_civ_mesh(theme: String, variant: int) -> ArrayMesh:
	var th := "snow" if theme == "snow" else ("desert" if theme == "desert" else "green")
	var key := "%s|%d" % [th, variant]
	if _civ_mesh_cache.has(key):
		return _civ_mesh_cache[key] as ArrayMesh

	var st_wall := SurfaceTool.new(); st_wall.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_roof := SurfaceTool.new(); st_roof.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_win := SurfaceTool.new(); st_win.begin(Mesh.PRIMITIVE_TRIANGLES)
	var has_win := false

	var c_win := Color(0.11, 0.13, 0.17)
	var c_door := Color(0.18, 0.14, 0.11)

	if variant == 2:
		# Broken-wall ruin (base height ~14)
		var c_w := Color(0.70, 0.62, 0.49)
		var c_r := Color(0.45, 0.41, 0.35)
		var c_beam := Color(0.22, 0.20, 0.19)
		if th == "green":
			c_w = Color(0.56, 0.54, 0.50); c_r = Color(0.42, 0.41, 0.39)
		elif th == "snow":
			c_w = Color(0.58, 0.61, 0.65); c_r = Color(0.75, 0.80, 0.86)
		# Rubble foundation slab
		_civ_box(st_roof, Vector3(0.0, 0.8, 0.0), Vector3(30.0, 1.6, 28.0), c_r)
		# Jagged broken walls on 3 sides + corner pillar
		_civ_box(st_wall, Vector3(-13.2, 6.2, -3.5), Vector3(2.8, 12.4, 20.0), c_w)
		_civ_box(st_wall, Vector3(-13.2, 13.0, -9.0), Vector3(2.8, 3.0, 7.0), c_w * 0.94)
		_civ_box(st_wall, Vector3(-2.0, 4.8, -12.6), Vector3(22.0, 9.6, 2.8), c_w * 0.96)
		_civ_box(st_wall, Vector3(13.0, 3.4, -5.5), Vector3(2.8, 6.8, 14.0), c_w * 0.92)
		_civ_box(st_wall, Vector3(-12.5, 7.2, 11.5), Vector3(4.5, 14.4, 4.5), c_w * 0.90)
		# Scattered interior rubble chunks & charred timber beam
		_civ_box(st_roof, Vector3(-4.0, 2.4, 2.0), Vector3(7.5, 3.2, 6.5), c_r * 0.92)
		_civ_box(st_roof, Vector3(5.5, 2.0, 5.0), Vector3(8.0, 2.4, 5.5), c_r * 0.86)
		_civ_box(st_roof, Vector3(2.0, 2.8, -5.0), Vector3(6.0, 3.8, 5.0), c_w * 0.85)
		_civ_box(st_roof, Vector3(0.5, 4.3, 1.0), Vector3(16.0, 1.1, 1.6), c_beam)
	elif th == "desert":
		if variant == 0:
			# Flat-roofed Middle Eastern sandstone compound with courtyard yard plinth, low mudbrick perimeter wall, parapet & rooftop gear
			var c_yard := Color(0.50, 0.44, 0.34)
			var c_plinth := Color(0.58, 0.50, 0.39)
			var c_stucco := Color(0.76, 0.68, 0.55)
			var c_parapet := Color(0.80, 0.72, 0.59)
			var c_roof := Color(0.58, 0.52, 0.42)
			var c_ac := Color(0.58, 0.61, 0.60)
			# Grounded dusty compound courtyard slab + low corner garden walls
			_civ_box(st_roof, Vector3(0.0, 0.5, 0.0), Vector3(44.0, 1.0, 42.0), c_yard)
			_civ_box(st_wall, Vector3(-20.6, 3.2, -5.0), Vector3(1.8, 5.4, 28.0), c_plinth)
			_civ_box(st_wall, Vector3(0.0, 3.2, -19.6), Vector3(42.0, 5.4, 1.8), c_plinth)
			_civ_box(st_wall, Vector3(20.6, 3.2, 6.0), Vector3(1.8, 5.4, 24.0), c_plinth)
			_civ_box(st_wall, Vector3(0.0, 1.8, 0.0), Vector3(31.2, 3.4, 29.2), c_plinth)
			_civ_box(st_wall, Vector3(0.0, 15.0, 0.0), Vector3(30.0, 24.0, 28.0), c_stucco)
			# Roof slab + 4 parapet walls
			_civ_box(st_roof, Vector3(0.0, 27.3, 0.0), Vector3(28.0, 0.8, 26.0), c_roof)
			_civ_box(st_wall, Vector3(0.0, 28.6, 13.0), Vector3(30.4, 3.2, 2.0), c_parapet)
			_civ_box(st_wall, Vector3(0.0, 28.6, -13.0), Vector3(30.4, 3.2, 2.0), c_parapet)
			_civ_box(st_wall, Vector3(14.0, 28.6, 0.0), Vector3(2.0, 3.2, 24.4), c_parapet)
			_civ_box(st_wall, Vector3(-14.0, 28.6, 0.0), Vector3(2.0, 3.2, 24.4), c_parapet)
			# Rooftop stairwell penthouse + AC condenser + water tank + satellite mast
			_civ_box(st_wall, Vector3(-6.0, 30.2, -5.0), Vector3(9.5, 5.4, 8.5), c_stucco * 0.96)
			_civ_box(st_roof, Vector3(-6.0, 33.1, -5.0), Vector3(10.0, 0.6, 9.0), c_roof)
			_civ_box(st_roof, Vector3(6.5, 29.3, 4.5), Vector3(5.6, 3.6, 4.4), c_ac)
			_civ_box(st_roof, Vector3(7.0, 29.9, -5.5), Vector3(4.0, 4.8, 4.0), Color(0.68, 0.70, 0.70))
			_civ_box(st_roof, Vector3(-11.0, 31.2, 9.5), Vector3(0.7, 5.2, 0.7), Color(0.42, 0.44, 0.46))
			_civ_box(st_roof, Vector3(-10.4, 33.4, 9.5), Vector3(3.4, 2.4, 0.8), Color(0.74, 0.75, 0.76))
			# Window cutouts on all 4 facades + doorway
			has_win = true
			for row_y in [11.5, 20.5]:
				for wx in [-8.5, 0.0, 8.5]:
					if not (row_y < 14.0 and absf(wx) < 1.0):
						_civ_box(st_win, Vector3(wx, row_y, 14.15), Vector3(4.0, 4.6, 0.4), c_win)
					_civ_box(st_win, Vector3(wx, row_y, -14.15), Vector3(4.0, 4.6, 0.4), c_win)
				for wz in [-7.0, 7.0]:
					_civ_box(st_win, Vector3(15.15, row_y, wz), Vector3(0.4, 4.6, 4.2), c_win)
					_civ_box(st_win, Vector3(-15.15, row_y, wz), Vector3(0.4, 4.6, 4.2), c_win)
			_civ_box(st_win, Vector3(0.0, 7.2, 14.18), Vector3(5.2, 8.8, 0.45), c_door)
		else:
			# Stepped ochre terrace compound with dusty yard pad, side annex & roof shade pergola
			var c_yard := Color(0.48, 0.42, 0.32)
			var c_stucco := Color(0.72, 0.62, 0.47)
			var c_annex := Color(0.78, 0.71, 0.58)
			var c_roof := Color(0.58, 0.51, 0.40)
			var c_wood := Color(0.38, 0.28, 0.20)
			_civ_box(st_roof, Vector3(1.0, 0.5, 0.5), Vector3(45.0, 1.0, 38.0), c_yard)
			_civ_box(st_wall, Vector3(-5.0, 13.8, 0.0), Vector3(22.0, 27.6, 26.0), c_stucco)
			_civ_box(st_wall, Vector3(11.0, 9.0, 1.0), Vector3(12.0, 18.0, 22.0), c_annex)
			# Parapet walls on main roof & annex roof
			_civ_box(st_roof, Vector3(-5.0, 27.9, 0.0), Vector3(20.4, 0.7, 24.4), c_roof)
			_civ_box(st_wall, Vector3(-5.0, 29.1, 12.1), Vector3(22.4, 2.8, 1.8), c_stucco * 1.04)
			_civ_box(st_wall, Vector3(-5.0, 29.1, -12.1), Vector3(22.4, 2.8, 1.8), c_stucco * 1.04)
			_civ_box(st_wall, Vector3(-15.1, 29.1, 0.0), Vector3(1.8, 2.8, 22.6), c_stucco * 1.04)
			_civ_box(st_wall, Vector3(5.1, 29.1, 0.0), Vector3(1.8, 2.8, 22.6), c_stucco * 1.04)
			_civ_box(st_roof, Vector3(11.0, 18.3, 1.0), Vector3(10.8, 0.6, 20.6), c_roof)
			_civ_box(st_wall, Vector3(11.0, 19.3, 11.2), Vector3(12.2, 2.2, 1.6), c_annex * 1.04)
			_civ_box(st_wall, Vector3(11.0, 19.3, -9.2), Vector3(12.2, 2.2, 1.6), c_annex * 1.04)
			_civ_box(st_wall, Vector3(16.2, 19.3, 1.0), Vector3(1.6, 2.2, 19.2), c_annex * 1.04)
			# Roof AC unit + shade canopy on annex terrace
			_civ_box(st_roof, Vector3(-9.0, 29.8, -5.0), Vector3(5.4, 3.4, 4.2), Color(0.60, 0.63, 0.62))
			_civ_box(st_roof, Vector3(11.0, 23.6, 1.0), Vector3(9.0, 0.8, 12.0), c_wood)
			for px in [7.2, 14.8]:
				for pz in [-4.0, 6.0]:
					_civ_box(st_roof, Vector3(px, 21.0, pz), Vector3(0.9, 5.0, 0.9), c_wood)
			has_win = true
			for row_y in [10.5, 20.0]:
				for wx in [-10.0, 0.0]:
					_civ_box(st_win, Vector3(wx, row_y, 13.15), Vector3(4.0, 4.6, 0.4), c_win)
					_civ_box(st_win, Vector3(wx, row_y, -13.15), Vector3(4.0, 4.6, 0.4), c_win)
				for wz in [-6.5, 6.5]:
					_civ_box(st_win, Vector3(-16.15, row_y, wz), Vector3(0.4, 4.6, 4.2), c_win)
			_civ_box(st_win, Vector3(11.0, 10.0, 12.15), Vector3(4.2, 4.6, 0.4), c_win)
			_civ_box(st_win, Vector3(17.15, 10.0, 1.0), Vector3(0.4, 4.6, 4.6), c_win)
			_civ_box(st_win, Vector3(-5.0, 6.8, 13.18), Vector3(4.8, 8.2, 0.45), c_door)
	else:
		# Temperate ("green") or Winter ("snow") pitched-roof stone/plaster village houses with grounded stone yard & perimeter wall
		var is_snow := th == "snow"
		var c_yard := Color(0.56, 0.60, 0.66) if is_snow else Color(0.36, 0.35, 0.31)
		var c_fence := Color(0.44, 0.46, 0.49) if is_snow else Color(0.46, 0.44, 0.40)
		if variant == 0:
			var c_base := Color(0.38, 0.40, 0.43) if is_snow else Color(0.42, 0.40, 0.37)
			var c_wall := Color(0.70, 0.72, 0.76) if is_snow else Color(0.70, 0.67, 0.60)
			# Weathered muted terracotta (NOT neon toy orange!)
			var c_roof := Color(0.84, 0.88, 0.93) if is_snow else Color(0.43, 0.27, 0.21)
			var c_chim := Color(0.42, 0.35, 0.33) if is_snow else Color(0.44, 0.28, 0.23)
			# Grounded cobbled/earth yard + low stone garden walls
			_civ_box(st_roof, Vector3(0.0, 0.5, 0.0), Vector3(44.0, 1.0, 39.0), c_yard)
			_civ_box(st_wall, Vector3(-20.8, 2.5, -2.0), Vector3(1.8, 4.2, 30.0), c_fence)
			_civ_box(st_wall, Vector3(0.0, 2.5, -18.5), Vector3(42.0, 4.2, 1.8), c_fence)
			_civ_box(st_wall, Vector3(0.0, 2.0, 0.0), Vector3(31.0, 4.0, 27.0), c_base)
			_civ_box(st_wall, Vector3(0.0, 12.75, 0.0), Vector3(30.0, 17.5, 26.0), c_wall)
			_civ_gable_roof(st_roof, st_wall, Vector3(0.0, 21.5, 0.0), 32.6, 28.6, 9.8, c_roof, c_wall)
			_civ_box(st_roof, Vector3(8.5, 29.0, -5.5), Vector3(3.8, 9.0, 3.8), c_chim)
			has_win = true
			for row_y in [9.5, 16.5]:
				for wx in [-8.5, 0.0, 8.5]:
					if not (row_y < 12.0 and absf(wx) < 1.0):
						_civ_box(st_win, Vector3(wx, row_y, 13.15), Vector3(3.8, 4.2, 0.4), c_win)
					_civ_box(st_win, Vector3(wx, row_y, -13.15), Vector3(3.8, 4.2, 0.4), c_win)
				for wz in [-6.5, 6.5]:
					_civ_box(st_win, Vector3(15.15, row_y, wz), Vector3(0.4, 4.2, 3.8), c_win)
					_civ_box(st_win, Vector3(-15.15, row_y, wz), Vector3(0.4, 4.2, 3.8), c_win)
			_civ_box(st_win, Vector3(0.0, 6.8, 13.18), Vector3(4.8, 8.0, 0.45), c_door)
		else:
			var c_base := Color(0.42, 0.44, 0.46) if is_snow else Color(0.44, 0.42, 0.39)
			var c_upper := Color(0.60, 0.60, 0.60) if is_snow else Color(0.64, 0.60, 0.52)
			var c_trim := Color(0.25, 0.24, 0.23)
			var c_roof := Color(0.80, 0.85, 0.91) if is_snow else Color(0.30, 0.31, 0.32)
			_civ_box(st_roof, Vector3(0.0, 0.5, 0.0), Vector3(46.0, 1.0, 38.0), c_yard)
			_civ_box(st_wall, Vector3(21.8, 2.5, 2.0), Vector3(1.8, 4.2, 28.0), c_fence)
			_civ_box(st_wall, Vector3(0.0, 5.2, 0.0), Vector3(34.0, 10.4, 26.0), c_base)
			_civ_box(st_roof, Vector3(0.0, 10.8, 0.0), Vector3(35.0, 1.1, 27.0), c_trim)
			_civ_box(st_wall, Vector3(0.0, 16.5, 0.0), Vector3(34.2, 10.6, 26.2), c_upper)
			_civ_gable_roof(st_roof, st_wall, Vector3(0.0, 21.8, 0.0), 36.8, 28.8, 9.6, c_roof, c_upper)
			_civ_box(st_roof, Vector3(-9.5, 29.2, 5.5), Vector3(3.6, 8.6, 3.6), Color(0.40, 0.30, 0.26))
			has_win = true
			for row_y in [7.2, 16.4]:
				for wx in [-10.5, 0.0, 10.5]:
					if not (row_y < 10.0 and absf(wx) < 1.0):
						_civ_box(st_win, Vector3(wx, row_y, 13.25), Vector3(4.0, 4.4, 0.4), c_win)
					_civ_box(st_win, Vector3(wx, row_y, -13.25), Vector3(4.0, 4.4, 0.4), c_win)
				for wz in [-6.5, 6.5]:
					_civ_box(st_win, Vector3(17.25, row_y, wz), Vector3(0.4, 4.4, 4.0), c_win)
					_civ_box(st_win, Vector3(-17.25, row_y, wz), Vector3(0.4, 4.4, 4.0), c_win)
			_civ_box(st_win, Vector3(0.0, 5.8, 13.28), Vector3(5.0, 8.2, 0.45), c_door)

	var am := ArrayMesh.new()
	var mat_wall := StandardMaterial3D.new()
	mat_wall.vertex_color_use_as_albedo = true
	mat_wall.vertex_color_is_srgb = true
	mat_wall.albedo_color = Color.WHITE
	mat_wall.roughness = 0.92
	mat_wall.metallic = 0.03

	var mat_roof := StandardMaterial3D.new()
	mat_roof.vertex_color_use_as_albedo = true
	mat_roof.vertex_color_is_srgb = true
	mat_roof.albedo_color = Color.WHITE
	mat_roof.roughness = 0.78
	mat_roof.metallic = 0.10

	var mat_win := StandardMaterial3D.new()
	mat_win.vertex_color_use_as_albedo = true
	mat_win.vertex_color_is_srgb = true
	mat_win.albedo_color = Color.WHITE
	mat_win.roughness = 0.24
	mat_win.metallic = 0.35

	st_wall.commit(am)
	am.surface_set_material(am.get_surface_count() - 1, mat_wall)
	st_roof.commit(am)
	am.surface_set_material(am.get_surface_count() - 1, mat_roof)
	if has_win:
		st_win.commit(am)
		am.surface_set_material(am.get_surface_count() - 1, mat_win)

	_civ_mesh_cache[key] = am
	return am


static func _civ_quad(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, n: Vector3, col: Color) -> void:
	if (p2 - p0).cross(p1 - p0).dot(n) >= 0.0:
		for v in [p0, p1, p2, p0, p2, p3]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)
	else:
		for v in [p0, p3, p2, p0, p2, p1]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)


static func _civ_tri(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, n: Vector3, col: Color) -> void:
	if (p2 - p0).cross(p1 - p0).dot(n) >= 0.0:
		for v in [p0, p1, p2]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)
	else:
		for v in [p0, p2, p1]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)


static func _civ_box(st: SurfaceTool, c: Vector3, s: Vector3, col: Color) -> void:
	var h := s * 0.5
	var x0 := c.x - h.x; var x1 := c.x + h.x
	var y0 := c.y - h.y; var y1 := c.y + h.y
	var z0 := c.z - h.z; var z1 := c.z + h.z
	_civ_quad(st, Vector3(x0, y1, z0), Vector3(x1, y1, z0), Vector3(x1, y1, z1), Vector3(x0, y1, z1), Vector3.UP, col)
	_civ_quad(st, Vector3(x0, y0, z1), Vector3(x1, y0, z1), Vector3(x1, y0, z0), Vector3(x0, y0, z0), Vector3.DOWN, col * 0.72)
	_civ_quad(st, Vector3(x1, y0, z0), Vector3(x1, y1, z0), Vector3(x1, y1, z1), Vector3(x1, y0, z1), Vector3.RIGHT, col * 0.90)
	_civ_quad(st, Vector3(x0, y0, z1), Vector3(x0, y1, z1), Vector3(x0, y1, z0), Vector3(x0, y0, z0), Vector3.LEFT, col * 0.86)
	_civ_quad(st, Vector3(x0, y0, z1), Vector3(x0, y1, z1), Vector3(x1, y1, z1), Vector3(x1, y0, z1), Vector3.BACK, col * 0.95)
	_civ_quad(st, Vector3(x1, y0, z0), Vector3(x1, y1, z0), Vector3(x0, y1, z0), Vector3(x0, y0, z0), Vector3.FORWARD, col * 0.84)


static func _civ_gable_roof(st_roof: SurfaceTool, st_wall: SurfaceTool, base: Vector3, w: float, d: float, h: float, c_roof: Color, c_gable: Color) -> void:
	var hx := w * 0.5
	var hz := d * 0.5
	var y0 := base.y
	var y1 := base.y + h
	var p_fl := Vector3(base.x - hx, y0, base.z + hz)
	var p_fr := Vector3(base.x + hx, y0, base.z + hz)
	var p_bl := Vector3(base.x - hx, y0, base.z - hz)
	var p_br := Vector3(base.x + hx, y0, base.z - hz)
	var r_l := Vector3(base.x - hx, y1, base.z)
	var r_r := Vector3(base.x + hx, y1, base.z)
	var n_front := Vector3(0.0, hz, h).normalized()
	var n_back := Vector3(0.0, hz, -h).normalized()
	# Two pitched roof slopes + thin underside eaves
	_civ_quad(st_roof, p_fl, p_fr, r_r, r_l, n_front, c_roof)
	_civ_quad(st_roof, p_br, p_bl, r_l, r_r, n_back, c_roof * 0.88)
	_civ_quad(st_roof, p_bl, p_br, p_fr, p_fl, Vector3.DOWN, c_roof * 0.55)
	# Inset gable triangles matching wall plaster
	var gx := hx - 1.2
	var gz := hz - 1.2
	_civ_tri(st_wall, Vector3(base.x - gx, y0, base.z + gz), Vector3(base.x - gx, y0, base.z - gz), Vector3(base.x - gx, y1 - 0.3, base.z), Vector3.LEFT, c_gable * 0.86)
	_civ_tri(st_wall, Vector3(base.x + gx, y0, base.z - gz), Vector3(base.x + gx, y0, base.z + gz), Vector3(base.x + gx, y1 - 0.3, base.z), Vector3.RIGHT, c_gable * 0.90)
