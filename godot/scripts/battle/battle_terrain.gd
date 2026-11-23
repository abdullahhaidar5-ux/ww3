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
	var c_lo := Color(0.79, 0.71, 0.56)
	var c_mid := Color(0.71, 0.62, 0.47)
	var c_hi := Color(0.63, 0.56, 0.44)
	var c_mtn := Color(0.46, 0.39, 0.31)
	if th == "snow":
		c_lo = Color(0.76, 0.80, 0.86)
		c_mid = Color(0.70, 0.75, 0.82)
		c_hi = Color(0.65, 0.71, 0.79)
		c_mtn = Color(0.35, 0.39, 0.45)
	elif th != "desert":
		c_lo = Color(0.40, 0.51, 0.29)
		c_mid = Color(0.35, 0.46, 0.26)
		c_hi = Color(0.30, 0.40, 0.24)
		c_mtn = Color(0.45, 0.44, 0.41)
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
	mat.set_shader_parameter("nrm_strength", 0.34 if th == "snow" else 0.54)
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
	_env_props(host, map)

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
		var wc := Color(0.08, 0.25, 0.34, 1.0) if g == 1 else Color(0.24, 0.41, 0.44, 0.55)
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
	var sky_hor := Color(0.92, 0.84, 0.68)
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

	var c_deck := Color(0.58, 0.56, 0.52)
	var c_asphalt := Color(0.28, 0.29, 0.31)
	var c_stripe := Color(0.80, 0.75, 0.58)
	var c_curb := Color(0.66, 0.64, 0.60)
	var c_rail := Color(0.30, 0.33, 0.36)
	var c_pier := Color(0.35, 0.36, 0.38)
	var c_abut := Color(0.46, 0.44, 0.41)

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

static func _add_tri(st: SurfaceTool, p0: Vector3, p1: Vector3, p2: Vector3, col: Color, ds := false) -> void:
	var n := (p2 - p0).cross(p1 - p0)
	if n.length_squared() < 1e-6: return
	n = n.normalized()
	for v in [p0, p1, p2]:
		st.set_color(col); st.set_normal(n); st.add_vertex(v)
	if ds:
		for v in [p0, p2, p1]:
			st.set_color(col * 0.82); st.set_normal(-n); st.add_vertex(v)

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

static func _add_taper(st: SurfaceTool, p0: Vector3, p1: Vector3, r0: float, r1: float, sides: int, c0: Color, c1: Color) -> void:
	var axis := p1 - p0
	var alen := axis.length()
	if alen < 0.01: return
	var up := axis / alen
	var ref := Vector3.RIGHT if absf(up.dot(Vector3.RIGHT)) < 0.9 else Vector3.FORWARD
	var u := up.cross(ref).normalized()
	var v := up.cross(u).normalized()
	for i in sides:
		var a0 := TAU * float(i) / float(sides)
		var a1 := TAU * float(i + 1) / float(sides)
		var d0 := u * cos(a0) + v * sin(a0)
		var d1 := u * cos(a1) + v * sin(a1)
		var b0 := p0 + d0 * r0; var b1 := p0 + d1 * r0
		var t0 := p1 + d0 * r1; var t1 := p1 + d1 * r1
		var n := ((b1 - b0).cross(t0 - b0)).normalized()
		if n.dot(d0 + d1) < 0.0: n = -n
		for pt in [[b0, c0], [b1, c0], [t1, c1], [b0, c0], [t1, c1], [t0, c1]]:
			st.set_color(pt[1]); st.set_normal(n); st.add_vertex(pt[0])

