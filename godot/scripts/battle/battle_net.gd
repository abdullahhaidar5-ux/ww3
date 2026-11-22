## Online Battle on the lockstep relay (res://net/lockstep_net.gd, server-godot/). Up to 8 seats (humans + AI).
## Players send only orders; every machine runs the same Battle sim on the same orders at the same tick
## (one relay tick = 1/30 s = 2 sim steps). This node: the "Play online" window (quick play, invite code / link,
## nation, team, map, AI seats, start), the order codec, the whole-state hash, snapshots (desync repair, rejoin)
## and the AI taking over a player who dropped.
##   Test (two headless clients on server-godot/local-server.mjs; see server-godot/test/battle_soak.mjs):
##   godot --headless --path godot -- --online=ws://127.0.0.1:8788 --code=bat234 --name=A --fac=IR --start-at=2 --demo --minutes=3
##   more test flags: --ai=US,IL:2 (AI seats, ":team")  --team=1  --turnms=20 --fast (local relay only)  --hashlog
##   --digest (per-part hashes with every hash)  --map=bm_fourmills (leader)
extends Node

const Net = preload("res://net/lockstep_net.gd")
const Codec = preload("res://net/state_codec.gd")
const Sim = preload("res://sim/sim.gd")
const UI = preload("res://scripts/ui/ui_kit.gd")
## the deployed Cloudflare relay (Worker ww3-godot-relay, .github/workflows/godot-relay.yml)
const RELAY := "https://ww3-godot-relay.abdullah-haidar5.workers.dev"
const WEB_PAGE := "https://abdullahhaidar5-ux.github.io/ww3/"
const MAX_SEATS := 8
const SAVE := "user://ww3_online.json"

var B                 # the battle scene (battle.gd)
var net
var url := RELAY
var lobby := {}
var panel: PanelContainer
var list_lbl: Label
var code_lbl: Label
var note_lbl: Label
var start_btn: Button
var leader_box: VBoxContainer
var code_edit: LineEdit
var start_at := 0     # headless tests: the leader starts when this many players are in
var hash_log := false
var digest_log := false
var seats := {}       # relay slot -> sim seat
var my_name := "Commander"
var my_team := 0      # 0 = on my own, 1..4 = team
var ai_seats: Array = []   # leader: [{n = nation, t = team, d = difficulty}]
var ai_diff := 1
var cfg_map := ""
var test_ai := ""
var started_players: Array = []
var started_seed := 0
var hashes := 0

func _init(battle) -> void:
	B = battle

func go(relay: String, code: String, player_name: String) -> void:
	url = relay
	var fast := false
	var turnms := ""
	for a in OS.get_cmdline_user_args():
		if a == "--hashlog": hash_log = true
		elif a == "--digest": digest_log = true
		elif a == "--fast": fast = true
		elif a.begins_with("--turnms="): turnms = a.substr(9)
		elif a.begins_with("--ai="): test_ai = a.substr(5)
		elif a.begins_with("--team="): my_team = int(a.substr(7))
	var saved := _load_saved()
	my_name = player_name if player_name != "Player" else str(saved.get("name", "Commander"))
	cfg_map = B.map_key
	for part in test_ai.split(",", false):
		var nt := part.split(":")
		ai_seats.append({n = nt[0], t = int(nt[1]) if nt.size() > 1 else 0, d = int(nt[2]) if nt.size() > 2 else 1})
	_connect_net(code, turnms, fast)
	_panel()

