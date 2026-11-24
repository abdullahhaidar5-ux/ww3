## Lane P4c: the battle's light, sky, haze, exposure, shadows, weather and final colour grade - the browser game's
## numbers (src/04-gfx.js WX table + applyWeather, src/05-fx3d.js weatherFX, src/10-post.js LOOKP / TGRADE / mFinal).
##   var env = LookEnv.setup(host, map, {tod = "day", weather = "clear"})   # once, after the map is known
##   env.tick(dt, cam)                                                      # every frame
##   env.set_conditions("dusk", "rain")  ·  env.flash += 0.1  ·  env.shake  (read by the camera owner)
## Time of day: day (the "Cinematic" look, the browser default), golden, overcast, dusk, night.
## Weather: clear, rain, storm, fog, sandstorm, snow, blizzard. Purely visual, nothing here touches the simulation.
extends RefCounted

const WX := {
	"day": {sun = "#ffeed2", si = 2.22, off = [-960, 760, -560], sky = "#b2d0f4", gnd = "#a68e6e", hi = 1.36, fog = "#dfd0b8", fn = 1600.0, ff = 6600.0, expo = 1.04, sr = 2.6, hor = [.90, .83, .70], zen = [.26, .48, .80], gr = [1.0, 1.0, 1.0], sat = 1.04, fx = 1.0, amb = [1.0, 0.99, 0.96]},
	"golden": {sun = "#ffc98c", si = 2.42, off = [-1180, 520, -540], sky = "#a6bce0", gnd = "#8c6e4e", hi = 1.22, fog = "#d2ae86", fn = 1500.0, ff = 6000.0, expo = 1.02, sr = 2.4, hor = [.98, .76, .52], zen = [.32, .46, .74], gr = [1.04, 1.0, .92], sat = 1.06, fx = 1.15, amb = [1.02, .96, .88]},
	"overcast": {sun = "#e6ebf2", si = 1.18, off = [-450, 1150, -300], sky = "#c0c8d2", gnd = "#746e62", hi = 1.58, fog = "#a8aeb2", fn = 1300.0, ff = 5200.0, expo = 1.00, sr = 5.0, hor = [.72, .75, .78], zen = [.52, .56, .63], gr = [.97, .99, 1.03], sat = .86, fx = 1.15, amb = [.92, .94, .96]},
	"dusk": {sun = "#ffa868", si = 2.20, off = [-1320, 340, -560], sky = "#7688b6", gnd = "#50423b", hi = 1.08, fog = "#7c6874", fn = 1400.0, ff = 5400.0, expo = 1.06, sr = 3.0, hor = [.95, .52, .34], zen = [.15, .20, .38], gr = [1.0, .95, .98], sat = .94, fx = 2.1, amb = [.58, .54, .60]},
	"night": {sun = "#9db8ec", si = .65, off = [-900, 700, -500], sky = "#223258", gnd = "#1c202c", hi = .62, fog = "#0e1528", fn = 950.0, ff = 4400.0, expo = 1.24, sr = 4.0, hor = [.09, .12, .20], zen = [.02, .03, .08], gr = [.92, .97, 1.1], sat = .78, fx = 2.6, amb = [.52, .58, .76]},
}
## Hyper-Realistic Military RTS daylight (Zero Hour ROTR / CoH3 / Broken Arrow): crisp sunlit armor & soldiers, sculpted shadows
const LOOK_WX := {sun = "#fff3de", si = 2.45, off = [-1240, 620, -640], sky = "#9ec0e8", gnd = "#8c7e6a", hi = 1.24, fog = "#dcd6ca", fn = 1850.0, ff = 6800.0, expo = 1.06, sr = 1.6, hor = [.89, .86, .80], zen = [.18, .40, .76], gr = [1.0, 1.0, 1.0], sat = 1.06, fx = 1.22, amb = [1.0, .99, .96]}
const LOOK := {v = 0.24, g = .002, sh = 0.0, k = 1.07, bl = 1.12, s = [.95, .97, 1.02], h = [1.03, 1.01, .97]}
const TGRADE := {"desert": {tg = [1.0, 0.99, 0.98], s = 1.04}, "green": {tg = [0.99, 1.01, 0.99], s = 1.05}, "snow": {tg = [1.0, 1.0, 1.0], s = 1.00}}
const WFOG := {"rain": ["#7d868c", 500.0, 3200.0], "storm": ["#7d868c", 500.0, 3200.0], "fog": ["#b9bdbb", 150.0, 1500.0], "sandstorm": ["#c49a64", 45.0, 780.0],
	"blizzard": ["#dfe6ee", 150.0, 1700.0], "snow": ["#e3e9f0", 220.0, 2300.0]}
