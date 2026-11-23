## AudioManager (autoload "Audio") - the Godot edition's sound, ported from the browser game (src/09-audio.js, 09b-radio.js,
## 09c-shouts.js, 09d-announcer.js, 09d-mix.js). Same files (vo/, sfx/, mus/st/), same offset tables (audio_tables.json, written by
## tools/gen_tables.mjs from the JS tables), same choice rules, cooldowns, falloff, limits and mix numbers.
##
## Nothing is packed into the .pck: every sound file is read from the repo folder (editor / headless), from next to the
## executable (desktop export), or over HTTP from the web site's own vo/ sfx/ mus/ folders (web export) - see _bases().
##
## The battle talks to this node only through the calls marked "# P5 HOOK" in scripts/battle/battle.gd:
##   Audio.menu()                         setup screen / main menu shown
##   Audio.battle_start(sim, me)          a battle begins
##   Audio.observe(sim, me)               once per sim tick: finds every sound event in the sim state (see observe())
##   Audio.set_cam(target, dist, cam3d)   once per drawn frame
##   Audio.speak(kind, kinds)             0 select, 1 move, 2 attack   (kinds = unit kinds of the selection)
##   Audio.ann(key)                       announcer line by key (funds, cantBuild, building ...)
##   Audio.battle_end(won)                victory / defeat
##   Audio.open_settings(parent)          the volume panel (master / music / voices / effects)
extends Node

signal fired(ev: String, clip: String)

const SITE := "https://abdullahhaidar5-ux.github.io/ww3/"
const CFG := "user://audio.cfg"
const SFX_CAP := 28                    # JS SFX.cap
const SYNTH_CAP := 8                   # dedicated pool for procedural Hollywood SFX layers (WebAudio + Desktop safe)
const VOICE_GAP := 1.3                 # JS speak(): 1300 ms between unit lines
const ST_GAIN := 2.6                   # JS ST.gain (deck level into the music bus)
const ST_FADE := 3.0
const ST_HOT := 0.35
const ST_COOL := 0.1
const ST_DWELL := {"calm": 30.0, "combat": 60.0}
const ANN_MIN := {"_": 6.0, "baseAtk": 20.0, "unitsAtk": 20.0}
const SHOUT_GAP := {"contact": 14.0, "tank": 11.0, "medic": 7.0}

# ---- settings (0..100, like the JS SET.mus / SET.fx / SET.vo; "master" is new in this edition)
var vol := {"master": 100, "music": 70, "voices": 100, "effects": 100, "announcer": 80}

var T: Dictionary = {}                 # audio_tables.json
var web := false
var unlocked := true                   # web: false until the first click / key (browser autoplay rule)
var test_clock := -1.0                 # >= 0: tests drive the clock (seconds) instead of real time
var keep_log := false
var log_lines: Array = []
var heat := 0.0                        # JS AU.heat: 0 quiet .. 1 heavy fighting; drives calm <-> combat
var far_h := 0.0                       # JS AU.farH: fire too far to hear directly -> distant thumps

var _streams: Dictionary = {}          # rel path -> AudioStreamMP3 | "loading" | "fail"
var _waiting: Dictionary = {}          # rel path -> [Callable]
var _base_ok := ""
var _sfx: Array = []                   # pool of AudioStreamPlayer2D (panned)
var _sfx_end: Array = []
var _synth_2d: Array = []              # dedicated spatial pool for procedural sub-bass / EMP / flyby WAVs
var _synth_2d_end: Array = []
var _synth_ui: Array = []              # dedicated UI pool for klaxon / promo / built confirmation WAVs
var _synth_ui_i := 0
var _synth_vox: AudioStreamPlayer      # dedicated Voice-bus player for military VHF PTT squelch chirp
var _wav_sub: AudioStreamWAV
var _wav_chirp: AudioStreamWAV
var _wav_klaxon: AudioStreamWAV
var _wav_promo: AudioStreamWAV
var _wav_emp: AudioStreamWAV
var _wav_jet: AudioStreamWAV
var _wav_built: AudioStreamWAV
var _vox: AudioStreamPlayer            # unit lines + radio
var _annp: AudioStreamPlayer           # announcer
var _shoutp: AudioStreamPlayer2D
var _uip: AudioStreamPlayer
var _slices: Array = []                # [player, stop_at, vol_db]
var _queue: Array = []                 # delayed sfx clips: [at, cat, lin, rate, pan, far]
var _rate: Dictionary = {}
var _loops: Dictionary = {}
var _decks: Array = []
var _rng := RandomNumberGenerator.new()
var _clk := 0.0                        # seconds of frames played (the audio follows frame time, so movie capture stays in step)

var _cam_t := Vector2.ZERO
var _cam_d := 760.0
var _cam: Camera3D = null
var _has_cam := false

var _vo_end := 0.0
var _last_voice := -99.0
var _vor_last: Dictionary = {}
var _duck_until := 0.0
var _mus_duck_until := 0.0
var _mus_k := 1.0
var _sfx_k := 1.0
var _ann_last: Dictionary = {}
var _ann_busy := 0.0
var _rad_last: Dictionary = {}
var _rad_any := -99.0
var _sh_end := 0.0
var _sh_type: Dictionary = {}

# soundtrack state (JS ST)
var st_mode := ""                      # "" | menu | battle | end
var st_pool := ""
var st_id := ""
var _st_since := 0.0
var _st_last: Dictionary = {}
var _st_cur := -1
var _st_t := 0.0
var _st_fac := ""
var _st_end_k := ""

# observer state
var _sim = null
var _me := 0
var _fac := "US"
var _seen: Dictionary = {}             # id -> [x, y, is_b, kind, team, built, last_hit, last_fire, size, cls, inf, wpn]
var _proj_prev: Array = []
var _atk_warn := -99.0
var _fire_warn := -99.0
var _pw_low := 0
var _obs_started := false
var _sh_team: Dictionary = {}
var _env_t := 0.0
var _far_t := 0.0
var _theme := "desert"
var _over := false
var _settings: Control = null
var _log_path := ""
var _demo := false
var _demo_t := 0.0
var _dbg_t := 0.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	web = OS.has_feature("web")
	unlocked = not web
	_rng.randomize()
	var f := FileAccess.open("res://audio/audio_tables.json", FileAccess.READ)
	if f != null: T = JSON.parse_string(f.get_as_text())
	_load_cfg()
	_buses()
	for i in SFX_CAP:
		var p := AudioStreamPlayer2D.new()
		p.max_distance = 1000000.0; p.attenuation = 1.0; p.panning_strength = 1.0; p.bus = "Sfx"
		add_child(p); _sfx.append(p); _sfx_end.append(0.0)
	for i in SYNTH_CAP:
		var sp2 := AudioStreamPlayer2D.new()
		sp2.max_distance = 1000000.0; sp2.attenuation = 1.0; sp2.panning_strength = 1.0; sp2.bus = "Sfx"
		add_child(sp2); _synth_2d.append(sp2); _synth_2d_end.append(0.0)
	for i in 3: _synth_ui.append(_mk("UI"))
	_synth_vox = _mk("Voice")
	_vox = _mk("Voice"); _annp = _mk("Voice"); _uip = _mk("UI")
	_shoutp = AudioStreamPlayer2D.new(); _shoutp.max_distance = 1000000.0; _shoutp.bus = "Voice"; add_child(_shoutp)
	_uip.stream = _tick_wav()
	_wav_sub = _sub_boom_wav()
	_wav_chirp = _radio_chirp_wav()
	_wav_klaxon = _klaxon_wav()
	_wav_promo = _promo_wav()
	_wav_emp = _emp_wav()
	_wav_jet = _jet_whoosh_wav()
	_wav_built = _built_chime_wav()
	if web: _web_decks()
	else:
		for i in 2:
			var d := _mk("Music"); _decks.append({p = d, on = false, id = "", pool = "", g = 0.0, to = 0.0, rate = 0.0, started = false, adv = false})
	get_tree().node_added.connect(_node_added)
	_apply_vol()
	if DisplayServer.get_name() != "headless": menu.call_deferred()      # menu music until a battle starts (web: after the first click)
	for a in OS.get_cmdline_user_args():
		if a == "--audio-log": keep_log = true
		elif a.begins_with("--audio-log="):
			keep_log = true; _log_path = a.substr(12)
		elif a == "--audio-demo": _demo = true      # captures: stands in for the player's clicks (a select / move / attack line every few seconds)

func _exit_tree() -> void:
	if _log_path != "":
		var f := FileAccess.open(_log_path, FileAccess.WRITE)
		if f != null: f.store_string("\n".join(log_lines) + "\n")