static func _add_cluster(st: SurfaceTool, c: Vector3, rx: float, ry: float, rz: float, col: Color, seed_i: int) -> void:
	# Faceted organic foliage / rock cluster (icosahedron-like dual rings) with sunlit crown & shaded underside
	var rng := RandomNumberGenerator.new(); rng.seed = seed_i
	var segs := 7
	var top := c + Vector3(rng.randf_range(-0.15, 0.15) * rx, ry * rng.randf_range(0.92, 1.10), rng.randf_range(-0.15, 0.15) * rz)
	var bot := c + Vector3(0.0, -ry * 0.72, 0.0)
	var ring_hi: Array[Vector3] = []
	var ring_lo: Array[Vector3] = []
	for i in segs:
		var a := TAU * float(i) / float(segs) + rng.randf_range(-0.12, 0.12)
		var jh := rng.randf_range(0.76, 1.18)
		var jl := rng.randf_range(0.84, 1.18)
		ring_hi.append(c + Vector3(cos(a) * rx * 0.78 * jh, ry * rng.randf_range(0.32, 0.52), sin(a) * rz * 0.78 * jh))
		var a2 := a + PI / float(segs)
		ring_lo.append(c + Vector3(cos(a2) * rx * jl, -ry * rng.randf_range(0.18, 0.36), sin(a2) * rz * jl))
	var c_top := Color(clampf(col.r * 1.18, 0.0, 1.0), clampf(col.g * 1.16, 0.0, 1.0), clampf(col.b * 1.08, 0.0, 1.0))
	var c_mid := col
	var c_bot := col * 0.64
	for i in segs:
		var ni := (i + 1) % segs
		_add_tri(st, top, ring_hi[ni], ring_hi[i], c_top)
		_add_tri(st, ring_hi[i], ring_hi[ni], ring_lo[i], c_mid)
		_add_tri(st, ring_hi[ni], ring_lo[ni], ring_lo[i], c_mid * 0.90)
		_add_tri(st, ring_lo[i], ring_lo[ni], bot, c_bot)

static func _matte_vcol_mat(rough := 0.94, ds := false) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.albedo_color = Color.WHITE
	mat.roughness = rough
	mat.metallic = 0.0
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED if rough > 0.93 else BaseMaterial3D.SPECULAR_SCHLICK_GGX
	if ds: mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat

## Procedural CoH3 / Zero Hour realistic biome tree meshes (replaces shiny sphere-blob trees)
static var _proc_tree_cache: Dictionary = {}
static func _build_biome_tree(th: String, variant: int) -> ArrayMesh:
	var key := "%s|%d" % [th, variant]
	if _proc_tree_cache.has(key):
		return _proc_tree_cache[key] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ds := false
	if th == "desert":
		if variant == 0:
			# Middle Eastern Date Palm: curved segmented trunk + 9 arched drooping fronds
			ds = true
			var bark0 := Color(0.42, 0.33, 0.23); var bark1 := Color(0.52, 0.42, 0.30)
			var pts := [Vector3(0, 0, 0), Vector3(1.4, 9.0, 0.4), Vector3(3.4, 18.5, 1.0), Vector3(4.6, 28.0, 1.5), Vector3(4.8, 36.5, 1.6)]
			var rads := [2.3, 1.85, 1.55, 1.35, 1.15]
			for i in pts.size() - 1:
				_add_taper(st, pts[i], pts[i + 1], rads[i], rads[i + 1], 6, bark0 if i % 2 == 0 else bark1, bark1 if i % 2 == 0 else bark0)
			var crown: Vector3 = pts[pts.size() - 1]
			_add_cluster(st, crown - Vector3(0, 0.8, 0), 2.5, 2.2, 2.5, Color(0.36, 0.28, 0.18), 31)
			var frond_c0 := Color(0.34, 0.44, 0.20)
			var frond_c1 := Color(0.46, 0.54, 0.26)
			var frond_dry := Color(0.54, 0.50, 0.28)
			for fi in 10:
				var a := TAU * float(fi) / 10.0 + (0.28 if fi % 2 == 1 else 0.0)
				var dir := Vector3(cos(a), 0.0, sin(a))
				var side := Vector3(-sin(a), 0.0, cos(a))
				var lift := 4.8 if fi % 2 == 0 else 2.2
				var reach := 16.5 if fi % 2 == 0 else 14.0
				var droop := -4.8 if fi % 2 == 0 else -7.2
				var p0 := crown + Vector3(0, 0.5 if fi % 2 == 0 else -0.5, 0)
				var p1 := p0 + dir * (reach * 0.46) + Vector3(0, lift, 0)
				var p2 := p0 + dir * reach + Vector3(0, droop, 0)
				var fc := frond_dry if fi % 5 == 4 else (frond_c1 if fi % 2 == 0 else frond_c0)
				# Twin angled frond blades forming a natural V-fold palm leaf
				var w1 := 3.4
				_add_tri(st, p0, p1 + side * w1 - Vector3(0, 1.2, 0), p1, fc, true)
				_add_tri(st, p0, p1, p1 - side * w1 - Vector3(0, 1.2, 0), fc * 0.92, true)
				_add_tri(st, p1, p1 + side * w1 - Vector3(0, 1.2, 0), p2, fc * 1.06, true)
				_add_tri(st, p1, p2, p1 - side * w1 - Vector3(0, 1.2, 0), fc * 0.88, true)
		elif variant == 1:
			# Gnarled Desert Olive / Acacia tree: forked dry trunk + layered matte olive-sage crown pads
			var bark := Color(0.42, 0.35, 0.27)
			_add_taper(st, Vector3(0, 0, 0), Vector3(0.8, 12.0, 0.3), 2.3, 1.5, 6, bark * 0.85, bark)
			_add_taper(st, Vector3(0.6, 10.0, 0.2), Vector3(-6.2, 20.0, 3.2), 1.3, 0.65, 5, bark, bark * 1.06)
			_add_taper(st, Vector3(0.7, 10.5, 0.2), Vector3(7.0, 21.0, -2.6), 1.3, 0.65, 5, bark, bark * 1.06)
			_add_taper(st, Vector3(0.7, 11.2, 0.2), Vector3(0.2, 23.0, -5.8), 1.1, 0.55, 5, bark, bark * 1.06)
			_add_cluster(st, Vector3(-6.2, 22.0, 3.2), 8.2, 4.4, 7.6, Color(0.38, 0.44, 0.24), 101)
			_add_cluster(st, Vector3(7.0, 23.0, -2.6), 8.6, 4.6, 7.8, Color(0.42, 0.47, 0.26), 102)
			_add_cluster(st, Vector3(0.4, 25.5, -4.5), 7.6, 4.2, 7.2, Color(0.35, 0.41, 0.22), 103)
			_add_cluster(st, Vector3(0.2, 26.8, 1.6), 7.0, 3.8, 6.8, Color(0.45, 0.50, 0.28), 104)
		else:
			# Low Sun-Parched Desert Scrub / Tamarisk Bush Cluster (multi-stemmed organic ground cover)
			var bark := Color(0.44, 0.36, 0.26)
			_add_taper(st, Vector3(0, 0, 0), Vector3(-2.8, 7.5, 1.5), 1.3, 0.5, 5, bark * 0.85, bark)
			_add_taper(st, Vector3(0, 0, 0), Vector3(3.0, 8.2, -1.8), 1.2, 0.5, 5, bark * 0.85, bark)
			_add_cluster(st, Vector3(-3.0, 8.8, 1.8), 7.4, 5.2, 7.0, Color(0.40, 0.44, 0.23), 201)
			_add_cluster(st, Vector3(3.2, 9.6, -1.6), 7.8, 5.5, 7.4, Color(0.45, 0.48, 0.26), 202)
			_add_cluster(st, Vector3(0.0, 6.4, -3.5), 6.2, 4.2, 5.8, Color(0.36, 0.40, 0.21), 203)
	elif th == "snow":
		# Snow-dusted Alpine Spruce / Pine (tiered conical boughs + white frost caps)
		var bark := Color(0.28, 0.24, 0.22)
		var h_tot := 38.0 if variant == 0 else (31.0 if variant == 1 else 24.0)
		_add_taper(st, Vector3(0, 0, 0), Vector3(0, h_tot * 0.92, 0), 2.1, 0.4, 6, bark * 0.8, bark)
		var tiers := 4 if variant < 2 else 3
		for ti in tiers:
			var f := float(ti) / float(tiers)
			var y0 := 7.0 + f * (h_tot - 13.0)
			var rad := (11.5 - f * 6.5) * (1.05 if variant == 0 else 0.92)
			var pine_c := Color(0.18, 0.29, 0.26).lerp(Color(0.24, 0.36, 0.34), f)
			_add_taper(st, Vector3(0, y0, 0), Vector3(0, y0 + 10.5 - f * 2.0, 0), rad, 0.4, 7, pine_c * 0.82, pine_c * 1.12)
			_add_taper(st, Vector3(0, y0 + 1.8, 0), Vector3(0, y0 + 10.7 - f * 2.0, 0), rad * 0.84, 0.35, 7, Color(0.84, 0.89, 0.95), Color(0.92, 0.95, 0.99))
	else:
		# Mediterranean / Green: Tall Cypress (0), Multi-cluster Leafy Olive/Oak (1), Woodland Broadleaf (2)
		var bark := Color(0.32, 0.25, 0.18)
		if variant == 0:
			# Iconic Italian / Lebanese tall columnar Cypress
			_add_taper(st, Vector3(0, 0, 0), Vector3(0, 12.0, 0), 1.8, 1.1, 6, bark * 0.85, bark)
			_add_taper(st, Vector3(0, 7.5, 0), Vector3(0, 22.0, 0), 5.6, 4.6, 7, Color(0.18, 0.31, 0.15), Color(0.24, 0.39, 0.18))
			_add_taper(st, Vector3(0, 20.0, 0), Vector3(0, 39.0, 0), 4.8, 0.5, 7, Color(0.22, 0.37, 0.17), Color(0.29, 0.45, 0.21))
		elif variant == 1:
			# Mediterranean Oak / Olive with spreading multi-cluster crown
			_add_taper(st, Vector3(0, 0, 0), Vector3(0.5, 13.0, 0.2), 2.4, 1.5, 6, bark * 0.85, bark)
			_add_taper(st, Vector3(0.4, 11.0, 0.2), Vector3(-6.0, 21.0, 3.5), 1.2, 0.6, 5, bark, bark * 1.05)
			_add_taper(st, Vector3(0.5, 11.5, 0.2), Vector3(6.5, 22.0, -3.0), 1.2, 0.6, 5, bark, bark * 1.05)
			_add_cluster(st, Vector3(-5.8, 23.0, 3.2), 8.8, 6.2, 8.2, Color(0.24, 0.40, 0.16), 301)
			_add_cluster(st, Vector3(6.4, 24.0, -2.8), 9.2, 6.4, 8.5, Color(0.28, 0.44, 0.18), 302)
			_add_cluster(st, Vector3(0.0, 27.5, 0.5), 9.0, 6.2, 8.6, Color(0.32, 0.48, 0.20), 303)
			_add_cluster(st, Vector3(-1.0, 20.5, -5.0), 7.2, 5.2, 6.8, Color(0.21, 0.36, 0.14), 304)
		else:
			# Woodland bush / young oak
			_add_taper(st, Vector3(0, 0, 0), Vector3(0, 9.5, 0), 1.8, 1.0, 5, bark * 0.85, bark)
			_add_cluster(st, Vector3(-3.5, 13.0, 2.2), 7.4, 5.8, 7.0, Color(0.27, 0.42, 0.17), 311)
			_add_cluster(st, Vector3(4.0, 14.2, -2.0), 7.8, 6.0, 7.4, Color(0.31, 0.46, 0.19), 312)
			_add_cluster(st, Vector3(0.2, 17.5, 0.4), 6.8, 5.4, 6.6, Color(0.34, 0.49, 0.21), 313)
	var mesh := st.commit()
	mesh.surface_set_material(0, _matte_vcol_mat(0.94, ds))
	_proc_tree_cache[key] = mesh
	return mesh