## Calibrated ACES exposure so units, tanks, soldiers, sand & snow stay crisp, sunlit and richly legible (never dark/muddy!)
var expo_k := 0.80
## snow is brighter than sand: gentle exposure trim keeps snow crisp white without crushing soldier/tank readability
var theme_k := 1.0
const RAIN_N := 1400

var host: Node3D
var map: Dictionary
var theme := "desert"
var tod := "day"
var weather := "clear"
var w: Dictionary = {}             # the light preset in use
var we: WorldEnvironment
var env: Environment
var sun: DirectionalLight3D
var hemi: DirectionalLight3D       # the "sky minus ground" half of the browser's hemisphere light
var sky_mat: ShaderMaterial
var grade: ShaderMaterial
var grade_layer: CanvasLayer
var fx_amb := Vector3.ONE          # tint for unlit smoke / dust (WXAMB)
var fx_k := 1.0                    # effect light multiplier for this time of day (WXFX)
var night := 0                     # 0 day, 1 dusk, 2 night
var flash := 0.0                   # screen flash from big explosions (look_fx adds, decays here)
var shake := 0.0                   # camera shake in world units (look_fx adds, decays here; the camera owner applies it)
var wet := 0.0                     # rain wetness 0..1
var wm := 0.0                      # weather blend 0..1
var base_fog: Array = []
var base_si := 1.0
var base_hi := 1.0
var ltn := 0.0; var ltn_cd := 6.0; var ltn_f := 0.0
var rain: MultiMeshInstance3D
var rain_d := PackedFloat32Array()
var fx = null                      # look_fx (sandstorm / snow use its particle pool)
var height_fn: Callable            # ground height at (x, z)
var _water_sun_dir := Vector3(-0.82, 0.36, -0.44)
var _water_hor := Color(0.88, 0.84, 0.76)
var _water_zen := Color(0.12, 0.36, 0.80)
var _water_sun_col := Color(1.0, 0.94, 0.84)
var _water_synced := false

static func setup(host_: Node3D, map_: Dictionary, opts: Dictionary = {}):
	var e = new()
	e._setup(host_, map_, opts)
	return e

static func theme_of(map_: Dictionary) -> String:
	var th := String(map_.get("theme", ""))
	if th in ["desert", "green", "snow"]: return th
	return "desert"

