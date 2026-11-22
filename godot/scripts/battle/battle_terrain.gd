## Battle mode ground (orch/godot-battle): the battle map's real height field, cliffs, roads and woods, built once.
## One terrain mesh (heights from the map's hgrid, colours baked into vertex colours over the shared ground texture),
## trees as one MultiMesh per tree model. Positions = the sim's design units (same as the browser game).
extends RefCounted

const MAX_VERTS := 60000.0   # the mesh is built in GDScript: big maps (hgrid 1090x750) take every 4th height sample, small ones every 2nd
const MAX_TREES := 3500      # cap total tree instances for smooth WebGL2 Compatibility performance

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
	# multi-tone biome palettes: altitude transitions, slope rock cliffs, mountain tint, road wear
	var th := str(map.get("theme", "desert"))
	var c_lo := Color(0.84, 0.72, 0.54)
	var c_mid := Color(0.73, 0.61, 0.43)
	var c_hi := Color(0.64, 0.55, 0.41)
	var c_rock := Color(0.45, 0.37, 0.29)
	var c_mtn := Color(0.39, 0.33, 0.27)
	var c_road := Color(0.50, 0.43, 0.35)
	if th == "snow":
		c_lo = Color(0.87, 0.90, 0.94)
		c_mid = Color(0.80, 0.85, 0.91)
		c_hi = Color(0.74, 0.82, 0.90)
		c_rock = Color(0.33, 0.36, 0.42)
		c_mtn = Color(0.28, 0.31, 0.37)
		c_road = Color(0.36, 0.36, 0.38)
	elif th != "desert":
		c_lo = Color(0.36, 0.49, 0.26)
		c_mid = Color(0.30, 0.44, 0.23)
		c_hi = Color(0.24, 0.36, 0.21)
		c_rock = Color(0.47, 0.47, 0.44)
		c_mtn = Color(0.40, 0.40, 0.39)
		c_road = Color(0.51, 0.47, 0.40)
	var nx := (hw - 1) / STEP + 1
	var nz := (hh - 1) / STEP + 1
	var verts := PackedVector3Array(); verts.resize(nx * nz)
	var cols := PackedColorArray(); cols.resize(nx * nz)
	var uvs := PackedVector2Array(); uvs.resize(nx * nz)
	var hmax := 1.0
	var hmin := 0.0
	for v in ha:
		var fv := float(v)
		hmax = maxf(hmax, fv)
		hmin = minf(hmin, fv)
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
			# slope for rock cliffs & multi-tone altitude transitions
			var sl := absf(hat.call(hi + 2, hj) - hat.call(hi - 2, hj)) + absf(hat.call(hi, hj + 2) - hat.call(hi, hj - 2))
			var hk := clampf(y / hmax, 0.0, 1.0)
			var c: Color = c_lo.lerp(c_mid, hk * 2.0) if hk < 0.5 else c_mid.lerp(c_hi, (hk - 0.5) * 2.0)
			var macro := sin(x * 0.0031 + z * 0.0017) * cos(z * 0.0027 - x * 0.0013) * 0.042
			c = Color(clampf(c.r + macro, 0.0, 1.0), clampf(c.g + macro * 0.9, 0.0, 1.0), clampf(c.b + macro * 0.7, 0.0, 1.0))
			c = c.lerp(c_rock, clampf((sl - 5.0) / 16.0, 0.0, 1.0))  # steep = rock cliff
			var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
			var gcell := int(grid[gz * GW + gx])
			if gcell == 3:
				c = c.lerp(c_mtn, 0.65)
			elif gcell == 1:
				c = c.lerp(c_rock * 0.65, 0.45)  # damp riverbed/shoreline
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: c = c_road                  # road
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
	mat.normal_scale = 0.28 if th == "snow" else 0.45
	mat.roughness = 0.96
	g.material_override = mat
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(g)
	# skirt plane far around the map so the horizon is not empty
	var pm := PlaneMesh.new()
	pm.size = Vector2(float(map.MAPW) + 6000, float(map.MAPH) + 6000)
	var sk := MeshInstance3D.new()
	sk.mesh = pm
	sk.position = Vector3(float(map.MAPW) * 0.5, hmin - 40.0, float(map.MAPH) * 0.5)
	var sm := StandardMaterial3D.new()
	sm.albedo_color = c_lo
	sm.roughness = 1.0
	sk.material_override = sm
	sk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(sk)
	_water(host, sim, map)
	_bridges(host, map)
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
		var ch := height_at(map, x + CELL * 0.5, z + CELL * 0.5) + 1.0
		var y: float = maxf(level, ch) if g == 1 else maxf(level - 0.15, ch)
		var wc := Color(0.06, 0.21, 0.29) if g == 1 else Color(0.20, 0.37, 0.40)
		var e := 2.0
		for v in [Vector3(x - e, y, z - e), Vector3(x + CELL + e, y, z - e), Vector3(x - e, y, z + CELL + e), Vector3(x + CELL + e, y, z - e), Vector3(x + CELL + e, y, z + CELL + e), Vector3(x - e, y, z + CELL + e)]:
			st.set_color(wc); st.set_normal(Vector3.UP); st.add_vertex(v)
		n += 1
	if n == 0: return
	var w := MeshInstance3D.new()
	w.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.albedo_color = Color.WHITE
	m.roughness = 0.16
	m.metallic = 0.22
	m.metallic_specular = 0.65
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	w.material_override = m
	w.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(w)

