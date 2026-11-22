## Lane P4c: every battle effect, driven by the bridge's events - the browser game's numbers (src/05-fx3d.js FXH /
## boomFX / splashFX, src/05b-missiles.js megaBoom). No node per effect: two particle pools (normal + additive), one
## tracer pool, one ring pool, two decal pools and a rubble pool are each ONE MultiMesh; a particle is written once
## when it spawns and the GPU flies it (shaders/fx_part.gdshaderinc). A few pooled lights flash for blasts.
##   var fx = LookFx.new(); host.add_child(fx); fx.setup(map, tables, env)      # once per battle
##   fx.step(sim.ent, sim.events)        # after every sim step (events + smoke/dust that follows units)
##   fx.tick(dt, cam)                    # every frame
##   fx.set_fog(sim.fog(me)) · fx.set_lines(sim.lines(), me, teams) · fx.show_lines(on)
## Positions are the sim's design units: map (x, y) -> world (x, z); heights from the map's height field.
extends Node3D

const NM := 2304          # normal-blend particles
const NA := 1792          # additive particles
const NT := 800           # tracers
const NR := 24            # rings
const N_SCORCH := 320
const N_CRATER := 160
const N_RUBBLE := 48
const C_SMOKE := Color(.42, .4, .37)
const C_DARK := Color(.13, .12, .11)
const C_DUST := Color(.66, .58, .44)
const C_FIRE := Color(1, .42, .1)
const C_FIRE2 := Color(1, .68, .3)
const C_SPARK := Color(1, .75, .35)
const C_RICO := Color(3, 2.5, 1.5)
const SOILC := {
	"desert": [Color(.6, .5, .35), Color(.47, .38, .26), Color(.3, .24, .17)],
	"green": [Color(.42, .33, .22), Color(.3, .24, .17), Color(.22, .17, .12)],
	"snow": [Color(.92, .94, .97), Color(.74, .76, .8), Color(.36, .33, .3)],
	"hard": [Color(.56, .55, .52), Color(.4, .4, .39), Color(.27, .27, .26)]}
const DUSTC := {
	"desert": [Color(.86, .76, .6), Color(.8, .69, .53), Color(.9, .83, .7)],
	"green": [Color(.6, .55, .45), Color(.55, .5, .42), Color(.66, .61, .5)],
	"snow": [Color(.95, .97, 1), Color(.9, .93, .97), Color(1, 1, 1)],
	"hard": [Color(.66, .65, .62), Color(.6, .59, .57), Color(.72, .71, .68)]}
const INF_KINDS := ["cleric", "saka", "mortar", "recon", "officer", "medic", "commissar", "sapper", "guer", "atk", "inf", "at", "hacker", "hero", "champ", "spy", "fpvt"]
const AIR_KINDS := ["drone", "heli", "jet", "airlift", "tb2"]
const NAVAL_KINDS := ["lander", "boat", "sub", "fast", "minel", "sweep", "ship"]
const GRAV := 1
const BOUNCE := 2
const KEEP := 16          # exempt from the dust / smoke thinning (smoke screens, weather)
const ES := 18            # entity record stride (SimBridge.ENT_STRIDE)

var map: Dictionary
var env = null
var kinds: Array = []
var weapons: Array = []
var theme := "desert"
var t := 0.0
var me := 0
var cam_pos := Vector3.ZERO
var cam_dist := 800.0
var cam_fwd := Vector3.FORWARD
var on_wreck := Callable()      # (id, x, z, kind_name): the unit lane leaves a burnt hull here
var on_collapse := Callable()   # (id, x, z, size): the building lane sinks its model
# pools
var bm := PackedFloat32Array(); var ba := PackedFloat32Array(); var bt := PackedFloat32Array(); var br := PackedFloat32Array()
var hm := 0; var ha := 0; var ht := 0; var hr := 0
var dm := false; var da := false; var dt_ := false; var dr := false
var mm_m: MultiMesh; var mm_a: MultiMesh; var mm_t: MultiMesh; var mm_r: MultiMesh
var mm_scorch: MultiMesh; var mm_crater: MultiMesh; var mm_rubble: MultiMesh
var n_scorch := 0; var n_crater := 0; var n_rubble := 0
var mats: Array = []
var lights: Array = []          # [OmniLight3D, energy now, life] explosion lights
var mlights: Array = []         # muzzle lights
var wlights: Array = []         # wreck fire lights
var proj: Array = []            # shells / missiles in flight (drawn with particles only, like the browser)
var emit: Array = []            # smoke columns, ground fires, wreck fires, mushroom stems, flares, collapses
var later: Array = []           # [time, Callable]
var prev_ent := PackedFloat32Array()
var ent_i := 0
# height field
var H := PackedFloat32Array(); var hw := 1; var hh := 1; var hR := 10.0
var grid := PackedByteArray(); var GW := 1; var GH := 1; var CELL := 40.0
var road := PackedByteArray(); var rw := 1; var rh := 1; var rC := 16.0
# fog of war / supply lines
var fow: MeshInstance3D; var fow_img: Image; var fow_tex: ImageTexture; var fow_next := 0.0
var lines_mi: MeshInstance3D

# ------------------------------------------------------------------ setup
func setup(map_: Dictionary, tables: Dictionary, env_ = null) -> void:
	map = map_; env = env_
	kinds = tables.get("kinds", []); weapons = tables.get("weapons", [])
	theme = String(map.get("theme", "desert"))
	if not SOILC.has(theme): theme = "desert"
	var hg: Dictionary = map.hgrid
	H = hg.a; hw = int(hg.w); hh = int(hg.h); hR = float(hg.R)
	grid = map.grid; GW = int(map.GW); GH = int(map.GH); CELL = float(map.CELL)
	if map.get("road") != null:
		road = map.road.d; rw = int(map.road.w); rC = float(map.road.C); rh = maxi(1, road.size() / maxi(1, rw))
	if env != null: env.fx = self
	var noise: Texture2D = load("res://tex/fx_noise.png")
	var huge := AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
	var q := QuadMesh.new(); q.size = Vector2(1, 1)
	bm.resize(NM * 20); ba.resize(NA * 20); bt.resize(NT * 16); br.resize(NR * 16)
	mm_m = _pool(q, NM, true, "res://shaders/fx_part_mix.gdshader", huge, 5, {noise_tex = noise})
	mm_a = _pool(q, NA, true, "res://shaders/fx_part_add.gdshader", huge, 6, {noise_tex = noise})
	mm_t = _pool(q, NT, false, "res://shaders/fx_tracer.gdshader", huge, 7, {})
	mm_r = _pool(q, NR, false, "res://shaders/fx_ring.gdshader", huge, 2, {})
	var pl := PlaneMesh.new(); pl.size = Vector2(1, 1)
	mm_scorch = _pool(pl, N_SCORCH, false, "res://shaders/fx_decal.gdshader", huge, 0, {tex = load("res://tex/fx_scorch.png"), opacity = 1.0})
	mm_crater = _pool(pl, N_CRATER, false, "res://shaders/fx_decal.gdshader", huge, 1, {tex = load("res://tex/fx_crater.png"), opacity = 0.95})
	mm_scorch.visible_instance_count = 0; mm_crater.visible_instance_count = 0
	_rubble_pool()
	for i in 4: lights.append([_light(Color("#ffa860"), 320.0), 0.0, 1.0])
	for i in 2: mlights.append([_light(Color("#ffb060"), 140.0), 0.0, 0.06])
	for i in 3: wlights.append([_light(Color("#ff8a3a"), 170.0), 0.0, 1.0])
	_fow_setup()

func _pool(mesh: Mesh, n: int, custom: bool, shader: String, aabb: AABB, prio: int, params: Dictionary) -> MultiMesh:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.use_custom_data = custom
	mm.mesh = mesh
	mm.instance_count = n
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm
	var m := ShaderMaterial.new()
	m.shader = load(shader)
	m.render_priority = prio
	for k in params: m.set_shader_parameter(k, params[k])
	mi.material_override = m
	mi.custom_aabb = aabb
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.extra_cull_margin = 16384.0
	add_child(mi)
	mats.append(m)
	return mm

func _light(col: Color, rng: float) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = col; l.omni_range = rng; l.omni_attenuation = 1.6
	l.shadow_enabled = false; l.light_energy = 0.0; l.light_specular = 0.2
	l.visible = false
	add_child(l)
	return l

## one warm-up: every pool is one always-drawn MultiMesh, so its shader compiles on the first frame of the loading
## screen; the pooled lights are switched on (dark) for a few frames so lit materials compile their light paths too.
func warmup() -> void:
	for L in lights + mlights + wlights:
		(L[0] as OmniLight3D).visible = true; (L[0] as OmniLight3D).light_energy = 0.001
		(L[0] as OmniLight3D).position = Vector3(float(map.MAPW) * 0.5, gh(float(map.MAPW) * 0.5, float(map.MAPH) * 0.5) + 30.0, float(map.MAPH) * 0.5)
	part(false, Vector3(0, -9000, 0), Vector3.ZERO, 0.2, 1.0, 0.0, 0.01, C_SMOKE)
	part(true, Vector3(0, -9000, 0), Vector3.ZERO, 0.2, 1.0, 0.0, 0.01, C_FIRE)
	later.append([t + 0.25, func():
		for L in lights + mlights + wlights: (L[0] as OmniLight3D).visible = false; (L[0] as OmniLight3D).light_energy = 0.0])

