## Lane A: Battle units visual renderer — X1 3D models in bulk MultiMeshes + animated turrets/rotors + pooled animated skinned soldiers.
##
## Lifecycle (called by battle.gd):
##   var units_view := UnitsView.new()
##   units_view.setup(self)
##   # every frame:
##   units_view.begin_frame(self)
##   units_view.draw_unit(self, fr, e, fac, p, ang, gy, col, issel, mine, vis)
##   units_view.end_frame()
##   # on restart / leave:
##   units_view.clear()
##
## Coordinate convention: X1 models are in JS world units (+Y up, unit FRONT = +X).
## Sim angle `ang` maps (cos(ang), sin(ang)) to Godot (+X, +Z), so Y rotation = -ang.
extends RefCounted

const X1 = preload("res://models/auto/x1_models.gd")
const Look = preload("res://scripts/battle/battle_look.gd")

const MAX_ANIM_SOLDIERS := 112
const MAX_SOLDIER_POOL := 200
const MAX_DYING_SOLDIERS := 20
const DYING_HOLD_TIME := 3.8
const DYING_SINK_TIME := 1.0
const ANIM_DIST_SQ := 1300.0 * 1300.0
const DUST_DIST_SQ := 1100.0 * 1100.0
const DMG_FX_DIST_SQ := 1800.0 * 1800.0
const HUGE_AABB := AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
const HIGH_AIR_KINDS := ["jet", "airlift", "tb2"]
const LOW_AIR_KINDS := ["heli", "drone"]
const RECOIL_CLS := ["tank", "arty", "aa"]
const RECOIL_KINDS := ["tank", "arty", "aa", "mlrs", "ifv", "spg"]
const LOOP_CLIPS := ["idle", "walk", "run"]

# Reusable combat VFX / overlay colors (zero per-frame allocations)
const C_VEH_SMK1 := Color(0.22, 0.21, 0.20)
const C_VEH_SMK2 := Color(0.32, 0.31, 0.30)
const C_VEH_BLK := Color(0.09, 0.08, 0.08)
const C_FIRE_HI := Color(1.0, 0.48, 0.12)
const C_FIRE_LO := Color(0.9, 0.18, 0.04)
const C_DUST_DESERT := Color(0.82, 0.72, 0.56)
const C_DUST_GREEN := Color(0.56, 0.51, 0.42)
const C_DUST_SNOW := Color(0.88, 0.91, 0.96)
const C_DUST_HARD := Color(0.64, 0.63, 0.60)
const C_WASH_WATER := Color(0.85, 0.92, 0.96)
const C_VET_BG := Color(0.08, 0.06, 0.04, 0.92)
const C_VET_1 := Color(0.86, 0.74, 0.54)
const C_VET_2 := Color(1.0, 0.84, 0.25)
const C_VET_3 := Color(1.35, 0.96, 0.30)

# Shared immutable caches across battles (ArrayMesh / metadata only, no scene nodes)
static var _meta_cache: Dictionary = {}        # "fac|kind" -> {ok, pack, pxf, h, scale, is_squad, squad}
static var _static_sol_cache: Dictionary = {}  # "fac|kind|look" -> ArrayMesh (baked bind pose, no skeleton)
static var _box_cache: Dictionary = {}         # int_size -> Mesh

var _root: Node3D = null
var _mm_root: Node3D = null
var _sol_root: Node3D = null
var _mmi: Dictionary = {}            # key -> MultiMeshInstance3D
var _buf: Dictionary = {}            # key -> Array[Transform3D]
var _ao_mi: MultiMeshInstance3D = null
var _ao_xf: Array[Transform3D] = []
var _ao_col: Array[Color] = []
var _active_sol: Dictionary = {}     # slot_id (int) -> {node, ap, key, clip, used, last_frame}
var _idle_sol: Dictionary = {}       # "fac|kind|look" -> Array[Dictionary]
var _dying_soldiers: Array = []      # Array[{node, ap, key, clip, start_t, base_y}]
var _prev_sq_alive: Dictionary = {}  # eid (int) -> int
var _fx_cd: Dictionary = {}          # eid (int) -> float (next damage smoke/fire emit time)
var _dust_cd: Dictionary = {}        # eid (int) -> float (next dust/downwash emit time)
var _last_fire_seen: Dictionary = {} # eid (int) -> float (last observed e.last_fire)
var _recoil_t: Dictionary = {}       # eid (int) -> float (B.t when cannon fired)
var _anim_count: int = 0
var _frame_id: int = 0
var _now_t: float = 0.0
var _headless: bool = false
# ---- realistic motion (visual only: the simulation, its hashes and multiplayer sync never see any of this) ----
# Every unit keeps a small motion state so the picture behaves like real machines and men instead of copying the
# simulation's instant headings: hulls turn at a limited rate, suspensions squat / dive / rock on slopes, turrets slew at
# their own speed, aircraft bank, and each soldier of a squad runs to his own spot with his own reaction and stride.
var _vs: Dictionary = {}             # eid (int) -> motion state
var _prev_now: float = -1.0
var _dt: float = 0.016
const TRACKED_CLS := ["tank", "arty", "aa", "spg"]
const TRACKED_KINDS := ["tank", "ifv", "spg", "arty", "aa", "dozer", "msta", "g6"]


func setup(host: Node3D) -> void:
	clear()
	_headless = DisplayServer.get_name() == "headless"
	if _headless or host == null:
		return
	_root = Node3D.new()
	_root.name = "UnitsView"
	host.add_child(_root)
	_mm_root = Node3D.new()
	_mm_root.name = "UnitMultiMeshes"
	_root.add_child(_mm_root)
	_sol_root = Node3D.new()
	_sol_root.name = "SoldierPool"
	_root.add_child(_sol_root)
	var pm := PlaneMesh.new()
	pm.size = Vector2(2.0, 2.0)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = pm
	mm.instance_count = 128
	mm.visible_instance_count = 0
	var mi := MultiMeshInstance3D.new()
	mi.name = "UnitContactAO"
	mi.multimesh = mm
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/contact_ao.gdshader")
	mat.render_priority = -1
	mi.material_override = mat
	mi.custom_aabb = HUGE_AABB
	mi.extra_cull_margin = 16384.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_root.add_child(mi)
	_ao_mi = mi


func begin_frame(_B = null) -> void:
	if _headless or _root == null:
		return
	if _B != null:
		_now_t = float(_B.t)
	_dt = clampf(_now_t - _prev_now, 0.0, 0.1) if _prev_now >= 0.0 else 0.016
	_prev_now = _now_t
	_frame_id += 1
	_anim_count = 0
	_ao_xf.clear()
	_ao_col.clear()
	for k in _buf.keys():
		(_buf[k] as Array).clear()
	for slot_id in _active_sol.keys():
		var rec: Dictionary = _active_sol[slot_id]
		rec["used"] = false


