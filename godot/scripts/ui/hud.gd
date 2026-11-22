## BATTLE HUD (lane P6) - the browser game's Zero Hour control bar in Godot:
## bottom steel bar = minimap (left) · Pause / Menu · command area (cameo buttons, the building's own queue) · portrait
## (right) · power meter; plate on the bar = power / money / army; chip at the top = money, supply state, alerts;
## ready powers = a column on the right edge; Generals' powers window (P), pause menu (Esc / F10), end-of-battle stats,
## mission objectives, tutorial box, radio feed. It only reads the battle (B) and sends orders through B.cmd().
extends Node

const UI = preload("res://scripts/ui/ui_kit.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const BAR_H := 176.0
const MINI_W := 222.0
const MINI_H := 152.0
const STEEL := Color("2a3236")
const STEEL_HI := Color("8d9a9a")
const TEAL := Color("062019")
const GREEN_BTN := Color("1f7a3a")
const COLS := 7

var B                         # battle.gd
var layer: CanvasLayer
var root: Control             # everything of the HUD (hidden before the battle starts)
var bar: Panel
var mini: Control
var mini_tex: ImageTexture
var mini_t := 0.0
var cmd_grid: GridContainer
var cmd_title: Label
var cmd_sub: Label
var queue_row: HBoxContainer
var port_name: Label
var port_info: Label
var port_hp: ProgressBar
var port_pic: TextureRect
var plate_pw: Label
var plate_money: Label
var plate_pop: Label
var pw_bar: ProgressBar
var pw_meter: ProgressBar
var chip_money: Label
var chip_sup: Label
var chip_alert: Label
var mode_lbl: Label
var hint_lbl: Label
var powers_col: VBoxContainer
var star_btn: Button
var obj_panel: PanelContainer
var obj_box: VBoxContainer
var banner: Label
var feed: VBoxContainer
var tut_panel: PanelContainer
var tut_n: Label
var tut_t: Label
var tut_a: Label
var window: Control = null     # the open modal (pause, powers, end, help)
var window_kind := ""
var cmd_sig := ""
var pow_sig := ""
var obj_sig := ""
var feed_n := 0
var alerts := 0
var last_event := Vector2.INF
var load_lbl: Label
var replay_lbl: Label
var collapsed := false

func _init(battle) -> void:
	B = battle

func build(l: CanvasLayer) -> void:
	layer = l
	root = Control.new()
	root.name = "Hud"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)
	_bar()
	_top()
	_side()
	load_lbl = UI.label("", 22, UI.GOLD, "bold")
	load_lbl.set_anchors_preset(Control.PRESET_CENTER)
	load_lbl.offset_left = -200; load_lbl.offset_top = -20
	load_lbl.visible = false
	layer.add_child(load_lbl)

