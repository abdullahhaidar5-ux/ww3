## MAIN MENU (lane P6) - the browser game's menu v3 (src/14-menu.js) in Godot: one job per screen, the screens slide
## in the right-hand column over the world picture, Back / Esc = one step back.
##   title:  Continue (only with a save) · Play · Multiplayer · Test range · Settings · Extras · Credits
##   Play:   Battle (map -> nation -> players -> options) · Missions · Tutorial · Load game
##   godot --path godot                         the menu
##   godot --path godot -- --menu=c-players --shot=x.png     open one screen and take a picture (side-by-side shots)
extends Control

const UI = preload("res://scripts/ui/ui_kit.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const COL_X := 1026.0 / 1536.0     # the column starts at 1026 of 1536, like the browser menu
const TITLES := {"title": "", "single": "Play", "c-map": "Battle", "c-nation": "Battle", "c-players": "Battle", "c-opts": "Battle", "online": "Multiplayer",
	"t-range": "Test range", "settings": "Settings", "extras": "Extras", "credits": "Credits", "load": "Load game", "missions": "Missions", "brief": "Missions",
	"replays": "Extras", "battles": "Extras", "ency": "Extras", "medals": "Extras", "controls": "Settings"}
const STEPS := [["c-map", "Map"], ["c-nation", "Nation"], ["c-players", "Players"], ["c-opts", "Options"]]
const DIFFS := ["Easy", "Medium", "Hard", "Brutal"]
const AI_STYLE := ["Balanced", "Rusher", "Turtle", "Air power"]
const WX := ["Clear day", "Low sun", "Dusk", "Night", "Rain", "Sandstorm"]
const SEASON := ["Dry", "Mud", "Snow"]

var stack: Array = ["title"]
var cur := "title"
var col: Control            # the right-hand column
var body: Control           # current screen
var foot: HBoxContainer
var crumb: HBoxContainer
var back_btn: Button
var busy := false
var shot_path := ""
var shot_n := 0
var arg := ""               # extra argument for a screen (mission id, encyclopedia nation)

# Battle setup (what "Start battle" launches)
var st := {map = "", fac = "IR", enemy = "US", n_ai = 1, diff = 1, seats = [], wx = 0, season = 0}
var tr := {map = "", fac = "IR", target = "US"}
var set_tab := "Sound"
var nat_q := ""

func _ready() -> void:
	UI.apply_settings()
	UI.lock_mouse(false)
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var nats := UI.nations()
	st.fac = str(UI.opt("last_fac")); st.enemy = str(UI.opt("last_enemy")); st.map = str(UI.opt("last_map")); st.diff = int(UI.opt("last_diff"))
	if not nats.has(st.fac) and nats.size(): st.fac = nats[0]
	if not nats.has(st.enemy) and nats.size(): st.enemy = nats[mini(1, nats.size() - 1)]
	if UI.map_info(st.map).is_empty() and UI.maps().size(): st.map = UI.maps()[0].key
	tr.fac = st.fac; tr.target = st.enemy; tr.map = st.map
	_seats_sync()
	_chrome()
	var start := "title" if UI.menu_start == "" else UI.menu_start
	UI.menu_start = ""
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--menu="): start = a.substr(7)
		elif a.begins_with("--shot="): shot_path = a.substr(7)
		elif a.begins_with("--arg="): arg = a.substr(6)
	if start == "c-map": stack = ["title", "single", start]; cur = start
	elif start != "title": stack = ["title", start]; cur = start
	_show(cur, 0)

# ---------------------------------------------------------------- frame: picture, column, breadcrumb, Back, footer
func _chrome() -> void:
	var bg := ColorRect.new()
	bg.color = UI.BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	if ResourceLoader.exists("res://ui/menu-world.webp"):
		var pic := TextureRect.new()
		pic.texture = load("res://ui/menu-world.webp")
		pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		pic.anchor_right = 1.0; pic.anchor_bottom = 1.0
		pic.clip_contents = true
		add_child(pic)
	var shade := ColorRect.new()
	shade.color = Color(0.02, 0.03, 0.04, 0.985)
	shade.anchor_left = 998.0 / 1536.0; shade.anchor_right = 1.0; shade.anchor_bottom = 1.0
	add_child(shade)
	var line := ColorRect.new()
	line.color = Color(UI.CYAN.r, UI.CYAN.g, UI.CYAN.b, 0.55)
	line.anchor_left = 998.0 / 1536.0; line.anchor_right = 998.0 / 1536.0; line.anchor_bottom = 1.0
	line.offset_right = 2
	add_child(line)
	col = Control.new()
	col.anchor_left = COL_X; col.anchor_right = 1.0; col.anchor_bottom = 1.0
	col.offset_right = -28; col.offset_top = 0
	col.clip_contents = true
	add_child(col)
	crumb = HBoxContainer.new()
	crumb.position = Vector2(0, 20)
	crumb.add_theme_constant_override("separation", 10)
	col.add_child(crumb)
	foot = HBoxContainer.new()
	foot.anchor_left = 0.0; foot.anchor_right = 1.0; foot.anchor_top = 1.0; foot.anchor_bottom = 1.0
	foot.offset_top = -80; foot.offset_bottom = -24; foot.offset_right = -28
	foot.alignment = BoxContainer.ALIGNMENT_END
	foot.add_theme_constant_override("separation", 18)
	add_child(foot)
	back_btn = UI.button("‹ Back", back, 18)
	back_btn.name = "Back"
	back_btn.anchor_top = 1.0; back_btn.anchor_bottom = 1.0
	back_btn.offset_left = 46; back_btn.offset_top = -82; back_btn.offset_right = 158; back_btn.offset_bottom = -34
	add_child(back_btn)
	var ver := UI.label("WORLD WAR 3", 12, Color("5d6b64"))
	ver.name = "Ver"
	ver.anchor_left = 1.0; ver.anchor_right = 1.0; ver.anchor_top = 1.0; ver.anchor_bottom = 1.0
	ver.offset_left = -108; ver.offset_top = -28
	add_child(ver)

func go(id: String, a: String = "") -> void:
	if busy: return
	arg = a
	stack.append(id)
	_show(id, 1)

func back() -> void:
	if busy or stack.size() <= 1: return
	stack.pop_back()
	_show(stack.back(), -1)

func _input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_ESCAPE:
		back()
		get_viewport().set_input_as_handled()

## slide the old screen out and the new one in (28 px, 0.2 s, like .ms / .ms.on)
func _show(id: String, dir: int) -> void:
	cur = id
	var old := body
	body = Control.new()
	body.name = "Screen_" + id
	body.anchor_right = 1.0; body.anchor_bottom = 1.0
	body.offset_top = 52.0
	col.add_child(body)
	for c in foot.get_children(): c.queue_free()
	_crumb()
	back_btn.visible = id != "title"
	get_node("Ver").visible = id == "title"
	var vb := VBoxContainer.new()
	vb.name = "V"
	vb.anchor_right = 1.0; vb.anchor_bottom = 1.0
	vb.add_theme_constant_override("separation", 8)
	body.add_child(vb)
	call("_s_" + id.replace("-", "_"), vb)
	if dir == 0 or DisplayServer.get_name() == "headless" or shot_path != "":
		if old: old.queue_free()
		return
	busy = true
	body.modulate.a = 0.0
	body.position.x = 28.0 * dir
	var tw := create_tween().set_parallel(true).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
	tw.tween_property(body, "modulate:a", 1.0, 0.2)
	tw.tween_property(body, "position:x", 0.0, 0.2)
	if old:
		tw.tween_property(old, "modulate:a", 0.0, 0.16)
		tw.tween_property(old, "position:x", -28.0 * dir, 0.16)
	tw.chain().tween_callback(func():
		if old: old.queue_free()
		busy = false)

func _crumb() -> void:
	for c in crumb.get_children(): c.queue_free()
	var tname: String = TITLES.get(cur, "")
	if tname == "": return
	crumb.add_child(UI.label(tname.to_upper(), 15, UI.CYAN, "display"))
	var is_step := STEPS.any(func(s): return s[0] == cur)
	if not is_step: return
	for i in STEPS.size():
		crumb.add_child(UI.label("›", 15, Color(1, 1, 1, 0.25), "display"))
		var s: Array = STEPS[i]
		var b := Button.new()
		b.text = "%d %s" % [i + 1, str(s[1]).to_upper()]
		b.flat = true; b.focus_mode = Control.FOCUS_NONE
		b.add_theme_font_override("font", UI.font("display"))
		b.add_theme_font_size_override("font_size", 15)
		b.add_theme_color_override("font_color", UI.GOLD if s[0] == cur else UI.TEXT_DIM)
		b.add_theme_color_override("font_hover_color", UI.TEXT)
		for stn in ["normal", "hover", "pressed", "focus"]: b.add_theme_stylebox_override(stn, StyleBoxEmpty.new())
		var sid: String = s[0]
		b.pressed.connect(func():
			if sid == cur: return
			# jump inside the Battle steps without growing the stack
			while stack.size() > 1 and STEPS.any(func(x): return x[0] == stack.back()): stack.pop_back()
			for k in STEPS:
				stack.append(k[0])
				if k[0] == sid: break
			_show(sid, 1))
		crumb.add_child(b)

func _head(vb: VBoxContainer, h: String, sub: String = "") -> void:
	vb.add_child(UI.title(h, 34))
	vb.add_child(UI.hsep())
	if sub != "":
		vb.add_child(UI.spacer(2))
		vb.add_child(UI.para(sub))
	vb.add_child(UI.spacer(6))

func _foot(items: Array) -> void:
	for it in items: foot.add_child(it)

func _row(vb: Container, lab: String, ctl: Control) -> HBoxContainer:
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 8)
	var l := UI.label(lab.to_upper(), 12, UI.TEXT_DIM)
	l.custom_minimum_size.x = 126
	hb.add_child(l)
	if ctl != null: hb.add_child(ctl)
	vb.add_child(hb)
	return hb