# ------------------------------------------------------------------ ground
func gh(x: float, z: float) -> float:
	var fx := clampf(x / hR, 0.0, hw - 1.001); var fz := clampf(z / hR, 0.0, hh - 1.001)
	var i := int(fx); var j := int(fz); var u := fx - i; var v := fz - j
	var k := j * hw + i
	return lerpf(lerpf(H[k], H[k + 1], u), lerpf(H[k + hw], H[k + hw + 1], u), v)

func gnorm(x: float, z: float) -> Vector3:
	return Vector3(gh(x - 8, z) - gh(x + 8, z), 16.0, gh(x, z - 8) - gh(x, z + 8)).normalized()

func surf(x: float, z: float) -> String:
	var g := int(grid[clampi(int(z / CELL), 0, GH - 1) * GW + clampi(int(x / CELL), 0, GW - 1)])
	if g == 1 or g == 4: return "water"
	if road.size() > 0 and int(road[clampi(int(z / rC), 0, rh - 1) * rw + clampi(int(x / rC), 0, rw - 1)]) != 0: return "hard"
	return theme

func _seen(x: float, z: float, margin := 1.4) -> bool:
	# rough view test: within the ground the camera looks at (the browser skips effects outside the view)
	var c := cam_pos + cam_fwd * cam_dist
	return absf(x - c.x) < cam_dist * margin + 300.0 and absf(z - c.z) < cam_dist * margin + 300.0

# ------------------------------------------------------------------ particles
## one particle. vel = world velocity (y up). c2 = colour it turns into over the first 30% of its life.
## rise = steady climb; f = drag (speed left after 1 s). flags: GRAV (falls at 420), BOUNCE, KEEP.
func part(add: bool, p: Vector3, vel: Vector3, d: float, s: float, g: float, a: float, c: Color, c2 = null, rise := 0.0, f := 0.25, flags := 0) -> void:
	if not add and (flags & (GRAV | KEEP)) == 0:
		if c.r - c.b > 0.09:
			if randf() > 0.4: return
			s *= 0.72; d *= 0.5; a *= 0.6
		else:
			if randf() > 0.6: return
			s *= 0.8; d *= 0.65; a *= 0.75
	var buf := ba if add else bm
	var i: int
	if add: i = ha; ha = (ha + 1) % NA; da = true
	else: i = hm; hm = (hm + 1) % NM; dm = true
	var o := i * 20
	var fl := float((flags & 3) + (4 if c2 != null else 0) + 16 * (randi() & 127))
	buf[o] = vel.x; buf[o + 1] = t; buf[o + 2] = g; buf[o + 3] = p.x
	buf[o + 4] = vel.y; buf[o + 5] = d; buf[o + 6] = rise; buf[o + 7] = p.y
	buf[o + 8] = vel.z; buf[o + 9] = s; buf[o + 10] = -log(clampf(f, 0.001, 0.999)); buf[o + 11] = p.z
	buf[o + 12] = c.r; buf[o + 13] = c.g; buf[o + 14] = c.b; buf[o + 15] = a
	if c2 != null:
		var e: Color = c2
		buf[o + 16] = e.r; buf[o + 17] = e.g; buf[o + 18] = e.b
	buf[o + 19] = fl
	if add: ba = buf
	else: bm = buf

## a falling particle: floor = the ground height it lands on
func partg(add: bool, p: Vector3, vel: Vector3, d: float, s: float, a: float, c: Color, floor_y: float, bounce := false) -> void:
	part(add, p, vel, d, s, 0.0, a, c, null, floor_y + s * 0.5, 0.25, GRAV | (BOUNCE if bounce else 0))

func _ring(c: Vector3, r0: float, r1: float, life: float, col: Color, op: float, inner: float, mode: int, delay := 0.0) -> void:
	var o := hr * 16; hr = (hr + 1) % NR; dr = true
	br[o] = t + delay; br[o + 1] = r0; br[o + 2] = 0.0; br[o + 3] = c.x
	br[o + 4] = life; br[o + 5] = r1; br[o + 6] = 0.0; br[o + 7] = c.y + 1.5
	br[o + 8] = inner; br[o + 9] = float(mode); br[o + 10] = 0.0; br[o + 11] = c.z
	br[o + 12] = col.r; br[o + 13] = col.g; br[o + 14] = col.b; br[o + 15] = op

func ping(x: float, z: float, r: float, life: float, col: Color, delay := 0.0) -> void:
	_ring(Vector3(x, gh(x, z), z), r * 0.2, r, life, col, 1.0, 0.9, 1, delay)

func tracer(a: Vector3, b: Vector3, col: Color, life := 0.09, delay := 0.0) -> void:
	var o := ht * 16; ht = (ht + 1) % NT; dt_ = true
	bt[o] = b.x; bt[o + 1] = t + delay; bt[o + 2] = 0.0; bt[o + 3] = a.x
	bt[o + 4] = b.y; bt[o + 5] = life; bt[o + 6] = 0.0; bt[o + 7] = a.y
	bt[o + 8] = b.z; bt[o + 9] = float(env.night if env != null else 0); bt[o + 10] = 0.0; bt[o + 11] = a.z
	bt[o + 12] = col.r; bt[o + 13] = col.g; bt[o + 14] = col.b; bt[o + 15] = 1.0

func _decal(mm: MultiMesh, idx: int, x: float, z: float, size: float) -> void:
	var n := gnorm(x, z)
	var yaw := randf() * TAU
	var bx := Vector3(cos(yaw), 0, sin(yaw)); bx = (bx - n * bx.dot(n)).normalized()
	var bz := bx.cross(n).normalized()
	mm.set_instance_transform(idx, Transform3D(Basis(bx * size, n, bz * size), Vector3(x, gh(x, z) + 0.7, z)))
	mm.set_instance_color(idx, Color(1, 1, 1, 1))

func scorch(x: float, z: float, size: float) -> void:
	_decal(mm_scorch, n_scorch % N_SCORCH, x, z, size); n_scorch += 1
	mm_scorch.visible_instance_count = mini(n_scorch, N_SCORCH)

func crater(x: float, z: float, size: float) -> void:
	_decal(mm_crater, n_crater % N_CRATER, x, z, size); n_crater += 1
	mm_crater.visible_instance_count = mini(n_crater, N_CRATER)

func _flash_light(pool: Array, p: Vector3, energy: float, rng: float, life: float) -> void:
	var best = null; var be := 1e9
	for L in pool:
		if L[1] < be: be = L[1]; best = L
	if best == null or be > energy: return
	var l: OmniLight3D = best[0]
	l.position = p; l.omni_range = rng; l.light_energy = energy; l.visible = true
	best[1] = energy; best[2] = life

func _dir(v: float, vh: float) -> Vector3:
	var a := randf() * TAU
	return Vector3(cos(a) * v, vh, sin(a) * v)

func R(a: float, b: float) -> float: return randf_range(a, b)