# ---------------------------------------------------------------- bottom bar
func _steel(bg: Color, edge: Color, bw: int = 2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg; sb.border_color = edge
	sb.set_border_width_all(bw); sb.set_corner_radius_all(3)
	return sb

func _green(txt: String, on: Callable, tip: String) -> Button:
	var b := Button.new()
	b.text = txt
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = tip
	b.add_theme_font_size_override("font_size", 15)
	b.add_theme_color_override("font_color", Color("d8ffe0"))
	b.add_theme_stylebox_override("normal", _steel(GREEN_BTN, Color("7fd79a"), 1))
	b.add_theme_stylebox_override("hover", _steel(Color("2a9a4a"), Color("c8ffd6"), 1))
	b.add_theme_stylebox_override("pressed", _steel(Color("145226"), Color("7fd79a"), 1))
	b.pressed.connect(on)
	return b

func _bar() -> void:
	bar = Panel.new()
	bar.name = "Bar"
	bar.anchor_top = 1.0; bar.anchor_bottom = 1.0; bar.anchor_right = 1.0
	bar.offset_top = -BAR_H
	var sb := _steel(STEEL, STEEL_HI, 0)
	sb.border_width_top = 3; sb.set_corner_radius_all(0)
	bar.add_theme_stylebox_override("panel", sb)
	root.add_child(bar)
	# minimap
	var mf := Panel.new()
	mf.position = Vector2(10, 12); mf.size = Vector2(MINI_W + 8, MINI_H + 8)
	mf.add_theme_stylebox_override("panel", _steel(Color("0b1512"), Color("c5cfce"), 2))
	bar.add_child(mf)
	mini = Control.new()
	mini.name = "Minimap"
	mini.position = Vector2(4, 4); mini.size = Vector2(MINI_W, MINI_H)
	mini.clip_contents = true
	mini.draw.connect(_mini_draw)
	mini.gui_input.connect(_mini_input)
	mf.add_child(mini)
	var pb := _green("II", func(): toggle_pause(), "Pause (Pause / F10)")
	pb.name = "PauseBtn"
	pb.position = Vector2(244, 14); pb.size = Vector2(40, 30)
	bar.add_child(pb)
	var mb := _green("≡", func(): open_pause(), "Menu (Esc)")
	mb.name = "MenuBtn"
	mb.position = Vector2(244, 136); mb.size = Vector2(40, 30)
	bar.add_child(mb)
	var sl := _green("L", func(): B.toggle_supply(), "Show supply lines on the ground (L)")
	sl.position = Vector2(244, 54); sl.size = Vector2(40, 30)
	bar.add_child(sl)
	var hb := _green("?", func(): open_help(), "Controls")
	hb.position = Vector2(244, 94); hb.size = Vector2(40, 30)
	bar.add_child(hb)
	# command area
	var ca := Panel.new()
	ca.name = "Cmd"
	ca.anchor_right = 1.0
	ca.offset_left = 292; ca.offset_right = -250; ca.offset_top = 12; ca.offset_bottom = 12 + MINI_H + 8
	ca.add_theme_stylebox_override("panel", _steel(TEAL, Color("9fb0ac"), 2))
	bar.add_child(ca)
	var cv := VBoxContainer.new()
	cv.set_anchors_preset(Control.PRESET_FULL_RECT)
	cv.offset_left = 8; cv.offset_top = 4; cv.offset_right = -8; cv.offset_bottom = -4
	cv.add_theme_constant_override("separation", 2)
	ca.add_child(cv)
	var th := HBoxContainer.new()
	th.add_theme_constant_override("separation", 14)
	cmd_title = UI.label("", 18, UI.GOLD_HI, "display")
	cmd_sub = UI.label("", 13, Color("9fd0c0"))
	cmd_sub.clip_text = true
	cmd_sub.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	th.add_child(cmd_title); th.add_child(cmd_sub)
	cv.add_child(th)
	var hb2 := HBoxContainer.new()
	hb2.add_theme_constant_override("separation", 10)
	hb2.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cv.add_child(hb2)
	cmd_grid = GridContainer.new()
	cmd_grid.name = "Grid"
	cmd_grid.columns = COLS
	cmd_grid.add_theme_constant_override("h_separation", 5); cmd_grid.add_theme_constant_override("v_separation", 5)
	hb2.add_child(cmd_grid)
	queue_row = HBoxContainer.new()
	queue_row.name = "Queue"
	queue_row.add_theme_constant_override("separation", 3)
	queue_row.alignment = BoxContainer.ALIGNMENT_END
	queue_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb2.add_child(queue_row)
	# portrait
	var pf := Panel.new()
	pf.name = "Portrait"
	pf.anchor_left = 1.0; pf.anchor_right = 1.0
	pf.offset_left = -242; pf.offset_right = -42; pf.offset_top = 12; pf.offset_bottom = 12 + MINI_H + 8
	pf.add_theme_stylebox_override("panel", _steel(Color("0a1016"), Color("c5cfce"), 2))
	bar.add_child(pf)
	port_pic = TextureRect.new()
	port_pic.position = Vector2(6, 6); port_pic.size = Vector2(188, 96)
	port_pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	port_pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	pf.add_child(port_pic)
	port_name = UI.label("", 15, UI.TEXT, "display")
	port_name.position = Vector2(8, 100); port_name.size = Vector2(184, 20); port_name.clip_text = true
	pf.add_child(port_name)
	port_hp = _progress(Color("3fd35c"))
	port_hp.position = Vector2(8, 122); port_hp.size = Vector2(184, 7)
	pf.add_child(port_hp)
	port_info = UI.label("", 11, UI.TEXT_DIM)
	port_info.position = Vector2(8, 131); port_info.size = Vector2(184, 28); port_info.clip_text = true
	pf.add_child(port_info)
	# power meter (far right)
	pw_meter = _progress(Color("3fd35c"))
	pw_meter.fill_mode = ProgressBar.FILL_BOTTOM_TO_TOP
	pw_meter.anchor_left = 1.0; pw_meter.anchor_right = 1.0
	pw_meter.offset_left = -34; pw_meter.offset_right = -12; pw_meter.offset_top = 12; pw_meter.offset_bottom = 12 + MINI_H + 8
	pw_meter.tooltip_text = "Power: made / used"
	bar.add_child(pw_meter)
	# plate on the bar: power | money | army
	var pl := PanelContainer.new()
	pl.name = "Plate"
	pl.anchor_left = 0.5; pl.anchor_right = 0.5; pl.anchor_top = 1.0; pl.anchor_bottom = 1.0
	pl.offset_left = -224; pl.offset_right = 224; pl.offset_top = -BAR_H - 20; pl.offset_bottom = -BAR_H + 16
	var ps := _steel(Color("0a0e12"), Color("c5cfce"), 2); ps.set_corner_radius_all(6)
	ps.content_margin_left = 16; ps.content_margin_right = 16
	pl.add_theme_stylebox_override("panel", ps)
	root.add_child(pl)
	var ph := HBoxContainer.new()
	ph.alignment = BoxContainer.ALIGNMENT_CENTER
	ph.add_theme_constant_override("separation", 14)
	pl.add_child(ph)
	plate_pw = UI.label("⚡ 0 / 0", 14, UI.TEXT, "tight")
	plate_pw.custom_minimum_size.x = 70
	pw_bar = _progress(Color("3fd35c"))
	pw_bar.custom_minimum_size = Vector2(66, 5)
	pw_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	plate_money = UI.label("$0", 21, UI.GOLD_HI, "bold")
	plate_money.name = "Money"
	plate_money.custom_minimum_size.x = 130
	plate_money.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	plate_pop = UI.label("0/0", 14, UI.TEXT, "tight")
	plate_pop.custom_minimum_size.x = 86
	plate_pop.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	ph.add_child(plate_pw); ph.add_child(pw_bar); ph.add_child(plate_money); ph.add_child(plate_pop)
	# above the bar: hint line (left), collapse + Generals' star (right)
	hint_lbl = UI.label("", 12, Color(0.85, 0.88, 0.86, 0.75))
	hint_lbl.anchor_top = 1.0; hint_lbl.anchor_bottom = 1.0
	hint_lbl.offset_left = 10; hint_lbl.offset_top = -BAR_H - 26; hint_lbl.offset_right = 540; hint_lbl.offset_bottom = -BAR_H - 4
	hint_lbl.clip_text = true
	hint_lbl.add_theme_stylebox_override("normal", UI.box(Color(0.05, 0.06, 0.07, 0.6), Color(0, 0, 0, 0), 0, 8))
	root.add_child(hint_lbl)
	var cb := _green("⌄", func(): collapsed = not collapsed; bar.visible = not collapsed, "Hide / show the command bar")
	cb.anchor_left = 1.0; cb.anchor_right = 1.0; cb.anchor_top = 1.0; cb.anchor_bottom = 1.0
	cb.offset_left = -114; cb.offset_right = -64; cb.offset_top = -BAR_H - 26; cb.offset_bottom = -BAR_H - 2
	root.add_child(cb)
	star_btn = _green("★", func(): open_powers(), "Generals' powers (P)")
	star_btn.name = "StarBtn"
	star_btn.anchor_left = 1.0; star_btn.anchor_right = 1.0; star_btn.anchor_top = 1.0; star_btn.anchor_bottom = 1.0
	star_btn.offset_left = -60; star_btn.offset_right = -10; star_btn.offset_top = -BAR_H - 26; star_btn.offset_bottom = -BAR_H - 2
	root.add_child(star_btn)

func _progress(col: Color) -> ProgressBar:
	var p := ProgressBar.new()
	p.show_percentage = false
	p.max_value = 1.0
	p.mouse_filter = Control.MOUSE_FILTER_PASS
	var bg := StyleBoxFlat.new(); bg.bg_color = Color(0.03, 0.04, 0.05); bg.border_color = Color("4a5558"); bg.set_border_width_all(1)
	var fg := StyleBoxFlat.new(); fg.bg_color = col
	p.add_theme_stylebox_override("background", bg)
	p.add_theme_stylebox_override("fill", fg)
	return p

# ---------------------------------------------------------------- top chip, banner, objectives, tutorial, feed
func _top() -> void:
	var chip := PanelContainer.new()
	chip.name = "Chip"
	chip.anchor_left = 0.5; chip.anchor_right = 0.5
	chip.offset_left = -165; chip.offset_right = 165; chip.offset_top = 6
	var cs := _steel(Color(0.04, 0.05, 0.06, 0.88), Color("3a4448"), 1); cs.set_corner_radius_all(8)
	cs.content_margin_left = 14; cs.content_margin_right = 14; cs.content_margin_top = 3; cs.content_margin_bottom = 3
	chip.add_theme_stylebox_override("panel", cs)
	root.add_child(chip)
	var ch := HBoxContainer.new()
	ch.alignment = BoxContainer.ALIGNMENT_CENTER
	ch.add_theme_constant_override("separation", 16)
	chip.add_child(ch)
	chip_money = UI.label("$0", 15, UI.TEXT, "tight")
	chip_sup = UI.label("Supply lines OK", 15, UI.GREEN, "tight")
	chip_alert = UI.label("⚠ 0", 15, UI.TEXT, "tight")
	chip_alert.mouse_filter = Control.MOUSE_FILTER_STOP
	chip_alert.tooltip_text = "Alerts - Space jumps to the last one"
	ch.add_child(chip_money); ch.add_child(chip_sup); ch.add_child(chip_alert)
	mode_lbl = UI.label("BATTLE · destroy every enemy building", 13, Color(0.9, 0.92, 0.9, 0.85))
	mode_lbl.anchor_left = 0.5; mode_lbl.anchor_right = 0.5
	mode_lbl.offset_left = -300; mode_lbl.offset_right = 300; mode_lbl.offset_top = 40
	mode_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mode_lbl.add_theme_constant_override("outline_size", 5)
	mode_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.75))
	root.add_child(mode_lbl)
	banner = UI.label("", 20, UI.GOLD_HI, "display")
	banner.anchor_left = 0.5; banner.anchor_right = 0.5
	banner.offset_left = -480; banner.offset_right = 480; banner.offset_top = 84
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	banner.add_theme_constant_override("outline_size", 6)
	banner.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	root.add_child(banner)
	obj_panel = UI.panel(10)
	obj_panel.name = "Objectives"
	obj_panel.position = Vector2(10, 34)
	obj_panel.custom_minimum_size.x = 330
	obj_panel.visible = false
	root.add_child(obj_panel)
	obj_box = VBoxContainer.new()
	obj_box.add_theme_constant_override("separation", 1)
	obj_panel.add_child(obj_box)
	tut_panel = UI.panel(12)
	tut_panel.name = "Tutorial"
	tut_panel.anchor_left = 0.5; tut_panel.anchor_right = 0.5
	tut_panel.offset_left = -300; tut_panel.offset_right = 300; tut_panel.offset_top = 64
	tut_panel.visible = false
	root.add_child(tut_panel)
	var tv := VBoxContainer.new()
	tut_panel.add_child(tv)
	var thh := HBoxContainer.new()
	tut_n = UI.label("Step 1/7", 13, UI.CYAN, "display")
	tut_n.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	thh.add_child(tut_n)
	thh.add_child(UI.button("Skip step", func(): B.tut_next(true), 11))
	thh.add_child(UI.button("End tutorial", func(): B.tut_end(), 11))
	tv.add_child(thh)
	tut_t = UI.para("", 13, UI.TEXT, 570)
	tut_a = UI.para("", 13, UI.GOLD_HI, 570)
	tv.add_child(tut_t); tv.add_child(tut_a)
	feed = VBoxContainer.new()
	feed.name = "Feed"
	feed.anchor_top = 1.0; feed.anchor_bottom = 1.0
	feed.offset_left = 12; feed.offset_top = -BAR_H - 150; feed.offset_bottom = -BAR_H - 30; feed.offset_right = 620
	feed.alignment = BoxContainer.ALIGNMENT_END
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	feed.add_theme_constant_override("separation", 0)
	root.add_child(feed)
	replay_lbl = UI.label("", 14, UI.CYAN, "display")
	replay_lbl.anchor_left = 0.5; replay_lbl.anchor_right = 0.5
	replay_lbl.offset_left = -300; replay_lbl.offset_right = 300; replay_lbl.offset_top = 60
	replay_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(replay_lbl)

