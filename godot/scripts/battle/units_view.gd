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

const MAX_ANIM_SOLDIERS := 120
const MAX_SOLDIER_POOL := 240
const ANIM_DIST_SQ := 950.0 * 950.0
const HUGE_AABB := AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 4e4, 2e5))
const HIGH_AIR_KINDS := ["jet", "airlift", "tb2"]
const LOW_AIR_KINDS := ["heli", "drone"]
const LOOP_CLIPS := ["idle", "walk", "run"]

# Shared immutable caches across battles (ArrayMesh / metadata only, no scene nodes)
static var _meta_cache: Dictionary = {}        # "fac|kind" -> {ok, pack, pxf, h, scale, is_squad, squad}
static var _static_sol_cache: Dictionary = {}  # "fac|kind|look" -> ArrayMesh (baked bind pose, no skeleton)
static var _box_cache: Dictionary = {}         # int_size -> Mesh

var _root: Node3D = null
var _mm_root: Node3D = null
var _sol_root: Node3D = null
var _mmi: Dictionary = {}        # key -> MultiMeshInstance3D
var _buf: Dictionary = {}        # key -> Array[Transform3D]
var _active_sol: Dictionary = {} # slot_id (int) -> {node, ap, key, clip, used, last_frame}
var _idle_sol: Dictionary = {}   # "fac|kind|look" -> Array[Dictionary]
var _anim_count: int = 0
var _frame_id: int = 0
var _headless: bool = false


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


func begin_frame(_B = null) -> void:
	if _headless or _root == null:
		return
	_frame_id += 1
	_anim_count = 0
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
	var pack: Dictionary = meta["pack"]
	var parts: Dictionary = pack.get("parts", {})
	var pxf: Dictionary = meta["pxf"]
	var is_sq: bool = bool(meta["is_squad"])
	var now: float = float(B.t)
	var eid_i: int = int(e.id)
	var eid_f: float = float(eid_i)
	var alt_y: float = gy

	if is_sq:
		var sq: Array = meta["squad"]
		var n_total: int = sq.size()
		var synth := false
		if n_total <= 0:
			n_total = Look.team_size(kind_s)
			synth = true
		var max_hp: float = maxf(1.0, float(e.max))
		var alive_n: int = clampi(int(ceil(float(e.hp) / max_hp * float(n_total))), 1, n_total)
		var cam_t: Vector2 = B.cam_target
		var near_cam: bool = p.distance_squared_to(cam_t) <= ANIM_DIST_SQ
		var spd: float = float(e.v)
		var clip := "idle"
		if spd > 28.0:
			clip = "run"
		elif spd > 2.0:
			clip = "walk"
		elif float(e.last_fire) > float(B.sim.t) - 1.2:
			clip = "crouch"
		var scaled_basis := Basis(Vector3.UP, -ang).scaled(Vector3(sc, sc, sc))
		# Skinned soldier GLBs face +Z in local space (rifle along +Z), so Y rotation = -ang + PI * 0.5 aligns +Z with (cos(ang), sin(ang))
		var sol_yaw := -ang + PI * 0.5
		var sol_basis := Basis(Vector3.UP, sol_yaw).scaled(Vector3(sc, sc, sc))

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
			var off := Vector2(lx, lz).rotated(ang)
			var q := p + off
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
					node.position = Vector3(q.x, qy, q.y)
					node.rotation = Vector3(0.0, sol_yaw, 0.0)
					node.scale = Vector3(sc, sc, sc)
					_drive_anim(rec, clip, slot_id)
					continue

			var smesh := _get_static_soldier_mesh(fac, kind_s, look)
			if smesh != null:
				var bob := absf(sin(now * 11.0 + float(eid_i * 3 + i * 2))) * 1.1 if spd > 2.0 else 0.0
				_push_mm("s|" + fac + "|" + kind_s + "|" + look, smesh, Transform3D(sol_basis, Vector3(q.x, qy + bob, q.y)), true)

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
		var hull_basis := Basis(Vector3.UP, -ang)
		if dom == "naval":
			alt_y += sin(now * 1.4 + eid_f) * 0.6
			hull_basis = hull_basis * Basis.from_euler(Vector3(sin(now * 0.8 + eid_f * 2.0) * 0.02, 0.0, sin(now * 1.1 + eid_f) * 0.025))
		elif dom == "ground" and String(e.s_armor) == "heavy":
			var ft: float = float(B.sim.t) - float(e.last_fire)
			if ft >= 0.0 and ft < 0.2:
				var kick: float = (1.0 - ft / 0.2) * 2.2
				var fang: float = float(e.tang)
				px -= cos(fang) * kick
				pz -= sin(fang) * kick

		var root_xf := Transform3D(hull_basis.scaled(Vector3(sc, sc, sc)), Vector3(px, alt_y, pz))
		var tang: float = float(e.tang)
		var is_working: bool = bool(e.building)

		for pk in parts.keys():
			var pks := String(pk)
			var pt: Transform3D = pxf.get(pks, Transform3D.IDENTITY)
			var part_xf: Transform3D
			var shadow := true
			match pks:
				"turret", "turret2", "gun":
					part_xf = root_xf * Transform3D(Basis(Vector3.UP, ang - tang) * pt.basis, pt.origin)
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

	_append_overlays(B, fr, e, p, ang, gy, alt_y, float(meta["h"]), col, issel, mine, vis)


func end_frame() -> void:
	if _headless or _root == null:
		return
	for key in _mmi.keys():
		var mi: MultiMeshInstance3D = _mmi[key]
		var arr: Array = _buf.get(key, [])
		var n: int = arr.size()
		var mm := mi.multimesh
		if n == 0:
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

	# Retire soldiers not drawn this frame back into the reusable idle pool
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
	_mmi.clear()
	_buf.clear()
	_active_sol.clear()
	_idle_sol.clear()
	_anim_count = 0
	_frame_id = 0


# ------------------------------------------------------------------ internals
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

	var node: Node3D = X1.soldier(fac, kind_s, look, false)
	if node == null:
		return {}
	_sol_root.add_child(node)
	var ap := _find_anim_player(node)
	# Some exported lo looks (e.g. v0.lo) have animFile=null while hi or sibling looks carry the matching library
	if ap == null:
		var af := _fallback_anim_file(fac, kind_s, look)
		if af != "":
			var lib: AnimationLibrary = X1.anim_library(af)
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
	var rec := {node = node, ap = ap, key = key, clip = "", used = true, last_frame = _frame_id}
	_active_sol[slot_id] = rec
	return rec


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
	var cap := maxi(0, MAX_SOLDIER_POOL - _active_sol.size())
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
	if String(rec["clip"]) == clip and player.is_playing():
		return
	var use_clip := clip if player.has_animation(clip) else ("idle" if player.has_animation("idle") else "")
	if use_clip == "":
		return
	player.play(use_clip)
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
