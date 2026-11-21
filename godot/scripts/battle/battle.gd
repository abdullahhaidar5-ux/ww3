## BATTLE mode (orch/godot-battle) - C&C Generals Zero Hour rules on the Godot edition.
## The rules + AI are the sim port in res://sim/ (sim.gd, sim_ai.gd: translated from src/03-sim.js, stats from
## src/01-data.js via data/rules.json). This scene: setup screen (4 nations), the battle map's ground, every unit and
## building drawn through the Test range's MultiMesh path (one instanced draw per model), C&C controls, the dozer's
## build menu with a placement ghost, production queues per building, money / power / units bar, win / lose.
## It extends the Test range script only to reuse its drawing helpers (meshes, instancing, effects, camera, sky).
##   godot --path godot -- --battle                      play (setup screen)
##   godot --path godot -- --battle --fac=RS --vs=IL     straight in
##   godot --headless --path godot -- --battle-ai --vs=US --fac=IR --minutes=30   AI vs AI to a result
extends "res://scripts/main.gd"

const Sim = preload("res://sim/sim.gd")
const Look = preload("res://scripts/battle/battle_look.gd")
const Terrain = preload("res://scripts/battle/battle_terrain.gd")
const BattleNet = preload("res://scripts/battle/battle_net.gd")

const NATIONS := ["IR", "RS", "US", "IL"]
const NAT_NAME := {"IR": "Iran", "RS": "Lebanese Shia", "US": "United States", "IL": "Israel"}
const COL_ME := Color(0.35, 0.9, 0.45)
const COL_EN := Color(0.95, 0.3, 0.25)
const COL_ALLY := Color(0.4, 0.7, 1.0)
# the dozer's build menu (Battle buildings; tunnels, radio, uplink etc. come with their systems)
const BUILD_MENU := ["gen", "barracks", "depot", "factory", "airfield", "turret", "sam"]
# units the sim can field today (aircraft except drones/helis, navy, spies, transports not ported yet)
const NO_TRAIN := ["jet", "airlift", "spy", "boat", "fast", "sub", "ship", "minel", "sweep", "lander", "dtank", "dsam", "darty", "cleric"]
const HOTKEYS := "QWERTYUIOP"
# Battle maps exported from the browser game (tools-godot/battle_maps.mjs): key, name, most players
const MAPS := [["bm_splitridge", "Split Ridge", 2], ["bm_ferryquarter", "Ferry Quarter", 2], ["bm_fourmills", "Four Mills", 4]]
const PAIR := {"IR": "RS", "RS": "IR", "US": "IL", "IL": "US"}
var map_key := "bm_splitridge"
var mode := "1v1"         # 1v1 | 2v2 | ffa (4-player maps)

var sim
var map: Dictionary = {}
var me := 0
var my_fac := "IR"
var en_fac := "US"
var diff := 1
var seed_v := 1
var started := false
var ai_only := false
var headless_mode := false
var minutes_cap := 40.0
var shot_t := -1.0

var prev := {}            # id -> Vector3(x, y, ang) at the previous sim step (render interpolation)
var last_fire := {}       # id -> sim time of its last shot (tracers)
var last_pos := {}        # id -> [Vector2, is_b, kind, team] (explosion when it disappears)
var prev_proj: Array = []
var seen_b := {}          # enemy building ids once seen (they stay on your map, like Generals)
var bsel: Array = []      # selected sim ids
var place_kind := ""      # building waiting for a spot (placement ghost)
var ghost: MeshInstance3D
var ghost_mat: StandardMaterial3D
var bmm := {}             # draw key -> MultiMeshInstance3D
var bmesh := {}           # draw key -> {mesh, h}
var crate_key := ""
var amove_armed := false
var auto_cam := false
var demo_ui := ""

## screenshots of the HUD: select the dozer with a placement ghost, or a production building with its queue
func _demo_ui() -> void:
	for e in sim.ents:
		if e.dead or e.team != me: continue
		if demo_ui == "build" and e.kind == "dozer":
			bsel = [e.id]; place_kind = "factory" if not sim.done(me, "factory") else "airfield"
			cam_target = Vector2(e.x, e.y); cam_dist = 620.0; cam_y = sim.ground_h(e.x, e.y)
			break
		if demo_ui == e.kind and e.is_b:
			bsel = [e.id]; cam_target = Vector2(e.x + 120, e.y); cam_dist = 560.0; cam_y = sim.ground_h(e.x, e.y)
			for i in 3: cmd({t = "train", kind = "inf", bid = e.id})
			break
	_place_cam()
	var vs := get_viewport().get_visible_rect().size
	Input.warp_mouse(Vector2(vs.x * 0.62, vs.y * 0.45))

## screenshots: put the camera on the biggest fight (units that fired in the last 2 s)
func _cam_on_fight() -> void:
	var sum := Vector2.ZERO; var n := 0
	var firing: Array = sim.ents.filter(func(e): return not e.dead and not e.is_b and sim.t - e.last_fire < 2.0 and (ai_only or sim.seen_by(me, e)))
	var best = null; var bn := 0
	for e in firing:
		var c := 0
		for o in firing:
			if absf(o.x - e.x) + absf(o.y - e.y) < 400: c += 1
		if c > bn: bn = c; best = e
	for e in firing:
		if best != null and absf(e.x - best.x) + absf(e.y - best.y) < 400: sum += Vector2(e.x, e.y); n += 1
	if n == 0:
		for e in sim.ents:
			if not e.dead and not e.is_b and e.kind != "harv" and e.kind != "dozer": sum += Vector2(e.x, e.y); n += 1
	if n > 0: cam_target = sum / n; cam_dist = 520.0; cam_y = sim.ground_h(cam_target.x, cam_target.y)

# ui
var top_lbl: Label
var cmd_box: GridContainer
var cmd_title: Label
var cmd_sig := ""
var setup: PanelContainer
var end_panel: PanelContainer
var tip_lbl: Label

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	ai_only = "--battle-ai" in args
	demo = "--demo" in args
	headless_mode = DisplayServer.get_name() == "headless"
	for a in args:
		if a.begins_with("--fac="): my_fac = a.substr(6)
		elif a.begins_with("--vs="): en_fac = a.substr(5)
		elif a.begins_with("--diff="): diff = int(a.substr(7))
		elif a.begins_with("--seed="): seed_v = int(a.substr(7))
		elif a.begins_with("--minutes="): minutes_cap = float(a.substr(10))
		elif a.begins_with("--map="): map_key = a.substr(6)
		elif a.begins_with("--mode="): mode = a.substr(7)
		elif a.begins_with("--shot="): shot_path = a.substr(7)
		elif a.begins_with("--shot-t="): shot_t = float(a.substr(9))
		elif a.begins_with("--shotf="): shot_at = int(a.substr(8))
		elif a == "--cam=auto": auto_cam = true
		elif a.begins_with("--demo-ui="): demo_ui = a.substr(10)
		elif a.begins_with("--cam="):
			var v := a.substr(6).split(",")
			cam_target = Vector2(float(v[0]), float(v[1])); cam_dist = float(v[2])
	_env()
	_camera()
	_fx_setup()
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
	_battle_ui()
	var on_url := ""; var on_code := ""; var on_name := "Player"; var on_n := 0
	for a in args:
		if a.begins_with("--online="): on_url = a.substr(9)
		elif a.begins_with("--code="): on_code = a.substr(7)
		elif a.begins_with("--name="): on_name = a.substr(7)
		elif a.begins_with("--start-at="): on_n = int(a.substr(11))
	if on_url != "":
		go_online(on_url, on_code, on_name, on_n)
	elif ai_only or Array(args).any(func(a): return String(a).begins_with("--fac=")):
		start_battle()
	else:
		_show_setup()

