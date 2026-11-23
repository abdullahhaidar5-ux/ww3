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
const UnitsView = preload("res://scripts/battle/units_view.gd")   # LANE A: X1 3D models + animated soldiers
const WorldView = preload("res://scripts/battle/world_view.gd")   # LANE B: P4c sky/lighting/GPU FX + X1 buildings
const LookFx = preload("res://scripts/battle/look_fx.gd")
const UI = preload("res://scripts/ui/ui_kit.gd")
const Hud = preload("res://scripts/ui/hud.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const BattleIntro = preload("res://scripts/ui/battle_intro.gd")

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
var map_min := 2             # fewest players the sim starts this map with (bridge)
var map_n := 2               # most players of the map (bridge: the sim's map list; --gdsim: the json's bases)
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
var intro = null   # battle_intro.gd loading screen (faction quote), fades out once the battle runs
var shot_seq := 1
var shot_every := 6
var shot_follow := ""
var shot_follow_id := -999
var shot_zoom := 260.0
var ff := 0               # CHECK HOOK: ?ff=N (with shot-t, AI vs AI on the bridge) = N ticks in ONE worker call per frame, so the check does not wait on drawn frames
var ff_k := 1
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
var units_view := UnitsView.new()   # LANE A HOOK
var world_view := WorldView.new()   # LANE B HOOK
var battle_tod := "day"
var battle_weather := "clear"
var crate_key := ""
var auto_cam := false
var demo_ui := ""
var demo_sw := ""
var demo_sw_done := false

# player state (lane P6)
var hud
var armed := ""           # "" | "amove" | "guard" | "power:<key>" - the next right-click does it, left-click cancels
var cam_yaw := 0.0        # Q / Middle-mouse rotates the battle camera (view only)
var cam_yaw_t := 0.0
var cam_pitch_off := 0.0  # Up/down camera tilt offset in degrees (-32 = low cinematic horizon .. +28 = steep top-down)
var cam_pitch_off_t := 0.0
var mmb_down := false
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
var range_ai_on := false
var alert_t := -99.0
var selftest = null
var _cursor_cache := {}
var _cur_cursor := ""

# Mobile touch RTS state (zero interference with PC mouse controls)
var touch_box_mode := false
var _touches := {}            # finger_id -> Vector2 screen pos
var _touch_ui := {}           # finger_id -> true if finger pressed down inside HUD / UI
var _touch_start := Vector2.ZERO
var _touch_moved := false
var _touch_multi := false
var _touch_hold_t := 0.0
var _touch_long_box := false
var _pan_vel := Vector2.ZERO
var _pinch_dist := 0.0
var _pinch_ang := 0.0
var _pinch_mid := Vector2.ZERO
var _last_tap_t := -9.0
var _last_tap_pos := Vector2.ZERO

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
		elif a.begins_with("--tod="): battle_tod = a.substr(6)
		elif a.begins_with("--weather="): battle_weather = a.substr(10)
		elif a.begins_with("--shot="): shot_path = a.substr(7)
		elif a.begins_with("--shot-t="): shot_t = float(a.substr(9))
		elif a.begins_with("--shotseq="): shot_seq = int(a.substr(10))
		elif a.begins_with("--shotevery="): shot_every = maxi(1, int(a.substr(12)))
		elif a.begins_with("--follow="): shot_follow = a.substr(9)
		elif a.begins_with("--zoom="): shot_zoom = float(a.substr(7))
		elif a.begins_with("--ff="): ff = int(a.substr(5))   # CHECK HOOK
		elif a.begins_with("--shotf="): shot_at = int(a.substr(8))
		elif a == "--cam=auto": auto_cam = true
		elif a.begins_with("--demo-ui="): demo_ui = a.substr(10)
		elif a.begins_with("--demo-sw="): demo_sw = a.substr(10)
		elif a.begins_with("--pitch="):
			cam_pitch_off = clampf(float(a.substr(8)), -32.0, 28.0)
			cam_pitch_off_t = cam_pitch_off
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
	use_bridge = false   # ORCH: online play runs on the GDScript sim (lane P7's tested lockstep, desktop + web) until it moves to the bridge
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
	last_launch = {kind = "battle", map = map_key, players = [], diff = diff, seed = seed_v}   # seats are worked out in _start once the map's player count is known
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
		if f.is_empty() or not (int(f.get("v", 0)) in [1, 2]): leave(); return
		var k2 := kind
		var L2 := {kind = str(f.get("kind", "battle")), map = f.map, players = f.players, starts = f.get("starts", []), diff = int(f.get("diff", 1)), seed = int(f.get("seed", 1)), mission = str(f.get("mission", ""))}
		play = []
		for it in f.get("orders", []): play.append([int(it[0]), _norm(it[1])])
		play_i = 0; play_to = int(f.get("ticks", 0))
		if k2 == "load":
			var snap := str(f.get("snap", ""))
			if snap != "" and use_bridge:
				await start_launch(L2)
				if started and sim != null and sim.has_method("load_snapshot") and sim.load_snapshot(snap):
					tick_n = int(f.get("ticks", 0))
					rec.orders = play.duplicate()
					prev.clear(); last_pos.clear(); bsel.clear()
					_msg("Game loaded")
					print("LOADED snapshot tick %d" % tick_n)
					if "--quit-after-load" in OS.get_cmdline_user_args(): get_tree().quit()
				elif started:
					loading = true
				last_launch = {kind = "load", file = L.file}
			else:
				loading = true
				await start_launch(L2)
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
		see_all = true
		range_ai_on = false
		if not use_bridge: range_ai = sim.mk_team(1, sim.teams[1].fac, true, sim.teams[1].tm).ai
		if not headless_mode: _range_panel()

## JSON gives floats: ids and targets must be ints again
func _norm(o: Dictionary) -> Dictionary:
	var out := o.duplicate()
	for k in ["team", "target", "bid", "dz", "n"]:
		if out.has(k): out[k] = int(out[k])
	if out.has("ids"): out.ids = Array(out.ids).map(func(v): return int(v))
	return out

func _start(players: Array, starts: Array) -> void:
	# loading screen first, so the player sees his flag + a faction quote instead of a blank screen while the battle is built
	if not headless_mode and intro == null and shot_path == "" and selftest == null:
		if OS.has_feature("web"):
			JavaScriptBridge.eval("window.__ww3HideBoot&&window.__ww3HideBoot()", true)
		var mf := my_fac; var ef := en_fac
		for pl in players:
			if not bool(pl.get("ai", true)): mf = str(pl.fac); break
		for pl in players:
			if str(pl.fac) != mf: ef = str(pl.fac); break
		var mi: Dictionary = UI.map_info(map_key)
		var kl: String = {"range": "Test Range", "battle": "Skirmish", "mission": "Mission", "tutorial": "Training", "load": "Saved Battle", "replay": "Replay", "online": "Online Battle"}.get(kind, "Battle")
		intro = BattleIntro.make(self, mf, ef, str(mi.get("name", "")), kl, map_key)
		await get_tree().process_frame
		await get_tree().process_frame
	elif OS.has_feature("web"):
		JavaScriptBridge.eval("window.__ww3HideBoot&&window.__ww3HideBoot()", true)
	# KAIZEN 2: on the bridge the map (size, heights, ground, roads, water, woods, bases) comes from the JS sim, any
	# map it offers; the 3 json maps in res://data are only for the parked --gdsim path. No silent Split Ridge.
	map = {}; map_n = 2; map_min = 2
	if use_bridge:
		sim = BridgeSim.new()
		if not sim.available():
			_web_only(); return
		while not sim.br.booted(): await get_tree().process_frame
		var row: Dictionary = sim.map_row(map_key)
		if not row.is_empty(): map_n = int(row.max); map_min = int(row.get("min", 2))
		elif not players.is_empty(): map_n = players.size()   # a map outside the sim's public list: the sim itself says if the key is unknown
	else:
		map = Sim.load_json("res://data/map_%s.json" % map_key)
		if map.is_empty(): map_key = "bm_splitridge"; map = Sim.load_json("res://data/map_bm_splitridge.json")
		map_n = map.bases.size()
	if players.is_empty(): players = _players()
	players = players.slice(0, map_n)
	if kind == "range" and players.size() > 1:
		players = players.duplicate(true)
		players[1].ai = false
	# start spots: a chosen spot per seat, the rest in map order (seeded shuffle only when someone asked for Random explicitly)
	if not use_bridge and starts.size() == players.size() and starts.any(func(s): return int(s) >= 0):
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
		if not sim.init(map_key, players, seed_v, diff, starts):
			_web_only(); return
		while not sim.ready():   # the sim runs in a Web Worker: it answers a few frames later
			if sim.err != "": _start_failed(sim.err); return
			await get_tree().process_frame
		map = sim.map
		if str(map.get("key", "")) != map_key: _start_failed("The simulation started map \"%s\" instead of \"%s\"." % [str(map.get("key", "")), map_key]); return
		print("BATTLE map: %s \"%s\" %dx%d, %d bases, %d players" % [map_key, str(map.get("name", "")), int(map.MAPW), int(map.MAPH), map.bases.size(), players.size()])
	else:
		sim = Sim.new()
		sim.init(map, players, seed_v, diff)
	if kind == "range" and not use_bridge:
		sim.teams[1].ai = null
	rec = {v = 1, kind = kind, map = map_key, players = players, starts = starts, seed = seed_v, diff = diff, mission = "", fac = my_fac, orders = []}
	tick_n = 0
	if not headless_mode:
		BattleIntro.set_stage("Surveying terrain & roads")
		for a in OS.get_cmdline_user_args():   # CHECK HOOK: --theme=desert|green|snow repaints the map's look (pictures of every biome)
			if a.begins_with("--theme="): map["theme"] = a.substr(8)
		Terrain.build(self, sim, map, func(k: String): return _build_mesh(k, "y", randf_range(36, 52)))
		BattleIntro.set_stage("Deploying armor & infantry")
		var w_opts := {tod = str(last_launch.get("tod", battle_tod)), weather = str(last_launch.get("weather", battle_weather))}
		world_view.setup(self, sim, map, w_opts)   # LANE B HOOK (P4c sky/lighting/weather/GPU FX + X1 buildings)
		units_view.setup(self)                     # LANE A HOOK (X1 3D units + animated soldiers)
	var b: Array = sim.bases[me]
	if not args_has_cam():
		cam_target = Vector2(float(b[0]), float(b[1])) + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * 200.0
		cam_dist = 760.0
	_make_ghost()
	started = true
	BattleIntro.mark_ready()
	if intro != null and is_instance_valid(intro): intro.set_ready()
	Audio.battle_start(sim, me)   # P5 HOOK
	if not ai_only and not demo and selftest == null: UI.lock_mouse(true)
	print("BATTLE start: %s (%s) vs %s, %s, difficulty %d, seed %d%s" % [UI.nat_name(my_fac), "AI" if ai_only else "you", UI.nat_name(en_fac), kind, diff, seed_v, "" if not headless_mode else " [headless]"])

## P1 BRIDGE: desktop / headless Godot cannot run the JavaScript simulation
func _web_only() -> void:
	_start_failed(BridgeSim.Bridge.WEB_ONLY, "\n(Developers: --gdsim runs the old GDScript rules instead.)")

## the battle could not start (web-only sim on desktop, unknown map key...): say why on screen, never start another map
func _start_failed(msg: String, more: String = "\nPress Esc for the menu.") -> void:
	push_error(msg); print("BATTLE: " + msg)
	if headless_mode: get_tree().quit(1); return
	BattleIntro.dismiss_immediate()
	intro = null   # never hide the reason behind the loading screen
	var l := Label.new(); l.text = msg + more
	l.autowrap_mode = TextServer.AUTOWRAP_WORD; l.set_anchors_preset(Control.PRESET_CENTER); l.custom_minimum_size = Vector2(700, 0)
	add_child(l)

## command-line seats: you (0), then the AIs. 2v2: your side's partner nation is your ally.
func _players() -> Array:
	var nats := UI.nations()
	var nb: int = map_n
	if map_min <= 2 and (nb < 4 or mode == "1v1"): return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}]
	if mode == "2v2" and map_min <= 4:
		var ally_f: String = PAIR.get(my_fac, my_fac) if PAIR.get(my_fac, my_fac) != en_fac else my_fac
		var en2: String = PAIR.get(en_fac, en_fac) if PAIR.get(en_fac, en_fac) != my_fac else en_fac
		return [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}, {fac = ally_f, ai = true, tm = 1}, {fac = en2, ai = true, tm = 2}]
	var rest: Array = nats.filter(func(f): return f != my_fac and f != en_fac)
	var out := [{fac = my_fac, ai = ai_only, tm = 1}, {fac = en_fac, ai = true, tm = 2}]
	for i in clampi(4, map_min, nb) - 2: out.append({fac = rest[i % rest.size()], ai = true, tm = 3 + i})   # free for all: 4 players, or the fewest the map takes (6 / 8 player maps)
	return out

