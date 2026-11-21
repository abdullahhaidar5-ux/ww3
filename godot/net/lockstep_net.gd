## Lockstep multiplayer client for World War 3 (Godot edition). Works in the Windows build and the Web build
## (WebSocketPeer uses the browser's WebSocket on the Web). The relay (server-godot/) owns the clock: it closes one
## "turn" of 3 sim ticks every 100 ms and sends every player the same orders for it. This node turns those turns
## into `tick` signals at 30 Hz. The battle steps its simulation ONLY inside `tick` - never in _process.
##
##   var net := preload("res://net/lockstep_net.gd").new()
##   add_child(net)
##   net.state_hash = battle.hash_state          # func() -> int   (32-bit is plenty; see det.gd fnv)
##   net.snapshot = battle.save_state            # optional func() -> PackedByteArray  (fast rejoin + desync repair)
##   net.restore = battle.load_state             # optional func(PackedByteArray) -> void
##   net.tick.connect(battle.step)               # func(t: int, orders: Array) ; orders = [{s, q, o}]
##   net.join(NetConfig.RELAY_URL, "abc234", "Abdullah")     # or net.quick_play(...) / net.create(...)
##   net.send_order({"k": "mv", "u": [3, 4], "x": 1200, "y": 800})   # ints, strings, arrays, dicts only
## Full API and rules: godot/net/README.md. Wire protocol: server-godot/PROTOCOL.md.
extends Node

signal joined(you: int, code: String)
signal lobby_changed(lobby: Dictionary)      # {code, leader, cfg, players: [{s, name, pick, ready, on}], max}
signal chat(slot: int, text: String)
signal battle_started(info: Dictionary)      # {seed, hz, tpt, turnMs, hashEvery, you, cfg, players: [{s, name, pick}]}
signal tick(t: int, orders: Array)           # orders only on the first tick of each turn: [{"s": slot, "q": seq, "o": {...}}]
signal roster_changed(players: Array)        # [{s, name, on}] - "left"/"back" also arrive as sys orders in `tick`
signal desync(turn: int, hashes: Dictionary, bad: Array)
signal resynced(turn: int)                   # our state was replaced by a healthy player's snapshot
signal connection_lost()                     # we keep trying to reconnect (same slot) for `reconnect_for` seconds
signal reconnected()
signal failed(reason: String)                # refused, ended or gave up reconnecting
signal ended(reason: String)

const PROTO := 1
const PING_EVERY := 15.0
const DEAD_BATTLE := 5.0          # no turn for 5 s = the link is dead (turns arrive 10x a second)
const DEAD_LOBBY := 40.0

var state_hash: Callable
var snapshot: Callable
var restore: Callable
var realtime := true              # false: run every tick we have as fast as possible (headless tests)
var max_ticks_per_frame := 12     # catch-up speed cap (12 ticks/frame at 60 fps = 24x real time)
var reconnect_for := 60.0
var token := ""                   # keep it (e.g. in user://) to rejoin the same slot after a crash
var name_ := ""

# lobby/battle state (read-only for callers)
var code := ""
var you := -1
var phase := "offline"            # offline | finding | connecting | lobby | battle | ended
var info := {}
var turn := 0                     # next turn to execute
var sub := 0                      # next tick inside that turn
var t := 0                        # global tick counter (== turn * tpt + sub)
var recv_upto := -1               # every turn <= recv_upto has been received
var desyncs := 0

var _ws := WebSocketPeer.new()
var _base := ""
var _turns := {}                  # k -> Array of orders
var _seq := 0
var _acc := 0.0
var _ping := 0.0
var _rx := 0.0                    # seconds since we last heard from the relay
var _hz := 30
var _tpt := 3
var _turn_ms := 100
var _hash_every := 10
var _was_open := false
var _retry_at := -1.0
var _lost_at := -1.0
var _backoff := 0.5
var _await_snap := false
var _snap_parts := []
var _snap_k := -1
var _snap_req := -1               # a snapshot the relay asked us for (we send it after the next whole turn)
var _replaying := false
var _test_query := ""

func _ready() -> void:
	set_process(true)

# ---------------- public API ----------------

