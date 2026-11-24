## Epic Persistent Loading Screen ($75 AAA C&C Generals / CoH3 Tactical Dossier style).
## Attaches to `tree.root` so it SURVIVES `change_scene_to_file()` — guaranteeing ZERO blank/black frames between
## Menu -> Battle, Save/Replay loads, and Restarts!
## Pulls authentic faction-specific historical quotes (+ original script + author) directly from nations.json.
extends CanvasLayer

const UI = preload("res://scripts/ui/ui_kit.gd")
const Missions = preload("res://scripts/ui/missions.gd")
const MIN_T := 3.2
const FADE_T := 0.85

static var active = null

const FALLBACK_QUOTES := {
	"IR": [{"text": "Humiliation is far from us!", "original": "هيهات منا الذلة", "by": "Imam Hussein ibn Ali, Karbala, 680"}],
	"RS": [{"text": "Plot your plots, strive your utmost: by God, you will never erase our remembrance.", "original": "فكِدْ كيدك، واسعَ سعيك، فوالله لا تمحو ذكرنا", "by": "Sayyida Zaynab bint Ali, Damascus, 680"}],
	"DW": [{"text": "By God, never was a people attacked in the heart of their homes but they were humiliated.", "original": "فَوَاللَّهِ مَا غُزِيَ قَوْمٌ قَطُّ فِي عُقْرِ دَارِهِمْ إِلَّا ذَلُّوا", "by": "Imam Ali ibn Abi Talib, Nahj al-Balagha"}],
	"RV": [{"text": "The mountains may move, but do not you move. Plant your feet firmly in the earth.", "original": "تزول الجبال ولا تزل، أعر الله جمجمتك، تِد في الأرض قدمك", "by": "Imam Ali ibn Abi Talib, Nahj al-Balagha"}],
	"OB": [{"text": "Every street is a front line, every home a fortress.", "original": "", "by": "Field Commander"}],
	"US": [{"text": "A good plan violently executed now is better than a perfect plan executed next week.", "original": "", "by": "Gen. George S. Patton"}],
	"RU": [{"text": "Hard in training, easy on the march.", "original": "Тяжело в ученье — легко в походе.", "by": "Field Marshal Alexander Suvorov"}],
	"CN": [{"text": "Swift as the wind, silent as the forest, fierce as fire, immovable as the mountain.", "original": "其疾如风，其徐如林，侵掠如火，不动如山", "by": "Sun Tzu, The Art of War"}],
}

const TIPS := [
	"Hold your supply lines — units refill ammunition inside your supply area.",
	"Flank heavy tanks: their side and rear armor are far thinner than the glacis.",
	"Garrison buildings and dig in (I) to cut incoming rifle and shell fire dramatically.",
	"Right-click issues move and attack orders; left-click deploys buildings and rally points.",
	"Veteran units fire faster and hit harder — pull damaged elite squads back to repair.",
	"Hold Shift + Mouse Wheel (or Middle-Mouse / Q + drag, PageUp / PageDown) to tilt & orbit the camera; Home resets.",
]
const STEPS := [
	"INITIALIZING THEATER SIMULATION",
	"SURVEYING TERRAIN & ROADS",
	"DEPLOYING ARMOR & INFANTRY",
	"ESTABLISHING SUPPLY LINES",
	"SYNCHRONIZING COMMAND LINK",
]

var t := 0.0
var ready_t := -1.0
var prog := 0.04
var skip_fast := false
var stage_override := ""
var root: Control
var bar: ColorRect
var bar_glow: ColorRect
var bar_w := 680.0
var status_lbl: Label
var pct_lbl: Label
var hint_skip: Label
var flag_bg: TextureRect
var sparks: Control
var spark_pts: Array = []

static func show_screen(tree: SceneTree, my_fac: String, en_fac: String, map_key: String, map_name: String, kind_label: String):
	dismiss_immediate()
	var s = new()
	s.layer = 125
	s.process_mode = Node.PROCESS_MODE_ALWAYS
	tree.root.add_child(s)
	s._build(my_fac, en_fac, map_key, map_name, kind_label)
	active = s
	return s

static func make(host: Node, my_fac: String, en_fac: String, map_name: String, kind_label: String, map_key: String = ""):
	if active != null and is_instance_valid(active):
		return active
	return show_screen(host.get_tree(), my_fac, en_fac, map_key, map_name, kind_label)

