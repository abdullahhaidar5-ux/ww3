## UI kit (lane P6): the classic C&C Generals look shared by the menus and the battle HUD, the Settings store,
## the launch slot (what the menu asks the Battle scene to start) and the save / replay files.
## Everything is static: `const UI = preload("res://scripts/ui/ui_kit.gd")`.
extends RefCounted

# ---------------------------------------------------------------- colours + fonts (the browser game's: --fg --dim --accent --line, Saira Condensed + IBM Plex Mono)
const GOLD := Color("e3b341")
const GOLD_HI := Color("f2c14e")
const GOLD_DIM := Color("9a7a2c")
const TEXT := Color("dde5df")
const TEXT_DIM := Color("8a9a92")
const BG := Color("05080a")
const LINE := Color("2c3833")
const CYAN := Color("5fb4c8")
const PLATE := Color("121b22")
const PLATE_HI := Color("1c2b36")
const PLATE_PRESS := Color("2d2410")
const PANEL := Color(0.043, 0.066, 0.084, 0.93)
const EDGE := Color("2a3d49")
const BEZEL := Color("24323f")
const BEZEL_DARK := Color("0c131a")
const SPECULAR := Color(0.68, 0.86, 0.94, 0.24)
const GOLD_SPEC := Color(1.0, 0.94, 0.72, 0.48)
const BLUE := Color(0.36, 0.62, 0.9)
const RED := Color(0.95, 0.3, 0.25)
const GREEN := Color(0.35, 0.9, 0.45)

static var _icon_cache: Dictionary = {}
static var _tex_cache: Dictionary = {}

static func icon(name: String) -> Texture2D:
	if name == "": return null
	if _icon_cache.has(name): return _icon_cache[name]
	var p := "res://ui/icons/svg/%s.png" % name
	var t: Texture2D = load(p) if ResourceLoader.exists(p) else null
	_icon_cache[name] = t
	return t

static var _fonts := {}
static var _fb_fonts: Array[Font] = []
static var _fb_init := false

static func _fallbacks() -> Array[Font]:
	if _fb_init: return _fb_fonts
	_fb_init = true
	if ResourceLoader.exists("res://ui/NotoSansArabic-SemiBold.ttf"):
		var ar: Font = load("res://ui/NotoSansArabic-SemiBold.ttf")
		if ar != null:
			_fb_fonts.append(ar)
	if not OS.has_feature("web") and DisplayServer.get_name() != "headless":
		var sf := SystemFont.new()
		sf.font_names = PackedStringArray(["Segoe UI", "Tahoma", "Arial", "Noto Sans", "Noto Sans CJK SC", "DejaVu Sans"])
		sf.multichannel_signed_distance_field = false
		_fb_fonts.append(sf)
	return _fb_fonts

## "display" (Saira Condensed SemiBold, wide tracking), "bold" (Saira Condensed Bold), "mono" (IBM Plex Mono), "quote_orig" (0-tracking Unicode/Arabic-safe)
static func font(kind: String = "display") -> Font:
	if _fonts.has(kind): return _fonts[kind]
	var map := {"display": "res://ui/SairaCondensed-SemiBold.ttf", "bold": "res://ui/SairaCondensed-Bold.ttf", "mono": "res://ui/IBMPlexMono-Regular.ttf", "tight": "res://ui/SairaCondensed-SemiBold.ttf", "quote_orig": "res://ui/SairaCondensed-SemiBold.ttf"}
	var file: String = map.get(kind, "res://ui/SairaCondensed-SemiBold.ttf")
	var base: Font = null
	if ResourceLoader.exists(file): base = load(file)
	if base == null: base = ThemeDB.fallback_font
	var fv := FontVariation.new()
	fv.base_font = base
	if kind != "mono" and kind != "tight" and kind != "quote_orig":
		fv.spacing_glyph = 2
	var fbs := _fallbacks()
	if not fbs.is_empty():
		fv.fallbacks = fbs
	_fonts[kind] = fv
	return fv

static func font_supports_text(f: Font, txt: String) -> bool:
	if f == null or txt == "": return false
	for i in txt.length():
		var cp := txt.unicode_at(i)
		if cp <= 0x20 or cp == 0x200C or cp == 0x200D or cp == 0xFEFF:
			continue
		if not f.has_char(cp):
			return false
	return true