func _side() -> void:
	# ready powers: a column on the right edge
	powers_col = VBoxContainer.new()
	powers_col.name = "Powers"
	powers_col.anchor_left = 1.0; powers_col.anchor_right = 1.0
	powers_col.offset_left = -76; powers_col.offset_right = -8; powers_col.offset_top = 90
	powers_col.add_theme_constant_override("separation", 6)
	root.add_child(powers_col)

func say(msg: String, kind: String = "g") -> void:
	var col: Color = {"g": Color("bfe8c8"), "w": Color("ffd98a"), "bad": Color("ff9a8a")}.get(kind, UI.TEXT)
	var l := UI.label(msg, 13, col)
	l.add_theme_constant_override("outline_size", 4)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	l.set_meta("t", Time.get_ticks_msec())
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	feed.add_child(l)
	while feed.get_child_count() > 6: feed.get_child(0).free()

func alert(p: Vector2) -> void:
	alerts += 1
	last_event = p

# ---------------------------------------------------------------- per frame
func tick(dt: float) -> void:
	root.visible = B.started
	if not B.started or B.sim == null: return
	var sim = B.sim
	var T: Dictionary = sim.teams[B.me]
	var pw: Vector2 = sim.pwr_of(B.me)
	var low := pw.y > pw.x
	plate_pw.text = "⚡ %d / %d" % [int(pw.y), int(pw.x)]
	plate_pw.add_theme_color_override("font_color", Color(1, 0.5, 0.4) if low else UI.TEXT)
	pw_bar.value = clampf(pw.y / maxf(1.0, pw.x), 0, 1)
	pw_meter.value = clampf((pw.x - pw.y) / maxf(1.0, pw.x), 0, 1) if not low else 0.04
	for p in [pw_bar, pw_meter]: (p.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = Color("e0503a") if low else Color("3fd35c")
	var money := "∞" if B.kind == "range" else "$" + _commas(int(T.credits))
	plate_money.text = money
	chip_money.text = money
	plate_pop.text = "ARMY %d/%d" % [sim.pop_used(B.me, false), sim.pop_cap()]
	var sup = B.supply_state()
	chip_sup.text = sup[0]
	chip_sup.add_theme_color_override("font_color", sup[1])
	chip_alert.text = "⚠ %d" % alerts
	chip_alert.add_theme_color_override("font_color", Color("ffb040") if alerts > 0 else UI.TEXT_DIM)
	if B.kind == "replay": replay_lbl.text = "REPLAY · %s · speed x%s%s · Space pause, + / − speed, Esc menu" % [UI.fmt_time(sim.t), str(B.replay_speed), "  (paused)" if B.paused else ""]
	elif B.paused and window == null: replay_lbl.text = "PAUSED"
	else: replay_lbl.text = ""
	mini_t -= dt
	if mini_t <= 0: mini_t = 0.2; mini.queue_redraw()
	hint_lbl.text = B.hint_text()
	var now := Time.get_ticks_msec()
	for l in feed.get_children():
		var age := (now - int(l.get_meta("t"))) / 1000.0
		l.modulate.a = clampf(9.0 - age, 0.0, 1.0)
		if age > 9.0: l.queue_free()
	_cmd_bar()
	_portrait()
	_powers()
	_mission()
	star_btn.modulate = Color(1.3, 1.2, 0.6) if B.gp_points() > 0 else Color(1, 1, 1)

func _commas(n: int) -> String:
	var s := str(absi(n)); var out := ""
	while s.length() > 3: out = "," + s.substr(s.length() - 3) + out; s = s.substr(0, s.length() - 3)
	return ("-" if n < 0 else "") + s + out

# ---------------------------------------------------------------- command area
## a cameo button: picture, name, price (or a big count), a small corner mark
func _cameo_btn(it: Dictionary) -> Button:
	var b := Button.new()
	b.name = "Cmd_" + str(it.get("id", it.label))
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(134, 64)
	b.disabled = not bool(it.get("ok", true))
	b.tooltip_text = str(it.get("tip", ""))
	b.clip_contents = true
	b.add_theme_stylebox_override("normal", _steel(Color("0e2a24"), Color("3d6a5c"), 1))
	b.add_theme_stylebox_override("hover", _steel(Color("15392f"), UI.GOLD, 1))
	b.add_theme_stylebox_override("pressed", _steel(Color("3a3113"), UI.GOLD_HI, 1))
	b.add_theme_stylebox_override("disabled", _steel(Color("0a1513"), Color("24332f"), 1))
	if bool(it.get("on", false)): b.add_theme_stylebox_override("normal", _steel(Color("3a3113"), UI.GOLD_HI, 2))
	var tex = B.cameo(str(it.get("cameo", "")))
	if tex != null:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.position = Vector2(2, 3); tr.size = Vector2(50, 58)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if b.disabled: tr.modulate = Color(0.45, 0.45, 0.45)
		b.add_child(tr)
	var tx := 54.0 if tex != null else 7.0
	var nm := UI.label(str(it.label), 13, UI.TEXT if not b.disabled else Color(0.5, 0.55, 0.53), "tight")
	nm.position = Vector2(tx, 2); nm.size = Vector2(130 - tx, 38)
	nm.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nm.add_theme_constant_override("line_spacing", -5)
	nm.max_lines_visible = 2
	nm.clip_text = true
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(nm)
	if str(it.get("price", "")) != "":
		var pr := UI.label(str(it.price), 13, UI.GOLD_HI if not b.disabled else Color(0.55, 0.5, 0.35), "tight")
		pr.position = Vector2(tx, 42); pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pr)
	if str(it.get("mark", "")) != "":
		var mk := UI.label(str(it.mark), 15, Color(1, 1, 1), "bold")
		mk.add_theme_constant_override("outline_size", 4); mk.add_theme_color_override("font_outline_color", Color(0, 0, 0))
		mk.position = Vector2(104, 38); mk.size = Vector2(26, 22); mk.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		mk.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(mk)
	if it.has("prog"):
		var pg := _progress(UI.GOLD_HI)
		pg.position = Vector2(2, 57); pg.size = Vector2(130, 5); pg.value = float(it.prog)
		pg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pg)
	var on = it.get("on_click"); var rc = it.get("on_right")
	b.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			if ev.button_index == MOUSE_BUTTON_LEFT and not b.disabled and on != null: on.call(ev.shift_pressed); cmd_sig = ""
			elif ev.button_index == MOUSE_BUTTON_RIGHT and rc != null: rc.call(); cmd_sig = "")
	return b

