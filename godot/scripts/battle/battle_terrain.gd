## Battle mode ground (orch/godot-battle): the battle map's real height field, cliffs, roads and woods, built once.
## One terrain mesh (heights from the map's hgrid, colours baked into vertex colours over the shared ground texture),
## trees as one MultiMesh per tree model. Positions = the sim's design units (same as the browser game).
extends RefCounted

const MAX_VERTS_DESKTOP := 68000.0    # crisp cliffs, hills & wadis at locked 60 FPS on WebGL2
const MAX_VERTS_MOBILE := 42000.0     # lightweight terrain density on mobile WebGL2
const MAX_TREES := 2200      # dense forests while keeping WebGL2 shadow pass blazingly fast
const UI_KIT = preload("res://scripts/ui/ui_kit.gd")

## ground height at a map point, straight from the bridge's height field (bilinear, same as the JS groundH)
static func height_at(map: Dictionary, x: float, z: float) -> float:
	var H: Dictionary = map.hgrid
	var R := float(H.R); var w := int(H.w); var h := int(H.h)
	var fx := clampf(x / R, 0.0, w - 1.001); var fz := clampf(z / R, 0.0, h - 1.001)
	var i := int(fx); var j := int(fz); var u := fx - i; var v := fz - j
	var k := j * w + i
	var a = H.a
	return lerpf(lerpf(a[k], a[k + 1], u), lerpf(a[k + w], a[k + w + 1], u), v)