func args_has_cam() -> bool:
	return Array(OS.get_cmdline_user_args()).any(func(a): return String(a).begins_with("--cam="))

func _panel_style() -> StyleBoxFlat:
	return UI.panel_style()

func restart() -> void:
	_set_cursor("arrow")
	units_view.clear(); world_view.clear()
	UI.launch = last_launch.duplicate(true)
	if online != null: online.queue_free()
	get_tree().reload_current_scene()

func leave() -> void:
	_set_cursor("arrow")
	units_view.clear(); world_view.clear()
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
	var d := _rec_data(nm)
	if use_bridge and sim.has_method("save_snapshot"):
		var snap := str(sim.save_snapshot())
		if snap != "": d.snap = snap
	var p := UI.write_file("saves", fname if fname != "" else "save_%d" % int(Time.get_unix_time_from_system()), d)
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
	ff_k = 1
	if ff > 0 and use_bridge and ai_only and shot_t > 0 and sim.t < shot_t - 1.0: ticks = 1; ff_k = ff   # CHECK HOOK
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
	if kind == "range":
		if sim.has_method("range_cmd") and float(sim.teams[me].credits) < 500000.0:
			sim.range_cmd({cmd = "money", team = me, amt = 999999.0})
		sim.teams[me].credits = 999999.0
	for e in sim.ents:
		prev[e.id] = Vector3(e.x, e.y, e.ang)
	var m0 := int(sim.t / 60.0)
	if use_bridge:   # P1 BRIDGE: one JS call for both steps, audio observes events before drain
		sim.step_n(2 * ff_k)
		Audio.observe(sim, me, headless_mode and (ai_only or demo))   # P5 HOOK (KAIZEN 8: before take_events)
		var evs: Array = sim.take_events()
		if not headless_mode:
			world_view.on_step(sim, evs, me, see_all, ai_only)   # LANE B HOOK (LookFx GPU particles, tracers, craters, fog, supply lines)
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
	if use_bridge and sim != null and sim.has_method("state_hash_int"):
		return int(sim.state_hash_int())
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
	units_view.begin_frame(self)   # LANE A HOOK
	world_view.begin_frame()       # LANE B HOOK
	var per := {}
	for k in bmm: per[k] = []
	var rings: Array = []
	var bars: Array = []
	var fr := {per = per, rings = rings, bars = bars}   # this frame's draw lists: the lanes' _draw_* functions append to them
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
		if e.is_b: _draw_bld(fr, e, fac, p, gy, col, issel, mine)   # LANE B (world_view.gd)
		else:
			_draw_unit(fr, e, fac, p, ang, gy, col, issel, mine, vis)   # LANE A (units_view.gd)
			if mine and sim.t - e.last_hit < 0.5 and sim.t > alert_t + 8.0 and not _on_screen_xy(e.x, e.y):
				alert_t = sim.t; hud.alert(Vector2(e.x, e.y)); hud.say("Our forces are under attack!  (Space)", "bad")
	_draw_map_objects(fr)   # LANE B: oil derricks, capturable buildings, supply piles
	units_view.end_frame()   # LANE A HOOK
	world_view.end_frame()   # LANE B HOOK
	world_view.tick(dt, cam, show_supply)   # LANE B HOOK (P4c env + GPU FX + supply lines)
	for k in bmm:
		if per.has(k): _fill(bmm[k], per[k])
	if not use_bridge or world_view.fx == null:
		_draw_world_fx(fr, alive)   # legacy fallback when LookFx is inactive
	_draw_orders_overlay(fr)   # LANE C: waypoints, the armed order's cursor ring
	_draw_rings_bars(rings, bars)
	_draw_fx()
	_ghost_tick()
	_wp_tick()
	_tut_tick()
	_cameo_tick()
	_ui_battle_tick()
	_cursor_tick()
	if demo_sw != "" and not demo_sw_done and world_view.fx != null and sim.t >= 0.05:
		demo_sw_done = true
		_demo_fire_sw(demo_sw)
	if shot_path != "" and (shot_t < 0 or sim.t >= shot_t) and not loading:
		if shot_frames == 0 and auto_cam: _cam_on_fight()
		if shot_frames == 0 and demo_ui != "": _demo_ui()
		_shot_follow_tick()
		shot_frames += 1
		var first_f: int = shot_at if shot_t < 0 else 40
		if shot_seq > 1:
			# CHECK HOOK: --shotseq=N --shotevery=F saves N pictures F frames apart (motion checks: name_00.png ...)
			if shot_frames >= first_f and (shot_frames - first_f) % shot_every == 0:
				var si: int = (shot_frames - first_f) / shot_every
				var sp := shot_path.get_basename() + "_%02d.png" % si
				get_viewport().get_texture().get_image().save_png(sp)
				print("BATTLE shot " + sp + " at %.2f s" % sim.t)
				if si >= shot_seq - 1: get_tree().quit()
		elif shot_frames == first_f:
			get_viewport().get_texture().get_image().save_png(shot_path)
			print("BATTLE shot " + shot_path + " at %.0f s" % sim.t)
			get_tree().quit()