func _mk(bus: String) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new(); p.bus = bus; add_child(p); return p

func now() -> float:
	return test_clock if test_clock >= 0.0 else _clk

func _note(ev: String, clip: String) -> void:
	if keep_log:
		log_lines.append("%.2f %s %s" % [now(), ev, clip])
		if log_lines.size() > 20000: log_lines = log_lines.slice(10000)
	fired.emit(ev, clip)

# ------------------------------------------------------------------------------------------------ buses (JS initAudio)
## Master (limiter) <- Battle (.68 + compressor) <- Sfx / SfxMid / SfxFar / Music ; Voice (presence + compressor) and UI go
## straight to Master, like AU.vox / AU.ui into AU.out. On the web build Godot plays samples through WebAudio and skips
## bus effects; volumes, pan and ducking still apply.
func _buses() -> void:
	if AudioServer.get_bus_index("Battle") >= 0: return
	var lim := AudioEffectHardLimiter.new(); lim.ceiling_db = -0.3; lim.pre_gain_db = 0.0
	AudioServer.add_bus_effect(0, lim)
	_bus("Battle", "Master")
	var comp := AudioEffectCompressor.new(); comp.threshold = -16.0; comp.ratio = 5.0; comp.attack_us = 4000.0; comp.release_ms = 250.0
	AudioServer.add_bus_effect(AudioServer.get_bus_index("Battle"), comp)
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Battle"), linear_to_db(0.68))
	_bus("Sfx", "Battle")
	var rv := AudioEffectReverb.new(); rv.room_size = 0.7; rv.damping = 0.6; rv.wet = 0.1; rv.dry = 1.0     # JS sfxRev .35 into a 1.8 s hall at .55
	AudioServer.add_bus_effect(AudioServer.get_bus_index("Sfx"), rv)
	for b in [["SfxMid", 4200.0], ["SfxFar", 1500.0]]:      # JS bus(): lowpass 900 + 16000 * (1 - far)^1.8 per voice, here in 3 steps
		_bus(b[0], "Sfx")
		var lp := AudioEffectLowPassFilter.new(); lp.cutoff_hz = b[1]
		AudioServer.add_bus_effect(AudioServer.get_bus_index(b[0]), lp)
	_bus("Music", "Battle")
	var eq := AudioEffectEQ6.new()      # JS: +3 dB low shelf 110 Hz, -2.5 dB at 420 Hz, +2.5 dB high shelf 7 kHz
	eq.set_band_gain_db(0, 2.0); eq.set_band_gain_db(1, 3.0); eq.set_band_gain_db(2, -2.5); eq.set_band_gain_db(5, 2.5)
	AudioServer.add_bus_effect(AudioServer.get_bus_index("Music"), eq)
	_bus("Voice", "Master")
	var vi := AudioServer.get_bus_index("Voice")
	var pr := AudioEffectEQ6.new(); pr.set_band_gain_db(4, 2.5)      # JS: +2.5 dB presence at 2.6 kHz
	AudioServer.add_bus_effect(vi, pr)
	var vc := AudioEffectCompressor.new(); vc.threshold = -12.0; vc.ratio = 3.5; vc.attack_us = 3000.0; vc.release_ms = 120.0
	AudioServer.add_bus_effect(vi, vc)
	_bus("UI", "Master")

func _bus(n: String, send: String) -> void:
	AudioServer.add_bus()
	var i := AudioServer.bus_count - 1
	AudioServer.set_bus_name(i, n); AudioServer.set_bus_send(i, send)

func _set_bus(n: String, lin: float) -> void:
	var i := AudioServer.get_bus_index(n)
	if i >= 0: AudioServer.set_bus_volume_db(i, linear_to_db(maxf(lin, 0.0001))); AudioServer.set_bus_mute(i, lin <= 0.0001)

func _mus_base() -> float: return 0.19 * (float(vol.music) / 70.0)      # JS musBase()

func _apply_vol() -> void:
	_set_bus("Master", float(vol.master) / 100.0)
	_set_bus("Sfx", float(vol.effects) / 100.0 * _sfx_k)
	_set_bus("UI", minf(1.0, float(vol.effects) / 100.0))
	_set_bus("Music", _mus_base() * _mus_k)
	_set_bus("Voice", 0.92)
	if web: _web_vol()

# ------------------------------------------------------------------------------------------------ settings
func _load_cfg() -> void:
	var c := ConfigFile.new()
	if c.load(CFG) != OK: return
	for k in vol.keys(): vol[k] = clampi(int(c.get_value("audio", k, vol[k])), 0, 100)

func save_cfg() -> void:
	var c := ConfigFile.new()
	for k in vol.keys(): c.set_value("audio", k, vol[k])
	c.save(CFG)

func set_vol(k: String, v: int) -> void:
	vol[k] = clampi(v, 0, 100); _apply_vol(); save_cfg()
	if k == "music" and st_mode != "": _st_tick()

## the volume panel: one small window, four sliders, saved at once
func open_settings(parent: Node) -> void:
	if is_instance_valid(_settings): _settings.queue_free(); _settings = null; return
	var pn := PanelContainer.new()
	pn.anchor_left = 0.5; pn.anchor_right = 0.5; pn.anchor_top = 0.5; pn.anchor_bottom = 0.5
	pn.offset_left = -190; pn.offset_right = 190; pn.offset_top = -130; pn.offset_bottom = 130
	var sb := StyleBoxFlat.new(); sb.bg_color = Color(0.07, 0.09, 0.08, 0.94); sb.border_color = Color(0.79, 0.64, 0.15, 0.8)
	sb.set_border_width_all(1); sb.set_content_margin_all(14); sb.set_corner_radius_all(4)
	pn.add_theme_stylebox_override("panel", sb)
	var vb := VBoxContainer.new(); pn.add_child(vb)
	var h := Label.new(); h.text = "Sound"; h.add_theme_color_override("font_color", Color(0.95, 0.82, 0.45)); vb.add_child(h)
	for row in [["master", "Master"], ["music", "Music"], ["voices", "Voices"], ["effects", "Effects"]]:
		var hb := HBoxContainer.new(); vb.add_child(hb)
		var l := Label.new(); l.text = row[1]; l.custom_minimum_size.x = 80; hb.add_child(l)
		var s := HSlider.new(); s.min_value = 0; s.max_value = 100; s.step = 5; s.value = vol[row[0]]
		s.size_flags_horizontal = Control.SIZE_EXPAND_FILL; s.custom_minimum_size.x = 200; hb.add_child(s)
		var o := Label.new(); o.text = "%d%%" % vol[row[0]]; o.custom_minimum_size.x = 48; hb.add_child(o)
		var key: String = row[0]
		s.value_changed.connect(func(v): set_vol(key, int(v)); o.text = "%d%%" % int(v))
	var cr := Label.new(); cr.text = "Music and sounds: free recordings (CC0 / CC-BY), see Credits."
	cr.add_theme_font_size_override("font_size", 11); cr.modulate = Color(1, 1, 1, 0.6); vb.add_child(cr)
	var b := Button.new(); b.text = "Close"; b.pressed.connect(func(): pn.queue_free()); vb.add_child(b)
	parent.add_child(pn); _settings = pn

## the small "Sound" button of the battle HUD (top right) opens the volume panel
func add_button(parent: Node) -> void:
	var b := Button.new(); b.text = "Sound"; b.flat = true; b.focus_mode = Control.FOCUS_NONE
	b.anchor_left = 1.0; b.anchor_right = 1.0; b.offset_left = -76; b.offset_right = -8; b.offset_top = 6
	b.add_theme_font_size_override("font_size", 13)
	b.pressed.connect(func(): open_settings(parent))
	parent.add_child(b)

## credits kept (CC0 / CC-BY): every track and sound pack with its author and licence
func credits() -> Array:
	var out: Array = []
	for t in T.get("tracks", []): out.append("\"%s\" - %s (%s)" % [t.title, t.author, t.lic])
	for c in T.get("sfx", {}).get("credits", []): out.append("%s - %s (%s)" % [c.what, c.who, c.lic])
	out.append("Unit voices, radio and announcer: generated for this game (XTTS-v2 / Piper), radio treatment")
	return out

