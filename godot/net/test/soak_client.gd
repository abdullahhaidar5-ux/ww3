## Headless Godot client for the netcode soak test (run by server-godot/test/soak.mjs, which makes a throwaway
## project folder whose res://net points at godot/net). Plays the toy battle with random orders and prints
## "HASH <turn> <hash>" lines; the harness checks every client printed the same hash for the same turn.
##   godot --headless --path <tmp> --script res://net/test/soak_client.gd -- --url ws://127.0.0.1:8788 --code abc234
##     --name G1 --stop 6000 [--query "&turnms=10"] [--blip-at T] [--crash-at T] [--corrupt-at T] [--nosnap]
##     [--realtime 0|1] [--order-p 0.3] [--quick] [--slow-ms 5]   (--quick: find the room via /quick instead of --code)
extends SceneTree

const Net = preload("res://net/lockstep_net.gd")
const Toy = preload("res://net/test/toy_sim.gd")

var a := {}
var net
var sim
var stop_turn := 600
var done := false
var crashed := false
var blipped := false
var corrupted := false
var rnd := RandomNumberGenerator.new()
var order_p := 0.3
var started_ms := 0

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var i := 0
	while i < args.size():
		var k: String = args[i]
		if k.begins_with("--"):
			var v := "1"
			if i + 1 < args.size() and not str(args[i + 1]).begins_with("--"):
				v = args[i + 1]
				i += 1
			a[k.substr(2)] = v
		i += 1
	stop_turn = int(a.get("stop", "600"))
	order_p = float(a.get("order-p", "0.3"))
	rnd.randomize()
	Engine.max_fps = 240
	started_ms = Time.get_ticks_msec()
	_make_net("")

func _make_net(tok: String) -> void:
	net = Net.new()
	net.token = tok
	net.realtime = a.get("realtime", "1") == "1"
	net.set_test_query(a.get("query", ""))
	net.state_hash = func():
		var h: int = sim.hash_state()
		print("HASH %d %d" % [net.turn - 1, h])
		return h
	if not a.has("nosnap"):
		net.snapshot = func(): return sim.snapshot()
		net.restore = func(d): sim.restore(d)
	net.battle_started.connect(_on_started)
	net.tick.connect(_on_tick)
	net.joined.connect(func(you, code): print("EVENT joined slot=%d code=%s" % [you, code]))
	net.desync.connect(func(k, h, bad): print("EVENT desync turn=%d bad=%s" % [k, str(bad)]))
	net.resynced.connect(func(k): print("EVENT resynced turn=%d" % k))
	net.connection_lost.connect(func(): print("EVENT lost turn=%d" % net.turn))
	net.reconnected.connect(func(): print("EVENT reconnected turn=%d" % net.turn))
	net.failed.connect(func(why): print("EVENT failed " + why); _finish(2))
	net.ended.connect(func(why): print("EVENT ended " + why))
	root.add_child(net)
	if a.has("quick") and tok == "":
		net.quick_play(a.get("url", "ws://127.0.0.1:8788"), a.get("name", "G"))   # the "Play online" path (HTTP /quick)
	else:
		net.join(a.get("url", "ws://127.0.0.1:8788"), a.get("code", net.code), a.get("name", "G"))

func _on_started(info: Dictionary) -> void:
	var slots: Array = []
	for p in info.players:
		slots.append(int(p.s))
	sim = Toy.new(int(info.seed), slots)
	print("EVENT started seed=%d you=%d players=%d" % [int(info.seed), int(info.you), slots.size()])

func _on_tick(t: int, orders: Array) -> void:
	sim.step(orders)
	if a.has("slow-ms"):
		OS.delay_usec(int(float(a["slow-ms"]) * 1000.0))   # a slow PC: the relay must wait for it (lag rule)
	if net.sub != net._tpt - 1:
		return
	# end of a turn (this tick is its last): test events, random orders, stop
	var k: int = net.turn
	if k >= stop_turn and not done:
		done = true
		call_deferred("_finish", 0)
		return
	if a.has("corrupt-at") and not corrupted and k >= int(a["corrupt-at"]):
		corrupted = true
		sim.u[0][1] += 1
		print("EVENT corrupt turn=%d" % k)
	if a.has("blip-at") and not blipped and k >= int(a["blip-at"]):
		blipped = true
		print("EVENT blip turn=%d" % k)
		net._ws.close()
	if a.has("crash-at") and not crashed and k >= int(a["crash-at"]):
		crashed = true
		print("EVENT crash turn=%d" % k)
		call_deferred("_crash")
		return
	if net.buffered_ticks() < 30 and rnd.randf() < order_p:
		var mine: Array = sim.owned(net.you)
		if rnd.randf() < 0.7 and mine.size() > 0:
			var us: Array = []
			for j in rnd.randi_range(1, 4):
				us.append(mine[rnd.randi() % mine.size()])
			net.send_order({"k": "mv", "u": us, "x": rnd.randi() % Toy.W, "y": rnd.randi() % Toy.W})
		else:
			net.send_order({"k": "sp"})

func _crash() -> void:
	# lose everything (as if the game was closed and opened again) and rejoin with the same token
	var tok: String = net.token
	var room: String = net.code
	net.set_process(false)
	net._ws = WebSocketPeer.new()
	net.queue_free()
	sim = null
	a["code"] = room
	_make_net(tok)

func _finish(code: int) -> void:
	print("DONE turn=%d desyncs=%d secs=%.1f" % [net.turn, net.desyncs, (Time.get_ticks_msec() - started_ms) / 1000.0])
	net.leave()
	quit(code)
