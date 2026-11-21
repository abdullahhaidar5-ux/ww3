extends Node3D
# World War 3 - Godot edition, Test range slice (2026-11-21).
# One script on purpose for the first playable: world, models (merged + GPU-instanced), simulation at 30 Hz with
# render interpolation, C&C controls, Test range panel. Iran (you) vs United States targets.

const MAP_W := 3200.0
const MAP_H := 2200.0
const CH_X := MAP_W * 0.5          # sea lane through the middle
const CH_HALF := 70.0
const BRIDGES := [MAP_H * 0.3, MAP_H * 0.7]
const BR_HALF := 46.0
const ME := 0
const EN := 1
const TEAM_COL := [Color(0.35, 0.85, 0.45), Color(0.35, 0.6, 1.0)]

# unit stats (from src/01-data.js BASE)
const ST := {
	"inf":   {"hp": 120.0, "spd": 48.0, "rng": 150.0, "dmg": 11.0, "rof": 0.8, "wpn": "gun", "armor": "light", "n": 4, "r": 9.0, "sight": 260.0},
	"at":    {"hp": 110.0, "spd": 44.0, "rng": 190.0, "dmg": 45.0, "rof": 2.0, "wpn": "at", "armor": "light", "n": 2, "r": 8.0, "sight": 280.0},
	"tank":  {"hp": 600.0, "spd": 58.0, "rng": 200.0, "dmg": 55.0, "rof": 1.6, "wpn": "cannon", "armor": "heavy", "n": 1, "r": 16.0, "sight": 300.0},
	"drone": {"hp": 60.0, "spd": 150.0, "rng": 0.0, "dmg": 420.0, "rof": 1.0, "wpn": "", "armor": "air", "n": 1, "r": 10.0, "sight": 0.0, "blast": 75.0},
	"harv":  {"hp": 450.0, "spd": 62.0, "rng": 0.0, "dmg": 0.0, "rof": 1.0, "wpn": "", "armor": "heavy", "n": 1, "r": 13.0, "sight": 200.0},
	"hq":      {"hp": 3000.0, "size": 110.0, "armor": "bld"},
	"barracks":{"hp": 1400.0, "size": 80.0, "armor": "bld"},
	"factory": {"hp": 1800.0, "size": 100.0, "armor": "bld"},
}
const MULT := {"gun": {"light": 1.0, "heavy": 0.2, "bld": 0.25, "air": 0.7}, "at": {"light": 0.45, "heavy": 1.6, "bld": 1.0, "air": 0.0}, "cannon": {"light": 0.8, "heavy": 1.0, "bld": 1.3, "air": 0.0}}

# model per (kind, team): key, fit axis, size (game units, same scale as the browser game: soldier ~16 tall, tank ~38 long x VEH_SCALE)
const MODELS := {
	"inf0": ["sol_m", "y", 16.0], "inf1": ["sol_w", "y", 16.0],
	"at0": ["sol_m", "y", 16.0], "at1": ["sol_w", "y", 16.0],
	"tank0": ["m_t72", "xz", 46.0], "tank1": ["m_abrams", "xz", 46.0],
	"drone0": ["@shahed", "xz", 30.0], "drone1": ["@shahed", "xz", 30.0],
	"harv0": ["m_ural", "xz", 40.0], "harv1": ["m_m35", "xz", 40.0],
	"hq0": ["b_hq_me", "xz", 120.0], "hq1": ["b_hq", "xz", 120.0],
	"barracks0": ["b_barr", "xz", 90.0], "barracks1": ["b_barr", "xz", 90.0],
	"factory0": ["b_fact_me", "xz", 110.0], "factory1": ["b_fact", "xz", 110.0],
}
var YAW_FIX := {}
# paint per model (the browser game paints these in code: nation colours, camouflage)
const TINT := {
	"m_t72": Color(0.50, 0.49, 0.33), "m_abrams": Color(0.78, 0.69, 0.50),
	"m_ural": Color(0.46, 0.47, 0.33), "m_m35": Color(0.74, 0.66, 0.48),
	"sol_m": Color(0.55, 0.56, 0.40), "sol_w": Color(0.80, 0.72, 0.55),
	"tree1": Color(0.55, 0.58, 0.40), "tree2": Color(0.55, 0.58, 0.40), "tree3": Color(0.55, 0.58, 0.40),
	"b_barr": Color(0.80, 0.77, 0.70), "b_hq": Color(0.82, 0.78, 0.70), "b_barr_me": Color(0.86, 0.76, 0.60), "b_fact": Color(0.82, 0.80, 0.74),
}   # per model key: extra turn so the model faces +X (filled after looking at it)

class Ent:
	var id := 0
	var team := 0
	var kind := ""
	var is_b := false
	var pos := Vector2.ZERO
	var prev := Vector2.ZERO
	var ang := 0.0
	var hp := 1.0
	var max_hp := 1.0
	var order := ""        # "", "move", "attack", "amove"
	var tpos := Vector2.ZERO
	var target: Ent = null
	var cd := 0.0
	var scan := 0.0
	var dead := false
	var rally := Vector2.ZERO
	var wp := Vector2.INF  # bridge waypoint
	var fire_t := -9.0

var ents: Array = []
var next_id := 1
var sel: Array = []
var t := 0.0
var enemy_fights := true

# drawing
var meshes := {}       # model key -> {mesh, yoff}
var mmi := {}          # draw key -> MultiMeshInstance3D
var ring_mmi: MultiMeshInstance3D
var bar_mmi: MultiMeshInstance3D
var fx_mmi: MultiMeshInstance3D
var tracer: MeshInstance3D
var fx: Array = []     # [pos3, t0, life, size, color]
var smoke: Array = []  # [pos3, t0, life, size, drift]
var smoke_mmi: MultiMeshInstance3D
var tracers: Array = []  # [a3, b3, t0]

var cam: Camera3D
var cam_target := Vector2(520, MAP_H * 0.5 + 60)
var cam_dist := 620.0
var sun: DirectionalLight3D

# ui
var ui: CanvasLayer
var lbl_top: Label
var lbl_sel: Label
var lbl_fps: Label
var box: Panel
var drag_start := Vector2.ZERO
var dragging := false
var msg_lbl: Label
var msg_t := 0.0
var fight_btn: Button
var mouse_in := false   # edge scrolling only after the mouse has moved over the game
var bench_on := false
var bench := {}
var shot_path := ""
var shot_frames := 0
var shot_at := 60
var bench_n := 250