func _setup(host_: Node3D, map_: Dictionary, opts: Dictionary) -> void:
	host = host_; map = map_
	theme = theme_of(map)
	# P4c HOOK: the Test range's light and sky (main.gd _env) are replaced by this module
	for c in host.get_children():
		if c is WorldEnvironment or c is DirectionalLight3D: c.queue_free()
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	sky_mat = ShaderMaterial.new()
	sky_mat.shader = load("res://shaders/sky_dome.gdshader")
	sky.sky_material = sky_mat
	var is_mob := preload("res://scripts/ui/ui_kit.gd").is_mobile()
	sky.radiance_size = Sky.RADIANCE_SIZE_32
	sky.process_mode = Sky.PROCESS_MODE_QUALITY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 0.44
	env.ambient_light_energy = 1.12
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_white = 6.0
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.02
	env.adjustment_contrast = 1.07
	env.adjustment_saturation = 1.06
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_density = 1.0
	env.fog_depth_curve = 1.15
	env.fog_sky_affect = 0.35
	env.fog_sun_scatter = 0.20
	env.fog_aerial_perspective = 0.0
	env.glow_enabled = not is_mob
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_ADDITIVE
	env.glow_hdr_threshold = 1.05
	env.glow_hdr_scale = 1.35
	env.glow_bloom = 0.06
	env.glow_strength = 1.08
	env.set_glow_level(0, 0.0); env.set_glow_level(1, 0.70); env.set_glow_level(2, 0.48); env.set_glow_level(3, 0.0); env.set_glow_level(4, 0.0)
	we = WorldEnvironment.new()
	we.environment = env
	host.add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	# 2-split cascades cut shadow draw calls in HALF on WebGL2 while giving SHARPER near-camera unit/building shadows!
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL if is_mob else DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_split_1 = 0.25
	sun.directional_shadow_max_distance = 1000.0 if is_mob else 1650.0
	sun.directional_shadow_fade_start = 0.86
	sun.shadow_bias = 0.032
	sun.shadow_normal_bias = 0.56
	sun.shadow_opacity = 0.72
	host.add_child(sun)
	hemi = DirectionalLight3D.new()
	hemi.shadow_enabled = false
	hemi.light_specular = 0.0
	host.add_child(hemi)
	grade_layer = CanvasLayer.new()
	grade_layer.layer = -100
	var cr := ColorRect.new()
	cr.set_anchors_preset(Control.PRESET_FULL_RECT)
	cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	grade = ShaderMaterial.new()
	grade.shader = load("res://shaders/fx_grade.gdshader")
	cr.material = grade
	grade_layer.add_child(cr)
	host.add_child(grade_layer)
	if opts.get("grade", true) == false: grade_layer.visible = false
	set_conditions(String(opts.get("tod", "day")), String(opts.get("weather", "clear")))
	wm = 1.0 if weather != "clear" else 0.0   # a battle starts already in its weather

## conditions of the battle: bridge / menu values ("dusk", "night", "rain"...) or the JS condition numbers
func set_conditions(tod_: String, weather_: String) -> void:
	tod = tod_ if WX.has(tod_) else "day"
	weather = {"sand": "sandstorm"}.get(weather_, weather_)
	if weather != "clear" and not WFOG.has(weather): weather = "clear"
	_apply()

func _c(hex: String) -> Color: return Color(hex)
func _v(a: Array) -> Vector3: return Vector3(a[0], a[1], a[2])

