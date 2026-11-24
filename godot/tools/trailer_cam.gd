## Cinematic Trailer Director for World War 3 (--trailer=<act> --write-movie ... --fixed-fps 30)
## Purely visual offline trailer capture helper: hides HUD, pre-warms AI battle before Frame 1,
## choreographs smooth 3D camera sweeps, spawns live armor clashes, triggers superweapons on beat,
## and renders crisp 2.35:1 cinema letterbox + animated military title typography + 22-nation flag bar.
extends Node

const FPS := 30.0
const ALL_FLAGS := ["US", "IR", "RS", "IL", "RU", "CN", "TR", "SA", "PK", "GB", "FR", "DE", "IN", "JP", "KR", "EG", "UA", "KP", "AE", "DW", "RV", "OB"]

var B
var act := ""
var inited := false
var frame_i := 0
var dur := 6.0
var total_frames := 180

# Camera keyframe endpoints
var p0 := Vector2.ZERO
var p1 := Vector2.ZERO
var d0 := 480.0
var d1 := 360.0
var yaw0 := -0.35
var yaw1 := 0.25
var pitch0 := -20.0
var pitch1 := -12.0
var sw_fired := false
var sw_fired2 := false

# Cinema UI nodes
var layer: CanvasLayer
var top_bar: ColorRect
var bot_bar: ColorRect
var flash_rect: ColorRect
var fade_rect: ColorRect
var scrim_rect: ColorRect
var title_box: Control
var title_lbl: RichTextLabel
var sub_lbl: Label
var flag_strip: HBoxContainer
var outro_root: Control
var outro_map: TextureRect
var outro_content: VBoxContainer
var font_bold: Font
var font_mono: Font


func _init(battle_node, act_name: String) -> void:
	B = battle_node
	act = act_name


func _ready() -> void:
	font_bold = load("res://ui/SairaCondensed-Bold.ttf")
	font_mono = load("res://ui/IBMPlexMono-Regular.ttf")
	_build_cinema_ui()
	if fade_rect != null: fade_rect.color.a = 1.0


func _hide_game_hud() -> void:
	if B.ui != null: B.ui.visible = false
	if B.hud != null and B.hud.get("layer") != null: B.hud.layer.visible = false
	var gl = B.world_view.env.grade_layer if (B.world_view != null and B.world_view.env != null) else null
	for ch in B.get_children():
		if ch is CanvasLayer and ch != layer and ch != gl:
			(ch as CanvasLayer).visible = false
	if B.ring_mmi != null: B.ring_mmi.visible = false
	if B.bar_mmi != null: B.bar_mmi.visible = false
	if B.lbl_fps != null: B.lbl_fps.visible = false
	if B.world_view != null and B.world_view.fx != null:
		B.world_view.fx.fog_off()
	B.see_all = true
	B.ai_only = true


func _prewarm(secs: float) -> void:
	var steps := int(secs * 60.0)
	for i in steps:
		if B.sim.over: break
		B.sim.step()
	# Sync interpolation buffer so Frame 1 has zero position jumps
	B.prev.clear()
	for e in B.sim.ents:
		if not e.dead:
			B.prev[e.id] = Vector3(e.x, e.y, e.ang)


func _spawn_clash(center: Vector2) -> void:
	# Stage a dense, cinematic opposing armor + air + infantry battle right across `center`
	var left_kinds := ["tank", "tank", "tank", "ifv", "ifv", "arty", "inf", "inf", "heli", "heli"]
	var right_kinds := ["tank", "tank", "tank", "ifv", "ifv", "arty", "inf", "inf", "inf"]
	var left_units := []
	var right_units := []
	for i in left_kinds.size():
		var k: String = left_kinds[i]
		if B.sim.stats(B.sim.teams[0].fac, k).is_empty(): k = "tank" if k != "inf" else "inf"
		var px := center.x - 165.0 - float(i % 3) * 42.0 + randf_range(-16.0, 16.0)
		var py := center.y + (float(i) - 4.5) * 34.0 + randf_range(-12.0, 12.0)
		var u = B.sim.add_unit(0, k, px, py)
		if u != null:
			u.ang = 0.0
			left_units.append(u)
	for i in right_kinds.size():
		var k: String = right_kinds[i]
		if B.sim.stats(B.sim.teams[1].fac, k).is_empty(): k = "tank" if k != "inf" else "inf"
		var px := center.x + 165.0 + float(i % 3) * 42.0 + randf_range(-16.0, 16.0)
		var py := center.y + (float(i) - 4.0) * 36.0 + randf_range(-12.0, 12.0)
		var u = B.sim.add_unit(1, k, px, py)
		if u != null:
			u.ang = PI
			right_units.append(u)
	# Order both formations straight into combat so cannon fire & tracers erupt immediately!
	for u in left_units:
		u.order = {type = "attackMove", x = center.x + 140.0, y = center.y + randf_range(-60.0, 60.0)}
	for u in right_units:
		u.order = {type = "attackMove", x = center.x - 140.0, y = center.y + randf_range(-60.0, 60.0)}
	B.prev.clear()
	for e in B.sim.ents:
		if not e.dead:
			B.prev[e.id] = Vector3(e.x, e.y, e.ang)