func _connect_net(code: String, turnms: String = "", fast: bool = false, fresh: bool = false) -> void:
	if net != null:
		net.leave()
		net.queue_free()
	net = Net.new()
	if turnms != "": net.set_test_query("&turnms=" + turnms)
	if fast: net.realtime = false
	net.state_hash = _hash
	net.snapshot = _snapshot
	net.restore = _restore
	net.joined.connect(func(_you, c):
		B._msg("Joined game %s" % c.to_upper())
		_pick())
	net.lobby_changed.connect(_on_lobby)
	net.battle_started.connect(_on_started)
	net.tick.connect(_on_tick)
	net.failed.connect(func(why):
		_note("Online: " + why)
		print("ONLINE failed " + why))
	net.ended.connect(func(why): B._msg("The online battle ended: " + why))
	net.desync.connect(func(k, _h, bad):
		print("ONLINE desync turn %d bad %s" % [k, str(bad)])
		B._msg("Out of sync - repairing"))
	net.resynced.connect(func(k):
		print("ONLINE resynced at turn %d" % k)
		B._msg("Back in sync"))
	net.connection_lost.connect(func(): B._msg("Connection lost - reconnecting"))
	net.reconnected.connect(func(): B._msg("Reconnected"))
	add_child(net)
	if code != "": net.join(url, code, my_name)
	elif fresh: net.create(url, my_name)
	else: net.quick_play(url, my_name)

func _hash() -> int:
	var h: int = int(B.sim.state_hash_int()) if (B.use_bridge and B.sim != null and B.sim.has_method("state_hash_int")) else Codec.hash_of(B.sim)
	hashes += 1
	if hash_log: print("HASH %d %d" % [net.turn - 1, h])
	if digest_log and not B.use_bridge: print("DIGEST %d %s" % [net.turn - 1, "|".join(Codec.digest(B.sim))])
	return h

func _snapshot() -> PackedByteArray:
	if B.use_bridge and B.sim != null and B.sim.has_method("save_snapshot"):
		return JSON.stringify({"bridge_snap": B.sim.save_snapshot(), "tick": B.tick_n}).to_utf8_buffer()
	return Codec.save(B.sim)

func _pick() -> void:
	if net == null or net.phase != "lobby": return
	net.set_pick({"nation": B.my_fac, "team": my_team})

func _nations() -> Array:
	if B.use_bridge: return UI.nations()
	var F: Dictionary = UI.rules().get("factions", {})
	var out: Array = []
	for k in UI.nations():
		if F.has(k): out.append(k)
	return out if not out.is_empty() else ["IR", "US"]

func _maps() -> Array:
	var out: Array = []
	for m in UI.maps():
		if not B.use_bridge and not FileAccess.file_exists(str(m.get("file", ""))): continue
		out.append([str(m.key), str(m.name), int(m.get("n", 2))])
	return out if not out.is_empty() else [["bm_splitridge", "Split Ridge", 2]]

func _map_seats(key: String) -> int:
	for m in _maps():
		if m[0] == key: return int(m[2])
	return 2

func _on_lobby(l: Dictionary) -> void:
	lobby = l
	var cfg: Dictionary = l.get("cfg", {}) if l.get("cfg") is Dictionary else {}
	var ps: Array = l.get("players", [])
	var leader: bool = net.is_leader(l)
	if leader:
		# the leader owns the game settings: keep them sensible for the players who are in
		if _map_seats(cfg_map) < ps.size():
			for m in _maps():
				if int(m[2]) >= ps.size(): cfg_map = m[0]; break
		while ai_seats.size() > 0 and ps.size() + ai_seats.size() > mini(MAX_SEATS, _map_seats(cfg_map)): ai_seats.pop_back()
		var want := {"map": cfg_map, "ai": ai_seats}
		if JSON.stringify(want) != JSON.stringify(_cfg_norm(cfg)): net.set_config(want)
	else:
		cfg_map = str(cfg.get("map", cfg_map))
	_show_lobby(l, cfg if not leader else {"map": cfg_map, "ai": ai_seats})
	if leader and start_at > 0 and ps.size() >= start_at and _all_picked(ps): net.start_battle()

static func _cfg_norm(cfg: Dictionary) -> Dictionary:
	var ai: Array = []
	for a in cfg.get("ai", []) if cfg.get("ai") is Array else []:
		if a is Dictionary: ai.append({n = str(a.get("n", "US")), t = int(a.get("t", 0)), d = int(a.get("d", 1))})
	return {"map": str(cfg.get("map", "")), "ai": ai}