static func set_stage(msg: String) -> void:
	if active != null and is_instance_valid(active):
		active.stage_override = msg

static func mark_ready() -> void:
	if active != null and is_instance_valid(active):
		active.set_ready()

static func dismiss_immediate() -> void:
	if active != null and is_instance_valid(active):
		active.queue_free()
	active = null

static func _flag(k: String) -> Texture2D:
	var p := "res://ui/icons/flags/%s.png" % k
	return load(p) if ResourceLoader.exists(p) else null

static func _pick_quote(fac: String) -> Dictionary:
	var nd: Dictionary = UI.nat_data(fac)
	var lq = nd.get("loading_quotes", [])
	if lq is Array and not (lq as Array).is_empty():
		var q = lq[randi() % lq.size()]
		if q is Dictionary and str(q.get("text", "")) != "":
			return q
	var fb: Array = FALLBACK_QUOTES.get(fac, [{"text": "Victorious warriors win first and then go to war.", "original": "", "by": "Sun Tzu, The Art of War"}])
	return fb[randi() % fb.size()]

func _build(my_fac: String, en_fac: String, map_key: String, map_name: String, kind_label: String) -> void:
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(root)

	# Deep military slate base
	var bg := ColorRect.new()
	bg.color = Color(0.025, 0.035, 0.042)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)

	# Full-bleed world artwork layer (dim) + faction flag overlay with slow Ken Burns push-in
	if ResourceLoader.exists("res://ui/menu-world.webp"):
		var world_pic := TextureRect.new()
		world_pic.texture = load("res://ui/menu-world.webp")
		world_pic.set_anchors_preset(Control.PRESET_FULL_RECT)
		world_pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		world_pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		world_pic.modulate = Color(0.65, 0.72, 0.78, 0.24)
		root.add_child(world_pic)

	flag_bg = TextureRect.new()
	flag_bg.texture = _flag(my_fac)
	flag_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	flag_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	flag_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	flag_bg.modulate = Color(1.0, 0.96, 0.88, 0.20)
	root.add_child(flag_bg)

	# Dramatic radial dark vignette
	var vg := TextureRect.new()
	var gt := GradientTexture2D.new()
	gt.width = 256; gt.height = 256
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.44); gt.fill_to = Vector2(1.05, 1.05)
	var gr := Gradient.new()
	gr.set_color(0, Color(0.01, 0.02, 0.03, 0.30))
	gr.add_point(0.55, Color(0.01, 0.02, 0.03, 0.72))
	gr.set_color(gr.get_point_count() - 1, Color(0.01, 0.015, 0.02, 0.96))
	gt.gradient = gr
	vg.texture = gt
	vg.set_anchors_preset(Control.PRESET_FULL_RECT)
	vg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	vg.stretch_mode = TextureRect.STRETCH_SCALE
	root.add_child(vg)

	# Animated golden battlefield embers
	for i in 36:
		spark_pts.append([randf(), randf(), randf_range(0.018, 0.055), randf_range(1.2, 2.8), randf_range(0.22, 0.65)])
	sparks = Control.new()
	sparks.set_anchors_preset(Control.PRESET_FULL_RECT)
	sparks.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sparks.draw.connect(_draw_sparks)
	root.add_child(sparks)

	# Cinematic gold top & bottom tactical letterbox accents
	for is_top in [true, false]:
		var trim := ColorRect.new()
		trim.color = Color(0.76, 0.60, 0.24, 0.55)
		trim.anchor_left = 0.0; trim.anchor_right = 1.0
		trim.anchor_top = 0.0 if is_top else 1.0
		trim.anchor_bottom = 0.0 if is_top else 1.0
		trim.offset_top = 0 if is_top else -3
		trim.offset_bottom = 3 if is_top else 0
		trim.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(trim)

	# Top tactical header bar
	var top_bar := HBoxContainer.new()
	top_bar.anchor_left = 0.05; top_bar.anchor_right = 0.95
	top_bar.offset_top = 24; top_bar.offset_bottom = 52
	top_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top_bar)
	var op_lbl := UI.label("OPERATION BRIEFING  //  " + kind_label.to_upper(), 13, UI.GOLD_HI, "mono")
	op_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_bar.add_child(op_lbl)
	var br_lbl := UI.label("WORLD WAR 3  ·  THEATER COMMAND", 13, Color(0.60, 0.72, 0.78), "mono")
	top_bar.add_child(br_lbl)

	var vp := get_viewport()
	var vp_w := vp.get_visible_rect().size.x if vp != null else 1280.0
	var compact := vp_w > 0.0 and vp_w < 960.0
	bar_w = clampf(vp_w - 64.0, 280.0, 680.0) if vp_w > 0.0 else 680.0
	var card_w := clampf(vp_w - 48.0, 300.0, 920.0) if vp_w > 0.0 else 920.0

	# Center epic dossier stack
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.offset_top = 56 if compact else 64
	col.offset_bottom = -96
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 10 if compact else 14)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(col)

	# Matchup Row: [FLAG]  YOUR NATION   [SWORDS] VS   ENEMY NATION  [FLAG]
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 12 if compact else 22)
	col.add_child(row)
	var fl_sz := Vector2(80, 48) if compact else Vector2(132, 80)
	var tit_sz := 26 if compact else 44
	row.add_child(_flag_box(my_fac, UI.GOLD_HI, fl_sz))
	var mn := UI.title(UI.nat_name(my_fac).to_upper(), tit_sz, Color(0.96, 0.95, 0.90))
	mn.add_theme_constant_override("outline_size", 4); mn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	row.add_child(mn)
	if en_fac != "":
		var vs_box := VBoxContainer.new()
		vs_box.alignment = BoxContainer.ALIGNMENT_CENTER
		vs_box.add_theme_constant_override("separation", 0)
		var sw_ic := TextureRect.new()
		sw_ic.texture = UI.icon("swords")
		sw_ic.custom_minimum_size = Vector2(18 if compact else 24, 18 if compact else 24)
		sw_ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		sw_ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		sw_ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		sw_ic.modulate = UI.GOLD_HI
		vs_box.add_child(sw_ic)
		var vs := UI.label("VS", 18 if compact else 24, UI.GOLD_HI, "bold")
		vs.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vs_box.add_child(vs)
		row.add_child(vs_box)
		var en := UI.title(UI.nat_name(en_fac).to_upper(), tit_sz, Color(0.92, 0.44, 0.36))
		en.add_theme_constant_override("outline_size", 4); en.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
		row.add_child(en)
		row.add_child(_flag_box(en_fac, Color(0.82, 0.34, 0.28), fl_sz))

	# Map Dossier Strip (Map Thumbnail + Battlefield Name + Doctrine)
	var m_row := HBoxContainer.new()
	m_row.alignment = BoxContainer.ALIGNMENT_CENTER
	m_row.add_theme_constant_override("separation", 16)
	col.add_child(m_row)
	if map_key != "":
		var m_thumb := Missions.map_thumb(map_key, 128)
		if m_thumb != null:
			var m_frame := PanelContainer.new()
			var msb := StyleBoxFlat.new()
			msb.bg_color = Color(0.04, 0.06, 0.08, 0.95); msb.border_color = Color(0.45, 0.62, 0.70, 0.85)
			msb.set_border_width_all(1); msb.set_content_margin_all(2)
			msb.shadow_color = Color(0, 0, 0, 0.5); msb.shadow_size = 6
			m_frame.add_theme_stylebox_override("panel", msb)
			var mtr := TextureRect.new()
			mtr.texture = m_thumb
			mtr.custom_minimum_size = Vector2(88, 60) if compact else Vector2(104, 72)
			mtr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			mtr.stretch_mode = TextureRect.STRETCH_SCALE
			m_frame.add_child(mtr)
			m_row.add_child(m_frame)
	var mv := VBoxContainer.new()
	mv.alignment = BoxContainer.ALIGNMENT_CENTER
	mv.add_theme_constant_override("separation", 2)
	if map_name != "":
		mv.add_child(UI.label("THEATER:  " + map_name.to_upper(), 16 if compact else 18, UI.CYAN, "bold"))
	var nd: Dictionary = UI.nat_data(my_fac)
	var doct := str(nd.get("doctrine_name", ""))
	if doct != "":
		mv.add_child(UI.label("DOCTRINE:  " + doct.to_upper(), 12 if compact else 13, Color(0.76, 0.82, 0.84), "mono"))
	m_row.add_child(mv)

	col.add_child(UI.spacer(6 if compact else 12))

	# Framed Faction Quote Dossier Card (Original Native Script + English Translation + Historical Source)
	var q: Dictionary = _pick_quote(my_fac)
	var q_card := PanelContainer.new()
	q_card.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	q_card.custom_minimum_size.x = card_w
	var qsb := StyleBoxFlat.new()
	qsb.bg_color = Color(0.032, 0.052, 0.068, 0.84)
	qsb.border_color = Color(0.78, 0.62, 0.24, 0.82)
	qsb.border_width_left = 4; qsb.border_width_right = 4
	qsb.border_width_top = 1; qsb.border_width_bottom = 2
	qsb.set_content_margin_all(14 if compact else 20)
	qsb.shadow_color = Color(0, 0, 0, 0.55); qsb.shadow_size = 12; qsb.shadow_offset = Vector2(0, 4)
	q_card.add_theme_stylebox_override("panel", qsb)
	col.add_child(q_card)

	var qv := VBoxContainer.new()
	qv.alignment = BoxContainer.ALIGNMENT_CENTER
	qv.add_theme_constant_override("separation", 6 if compact else 8)
	q_card.add_child(qv)

	var q_text_w := maxf(240.0, card_w - 60.0)
	var q_orig := str(q.get("original", ""))
	if q_orig != "":
		var qf := UI.font("quote_orig")
		if UI.font_supports_text(qf, q_orig):
			var ol := UI.label(q_orig, 18 if compact else 22, Color(0.92, 0.78, 0.44, 0.92), "quote_orig")
			ol.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			ol.text_direction = Control.TEXT_DIRECTION_AUTO
			ol.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			ol.custom_minimum_size.x = q_text_w
			qv.add_child(ol)

	var ql := UI.label("\u201C" + str(q.get("text", "")) + "\u201D", 20 if compact else 26, Color(0.96, 0.94, 0.88), "display")
	ql.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ql.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ql.custom_minimum_size.x = q_text_w
	qv.add_child(ql)

	var q_by := str(q.get("by", ""))
	if q_by != "":
		var al := UI.label("\u2014  " + q_by.to_upper(), 13 if compact else 14, UI.GOLD_HI, "bold")
		al.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		qv.add_child(al)

	# Bottom Telemetry & Progress Bar
	var bot := VBoxContainer.new()
	bot.anchor_left = 0.5; bot.anchor_right = 0.5
	bot.anchor_top = 1.0; bot.anchor_bottom = 1.0
	bot.offset_left = -bar_w * 0.5; bot.offset_right = bar_w * 0.5
	bot.offset_top = -104; bot.offset_bottom = -18
	bot.add_theme_constant_override("separation", 6)
	bot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bot)

	var bh := HBoxContainer.new()
	status_lbl = UI.label(STEPS[0] + "...", 13, Color(0.80, 0.88, 0.92), "mono")
	status_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bh.add_child(status_lbl)
	pct_lbl = UI.label("4%", 13, UI.GOLD_HI, "mono")
	bh.add_child(pct_lbl)
	bot.add_child(bh)

	var bc := Panel.new()
	bc.custom_minimum_size = Vector2(bar_w, 11)
	var bsb := StyleBoxFlat.new()
	bsb.bg_color = Color(0.035, 0.065, 0.088, 0.96); bsb.border_color = Color(0.38, 0.54, 0.62, 0.85)
	bsb.set_border_width_all(1); bsb.border_width_bottom = 2; bsb.set_corner_radius_all(2)
	bsb.shadow_color = Color(0, 0, 0, 0.45); bsb.shadow_size = 6
	bc.add_theme_stylebox_override("panel", bsb)
	UI.add_rim(bc, Color(0.68, 0.86, 0.94, 0.25))
	bot.add_child(bc)

	bar = ColorRect.new(); bar.color = Color(0.86, 0.68, 0.24); bar.position = Vector2(1, 1); bar.size = Vector2(bar_w * 0.04, 8); bc.add_child(bar)
	bar_glow = ColorRect.new(); bar_glow.color = Color(1.0, 0.94, 0.72, 0.88); bar_glow.position = Vector2(bar_w * 0.04 - 6, 1); bar_glow.size = Vector2(8, 8); bc.add_child(bar_glow)

	var tip_row := HBoxContainer.new()
	tip_row.alignment = BoxContainer.ALIGNMENT_CENTER
	var tip := UI.label("TACTICAL BRIEF:  " + String(TIPS[randi() % TIPS.size()]), 11 if compact else 12, Color(0.64, 0.74, 0.78), "mono")
	tip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tip.clip_text = true
	tip.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	tip_row.add_child(tip)
	hint_skip = UI.label("", 12, UI.GOLD_HI, "bold")
	tip_row.add_child(hint_skip)
	bot.add_child(tip_row)

	root.modulate = Color(1, 1, 1, 0.01)