func _scroll(vb: VBoxContainer, bottom_gap: float = 96.0) -> VBoxContainer:
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	vb.add_child(sc)
	var inner := VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 6)
	sc.add_child(inner)
	vb.add_child(UI.spacer(bottom_gap))
	return inner

# ---------------------------------------------------------------- title
func _s_title(vb: VBoxContainer) -> void:
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 9)
	var logo := HBoxContainer.new()
	logo.add_theme_constant_override("separation", 12)
	var l1 := UI.label("WORLD WAR", 86, UI.TEXT, "bold")
	var l2 := UI.label("3", 86, UI.GOLD_HI, "bold")
	for l in [l1, l2]:
		l.add_theme_constant_override("shadow_offset_y", 6)
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.7))
		l.add_theme_constant_override("line_spacing", -30)
		logo.add_child(l)
	var lw := Control.new()
	lw.custom_minimum_size = Vector2(480, 86)
	logo.position = Vector2(0, -34)
	lw.add_child(logo)
	vb.add_child(lw)
	vb.add_child(UI.para("Real-time modern warfare: build your base, hold your supply lines, win the battle."))
	vb.add_child(UI.spacer(4))
	vb.add_child(UI.hsep())
	vb.add_child(UI.spacer(8))
	var saves := UI.list_files("saves")
	if saves.size():
		var s: Dictionary = saves[0]
		var c := UI.menu_item("Continue", func(): _launch({kind = "load", file = s.path}), 22, "%s · %s · %s" % [UI.nat_name(s.fac), s.name, UI.fmt_time(s.t)])
		c.tooltip_text = "Pick up where you left off: your latest Battle"
		vb.add_child(c)
	for it in [["Play", "single", "Battle against the computer, missions and the tutorial"], ["Multiplayer", "online", "Play online with friends: start or join a Battle"], ["Test range", "t-range", "Pick your nation and a target nation, then try any unit with unlimited money"]]:
		var b := UI.menu_item(it[0], go.bind(it[1]), 22)
		b.tooltip_text = it[2]
		vb.add_child(b)
	vb.add_child(UI.spacer(10))
	for it in [["Settings", "settings", "Graphics, sound and mouse"], ["Extras", "extras", "Replays, encyclopedia, medals and more"], ["Credits", "credits", ""]]:
		var b := UI.menu_item(it[0], go.bind(it[1]), 17)
		b.tooltip_text = it[2]
		vb.add_child(b)
	vb.add_child(UI.spacer(40))