## Join (or create) the room with this code. url: "wss://ww3-godot-relay.<sub>.workers.dev" (or http(s)://, ws://).
func join(url: String, room_code: String, player_name: String) -> void:
	_base = _ws_base(url)
	phase = "connecting"
	code = room_code.to_lower().strip_edges()
	name_ = player_name
	if token == "":
		token = _new_token()
	_reset_battle()
	_open()

## Fresh code from the relay, then join it. Calls back through `joined` / `failed`.
func create(url: String, player_name: String) -> void:
	_fetch_code(url, "/new", player_name)

## "Play online": an open lobby with room, else a fresh one.
func quick_play(url: String, player_name: String) -> void:
	_fetch_code(url, "/quick", player_name)

func send_order(order: Dictionary) -> int:
	if phase != "battle":
		return -1
	if _has_float(order):
		push_warning("lockstep: order contains floats; use ints (fixed point) so every machine agrees")
	_seq += 1
	_send({"t": "o", "s": _seq, "o": order})
	return _seq

func set_pick(pick: Dictionary) -> void:       # {nation, team, color...}: free-form, <= 256 bytes
	_send({"t": "pick", "p": pick})

func set_ready(r: bool) -> void:
	_send({"t": "ready", "r": r})

func set_config(cfg: Dictionary) -> void:      # leader only: {map, ...} <= 2 KB
	_send({"t": "cfg", "cfg": cfg})

func start_battle() -> void:                   # leader only
	_send({"t": "start"})

func say(text: String) -> void:
	_send({"t": "c", "m": text})

func leave() -> void:
	if _ws.get_ready_state() == WebSocketPeer.STATE_OPEN:
		_send({"t": "bye"})
		_ws.close(1000, "bye")
	phase = "offline"
	_retry_at = -1.0

## Ticks we have received but not run yet (UI can show "catching up" when this is large).
func buffered_ticks() -> int:
	return (recv_upto + 1) * _tpt - t

func is_leader(lobby: Dictionary) -> bool:
	return int(lobby.get("leader", -1)) == you

# ---------------- main loop ----------------

func _process(delta: float) -> void:
	_poll(delta)
	if phase == "battle" and not _await_snap:
		_run_ticks(delta)

func _poll(delta: float) -> void:
	if phase == "offline" or phase == "ended" or phase == "finding":
		return
	if _retry_at >= 0.0:
		_retry_at -= delta
		if _retry_at < 0.0:
			_open()
		return
	_ws.poll()
	var st := _ws.get_ready_state()
	if st == WebSocketPeer.STATE_OPEN:
		_was_open = true
		_rx += delta
		if _rx > (DEAD_BATTLE if phase == "battle" else DEAD_LOBBY):
			_drop()
			return
		while _ws.get_available_packet_count() > 0:
			_rx = 0.0
			var raw := _ws.get_packet().get_string_from_utf8()
			var m = JSON.parse_string(raw)
			if m is Dictionary:
				_on_msg(_ints(m))
		_ping += delta
		if _ping >= PING_EVERY:
			_send({"t": "p"})
	elif st == WebSocketPeer.STATE_CONNECTING or st == WebSocketPeer.STATE_CLOSING:
		_rx += delta
		if _rx > 10.0:
			_drop()
	elif st == WebSocketPeer.STATE_CLOSED:
		_on_closed()

func _run_ticks(delta: float) -> void:
	var step := float(_turn_ms) / 1000.0 / float(_tpt)
	var avail := buffered_ticks()
	var budget := max_ticks_per_frame
	if not realtime:
		budget = 1000000
		_acc = step * avail
	elif _replaying:
		budget = max_ticks_per_frame * 8
		_acc = step * min(avail, budget)
		if avail <= _tpt * 2:
			_replaying = false
	else:
		_acc += delta
		# keep about one turn of jitter buffer; run faster when we fall behind
		if avail > _tpt * 3:
			_acc += step * min(avail - _tpt * 2, max_ticks_per_frame)
	var ran := 0
	while ran < budget and _acc >= step * 0.999 and _can_tick():
		_do_tick()
		_acc -= step
		ran += 1
	if not _can_tick():
		_acc = min(_acc, step)    # starved: don't bank time

func _can_tick() -> bool:
	return turn <= recv_upto

