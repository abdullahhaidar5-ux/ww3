## BATTLE HUD (lane P6) - Command & Conquer: Generals - Zero Hour remastered metallic tactical control bar:
## left wing = heavy beveled radar minimap with corner ticks, compass N, alert ripples + 5 flush tactical buttons (MENU, DOZER, SUP, ALERT, GEN+XP);
## center wing = integrated Zero Hour telemetry bezel (flag, title, gold cash, supply, army, power, match clock) + framed 2x6 Zero Hour cameo cards + queue;
## right wing = framed unit/faction portrait card with rank chevrons, HP & ammo bars + vertical segmented Zero Hour power gauge;
## docked overlays = ready powers rail with real power icons, flush HIDE/pause tabs, clean contextual hint strip, top-left radio feed.
## It only reads the battle (B) and sends orders through B.cmd().
extends Node

const UI = preload("res://scripts/ui/ui_kit.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const BAR_H := 184.0
const MOB_BAR_H := 114.0
const MINI_W := 214.0
const MINI_H := 156.0
const MOB_MINI_W := 96.0
const MOB_MINI_H := 94.0
const STEEL := Color("11191d")
const STEEL_DARK := Color("0a1014")
const STEEL_HI := Color("3b5560")
const STEEL_TOP := Color("6e8c96")
const BRASS := Color("b8923a")
const WELL := Color("070c10")
const SLOT_BG := Color("142127")
const SLOT_EMPTY := Color("091015")
const SLOT_EMPTY_EDGE := Color("1f323b")
const GREEN_BTN := Color("1b6a38")
const COLS := 7

const FAC_ACCENT := {
	"IR": Color("3cb868"), "RS": Color("e8c428"), "DW": Color("d4403a"), "RV": Color("42b462"), "OB": Color("32a858"),
	"US": Color("4a92e0"), "GB": Color("4c84d4"), "FR": Color("4e88dc"), "DE": Color("d6a83a"), "IL": Color("4aa4ea"), "UA": Color("f0c438"),
	"RU": Color("d84840"), "CN": Color("e64836"), "KP": Color("d44642"), "IN": Color("e89438"), "JP": Color("e25458"), "KR": Color("549ce0"),
	"PK": Color("36a65c"), "SA": Color("3cb264"), "AE": Color("54b8c8"), "TR": Color("e04c48"), "EG": Color("d8a440"),
}

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
var cmd_flag: Control
var queue_row: HBoxContainer
var port_name: Label
var port_info: Label
var port_hp: ProgressBar
var port_ammo: ProgressBar
var port_pic: TextureRect
var port_vet: HBoxContainer = null
var port_vet_pill: PanelContainer = null
var _port_vet_n := -1
var port_idle_box: VBoxContainer
var port_idle_nat: Label
var port_idle_doc: Label = null
var port_idle_rank: Label = null
var port_idle_xp: ProgressBar = null
var port_idle_flag: Control
var plate_pw: Label
var plate_money: Label
var plate_pop: Label
var plate_time: Label
var pw_bar: ProgressBar = null
var pw_meter: ProgressBar
var pw_ticks: Control
var tel_sup_icon: TextureRect = null
var tel_pw_icon: TextureRect = null
var chip_money: Label
var chip_sup: Label
var chip_alert: Label
var sup_btn: Button
var sup_icon: TextureRect = null
var dozer_btn: Button
var dozer_lbl: Label
var dozer_badge: Label = null
var dozer_icon: TextureRect = null
var alert_btn: Button
var alert_icon: TextureRect = null
var pause_btn: Button
var hide_btn: Button
var mode_lbl: Label
var hint_lbl: Label
var powers_col: VBoxContainer
var star_btn: Button
var star_rank: Label
var star_xp: ProgressBar
var star_icon: TextureRect = null
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
var _dz_lit := false
var _flag_fac := ""
var _pow_icons: Dictionary = {}
var feed_n := 0
var alerts := 0
var last_event := Vector2.INF
var load_lbl: Label
var replay_lbl: Label
var collapsed := false
var is_mob := false
var bar_h := BAR_H
var mini_w := MINI_W
var mini_h := MINI_H
var bar_trim: ColorRect = null
var mob_bar: Control = null
var mob_top_bar: HBoxContainer = null
var mob_box_btn: Button = null
var mob_atk_btn: Button = null
var mob_gen_btn: Button = null
var _mob_box_lit := false
var _mob_atk_lit := false
var cmd_scroll: ScrollContainer = null
var cmd_mob_row: HBoxContainer = null

func bar_height() -> float:
	return bar_h

func _init(battle) -> void:
	B = battle

func build(l: CanvasLayer) -> void:
	layer = l
	is_mob = UI.is_mobile() or get_viewport().get_visible_rect().size.x < 1040.0
	bar_h = MOB_BAR_H if is_mob else BAR_H
	mini_w = MOB_MINI_W if is_mob else MINI_W
	mini_h = MOB_MINI_H if is_mob else MINI_H
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

# ---------------------------------------------------------------- Zero Hour beveled steel style helpers
func _steel(bg: Color, edge: Color, bw: int = 1, rad: int = 2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg; sb.border_color = edge
	sb.set_border_width_all(bw); sb.set_corner_radius_all(rad)
	return sb

## True forged-metal bevel: keeps deep gunmetal perimeter `edge` intact (never overwritten!) with forged bottom thickness + drop shadow.
## Pair with `_add_rim()` for a crisp 1px metallic top specular highlight.
func _bevel(bg: Color, edge: Color, _top_edge: Color = Color(0, 0, 0, 0), rad: int = 2) -> StyleBoxFlat:
	var sb := _steel(bg, edge, 1, rad)
	sb.border_width_top = 1
	sb.border_width_bottom = 2
	sb.shadow_color = Color(0, 0, 0, 0.42)
	sb.shadow_size = 3
	sb.shadow_offset = Vector2(0, 1)
	return sb

func _add_rim(ctrl: Control, col: Color = Color(0.68, 0.86, 0.94, 0.24), h: float = 1.0) -> ColorRect:
	var rim := ColorRect.new()
	rim.name = "Rim"
	rim.color = col
	rim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rim.anchor_left = 0.0; rim.anchor_right = 1.0
	rim.anchor_top = 0.0; rim.anchor_bottom = 0.0
	rim.offset_left = 1.0; rim.offset_right = -1.0
	rim.offset_top = 1.0; rim.offset_bottom = 1.0 + h
	ctrl.add_child(rim)
	return rim

func _tac_btn(txt: String, on: Callable, tip: String, w: float = 60.0, h: float = 29.0) -> Button:
	var b := Button.new()
	b.text = txt
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = tip
	b.custom_minimum_size = Vector2(w, h)
	b.add_theme_font_override("font", UI.font("bold"))
	b.add_theme_font_size_override("font_size", 11)
	b.add_theme_color_override("font_color", UI.TEXT)
	b.add_theme_color_override("font_hover_color", UI.GOLD_HI)
	b.add_theme_color_override("font_pressed_color", UI.GOLD_HI)
	b.add_theme_color_override("font_disabled_color", Color(0.42, 0.48, 0.52))
	_add_rim(b, Color(0.66, 0.84, 0.92, 0.20))
	_style_tac(b, Color("142129"), Color("2a3e4b"), UI.TEXT)
	b.mouse_entered.connect(func():
		if b.disabled: return
		var rim: ColorRect = b.get_node_or_null("Rim")
		if rim != null: rim.color = UI.GOLD_SPEC)
	b.mouse_exited.connect(func():
		var rim: ColorRect = b.get_node_or_null("Rim")
		if rim != null:
			var base_c: Color = b.get_meta("rim_col", Color(0.66, 0.84, 0.92, 0.20))
			rim.color = base_c)
	b.pressed.connect(on)
	return b

func _style_tac(b: Button, bg: Color, edge: Color, txt_col: Color, rim_col: Color = Color(0, 0, 0, 0)) -> void:
	var n := _bevel(bg, edge, edge, 2)
	var hv := _bevel(bg.lightened(0.14), UI.GOLD, UI.GOLD_HI, 2)
	var pr := _bevel(Color("322810"), UI.GOLD_HI, UI.GOLD_HI, 2)
	var ds := _steel(Color("0a1015"), Color("1b2730"), 1, 2)
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", hv)
	b.add_theme_stylebox_override("pressed", pr)
	b.add_theme_stylebox_override("disabled", ds)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.add_theme_color_override("font_color", txt_col)
	var rc: Color = rim_col if rim_col.a > 0.0 else Color(edge.r, edge.g, edge.b, 0.42)
	b.set_meta("rim_col", rc)
	var rim: ColorRect = b.get_node_or_null("Rim")
	if rim != null: rim.color = rc

## Machined icon + label + corner keycap tactical sidebar button
func _sidebar_btn(icon_name: String, label_txt: String, keycap: String, on: Callable, tip: String, h: float = 29.0, show_xp: bool = false) -> Dictionary:
	var b := _tac_btn("", on, tip, 72.0, h)
	b.clip_contents = true

	var hb := HBoxContainer.new()
	hb.set_anchors_preset(Control.PRESET_FULL_RECT)
	hb.offset_left = 4; hb.offset_right = -15
	hb.offset_top = 3; hb.offset_bottom = -9 if show_xp else -2
	hb.alignment = BoxContainer.ALIGNMENT_BEGIN
	hb.add_theme_constant_override("separation", 3)
	hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(hb)

	var ic := TextureRect.new()
	ic.texture = UI.icon(icon_name)
	ic.custom_minimum_size = Vector2(12, 12)
	ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	ic.modulate = Color("9ec6d4")
	ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hb.add_child(ic)

	var lb := UI.label(label_txt, 9, UI.TEXT, "bold")
	lb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lb.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	lb.clip_text = true
	lb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hb.add_child(lb)

	var badge := UI.label("", 9, UI.GOLD_HI, "bold")
	badge.anchor_left = 1.0; badge.anchor_right = 1.0
	badge.anchor_top = 1.0; badge.anchor_bottom = 1.0
	badge.offset_left = -22; badge.offset_right = -4
	badge.offset_top = -14; badge.offset_bottom = -2
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	badge.visible = false
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(badge)

	if keycap != "":
		var kc := UI.label(keycap, 8, Color("7f9ca8"), "mono")
		kc.anchor_left = 1.0; kc.anchor_right = 1.0
		kc.anchor_top = 0.0; kc.anchor_bottom = 0.0
		kc.offset_left = -24; kc.offset_right = -4
		kc.offset_top = 1; kc.offset_bottom = 11
		kc.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		kc.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(kc)

	var xp_bar: ProgressBar = null
	if show_xp:
		xp_bar = _progress(UI.GOLD_HI)
		xp_bar.anchor_left = 0.0; xp_bar.anchor_right = 1.0
		xp_bar.anchor_top = 1.0; xp_bar.anchor_bottom = 1.0
		xp_bar.offset_left = 4; xp_bar.offset_right = -4
		xp_bar.offset_top = -7; xp_bar.offset_bottom = -2
		xp_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(xp_bar)

	b.mouse_entered.connect(func():
		if b.disabled: return
		ic.modulate = UI.GOLD_HI
		lb.add_theme_color_override("font_color", Color(1, 1, 1)))
	b.mouse_exited.connect(func():
		ic.modulate = b.get_meta("icon_col", Color("9ec6d4"))
		lb.add_theme_color_override("font_color", b.get_meta("lbl_col", UI.TEXT)))
	b.set_meta("icon_col", Color("9ec6d4"))
	b.set_meta("lbl_col", UI.TEXT)
	return {btn = b, icon = ic, lbl = lb, badge = badge, xp = xp_bar}

## Clean recessed icon + tabular value badge for the center telemetry strip
func _tel_badge(icon_name: String, init_txt: String, txt_size: int, txt_col: Color, icon_col: Color, font_kind: String, tip: String = "") -> Dictionary:
	var pc := PanelContainer.new()
	pc.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	if tip != "": pc.tooltip_text = tip
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.03, 0.06, 0.08, 0.72)
	sb.border_color = Color("1f323d")
	sb.set_border_width_all(1); sb.set_corner_radius_all(3)
	sb.content_margin_left = 5; sb.content_margin_right = 6
	sb.content_margin_top = 1; sb.content_margin_bottom = 1
	pc.add_theme_stylebox_override("panel", sb)

	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 4)
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pc.add_child(hb)

	var ic := TextureRect.new()
	ic.texture = UI.icon(icon_name)
	ic.custom_minimum_size = Vector2(12 if is_mob else 13, 12 if is_mob else 13)
	ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	ic.modulate = icon_col
	ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hb.add_child(ic)

	var lb := UI.label(init_txt, txt_size, txt_col, font_kind)
	lb.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	lb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hb.add_child(lb)
	return {box = pc, icon = ic, lbl = lb}