# ---------------------------------------------------------------- setup
func go_online(url: String, code: String, nm: String, start_n: int = 0) -> void:
	if setup: setup.visible = false
	online = BattleNet.new(self)
	online.start_at = start_n
	online.hash_log = headless_mode
	add_child(online)
	online.go(url, code, nm)

## online: the relay decided map, seats and seed (battle_net.gd)
func start_online(mk: String, players: Array, seat: int, sd: int) -> void:
	map_key = mk; me = seat; seed_v = sd
	my_fac = players[seat].fac
	en_fac = players[(seat + 1) % players.size()].fac
	_start(players)

func start_battle() -> void:
	_start([])

func _start(players: Array) -> void:
	if setup: setup.visible = false
	map = Sim.load_json("res://data/map_%s.json" % map_key)
	if map.is_empty(): map_key = "bm_splitridge"; map = Sim.load_json("res://data/map_bm_splitridge.json")
	sim = Sim.new()
	sim.init(map, players if players.size() else _players(), seed_v, diff)
	if not headless_mode:
		Terrain.build(self, sim, map, func(k: String): return _build_mesh(k, "y", randf_range(36, 52)))
	var b: Array = sim.bases[me]
	if not args_has_cam():
		cam_target = Vector2(float(b[0]) + 260, float(b[1]))
		cam_dist = 760.0
	_make_ghost()
	started = true
	print("BATTLE start: %s (%s) vs %s (AI, difficulty %d), seed %d%s" % [NAT_NAME[my_fac], "AI" if ai_only else "you", NAT_NAME[en_fac], diff, seed_v, "" if not headless_mode else " [headless]"])

## seats: you (0), then the AIs. 2v2: your side's partner nation is your ally (Iran + Lebanese Shia, US + Israel).
func _players() -> Array:
	var nb: int = map.bases.size()
	if nb < 4 or mode == "1v1": return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}]
	if mode == "2v2":
		var ally_f: String = PAIR[my_fac] if PAIR[my_fac] != en_fac else my_fac
		var en2: String = PAIR[en_fac] if PAIR[en_fac] != my_fac else en_fac
		return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}, {fac = ally_f, ai = true, tm = 1}, {fac = en2, ai = true, tm = 2}]
	var rest: Array = NATIONS.filter(func(f): return f != my_fac and f != en_fac)
	return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}, {fac = rest[0], ai = true, tm = 3}, {fac = rest[1], ai = true, tm = 4}]

func args_has_cam() -> bool:
	return Array(OS.get_cmdline_user_args()).any(func(a): return String(a).begins_with("--cam="))

func _show_setup() -> void:
	setup = PanelContainer.new()
	setup.set_anchors_preset(Control.PRESET_CENTER)
	setup.position = Vector2(-260, -190)
	setup.custom_minimum_size = Vector2(520, 0)
	setup.add_theme_stylebox_override("panel", _panel_style())
	ui.add_child(setup)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	setup.add_child(vb)
	var h := Label.new()
	h.text = "BATTLE"
	h.add_theme_font_size_override("font_size", 30)
	h.add_theme_color_override("font_color", Color(0.95, 0.82, 0.45))
	vb.add_child(h)
	var d := Label.new()
	d.text = "Command Center, Construction Vehicle and Supply Truck. Build, fight, destroy every enemy building."
	d.autowrap_mode = TextServer.AUTOWRAP_WORD
	vb.add_child(d)
	var rows := [["Your nation", "me"], ["Enemy (AI)", "en"]]
	var pick := {"me": my_fac, "en": en_fac}
	for r in rows:
		var l := Label.new(); l.text = r[0]; vb.add_child(l)
		var hb := HBoxContainer.new(); vb.add_child(hb)
		var grp := ButtonGroup.new()
		for f in NATIONS:
			var bt := Button.new()
			bt.text = NAT_NAME[f]; bt.toggle_mode = true; bt.button_group = grp
			bt.button_pressed = pick[r[1]] == f
			var side: String = r[1]
			bt.pressed.connect(func():
				if side == "me": my_fac = f
				else: en_fac = f)
			hb.add_child(bt)
	var l2 := Label.new(); l2.text = "AI"; vb.add_child(l2)
	var hd := HBoxContainer.new(); vb.add_child(hd)
	var g2 := ButtonGroup.new()
	for it in [["Easy", 0], ["Normal", 1], ["Hard", 2]]:
		var bt := Button.new()
		bt.text = it[0]; bt.toggle_mode = true; bt.button_group = g2; bt.button_pressed = diff == it[1]
		var dv: int = it[1]
		bt.pressed.connect(func(): diff = dv)
		hd.add_child(bt)
	var lm := Label.new(); lm.text = "Map"; vb.add_child(lm)
	var hm := HBoxContainer.new(); vb.add_child(hm)
	var gm := ButtonGroup.new()
	var mode_row := HBoxContainer.new()
	for mm in MAPS:
		var bt := Button.new()
		bt.text = "%s (%d)" % [mm[1], mm[2]]; bt.toggle_mode = true; bt.button_group = gm; bt.button_pressed = map_key == mm[0]
		var key: String = mm[0]; var np: int = mm[2]
		bt.pressed.connect(func(): map_key = key; mode_row.visible = np >= 4)
		hm.add_child(bt)
	vb.add_child(mode_row)
	mode_row.visible = false
	var g3 := ButtonGroup.new()
	for it in [["1 vs 1", "1v1"], ["2 vs 2 (AI ally)", "2v2"], ["Free for all", "ffa"]]:
		var bt := Button.new()
		bt.text = it[0]; bt.toggle_mode = true; bt.button_group = g3; bt.button_pressed = mode == it[1]
		var mv: String = it[1]
		bt.pressed.connect(func(): mode = mv)
		mode_row.add_child(bt)
	var go := Button.new()
	go.text = "Start battle"
	go.pressed.connect(start_battle)
	vb.add_child(go)
	var onl := Button.new()
	onl.text = "Play online (with your nation)"
	onl.pressed.connect(func(): go_online(BattleNet.RELAY, "", "Player"))
	vb.add_child(onl)
	var back := Button.new()
	back.text = "Back to Test range"
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/main.tscn"))
	vb.add_child(back)
	_style(setup)
	h.add_theme_font_size_override("font_size", 30)

func _panel_style() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.09, 0.09, 0.08, 0.9)
	sb.border_color = Color(0.78, 0.64, 0.32, 0.9)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(3)
	sb.content_margin_left = 14; sb.content_margin_right = 14; sb.content_margin_top = 10; sb.content_margin_bottom = 10
	return sb