func _spawn_target_cluster(center: Vector2) -> void:
	# Place a dramatic enemy armor column + fortifications in the superweapon blast zone
	var kinds := ["tank", "tank", "tank", "ifv", "ifv", "arty", "inf", "inf"]
	for i in kinds.size():
		var k: String = kinds[i]
		if B.sim.stats(B.sim.teams[1].fac, k).is_empty(): k = "tank"
		var ang := float(i) * (TAU / float(kinds.size()))
		var r := 45.0 + float(i % 3) * 32.0
		var u = B.sim.add_unit(1, k, center.x + cos(ang) * r, center.y + sin(ang) * r)
		if u != null:
			u.ang = ang + PI * 0.5
			u.order = {type = "attackMove", x = center.x - 90.0, y = center.y}
	B.prev.clear()
	for e in B.sim.ents:
		if not e.dead:
			B.prev[e.id] = Vector3(e.x, e.y, e.ang)


func _base_center(team_idx: int) -> Vector2:
	var hq = B.sim.hq_of(team_idx)
	if hq != null:
		return Vector2(float(hq.x), float(hq.y))
	return Vector2(900.0, 1600.0)


func _configure_act() -> void:
	match act:
		"act1":
			dur = 6.5
			_prewarm(210.0)
			var bc := _base_center(0)
			p0 = bc + Vector2(60.0, -40.0)
			p1 = bc + Vector2(180.0, 40.0)
			d0 = 560.0; d1 = 370.0
			yaw0 = -0.40; yaw1 = 0.24
			pitch0 = -24.0; pitch1 = -13.0
		"act2a":
			dur = 4.0
			_prewarm(180.0)
			var bc := _base_center(0)
			p0 = bc + Vector2(-30.0, -20.0)
			p1 = bc + Vector2(120.0, 50.0)
			d0 = 460.0; d1 = 350.0
			yaw0 = -0.32; yaw1 = 0.28
			pitch0 = -16.0; pitch1 = -12.0
		"act2b":
			dur = 4.0
			_prewarm(195.0)
			var bc := _base_center(0)
			p0 = bc + Vector2(30.0, 30.0)
			p1 = bc + Vector2(150.0, -40.0)
			d0 = 440.0; d1 = 330.0
			yaw0 = 0.26; yaw1 = -0.26
			pitch0 = -17.0; pitch1 = -12.0
		"act3":
			dur = 10.0
			_prewarm(205.0)
			var bc := _base_center(0)
			var mid := bc + Vector2(560.0, 40.0)
			_spawn_clash(mid)
			p0 = mid + Vector2(-60.0, 20.0)
			p1 = mid + Vector2(75.0, -25.0)
			d0 = 360.0; d1 = 290.0
			yaw0 = -0.48; yaw1 = 0.36
			pitch0 = -19.0; pitch1 = -15.0
		"act4_scud":
			dur = 4.0
			_prewarm(195.0)
			var bc := _base_center(1)
			var tgt := bc + Vector2(-90.0, 20.0)
			_spawn_target_cluster(tgt)
			p0 = tgt + Vector2(-30.0, 0.0)
			p1 = tgt + Vector2(20.0, 10.0)
			d0 = 460.0; d1 = 390.0
			yaw0 = -0.22; yaw1 = 0.22
			pitch0 = -21.0; pitch1 = -16.0
		"act4_beam":
			dur = 4.0
			_prewarm(195.0)
			var bc := _base_center(1)
			var tgt := bc + Vector2(-80.0, -10.0)
			_spawn_target_cluster(tgt)
			p0 = tgt + Vector2(10.0, 20.0)
			p1 = tgt + Vector2(-20.0, -15.0)
			d0 = 430.0; d1 = 360.0
			yaw0 = 0.30; yaw1 = -0.28
			pitch0 = -20.0; pitch1 = -15.0
		"act4_nuke":
			dur = 4.0
			_prewarm(195.0)
			var bc := _base_center(1)
			var tgt := bc + Vector2(-70.0, 10.0)
			_spawn_target_cluster(tgt)
			p0 = tgt
			p1 = tgt + Vector2(0.0, -20.0)
			d0 = 470.0; d1 = 560.0
			yaw0 = -0.18; yaw1 = 0.24
			pitch0 = -22.0; pitch1 = -17.0
		"act4_carpet":
			dur = 3.0
			_prewarm(195.0)
			var bc := _base_center(1)
			var tgt := bc + Vector2(-60.0, 0.0)
			_spawn_target_cluster(tgt)
			p0 = tgt + Vector2(-40.0, 15.0)
			p1 = tgt + Vector2(40.0, -15.0)
			d0 = 480.0; d1 = 410.0
			yaw0 = -0.26; yaw1 = 0.20
			pitch0 = -19.0; pitch1 = -14.0
		"act5_outro":
			dur = 7.5
			p0 = _base_center(0); p1 = p0
			d0 = 600.0; d1 = 600.0
			yaw0 = 0.0; yaw1 = 0.0
			pitch0 = -18.0; pitch1 = -18.0
		_:
			dur = 4.0
			p0 = _base_center(0); p1 = p0 + Vector2(100, 0)
	total_frames = int(round(dur * FPS))
	B.cam_y = float(B.sim.ground_h(p0.x, p0.y))


