## BATTLE mode - C&C Generals Zero Hour rules on the Godot edition.
## The rules + AI are the sim port in res://sim/ (sim.gd, sim_ai.gd: translated from src/03-sim.js, stats from
## src/01-data.js via data/rules.json). This scene draws the battle (one MultiMesh per model) and is the player's hands:
## every control of the browser game (CLAUDE.md "Controls"), the HUD (scripts/ui/hud.gd), saves / replays, the Test
## range, the Tutorial and the story Missions (scripts/ui/missions.gd). The main menu (scenes/menu.tscn) starts it
## through UI.launch; the command line still works:
##   godot --path godot -- --battle --fac=RS --vs=IL     straight in
##   godot --headless --path godot -- --battle-ai --vs=US --fac=IR --minutes=30   AI vs AI to a result
##   godot --path godot -- --selftest                    drives real input through every control (tools/selftest.gd)
extends "res://scripts/main.gd"

const Sim = preload("res://sim/sim.gd")
const BridgeSim = preload("res://bridge/bridge_sim.gd")   # P1 BRIDGE: the web build runs the JS game's simulation
const Look = preload("res://scripts/battle/battle_look.gd")
const Terrain = preload("res://scripts/battle/battle_terrain.gd")
const BattleNet = preload("res://scripts/battle/battle_net.gd")
const UI = preload("res://scripts/ui/ui_kit.gd")
const Hud = preload("res://scripts/ui/hud.gd")
const Missions = preload("res://scripts/ui/missions.gd")

var NAT_NAME := {}        # nation key -> name (filled from data/rules.json; battle_net.gd reads it)
const COL_ME := Color(0.35, 0.9, 0.45)
const COL_EN := Color(0.95, 0.3, 0.25)
const COL_ALLY := Color(0.4, 0.7, 1.0)
const COL_NEUTRAL := Color(0.75, 0.75, 0.75)
# buildings / units whose systems are not in the sim port yet: hidden, not faked. Remove a key when its system lands
# (lanes P1 / P2): tunnels, fortress, radio, uplink, navy, jets, transports, spies, decoys, leaders.
const NO_BUILD := ["tunnel", "fort", "radio", "uplink", "shipyard", "coast", "econ", "hq"]
const NO_TRAIN := ["jet", "airlift", "spy", "boat", "fast", "sub", "ship", "minel", "sweep", "lander", "dtank", "dsam", "darty", "cleric"]
const PROD := ["barracks", "factory", "airfield", "hq", "shipyard"]
const INF := ["inf", "at", "medic", "officer", "mortar", "spy", "champ", "hero", "cleric", "hacker"]
const PAIR := {"IR": "RS", "RS": "IR", "US": "IL", "IL": "US"}
var map_key := "bm_splitridge"
var mode := "1v1"         # command line only: 1v1 | 2v2 | ffa (4-player maps)
var kind := "battle"      # battle | mission | tutorial | range | replay | online

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
var use_bridge := true      # P1 BRIDGE: false only with --gdsim (the parked GDScript sim, for desktop tinkering)
var minutes_cap := 40.0
var shot_t := -1.0
var see_all := false      # replays and AI-vs-AI: no fog for the viewer

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
var auto_cam := false
var demo_ui := ""

# player state (lane P6)
var hud
var armed := ""           # "" | "amove" | "guard" | "power:<key>" - the next right-click does it, left-click cancels
var cam_yaw := 0.0        # Q rotates the battle camera (view only)
var cam_yaw_t := 0.0
var q_down := -1.0
var q_moved := false
var q_tap := -9.0
var rdrag_on := false
var rdrag_start := Vector2.ZERO
var line_node: Line2D
var groups := {}          # 1-9 -> ids
var group_tap := [0, -9.0]
var wp := {}              # id -> [Vector2, ...] waypoints still to walk (Alt + right-click)
var show_supply := false
var paused := false
var tick_n := 0
var rec := {}             # this battle as data: map, seats, seed, the orders by tick (= save file = replay file)
var play: Array = []      # orders being played back (load / replay): [[tick, order], ...]
var play_i := 0
var play_to := -1         # load: run to this tick, then hand the battle to the player
var loading := false
var replay_speed := 1
var mission = null        # missions.gd runner
var tut_i := -1
var tut_k0 := 0
var last_launch := {}
var ended := false
var range_ai = null
var alert_t := -99.0
var selftest = null

# ui (main.gd fields: ui, lbl_fps, msg_lbl, box)
var cameo_tex := {}
var cameo_q: Array = []
var cameo_busy := ""
var cameo_wait := 0
var cameo_ver := 0
var cameo_vp: SubViewport
var cameo_mi: MeshInstance3D
var cameo_cam: Camera3D

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	# P1 BRIDGE: on the web the same switches come from the page address: index.html?battle-ai&fac=IR&vs=US&minutes=10
	if OS.has_feature("web"):
		var qs := str(JavaScriptBridge.eval("location.search.slice(1)", true))
		for kv in qs.split("&", false): args.append("--" + kv.uri_decode())
	use_bridge = not ("--gdsim" in args)
	ai_only = "--battle-ai" in args
	demo = "--demo" in args
	headless_mode = DisplayServer.get_name() == "headless"
	for k in UI.nations(): NAT_NAME[k] = UI.nat_name(k)
	var L: Dictionary = UI.launch
	UI.launch = {}
	var cli := false
	for a in args:
		if a.begins_with("--fac="): my_fac = a.substr(6); cli = true
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
		elif a.begins_with("--kind="): L = {kind = a.substr(7), map = map_key, players = [{fac = my_fac, ai = false, tm = 1}, {fac = en_fac, ai = true, tm = 2}], diff = diff, seed = seed_v}
		elif a.begins_with("--load="): L = {kind = "load", file = a.substr(7)}
		elif a.begins_with("--replay="): L = {kind = "replay", file = a.substr(9)}
		elif a.begins_with("--mission="): L = {kind = "mission", mission = a.substr(10), diff = 1, seed = 11}
		elif a.begins_with("--cam="):
			var v := a.substr(6).split(",")
			cam_target = Vector2(float(v[0]), float(v[1])); cam_dist = float(v[2])
	var on_url := ""; var on_code := ""; var on_name := "Player"; var on_n := 0
	for a in args:
		if a.begins_with("--online="): on_url = a.substr(9)
		elif a.begins_with("--code="): on_code = a.substr(7)
		elif a.begins_with("--name="): on_name = a.substr(7)
		elif a.begins_with("--start-at="): on_n = int(a.substr(11))
	if L.is_empty() and on_url == "" and not ai_only and not cli and not "--selftest" in args:
		# no battle asked for: the main menu owns the setup (Battle: map > nation > players > options)
		UI.menu_start = "c-map"
		get_tree().change_scene_to_file.call_deferred("res://scenes/menu.tscn")
		set_process(false); set_physics_process(false); set_process_unhandled_input(false)
		return
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
	if "--selftest" in args:
		selftest = load("res://tools/selftest.gd").new(self)
		add_child(selftest)
		if L.is_empty(): L = {kind = "battle", map = map_key, players = [{fac = my_fac, ai = false, tm = 1}, {fac = en_fac, ai = true, tm = 2}], diff = 0, seed = 5}
	if on_url != "":
		go_online(on_url, on_code, on_name, on_n)
	elif not L.is_empty():
		start_launch(L)
	else:
		start_battle()

# ---------------------------------------------------------------- start (menu launch, command line, online)
func go_online(url: String, code: String, nm: String, start_n: int = 0) -> void:
	kind = "online"
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
	_start(players, [])

func start_battle() -> void:
	last_launch = {kind = "battle", map = map_key, players = _players(), diff = diff, seed = seed_v}
	_start([], [])