func draw_unit(B, fr: Dictionary, e, fac: String, p: Vector2, ang: float, gy: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	if _headless or _root == null:
		return
	var kind_s := String(e.kind)
	var meta := _get_meta(fac, kind_s)
	if not bool(meta["ok"]):
		if B is Object and B.has_method("_draw_unit_fallback"):
			B._draw_unit_fallback(fr, e, fac, p, ang, gy, col, issel, mine, vis)
			return
		_draw_box_fallback(B, fr, e, p, ang, gy, col, issel, mine, vis)
		return

	var sc: float = float(meta["scale"])
	var model_h: float = float(meta["h"])
	var pack: Dictionary = meta["pack"]
	var parts: Dictionary = pack.get("parts", {})
	var pxf: Dictionary = meta["pxf"]
	var is_sq: bool = bool(meta["is_squad"])
	var now: float = float(B.t)
	var eid_i: int = int(e.id)
	var eid_f: float = float(eid_i)
	var alt_y: float = gy
	var cam_t: Vector2 = B.cam_target
	var cam_dist_sq: float = p.distance_squared_to(cam_t)
	var wv = B.world_view if B != null else null
	var fx = wv.fx if wv != null else null
	var vis_ang: float = ang

	if is_sq:
		var sq: Array = meta["squad"]
		var n_total: int = sq.size()
		var synth := false
		if n_total <= 0:
			n_total = Look.team_size(kind_s)
			synth = true
		var max_hp: float = maxf(1.0, float(e.max))
		var alive_n: int = clampi(int(ceil(float(e.hp) / max_hp * float(n_total))), 1, n_total)
		var near_cam: bool = cam_dist_sq <= ANIM_DIST_SQ
		var sim_t: float = float(B.sim.t)
		var firing_recent: bool = float(e.last_fire) > sim_t - 0.9
		var has_live_target: bool = e.target != null and not bool(e.target.dead)
		var aim_ang: float = ang
		if firing_recent and has_live_target:
			aim_ang = atan2(float(e.target.y) - p.y, float(e.target.x) - p.x)
		var spd: float = float(e.v)
		var combat_stance := false
		var clip := "idle"
		if spd > 28.0:
			clip = "run"
		elif spd > 2.0:
			clip = "walk"
		elif firing_recent and has_live_target:
			combat_stance = true
			clip = "crouch"
		elif float(e.last_fire) > sim_t - 1.2:
			clip = "crouch"
		var scaled_basis := Basis(Vector3.UP, -ang).scaled(Vector3(sc, sc, sc))
		# Skinned soldier GLBs face +Z in local space (rifle along +Z), so Y rotation = -aim_ang + PI * 0.5 aligns +Z with (cos(aim_ang), sin(aim_ang))
		var sol_yaw := -aim_ang + PI * 0.5
		var sol_basis := Basis(Vector3.UP, sol_yaw).scaled(Vector3(sc, sc, sc))

		# Spawn dying soldier animations when this squad loses members near camera
		var prev_alive: int = int(_prev_sq_alive.get(eid_i, alive_n))
		_prev_sq_alive[eid_i] = alive_n
		if alive_n < prev_alive and near_cam and _dying_soldiers.size() < MAX_DYING_SOLDIERS:
			var stop_i: int = mini(prev_alive, n_total)
			for di in range(alive_n, stop_i):
				if _dying_soldiers.size() >= MAX_DYING_SOLDIERS:
					break
				var dlx := 0.0
				var dlz := 0.0
				var dly := 0.0
				var dlook := "v0"
				if synth:
					dlx = (float(di % 2) - 0.5) * 11.0 + (0.0 if di < 2 else 5.5)
					dlz = (float(int(di / 2)) - 0.3) * 11.0
				else:
					var dpl: Dictionary = sq[di]
					dlx = float(dpl.get("x", 0.0)) * sc
					dlz = float(dpl.get("z", 0.0)) * sc
					dly = float(dpl.get("y", 0.0)) * sc
					dlook = String(dpl.get("look", "v0"))
				var doff := Vector2(dlx, dlz).rotated(ang)
				var dq := p + doff
				var dst: Dictionary = _vs.get(eid_i, {})
				if dst.has("sol") and di < (dst["sol"] as Array).size() and Vector2((dst["sol"] as Array)[di]["q"]) != Vector2.INF:
					dq = (dst["sol"] as Array)[di]["q"]   # he falls where he actually stood
				var dqy: float = float(B.sim.ground_h(dq.x, dq.y)) + dly
				_spawn_dying_soldier(eid_i * 16 + di, fac, kind_s, dlook, Vector3(dq.x, dqy, dq.y), sol_yaw, sc, now)

		var sst := _sq_state(eid_i, p, ang, n_total)
		var fh: float = float(sst["fh"])
		var sols: Array = sst["sol"]
		# loose CoH-style spacing: wider while moving (wedge-like spread), a little wider than the tight export pose at rest
		var moving_sq: bool = spd > 2.0
		var spread: float = 1.45 if moving_sq else 1.15
		for i in alive_n:
			var lx := 0.0
			var lz := 0.0
			var ly := 0.0
			var look := "v0"
			if synth:
				lx = (float(i % 2) - 0.5) * 11.0 + (0.0 if i < 2 else 5.5)
				lz = (float(int(i / 2)) - 0.3) * 11.0
			else:
				var pl: Dictionary = sq[i]
				lx = float(pl.get("x", 0.0)) * sc
				lz = float(pl.get("z", 0.0)) * sc
				ly = float(pl.get("y", 0.0)) * sc
				look = String(pl.get("look", "v0"))
			var sd: Dictionary = sols[i]
			var off := Vector2(lx * spread + float(sd["jx"]), lz * spread + float(sd["jz"])).rotated(fh)
			_sol_step(sd, p + off + Vector2(sst.get("vel", Vector2.ZERO)) * 0.22, spd, _dt)
			var q: Vector2 = sd["q"]
			var sv: Vector2 = sd["v"]
			var own_spd: float = sv.length()
			# each man faces where he is going; when stopped he faces the enemy he shoots at, else the squad's heading
			var face: float = float(sd["yaw"])
			if own_spd > 5.0: face = atan2(sv.y, sv.x)
			elif firing_recent and has_live_target: face = atan2(float(e.target.y) - q.y, float(e.target.x) - q.x)
			elif not moving_sq: face = ang
			sd["yaw"] = _ang_step(float(sd["yaw"]), face, 9.0 * _dt)
			var i_yaw: float = -float(sd["yaw"]) + PI * 0.5
			var i_clip := clip
			if own_spd > 14.0: i_clip = "run"
			elif own_spd > 1.8: i_clip = "walk"
			elif clip == "run" or clip == "walk": i_clip = "idle"   # already at his spot while the squad still moves
			var qy: float = float(B.sim.ground_h(q.x, q.y)) + ly
			var slot_id: int = eid_i * 16 + i

			if near_cam and _anim_count < MAX_ANIM_SOLDIERS:
				var rec := _acquire_soldier(slot_id, fac, kind_s, look)
				if not rec.is_empty():
					_anim_count += 1
					rec["used"] = true
					rec["last_frame"] = _frame_id
					var node: Node3D = rec["node"]
					node.visible = true
					# Natural slight forward lean when sprinting + crisp footwork matched to real ground velocity
					var lean := clampf((own_spd - 10.0) / 30.0, 0.0, 1.0) * 0.11 if i_clip == "run" else 0.0
					var scl := sc * (1.12 if (kind_s == "cleric" and look == "ldr") else 1.0)
					node.position = Vector3(q.x, qy, q.y)
					node.rotation = Vector3(lean, i_yaw, 0.0)
					node.scale = Vector3(scl, scl, scl)
					var s_clip := i_clip
					if combat_stance and own_spd <= 1.8:
						var phase: int = int(floor((now + float(eid_i * 7 + i * 3) * 0.37) / 1.4)) % 3
						s_clip = "reload" if phase == 0 else "crouch"
					_drive_anim(rec, s_clip, slot_id)
					var apn = rec.get("ap", null)
					if apn != null and is_instance_valid(apn):
						var ref := 27.0 if s_clip == "run" else (11.5 if s_clip == "walk" else 0.0)
						(apn as AnimationPlayer).speed_scale = clampf(own_spd / ref, 0.78, 1.65) if ref > 0.0 else 1.0
					continue

			var smesh := _get_static_soldier_mesh(fac, kind_s, look)
			if smesh != null:
				var stride_ph := now * 10.5 + float(eid_i * 3 + i * 2)
				var bob := absf(sin(stride_ph)) * 1.15 if own_spd > 2.5 else 0.0
				var sway := sin(stride_ph) * 0.08 if own_spd > 2.5 else 0.0
				var lean_s := 0.10 if own_spd > 14.0 else 0.0
				var i_basis := (Basis(Vector3.UP, i_yaw) * Basis.from_euler(Vector3(lean_s, 0.0, sway))).scaled(Vector3(sc, sc, sc))
				_push_mm("s|" + fac + "|" + kind_s + "|" + look, smesh, Transform3D(i_basis, Vector3(q.x, qy + bob, q.y)), true)

		# Squad extra rigid pieces (e.g. mortar tube, cleric banner)
		if not parts.is_empty():
			var sq_root := Transform3D(scaled_basis, Vector3(p.x, gy, p.y))
			for pk in parts.keys():
				var pks := String(pk)
				var pt: Transform3D = pxf.get(pks, Transform3D.IDENTITY)
				_push_mm("u|" + fac + "|" + kind_s + "|" + pks, parts[pk] as Mesh, sq_root * pt, true)
	else:
		var dom := String(e.s_dom)
		if dom == "air":
			var s_alt := String(e.s.get("alt", "")) if e.s is Dictionary else ""
			if kind_s in HIGH_AIR_KINDS or s_alt == "high":
				alt_y = gy + 110.0
			elif kind_s in LOW_AIR_KINDS:
				alt_y = gy + 55.0
			else:
				alt_y = gy + 70.0

		var px := p.x
		var pz := p.y
		var mo := _veh_motion(B, e, eid_i, p, ang, dom, kind_s)
		var vyaw: float = float(mo["yaw"])
		vis_ang = vyaw
		var tang: float = float(mo["tur"])
		var hull_basis := Basis(Vector3.UP, -vyaw) * Basis(Vector3(0, 0, 1), float(mo["pitch"])) * Basis(Vector3(1, 0, 0), float(mo["roll"]))
		alt_y += float(mo["dy"])
		if dom == "naval":
			alt_y += sin(now * 1.4 + eid_f) * 0.6
			hull_basis = hull_basis * Basis.from_euler(Vector3(sin(now * 0.8 + eid_f * 2.0) * 0.02, 0.0, sin(now * 1.1 + eid_f) * 0.025))

		# Cannon recoil impulse for heavy vehicles (tanks, artillery, AA, MLRS, IFV, SPG)
		var has_turret: bool = parts.has("turret") or parts.has("turret2") or parts.has("gun")
		var recoil_off := Vector3.ZERO
		if String(e.s_cls) in RECOIL_CLS or kind_s in RECOIL_KINDS:
			var lf: float = float(e.last_fire)
			if lf > float(_last_fire_seen.get(eid_i, -99.0)):
				_last_fire_seen[eid_i] = lf
				if float(B.sim.t) - lf < 0.35:
					_recoil_t[eid_i] = now
			if _recoil_t.has(eid_i):
				var age: float = now - float(_recoil_t[eid_i])
				if age >= 0.0 and age < 0.28:
					recoil_off = -Vector3(cos(tang), 0.0, sin(tang)) * (3.8 * exp(-age * 14.0))
				else:
					_recoil_t.erase(eid_i)
			if not has_turret and recoil_off != Vector3.ZERO:
				px += recoil_off.x
				pz += recoil_off.z
		elif dom == "ground" and String(e.s_armor) == "heavy":
			var ft: float = float(B.sim.t) - float(e.last_fire)
			if ft >= 0.0 and ft < 0.2:
				var kick: float = (1.0 - ft / 0.2) * 2.2
				px -= cos(tang) * kick
				pz -= sin(tang) * kick

		var root_xf := Transform3D(hull_basis.scaled(Vector3(sc, sc, sc)), Vector3(px, alt_y, pz))
		var is_working: bool = bool(e.building)

		for pk in parts.keys():
			var pks := String(pk)
			var pt: Transform3D = pxf.get(pks, Transform3D.IDENTITY)
			var part_xf: Transform3D
			var shadow := true
			match pks:
				"turret", "turret2", "gun":
					part_xf = root_xf * Transform3D(Basis(Vector3.UP, vyaw - tang) * pt.basis, pt.origin)
					if recoil_off != Vector3.ZERO:
						part_xf.origin += recoil_off
				"blades":
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, now * 22.0 + eid_f), Vector3.ZERO))
				"rotor":
					shadow = false
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, now * 28.0 + eid_f), Vector3.ZERO))
				"tailR":
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.BACK, now * 42.0 + eid_f), Vector3.ZERO))
				"tailR0":
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.RIGHT, now * 42.0 + eid_f), Vector3.ZERO))
				"dish", "radar":
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, now * 1.4 + eid_f), Vector3.ZERO))
				"crane":
					var sw := sin(now * 1.3 + eid_f) * (0.9 if is_working else 0.3)
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, sw), Vector3.ZERO))
				"flag":
					part_xf = root_xf * (pt * Transform3D(Basis(Vector3.UP, sin(now * 4.5 + eid_f) * 0.14), Vector3.ZERO))
				"glow":
					shadow = false
					part_xf = root_xf * pt
				_:
					part_xf = root_xf * pt
			_push_mm("u|" + fac + "|" + kind_s + "|" + pks, parts[pk] as Mesh, part_xf, shadow)

		# Battle damage smoke/fire, track dust, & helicopter rotor downwash
		if fx != null:
			_emit_vehicle_fx(fx, e, kind_s, dom, p, vyaw, gy, alt_y, model_h, eid_i, now, cam_dist_sq)

	# Grounded slope-aligned contact AO shadow disc under ground units & infantry squads
	if is_sq:
		var sq_r: float = maxf(float(e.r) * 1.08, 13.5)
		var gnorm := _ground_normal(B.sim, p.x, p.y, clampf(sq_r * 0.45, 5.0, 14.0))
		var ao_b := _slope_basis(gnorm, 0.0, sq_r, sq_r)
		_ao_xf.append(Transform3D(ao_b, Vector3(p.x, gy, p.y) + gnorm * 0.50))
		_ao_col.append(Color(1.0, 1.0, 1.0, 0.34))
	elif String(e.s_dom) != "air":
		var vr: float = maxf(float(e.r) * 1.26, 11.5)
		var is_naval: bool = String(e.s_dom) == "naval"
		var gnorm := Vector3.UP if is_naval else _ground_normal(B.sim, p.x, p.y, clampf(vr * 0.45, 6.0, 18.0))
		var ao_b := _slope_basis(gnorm, vis_ang, vr * 1.20, vr * 0.92)
		_ao_xf.append(Transform3D(ao_b, Vector3(p.x, gy, p.y) + gnorm * 0.50))
		_ao_col.append(Color(1.0, 1.0, 1.0, 0.28 if is_naval else 0.58))

	_append_overlays(B, fr, e, p, ang, gy, alt_y, model_h, col, issel, mine, vis)


