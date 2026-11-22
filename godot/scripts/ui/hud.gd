## BATTLE HUD (lane P6) - Command & Conquer: Generals - Zero Hour unified bottom control bar:
## left wing = framed radar minimap with animated alert ripples + 4 flush tactical buttons (MENU, SUP, ALERT, GEN);
## center wing = integrated top status bezel (selection, cash, supply, army, power) + classic 2x6 Zero Hour cameo grid + queue;
## right wing = rank-accented portrait & HP status card + vertical segmented Zero Hour power gauge;
## clean docked overlays = ready powers rail above right wing, flush HIDE/pause tabs, context hint strip, top-left radio feed pills.
## It only reads the battle (B) and sends orders through B.cmd().
extends Node

const UI = preload("res://scripts/ui/ui_kit.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const BAR_H := 178.0
const MINI_W := 214.0
const MINI_H := 154.0
const STEEL := Color("0e171c")
const STEEL_HI := Color("36515c")
const STEEL_TOP := Color("4f7280")
const WELL := Color("080f14")
const SLOT_BG := Color("122128")
const SLOT_EMPTY := Color("0a1217")
const SLOT_EMPTY_EDGE := Color("1e3038")
const GREEN_BTN := Color("1d6e39")
const COLS := 6

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
var pw_ticks: Control
var chip_money: Label
var chip_sup: Label
var chip_alert: Label
var sup_btn: Button
var alert_btn: Button
var pause_btn: Button
var hide_btn: Button
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
var _sup_on := false
var _alert_lit := false
var _gen_lit := false
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

# ---------------------------------------------------------------- Zero Hour steel style helpers
func _steel(bg: Color, edge: Color, bw: int = 1, rad: int = 2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg; sb.border_color = edge
	sb.set_border_width_all(bw); sb.set_corner_radius_all(rad)
	return sb

func _tac_btn(txt: String, on: Callable, tip: String, w: float = 56.0, h: float = 36.0) -> Button:
	var b := Button.new()
	b.text = txt
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = tip
	b.custom_minimum_size = Vector2(w, h)
	b.add_theme_font_override("font", UI.font("bold"))
	b.add_theme_font_size_override("font_size", 13)
	b.add_theme_color_override("font_color", UI.TEXT)
	b.add_theme_color_override("font_hover_color", UI.GOLD_HI)
	b.add_theme_color_override("font_pressed_color", UI.GOLD_HI)
	_style_tac(b, Color("132028"), STEEL_HI, UI.TEXT)
	b.pressed.connect(on)
	return b

func _style_tac(b: Button, bg: Color, edge: Color, txt_col: Color) -> void:
	var n := _steel(bg, edge, 1, 2); n.border_width_top = 2
	var hv := _steel(bg.lightened(0.12), UI.GOLD, 1, 2); hv.border_width_top = 2
	var pr := _steel(Color("2b2310"), UI.GOLD_HI, 1, 2); pr.border_width_top = 2
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", hv)
	b.add_theme_stylebox_override("pressed", pr)
	b.add_theme_color_override("font_color", txt_col)

func _tab_btn(txt: String, on: Callable, tip: String) -> Button:
	var b := Button.new()
	b.text = txt
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = tip
	b.add_theme_font_override("font", UI.font("bold"))
	b.add_theme_font_size_override("font_size", 11)
	b.add_theme_color_override("font_color", Color("b6c8cc"))
	b.add_theme_color_override("font_hover_color", UI.GOLD_HI)
	var n := _steel(Color("0e171c"), STEEL_HI, 1, 0)
	n.corner_radius_top_left = 3; n.corner_radius_top_right = 3; n.border_width_bottom = 0
	var hv := _steel(Color("192a33"), UI.GOLD, 1, 0)
	hv.corner_radius_top_left = 3; hv.corner_radius_top_right = 3; hv.border_width_bottom = 0
	var pr := _steel(Color("2b2310"), UI.GOLD_HI, 1, 0)
	pr.corner_radius_top_left = 3; pr.corner_radius_top_right = 3; pr.border_width_bottom = 0
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", hv)
	b.add_theme_stylebox_override("pressed", pr)
	b.pressed.connect(on)
	return b

func _vdiv() -> ColorRect:
	var r := ColorRect.new()
	r.color = STEEL_HI
	r.custom_minimum_size = Vector2(1, 16)
	r.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r

# ---------------------------------------------------------------- bottom Zero Hour control bar
func _bar() -> void:
	bar = Panel.new()
	bar.name = "Bar"
	bar.anchor_top = 1.0; bar.anchor_bottom = 1.0; bar.anchor_right = 1.0
	bar.offset_top = -BAR_H
	var sb := _steel(STEEL, STEEL_TOP, 0, 0)
	sb.border_width_top = 2
	bar.add_theme_stylebox_override("panel", sb)
	root.add_child(bar)

	# ---- LEFT WING: Framed Radar Minimap + 4 flush tactical buttons
	var mf := Panel.new()
	mf.position = Vector2(8, 10); mf.size = Vector2(MINI_W + 6, MINI_H + 6)
	var mfs := _steel(WELL, STEEL_HI, 2, 2); mfs.border_color = Color("446572")
	mf.add_theme_stylebox_override("panel", mfs)
	bar.add_child(mf)
	mini = Control.new()
	mini.name = "Minimap"
	mini.position = Vector2(3, 3); mini.size = Vector2(MINI_W, MINI_H)
	mini.clip_contents = true
	mini.draw.connect(_mini_draw)
	mini.gui_input.connect(_mini_input)
	mf.add_child(mini)

	# 4 flush military steel buttons right beside radar: MENU, SUP, ALERT, GEN
	var mb := _tac_btn("MENU", func(): open_pause(), "Menu / Options / Sound (Esc)")
	mb.name = "MenuBtn"
	mb.position = Vector2(232, 12); mb.size = Vector2(56, 36)
	bar.add_child(mb)

	sup_btn = _tac_btn("SUP", func(): B.toggle_supply(), "Toggle supply lines on the ground (L)")
	sup_btn.name = "SupBtn"
	sup_btn.position = Vector2(232, 52); sup_btn.size = Vector2(56, 36)
	bar.add_child(sup_btn)

	alert_btn = _tac_btn("", func():
		if last_event != Vector2.INF:
			B.cam_target = last_event
			alerts = 0, "Jump to last tactical alert (Space)")
	alert_btn.name = "AlertBtn"
	alert_btn.position = Vector2(232, 92); alert_btn.size = Vector2(56, 36)
	var al_cap := UI.label("ALERT", 9, Color("86a2ab"), "tight")
	al_cap.position = Vector2(0, 2); al_cap.size = Vector2(56, 12)
	al_cap.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	al_cap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	alert_btn.add_child(al_cap)
	chip_alert = UI.label("! 0", 14, UI.TEXT_DIM, "bold")
	chip_alert.position = Vector2(0, 14); chip_alert.size = Vector2(56, 20)
	chip_alert.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	chip_alert.mouse_filter = Control.MOUSE_FILTER_IGNORE
	alert_btn.add_child(chip_alert)
	bar.add_child(alert_btn)

	star_btn = _tac_btn("GEN", func(): open_powers(), "Generals' Powers (P)")
	star_btn.name = "StarBtn"
	star_btn.position = Vector2(232, 132); star_btn.size = Vector2(56, 36)
	bar.add_child(star_btn)

	# ---- CENTER WING: Integrated Status Bezel + Classic 2x6 Zero Hour Cameo Grid
	var ca := Panel.new()
	ca.name = "Cmd"
	ca.anchor_right = 1.0
	ca.offset_left = 294; ca.offset_right = -222; ca.offset_top = 10; ca.offset_bottom = 170
	ca.add_theme_stylebox_override("panel", _steel(Color("0b1318"), STEEL_HI, 2, 2))
	bar.add_child(ca)

	var cv := VBoxContainer.new()
	cv.set_anchors_preset(Control.PRESET_FULL_RECT)
	cv.offset_left = 2; cv.offset_top = 2; cv.offset_right = -2; cv.offset_bottom = -2
	cv.add_theme_constant_override("separation", 3)
	ca.add_child(cv)

	# Integrated Top Status Bezel (height = 28px) inside the center frame
	var hdr := PanelContainer.new()
	hdr.name = "Plate"
	hdr.custom_minimum_size.y = 28
	var hs := _steel(Color("081016"), STEEL_HI, 0, 0)
	hs.border_width_bottom = 1
	hs.content_margin_left = 8; hs.content_margin_right = 8; hs.content_margin_top = 2; hs.content_margin_bottom = 2
	hdr.add_theme_stylebox_override("panel", hs)
	cv.add_child(hdr)

	var th := HBoxContainer.new()
	th.add_theme_constant_override("separation", 8)
	th.alignment = BoxContainer.ALIGNMENT_CENTER
	hdr.add_child(th)

	cmd_title = UI.label("TACTICAL COMMAND", 15, UI.GOLD_HI, "bold")
	cmd_title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cmd_sub = UI.label("", 11, Color("86a6b0"))
	cmd_sub.clip_text = true
	cmd_sub.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cmd_sub.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	th.add_child(cmd_title)
	th.add_child(cmd_sub)

	plate_money = UI.label("$0", 17, UI.GOLD_HI, "bold")
	plate_money.name = "Money"
	plate_money.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	chip_money = plate_money
	th.add_child(_vdiv())
	th.add_child(plate_money)

	chip_sup = UI.label("SUPPLY OK", 12, UI.GREEN, "tight")
	chip_sup.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	th.add_child(_vdiv())
	th.add_child(chip_sup)

	plate_pop = UI.label("0/0", 12, UI.TEXT, "tight")
	plate_pop.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	th.add_child(_vdiv())
	th.add_child(plate_pop)

	plate_pw = UI.label("PWR 0/0", 12, UI.TEXT, "tight")
	plate_pw.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	pw_bar = _progress(Color("38d65a"))
	pw_bar.custom_minimum_size = Vector2(48, 6)
	pw_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	th.add_child(_vdiv())
	th.add_child(plate_pw)
	th.add_child(pw_bar)

	# 2-Row Cameo Grid + docked Production Queue strip
	var grid_pad := MarginContainer.new()
	grid_pad.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid_pad.add_theme_constant_override("margin_left", 4)
	grid_pad.add_theme_constant_override("margin_right", 4)
	grid_pad.add_theme_constant_override("margin_bottom", 3)
	cv.add_child(grid_pad)

	var hb2 := HBoxContainer.new()
	hb2.add_theme_constant_override("separation", 6)
	hb2.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hb2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_pad.add_child(hb2)

	cmd_grid = GridContainer.new()
	cmd_grid.name = "Grid"
	cmd_grid.columns = COLS
	cmd_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cmd_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cmd_grid.add_theme_constant_override("h_separation", 4)
	cmd_grid.add_theme_constant_override("v_separation", 4)
	hb2.add_child(cmd_grid)

	queue_row = HBoxContainer.new()
	queue_row.name = "Queue"
	queue_row.add_theme_constant_override("separation", 3)
	queue_row.alignment = BoxContainer.ALIGNMENT_END
	queue_row.visible = false
	hb2.add_child(queue_row)

	# ---- RIGHT WING: Unit Portrait & Status Card + Classic Vertical Zero Hour Power Gauge
	var pf := Panel.new()
	pf.name = "Portrait"
	pf.anchor_left = 1.0; pf.anchor_right = 1.0
	pf.offset_left = -214; pf.offset_right = -36; pf.offset_top = 10; pf.offset_bottom = 170
	pf.add_theme_stylebox_override("panel", _steel(Color("0b1318"), STEEL_HI, 2, 2))
	bar.add_child(pf)

	var pwell := Panel.new()
	pwell.position = Vector2(6, 6); pwell.size = Vector2(166, 90)
	pwell.add_theme_stylebox_override("panel", _steel(WELL, Color("243840"), 1, 2))
	pf.add_child(pwell)

	port_pic = TextureRect.new()
	port_pic.position = Vector2(2, 2); port_pic.size = Vector2(162, 86)
	port_pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	port_pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	pwell.add_child(port_pic)

	port_name = UI.label("", 15, UI.TEXT, "bold")
	port_name.position = Vector2(8, 98); port_name.size = Vector2(162, 20); port_name.clip_text = true
	pf.add_child(port_name)

	port_hp = _progress(Color("38d65a"))
	port_hp.position = Vector2(8, 120); port_hp.size = Vector2(162, 7)
	pf.add_child(port_hp)

	port_info = UI.label("", 11, UI.TEXT_DIM)
	port_info.position = Vector2(8, 130); port_info.size = Vector2(162, 26); port_info.clip_text = true
	pf.add_child(port_info)

	# Classic Zero Hour Vertical Power Gauge (20 x 154) with subtle segment tick marks
	pw_meter = _progress(Color("38d65a"))
	pw_meter.fill_mode = ProgressBar.FILL_BOTTOM_TO_TOP
	pw_meter.anchor_left = 1.0; pw_meter.anchor_right = 1.0
	pw_meter.offset_left = -28; pw_meter.offset_right = -8; pw_meter.offset_top = 12; pw_meter.offset_bottom = 166
	pw_meter.tooltip_text = "Power: made / used"
	bar.add_child(pw_meter)

	pw_ticks = Control.new()
	pw_ticks.set_anchors_preset(Control.PRESET_FULL_RECT)
	pw_ticks.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pw_ticks.draw.connect(_draw_pw_ticks)
	pw_meter.add_child(pw_ticks)

	# ---- CLEAN DOCKED BAR TABS & CONTEXT HINT (flush with top edge of bottom bar)
	hint_lbl = UI.label("", 12, Color(0.86, 0.90, 0.88, 0.88))
	hint_lbl.anchor_top = 1.0; hint_lbl.anchor_bottom = 1.0
	hint_lbl.offset_left = 8; hint_lbl.offset_top = -BAR_H - 22; hint_lbl.offset_right = 580; hint_lbl.offset_bottom = -BAR_H - 1
	hint_lbl.clip_text = true
	var hsb := _steel(Color(0.04, 0.07, 0.09, 0.78), Color("2c414a"), 1, 2)
	hsb.content_margin_left = 8; hsb.content_margin_right = 8
	hint_lbl.add_theme_stylebox_override("normal", hsb)
	hint_lbl.visible = false
	root.add_child(hint_lbl)

	pause_btn = _tab_btn("II", func(): toggle_pause(), "Pause / Resume (Pause)")
	pause_btn.name = "PauseBtn"
	pause_btn.anchor_left = 1.0; pause_btn.anchor_right = 1.0; pause_btn.anchor_top = 1.0; pause_btn.anchor_bottom = 1.0
	pause_btn.offset_left = -92; pause_btn.offset_right = -56; pause_btn.offset_top = -BAR_H - 22; pause_btn.offset_bottom = -BAR_H
	root.add_child(pause_btn)

	hide_btn = _tab_btn("HIDE", func(): _toggle_collapse(), "Hide / show command bar")
	hide_btn.name = "HideBtn"
	hide_btn.anchor_left = 1.0; hide_btn.anchor_right = 1.0; hide_btn.anchor_top = 1.0; hide_btn.anchor_bottom = 1.0
	hide_btn.offset_left = -54; hide_btn.offset_right = -8; hide_btn.offset_top = -BAR_H - 22; hide_btn.offset_bottom = -BAR_H
	root.add_child(hide_btn)

func _toggle_collapse() -> void:
	collapsed = not collapsed
	bar.visible = not collapsed
	hide_btn.text = "SHOW" if collapsed else "HIDE"
	var y_bot := 0.0 if collapsed else -BAR_H
	hide_btn.offset_top = y_bot - 22.0; hide_btn.offset_bottom = y_bot
	pause_btn.offset_top = y_bot - 22.0; pause_btn.offset_bottom = y_bot
	hint_lbl.offset_top = y_bot - 22.0; hint_lbl.offset_bottom = y_bot - 1.0
	powers_col.offset_bottom = y_bot - 28.0; powers_col.offset_top = y_bot - 360.0

func _draw_pw_ticks() -> void:
	var sz := pw_ticks.size
	var y := 11.0
	while y < sz.y - 4.0:
		pw_ticks.draw_line(Vector2(1, y), Vector2(sz.x - 1, y), Color(0.03, 0.05, 0.07, 0.72), 1.5)
		y += 11.0

func _progress(col: Color) -> ProgressBar:
	var p := ProgressBar.new()
	p.show_percentage = false
	p.max_value = 1.0
	p.mouse_filter = Control.MOUSE_FILTER_PASS
	var bg := StyleBoxFlat.new(); bg.bg_color = Color(0.03, 0.05, 0.07); bg.border_color = STEEL_HI; bg.set_border_width_all(1)
	var fg := StyleBoxFlat.new(); fg.bg_color = col
	p.add_theme_stylebox_override("background", bg)
	p.add_theme_stylebox_override("fill", fg)
	return p

# ---------------------------------------------------------------- clean top overlays (only when needed) & top-left radio feed
func _top() -> void:
	# Subtle mode indicator: hidden during normal battle, only visible in TEST RANGE or REPLAY
	mode_lbl = UI.label("", 13, Color(0.92, 0.94, 0.92, 0.88), "bold")
	mode_lbl.anchor_left = 0.5; mode_lbl.anchor_right = 0.5
	mode_lbl.offset_left = -280; mode_lbl.offset_right = 280; mode_lbl.offset_top = 8
	mode_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mode_lbl.add_theme_constant_override("outline_size", 4)
	mode_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	mode_lbl.visible = false
	root.add_child(mode_lbl)

	banner = UI.label("", 20, UI.GOLD_HI, "display")
	banner.anchor_left = 0.5; banner.anchor_right = 0.5
	banner.offset_left = -480; banner.offset_right = 480; banner.offset_top = 64
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
	tut_panel.offset_left = -300; tut_panel.offset_right = 300; tut_panel.offset_top = 48
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

	# Tactical Radio Feed: top-left below FPS, sleek dark translucent micro-pills
	feed = VBoxContainer.new()
	feed.name = "Feed"
	feed.offset_left = 10; feed.offset_top = 34; feed.offset_right = 540; feed.offset_bottom = 250
	feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	feed.add_theme_constant_override("separation", 3)
	root.add_child(feed)

	replay_lbl = UI.label("", 14, UI.CYAN, "display")
	replay_lbl.anchor_left = 0.5; replay_lbl.anchor_right = 0.5
	replay_lbl.offset_left = -320; replay_lbl.offset_right = 320; replay_lbl.offset_top = 32
	replay_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	replay_lbl.add_theme_constant_override("outline_size", 4)
	replay_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	root.add_child(replay_lbl)

func _side() -> void:
	# Ready Generals' powers / Strike rail: docked vertically above the right wing of the bottom bar
	powers_col = VBoxContainer.new()
	powers_col.name = "Powers"
	powers_col.anchor_left = 1.0; powers_col.anchor_right = 1.0
	powers_col.anchor_top = 1.0; powers_col.anchor_bottom = 1.0
	powers_col.offset_left = -82; powers_col.offset_right = -8
	powers_col.offset_top = -BAR_H - 360; powers_col.offset_bottom = -BAR_H - 28
	powers_col.alignment = BoxContainer.ALIGNMENT_END
	powers_col.add_theme_constant_override("separation", 5)
	powers_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	powers_col.visible = false
	root.add_child(powers_col)

func say(msg: String, kind: String = "g") -> void:
	var txt_col: Color = {"g": Color("c8f2d0"), "w": Color("ffe098"), "bad": Color("ffaaa0")}.get(kind, UI.TEXT)
	var accent: Color = {"g": Color("38d65a"), "w": Color("f0a828"), "bad": Color("e84038")}.get(kind, UI.CYAN)
	var pill := PanelContainer.new()
	pill.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var ps := StyleBoxFlat.new()
	ps.bg_color = Color(0.04, 0.07, 0.09, 0.86)
	ps.border_color = accent
	ps.border_width_left = 3
	ps.border_width_top = 0; ps.border_width_right = 0; ps.border_width_bottom = 0
	ps.corner_radius_top_right = 3; ps.corner_radius_bottom_right = 3
	ps.content_margin_left = 9; ps.content_margin_right = 10
	ps.content_margin_top = 2; ps.content_margin_bottom = 2
	pill.add_theme_stylebox_override("panel", ps)
	var l := UI.label(msg, 13, txt_col)
	l.add_theme_constant_override("outline_size", 2)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pill.add_child(l)
	pill.set_meta("t", Time.get_ticks_msec())
	feed.add_child(pill)
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
	plate_pw.text = "PWR %d/%d" % [int(pw.y), int(pw.x)]
	plate_pw.add_theme_color_override("font_color", Color("ff6c5c") if low else UI.TEXT)
	pw_bar.value = clampf(pw.y / maxf(1.0, pw.x), 0, 1)
	pw_meter.value = clampf((pw.x - pw.y) / maxf(1.0, pw.x), 0, 1) if not low else 0.04
	for p in [pw_bar, pw_meter]:
		(p.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = Color("e84038") if low else Color("38d65a")

	var money := "INF" if B.kind == "range" else "$" + _commas(int(T.credits))
	plate_money.text = money
	plate_pop.text = "%d/%d" % [sim.pop_used(B.me, false), sim.pop_cap()]

	var sup = B.supply_state()
	var sup_txt := str(sup[0])
	if sup_txt == "Supply lines OK": sup_txt = "SUPPLY OK"
	chip_sup.text = sup_txt
	chip_sup.add_theme_color_override("font_color", sup[1])

	chip_alert.text = "! %d" % alerts
	chip_alert.add_theme_color_override("font_color", Color("ffb848") if alerts > 0 else UI.TEXT_DIM)

	# Glow states on the 4 flush Zero Hour sidebar buttons
	var sup_now: bool = bool(B.show_supply)
	if sup_now != _sup_on:
		_sup_on = sup_now
		if sup_now: _style_tac(sup_btn, GREEN_BTN, Color("6ce88e"), Color("e2ffea"))
		else: _style_tac(sup_btn, Color("132028"), STEEL_HI, UI.TEXT)

	var al_now: bool = alerts > 0
	if al_now != _alert_lit:
		_alert_lit = al_now
		if al_now: _style_tac(alert_btn, Color("38240e"), Color("f0a828"), Color("ffd88a"))
		else: _style_tac(alert_btn, Color("132028"), STEEL_HI, UI.TEXT)

	var gp_now: bool = B.gp_points() > 0
	if gp_now != _gen_lit:
		_gen_lit = gp_now
		if gp_now: _style_tac(star_btn, Color("42320e"), UI.GOLD_HI, UI.GOLD_HI)
		else: _style_tac(star_btn, Color("132028"), STEEL_HI, UI.TEXT)

	pause_btn.text = "|>" if B.paused else "II"

	if B.kind == "replay":
		replay_lbl.text = "REPLAY | %s | x%s%s | Space pause, +/- speed, Esc menu" % [UI.fmt_time(sim.t), str(B.replay_speed), " (PAUSED)" if B.paused else ""]
	elif B.paused and window == null:
		replay_lbl.text = "PAUSED"
	else:
		replay_lbl.text = ""

	mini_t -= dt
	if mini_t <= 0.0:
		mini_t = 0.08 if alerts > 0 else 0.15
		mini.queue_redraw()

	var ht: String = B.hint_text()
	hint_lbl.text = ht
	hint_lbl.visible = ht != ""

	var now := Time.get_ticks_msec()
	for l in feed.get_children():
		var age := (now - int(l.get_meta("t"))) / 1000.0
		l.modulate.a = clampf(9.0 - age, 0.0, 1.0)
		if age > 9.0: l.queue_free()

	_cmd_bar()
	_portrait()
	_powers()
	_mission()

func _commas(n: int) -> String:
	var s := str(absi(n)); var out := ""
	while s.length() > 3: out = "," + s.substr(s.length() - 3) + out; s = s.substr(0, s.length() - 3)
	return ("-" if n < 0 else "") + s + out

# ---------------------------------------------------------------- command area (Zero Hour 2x6 cameo grid)
func _empty_slot() -> Panel:
	var p := Panel.new()
	p.custom_minimum_size = Vector2(96, 58)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := _steel(SLOT_EMPTY, SLOT_EMPTY_EDGE, 1, 2)
	sb.border_width_top = 1
	p.add_theme_stylebox_override("panel", sb)
	return p

## a Zero Hour cameo button: framed artwork on left, name + gold price on right, count badge, progress bar
func _cameo_btn(it: Dictionary) -> Button:
	var b := Button.new()
	b.name = "Cmd_" + str(it.get("id", it.label))
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(96, 58)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.size_flags_vertical = Control.SIZE_EXPAND_FILL
	b.disabled = not bool(it.get("ok", true))
	b.tooltip_text = str(it.get("tip", ""))
	b.clip_contents = true
	var n_sb := _steel(SLOT_BG, STEEL_HI, 1, 2); n_sb.border_width_top = 2
	var h_sb := _steel(Color("1b333d"), UI.GOLD, 1, 2); h_sb.border_width_top = 2
	var p_sb := _steel(Color("332910"), UI.GOLD_HI, 2, 2)
	var d_sb := _steel(Color("0a1115"), Color("223037"), 1, 2)
	b.add_theme_stylebox_override("normal", p_sb if bool(it.get("on", false)) else n_sb)
	b.add_theme_stylebox_override("hover", h_sb)
	b.add_theme_stylebox_override("pressed", p_sb)
	b.add_theme_stylebox_override("disabled", d_sb)

	var tex = B.cameo(str(it.get("cameo", "")))
	if tex != null:
		var tr := TextureRect.new()
		tr.texture = tex
		tr.position = Vector2(3, 4); tr.size = Vector2(44, 50)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if b.disabled: tr.modulate = Color(0.42, 0.44, 0.46)
		b.add_child(tr)

	var tx := 50.0 if tex != null else 7.0
	var nm := UI.label(str(it.label), 13, UI.TEXT if not b.disabled else Color(0.48, 0.54, 0.54), "tight")
	nm.anchor_right = 1.0
	nm.offset_left = tx; nm.offset_top = 3; nm.offset_right = -4; nm.offset_bottom = 38
	nm.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nm.add_theme_constant_override("line_spacing", -4)
	nm.max_lines_visible = 2
	nm.clip_text = true
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(nm)

	if str(it.get("price", "")) != "":
		var pr := UI.label(str(it.price), 12, UI.GOLD_HI if not b.disabled else Color(0.55, 0.48, 0.32), "bold")
		pr.position = Vector2(tx, 39); pr.size = Vector2(72, 16)
		pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pr)

	var mark_s := str(it.get("mark", ""))
	if mark_s == "✓": mark_s = "OK"
	if mark_s != "":
		var mk := UI.label(mark_s, 14, Color(1, 1, 1), "bold")
		mk.add_theme_constant_override("outline_size", 4); mk.add_theme_color_override("font_outline_color", Color(0, 0, 0))
		mk.anchor_left = 1.0; mk.anchor_right = 1.0; mk.anchor_top = 1.0; mk.anchor_bottom = 1.0
		mk.offset_left = -30; mk.offset_right = -4; mk.offset_top = -22; mk.offset_bottom = -2
		mk.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		mk.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(mk)

	if it.has("prog"):
		var pg := _progress(UI.GOLD_HI)
		pg.anchor_right = 1.0; pg.anchor_top = 1.0; pg.anchor_bottom = 1.0
		pg.offset_left = 2; pg.offset_right = -2; pg.offset_top = -5; pg.offset_bottom = -1
		pg.value = float(it.prog)
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
	var queue: Array = d.get("queue", [])
	var sig := str(d.get("title", "")) + "|" + str(d.get("sub", ""))
	for it in items: sig += "%s|%s|%s|%s|%s;" % [it.label, it.get("ok", true), it.get("mark", ""), it.get("on", false), int(float(it.get("prog", 0)) * 20)]
	for q in queue: sig += "q%s%d" % [q.kind, int(float(q.p) * 25)]
	sig += str(B.cameo_ver)
	if sig == cmd_sig: return
	cmd_sig = sig

	var title_s := str(d.get("title", "")).to_upper()
	cmd_title.text = title_s if title_s != "" else "TACTICAL COMMAND"
	cmd_sub.text = str(d.get("sub", ""))

	var cols := 7 if items.size() > COLS * 2 else COLS
	var slots := cols * 2
	cmd_grid.columns = cols
	for c in cmd_grid.get_children(): c.free()
	var shown := mini(items.size(), slots)
	for i in shown:
		cmd_grid.add_child(_cameo_btn(items[i]))
	for i in range(shown, slots):
		cmd_grid.add_child(_empty_slot())

	for c in queue_row.get_children(): c.free()
	queue_row.visible = not queue.is_empty()
	var qn := 0
	for q in queue:
		if qn >= 5: break
		var qb := _cameo_btn({label = "", cameo = q.cameo, id = "q%d" % qn, tip = "%s - right-click cancels" % q.name, on_right = q.cancel, prog = q.p if qn == 0 else 0.0})
		qb.custom_minimum_size = Vector2(44, 58)
		qb.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		for ch in qb.get_children():
			if ch is TextureRect: ch.position = Vector2(2, 3); ch.size = Vector2(40, 48)
			elif ch is Label: ch.visible = false
		queue_row.add_child(qb)
		qn += 1

func _portrait() -> void:
	var p: Dictionary = B.portrait()
	var nm := str(p.get("name", "")).to_upper()
	var info_s := str(p.get("info", ""))
	port_name.text = nm
	port_info.text = info_s

	# Rank badge color accent on selection name
	var lo := info_s.to_lower()
	var nm_col: Color = UI.TEXT
	if "heroic" in lo: nm_col = UI.GOLD_HI
	elif "elite" in lo: nm_col = UI.GOLD
	elif "veteran" in lo: nm_col = UI.CYAN
	port_name.add_theme_color_override("font_color", nm_col)

	port_hp.visible = p.has("hp")
	if p.has("hp"):
		var f := clampf(float(p.hp), 0.0, 1.0)
		port_hp.value = f
		# Crisp smooth green -> amber -> red ramp (>0.6 green, 0.3..0.6 amber, <0.3 red)
		var hp_col: Color
		if f > 0.6:
			hp_col = Color("f0a828").lerp(Color("38d65a"), clampf((f - 0.6) / 0.15, 0.0, 1.0))
		elif f >= 0.3:
			hp_col = Color("e83e32").lerp(Color("f0a828"), clampf((f - 0.3) / 0.12, 0.0, 1.0))
		else:
			hp_col = Color("e83e32")
		(port_hp.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = hp_col
	port_pic.texture = B.cameo(str(p.get("cameo", "")))

# ---------------------------------------------------------------- ready powers column (docked above right wing)
func _powers() -> void:
	var ps: Array = B.power_list()
	var sig := ""
	for p in ps: sig += "%s%d%s;" % [p.key, int(float(p.ready) * 30), B.armed == "power:" + str(p.key)]
	if sig == pow_sig: return
	pow_sig = sig
	for c in powers_col.get_children(): c.free()
	powers_col.visible = not ps.is_empty()
	for p in ps:
		var b := Button.new()
		b.name = "Pow_" + str(p.key)
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(74, 46)
		var rdy: bool = float(p.ready) >= 1.0
		b.tooltip_text = "%s%s\n%s\nClick, then RIGHT-click target (left-click cancels)" % [p.name, "" if rdy else " (%d%%)" % int(float(p.ready) * 100), str(p.get("desc", ""))]
		var armed: bool = B.armed == "power:" + str(p.key)
		b.add_theme_stylebox_override("normal", _steel(Color("3a2f12") if armed else (Color("142c36") if rdy else Color("0b1318")), UI.GOLD_HI if armed or rdy else STEEL_HI, 2 if rdy else 1, 2))
		b.add_theme_stylebox_override("hover", _steel(Color("1e404e"), UI.GOLD_HI, 2, 2))
		b.add_theme_stylebox_override("pressed", _steel(Color("3a2f12"), UI.GOLD_HI, 2, 2))
		var l := UI.label(str(p.name), 11, UI.TEXT if rdy else UI.TEXT_DIM, "tight")
		l.position = Vector2(4, 2); l.size = Vector2(66, 34)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.add_theme_constant_override("line_spacing", -4)
		l.clip_text = true; l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(l)
		var pg := _progress(UI.GOLD_HI if rdy else UI.CYAN)
		pg.position = Vector2(3, 39); pg.size = Vector2(68, 4); pg.value = float(p.ready); pg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pg)
		var key: String = p.key
		b.pressed.connect(func(): B.arm_power(key); pow_sig = "")
		powers_col.add_child(b)

# ---------------------------------------------------------------- mission objectives, banner, tutorial
func _mission() -> void:
	var ms = B.mission
	if B.kind == "range":
		mode_lbl.text = "TEST RANGE | unlimited funds, passive target"
		mode_lbl.visible = ms == null and B.tut_i < 0
	elif B.kind == "replay":
		mode_lbl.text = ""
		mode_lbl.visible = false
	else:
		mode_lbl.visible = false

	if ms == null:
		obj_panel.visible = false
		banner.text = ""
		feed.offset_top = 34
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
				var l := UI.para(("[OK] " if done else "> ") + str(ob[1]), 12, Color("7fd79a") if done else UI.TEXT, 310)
				obj_box.add_child(l)
			if ms.status != null: obj_box.add_child(UI.para(str(ms.status), 12, UI.CYAN, 310))
		feed.offset_top = maxf(34.0, obj_panel.position.y + obj_panel.size.y + 8.0)
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
		tut_n.text = "TUTORIAL | STEP %d/%d" % [B.tut_i + 1, Missions.TUT.size()]
		tut_t.text = st[1]
		tut_a.text = "> " + str(st[2])

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
	if B.sim == null or B.map.is_empty() or not B.started: return   # P1 BRIDGE: the battle arrives a few frames after the start (sim in a Web Worker)
	if mini_tex == null: _mini_bake()
	var sim = B.sim
	var k := _mk().x; var o := _mo()
	mini.draw_rect(Rect2(Vector2.ZERO, Vector2(MINI_W, MINI_H)), Color(0.02, 0.04, 0.05))
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
	# Animated expanding radar alert ripples + crisp center crosshair
	if last_event != Vector2.INF and alerts > 0:
		var ep: Vector2 = last_event * k + o
		var phase := fmod(Time.get_ticks_msec() / 900.0, 1.0)
		var p2 := fmod(phase + 0.5, 1.0)
		mini.draw_arc(ep, 3.0 + phase * 18.0, 0.0, TAU, 24, Color(1.0, 0.45, 0.18, (1.0 - phase) * 0.95), 1.8)
		mini.draw_arc(ep, 3.0 + p2 * 18.0, 0.0, TAU, 24, Color(1.0, 0.45, 0.18, (1.0 - p2) * 0.85), 1.4)
		var ch_col := Color(1.0, 0.78, 0.35, 0.95)
		mini.draw_line(ep + Vector2(-5, 0), ep + Vector2(5, 0), ch_col, 1.2)
		mini.draw_line(ep + Vector2(0, -5), ep + Vector2(0, 5), ch_col, 1.2)
		mini.draw_circle(ep, 1.6, Color(1.0, 0.45, 0.18, 1.0))
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
	vb.add_child(UI.menu_item("Options & Sound", open_settings, 17, "", 340))
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
		vb.add_child(UI.menu_item(f.name, func(): B.load_file(path), 16, "%s | %s | %s" % [UI.nat_name(f.fac), UI.fmt_time(f.t), UI.fmt_when(f.when)], 480))
	vb.add_child(UI.button("Back", open_pause, 14))

func open_settings() -> void:
	var vb := _open("settings", 460, "Options & Sound")
	var au = get_node_or_null("/root/Audio")
	var au_map := {"vol_master": "master", "vol_music": "music", "vol_sfx": "effects", "vol_voice": "voices"}
	for it in [["Master volume", "vol_master"], ["Music", "vol_music"], ["Battle sounds", "vol_sfx"], ["Unit voices", "vol_voice"], ["Scroll speed", "scroll_speed"]]:
		var hb := HBoxContainer.new()
		var l := UI.label(str(it[0]).to_upper(), 12, UI.TEXT_DIM); l.custom_minimum_size.x = 150
		var s := HSlider.new()
		var key: String = it[1]
		s.min_value = 0.4 if key == "scroll_speed" else 0.0; s.max_value = 2.0 if key == "scroll_speed" else 1.0; s.step = 0.05
		if au != null and au_map.has(key):
			s.value = float(au.vol.get(au_map[key], 100)) / 100.0
		else:
			s.value = float(UI.opt(key))
		s.custom_minimum_size = Vector2(230, 20); s.focus_mode = Control.FOCUS_NONE
		s.value_changed.connect(func(v):
			UI.set_opt(key, v)
			if au != null and au_map.has(key):
				au.set_vol(au_map[key], int(roundf(float(v) * 100.0))))
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
	vb.add_child(UI.label("RANK %d   |   %d POINT%s TO SPEND" % [rk, B.gp_points(), "" if B.gp_points() == 1 else "S"], 18, UI.TEXT, "display"))
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
		var b := UI.menu_item(str(p.name), func(): B.buy_gpow(str(p.key)); open_powers(); open_powers(), 16, ("OWNED | " if have else ("" if can else "LOCKED | ")) + str(p.desc), 290)
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
		var nm := "%s%s" % [str(T.F.name), " (you)" if T.id == B.me else ""]
		var l := UI.label(nm.to_upper(), 16, B.team_col(T.id), "display")
		g.add_child(l)
		g.add_child(UI.label(str(T.tm) if int(T.tm) < 100 else "-", 14))
		g.add_child(UI.label(str(int(T.built)), 14)); g.add_child(UI.label(str(int(T.lost)), 14)); g.add_child(UI.label(str(int(T.kills)), 14))
		g.add_child(UI.label(str(info.per[T.id].blds), 14))
		g.add_child(UI.label("$" + _commas(int(T.earned)), 14)); g.add_child(UI.label("$" + _commas(int(T.spent)), 14))
	vb.add_child(g)
	vb.add_child(UI.label("TIME %s   |   %s" % [UI.fmt_time(sim.t), str(B.map.get("name", B.map_key)).to_upper()], 14, UI.CYAN, "display"))
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	hb.alignment = BoxContainer.ALIGNMENT_END
	if B.online == null: hb.add_child(UI.button("Play again", func(): B.restart(), 16))
	if B.kind != "replay" and B.online == null: hb.add_child(UI.button("Watch the replay", func(): B.watch_last_replay(), 16))
	var mb := UI.button("Main menu", func(): B.leave(), 18, 0, true)
	mb.name = "ToMenu"
	hb.add_child(mb)
	vb.add_child(hb)