## real 3D bridges (map.bridges: [{x, y, h, n, t}]): concrete deck, curbs, steel guardrails, dark support piers
## Each bridge is named "Bridge_%d" under host/Bridges so world_view.gd can hide destroyed bridges via bridges_dead.
static func _bridges(host: Node3D, map: Dictionary) -> void:
	var bridges_raw = map.get("bridges", null)
	if not (bridges_raw is Array) or (bridges_raw as Array).is_empty():
		return
	var bridges: Array = bridges_raw
	var old := host.get_node_or_null("Bridges")
	if old != null:
		old.queue_free()
	var root := Node3D.new()
	root.name = "Bridges"
	host.add_child(root)

	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.albedo_color = Color.WHITE
	mat.roughness = 0.78
	mat.metallic = 0.15

	var c_deck := Color(0.56, 0.54, 0.50)
	var c_asphalt := Color(0.24, 0.25, 0.27)
	var c_stripe := Color(0.76, 0.72, 0.56)
	var c_curb := Color(0.64, 0.62, 0.58)
	var c_rail := Color(0.27, 0.30, 0.34)
	var c_pier := Color(0.32, 0.33, 0.35)
	var c_abut := Color(0.42, 0.41, 0.39)

	for i in bridges.size():
		var b = bridges[i]
		if not (b is Dictionary):
			continue
		var cx := float(b.get("x", 0.0))
		var cz := float(b.get("y", 0.0))
		var half_len := maxf(24.0, float(b.get("h", 60.0)))
		var n_arr = b.get("n", [1.0, 0.0])
		var nx := 1.0
		var nz := 0.0
		if n_arr is Array and (n_arr as Array).size() >= 2:
			nx = float(n_arr[0])
			nz = float(n_arr[1])
		var nlen := sqrt(nx * nx + nz * nz)
		if nlen < 0.001:
			nx = 1.0; nz = 0.0
		else:
			nx /= nlen; nz /= nlen

		var ha := height_at(map, cx - nx * half_len, cz - nz * half_len)
		var hb := height_at(map, cx + nx * half_len, cz + nz * half_len)
		var hc := height_at(map, cx, cz)
		var deck_y := maxf(maxf(ha, hb) + 1.5, hc + 6.0)

		var full_len := half_len * 2.0 + 18.0
		var deck_w := 62.0
		var deck_th := 4.6
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)

		# Structural concrete deck slab (top sits at y = 0)
		_add_box(st, Vector3(0.0, -deck_th * 0.5, 0.0), Vector3(full_len, deck_th, deck_w), c_deck)
		# Dark asphalt roadway surface + center stripe
		_add_box(st, Vector3(0.0, 0.35, 0.0), Vector3(full_len - 2.0, 0.7, deck_w - 11.0), c_asphalt)
		_add_box(st, Vector3(0.0, 0.74, 0.0), Vector3(full_len - 12.0, 0.12, 1.5), c_stripe)

		# Raised concrete curbs + steel guardrails along both sides
		var curb_z := deck_w * 0.5 - 2.6
		var rail_z := deck_w * 0.5 - 1.6
		for side in [-1.0, 1.0]:
			_add_box(st, Vector3(0.0, 1.2, side * curb_z), Vector3(full_len, 2.4, 5.2), c_curb)
			_add_box(st, Vector3(0.0, 4.1, side * rail_z), Vector3(full_len - 4.0, 0.9, 1.1), c_rail)
			_add_box(st, Vector3(0.0, 6.9, side * rail_z), Vector3(full_len - 4.0, 1.0, 1.2), c_rail)

		# Vertical steel guardrail posts
		var n_posts := clampi(int(full_len / 34.0) + 1, 3, 24)
		for pi in n_posts:
			var t_p := float(pi) / float(n_posts - 1) - 0.5
			var px := t_p * (full_len - 8.0)
			for side in [-1.0, 1.0]:
				_add_box(st, Vector3(px, 4.2, side * rail_z), Vector3(1.5, 6.4, 1.5), c_rail)

		# Concrete end abutments anchoring into both riverbanks
		var abut_h := 34.0
		var abut_x := full_len * 0.5 - 6.0
		for end_s in [-1.0, 1.0]:
			_add_box(st, Vector3(end_s * abut_x, -deck_th - abut_h * 0.5, 0.0), Vector3(14.0, abut_h, deck_w + 4.0), c_abut)

		# Dark support piers descending deep into the water
		var pier_h := 52.0
		var n_piers := clampi(int(full_len / 75.0), 2, 10)
		var span_in := full_len - 36.0
		if span_in > 24.0:
			for pi in n_piers:
				var f := (float(pi) + 0.5) / float(n_piers) - 0.5
				var px := f * span_in
				# Cross-cap beam right under deck
				_add_box(st, Vector3(px, -deck_th - 2.6, 0.0), Vector3(9.5, 5.2, deck_w - 6.0), c_pier)
				# Twin support columns down into riverbed
				for side in [-1.0, 1.0]:
					_add_box(st, Vector3(px, -deck_th - 5.2 - pier_h * 0.5, side * (deck_w * 0.28)), Vector3(8.0, pier_h, 11.0), c_pier)

		var mi := MeshInstance3D.new()
		mi.name = "Bridge_%d" % i
		mi.mesh = st.commit()
		mi.material_override = mat
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var bx := Vector3(nx, 0.0, nz)
		var bz := bx.cross(Vector3.UP)
		mi.transform = Transform3D(Basis(bx, Vector3.UP, bz), Vector3(cx, deck_y, cz))
		root.add_child(mi)