# the 22 playable nations in the picker's order (CLAUDE.md "Factions"); the picker shows the ones data/rules.json has
const PLAYABLE := ["IR", "RS", "DW", "RV", "OB", "US", "GB", "FR", "DE", "IL", "UA", "RU", "CN", "KP", "IN", "JP", "KR", "PK", "SA", "AE", "TR", "EG"]
const BLOCS := [["Shia and allies", ["IR", "RS", "DW", "RV", "OB"]], ["West", ["US", "GB", "FR", "DE", "IL", "UA"]], ["East", ["RU", "CN", "KP"]], ["Asia", ["IN", "JP", "KR", "PK"]], ["Regional", ["SA", "AE", "TR", "EG"]]]
const NAT_FALLBACK := {"IR": "Iran", "RS": "Hezbollah", "DW": "Ansarallah", "RV": "Kataib Hezbollah", "OB": "Hamas",
	"US": "United States", "GB": "United Kingdom", "FR": "France", "DE": "Germany", "IL": "Israel", "UA": "Ukraine", "RU": "Russia", "CN": "China",
	"KP": "North Korea", "IN": "India", "JP": "Japan", "KR": "South Korea", "PK": "Pakistan", "SA": "Saudi Arabia", "AE": "UAE", "TR": "Turkey", "EG": "Egypt"}
const MORALE_NAME := {"zeal": "Zealous - never routs", "prof": "Professional", "home": "Home defenders", "fire": "Firepower-reliant"}
const SEAT_COL := [Color(0.35, 0.9, 0.45), Color(0.95, 0.3, 0.25), Color(0.4, 0.7, 1.0), Color(0.95, 0.8, 0.3), Color(0.85, 0.45, 0.95), Color(0.3, 0.9, 0.9), Color(1.0, 0.6, 0.25), Color(0.85, 0.85, 0.85)]

# ---------------------------------------------------------------- launch slot (menu -> Battle scene)
## {kind = "battle"|"mission"|"tutorial"|"load"|"replay"|"online", map, players:[{fac, ai, tm, diff}], seed, diff, mission, file, code, name}
static var launch: Dictionary = {}
## the screen the menu opens on when a scene sends the player back to it ("" = title)
static var menu_start := ""

# ---------------------------------------------------------------- settings (user://settings.cfg)
const SET_DEF := {
	"vol_master": 0.8, "vol_music": 0.6, "vol_sfx": 0.8, "vol_voice": 0.8,
	"mouse_lock": true, "edge_scroll": true, "scroll_speed": 1.0, "deselect_after_order": false,
	"gfx_quality": 2, "shadows": true, "fullscreen": false, "show_fps": false, "ui_scale": 1.0,
	"player_name": "Commander", "last_fac": "IR", "last_enemy": "US", "last_map": "bm_splitridge", "last_diff": 1,
}
static var _cfg: ConfigFile = null

static func cfg() -> ConfigFile:
	if _cfg == null:
		_cfg = ConfigFile.new()
		_cfg.load("user://settings.cfg")
	return _cfg

static func opt(key: String):
	return cfg().get_value("s", key, SET_DEF.get(key))

static func set_opt(key: String, v) -> void:
	cfg().set_value("s", key, v)
	cfg().save("user://settings.cfg")
	apply_settings()

## volumes go to audio buses when lane P5 has made them (Music / SFX / Voice); Master always exists
static func apply_settings() -> void:
	for it in [["Master", "vol_master"], ["Music", "vol_music"], ["SFX", "vol_sfx"], ["Voice", "vol_voice"]]:
		var i := AudioServer.get_bus_index(it[0])
		if i >= 0:
			var v := float(opt(it[1]))
			AudioServer.set_bus_mute(i, v <= 0.001)
			AudioServer.set_bus_volume_db(i, linear_to_db(maxf(v, 0.001)))
	if DisplayServer.get_name() != "headless":
		var want := DisplayServer.WINDOW_MODE_FULLSCREEN if bool(opt("fullscreen")) else DisplayServer.WINDOW_MODE_WINDOWED
		var cur := DisplayServer.window_get_mode()
		if (cur == DisplayServer.WINDOW_MODE_FULLSCREEN) != (want == DisplayServer.WINDOW_MODE_FULLSCREEN): DisplayServer.window_set_mode(want)

static var _mobile_cached := -1
static func is_mobile() -> bool:
	if _mobile_cached >= 0: return _mobile_cached == 1
	var m := OS.has_feature("web_android") or OS.has_feature("web_ios") or OS.has_feature("android") or OS.has_feature("ios")
	if "--mobile" in OS.get_cmdline_user_args(): m = true
	if not m and DisplayServer.get_name() != "headless" and DisplayServer.is_touchscreen_available(): m = true
	if not m and OS.has_feature("web"):
		var w := bool(JavaScriptBridge.eval("(function(){try{return location.search.indexOf('mobile')>=0 || (navigator.maxTouchPoints>0 && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));}catch(e){return false;}})()", true))
		if w: m = true
	_mobile_cached = 1 if m else 0
	return m

## mouse stays inside the window on PC during a battle (Esc releases it); browsers/mobile keep the normal pointer
static func lock_mouse(on: bool) -> void:
	if DisplayServer.get_name() == "headless": return
	if on and bool(opt("mouse_lock")) and not OS.has_feature("web") and not is_mobile(): Input.mouse_mode = Input.MOUSE_MODE_CONFINED
	else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