# ------------------------------------------------------------------ explosions
## the browser's boomFX(x, y, s, big, h): s = blast size, h = height above the ground (>= 4 = air burst)
func boom(x: float, z: float, s: float, big: bool, h := 0.0) -> void:
	var gr := h < 4.0
	var sf := surf(x, z) if gr else "air"
	var wet := sf == "water"; var grd := gr and not wet
	var SC: Array = SOILC.get(sf, SOILC.desert)
	var g0 := gh(x, z)
	var g := g0 + (0.5 if wet else h)
	var P := Vector3(x, g, z)
	var kd := maxf(0.25, 1.0 - cam_pos.distance_to(P) / (cam_dist * 2.2 + 600.0))
	if env != null:
		if s > 14.0: env.shake = minf(18.0, env.shake + s / (5.0 if big else 13.0) * kd)
		if big: env.flash = minf(0.2, env.flash + 0.1)
	if s > 12.0: _flash_light(lights, P + Vector3(0, 20, 0), (7.0 if big else 3.2) * (env.fx_k if env != null else 1.0) * 1.6, 600.0 if big else 300.0, 0.8 if big else 0.35)
	if not _seen(x, z): return
	var n := mini(18, 4 + int(s / 5.0)); var wk := 0.45 if wet else 1.0
	if wet: _splash(x, z, g, s, big)
	if s <= 10.0 and not big:
		for i in 9: partg(true, P + Vector3(0, 2, 0), _dir(R(80, 200), R(60, 180)), R(.25, .6), R(1, 1.8), 1.0, C_SPARK, g0, true)
		part(true, P + Vector3(0, 2, 0), Vector3.ZERO, 0.06, s * 2.2, 0.0, 1.0, Color(3.2, 2.4, 1.4))
	part(true, P + Vector3(0, s * 0.3, 0), Vector3.ZERO, 0.07 if big else 0.05, s * 0.75 * wk, 0.0, 0.7, Color(3.4, 2.9, 2.1))
	for i in (9 if big else (2 if wet else 4)):
		part(true, P + Vector3(R(-s, s) * 0.3, R(0, s * 0.4), R(-s, s) * 0.3), _dir(R(0, s * 1.2), R(0, s)), R(.3, .6), s * R(.16, .3), s * 0.9, 1.0, Color(2.6, 1.2, .3), Color(.6, .16, .04), R(8, 20))
	for i in (3 if wet else mini(16, 5 + int(s / 4.0))):
		var hk := R(.8, 1.15)
		part(false, P + Vector3(R(-s, s) * 0.35, R(0, s * 0.5), R(-s, s) * 0.35), _dir(R(0, s * 1.5), R(4, s)), R(2, 3.4), s * R(.4, .7), s * 0.5, 0.62, Color(3.4 * hk, 1.5 * hk, .4 * hk), C_SMOKE if i % 2 else Color(.3, .29, .27), R(10, 24))
	for i in (n / 4 if wet else n / 2):
		part(true, P + Vector3(0, R(0, s * 0.3), 0), _dir(R(0, s * 2.0), R(0, s * 1.5)), R(.25, .5), s * R(.15, .34), 0.0, 1.0, C_FIRE if i % 2 else C_FIRE2)
	for i in (n / 2 if wet else n):
		part(false, P + Vector3(R(-s, s) * 0.4, R(0, s * 0.5), R(-s, s) * 0.4), _dir(R(0, s * 0.8), R(0, 10)), R(2.2, 3.8), s * R(.4, .7), s * 0.6, 0.5, Color(.74, .77, .8) if wet else (C_SMOKE if i % 3 else C_DARK), null, R(16, 34))
	if grd and s > 8.0:
		for i in mini(16, 5 + int(s / 2.0)):
			part(false, P, _dir(R(s * .5, s * 1.5), R(s * 3, s * 6)), R(.9, 1.5), s * R(.35, .6), 0.0, 0.75, SC[i % 2], null, g0, 0.25, GRAV)
		for i in mini(24, 8 + int(s / 2.0)):
			partg(false, P + Vector3(0, 2, 0), _dir(R(40, 140), R(90, 260)), R(1, 1.8), R(1.6, 3.2), 1.0, SC[2], g0, true)
	if gr:
		var dc: Color = Color(.62, .61, .58) if sf == "hard" else C_DUST
		if wet: dc = Color(.86, .9, .95)
		for i in mini(14, 6 + int(s / 4.0)):
			var a := randf() * TAU; var v := s * R(2, 3.5)
			part(false, P + Vector3(cos(a) * s * 0.3, 2, sin(a) * s * 0.3), Vector3(cos(a) * v, R(2, 10), sin(a) * v), R(1, 1.6), s * R(.35, .55), s * 0.5, 0.45, dc)
	for i in (n * 2 if sf == "hard" else (n / 4 if wet else n)):
		partg(true, P + Vector3(0, 2, 0), _dir(R(90, 260), R(60, 220)), R(.3, .7), 1.4, 1.0, C_SPARK, g0)
	if s > 10.0 and not wet:
		for i in mini(12, int(s / 3.0)): partg(false, P + Vector3(0, 3, 0), _dir(R(50, 160), R(100, 240)), R(1.2, 2.2), R(1.4, 2.8), 1.0, C_DARK, g0, true)
	if s >= 14.0 and not wet:
		for i in 5: part(true, P + Vector3(R(-s, s) * 0.3, R(s * 0.2, s * 0.7), R(-s, s) * 0.3), _dir(R(0, s * 0.6), R(0, s * 0.5)), R(.55, .95), s * R(.3, .5), s * 0.4, 1.0, Color(2.4, .9, .22), Color(.35, .1, .03), R(10, 25))
	if grd and s >= 14.0:
		var DC: Array = DUSTC.get(sf, DUSTC.desert)
		for i in randi_range(4, 8):
			part(false, P + Vector3(R(-s, s), R(2, s * 0.6), R(-s, s)), _dir(R(2, 14), R(1, 5)), R(6, 9), s * R(.9, 1.4), s * 0.25, 0.3 if sf == "snow" else 0.4, DC[i % 3], null, R(2, 6), 0.4, KEEP)
	if grd and s >= 18.0 and not big:
		for i in 8: partg(false, P + Vector3(0, 3, 0), _dir(R(40, 150), R(120, 300)), R(1.4, 2.4), R(2.2, 4.2), 1.0, Color(.35, .35, .33) if sf == "hard" else Color(.24, .23, .2), g0, true)
	if (grd and big) or (gr and not wet and s >= 20.0): _emit({k = "col", p = P, life = 16.0 if big else R(7, 10), big = big}, 12)
	if big and not wet:
		for i in 10: part(false, P + Vector3(0, s * 0.3, 0), _dir(R(s * 1.5, s * 3.5), R(s * 2, s * 4.5)), R(1.6, 2.6), s * R(.3, .5), s * 0.4, 0.8, C_DARK, null, g0, 0.25, GRAV)
		for i in 14: partg(false, P + Vector3(0, 4, 0), _dir(R(60, 220), R(140, 340)), R(1.4, 2.6), R(2, 4), 1.0, C_DARK, g0, true)
	if gr and not wet:
		scorch(x, z, s * 2.4)
		if s >= 16.0: crater(x, z, s * 1.5)
	if grd and s >= 14.0:
		_ring(Vector3(x, g0, z), s * 0.5, s * (6.5 if big else 4.2), 0.75 if big else 0.45, Color("#d8ccb4"), 0.6 if big else 0.42, 0.72, 0)
	if gr and not wet and (s >= 20.0 or big): _emit({k = "fire", p = Vector3(x, g0, z), life = 9.0 if big else R(4, 6.5), r = minf(30.0, s * 0.45), big = big}, 10)
	if grd and (big or s >= 28.0): _megaboom(x, z, g0, s if big else s * 1.45, big)

## src/05b-missiles.js megaBoom: the big ones (super weapons, demolition, ammunition going up)
func _megaboom(x: float, z: float, g0: float, S: float, big: bool) -> void:
	var P := Vector3(x, g0, z)
	if env != null:
		var kd := maxf(0.0, 1.0 - cam_pos.distance_to(P) / (cam_dist * 2.3 + 600.0))
		env.shake = minf(26.0, env.shake + S * 0.3 * kd); env.flash = minf(0.3, env.flash + 0.12)
	part(true, P + Vector3(0, S * 0.5, 0), Vector3.ZERO, 0.1, S * 3.6, 0.0, 1.0, Color(4, 3.4, 2.4))
	part(true, P + Vector3(0, S * 0.5, 0), Vector3.ZERO, 0.35, S * 2.0, S, 1.0, Color(3.2, 1.8, .6), Color(1.2, .35, .08))
	_ring(P, S * 0.6, S * 5.2, 0.8, Color("#ffe6bb"), 1.0, 0.9, 1)
	for i in 30:
		var a := i / 30.0 * TAU + R(-.1, .1); var v := S * R(3.6, 4.8)
		part(false, P + Vector3(cos(a) * S * 0.5, 3, sin(a) * S * 0.5), Vector3(cos(a) * v, R(4, 16), sin(a) * v), R(2.2, 3.4), S * R(.45, .7), S * 0.5, 0.55, C_DUST if i % 2 else Color(.74, .66, .52), null, 0.0, 0.25, KEEP)
	for i in 13: part(true, P + Vector3(R(-S, S) * 0.4, R(S * 0.2, S), R(-S, S) * 0.4), _dir(R(0, S), R(S * 0.5, S * 1.6)), R(.7, 1.3), S * R(.3, .55), S * 0.5, 1.0, Color(2.6, 1.1, .28), Color(.4, .1, .03), R(12, 30))
	for i in 9: part(false, P + Vector3(R(-S, S) * 0.4, R(S * 0.3, S), R(-S, S) * 0.4), _dir(R(0, S), R(S * 0.5, S * 1.4)), R(1.5, 2.6), S * R(.4, .65), S * 0.5, 0.8, C_DARK, null, R(14, 30), 0.25, KEEP)
	for i in 22: partg(true, P + Vector3(0, 4, 0), _dir(R(80, 300), R(160, 420)), R(.9, 1.8), R(1.6, 2.6), 1.0, Color(2.6, 1.4, .5), g0, true)
	for i in (8 if big else 5): partg(false, P + Vector3(0, 4, 0), _dir(R(60, 200), R(180, 380)), R(1.6, 2.8), R(3, 5.5), 1.0, Color(.24, .23, .2), g0, true)
	_emit({k = "mush", p = P, life = 3.4, S = S}, 4)
	scorch(x, z, S * 1.5 * 2.0); crater(x, z, S * 1.7)