static func normal_at(map: Dictionary, x: float, z: float) -> Vector3:
	return Vector3(height_at(map, x - 8.0, z) - height_at(map, x + 8.0, z), 16.0, height_at(map, x, z - 8.0) - height_at(map, x, z + 8.0)).normalized()

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
	var max_verts := MAX_VERTS_MOBILE if UI_KIT.is_mobile() else MAX_VERTS_DESKTOP
	var STEP := maxi(2, ceili(sqrt(hw * hh / max_verts)))
	# multi-tone biome palettes: natural CoH3 / Broken Arrow realism (never neon orange or plastic green)
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
	var theme_id := 2 if th == "snow" else (0 if th == "desert" else 1)
	var c_lo := Color(0.80, 0.73, 0.60)
	var c_mid := Color(0.74, 0.66, 0.53)
	var c_hi := Color(0.67, 0.59, 0.47)
	var c_mtn := Color(0.55, 0.47, 0.38)
	if th == "snow":
		c_lo = Color(0.88, 0.89, 0.91)
		c_mid = Color(0.82, 0.84, 0.87)
		c_hi = Color(0.76, 0.78, 0.82)
		c_mtn = Color(0.44, 0.46, 0.49)
	elif th != "desert":
		c_lo = Color(0.45, 0.53, 0.33)
		c_mid = Color(0.40, 0.48, 0.29)
		c_hi = Color(0.36, 0.44, 0.27)
		c_mtn = Color(0.50, 0.49, 0.45)
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
			# elevation + biome tinting + gentle macro variation + baked valley concavity AO in alpha!
			var hk := clampf(y / hmax, 0.0, 1.0)
			var c: Color = c_lo.lerp(c_mid, hk * 2.0) if hk < 0.5 else c_mid.lerp(c_hi, (hk - 0.5) * 2.0)
			var macro := sin(x * 0.0029 + z * 0.0016) * cos(z * 0.0025 - x * 0.0012) * 0.036
			var h_avg: float = (hat.call(hi - STEP * 2, hj) + hat.call(hi + STEP * 2, hj) + hat.call(hi, hj - STEP * 2) + hat.call(hi, hj + STEP * 2)) * 0.25
			var cav := clampf(1.0 + (y - h_avg) * 0.0045, 0.80, 1.08)
			c = Color(clampf(c.r + macro, 0.0, 1.0), clampf(c.g + macro * 0.9, 0.0, 1.0), clampf(c.b + macro * 0.7, 0.0, 1.0), cav)
			var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
			var gcell := int(grid[gz * GW + gx])
			if gcell == 3:
				c = Color(c.r * 0.5 + c_mtn.r * 0.5, c.g * 0.5 + c_mtn.g * 0.5, c.b * 0.5 + c_mtn.b * 0.5, cav)
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
	# Build 2-pass smoothed L8 masks for silky anti-aliased roads (no stair-step jagged edges!) and damp riverbanks
	var rbuf := PackedByteArray()
	if rw > 0 and rh > 0 and rd.size() >= rw * rh:
		rbuf.resize(rw * rh)
		for ri in rw * rh:
			rbuf[ri] = 255 if int(rd[ri]) != 0 else 0
	var road_tex := _blur_l8(rbuf, rw, rh, 2)
	var sbuf := PackedByteArray()
	if GW > 0 and GH > 0 and grid.size() >= GW * GH:
		sbuf.resize(GW * GH)
		for gi in GW * GH:
			var gcell := int(grid[gi])
			sbuf[gi] = 255 if gcell == 1 else (160 if gcell == 2 else 0)
	var shore_tex := _blur_l8(sbuf, GW, GH, 2)
	var g := MeshInstance3D.new()
	g.name = "TerrainMesh"
	g.mesh = mesh
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/terrain_pbr.gdshader")
	var alb_p := "res://tex/%s_alb.png" % th
	var nrm_p := "res://tex/%s_nrm.png" % th
	mat.set_shader_parameter("biome_alb", load(alb_p) if ResourceLoader.exists(alb_p) else load("res://tex/a1.png"))
	mat.set_shader_parameter("biome_nrm", load(nrm_p) if ResourceLoader.exists(nrm_p) else load("res://tex/n1.png"))
	mat.set_shader_parameter("rock_alb", load("res://tex/rock_alb.png") if ResourceLoader.exists("res://tex/rock_alb.png") else load("res://tex/a1.png"))
	mat.set_shader_parameter("rock_nrm", load("res://tex/rock_nrm.png") if ResourceLoader.exists("res://tex/rock_nrm.png") else load("res://tex/n1.png"))
	mat.set_shader_parameter("road_alb", load("res://tex/road_alb.png") if ResourceLoader.exists("res://tex/road_alb.png") else load("res://tex/a1.png"))
	mat.set_shader_parameter("road_nrm", load("res://tex/road_nrm.png") if ResourceLoader.exists("res://tex/road_nrm.png") else load("res://tex/n1.png"))
	mat.set_shader_parameter("road_tex", road_tex)
	mat.set_shader_parameter("shore_tex", shore_tex)
	mat.set_shader_parameter("map_size", Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("road_size", Vector2(float(rw) * rC, float(rh) * rC) if (rw > 0 and rh > 0) else Vector2(float(GW) * CELL, float(GH) * CELL))
	mat.set_shader_parameter("theme_id", theme_id)
	mat.set_shader_parameter("nrm_strength", 0.24 if th == "snow" else 0.76)
	mat.set_shader_parameter("wetness", 0.0)
	g.material_override = mat
	# Terrain receives all unit/building/tree shadows; disabling terrain self-shadow casting saves 200k+ shadow verts/frame on WebGL2!
	g.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(g)
	# Textured distant terrain expanse + 360° sculpted mountain horizon ring so low-angle upward camera looks cinematic!
	var pm := PlaneMesh.new()
	pm.size = Vector2(float(map.MAPW) + 12000.0, float(map.MAPH) + 12000.0)
	var sk := MeshInstance3D.new()
	sk.mesh = pm
	sk.position = Vector3(float(map.MAPW) * 0.5, hmin - 28.0, float(map.MAPH) * 0.5)
	var sm := StandardMaterial3D.new()
	sm.albedo_color = c_mid * 0.82
	if ResourceLoader.exists(alb_p):
		sm.albedo_texture = load(alb_p)
		sm.uv1_scale = Vector3(28.0, 28.0, 1.0)
	sm.roughness = 0.96
	sk.material_override = sm
	sk.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	host.add_child(sk)
	_horizon_mountains(host, map, hmin, c_mtn, c_hi, th)
	_water(host, sim, map)
	_bridges(host, map)
	if tree_mesh.is_valid(): _trees(host, sim, map, tree_mesh)
	_env_props(host, map)

## Multi-pass separable [1, 2, 1] / 4 Gaussian blur producing a silky L8 ImageTexture for anti-aliased roads & shores
static func _horizon_mountains(host: Node3D, map: Dictionary, hmin: float, c_mtn: Color, c_hi: Color, th: String) -> void:
	var cx := float(map.MAPW) * 0.5
	var cz := float(map.MAPH) * 0.5
	var rx0 := float(map.MAPW) * 0.64 + 850.0
	var rz0 := float(map.MAPH) * 0.64 + 850.0
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segs := 144
	var base_y := hmin - 32.0
	var peak_col := Color(0.82, 0.86, 0.92) if th == "snow" else c_hi.lerp(c_mtn, 0.65)
	var foot_col := c_mtn * 0.70
	var inner_pts: Array = []
	var ridge_pts: Array = []
	var outer_pts: Array = []
	for i in segs + 1:
		var a := float(i) / float(segs) * TAU
		var ca := cos(a); var sa := sin(a)
		var n1 := absf(sin(a * 7.0 + 0.4)) * 0.48 + absf(cos(a * 17.0 - 1.1)) * 0.30 + absf(sin(a * 31.0 + 2.3)) * 0.22
		var pk_h := 38.0 + n1 * 135.0
		inner_pts.append(Vector3(cx + ca * (rx0 - 360.0), base_y, cz + sa * (rz0 - 360.0)))
		ridge_pts.append(Vector3(cx + ca * rx0, base_y + pk_h, cz + sa * rz0))
		outer_pts.append(Vector3(cx + ca * (rx0 + 620.0), base_y - 18.0, cz + sa * (rz0 + 620.0)))
	for i in segs:
		var i0: Vector3 = inner_pts[i]; var i1: Vector3 = inner_pts[i + 1]
		var r0: Vector3 = ridge_pts[i]; var r1: Vector3 = ridge_pts[i + 1]
		var o0: Vector3 = outer_pts[i]; var o1: Vector3 = outer_pts[i + 1]
		st.set_color(foot_col); st.set_uv(Vector2(float(i) * 0.5, 0.0)); st.add_vertex(i0)
		st.set_color(peak_col); st.set_uv(Vector2(float(i) * 0.5, 1.0)); st.add_vertex(r0)
		st.set_color(foot_col); st.set_uv(Vector2(float(i + 1) * 0.5, 0.0)); st.add_vertex(i1)
		st.set_color(foot_col); st.set_uv(Vector2(float(i + 1) * 0.5, 0.0)); st.add_vertex(i1)
		st.set_color(peak_col); st.set_uv(Vector2(float(i) * 0.5, 1.0)); st.add_vertex(r0)
		st.set_color(peak_col); st.set_uv(Vector2(float(i + 1) * 0.5, 1.0)); st.add_vertex(r1)
		st.set_color(peak_col); st.set_uv(Vector2(float(i) * 0.5, 1.0)); st.add_vertex(r0)
		st.set_color(foot_col); st.set_uv(Vector2(float(i) * 0.5, 0.0)); st.add_vertex(o0)
		st.set_color(peak_col); st.set_uv(Vector2(float(i + 1) * 0.5, 1.0)); st.add_vertex(r1)
		st.set_color(peak_col); st.set_uv(Vector2(float(i + 1) * 0.5, 1.0)); st.add_vertex(r1)
		st.set_color(foot_col); st.set_uv(Vector2(float(i) * 0.5, 0.0)); st.add_vertex(o0)
		st.set_color(foot_col); st.set_uv(Vector2(float(i + 1) * 0.5, 0.0)); st.add_vertex(o1)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = "HorizonMountains"
	mi.mesh = st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	if ResourceLoader.exists("res://tex/rock_alb.png"):
		mat.albedo_texture = load("res://tex/rock_alb.png")
		mat.uv1_scale = Vector3(4.0, 2.0, 1.0)
	mat.roughness = 0.96
	mat.metallic = 0.0
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.extra_cull_margin = 16384.0
	host.add_child(mi)

static func _blur_l8(src: PackedByteArray, w: int, h: int, passes: int = 1) -> ImageTexture:
	if w <= 0 or h <= 0 or src.size() < w * h:
		var empty_img := Image.create_from_data(1, 1, false, Image.FORMAT_L8, PackedByteArray([0]))
		return ImageTexture.create_from_image(empty_img)
	var cur := src.duplicate()
	var tmp := PackedByteArray()
	tmp.resize(w * h)
	var out := PackedByteArray()
	out.resize(w * h)
	for _p in maxi(1, passes):
		for y in h:
			var row := y * w
			for x in w:
				var xm := x - 1 if x > 0 else 0
				var xp := x + 1 if x + 1 < w else w - 1
				tmp[row + x] = (int(cur[row + xm]) + (int(cur[row + x]) << 1) + int(cur[row + xp]) + 2) >> 2
		for y in h:
			var ym := (y - 1 if y > 0 else 0) * w
			var y0 := y * w
			var yp := (y + 1 if y + 1 < h else h - 1) * w
			for x in w:
				out[y0 + x] = (int(tmp[ym + x]) + (int(tmp[y0 + x]) << 1) + int(tmp[yp + x]) + 2) >> 2
		cur = out.duplicate()
	var img := Image.create_from_data(w, h, false, Image.FORMAT_L8, out)
	return ImageTexture.create_from_image(img)

## water cells (grid 1 = water, 2 = ford / shallows): clean non-overlapping continuous quads at `level` with smooth shoreline alpha
static func _water(host: Node3D, sim, map: Dictionary) -> void:
	var grid := PackedByteArray(map.grid)
	var GW := int(map.GW); var GH := int(map.GH); var CELL := float(map.CELL)
	if GW <= 0 or GH <= 0 or grid.size() < GW * GH: return
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := 0
	# Single clean water plane level: slightly below adjacent land banks (fallback to water bed if no banks)
	var bank := 0.0; var nb := 0
	var wsum := 0.0; var nw := 0
	for i in grid.size():
		var gi := int(grid[i])
		if gi != 1: continue
		wsum += height_at(map, (i % GW) * CELL + CELL * 0.5, (i / GW) * CELL + CELL * 0.5); nw += 1
		var cx := i % GW; var cz := i / GW
		for d: Vector2i in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
			var nx_c: int = cx + d.x; var nz_c: int = cz + d.y
			if nx_c >= 0 and nx_c < GW and nz_c >= 0 and nz_c < GH and int(grid[nz_c * GW + nx_c]) == 0:
				bank += height_at(map, nx_c * CELL + CELL * 0.5, nz_c * CELL + CELL * 0.5); nb += 1
	var level := (bank / float(nb) - 4.0) if nb > 0 else (wsum / maxf(1.0, float(nw)) + 2.0)
	# Corner depth alpha helper: smoothly blends 1.0 (deep interior) -> 0.45 (ford) -> 0.0 (land shoreline) with zero quad overlap!
	var corner_alpha := func(vx: int, vz: int) -> float:
		var acc := 0.0
		var cnt := 0
		for dz: int in [-1, 0]:
			for dx: int in [-1, 0]:
				var gx: int = vx + dx; var gz: int = vz + dz
				if gx < 0 or gx >= GW or gz < 0 or gz >= GH: continue
				var cg := int(grid[gz * GW + gx])
				acc += 1.0 if cg == 1 else (0.45 if cg == 2 else 0.0)
				cnt += 1
		return acc / maxf(1.0, float(cnt))
	for cz in GH:
		for cx in GW:
			var g := int(grid[cz * GW + cx])
			if g != 1 and g != 2: continue
			var x0 := float(cx) * CELL; var x1 := float(cx + 1) * CELL
			var z0 := float(cz) * CELL; var z1 := float(cz + 1) * CELL
			var a00: float = corner_alpha.call(cx, cz)
			var a10: float = corner_alpha.call(cx + 1, cz)
			var a01: float = corner_alpha.call(cx, cz + 1)
			var a11: float = corner_alpha.call(cx + 1, cz + 1)
			var c00 := Color(0.08, 0.22, 0.30, a00)
			var c10 := Color(0.08, 0.22, 0.30, a10)
			var c01 := Color(0.08, 0.22, 0.30, a01)
			var c11 := Color(0.08, 0.22, 0.30, a11)
			var p00 := Vector3(x0, level, z0)
			var p10 := Vector3(x1, level, z0)
			var p01 := Vector3(x0, level, z1)
			var p11 := Vector3(x1, level, z1)
			st.set_color(c00); st.set_normal(Vector3.UP); st.add_vertex(p00)
			st.set_color(c10); st.set_normal(Vector3.UP); st.add_vertex(p10)
			st.set_color(c01); st.set_normal(Vector3.UP); st.add_vertex(p01)
			st.set_color(c10); st.set_normal(Vector3.UP); st.add_vertex(p10)
			st.set_color(c11); st.set_normal(Vector3.UP); st.add_vertex(p11)
			st.set_color(c01); st.set_normal(Vector3.UP); st.add_vertex(p01)
			n += 1
	if n == 0: return
	var th_raw := str(map.get("theme", "desert"))
	var th := th_raw if th_raw in ["desert", "green", "snow"] else "desert"
	var w := MeshInstance3D.new()
	w.name = "WaterMesh"
	w.mesh = st.commit()
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/water_pbr.gdshader")
	var sky_hor := Color(0.88, 0.84, 0.76)
	var sky_zen := Color(0.12, 0.36, 0.80)
	if th == "snow":
		sky_hor = Color(0.78, 0.85, 0.94)
		sky_zen = Color(0.20, 0.36, 0.68)
	elif th == "green":
		sky_hor = Color(0.78, 0.84, 0.88)
		sky_zen = Color(0.14, 0.38, 0.78)
	m.set_shader_parameter("sky_horizon", sky_hor)
	m.set_shader_parameter("sky_zenith", sky_zen)
	m.set_shader_parameter("sun_color", Color(1.0, 0.94, 0.84))
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

	var mat := _prop_pbr_mat(0.80, 0.12, "res://tex/rock_nrm.png", 0.28, 16.0)

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

static var _prop_pbr_cache: Dictionary = {}
static func _prop_pbr_mat(rough := 0.86, metal := 0.06, nrm_path := "res://tex/rock_nrm.png", dust := 0.75, model_h := 12.0) -> ShaderMaterial:
	var key := "%.2f|%.2f|%s|%.2f|%.1f" % [rough, metal, nrm_path, dust, model_h]
	if _prop_pbr_cache.has(key):
		return _prop_pbr_cache[key] as ShaderMaterial
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/military_pbr.gdshader")
	sm.set_shader_parameter("albedo_col", Color.WHITE)
	sm.set_shader_parameter("has_albedo_tex", false)
	sm.set_shader_parameter("use_vertex_color", true)
	sm.set_shader_parameter("has_src_nrm", false)
	var nrm_res: Resource = load(nrm_path) if ResourceLoader.exists(nrm_path) else load("res://tex/n1.png")
	sm.set_shader_parameter("detail_nrm", nrm_res)
	sm.set_shader_parameter("base_roughness", rough)
	sm.set_shader_parameter("base_metallic", metal)
	sm.set_shader_parameter("mat_mode", 1)
	sm.set_shader_parameter("dust_enable", dust)
	sm.set_shader_parameter("model_h", model_h)
	_prop_pbr_cache[key] = sm
	return sm

static var _foliage_mat: ShaderMaterial = null
static func _get_foliage_mat() -> ShaderMaterial:
	if _foliage_mat != null: return _foliage_mat
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/foliage_sway.gdshader")
	_foliage_mat = sm
	return sm

## Procedural $75 AAA CoH3 / Zero Hour Enhanced realistic biome tree meshes with organic multi-cluster foliage & wind sway
static var _proc_tree_cache: Dictionary = {}
static func _build_biome_tree(th: String, variant: int) -> ArrayMesh:
	var key := "%s|%d" % [th, variant]
	if _proc_tree_cache.has(key):
		return _proc_tree_cache[key] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	if th == "desert":
		if variant == 0:
			# Middle Eastern Date Palm: gracefully curved ringed trunk + lush 14-frond arching palm crown
			var bark0 := Color(0.36, 0.28, 0.19); var bark1 := Color(0.46, 0.37, 0.26)
			var pts := [Vector3(0, 0, 0), Vector3(1.6, 8.5, 0.5), Vector3(3.8, 17.5, 1.2), Vector3(5.2, 27.0, 1.8), Vector3(5.4, 36.5, 2.0)]
			var rads := [2.4, 1.9, 1.6, 1.38, 1.2]
			for i in pts.size() - 1:
				_add_taper(st, pts[i], pts[i + 1], rads[i], rads[i + 1], 6, bark0 if i % 2 == 0 else bark1, bark1 if i % 2 == 0 else bark0)
			var crown: Vector3 = pts[pts.size() - 1]
			_add_cluster(st, crown - Vector3(0, 1.0, 0), 3.0, 2.6, 3.0, Color(0.32, 0.24, 0.15), 31)
			var frond_c0 := Color(0.28, 0.39, 0.17)
			var frond_c1 := Color(0.40, 0.49, 0.22)
			var frond_dry := Color(0.50, 0.45, 0.24)
			for fi in 14:
				var ring := fi % 2
				var a := TAU * float(fi) / 14.0 + (0.22 if ring == 1 else 0.0)
				var dir := Vector3(cos(a), 0.0, sin(a))
				var side := Vector3(-sin(a), 0.0, cos(a))
				var lift := 5.8 if ring == 0 else 2.0
				var reach := 18.0 if ring == 0 else 15.5
				var droop := -4.2 if ring == 0 else -8.2
				var p0 := crown + Vector3(0, 0.8 if ring == 0 else -0.6, 0)
				var p1 := p0 + dir * (reach * 0.48) + Vector3(0, lift, 0)
				var p2 := p0 + dir * reach + Vector3(0, droop, 0)
				var fc := frond_dry if fi % 5 == 4 else (frond_c1 if ring == 0 else frond_c0)
				var w1 := 3.8 if ring == 0 else 3.3
				_add_tri(st, p0, p1 + side * w1 - Vector3(0, 1.3, 0), p1, fc, true)
				_add_tri(st, p0, p1, p1 - side * w1 - Vector3(0, 1.3, 0), fc * 0.90, true)
				_add_tri(st, p1, p1 + side * w1 - Vector3(0, 1.3, 0), p2, fc * 1.06, true)
				_add_tri(st, p1, p2, p1 - side * w1 - Vector3(0, 1.3, 0), fc * 0.86, true)
		elif variant == 1:
			# Gnarled Desert Olive / Acacia: forked dry trunk + dense layered olive-sage canopy pads
			var bark := Color(0.38, 0.31, 0.23)
			_add_taper(st, Vector3(0, 0, 0), Vector3(0.8, 12.0, 0.3), 2.5, 1.6, 6, bark * 0.82, bark)
			_add_taper(st, Vector3(0.6, 10.0, 0.2), Vector3(-6.8, 20.5, 3.5), 1.4, 0.7, 5, bark, bark * 1.06)
			_add_taper(st, Vector3(0.7, 10.5, 0.2), Vector3(7.4, 21.5, -2.8), 1.4, 0.7, 5, bark, bark * 1.06)
			_add_taper(st, Vector3(0.7, 11.2, 0.2), Vector3(0.2, 23.5, -6.2), 1.2, 0.6, 5, bark, bark * 1.06)
			_add_cluster(st, Vector3(-6.8, 22.5, 3.5), 9.4, 4.8, 8.6, Color(0.32, 0.39, 0.20), 101)
			_add_cluster(st, Vector3(7.4, 23.5, -2.8), 9.8, 5.0, 8.8, Color(0.37, 0.43, 0.22), 102)
			_add_cluster(st, Vector3(0.4, 26.0, -5.0), 8.6, 4.6, 8.0, Color(0.30, 0.36, 0.18), 103)
			_add_cluster(st, Vector3(0.2, 27.6, 1.8), 8.2, 4.4, 7.8, Color(0.41, 0.46, 0.25), 104)
			_add_cluster(st, Vector3(-2.5, 19.8, -1.5), 6.8, 3.8, 6.4, Color(0.26, 0.32, 0.16), 105)
		else:
			# Low Sun-Parched Desert Tamarisk / Scrub Thicket
			var bark := Color(0.40, 0.33, 0.24)
			_add_taper(st, Vector3(0, 0, 0), Vector3(-3.0, 7.8, 1.6), 1.4, 0.55, 5, bark * 0.85, bark)
			_add_taper(st, Vector3(0, 0, 0), Vector3(3.2, 8.5, -1.8), 1.3, 0.55, 5, bark * 0.85, bark)
			_add_cluster(st, Vector3(-3.2, 9.2, 1.8), 8.2, 5.6, 7.6, Color(0.35, 0.40, 0.20), 201)
			_add_cluster(st, Vector3(3.5, 10.0, -1.8), 8.6, 5.8, 8.0, Color(0.40, 0.44, 0.22), 202)
			_add_cluster(st, Vector3(0.0, 6.8, -3.8), 6.8, 4.5, 6.4, Color(0.30, 0.35, 0.18), 203)
			_add_cluster(st, Vector3(0.4, 12.2, 0.2), 5.8, 4.0, 5.6, Color(0.44, 0.47, 0.25), 204)
	elif th == "snow":
		# Lush Snow-Laden Alpine Spruce / Fir (wide irregular drooping bough tiers + sculpted snowdrifts — no thin toothpicks!)
		var bark := Color(0.24, 0.20, 0.18)
		var h_tot := 40.0 if variant == 0 else (33.0 if variant == 1 else 26.0)
		_add_taper(st, Vector3(0, 0, 0), Vector3(0, h_tot * 0.90, 0), 2.4, 0.45, 6, bark * 0.8, bark)
		var tiers := 4 if variant < 2 else 3
		for ti in tiers:
			var f := float(ti) / float(tiers)
			var y0 := 6.5 + f * (h_tot - 13.5)
			var rad := (14.5 - f * 7.8) * (1.08 if variant == 0 else 0.94)
			var pine_c := Color(0.13, 0.23, 0.20).lerp(Color(0.20, 0.31, 0.28), f)
			# Dark evergreen lower bough cluster + snow-laden top bough cluster (organic faceted silhouette!)
			_add_cluster(st, Vector3(0, y0 + 2.8, 0), rad, 5.0 - f * 1.1, rad * 0.96, pine_c, 400 + variant * 17 + ti * 3)
			_add_cluster(st, Vector3(0.4, y0 + 4.9, -0.3), rad * 0.82, 3.2 - f * 0.6, rad * 0.80, Color(0.84, 0.89, 0.95), 450 + variant * 17 + ti * 3)
		_add_cluster(st, Vector3(0, h_tot - 2.0, 0), 4.6, 5.2, 4.6, Color(0.86, 0.91, 0.97), 499 + variant)
	else:
		# Mediterranean / Levant Green: Organic Multi-Cluster Cypress (0), Broad Lush Oak/Olive (1), Dense Woodland Copse (2)
		var bark := Color(0.28, 0.22, 0.16)
		if variant == 0:
			# Authentic organic columnar Mediterranean Cypress (5 stacked sculpted foliage clusters — NO upside-down ice-cream cone!)
			_add_taper(st, Vector3(0, 0, 0), Vector3(0, 14.0, 0), 2.0, 1.1, 6, bark * 0.82, bark)
			_add_cluster(st, Vector3(0.0, 12.0, 0.0), 6.2, 6.5, 6.0, Color(0.14, 0.26, 0.12), 251)
			_add_cluster(st, Vector3(0.5, 19.0, -0.4), 5.6, 6.8, 5.4, Color(0.17, 0.30, 0.14), 252)
			_add_cluster(st, Vector3(-0.4, 25.5, 0.3), 4.7, 6.2, 4.6, Color(0.20, 0.34, 0.15), 253)
			_add_cluster(st, Vector3(0.2, 31.5, -0.2), 3.6, 5.5, 3.5, Color(0.23, 0.38, 0.17), 254)
			_add_cluster(st, Vector3(0.0, 36.8, 0.0), 2.3, 4.4, 2.3, Color(0.27, 0.42, 0.19), 255)
		elif variant == 1:
			# Broad Mediterranean Oak / Olive with rich 6-cluster overlapping canopy
			_add_taper(st, Vector3(0, 0, 0), Vector3(0.5, 13.5, 0.2), 2.7, 1.6, 6, bark * 0.82, bark)
			_add_taper(st, Vector3(0.4, 11.0, 0.2), Vector3(-6.8, 21.5, 3.8), 1.3, 0.65, 5, bark, bark * 1.05)
			_add_taper(st, Vector3(0.5, 11.5, 0.2), Vector3(7.2, 22.5, -3.2), 1.3, 0.65, 5, bark, bark * 1.05)
			_add_taper(st, Vector3(0.3, 12.0, 0.1), Vector3(-1.5, 22.0, -6.2), 1.1, 0.55, 5, bark, bark * 1.05)
			_add_cluster(st, Vector3(-6.8, 23.5, 3.8), 10.2, 6.8, 9.6, Color(0.18, 0.33, 0.13), 301)
			_add_cluster(st, Vector3(7.2, 24.5, -3.2), 10.6, 7.0, 9.8, Color(0.22, 0.37, 0.15), 302)
			_add_cluster(st, Vector3(0.0, 28.8, 0.6), 10.4, 6.8, 9.8, Color(0.27, 0.42, 0.17), 303)
			_add_cluster(st, Vector3(-1.5, 21.5, -6.0), 8.6, 5.8, 8.2, Color(0.15, 0.29, 0.11), 304)
			_add_cluster(st, Vector3(3.4, 20.8, 5.6), 7.8, 5.2, 7.6, Color(0.20, 0.35, 0.14), 305)
		else:
			# Dense Woodland Broadleaf / Hedge Copse
			_add_taper(st, Vector3(0, 0, 0), Vector3(0, 10.0, 0), 2.0, 1.1, 5, bark * 0.85, bark)
			_add_cluster(st, Vector3(-4.2, 13.8, 2.6), 8.6, 6.2, 8.2, Color(0.21, 0.36, 0.14), 311)
			_add_cluster(st, Vector3(4.6, 15.0, -2.4), 9.0, 6.6, 8.6, Color(0.25, 0.40, 0.16), 312)
			_add_cluster(st, Vector3(0.2, 18.8, 0.4), 7.8, 5.8, 7.6, Color(0.29, 0.44, 0.18), 313)
			_add_cluster(st, Vector3(-1.2, 11.2, -4.6), 6.8, 4.8, 6.4, Color(0.16, 0.30, 0.11), 314)
	var mesh := st.commit()
	mesh.surface_set_material(0, _get_foliage_mat())
	_proc_tree_cache[key] = mesh
	return mesh

static var _rock_cache: Dictionary = {}
static func _build_boulder(th: String, variant: int) -> ArrayMesh:
	var key := "%s|%d" % [th, variant]
	if _rock_cache.has(key):
		return _rock_cache[key] as ArrayMesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Grounded dark weathered rock (never chalky white pebbles!)
	var c_rock := Color(0.36, 0.30, 0.23)
	if th == "snow": c_rock = Color(0.28, 0.31, 0.37)
	elif th == "green": c_rock = Color(0.30, 0.30, 0.26)
	if variant == 0:
		_add_cluster(st, Vector3(0, 1.8, 0), 6.8, 3.6, 5.6, c_rock, 501)
		_add_cluster(st, Vector3(4.8, 0.9, 2.2), 3.8, 2.1, 3.3, c_rock * 0.86, 502)
		_add_cluster(st, Vector3(-3.8, 0.7, -2.0), 3.2, 1.8, 2.8, c_rock * 0.80, 503)
	else:
		_add_cluster(st, Vector3(0, 1.2, 0), 4.6, 2.2, 3.9, c_rock * 0.92, 505)
		_add_cluster(st, Vector3(2.8, 0.6, -1.6), 2.4, 1.3, 2.2, c_rock * 0.82, 506)
	var mesh := st.commit()
	mesh.surface_set_material(0, _prop_pbr_mat(0.90, 0.02, "res://tex/rock_nrm.png", 0.72, 6.0))
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

static var _barrier_mesh: ArrayMesh = null
static func _build_barrier() -> ArrayMesh:
	if _barrier_mesh != null: return _barrier_mesh
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var c_base := Color(0.56, 0.55, 0.51)
	var c_top := Color(0.64, 0.62, 0.58)
	var c_stripe := Color(0.76, 0.58, 0.18)
	# Weathered concrete military Jersey barrier (3-step profile + warning hazard band)
	_add_box(st, Vector3(0, 1.2, 0), Vector3(13.0, 2.4, 4.2), c_base * 0.86)
	_add_box(st, Vector3(0, 3.3, 0), Vector3(12.6, 2.2, 2.8), c_base)
	_add_box(st, Vector3(0, 5.0, 0), Vector3(12.2, 1.4, 1.7), c_top)
	_add_box(st, Vector3(0, 5.8, 0), Vector3(4.2, 0.3, 1.8), c_stripe)
	var m := st.commit()
	m.surface_set_material(0, _prop_pbr_mat(0.84, 0.04, "res://tex/rock_nrm.png", 0.78, 6.0))
	_barrier_mesh = m
	return m

static var _pole_mesh: ArrayMesh = null
static func _build_pole() -> ArrayMesh:
	if _pole_mesh != null: return _pole_mesh
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var c_wood := Color(0.34, 0.29, 0.24)
	var c_steel := Color(0.46, 0.48, 0.50)
	_add_taper(st, Vector3(0, 0, 0), Vector3(0, 28.0, 0), 1.05, 0.68, 6, c_wood * 0.82, c_wood)
	_add_box(st, Vector3(0, 25.5, 0), Vector3(8.5, 0.9, 0.9), c_steel)
	_add_box(st, Vector3(0, 23.0, 0), Vector3(6.8, 0.75, 0.8), c_steel * 0.92)
	for ix in [-3.6, 0.0, 3.6]:
		_add_box(st, Vector3(ix, 26.2, 0), Vector3(0.6, 0.9, 0.6), Color(0.75, 0.78, 0.80))
	var m := st.commit()
	m.surface_set_material(0, _prop_pbr_mat(0.76, 0.16, "res://tex/armor_nrm.png", 0.60, 28.0))
	_pole_mesh = m
	return m

## Scattered desert/mountain boulders, dense dry scrub tufts & roadside military barriers/utility poles
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
	var is_mob := UI_KIT.is_mobile()
	var rng := RandomNumberGenerator.new(); rng.seed = 73
	var rocks0: Array[Transform3D] = []
	var rocks1: Array[Transform3D] = []
	var scrubs: Array[Transform3D] = []
	var barriers: Array[Transform3D] = []
	var poles: Array[Transform3D] = []
	var max_rocks := 260 if is_mob else 460
	var max_scrubs := 360 if is_mob else 720
	for _attempt in 1800:
		if rocks0.size() + rocks1.size() >= max_rocks: break
		var x := rng.randf_range(CELL * 2.0, float(GW - 2) * CELL)
		var z := rng.randf_range(CELL * 2.0, float(GH - 2) * CELL)
		var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
		var gc := int(grid[gz * GW + gx])
		if gc == 1 or gc == 2: continue
		if rw > 0 and rh > 0:
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: continue
		var h0 := height_at(map, x, z)
		var slope_est := absf(height_at(map, x + 20.0, z) - h0) + absf(height_at(map, x, z + 20.0) - h0)
		if gc != 3 and slope_est < 2.0 and rng.randf() > 0.16:
			continue
		var s := rng.randf_range(0.70, 1.75) if gc == 3 or slope_est > 4.0 else rng.randf_range(0.48, 1.05)
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s * rng.randf_range(0.72, 1.18), s))
		var xf := Transform3D(b, Vector3(x, h0 - 0.9, z))
		if rng.randi() % 2 == 0: rocks0.append(xf)
		else: rocks1.append(xf)
	for _attempt in 900:
		if scrubs.size() >= max_scrubs: break
		var x := rng.randf_range(CELL * 1.5, float(GW - 1.5) * CELL)
		var z := rng.randf_range(CELL * 1.5, float(GH - 1.5) * CELL)
		var gx := clampi(int(x / CELL), 0, GW - 1); var gz := clampi(int(z / CELL), 0, GH - 1)
		var gc := int(grid[gz * GW + gx])
		if gc == 1 or gc == 2 or gc == 3: continue
		if rw > 0 and rh > 0:
			var rx := clampi(int(x / rC), 0, rw - 1); var rz := clampi(int(z / rC), 0, rh - 1)
			if int(rd[rz * rw + rx]) != 0: continue
		var clump_n := rng.randi_range(2, 4)
		for ci in clump_n:
			if scrubs.size() >= max_scrubs: break
			var sx := x + rng.randf_range(-18.0, 18.0)
			var sz := z + rng.randf_range(-18.0, 18.0)
			var sc := rng.randf_range(1.0, 2.05)
			var bs := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(sc, sc * rng.randf_range(0.8, 1.3), sc))
			scrubs.append(Transform3D(bs, Vector3(sx, height_at(map, sx, sz) - 0.25, sz)))
	# Roadside highway infrastructure (Jersey barriers & utility poles along real road edges!)
	if rw > 6 and rh > 6 and rd.size() >= rw * rh:
		var step_r := 7 if is_mob else 5
		for rz in range(3, rh - 3, step_r):
			for rx in range(3, rw - 3, step_r):
				if int(rd[rz * rw + rx]) != 0: continue
				# Check if adjacent (within 2 cells) to a road cell to find true road shoulder
				var dx_r := 0; var dz_r := 0
				if int(rd[rz * rw + (rx + 2)]) != 0: dx_r = 1
				elif int(rd[rz * rw + (rx - 2)]) != 0: dx_r = -1
				elif int(rd[(rz + 2) * rw + rx]) != 0: dz_r = 1
				elif int(rd[(rz - 2) * rw + rx]) != 0: dz_r = -1
				if dx_r == 0 and dz_r == 0: continue
				var wx := (float(rx) + 0.5) * rC
				var wz := (float(rz) + 0.5) * rC
				var gx := clampi(int(wx / CELL), 0, GW - 1); var gz := clampi(int(wz / CELL), 0, GH - 1)
				if int(grid[gz * GW + gx]) != 0: continue
				var wy := height_at(map, wx, wz)
				# Tangent angle parallel to road
				var ang := (PI * 0.5) if dx_r != 0 else 0.0
				var roll := rng.randf()
				if roll < 0.22 and poles.size() < (70 if is_mob else 140):
					poles.append(Transform3D(Basis(Vector3.UP, ang), Vector3(wx, wy - 0.6, wz)))
				elif roll < 0.44 and barriers.size() < (80 if is_mob else 180):
					barriers.append(Transform3D(Basis(Vector3.UP, ang + rng.randf_range(-0.08, 0.08)), Vector3(wx, wy - 0.3, wz)))
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
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
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
	if not barriers.is_empty():
		var bm := MultiMeshInstance3D.new()
		bm.name = "RoadBarriers"
		var bmm := MultiMesh.new()
		bmm.transform_format = MultiMesh.TRANSFORM_3D
		bmm.mesh = _build_barrier()
		bmm.instance_count = barriers.size()
		for i in barriers.size(): bmm.set_instance_transform(i, barriers[i])
		bm.multimesh = bmm
		bm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		host.add_child(bm)
	if not poles.is_empty():
		var pm2 := MultiMeshInstance3D.new()
		pm2.name = "RoadPoles"
		var pmm := MultiMesh.new()
		pmm.transform_format = MultiMesh.TRANSFORM_3D
		pmm.mesh = _build_pole()
		pmm.instance_count = poles.size()
		for i in poles.size(): pmm.set_instance_transform(i, poles[i])
		pm2.multimesh = pmm
		pm2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		host.add_child(pm2)

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

	var tree_cap := 1400 if UI_KIT.is_mobile() else MAX_TREES
	var raw_trees = map.get("trees", null)
	if raw_trees is Array and (raw_trees as Array).size() > 0:
		var tarr: Array = raw_trees
		var total := tarr.size()
		var count := mini(total, tree_cap)
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

	var tree_ao: Array[Transform3D] = []
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
			var xf: Transform3D = per[t][i]
			mm.set_instance_transform(i, xf)
			var gx_p := xf.origin.x
			var gz_p := xf.origin.z
			var gy_p := height_at(map, gx_p, gz_p)
			var gnorm := normal_at(map, gx_p, gz_p)
			var bx := Vector3(1.0, 0.0, 0.0)
			bx = (bx - gnorm * bx.dot(gnorm)).normalized()
			var bz := bx.cross(gnorm).normalized()
			var ar := 15.0 * xf.basis.x.length()
			tree_ao.append(Transform3D(Basis(bx * ar, gnorm, bz * ar), Vector3(gx_p, gy_p, gz_p) + gnorm * 0.45))
		m.multimesh = mm
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		host.add_child(m)
	# Forest understory contact shadow AO discs so woods sit deeply grounded into the earth
	if not tree_ao.is_empty():
		var pm := PlaneMesh.new(); pm.size = Vector2(2.0, 2.0)
		var amm := MultiMesh.new()
		amm.transform_format = MultiMesh.TRANSFORM_3D
		amm.use_colors = true
		amm.mesh = pm
		amm.instance_count = tree_ao.size()
		var ao_c := Color(1.0, 1.0, 1.0, 0.24 if th == "snow" else 0.34)
		for i in tree_ao.size():
			amm.set_instance_transform(i, tree_ao[i])
			amm.set_instance_color(i, ao_c)
		var ami := MultiMeshInstance3D.new()
		ami.name = "ForestUnderstoryAO"
		ami.multimesh = amm
		var amat := ShaderMaterial.new()
		amat.shader = load("res://shaders/contact_ao.gdshader")
		amat.render_priority = -2
		ami.material_override = amat
		ami.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		host.add_child(ami)