func _tab_btn(txt: String, on: Callable, tip: String) -> Button:
	var b := Button.new()
	b.text = txt
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = tip
	b.add_theme_font_override("font", UI.font("bold"))
	b.add_theme_font_size_override("font_size", 11)
	b.add_theme_color_override("font_color", Color("c4d6dc"))
	b.add_theme_color_override("font_hover_color", UI.GOLD_HI)
	var n := _steel(Color("111b20"), Color("2e4450"), 1, 0)
	n.corner_radius_top_left = 3; n.corner_radius_top_right = 3; n.border_width_bottom = 0; n.border_width_top = 2
	var hv := _steel(Color("1c2e38"), UI.GOLD, 1, 0)
	hv.corner_radius_top_left = 3; hv.corner_radius_top_right = 3; hv.border_width_bottom = 0; hv.border_width_top = 2
	var pr := _steel(Color("322810"), UI.GOLD_HI, 1, 0)
	pr.corner_radius_top_left = 3; pr.corner_radius_top_right = 3; pr.border_width_bottom = 0; pr.border_width_top = 2
	b.add_theme_stylebox_override("normal", n)
	b.add_theme_stylebox_override("hover", hv)
	b.add_theme_stylebox_override("pressed", pr)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	b.pressed.connect(on)
	return b

func _vdiv() -> ColorRect:
	var r := ColorRect.new()
	r.color = STEEL_HI
	r.custom_minimum_size = Vector2(1, 16)
	r.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r

func _pow_icon(key: String) -> Texture2D:
	if _pow_icons.has(key): return _pow_icons[key]
	var k := key.to_lower()
	var fname := "nat"
	if "barrage" in k or "arty" in k or "rocket" in k or "scud" in k or "carpet" in k: fname = "barrage"
	elif "para" in k or "drop" in k or "air" in k: fname = "para"
	elif "recon" in k or "spy" in k or "sat" in k or "radar" in k: fname = "recon"
	elif "repair" in k or "heal" in k or "amb" in k: fname = "repair"
	elif "flare" in k or "smoke" in k or "emp" in k: fname = "flare"
	elif "bunker" in k or "bb" in k or "nuke" in k or "strike" in k or "sup" in k: fname = "bb"
	elif "mil" in k or "mob" in k or "rebel" in k: fname = "mil"
	elif "sanc" in k or "cash" in k or "hack" in k: fname = "sanc"
	var fp := "res://ui/icons/pow/%s.png" % fname
	var tex: Texture2D = load(fp) if ResourceLoader.exists(fp) else null
	_pow_icons[key] = tex
	return tex