func _cmd_bar() -> void:
	var d: Dictionary = B.cmd_items()
	var items: Array = d.get("items", [])
	var sig := str(d.get("title", "")) + "|" + str(d.get("sub", ""))
	for it in items: sig += "%s|%s|%s|%s|%s;" % [it.label, it.get("ok", true), it.get("mark", ""), it.get("on", false), int(float(it.get("prog", 0)) * 20)]
	for q in d.get("queue", []): sig += "q%s%d" % [q.kind, int(float(q.p) * 25)]
	sig += str(B.cameo_ver)
	if sig == cmd_sig: return
	cmd_sig = sig
	cmd_title.text = str(d.get("title", "")).to_upper()
	cmd_sub.text = str(d.get("sub", ""))
	for c in cmd_grid.get_children(): c.free()
	for i in mini(items.size(), COLS * 2): cmd_grid.add_child(_cameo_btn(items[i]))
	for c in queue_row.get_children(): c.free()
	var qn := 0
	for q in d.get("queue", []):
		if qn >= 9: break
		var qb := _cameo_btn({label = "", cameo = q.cameo, id = "q%d" % qn, tip = "%s - right-click cancels" % q.name, on_right = q.cancel, prog = q.p if qn == 0 else 0.0})
		qb.custom_minimum_size = Vector2(46, 64)
		for ch in qb.get_children():
			if ch is TextureRect: ch.size = Vector2(42, 50)
			elif ch is ProgressBar: ch.size = Vector2(42, 5)
			elif ch is Label: ch.visible = false
		queue_row.add_child(qb)
		qn += 1