func _splash(x: float, z: float, wl: float, s: float, big: bool) -> void:
	var W := Color(.86, .9, .95); var P := Vector3(x, wl, z)
	for i in mini(22, 8 + int(s / 2.0)): part(false, P, _dir(R(0, s * 0.6), R(s * 4, s * (11.0 if big else 8.0))), R(.8, 1.5), s * R(.22, .42), 0.0, 0.85, W, null, wl, 0.25, GRAV)
	for i in mini(16, 6 + int(s / 3.0)):
		var a := randf() * TAU; var v := s * R(1.5, 3)
		part(false, P, Vector3(cos(a) * v, R(s, s * 3), sin(a) * v), R(.6, 1.1), s * R(.2, .35), 0.0, 0.7, W, null, wl, 0.25, GRAV)
	for i in mini(18, 6 + int(s / 2.0)): partg(false, P, _dir(R(30, 120), R(80, 240)), R(.6, 1.2), R(1.2, 2.4), 0.9, W, wl)
	if s >= 12.0:
		for i in 5: part(false, P + Vector3(R(-s, s), R(4, s), R(-s, s)), _dir(R(2, 10), 2), R(3, 5), s * R(.6, 1), s * 0.2, 0.3, W, null, 3.0, 0.4, KEEP)
	if s >= 8.0:
		for i in 4: part(false, P + Vector3(R(-s, s) * 0.5, 0.6, R(-s, s) * 0.5), Vector3.ZERO, R(1.6, 2.6), s * R(.5, .8), s * 0.3, 0.5, Color(.1, .15, .19), null, 0.0, 0.25, KEEP)
		for i in 14:
			var a := i / 14.0 * TAU
			part(false, P + Vector3(cos(a) * s * 0.6, 0.8, sin(a) * s * 0.6), Vector3(cos(a) * s * 1.4, 0, sin(a) * s * 1.4), R(1.3, 2), s * R(.2, .32), s * 0.2, 0.6, W, null, 0.0, 0.25, KEEP)

# ------------------------------------------------------------------ events
## after every sim step: the step's events, and the entity buffer (dust behind vehicles, smoke from the damaged)
func step(ent: PackedFloat32Array, evs: Array) -> void:
	events(evs)
	if ent.size() >= ES: _ents(ent)
	prev_ent = ent

func events(evs: Array) -> void:
	for e in evs:
		match String(e[0]):
			"boom": boom(float(e[1]), float(e[2]), float(e[3]), e.size() > 4 and int(e[4]) != 0)
			"tr": _tr(e)
			"muz": _muz(float(e[1]), float(e[2]), float(e[3]), float(e[4]), float(e[5]))
			"pj": _pj(e)
			"die": _die(e)
			"salvo": _salvo(e)
			"icpt": _icpt(float(e[1]), float(e[2]), float(e[3]), float(e[4]))
			"emp":
				ping(float(e[1]), float(e[2]), float(e[3]), 1.0, Color("#66ccff")); ping(float(e[1]), float(e[2]), float(e[3]) * 0.6, 1.0, Color("#aadfff"), 0.22)
				var g := gh(float(e[1]), float(e[2]))
				for i in 90:
					var a := randf() * TAU; var rr := sqrt(randf()) * float(e[3])
					part(true, Vector3(float(e[1]) + cos(a) * rr, g + R(2, 30), float(e[2]) + sin(a) * rr), _dir(R(0, 30), R(0, 40)), R(.3, .9), R(2, 5), 0.0, 1.0, Color(.5, .8, 1))
			"smoke":
				ping(float(e[1]), float(e[2]), float(e[3]), 1.2, Color("#b9bdbb"))
				var g2 := gh(float(e[1]), float(e[2])); var rr2 := float(e[3])
				for i in 140:
					var a2 := randf() * TAU; var q := sqrt(randf()) * rr2
					part(false, Vector3(float(e[1]) + cos(a2) * q, g2 + R(6, 40), float(e[2]) + sin(a2) * q), _dir(R(0, 12), R(0, 4)), R(12, 20), R(30, 55), 2.0, 0.5, C_SMOKE, Color(.75, .75, .73), 1.0, 0.5, KEEP)
			"heal":
				ping(float(e[1]), float(e[2]), float(e[3]), 1.2, Color("#74d08f"))
				var g3 := gh(float(e[1]), float(e[2]))
				for i in 40:
					var a3 := randf() * TAU; var q3 := sqrt(randf()) * float(e[3])
					part(true, Vector3(float(e[1]) + cos(a3) * q3, g3 + R(2, 14), float(e[2]) + sin(a3) * q3), Vector3(0, 0, 0), R(.7, 1.3), R(2, 4), 0.0, 0.9, Color(.4, 1, .55), null, R(15, 40))
			"halo": ping(float(e[1]), float(e[2]), float(e[3]), 1.8, Color(String(e[4])) if e.size() > 4 and e[4] is String else Color("#f2c94c"))
			"ping": ping(float(e[1]), float(e[2]), 60.0, 1.6, Color("#7fb8e6"))
			"flare": _emit({k = "flare", p = Vector3(float(e[1]), gh(float(e[1]), float(e[2])), float(e[2])), r = float(e[3]), life = float(e[4]) if e.size() > 4 else 20.0}, 6)
			"strike": _strike(e)
			"bmis": _bmis(e)
			"plane":
				var px := float(e[3]); var pz := float(e[4])
				for i in 5: part(false, Vector3(px + R(-20, 20), gh(px, pz) + 150.0, pz + R(-20, 20)), _dir(R(0, 10), 0), R(2, 3.5), R(6, 10), 6.0, 0.6, Color(.9, .9, .88), null, 2.0, 0.4, KEEP)
			"civs": _civ(int(e[1]), false)
			"civd": _civ(int(e[1]), true)
			"dam":
				boom(float(e[1]), float(e[2]), 64.0, true)
			"hack":
				var g4 := gh(float(e[1]), float(e[2]))
				for i in 24: part(true, Vector3(float(e[1]) + R(-10, 10), g4 + R(4, 24), float(e[2]) + R(-10, 10)), _dir(R(0, 20), R(5, 30)), R(.4, 1), R(1.5, 3), 0.0, 1.0, Color(.3, 1, .5))
			"cyb":
				ping(float(e[1]), float(e[2]), float(e[3]) if e.size() > 3 else 80.0, 1.2, Color("#39ff88"))
				var g5 := gh(float(e[1]), float(e[2]))
				for i in 34: part(true, Vector3(float(e[1]) + R(-30, 30), g5 + R(4, 30), float(e[2]) + R(-30, 30)), _dir(R(0, 30), R(5, 40)), R(.4, 1), R(1.5, 3.5), 0.0, 1.0, Color(.22, 1, .53))
			"chf":
				var pc := Vector3(float(e[1]), gh(float(e[1]), float(e[2])) + (float(e[3]) if e.size() > 3 else 55.0), float(e[2]))
				for i in 7: part(true, pc, _dir(R(30, 90), R(-40, 10)), R(.8, 1.6), R(3, 5), 0.0, 1.0, Color(3, 2.6, 1.8), Color(1.2, .5, .15))
				for i in 5: part(false, pc, _dir(R(10, 40), R(-10, 10)), R(1.5, 2.5), R(4, 7), 6.0, 0.4, Color(.8, .8, .78), null, 0.0, 0.25, KEEP)

func _tr(e: Array) -> void:
	var x1 := float(e[1]); var z1 := float(e[2]); var x2 := float(e[4]); var z2 := float(e[5])
	var flak := e.size() > 7 and int(e[7]) != 0
	var a := Vector3(x1, gh(x1, z1) + float(e[3]), z1); var b := Vector3(x2, gh(x2, z2) + float(e[6]), z2)
	if not _seen(x1, z1) and not _seen(x2, z2): return
	tracer(a, b, Color(3, 1.5, .5) if flak else Color(3, 1.9, .7))
	if randf() < 0.35: _flash_light(mlights, a, (1.6 if flak else 1.1) * 1.4, 90.0, 0.06)
	if flak:
		part(true, b, Vector3.ZERO, 0.12, 7.0, 0.0, 1.0, C_FIRE)
		part(false, b, _dir(R(0, 8), R(0, 6)), 0.8, 5.0, 7.0, 0.5, Color(.3, .29, .27), Color(.5, .48, .45), 0.0, 0.25, KEEP)
	elif float(e[6]) < 10.0:
		var q := randf()
		if q < 0.12:
			part(true, b, Vector3.ZERO, 0.045, 2.4, 0.0, 1.0, C_RICO)
			for i in randi_range(3, 5): partg(true, b, _dir(R(60, 150), R(15, 80)), R(.1, .26), R(.7, 1.2), 1.0, C_SPARK, b.y - float(e[6]))
		elif q < 0.52:
			part(false, b, _dir(R(0, 10), R(4, 14)), 0.4, 3.0, 6.0, 0.6, DUSTC.get(surf(x2, z2), DUSTC.desert)[0], null, 0.0, 0.25, KEEP)
		if env != null and env.night == 2 and randf() < 0.5: part(true, b, Vector3.ZERO, 0.1, 3.2, 0.0, 0.8, C_SPARK)

