## Battle mode look table (orch/godot-battle): which model draws each (nation, unit/building kind), at what size.
## Every entry becomes ONE MultiMesh (GPU instancing) in battle.gd, so 300 tanks of one kind are one draw call.
## Models come from the repo's models/ (gunzip + gltf-transform dequantize into godot/models/). Kinds without a
## fitting model yet use a code-built stand-in ("@box", "@derrick", ...) so nothing is invisible.
extends RefCounted

# Shia axis (IR, RS) wear the Middle Eastern soldier + compounds; US / IL the western ones.
const ME_FACS := ["IR", "RS"]

# unit kind -> [model, fit axis, size] per side style ("me" / "west"); nation overrides below
const UNIT_ME := {
	"inf": ["sol_m", "y", 16.0], "at": ["sol_m", "y", 16.0], "officer": ["sol_m", "y", 17.0], "medic": ["sol_m", "y", 16.0],
	"champ": ["sol_m", "y", 17.0], "cleric": ["sol_m", "y", 17.0], "spy": ["sol_m", "y", 16.0], "mortar": ["sol_m", "y", 16.0],
	"hero": ["sol_m", "y", 17.0],
	"tank": ["m_t72", "xz", 46.0], "aa": ["m_ural", "xz", 40.0], "arty": ["truck", "xz", 44.0], "bmt": ["truck", "xz", 48.0],
	"ew": ["m_ural", "xz", 40.0], "ammot": ["m_ural", "xz", 38.0], "harv": ["m_ural", "xz", 40.0], "dozer": ["m_jd550", "xz", 36.0],
	"drone": ["@shahed", "xz", 30.0], "dtank": ["m_t72", "xz", 46.0], "dsam": ["m_ural", "xz", 40.0], "darty": ["truck", "xz", 44.0],
}
const UNIT_WEST := {
	"inf": ["sol_w", "y", 16.0], "at": ["sol_w", "y", 16.0], "officer": ["sol_w", "y", 17.0], "medic": ["sol_w", "y", 16.0],
	"champ": ["sol_w", "y", 17.0], "spy": ["sol_w", "y", 16.0], "hero": ["sol_w", "y", 17.0],
	"tank": ["m_abrams", "xz", 46.0], "aa": ["m_humvee", "xz", 34.0], "arty": ["m_msta", "xz", 46.0], "ew": ["m_humvee", "xz", 34.0],
	"ammot": ["m_m35", "xz", 38.0], "harv": ["m_m35", "xz", 40.0], "dozer": ["m_jd550", "xz", 36.0], "idome": ["sam", "xz", 40.0],
	"dtank": ["m_abrams", "xz", 46.0], "dsam": ["m_humvee", "xz", 34.0], "darty": ["m_msta", "xz", 46.0],
}
const UNIT_FAC := {
	"RS": {"tank": ["technical", "xz", 34.0], "aa": ["technical", "xz", 34.0], "dtank": ["technical", "xz", 34.0], "dsam": ["technical", "xz", 34.0], "drone": ["@shahed", "xz", 30.0]},
	"IL": {"tank": ["m_merkava", "xz", 48.0], "dtank": ["m_merkava", "xz", 48.0]},
}
# building kind -> [model, scale on the building's footprint (sim size)]
const BLD_ME := {"hq": ["b_hq_me", 1.25], "barracks": ["b_barr_me", 1.3], "factory": ["b_fact_me", 1.25]}
const BLD_WEST := {"hq": ["b_hq", 1.25], "barracks": ["b_barr", 1.3], "factory": ["b_fact", 1.25]}
const BLD_ANY := {
	"gen": ["b_radar", 1.2], "depot": ["tent", 1.1], "airfield": ["b_pad", 1.15], "turret": ["b_turret", 1.3], "sam": ["sam", 1.3],
	"techb_plant": ["watertower", 1.4], "techb_quarry": ["container", 1.2], "techb_mine": ["b_crane", 1.3], "techb_hosp": ["tent", 1.2],
	"derrick": ["@derrick", 1.0],
}
const BOX_COL := Color(0.62, 0.58, 0.5)

static func unit_model(fac: String, kind: String) -> Array:
	var ov: Dictionary = UNIT_FAC.get(fac, {})
	if ov.has(kind): return ov[kind]
	var t: Dictionary = UNIT_ME if ME_FACS.has(fac) else UNIT_WEST
	if t.has(kind): return t[kind]
	return ["@box", "xz", 30.0]

static func bld_model(fac: String, kind: String) -> Array:
	var t: Dictionary = BLD_ME if ME_FACS.has(fac) else BLD_WEST
	if t.has(kind): return t[kind]
	if BLD_ANY.has(kind): return BLD_ANY[kind]
	return ["@box", 1.0]

static func is_soldier(model: String) -> bool:
	return model.begins_with("sol_")

## soldiers drawn per infantry entity (a fire team reads better than one tiny figure; health thins it out)
static func team_size(kind: String) -> int:
	return 1 if kind in ["officer", "cleric", "spy", "hero", "champ"] else 3

# ------------------------------------------------------------------ code-built stand-ins
static func box_mesh(size: float, col: Color) -> Mesh:
	var bm := BoxMesh.new()
	bm.size = Vector3(size * 0.9, size * 0.45, size * 0.9)
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.9
	bm.material = m
	var am := ArrayMesh.new()
	var arr := bm.get_mesh_arrays()
	var vs: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	for i in vs.size(): vs[i].y += size * 0.225
	arr[Mesh.ARRAY_VERTEX] = vs
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	am.surface_set_material(0, m)
	return am

## oil derrick: tapered lattice tower + pump head + tank, ~40 wide
static func derrick_mesh() -> Mesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var add_box := func(c: Vector3, s: Vector3, col: Color):
		var b := BoxMesh.new(); b.size = s
		var a := b.get_mesh_arrays()
		var vs: PackedVector3Array = a[Mesh.ARRAY_VERTEX]; var ns: PackedVector3Array = a[Mesh.ARRAY_NORMAL]; var ix: PackedInt32Array = a[Mesh.ARRAY_INDEX]
		for i in ix:
			st.set_color(col); st.set_normal(ns[i]); st.add_vertex(vs[i] + c)
	var steel := Color(0.35, 0.33, 0.3)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			add_box.call(Vector3(sx * 6, 18, sz * 6), Vector3(2, 36, 2), steel)
	add_box.call(Vector3(0, 37, 0), Vector3(8, 3, 8), steel)
	add_box.call(Vector3(0, 10, 0), Vector3(14, 1.5, 14), steel)
	add_box.call(Vector3(14, 6, 0), Vector3(16, 12, 10), Color(0.55, 0.45, 0.3))
	add_box.call(Vector3(-13, 4, 8), Vector3(10, 8, 10), Color(0.3, 0.3, 0.32))
	add_box.call(Vector3(0, 0.5, 0), Vector3(40, 1, 30), Color(0.25, 0.22, 0.2))
	var m := st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.8
	m.surface_set_material(0, mat)
	return m
