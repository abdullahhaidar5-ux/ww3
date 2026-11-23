## Lane X1: builds the game's own exported models (godot/data/models.json + godot/models/auto/*.glb) for Godot.
##
##   const X1 := preload("res://models/auto/x1_models.gd")
##   var tank: Node3D = X1.build("IR", "tank")            # node tree; animated parts are child nodes named as in the manifest
##   var m: Dictionary = X1.merged("IR", "tank")          # {part name ("" = fixed to the unit): ArrayMesh} for MultiMesh use
##   var s: Node3D = X1.soldier("IR", "inf", "v0")        # skinned soldier with an AnimationPlayer (idle walk run crouch prone reload grenade die)
##
## Units are in JS-game world units (rifleman ~16 tall), +Y up, unit FRONT = +X. Shape files are shared by all nations:
## paint (material colour, per-nation vertex palette) comes from the manifest and is applied here.
extends RefCounted

const DIR := "res://models/auto/"
const MANIFEST := "res://data/models.json"

static var _man: Dictionary = {}
static var _shape: Dictionary = {}      # file -> [Mesh, Transform3D]
static var _painted: Dictionary = {}    # file + palette -> ArrayMesh
static var _mats: Dictionary = {}

static func manifest() -> Dictionary:
	if _man.is_empty():
		var f := FileAccess.open(MANIFEST, FileAccess.READ)
		if f != null:
			var j = JSON.parse_string(f.get_as_text())
			if j is Dictionary: _man = j
	return _man

static func entry(nation: String, kind: String) -> Dictionary:
	var m := manifest()
	if nation == "_map": return m.get("_map", {}).get(kind, {})
	return m.get(nation, {}).get(kind, {})

static func nations() -> Array:
	var out := []
	for k in manifest().keys():
		if not String(k).begins_with("_"): out.append(k)
	return out

static func xf(a) -> Transform3D:
	if a == null or not (a is Array) or a.size() < 12: return Transform3D.IDENTITY
	return Transform3D(Basis(Vector3(a[0], a[1], a[2]), Vector3(a[3], a[4], a[5]), Vector3(a[6], a[7], a[8])), Vector3(a[9], a[10], a[11]))

static func lin(c) -> Color:
	# manifest colours are linear rgb (may exceed 1); Godot material colours are sRGB
	if c == null: return Color(1, 1, 1)
	return Color(c[0], c[1], c[2]).linear_to_srgb()

static func _find_mesh(n: Node, acc: Transform3D) -> Array:
	var t := acc
	if n is Node3D: t = acc * (n as Node3D).transform
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null: return [(n as MeshInstance3D).mesh, t]
	for c in n.get_children():
		var r := _find_mesh(c, t)
		if not r.is_empty(): return r
	return []

## the shared shape of one file: [Mesh, Transform3D of the mesh inside its file]
static func shape(file: String) -> Array:
	if _shape.has(file): return _shape[file]
	var out: Array = []
	var ps = load(DIR + file)
	if ps is PackedScene:
		var inst: Node = (ps as PackedScene).instantiate()
		out = _find_mesh(inst, Transform3D.IDENTITY)
		inst.free()
	_shape[file] = out
	return out

## the mesh of a file with this look's palette put back into the vertex colours
static func painted(file: String, pal) -> Mesh:
	var sh := shape(file)
	if sh.is_empty(): return null
	var mesh: Mesh = sh[0]
	if pal == null or not (pal is Array) or (pal as Array).is_empty(): return mesh
	var key := file + "|" + str(hash(pal))
	if _painted.has(key): return _painted[key]
	var cols: Array[Color] = []
	for p in pal: cols.append(Color(p[0], p[1], p[2]).linear_to_srgb())
	var out := ArrayMesh.new()
	for s in mesh.get_surface_count():
		var arr := mesh.surface_get_arrays(s)
		var vc = arr[Mesh.ARRAY_COLOR]
		if vc is PackedColorArray and (vc as PackedColorArray).size() > 0:
			var pc: PackedColorArray = vc
			for i in pc.size():
				var a := int(round(pc[i].a * 255.0))
				if a < cols.size(): pc[i] = cols[a]
				elif a < 255 and cols.size() > 0: pc[i] = cols[cols.size() - 1]   # clamp stray palette slots (fixes RV/OB pink soldier torso)
			arr[Mesh.ARRAY_COLOR] = pc
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		out.surface_set_material(s, mesh.surface_get_material(s))
	_painted[key] = out
	return out