# ---------------------------------------------------------------- Play
func _s_single(vb: VBoxContainer) -> void:
	_head(vb, "Play", "Battle against the computer, the story missions, or learn the game.")
	vb.add_child(UI.menu_item("Battle", go.bind("c-map"), 22, "Command Center, supply trucks and supply lines, tech up, destroy every enemy building"))
	vb.add_child(UI.spacer(10))
	vb.add_child(UI.menu_item("Missions", go.bind("missions"), 17, "The story missions"))
	vb.add_child(UI.menu_item("Tutorial", func(): _launch({kind = "tutorial"}), 17, "First time? A guided 10-minute Battle, supply lines included"))
	vb.add_child(UI.menu_item("Load game", go.bind("load"), 17, "Load a saved battle"))

# ---------------------------------------------------------------- Battle 1: map
func _map_thumb(m: Dictionary, w: float) -> TextureRect:
	var t := TextureRect.new()
	t.custom_minimum_size = Vector2(w, w * 22.0 / 32.0)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_SCALE
	t.texture = Missions.map_thumb(str(m.file), 160)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

func _s_c_map(vb: VBoxContainer) -> void:
	_head(vb, "Choose a Battle map", "A Command Center, a dozer and supply trucks - build your base and keep your supply lines open. Battle maps first, then every other battlefield; every map has at least two attack routes.")
	var inner := _scroll(vb)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	inner.add_child(grid)
	for m in UI.maps():
		var b := Button.new()
		b.name = "Map_" + str(m.key)
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(228, 228)
		var on: bool = st.map == m.key
		b.add_theme_stylebox_override("normal", UI.box(Color("2a2412") if on else Color(0.055, 0.075, 0.067, 0.8), UI.GOLD if on else UI.LINE, 1, 0))
		b.add_theme_stylebox_override("hover", UI.box(Color(0.08, 0.1, 0.1, 0.9), UI.TEXT, 1, 0))
		b.add_theme_stylebox_override("pressed", UI.box(Color("2a2412"), UI.GOLD, 1, 0))
		var v := VBoxContainer.new()
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.position = Vector2(1, 1)
		v.add_theme_constant_override("separation", 0)
		b.add_child(v)
		v.add_child(_map_thumb(m, 226))
		var mc := MarginContainer.new()
		mc.add_theme_constant_override("margin_left", 12); mc.add_theme_constant_override("margin_top", 6)
		mc.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var tv := VBoxContainer.new()
		tv.add_theme_constant_override("separation", 0)
		tv.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tv.add_child(UI.label(str(m.name).to_upper(), 20, UI.TEXT, "bold"))
		tv.add_child(UI.label("%d players · %s" % [m.n, "large" if m.w > 6000 else ("medium" if m.w > 4000 else "small")], 12, UI.GOLD))
		mc.add_child(tv); v.add_child(mc)
		var key: String = m.key
		b.pressed.connect(func(): st.map = key; UI.set_opt("last_map", key); _seats_sync(); go("c-nation"))
		grid.add_child(b)
	_foot([UI.button("Random map", func():
		var ms := UI.maps()
		st.map = ms[randi() % ms.size()].key; _seats_sync(); go("c-nation"), 16), UI.button("Next: Nation →", go.bind("c-nation"), 18, 0, true)])

# ---------------------------------------------------------------- Battle 2: nation
func _nat_tile(k: String, on: bool, cb: Callable, hover: Callable = Callable()) -> Button:
	var b := Button.new()
	b.name = "Nat_" + k
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(234, 46)
	b.clip_text = true
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.text = "          " + UI.nat_name(k).to_upper()
	b.add_theme_font_override("font", UI.font("display"))
	b.add_theme_font_size_override("font_size", 17)
	b.add_theme_color_override("font_color", UI.GOLD_HI if on else UI.TEXT)
	b.add_theme_color_override("font_hover_color", Color(1, 1, 1))
	var n := UI.box(Color("3a3113") if on else UI.PLATE, UI.GOLD if on else UI.CYAN, 1, 8, 9, UI.GOLD if on else UI.CYAN)
	n.border_width_top = 1; n.border_width_right = 1; n.border_width_bottom = 1
	if not on: n.border_color = Color("2b3c46")
	var h := UI.box(UI.PLATE_HI, UI.GOLD, 1, 8, 9, UI.GOLD)
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", h)
	b.add_theme_stylebox_override("pressed", h)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var fl := Missions.flag(k)
	fl.position = Vector2(9, 5)
	b.add_child(fl)
	b.pressed.connect(cb)
	if hover.is_valid(): b.mouse_entered.connect(hover)
	return b

