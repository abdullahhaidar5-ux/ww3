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
	var road: Dictionary = map.get("road", {})
	var rC := float(road.get("C", 16.0)); var rw := int(road.get("w", 0)); var rd := PackedByteArray(road.get("d", []))
	var rh := (rd.size() / rw) if rw > 0 else 0
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid := PackedByteArray(map.grid)
	var STEP := maxi(2, ceili(sqrt(hw * hh / MAX_VERTS)))
	# multi-tone biome palettes: smooth altitude transitions + impassable mountain tint (roads/cliffs/shores are per-pixel in terrain_pbr.gdshader)
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
	var theme_id := 2 if th == "snow" else (0 if th == "desert" else 1)
	var c_lo := Color(0.84, 0.72, 0.54)
	var c_mid := Color(0.73, 0.61, 0.43)
	var c_hi := Color(0.64, 0.55, 0.41)
	var c_mtn := Color(0.41, 0.34, 0.27)
	if th == "snow":
		c_lo = Color(0.87, 0.90, 0.94)
		c_mid = Color(0.80, 0.85, 0.91)
		c_hi = Color(0.74, 0.82, 0.90)
		c_mtn = Color(0.32, 0.36, 0.42)
	elif th != "desert":
		c_lo = Color(0.36, 0.49, 0.26)
		c_mid = Color(0.30, 0.44, 0.23)
		c_hi = Color(0.24, 0.36, 0.21)
		c_mtn = Color(0.41, 0.41, 0.39)
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
			# pure smooth elevation + biome tinting + gentle macro variation + impassable mountain rock tint
			var hk := clampf(y / hmax, 0.0, 1.0)
			var c: Color = c_lo.lerp(c_mid, hk * 2.0) if hk < 0.5 else c_mid.lerp(c_hi, (hk - 0.5) * 2.0)
			var macro := sin(x * 0.0031 + z * 0.0017) * cos(z * 0.0027 - x * 0.0013) * 0.042
			c = Color(clampf(c.r + macro, 0.0, 1.0), clampf(c.g + macro * 0.9, 0.0, 1.0), clampf(c.b + macro * 0.7, 0.0, 1.0))
			var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
			var gcell := int(grid[gz * GW + gx])
			if gcell == 3:
				c = c.lerp(c_mtn, 0.55)
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
	st.generate_tangents()
	var mesh := st.commit()
	# Build 1-pass blurred L8 masks for per-pixel anti-aliased roads and damp riverbanks
	var rbuf := PackedByteArray()
	if rw > 0 and rh > 0 and rd.size() >= rw * rh:
		rbuf.resize(rw * rh)
		for ri in rw * rh:
			rbuf[ri] = 255 if int(rd[ri]) != 0 else 0
	var road_tex := _blur_l8(rbuf, rw, rh)
	var sbuf := PackedByteArray()
	if GW > 0 and GH > 0 and grid.size() >= GW * GH:
		sbuf.resize(GW * GH)
		for gi in GW * GH:
			var gcell := int(grid[gi])
			sbuf[gi] = 255 if gcell == 1 else (160 if gcell == 2 else 0)
	var shore_tex := _blur_l8(sbuf, GW, GH)
	var g := MeshInstance3D.new()
	g.name = "TerrainMesh"
	g.mesh = mesh
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/terrain_pbr.gdshader")
	mat.set_shader_parameter("detail_alb", load("res://tex/a1.png"))
	mat.set_shader_parameter("detail_nrm", load("res://tex/n1.png"))
	mat.set_shader_parameter("road_tex", road_tex)
	mat.set_shader_parameter("shore_tex", shore_tex)
	mat.set_shader_parameter("map_size", Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("road_size", Vector2(float(rw) * rC, float(rh) * rC) if (rw > 0 and rh > 0) else Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("theme_id", theme_id)
	mat.set_shader_parameter("nrm_strength", 0.30 if th == "snow" else 0.45)
	mat.set_shader_parameter("wetness", 0.0)
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

## 1-pass separable [1, 2, 1] / 4 blur (3x3 Gaussian kernel) producing an L8 ImageTexture for smooth bilinear shader masks
static func _blur_l8(src: PackedByteArray, w: int, h: int) -> ImageTexture:
	if w <= 0 or h <= 0 or src.size() < w * h:
		var empty_img := Image.create_from_data(1, 1, false, Image.FORMAT_L8, PackedByteArray([0]))
		return ImageTexture.create_from_image(empty_img)
	var tmp := PackedByteArray()
	tmp.resize(w * h)
	for y in h:
		var row := y * w
		for x in w:
			var xm := x - 1 if x > 0 else 0
			var xp := x + 1 if x + 1 < w else w - 1
			tmp[row + x] = (int(src[row + xm]) + (int(src[row + x]) << 1) + int(src[row + xp]) + 2) >> 2
	var out := PackedByteArray()
	out.resize(w * h)
	for y in h:
		var ym := (y - 1 if y > 0 else 0) * w
		var y0 := y * w
		var yp := (y + 1 if y + 1 < h else h - 1) * w
		for x in w:
			out[y0 + x] = (int(tmp[ym + x]) + (int(tmp[y0 + x]) << 1) + int(tmp[yp + x]) + 2) >> 2
	var img := Image.create_from_data(w, h, false, Image.FORMAT_L8, out)
	return ImageTexture.create_from_image(img)

## water cells (grid 1 = water, 2 = ford / shallows): one quad per cell just above the ground, animated PBR water shader
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
		# alpha encodes shallowness for water_pbr.gdshader (a < 0.75 enables animated ford foam shimmer)
		var wc := Color(0.06, 0.21, 0.29, 1.0) if g == 1 else Color(0.20, 0.37, 0.40, 0.55)
		var e := 2.0
		for v in [Vector3(x - e, y, z - e), Vector3(x + CELL + e, y, z - e), Vector3(x - e, y, z + CELL + e), Vector3(x + CELL + e, y, z - e), Vector3(x + CELL + e, y, z + CELL + e), Vector3(x - e, y, z + CELL + e)]:
			st.set_color(wc); st.set_normal(Vector3.UP); st.add_vertex(v)
		n += 1
	if n == 0: return
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
	var w := MeshInstance3D.new()
	w.name = "WaterMesh"
	w.mesh = st.commit()
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/water_pbr.gdshader")
	var sky_hor := Color(0.90, 0.80, 0.65)
	if th == "snow":
		sky_hor = Color(0.78, 0.85, 0.94)
	elif th == "green":
		sky_hor = Color(0.76, 0.84, 0.90)
	m.set_shader_parameter("sky_horizon", sky_hor)
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
## falling back to density scatter over map.wood (--gdsim) otherwise; three tree models, one MultiMesh each,
## with subtle organic lean (+/- 0.05 rad) and per-biome foliage modulation.
static func _trees(host: Node3D, sim, map: Dictionary, tree_mesh: Callable) -> void:
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid := PackedByteArray(map.get("grid", []))
	var has_grid := grid.size() >= GW * GH and GW > 0 and GH > 0
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
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
			var yaw := rng.randf() * TAU
			var lean_x := rng.randf_range(-0.05, 0.05)
			var lean_z := rng.randf_range(-0.05, 0.05)
			var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, lean_x) * Basis(Vector3.FORWARD, lean_z)
			per[rng.randi() % 3].append(Transform3D(b.scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 1.0, z)))
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
				var yaw := rng.randf() * TAU
				var lean_x := rng.randf_range(-0.05, 0.05)
				var lean_z := rng.randf_range(-0.05, 0.05)
				var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, lean_x) * Basis(Vector3.FORWARD, lean_z)
				per[rng.randi() % 3].append(Transform3D(b.scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 1.0, z)))
				placed += 1

	# Biome-tuned tree palettes (foliage + bark)
	var fol_col := Color(0.37, 0.41, 0.19)    # desert: sun-parched olive/sage scrub
	var bark_col := Color(0.41, 0.34, 0.25)
	var tex_tint := Color(1.02, 0.96, 0.85)
	if th == "snow":
		fol_col = Color(0.31, 0.43, 0.41)     # snow: frosty winter spruce
		bark_col = Color(0.31, 0.30, 0.32)
		tex_tint = Color(0.92, 0.98, 1.06)
	elif th == "green":
		fol_col = Color(0.24, 0.42, 0.15)     # green: rich deep woodland foliage
		bark_col = Color(0.30, 0.23, 0.16)
		tex_tint = Color(0.95, 1.02, 0.93)

	for t in 3:
		if (per[t] as Array).is_empty(): continue
		var info: Dictionary = tree_mesh.call("tree%d" % (t + 1))
		if info.is_empty(): continue
		var mesh: Mesh = info["mesh"]
		var use_inst_colors := false
		if mesh != null:
			for s in mesh.get_surface_count():
				var smat := mesh.surface_get_material(s)
				if not (smat is BaseMaterial3D):
					continue
				var bm: BaseMaterial3D = (smat as BaseMaterial3D).duplicate()
				if bm.albedo_texture == null:
					var mname := bm.resource_name.to_lower()
					var is_bark := mname.contains("wood") or mname.contains("bark") or mname.contains("trunk")
					var is_foliage := (not is_bark) and (mname.contains("green") or mname.contains("leaf") or mname.contains("foliage") or bm.albedo_color.g > bm.albedo_color.r)
					if is_foliage:
						bm.albedo_color = fol_col
						bm.roughness = 0.82
						var has_vcol := false
						if mesh is ArrayMesh:
							var sarr := (mesh as ArrayMesh).surface_get_arrays(s)
							has_vcol = sarr.size() > Mesh.ARRAY_COLOR and sarr[Mesh.ARRAY_COLOR] != null
						if not has_vcol:
							bm.vertex_color_use_as_albedo = true
							use_inst_colors = true
					else:
						bm.albedo_color = bark_col
						bm.roughness = 0.90
				else:
					# Preserve existing textures; apply only a gentle biome tint
					bm.albedo_color = bm.albedo_color * tex_tint
				mesh.surface_set_material(s, bm)
		var m := MultiMeshInstance3D.new()
		m.name = "Trees_%d" % (t + 1)
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		if use_inst_colors:
			mm.use_colors = true
		mm.mesh = mesh
		mm.instance_count = per[t].size()
		for i in per[t].size():
			mm.set_instance_transform(i, per[t][i])
			if use_inst_colors:
				var v := rng.randf_range(0.86, 1.14)
				var warm := rng.randf_range(-0.05, 0.05)
				if th == "snow":
					# subtle snow-frost shimmer variation across evergreen crowns
					var frost := rng.randf_range(0.0, 0.22)
					mm.set_instance_color(i, Color(clampf(v + frost, 0.72, 1.25), clampf(v + frost, 0.72, 1.25), clampf(v + frost * 1.15, 0.75, 1.28)))
				else:
					mm.set_instance_color(i, Color(clampf(v + warm, 0.75, 1.20), clampf(v, 0.75, 1.20), clampf(v - warm * 0.6, 0.75, 1.20)))
		m.multimesh = mm
		host.add_child(m)