const BAD_TEX := ["3c2e377f5259", "2ef43cfa2455"]   # corrupted black-gutter T-72 textures -> replace with real military armor camo + nation paint

# Authentic per-nation rolled-armor paint (sRGB) for T-72/Karrar/Type-96 hulls when BAD_TEX strips the broken GLB map
const ARMOR_PAINT := {
	"IR": Color(0.56, 0.53, 0.36),   # IRGC Karrar / T-72S arid olive-ochre
	"RS": Color(0.45, 0.44, 0.33),   # Lebanese mountain olive-drab
	"DW": Color(0.62, 0.53, 0.39),   # Yemeni highland sandstone tan
	"RV": Color(0.58, 0.52, 0.37),   # Iraqi desert olive-khaki
	"OB": Color(0.42, 0.44, 0.34),   # Urban olive-slate
	"CN": Color(0.44, 0.50, 0.43),   # PLA digital sage-green
	"PK": Color(0.55, 0.52, 0.38),   # Al-Khalid arid khaki-olive
	"RU": Color(0.39, 0.44, 0.34),   # Russian protective dark green
}

static var _armor_alb: Texture2D = null
static var _armor_nrm: Texture2D = null
static func _load_armor_tex() -> void:
	if _armor_alb == null and ResourceLoader.exists("res://tex/armor_camo.png"):
		_armor_alb = load("res://tex/armor_camo.png")
	if _armor_nrm == null and ResourceLoader.exists("res://tex/armor_nrm.png"):
		_armor_nrm = load("res://tex/armor_nrm.png")

## a material for one painted surface: texture from the shape file, everything else from the manifest
static func material(src: Material, m: Dictionary, vertex_colours: bool, nation: String = "") -> StandardMaterial3D:
	var key := str(src.get_instance_id() if src != null else 0) + JSON.stringify(m) + str(vertex_colours) + "|" + nation
	if _mats.has(key): return _mats[key]
	var mat := StandardMaterial3D.new()
	var drop_tex := false
	if src is BaseMaterial3D:
		var b := src as BaseMaterial3D
		var tp := b.albedo_texture.resource_path if b.albedo_texture != null else ""
		for bad in BAD_TEX:
			if tp.contains(bad): drop_tex = true; break
		if not drop_tex:
			mat.albedo_texture = b.albedo_texture
		mat.normal_enabled = b.normal_enabled
		mat.normal_texture = b.normal_texture
		mat.transparency = b.transparency
		mat.alpha_scissor_threshold = b.alpha_scissor_threshold
		mat.texture_filter = b.texture_filter
		mat.uv1_scale = b.uv1_scale
		mat.uv1_offset = b.uv1_offset
	var c_arr = m.get("c", [1, 1, 1])
	var has_tex := mat.albedo_texture != null
	# Clamp Three.js over-1.0 linear color multipliers so highlights never clip into blinding white under Godot ACES
	var cap := 1.12 if has_tex else 0.92
	var col := Color(minf(float(c_arr[0]), cap), minf(float(c_arr[1]), cap), minf(float(c_arr[2]), cap)).linear_to_srgb()
	if drop_tex:
		_load_armor_tex()
		if _armor_alb != null:
			mat.albedo_texture = _armor_alb
			mat.uv1_scale = Vector3(2.2, 2.2, 1.0)
			mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		if _armor_nrm != null:
			mat.normal_enabled = true
			mat.normal_texture = _armor_nrm
			mat.normal_scale = 0.65
		col = ARMOR_PAINT.get(nation, Color(col.r * 0.62, col.g * 0.62, col.b * 0.58))
	if m.has("a"):
		col.a = float(m["a"])
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = col
	var r_val := float(m.get("r", 0.8))
	var mt_val := float(m.get("mt", 0.0))
	if drop_tex:
		r_val = 0.64
		mt_val = 0.28
	elif String(m.get("look", "")) == "metal":
		r_val = maxf(r_val, 0.52)   # painted military armor steel (never shiny chrome/plastic)
	mat.roughness = r_val
	mat.metallic = mt_val
	if m.has("e"):
		mat.emission_enabled = true
		mat.emission = lin(m["e"])
	if m.get("unlit", 0): mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	if m.get("ds", 0): mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	if vertex_colours:
		mat.vertex_color_use_as_albedo = true
		mat.vertex_color_is_srgb = true
	_mats[key] = mat
	return mat

