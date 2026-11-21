## Quick checks for det.gd (run headless; prints DET PASS / DET FAIL):
##   godot --headless --path <project with res://net> --script res://net/test/det_test.gd
extends SceneTree

const Det = preload("res://net/det.gd")
var fails := 0

func check(name: String, got, want) -> void:
	if got != want:
		fails += 1
		print("FAIL %s: got %s want %s" % [name, str(got), str(want)])

func _initialize() -> void:
	check("sin 0", Det.sin_a(0), 0)
	check("sin 90", Det.sin_a(1024), 65536)
	check("sin 180", Det.sin_a(2048), 0)
	check("sin 270", Det.sin_a(3072), -65536)
	check("cos 0", Det.cos_a(0), 65536)
	check("sin 30", absi(Det.sin_a(341) - 32768) < 200, true)
	check("atan2 45", Det.atan2_a(5, 5), 512)
	check("atan2 90", Det.atan2_a(7, 0), 1024)
	check("atan2 180", Det.atan2_a(0, -3), 2048)
	check("atan2 -90", Det.atan2_a(-9, 0), 3072)
	check("atan2 135", Det.atan2_a(4, -4), 1536)
	check("isqrt", [Det.isqrt(0), Det.isqrt(1), Det.isqrt(15), Det.isqrt(16), Det.isqrt(1 << 40)], [0, 1, 3, 4, 1 << 20])
	check("fmul", Det.fmul(3 * Det.ONE, Det.ONE / 2), 3 * Det.ONE / 2)
	check("fdiv", Det.fdiv(Det.ONE, 4 * Det.ONE), Det.ONE / 4)
	var r = Det.Rng.new(12345)
	# same sequence as server-godot/test/sim.mjs: new Rng(12345) -> 3336926330, 1697253807, 2816511904
	check("rng", [r.next(), r.next(), r.next()], [3336926330, 1697253807, 2816511904])
	check("fnv", Det.fnv_array(Det.FNV_START, [1, -1, 70000]), 2943913922)
	print("DET PASS" if fails == 0 else "DET FAIL (%d)" % fails)
	quit(0 if fails == 0 else 1)