static func _all_picked(ps: Array) -> bool:
	return ps.all(func(p): return p.get("pick") is Dictionary and p.pick.has("nation"))

func _on_started(info: Dictionary) -> void:
	if panel: panel.visible = false
	var ps: Array = info.players.duplicate()
	ps.sort_custom(func(a, b): return int(a.s) < int(b.s))
	var cfg := _cfg_norm(info.get("cfg", {}) if info.get("cfg") is Dictionary else {})
	var mk: String = cfg.map if cfg.map != "" else "bm_splitridge"
	var cap := mini(MAX_SEATS, _map_seats(mk))
	var players: Array = []
	seats = {}
	var nats := _nations()
	for p in ps:
		if players.size() >= cap: break
		var pk: Dictionary = p.get("pick", {}) if p.get("pick") is Dictionary else {}
		var fac: String = str(pk.get("nation", "IR"))
		if not nats.has(fac): fac = "IR"
		seats[int(p.s)] = players.size()
		var tm: int = int(pk.get("team", 0))
		players.append({fac = fac, ai = false, tm = tm if tm > 0 else 100 + players.size()})
	var d := 1
	for a in cfg.ai:
		if players.size() >= cap: break
		var fac: String = a.n if nats.has(a.n) else "US"
		players.append({fac = fac, ai = true, tm = a.t if a.t > 0 else 100 + players.size()})
		d = clampi(a.d, 0, 2)
	if not seats.has(int(info.you)):
		_note("This battle is full.")
		if panel: panel.visible = true
		net.leave()
		return
	started_players = players
	started_seed = int(info.seed) & 0x7fffffff
	B.diff = d
	if B.started:
		# a rejoin by replay from the start: a fresh sim, the scene stays
		B.sim = _fresh_sim()
		B.prev = {}; B.last_pos = {}
	else:
		B.start_online(mk, players, seats[int(info.you)], started_seed)
	_save({"name": my_name, "code": net.code, "token": net.token})
	print("ONLINE started: seat %d of %d (%d AI), map %s, seed %d" % [seats[int(info.you)], players.size(), cfg.ai.size(), mk, started_seed])

func _fresh_sim():
	var s = Sim.new()
	s.init(B.map, started_players, started_seed, B.diff)
	return s

## a healthy player's snapshot replaces our state (desync repair, rejoin after a crash)
func _restore(bytes: PackedByteArray) -> void:
	if B.use_bridge and B.sim != null and B.sim.has_method("load_snapshot"):
		var parsed = JSON.parse_string(bytes.get_string_from_utf8())
		if parsed is Dictionary and parsed.has("bridge_snap") and B.sim.load_snapshot(str(parsed.bridge_snap)):
			B.tick_n = int(parsed.get("tick", B.tick_n))
			B.prev = {}; B.last_pos = {}
			return
		print("ONLINE snapshot refused")
		return
	var s = _fresh_sim()
	if not Codec.load_into(s, bytes):
		print("ONLINE snapshot refused")
		return
	B.sim = s
	B.prev = {}; B.last_pos = {}

func _on_tick(_t: int, orders: Array) -> void:
	var os: Array = []
	for w in orders:
		var o = w.get("o")
		if not (o is Dictionary): continue
		if int(w.get("s", -1)) < 0:
			_sys(o)
			continue
		if not seats.has(int(w.s)): continue
		var d := decode(o)
		if d.is_empty(): continue
		d.team = seats[int(w.s)]
		os.append(d)
	B.sim_tick(os)