func _flag_box(k: String, edge: Color, sz: Vector2 = Vector2(132, 80)) -> PanelContainer:
	var pn := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.04, 0.06, 0.08); sb.border_color = edge
	sb.set_border_width_all(2); sb.set_content_margin_all(2)
	sb.shadow_color = Color(0, 0, 0, 0.65); sb.shadow_size = 10
	pn.add_theme_stylebox_override("panel", sb)
	pn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var tr := TextureRect.new()
	tr.texture = _flag(k)
	tr.custom_minimum_size = sz
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_SCALE
	pn.add_child(tr)
	return pn

func _draw_sparks() -> void:
	var sz := sparks.size
	for s in spark_pts:
		var x := fmod(float(s[0]) + sin(t * 0.6 + float(s[1]) * 9.0) * 0.015 + 1.0, 1.0) * sz.x
		var y := fmod(float(s[1]) - t * float(s[2]) + 10.0, 1.0) * sz.y
		var pulse := 0.55 + 0.45 * sin(t * 3.5 + float(s[0]) * 14.0)
		sparks.draw_circle(Vector2(x, y), float(s[3]), Color(0.95, 0.72, 0.28, float(s[4]) * pulse))

func _input(ev: InputEvent) -> void:
	if ready_t >= 0.0 and t >= 0.35:
		if (ev is InputEventMouseButton and ev.pressed) or (ev is InputEventKey and ev.pressed and ev.keycode in [KEY_SPACE, KEY_ENTER, KEY_ESCAPE]) or (ev is InputEventScreenTouch and ev.pressed):
			skip_fast = true
			get_viewport().set_input_as_handled()