## CHECK HOOK: --follow=tank|veh|inf|any keeps the camera close on one moving unit (picture sequences of real motion)
func _shot_follow_tick() -> void:
	if shot_follow == "": return
	var fe = null
	for e in sim.ents:
		if e.id == shot_follow_id and not e.dead: fe = e; break
	if fe == null:
		var best := 1e18
		for e in sim.ents:
			if e.dead or e.is_b or String(e.s_dom) != "ground" or absf(float(e.v)) < 8.0: continue
			var is_inf := String(e.s_cls) == "inf"
			if shot_follow == "inf" and not is_inf: continue
			if shot_follow == "tank" and String(e.s_cls) != "tank": continue
			if shot_follow == "veh" and is_inf: continue
			var d := Vector2(e.x, e.y).distance_squared_to(cam_target)
			if d < best: best = d; fe = e
		if fe != null: shot_follow_id = fe.id
	if fe != null:
		cam_target = Vector2(fe.x, fe.y)
		cam_dist = shot_zoom

## LANE B: one building this frame (X1 3D models + nation flags via world_view.gd)
func _draw_bld(fr: Dictionary, e, fac: String, p: Vector2, gy: float, col: Color, issel: bool, mine: bool) -> void:
	world_view.draw_bld(self, fr, e, fac, p, gy, col, issel, mine); return   # LANE B HOOK

func _draw_bld_fallback(fr: Dictionary, e, fac: String, p: Vector2, gy: float, col: Color, issel: bool, mine: bool) -> void:
	var per: Dictionary = fr.per; var rings: Array = fr.rings; var bars: Array = fr.bars
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