## the relay's own orders: a player dropped ("left": the AI holds their army) or came back ("back")
func _sys(o: Dictionary) -> void:
	var slot := int(o.get("s", -1))
	if not seats.has(slot): return
	var seat: int = seats[slot]
	if B.use_bridge and B.sim != null and B.sim.has_method("range_cmd"):
		match str(o.get("sys", "")):
			"left": B.sim.range_cmd({cmd = "set_ai", team = seat, on = true})
			"back": B.sim.range_cmd({cmd = "set_ai", team = seat, on = false})
		return
	var T: Dictionary = B.sim.teams[seat]
	var S = B.sim
	match str(o.get("sys", "")):
		"left":
			if T.ai == null:
				var d: int = S.diff
				T.ai = {d = d, t = 0, bi = 0, rq = 0, nf = 0, re = null, wave = float(S.R.DIFF[d].wave) * S.bs, inc = 1.0, foe = null, dep_f = null, op = null, sub = 1}
		"back":
			if T.ai != null and T.ai.has("sub"): T.ai = null

## orders travel as small int dictionaries (rule 6 of godot/net/README.md): positions rounded to whole map units
func send(o: Dictionary) -> bool:
	var w := {}
	for k in o:
		if k == "team": continue
		var v = o[k]
		if v is float: v = roundi(v)
		elif v is Array: v = v.map(func(x): return roundi(x) if x is float else x)
		w[k] = v
	return net.send_order(w) >= 0

static func decode(w: Dictionary) -> Dictionary:
	if not w.has("t") or w.has("sys"): return {}
	var o := {}
	for k in w:
		var v = w[k]
		if v is float and v == floorf(v): v = int(v)
		elif v is Array: v = v.map(func(x): return int(x) if x is float and x == floorf(x) else x)
		o[k] = v
	o.t = str(o.t)
	if o.has("x"): o.x = float(o.x)
	if o.has("y"): o.y = float(o.y)
	return o

# ------------------------------------------------------------------ the Play online window
func invite_link() -> String:
	var base := WEB_PAGE
	if OS.has_feature("web"):
		var here = JavaScriptBridge.eval("location.origin + location.pathname", true)
		if here is String and here != "": base = here
	return "%s?code=%s" % [base, net.code]

func _note(s: String) -> void:
	if note_lbl: note_lbl.text = s
	B._msg(s)

func _btn(parent: Node, text: String, f: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(f)
	parent.add_child(b)
	return b

func _panel() -> void:
	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-270, -230)
	panel.custom_minimum_size = Vector2(540, 0)
	panel.add_theme_stylebox_override("panel", B._panel_style())
	B.ui.add_child(panel)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	panel.add_child(vb)
	var h := Label.new()
	h.text = "PLAY ONLINE"
	h.add_theme_color_override("font_color", Color(0.95, 0.82, 0.45))
	vb.add_child(h)
	var hc := HBoxContainer.new(); vb.add_child(hc)
	code_lbl = Label.new()
	code_lbl.text = "Finding a game..."
	code_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hc.add_child(code_lbl)
	_btn(hc, "Copy invite link", func():
		DisplayServer.clipboard_set(invite_link())
		_note("Invite link copied: " + invite_link()))
	list_lbl = Label.new()
	vb.add_child(list_lbl)
	# your nation and team
	var nats := _nations()
	var hn := HFlowContainer.new(); vb.add_child(hn)
	var grp := ButtonGroup.new()
	for f in nats:
		var bt := _btn(hn, B.NAT_NAME.get(f, f), func():
			B.my_fac = f
			_pick())
		bt.toggle_mode = true; bt.button_group = grp; bt.button_pressed = B.my_fac == f
	var ht := HBoxContainer.new(); vb.add_child(ht)
	var gt := ButtonGroup.new()
	for i in 5:
		var bt := _btn(ht, "On my own" if i == 0 else "Team %d" % i, func():
			my_team = i
			_pick())
		bt.toggle_mode = true; bt.button_group = gt; bt.button_pressed = my_team == i
	# the leader's settings: map, AI players, start
	leader_box = VBoxContainer.new()
	leader_box.visible = false
	vb.add_child(leader_box)
	var hm := HFlowContainer.new(); leader_box.add_child(hm)
	var gm := ButtonGroup.new()
	for mm in _maps():
		var key: String = mm[0]
		var bt := _btn(hm, "%s (%d)" % [mm[1], mm[2]], func():
			cfg_map = key
			_on_lobby(lobby))
		bt.toggle_mode = true; bt.button_group = gm; bt.button_pressed = cfg_map == key
	var ha := HFlowContainer.new(); leader_box.add_child(ha)
	for f in nats:
		_btn(ha, "+ AI " + f, func():
			ai_seats.append({n = f, t = 0, d = ai_diff})
			_on_lobby(lobby))
	_btn(ha, "- AI", func():
		ai_seats.pop_back()
		_on_lobby(lobby))
	start_btn = _btn(leader_box, "Start battle", func(): net.start_battle())
	# another game: by its code
	var hj := HBoxContainer.new(); vb.add_child(hj)
	code_edit = LineEdit.new()
	code_edit.placeholder_text = "Friend's game code"
	code_edit.max_length = 8
	code_edit.custom_minimum_size = Vector2(190, 0)
	hj.add_child(code_edit)
	var join := func():
		var c := code_edit.text.strip_edges().to_lower()
		if c.length() >= 4: _connect_net(c)
	_btn(hj, "Join", join)
	code_edit.text_submitted.connect(func(_t): join.call())
	_btn(hj, "New private game", func(): _connect_net("", "", false, true))
	note_lbl = Label.new()
	note_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	vb.add_child(note_lbl)
	_btn(vb, "Leave", func():
		net.leave()
		B.get_tree().reload_current_scene())
	if B.has_method("_style"): B._style(panel)

