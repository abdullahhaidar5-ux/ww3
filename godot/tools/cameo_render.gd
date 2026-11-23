extends SceneTree
## Offline cameo renderer: Command & Conquer Generals: Zero Hour style 3D button pictures for every unit/building.
##
##   set APPDATA/LOCALAPPDATA to the kit dirs, then (windowed, GL Compatibility like the web build):
##   godot --rendering-driver opengl3 --path godot -s res://tools/cameo_render.gd -- [--only=IR,US] [--size=240x192]
##   godot --rendering-driver opengl3 --path godot -s res://tools/cameo_render.gd -- --contact=IR:tank,US:jet,b:IR:hq --out=C:/x.png
##
## Full run: renders every "u/<NAT>/<kind>" and "b/<NAT>/<kind>" key of res://ui/icons/atlas.json (plus the neutral
## "b/_/<x>" tech buildings) with the game's own models (X1), packs each nation into res://ui/icons/cameos/<NAT>.png
## (same file names, 8 px edge-filled gutters so mipmaps don't bleed) and rewrites only those entries' regions in
## atlas.json in place (text edit: every other key and the file's formatting stay untouched).
## Then run `godot --headless --path godot --import` so the sheets are re-imported.
##
## Look: 3/4 view from the front-left and slightly above (perspective), subject framed pixel-exact to ~84% of the
## picture (a mask pass measures the silhouette, an off-axis frustum crops to it), warm key light top-left with crisp
## shadows, cool fill from the right, rim light from behind, painted sky/haze/ground background with a vignette.
## A picture is rendered at 2x and Lanczos-downsampled.
## Opening the project in the editor before the first run is not needed (models are already imported).

const X1 = preload("res://models/auto/x1_models.gd")
const ATLAS := "res://ui/icons/atlas.json"
const SHEET_DIR := "res://ui/icons/cameos/"
const NEUTRAL := {"oil": "derrick", "quarry": "techb_quarry", "mine": "techb_mine", "plant": "techb_plant", "hosp": "techb_hosp"}
const GUT := 8
const COLS := 10
const SS := 2                     # supersampling factor
const YAW := 38.0                 # camera yaw from the unit's front (+X) towards its left side (-Z)
const ELEV := 28.0                # camera elevation (units); buildings use ELEV_B
const ELEV_B := 33.0
const FILL := 0.84                # subject size / picture size along its limiting axis
const FOV1 := 40.0                # measuring pass field of view

var CW := 180
var CH := 144
var only: Array = []
var contact: Array = []
var out_path := ""
var cs_w := 120
var cs_h := 96
var vp: SubViewport
var world: Node3D
var cam: Camera3D
var key_l: DirectionalLight3D
var fill_l: DirectionalLight3D
var rim_l: DirectionalLight3D
var env: Environment
var sky_mat: ShaderMaterial
var blob: MeshInstance3D
var vignette: Image
var man: Dictionary
var log_lines: PackedStringArray = []