func _nat_detail(k: String) -> String:
	var F: Dictionary = UI.rules().get("factions", {}).get(k, {})
	if F.is_empty(): return ""
	var d: Dictionary = F.get("doct", {})
	var out := "%s · morale: %s\n" % [str(d.get("name", "")), str(UI.MORALE_NAME.get(str(F.get("morale", "")), "")).split(" - ")[0]]
	var sp = F.get("special")
	if sp != null and F.units.has(sp): out += "Special: %s\n" % str(F.units[sp].name)
	if F.get("sup") != null: out += "Strike: %s\n" % str(F.sup.name)
	if F.get("natpow") != null: out += "Power: %s - %s\n" % [str(F.natpow.name), str(F.natpow.get("desc", ""))]
	var perks: Array = []
	if bool(F.get("tunnels", false)): perks.append("tunnels")
	if bool(F.get("noAir", false)): perks.append("no air force")
	if bool(F.get("noShip", false)): perks.append("no navy")
	if perks.size(): out += "Traits: " + ", ".join(perks)
	return out

func _nat_picker(vb: VBoxContainer, cur_fac: String, cb: Callable) -> void:
	var find := LineEdit.new()
	find.name = "Find"
	find.placeholder_text = "Find a nation…"
	find.text = nat_q
	find.add_theme_font_override("font", UI.font("mono"))
	find.add_theme_font_size_override("font_size", 13)
	find.add_theme_stylebox_override("normal", UI.box(Color("0b1116"), Color("2b3c46"), 1, 10))
	find.add_theme_stylebox_override("focus", UI.box(Color("0b1116"), UI.GOLD, 1, 10))
	vb.add_child(find)
	var det := UI.para(_nat_detail(cur_fac), 12, UI.TEXT_DIM)
	var det_h := UI.label(UI.nat_name(cur_fac).to_upper(), 24, UI.TEXT, "bold")
	var inner := _scroll(vb, 8)
	var grid := GridContainer.new()
	grid.name = "Nations"
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 10); grid.add_theme_constant_override("v_separation", 8)
	inner.add_child(grid)
	var fill := func(q: String):
		for c in grid.get_children(): c.queue_free()
		for k in UI.nations():
			if q != "" and UI.nat_name(k).to_lower().find(q.to_lower()) < 0 and str(k).to_lower() != q.to_lower(): continue
			var kk: String = k
			grid.add_child(_nat_tile(kk, kk == cur_fac, func(): cb.call(kk), func(): det_h.text = UI.nat_name(kk).to_upper(); det.text = _nat_detail(kk)))
	fill.call(nat_q)
	find.text_changed.connect(func(q): nat_q = q; fill.call(q))
	var dp := UI.panel(12)
	dp.name = "Detail"
	var dv := VBoxContainer.new()
	dv.add_child(det_h); dv.add_child(det)
	dp.add_child(dv)
	dp.custom_minimum_size.y = 150
	vb.add_child(dp)
	vb.add_child(UI.spacer(88))

func _s_c_nation(vb: VBoxContainer) -> void:
	_head(vb, "Choose your nation", "Hover a nation to see its morale style and strike. Click to choose.")
	_nat_picker(vb, st.fac, func(k):
		st.fac = k; UI.set_opt("last_fac", k)
		if st.enemy == k:
			for o in UI.nations():
				if o != k: st.enemy = o; break
		_seats_sync(); go("c-players"))
	_foot([UI.button("Next: Players →", go.bind("c-players"), 18, 0, true)])

# ---------------------------------------------------------------- Battle 3: players
func _max_ai() -> int:
	return clampi(int(UI.map_info(st.map).get("n", 2)) - 1, 1, 7)

## seats = you + n_ai computers; keeps what the player already chose
func _seats_sync() -> void:
	st.n_ai = clampi(int(st.n_ai), 1, _max_ai())
	var nats := UI.nations()
	var seats: Array = st.seats
	if seats.is_empty(): seats.append({fac = st.fac, ai = false, tm = 1, start = -1, style = 0})
	seats[0].fac = st.fac
	while seats.size() < st.n_ai + 1:
		var i := seats.size()
		var f: String = st.enemy
		if i > 1 and nats.size(): f = nats[(nats.find(st.enemy) + i - 1) % nats.size()]
		seats.append({fac = f, ai = true, tm = i + 1, start = -1, style = 0})
	while seats.size() > st.n_ai + 1: seats.pop_back()
	if seats.size() > 1: seats[1].fac = st.enemy
	st.seats = seats