func _ready() -> void:
	# BATTLE HOOK (orch/godot-battle): Battle mode lives in scripts/battle/ (--battle / --battle-ai start straight in it)
	if get_script() == preload("res://scripts/main.gd") and (OS.get_cmdline_user_args().has("--battle") or OS.get_cmdline_user_args().has("--battle-ai") or OS.get_cmdline_user_args().has("--demo")):
		get_tree().change_scene_to_file.call_deferred("res://scenes/battle.tscn")
		return
	randomize()
	_env()
	_ground()
	_camera()
	_load_models()
	_fx_setup()
	_ui()
	_spawn_bases()
	_scatter()
	var args := OS.get_cmdline_user_args()
	for a in args:
		if a.begins_with("--shot="):
			shot_path = a.substr(7)
		elif a.begins_with("--benchn="):
			bench_n = int(a.substr(9))
		elif a.begins_with("--shotf="):
			shot_at = int(a.substr(8))
		elif a.begins_with("--cam="):
			var v := a.substr(6).split(",")
			cam_target = Vector2(float(v[0]), float(v[1]))
			cam_dist = float(v[2])
	if "--drones" in args:
		for i in 5:
			var dr := spawn("drone", ME, Vector2(1300, 900 + i * 40))
			dr.ang = 0.0
	if "--bench" in args:
		var keep_t := cam_target
		var keep_d := cam_dist
		_bench_start()
		if Array(args).any(func(a): return String(a).begins_with("--cam=")):
			cam_target = keep_t
			cam_dist = keep_d

# ---------------------------------------------------------------- world
func _env() -> void:
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color(0.38, 0.58, 0.86)
	sm.sky_horizon_color = Color(0.86, 0.82, 0.74)
	sm.ground_horizon_color = Color(0.8, 0.74, 0.62)
	sm.ground_bottom_color = Color(0.55, 0.48, 0.38)
	sm.sun_angle_max = 30.0
	sky.sky_material = sm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.fog_enabled = true
	env.fog_light_color = Color(0.86, 0.8, 0.7)
	env.fog_density = 0.00012
	env.fog_sky_affect = 0.3
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.92, 0.8)
	sun.light_energy = 1.3
	sun.rotation_degrees = Vector3(-52, -35, 0)
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 2600.0
	sun.shadow_bias = 0.6
	sun.shadow_normal_bias = 1.5
	add_child(sun)

func _ground() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(MAP_W + 2400, MAP_H + 2400)
	pm.subdivide_width = 1
	pm.subdivide_depth = 1
	var g := MeshInstance3D.new()
	g.mesh = pm
	g.position = Vector3(MAP_W * 0.5, 0, MAP_H * 0.5)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load("res://tex/a1.png")
	mat.normal_enabled = true
	mat.normal_texture = load("res://tex/n1.png")
	mat.normal_scale = 0.8
	mat.albedo_color = Color(0.93, 0.80, 0.62)
	mat.uv1_scale = Vector3((MAP_W + 2400) / 240.0, (MAP_H + 2400) / 240.0, 1)
	mat.roughness = 0.97
	g.material_override = mat
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(g)
	# sea lane
	var w := MeshInstance3D.new()
	var wm := PlaneMesh.new()
	wm.size = Vector2(CH_HALF * 2.0, MAP_H + 2400)
	w.mesh = wm
	w.position = Vector3(CH_X, 0.6, MAP_H * 0.5)
	var wmat := StandardMaterial3D.new()
	wmat.albedo_color = Color(0.08, 0.22, 0.27)
	wmat.metallic = 0.2
	wmat.roughness = 0.08
	w.material_override = wmat
	w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(w)
	# banks
	for sx in [-1.0, 1.0]:
		var b := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(10, 3, MAP_H + 2400)
		b.mesh = bm
		b.position = Vector3(CH_X + sx * (CH_HALF + 4), 1.0, MAP_H * 0.5)
		var bmat := StandardMaterial3D.new()
		bmat.albedo_color = Color(0.55, 0.5, 0.42)
		b.material_override = bmat
		add_child(b)
	# bridges
	for by in BRIDGES:
		var br := MeshInstance3D.new()
		var brm := BoxMesh.new()
		brm.size = Vector3(CH_HALF * 2.0 + 40, 4, BR_HALF * 2.0)
		br.mesh = brm
		br.position = Vector3(CH_X, 2.0, by)
		var brmat := StandardMaterial3D.new()
		brmat.albedo_color = Color(0.5, 0.47, 0.42)
		brmat.roughness = 0.9
		br.material_override = brmat
		add_child(br)
		for s in [-1.0, 1.0]:
			var rail := MeshInstance3D.new()
			var rm := BoxMesh.new()
			rm.size = Vector3(CH_HALF * 2.0 + 40, 5, 3)
			rail.mesh = rm
			rail.position = Vector3(CH_X, 6.5, by + s * (BR_HALF - 1.5))
			rail.material_override = brmat
			add_child(rail)

func _camera() -> void:
	cam = Camera3D.new()
	cam.fov = 40.0
	cam.near = 5.0
	cam.far = 9000.0
	add_child(cam)
	_place_cam()

func _place_cam() -> void:
	var pitch := deg_to_rad(lerpf(40.0, 58.0, clampf((cam_dist - 300.0) / 1300.0, 0.0, 1.0)))
	var tgt := Vector3(cam_target.x, 0, cam_target.y)
	cam.position = tgt + Vector3(0, sin(pitch) * cam_dist, cos(pitch) * cam_dist)
	cam.look_at(tgt, Vector3.UP)

# ---------------------------------------------------------------- models
func _collect(node: Node, xf: Transform3D, out: Array) -> void:
	var x := xf
	if node is Node3D:
		x = xf * (node as Node3D).transform
	if node is MeshInstance3D and (node as MeshInstance3D).mesh:
		out.append([node, x])
	for c in node.get_children():
		_collect(c, x, out)