func _build_cinema_ui() -> void:
	layer = CanvasLayer.new()
	layer.layer = 120
	add_child(layer)

	var vp := get_viewport().get_visible_rect().size
	if vp.x < 100.0: vp = Vector2(1280.0, 720.0)
	var bar_h := roundf(vp.y * 0.105)

	if act == "act5_outro":
		_build_outro_ui(vp)
		return

	# Subtle lower-third dark scrim for crisp text legibility
	scrim_rect = ColorRect.new()
	scrim_rect.color = Color(0.03, 0.05, 0.08, 0.0)
	scrim_rect.position = Vector2(0.0, vp.y - bar_h - 148.0)
	scrim_rect.size = Vector2(vp.x, 148.0)
	layer.add_child(scrim_rect)

	# 2.35:1 Anamorphic Letterbox Bars + sleek amber tactical edge hairline
	top_bar = ColorRect.new()
	top_bar.color = Color(0.02, 0.025, 0.035, 1.0)
	top_bar.position = Vector2.ZERO
	top_bar.size = Vector2(vp.x, bar_h)
	layer.add_child(top_bar)
	var top_line := ColorRect.new()
	top_line.color = Color(0.95, 0.72, 0.22, 0.55)
	top_line.position = Vector2(0.0, bar_h - 1.5)
	top_line.size = Vector2(vp.x, 1.5)
	top_bar.add_child(top_line)

	bot_bar = ColorRect.new()
	bot_bar.color = Color(0.02, 0.025, 0.035, 1.0)
	bot_bar.position = Vector2(0.0, vp.y - bar_h)
	bot_bar.size = Vector2(vp.x, bar_h)
	layer.add_child(bot_bar)
	var bot_line := ColorRect.new()
	bot_line.color = Color(0.95, 0.72, 0.22, 0.55)
	bot_line.position = Vector2(0.0, 0.0)
	bot_line.size = Vector2(vp.x, 1.5)
	bot_bar.add_child(bot_line)

	# Title container (centered for Act 1 & Act 4 superweapon slams, lower-third for Act 2 & Act 3)
	title_box = Control.new()
	title_box.size = vp
	layer.add_child(title_box)

	var is_center := act == "act1" or act.begins_with("act4_")
	title_lbl = RichTextLabel.new()
	title_lbl.bbcode_enabled = true
	title_lbl.fit_content = true
	title_lbl.scroll_active = false
	title_lbl.add_theme_font_override("normal_font", font_bold)
	title_lbl.add_theme_font_override("bold_font", font_bold)
	title_lbl.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.90))
	title_lbl.add_theme_constant_override("shadow_offset_x", 3)
	title_lbl.add_theme_constant_override("shadow_offset_y", 4)
	title_lbl.add_theme_constant_override("shadow_outline_size", 8)
	title_lbl.position = Vector2(0.0, vp.y * 0.34 if act == "act1" else (vp.y * 0.65 if is_center else vp.y - bar_h - 122.0))
	title_lbl.size = Vector2(vp.x, 120.0)
	title_box.add_child(title_lbl)

	sub_lbl = Label.new()
	sub_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub_lbl.add_theme_font_override("font", font_mono)
	sub_lbl.add_theme_font_size_override("font_size", 20 if act == "act1" else 17)
	sub_lbl.add_theme_color_override("font_color", Color(0.98, 0.80, 0.34, 1.0))
	sub_lbl.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.92))
	sub_lbl.add_theme_constant_override("shadow_offset_x", 2)
	sub_lbl.add_theme_constant_override("shadow_offset_y", 2)
	sub_lbl.position = Vector2(0.0, title_lbl.position.y + (122.0 if act == "act1" else 76.0))
	sub_lbl.size = Vector2(vp.x, 40.0)
	title_box.add_child(sub_lbl)
	if act == "act1":
		scrim_rect.position = Vector2(0.0, title_lbl.position.y - 12.0)
		scrim_rect.size = Vector2(vp.x, 186.0)
	elif is_center:
		scrim_rect.position = Vector2(0.0, title_lbl.position.y - 10.0)
		scrim_rect.size = Vector2(vp.x, 128.0)

	# Populate headline + subhead per act
	match act:
		"act1":
			title_lbl.add_theme_font_size_override("normal_font_size", 94)
			title_lbl.text = "[center][color=#f4f7fb]WORLD WAR [/color][color=#f5b82e]3[/color][/center]"
			sub_lbl.text = "R E A L - T I M E   M O D E R N   W A R F A R E"
		"act2a":
			title_lbl.add_theme_font_size_override("normal_font_size", 56)
			title_lbl.text = "[center][color=#f4f7fb]22 PLAYABLE [/color][color=#f5b82e]NATIONS[/color][/center]"
			sub_lbl.text = "UNIQUE UNITS  •  DOCTRINES  •  3D WAVING FLAGS"
			_add_flag_strip(vp, bar_h)
		"act2b":
			title_lbl.add_theme_font_size_override("normal_font_size", 56)
			title_lbl.text = "[center][color=#f4f7fb]BUILD & [/color][color=#f5b82e]CONQUER[/color][/center]"
			sub_lbl.text = "FORTIFY YOUR BASE  •  HOLD THE SUPPLY LINES"
			_add_flag_strip(vp, bar_h)
		"act3":
			title_lbl.add_theme_font_size_override("normal_font_size", 56)
			title_lbl.text = "[center][color=#f4f7fb]HYPER-REALISTIC [/color][color=#f5b82e]PBR WARFARE[/color][/center]"
			sub_lbl.text = "ROLLED-STEEL ARMOR  •  COMBINED ARMS  •  SMOOTH 60 FPS"
		"act4_scud":
			title_lbl.add_theme_font_size_override("normal_font_size", 64)
			title_lbl.text = "[center][color=#ff5938]SCUD [/color][color=#f4f7fb]STORMS[/color][/center]"
			sub_lbl.text = "BALLISTIC MISSILE BARRAGES"
		"act4_beam":
			title_lbl.add_theme_font_size_override("normal_font_size", 64)
			title_lbl.text = "[center][color=#66d4ff]ORBITAL [/color][color=#f4f7fb]PARTICLE CANNONS[/color][/center]"
			sub_lbl.text = "DIRECTED ENERGY SPACE STRIKES"
		"act4_nuke":
			title_lbl.add_theme_font_size_override("normal_font_size", 64)
			title_lbl.text = "[center][color=#ffae2e]TACTICAL [/color][color=#f4f7fb]NUKES[/color][/center]"
			sub_lbl.text = "TOTAL THERMONUCLEAR DEVASTATION"
		"act4_carpet":
			title_lbl.add_theme_font_size_override("normal_font_size", 62)
			title_lbl.text = "[center][color=#f5b82e]22 UNIQUE [/color][color=#f4f7fb]SUPERWEAPONS[/color][/center]"
			sub_lbl.text = "ONE FOR EVERY NATION"

	# White-gold hit flash & black cinema fade curtains
	flash_rect = ColorRect.new()
	flash_rect.color = Color(1.0, 0.96, 0.86, 0.0)
	flash_rect.size = vp
	layer.add_child(flash_rect)

	fade_rect = ColorRect.new()
	fade_rect.color = Color(0.0, 0.0, 0.0, 0.0)
	fade_rect.size = vp
	layer.add_child(fade_rect)


