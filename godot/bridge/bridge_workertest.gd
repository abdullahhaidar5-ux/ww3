## In-browser measurement of the Web Worker bridge (index.html?worker-test[&units=500]): N units a side attack-moving,
## Godot asks for one 2-tick step per 30 Hz frame. Prints: worker ms per step, bytes per step, main-thread ms per frame
## spent on the bridge (JS message handling + Godot's read), and the hash check against the on-page sim.
extends Node

const Bridge = preload("res://bridge/sim_bridge.gd")
var br := Bridge.new()
var units := 500
var phase := 0
var acc := 0.0
var main_us := 0
var frames := 0
var got := 0
var n_max := 0

func _process(dt: float) -> void:
	if phase == 0:
		if not br.available(): print("BRIDGETEST FAIL: " + Bridge.WEB_ONLY); phase = 9; return
		if not br.booted(): return
		print("BRIDGETEST worker=%s booted: %d kinds, IR rules %d units" % [str(br.worker), br.tables().kinds.size(), br.rules("IR").units.size()])
		br.want_hash = true
		br.new_game({map = "bm_fourmills", seed = 1, diff = 1, players = [{nation = "IR", team = 0}, {nation = "US", team = 1}, {nation = "RU", team = 2}, {nation = "TR", team = 3}]})
		phase = 1
	elif phase == 1:
		if not br.ready(): return
		var m := br.map_data()
		print("BRIDGETEST worker game ready: %s, grid %d bytes, %d entities" % [str(m.name), m.grid.size(), br.n])
		phase = 2
	elif phase == 2:    # one game-minute as fast as the worker answers: the hash must equal the on-page / Node one
		for i in 4: br.step(2)
		while br.poll(): got += 1
		if got >= 1800:
			print("BRIDGETEST worker min 1: hash %s  %d entities (Node: see tools-godot/bridge_test.mjs --hash4)" % [br.state_hash(), br.n])
			br.want_hash = false; br.worker_stats()
			br.new_game({map = "bm_splitridge", seed = 1, players = [{nation = "IR", ai = false, team = 0}, {nation = "US", ai = false, team = 1}]})
			phase = 3
	elif phase == 3:
		if not br.ready(): return
		br.js.ev("(()=>{for(let t=0;t<2;t++){const b=BASES[t],k=['inf','tank','inf','apc','inf'].filter(q=>{const s=stats(G.teams[t].fac,q);return s&&s.dom==='ground';});for(let i=0;i<%d;i++)addUnit(t,k[i%%k.length],b[0]+(i%%25)*22-270,b[1]+((i/25)|0)*22-220);const ids=G.ents.filter(e=>!e.isB&&e.team===t&&e.kind!=='harv'&&e.kind!=='dozer').map(e=>e.id);act(t,{t:'go',mode:'amove',ids,x:BASES[1-t][0],y:BASES[1-t][1]});}})()" % units)
		br.fog_team = 0; got = 0; frames = 0; main_us = 0; acc = 0.0; phase = 4
	elif phase == 4:
		acc += dt
		var t0 := Time.get_ticks_usec()
		while acc >= 1.0 / 30.0:
			acc -= 1.0 / 30.0
			br.step(2)
		while br.poll(): got += 1; n_max = maxi(n_max, br.n)
		main_us += Time.get_ticks_usec() - t0; frames += 1
		if br.t >= 60.0:
			var s := br.worker_stats()
			print("BRIDGETEST worker bench %d units a side, 60 game-seconds in %d frames: up to %d entities; worker %.2f ms per 2-tick step (%.2f ms per tick), %d bytes per step, main thread: %.3f ms per frame in Godot (request + read + parse) + %.4f ms per step in the message handler" % [units, frames, n_max, float(s.workerMsPerStep), float(s.workerMsPerStep) / 2.0, int(s.bytesPerStep), main_us / 1000.0 / frames, float(s.mainMsPerStep)])
			print("BRIDGETEST DONE"); phase = 9