const SKY_SHADER := """
shader_type sky;
uniform vec3 top_col : source_color = vec3(0.42, 0.55, 0.68);
uniform vec3 hor_col : source_color = vec3(0.86, 0.76, 0.58);
uniform vec3 low_col : source_color = vec3(0.45, 0.38, 0.28);
uniform vec3 glow_col : source_color = vec3(1.0, 0.9, 0.7);
uniform float horizon = 0.6;
uniform float seed = 0.0;
uniform float cloud = 0.6;
uniform float glow = 0.35;
// screen position from the view ray (SCREEN_UV is not usable in GL Compatibility sky shaders):
// camera basis + the frustum window on the near plane (centre x, centre y, height, aspect) and the near distance
uniform vec3 cam_r = vec3(1.0, 0.0, 0.0);
uniform vec3 cam_u = vec3(0.0, 1.0, 0.0);
uniform vec3 cam_f = vec3(0.0, 0.0, -1.0);
uniform vec4 win = vec4(0.0, 0.0, 1.0, 1.25);
uniform float near_d = 1.0;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }

void sky() {
	if (AT_CUBEMAP_PASS) {
		COLOR = mix(low_col, top_col, clamp(EYEDIR.y * 0.5 + 0.5, 0.0, 1.0));
	} else {
		float fz = max(dot(EYEDIR, cam_f), 0.001);
		vec2 np = vec2(dot(EYEDIR, cam_r), dot(EYEDIR, cam_u)) * near_d / fz;
		vec2 uv = vec2((np.x - win.x) / (win.z * win.w) + 0.5, 0.5 - (np.y - win.y) / win.z);
		float y = uv.y;
		float hz = horizon + (fbm(vec2(uv.x * 2.2 + seed, seed * 0.37)) - 0.5) * 0.07;
		vec3 c;
		if (y < hz) {
			float t = clamp(y / hz, 0.0, 1.0);
			c = mix(top_col, hor_col, pow(t, 1.5));
			float cl = fbm(vec2(uv.x * 2.4 + seed * 1.7, y * 5.0 + seed));
			float cl2 = fbm(vec2(uv.x * 6.0 - seed, y * 12.0 + seed * 0.5));
			c = mix(c, mix(hor_col, vec3(1.0), 0.35), smoothstep(0.42, 0.82, cl * 0.75 + cl2 * 0.25) * cloud * (1.0 - t * 0.6));
		} else {
			float t = clamp((y - hz) / max(1.0 - hz, 0.01), 0.0, 1.0);
			c = mix(hor_col, low_col, smoothstep(0.0, 0.55, t));
			float gn = fbm(vec2(uv.x * 7.0 + seed, y * 16.0 - seed));
			float gs = fbm(vec2(uv.x * 2.0 - seed, y * 4.0));
			c *= 0.86 + 0.22 * gn + 0.1 * (gs - 0.5);
		}
		c = mix(c, hor_col * 1.06, exp(-pow((y - hz) / 0.055, 2.0)) * 0.55);
		vec2 d = (uv - vec2(0.42, 0.42)) * vec2(1.25, 1.0);
		c += glow_col * glow * exp(-dot(d, d) * 5.0);
		float v = length((uv - 0.5) * vec2(1.0, 1.15));
		c *= mix(1.0, 0.62, smoothstep(0.34, 0.9, v));
		COLOR = c;
	}
}
"""

const BLOB_SHADER := """
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled;
uniform float strength = 0.5;
void fragment() {
	float r = length(UV - 0.5) * 2.0;
	ALBEDO = vec3(0.05, 0.04, 0.03);
	ALPHA = strength * (1.0 - smoothstep(0.25, 1.0, r));
}
"""

# Generals: Zero Hour dramatic studio backdrops (sRGB): top sky, horizon glow, ground/water, horizon height, cloudiness
const BG := {
	"ground": [Color(0.24, 0.36, 0.50), Color(0.86, 0.72, 0.50), Color(0.30, 0.25, 0.19), 0.58, 0.65],
	"building": [Color(0.26, 0.38, 0.52), Color(0.88, 0.74, 0.52), Color(0.34, 0.28, 0.21), 0.50, 0.55],
	"air": [Color(0.16, 0.34, 0.62), Color(0.76, 0.80, 0.84), Color(0.36, 0.42, 0.48), 0.78, 0.92],
	"naval": [Color(0.22, 0.36, 0.52), Color(0.78, 0.76, 0.68), Color(0.10, 0.22, 0.30), 0.48, 0.62],
}

func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--only="): only = Array(a.substr(7).split(",", false))
		elif a.begins_with("--size="):
			var p := a.substr(7).split("x")
			CW = int(p[0]); CH = int(p[1])
		elif a.begins_with("--contact="): contact = Array(a.substr(10).split(",", false))
		elif a.begins_with("--out="): out_path = a.substr(6)
		elif a.begins_with("--cs="):
			var q := a.substr(5).split("x")
			cs_w = int(q[0]); cs_h = int(q[1])
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	get_root().size = Vector2i(640, 360)
	man = X1.manifest()
	_setup()
	_run.call_deferred()