func _s_c_players(vb: VBoxContainer) -> void:
	_seats_sync()
	_head(vb, "Players", "You against the computer. Change teams to play co-op or free-for-all; pick where each side starts on the map.")
	var nats := UI.nations()
	var names := nats.map(func(k): return UI.nat_name(k))
	_row(vb, "Main opponent", UI.dropdown(names, nats.find(st.enemy), func(i): st.enemy = nats[i]; UI.set_opt("last_enemy", nats[i]); _seats_sync(); _show(cur, 0), 180))
	var hb := _row(vb, "Computers · %d" % st.n_ai, null)
	var add := UI.button("+ Add computer", func(): st.n_ai += 1; _seats_sync(); _show(cur, 0), 13)
	add.name = "AddAI"; add.disabled = st.n_ai >= _max_ai()
	var rem := UI.button("− Remove", func(): st.n_ai -= 1; _seats_sync(); _show(cur, 0), 13)
	rem.name = "RemAI"; rem.disabled = st.n_ai <= 1
	hb.add_child(add); hb.add_child(rem)
	var grp := ButtonGroup.new()
	var dh := _row(vb, "Difficulty", null)
	for i in DIFFS.size():
		var di: int = i
		var tb := UI.toggle(DIFFS[i], grp, st.diff == i, func(): st.diff = di; UI.set_opt("last_diff", di), 15)
		tb.name = "Diff_" + DIFFS[i]
		dh.add_child(tb)
	vb.add_child(UI.spacer(2))
	var inner := _scroll(vb, 90)
	var nb: int = int(UI.map_info(st.map).get("n", 2))
	var team_names: Array = []
	for i in 8: team_names.append("Team %d" % (i + 1))
	var starts: Array = ["Random"]
	for i in nb: starts.append("Start %d" % (i + 1))
	for i in st.seats.size():
		var s: Dictionary = st.seats[i]
		var p := PanelContainer.new()
		var psb := UI.box(Color(0.055, 0.085, 0.105, 0.9), Color("2b3c46"), 1, 10, 9, UI.SEAT_COL[i])
		psb.border_width_top = 1; psb.border_width_right = 1; psb.border_width_bottom = 1
		p.add_theme_stylebox_override("panel", psb)
		var pv := VBoxContainer.new()
		p.add_child(pv)
		pv.add_child(UI.label(("YOU · " if i == 0 else "AI %d · " % i) + UI.nat_name(s.fac).to_upper(), 17, UI.TEXT, "display"))
		var r := HBoxContainer.new()
		r.add_theme_constant_override("separation", 6)
		pv.add_child(r)
		if i > 0:
			r.add_child(UI.dropdown(names, nats.find(s.fac), func(k):
				s.fac = nats[k]
				if i == 1: st.enemy = nats[k]
				_show(cur, 0), 132))
			r.add_child(UI.dropdown(AI_STYLE, int(s.style), func(k): s.style = k, 100))
		r.add_child(UI.dropdown(team_names, int(s.tm) - 1, func(k): s.tm = k + 1, 90))
		r.add_child(UI.dropdown(starts, int(s.start) + 1, func(k): s.start = k - 1, 92))
		inner.add_child(p)
	var q := HBoxContainer.new()
	q.add_theme_constant_override("separation", 8)
	q.add_child(UI.button("Me vs all", func():
		for i in st.seats.size(): st.seats[i].tm = 1 if i == 0 else 2
		_show(cur, 0), 13))
	q.add_child(UI.button("Free for all", func():
		for i in st.seats.size(): st.seats[i].tm = i + 1
		_show(cur, 0), 13))
	if st.seats.size() >= 4:
		q.add_child(UI.button("Teams of two", func():
			for i in st.seats.size(): st.seats[i].tm = 1 + (i % 2)
			_show(cur, 0), 13))
	inner.add_child(q)
	inner.add_child(UI.para("Players on the same team are allies: they share vision, never fight each other and win together.", 12))
	var m := UI.map_info(st.map)
	if not m.is_empty():
		var th := _map_thumb(m, 300)
		th.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		inner.add_child(th)
		inner.add_child(UI.label("%s · %d players" % [str(m.name).to_upper(), m.n], 13, UI.TEXT_DIM, "display"))
	var sb := UI.button("Start battle", start_battle, 20, 0, true)
	sb.name = "Start"
	_foot([UI.button("Battle options →", go.bind("c-opts"), 16), sb])

# ---------------------------------------------------------------- Battle 4: options
func _s_c_opts(vb: VBoxContainer) -> void:
	_head(vb, "Battle options", "Optional. The defaults are a good fight; start any time from the Players screen.")
	for it in [["Conditions", "Time of day and weather. Low sun, dusk and night change what you can see and how far.", WX, "wx"], ["Season", "Mud slows wheels, snow slows infantry. Roads matter more.", SEASON, "season"]]:
		vb.add_child(UI.label(str(it[0]).to_upper(), 20, UI.TEXT, "bold"))
		vb.add_child(UI.para(it[1], 12))
		var fl := HFlowContainer.new()
		fl.add_theme_constant_override("h_separation", 8); fl.add_theme_constant_override("v_separation", 8)
		var grp := ButtonGroup.new()
		var key: String = it[3]
		for i in it[2].size():
			var ii: int = i
			fl.add_child(UI.toggle(it[2][i], grp, int(st[key]) == i, func(): st[key] = ii, 14))
		vb.add_child(fl)
		vb.add_child(UI.spacer(12))
	var sb := UI.button("Start battle", start_battle, 20, 0, true)
	sb.name = "Start"
	_foot([sb])

func start_battle() -> void:
	var players: Array = []
	var starts: Array = []
	for s in st.seats:
		players.append({fac = s.fac, ai = s.ai, tm = s.tm, style = s.style})
		starts.append(int(s.start))
	_launch({kind = "battle", map = st.map, players = players, starts = starts, diff = st.diff, seed = randi() % 1000000 + 1, wx = st.wx, season = st.season})