static func _has_colours(mesh: Mesh, s: int) -> bool:
	if mesh is ArrayMesh: return ((mesh as ArrayMesh).surface_get_format(s) & Mesh.ARRAY_FORMAT_COLOR) != 0
	return false

## Flag cloth on buildings: the exported 120x72 flag baked into the model is swapped for the game's real, high-resolution
## flag of that nation (res://ui/icons/flags/<KEY>.png, 320x192). The cloth's UVs cover the whole picture (0..1).
static var _flag_mats: Dictionary = {}
static func flag_material(mat: StandardMaterial3D, nation: String) -> StandardMaterial3D:
	if mat == null or mat.albedo_texture == null: return mat
	var path := "res://ui/icons/flags/%s.png" % nation
	if not ResourceLoader.exists(path): return mat
	var key := str(mat.get_instance_id()) + "|" + nation
	if _flag_mats.has(key): return _flag_mats[key]
	var m2 := mat.duplicate() as StandardMaterial3D
	m2.albedo_texture = load(path)
	m2.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_flag_mats[key] = m2
	return m2

static func _add_rigid(root: Node3D, e: Dictionary, nation: String = "") -> Dictionary:
	var parts := {}
	var pd: Dictionary = e.get("parts", {})
	for k in pd.keys():
		if pd[k].has("same"): continue
		var n := Node3D.new()
		n.name = k
		parts[k] = n
	for k in parts.keys():
		var par = pd[k].get("parent", null)
		var host: Node3D = parts[par] if par != null and parts.has(par) else root
		host.add_child(parts[k])
		(parts[k] as Node3D).transform = xf(pd[k].get("m", null))
	for inst in e.get("meshes", []):
		var mesh := painted(inst["f"], inst.get("pal", null))
		if mesh == null: continue
		var mi := MeshInstance3D.new()
		mi.mesh = mesh
		var mats: Array = inst.get("mat", [])
		var p = inst.get("p", null)
		for s in mesh.get_surface_count():
			var md: Dictionary = mats[min(s, mats.size() - 1)] if mats.size() > 0 else {}
			var mat := material(mesh.surface_get_material(s), md, _has_colours(mesh, s), nation)
			if p != null and String(p) == "flag" and nation != "": mat = flag_material(mat, nation)
			mi.set_surface_override_material(s, mat)
		var host: Node3D = parts[p] if p != null and parts.has(p) else root
		host.add_child(mi)
		mi.transform = xf(inst.get("m", null)) * (shape(inst["f"])[1] as Transform3D)
	return parts

## the whole look as a node tree. Squads come as their soldiers (low detail unless hi = true) on their places plus the unit's extra.
static func build(nation: String, kind: String, hi: bool = false) -> Node3D:
	var e := entry(nation, kind)
	var root := Node3D.new()
	root.name = kind
	if e.is_empty() or e.has("err"): return root
	if e.has("squad"):
		for pl in e["squad"]:
			var s := soldier(nation, kind, String(pl.get("look", "")), hi)
			if s == null: continue
			root.add_child(s)
			s.position = Vector3(float(pl["x"]), float(pl.get("y", 0.0)), float(pl["z"]))
		if e.get("extra", null) != null: _add_rigid(root, e["extra"], nation)
	else:
		_add_rigid(root, e, nation)
	var sc := float(e.get("scale", 1.0))
	root.scale = Vector3(sc, sc, sc)
	return root

static func _first(n: Node, type: String) -> Node:
	if n.is_class(type): return n
	for c in n.get_children():
		var r := _first(c, type)
		if r != null: return r
	return null

## one skinned soldier of a squad kind. look = "v0".."v3" / "ldr" (missing looks fall back to the first one exported).
static func soldier(nation: String, kind: String, look: String = "", hi: bool = false) -> Node3D:
	var e := entry(nation, kind)
	var looks: Dictionary = e.get("looks", {})
	if looks.is_empty(): return null
	var L: Dictionary = looks.get(look, {})
	if L.is_empty(): L = looks[looks.keys()[0]]
	var d: Dictionary = L.get("hi", {}) if hi and L.has("hi") else L.get("lo", L.get("hi", {}))
	if d.is_empty() or not d.has("file"): return null
	var ps = load(DIR + String(d["file"]))
	if not (ps is PackedScene): return null
	var inst: Node3D = (ps as PackedScene).instantiate()
	var mi := _first(inst, "MeshInstance3D") as MeshInstance3D
	if mi != null and mi.mesh != null:
		var key := String(d["file"]) + "|" + str(hash(d.get("pal", null)))
		var mesh: Mesh
		if _painted.has(key): mesh = _painted[key]
		else:
			_shape[String(d["file"])] = [mi.mesh, Transform3D.IDENTITY]
			mesh = painted(String(d["file"]), d.get("pal", null))
		mi.mesh = mesh
		for s in mesh.get_surface_count():
			mi.set_surface_override_material(s, material(mesh.surface_get_material(s), {"c": [1, 1, 1], "r": 0.85}, true))
	var af = d.get("animFile", null)
	if af != null:
		var lib := anim_library(String(af))
		if lib != null:
			var ap := AnimationPlayer.new()
			ap.name = "AnimationPlayer"
			inst.add_child(ap)
			ap.add_animation_library("", lib)
	return inst