static var _rock_cache: Dictionary = {}
static func _build_boulder(th: String, variant: int) -> ArrayMesh:
	var key := "%s|%d" % [th, variant]
	if _rock_cache.has(key):
		return _rock_cache[key] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var c_rock := Color(0.57, 0.46, 0.35)
	if th == "snow": c_rock = Color(0.45, 0.48, 0.54)
	elif th == "green": c_rock = Color(0.48, 0.47, 0.43)
	if variant == 0:
		_add_cluster(st, Vector3(0, 2.2, 0), 6.5, 3.8, 5.4, c_rock, 501)
		_add_cluster(st, Vector3(4.6, 1.2, 2.4), 3.6, 2.2, 3.2, c_rock * 0.88, 502)
	else:
		_add_cluster(st, Vector3(0, 1.5, 0), 4.2, 2.4, 3.6, c_rock * 0.94, 505)
	var mesh := st.commit()
	mesh.surface_set_material(0, _matte_vcol_mat(0.95, false))
	_rock_cache[key] = mesh
	return mesh

static var _scrub_cache: Dictionary = {}
static func _build_scrub(th: String) -> ArrayMesh:
	if _scrub_cache.has(th):
		return _scrub_cache[th] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var c_base := Color(0.46, 0.42, 0.25)
	var c_tip := Color(0.62, 0.56, 0.34)
	if th == "green":
		c_base = Color(0.24, 0.36, 0.16)
		c_tip = Color(0.38, 0.50, 0.24)
	elif th == "snow":
		c_base = Color(0.34, 0.36, 0.32)
		c_tip = Color(0.76, 0.80, 0.85)
	# Crossed dry grass / desert scrub blades radiating from a compact clump
	for bi in 6:
		var a := float(bi) * TAU / 6.0 + 0.21 * float(bi % 2)
		var ca := cos(a); var sa := sin(a)
		var px := -sa; var pz := ca
		var lean := 2.4 + float(bi % 3) * 0.8
		var h := 2.2 + float((bi + 1) % 3) * 0.9
		var w := 1.05
		var p0 := Vector3(px * w, 0.0, pz * w)
		var p1 := Vector3(-px * w, 0.0, -pz * w)
		var tip := Vector3(ca * lean, h, sa * lean)
		_add_tri(st, p0, p1, tip, c_base.lerp(c_tip, 0.55 + 0.12 * float(bi % 3)), true)
	var mesh := st.commit()
	mesh.surface_set_material(0, _matte_vcol_mat(0.96, true))
	_scrub_cache[th] = mesh
	return mesh