# ---------------------------------------------------------------- bottom Zero Hour metallic control bar (Desktop + Responsive Mobile)
func _bar() -> void:
	bar = Panel.new()
	bar.name = "Bar"
	bar.anchor_top = 1.0; bar.anchor_bottom = 1.0; bar.anchor_right = 1.0
	bar.offset_top = -bar_h
	var sb := _steel(STEEL, STEEL_TOP, 0, 0)
	sb.border_width_top = 2
	bar.add_theme_stylebox_override("panel", sb)
	root.add_child(bar)

	# Faction-tinted metallic trim accent line across the Zero Hour console
	bar_trim = ColorRect.new()
	bar_trim.color = Color(BRASS.r, BRASS.g, BRASS.b, 0.72)
	bar_trim.anchor_right = 1.0
	bar_trim.offset_top = 2; bar_trim.offset_bottom = 4
	bar_trim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(bar_trim)

	# ---- LEFT WING: Heavy Beveled Radar Minimap
	var mf := Panel.new()
	mf.position = Vector2(6 if is_mob else 8, 8 if is_mob else 10)
	mf.size = Vector2(mini_w + 6, mini_h + 6)
	var mfs := _steel(WELL, Color("3b5764"), 2, 2)
	mf.add_theme_stylebox_override("panel", mfs)
	_add_rim(mf, Color(0.68, 0.86, 0.94, 0.28))
	bar.add_child(mf)
	mini = Control.new()
	mini.name = "Minimap"
	mini.position = Vector2(3, 3); mini.size = Vector2(mini_w, mini_h)
	mini.clip_contents = true
	mini.draw.connect(_mini_draw)
	mini.gui_input.connect(_mini_input)
	mf.add_child(mini)

	# 5 machined icon+label+keycap tactical buttons in a clean VBoxContainer beside radar (Desktop only)
	var side_vb := VBoxContainer.new()
	side_vb.name = "LeftRail"
	side_vb.position = Vector2(232, 10)
	side_vb.size = Vector2(72, 164)
	side_vb.add_theme_constant_override("separation", 3)
	side_vb.visible = not is_mob
	bar.add_child(side_vb)

	var m_d := _sidebar_btn("menu", "MENU", "ESC", func(): open_pause(), "Menu / Options / Sound (Esc)", 29.0)
	var mb: Button = m_d.btn
	mb.name = "MenuBtn"
	side_vb.add_child(mb)

	var dz_d := _sidebar_btn("wrench", "DOZER", "B", func():
		if B.has_method("select_idle_dozer"): B.select_idle_dozer(), "Jump to idle Construction Vehicle (B)", 29.0)
	dozer_btn = dz_d.btn
	dozer_btn.name = "DozerBtn"
	dozer_icon = dz_d.icon
	dozer_lbl = dz_d.lbl
	dozer_badge = dz_d.badge
	side_vb.add_child(dozer_btn)

	var sup_d := _sidebar_btn("crate", "SUPPLY", "L", func(): B.toggle_supply(), "Toggle supply lines on the ground (L)", 29.0)
	sup_btn = sup_d.btn
	sup_btn.name = "SupBtn"
	sup_icon = sup_d.icon
	side_vb.add_child(sup_btn)

	var al_d := _sidebar_btn("alert", "ALERTS", "SPC", func():
		if last_event != Vector2.INF:
			B.cam_target = last_event
			alerts = 0, "Jump to last tactical alert (Space)", 29.0)
	alert_btn = al_d.btn
	alert_btn.name = "AlertBtn"
	alert_icon = al_d.icon
	chip_alert = al_d.lbl
	side_vb.add_child(alert_btn)

	var st_d := _sidebar_btn("star", "RANK 1", "P", func(): open_powers(), "Generals' Promotions & Powers (P)", 36.0, true)
	star_btn = st_d.btn
	star_btn.name = "StarBtn"
	star_icon = st_d.icon
	star_icon.modulate = UI.GOLD_HI
	star_btn.set_meta("icon_col", UI.GOLD_HI)
	star_rank = st_d.lbl
	star_rank.add_theme_color_override("font_color", UI.GOLD_HI)
	star_btn.set_meta("lbl_col", UI.GOLD_HI)
	star_xp = st_d.xp
	side_vb.add_child(star_btn)

	# ---- CENTER WING: Integrated Zero Hour Telemetry Bezel + Framed Uncropped Cameo Deck
	var ca := Panel.new()
	ca.name = "Cmd"
	ca.anchor_right = 1.0
	ca.offset_left = 114 if is_mob else 310
	ca.offset_right = -24 if is_mob else -226
	ca.offset_top = 8 if is_mob else 10
	ca.offset_bottom = int(bar_h) - 6 if is_mob else 174
	ca.add_theme_stylebox_override("panel", _steel(STEEL_DARK, Color("334c58"), 2, 2))
	_add_rim(ca, Color(0.68, 0.86, 0.94, 0.24))
	bar.add_child(ca)

	var cv := VBoxContainer.new()
	cv.set_anchors_preset(Control.PRESET_FULL_RECT)
	cv.offset_left = 2; cv.offset_top = 2; cv.offset_right = -2; cv.offset_bottom = -2
	cv.add_theme_constant_override("separation", 2 if is_mob else 3)
	ca.add_child(cv)

	# Integrated Top Telemetry Bezel (Icon-driven crisp badges, generous room for title & sub)
	var hdr := PanelContainer.new()
	hdr.name = "Plate"
	hdr.custom_minimum_size.y = 25 if is_mob else 31
	var hs := _steel(Color("0a1319"), Color("2a404c"), 0, 0)
	hs.border_width_bottom = 1
	hs.content_margin_left = 6 if is_mob else 8; hs.content_margin_right = 6 if is_mob else 8; hs.content_margin_top = 2; hs.content_margin_bottom = 2
	hdr.add_theme_stylebox_override("panel", hs)
	cv.add_child(hdr)

	var th := HBoxContainer.new()
	th.add_theme_constant_override("separation", 5 if is_mob else 7)
	th.alignment = BoxContainer.ALIGNMENT_CENTER
	hdr.add_child(th)

	cmd_flag = Control.new()
	cmd_flag.custom_minimum_size = Vector2(22 if is_mob else 26, 14 if is_mob else 16)
	cmd_flag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cmd_flag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	th.add_child(cmd_flag)

	cmd_title = UI.label("TACTICAL COMMAND", 13 if is_mob else 15, UI.GOLD_HI, "bold")
	cmd_title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cmd_title.clip_text = is_mob
	if is_mob: cmd_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cmd_sub = UI.label("", 11, Color("8baab4"))
	cmd_sub.clip_text = true
	cmd_sub.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	cmd_sub.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cmd_sub.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cmd_sub.visible = not is_mob
	th.add_child(cmd_title)
	th.add_child(cmd_sub)

	var t_cash := _tel_badge("cash", "$0", 14 if is_mob else 16, UI.GOLD_HI, UI.GOLD_HI, "bold", "Treasury funds")
	plate_money = t_cash.lbl
	plate_money.name = "Money"
	chip_money = plate_money
	th.add_child(t_cash.box)

	var t_sup := _tel_badge("crate", "SUPPLY OK", 11, UI.GREEN, UI.GREEN, "tight", "Supply & ammunition lines")
	chip_sup = t_sup.lbl
	tel_sup_icon = t_sup.icon
	t_sup.box.visible = not is_mob
	th.add_child(t_sup.box)

	var t_pop := _tel_badge("army", "0/0", 11 if is_mob else 12, UI.TEXT, UI.CYAN, "mono", "Active army / population cap")
	plate_pop = t_pop.lbl
	th.add_child(t_pop.box)

	var t_pw := _tel_badge("bolt", "0/0", 11 if is_mob else 12, UI.TEXT, Color("38d65a"), "mono", "Power used / produced")
	plate_pw = t_pw.lbl
	tel_pw_icon = t_pw.icon
	pw_bar = null
	th.add_child(t_pw.box)

	var t_clk := _tel_badge("clock", "0:00", 11 if is_mob else 12, Color("9cb4bc"), Color("7e9ca8"), "mono", "Battle elapsed time")
	plate_time = t_clk.lbl
	t_clk.box.visible = not is_mob
	th.add_child(t_clk.box)

	# Cameo Grid (Desktop: 2x7 framed Zero Hour grid; Mobile: sleek 1-row touch-scrollable large thumb cards!)
	var grid_pad := MarginContainer.new()
	grid_pad.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid_pad.add_theme_constant_override("margin_left", 3 if is_mob else 4)
	grid_pad.add_theme_constant_override("margin_right", 3 if is_mob else 4)
	grid_pad.add_theme_constant_override("margin_bottom", 2 if is_mob else 3)
	cv.add_child(grid_pad)

	var hb2 := HBoxContainer.new()
	hb2.add_theme_constant_override("separation", 4 if is_mob else 6)
	hb2.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hb2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_pad.add_child(hb2)

	if is_mob:
		cmd_scroll = ScrollContainer.new()
		cmd_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		cmd_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
		cmd_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		cmd_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
		hb2.add_child(cmd_scroll)
		cmd_mob_row = HBoxContainer.new()
		cmd_mob_row.name = "Grid"
		cmd_mob_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
		cmd_mob_row.add_theme_constant_override("separation", 5)
		cmd_scroll.add_child(cmd_mob_row)
		cmd_grid = GridContainer.new()
		cmd_grid.visible = false
		hb2.add_child(cmd_grid)
	else:
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

	# ---- RIGHT WING: Zero Hour Unit/Faction Portrait Card (Desktop only — hidden on mobile so command cards have 100% width!)
	var pf := Panel.new()
	pf.name = "Portrait"
	pf.anchor_left = 1.0; pf.anchor_right = 1.0
	pf.offset_left = -218; pf.offset_right = -36; pf.offset_top = 10; pf.offset_bottom = 174
	pf.add_theme_stylebox_override("panel", _steel(STEEL_DARK, Color("334c58"), 2, 2))
	_add_rim(pf, Color(0.68, 0.86, 0.94, 0.24))
	pf.visible = not is_mob
	bar.add_child(pf)

	var pwell := Panel.new()
	pwell.position = Vector2(6, 6); pwell.size = Vector2(170, 98)
	pwell.add_theme_stylebox_override("panel", _steel(WELL, Color("263e48"), 1, 2))
	pf.add_child(pwell)

	var pbg := TextureRect.new()
	pbg.texture = _get_tac_bg()
	pbg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	pbg.stretch_mode = TextureRect.STRETCH_SCALE
	pbg.position = Vector2(1, 1); pbg.size = Vector2(168, 96)
	pbg.modulate = Color(0.75, 0.82, 0.88, 0.72)
	pbg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pwell.add_child(pbg)

	port_pic = TextureRect.new()
	port_pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	port_pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	port_pic.position = Vector2(3, 3); port_pic.size = Vector2(164, 92)
	pwell.add_child(port_pic)

	# Crisp gold/cyan veterancy star badge overlay (replaces ASCII "* " / "** " / "*** ")
	port_vet_pill = PanelContainer.new()
	port_vet_pill.anchor_left = 1.0; port_vet_pill.anchor_right = 1.0
	port_vet_pill.offset_left = -56; port_vet_pill.offset_right = -4
	port_vet_pill.offset_top = 4; port_vet_pill.offset_bottom = 22
	port_vet_pill.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	port_vet_pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vsb := StyleBoxFlat.new()
	vsb.bg_color = Color(0.03, 0.06, 0.08, 0.84)
	vsb.border_color = Color(UI.GOLD.r, UI.GOLD.g, UI.GOLD.b, 0.65)
	vsb.set_border_width_all(1); vsb.set_corner_radius_all(3)
	vsb.content_margin_left = 4; vsb.content_margin_right = 4; vsb.content_margin_top = 2; vsb.content_margin_bottom = 2
	port_vet_pill.add_theme_stylebox_override("panel", vsb)
	port_vet_pill.visible = false
	pwell.add_child(port_vet_pill)

	port_vet = HBoxContainer.new()
	port_vet.alignment = BoxContainer.ALIGNMENT_CENTER
	port_vet.add_theme_constant_override("separation", 2)
	port_vet.mouse_filter = Control.MOUSE_FILTER_IGNORE
	port_vet_pill.add_child(port_vet)

	# Sleek idle faction command crest shown inside Portrait well whenever nothing is selected (no duplicate rank clutter)
	port_idle_box = VBoxContainer.new()
	port_idle_box.position = Vector2(8, 8); port_idle_box.size = Vector2(154, 82)
	port_idle_box.alignment = BoxContainer.ALIGNMENT_CENTER
	port_idle_box.add_theme_constant_override("separation", 5)
	port_idle_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pwell.add_child(port_idle_box)
	var fl_row := HBoxContainer.new()
	fl_row.alignment = BoxContainer.ALIGNMENT_CENTER
	fl_row.add_theme_constant_override("separation", 7)
	port_idle_flag = Control.new()
	port_idle_flag.custom_minimum_size = Vector2(36, 22)
	fl_row.add_child(port_idle_flag)
	port_idle_nat = UI.label("", 15, UI.GOLD_HI, "bold")
	fl_row.add_child(port_idle_nat)
	port_idle_box.add_child(fl_row)
	port_idle_doc = UI.label("", 10, Color("8fb8c8"), "mono")
	port_idle_doc.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	port_idle_doc.clip_text = true
	port_idle_doc.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	port_idle_box.add_child(port_idle_doc)
	var st_lbl := UI.label("THEATER LINK ONLINE", 9, Color(0.45, 0.85, 0.56, 0.85), "mono")
	st_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	port_idle_box.add_child(st_lbl)

	port_name = UI.label("", 14, UI.TEXT, "bold")
	port_name.position = Vector2(8, 106); port_name.size = Vector2(166, 19); port_name.clip_text = true
	pf.add_child(port_name)

	port_hp = _progress(Color("38d65a"))
	port_hp.position = Vector2(8, 127); port_hp.size = Vector2(166, 7)
	pf.add_child(port_hp)

	port_ammo = _progress(Color("4da6ff"))
	port_ammo.position = Vector2(8, 136); port_ammo.size = Vector2(166, 4)
	port_ammo.visible = false
	pf.add_child(port_ammo)

	port_info = UI.label("", 11, Color("bcced9"))
	port_info.position = Vector2(8, 142); port_info.size = Vector2(166, 22); port_info.clip_text = true
	pf.add_child(port_info)

	# Classic Zero Hour Vertical Segmented Power Gauge with crisp lightning header icon
	if not is_mob:
		var p_bolt := TextureRect.new()
		p_bolt.texture = UI.icon("bolt")
		p_bolt.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		p_bolt.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		p_bolt.anchor_left = 1.0; p_bolt.anchor_right = 1.0
		p_bolt.offset_left = -24; p_bolt.offset_right = -12
		p_bolt.offset_top = 10; p_bolt.offset_bottom = 22
		p_bolt.modulate = UI.GOLD_HI
		p_bolt.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.add_child(p_bolt)

	pw_meter = _progress(Color("38d65a"))
	pw_meter.fill_mode = ProgressBar.FILL_BOTTOM_TO_TOP
	pw_meter.anchor_left = 1.0; pw_meter.anchor_right = 1.0
	pw_meter.offset_left = -18 if is_mob else -28
	pw_meter.offset_right = -6 if is_mob else -8
	pw_meter.offset_top = 8 if is_mob else 25
	pw_meter.offset_bottom = int(bar_h) - 6 if is_mob else 174
	pw_meter.tooltip_text = "Power: made / used"
	bar.add_child(pw_meter)

	pw_ticks = Control.new()
	pw_ticks.set_anchors_preset(Control.PRESET_FULL_RECT)
	pw_ticks.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pw_ticks.draw.connect(_draw_pw_ticks)
	pw_meter.add_child(pw_ticks)

	# ---- CLEAN DOCKED BAR TABS & CONTEXT HINT (zero overlap on desktop OR mobile!)
	hint_lbl = UI.label("", 12, Color(0.95, 0.94, 0.84, 0.96), "bold")
	if is_mob:
		hint_lbl.anchor_left = 0.5; hint_lbl.anchor_right = 0.5; hint_lbl.anchor_top = 0.0; hint_lbl.anchor_bottom = 0.0
		hint_lbl.offset_left = -220; hint_lbl.offset_right = 220; hint_lbl.offset_top = 6; hint_lbl.offset_bottom = 28
		hint_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	else:
		hint_lbl.anchor_top = 1.0; hint_lbl.anchor_bottom = 1.0
		hint_lbl.offset_left = 8; hint_lbl.offset_top = -bar_h - 24; hint_lbl.offset_right = 760; hint_lbl.offset_bottom = -bar_h - 2
	hint_lbl.clip_text = true
	var hsb := _steel(Color(0.05, 0.09, 0.12, 0.90), UI.GOLD_DIM, 1, 2)
	hsb.border_width_left = 3
	hsb.content_margin_left = 9; hsb.content_margin_right = 9
	hint_lbl.add_theme_stylebox_override("normal", hsb)
	hint_lbl.visible = false
	root.add_child(hint_lbl)

	if is_mob:
		# Mobile Top-Right Compact Controls (MENU, II, HIDE) — cleanly out of the way of bottom tray & hints!
		mob_top_bar = HBoxContainer.new()
		mob_top_bar.name = "MobileTopBar"
		mob_top_bar.anchor_left = 1.0; mob_top_bar.anchor_right = 1.0
		mob_top_bar.offset_left = -168; mob_top_bar.offset_right = -6; mob_top_bar.offset_top = 6; mob_top_bar.offset_bottom = 36
		mob_top_bar.alignment = BoxContainer.ALIGNMENT_END
		mob_top_bar.add_theme_constant_override("separation", 4)
		root.add_child(mob_top_bar)
		mob_top_bar.add_child(_tac_btn("MENU", func(): open_pause(), "Menu / Options", 54.0, 28.0))
		pause_btn = _tac_btn("II", func(): toggle_pause(), "Pause / Resume", 36.0, 28.0)
		pause_btn.name = "PauseBtn"
		mob_top_bar.add_child(pause_btn)
		hide_btn = _tac_btn("HIDE", func(): _toggle_collapse(), "Hide / show command bar", 48.0, 28.0)
		hide_btn.name = "HideBtn"
		mob_top_bar.add_child(hide_btn)

		# Mobile Ergonomic Right-Edge Vertical Thumb Rail (never covers center battlefield!)
		var rail := VBoxContainer.new()
		rail.name = "MobileBar"
		rail.anchor_left = 1.0; rail.anchor_right = 1.0; rail.anchor_top = 1.0; rail.anchor_bottom = 1.0
		rail.offset_left = -74; rail.offset_right = -6
		rail.offset_top = -bar_h - 210; rail.offset_bottom = -bar_h - 6
		rail.alignment = BoxContainer.ALIGNMENT_END
		rail.add_theme_constant_override("separation", 4)
		root.add_child(rail)
		mob_bar = rail

		rail.add_child(_tac_btn("DOZER", func():
			if B.has_method("select_idle_dozer"): B.select_idle_dozer(), "Jump to Construction Vehicle & build", 68.0, 30.0))
		mob_box_btn = _tac_btn("BOX", func():
			B.touch_box_mode = not B.touch_box_mode
			B._msg("Drag a box to select units (or hold finger 0.3s)" if B.touch_box_mode else "Pan mode"), "Toggle drag-box selection", 68.0, 30.0)
		rail.add_child(mob_box_btn)
		mob_atk_btn = _tac_btn("ATK-MV", func(): B._arm("amove"), "Tap destination to Attack-Move", 68.0, 30.0)
		rail.add_child(mob_atk_btn)
		mob_gen_btn = _tac_btn("GEN", func(): open_powers(), "Generals' Powers", 68.0, 30.0)
		rail.add_child(mob_gen_btn)
		var tilt_row := HBoxContainer.new()
		tilt_row.add_theme_constant_override("separation", 4)
		tilt_row.add_child(_tac_btn("UP", func(): B.tilt_cam(-9.0), "Angle camera up (horizon)", 32.0, 28.0))
		tilt_row.add_child(_tac_btn("DN", func(): B.tilt_cam(9.0), "Angle camera down (top-down)", 32.0, 28.0))
		rail.add_child(tilt_row)
		var util_row := HBoxContainer.new()
		util_row.add_theme_constant_override("separation", 4)
		util_row.add_child(_tac_btn("N", func(): B.cam_yaw_t = 0.0; B.cam_pitch_off_t = 0.0, "Reset camera angle", 32.0, 28.0))
		util_row.add_child(_tac_btn("CLR", func():
			B.place_kind = ""; B.armed = ""; B.touch_box_mode = false
			if B.ghost != null: B.ghost.visible = false
			B.bsel.clear(), "Cancel / Deselect", 32.0, 28.0))
		rail.add_child(util_row)
	else:
		pause_btn = _tab_btn("II", func(): toggle_pause(), "Pause / Resume (Pause)")
		pause_btn.name = "PauseBtn"
		pause_btn.anchor_left = 1.0; pause_btn.anchor_right = 1.0; pause_btn.anchor_top = 1.0; pause_btn.anchor_bottom = 1.0
		pause_btn.offset_left = -92; pause_btn.offset_right = -56; pause_btn.offset_top = -bar_h - 22; pause_btn.offset_bottom = -bar_h
		root.add_child(pause_btn)

		hide_btn = _tab_btn("HIDE", func(): _toggle_collapse(), "Hide / show command bar")
		hide_btn.name = "HideBtn"
		hide_btn.anchor_left = 1.0; hide_btn.anchor_right = 1.0; hide_btn.anchor_top = 1.0; hide_btn.anchor_bottom = 1.0
		hide_btn.offset_left = -54; hide_btn.offset_right = -8; hide_btn.offset_top = -bar_h - 22; hide_btn.offset_bottom = -bar_h
		root.add_child(hide_btn)

