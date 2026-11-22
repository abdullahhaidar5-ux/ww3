## Battle mode ground (orch/godot-battle): the battle map's real height field, cliffs, roads and woods, built once.
## One terrain mesh (heights from the map's hgrid, colours baked into vertex colours over the shared ground texture),
## trees as one MultiMesh per tree model. Positions = the sim's design units (same as the browser game).
extends RefCounted

const MAX_VERTS := 60000.0   # the mesh is built in GDScript: big maps (hgrid 1090x750) take every 4th height sample, small ones every 2nd

## ground height at a map point, straight from the bridge's height field (bilinear, same as the JS groundH)
static func height_at(map: Dictionary, x: float, z: float) -> float:
	var H: Dictionary = map.hgrid
	var R := float(H.R); var w := int(H.w); var h := int(H.h)
	var fx := clampf(x / R, 0.0, w - 1.001); var fz := clampf(z / R, 0.0, h - 1.001)
	var i := int(fx); var j := int(fz); var u := fx - i; var v := fz - j
	var k := j * w + i
	var a = H.a
	return lerpf(lerpf(a[k], a[k + 1], u), lerpf(a[k + w], a[k + w + 1], u), v)

## P4c HOOK: lane P4d exports each map's whole static scene from the browser game (ground with its real textures,
## roads, water, bridges, cliffs, trees, props) to res://models/auto/maps/<map>.glb. When that file is there it IS the
## ground; the code-built ground below is only the stand-in for maps not exported yet.
static func build(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var glb := "res://models/auto/maps/%s.glb" % String(map.get("key", ""))
	if ResourceLoader.exists(glb):
		var ps = load(glb)
		if ps is PackedScene:
			var n: Node = (ps as PackedScene).instantiate()
			n.name = "MapScene"
			host.add_child(n)
			return
	var H: Dictionary = map.hgrid
	var R := float(H.R); var hw := int(H.w); var hh := int(H.h)
	var ha := PackedFloat32Array(H.a)
	var road: Dictionary = map.road
	var rC := float(road.C); var rw := int(road.w); var rd := PackedByteArray(road.d)
	var rh := rd.size() / rw
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid := PackedByteArray(map.grid)
	var STEP := maxi(2, ceili(sqrt(hw * hh / MAX_VERTS)))
	# plain ground colours by the map's theme (KAIZEN 2; the real ground look is a later step)
	var th := str(map.get("theme", "desert"))
	var c_lo := Color(0.80, 0.68, 0.52); var c_hi := Color(0.66, 0.64, 0.48); var c_road := Color(0.55, 0.50, 0.43)
	if th == "snow": c_lo = Color(0.86, 0.88, 0.90); c_hi = Color(0.95, 0.96, 0.98); c_road = Color(0.62, 0.60, 0.57)
	elif th != "desert": c_lo = Color(0.42, 0.52, 0.30); c_hi = Color(0.50, 0.55, 0.36); c_road = Color(0.52, 0.47, 0.38)
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
			uvs[k] = Vector2(x / 380.0, z / 380.0)
			# slope for rock colour
			var sl := absf(hat.call(hi + 2, hj) - hat.call(hi - 2, hj)) + absf(hat.call(hi, hj + 2) - hat.call(hi, hj - 2))
			var hk := clampf(y / hmax, 0.0, 1.0)
			var c := c_lo.lerp(c_hi, hk * 0.8)     # desert: sand low, drier scrub up high
			c = c.lerp(Color(0.62, 0.57, 0.50), clampf((sl - 6.0) / 18.0, 0.0, 1.0))  # steep = rock
			var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
			if int(grid[gz * GW + gx]) == 3: c = c.lerp(Color(0.52, 0.48, 0.43), 0.7)
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: c = c_road                  # dirt road
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
	mat.normal_scale = 0.28 if th == "snow" else 0.48
	mat.roughness = 0.96
	g.material_override = mat
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(g)
	# skirt plane far around the map so the horizon is not empty
	var pm := PlaneMesh.new()
	pm.size = Vector2(float(map.MAPW) + 6000, float(map.MAPH) + 6000)
	var sk := MeshInstance3D.new()
	sk.mesh = pm
	var hmin := 0.0
	for v in ha: hmin = minf(hmin, float(v))
	sk.position = Vector3(float(map.MAPW) * 0.5, hmin - 40.0, float(map.MAPH) * 0.5)
	var sm := StandardMaterial3D.new()
	sm.albedo_color = c_lo
	sm.roughness = 1.0
	sk.material_override = sm
	sk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(sk)
	_water(host, sim, map)
	if tree_mesh.is_valid(): _trees(host, sim, map, tree_mesh)

## water cells (grid 1 = water, 2 = ford / shallows): one quad per cell just above the ground, one mesh
static func _water(host: Node3D, sim, map: Dictionary) -> void:
	var grid := PackedByteArray(map.grid)
	var GW := int(map.GW); var CELL := float(map.CELL)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := 0
	# one water level: a little under the banks (land cells next to water)
	var bank := 0.0; var nb := 0
	for i in grid.size():
		if int(grid[i]) != 1: continue
		for o in [-1, 1, -GW, GW]:
			var j: int = i + o
			if j >= 0 and j < grid.size() and int(grid[j]) == 0:
				bank += height_at(map, (j % GW) * CELL + CELL * 0.5, (j / GW) * CELL + CELL * 0.5); nb += 1
	var level := bank / maxf(1, nb) - 4.0
	for i in grid.size():
		var g := int(grid[i])
		if g != 1 and g != 2: continue
		var x := (i % GW) * CELL; var z := (i / GW) * CELL
		var y: float = maxf(level, height_at(map, x + CELL * 0.5, z + CELL * 0.5) + 1.0) if g == 1 else height_at(map, x + CELL * 0.5, z + CELL * 0.5) + 1.0
		var wc := Color(0.10, 0.27, 0.32, 0.88) if g == 1 else Color(0.25, 0.4, 0.42, 0.6)
		var e := 2.0
		for v in [Vector3(x - e, y, z - e), Vector3(x + CELL + e, y, z - e), Vector3(x - e, y, z + CELL + e), Vector3(x + CELL + e, y, z - e), Vector3(x + CELL + e, y, z + CELL + e), Vector3(x - e, y, z + CELL + e)]:
			st.set_color(wc); st.set_normal(Vector3.UP); st.add_vertex(v)
		n += 1
	if n == 0: return
	var w := MeshInstance3D.new()
	w.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.05, 0.14, 0.17)
	m.roughness = 0.6
	m.metallic_specular = 0.3
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	w.material_override = m
	w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(w)

## woods: the map's wood density per 40-unit cell -> that many trees (capped), three tree models, one MultiMesh each
static func _trees(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var wood := PackedByteArray(map.wood)
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
			per[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s, s)), Vector3(x, height_at(map, x, z) - 1.0, z)))
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