## Scattered desert/mountain boulders & dry scrub tufts across open ground for CoH3 battlefield grounding
static func _env_props(host: Node3D, map: Dictionary) -> void:
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	var grid := PackedByteArray(map.get("grid", []))
	if grid.size() < GW * GH or GW <= 0 or GH <= 0:
		return
	var road: Dictionary = map.get("road", {})
	var rC := float(road.get("C", 16.0)); var rw := int(road.get("w", 0)); var rd := PackedByteArray(road.get("d", []))
	var rh := (rd.size() / rw) if rw > 0 else 0
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
	var rng := RandomNumberGenerator.new(); rng.seed = 73
	var rocks0: Array[Transform3D] = []
	var rocks1: Array[Transform3D] = []
	var scrubs: Array[Transform3D] = []
	var max_rocks := 340
	for _attempt in 1400:
		if rocks0.size() + rocks1.size() >= max_rocks: break
		var x := rng.randf_range(CELL * 2.0, float(GW - 2) * CELL)
		var z := rng.randf_range(CELL * 2.0, float(GH - 2) * CELL)
		var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
		var gc := int(grid[gz * GW + gx])
		if gc == 1 or gc == 2: continue
		if rw > 0 and rh > 0:
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: continue
		# Prefer hillsides, mountain skirts, and map margins (keep flat bases uncluttered)
		var h0 := height_at(map, x, z)
		var slope_est := absf(height_at(map, x + 20.0, z) - h0) + absf(height_at(map, x, z + 20.0) - h0)
		if gc != 3 and slope_est < 2.2 and rng.randf() > 0.14:
			continue
		var s := rng.randf_range(0.65, 1.55) if gc == 3 or slope_est > 4.0 else rng.randf_range(0.45, 0.95)
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s * rng.randf_range(0.75, 1.15), s))
		var xf := Transform3D(b, Vector3(x, h0 - 0.8, z))
		if rng.randi() % 2 == 0: rocks0.append(xf)
		else: rocks1.append(xf)
	# Scatter dry desert scrub / grass tufts across open ground in small natural clusters
	for _attempt in 620:
		if scrubs.size() >= 480: break
		var x := rng.randf_range(CELL * 1.5, float(GW - 1.5) * CELL)
		var z := rng.randf_range(CELL * 1.5, float(GH - 1.5) * CELL)
		var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
		var gc := int(grid[gz * GW + gx])
		if gc == 1 or gc == 2 or gc == 3: continue
		if rw > 0 and rh > 0:
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: continue
		var clump_n := rng.randi_range(1, 3)
		for ci in clump_n:
			if scrubs.size() >= 480: break
			var sx := x + rng.randf_range(-16.0, 16.0)
			var sz := z + rng.randf_range(-16.0, 16.0)
			var sc := rng.randf_range(0.95, 1.85)
			var bs := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(sc, sc * rng.randf_range(0.8, 1.25), sc))
			scrubs.append(Transform3D(bs, Vector3(sx, height_at(map, sx, sz) - 0.25, sz)))
	for vi in 2:
		var arr: Array[Transform3D] = rocks0 if vi == 0 else rocks1
		if arr.is_empty(): continue
		var m := MultiMeshInstance3D.new()
		m.name = "Rocks_%d" % vi
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = _build_boulder(th, vi)
		mm.instance_count = arr.size()
		for i in arr.size(): mm.set_instance_transform(i, arr[i])
		m.multimesh = mm
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		host.add_child(m)
	if not scrubs.is_empty():
		var sm := MultiMeshInstance3D.new()
		sm.name = "ScrubTufts"
		var smm := MultiMesh.new()
		smm.transform_format = MultiMesh.TRANSFORM_3D
		smm.mesh = _build_scrub(th)
		smm.instance_count = scrubs.size()
		for i in scrubs.size(): smm.set_instance_transform(i, scrubs[i])
		sm.multimesh = smm
		sm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		host.add_child(sm)