## LANE A: one unit / vehicle / aircraft / drone this frame (X1 3D models + animated soldiers via units_view.gd)
func _draw_unit(fr: Dictionary, e, fac: String, p: Vector2, ang: float, gy: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	units_view.draw_unit(self, fr, e, fac, p, ang, gy, col, issel, mine, vis); return   # LANE A HOOK

func _draw_unit_fallback(fr: Dictionary, e, fac: String, p: Vector2, ang: float, gy: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	var per: Dictionary = fr.per; var rings: Array = fr.rings; var bars: Array = fr.bars
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
	# shots: tracer from the shooter to its target, muzzle flash for big guns
	if e.last_fire > float(last_fire.get(e.id, -99.0)):
		last_fire[e.id] = e.last_fire
		var tg = e.target if e.target != null else (e.order.get("target") if e.order != null else null)
		if tg != null and not tg.dead and (ai_only or see_all or vis):
			var big: bool = e.s_cls in ["tank", "arty", "aa"]
			var from := Vector3(p.x, gy + (9.0 if big else 7.0), p.y)
			tracers.append([from, Vector3(tg.x, sim.ground_h(tg.x, tg.y) + 6.0, tg.y), t, Color(1.0, 0.85, 0.45, 0.9)])
			if big: _boom(from + Vector3(cos(ang) * 14.0, 0, sin(ang) * 14.0), 6.0, Color(1.0, 0.75, 0.35), 0.12)

## LANE B: map buildings and supply piles (X1 _map models via world_view.gd)
func _draw_map_objects(fr: Dictionary) -> void:
	world_view.draw_map_objects(self, fr); return   # LANE B HOOK

## LANE B: shells / missiles in flight, impacts, deaths, the supply area on the ground (L)
func _draw_world_fx(fr: Dictionary, alive: Dictionary) -> void:
	var per: Dictionary = fr.per; var rings: Array = fr.rings; var bars: Array = fr.bars
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
	if show_supply:
		for s in sim.supply_points()[me]: rings.append([Vector3(s.x, sim.ground_h(s.x, s.y) + 1.5, s.y), s.z, Color(0.3, 1.0, 0.45, 0.9)])

## LANE C: waypoints still to walk, the armed order's cursor ring, placement footprint, rally path
func _draw_orders_overlay(fr: Dictionary) -> void:
	var per: Dictionary = fr.per; var rings: Array = fr.rings; var bars: Array = fr.bars
	# waypoints still to walk, the armed order's cursor ring, supply area on the ground (L)
	for id in wp:
		if bsel.has(id):
			for q2 in wp[id]: rings.append([Vector3(q2.x, sim.ground_h(q2.x, q2.y) + 1.0, q2.y), 7.0, Color(0.4, 0.9, 1.0, 0.85)])
	# Zero Hour dotted rally path from selected production building to its rally flag
	var se := _sel_ents()
	if se.size() == 1 and se[0].is_b and se[0].team == me and se[0].rally != null:
		var b = se[0]
		var bp := Vector2(float(b.x), float(b.y))
		var rp := Vector2(float(b.rally.x), float(b.rally.y))
		var dist := bp.distance_to(rp)
		var steps := clampi(int(dist / 52.0), 1, 10)
		for si in range(1, steps):
			var q3 := bp.lerp(rp, float(si) / float(steps))
			rings.append([Vector3(q3.x, sim.ground_h(q3.x, q3.y) + 1.2, q3.y), 3.2, Color(0.38, 1.0, 0.52, 0.55)])
	# Zero Hour crisp ground placement footprint ring under ghost
	if place_kind != "":
		var pg := _ground_at(get_viewport().get_mouse_position())
		if pg != Vector2.INF:
			var ps: Dictionary = sim.bstats(my_fac, place_kind)
			var pr: float = float(ps.get("size", 60.0)) * 0.68
			var ok: bool = sim.valid_spot(me, place_kind, pg.x, pg.y) != 0
			var pulse := 1.0 + sin(t * 7.0) * 0.03
			var pc := Color(0.32, 1.0, 0.50, 0.92) if ok else Color(1.0, 0.28, 0.22, 0.92)
			rings.append([Vector3(pg.x, sim.ground_h(pg.x, pg.y) + 1.6, pg.y), pr * pulse, pc])
			rings.append([Vector3(pg.x, sim.ground_h(pg.x, pg.y) + 1.4, pg.y), pr * 0.78, Color(pc.r, pc.g, pc.b, 0.48)])
	if armed != "":
		var ag := _ground_at(get_viewport().get_mouse_position())
		if ag != Vector2.INF: rings.append([Vector3(ag.x, sim.ground_h(ag.x, ag.y) + 2.0, ag.y), 28.0 if armed.begins_with("power") else 14.0, Color(1.0, 0.5, 0.2, 0.92) if armed != "guard" else Color(0.4, 0.85, 1.0, 0.92)])

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
	# Screen-space picking for flying air units works reliably even at low upward camera pitch!
	var best_air = null
	var bad := 28.0
	for e in sim.ents:
		if e.dead: continue
		if not visible_ent(e): continue
		if not e.is_b and e.s_dom == "air":
			var ah := 60.0 if e.kind == "drone" else 75.0
			var p3 := Vector3(e.x, sim.ground_h(e.x, e.y) + ah, e.y)
			if not cam.is_position_behind(p3):
				var sd := cam.unproject_position(p3).distance_to(sp)
				if sd < bad:
					bad = sd; best_air = e
			continue
		if g == Vector2.INF: continue
		var rr: float = e.size * 0.6 if e.is_b else e.r * 2.2 + 10.0
		var d := Vector2(e.x, e.y).distance_to(g)
		if d < rr and d < bd:
			bd = d; best = e
	return best_air if best_air != null else best

func _pick_civ(g: Vector2) -> int:
	if g == Vector2.INF: return -1
	var civs: Array = map.get("civ", [])
	var best := -1; var bd := 28.0
	for c in civs:
		if not (c is Dictionary) or int(c.get("ruin", 0)) != 0: continue
		var d := Vector2(float(c.x), float(c.y)).distance_to(g)
		if d < bd: bd = d; best = int(c.get("i", -1))
	return best

func _pick_field(g: Vector2) -> int:
	if g == Vector2.INF or sim == null: return -1
	var best := -1; var bd := 1e9
	for fi in sim.fields.size():
		var f = sim.fields[fi]
		if float(f.get("amt", 0)) <= 0.0: continue
		var rr := float(f.get("r", 42.0)) + 26.0
		var d := Vector2(float(f.x), float(f.y)).distance_to(g)
		if d < rr and d < bd: bd = d; best = fi
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
	ghost_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	ghost_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ghost_mat.albedo_color = Color(0.14, 0.72, 0.34, 0.30)
	ghost_mat.emission_enabled = true
	ghost_mat.emission = Color(0.10, 0.56, 0.24)
	ghost_mat.emission_energy_multiplier = 0.24
	ghost_mat.roughness = 0.55
	ghost.material_override = ghost_mat
	ghost.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ghost.visible = false
	add_child(ghost)

func _ghost_tick() -> void:
	if place_kind == "" or ghost == null:
		if ghost: ghost.visible = false
		return
	var g := _ground_at(get_viewport().get_mouse_position())
	if g == Vector2.INF:
		ghost.visible = false
		return
	var s: Dictionary = sim.bstats(my_fac, place_kind)
	var kk := _bld_key(my_fac, place_kind, float(s.size))
	var info := _dk_info(kk[0], kk[1])
	ghost.mesh = info["mesh"]
	ghost.position = Vector3(g.x, sim.ground_h(g.x, g.y) + 0.5, g.y)
	ghost.rotation = Vector3(0, -sim.base_facing(me) + PI * 0.5, 0)
	ghost.visible = true
	var ok: bool = sim.valid_spot(me, place_kind, g.x, g.y) != 0
	ghost_mat.albedo_color = Color(0.14, 0.72, 0.34, 0.30) if ok else Color(0.92, 0.20, 0.16, 0.34)
	ghost_mat.emission = Color(0.10, 0.56, 0.24) if ok else Color(0.75, 0.14, 0.10)

func _place_here(sp: Vector2, keep: bool) -> void:
	var g := _ground_at(sp)
	if g == Vector2.INF: return
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

# ---------------------------------------------------------------- camera: W A S D / arrows / edges scroll, wheel zooms, Q / MMB rotates & pitches up/down
func tilt_cam(delta_deg: float) -> void:
	cam_pitch_off_t = clampf(cam_pitch_off_t + delta_deg, -32.0, 28.0)

func _cam_input(dt: float) -> void:
	cam_yaw = lerp_angle(cam_yaw, cam_yaw_t, clampf(dt * 12.0, 0, 1))
	cam_pitch_off = lerpf(cam_pitch_off, cam_pitch_off_t, clampf(dt * 12.0, 0, 1))
	if hud != null and hud.window != null: return
	if Input.is_physical_key_pressed(KEY_PAGEUP) or Input.is_physical_key_pressed(KEY_BRACKETLEFT):
		cam_pitch_off_t = clampf(cam_pitch_off_t - 40.0 * dt, -32.0, 28.0)
	if Input.is_physical_key_pressed(KEY_PAGEDOWN) or Input.is_physical_key_pressed(KEY_BRACKETRIGHT):
		cam_pitch_off_t = clampf(cam_pitch_off_t + 40.0 * dt, -32.0, 28.0)
	var v := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP): v.y -= 1
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN): v.y += 1
	if Input.is_physical_key_pressed(KEY_A) and not Input.is_key_pressed(KEY_CTRL) or Input.is_physical_key_pressed(KEY_LEFT): v.x -= 1
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): v.x += 1
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	if mouse_in and selftest == null and bool(UI.opt("edge_scroll")) and DisplayServer.window_is_focused() and mp.x >= 0 and mp.y >= 0 and q_down < 0 and not mmb_down:
		if mp.x < 4: v.x -= 1
		if mp.x > vs.x - 4: v.x += 1
		if mp.y < 4: v.y -= 1
		if mp.y > vs.y - 4: v.y += 1
	if v != Vector2.ZERO:
		_pan_vel = Vector2.ZERO
		v = v.normalized() * dt * (500.0 + cam_dist * 0.9) * float(UI.opt("scroll_speed"))
		# screen-right and screen-down on the ground for the current rotation
		cam_target += Vector2(cos(cam_yaw), -sin(cam_yaw)) * v.x + Vector2(sin(cam_yaw), cos(cam_yaw)) * v.y
	elif _pan_vel.length_squared() > 1.0 and _touches.is_empty():
		cam_target += _pan_vel * dt
		_pan_vel = _pan_vel.lerp(Vector2.ZERO, clampf(dt * 11.0, 0.0, 1.0))
	# Mobile 1-finger long-press (0.28s stationary) automatically activates green drag-box selection!
	if _touches.size() == 1 and not _touch_moved and not _touch_multi and not _touch_long_box and place_kind == "" and not armed.begins_with("power"):
		_touch_hold_t += dt
		if _touch_hold_t >= 0.28:
			_touch_long_box = true
			drag_start = _touch_start
			box.visible = true
			box.position = drag_start - Vector2(18, 18)
			box.size = Vector2(36, 36)
			_msg("Drag box to select units")
	var mw: float = float(map.get("MAPW", 4800)); var mh: float = float(map.get("MAPH", 3320))
	cam_target.x = clampf(cam_target.x, 0, mw)
	cam_target.y = clampf(cam_target.y, 0, mh)

var cam_y := 0.0
func _place_cam() -> void:
	if sim != null:
		cam_y = lerpf(cam_y, sim.ground_h(cam_target.x, cam_target.y), 0.1)
	var base_deg := lerpf(40.0, 58.0, clampf((cam_dist - 300.0) / 1300.0, 0.0, 1.0))
	var pitch := deg_to_rad(clampf(base_deg + cam_pitch_off, 14.0, 78.0))
	var tgt := Vector3(cam_target.x, cam_y, cam_target.y)
	var shk := world_view.shake_offset() if started else Vector3.ZERO
	cam.position = tgt + Vector3(sin(cam_yaw) * cos(pitch) * cam_dist, sin(pitch) * cam_dist, cos(cam_yaw) * cos(pitch) * cam_dist) + shk
	cam.look_at(tgt + shk * 0.4, Vector3.UP)