func _setup() -> void:
	vp = SubViewport.new()
	vp.size = Vector2i(CW * SS, CH * SS)
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_4X
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.positional_shadow_atlas_size = 0
	get_root().add_child(vp)
	var preview := TextureRect.new()
	preview.texture = vp.get_texture()
	preview.size = Vector2(CW * SS, CH * SS) * 0.75
	preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	get_root().add_child(preview)
	world = Node3D.new()
	vp.add_child(world)
	cam = Camera3D.new()
	vp.add_child(cam)
	env = Environment.new()
	sky_mat = ShaderMaterial.new()
	var sh := Shader.new(); sh.code = SKY_SHADER
	sky_mat.shader = sh
	var sky := Sky.new(); sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_32
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.60, 0.65, 0.74)
	env.ambient_light_energy = 0.52
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.92
	env.tonemap_white = 5.5
	cam.environment = env
	key_l = DirectionalLight3D.new()
	key_l.light_color = Color(1.0, 0.93, 0.82)
	key_l.light_energy = 1.38
	key_l.shadow_enabled = true
	key_l.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	key_l.shadow_bias = 0.03
	key_l.shadow_normal_bias = 1.0
	key_l.shadow_blur = 0.6
	vp.add_child(key_l)
	fill_l = DirectionalLight3D.new()
	fill_l.light_color = Color(0.56, 0.72, 1.0)
	fill_l.light_energy = 0.58
	vp.add_child(fill_l)
	rim_l = DirectionalLight3D.new()
	rim_l.light_color = Color(1.0, 0.96, 0.88)
	rim_l.light_energy = 0.95
	vp.add_child(rim_l)
	blob = MeshInstance3D.new()
	var pm := PlaneMesh.new(); pm.size = Vector2(1, 1)
	blob.mesh = pm
	var bm := ShaderMaterial.new()
	var bs := Shader.new(); bs.code = BLOB_SHADER
	bm.shader = bs
	blob.material_override = bm
	blob.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	vp.add_child(blob)
	# overlay vignette over the whole picture (model included), very gentle
	vignette = Image.create(CW, CH, false, Image.FORMAT_RGBA8)
	for y in CH:
		for x in CW:
			var u := (float(x) + 0.5) / CW - 0.5
			var v := ((float(y) + 0.5) / CH - 0.5) * 1.1
			var r := sqrt(u * u + v * v)
			vignette.set_pixel(x, y, Color(0.02, 0.03, 0.05, clampf((r - 0.42) / 0.35, 0.0, 1.0) * 0.3))

# ------------------------------------------------------------------------------------------------ jobs
## every cameo job: {key, nation, kind, cat}
func _jobs() -> Array:
	var out: Array = []
	if not contact.is_empty():
		for c in contact:
			var p := String(c).split(":")
			var is_b := p[0] == "b"
			if is_b: p = p.slice(1)
			out.append(_job(("b/%s/%s" if is_b else "u/%s/%s") % [p[0], p[1]]))
		return out
	var j = JSON.parse_string(FileAccess.get_file_as_string(ATLAS))
	var keys: Array = j.icons.keys()
	keys.sort()
	for k in keys:
		var ks := String(k)
		if not (ks.begins_with("u/") or ks.begins_with("b/")): continue
		var nat := ks.split("/")[1]
		if not only.is_empty() and not only.has(nat): continue
		out.append(_job(ks))
	return out

func _job(key: String) -> Dictionary:
	var p := key.split("/")
	var nat := p[1]; var kind := p[2]
	if nat == "_":
		return {key = key, nation = "_map", kind = NEUTRAL.get(kind, ""), cat = "building", sheet = "_neutral"}
	var e: Dictionary = man.get(nat, {}).get(kind, {})
	var cat := "building" if String(e.get("type", "")) == "building" or p[0] == "b" else String(e.get("stat", {}).get("dom", "ground"))
	if not BG.has(cat): cat = "ground"
	return {key = key, nation = nat, kind = kind, cat = cat, sheet = nat}