func _portrait() -> void:
	var p: Dictionary = B.portrait()
	port_name.text = str(p.get("name", "")).to_upper()
	port_info.text = str(p.get("info", ""))
	port_hp.visible = p.has("hp")
	if p.has("hp"):
		var f := float(p.hp)
		port_hp.value = f
		(port_hp.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = Color(1.0 - f, 0.25 + f * 0.6, 0.2)
	port_pic.texture = B.cameo(str(p.get("cameo", "")))

# ---------------------------------------------------------------- ready powers column
func _powers() -> void:
	var ps: Array = B.power_list()
	var sig := ""
	for p in ps: sig += "%s%d%s;" % [p.key, int(float(p.ready) * 30), B.armed == "power:" + str(p.key)]
	if sig == pow_sig: return
	pow_sig = sig
	for c in powers_col.get_children(): c.free()
	for p in ps:
		var b := Button.new()
		b.name = "Pow_" + str(p.key)
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(68, 56)
		var rdy: bool = float(p.ready) >= 1.0
		b.tooltip_text = "%s%s\n%s\nClick, then RIGHT-click the target (left-click cancels)" % [p.name, "" if rdy else "  (%d%%)" % int(float(p.ready) * 100), str(p.get("desc", ""))]
		var armed: bool = B.armed == "power:" + str(p.key)
		b.add_theme_stylebox_override("normal", _steel(Color("3a3113") if armed else (Color("16303a") if rdy else Color("0c1418")), UI.GOLD_HI if armed or rdy else Color("33434a"), 2 if rdy else 1))
		b.add_theme_stylebox_override("hover", _steel(Color("1f4250"), UI.GOLD_HI, 2))
		b.add_theme_stylebox_override("pressed", _steel(Color("3a3113"), UI.GOLD_HI, 2))
		var l := UI.label(str(p.name), 12, UI.TEXT if rdy else UI.TEXT_DIM, "tight")
		l.position = Vector2(4, 2); l.size = Vector2(60, 40)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.add_theme_constant_override("line_spacing", -4)
		l.clip_text = true; l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(l)
		var pg := _progress(UI.GOLD_HI if rdy else UI.CYAN)
		pg.position = Vector2(3, 47); pg.size = Vector2(62, 5); pg.value = float(p.ready); pg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pg)
		var key: String = p.key
		b.pressed.connect(func(): B.arm_power(key); pow_sig = "")
		powers_col.add_child(b)