# ---------------------------------------------------------------- data (nations + maps come from res://data/ui/*.json, fallback to res://data/rules.json + map_*.json)
static var _rules: Dictionary = {}
static func rules() -> Dictionary:
	if _rules.is_empty():
		var f := FileAccess.open("res://data/rules.json", FileAccess.READ)
		if f != null:
			var parsed = JSON.parse_string(f.get_as_text())
			if typeof(parsed) == TYPE_DICTIONARY: _rules = parsed
	return _rules

static var _nat_data: Dictionary = {}
static var _nat_loaded := false
static func _load_nat_data() -> Dictionary:
	if not _nat_loaded:
		_nat_loaded = true
		var f := FileAccess.open("res://data/ui/nations.json", FileAccess.READ)
		if f != null:
			var parsed = JSON.parse_string(f.get_as_text())
			if typeof(parsed) == TYPE_DICTIONARY: _nat_data = parsed
	return _nat_data

static func nations() -> Array:
	var nd := _load_nat_data()
	var N: Dictionary = nd.get("nations", {})
	var out: Array = []
	if not N.is_empty():
		for k in PLAYABLE:
			if N.has(k): out.append(k)
		if not out.is_empty(): return out
	var F: Dictionary = rules().get("factions", {})
	for k in PLAYABLE:
		if F.has(k): out.append(k)
	return out

static func nat_data(k: String) -> Dictionary:
	var nd := _load_nat_data()
	var N: Dictionary = nd.get("nations", {})
	if N.has(k) and typeof(N[k]) == TYPE_DICTIONARY: return N[k]
	var F: Dictionary = rules().get("factions", {})
	if F.has(k) and typeof(F[k]) == TYPE_DICTIONARY: return F[k]
	if NAT_FALLBACK.has(k): return {key = k, name = NAT_FALLBACK[k]}
	return {}

static func nat_name(k: String) -> String:
	var nd := _load_nat_data()
	var N: Dictionary = nd.get("nations", {})
	if N.has(k) and typeof(N[k]) == TYPE_DICTIONARY:
		return str(N[k].get("name", NAT_FALLBACK.get(k, k)))
	var F: Dictionary = rules().get("factions", {})
	if F.has(k) and typeof(F[k]) == TYPE_DICTIONARY:
		return str(F[k].get("name", NAT_FALLBACK.get(k, k)))
	return str(NAT_FALLBACK.get(k, k))

static var _map_data: Dictionary = {}
static var _map_loaded := false
static func _load_map_data() -> Dictionary:
	if not _map_loaded:
		_map_loaded = true
		var f := FileAccess.open("res://data/ui/maps.json", FileAccess.READ)
		if f != null:
			var parsed = JSON.parse_string(f.get_as_text())
			if typeof(parsed) == TYPE_DICTIONARY: _map_data = parsed
	return _map_data

## all Battle maps from res://data/ui/maps.json (fallback: scan res://data/map_*.json)
static var _maps: Array = []
static func maps() -> Array:
	if not _maps.is_empty(): return _maps
	var md := _load_map_data()
	var M: Dictionary = md.get("maps", {})
	var order: Array = md.get("order", [])
	if not M.is_empty():
		var keys: Array = order if not order.is_empty() else M.keys()
		for k in keys:
			var key := str(k)
			if not M.has(key) or typeof(M[key]) != TYPE_DICTIONARY: continue
			var raw: Dictionary = M[key]
			var pmax := int(raw.get("players_max", 2))
			var pmin := int(raw.get("players_min", 2))
			var w := 4800.0
			var h := 3320.0
			var worlds = raw.get("world", [])
			if typeof(worlds) == TYPE_ARRAY and worlds.size() > 0:
				var wd = worlds[worlds.size() - 1]
				if typeof(wd) == TYPE_DICTIONARY:
					w = float(wd.get("width", w))
					h = float(wd.get("height", h))
			_maps.append({
				key = key,
				name = str(raw.get("name", key)),
				n = pmax,
				min = pmin,
				w = w,
				h = h,
				theme = str(raw.get("theme", "")),
				facts = str(raw.get("facts", "")),
				desc = str(raw.get("description", "")),
				battle_map = bool(raw.get("battle_map", key.begins_with("bm_"))),
				file = "res://data/map_%s.json" % key,
			})
		if not _maps.is_empty(): return _maps
	var d := DirAccess.open("res://data")
	if d == null: return _maps
	var names: Array = []
	for fn in d.get_files():
		var f := str(fn).trim_suffix(".remap")
		if f.begins_with("map_") and f.ends_with(".json") and not names.has(f): names.append(f)
	names.sort()
	for f in names:
		var fa := FileAccess.open("res://data/" + f, FileAccess.READ)
		if fa == null: continue
		var txt := fa.get_as_text()
		# only the head of the file is needed: read the small keys without keeping the grids
		var m = JSON.parse_string(txt)
		if typeof(m) != TYPE_DICTIONARY or not m.has("bases"): continue
		var key := str(m.get("key", f.substr(4, f.length() - 9)))
		var pmax := int(m.bases.size())
		var mw := float(m.MAPW)
		var mh := float(m.MAPH)
		var sz := "Large" if mw > 6000.0 else ("Medium" if mw > 4000.0 else "Small")
		_maps.append({
			key = key,
			name = str(m.get("name", key)),
			n = pmax,
			min = 2,
			w = mw,
			h = mh,
			theme = "",
			facts = "%d players · %s" % [pmax, sz],
			desc = "",
			battle_map = key.begins_with("bm_"),
			file = "res://data/" + f,
		})
	_maps.sort_custom(func(a, b):
		var ab: bool = str(a.key).begins_with("bm_"); var bb: bool = str(b.key).begins_with("bm_")
		if ab != bb: return ab
		if a.n != b.n: return a.n < b.n
		return str(a.name) < str(b.name))
	return _maps

