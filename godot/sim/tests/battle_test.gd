## Headless AI-vs-AI battle for the Godot sim port. Logs units / buildings / money per side per game-minute and the
## GDScript cost per sim step (same table as tools-godot/js_baseline.mjs prints for the browser game).
##   godot --headless --path <project> -s res://sim/tests/battle_test.gd -- --facs IR,US --map bm_splitridge --minutes 10 --seed 1 --out res.json
##   ... -- --bench 600         # step-time benchmark: 600 units (300 a side) fighting in the middle of the map
extends SceneTree

const Sim = preload("res://sim/sim.gd")

func arg(k: String, d: String) -> String:
	var a := OS.get_cmdline_user_args()
	var i := a.find("--" + k)
	return a[i + 1] if i >= 0 and i + 1 < a.size() else d

func _init() -> void:
	if arg("bench", "") != "": bench(int(arg("bench", "600"))); quit(); return
	if arg("rng", "") != "": rng_check(); quit(); return
	var facs := arg("facs", "IR,US").split(",")
	var mk := arg("map", "bm_splitridge"); var seed_v := int(arg("seed", "1")); var minutes := int(arg("minutes", "10"))
	var map := Sim.load_json("res://data/map_%s.json" % mk)
	var sim = Sim.new()
	var players: Array = []
	for f in facs: players.append({fac = f, ai = true})
	var t0 := Time.get_ticks_usec()
	sim.init(map, players, seed_v, int(arg("diff", "1")))
	print("godot: %s on %s, seed %d; set up in %.0f ms" % [" vs ".join(facs), mk, seed_v, (Time.get_ticks_usec() - t0) / 1000.0])
	sim.do_prof = true
	var rows: Array = []
	rows.append(row(sim, 0.0, 0))
	for m in range(1, minutes + 1):
		var c0 := Time.get_ticks_usec(); var n := 0
		for i in 3600:
			if sim.over: break
			sim.step(); n += 1
		rows.append(row(sim, (Time.get_ticks_usec() - c0) / 1000.0, n))
		if sim.over: break
	var prof: Dictionary = sim.prof
	var steps := 0
	for r in rows: steps += r.steps
	var ptxt: Array = []
	for k in prof: ptxt.append("%s %.3f" % [k, prof[k] / maxi(1, steps)])
	print("ms/step by section: " + ", ".join(ptxt))
	var out := arg("out", "")
	if out != "":
		var f := FileAccess.open(out, FileAccess.WRITE)
		f.store_string(JSON.stringify({engine = "godot", facs = facs, map = mk, seed = seed_v, rows = rows, prof = prof}, " "))
		print("wrote " + out)
	quit()

func row(sim, ms: float, steps: int) -> Dictionary:
	var i: Dictionary = sim.info()
	var per: Array = []
	var txt: Array = []
	for p in i.per:
		per.append(p)
		txt.append("%s %du %db $%d" % [p.fac, p.units, p.blds, p.credits])
	var r := {min = roundi(i.t / 60.0), over = i.over, winner = i.winner, ents = i.ents, steps = steps, msPerStep = snappedf(ms / steps, 0.001) if steps else 0.0, per = per}
	print("min %2d  %s  ents %d  %.3f ms/step" % [r.min, "  |  ".join(txt), r.ents, r.msPerStep])
	return r

## 600 units (300 per side, the 4 nations' real stats) meeting in the middle of the map: GDScript cost per sim step
func bench(n: int) -> void:
	var map := Sim.load_json("res://data/map_%s.json" % arg("map", "bm_splitridge"))
	for pair in [["IR", "US"], ["RS", "IL"]]:
		var sim = Sim.new()
		sim.init(map, [{fac = pair[0], ai = false}, {fac = pair[1], ai = false}], 1, 1)
		var mix := ["inf", "inf", "inf", "at", "tank", "inf", "arty", "aa", "inf", "tank"]
		for side in 2:
			var b: Array = sim.bases[side]
			var sx := float(b[0]); var sy := float(b[1])
			var tx := float(sim.bases[1 - side][0])
			for k in n / 2:
				var kind: String = mix[k % mix.size()]
				var p = sim.nav.nearest_pass_xy(0, sx + (220 if side == 0 else -220) + (k % 15) * 22 * (1 if side == 0 else -1), sy - 300 + (k / 15) * 30)
				if p == null: continue
				var u = sim.add_unit(side, kind, p.x, p.y)
				if u != null: sim.set_move(u, (sx + tx) / 2.0, sy - 300 + (k / 15) * 30, "amove")
		sim.do_prof = true
		var units := 0
		for e in sim.ents:
			if not e.is_b: units += 1
		var c0 := Time.get_ticks_usec(); var worst := 0.0
		var steps := int(arg("steps", "1200"))
		for i in steps:
			var s0 := Time.get_ticks_usec()
			sim.step()
			worst = maxf(worst, (Time.get_ticks_usec() - s0) / 1000.0)
		var ms := (Time.get_ticks_usec() - c0) / 1000.0
		var alive := 0
		for e in sim.ents:
			if not e.is_b: alive += 1
		var ptxt: Array = []
		for k in sim.prof: ptxt.append("%s %.2f" % [k, sim.prof[k] / steps])
		print("BENCH %s vs %s: %d units at start (%d alive after %d s): %.2f ms/step mean, %.1f ms worst  |  %s" % [pair[0], pair[1], units, alive, steps / 60, ms / steps, worst, ", ".join(ptxt)])

func rng_check() -> void:
	var R = preload("res://sim/sim_rng.gd").new(1)
	var v: Array = []
	for i in 5: v.append("%.17f" % R.next())
	print("RNG seed1: " + " ".join(v))
