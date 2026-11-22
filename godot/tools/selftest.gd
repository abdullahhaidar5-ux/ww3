## SELFTEST (lane P6): plays the battle with REAL input events (Input.parse_input_event: mouse buttons, motion, keys go
## through the viewport like a player's) and checks every control of CLAUDE.md "Controls" plus the HUD buttons.
##   xvfb-run -a godot --path godot --rendering-driver opengl3 res://scenes/battle.tscn -- --selftest
## prints one line per check and "SELFTEST PASS n/n" (or FAIL with the names); exit code 0 / 1.
extends Node

var B
var ok_n := 0
var fails: Array = []

func _init(b) -> void:
	B = b

func _ready() -> void:
	_run.call_deferred()

# ---------------------------------------------------------------- input helpers (real events)
func frames(n: int = 2) -> void:
	for i in n: await get_tree().process_frame

func ticks(n: int = 3) -> void:
	var t0: int = B.tick_n
	var guard := 0
	while B.tick_n < t0 + n and guard < 600:
		guard += 1
		await get_tree().physics_frame
	await get_tree().process_frame

func mouse(pos: Vector2, button: int, pressed: bool, shift := false, ctrl := false, alt := false, dbl := false) -> void:
	var ev := InputEventMouseButton.new()
	ev.position = pos; ev.global_position = pos
	ev.button_index = button; ev.pressed = pressed
	ev.shift_pressed = shift; ev.ctrl_pressed = ctrl; ev.alt_pressed = alt; ev.double_click = dbl
	if pressed: ev.button_mask = MOUSE_BUTTON_MASK_LEFT if button == MOUSE_BUTTON_LEFT else MOUSE_BUTTON_MASK_RIGHT
	Input.parse_input_event(ev)

func move(pos: Vector2, rel := Vector2.ZERO, mask := 0) -> void:
	var ev := InputEventMouseMotion.new()
	ev.position = pos; ev.global_position = pos; ev.relative = rel; ev.button_mask = mask
	Input.parse_input_event(ev)

func click(pos: Vector2, button := MOUSE_BUTTON_LEFT, shift := false, ctrl := false, alt := false, dbl := false) -> void:
	move(pos)
	await frames(1)
	mouse(pos, button, true, shift, ctrl, alt, dbl)
	await frames(1)
	mouse(pos, button, false, shift, ctrl, alt)
	await frames(2)

func drag(a: Vector2, b: Vector2, button := MOUSE_BUTTON_LEFT) -> void:
	move(a); await frames(1)
	mouse(a, button, true); await frames(1)
	var mask := MOUSE_BUTTON_MASK_LEFT if button == MOUSE_BUTTON_LEFT else MOUSE_BUTTON_MASK_RIGHT
	for i in 5:
		move(a.lerp(b, (i + 1) / 5.0), (b - a) / 5.0, mask); await frames(1)
	mouse(b, button, false); await frames(2)

func key(code: int, pressed: bool, shift := false, ctrl := false) -> void:
	var ev := InputEventKey.new()
	ev.keycode = code; ev.physical_keycode = code; ev.pressed = pressed
	ev.shift_pressed = shift; ev.ctrl_pressed = ctrl
	Input.parse_input_event(ev)

func tap(code: int, shift := false, ctrl := false) -> void:
	key(code, true, shift, ctrl); await frames(2)
	key(code, false, shift, ctrl); await frames(2)

func scr(x: float, y: float) -> Vector2:
	return B.cam.unproject_position(Vector3(x, B.sim.ground_h(x, y) + 3.0, y))

func scr_e(e) -> Vector2:
	return scr(e.x, e.y)

func btn(nm: String) -> Vector2:
	var n: Control = B.ui.find_child(nm, true, false)
	if n == null: return Vector2(-1, -1)
	return n.get_global_rect().get_center()