static func map_info(key: String) -> Dictionary:
	for m in maps():
		if m.key == key: return m
	return {}

# ---------------------------------------------------------------- saves / replays (a Battle = map + seats + seed + the orders by tick)
static func save_dir(kind: String) -> String:
	var p := "user://" + kind
	DirAccess.make_dir_recursive_absolute(p)
	return p

static func list_files(kind: String) -> Array:
	var out: Array = []
	var d := DirAccess.open(save_dir(kind))
	if d == null: return out
	for f in d.get_files():
		if not str(f).ends_with(".json"): continue
		var path := save_dir(kind) + "/" + str(f)
		var fa := FileAccess.open(path, FileAccess.READ)
		if fa == null: continue
		var j = JSON.parse_string(fa.get_as_text())
		if typeof(j) != TYPE_DICTIONARY or int(j.get("v", 0)) != 1 or not j.has("map") or not j.has("players"): continue   # old Conquest / campaign files are ignored
		out.append({path = path, name = str(j.get("name", f)), when = float(j.get("when", 0)), t = float(j.get("t", 0)), map = str(j.map), fac = str(j.get("fac", "")), mission = str(j.get("mission", ""))})
	out.sort_custom(func(a, b): return a.when > b.when)
	return out

static func read_file(path: String) -> Dictionary:
	var fa := FileAccess.open(path, FileAccess.READ)
	if fa == null: return {}
	var j = JSON.parse_string(fa.get_as_text())
	return j if typeof(j) == TYPE_DICTIONARY else {}

static func write_file(kind: String, fname: String, data: Dictionary) -> String:
	var path := save_dir(kind) + "/" + fname + ".json"
	var fa := FileAccess.open(path, FileAccess.WRITE)
	if fa == null: return ""
	fa.store_string(JSON.stringify(data))
	fa.close()
	return path

# medals + battle record (user://record.cfg)
static func record() -> ConfigFile:
	var c := ConfigFile.new()
	c.load("user://record.cfg")
	return c

static func bump(key: String, by: float = 1.0) -> void:
	var c := record()
	c.set_value("r", key, float(c.get_value("r", key, 0.0)) + by)
	c.save("user://record.cfg")

const MEDALS := [
	["first_win", "First Victory", "Win a Battle", "wins", 1], ["veteran", "Veteran", "Win 10 Battles", "wins", 10],
	["hard", "Outsmarted", "Beat the Hard AI", "wins_hard", 1], ["brutal", "Against the Odds", "Beat the Brutal AI", "wins_brutal", 1],
	["tank", "Tank Buster", "Destroy 100 vehicles in total", "veh_kills", 100], ["thousand", "Field Marshal", "Destroy 1000 enemy units in total", "kills", 1000],
	["builder", "Engineer Corps", "Build 100 buildings in total", "built", 100], ["blitz", "Blitz", "Win a Battle in under 10 minutes", "wins_fast", 1],
	["missions", "Campaigner", "Finish every story mission", "missions_all", 1], ["tutor", "Basic Training", "Finish the Tutorial", "tutorial", 1],
]