func _zoom(f: float) -> void:
	cam_dist = clampf(cam_dist * f, 220.0, 2400.0)

## Q: hold + mouse = rotate & pitch up/down, tap = 45 degrees clockwise (Shift+Q the other way), double-tap / Home = reset camera
func _q_release(shift: bool) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if not q_moved and now - q_down < 0.3:
		if now - q_tap < 0.35:
			cam_yaw_t = 0.0; cam_pitch_off_t = 0.0
		else: cam_yaw_t = snappedf(cam_yaw_t + (PI / 4.0 if shift else -PI / 4.0), PI / 4.0)
		q_tap = now
	q_down = -1.0

# ---------------------------------------------------------------- input (PC mouse/keyboard + native Mobile Touch RTS)
func _touch_on_ui(pos: Vector2) -> bool:
	if hud == null: return false
	if hud.window != null: return true
	for c in [hud.bar, hud.mob_bar, hud.mob_top_bar, hud.powers_col, range_panel]:
		if c != null and c.visible and c.get_global_rect().has_point(pos):
			return true
	return false

func _handle_touch(ev: InputEvent) -> void:
	if hud != null and hud.window != null: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed:
			if _touch_on_ui(st.position):
				_touch_ui[st.index] = true
				return
			_touch_ui.erase(st.index)
			_touches[st.index] = st.position
			_pan_vel = Vector2.ZERO
			if _touches.size() == 1:
				_touch_start = st.position
				_touch_moved = false
				_touch_multi = false
				_touch_hold_t = 0.0
				_touch_long_box = false
				if touch_box_mode and place_kind == "":
					drag_start = st.position
			elif _touches.size() == 2:
				_touch_multi = true
				_touch_moved = true
				_touch_long_box = false
				box.visible = false
				var pts := _touches.values()
				_pinch_dist = (pts[0] as Vector2).distance_to(pts[1] as Vector2)
				_pinch_ang = (pts[1] as Vector2 - pts[0] as Vector2).angle()
				_pinch_mid = ((pts[0] as Vector2) + (pts[1] as Vector2)) * 0.5
		else:
			if _touch_ui.has(st.index):
				_touch_ui.erase(st.index)
				return
			var was_one := _touches.size() == 1 and not _touch_multi
			var end_pos := st.position
			_touches.erase(st.index)
			if _touches.is_empty():
				if (touch_box_mode or _touch_long_box) and box.visible:
					box.visible = false
					if end_pos.distance_to(drag_start) > 12.0:
						_box_sel(drag_start, end_pos, false)
						Audio.speak(0, _sel_units().map(func(e): return e.kind))
					touch_box_mode = false
					_touch_long_box = false
					return
				_touch_long_box = false
				if was_one and not _touch_moved:
					_touch_tap(end_pos)
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		if _touch_ui.has(sd.index): return
		if not _touches.has(sd.index): return
		_touches[sd.index] = sd.position
		if _touches.size() == 1 and not _touch_multi:
			if sd.position.distance_to(_touch_start) > 14.0:
				_touch_moved = true
			if (touch_box_mode or _touch_long_box) and place_kind == "":
				if _touch_moved or _touch_long_box:
					box.visible = true
					box.position = Vector2(minf(drag_start.x, sd.position.x), minf(drag_start.y, sd.position.y))
					box.size = (sd.position - drag_start).abs()
			elif _touch_moved:
				# Smooth 1-finger battlefield pan with light velocity glide
				var pan_k := cam_dist * 0.00155
				var dv := -sd.relative * pan_k
				var delta_w := Vector2(cos(cam_yaw), -sin(cam_yaw)) * dv.x + Vector2(sin(cam_yaw), cos(cam_yaw)) * dv.y
				cam_target += delta_w
				var dt_f := maxf(0.008, get_process_delta_time())
				_pan_vel = _pan_vel.lerp(delta_w / dt_f, 0.45)
				var mw: float = float(map.get("MAPW", 4800)); var mh: float = float(map.get("MAPH", 3320))
				cam_target.x = clampf(cam_target.x, 0.0, mw)
				cam_target.y = clampf(cam_target.y, 0.0, mh)
		elif _touches.size() >= 2:
			_touch_multi = true
			_pan_vel = Vector2.ZERO
			var pts := _touches.values()
			var d := (pts[0] as Vector2).distance_to(pts[1] as Vector2)
			var a := (pts[1] as Vector2 - pts[0] as Vector2).angle()
			var mid := ((pts[0] as Vector2) + (pts[1] as Vector2)) * 0.5
			if _pinch_dist > 10.0 and d > 10.0:
				_zoom(clampf(_pinch_dist / d, 0.85, 1.18))
			var da := wrapf(a - _pinch_ang, -PI, PI)
			if absf(da) > 0.015 and absf(da) < 0.6:
				cam_yaw_t += da * 0.85
			var dy := mid.y - _pinch_mid.y
			if absf(dy) > 0.5 and absf(dy) < 80.0:
				cam_pitch_off_t = clampf(cam_pitch_off_t + dy * 0.14, -32.0, 28.0)
			_pinch_dist = d
			_pinch_ang = a
			_pinch_mid = mid

## Smart 1-finger tap: places buildings, fires powers, selects own units (double-tap = all of type), or orders selected units!
func _touch_tap(pos: Vector2) -> void:
	if ai_only or kind == "replay" or loading: return
	if place_kind != "":
		_place_here(pos, false)
		return
	if armed.begins_with("power"):
		_launch_power(pos)
		return
	if armed != "":
		_order_units(pos, false, false)
		return
	var now := Time.get_ticks_msec() / 1000.0
	var is_dbl := (now - _last_tap_t) < 0.38 and pos.distance_to(_last_tap_pos) < 42.0
	_last_tap_t = now; _last_tap_pos = pos
	var hit = _pick_sim(pos)
	var my_u := _sel_units()
	var my_b := _sel_ents().filter(func(e): return e.is_b and e.team == me)
	if hit != null:
		if hit.team == me:
			# If infantry selected & tapping an own bunker/transport/dugout, board/garrison it; otherwise select it!
			if not my_u.is_empty() and hit.is_b and not bsel.has(hit.id) and hit.kind in ["fort", "tunnel", "bunker"]:
				_order_units(pos, false, false)
			else:
				_click_sel(pos, false, is_dbl)
				Audio.speak(0, _sel_units().map(func(e): return e.kind))
		else:
			if not my_u.is_empty():
				_order_units(pos, false, false)
			else:
				_click_sel(pos, false, false)
	else:
		if not my_u.is_empty() or not my_b.is_empty():
			_order_units(pos, false, false)
		else:
			bsel.clear()

func _unhandled_input(ev: InputEvent) -> void:
	if not started:
		if ev is InputEventMouseMotion: mouse_in = true
		return
	if ev is InputEventScreenTouch or ev is InputEventScreenDrag:
		_handle_touch(ev)
		return
	# Ignore emulated mouse events on touchscreens so taps never double-fire!
	if (ev is InputEventMouseButton or ev is InputEventMouseMotion) and ev.device == InputEvent.DEVICE_ID_EMULATION:
		return
	if ev is InputEventMouseMotion:
		mouse_in = true
		var mm := ev as InputEventMouseMotion
		if q_down >= 0 or mmb_down:
			if q_down >= 0 and (absf(mm.relative.x) > 1.5 or absf(mm.relative.y) > 1.5): q_moved = true
			cam_yaw_t -= mm.relative.x * 0.006; cam_yaw = cam_yaw_t
			cam_pitch_off_t = clampf(cam_pitch_off_t + mm.relative.y * 0.17, -32.0, 28.0)
			cam_pitch_off = cam_pitch_off_t
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
		elif mb.button_index == MOUSE_BUTTON_MIDDLE:
			mmb_down = mb.pressed
			return
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
	if kc == KEY_HOME:
		cam_yaw_t = 0.0; cam_pitch_off_t = 0.0
	elif kc == KEY_H:
		var hq = sim.hq_of(me)
		if hq != null: cam_target = Vector2(hq.x, hq.y)
	elif kc == KEY_B:
		select_idle_dozer()
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
	elif kc == KEY_E:
		var lu := _sel_units()
		var lp := cam_target
		if not lu.is_empty():
			var s_p := Vector2.ZERO
			for u in lu: s_p += Vector2(float(u.x), float(u.y))
			lp = s_p / float(lu.size())
		cmd({t = "ldr", n = 1 if k.shift_pressed else 0, ids = _sel_ids(), x = lp.x, y = lp.y})
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