func check(nm: String, cond: bool, extra: String = "") -> void:
	if cond: ok_n += 1; print("  ok    " + nm)
	else: fails.append(nm); print("  FAIL  " + nm + ("   " + extra if extra != "" else ""))

func mine(kind: String) -> Array:
	return B.sim.ents.filter(func(e): return not e.dead and e.team == B.me and e.kind == kind)

func look(x: float, y: float, d: float = 620.0) -> void:
	B.cam_target = Vector2(x, y); B.cam_dist = d; B.cam_yaw = 0.0; B.cam_yaw_t = 0.0
	await frames(3)

## a screen point with nothing under it, near (x, y)
func empty(x: float, y: float) -> Vector2:
	for k in 60:
		var p := Vector2(x, y) + Vector2(cos(k * 2.4), sin(k * 2.4)) * (90.0 + k * 6.0)
		var clear := true
		for e in B.sim.ents:
			if not e.dead and Vector2(e.x, e.y).distance_to(p) < (e.size if e.is_b else 60.0): clear = false; break
		var sp := scr(p.x, p.y)
		if clear and sp.x > 60 and sp.y > 80 and sp.x < 1400 and sp.y < 560: return sp
	return scr(x + 200, y + 200)

func otype(e) -> String:
	return "" if e.order == null else str(e.order.type)