func end_frame() -> void:
	if _headless or _root == null:
		return
	for key in _mmi.keys():
		var mi: MultiMeshInstance3D = _mmi[key]
		var arr: Array = _buf.get(key, [])
		var n: int = arr.size()
		var mm := mi.multimesh
		if n == 0:
			if mm.visible_instance_count != 0:
				mm.visible_instance_count = 0
			continue
		if mm.instance_count < n:
			var cap := maxi(16, mm.instance_count)
			while cap < n:
				cap *= 2
			mm.instance_count = cap
		for i in n:
			mm.set_instance_transform(i, arr[i] as Transform3D)
		mm.visible_instance_count = n

	if _ao_mi != null:
		var ao_mm := _ao_mi.multimesh
		var ao_n := _ao_xf.size()
		if ao_n == 0:
			ao_mm.visible_instance_count = 0
		else:
			if ao_mm.instance_count < ao_n:
				var cap := maxi(64, ao_mm.instance_count)
				while cap < ao_n:
					cap *= 2
				ao_mm.instance_count = cap
			for i in ao_n:
				ao_mm.set_instance_transform(i, _ao_xf[i])
				ao_mm.set_instance_color(i, _ao_col[i])
			ao_mm.visible_instance_count = ao_n

	# Update dying soldiers: lie on ground for 3.8s, gently sink, then recycle to idle pool
	var di := _dying_soldiers.size() - 1
	while di >= 0:
		var drec: Dictionary = _dying_soldiers[di]
		var dnode = drec.get("node", null)
		if dnode == null or not is_instance_valid(dnode):
			_dying_soldiers.remove_at(di)
			di -= 1
			continue
		var age: float = _now_t - float(drec["start_t"])
		if age >= DYING_HOLD_TIME + DYING_SINK_TIME:
			_dying_soldiers.remove_at(di)
			_park_soldier(drec)
		elif age > DYING_HOLD_TIME:
			var sink_f: float = (age - DYING_HOLD_TIME) / DYING_SINK_TIME
			(dnode as Node3D).position.y = float(drec["base_y"]) - sink_f * 6.0
		di -= 1

	# Retire soldiers not drawn this frame back into the reusable idle pool
	if _frame_id % 120 == 0:
		var gone: Array = []
		for k in _vs.keys():
			if float((_vs[k] as Dictionary).get("seen", 0.0)) < _now_t - 4.0: gone.append(k)
		for k in gone: _vs.erase(k)
	var stale: Array = []
	for slot_id in _active_sol.keys():
		var rec: Dictionary = _active_sol[slot_id]
		if not bool(rec["used"]):
			stale.append(slot_id)
	for slot_id in stale:
		var rec: Dictionary = _active_sol[slot_id]
		_active_sol.erase(slot_id)
		_park_soldier(rec)
	_trim_idle_pool()