func _apply() -> void:
	w = WX[tod].duplicate()
	if tod == "day": w.merge(LOOK_WX, true)   # lookW(): the Cinematic look owns the daytime light
	night = 2 if tod == "night" else (1 if tod == "dusk" else 0)
	var sunc := _c(w.sun); var skyc := _c(w.sky); var gndc := _c(w.gnd); var fogc := _c(w.fog); var hi: float = w.hi
	theme_k = 1.0
	if theme == "snow":
		var dk := night > 0
		sunc = sunc.lerp(_c("#fff9f0"), 0.2 if dk else 0.55)
		skyc = _c("#8492a8" if dk else "#c8d0dc"); gndc = _c("#686e78" if dk else "#a6acb4")
		fogc = _c("#d9c9bd" if tod == "golden" else ("#8f8296" if dk else "#cfd6de"))
		hi *= 0.92
		theme_k = 0.92 if dk else 0.86
	elif theme == "green":
		sunc = sunc.lerp(_c("#fff6e4"), 0.4)
		fogc = _c("#c4d2d6") if night == 0 else fogc
	sun.light_color = sunc
	base_si = w.si; base_hi = hi
	var off := _v(w.off)
	sun.look_at_from_position(off, Vector3.ZERO, Vector3.UP)
	sun.shadow_blur = clampf(float(w.sr) * 0.42, 0.50, 2.0)
	sun.shadow_opacity = 0.56 if night == 2 else (0.58 if theme == "snow" else 0.68)
	# Balanced opposite-side sky rim fill + neutral sky/ground ambient bounce (keeps snow crisp white & units bright/readable!)
	var hemi_off := Vector3(-off.x, maxf(off.y * 0.92, 540.0), -off.z)
	hemi.look_at_from_position(hemi_off, Vector3.ZERO, Vector3.UP)
	var sl := skyc.srgb_to_linear(); var gl := gndc.srgb_to_linear()
	var mid := Color(sl.r * 0.56 + gl.r * 0.44, sl.g * 0.58 + gl.g * 0.42, sl.b * 0.62 + gl.b * 0.38)
	var rim := Color(sl.r * 0.84, sl.g * 0.88, minf(1.0, sl.b * 0.94))
	env.ambient_light_color = mid.linear_to_srgb()
	hemi.light_color = rim.linear_to_srgb()
	base_fog = [fogc, float(w.fn), float(w.ff)]
	var no_scatter := (tod == "night") or (weather == "storm") or (weather == "rain") or (weather == "fog") or (tod == "overcast")
	env.fog_sun_scatter = 0.0 if no_scatter else 0.20
	env.fog_sky_affect = 0.35
	env.tonemap_exposure = float(w.expo) * expo_k * theme_k
	env.glow_intensity = 0.48 * float(LOOK.bl)
	var hor_v := _v(w.hor)
	var zen_v := _v(w.zen)
	var sun_n := off.normalized()
	var ov := 0.0
	if weather == "rain" or weather == "storm" or weather == "blizzard":
		ov = 0.90
	elif tod == "overcast" or weather == "fog" or weather == "snow" or weather == "sandstorm":
		ov = 0.65
	sky_mat.set_shader_parameter("hor", hor_v); sky_mat.set_shader_parameter("zen", zen_v)
	sky_mat.set_shader_parameter("sun_dir", sun_n)
	sky_mat.set_shader_parameter("overcast", ov)
	_water_sun_dir = sun_n
	_water_hor = Color(hor_v.x, hor_v.y, hor_v.z)
	_water_zen = Color(zen_v.x, zen_v.y, zen_v.z)
	_water_sun_col = sunc
	_water_synced = false
	_sync_water()
	fx_amb = _v(w.amb); fx_k = float(w.get("fx", 1.0))
	var T: Dictionary = TGRADE[theme]
	env.adjustment_contrast = float(LOOK.k)
	env.adjustment_saturation = float(w.sat) * float(T.s)
	env.adjustment_brightness = 1.02 if night == 0 else 1.04
	grade.set_shader_parameter("vig", LOOK.v)
	_light(0.0, 0.0)

func _sync_water() -> void:
	if host == null: return
	var wn := host.get_node_or_null("WaterMesh")
	if wn is MeshInstance3D:
		var wmat: Material = (wn as MeshInstance3D).material_override
		if wmat is ShaderMaterial:
			var sm := wmat as ShaderMaterial
			sm.set_shader_parameter("sun_dir", _water_sun_dir)
			sm.set_shader_parameter("sky_horizon", _water_hor)
			sm.set_shader_parameter("sky_zenith", _water_zen)
			sm.set_shader_parameter("sun_color", _water_sun_col)
			_water_synced = true

func _light(dim: float, L: float) -> void:
	sun.light_energy = base_si * (1.0 - dim) + base_si * L * 2.2
	var hk := base_hi * (1.0 - dim * 0.55) + base_hi * L * 1.5
	env.ambient_light_energy = 1.22 * (hk / 1.28)
	hemi.light_energy = 0.62 * hk