func _show_lobby(l: Dictionary, cfg: Dictionary) -> void:
	if panel == null: return
	var ps: Array = l.get("players", [])
	var lines: Array = []
	for p in ps:
		var pk: Dictionary = p.get("pick", {}) if p.get("pick") is Dictionary else {}
		var tm := int(pk.get("team", 0))
		lines.append("%s%s  -  %s%s" % ["* " if int(p.s) == int(l.get("leader", -1)) else "  ", str(p.name), B.NAT_NAME.get(str(pk.get("nation", "?")), "choosing..."), "  (team %d)" % tm if tm > 0 else ""])
	for a in _cfg_norm(cfg).ai:
		lines.append("  AI  -  %s%s" % [B.NAT_NAME.get(a.n, a.n), "  (team %d)" % a.t if a.t > 0 else ""])
	var mk := str(cfg.get("map", cfg_map))
	var mname := mk
	for m in _maps():
		if m[0] == mk: mname = "%s (%d players)" % [m[1], m[2]]
	code_lbl.text = "Game code  %s" % str(l.get("code", "")).to_upper()
	list_lbl.text = "Map: %s\n%s" % [mname, "\n".join(lines)]
	var leader: bool = net.is_leader(l)
	leader_box.visible = leader
	var total: int = ps.size() + _cfg_norm(cfg).ai.size()
	var room := _map_seats(mk)
	start_btn.disabled = total < 2 or ps.size() > room or not _all_picked(ps)
	if leader:
		note_lbl.text = "Add a friend with the code or the invite link, or add AI players." if total < 2 else ("This map holds %d players." % room if ps.size() > room else "")
	else:
		note_lbl.text = "Waiting for the game's leader (*) to start."

# ------------------------------------------------------------------ small saved state (name, last game)
static func _load_saved() -> Dictionary:
	if not FileAccess.file_exists(SAVE): return {}
	var f := FileAccess.open(SAVE, FileAccess.READ)
	var d = JSON.parse_string(f.get_as_text()) if f != null else null
	return d if d is Dictionary else {}

static func _save(d: Dictionary) -> void:
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	if f != null: f.store_string(JSON.stringify(d))

## web: the page's ?code=abc123 (an invite link); "" when there is none
static func web_code() -> String:
	if not OS.has_feature("web"): return ""
	var v = JavaScriptBridge.eval("new URLSearchParams(location.search).get('code') || ''", true)
	var c: String = str(v).to_lower().strip_edges() if v is String else ""
	var ok: bool = c.length() >= 4 and c.length() <= 8
	for ch in c:
		if not ((ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9")): ok = false
	return c if ok else ""