func clear() -> void:
	if _root != null and is_instance_valid(_root):
		_root.queue_free()
	_root = null
	_mm_root = null
	_sol_root = null
	_ao_mi = null
	_ao_xf.clear()
	_ao_col.clear()
	_mmi.clear()
	_buf.clear()
	_active_sol.clear()
	_idle_sol.clear()
	_dying_soldiers.clear()
	_prev_sq_alive.clear()
	_fx_cd.clear()
	_dust_cd.clear()
	_last_fire_seen.clear()
	_recoil_t.clear()
	_vs.clear()
	_prev_now = -1.0
	_anim_count = 0
	_frame_id = 0
	_now_t = 0.0


# ------------------------------------------------------------------ internals
static func _ground_normal(sim, x: float, z: float, eps: float) -> Vector3:
	if sim == null or not sim.has_method("ground_h"):
		return Vector3.UP
	var hx0: float = float(sim.ground_h(x - eps, z))
	var hx1: float = float(sim.ground_h(x + eps, z))
	var hz0: float = float(sim.ground_h(x, z - eps))
	var hz1: float = float(sim.ground_h(x, z + eps))
	return Vector3(hx0 - hx1, 2.0 * eps, hz0 - hz1).normalized()


static func _slope_basis(gnorm: Vector3, yaw: float, sx: float, sz: float) -> Basis:
	var n := gnorm.normalized()
	var x_raw := Vector3(cos(yaw), 0.0, sin(yaw))
	var z_axis := x_raw.cross(n)
	if z_axis.length_squared() < 0.0001:
		z_axis = Vector3(0.0, 0.0, 1.0).cross(n)
	z_axis = z_axis.normalized()
	var x_axis := n.cross(z_axis).normalized()
	return Basis(x_axis * sx, n, z_axis * sz)


static func _ang_step(cur: float, target: float, max_step: float) -> float:
	return cur + clampf(wrapf(target - cur, -PI, PI), -max_step, max_step)

static func _h01(a: float, b: float) -> float:
	return fposmod(sin(a * 12.9898 + b * 78.233) * 43758.5453, 1.0)