func _muz(x: float, z: float, h: float, ang: float, s: float) -> void:
	if not _seen(x, z): return
	var g := gh(x, z); var ca := cos(ang); var sa := sin(ang)
	var P := Vector3(x, g + h, z); var F := Vector3(ca, 0, sa)
	if s >= 13.0:
		for i in 10:
			var b := ang + R(-1.3, 1.3); var v := R(30, 90)
			part(false, P + F * 4.0 + Vector3(0, R(-1, 2), 0), Vector3(cos(b) * v + ca * 40.0, R(4, 18), sin(b) * v + sa * 40.0), R(1.8, 2.8), R(8, 13), 16.0, 0.62, C_SMOKE if i % 3 else Color(.62, .6, .56), Color(.55, .53, .5), R(6, 14))
		for i in 12:
			var b2 := randf() * TAU; var v2 := R(40, 80)
			part(false, Vector3(x + cos(b2) * 6.0, g + 1.5, z + sin(b2) * 6.0), Vector3(cos(b2) * v2, R(2, 8), sin(b2) * v2), R(.8, 1.3), R(5, 8), 10.0, 0.35, DUSTC.get(surf(x, z), DUSTC.desert)[i % 3])
		part(true, P + F * 8.0, Vector3.ZERO, 0.08, s * 1.9, 0.0, 1.0, Color(3.2, 1.8, .6))
		part(true, P, Vector3.ZERO, 0.06, s * 1.5, 0.0, 1.0, Color(3.2, 2.4, 1.2))
		part(true, P + F * s * 0.8, Vector3.ZERO, 0.05, s * 1.15, 0.0, 1.0, Color(2.8, 1.5, .5))
		for sd in [-1.0, 1.0]: part(true, P + Vector3(-sa, 0, ca) * sd * s * 0.45, Vector3.ZERO, 0.045, s * 0.6, 0.0, 1.0, Color(2.8, 1.5, .5))
	else:
		var L := s * R(.55, .85)
		part(true, P, Vector3.ZERO, 0.045, s * 1.15, 0.0, 1.0, Color(3, 2.3, 1.2))
		part(true, P + F * L, Vector3.ZERO, 0.04, s * 0.8, 0.0, 1.0, Color(2.8, 1.5, .5))
		part(true, P + F * L * 1.9, Vector3.ZERO, 0.035, s * 0.5, 0.0, 1.0, Color(2.2, 1, .3))
		if s <= 6.0 and randf() < 0.5: part(false, P + F * 3.0, F * R(4, 12) + Vector3(0, R(3, 8), 0), R(.35, .6), R(2, 3), 7.0, 0.32, Color(.6, .59, .56), null, 0.0, 0.25, KEEP)
	if s > 9.0:
		_flash_light(mlights, P, (3.0 if s >= 13.0 else 2.2) * 1.4, 200.0 if s >= 13.0 else 150.0, 0.06)
		for i in 3: part(false, P + F * 5.0, F * R(10, 30) + Vector3(0, R(4, 10), 0), R(.5, .9), R(4, 7), 12.0, 0.5, C_SMOKE)

func _wname(w) -> String:
	if w is String: return w
	var i := int(w)
	return String(weapons[i]) if i >= 0 and i < weapons.size() else "shell"

func _pj(e: Array) -> void:
	var a := Vector3(float(e[1]), 0, float(e[2])); a.y = gh(a.x, a.z) + float(e[3])
	var b := Vector3(float(e[4]), 0, float(e[5])); b.y = gh(b.x, b.z) + float(e[6])
	proj.append({a = a, b = b, spd = float(e[7]), w = _wname(e[8]) if e.size() > 8 else "shell", rk = e.size() > 9 and int(e[9]) != 0, len = maxf(1.0, Vector2(b.x - a.x, b.z - a.z).length()), p = 0.0, last = a, end = 0.0})

func _salvo(e: Array) -> void:
	var x := float(e[1]); var z := float(e[2]); var tx := float(e[4]); var tz := float(e[5]); var ang := float(e[6]) if e.size() > 6 else atan2(tz - z, tx - x)
	var h := gh(x, z) + float(e[3])
	var side := Vector3(-sin(ang), 0, cos(ang)); var fwd := Vector3(cos(ang), 0, sin(ang))
	for i in 3:
		var a := Vector3(x, h, z) + side * (i - 1) * 5.0
		var b := Vector3(tx + R(-18, 18), 0, tz + R(-18, 18)); b.y = gh(b.x, b.z)
		proj.append({a = a, b = b, spd = 520.0, w = "missile", rk = true, len = maxf(1.0, a.distance_to(b)), p = -55.0 * i, last = a, end = 9.0})
	for i in 6:
		var b2 := Vector3(tx, 0, tz) + fwd * (i - 2.5) * 16.0; b2.y = gh(b2.x, b2.z)
		tracer(Vector3(x, h, z), b2, Color(3, 1.9, .7), 0.09, i * 0.055)
		later.append([t + i * 0.055 + 0.07, func():
			part(false, b2, _dir(R(0, 10), R(4, 12)), 0.5, R(3, 5), 6.0, 0.6, C_DUST, null, 0.0, 0.25, KEEP)
			part(true, b2, Vector3.ZERO, 0.08, 2.2, 0.0, 1.0, C_SPARK)])

func _icpt(sx: float, sz: float, tx: float, tz: float) -> void:
	var a := Vector3(sx, gh(sx, sz) + 12.0, sz); var b := Vector3(tx, gh(tx, tz) + 210.0, tz)
	for i in 7: tracer(a, a.lerp(b, (i + 1) / 7.0), Color(2.6, 2.2, 1.4), 0.35, i * 0.07)
	later.append([t + 0.5, func(): boom(tx, tz, 30.0, true, 210.0)])

func _strike(e: Array) -> void:
	var x := float(e[1]); var z := float(e[2]); var dur := maxf(0.3, float(e[3])); var r := float(e[4])
	var c := Vector3(x, gh(x, z), z)
	_ring(c, r, r, dur, Color("#ea3a2c"), 0.8, 0.94, 1)
	_ring(c, r, r * 0.12, dur, Color("#ff6a3a"), 0.9, 0.9, 1)

func _bmis(e: Array) -> void:
	var a := Vector3(float(e[1]), 0, float(e[2])); a.y = gh(a.x, a.z) + 8.0
	var b := Vector3(float(e[3]), 0, float(e[4])); b.y = gh(b.x, b.z)
	var T := clampf(float(e[5]) if e.size() > 5 else 2.0, 1.2, 3.0)
	_emit({k = "bmis", p = a, a = a, b = b, life = T, peak = clampf(a.distance_to(b) * 0.4, 380.0, 1100.0), last = a}, 12)
	part(true, a, Vector3.ZERO, 0.14, 30.0, 0.0, 1.0, Color(3.4, 2.6, 1.6))
	for i in 22: part(false, a, _dir(R(20, 90), R(2, 12)), R(5.5, 9), R(14, 24), 8.0, 0.6, Color(.86, .85, .82), null, 2.0, 0.25, KEEP)
	for i in 8: partg(true, a, _dir(R(60, 160), R(60, 200)), R(.4, .8), 1.4, 1.0, C_SPARK, a.y - 8.0)
	_flash_light(lights, a + Vector3(0, 20, 0), 3.4 * 1.6, 320.0, 0.5)

func _civ(i: int, dead: bool) -> void:
	var civ: Array = map.get("civ", [])
	var c = null
	for q in civ:
		if int(q.i) == i: c = q; break
	if c == null: return
	var x := float(c.x); var z := float(c.y); var g := gh(x, z)
	if dead:
		boom(x, z, 26.0, true); scorch(x, z, 30.0 * 2.0)
	for n in (40 if dead else 26):
		part(false, Vector3(x + R(-24, 24), g + R(2, 30), z + R(-24, 24)), _dir(R(10, 60), R(2, 14)), R(3.4, 6), R(20, 44), 8.0, 0.55, Color(.62, .58, .5), null, 2.0, 0.3, KEEP)
	for n in (12 if dead else 6): partg(false, Vector3(x, g + 14.0, z), _dir(R(40, 150), R(100, 260)), R(1.4, 2.4), R(2.5, 5), 1.0, Color(.81, .78, .7), g, true)

func _kind_class(k: int) -> String:
	var nm := String(kinds[k]) if k >= 0 and k < kinds.size() else ""
	if nm in INF_KINDS: return "inf"
	if nm in AIR_KINDS: return "drone" if nm == "drone" else "air"
	if nm in NAVAL_KINDS: return "naval"
	return "veh"