func _toggle_collapse() -> void:
	collapsed = not collapsed
	bar.visible = not collapsed
	hide_btn.text = "SHOW" if collapsed else "HIDE"
	var y_bot := 0.0 if collapsed else -bar_h
	if not is_mob:
		hide_btn.offset_top = y_bot - 22.0; hide_btn.offset_bottom = y_bot
		pause_btn.offset_top = y_bot - 22.0; pause_btn.offset_bottom = y_bot
		hint_lbl.offset_top = y_bot - 24.0; hint_lbl.offset_bottom = y_bot - 2.0
		powers_col.offset_bottom = y_bot - 28.0; powers_col.offset_top = y_bot - 380.0
	else:
		if mob_bar != null:
			mob_bar.offset_top = y_bot - 210.0; mob_bar.offset_bottom = y_bot - 6.0
		powers_col.offset_bottom = y_bot - 6.0; powers_col.offset_top = y_bot - 220.0

func _draw_pw_ticks() -> void:
	var sz := pw_ticks.size
	var y := 10.0
	while y < sz.y - 4.0:
		pw_ticks.draw_line(Vector2(1, y), Vector2(sz.x - 1, y), Color(0.03, 0.05, 0.07, 0.78), 1.6)
		y += 10.0

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
	# Ready Generals' powers / Superweapon rail: left edge on mobile (so it never clashes with right thumb rail), right wing on desktop
	powers_col = VBoxContainer.new()
	powers_col.name = "Powers"
	if is_mob:
		powers_col.anchor_left = 0.0; powers_col.anchor_right = 0.0
		powers_col.anchor_top = 1.0; powers_col.anchor_bottom = 1.0
		powers_col.offset_left = 6; powers_col.offset_right = 104
		powers_col.offset_top = -bar_h - 220; powers_col.offset_bottom = -bar_h - 6
	else:
		powers_col.anchor_left = 1.0; powers_col.anchor_right = 1.0
		powers_col.anchor_top = 1.0; powers_col.anchor_bottom = 1.0
		powers_col.offset_left = -114; powers_col.offset_right = -8
		powers_col.offset_top = -bar_h - 400; powers_col.offset_bottom = -bar_h - 28
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

func _sync_flags(fac: String) -> void:
	if fac == _flag_fac or fac == "": return
	_flag_fac = fac
	if bar_trim != null:
		var fc: Color = FAC_ACCENT.get(fac, BRASS)
		bar_trim.color = Color(fc.r, fc.g, fc.b, 0.82)
	for host_c in [[cmd_flag, 22.0 if is_mob else 26.0, 14.0 if is_mob else 16.0], [port_idle_flag, 36.0, 22.0]]:
		var c: Control = host_c[0]
		for ch in c.get_children(): ch.queue_free()
		var fl: Control = Missions.flag(fac, float(host_c[1]), float(host_c[2]))
		fl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		c.add_child(fl)
	if port_idle_doc != null:
		var nd: Dictionary = UI.nat_data(fac)
		var doct := str(nd.get("doctrine_name", ""))
		port_idle_doc.text = doct.to_upper() if doct != "" else "STRATEGIC COMMAND"