## Vehicle / aircraft motion (numbers from Company of Heroes 3 data and Zero Hour's Locomotor.ini, see orch research):
## - hull heading turns at a real rate (medium tank ~45 deg/s, wheeled ~70, heavy ~32, ships 20) instead of snapping
## - chassis on a damped spring (~2 Hz): squats back when accelerating, dives 2-4 deg on braking and rocks once when it
##   stops, rolls outward in fast turns, and settles onto the slope it stands on (4 ground samples around the hull)
## - wheeled trucks / technicals bounce on soft suspension, tracked armour stays stiff
## - turrets slew to their target at their own traverse speed (MBT 40 deg/s, light guns 60, MGs 120)
## - helicopters dip the nose with speed and bank into turns; jets bank hard
func _veh_motion(B, e, eid_i: int, p: Vector2, ang: float, dom: String, kind_s: String) -> Dictionary:
	var dt := _dt
	var st: Dictionary = _vs.get(eid_i, {})
	if st.is_empty() or Vector2(st["p"]).distance_squared_to(p) > 250.0 * 250.0:
		st = {p = p, yaw = ang, spd = float(e.v), acc = 0.0, pitch = 0.0, pv = 0.0, roll = 0.0, rv = 0.0, tur = float(e.tang), bank = 0.0, nose = 0.0, seen = _now_t}
		_vs[eid_i] = st
	st["seen"] = _now_t
	st["p"] = p
	var cls := String(e.s_cls)
	var armor := String(e.s_armor)
	var tracked: bool = cls in TRACKED_CLS or kind_s in TRACKED_KINDS or armor == "heavy"
	var heavy: bool = armor == "heavy" and tracked
	# speed / acceleration from the simulation's own speed (smooth, no frame jitter)
	var spd_new: float = absf(float(e.v))
	var spd_s: float = lerpf(float(st["spd"]), spd_new, clampf(dt * 8.0, 0.0, 1.0))
	var acc_raw: float = (spd_s - float(st["spd"])) / maxf(dt, 0.001)
	st["acc"] = lerpf(float(st["acc"]), acc_raw, clampf(dt * 6.0, 0.0, 1.0))
	st["spd"] = spd_s
	# heading at a real turn rate
	var rate_deg := 70.0
	if dom == "air": rate_deg = 120.0
	elif dom == "naval": rate_deg = 20.0
	elif heavy: rate_deg = 32.0
	elif tracked: rate_deg = 45.0
	var prev_yaw: float = float(st["yaw"])
	var yaw: float = _ang_step(prev_yaw, ang, deg_to_rad(rate_deg) * dt)
	st["yaw"] = yaw
	var yaw_rate: float = wrapf(yaw - prev_yaw, -PI, PI) / maxf(dt, 0.001)
	# turret traverse (tang is a world angle in the simulation)
	var trate := 120.0
	if heavy: trate = 32.0
	elif cls == "tank": trate = 40.0
	elif tracked: trate = 55.0
	st["tur"] = _ang_step(float(st["tur"]), float(e.tang), deg_to_rad(trate) * dt)
	var out := {yaw = yaw, tur = float(st["tur"]), pitch = 0.0, roll = 0.0, dy = 0.0}
	var spd: float = spd_s
	if dom == "air":
		var high: bool = kind_s in HIGH_AIR_KINDS
		var bank_t := clampf(-yaw_rate * (0.45 if high else 0.30), -0.62 if high else -0.38, 0.62 if high else 0.38)
		st["bank"] = lerpf(float(st["bank"]), bank_t, clampf(dt * 3.0, 0.0, 1.0))
		var nose_t := 0.0 if high else -clampf(spd / 90.0, 0.0, 1.0) * 0.16   # helicopters dip the nose to fly forward
		st["nose"] = lerpf(float(st["nose"]), nose_t, clampf(dt * 2.0, 0.0, 1.0))
		out["roll"] = float(st["bank"])
		out["pitch"] = float(st["nose"])
		if not high: out["dy"] = sin(_now_t * 1.7 + float(eid_i)) * 1.2   # hover drift
		return out
	if dom == "naval":
		return out
	# ground: slope under the hull (cached when stationary to skip 4 height samples/unit/frame!)
	var slope_p: float = float(st.get("sp", 0.0))
	var slope_r: float = float(st.get("sr", 0.0))
	if not st.has("sp") or spd > 0.6 or absf(yaw_rate) > 0.08:
		var L: float = clampf(float(e.r) * 1.05, 7.0, 26.0)
		var Wd: float = L * 0.62
		var fwd := Vector2(cos(yaw), sin(yaw))
		var side := Vector2(-fwd.y, fwd.x)
		var gh = B.sim
		var hf: float = float(gh.ground_h(p.x + fwd.x * L, p.y + fwd.y * L))
		var hb: float = float(gh.ground_h(p.x - fwd.x * L, p.y - fwd.y * L))
		var hs: float = float(gh.ground_h(p.x + side.x * Wd, p.y + side.y * Wd))
		var hn: float = float(gh.ground_h(p.x - side.x * Wd, p.y - side.y * Wd))
		slope_p = atan2(hf - hb, 2.0 * L)
		slope_r = -atan2(hs - hn, 2.0 * Wd)
		st["sp"] = slope_p
		st["sr"] = slope_r
	var lim := deg_to_rad(2.2 if heavy else (3.8 if tracked else 5.0))
	var k_acc := 0.0011 if tracked else 0.0016
	var pitch_t: float = slope_p + clampf(float(st["acc"]) * k_acc, -lim, lim)
	var roll_t: float = slope_r + clampf(yaw_rate * spd * (0.0009 if tracked else 0.0016), -lim, lim)
	# damped spring: tracked ~2 Hz zeta 0.5 (one rock on a stop), wheeled softer and bouncier
	var w := TAU * (2.0 if tracked else 1.6)
	var zeta := 0.5 if tracked else 0.28
	var K := w * w
	var C := 2.0 * zeta * w
	var pv: float = float(st["pv"]) + (K * (pitch_t - float(st["pitch"])) - C * float(st["pv"])) * dt
	var pitch: float = float(st["pitch"]) + pv * dt
	var rv: float = float(st["rv"]) + (K * (roll_t - float(st["roll"])) - C * float(st["rv"])) * dt
	var roll: float = float(st["roll"]) + rv * dt
	st["pv"] = pv; st["pitch"] = pitch; st["rv"] = rv; st["roll"] = roll
	out["pitch"] = pitch
	out["roll"] = roll
	if not tracked and spd > 4.0:
		var sk := clampf(spd / 60.0, 0.0, 1.0)
		var ef := float(eid_i)
		out["dy"] = (sin(_now_t * 14.0 + ef) * 0.35 + sin(_now_t * 23.0 + ef * 1.7) * 0.18) * sk
		out["pitch"] = pitch + sin(_now_t * 11.0 + ef * 2.3) * 0.012 * sk
		out["roll"] = roll + sin(_now_t * 9.0 + ef * 3.1) * 0.014 * sk
	elif tracked and spd > 4.0:
		out["dy"] = sin(_now_t * 19.0 + float(eid_i)) * 0.08 * clampf(spd / 40.0, 0.0, 1.0)   # track / road-wheel rumble
	return out

## Squad motion state: the formation turns at a human rate, each soldier runs to his own (slightly loose) spot with his
## own stiffness, top speed and reaction, and faces where HE is going (CoH: leader paths, followers catch up / slow down).
func _sq_state(eid_i: int, p: Vector2, ang: float, n: int) -> Dictionary:
	var st: Dictionary = _vs.get(eid_i, {})
	if st.is_empty() or Vector2(st["p"]).distance_squared_to(p) > 300.0 * 300.0:
		st = {p = p, fh = ang, sol = [], seen = _now_t, mv = 0.0}
		_vs[eid_i] = st
	st["seen"] = _now_t
	var sol: Array = st["sol"]
	while sol.size() < n:
		var i := sol.size()
		var hk := _h01(float(eid_i), float(i))
		sol.append({q = Vector2.INF, v = Vector2.ZERO, yaw = ang, k = 4.0 + hk * 2.4, vmax = 1.0 + (hk - 0.5) * 0.14, jx = (_h01(float(eid_i) + 3.1, float(i)) - 0.5) * 7.0, jz = (_h01(float(eid_i) + 7.7, float(i)) - 0.5) * 7.0})
	st["fh"] = _ang_step(float(st["fh"]), ang, deg_to_rad(110.0) * _dt)
	# squad velocity (smoothed): followers aim slightly ahead of where the squad is going, like CoH's look-ahead
	var vel_raw: Vector2 = (p - Vector2(st["p"])) / maxf(_dt, 0.001) if _dt > 0.0001 else Vector2(st.get("vel", Vector2.ZERO))
	st["vel"] = Vector2(st.get("vel", Vector2.ZERO)).lerp(vel_raw, clampf(_dt * 5.0, 0.0, 1.0))
	st["p"] = p
	return st

func _sol_step(s: Dictionary, target: Vector2, sq_spd: float, dt: float) -> void:
	if Vector2(s["q"]) == Vector2.INF or Vector2(s["q"]).distance_squared_to(target) > 140.0 * 140.0:
		s["q"] = target; s["v"] = Vector2.ZERO
		return
	var q: Vector2 = s["q"]
	var d := target - q
	var vmax: float = (sq_spd * 1.3 + 14.0) * float(s["vmax"])
	var desired := d * float(s["k"])
	if desired.length() > vmax: desired = desired.normalized() * vmax
	var v: Vector2 = Vector2(s["v"]).move_toward(desired, 240.0 * dt)
	s["v"] = v
	s["q"] = q + v * dt