func _do_tick() -> void:
	var orders: Array = []
	if sub == 0:
		orders = _turns.get(turn, [])
	tick.emit(t, orders)
	t += 1
	sub += 1
	if sub >= _tpt:
		var k := turn
		_turns.erase(k)
		turn += 1
		sub = 0
		if k % _hash_every == 0:
			var msg := {"t": "H", "k": k}
			if state_hash.is_valid():
				msg["h"] = str(int(state_hash.call()) & 0xFFFFFFFF)
			_send(msg)
		if _snap_req >= 0:
			_send_snapshot(k)

# ---------------- messages ----------------

func _on_msg(m: Dictionary) -> void:
	match str(m.get("t", "")):
		"W":
			you = m.you
			token = str(m.tok)
			code = str(m.code)
			if _lost_at >= 0.0:
				_lost_at = -1.0
				reconnected.emit()
			_backoff = 0.5
			if str(m.phase) == "lobby":
				phase = "lobby"
			joined.emit(you, code)
		"E":
			_fail(str(m.m))
		"L":
			phase = "lobby"
			lobby_changed.emit(m)
		"c":
			chat.emit(int(m.s), str(m.m))
		"R":
			roster_changed.emit(m.players)
		"S":
			_on_start(m)
		"T":
			var k := int(m.k)
			if k == recv_upto + 1:
				if m.has("o"):
					_turns[k] = _orders(m.o)
				recv_upto = k
		"C":
			_on_catchup(m)
		"H":
			pass
		"D":
			desyncs += 1
			desync.emit(int(m.k), m.h, m.bad)
		"SR":
			_snap_req = int(m.id)
		"SW":
			_await_snap = true
			_snap_parts = []
		"snap":
			_on_snap(m)
		"SX":
			_await_snap = false
		"X":
			phase = "ended"
			ended.emit(str(m.m))

func _on_start(m: Dictionary) -> void:
	info = m
	_hz = int(m.hz)
	_tpt = int(m.tpt)
	_turn_ms = int(m.turnMs)
	_hash_every = int(m.hashEvery)
	you = int(m.you)
	if phase != "battle":       # first start, or a fresh rejoin; a reconnect after a blip keeps its state
		phase = "battle"
		_reset_battle()
		battle_started.emit(m)

func _on_catchup(m: Dictionary) -> void:
	var from := int(m.from)
	var to := int(m.to)
	if t > 0 and (int(m.get("replay", 0)) == 1 or from == 0):
		# replay from the start: the battle must reset itself to the start state on `battle_started`
		_reset_battle()
		battle_started.emit(info)
	if from > recv_upto + 1:
		push_warning("lockstep: catch-up gap %d..%d" % [recv_upto + 1, from - 1])
	for e in m.o:
		var k := int(e[0])
		if k > recv_upto:
			_turns[k] = _orders(e[1])
	recv_upto = max(recv_upto, to)
	if from == 0 or to - from > 30:
		_replaying = true

func _on_snap(m: Dictionary) -> void:
	_snap_k = int(m.k)
	_snap_parts.resize(int(m.n))
	_snap_parts[int(m.i)] = str(m.d)
	for p in _snap_parts:
		if p == null:
			return
	var b64 := "".join(PackedStringArray(_snap_parts))
	var data := Marshalls.base64_to_raw(b64)
	if restore.is_valid():
		restore.call(data)
	# the snapshot is the state after turn _snap_k; the relay sends turns _snap_k+1.. right after it
	turn = _snap_k + 1
	sub = 0
	t = turn * _tpt
	_turns = {}
	recv_upto = _snap_k             # the relay's catch-up right after the last part refills _snap_k+1..now
	_await_snap = false
	_snap_parts = []
	_replaying = true
	resynced.emit(_snap_k)

func _send_snapshot(k: int) -> void:
	var id := _snap_req
	_snap_req = -1
	if not snapshot.is_valid():
		return
	var b64 := Marshalls.raw_to_base64(snapshot.call())
	var part := 512 * 1024
	var n: int = max(1, ceili(float(b64.length()) / part))
	for i in n:
		_send({"t": "snap", "id": id, "k": k, "i": i, "n": n, "d": b64.substr(i * part, part)})

# ---------------- connection ----------------