func _prev(id: int) -> int:
	var i := 0; var n := prev_ent.size()
	while i < n:
		if int(prev_ent[i]) == id: return i
		i += ES
	return -1

func _die(e: Array) -> void:
	var id := int(e[1]); var x := float(e[2]); var z := float(e[3]); var k := int(e[4]); var is_b := int(e[5]) != 0
	var g := gh(x, z)
	var pi := _prev(id)
	var size := float(prev_ent[pi + 15]) if pi >= 0 else (60.0 if is_b else 12.0)
	var alt := maxf(0.0, float(prev_ent[pi + 5]) - g) if pi >= 0 else 55.0
	if is_b:
		boom(x, z, 40.0, true, 10.0)
		for i in 5:
			var ox := R(-35, 35); var oz := R(-35, 35); var oh := R(0, 20)
			later.append([t + 0.18 * (i + 1), func(): boom(x + ox, z + oz, 18.0, false, oh)])
		for i in 10: partg(false, Vector3(x, g + 12.0, z), _dir(R(50, 180), R(120, 300)), R(1.4, 2.6), R(2.5, 5), 1.0, Color(.54, .52, .47), g, true)
		if size >= 24.0:
			_emit({k = "collapse", p = Vector3(x, g, z), life = 1.6, r = size * 0.5}, 8)
			later.append([t + 0.9, func(): rubble(x, z, size)])
			if on_collapse.is_valid(): on_collapse.call(id, x, z, size)
		else: rubble(x, z, size)
		return
	var cls := _kind_class(k)
	if cls == "inf":
		if _seen(x, z):
			for i in 6: part(false, Vector3(x + R(-4, 4), g + R(1, 5), z + R(-4, 4)), _dir(R(4, 22), R(2, 10)), R(.5, .9), R(4, 7), 6.0, 0.5, DUSTC.get(surf(x, z), DUSTC.desert)[i % 3], null, 0.0, 0.25, KEEP)
	elif cls == "drone": boom(x, z, 16.0, false, maxf(alt, 20.0))
	elif cls == "air": boom(x, z, 18.0, false, maxf(alt, 30.0))
	else:
		boom(x, z, size * 1.5, false)
		var big := size >= 14.0
		for i in 14: part(true, Vector3(x + R(-6, 6), g + R(4, 14), z + R(-6, 6)), _dir(R(0, 30), R(10, 50)), R(.4, .9), R(4, 8), 6.0, 1.0, Color(2.6, 1.1, .28), Color(.4, .1, .03), R(10, 24))
		if cls == "veh":
			_emit({k = "wreck", p = Vector3(x, g, z), life = 40.0 if big else 32.0, big = big}, 30)
			if on_wreck.is_valid(): on_wreck.call(id, x, z, String(kinds[k]) if k < kinds.size() else "")

# ------------------------------------------------------------------ rubble
func _rubble_pool() -> void:
	# one heap for a 40-wide building: a mound of broken blocks and slabs, vertex-coloured, instanced per ruin
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new(); rng.seed = 41
	var bx := BoxMesh.new()
	var arr := bx.get_mesh_arrays()
	var vs: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]; var ns: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]; var ix: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
	for i in 54:
		var slab := i >= 46 and i < 49; var rod := i >= 49
		var a := rng.randf() * TAU; var rr := sqrt(rng.randf()) * 20.0
		var sz := Vector3(rng.randf_range(2.5, 10), rng.randf_range(2.5, 8), rng.randf_range(2.5, 10))
		if slab: sz = Vector3(rng.randf_range(12, 18), 2.0, rng.randf_range(8, 13))
		if rod: sz = Vector3(0.5, rng.randf_range(8, 16), 0.5)
		if i == 0: sz = Vector3(30, 7, 26); rr = 0.0
		var hgt := maxf(0.0, (1.0 - rr / 22.0)) * 7.0 + sz.y * 0.3
		var bs := Basis.from_euler(Vector3(rng.randf_range(-.5, .5), rng.randf() * TAU, rng.randf_range(-.5, .5))).scaled(sz)
		var tr := Transform3D(bs, Vector3(cos(a) * rr, hgt, sin(a) * rr))
		var sh := rng.randf_range(.75, 1.1)
		var col := Color(.56 * sh, .53 * sh, .47 * sh) if not rod else Color(.25, .2, .17)
		if i % 5 == 0 and not rod: col = Color(.3 * sh, .28 * sh, .26 * sh)
		for q in ix:
			st.set_color(col); st.set_normal((tr.basis * ns[q]).normalized()); st.add_vertex(tr * vs[q])
	var mesh := st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.95
	mesh.surface_set_material(0, mat)
	mm_rubble = MultiMesh.new()
	mm_rubble.transform_format = MultiMesh.TRANSFORM_3D
	mm_rubble.mesh = mesh
	mm_rubble.instance_count = N_RUBBLE
	mm_rubble.visible_instance_count = 0
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm_rubble
	mi.custom_aabb = AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
	add_child(mi)

func rubble(x: float, z: float, size: float) -> void:
	var sc := maxf(0.35, size / 40.0)
	mm_rubble.set_instance_transform(n_rubble % N_RUBBLE, Transform3D(Basis(Vector3.UP, randf() * TAU).scaled(Vector3(sc, sc, sc)), Vector3(x, gh(x, z) - 1.0, z)))
	n_rubble += 1
	mm_rubble.visible_instance_count = mini(n_rubble, N_RUBBLE)
	scorch(x, z, size * 0.7 * 2.0)
	_emit({k = "wreck", p = Vector3(x, gh(x, z), z), life = 40.0, big = true, burn = 30.0}, 30)

# ------------------------------------------------------------------ things that keep going
func _emit(d: Dictionary, cap: int) -> void:
	var n := 0; var oldest := -1
	for i in emit.size():
		if emit[i].k == d.k:
			n += 1
			if oldest < 0: oldest = i
	if n >= cap and oldest >= 0: emit.remove_at(oldest)
	d.t = 0.0; d.acc = 0.0
	emit.append(d)