# ------------------------------------------------------------------------------------------------ main
func _run() -> void:
	var jobs := _jobs()
	var t0 := Time.get_ticks_msec()
	print("CAMEO jobs ", jobs.size(), " size ", CW, "x", CH)
	var pics := {}       # key -> Image
	var failed: Array = []
	var i := 0
	for jb in jobs:
		i += 1
		var img: Image = null
		if String(jb.kind) != "":
			img = await _render(jb)
		if img == null:
			failed.append(jb.key)
			print("CAMEO fail ", jb.key)
		else:
			pics[jb.key] = img
		if i % 50 == 0: print("CAMEO %d/%d  %.1fs" % [i, jobs.size(), (Time.get_ticks_msec() - t0) / 1000.0])
	print("CAMEO rendered ", pics.size(), " failed ", failed.size(), " in %.1fs" % ((Time.get_ticks_msec() - t0) / 1000.0))
	if not contact.is_empty():
		_contact_sheet(jobs, pics)
	else:
		_pack(jobs, pics)
	for l in log_lines: print(l)
	print("CAMEO failed: ", failed)
	quit()

func _contact_sheet(jobs: Array, pics: Dictionary) -> void:
	var dw := cs_w; var dh := cs_h; var pad := 4
	var cols := 6
	var rows := int(ceil(jobs.size() / float(cols)))
	var sheet := Image.create(cols * (dw + pad) + pad, rows * (dh + pad) + pad + 2 * (46 + pad) * 0, false, Image.FORMAT_RGB8)
	sheet.fill(Color(0.08, 0.1, 0.12))
	var n := 0
	for jb in jobs:
		if not pics.has(jb.key): n += 1; continue
		var im: Image = (pics[jb.key] as Image).duplicate()
		im.resize(dw, dh, Image.INTERPOLATE_LANCZOS)
		im.convert(Image.FORMAT_RGB8)
		sheet.blit_rect(im, Rect2i(0, 0, dw, dh), Vector2i(pad + (n % cols) * (dw + pad), pad + (n / cols) * (dh + pad)))
		n += 1
	var p := out_path if out_path != "" else "user://cameos_contact.png"
	sheet.save_png(p)
	# also a small-button strip (56x46, the HUD command card size)
	var small := Image.create(cols * (56 + pad) + pad, rows * (46 + pad) + pad, false, Image.FORMAT_RGB8)
	small.fill(Color(0.08, 0.1, 0.12))
	n = 0
	for jb in jobs:
		if pics.has(jb.key):
			var im2: Image = (pics[jb.key] as Image).duplicate()
			im2.resize(56, 46, Image.INTERPOLATE_LANCZOS)
			im2.convert(Image.FORMAT_RGB8)
			small.blit_rect(im2, Rect2i(0, 0, 56, 46), Vector2i(pad + (n % cols) * (56 + pad), pad + (n / cols) * (46 + pad)))
		n += 1
	small.save_png(p.get_basename() + "_small.png")
	print("CAMEO contact sheet ", p)

# ------------------------------------------------------------------------------------------------ one picture
func _subject(jb: Dictionary) -> Node3D:
	var nat: String = jb.nation; var kind: String = jb.kind
	var e: Dictionary = X1.entry(nat, kind)
	if e.is_empty() or e.has("err"): return null
	# hi soldier files carry no mesh: squads use the in-game (lo) soldiers
	var root := X1.build(nat, kind, not e.has("squad"))
	if e.has("squad"):
		# Heroic Generals-style squad portrait: spread perpendicular to camera ray (+0.62, +0.79) so 2-man & 3-man squads never overlap!
		var sq: Array = e["squad"]
		var keep := mini(3, sq.size())
		var form2 := [Vector3(-1.2, 0.0, -2.4), Vector3(1.6, 0.0, 2.4)]
		var form3 := [Vector3(1.6, 0.0, -0.4), Vector3(-2.6, 0.0, -3.6), Vector3(-0.6, 0.0, 4.0)]
		var yaws := [128.0, 120.0, 138.0]
		var idx := 0
		for c in root.get_children():
			if idx < sq.size():
				if idx >= keep: root.remove_child(c); c.queue_free()
				else:
					(c as Node3D).position = Vector3.ZERO if keep <= 1 else (form2[idx] if keep == 2 else form3[idx])
					(c as Node3D).rotation_degrees.y = yaws[idx]
				idx += 1
	return root