func _build_mesh(key: String, fit: String, size: float) -> Dictionary:
	var ps = load("res://models/%s.glb" % key)
	if ps == null:
		push_warning("model missing " + key)
		return {}
	var root: Node = ps.instantiate()
	var parts: Array = []
	_collect(root, Transform3D.IDENTITY, parts)
	# pass 1: bounds
	var mn := Vector3(1e9, 1e9, 1e9)
	var mx := Vector3(-1e9, -1e9, -1e9)
	for p in parts:
		var mi: MeshInstance3D = p[0]
		var xf: Transform3D = p[1]
		for s in mi.mesh.get_surface_count():
			var arr: Array = mi.mesh.surface_get_arrays(s)
			var vs: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
			for v in vs:
				var w := xf * v
				mn = mn.min(w)
				mx = mx.max(w)
	var ext := mx - mn
	var sc := 1.0
	if fit == "y":
		sc = size / maxf(0.001, ext.y)
	else:
		sc = size / maxf(0.001, maxf(ext.x, ext.z))
	var ctr := Vector3((mn.x + mx.x) * 0.5, mn.y, (mn.z + mx.z) * 0.5)
	var fixb := Basis(Vector3.UP, deg_to_rad(YAW_FIX.get(key, 0.0)))
	var final := Transform3D(fixb.scaled(Vector3(sc, sc, sc)), Vector3.ZERO) * Transform3D(Basis.IDENTITY, -ctr)
	# pass 2: merged static mesh (skinning dropped: soldiers are drawn in their rest pose for now)
	var am := ArrayMesh.new()
	for p in parts:
		var mi: MeshInstance3D = p[0]
		var xf: Transform3D = final * p[1]
		var nb := xf.basis.inverse().transposed()
		for s in mi.mesh.get_surface_count():
			var arr: Array = mi.mesh.surface_get_arrays(s)
			var vs: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
			for i in vs.size():
				vs[i] = xf * vs[i]
			arr[Mesh.ARRAY_VERTEX] = vs
			if arr[Mesh.ARRAY_NORMAL] != null:
				var ns: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
				for i in ns.size():
					ns[i] = (nb * ns[i]).normalized()
				arr[Mesh.ARRAY_NORMAL] = ns
			arr[Mesh.ARRAY_TANGENT] = null
			arr[Mesh.ARRAY_BONES] = null
			arr[Mesh.ARRAY_WEIGHTS] = null
			am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
			var m: Material = mi.get_active_material(s)
			if m == null:
				m = mi.mesh.surface_get_material(s)
			if m is BaseMaterial3D:
				var bm: BaseMaterial3D = (m as BaseMaterial3D).duplicate()
				if TINT.has(key):
					bm.albedo_color = bm.albedo_color * TINT[key]
				bm.transparency = BaseMaterial3D.TRANSPARENCY_DISABLED   # nothing see-through (Abdullah 2026-11-21)
				bm.cull_mode = BaseMaterial3D.CULL_DISABLED
				m = bm
			am.surface_set_material(am.get_surface_count() - 1, m)
	root.free()
	return {"mesh": am, "h": ext.y * sc}

func _load_models() -> void:
	for dk in MODELS:
		var d: Array = MODELS[dk]
		var mk := "%s|%s|%s" % [d[0], d[1], d[2]]
		if not meshes.has(mk):
			meshes[mk] = {"mesh": _shahed_mesh(d[2]), "h": 4.0} if d[0] == "@shahed" else _build_mesh(d[0], d[1], d[2])
		var info: Dictionary = meshes[mk]
		if info.is_empty():
			continue
		var m := MultiMeshInstance3D.new()
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = info["mesh"]
		mm.instance_count = 64
		mm.visible_instance_count = 0
		m.multimesh = mm
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		m.extra_cull_margin = 16000.0
		add_child(m)
		mmi[dk] = m
	# team / selection rings and health bars: one instanced draw each
	ring_mmi = _inst_mmi(_ring_mesh(), true, false)
	var q := QuadMesh.new()
	q.size = Vector2(1, 1)
	var qm := StandardMaterial3D.new()
	qm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qm.vertex_color_use_as_albedo = true
	qm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	qm.billboard_keep_scale = true
	qm.no_depth_test = true
	qm.render_priority = 10
	q.material = qm
	bar_mmi = _inst_mmi(q, true, false)

# Shahed-136 style loitering munition (code-built like the browser game's 'delta' drone): delta wing, slim body,
# wingtip fins, pusher prop hub. Faces +X. Grey-sand paint.
func _shahed_mesh(span: float) -> Mesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var L := span * 1.05
	var h := span * 0.5
	var R := Basis(Vector3.UP, -PI * 0.5)   # built nose +X, turned to face +Z like the imported models
	var tri := func(a0: Vector3, b0: Vector3, c0: Vector3):
		var a := R * a0
		var b := R * b0
		var c := R * c0
		var n := (b - a).cross(c - a).normalized()
		st.set_normal(n); st.add_vertex(a); st.set_normal(n); st.add_vertex(b); st.set_normal(n); st.add_vertex(c)
		st.set_normal(-n); st.add_vertex(a); st.set_normal(-n); st.add_vertex(c); st.set_normal(-n); st.add_vertex(b)
	var nose := Vector3(L * 0.55, 0, 0)
	var tl := Vector3(-L * 0.45, 0, -h)
	var tr := Vector3(-L * 0.45, 0, h)
	var tc := Vector3(-L * 0.3, 0, 0)
	tri.call(nose, tr, tc)
	tri.call(nose, tc, tl)
	# body ridge
	var top := Vector3(L * 0.1, span * 0.09, 0)
	tri.call(nose, top, Vector3(-L * 0.4, span * 0.06, 0))
	tri.call(Vector3(-L * 0.4, 0, -span * 0.05), top, Vector3(-L * 0.4, 0, span * 0.05))
	# wingtip fins
	for z in [-h, h]:
		tri.call(Vector3(-L * 0.45, 0, z), Vector3(-L * 0.3, 0, z * 0.93), Vector3(-L * 0.47, span * 0.16, z))
	var m := st.commit()
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.62, 0.6, 0.54)
	mat.roughness = 0.7
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.surface_set_material(0, mat)
	return m

func _ring_mesh() -> Mesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := 28
	for i in n:
		var a0 := TAU * i / n
		var a1 := TAU * (i + 1) / n
		var p := [Vector3(cos(a0), 0, sin(a0)), Vector3(cos(a1), 0, sin(a1))]
		var r0 := 0.86
		st.add_vertex(p[0] * r0); st.add_vertex(p[0]); st.add_vertex(p[1])
		st.add_vertex(p[0] * r0); st.add_vertex(p[1]); st.add_vertex(p[1] * r0)
	var m := st.commit()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.surface_set_material(0, mat)
	return m

func _inst_mmi(mesh: Mesh, colors: bool, shadow: bool) -> MultiMeshInstance3D:
	var m := MultiMeshInstance3D.new()
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = colors
	mm.mesh = mesh
	mm.instance_count = 256
	mm.visible_instance_count = 0
	m.multimesh = mm
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	m.extra_cull_margin = 16000.0
	add_child(m)
	return m

func _fx_setup() -> void:
	var s := SphereMesh.new()
	s.radius = 1.0
	s.height = 2.0
	s.radial_segments = 10
	s.rings = 6
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.vertex_color_use_as_albedo = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	s.material = m
	fx_mmi = _inst_mmi(s, true, false)
	var s2 := SphereMesh.new()
	s2.radius = 1.0
	s2.height = 2.0
	s2.radial_segments = 10
	s2.rings = 6
	var m2 := StandardMaterial3D.new()
	m2.vertex_color_use_as_albedo = true
	m2.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m2.roughness = 1.0
	s2.material = m2
	smoke_mmi = _inst_mmi(s2, true, false)
	tracer = MeshInstance3D.new()
	tracer.mesh = ImmediateMesh.new()
	var tm := StandardMaterial3D.new()
	tm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	tm.vertex_color_use_as_albedo = true
	tm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	tm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	tracer.material_override = tm
	tracer.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(tracer)