func _emit_vehicle_fx(fx, e, kind_s: String, dom: String, p: Vector2, ang: float, gy: float, alt_y: float, model_h: float, eid_i: int, now: float, cam_dist_sq: float) -> void:
	# 1. Battle damage engine smoke (<55% HP) & thick black smoke + flickering fire (<28% HP)
	if float(e.max) > 0.0 and cam_dist_sq <= DMG_FX_DIST_SQ:
		var hp_ratio: float = float(e.hp) / float(e.max)
		if hp_ratio < 0.28:
			if now >= float(_fx_cd.get(eid_i, 0.0)):
				_fx_cd[eid_i] = now + 0.16
				var sx := p.x + randf_range(-2.5, 2.5)
				var sz := p.y + randf_range(-2.5, 2.5)
				fx.part(false, Vector3(sx, alt_y + model_h * 0.55, sz), Vector3(randf_range(-4.0, 4.0), 14.0, randf_range(-4.0, 4.0)), 1.9, 9.0, 16.0, 0.65, C_VEH_BLK, C_VEH_SMK2, 12.0, 0.45, 0)
				fx.part(true, Vector3(sx, alt_y + model_h * 0.52, sz), Vector3(randf_range(-3.0, 3.0), randf_range(8.0, 14.0), randf_range(-3.0, 3.0)), 0.42, 7.0, -3.5, 0.90, C_FIRE_HI, C_FIRE_LO, 11.0, 0.40, 0)
		elif hp_ratio < 0.55:
			if (int(now * 8.0) + eid_i) % 5 == 0 and now >= float(_fx_cd.get(eid_i, 0.0)):
				_fx_cd[eid_i] = now + 0.22
				fx.part(false, Vector3(p.x, alt_y + model_h * 0.55, p.y), Vector3(randf_range(-4.0, 4.0), 12.0, randf_range(-4.0, 4.0)), 1.6, 8.0, 14.0, 0.55, C_VEH_SMK1, C_VEH_SMK2, 10.0, 0.45, 0)

	# 2. Vehicle track / wheel dust for moving ground vehicles
	if dom != "air" and dom != "sea" and dom != "naval":
		if float(e.v) > 14.0 and cam_dist_sq <= DUST_DIST_SQ and now >= float(_dust_cd.get(eid_i, 0.0)):
			_dust_cd[eid_i] = now + 0.22
			var surf_s: String = String(fx.surf(p.x, p.y)) if fx.has_method("surf") else String(fx.theme)
			if surf_s != "water":
				var back := -Vector2(cos(ang), sin(ang)) * (float(e.r) * 0.8)
				var dp := Vector3(p.x + back.x + randf_range(-3.0, 3.0), gy + 1.8, p.y + back.y + randf_range(-3.0, 3.0))
				var dcol := _biome_dust_color(surf_s)
				fx.part(false, dp, Vector3(back.x * 0.35 + randf_range(-4.0, 4.0), randf_range(3.0, 6.5), back.y * 0.35 + randf_range(-4.0, 4.0)), 1.3, 6.5, 10.0, 0.32, dcol, null, 2.5, 0.35, 0)
	# 3. Helicopter rotor downwash expanding radially across the ground
	elif kind_s == "heli" and cam_dist_sq <= ANIM_DIST_SQ and now >= float(_dust_cd.get(eid_i, 0.0)):
		_dust_cd[eid_i] = now + 0.18
		var surf_s: String = String(fx.surf(p.x, p.y)) if fx.has_method("surf") else String(fx.theme)
		var wash_col := C_WASH_WATER if surf_s == "water" else _biome_dust_color(surf_s)
		var ra: float = randf() * TAU
		for side in 2:
			var a2: float = ra + (PI if side == 1 else 0.0)
			var ca := cos(a2)
			var sa := sin(a2)
			var rad: float = randf_range(8.0, 16.0)
			fx.part(false, Vector3(p.x + ca * rad, gy + 2.0, p.y + sa * rad), Vector3(ca * 34.0, randf_range(1.5, 4.0), sa * 34.0), 0.95, 7.0, 15.0, 0.24, wash_col, null, 1.0, 0.22, 0)


static func _biome_dust_color(surf_s: String) -> Color:
	match surf_s:
		"snow":
			return C_DUST_SNOW
		"green":
			return C_DUST_GREEN
		"hard":
			return C_DUST_HARD
		_:
			return C_DUST_DESERT