func _emit_tick(dt: float) -> void:
	var i := emit.size() - 1
	var wl := 0
	for L in wlights: L[1] = 0.0
	while i >= 0:
		var e: Dictionary = emit[i]
		e.t += dt
		var lf: float = 1.0 - e.t / e.life
		if lf <= 0.0:
			emit.remove_at(i); i -= 1; continue
		var P: Vector3 = e.p
		var vis := _seen(P.x, P.z)
		match String(e.k):
			"col":
				e.acc += dt * (9.0 if e.big else 5.0) * (0.35 + 0.65 * lf)
				while e.acc >= 1.0:
					e.acc -= 1.0
					if vis: part(false, P + Vector3(R(-6, 6), R(4, 12), R(-6, 6)), _dir(R(0, 8), R(4, 10)), R(5, 7.5), R(12, 18), R(12, 18), 0.5 * lf + 0.15, C_DARK, C_SMOKE, R(28, 42), 0.4, KEEP)
			"fire":
				e.acc += dt * (16.0 if e.big else 9.0) * (0.4 + 0.6 * lf)
				while e.acc >= 1.0:
					e.acc -= 1.0
					if not vis: continue
					var a := randf() * TAU; var q: float = sqrt(randf()) * float(e.r)
					var fp := Vector3(P.x + cos(a) * q, 0, P.z + sin(a) * q); fp.y = gh(fp.x, fp.z) + 2.0
					if randf() < 0.75: part(true, fp, Vector3(R(-4, 4), R(8, 22), R(-4, 4)), R(.35, .7), R(5, 9), -4.0, 1.0, Color(2.6, 1.2, .3), Color(.8, .2, .05), R(14, 30))
					else: part(false, fp + Vector3(0, 6, 0), Vector3(R(-4, 4), R(6, 14), R(-4, 4)), R(2, 4.5), R(8, 13), 8.0, 0.45, C_DARK, C_SMOKE, R(20, 34), 0.4, KEEP)
			"wreck":
				var big: bool = e.big
				var burn: float = float(e.get("burn", 30.0 if big else 24.0))
				var fade := clampf(lf * 2.0, 0.0, 1.0)
				e.acc += dt
				if vis:
					if randf() < dt * (7.0 if big else 4.5): part(false, P + Vector3(R(-4, 4), R(6, 12), R(-4, 4)), Vector3(R(-3, 3), 4, R(-3, 3)), R(5, 7), R(7, 11), R(9, 12), 0.4 * fade + 0.08, C_DARK, Color(.44, .42, .39), R(34, 48), 0.4, KEEP)
					if e.t < burn:
						for n in int(dt * (14.0 if big else 10.0) + randf()): part(true, P + Vector3(R(-7, 7), R(2, 9), R(-7, 7)), Vector3(R(-3, 3), R(8, 20), R(-3, 3)), R(.35, .7), R(4, 8), -3.0, 1.0, Color(2.6, 1.2, .3), Color(.8, .2, .05), R(12, 26))
						if randf() < dt * 2.0: partg(true, P + Vector3(0, 6, 0), _dir(R(20, 70), R(60, 160)), R(.4, .9), 1.0, 1.0, C_SPARK, P.y)
						if randf() < dt * 3.0: part(true, P + Vector3(0, 3, 0), Vector3.ZERO, 0.5, 30.0 if big else 20.0, 0.0, 0.5 if (env != null and env.night == 2) else 0.16, Color(1.5, .55, .14))
				if e.t < burn and wl < wlights.size() and cam_pos.distance_to(P) < cam_dist * 2.5:
					var L: Array = wlights[wl]; wl += 1
					(L[0] as OmniLight3D).position = P + Vector3(0, 14, 0)
					L[1] = (3.2 if big else 2.2) * R(.75, 1.1) * minf(1.0, (burn - e.t) * 0.5)
			"collapse":
				for n in int(dt * 34.0 + randf()):
					if vis: part(false, P + Vector3(R(-1, 1) * e.r, R(2, 24), R(-1, 1) * e.r), _dir(R(10, 50), R(2, 12)), R(1.1, 1.9), R(8, 15), 9.0, 0.6, Color(.62, .58, .5), null, 2.0, 0.3, KEEP)
			"mush":
				var S: float = e.S
				for n in int(dt * 17.0 + randf()):
					var hgt: float = S * 5.3 * (e.t / e.life)
					part(false, P + Vector3(R(-S, S) * 0.25, hgt * R(.2, 1), R(-S, S) * 0.25), _dir(R(0, S * 0.3), R(4, 12)), R(8, 11), S * R(.5, .8), S * 0.12, 0.55, C_DARK, C_SMOKE, R(10, 18), 0.4, KEEP)
				if not e.has("cap") and e.t > e.life * 0.8:
					e.cap = true
					for n in 23: part(false, P + Vector3(R(-S, S) * 0.9, S * 5.3 + R(-S, S) * 0.3, R(-S, S) * 0.9), _dir(R(S * 0.2, S * 0.8), R(-2, 6)), R(11, 16), S * R(.8, 1.3), S * 0.1, 0.6, C_DARK if n % 3 else Color(.3, .2, .14), C_SMOKE, R(2, 6), 0.4, KEEP)
			"flare":
				var hgt2 := maxf(90.0, 210.0 - e.t * 4.0)
				var fd := minf(1.0, e.t / 1.2) * minf(1.0, (e.life - e.t) / 5.0)
				e.acc += dt
				if e.acc >= 0.1:
					e.acc = 0.0
					part(true, P + Vector3(0, hgt2, 0), Vector3.ZERO, 0.22, 46.0 * fd + 8.0, 0.0, 0.9, Color(1, .95, .8))
				_flash_light(lights, P + Vector3(0, hgt2, 0), 6.0 * fd, minf(900.0, 2.2 * float(e.r)), 0.3)
			"bmis":
				var u := clampf(e.t / e.life, 0.0, 1.0)
				var A: Vector3 = e.a; var B: Vector3 = e.b
				var pos := A.lerp(B, u) + Vector3(0, sin(u * PI) * float(e.peak), 0)
				var last: Vector3 = e.last
				var dd := last.distance_to(pos)
				var steps := int(dd / 13.0)
				for n in steps:
					var q2 := last.lerp(pos, (n + 1.0) / steps)
					part(false, q2, _dir(R(0, 6), R(-2, 4)), R(5.5, 8.5), R(5, 8), 5.0, 0.6, Color(.9, .9, .88), null, 1.0, 0.4, KEEP)
					part(true, q2, Vector3.ZERO, 0.16, R(8, 11), 0.0, 1.0, Color(3, 1.6, .5))
				if steps > 0: e.last = pos
				part(true, pos, Vector3.ZERO, 0.05, 7.0 if u < 0.7 else 12.0, 0.0, 1.0, Color(3.2, 2.8, 1.8))
		i -= 1
	for L in wlights:
		var l: OmniLight3D = L[0]
		l.light_energy = L[1]; l.visible = L[1] > 0.01

func _proj_tick(dt: float) -> void:
	var i := proj.size() - 1
	while i >= 0:
		var p: Dictionary = proj[i]
		p.p += p.spd * dt
		if p.p < 0.0:
			i -= 1; continue
		var k: float = minf(1.0, p.p / p.len)
		var A: Vector3 = p.a; var B: Vector3 = p.b
		var pos := A.lerp(B, k)
		var w: String = p.w
		if w == "shell": pos.y += sin(k * PI) * p.len * 0.22
		if _seen(pos.x, pos.z):
			if w == "at" or w == "missile" or p.rk:
				if randf() < 0.5: part(true, pos, Vector3.ZERO, 0.04, 2.6, 0.0, 0.7, C_FIRE)
				for n in 2: part(false, (p.last as Vector3).lerp(pos, randf()), _dir(R(0, 5), R(0, 4)), R(1.6, 2.6), R(3, 5), 9.0, 0.55, Color(.88, .87, .84), null, 1.0, 0.3, KEEP)
			elif w == "shell":
				part(true, pos, Vector3.ZERO, 0.04, 3.0, 0.0, 1.0, C_FIRE)
				if randf() < 0.6: part(false, pos, Vector3.ZERO, R(.8, 1.3), R(1.6, 2.4), 3.5, 0.32, Color(.7, .68, .65), null, 0.0, 0.25, KEEP)
			elif w == "torp":
				if randf() < 0.7: part(false, Vector3(pos.x, gh(pos.x, pos.z) + 1.5, pos.z), Vector3.ZERO, R(.9, 1.5), R(3, 5), 2.0, 0.6, Color(.92, .96, 1), null, 0.0, 0.25, KEEP)
			elif w == "bomb": part(false, pos, Vector3.ZERO, 0.04, 3.0, 0.0, 1.0, C_DARK, null, 0.0, 0.25, KEEP)
			else:
				part(true, pos, Vector3.ZERO, 0.04, 2.6, 0.0, 1.0, C_FIRE2)
				tracer(p.last, pos, Color(1.6, 1.2, .7), 0.07)
		p.last = pos
		if k >= 1.0:
			if p.end > 0.0: boom(B.x, B.z, p.end, false)
			proj.remove_at(i)
		i -= 1

## dust behind moving vehicles, smoke and fire from damaged units and buildings (a slice of the army per step)
func _ents(ent: PackedFloat32Array) -> void:
	var n := ent.size() / ES
	if n == 0: return
	var todo := mini(n, 120)
	var dust := 0
	var amp: float = {"desert": 1.0, "green": 0.6, "snow": 0.45}.get(theme, 1.0)
	if env != null and env.weather == "sandstorm": amp *= 1.7
	var raining: bool = env != null and (env.weather == "rain" or env.weather == "storm")
	var share := float(n) / float(todo)       # each unit is looked at every `share` steps of 1/30 s
	var bit := 1 << me
	for q in todo:
		ent_i = (ent_i + 1) % n
		var o := ent_i * ES
		if (int(ent[o + 14]) & bit) == 0: continue
		var x := ent[o + 3]; var z := ent[o + 4]
		if not _seen(x, z, 1.1): continue
		var fl := int(ent[o + 9]); var hp := ent[o + 8]
		var y := ent[o + 5]
		if (fl & 1) != 0:
			if hp < 0.4 and (fl & 2) != 0:
				var pts := 1 if hp >= 0.3 else (2 if hp >= 0.2 else 3)
				var sz := ent[o + 15]
				for pi in pts:
					var fp := Vector3(x + sin(ent_i * 1.7 + pi * 2.1) * sz * 0.3, y + sz * 0.35, z + cos(ent_i * 2.3 + pi * 1.3) * sz * 0.3)
					for k in int(share / 30.0 * 16.0 + randf()): part(true, fp + Vector3(R(-5, 5), R(0, 6), R(-5, 5)), Vector3(R(-3, 3), R(8, 20), R(-3, 3)), R(.35, .7), R(7, 13), -4.0, 1.0, Color(2.6, 1.2, .3), Color(.8, .2, .05), R(14, 28))
					for k in int(share / 30.0 * 5.0 + randf()): part(false, fp + Vector3(0, 8, 0), Vector3(R(-4, 4), 6, R(-4, 4)), R(2.8, 3.8), R(7, 11), 9.0, 0.5, C_DARK, C_SMOKE, R(26, 40), 0.4, KEEP)
			continue
		var cls := _kind_class(int(ent[o + 1]))
		if cls == "inf": continue
		if hp < 0.75:
			var rate := 7.0 if hp < 0.25 else (2.6 if hp < 0.5 else 0.8)
			if cls == "air" or cls == "drone": rate = 24.0 if hp < 0.25 else (13.0 if hp < 0.5 else 4.0)
			for k in int(share / 30.0 * rate + randf()):
				part(false, Vector3(x + R(-3, 3), y + R(6, 10), z + R(-3, 3)), Vector3(R(-3, 3), 4, R(-3, 3)), R(1.4, 2.6), R(3, 5) if hp < 0.5 else R(1.8, 2.8), 6.0, 0.5, C_DARK if hp < 0.5 else C_SMOKE, C_SMOKE, R(16, 28), 0.4, KEEP)
				if hp < 0.25 and randf() < 0.55: part(true, Vector3(x + R(-3, 3), y + R(5, 9), z + R(-3, 3)), Vector3(0, R(6, 14), 0), R(.3, .6), R(3, 5), -2.0, 1.0, Color(2.6, 1.2, .3), Color(.8, .2, .05), R(10, 20))
		if cls == "veh" and not raining and dust < 28:
			var spd := ent[o + 13]
			if spd >= 0.3 and surf(x, z) != "water":
				var k2 := clampf((spd - 0.3) / 0.45, 0.0, 1.0)
				var ang := ent[o + 6]
				var DC: Array = DUSTC.get(surf(x, z), DUSTC.desert)
				for k in int(share / 30.0 * 16.0 * amp * k2 + randf()):
					dust += 1
					part(false, Vector3(x - cos(ang) * 10.0 + R(-5, 5), y + R(1, 4), z - sin(ang) * 10.0 + R(-5, 5)), Vector3(R(-6, 6), R(2, 7), R(-6, 6)), R(2.2, 3.4), R(7, 10), R(9, 14), 0.26 if theme == "snow" else 0.46, DC[k % 3], null, R(1, 4), 0.4, KEEP)