func _add_flag_strip(vp: Vector2, bar_h: float) -> void:
	flag_strip = HBoxContainer.new()
	flag_strip.alignment = BoxContainer.ALIGNMENT_CENTER
	flag_strip.add_theme_constant_override("separation", 6)
	flag_strip.position = Vector2(20.0, vp.y - bar_h + (bar_h - 26.0) * 0.5)
	flag_strip.size = Vector2(vp.x - 40.0, 26.0)
	for fk in ALL_FLAGS:
		var path := "res://ui/icons/flags/%s.png" % fk
		if not ResourceLoader.exists(path): continue
		var tr := TextureRect.new()
		tr.texture = load(path)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(44.0, 26.0)
		flag_strip.add_child(tr)
	layer.add_child(flag_strip)


func _build_outro_ui(vp: Vector2) -> void:
	outro_root = Control.new()
	outro_root.size = vp
	layer.add_child(outro_root)

	var bg := ColorRect.new()
	bg.color = Color(0.03, 0.05, 0.07, 1.0)
	bg.size = vp
	outro_root.add_child(bg)

	outro_map = TextureRect.new()
	if ResourceLoader.exists("res://ui/menu-world.webp"):
		outro_map.texture = load("res://ui/menu-world.webp")
	outro_map.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	outro_map.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	outro_map.size = vp
	outro_map.pivot_offset = vp * 0.5
	outro_map.modulate = Color(0.72, 0.80, 0.88, 0.82)
	outro_root.add_child(outro_map)

	var dark := ColorRect.new()
	dark.color = Color(0.02, 0.035, 0.055, 0.62)
	dark.size = vp
	outro_root.add_child(dark)

	outro_content = VBoxContainer.new()
	outro_content.alignment = BoxContainer.ALIGNMENT_CENTER
	outro_content.add_theme_constant_override("separation", 14)
	outro_content.position = Vector2(0.0, 48.0)
	outro_content.size = Vector2(vp.x, vp.y - 96.0)
	outro_root.add_child(outro_content)

	var logo := RichTextLabel.new()
	logo.bbcode_enabled = true
	logo.fit_content = true
	logo.scroll_active = false
	logo.add_theme_font_override("normal_font", font_bold)
	logo.add_theme_font_size_override("normal_font_size", 108)
	logo.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.92))
	logo.add_theme_constant_override("shadow_offset_x", 4)
	logo.add_theme_constant_override("shadow_offset_y", 5)
	logo.text = "[center][color=#f4f7fb]WORLD WAR [/color][color=#f5b82e]3[/color][/center]"
	outro_content.add_child(logo)

	var tag := Label.new()
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tag.add_theme_font_override("font", font_mono)
	tag.add_theme_font_size_override("font_size", 21)
	tag.add_theme_color_override("font_color", Color(0.84, 0.90, 0.96, 0.95))
	tag.text = "22 NATIONS   •   UNIQUE SUPERWEAPONS   •   REAL-TIME MODERN WARFARE"
	outro_content.add_child(tag)

	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0.0, 12.0)
	outro_content.add_child(sp)

	# Full 22-nation flag showcase bar
	var frow := HBoxContainer.new()
	frow.alignment = BoxContainer.ALIGNMENT_CENTER
	frow.add_theme_constant_override("separation", 6)
	for fk in ALL_FLAGS:
		var path := "res://ui/icons/flags/%s.png" % fk
		if not ResourceLoader.exists(path): continue
		var tr := TextureRect.new()
		tr.texture = load(path)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(46.0, 28.0)
		frow.add_child(tr)
	outro_content.add_child(frow)

	var sp2 := Control.new()
	sp2.custom_minimum_size = Vector2(0.0, 20.0)
	outro_content.add_child(sp2)

	var cta := Label.new()
	cta.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	cta.add_theme_font_override("font", font_bold)
	cta.add_theme_font_size_override("font_size", 42)
	cta.add_theme_color_override("font_color", Color(0.98, 0.78, 0.24, 1.0))
	cta.text = "PLAY FREE IN YOUR BROWSER — DESKTOP & MOBILE"
	outro_content.add_child(cta)

	var url := Label.new()
	url.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	url.add_theme_font_override("font", font_mono)
	url.add_theme_font_size_override("font_size", 24)
	url.add_theme_color_override("font_color", Color(0.62, 0.88, 1.0, 1.0))
	url.text = "ww3.abdullah-haidar5.workers.dev"
	outro_content.add_child(url)

	flash_rect = ColorRect.new()
	flash_rect.color = Color(1.0, 0.96, 0.86, 0.0)
	flash_rect.size = vp
	layer.add_child(flash_rect)

	fade_rect = ColorRect.new()
	fade_rect.color = Color(0.0, 0.0, 0.0, 0.0)
	fade_rect.size = vp
	layer.add_child(fade_rect)