## pose every soldier of the subject with the "idle" clip. The exported clips address the skeleton through the node
## names of the file they were made for, so the tracks are re-pointed at this soldier's own Skeleton3D.
func _pose_soldiers(root: Node3D, jb: Dictionary) -> void:
	var i := 0
	for s in root.get_children():
		var sk := _first_of(s, "Skeleton3D") as Skeleton3D
		if sk == null: continue
		var lib: AnimationLibrary = null
		var old := s.get_node_or_null("AnimationPlayer") as AnimationPlayer
		if old != null and old.has_animation("idle"):
			var names := old.get_animation_library_list()
			if names.size() > 0: lib = old.get_animation_library(names[0])
		if lib == null or not lib.has_animation("idle"):
			var af := _any_anim_file(jb.nation, jb.kind)
			if af != "": lib = X1.anim_library(af)
		if old != null: s.remove_child(old); old.queue_free()
		if lib == null or not lib.has_animation("idle"): continue
		var an := lib.get_animation("idle").duplicate(true) as Animation
		var skp := String(s.get_path_to(sk))
		for t in range(an.get_track_count() - 1, -1, -1):
			var p := String(an.track_get_path(t))
			var k := p.find("Skeleton3D:")
			if k >= 0:
				an.track_set_path(t, NodePath(skp + p.substr(k + 10)))
			elif not s.has_node(NodePath(p.split(":")[0])):
				an.remove_track(t)
		var nl := AnimationLibrary.new()
		nl.add_animation("idle", an)
		var ap := AnimationPlayer.new()
		ap.name = "CameoPose"
		s.add_child(ap)
		ap.add_animation_library("", nl)
		ap.play("idle")
		ap.seek(fmod(0.3 + i * 0.41, maxf(an.length, 0.01)), true)
		ap.pause()
		i += 1

func _any_anim_file(nat: String, kind: String) -> String:
	var looks: Dictionary = X1.entry(nat, kind).get("looks", {})
	for lk in looks.keys():
		for lod in ["lo", "hi"]:
			var af = looks[lk].get(lod, {}).get("animFile", null)
			if af != null and String(af) != "": return String(af)
	return ""

func _first_of(n: Node, type: String) -> Node:
	if n.is_class(type): return n
	for c in n.get_children():
		var r := _first_of(c, type)
		if r != null: return r
	return null

func _meshes(n: Node, acc: Array) -> void:
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null and (n as MeshInstance3D).visible: acc.append(n)
	for c in n.get_children(): _meshes(c, acc)

func _frame() -> void:
	await RenderingServer.frame_post_draw

func _mask_rect() -> Rect2i:
	vp.transparent_bg = true
	env.background_mode = Environment.BG_CLEAR_COLOR
	blob.visible = false
	await _frame(); await _frame()
	var im := vp.get_texture().get_image()
	if im.get_format() != Image.FORMAT_RGBA8: im.convert(Image.FORMAT_RGBA8)
	return im.get_used_rect()