static var _libs: Dictionary = {}
static func anim_library(file: String) -> AnimationLibrary:
	if _libs.has(file): return _libs[file]
	var lib: AnimationLibrary = null
	var ps = load(DIR + file)
	if ps is PackedScene:
		var inst: Node = (ps as PackedScene).instantiate()
		var ap := _first(inst, "AnimationPlayer") as AnimationPlayer
		if ap != null:
			var names := ap.get_animation_library_list()
			if names.size() > 0: lib = ap.get_animation_library(names[0])
		inst.free()
	_libs[file] = lib
	return lib

## everything that does not move, folded into one ArrayMesh per animated part (key "" = fixed to the unit root), one surface
## per distinct material: what a MultiMesh needs. Squads return the unit's extra only (soldiers are skinned).
static func merged(nation: String, kind: String) -> Dictionary:
	var e := entry(nation, kind)
	if e.has("squad"): e = e.get("extra", {}) if e.get("extra", null) != null else {}
	var out := {}
	if e.is_empty(): return out
	var pd: Dictionary = e.get("parts", {})
	var tools := {}   # part -> {material -> SurfaceTool}
	for inst in e.get("meshes", []):
		var mesh := painted(inst["f"], inst.get("pal", null))
		if mesh == null: continue
		var p := String(inst.get("p", "")) if inst.get("p", null) != null else ""
		if p != "" and pd.has(p) and pd[p].has("same"): p = String(pd[p]["same"])
		var t := xf(inst.get("m", null)) * (shape(inst["f"])[1] as Transform3D)
		var mats: Array = inst.get("mat", [])
		for s in mesh.get_surface_count():
			var md: Dictionary = mats[min(s, mats.size() - 1)] if mats.size() > 0 else {}
			var mat := material(mesh.surface_get_material(s), md, _has_colours(mesh, s), nation)
			if p == "flag": mat = flag_material(mat, nation)
			if not tools.has(p): tools[p] = {}
			if not tools[p].has(mat):
				var st := SurfaceTool.new()
				st.begin(Mesh.PRIMITIVE_TRIANGLES)
				tools[p][mat] = st
			(tools[p][mat] as SurfaceTool).append_from(mesh, s, t)
	for p in tools.keys():
		var am := ArrayMesh.new()
		for mat in tools[p].keys():
			(tools[p][mat] as SurfaceTool).commit(am)
			am.surface_set_material(am.get_surface_count() - 1, mat)
		out[p] = am
	return out

static var _pack_cache: Dictionary = {}
## cached MultiMesh package for one (nation, kind): {parts: {part -> ArrayMesh}, pxf: {part -> Transform3D}, scale: float, h: float, is_squad: bool, squad: Array}
static func merged_pack(nation: String, kind: String) -> Dictionary:
	var key := nation + "|" + kind
	if _pack_cache.has(key): return _pack_cache[key]
	var e := entry(nation, kind)
	if e.is_empty() or e.has("err"):
		_pack_cache[key] = {}
		return {}
	var is_sq := e.has("squad")
	var parts := merged(nation, kind)
	var pxf := {}
	var src: Dictionary = e.get("extra", {}) if is_sq and e.get("extra", null) is Dictionary else e
	var pd: Dictionary = src.get("parts", {})
	for pk in pd.keys():
		if not pd[pk].has("same"):
			pxf[pk] = xf(pd[pk].get("m", null))
	var sc := float(e.get("scale", 1.0))
	var h := 16.0
	if parts.has(""):
		var bb: AABB = (parts[""] as ArrayMesh).get_aabb()
		h = maxf(6.0, bb.size.y * sc)
	var pack := {parts = parts, pxf = pxf, scale = sc, h = h, is_squad = is_sq, squad = e.get("squad", [])}
	_pack_cache[key] = pack
	return pack