func _smooth(u: float) -> float:
	u = clampf(u, 0.0, 1.0)
	return u * u * (3.0 - 2.0 * u)


func _update_cam(t: float) -> void:
	var u := _smooth(t / maxf(dur, 0.01))
	B.cam_target = p0.lerp(p1, u)
	B.cam_dist = lerpf(d0, d1, u)
	B.cam_yaw = lerpf(yaw0, yaw1, u)
	B.cam_yaw_t = B.cam_yaw
	B.cam_pitch_off = lerpf(pitch0, pitch1, u)
	B.cam_pitch_off_t = B.cam_pitch_off


func _update_ui(t: float) -> void:
	if act == "act5_outro":
		var u := clampf(t / dur, 0.0, 1.0)
		var sc := 1.0 + u * 0.08
		outro_map.scale = Vector2(sc, sc)
		var content_a := clampf((t - 0.15) / 0.55, 0.0, 1.0)
		outro_content.modulate.a = content_a
		flash_rect.color.a = clampf(1.0 - t / 0.35, 0.0, 1.0) * 0.45
		fade_rect.color.a = clampf((t - (dur - 1.1)) / 1.1, 0.0, 1.0)
		return

	# Subtle fade-in on Act 1 cold open, crisp flash hits on Act 4 superweapons
	var fade_a := 0.0
	if act == "act1" and t < 0.85:
		fade_a = 1.0 - (t / 0.85)
	elif t > dur - 0.22:
		fade_a = (t - (dur - 0.22)) / 0.22
	fade_rect.color.a = clampf(fade_a, 0.0, 1.0)

	# Title animation timing
	var ta := 0.0
	var fl := 0.0
	if act == "act1":
		if t >= 2.0:
			ta = clampf((t - 2.0) / 0.35, 0.0, 1.0) * clampf((dur - 0.35 - t) / 0.45, 0.0, 1.0)
			fl = clampf(1.0 - (t - 2.0) / 0.28, 0.0, 1.0) * 0.35
	elif act.begins_with("act4_"):
		ta = clampf((t - 0.15) / 0.25, 0.0, 1.0) * clampf((dur - 0.25 - t) / 0.30, 0.0, 1.0)
		fl = clampf(1.0 - t / 0.22, 0.0, 1.0) * 0.42
	elif act == "act3":
		ta = clampf((t - 0.8) / 0.45, 0.0, 1.0) * clampf((6.2 - t) / 0.60, 0.0, 1.0)
	else:
		ta = clampf((t - 0.25) / 0.35, 0.0, 1.0) * clampf((dur - 0.28 - t) / 0.35, 0.0, 1.0)

	title_box.modulate.a = clampf(ta, 0.0, 1.0)
	if scrim_rect != null:
		scrim_rect.color.a = (0.48 if act == "act1" else 0.58) * clampf(ta, 0.0, 1.0)
	flash_rect.color.a = fl