func _render(jb: Dictionary) -> Image:
	var subj := _subject(jb)
	if subj == null: return null
	world.add_child(subj)
	if X1.entry(jb.nation, jb.kind).has("squad"): _pose_soldiers(subj, jb)
	await _frame()
	var ms: Array = []
	_meshes(subj, ms)
	if ms.is_empty():
		subj.queue_free(); return null
	var is_b: bool = jb.cat == "building"
	if is_b: _hide_clutter(ms)
	var bb := AABB()
	var first := true
	for m in ms:
		var mi := m as MeshInstance3D
		if not mi.is_visible_in_tree() or mi is MeshInstance3D and mi.skin != null: continue
		var b := mi.global_transform * mi.get_aabb()
		if first: bb = b; first = false
		else: bb = bb.merge(b)
	# skinned soldiers: their mesh AABB is unreliable, use a ~17 x 8 x 8 box around each soldier
	for s in subj.get_children():
		if _first_of(s, "Skeleton3D") == null: continue
		var sc := subj.scale.x
		var sp: Vector3 = subj.global_transform * (s as Node3D).position
		var b := AABB(sp + Vector3(-4.5, 0, -4.5) * sc, Vector3(9, 18, 9) * sc)
		if first: bb = b; first = false
		else: bb = bb.merge(b)
	if first:
		subj.queue_free(); return null
	var c := bb.get_center()
	var rad := maxf(bb.size.length() * 0.5, 1.0)
	var el := deg_to_rad(ELEV_B if is_b else ELEV)
	var yw := deg_to_rad(YAW)
	var d := Vector3(cos(el) * cos(yw), sin(el), -cos(el) * sin(yw))
	var dist := rad / sin(deg_to_rad(FOV1 * 0.5)) * 1.05
	var A := float(CW) / float(CH)
	var near := maxf(0.05, dist - rad * 1.2)
	var far := dist + rad * 1.5
	cam.transform = Transform3D(Basis.looking_at(-d, Vector3.UP), c + d * dist)
	cam.projection = Camera3D.PROJECTION_PERSPECTIVE
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.fov = FOV1; cam.near = near; cam.far = far
	_lights(d, c, dist, rad)
	var W := float(vp.size.x); var H := float(vp.size.y)
	# window on the near plane: centre (ox, oy), height wh
	var ox := 0.0; var oy := 0.0
	var wh := 2.0 * near * tan(deg_to_rad(FOV1 * 0.5))
	var r := await _mask_rect()
	if r.size.x <= 0 or r.size.y <= 0:
		subj.queue_free(); return null
	var squad: bool = X1.entry(jb.nation, jb.kind).has("squad") and _first_of(subj, "Skeleton3D") != null
	for it in 3:
		if squad:
			# infantry: close-up from the knees up (Zero Hour soldier portraits), fill the frame a bit more
			r = Rect2i(r.position, Vector2i(r.size.x, int(r.size.y * 0.8)))
		var ww := wh * A
		var cx := ox + (-0.5 + (r.position.x + r.size.x * 0.5) / W) * ww
		var cy := oy + (0.5 - (r.position.y + r.size.y * 0.5) / H) * wh
		var cw := r.size.x / W * ww
		var ch := r.size.y / H * wh
		var nh := maxf(ch, cw / A) / (FILL if not squad else 0.88)
		ox = cx; oy = cy + nh * (0.015 if not squad else 0.0)
		wh = nh
		cam.projection = Camera3D.PROJECTION_FRUSTUM
		cam.set_frustum(wh, Vector2(ox, oy), near, far)
		if squad: break
		r = await _mask_rect()
		var fx := r.size.x / W; var fy := r.size.y / H
		var mx := (r.position.x + r.size.x * 0.5) / W - 0.5; var my := (r.position.y + r.size.y * 0.5) / H - 0.5
		var ok := absf(maxf(fx, fy) - FILL) < 0.03 and absf(mx) < 0.02 and absf(my - 0.015) < 0.03 and r.position.x > 0 and r.position.y > 0 and r.end.x < int(W) and r.end.y < int(H)
		if ok: break
		if it == 2: log_lines.append("CAMEO frame-off %s fill %.2f/%.2f centre %.3f,%.3f" % [jb.key, fx, fy, mx, my])
	# final picture
	var pal: Array = BG[jb.cat]
	sky_mat.set_shader_parameter("top_col", pal[0])
	sky_mat.set_shader_parameter("hor_col", pal[1])
	sky_mat.set_shader_parameter("low_col", pal[2])
	sky_mat.set_shader_parameter("horizon", pal[3])
	sky_mat.set_shader_parameter("cloud", pal[4])
	sky_mat.set_shader_parameter("seed", float(hash(jb.key) % 1000) * 0.137)
	env.background_mode = Environment.BG_SKY
	var cb := cam.global_transform.basis
	sky_mat.set_shader_parameter("cam_r", cb.x.normalized())
	sky_mat.set_shader_parameter("cam_u", cb.y.normalized())
	sky_mat.set_shader_parameter("cam_f", -cb.z.normalized())
	sky_mat.set_shader_parameter("win", Vector4(ox, oy, wh, A))
	sky_mat.set_shader_parameter("near_d", near)
	vp.transparent_bg = false
	if jb.cat != "air":
		blob.visible = true
		var fw := maxf(bb.size.x, bb.size.z)
		blob.scale = Vector3(bb.size.x * 1.25 + fw * 0.1, 1, bb.size.z * 1.25 + fw * 0.1)
		blob.position = Vector3(c.x, bb.position.y + 0.08, c.z)
		(blob.material_override as ShaderMaterial).set_shader_parameter("strength", 0.42 if jb.cat != "naval" else 0.25)
	await _frame(); await _frame()
	var img := vp.get_texture().get_image()
	img.convert(Image.FORMAT_RGBA8)
	img.resize(CW, CH, Image.INTERPOLATE_LANCZOS)
	img.adjust_bcs(1.02, 1.1, 1.14)
	img.blend_rect(vignette, Rect2i(0, 0, CW, CH), Vector2i.ZERO)
	img.convert(Image.FORMAT_RGB8)
	world.remove_child(subj)
	subj.queue_free()
	blob.visible = false
	return img