func _launch(l: Dictionary) -> void:
	UI.launch = l
	var scene := "res://scenes/main.tscn" if l.get("kind") == "range_old" else "res://scenes/battle.tscn"
	var fade := ColorRect.new()
	fade.color = Color(0, 0, 0, 0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(fade)
	var tw := create_tween()
	tw.tween_property(fade, "color:a", 1.0, 0.25)
	tw.tween_callback(func(): get_tree().change_scene_to_file(scene))

# ---------------------------------------------------------------- Multiplayer (Battle only)
func _s_online(vb: VBoxContainer) -> void:
	_head(vb, "Multiplayer", "Play a Battle online: start one or join a friend - open games, invite codes and links are below.")
	var nm := LineEdit.new()
	nm.name = "Name"
	nm.text = str(UI.opt("player_name")); nm.max_length = 16
	nm.custom_minimum_size.x = 200
	nm.add_theme_font_override("font", UI.font("mono")); nm.add_theme_font_size_override("font_size", 14)
	nm.add_theme_stylebox_override("normal", UI.box(Color("0b1116"), Color("2b3c46"), 1, 10))
	nm.text_changed.connect(func(t): UI.set_opt("player_name", t))
	_row(vb, "Your name", nm)
	var nats := UI.nations()
	_row(vb, "Your nation", UI.dropdown(nats.map(func(k): return UI.nat_name(k)), nats.find(st.fac), func(i): st.fac = nats[i]; UI.set_opt("last_fac", nats[i]), 200))
	vb.add_child(UI.spacer(8))
	var po := UI.button("Play online", func(): _launch({kind = "online", code = "", name = str(UI.opt("player_name")), fac = st.fac}), 20, 0, true)
	po.name = "PlayOnline"
	var ph := HBoxContainer.new(); ph.add_child(po); vb.add_child(ph)
	vb.add_child(UI.para("Joins an open Battle, or starts one and waits for players (up to 8). The battle servers run on Cloudflare.", 12))
	vb.add_child(UI.spacer(10))
	vb.add_child(UI.label("OPEN GAMES", 12, UI.TEXT_DIM))
	var games := UI.panel(10)
	games.name = "Games"
	games.custom_minimum_size.y = 120
	games.add_child(UI.para("No open games right now. Start one with Play online, or join a friend with a code.", 12))
	vb.add_child(games)
	vb.add_child(UI.spacer(6))
	var code := LineEdit.new()
	code.name = "Code"
	code.placeholder_text = "Game code or invite link"
	code.custom_minimum_size.x = 250
	code.add_theme_font_override("font", UI.font("mono")); code.add_theme_font_size_override("font_size", 14)
	code.add_theme_stylebox_override("normal", UI.box(Color("0b1116"), Color("2b3c46"), 1, 10))
	var jh := HBoxContainer.new()
	jh.add_theme_constant_override("separation", 8)
	jh.add_child(code)
	jh.add_child(UI.button("Join", func():
		var c := code.text.strip_edges()
		if c.find("code=") >= 0: c = c.substr(c.find("code=") + 5).split("&")[0]
		if c != "": _launch({kind = "online", code = c, name = str(UI.opt("player_name")), fac = st.fac}), 16))
	vb.add_child(jh)

# ---------------------------------------------------------------- Test range (one small window)
func _s_t_range(vb: VBoxContainer) -> void:
	_head(vb, "Test range", "Pick a map, a target and your nation. Same rules as Battle, with unlimited money and a passive target.")
	var nats := UI.nations()
	var names := nats.map(func(k): return UI.nat_name(k))
	var ms := UI.maps()
	var mi := 0
	for i in ms.size():
		if ms[i].key == tr.map: mi = i
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 14)
	var v1 := VBoxContainer.new(); var v2 := VBoxContainer.new()
	v1.add_child(UI.label("MAP", 12, UI.TEXT_DIM)); v1.add_child(UI.dropdown(ms.map(func(m): return m.name), mi, func(i): tr.map = ms[i].key, 226))
	v2.add_child(UI.label("TARGET NATION", 12, UI.TEXT_DIM)); v2.add_child(UI.dropdown(names, nats.find(tr.target), func(i): tr.target = nats[i], 226))
	hb.add_child(v1); hb.add_child(v2)
	vb.add_child(hb)
	vb.add_child(UI.spacer(4))
	vb.add_child(UI.label("YOUR NATION", 12, UI.TEXT_DIM))
	_nat_picker(vb, tr.fac, func(k): tr.fac = k; _show(cur, 0))
	var sb := UI.button("Start", func(): _launch({kind = "range", map = tr.map, players = [{fac = tr.fac, ai = false, tm = 1}, {fac = tr.target, ai = true, tm = 2}], diff = 1, seed = 7}), 20, 0, true)
	sb.name = "Start"
	_foot([sb])

# ---------------------------------------------------------------- Missions
func _s_missions(vb: VBoxContainer) -> void:
	_head(vb, "Missions", "The story missions. Each one is a Battle with its own objectives; pick Easy, Medium or Hard in the briefing.")
	var inner := _scroll(vb, 20)
	var rec := UI.record()
	for m in Missions.LIST:
		var best := ""
		for d in ["Easy", "Medium", "Hard"]:
			var tt := float(rec.get_value("m", "%s_%s" % [m.id, d], 0.0))
			if tt > 0: best += "  %s %s" % [d, UI.fmt_time(tt)]
		var b := UI.menu_item("%d  %s" % [m.n, m.title], go.bind("brief", m.id), 18, str(m.sub) + ("  ·  done:" + best if best != "" else ""))
		b.name = "Mission_" + str(m.id)
		inner.add_child(b)