# ---------------------------------------------------------------- widgets
## Forged military steel plate: deep machined gunmetal perimeter, crisp cut corner, soft outer shadow.
## Note: Never overwrites perimeter `edge` with `bar`; use `add_rim()` for multi-color top specular rim & left accent bar.
static func box(bg: Color, edge: Color, bw: int = 1, pad: int = 10, cut: int = 0, bar: Color = Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = edge if edge.a > 0.01 else BEZEL
	sb.set_border_width_all(bw)
	if bw > 0:
		sb.border_width_bottom = maxi(bw, 2)
	if cut > 0:
		sb.corner_radius_top_right = cut
		sb.corner_detail = 1
	sb.anti_aliasing = cut > 0
	sb.content_margin_left = pad
	sb.content_margin_right = pad
	sb.content_margin_top = pad * 0.48
	sb.content_margin_bottom = pad * 0.48
	sb.shadow_color = Color(0, 0, 0, 0.34)
	sb.shadow_size = 4
	sb.shadow_offset = Vector2(0, 2)
	if bar.a > 0.0 and bar == sb.border_color:
		sb.border_width_left = 3
		sb.border_blend = false
	return sb

## Adds a crisp 1px metallic top specular highlight and optional 3px left tactical accent bar without clobbering dark perimeter borders.
static func add_rim(ctrl: Control, rim_col: Color = SPECULAR, left_bar: Color = Color(0, 0, 0, 0), cut_r: float = 0.0) -> void:
	if rim_col.a > 0.0:
		var rim := ColorRect.new()
		rim.name = "Rim"
		rim.color = rim_col
		rim.mouse_filter = Control.MOUSE_FILTER_IGNORE
		rim.anchor_left = 0.0; rim.anchor_right = 1.0
		rim.anchor_top = 0.0; rim.anchor_bottom = 0.0
		rim.offset_left = 1.0 if left_bar.a <= 0.0 else 3.0
		rim.offset_right = -(cut_r + 1.0)
		rim.offset_top = 1.0
		rim.offset_bottom = 2.0
		ctrl.add_child(rim)
	if left_bar.a > 0.0:
		var bar := ColorRect.new()
		bar.name = "Bar"
		bar.color = left_bar
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.anchor_left = 0.0; bar.anchor_right = 0.0
		bar.anchor_top = 0.0; bar.anchor_bottom = 1.0
		bar.offset_left = 0.0; bar.offset_right = 3.0
		bar.offset_top = 1.0; bar.offset_bottom = -1.0
		ctrl.add_child(bar)

static func panel_style(pad: int = 14) -> StyleBoxFlat:
	var sb := box(PANEL, EDGE, 1, pad, 10)
	sb.border_width_top = 2
	sb.content_margin_top = pad * 0.72
	sb.content_margin_bottom = pad * 0.72
	sb.shadow_color = Color(0, 0, 0, 0.52)
	sb.shadow_size = 12
	sb.shadow_offset = Vector2(0, 4)
	return sb

static func panel(pad: int = 14) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(pad))
	return p

static func label(txt: String, size: int = 14, col: Color = TEXT, kind: String = "mono") -> Label:
	var l := Label.new()
	l.text = txt
	l.add_theme_font_override("font", font(kind))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	return l

## wrapped mono paragraph (.mxsub)
static func para(txt: String, size: int = 13, col: Color = TEXT_DIM, width: float = 470.0) -> Label:
	var l := label(txt, size, col, "mono")
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = width
	return l

static func title(txt: String, size: int = 34, col: Color = GOLD) -> Label:
	var l := label(txt.to_upper(), size, col, "bold")
	l.add_theme_constant_override("shadow_offset_y", 3)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.65))
	return l

const PLATE_EDGE := Color("24323f")
static func _plate(b: Button, size: int, primary: bool) -> void:
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_override("font", font("display"))
	b.add_theme_font_size_override("font_size", size)
	var pad := int(size * 0.8)
	if primary:
		for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
			b.add_theme_color_override(c, Color("141008"))
		b.add_theme_color_override("font_disabled_color", Color(0.32, 0.30, 0.24))
		var n := box(GOLD, Color("7c5c16"), 1, pad * 2, 10)
		var hv := box(GOLD_HI, Color("b48824"), 1, pad * 2, 10)
		var pr := box(GOLD_DIM, Color("5a4410"), 1, pad * 2, 10)
		var ds := box(Color(0.28, 0.25, 0.17), Color(0.22, 0.22, 0.20), 1, pad * 2, 10)
		b.add_theme_stylebox_override("normal", n)
		b.add_theme_stylebox_override("hover", hv)
		b.add_theme_stylebox_override("pressed", pr)
		b.add_theme_stylebox_override("disabled", ds)
		add_rim(b, Color(1.0, 0.97, 0.82, 0.55), Color(0, 0, 0, 0), 9.0)
	else:
		b.add_theme_color_override("font_color", TEXT)
		b.add_theme_color_override("font_hover_color", Color(1, 1, 1))
		b.add_theme_color_override("font_pressed_color", GOLD_HI)
		b.add_theme_color_override("font_disabled_color", Color(0.42, 0.48, 0.50))
		b.add_theme_stylebox_override("normal", box(PLATE, PLATE_EDGE, 1, pad + 4, 9))
		b.add_theme_stylebox_override("hover", box(PLATE_HI, Color("486272"), 1, pad + 4, 9))
		b.add_theme_stylebox_override("pressed", box(PLATE_PRESS, GOLD, 1, pad + 4, 9))
		b.add_theme_stylebox_override("disabled", box(Color("0b1116"), Color("18222a"), 1, pad + 4, 9))
		add_rim(b, SPECULAR, CYAN, 8.0)
		var bar: ColorRect = b.get_node_or_null("Bar")
		var rim: ColorRect = b.get_node_or_null("Rim")
		b.mouse_entered.connect(func():
			if b.disabled: return
			if bar != null: bar.color = GOLD_HI
			if rim != null: rim.color = GOLD_SPEC)
		b.mouse_exited.connect(func():
			var act: bool = b.toggle_mode and b.button_pressed
			if bar != null: bar.color = Color("24323b") if b.disabled else (GOLD_HI if act else CYAN)
			if rim != null: rim.color = Color(0.3, 0.36, 0.4, 0.12) if b.disabled else (GOLD_SPEC if act else SPECULAR))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