func _scatter() -> void:
	# trees and crates as instanced scenery (static)
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for key in ["tree1", "tree2", "tree3"]:
		var info := _build_mesh(key, "y", rng.randf_range(36, 52))
		if info.is_empty():
			continue
		var m := MultiMeshInstance3D.new()
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = info["mesh"]
		var n := 90
		mm.instance_count = n
		for i in n:
			var p := Vector2(rng.randf_range(0, MAP_W), rng.randf_range(0, MAP_H))
			if absf(p.x - CH_X) < CH_HALF + 40 or p.distance_to(Vector2(380, MAP_H * 0.5)) < 420 or p.distance_to(Vector2(MAP_W - 380, MAP_H * 0.5)) < 420:
				p = Vector2(rng.randf_range(0, MAP_W), rng.randf_range(0, 120) if rng.randf() < 0.5 else rng.randf_range(MAP_H - 120, MAP_H))
			var s := rng.randf_range(0.8, 1.3)
			mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s, s)), Vector3(p.x, 0, p.y)))
		m.multimesh = mm
		add_child(m)

# ---------------------------------------------------------------- entities
func spawn(kind: String, team: int, p: Vector2) -> Ent:
	var e := Ent.new()
	e.id = next_id
	next_id += 1
	e.kind = kind
	e.team = team
	e.pos = p
	e.prev = p
	var s: Dictionary = ST[kind]
	e.is_b = s.has("size")
	e.max_hp = s["hp"] * (s.get("n", 1) if not e.is_b else 1)
	e.hp = e.max_hp
	e.ang = 0.0 if team == ME else PI
	e.rally = p + Vector2(160 if team == ME else -160, 0)
	ents.append(e)
	return e

func _spawn_bases() -> void:
	var cy := MAP_H * 0.5
	spawn("hq", ME, Vector2(300, cy))
	spawn("barracks", ME, Vector2(470, cy - 210))
	spawn("factory", ME, Vector2(480, cy + 220))
	spawn("hq", EN, Vector2(MAP_W - 300, cy))
	spawn("barracks", EN, Vector2(MAP_W - 470, cy - 210))
	spawn("factory", EN, Vector2(MAP_W - 480, cy + 220))
	for i in 4:
		spawn("inf", ME, Vector2(620, cy - 60 + i * 40))
	for i in 2:
		spawn("tank", ME, Vector2(680, cy - 30 + i * 60))
	spawn("harv", ME, Vector2(420, cy + 80))
	_send_targets(false)

func _bld(kind: String, team: int) -> Ent:
	for e: Ent in ents:
		if not e.dead and e.kind == kind and e.team == team:
			return e
	return null

func _send_targets(attack: bool) -> void:
	var cy := MAP_H * 0.5
	var base := Vector2(MAP_W - 640, cy)
	var k := 0
	for kind in ["inf", "inf", "inf", "inf", "inf", "inf", "at", "at", "tank", "tank", "tank", "tank"]:
		var p := base + Vector2(randf_range(-120, 60), (k - 6) * 46 + randf_range(-10, 10))
		var e := spawn(kind, EN, p)
		if attack and enemy_fights:
			e.order = "amove"
			e.tpos = Vector2(300, cy + randf_range(-200, 200))
		k += 1

func train(kind: String) -> void:
	var from := "factory" if kind == "tank" or kind == "harv" else "barracks"
	var b := _bld(from, ME)
	if b == null:
		_msg("No " + from + " to build from")
		return
	var e := spawn(kind, ME, b.pos + Vector2(70, randf_range(-20, 20)))
	e.order = "move"
	e.tpos = b.rally + Vector2(randf_range(-30, 30), randf_range(-30, 30))

# ---------------------------------------------------------------- simulation (30 Hz)
func _physics_process(dt: float) -> void:
	t += dt
	var grid := {}
	for e: Ent in ents:
		e.prev = e.pos
		if e.dead or e.is_b:
			continue
		var c := Vector2i(int(e.pos.x / 64.0), int(e.pos.y / 64.0))
		if not grid.has(c):
			grid[c] = []
		grid[c].append(e)
	for e: Ent in ents:
		if e.kind == "drone" and not e.dead:
			_drone(e, dt)
			continue
		if e.dead or e.is_b or e.kind == "harv":
			if e.kind == "harv" and not e.dead:
				_harv(e, dt)
			continue
		_unit(e, dt, grid)
	# separation
	for e: Ent in ents:
		if e.dead or e.is_b:
			continue
		var r: float = ST[e.kind]["r"]
		var c := Vector2i(int(e.pos.x / 64.0), int(e.pos.y / 64.0))
		for dx in [-1, 0, 1]:
			for dy in [-1, 0, 1]:
				var L = grid.get(c + Vector2i(dx, dy))
				if L == null:
					continue
				for o: Ent in L:
					if o == e or o.dead:
						continue
					var d: Vector2 = e.pos - o.pos
					var rr: float = r + float(ST[o.kind]["r"])
					var l2 := d.length_squared()
					if l2 < rr * rr and l2 > 0.0001:
						var l := sqrt(l2)
						e.pos += d / l * (rr - l) * 0.35
		e.pos = _keep_dry(e.pos, e.prev)
	# deaths
	var alive: Array = []
	for e: Ent in ents:
		if e.hp <= 0.0 and not e.dead:
			e.dead = true
			var big := e.is_b or e.kind == "tank" or e.kind == "harv"
			_boom(Vector3(e.pos.x, 6, e.pos.y), 40.0 if big else 10.0, Color(1.0, 0.55, 0.2) if big else Color(0.9, 0.8, 0.6))
			sel.erase(e)
		if not e.dead:
			alive.append(e)
	ents = alive
	if bench_on:
		_bench_tick(dt)

func _keep_dry(p: Vector2, prev: Vector2) -> Vector2:
	if absf(p.x - CH_X) < CH_HALF + 6:
		for by in BRIDGES:
			if absf(p.y - by) < BR_HALF - 6:
				return p
		# stay on the side it came from
		var side := -1.0 if prev.x < CH_X else 1.0
		p.x = CH_X + side * (CH_HALF + 6.5)
	return p