# ------------------------------------------------------------------------------------------------ files
func _bases() -> Array:
	if _base_ok != "": return [_base_ok]
	var out: Array = []
	if web:
		# the live site (GitHub Pages /ww3/, Cloudflare) serves the build next to vo/ sfx/ mus/: try the page's own folder first
		var own = JavaScriptBridge.eval("(function(){try{return new URL('./',location.href).href;}catch(e){return ''}})()")
		var q = JavaScriptBridge.eval("(function(){try{var a=new URLSearchParams(location.search).get('assets');if(a)return new URL(a,location.href).href;return new URL('../',location.href).href;}catch(e){return ''}})()")
		var has_assets = JavaScriptBridge.eval("location.search.indexOf('assets=')>=0")
		if q != null and str(q) != "" and has_assets == true: out.append(str(q))   # ?assets= wins when given
		if own != null and str(own) != "": out.append(str(own))
		if q != null and str(q) != "":
			if not out.has(str(q)): out.append(str(q))
			out.append(str(q) + "godot/")      # test layout: the build sits in a folder under the site root, sounds one folder up
	else:
		out.append(ProjectSettings.globalize_path("res://").path_join("..") + "/")
		out.append(OS.get_executable_path().get_base_dir() + "/")
		out.append("user://audio_cache/")
	out.append(SITE)
	return out

## get a sound file as an AudioStreamMP3 (cached); cb(stream or null)
func _load(rel: String, cb: Callable = Callable()) -> void:
	var s = _streams.get(rel)
	if s is AudioStream:
		if cb.is_valid(): cb.call(s)
		return
	if cb.is_valid(): _waiting.get_or_add(rel, []).append(cb)
	if s is String and s == "loading": return
	if s is String and s == "fail" and now() - float(_streams.get(rel + "@", 0.0)) < 30.0:
		_done(rel, null); return
	_streams[rel] = "loading"
	_try(rel, _bases(), 0)

func _try(rel: String, bases: Array, i: int) -> void:
	if i >= bases.size():
		_streams[rel] = "fail"; _streams[rel + "@"] = now(); _done(rel, null); return
	var b: String = bases[i]
	if not b.begins_with("http"):
		if FileAccess.file_exists(b + rel):
			var by := FileAccess.get_file_as_bytes(b + rel)
			if by.size() > 0:
				_base_ok = b if not b.begins_with("user://") else _base_ok
				_got(rel, by); return
		_try(rel, bases, i + 1); return
	var h := HTTPRequest.new(); add_child(h)
	h.request_completed.connect(func(res, code, _hd, body):
		h.queue_free()
		if res == HTTPRequest.RESULT_SUCCESS and code == 200 and body.size() > 256:
			_base_ok = b
			if not web:
				DirAccess.make_dir_recursive_absolute("user://audio_cache/" + rel.get_base_dir())
				var w := FileAccess.open("user://audio_cache/" + rel, FileAccess.WRITE)
				if w != null: w.store_buffer(body)
			_got(rel, body)
		else: _try(rel, bases, i + 1))
	if h.request(b + rel) != OK:
		h.queue_free(); _try(rel, bases, i + 1)

func _got(rel: String, by: PackedByteArray) -> void:
	var st := AudioStreamMP3.new(); st.data = by
	if rel.begins_with("sfx/") and rel != "sfx/sfx.mp3": st.loop = true
	_streams[rel] = st; _done(rel, st)

func _done(rel: String, st) -> void:
	var L: Array = _waiting.get(rel, []); _waiting.erase(rel)
	for cb in L: cb.call(st)

func _stream(rel: String):
	var s = _streams.get(rel)
	if s is AudioStream: return s
	_load(rel)
	s = _streams.get(rel)
	return s if s is AudioStream else null

## warm up everything a battle of this nation needs (JS voLoad / voRLoad / vohLoad / vosLoad / annWarm / sfxEnsure)
func preload_nation(fac: String) -> void:
	for suf in ["", "_r", "_h", "_s"]: _load("vo/%s%s.mp3" % [fac, suf])
	_load("vo/ann_%s.mp3" % ann_lang(fac)); _load("sfx/sfx.mp3")

# ------------------------------------------------------------------------------------------------ playing a piece of a sheet
func _slice(p, st: AudioStream, off: float, d: float, lin: float, rate: float = 1.0) -> void:
	p.stream = st; p.pitch_scale = rate; p.volume_db = linear_to_db(maxf(lin, 0.0001))
	p.play(off)
	for s in _slices:
		if s[0] == p: _slices.erase(s); break
	_slices.append([p, now() + d / rate, p.volume_db])

func _stop_slices() -> void:
	var t := now()
	for i in range(_slices.size() - 1, -1, -1):
		var s: Array = _slices[i]
		var left: float = s[1] - t
		if left <= 0.0:
			s[0].stop(); _slices.remove_at(i)
		elif left < 0.05: s[0].volume_db = s[2] + linear_to_db(maxf(left / 0.05, 0.01))      # soft edge, like the JS 50 ms ramp

# ------------------------------------------------------------------------------------------------ effects (JS spatial / sfxShot / sfxBoom / sfxClip)
func set_cam(target: Vector2, dist: float, cam: Camera3D = null) -> void:
	_cam_t = target; _cam_d = maxf(dist, 1.0); _cam = cam; _has_cam = true

## JS spatial(): null (empty) when too far; v = loudness, pan = -1..1, far = 0 near .. 1 at the edge of hearing
func spatial(x: float, y: float) -> Dictionary:
	if not _has_cam: return {}
	var d := Vector2(x - _cam_t.x, y - _cam_t.y).length()
	var r := _cam_d * 1.25
	if d > r * 1.8: return {}
	var v := maxf(0.0, 1.0 - d / (r * 1.8)) * pow(900.0 / _cam_d, 0.5)
	var pan := clampf((x - _cam_t.x) / maxf(_cam_d, 1.0), -1.0, 1.0) * 0.8
	if is_instance_valid(_cam) and _cam.is_inside_tree():
		var vs := _cam.get_viewport().get_visible_rect().size
		var p3 := Vector3(x, _cam.global_position.y - _cam_d * 0.7, y)
		if vs.x > 0 and not _cam.is_position_behind(p3): pan = clampf((_cam.unproject_position(p3).x / vs.x * 2.0 - 1.0) * 0.8, -1.0, 1.0)
	return {v = v, pan = pan, far = minf(1.0, d / (r * 1.8))}

func limit(k: String, n: int, win: float = 0.12) -> bool:
	var t := now()
	var a: Array = _rate.get(k, []).filter(func(v): return t - v < win)
	if a.size() >= n:
		_rate[k] = a; return false
	a.append(t); _rate[k] = a; return true

func _sfx_on() -> bool: return unlocked and int(vol.effects) > 0 and int(vol.master) > 0

## a shot at (x, y); s = the JS muzzle size: 5 rifle / machine gun, 7 flak, 8 rocket / missile, 13 cannon
func shot(x: float, y: float, s: float) -> void:
	if not _sfx_on(): return
	var sp := spatial(x, y)
	if sp.is_empty() or sp.v < 0.02:
		far_h = minf(8.0, far_h + (0.5 if s > 8 else 0.1)); return
	if not limit("all", 14, 0.15): return
	if _stream("sfx/sfx.mp3") == null: return
	if s <= 5:
		if not limit("gun", 6): return
		var n := 1 + _rng.randi_range(0, 2)
		for i in n: _clip("mg" if (n > 2 and _rng.randf() < 0.5) else "rifle", sp, 0.9, 1.0, i * 0.075 + sp.far * 0.12)
	elif s <= 8:
		if not limit("msl", 3): return
		_clip("rocket", sp, 0.8, 1.0, sp.far * 0.15)
	else:
		if not limit("can", 3): return
		_clip("cannon", sp, 1.1, 0.88 if s > 14 else 1.0, sp.far * 0.2)
		if s >= 11.0 and limit("sub_can", 3, 0.14):
			var cg: float = float(sp.v) * clampf(0.32 + (s - 11.0) * 0.04, 0.32, 0.68)
			_play_synth_2d(_wav_sub, sp, cg, 1.12 + _rng.randf() * 0.12, "Sfx")

## an explosion; s = size, big = building / heavy blast. Feeds the music's heat even with effects off (JS sfxBoom).
func boom(x: float, y: float, s: float, big: bool) -> void:
	var sp := spatial(x, y)
	if not _sfx_on():
		if unlocked and not sp.is_empty() and sp.v >= 0.02: heat = minf(1.0, heat + (0.25 if big else 0.06))
		return
	if sp.is_empty() or sp.v < 0.02:
		far_h = minf(8.0, far_h + (2.0 if big else 0.6)); return
	if not limit("boom", 3 if big else 4, 0.15): return
	var k := minf(1.0, 0.3 + s / 40.0) * (1.3 if big else 1.0)
	if _stream("sfx/sfx.mp3") != null:
		_clip("boomL" if (big or s > 26) else "boomS", sp, (1.1 if big else 0.9) * minf(1.2, 0.6 + k), 0.94 if big else 1.0, sp.far * 0.3)
	if (big or s >= 18.0) and limit("sub", 3, 0.14):
		var sub_g: float = float(sp.v) * clampf(0.45 + s / 50.0, 0.45, 1.15) * (1.2 if big else 0.9)
		_play_synth_2d(_wav_sub, sp, sub_g, (0.86 if big else 1.0) * (0.94 + _rng.randf() * 0.12), "Sfx")
	heat = minf(1.0, heat + (0.25 if big else 0.06))

