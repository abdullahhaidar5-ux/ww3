## Lane P4c desktop viewer: draws one dumped map (tools-godot/p4c_dump.mjs) with the real terrain / sky / effects code,
## replays the dumped battle events, saves a picture and prints ms per frame. No simulation, no browser.
##   xvfb-run -a godot --rendering-driver opengl3 --path godot res://scenes/p4c_view.tscn -- --dump=../godot-build/p4c/bm_splitridge.json
##       [--cam=x,y,dist] [--yaw=deg] [--tod=day|dusk|night] [--weather=clear|rain|snow|sand|fog] [--shot=out.png] [--frames=90] [--lines] [--fog] [--fxtest]
extends Node3D

const Terrain = preload("res://scripts/battle/battle_terrain.gd")
const LookEnv = preload("res://scripts/battle/look_env.gd")
const LookFx = preload("res://scripts/battle/look_fx.gd")

var map: Dictionary
var dump: Dictionary
var cam: Camera3D
var env
var fx
var frames_left := 90
var shot := ""
var fi := 0
var acc := 0.0
var t_frames := 0
var t_usec := 0
var fxtest := false
var ft := 0.0

func _b64f(s: String) -> PackedFloat32Array: return Marshalls.base64_to_raw(s).to_float32_array()

func _ready() -> void:
	var a := {dump = "../godot-build/p4c/bm_splitridge.json", cam = "", yaw = "0", tod = "day", weather = "clear", shot = "", frames = "90", theme = ""}
	var flags := {}
	for s in OS.get_cmdline_user_args():
		var kv := s.trim_prefix("--").split("=", true, 1)
		if kv.size() == 2: a[kv[0]] = kv[1]
		else: flags[kv[0]] = true
	var path: String = a.dump
	if not path.is_absolute_path(): path = ProjectSettings.globalize_path("res://").path_join(path).simplify_path()
	dump = JSON.parse_string(FileAccess.get_file_as_string(path))
	map = dump.map
	for k in ["grid", "cover", "wood"]: map[k] = Marshalls.base64_to_raw(map["_" + k])
	map.hgrid.a = _b64f(map._hgrid)
	map.road = {C = map.road.C, w = map.road.w, h = map.road.h, d = Marshalls.base64_to_raw(map._road)}
	if a.theme != "": map.theme = a.theme
	shot = a.shot; frames_left = int(a.frames); fxtest = flags.has("fxtest")
	env = LookEnv.setup(self, map, {tod = a.tod, weather = a.weather})
	Terrain.build(self, null, map, Callable())
	if flags.has("nograde"): env.grade_layer.visible = false
	if flags.has("noglow"): env.env.glow_enabled = false
	if a.has("tm"): env.env.tonemap_mode = {"linear": Environment.TONE_MAPPER_LINEAR, "filmic": Environment.TONE_MAPPER_FILMIC, "aces": Environment.TONE_MAPPER_ACES}[a.tm]
	if flags.has("nohemi"): env.hemi.visible = false
	if flags.has("nosun"): env.sun.visible = false
	if flags.has("noamb"): env.env.ambient_light_source = Environment.AMBIENT_SOURCE_DISABLED
	if a.has("expok"): env.expo_k = float(a.expok)
	fx = LookFx.new()
	add_child(fx)
	fx.setup(map, dump.tables, env)
	fx.warmup()
	if flags.has("lines"): fx.set_lines(dump.lines, 0); fx.show_lines(true)
	if flags.has("fog") and dump.has("fog"): fx.set_fog(Marshalls.base64_to_raw(dump.fog))
	cam = Camera3D.new()
	cam.fov = 35.0; cam.near = 5.0; cam.far = 14000.0
	add_child(cam)
	var cx := float(map.MAPW) * 0.5; var cy := float(map.MAPH) * 0.5; var d := 900.0
	if a.cam != "":
		var v: PackedStringArray = a.cam.split(",")
		cx = float(v[0]); cy = float(v[1]); d = float(v[2])
	var yaw := deg_to_rad(float(a.yaw))
	var tgt := Vector3(cx, Terrain.height_at(map, cx, cy), cy)
	var back := Vector3(sin(yaw), 0, cos(yaw))
	cam.position = tgt + back * d * 0.62 + Vector3.UP * d * 0.78
	cam.look_at(tgt)
	cam.make_current()

func _process(dt: float) -> void:
	if fx == null:
		get_tree().quit(); return
	fi += 1
	if fi > 20: t_frames += 1; t_usec += int(dt * 1e6)
	if fxtest:
		ft += dt
		if fi % 20 == 5: _fake_events()
	elif dump.frames.size() > 0:
		acc += dt
		while acc >= 1.0 / 30.0 and not dump.frames.is_empty():
			acc -= 1.0 / 30.0
			var f: Dictionary = dump.frames.pop_front()
			fx.step(_b64f(f.ent), f.ev)
	fx.tick(dt, cam)
	env.tick(dt, cam)
	frames_left -= 1
	if frames_left == 0:
		if shot != "":
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(shot)
		print("P4C VIEW %s: %.1f ms/frame over %d frames, draw calls %d, prims %d" % [map.key, t_usec / 1000.0 / maxf(1, t_frames), t_frames,
			RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME), RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)])
		get_tree().quit()

## a spread of every effect around the camera target, for pictures without a battle
func _fake_events() -> void:
	var f := -cam.global_transform.basis.z
	var c3 := cam.global_position + f * (cam.global_position.y / maxf(0.2, -f.y))
	var c := Vector2(c3.x, c3.z)
	var ev := []
	for i in 8:
		var p := c + Vector2(randf_range(-300, 300), randf_range(-200, 200))
		var q := p + Vector2(randf_range(-260, 260), randf_range(-260, 260))
		ev.append(["tr", p.x, p.y, 8, q.x, q.y, 6, 1 if i == 7 else 0])
		ev.append(["muz", p.x, p.y, 8, (q - p).angle(), 5 if i % 2 else 13])
	var p2 := c + Vector2(randf_range(-300, 300), randf_range(-200, 200))
	ev.append(["pj", p2.x, p2.y, 10, p2.x + randf_range(-400, 400), p2.y + randf_range(-300, 300), 0, 280 if fi % 40 < 20 else 430, "shell" if fi % 40 < 20 else "missile", 0])
	var n := fi / 20
	var sizes := [9.0, 14.0, 22.0, 40.0, 7.0, 18.0, 30.0]
	ev.append(["boom", c.x + randf_range(-320, 320), c.y + randf_range(-200, 200), sizes[n % sizes.size()], 1 if n % 7 == 3 else 0])
	if n == 2: ev.append(["die", 999001, c.x - 120, c.y + 60, 25, 0, 1])
	if n == 3: ev.append(["die", 999002, c.x + 160, c.y - 40, 46, 1, 1])
	if n == 1: ev.append(["smoke", c.x + 260, c.y + 150, 70]); ev.append(["heal", c.x - 260, c.y - 120, 60])
	fx.step(PackedFloat32Array(), ev)