## small plate button; primary = the gold one ("Start battle")
static func button(txt: String, on: Callable = Callable(), size: int = 15, min_w: float = 0.0, primary: bool = false) -> Button:
	var b := Button.new()
	b.text = txt.to_upper()
	_plate(b, size, primary)
	if min_w > 0: b.custom_minimum_size.x = min_w
	if on.is_valid(): b.pressed.connect(on)
	return b

## toggle plate (difficulty, tabs): burnished gold when on
static func toggle(txt: String, grp: ButtonGroup, on_now: bool, on: Callable, size: int = 15) -> Button:
	var b := button(txt, Callable(), size)
	b.toggle_mode = true
	b.button_group = grp
	b.button_pressed = on_now
	var pad := int(size * 0.8) + 4
	var sel := box(Color("382d12"), GOLD, 1, pad, 9)
	var sel_hv := box(Color("453716"), GOLD_HI, 1, pad, 9)
	b.add_theme_color_override("font_pressed_color", GOLD_HI)
	b.add_theme_color_override("font_hover_pressed_color", Color(1.0, 0.96, 0.80))
	b.add_theme_stylebox_override("pressed", sel)
	b.add_theme_stylebox_override("hover_pressed", sel_hv)
	var sync_chrome := func(is_on: bool):
		var bar: ColorRect = b.get_node_or_null("Bar")
		var rim: ColorRect = b.get_node_or_null("Rim")
		if bar != null: bar.color = GOLD_HI if is_on else CYAN
		if rim != null: rim.color = GOLD_SPEC if is_on else SPECULAR
	sync_chrome.call(on_now)
	b.toggled.connect(sync_chrome)
	b.pressed.connect(on)
	return b

## title-screen & modal menu item: clean layout-driven machined plate with optional SVG icon, subtitle, and hover glow
static func menu_item(txt: String, on: Callable, size: int = 22, sub: String = "", width: float = 480.0, icon_name: String = "") -> Button:
	var b := Button.new()
	b.name = "Item_" + txt.replace(" ", "_")
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	_plate(b, size, false)
	var ic_tex := icon(icon_name)
	var min_h := (size * 1.65 + 26.0) if sub != "" else maxf(size * 2.05, 42.0)
	b.custom_minimum_size = Vector2(width, min_h)
	if sub == "" and ic_tex == null:
		b.text = txt.to_upper()
	else:
		b.text = ""
		var mc := MarginContainer.new()
		mc.set_anchors_preset(Control.PRESET_FULL_RECT)
		mc.mouse_filter = Control.MOUSE_FILTER_IGNORE
		mc.add_theme_constant_override("margin_left", 14)
		mc.add_theme_constant_override("margin_right", 14)
		mc.add_theme_constant_override("margin_top", 5)
		mc.add_theme_constant_override("margin_bottom", 6)
		b.add_child(mc)

		var hb := HBoxContainer.new()
		hb.alignment = BoxContainer.ALIGNMENT_CENTER
		hb.add_theme_constant_override("separation", 12)
		hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		mc.add_child(hb)

		var ic_rect: TextureRect = null
		if ic_tex != null:
			var ic_sz := clampf(float(size) * 0.95, 16.0, 22.0)
			ic_rect = TextureRect.new()
			ic_rect.texture = ic_tex
			ic_rect.custom_minimum_size = Vector2(ic_sz, ic_sz)
			ic_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			ic_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			ic_rect.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			ic_rect.modulate = Color("a8cbd6")
			ic_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
			hb.add_child(ic_rect)

		var tv := VBoxContainer.new()
		tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tv.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		tv.add_theme_constant_override("separation", 0)
		tv.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.add_child(tv)

		var l1 := label(txt.to_upper(), size, TEXT, "display")
		l1.name = "T"
		l1.clip_text = true
		l1.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		l1.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tv.add_child(l1)

		if sub != "":
			var l2 := label(sub, 12, Color("d8b85a"), "mono")
			l2.clip_text = true
			l2.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			l2.mouse_filter = Control.MOUSE_FILTER_IGNORE
			tv.add_child(l2)

		var chev := label("›", maxi(size - 2, 16), Color(CYAN.r, CYAN.g, CYAN.b, 0.55), "bold")
		chev.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		chev.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.add_child(chev)

		b.mouse_entered.connect(func():
			if b.disabled: return
			l1.add_theme_color_override("font_color", Color(1, 1, 1))
			chev.add_theme_color_override("font_color", GOLD_HI)
			if ic_rect != null: ic_rect.modulate = GOLD_HI)
		b.mouse_exited.connect(func():
			l1.add_theme_color_override("font_color", Color(0.45, 0.50, 0.52) if b.disabled else TEXT)
			chev.add_theme_color_override("font_color", Color(0.3, 0.35, 0.38, 0.4) if b.disabled else Color(CYAN.r, CYAN.g, CYAN.b, 0.55))
			if ic_rect != null: ic_rect.modulate = Color(0.4, 0.44, 0.46) if b.disabled else Color("a8cbd6"))
	b.pressed.connect(on)
	return b

