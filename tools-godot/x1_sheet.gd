## Lane X1: contact sheet of the exported models, drawn by Godot through res://models/auto/x1_models.gd.
##   xvfb-run -a -s "-screen 0 2600x1700x24" godot --path godot --rendering-driver opengl3 --resolution 2400x1500 \
##     -s ../tools-godot/x1_sheet.gd -- --nations=IR,RS,DW,RV,OB --kinds=inf,tank,aa --out=/abs/sheet.png [--anims] [--merged] [--cell=120]
## rows = nations, columns = kinds; a rifleman stands beside every vehicle and building for scale.
extends SceneTree

var X1 = null
var frames := 0
var out_path := "sheet.png"

func arg(name: String, def: String) -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--" + name + "="): return a.substr(name.length() + 3)
		if a == "--" + name: return "1"
	return def

func _initialize() -> void:
	X1 = load("res://models/auto/x1_models.gd")
	var nations := arg("nations", "IR").split(",")
	var kinds := arg("kinds", "inf,tank").split(",")
	out_path = arg("out", "sheet.png")
	var cell := float(arg("cell", "120"))
	var cz := float(arg("cellz", str(cell * 0.85)))
	var anims := arg("anims", "") != ""
	var use_merged := arg("merged", "") != ""
	var world := Node3D.new()
	root.add_child(world)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.55, 0.6, 0.66)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(1, 1, 1)
	e.ambient_light_energy = 0.75
	env.environment = e
	world.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, 35, 0)
	sun.light_energy = 1.25
	world.add_child(sun)
	var rows := nations.size()
	var cols := kinds.size()
	if anims:
		kinds = PackedStringArray(["idle", "walk", "run", "crouch", "prone", "reload", "grenade", "die"])
		cols = kinds.size()
	var gw := cols * cell
	var gd := rows * cz
	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(gw * 3.0, gd * 3.0 + 600.0)
	ground.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.62, 0.56, 0.44)
	ground.material_override = gm
	ground.position = Vector3(gw * 0.5, -0.05, gd * 0.5)
	world.add_child(ground)
	var missing := []
	for r in rows:
		var fac := String(nations[r])
		var lab := Label3D.new()
		lab.text = fac
		lab.font_size = 96
		lab.pixel_size = cell / 420.0
		lab.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		lab.no_depth_test = true
		lab.modulate = Color(1, 1, 0.6)
		lab.position = Vector3(-cell * 0.35, 14, r * cz + cz * 0.5)
		world.add_child(lab)
		for c in cols:
			var kind := String(kinds[c])
			var pos := Vector3(c * cell + cell * 0.5, 0, r * cz + cz * 0.5)
			if r == 0:
				var kl := Label3D.new()
				kl.text = kind
				kl.font_size = 72
				kl.pixel_size = cell / 420.0
				kl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
				kl.no_depth_test = true
				kl.position = pos + Vector3(0, 0, -cz * 0.62)
				world.add_child(kl)
			if anims:
				var s: Node3D = X1.soldier(fac, arg("kind", "inf"), "v0", arg("hi", "") != "")
				if s == null:
					missing.append(fac + "/" + kind)
					continue
				world.add_child(s)
				s.position = pos
				s.rotation.y = deg_to_rad(-35)
				s.scale = Vector3(3, 3, 3)
				var ap := s.get_node_or_null("AnimationPlayer") as AnimationPlayer
				if ap == null or not ap.has_animation(kind):
					missing.append(fac + "/" + kind + " (no clip)")
					continue
				var a := ap.get_animation(kind)
				ap.play(kind)
				var hold := kind in ["crouch", "prone", "die"]
				ap.seek(a.length if hold else a.length * (0.5 if kind in ["reload", "grenade"] else 0.25), true)
				ap.pause()
				continue
			var en: Dictionary = X1.entry(fac, kind)
			if en.is_empty() or en.has("err"):
				missing.append(fac + "/" + kind)
				continue
			var holder := Node3D.new()
			world.add_child(holder)
			holder.position = pos
			holder.rotation.y = deg_to_rad(-35)
			if use_merged and not en.has("squad"):
				var parts: Dictionary = X1.merged(fac, kind)
				var pd: Dictionary = en.get("parts", {})
				for p in parts.keys():
					var mi := MeshInstance3D.new()
					mi.mesh = parts[p]
					holder.add_child(mi)
					var t := Transform3D.IDENTITY
					var q = p
					while q != null and q != "" and pd.has(q):
						t = X1.xf(pd[q].get("m", null)) * t
						q = pd[q].get("parent", null)
					mi.transform = t
			else:
				holder.add_child(X1.build(fac, kind))
			if not en.has("squad"):
				var s2: Node3D = X1.soldier(fac, "inf", "v0")
				if s2 != null:
					world.add_child(s2)
					var bb = en.get("bbox", null)
					var off := 26.0
					if bb != null: off = max(14.0, float(bb["max"][2]) + 8.0)
					s2.position = pos + Vector3(-cell * 0.2, 0, min(off, cz * 0.45))
					s2.rotation.y = deg_to_rad(-35)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	var vp := Vector2(DisplayServer.window_get_size())
	var pitch := deg_to_rad(float(arg("pitch", "38")))
	var centre := Vector3(gw * 0.5 - cell * 0.15, 0, gd * 0.5 - cz * 0.2)
	var dirv := Vector3(0, sin(pitch), cos(pitch))
	cam.near = 10.0
	cam.far = 9000.0
	world.add_child(cam)
	cam.look_at_from_position(centre + dirv * 3000.0, centre, Vector3.UP)
	var need_h: float = max(gd * sin(pitch) + 140.0, (gw + cell * 0.8) * vp.y / vp.x)
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.size = need_h
	cam.current = true
	print("X1 cam size ", cam.size, " vp ", vp, " win ", DisplayServer.window_get_size())
	if missing.size() > 0: print("X1 sheet missing: ", ", ".join(missing))
	print("X1 sheet: ", rows, " x ", cols, " -> ", out_path)

func _process(_dt: float) -> bool:
	frames += 1
	if frames == 12:
		var img := root.get_texture().get_image()
		img.save_png(out_path)
		print("X1 sheet saved ", img.get_width(), "x", img.get_height())
		return true
	return false