# ---------------------------------------------------------------- mission objectives, banner, tutorial
func _mission() -> void:
	var ms = B.mission
	mode_lbl.visible = ms == null and B.tut_i < 0
	if B.kind == "range": mode_lbl.text = "TEST RANGE · unlimited money, passive target"
	if ms == null:
		obj_panel.visible = false
		banner.text = ""
	else:
		obj_panel.visible = true
		var sig := str(ms.status)
		for ob in ms.m.obj: sig += "1" if ms.o[ob[0]] else "0"
		if sig != obj_sig:
			obj_sig = sig
			for c in obj_box.get_children(): c.free()
			obj_box.add_child(UI.label(str(ms.m.title).to_upper(), 16, UI.GOLD_HI, "display"))
			for ob in ms.m.obj:
				var done: bool = ms.o[ob[0]]
				var l := UI.para(("✓ " if done else "▸ ") + str(ob[1]), 12, Color("7fd79a") if done else UI.TEXT, 310)
				obj_box.add_child(l)
			if ms.status != null: obj_box.add_child(UI.para(str(ms.status), 12, UI.CYAN, 310))
		if not ms.flash.is_empty() and ms.t - float(ms.flash.t) < 6.0:
			banner.text = str(ms.flash.m)
			banner.add_theme_color_override("font_color", {"g": UI.GOLD_HI, "w": Color("ffb040"), "bad": Color("ff6a5a")}.get(str(ms.flash.k), UI.GOLD_HI))
			banner.modulate.a = clampf(6.0 - (ms.t - float(ms.flash.t)), 0, 1)
		else: banner.text = ""
		while feed_n < ms.said.size():
			var s: Array = ms.said[feed_n]; feed_n += 1
			say(str(s[1]), str(s[2]))
		if feed_n > ms.said.size(): feed_n = ms.said.size()
	tut_panel.visible = B.tut_i >= 0 and window == null
	if B.tut_i >= 0:
		var st: Array = Missions.TUT[B.tut_i]
		tut_n.text = "TUTORIAL · STEP %d/%d" % [B.tut_i + 1, Missions.TUT.size()]
		tut_t.text = st[1]
		tut_a.text = "▶ " + str(st[2])

# ---------------------------------------------------------------- minimap (green yours, red enemy, gray neutral, supply area)
func _mk() -> Vector2:
	var mw := float(B.map.MAPW); var mh := float(B.map.MAPH)
	var k := minf(MINI_W / mw, MINI_H / mh)
	return Vector2(k, k)

func _mo() -> Vector2:
	var k := _mk().x
	return Vector2((MINI_W - float(B.map.MAPW) * k) * 0.5, (MINI_H - float(B.map.MAPH) * k) * 0.5)

func _mini_bake() -> void:
	var map: Dictionary = B.map
	var k := _mk().x
	var w := int(float(map.MAPW) * k); var h := int(float(map.MAPH) * k)
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	var hmax := 1.0
	if map.get("hgrid") != null:
		for v in map.hgrid.a: hmax = maxf(hmax, float(v))
	var gw := int(map.GW); var cell := float(map.CELL)
	for y in h:
		for x in w:
			var wx := x / k; var wy := y / k
			var g: float = B.sim.ground_h(wx, wy) / hmax
			var c := Color(0.30, 0.31, 0.25).lerp(Color(0.52, 0.5, 0.4), g)
			var gi := int(wy / cell) * gw + int(wx / cell)
			if gi < map.grid.size():
				var ct := int(map.grid[gi])
				if ct == 3: c = Color(0.2, 0.2, 0.19)
				elif ct == 1 or ct == 4: c = Color(0.08, 0.2, 0.27)
				elif ct == 2: c = Color(0.3, 0.36, 0.38)
			if gi < map.wood.size() and int(map.wood[gi]) > 0: c = c.lerp(Color(0.16, 0.27, 0.15), 0.6)
			if B.sim.nav.P_ROAD and B.sim.nav.on_road(wx, wy): c = c.lerp(Color(0.62, 0.6, 0.52), 0.55)
			img.set_pixel(x, y, c)
	mini_tex = ImageTexture.create_from_image(img)

func _mini_draw() -> void:
	if B.sim == null or B.map.is_empty(): return
	if mini_tex == null: _mini_bake()
	var sim = B.sim
	var k := _mk().x; var o := _mo()
	mini.draw_rect(Rect2(Vector2.ZERO, Vector2(MINI_W, MINI_H)), Color(0.02, 0.04, 0.04))
	mini.draw_texture(mini_tex, o)
	# supply area: yours green, enemy red where you have seen it (lines when the sim has supply roads, else the circles)
	var sp: Array = B.supply_draw()
	for s in sp:
		if s.has("r"): mini.draw_arc(Vector2(s.x, s.y) * k + o, float(s.r) * k, 0, TAU, 20, s.col, 1.0)
		else: _mini_line(s.pts, k, o, s.col, bool(s.get("cut", false)))
	for f in sim.fields:
		if f.amt > 0: mini.draw_rect(Rect2(Vector2(f.x, f.y) * k + o - Vector2(2, 2), Vector2(4, 4)), Color(0.95, 0.85, 0.4))
	for oi in sim.oil:
		if oi.dead: continue
		mini.draw_circle(Vector2(oi.x, oi.y) * k + o, 2.5, B.team_col(int(oi.owner)))
	for e in sim.ents:
		if e.dead or not B.visible_ent(e): continue
		var c: Color = B.team_col(e.team)
		if B.bsel.has(e.id): c = Color(1, 1, 1)
		var p := Vector2(e.x, e.y) * k + o
		if e.is_b: mini.draw_rect(Rect2(p - Vector2(3, 3), Vector2(6, 6)), c)
		else: mini.draw_rect(Rect2(p - Vector2(1.2, 1.2), Vector2(2.4, 2.4)), c)
	if last_event != Vector2.INF and int(Time.get_ticks_msec() / 300) % 2 == 0 and alerts > 0:
		mini.draw_arc(last_event * k + o, 7.0, 0, TAU, 16, Color("ffb040"), 1.5)
	# camera view (a trapezoid that turns with Q)
	var vs := mini.get_viewport().get_visible_rect().size
	var pts: Array = []
	for s2 in [Vector2(0, 0), Vector2(vs.x, 0), Vector2(vs.x, vs.y - BAR_H), Vector2(0, vs.y - BAR_H)]:
		var g: Vector2 = B._ground_at(s2)
		if g == Vector2.INF: return
		pts.append(g * k + o)
	for i in 4: mini.draw_line(pts[i], pts[(i + 1) % 4], Color(1, 1, 1, 0.85), 1.0)