func _clip(cat: String, sp: Dictionary, g: float, rate: float, delay: float) -> void:
	_queue.append([now() + delay, cat, sp.v * g, rate * (0.95 + _rng.randf() * 0.1), sp.pan, sp.far])

func _free_sfx() -> int:
	var t := now()
	for i in SFX_CAP:
		if _sfx_end[i] <= t: return i
	return -1

func _run_queue() -> void:
	var t := now()
	var keep: Array = []
	for q in _queue:
		if q[0] > t: keep.append(q); continue
		var st = _streams.get("sfx/sfx.mp3")
		var L: Array = T.sfx.clips.get(q[1], [])
		var i := _free_sfx()
		if not (st is AudioStream) or L.is_empty() or i < 0: continue      # JS: SFX.nv >= SFX.cap -> dropped
		var cl: Array = L[_rng.randi() % L.size()]
		var p: AudioStreamPlayer2D = _sfx[i]
		var far: float = q[5]
		p.bus = "Sfx" if far < 0.3 else ("SfxMid" if far < 0.62 else "SfxFar")
		var vs := get_viewport().get_visible_rect().size
		p.global_position = Vector2(vs.x * 0.5 * (1.0 + float(q[4])), vs.y * 0.5)
		_slice(p, st, float(cl[0]), float(cl[1]), q[2], q[3])
		_sfx_end[i] = t + float(cl[1]) / float(q[3])
		_note("sfx", q[1])
	_queue = keep

func active_sfx() -> int:
	var t := now(); var n := 0
	for e in _sfx_end:
		if e > t: n += 1
	return n

## JS uiTick(): every button makes a soft tick
func ui_tick() -> void:
	if not _sfx_on(): return
	_uip.play(); _note("ui", "tick")

func _node_added(n: Node) -> void:
	if n is BaseButton and not n.pressed.is_connected(ui_tick): n.pressed.connect(ui_tick)

func _tick_wav() -> AudioStreamWAV:      # 540 -> 330 Hz sine, 40 ms, + a trace of noise (JS uiTick)
	var sr := 22050; var n := int(sr * 0.045)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph := 0.0
	for i in n:
		var k := float(i) / n
		ph += TAU * lerpf(540.0, 330.0, k) / sr
		var v := (sin(ph) * 0.05 + (randf() * 2.0 - 1.0) * 0.015 * (1.0 - k)) * (1.0 - k)
		by.encode_s16(i * 2, int(clampf(v, -1, 1) * 32767.0))
	var w := AudioStreamWAV.new(); w.format = AudioStreamWAV.FORMAT_16_BITS; w.mix_rate = sr; w.data = by
	return w

func _mk_wav(by: PackedByteArray, sr: int = 22050) -> AudioStreamWAV:
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS; w.mix_rate = sr; w.data = by
	return w

## 1. Deep concussive 52 Hz -> 24 Hz exponential sub-bass punch + low-pass shockwave transient + tail rumble (0.75 s)
func _sub_boom_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.75; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph := 0.0; var lp := 0.0; var lp2 := 0.0
	for i in n:
		var t := float(i) / sr
		var f := 24.0 + 28.0 * exp(-t * 6.5)
		ph += TAU * f / sr
		var atk := minf(1.0, t / 0.006)
		var tail_out := clampf((dur - t) / 0.02, 0.0, 1.0)
		var body := sin(ph) * exp(-t * 4.2) * 0.82
		var ns := randf() * 2.0 - 1.0
		lp += 0.085 * (ns - lp)
		lp2 += 0.028 * (lp - lp2)
		var shock := lp * exp(-t * 15.0) * 0.85
		var rumble := lp2 * exp(-t * 3.1) * 0.55
		var v := tanh((body + shock + rumble) * 1.45) * 0.88 * atk * tail_out
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 2. Military VHF radio PTT squelch chirp (0.045 s: bandpass-like noise + crisp 1850 -> 2200 Hz micro-tone)
func _radio_chirp_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.045; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph := 0.0; var lo := 0.0; var hi := 0.0
	for i in n:
		var t := float(i) / sr; var k := float(i) / n
		var f := lerpf(1850.0, 2200.0, minf(1.0, k * 1.45))
		ph += TAU * f / sr
		var ns := randf() * 2.0 - 1.0
		lo += 0.35 * (ns - lo)
		hi += 0.09 * (ns - hi)
		var bp := lo - hi
		var tone_env := sin(PI * clampf(t / 0.028, 0.0, 1.0)) if t < 0.028 else 0.0
		var sq_env := exp(-k * 3.2) * clampf((1.0 - k) * 6.0, 0.0, 1.0)
		var v := (sin(ph) * 0.14 * tone_env + bp * 0.32 * sq_env)
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 3. Urgent military 2-pulse warning klaxon (0.65 s: 520 Hz + 780 Hz harmonic pulse with soft envelope)
func _klaxon_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.65; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph1 := 0.0; var ph2 := 0.0
	for i in n:
		var t := float(i) / sr
		var env := 0.0
		if t < 0.27:
			env = minf(1.0, t / 0.014) * minf(1.0, (0.27 - t) / 0.028)
		elif t >= 0.33 and t < 0.63:
			var lt := t - 0.33
			env = minf(1.0, lt / 0.014) * minf(1.0, (0.30 - lt) / 0.032)
		var bend := 1.0 - 0.025 * exp(-fmod(t, 0.33) * 28.0)
		ph1 += TAU * 520.0 * bend / sr
		ph2 += TAU * 780.0 * bend / sr
		var raw := sin(ph1) * 0.55 + sin(ph2) * 0.38 + sin(ph1 * 2.0) * 0.14
		var v := tanh(raw * 1.5) * 0.55 * env
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 4. Crisp 3-note ascending tactical brass/synth triad sting (0.48 s: 440 -> 554 -> 659 Hz)
func _promo_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.48; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var notes := [[0.0, 0.14, 440.0], [0.11, 0.15, 554.37], [0.22, 0.26, 659.25]]
	var phs := [0.0, 0.0, 0.0]
	for i in n:
		var t := float(i) / sr
		var acc := 0.0
		for j in 3:
			var t0: float = notes[j][0]; var nd: float = notes[j][1]; var fq: float = notes[j][2]
			if t >= t0 and t < t0 + nd:
				var lt := t - t0
				phs[j] += TAU * fq / sr
				var a := minf(1.0, lt / 0.009)
				var r := minf(1.0, (nd - lt) / (0.09 if j == 2 else 0.035))
				var dec := exp(-lt * (3.2 if j == 2 else 4.5))
				var p: float = phs[j]
				var brass := sin(p) * 0.62 + sin(p * 2.0) * 0.28 + sin(p * 3.0) * 0.13
				acc += brass * a * r * dec
		var v := tanh(acc * 1.1) * 0.62
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 5. Descending electronic EMP sweep (0.65 s: 1400 Hz -> 95 Hz + electric crackle)
func _emp_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.65; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph := 0.0; var prev_ns := 0.0
	for i in n:
		var t := float(i) / sr
		var f := 95.0 + 1305.0 * exp(-t * 5.8)
		ph += TAU * f / sr
		var atk := minf(1.0, t / 0.005)
		var rel := clampf((dur - t) / 0.04, 0.0, 1.0)
		var env := exp(-t * 2.8) * atk * rel
		var sweep := sin(ph) * (0.72 + 0.28 * sin(ph * 0.5)) * env * 0.68
		var ns := randf() * 2.0 - 1.0
		var hp := ns - prev_ns; prev_ns = ns
		var spark := (hp * 0.55 if randf() < 0.09 else hp * 0.08) * exp(-t * 4.8)
		var snap := hp * exp(-t * 45.0) * 0.65
		var v := tanh((sweep + spark + snap) * 1.25) * 0.78 * rel
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 6. Spatial jet flyover roar (0.95 s: Doppler-swept turbine whoosh + afterburner rumble)
func _jet_whoosh_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.95; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var ph_low := 0.0; var ph_whine := 0.0; var lp := 0.0
	for i in n:
		var k := float(i) / n
		var env := pow(sin(PI * pow(k, 0.82)), 1.35)
		ph_low += TAU * lerpf(155.0, 72.0, k) / sr
		ph_whine += TAU * lerpf(720.0, 310.0, k) / sr
		var ns := randf() * 2.0 - 1.0
		var cut := lerpf(0.26, 0.07, k)
		lp += cut * (ns - lp)
		var roar := lp * 0.9 + sin(ph_low) * 0.22 + sin(ph_whine) * 0.07
		var v := tanh(roar * 1.3) * 0.72 * env
		by.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