## what the menu asked for (UI.launch): battle | range | mission | tutorial | load | replay | online
func start_launch(L: Dictionary) -> void:
	kind = str(L.get("kind", "battle"))
	if kind == "online":
		my_fac = str(L.get("fac", my_fac))
		go_online(BattleNet.RELAY, str(L.get("code", "")), str(L.get("name", "Player")))
		return
	if kind == "load" or kind == "replay":
		var f := UI.read_file(str(L.get("file", "")))
		if f.is_empty() or int(f.get("v", 0)) != 1: leave(); return
		var k2 := kind
		var L2 := {kind = str(f.get("kind", "battle")), map = f.map, players = f.players, starts = f.get("starts", []), diff = int(f.get("diff", 1)), seed = int(f.get("seed", 1)), mission = str(f.get("mission", ""))}
		play = []
		for it in f.get("orders", []): play.append([int(it[0]), _norm(it[1])])
		play_i = 0; play_to = int(f.get("ticks", 0))
		if k2 == "load":
			loading = true
			start_launch(L2)
			last_launch = {kind = "load", file = L.file}
		else:
			start_launch(L2)
			kind = "replay"; see_all = true; mission = mission
			last_launch = L.duplicate()
		return
	last_launch = L.duplicate(true)
	diff = int(L.get("diff", diff)); seed_v = int(L.get("seed", seed_v))
	var players: Array = L.get("players", [])
	if kind == "mission":
		var m := Missions.by_id(str(L.get("mission", "")))
		if m.is_empty(): leave(); return
		map_key = Missions.map_for(m); players = Missions.players_for(m)
		await _start(players, [])
		if not started: return
		mission = Missions.new()
		mission.start(sim, m, diff)
		if mission.focus != null and not args_has_cam(): cam_target = Vector2(float(mission.focus[0]), float(mission.focus[1]))
		rec.mission = m.id
		return
	if kind == "tutorial":
		map_key = str(UI.opt("last_map")) if not UI.map_info(str(UI.opt("last_map"))).is_empty() and int(UI.map_info(str(UI.opt("last_map"))).n) == 2 else (UI.maps()[0].key if UI.maps().size() else map_key)
		var mf := str(UI.opt("last_fac")) if UI.nations().has(str(UI.opt("last_fac"))) else my_fac
		var ef := "US"
		for k in UI.nations():
			if k != mf and k != "RS" and k != "DW": ef = k; break
		players = [{fac = mf, ai = false, tm = 1}, {fac = ef, ai = true, tm = 2}]
		diff = 0
		await _start(players, [])
		if not started: return
		tut_i = 0
		return
	map_key = str(L.get("map", map_key))
	await _start(players, L.get("starts", []))
	if not started: return
	if kind == "range":
		if not use_bridge: range_ai = sim.mk_team(1, sim.teams[1].fac, true, sim.teams[1].tm).ai   # P1 BRIDGE: the JS range AI is not exposed yet
		_range_panel()

## JSON gives floats: ids and targets must be ints again
func _norm(o: Dictionary) -> Dictionary:
	var out := o.duplicate()
	for k in ["team", "target", "bid", "dz", "n"]:
		if out.has(k): out[k] = int(out[k])
	if out.has("ids"): out.ids = Array(out.ids).map(func(v): return int(v))
	return out

func _start(players: Array, starts: Array) -> void:
	map = Sim.load_json("res://data/map_%s.json" % map_key)
	if map.is_empty(): map_key = "bm_splitridge"; map = Sim.load_json("res://data/map_bm_splitridge.json")
	if players.is_empty(): players = _players()
	players = players.slice(0, map.bases.size())
	# start spots: a chosen spot per seat, the rest in map order (seeded shuffle only when someone asked for Random explicitly)
	if starts.size() == players.size() and starts.any(func(s): return int(s) >= 0):
		var all_b: Array = map.bases; var used := {}; var nb: Array = []; nb.resize(players.size())
		for i in players.size():
			var s := int(starts[i])
			if s >= 0 and s < all_b.size() and not used.has(s): nb[i] = all_b[s]; used[s] = true
		var free: Array = []
		for i in all_b.size():
			if not used.has(i): free.append(all_b[i])
		for i in players.size():
			if nb[i] == null: nb[i] = free.pop_front()
		map.bases = nb + free
	me = 0
	for i in players.size():
		if not bool(players[i].get("ai", true)): me = i; break
	my_fac = str(players[me].fac)
	en_fac = str(players[(me + 1) % players.size()].fac)
	# P1 BRIDGE: the simulation is the browser game's JavaScript (res://bridge/README.md); web build only
	if use_bridge:
		sim = BridgeSim.new()
		if not sim.available():
			_web_only(); return
		if not sim.init(map_key, players, seed_v, diff):
			_web_only(); return
		while not sim.ready(): await get_tree().process_frame   # the sim runs in a Web Worker: it answers a few frames later
		map = sim.map
	else:
		sim = Sim.new()
		sim.init(map, players, seed_v, diff)
	if kind == "range" and not use_bridge:
		sim.teams[1].ai = null
	rec = {v = 1, kind = kind, map = map_key, players = players, starts = starts, seed = seed_v, diff = diff, mission = "", fac = my_fac, orders = []}
	tick_n = 0
	if not headless_mode:
		Terrain.build(self, sim, map, func(k: String): return _build_mesh(k, "y", randf_range(36, 52)))
	var b: Array = sim.bases[me]
	if not args_has_cam():
		cam_target = Vector2(float(b[0]), float(b[1])) + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * 200.0
		cam_dist = 760.0
	_make_ghost()
	started = true
	Audio.battle_start(sim, me)   # P5 HOOK
	if not ai_only and not demo and selftest == null: UI.lock_mouse(true)
	print("BATTLE start: %s (%s) vs %s, %s, difficulty %d, seed %d%s" % [UI.nat_name(my_fac), "AI" if ai_only else "you", UI.nat_name(en_fac), kind, diff, seed_v, "" if not headless_mode else " [headless]"])

## P1 BRIDGE: desktop / headless Godot cannot run the JavaScript simulation
func _web_only() -> void:
	var msg: String = BridgeSim.Bridge.WEB_ONLY
	push_error(msg); print("BATTLE: " + msg)
	if headless_mode: get_tree().quit(1); return
	var l := Label.new(); l.text = msg + "\n(Developers: --gdsim runs the old GDScript rules instead.)"
	l.autowrap_mode = TextServer.AUTOWRAP_WORD; l.set_anchors_preset(Control.PRESET_CENTER); l.custom_minimum_size = Vector2(700, 0)
	add_child(l)

## command-line seats: you (0), then the AIs. 2v2: your side's partner nation is your ally.
func _players() -> Array:
	var nats := UI.nations()
	var nb: int = map.bases.size() if not map.is_empty() else int(UI.map_info(map_key).get("n", 2))
	if nb < 4 or mode == "1v1": return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}]
	if mode == "2v2":
		var ally_f: String = PAIR.get(my_fac, my_fac) if PAIR.get(my_fac, my_fac) != en_fac else my_fac
		var en2: String = PAIR.get(en_fac, en_fac) if PAIR.get(en_fac, en_fac) != my_fac else en_fac
		return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}, {fac = ally_f, ai = true, tm = 1}, {fac = en2, ai = true, tm = 2}]
	var rest: Array = nats.filter(func(f): return f != my_fac and f != en_fac)
	return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}, {fac = rest[0], ai = true, tm = 3}, {fac = rest[1], ai = true, tm = 4}]

func args_has_cam() -> bool:
	return Array(OS.get_cmdline_user_args()).any(func(a): return String(a).begins_with("--cam="))

func _panel_style() -> StyleBoxFlat:
	return UI.panel_style()

func restart() -> void:
	UI.launch = last_launch.duplicate(true)
	if online != null: online.queue_free()
	get_tree().reload_current_scene()

func leave() -> void:
	UI.lock_mouse(false)
	if online != null and online.net != null: online.net.leave()
	UI.menu_start = ""
	get_tree().change_scene_to_file("res://scenes/menu.tscn")

func set_paused(p: bool) -> void:
	paused = p and online == null

# ---------------------------------------------------------------- save / load / replay (the battle = its orders by tick)
func _rec_data(nm: String) -> Dictionary:
	var d := rec.duplicate()
	d.ticks = tick_n; d.t = sim.t; d.when = Time.get_unix_time_from_system()
	d.name = nm if nm != "" else ("%s vs %s" % [UI.nat_name(my_fac), UI.nat_name(en_fac)] if mission == null else str(mission.m.title))
	return d