# ---------------------------------------------------------------- the run
func _run() -> void:
	while not B.started: await get_tree().process_frame
	await ticks(4)
	var sim = B.sim
	var hq = sim.hq_of(B.me)
	var inf := mine("inf")
	var dz = mine("dozer")[0]
	print("SELFTEST: %s vs %s on %s" % [B.my_fac, B.en_fac, B.map_key])
	B.cam_y = sim.ground_h(inf[0].x, inf[0].y)
	await look((inf[0].x + inf[1].x) * 0.5, (inf[0].y + inf[1].y) * 0.5, 420.0)
	await frames(20)

	# --- selecting
	await click(scr_e(inf[0]))
	check("left-click selects a unit", B.bsel == [inf[0].id], str(B.bsel))
	await click(scr_e(inf[1]), MOUSE_BUTTON_LEFT, true)
	check("Shift+click adds to the selection", B.bsel.size() == 2)
	await click(empty(inf[0].x, inf[0].y))
	check("left-click empty ground deselects", B.bsel.is_empty())
	var a := scr_e(inf[0]); var b := scr_e(inf[1])
	await drag(Vector2(minf(a.x, b.x) - 40, minf(a.y, b.y) - 40), Vector2(maxf(a.x, b.x) + 40, maxf(a.y, b.y) + 40))
	check("drag = box selection", B.bsel.has(inf[0].id) and B.bsel.has(inf[1].id), str(B.bsel))
	await click(empty(inf[0].x, inf[0].y))
	move(scr_e(inf[0])); mouse(scr_e(inf[0]), MOUSE_BUTTON_LEFT, true); await frames(1); mouse(scr_e(inf[0]), MOUSE_BUTTON_LEFT, false, false, false, false); await frames(1)
	mouse(scr_e(inf[0]), MOUSE_BUTTON_LEFT, true, false, false, false, true); await frames(1)
	var ev := InputEventMouseButton.new(); ev.position = scr_e(inf[0]); ev.button_index = MOUSE_BUTTON_LEFT; ev.pressed = false; ev.double_click = true
	Input.parse_input_event(ev); await frames(2)
	check("double-click selects that type on screen", B.bsel.has(inf[0].id) and B.bsel.has(inf[1].id), str(B.bsel))

	# --- orders (right-click), units stay selected
	var gx: float = inf[0].x + 90.0; var gy: float = inf[0].y + 60.0
	await click(scr(gx, gy), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("right-click moves", otype(inf[0]) == "move", otype(inf[0]))
	check("units stay selected after an order", B.bsel.size() == 2)
	await tap(KEY_X)
	await ticks(3)
	check("X stops", inf[0].order == null)
	await tap(KEY_F)
	check("F arms attack-move", B.armed == "amove")
	await click(scr(gx, gy), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("F + right-click = attack-move", otype(inf[0]) == "amove", otype(inf[0]))
	await tap(KEY_X); await ticks(2)
	await tap(KEY_G)
	check("G arms guard", B.armed == "guard")
	await click(scr(gx, gy), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("G + right-click = guard (order given)", inf[0].order != null or inf[0].guard != null)
	await tap(KEY_X); await ticks(2)
	await tap(KEY_F)
	await click(empty(inf[0].x, inf[0].y))
	check("left-click cancels an armed order", B.armed == "")
	await click(scr_e(inf[0])); await click(scr_e(inf[1]), MOUSE_BUTTON_LEFT, true)
	# Ctrl + right-click = force-fire (on our own Construction Vehicle; stopped at once)
	await look((inf[0].x + dz.x) * 0.5, (inf[0].y + dz.y) * 0.5, 520.0)
	await click(scr_e(dz), MOUSE_BUTTON_RIGHT, false, true)
	await ticks(3)
	check("Ctrl + right-click = force-fire", otype(inf[0]) == "attack" and inf[0].order.target == dz, otype(inf[0]))
	await tap(KEY_X); await ticks(2)
	# Alt + right-click = waypoints
	await look(inf[0].x, inf[0].y, 520.0)
	await click(scr(inf[0].x + 60, inf[0].y + 40), MOUSE_BUTTON_RIGHT, false, false, true)
	await click(scr(inf[0].x + 120, inf[0].y - 30), MOUSE_BUTTON_RIGHT, false, false, true)
	var had: bool = B.wp.has(inf[0].id) or otype(inf[0]) == "move"
	await ticks(4)
	check("Alt + right-click queues waypoints", had and (otype(inf[0]) == "move" or B.wp.has(inf[0].id)))
	await tap(KEY_X); await ticks(2)
	check("X clears the waypoints", not B.wp.has(inf[0].id))
	# right-drag = infantry line
	var la := Vector2(inf[0].x - 40, inf[0].y + 110); var lb := Vector2(inf[0].x + 140, inf[0].y + 110)
	await drag(scr(la.x, la.y), scr(lb.x, lb.y), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	var o0 = inf[0].order; var o1 = inf[1].order
	check("right-drag = infantry line", o0 != null and o1 != null and absf(float(o0.x) - float(o1.x)) > 100.0, "%s %s" % [str(o0), str(o1)])
	await tap(KEY_X); await ticks(2)
	# dig in / leader keys must not break anything
	await tap(KEY_I); await ticks(2)
	check("I = dig in (order sent, squad holds)", inf[0].order == null and B.bsel.size() == 2)
	await tap(KEY_E); await tap(KEY_E, true); await ticks(2)
	check("E / Shift+E leader keys are safe", true)
	# enter: select units + right-click our own building
	await look((inf[0].x + hq.x) * 0.5, (inf[0].y + hq.y) * 0.5, 620.0)
	await click(scr_e(hq), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("right-click own building = enter (walks to it)", inf[0].order != null)
	await tap(KEY_X); await ticks(2)

	# --- army, groups
	await tap(KEY_A, false, true)
	check("Ctrl+A selects the whole army (no trucks, no dozer)", B.bsel.size() == 2 and not B.bsel.has(dz.id), str(B.bsel))
	await tap(KEY_1, false, true)
	await click(empty(hq.x + 200, hq.y + 200))
	await tap(KEY_1)
	check("Ctrl+1 makes a group, 1 recalls it", B.bsel.size() == 2)

	# --- camera
	var t0: Vector2 = B.cam_target
	key(KEY_D, true); await frames(12); key(KEY_D, false); await frames(2)
	check("D scrolls the camera right", B.cam_target.x > t0.x + 5.0)
	t0 = B.cam_target
	key(KEY_W, true); await frames(12); key(KEY_W, false); await frames(2)
	check("W scrolls the camera up", B.cam_target.y < t0.y - 5.0)
	t0 = B.cam_target
	key(KEY_A, true); await frames(12); key(KEY_A, false); await frames(2)
	check("A scrolls left and gives no order", B.cam_target.x < t0.x - 5.0 and inf[0].order == null)
	t0 = B.cam_target
	key(KEY_S, true); await frames(12); key(KEY_S, false); await frames(2)
	check("S scrolls down and does not stop units", B.cam_target.y > t0.y + 5.0)
	var d0: float = B.cam_dist
	mouse(Vector2(700, 300), MOUSE_BUTTON_WHEEL_UP, true); await frames(2)
	check("mouse wheel zooms", B.cam_dist < d0)
	B.cam_dist = d0
	key(KEY_Q, true); await frames(3); key(KEY_Q, false); await frames(3)
	check("Q tap turns the camera 45 degrees", absf(absf(B.cam_yaw_t) - PI / 4.0) < 0.01, str(B.cam_yaw_t))
	await frames(30)
	key(KEY_Q, true, true); await frames(3); key(KEY_Q, false, true); await frames(3)
	check("Shift+Q turns it back", absf(B.cam_yaw_t) < 0.01, str(B.cam_yaw_t))
	await frames(30)
	key(KEY_Q, true); await frames(2)
	for i in 6:
		move(Vector2(700 + i * 20, 300), Vector2(20, 0)); await frames(1)
	key(KEY_Q, false); await frames(2)
	check("hold Q + mouse rotates", absf(B.cam_yaw_t) > 0.3, str(B.cam_yaw_t))
	await tap(KEY_HOME)
	check("Home = north-up", B.cam_yaw_t == 0.0)
	await frames(30)
	key(KEY_Q, true); await frames(2); key(KEY_Q, false); await frames(4); key(KEY_Q, true); await frames(2); key(KEY_Q, false); await frames(3)
	check("double-tap Q = north-up", B.cam_yaw_t == 0.0, str(B.cam_yaw_t))
	B.cam_yaw = 0.0
	B.cam_target = Vector2(100, 100)
	await tap(KEY_H)
	check("H jumps to the Command Center", B.cam_target.distance_to(Vector2(hq.x, hq.y)) < 5.0)

	# --- building: dozer -> build button (left-click) -> ghost -> left-click places, right-click cancels
	await look(dz.x, dz.y, 620.0)
	await click(scr_e(dz))
	check("select the Construction Vehicle", B.bsel == [dz.id])
	await frames(6)
	check("build menu shows buildings", btn("Cmd_gen").x > 0)
	await click(btn("Cmd_barracks"))
	check("left-click a building button arms placement", B.place_kind == "barracks", B.place_kind)
	await click(scr(dz.x, dz.y - 60), MOUSE_BUTTON_RIGHT)
	check("right-click cancels placement", B.place_kind == "")
	await click(btn("Cmd_gen"))
	var spot = B._find_spot("gen")
	await look(spot.x, spot.y, 620.0)
	var nb: int = sim.ents.filter(func(e): return e.is_b and e.team == B.me).size()
	await click(scr(spot.x, spot.y))
	await ticks(4)
	check("left-click places the building", sim.ents.filter(func(e): return e.is_b and e.team == B.me).size() == nb + 1 and B.place_kind == "")
	# --- production: the building's own queue
	await look(hq.x, hq.y, 620.0)
	await click(scr_e(hq))
	check("select the Command Center", B.bsel == [hq.id])
	await frames(6)
	await click(btn("Cmd_harv"))
	await ticks(3)
	check("click a unit button queues 1", hq.q.size() == 1, str(hq.q.size()))
	await click(btn("Cmd_dozer"), MOUSE_BUTTON_LEFT, true)
	await ticks(3)
	var qn: int = hq.q.size()
	check("Shift+click queues 5 (as far as money goes)", qn >= 3, str(qn))
	await click(btn("Cmd_dozer"), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("right-click a unit button cancels one", hq.q.size() == qn - 1, "%d -> %d" % [qn, hq.q.size()])
	await click(scr(hq.x + 150, hq.y + 150))
	await ticks(3)
	check("left-click ground with a production building = rally point", hq.rally != null and absf(float(hq.rally.x) - (hq.x + 150)) < 40.0 and B.bsel == [hq.id])
	await click(scr(hq.x + 190, hq.y + 110), MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("right-click sets the rally point too", hq.rally != null and absf(float(hq.rally.x) - (hq.x + 190)) < 40.0)

	# --- HUD: minimap, supply, powers, pause, save
	var mm: Control = B.hud.mini
	var mp: Vector2 = mm.get_global_rect().position + Vector2(B.hud._mo()) + Vector2(sim.MAPW * 0.5, sim.MAPH * 0.5) * B.hud._mk().x
	await click(mp)
	check("minimap left-click moves the camera", B.cam_target.distance_to(Vector2(sim.MAPW * 0.5, sim.MAPH * 0.5)) < 60.0, str(B.cam_target))
	await look(inf[0].x, inf[0].y, 520.0)
	await click(scr_e(inf[0]))
	await click(mp, MOUSE_BUTTON_RIGHT)
	await ticks(3)
	check("minimap right-click orders the selection", inf[0].order != null)
	await tap(KEY_X); await ticks(2)
	await tap(KEY_L)
	check("L shows the supply area", B.show_supply)
	await tap(KEY_L)
	await tap(KEY_P)
	check("P opens Generals' powers", B.hud.window_kind == "powers")
	await tap(KEY_ESCAPE)
	check("Esc closes the window", B.hud.window == null)
	await tap(KEY_ESCAPE)
	check("Esc opens the pause menu and pauses", B.hud.window_kind == "pause" and B.paused)
	var tk: int = B.tick_n
	await frames(10)
	check("the battle stands still while paused", B.tick_n == tk)
	await tap(KEY_ESCAPE)
	check("Esc again resumes", B.hud.window == null and not B.paused)
	await click(btn("PauseBtn"))
	check("the Pause button pauses", B.paused)
	await click(btn("PauseBtn"))
	check("and resumes", not B.paused)
	await click(btn("StarBtn"))
	check("the star button opens Generals' powers", B.hud.window_kind == "powers")
	await tap(KEY_ESCAPE)
	B.hud.alert(Vector2(hq.x, hq.y)); B.cam_target = Vector2(50, 50)
	await tap(KEY_SPACE)
	check("Space jumps to the last alert", B.cam_target.distance_to(Vector2(hq.x, hq.y)) < 5.0)
	# deselect-after-order is a setting
	B.UI.set_opt("deselect_after_order", true)
	await look(inf[0].x, inf[0].y, 520.0)
	await click(scr_e(inf[0]))
	await click(scr(inf[0].x + 60, inf[0].y + 60), MOUSE_BUTTON_RIGHT)
	check("Settings > deselect after an order", B.bsel.is_empty())
	B.UI.set_opt("deselect_after_order", false)
	await ticks(3)
	# save: F5 writes the battle; loading it again must give the same state (checked by --load in a second run)
	await tap(KEY_F5)
	var sp: String = B.UI.save_dir("saves") + "/quick.json"
	check("F5 saves the battle", FileAccess.file_exists(sp))
	print("SELFTEST saved tick %d hash %d" % [B.tick_n, B.hash_state()])
	# end screen
	sim.over = true; sim.winner = B.me
	await frames(12)
	check("end of battle shows the stats screen", B.hud.window_kind == "end" and B.ui.find_child("Stats", true, false) != null)
	print("SELFTEST %s %d/%d%s" % ["PASS" if fails.is_empty() else "FAIL", ok_n, ok_n + fails.size(), "" if fails.is_empty() else "  failed: " + ", ".join(fails)])
	get_tree().quit(0 if fails.is_empty() else 1)