var brief_diff := 1
func _s_brief(vb: VBoxContainer) -> void:
	var m: Dictionary = Missions.by_id(arg)
	if m.is_empty(): return
	_head(vb, m.title, "%s · %s" % [m.sub, m.min])
	var inner := _scroll(vb, 90)
	for p in m.brief:
		inner.add_child(UI.para(p, 13, UI.TEXT))
		inner.add_child(UI.spacer(4))
	inner.add_child(UI.label("OBJECTIVES", 12, UI.TEXT_DIM))
	for o in m.obj: inner.add_child(UI.para("▸ " + str(o[1]), 13, UI.GOLD))
	inner.add_child(UI.spacer(6))
	var grp := ButtonGroup.new()
	var dh := HBoxContainer.new()
	dh.add_theme_constant_override("separation", 8)
	for i in 3:
		var ii: int = i
		dh.add_child(UI.toggle(["Easy", "Medium", "Hard"][i], grp, brief_diff == i, func(): brief_diff = ii, 15))
	inner.add_child(dh)
	var sb := UI.button("Start mission", func(): _launch({kind = "mission", mission = m.id, diff = brief_diff, seed = 11}), 20, 0, true)
	sb.name = "Start"
	_foot([sb])

# ---------------------------------------------------------------- Load game / replays / my battles
func _file_list(vb: VBoxContainer, kind: String, empty: String, launch_kind: String) -> void:
	var inner := _scroll(vb, 20)
	var files := UI.list_files(kind)
	if files.is_empty():
		inner.add_child(UI.para(empty, 13))
		return
	for f in files:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 6)
		var path: String = f.path
		var b := UI.menu_item(f.name, func(): _launch({kind = launch_kind, file = path}), 16, "%s · %s · %s · %s" % [UI.nat_name(f.fac), str(UI.map_info(f.map).get("name", f.map)), UI.fmt_time(f.t), UI.fmt_when(f.when)], 420)
		hb.add_child(b)
		var del := UI.button("✕", func(): DirAccess.remove_absolute(path); _show(cur, 0), 14)
		del.tooltip_text = "Delete"
		hb.add_child(del)
		inner.add_child(hb)

func _s_load(vb: VBoxContainer) -> void:
	_head(vb, "Load game", "Your saved Battles and missions. Save any time from the pause menu (Esc) or with F5.")
	_file_list(vb, "saves", "No saved battles yet.", "load")

func _s_replays(vb: VBoxContainer) -> void:
	_head(vb, "Watch a replay", "Every finished Battle is kept as a replay. Space pauses, + and − change the speed.")
	_file_list(vb, "replays", "No replays yet: finish a Battle and it appears here.", "replay")

func _s_battles(vb: VBoxContainer) -> void:
	_head(vb, "My battles", "Your record on this computer.")
	var r := UI.record()
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 30); g.add_theme_constant_override("v_separation", 6)
	for it in [["Battles played", "games"], ["Victories", "wins"], ["Defeats", "losses"], ["Enemy units destroyed", "kills"], ["Units lost", "lost"], ["Buildings built", "built"], ["Time in battle", "time"]]:
		g.add_child(UI.label(str(it[0]).to_upper(), 16, UI.TEXT_DIM, "display"))
		var v := float(r.get_value("r", it[1], 0.0))
		g.add_child(UI.label(UI.fmt_time(v) if it[1] == "time" else str(int(v)), 18, UI.TEXT, "bold"))
	vb.add_child(g)

# ---------------------------------------------------------------- Extras
func _s_extras(vb: VBoxContainer) -> void:
	_head(vb, "Extras", "Practice, review and reference.")
	for it in [["Watch a replay", "replays"], ["My battles", "battles"], ["Encyclopedia", "ency"], ["Medals", "medals"]]:
		vb.add_child(UI.menu_item(it[0], go.bind(it[1]), 20))

func _s_medals(vb: VBoxContainer) -> void:
	_head(vb, "Medals", "Earned in Battle, missions and the Tutorial.")
	var r := UI.record()
	var inner := _scroll(vb, 20)
	for m in UI.MEDALS:
		var have := float(r.get_value("r", m[3], 0.0))
		var got: bool = have >= float(m[4])
		var p := PanelContainer.new()
		var sb := UI.box(Color("2a2412") if got else Color(0.05, 0.07, 0.085, 0.9), UI.GOLD if got else Color("2b3c46"), 1, 12, 9, UI.GOLD if got else Color("3a4a52"))
		sb.border_width_top = 1; sb.border_width_right = 1; sb.border_width_bottom = 1
		p.add_theme_stylebox_override("panel", sb)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 0)
		v.add_child(UI.label(("★ " if got else "☆ ") + str(m[1]).to_upper(), 18, UI.GOLD_HI if got else UI.TEXT_DIM, "display"))
		v.add_child(UI.label("%s%s" % [m[2], "" if got or int(m[4]) <= 1 else "   (%d / %d)" % [int(have), int(m[4])]], 12, UI.TEXT_DIM))
		p.add_child(v)
		inner.add_child(p)