## woods: exact JS tree placement from map.trees ([x, y, scale], capped at MAX_TREES) when present,
## falling back to density scatter over map.wood (--gdsim) otherwise; realistic procedural biome trees in 3 MultiMeshes.
static func _trees(host: Node3D, sim, map: Dictionary, _tree_mesh: Callable) -> void:
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
			var s := clampf(js_s, 0.65, 1.55) * rng.randf_range(0.90, 1.12)
			var sy := s * rng.randf_range(0.90, 1.15)
			var yaw := rng.randf() * TAU
			var lean_x := rng.randf_range(-0.06, 0.06)
			var lean_z := rng.randf_range(-0.06, 0.06)
			var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, lean_x) * Basis(Vector3.FORWARD, lean_z)
			per[rng.randi() % 3].append(Transform3D(b.scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 0.8, z)))
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
				var s := rng.randf_range(0.82, 1.32)
				var sy := s * rng.randf_range(0.90, 1.15)
				var yaw := rng.randf() * TAU
				var lean_x := rng.randf_range(-0.06, 0.06)
				var lean_z := rng.randf_range(-0.06, 0.06)
				var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, lean_x) * Basis(Vector3.FORWARD, lean_z)
				per[rng.randi() % 3].append(Transform3D(b.scaled(Vector3(s, sy, s)), Vector3(x, height_at(map, x, z) - 0.8, z)))
				placed += 1

	for t in 3:
		if (per[t] as Array).is_empty(): continue
		var mesh: ArrayMesh = _build_biome_tree(th, t)
		var m := MultiMeshInstance3D.new()
		m.name = "Trees_%d" % (t + 1)
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = per[t].size()
		for i in per[t].size():
			mm.set_instance_transform(i, per[t][i])
		m.multimesh = mm
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		host.add_child(m)