static func dropdown(items: Array, cur: int, on: Callable, min_w: float = 150.0) -> OptionButton:
	var o := OptionButton.new()
	o.focus_mode = Control.FOCUS_NONE
	for it in items: o.add_item(str(it))
	if cur >= 0 and cur < items.size(): o.select(cur)
	o.custom_minimum_size.x = min_w
	o.add_theme_font_override("font", font("tight"))
	o.add_theme_font_size_override("font_size", 15)
	o.add_theme_color_override("font_color", TEXT)
	o.add_theme_color_override("font_hover_color", Color(1, 1, 1))
	o.add_theme_color_override("font_pressed_color", GOLD_HI)
	o.add_theme_stylebox_override("normal", box(Color("0b1218"), Color("2e4452"), 1, 12, 5))
	o.add_theme_stylebox_override("hover", box(Color("13202a"), CYAN, 1, 12, 5))
	o.add_theme_stylebox_override("pressed", box(Color("1b2730"), GOLD, 1, 12, 5))
	o.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	add_rim(o, Color(0.55, 0.78, 0.88, 0.16), Color(0, 0, 0, 0), 4.0)
	var pm := o.get_popup()
	pm.add_theme_font_override("font", font("tight"))
	pm.add_theme_font_size_override("font_size", 15)
	pm.add_theme_stylebox_override("panel", box(Color("0a1117"), Color("36505e"), 1, 6, 4))
	pm.add_theme_stylebox_override("hover", box(Color("2e2510"), GOLD, 1, 6, 2))
	o.item_selected.connect(on)
	return o

static func input_style(le: LineEdit) -> void:
	le.add_theme_font_override("font", font("mono"))
	le.add_theme_font_size_override("font_size", 13)
	le.add_theme_color_override("font_color", TEXT)
	le.add_theme_color_override("font_placeholder_color", Color("667b84"))
	le.add_theme_color_override("caret_color", GOLD_HI)
	le.add_theme_stylebox_override("normal", box(Color("0a1117"), Color("2a3e4b"), 1, 10, 5))
	le.add_theme_stylebox_override("focus", box(Color("0e1820"), GOLD, 1, 10, 5))

## Procedural machined grabber texture for tactical HSliders (cached once)
static func _slider_grabber_tex(hi: bool) -> ImageTexture:
	var k := "grab_hi" if hi else "grab"
	if _tex_cache.has(k): return _tex_cache[k]
	var w := 12; var h := 18
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var fill := Color("f2c652") if hi else Color("2b404d")
	var rim := Color("fff2b8") if hi else GOLD_HI
	var edge := Color("7a5b14") if hi else Color("101a20")
	for y in h:
		for x in w:
			var border := x == 0 or x == w - 1 or y == 0 or y == h - 1
			var corner := (x == 0 or x == w - 1) and (y == 0 or y == h - 1)
			if corner:
				img.set_pixel(x, y, Color(0, 0, 0, 0))
			elif border:
				img.set_pixel(x, y, edge)
			elif y == 1:
				img.set_pixel(x, y, rim)
			elif x >= 4 and x <= 7 and y >= 5 and y <= h - 6:
				img.set_pixel(x, y, Color("141008") if hi else GOLD_HI)
			else:
				img.set_pixel(x, y, fill)
	var t := ImageTexture.create_from_image(img)
	_tex_cache[k] = t
	return t