func save_game(nm: String, fname: String = "") -> String:
	if online != null or sim == null or sim.over or not kind in ["battle", "mission", "tutorial"]: return ""
	var p := UI.write_file("saves", fname if fname != "" else "save_%d" % int(Time.get_unix_time_from_system()), _rec_data(nm))
	_msg("Game saved" if p != "" else "Could not save")
	return p

func load_file(path: String) -> void:
	UI.launch = {kind = "load", file = path}
	get_tree().reload_current_scene()

func watch_last_replay() -> void:
	var fs := UI.list_files("replays")
	if fs.size(): UI.launch = {kind = "replay", file = fs[0].path}; get_tree().reload_current_scene()

## screenshots of the HUD: select the dozer with a placement ghost, or a production building with its queue
func _demo_ui() -> void:
	for e in sim.ents:
		if e.dead or e.team != me: continue
		if demo_ui == "build" and e.kind == "dozer":
			bsel = [e.id]; place_kind = "factory" if not sim.done(me, "factory") else "airfield"
			cam_target = Vector2(e.x, e.y); cam_dist = 620.0; cam_y = sim.ground_h(e.x, e.y)
			break
		if demo_ui == "units" and not e.is_b and e.kind == "inf":
			bsel = sim.ents.filter(func(x): return not x.dead and x.team == me and not x.is_b).map(func(x): return x.id)
			cam_target = Vector2(e.x, e.y); cam_dist = 520.0; break
		if demo_ui == e.kind and e.is_b:
			bsel = [e.id]; cam_target = Vector2(e.x + 120, e.y); cam_dist = 560.0; cam_y = sim.ground_h(e.x, e.y)
			for i in 3: cmd({t = "train", kind = "inf", bid = e.id})
			break
	if demo_ui == "powers": hud.open_powers()
	elif demo_ui == "pause": hud.open_pause()
	elif demo_ui == "end": sim.over = true; sim.winner = me
	elif demo_ui == "lines": show_supply = true
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
	if loading:
		# a save is replayed to its tick as fast as the machine allows (about 25 ms of work per frame)
		var t0 := Time.get_ticks_msec()
		while tick_n < play_to and Time.get_ticks_msec() - t0 < 25 and not sim.over: sim_tick(_play_orders())
		hud.load_lbl.visible = true
		hud.load_lbl.text = "LOADING  %d%%" % int(100.0 * tick_n / maxf(1.0, play_to))
		if tick_n >= play_to or sim.over:
			loading = false; hud.load_lbl.visible = false
			prev.clear()
			rec.orders = play.duplicate()
			print("LOADED tick %d hash %d" % [tick_n, hash_state()])
			if "--quit-after-load" in OS.get_cmdline_user_args(): get_tree().quit()
		return
	if paused: return
	if kind == "replay":
		for i in replay_speed:
			if tick_n >= play_to or sim.over: break
			sim_tick(_play_orders())
		if tick_n >= play_to and not sim.over and not ended: ended = true; hud.open_end(false, "End of replay", "The recording stops here.")
		return
	var ticks := 1
	if headless_mode and (ai_only or demo): ticks = 300 if ai_only else 60     # AI vs AI to a result fast
	elif (ai_only or demo) and shot_t > 0 and sim.t < shot_t - 1.0: ticks = 15 if demo else 60
	for i in ticks:
		if sim.over: break
		if demo: _demo_tick()
		sim_tick(pending)
		pending = []

func _play_orders() -> Array:
	var os: Array = []
	while play_i < play.size() and int(play[play_i][0]) <= tick_n:
		os.append(play[play_i][1]); play_i += 1
	return os

## ONE tick = 1/30 s = 2 sim steps of 1/60 s. Orders apply at the start of the tick, in order, on every machine.
func sim_tick(orders: Array) -> void:
	for o in orders:
		if online == null: rec.orders.append([tick_n, o])
		_apply(o)
	tick_n += 1
	if kind == "range": sim.teams[me].credits = 999999.0
	for e in sim.ents:
		prev[e.id] = Vector3(e.x, e.y, e.ang)
	var m0 := int(sim.t / 60.0)
	if use_bridge:   # P1 BRIDGE: one JS call for both steps, then explosions from the sim's event list
		sim.step_n(2)
		for ev in sim.take_events():
			if ev[0] == "boom" and not headless_mode: _boom(Vector3(float(ev[1]), sim.ground_h(float(ev[1]), float(ev[2])) + 4.0, float(ev[2])), clampf(float(ev[3]) * 0.5, 8.0, 40.0), Color(1.0, 0.6, 0.25))
	else:
		sim.step()
		if not sim.over: sim.step()
	Audio.observe(sim, me, headless_mode and (ai_only or demo))   # P5 HOOK
	if mission != null: mission.tick(1.0 / 30.0)
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
	Audio.set_cam(cam_target, cam_dist, cam)   # P5 HOOK
	if not started and hud != null: hud.tick(dt)
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
		var vis: bool = mine or sim.seen_by(me, e) or ai_only or see_all
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
			# ammo bar (blue) under the health bar: units outside your supply area fight until it is empty
			if mine and issel and e.amx > 0 and kind != "range":
				bars.append([Vector3(p.x, gy + 22.0, p.y), 22.0, Color(0.1, 0.1, 0.1, 0.8), clampf(e.am / e.amx, 0, 1), Color(0.35, 0.65, 1.0) if e.am > 0 else Color(1.0, 0.3, 0.2)])
			if mine and sim.t - e.last_hit < 0.5 and sim.t > alert_t + 8.0 and not _on_screen_xy(e.x, e.y):
				alert_t = sim.t; hud.alert(Vector2(e.x, e.y)); hud.say("Our forces are under attack!  (Space)", "bad")
			# shots: tracer from the shooter to its target, muzzle flash for big guns
			if e.last_fire > float(last_fire.get(e.id, -99.0)):
				last_fire[e.id] = e.last_fire
				var tg = e.target if e.target != null else (e.order.get("target") if e.order != null else null)
				if tg != null and not tg.dead and (ai_only or see_all or vis):
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
	# waypoints still to walk, the armed order's cursor ring, supply area on the ground (L)
	for id in wp:
		if bsel.has(id):
			for q2 in wp[id]: rings.append([Vector3(q2.x, sim.ground_h(q2.x, q2.y) + 1.0, q2.y), 7.0, Color(0.4, 0.9, 1.0)])
	if show_supply:
		for s in sim.supply_points()[me]: rings.append([Vector3(s.x, sim.ground_h(s.x, s.y) + 1.5, s.y), s.z, Color(0.3, 1.0, 0.45, 0.9)])
	if armed != "":
		var ag := _ground_at(get_viewport().get_mouse_position())
		if ag != Vector2.INF: rings.append([Vector3(ag.x, sim.ground_h(ag.x, ag.y) + 2.0, ag.y), 26.0 if armed.begins_with("power") else 12.0, Color(1.0, 0.5, 0.2) if armed != "guard" else Color(0.4, 0.8, 1.0)])
	_draw_rings_bars(rings, bars)
	_draw_fx()
	_ghost_tick()
	_wp_tick()
	_tut_tick()
	_cameo_tick()
	_ui_battle_tick()
	if shot_path != "" and (shot_t < 0 or sim.t >= shot_t) and not loading:
		if shot_frames == 0 and auto_cam: _cam_on_fight()
		if shot_frames == 0 and demo_ui != "": _demo_ui()
		shot_frames += 1
		if shot_frames == (shot_at if shot_t < 0 else 40):
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
		if not visible_ent(e): continue
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
		Audio.ann("funds")   # P5 HOOK
		_msg("Not enough money"); return
	if sim.valid_spot(me, place_kind, g.x, g.y) != 0 and cmd({t = "build", kind = place_kind, x = g.x, y = g.y, dz = dz}):
		_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 14.0, Color(0.95, 0.8, 0.35), 0.5)
		if not keep: place_kind = ""
	else:
		_msg("Can't build there")
		Audio.ann("cantBuild")   # P5 HOOK

func _short(n) -> String:
	var s := str(n)
	return s if s.length() <= 22 else s.substr(0, 21) + "."


# ================================================================= lane P6: camera, controls, orders, HUD glue
func visible_ent(e) -> bool:
	return e.team == me or see_all or ai_only or sim.seen_by(me, e) or (e.is_b and seen_b.has(e.id))