func tick(dt: float, cam: Camera3D) -> void:
	if not _water_synced:
		_sync_water()
	# weather blends in / out (weatherFX)
	wm = minf(1.0, wm + dt * 0.35) if weather != "clear" else maxf(0.0, wm - dt * 0.5)
	var fogc: Color = base_fog[0]; var fn: float = base_fog[1]; var ff: float = base_fog[2]
	if WFOG.has(weather):
		var T: Array = WFOG[weather]
		fogc = fogc.lerp(_c(T[0]), wm * 0.85); fn = lerpf(fn, T[1], wm); ff = lerpf(ff, T[2], wm)
	var raining := weather == "rain" or weather == "storm"
	wet += ((wm if raining else 0.0) - wet) * minf(1.0, dt * 0.25)
	var sm := wm if weather == "storm" else 0.0
	if sm > 0.4:
		ltn_cd -= dt
		if ltn_cd <= 0.0: ltn = 1.0; ltn_f = randf_range(0.5, 1.0); ltn_cd = randf_range(4.0, 13.0)
	if ltn > 0.0:
		ltn = maxf(0.0, ltn - dt * (5.0 if ltn_f > 0.75 else 3.0))
	var L := ltn * ltn
	_light((wm * 0.12 if raining else 0.0) + sm * 0.3, L)
	if L > 0.02: fogc = fogc.lerp(_c("#d8e2ff"), minf(0.7, L * 0.6))
	env.fog_light_color = fogc; env.fog_depth_begin = fn; env.fog_depth_end = ff
	# tight camera-height-scaled shadow frustum for razor-sharp anchored ground shadows
	if cam != null:
		var hgt := maxf(200.0, cam.global_position.y)
		sun.directional_shadow_max_distance = clampf(hgt * 1.85, 720.0, 2350.0)
	flash = maxf(0.0, flash - dt * 1.6)
	shake *= exp(-7.0 * dt)
	grade.set_shader_parameter("flash", flash)
	env.tonemap_exposure = float(w.expo) * expo_k * theme_k * (1.0 + flash * 1.5)
	if cam != null: _precip(dt, cam)

## rain = 1400 streaks in one MultiMesh around the view; sandstorm / snow = particles from the effects pool
func _precip(dt: float, cam: Camera3D) -> void:
	var raining := (weather == "rain" or weather == "storm") and wm > 0.02
	if raining and rain == null: _make_rain()
	if rain != null:
		rain.visible = raining
		if raining:
			var fwd := -cam.global_transform.basis.z
			var c := cam.global_position + fwd * (cam.global_position.y / maxf(0.2, -fwd.y))
			var R := maxf(420.0, cam.global_position.distance_to(c) * 1.1)
			(rain.material_override as ShaderMaterial).set_shader_parameter("centre", Vector3(c.x, c.y, c.z))
			(rain.material_override as ShaderMaterial).set_shader_parameter("radius", R)
			(rain.material_override as ShaderMaterial).set_shader_parameter("opacity", 0.35 * wm)
	if fx == null or wm <= 0.05: return
	var fwd2 := -cam.global_transform.basis.z
	var c2 := cam.global_position + fwd2 * (cam.global_position.y / maxf(0.2, -fwd2.y))
	var R2 := maxf(420.0, cam.global_position.distance_to(c2) * 1.1)
	if weather == "sandstorm":
		for i in int(dt * 90.0 * wm + randf()):
			var x := c2.x + randf_range(-R2, R2); var z := c2.z + randf_range(-R2 * 0.7, R2 * 0.7)
			fx.part(false, Vector3(x, fx.gh(x, z) + randf_range(2, 60), z), Vector3(randf_range(90, 160), randf_range(-4, 8), randf_range(-15, 15)), randf_range(1.6, 2.8), randf_range(18, 36), 22.0, 0.3 * wm, Color(0.78, 0.6, 0.38), null, 0.0, 0.9, 16)
	elif weather == "snow" or weather == "blizzard":
		for i in int(dt * (70.0 if weather == "snow" else 120.0) * wm + randf()):
			var x := c2.x + randf_range(-R2, R2); var z := c2.z + randf_range(-R2 * 0.7, R2 * 0.7)
			fx.part(false, Vector3(x, fx.gh(x, z) + randf_range(40, 220), z), Vector3(randf_range(50, 90), -randf_range(30, 50), randf_range(-10, 14)), randf_range(3, 5), randf_range(1.6, 2.8), 0.0, 0.9, Color(1.05, 1.08, 1.12), null, 0.0, 1.0, 16)

func _make_rain() -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	var q := QuadMesh.new()
	q.size = Vector2(1, 1)
	mm.mesh = q
	mm.instance_count = RAIN_N
	for i in RAIN_N:
		mm.set_instance_transform(i, Transform3D(Basis(), Vector3(randf_range(-1, 1), randf(), randf_range(-1, 1))))
	rain = MultiMeshInstance3D.new()
	rain.multimesh = mm
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/fx_rain.gdshader")
	rain.material_override = m
	rain.custom_aabb = AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 2e4, 2e5))
	rain.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(rain)