func _path_to(e: Ent, goal: Vector2) -> Vector2:
	# one waypoint through the nearest bridge when the goal is across the water
	var a_side := e.pos.x < CH_X
	var b_side := goal.x < CH_X
	if a_side == b_side:
		return goal
	var on_bridge := absf(e.pos.x - CH_X) < CH_HALF + 30
	var best: float = BRIDGES[0]
	if absf(e.pos.y - BRIDGES[1]) + absf(goal.y - BRIDGES[1]) < absf(e.pos.y - BRIDGES[0]) + absf(goal.y - BRIDGES[0]):
		best = BRIDGES[1]
	if on_bridge and absf(e.pos.y - best) < BR_HALF:
		return Vector2(goal.x if absf(goal.x - CH_X) > CH_HALF + 60 else CH_X + (CH_HALF + 80) * (1.0 if not a_side else -1.0) * -1.0, best)
	return Vector2(CH_X + (CH_HALF + 50) * (-1.0 if a_side else 1.0), best)

func _move(e: Ent, goal: Vector2, dt: float) -> bool:
	var to := _path_to(e, goal)
	var d := to - e.pos
	var l := d.length()
	var spd: float = ST[e.kind]["spd"] * 1.6
	if l < 4.0:
		return to == goal
	var step := minf(l, spd * dt)
	e.pos += d / l * step
	var want := atan2(d.y, d.x)
	e.ang = lerp_angle(e.ang, want, minf(1.0, dt * 6.0))
	return false

func _nearest_enemy(e: Ent, rng: float) -> Ent:
	var best: Ent = null
	var bd := rng * rng
	for o: Ent in ents:
		if o.dead or o.team == e.team:
			continue
		var d2 := e.pos.distance_squared_to(o.pos)
		if o.is_b:
			d2 = maxf(0.0, sqrt(d2) - float(ST[o.kind]["size"]) * 0.5)
			d2 *= d2
		if d2 < bd:
			bd = d2
			best = o
	return best

func _dist_to(e: Ent, o: Ent) -> float:
	var d := e.pos.distance_to(o.pos)
	if o.is_b:
		d = maxf(0.0, d - float(ST[o.kind]["size"]) * 0.5)
	return d

func _unit(e: Ent, dt: float, _grid: Dictionary) -> void:
	var s: Dictionary = ST[e.kind]
	e.cd -= dt
	e.scan -= dt
	if e.target != null and e.target.dead:
		e.target = null
		if e.order == "attack":
			e.order = ""
	if e.order == "move":
		if _move(e, e.tpos, dt):
			e.order = ""
		return
	if e.order == "attack" and e.target != null:
		if _dist_to(e, e.target) > s["rng"]:
			_move(e, e.target.pos, dt)
			return
		_fire(e, e.target, dt)
		return
	# idle or attack-move: engage what comes into sight
	if e.scan <= 0.0:
		e.scan = 0.3 + randf() * 0.2
		if e.team == ME or enemy_fights:
			var tg := _nearest_enemy(e, s["sight"])
			if tg != null:
				e.target = tg
	if e.target != null:
		var d := _dist_to(e, e.target)
		if d <= s["rng"]:
			_fire(e, e.target, dt)
			return
		if d <= s["sight"] + 80.0:
			_move(e, e.target.pos, dt)
			return
		e.target = null
	if e.order == "amove":
		if _move(e, e.tpos, dt):
			e.order = ""

func _fire(e: Ent, o: Ent, dt: float) -> void:
	var s: Dictionary = ST[e.kind]
	var d := o.pos - e.pos
	e.ang = lerp_angle(e.ang, atan2(d.y, d.x), minf(1.0, dt * 8.0))
	if e.cd > 0.0:
		return
	e.cd = s["rof"] * randf_range(0.9, 1.1)
	e.fire_t = t
	var armor: String = ST[o.kind]["armor"]
	var m: float = MULT[s["wpn"]][armor]
	var alive_n := 1.0
	if s.get("n", 1) > 1:
		alive_n = ceilf(e.hp / float(s["hp"]))
	o.hp -= s["dmg"] * m * alive_n
	var a3 := Vector3(e.pos.x, 9 if e.kind != "tank" else 14, e.pos.y)
	var b3 := Vector3(o.pos.x + randf_range(-6, 6), 8, o.pos.y + randf_range(-6, 6))
	if s["wpn"] == "gun":
		tracers.append([a3, b3, t, Color(1.0, 0.85, 0.45)])
		_boom(a3 + Vector3(cos(e.ang), 0, sin(e.ang)) * 8.0, 2.5, Color(1.0, 0.8, 0.4), 0.06)
	elif s["wpn"] == "at":
		tracers.append([a3, b3, t, Color(1.0, 0.6, 0.3)])
		_boom(b3, 14.0, Color(1.0, 0.5, 0.2))
	else:
		var muzzle := a3 + Vector3(cos(e.ang), 0, sin(e.ang)) * 26.0
		_boom(muzzle, 9.0, Color(1.0, 0.75, 0.35), 0.1)
		tracers.append([muzzle, b3, t, Color(1.0, 0.7, 0.4)])
		_boom(b3, 18.0, Color(1.0, 0.5, 0.2))

func _drone(e: Ent, dt: float) -> void:
	var s: Dictionary = ST["drone"]
	if e.target == null or e.target.dead:
		e.target = null
		var best: Ent = null
		var bd := 1e18
		for o: Ent in ents:
			if o.dead or o.team == e.team or o.kind == "drone":
				continue
			var d2 := e.pos.distance_squared_to(o.pos) * (0.6 if o.is_b else 1.0)
			if d2 < bd:
				bd = d2
				best = o
		e.target = best
	var goal := e.target.pos if e.target != null else (e.tpos if e.order != "" else e.pos + Vector2(cos(e.ang), sin(e.ang)) * 200.0)
	var d := goal - e.pos
	var l := d.length()
	if l > 0.1:
		e.ang = lerp_angle(e.ang, atan2(d.y, d.x), minf(1.0, dt * 2.5))
	e.pos += Vector2(cos(e.ang), sin(e.ang)) * float(s["spd"]) * dt
	e.cd = l   # distance to target, used to draw the dive
	if e.target != null and l < 26.0:
		# impact: blast hurts everything of the other side nearby
		var bl: float = s["blast"]
		for o: Ent in ents:
			if o.dead or o.team == e.team:
				continue
			var dd := _dist_to(e, o) if o.is_b else e.pos.distance_to(o.pos)
			if dd < bl:
				var mul := 1.0 if o.is_b or ST[o.kind]["armor"] == "heavy" else 0.7
				o.hp -= float(s["dmg"]) * mul * (1.0 - dd / bl * 0.6)
		_boom(Vector3(e.pos.x, 8, e.pos.y), 42.0, Color(1.0, 0.55, 0.2), 0.7)
		e.hp = 0.0

func _harv(e: Ent, dt: float) -> void:
	# Test range: supply truck just idles near the base unless ordered
	if e.order == "move":
		if _move(e, e.tpos, dt):
			e.order = ""