func team_col(team: int) -> Color:
	if team < 0: return COL_NEUTRAL
	if team == me: return COL_ME
	return COL_ALLY if sim.ally(me, team) else COL_EN

# ---------------------------------------------------------------- camera: W A S D / arrows / edges scroll, wheel zooms, Q rotates
func _cam_input(dt: float) -> void:
	cam_yaw = lerp_angle(cam_yaw, cam_yaw_t, clampf(dt * 12.0, 0, 1))
	if hud != null and hud.window != null: return
	var v := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): v.y -= 1
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): v.y += 1
	if Input.is_physical_key_pressed(KEY_A) and not Input.is_key_pressed(KEY_CTRL) or Input.is_physical_key_pressed(KEY_LEFT): v.x -= 1
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): v.x += 1
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	if mouse_in and bool(UI.opt("edge_scroll")) and DisplayServer.window_is_focused() and mp.x >= 0 and mp.y >= 0 and q_down < 0:
		if mp.x < 4: v.x -= 1
		if mp.x > vs.x - 4: v.x += 1
		if mp.y < 4: v.y -= 1
		if mp.y > vs.y - 4: v.y += 1
	if v != Vector2.ZERO:
		v = v.normalized() * dt * (500.0 + cam_dist * 0.9) * float(UI.opt("scroll_speed"))
		# screen-right and screen-down on the ground for the current rotation
		cam_target += Vector2(cos(cam_yaw), -sin(cam_yaw)) * v.x + Vector2(sin(cam_yaw), cos(cam_yaw)) * v.y
	var mw: float = float(map.get("MAPW", 4800)); var mh: float = float(map.get("MAPH", 3320))
	cam_target.x = clampf(cam_target.x, 0, mw)
	cam_target.y = clampf(cam_target.y, 0, mh)

var cam_y := 0.0
func _place_cam() -> void:
	if sim != null:
		cam_y = lerpf(cam_y, sim.ground_h(cam_target.x, cam_target.y), 0.1)
	var pitch := deg_to_rad(lerpf(40.0, 58.0, clampf((cam_dist - 300.0) / 1300.0, 0.0, 1.0)))
	var tgt := Vector3(cam_target.x, cam_y, cam_target.y)
	cam.position = tgt + Vector3(sin(cam_yaw) * cos(pitch) * cam_dist, sin(pitch) * cam_dist, cos(cam_yaw) * cos(pitch) * cam_dist)
	cam.look_at(tgt, Vector3.UP)

func _zoom(f: float) -> void:
	cam_dist = clampf(cam_dist * f, 220.0, 2400.0)

## Q: hold + mouse = rotate, tap = 45 degrees clockwise (Shift+Q the other way), double-tap / Home = north-up
func _q_release(shift: bool) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if not q_moved and now - q_down < 0.3:
		if now - q_tap < 0.35: cam_yaw_t = 0.0
		else: cam_yaw_t = snappedf(cam_yaw_t + (PI / 4.0 if shift else -PI / 4.0), PI / 4.0)
		q_tap = now
	q_down = -1.0

# ---------------------------------------------------------------- input
func _unhandled_input(ev: InputEvent) -> void:
	if not started:
		if ev is InputEventMouseMotion: mouse_in = true
		return
	if ev is InputEventMouseMotion:
		mouse_in = true
		var mm := ev as InputEventMouseMotion
		if q_down >= 0 and absf(mm.relative.x) > 0.0:
			if absf(mm.relative.x) > 1.5: q_moved = true
			cam_yaw_t -= mm.relative.x * 0.006; cam_yaw = cam_yaw_t
		if dragging and mm.position.distance_to(drag_start) > 8 and place_kind == "":
			box.visible = true
			box.position = Vector2(minf(drag_start.x, mm.position.x), minf(drag_start.y, mm.position.y))
			box.size = (mm.position - drag_start).abs()
		if rdrag_on and line_node != null and mm.position.distance_to(rdrag_start) > 24 and _sel_inf().size() >= 2:
			line_node.visible = true
			line_node.points = PackedVector2Array([rdrag_start, mm.position])
		return
	if ev is InputEventMouseButton:
		var mb := ev as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed: _zoom(0.88)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed: _zoom(1.13)
		if ai_only or kind == "replay" or loading: return
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed and armed.begins_with("power"):
				armed = ""; _msg("Cancelled"); return          # powers, strikes, road jobs: right-click launches, left-click cancels
			if place_kind != "":
				if mb.pressed: _place_here(mb.position, mb.shift_pressed)   # deploying is left-click
				return
			if mb.pressed:
				armed = ""
				drag_start = mb.position; dragging = true
			elif dragging:
				dragging = false
				box.visible = false
				if mb.position.distance_to(drag_start) > 8: _box_sel(drag_start, mb.position, mb.shift_pressed)
				else: _click_sel(mb.position, mb.shift_pressed, mb.double_click)
				Audio.speak(0, _sel_units().map(func(e): return e.kind))   # P5 HOOK
		elif mb.button_index == MOUSE_BUTTON_RIGHT:
			if mb.pressed:
				if place_kind != "":
					place_kind = ""; ghost.visible = false
					return
				rdrag_on = true; rdrag_start = mb.position
			elif rdrag_on:
				rdrag_on = false
				if line_node != null: line_node.visible = false
				if armed.begins_with("power"):
					_launch_power(mb.position)
				elif mb.position.distance_to(rdrag_start) > 24 and _sel_inf().size() >= 2:
					_line_formation(rdrag_start, mb.position)
				else:
					_order_units(mb.position, mb.ctrl_pressed, mb.alt_pressed)
		return
	if ev is InputEventKey:
		var k := ev as InputEventKey
		if k.keycode == KEY_Q:
			if k.pressed and not k.echo: q_down = Time.get_ticks_msec() / 1000.0; q_moved = false
			elif not k.pressed and q_down >= 0: _q_release(k.shift_pressed)
			return
		if not k.pressed or k.echo: return
		_key(k)

func _key(k: InputEventKey) -> void:
	var kc := k.keycode
	if kc == KEY_ESCAPE:
		# one step back: placement / armed order, then an open window, then the pause menu (which frees the mouse)
		if place_kind != "": place_kind = ""; ghost.visible = false
		elif armed != "": armed = ""
		elif hud.window != null: hud.close_window()
		else: hud.open_pause()
		return
	if hud.window != null:
		if kc == KEY_P and hud.window_kind == "powers": hud.close_window()
		return
	if kc == KEY_HOME: cam_yaw_t = 0.0
	elif kc == KEY_H:
		var hq = sim.hq_of(me)
		if hq != null: cam_target = Vector2(hq.x, hq.y)
	elif kc == KEY_F10 or kc == KEY_PAUSE: hud.open_pause()
	elif kc == KEY_L: toggle_supply()
	elif kind == "replay":
		if kc == KEY_SPACE: paused = not paused
		elif kc == KEY_EQUAL or kc == KEY_PLUS or kc == KEY_KP_ADD: replay_speed = mini(16, replay_speed * 2)
		elif kc == KEY_MINUS or kc == KEY_KP_SUBTRACT: replay_speed = maxi(1, replay_speed / 2)
	elif ai_only or loading: pass
	elif kc == KEY_SPACE:
		if hud.last_event != Vector2.INF: cam_target = hud.last_event; hud.alerts = 0
	elif kc == KEY_A and k.ctrl_pressed:
		bsel = []
		for e in sim.ents:
			if not e.dead and e.team == me and not e.is_b and e.kind != "harv" and e.kind != "dozer" and not _dug_in(e): bsel.append(e.id)
		Audio.speak(0, _sel_units().map(func(e): return e.kind))   # P5 HOOK
	elif kc == KEY_X: cmd({t = "stop", ids = _sel_ids()}); _wp_clear(_sel_ids())
	elif kc == KEY_F: _arm("amove")
	elif kc == KEY_G: _arm("guard")
	elif kc == KEY_I: order_dig_in()
	elif kc == KEY_E: cmd({t = "ldr", n = 1 if k.shift_pressed else 0, ids = _sel_ids()})
	elif kc == KEY_P: hud.open_powers()
	elif kc == KEY_F5: save_game("Quick save", "quick")
	elif kc == KEY_F9:
		if FileAccess.file_exists(UI.save_dir("saves") + "/quick.json"): load_file(UI.save_dir("saves") + "/quick.json")
		else: _msg("No quick save yet (F5)")
	elif kc >= KEY_1 and kc <= KEY_9:
		var n := kc - KEY_0
		if k.ctrl_pressed:
			groups[n] = _sel_ids(); _msg("Group %d set" % n)
		elif groups.has(n):
			bsel = groups[n].filter(func(id): return sim.by_id.has(id) and not sim.by_id[id].dead)
			var now := Time.get_ticks_msec() / 1000.0
			if group_tap[0] == n and now - float(group_tap[1]) < 0.4 and bsel.size():
				var e0 = sim.by_id[bsel[0]]; cam_target = Vector2(e0.x, e0.y)
			group_tap = [n, now]