# ---------------------------------------------------------------- drawing keys (one MultiMesh per model)
func _dk_info(key: String, spec: Array) -> Dictionary:
	if bmesh.has(key): return bmesh[key]
	var info := {}
	var model: String = spec[0]
	if model == "@shahed": info = {"mesh": _shahed_mesh(spec[2]), "h": 4.0}
	elif model == "@derrick": info = {"mesh": Look.derrick_mesh(), "h": 40.0}
	elif model == "@box": info = {"mesh": Look.box_mesh(spec[2], Look.BOX_COL), "h": spec[2] * 0.45}
	else:
		info = _build_mesh(model, spec[1], spec[2])
		if not info.is_empty() and Look.PAINT.has(model): Look.paint(info["mesh"], Look.PAINT[model])
	if info.is_empty(): info = {"mesh": Look.box_mesh(spec[2], Look.BOX_COL), "h": spec[2] * 0.45}
	bmesh[key] = info
	var m := MultiMeshInstance3D.new()
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = info["mesh"]
	mm.instance_count = 16
	mm.visible_instance_count = 0
	m.multimesh = mm
	m.extra_cull_margin = 16000.0
	add_child(m)
	bmm[key] = m
	return info

func _unit_key(fac: String, kind: String) -> Array:
	var spec := Look.unit_model(fac, kind)
	return ["u|%s|%s|%s" % spec, spec]

func _bld_key(fac: String, kind: String, size: float) -> Array:
	var b := Look.bld_model(fac, kind)
	var spec := [b[0], "xz", size * float(b[1])]
	if b[0] == "@box": spec = ["@box", "xz", size]
	return ["b|%s|%s|%d" % [b[0], kind, int(size)], spec]

# ---------------------------------------------------------------- simulation (30 Hz frame = 2 sim steps of 1/60 s)
func _physics_process(dt: float) -> void:
	if not started: return
	t += dt
	if sim.over:
		_show_end()
		if ai_only or (demo and headless_mode): _ai_report(true); get_tree().quit()
		return
	if online != null:
		if demo and online.net.phase == "battle": _demo_tick()
		return   # online: the relay's ticks drive the sim (battle_net.gd -> sim_tick)
	var ticks := 1
	if headless_mode and (ai_only or demo): ticks = 300 if ai_only else 60     # AI vs AI to a result fast
	elif (ai_only or demo) and shot_t > 0 and sim.t < shot_t - 1.0: ticks = 15 if demo else 60
	for i in ticks:
		if sim.over: break
		if demo: _demo_tick()
		sim_tick(pending)
		pending = []

## ONE tick = 1/30 s = 2 sim steps of 1/60 s. Orders apply at the start of the tick, in order, on every machine.
func sim_tick(orders: Array) -> void:
	for o in orders: _apply(o)
	for e in sim.ents:
		prev[e.id] = Vector3(e.x, e.y, e.ang)
	var m0 := int(sim.t / 60.0)
	sim.step()
	if not sim.over: sim.step()
	if (ai_only or demo) and int(sim.t / 60.0) != m0: _ai_report(false)
	if (ai_only or demo) and sim.t >= minutes_cap * 60.0:
		_ai_report(true); print("BATTLE-AI: time cap reached (%d min), no winner" % int(minutes_cap)); get_tree().quit()

## state hash for online desync checks: positions, health, money, queue lengths (FNV-1a over ints)
func hash_state() -> int:
	var h := 2166136261
	for e in sim.ents:
		for v in [e.id, roundi(e.x * 16.0), roundi(e.y * 16.0), roundi(e.hp * 16.0), e.q.size()]:
			h = ((h ^ (int(v) & 0xffffffff)) * 16777619) & 0xffffffff
	for T in sim.teams:
		h = ((h ^ (roundi(T.credits) & 0xffffffff)) * 16777619) & 0xffffffff
	return h

## --demo: a scripted player that only uses cmd() (the same door as the mouse and keyboard) - proves the human
## path headless: power, barracks, factory, depot, queues, supply trucks, rally, attack waves.
var demo := false
var online = null          # battle_net.gd node while playing online
var pending: Array = []    # single player: orders for the next tick
var demo_t := 0.0
var demo_step := 0
func _demo_tick() -> void:
	if sim.t < demo_t: return
	demo_t = sim.t + 2.0
	var T: Dictionary = sim.teams[me]
	var want := ["gen", "barracks", "factory", "gen", "depot", "turret"]
	if demo_step < want.size():
		var k: String = want[demo_step]
		var s: Dictionary = sim.bstats(my_fac, k)
		if T.credits >= float(s.cost) and sim.req_met(me, k) and not _demo_building():
			var p = _find_spot(k)
			if p != null and cmd({t = "build", kind = k, x = p.x, y = p.y}):
				print("DEMO %.0fs: building %s" % [sim.t, s.name]); demo_step += 1
		return_if_low(T)
	for b in sim.ents:
		if b.dead or not b.is_b or b.team != me or b.built < 1.0 or b.q.size() >= 2: continue
		if b.kind == "barracks": cmd({t = "train", kind = "inf" if randi() % 3 else "at", bid = b.id})
		elif b.kind == "factory": cmd({t = "train", kind = "tank", bid = b.id})
		elif b.kind == "hq" and sim.unit_count(me, "harv") < 3: cmd({t = "train", kind = "harv", bid = b.id})
	if int(sim.t) % 90 < 2 and sim.t > 240:
		var army: Array = sim.ents.filter(func(e): return not e.dead and not e.is_b and e.team == me and not e.kind in ["harv", "dozer"])
		var ehq = sim.hq_of(1 - me)
		var tg: Array = sim.bases[1 - me]
		if ehq != null: tg = [ehq.x, ehq.y]
		if army.size() >= 8:
			cmd({t = "amove", ids = army.map(func(e): return e.id), x = float(tg[0]), y = float(tg[1])})
			print("DEMO %.0fs: attack-move %d units" % [sim.t, army.size()])

func return_if_low(_T) -> void:
	pass

func _demo_building() -> bool:
	for b in sim.ents:
		if b.is_b and b.team == me and not b.dead and b.built < 1.0: return true
	return false

## nearest valid spot around the HQ, toward the map centre first
func _find_spot(k: String):
	var hq = sim.hq_of(me)
	if hq == null: return null
	var a0: float = sim.base_facing(me)
	for r in [170.0, 240.0, 310.0, 380.0, 450.0]:
		for i in 16:
			var a := a0 + (float((i + 1) / 2) * (1 if i % 2 else -1)) * 0.39
			var x: float = hq.x + cos(a) * r; var y: float = hq.y + sin(a) * r
			if sim.valid_spot(me, k, x, y) != 0: return Vector2(x, y)
	return null

func _ai_report(final: bool) -> void:
	var i: Dictionary = sim.info()
	var txt: Array = []
	for p in i.per: txt.append("%s %du %db $%d k%d" % [p.fac, p.units, p.blds, p.credits, p.kills])
	print("min %2d  %s" % [roundi(sim.t / 60.0), "  |  ".join(txt)])
	if final and sim.over:
		var w: int = sim.winner
		var side: Array = []
		for T in sim.teams:
			if w >= 0 and T.tm == sim.teams[w].tm: side.append("%s(seat %d)" % [T.fac, T.id])
		print("BATTLE-AI RESULT: %s wins after %.1f min on %s" % [" + ".join(side) if side.size() else "nobody", sim.t / 60.0, map_key])