func _boom(p: Vector3, size: float, col: Color, life := 0.45) -> void:
	fx.append([p, t, life, size, col])
	if size >= 14.0:
		for i in int(2 + size / 12.0):
			smoke.append([p + Vector3(randf_range(-size, size) * 0.4, 0, randf_range(-size, size) * 0.4), t + randf() * 0.2, randf_range(1.8, 3.2), size * randf_range(0.5, 0.9), Vector3(randf_range(-6, 6), randf_range(10, 18), randf_range(-6, 6))])
		# a little burning debris flash low on the ground
		fx.append([p + Vector3(0, -2, 0), t, 0.25, size * 1.6, Color(1.0, 0.8, 0.5)])

# ---------------------------------------------------------------- drawing
func _process(dt: float) -> void:
	_cam_input(dt)
	_place_cam()
	var a := Engine.get_physics_interpolation_fraction()
	var per := {}
	for k in mmi:
		per[k] = []
	var rings: Array = []
	var bars: Array = []
	for e: Ent in ents:
		var p := e.prev.lerp(e.pos, a)
		var dk := "%s%d" % [e.kind, e.team]
		if not per.has(dk):
			continue
		var s: Dictionary = ST[e.kind]
		var issel := sel.has(e)
		if e.is_b:
			per[dk].append(Transform3D(Basis(Vector3.UP, -PI * 0.5 if e.team == ME else PI * 0.5), Vector3(p.x, 0, p.y)))
			var sz: float = s["size"]
			if issel:
				rings.append([Vector3(p.x, 0.8, p.y), sz * 0.6, Color(1, 1, 1)])
		else:
			var basis := Basis(Vector3.UP, -e.ang + PI * 0.5)
			var n: int = s.get("n", 1)
			if n > 1:
				var alive := int(ceil(e.hp / float(s["hp"])))
				var moving := e.pos.distance_squared_to(e.prev) > 0.01
				for i in alive:
					var off := Vector2(((i % 2) - 0.5) * 16.0, (int(i / 2) - 0.5) * 16.0).rotated(e.ang)
					var bob := 0.0
					var lean := 0.0
					if moving:
						var ph := t * 11.0 + float(e.id * 3 + i * 2)
						bob = absf(sin(ph)) * 1.4
						lean = sin(ph) * 0.06
					per[dk].append(Transform3D(basis * Basis(Vector3.FORWARD, lean), Vector3(p.x + off.x, bob, p.y + off.y)))
			elif e.kind == "drone":
				var alt := clampf(e.cd * 0.45, 6.0, 80.0)
				var pitch := 0.0 if e.cd > 160.0 else -0.6
				per[dk].append(Transform3D(basis * Basis(Vector3.RIGHT, 0.0) * Basis(Vector3(0, 0, 1), pitch), Vector3(p.x, alt, p.y)))
			else:
				var y := 0.0
				if e.kind == "tank" and t - e.fire_t < 0.15:
					p -= Vector2(cos(e.ang), sin(e.ang)) * 2.0
				per[dk].append(Transform3D(basis, Vector3(p.x, y, p.y)))
			var r: float = s["r"] * (1.6 if n > 1 else 1.3)
			if e.kind != "drone":
				rings.append([Vector3(p.x, 0.8, p.y), r, TEAM_COL[e.team] if not issel else Color(1, 1, 1)])
		if issel or e.hp < e.max_hp:
			var f := e.hp / e.max_hp
			var top := 26.0 if not e.is_b else 90.0
			var w := 22.0 if not e.is_b else 70.0
			bars.append([Vector3(p.x, top, p.y), w, Color(0.1, 0.1, 0.1, 0.8), f, Color(1.0 - f, f, 0.15)])
	for k in mmi:
		_fill(mmi[k], per[k])
	# rings
	_grow(ring_mmi, rings.size())
	var mm := ring_mmi.multimesh
	for i in rings.size():
		var rg: Array = rings[i]
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3(rg[1], 1, rg[1])), rg[0]))
		mm.set_instance_color(i, rg[2])
	mm.visible_instance_count = rings.size()
	# health bars (background + fill)
	_grow(bar_mmi, bars.size() * 2)
	var bm := bar_mmi.multimesh
	var bi := 0
	for b in bars:
		bm.set_instance_transform(bi, Transform3D(Basis().scaled(Vector3(b[1], 3.2, 1)), b[0]))
		bm.set_instance_color(bi, b[2])
		bi += 1
		var right := cam.global_transform.basis.x
		var fw: float = b[1] * float(b[3])
		bm.set_instance_transform(bi, Transform3D(Basis().scaled(Vector3(fw, 2.4, 1)), b[0] - right * (b[1] - fw) * 0.5 + cam.global_transform.basis.z * 0.5))
		bm.set_instance_color(bi, b[4])
		bi += 1
	bm.visible_instance_count = bi
	_draw_fx()
	_ui_tick(dt)
	if shot_path != "":
		shot_frames += 1
		if shot_frames == shot_at:
			get_viewport().get_texture().get_image().save_png(shot_path)
			get_tree().quit()

func _grow(m: MultiMeshInstance3D, n: int) -> void:
	var mm := m.multimesh
	if n > mm.instance_count:
		var keep := mm.mesh
		var cols := mm.use_colors
		var nm := MultiMesh.new()
		nm.transform_format = MultiMesh.TRANSFORM_3D
		nm.use_colors = cols
		nm.mesh = keep
		nm.instance_count = maxi(n * 2, 64)
		m.multimesh = nm

func _fill(m: MultiMeshInstance3D, xs: Array) -> void:
	_grow(m, xs.size())
	var mm := m.multimesh
	for i in xs.size():
		mm.set_instance_transform(i, xs[i])
	mm.visible_instance_count = xs.size()