func set_ready() -> void:
	if ready_t < 0.0: ready_t = t

func _process(dt: float) -> void:
	t += minf(dt, 0.1)
	var a_in := clampf(t / 0.25, 0.0, 1.0)
	var s := 1.0 + t * 0.012
	flag_bg.pivot_offset = flag_bg.size * 0.5
	flag_bg.scale = Vector2(s, s)
	sparks.queue_redraw()

	var goal := 1.0 if ready_t >= 0.0 else 0.92 * (1.0 - exp(-t * 0.75))
	prog = lerpf(prog, goal, clampf(dt * (5.5 if ready_t >= 0.0 else 2.8), 0.0, 1.0))
	var bw := maxf(8.0, (bar_w - 2.0) * prog)
	bar.size.x = bw
	bar_glow.position.x = maxf(1.0, bw - 8.0)
	pct_lbl.text = "%d%%" % clampi(int(round(prog * 100.0)), 1, 100)
	var si := mini(int(prog * STEPS.size()), STEPS.size() - 1)
	if ready_t >= 0.0 and prog > 0.97:
		status_lbl.text = "COMMAND LINK ACTIVE"
		hint_skip.text = "▸ CLICK TO DEPLOY"
		hint_skip.modulate.a = 0.65 + 0.35 * sin(t * 6.0)
	elif stage_override != "":
		status_lbl.text = stage_override.to_upper() + ".".repeat(1 + int(t * 2.5) % 3)
	else:
		status_lbl.text = STEPS[si] + ".".repeat(1 + int(t * 2.5) % 3)

	var a_out := 1.0
	if ready_t >= 0.0:
		var start := t if skip_fast else maxf(MIN_T, ready_t + 0.45)
		if skip_fast and t > ready_t:
			a_out = maxf(0.0, root.modulate.a - dt * 3.5)
			if a_out <= 0.01:
				if active == self: active = null
				queue_free(); return
			root.modulate = Color(1, 1, 1, a_out)
			root.mouse_filter = Control.MOUSE_FILTER_IGNORE
			return
		if t > start: a_out = 1.0 - clampf((t - start) / FADE_T, 0.0, 1.0)
		if t > start + FADE_T:
			if active == self: active = null
			queue_free(); return
	var a := a_in * a_out
	root.modulate = Color(1, 1, 1, a * a * (3.0 - 2.0 * a))
	root.mouse_filter = Control.MOUSE_FILTER_STOP if a > 0.45 else Control.MOUSE_FILTER_IGNORE