# ---------------------------------------------------------------- drawing
func _process(dt: float) -> void:
	_cam_input(dt)
	_place_cam()
	top_lbl.get_parent().visible = started
	cmd_box.get_parent().get_parent().visible = started
	mini.visible = started
	if not started:
		_ui_battle_tick()
		if shot_path != "":
			shot_frames += 1
			if shot_frames == shot_at:
				get_viewport().get_texture().get_image().save_png(shot_path); get_tree().quit()
		return
	if headless_mode: return
	var a := Engine.get_physics_interpolation_fraction()
	var per := {}
	for k in bmm: per[k] = []
	var rings: Array = []
	var bars: Array = []
	var alive := {}
	for e in sim.ents:
		if e.dead: continue
		var mine: bool = e.team == me
		var vis: bool = mine or sim.seen_by(me, e) or ai_only
		if e.is_b and vis: seen_b[e.id] = true
		if not vis and not (e.is_b and seen_b.has(e.id)): continue
		alive[e.id] = true
		var fac: String = sim.teams[e.team].fac
		var pv: Vector3 = prev.get(e.id, Vector3(e.x, e.y, e.ang))
		var p := Vector2(lerpf(pv.x, e.x, a), lerpf(pv.y, e.y, a))
		var ang := lerp_angle(pv.z, e.ang, a)
		var gy: float = sim.ground_h(p.x, p.y)
		var col := COL_ME if mine else (COL_ALLY if sim.ally(me, e.team) else COL_EN)
		var issel := bsel.has(e.id)
		last_pos[e.id] = [p, e.is_b, e.kind, e.team, gy]
		if e.is_b:
			var kk := _bld_key(fac, e.kind, e.size)
			var info := _dk_info(kk[0], kk[1])
			var sink: float = (1.0 - e.built) * float(info["h"]) * 0.9
			per.get_or_add(kk[0], []).append(Transform3D(Basis(Vector3.UP, -sim.base_facing(e.team) + PI * 0.5), Vector3(p.x, gy - sink, p.y)))
			rings.append([Vector3(p.x, gy + 1.0, p.y), e.size * 0.72, Color(1, 1, 1) if issel else Color(col.r, col.g, col.b, 0.8)])
			if issel or e.hp < e.max or e.built < 1.0:
				var f: float = e.built if e.built < 1.0 else e.hp / e.max
				bars.append([Vector3(p.x, gy + 70.0, p.y), 64.0, Color(0.1, 0.1, 0.1, 0.8), f, Color(0.95, 0.8, 0.3) if e.built < 1.0 else Color(1.0 - f, f, 0.15)])
			if mine and issel and e.rally != null:
				rings.append([Vector3(float(e.rally.x), sim.ground_h(e.rally.x, e.rally.y) + 1.0, float(e.rally.y)), 10.0, Color(0.4, 1.0, 0.5)])
		else:
			var kk := _unit_key(fac, e.kind)
			var info := _dk_info(kk[0], kk[1])
			var model: String = kk[1][0]
			var basis := Basis(Vector3.UP, -ang + PI * 0.5)
			if Look.is_soldier(model):
				var n := Look.team_size(e.kind)
				var alive_n := clampi(int(ceil(e.hp / e.max * n)), 1, n)
				var moving: bool = e.v > 2.0
				for i in alive_n:
					var off := Vector2(((i % 2) - 0.5) * 11.0 + (0.0 if i < 2 else 5.5), (int(i / 2) - 0.3) * 11.0).rotated(ang)
					var bob := 0.0
					if moving: bob = absf(sin(t * 11.0 + float(e.id * 3 + i * 2))) * 1.2
					var q := p + off
					per.get_or_add(kk[0], []).append(Transform3D(basis, Vector3(q.x, sim.ground_h(q.x, q.y) + bob, q.y)))
			elif model == "@shahed":
				per.get_or_add(kk[0], []).append(Transform3D(basis, Vector3(p.x, gy + 60.0, p.y)))
			else:
				var air: bool = e.s_dom == "air"
				per.get_or_add(kk[0], []).append(Transform3D(basis, Vector3(p.x, gy + (70.0 if air else 0.0), p.y)))
			var r: float = e.r * 1.7 + 4.0
			rings.append([Vector3(p.x, gy + 1.0, p.y), r, Color(1, 1, 1) if issel else col])
			if issel or e.hp < e.max:
				var f2: float = e.hp / e.max
				bars.append([Vector3(p.x, gy + 26.0, p.y), 22.0, Color(0.1, 0.1, 0.1, 0.8), f2, Color(1.0 - f2, f2, 0.15)])
			# shots: tracer from the shooter to its target, muzzle flash for big guns
			if e.last_fire > float(last_fire.get(e.id, -99.0)):
				last_fire[e.id] = e.last_fire
				var tg = e.target if e.target != null else (e.order.get("target") if e.order != null else null)
				if tg != null and not tg.dead and (ai_only or vis):
					var big: bool = e.s_cls in ["tank", "arty", "aa"]
					var from := Vector3(p.x, gy + (9.0 if big else 7.0), p.y)
					tracers.append([from, Vector3(tg.x, sim.ground_h(tg.x, tg.y) + 6.0, tg.y), t, Color(1.0, 0.85, 0.45, 0.9)])
					if big: _boom(from + Vector3(cos(ang) * 14.0, 0, sin(ang) * 14.0), 6.0, Color(1.0, 0.75, 0.35), 0.12)
	# map buildings: oil derricks + capturable quarry / mine / power plant / hospital
	for o in sim.oil:
		if o.dead: continue
		var key := "derrick" if o.tb == null else "techb_" + str(o.tb)
		var bk := _bld_key("", key, 40.0 if o.tb == null else 60.0)
		_dk_info(bk[0], bk[1])
		var oy: float = sim.ground_h(o.x, o.y)
		per.get_or_add(bk[0], []).append(Transform3D(Basis.IDENTITY, Vector3(o.x, oy, o.y)))
		var oc := Color(0.75, 0.75, 0.75, 0.7)
		if int(o.owner) == me: oc = COL_ME
		elif int(o.owner) >= 0: oc = COL_ALLY if sim.ally(me, int(o.owner)) else COL_EN
		rings.append([Vector3(o.x, oy + 1.0, o.y), 34.0, oc])
	# supply piles: crates shrink as the trucks haul them away
	var ck := ["crate", ["crate", "xz", 16.0]]
	_dk_info(ck[0], ck[1])
	if not per.has("crate"): per["crate"] = []
	for f in sim.fields:
		var n := clampi(int(ceil(f.amt / 800.0)), 0, 16)
		for i in n:
			var ang2 := float(i) * 2.399
			var rr := 10.0 + sqrt(float(i)) * 11.0
			var cx: float = f.x + cos(ang2) * rr; var cz: float = f.y + sin(ang2) * rr
			per["crate"].append(Transform3D(Basis(Vector3.UP, ang2), Vector3(cx, sim.ground_h(cx, cz) + (8.0 if i % 5 == 4 else 0.0), cz)))
	for k in bmm:
		if per.has(k): _fill(bmm[k], per[k])
	# shells / missiles in flight
	for pj in sim.proj:
		var px: float = pj.x; var pz: float = pj.y
		var dir := Vector2(pj.tx - px, pj.ty - pz).normalized()
		var arc := 0.0
		if pj.wpn == "shell": arc = sin(clampf(pj.p / pj.len, 0, 1) * PI) * minf(120.0, pj.len * 0.25)
		var y0: float = sim.ground_h(px, pz) + 10.0 + arc
		tracers.append([Vector3(px, y0, pz), Vector3(px - dir.x * 22.0, y0, pz - dir.y * 22.0), t - 0.06, Color(1.0, 0.6, 0.3, 1.0)])
	for pj in prev_proj:
		if pj.done and pj.splash > 0:
			_boom(Vector3(pj.tx, sim.ground_h(pj.tx, pj.ty) + 4.0, pj.ty), clampf(pj.splash * 0.5, 12.0, 40.0), Color(1.0, 0.6, 0.25))
	prev_proj = sim.proj.duplicate()
	# deaths: whatever vanished since the last frame blows up
	for id in last_pos.keys():
		if not alive.has(id):
			var lp: Array = last_pos[id]
			var lv: Vector2 = lp[0]
			var big: bool = lp[1] or not (lp[2] in ["inf", "at", "medic", "officer", "mortar", "spy", "champ", "hero", "cleric"])
			if sim.by_id.has(id) and not sim.by_id[id].dead and not lp[1]:
				pass   # just went out of sight (fog), not dead
			else:
				_boom(Vector3(lv.x, lp[4] + 6.0, lv.y), (60.0 if lp[1] else 28.0) if big else 9.0, Color(1.0, 0.55, 0.2) if big else Color(0.9, 0.8, 0.6))
			last_pos.erase(id)
			bsel.erase(id)
	_draw_rings_bars(rings, bars)
	_draw_fx()
	_ghost_tick()
	_ui_battle_tick()
	if shot_path != "" and (shot_t < 0 or sim.t >= shot_t):
		if shot_frames == 0 and auto_cam: _cam_on_fight()
		if shot_frames == 0 and demo_ui != "": _demo_ui()
		shot_frames += 1
		if shot_frames == (shot_at if shot_t < 0 else 8):
			get_viewport().get_texture().get_image().save_png(shot_path)
			print("BATTLE shot " + shot_path + " at %.0f s" % sim.t)
			get_tree().quit()