var _dozer_idx := 0
func _my_dozers() -> Array:
	var out: Array = []
	if sim == null: return out
	for e in sim.ents:
		if not e.dead and e.team == me and not e.is_b and e.kind == "dozer":
			out.append(e)
	return out

func idle_dozer_count() -> int:
	var n := 0
	for e in _my_dozers():
		if not bool(e.get("building")) and e.order == null:
			n += 1
	return n

## Zero Hour Idle Dozer Finder (B / DOZER button): cycles idle Construction Vehicles (or any dozer if all busy) and centers camera
func select_idle_dozer() -> void:
	var all_dz := _my_dozers()
	if all_dz.is_empty():
		_msg("No Construction Vehicle available")
		return
	var idle: Array = all_dz.filter(func(e): return not bool(e.get("building")) and e.order == null)
	var pool: Array = idle if not idle.is_empty() else all_dz
	_dozer_idx = _dozer_idx % pool.size()
	var dz = pool[_dozer_idx]
	_dozer_idx = (_dozer_idx + 1) % pool.size()
	bsel = [dz.id]
	cam_target = Vector2(float(dz.x), float(dz.y))
	Audio.speak(0, ["dozer"])   # P5 HOOK

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
		if use_bridge:
			cmd({t = "amove" if fkey else "move", ids = ids, x = g.x, y = g.y, q = 1})
		else:
			for e in units:
				if not wp.has(e.id): wp[e.id] = []
				wp[e.id].append(g)
		mark = Color(0.4, 0.9, 1.0)
	elif tg != null and (tg.team == me or sim.ally(me, tg.team)) and not ids.has(tg.id) and (tg.is_b or tg.s_cls != "inf"):
		cmd({t = "enter", ids = ids, target = tg.id, x = tg.x, y = tg.y})   # enter / resume unfinished building / board transport
		g = Vector2(tg.x, tg.y); mark = Color(0.4, 0.8, 1.0)
	elif use_bridge and tg == null and _pick_field(g) >= 0 and units.any(func(e): return e.kind == "harv"):
		var fi := _pick_field(g)
		var harv_ids := units.filter(func(e): return e.kind == "harv").map(func(e): return e.id)
		cmd({t = "fld", ids = harv_ids, fi = fi})
		mark = Color(0.95, 0.85, 0.35)
	elif use_bridge and tg == null and _pick_civ(g) >= 0 and not _sel_inf().is_empty():
		var ci := _pick_civ(g)
		cmd({t = "atkCiv" if ctrl else "gar", ids = _sel_inf().map(func(e): return e.id), ci = ci})
		mark = Color(0.4, 0.85, 1.0)
	else:
		if use_bridge:
			cmd({t = "amove" if fkey else "move", ids = ids, x = g.x, y = g.y})
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
	if world_view.fx != null:
		world_view.fx._ring(Vector3(g.x, sim.ground_h(g.x, g.y) + 0.8, g.y), 6.0, 28.0, 0.42, mark, 0.92, 0.85, 1)
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
	if use_bridge:
		cmd({t = "line", ids = inf.map(func(e): return e.id), x = ga.x, y = ga.y, x2 = gb.x, y2 = gb.y})
		for i in inf.size():
			var p := ga.lerp(gb, float(i) / maxf(1.0, inf.size() - 1.0))
			_boom(Vector3(p.x, sim.ground_h(p.x, p.y) + 2, p.y), 4.0, Color(0.4, 1.0, 0.5), 0.4)
	else:
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
		"tut_money":
			if sim.has_method("range_cmd"): sim.range_cmd({cmd = "money", team = int(o.team), amt = 2500.0})
			else: sim.teams[int(o.team)].credits += 2500.0
			return true
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
	var sw_i := LookFx.superweapon_info(my_fac)
	out.append({key = "sup", name = str(sw_i.get("name", "Strategic Strike")), desc = str(sw_i.get("desc", "Needs the Strike Center")) + " (Strike Center)", have = false, can = false})
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
	if key == "sup":
		var sw := LookFx.superweapon_info(my_fac)
		hud.say("LAUNCHING: %s!" % str(sw.get("name", "SUPERWEAPON")).to_upper(), "w")
		if world_view.fx != null:
			world_view.fx._sup_fac_hint = my_fac
			if not use_bridge:
				var hq = sim.hq_of(me)
				var sx := float(hq.x) if hq != null else g.x - 500.0
				var sy := float(hq.y) if hq != null else g.y - 500.0
				world_view.fx.fire_faction_superweapon(my_fac, sx, sy, g.x, g.y)
				Audio.superweapon_sfx(str(sw.get("style", "scud")), g.x, g.y)
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
	var mob: bool = hud != null and bool(hud.is_mob)
	if place_kind != "":
		return "TAP GROUND TO PLACE  |  TAP CLR TO CANCEL" if mob else "PLACE: Left-click ground  |  Shift: keep placing  |  Right-click / Esc: cancel"
	if armed.begins_with("power"):
		return "TAP TARGET TO LAUNCH  |  TAP CLR TO CANCEL" if mob else "LAUNCH POWER: RIGHT-click target  |  Left-click / Esc: cancel"
	if armed == "amove":
		return "ATTACK-MOVE: Tap target  |  Tap CLR to cancel" if mob else "ATTACK-MOVE: Right-click ground or enemy  |  Left-click / Esc: cancel"
	if armed == "guard":
		return "GUARD: Tap position or unit  |  Tap CLR to cancel" if mob else "GUARD: Right-click position or unit  |  Left-click / Esc: cancel"
	return ""

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
			if (not use_bridge and NO_BUILD.has(k)) or not F.blds.has(k): continue
			var s: Dictionary = sim.bstats(my_fac, k)
			if s.is_empty(): continue
			var req: bool = sim.req_met(me, k)
			var why := "" if req else "\nNeeds: %s" % str(F.blds.get(str(s.get("req", "")), {}).get("name", s.get("req", "")))
			var kk: String = k
			items.append({id = k, label = _short(s.name), price = "$%d" % int(s.cost), ok = req and (T.credits >= float(s.cost) or kind == "range"), cameo = "b|%s|%s" % [my_fac, k], on = place_kind == k,
				tip = "%s\n%s%s" % [s.name, str(s.get("desc", "")), why], on_click = func(_sh): place_kind = kk; _msg("Left-click the ground to place the " + str(s.name))})
		return {title = "Construction Vehicle", sub = "Left-click ground to build · Shift: queue · Right-click: cancel", items = items}
	if se.size() == 1 and se[0].is_b and se[0].team == me:
		var b = se[0]
		if b.built < 1.0: return {title = str(b.s.name), sub = "Under construction %d%%" % int(b.built * 100), items = []}
		var sub := ""
		var counts := {}
		for it in b.q: counts[it.kind] = counts.get(it.kind, 0) + 1
		for k in F.roster.get(b.kind, []):
			if not use_bridge and NO_TRAIN.has(k): continue
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
		if PROD.has(b.kind): sub = "Queue: %d · Click ground to set rally point" % b.q.size() if b.q.size() else "Click to train · Shift: x5 · Click ground: rally point"
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
		return {title = nm, sub = "Right-click: move/attack · Right-drag: line · Ctrl: force-fire · Alt: waypoint", items = items}
	if se.size():
		var e0 = se[0]
		return {title = ("Enemy · " if e0.team >= 0 and not sim.ally(me, e0.team) else "") + str(e0.s.get("name", e0.kind)), sub = "", items = []}
	# Zero Hour idle command deck: quick-select base / dozer / production / army so the bar is always structured and useful
	var hq_e = sim.hq_of(me)
	if hq_e != null:
		var hid: int = hq_e.id
		items.append({id = "q_hq", label = "Command Ctr", price = "H", cameo = "b|%s|hq" % my_fac, tip = "Select & center on Command Center (H)", on_click = func(_sh): bsel = [hid]; cam_target = Vector2(hq_e.x, hq_e.y)})
	for k_b in [["dozer", "Dozer", false, "B"], ["barracks", "Barracks", true, ""], ["factory", "War Factory", true, ""], ["airfield", "Airfield", true, ""]]:
		var found = null
		for e in sim.ents:
			if not e.dead and e.team == me and e.kind == k_b[0] and (not k_b[2] or e.built >= 1.0): found = e; break
		if found != null:
			var fid: int = found.id; var fx: float = found.x; var fy: float = found.y
			items.append({id = "q_" + k_b[0], label = k_b[1], price = k_b[3], cameo = ("%s|%s|%s" % ["b" if k_b[2] else "u", my_fac, k_b[0]]), tip = "Select %s and center camera" % k_b[1], on_click = func(_sh): bsel = [fid]; cam_target = Vector2(fx, fy)})
	items.append({id = "q_army", label = "All Army", price = "Ctrl+A", cameo = "", tip = "Select all combat units (Ctrl+A)", on_click = func(_sh):
		bsel = []
		for e in sim.ents:
			if not e.dead and e.team == me and not e.is_b and e.kind != "harv" and e.kind != "dozer" and not _dug_in(e): bsel.append(e.id)})
	items.append({id = "q_sup", label = "Supply Lines", price = "L", cameo = "", on = show_supply, tip = "Toggle supply lines on the ground (L)", on_click = func(_sh): toggle_supply()})
	items.append({id = "q_pow", label = "Gen. Powers", price = "P", cameo = "", tip = "Open Generals' Powers (P)", on_click = func(_sh): hud.open_powers()})
	return {title = "Tactical Command", sub = "Select Dozer (B) to build · Building to train · Units to command", items = items}