## buildings come with base clutter scattered far around them (crates, poles, sandbags): hide small meshes that sit
## far from the main structure so the picture shows the building itself, large.
func _hide_clutter(ms: Array) -> void:
	var boxes: Array = []
	var cand: Array = []
	var core := AABB()
	var core_v := -1.0
	for m in ms:
		var mi := m as MeshInstance3D
		var b := mi.global_transform * mi.get_aabb()
		boxes.append(b)
		var mx := maxf(b.size.x, maxf(b.size.y, b.size.z))
		var mn := minf(b.size.x, minf(b.size.y, b.size.z))
		var flat := b.size.y < 0.12 * maxf(b.size.x, b.size.z)
		var thin := mn < 0.03 * mx
		var ok := not flat and not thin
		cand.append(ok)
		var v := b.size.x * b.size.z * b.size.y
		if ok and v > core_v: core_v = v; core = b
	if core_v <= 0.0: return
	# the main structure = the biggest solid mesh plus every solid mesh that is big or touches it
	var main := core
	for i in boxes.size():
		var bb := boxes[i] as AABB
		if cand[i] and (bb.size.length() > core.size.length() * 0.45 or bb.intersects(core.grow(core.size.length() * 0.08))): main = main.merge(bb)
	var lim := main.grow(main.size.length() * 0.12)
	for i in ms.size():
		var bb := boxes[i] as AABB
		if lim.encloses(bb) or (cand[i] and bb.intersects(main)): continue
		(ms[i] as MeshInstance3D).visible = false

func _lights(d: Vector3, c: Vector3, dist: float, rad: float) -> void:
	var f := -d
	var rt := f.cross(Vector3.UP).normalized()
	var up := rt.cross(f).normalized()
	# a light's "from" direction -> node basis (lights shine along their -Z)
	var setl := func(l: DirectionalLight3D, from: Vector3) -> void:
		var dir := -from.normalized()
		var upv := Vector3.UP if absf(dir.dot(Vector3.UP)) < 0.98 else Vector3.FORWARD
		l.transform = Transform3D(Basis.looking_at(dir, upv), c)
	setl.call(key_l, -rt * 0.85 + up * 1.0 + d * 0.55)
	setl.call(fill_l, rt * 1.0 + up * 0.1 + d * 0.6)
	setl.call(rim_l, -d * 1.0 + up * 0.65 + rt * 0.45)
	key_l.directional_shadow_max_distance = dist + rad * 2.0