func _draw_rings_bars(rings: Array, bars: Array) -> void:
	_grow(ring_mmi, rings.size())
	var mm := ring_mmi.multimesh
	for i in rings.size():
		var rg: Array = rings[i]
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3(rg[1], 1, rg[1])), rg[0]))
		mm.set_instance_color(i, rg[2])
	mm.visible_instance_count = rings.size()
	_grow(bar_mmi, bars.size() * 2)
	var bm := bar_mmi.multimesh
	var bi := 0
	var right := cam.global_transform.basis.x
	for b in bars:
		bm.set_instance_transform(bi, Transform3D(Basis().scaled(Vector3(b[1], 3.2, 1)), b[0]))
		bm.set_instance_color(bi, b[2]); bi += 1
		var fw: float = b[1] * float(b[3])
		bm.set_instance_transform(bi, Transform3D(Basis().scaled(Vector3(fw, 2.4, 1)), b[0] - right * (b[1] - fw) * 0.5 + cam.global_transform.basis.z * 0.5))
		bm.set_instance_color(bi, b[4]); bi += 1
	bm.visible_instance_count = bi

# ---------------------------------------------------------------- camera (battle map size, height-aware)
func _cam_input(dt: float) -> void:
	var v := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): v.y -= 1
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): v.y += 1
	if Input.is_physical_key_pressed(KEY_A) and not Input.is_key_pressed(KEY_CTRL) or Input.is_physical_key_pressed(KEY_LEFT): v.x -= 1
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): v.x += 1
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	if mouse_in and DisplayServer.window_is_focused() and mp.x >= 0 and mp.y >= 0:
		if mp.x < 4: v.x -= 1
		if mp.x > vs.x - 4: v.x += 1
		if mp.y < 4: v.y -= 1
		if mp.y > vs.y - 4: v.y += 1
	cam_target += v.normalized() * dt * (500.0 + cam_dist * 0.9)
	var mw: float = float(map.get("MAPW", 4800)); var mh: float = float(map.get("MAPH", 3320))
	cam_target.x = clampf(cam_target.x, 0, mw)
	cam_target.y = clampf(cam_target.y, 0, mh)

var cam_y := 0.0
func _place_cam() -> void:
	if sim != null:
		cam_y = lerpf(cam_y, sim.ground_h(cam_target.x, cam_target.y), 0.1)
	var pitch := deg_to_rad(lerpf(40.0, 58.0, clampf((cam_dist - 300.0) / 1300.0, 0.0, 1.0)))
	var tgt := Vector3(cam_target.x, cam_y, cam_target.y)
	cam.position = tgt + Vector3(0, sin(pitch) * cam_dist, cos(pitch) * cam_dist)
	cam.look_at(tgt, Vector3.UP)

## mouse ray onto the height field (march, then refine)
func _ground_at(sp: Vector2) -> Vector2:
	var o := cam.project_ray_origin(sp)
	var d := cam.project_ray_normal(sp)
	if sim == null or d.y >= -0.0001:
		return super._ground_at(sp)
	var prev_p := o
	var stp := 24.0
	for i in 600:
		var p := o + d * (stp * i)
		if p.y <= sim.ground_h(p.x, p.z):
			var lo := prev_p; var hi := p
			for k in 10:
				var mid := (lo + hi) * 0.5
				if mid.y <= sim.ground_h(mid.x, mid.z): hi = mid
				else: lo = mid
			return Vector2(hi.x, hi.z)
		prev_p = p
	return super._ground_at(sp)

# ---------------------------------------------------------------- picking + selection
func _pick_sim(sp: Vector2):
	var g := _ground_at(sp)
	var best = null
	var bd := 1e9
	for e in sim.ents:
		if e.dead: continue
		if e.team != me and not sim.seen_by(me, e) and not (e.is_b and seen_b.has(e.id)): continue
		var rr: float = e.size * 0.6 if e.is_b else e.r * 2.2 + 10.0
		var d := Vector2(e.x, e.y).distance_to(g)
		if d < rr and d < bd:
			bd = d; best = e
	return best

func _sel_ents() -> Array:
	var out: Array = []
	for id in bsel:
		var e = sim.by_id.get(id)
		if e != null and not e.dead: out.append(e)
	return out

func _sel_units() -> Array:
	return _sel_ents().filter(func(e): return not e.is_b and e.team == me)