func _arm(what: String) -> void:
	if _sel_units().is_empty(): return
	armed = what
	_msg("Attack-move: right-click the target" if what == "amove" else "Guard: right-click a spot or a unit")

func toggle_supply() -> void:
	show_supply = not show_supply
	_msg("Supply area shown on the ground" if show_supply else "Supply area hidden")

func _sel_ids() -> Array:
	return _sel_units().map(func(e): return e.id)

func _sel_inf() -> Array:
	return _sel_units().filter(func(e): return e.s_cls == "inf" or INF.has(e.kind))

func _dug_in(e) -> bool:
	return e.get("dug") != null and e.get("dug") != false and e.get("dug") != 0

func _click_sel(sp: Vector2, add: bool, dbl: bool) -> void:
	var e = _pick_sim(sp)
	var se := _sel_ents()
	# production building selected + left-click ground = rally point (Abdullah 2026-11-14 21:27)
	if e == null and se.size() == 1 and se[0].is_b and se[0].team == me and PROD.has(se[0].kind):
		_rally(se[0], _ground_at(sp))
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
	elif add:
		bsel.erase(e.id)

func _rally(b, g: Vector2) -> void:
	cmd({t = "rally", bid = b.id, x = g.x, y = g.y})
	_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 8.0, Color(0.4, 1.0, 0.5), 0.5)

func _after_order() -> void:
	armed = ""
	if bool(UI.opt("deselect_after_order")): bsel.clear()

## right-click with units: attack an enemy, enter your own building / vehicle, move; F = attack-move, G = guard,
## Ctrl = force-fire, Alt = waypoint (or unload at that spot). With a building selected: rally / leave it.
func _order_units(sp: Vector2, ctrl: bool = false, alt: bool = false) -> void:
	var g := _ground_at(sp)
	if g == Vector2.INF: return
	order_at(g, _pick_sim(sp), ctrl, alt)

func order_at_world(w: Vector2, ctrl: bool = false, alt: bool = false) -> void:
	order_at(w, null, ctrl, alt)

func order_at(g: Vector2, tg, ctrl: bool, alt: bool) -> void:
	var units := _sel_units()
	var se := _sel_ents()
	if units.is_empty():
		if se.size() == 1 and se[0].is_b and se[0].team == me:
			if PROD.has(se[0].kind): _rally(se[0], g)
			else: cmd({t = "unload", ids = [se[0].id], x = g.x, y = g.y})   # leave a building / dugout = select it + right-click ground
		return
	var ids := units.map(func(e): return e.id)
	var fkey := armed == "amove" or Input.is_physical_key_pressed(KEY_F)
	var gkey := armed == "guard" or Input.is_physical_key_pressed(KEY_G)
	if not alt: _wp_clear(ids)
	var mark := Color(0.4, 1.0, 0.5)
	if gkey:
		var o := {t = "guard", ids = ids, x = g.x, y = g.y}
		if tg != null and (tg.team == me or sim.ally(me, tg.team)): o.target = tg.id
		cmd(o); mark = Color(0.4, 0.8, 1.0)
	elif ctrl:
		if tg != null and not ids.has(tg.id): cmd({t = "attack", ids = ids, target = tg.id, force = 1})
		else: cmd({t = "force", ids = ids, x = g.x, y = g.y})
		mark = Color(1.0, 0.3, 0.2)
	elif tg != null and tg.team >= 0 and tg.team != me and not sim.ally(me, tg.team):
		cmd({t = "attack", ids = ids, target = tg.id})
		Audio.speak(2, units.map(func(e): return e.kind))   # P5 HOOK
		g = Vector2(tg.x, tg.y); mark = Color(1.0, 0.3, 0.2)
	elif tg != null and ids.has(tg.id) and units.size() == 1 and not tg.is_b:
		cmd({t = "unload", ids = [tg.id], x = tg.x, y = tg.y})       # leave a vehicle = select it + right-click itself
	elif alt and units.any(func(e): return e.cargo > 0 and e.kind != "harv"):
		cmd({t = "unload", ids = ids, x = g.x, y = g.y})             # ... or Alt + right-click a spot
	elif alt:
		for e in units:
			if not wp.has(e.id): wp[e.id] = []
			wp[e.id].append(g)
			if wp[e.id].size() == 1 and e.order == null: pass
		mark = Color(0.4, 0.9, 1.0)
	elif tg != null and (tg.team == me or sim.ally(me, tg.team)) and not ids.has(tg.id) and (tg.is_b or tg.s_cls != "inf"):
		cmd({t = "enter", ids = ids, target = tg.id, x = tg.x, y = tg.y})   # enter = select units + right-click own building / vehicle / tunnel
		g = Vector2(tg.x, tg.y); mark = Color(0.4, 0.8, 1.0)
	else:
		var n := units.size()
		var cols := int(ceil(sqrt(n)))
		for i in n:
			var e = units[i]
			var off := Vector2((i % cols) - (cols - 1) * 0.5, int(i / cols) - (cols - 1) * 0.5) * 30.0
			cmd({t = "amove" if fkey else "move", ids = [e.id], x = g.x + off.x, y = g.y + off.y})
		if fkey: mark = Color(1.0, 0.5, 0.3)
		Audio.speak(2 if fkey else 1, units.map(func(e): return e.kind))   # P5 HOOK
	_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 2, g.y), 9.0, mark, 0.4)
	_after_order()

## right-drag: the selected infantry form a line between the two points
func _line_formation(a: Vector2, b: Vector2) -> void:
	var ga := _ground_at(a); var gb := _ground_at(b)
	if ga == Vector2.INF or gb == Vector2.INF: return
	var inf := _sel_inf()
	var dir := (gb - ga).normalized()
	inf.sort_custom(func(x, y): return Vector2(x.x, x.y).dot(dir) < Vector2(y.x, y.y).dot(dir))
	var others := _sel_units().filter(func(e): return not inf.has(e))
	_wp_clear(_sel_ids())
	for i in inf.size():
		var p := ga.lerp(gb, float(i) / maxf(1.0, inf.size() - 1.0))
		cmd({t = "move", ids = [inf[i].id], x = p.x, y = p.y, line = 1})
		_boom(Vector3(p.x, sim.ground_h(p.x, p.y) + 2, p.y), 4.0, Color(0.4, 1.0, 0.5), 0.4)
	var mid := (ga + gb) * 0.5 - Vector2(-dir.y, dir.x) * 50.0
	if others.size(): cmd({t = "move", ids = others.map(func(e): return e.id), x = mid.x, y = mid.y})
	_after_order()

func order_dig_in() -> void:
	var inf := _sel_inf()
	if inf.is_empty(): return
	cmd({t = "digin", ids = inf.map(func(e): return e.id)})
	if not sim_has("digin"): _msg("Dig in: the dugout comes with the garrison rules; the squad holds here")

## Alt + right-click waypoints: when a unit has finished its move, it gets the next point (through cmd, like any order)
func _wp_tick() -> void:
	if wp.is_empty() or paused or loading: return
	for id in wp.keys():
		var e = sim.by_id.get(id)
		if e == null or e.dead or wp[id].is_empty(): wp.erase(id); continue
		if e.order == null and not _pending_has(id):
			var p: Vector2 = wp[id].pop_front()
			cmd({t = "move", ids = [id], x = p.x, y = p.y})

func _pending_has(id: int) -> bool:
	for o in pending:
		if o.has("ids") and o.ids.has(id): return true
	return false

func _wp_clear(ids: Array) -> void:
	for id in ids: wp.erase(id)

