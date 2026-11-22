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
const PLATE_HI := Color("1b2832")
const PANEL := Color(0.043, 0.066, 0.082, 0.93)
const EDGE := Color("2f4450")
const BLUE := Color(0.36, 0.62, 0.9)
const RED := Color(0.95, 0.3, 0.25)
const GREEN := Color(0.35, 0.9, 0.45)

static var _fonts := {}
## "display" (Saira Condensed SemiBold, wide tracking), "bold" (Saira Condensed Bold), "mono" (IBM Plex Mono)
static func font(kind: String = "display") -> Font:
	if _fonts.has(kind): return _fonts[kind]
	var file: String = {"display": "res://ui/SairaCondensed-SemiBold.ttf", "bold": "res://ui/SairaCondensed-Bold.ttf", "mono": "res://ui/IBMPlexMono-Regular.ttf", "tight": "res://ui/SairaCondensed-SemiBold.ttf"}[kind]
	var f: Font = null
	if ResourceLoader.exists(file): f = load(file)
	if f != null and kind != "mono" and kind != "tight":
		var fv := FontVariation.new()
		fv.base_font = f
		fv.spacing_glyph = 2
		f = fv
	if f == null: f = ThemeDB.fallback_font
	_fonts[kind] = f
	return f

# the 22 playable nations in the picker's order (CLAUDE.md "Factions"); the picker shows the ones data/rules.json has
const PLAYABLE := ["IR", "RS", "DW", "RV", "OB", "US", "GB", "FR", "DE", "IL", "UA", "RU", "CN", "KP", "IN", "JP", "KR", "PK", "SA", "AE", "TR", "EG"]
const BLOCS := [["Shia and allies", ["IR", "RS", "DW", "RV", "OB"]], ["West", ["US", "GB", "FR", "DE", "IL", "UA"]], ["East", ["RU", "CN", "KP"]], ["Asia", ["IN", "JP", "KR", "PK"]], ["Regional", ["SA", "AE", "TR", "EG"]]]
const NAT_FALLBACK := {"IR": "Iran", "RS": "Lebanese Shia", "DW": "Zaidi Shia Movement", "RV": "Iraqi Shia Brigades", "OB": "Palestine Islamic Brigade",
	"US": "United States", "GB": "United Kingdom", "FR": "France", "DE": "Germany", "IL": "Israel", "UA": "Ukraine", "RU": "Russia", "CN": "China",
	"KP": "North Korea", "IN": "India", "JP": "Japan", "KR": "South Korea", "PK": "Pakistan", "SA": "Saudi Arabia", "AE": "UAE", "TR": "Turkey", "EG": "Egypt"}
const MORALE_NAME := {"zeal": "Zealous - never routs", "prof": "Professional", "home": "Home defenders", "fire": "Firepower-reliant"}
const SEAT_COL := [Color(0.35, 0.9, 0.45), Color(0.95, 0.3, 0.25), Color(0.4, 0.7, 1.0), Color(0.95, 0.8, 0.3), Color(0.85, 0.45, 0.95), Color(0.3, 0.9, 0.9), Color(1.0, 0.6, 0.25), Color(0.85, 0.85, 0.85)]

# ---------------------------------------------------------------- launch slot (menu -> Battle scene)
## {kind = "battle"|"mission"|"tutorial"|"load"|"replay"|"online", map, players:[{fac, ai, tm, diff}], seed, diff, mission, file, code, name}
static var launch: Dictionary = {}

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

## mouse stays inside the window on PC during a battle (Esc releases it); browsers only allow full capture, so there
## the game keeps the normal cursor
static func lock_mouse(on: bool) -> void:
	if DisplayServer.get_name() == "headless": return
	if on and bool(opt("mouse_lock")) and not OS.has_feature("web"): Input.mouse_mode = Input.MOUSE_MODE_CONFINED
	else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