func _unhandled_input(ev: InputEvent) -> void:
	if not started or ai_only:
		if ev is InputEventMouseMotion: mouse_in = true
		if ev is InputEventMouseButton and ev.pressed:
			if ev.button_index == MOUSE_BUTTON_WHEEL_UP: cam_dist = clampf(cam_dist * 0.88, 220.0, 2400.0)
			elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN: cam_dist = clampf(cam_dist * 1.13, 220.0, 2400.0)
		return
	if ev is InputEventMouseMotion:
		mouse_in = true
		if dragging:
			var mm := ev as InputEventMouseMotion
			if mm.position.distance_to(drag_start) > 8 and place_kind == "":
				box.visible = true
				box.position = Vector2(minf(drag_start.x, mm.position.x), minf(drag_start.y, mm.position.y))
				box.size = (mm.position - drag_start).abs()
	elif ev is InputEventMouseButton:
		var mb := ev as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed: cam_dist = clampf(cam_dist * 0.88, 220.0, 2400.0)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed: cam_dist = clampf(cam_dist * 1.13, 220.0, 2400.0)
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if place_kind != "":
				if mb.pressed: _place_here(mb.position, mb.shift_pressed)
				return
			if amove_armed and mb.pressed:
				amove_armed = false
				_order_units(mb.position, true)
				return
			if mb.pressed:
				drag_start = mb.position; dragging = true
			else:
				dragging = false
				box.visible = false
				if mb.position.distance_to(drag_start) > 8: _box_sel(drag_start, mb.position, mb.shift_pressed)
				else: _click_sel(mb.position, mb.shift_pressed, mb.double_click)
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			if place_kind != "":
				place_kind = ""; ghost.visible = false
				return
			amove_armed = false
			_order_units(mb.position, false)
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		var k := ev as InputEventKey
		if k.keycode == KEY_A and k.ctrl_pressed:
			bsel = []
			for e in sim.ents:
				if not e.dead and e.team == me and not e.is_b and e.kind != "harv" and e.kind != "dozer": bsel.append(e.id)
		elif k.keycode == KEY_X:
			cmd({t = "stop", ids = _sel_units().map(func(e): return e.id)})
		elif k.keycode == KEY_F:
			amove_armed = not _sel_units().is_empty()
			if amove_armed: _msg("Attack-move: click the ground")
		elif k.keycode == KEY_ESCAPE:
			if place_kind != "": place_kind = ""; ghost.visible = false
			else: bsel.clear()
		elif k.keycode == KEY_H:
			var hq = sim.hq_of(me)
			if hq != null: cam_target = Vector2(hq.x, hq.y)
		else:
			# command-bar hotkeys: Q W E R ... are camera keys only for W A S D (Abdullah: W A S D only scroll)
			pass

func _click_sel(sp: Vector2, add: bool, dbl: bool) -> void:
	var e = _pick_sim(sp)
	var se := _sel_ents()
	# production building selected + left-click ground = rally point (Abdullah 2026-11-14 21:27)
	if e == null and se.size() == 1 and se[0].is_b and se[0].team == me and se[0].kind in ["barracks", "factory", "airfield", "hq"]:
		var g := _ground_at(sp)
		cmd({t = "rally", bid = se[0].id, x = g.x, y = g.y})
		_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 8.0, Color(0.4, 1.0, 0.5), 0.5)
		return
	if not add: bsel.clear()
	if e == null: return
	if e.team != me:
		bsel = [e.id]   # look at an enemy (no orders)
		return
	if dbl and not e.is_b:
		for o in sim.ents:
			if not o.dead and o.team == me and o.kind == e.kind and not o.is_b and _on_screen_xy(o.x, o.y) and not bsel.has(o.id): bsel.append(o.id)
	elif not bsel.has(e.id):
		bsel.append(e.id)

func _on_screen_xy(x: float, y: float) -> bool:
	var p3 := Vector3(x, sim.ground_h(x, y), y)
	if cam.is_position_behind(p3): return false
	var sp := cam.unproject_position(p3)
	var vs := get_viewport().get_visible_rect().size
	return sp.x >= 0 and sp.y >= 0 and sp.x <= vs.x and sp.y <= vs.y

func _box_sel(a: Vector2, b: Vector2, add: bool) -> void:
	var r := Rect2(Vector2(minf(a.x, b.x), minf(a.y, b.y)), (b - a).abs())
	if not add: bsel.clear()
	for e in sim.ents:
		if e.dead or e.team != me or e.is_b: continue
		var p3 := Vector3(e.x, sim.ground_h(e.x, e.y) + 6, e.y)
		if cam.is_position_behind(p3): continue
		if r.has_point(cam.unproject_position(p3)) and not bsel.has(e.id): bsel.append(e.id)

## right-click: attack an enemy, move / attack-move to the ground; production building: rally point
func _order_units(sp: Vector2, amove: bool) -> void:
	var units := _sel_units()
	var se := _sel_ents()
	if units.is_empty():
		if se.size() == 1 and se[0].is_b and se[0].team == me:
			var g0 := _ground_at(sp)
			cmd({t = "rally", bid = se[0].id, x = g0.x, y = g0.y})
		return
	var tg = _pick_sim(sp)
	if tg != null and tg.team != me and not sim.ally(me, tg.team) and tg.team >= 0:
		cmd({t = "attack", ids = units.map(func(e): return e.id), target = tg.id})
		_boom(Vector3(tg.x, sim.ground_h(tg.x, tg.y) + 3, tg.y), 10.0, Color(1.0, 0.3, 0.2), 0.35)
		return
	var g := _ground_at(sp)
	var n := units.size()
	var cols := int(ceil(sqrt(n)))
	for i in n:
		var e = units[i]
		var off := Vector2((i % cols) - (cols - 1) * 0.5, int(i / cols) - (cols - 1) * 0.5) * 30.0
		cmd({t = "amove" if amove else "move", ids = [e.id], x = g.x + off.x, y = g.y + off.y})
	_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 8.0, Color(1.0, 0.5, 0.3) if amove else Color(0.4, 1.0, 0.5), 0.4)

# ---------------------------------------------------------------- commands (one door: online play hooks in here)
## every player command goes through here: single player queues it for the next tick, online sends it to the relay
func cmd(o: Dictionary) -> bool:
	o.team = me
	if online != null: return online.send(o)
	pending.append(o)
	return true

func _apply(o: Dictionary) -> bool:
	if o.t == "cancel": return _cancel_one(o)
	return sim.apply_order(o)

func _cancel_one(o: Dictionary) -> bool:
	var tm := int(o.team)
	var b = sim.by_id.get(int(o.bid))
	if b == null or not b.is_b or b.team != tm or b.q.is_empty(): return false
	for i in range(b.q.size() - 1, -1, -1):
		if b.q[i].kind == o.kind:
			sim.teams[tm].credits += float(b.q[i].c)
			b.q.remove_at(i)
			return true
	return false

# ---------------------------------------------------------------- placement ghost
func _make_ghost() -> void:
	ghost = MeshInstance3D.new()
	ghost_mat = StandardMaterial3D.new()
	ghost_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ghost_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ghost_mat.albedo_color = Color(0.3, 1.0, 0.4, 0.35)
	ghost.material_override = ghost_mat
	ghost.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ghost.visible = false
	add_child(ghost)