## 7. Subtle metallic construction-complete mechanical lock confirmation (0.24 s)
func _built_chime_wav() -> AudioStreamWAV:
	var sr := 22050; var dur := 0.24; var n := int(sr * dur)
	var by := PackedByteArray(); by.resize(n * 2)
	var p1 := 0.0; var p2 := 0.0
	for i in n:
		var t := float(i) / sr
		var acc := 0.0
		if t < 0.11:
			p1 += TAU * 660.0 / sr
			var e1 := minf(1.0, t / 0.004) * exp(-t * 28.0)
			acc += (sin(p1) * 0.65 + sin(p1 * 1.5) * 0.35) * e1
		if t >= 0.075:
			var lt := t - 0.075
			p2 += TAU * 880.0 / sr
			var e2 := minf(1.0, lt / 0.004) * exp(-lt * 19.0) * clampf((dur - t) / 0.02, 0.0, 1.0)
			acc += (sin(p2) * 0.65 + sin(p2 * 1.5) * 0.30) * e2
		by.encode_s16(i * 2, int(clampf(acc * 0.42, -1.0, 1.0) * 32767.0))
	return _mk_wav(by, sr)

func _play_synth_2d(wav: AudioStreamWAV, sp: Dictionary, lin: float, rate: float = 1.0, bus: String = "") -> void:
	if not _sfx_on() or wav == null or sp.is_empty(): return
	var t := now()
	var idx := -1
	for i in SYNTH_CAP:
		if _synth_2d_end[i] <= t: idx = i; break
	if idx < 0: return
	var p: AudioStreamPlayer2D = _synth_2d[idx]
	if bus != "": p.bus = bus
	else:
		var far: float = float(sp.get("far", 0.0))
		p.bus = "Sfx" if far < 0.3 else ("SfxMid" if far < 0.62 else "SfxFar")
	var vp := get_viewport()
	var vs := vp.get_visible_rect().size if vp != null else Vector2(1280, 720)
	p.global_position = Vector2(vs.x * 0.5 * (1.0 + float(sp.get("pan", 0.0))), vs.y * 0.5)
	p.stream = wav
	p.pitch_scale = maxf(rate, 0.1)
	p.volume_db = linear_to_db(maxf(lin, 0.0001))
	p.play()
	_synth_2d_end[idx] = t + wav.get_length() / p.pitch_scale

func _play_synth_ui(wav: AudioStreamWAV, lin: float = 0.72, rate: float = 1.0) -> void:
	if not _sfx_on() or wav == null or _synth_ui.is_empty(): return
	var p: AudioStreamPlayer = _synth_ui[_synth_ui_i % _synth_ui.size()]
	_synth_ui_i += 1
	p.stream = wav
	p.pitch_scale = maxf(rate, 0.1)
	p.volume_db = linear_to_db(maxf(lin, 0.0001))
	p.play()

func _play_chirp() -> void:
	if not _voice_on() or _wav_chirp == null or _synth_vox == null: return
	_synth_vox.stream = _wav_chirp
	_synth_vox.pitch_scale = 0.96 + _rng.randf() * 0.08
	_synth_vox.volume_db = linear_to_db(maxf(_vo_vol() * 0.32, 0.0001))
	_synth_vox.play()

# ------------------------------------------------------------------------------------------------ voices (JS speak / voRPlay / voPlay / heroSpeak / duck)
func _vo_vol() -> float: return clampf(float(vol.voices) / 100.0 * 1.25, 0.0, 1.5)
func _voice_on() -> bool: return unlocked and int(vol.voices) > 0 and int(vol.master) > 0

## kind: 0 select, 1 move, 2 attack, 3 unit ready, 4 base under attack, 5 under fire, 6 man down, 7 construction complete.
## kinds: the unit kinds in the selection (their role picks the line: infantry, tank crew, engineer ...).
func speak(kind: int, kinds: Array = []) -> bool:
	if not _voice_on() or (kind < 3 and kinds.is_empty()): return false
	var t := now()
	if t - _last_voice < VOICE_GAP: return false
	_last_voice = t
	_duck()
	preload_nation(_fac)
	if (kind < 3 and "champ" in kinds and _voh(_fac, ["hsel", "hmove", "hatk"][kind], false)) or _vor(_fac, kind, kinds) or _vo(_fac, kind):
		_duck(); return true
	return false

func _vor(fac: String, kind: int, kinds: Array) -> bool:
	var st = _streams.get("vo/%s_r.mp3" % fac); var M: Dictionary = T.vor.get(fac, {})
	if not (st is AudioStream) or M.is_empty() or kind > 2 or kinds.is_empty(): return false
	var role: String = T.role.get(kinds[_rng.randi() % kinds.size()], "inf")
	var sets: Array = M.get(role, [])
	if kind >= sets.size() or sets[kind].is_empty(): return false
	var se: Array = sets[kind]
	if now() < _vo_end - 0.05: return true                       # one line at a time
	var lk := role + str(kind)
	var j := _rng.randi() % se.size()
	if se.size() > 1 and j == int(_vor_last.get(lk, -1)): j = (j + 1) % se.size()
	_vor_last[lk] = j
	_say(_vox, st, se[j], "vor", "%s_r/%s/%d/%d" % [fac, role, kind, j]); return true

func _vo(fac: String, kind: int) -> bool:
	var st = _streams.get("vo/%s.mp3" % fac); var M: Dictionary = T.vo.get(fac, {})
	if not (st is AudioStream) or M.is_empty(): return false
	var L: Array = M.l
	var se: Array = L[kind] if (kind < L.size() and not L[kind].is_empty()) else (L[0] if kind < 5 else [])
	var tag := "l"
	var C: Array = M.get("c", [])
	if kind < C.size() and C[kind] != null and not C[kind].is_empty() and _rng.randf() < (0.5 if kind == 2 else 0.38):
		se = C[kind]; tag = "c"                                      # the nation's own battle cry
	if se.is_empty(): return false
	if now() < _vo_end - 0.05: return true
	var j := _rng.randi() % se.size()
	_say(_vox, st, se[j], "vo", "%s/%s%d/%d" % [fac, tag, kind, j]); return true

func _voh(fac: String, key: String, over: bool) -> bool:
	var st = _streams.get("vo/%s_h.mp3" % fac); var M: Dictionary = T.voh.get(fac, {})
	if not (st is AudioStream) or not M.has(key): return false
	var ent: Array = []
	for a in M[key]:
		if a != null and not a.is_empty(): ent = a; break
	if ent.is_empty(): return false
	if now() < _vo_end - 0.05 and not over: return false
	_say(_vox, st, ent[_rng.randi() % ent.size()], "voh", "%s_h/%s" % [fac, key]); return true

func _say(p: AudioStreamPlayer, st: AudioStream, od: Array, ev: String, clip: String) -> void:
	_play_chirp()
	var d := float(od[1])
	_slice(p, st, float(od[0]), d, _vo_vol())
	_vo_end = now() + 0.02 + d
	_mus_duck_until = now() + d + 0.1                              # music to 45 % while a unit talks
	_note(ev, clip)
	_beep()

func _beep() -> void: pass      # JS: a faint 2.2 kHz radio hiss after a line (noise, 0.12 s at .08); the clips carry their own radio tail

## JS duck(): voices push the music to 55 % and the effects to 72 % (down to 46 % in heavy fighting) for the length of the line
func _duck() -> void:
	_duck_until = now() + clampf(_vo_end - now() + 0.2, 1.3, 6.0)

## commander radio (JS radioCall): key = base | air | armL | armR | msl | lost | hero | hab ...; true when handled
func radio(key: String) -> bool:
	var t := now(); var gap := float(T.radgap.get(key, 15.0))
	if t - float(_rad_last.get(key, -99.0)) < gap: return true
	if key != "hab" and key != "hero" and t - _rad_any < 5.0: return true
	_rad_last[key] = t
	if key != "hab" and key != "hero": _rad_any = t
	if not _voice_on(): return true
	preload_nation(_fac)
	var ok := _voh(_fac, key, key == "hab" or key == "msl")
	if ok: _duck()
	return ok

