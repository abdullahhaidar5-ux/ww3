## Online Battle (orch/godot-battle) on the lockstep relay from orch/godot-net (res://net/lockstep_net.gd).
## Players send only orders; every machine runs the same Battle sim on the same orders at the same tick
## (one relay tick = 1/30 s = 2 sim steps). This node: the lobby panel (nation, team, map, start) and the order codec.
##   Test (two headless clients on server-godot/local-server.mjs):
##   godot --headless --path godot -- --online=ws://127.0.0.1:8788 --code=bat234 --name=A --fac=IR --start-at=2 --demo --minutes=3
extends Node

const Net = preload("res://net/lockstep_net.gd")
const RELAY := "ws://127.0.0.1:8788"   # becomes the deployed ww3-godot-relay URL once ORCH deploys it (server-godot/README.md)

var B                 # the battle scene (battle.gd)
var net
var url := RELAY
var lobby := {}
var panel: PanelContainer
var list_lbl: Label
var start_btn: Button
var start_at := 0     # headless tests: the leader starts when this many players are in
var hash_log := false
var seats := {}       # relay slot -> sim seat

func _init(battle) -> void:
	B = battle

func go(relay: String, code: String, player_name: String) -> void:
	url = relay
	net = Net.new()
	net.state_hash = func():
		var h: int = B.hash_state()
		if hash_log: print("HASH %d %d" % [net.turn - 1, h])
		return h
	net.joined.connect(func(you, c): B._msg("Joined game %s" % c.to_upper()); _pick())
	net.lobby_changed.connect(_on_lobby)
	net.battle_started.connect(_on_started)
	net.tick.connect(_on_tick)
	net.failed.connect(func(why): B._msg("Online: " + why); print("ONLINE failed " + why))
	net.desync.connect(func(k, _h, bad): print("ONLINE desync turn %d bad %s" % [k, str(bad)]))
	net.connection_lost.connect(func(): B._msg("Connection lost - reconnecting"))
	net.reconnected.connect(func(): B._msg("Reconnected"))
	add_child(net)
	if code != "": net.join(url, code, player_name)
	else: net.quick_play(url, player_name)
	_panel()

func _pick() -> void:
	net.set_pick({"nation": B.my_fac})

func _on_lobby(l: Dictionary) -> void:
	lobby = l
	var lines: Array = []
	for p in l.get("players", []):
		var pk: Dictionary = p.get("pick", {}) if p.get("pick") is Dictionary else {}
		lines.append("%s%s  -  %s" % ["* " if int(p.s) == int(l.get("leader", -1)) else "", str(p.name), B.NAT_NAME.get(str(pk.get("nation", "?")), "?")])
	if list_lbl: list_lbl.text = "Game %s\n%s" % [str(l.get("code", "")).to_upper(), "\n".join(lines)]
	var leader: bool = net.is_leader(l)
	if start_btn: start_btn.visible = leader
	if leader:
		net.set_config({"map": B.map_key})
		var all_picked: bool = l.get("players", []).all(func(p): return p.get("pick") is Dictionary and p.pick.has("nation"))
		if start_at > 0 and l.get("players", []).size() >= start_at and all_picked: net.start_battle()

func _on_started(info: Dictionary) -> void:
	if panel: panel.visible = false
	var ps: Array = info.players.duplicate()
	ps.sort_custom(func(a, b): return int(a.s) < int(b.s))
	var players: Array = []
	seats = {}
	for p in ps:
		var pk = p.get("pick", {})
		var fac: String = str(pk.get("nation", "IR")) if pk is Dictionary else "IR"
		if not B.NATIONS.has(fac): fac = "IR"
		seats[int(p.s)] = players.size()
		players.append({fac = fac, ai = false, tm = int(pk.get("team", 0)) if pk is Dictionary and pk.has("team") else 100 + players.size()})
	var cfg: Dictionary = info.get("cfg", {})
	B.start_online(str(cfg.get("map", "bm_splitridge")), players, seats.get(int(info.you), 0), int(info.seed) & 0x7fffffff)
	print("ONLINE started: seat %d of %d, seed %d" % [seats.get(int(info.you), 0), players.size(), int(info.seed)])

func _on_tick(_t: int, orders: Array) -> void:
	var os: Array = []
	for w in orders:
		var o = w.get("o")
		if not (o is Dictionary) or not seats.has(int(w.get("s", -1))): continue
		var d := decode(o)
		if d.is_empty(): continue
		d.team = seats[int(w.s)]
		os.append(d)
	B.sim_tick(os)

## orders travel as small int dictionaries (rule 6 of godot/net/README.md)
func send(o: Dictionary) -> bool:
	var w := {"k": str(o.t)}
	if o.has("ids"): w.i = o.ids.map(func(v): return int(v))
	if o.has("x"): w.x = roundi(float(o.x)); w.y = roundi(float(o.y))
	if o.has("target"): w.g = int(o.target)
	if o.has("kind"): w.n = str(o.kind)
	if o.has("bid"): w.b = int(o.bid)
	if o.has("dz"): w.d = int(o.dz)
	return net.send_order(w) >= 0

static func decode(w: Dictionary) -> Dictionary:
	var k := str(w.get("k", ""))
	if not k in ["move", "amove", "attack", "stop", "build", "train", "cancel", "rally", "sell", "repair"]: return {}
	var o := {t = k}
	if w.has("i") and w.i is Array: o.ids = w.i
	if w.has("x"): o.x = float(w.x); o.y = float(w.get("y", 0))
	if w.has("g"): o.target = int(w.g)
	if w.has("n"): o.kind = str(w.n)
	if w.has("b"): o.bid = int(w.b)
	if w.has("d"): o.dz = int(w.d)
	return o

func _panel() -> void:
	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-200, -120)
	panel.custom_minimum_size = Vector2(400, 0)
	panel.add_theme_stylebox_override("panel", B._panel_style())
	B.ui.add_child(panel)
	var vb := VBoxContainer.new()
	panel.add_child(vb)
	var h := Label.new()
	h.text = "PLAY ONLINE"
	h.add_theme_color_override("font_color", Color(0.95, 0.82, 0.45))
	vb.add_child(h)
	list_lbl = Label.new()
	list_lbl.text = "Finding a game..."
	vb.add_child(list_lbl)
	start_btn = Button.new()
	start_btn.text = "Start battle"
	start_btn.visible = false
	start_btn.pressed.connect(func(): net.start_battle())
	vb.add_child(start_btn)
	var back := Button.new()
	back.text = "Leave"
	back.pressed.connect(func(): net.leave(); B.get_tree().reload_current_scene())
	vb.add_child(back)