func _ghost_tick() -> void:
	if place_kind == "" or ghost == null:
		if ghost: ghost.visible = false
		return
	var g := _ground_at(get_viewport().get_mouse_position())
	var s: Dictionary = sim.bstats(my_fac, place_kind)
	var kk := _bld_key(my_fac, place_kind, float(s.size))
	var info := _dk_info(kk[0], kk[1])
	ghost.mesh = info["mesh"]
	ghost.position = Vector3(g.x, sim.ground_h(g.x, g.y), g.y)
	ghost.rotation = Vector3(0, -sim.base_facing(me) + PI * 0.5, 0)
	ghost.visible = true
	var ok: bool = sim.valid_spot(me, place_kind, g.x, g.y) != 0
	ghost_mat.albedo_color = Color(0.3, 1.0, 0.4, 0.4) if ok else Color(1.0, 0.25, 0.2, 0.4)

func _place_here(sp: Vector2, keep: bool) -> void:
	var g := _ground_at(sp)
	var dz := 0
	for e in _sel_units():
		if e.kind == "dozer": dz = e.id; break
	var s: Dictionary = sim.bstats(my_fac, place_kind)
	if sim.teams[me].credits < float(s.cost):
		_msg("Not enough money"); return
	if sim.valid_spot(me, place_kind, g.x, g.y) != 0 and cmd({t = "build", kind = place_kind, x = g.x, y = g.y, dz = dz}):
		_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 14.0, Color(0.95, 0.8, 0.35), 0.5)
		if not keep: place_kind = ""
	else:
		_msg("Can't build there")

# ---------------------------------------------------------------- HUD (classic Generals: money top, command bar bottom)
func _battle_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	lbl_fps = Label.new()
	lbl_fps.position = Vector2(10, 8)
	ui.add_child(lbl_fps)
	var top := PanelContainer.new()
	top.anchor_left = 0.5; top.anchor_right = 0.5
	top.offset_left = -330; top.offset_right = 330; top.offset_top = 4
	top.add_theme_stylebox_override("panel", _panel_style())
	ui.add_child(top)
	top_lbl = Label.new()
	top_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	top.add_child(top_lbl)
	var bot := PanelContainer.new()
	bot.anchor_top = 1.0; bot.anchor_bottom = 1.0; bot.anchor_left = 0.5; bot.anchor_right = 0.5
	bot.offset_left = -420; bot.offset_right = 420; bot.offset_top = -150; bot.offset_bottom = -6
	bot.add_theme_stylebox_override("panel", _panel_style())
	ui.add_child(bot)
	var vb := VBoxContainer.new()
	bot.add_child(vb)
	cmd_title = Label.new()
	cmd_title.add_theme_color_override("font_color", Color(0.95, 0.82, 0.45))
	vb.add_child(cmd_title)
	cmd_box = GridContainer.new()
	cmd_box.columns = 5
	cmd_box.add_theme_constant_override("h_separation", 6)
	cmd_box.add_theme_constant_override("v_separation", 6)
	vb.add_child(cmd_box)
	tip_lbl = Label.new()
	tip_lbl.add_theme_font_size_override("font_size", 13)
	tip_lbl.modulate = Color(1, 1, 1, 0.7)
	vb.add_child(tip_lbl)
	msg_lbl = Label.new()
	msg_lbl.anchor_left = 0.5; msg_lbl.anchor_right = 0.5
	msg_lbl.offset_left = -300; msg_lbl.offset_right = 300; msg_lbl.offset_top = 52
	msg_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
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
	mini = Control.new()
	mini.anchor_top = 1.0; mini.anchor_bottom = 1.0
	mini.offset_left = 8; mini.offset_right = 8 + MINI_W; mini.offset_top = -8 - MINI_W / 1.446; mini.offset_bottom = -8
	mini.draw.connect(_mini_draw)
	mini.gui_input.connect(_mini_input)
	ui.add_child(mini)
	_style(ui)

# ---------------------------------------------------------------- minimap (green yours, red enemy, gray neutral)
const MINI_W := 230.0
var mini: Control
var mini_tex: ImageTexture
var mini_t := 0.0

func _mini_scale() -> float:
	return MINI_W / float(map.MAPW)

func _mini_bake() -> void:
	var H: Dictionary = map.hgrid
	var w := int(MINI_W); var h := int(MINI_W / 1.446)
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	var hmax := 1.0
	for v in H.a: hmax = maxf(hmax, float(v))
	for y in h:
		for x in w:
			var wx := x / _mini_scale(); var wy := y / _mini_scale()
			var g: float = sim.ground_h(wx, wy) / hmax
			var c := Color(0.62, 0.53, 0.40).lerp(Color(0.82, 0.74, 0.58), g)
			var gi := int(wy / float(map.CELL)) * int(map.GW) + int(wx / float(map.CELL))
			if gi < map.grid.size() and int(map.grid[gi]) == 3: c = Color(0.4, 0.37, 0.33)
			if gi < map.grid.size() and int(map.grid[gi]) == 1: c = Color(0.12, 0.3, 0.38)
			if gi < map.grid.size() and int(map.grid[gi]) == 2: c = Color(0.3, 0.45, 0.48)
			if gi < map.wood.size() and int(map.wood[gi]) > 0: c = c.lerp(Color(0.35, 0.45, 0.25), 0.5)
			img.set_pixel(x, y, c)
	mini_tex = ImageTexture.create_from_image(img)

func _mini_draw() -> void:
	if sim == null: return
	if mini_tex == null: _mini_bake()
	var k := _mini_scale()
	mini.draw_texture(mini_tex, Vector2.ZERO)
	mini.draw_rect(Rect2(Vector2.ZERO, mini_tex.get_size()), Color(0.78, 0.64, 0.32), false, 2.0)
	for f in sim.fields:
		if f.amt > 0: mini.draw_rect(Rect2(Vector2(f.x, f.y) * k - Vector2(2, 2), Vector2(4, 4)), Color(0.95, 0.85, 0.4))
	for o in sim.oil:
		if o.dead: continue
		var oc := Color(0.75, 0.75, 0.75) if int(o.owner) < 0 else (COL_ME if int(o.owner) == me else (COL_ALLY if sim.ally(me, int(o.owner)) else COL_EN))
		mini.draw_circle(Vector2(o.x, o.y) * k, 3.0, oc)
	for e in sim.ents:
		if e.dead: continue
		if e.team != me and not sim.seen_by(me, e) and not (e.is_b and seen_b.has(e.id)): continue
		var c := COL_ME if e.team == me else (COL_ALLY if sim.ally(me, e.team) else COL_EN)
		if bsel.has(e.id): c = Color(1, 1, 1)
		var p := Vector2(e.x, e.y) * k
		if e.is_b: mini.draw_rect(Rect2(p - Vector2(3.5, 3.5), Vector2(7, 7)), c)
		else: mini.draw_rect(Rect2(p - Vector2(1.2, 1.2), Vector2(2.4, 2.4)), c)
	# camera view
	var vs := get_viewport().get_visible_rect().size
	var pts: Array = []
	for sp in [Vector2(0, 0), Vector2(vs.x, 0), Vector2(vs.x, vs.y), Vector2(0, vs.y)]:
		var g := _ground_at(sp)
		if g == Vector2.INF: return
		pts.append(g * k)
	for i in 4: mini.draw_line(pts[i], pts[(i + 1) % 4], Color(1, 1, 1, 0.8), 1.0)