func _mini_line(pts: Array, k: float, o: Vector2, col: Color, cut: bool) -> void:
	for i in pts.size() - 1:
		var a: Vector2 = Vector2(pts[i][0], pts[i][1]) * k + o; var b: Vector2 = Vector2(pts[i + 1][0], pts[i + 1][1]) * k + o
		if cut: mini.draw_dashed_line(a, b, col, 1.5, 3.0)
		else: mini.draw_line(a, b, col, 1.5)

func mini_to_world(p: Vector2) -> Vector2:
	return (p - _mo()) / _mk().x

func _mini_input(ev: InputEvent) -> void:
	if not (ev is InputEventMouseButton or ev is InputEventMouseMotion) or B.sim == null: return
	var w := mini_to_world(ev.position)
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_RIGHT:
		B.order_at_world(w, ev.ctrl_pressed, ev.alt_pressed)
	elif (ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT) or (ev is InputEventMouseMotion and ev.button_mask & MOUSE_BUTTON_MASK_LEFT):
		B.cam_target = w

# ---------------------------------------------------------------- windows (one at a time; Esc closes)
func close_window() -> void:
	if window != null: window.queue_free()
	window = null; window_kind = ""
	if B.started and not B.sim.over and B.kind != "replay": B.set_paused(false)
	UI.lock_mouse(B.started and not B.sim.over)

func _open(kind: String, w: float, title: String) -> VBoxContainer:
	if window != null: window.free()
	window_kind = kind
	UI.lock_mouse(false)
	window = Control.new()
	window.name = "Window_" + kind
	window.set_anchors_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	window.add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	window.add_child(cc)
	var p := UI.panel(22)
	p.custom_minimum_size.x = w
	cc.add_child(p)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	p.add_child(vb)
	vb.add_child(UI.title(title, 30))
	vb.add_child(UI.hsep())
	layer.add_child(window)
	window.modulate.a = 0.0
	window.create_tween().tween_property(window, "modulate:a", 1.0, 0.15)
	return vb

func toggle_pause() -> void:
	if B.online != null: say("An online battle cannot be paused.", "w"); return
	B.set_paused(not B.paused)

func open_pause() -> void:
	if B.online == null: B.set_paused(true)
	var vb := _open("pause", 380, "Paused" if B.online == null else "Menu")
	var can_save: bool = B.online == null and B.kind in ["battle", "mission", "tutorial"] and not B.sim.over
	vb.add_child(UI.menu_item("Resume", close_window, 20, "", 340))
	var sv := UI.menu_item("Save game", func(): B.save_game(""); close_window(), 17, "", 340)
	sv.disabled = not can_save
	vb.add_child(sv)
	var ld := UI.menu_item("Load game", func(): open_load(), 17, "", 340)
	ld.disabled = B.online != null
	vb.add_child(ld)
	vb.add_child(UI.menu_item("Settings", open_settings, 17, "", 340))
	vb.add_child(UI.menu_item("Controls", open_help, 17, "", 340))
	if B.online == null: vb.add_child(UI.menu_item("Restart", func(): B.restart(), 17, "", 340))
	vb.add_child(UI.menu_item("Surrender and leave" if B.online != null else "Exit to menu", func(): B.leave(), 17, "", 340))

func open_load() -> void:
	var vb := _open("load", 520, "Load game")
	var files := UI.list_files("saves")
	if files.is_empty(): vb.add_child(UI.para("No saved battles yet.", 13))
	for i in mini(files.size(), 8):
		var f: Dictionary = files[i]
		var path: String = f.path
		vb.add_child(UI.menu_item(f.name, func(): B.load_file(path), 16, "%s · %s · %s" % [UI.nat_name(f.fac), UI.fmt_time(f.t), UI.fmt_when(f.when)], 480))
	vb.add_child(UI.button("Back", open_pause, 14))