# ---------------------------------------------------------------- per frame
func tick(dt: float) -> void:
	root.visible = B.started
	if not B.started or B.sim == null: return
	var sim = B.sim
	var T: Dictionary = sim.teams[B.me]
	_sync_flags(str(B.my_fac))

	var pw: Vector2 = sim.pwr_of(B.me)
	var low := pw.y > pw.x
	var tight := not low and pw.x > 0.0 and (pw.x - pw.y) <= maxf(2.0, pw.x * 0.12)
	plate_pw.text = "%d/%d" % [int(pw.y), int(pw.x)]
	var p_col := Color("e84038") if low else (Color("e8b238") if tight else Color("38d65a"))
	plate_pw.add_theme_color_override("font_color", Color("ff6c5c") if low else (Color("f4c454") if tight else UI.TEXT))
	if tel_pw_icon != null: tel_pw_icon.modulate = p_col
	if pw_bar != null:
		pw_bar.value = clampf(pw.y / maxf(1.0, pw.x), 0, 1)
		(pw_bar.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = p_col
	if low:
		pw_meter.value = clampf(pw.x / maxf(1.0, pw.y) * 0.45, 0.14, 0.45)
	elif pw.x <= 0.0:
		pw_meter.value = 0.12
	else:
		var surplus := clampf((pw.x - pw.y) / maxf(1.0, pw.x), 0.0, 1.0)
		pw_meter.value = 0.56 + surplus * 0.44
	(pw_meter.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = p_col

	var money := "INF" if B.kind == "range" else "$" + _commas(int(T.credits))
	plate_money.text = money
	plate_pop.text = "%d/%d" % [sim.pop_used(B.me, false), sim.pop_cap()]
	plate_time.text = UI.fmt_time(float(sim.t))

	var sup = B.supply_state()
	var sup_txt := str(sup[0])
	if sup_txt == "Supply lines OK": sup_txt = "SUPPLY OK"
	chip_sup.text = sup_txt
	chip_sup.add_theme_color_override("font_color", sup[1])
	if tel_sup_icon != null: tel_sup_icon.modulate = sup[1]

	chip_alert.text = "ALT %d" % alerts if alerts > 0 else "ALERTS"
	var al_txt_col: Color = Color("ffd88a") if alerts > 0 else Color("9db2be")
	chip_alert.add_theme_color_override("font_color", al_txt_col)
	alert_btn.set_meta("lbl_col", al_txt_col)

	# Idle Dozer status button (iconic Zero Hour macro helper)
	var idle_dz: int = B.idle_dozer_count() if B.has_method("idle_dozer_count") else 0
	dozer_lbl.text = "DOZER"
	if dozer_badge != null:
		dozer_badge.visible = idle_dz > 0
		if idle_dz > 0: dozer_badge.text = str(idle_dz)
	var dz_now := idle_dz > 0
	if dz_now != _dz_lit:
		_dz_lit = dz_now
		if dz_now:
			_style_tac(dozer_btn, Color("14323c"), UI.CYAN, Color("c8f4ff"), Color(0.45, 0.88, 1.0, 0.50))
			if dozer_icon != null: dozer_icon.modulate = Color("8ceaff")
			dozer_btn.set_meta("icon_col", Color("8ceaff"))
			dozer_btn.set_meta("lbl_col", Color("c8f4ff"))
		else:
			_style_tac(dozer_btn, Color("142129"), Color("2a3e4b"), UI.TEXT_DIM)
			if dozer_icon != null: dozer_icon.modulate = Color("829ca8")
			dozer_btn.set_meta("icon_col", Color("829ca8"))
			dozer_btn.set_meta("lbl_col", UI.TEXT_DIM)
	dozer_lbl.add_theme_color_override("font_color", Color("c8f4ff") if dz_now else UI.TEXT_DIM)

	# General's Rank & XP live meter on GEN button
	var rk := int(T.get("rank", 1))
	var ranks: Array = sim.R.RANKS if sim.R is Dictionary and sim.R.has("RANKS") else []
	var xp_f := 1.0
	if rk < ranks.size():
		var prev_r := float(ranks[rk - 1]) if rk > 0 else 0.0
		xp_f = clampf((float(T.get("gxp", 0.0)) - prev_r) / maxf(1.0, float(ranks[rk]) - prev_r), 0.0, 1.0)
	var gp_pts: int = B.gp_points()
	star_rank.text = "+%d PT" % gp_pts if gp_pts > 0 else "RANK %d" % rk
	star_xp.value = xp_f
	port_idle_nat.text = UI.nat_name(str(B.my_fac)).to_upper()
	if port_idle_rank != null:
		port_idle_rank.text = "RANK %d  |  %d PT%s" % [rk, gp_pts, "" if gp_pts == 1 else "S"] if gp_pts > 0 else "GENERAL RANK %d" % rk
	if port_idle_xp != null:
		port_idle_xp.value = xp_f

	# Glow states on the flush Zero Hour sidebar buttons
	var sup_now: bool = bool(B.show_supply)
	if sup_now != _sup_on:
		_sup_on = sup_now
		if sup_now:
			_style_tac(sup_btn, GREEN_BTN, Color("6ce88e"), Color("e2ffea"), Color(0.50, 0.96, 0.62, 0.55))
			if sup_icon != null: sup_icon.modulate = Color("8cf5a8")
			sup_btn.set_meta("icon_col", Color("8cf5a8"))
			sup_btn.set_meta("lbl_col", Color("e2ffea"))
		else:
			_style_tac(sup_btn, Color("142129"), Color("2a3e4b"), UI.TEXT)
			if sup_icon != null: sup_icon.modulate = Color("9ec6d4")
			sup_btn.set_meta("icon_col", Color("9ec6d4"))
			sup_btn.set_meta("lbl_col", UI.TEXT)

	var al_now: bool = alerts > 0
	if al_now != _alert_lit:
		_alert_lit = al_now
		if al_now:
			_style_tac(alert_btn, Color("3c230a"), Color("f0a828"), Color("ffd88a"), Color(1.0, 0.78, 0.32, 0.55))
			if alert_icon != null: alert_icon.modulate = Color("ffc24c")
			alert_btn.set_meta("icon_col", Color("ffc24c"))
		else:
			_style_tac(alert_btn, Color("142129"), Color("2a3e4b"), Color("9db2be"))
			if alert_icon != null: alert_icon.modulate = Color("829ca8")
			alert_btn.set_meta("icon_col", Color("829ca8"))

	var gp_now: bool = gp_pts > 0
	if gp_now != _gen_lit:
		_gen_lit = gp_now
		if gp_now:
			_style_tac(star_btn, Color("46330c"), UI.GOLD_HI, UI.GOLD_HI, UI.GOLD_SPEC)
			if star_icon != null: star_icon.modulate = Color(1.0, 0.94, 0.62)
			star_btn.set_meta("icon_col", Color(1.0, 0.94, 0.62))
			star_btn.set_meta("lbl_col", Color(1.0, 0.95, 0.72))
			star_rank.add_theme_color_override("font_color", Color(1.0, 0.95, 0.72))
		else:
			_style_tac(star_btn, Color("142129"), Color("2a3e4b"), UI.GOLD_HI)
			if star_icon != null: star_icon.modulate = UI.GOLD_HI
			star_btn.set_meta("icon_col", UI.GOLD_HI)
			star_btn.set_meta("lbl_col", UI.GOLD_HI)
			star_rank.add_theme_color_override("font_color", UI.GOLD_HI)

	if mob_box_btn != null:
		var mb_now: bool = bool(B.touch_box_mode)
		if mb_now != _mob_box_lit:
			_mob_box_lit = mb_now
			if mb_now: _style_tac(mob_box_btn, Color("44330e"), UI.GOLD_HI, UI.GOLD_HI, UI.GOLD_SPEC)
			else: _style_tac(mob_box_btn, Color("142129"), Color("2a3e4b"), UI.TEXT)
	if mob_atk_btn != null:
		var ma_now: bool = B.armed == "amove"
		if ma_now != _mob_atk_lit:
			_mob_atk_lit = ma_now
			if ma_now: _style_tac(mob_atk_btn, Color("4a1c14"), Color("ff7a48"), Color("ffd4b0"))
			else: _style_tac(mob_atk_btn, Color("142129"), Color("2a3e4b"), UI.TEXT)
	if mob_gen_btn != null:
		mob_gen_btn.text = "GEN +%d" % gp_pts if gp_pts > 0 else "GEN"
		if gp_now: _style_tac(mob_gen_btn, Color("44330e"), UI.GOLD_HI, UI.GOLD_HI, UI.GOLD_SPEC)
		else: _style_tac(mob_gen_btn, Color("142129"), Color("2a3e4b"), UI.TEXT)

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

# ---------------------------------------------------------------- command area (Zero Hour 2x7 framed cameo deck)
func _draw_empty_brackets(c: Control) -> void:
	var sz := c.size
	var bc := Color(0.24, 0.38, 0.46, 0.34)
	var L := 6.0
	for corner in [[Vector2(4, 4), Vector2(1, 1)], [Vector2(sz.x - 4, 4), Vector2(-1, 1)], [Vector2(4, sz.y - 4), Vector2(1, -1)], [Vector2(sz.x - 4, sz.y - 4), Vector2(-1, -1)]]:
		var cp: Vector2 = corner[0]; var cd: Vector2 = corner[1]
		c.draw_line(cp, cp + Vector2(cd.x * L, 0), bc, 1.0)
		c.draw_line(cp, cp + Vector2(0, cd.y * L), bc, 1.0)
	var mid := sz * 0.5
	var dc := Color(0.24, 0.38, 0.46, 0.18)
	c.draw_line(mid + Vector2(-4, 0), mid + Vector2(4, 0), dc, 1.0)
	c.draw_line(mid + Vector2(0, -4), mid + Vector2(0, 4), dc, 1.0)

func _empty_slot() -> Panel:
	var p := Panel.new()
	p.custom_minimum_size = Vector2(92, 58)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := _steel(SLOT_EMPTY, SLOT_EMPTY_EDGE, 1, 2)
	sb.border_width_top = 2
	p.add_theme_stylebox_override("panel", sb)
	var br := Control.new()
	br.set_anchors_preset(Control.PRESET_FULL_RECT)
	br.mouse_filter = Control.MOUSE_FILTER_IGNORE
	br.draw.connect(_draw_empty_brackets.bind(br))
	p.add_child(br)
	return p

static var _cmd_icon_cache := {}
static func _cmd_icon(id: String, hint: String = "") -> Texture2D:
	var cache_key := id + "|" + hint.to_lower().left(32)
	if _cmd_icon_cache.has(cache_key):
		return _cmd_icon_cache[cache_key]
	var f := ""
	match id:
		"amove": f = "swords"
		"guard": f = "grd"
		"stop": f = "stp"
		"digin": f = "dig"
		"unload": f = "down"
		"rally": f = "rally"
		"retreat": f = "ret"
		"attack": f = "atk"
		"sell": f = "sell"
		"repair": f = "fix"
		"q_army": f = "army"
		"q_sup": f = "crate"
		"q_pow": f = "star"
		"q_hq": f = "flag"
		"q_dozer": f = "wrench"
		"gpr": f = "radar"
		_:
			var h := (id + " " + hint).to_lower()
			if "vest" in h or "plate" in h or "iotv" in h or "carrier" in h: f = "vest"
			elif "armor" in h or "chobham" in h or "karrar" in h or "merkava" in h or "trophy" in h or "composite" in h or "hull" in h or "reactive" in h: f = "armor"
			elif "sabot" in h or "shell" in h or "round" in h or "warhead" in h or "thermobaric" in h or "mortar" in h or "artillery" in h: f = "shell"
			elif "missile" in h or "phoenix" in h or "kornet" in h or "jdam" in h or "spice" in h or "guidance" in h or "aegis" in h or "atgm" in h: f = "missile"
			elif "rocket" in h or "barrage" in h or "mlrs" in h: f = "rocket"
			elif "radar" in h or "dome" in h or "sensor" in h or "gpr" in h or "detect" in h: f = "radar"
			elif "drone" in h or "uav" in h or "fpv" in h or "shahed" in h or "loiter" in h: f = "drone"
			elif "stealth" in h or "camo" in h or "passive" in h or "countermeasure" in h or "smoke" in h or "cloak" in h: f = "camo"
			elif "boat" in h or "ship" in h or "naval" in h or "coastal" in h or "shayetet" in h or "fleet" in h: f = "ship"
			elif "tomcat" in h or "jet" in h or "plane" in h or "air" in h or "wing" in h or "bomber" in h: f = "plane"
			elif "heli" in h or "chopper" in h or "rotor" in h: f = "heli"
			elif "tank" in h or "mbt" in h or "overlord" in h: f = "tank"
			elif "supply" in h or "logistics" in h or "tunnel" in h or "convoy" in h or "depot" in h: f = "crate"
			elif "fort" in h or "wall" in h or "bunker" in h or "underground" in h or "defense" in h or "dig" in h: f = "wall"
			elif "medic" in h or "heal" in h or "hospital" in h: f = "medic"
			elif "mine" in h or "ied" in h or "trap" in h: f = "mine"
			elif "fuel" in h or "engine" in h or "turbo" in h or "overhaul" in h or "speed" in h: f = "fuel"
			elif "burst" in h or "rapid" in h or "autoloader" in h: f = "burst"
			elif "scope" in h or "sniper" in h or "optics" in h or "laser" in h or "precision" in h: f = "scope"
			elif "bomb" in h or "cluster" in h or "demo" in h or "c4" in h: f = "bomb"
			elif "para" in h or "drop" in h or "airlift" in h: f = "parachute"
			elif "train" in h or "marine" in h or "radwan" in h or "sayeret" in h or "fighter" in h or "mobiliz" in h or "combined" in h or "spirit" in h or "squad" in h or "commando" in h or "infantry" in h: f = "troops"
			elif "power" in h or "reactor" in h or "emp" in h or "grid" in h: f = "bolt"
			elif "repair" in h or "fix" in h or "wrench" in h or "dozer" in h: f = "wrench"
			elif "sell" in h or "cash" in h or "hack" in h: f = "cash"
			elif "upgrade:" in h or "research" in h: f = "up"
			elif "star" in h or "general" in h or "rank" in h: f = "star"
			else: f = "up" if hint != "" else "swords"
	var p := "res://ui/icons/svg/%s.png" % f
	var t: Texture2D = load(p) if ResourceLoader.exists(p) else UI.icon("up")
	_cmd_icon_cache[cache_key] = t
	return t

static var _scrim_tex: GradientTexture2D = null
static var _tac_bg_tex: GradientTexture2D = null
static func _get_scrim() -> GradientTexture2D:
	if _scrim_tex == null:
		_scrim_tex = GradientTexture2D.new()
		_scrim_tex.width = 16; _scrim_tex.height = 64
		_scrim_tex.fill = GradientTexture2D.FILL_LINEAR
		_scrim_tex.fill_from = Vector2(0, 0); _scrim_tex.fill_to = Vector2(0, 1)
		var gr := Gradient.new()
		gr.set_offset(0, 0.0); gr.set_color(0, Color(0.02, 0.04, 0.06, 0.24))
		gr.add_point(0.42, Color(0.02, 0.04, 0.06, 0.0))
		gr.add_point(0.72, Color(0.02, 0.04, 0.06, 0.56))
		gr.set_offset(gr.get_point_count() - 1, 1.0); gr.set_color(gr.get_point_count() - 1, Color(0.01, 0.02, 0.03, 0.90))
		_scrim_tex.gradient = gr
	return _scrim_tex

static func _get_tac_bg() -> GradientTexture2D:
	if _tac_bg_tex == null:
		_tac_bg_tex = GradientTexture2D.new()
		_tac_bg_tex.width = 64; _tac_bg_tex.height = 64
		_tac_bg_tex.fill = GradientTexture2D.FILL_RADIAL
		_tac_bg_tex.fill_from = Vector2(0.5, 0.36); _tac_bg_tex.fill_to = Vector2(0.5, 1.05)
		var gr := Gradient.new()
		gr.set_color(0, Color(0.18, 0.29, 0.36, 1.0))
		gr.add_point(0.55, Color(0.09, 0.15, 0.20, 1.0))
		gr.set_color(gr.get_point_count() - 1, Color(0.04, 0.07, 0.10, 1.0))
		_tac_bg_tex.gradient = gr
	return _tac_bg_tex

## Authentic C&C Generals: Zero Hour UNCROPPED 3D cameo button with forged metallic bevel, specular rim, hover lift/glow,
## dedicated hotkey corner keycap, and smart cost/status pill (gold / crimson unaffordable / grey locked).
func _cameo_btn(it: Dictionary) -> Button:
	var b := Button.new()
	b.name = "Cmd_" + str(it.get("id", it.label))
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(88, 72) if is_mob else Vector2(92, 58)
	b.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN if is_mob else Control.SIZE_EXPAND_FILL
	b.size_flags_vertical = Control.SIZE_EXPAND_FILL
	b.disabled = not bool(it.get("ok", true))
	var tip_s := str(it.get("tip", ""))
	b.tooltip_text = tip_s
	b.clip_contents = true
	var is_on := bool(it.get("on", false))
	var needs_tech := "\nNeeds:" in tip_s
	var n_sb := _bevel(SLOT_BG, Color("2e4654"), Color("5a7e8e"), 2)
	var h_sb := _bevel(Color("1c3540"), UI.GOLD, UI.GOLD_HI, 2)
	var p_sb := _bevel(Color("3a2d10"), UI.GOLD_HI, UI.GOLD_HI, 2)
	var d_sb := _steel(Color("090f14"), Color("1e2c34"), 1, 2)
	b.add_theme_stylebox_override("normal", p_sb if is_on else n_sb)
	b.add_theme_stylebox_override("hover", h_sb)
	b.add_theme_stylebox_override("pressed", p_sb)
	b.add_theme_stylebox_override("disabled", d_sb)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

	var lbl_s := str(it.label)
	var art_bot := -18.0 if lbl_s != "" else -2.0

	var tex = B.cameo(str(it.get("cameo", "")))
	var is_svg_icon := false
	if tex == null:
		tex = _cmd_icon(str(it.get("id", "")), lbl_s + " " + tip_s)
		is_svg_icon = tex != null

	# Sleek studio backdrop behind every cameo so aspect-preserved art fills the frame harmoniously
	var bg := TextureRect.new()
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.offset_left = 2; bg.offset_top = 2; bg.offset_right = -2; bg.offset_bottom = art_bot
	bg.texture = _get_tac_bg()
	var base_bg_mod := Color(1.14, 0.98, 0.66) if is_on else (Color(0.42, 0.45, 0.48) if needs_tech else (Color(0.55, 0.52, 0.54) if b.disabled else Color(0.86, 0.92, 0.98)))
	bg.modulate = base_bg_mod
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(bg)

	var art_rect: TextureRect = null
	var base_art_mod := Color(1, 1, 1)
	if tex != null and not is_svg_icon:
		# ZERO-CROP centered 3D Generals cameo portrait — 100% of every building, tank, jet & soldier stays crisp and visible!
		var tr := TextureRect.new()
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.offset_left = 3; tr.offset_top = 2; tr.offset_right = -3; tr.offset_bottom = art_bot
		tr.texture = tex
		if needs_tech: base_art_mod = Color(0.36, 0.39, 0.44)
		elif b.disabled: base_art_mod = Color(0.52, 0.48, 0.50)
		elif is_on: base_art_mod = Color(1.14, 1.08, 0.94)
		tr.modulate = base_art_mod
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(tr)
		art_rect = tr

		# Subtle dark bottom gradient scrim so 3D cameos blend smoothly into the nameplate
		var scrim := TextureRect.new()
		scrim.texture = _get_scrim()
		scrim.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		scrim.stretch_mode = TextureRect.STRETCH_SCALE
		scrim.set_anchors_preset(Control.PRESET_FULL_RECT)
		scrim.offset_left = 2; scrim.offset_top = 2; scrim.offset_right = -2; scrim.offset_bottom = art_bot
		scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(scrim)
	elif tex != null and is_svg_icon:
		var sh := TextureRect.new()
		sh.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		sh.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		sh.anchor_left = 0.5; sh.anchor_right = 0.5; sh.anchor_top = 0.0; sh.anchor_bottom = 0.0
		sh.offset_left = -13; sh.offset_right = 17; sh.offset_top = 8; sh.offset_bottom = 35
		sh.texture = tex
		sh.modulate = Color(0.0, 0.0, 0.0, 0.65)
		sh.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(sh)

		var tr := TextureRect.new()
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.anchor_left = 0.5; tr.anchor_right = 0.5; tr.anchor_top = 0.0; tr.anchor_bottom = 0.0
		tr.offset_left = -15; tr.offset_right = 15; tr.offset_top = 6; tr.offset_bottom = 33
		tr.texture = tex
		var price_check := str(it.get("price", ""))
		if price_check == "owned": base_art_mod = Color("7ce89e")
		elif price_check == "researching": base_art_mod = UI.CYAN
		elif is_on: base_art_mod = UI.GOLD_HI
		elif b.disabled: base_art_mod = Color(0.45, 0.48, 0.52)
		else: base_art_mod = Color("e4f2f8")
		tr.modulate = base_art_mod
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(tr)
		art_rect = tr

	# Crisp 1px top metallic specular rim (illuminates gold on hover or when armed!)
	var base_rim_col := UI.GOLD_SPEC if is_on else (Color(0.28, 0.36, 0.42, 0.16) if b.disabled else Color(0.68, 0.86, 0.94, 0.28))
	var rim := _add_rim(b, base_rim_col, 1.0)

	# Dedicated solid dark gunmetal nameplate strip at bottom (NEVER obscures the vehicle/building artwork!)
	if lbl_s != "":
		var plate := ColorRect.new()
		plate.color = Color("241b08") if is_on else Color("070e13")
		plate.anchor_left = 0.0; plate.anchor_right = 1.0; plate.anchor_top = 1.0; plate.anchor_bottom = 1.0
		plate.offset_left = 2; plate.offset_right = -2; plate.offset_top = -18; plate.offset_bottom = -2
		plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(plate)

		var div := ColorRect.new()
		div.color = Color(UI.GOLD.r, UI.GOLD.g, UI.GOLD.b, 0.65) if is_on else Color(STEEL_HI.r, STEEL_HI.g, STEEL_HI.b, 0.55)
		div.anchor_left = 0.0; div.anchor_right = 1.0; div.anchor_top = 1.0; div.anchor_bottom = 1.0
		div.offset_left = 2; div.offset_right = -2; div.offset_top = -18; div.offset_bottom = -17
		div.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(div)

		var nm := UI.label(lbl_s, 11, UI.GOLD_HI if is_on else (Color(0.95, 0.97, 0.96) if not b.disabled else Color(0.56, 0.60, 0.64)), "bold")
		nm.anchor_left = 0.0; nm.anchor_right = 1.0; nm.anchor_top = 1.0; nm.anchor_bottom = 1.0
		nm.offset_left = 3; nm.offset_right = -3; nm.offset_top = -18; nm.offset_bottom = -1
		nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		nm.clip_text = true
		nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(nm)

	# Top-left badge for queue count / ready mark (x3, OK)
	var mark_s := str(it.get("mark", ""))
	if mark_s == "✓": mark_s = "OK"
	if mark_s != "":
		var mp := PanelContainer.new()
		mp.position = Vector2(3, 3)
		mp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var msb := StyleBoxFlat.new()
		msb.bg_color = Color(0.08, 0.24, 0.14, 0.90) if mark_s == "OK" else Color(0.04, 0.08, 0.12, 0.88)
		msb.border_color = Color("54df80") if mark_s == "OK" else Color(UI.GOLD.r, UI.GOLD.g, UI.GOLD.b, 0.65)
		msb.set_border_width_all(1); msb.set_corner_radius_all(2)
		msb.content_margin_left = 4; msb.content_margin_right = 4; msb.content_margin_top = 0; msb.content_margin_bottom = 0
		mp.add_theme_stylebox_override("panel", msb)
		var mk := UI.label(mark_s, 10, Color("8cf5aa") if mark_s == "OK" else Color(1.0, 0.96, 0.74), "bold")
		mk.mouse_filter = Control.MOUSE_FILTER_IGNORE
		mp.add_child(mk)
		b.add_child(mp)

	# Separate HOTKEY keycap (corner keycap badge) vs COST / STATUS pill (top-right)
	var price_s := str(it.get("price", ""))
	var explicit_key := str(it.get("key", ""))
	var is_key_in_price := price_s != "" and not price_s.begins_with("$") and not price_s.begins_with("+$") and price_s != "owned" and price_s != "researching"
	var hotkey_s := explicit_key if explicit_key != "" else (price_s if is_key_in_price else "")
	var cost_s := "" if is_key_in_price else price_s

	if hotkey_s != "":
		var kp := PanelContainer.new()
		if mark_s == "":
			kp.anchor_left = 0.0; kp.anchor_top = 0.0
			kp.offset_left = 3; kp.offset_top = 3
		else:
			kp.anchor_left = 0.0; kp.anchor_top = 1.0; kp.anchor_bottom = 1.0
			kp.offset_left = 3; kp.offset_top = -35; kp.offset_bottom = -20
		kp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var ksb := StyleBoxFlat.new()
		ksb.bg_color = Color(0.05, 0.09, 0.13, 0.90)
		ksb.border_color = Color(UI.CYAN.r, UI.CYAN.g, UI.CYAN.b, 0.58) if not is_on else UI.GOLD_HI
		ksb.set_border_width_all(1); ksb.border_width_bottom = 2; ksb.set_corner_radius_all(2)
		ksb.content_margin_left = 4; ksb.content_margin_right = 4; ksb.content_margin_top = 0; ksb.content_margin_bottom = 0
		kp.add_theme_stylebox_override("panel", ksb)
		var kl := UI.label(hotkey_s, 9, UI.GOLD_HI if is_on else Color("b4e4f4"), "mono")
		kl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		kp.add_child(kl)
		b.add_child(kp)

	if cost_s != "":
		var disp := cost_s
		var pcol: Color = UI.GOLD_HI
		var pbg: Color = Color(0.03, 0.06, 0.08, 0.88)
		var pborder: Color = Color(UI.GOLD.r, UI.GOLD.g, UI.GOLD.b, 0.52)
		var show_lock := false
		if cost_s == "owned":
			disp = "OWNED"
			pcol = Color("7cf2a2")
			pbg = Color(0.05, 0.18, 0.10, 0.90)
			pborder = Color("46cc72")
		elif cost_s == "researching":
			disp = "ACTIVE"
			pcol = Color("94eaff")
			pbg = Color(0.05, 0.15, 0.22, 0.90)
			pborder = UI.CYAN
		elif cost_s.begins_with("+$"):
			pcol = Color("7cf2a2")
			pbg = Color(0.05, 0.16, 0.10, 0.88)
			pborder = Color("46cc72")
		elif needs_tech:
			show_lock = true
			pcol = Color("90a0aa")
			pbg = Color(0.08, 0.10, 0.13, 0.92)
			pborder = Color("465864")
		elif b.disabled and cost_s.begins_with("$"):
			# Insufficient funds -> crisp crimson badge
			pcol = Color("ff7a6e")
			pbg = Color(0.24, 0.05, 0.05, 0.92)
			pborder = Color("e04a40")
		var pp := PanelContainer.new()
		pp.anchor_left = 1.0; pp.anchor_right = 1.0; pp.anchor_top = 0.0; pp.anchor_bottom = 0.0
		pp.offset_left = -64; pp.offset_right = -3; pp.offset_top = 3; pp.offset_bottom = 18
		pp.grow_horizontal = Control.GROW_DIRECTION_BEGIN
		pp.size_flags_horizontal = Control.SIZE_SHRINK_END
		pp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var psb := StyleBoxFlat.new()
		psb.bg_color = pbg
		psb.border_color = pborder
		psb.set_border_width_all(1); psb.set_corner_radius_all(2)
		psb.content_margin_left = 4; psb.content_margin_right = 4; psb.content_margin_top = 0; psb.content_margin_bottom = 0
		pp.add_theme_stylebox_override("panel", psb)
		var phb := HBoxContainer.new()
		phb.add_theme_constant_override("separation", 2)
		phb.alignment = BoxContainer.ALIGNMENT_END
		phb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		pp.add_child(phb)
		if show_lock:
			var lic := TextureRect.new()
			lic.texture = UI.icon("ban")
			lic.custom_minimum_size = Vector2(9, 9)
			lic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			lic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			lic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			lic.modulate = Color("90a0aa")
			lic.mouse_filter = Control.MOUSE_FILTER_IGNORE
			phb.add_child(lic)
		var pr := UI.label(disp, 10, pcol, "bold")
		pr.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		phb.add_child(pr)
		b.add_child(pp)

	if it.has("prog"):
		var pg := _progress(UI.GOLD_HI)
		pg.anchor_right = 1.0; pg.anchor_top = 1.0; pg.anchor_bottom = 1.0
		pg.offset_left = 2; pg.offset_right = -2; pg.offset_top = -5; pg.offset_bottom = -1
		pg.value = float(it.prog)
		pg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pg)

	# Smooth hover glow & rim lift
	b.mouse_entered.connect(func():
		if b.disabled: return
		rim.color = UI.GOLD_SPEC
		bg.modulate = Color(1.06, 1.04, 0.92)
		if art_rect != null:
			art_rect.modulate = UI.GOLD_HI if is_svg_icon else Color(1.14, 1.12, 1.05))
	b.mouse_exited.connect(func():
		rim.color = base_rim_col
		bg.modulate = base_bg_mod
		if art_rect != null:
			art_rect.modulate = base_art_mod)

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
	for it in items: sig += "%s|%s|%s|%s|%s|%s;" % [it.label, it.get("price", ""), it.get("ok", true), it.get("mark", ""), it.get("on", false), int(float(it.get("prog", 0)) * 20)]
	for q in queue: sig += "q%s%d" % [q.kind, int(float(q.p) * 25)]
	sig += str(B.cameo_ver)
	if sig == cmd_sig: return
	cmd_sig = sig

	var title_s := str(d.get("title", "")).to_upper()
	cmd_title.text = title_s if title_s != "" else "TACTICAL COMMAND"
	cmd_sub.text = str(d.get("sub", ""))

	if is_mob and cmd_mob_row != null:
		for c in cmd_mob_row.get_children(): c.free()
		for it in items:
			cmd_mob_row.add_child(_cameo_btn(it))
	else:
		var cols := 8 if items.size() > COLS * 2 else COLS
		var slots := cols * 2
		cmd_grid.columns = cols
		for c in cmd_grid.get_children(): c.free()
		var shown := mini(items.size(), slots)
		for i in shown:
			cmd_grid.add_child(_cameo_btn(items[i]))
		for i in range(shown, slots):
			cmd_grid.add_child(_empty_slot())

	# Compact 2-row queue mini-dock so active production queues NEVER crush cmd_grid!
	for c in queue_row.get_children(): c.free()
	queue_row.visible = not queue.is_empty()
	if not queue.is_empty():
		var q_sep := ColorRect.new()
		q_sep.color = Color(STEEL_HI.r, STEEL_HI.g, STEEL_HI.b, 0.55)
		q_sep.custom_minimum_size = Vector2(1, 0)
		q_sep.size_flags_vertical = Control.SIZE_EXPAND_FILL
		q_sep.mouse_filter = Control.MOUSE_FILTER_IGNORE
		queue_row.add_child(q_sep)

		var qg := GridContainer.new()
		qg.columns = 1 if (is_mob or queue.size() <= 2) else 2
		qg.add_theme_constant_override("h_separation", 3)
		qg.add_theme_constant_override("v_separation", 3)
		qg.size_flags_vertical = Control.SIZE_EXPAND_FILL
		queue_row.add_child(qg)

		var max_q := 2 if is_mob else 4
		var qn := 0
		for q in queue:
			if qn >= max_q: break
			var extra := ("+%d" % (queue.size() - max_q)) if (qn == max_q - 1 and queue.size() > max_q) else ""
			var qb := _cameo_btn({label = "", cameo = q.cameo, id = "q%d" % qn, mark = extra, tip = "%s - right-click cancels" % q.name, on_right = q.cancel, prog = q.p if qn == 0 else 0.0})
			qb.custom_minimum_size = Vector2(46, 56) if not is_mob else Vector2(48, 68)
			qb.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			qg.add_child(qb)
			qn += 1

func _portrait() -> void:
	var p: Dictionary = B.portrait()
	var has_sel := not p.is_empty()
	port_idle_box.visible = not has_sel
	port_pic.visible = has_sel
	if not has_sel:
		if port_vet_pill != null: port_vet_pill.visible = false
		_port_vet_n = 0
		port_name.text = "COMMAND READY"
		port_name.add_theme_color_override("font_color", Color("b6c8d4"))
		port_hp.visible = false
		port_ammo.visible = false
		port_info.add_theme_font_size_override("font_size", 10)
		port_info.text = "H: HQ · B: Dozer · P: Gen"
		return

	var nm := str(p.get("name", "")).to_upper()
	var info_s := str(p.get("info", ""))
	var lo := info_s.to_lower()
	var nm_col: Color = UI.TEXT
	var vet_n := 0
	var vet_col := UI.CYAN
	if "heroic" in lo:
		nm_col = UI.GOLD_HI; vet_n = 3; vet_col = UI.GOLD_HI
	elif "elite" in lo:
		nm_col = UI.GOLD; vet_n = 2; vet_col = UI.GOLD
	elif "veteran" in lo:
		nm_col = UI.CYAN; vet_n = 1; vet_col = Color("8ceaff")
	port_name.text = nm
	port_name.add_theme_color_override("font_color", nm_col)
	port_info.text = info_s

	if port_vet != null and port_vet_pill != null and vet_n != _port_vet_n:
		_port_vet_n = vet_n
		for c in port_vet.get_children(): c.queue_free()
		port_vet_pill.visible = vet_n > 0
		if vet_n > 0:
			var st_tex := UI.icon("star")
			for _i in vet_n:
				var st := TextureRect.new()
				st.texture = st_tex
				st.custom_minimum_size = Vector2(12, 12)
				st.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
				st.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
				st.modulate = vet_col
				st.mouse_filter = Control.MOUSE_FILTER_IGNORE
				port_vet.add_child(st)

	port_hp.visible = p.has("hp")
	if p.has("hp"):
		var f := clampf(float(p.hp), 0.0, 1.0)
		port_hp.value = f
		var hp_col: Color
		if f > 0.6:
			hp_col = Color("f0a828").lerp(Color("38d65a"), clampf((f - 0.6) / 0.15, 0.0, 1.0))
		elif f >= 0.3:
			hp_col = Color("e83e32").lerp(Color("f0a828"), clampf((f - 0.3) / 0.12, 0.0, 1.0))
		else:
			hp_col = Color("e83e32")
		(port_hp.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = hp_col

	port_ammo.visible = p.has("ammo")
	if p.has("ammo"):
		var af := clampf(float(p.ammo), 0.0, 1.0)
		port_ammo.value = af
		(port_ammo.get_theme_stylebox("fill") as StyleBoxFlat).bg_color = Color("4da6ff") if af > 0.05 else Color("e83e32")

	port_pic.texture = B.cameo(str(p.get("cameo", "")))

# ---------------------------------------------------------------- ready powers column (Zero Hour right rail with crisp 32x32 icons)
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
		b.custom_minimum_size = Vector2(96, 52) if is_mob else Vector2(106, 56)
		var pct := int(float(p.ready) * 100.0)
		var rdy: bool = float(p.ready) >= 1.0
		var armed: bool = B.armed == "power:" + str(p.key)
		b.disabled = not rdy
		b.tooltip_text = "%s%s\n%s\n%s" % [p.name, " — READY" if rdy else " (%d%% recharging)" % pct, str(p.get("desc", "")), "Click to arm, then RIGHT-click target (left-click cancels)" if rdy else "Recharging..."]

		var n_bg := Color("42320e") if armed else (Color("142c36") if rdy else Color("0a1116"))
		var n_edge := UI.GOLD_HI if armed else (UI.GOLD if rdy else Color("20303a"))
		b.add_theme_stylebox_override("normal", _bevel(n_bg, n_edge, n_edge, 3))
		b.add_theme_stylebox_override("hover", _bevel(Color("1f4452"), UI.GOLD_HI, UI.GOLD_HI, 3))
		b.add_theme_stylebox_override("pressed", _bevel(Color("42320e"), UI.GOLD_HI, UI.GOLD_HI, 3))
		b.add_theme_stylebox_override("disabled", _steel(Color("0a1116"), Color("1c2a32"), 1, 3))
		b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		var rim_col := UI.GOLD_SPEC if (armed or rdy) else Color(0.45, 0.62, 0.72, 0.16)
		var rim := _add_rim(b, rim_col, 1.0)

		var ic := _pow_icon(str(p.key) + " " + str(p.name))
		var ic_rect: TextureRect = null
		if ic != null:
			var sock := Panel.new()
			sock.position = Vector2(4, 5); sock.size = Vector2(36, 36)
			sock.add_theme_stylebox_override("panel", _steel(Color("070c10"), UI.GOLD_DIM if rdy else Color("1d2d36"), 1, 2))
			sock.mouse_filter = Control.MOUSE_FILTER_IGNORE
			b.add_child(sock)

			var tr := TextureRect.new()
			tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.texture = ic
			tr.position = Vector2(2, 2); tr.size = Vector2(32, 32)
			tr.modulate = Color(1.0, 0.96, 0.76) if armed else (UI.GOLD_HI if rdy else Color(0.42, 0.50, 0.56))
			tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
			sock.add_child(tr)
			ic_rect = tr

		var lx := 44.0 if ic != null else 6.0
		var lw := (b.custom_minimum_size.x - lx - 4.0)
		var l := UI.label(str(p.name), 10, Color(1.0, 0.96, 0.78) if armed else (UI.TEXT if rdy else Color("687c86")), "bold")
		l.position = Vector2(lx, 4); l.size = Vector2(lw, 25)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.add_theme_constant_override("line_spacing", -3)
		l.clip_text = true; l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(l)

		var st_txt := "ARMED" if armed else ("READY" if rdy else "%d%%" % pct)
		var st_col := Color(1.0, 0.95, 0.65) if armed else (UI.GOLD_HI if rdy else UI.CYAN)
		var sl := UI.label(st_txt, 9, st_col, "mono")
		sl.position = Vector2(lx, 31); sl.size = Vector2(lw, 12)
		sl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(sl)

		var pg := _progress(UI.GOLD_HI if rdy else UI.CYAN)
		pg.anchor_left = 0.0; pg.anchor_right = 1.0
		pg.anchor_top = 1.0; pg.anchor_bottom = 1.0
		pg.offset_left = 4; pg.offset_right = -4
		pg.offset_top = -8; pg.offset_bottom = -3
		pg.value = float(p.ready); pg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(pg)

		if rdy:
			b.mouse_entered.connect(func():
				rim.color = Color(1.0, 0.96, 0.78, 0.72)
				if ic_rect != null: ic_rect.modulate = Color(1.0, 0.98, 0.84))
			b.mouse_exited.connect(func():
				rim.color = rim_col
				if ic_rect != null: ic_rect.modulate = Color(1.0, 0.96, 0.76) if armed else UI.GOLD_HI)

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
	var k := minf(mini_w / mw, mini_h / mh)
	return Vector2(k, k)

func _mo() -> Vector2:
	var k := _mk().x
	return Vector2((mini_w - float(B.map.MAPW) * k) * 0.5, (mini_h - float(B.map.MAPH) * k) * 0.5)

func _mini_bake() -> void:
	var map: Dictionary = B.map
	var k := _mk().x
	var w := int(float(map.MAPW) * k); var h := int(float(map.MAPH) * k)
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	var hmax := 1.0
	if map.get("hgrid") != null:
		for v in map.hgrid.a: hmax = maxf(hmax, float(v))
	var th := str(map.get("theme", "desert"))
	var gw := int(map.GW); var cell := float(map.CELL)
	for y in h:
		for x in w:
			var wx := x / k; var wy := y / k
			var g: float = B.sim.ground_h(wx, wy) / hmax
			var c: Color
			if th == "snow": c = Color(0.42, 0.47, 0.54).lerp(Color(0.68, 0.73, 0.80), g)
			elif th == "green": c = Color(0.24, 0.34, 0.20).lerp(Color(0.40, 0.48, 0.30), g)
			else: c = Color(0.36, 0.32, 0.24).lerp(Color(0.62, 0.54, 0.40), g)
			var gi := int(wy / cell) * gw + int(wx / cell)
			if gi < map.grid.size():
				var ct := int(map.grid[gi])
				if ct == 3: c = c * 0.52
				elif ct == 1 or ct == 4: c = Color(0.08, 0.24, 0.34)
				elif ct == 2: c = Color(0.26, 0.39, 0.44)
			if gi < map.wood.size() and int(map.wood[gi]) > 0: c = c.lerp(Color(0.16, 0.30, 0.14), 0.58)
			if B.sim.nav.P_ROAD and B.sim.nav.on_road(wx, wy): c = c.lerp(Color(0.72, 0.67, 0.56), 0.55)
			img.set_pixel(x, y, c)
	mini_tex = ImageTexture.create_from_image(img)

func _mini_draw() -> void:
	if B.sim == null or B.map.is_empty() or not B.started: return   # P1 BRIDGE: the battle arrives a few frames after the start (sim in a Web Worker)
	if mini_tex == null: _mini_bake()
	var sim = B.sim
	var k := _mk().x; var o := _mo()
	mini.draw_rect(Rect2(Vector2.ZERO, Vector2(mini_w, mini_h)), Color(0.02, 0.04, 0.05))
	mini.draw_texture(mini_tex, o)
	# Subtle tactical radar grid overlay
	var gc := Color(0.45, 0.72, 0.78, 0.08)
	for gx in 3:
		var lx := mini_w * float(gx + 1) / 4.0
		mini.draw_line(Vector2(lx, 0), Vector2(lx, mini_h), gc, 1.0)
	for gy in 2:
		var ly := mini_h * float(gy + 1) / 3.0
		mini.draw_line(Vector2(0, ly), Vector2(mini_w, ly), gc, 1.0)
	# supply area: yours green, enemy red where you have seen it (lines when the sim has supply roads, else the circles)
	var sp: Array = B.supply_draw()
	for s in sp:
		if s.has("r"): mini.draw_arc(Vector2(s.x, s.y) * k + o, float(s.r) * k, 0, TAU, 20, s.col, 1.0)
		else: _mini_line(s.pts, k, o, s.col, bool(s.get("cut", false)))
	for f in sim.fields:
		if f.amt > 0: mini.draw_rect(Rect2(Vector2(f.x, f.y) * k + o - Vector2(2, 2), Vector2(4, 4)), Color(0.98, 0.86, 0.36))
	for oi in sim.oil:
		if oi.dead: continue
		mini.draw_circle(Vector2(oi.x, oi.y) * k + o, 2.8, B.team_col(int(oi.owner)))
	for e in sim.ents:
		if e.dead or not B.visible_ent(e): continue
		var c: Color = B.team_col(e.team)
		if B.bsel.has(e.id): c = Color(1, 1, 1)
		var p := Vector2(e.x, e.y) * k + o
		if e.is_b: mini.draw_rect(Rect2(p - Vector2(3, 3), Vector2(6, 6)), c)
		else: mini.draw_rect(Rect2(p - Vector2(1.4, 1.4), Vector2(2.8, 2.8)), c)
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
	# Zero Hour corner radar ticks
	var tc := Color(UI.GOLD.r, UI.GOLD.g, UI.GOLD.b, 0.65)
	var L := 8.0
	for corner in [[Vector2(2, 2), Vector2(1, 1)], [Vector2(mini_w - 2, 2), Vector2(-1, 1)], [Vector2(2, mini_h - 2), Vector2(1, -1)], [Vector2(mini_w - 2, mini_h - 2), Vector2(-1, -1)]]:
		var cp: Vector2 = corner[0]; var cd: Vector2 = corner[1]
		mini.draw_line(cp, cp + Vector2(cd.x * L, 0), tc, 1.4)
		mini.draw_line(cp, cp + Vector2(0, cd.y * L), tc, 1.4)
	# camera view (a trapezoid that turns with Q and stays valid even when pitched up toward the horizon)
	var vs := mini.get_viewport().get_visible_rect().size
	var pts: Array = []
	var mw := float(B.map.MAPW); var mh := float(B.map.MAPH)
	for s2 in [Vector2(0, 0), Vector2(vs.x, 0), Vector2(vs.x, vs.y - bar_h), Vector2(0, vs.y - bar_h)]:
		var g: Vector2 = B._ground_at(s2)
		if g == Vector2.INF:
			var ro: Vector3 = B.cam.project_ray_origin(s2)
			var rd: Vector3 = B.cam.project_ray_normal(s2)
			g = Vector2(clampf(ro.x + rd.x * 2600.0, 0.0, mw), clampf(ro.z + rd.z * 2600.0, 0.0, mh))
		pts.append(Vector2(clampf(g.x, 0.0, mw), clampf(g.y, 0.0, mh)) * k + o)
	for i in 4: mini.draw_line(pts[i], pts[(i + 1) % 4], Color(1, 1, 1, 0.88), 1.2)

func _mini_line(pts: Array, k: float, o: Vector2, col: Color, cut: bool) -> void:
	for i in pts.size() - 1:
		var a: Vector2 = Vector2(pts[i][0], pts[i][1]) * k + o; var b: Vector2 = Vector2(pts[i + 1][0], pts[i + 1][1]) * k + o
		if cut: mini.draw_dashed_line(a, b, col, 1.5, 3.0)
		else: mini.draw_line(a, b, col, 1.5)

func mini_to_world(p: Vector2) -> Vector2:
	return (p - _mo()) / _mk().x

func _mini_input(ev: InputEvent) -> void:
	if B.sim == null: return
	if ev is InputEventScreenTouch or ev is InputEventScreenDrag:
		var w_t := mini_to_world(ev.position)
		B.cam_target = w_t
		mini.accept_event()
		return
	if not (ev is InputEventMouseButton or ev is InputEventMouseMotion): return
	var w := mini_to_world(ev.position)
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_RIGHT:
		B.order_at_world(w, ev.ctrl_pressed, ev.alt_pressed)
		mini.accept_event()
	elif (ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT) or (ev is InputEventMouseMotion and ev.button_mask & MOUSE_BUTTON_MASK_LEFT):
		B.cam_target = w
		mini.accept_event()

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
	vb.add_child(UI.menu_item("Resume", close_window, 20, "", 340, "play"))
	var sv := UI.menu_item("Save game", func(): B.save_game(""); close_window(), 17, "", 340, "ckpt")
	sv.disabled = not can_save
	if sv.disabled: sv.modulate = Color(0.62, 0.66, 0.70, 0.80)
	vb.add_child(sv)
	var ld := UI.menu_item("Load game", func(): open_load(), 17, "", 340, "map")
	ld.disabled = B.online != null
	if ld.disabled: ld.modulate = Color(0.62, 0.66, 0.70, 0.80)
	vb.add_child(ld)
	vb.add_child(UI.menu_item("Options & Sound", open_settings, 17, "", 340, "gear"))
	vb.add_child(UI.menu_item("Controls", open_help, 17, "", 340, "help"))
	if B.online == null: vb.add_child(UI.menu_item("Restart", func(): B.restart(), 17, "", 340, "restart"))
	vb.add_child(UI.menu_item("Surrender and leave" if B.online != null else "Exit to menu", func(): B.leave(), 17, "", 340, "quit"))

func open_load() -> void:
	var vb := _open("load", 520, "Load game")
	var files := UI.list_files("saves")
	if files.is_empty(): vb.add_child(UI.para("No saved battles yet.", 13))
	for i in mini(files.size(), 8):
		var f: Dictionary = files[i]
		var path: String = f.path
		vb.add_child(UI.menu_item(f.name, func(): B.load_file(path), 16, "%s | %s | %s" % [UI.nat_name(f.fac), UI.fmt_time(f.t), UI.fmt_when(f.when)], 480, "ckpt"))
	vb.add_child(UI.button("Back", open_pause, 14))

func open_settings() -> void:
	var vb := _open("settings", 490, "Options & Sound")
	var au = get_node_or_null("/root/Audio")
	var au_map := {"vol_master": "master", "vol_music": "music", "vol_sfx": "effects", "vol_voice": "voices"}
	for it in [["Master volume", "vol_master", "sound"], ["Music", "vol_music", "music"], ["Battle sounds", "vol_sfx", "sound"], ["Unit voices", "vol_voice", "voice"], ["Scroll speed", "scroll_speed", "speed"]]:
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 8)
		hb.alignment = BoxContainer.ALIGNMENT_CENTER
		var ic := TextureRect.new()
		ic.texture = UI.icon(str(it[2]))
		ic.custom_minimum_size = Vector2(14, 14)
		ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		ic.modulate = UI.CYAN
		hb.add_child(ic)
		var l := UI.label(str(it[0]).to_upper(), 12, UI.TEXT_DIM)
		l.custom_minimum_size.x = 132
		l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var s := HSlider.new()
		var key: String = it[1]
		s.min_value = 0.4 if key == "scroll_speed" else 0.0; s.max_value = 2.0 if key == "scroll_speed" else 1.0; s.step = 0.05
		if au != null and au_map.has(key):
			s.value = float(au.vol.get(au_map[key], 100)) / 100.0
		else:
			s.value = float(UI.opt(key))
		s.custom_minimum_size = Vector2(210, 22)
		s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		UI.slider_style(s)
		var val_l := UI.label(("%.1fx" % s.value) if key == "scroll_speed" else ("%d%%" % int(roundf(s.value * 100.0))), 12, UI.GOLD_HI, "mono")
		val_l.custom_minimum_size.x = 44
		val_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		val_l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		s.value_changed.connect(func(v):
			UI.set_opt(key, v)
			val_l.text = ("%.1fx" % float(v)) if key == "scroll_speed" else ("%d%%" % int(roundf(float(v) * 100.0)))
			if au != null and au_map.has(key):
				au.set_vol(au_map[key], int(roundf(float(v) * 100.0))))
		hb.add_child(l); hb.add_child(s); hb.add_child(val_l); vb.add_child(hb)
	vb.add_child(UI.spacer(4))
	for it in [["mouse_lock", "Keep the mouse inside the window"], ["edge_scroll", "Scroll at the screen edges"], ["deselect_after_order", "Deselect units after an order"], ["show_fps", "Show frames per second"]]:
		var c := CheckButton.new()
		c.text = it[1]; c.button_pressed = bool(UI.opt(it[0]))
		UI.check_style(c)
		var key: String = it[0]
		c.toggled.connect(func(v): UI.set_opt(key, v))
		vb.add_child(c)
	vb.add_child(UI.spacer(4))
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

## Generals' powers: rank, points to spend, the nation's powers with real icons & status badges
func open_powers(force_reopen: bool = false) -> void:
	if not force_reopen and window_kind == "powers": close_window(); return
	var vb := _open("powers", 660, "Generals' powers")
	var sim = B.sim
	var T: Dictionary = sim.teams[B.me]
	var ranks: Array = sim.R.RANKS
	var rk := int(T.rank)
	var gp_pts: int = B.gp_points()
	var nxt := float(ranks[rk]) if rk < ranks.size() else 0.0
	var r_hb := HBoxContainer.new()
	r_hb.add_theme_constant_override("separation", 8)
	var r_ic := TextureRect.new()
	r_ic.texture = UI.icon("star")
	r_ic.custom_minimum_size = Vector2(18, 18)
	r_ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	r_ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	r_ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	r_ic.modulate = UI.GOLD_HI
	r_hb.add_child(r_ic)
	r_hb.add_child(UI.label("RANK %d   |   %d POINT%s AVAILABLE" % [rk, gp_pts, "" if gp_pts == 1 else "S"], 18, UI.GOLD_HI if gp_pts > 0 else UI.TEXT, "display"))
	vb.add_child(r_hb)
	if nxt > 0:
		var pg := _progress(UI.GOLD_HI)
		pg.custom_minimum_size = Vector2(600, 8)
		pg.value = clampf((float(T.gxp) - float(ranks[rk - 1])) / maxf(1.0, nxt - float(ranks[rk - 1])), 0, 1)
		vb.add_child(pg)
		vb.add_child(UI.label("Next rank at %d experience (you have %d). Destroying enemy units and buildings earns it." % [int(nxt), int(T.gxp)], 12, UI.TEXT_DIM))
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 10); g.add_theme_constant_override("v_separation", 8)
	vb.add_child(g)
	for p in B.gpow_list():
		var have: bool = bool(p.have)
		var can: bool = bool(p.can)
		var pkey := str(p.key)
		var b := Button.new()
		b.name = "GP_" + pkey
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(304, 72)
		b.disabled = have or not can
		b.tooltip_text = str(p.desc)
		var bg_c := Color("162a1f") if have else (Color("2c2410") if can else Color("0d151b"))
		var ed_c := Color("46cc72") if have else (UI.GOLD if can else Color("24343f"))
		b.add_theme_stylebox_override("normal", _bevel(bg_c, ed_c, ed_c, 3))
		b.add_theme_stylebox_override("hover", _bevel(Color("3c3014"), UI.GOLD_HI, UI.GOLD_HI, 3))
		b.add_theme_stylebox_override("pressed", _bevel(Color("4c3c16"), UI.GOLD_HI, UI.GOLD_HI, 3))
		b.add_theme_stylebox_override("disabled", _bevel(bg_c, ed_c, ed_c, 3))
		b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		var rim := _add_rim(b, Color(0.45, 0.92, 0.62, 0.45) if have else (UI.GOLD_SPEC if can else Color(0.45, 0.60, 0.68, 0.16)))

		var mc := MarginContainer.new()
		mc.set_anchors_preset(Control.PRESET_FULL_RECT)
		mc.mouse_filter = Control.MOUSE_FILTER_IGNORE
		mc.add_theme_constant_override("margin_left", 8); mc.add_theme_constant_override("margin_right", 8)
		mc.add_theme_constant_override("margin_top", 7); mc.add_theme_constant_override("margin_bottom", 7)
		b.add_child(mc)

		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 10)
		hb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		mc.add_child(hb)

		var sock := Panel.new()
		sock.custom_minimum_size = Vector2(46, 46)
		sock.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		sock.add_theme_stylebox_override("panel", _steel(Color("070c10"), ed_c, 1, 3))
		sock.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.add_child(sock)

		var ic := _pow_icon(pkey + " " + str(p.name))
		var tr := TextureRect.new()
		tr.texture = ic if ic != null else UI.icon("star")
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.position = Vector2(5, 5); tr.size = Vector2(36, 36)
		tr.modulate = Color("8cf5aa") if have else (UI.GOLD_HI if can else Color(0.48, 0.56, 0.62))
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		sock.add_child(tr)

		var tv := VBoxContainer.new()
		tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tv.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		tv.add_theme_constant_override("separation", 2)
		tv.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hb.add_child(tv)

		var top_r := HBoxContainer.new()
		top_r.add_theme_constant_override("separation", 6)
		top_r.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tv.add_child(top_r)

		var nm := UI.label(str(p.name).to_upper(), 15, Color("b4f8c8") if have else (UI.GOLD_HI if can else UI.TEXT_DIM), "display")
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nm.clip_text = true; nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
		top_r.add_child(nm)

		var badge_txt := "OWNED" if have else ("UNLOCK" if can else "LOCKED")
		var badge_col := Color("7cf2a2") if have else (UI.GOLD_HI if can else Color("7c8e98"))
		var bp := PanelContainer.new()
		bp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var bps := StyleBoxFlat.new()
		bps.bg_color = Color(0.05, 0.20, 0.11, 0.92) if have else (Color(0.28, 0.21, 0.06, 0.92) if can else Color(0.06, 0.09, 0.12, 0.92))
		bps.border_color = badge_col
		bps.set_border_width_all(1); bps.set_corner_radius_all(2)
		bps.content_margin_left = 5; bps.content_margin_right = 5; bps.content_margin_top = 1; bps.content_margin_bottom = 1
		bp.add_theme_stylebox_override("panel", bps)
		var bl := UI.label(badge_txt, 9, badge_col, "bold")
		bl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bp.add_child(bl)
		top_r.add_child(bp)

		var dl := UI.label(str(p.desc), 11, Color("c4d4d8") if (have or can) else Color("70828a"), "mono")
		dl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		dl.max_lines_visible = 2
		dl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		dl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tv.add_child(dl)

		if can:
			b.mouse_entered.connect(func():
				rim.color = Color(1.0, 0.96, 0.78, 0.72)
				tr.modulate = Color(1.0, 0.98, 0.84))
			b.mouse_exited.connect(func():
				rim.color = UI.GOLD_SPEC
				tr.modulate = UI.GOLD_HI)
			b.pressed.connect(func(): B.buy_gpow(pkey); open_powers(true))
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