func _draw_fx() -> void:
	var keep: Array = []
	for f in fx:
		if t - f[1] < f[2]:
			keep.append(f)
	fx = keep
	_grow(fx_mmi, fx.size())
	var mm := fx_mmi.multimesh
	for i in fx.size():
		var f: Array = fx[i]
		var k := clampf((t - f[1]) / f[2], 0.0, 1.0)
		var s: float = f[3] * (0.5 + k * 0.9)
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3(s, s, s)), f[0] + Vector3(0, k * f[3] * 0.4, 0)))
		var c: Color = f[4]
		mm.set_instance_color(i, Color(c.r, c.g, c.b, (1.0 - k) * 0.9))
	mm.visible_instance_count = fx.size()
	var sk: Array = []
	for f in smoke:
		if t - f[1] < f[2]:
			sk.append(f)
	smoke = sk
	_grow(smoke_mmi, smoke.size())
	var sm := smoke_mmi.multimesh
	var vis := 0
	for f in smoke:
		var age: float = t - f[1]
		if age < 0.0:
			continue
		var k: float = age / f[2]
		var sz: float = f[3] * (0.6 + k * 1.6)
		var pos: Vector3 = f[0] + f[4] * age
		pos.y += sz * 0.5
		sm.set_instance_transform(vis, Transform3D(Basis().scaled(Vector3(sz, sz * 0.8, sz)), pos))
		var g := lerpf(0.22, 0.55, k)
		sm.set_instance_color(vis, Color(g, g * 0.95, g * 0.88, (1.0 - k) * 0.55))
		vis += 1
	sm.visible_instance_count = vis
	var im: ImmediateMesh = tracer.mesh
	im.clear_surfaces()
	var tk: Array = []
	for tr in tracers:
		if t - tr[2] < 0.12:
			tk.append(tr)
	tracers = tk
	if tracers.size() > 0:
		im.surface_begin(Mesh.PRIMITIVE_LINES)
		for tr in tracers:
			var c: Color = tr[3]
			im.surface_set_color(c)
			im.surface_add_vertex(tr[0])
			im.surface_set_color(Color(c.r, c.g, c.b, 0.0))
			im.surface_add_vertex(tr[1])
		im.surface_end()

# ---------------------------------------------------------------- input
func _cam_input(dt: float) -> void:
	var v := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):
		v.y -= 1
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):
		v.y += 1
	if Input.is_physical_key_pressed(KEY_A) and not Input.is_key_pressed(KEY_CTRL) or Input.is_physical_key_pressed(KEY_LEFT):
		v.x -= 1
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT):
		v.x += 1
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	if mouse_in and DisplayServer.window_is_focused() and mp.x >= 0 and mp.y >= 0:
		if mp.x < 4: v.x -= 1
		if mp.x > vs.x - 4: v.x += 1
		if mp.y < 4: v.y -= 1
		if mp.y > vs.y - 4: v.y += 1
	cam_target += v.normalized() * dt * (500.0 + cam_dist * 0.9)
	cam_target.x = clampf(cam_target.x, 0, MAP_W)
	cam_target.y = clampf(cam_target.y, 0, MAP_H)

func _ground_at(sp: Vector2) -> Vector2:
	var o := cam.project_ray_origin(sp)
	var d := cam.project_ray_normal(sp)
	if absf(d.y) < 0.0001:
		return Vector2.INF
	var k := -o.y / d.y
	var p := o + d * k
	return Vector2(p.x, p.z)

func _pick(sp: Vector2) -> Ent:
	var g := _ground_at(sp)
	var best: Ent = null
	var bd := 1e9
	for e: Ent in ents:
		if e.dead:
			continue
		var rr: float = float(ST[e.kind]["size"]) * 0.6 if e.is_b else float(ST[e.kind]["r"]) * 2.2 + 8.0
		var d := e.pos.distance_to(g)
		if d < rr and d < bd:
			bd = d
			best = e
	return best

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion:
		mouse_in = true
	if ev is InputEventMouseButton:
		var mb := ev as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			cam_dist = clampf(cam_dist * 0.88, 220.0, 1900.0)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			cam_dist = clampf(cam_dist * 1.13, 220.0, 1900.0)
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				drag_start = mb.position
				dragging = true
			else:
				dragging = false
				box.visible = false
				if mb.position.distance_to(drag_start) > 8:
					_box_select(drag_start, mb.position, mb.shift_pressed)
				else:
					_click_select(mb.position, mb.shift_pressed, mb.double_click)
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			_order(mb.position)
	elif ev is InputEventMouseMotion and dragging:
		var mm := ev as InputEventMouseMotion
		if mm.position.distance_to(drag_start) > 8:
			box.visible = true
			box.position = Vector2(minf(drag_start.x, mm.position.x), minf(drag_start.y, mm.position.y))
			box.size = (mm.position - drag_start).abs()
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		var k := ev as InputEventKey
		if k.keycode == KEY_A and k.ctrl_pressed:
			sel = ents.filter(func(e): return not e.dead and e.team == ME and not e.is_b)
		elif k.keycode == KEY_X:
			for e: Ent in sel:
				e.order = ""
				e.target = null
		elif k.keycode == KEY_ESCAPE:
			sel.clear()
		elif k.keycode == KEY_F9:
			_bench_start()

func _click_select(sp: Vector2, add: bool, dbl: bool) -> void:
	var e := _pick(sp)
	# production building selected + click on the ground = rally point
	if e == null and sel.size() == 1 and sel[0].is_b and sel[0].team == ME and sel[0].kind != "hq":
		var g := _ground_at(sp)
		sel[0].rally = g
		_boom(Vector3(g.x, 2, g.y), 8.0, Color(0.4, 1.0, 0.5), 0.5)
		sel.clear()
		return
	if not add:
		sel.clear()
	if e != null and e.team == ME:
		if dbl and not e.is_b:
			for o: Ent in ents:
				if not o.dead and o.team == ME and o.kind == e.kind and _on_screen(o):
					if not sel.has(o):
						sel.append(o)
		elif not sel.has(e):
			sel.append(e)

func _on_screen(e: Ent) -> bool:
	var p3 := Vector3(e.pos.x, 0, e.pos.y)
	if cam.is_position_behind(p3):
		return false
	var sp := cam.unproject_position(p3)
	var vs := get_viewport().get_visible_rect().size
	return sp.x >= 0 and sp.y >= 0 and sp.x <= vs.x and sp.y <= vs.y

func _box_select(a: Vector2, b: Vector2, add: bool) -> void:
	var r := Rect2(Vector2(minf(a.x, b.x), minf(a.y, b.y)), (b - a).abs())
	if not add:
		sel.clear()
	for e: Ent in ents:
		if e.dead or e.team != ME or e.is_b:
			continue
		var p3 := Vector3(e.pos.x, 6, e.pos.y)
		if cam.is_position_behind(p3):
			continue
		if r.has_point(cam.unproject_position(p3)) and not sel.has(e):
			sel.append(e)

func _order(sp: Vector2) -> void:
	var units := sel.filter(func(e): return not e.dead and not e.is_b and e.team == ME)
	if units.is_empty():
		if sel.size() == 1 and sel[0].is_b and sel[0].team == ME:
			sel[0].rally = _ground_at(sp)
		return
	var tg := _pick(sp)
	if tg != null and tg.team != ME:
		for e: Ent in units:
			e.order = "attack"
			e.target = tg
		_boom(Vector3(tg.pos.x, 3, tg.pos.y), 10.0, Color(1.0, 0.3, 0.2), 0.35)
		return
	var g := _ground_at(sp)
	var n := units.size()
	var cols := int(ceil(sqrt(n)))
	for i in n:
		var e: Ent = units[i]
		var off := Vector2((i % cols) - (cols - 1) * 0.5, int(i / cols) - (cols - 1) * 0.5) * 34.0
		e.order = "move"
		e.target = null
		e.tpos = g + off
	_boom(Vector3(g.x, 2, g.y), 8.0, Color(0.4, 1.0, 0.5), 0.4)