func tick() -> void:
	if not B.started or B.sim == null:
		if B.ui != null: B.ui.visible = false
		return
	if not inited:
		inited = true
		_hide_game_hud()
		_configure_act()
	var t := float(frame_i) / FPS
	_update_cam(t)
	_update_ui(t)

	# Trigger real 3D GPU superweapons right on cue!
	if not sw_fired and B.world_view != null and B.world_view.fx != null:
		if act == "act4_scud" and t >= 0.12:
			sw_fired = true
			B._demo_fire_sw("scud", p0)
		elif act == "act4_beam" and t >= 0.12:
			sw_fired = true
			B._demo_fire_sw("beam", p0)
		elif act == "act4_nuke" and t >= 0.20:
			sw_fired = true
			B._demo_fire_sw("nuke", p0)
		elif act == "act4_carpet" and t >= 0.10:
			sw_fired = true
			B._demo_fire_sw("carpet", p0)
	if not sw_fired2 and act == "act4_carpet" and t >= 0.55 and B.world_view != null and B.world_view.fx != null:
		sw_fired2 = true
		B._demo_fire_sw("storm", p0 + Vector2(60.0, -30.0))

	# Keep HUD hidden even if alerts/popups fire
	if B.ui != null: B.ui.visible = false

	frame_i += 1
	if frame_i >= total_frames:
		get_tree().quit()