static func _add_quad(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, n: Vector3, col: Color) -> void:
	if (p2 - p0).cross(p1 - p0).dot(n) >= 0.0:
		for v in [p0, p1, p2, p0, p2, p3]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)
	else:
		for v in [p0, p3, p2, p0, p2, p1]:
			st.set_color(col); st.set_normal(n); st.add_vertex(v)

static func _add_box(st: SurfaceTool, c: Vector3, s: Vector3, col: Color) -> void:
	var h := s * 0.5
	var x0 := c.x - h.x; var x1 := c.x + h.x
	var y0 := c.y - h.y; var y1 := c.y + h.y
	var z0 := c.z - h.z; var z1 := c.z + h.z
	_add_quad(st, Vector3(x0, y1, z0), Vector3(x1, y1, z0), Vector3(x1, y1, z1), Vector3(x0, y1, z1), Vector3.UP, col)
	_add_quad(st, Vector3(x0, y0, z1), Vector3(x1, y0, z1), Vector3(x1, y0, z0), Vector3(x0, y0, z0), Vector3.DOWN, col * 0.72)
	_add_quad(st, Vector3(x1, y0, z0), Vector3(x1, y1, z0), Vector3(x1, y1, z1), Vector3(x1, y0, z1), Vector3.RIGHT, col * 0.88)
	_add_quad(st, Vector3(x0, y0, z1), Vector3(x0, y1, z1), Vector3(x0, y1, z0), Vector3(x0, y0, z0), Vector3.LEFT, col * 0.85)
	_add_quad(st, Vector3(x0, y0, z1), Vector3(x0, y1, z1), Vector3(x1, y1, z1), Vector3(x1, y0, z1), Vector3.BACK, col * 0.92)
	_add_quad(st, Vector3(x1, y0, z0), Vector3(x1, y1, z0), Vector3(x0, y1, z0), Vector3(x0, y0, z0), Vector3.FORWARD, col * 0.82)

## woods: exact JS tree placement from map.trees ([x, y, scale], capped at MAX_TREES) when present,
## falling back to density scatter over map.wood (--gdsim) otherwise; three tree models, one MultiMesh each
static func _trees(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid := PackedByteArray(map.get("grid", []))
	var has_grid := grid.size() >= GW * GH and GW > 0 and GH > 0
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	var per := [[], [], []]

	var raw_trees = map.get("trees", null)
	if raw_trees is Array and (raw_trees as Array).size() > 0:
		var tarr: Array = raw_trees
		var total := tarr.size()
		var count := mini(total, MAX_TREES)
		var stride := float(total) / float(count)
		for k in count:
			var entry = tarr[mini(total - 1, int(floor(float(k) * stride)))]
			if not (entry is Array) or (entry as Array).size() < 2:
				continue
			var x := float(entry[0])
			var z := float(entry[1])
			if has_grid:
				var gx := clampi(int(x / CELL), 0, GW - 1)
				var gz := clampi(int(z / CELL), 0, GH - 1)
				var gcell := int(grid[gz * GW + gx])
				if gcell == 1 or gcell == 2:
					continue
			var js_s := float(entry[2]) if (entry as Array).size() >= 3 else 1.0
			var s := clampf(js_s, 0.55, 1.65) * rng.randf_range(0.92, 1.08)
			var sy := s * rng.randf_range(0.92, 1.10)
			per[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 1.0, z)))
	elif map.has("wood"):
		var wood := PackedByteArray(map.wood)
		var placed := 0
		for i in wood.size():
			if placed >= MAX_TREES:
				break
			var n := mini(int(wood[i]), 3)
			if n <= 0: continue
			if has_grid and i < grid.size():
				var gcell := int(grid[i])
				if gcell == 1 or gcell == 2:
					continue
			var cx := (i % GW) * CELL; var cz := (i / GW) * CELL
			for k in n:
				if placed >= MAX_TREES:
					break
				var x := cx + rng.randf_range(4, CELL - 4); var z := cz + rng.randf_range(4, CELL - 4)
				var s := rng.randf_range(0.75, 1.25)
				var sy := s * rng.randf_range(0.92, 1.10)
				per[rng.randi() % 3].append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 1.0, z)))
				placed += 1

	for t in 3:
		if (per[t] as Array).is_empty(): continue
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