# ------------------------------------------------------------------ per frame
func tick(dt: float, cam: Camera3D) -> void:
	t += dt
	if cam != null:
		cam_pos = cam.global_position; cam_fwd = -cam.global_transform.basis.z
		cam_dist = cam_pos.y / maxf(0.2, -cam_fwd.y)
		var vh := float(get_viewport().get_visible_rect().size.y)
		var pk := 2.0 * tan(deg_to_rad(cam.fov) * 0.5) / maxf(1.0, vh)
		for m in mats: (m as ShaderMaterial).set_shader_parameter("px_k", pk)
	var li := later.size() - 1
	while li >= 0:
		if later[li][0] <= t:
			var f: Callable = later[li][1]
			later.remove_at(li)
			f.call()
		li -= 1
	_proj_tick(dt)
	_emit_tick(dt)
	for pool in [lights, mlights]:
		for L in pool:
			if L[1] <= 0.0: continue
			L[1] *= maxf(0.0, 1.0 - dt / L[2] * 2.2)
			var l: OmniLight3D = L[0]
			if L[1] < 0.05: L[1] = 0.0; l.visible = false
			l.light_energy = L[1]
	if dm: mm_m.buffer = bm; dm = false
	if da: mm_a.buffer = ba; da = false
	if dt_: mm_t.buffer = bt; dt_ = false
	if dr: mm_r.buffer = br; dr = false
	var amb: Vector3 = env.fx_amb if env != null else Vector3.ONE
	for m in mats:
		(m as ShaderMaterial).set_shader_parameter("fx_time", t)
	(mats[0] as ShaderMaterial).set_shader_parameter("amb", amb)
	(mats[4] as ShaderMaterial).set_shader_parameter("light", amb); (mats[5] as ShaderMaterial).set_shader_parameter("light", amb)

# ------------------------------------------------------------------ fog of war
func _fow_setup() -> void:
	fow_img = Image.create(GW, GH, false, Image.FORMAT_R8)
	fow_img.fill(Color(1, 0, 0))
	fow_tex = ImageTexture.create_from_image(fow_img)
	fow = MeshInstance3D.new()
	var q := QuadMesh.new(); q.size = Vector2(1, 1)
	fow.mesh = q
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/fx_fow.gdshader")
	m.render_priority = -20
	m.set_shader_parameter("fog_tex", fow_tex)
	m.set_shader_parameter("map_size", Vector2(float(map.MAPW), float(map.MAPH)))
	m.set_shader_parameter("texel", Vector2(0.6 / GW, 0.6 / GH))
	fow.material_override = m
	fow.custom_aabb = AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
	fow.extra_cull_margin = 16384.0
	fow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	fow.visible = false
	add_child(fow)

## the bridge's fog grid for my team (GW x GH bytes: 0 never seen, 1 seen before, 2 visible now); a few times a second
func set_fog(bytes: PackedByteArray) -> void:
	if bytes.size() != GW * GH: return
	if t < fow_next and fow.visible: return
	fow_next = t + 0.2
	var px := PackedByteArray(); px.resize(GW * GH)
	for i in bytes.size(): px[i] = 255 if bytes[i] == 2 else (128 if bytes[i] == 1 else 0)
	fow_img.set_data(GW, GH, false, Image.FORMAT_R8, px)
	fow_tex.update(fow_img)
	fow.visible = true

func fog_off() -> void: fow.visible = false

# ------------------------------------------------------------------ supply lines on the ground (key L)
## lines = sim.lines(); my = my team slot; allies = slots on my side. Green mine, red enemy, gray no one's; cut = dashed.
func set_lines(lines: Dictionary, my: int, allies: Array = []) -> void:
	me = my
	if lines_mi == null:
		lines_mi = MeshInstance3D.new()
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/fx_lines.gdshader")
		m.render_priority = 3
		lines_mi.material_override = m
		lines_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		lines_mi.visible = false
		add_child(lines_mi)
	var roads: Array = lines.get("roads", [])
	if roads.is_empty(): lines_mi.mesh = null; return
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var gray := Color(0.62, 0.62, 0.6, 0.55); var green := Color(0.3, 0.85, 0.42, 1.0); var red := Color(0.92, 0.26, 0.2, 1.0)
	var claimed := {}
	var cov: Array = lines.get("cov", [])
	for tm in cov.size():
		var C = cov[tm]
		if C == null: continue
		var col := green if (tm == my or tm in allies) else red
		for ek in C:
			var ei := int(ek)
			if ei < 0 or ei >= roads.size(): continue
			claimed[ei] = true
			for sg in C[ek].get("v", []): _ribbon(st, roads[ei], float(sg[0]), float(sg[1]), col, false, 7.0)
			for sg in C[ek].get("d", []): _ribbon(st, roads[ei], float(sg[0]), float(sg[1]), col, true, 7.0)
	for ei in roads.size():
		if not claimed.has(ei): _ribbon(st, roads[ei], 0.0, 1e9, gray, false, 5.0)
	lines_mi.mesh = st.commit()

func show_lines(on: bool) -> void:
	if lines_mi != null: lines_mi.visible = on

func _ribbon(st: SurfaceTool, pts: Array, s0: float, s1: float, col: Color, cut: bool, wd: float) -> void:
	if pts.size() < 2 or s1 <= s0: return
	# resample the stretch [s0, s1] of the road every ~24 units so it hugs the ground
	var out: Array = []; var acc := 0.0
	for i in pts.size() - 1:
		var a := Vector2(pts[i][0], pts[i][1]); var b := Vector2(pts[i + 1][0], pts[i + 1][1])
		var L := a.distance_to(b)
		if L < 0.01: continue
		var lo := maxf(s0, acc); var hi := minf(s1, acc + L)
		if hi > lo:
			var n := maxi(1, int(ceil((hi - lo) / 24.0)))
			for k in n + 1:
				var s := lerpf(lo, hi, float(k) / n)
				if out.is_empty() or s > out[-1][1] + 0.01: out.append([a.lerp(b, (s - acc) / L), s])
		acc += L
		if acc >= s1: break
	if out.size() < 2: return
	var prev_l := Vector3.ZERO; var prev_r := Vector3.ZERO; var prev_s := 0.0
	for i in out.size():
		var p: Vector2 = out[i][0]
		var d: Vector2 = ((out[mini(i + 1, out.size() - 1)][0] as Vector2) - (out[maxi(i - 1, 0)][0] as Vector2)).normalized()
		var nrm := Vector2(-d.y, d.x) * wd * 0.5
		var l := Vector3(p.x + nrm.x, 0, p.y + nrm.y); l.y = gh(l.x, l.z) + 1.2
		var r := Vector3(p.x - nrm.x, 0, p.y - nrm.y); r.y = gh(r.x, r.z) + 1.2
		var s: float = out[i][1]
		if i > 0:
			var c2 := Vector2(1.0 if cut else 0.0, 0.0)
			for v in [[prev_l, Vector2(prev_s, 0)], [l, Vector2(s, 0)], [prev_r, Vector2(prev_s, 1)], [l, Vector2(s, 0)], [r, Vector2(s, 1)], [prev_r, Vector2(prev_s, 1)]]:
				st.set_color(col); st.set_uv(v[1]); st.set_uv2(c2); st.add_vertex(v[0])
		prev_l = l; prev_r = r; prev_s = s