func _mini_input(ev: InputEvent) -> void:
	if not (ev is InputEventMouseButton or ev is InputEventMouseMotion) or sim == null: return
	var w: Vector2 = ev.position / _mini_scale()
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_RIGHT:
		var units := _sel_units()
		if not units.is_empty(): cmd({t = "move", ids = units.map(func(e): return e.id), x = w.x, y = w.y})
	elif (ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT) or (ev is InputEventMouseMotion and ev.button_mask & MOUSE_BUTTON_MASK_LEFT):
		cam_target = w

func _ui_battle_tick() -> void:
	lbl_fps.text = "%d FPS" % Engine.get_frames_per_second()
	msg_t -= get_process_delta_time()
	if msg_t <= 0: msg_lbl.text = ""
	if not started:
		return
	var T: Dictionary = sim.teams[me]
	var pw: Vector2 = sim.pwr_of(me)
	var units := 0
	for e in sim.ents:
		if not e.is_b and not e.dead and e.team == me: units += 1
	top_lbl.text = "%s   $%d   Power %d/%d%s   Army %d/%d   %d:%02d" % [NAT_NAME[my_fac], int(T.credits), int(pw.x), int(pw.y), "  LOW" if pw.y > pw.x else "", sim.pop_used(me, false), sim.pop_cap(), int(sim.t / 60.0), int(sim.t) % 60]
	top_lbl.add_theme_color_override("font_color", Color(1, 0.5, 0.4) if pw.y > pw.x else Color(1, 1, 1))
	mini_t -= get_process_delta_time()
	if mini_t <= 0: mini_t = 0.25; mini.queue_redraw()
	_cmd_bar()

## bottom bar: what the selection can do (dozer -> buildings, production building -> its units + queue)
func _cmd_bar() -> void:
	var se := _sel_ents()
	var T: Dictionary = sim.teams[me]
	var sig := ""
	var items: Array = []    # [label, enabled, callable(shift), right-click callable or null, tip]
	var title := ""
	var dz = null
	for e in se:
		if e.team == me and e.kind == "dozer": dz = e; break
	if dz != null:
		title = "Construction Vehicle - build   (left-click place, Shift keeps placing, right-click cancel)"
		for k in BUILD_MENU:
			var s: Dictionary = sim.bstats(my_fac, k)
			if s.is_empty(): continue
			var ok: bool = sim.req_met(me, k) and T.credits >= float(s.cost)
			var why := "" if sim.req_met(me, k) else "  (needs %s)" % str(s.get("req", ""))
			var kind: String = k
			items.append(["%s\n$%d" % [_short(s.name), int(s.cost)], ok, func(_sh): place_kind = kind; _msg("Place the " + str(s.name)), null, str(s.get("desc", "")) + why])
	elif se.size() == 1 and se[0].is_b and se[0].team == me and se[0].built >= 1.0:
		var b = se[0]
		title = str(b.s.name)
		var roster: Array = T.F.roster.get(b.kind, [])
		var counts := {}
		for it in b.q: counts[it.kind] = counts.get(it.kind, 0) + 1
		for k in roster:
			if NO_TRAIN.has(k): continue
			var s: Dictionary = sim.stats(my_fac, k)
			if s.is_empty(): continue
			if k == T.F.special and int(T.rank) < 2: continue
			var kind: String = k
			var bid: int = b.id
			var c: int = counts.get(k, 0)
			items.append(["%s%s\n$%d" % [_short(s.name), "  x%d" % c if c else "", int(s.cost)], T.credits >= float(s.cost),
				func(sh):
					for i in (5 if sh else 1): cmd({t = "train", kind = kind, bid = bid}),
				func(): cmd({t = "cancel", kind = kind, bid = bid}),
				"%s - %s hp, range %d. Click: 1, Shift+click: 5, right-click: cancel one" % [s.name, int(s.hp), int(s.get("rng", 0))]])
		if not b.q.is_empty():
			var it0: Dictionary = b.q[0]
			var pt: float = sim.prod_time(T, sim.stats(my_fac, it0.kind))
			title += "   -   building %s %d%%   (%d in queue)" % [_short(sim.stats(my_fac, it0.kind).name), int(100.0 * it0.t / maxf(0.01, pt)), b.q.size()]
		if b.kind != "hq":
			var bid2: int = b.id
			items.append(["Sell", true, func(_sh): cmd({t = "sell", ids = [bid2]}); bsel.clear(), null, "Sell for half its cost"])
		if b.hp < b.max:
			var bid3: int = b.id
			items.append(["Repair", true, func(_sh): cmd({t = "repair", ids = [bid3]}), null, "Repair (costs money)"])
	elif not se.is_empty():
		var counts2 := {}
		for e in se: counts2[str(e.s.get("name", e.kind))] = counts2.get(str(e.s.get("name", e.kind)), 0) + 1
		var parts: Array = []
		for k in counts2: parts.append("%d %s" % [counts2[k], k])
		title = ", ".join(parts)
		if se[0].team != me: title = "Enemy: " + title
	else:
		title = "Select your Construction Vehicle to build, a building to train units."
	for it in items: sig += "%s|%s;" % [it[0], it[1]]
	sig += title
	tip_lbl.text = "Left-click select · drag box · right-click move/attack · F attack-move · X stop · Ctrl+A army · H home · W A S D scroll · wheel zoom"
	if sig == cmd_sig: return
	cmd_sig = sig
	cmd_title.text = title
	for c in cmd_box.get_children(): c.queue_free()
	for it in items:
		var bt := Button.new()
		bt.text = it[0]
		bt.custom_minimum_size = Vector2(156, 46)
		bt.disabled = not it[1]
		bt.tooltip_text = it[4]
		bt.add_theme_font_size_override("font_size", 13)
		var on: Callable = it[2]
		var rc = it[3]
		bt.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed:
				if ev.button_index == MOUSE_BUTTON_LEFT and not bt.disabled: on.call(ev.shift_pressed); cmd_sig = ""
				elif ev.button_index == MOUSE_BUTTON_RIGHT and rc != null: rc.call(); cmd_sig = "")
		cmd_box.add_child(bt)

func _short(n) -> String:
	var s := str(n)
	return s if s.length() <= 22 else s.substr(0, 21) + "."

func _show_end() -> void:
	if end_panel != null: return
	end_panel = PanelContainer.new()
	end_panel.set_anchors_preset(Control.PRESET_CENTER)
	end_panel.position = Vector2(-200, -80)
	end_panel.custom_minimum_size = Vector2(400, 0)
	end_panel.add_theme_stylebox_override("panel", _panel_style())
	ui.add_child(end_panel)
	var vb := VBoxContainer.new()
	end_panel.add_child(vb)
	var l := Label.new()
	var won: bool = sim.winner >= 0 and sim.ally(me, sim.winner)
	l.text = ("VICTORY" if won else "DEFEAT") + "\n%s after %d:%02d" % ["Every enemy building destroyed" if won else "Your last building fell", int(sim.t / 60.0), int(sim.t) % 60]
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", 26)
	vb.add_child(l)
	var again := Button.new()
	again.text = "Play again"
	again.pressed.connect(func(): get_tree().reload_current_scene())
	vb.add_child(again)