# ------------------------------------------------------------------------------------------------ sheets + atlas.json
func _pack(jobs: Array, pics: Dictionary) -> void:
	var atlas_txt := FileAccess.get_file_as_string(ATLAS)
	var j = JSON.parse_string(atlas_txt)
	var icons: Dictionary = j.icons
	var by_sheet := {}
	for jb in jobs:
		if not by_sheet.has(jb.sheet): by_sheet[jb.sheet] = []
		by_sheet[jb.sheet].append(jb.key)
	# the neutral sheet also holds cameos without a model (house, garrison): carry them over (upscaled)
	if by_sheet.has("_neutral"):
		for k in icons.keys():
			if String(icons[k].get("file", "")) == "cameos/_neutral.png" and not by_sheet["_neutral"].has(k): by_sheet["_neutral"].append(k)
	var old_sheets := {}
	var pw := CW + 2 * GUT; var ph := CH + 2 * GUT
	var n_new := 0
	for sname in by_sheet.keys():
		var keys: Array = by_sheet[sname]
		keys.sort()
		var rows := int(ceil(keys.size() / float(COLS)))
		var sheet := Image.create(COLS * pw, rows * ph, false, Image.FORMAT_RGB8)
		sheet.fill(Color(0.05, 0.06, 0.07))
		var file := "cameos/%s.png" % sname
		for i in keys.size():
			var k: String = keys[i]
			var im: Image = pics.get(k, null)
			if im == null:
				# no new picture: keep the old one, scaled to the new cell
				var row: Dictionary = icons.get(k, {})
				var of := "res://ui/icons/" + String(row.get("file", file))
				if not old_sheets.has(of):
					var oi := Image.load_from_file(ProjectSettings.globalize_path(of))
					if oi != null: oi.convert(Image.FORMAT_RGB8)
					old_sheets[of] = oi
				var src: Image = old_sheets[of]
				if src == null or row.is_empty(): continue
				im = src.get_region(Rect2i(int(row.x), int(row.y), int(row.w), int(row.h)))
				im.resize(CW, CH, Image.INTERPOLATE_LANCZOS)
				log_lines.append("CAMEO kept old picture " + k)
			else:
				n_new += 1
			var x0 := (i % COLS) * pw; var y0 := (i / COLS) * ph
			var under := im.duplicate()
			under.resize(pw, ph, Image.INTERPOLATE_BILINEAR)
			sheet.blit_rect(under, Rect2i(0, 0, pw, ph), Vector2i(x0, y0))
			sheet.blit_rect(im, Rect2i(0, 0, CW, CH), Vector2i(x0 + GUT, y0 + GUT))
			atlas_txt = _set_region(atlas_txt, k, file, x0 + GUT, y0 + GUT, CW, CH)
		sheet.save_png(SHEET_DIR + sname + ".png")
		print("CAMEO sheet ", sname, " ", keys.size(), " cameos ", sheet.get_width(), "x", sheet.get_height())
	var f := FileAccess.open(ATLAS, FileAccess.WRITE)
	f.store_string(atlas_txt)
	f.close()
	print("CAMEO atlas.json updated, new pictures ", n_new)

func _set_region(txt: String, key: String, file: String, x: int, y: int, w: int, h: int) -> String:
	var re := RegEx.new()
	re.compile("(\"" + key.replace("/", "\\/") + "\": \\{\\s*\"file\": \")[^\"]*(\",\\s*\"x\": )-?[0-9.]+(,\\s*\"y\": )-?[0-9.]+(,\\s*\"w\": )-?[0-9.]+(,\\s*\"h\": )-?[0-9.]+")
	var m := re.search(txt)
	if m == null:
		log_lines.append("CAMEO atlas key not found " + key)
		return txt
	var rep := m.get_string(1) + file + m.get_string(2) + str(x) + m.get_string(3) + str(y) + m.get_string(4) + str(w) + m.get_string(5) + str(h)
	return txt.substr(0, m.get_start()) + rep + txt.substr(m.get_end())
