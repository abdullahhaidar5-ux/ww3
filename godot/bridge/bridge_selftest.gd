## In-browser proof of the JS-sim bridge (index.html?bridge-test[&minutes=10][&bench]): a 4-player AI battle through
## sim_bridge.gd, printing the state hash every game-minute (compare: node tools-godot/bridge_test.mjs --hash4) and the
## cost per tick; with &bench also 500 units a side. Prints BRIDGETEST lines to the browser console.
extends Node

const Bridge = preload("res://bridge/sim_bridge.gd")
var br := Bridge.new()
var minutes := 10.0
var bench := false
var phase := 0
var sum_ms := 0.0
var sum_rd := 0.0
var worst := 0.0
var k := 0
var next_min := 1

func _ready() -> void:
	if not br.available(): print("BRIDGETEST FAIL: " + Bridge.WEB_ONLY); return
	var T := br.tables()
	print("BRIDGETEST tables: %d kinds, %d nations, %d maps" % [T.kinds.size(), T.nations.size(), T.maps.size()])
	var r := br.new_game({map = "bm_fourmills", seed = 1, diff = 1, players = [{nation = "IR", team = 0}, {nation = "US", team = 1}, {nation = "RU", team = 2}, {nation = "TR", team = 3}]})
	var m := br.map_data()
	print("BRIDGETEST start: ok=%s map %s %dx%d grid %d bytes, heights %d, %d entities, hash %s" % [str(r.ok), str(m.name), int(m.MAPW), int(m.MAPH), m.grid.size(), m.hgrid.a.size(), br.n, br.state_hash()])
	phase = 1

func _process(_dt: float) -> void:
	if phase == 1:
		for i in 60:   # 2 game-seconds per frame
			var t0 := Time.get_ticks_usec()
			br.step(2)
			var dt := (Time.get_ticks_usec() - t0) / 1000.0
			sum_ms += br.step_ms; sum_rd += dt - br.step_ms; worst = maxf(worst, dt); k += 1
			if k == next_min * 1800 or br.over:   # exactly 3600 ticks per game-minute, as the Node reference samples
				var per: Array = []
				for a in br.teams: per.append("%s %du %db" % [a.nation, int(a.units), int(a.blds)])
				print("BRIDGETEST min %d: hash %s  %d entities  %s" % [next_min, br.state_hash(), br.n, " | ".join(per)])
				next_min += 1
			if br.over or k >= int(minutes * 1800): break
		if br.over or k >= int(minutes * 1800):
			print("BRIDGETEST battle: %.0f game-seconds, over=%s; JS side %.2f ms per tick, Godot read (JSON + 2 buffers) %.2f ms per 2-tick step, worst step %.1f ms" % [br.t, str(br.over), sum_ms / k / 2.0, sum_rd / k, worst])
			phase = 2 if bench else 9
	elif phase == 2:
		br.new_game({map = "bm_splitridge", seed = 1, players = [{nation = "IR", ai = false, team = 0}, {nation = "US", ai = false, team = 1}]})
		br.js.ev("(()=>{for(let t=0;t<2;t++){const b=BASES[t],k=['inf','tank','inf','apc','inf'].filter(q=>{const s=stats(G.teams[t].fac,q);return s&&s.dom==='ground';});for(let i=0;i<500;i++)addUnit(t,k[i%k.length],b[0]+(i%25)*22-270,b[1]+((i/25)|0)*22-220);const ids=G.ents.filter(e=>!e.isB&&e.team===t&&e.kind!=='harv'&&e.kind!=='dozer').map(e=>e.id);act(t,{t:'go',mode:'amove',ids,x:BASES[1-t][0],y:BASES[1-t][1]});}})()")
		sum_ms = 0.0; sum_rd = 0.0; worst = 0.0; k = 0; phase = 3
	elif phase == 3:
		for i in 30:
			var t0 := Time.get_ticks_usec()
			br.step(1)
			var dt := (Time.get_ticks_usec() - t0) / 1000.0
			sum_ms += br.step_ms; sum_rd += dt - br.step_ms; worst = maxf(worst, dt); k += 1
		if br.t >= 60.0:
			print("BRIDGETEST bench 500 units a side, 60 game-seconds: %d entities now; JS sim %.2f ms per tick, Godot read %.2f ms per tick, worst tick %.1f ms" % [br.n, sum_ms / k, sum_rd / k, worst])
			phase = 9
	elif phase == 9:
		print("BRIDGETEST DONE"); phase = 10