# ---------------------------------------------------------------- commands (one door: online play hooks in here)
## every player command goes through here: single player queues it for the next tick, online sends it to the relay
func cmd(o: Dictionary) -> bool:
	o.team = me
	if kind == "replay" or loading: return false
	if online != null: return online.send(o)
	pending.append(o)
	return true

## orders the sim port does not know yet fall back to the nearest thing it has (same on every machine):
## guard -> attack-move to the spot, force-fire on the ground -> attack-move, enter -> walk to it.
func _apply(o: Dictionary) -> bool:
	match str(o.t):
		"cancel":
			if not use_bridge: return _cancel_one(o)   # P1 BRIDGE: the JS sim cancels by itself
		"tut_money": sim.teams[int(o.team)].credits += 2500.0; return true
	if sim.apply_order(o): return true
	match str(o.t):
		"guard", "force":
			var x := float(o.get("x", 0)); var y := float(o.get("y", 0))
			if o.has("target") and sim.by_id.has(int(o.target)): x = sim.by_id[int(o.target)].x; y = sim.by_id[int(o.target)].y
			return sim.apply_order({t = "amove", team = o.team, ids = o.ids, x = x, y = y})
		"enter":
			return sim.apply_order({t = "move", team = o.team, ids = o.ids, x = float(o.x), y = float(o.y)})
		"digin":
			return sim.apply_order({t = "stop", team = o.team, ids = o.ids})
	return false

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

## what the sim port can do today (lanes P1 / P2 add these; the buttons light up when the method exists)
func sim_has(f: String) -> bool:
	match f:
		"power": return sim.has_method("power_list")
		"gpow": return sim.has_method("gp_points")
		"lines": return sim.has_method("supply_lines")
		"digin": return sim.has_method("dig_in")
	return false

func power_list() -> Array:
	return sim.power_list(me) if sim_has("power") else []

func gp_points() -> int:
	return int(sim.gp_points(me)) if sim_has("gpow") else 0

func gpow_list() -> Array:
	var F: Dictionary = sim.teams[me].F
	var out: Array = []
	if F.get("natpow") != null: out.append({key = "natpow", name = F.natpow.name, desc = str(F.natpow.get("desc", "National power")), have = true, can = false})
	if F.get("sup") != null: out.append({key = "sup", name = F.sup.name, desc = "Strike: needs the Strike Center", have = false, can = false})
	for k in F.get("gpow", {}):
		var have: bool = sim_has("gpow") and sim.gpow_has(me, k)
		out.append({key = k, name = F.gpow[k].name, desc = str(F.gpow[k].get("desc", "General's power")), have = have, can = gp_points() > 0 and not have})
	return out

func buy_gpow(key: String) -> void:
	cmd({t = "gpow", kind = key})

func arm_power(key: String) -> void:
	armed = "" if armed == "power:" + key else "power:" + key
	if armed != "": _msg("RIGHT-click the target to launch, left-click cancels")

func _launch_power(sp: Vector2) -> void:
	var g := _ground_at(sp)
	var key := armed.substr(6)
	armed = ""
	if g == Vector2.INF: return
	cmd({t = "power", kind = key, x = g.x, y = g.y})
	_boom(Vector3(g.x, sim.ground_h(g.x, g.y) + 3, g.y), 22.0, Color(1.0, 0.5, 0.2), 0.6)

## supply chip: units of yours that ran dry, else OK
func supply_state() -> Array:
	if kind == "range": return ["Unlimited ammo", UI.GREEN]
	var dry := 0
	for e in sim.ents:
		if not e.dead and e.team == me and not e.is_b and e.amx > 0 and e.am >= 0 and e.am <= 0.5: dry += 1
	if dry > 0: return ["%d unit%s out of ammo" % [dry, "" if dry == 1 else "s"], Color("ffb040")]
	return ["Supply lines OK", UI.GREEN]

## minimap supply colours: green yours (and allies'), red the enemy's where you have seen the building
func supply_draw() -> Array:
	var out: Array = []
	if sim_has("lines"):
		for tm in sim.teams.size():
			for ln in sim.supply_lines(tm):
				if tm == me or sim.ally(me, tm) or see_all: out.append({pts = ln.pts, col = Color(0.3, 1.0, 0.45, 0.9), cut = ln.get("cut", false)})
				else: out.append({pts = ln.pts, col = Color(1.0, 0.35, 0.3, 0.9), cut = ln.get("cut", false)})
	var P: Array = sim.supply_points()
	for s in P[me]: out.append({x = s.x, y = s.y, r = s.z, col = Color(0.3, 1.0, 0.45, 0.55)})
	var SR: Dictionary = sim.R.SUP_R
	for e in sim.ents:
		if e.dead or not e.is_b or e.team < 0 or e.team == me or sim.ally(me, e.team) or e.built < 1.0 or not visible_ent(e): continue
		if sim.R.SUP_NOB.has(e.kind): continue
		out.append({x = e.x, y = e.y, r = float(SR.hq) if e.kind == "hq" else (float(SR.depot) if e.kind == "depot" else float(SR.base)), col = Color(1.0, 0.35, 0.3, 0.5)})
	return out

func hint_text() -> String:
	if place_kind != "": return "Left-click: place the building · Shift: keep placing · Right-click or Esc: cancel"
	if armed.begins_with("power"): return "RIGHT-click the target to launch · left-click cancels"
	if armed == "amove": return "Attack-move: right-click the ground or an enemy"
	if armed == "guard": return "Guard: right-click a spot or one of your units"
	if kind == "replay": return ""
	if _sel_units().size(): return "Right-click: move / attack / enter · F attack-move · G guard · Ctrl force-fire · Alt waypoint · X stop · I dig in · right-drag: line"
	return "Left-click or drag: select (Shift adds, double-click: all of a type) · Right-click: move / attack · Right-drag: line formation · Q rotate"