func portrait() -> Dictionary:
	var se := _sel_ents()
	if se.is_empty(): return {}
	var e = se[0]
	var fac: String = sim.teams[e.team].fac if e.team >= 0 else my_fac
	var info := "%d / %d HP" % [int(e.hp), int(e.max)]
	var out := {name = str(e.s.get("name", e.kind)), hp = clampf(e.hp / maxf(1.0, e.max), 0, 1), cameo = ("b|%s|%s" if e.is_b else "u|%s|%s") % [fac, e.kind] if e.team >= 0 else ""}
	if not e.is_b:
		if e.amx > 0 and kind != "range":
			var af := clampf(maxf(0.0, float(e.am)) / float(e.amx), 0.0, 1.0)
			out["ammo"] = af
			info += " · Ammo %d%%" % int(af * 100.0)
		if e.rank > 0: info += " · " + ["", "Veteran", "Elite", "Heroic"][mini(3, e.rank)]
	if se.size() > 1: info = "%d units · %s" % [se.size(), info]
	out["info"] = info
	return out

# ---------------------------------------------------------------- cameos: X2 pre-rendered atlas first (instant, all 22 nations), 3D viewport fallback
var _x2_atlas: Dictionary = {}
var _x2_sheets: Dictionary = {}
var _x2_loaded := false
func _x2_cameo(key: String):
	if not _x2_loaded:
		_x2_loaded = true
		var f := FileAccess.open("res://ui/icons/atlas.json", FileAccess.READ)
		if f != null:
			var j = JSON.parse_string(f.get_as_text())
			if j is Dictionary and j.has("icons"): _x2_atlas = j.icons
	var ak := key.replace("|", "/")
	# Remap legacy placeholder atlas tiles to crisp 3D-rendered cameos of the same nation
	if ak.ends_with("/hero"): ak = ak.substr(0, ak.length() - 4) + "champ"
	elif ak.ends_with("/fpvt"): ak = ak.substr(0, ak.length() - 4) + "drone"
	elif ak.ends_with("/krb"): ak = ak.substr(0, ak.length() - 3) + "arty"
	elif ak.ends_with("/garrison"): ak = ak.substr(0, ak.length() - 8) + "fort"
	var row = _x2_atlas.get(ak)
	if row == null or not (row is Dictionary): return null
	var fp := "res://ui/icons/" + str(row.get("file", ""))
	if not _x2_sheets.has(fp):
		_x2_sheets[fp] = load(fp) if ResourceLoader.exists(fp) else null
	var sh = _x2_sheets[fp]
	if sh == null: return null
	var at := AtlasTexture.new()
	at.atlas = sh
	at.region = Rect2(float(row.x), float(row.y), float(row.w), float(row.h))
	return at

func cameo(key: String):
	if key == "" or headless_mode: return null
	if cameo_tex.has(key): return cameo_tex[key]
	var x2 = _x2_cameo(key)
	if x2 != null:
		cameo_tex[key] = x2
		return x2
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
	# Audio settings live inside the Zero Hour MENU -> Settings window (no loose floating Sound button)
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

# ---------------------------------------------------------------- custom RTS context cursors
func _set_cursor(nm: String) -> void:
	if headless_mode or nm == _cur_cursor: return
	_cur_cursor = nm
	if not _cursor_cache.has(nm):
		var fp := "res://ui/icons/cursors/%s.png" % nm
		_cursor_cache[nm] = load(fp) if ResourceLoader.exists(fp) else null
	var tex = _cursor_cache[nm]
	if tex == null:
		Input.set_custom_mouse_cursor(null, Input.CURSOR_ARROW)
		return
	var hs := Vector2(2, 2) if nm == "arrow" else Vector2(16, 16)
	Input.set_custom_mouse_cursor(tex, Input.CURSOR_ARROW, hs)

func _cursor_tick() -> void:
	if headless_mode: return
	if not started or ai_only or kind == "replay" or loading or paused or (hud != null and hud.window != null):
		_set_cursor("arrow"); return
	var mp := get_viewport().get_mouse_position()
	var vs := get_viewport().get_visible_rect().size
	var bh: float = hud.bar_height() if hud != null else Hud.BAR_H
	if mp.y >= vs.y - bh:
		_set_cursor("arrow"); return
	if range_panel != null and range_panel.visible and range_panel.get_global_rect().has_point(mp):
		_set_cursor("arrow"); return
	var g := _ground_at(mp)
	if place_kind != "":
		_set_cursor("place" if g != Vector2.INF and sim.valid_spot(me, place_kind, g.x, g.y) != 0 else "nogo")
		return
	if armed.begins_with("power"):
		_set_cursor("aim"); return
	if armed == "amove":
		_set_cursor("amove"); return
	if armed == "guard":
		_set_cursor("guard"); return
	if rdrag_on and line_node != null and line_node.visible:
		_set_cursor("line"); return
	var units := _sel_units()
	if not units.is_empty():
		if Input.is_key_pressed(KEY_CTRL):
			_set_cursor("force"); return
		if Input.is_key_pressed(KEY_ALT):
			_set_cursor("way"); return
		var tg = _pick_sim(mp)
		if tg != null:
			if tg.team >= 0 and tg.team != me and not sim.ally(me, tg.team):
				_set_cursor("attack"); return
			if (tg.team == me or sim.ally(me, tg.team)) and not bsel.has(tg.id) and (tg.is_b or tg.s_cls != "inf"):
				_set_cursor("enter"); return
		if g != Vector2.INF and not _sel_inf().is_empty():
			for o in sim.oil:
				if not o.dead and int(o.owner) != me and (int(o.owner) < 0 or not sim.ally(me, int(o.owner))) and Vector2(float(o.x), float(o.y)).distance_to(g) <= 40.0:
					_set_cursor("capture"); return
		_set_cursor("arrow"); return
	var se := _sel_ents()
	if se.size() == 1 and se[0].is_b and se[0].team == me and PROD.has(se[0].kind) and g != Vector2.INF:
		_set_cursor("rally"); return
	_set_cursor("arrow")