func _open() -> void:
	var have := recv_upto if (phase == "battle" and recv_upto >= 0) else -1
	var snap_ok := 1 if (snapshot.is_valid() and restore.is_valid()) else 0
	var url := "%s/room/%s?v=%d&name=%s&tok=%s&have=%d&snap=%d%s" % [_base, code, PROTO, name_.uri_encode(), token, have, snap_ok, _test_query]
	_ws = WebSocketPeer.new()
	_ws.inbound_buffer_size = 4 * 1024 * 1024
	_ws.outbound_buffer_size = 2 * 1024 * 1024
	_ws.max_queued_packets = 8192
	_was_open = false
	_rx = 0.0
	var err := _ws.connect_to_url(url)
	if err != OK:
		_on_closed()

func _on_closed() -> void:
	if phase == "ended" or phase == "offline":
		return
	var why := _ws.get_close_reason()
	if _ws.get_close_code() == 4001:
		_fail(why if why != "refused" else "The battle server refused to let us in.")
		return
	if _ws.get_close_code() == 4000:
		_fail("This player joined the battle from another window.")
		return
	if _lost_at < 0.0:
		_lost_at = Time.get_ticks_msec() / 1000.0
		connection_lost.emit()
	if Time.get_ticks_msec() / 1000.0 - _lost_at > reconnect_for:
		_fail("Lost the connection to the battle server." + (" (" + why + ")" if why != "" else ""))
		return
	_retry_at = _backoff
	_backoff = min(_backoff * 2.0, 4.0)

## abandon the current socket without waiting for a close handshake (a dead network never answers one)
func _drop() -> void:
	_ws = WebSocketPeer.new()
	_on_closed()

func _fail(why: String) -> void:
	phase = "ended"
	_retry_at = -1.0
	failed.emit(why)

func _send(m: Dictionary) -> void:
	if _ws.get_ready_state() == WebSocketPeer.STATE_OPEN:
		_ws.send_text(JSON.stringify(m))
		_ping = 0.0

func _reset_battle() -> void:
	_turns = {}
	turn = 0
	sub = 0
	t = 0
	recv_upto = -1
	_acc = 0.0
	_replaying = false

func _fetch_code(url: String, path: String, player_name: String) -> void:
	phase = "finding"            # asking the relay for a code; no socket yet
	if not is_inside_tree():
		await tree_entered
	await get_tree().process_frame   # HTTPRequest refuses to start before the node is fully in the tree
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, status, _h, body):
		http.queue_free()
		var m = JSON.parse_string(body.get_string_from_utf8()) if status == 200 else null
		if result != HTTPRequest.RESULT_SUCCESS or not (m is Dictionary) or not m.has("code"):
			_fail("Can't reach the battle server.")
			return
		join(url, str(m.code), player_name))
	var err := http.request(_http_base(url) + path)
	if err != OK:
		_fail("Can't reach the battle server.")

## tests only: e.g. "&turnms=10" (honoured only by local/test relays)
func set_test_query(q: String) -> void:
	_test_query = q

# ---------------- helpers ----------------

static func _ws_base(url: String) -> String:
	var u := url.strip_edges().trim_suffix("/")
	if u.begins_with("https://"):
		return "wss://" + u.substr(8)
	if u.begins_with("http://"):
		return "ws://" + u.substr(7)
	return u

static func _http_base(url: String) -> String:
	var u := url.strip_edges().trim_suffix("/")
	if u.begins_with("wss://"):
		return "https://" + u.substr(6)
	if u.begins_with("ws://"):
		return "http://" + u.substr(5)
	return u

static func _orders(a) -> Array:
	var out: Array = []
	for e in a:
		out.append({"s": int(e[0]), "q": int(e[1]), "o": e[2]})
	return out

## JSON gives every number back as float; whole numbers become ints again so the sim sees exactly what was sent.
static func _ints(v):
	if v is float:
		return int(v) if v == floorf(v) and absf(v) < 9.0e15 else v
	if v is Array:
		var a: Array = []
		for x in v:
			a.append(_ints(x))
		return a
	if v is Dictionary:
		var d := {}
		for k in v:
			d[k] = _ints(v[k])
		return d
	return v

static func _has_float(v) -> bool:
	if v is float:
		return true
	if v is Array:
		for x in v:
			if _has_float(x):
				return true
	if v is Dictionary:
		for k in v:
			if _has_float(v[k]):
				return true
	return false

static func _new_token() -> String:
	var c := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var s := ""
	var r := RandomNumberGenerator.new()
	r.randomize()
	for i in 20:
		s += c[r.randi() % c.length()]
	return s