# ---------------------------------------------------------------- command area content (hud.gd draws it)
func cmd_items() -> Dictionary:
	var se := _sel_ents()
	var T: Dictionary = sim.teams[me]
	var F: Dictionary = T.F
	var items: Array = []
	var queue: Array = []
	var dz = null
	for e in se:
		if e.team == me and e.kind == "dozer": dz = e; break
	if kind == "replay" or ai_only: return {title = "", sub = "", items = []}
	if dz != null and se.all(func(e): return e.kind == "dozer"):
		for k in sim.R.BUILD_ORDER:
			if NO_BUILD.has(k) or not F.blds.has(k): continue
			var s: Dictionary = sim.bstats(my_fac, k)
			if s.is_empty(): continue
			var req: bool = sim.req_met(me, k)
			var why := "" if req else "\nNeeds: %s" % str(F.blds.get(str(s.get("req", "")), {}).get("name", s.get("req", "")))
			var kk: String = k
			items.append({id = k, label = _short(s.name), price = "$%d" % int(s.cost), ok = req and (T.credits >= float(s.cost) or kind == "range"), cameo = "b|%s|%s" % [my_fac, k], on = place_kind == k,
				tip = "%s\n%s%s" % [s.name, str(s.get("desc", "")), why], on_click = func(_sh): place_kind = kk; _msg("Left-click the ground to place the " + str(s.name))})
		return {title = "Construction Vehicle", sub = "Pick a building, left-click the ground · Shift keeps placing · right-click cancels", items = items}
	if se.size() == 1 and se[0].is_b and se[0].team == me:
		var b = se[0]
		if b.built < 1.0: return {title = str(b.s.name), sub = "Under construction %d%%" % int(b.built * 100), items = []}
		var sub := ""
		var counts := {}
		for it in b.q: counts[it.kind] = counts.get(it.kind, 0) + 1
		for k in F.roster.get(b.kind, []):
			if NO_TRAIN.has(k): continue
			var s: Dictionary = sim.stats(my_fac, k)
			if s.is_empty(): continue
			if k == F.special and int(T.rank) < 2: continue
			var kk: String = k; var bid: int = b.id
			var c: int = counts.get(k, 0)
			items.append({id = k, label = _short(s.name), price = "$%d" % int(s.cost), ok = T.credits >= float(s.cost), cameo = "u|%s|%s" % [my_fac, k], mark = str(c) if c else "",
				tip = "%s - %d hp%s\nClick: train 1 · Shift+click: 5 · right-click: cancel one" % [s.name, int(s.hp), ", range %d" % int(s.rng) if float(s.get("rng", 0)) > 0 else ""],
				on_click = func(sh):
					for i in (5 if sh else 1): cmd({t = "train", kind = kk, bid = bid}),
				on_right = func(): cmd({t = "cancel", kind = kk, bid = bid})})
		for uk in F.get("upgList", []):
			var U: Dictionary = F.upg.get(uk, {})
			if U.is_empty() or str(U.get("at", "")) != b.kind: continue
			var have: bool = T.upg.has(uk)
			var rq = T.rq.get(b.kind)
			var doing: bool = rq != null and str(rq.key) == uk
			var ukk: String = uk
			var it2 := {id = uk, label = _short(U.name), price = "owned" if have else "$%d" % int(U.cost), ok = not have and not doing and rq == null and T.credits >= float(U.cost), mark = "✓" if have else "",
				tip = "Upgrade: %s\n%s" % [U.name, str(U.get("desc", ""))], on_click = func(_sh): cmd({t = "research", kind = ukk})}
			if doing: it2.prog = clampf(float(rq.t) / maxf(0.1, float(U.get("time", 20))), 0, 1); it2.price = "researching"
			items.append(it2)
		var bid2: int = b.id
		if b.kind != "hq": items.append({id = "sell", label = "Sell", price = "+$%d" % int(float(b.s.get("cost", 0)) * float(sim.R.SELL_PCT)), tip = "Sell the building for half its cost", on_click = func(_sh): cmd({t = "sell", ids = [bid2]}); bsel.clear()})
		if b.hp < b.max: items.append({id = "repair", label = "Repair", price = "", tip = "Repair (costs money)", on_click = func(_sh): cmd({t = "repair", ids = [bid2]})})
		for i in b.q.size():
			var q: Dictionary = b.q[i]
			var qs: Dictionary = sim.stats(my_fac, q.kind)
			var qk: String = q.kind
			queue.append({kind = q.kind, name = str(qs.get("name", q.kind)), cameo = "u|%s|%s" % [my_fac, q.kind], p = clampf(float(q.t) / maxf(0.01, sim.prod_time(T, qs)), 0, 1) if i == 0 else 0.0, cancel = func(): cmd({t = "cancel", kind = qk, bid = bid2})})
		if PROD.has(b.kind): sub = "Its own queue: %d · left-click the ground: rally point" % b.q.size() if b.q.size() else "Click a unit to train it · left-click the ground: rally point"
		return {title = str(b.s.name), sub = sub, items = items, queue = queue}
	var units := _sel_units()
	if units.size():
		var counts2 := {}; var order: Array = []
		for e in units:
			if not counts2.has(e.kind): counts2[e.kind] = 0; order.append(e.kind)
			counts2[e.kind] += 1
		items.append({id = "amove", label = "Attack-move", price = "F", cameo = "", on = armed == "amove", tip = "Attack-move (F): then right-click the ground", on_click = func(_sh): _arm("amove")})
		items.append({id = "guard", label = "Guard", price = "G", on = armed == "guard", tip = "Guard (G): then right-click a spot or a unit", on_click = func(_sh): _arm("guard")})
		items.append({id = "stop", label = "Stop", price = "X", tip = "Stop (X)", on_click = func(_sh): cmd({t = "stop", ids = _sel_ids()}); _wp_clear(_sel_ids())})
		if _sel_inf().size(): items.append({id = "digin", label = "Dig in", price = "I", tip = "Dig in (I): the squad digs a dugout and goes inside", on_click = func(_sh): order_dig_in()})
		if units.any(func(e): return e.cargo > 0 and e.kind != "harv"): items.append({id = "unload", label = "Unload", price = "", tip = "Unload here (or right-click the vehicle itself)", on_click = func(_sh): cmd({t = "unload", ids = _sel_ids()})})
		for k in order:
			if items.size() >= 14: break
			var kk2: String = k
			items.append({id = "sel_" + k, label = _short(sim.stats(my_fac, k).get("name", k)), price = "", cameo = "u|%s|%s" % [my_fac, k], mark = str(counts2[k]), tip = "Click: keep only these selected", on_click = func(_sh): bsel = bsel.filter(func(id): return sim.by_id.has(id) and sim.by_id[id].kind == kk2)})
		var nm := "%d units" % units.size() if units.size() > 1 else str(units[0].s.get("name", units[0].kind))
		return {title = nm, sub = "", items = items}
	if se.size():
		var e0 = se[0]
		return {title = ("Enemy · " if e0.team >= 0 and not sim.ally(me, e0.team) else "") + str(e0.s.get("name", e0.kind)), sub = "", items = []}
	return {title = "", sub = "Select your Construction Vehicle to build, or a building to train units.", items = []}

func portrait() -> Dictionary:
	var se := _sel_ents()
	if se.is_empty(): return {}
	var e = se[0]
	var fac: String = sim.teams[e.team].fac if e.team >= 0 else my_fac
	var info := "%d / %d hp" % [int(e.hp), int(e.max)]
	if not e.is_b:
		if e.amx > 0 and kind != "range": info += " · ammo %d%%" % int(100.0 * maxf(0, e.am) / e.amx)
		if e.rank > 0: info += " · " + ["", "veteran", "elite", "heroic"][mini(3, e.rank)]
	if se.size() > 1: info = "%d selected · %s" % [se.size(), info]
	return {name = str(e.s.get("name", e.kind)), hp = clampf(e.hp / maxf(1.0, e.max), 0, 1), info = info, cameo = ("b|%s|%s" if e.is_b else "u|%s|%s") % [fac, e.kind] if e.team >= 0 else ""}

# ---------------------------------------------------------------- cameos: each model photographed once in a small viewport
func cameo(key: String):
	if key == "" or headless_mode: return null
	if cameo_tex.has(key): return cameo_tex[key]
	if not cameo_q.has(key) and cameo_busy != key: cameo_q.append(key)
	return null

func _cameo_setup() -> void:
	cameo_vp = SubViewport.new()
	cameo_vp.size = Vector2i(120, 116)
	cameo_vp.own_world_3d = true
	cameo_vp.transparent_bg = true
	cameo_vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
	cameo_vp.msaa_3d = Viewport.MSAA_2X
	add_child(cameo_vp)
	cameo_cam = Camera3D.new()
	cameo_cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0, 0, 0, 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1, 0.97, 0.9); env.ambient_light_energy = 0.75
	cameo_cam.environment = env
	cameo_vp.add_child(cameo_cam)
	var sun2 := DirectionalLight3D.new()
	sun2.rotation_degrees = Vector3(-50, -35, 0)
	sun2.light_energy = 1.3
	cameo_vp.add_child(sun2)
	cameo_mi = MeshInstance3D.new()
	cameo_vp.add_child(cameo_mi)

func _cameo_tick() -> void:
	if headless_mode: return
	if cameo_vp == null: _cameo_setup()
	if cameo_busy != "":
		cameo_wait -= 1
		if cameo_wait <= 0:
			var img := cameo_vp.get_texture().get_image()
			cameo_tex[cameo_busy] = ImageTexture.create_from_image(img)
			cameo_busy = ""; cameo_ver += 1
		return
	if cameo_q.is_empty(): return
	var key: String = cameo_q.pop_front()
	var p := key.split("|")
	var kk: Array
	if p[0] == "b":
		var s: Dictionary = sim.bstats(p[1], p[2])
		kk = _bld_key(p[1], p[2], float(s.get("size", 60)))
	else: kk = _unit_key(p[1], p[2])
	var info := _dk_info(kk[0], kk[1])
	var mesh: Mesh = info["mesh"]
	cameo_mi.mesh = mesh
	var bb := mesh.get_aabb()
	var c := bb.get_center()
	var rad := maxf(bb.size.length() * 0.5, 1.0)
	cameo_cam.size = rad * 1.75
	cameo_cam.near = 0.1; cameo_cam.far = rad * 8.0
	cameo_cam.position = c + Vector3(0.75, 0.62, 1.0).normalized() * rad * 3.0
	cameo_cam.look_at(c, Vector3.UP)
	cameo_vp.render_target_update_mode = SubViewport.UPDATE_ONCE
	cameo_busy = key; cameo_wait = 3