# ---------------------------------------------------------------- Test range panel (unlimited money, a target nation that does not act)
var range_panel: PanelContainer
func _range_panel() -> void:
	range_panel = UI.panel(8)
	range_panel.name = "Range"
	range_panel.position = Vector2(10, 10)
	range_panel.custom_minimum_size = Vector2(296, 0)
	hud.root.add_child(range_panel)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 4)
	range_panel.add_child(vb)
	var hdr := HBoxContainer.new()
	hdr.add_theme_constant_override("separation", 6)
	var title := UI.label("TEST RANGE", 16, UI.GOLD_HI, "display")
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(title)
	var body_vb := VBoxContainer.new()
	body_vb.add_theme_constant_override("separation", 4)
	var tog := UI.button("HIDE", Callable(), 11, 52)
	tog.pressed.connect(func():
		body_vb.visible = not body_vb.visible
		tog.text = "HIDE" if body_vb.visible else "SHOW")
	hdr.add_child(tog)
	vb.add_child(hdr)
	vb.add_child(body_vb)
	body_vb.add_child(UI.label("%s  vs  %s" % [UI.nat_name(my_fac), UI.nat_name(sim.teams[1].fac)], 12, UI.TEXT_DIM))
	body_vb.add_child(UI.label("SPAWN AT CAMERA (Shift = x5)", 11, UI.TEXT_DIM))
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(280, 260)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body_vb.add_child(sc)
	var g := GridContainer.new()
	g.columns = 2
	g.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	g.add_theme_constant_override("h_separation", 4); g.add_theme_constant_override("v_separation", 4)
	sc.add_child(g)
	var F: Dictionary = sim.teams[me].F
	for k in F.units:
		if not use_bridge and NO_TRAIN.has(k): continue
		var u_row = F.units[k]
		if not (u_row is Dictionary): continue
		var raw_nm = u_row.get("name", null)
		if raw_nm == null or str(raw_nm).strip_edges() == "" or str(raw_nm) == "<null>": continue
		var unm := str(raw_nm)
		var kk: String = k
		var b := UI.button(_short(unm).substr(0, 15), func(): _range_spawn(me, kk, 1), 11, 130)
		b.name = "Spawn_" + k
		b.tooltip_text = "Spawn one %s (Shift: five)" % unm
		b.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and ev.shift_pressed: _range_spawn(me, kk, 4))
		g.add_child(b)
	body_vb.add_child(UI.hsep())
	var act_g := GridContainer.new()
	act_g.columns = 2
	act_g.add_theme_constant_override("h_separation", 4); act_g.add_theme_constant_override("v_separation", 4)
	body_vb.add_child(act_g)
	var tb := UI.button("+ Target group", func():
		for it in [["inf", 6], ["at", 2], ["tank", 3]]: _range_spawn(1, it[0], it[1], 320.0), 11, 134)
	tb.name = "Targets"
	act_g.add_child(tb)
	act_g.add_child(UI.button("+ Target bldg", func():
		var p := cam_target + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * 380.0
		if sim.has_method("range_cmd"):
			sim.range_cmd({cmd = "spawn_bld", team = 1, kind = "barracks", x = p.x, y = p.y})
			return
		for r in 30:
			var q := p + Vector2(cos(r * 2.4), sin(r * 2.4)) * r * 14.0
			if sim.valid_spot(1, "barracks", q.x, q.y) != 0: sim.add_bld(1, "barracks", q.x, q.y, true); break, 11, 134))
	act_g.add_child(UI.button("Clear targets", func():
		if sim.has_method("range_cmd"):
			sim.range_cmd({cmd = "clear", team = 1})
			return
		for e in sim.ents:
			if e.team == 1 and not e.dead and not (e.is_b and e.kind == "hq"): sim.kill(e, me, null), 11, 134))
	act_g.add_child(UI.button("Heal my units", func():
		if sim.has_method("range_cmd"):
			sim.range_cmd({cmd = "heal", team = me})
			return
		for e in sim.ents:
			if e.team == me and not e.dead: e.hp = e.max, 11, 134))
	range_ai_on = false
	var fb := UI.button("Target fights back: OFF", Callable(), 11)
	fb.name = "FightBack"
	fb.pressed.connect(func():
		range_ai_on = not range_ai_on
		if sim.has_method("range_cmd"):
			sim.range_cmd({cmd = "set_ai", team = 1, on = range_ai_on})
		else:
			sim.teams[1].ai = range_ai if range_ai_on else null
		fb.text = "TARGET FIGHTS BACK: " + ("ON" if range_ai_on else "OFF"))
	body_vb.add_child(fb)
	body_vb.add_child(UI.hsep())
	var my_sw := LookFx.superweapon_info(my_fac)
	body_vb.add_child(UI.label("SUPERWEAPONS (FIRE AT TARGET)", 11, UI.GOLD_HI))
	var sw_g := GridContainer.new()
	sw_g.columns = 2
	sw_g.add_theme_constant_override("h_separation", 4); sw_g.add_theme_constant_override("v_separation", 4)
	body_vb.add_child(sw_g)
	var sw_btns := [
		["MY: " + str(my_sw.get("name", "SUPER")).substr(0, 12), str(my_sw.get("style", "scud"))],
		["SCUD STORM", "scud"],
		["NUKE STRIKE", "nuke"],
		["PARTICLE CANNON", "beam"],
		["LIGHTNING STORM", "storm"],
		["CARPET ARMADA", "carpet"],
	]
	for sb_it in sw_btns:
		var sty: String = sb_it[1]
		var sbtn := UI.button(sb_it[0], func(): _range_superweapon(sty), 11, 134)
		sbtn.name = "SW_" + sty
		sw_g.add_child(sbtn)

func _range_superweapon(style: String) -> void:
	var p := cam_target + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * 280.0
	if sim.has_method("range_cmd"):
		sim.range_cmd({cmd = "super", team = me, x = p.x, y = p.y, style = style})
		hud.say("SUPERWEAPON LAUNCHED: %s!" % style.to_upper(), "w")
		return
	_demo_fire_sw(style, p)

func _demo_fire_sw(style: String, target_p: Vector2 = Vector2.INF) -> void:
	if world_view.fx == null or sim == null: return
	var tp := target_p if target_p != Vector2.INF else cam_target
	var hq = sim.hq_of(me)
	var sx := float(hq.x) if hq != null else tp.x - 520.0
	var sy := float(hq.y) if hq != null else tp.y - 420.0
	match style:
		"beam": world_view.fx.particle_cannon(tp.x, tp.y, 4.0, 95.0)
		"nuke": world_view.fx.nuke_strike(tp.x, tp.y, 64.0, 0.35)
		"storm": world_view.fx.lightning_storm(tp.x, tp.y, 4.8, 170.0)
		"carpet": world_view.fx.carpet_bombing(sx, sy, tp.x, tp.y, 9)
		_: world_view.fx.scud_storm(sx, sy, tp.x, tp.y, 10, 175.0)
	Audio.superweapon_sfx(style, tp.x, tp.y)
	if not use_bridge:
		for e in sim.ents:
			if not e.dead and e.team != me and Vector2(e.x, e.y).distance_to(tp) < 210.0:
				e.hp = maxf(0.0, e.hp - 650.0)
				if e.hp <= 0.0: sim.kill(e, me, null)

func _range_spawn(team: int, k: String, n: int, ahead: float = 0.0) -> void:
	if sim.stats(sim.teams[team].fac, k).is_empty(): return
	var p := cam_target + Vector2(cos(sim.base_facing(me)), sin(sim.base_facing(me))) * ahead
	if sim.has_method("range_cmd"):
		sim.range_cmd({cmd = "spawn", team = team, kind = k, x = p.x, y = p.y, n = n})
		return
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
