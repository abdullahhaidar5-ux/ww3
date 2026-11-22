## Headless proof that every sound event plays the right clip.
##   godot --headless --path godot res://audio/test_audio.tscn
## Prints one line per check and "AUDIO TEST PASS" / "AUDIO TEST FAIL (n)"; writes the full clip log to user://audio_test.log
## (or the path after --log=).
extends Node

var fails := 0
var last: Array = []        # [ev, clip] of the latest fired signal
var all: Array = []

func ok(c: bool, what: String) -> void:
	if not c:
		fails += 1; print("FAIL  ", what)

func _fired(ev: String, clip: String) -> void:
	last = [ev, clip]; all.append("%.2f %s %s" % [Audio.now(), ev, clip])

func _clear() -> void: last = []

func _ready() -> void:
	Audio.fired.connect(_fired)
	Audio.unlocked = true
	Audio.test_clock = 100.0
	for k in ["master", "music", "voices", "effects", "announcer"]: Audio.vol[k] = {"music": 70, "announcer": 80}.get(k, 100)
	var T: Dictionary = Audio.T
	ok(T.playable.size() == 22, "22 playable nations in the tables")
	# ---- 1. every nation: sheets exist, every offset fits its sheet, every event picks a clip from the right sheet
	var n_clips := 0
	for fac in T.playable:
		Audio._fac = fac
		Audio.preload_nation(fac)
		var S := {}
		for suf in ["", "_r", "_h", "_s"]:
			var st = Audio._streams.get("vo/%s%s.mp3" % [fac, suf])
			ok(st is AudioStream, "%s: sheet vo/%s%s.mp3 loads" % [fac, fac, suf])
			S[suf] = st.get_length() if st is AudioStream else 0.0
		var bad := 0
		for kind in T.vo[fac].l:
			for c in kind:
				n_clips += 1
				if c[0] + c[1] > S[""] + 0.05: bad += 1
		for kind in T.vo[fac].get("c", []):
			if kind != null:
				for c in kind:
					n_clips += 1
					if c[0] + c[1] > S[""] + 0.05: bad += 1
		for role in T.vor[fac]:
			for kind in T.vor[fac][role]:
				for c in kind:
					n_clips += 1
					if c[0] + c[1] > S["_r"] + 0.05: bad += 1
		for key in T.voh[fac]:
			for grp in T.voh[fac][key]:
				for c in grp:
					n_clips += 1
					if c[0] + c[1] > S["_h"] + 0.05: bad += 1
		for key in T.vos[fac]:
			for c in T.vos[fac][key]:
				n_clips += 1
				if c[0] + c[1] > S["_s"] + 0.05: bad += 1
		ok(bad == 0, "%s: all clip offsets inside their sheets (%d outside)" % [fac, bad])
		# unit lines: select / move / attack by role, then the general lines 3..7
		for kind in 3:
			for kd in [["inf"], ["tank"], ["dozer"], ["at"], ["heli"]]:
				_step(8.0); _clear()
				var r := Audio.speak(kind, kd)
				var role: String = T.role.get(kd[0], "inf")
				ok(r and last.size() == 2 and (str(last[1]).begins_with("%s_r/%s/%d/" % [fac, role, kind]) or str(last[1]).begins_with("%s/" % fac)), "%s: speak(%d, %s) -> %s" % [fac, kind, kd[0], str(last)])
		for kind in [3, 4, 5, 6, 7]:
			_step(8.0); _clear()
			var r2 := Audio.speak(kind)
			var has: bool = not T.vo[fac].l[kind].is_empty() or kind < 5
			ok(r2 == has and (not has or str(last[1]).begins_with(fac + "/")), "%s: speak(%d) -> %s" % [fac, kind, str(last)])
		# hero squad lines
		_step(8.0); _clear()
		ok(Audio.speak(0, ["champ"]) and str(last[1]) == "%s_h/hsel" % fac, "%s: hero squad select -> %s" % [fac, str(last)])
		# cooldown: a second line inside 1.3 s is refused, one line at a time
		_step(0.5); _clear()
		ok(not Audio.speak(1, ["inf"]) and last.is_empty(), "%s: a second unit line 0.5 s later is refused" % fac)
		# commander radio
		for key in ["base", "lost", "msl", "air", "armL", "armR", "hero"]:
			_step(60.0); _clear()
			var r3 := Audio.radio(key)
			ok(r3 and str(last[1]) == "%s_h/%s" % [fac, key], "%s: radio(%s) -> %s" % [fac, key, str(last)])
		_step(60.0); Audio.radio("base"); _step(6.0); _clear()
		ok(Audio.radio("base") and last.is_empty(), "%s: radio 'base' again 6 s later stays silent (25 s gap)" % fac)
		# announcer in the nation's language
		var L: String = Audio.ann_lang(fac)
		for key in T.ann.en.keys():
			_step(7.0); _clear()
			ok(Audio.ann(key) and str(last[1]) == "ann_%s/%s" % [L, key], "%s: announcer %s -> %s" % [fac, key, str(last)])
		_step(4.5); _clear()
		ok(not Audio.ann("reinf") and last.is_empty(), "%s: the same announcer line 4.5 s later is refused" % fac)
	print("checked %d voice clips of 22 nations against their sheets" % n_clips)
	# announcer sheets
	for L in T.ann:
		var st = Audio._streams.get("vo/ann_%s.mp3" % L)
		if st == null: Audio._load("vo/ann_%s.mp3" % L); st = Audio._streams.get("vo/ann_%s.mp3" % L)
		var bad2 := 0
		for k in T.ann[L]:
			if T.ann[L][k][0] + T.ann[L][k][1] > st.get_length() + 0.05: bad2 += 1
		ok(st is AudioStream and bad2 == 0, "announcer sheet %s fits" % L)
	# ---- 2. shouts (need a battle: a tiny fake sim)
	var sim := FakeSim.new()
	Audio.battle_start(sim, 0)
	ok(Audio.st_mode == "battle" and Audio.st_pool == "calm" and Audio.st_id.begins_with("calm-"), "battle start -> calm track (%s)" % Audio.st_id)
	Audio.set_cam(Vector2(1000, 1000), 760.0)
	for ty in ["rpg", "manDown", "reload", "grenade", "contact", "tank", "medic"]:
		_step(6.0); _clear()
		ok(Audio.shout(ty, 1000, 1000, 0) and str(last[1]).begins_with("IR_s/%s/" % ty), "shout %s -> %s" % [ty, str(last)])
	_step(6.0); _clear()
	ok(not Audio.shout("rpg", 1000 + 700, 1000, 1) and last.is_empty(), "an enemy shout 700 away is not heard (650 limit)")
	ok(Audio.shout("rpg", 1000 + 700, 1000, 0), "your own shout 700 away is heard")
	# ---- 3. effects: weapon -> clip family, falloff, limits
	var st2 = Audio._streams.get("sfx/sfx.mp3")
	ok(st2 is AudioStream, "sfx/sfx.mp3 loads")
	for cat in T.sfx.clips:
		for c in T.sfx.clips[cat]: ok(c[0] + c[1] <= st2.get_length() + 0.05, "sfx clip %s fits the sheet" % cat)
	for pair in [[5.0, ["rifle", "mg"]], [8.0, ["rocket"]], [7.0, ["rocket"]], [13.0, ["cannon"]], [16.0, ["cannon"]]]:
		_step(2.0); var n0 := all.size()
		Audio.shot(1000, 1000, pair[0]); _pump(0.6)
		var got := _cats(n0)
		ok(got.size() >= 1 and got.all(func(c): return c in pair[1]), "shot size %d -> %s (wanted %s)" % [int(pair[0]), str(got), str(pair[1])])
	for pair in [[7.0, false, "boomS"], [30.0, false, "boomL"], [20.0, true, "boomL"]]:
		_step(2.0); var n1 := all.size(); var h0 := Audio.heat
		Audio.boom(1000, 1000, pair[0], pair[1]); _pump(0.6)
		ok(_cats(n1) == [pair[2]] and Audio.heat > h0, "explosion size %d big=%s -> %s, heat up" % [int(pair[0]), str(pair[1]), str(_cats(n1))])
	var sp0 := Audio.spatial(1000, 1000); var sp1 := Audio.spatial(1000 + 800, 1000); var sp2 := Audio.spatial(1000 + 1800, 1000)
	ok(absf(sp0.v - pow(900.0 / 760.0, 0.5)) < 0.001 and sp1.v < sp0.v and sp1.far > 0.4 and sp2.is_empty(), "falloff: full at the camera (%.2f), quieter at 800 (%.2f), silent past %.0f" % [sp0.v, sp1.v, 760 * 1.25 * 1.8])
	ok(sp1.pan > 0.3 and Audio.spatial(1000 - 800, 1000).pan < -0.3, "pan follows left / right")
	_step(2.0); var fh := Audio.far_h; var n2 := all.size()
	Audio.shot(1000 + 3000, 1000, 13.0); _pump(0.3)
	ok(_cats(n2).is_empty() and Audio.far_h > fh, "a shot far off screen is not played, it feeds the distant-fire bed")
	_step(2.0); var n3 := all.size()
	for i in 200: Audio.shot(1000, 1000, 5.0)
	_pump(0.6)
	ok(_cats(n3).size() <= 18 and _cats(n3).size() >= 6, "200 rifle shots in one instant -> %d clips (limit 6 bursts of up to 3)" % _cats(n3).size())
	_step(2.0); var n4 := all.size()
	for r in 30:
		for i in 10: Audio.shot(1000, 1000, 5.0 if i % 2 == 0 else 13.0)
		for i in 5: Audio.boom(1000, 1000, 30.0, true)
		_pump(0.16)
		ok(Audio.active_sfx() <= Audio.SFX_CAP, "never more than %d effect voices at once" % Audio.SFX_CAP)
	print("heavy fight: %d clips started in 4.8 s, %d voices sounding at the end (cap %d)" % [_cats(n4).size(), Audio.active_sfx(), Audio.SFX_CAP])
	# ---- 4. soundtrack: calm <-> combat, victory, defeat, menu
	Audio._st_since = Audio.now()
	ok(Audio.heat > Audio.ST_HOT, "heavy fight heats the music (%.2f)" % Audio.heat)
	Audio._st_tick()
	ok(Audio.st_pool == "calm", "stays calm until 30 s in the calm pool have passed")
	_step(31.0); Audio.heat = 0.8; Audio._st_tick()
	ok(Audio.st_pool == "combat" and Audio.st_id.begins_with("combat-"), "after 30 s + fighting -> combat track (%s)" % Audio.st_id)
	Audio.heat = 0.0; _step(20.0); Audio._st_tick()
	ok(Audio.st_pool == "combat", "combat track holds for at least 60 s")
	_step(45.0); Audio._st_tick()
	ok(Audio.st_pool == "calm", "quiet again after 60 s -> calm")
	var d0: Dictionary = Audio._decks[Audio._st_cur]
	ok(d0.on and d0.to == Audio.ST_GAIN and d0.p.playing, "new track fades in on the other deck (crossfade)")
	Audio.battle_end(true)
	ok(Audio.st_pool == "victory" and Audio.st_id == "victory-01", "victory -> victory music")
	Audio._st_next("victory")
	ok(Audio.st_pool == "menu", "after the victory track -> menu music")
	Audio._st_end_k = ""; Audio.battle_end(false)
	ok(Audio.st_pool == "defeat" and Audio.st_id == "defeat-02", "defeat -> defeat music")
	Audio.st_mode = ""; Audio.menu()
	ok(Audio.st_mode == "menu" and Audio.st_id.begins_with("menu-"), "menu -> menu music (%s)" % Audio.st_id)
	ok(Audio._pool("anthem").is_empty() and not Audio.T.tracks.any(func(t): return str(t.id).begins_with("an")), "no national anthems in the soundtrack")
	# ---- 5. volumes persist, switches silence, web waits for the first click
	Audio.set_vol("music", 35); Audio.set_vol("effects", 60); Audio.set_vol("voices", 45); Audio.set_vol("master", 80)
	Audio.vol.music = 0; Audio._load_cfg()
	ok(Audio.vol.music == 35 and Audio.vol.effects == 60 and Audio.vol.voices == 45 and Audio.vol.master == 80, "volumes saved and loaded back")
	ok(absf(db_to_linear(AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Sfx"))) - 0.6) < 0.05, "effects volume reaches the Sfx bus")
	Audio.set_vol("voices", 0); _step(10.0); _clear()
	ok(not Audio.speak(1, ["inf"]) and not Audio.ann("unit") and last.is_empty(), "voices at 0 -> no unit line, no announcer")
	Audio.set_vol("voices", 100); Audio.set_vol("effects", 0); _step(2.0); var n5 := all.size()
	Audio.shot(1000, 1000, 5.0); _pump(0.4)
	ok(_cats(n5).is_empty(), "effects at 0 -> no shots")
	for k in ["master", "voices", "effects"]: Audio.set_vol(k, 100)
	Audio.set_vol("music", 70)
	Audio.unlocked = false; _step(10.0); _clear(); var n6 := all.size()
	Audio.shot(1000, 1000, 5.0); _pump(0.3)
	ok(not Audio.speak(1, ["inf"]) and _cats(n6).is_empty(), "web before the first click: nothing plays")
	var ev := InputEventMouseButton.new(); ev.pressed = true; ev.button_index = MOUSE_BUTTON_LEFT
	Audio._input(ev)
	ok(Audio.unlocked and Audio.speak(1, ["inf"]), "after the first click sound starts")
	ok(Audio.credits().size() >= 15, "credits list kept (%d lines)" % Audio.credits().size())
	# ---- log + verdict
	var path := "user://audio_test.log"
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--log="): path = a.substr(6)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f != null: f.store_string("\n".join(all) + "\n")
	print("%d sound events fired, log: %s" % [all.size(), path])
	print("AUDIO TEST PASS" if fails == 0 else "AUDIO TEST FAIL (%d)" % fails)
	get_tree().quit(0 if fails == 0 else 1)

func _step(dt: float) -> void:
	Audio.test_clock += dt
	Audio._stop_slices()

func _pump(sec: float) -> void:
	var n := int(sec / 0.02)
	for i in n:
		Audio.test_clock += 0.02
		Audio._stop_slices(); Audio._run_queue()

func _cats(from: int) -> Array:
	var out: Array = []
	for i in range(from, all.size()):
		var p: PackedStringArray = str(all[i]).split(" ")
		if p[1] == "sfx": out.append(p[2])
	return out

class FakeSim:
	var t := 0.0
	var over := false
	var winner := -1
	var ents: Array = []
	var proj: Array = []
	var teams: Array = [{fac = "IR", pw_low = 0}, {fac = "US", pw_low = 0}]
	var map: Dictionary = {}
	func ally(a: int, b: int) -> bool: return a == b