func ann_lang(fac: String) -> String: return str(T.get("ann_lang", {}).get(fac, "en"))

## announcer (JS annSay / annGate / annClip): same line at most every 6 s, under-attack every 20 s, never two at once
func ann(key: String) -> bool:
	if not _voice_on() or int(vol.announcer) <= 0: return false
	var L := ann_lang(_fac)
	var O: Dictionary = T.ann.get(L, {})
	if not O.has(key): return false
	var t := now()
	if t < _ann_busy: return false
	if t - float(_ann_last.get(key, -1e9)) < float(ANN_MIN.get(key, ANN_MIN._)): return false
	_ann_last[key] = t
	var od: Array = O[key]
	_ann_busy = t + 0.9 + float(od[1])
	var st = _stream("vo/ann_%s.mp3" % L)
	if st == null: return false                                    # first call only fetches (JS annClip)
	_slice(_annp, st, float(od[0]), float(od[1]), minf(1.5, float(vol.announcer) / 100.0 * 1.25))
	_ann_busy = maxf(_ann_busy, t + float(od[1]) + 0.2)
	_note("ann", "ann_%s/%s" % [L, key]); return true

## soldier shouts (JS bfShoutPlay): type = rpg | manDown | reload | grenade | contact | tank | medic
func shout(type: String, x: float, y: float, team: int) -> bool:
	if not _voice_on() or _sim == null or team < 0 or team >= _sim.teams.size(): return false
	var fac: String = _sim.teams[team].fac
	var M: Dictionary = T.vos.get(fac, {})
	if not M.has(type) or M[type].is_empty(): return false
	var st = _stream("vo/%s_s.mp3" % fac)
	if st == null: return false
	var t := now()
	if t < _sh_end - 0.05 or t - float(_sh_type.get(type, -99.0)) < 5.0: return false
	var dx := x - _cam_t.x
	var d := Vector2(dx, y - _cam_t.y).length()
	var mine: bool = _sim.ally(team, _me)
	if d > (1500.0 if mine else 650.0): return false
	var on := d < _cam_d * 0.9
	var se: Array = M[type]
	var j := _rng.randi() % se.size()
	var vs := get_viewport().get_visible_rect().size
	_shoutp.global_position = Vector2(vs.x * 0.5 * (1.0 + clampf(dx / 900.0, -0.9, 0.9)), vs.y * 0.5)
	_slice(_shoutp, st, float(se[j][0]), float(se[j][1]), _vo_vol() * maxf(0.18, 1.05 - d / 1500.0) * (1.0 if on else 0.8))
	_sh_end = t + 0.02 + float(se[j][1]); _sh_type[type] = t
	_note("shout", "%s_s/%s/%d" % [fac, type, j]); return true

# ------------------------------------------------------------------------------------------------ soundtrack (JS ST / stPlay / stTick / stEnd)
func _music_on() -> bool: return unlocked and int(vol.music) > 0 and int(vol.master) > 0

func _pool(pool: String) -> Array:
	var out: Array = []
	for tr in T.get("tracks", []):
		if tr.pool == pool: out.append(tr.id)
	return out

func _st_pick(pool: String) -> String:
	var L := _pool(pool)
	var c := L.filter(func(k): return k != st_id and k != _st_last.get(pool, ""))
	if c.is_empty(): c = L.filter(func(k): return k != st_id)
	if c.is_empty(): c = L
	return "" if c.is_empty() else str(c[_rng.randi() % c.size()])

func _battle_pool() -> String:
	st_mode = "battle"
	return "combat" if heat > ST_HOT else "calm"

## the main menu / setup screen music (JS startMusic(style, calm=true))
func menu() -> void:
	battle_leave()
	if st_mode == "menu" or (st_mode == "end" and st_pool != ""): return
	st_mode = "menu"; _st_play("menu")

func _st_play(pool: String, fade: float = ST_FADE) -> void:
	if not _music_on():
		st_pool = pool; return
	var id := _st_pick(pool)
	if id == "": return
	if pool != st_pool: _st_since = now()
	st_pool = pool; st_id = id; _st_last[pool] = id
	_note("music", "%s %s" % [pool, id])
	if web:
		_web_play(id, fade); return
	var old = _decks[_st_cur] if _st_cur >= 0 else null
	_st_cur = 1 if _st_cur == 0 else 0
	var d: Dictionary = _decks[_st_cur]
	d.on = true; d.id = id; d.pool = pool; d.started = false; d.adv = false; d.g = 0.0; d.to = ST_GAIN; d.rate = ST_GAIN / maxf(fade, 0.05)
	d.p.stop(); d.p.volume_db = -80.0
	if old != null and old.on:
		old.on = false; old.to = 0.0; old.rate = maxf(old.g, 0.01) / maxf(fade, 0.05)
	_load("mus/st/%s.mp3" % id, func(st):
		if st == null or d.id != id or not d.on: return
		d.p.stream = st; d.p.play(); d.started = true)

func _st_halt() -> void:
	st_mode = ""; st_pool = ""; st_id = ""
	if web: JavaScriptBridge.eval("window.__ww3m&&window.__ww3m.stop(0.8)")
	for d in _decks:
		if d.on: d.on = false; d.to = 0.0; d.rate = maxf(d.g, 0.01) / 0.8

func _st_next(pool: String) -> void:
	if pool == "victory":
		st_mode = "menu"; _st_play("menu")
	elif pool == "defeat":
		if _sim != null and not _sim.over: _st_play(_battle_pool())
		else:
			st_mode = "menu"; _st_play("menu")
	else: _st_play(pool)

## every 250 ms (JS stTick): heat cools, calm <-> combat with a least stay in each, next track near the end of this one
func _st_tick() -> void:
	heat = maxf(0.0, heat - 0.006)
	if st_mode == "": return
	if not _music_on():
		if web: JavaScriptBridge.eval("window.__ww3m&&window.__ww3m.stop(0.3)")
		for d in _decks:
			if d.on: d.on = false; d.to = 0.0; d.rate = maxf(d.g, 0.01) / 0.3
		st_id = ""; return
	if st_id == "":                                              # music switched back on / first click on the web
		if st_mode == "end": st_mode = "menu"
		_st_play("menu" if st_mode == "menu" else _battle_pool(), 1.0); return
	if st_mode == "battle" and (st_pool == "calm" or st_pool == "combat"):
		var want := ("combat" if heat > ST_HOT else "calm") if st_pool == "calm" else ("calm" if heat < ST_COOL else "combat")
		if want != st_pool and now() - _st_since >= float(ST_DWELL[st_pool]):
			_st_play(want); return
	if web:
		var r = JavaScriptBridge.eval("window.__ww3m?window.__ww3m.left():-1")
		if r != null and float(r) >= 0.0 and float(r) < ST_FADE + 0.25: _st_next(st_pool)
		return
	if _st_cur < 0: return
	var d: Dictionary = _decks[_st_cur]
	if d.on and d.started and not d.adv and d.p.stream != null:
		var len := float(d.p.stream.get_length())
		if len > 0.0 and (d.p.get_playback_position() > len - ST_FADE - 0.25 or not d.p.playing):
			d.adv = true; _st_next(d.pool)

func _decks_step(dt: float) -> void:
	for d in _decks:
		if d.g != d.to:
			d.g = move_toward(d.g, d.to, d.rate * dt)
			d.p.volume_db = linear_to_db(maxf(d.g, 0.0001))
			if d.g <= 0.0 and not d.on: d.p.stop()

# web: the browser's own <audio> elements stream the tracks (as the JS game does) - nothing is decoded into memory
func _web_decks() -> void:
	JavaScriptBridge.eval("""window.__ww3m=(function(){var D=[new Audio(),new Audio()],cur=-1,vol=0.3,tm=null,g=[0,0],to=[0,0],rt=[0,0];
D.forEach(function(a){a.preload='auto';a.crossOrigin='anonymous';});
function step(){for(var i=0;i<2;i++){if(g[i]!==to[i]){var s=rt[i]*0.05;g[i]=g[i]<to[i]?Math.min(to[i],g[i]+s):Math.max(to[i],g[i]-s);if(g[i]<=0&&to[i]===0){try{D[i].pause();}catch(e){}}}try{D[i].volume=Math.max(0,Math.min(1,g[i]*vol));}catch(e){}}}
tm=setInterval(step,50);
return{play:function(url,fade){var o=cur;cur=cur===0?1:0;var a=D[cur];g[cur]=0;to[cur]=1;rt[cur]=1/Math.max(.05,fade);a.src=url;a.volume=0;var p=a.play();if(p&&p.catch)p.catch(function(){});if(o>=0){to[o]=0;rt[o]=Math.max(.01,g[o])/Math.max(.05,fade);}},
stop:function(f){for(var i=0;i<2;i++){to[i]=0;rt[i]=Math.max(.01,g[i])/Math.max(.05,f);}},
vol:function(v){vol=v;},
left:function(){if(cur<0)return -1;var a=D[cur];if(a.paused&&to[cur]>0){var p=a.play();if(p&&p.catch)p.catch(function(){});}if(a.ended)return 0;if(!isFinite(a.duration)||!(a.duration>0))return 999;return a.duration-a.currentTime;},
id:function(){return cur<0?'':D[cur].src;}};})();""", true)