# ---------------------------------------------------------------- data (nations + maps come from godot/data, lane P3 exports them)
static var _rules: Dictionary = {}
static func rules() -> Dictionary:
	if _rules.is_empty():
		var f := FileAccess.open("res://data/rules.json", FileAccess.READ)
		if f != null: _rules = JSON.parse_string(f.get_as_text())
	return _rules

static func nations() -> Array:
	var F: Dictionary = rules().get("factions", {})
	var out: Array = []
	for k in PLAYABLE:
		if F.has(k): out.append(k)
	return out

static func nat_name(k: String) -> String:
	var F: Dictionary = rules().get("factions", {})
	if F.has(k): return str(F[k].get("name", NAT_FALLBACK.get(k, k)))
	return str(NAT_FALLBACK.get(k, k))

## every map in res://data (map_<key>.json): [{key, name, n (most players), w, h}], Battle maps first
static var _maps: Array = []
static func maps() -> Array:
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
		_maps.append({key = key, name = str(m.get("name", key)), n = int(m.bases.size()), w = float(m.MAPW), h = float(m.MAPH), file = "res://data/" + f})
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
## plate: dark steel, 1 px line, coloured bar on the left, cut top-right corner (the browser game's .zb / .mxi plates)
static func box(bg: Color, edge: Color, bw: int = 1, pad: int = 10, cut: int = 0, bar: Color = Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg; sb.border_color = edge
	sb.set_border_width_all(bw)
	if cut > 0: sb.corner_radius_top_right = cut; sb.corner_detail = 1
	sb.anti_aliasing = cut > 0
	sb.content_margin_left = pad; sb.content_margin_right = pad; sb.content_margin_top = pad * 0.45; sb.content_margin_bottom = pad * 0.45
	if bar.a > 0:
		sb.border_width_left = 3; sb.border_color = bar
		sb.border_blend = false
	return sb

static func panel_style(pad: int = 14) -> StyleBoxFlat:
	var sb := box(PANEL, EDGE, 1, pad, 10)
	sb.content_margin_top = pad * 0.7; sb.content_margin_bottom = pad * 0.7
	sb.shadow_color = Color(0, 0, 0, 0.4); sb.shadow_size = 8
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
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	return l

const PLATE_EDGE := Color("26343d")
static func _plate(b: Button, size: int, primary: bool) -> void:
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_override("font", font("display"))
	b.add_theme_font_size_override("font_size", size)
	var pad := int(size * 0.8)
	if primary:
		for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]: b.add_theme_color_override(c, Color("14110a"))
		b.add_theme_color_override("font_disabled_color", Color(0.3, 0.3, 0.3))
		b.add_theme_stylebox_override("normal", box(GOLD, GOLD_HI, 1, pad * 2, 10))
		b.add_theme_stylebox_override("hover", box(GOLD_HI, Color(1, 0.95, 0.75), 1, pad * 2, 10))
		b.add_theme_stylebox_override("pressed", box(GOLD_DIM, GOLD, 1, pad * 2, 10))
		b.add_theme_stylebox_override("disabled", box(Color(0.3, 0.27, 0.18), Color(0.3, 0.3, 0.3), 1, pad * 2, 10))
	else:
		b.add_theme_color_override("font_color", TEXT)
		b.add_theme_color_override("font_hover_color", Color(1, 1, 1))
		b.add_theme_color_override("font_pressed_color", GOLD_HI)
		b.add_theme_color_override("font_disabled_color", Color(0.4, 0.45, 0.45))
		b.add_theme_stylebox_override("normal", box(PLATE, PLATE_EDGE, 1, pad + 3, 9))
		b.add_theme_stylebox_override("hover", box(PLATE_HI, Color("4a5a62"), 1, pad + 3, 9))
		b.add_theme_stylebox_override("pressed", box(Color("2a2412"), GOLD, 1, pad + 3, 9))
		b.add_theme_stylebox_override("disabled", box(Color("0c1217"), Color("1c262d"), 1, pad + 3, 9))
		# the coloured bar on the left edge: cyan, gold under the mouse
		var bar := ColorRect.new()
		bar.name = "Bar"
		bar.color = CYAN
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.anchor_bottom = 1.0
		bar.offset_right = 3
		b.add_child(bar)
		b.mouse_entered.connect(func(): bar.color = GOLD if not b.disabled else Color("24323b"))
		b.mouse_exited.connect(func(): bar.color = CYAN if not b.disabled else Color("24323b"))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

