## Battle mode ground (orch/godot-battle): the battle map's real height field, cliffs, roads and woods, built once.
## One terrain mesh (heights from the map's hgrid, colours baked into vertex colours over the shared ground texture),
## trees as one MultiMesh per tree model. Positions = the sim's design units (same as the browser game).
extends RefCounted

const STEP := 2           # every 2nd height sample (hgrid R=10 -> a vertex every 20 units)

static func build(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var H: Dictionary = map.hgrid
	var R := float(H.R); var hw := int(H.w); var hh := int(H.h)
	var ha: Array = H.a
	var road: Dictionary = map.road
	var rC := float(road.C); var rw := int(road.w); var rd: Array = road.d
	var rh := rd.size() / rw
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid: Array = map.grid
	var nx := (hw - 1) / STEP + 1
	var nz := (hh - 1) / STEP + 1
	var verts := PackedVector3Array(); verts.resize(nx * nz)
	var cols := PackedColorArray(); cols.resize(nx * nz)
	var uvs := PackedVector2Array(); uvs.resize(nx * nz)
	var hmax := 1.0
	for v in ha: hmax = maxf(hmax, float(v))
	var hat := func(i: int, j: int) -> float:
		return float(ha[clampi(j, 0, hh - 1) * hw + clampi(i, 0, hw - 1)])
	for j in nz:
		for i in nx:
			var hi := i * STEP; var hj := j * STEP
			var x := hi * R; var z := hj * R
			var y: float = hat.call(hi, hj)
			var k := j * nx + i
			verts[k] = Vector3(x, y, z)
			uvs[k] = Vector2(x / 240.0, z / 240.0)
			# slope for rock colour
			var sl := absf(hat.call(hi + 2, hj) - hat.call(hi - 2, hj)) + absf(hat.call(hi, hj + 2) - hat.call(hi, hj - 2))
			var hk := clampf(y / hmax, 0.0, 1.0)
			var c := Color(0.93, 0.82, 0.64).lerp(Color(0.80, 0.78, 0.60), hk * 0.7)     # sand low, drier scrub up high
			c = c.lerp(Color(0.62, 0.57, 0.50), clampf((sl - 6.0) / 18.0, 0.0, 1.0))  # steep = rock
			var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
			if int(grid[gz * GW + gx]) == 3: c = c.lerp(Color(0.52, 0.48, 0.43), 0.7)
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: c = Color(0.55, 0.50, 0.43)                  # dirt road
			cols[k] = c
	var idx := PackedInt32Array()
	for j in nz - 1:
		for i in nx - 1:
			var a := j * nx + i
			idx.append_array([a, a + 1, a + nx, a + 1, a + nx + 1, a + nx])
	var st := SurfaceTool.new()
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_INDEX] = idx
	st.create_from_arrays(arr)
	st.generate_normals()
	var mesh := st.commit()
	var g := MeshInstance3D.new()
	g.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.albedo_texture = load("res://tex/a1.png")
	mat.normal_enabled = true
	mat.normal_texture = load("res://tex/n1.png")
	mat.normal_scale = 0.7
	mat.roughness = 0.97
	g.material_override = mat
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(g)
	# skirt plane far around the map so the horizon is not empty
	var pm := PlaneMesh.new()
	pm.size = Vector2(float(map.MAPW) + 6000, float(map.MAPH) + 6000)
	var sk := MeshInstance3D.new()
	sk.mesh = pm
	sk.position = Vector3(float(map.MAPW) * 0.5, -2.0, float(map.MAPH) * 0.5)
	var sm := StandardMaterial3D.new()
	sm.albedo_color = Color(0.84, 0.74, 0.58)
	sm.roughness = 1.0
	sk.material_override = sm
	sk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(sk)
	_trees(host, sim, map, tree_mesh)

## woods: the map's wood density per 40-unit cell -> that many trees (capped), three tree models, one MultiMesh each
static func _trees(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var wood: Array = map.wood
	var GW := int(map.GW); var CELL := float(map.CELL)
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	var per := [[], [], []]
	for i in wood.size():
		var n := mini(int(wood[i]), 3)
		if n <= 0: continue
		var cx := (i % GW) * CELL; var cz := (i / GW) * CELL
		for k in n:
			var x := cx + rng.randf_range(4, CELL - 4); var z := cz + rng.randf_range(4, CELL - 4)
			var s := rng.randf_range(0.75, 1.25)
			per[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s, s)), Vector3(x, sim.ground_h(x, z) - 1.0, z)))
	for t in 3:
		var info: Dictionary = tree_mesh.call("tree%d" % (t + 1))
		if info.is_empty(): continue
		var m := MultiMeshInstance3D.new()
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = info["mesh"]
		mm.instance_count = per[t].size()
		for i in per[t].size(): mm.set_instance_transform(i, per[t][i])
		m.multimesh = mm
		host.add_child(m)