func _web_play(id: String, fade: float) -> void:
	var b: String = _base_ok if _base_ok.begins_with("http") else str(_bases()[0])
	JavaScriptBridge.eval("window.__ww3m.play(%s,%f)" % [JSON.stringify(b + "mus/st/" + id + ".mp3"), fade])

func _web_vol() -> void:
	JavaScriptBridge.eval("window.__ww3m&&window.__ww3m.vol(%f)" % clampf(_mus_base() * _mus_k * ST_GAIN * 0.68 * float(vol.master) / 100.0, 0.0, 1.0))

# ------------------------------------------------------------------------------------------------ the battle
func battle_start(sim, me: int) -> void:
	_sim = sim; _me = me; _fac = str(sim.teams[me].fac)
	_seen.clear(); _proj_prev = []; _atk_warn = -99.0; _fire_warn = -99.0; _pw_low = 0; _obs_started = false; _sh_team.clear()
	_over = false; _st_end_k = ""; heat = 0.0; far_h = 0.0
	_ann_last.clear(); _ann_busy = 0.0; _rad_last.clear(); _rad_any = -99.0
	_theme = str(sim.map.get("theme", "desert")) if ("map" in sim and sim.map is Dictionary) else "desert"
	preload_nation(_fac)
	_st_fac = _fac; st_mode = "battle"; _st_play(_battle_pool())
	_note("battle", "start " + _fac)

func battle_end(won: bool) -> void:
	var k := "v" if won else "d"
	if _st_end_k == k: return
	_st_end_k = k; _over = true
	st_mode = "end"; _st_play("victory" if won else "defeat", 1.5)
	_note("battle", "victory" if won else "defeat")

func battle_leave() -> void:
	_sim = null; _over = false
	for k in _loops.keys(): _loops[k].p.stop()

## Called once per sim tick. Reads the sim (never writes) and raises the same sound events the JS sim logs / FXEs:
## shots (muzzle size by weapon), shell and missile hits, deaths, "Our base is under attack!" (25 s) / "Our troops are under
## fire!" (14 s), "Unit lost.", building started / complete, unit ready, low power / power back, shouts, victory / defeat.
func observe(sim, me: int, fast: bool = false) -> void:
	if sim != _sim: battle_start(sim, me)
	if fast: test_clock = sim.t        # headless AI / demo runs many ticks per frame: cooldowns follow game time
	var t: float = sim.t
	var first := not _obs_started
	_obs_started = true
	var alive: Dictionary = {}
	for e in sim.ents:
		if e.dead: continue
		alive[e.id] = true
		var mine: bool = e.team == me
		var o = _seen.get(e.id)
		if o == null:
			_seen[e.id] = [e.x, e.y, e.is_b, e.kind, e.team, e.built, e.last_hit, e.last_fire, e.size, e.s_cls, e.is_inf]
			if mine and not first:
				if e.is_b: ann("building")
				else:
					speak(3); ann("unit")                              # JS "<unit> ready." -> speak(3) + announcer
			continue
		o[0] = e.x; o[1] = e.y
		if e.is_b and float(o[5]) < 1.0 and e.built >= 1.0 and mine:
			if limit("built", 2, 0.5): _play_synth_ui(_wav_built, 0.58)
			speak(7); ann("complete")                                  # JS log(.., ' ready.', 'v7') + 'ann:complete'
		o[5] = e.built
		if e.last_fire > float(o[7]):
			o[7] = e.last_fire
			if mine or _vis(e, me):
				var w: String = e.s_wpn
				shot(e.x, e.y, 5.0 if (w == "gun" or w == "snipe") else (8.0 if (w == "at" or w == "missile") else (7.0 if w == "flak" else 13.0)))
				if e.is_inf and w == "at": _shout(e, "rpg", t)
				elif e.is_inf and e.target != null and not e.target.is_b and e.target.s_armor == "heavy": _shout(e, "tank", t)
				elif e.is_inf and t - float(_sh_team.get(str(e.team) + "c", -99.0)) > 30.0: _shout(e, "contact", t)
				if e.is_inf: _sh_team[str(e.team) + "c"] = t
		if e.last_hit > float(o[6]):
			o[6] = e.last_hit
			if mine:
				if e.is_b:
					if t - _atk_warn > 25.0:
						_atk_warn = t
						ann("baseAtk")
						if not radio("base"): speak(4)
				elif t - _fire_warn > 14.0:
					_fire_warn = t
					ann("unitsAtk"); speak(5)
	# shells / missiles that landed
	for pj in _proj_prev:
		if pj.done and pj.splash > 0: boom(pj.tx, pj.ty, maxf(9.0, float(pj.splash) * 0.42), false)
		elif pj.done: boom(pj.tx, pj.ty, 9.0 if (pj.wpn == "at" or pj.wpn == "missile") else 7.0, false)
	_proj_prev = sim.proj.duplicate()
	# deaths
	for id in _seen.keys():
		if alive.has(id): continue
		var o: Array = _seen[id]
		_seen.erase(id)
		if first: continue
		if o[2]: boom(o[0], o[1], float(o[8]) * 0.5, true)
		elif not o[10]: boom(o[0], o[1], 18.0, false)
		if int(o[4]) == me:
			if o[2]: ann("bldLost")
			else:
				ann("unitLost")
				if not radio("lost"): speak(6)
		if o[10] and int(o[4]) >= 0: _shout_at("manDown", o[0], o[1], int(o[4]), t)
	# power (works on both GDScript sim's pw_low and bridge_sim's Vector2 pw)
	var pw_v = sim.teams[me].get("pw", Vector2.ZERO)
	var pl := int(sim.teams[me].get("pw_low", 1 if (pw_v is Vector2 and pw_v.y > pw_v.x) else 0))
	if pl != _pw_low:
		_pw_low = pl
		if not first: ann("lowPower" if pl else "powerBack")
	# JS sim bridge events (KAIZEN 8: read before battle.gd drains take_events())
	if sim.has_method("peek_events"):
		for ev in sim.peek_events():
			if not (ev is Array) or ev.is_empty(): continue
			var kind_ev := str(ev[0])
			if kind_ev == "boom" and ev.size() >= 4:
				var bsz: float = clampf(float(ev[3]), 6.0, 48.0)
				var bbig: bool = (ev.size() >= 5 and int(ev[4]) != 0) or float(ev[3]) >= 30.0
				boom(float(ev[1]), float(ev[2]), bsz, bbig)
			elif kind_ev == "muz" and ev.size() >= 4:
				var msz := float(ev[5]) if ev.size() >= 6 else float(ev[3])
				shot(float(ev[1]), float(ev[2]), msz)
			elif kind_ev == "plane" and ev.size() >= 3:
				if limit("plane", 2, 1.5):
					var px := float(ev[3]) if ev.size() >= 5 else float(ev[1])
					var py := float(ev[4]) if ev.size() >= 5 else float(ev[2])
					var sp := spatial(px, py)
					if sp.is_empty() and ev.size() >= 5: sp = spatial((float(ev[1]) + px) * 0.5, (float(ev[2]) + py) * 0.5)
					if not sp.is_empty() and sp.v >= 0.02:
						_play_synth_2d(_wav_jet, sp, sp.v * 0.9, 0.92 + _rng.randf() * 0.16, "Sfx")
						_note("synth", "plane")
			elif kind_ev == "strike" or kind_ev == "bmis":
				if limit("klaxon", 1, 3.5):
					_play_synth_ui(_wav_klaxon, 0.72)
					_note("synth", "klaxon")
				if not ann("super"): ann("enemyStrike")
				var sx := float(ev[3]) if (kind_ev == "bmis" and ev.size() >= 5) else (float(ev[1]) if ev.size() >= 3 else 0.0)
				var sy := float(ev[4]) if (kind_ev == "bmis" and ev.size() >= 5) else (float(ev[2]) if ev.size() >= 3 else 0.0)
				if ev.size() >= 3 and limit("sub_strike", 2, 0.35):
					var sp := spatial(sx, sy)
					if not sp.is_empty() and sp.v >= 0.12:
						_play_synth_2d(_wav_sub, sp, sp.v * 0.85, 0.78, "Sfx")
			elif kind_ev == "emp" and ev.size() >= 3:
				if limit("emp", 2, 0.5):
					var sp := spatial(float(ev[1]), float(ev[2]))
					if not sp.is_empty() and sp.v >= 0.02:
						_play_synth_2d(_wav_emp, sp, maxf(0.35, sp.v * 0.95), 0.96 + _rng.randf() * 0.08, "Sfx")
						_note("synth", "emp")
			elif kind_ev == "rank" and ev.size() >= 2:
				var rid := int(ev[1])
				var rank_mine: bool = (int(_seen[rid][4]) == me) if _seen.has(rid) else (ev.size() == 2 and rid == me)
				if rank_mine and limit("promo", 1, 1.2):
					_play_synth_ui(_wav_promo, 0.72)
					_note("synth", "promo")
					ann("rank")
			elif kind_ev == "ready" and ev.size() >= 2 and int(ev[1]) == me:
				if ev.size() == 2:
					if not ann("superReady"): ann("strikeReady")
				else:
					ann("superReady")
			elif kind_ev == "built" and ev.size() >= 2 and int(ev[1]) == me:
				if limit("built", 2, 0.5):
					_play_synth_ui(_wav_built, 0.58)
					_note("synth", "built")
				speak(7); ann("complete")
	if _demo and t - _demo_t > 6.0:
		_demo_t = t
		var ks: Array = []
		for e in sim.ents:
			if not e.dead and e.team == me and not e.is_b and ks.size() < 6: ks.append(e.kind)
		speak(int(t / 6.0) % 3, ks)
	if sim.over and not _over:
		battle_end(sim.winner >= 0 and sim.ally(me, sim.winner))