func _append_overlays(B, fr: Dictionary, e, p: Vector2, ang: float, gy: float, alt_y: float, model_h: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	var rings: Array = fr["rings"]
	var bars: Array = fr["bars"]
	var r: float = float(e.r) * 1.7 + 4.0
	rings.append([Vector3(p.x, gy + 1.0, p.y), r, Color(1, 1, 1) if issel else col])
	var bar_y: float = alt_y + maxf(18.0, model_h + 6.0)
	var max_hp: float = maxf(1.0, float(e.max))
	if issel or float(e.hp) < float(e.max):
		var f2: float = clampf(float(e.hp) / max_hp, 0.0, 1.0)
		bars.append([Vector3(p.x, bar_y, p.y), 22.0, Color(0.1, 0.1, 0.1, 0.8), f2, Color(1.0 - f2, f2, 0.15)])
	if mine and issel and float(e.amx) > 0.0 and String(B.kind) != "range":
		var af: float = clampf(float(e.am) / float(e.amx), 0.0, 1.0)
		bars.append([Vector3(p.x, bar_y - 4.0, p.y), 22.0, Color(0.1, 0.1, 0.1, 0.8), af, Color(0.35, 0.65, 1.0) if float(e.am) > 0.0 else Color(1.0, 0.3, 0.2)])
	# 3D Veterancy stars/pips right above HP bar (1=Veteran, 2=Elite, 3=Heroic)
	var rank_n: int = mini(3, int(e.rank))
	if rank_n > 0:
		var pip_col: Color = C_VET_1 if rank_n == 1 else (C_VET_2 if rank_n == 2 else C_VET_3)
		var cam_r: Vector3 = Vector3.RIGHT
		if B != null and B.cam != null:
			cam_r = B.cam.global_transform.basis.x if B.cam.is_inside_tree() else B.cam.transform.basis.x
		var pip_y: float = bar_y + 4.4
		var spacing: float = 5.4
		var base_off: float = -0.5 * float(rank_n - 1) * spacing
		for ri in rank_n:
			var pip_pos := Vector3(p.x, pip_y, p.y) + cam_r * (base_off + float(ri) * spacing)
			bars.append([pip_pos, 3.8, C_VET_BG, 0.82, pip_col])
	# Legacy --gdsim tracer fallback (on bridge, LookFx handles all tracers & muzzle flashes from JS events)
	if not bool(B.use_bridge):
		if float(e.last_fire) > float(B.last_fire.get(e.id, -99.0)):
			B.last_fire[e.id] = float(e.last_fire)
			var tg = e.target if e.target != null else (e.order.get("target") if e.order != null else null)
			if tg != null and not bool(tg.dead) and (bool(B.ai_only) or bool(B.see_all) or vis):
				var big: bool = String(e.s_cls) in ["tank", "arty", "aa"]
				var from := Vector3(p.x, alt_y + (9.0 if big else 7.0), p.y)
				B.tracers.append([from, Vector3(float(tg.x), float(B.sim.ground_h(float(tg.x), float(tg.y))) + 6.0, float(tg.y)), float(B.t), Color(1.0, 0.85, 0.45, 0.9)])
				if big and B is Object and B.has_method("_boom"):
					B._boom(from + Vector3(cos(ang) * 14.0, 0.0, sin(ang) * 14.0), 6.0, Color(1.0, 0.75, 0.35), 0.12)


func _draw_box_fallback(B, fr: Dictionary, e, p: Vector2, ang: float, gy: float, col: Color, issel: bool, mine: bool, vis: bool) -> void:
	var sz: int = maxi(8, int(round(maxf(12.0, float(e.r) * 2.0))))
	if not _box_cache.has(sz):
		_box_cache[sz] = Look.box_mesh(float(sz), Look.BOX_COL)
	var alt_y := gy + (70.0 if String(e.s_dom) == "air" else 0.0)
	_push_mm("u|_box|" + str(sz), _box_cache[sz] as Mesh, Transform3D(Basis(Vector3.UP, -ang), Vector3(p.x, alt_y, p.y)), true)
	_append_overlays(B, fr, e, p, ang, gy, alt_y, float(sz) * 0.5, col, issel, mine, vis)


func _push_mm(key: String, mesh: Mesh, xf: Transform3D, cast_shadow: bool) -> void:
	if mesh == null:
		return
	if not _mmi.has(key):
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = 16
		mm.visible_instance_count = 0
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.custom_aabb = HUGE_AABB
		mi.extra_cull_margin = 16384.0
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_mm_root.add_child(mi)
		_mmi[key] = mi
		_buf[key] = []
	(_buf[key] as Array).append(xf)


func _create_soldier_rec(fac: String, kind_s: String, look: String, key: String) -> Dictionary:
	var node: Node3D = X1.soldier(fac, kind_s, look, false)
	if node == null:
		return {}
	_sol_root.add_child(node)
	var ap := _find_anim_player(node)
	# Guaranteed non-empty retargeted soldier AnimationLibrary for all 22 nations (fixes 0-track GLBs & FBX path mismatches)
	if ap == null:
		var af := _fallback_anim_file(fac, kind_s, look)
		var lib: AnimationLibrary = X1.anim_library_for(node, af)
		if lib != null:
			ap = AnimationPlayer.new()
			ap.name = "AnimationPlayer"
			node.add_child(ap)
			ap.add_animation_library("", lib)
	if ap != null:
		for cname in LOOP_CLIPS:
			if ap.has_animation(cname):
				var anim := ap.get_animation(cname)
				if anim != null and anim.loop_mode == Animation.LOOP_NONE:
					anim.loop_mode = Animation.LOOP_LINEAR
	return {node = node, ap = ap, key = key, clip = "", used = true, last_frame = _frame_id}


func _acquire_soldier(slot_id: int, fac: String, kind_s: String, look: String) -> Dictionary:
	var key := fac + "|" + kind_s + "|" + look
	if _active_sol.has(slot_id):
		var existing: Dictionary = _active_sol[slot_id]
		if String(existing["key"]) == key and is_instance_valid(existing["node"]):
			return existing
		_active_sol.erase(slot_id)
		_park_soldier(existing)

	if _idle_sol.has(key):
		var bucket: Array = _idle_sol[key]
		while not bucket.is_empty():
			var rec: Dictionary = bucket.pop_back()
			if is_instance_valid(rec["node"]):
				_active_sol[slot_id] = rec
				return rec

	var rec := _create_soldier_rec(fac, kind_s, look, key)
	if rec.is_empty():
		return {}
	_active_sol[slot_id] = rec
	return rec


func _spawn_dying_soldier(slot_id: int, fac: String, kind_s: String, look: String, pos: Vector3, yaw: float, sc: float, now: float) -> void:
	if _dying_soldiers.size() >= MAX_DYING_SOLDIERS:
		return
	var key := fac + "|" + kind_s + "|" + look
	var rec: Dictionary = {}
	# Prefer claiming the exact live animated soldier from this slot for zero-pop continuity
	if _active_sol.has(slot_id):
		var existing: Dictionary = _active_sol[slot_id]
		if String(existing["key"]) == key and is_instance_valid(existing["node"]):
			_active_sol.erase(slot_id)
			rec = existing
	if rec.is_empty() and _idle_sol.has(key):
		var bucket: Array = _idle_sol[key]
		while not bucket.is_empty():
			var cand: Dictionary = bucket.pop_back()
			if is_instance_valid(cand["node"]):
				rec = cand
				break
	if rec.is_empty():
		rec = _create_soldier_rec(fac, kind_s, look, key)
	if rec.is_empty():
		return
	var node: Node3D = rec["node"]
	node.visible = true
	node.position = pos
	node.rotation = Vector3(0.0, yaw, 0.0)
	node.scale = Vector3(sc, sc, sc)
	var ap = rec.get("ap", null)
	if ap != null and is_instance_valid(ap):
		var player := ap as AnimationPlayer
		if player.has_animation("die"):
			var anim := player.get_animation("die")
			if anim != null:
				anim.loop_mode = Animation.LOOP_NONE
			player.stop()
			player.play("die")
	rec["clip"] = "die"
	rec["start_t"] = now
	rec["base_y"] = pos.y
	_dying_soldiers.append(rec)


static func _fallback_anim_file(fac: String, kind_s: String, look: String) -> String:
	var e: Dictionary = X1.entry(fac, kind_s)
	var looks: Dictionary = e.get("looks", {})
	if looks.is_empty():
		return ""
	var own: Dictionary = looks.get(look, {})
	for lod in ["lo", "hi"]:
		var d: Dictionary = own.get(lod, {})
		var af = d.get("animFile", null)
		if af != null and String(af) != "":
			return String(af)
	for lk in looks.keys():
		var od: Dictionary = looks[lk]
		for lod in ["lo", "hi"]:
			var d: Dictionary = od.get(lod, {})
			var af = d.get("animFile", null)
			if af != null and String(af) != "":
				return String(af)
	return ""


func _park_soldier(rec: Dictionary) -> void:
	var node = rec.get("node", null)
	if node != null and is_instance_valid(node):
		(node as Node3D).visible = false
		var ap = rec.get("ap", null)
		if ap != null and is_instance_valid(ap):
			(ap as AnimationPlayer).pause()
		rec["clip"] = ""
		var key := String(rec["key"])
		if not _idle_sol.has(key):
			_idle_sol[key] = []
		(_idle_sol[key] as Array).append(rec)


func _trim_idle_pool() -> void:
	var total_idle := 0
	for k in _idle_sol.keys():
		total_idle += (_idle_sol[k] as Array).size()
	var cap := maxi(0, MAX_SOLDIER_POOL - _active_sol.size() - _dying_soldiers.size())
	if total_idle <= cap:
		return
	var to_drop := total_idle - cap
	for k in _idle_sol.keys():
		var bucket: Array = _idle_sol[k]
		while to_drop > 0 and not bucket.is_empty():
			var rec: Dictionary = bucket.pop_front()
			var node = rec.get("node", null)
			if node != null and is_instance_valid(node):
				(node as Node3D).queue_free()
			to_drop -= 1
		if to_drop <= 0:
			break


func _drive_anim(rec: Dictionary, clip: String, slot_id: int) -> void:
	var ap = rec.get("ap", null)
	if ap == null or not is_instance_valid(ap):
		return
	var player := ap as AnimationPlayer
	if String(rec["clip"]) == clip and (player.is_playing() or clip == "crouch"):
		return
	var use_clip := clip if player.has_animation(clip) else ("crouch" if clip == "reload" and player.has_animation("crouch") else ("idle" if player.has_animation("idle") else ""))
	if use_clip == "":
		return
	player.play(use_clip, 0.14)
	if use_clip in LOOP_CLIPS:
		var anim := player.get_animation(use_clip)
		if anim != null and anim.length > 0.02:
			player.seek(fmod(float(slot_id % 97) * 0.137, anim.length), true)
	rec["clip"] = clip


static func _find_anim_player(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n as AnimationPlayer
	for c in n.get_children():
		var r := _find_anim_player(c)
		if r != null:
			return r
	return null


static func _find_mesh_node(n: Node, acc: Transform3D) -> Array:
	var t := acc
	if n is Node3D:
		t = acc * (n as Node3D).transform
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		return [n as MeshInstance3D, t]
	for c in n.get_children():
		var r := _find_mesh_node(c, t)
		if not r.is_empty():
			return r
	return []


static func _get_static_soldier_mesh(fac: String, kind_s: String, look: String) -> ArrayMesh:
	var key := fac + "|" + kind_s + "|" + look
	if _static_sol_cache.has(key):
		return _static_sol_cache[key] as ArrayMesh
	var inst: Node3D = X1.soldier(fac, kind_s, look, false)
	if inst == null:
		_static_sol_cache[key] = null
		return null
	var found := _find_mesh_node(inst, Transform3D.IDENTITY)
	if found.is_empty():
		inst.free()
		_static_sol_cache[key] = null
		return null
	var mi: MeshInstance3D = found[0]
	var t: Transform3D = found[1]
	var src: Mesh = mi.mesh
	var skel := mi.get_parent() as Skeleton3D
	var skin := mi.skin
	var bmats: Array[Transform3D] = []
	var nbmats: Array[Basis] = []
	if skel != null and skin != null:
		var bc := skin.get_bind_count()
		bmats.resize(bc)
		nbmats.resize(bc)
		for b in bc:
			var bi := skin.get_bind_bone(b)
			if bi < 0:
				var bn := skin.get_bind_name(b)
				bi = skel.find_bone(bn) if bn != "" else b
			var bm: Transform3D = t * skel.get_bone_global_rest(bi) * skin.get_bind_pose(b)
			bmats[b] = bm
			nbmats[b] = bm.basis.inverse().transposed()
	var out := ArrayMesh.new()
	var nbasis := t.basis.inverse().transposed()
	for s in src.get_surface_count():
		var arr := src.surface_get_arrays(s)
		var vs: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var bs = arr[Mesh.ARRAY_BONES]
		var ws = arr[Mesh.ARRAY_WEIGHTS]
		var stride: int = int(bs.size()) / vs.size() if bs != null and ws != null and vs.size() > 0 and not bmats.is_empty() else 0
		var nvs := PackedVector3Array()
		nvs.resize(vs.size())
		var ns = arr[Mesh.ARRAY_NORMAL]
		var has_ns: bool = ns is PackedVector3Array and (ns as PackedVector3Array).size() == vs.size()
		var nns := PackedVector3Array()
		if has_ns:
			nns.resize(vs.size())
		var src_ns: PackedVector3Array = ns if has_ns else PackedVector3Array()
		for i in vs.size():
			var vi := vs[i]
			if stride > 0:
				var vp := Vector3.ZERO
				var vn := Vector3.ZERO
				var wsum := 0.0
				var base := i * stride
				for k in stride:
					var w: float = float(ws[base + k])
					if w > 0.0:
						var bi2: int = int(bs[base + k])
						if bi2 >= 0 and bi2 < bmats.size():
							vp += (bmats[bi2] * vi) * w
							if has_ns:
								vn += (nbmats[bi2] * src_ns[i]) * w
							wsum += w
				if wsum > 0.0001:
					nvs[i] = vp / wsum
					if has_ns:
						nns[i] = vn.normalized()
				else:
					nvs[i] = t * vi
					if has_ns:
						nns[i] = (nbasis * src_ns[i]).normalized()
			else:
				nvs[i] = t * vi
				if has_ns:
					nns[i] = (nbasis * src_ns[i]).normalized()
		var clean := []
		clean.resize(Mesh.ARRAY_MAX)
		clean[Mesh.ARRAY_VERTEX] = nvs
		if has_ns:
			clean[Mesh.ARRAY_NORMAL] = nns
		if arr[Mesh.ARRAY_TEX_UV] != null:
			clean[Mesh.ARRAY_TEX_UV] = arr[Mesh.ARRAY_TEX_UV]
		if arr[Mesh.ARRAY_COLOR] != null:
			clean[Mesh.ARRAY_COLOR] = arr[Mesh.ARRAY_COLOR]
		if arr[Mesh.ARRAY_INDEX] != null:
			clean[Mesh.ARRAY_INDEX] = arr[Mesh.ARRAY_INDEX]
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, clean)
		var mat := mi.get_surface_override_material(s)
		if mat == null:
			mat = src.surface_get_material(s)
		out.surface_set_material(out.get_surface_count() - 1, mat)
	inst.free()
	_static_sol_cache[key] = out
	return out


static func _get_meta(fac: String, kind_s: String) -> Dictionary:
	var key := fac + "|" + kind_s
	if _meta_cache.has(key):
		return _meta_cache[key] as Dictionary
	var pack: Dictionary = X1.merged_pack(fac, kind_s)
	if pack.is_empty():
		var miss := {ok = false}
		_meta_cache[key] = miss
		return miss
	var is_sq: bool = bool(pack.get("is_squad", false))
	var sc: float = float(pack.get("scale", 1.0))
	var entry: Dictionary = X1.entry(fac, kind_s)
	var src: Dictionary = entry.get("extra", {}) if is_sq and entry.get("extra", null) is Dictionary else entry
	var pd: Dictionary = src.get("parts", {})
	var pxf := {}
	var parts: Dictionary = pack.get("parts", {})
	for pk in parts.keys():
		var pks := String(pk)
		var t := Transform3D.IDENTITY
		var q = pks
		var guard := 0
		while q != null and String(q) != "" and pd.has(q) and guard < 8:
			var qd: Dictionary = pd[q]
			t = X1.xf(qd.get("m", null)) * t
			q = qd.get("parent", null)
			guard += 1
		pxf[pks] = t
	var h: float = 16.0 * sc if is_sq else _compute_height(parts, pxf, sc, float(pack.get("h", 16.0)))
	var meta := {
		ok = true,
		pack = pack,
		pxf = pxf,
		h = h,
		scale = sc,
		is_squad = is_sq,
		squad = pack.get("squad", []),
	}
	_meta_cache[key] = meta
	return meta


static func _compute_height(parts: Dictionary, pxf: Dictionary, sc: float, fallback_h: float) -> float:
	var max_y := 0.0
	for pk in parts.keys():
		var m = parts[pk]
		if not (m is Mesh):
			continue
		var bb: AABB = (m as Mesh).get_aabb()
		var t: Transform3D = pxf.get(String(pk), Transform3D.IDENTITY)
		for ci in 8:
			var pt := t * bb.get_endpoint(ci)
			if pt.y > max_y:
				max_y = pt.y
	if max_y > 1.0:
		return maxf(8.0, max_y * sc)
	return maxf(8.0, fallback_h)
