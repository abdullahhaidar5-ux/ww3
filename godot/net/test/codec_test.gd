## Snapshot round trip on the real Battle sim: run a battle, save, load into a fresh sim, run both on and compare
## the whole-state hash. Also proves the hash is stable (same seed twice = same hashes).
##   godot --headless --path godot -s res://net/test/codec_test.gd -- --map bm_fourmills --facs IR,US,RS,IL --minutes 4
extends SceneTree

const Sim = preload("res://sim/sim.gd")
const Codec = preload("res://net/state_codec.gd")

func arg(k: String, d: String) -> String:
	var a := OS.get_cmdline_user_args()
	var i := a.find("--" + k)
	return a[i + 1] if i >= 0 and i + 1 < a.size() else d

func mk(map: Dictionary, facs: PackedStringArray, seed_v: int):
	var s = Sim.new()
	var players: Array = []
	for f in facs: players.append({fac = f, ai = true})
	s.init(map, players, seed_v, 1)
	return s

func _init() -> void:
	var facs := arg("facs", "IR,US").split(",")
	var map := Sim.load_json("res://data/map_%s.json" % arg("map", "bm_splitridge"))
	var minutes := int(arg("minutes", "4")); var seed_v := int(arg("seed", "3"))
	var fails := 0
	var a = mk(map, facs, seed_v); var c = mk(map, facs, seed_v)
	var saves := 0
	var b = null
	for m in minutes * 2:
		for i in 1800:
			a.step(); c.step()
			if b != null: b.step()
		var ha := Codec.hash_of(a)
		if ha != Codec.hash_of(c): fails += 1; print("FAIL same seed, different hash at %d s" % int(a.t))
		if b != null and Codec.hash_of(b) != ha:
			fails += 1; print("FAIL restored sim went different by %d s" % int(a.t))
			var da := Codec.digest(a); var db := Codec.digest(b)
			for i in da.size():
				if da[i] != db[i]: print("   differs: " + da[i].split(" ")[0])
			b = null
		# a fresh copy from a snapshot every minute; it must stay identical from then on
		if m % 2 == 1 or b == null:
			var t0 := Time.get_ticks_msec()
			var bytes := Codec.save(a)
			var t1 := Time.get_ticks_msec()
			b = mk(map, facs, seed_v)
			var ok := Codec.load_into(b, bytes)
			var hb := Codec.hash_of(b)
			saves += 1
			print("t %4d s  ents %4d  snapshot %d KB  save %d ms  load %d ms  %s" % [int(a.t), a.ents.size(), bytes.size() / 1024, t1 - t0, Time.get_ticks_msec() - t1, "ok" if ok and hb == ha else "DIFFERENT"])
			if not ok or hb != ha: fails += 1
			if Codec.hash_of(a) != ha: fails += 1; print("FAIL saving changed the state")
	var t2 := Time.get_ticks_msec()
	for i in 20: Codec.hash_of(a)
	print("hash %.1f ms each (%d entities)" % [(Time.get_ticks_msec() - t2) / 20.0, a.ents.size()])
	print("CODEC PASS (%d snapshots)" % saves if fails == 0 else "CODEC FAIL (%d)" % fails)
	quit(0 if fails == 0 else 1)