func _vis(e, me: int) -> bool:
	return me < e.vs.size() and e.vs[me] != 0

## JS shout(): per team 1.6 s, per unit 9 s, per type 8 s (contact 14, tank 11, medic 7)
func _shout(e, type: String, t: float) -> void:
	if t - float(_sh_team.get(str(e.id) + "u", -99.0)) < 9.0: return
	if _shout_at(type, e.x, e.y, e.team, t): _sh_team[str(e.id) + "u"] = t

func _shout_at(type: String, x: float, y: float, team: int, t: float) -> bool:
	var k := str(team)
	if t - float(_sh_team.get(k, -9.0)) < 1.6: return false
	if t - float(_sh_team.get(k + type, -99.0)) < float(SHOUT_GAP.get(type, 8.0)): return false
	_sh_team[k] = t; _sh_team[k + type] = t
	shout(type, x, y, team); return true

## engine and weather beds (JS envAudio): tank / truck / helicopter / jet loops by what moves near the camera, wind, battle rumble
func _env() -> void:
	var on: bool = _sim != null and not _sim.over and _sfx_on()
	var tk := 0.0; var tr := 0.0; var he := 0.0; var je := 0.0
	if on:
		var R := _cam_d * 1.4
		for e in _sim.ents:
			if e.dead or e.is_b or not (e.team == _me or _vis(e, _me)): continue
			var cl: String = e.s_cls
			if cl != "heli" and cl != "jet" and not (e.s_dom == "ground" and e.s_armor == "heavy"): continue
			var d: float = Vector2(e.x - _cam_t.x, e.y - _cam_t.y).length()
			if d > R: continue
			var w: float = pow(1.0 - d / R, 1.5)
			if cl == "heli": he += w
			elif cl == "jet": je += w
			elif _sim.t - e.mv < 0.5:
				if cl == "tank" or cl == "arty" or cl == "aa": tk += w
				else: tr += w
	_loop("tank", minf(1.0, tk * 0.3) * 0.55 if on else 0.0)
	_loop("truck", minf(1.0, tr * 0.3) * 0.4 if on else 0.0)
	_loop("heli", minf(1.0, he * 0.3) * 0.6 if on else 0.0)
	_loop("jet", minf(1.0, je * 0.3) * 0.5 if on else 0.0)
	var wind := 0.2 if _theme == "snow" else (0.08 if _theme == "green" else 0.12)
	_loop("wind", wind * 0.5 if on else 0.0)
	_loop("rumble", (0.05 + minf(0.45, heat * 0.45)) * 0.5 if on else 0.0)

func _loop(k: String, g: float) -> void:
	var L = _loops.get(k)
	if L == null:
		if g < 0.01: return
		var st = _stream("sfx/%s.mp3" % k)
		if st == null: return
		var p := _mk("Sfx"); p.stream = st; p.volume_db = -80.0
		L = {p = p, g = 0.0}; _loops[k] = L
		_note("loop", k)
	L.g = lerpf(L.g, g, 0.25)
	if L.g < 0.004:
		if L.p.playing: L.p.stop()
		return
	if not L.p.playing: L.p.play(_rng.randf() * 2.0)
	L.p.volume_db = linear_to_db(L.g)

## fire too far to hear directly comes back as muffled far-off thumps (JS ambTick "distant fire")
func _far() -> void:
	if far_h <= 0.05 or not _sfx_on(): far_h = 0.0; return
	var st = _streams.get("sfx/sfx.mp3")
	if st is AudioStream and _rng.randf() < minf(0.9, far_h * 0.25):
		var i := _free_sfx()
		if i >= 0:
			var L: Array = T.sfx.clips.boomS
			var cl: Array = L[_rng.randi() % L.size()]
			var p: AudioStreamPlayer2D = _sfx[i]
			p.bus = "SfxFar"
			var vs := get_viewport().get_visible_rect().size
			p.global_position = Vector2(vs.x * (0.2 + _rng.randf() * 0.6), vs.y * 0.5)
			_slice(p, st, float(cl[0]), float(cl[1]), 0.1 + 0.02 * minf(far_h, 5.0), 0.62)
			_sfx_end[i] = now() + float(cl[1]) / 0.62
			_note("sfx", "far")
	far_h = maxf(0.0, far_h * 0.6 - 0.1)

# ------------------------------------------------------------------------------------------------ every frame
func _input(ev: InputEvent) -> void:
	if unlocked: return
	if (ev is InputEventMouseButton and ev.pressed) or (ev is InputEventKey and ev.pressed) or (ev is InputEventScreenTouch and ev.pressed):
		unlocked = true                                              # the browser lets sound start only after a click / key
		_note("unlock", "first input")
		_st_t = 1.0

func _process(dt: float) -> void:
	_clk += dt
	_stop_slices()
	_run_queue()
	var t := now()
	# ducking (JS duck() + the music dip while a line plays), smoothed
	var mk := (0.45 if t < _mus_duck_until else 1.0) * (0.55 if t < _duck_until else 1.0)
	var sk := (0.72 - 0.26 * minf(1.0, heat)) if t < _duck_until else 1.0
	var a := minf(1.0, dt / (0.05 if mk < _mus_k else 0.3))
	var ch := absf(mk - _mus_k) > 0.002 or absf(sk - _sfx_k) > 0.002
	_mus_k = lerpf(_mus_k, mk, a); _sfx_k = lerpf(_sfx_k, sk, a)
	if ch: _apply_vol()
	_decks_step(dt)
	_st_t += dt
	if _st_t >= 0.25:
		_st_t = 0.0; _st_tick()
	_env_t += dt
	if _env_t >= 0.15:
		_env_t = 0.0; _env()
	_far_t += dt
	if _far_t >= 0.45:
		_far_t = 0.0; _far()
	if web and keep_log:
		_dbg_t += dt
		if _dbg_t >= 1.0:
			_dbg_t = 0.0; JavaScriptBridge.eval("window.__ww3a=" + JSON.stringify(status()), true)

## what the sound system is doing right now (tests, and the web build with --audio-log)
func status() -> Dictionary:
	var n := {}
	for l in log_lines:
		var k: String = str(l).split(" ")[1]
		n[k] = int(n.get(k, 0)) + 1
	var ok := 0; var bad: Array = []
	for k in _streams.keys():
		if _streams[k] is AudioStream: ok += 1
		elif _streams[k] is String and _streams[k] == "fail": bad.append(k)
	return {unlocked = unlocked, events = n, music = st_id, pool = st_pool, mode = st_mode, heat = snappedf(heat, 0.01), base = _base_ok, loaded = ok, failed = bad, voices = active_sfx(), last = log_lines.slice(-6)}