## Procedural military toggle-switch pill texture for CheckButtons (cached once)
static func _check_tex(on: bool) -> ImageTexture:
	var k := "chk_on" if on else "chk_off"
	if _tex_cache.has(k): return _tex_cache[k]
	var w := 38; var h := 20
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var track_bg := Color("2e2510") if on else Color("0a1116")
	var track_edge := GOLD if on else Color("2c414d")
	var knob_col := GOLD_HI if on else Color("58707c")
	var knob_cx := 27.5 if on else 10.5
	var knob_cy := 9.5
	for y in h:
		for x in w:
			# Pill SDF
			var r := 9.5
			var px := clampf(float(x), r, float(w - 1) - r)
			var d := Vector2(float(x) - px, float(y) - r).length()
			if d > r:
				img.set_pixel(x, y, Color(0, 0, 0, 0))
				continue
			var kd := Vector2(float(x) - knob_cx, float(y) - knob_cy).length()
			if kd <= 6.2:
				img.set_pixel(x, y, Color(1, 0.97, 0.85) if (on and y < 8) else knob_col)
			elif d >= r - 1.35:
				img.set_pixel(x, y, track_edge)
			else:
				img.set_pixel(x, y, track_bg)
	var t := ImageTexture.create_from_image(img)
	_tex_cache[k] = t
	return t

## Apply AAA forged-steel styling to any HSlider
static func slider_style(s: HSlider) -> void:
	s.focus_mode = Control.FOCUS_NONE
	var track := StyleBoxFlat.new()
	track.bg_color = Color("080f14")
	track.border_color = Color("263a46")
	track.set_border_width_all(1)
	track.set_corner_radius_all(3)
	track.content_margin_top = 3; track.content_margin_bottom = 3
	var fill := StyleBoxFlat.new()
	fill.bg_color = Color("b88e2e")
	fill.border_color = Color("e8bf54")
	fill.border_width_top = 1
	fill.set_corner_radius_all(3)
	fill.content_margin_top = 3; fill.content_margin_bottom = 3
	var fill_hi := StyleBoxFlat.new()
	fill_hi.bg_color = GOLD_HI
	fill_hi.border_color = Color(1.0, 0.95, 0.78)
	fill_hi.border_width_top = 1
	fill_hi.set_corner_radius_all(3)
	fill_hi.content_margin_top = 3; fill_hi.content_margin_bottom = 3
	s.add_theme_stylebox_override("slider", track)
	s.add_theme_stylebox_override("grabber_area", fill)
	s.add_theme_stylebox_override("grabber_area_highlight", fill_hi)
	s.add_theme_icon_override("grabber", _slider_grabber_tex(false))
	s.add_theme_icon_override("grabber_highlight", _slider_grabber_tex(true))
	s.add_theme_icon_override("grabber_disabled", _slider_grabber_tex(false))

## Apply AAA tactical toggle-row styling to any CheckButton
static func check_style(c: CheckButton) -> void:
	c.focus_mode = Control.FOCUS_NONE
	c.add_theme_font_override("font", font("mono"))
	c.add_theme_font_size_override("font_size", 13)
	c.add_theme_color_override("font_color", TEXT)
	c.add_theme_color_override("font_hover_color", Color(1, 1, 1))
	c.add_theme_color_override("font_pressed_color", GOLD_HI)
	c.add_theme_color_override("font_hover_pressed_color", Color(1.0, 0.96, 0.80))
	var n := box(Color(0.06, 0.095, 0.12, 0.72), Color("22333e"), 1, 10, 6)
	n.shadow_size = 0
	var hv := box(Color(0.10, 0.16, 0.20, 0.92), Color("446070"), 1, 10, 6)
	hv.shadow_size = 0
	var pr := box(Color(0.16, 0.14, 0.08, 0.85), GOLD_DIM, 1, 10, 6)
	pr.shadow_size = 0
	c.add_theme_stylebox_override("normal", n)
	c.add_theme_stylebox_override("hover", hv)
	c.add_theme_stylebox_override("pressed", pr)
	c.add_theme_stylebox_override("hover_pressed", hv)
	c.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var on_t := _check_tex(true)
	var off_t := _check_tex(false)
	c.add_theme_icon_override("checked", on_t)
	c.add_theme_icon_override("unchecked", off_t)
	c.add_theme_icon_override("checked_disabled", on_t)
	c.add_theme_icon_override("unchecked_disabled", off_t)

static func hsep() -> Control:
	var c := ColorRect.new()
	c.color = Color(CYAN.r, CYAN.g, CYAN.b, 0.42)
	c.custom_minimum_size = Vector2(0, 1)
	return c

static func spacer(h: float = 8.0, w: float = 0.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	return c

static func fmt_time(t: float) -> String:
	return "%d:%02d" % [int(t / 60.0), int(t) % 60]

static func fmt_when(unix: float) -> String:
	var d := Time.get_datetime_dict_from_unix_time(int(unix))
	return "%04d-%02d-%02d %02d:%02d" % [d.year, d.month, d.day, d.hour, d.minute]