# ---------------------------------------------------------------- UI
func _ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	var top := PanelContainer.new()
	top.position = Vector2(0, 0)
	top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	ui.add_child(top)
	lbl_top = Label.new()
	lbl_top.text = "WORLD WAR 3 - TEST RANGE (Godot)"
	top.add_child(lbl_top)
	lbl_fps = Label.new()
	lbl_fps.position = Vector2(10, 8)
	ui.add_child(lbl_fps)
	# Test range panel (right)
	var pn := PanelContainer.new()
	pn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	pn.position = Vector2(-250, 40)
	pn.custom_minimum_size = Vector2(230, 0)
	ui.add_child(pn)
	pn.anchor_left = 1.0
	pn.anchor_right = 1.0
	pn.offset_left = -246
	pn.offset_right = -12
	pn.offset_top = 40
	var vb := VBoxContainer.new()
	pn.add_child(vb)
	var h := Label.new()
	h.text = "TEST RANGE  -  Iran vs United States"
	vb.add_child(h)
	# BATTLE HOOK (orch/godot-battle): one button to the Battle setup screen
	var bbat := Button.new()
	bbat.text = "BATTLE (vs AI) >"
	bbat.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/battle.tscn"))
	vb.add_child(bbat)
	for it in [["Riflemen squad", "inf"], ["Anti-tank team", "at"], ["T-72 tank", "tank"], ["Supply truck", "harv"]]:
		var b := Button.new()
		b.text = "+ " + it[0]
		var kind: String = it[1]
		b.pressed.connect(func(): train(kind))
		vb.add_child(b)
	var bd := Button.new()
	bd.text = "+5 Shahed drones"
	bd.pressed.connect(func():
		var hq := _bld("hq", ME)
		if hq == null:
			return
		for i in 5:
			var dr := spawn("drone", ME, hq.pos + Vector2(40, -60 + i * 30))
			dr.ang = 0.0
		_msg("Shaheds launched"))
	vb.add_child(bd)
	var b5 := Button.new()
	b5.text = "+5 tanks"
	b5.pressed.connect(func():
		for i in 5:
			train("tank"))
	vb.add_child(b5)
	var sendb := Button.new()
	sendb.text = "Send new targets (attack)"
	sendb.pressed.connect(func(): _send_targets(true))
	vb.add_child(sendb)
	var clr := Button.new()
	clr.text = "Clear targets"
	clr.pressed.connect(func():
		for e: Ent in ents:
			if e.team == EN and not e.is_b:
				e.hp = 0)
	vb.add_child(clr)
	fight_btn = Button.new()
	fight_btn.text = "Enemy fights back: ON"
	fight_btn.pressed.connect(func():
		enemy_fights = not enemy_fights
		fight_btn.text = "Enemy fights back: " + ("ON" if enemy_fights else "OFF"))
	vb.add_child(fight_btn)
	var bb := Button.new()
	bb.text = "Speed test: 250 vs 250 (F9)"
	bb.pressed.connect(_bench_start)
	vb.add_child(bb)
	# bottom: selection
	var bot := PanelContainer.new()
	bot.anchor_top = 1.0
	bot.anchor_bottom = 1.0
	bot.anchor_left = 0.0
	bot.anchor_right = 1.0
	bot.offset_top = -64
	ui.add_child(bot)
	lbl_sel = Label.new()
	lbl_sel.text = ""
	bot.add_child(lbl_sel)
	msg_lbl = Label.new()
	msg_lbl.position = Vector2(12, 34)
	ui.add_child(msg_lbl)
	box = Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.4, 1.0, 0.5, 0.12)
	sb.border_color = Color(0.5, 1.0, 0.6, 0.9)
	sb.set_border_width_all(1)
	box.add_theme_stylebox_override("panel", sb)
	box.visible = false
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(box)
	_style(ui)

func _style(root: Node) -> void:
	for c in root.get_children():
		if c is Control:
			(c as Control).add_theme_font_size_override("font_size", 15)
		_style(c)

func _msg(s: String) -> void:
	msg_lbl.text = s
	msg_t = 3.0

func _ui_tick(dt: float) -> void:
	lbl_fps.text = "%d FPS  ·  %d units" % [Engine.get_frames_per_second(), ents.filter(func(e): return not e.is_b).size()]
	if sel.is_empty():
		lbl_sel.text = "  Left-click select · drag box · right-click move/attack · Ctrl+A army · W A S D scroll · wheel zoom · select Barracks/Factory + click ground = rally"
	else:
		var counts := {}
		for e: Ent in sel:
			counts[e.kind] = counts.get(e.kind, 0) + 1
		var parts: Array = []
		for k in counts:
			parts.append("%d %s" % [counts[k], k])
		lbl_sel.text = "  Selected: " + ", ".join(parts)
	msg_t -= dt
	if msg_t <= 0:
		msg_lbl.text = ""

# ---------------------------------------------------------------- speed test
func _bench_start() -> void:
	var cy := MAP_H * 0.5
	for i in bench_n:
		var k := "inf" if i % 5 < 3 else ("at" if i % 5 == 3 else "tank")
		var a := spawn(k, ME, Vector2(900 + (i % 25) * 18, cy - 250 + int(i / 25) * 50))
		a.order = "amove"
		a.tpos = Vector2(MAP_W - 600, cy)
		var b := spawn(k, EN, Vector2(MAP_W - 900 - (i % 25) * 18, cy - 250 + int(i / 25) * 50))
		b.order = "amove"
		b.tpos = Vector2(600, cy)
	enemy_fights = true
	cam_target = Vector2(CH_X, BRIDGES[0])
	cam_dist = 900.0
	bench_on = true
	bench = {"t0": t, "frames": [], "cpu": []}
	_msg("Speed test running for 30 s ...")

func _bench_tick(_dt: float) -> void:
	bench["frames"].append(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
	if t - bench["t0"] > 30.0:
		bench_on = false
		var fr: Array = bench["frames"]
		fr.sort()
		var avg := 0.0
		for v in fr:
			avg += v
		avg /= maxf(1, fr.size())
		var txt := "SPEED TEST: %d FPS now, process %.1f ms avg, worst %.1f ms, units %d" % [Engine.get_frames_per_second(), avg, fr[-1] if fr.size() else 0.0, ents.size()]
		print(txt)
		_msg(txt)
		msg_t = 20.0

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_MOUSE_EXIT or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		mouse_in = false