func open_settings() -> void:
	var vb := _open("settings", 460, "Settings")
	for it in [["Master volume", "vol_master"], ["Music", "vol_music"], ["Battle sounds", "vol_sfx"], ["Unit voices", "vol_voice"], ["Scroll speed", "scroll_speed"]]:
		var hb := HBoxContainer.new()
		var l := UI.label(str(it[0]).to_upper(), 12, UI.TEXT_DIM); l.custom_minimum_size.x = 150
		var s := HSlider.new()
		s.min_value = 0.4 if it[1] == "scroll_speed" else 0.0; s.max_value = 2.0 if it[1] == "scroll_speed" else 1.0; s.step = 0.05
		s.value = float(UI.opt(it[1])); s.custom_minimum_size = Vector2(230, 20); s.focus_mode = Control.FOCUS_NONE
		var key: String = it[1]
		s.value_changed.connect(func(v): UI.set_opt(key, v))
		hb.add_child(l); hb.add_child(s); vb.add_child(hb)
	for it in [["mouse_lock", "Keep the mouse inside the window"], ["edge_scroll", "Scroll at the screen edges"], ["deselect_after_order", "Deselect units after an order"], ["show_fps", "Show frames per second"]]:
		var c := CheckButton.new()
		c.text = it[1]; c.button_pressed = bool(UI.opt(it[0])); c.focus_mode = Control.FOCUS_NONE
		c.add_theme_font_override("font", UI.font("mono")); c.add_theme_font_size_override("font_size", 13)
		var key: String = it[0]
		c.toggled.connect(func(v): UI.set_opt(key, v))
		vb.add_child(c)
	vb.add_child(UI.button("Back", open_pause, 14))

func open_help() -> void:
	if B.online == null: B.set_paused(true)
	var vb := _open("help", 640, "Controls")
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 16); g.add_theme_constant_override("v_separation", 2)
	for k in Missions.KEYS:
		g.add_child(UI.label(k[0], 12, UI.GOLD))
		g.add_child(UI.para(k[1], 12, UI.TEXT, 420))
	vb.add_child(g)
	vb.add_child(UI.button("Close", close_window, 14))

## Generals' powers: rank, points to spend, the nation's powers
func open_powers() -> void:
	if window_kind == "powers": close_window(); return
	var vb := _open("powers", 620, "Generals' powers")
	var sim = B.sim
	var T: Dictionary = sim.teams[B.me]
	var ranks: Array = sim.R.RANKS
	var rk := int(T.rank)
	var nxt := float(ranks[rk]) if rk < ranks.size() else 0.0
	vb.add_child(UI.label("RANK %d   ·   %d POINT%s TO SPEND" % [rk, B.gp_points(), "" if B.gp_points() == 1 else "S"], 18, UI.TEXT, "display"))
	if nxt > 0:
		var pg := _progress(UI.GOLD_HI)
		pg.custom_minimum_size = Vector2(560, 8)
		pg.value = clampf((float(T.gxp) - float(ranks[rk - 1])) / maxf(1.0, nxt - float(ranks[rk - 1])), 0, 1)
		vb.add_child(pg)
		vb.add_child(UI.label("Next rank at %d experience (you have %d). Destroying enemy units and buildings earns it." % [int(nxt), int(T.gxp)], 12, UI.TEXT_DIM))
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 10); g.add_theme_constant_override("v_separation", 8)
	vb.add_child(g)
	for p in B.gpow_list():
		var have: bool = p.have
		var can: bool = p.can
		var b := UI.menu_item(str(p.name), func(): B.buy_gpow(str(p.key)); open_powers(); open_powers(), 16, ("OWNED · " if have else ("" if can else "LOCKED · ")) + str(p.desc), 290)
		b.name = "GP_" + str(p.key)
		b.disabled = have or not can
		b.tooltip_text = str(p.desc)
		g.add_child(b)
	if not B.sim_has("gpow"): vb.add_child(UI.para("Generals' powers arrive with the powers system of the battle rules; ranks already count.", 12))
	vb.add_child(UI.button("Close", close_window, 14))

## end of battle: Victory / Defeat + the stats table of every player
func open_end(won: bool, head: String, sub: String) -> void:
	var vb := _open("end", 760, head)
	(vb.get_child(0) as Label).add_theme_color_override("font_color", UI.GOLD_HI if won else Color("ff6a5a"))
	vb.add_child(UI.para(sub, 14, UI.TEXT, 700))
	var sim = B.sim
	var g := GridContainer.new()
	g.name = "Stats"
	g.columns = 8
	g.add_theme_constant_override("h_separation", 20); g.add_theme_constant_override("v_separation", 4)
	for h in ["Player", "Team", "Units built", "Units lost", "Kills", "Buildings", "Earned", "Spent"]: g.add_child(UI.label(h.to_upper(), 12, UI.TEXT_DIM))
	var info: Dictionary = sim.info()
	for T in sim.teams:
		var nm := "%s%s" % [str(T.F.name), "  (you)" if T.id == B.me else ""]
		var l := UI.label(nm.to_upper(), 16, B.team_col(T.id), "display")
		g.add_child(l)
		g.add_child(UI.label(str(T.tm) if int(T.tm) < 100 else "-", 14))
		g.add_child(UI.label(str(int(T.built)), 14)); g.add_child(UI.label(str(int(T.lost)), 14)); g.add_child(UI.label(str(int(T.kills)), 14))
		g.add_child(UI.label(str(info.per[T.id].blds), 14))
		g.add_child(UI.label("$" + _commas(int(T.earned)), 14)); g.add_child(UI.label("$" + _commas(int(T.spent)), 14))
	vb.add_child(g)
	vb.add_child(UI.label("TIME %s   ·   %s" % [UI.fmt_time(sim.t), str(B.map.get("name", B.map_key)).to_upper()], 14, UI.CYAN, "display"))
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	hb.alignment = BoxContainer.ALIGNMENT_END
	if B.online == null: hb.add_child(UI.button("Play again", func(): B.restart(), 16))
	if B.kind != "replay" and B.online == null: hb.add_child(UI.button("Watch the replay", func(): B.watch_last_replay(), 16))
	var mb := UI.button("Main menu", func(): B.leave(), 18, 0, true)
	mb.name = "ToMenu"
	hb.add_child(mb)
	vb.add_child(hb)