## Encyclopedia: every nation's units and buildings straight from data/rules.json (the same numbers the battle uses)
func _s_ency(vb: VBoxContainer) -> void:
	var k: String = arg if arg != "" and UI.nations().has(arg) else st.fac
	_head(vb, "Encyclopedia", "Every unit and building, with the numbers the battle uses.")
	var nats := UI.nations()
	_row(vb, "Nation", UI.dropdown(nats.map(func(x): return UI.nat_name(x)), nats.find(k), func(i): arg = nats[i]; _show(cur, 0), 220))
	var F: Dictionary = UI.rules().get("factions", {}).get(k, {})
	var inner := _scroll(vb, 20)
	if F.is_empty(): return
	inner.add_child(UI.para(_nat_detail(k), 12, UI.TEXT))
	for sec in [["Units", F.units, true], ["Buildings", F.blds, false]]:
		inner.add_child(UI.spacer(6))
		inner.add_child(UI.label(str(sec[0]).to_upper(), 20, UI.GOLD, "bold"))
		for uk in sec[1]:
			var s: Dictionary = sec[1][uk]
			var line := "$%d · %d hp" % [int(s.get("cost", 0)), int(s.get("hp", 0))]
			if sec[2]:
				if float(s.get("dmg", 0)) > 0: line += " · damage %d · range %d" % [int(s.dmg), int(s.get("rng", 0))]
				line += " · speed %d · from %s" % [int(s.get("spd", 0)), str(F.blds.get(str(s.get("from", "")), {}).get("name", s.get("from", "")))]
			elif s.get("req") != null: line += " · needs %s" % str(F.blds.get(str(s.req), {}).get("name", s.req))
			var v := VBoxContainer.new()
			v.add_theme_constant_override("separation", 0)
			v.add_child(UI.label(str(s.get("name", uk)).to_upper(), 16, UI.TEXT, "display"))
			v.add_child(UI.label(line, 12, UI.TEXT_DIM))
			if str(s.get("desc", "")) != "": v.add_child(UI.para(str(s.desc), 12, Color("6f7f78"), 440))
			inner.add_child(v)
	if F.get("upg") != null:
		inner.add_child(UI.spacer(6))
		inner.add_child(UI.label("UPGRADES", 20, UI.GOLD, "bold"))
		for uk in F.get("upgList", []):
			var u: Dictionary = F.upg.get(uk, {})
			if u.is_empty(): continue
			inner.add_child(UI.label(str(u.name).to_upper(), 16, UI.TEXT, "display"))
			inner.add_child(UI.label("$%d · at the %s · %s" % [int(u.get("cost", 0)), str(F.blds.get(str(u.get("at", "")), {}).get("name", u.get("at", ""))), str(u.get("desc", ""))], 12, UI.TEXT_DIM))

# ---------------------------------------------------------------- Settings
func _slider(key: String, lo: float, hi: float) -> HSlider:
	var s := HSlider.new()
	s.name = "S_" + key
	s.min_value = lo; s.max_value = hi; s.step = 0.05
	s.value = float(UI.opt(key))
	s.custom_minimum_size = Vector2(230, 22)
	s.focus_mode = Control.FOCUS_NONE
	s.value_changed.connect(func(v): UI.set_opt(key, v))
	return s

func _check(key: String, txt: String) -> CheckButton:
	var c := CheckButton.new()
	c.name = "C_" + key
	c.text = txt
	c.button_pressed = bool(UI.opt(key))
	c.focus_mode = Control.FOCUS_NONE
	c.add_theme_font_override("font", UI.font("mono")); c.add_theme_font_size_override("font_size", 13)
	c.add_theme_color_override("font_color", UI.TEXT)
	c.toggled.connect(func(v): UI.set_opt(key, v))
	return c

func _s_settings(vb: VBoxContainer) -> void:
	_head(vb, "Settings", "Graphics, sound and mouse. Changes apply at once and are kept on this computer.")
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 8)
	var grp := ButtonGroup.new()
	for tname in ["Sound", "Mouse", "Graphics", "Keys"]:
		var tn: String = tname
		var tb := UI.toggle(tn, grp, set_tab == tn, func(): set_tab = tn; _show(cur, 0), 15)
		tb.name = "Tab_" + tn
		tabs.add_child(tb)
	vb.add_child(tabs)
	vb.add_child(UI.spacer(8))
	match set_tab:
		"Sound":
			for it in [["Master volume", "vol_master"], ["Music", "vol_music"], ["Battle sounds", "vol_sfx"], ["Unit voices", "vol_voice"]]:
				_row(vb, it[0], _slider(it[1], 0.0, 1.0))
		"Mouse":
			vb.add_child(_check("mouse_lock", "Keep the mouse inside the window in battle (Esc releases it)"))
			vb.add_child(_check("edge_scroll", "Scroll the camera at the screen edges"))
			vb.add_child(_check("deselect_after_order", "Deselect units after an order"))
			_row(vb, "Scroll speed", _slider("scroll_speed", 0.4, 2.0))
			vb.add_child(UI.spacer(6))
			vb.add_child(UI.para("Left-click selects and deploys (buildings, rally flag). Right-click orders units (move, attack) and launches powers, strikes and road jobs.", 12))
		"Graphics":
			var grp2 := ButtonGroup.new()
			var qh := _row(vb, "Quality", null)
			for i in 3:
				var ii: int = i
				qh.add_child(UI.toggle(["Low", "Medium", "High"][i], grp2, int(UI.opt("gfx_quality")) == i, func(): UI.set_opt("gfx_quality", ii), 14))
			vb.add_child(_check("shadows", "Shadows"))
			vb.add_child(_check("fullscreen", "Full screen"))
			vb.add_child(_check("show_fps", "Show frames per second"))
		"Keys":
			var inner := _scroll(vb, 20)
			for k in Missions.KEYS:
				var hb := HBoxContainer.new()
				var kl := UI.label(k[0], 13, UI.GOLD)
				kl.custom_minimum_size.x = 170
				hb.add_child(kl); hb.add_child(UI.para(k[1], 13, UI.TEXT, 290))
				inner.add_child(hb)

# ---------------------------------------------------------------- Credits
func _s_credits(vb: VBoxContainer) -> void:
	_head(vb, "Credits", "Free art, sound and music only, every author credited.")
	var inner := _scroll(vb, 20)
	for c in Missions.CREDITS:
		inner.add_child(UI.label(str(c[0]).to_upper(), 16, UI.TEXT, "display"))
		inner.add_child(UI.para(c[1], 12))
		inner.add_child(UI.spacer(4))

func _process(_dt: float) -> void:
	if shot_path != "":
		shot_n += 1
		if shot_n == 12:
			get_viewport().get_texture().get_image().save_png(shot_path)
			get_tree().quit()