# ---------------------------------------------------------------- HUD shell (main.gd's ui / lbl_fps / msg_lbl / box + hud.gd)
func _battle_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	lbl_fps = UI.label("", 12, UI.TEXT_DIM)
	lbl_fps.position = Vector2(10, 8)
	ui.add_child(lbl_fps)
	hud = Hud.new(self)
	add_child(hud)
	hud.build(ui)
	Audio.add_button(ui)   # P5 HOOK (Sound: volumes)
	msg_lbl = UI.label("", 16, Color(1, 0.95, 0.75), "display")
	msg_lbl.anchor_left = 0.5; msg_lbl.anchor_right = 0.5
	msg_lbl.offset_left = -400; msg_lbl.offset_right = 400; msg_lbl.offset_top = 62
	msg_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	msg_lbl.add_theme_constant_override("outline_size", 5)
	msg_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
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
	line_node = Line2D.new()
	line_node.width = 2.0
	line_node.default_color = Color(0.5, 1.0, 0.6, 0.9)
	line_node.visible = false
	ui.add_child(line_node)

func _ui_battle_tick() -> void:
	var dt := get_process_delta_time()
	lbl_fps.visible = bool(UI.opt("show_fps")) or ai_only
	lbl_fps.text = "%d FPS" % Engine.get_frames_per_second()
	msg_t -= dt
	if msg_t <= 0: msg_lbl.text = ""
	hud.tick(dt)

# ---------------------------------------------------------------- Test range panel (unlimited money, a target nation that does not act)
var range_panel: PanelContainer
func _range_panel() -> void:
	range_panel = UI.panel(10)
	range_panel.name = "Range"
	range_panel.position = Vector2(10, 34)
	hud.root.add_child(range_panel)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 4)
	range_panel.add_child(vb)
	vb.add_child(UI.label("TEST RANGE", 18, UI.GOLD_HI, "display"))
	vb.add_child(UI.label("%s  vs  %s" % [UI.nat_name(my_fac), UI.nat_name(sim.teams[1].fac)], 12, UI.TEXT_DIM))
	vb.add_child(UI.label("SPAWN AT THE CAMERA", 11, UI.TEXT_DIM))
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 4); g.add_theme_constant_override("v_separation", 4)
	vb.add_child(g)
	var F: Dictionary = sim.teams[me].F
	for k in F.units:
		if NO_TRAIN.has(k): continue
		var kk: String = k
		var b := UI.button(_short(F.units[k].name).substr(0, 16), func(): _range_spawn(me, kk, 1), 11, 132)
		b.name = "Spawn_" + k
		b.tooltip_text = "Spawn one %s (Shift: five)" % F.units[k].name
		b.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and ev.shift_pressed: _range_spawn(me, kk, 4))
		g.add_child(b)
	vb.add_child(UI.hsep())
	var tb := UI.button("+ Target group", func():
		for it in [["inf", 6], ["at", 2], ["tank", 3]]: _range_spawn(1, it[0], it[1], 320.0), 12)
	tb.name = "Targets"
	vb.add_child(tb)
	vb.add_child(UI.button("+ Target building", func():
		var p := cam_target + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * 380.0
		for r in 30:
			var q := p + Vector2(cos(r * 2.4), sin(r * 2.4)) * r * 14.0
			if sim.valid_spot(1, "barracks", q.x, q.y) != 0: sim.add_bld(1, "barracks", q.x, q.y, true); break, 12))
	vb.add_child(UI.button("Clear targets", func():
		for e in sim.ents:
			if e.team == 1 and not e.dead and not (e.is_b and e.kind == "hq"): sim.kill(e, me, null), 12))
	var fb := UI.button("Target fights back: off", Callable(), 12)
	fb.name = "FightBack"
	fb.pressed.connect(func():
		sim.teams[1].ai = range_ai if sim.teams[1].ai == null else null
		fb.text = "TARGET FIGHTS BACK: " + ("ON" if sim.teams[1].ai != null else "OFF"))
	vb.add_child(fb)
	vb.add_child(UI.button("Heal my units", func():
		for e in sim.ents:
			if e.team == me and not e.dead: e.hp = e.max, 12))

func _range_spawn(team: int, k: String, n: int, ahead: float = 0.0) -> void:
	if sim.stats(sim.teams[team].fac, k).is_empty(): return
	var p := cam_target + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * ahead
	for i in n:
		var q := p + Vector2(randf_range(-60, 60), randf_range(-60, 60))
		if sim.nav.pass_xy(0, q.x, q.y): sim.add_unit(team, k, q.x, q.y)

# ---------------------------------------------------------------- Tutorial (the 7 steps of the browser game's Battle tutorial)
func _tut_ok() -> bool:
	match str(Missions.TUT[tut_i][0]):
		"gen": return sim.done(me, "gen")
		"dep": return sim.done(me, "depot")
		"bar": return sim.done(me, "barracks")
		"fac": return sim.done(me, "factory")
		"sup": return show_supply
		"veh": return _tut_mob() > tut_k0
	return false

func _tut_mob() -> int:
	var n := 0
	for e in sim.ents:
		if not e.dead and e.team == me and not e.is_b and e.s_cls != "inf" and e.kind != "harv" and e.kind != "dozer": n += 1
	return n

func _tut_tick() -> void:
	if tut_i < 0 or loading or paused: return
	if _tut_ok(): tut_next(false)

func tut_next(skip: bool) -> void:
	if tut_i < 0: return
	if tut_i >= Missions.TUT.size() - 1:
		if skip: tut_end()
		return
	tut_i += 1
	var k: String = Missions.TUT[tut_i][0]
	if k == "veh": tut_k0 = _tut_mob()
	if k == "atk" and not rec.orders.any(func(o): return str(o[1].t) == "tut_money"): cmd({t = "tut_money"})
	if not skip: hud.say("Well done.", "g")

func tut_end() -> void:
	tut_i = -1

# ---------------------------------------------------------------- end of battle: stats, replay file, record + medals
func _show_end() -> void:
	if ended: return
	ended = true
	UI.lock_mouse(false)
	var won: bool = sim.winner >= 0 and (sim.winner == me or sim.ally(me, sim.winner))
	var head := "Victory" if won else "Defeat"
	var sub := "Every enemy building is destroyed." if won else "Your last building fell."
	if mission != null:
		head = "Mission complete" if won else "Mission failed"
		sub = str(mission.m.win) if won else str(mission.m.lose) + ("  " + mission.why if mission.why != "" else "")
	if kind == "replay": head = "End of replay"; sub = "%s won." % str(sim.teams[sim.winner].F.name) if sim.winner >= 0 else "No winner."
	elif online == null and not ai_only and kind != "range":
		# the finished battle is its own replay; keep the newest 20
		UI.write_file("replays", "replay_%d" % int(Time.get_unix_time_from_system()), _rec_data(""))
		var fs := UI.list_files("replays")
		for i in range(20, fs.size()): DirAccess.remove_absolute(fs[i].path)
		var T: Dictionary = sim.teams[me]
		UI.bump("games"); UI.bump("wins" if won else "losses"); UI.bump("kills", float(T.kills)); UI.bump("lost", float(T.lost)); UI.bump("built", float(T.built)); UI.bump("time", sim.t)
		if won:
			if diff >= 2: UI.bump("wins_hard")
			if diff >= 3: UI.bump("wins_brutal")
			if sim.t < 600: UI.bump("wins_fast")
			if tut_i >= 0 or kind == "tutorial": UI.bump("tutorial")
			if mission != null:
				var c := UI.record()
				var key := "%s_%s" % [mission.m.id, ["Easy", "Medium", "Hard"][clampi(diff, 0, 2)]]
				var best := float(c.get_value("m", key, 0.0))
				if best <= 0 or mission.t < best: c.set_value("m", key, mission.t)
				var all := Missions.LIST.all(func(mm): return ["Easy", "Medium", "Hard"].any(func(dn): return float(c.get_value("m", "%s_%s" % [mm.id, dn], 0.0)) > 0))
				if all: c.set_value("r", "missions_all", 1.0)
				c.save("user://record.cfg")
	if not headless_mode: hud.open_end(won, head, sub)