## small plate button; primary = the gold one ("Start battle")
static func button(txt: String, on: Callable = Callable(), size: int = 15, min_w: float = 0.0, primary: bool = false) -> Button:
	var b := Button.new()
	b.text = txt.to_upper()
	_plate(b, size, primary)
	if min_w > 0: b.custom_minimum_size.x = min_w
	if on.is_valid(): b.pressed.connect(on)
	return b

## toggle plate (difficulty, tabs): gold when on
static func toggle(txt: String, grp: ButtonGroup, on_now: bool, on: Callable, size: int = 15) -> Button:
	var b := button(txt, Callable(), size)
	b.toggle_mode = true
	b.button_group = grp
	b.button_pressed = on_now
	var sel := box(Color("3a3113"), GOLD, 1, int(size * 0.8) + 3, 9)
	b.add_theme_color_override("font_hover_pressed_color", GOLD_HI)
	b.add_theme_stylebox_override("pressed", sel)
	b.add_theme_stylebox_override("hover_pressed", sel)
	b.pressed.connect(on)
	return b

## title-screen menu item: a wide plate, big uppercase text on the left; `sub` = one mono line under the name
static func menu_item(txt: String, on: Callable, size: int = 22, sub: String = "", width: float = 480.0) -> Button:
	var b := Button.new()
	b.name = "Item_" + txt.replace(" ", "_")
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	_plate(b, size, false)
	b.custom_minimum_size = Vector2(width, size * 2.1)
	if sub == "":
		b.text = txt.to_upper()
	else:
		# name + one mono line under it: two labels inside the plate
		b.custom_minimum_size.y = size * 1.7 + 30.0
		var l1 := label(txt.to_upper(), size, TEXT, "display")
		l1.name = "T"
		l1.mouse_filter = Control.MOUSE_FILTER_IGNORE
		l1.position = Vector2(size * 0.8 + 3, 5)
		b.add_child(l1)
		var l2 := label(sub, 12, GOLD, "mono")
		l2.mouse_filter = Control.MOUSE_FILTER_IGNORE
		l2.position = Vector2(size * 0.8 + 3, size * 1.5 + 6)
		l2.size = Vector2(width - size * 0.8 - 14, 18)
		l2.clip_text = true
		b.add_child(l2)
		b.mouse_entered.connect(func(): l1.add_theme_color_override("font_color", Color(1, 1, 1)))
		b.mouse_exited.connect(func(): l1.add_theme_color_override("font_color", TEXT))
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
	o.add_theme_stylebox_override("normal", box(Color("0b1116"), Color("3a4a52"), 1, 12))
	o.add_theme_stylebox_override("hover", box(Color("121b22"), TEXT_DIM, 1, 12))
	o.add_theme_stylebox_override("pressed", box(Color("121b22"), GOLD, 1, 12))
	o.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var pm := o.get_popup()
	pm.add_theme_font_override("font", font("tight"))
	pm.add_theme_font_size_override("font_size", 15)
	pm.add_theme_stylebox_override("panel", box(Color("0b1116"), Color("3a4a52"), 1, 6))
	pm.add_theme_stylebox_override("hover", box(Color("2a2412"), GOLD, 0, 6))
	o.item_selected.connect(on)
	return o

static func hsep() -> Control:
	var c := ColorRect.new()
	c.color = Color(CYAN.r, CYAN.g, CYAN.b, 0.35)
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
